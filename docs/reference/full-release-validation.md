---
doc-schema-version: 1
summary: "完整发布验证阶段、子工作流、发布配置文件、重运行句柄和证据"
title: "完整发布验证"
read_when:
  - 运行或重运行完整发布验证
  - 比较 stable 和完整发布验证配置
  - 调试发布验证阶段失败
---

`完整发布验证` 是发布产品验证的总入口。大部分工作
都发生在子工作流中，因此失败的分支可以单独重运行，而无需重新开始
整个发布流程。在冻结 Code SHA 之前先运行发布准备；当后台机器人尚未
提交时，它会刷新 Control UI 的 locale 输出，然后强制执行与发布 CI 相同的
严格零回退检查。

冻结产品完成后的变更日志前提交作为 **Code SHA**，并选择一个可信的工作流提交作为 **Tooling SHA**，然后运行：

```bash
pnpm ci:full-release \
  --sha <code-sha> \
  --target-ref release/YYYY.M.PATCH
```

`provider` 也接受 `anthropic` 或 `minimax`，用于跨操作系统引导和端到端代理运行。该辅助工具会根据 alpha/beta 软件包版本推断 `beta` 配置，否则使用 `stable`。使用 `-f key=value` 传入其他工作流输入；仅在进行广泛的建议性检查时使用 `-f release_profile=full`。
`fail_fast` 默认为 `false`，因此已分发的子工作流会完成，并同时暴露各自独立的失败。如果更偏好较短的首次失败取消路径，请传入 `-f fail_fast=true`。

该辅助工具会创建一个临时的 `release-ci/*` 引用，并将其固定到 Tooling SHA，传入 Validation SHA 作为候选引用和 `expected_sha`，并在验证后删除临时引用。对于产品验证，Validation SHA 等于 Code SHA；对于仅变更日志验证，Validation SHA 等于 Release SHA；它不是第三个发布身份。工作流会在分发子工作流之前拒绝格式错误或不匹配的 expected SHAs。每个子工作流都必须报告相同的 Tooling SHA。传入
`-f reuse_evidence=false` 以强制执行全新运行，或传入
`--workflow-sha <trusted-main-sha>` 以选择仍可从当前 `origin/main` 访问的兼容旧工作流提交。该辅助工具会拒绝未声明 `expected_sha` 分发输入的固定 Tooling SHA；它绝不会静默替换为更新的工具。工作流本身绝不会创建或更新仓库引用。

## 扩展稳定版异常情况

扩展稳定版发布要求运行的工作流和目标都位于规范分支：

```bash
RELEASE_SHA="$(git rev-parse HEAD)"
gh workflow run full-release-validation.yml \
  --ref extended-stable/YYYY.M.33 \
  -f ref=extended-stable/YYYY.M.33 \
  -f expected_sha="$RELEASE_SHA" \
  -f release_profile=stable
```

不要使用 `pnpm ci:full-release` 或 `release-ci/*`。发布会将运行的分支、head/target SHA、清单 `workflowRef`、ID 和尝试绑定到规范分支和发布提交。

回溯产品失败；对于冻结目标工具，做最小的、保持行为不变的修复；对于提供者、审批或运行器失败，在不更改源代码的情况下重试。任何分支变更都需要一次完整的新运行。不要因为目标较旧就省略所需的包、安装程序、更新、通道或 live 行为。

对于常规发布，当 Code SHA 变为绿色后，只生成并提交 `CHANGELOG.md`。这个新提交就是 **发布 SHA**。对发布 SHA 运行同样的辅助程序。只有当 GitHub 证明发布 SHA 是从 Code SHA 派生而来，并且完整的变更路径集合恰好是 `CHANGELOG.md` 时，才会复用产品证据；npm 预检和包/安装接受测试仍然会在发布 SHA 上运行。

概念阶段映射到当前输入：

- `beta-publish`：`release_profile=beta`，`run_release_soak=false`
- `postpublish-confidence`：确切的已发布包，加上
  `run_release_soak=true` 或显式的专注分组
- `stable-publish`：`release_profile=stable`

Beta-publish `all` 不包括广泛的 live/E2E soak 和 QA-live 通道。Stable 和
full 始终运行 soak。Stable 发布会拒绝没有 soak 和阻塞性产品性能证据的验证清单。

包接受测试通常会根据解析后的 `ref` 构建候选 tarball，包括通过 `pnpm ci:full-release` 分派的完整 SHA 运行。在 beta 发布之后，传入 `release_package_spec=openclaw@YYYY.M.PATCH-beta.N`，以在发布检查、包接受测试、跨 OS、发布路径 Docker 和 package Telegram 中复用已发布的 npm 包。仅当包接受测试需要有意证明不同的包时，才使用 `package_acceptance_package_spec`。Codex 插件 live 包线路遵循相同状态：已发布的 `release_package_spec` 值派生出 `codex_plugin_spec=npm:@openclaw/codex@<version>`；SHA/artifact 运行会从所选 `ref` 打包 `extensions/codex`；操作员也可以直接为 `npm:`、`npm-pack:` 或 `git:` 插件源设置 `codex_plugin_spec`。该线路会授予该插件所需的显式 Codex CLI 安装批准，然后运行 Codex CLI 预检和同会话 OpenAI agent 回合。其最后一个零重试、中等思考的回合会发送可见进度，但省略 Codex `final`，读取随机化的工作区输入，写入其精确的产物，并发送明确的完成信号。这可以捕获 v2026.7.1 回归，即一次普通的进度发送终止了该回合。

仅当发布负责人明确将包接受测试 Telegram E2E 延后到后续 beta 版本时，才使用 `-f skip_package_telegram_e2e=true`。对于 `stable` 和 `full`，该输入会被拒绝，并记录在验证证据中，同时不会禁用专门的 `rerun_group=npm-telegram` 工作流。

## 顶层阶段

对于 `rerun_group=all`，会首先运行一个 `Check for reusable validation evidence` 作业。它会查找与相同发布配置、有效浸泡设置和验证输入相匹配的最新先前绿色完整验证。精确目标重跑使用 `exact-target-full-validation-v1`。其后代中完整 delta 恰好为 `CHANGELOG.md` 的使用 `changelog-only-release-v1`；所有产品泳道都会被跳过，验证器会独立重新检查 GitHub 提交比较、不可变父工件、子运行和派发日志。任何其他目标变更都需要全新的 Code SHA 验证。传入 `reuse_evidence=false` 可强制执行全新的完整运行。证据复用仅在 `main` 或规范化、固定 SHA 的 `release-ci/*` ref 上运行，且其工作流提交仍位于受信任的 `main` 血缘上；其他工作流 ref 会重新运行所选泳道。

新的面向包的验证会在派发 Plugin Prerelease 和 OpenClaw Release Checks 之前，准备一个不可变 tarball 和一个 Docker 镜像工件。两个子流程都会在使用前验证相同的包 SHA、工件 ID、服务摘要、生产者运行尝试和 Docker 归档摘要。与包无关的裸 Docker 层使用内容寻址的 GHCR 缓存；候选特定镜像仍然是不可变的 GitHub 工件。针对显式已发布包规范的聚焦运行则会保留现有的包路径。

对于 `rerun_group=all`，还会运行一个 `Verify Docker runtime image assets` 作业，它使用 `OPENCLAW_EXTENSIONS=diagnostics-otel,codex` 构建 `runtime-assets` Docker 目标。它与其他阶段并行运行，并由总验证器强制执行；在派发之前，各泳道不再等待它。更窄的 `rerun_group` 会跳过此预检。

| 阶段                    | 详细信息                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目标解析                | **作业：** `Resolve target ref`<br />**子工作流：** 无<br />**证明：** 解析发布分支、标签或完整提交 SHA，并记录所选输入。<br />**重跑：** 如果此作业失败，重跑总流程。                                                                                                                                                                                                                                                                                                                                                  |
| 共享候选                | **作业：** `Prepare shared release candidate`<br />**子工作流：** `OpenClaw Live And E2E Checks (Reusable)`<br />**证明：** 打包并验证一个精确 SHA 的包，构建一个功能完整的 Docker 镜像，并为两个面向包的子工作流记录不可变的包和镜像工件元组。<br />**重跑：** 重跑受影响的包、Plugin Prerelease、跨操作系统或 Live/E2E 组。                                                                                                                                                       |
| Docker 资产预检         | **作业：** `Verify Docker runtime image assets`<br />**子工作流：** 无<br />**证明：** 在任何其他阶段派发之前，确认 `runtime-assets` Docker 构建目标仍然成功。仅在 `rerun_group=all` 时运行。<br />**重跑：** 使用 `rerun_group=all` 重跑总流程。                                                                                                                                                                                                                                                                               |
| Vitest 和常规 CI        | **作业：** `Run normal full CI`<br />**子工作流：** `CI`<br />**证明：** 针对目标 ref 运行手动完整 CI 图，包括 Linux Node 泳道、打包插件分片、插件和频道契约分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建工件冒烟检查、文档检查、Python 技能、Windows、macOS、Control UI i18n，以及通过总流程运行的 Android。<br />**重跑：** `rerun_group=ci`。                                                                                                                                |
| Plugin Prerelease       | **作业：** `Run plugin prerelease validation`<br />**子工作流：** `Plugin Prerelease`<br />**证明：** 仅发布版本的插件静态检查、代理式插件覆盖率、完整插件批次分片、插件预发布 Docker 泳道，以及一个非阻塞的 `plugin-inspector-advisory` 工件，用于兼容性分类。<br />**重跑：** `rerun_group=plugin-prerelease`。                                                                                                                                                                                                |
| 发布检查                | **作业：** `Run release/live/Docker/QA validation`<br />**子工作流：** `OpenClaw Release Checks`<br />**证明：** 安装冒烟检查、跨操作系统包检查、Package Acceptance 和 QA Lab 一致性。QA-live Matrix、Buzz 和 Telegram，以及受门控的 advisory Discord、WhatsApp 和 Slack，会在 stable/full、设置了 `run_release_soak=true` 的 beta，或显式的 `qa`/`qa-live` 组中运行。Stable 和 full 配置文件还会运行详尽的 Live/E2E 套件和 Docker 发布路径分块。<br />**重跑：** `rerun_group=release-checks` 或更窄的 release-checks 句柄。 |
| Package Telegram        | **作业：** `Run package Telegram E2E`<br />**子工作流：** `NPM Telegram Beta E2E`<br />**证明：** 当设置了 `release_package_spec` 或 `npm_telegram_package_spec` 时，针对已发布包运行聚焦的 Telegram E2E。完整候选验证则使用规范的 Package Acceptance Telegram E2E。<br />**重跑：** 在设置 `release_package_spec` 或 `npm_telegram_package_spec` 的情况下使用 `rerun_group=npm-telegram`。                                                                                                                                                    |
| 产品性能                | **作业：** `Run product performance evidence`<br />**子工作流：** `OpenClaw Performance`<br />**证明：** 针对目标 SHA 运行发布配置的性能测试（`profile=release`、`repeat=3`、`fail_on_regression=true`、`publish_reports=false`）。Kova 输出保留在工作流工件中，且子流程必须证明其报告发布器已跳过。仅在 `rerun_group=all` 或 `rerun_group=performance` 时为必需项（阻塞项）；对于更窄的重跑组则不是必需项。<br />**重跑：** `rerun_group=performance`。                                       |
| 总流程验证器            | **作业：** `Verify full validation`<br />**子工作流：** 无<br />**证明：** 重新检查记录的子运行结论，并附加子工作流中的最慢作业表。<br />**重跑：** 在重跑失败的子流程并使其变为绿色后，仅重跑此作业。                                                                                                                                                                                                                                                                                                       |

总任务始终以仅产物模式派发产品性能。
`OpenClaw Performance` 仅允许在计划运行或显式设置 `publish_reports=true` 的手动派发中发布报告。仅产物守卫必须成功完成，以证明报告发布器作业保持跳过。新的和复用的证据记录都带有
`controls.performanceReportPublication=artifact-only`；验证器和复用选择器会拒绝没有匹配的规范化性能子任务证明的证据。

验证器会将规范化清单上传为
`full-release-validation-<run-id>-<run-attempt>`。证据工具在下载该精确工件 ID 之前，会验证其工件 ID、摘要、生产者运行和尝试次数。它会限制下载的 ZIP 大小，使用 REST `sha256:` 摘要校验其字节，并且在不解压归档的情况下流式读取唯一允许的受限清单条目。为了兼容旧版发布消费者，稳定名称别名会暂时保留。验证器始终优先使用带尝试号的工件；作为过渡，它仅接受由 attempt-1 的 manifest v2 生产者生成的稳定名称。对于更后面的尝试和 manifest v3，它会拒绝这种旧名称。

并发性由 Validation SHA、Tooling SHA 和重跑组作为键，不会取消较旧的运行。父流程取消或超时后，会让一个已接管且经过身份检查的子流程继续运行。当它不再有用时，显式取消该精确子流程。

## 发布检查阶段

`OpenClaw Release Checks` 是最大的子工作流。它会先解析目标一次，并在可用时验证 umbrella 的共享包制品。对于直接或定向触发的调度，当包或面向 Docker 的阶段需要时，它会准备自己的 `release-package-under-test` 制品。

| 阶段                    | 详情                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 发布目标                | **作业：** `Resolve target ref`<br />**依托工作流：** 无<br />**测试：** 选定的 ref、可选的预期 Validation SHA、配置文件、重新运行组以及聚焦的实时套件筛选器。<br />**重新运行：** `rerun_group=release-checks`。                                                                                                                                                                                                                                                                                                                                                  |
| 包制品                  | **作业：** `Prepare release package artifact`<br />**依托工作流：** 无<br />**测试：** 验证 umbrella 的不可变包元组，或者为直接／聚焦的 Release Checks 调度打包一个候选 tarball，然后将其提供给下游面向包的检查。<br />**重新运行：** 受影响的包、跨操作系统或实时／E2E 组。                                                                                                                                                                                                                                |
| 安装冒烟                | **作业：** `Run install smoke`<br />**依托工作流：** `Install Smoke`<br />**测试：** 完整安装路径，包括根 Dockerfile 冒烟镜像复用、QR 包安装、根和 gateway Docker 冒烟测试、安装程序 Docker 测试，以及 Bun 全局安装 image-provider 冒烟测试。<br />**重新运行：** `rerun_group=install-smoke`。                                                                                                                                                                                                                                                           |
| 跨操作系统              | **作业：** `cross_os_release_checks`<br />**依托工作流：** `OpenClaw Cross-OS Release Checks (Reusable)`<br />**测试：** 针对选定 provider 和模式，在 Linux、Windows 和 macOS 上使用候选 tarball 加基线包执行全新安装和升级流程。<br />**重新运行：** `rerun_group=cross-os`。                                                                                                                                                                                                                                                                 |
| 仓库和实时 E2E           | **作业：** `Run repo/live E2E validation`<br />**依托工作流：** `OpenClaw Live And E2E Checks (Reusable)`<br />**测试：** 仓库 E2E、实时缓存、OpenAI websocket 流式传输、原生实时 provider 和插件分片，以及由 `release_profile` 选择的基于 Docker 的实时模型／后端／gateway 测试框架。<br />**运行条件：** `run_release_soak=true`、`release_profile=full` 或聚焦的 `rerun_group=live-e2e`。<br />**重新运行：** `rerun_group=live-e2e`，可选择同时提供 `live_suite_filter`。                                                                                |
| Docker 发布路径         | **作业：** `Run Docker release-path validation`<br />**依托工作流：** `OpenClaw Live And E2E Checks (Reusable)`<br />**测试：** 针对共享包制品执行发布路径 Docker 分块测试。<br />**运行条件：** `run_release_soak=true`、`release_profile=full` 或聚焦的 `rerun_group=live-e2e`。<br />**重新运行：** `rerun_group=live-e2e`。                                                                                                                                                                                                                                     |
| 包验收                  | **作业：** `Run package acceptance`<br />**依托工作流：** `Package Acceptance`<br />**测试：** 离线插件包 fixture、插件更新、规范的 mock-OpenAI Telegram 包 E2E，以及针对同一 tarball 的已发布升级存活检查。阻塞式发布检查使用默认的最新已发布基线；soak 检查（`run_release_soak=true`）会扩展到最近 4 个稳定 npm 发布版本以及 3 个固定的历史版本（`2026.4.23`、`2026.5.2`、`2026.4.15`），并针对已报告问题的升级 fixture 运行。<br />**重新运行：** `rerun_group=package`。 |
| 成熟度评分卡            | **作业：** `Render maturity scorecard release docs`<br />**依托工作流：** `maturity-scorecard.yml`<br />**测试：** 针对目标 ref 渲染建议性的成熟度评分卡文档。只有传入 `run_maturity_scorecard=true` 时才会运行。<br />**重新运行：** `rerun_group=qa`，并传入 `run_maturity_scorecard=true`。                                                                                                                                                                                                                                                           |
| QA 一致性               | **作业：** `Run QA Lab parity lane` 和 `Run QA Lab parity report`<br />**依托工作流：** 直接作业<br />**测试：** 候选和基线 agentic 一致性包，然后生成一致性报告。<br />**重新运行：** `rerun_group=qa-parity` 或 `rerun_group=qa`。                                                                                                                                                                                                                                                                                                                         |
| QA 运行时一致性         | **作业：** `Verify QA Lab runtime-pair lanes`<br />**依托工作流：** 直接作业<br />**测试：** 规范的核心 `openclaw`／`codex` 通道（`pnpm openclaw qa suite --runtime-pair openclaw,codex --runtime-pair-lane core`），以及在 `run_release_soak=true` 时运行的 soak 通道。建议性说明：单个通道作业不会阻塞 release-check 验证器。<br />**重新运行：** `rerun_group=qa-parity` 或 `rerun_group=qa`。                                                                                                                                                             |
| QA 运行时工具覆盖       | **作业：** `Enforce QA Lab runtime tool coverage`<br />**依托工作流：** 直接作业<br />**测试：** 规范核心运行时配对通道中 `openclaw` 与 `codex` 之间的动态工具漂移（`pnpm openclaw qa coverage --tools`），使用该通道的输出。阻塞性说明：此作业不能被建议性覆盖。<br />**重新运行：** `rerun_group=qa-parity` 或 `rerun_group=qa`。                                                                                                                                                                                                     |
| QA 实时 Matrix           | **作业：** `Run QA Live Matrix catalog`<br />**依托工作流：** `QA-Lab - All Lanes` 可复用工作流<br />**测试：** 通过 `qa-live-shared` 环境中的共享 Matrix 实时适配器运行由目录生成的 YAML 场景，并分布到确定性分片中。<br />**重新运行：** `rerun_group=qa-live` 或 `rerun_group=qa`；使用 `live_suite_filter=qa-live-matrix` 进行聚焦的 Matrix 重新运行。                                                                                                                                                                         |
| QA 实时 Buzz             | **作业：** `Run QA Lab live Buzz lane`<br />**依托工作流：** `QA-Lab - All Lanes` 可复用工作流<br />**测试：** 通过真实 Buzz 插件，使用专用的 Convex 租用身份和托管的中继房间，执行已签名的 canary 和提及门控往返测试。<br />**重新运行：** `rerun_group=qa-live` 或 `rerun_group=qa`；使用 `live_suite_filter=qa-live-buzz` 进行聚焦的 Buzz 重新运行。                                                                                                                                                                                      |
| QA 实时 Telegram         | **作业：** `Run QA Lab live Telegram lane`<br />**依托工作流：** 受信任的 `OpenClaw Release Telegram QA` 调度<br />**测试：** 使用 Convex CI 凭据租约执行实时 Telegram QA。<br />**重新运行：** `rerun_group=qa-live` 或 `rerun_group=qa`。                                                                                                                                                                                                                                                                                                                                 |
| QA 实时 Discord          | **作业：** `Run QA Lab live Discord lane`<br />**依托工作流：** 直接的建议性作业<br />**测试：** 当启用 `OPENCLAW_RELEASE_QA_DISCORD_LIVE_CI_ENABLED` 时，使用 Convex CI 凭据租约执行实时 Discord QA。<br />**重新运行：** `rerun_group=qa-live`，并使用 `live_suite_filter=qa-live-discord`。                                                                                                                                                                                                                                                                            |
| QA 实时 WhatsApp         | **作业：** `Run QA Lab live WhatsApp lane`<br />**依托工作流：** 直接的建议性作业<br />**测试：** 当启用 `OPENCLAW_RELEASE_QA_WHATSAPP_LIVE_CI_ENABLED` 时，使用 Convex CI 凭据租约执行实时 WhatsApp QA。<br />**重新运行：** `rerun_group=qa-live`，并使用 `live_suite_filter=qa-live-whatsapp`。                                                                                                                                                                                                                                                                        |
| QA 实时 Slack            | **作业：** `Run QA Lab live Slack lane`<br />**依托工作流：** 直接的建议性作业<br />**测试：** 当启用 `OPENCLAW_RELEASE_QA_SLACK_LIVE_CI_ENABLED` 时，使用 Convex CI 凭据租约执行实时 Slack QA。<br />**重新运行：** `rerun_group=qa-live`，并使用 `live_suite_filter=qa-live-slack`。                                                                                                                                                                                                                                                                                    |
| 发布验证器              | **作业：** `Verify release checks`<br />**依托工作流：** 无<br />**测试：** 所选重新运行组所需的发布检查作业。<br />**重新运行：** 聚焦的子作业通过后重新运行。                                                                                                                                                                                                                                                                                                                                                                                   |

## Docker 发布路径分片

当 `live_suite_filter` 为空时，Docker 发布路径阶段会运行这些分片：

| 分片                                                            | 覆盖范围                                                                                                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`                                                          | Core Docker 发布路径冒烟测试通道。                                                                                                           |
| `package-update-openai`                                         | OpenAI 包安装/更新行为、Codex 按需安装、Codex 插件实时进度跟进，以及 Chat Completions 工具调用。                                             |
| `package-update-anthropic`                                      | Anthropic 包安装和更新行为。                                                                                                                 |
| `package-update-core`                                           | 与提供商无关的包和更新行为。                                                                                                                 |
| `plugins-runtime-plugins`                                       | 运行插件行为的插件运行时通道。                                                                                                               |
| `plugins-runtime-services`                                      | 基于服务和实时插件的运行时通道。                                                                                                             |
| `plugins-runtime-install-a` through `plugins-runtime-install-h` | 为并行发布验证而拆分的插件安装/运行时批次。                                                                                                  |
| `openwebui`                                                     | 请求时在专用大磁盘 runner 上隔离运行的 OpenWebUI 兼容性冒烟测试。                                                                              |

当只有一个 Docker 通道失败时，请在可复用的实时/E2E 工作流中使用有针对性的 `docker_lanes=<lane[,lane]>`。发布制品在可用时包含每个通道的重新运行命令，以及包制品和镜像复用输入。

## 发布配置文件

`release_profile` 主要控制发布检查中的 live/provider 覆盖范围。
它不会移除常规的完整 CI、Plugin Prerelease、安装冒烟测试、包验收或 QA 一致性测试。Stable 和 full 配置文件始终运行完整的 repo/live E2E、Docker 发布路径以及 QA-live 长时间稳定性测试覆盖。beta 配置文件仅在 `run_release_soak=true` 或明确重新运行 `qa` 或 `qa-live` 时，才会额外启用这些测试通道。Package Acceptance 为每个候选版本提供规范的包 Telegram E2E，因此主配置不会重复该 live 轮询器。

| 配置文件  | 预期用途                      | 包含的 live/provider 覆盖范围                                                                                                                                                                            |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beta`   | 最快的发布关键冒烟测试。   | OpenAI/core live 路径、用于 OpenAI 的 Docker live models、native gateway core、native OpenAI gateway profile、native OpenAI plugin，以及 Docker live gateway OpenAI。                                            |
| `stable` | 默认发布批准配置文件。 | `beta` 加上 Anthropic 冒烟测试、Google、MiniMax、backend、native live test harness、Docker live CLI backend、Docker ACP bind、Docker Codex harness、Docker subagent-announce，以及一个 OpenCode Go 冒烟测试分片。 |
| `full`   | 广泛的建议性全量扫描。             | `stable` 加上建议性 providers、plugin live 分片和 media live 分片。                                                                                                                               |

## 仅 full 额外包含的内容

这些套件会被 `stable` 跳过，并包含在 `full` 中：

| 区域                             | 仅 full 覆盖范围                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Docker 实时模型               | OpenCode Go、OpenRouter、xAI、Z.ai 和 Fireworks。                                                                          |
| Docker 实时网关              | 将建议性提供方拆分为 DeepSeek/Fireworks、OpenCode Go/OpenRouter 和 xAI/Z.ai 分片。                              |
| 原生网关提供方配置 | 完整的 Anthropic Opus 和 Sonnet/Haiku 分片、Fireworks、DeepSeek、完整的 OpenCode Go 模型分片、OpenRouter、xAI 和 Z.ai。 |
| 原生插件实时分片        | 插件 A-K、L-N、O-Z 其他、Moonshot 和 xAI。                                                                             |
| 原生媒体实时分片        | 音频、Google 音乐、MiniMax 音乐，以及视频组 A-D。                                                                   |

`stable` 包含 `native-live-src-gateway-profiles-anthropic-smoke` 和
`native-live-src-gateway-profiles-opencode-go-smoke`；`full` 则改用更广泛的
Anthropic 和 OpenCode Go 模型分片。定向重跑仍然可以使用聚合的
`native-live-src-gateway-profiles-anthropic` 或
`native-live-src-gateway-profiles-opencode-go` 句柄。

## 定向重跑

使用 `rerun_group` 来避免重复无关的发布区块：

| Handle              | 范围                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `all`               | 阶段默认阶段；不含 soak 的 beta 会排除广泛的 live/E2E 和 QA-live。                    |
| `ci`                | 仅手动完整 CI 子任务。                                                                      |
| `plugin-prerelease` | 仅 Plugin Prerelease 子任务。                                                                   |
| `release-checks`    | 所有 OpenClaw Release Checks 阶段。                                                             |
| `install-smoke`     | 从 Install Smoke 到发布检查。                                                           |
| `cross-os`          | 跨 OS 发布检查。                                                                        |
| `live-e2e`          | Repo/live E2E 和 Docker 发布路径验证。                                               |
| `package`           | Package Acceptance。                                                                             |
| `qa`                | QA 对等性以及 QA 实时泳道。                                                                |
| `qa-parity`         | QA 对等性泳道和报告。                                                                |
| `qa-live`           | QA live Matrix、Buzz 和 Telegram，以及启用时受门控的 Discord、WhatsApp 和 Slack 泳道。  |
| `npm-telegram`      | 已发布包的 Telegram E2E；需要 `release_package_spec` 或 `npm_telegram_package_spec`。 |
| `performance`       | 仅产品性能证据。                                                              |

当一个实时套件失败时，使用 `rerun_group=live-e2e` 搭配 `live_suite_filter`。有效的过滤器 id 定义在可复用的 live/E2E 工作流中，包括
`docker-live-models`、`live-gateway-docker`、
`live-gateway-anthropic-docker`、`live-gateway-google-docker`、
`live-gateway-minimax-docker`、`live-gateway-advisory-docker`、
`live-cli-backend-docker`、`live-acp-bind-docker`，以及
`live-codex-harness-docker`。

如需有针对性地重跑 QA 传输测试，请设置 `rerun_group=qa-live`，并使用规范选择器 `qa-live-matrix`、`qa-live-buzz`、`qa-live-telegram`、
`qa-live-discord`、`qa-live-whatsapp` 或 `qa-live-slack`。

`live-gateway-advisory-docker` handle 是其三个 provider 分片的聚合重跑 handle，因此它仍然会扩展到所有 advisory Docker gateway 作业。

当一个跨 OS 泳道失败时，使用 `rerun_group=cross-os` 搭配 `cross_os_suite_filter`。该过滤器接受一个 OS id、一个 suite id，或一个 OS／suite 对，例如 `windows/packaged-upgrade`、`windows`，或 `packaged-fresh`。跨 OS 摘要包含 packaged upgrade 泳道按阶段划分的耗时，并且长时间运行的命令会打印心跳行，因此在作业超时之前，卡住的更新是可见的。

QA 发布检查失败仅会阻塞为选定的 Matrix、Telegram 和 QA 运行时工具覆盖泳道准备的常规发布验证。QA 对等性、运行时对等性，以及受门控的 Discord、WhatsApp 和 Slack 实时泳道仅作参考，并发布状态工件，而不会阻塞发布验证器。Tideclaw alpha 运行仍可能将非包安全相关的发布检查泳道视为参考。当 `release_profile=beta` 时，`Run repo/live E2E validation` 实时提供商套件仅作参考：第三方模型部署会在发布过程中发生变化，因此 beta 会将其失败显示为警告，而 stable 和 full 配置文件仍会将其作为阻塞项。当 `live_suite_filter` 明确请求受门控的 QA 实时泳道，例如 Discord、WhatsApp 或 Slack 时，匹配的 `OPENCLAW_RELEASE_QA_*_LIVE_CI_ENABLED` 仓库变量必须启用；否则输入捕获会失败，而不是悄悄跳过该泳道。需要新的 QA 证据时，请重跑 `rerun_group=qa`、`qa-parity` 或 `qa-live`。

## 需保留的证据

将 `Full Release Validation` 摘要保留为发布级索引。它链接子运行 ID，并包含最慢作业表。将失败归类为产品、harness／工具链／来源、基础设施／凭据或包装器。只有经过确认的产品失败才会更改 Code SHA。使用一次诊断、在需要时进行一次修复和一次范围狭窄的重试，然后重新评估；不要自动重新运行 `all`。狭窄证据本身并不构成发布授权。

对于常规发布，记录 Code SHA 和 Release SHA、复用策略和变更路径集、绿色 Code SHA 父运行，以及轻量级 Release SHA 父运行。对于 extended-stable，记录规范分支、精确的 release SHA、新的父运行 ID 和尝试次数、workflow ref、每个子运行，以及任何 frozen-target 兼容性修复或有意省略。

有用的工件：

- `release-package-under-test`，来自 `OpenClaw Release Checks`
- `.artifacts/docker-tests/` 下的 Docker 发布路径工件
- Package Acceptance 的 `package-under-test` 和 Docker 验收工件
- 每个操作系统和套件的跨操作系统发布检查工件
- QA parity、runtime parity，以及选定的 Matrix、Buzz、Telegram、Discord、
  WhatsApp 或 Slack 工件

## 工作流文件

- `.github/workflows/full-release-validation.yml`
- `.github/workflows/openclaw-release-checks.yml`
- `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml`
- `.github/workflows/plugin-prerelease.yml`
- `.github/workflows/install-smoke.yml`
- `.github/workflows/install-smoke-reusable.yml`
- `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- `.github/workflows/package-acceptance.yml`
- `.github/workflows/openclaw-performance.yml`
- `.github/workflows/npm-telegram-beta-e2e.yml`
