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

- 稳定版发布版本：`YYYY.M.PATCH`
  - Git tag：`vYYYY.M.PATCH`
- 稳定修正版发布版本：`YYYY.M.PATCH-N`
  - Git tag：`vYYYY.M.PATCH-N`
- Beta 预发布版本：`YYYY.M.PATCH-beta.N`
  - Git tag：`vYYYY.M.PATCH-beta.N`
- 月份或 patch 不要补零
- 从 2026 年 6 月发布流程更新开始，第三个组成部分是按月顺序递增的发布列车编号，而不是日历日期。稳定版和 beta 版发布决定当前列车；仅 alpha 的 tag 不会消耗或推进 beta/stable 的 patch 编号。更新前的 tag 和 npm 版本保留其现有名称并仍然有效；发布自动化继续按年份、月份、patch、通道以及预发布或修正编号进行比较。
- alpha/nightly 构建使用下一个尚未发布的 patch 列车，并且对于重复构建只递增 `alpha.N`。一旦该 patch 有了 beta，新 alpha 构建会移动到下一个 patch。选择 beta 或 stable 列车时，忽略 patch 编号更高的旧 alpha-only tag。
- npm 版本是不可变的。如果某个 beta tag 已经发布，不要删除、重新发布或重用它；改为切下一个 beta 编号或下一个月度 patch。由于在过渡期间 `2026.6.5-beta.1` 已经发布，2026 年 6 月的发布列车必须使用 patch `5` 或更高。不要将新的 2026 年 6 月 stable 或 beta 列车发布为 `2026.6.2`、`2026.6.3` 或 `2026.6.4`。
- 在 stable `2026.6.5` 之后，下一个新的 beta 列车是 `2026.6.6-beta.1`，即使更高 patch 编号的自动化 alpha-only tag 已经存在。
- `latest` 表示当前已晋升的稳定 npm 发布
- `beta` 表示当前 beta 安装目标
- 稳定版和稳定修正版默认发布到 npm `beta`；发布操作员可以显式指定 `latest`，或者稍后晋升一个已验证的 beta 构建
- 每个稳定版 OpenClaw 发布都会将 npm 包、macOS 应用和已签名的 Windows Hub 安装程序一起发布；beta 发布通常先验证并发布 npm/包路径，而原生应用的构建/签名/notarize/晋升仅保留给稳定版，除非明确要求

## 发布节奏

- 发布遵循先 beta 后 stable
- 只有在最新 beta 经验证后，stable 才会跟进
- 维护者通常从基于当前 `main` 创建的 `release/YYYY.M.PATCH` 分支切发布，因此发布验证和修复不会阻塞 `main` 上的新开发
- 如果 beta tag 已被推送或发布且需要修复，维护者应切下一个 `-beta.N` tag，而不是删除或重建旧的 beta tag
- 详细的发布流程、审批、凭据和恢复说明仅限维护者可见

## 发布操作员检查清单

此检查清单是发布流程的公开形式。私有凭据、签名、notarization、dist-tag 恢复和紧急回滚细节保留在仅维护者可见的发布手册中。

1. 从当前 `main` 开始：拉取最新内容，确认目标 commit 已推送，并确认当前 `main` 的 CI 足够健康，可以据此分支。
2. 根据自上一个可达发布 tag 以来已合并的 PR 和所有直接 commit 生成 `CHANGELOG.md` 顶部章节。保持条目面向用户，去重重叠的 PR/直接 commit 条目，提交重写后的内容，推送，然后在分支前再 rebase/pull 一次。
3. 检查 `src/plugins/compat/registry.ts` 和 `src/commands/doctor/shared/deprecation-compat.ts` 中的发布兼容性记录。只有在升级路径仍被覆盖时才移除已过期兼容性，或者记录其被有意保留的原因。
4. 从当前 `main` 创建 `release/YYYY.M.PATCH`；不要直接在 `main` 上做正常发布工作。
5. 为目标 tag 更新所有必需的版本位置，然后运行 `pnpm release:prep`。它会按正确顺序刷新插件版本、插件清单、配置 schema、捆绑的 channel config 元数据、配置文档基线、插件 SDK 导出以及插件 SDK API 基线。在打 tag 前提交任何生成的漂移。然后运行本地确定性预检：`pnpm check:test-types`、`pnpm check:architecture`、`pnpm build && pnpm ui:build`，以及 `pnpm release:check`。
6. 以 `preflight_only=true` 运行 `OpenClaw NPM Release`。在 tag 存在之前，允许使用完整的 40 字符 release-branch SHA 仅用于验证性预检。预检会为精确检出的依赖图生成依赖发布证据，并将其存储在 npm 预检产物中。保存成功的 `preflight_run_id`。
7. 使用 `Full Release Validation` 为发布分支、tag 或完整 commit SHA 启动所有预发布测试。这是四个大型发布测试框——Vitest、Docker、QA Lab 和 Package——的唯一手动入口。
8. 如果验证失败，在发布分支上修复，并重新运行能证明修复的最小失败文件、lane、workflow job、package profile、provider 或 model allowlist。只有当变更范围使先前证据失效时，才重新运行完整的总验证。
9. 对于已打 tag 的 beta 候选，在匹配的 `release/YYYY.M.PATCH` 分支上运行 `pnpm release:candidate -- --tag vYYYY.M.PATCH-beta.N`。对于稳定版，还要传入所需的 Windows source release：
   `pnpm release:candidate -- --tag vYYYY.M.PATCH --windows-node-tag vX.Y.Z`。
   该辅助程序会运行本地生成发布检查、分发或验证完整发布验证和 npm 预检证据、基于精确准备好的 tarball 加上 Telegram package 证据运行 Parallels fresh/update 证明、记录插件 npm 和 ClawHub 计划，并且只有在证据包通过后才打印精确的 `OpenClaw Release Publish` 命令。
   `OpenClaw Release Publish` 会并行将所选或所有可发布的插件包发布到 npm，并将同一组发布到 ClawHub，然后在插件 npm 发布成功后，立即用匹配的 dist-tag 晋升已准备好的 OpenClaw npm 预检产物。
   在 OpenClaw npm 发布子流程成功后，它会根据完整匹配的 `CHANGELOG.md` 章节创建或更新对应的 GitHub release/prerelease 页面。发布到 npm `latest` 的稳定版会成为 GitHub latest release；保留在 npm `beta` 的稳定维护版则以 GitHub `latest=false` 创建。该工作流还会把预检依赖证据、完整验证清单以及发布后注册表验证证据上传到 GitHub release，以便发布后事件响应。发布工作流会立即打印子运行 ID，自动批准工作流 token 被允许批准的发布环境门禁，汇总失败子任务的日志尾部，在 OpenClaw npm 发布成功后立即关闭 GitHub release 和依赖证据，在发布 OpenClaw npm 时等待 ClawHub，然后运行 `pnpm release:verify-beta`，并为 GitHub release、npm 包、所选插件 npm 包、所选 ClawHub 包、子工作流运行 ID 以及可选的 NPM Telegram 运行 ID 上传发布后证据。ClawHub 路径会重试临时性的 CLI 依赖安装失败，即使某个预览单元格发生抖动也会发布预览通过的插件，并以每个预期插件版本的注册表验证结束，以便部分发布仍然可见且可重试。然后针对已发布的 `openclaw@YYYY.M.PATCH-beta.N` 或 `openclaw@beta` 包运行发布后包验收。如果已推送或已发布的预发布需要修复，切下一个匹配的预发布编号；不要删除或重写旧的预发布。
10. 对于 stable，仅在已验证的 beta 或 release candidate 具备所需验证证据后继续。稳定版 npm 发布也通过 `OpenClaw Release Publish` 进行，并复用 `preflight_run_id` 对应的成功预检产物；稳定版 macOS 发布就绪还要求在 `main` 上存在打包好的 `.zip`、`.dmg`、`.dSYM.zip` 以及更新后的 `appcast.xml`。macOS 发布工作流会在发布资产验证后自动将已签名的 appcast 发布到公共 `main`；如果分支保护阻止直接推送，则会打开或更新一个 appcast PR。稳定版 Windows Hub 就绪要求在 OpenClaw GitHub release 上存在已签名的 `OpenClawCompanion-Setup-x64.exe`、`OpenClawCompanion-Setup-arm64.exe` 和 `OpenClawCompanion-SHA256SUMS.txt` 资产。将精确签名的 `openclaw/openclaw-windows-node` release tag 作为 `windows_node_tag`，并将其候选已批准安装程序摘要映射作为 `windows_node_installer_digests` 传入；`OpenClaw Release Publish` 会保留 release draft，分发 `Windows Node Release`，并在发布前验证这三个资产。
11. 发布后，运行 npm 发布后验证器、在需要发布后通道证明时可选运行独立的已发布 npm Telegram E2E、必要时进行 dist-tag 晋升、验证生成的 GitHub release 页面、运行发布公告步骤，然后在调用稳定版发布完成之前先完成 [Stable main closeout](#stable-main-closeout)。

## Stable main closeout

稳定版发布只有在 `main` 携带了实际已发布的 release 状态后才算完成。

1. 从最新的 `main` 开始。将 `release/YYYY.M.PATCH` 与其进行审计，并将 `main` 中缺失的真实修复向前移植。不要盲目地把仅用于 release 的兼容性、测试或验证适配器合并到更新的 `main` 中。
2. 将 `main` 设置为已发布的稳定版版本，而不是推测性的下一列车。根版本变更后运行 `pnpm release:prep`，然后运行 `pnpm deps:shrinkwrap:generate`。
3. 让 `main` 上 `CHANGELOG.md` 的 `## YYYY.M.PATCH` 章节与已打 tag 的发布分支完全一致。如果 mac 发布时发布了 stable 的 `appcast.xml` 更新，也要包含进去。
4. 在操作员明确启动该发布列车之前，不要向 `main` 添加 `YYYY.M.PATCH+1`、beta 版本或空的未来 changelog 章节。
5. 运行 `pnpm release:generated:check`、`pnpm deps:shrinkwrap:check` 和 `OPENCLAW_TESTBOX=1 pnpm check:changed`。推送，然后在调用稳定版发布完成之前，验证 `origin/main` 包含已发布的版本和 changelog。
6. 在每次私有回滚演练后，保持仓库变量 `RELEASE_ROLLBACK_DRILL_ID` 和 `RELEASE_ROLLBACK_DRILL_DATE` 为最新。
   `OpenClaw Stable Main Closeout` 从带有已发布版本、changelog 和 appcast 的 `main` 推送开始，此推送发生在稳定版发布之后。它读取不可变的发布后证据，将已发布 tag 绑定到其 Full Release Validation 和 Publish 运行，然后验证 stable main 状态、release、强制稳定 soak 以及阻塞性的性能证据。它会向 GitHub release 附加一个不可变的 closeout manifest 和 checksum。自动推送触发会跳过早于不可变发布后证据的旧版本；它绝不会把该跳过视为已完成的 closeout。完整 closeout 需要同时具备两个资产及其匹配的 checksum。部分 manifest 会重放其记录的 `main` SHA 和回滚演练以重新生成相同字节，然后附加缺失的 checksum；无效的组合，或只有 checksum 而没有 manifest，都会继续阻塞。如果没有回滚演练仓库变量，推送触发的运行会跳过但不会完成 closeout；缺失或超过 90 天的演练记录仍会阻止基于手动证据的 closeout。私有恢复命令保留在仅维护者可见的 runbook 中。仅使用手动分发来修复或重放一个有证据支持的稳定版 closeout。旧的 fallback 修正版 tag 只有在修正 tag 解析到与基础稳定 tag 相同的源 commit 时，才可以复用基础包证据。来源不同的修正版必须发布并验证其自己的包证据。

## 发布预检

- 在发布预检之前运行 `pnpm check:test-types`，以确保测试 TypeScript 在更快的本地 `pnpm check` 门禁之外仍受到覆盖
- 在发布预检之前运行 `pnpm check:architecture`，以确保更广泛的导入循环和架构边界检查在更快的本地门禁之外也是绿色
- 在运行 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，以确保打包验证步骤所需的预期 `dist/*` 发布产物和 Control UI bundle 已存在
- 在根版本提升之后、打标签之前运行 `pnpm release:prep`。它会运行所有通常会在版本/配置/API 变更后漂移的确定性发布生成器：插件版本、插件清单、基础配置 schema、捆绑的渠道配置元数据、配置文档基线、插件 SDK 导出以及插件 SDK API 基线。`pnpm release:check` 会以检查模式重新运行这些门禁，并在执行包发布检查之前一次性报告它发现的所有生成漂移失败。
- 默认情况下，插件版本同步会将官方插件包版本以及现有的 `openclaw.compat.pluginApi` 下限更新为 OpenClaw 发布版本。请将该字段视为插件 SDK/运行时 API 下限，而不仅仅是包版本的拷贝：对于有意保持与旧版 OpenClaw 主机兼容的仅插件发布，请将下限保留为最旧受支持主机 API，并在插件发布证据中记录这一选择。
- 在发布批准之前运行手动的 `Full Release Validation` 工作流，以便从一个入口启动所有预发布测试箱。它接受分支、标签或完整提交 SHA，触发手动 `CI`，并触发 `OpenClaw Release Checks`，涵盖安装 smoke、包验收、跨操作系统包检查、QA Lab 一致性、Matrix 和 Telegram 线路。稳定版和完整运行始终包含详尽的 live/E2E 以及 Docker 发布路径 soak；`run_release_soak=true` 保留用于显式的 beta soak。Package Acceptance 在候选验证期间提供规范化的包 Telegram E2E，避免第二个并发的 live poller。
  在发布 beta 后提供 `release_package_spec`，以便在 release checks、Package Acceptance 和 package Telegram E2E 中复用已发布的 npm 包，而无需重新构建发布 tarball。仅当 Telegram 应使用与其余发布验证不同的已发布包时，才提供 `npm_telegram_package_spec`。当 Package Acceptance 应使用与 release package spec 不同的已发布包时，提供 `package_acceptance_package_spec`。当发布证据报告应证明验证结果与某个已发布的 npm 包一致，但又不强制执行 Telegram E2E 时，提供 `evidence_package_spec`。
  示例：
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.PATCH`
- 当你想在发布工作继续进行时，为某个包候选获取侧信道证明，请运行手动的 `Package Acceptance` 工作流。对 `openclaw@beta`、`openclaw@latest` 或精确发布版本使用 `source=npm`；使用 `source=ref` 将受信任的 `package_ref` 分支/标签/SHA 与当前 `workflow_ref` harness 打包；对具有必需 SHA-256 和严格公共 URL 策略的公开 HTTPS tarball 使用 `source=url`；对使用必需 `trusted_source_id` 和 SHA-256 的命名受信任来源策略使用 `source=trusted-url`；或者对由另一个 GitHub Actions 运行上传的 tarball 使用 `source=artifact`。该工作流会将候选解析为 `package-under-test`，在该 tarball 上复用 Docker E2E 发布调度器，并且可以使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 对同一 tarball 运行 Telegram QA。当所选 Docker 线路包含 `published-upgrade-survivor` 时，包产物是候选包，而 `published_upgrade_survivor_baseline` 选择已发布基线。`update-restart-auth` 会将候选包同时用作已安装 CLI 和 `package-under-test`，从而演练候选更新命令的受管重启路径。
  示例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  常用配置：
  - `smoke`：安装/渠道/代理、网关网络和配置重载线路
  - `package`：原生于产物的包/更新/重启/插件线路，不包含 OpenWebUI 或 live ClawHub
  - `product`：包配置文件加上 MCP 渠道、cron/subagent 清理、OpenAI web search 和 OpenWebUI
  - `full`：带 OpenWebUI 的 Docker 发布路径分块
  - `custom`：用于定向重跑的精确 `docker_lanes` 选择
- 当你只需要发布候选的确定性常规 CI 覆盖时，直接运行手动的 `CI` 工作流。手动 CI 触发会绕过变更范围限制，并强制运行 Linux Node shards、捆绑插件 shards、插件和渠道契约 shards、Node 22 兼容性、`check-*`、`check-additional-*`、已构建产物 smoke 检查、文档检查、Python skills、Windows、macOS 以及 Control UI i18n 线路。独立的手动 CI 仅在使用 `include_android=true` 触发时运行 Android；`Full Release Validation` 会为其 CI 子任务传递该输入。
  Android 示例：`gh workflow run ci.yml --ref release/YYYY.M.PATCH -f include_android=true`
- 在验证发布遥测时运行 `pnpm qa:otel:smoke`。它通过本地 OTLP/HTTP 接收器演练 QA-lab，并验证 trace、metric 和 log 导出，以及有界 trace 属性与内容/标识符脱敏，而无需 Opik、Langfuse 或其他外部收集器。
- 在验证收集器兼容性时运行 `pnpm qa:otel:collector-smoke`。它会先将相同的 QA-lab OTLP 导出路由通过真实的 OpenTelemetry Collector Docker 容器，再执行本地接收器断言。
- 在验证受保护的 Prometheus 抓取时运行 `pnpm qa:prometheus:smoke`。它会演练 QA-lab，拒绝未认证的抓取，并验证关键发布指标族不会泄露提示内容、原始标识符、认证令牌和本地路径。
- 当你希望将源检出的 OpenTelemetry 和 Prometheus smoke 线路连续运行时，执行 `pnpm qa:observability:smoke`。
- 在每次打标签发布之前运行 `pnpm release:check`
- `OpenClaw NPM Release` 预检会在打包 npm tarball 之前生成依赖发布证据。npm 安全公告漏洞门禁具有发布阻断作用。传递性清单风险、依赖所有权/安装面以及依赖变更报告仅作为发布证据。依赖变更报告会将发布候选与上一个可达的发布标签进行比较。
- 预检会将依赖证据上传为 `openclaw-release-dependency-evidence-<tag>`，并且还会将其作为 `dependency-evidence/` 嵌入到准备好的 npm 预检产物中。真正的发布路径会复用该预检产物，然后将同样的证据作为 `openclaw-<version>-dependency-evidence.zip` 附加到 GitHub release 上。
- 在标签存在后，运行 `OpenClaw Release Publish` 以执行会修改状态的发布序列。从 `release/YYYY.M.PATCH`（或者在发布可从 main 到达的标签时从 `main`）触发它，传入发布标签、成功的 OpenClaw npm `preflight_run_id` 和成功的 `full_release_validation_run_id`，并保持默认插件发布范围 `all-publishable`，除非你明确在执行定向修复。该工作流会串行化插件 npm 发布、插件 ClawHub 发布以及 OpenClaw npm 发布，以确保核心包不会早于其外部化插件发布。
- 稳定版 `OpenClaw Release Publish` 要求在匹配的非预发布 `openclaw/openclaw-windows-node` 发布存在后提供精确的 `windows_node_tag`。它还要求经过候选批准的 `windows_node_installer_digests` 映射。在触发任何发布子任务之前，它会验证源发布已发布、非预发布、包含所需的 x64/ARM64 安装程序，并且仍与该批准映射匹配。随后它会在 OpenClaw 发布仍为草稿时触发 `Windows Node Release`，并原样携带已固定的安装程序摘要映射。子工作流会从该精确标签下载已签名的 Windows Hub 安装程序，将它们与固定摘要进行匹配，在 Windows runner 上验证它们的 Authenticode 签名使用预期的 OpenClaw Foundation 签名者，写出 SHA-256 清单，然后将安装程序和清单上传到规范的 OpenClaw GitHub release 上，接着重新下载已晋升的资源并验证清单成员关系和哈希。父工作流会在发布前验证当前的 x64、ARM64 和校验和资源契约。直接恢复会在用固定的源字节替换预期的契约资源之前拒绝意外的 `OpenClawCompanion-*` 资源名称。仅为恢复而手动触发 `Windows Node Release`，并且始终传递精确标签，绝不要使用 `latest`，同时提供来自已批准源发布的显式 `expected_installer_digests` JSON 映射。网站下载链接应指向当前稳定版的精确 OpenClaw release 资源 URL，或者仅在验证 GitHub 的 latest 重定向指向同一发布后，才使用 `releases/latest/download/...`；不要只链接到 companion 仓库的 release 页面。
- 发布检查现在在一个单独的手动工作流中运行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 在发布批准之前还会运行 QA Lab mock parity 线路，以及快速的 live Matrix 配置和 Telegram QA 线路。live 线路使用 `qa-live-shared` 环境；Telegram 也使用 Convex CI 凭据租约。当你想并行获取完整 Matrix 传输、媒体和 E2EE 清单时，运行手动的 `QA-Lab - All Lanes` 工作流，并设置 `matrix_profile=all` 和 `matrix_shards=true`。
- 跨操作系统的安装和升级运行时验证是公开的 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它们直接调用可复用工作流 `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这种拆分是有意为之：保持真正的 npm 发布路径简短、确定且以产物为中心，而较慢的 live 检查留在它们自己的线路中，这样它们就不会拖慢或阻塞发布
- 含密钥的发布检查应通过 `Full Release Validation` 或从 `main`/release 工作流 ref 触发，以便工作流逻辑和密钥保持受控
- 只要解析出的提交可从 OpenClaw 分支或发布标签到达，`OpenClaw Release Checks` 就接受分支、标签或完整提交 SHA
- `OpenClaw NPM Release` 仅验证预检也接受当前完整的 40 字符 workflow-branch 提交 SHA，而不要求先推送标签
- 该 SHA 路径仅用于验证，不能提升为真正的发布
- 在 SHA 模式下，工作流只会为包元数据检查综合出 `v<package.json version>`；真正的发布仍然需要真实的发布标签
- 两个工作流都将真实发布和晋升路径保持在 GitHub 托管 runner 上，而非变更性的验证路径可以使用更大的 Blacksmith Linux runners
- 该工作流使用 `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`，并使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 两个工作流密钥
- npm 发布预检不再等待单独的发布检查线路
- 在本地为发布候选打标签之前，运行 `RELEASE_TAG=vYYYY.M.PATCH-beta.N pnpm release:fast-pretag-check`。该助手会按顺序运行快速发布护栏、插件 npm/ClawHub 发布检查、构建、UI 构建以及 `release:openclaw:npm:check`，以便在 GitHub 发布工作流开始前捕获常见的、会阻断批准的错误。
- 在批准之前运行 `RELEASE_TAG=vYYYY.M.PATCH node --import tsx scripts/openclaw-npm-release-check.ts`（或相匹配的 beta/correction 标签）
- 在 npm 发布之后，运行 `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.PATCH`（或相匹配的 beta/correction 版本），以在一个新的临时前缀中验证已发布 registry 的安装路径
- 在 beta 发布之后，运行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.PATCH-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`，以使用共享的租赁 Telegram 凭据池验证已安装包引导、Telegram 设置以及针对已发布 npm 包的真实 Telegram E2E。本地维护者的一次性运行可以省略 Convex 变量，并直接传入三个 `OPENCLAW_QA_TELEGRAM_*` 环境凭据。
- 要从维护者机器运行完整的发布后 beta smoke，请使用 `pnpm release:beta-smoke -- --beta betaN`。该助手会运行 Parallels npm 更新/新目标验证，触发 `NPM Telegram Beta E2E`，轮询精确的工作流运行，下载产物，并打印 Telegram 报告。
- 维护者也可以通过手动的 `NPM Telegram Beta E2E` 工作流从 GitHub Actions 运行同样的发布后检查。它有意仅支持手动触发，不会在每次合并时都运行。
- 维护者发布自动化现在采用先预检后晋升：
  - 真正的 npm 发布必须通过成功的 npm `preflight_run_id`
  - 真正的 npm 发布必须从与成功预检运行相同的 `main` 或 `release/YYYY.M.PATCH` 分支触发
  - 稳定版 npm 发布默认使用 `beta`
  - 稳定版 npm 发布可以通过工作流输入显式指定为 `latest`
  - 基于 token 的 npm dist-tag 变更现在位于 `openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml`，因为 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，而源仓库保持仅 OIDC 发布
  - 公开的 `macOS Release` 仅用于验证；当某个标签只存在于发布分支上而工作流从 `main` 触发时，请设置 `public_release_branch=release/YYYY.M.PATCH`
  - 真正的 macOS 发布必须通过成功的 macOS `preflight_run_id` 和 `validate_run_id`
  - 真正的发布路径会晋升已准备好的产物，而不是再次重新构建它们
- 对于诸如 `YYYY.M.PATCH-N` 这样的稳定修正发布，发布后验证器还会检查从 `YYYY.M.PATCH` 到 `YYYY.M.PATCH-N` 的相同临时前缀升级路径，以确保发布修正不会悄然让较旧的全局安装停留在基础稳定负载上
- npm 发布预检会在关闭状态下失败，除非 tarball 同时包含 `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 负载，这样我们就不会再次发布一个空的浏览器仪表盘
- 发布后验证还会检查已发布的插件入口点和包元数据是否存在于已安装的 registry 布局中。若某次发布缺少插件运行时负载，则发布后验证器会失败，并且该发布不能晋升到 `latest`。
- `pnpm test:install:smoke` 还会对候选更新 tarball 强制执行 npm pack 的 `unpackedSize` 预算，因此安装器 E2E 能在发布发布路径之前捕获意外的包体积膨胀
- 如果发布工作触及了 CI 规划、扩展时间清单或扩展测试矩阵，请在批准之前从 `.github/workflows/plugin-prerelease.yml` 重新生成并审查 planner 拥有的 `plugin-prerelease-extension-shard` 矩阵输出，以免发布说明描述了过时的 CI 布局
- 稳定版 macOS 发布就绪还包括更新器相关表面：
  - GitHub release 最终必须包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 在发布后必须指向新的稳定 zip；macOS 发布工作流会自动提交它，或者在直接推送被阻止时打开一个 appcast PR
  - 打包后的应用必须保留非 debug 的 bundle id、非空的 Sparkle feed URL，以及至少达到该发布版本规范 Sparkle 构建下限的 `CFBundleVersion`

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

工作流会解析目标 ref，手动分发 `CI` 并设置
`target_ref=<release-ref>`，然后分发 `OpenClaw Release Checks`。
`OpenClaw Release Checks` 会展开安装冒烟测试、跨 OS 发布检查、
在启用 soak 时的实时/E2E Docker 发布路径覆盖、带有规范 Telegram 包 E2E 的 Package Acceptance、
QA Lab 对等性、实时 Matrix 和实时 Telegram。只有当 `Full Release Validation`
摘要显示 `normal_ci`、`plugin_prerelease` 和 `release_checks` 都成功时，
完整/全部运行才可接受，除非聚焦重跑时有意跳过了单独的 `Plugin
Prerelease` 子任务。仅在针对已发布包进行聚焦重跑，并使用 `release_package_spec` 或
`npm_telegram_package_spec` 时，才使用独立的 `npm-telegram` 子任务。最终
verifier 摘要会为每个子运行包含最慢作业表，因此发布负责人无需下载日志就能看到当前关键路径。
有关完整阶段矩阵、精确工作流作业名称、stable 与 full 配置文件差异、制品以及聚焦重跑句柄，
请参见 [Full release validation](/reference/full-release-validation)。
子工作流会从运行 `Full Release
Validation` 的受信任 ref 分发，通常是 `--ref main`，即使目标 `ref` 指向更早的发布分支或标签。
不存在单独的 Full Release Validation workflow-ref 输入；通过选择工作流运行 ref 来选择受信任的 harness。
不要在移动中的 `main` 上使用 `--ref main -f ref=<sha>` 来精确证明提交；原始 commit SHA 不能作为 workflow dispatch refs，
因此请使用 `pnpm ci:full-release --sha <sha>` 来创建固定的临时分支。

使用 `release_profile` 来选择实时/提供方覆盖范围：

`OpenClaw Release Checks` 使用受信任的工作流 ref 先将目标 ref 解析一次为 `release-package-under-test`，并在跨 OS、Package Acceptance 和启用 soak 时的发布路径 Docker 检查中复用该制品。这样所有面向包的测试箱都使用同一份字节，并避免重复构建包。在 beta 已经发布到 npm 后，设置 `release_package_spec=openclaw@YYYY.M.PATCH-beta.N`，这样发布检查会一次性下载已发布包，从 `dist/build-info.json` 中提取其构建源 SHA，并在跨 OS、Package Acceptance、发布路径 Docker 和包 Telegram 线路中复用该制品。跨 OS 的 OpenAI 安装冒烟测试会在仓库/组织变量设置时使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则使用 `openai/gpt-5.4`，因为这条线路验证的是包安装、上手引导、网关启动以及一次实时代理回合，而不是对最慢默认模型进行基准测试。更广泛的实时提供方矩阵仍然是按模型覆盖的地方。

Stable 和 full 验证在晋升前都会始终运行完整的实时/E2E、Docker
发布路径和受限的已发布升级幸存者扫描。使用 `run_release_soak=true` 来为 beta 请求同样的扫描。该扫描覆盖
最新四个 stable 包，加上固定的 `2026.4.23` 和 `2026.5.2`
基线，以及更早的 `2026.4.15` 覆盖，并去除重复基线，
每个基线都会拆分到各自的 Docker runner 作业中。

`OpenClaw Release Checks` 使用受信任的工作流 ref 先将目标
ref 解析一次为 `release-package-under-test`，并在跨 OS、
Package Acceptance 和启用 soak 时的发布路径 Docker 检查中复用该制品。
这样所有面向包的测试箱都使用同一份字节，并避免重复构建包。
在 beta 已经发布到 npm 后，设置 `release_package_spec=openclaw@YYYY.M.PATCH-beta.N`
这样发布检查会一次性下载已发布包，从 `dist/build-info.json` 中提取其构建源
SHA，并在跨 OS、
Package Acceptance、发布路径 Docker 和包 Telegram 线路中复用该制品。
跨 OS 的 OpenAI 安装冒烟测试会在
仓库/组织变量设置时使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则使用 `openai/gpt-5.4`，
因为这条线路验证的是包安装、上手引导、网关启动以及一次实时代理回合
而不是对最慢默认模型进行基准测试。更广泛的实时提供方矩阵仍然是按模型覆盖的地方。

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

对于受限恢复，请向 umbrella 传入 `rerun_group`。`all` 是真实的
release-candidate 运行，`ci` 仅运行 normal CI 子任务，`plugin-prerelease`
仅运行仅限发布的插件子任务，`release-checks` 运行所有发布
测试箱，而更窄的发布组是 `install-smoke`、`cross-os`、
`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。
聚焦的 `npm-telegram` 重跑需要 `release_package_spec` 或
`npm_telegram_package_spec`；完整/all 运行在 Package Acceptance 中使用规范的包 Telegram E2E。聚焦的
cross-OS 重跑可以添加 `cross_os_suite_filter=windows/packaged-upgrade` 或
其他 OS/套件过滤器。QA 发布检查失败会阻止正常的发布
验证，包括标准层中必需的 OpenClaw 动态工具漂移。Tideclaw alpha 运行仍可能将非包安全的发布检查线路视为建议性。當 `live_suite_filter` 明确请求受门控的 QA live 线路（如
Discord、WhatsApp 或 Slack）时，匹配的
`OPENCLAW_RELEASE_QA_*_LIVE_CI_ENABLED` 仓库变量必须启用；否则
输入捕获会失败，而不会静默跳过该线路。

### Vitest

Vitest 箱子是手动 `CI` 子工作流。手动 CI 会刻意
绕过变更范围并强制为发布候选运行正常测试图：Linux Node 分片、bundled-plugin 分片、插件和 channel 合约分片、Node 22 兼容性、`check-*`、`check-additional-*`、
构建制品冒烟检查、文档检查、Python 技能、Windows、macOS，
以及 Control UI i18n。Android 会在 `Full Release Validation` 运行该
箱子时包含其中，因为 umbrella 会传入 `include_android=true`；独立手动 CI
则需要 `include_android=true` 才能覆盖 Android。

使用此箱来回答“源码树是否通过了完整的正常测试套件？”它不同于发布路径的产品验证。需要保留的证据：

- `Full Release Validation` 摘要中显示已分发的 `CI` 运行 URL
- 针对精确目标 SHA 的绿色 `CI` 运行
- 在调查回归时，CI 作业中的失败或缓慢分片名称
- Vitest 时间制品，例如 `.artifacts/vitest-shard-timings.json`，当一次运行需要性能分析时

仅当发布需要确定性的 normal CI，但不需要 Docker、QA Lab、live、cross-OS 或 package 箱时，才直接运行手动 CI。非 Android 直接 CI 使用第一条命令。若直接发布候选 CI 必须覆盖 Android，请添加 `include_android=true`：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.PATCH
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.PATCH -f include_android=true
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
baseline; the beta profile with `run_release_soak=true`, `release_profile=stable`, or
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
4. 使用 `publish_scope=all-publishable` 和
   `ref=<release-sha>` 分发 `Plugin NPM Release`。
5. 使用相同的 scope 和 SHA 分发 `Plugin ClawHub Release`。
6. 在验证已保存的 `full_release_validation_run_id` 后，使用发布标签、npm dist-tag 和
   已保存的 `preflight_run_id` 分发 `OpenClaw NPM Release`。
7. 对于稳定版发布，创建或更新 GitHub release 为 draft，使用显式的 `windows_node_tag` 和
   候选人已批准的 `windows_node_installer_digests` 分发 `Windows Node Release`，并在发布该 draft 之前验证规范的
   安装包/校验和资产。

Beta 发布示例：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.PATCH \
  -f tag=vYYYY.M.PATCH-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f full_release_validation_run_id=<successful-full-release-validation-run-id> \
  -f npm_dist_tag=beta
```

发布稳定版到默认 beta dist-tag：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.PATCH \
  -f tag=vYYYY.M.PATCH \
  -f windows_node_tag=vX.Y.Z \
  -f windows_node_installer_digests='{"OpenClawCompanion-Setup-x64.exe":"sha256:<approved-x64-sha256>","OpenClawCompanion-Setup-arm64.exe":"sha256:<approved-arm64-sha256>"}' \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f full_release_validation_run_id=<successful-full-release-validation-run-id> \
  -f npm_dist_tag=beta
```

直接提升稳定版到 `latest` 是显式的：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.PATCH \
  -f tag=vYYYY.M.PATCH \
  -f windows_node_tag=vX.Y.Z \
  -f windows_node_installer_digests='{"OpenClawCompanion-Setup-x64.exe":"sha256:<approved-x64-sha256>","OpenClawCompanion-Setup-arm64.exe":"sha256:<approved-arm64-sha256>"}' \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f full_release_validation_run_id=<successful-full-release-validation-run-id> \
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
- `preflight_run_id`: 成功的 `OpenClaw NPM Release` 预检运行 id；
  当 `publish_openclaw_npm=true` 时必需
- `full_release_validation_run_id`: 成功的 `Full Release Validation` 运行
  id；当 `publish_openclaw_npm=true` 时必需
- `windows_node_tag`: 精确的非预发布 `openclaw/openclaw-windows-node`
  发布标签；稳定版 OpenClaw 发布必需
- `windows_node_installer_digests`: 候选人已批准的紧凑 JSON 映射，将当前 Windows 安装包名称映射到其固定的 `sha256:` 摘要；稳定版 OpenClaw 发布必需
- `npm_dist_tag`：OpenClaw 包的 npm 目标标签
- `plugin_publish_scope`：默认为 `all-publishable`；仅在使用 `publish_openclaw_npm=false`
  进行聚焦的仅插件修复工作时使用 `selected`
- `plugins`：当 `plugin_publish_scope=selected` 时，以逗号分隔的 `@openclaw/*` 包名
- `publish_openclaw_npm`：默认为 `true`；仅在将该工作流用作仅插件修复编排器时设为 `false`
- `wait_for_clawhub`：默认为 `false`，因此 npm 可用性不会被 ClawHub sidecar 阻塞；仅在工作流完成必须包含
  ClawHub 完成时设为 `true`

`OpenClaw Release Checks` 接受以下由操作者控制的输入：

- `ref`: 用于验证的分支、标签或完整 commit SHA。涉及 secret 的检查
  需要解析后的 commit 可从 OpenClaw 分支或发布标签到达。
- `run_release_soak`: 为 beta 发布检查启用详尽的 live/E2E、Docker 发布路径，以及
  all-since upgrade-survivor soak。它会在 `release_profile=stable` 和
  `release_profile=full` 时被强制开启。

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
   - 在标签尚不存在之前，您可以使用当前完整的 workflow-branch commit
     SHA 来对预检工作流进行仅验证的 dry run
2. 根据需要选择 `npm_dist_tag=beta` 以使用正常的 beta-first 流程，或者仅在
   您有意直接发布稳定版时选择 `latest`
3. 在发布分支、发布标签或完整
   commit SHA 上运行 `Full Release Validation`，当您希望通过一个手动工作流获得正常 CI 以及 live prompt cache、Docker、QA Lab、
   Matrix 和 Telegram 覆盖时使用
4. 如果您有意只需要确定性的正常测试图，请改为在发布 ref 上运行手动 `CI` 工作流
5. 选择精确的非预发布 `openclaw/openclaw-windows-node` 发布标签，
   其签名的 x64 和 ARM64 安装包应当随版本发布。将其保存为
   `windows_node_tag`，并将其已验证的摘要映射保存为 `windows_node_installer_digests`。发布候选帮助程序会记录这两者，
   并将它们包含在其生成的发布命令中。
6. 保存成功的 `preflight_run_id` 和 `full_release_validation_run_id`
7. 使用相同的 `tag`、相同的 `npm_dist_tag`、
   选定的 `windows_node_tag`、其已保存的 `windows_node_installer_digests`、
   已保存的 `preflight_run_id` 和已保存的 `full_release_validation_run_id` 运行 `OpenClaw Release Publish`；
   它会先将外部化插件发布到 npm 和 ClawHub，然后再提升 OpenClaw npm 包
8. 如果发布落在 `beta` 上，请使用
   `openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流将该稳定版本从 `beta` 提升到 `latest`
9. 如果该发布有意直接发布到 `latest`，并且 `beta`
   应立即跟随同一个稳定构建，请使用相同的发布
   工作流将两个 dist-tag 都指向该稳定版本，或者让其计划中的自我修复同步稍后将 `beta` 移动过去

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
