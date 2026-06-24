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
  -f ref=release/YYYY.M.PATCH \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable
```

子工作流对 harness 使用受信任的工作流引用，对正在测试的候选项使用输入
`ref`。这样即使在验证较旧的发布分支或标签时，也能使用新的验证逻辑。

`release_profile=stable` 和 `release_profile=full` 始终运行详尽的
live/Docker soak。传入 `run_release_soak=true` 可在 beta profile 下包含相同的 soak 车道。Stable 发布会拒绝没有此 soak 和阻塞性产品性能证据的验证清单。

Package Acceptance 通常会从解析后的 `ref` 构建候选 tarball，包括通过 `pnpm ci:full-release` 触发的完整 SHA 运行。  
在 beta 发布之后，传入 `release_package_spec=openclaw@YYYY.M.PATCH-beta.N`，以便在发布检查、Package Acceptance、cross-OS、
release-path Docker 和 package Telegram 之间复用已发布的 npm 包。仅当 Package Acceptance 需要有意证明不同的包时，才使用
`package_acceptance_package_spec`。Codex 插件 live 包通道遵循相同状态：已发布的
`release_package_spec` 值会派生出 `codex_plugin_spec=npm:@openclaw/codex@<version>`；SHA/制品运行会从所选 `ref` 打包 `extensions/codex`；并且操作员
可以直接为 `npm:`、`npm-pack:` 或 `git:` 插件源设置 `codex_plugin_spec`。该通道授予该插件所需的明确 Codex CLI 安装批准，
然后运行 Codex CLI 预检和同会话的 OpenAI 代理轮次。

## 顶层阶段

| Stage                | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Target resolution    | **Job:** `Resolve target ref`<br />**Child workflow:** none<br />**Proves:** resolves the release branch, tag, or full commit SHA and records selected inputs.<br />**Rerun:** rerun the umbrella if this fails.                                                                                                                                                                                                                                             |
| Vitest and normal CI | **Job:** `Run normal full CI`<br />**Child workflow:** `CI`<br />**Proves:** manual full CI graph against the target ref, including Linux Node lanes, bundled plugin shards, plugin and channel contract shards, Node 22 compatibility, `check-*`, `check-additional-*`, built-artifact smoke checks, docs checks, Python skills, Windows, macOS, Control UI i18n, and Android via the umbrella.<br />**Rerun:** `rerun_group=ci`.                           |
| Plugin prerelease    | **Job:** `Run plugin prerelease validation`<br />**Child workflow:** `Plugin Prerelease`<br />**Proves:** release-only plugin static checks, agentic plugin coverage, full extension batch shards, plugin prerelease Docker lanes, and a non-blocking `plugin-inspector-advisory` artifact for compatibility triage.<br />**Rerun:** `rerun_group=plugin-prerelease`.                                                                                        |
| Release checks       | **Job:** `Run release/live/Docker/QA validation`<br />**Child workflow:** `OpenClaw Release Checks`<br />**Proves:** install smoke, cross-OS package checks, Package Acceptance, QA Lab parity, live Matrix, and live Telegram. Stable and full profiles also run exhaustive live/E2E suites and Docker release-path chunks; beta can opt in with `run_release_soak=true`.<br />**Rerun:** `rerun_group=release-checks` or a narrower release-checks handle. |
| Package Telegram     | **Job:** `Run package Telegram E2E`<br />**Child workflow:** `NPM Telegram Beta E2E`<br />**Proves:** a focused published-package Telegram E2E when `release_package_spec` or `npm_telegram_package_spec` is set. Full candidate validation uses the canonical Package Acceptance Telegram E2E instead.<br />**Rerun:** `rerun_group=npm-telegram` with `release_package_spec` or `npm_telegram_package_spec`.                                               |
| Umbrella verifier    | **Job:** `Verify full validation`<br />**Child workflow:** none<br />**Proves:** re-checks recorded child run conclusions and appends slowest-job tables from child workflows.<br />**Rerun:** rerun only this job after rerunning a failed child to green.                                                                                                                                                                                                  |

## Docker 发布路径分块

## 发布检查阶段

`OpenClaw Release Checks` 是最大的子工作流。它会先解析目标一次，并在包或 Docker 面向的阶段需要时准备一个共享的 `release-package-under-test` 制品。

| Stage               | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release target      | **Job:** `Resolve target ref`<br />**Backing workflow:** none<br />**Tests:** selected ref, optional expected SHA, profile, rerun group, and focused live suite filter.<br />**Rerun:** `rerun_group=release-checks`.                                                                                                                                                                                                                                                                              |
| Package artifact    | **Job:** `Prepare release package artifact`<br />**Backing workflow:** none<br />**Tests:** packs or resolves one candidate tarball and uploads `release-package-under-test` for downstream package-facing checks.<br />**Rerun:** the affected package, cross-OS, or live/E2E group.                                                                                                                                                                                                              |
| Install smoke       | **Job:** `Run install smoke`<br />**Backing workflow:** `Install Smoke`<br />**Tests:** full install path with root Dockerfile smoke image reuse, QR package install, root and gateway Docker smokes, installer Docker tests, Bun global install image-provider smoke, and fast bundled-plugin install/uninstall E2E.<br />**Rerun:** `rerun_group=install-smoke`.                                                                                                                                 |
| Cross-OS            | **Job:** `cross_os_release_checks`<br />**Backing workflow:** `OpenClaw Cross-OS Release Checks (Reusable)`<br />**Tests:** fresh and upgrade lanes on Linux, Windows, and macOS for the selected provider and mode, using the candidate tarball plus a baseline package.<br />**Rerun:** `rerun_group=cross-os`.                                                                                                                                                                                  |
| Repo and live E2E   | **Job:** `Run repo/live E2E validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests:** repository E2E, live cache, OpenAI websocket streaming, native live provider and plugin shards, and Docker-backed live model/backend/gateway harnesses selected by `release_profile`.<br />**Runs:** `run_release_soak=true`, `release_profile=full`, or focused `rerun_group=live-e2e`.<br />**Rerun:** `rerun_group=live-e2e`, optionally with `live_suite_filter`. |
| Docker release path | **Job:** `Run Docker release-path validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests:** release-path Docker chunks against the shared package artifact.<br />**Runs:** `run_release_soak=true`, `release_profile=full`, or focused `rerun_group=live-e2e`.<br />**Rerun:** `rerun_group=live-e2e`.                                                                                                                                                      |
| Package Acceptance  | **Job:** `Run package acceptance`<br />**Backing workflow:** `Package Acceptance`<br />**Tests:** offline plugin package fixtures, plugin update, the canonical mock-OpenAI Telegram package E2E, and published-upgrade survivor checks against the same tarball. Blocking release checks use the default latest published baseline; soak checks expand to every stable npm release at or after `2026.4.23` plus reported-issue fixtures.<br />**Rerun:** `rerun_group=package`.                   |
| QA parity           | **Job:** `Run QA Lab parity lane` and `Run QA Lab parity report`<br />**Backing workflow:** direct jobs<br />**Tests:** candidate and baseline agentic parity packs, then the parity report.<br />**Rerun:** `rerun_group=qa-parity` or `rerun_group=qa`.                                                                                                                                                                                                                                          |
| QA live Matrix      | **Job:** `Run QA Lab live Matrix lane`<br />**Backing workflow:** direct job<br />**Tests:** fast live Matrix QA profile in the `qa-live-shared` environment.<br />**Rerun:** `rerun_group=qa-live` or `rerun_group=qa`.                                                                                                                                                                                                                                                                           |
| QA live Telegram    | **Job:** `Run QA Lab live Telegram lane`<br />**Backing workflow:** direct job<br />**Tests:** live Telegram QA with Convex CI credential leases.<br />**Rerun:** `rerun_group=qa-live` or `rerun_group=qa`.                                                                                                                                                                                                                                                                                       |
| Release verifier    | **Job:** `Verify release checks`<br />**Backing workflow:** none<br />**Tests:** required release-check jobs for the selected rerun group.<br />**Rerun:** rerun after focused child jobs pass.                                                                                                                                                                                                                                                                                                    |

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

| Handle              | 范围                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `all`               | 所有 Full Release Validation 阶段。                                                             |
| `ci`               | 仅手动 full CI 子流程。                                                                         |
| `plugin-prerelease` | 仅 Plugin Prerelease 子流程。                                                                   |
| `release-checks`    | 所有 OpenClaw Release Checks 阶段。                                                             |
| `install-smoke`     | 从 Install Smoke 到 release checks。                                                           |
| `cross-os`          | Cross-OS 发布检查。                                                                            |
| `live-e2e`          | 仓库/live E2E 和 Docker 发布路径验证。                                                          |
| `package`           | Package Acceptance。                                                                            |
| `qa`                | QA parity 加上 QA live 运行线。                                                                  |
| `qa-parity`         | QA parity 运行线，仅报告。                                                                     |
| `qa-live`           | QA live Matrix/Telegram，以及在启用时受控的 Discord、WhatsApp 和 Slack 运行线。             |
| `npm-telegram`      | 已发布包的 Telegram E2E；需要 `release_package_spec` 或 `npm_telegram_package_spec`。 |

当一个 live 套件失败时，使用 `rerun_group=live-e2e` 搭配 `live_suite_filter`。有效的过滤器 id 定义在可复用的 live/E2E 工作流中，包括
`docker-live-models`、`live-gateway-docker`、
`live-gateway-anthropic-docker`、`live-gateway-google-docker`、
`live-gateway-minimax-docker`、`live-gateway-advisory-docker`、
`live-cli-backend-docker`、`live-acp-bind-docker`，以及
`live-codex-harness-docker`。

`live-gateway-advisory-docker` 句柄是其三个提供方分片的聚合重跑句柄，因此它仍会分发到所有 advisory Docker gateway 作业。

当一个 cross-OS 通道失败时，使用 `rerun_group=cross-os` 搭配 `cross_os_suite_filter`。该过滤器接受 OS id、suite id 或 OS/suite 对，例如 `windows/packaged-upgrade`、`windows` 或 `packaged-fresh`。Cross-OS
摘要包含 packaged upgrade 通道的每阶段耗时，并且长时间运行的命令会打印 heartbeat 行，因此卡住的 Windows 更新会在作业超时前可见。

QA release-check failures block normal release validation. Required OpenClaw
dynamic tool drift in the standard tier also blocks the release-check verifier.
Tideclaw alpha runs may still treat non-package-safety release-check lanes as
advisory. When `live_suite_filter` explicitly requests a gated QA live lane such
as Discord, WhatsApp, or Slack, the matching
`OPENCLAW_RELEASE_QA_*_LIVE_CI_ENABLED` repo variable must be enabled; otherwise
input capture fails instead of silently skipping the lane. Rerun `rerun_group=qa`,
`qa-parity`, or `qa-live` when you need fresh QA evidence.

## 要保留的证据

保留 `Full Release Validation` 摘要作为发布级索引。它链接子运行 id，并包含最慢作业表。对于失败，先检查子工作流，然后重跑上面最小匹配的 handle。

有用的制品：

- `release-package-under-test` from `OpenClaw Release Checks`
- Docker release-path artifacts under `.artifacts/docker-tests/`
- Package Acceptance `package-under-test` and Docker acceptance artifacts
- Cross-OS release-check artifacts for each OS and suite
- QA parity, Matrix, and Telegram artifacts

## 工作流文件

- `.github/workflows/full-release-validation.yml`
- `.github/workflows/openclaw-release-checks.yml`
- `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml`
- `.github/workflows/plugin-prerelease.yml`
- `.github/workflows/install-smoke.yml`
- `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- `.github/workflows/package-acceptance.yml`
