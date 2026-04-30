---
summary: "发布通道、操作员检查清单、验证框、版本命名和发布节奏"
title: "发布策略"
read_when:
  - 查找公开发布通道定义时
  - 运行发布验证或包验收时
  - 查找版本命名和发布节奏时
---

OpenClaw 有三个公开发布通道：

- stable：默认发布到 npm `beta` 的已打标签发布，或在显式请求时发布到 npm `latest`
- beta：发布到 npm `beta` 的预发布标签
- dev：`main` 的移动头部

## 版本命名

- 稳定版发布版本：`YYYY.M.D`
  - Git tag：`vYYYY.M.D`
- 稳定修正版发布版本：`YYYY.M.D-N`
  - Git tag：`vYYYY.M.D-N`
- Beta 预发布版本：`YYYY.M.D-beta.N`
  - Git tag：`vYYYY.M.D-beta.N`
- 月和日不要补零
- `latest` 表示当前已提升的稳定 npm 发布
- `beta` 表示当前 beta 安装目标
- Stable 和 stable correction 发布默认发布到 npm `beta`；发布操作员可以显式指定 `latest`，或稍后提升经过验证的 beta 构建
- 每个稳定的 OpenClaw 发布都会同时发布 npm 包和 macOS 应用；
  beta 发布通常先验证并发布 npm/package 路径，
  mac 应用的构建/签名/notarize 仅保留给稳定版，除非显式请求

## 发布节奏

- 发布优先从 beta 开始
- 只有在最新 beta 已验证后才进入稳定版
- 维护者通常从基于当前 `main` 创建的 `release/YYYY.M.D` 分支切出发布，
  这样发布验证和修复不会阻塞 `main` 上的新开发
- 如果 beta tag 已经被推送或发布并且需要修复，维护者应切出下一个 `-beta.N` tag，
  而不是删除或重建旧的 beta tag
- 详细的发布流程、审批、凭据和恢复说明仅限维护者可见

## 发布操作员检查清单

此检查清单是发布流程的公开形式。私有凭据、签名、notarization、dist-tag 恢复和紧急回滚细节保留在仅维护者可见的发布手册中。

1. 从当前 `main` 开始：拉取最新代码，确认目标 commit 已推送，并确认当前 `main` 的 CI 足够健康，可以从其切分分支。
2. 使用 `/changelog` 基于真实提交历史重写顶部 `CHANGELOG.md` 部分，保持条目面向用户，提交并推送，然后在切分分支前再 rebase/pull 一次。
3. 审查 `src/plugins/compat/registry.ts` 和
   `src/commands/doctor/shared/deprecation-compat.ts` 中的发布兼容性记录。只有在升级路径仍然被覆盖时才移除已过期的兼容性，或者记录为何有意保留它。
4. 从当前 `main` 创建 `release/YYYY.M.D`；不要直接在 `main` 上进行正常发布工作。
5. 为目标 tag 更新所有必需的版本位置，然后运行本地确定性预检：
   `pnpm check:test-types`、`pnpm check:architecture`、
   `pnpm build && pnpm ui:build`，以及 `pnpm release:check`。
6. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`。在 tag 还不存在之前，可以使用完整的 40 字符 release-branch SHA 仅用于验证性预检。保存成功的 `preflight_run_id`。
7. 使用 `Full Release Validation` 为发布分支、tag 或完整 commit SHA 启动所有预发布测试。这里是四个大型发布测试框的唯一手动入口：Vitest、Docker、QA Lab 和 Package。
8. 如果验证失败，在发布分支上修复，并重新运行最小的失败文件、lane、workflow job、package profile、provider 或 model allowlist，以证明修复有效。只有在变更范围使先前证据失效时，才重新运行完整的总验证。
9. 对于 beta，打 tag `vYYYY.M.D-beta.N`，使用 npm dist-tag `beta` 发布，然后对已发布的 `openclaw@YYYY.M.D-beta.N` 或 `openclaw@beta` 包运行发布后包验收。如果已推送或已发布的 beta 需要修复，则切出下一个 `-beta.N`；不要删除或重写旧 beta。
10. 对于 stable，只有在经过验证的 beta 或 release candidate 具备所需验证证据后才继续。稳定版 npm 发布会复用成功的 `preflight_run_id` 所对应的预检产物；稳定版 macOS 发布就绪还要求在 `main` 上有打包后的 `.zip`、`.dmg`、`.dSYM.zip` 以及更新后的 `appcast.xml`。
11. 发布后，运行 npm 发布后验证器、按需的独立 published-npm Telegram E2E（当你需要发布后通道证明时）、需要时进行 dist-tag 提升、基于完整匹配的 `CHANGELOG.md` 部分生成 GitHub release/prerelease notes，以及发布公告步骤。

## 发布预检

- 在发布预检前运行 `pnpm check:test-types`，以便在更快的本地 `pnpm check` 门控之外也覆盖测试 TypeScript
- 在发布预检前运行 `pnpm check:architecture`，以便在更快的本地门控之外让更广泛的导入循环和架构边界检查通过
- 在运行 `pnpm release:check` 之前先运行 `pnpm build && pnpm ui:build`，以便打包验证步骤所需的 `dist/*` 发布产物和 Control UI bundle 已存在
- 在发布审批前运行手动的 `Full Release Validation` 工作流，从一个入口启动所有预发布测试框。它接受分支、tag 或完整 commit SHA，分发手动 `CI`，并分发 `OpenClaw Release Checks` 用于安装 smoke、包验收、Docker 发布路径套件、live/E2E、OpenWebUI、QA Lab parity、Matrix 和 Telegram lane。仅在包已发布且也应运行发布后 Telegram E2E 时提供 `npm_telegram_package_spec`。当私有证据报告应证明验证与已发布的 npm 包匹配但不强制 Telegram E2E 时，提供 `evidence_package_spec`。示例：
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 当你希望在发布工作继续推进的同时，为候选包提供侧边通道证明时，运行手动的 `Package Acceptance` 工作流。对 `openclaw@beta`、`openclaw@latest` 或精确的发布版本使用 `source=npm`；对使用当前 `workflow_ref` harness 打包可信的 `package_ref` 分支/tag/SHA 使用 `source=ref`；对带有必需 SHA-256 的 HTTPS tarball 使用 `source=url`；或对由其他 GitHub Actions 运行上传的 tarball 使用 `source=artifact`。该工作流会将候选项解析为 `package-under-test`，对该 tarball 复用 Docker E2E release scheduler，并且可以使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 对同一 tarball 运行 Telegram QA。
  示例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f telegram_mode=mock-openai`
  常见 profile：
  - `smoke`：install/channel/agent、gateway network 和 config reload lanes
  - `package`：不含 OpenWebUI 或 live ClawHub 的 artifact-native package/update/plugin lanes
  - `product`：package profile 加上 MCP channels、cron/subagent cleanup、
    OpenAI web search 和 OpenWebUI
  - `full`：带 OpenWebUI 的 Docker release-path chunks
  - `custom`：用于聚焦重跑的精确 `docker_lanes` 选择
- 当你只需要发布候选的完整常规 CI 覆盖时，直接运行手动的 `CI` 工作流。手动 CI 分发会绕过 changed scoping，并强制运行 Linux Node shards、bundled-plugin shards、channel contracts、Node 22 compatibility、`check`、`check-additional`、build smoke、docs checks、Python skills、Windows、macOS、Android 和 Control UI i18n lanes。
  示例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 在验证发布遥测时运行 `pnpm qa:otel:smoke`。它通过本地 OTLP/HTTP receiver 让 QA-lab 跑通，并验证导出的 trace span 名称、受限属性，以及内容/标识符脱敏，而无需 Opik、Langfuse 或其他外部收集器。
- 在每次带标签的发布前运行 `pnpm release:check`
- 发布检查现在在一个单独的手动工作流中运行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 还会在发布审批前运行 QA Lab mock parity gate，以及快速的 live Matrix profile 和 Telegram QA lane。live lanes 使用 `qa-live-shared` 环境；Telegram 也使用 Convex CI 凭据租约。当你想要并行运行完整的 Matrix transport、media 和 E2EE 清单时，运行手动的 `QA-Lab - All Lanes` 工作流，并设置 `matrix_profile=all` 和 `matrix_shards=true`。
- 跨操作系统的安装和升级运行时验证是公开的 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它们直接调用可复用工作流
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这种拆分是有意为之：保持真实的 npm 发布路径短小、确定性并聚焦于产物，而较慢的 live checks 保持在自己的 lane 中，这样它们不会拖慢或阻塞发布
- 含密钥的发布检查应通过 `Full Release Validation` 或从 `main`/release 工作流 ref 触发，以便工作流逻辑和密钥保持受控
- 只要解析后的 commit 可从 OpenClaw 分支或 release tag 到达，`OpenClaw Release Checks` 就接受分支、tag 或完整 commit SHA
- `OpenClaw NPM Release` 的仅验证预检也接受当前完整的 40 字符 workflow-branch commit SHA，而不要求已推送 tag
- 该 SHA 路径仅用于验证，不能提升为真实发布
- 在 SHA 模式下，工作流仅为包元数据检查合成 `v<package.json version>`；真实发布仍然需要真正的 release tag
- 这两个工作流都将真实发布和提升路径保留在 GitHub-hosted runners 上，而非变更性验证路径可以使用更大的 Blacksmith Linux runners
- 该工作流运行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  并同时使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` workflow secrets
- npm 发布预检不再等待独立的 release checks lane
- 在批准前运行
  `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction tag）
- 在 npm 发布后，运行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/correction version）以在一个新的临时前缀中验证已发布 registry 的安装路径
- 在 beta 发布后，运行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  以使用共享的已租用 Telegram 凭据池，验证已安装包入门、Telegram 设置，以及针对已发布 npm 包的真实 Telegram E2E。本地维护者的一次性运行可以省略 Convex 变量，并直接传入三个
  `OPENCLAW_QA_TELEGRAM_*` 环境凭据。
- 维护者可以通过手动的 `NPM Telegram Beta E2E` 工作流从 GitHub Actions 运行相同的发布后检查。它是有意设计为仅手动触发，不会在每次合并时运行。
- 维护者发布自动化现在使用 preflight-then-promote：
  - 真实的 npm publish 必须通过成功的 npm `preflight_run_id`
  - 真实的 npm publish 必须与成功预检运行来自同一个 `main` 或
    `release/YYYY.M.D` 分支
  - 稳定版 npm 发布默认使用 `beta`
  - 稳定版 npm publish 可以通过 workflow input 显式指定 `latest`
  - 基于 token 的 npm dist-tag 变更现在出于安全原因位于
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    中，因为 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，而公开仓库保持仅 OIDC 发布
  - 公开的 `macOS Release` 仅用于验证
  - 真实的私有 mac 发布必须通过成功的私有 mac
    `preflight_run_id` 和 `validate_run_id`
  - 真实发布路径通过提升已准备好的产物，而不是再次重建它们
- 对于像 `YYYY.M.D-N` 这样的稳定修正版发布，发布后验证器还会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，这样发布修正就不会在不知不觉中让较旧的全局安装停留在基础稳定有效载荷上
- npm 发布预检会在 tarball 不同时包含 `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 有效载荷时失败关闭，因此我们不会再次发布一个空的浏览器仪表板
- 发布后验证还会检查已发布的 registry 安装是否在根 `dist/*` 布局下包含非空的 bundled plugin 运行时依赖。如果某个发布带有缺失或为空的 bundled plugin 依赖有效载荷，发布后验证器会失败，并且不能被提升到 `latest`。
- `pnpm test:install:smoke` 也会对候选更新 tarball 强制执行 npm pack 的 `unpackedSize` 预算，因此安装器 e2e 可以在发布前路径捕获意外的打包膨胀
- 如果发布工作涉及 CI planning、extension timing manifests 或 extension test matrices，则在审批前重新生成并审查 planner 拥有的
  `plugin-prerelease-extension-shard` matrix 输出，来源为
  `.github/workflows/plugin-prerelease.yml`，以免发布说明描述了过时的 CI 布局
- 稳定版 macOS 发布就绪还包括 updater surfaces：
  - GitHub release 必须最终包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 必须在发布后指向新的稳定 zip
  - 打包后的应用必须保留非 debug 的 bundle id、非空的 Sparkle feed
    URL，以及不低于该发布版本规范 Sparkle 构建下限的 `CFBundleVersion`

## 发布测试箱

`Full Release Validation` 是运维人员从一个入口启动所有预发布测试的方式。请从受信任的 `main` 工作流 ref 运行它，并将发布分支、标签或完整提交 SHA 作为 `ref` 传入：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=full \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

该工作流会解析目标 ref，分发带有 `target_ref=<release-ref>` 的手动 `CI`，分发 `OpenClaw Release Checks`，并在设置了 `npm_telegram_package_spec` 时可选地分发独立的发布后 Telegram E2E。随后 `OpenClaw Release Checks` 会展开安装冒烟测试、跨操作系统发布检查、覆盖发布路径的实时/E2E Docker、包含 Telegram 包 QA 的 Package Acceptance、QA Lab 一致性、实时 Matrix 和实时 Telegram。只有当 `Full Release Validation` 摘要显示 `normal_ci` 和 `release_checks` 成功，且任何可选的 `npm_telegram` 子项要么成功要么被有意跳过时，完整运行才算可接受。最终 verifier 摘要会为每个子运行包含最慢作业表，因此发布经理无需下载日志就能看到当前关键路径。

子工作流会从运行 `Full Release Validation` 的受信任 ref 分发，通常是 `--ref main`，即使目标 `ref` 指向较旧的发布分支或标签也是如此。没有单独的 Full Release Validation workflow-ref 输入；通过选择工作流运行 ref 来选择受信任的 harness。

使用 `release_profile` 来选择实时/提供方覆盖范围：

- `minimum`：最快的发布关键 OpenAI/核心实时与 Docker 路径
- `stable`：在 minimum 基础上增加稳定提供方/后端覆盖，用于发布批准
- `full`：在 stable 基础上增加更广泛的建议性提供方/媒体覆盖

`OpenClaw Release Checks` 使用受信任的工作流 ref 先将目标 ref 解析一次为 `release-package-under-test`，并在发布路径 Docker 检查和 Package Acceptance 中复用该制品。这使所有面向包的测试箱都使用同一份字节，并避免重复构建包。跨 OS 的 OpenAI 安装冒烟测试会在仓库/组织变量设置时使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则使用 `openai/gpt-5.4-mini`，因为这条线路验证的是包安装、上手引导、网关启动以及一次实时代理回合，而不是对最慢默认模型进行基准测试。更广泛的实时提供方矩阵仍然是按模型覆盖的地方。

根据发布阶段使用以下变体：

```bash
# 验证一个尚未发布的候选版本分支。
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable

# 验证一个精确推送的提交。
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=<40-char-sha> \
  -f provider=openai \
  -f mode=both

# 发布 beta 后，增加已发布包的 Telegram E2E。
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

不要在首次针对某个定点修复重跑时使用完整大总包。如果某个箱子失败，请在下次验证时使用失败的子工作流、作业、Docker 线路、包配置文件、模型提供方或 QA 线路。只有当修复改动了共享的发布编排，或使之前所有箱子的证据过期时，才再次运行完整大总包。大总包的最终 verifier 会重新检查记录的子工作流运行 id，因此在某个子工作流成功重跑后，只重跑失败的 `Verify full validation` 父作业即可。

为进行有界恢复，可向大总包传入 `rerun_group`。`all` 是真正的发布候选运行，`ci` 只运行 normal CI 子项，`plugin-prerelease` 只运行仅发布用的插件子项，`release-checks` 运行所有发布箱，而更细的发布组包括 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live`，以及在提供独立包 Telegram 线路时的 `npm-telegram`。

### Vitest

Vitest 箱子是手动的 `CI` 子工作流。手动 CI 故意绕过变更范围选择，并为发布候选强制执行正常测试图：Linux Node 分片、bundled-plugin 分片、channel contracts、Node 22 兼容性、`check`、`check-additional`、构建冒烟、文档检查、Python skills、Windows、macOS、Android，以及 Control UI i18n。

使用此箱来回答“源码树是否通过了完整的正常测试套件？”它不同于发布路径的产品验证。需要保留的证据：

- `Full Release Validation` 摘要中显示已分发的 `CI` 运行 URL
- 针对精确目标 SHA 的绿色 `CI` 运行
- 在调查回归时，CI 作业中的失败或缓慢分片名称
- Vitest 时间制品，例如 `.artifacts/vitest-shard-timings.json`，当一次运行需要性能分析时

只有在发布需要确定性的正常 CI，但不需要 Docker、QA Lab、实时、跨 OS 或包箱时，才直接运行手动 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 箱子位于 `OpenClaw Release Checks` 中，通过
`openclaw-live-and-e2e-checks-reusable.yml` 以及发布模式的
`install-smoke` 工作流实现。它通过打包后的 Docker 环境而不仅仅是源码级测试来验证发布候选。

发布 Docker 覆盖包括：

- full install smoke with the slow Bun global install smoke enabled
- root Dockerfile smoke image preparation/reuse by target SHA, with QR,
  root/gateway, and installer/Bun smoke jobs running as separate install-smoke
  shards
- repository E2E lanes
- release-path Docker chunks: `core`, `package-update-openai`,
  `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`,
  `plugins-runtime-services`,
  `plugins-runtime-install-a`, `plugins-runtime-install-b`,
  `plugins-runtime-install-c`, `plugins-runtime-install-d`,
  `plugins-runtime-install-e`, `plugins-runtime-install-f`,
  `plugins-runtime-install-g`, `plugins-runtime-install-h`,
  `bundled-channels-core`, `bundled-channels-update-a`,
  `bundled-channels-update-discord`, `bundled-channels-update-b`, and
  `bundled-channels-contracts`
- OpenWebUI coverage inside the `plugins-runtime-services` chunk when requested
- split bundled-channel dependency lanes across channel-smoke, update-target,
  and setup/runtime contract chunks instead of one large bundled-channel job
- split bundled plugin install/uninstall lanes
  `bundled-plugin-install-uninstall-0` through
  `bundled-plugin-install-uninstall-23`
- 当发布检查包含实时套件时，提供实时/E2E 提供方套件和 Docker 实时模型覆盖

重跑前请先使用 Docker 制品。发布路径调度器会上传
`.artifacts/docker-tests/`，其中包含线路日志、`summary.json`、`failures.json`、
阶段耗时、调度计划 JSON 和重跑命令。对于定点恢复，请在可复用的 live/E2E 工作流上使用
`docker_lanes=<lane[,lane]>`，而不是重跑所有发布分块。生成的重跑命令会在可用时包含之前的
`package_artifact_run_id` 和准备好的 Docker 镜像输入，因此失败的线路可以复用同一个 tarball 和 GHCR 镜像。

### QA Lab

QA Lab 箱子也是 `OpenClaw Release Checks` 的一部分。它是代理行为和 channel 级发布门禁，独立于 Vitest 和 Docker 的包机制。

发布 QA Lab 覆盖包括：

- 使用 agentic parity pack 将 OpenAI 候选线路与 Opus 4.6 基线进行比较的 mock parity 门禁
- 使用 `qa-live-shared` 环境的快速 live Matrix QA 配置文件
- 使用 Convex CI 凭证租约的 live Telegram QA 线路
- 当发布遥测需要显式本地证明时执行 `pnpm qa:otel:smoke`

使用此箱来回答“该发布在 QA 场景和实时 channel 流程中是否表现正确？”在批准发布时保留 parity、Matrix 和 Telegram 线路的制品 URL。完整的 Matrix 覆盖仍可作为手动分片 QA-Lab 运行，而不是默认的发布关键线路。

### Package

Package 箱子是可安装产品的门禁。它由
`Package Acceptance` 和解析器
`scripts/resolve-openclaw-package-candidate.mjs` 支持。解析器会将候选规范化为 Docker E2E 消费的 `package-under-test` tarball，验证包清单，记录包版本和 SHA-256，并使工作流 harness ref 与包源 ref 分离。

支持的候选来源：

- `source=npm`：`openclaw@beta`、`openclaw@latest`，或精确的 OpenClaw 发布版本
- `source=ref`：使用所选的 `workflow_ref` harness 打包受信任的 `package_ref` 分支、标签或完整提交 SHA
- `source=url`：下载带有必需 `package_sha256` 的 HTTPS `.tgz`
- `source=artifact`：复用由其他 GitHub Actions 运行上传的 `.tgz`

`OpenClaw Release Checks` 使用 `source=ref` 运行 Package Acceptance，
`package_ref=<release-ref>`、`suite_profile=custom`、
`docker_lanes=bundled-channel-deps-compat plugins-offline`，以及
`telegram_mode=mock-openai`。发布路径 Docker 分块覆盖重叠的安装、更新和插件更新线路；Package Acceptance 则针对同一个已解析 tarball 保持制品原生的 bundled-channel 兼容性、离线插件 fixtures 和 Telegram 包 QA。它是 GitHub 原生的替代方案，可替代之前大多数需要 Parallels 的包/更新覆盖。跨 OS 发布检查对于特定于操作系统的上手、安装器和平台行为仍然重要，但包/更新产品验证应优先使用 Package Acceptance。

旧版 package-acceptance 的宽松策略是有意设置时间范围的。到 `2026.4.25` 为止的包可以对已发布到 npm 的元数据缺口使用兼容路径：tarball 中缺失的私有 QA 清单项、缺失的 `gateway install --wrapper`、tarball 派生 git fixture 中缺失的补丁文件、缺失的持久化 `update.channel`、旧版插件安装记录位置、缺失的 marketplace 安装记录持久化，以及 `plugins update` 期间的配置元数据迁移。已发布的 `2026.4.26` 包可能会对已经发布的本地构建元数据时间戳文件发出警告。更晚的包必须满足现代包契约；这些相同的缺口会导致发布验证失败。

当发布问题是关于一个真正可安装的包时，请使用更广泛的 Package Acceptance 配置文件：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product
```

常见的包配置文件：

- `smoke`：快速的包安装/channel/代理、网关网络和配置重载线路
- `package`：不包含 live ClawHub 的安装/更新/插件包契约；这是发布检查的默认值
- `product`：在 `package` 基础上增加 MCP channels、cron/subagent 清理、OpenAI web search 和 OpenWebUI
- `full`：带有 OpenWebUI 的 Docker 发布路径分块
- `custom`：用于定点重跑的精确 `docker_lanes` 列表

对于包候选的 Telegram 证明，请在 Package Acceptance 上启用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier`。工作流会将已解析的 `package-under-test` tarball 传入 Telegram 线路；独立的 Telegram 工作流仍接受已发布的 npm 规范用于发布后检查。

## NPM 工作流输入

`OpenClaw NPM Release` 接受以下由操作者控制的输入：

- `tag`：必需的发布标签，例如 `v2026.4.2`、`v2026.4.2-1`，或
  `v2026.4.2-beta.1`；当 `preflight_only=true` 时，它也可以是当前
  完整的 40 字符 workflow-branch commit SHA，用于仅验证的预检
- `preflight_only`：`true` 表示仅验证/构建/打包，`false` 表示
  实际发布路径
- `preflight_run_id`：在实际发布路径中必需，以便工作流复用
  成功预检运行中准备好的 tarball
- `npm_dist_tag`：发布路径使用的 npm 目标标签；默认为 `beta`

`OpenClaw Release Checks` 接受以下由操作者控制的输入：

- `ref`：要验证的分支、标签或完整 commit SHA。包含密钥的检查
  需要解析后的 commit 可从 OpenClaw 分支或发布标签到达。

规则：

- 稳定版和修正标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 对于 `OpenClaw NPM Release`，只有当
  `preflight_only=true` 时才允许使用完整 commit SHA 输入
- `OpenClaw Release Checks` 和 `Full Release Validation` 始终
  仅用于验证
- 实际发布路径必须使用预检期间使用的相同 `npm_dist_tag`；
  工作流会在发布前继续验证该元数据

## 稳定版 npm 发布流程

发布稳定版 npm 时：

1. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`
   - 在标签尚不存在之前，你可以使用当前完整的 workflow-branch commit
     SHA 对预检工作流进行仅验证的 dry run
2. 对于常规的 beta-first 流程，选择 `npm_dist_tag=beta`；只有在你有意
   直接发布稳定版时才选择 `latest`
3. 在发布分支、发布标签或完整 commit SHA 上运行 `Full Release Validation`，当你希望从一个手动工作流中获得常规 CI 以及实时 prompt cache、Docker、QA Lab、
   Matrix 和 Telegram 覆盖时
4. 如果你有意只需要确定性的常规测试图，则改为在发布引用上运行
   手动 `CI` 工作流
5. 保存成功的 `preflight_run_id`
6. 再次运行 `OpenClaw NPM Release`，设置 `preflight_only=false`、相同的
   `tag`、相同的 `npm_dist_tag`，以及保存的 `preflight_run_id`
7. 如果发布落在 `beta` 上，使用私有的
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流将该稳定版本从 `beta` 提升到 `latest`
8. 如果发布有意直接发布到 `latest`，且 `beta` 应立即跟随相同的稳定构建，
   使用同一个私有工作流将两个 dist-tag 都指向该稳定版本，或者让其计划执行的
   自愈同步稍后再将 `beta` 移动过去

dist-tag 的变更位于私有仓库中以确保安全，因为它仍然
需要 `NPM_TOKEN`，而公共仓库保持仅使用 OIDC 的发布方式。

这样就同时记录并对操作者可见了直接发布路径和 beta-first 提升路径。

如果维护者必须回退到本地 npm 身份验证，请仅在专用的 tmux 会话中运行任何 1Password
CLI（`op`）命令。不要从主 agent shell 直接调用 `op`；将其保留在 tmux 中可以使提示、
警报和 OTP 处理保持可观测，并防止重复的主机警报。

## 公共参考

- [`.github/workflows/full-release-validation.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/full-release-validation.yml)
- [`.github/workflows/package-acceptance.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/package-acceptance.yml)
- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/resolve-openclaw-package-candidate.mjs`](https://github.com/openclaw/openclaw/blob/main/scripts/resolve-openclaw-package-candidate.mjs)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护者在
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中使用私有发布文档作为实际操作手册。

## 相关

- [发布渠道](/install/development-channels)
