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

- Stable release version: `YYYY.M.PATCH`
  - Git tag: `vYYYY.M.PATCH`
- Stable correction release version: `YYYY.M.PATCH-N`
  - Git tag: `vYYYY.M.PATCH-N`
- Beta prerelease version: `YYYY.M.PATCH-beta.N`
  - Git tag: `vYYYY.M.PATCH-beta.N`
- 不要对月份或 patch 进行零填充
- 自 2026 年 6 月发布流程更新起，第三个组件是按月 patch 计数器，而不是日历日期。更新前的 tag 和 npm 版本会保留其现有名称并继续有效；发布自动化仍会按年份、月份、patch、通道，以及预发布或修正编号来比较它们。
- npm 版本不可变更。如果某个 beta tag 已经发布，不要删除、重新发布或复用它；改为切下一个 beta 编号或下一个月度 patch。由于 `2026.6.5-beta.1` 已在过渡期间发布，2026 年 6 月的发布列车必须使用 patch `5` 或更高。不要将新的 2026 年 6 月 stable 或 beta 列车发布为 `2026.6.2`、`2026.6.3` 或 `2026.6.4`。
- `latest` 表示当前已晋升的稳定 npm 发布
- `beta` 表示当前的 beta 安装目标
- Stable 和 stable correction 发布默认发布到 npm `beta`；发布操作员可以显式将目标设为 `latest`，或稍后晋升经过验证的 beta 构建
- 每个稳定版 OpenClaw 发布都会同时交付 npm 包、macOS 应用和签名的 Windows Hub 安装程序；beta 发布通常先验证并发布 npm/package 路径，而原生应用构建/签名/notarize/晋升则保留给 stable，除非明确要求

## 发布节奏

- 发布遵循先 beta 后 stable
- 只有在最新 beta 经验证后，stable 才会跟进
- 维护者通常从基于当前 `main` 创建的 `release/YYYY.M.PATCH` 分支切发布，因此发布验证和修复不会阻塞 `main` 上的新开发
- 如果 beta tag 已被推送或发布且需要修复，维护者应切下一个 `-beta.N` tag，而不是删除或重建旧的 beta tag
- 详细的发布流程、审批、凭据和恢复说明仅限维护者可见

## 发布操作员检查清单

此检查清单是发布流程的公开形式。私有凭据、签名、notarization、dist-tag 恢复和紧急回滚细节保留在仅维护者可见的发布手册中。

1. 从当前 `main` 开始：拉取最新代码，确认目标提交已推送，并确认当前 `main` 的 CI 已足够稳定，可以从它分支。
2. 根据自上一个可达发布 tag 以来合并的 PR 和所有直接提交生成 `CHANGELOG.md` 顶部条目。保持条目面向用户，去重重叠的 PR/直接提交条目，提交重写内容，推送，然后在分支前再 rebase/pull 一次。
3. 查看 `src/plugins/compat/registry.ts` 和 `src/commands/doctor/shared/deprecation-compat.ts` 中的发布兼容性记录。只有在升级路径仍然被覆盖时才移除过期兼容性，或者记录其被有意保留的原因。
4. 从当前 `main` 创建 `release/YYYY.M.PATCH`；不要直接在 `main` 上做常规发布工作。
5. 为目标 tag 更新所有所需的版本位置，然后运行 `pnpm release:prep`。它会按正确顺序刷新插件版本、插件清单、配置 schema、捆绑的 channel config 元数据、配置文档基线、插件 SDK 导出以及插件 SDK API 基线。将任何生成的漂移在打 tag 前提交。然后运行本地确定性预检：`pnpm check:test-types`、`pnpm check:architecture`、`pnpm build && pnpm ui:build` 和 `pnpm release:check`。
6. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`。在 tag 存在之前，允许使用完整的 40 字符 release-branch SHA 进行仅验证用预检。该预检会为精确检出的依赖图生成依赖发布证据，并将其存入 npm 预检制品中。保存成功的 `preflight_run_id`。
7. 为发布分支、tag 或完整 commit SHA 启动所有预发布测试，使用 `Full Release Validation`。这是四个大型发布测试框的唯一手动入口：Vitest、Docker、QA Lab 和 Package。
8. 如果验证失败，在 release 分支上修复，并重新运行最小范围内失败的文件、lane、workflow job、package profile、provider 或 model allowlist，以证明修复有效。只有当变更范围使之前的证据失效时，才重新运行完整的总包。
9. 对于 beta，先打 tag `vYYYY.M.PATCH-beta.N`，然后从匹配的 `release/YYYY.M.PATCH` 分支运行 `pnpm release:candidate -- --tag vYYYY.M.PATCH-beta.N`。该 helper 会运行本地生成发布检查，调度或验证完整发布验证和 npm 预检证据，运行 Parallels 和 Telegram package proof，记录插件 npm 和 ClawHub 计划，并且只有在证据包为绿色后才打印精确的 `OpenClaw Release Publish` 命令。`OpenClaw Release Publish` 会并行将选定或所有可发布的插件包发布到 npm，并将同样的一组发布到 ClawHub，然后在插件 npm 发布成功后，立即用匹配的 dist-tag 晋升已准备好的 OpenClaw npm 预检制品。
   在 OpenClaw npm publish 子流程成功后，它会根据完整匹配的 `CHANGELOG.md` 条目创建或更新相应的 GitHub release/prerelease 页面。发布到 npm `latest` 的 stable 版本会成为 GitHub latest release；保留在 npm `beta` 上的稳定维护版本会以 GitHub `latest=false` 创建。该工作流还会将预检依赖证据作为 `openclaw-<version>-dependency-evidence.zip` 上传到 GitHub release，供发布后事件响应使用。发布工作流会立即打印子 run ID，为工作流 token 被允许批准的发布环境 gate 自动审批，汇总失败的子 job 及其日志尾部，在 OpenClaw npm publish 成功后尽快关闭 GitHub release 和依赖证据，在 OpenClaw npm 正在发布时等待 ClawHub，然后运行 `pnpm release:verify-beta` 并上传 postpublish 证据，涵盖 GitHub release、npm package、所选插件 npm 包、所选 ClawHub 包、子工作流 run ID，以及可选的 NPM Telegram run ID。ClawHub 路径会重试临时性的 CLI 依赖安装失败，即使某个 preview 单元 flaky 也会发布通过预览的插件，并以每个预期插件版本的注册表验证结束，以便部分发布保持可见且可重试。然后针对已发布的 `openclaw@YYYY.M.PATCH-beta.N` 或 `openclaw@beta` 包运行发布后包验收。如果已推送或已发布的预发布需要修复，则切下一个匹配的预发布编号；不要删除或重写旧的预发布。
10. 对于 stable，只有在经过验证的 beta 或 release candidate 具备所需验证证据后才继续。稳定版 npm 发布也通过 `OpenClaw Release Publish` 完成，重用成功的预检制品 `preflight_run_id`；稳定版 macOS 发布就绪还要求在 `main` 上存在打包好的 `.zip`、`.dmg`、`.dSYM.zip` 和更新后的 `appcast.xml`。macOS 发布工作流会在发布资产验证通过后自动将已签名的 appcast 发布到公共 `main`；如果分支保护阻止直接 push，它会打开或更新一个 appcast PR。稳定版 Windows Hub 就绪要求在 OpenClaw GitHub release 上存在已签名的 `OpenClawCompanion-Setup-x64.exe`、`OpenClawCompanion-Setup-arm64.exe` 和 `OpenClawCompanion-SHA256SUMS.txt` 资产；在匹配的 `openclaw/openclaw-windows-node` release 通过其签名工作流后，用 `Windows Node Release` 工作流将它们晋升。
11. 发布后，运行 npm post-publish 验证器、在需要发布后通道证据时运行可选的独立已发布 npm Telegram E2E、在需要时进行 dist-tag 晋升、验证生成的 GitHub release 页面，并执行发布公告步骤。

## 发布预检

- 在发布预检前运行 `pnpm check:test-types`，以便 test TypeScript 在更快的本地 `pnpm check` gate 之外也受到覆盖
- 在发布预检前运行 `pnpm check:architecture`，以便更广泛的导入循环和架构边界检查在更快的本地 gate 之外保持绿色
- 在 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，以便打包验证步骤存在预期的 `dist/*` 发布资产和 Control UI bundle
- 在打 tag 前、完成根版本提升后运行 `pnpm release:prep`。它会运行每个在版本/config/API 变更后常见漂移的确定性发布生成器：插件版本、插件清单、基础 config schema、捆绑的 channel config 元数据、配置文档基线、插件 SDK 导出，以及插件 SDK API 基线。`pnpm release:check` 会以检查模式重新运行这些防线，并在运行包发布检查前一次性报告它发现的所有生成漂移失败。
- 默认情况下，插件版本同步会将官方插件包版本和现有的 `openclaw.compat.pluginApi` 下限更新为 OpenClaw 发布版本。将该字段视为插件 SDK/runtime API 下限，而不只是包版本的拷贝：对于刻意保持与旧 OpenClaw host 兼容的仅插件发布，请将下限保持在最旧受支持 host API，并在插件发布证明中记录该选择。
- 在发布批准前运行手动的 `Full Release Validation` 工作流，以便从一个入口启动所有预发布测试框。它接受分支、tag 或完整 commit SHA，调度手动 `CI`，并调度 `OpenClaw Release Checks`，用于安装 smoke、package 验收、跨 OS 包检查、QA Lab parity、Matrix 和 Telegram lanes。稳定/默认运行会将完整的 live/E2E 和 Docker 发布路径 soak 保留在 `run_release_soak=true` 之后；`release_profile=full` 会强制开启 soak。在 `release_profile=full` 且 `rerun_group=all` 时，它还会对来自 release checks 的 `release-package-under-test` 资产运行 package Telegram E2E。提供 `release_package_spec` 以在发布 beta 后复用已发布的 npm 包，跨 release checks、Package Acceptance 和 package Telegram E2E，而无需重建 release tarball。仅在 Telegram 应该使用与其余发布验证不同的已发布包时提供 `npm_telegram_package_spec`。当 Package Acceptance 需要使用与 release package spec 不同的包时，提供 `package_acceptance_package_spec`。当发布证据报告应证明验证与某个已发布 npm 包一致，而不强制 Telegram E2E 时，提供 `evidence_package_spec`。示例：`gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.PATCH`
- 当你想在发布工作继续进行时，为某个 package candidate 获取侧边通道证据，请运行手动的 `Package Acceptance` 工作流。对 `openclaw@beta`、`openclaw@latest` 或精确 release 版本使用 `source=npm`；对使用当前 `workflow_ref` harness 打包可信的 `package_ref` 分支/tag/SHA 使用 `source=ref`；对带有必需 SHA-256 和严格公共 URL 策略的公共 HTTPS tarball 使用 `source=url`；对使用必需 `trusted_source_id` 和 SHA-256 的命名可信源策略使用 `source=trusted-url`；或对由另一个 GitHub Actions 运行上传的 tarball 使用 `source=artifact`。该工作流会将候选解析为 `package-under-test`，复用针对该 tarball 的 Docker E2E release scheduler，并可使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 对同一 tarball 运行 Telegram QA。当所选 Docker lanes 包含 `published-upgrade-survivor` 时，package 资产就是候选包，而 `published_upgrade_survivor_baseline` 选择已发布基线。`update-restart-auth` 会将候选包同时用作已安装 CLI 和 package-under-test，从而测试候选更新命令的受管重启路径。
  示例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  常见配置：
  - `smoke`：安装/通道/agent、gateway network 和 config reload lanes
  - `package`：artifact-native 的 package/update/restart/plugin lanes，不含 OpenWebUI 或 live ClawHub
  - `product`：package profile 加上 MCP channels、cron/subagent cleanup、OpenAI web search 和 OpenWebUI
  - `full`：带 OpenWebUI 的 Docker 发布路径分块
  - `custom`：精确的 `docker_lanes` 选择，用于针对性重跑
- 当你只需要发布候选的完整常规 CI 覆盖时，直接运行手动 `CI` 工作流。手动 CI 调度会绕过 changed scoping，并强制运行 Linux Node shards、bundled-plugin shards、plugin 和 channel contract shards、Node 22 兼容性、`check-*`、`check-additional-*`、built-artifact smoke checks、docs checks、Python skills、Windows、macOS、Android 和 Control UI i18n lanes。
  示例：`gh workflow run ci.yml --ref release/YYYY.M.PATCH`
- 在验证发布 telemetry 时运行 `pnpm qa:otel:smoke`。它通过本地 OTLP/HTTP receiver 让 QA-lab 运行，并验证 trace、metric 和 log 导出，以及受限的 trace attributes 和内容/标识符脱敏，而无需 Opik、Langfuse 或其他外部 collector。
- 在验证 collector 兼容性时运行 `pnpm qa:otel:collector-smoke`。它会先通过真实的 OpenTelemetry Collector Docker 容器路由相同的 QA-lab OTLP 导出，然后再执行本地 receiver 断言。
- 在验证受保护的 Prometheus scraping 时运行 `pnpm qa:prometheus:smoke`。它会让 QA-lab 运行，拒绝未经认证的 scrape，并验证发布关键的 metric families 不包含 prompt 内容、原始标识符、auth token 和本地路径。
- 当你希望将源码检出的 OpenTelemetry 和 Prometheus smoke lanes 连续运行时，运行 `pnpm qa:observability:smoke`。
- 在每次带 tag 的发布前运行 `pnpm release:check`
- `OpenClaw NPM Release` 预检会在打包 npm tarball 之前生成依赖发布证据。npm advisory 漏洞门禁是阻断发布的。传递依赖清单风险、依赖归属/安装面和依赖变更报告仅作为发布证据。依赖变更报告会将发布候选与上一个可达发布 tag 进行比较。
- 预检会将依赖证据上传为 `openclaw-release-dependency-evidence-<tag>`，并将其嵌入到准备好的 npm 预检制品中的 `dependency-evidence/` 下。真实发布路径会复用该预检制品，然后把相同证据作为 `openclaw-<version>-dependency-evidence.zip` 附加到 GitHub release。
- 在 tag 存在后，使用 `OpenClaw Release Publish` 执行变更性的发布序列。从 `release/YYYY.M.PATCH`（或在发布可从 `main` 到达的 tag 时从 `main`）调度它，传入 release tag 和成功的 OpenClaw npm `preflight_run_id`，并在你刻意执行有针对性的修复时保持默认插件发布范围 `all-publishable`。该工作流会串行执行插件 npm 发布、插件 ClawHub 发布和 OpenClaw npm 发布，以确保核心包不会先于其外部化插件发布。
- 在相应的 `openclaw/openclaw-windows-node` release 存在后，为稳定版运行手动 `Windows Node Release` 工作流。它会从 companion 仓库下载已签名的 Windows Hub 安装程序，在 Windows runner 上验证其 Authenticode 签名，写入 SHA-256 清单，并将安装程序及清单上传到 canonical OpenClaw GitHub release。网站下载链接应指向当前稳定版的精确 OpenClaw release 资产 URL，或者仅在确认 GitHub 的 latest 重定向指向同一发布后才使用 `releases/latest/download/...`；不要只链接到 companion 仓库 release 页面。
- 发布检查现在在一个单独的手动工作流中运行：`OpenClaw Release Checks`
- `OpenClaw Release Checks` 在发布批准前还会运行 QA Lab mock parity lane 以及快速 live Matrix profile 和 Telegram QA lane。live lanes 使用 `qa-live-shared` 环境；Telegram 还使用 Convex CI 凭据租约。当你需要完整的 Matrix 传输、媒体和 E2EE 清单并行运行时，运行手动的 `QA-Lab - All Lanes` 工作流，并设置 `matrix_profile=all` 和 `matrix_shards=true`。
- 跨操作系统安装和升级运行时验证是公开的 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它们会直接调用可复用工作流 `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这样拆分是有意为之：保持真实的 npm 发布路径短、可确定、并以产物为中心，而较慢的 live 检查保持在自己的 lane 中，这样它们不会拖延或阻塞发布
- 含有密钥的发布检查应通过 `Full Release Validation` 调度，或从 `main`/release 工作flow ref 调度，以便工作流逻辑和密钥保持受控
- `OpenClaw Release Checks` 只要解析出的提交可从 OpenClaw 分支或 release tag 到达，就接受分支、tag 或完整提交 SHA
- `OpenClaw NPM Release` 仅验证预检也接受当前完整的 40 字符 workflow-branch 提交 SHA，而不要求已推送的 tag
- 该 SHA 路径仅用于验证，不能提升为真实发布
- 在 SHA 模式下，工作flow 仅为包元数据检查合成 `v<package.json version>`；真实发布仍然需要真实的 release tag
- 两个 workflow 都将真实发布和提升路径保留在 GitHub 托管 runner 上，而非变更性的验证路径可以使用更大的 Blacksmith Linux runner
- 该 workflow 运行 `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`，并使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 两个 workflow secrets
- npm release preflight 不再等待单独的 release checks lane
- 在本地打 release candidate tag 前，运行 `RELEASE_TAG=vYYYY.M.PATCH-beta.N pnpm release:fast-pretag-check`。该 helper 会按能在 GitHub publish workflow 启动前捕获常见审批阻塞错误的顺序，运行快速发布防线、插件 npm/ClawHub 发布检查、build、UI build 和 `release:openclaw:npm:check`。
- 在审批前运行 `RELEASE_TAG=vYYYY.M.PATCH node --import tsx scripts/openclaw-npm-release-check.ts`（或匹配的 beta/correction tag）
- 在 npm publish 后，运行 `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.PATCH`（或匹配的 beta/correction 版本），在新的临时前缀下验证已发布注册表安装路径
- 在 beta 发布后，运行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.PATCH-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`，以使用共享租约的 Telegram 凭据池，针对已发布的 npm 包验证已安装包引导、Telegram 设置和真实 Telegram E2E。本地维护者的一次性运行可以省略 Convex 变量，并直接传入三个 `OPENCLAW_QA_TELEGRAM_*` env 凭据。
- 若要在维护者机器上运行完整的发布后 beta smoke，请使用 `pnpm release:beta-smoke -- --beta betaN`。该 helper 会运行 Parallels npm update/fresh-target 验证，调度 `NPM Telegram Beta E2E`，轮询精确的工作流运行，下载 artifact，并打印 Telegram 报告。
- 维护者可以通过手动 `NPM Telegram Beta E2E` 工作流在 GitHub Actions 中运行同样的发布后检查。它是刻意手动触发的，不会在每次合并时运行。
- 维护者发布自动化现在采用 preflight-then-promote：
  - 真实 npm publish 必须通过成功的 npm `preflight_run_id`
  - 真实 npm publish 必须从与成功的 preflight 运行相同的 `main` 或 `release/YYYY.M.PATCH` 分支调度
  - 稳定版 npm 发布默认目标为 `beta`
  - 稳定版 npm publish 可通过 workflow 输入显式指定 `latest`
  - 基于 token 的 npm dist-tag 变更现在位于 `openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml`，因为 `npm dist-tag add` 仍需要 `NPM_TOKEN`，而源仓库保持 OIDC-only publish
  - 公共 `macOS Release` 仅用于验证；当 tag 只存在于 release 分支，但工作流从 `main` 调度时，设置 `public_release_branch=release/YYYY.M.PATCH`
  - 真实 macOS publish 必须通过成功的 macOS `preflight_run_id` 和 `validate_run_id`
  - 真实发布路径会晋升已准备好的制品，而不是再次重建它们
- 对于 `YYYY.M.PATCH-N` 这样的稳定修正发布，发布后验证器还会检查从 `YYYY.M.PATCH` 到 `YYYY.M.PATCH-N` 的相同临时前缀升级路径，以便发布修正不会悄悄让旧的全局安装停留在基础稳定负载上
- npm release preflight 失败关闭，除非 tarball 同时包含 `dist/control-ui/index.html` 和一个非空的 `dist/control-ui/assets/` 负载，这样我们就不会再次发布空的浏览器 dashboard
- 发布后验证还会检查已发布插件入口点和包元数据是否存在于已安装的注册表布局中。如果某个发布丢失插件运行时负载，发布后验证器会失败，并且不能晋升到 `latest`。
- `pnpm test:install:smoke` 还会对候选更新 tarball 强制执行 npm pack 的 `unpackedSize` 预算，因此 installer e2e 会在发布发布路径之前捕获意外的包膨胀
- 如果发布工作触及 CI 规划、扩展时间清单或扩展测试矩阵，则在批准前重新生成并审查 planner 拥有的 `.github/workflows/plugin-prerelease.yml` 中的 `plugin-prerelease-extension-shard` 矩阵输出，以免发布说明描述了过时的 CI 布局
- 稳定版 macOS 发布就绪还包括更新器相关表面：
  - GitHub release 最终必须包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - 发布后 `main` 上的 `appcast.xml` 必须指向新的稳定版 zip；macOS 发布工作流会自动提交它，或在直接 push 被阻止时打开 appcast PR
  - 打包后的应用必须保留非 debug 的 bundle id、非空的 Sparkle feed URL，以及不低于该发布版本 canonical Sparkle build floor 的 `CFBundleVersion`

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
  -f ref=release/YYYY.M.PATCH \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.PATCH-beta.N
```

工作流会解析目标 ref，分发手动 `CI` 并设置 `target_ref=<release-ref>`，分发 `OpenClaw Release Checks`，为面向包的检查准备一个父级 `release-package-under-test` 制品，并在 `release_profile=full` 且 `rerun_group=all`，或者设置了 `release_package_spec` 或 `npm_telegram_package_spec` 时，分发独立的包 Telegram E2E。然后 `OpenClaw Release Checks` 会展开为安装冒烟测试、跨 OS 发布检查、在启用 soak 时的实时/E2E Docker 发布路径覆盖、带 Telegram 包 QA 的 Package Acceptance、QA Lab 等价性、实时 Matrix 和实时 Telegram。只有当 `Full Release Validation` 摘要显示 `normal_ci` 和 `release_checks` 都成功时，完整运行才算可接受。在 full/all 模式下，`npm_telegram` 子项也必须成功；在 full/all 之外，除非提供了已发布的 `release_package_spec` 或 `npm_telegram_package_spec`，否则它会被跳过。最终的 verifier 摘要会包含每个子运行的最慢作业表，因此发布负责人无需下载日志就能看到当前关键路径。
参见 [Full release validation](/reference/full-release-validation)，了解完整阶段矩阵、确切的工作流作业名称、stable 与 full 配置文件差异、制品以及聚焦重跑句柄。
子工作流由运行 `Full Release Validation` 的受信任 ref 分发，通常是 `--ref main`，即使目标 `ref` 指向更旧的发布分支或标签。没有单独的 Full Release Validation workflow-ref 输入；通过选择工作流运行 ref 来选择受信任的 harness。
不要在移动中的 `main` 上使用 `--ref main -f ref=<sha>` 来精确证明某个提交；原始提交 SHA 不能作为工作流 dispatch ref，因此请使用 `pnpm ci:full-release --sha <sha>` 来创建固定的临时分支。

使用 `release_profile` 来选择实时/提供方覆盖范围：

`OpenClaw Release Checks` 使用受信任的工作流 ref 先将目标 ref 解析一次为 `release-package-under-test`，并在跨 OS、Package Acceptance 和启用 soak 时的发布路径 Docker 检查中复用该制品。这样所有面向包的测试箱都使用同一份字节，并避免重复构建包。在 beta 已经发布到 npm 后，设置 `release_package_spec=openclaw@YYYY.M.PATCH-beta.N`，这样发布检查会一次性下载已发布包，从 `dist/build-info.json` 中提取其构建源 SHA，并在跨 OS、Package Acceptance、发布路径 Docker 和包 Telegram 线路中复用该制品。跨 OS 的 OpenAI 安装冒烟测试会在仓库/组织变量设置时使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则使用 `openai/gpt-5.4`，因为这条线路验证的是包安装、上手引导、网关启动以及一次实时代理回合，而不是对最慢默认模型进行基准测试。更广泛的实时提供方矩阵仍然是按模型覆盖的地方。

在 `stable` 下，当发布阻断线路都已通过且你希望在晋升前进行完整的实时/E2E、Docker 发布路径和有界已发布升级幸存者扫描时，请使用 `run_release_soak=true`。该扫描覆盖最新四个 stable 包，以及固定的 `2026.4.23` 和 `2026.5.2`
基线，再加上更早的 `2026.4.15` 覆盖，去除重复基线后，每个基线都会拆分到各自的 Docker 运行器作业中。`full` 意味着
`run_release_soak=true`。

`OpenClaw Release Checks` uses the trusted workflow ref to resolve the target
ref once as `release-package-under-test` and reuses that artifact in cross-OS,
Package Acceptance, and release-path Docker checks when soak runs. This keeps
all package-facing boxes on the same bytes and avoids repeated package builds.
After a beta is already on npm, set `release_package_spec=openclaw@YYYY.M.PATCH-beta.N`
so release checks download the shipped package once, extract its build source
SHA from `dist/build-info.json`, and reuse that artifact for cross-OS,
Package Acceptance, release-path Docker, and package Telegram lanes.
The cross-OS OpenAI install smoke uses `OPENCLAW_CROSS_OS_OPENAI_MODEL` when the
repo/org variable is set, otherwise `openai/gpt-5.4`, because this lane is
proving package install, onboarding, gateway startup, and one live agent turn
rather than benchmarking the slowest default model. The broader live provider
matrix remains the place for model-specific coverage.

根据发布阶段使用这些变体：

```bash
# 验证一个尚未发布的候选版本分支。
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.PATCH \
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
  -f ref=release/YYYY.M.PATCH \
  -f provider=openai \
  -f mode=both \
  -f release_profile=full \
  -f release_package_spec=openclaw@YYYY.M.PATCH-beta.N \
  -f evidence_package_spec=openclaw@YYYY.M.PATCH-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

不要在首次针对某个定点修复重跑时使用完整大总包。如果某个箱子失败，请在下次验证时使用失败的子工作流、作业、Docker 线路、包配置文件、模型提供方或 QA 线路。只有当修复改动了共享的发布编排，或使之前所有箱子的证据过期时，才再次运行完整大总包。大总包的最终 verifier 会重新检查记录的子工作流运行 id，因此在某个子工作流成功重跑后，只重跑失败的 `Verify full validation` 父作业即可。

For bounded recovery, pass `rerun_group` to the umbrella. `all` is the real
release-candidate run, `ci` runs only the normal CI child, `plugin-prerelease`
runs only the release-only plugin child, `release-checks` runs every release
box, and the narrower release groups are `install-smoke`, `cross-os`,
`live-e2e`, `package`, `qa`, `qa-parity`, `qa-live`, and `npm-telegram`.
Focused `npm-telegram` reruns require `release_package_spec` or
`npm_telegram_package_spec`; full/all runs with `release_profile=full` use the
release-checks package artifact. Focused
cross-OS reruns can add `cross_os_suite_filter=windows/packaged-upgrade` or
another OS/suite filter. QA release-check failures block normal release
validation, including required OpenClaw dynamic tool drift in the standard tier.
Tideclaw alpha runs may still treat non-package-safety release-check lanes as
advisory. When `live_suite_filter` explicitly requests a gated QA live lane such
as Discord, WhatsApp, or Slack, the matching
`OPENCLAW_RELEASE_QA_*_LIVE_CI_ENABLED` repo variable must be enabled; otherwise
input capture fails instead of silently skipping the lane.

### Vitest

Vitest 箱子是手动 `CI` 子工作流。手动 CI 有意绕过变更范围限制，并强制对发布候选运行正常测试图：Linux Node 分片、捆绑插件分片、插件和通道契约分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建产物冒烟检查、文档检查、Python skills、Windows、macOS、Android 和 Control UI i18n。

使用此箱来回答“源码树是否通过了完整的正常测试套件？”它不同于发布路径的产品验证。需要保留的证据：

- `Full Release Validation` 摘要中显示已分发的 `CI` 运行 URL
- 针对精确目标 SHA 的绿色 `CI` 运行
- 在调查回归时，CI 作业中的失败或缓慢分片名称
- Vitest 时间制品，例如 `.artifacts/vitest-shard-timings.json`，当一次运行需要性能分析时

只有在发布需要确定性的正常 CI，但不需要 Docker、QA Lab、实时、跨 OS 或包箱时，才直接运行手动 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.PATCH
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

- mock parity lane comparing the OpenAI candidate lane against the Opus 4.6
  baseline using the agentic parity pack
- fast live Matrix QA profile using the `qa-live-shared` environment
- live Telegram QA lane using Convex CI credential leases
- `pnpm qa:otel:smoke`, `pnpm qa:otel:collector-smoke`,
  `pnpm qa:prometheus:smoke`, or
  `pnpm qa:observability:smoke` when release telemetry needs explicit local
  proof

使用此箱来回答“该发布在 QA 场景和实时 channel 流程中是否表现正确？”在批准发布时保留 parity、Matrix 和 Telegram 线路的制品 URL。完整的 Matrix 覆盖仍可作为手动分片 QA-Lab 运行，而不是默认的发布关键线路。

### Package

Package 箱子是可安装产品的门禁。它由
`Package Acceptance` 和解析器
`scripts/resolve-openclaw-package-candidate.mjs` 支持。解析器会将候选规范化为 Docker E2E 消费的 `package-under-test` tarball，验证包清单，记录包版本和 SHA-256，并使工作流 harness ref 与包源 ref 分离。

支持的候选来源：

- `source=npm`: `openclaw@beta`, `openclaw@latest`, or an exact OpenClaw release
  version
- `source=ref`: pack a trusted `package_ref` branch, tag, or full commit SHA
  with the selected `workflow_ref` harness
- `source=url`: download a public HTTPS `.tgz` with required `package_sha256`;
  URL credentials, non-default HTTPS ports, private/internal/special-use
  hostnames or resolved addresses, and unsafe redirects are rejected
- `source=trusted-url`: download an HTTPS `.tgz` with required
  `package_sha256` and `trusted_source_id` from a named policy in
  `.github/package-trusted-sources.json`; use this for maintainer-owned
  enterprise mirrors or private package repositories instead of adding an
  input-level private-network bypass to `source=url`
- `source=artifact`: reuse a `.tgz` uploaded by another GitHub Actions run

`OpenClaw Release Checks` runs Package Acceptance with `source=artifact`, the
prepared release package artifact, `suite_profile=custom`,
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`,
`telegram_mode=mock-openai`. Package Acceptance keeps migration, update,
configured-auth update restart, live ClawHub skill install, stale plugin dependency cleanup, offline plugin
fixtures, plugin update, and Telegram package QA against the same resolved
tarball. Blocking release checks use the default latest published package
baseline; `run_release_soak=true` or
`release_profile=full` expands to every stable npm-published baseline from
`2026.4.23` through `latest` plus reported-issue fixtures. Use
Package Acceptance with `source=npm` for an already shipped candidate,
`source=ref` for a SHA-backed local npm tarball before publish,
`source=trusted-url` for a maintainer-owned enterprise/private mirror, or
`source=artifact` for a prepared tarball uploaded by another GitHub Actions run.
It is the GitHub-native
replacement for most of the package/update coverage that previously required
Parallels. Cross-OS release checks still matter for OS-specific onboarding,
installer, and platform behavior, but package/update product validation should
prefer Package Acceptance.

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
  --ref release/YYYY.M.PATCH \
  -f tag=vYYYY.M.PATCH-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

发布稳定版到默认 beta dist-tag：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.PATCH \
  -f tag=vYYYY.M.PATCH \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

直接提升稳定版到 `latest` 是显式的：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.PATCH \
  -f tag=vYYYY.M.PATCH \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

仅在有针对性的修复或重新发布工作中才使用更底层的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流。`OpenClaw Release Publish` 会在 `publish_openclaw_npm=true` 时拒绝 `plugin_publish_scope=selected`，这样核心包就不会在缺少任何可发布的官方插件（包括 `@openclaw/diffs-language-pack`）的情况下发布。对于选定插件的修复，请在 `publish_openclaw_npm=false` 且 `plugin_publish_scope=selected` 时设置 `plugins=@openclaw/name`，或直接分发子工作流。

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
- `npm_dist_tag`: OpenClaw 包使用的 npm 目标标签
- `plugin_publish_scope`: 默认为 `all-publishable`；仅在
  `publish_openclaw_npm=false` 的有针对性插件修复工作中使用 `selected`
- `plugins`: 当 `plugin_publish_scope=selected` 时，
  以逗号分隔的 `@openclaw/*` 包名
- `publish_openclaw_npm`: 默认为 `true`；仅在将该工作流用作仅插件修复编排器时设为 `false`
- `wait_for_clawhub`: 默认为 `false`，因此 npm 可用性不会被
  ClawHub sidecar 阻塞；仅在工作流完成必须包括 ClawHub 完成时设为 `true`

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

1. 在 `preflight_only=true` 下运行 `OpenClaw NPM Release`
   - 在标签尚不存在之前，你可以使用当前完整的 workflow-branch commit
     SHA 对预检工作流进行仅验证的 dry run
2. 选择 `npm_dist_tag=beta` 以使用正常的 beta-first 流程，或仅在你有意直接发布稳定版时使用 `latest`
3. 在发布分支、发布标签或完整
   commit SHA 上运行 `Full Release Validation`，当你希望从一个手动工作流获得正常 CI 以及 live prompt cache、Docker、QA Lab、
   Matrix 和 Telegram 覆盖时
4. 如果你有意只需要确定性的正常测试图，改为在发布 ref 上手动运行 `CI` 工作流
5. 保存成功的 `preflight_run_id`
6. 使用相同的 `tag`、相同的 `npm_dist_tag` 和已保存的 `preflight_run_id` 运行 `OpenClaw Release Publish`；它会先将外部化插件发布到 npm
   和 ClawHub，然后再提升 OpenClaw npm 包
7. 如果发布落在 `beta` 上，使用
   `openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流将该稳定版本从 `beta` 提升到 `latest`
8. 如果发布有意直接发布到 `latest`，并且 `beta`
   应该立即跟随同一个稳定构建，则使用同一个发布
   工作流将两个 dist-tag 都指向该稳定版本，或者让其计划中的自愈同步稍后移动 `beta`

dist-tag 的变更保存在发布账本仓库中，因为它仍然需要
`NPM_TOKEN`，而源仓库保持仅使用 OIDC 的发布。

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
