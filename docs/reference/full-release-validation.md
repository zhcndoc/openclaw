---
summary: "完整发布验证阶段、子工作流、发布配置、重跑句柄和证据"
title: "完整发布验证"
read_when:
  - 运行或重运行完整发布验证
  - 比较 stable 和完整发布验证配置
  - 调试发布验证阶段失败
---

`Full Release Validation` 是发布总入口。它是预发布证明的唯一手动
入口，但大部分工作发生在子工作流中，因此失败的 box 可以在不重启整个发布的情况下重跑。

从受信任的工作流引用运行它，通常是 `main`，并将发布分支、标签或完整提交 SHA 作为 `ref` 传入：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable
```

子工作流对 harness 使用受信任的工作流引用，对正在测试的候选项使用输入
`ref`。这样即使在验证较旧的发布分支或标签时，也能使用新的验证逻辑。

Package Acceptance 通常会从解析后的 `ref` 构建候选 tarball，包括通过 `pnpm ci:full-release` 触发的完整 SHA 运行。发布后，改为传入 `package_acceptance_package_spec=openclaw@YYYY.M.D`（或 `openclaw@beta` / `openclaw@latest`），以在已发布的 npm 包上运行同样的包/更新矩阵。

## 顶层阶段

| 阶段                 | 详情                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目标解析             | **任务：** `Resolve target ref`<br />**子工作流：** 无<br />**证明：** 解析发布分支、标签或完整提交 SHA，并记录所选输入。<br />**重跑：** 如果此处失败，重跑总入口。                                                                                                                                                                                                                      |
| Vitest 和常规 CI     | **任务：** `Run normal full CI`<br />**子工作流：** `CI`<br />**证明：** 针对目标 ref 的手动完整 CI 图，包括 Linux Node 线路、打包的插件分片、通道契约、Node 22 兼容性、`check`、`check-additional`、构建 smoke、文档检查、Python skills、Windows、macOS、Control UI i18n，以及通过总入口的 Android。<br />**重跑：** `rerun_group=ci`。 |
| 插件预发布           | **任务：** `Run plugin prerelease validation`<br />**子工作流：** `Plugin Prerelease`<br />**证明：** 仅发布时的插件静态检查、agentic 插件覆盖、完整扩展批处理分片，以及插件预发布 Docker 线路。<br />**重跑：** `rerun_group=plugin-prerelease`。                                                                                                    |
| 发布检查             | **任务：** `Run release/live/Docker/QA validation`<br />**子工作流：** `OpenClaw Release Checks`<br />**证明：** 安装 smoke、跨操作系统包检查、live/E2E 套件、Docker 发布路径分块、Package Acceptance、QA Lab 一致性、live Matrix，以及 live Telegram。<br />**重跑：** `rerun_group=release-checks` 或更窄的 release-checks 句柄。                                |
| 包工件               | **任务：** `Prepare release package artifact`<br />**子工作流：** 无<br />**证明：** 足够早地创建父级 `release-package-under-test` tarball，以供不需要等待 `OpenClaw Release Checks` 的面向包检查使用。<br />**重跑：** 重跑总入口，或为 `rerun_group=npm-telegram` 提供 `npm_telegram_package_spec`。                                   |
| Package Telegram    | **任务：** `Run package Telegram E2E`<br />**子工作流：** `NPM Telegram Beta E2E`<br />**证明：** 在 `release_profile=full` 且 `rerun_group=all` 时，基于父工件的 Telegram 包证明；或者在设置了 `npm_telegram_package_spec` 时，对已发布包进行 Telegram 证明。<br />**重跑：** 使用 `npm_telegram_package_spec` 的 `rerun_group=npm-telegram`。                              |
| 总入口验证器         | **任务：** `Verify full validation`<br />**子工作流：** 无<br />**证明：** 重新检查已记录的子运行结论，并附加来自子工作流的最慢任务表。<br />**重跑：** 在重跑失败的子项并修复为绿色后，只重跑此任务。                                                                                                                                   |

对于 `ref=main` 且 `rerun_group=all` 的情况，更新的总入口会取代较旧的总入口。
当父工作流被取消时，其监控器会取消它已经派发的任何子工作流。默认情况下，发布分支和标签验证运行不会相互取消。

## 发布检查阶段

`OpenClaw Release Checks` 是最大的子工作流。它会解析目标一次，并在包
或面向 Docker 的阶段需要时准备一个共享的 `release-package-under-test` 产物。

| 阶段                | 详情                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 发布目标            | **任务：** `Resolve target ref`<br />**承载工作流：** 无<br />**测试：** 所选 ref、可选的期望 SHA、配置文件、重跑组，以及聚焦的 live 套件过滤器。<br />**重跑：** `rerun_group=release-checks`。                                                                                                                                                                           |
| 包工件              | **任务：** `Prepare release package artifact`<br />**承载工作流：** 无<br />**测试：** 打包或解析一个候选 tarball，并上传 `release-package-under-test` 供下游面向包的检查使用。<br />**重跑：** 受影响的包、跨操作系统组或 live/E2E 组。                                                                                                           |
| 安装 smoke          | **任务：** `Run install smoke`<br />**承载工作流：** `Install Smoke`<br />**测试：** 完整安装路径，包括 root Dockerfile smoke 镜像复用、QR 包安装、root 和 gateway Docker smoke、安装器 Docker 测试、Bun 全局安装镜像提供者 smoke，以及快速打包插件安装/卸载 E2E。<br />**重跑：** `rerun_group=install-smoke`。                              |
| 跨操作系统          | **任务：** `cross_os_release_checks`<br />**承载工作流：** `OpenClaw Cross-OS Release Checks (Reusable)`<br />**测试：** 针对所选 provider 和 mode，在 Linux、Windows 和 macOS 上运行全新与升级线路，使用候选 tarball 加上基线包。<br />**重跑：** `rerun_group=cross-os`。                                                                               |
| 仓库与 live E2E     | **任务：** `Run repo/live E2E validation`<br />**承载工作流：** `OpenClaw Live And E2E Checks (Reusable)`<br />**测试：** 仓库 E2E、live 缓存、OpenAI websocket 流式传输、原生 live provider 和插件分片，以及由 `release_profile` 选择的 Docker 支持的 live model/backend/gateway harness。<br />**重跑：** `rerun_group=live-e2e`，可选配 `live_suite_filter`。 |
| Docker 发布路径     | **任务：** `Run Docker release-path validation`<br />**承载工作流：** `OpenClaw Live And E2E Checks (Reusable)`<br />**测试：** 针对共享包工件的发布路径 Docker 分块。<br />**重跑：** `rerun_group=live-e2e`。                                                                                                                                                      |
| Package Acceptance  | **任务：** `Run package acceptance`<br />**承载工作流：** `Package Acceptance`<br />**测试：** 离线插件包 fixture、插件更新、mock-OpenAI Telegram 包接受性，以及从 `2026.4.23` 或之后的每个稳定 npm 发布版进行的已发布升级幸存者检查，针对同一个 tarball。<br />**重跑：** `rerun_group=package`。                                         |
| QA 一致性           | **任务：** `Run QA Lab parity lane` 和 `Run QA Lab parity report`<br />**承载工作流：** 直接任务<br />**测试：** 候选和基线 agentic 一致性包，然后是一致性报告。<br />**重跑：** `rerun_group=qa-parity` 或 `rerun_group=qa`。                                                                                                                                       |
| QA live Matrix      | **任务：** `Run QA Lab live Matrix lane`<br />**承载工作流：** 直接任务<br />**测试：** 在 `qa-live-shared` 环境中运行快速 live Matrix QA 配置文件。<br />**重跑：** `rerun_group=qa-live` 或 `rerun_group=qa`。                                                                                                                                                                        |
| QA live Telegram    | **任务：** `Run QA Lab live Telegram lane`<br />**承载工作流：** 直接任务<br />**测试：** 使用 Convex CI 凭证租约的 live Telegram QA。<br />**重跑：** `rerun_group=qa-live` 或 `rerun_group=qa`。                                                                                                                                                                                    |
| 发布验证器          | **任务：** `Verify release checks`<br />**承载工作流：** 无<br />**测试：** 所选重跑组所需的发布检查任务。<br />**重跑：** 在聚焦的子任务通过后重跑。                                                                                                                                                                                                 |

## Docker 发布路径分块

当 `live_suite_filter` 为空时，Docker release-path 阶段运行以下分块：

| Chunk                                                           | Coverage                                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `core`                                                          | 核心 Docker release-path 冒烟通道。                                   |
| `package-update-openai`                                         | OpenAI 包安装和更新行为。                             |
| `package-update-anthropic`                                      | Anthropic 包安装和更新行为。                          |
| `package-update-core`                                           | 与提供方无关的包和更新行为。                           |
| `plugins-runtime-plugins`                                       | 运行插件行为的插件运行时通道。                     |
| `plugins-runtime-services`                                      | 由服务支持的插件运行时通道；在请求时包含 OpenWebUI。 |
| `plugins-runtime-install-a` through `plugins-runtime-install-h` | 为并行发布验证拆分的插件安装/运行时批次。   |

当只有一个 Docker 通道失败时，请在可复用的 live/E2E 工作流中使用有针对性的 `docker_lanes=<lane[,lane]>`。发布制品在可用时包含每个通道的重新运行命令，以及包制品和镜像复用输入。

## 发布配置文件

`release_profile` 主要控制发布检查中的 live/provider 范围。
它不会移除正常的 full CI、Plugin Prerelease、install smoke、package
acceptance、QA Lab 或 Docker release-path 分块。`full` 还会使
umbrella 在 `rerun_group=all` 时，针对父级发布包制品运行 package Telegram E2E，
因此完整的预发布候选不会悄悄跳过那个 Telegram 包通道。

| Profile   | Intended use                      | Included live/provider coverage                                                                                                                                                     |
| --------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimum` | 最快的发布关键冒烟。   | OpenAI/core live path、用于 OpenAI 的 Docker live models、native gateway core、native OpenAI gateway profile、native OpenAI plugin，以及 Docker live gateway OpenAI。                     |
| `stable`   | 默认发布批准配置文件。 | `minimum` 再加上 Anthropic 冒烟、Google、MiniMax、backend、native live test harness、Docker live CLI backend、Docker ACP bind、Docker Codex harness，以及一个 OpenCode Go 冒烟分片。 |
| `full`    | 更广泛的建议性扫描。             | `stable` 再加上建议性提供方、插件 live 分片和媒体 live 分片。                                                                                                        |

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

| Handle              | Scope                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| `all`               | 所有 Full Release Validation 阶段。                                   |
| `ci`                | 仅手动 full CI 子流程。                                            |
| `plugin-prerelease` | 仅 Plugin Prerelease 子流程。                                         |
| `release-checks`    | 所有 OpenClaw Release Checks 阶段。                                   |
| `install-smoke`     | 从 install smoke 到 release checks。                                 |
| `cross-os`          | 跨操作系统 release checks。                                              |
| `live-e2e`          | 仓库/live E2E 和 Docker release-path 验证。                     |
| `package`           | Package Acceptance。                                                   |
| `qa`                | QA parity 加上 QA live lanes。                                         |
| `qa-parity`         | 仅 QA parity lanes 和报告。                                      |
| `qa-live`           | 仅 QA live Matrix 和 Telegram。                                     |
| `npm-telegram`      | 已发布包的 Telegram E2E；需要 `npm_telegram_package_spec`。 |

当一个 live 套件失败时，使用 `rerun_group=live-e2e` 搭配 `live_suite_filter`。有效的过滤器 id 定义在可复用的 live/E2E 工作流中，包括
`docker-live-models`、`live-gateway-docker`、
`live-gateway-anthropic-docker`、`live-gateway-google-docker`、
`live-gateway-minimax-docker`、`live-gateway-advisory-docker`、
`live-cli-backend-docker`、`live-acp-bind-docker`，以及
`live-codex-harness-docker`。

`live-gateway-advisory-docker` 句柄是其三个提供方分片的聚合重跑句柄，因此它仍会分发到所有 advisory Docker gateway 作业。

## 需要保留的证据

保留 `Full Release Validation` 摘要作为发布级索引。它链接子运行 id，并包含最慢作业表。对于失败，先检查子工作流，然后重跑上面最小匹配的 handle。

有用的制品：

- 来自 Full Release Validation 父流程和 `OpenClaw Release Checks` 的 `release-package-under-test`
- `.artifacts/docker-tests/` 下的 Docker release-path 制品
- Package Acceptance 的 `package-under-test` 和 Docker acceptance 制品
- 每个 OS 和 suite 的 Cross-OS release-check 制品
- QA parity、Matrix 和 Telegram 制品

## 工作流文件

- `.github/workflows/full-release-validation.yml`
- `.github/workflows/openclaw-release-checks.yml`
- `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml`
- `.github/workflows/plugin-prerelease.yml`
- `.github/workflows/install-smoke.yml`
- `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- `.github/workflows/package-acceptance.yml`
