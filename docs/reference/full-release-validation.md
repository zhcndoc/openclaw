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

## 顶层阶段

| Stage                 | Details                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target resolution     | **Job:** `Resolve target ref`<br />**Child workflow:** none<br />**Proves:** resolves the release branch, tag, or full commit SHA and records selected inputs.<br />**Rerun:** rerun the umbrella if this fails.                                                                                                                                                                              |
| Vitest and normal CI  | **Job:** `Run normal full CI`<br />**Child workflow:** `CI`<br />**Proves:** manual full CI graph against the target ref, including Linux Node lanes, bundled plugin shards, channel contracts, Node 22 compatibility, `check`, `check-additional`, build smoke, docs checks, Python skills, Windows, macOS, Control UI i18n, and Android via the umbrella.<br />**Rerun:** `rerun_group=ci`. |
| Plugin prerelease     | **Job:** `Run plugin prerelease validation`<br />**Child workflow:** `Plugin Prerelease`<br />**Proves:** release-only plugin static checks, agentic plugin coverage, full extension batch shards, and plugin prerelease Docker lanes.<br />**Rerun:** `rerun_group=plugin-prerelease`.                                                                                                       |
| Release checks        | **Job:** `Run release/live/Docker/QA validation`<br />**Child workflow:** `OpenClaw Release Checks`<br />**Proves:** install smoke, cross-OS package checks, live/E2E suites, Docker release-path chunks, Package Acceptance, QA Lab parity, live Matrix, and live Telegram.<br />**Rerun:** `rerun_group=release-checks` or a narrower release-checks handle.                                |
| Post-publish Telegram | **Job:** `Run post-publish Telegram E2E`<br />**Child workflow:** `NPM Telegram Beta E2E`<br />**Proves:** optional published-package Telegram proof when `npm_telegram_package_spec` is set.<br />**Rerun:** `rerun_group=npm-telegram`.                                                                                                                                                     |
| Umbrella verifier     | **Job:** `Verify full validation`<br />**Child workflow:** none<br />**Proves:** re-checks recorded child run conclusions and appends slowest-job tables from child workflows.<br />**Rerun:** rerun only this job after rerunning a failed child to green.                                                                                                                                   |

对于 `ref=main` 且 `rerun_group=all` 的情况，更新的 umbrella 会取代较旧的 umbrella。
当父工作流被取消时，其监控器会取消它已经派发的任何子工作流。默认情况下，发布分支和标签验证运行不会相互取消。

## 发布检查阶段

`OpenClaw Release Checks` 是最大的子工作流。它会解析目标一次，并在包
或面向 Docker 的阶段需要时准备一个共享的 `release-package-under-test` 产物。

| Stage               | Details                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release target      | **Job:** `Resolve target ref`<br />**Backing workflow:** none<br />**Tests:** selected ref, optional expected SHA, profile, rerun group, and focused live suite filter.<br />**Rerun:** `rerun_group=release-checks`.                                                                                                                                                                           |
| Package artifact    | **Job:** `Prepare release package artifact`<br />**Backing workflow:** none<br />**Tests:** packs or resolves one candidate tarball and uploads `release-package-under-test` for downstream package-facing checks.<br />**Rerun:** the affected package, cross-OS, or live/E2E group.                                                                                                           |
| Install smoke       | **Job:** `Run install smoke`<br />**Backing workflow:** `Install Smoke`<br />**Tests:** full install path with root Dockerfile smoke image reuse, QR package install, root and gateway Docker smokes, installer Docker tests, Bun global install image-provider smoke, and fast bundled-plugin install/uninstall E2E.<br />**Rerun:** `rerun_group=install-smoke`.                              |
| Cross-OS            | **Job:** `cross_os_release_checks`<br />**Backing workflow:** `OpenClaw Cross-OS Release Checks (Reusable)`<br />**Tests:** fresh and upgrade lanes on Linux, Windows, and macOS for the selected provider and mode, using the candidate tarball plus a baseline package.<br />**Rerun:** `rerun_group=cross-os`.                                                                               |
| Repo and live E2E   | **Job:** `Run repo/live E2E validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests:** repository E2E, live cache, OpenAI websocket streaming, native live provider and plugin shards, and Docker-backed live model/backend/gateway harnesses selected by `release_profile`.<br />**Rerun:** `rerun_group=live-e2e`, optionally with `live_suite_filter`. |
| Docker release path | **Job:** `Run Docker release-path validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests:** release-path Docker chunks against the shared package artifact.<br />**Rerun:** `rerun_group=live-e2e`.                                                                                                                                                      |
| Package Acceptance  | **Job:** `Run package acceptance`<br />**Backing workflow:** `Package Acceptance`<br />**Tests:** offline plugin package fixtures, plugin update, and mock-OpenAI Telegram package acceptance against the same tarball.<br />**Rerun:** `rerun_group=package`.                                                                                                                                  |
| QA parity           | **Job:** `Run QA Lab parity lane` and `Run QA Lab parity report`<br />**Backing workflow:** direct jobs<br />**Tests:** candidate and baseline agentic parity packs, then the parity report.<br />**Rerun:** `rerun_group=qa-parity` or `rerun_group=qa`.                                                                                                                                       |
| QA live Matrix      | **Job:** `Run QA Lab live Matrix lane`<br />**Backing workflow:** direct job<br />**Tests:** fast live Matrix QA profile in the `qa-live-shared` environment.<br />**Rerun:** `rerun_group=qa-live` or `rerun_group=qa`.                                                                                                                                                                        |
| QA live Telegram    | **Job:** `Run QA Lab live Telegram lane`<br />**Backing workflow:** direct job<br />**Tests:** live Telegram QA with Convex CI credential leases.<br />**Rerun:** `rerun_group=qa-live` or `rerun_group=qa`.                                                                                                                                                                                    |
| Release verifier    | **Job:** `Verify release checks`<br />**Backing workflow:** none<br />**Tests:** required release-check jobs for the selected rerun group.<br />**Rerun:** rerun after focused child jobs pass.                                                                                                                                                                                                 |

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

`release_profile` 只控制 release 检查中的 live/provider 范围。它不会移除正常的完整 CI、Plugin Prerelease、install smoke、package acceptance、QA Lab 或 Docker release-path 分块。

| Profile   | Intended use                      | Included live/provider coverage                                                                                                                                               |
| --------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimum` | 最快的发布关键冒烟。   | OpenAI/core live path、用于 OpenAI 的 Docker live models、native gateway core、native OpenAI gateway profile、native OpenAI plugin，以及 Docker live gateway OpenAI。               |
| `stable`  | 默认发布审批配置。 | `minimum` 加上 Anthropic、Google、MiniMax、backend、native live test harness、Docker live CLI backend、Docker ACP bind、Docker Codex harness，以及一个 OpenCode Go 冒烟分片。 |
| `full`    | 广泛的建议性扫描。             | `stable` 加上建议性提供方、plugin live 分片，以及 media live 分片。                                                                                                  |

## 仅 full 额外包含的内容

这些套件会被 `stable` 跳过，并包含在 `full` 中：

| Area                             | Full-only coverage                                                              |
| -------------------------------- | ------------------------------------------------------------------------------- |
| Docker live models               | OpenCode Go、OpenRouter、xAI、Z.ai 和 Fireworks。                              |
| Docker live gateway              | 针对 DeepSeek、Fireworks、OpenCode Go、OpenRouter、xAI 和 Z.ai 的建议性分片。 |
| Native gateway provider profiles | Fireworks、DeepSeek、完整的 OpenCode Go model 分片、OpenRouter、xAI 和 Z.ai。  |
| Native plugin live shards        | Plugins A-K、L-N、O-Z other、Moonshot 和 xAI。                                 |
| Native media live shards         | Audio、Google music、MiniMax music 和 video groups A-D。                       |

`stable` 包含 `native-live-src-gateway-profiles-opencode-go-smoke`；`full`
则使用更广泛的 OpenCode Go model 分片。

## 定向重跑

使用 `rerun_group` 来避免重复无关的发布区块：

| Handle              | Scope                                             |
| ------------------- | ------------------------------------------------- |
| `all`               | 所有 Full Release Validation 阶段。               |
| `ci`                | 仅手动 full CI 子项。                        |
| `plugin-prerelease` | 仅 Plugin Prerelease 子项。                     |
| `release-checks`    | 所有 OpenClaw Release Checks 阶段。               |
| `install-smoke`     | 从 Install Smoke 到 release checks。             |
| `cross-os`          | 跨 OS release checks。                          |
| `live-e2e`          | 仓库/live E2E 和 Docker release-path 验证。 |
| `package`           | Package Acceptance。                               |
| `qa`                | QA parity 加上 QA live 通道。                     |
| `qa-parity`         | 仅 QA parity 通道和报告。                  |
| `qa-live`           | 仅 QA live Matrix 和 Telegram。          |
| `npm-telegram`      | 仅可选的发布后 Telegram E2E。          |

当一个 live 套件失败时，使用 `rerun_group=live-e2e` 搭配 `live_suite_filter`。有效的过滤器 id 定义在可复用的 live/E2E 工作流中，包括
`docker-live-models`、`live-gateway-docker`、
`live-gateway-anthropic-docker`、`live-gateway-google-docker`、
`live-gateway-minimax-docker`、`live-gateway-advisory-docker`、
`live-cli-backend-docker`、`live-acp-bind-docker`，以及
`live-codex-harness-docker`。

## 需要保留的证据

保留 `Full Release Validation` 摘要作为发布级索引。它链接子运行 id，并包含最慢作业表。对于失败，先检查子工作流，然后重跑上面最小匹配的 handle。

有用的制品：

- 来自 `OpenClaw Release Checks` 的 `release-package-under-test`
- `.artifacts/docker-tests/` 下的 Docker release-path 制品
- Package Acceptance 的 `package-under-test` 和 Docker acceptance 制品
- 每个 OS 和套件的 Cross-OS release-check 制品
- QA parity、Matrix 和 Telegram 制品

## 工作流文件

- `.github/workflows/full-release-validation.yml`
- `.github/workflows/openclaw-release-checks.yml`
- `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml`
- `.github/workflows/plugin-prerelease.yml`
- `.github/workflows/install-smoke.yml`
- `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- `.github/workflows/package-acceptance.yml`
