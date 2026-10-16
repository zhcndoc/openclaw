---
doc-schema-version: 1
summary: "发布配置文件覆盖范围、仅完整添加内容以及重点重新运行句柄和套件过滤器"
title: "发布配置文件和重点重播"
read_when:
  - "比较测试版、稳定版和完整配置文件覆盖范围"
  - "选择专注的 rerun_group 或套件过滤器"
---

## <a id="release-profiles"></a> 发布配置文件

`release_profile` 控制 live/provider 内部释放检查的宽度。 [扩展稳定和仅变更日志验证](/reference/full-release-validation/extended-stable)中描述的有界标准β门也选择以npm-为中心的CI并推迟性能和Telegram置信度。插件预发布、安装烟雾、包接受和 QA 奇偶校验保持选中状态。稳定且完整的配置文件始终运行详尽的 repo/live E2E、Docker 释放路径和 QA-live 浸泡覆盖。 Beta 配置文件仅使用 `run_release_soak=true`、显式 `qa-live` 控制器重试或直接子级手动 `qa` 聚合来添加这些通道。包装验收选定时提供标准包装 Telegram E2E； beta `all` 不带浸泡，将其推迟到信心工作。

| 配置文件  | 预期用途                      | 包含的 live/provider 覆盖范围                                                                                                                                                                            |
| -------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beta`   | 最快的释放关键烟雾。   | OpenAI/core 实时路径、OpenAI 的 Docker 实时模型、本机网关核心、本机 OpenAI 网关配置文件、本机 OpenAI 插件和 Docker 实时网关 OpenAI。                                            |
| `stable` | 默认发布批准配置文件。 | `beta` 加上 Anthropic 冒烟测试、Google、MiniMax、backend、native live test harness、Docker live CLI backend、Docker ACP bind、Docker Codex harness、Docker subagent-announce，以及一个 OpenCode Go 冒烟测试分片。 |
| `full`   | 广泛的提供商扫描。             | `stable` 加上其他提供商、插件实时分片和媒体实时分片。                                                                                                                             |

## <a id="full-only-additions"></a> 仅 full 额外包含的内容

这些套件会被 `stable` 跳过，并包含在 `full` 中：

| 区域                             | 仅 full 覆盖范围                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Docker 实时模型               | OpenCode Go、OpenRouter、xAI、Z.ai 和 Fireworks。                                                                          |
| Docker 实时网关              | 其他提供商分为 DeepSeek/Fireworks、OpenCode、Go/OpenRouter 和 xAI/Z.ai 分片。                            |
| 本机网关提供商配置文件 | 完整 Anthropic Opus 和 Sonnet/Haiku 分片、Fireworks、DeepSeek、完整 OpenCode Go 模型分片、OpenRouter、xAI、和 Z.ai. |
| 原生插件实时分片        | 插件 A-K、L-N、O-Z 其他、Moonshot 和 xAI。                                                                             |
| 原生媒体实时分片         | 音频、Google 音乐、MiniMax 音乐，以及视频组 A-D。                                                                   |

`stable` 包含 `native-live-src-gateway-profiles-anthropic-smoke` 和 `native-live-src-gateway-profiles-opencode-go-smoke`；`full` 则改用更广泛的 Anthropic 和 OpenCode Go 模型分片。定向重跑仍然可以使用聚合的 `native-live-src-gateway-profiles-anthropic` 或 `native-live-src-gateway-profiles-opencode-go` 句柄。

当选择 repo/live 覆盖范围时，每个配置文件还运行 `live-cache`：存储的提供商楼层、传输前缀断言以及 Anthropic 消息和 OpenAI 响应的实时代理场景。当其凭证存在时，传输场景也会选择 OpenRouter。代理场景强制执行完整历史请求并补充持续的提示状态；它不会重新启动网关进程或覆盖保留的 HTTP 继续请求。这包含在默认的 stable/full 验证中；不带浸泡的 beta 保留其延迟的 repo/live 覆盖范围。请参阅 [Prompt-cache regressioncoverage](/help/testing/suites#prompt-cache-regression-coverage) 了解命令、估计成本以及与脱机许可代理和经过身份验证的网关 chat/subagent-completion 覆盖范围与进程内服务器 stop/start. 的区别

## <a id="focused-reruns"></a> 定向重跑

使用 `rerun_group` 来避免重复无关的发布区块：

| 处理              | 范围                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `all`               | 个人资料选择的资格；不带浸泡的标准 beta 使用 `npm-beta-v1`；常规稳定版使用 `npm-stable-v1`，它仅延迟本机应用程序。 |
| `ci`                | 仅手动完整 CI 子任务。                                                                                                                         |
| `plugin-prerelease` | 仅 Plugin Prerelease 子任务。                                                                                                                      |
| `install-smoke`     | 从 Install Smoke 到发布检查。                                                                                                              |
| `cross-os`          | 跨 OS 发布检查。                                                                                                                           |
| `live-e2e`          | Repo/live E2E 和 Docker 发布路径验证。                                                                                                  |
| `package`           | 包裹验收。                                                                                                                                |
| `qa-parity`         | QA 奇偶校验、运行时-pair/restart 和运行时工具覆盖范围。                                                                                        |
| `qa-live`           | QA live Matrix、Buzz 和 Telegram，以及启用时受门控的 Discord、WhatsApp 和 Slack 泳道。                                                     |
| `npm-telegram`      | 已发布包的 Telegram E2E；需要 `release_package_spec` 或 `npm_telegram_package_spec`。                                                    |
| `performance`       | 仅产品性能证据。                                                                                                                 |

当一个现场套件失败时，将 `live_suite_filter` 与 `rerun_group=live-e2e` 结合使用。之前的`release-checks`聚合重试句柄无效。它默默地扩展到每个发布检查通道，包括包和 Docker 设置。对失效表面进行分类后，选取一组混凝土。 umbrella/controller 也拒绝 `qa`；直接 `OpenClaw Release Checks` 调度只能将其用作 `qa-parity` 和 `qa-live` 的有意手动聚合。 Live 和 QA-live 过滤器必须与其所属组匹配； `all` 也接受交叉 OS 滤波器。不匹配会在调度之前失败，并且永远不会扩大到未经过滤的运行。有效过滤器ID在可重用的live/E2E工作流程中定义，包括`live-cache`、`docker-live-models`、`live-gateway-docker`、`live-gateway-anthropic-docker`、`live-gateway-google-docker`、`live-gateway-minimax-docker`、`live-gateway-advisory-docker`、 `live-cli-backend-docker`、`live-cli-cache-docker`、`live-acp-bind-docker` 和 `live-codex-harness-docker`。

对于集中的 QA 传输重新运行，请设置 `rerun_group=qa-live` 并使用标准选择器 `qa-live-matrix`、`qa-live-buzz`、`qa-live-telegram`、`qa-live-discord`、`qa-live-whatsapp` 或 `qa-live-slack`。

`live-gateway-advisory-docker` 句柄是其三个提供商分片的聚合重新运行句柄，因此它仍然扇出到所有其他 Docker 网关作业。

当一个跨 OS 通道出现故障时，将 `cross_os_suite_filter` 与 `rerun_group=cross-os` 结合使用。该过滤器接受逗号分隔的 OS id、套件 id 或 OS/suite 对，例如 `windows/packaged-upgrade`、`windows` 或 `packaged-fresh`。全组运行必须保留每个 OS/suite 对：接受 `-f cross_os_suite_filter=ubuntu,windows,macos` 或 `packaged-fresh,installer-fresh,packaged-upgrade`，而任何忽略九个 Linux/Windows/macOS 安装和升级对之一的全组过滤器在计划前都会被拒绝。所有选定的跨 OS 结果在失败时都会阻止。每次全组运行必须保留全部九个 install/upgrade 组合。每个选定的车道都必须成功。任何运营商豁免都不能授权发布失败的选定测试。稳定的发表需要 stable/full 证据、浸泡和阻塞性能。

跳过或推迟的尝试永远不会报告为已通过。当 `live_suite_filter` 显式请求门控 QA 实时通道（例如 Discord、WhatsApp 或 Slack）时，必须启用匹配的 `OPENCLAW_RELEASE_QA_*_LIVE_CI_ENABLED` 存储库变量；否则输入捕获会失败，而不是默默地跳过通道。使用控制器组 `qa-parity` 或 `qa-live` 获取新的 QA 证据。直接手动 `OpenClaw Release Checks` 调度可以使用 `qa` 来聚合两者。
