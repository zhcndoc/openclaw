---
summary: "QA 堆栈概览：qa-lab、qa-channel、仓库支持的场景、实时传输通道、传输适配器和报告。"
read_when:
  - 了解 QA 堆栈如何组合在一起
  - 扩展 qa-lab、qa-channel 或传输适配器
  - 添加仓库支持的 QA 场景
  - 围绕 Gateway 仪表盘构建更高真实性的 QA 自动化
title: "QA 概览"
---

私有 QA 堆栈旨在以比单个单元测试更贴近真实、具有渠道形态的方式来验证 OpenClaw。

当前组件：

- `extensions/qa-channel`：带有 DM、频道、线程、
  反应、编辑和删除表面的合成消息通道。
- `extensions/qa-lab`：用于观察转录、注入传入消息以及导出 Markdown 报告的调试器 UI 和 QA 总线。
- `extensions/qa-matrix`、未来的 runner 插件：驱动子 QA gateway 中真实频道的实时传输适配器。
- `qa/`：用于启动任务和基线 QA
  场景的仓库后备种子资源。
- [Mantis](/concepts/mantis)：针对需要真实传输、浏览器截图、VM 状态和 PR 证据的 bug，在 live verification 之前和之后进行验证。

## 命令入口

所有 QA 流程都通过 `pnpm openclaw qa <subcommand>` 运行。许多命令都有 `pnpm qa:*`
脚本别名；这两种形式都受支持。

| Command                                             | Purpose                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | Bundled QA self-check; writes a Markdown report.                                                                                                                                                                                                                        |
| `qa suite`                                          | Run repo-backed scenarios against the QA gateway lane. Aliases: `pnpm openclaw qa suite --runner multipass` for a disposable Linux VM.                                                                                                                                  |
| `qa coverage`                                       | Print the markdown scenario-coverage inventory (`--json` for machine output).                                                                                                                                                                                           |
| `qa parity-report`                                  | Compare two `qa-suite-summary.json` files and write the agentic parity report, or use `--runtime-axis --token-efficiency` to write Codex-vs-OpenClaw runtime parity and token-efficiency reports from one runtime-pair summary.                                         |
| `qa character-eval`                                 | Run the character QA scenario across multiple live models with a judged report. See [Reporting](#reporting).                                                                                                                                                            |
| `qa manual`                                         | Run a one-off prompt against the selected provider/model lane.                                                                                                                                                                                                          |
| `qa ui`                                             | Start the QA debugger UI and local QA bus (alias: `pnpm qa:lab:ui`).                                                                                                                                                                                                    |
| `qa docker-build-image`                             | Build the prebaked QA Docker image.                                                                                                                                                                                                                                     |
| `qa docker-scaffold`                                | Write a docker-compose scaffold for the QA dashboard + gateway lane.                                                                                                                                                                                                    |
| `qa up`                                             | Build the QA site, start the Docker-backed stack, print the URL (alias: `pnpm qa:lab:up`; `:fast` variant adds `--use-prebuilt-image --bind-ui-dist --skip-ui-build`).                                                                                                  |
| `qa aimock`                                         | Start only the AIMock provider server.                                                                                                                                                                                                                                  |
| `qa mock-openai`                                    | Start only the scenario-aware `mock-openai` provider server.                                                                                                                                                                                                            |
| `qa credentials doctor` / `add` / `list` / `remove` | Manage the shared Convex credential pool.                                                                                                                                                                                                                               |
| `qa matrix`                                         | Live transport lane against a disposable Tuwunel homeserver. See [Matrix QA](/concepts/qa-matrix).                                                                                                                                                                      |
| `qa telegram`                                       | Live transport lane against a real private Telegram group.                                                                                                                                                                                                              |
| `qa discord`                                        | Live transport lane against a real private Discord guild channel.                                                                                                                                                                                                       |
| `qa slack`                                          | Live transport lane against a real private Slack channel.                                                                                                                                                                                                               |
| `qa whatsapp`                                       | Live transport lane against real WhatsApp Web accounts.                                                                                                                                                                                                                 |
| `qa mantis`                                         | Before and after verification runner for live transport bugs, with Discord status-reactions evidence, Crabbox desktop/browser smoke, and Slack-in-VNC smoke. See [Mantis](/concepts/mantis) and [Mantis Slack Desktop Runbook](/concepts/mantis-slack-desktop-runbook). |

## 操作流程

当前的 QA 操作流程是一个双栏 QA 站点：

- 左侧：Gateway 仪表盘（Control UI）与 agent。
- 右侧：QA Lab，显示类似 Slack 的转录和场景计划。

使用以下命令运行：

```bash
pnpm qa:lab:up
```

这会构建 QA 站点，启动 Docker 支持的 gateway 通道，并暴露
QA Lab 页面，供操作员或自动化循环向 agent 下达 QA
任务、观察真实频道行为，以及记录哪些有效、哪些失败、哪些仍然受阻。

若想在不每次都重建 Docker 镜像的情况下更快地迭代 QA Lab UI，
可使用挂载式 QA Lab bundle 启动堆栈：

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` 会让 Docker 服务继续使用预构建镜像，并将
`extensions/qa-lab/web/dist` 挂载到 `qa-lab` 容器中。`qa:lab:watch`
会在变更时重建该 bundle，而当 QA Lab
资源哈希变化时，浏览器会自动重新加载。

用于本地 OpenTelemetry 信号 smoke，请运行：

```bash
pnpm qa:otel:smoke
```

该脚本会启动一个本地 OTLP/HTTP 接收器，运行启用了 `diagnostics-otel` 插件的 `otel-trace-smoke` QA
场景，然后断言 traces、
metrics 和 logs 已被导出。它会解码导出的 protobuf trace spans
并检查发布关键的形态：
必须存在 `openclaw.run`、`openclaw.harness.run`、一个最新的 GenAI semantic-convention
model-call span、`openclaw.context.assembled` 以及 `openclaw.message.delivery`。
该 smoke 会强制设置
`OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`，因此 model-call
span 必须使用 `{gen_ai.operation.name} {gen_ai.request.model}` 这个名称；
成功轮次中的 model calls 不得导出 `StreamAbandoned`；原始诊断 ID 和
`openclaw.content.*` 属性必须留在 trace 之外。原始 OTLP
payload 中不得包含 prompt sentinel、response sentinel 或 QA session
key。它会在 QA suite 产物旁写入 `otel-smoke-summary.json`。

用于带 collector 的 OpenTelemetry smoke，请运行：

```bash
pnpm qa:otel:collector-smoke
```

该线路会在同一个本地接收器前放置一个真实的 OpenTelemetry Collector Docker 容器。
当你在更改 endpoint 接线、collector 兼容性或进程内接收器可能掩盖的 OTLP 导出行为时，请使用它。

对于受保护的 Prometheus 抓取 smoke，请运行：

```bash
pnpm qa:prometheus:smoke
```

该别名会运行启用了 `diagnostics-prometheus` 的 `docker-prometheus-smoke` QA 场景，
验证未认证抓取会被拒绝，然后检查认证后的抓取是否包含发布关键的 metric family，
且不包含提示内容、响应内容、原始诊断标识符、auth token 或本地路径。

要连续运行两个 observability smoke，请使用：

```bash
pnpm qa:observability:smoke
```

对于带 collector 的 OpenTelemetry 线路以及受保护的 Prometheus 抓取
smoke，请使用：

```bash
pnpm qa:observability:collector-smoke
```

Observability QA 仅支持源码检出环境。npm tarball 会刻意省略
QA Lab，因此 package Docker 发布线路不会运行 `qa` 命令。在更改
diagnostics instrumentation 时，请从已构建的源码检出环境中使用
`pnpm qa:otel:smoke`、`pnpm qa:prometheus:smoke` 或
`pnpm qa:observability:smoke`。

若要运行一个真实传输的 Matrix 冒烟通道，运行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

该通道的完整 CLI 参考、profile/场景目录、环境变量和产物布局
见 [Matrix QA](/concepts/qa-matrix)。简而言之：它会在 Docker 中预置一个一次性 Tuwunel homeserver，
注册临时的 driver/SUT/observer 用户，在一个仅限该传输的子 QA gateway 中运行真实的 Matrix 插件（不使用 `qa-channel`），然后在
`.artifacts/qa-e2e/matrix-<timestamp>/` 下写入 Markdown 报告、JSON 摘要、observed-events 产物以及合并输出日志。

这些场景覆盖了单元测试无法端到端证明的传输行为：提及门控、允许 bot 策略、allowlist、顶层和线程回复、DM 路由、reaction 处理、入站编辑抑制、重启回放去重、homeserver 中断恢复、审批元数据传递、媒体处理，以及 Matrix E2EE 启动/恢复/验证流程。E2EE CLI profile 还会在检查 gateway 回复之前，通过同一个一次性 homeserver 驱动 `openclaw matrix encryption setup` 和验证命令。

Discord 也有仅限 Mantis 的可选场景用于复现 bug。使用
`--scenario discord-status-reactions-tool-only` 获取显式的状态反应
时间线，或使用 `--scenario discord-thread-reply-filepath-attachment` 创建一个
真实的 Discord 线程，并验证 `message.thread-reply` 会保留一个
`filePath` 附件。这些场景不会进入默认的 live Discord 线路，
因为它们是前后复现探针，而不是广泛的 smoke 覆盖。
如果在 QA
环境中配置了 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 或
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64`，线程附件 Mantis 流程还可以添加一段已登录的 Discord Web
见证视频。该 viewer 配置文件仅用于视觉捕获；通过/失败的
裁决仍然来自 Discord REST oracle。

CI 在 `.github/workflows/qa-live-transports-convex.yml` 中使用相同的命令面。计划任务和默认的手动运行会使用带有 live frontier 凭据的 fast Matrix profile，配合 `--fast` 和 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000`。手动 `matrix_profile=all` 会分发到五个 profile 分片，因此完整目录可以并行运行，同时为每个分片保留一个产物目录。

For transport-real Telegram, Discord, Slack, and WhatsApp smoke lanes:

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
pnpm openclaw qa whatsapp
```

They target a pre-existing real channel with two bots or accounts (driver + SUT). Required env vars, scenario lists, output artifacts, and the Convex credential pool are documented in [Telegram, Discord, Slack, and WhatsApp QA reference](#telegram-discord-slack-and-whatsapp-qa-reference) below.

若要进行带 VNC 救援的完整 Slack 桌面 VM 运行，请执行：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

该命令会租用一台 Crabbox 桌面/浏览器机器，在 VM 内运行 Slack live 线路，在 VNC 浏览器中打开 Slack Web，捕获桌面，并在可用视频捕获时将 `slack-qa/`、`slack-desktop-smoke.png` 和 `slack-desktop-smoke.mp4`
复制回 Mantis 产物目录。Crabbox
桌面/浏览器租约会预先提供捕获工具以及浏览器/本地构建辅助包，因此该场景在旧租约上应只安装回退项。Mantis 会在
`mantis-slack-desktop-smoke-report.md` 中报告总耗时和分阶段耗时，以便慢运行可以显示时间花在了
租约预热、凭据获取、远程设置还是产物复制上。通过 VNC 手动登录 Slack Web 后，
可重用 `--lease-id <cbx_...>`；重用的租约也会保持 Crabbox 的 pnpm store 缓存处于热状态。默认的
`--hydrate-mode source` 会从源码检出环境进行验证，并在 VM 内运行 install/build。
只有当重用的远程工作区已经有 `node_modules` 和构建好的 `dist/` 时才使用
`--hydrate-mode prehydrated`；该模式会跳过昂贵的 install/build 步骤，并在工作区未就绪时失败并关闭。使用
`--gateway-setup` 时，Mantis 会在 VM 内让一个持久的 OpenClaw Slack gateway 运行在端口 `38973`；不使用它时，该命令会运行正常的 bot-to-bot Slack QA 线路，并在产物捕获后退出。

要通过桌面证据证明原生 Slack 审批 UI，请运行 Mantis 审批
checkpoint 模式：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --approval-checkpoints \
  --credential-source convex \
  --credential-role maintainer
```

该模式与 `--gateway-setup` 互斥。它会运行 Slack
审批场景，拒绝非审批场景 id，在每个待处理和
已解决的审批状态处等待，将观察到的 Slack API 消息渲染到
`approval-checkpoints/<scenario>-pending.png` 和
`approval-checkpoints/<scenario>-resolved.png`，然后在任何 checkpoint、
消息证据、acknowledgement 或渲染截图缺失或为空时失败。
冷启动的 CI 租约可能仍然会在 `slack-desktop-smoke.png` 中显示 Slack 登录界面；审批 checkpoint 图像才是这条线路的视觉证明。

操作员检查清单、GitHub workflow dispatch 命令、证据评论
契约、hydrate-mode 决策表、耗时解读以及失败
处理步骤都记录在 [Mantis Slack Desktop Runbook](/concepts/mantis-slack-desktop-runbook) 中。

对于 agent/CV 风格的桌面任务，运行：

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.5
```

`visual-task` 会租用或重用一台 Crabbox 桌面/浏览器机器，启动
`crabbox record --while`，通过嵌套的 `visual-driver` 驱动可见浏览器，在选择
`--vision-mode image-describe` 时对截图运行 `openclaw infer image describe`，
并写出 `visual-task.png`、`visual-task.mp4`、
`mantis-visual-task-summary.json`、`mantis-visual-task-driver-result.json` 和 `mantis-visual-task-report.md`。
当设置了 `--expect-text` 时，视觉提示会要求结构化 JSON
裁决，并且只有当模型报告了正向可见证据时才通过；仅仅复述目标文本的负面回答会导致断言失败。
使用 `--vision-mode metadata` 可进行无需模型的 smoke 测试，以证明桌面、
浏览器、截图和视频管道可用，而无需调用图像理解
provider。录制是 `visual-task` 的必需产物；如果 Crabbox 没有录制出
任何非空的 `visual-task.mp4`，即使视觉驱动通过了，任务也会失败。在失败时，除非任务已经通过且未设置 `--keep-lease`，否则 Mantis 会保留该租约供 VNC 使用。

在使用共享的 live 凭据之前，请运行：

```bash
pnpm openclaw qa credentials doctor
```

doctor 会检查 Convex broker 环境变量，验证端点设置，并在存在维护者密钥时确认 admin/list 可达性。它只会报告密钥是已设置还是缺失。

## 实时传输覆盖

实时传输通道共享同一个契约，而不是每个通道都自行发明各自的场景列表结构。`qa-channel` 是更广泛的合成产品行为套件，不属于实时传输覆盖矩阵的一部分。

实时传输运行器应从 `openclaw/plugin-sdk/qa-live-transport-scenarios` 导入共享的场景 ID、基础覆盖帮助器以及场景选择帮助器。

| 通道     | Canary | Mention gating | Bot-to-bot | Allowlist block | 顶层回复 | 重启恢复 | 线程跟进 | 线程隔离 | 反应观测 | Help 命令 | 原生命令注册 |
| -------- | ------ | -------------- | ---------- | --------------- | -------- | -------- | -------- | -------- | -------- | --------- | ------------- |
| 矩阵     | x      | x              | x          | x               | x        | x        | x        | x        | x        |           |               |
| Telegram | x      | x              | x          |                 |          |          |          |          |          | x         |               |
| Discord  | x      | x              | x          |                 |          |          |          |          |          |           | x             |
| Slack    | x      | x              | x          | x               | x        | x        | x        | x        |          |           |               |
| WhatsApp | x      | x              |            | x               | x        | x        |          |          | x        | x         |               |

这使 `qa-channel` 保持为更广泛的产品行为套件，而 Matrix、Telegram 以及其他实时传输则共享同一份明确的传输契约检查清单。

若要在不把 Docker 带入 QA 路径的情况下使用一次性 Linux VM 通道，运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这会启动一个全新的 Multipass guest，安装依赖，在 guest 内构建 OpenClaw，
运行 `qa suite`，然后把正常的 QA 报告和摘要复制回主机上的
`.artifacts/qa-e2e/...`。
它会复用与主机上 `qa suite` 相同的场景选择行为。
主机和 Multipass 的 suite 运行默认会以并行方式执行多个已选场景，
并使用隔离的 gateway worker。`qa-channel` 默认并发度为 4，且受所选场景数量限制。
使用 `--concurrency <count>` 调整 worker 数量，或使用 `--concurrency 1` 进行串行执行。
使用 `--pack personal-agent` 运行个人助理基准测试包。
该包选择器与重复的 `--scenario` 标志是可叠加的：显式场景先运行，
然后按包顺序运行包内场景，并去重。
当自定义 QA 运行器已经提供了 OpenTelemetry collector 设置，并希望将 OpenTelemetry
和 Prometheus 诊断 smoke 场景一起选中时，使用 `--pack observability`。
当任一场景失败时，该命令会以非零状态退出。若你想要产物但不想要失败退出码，请使用
`--allow-failures`。
实时运行会转发适用于 guest 的受支持 QA 认证输入：
基于环境变量的 provider key、QA live provider 配置路径，以及存在时的 `CODEX_HOME`。
请将 `--output-dir` 保持在仓库根目录下，这样 guest 才能通过挂载的工作区写回数据。

## Telegram、Discord、Slack 和 WhatsApp QA 参考

Matrix 之所以有一个[专门页面](/concepts/qa-matrix)，是因为其场景数量较多，并且需要基于 Docker 的 homeserver 预置。Telegram、Discord、Slack 和 WhatsApp 依赖预先存在的真实传输通道运行，因此它们的参考文档放在这里。

### 共享 CLI 标志

这些通道通过 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 注册，并接受相同的标志：

| 标志                                  | 默认值                                             | 描述                                                                                                           |
| ------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                  | 仅运行此场景。可重复。                                                                                         |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/<transport>-<timestamp>` | 报告/摘要/观测消息以及输出日志的写入位置。相对路径会以 `--repo-root` 为基准解析。                              |
| `--repo-root <path>`                  | `process.cwd()`                                    | 在中性 cwd 中调用时的仓库根目录。                                                                              |
| `--sut-account <id>`                  | `sut`                                              | QA gateway 配置中的临时账户 id。                                                                                |
| `--provider-mode <mode>`              | `live-frontier`                                    | `mock-openai` 或 `live-frontier`（旧的 `live-openai` 仍然可用）。                                              |
| `--model <ref>` / `--alt-model <ref>` | provider 默认值                                     | 主/备用模型引用。                                                                                              |
| `--fast`                              | 关闭                                               | 在支持的 provider 上启用快速模式。                                                                             |
| `--credential-source <env\|convex>`   | `env`                                              | 参见 [Convex 凭证池](#convex-credential-pool)。                                                               |
| `--credential-role <maintainer\|ci>`  | 在 CI 中为 `ci`，否则为 `maintainer`                | 当使用 `--credential-source convex` 时所用的角色。                                                              |

每个通道在任一场景失败时都会以非零状态退出。`--allow-failures` 会在不设置失败退出码的情况下写入产物。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

目标是一个真实的私有 Telegram 群组，使用两个不同的机器人（driver + SUT）。SUT 机器人必须有 Telegram 用户名；当两个机器人都在 `@BotFather` 中启用 **Bot-to-Bot Communication Mode** 时，bot-to-bot 观测效果最佳。

当使用 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - 数字聊天 id（字符串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

可选：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 会在观测消息产物中保留消息正文（默认会脱敏）。

场景（`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts`）：

- `telegram-canary`
- `telegram-mention-gating`
- `telegram-mentioned-message-reply`
- `telegram-help-command`
- `telegram-commands-command`
- `telegram-tools-compact-command`
- `telegram-whoami-command`
- `telegram-status-command`
- `telegram-repeated-command-authorization`
- `telegram-other-bot-command-gating`
- `telegram-context-command`
- `telegram-current-session-status-tool`
- `telegram-reply-chain-exact-marker`
- `telegram-stream-final-single-message`
- `telegram-long-final-reuses-preview`
- `telegram-long-final-three-chunks`

隐式默认集始终涵盖 canary、mention gating、原生命令回复、命令定向以及 bot-to-bot 群组回复。`mock-openai` 默认还包括确定性的 reply-chain 和 final-message streaming 检查。`telegram-current-session-status-tool` 仍然是可选项，因为它只有在紧接 canary 之后直接串联时才稳定，而不是在任意原生命令回复之后都稳定。使用 `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` 可打印当前默认/可选拆分及回归参考。

输出产物：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - 包含每次回复的 RTT（driver 发送 → 观测到的 SUT 回复），从 canary 开始。
- `telegram-qa-observed-messages.json` - 除非设置 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`，否则正文会被脱敏。

包级 RTT 比较使用与 Telegram 相同的凭证契约，同时将其 RTT 样本控制保持在 RTT harness 路径上：

```bash
pnpm rtt openclaw@beta \
  --credential-source convex \
  --credential-role maintainer \
  --samples 20 \
  --sample-timeout-ms 30000
```

当设置了 `--credential-source convex` 时，RTT Docker 包装器会租用一个
`kind: "telegram"` 凭证，把租用到的 group/driver/SUT bot 环境变量导出到
已安装包的运行中，发送心跳维持租约，并在关闭时释放它。
`--samples` 和 `--sample-timeout-ms` 仍然会传入
`OPENCLAW_NPM_TELEGRAM_WARM_SAMPLES` 和
`OPENCLAW_NPM_TELEGRAM_SAMPLE_TIMEOUT_MS`，因此 `result.json` 在基于环境变量和基于 Convex 的 RTT 运行之间仍然可比较。

### Discord QA

```bash
pnpm openclaw qa discord
```

目标是一个真实的私有 Discord guild 频道，使用两个不同的机器人：一个由 harness 控制的 driver bot，以及一个由子 OpenClaw gateway 通过捆绑的 Discord 插件启动的 SUT bot。验证频道 mention 处理、SUT bot 是否已在 Discord 中注册原生 `/help` 命令，以及可选的 Mantis 证据场景。

当使用 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - 必须与 Discord 返回的 SUT bot user id 匹配（否则该通道会快速失败）。

可选：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 会将消息正文保留在观测消息产物中。
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` 为 `discord-voice-autojoin` 选择语音/stage 频道；若未提供，则场景会为 SUT bot 选择第一个可见的语音/stage 频道。

场景（`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`）：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - 可选语音场景。它会单独运行，启用 `channels.discord.voice.autoJoin`，并验证 SUT bot 当前的 Discord 语音状态是否为目标语音/stage 频道。Convex Discord 凭证可以包含可选的 `voiceChannelId`；否则运行器会在 guild 中发现第一个可见的语音/stage 频道。
- `discord-status-reactions-tool-only` - 可选 Mantis 场景。它会单独运行，因为它会将 SUT 切换为始终在线、仅工具的 guild 回复，并启用 `messages.statusReactions.enabled=true`，然后捕获 REST reaction 时间线以及 HTML/PNG 视觉产物。Mantis 前后报告还会将场景提供的 MP4 产物分别保留为 `baseline.mp4` 和 `candidate.mp4`。

显式运行 Discord 语音自动加入场景：

```bash
pnpm openclaw qa discord \
  --scenario discord-voice-autojoin \
  --provider-mode mock-openai
```

显式运行 Mantis 状态反应场景：

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.5 \
  --alt-model openai/gpt-5.5 \
  --fast
```

输出产物：

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` - 除非设置 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`，否则正文会被脱敏。
- `discord-qa-reaction-timelines.json` 和 `discord-status-reactions-tool-only-timeline.png`，当状态反应场景运行时生成。

### Slack QA

```bash
pnpm openclaw qa slack
```

目标是一个真实的私有 Slack 频道，使用两个不同的机器人：一个由 harness 控制的 driver bot，以及一个由子 OpenClaw gateway 通过捆绑的 Slack 插件启动的 SUT bot。

使用 `--credential-source env` 时所需环境变量：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

可选：

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` 会将消息正文保留在观测消息产物中。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 会为 Mantis 启用视觉审批检查点。运行器会写入 `<scenario>.pending.json` 和 `<scenario>.resolved.json`，然后等待匹配的 `.ack.json` 文件。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_TIMEOUT_MS` 会覆盖检查点确认超时。默认值是 `120000`。

场景（`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts`）：

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-thread-follow-up`
- `slack-thread-isolation`
- `slack-approval-exec-native` - 可选启用的原生 Slack exec 审批场景。它会通过 gateway 请求一次 exec 审批，验证 Slack 消息具有原生审批按钮，完成审批，并验证已解析的 Slack 更新。
- `slack-approval-plugin-native` - 可选启用的原生 Slack plugin 审批场景。它会同时启用 exec 和 plugin 审批转发，使 plugin 事件不会被 exec 审批路由抑制，然后验证相同的待处理/已解析原生 Slack UI 路径。

输出产物：

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` - 除非设置 `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`，否则正文会被脱敏。
- `approval-checkpoints/` - 仅在 Mantis 设置了
  `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 时存在；包含 checkpoint JSON、
  acknowledgement JSON，以及 pending/resolved 截图。

#### 设置 Slack 工作区

该通道需要同一个工作区中的两个不同 Slack 应用，以及这两个机器人都加入的一个频道：

- `channelId` - 两个机器人都已被邀请加入的频道的 `Cxxxxxxxxxx` id。请使用专用频道；该通道每次运行都会发消息。
- `driverBotToken` - **Driver** 应用的 bot token（`xoxb-...`）。
- `sutBotToken` - **SUT** 应用的 bot token（`xoxb-...`），它必须是与 driver 不同的独立 Slack 应用，这样它的 bot user id 才是不同的。
- `sutAppToken` - SUT 应用的 app-level token（`xapp-...`），带有 `connections:write`，供 Socket Mode 使用，以便 SUT 应用可以接收事件。

建议使用专用于 QA 的 Slack 工作区，而不是复用生产工作区。

下面的 SUT manifest 故意将捆绑的 Slack 插件生产安装（`extensions/slack/src/setup-shared.ts:10`）收窄为 live Slack QA 套件所覆盖的权限和事件。对于用户看到的生产频道设置，请参见 [Slack channel quick setup](/channels/slack#quick-setup)；QA Driver/SUT 对故意是分开的，因为该通道需要同一个工作区中的两个不同 bot user id。

**1. 创建 Driver 应用**

前往 [api.slack.com/apps](https://api.slack.com/apps) → _Create New App_ → _From a manifest_ → 选择 QA 工作区，粘贴以下 manifest，然后 _Install to Workspace_：

```json
{
  "display_information": {
    "name": "OpenClaw QA Driver",
    "description": "OpenClaw QA Slack live lane 的测试 driver bot"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA Driver",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["chat:write", "channels:history", "groups:history", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": false
  }
}
```

复制 _Bot User OAuth Token_（`xoxb-...`）——它会成为 `driverBotToken`。driver 只需要发送消息并标识自己；不需要事件，也不需要 Socket Mode。

**2. 创建 SUT 应用**

在同一个工作区中重复 _Create New App → From a manifest_。这个 QA 应用故意使用比捆绑的 Slack 插件生产 manifest（`extensions/slack/src/setup-shared.ts:10`）更窄的版本：省略了 reaction 作用域和事件，因为 live Slack QA 套件尚未覆盖 reaction 处理。

```json
{
  "display_information": {
    "name": "OpenClaw QA SUT",
    "description": "OpenClaw QA SUT connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA SUT",
      "always_online": true
    },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "app_mentions:read",
        "assistant:write",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "emoji:read",
        "files:read",
        "files:write",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "pins:read",
        "pins:write",
        "usergroups:read",
        "users:read"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_home_opened",
        "app_mention",
        "channel_rename",
        "member_joined_channel",
        "member_left_channel",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "pin_added",
        "pin_removed"
      ]
    }
  }
}
```

Slack 创建应用后，在其设置页面执行两件事：

- _Install to Workspace_ → 复制 _Bot User OAuth Token_ → 它会成为 `sutBotToken`。
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → 添加作用域 `connections:write` → 保存 → 复制 `xapp-...` 值 → 它会成为 `sutAppToken`。

通过对每个 token 调用 `auth.test` 来验证两个机器人具有不同的 user id。运行时通过 user id 区分 driver 和 SUT；如果两个都复用同一个应用，mention-gating 会立即失败。

**3. 创建频道**

在 QA 工作区中创建一个频道（例如 `#openclaw-qa`），并在频道内邀请两个机器人：

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

从 _channel info → About → Channel ID_ 复制 `Cxxxxxxxxxx` id——它会成为 `channelId`。公共频道也可以；如果你使用私有频道，这两个应用已经有 `groups:history`，因此 harness 的历史读取仍然会成功。

**4. 注册凭证**

有两种方式。单机调试可使用环境变量（设置四个 `OPENCLAW_QA_SLACK_*` 变量并传入 `--credential-source env`），或者将共享 Convex 池预置好，以便 CI 和其他维护者租用。

对于 Convex 池，将四个字段写入一个 JSON 文件：

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

在 shell 中导出 `OPENCLAW_QA_CONVEX_SITE_URL` 和 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 后，注册并验证：

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack pool seed"

pnpm openclaw qa credentials list --kind slack --status all --json
```

预期 `count: 1`、`status: "active"`，且没有 `lease` 字段。

**5. 端到端验证**

在本地运行该通道，以确认两个机器人可以通过 broker 相互通信：

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

一次正常通过的运行会在 30 秒内完成，且 `slack-qa-report.md` 显示 `slack-canary` 和 `slack-mention-gating` 的状态均为 `pass`。如果该通道卡住约 90 秒并以 `Convex credential pool exhausted for kind "slack"` 退出，要么池为空，要么每一行都已被租用——`qa credentials list --kind slack --status all --json` 会告诉你是哪种情况。

### WhatsApp QA

```bash
pnpm openclaw qa whatsapp
```

目标是两个专用的 WhatsApp Web 账户：一个由 harness 控制的 driver 账户，以及一个由子 OpenClaw gateway 通过捆绑的 WhatsApp 插件启动的 SUT 账户。

`--credential-source env` 时所需环境变量：

- `OPENCLAW_QA_WHATSAPP_DRIVER_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_SUT_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_DRIVER_AUTH_ARCHIVE_BASE64`
- `OPENCLAW_QA_WHATSAPP_SUT_AUTH_ARCHIVE_BASE64`

可选：

- `OPENCLAW_QA_WHATSAPP_GROUP_JID` 可启用群组场景，例如 `whatsapp-mention-gating` 和 `whatsapp-group-allowlist-block`。
- `OPENCLAW_QA_WHATSAPP_CAPTURE_CONTENT=1` 会在观测消息产物中保留消息正文。

场景目录（`extensions/qa-lab/src/live-transports/whatsapp/whatsapp-live.runtime.ts`）：

- 基线和群组门控：`whatsapp-canary`、`whatsapp-pairing-block`、`whatsapp-mention-gating`、`whatsapp-top-level-reply-shape`、`whatsapp-restart-resume`、`whatsapp-group-allowlist-block`。
- 原生命令：`whatsapp-help-command`、`whatsapp-status-command`、`whatsapp-commands-command`、`whatsapp-tools-compact-command`、`whatsapp-whoami-command`、`whatsapp-context-command`、`whatsapp-native-new-command`。
- 回复与最终输出行为：`whatsapp-tool-only-usage-footer`、`whatsapp-reply-to-message`、`whatsapp-reply-context-isolation`、`whatsapp-reply-delivery-shape`、`whatsapp-stream-final-message-accounting`。
- 入站媒体和结构化消息：`whatsapp-inbound-image-caption`、`whatsapp-audio-preflight`、`whatsapp-inbound-structured-messages`、`whatsapp-group-audio-gating`。这些场景会通过 driver 发送真实的 WhatsApp 图片、音频、文档、位置、联系人和贴纸事件。
- 出站 Gateway 和消息动作覆盖：
  `whatsapp-outbound-media-matrix`、
  `whatsapp-outbound-document-preserves-filename`、`whatsapp-outbound-poll`、
  `whatsapp-message-actions`。
- 访问控制覆盖：`whatsapp-access-control-dm-open`、
  `whatsapp-access-control-dm-disabled`、`whatsapp-access-control-group-open`、
  `whatsapp-access-control-group-disabled`、`whatsapp-group-allowlist-block`。
- 原生审批：`whatsapp-approval-exec-deny-native`、
  `whatsapp-approval-exec-native`、`whatsapp-approval-exec-reaction-native`、
  `whatsapp-approval-plugin-native`。
- 状态反应：`whatsapp-status-reactions`。

该目录目前包含 35 个场景。`live-frontier` 默认通道保持较小，仅包含 8 个场景，以便快速进行烟雾覆盖。`mock-openai` 默认通道会通过真实 WhatsApp 传输运行 29 个确定性场景，仅对模型输出进行模拟。审批场景以及少数更重/阻塞性的检查仍然必须通过场景 id 显式指定。

WhatsApp QA driver 会观察结构化实时事件（`text`、`media`、`location`、`reaction` 和 `poll`），并且可以主动发送媒体、投票、联系人、位置和贴纸。QA Lab 通过 `@openclaw/whatsapp/api.js` 包接口导入该 driver，而不是直接访问私有 WhatsApp 运行时文件。消息内容默认会脱敏。出站投票和文件上传覆盖通过确定性的 gateway `poll` 和 `message.action` 调用运行，而不是仅依赖模型提示的工具调用。

输出产物：

- `whatsapp-qa-report.md`
- `whatsapp-qa-summary.json`
- `whatsapp-qa-observed-messages.json` - 除非设置 `OPENCLAW_QA_WHATSAPP_CAPTURE_CONTENT=1`，否则正文会被脱敏。

### Convex 凭证池

Telegram、Discord、Slack 和 WhatsApp 通道可以从共享的 Convex 池中租用凭证，而不是读取上面的环境变量。传入 `--credential-source convex`（或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 会获取独占租约，在运行期间发送心跳，并在关闭时释放它。池的种类包括 `"telegram"`、`"discord"`、`"slack"` 和 `"whatsapp"`。

broker 在 `admin/add` 上验证的负载形状：

- Telegram (`kind: "telegram"`): `{ groupId: string, driverToken: string, sutToken: string }` - `groupId` 必须是数字聊天 id 字符串。
- Telegram real user (`kind: "telegram-user"`): `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }` - 仅用于 Mantis Telegram Desktop proof。通用 QA Lab 运行线不得申请此种类。
- Discord (`kind: "discord"`): `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。
- WhatsApp (`kind: "whatsapp"`): `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - 电话号码必须是不同的 E.164 字符串。

Mantis Telegram Desktop proof 工作流会为 TDLib CLI driver 和 Telegram Desktop witness 持有一个独占的 Convex
`telegram-user` 租约，然后在发布 proof 后释放它。

当某个 PR 需要确定性的视觉 diff 时，Mantis 可以在 Telegram formatter 或 delivery
层发生变化的同时，对 `main` 和 PR head 使用相同的 mock model reply。
捕获默认值针对 PR 评论进行了调优：标准 Crabbox
class、24fps 桌面录制、24fps motion GIF，以及 1920px 预览宽度。
前后对比评论应发布一个仅包含
预期 GIF 的干净 bundle。

Slack 通道也可以使用该池。Slack payload 形状检查目前位于 Slack QA runner 内，而不是 broker 中；请使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`，并提供类似 `Cxxxxxxxxxx` 的 Slack channel id。有关应用和作用域的配置，请参见[设置 Slack 工作区](#设置-slack-工作区)。

操作环境变量和 Convex broker 端点契约位于 [测试 → 通过 Convex 共享 Telegram 凭证](/help/testing#shared-telegram-credentials-via-convex-v1)（该节名称早于多通道池；租约语义在各类之间是共享的）。

## 仓库内种子

种子资产位于 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

它们故意保留在 git 中，以便 QA 计划对人和 agent 都可见。

`qa-lab` 应保持为一个通用的 Markdown 运行器。每个场景 Markdown 文件都是一次测试运行的唯一真实来源，并且应定义：

- 场景元数据
- 可选的类别、能力、通道和风险元数据
- 文档和代码引用
- 可选的插件要求
- 可选的 gateway 配置补丁
- 可执行的 `qa-flow`

支撑 `qa-flow` 的可复用运行时表面可以保持通用和跨切面。例如，Markdown 场景可以将传输侧助手与浏览器侧助手结合起来，通过 Gateway 的 `browser.request` 连接驱动嵌入式 Control UI，而无需添加特例运行器。

场景文件应按产品能力分组，而不是按源代码树目录分组。文件移动时应保持场景 ID 稳定；使用 `docsRefs` 和 `codeRefs` 进行实现可追溯性。

基线列表应保持足够广泛，以覆盖：

- DM 和频道聊天
- 线程行为
- 消息动作生命周期
- cron 回调
- 记忆回忆
- 模型切换
- 子代理交接
- 仓库读取和文档读取
- 一个小型构建任务，例如 Lobster Invaders

## 提供方 mock 通道

`qa suite` 有两个本地 provider mock 通道：

- `mock-openai` 是具备场景感知的 OpenClaw mock。它仍然是仓库内 QA 和一致性门禁的默认确定性 mock 通道。
- `aimock` 启动一个基于 AIMock 的 provider server，用于实验性的协议、fixture、record/replay 和 chaos 覆盖。它是附加性的，不会替换 `mock-openai` 的场景分发器。

provider 通道的实现位于 `extensions/qa-lab/src/providers/` 下。每个 provider 都拥有自己的默认值、本地 server 启动、gateway 模型配置、auth-profile 分阶段需求，以及 live/mock 能力标志。共享 suite 和 gateway 代码应通过 provider 注册表路由，而不是按 provider 名称分支。

## 传输适配器

`qa-lab` 为 Markdown QA 场景拥有一个通用的传输连接点。`qa-channel` 是该连接点上的第一个适配器，但设计目标更广：未来真实或合成的频道都应接入同一个 suite runner，而不是新增一个特定于传输的 QA 运行器。

在架构层面，分工如下：

- `qa-lab` 负责通用的场景执行、worker 并发、产物写入和报告。
- 传输适配器负责 gateway 配置、就绪检查、入站和出站观测、传输动作，以及标准化的传输状态。
- `qa/scenarios/` 下的 Markdown 场景文件定义测试运行；`qa-lab` 提供执行它们的可复用运行时表面。

### 添加一个频道

向 Markdown QA 系统添加频道需要恰好两件事：

1. 该频道的传输适配器。
2. 一组覆盖该频道契约的场景包。

当共享的 `qa-lab` 主机可以承载整个流程时，不要新增一个顶层 QA 命令根。

`qa-lab` 负责共享的主机机制：

- `openclaw qa` 命令根
- suite 启动与关闭
- worker 并发
- 产物写入
- 报告生成
- 场景执行
- 旧 `qa-channel` 场景的兼容别名

Runner 插件负责传输契约：

- `openclaw qa <runner>` 如何挂载到共享 `qa` 根下面
- 如何为该传输配置 gateway
- 如何检查就绪
- 如何注入入站事件
- 如何观测出站消息
- 如何暴露转写记录和标准化的传输状态
- 如何执行传输支持的动作
- 如何处理传输特定的重置或清理

新频道的最低接入标准：

1. 保持 `qa-lab` 作为共享 `qa` 根的所有者。
2. 在共享 `qa-lab` 主机连接点上实现传输 runner。
3. 将传输特定机制保留在 runner 插件或频道 harness 内部。
4. 以 `openclaw qa <runner>` 的形式挂载 runner，而不是注册一个竞争性的根命令。Runner 插件应在 `openclaw.plugin.json` 中声明 `qaRunners`，并从 `runtime-api.ts` 导出匹配的 `qaRunnerCliRegistrations` 数组。保持 `runtime-api.ts` 轻量；懒加载 CLI 和 runner 执行应保留在独立入口之后。
5. 在主题化的 `qa/scenarios/` 目录下编写或改造 Markdown 场景。
6. 对新场景使用通用场景助手。
7. 除非仓库正在进行有意的迁移，否则保持现有兼容别名可用。

决策规则很严格：

- 如果行为可以在 `qa-lab` 中只实现一次，就把它放在 `qa-lab`。
- 如果行为依赖于某个频道传输，就把它保留在那个 runner 插件或插件 harness 中。
- 如果某个场景需要一个多个频道都能使用的新能力，添加一个通用助手，而不是在 `suite.ts` 中写特定频道分支。
- 如果某个行为只对一种传输有意义，就让该场景保持传输特定，并在场景契约中明确说明。

### 场景助手名称

新场景推荐使用的通用助手名称：

- `waitForTransportReady`
- `waitForChannelReady`
- `injectInboundMessage`
- `injectOutboundMessage`
- `waitForTransportOutboundMessage`
- `waitForChannelOutboundMessage`
- `waitForNoTransportOutbound`
- `getTransportSnapshot`
- `readTransportMessage`
- `readTransportTranscript`
- `formatTransportTranscript`
- `resetTransport`

兼容别名仍对现有场景可用 - `waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus` - 但新的场景编写应使用通用名称。这些别名的存在是为了避免一次性迁移，而不是作为未来的模型。

## 报告

`qa-lab` 会从观测到的总线时间线导出一份 Markdown 协议报告。  
报告应回答：

- 哪些工作正常
- 哪些失败了
- 哪些仍然被阻塞
- 值得补充哪些后续场景

如需查看可用场景清单——在评估后续工作量或接入新传输时很有用——请运行 `pnpm openclaw qa coverage`（加上 `--json` 可获得机器可读输出）。
当需要为某个已触及的行为或文件路径选择有针对性的证明时，请运行 `pnpm openclaw qa coverage --match <query>`。
匹配报告会搜索场景元数据、文档引用、代码引用、覆盖 ID、插件和 provider 需求，然后打印匹配的 `qa suite --scenario ...` 目标。
请将其视为发现辅助工具，而不是门禁替代；选中的场景仍然需要正确的 provider 模式、实时传输、Multipass、Testbox 或 release lane 来验证目标行为。

如需进行角色和风格检查，请在多个在线模型  
引用上运行同一个场景，并写出一份经过评判的 Markdown 报告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.5,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-8,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.5,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-8,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

The command runs local QA gateway child processes, not Docker. Character eval
scenarios should set the persona through `SOUL.md`, then run ordinary user turns
such as chat, workspace help, and small file tasks. The candidate model should
not be told that it is being evaluated. The command preserves each full
transcript, records basic run stats, then asks the judge models in fast mode with
`xhigh` reasoning where supported to rank the runs by naturalness, vibe, and humor.
Use `--blind-judge-models` when comparing providers: the judge prompt still gets
every transcript and run status, but candidate refs are replaced with neutral
labels such as `candidate-01`; the report maps rankings back to real refs after
parsing.
Candidate runs default to `high` thinking, with `medium` for GPT-5.5 and `xhigh`
for older OpenAI eval refs that support it. Override a specific candidate inline with
`--model provider/model,thinking=<level>`. `--thinking <level>` still sets a
global fallback, and the older `--model-thinking <provider/model=level>` form is
kept for compatibility.
OpenAI candidate refs default to fast mode so priority processing is used where
the provider supports it. Add `,fast`, `,no-fast`, or `,fast=false` inline when a
single candidate or judge needs an override. Pass `--fast` only when you want to
force fast mode on for every candidate model. Candidate and judge durations are
recorded in the report for benchmark analysis, but judge prompts explicitly say
not to rank by speed.
Candidate and judge model runs both default to concurrency 16. Lower
`--concurrency` or `--judge-concurrency` when provider limits or local gateway
pressure make a run too noisy.
When no candidate `--model` is passed, the character eval defaults to
`openai/gpt-5.5`, `openai/gpt-5.2`, `openai/gpt-5`, `anthropic/claude-opus-4-8`,
`anthropic/claude-sonnet-4-6`, `zai/glm-5.1`,
`moonshot/kimi-k2.5`, and
`google/gemini-3.1-pro-preview` when no `--model` is passed.
When no `--judge-model` is passed, the judges default to
`openai/gpt-5.5,thinking=xhigh,fast` and
`anthropic/claude-opus-4-8,thinking=high`.

## 相关文档

- [Matrix QA](/concepts/qa-matrix)
- [个人 agent 基准包](/concepts/personal-agent-benchmark-pack)
- [QA Channel](/channels/qa-channel)
- [测试](/help/testing)
- [仪表盘](/web/dashboard)
