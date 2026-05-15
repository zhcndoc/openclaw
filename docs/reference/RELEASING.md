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

1. 从当前 `main` 开始：拉取最新代码，确认目标提交已推送，
   并确认当前 `main` 的 CI 足够绿色，可以从其分支切出。
2. 使用 `/changelog` 根据真实提交历史重写顶部 `CHANGELOG.md` 章节，
   保持条目面向用户，提交、推送，并在分支切出前再次 rebase/pull 一次。
3. 审查以下位置中的发布兼容性记录：
   `src/plugins/compat/registry.ts` 和
   `src/commands/doctor/shared/deprecation-compat.ts`。只有在升级路径仍然被覆盖时才移除已过期的兼容性，或者记录为什么要有意保留它。
4. 从当前 `main` 创建 `release/YYYY.M.D`；不要直接在 `main` 上做常规发布工作。
5. 将目标 tag 所需的每个版本位置都更新后，运行 `pnpm release:prep`。它会按正确顺序刷新插件版本、插件清单、配置 schema、捆绑的通道配置元数据、配置文档基线、插件 SDK 导出，以及插件 SDK API 基线。将任何生成的漂移在打 tag 前提交。然后运行本地确定性预检：
   `pnpm check:test-types`、`pnpm check:architecture`、
   `pnpm build && pnpm ui:build`，以及 `pnpm release:check`。
6. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`。在 tag 还不存在之前，允许使用完整的 40 字符发布分支 SHA 进行仅验证预检。预检会为精确检出的依赖图生成依赖发布证据，并将其存储在 npm 预检产物中。保存成功的 `preflight_run_id`。
7. 使用针对发布分支、tag 或完整提交 SHA 的 `Full Release Validation` 启动所有预发布测试。这是四个大型发布测试盒子的唯一手动入口：Vitest、Docker、QA Lab 和 Package。
8. 如果验证失败，在发布分支上修复，并重新运行能够证明修复的最小失败文件、lane、workflow job、package profile、provider 或 model allowlist。只有当变更范围使先前证据失效时，才重新运行完整的 umbrella。
9. 对于 beta，先打 tag `vYYYY.M.D-beta.N`，然后从匹配的 `release/YYYY.M.D` 分支运行 `OpenClaw Release Publish`。它会验证 `pnpm plugins:sync:check`，并行将所有可发布的插件包发布到 npm，以及同一组发布到 ClawHub，然后在插件 npm 发布成功后立即将已准备好的 OpenClaw npm 预检产物用匹配的 dist-tag 提升。OpenClaw npm publish 子流程成功后，它会根据完整匹配的 `CHANGELOG.md` 章节创建或更新对应的 GitHub release/prerelease 页面。发布到 npm `latest` 的稳定版会成为 GitHub latest release；保留在 npm `beta` 的稳定维护版则使用 GitHub `latest=false` 创建。该 workflow 还会将预检依赖证据作为 `openclaw-<version>-dependency-evidence.zip` 上传到 GitHub release，用于发布后的事故响应。
   在 OpenClaw npm 发布期间，ClawHub 发布可能仍在运行，但 release publish workflow 会立即打印子运行 ID。默认情况下，在派发后它不会等待 ClawHub，因此 OpenClaw npm 可用性不会被较慢的 ClawHub 审批或 registry 工作阻塞；当 ClawHub 必须阻塞 workflow 完成时，设置 `wait_for_clawhub=true`。ClawHub 路径会重试瞬时的 CLI 依赖安装失败，即使某个 preview cell 抖动也会发布通过 preview 的插件，并以每个预期插件版本的 registry 验证结束，使部分发布仍然可见且可重试。发布后，运行
   `pnpm release:verify-beta -- YYYY.M.D-beta.N --openclaw-npm-run <run-id> --plugin-npm-run <run-id> --plugin-clawhub-run <run-id>`
   来用一个命令验证 GitHub prerelease、npm `beta` dist-tag、npm 完整性、已发布安装路径、ClawHub 精确版本、ClawHub 产物，以及子 workflow 结论。若 ClawHub sidecar 只是在可重试的 job 中失败并且应原地重跑，则添加 `--rerun-failed-clawhub`。
   然后对已发布的 `openclaw@YYYY.M.D-beta.N` 或
   `openclaw@beta` 包运行发布后包验收。如果已推送或已发布的预发布需要修复，请切下一个匹配的预发布编号；不要删除或重写旧的预发布。
10. 对于稳定版，只有在已验证的 beta 或 release candidate 具备所需验证证据后才继续。稳定 npm 发布也会通过 `OpenClaw Release Publish`，并通过 `preflight_run_id` 复用成功的预检产物；稳定 macOS 发布就绪还要求在 `main` 上存在已打包的 `.zip`、`.dmg`、`.dSYM.zip` 和更新后的 `appcast.xml`。私有 macOS 发布 workflow 会在发布资产验证通过后自动将已签名的 appcast 发布到公开的 `main`；如果分支保护阻止直接推送，则会打开或更新一个 appcast PR。
11. 发布后，运行 npm 发布后验证器、在需要发布后通道证明时可选运行独立的已发布 npm Telegram E2E、在需要时进行 dist-tag 提升、验证生成的 GitHub release 页面，并运行发布公告步骤。

## 发布预检

- 在发布预检之前运行 `pnpm check:test-types`，这样测试 TypeScript 就能在更快的本地 `pnpm check` 门禁之外得到覆盖
- 在发布预检之前运行 `pnpm check:architecture`，这样更广泛的导入环和架构边界检查就能在更快的本地门禁之外保持绿色
- 在 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，这样 pack 验证步骤所需的 `dist/*` 发布产物和 Control UI bundle 就存在
- 在根版本更新后、打 tag 前运行 `pnpm release:prep`。它会运行每个在版本/配置/API 变更后常会发生漂移的确定性发布生成器：插件版本、插件清单、基础配置 schema、捆绑的通道配置元数据、配置文档基线、插件 SDK 导出，以及插件 SDK API 基线。`pnpm release:check` 会以检查模式重新运行这些守卫，并在运行包发布检查之前一次性报告它发现的每个生成漂移失败。
- 在发布批准前运行手动的 `Full Release Validation` workflow，以便从一个入口启动所有预发布测试盒子。它接受分支、tag 或完整提交 SHA，派发手动 `CI`，并派发 `OpenClaw Release Checks` 以运行安装 smoke、包验收、跨 OS 包检查、QA Lab parity、Matrix 和 Telegram lanes。稳定/默认运行会将完整 live/E2E 和 Docker 发布路径 soak 保留在 `run_release_soak=true` 后；`release_profile=full` 会强制开启 soak。在 `release_profile=full` 和 `rerun_group=all` 下，它还会针对发布检查中的 `release-package-under-test` 产物运行 package Telegram E2E。在发布 beta 后提供 `release_package_spec`，可以在不重新构建发布 tarball 的情况下，在发布检查、Package Acceptance 和 package Telegram E2E 之间复用已发货的 npm 包。仅当 Telegram 应使用与其余发布验证不同的已发布包时，才提供 `npm_telegram_package_spec`。当 Package Acceptance 应使用与发布包规范不同的已发布包时，提供 `package_acceptance_package_spec`。当私有证据报告应证明验证与某个已发布 npm 包相匹配而不强制 Telegram E2E 时，提供 `evidence_package_spec`。
  示例：
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 当你想在发布工作继续进行时为某个包候选获取侧信道证明，请运行手动的 `Package Acceptance` workflow。对 `openclaw@beta`、`openclaw@latest` 或精确的发布版本使用 `source=npm`；使用 `source=ref` 搭配当前 `workflow_ref` harness 打包受信任的 `package_ref` 分支/tag/SHA；对带有必需 SHA-256 的 HTTPS tarball 使用 `source=url`；或者对由另一个 GitHub Actions 运行上传的 tarball 使用 `source=artifact`。该 workflow 会将候选解析为 `package-under-test`，针对该 tarball 复用 Docker E2E 发布调度器，并且可以使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 针对同一个 tarball 运行 Telegram QA。当所选 Docker lanes 包括 `published-upgrade-survivor` 时，包产物就是候选包，而 `published_upgrade_survivor_baseline` 会选择已发布基线。`update-restart-auth` 会把候选包同时作为已安装 CLI 和 `package-under-test`，从而检验候选更新命令的托管重启路径。
  示例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  常用 profile：
  - `smoke`：安装/通道/agent、gateway 网络和 config reload lanes
  - `package`：无 OpenWebUI 或 live ClawHub 的原生包/update/restart/plugin lanes
  - `product`：package profile 外加 MCP channels、cron/subagent cleanup、OpenAI web search 和 OpenWebUI
  - `full`：带 OpenWebUI 的 Docker 发布路径 chunks
  - `custom`：用于聚焦重跑的精确 `docker_lanes` 选择
- 当你只需要发布候选的完整常规 CI 覆盖时，直接运行手动的 `CI` workflow。手动 CI dispatch 会绕过变更范围并强制运行 Linux Node shards、捆绑插件 shards、通道契约、Node 22 兼容性、`check`、`check-additional`、build smoke、docs 检查、Python skills、Windows、macOS、Android 和 Control UI i18n lanes。
  示例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 在验证发布遥测时运行 `pnpm qa:otel:smoke`。它会通过本地 OTLP/HTTP receiver 运行 QA-lab，并在不需要 Opik、Langfuse 或其他外部 collector 的情况下，验证导出的 trace span 名称、受限属性，以及内容/标识符脱敏。
- 在每次带 tag 的发布前运行 `pnpm release:check`
- `OpenClaw NPM Release` 预检会在打包 npm tarball 之前生成依赖发布证据。npm advisory 漏洞门禁是发布阻断项。传递性 manifest 风险、依赖所有权/安装面，以及依赖变更报告仅作为发布证据。依赖变更报告会将发布候选与上一个可达的发布 tag 进行比较。
- 预检会将依赖证据上传为 `openclaw-release-dependency-evidence-<tag>`，并且还会将其嵌入到已准备好的 npm 预检产物内的 `dependency-evidence/` 下。真实发布路径会复用该预检产物，然后将相同证据作为 `openclaw-<version>-dependency-evidence.zip` 附加到 GitHub release。
- 在 tag 存在后，运行 `OpenClaw Release Publish` 执行变更性的发布序列。从 `release/YYYY.M.D`（或在发布可从 `main` 到达的 tag 时从 `main`）派发它，传入 release tag 和成功的 OpenClaw npm `preflight_run_id`，并保持默认插件发布范围 `all-publishable`，除非你明确在执行聚焦修复。该 workflow 会串行化插件 npm 发布、插件 ClawHub 发布和 OpenClaw npm 发布，以确保核心包不会在外部化插件之前发布。
- 发布检查现在在单独的手动 workflow 中运行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 在发布批准前还会运行 QA Lab mock parity lane 以及快速 live Matrix profile 和 Telegram QA lane。live lanes 使用 `qa-live-shared` 环境；Telegram 还使用 Convex CI 凭据租约。当你需要完整的 Matrix 传输、媒体和 E2EE 清单并行运行时，运行手动的 `QA-Lab - All Lanes` 工作流，并设置 `matrix_profile=all` 和 `matrix_shards=true`。
- 跨操作系统安装和升级运行时验证是公开的 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它们会直接调用可复用工作流
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这样拆分是有意为之：保持真实的 npm 发布路径短、可确定、并以产物为中心，而较慢的 live 检查保持在自己的 lane 中，这样它们不会拖延或阻塞发布
- 含有密钥的发布检查应通过 `Full Release Validation` 调度，或从 `main`/release 工作flow ref 调度，以便工作流逻辑和密钥保持受控
- `OpenClaw Release Checks` 只要解析出的提交可从 OpenClaw 分支或 release tag 到达，就接受分支、tag 或完整提交 SHA
- `OpenClaw NPM Release` 仅验证预检也接受当前完整的 40 字符 workflow-branch 提交 SHA，而不要求已推送的 tag
- 该 SHA 路径仅用于验证，不能提升为真实发布
- 在 SHA 模式下，工作flow 仅为包元数据检查合成 `v<package.json version>`；真实发布仍然需要真实的 release tag
- 两个 workflow 都将真实发布和提升路径保留在 GitHub 托管 runner 上，而非变更性的验证路径可以使用更大的 Blacksmith Linux runner
- 该 workflow 运行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` workflow secrets
- npm 发布预检不再等待单独的发布检查 lane
- 在本地给候选 release 打 tag 之前，运行
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`。该辅助工具会按在 GitHub publish workflow 启动前捕获常见审批阻塞错误的顺序，运行快速发布守卫、插件 npm/ClawHub 发布检查、build、UI build，以及 `release:openclaw:npm:check`。
- 在批准前运行
  `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction tag）
- 在 npm publish 后，运行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/correction version）以在新的临时前缀中验证已发布 registry 安装路径
- 在 beta 发布后，运行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  以使用共享的已租用 Telegram 凭据池，验证已安装包入门、Telegram 设置以及针对已发布 npm 包的真实 Telegram E2E。维护者在本地单次执行时可以省略 Convex 变量，并直接传入三个 `OPENCLAW_QA_TELEGRAM_*` 环境凭据。
- 要从维护者机器运行完整的发布后 beta smoke，请使用 `pnpm release:beta-smoke -- --beta betaN`。该辅助工具会运行 Parallels npm update/fresh-target 验证，派发 `NPM Telegram Beta E2E`，轮询精确的 workflow 运行，下载产物，并打印 Telegram 报告。
- 维护者可以通过手动的 `NPM Telegram Beta E2E` workflow 从 GitHub Actions 运行相同的发布后检查。它刻意只支持手动触发，不会在每次合并时运行。
- 维护者发布自动化现在使用 preflight-then-promote：
  - 真实 npm 发布必须通过成功的 npm `preflight_run_id`
  - 真实 npm 发布必须从与成功预检运行相同的 `main` 或 `release/YYYY.M.D` 分支派发
  - 稳定 npm 发布默认到 `beta`
  - 稳定 npm 发布可通过 workflow input 显式指定 `latest`
  - 基于 token 的 npm dist-tag 变更现在出于安全原因位于
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    ，因为 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，而公开仓库保持仅 OIDC 发布
  - 公开的 `macOS Release` 仅用于验证；当一个 tag 只存在于某个 release 分支上，但 workflow 从 `main` 派发时，设置
    `public_release_branch=release/YYYY.M.D`
  - 真实的私有 mac 发布必须通过成功的私有 mac
    `preflight_run_id` 和 `validate_run_id`
  - 真实发布路径会提升已准备好的产物，而不是再次重建它们
- 对于像 `YYYY.M.D-N` 这样的稳定修正版发布，发布后验证器
  还会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，
  因此发布修正不会悄悄让旧的全局安装仍停留在基础稳定载荷上
- npm 发布预检会在默认失败关闭，除非 tarball 同时包含
  `dist/control-ui/index.html` 和一个非空的 `dist/control-ui/assets/` 载荷，
  这样我们就不会再次发布一个空的浏览器仪表盘
- 发布后验证也会检查已发布插件入口点和包元数据是否存在于已安装的 registry 布局中。若某个发布缺少插件运行时载荷，则发布后验证器会失败，并且不能提升到 `latest`。
- `pnpm test:install:smoke` 还会对候选更新 tarball 强制执行 npm pack 的 `unpackedSize` 预算，因此安装器 e2e 会在发布发布路径之前捕获意外的包体积膨胀
- 如果发布工作涉及 CI planning、extension timing manifests 或 extension test matrices，请在批准前重新生成并审查 planner 所拥有的
  `plugin-prerelease-extension-shard` matrix 输出，来源于
  `.github/workflows/plugin-prerelease.yml`，这样发布说明就不会描述过时的 CI 布局
- 稳定 macOS 发布就绪还包括 updater surfaces：
  - GitHub release 最终必须包含已打包的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 在发布后必须指向新的稳定 zip；私有 macOS 发布 workflow 会自动提交它，或者在直接推送被阻止时打开一个 appcast PR
  - 打包后的应用必须保持非 debug 的 bundle id、非空的 Sparkle feed URL，以及不低于该发布版本规范 Sparkle build floor 的 `CFBundleVersion`

## 发布测试箱

`Full Release Validation` 是操作员从一个入口启动所有预发布测试的方式。对于在快速推进分支上的已固定提交证明，请使用辅助工具，让每个子工作流都从一个固定在目标 SHA 的临时分支运行：

```bash
pnpm ci:full-release --sha <full-sha>
```

该辅助工具会推送 `release-ci/<sha>-...`，从该分支分发 `Full Release Validation` 并设置 `ref=<sha>`，验证每个子工作流的 `headSha` 是否与目标匹配，然后删除临时分支。这样可以避免意外证明一个更新的 `main` 子运行。

对于发布分支或标签验证，请从受信任的 `main` 工作流 ref 运行，并将发布分支或标签作为 `ref` 传入：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

工作流会解析目标 ref，分发手动 `CI` 并设置 `target_ref=<release-ref>`，分发 `OpenClaw Release Checks`，为面向包的检查准备一个父级 `release-package-under-test` 制品，并在 `release_profile=full` 且 `rerun_group=all`，或者设置了 `release_package_spec` 或 `npm_telegram_package_spec` 时，分发独立的包 Telegram E2E。然后 `OpenClaw Release Checks` 会展开为安装冒烟测试、跨 OS 发布检查、在启用 soak 时的实时/E2E Docker 发布路径覆盖、带 Telegram 包 QA 的 Package Acceptance、QA Lab 等价性、实时 Matrix 和实时 Telegram。只有当 `Full Release Validation` 摘要显示 `normal_ci` 和 `release_checks` 都成功时，完整运行才算可接受。在 full/all 模式下，`npm_telegram` 子项也必须成功；在 full/all 之外，除非提供了已发布的 `release_package_spec` 或 `npm_telegram_package_spec`，否则它会被跳过。最终的 verifier 摘要会包含每个子运行的最慢作业表，因此发布负责人无需下载日志就能看到当前关键路径。
参见 [Full release validation](/reference/full-release-validation)，了解完整阶段矩阵、确切的工作流作业名称、stable 与 full 配置文件差异、制品以及聚焦重跑句柄。
子工作流由运行 `Full Release Validation` 的受信任 ref 分发，通常是 `--ref main`，即使目标 `ref` 指向更旧的发布分支或标签。没有单独的 Full Release Validation workflow-ref 输入；通过选择工作流运行 ref 来选择受信任的 harness。
不要在移动中的 `main` 上使用 `--ref main -f ref=<sha>` 来精确证明某个提交；原始提交 SHA 不能作为工作流 dispatch ref，因此请使用 `pnpm ci:full-release --sha <sha>` 来创建固定的临时分支。

使用 `release_profile` 来选择实时/提供方覆盖范围：

`OpenClaw Release Checks` 使用受信任的工作流 ref 先将目标 ref 解析一次为 `release-package-under-test`，并在跨 OS、Package Acceptance 和启用 soak 时的发布路径 Docker 检查中复用该制品。这样所有面向包的测试箱都使用同一份字节，并避免重复构建包。在 beta 已经发布到 npm 后，设置 `release_package_spec=openclaw@YYYY.M.D-beta.N`，这样发布检查会一次性下载已发布包，从 `dist/build-info.json` 中提取其构建源 SHA，并在跨 OS、Package Acceptance、发布路径 Docker 和包 Telegram 线路中复用该制品。跨 OS 的 OpenAI 安装冒烟测试会在仓库/组织变量设置时使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则使用 `openai/gpt-5.4`，因为这条线路验证的是包安装、上手引导、网关启动以及一次实时代理回合，而不是对最慢默认模型进行基准测试。更广泛的实时提供方矩阵仍然是按模型覆盖的地方。

在 `stable` 下，当发布阻断线路都已通过且你希望在晋升前进行完整的实时/E2E、Docker 发布路径和有界已发布升级幸存者扫描时，请使用 `run_release_soak=true`。该扫描覆盖最新四个 stable 包，以及固定的 `2026.4.23` 和 `2026.5.2`
基线，再加上更早的 `2026.4.15` 覆盖，去除重复基线后，每个基线都会拆分到各自的 Docker 运行器作业中。`full` 意味着
`run_release_soak=true`。

`OpenClaw Release Checks` 使用受信任的工作流 ref 先将目标 ref 解析一次为 `release-package-under-test`，并在跨 OS、Package Acceptance 和发布路径 Docker 检查中复用该制品。这样所有面向包的测试箱都使用同一份字节，并避免重复构建包。在 beta 已经发布到 npm 后，设置 `release_package_spec=openclaw@YYYY.M.D-beta.N`，这样发布检查会一次性下载已发货的包，从 `dist/build-info.json` 中提取其构建源 SHA，并在跨 OS、Package Acceptance、发布路径 Docker 和包 Telegram 线路中复用该制品。跨 OS 的 OpenAI 安装冒烟测试会在仓库/组织变量设置时使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则使用 `openai/gpt-5.4`，因为这条线路验证的是包安装、上手引导、网关启动以及一次实时代理回合，而不是对最慢默认模型进行基准测试。更广泛的实时提供方矩阵仍然是按模型覆盖的地方。

根据发布阶段使用这些变体：

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
  -f release_profile=full \
  -f release_package_spec=openclaw@YYYY.M.D-beta.N \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

不要在首次针对某个定点修复重跑时使用完整大总包。如果某个箱子失败，请在下次验证时使用失败的子工作流、作业、Docker 线路、包配置文件、模型提供方或 QA 线路。只有当修复改动了共享的发布编排，或使之前所有箱子的证据过期时，才再次运行完整大总包。大总包的最终 verifier 会重新检查记录的子工作流运行 id，因此在某个子工作流成功重跑后，只重跑失败的 `Verify full validation` 父作业即可。

对于有界恢复，请将 `rerun_group` 传给总入口。`all` 是真正的发布候选运行，`ci` 只运行正常 CI 子项，`plugin-prerelease` 只运行仅发布插件子项，`release-checks` 运行所有发布箱，而更细的发布分组是 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。聚焦的 `npm-telegram` 重跑需要 `release_package_spec` 或 `npm_telegram_package_spec`；在 `release_profile=full` 下的 full/all 运行会使用 release-checks 包制品。聚焦的跨 OS 重跑可以添加 `cross_os_suite_filter=windows/packaged-upgrade` 或其他 OS/套件过滤器。QA 发布检查失败只是建议性的；仅 QA 失败不会阻止发布验证。

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

- 启用慢速 Bun 全局安装冒烟测试的完整安装冒烟测试
- 按目标 SHA 进行的 root Dockerfile 冒烟镜像准备/复用，并将 QR、
  root/gateway 以及 installer/Bun 冒烟作业作为独立的 install-smoke
  分片运行
- 仓库 E2E 线路
- 发布路径 Docker 分块：`core`、`package-update-openai`、
  `package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、
  `plugins-runtime-services`、
  `plugins-runtime-install-a`、`plugins-runtime-install-b`、
  `plugins-runtime-install-c`、`plugins-runtime-install-d`、
  `plugins-runtime-install-e`、`plugins-runtime-install-f`、
  `plugins-runtime-install-g` 和 `plugins-runtime-install-h`
- 当请求时，在 `plugins-runtime-services` 分块中包含 OpenWebUI 覆盖
- 拆分的 bundled 插件安装/卸载线路
  `bundled-plugin-install-uninstall-0` 到
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

- 使用 agentic parity pack 将 OpenAI 候选线路与 Opus 4.6
  基线进行比较的 mock parity 线路
- 使用 `qa-live-shared` 环境的快速实时 Matrix QA 配置文件
- 使用 Convex CI 凭据租约的实时 Telegram QA 线路
- 当发布遥测需要显式本地证明时使用 `pnpm qa:otel:smoke`

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

`OpenClaw Release Checks` 使用 `source=artifact`、已准备好的发布包制品、`suite_profile=custom`、
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`，
`telegram_mode=mock-openai` 运行 Package Acceptance。Package Acceptance 会用同一个解析后的 tarball 覆盖迁移、更新、已配置认证的更新重启、实时 ClawHub 技能安装、过期插件依赖清理、离线插件
fixture、插件更新以及 Telegram 包 QA。阻断发布检查使用默认的最新已发布包基线；`run_release_soak=true` 或
`release_profile=full` 会扩展到从 `2026.4.23` 到 `latest` 的每个已发布稳定版 npm 基线，再加上已报告问题的 fixture。对于已发货的候选，请使用 `source=npm` 运行 Package Acceptance；对于发布前基于 SHA 的本地 npm tarball，请使用
`source=ref`/`source=artifact`。它是 GitHub 原生的
替代方案，替代了此前大部分需要 Parallels 的 package/update 覆盖。跨 OS 发布检查对于与操作系统相关的上手引导、安装器和平台行为仍然重要，但 package/update 产品验证应优先使用 Package Acceptance。

更新和插件验证的权威检查清单是
[Testing updates and plugins](/help/testing-updates-plugins)。在决定哪个本地、Docker、Package Acceptance 或 release-check 线路能证明插件安装/更新、doctor 清理或已发布包迁移变更时，请使用它。对每个稳定版 `2026.4.23+` 包进行穷尽式已发布更新迁移，是一个单独的手动 `Update Migration` 工作流，不属于 Full Release CI。

旧版 package-acceptance 的宽松规则已明确限定时间范围。到
`2026.4.25` 为止的包可以对已发布到 npm 的元数据缺口使用兼容路径：tarball 中缺少的私有 QA 清单条目、缺少的
`gateway install --wrapper`、tarball 派生 git fixture 中缺少的 patch 文件、缺少的持久化 `update.channel`、旧版插件 install-record 位置、缺少的 marketplace install-record 持久化，以及在 `plugins update` 期间的配置元数据迁移。已发布的 `2026.4.26` 包可以对已经发货的本地构建元数据戳文件发出警告。更晚的包必须满足现代包契约；这些相同的缺口会导致发布验证失败。

当发布问题是关于一个真正可安装的包时，请使用更广泛的 Package Acceptance 配置文件：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f published_upgrade_survivor_baseline=openclaw@2026.4.26
```

常见的包配置文件：

- `smoke`: 快速的包安装/通道/代理、网关网络和配置
  重新加载线路
- `package`: 安装/更新/重启/插件包契约以及实时 ClawHub
  技能安装证明；这是 release-check 默认值
- `product`: `package` 再加上 MCP 通道、cron/subagent 清理、OpenAI Web
  搜索和 OpenWebUI
- `full`: 带有 OpenWebUI 的 Docker 发布路径分块
- `custom`: 用于聚焦重跑的精确 `docker_lanes` 列表

对于包候选的 Telegram 证明，请在 Package Acceptance 上启用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier`。工作流会将已解析的 `package-under-test` tarball 传入 Telegram 线路；独立的 Telegram 工作流仍接受已发布的 npm 规范用于发布后检查。

## 发布自动化

`OpenClaw Release Publish` 是正常的可变更发布入口。它按发布所需顺序编排受信任发布者工作流：

1. 检出发布标签并解析其 commit SHA。
2. 验证该标签可从 `main` 或 `release/*` 到达。
3. 运行 `pnpm plugins:sync:check`。
4. 以 `publish_scope=all-publishable` 和
   `ref=<release-sha>` 触发 `Plugin NPM Release`。
5. 使用相同的范围和 SHA 触发 `Plugin ClawHub Release`。
6. 使用发布标签、npm dist-tag 和已保存的 `preflight_run_id`
   触发 `OpenClaw NPM Release`。

Beta 发布示例：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

发布稳定版到默认 beta dist-tag：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

直接提升稳定版到 `latest` 是显式的：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

仅将较低层级的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流用于有针对性的修复或重新发布工作。对于选定插件的修复，将 `plugin_publish_scope=selected` 和 `plugins=@openclaw/name` 传给 `OpenClaw Release Publish`；或者当 OpenClaw 包不能发布时，直接触发子工作流。

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

`OpenClaw Release Publish` 接受以下由操作者控制的输入：

- `tag`: 必需的发布标签；必须已存在
- `preflight_run_id`: 成功的 `OpenClaw NPM Release` 预检运行 ID；
  当 `publish_openclaw_npm=true` 时必需
- `npm_dist_tag`: OpenClaw 包的 npm 目标标签
- `plugin_publish_scope`: 默认为 `all-publishable`；仅在
  有针对性的修复工作中使用 `selected`
- `plugins`: 当 `plugin_publish_scope=selected` 时，以逗号分隔的
  `@openclaw/*` 包名
- `publish_openclaw_npm`: 默认为 `true`；仅在将该
  工作流用作仅插件修复编排器时设为 `false`
- `wait_for_clawhub`: 默认为 `false`，因此 npm 可用性不会被
  ClawHub sidecar 阻塞；仅在工作流完成必须包含
  ClawHub 完成时设为 `true`

`OpenClaw Release Checks` 接受以下由操作者控制的输入：

- `ref`: 要验证的 branch、tag 或完整 commit SHA。涉及密钥的检查
  需要解析后的 commit 能够从 OpenClaw 分支或发布标签到达。
- `run_release_soak`：在稳定版/默认发布检查上启用完整的 live/E2E、Docker 发布路径，以及
  所有自发布以来升级幸存者的 soak 测试。它会被 `release_profile=full`
  强制开启。

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

1. 运行 `OpenClaw NPM Release`，并设置 `preflight_only=true`
   - 在标签尚不存在之前，你可以使用当前完整的 workflow-branch commit
     SHA 对预检工作流进行仅验证的 dry run
2. 选择 `npm_dist_tag=beta` 以使用常规的先 beta 流程，或仅在你有意直接发布稳定版时使用 `latest`
3. 在发布分支、发布标签或完整 commit SHA 上运行 `Full Release Validation`，当你希望通过一个手动工作流获得常规 CI 以及实时提示缓存、Docker、QA Lab、Matrix 和 Telegram 覆盖时
4. 如果你有意只需要确定性的常规测试图，则改为在发布引用上运行手动 `CI` 工作流
5. 保存成功的 `preflight_run_id`
6. 使用相同的 `tag`、相同的 `npm_dist_tag` 和已保存的 `preflight_run_id` 运行 `OpenClaw Release Publish`；它会先将外部化插件发布到 npm 和 ClawHub，然后再提升 OpenClaw npm 包
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
