---
summary: "完整发布验证阶段、子工作流、发布配置、重跑句柄和证据"
title: "完整发布验证"
read_when:
  - 运行或重运行完整发布验证
  - 比较 stable 和完整发布验证配置
  - 调试发布验证阶段失败
---

`Full Release Validation` 是发布总入口：用于发布前证明的唯一人工入口。大部分工作在子工作流中完成，因此某个盒子失败后可以单独重跑，而不必重新启动整个发布流程。

从受信任的工作流引用运行它，通常是 `main`，并将发布分支、标签或完整提交 SHA 作为 `ref` 传入：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.PATCH \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable
```

`provider` 也接受 `anthropic` 或 `minimax`，用于跨操作系统入门流程和端到端 agent 回合。子工作流会对 harness 使用受信任的工作流 ref，并对候选项测试使用输入的 `ref`，因此当验证较旧的发布分支或标签时，新验证逻辑仍然可用。

`release_profile=stable` 和 `release_profile=full` 始终会运行完整的 live/Docker soak。传入 `run_release_soak=true` 可在 `beta` 配置下包含相同的 soak 线路。Stable 发布会拒绝没有此 soak 和阻塞性产品性能证据的验证清单。

Package Acceptance 通常会根据解析后的 `ref` 构建候选 tarball，包括通过 `pnpm ci:full-release` 分发的完整 SHA 运行。Beta 发布之后，传入 `release_package_spec=openclaw@YYYY.M.PATCH-beta.N`，以便在发布检查、Package Acceptance、跨操作系统、release-path Docker 和 package Telegram 中复用已发布的 npm 包。只有当 Package Acceptance 需要有意证明不同包时，才使用 `package_acceptance_package_spec`。Codex 插件 live 包线路遵循相同状态：已发布的 `release_package_spec` 值会推导出 `codex_plugin_spec=npm:@openclaw/codex@<version>`；SHA/制品运行会从所选 ref 打包 `extensions/codex`；并且操作员可以直接为 `npm:`、`npm-pack:` 或 `git:` 插件源设置 `codex_plugin_spec`。该线路会授予该插件所需的显式 Codex CLI 安装批准，然后运行 Codex CLI 预检和同会话 OpenAI agent 回合。

## 顶层阶段

对于 `rerun_group=all`，`Verify Docker runtime image assets` 作业会作为门禁，先于任何其他阶段分派：它会在其他任何分派发生之前，使用 `OPENCLAW_EXTENSIONS=diagnostics-otel,codex` 构建 `runtime-assets` Docker 目标。更窄的 `rerun_group` 会跳过这个预检。

| 阶段                    | 详细信息                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 目标解析                | **作业：** `Resolve target ref`<br />**子工作流：** 无<br />**证明：** 解析发布分支、标签或完整提交 SHA，并记录所选输入。<br />**重新运行：** 如果此项失败，请重新运行总流程。                                                                                                                                                                                                                                                         |
| Docker 资产预检         | **作业：** `Verify Docker runtime image assets`<br />**子工作流：** 无<br />**证明：** 在任何其他阶段分派之前，`runtime-assets` Docker 构建目标仍然可以成功。仅在 `rerun_group=all` 时运行。<br />**重新运行：** 使用 `rerun_group=all` 重新运行总流程。                                                                                                                                                                          |
| Vitest 和常规 CI        | **作业：** `Run normal full CI`<br />**子工作流：** `CI`<br />**证明：** 针对目标 ref 的手动完整 CI 图，包括 Linux Node 车道、捆绑插件分片、插件和通道契约分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建产物冒烟检查、文档检查、Python 技能、Windows、macOS、Control UI i18n，以及通过总流程的 Android。<br />**重新运行：** `rerun_group=ci`。                           |
| 插件预发布              | **作业：** `Run plugin prerelease validation`<br />**子工作流：** `Plugin Prerelease`<br />**证明：** 仅发布相关的插件静态检查、agentic 插件覆盖、完整的插件批处理分片、插件预发布 Docker 车道，以及用于兼容性分诊的非阻塞 `plugin-inspector-advisory` 产物。<br />**重新运行：** `rerun_group=plugin-prerelease`。                                                                                           |
| 发布检查                | **作业：** `Run release/live/Docker/QA validation`<br />**子工作流：** `OpenClaw Release Checks`<br />**证明：** 安装冒烟测试、跨操作系统包检查、Package Acceptance、QA Lab 一致性、live Matrix 和 live Telegram。稳定版和完整配置文件还会运行详尽的 live/E2E 套件以及 Docker 发布路径分块；beta 可通过 `run_release_soak=true` 选择启用。<br />**重新运行：** `rerun_group=release-checks` 或更窄的 release-checks 处理方式。 |
| Package Telegram        | **作业：** `Run package Telegram E2E`<br />**子工作流：** `NPM Telegram Beta E2E`<br />**证明：** 当设置了 `release_package_spec` 或 `npm_telegram_package_spec` 时，针对已发布包的 Telegram E2E 进行定向验证。完整候选验证则使用规范的 Package Acceptance Telegram E2E。<br />**重新运行：** 在设置 `release_package_spec` 或 `npm_telegram_package_spec` 的情况下使用 `rerun_group=npm-telegram`。                                               |
| 产品性能               | **作业：** `Run product performance evidence`<br />**子工作流：** `OpenClaw Performance`<br />**证明：** 针对目标 SHA 运行发布配置文件性能测试（`profile=release`、`repeat=3`、`fail_on_regression=true`）。仅在 `rerun_group=all` 或 `rerun_group=performance` 时为必需（阻塞）；更窄的重新运行组不需要。<br />**重新运行：** `rerun_group=performance`。                                                              |
| 总验证器               | **作业：** `Verify full validation`<br />**子工作流：** 无<br />**证明：** 重新检查已记录的子运行结论，并附加来自子工作流的最慢作业表。<br />**重新运行：** 在将失败的子项重新运行至通过后，仅重新运行此作业。                                                                                                                                                                                                  |

## Docker 发布路径分块

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
| `core`                                                          | Docker 发布路径核心冒烟通道。                                                                                      |
| `package-update-openai`                                         | OpenAI 包安装/更新行为、Codex 按需安装、Codex 插件实时切换，以及 Chat Completions 工具调用。 |
| `package-update-anthropic`                                      | Anthropic 包安装和更新行为。                                                                             |
| `package-update-core`                                           | 与提供方无关的包和更新行为。                                                                              |
| `plugins-runtime-plugins`                                       | 测试插件行为的插件运行时通道。                                                                        |
| `plugins-runtime-services`                                       | 由服务支持和实时插件运行时通道；在请求时包含 OpenWebUI。                                           |
| `plugins-runtime-install-a` through `plugins-runtime-install-h` | 为并行发布验证拆分的插件安装/运行时批次。                                                      |

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
| `ci`                | 仅手动完整 CI 子项。                                                                             |
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

QA 发布检查失败会阻止正常的发布验证。QA 运行时工具覆盖检查（标准层中 `openclaw` 与 `codex` 之间的动态工具漂移）也会阻止 release-check 验证器，即使底层的 QA 运行时一致性泳道是 advisory。Tideclaw alpha 运行仍可能将非 package-safety 的发布检查泳道视为 advisory。当 `live_suite_filter` 明确请求受门控的 QA live 泳道（例如 Discord、WhatsApp 或 Slack）时，对应的 `OPENCLAW_RELEASE_QA_*_LIVE_CI_ENABLED` 仓库变量必须启用；否则输入捕获会失败，而不是静默跳过该泳道。
当你需要新的 QA 证据时，重跑 `rerun_group=qa`、`qa-parity` 或 `qa-live`。

## Evidence to Keep

Keep the `Full Release Validation` summary as the release-level index. It links child run IDs and includes the slowest job table. For failures, first check the child workflows, then rerun the minimal matching handle above.

Useful artifacts:

- `release-package-under-test` from `OpenClaw Release Checks`
- Docker release-path artifacts under `.artifacts/docker-tests/`
- Package Acceptance `package-under-test` and Docker acceptance artifacts
- Cross-OS release-check artifacts for each OS and suite
- QA parity, runtime parity, Matrix, and Telegram artifacts

## 工作流文件

- `.github/workflows/full-release-validation.yml`
- `.github/workflows/openclaw-release-checks.yml`
- `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml`
- `.github/workflows/plugin-prerelease.yml`
- `.github/workflows/install-smoke.yml`
- `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- `.github/workflows/package-acceptance.yml`
- `.github/workflows/openclaw-performance.yml`
- `.github/workflows/npm-telegram-beta-e2e.yml`
