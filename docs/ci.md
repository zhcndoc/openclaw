---
summary: "CI 作业图、范围门控和本地命令等价项"
title: CI 流水线
read_when:
  - 你需要了解某个 CI 任务为何运行或未运行
  - 你正在调试失败的 GitHub Actions 检查
---

CI 会在每次推送到 `main` 以及每个 pull request 时运行。它使用智能范围控制，在只变更了无关区域时跳过昂贵作业。手动的 `workflow_dispatch` 运行会有意绕过智能范围控制，并展开完整的正常 CI 图，用于发布候选版本或更广泛的验证。

`Full Release Validation` 是用于“在发布前运行全部内容”的手动总控工作流。它接受分支、标签或完整 commit SHA，使用该目标触发手动 `CI` 工作流，并触发 `OpenClaw Release Checks`，以执行安装冒烟测试、包验收、Docker 发布路径套件、live/E2E、OpenWebUI、QA Lab 一致性、Matrix 和 Telegram 线路。若提供已发布包规范，它还可以运行发布后 `NPM Telegram Beta E2E` 工作流。该总控会记录触发的子运行 id，最终的 `Verify full validation` 作业会重新检查当前子运行的结论。如果某个子工作流被重新运行并变为绿色，只需重新运行父级验证器作业以刷新总控结果。

为进行恢复，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。对发布候选版本使用 `all`，仅针对正常完整 CI 子流程使用 `ci`，针对所有发布子流程使用 `release-checks`，或者在总控上使用更窄的发布组：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。这可使一次失败的发布框重新运行在聚焦修复后仍保持边界可控。

发布 live/E2E 子流程保留了广泛的原生 `pnpm test:live` 覆盖，但它改为通过 `scripts/test-live-shard.mjs` 运行命名分片（`native-live-src-agents`、`native-live-src-gateway-core`、`native-live-src-gateway-backends`、`native-live-test`、`native-live-extensions-a-k`、`native-live-extensions-l-n`、`native-live-extensions-openai`、`native-live-extensions-o-z` 和 `native-live-extensions-media`），而不是单个串行作业。这样既保持相同的文件覆盖范围，又让缓慢的 live 提供方故障更容易重跑和诊断。

`Package Acceptance` 是用于验证包产物的旁路工作流，不会阻塞发布工作流。它从已发布的 npm 规范、使用所选 `workflow_ref` 生成的受信任 `package_ref`、带 SHA-256 的 HTTPS tarball URL，或来自另一个 GitHub Actions 运行的 tarball 产物中解析出一个候选项，将其上传为 `package-under-test`，然后复用 Docker 发布/E2E 调度器，使用该 tarball 而不是重新打包工作流检出内容。配置文件涵盖 smoke、package、product、full 和自定义 Docker 线路选择。`package` 配置文件使用离线插件覆盖，因此已发布包验证不会受实时 ClawHub 可用性限制。可选的 Telegram 线路会在 `NPM Telegram Beta E2E` 工作流中复用 `package-under-test` 产物，而独立触发时则仍保留已发布 npm 规范路径。

## Package acceptance

当问题是“这个可安装的 OpenClaw 包是否能作为产品工作？”时，请使用 `Package Acceptance`。它不同于正常 CI：正常 CI 验证源码树，而包验收则通过用户安装或更新后会使用的同一 Docker E2E 运行线来验证单个 tarball。

该工作流有四个作业：

1. `resolve_package` 检出 `workflow_ref`，解析一个包候选项，写入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，写入 `.artifacts/docker-e2e-package/package-candidate.json`，将二者作为 `package-under-test` 产物上传，并在 GitHub 步骤摘要中打印来源、workflow ref、package ref、版本、SHA-256 和配置文件。
2. `docker_acceptance` 使用 `ref=workflow_ref` 和 `package_artifact_name=package-under-test` 调用 `openclaw-live-and-e2e-checks-reusable.yml`。可复用工作流会下载该产物，在需要时校验 tarball 清单，准备 package-digest Docker 镜像，并针对该包运行所选 Docker 线路，而不是打包工作流检出内容。当某个配置文件选择多个目标 `docker_lanes` 时，可复用工作流会先准备包和共享镜像一次，然后将这些线路拆分为并行的目标 Docker 作业，并附带独立产物。
3. `package_telegram` 可选地调用 `NPM Telegram Beta E2E`。当 `telegram_mode` 不是 `none` 且 Package Acceptance 已解析出一个包时，它会安装同一个 `package-under-test` 产物；独立的 Telegram 触发仍然可以安装已发布的 npm 规范。
4. `summary` 会在包解析、Docker 验收或可选 Telegram 线路失败时使工作流失败。

候选来源：

- `source=npm`：仅接受 `openclaw@beta`、`openclaw@latest`，或像 `openclaw@2026.4.27-beta.2` 这样的精确 OpenClaw 发布版本。用于已发布的 beta/稳定版验收。
- `source=ref`：打包受信任的 `package_ref` 分支、标签或完整 commit SHA。解析器会获取 OpenClaw 分支/标签，验证所选 commit 可从仓库分支历史或发布标签到达，在分离工作树中安装依赖，并使用 `scripts/package-openclaw-for-docker.mjs` 进行打包。
- `source=url`：下载 HTTPS `.tgz`；必须提供 `package_sha256`。
- `source=artifact`：从 `artifact_run_id` 和 `artifact_name` 下载一个 `.tgz`；`package_sha256` 可选，但对于外部共享产物应提供。

请将 `workflow_ref` 和 `package_ref` 分开。`workflow_ref` 是运行测试的受信任工作流/运行线代码。`package_ref` 是在 `source=ref` 时被打包的源码提交。这样当前测试运行线可以验证更早的受信任源码提交，而无需运行旧的工作流逻辑。

配置文件映射到 Docker 覆盖范围：

- `smoke`: `npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package`: `npm-onboard-channel-agent`、`doctor-switch`、
  `update-channel-switch`、`bundled-channel-deps-compat`、`plugins-offline`、
  `plugin-update`
- `product`: `package` 外加 `mcp-channels`、`cron-mcp-cleanup`、
  `openai-web-search-minimal`、`openwebui`
- `full`: 带有 OpenWebUI 的完整 Docker 发布路径分块
- `custom`: 精确的 `docker_lanes`；当 `suite_profile=custom` 时必需

发布检查会使用 `source=ref`、`package_ref=<release-ref>`、`workflow_ref=<release workflow ref>`、
`suite_profile=custom`、
`docker_lanes='bundled-channel-deps-compat plugins-offline'`，以及
`telegram_mode=mock-openai` 调用 Package Acceptance。发布路径 Docker 分块覆盖重叠的包/更新/插件线路，而 Package Acceptance 则通过同一个已解析的包 tarball 保持基于产物的 bundled-channel 兼容性、离线插件和 Telegram 证明。跨 OS 发布检查仍会覆盖特定于操作系统的 onboarding、安装器和平台行为；包/更新产品验证应从 Package Acceptance 开始。Windows packaged 和 installer fresh 线路还会验证已安装的包能够从一个原始绝对 Windows 路径导入浏览器控制覆盖。

Package Acceptance 对已发布包具有一个有边界的旧版兼容窗口，截止到 `2026.4.25`，包括 `2026.4.25-beta.*`。这些允许项记录在此，以免它们变成永久性的静默跳过：`dist/postinstall-inventory.json` 中已知的私有 QA 条目在 tarball 省略这些文件时可能发出警告；当包未暴露该标志时，`doctor-switch` 可跳过 `gateway install --wrapper` 持久化子案例；`update-channel-switch` 可从 tarball 派生的伪 git fixture 中剔除缺失的 `pnpm.patchedDependencies`，并可能记录缺失的持久化 `update.channel`；插件冒烟测试可读取旧版安装记录位置，或接受缺失的 marketplace 安装记录持久化；而 `plugin-update` 可在仍要求安装记录和不重新安装行为保持不变的前提下，允许配置元数据迁移。`2026.4.25` 之后的包必须满足现代契约；相同条件将改为失败而不是警告或跳过。

示例：

```bash
# 使用产品级覆盖验证当前 beta 包。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai

# 使用当前运行线打包并验证发布分支。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=ref \
  -f package_ref=release/YYYY.M.D \
  -f suite_profile=package \
  -f telegram_mode=mock-openai

# 验证一个 tarball URL。source=url 必须提供 SHA-256。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=url \
  -f package_url=https://example.com/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# 复用由另一个 Actions 运行上传的 tarball。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=package-under-test \
  -f suite_profile=custom \
  -f docker_lanes='install-e2e plugin-update'
```

当调试失败的 package acceptance 运行时，请先查看 `resolve_package` 摘要，确认包来源、版本和 SHA-256。然后检查 `docker_acceptance` 子运行及其 Docker 产物：
`.artifacts/docker-tests/**/summary.json`、`failures.json`、线路日志、阶段耗时和重新运行命令。优先重新运行失败的包配置文件或精确的 Docker 线路，而不是重新运行完整发布验证。

QA Lab 在主智能范围工作流之外有专门的 CI 线路。`Parity gate` 工作流会在匹配的 PR 更改和手动触发时运行；它构建私有 QA 运行时，并比较 mock GPT-5.5 和 Opus 4.6 的 agentic 包。`QA-Lab - All Lanes` 工作流会在 `main` 上按夜间计划以及手动触发时运行；它将 mock 一致性门控、live Matrix 线路以及 live Telegram 和 Discord 线路并行展开为作业。live 作业使用 `qa-live-shared` 环境，而 Telegram/Discord 使用 Convex 租约。Matrix 在计划任务和发布门控中使用 `--profile fast`，仅在检出的 CLI 支持时才额外添加 `--fail-fast`。CLI 默认值和手动工作流输入仍为 `all`；手动 `matrix_profile=all` 触发总会将完整 Matrix 覆盖拆分为 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。`OpenClaw Release Checks` 还会在发布批准前运行发布关键的 QA Lab 线路；其 QA 一致性门控会并行运行候选包和基线包作业，然后将两个产物下载到一个小型报告作业中进行最终一致性比较。

`Duplicate PRs After Merge` 工作流是一个供维护者手动使用的工作流，用于在 land 之后清理重复 PR。它默认是 dry-run，并且只有在 `apply=true` 时才会关闭明确列出的 PR。在修改 GitHub 之前，它会验证已 land 的 PR 确实已合并，并且每个重复项要么共享一个被引用的问题，要么有重叠的变更 hunks。

`CodeQL` 工作流有意只是一个狭窄的首轮扫描器，而不是对整个仓库的全面扫描。每日和手动运行会扫描 Actions 工作流代码，以及高风险最高的 JavaScript/TypeScript auth、secrets、sandbox、cron 和 gateway 表面。关键安全线路使用高精度安全查询，而单独的关键质量线路只在相同的狭窄 JavaScript/TypeScript 表面上运行错误级别的非安全查询。Swift、Android、Python、UI 和 bundled-plugin 的 CodeQL 扩展应仅在狭窄配置文件具有稳定运行时间和信号之后，作为有范围或分片的后续工作重新加入。

`Docs Agent` 工作流是一个由事件驱动的 Codex 维护线路，用于保持现有文档与最近落地的更改一致。它没有纯计划任务：`main` 上一次成功的非 bot push CI 运行可以触发它，手动触发也可以直接运行它。workflow-run 调用在 `main` 已向前推进，或在过去一小时内创建了另一个未跳过的 Docs Agent 运行时会跳过。运行时，它会审阅从上一个未跳过的 Docs Agent 源 SHA 到当前 `main` 的提交范围，因此一次每小时运行就能覆盖自上次文档处理以来累积的所有 main 更改。

`Test Performance Agent` 工作流是一个面向慢测试的事件驱动 Codex 维护运行线。它没有纯计划任务：`main` 上一次成功的非机器人 push CI 运行可以触发它，但如果同一天里已经有另一个 workflow-run 调用运行过或正在运行，它就会跳过。手动触发会绕过这个每日活动门控。该运行线会生成完整套件的分组 Vitest 性能报告，只允许 Codex 进行小的、保持覆盖率的测试性能修复，而不是大规模重构，然后重新运行完整套件报告，并拒绝会降低通过基线测试数量的更改。如果基线中存在失败测试，Codex 可以只修复明显失败项，并且代理执行后的完整套件报告必须通过后才会提交任何内容。当 `main` 在 bot push 落地前继续前进时，该运行线会对已验证的补丁进行 rebase，重新运行 `pnpm check:changed`，并重试推送；冲突的过期补丁会被跳过。它使用 GitHub 托管的 Ubuntu，因此 Codex action 可以保持与 docs agent 相同的 drop-sudo 安全姿态。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 作业概览

| 作业                              | 目的                                                                                       | 运行时机                        |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------- |
| `preflight`                      | 检测仅文档变更、已更改范围、已更改扩展，并构建 CI 清单      | 始终在非草稿推送和 PR 上运行 |
| `security-scm-fast`              | 通过 `zizmor` 进行私钥检测和工作流审计                                        | 始终在非草稿推送和 PR 上运行 |
| `security-dependency-audit`      | 针对 npm 安全公告的无依赖生产 lockfile 审计                             | 始终在非草稿推送和 PR 上运行 |
| `security-fast`                  | 快速安全作业的必需聚合                                                | 始终在非草稿推送和 PR 上运行 |
| `build-artifacts`                | 构建 `dist/`、Control UI、已构建产物检查，以及可复用的下游产物          | 与 Node 相关的变更              |
| `checks-fast-core`               | 诸如 bundled/plugin-contract/protocol 检查之类的快速 Linux 正确性运行线                 | 与 Node 相关的变更              |
| `checks-fast-contracts-channels` | 带有稳定聚合检查结果的分片 channel contract 检查                         | 与 Node 相关的变更              |
| `checks-node-extensions`         | 覆盖扩展套件的完整 bundled-plugin 测试分片                                   | 与 Node 相关的变更              |
| `checks-node-core-test`          | 核心 Node 测试分片，不包括 channel、bundled、contract 和 extension 运行线             | 与 Node 相关的变更              |
| `check`                          | 分片的主本地门禁等价项：生产类型检查、lint、guards、测试类型和严格 smoke   | 与 Node 相关的变更              |
| `check-additional`               | 架构、边界、扩展面守卫、package-boundary 和 gateway-watch 分片 | 与 Node 相关的变更              |
| `build-smoke`                    | 已构建 CLI smoke 测试和启动内存 smoke                                               | 与 Node 相关的变更              |
| `checks`                         | 已构建产物 channel 测试的验证器                                                    | 与 Node 相关的变更              |
| `checks-node-compat-node22`      | Node 22 兼容性构建和 smoke 运行线                                                   | 发布的手动 CI 分发    |
| `check-docs`                     | 文档格式化、lint 和断链检查                                                | 文档已更改                       |
| `skills-python`                  | 面向 Python 后端技能的 Ruff + pytest                                                       | 与 Python 技能相关的变更      |
| `checks-windows`                 | Windows 特定的进程/路径测试，加上共享运行时导入说明符回归         | 与 Windows 相关的变更           |
| `macos-node`                     | 使用共享已构建产物的 macOS TypeScript 测试运行线                                  | 与 macOS 相关的变更             |
| `macos-swift`                    | macOS 应用的 Swift lint、构建和测试                                               | 与 macOS 相关的变更             |
| `android`                        | 两种 flavor 的 Android 单元测试，加上一个 debug APK 构建                                 | 与 Android 相关的变更           |
| `test-performance-agent`         | 在可信活动之后，每日进行 Codex 慢测试优化                                    | 主 CI 成功或手动分发 |

手动 CI 分发会运行与正常 CI 相同的作业图，但会强制开启所有有范围的运行线：Linux Node 分片、bundled-plugin 分片、channel contracts、Node 22 兼容性、`check`、`check-additional`、build smoke、文档检查、Python skills、Windows、macOS、Android，以及 Control UI i18n。手动运行使用独立的 concurrency group，因此同一 ref 上的另一个 push 或 PR 运行不会取消发布候选版本的完整套件。可选的 `target_ref` 输入允许可信调用方使用所选分发 ref 上的 workflow 文件，将该图运行在分支、标签或完整 commit SHA 上。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha>
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 快速失败顺序

任务按顺序排列，以便在昂贵任务运行前，先进行廉价检查以快速失败：

1. `preflight` 决定哪些运行线根本存在。`docs-scope` 和 `changed-scope` 逻辑是这个作业中的步骤，而不是独立作业。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 会在不等待更重的产物和平台矩阵作业的情况下快速失败。
3. `build-artifacts` 与快速 Linux 运行线重叠，因此下游消费者可以在共享构建就绪后立刻开始。
4. 更重的平台和运行时运行线随后展开：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-extensions`、`checks-node-core-test`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

范围逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。
手动分发会跳过 changed-scope 检测，并使 preflight 清单
表现得像所有有范围的区域都已更改。
CI 工作流编辑会验证 Node CI 图以及工作流 lint，但不会单独强制 Windows、Android 或 macOS 原生构建；这些平台运行线仍然仅限于平台源代码变更。
仅 CI 路由编辑、选定的廉价 core-test fixture 编辑，以及狭窄的 plugin contract helper/test-routing 编辑，会使用快速的仅 Node 清单路径：preflight、security 和单个 `checks-fast-core` 任务。该路径会在变更文件仅限于快速任务直接执行的路由或 helper 面时，避免构建产物、Node 22 兼容性、channel contracts、完整 core 分片、bundled-plugin 分片以及额外的守卫矩阵。
Windows Node 检查仅限于 Windows 特定的进程/路径包装器、npm/pnpm/UI runner helper、包管理器配置，以及执行该运行线的 CI 工作流表面；无关的源代码、plugin、install-smoke 和仅测试变更仍停留在 Linux Node 运行线上，因此它们不会为了已经由正常测试分片覆盖的内容而占用一台 16-vCPU 的 Windows worker。
独立的 `install-smoke` 工作流通过自己的 `preflight` 作业重用相同的范围脚本。它将 smoke 覆盖拆分为 `run_fast_install_smoke` 和 `run_full_install_smoke`。Pull request 会针对 Docker/包表面、bundled plugin 包/manifest 变更，以及 Docker smoke 作业所覆盖的 core plugin/channel/gateway/Plugin SDK 表面运行快速路径。仅源代码的 bundled plugin 变更、仅测试编辑和仅文档编辑不会占用 Docker worker。快速路径会构建一次根 Dockerfile 镜像、检查 CLI、运行 agents delete shared-workspace CLI smoke、运行 container gateway-network e2e、验证 bundled extension build arg，并在 240 秒的聚合命令超时下运行受限的 bundled-plugin Docker profile，同时每个场景的 Docker 运行单独设限。完整路径保留 QR 包安装以及 installer Docker/update 覆盖，用于每晚定时运行、手动分发、workflow-call 发布检查，以及真正触及 installer/package/Docker 表面的 pull request。`main` 推送，包括 merge commit，不会强制走完整路径；当 changed-scope 逻辑在 push 上请求完整覆盖时，工作流会保留快速 Docker smoke，并将完整 install smoke 留给夜间或发布验证。较慢的 Bun 全局安装 image-provider smoke 由 `run_bun_global_install_smoke` 单独设门；它在夜间计划和发布检查工作流中运行，手动 `install-smoke` 分发可以选择启用它，但 pull request 和 `main` 推送不会运行它。QR 和 installer Docker 测试保留各自面向安装的 Dockerfile。本地 `test:docker:all` 会预构建一个共享的 live-test 镜像，将 OpenClaw 打包一次为 npm tarball，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：一个用于 installer/update/plugin-dependency 运行线的纯 Node/Git runner，以及一个将同一 tarball 安装到 `/app` 中、用于正常功能运行线的功能镜像。Docker 运行线定义位于 `scripts/lib/docker-e2e-scenarios.mjs`，规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`，runner 只执行所选计划。调度器通过 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 为每条运行线选择镜像，然后以 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行运行线；可通过 `OPENCLAW_DOCKER_ALL_PARALLELISM` 调整默认主池槽位数 10，通过 `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` 调整对 provider 敏感的尾池槽位数 10。重型运行线的上限默认分别为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`，这样 npm install 和多服务运行线不会过度占用 Docker，而较轻的运行线仍可填满可用槽位。一条比有效上限更重的单独运行线仍可从空池启动，然后独占运行直到释放容量。默认情况下，运行线启动间隔为 2 秒，以避免本地 Docker 守护进程创建风暴；可用 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=0` 或其他毫秒值覆盖。本地聚合会预检 Docker、移除过期的 OpenClaw E2E 容器、输出活动运行线状态、持久化运行线耗时以进行 longest-first 排序，并支持 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 供调度器检查。默认情况下，它在第一个失败后停止调度新的池化运行线，并且每条运行线都有一个 120 分钟的回退超时，可通过 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的 live/tail 运行线使用更严格的每条运行线上限。`OPENCLAW_DOCKER_ALL_LANES=<lane[,lane]>` 会运行精确的调度器运行线，包括仅发布的运行线，例如 `install-e2e`，以及拆分的 bundled update 运行线，例如 `bundled-channel-update-acpx`，同时跳过清理 smoke，以便 agents 能重现某一条失败的运行线。可复用的 live/E2E 工作流会询问 `scripts/test-docker-all.mjs --plan-json` 以确定需要哪种包、镜像类型、live 镜像、运行线以及凭据覆盖，然后 `scripts/docker-e2e.mjs` 将该计划转换为 GitHub 输出和摘要。它要么通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，要么下载当前运行的包产物，或者从 `package_artifact_run_id` 下载一个包产物；验证 tarball 清单；当计划需要已安装包的运行线时，通过 Blacksmith 的 Docker layer cache 构建并推送带有 package-digest-tag 的 bare/functional GHCR Docker E2E 镜像；并复用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 输入或现有的 package-digest 镜像，而不是重新构建。`Package Acceptance` 工作流是高层级的包门禁：它从 npm、受信任的 `package_ref`、带有 SHA-256 的 HTTPS tarball 或之前的工作流产物中解析一个候选项，然后将那个单一的 `package-under-test` 产物传入可复用的 Docker E2E 工作流。它将 `workflow_ref` 与 `package_ref` 分开，以便当前验收逻辑可以验证较旧的受信任提交，而无需检出旧的工作流代码。发布检查会针对目标 ref 运行一个自定义的 Package Acceptance delta：bundled-channel 兼容性、离线 plugin fixture，以及针对已解析 tarball 的 Telegram package QA。发布路径的 Docker 套件使用更小的分块作业，并设置 `OPENCLAW_SKIP_DOCKER_BUILD=1`，这样每个块只拉取所需的镜像类型，并通过同一个加权调度器执行多个运行线（`OPENCLAW_DOCKER_ALL_PROFILE=release-path`、`OPENCLAW_DOCKER_ALL_CHUNK=core|package-update-openai|package-update-anthropic|package-update-core|plugins-runtime-core|plugins-runtime-install-a|plugins-runtime-install-b|bundled-channels`）。当完整发布路径覆盖要求时，OpenWebUI 会并入 `plugins-runtime-core`，并且仅在仅 OpenWebUI 分发时保留一个独立的 `openwebui` 块。遗留的聚合块名称 `package-update`、`plugins-runtime` 和 `plugins-integrations` 仍可用于手动重新运行，但发布工作流使用拆分后的块，因此 installer E2E 和 bundled plugin 安装/卸载遍历不会主导关键路径。`install-e2e` 运行线别名仍然是两个 provider installer 运行线的聚合手动重跑别名。`bundled-channels` 块运行拆分的 `bundled-channel-*` 和 `bundled-channel-update-*` 运行线，而不是串行的一体化 `bundled-channel-deps` 运行线。每个块都会上传 `.artifacts/docker-tests/`，其中包含运行线日志、耗时、`summary.json`、`failures.json`、阶段耗时、调度器计划 JSON、慢运行线表以及每条运行线的重新运行命令。工作流 `docker_lanes` 输入会对准备好的镜像运行所选运行线，而不是运行块作业，这使得失败运行线的调试被限定在一个有针对性的 Docker 作业中，并为该次运行准备、下载或重用包产物；如果所选运行线是 live Docker 运行线，则有针对性的作业会在本地为该次重跑构建 live-test 镜像。生成的逐运行线 GitHub 重跑命令会在这些值存在时包含 `package_artifact_run_id`、`package_artifact_name` 和已准备好的镜像输入，因此失败的运行线可以重用失败运行中的确切包和镜像。使用 `pnpm test:docker:rerun <run-id>` 从 GitHub 运行中下载 Docker 产物并打印组合/逐运行线的有针对性重跑命令；使用 `pnpm test:docker:timings <summary.json>` 查看慢运行线和阶段关键路径摘要。定时的 live/E2E 工作流每天运行完整的发布路径 Docker 套件。bundled update 矩阵按更新目标拆分，因此重复的 npm update 和 doctor repair 过程可以与其他 bundled 检查分片并行。

当前发布 Docker 块为 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-core`、`plugins-runtime-install-a`、`plugins-runtime-install-b`、`bundled-channels-core`、`bundled-channels-update-a`、`bundled-channels-update-b` 和 `bundled-channels-contracts`。聚合的 `bundled-channels` 块仍可用于手动一次性重跑，但发布工作流使用拆分后的块，因此 channel smoke、更新目标和 setup/runtime contract 检查可以并行运行。定向的 `docker_lanes` 分发也会在一个共享的包/镜像准备步骤之后，将多个已选运行线拆分到并行作业中，而 bundled-channel 更新运行线会在暂时性的 npm 网络失败时重试一次。

本地 changed-lane 逻辑位于 `scripts/changed-lanes.mjs`，并由 `scripts/check-changed.mjs` 执行。与广泛的 CI 平台范围相比，这个本地检查门禁对架构边界更严格：核心生产变更会运行 core prod 和 core test typecheck 以及 core lint/guards，core test-only 变更只运行 core test typecheck 以及 core lint，extension 生产变更会运行 extension prod 和 extension test typecheck 以及 extension lint，而 extension test-only 变更只运行 extension test typecheck 以及 extension lint。Public Plugin SDK 或 plugin-contract 变更会扩展到 extension typecheck，因为扩展依赖这些核心契约，但 Vitest extension 全量扫描属于明确的测试工作。仅发布元数据版本递增会运行有针对性的 version/config/root-dependency 检查。未知的 root/config 变更会安全地失败到所有 check 运行线。

手动 CI 分发会将 `checks-node-compat-node22` 作为发布候选兼容性覆盖运行。正常的 pull request 和 `main` push 会跳过该运行线，并让矩阵聚焦于 Node 24 的测试/channel 运行线。

最慢的 Node 测试家族被拆分或平衡，以便每个作业都保持较小，而不会过度占用 runner：channel contracts 以三个加权分片运行，bundled plugin 测试在六个 extension worker 之间平衡，小型 core unit 运行线成对运行，auto-reply 作为四个平衡 worker 运行，并将 reply 子树拆分为 agent-runner、dispatch 和 commands/state-routing 分片，而 agentic gateway/plugin 配置则分布到现有的仅源代码 agentic Node 作业中，而不是等待构建产物。广泛的浏览器、QA、媒体和其他 plugin 测试使用各自专用的 Vitest 配置，而不是共享的 plugin 总括配置。extension 分片作业一次最多运行两组 plugin config，每组一个 Vitest worker，并使用更大的 Node 堆，因此 import-heavy 的 plugin 批次不会创建额外的 CI 作业。广泛的 agents 运行线使用共享的 Vitest 文件并行调度器，因为它更多受 import/scheduling 驱动，而不是由单个慢测试文件所有。`runtime-config` 会与 infra core-runtime 分片一起运行，以保持共享 runtime 分片不负责尾部工作。include-pattern 分片会使用 CI shard name 记录耗时条目，因此 `.artifacts/vitest-shard-timings.json` 可以区分整个配置与过滤后的分片。`check-additional` 会将 package-boundary 的 compile/canary 工作放在一起，并将 runtime topology architecture 与 gateway watch 覆盖分开；boundary guard 分片会在一个作业内并发运行其小型独立 guards。gateway watch、channel tests 和 core support-boundary 分片会在 `build-artifacts` 内、`dist/` 和 `dist-runtime/` 已构建完成后并发运行，保留其旧的检查名称作为轻量验证作业，同时避免额外两个 Blacksmith worker 和第二个 artifact-consumer 队列。
Android CI 会同时运行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然后构建 Play debug APK。third-party flavor 没有单独的 source set 或 manifest；它的 unit-test 运行线仍会使用 SMS/call-log BuildConfig 标志编译该 flavor，同时避免在每次与 Android 相关的 push 中重复执行 debug APK 打包作业。
当新的 push 落到同一个 PR 或 `main` ref 上时，GitHub 可能会将被取代的作业标记为 `cancelled`。除非同一 ref 的最新运行也失败了，否则应将其视为 CI 噪音。聚合分片检查使用 `!cancelled() && always()`，因此它们仍会报告正常的分片失败，但在整个工作流已经被取代后不会再排队。
自动 CI concurrency key 是有版本号的（`CI-v7-*`），因此旧队列组中的 GitHub 侧僵尸不会无限期阻塞较新的 main 运行。手动完整套件运行使用 `CI-manual-v1-*`，并且不会取消正在进行的运行。

## 运行器

| Runner                           | 作业                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`、快速安全作业和聚合（`security-scm-fast`、`security-dependency-audit`、`security-fast`）、快速协议/契约/捆绑检查、分片 channel 契约检查、除 lint 外的 `check` 分片、`check-additional` 分片和聚合、Node 测试聚合验证器、docs 检查、Python skills、workflow-sanity、labeler、auto-response；install-smoke preflight 也使用 GitHub 托管的 Ubuntu，以便 Blacksmith 矩阵可以更早排队 |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`、build-smoke、Linux Node 测试分片、捆绑插件测试分片、`android`                                                                                                                                                                                                                                                                                                                                                                           |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint`，它仍然对 CPU 足够敏感，因此 8 vCPU 的成本高于节省；install-smoke Docker 构建，32 vCPU 的排队时间成本高于节省                                                                                                                                                                                                                                                                                                     |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `blacksmith-6vcpu-macos-latest`  | `macos-node`，运行于 `openclaw/openclaw`；fork 会回退到 `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                  |
| `blacksmith-12vcpu-macos-latest` | `macos-swift`，运行于 `openclaw/openclaw`；fork 会回退到 `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                 |

## 本地等效命令

```bash
pnpm changed:lanes   # 检查 origin/main...HEAD 的本地变更 lane 分类器
pnpm check:changed   # 智能本地检查门禁：按边界 lane 检查变更的 typecheck/lint/guards
pnpm check          # 快速本地门禁：生产 tsgo + 分片 lint + 并行快速 guards
pnpm check:test-types
pnpm check:timed    # 相同门禁，带每个阶段的计时
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test           # vitest 测试
pnpm test:changed   # 轻量智能的变更 Vitest 目标
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs     # docs 格式 + lint + 断链检查
pnpm build          # 当 CI artifact/build-smoke 轨道重要时构建 dist
node scripts/ci-run-timings.mjs <run-id>      # 汇总总耗时、排队时间和最慢作业
node scripts/ci-run-timings.mjs --recent 10   # 比较最近成功的主分支 CI 运行
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
```

## 相关

- [安装概览](/install)
- [发布渠道](/install/development-channels)
