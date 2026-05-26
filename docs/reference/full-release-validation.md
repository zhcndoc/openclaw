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

默认情况下，`release_profile=stable` 会运行发布阻断的通道，并跳过
全面的 live/Docker soak。传入 `run_release_soak=true` 可在 stable 运行中包含
soak 通道。`release_profile=full` 总是启用 soak 通道，因此广泛的建议型配置不会默默丢失覆盖范围。

Package Acceptance 通常会根据解析后的 `ref` 构建候选 tarball，包括通过
`pnpm ci:full-release` 触发的完整 SHA 运行。在 beta 发布后，传入
`release_package_spec=openclaw@YYYY.M.D-beta.N`，即可在发布检查、Package Acceptance、
跨操作系统、release-path Docker 和 package Telegram 中复用已发布的 npm 包。仅当
Package Acceptance 需要有意证明不同包时，才使用 `package_acceptance_package_spec`。
Codex 插件 live 包通道遵循相同状态：已发布的 `release_package_spec` 值会派生出
`codex_plugin_spec=npm:@openclaw/codex@<version>`；SHA/制品运行会从所选 ref 打包 `extensions/codex`；
并且操作员可以直接为 `npm:`、`npm-pack:` 或 `git:` 插件源设置 `codex_plugin_spec`。
该通道会授予该插件所需的显式 Codex CLI 安装批准，然后运行 Codex CLI 预检和同会话的 OpenAI agent turn。

## 顶层阶段

| Stage                | Details                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target resolution    | **Job:** `Resolve target ref`<br />**Child workflow:** none<br />**Proves:** resolves the release branch, tag, or full commit SHA and records selected inputs.<br />**Rerun:** rerun the umbrella if this fails.                                                                                                                                                                                                                               |
| Vitest and normal CI | **Job:** `Run normal full CI`<br />**Child workflow:** `CI`<br />**Proves:** manual full CI graph against the target ref, including Linux Node lanes, bundled plugin shards, plugin and channel contract shards, Node 22 compatibility, `check-*`, `check-additional-*`, built-artifact smoke checks, docs checks, Python skills, Windows, macOS, Control UI i18n, and Android via the umbrella.<br />**Rerun:** `rerun_group=ci`.             |
| Plugin prerelease    | **Job:** `Run plugin prerelease validation`<br />**Child workflow:** `Plugin Prerelease`<br />**Proves:** release-only plugin static checks, agentic plugin coverage, full extension batch shards, plugin prerelease Docker lanes, and a non-blocking `plugin-inspector-advisory` artifact for compatibility triage.<br />**Rerun:** `rerun_group=plugin-prerelease`.                                                                          |
| Release checks       | **Job:** `Run release/live/Docker/QA validation`<br />**Child workflow:** `OpenClaw Release Checks`<br />**Proves:** install smoke, cross-OS package checks, Package Acceptance, QA Lab parity, live Matrix, and live Telegram. With `run_release_soak=true` or `release_profile=full`, also runs exhaustive live/E2E suites and Docker release-path chunks.<br />**Rerun:** `rerun_group=release-checks` or a narrower release-checks handle. |
| Package artifact     | **Job:** `Prepare release package artifact`<br />**Child workflow:** none<br />**Proves:** creates the parent `release-package-under-test` tarball early enough for package-facing checks that do not need to wait for `OpenClaw Release Checks`.<br />**Rerun:** rerun the umbrella or provide `release_package_spec` for published-package reruns.                                                                                           |
| Package Telegram     | **Job:** `Run package Telegram E2E`<br />**Child workflow:** `NPM Telegram Beta E2E`<br />**Proves:** parent-artifact-backed Telegram package proof for `rerun_group=all` with `release_profile=full`, or published-package Telegram proof when `release_package_spec` or `npm_telegram_package_spec` is set.<br />**Rerun:** `rerun_group=npm-telegram` with `release_package_spec` or `npm_telegram_package_spec`.                           |
| Umbrella verifier    | **Job:** `Verify full validation`<br />**Child workflow:** none<br />**Proves:** re-checks recorded child run conclusions and appends slowest-job tables from child workflows.<br />**Rerun:** rerun only this job after rerunning a failed child to green.                                                                                                                                                                                    |

## Docker 发布路径分块

当 `live_suite_filter` 为空时，Docker release-path 阶段运行以下分块：

| Chunk                                                           | Coverage                                                                                                                   |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `core`                                                          | Core Docker release-path smoke lanes.                                                                                      |
| `package-update-openai`                                         | OpenAI package install/update behavior, Codex on-demand install, Codex plugin live turns, and Chat Completions tool calls. |
| `package-update-anthropic`                                      | Anthropic package install and update behavior.                                                                             |
| `package-update-core`                                           | Provider-neutral package and update behavior.                                                                              |
| `plugins-runtime-plugins`                                       | Plugin runtime lanes that exercise plugin behavior.                                                                        |
| `plugins-runtime-services`                                       | Service-backed and live plugin runtime lanes; includes OpenWebUI when requested.                                           |
| `plugins-runtime-install-a` through `plugins-runtime-install-h` | Plugin install/runtime batches split for parallel release validation.                                                      |

当只有一个 Docker 通道失败时，请在可复用的 live/E2E 工作流中使用有针对性的 `docker_lanes=<lane[,lane]>`。发布制品在可用时包含每个通道的重新运行命令，以及包制品和镜像复用输入。

## 发布配置文件

`release_profile` 主要控制发布检查中的 live/provider 覆盖范围。  
它不会移除正常的 full CI、Plugin Prerelease、install smoke、package
acceptance 或 QA Lab。对于 `stable`，详尽的 repo/live E2E 和 Docker
release-path 分块属于 soak 覆盖，并在 `run_release_soak=true` 时运行。  
`full` 会强制开启 soak 覆盖，并且在 `rerun_group=all` 时还会让 umbrella 运行针对父级发布包制品执行 package Telegram
E2E，因此完整的预发布候选不会悄悄跳过该 Telegram 包通道。

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

| Handle              | Scope                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `all`               | 所有 Full Release Validation 阶段。                                                             |
| `ci`               | 仅手动 full CI 子流程。                                                                        |
| `plugin-prerelease` | 仅 Plugin Prerelease 子流程。                                                                   |
| `release-checks`    | 所有 OpenClaw Release Checks 阶段。                                                             |
| `install-smoke`     | 从 install smoke 到 release checks。                                                           |
| `cross-os`          | Cross-OS release checks。                                                                      |
| `live-e2e`          | 仓库/live E2E 和 Docker release-path 验证。                                                   |
| `package`           | Package Acceptance。                                                                           |
| `qa`                | QA parity 加上 QA live lanes。                                                                  |
| `qa-parity`         | QA parity lanes，且仅报告。                                                                     |
| `qa-live`           | 仅 QA live Matrix 和 Telegram。                                                                 |
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

QA release-check lanes 除了标准运行时工具覆盖门禁之外均为建议性。标准层级中所需的 OpenClaw 动态工具漂移会阻止 release-check 验证器；其他仅 QA 的失败会作为警告报告。当你需要新的 QA 证据时，重跑 `rerun_group=qa`、`qa-parity` 或 `qa-live`。

## 要保留的证据

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
