---
summary: "CI 作业图、范围门控和本地命令等价项"
title: CI pipeline
read_when:
  - 你需要理解为什么某个 CI 作业运行了或没有运行
  - 你正在排查失败的 GitHub Actions 检查
---

CI 会在每次推送到 `main` 以及每个 pull request 时运行。它使用智能范围控制，在仅有无关区域变更时跳过昂贵的作业。手动 `workflow_dispatch` 运行会有意绕过智能范围控制，并为发布候选或更广泛的验证展开完整的常规 CI 图，其中 Android lanes 通过 `include_android` 作为独立手动运行时的可选项启用。仅发布用的插件预发布 lanes 位于单独的 `Plugin Prerelease` 工作流中，并且只会从 `Full Release Validation` 或显式的手动 dispatch 运行。

`check-dependencies` 分片运行 `pnpm deadcode:dependencies`，这是一个生产环境的 Knip 仅依赖扫描，固定为该脚本使用的最新 Knip 版本，并为 `dlx` 安装禁用了 pnpm 的最小发布年龄限制。它还会运行 `pnpm deadcode:unused-files`，将 Knip 的生产环境未使用文件结果与 `scripts/deadcode-unused-files.allowlist.mjs` 进行对比。当 PR 新增了一个未审查的未使用文件，或者清理后留下了过期的 allowlist 条目时，这个守卫会失败，同时保留 Knip 无法静态解析的、刻意存在的动态插件、生成文件、构建文件、运行测试文件，以及 package bridge 接口。

`Full Release Validation` 是用于“发布前把所有东西都跑一遍”的手动总入口工作流。它接受分支、标签或完整 commit SHA，针对该目标派发手动 `CI` 工作流，派发用于仅发布插件/package/static/Docker 证明的 `Plugin Prerelease`，并派发 `OpenClaw Release Checks` 以运行安装冒烟测试、包验收、Docker 发布路径套件、live/E2E、OpenWebUI、QA Lab 一致性、Matrix 和 Telegram lanes。当提供已发布的 package spec 时，它也可以运行发布后的 `NPM Telegram Beta E2E` 工作流。`release_profile=minimum|stable|full` 控制传入发布检查的 live/provider 覆盖范围：`minimum` 保留最快的 OpenAI/core 发布关键 lanes，`stable` 增加稳定 provider/backend 集，`full` 则运行更广泛的建议性 provider/media 矩阵。这个总入口会记录已派发的子运行 id，而最终的 `Verify full validation` 作业会重新检查当前子运行的结论，并为每个子运行附加最慢作业表。如果某个子工作流被重新运行后变为绿色，只需重新运行父级校验器作业即可刷新总入口结果和耗时摘要。

为恢复场景考虑，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。发布候选用 `all`，仅正常完整 CI 子项用 `ci`，所有发布子项用 `release-checks`，或者更窄的发布组：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live`，或总入口上的 `npm-telegram`。这使得一次失败的发布盒子在有针对性的修复后可以保持有限范围重跑。

发布用 live/E2E 子流程保留了广泛的原生 `pnpm test:live` 覆盖，但它将其作为命名分片运行（`native-live-src-agents`、`native-live-src-gateway-core`、按 provider 过滤的 `native-live-src-gateway-profiles` 作业、`native-live-src-gateway-backends`、`native-live-test`、`native-live-extensions-a-k`、`native-live-extensions-l-n`、`native-live-extensions-openai`、`native-live-extensions-o-z-other`、`native-live-extensions-xai`、拆分后的媒体 audio/video 分片，以及按 provider 过滤的音乐分片），通过 `scripts/test-live-shard.mjs` 实现，而不是单个串行作业。这样可以保持相同的文件覆盖范围，同时让慢速 live provider 故障更容易重跑和诊断。聚合的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名称仍然可用于手动一次性重跑。

原生 live 媒体分片运行在
`ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中，由 `Live Media Runner Image` 工作流构建。该镜像预装了 `ffmpeg` 和 `ffprobe`；媒体作业只在 setup 前验证这些二进制文件。请将基于 Docker 的 live 套件保留在普通 Blacksmith runner 上，因为容器作业并不适合启动嵌套的 Docker 测试。

基于 Docker 的 live model/backend 分片使用一个按所选 commit 区分的独立共享 `ghcr.io/openclaw/openclaw-live-test:<sha>` 镜像。live 发布工作流会先构建并推送一次该镜像，然后 Docker live model、gateway、CLI backend、ACP bind 和 Codex harness 分片会在 `OPENCLAW_SKIP_DOCKER_BUILD=1` 下运行。如果这些分片各自重新构建完整的 source Docker 目标，则说明发布运行配置错误，并会在重复镜像构建上浪费总耗时。

`OpenClaw Release Checks` 使用受信任的 workflow ref 将所选 ref 一次性解析为 `release-package-under-test` tarball，然后将该 artifact 传给 live/E2E 发布路径 Docker 工作流和包验收分片。这确保了各发布盒子之间的包字节一致，并避免在多个子作业中重新打包同一个候选。

`Package Acceptance` 是用于在不阻塞发布工作流的情况下验证 package artifact 的侧运行工作流。它从已发布的 npm spec、使用所选 `workflow_ref` harness 构建的受信任 `package_ref`、带 SHA-256 的 HTTPS tarball URL，或来自另一个 GitHub Actions 运行的 tarball artifact 中解析出一个候选，将其上传为 `package-under-test`，然后复用 Docker 发布/E2E 调度器，使用该 tarball 而不是重新打包工作流检出内容。profile 覆盖 smoke、package、product、full 以及自定义 Docker lane 选择。`package` profile 使用离线插件覆盖，因此已发布 package 的验证不会被 live ClawHub 可用性所阻塞。可选的 Telegram lane 会在 `NPM Telegram Beta E2E` 工作流中复用 `package-under-test` artifact，而独立 dispatch 仍然保留已发布 npm spec 的路径。

## 包验收

当问题是“这个可安装的 OpenClaw 包作为一个产品能否工作？”时，请使用 `Package Acceptance`。它不同于普通 CI：普通 CI 验证的是源码树，而包验收则通过用户安装或更新后会经历的同一个 Docker E2E harness 验证单个 tarball。

该工作流有四个作业：

1. `resolve_package` 检出 `workflow_ref`，解析一个 package 候选，写入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，写入 `.artifacts/docker-e2e-package/package-candidate.json`，将两者作为 `package-under-test` artifact 上传，并在 GitHub 步骤摘要中打印来源、workflow ref、package ref、版本、SHA-256 和 profile。
2. `docker_acceptance` 调用 `openclaw-live-and-e2e-checks-reusable.yml`，设置 `ref=workflow_ref` 和 `package_artifact_name=package-under-test`。这个可复用工作流会下载该 artifact，验证 tarball 清单，按需准备 package-digest Docker 镜像，并针对该 package 运行所选 Docker lanes，而不是打包工作流检出内容。当某个 profile 选择了多个目标 `docker_lanes` 时，可复用工作流会先准备 package 和共享镜像一次，然后将这些 lanes 作为并行的目标 Docker 作业展开，并为其分配唯一 artifact。
3. `package_telegram` 可选地调用 `NPM Telegram Beta E2E`。当 `telegram_mode` 不是 `none` 且 Package Acceptance 已解析出一个 `package-under-test` artifact 时，它就会运行；独立的 Telegram dispatch 仍然可以安装已发布的 npm spec。
4. `summary` 会在 package 解析、Docker 验收或可选 Telegram lane 失败时使工作流失败。

候选来源：

- `source=npm`：只接受 `openclaw@beta`、`openclaw@latest`，或精确的 OpenClaw 发布版本，例如 `openclaw@2026.4.27-beta.2`。用于已发布的 beta/stable 验收。
- `source=ref`：打包一个受信任的 `package_ref` 分支、标签或完整 commit SHA。解析器会拉取 OpenClaw 的分支/标签，验证所选 commit 可从仓库分支历史或 release tag 到达，在 detached worktree 中安装依赖，并使用 `scripts/package-openclaw-for-docker.mjs` 进行打包。
- `source=url`：下载一个 HTTPS `.tgz`；`package_sha256` 是必需的。
- `source=artifact`：从 `artifact_run_id` 和 `artifact_name` 下载一个 `.tgz`；`package_sha256` 是可选的，但对于外部共享 artifact 应该提供。

请将 `workflow_ref` 和 `package_ref` 分开。`workflow_ref` 是运行测试的受信任 workflow/harness 代码。`package_ref` 是在 `source=ref` 时被打包的源提交。这样当前测试 harness 就可以验证更旧的受信任源提交，而无需运行旧的 workflow 逻辑。

profile 映射到 Docker 覆盖范围：

- `smoke`：`npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package`：`npm-onboard-channel-agent`、`doctor-switch`、
  `update-channel-switch`、`bundled-channel-deps-compat`、`plugins-offline`、
  `plugin-update`
- `product`：`package` 加上 `mcp-channels`、`cron-mcp-cleanup`、
  `openai-web-search-minimal`、`openwebui`
- `full`：带 OpenWebUI 的完整 Docker 发布路径分块
- `custom`：精确的 `docker_lanes`；当 `suite_profile=custom` 时必需

发布检查会使用 `source=ref`、
`package_ref=<release-ref>`、`workflow_ref=<release workflow ref>`、
`suite_profile=custom`、
`docker_lanes='bundled-channel-deps-compat plugins-offline'`，以及
`telegram_mode=mock-openai` 调用 Package Acceptance。发布路径 Docker
分块覆盖了重叠的 package/update/plugin lanes，而 Package Acceptance 则让 artifact 原生的 bundled-channel 兼容性、离线插件和 Telegram 证明基于同一个已解析的 package tarball。
跨 OS 发布检查仍然覆盖特定于操作系统的 onboarding、安装器和平台行为；package/update 产品验证应从 Package Acceptance 开始。Windows 打包和安装器 fresh lanes 也会验证已安装的 package 能否从一个原始的绝对 Windows 路径导入 browser-control override。OpenAI 跨 OS agent-turn 冒烟测试默认在设置了 `OPENCLAW_CROSS_OS_OPENAI_MODEL` 时使用它，否则使用 `openai/gpt-5.4-mini`，以便安装和 gateway 证明保持快速且可预测。专门的 live provider/model lanes 仍然覆盖更广泛的模型路由，包括更慢的前沿默认值。

Package Acceptance 针对已经发布的 packages 设有有界的旧版兼容窗口。通过 `2026.4.25` 的 packages，包括 `2026.4.25-beta.*`，可以对 `dist/postinstall-inventory.json` 中指向 tarball 中未包含文件的已知私有 QA 条目使用兼容路径；当 package 未暴露该标志时，`doctor-switch` 可以跳过 `gateway install --wrapper` 持久化子案例；`update-channel-switch` 可以从 tarball 派生的 fake git fixture 中清理缺失的 `pnpm.patchedDependencies`，并且可以记录缺失的持久化 `update.channel`；plugin 冒烟测试可以读取旧版 install-record 位置，或者接受缺失的 marketplace install-record 持久化；而 `plugin-update` 可以在仍然要求 install record 和 no-reinstall 行为保持不变的前提下，允许配置元数据迁移。已发布的 `2026.4.26` package 也可以对已经发布的本地构建元数据 stamp 文件发出警告。更新的 packages 必须满足现代契约；相同条件在这些版本中会导致失败，而不是警告或跳过。

示例：

```bash
# 使用产品级覆盖验证当前 beta package。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai

# 使用当前 harness 打包并验证一个 release 分支。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=ref \
  -f package_ref=release/YYYY.M.D \
  -f suite_profile=package \
  -f telegram_mode=mock-openai

# 验证一个 tarball URL。对于 source=url，SHA-256 是必需的。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=url \
  -f package_url=https://example.com/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# 复用另一个 Actions 运行上传的 tarball。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=package-under-test \
  -f suite_profile=custom \
  -f docker_lanes='install-e2e plugin-update'
```

在排查失败的 package acceptance 运行时，先查看 `resolve_package` 摘要，确认 package 来源、版本和 SHA-256。然后检查 `docker_acceptance` 子运行及其 Docker artifacts：
`.artifacts/docker-tests/**/summary.json`、`failures.json`、lane 日志、阶段耗时和重跑命令。优先重跑失败的 package profile 或精确的 Docker lanes，而不是重跑完整的发布验证。

QA Lab 在主智能范围控制工作流之外有专门的 CI lanes。`Parity gate` 工作流会在匹配的 PR 变更和手动 dispatch 时运行；它构建私有 QA runtime，并比较 mock GPT-5.5 和 Opus 4.6 的 agentic packs。`QA-Lab - All Lanes` 工作流会在 `main` 上的 nightly 以及手动 dispatch 时运行；它将 mock parity gate、live Matrix lane，以及 live Telegram 和 Discord lanes 作为并行作业展开。live 作业使用 `qa-live-shared` 环境，Telegram/Discord 使用 Convex leases。发布检查会使用确定性的 mock provider 和 mock-qualified models（`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`）运行 Matrix 和 Telegram live transport lanes，这样 channel 合约就能与 live model 延迟和常规 provider-plugin 启动隔离开来。live transport gateway 还会禁用 memory search，因为 QA parity 会单独覆盖 memory 行为；provider 连接性则由单独的 live model、native provider 和 Docker provider 套件覆盖。Matrix 在计划任务和发布门控中使用 `--profile fast`，仅当检出的 CLI 支持时才添加 `--fail-fast`。CLI 默认值和手动工作流输入仍然是 `all`；手动 `matrix_profile=all` dispatch 会始终将完整 Matrix 覆盖分片为 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。`OpenClaw Release Checks` 还会在发布批准前运行发布关键的 QA Lab lanes；其 QA parity gate 会将候选包和基线包作为并行 lane 作业运行，然后将两份 artifact 下载到一个小型报告作业中进行最终 parity 比较。
除非变更实际触及 QA runtime、模型包 parity，或 parity 工作流拥有的某个表面，否则不要把 PR 的落地路径放到 `Parity gate` 后面。对于普通的 channel、配置、文档或单元测试修复，请将其视为可选信号，并改为依赖范围控制过的 CI/检查证据。

`Duplicate PRs After Merge` 工作流是一个供维护者手动执行的后合并重复清理工作流。它默认是 dry-run，只有在 `apply=true` 时才会关闭显式列出的 PR。在修改 GitHub 之前，它会验证已落地的 PR 已经合并，并且每个重复项要么共享一个引用 issue，要么有重叠的变更 hunk。

The `CodeQL` workflow is intentionally a narrow first-pass security scanner,
not the full repository sweep. Daily and manual runs scan Actions workflow code
plus the highest-risk JavaScript/TypeScript auth, secrets, sandbox, cron, and
gateway surfaces with high-precision security queries under the
`/codeql-critical-security/core-auth-secrets` category. The
channel-runtime-boundary job separately scans core channel implementation
contracts plus the channel plugin runtime, gateway, Plugin SDK, secrets, and
audit touchpoints under the `/codeql-critical-security/channel-runtime-boundary`
category so channel security signal can scale without broadening the baseline
auth/secrets category. The network-ssrf-boundary job scans core SSRF, IP parsing,
network guard, web-fetch, and Plugin SDK SSRF policy surfaces under the
`/codeql-critical-security/network-ssrf-boundary` category so network trust
boundary signal stays separate from the auth/secrets security baseline.
The mcp-process-tool-boundary job scans MCP servers, process execution helpers,
outbound delivery, and agent tool-execution gates under the
`/codeql-critical-security/mcp-process-tool-boundary` category so command and
tool boundary signal stays separate from both the auth/secrets baseline and
the non-security MCP/process quality shard. The plugin-trust-boundary job scans
plugin install, loader, manifest, registry, runtime-dependency staging,
source-loading, public-surface, and Plugin SDK package contract trust surfaces
under the `/codeql-critical-security/plugin-trust-boundary` category so plugin
supply-chain and runtime-loading signal stays separate from both bundled plugin
implementation code and the non-security plugin quality shard.

`CodeQL Android Critical Security` 工作流是定时的 Android 安全分片。它在 workflow sanity 接受的最小 Blacksmith Linux runner label 上手动构建用于 CodeQL 的 Android 应用，并将结果上传到 `/codeql-critical-security/android` 类别下。

`CodeQL macOS Critical Security` 工作流是每周/手动的 macOS 安全分片。它在 Blacksmith macOS 上手动构建用于 CodeQL 的 macOS 应用，将依赖构建结果从上传的 SARIF 中过滤掉，并将结果上传到 `/codeql-critical-security/macos` 类别下。请将其保留在每日默认工作流之外，因为即使在干净构建时，macOS 构建本身也会主导运行时间。

The `CodeQL Critical Quality` workflow is the matching non-security shard. It
runs only error-severity, non-security JavaScript/TypeScript quality queries
over narrow high-value surfaces on the smaller Blacksmith Linux runner. Its
manual dispatch accepts
`profile=all|plugin-sdk-package-contract|plugin-sdk-reply-runtime|session-diagnostics-boundary`;
the narrow profiles are teaching/iteration hooks for running one quality shard
in isolation without dispatching the rest of the workflow.
Its
core-auth-secrets job scans auth, secrets, sandbox, cron, and gateway security
boundary code under the separate `/codeql-critical-quality/core-auth-secrets`
category. The config-boundary
job scans config schema, migration, normalization, and IO contracts under the
separate `/codeql-critical-quality/config-boundary` category. The
gateway-runtime-boundary job scans gateway protocol schemas and server method
contracts under the separate
`/codeql-critical-quality/gateway-runtime-boundary` category. The
channel-runtime-boundary job scans core channel implementation contracts under
the separate `/codeql-critical-quality/channel-runtime-boundary` category. The
agent-runtime-boundary job scans command execution, model/provider dispatch,
auto-reply dispatch and queues, and ACP control-plane runtime contracts under
the separate `/codeql-critical-quality/agent-runtime-boundary` category. The
mcp-process-runtime-boundary job scans MCP servers and tool bridges, process
supervision helpers, and outbound delivery contracts under the separate
`/codeql-critical-quality/mcp-process-runtime-boundary` category. The
memory-runtime-boundary job scans the memory host SDK, memory runtime facades,
memory Plugin SDK aliases, memory runtime activation glue, and memory doctor
commands under the separate `/codeql-critical-quality/memory-runtime-boundary`
category. The session-diagnostics-boundary job scans reply queue internals,
session delivery queues, outbound session binding/delivery helpers, diagnostic
event/log bundle surfaces, and session doctor CLI contracts under the separate
`/codeql-critical-quality/session-diagnostics-boundary` category. The
plugin-sdk-reply-runtime job scans Plugin SDK inbound reply dispatch, reply
payload/chunking/runtime helpers, channel reply options, delivery queues, and
session/thread binding helpers under the separate
`/codeql-critical-quality/plugin-sdk-reply-runtime` category. The
ui-control-plane job scans Control UI bootstrap, local persistence, gateway
control flows, and task control-plane runtime contracts under the separate
`/codeql-critical-quality/ui-control-plane` category. The
web-media-runtime-boundary job scans core web fetch/search, media IO, media
understanding, image-generation, and media-generation runtime contracts under
the separate `/codeql-critical-quality/web-media-runtime-boundary` category. The
plugin-boundary job scans loader, registry, public-surface, and Plugin SDK
entrypoint contracts under a separate `/codeql-critical-quality/plugin-boundary`
category. The plugin-sdk-package-contract job scans the published package-side
Plugin SDK source and plugin package contract helpers under the separate
`/codeql-critical-quality/plugin-sdk-package-contract` category. Keep the
workflow separate from security so quality findings can be
scheduled, measured, disabled, or expanded without obscuring security signal.
Swift, Python, and bundled-plugin CodeQL expansion should be added back as
scoped or sharded follow-up work only after the narrow profiles have stable
runtime and signal.

`Docs Agent` 工作流是一个事件驱动的 Codex 维护通道，用于保持现有文档与最近落地的变更一致。它没有纯定时计划：在 `main` 上一次成功的非 bot push CI 运行可以触发它，手动 dispatch 也可以直接运行它。workflow-run 调用会在 `main` 已经前进或在过去一小时内已创建另一个非跳过的 Docs Agent 运行时跳过。当它运行时，它会审查从上一次未跳过的 Docs Agent 源 SHA 到当前 `main` 的提交范围，因此一次每小时运行就可以覆盖自上次文档扫描以来累积的所有 main 变更。

`Test Performance Agent` 工作流是一个面向慢测试的事件驱动 Codex 维护通道。它没有纯定时计划：在 `main` 上一次成功的非 bot push CI 运行可以触发它，但如果当天另一个 workflow-run 调用已经运行过或正在运行，则会跳过。手动 dispatch 会绕过这个每日活动门控。该通道会构建一个 full-suite 分组 Vitest 性能报告，只允许 Codex 做小的、保持覆盖的测试性能修复，而不是大范围重构，然后重新运行 full-suite 报告，并拒绝那些降低通过基线测试数量的更改。如果基线中存在失败测试，Codex 只能修复明显失败项，并且代理后的 full-suite 报告在任何内容提交前必须通过。当 `main` 在 bot push 落地前发生前进时，该通道会 rebase 已验证的补丁，重新运行 `pnpm check:changed`，并重试推送；冲突的过期补丁会被跳过。它使用 GitHub 托管的 Ubuntu，这样 Codex action 就能保持与 docs agent 相同的 drop-sudo 安全姿态。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 作业概览

| 作业                             | 目的                                                                                         | 运行时机                           |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------- |
| `preflight`                      | 检测仅文档变更、变更作用域、变更扩展，并构建 CI 清单                                            | 始终在非草稿推送和 PR 上运行        |
| `security-scm-fast`              | 通过 `zizmor` 检测私钥和工作流审计                                                            | 始终在非草稿推送和 PR 上运行        |
| `security-dependency-audit`      | 对照 npm 安全公告进行无依赖生产 lockfile 审计                                                   | 始终在非草稿推送和 PR 上运行        |
| `security-fast`                  | 作为快速安全作业的必需聚合任务                                                                  | 始终在非草稿推送和 PR 上运行        |
| `build-artifacts`                | 构建 `dist/`、Control UI、构建产物检查，以及可复用的下游产物                                    | 与 Node 相关的变更                  |
| `checks-fast-core`               | 快速的 Linux 正确性通道，例如 bundled/plugin-contract/protocol 检查                            | 与 Node 相关的变更                  |
| `checks-fast-contracts-channels` | 分片的 channel contract 检查，带稳定的聚合检查结果                                              | 与 Node 相关的变更                  |
| `checks-node-core-test`          | 核心 Node 测试分片，不包括 channel、bundled、contract 和 extension 通道                        | 与 Node 相关的变更                  |
| `check`                          | 分片后的主本地门禁等价项：生产类型检查、lint、guards、测试类型检查和严格 smoke                 | 与 Node 相关的变更                  |
| `check-additional`               | 架构、边界、扩展面守卫、包边界和 gateway-watch 分片                                             | 与 Node 相关的变更                  |
| `build-smoke`                    | 构建后的 CLI smoke 测试和启动内存 smoke                                                         | 与 Node 相关的变更                  |
| `checks`                         | 构建产物 channel 测试的验证器                                                                   | 与 Node 相关的变更                  |
| `checks-node-compat-node22`      | Node 22 兼容性构建和 smoke 通道                                                                  | 发布的手动 CI 触发                  |
| `check-docs`                     | 文档格式、lint 和断链检查                                                                       | 文档有变更                          |
| `skills-python`                  | 用于 Python 支撑技能的 Ruff + pytest                                                            | 与 Python 技能相关的变更            |
| `checks-windows`                 | Windows 特定的进程/路径测试，以及共享运行时 import specifier 回归                               | 与 Windows 相关的变更               |
| `macos-node`                     | 使用共享构建产物的 macOS TypeScript 测试通道                                                     | 与 macOS 相关的变更                 |
| `macos-swift`                    | macOS 应用的 Swift lint、构建和测试                                                              | 与 macOS 相关的变更                 |
| `android`                        | 两个 flavor 的 Android 单元测试加上一个 debug APK 构建                                          | 与 Android 相关的变更               |
| `test-performance-agent`         | 在可信活动之后每日进行 Codex 慢测试优化                                                           | 主 CI 成功或手动触发                |

手动 CI 触发会运行与正常 CI 相同的作业图，但会强制开启所有非 Android 作用域的通道：Linux Node 分片、bundled-plugin 分片、channel contracts、Node 22 兼容性、`check`、`check-additional`、构建 smoke、文档检查、Python 技能、Windows、macOS，以及 Control UI i18n。独立的手动 CI 触发只在 `include_android=true` 时运行 Android；完整的 release 总入口通过传递 `include_android=true` 来启用 Android。插件预发布静态检查、仅发布用的 `agentic-plugins` 分片、完整扩展批量扫描，以及插件预发布 Docker 通道都被排除在 CI 之外。Docker 预发布套件仅在 `Full Release Validation` 触发单独的 `Plugin Prerelease` 工作流并启用 release-validation gate 时运行。手动运行使用独特的并发组，因此同一 ref 上的另一次 push 或 PR 运行不会取消 release-candidate 的完整套件。可选的 `target_ref` 输入允许受信调用方针对某个分支、标签或完整 commit SHA 运行该作业图，同时使用所选触发 ref 的工作流文件。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 失败优先顺序

作业按顺序排列，以便便宜的检查先于昂贵的检查失败：

1. `preflight` 决定哪些通道根本存在。`docs-scope` 和 `changed-scope` 逻辑是这个作业内部的步骤，而不是独立作业。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 会快速失败，而无需等待更重的产物和平台矩阵作业。
3. `build-artifacts` 与快速 Linux 通道并行运行，因此下游消费者在共享构建准备好后即可开始。
4. 更重的平台和运行时通道随后展开：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-core-test`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

Scope 逻辑位于 `scripts/ci-changed-scope.mjs`，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。手动触发会跳过 changed-scope 检测，并让 preflight 清单表现得像是所有受作用域限制的区域都发生了变更。CI 工作流编辑会验证 Node CI 图和工作流 lint，但不会单独强制触发 Windows、Android 或 macOS 原生构建；这些平台通道仍然仅对平台源代码变更进行作用域限定。仅限 CI 路由的编辑、某些廉价的核心测试夹具编辑，以及狭窄的插件契约 helper/test-routing 编辑，会使用一个快速的仅 Node 清单路径：preflight、security，以及一个单独的 `checks-fast-core` 任务。该路径在变更文件仅限于快速任务直接覆盖的路由或 helper 表面时，会避免构建产物、Node 22 兼容性、channel contracts、完整核心分片、bundled-plugin 分片以及额外的守卫矩阵。Windows Node 检查的作用域限定为 Windows 特定的进程/路径包装器、npm/pnpm/UI runner helpers、包管理器配置，以及执行该通道的 CI 工作流表面；无关的源代码、插件、install-smoke 和仅测试变更会留在 Linux Node 通道上，因此不会为了已经由正常测试分片覆盖的内容而占用一个 16-vCPU 的 Windows worker。单独的 `install-smoke` 工作流通过自己的 `preflight` 作业重用同一份作用域脚本。它将 smoke 覆盖拆分为 `run_fast_install_smoke` 和 `run_full_install_smoke`。Pull request 会对 Docker/package 表面、bundled plugin package/manifest 变更，以及 Docker smoke 作业会覆盖的核心插件/channel/gateway/Plugin SDK 表面运行快速路径。仅源代码级的 bundled plugin 变更、仅测试编辑和仅文档编辑不会占用 Docker worker。快速路径会一次构建 root Dockerfile 镜像，检查 CLI，运行 agents delete shared-workspace CLI smoke，运行容器 gateway-network e2e，验证 bundled extension build arg，并在 240 秒的聚合命令超时时间内运行受限的 bundled-plugin Docker profile，同时每个场景的 Docker 运行都单独限时。完整路径会保留 QR package install 和 installer Docker/update 覆盖，供夜间计划运行、手动触发、workflow-call release 检查，以及真正触及 installer/package/Docker 表面的 pull request 使用。在完整模式下，install-smoke 会准备或复用一个目标 SHA 的 GHCR root Dockerfile smoke 镜像，然后将 QR package install、root Dockerfile/gateway smoke、installer/update smoke，以及快速 bundled-plugin Docker E2E 作为独立作业运行，以便 installer 工作不必等待 root 镜像 smoke。`main` 推送（包括 merge commit）不会强制走完整路径；当 changed-scope 逻辑在 push 上要求完整覆盖时，工作流会保留快速 Docker smoke，并将完整 install smoke 留给夜间或 release validation。缓慢的 Bun 全局安装 image-provider smoke 由 `run_bun_global_install_smoke` 单独门控；它会在夜间计划和 release checks 工作流中运行，手动 `install-smoke` 触发可以选择启用它，但 pull request 和 `main` 推送不会运行它。QR 和 installer Docker 测试保留它们自己的、以安装为中心的 Dockerfile。本地 `test:docker:all` 会预构建一个共享的 live-test 镜像，将 OpenClaw 打包为一个 npm tarball 一次，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：一个用于 installer/update/plugin-dependency 通道的纯 Node/Git runner，和一个将同一个 tarball 安装到 `/app` 中、用于正常功能通道的功能镜像。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`，规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`，runner 只执行所选计划。调度器通过 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 为每个通道选择镜像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行这些通道；通过 `OPENCLAW_DOCKER_ALL_PARALLELISM` 调整默认的 main-pool 槽位数 10，并通过 `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` 调整 provider-sensitive tail-pool 槽位数 10。重型通道上限默认分别为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`，因此 npm install 和多服务通道不会过度占用 Docker，而较轻的通道仍会填满可用槽位。比有效上限更重的单个通道仍可能从空池启动，然后独占运行直到释放容量。默认情况下，通道启动会每隔 2 秒错开，以避免本地 Docker 守护进程创建风暴；可通过 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=0` 或其他毫秒值覆盖。本地聚合会对 Docker 进行 preflight，移除过期的 OpenClaw E2E 容器，输出活动通道状态，持久化通道耗时以便最长优先排序，并支持 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 进行调度器检查。默认情况下，它会在第一个失败后停止调度新的池化通道，而每个通道都有一个 120 分钟的兜底超时，可通过 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的 live/tail 通道使用更严格的每通道上限。`OPENCLAW_DOCKER_ALL_LANES=<lane[,lane]>` 会运行精确的调度器通道，包括仅发布使用的通道，如 `install-e2e`，以及拆分后的 bundled update 通道，如 `bundled-channel-update-acpx`，同时跳过清理 smoke，以便代理可以复现某个失败通道。可复用的 live/E2E 工作流会询问 `scripts/test-docker-all.mjs --plan-json` 需要哪个 package、镜像类型、live 镜像、通道和凭据覆盖，然后由 `scripts/docker-e2e.mjs` 将该计划转换为 GitHub 输出和摘要。它要么通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，要么下载当前运行的 package artifact，或者从 `package_artifact_run_id` 下载一个 package artifact；验证 tarball 清单；当计划需要 package-installed 通道时，通过 Blacksmith 的 Docker layer cache 构建并推送带 package digest 标签的 bare/functional GHCR Docker E2E 镜像；并在已有 `docker_e2e_bare_image`/`docker_e2e_functional_image` 输入或现有 package-digest 镜像可用时复用它们，而不是重新构建。Docker 镜像拉取会以有界的 180 秒单次尝试超时进行重试，因此卡住的 registry/cache 流能够快速重试，而不会消耗掉 CI 关键路径的大部分时间。`Package Acceptance` 工作流是高层的 package 门禁：它会从 npm、受信任的 `package_ref`、带 SHA-256 的 HTTPS tarball，或之前的工作流 artifact 中解析候选包，然后将那个单独的 `package-under-test` artifact 传入可复用的 Docker E2E 工作流。它将 `workflow_ref` 与 `package_ref` 分开，以便当前的接受逻辑可以验证较旧的受信提交，而无需检出旧的工作流代码。Release checks 会针对目标 ref 运行一个自定义的 Package Acceptance delta：bundled-channel compat、离线插件夹具，以及针对已解析 tarball 的 Telegram package QA。release-path Docker 套件会运行更小的分块作业，并使用 `OPENCLAW_SKIP_DOCKER_BUILD=1`，这样每个分块只拉取它需要的镜像类型，并通过同一个加权调度器执行多个通道（`OPENCLAW_DOCKER_ALL_PROFILE=release-path`，`OPENCLAW_DOCKER_ALL_CHUNK=core|package-update-openai|package-update-anthropic|package-update-core|plugins-runtime-plugins|plugins-runtime-services|plugins-runtime-install-a|plugins-runtime-install-b|plugins-runtime-install-c|plugins-runtime-install-d|plugins-runtime-install-e|plugins-runtime-install-f|plugins-runtime-install-g|plugins-runtime-install-h|bundled-channels`）。当完整 release-path 覆盖需要 OpenWebUI 时，它会被合并到 `plugins-runtime-services` 中；只有 OpenWebUI 专用触发才保留单独的 `openwebui` 分块。旧的聚合分块名称 `package-update`、`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍然可用于手动重跑，但 release 工作流使用拆分后的分块，这样 installer E2E 和 bundled plugin 安装/卸载扫描就不会主导关键路径。`install-e2e` 通道别名仍然是两个 provider installer 通道的聚合手动重跑别名。`bundled-channels` 分块运行拆分后的 `bundled-channel-*` 和 `bundled-channel-update-*` 通道，而不是串行的一体化 `bundled-channel-deps` 通道。每个分块都会上传 `.artifacts/docker-tests/`，其中包含通道日志、耗时、`summary.json`、`failures.json`、阶段耗时、调度器计划 JSON、慢通道表，以及每个通道的重跑命令。工作流的 `docker_lanes` 输入会针对准备好的镜像运行所选通道，而不是分块作业，这将失败通道的调试限制在一个有针对性的 Docker 作业中，并为该次运行准备、下载或复用 package artifact；如果所选通道是 live Docker 通道，目标作业会为那次重跑在本地构建 live-test 镜像。按通道生成的 GitHub 重跑命令会在这些值存在时包含 `package_artifact_run_id`、`package_artifact_name` 和已准备的镜像输入，因此失败通道可以复用失败运行中的确切 package 和镜像。使用 `pnpm test:docker:rerun <run-id>` 可以从 GitHub 运行中下载 Docker artifact，并打印合并的/按通道的有针对性重跑命令；使用 `pnpm test:docker:timings <summary.json>` 可以查看慢通道和阶段关键路径摘要。计划中的 live/E2E 工作流会每天运行完整的 release-path Docker 套件。bundled update 矩阵按更新目标拆分，因此重复的 npm update 和 doctor repair 过程可以与其他 bundled 检查一起分片执行。

当前的 release Docker 分块为 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services`、`plugins-runtime-install-a`、`plugins-runtime-install-b`、`plugins-runtime-install-c`、`plugins-runtime-install-d`、`plugins-runtime-install-e`、`plugins-runtime-install-f`、`plugins-runtime-install-g`、`plugins-runtime-install-h`、`bundled-channels-core`、`bundled-channels-update-a`、`bundled-channels-update-discord`、`bundled-channels-update-b` 和 `bundled-channels-contracts`。聚合的 `bundled-channels` 分块仍可用于手动一次性重跑，而 `plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍然是聚合的插件/运行时别名，但 release 工作流使用拆分后的分块，这样 channel smoke、更新目标、插件运行时检查和 bundled plugin 安装/卸载扫描就可以并行运行。目标化的 `docker_lanes` 触发也会在一个共享的包/镜像准备步骤之后，将多个选定通道拆分到并行作业中，并且 bundled-channel 更新通道会针对临时 npm 网络失败重试一次。

本地 changed-lane 逻辑位于 `scripts/changed-lanes.mjs`，并由 `scripts/check-changed.mjs` 执行。该本地检查门禁对架构边界的要求比宽泛的 CI 平台作用域更严格：核心生产变更会运行 core prod 和 core test typecheck 以及 core lint/guards，核心仅测试变更只运行 core test typecheck 和 core lint，扩展生产变更会运行 extension prod 和 extension test typecheck 以及 extension lint，而扩展仅测试变更会运行 extension test typecheck 和 extension lint。公共 Plugin SDK 或 plugin-contract 变更会扩展到 extension typecheck，因为扩展依赖这些核心契约，但 Vitest 扩展扫描是显式的测试工作。仅 release metadata 的版本提升会运行有针对性的 version/config/root-dependency 检查。未知的 root/config 变更会安全地失败到所有检查通道。  
本地 changed-test 路由位于 `scripts/test-projects.test-support.mjs`，其设计上比 `check:changed` 更便宜：直接的测试编辑会运行它们自己，源代码编辑优先使用显式映射，然后是同级测试和 import-graph 依赖项。共享的 group-room delivery 配置就是这些显式映射之一：对 group visible-reply 配置、源 reply delivery 模式或 message-tool 系统提示的更改，会通过 core reply 测试以及 Discord 和 Slack delivery 回归；这样共享默认值的变更会在第一个 PR push 之前失败。只有当变更在整个 harness 范围内大到廉价的映射集合不再是可靠代理时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

对于 Testbox 验证，请从仓库根目录运行，并优先使用一个新鲜、已预热的 box 来进行广泛验证。在把慢门禁花费在一个被重复使用、已过期，或者刚报告过异常大的同步的 box 上之前，先在 box 内运行 `pnpm testbox:sanity`。当必要的根文件（例如 `pnpm-lock.yaml`）消失，或者 `git status --short` 显示至少 200 个被跟踪的删除时，sanity 检查会快速失败。那通常意味着远程同步状态并不是 PR 的可信副本。停止该 box，改用一个新预热的 box，而不是去调试产品测试失败。对于有意的大量删除 PR，在该 sanity 运行中设置 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。`pnpm testbox:run` 还会终止一个在同步阶段停留超过五分钟且没有 post-sync 输出的本地 Blacksmith CLI 调用。设置 `OPENCLAW_TESTBOX_SYNC_TIMEOUT_MS=0` 可禁用该保护，或者在本地 diff 异常大时使用更大的毫秒值。

手动 CI 触发会将 `checks-node-compat-node22` 作为广泛兼容性覆盖来运行。Android 在独立手动 CI 中通过 `include_android=true` 按需启用，并且在 `Full Release Validation` 中始终启用。`Plugin Prerelease` 是更昂贵的产品/包覆盖，因此它是由 `Full Release Validation` 或显式操作者触发的单独工作流。正常的 pull request、`main` 推送和独立手动 CI 触发都会让该套件保持关闭。

最慢的 Node 测试家族被拆分或平衡过，因此每个作业都保持较小而不会过度预留 runner：channel contracts 以三个加权分片运行，小型核心单元通道成对安排，auto-reply 作为四个平衡的 worker 运行，其中 reply 子树拆分为 agent-runner、dispatch 和 commands/state-routing 分片，而 agentic gateway/plugin 配置则分散到现有仅源代码的 agentic Node 作业中，而不是等待构建产物。广泛的浏览器、QA、媒体和杂项插件测试使用它们各自专用的 Vitest 配置，而不是共享的插件总括配置。`Plugin Prerelease` 将 bundled plugin 测试平衡到八个扩展 worker 中；这些扩展分片作业每次最多运行两个插件配置组，每组一个 Vitest worker，并使用更大的 Node heap，因此导入密集型插件批次不会创建额外的 CI 作业。广泛的 agents 通道使用共享的 Vitest 文件并行调度器，因为它主要受导入/调度驱动，而不是由单个慢测试文件主导。`runtime-config` 与 infra core-runtime 分片一起运行，以避免共享运行时分片占据尾部。包含模式分片会使用 CI 分片名记录耗时条目，因此 `.artifacts/vitest-shard-timings.json` 可以区分整个配置与经过过滤的分片。`check-additional` 将 package-boundary compile/canary 工作放在一起，并将 runtime topology architecture 与 gateway watch 覆盖分开；边界守卫分片在一个作业内并发运行其小型独立守卫。gateway watch、channel 测试以及 core support-boundary 分片在 `build-artifacts` 内并发运行，此时 `dist/` 和 `dist-runtime/` 已经构建完成；它们保留旧的检查名称作为轻量级验证作业，同时避免两个额外的 Blacksmith worker 和第二个产物消费者队列。  
Android CI 会同时运行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然后构建 Play debug APK。third-party flavor 没有单独的 source set 或 manifest；其单元测试通道仍会使用 SMS/call-log BuildConfig 标志编译该 flavor，同时避免在每次与 Android 相关的 push 上重复进行 debug APK 打包作业。  
当同一 PR 或 `main` ref 上有更新的 push 到来时，GitHub 可能会将被取代的作业标记为 `cancelled`。除非同一 ref 的最新运行也失败，否则应将其视为 CI 噪音。聚合分片检查使用 `!cancelled() && always()`，因此它们仍会报告正常的分片失败，但在整个工作流已经被取代后不会排队。  
自动 CI 并发键使用版本化的（`CI-v7-*`），这样 GitHub 端旧队列组中的僵尸任务就无法无限期阻塞新的 main 运行。手动完整套件运行使用 `CI-manual-v1-*`，并且不会取消正在进行的运行。

## 运行器

| 运行器                           | 作业                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`，快速安全作业和聚合（`security-scm-fast`、`security-dependency-audit`、`security-fast`），快速协议/契约/捆绑检查，分片通道契约检查，除 lint 外的 `check` 分片，`check-additional` 分片和聚合，Node 测试聚合验证器，文档检查，Python 技能，workflow-sanity，labeler，auto-response；install-smoke 预检也使用 GitHub 托管的 Ubuntu，因此 Blacksmith 矩阵可以更早排队 |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`，较低权重的扩展分片，`checks-fast-core`，`checks-node-compat-node22`，`check-prod-types`，以及 `check-test-types`                                                                                                                                                                                                                                                                                                                   |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`，build-smoke，Linux Node 测试分片，捆绑插件测试分片，`android`                                                                                                                                                                                                                                                                                                                                                                           |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint`，它仍然对 CPU 足够敏感，以至于 8 vCPU 的成本高于它节省的成本；install-smoke Docker 构建，其中 32 vCPU 的排队时间成本高于它节省的成本                                                                                                                                                                                                                                                                                                     |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `blacksmith-6vcpu-macos-latest`  | `openclaw/openclaw` 上的 `macos-node`；fork 会回退到 `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                  |
| `blacksmith-12vcpu-macos-latest` | `openclaw/openclaw` 上的 `macos-swift`；fork 会回退到 `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                 |

## 本地等价命令

```bash
pnpm changed:lanes   # 检查 origin/main...HEAD 的本地变更分区分类器
pnpm check:changed   # 智能本地检查门禁：按边界分区进行变更的 typecheck/lint/guards
pnpm check          # 快速本地门禁：生产 tsgo + 分片 lint + 并行快速 guards
pnpm check:test-types
pnpm check:timed    # 相同门禁，但包含各阶段耗时
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test           # vitest 测试
pnpm test:changed   # 便宜且智能的变更 Vitest 目标
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs     # 文档格式 + lint + 断链检查
pnpm build          # 当 CI artifact/build-smoke 运行道很重要时构建 dist
pnpm ci:timings                               # 汇总最近一次 origin/main 推送的 CI 运行
pnpm ci:timings:recent                        # 比较最近成功的 main CI 运行
node scripts/ci-run-timings.mjs <run-id>      # 汇总总耗时、排队耗时和最慢的作业
node scripts/ci-run-timings.mjs --latest-main # 忽略 issue/comment 噪声并选择 origin/main 推送的 CI
node scripts/ci-run-timings.mjs --recent 10   # 比较最近成功的 main CI 运行
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
```

## 相关内容

- [安装概览](/install)
- [发布渠道](/install/development-channels)
