---
summary: "完整发布验证阶段、子工作流、发布配置、重跑句柄和证据"
title: "完整发布验证"
read_when:
  - 运行或重运行完整发布验证
  - 比较 stable 和完整发布验证配置
  - 调试发布验证阶段失败
---

`Full Release Validation` 是发布产品验证的总入口。大部分工作都发生在子工作流中，因此某个 box 失败后可以单独重跑，而无需重新启动整个发布流程。

先将 product-complete pre-changelog commit 冻结为 **Code SHA**，然后运行：

```bash
pnpm ci:full-release \
  --sha <code-sha> \
  --target-ref release/YYYY.M.PATCH
```

`provider` 也接受 `anthropic` 或 `minimax`，用于跨操作系统入门和端到端 agent 回合。该辅助工具会根据 alpha/beta 包版本推断 `beta` 配置文件，否则推断为 `stable`。使用 `-f key=value` 传入其他工作流输入；仅在广泛的建议性扫描中使用 `-f release_profile=full`。

该辅助工具会创建一个临时的 `release-ci/*` ref，它固定指向一个可信的 `origin/main` 工作流 SHA，把目标 SHA 仅作为候选 `ref` 传入，并在验证完成后删除该临时 ref。每个被分发的子任务都必须报告同一个工作流 SHA。传入
`-f reuse_evidence=false` 可强制重新运行，或传入
`--workflow-sha <trusted-main-sha>` 以选择一个仍可从当前 `origin/main` 访问到的更旧工作流提交。该工作流绝不会自行创建或更新仓库 refs。

当 Code SHA 通过检查后，只生成并提交 `CHANGELOG.md`。这个新提交就是 **Release SHA**。对 Release SHA 运行同一个辅助工具。只有当 GitHub 证明 Release SHA 源自 Code SHA，且完整变更路径集合恰好只有 `CHANGELOG.md` 时，才会复用产品证据；不过 npm 预检和 package/install 验收仍会在 Release SHA 上运行。

`release_profile=stable` 和 `release_profile=full` 始终会运行完整的 live/Docker soak。传入 `run_release_soak=true` 可在 `beta` 配置下包含相同的 soak 线路。Stable 发布会拒绝没有此 soak 和阻塞性产品性能证据的验证清单。

Package Acceptance 通常会根据解析后的 `ref` 构建候选 tarball，包括通过 `pnpm ci:full-release` 分发的完整 SHA 运行。Beta 发布之后，传入 `release_package_spec=openclaw@YYYY.M.PATCH-beta.N`，以便在发布检查、Package Acceptance、跨操作系统、release-path Docker 和 package Telegram 中复用已发布的 npm 包。只有当 Package Acceptance 需要有意证明不同包时，才使用 `package_acceptance_package_spec`。Codex 插件 live 包线路遵循相同状态：已发布的 `release_package_spec` 值会推导出 `codex_plugin_spec=npm:@openclaw/codex@<version>`；SHA/制品运行会从所选 ref 打包 `extensions/codex`；并且操作员可以直接为 `npm:`、`npm-pack:` 或 `git:` 插件源设置 `codex_plugin_spec`。该线路会授予该插件所需的显式 Codex CLI 安装批准，然后运行 Codex CLI 预检和同会话 OpenAI agent 回合。

## 顶层阶段

对于 `rerun_group=all`，会首先运行一个 `Check for reusable validation evidence` 作业。它会查找与相同发布配置、有效浸泡设置和验证输入相匹配的最新先前绿色完整验证。精确目标重跑使用 `exact-target-full-validation-v1`。其后代中完整 delta 恰好为 `CHANGELOG.md` 的使用 `changelog-only-release-v1`；所有产品泳道都会被跳过，验证器会独立重新检查 GitHub commit 比较、不可变父工件、子运行和派发日志。任何其他目标变更都需要全新的 Code SHA 验证。传入 `reuse_evidence=false` 可强制执行全新的完整运行。证据复用仅在 `main` 或规范化、固定 SHA 的 `release-ci/*` ref 上运行，且其工作流提交仍位于受信任的 `main` 血缘上；其他工作流 ref 会重新运行所选泳道。

同样对于 `rerun_group=all`，会运行一个 `Verify Docker runtime image assets` 作业，使用 `OPENCLAW_EXTENSIONS=diagnostics-otel,codex` 构建 `runtime-assets` Docker 目标。它与其他阶段并行运行，并由总验证器强制执行；各泳道不再需要在派发前等待它完成。更窄的 `rerun_group` 会跳过此预检。

| 阶段                   | 详情                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目标解析               | **作业：** `Resolve target ref`<br />**子工作流：** 无<br />**证明：** 解析发布分支、标签或完整提交 SHA，并记录所选输入。<br />**重跑：** 如果此步骤失败，则重跑总任务。                                                                                                                                                                                                                                                                                                            |
| Docker 资产预检        | **作业：** `Verify Docker runtime image assets`<br />**子工作流：** 无<br />**证明：** 在任何其他阶段派发之前，`runtime-assets` Docker 构建目标仍然成功。仅在 `rerun_group=all` 时运行。<br />**重跑：** 使用 `rerun_group=all` 重跑总任务。                                                                                                                                                                                                                                         |
| Vitest 和普通 CI       | **作业：** `Run normal full CI`<br />**子工作流：** `CI`<br />**证明：** 针对目标 ref 的手动完整 CI 图，包括 Linux Node 泳道、打包插件分片、插件和通道契约分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建产物冒烟检查、文档检查、Python skills、Windows、macOS、Control UI i18n，以及通过总任务运行的 Android。<br />**重跑：** `rerun_group=ci`。                                                                                          |
| 插件预发布             | **作业：** `Run plugin prerelease validation`<br />**子工作流：** `Plugin Prerelease`<br />**证明：** 仅发布用插件静态检查、agentic 插件覆盖、完整插件批处理分片、插件预发布 Docker 泳道，以及用于兼容性分诊的非阻塞 `plugin-inspector-advisory` 产物。<br />**重跑：** `rerun_group=plugin-prerelease`。                                                                                                                                                          |
| 发布检查               | **作业：** `Run release/live/Docker/QA validation`<br />**子工作流：** `OpenClaw Release Checks`<br />**证明：** 安装冒烟、跨操作系统包检查、Package Acceptance、QA Lab 一致性、live Matrix，以及 live Telegram。稳定版和完整配置文件还会运行详尽的 live/E2E 套件和 Docker 发布路径分块；beta 可通过 `run_release_soak=true` 选择加入。<br />**重跑：** `rerun_group=release-checks` 或更窄的 release-checks 处理器。                                                                |
| Package Telegram       | **作业：** `Run package Telegram E2E`<br />**子工作流：** `NPM Telegram Beta E2E`<br />**证明：** 当设置了 `release_package_spec` 或 `npm_telegram_package_spec` 时，针对已发布包的聚焦 Telegram E2E。完整候选验证使用规范化的 Package Acceptance Telegram E2E 代替。<br />**重跑：** 在设置了 `release_package_spec` 或 `npm_telegram_package_spec` 时，使用 `rerun_group=npm-telegram`。                                                                                                              |
| 产品性能               | **作业：** `Run product performance evidence`<br />**子工作流：** `OpenClaw Performance`<br />**证明：** 针对目标 SHA 的发布配置文件性能运行（`profile=release`、`repeat=3`、`fail_on_regression=true`、`publish_reports=false`）。Kova 输出保留在工作流产物中，且子工作流必须证明其报告发布器被跳过。仅在 `rerun_group=all` 或 `rerun_group=performance` 时是必需的（阻塞）；更窄的重跑组不需要。<br />**重跑：** `rerun_group=performance`。 |
| 总验证器               | **作业：** `Verify full validation`<br />**子工作流：** 无<br />**证明：** 重新检查已记录的子运行结论，并附加来自子工作流的最慢作业表。<br />**重跑：** 仅在将失败的子任务重跑为绿色之后，再重跑此作业。                                                                                                                                                                                                                                                                 |

总任务始终以仅产物模式派发产品性能。
`OpenClaw Performance` 仅允许在计划运行或显式设置 `publish_reports=true` 的手动派发中发布报告。仅产物守卫必须成功完成，以证明报告发布器作业保持跳过。新的和复用的证据记录都带有
`controls.performanceReportPublication=artifact-only`；验证器和复用选择器会拒绝没有匹配的规范化性能子任务证明的证据。

验证器会将规范化清单上传为
`full-release-validation-<run-id>-<run-attempt>`。证据工具在下载该精确产物 ID 之前，会验证其产物 ID、摘要、生产者运行和尝试次数。它会限制下载的 ZIP 大小，使用 REST `sha256:` 摘要校验其字节，并且在不解压归档的情况下流式读取唯一允许的受限清单条目。为了兼容旧版发布消费者，稳定名称别名会暂时保留。验证器始终优先使用带尝试号的产物；作为过渡，它仅接受由 attempt-1 的 manifest v2 生产者生成的稳定名称。对于更后面的尝试和 manifest v3，它会拒绝这种旧名称。

对于 `ref=main` 且 `rerun_group=all` 的情况、对于 `release/*` refs，以及对于 Tideclaw alpha refs，一个更新的总运行会取代同一 ref 和 rerun group 的较旧运行。当父任务被取消时，其监视器会取消它已经派发的任何子工作流。标签和固定 SHA 的验证运行不会相互取消。

## 发布检查阶段

`OpenClaw Release Checks` 是最大的子工作流。它会先解析目标一次，并在包或 Docker 面向的阶段需要时准备一个共享的 `release-package-under-test` 制品。

| Stage                    | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ------------------------ |
| Release target           | **Job:** `Resolve target ref`<br />**Backing workflow:** none<br />**Tests:** 选定的 ref、可选的预期 SHA、profile、rerun group，以及聚焦的 live suite 过滤器。<br />**Rerun:** `rerun_group=release-checks`.                                                                                                                                                                                                                                                                                                                                                             |
| Package artifact         | **Job:** `Prepare release package artifact`<br />**Backing workflow:** none<br />**Tests:** 打包或解析一个候选 tarball，并上传 `release-package-under-test` 供下游面向 package 的检查使用。<br />**Rerun:** 受影响的 package、cross-OS，或 live/E2E 组。                                                                                                                                                                                                                                                                                             |
| Install smoke            | **Job:** `Run install smoke`<br />**Backing workflow:** `Install Smoke`<br />**Tests:** 完整安装路径，包括 root Dockerfile smoke 镜像复用、QR package 安装、root 和 gateway Docker smoke、installer Docker 测试，以及 Bun 全局安装 image-provider smoke。<br />**Rerun:** `rerun_group=install-smoke`.                                                                                                                                                                                                                                                           |
| Cross-OS                 | **Job:** `cross_os_release_checks`<br />**Backing workflow:** `OpenClaw Cross-OS Release Checks (Reusable)`<br />**Tests:** 针对所选 provider 和模式，在 Linux、Windows 和 macOS 上进行 fresh 与 upgrade 线路测试，使用候选 tarball 加上基线 package。<br />**Rerun:** `rerun_group=cross-os`.                                                                                                                                                                                                                                                                 |
| Repo and live E2E        | **Job:** `Run repo/live E2E validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests:** repository E2E、live cache、OpenAI websocket streaming、原生 live provider 和 plugin 分片，以及由 `release_profile` 选择的 Docker-backed live model/backend/gateway harnesses。<br />**Runs:** `run_release_soak=true`、`release_profile=full`，或聚焦的 `rerun_group=live-e2e`。<br />**Rerun:** `rerun_group=live-e2e`，可选配 `live_suite_filter`。                                                                                |
| Docker release path      | **Job:** `Run Docker release-path validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests:** 针对共享 package 制品的 release-path Docker chunks。<br />**Runs:** `run_release_soak=true`、`release_profile=full`，或聚焦的 `rerun_group=live-e2e`。<br />**Rerun:** `rerun_group=live-e2e`.                                                                                                                                                                                                                                     |
| Package Acceptance       | **Job:** `Run package acceptance`<br />**Backing workflow:** `Package Acceptance`<br />**Tests:** 离线插件 package fixture、插件更新、规范化的 mock-OpenAI Telegram package E2E，以及针对同一 tarball 的已发布升级幸存者检查。阻塞性发布检查使用默认的最新已发布基线；soak 检查（`run_release_soak=true`）会扩展到最近 4 个稳定 npm 版本，以及 3 个固定历史版本（`2026.4.23`、`2026.5.2`、`2026.4.15`），并针对已报告问题的升级 fixture 运行。<br />**Rerun:** `rerun_group=package`. |
| Maturity scorecard       | **Job:** `Render maturity scorecard release docs`<br />**Backing workflow:** `maturity-scorecard.yml`<br />**Tests:** 针对目标 ref 渲染建议性 maturity scorecard 文档。仅在传入 `run_maturity_scorecard=true` 时运行。<br />**Rerun:** `rerun_group=qa` with `run_maturity_scorecard=true`.                                                                                                                                                                                                                                                           |
| QA parity                | **Job:** `Run QA Lab parity lane` and `Run QA Lab parity report`<br />**Backing workflow:** 直接 job<br />**Tests:** 候选与基线的 agentic parity packs，随后生成 parity report。<br />**Rerun:** `rerun_group=qa-parity` or `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                         |
| QA runtime parity        | **Job:** `Run QA Lab runtime parity lane`<br />**Backing workflow:** 直接 job<br />**Tests:** 一个 `openclaw`/`codex` runtime-pair agentic parity lane（`pnpm openclaw qa suite --runtime-pair openclaw,codex`），包括标准 tier，以及在 `run_release_soak=true` 时的 soak tier。提示：单个失败不会阻止 release-check verifier。<br />**Rerun:** `rerun_group=qa-parity` or `rerun_group=qa`.                                                                                                                                                    |
| QA runtime tool coverage | **Job:** `Enforce QA Lab runtime tool coverage`<br />**Backing workflow:** 直接 job<br />**Tests:** 在标准 runtime-parity tier 中（`pnpm openclaw qa coverage --tools`）检测 `openclaw` 与 `codex` 之间的动态工具漂移，使用 QA runtime parity lane 的输出。阻塞：此 job 不可被建议性覆盖。<br />**Rerun:** `rerun_group=qa-parity` or `rerun_group=qa`.                                                                                                                                                                                        |
| QA live Matrix           | **Job:** `Run QA Lab live Matrix lane`<br />**Backing workflow:** 直接 job<br />**Tests:** 在 `qa-live-shared` 环境中运行快速 live Matrix QA profile。<br />**Rerun:** `rerun_group=qa-live` or `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                                                          |
| QA live Telegram         | **Job:** `Run QA Lab live Telegram lane`<br />**Backing workflow:** 直接 job<br />**Tests:** 使用 Convex CI credential leases 运行 live Telegram QA。<br />**Rerun:** `rerun_group=qa-live` or `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                                                                      |
| Release verifier         | **Job:** `Verify release checks`<br />**Backing workflow:** none<br />**Tests:** 所选 rerun group 所需的 release-check jobs。<br />**Rerun:** 在聚焦的子 job 通过后重新运行。                                                                                                                                                                                                                                                                                                                                                                                   |

## Docker 发布路径分片

当 `live_suite_filter` 为空时，Docker 发布路径阶段会运行这些分片：

| 分片                                                           | 覆盖范围                                                                                                                   |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `core`                                                          | Core Docker 发布路径冒烟通道。                                                                                      |
| `package-update-openai`                                         | OpenAI 包安装/更新行为、Codex 按需安装、Codex 插件 live 转换，以及 Chat Completions 工具调用。 |
| `package-update-anthropic`                                      | Anthropic 包安装和更新行为。                                                                             |
| `package-update-core`                                           | 与提供方无关的包和更新行为。                                                                              |
| `plugins-runtime-plugins`                                       | 运行插件行为的插件运行时通道。                                                                        |
| `plugins-runtime-services`                                      | 基于服务和 live 插件运行时通道。                                                                              |
| `plugins-runtime-install-a` through `plugins-runtime-install-h` | 为并行发布验证拆分的插件安装/运行批次。                                                      |
| `openwebui`                                                     | 在需要时，在专用的大磁盘 runner 上隔离运行 OpenWebUI 兼容性冒烟测试。                                    |

当只有一个 Docker 通道失败时，请在可复用的 live/E2E 工作流中使用有针对性的 `docker_lanes=<lane[,lane]>`。发布制品在可用时包含每个通道的重新运行命令，以及包制品和镜像复用输入。

## 发布配置文件

`release_profile` 主要控制发布检查中的 live/provider 广度。它不会移除正常的完整 CI、Plugin Prerelease、install smoke、package acceptance 或 QA Lab。稳定版和完整版配置文件始终运行详尽的仓库/live E2E 和 Docker 发布路径浸泡覆盖。beta 配置文件可以通过 `run_release_soak=true` 选择启用。Package Acceptance 为每个完整候选版本提供规范的包 Telegram E2E，因此总入口不会重复该 live 轮询器。

| 配置文件  | 预期用途                      | 包含的 live/provider 覆盖范围                                                                                                                                                                            |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beta`   | 最快的发布关键冒烟测试。   | OpenAI/core live 路径、用于 OpenAI 的 Docker live models、native gateway core、native OpenAI gateway profile、native OpenAI plugin，以及 Docker live gateway OpenAI。                                            |
| `stable` | 默认发布批准配置文件。 | `beta` 加上 Anthropic smoke、Google、MiniMax、backend、native live test harness、Docker live CLI backend、Docker ACP bind、Docker Codex harness、Docker subagent-announce，以及一个 OpenCode Go smoke shard。 |
| `full`   | 广泛的建议性全量扫描。             | `stable` 加上建议性 providers、plugin live shards 和 media live shards。                                                                                                                               |

## 仅 full 额外包含的内容

这些套件会被 `stable` 跳过，并包含在 `full` 中：

| Area                             | Full-only coverage                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Docker live models               | OpenCode Go、OpenRouter、xAI、Z.ai 和 Fireworks。                                                                          |
| Docker live gateway              | 将建议性提供方拆分为 DeepSeek/Fireworks、OpenCode Go/OpenRouter 和 xAI/Z.ai 分片。                              |
| Native gateway provider profiles | 完整的 Anthropic Opus 和 Sonnet/Haiku 分片、Fireworks、DeepSeek、完整的 OpenCode Go model 分片、OpenRouter、xAI 和 Z.ai。 |
| Native plugin live shards        | Plugins A-K、L-N、O-Z other、Moonshot 和 xAI。                                                                             |
| Native media live shards         | 音频、Google music、MiniMax music，以及视频组 A-D。                                                                   |

`stable` 包含 `native-live-src-gateway-profiles-anthropic-smoke` 和
`native-live-src-gateway-profiles-opencode-go-smoke`；`full` 则改用更广泛的
Anthropic 和 OpenCode Go model 分片。定向重跑仍然可以使用聚合的
`native-live-src-gateway-profiles-anthropic` 或
`native-live-src-gateway-profiles-opencode-go` 句柄。

## 定向重跑

使用 `rerun_group` 来避免重复无关的发布区块：

| Handle              | 范围                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `all`               | 所有完整发布验证阶段。                                                                           |
| `ci`               | 仅手动完整 CI 子项。                                                                             |
| `plugin-prerelease` | 仅插件预发布子项。                                                                               |
| `release-checks`    | 所有 OpenClaw 发布检查阶段。                                                                     |
| `install-smoke`     | 从安装冒烟到发布检查。                                                                           |
| `cross-os`          | 跨 OS 发布检查。                                                                                 |
| `live-e2e`          | 仓库/实时 E2E 和 Docker 发布路径验证。                                                           |
| `package`           | 包接受。                                                                                         |
| `qa`                | QA 一致性加上 QA 实时泳道。                                                                      |
| `qa-parity`         | QA 一致性泳道，仅报告。                                                                          |
| `qa-live`           | QA 实时 Matrix/Telegram，以及在启用时受门控的 Discord、WhatsApp 和 Slack 泳道。                |
| `npm-telegram`      | 已发布包的 Telegram E2E；需要 `release_package_spec` 或 `npm_telegram_package_spec`。          |
| `performance`       | 仅产品性能证据。                                                                                 |

当一个 live 套件失败时，使用 `rerun_group=live-e2e` 搭配 `live_suite_filter`。有效的过滤器 id 定义在可复用的 live/E2E 工作流中，包括
`docker-live-models`、`live-gateway-docker`、
`live-gateway-anthropic-docker`、`live-gateway-google-docker`、
`live-gateway-minimax-docker`、`live-gateway-advisory-docker`、
`live-cli-backend-docker`、`live-acp-bind-docker`，以及
`live-codex-harness-docker`。

`live-gateway-advisory-docker` 句柄是其三个提供方分片的聚合重跑句柄，因此它仍会分发到所有 advisory Docker gateway 作业。

当一个跨 OS 泳道失败时，使用 `rerun_group=cross-os` 搭配 `cross_os_suite_filter`。该过滤器接受一个 OS id、一个 suite id，或一个 OS/suite 对，例如 `windows/packaged-upgrade`、`windows`，或 `packaged-fresh`。跨 OS 摘要包含 packaged upgrade 泳道按阶段划分的耗时，并且长时间运行的命令会打印心跳行，因此在作业超时之前，卡住的更新是可见的。

QA 发布检查失败会阻止正常的发布验证。QA 运行时工具覆盖检查（`openclaw` 与 `codex` 在标准层级之间的动态工具漂移）也会阻止发布检查验证器，即使底层的 QA 运行时一致性泳道只是建议性的。Tideclaw alpha 运行仍可能将非包安全性的发布检查泳道视为建议性的。使用 `release_profile=beta` 时，`Run repo/live E2E validation` 的 live-provider 泳道是建议性的：第三方模型部署会在发布过程中发生变化，因此 beta 会将其失败显示为警告，而稳定版和完整配置文件仍会将其视为阻断项。 当
`live_suite_filter` 明确请求受门控的 QA live 泳道，例如 Discord、WhatsApp 或 Slack 时，匹配的 `OPENCLAW_RELEASE_QA_*_LIVE_CI_ENABLED` 仓库变量必须启用；否则输入捕获会失败，而不是静默跳过该泳道。
当你需要新的 QA 证据时，请重跑 `rerun_group=qa`、`qa-parity` 或 `qa-live`。

## 需保留的证据

将 `Full Release Validation` 摘要保留为发布级索引。它会链接子运行 ID，并包含最慢任务表。对于失败，先检查子工作流，然后重新运行上面的最小匹配处理程序。

记录 Code SHA 和 Release SHA、复用策略以及变更路径集合、绿色的 Code SHA 父运行，以及轻量级的 Release SHA 父运行。

有用的工件：

- 来自 `OpenClaw Release Checks` 的 `release-package-under-test`
- `.artifacts/docker-tests/` 下的 Docker release-path 工件
- Package Acceptance 的 `package-under-test` 和 Docker acceptance 工件
- 每个 OS 和套件的跨 OS release-check 工件
- QA parity、runtime parity、Matrix 和 Telegram 工件

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
