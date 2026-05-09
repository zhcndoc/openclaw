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

- `extensions/qa-channel`: 带有 DM、频道、线程、
  反应、编辑和删除表面的合成消息通道。
- `extensions/qa-lab`: 用于观察转录、注入传入消息以及导出 Markdown 报告的调试器 UI 和 QA 总线。
- `extensions/qa-matrix`、未来的 runner 插件：驱动子 QA gateway 中真实频道的实时传输适配器。
- `qa/`: 用于启动任务和基线 QA
  场景的仓库后备种子资源。
- [Mantis](/concepts/mantis)：针对需要真实传输、浏览器截图、VM 状态和 PR 证据的 bug，在 live verification 之前和之后进行验证。

## 命令入口

所有 QA 流程都通过 `pnpm openclaw qa <subcommand>` 运行。许多命令都有 `pnpm qa:*`
脚本别名；这两种形式都受支持。

| Command                                             | Purpose                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 打包后的 QA 自检；写出 Markdown 报告。                                                                                                                                                                                                                        |
| `qa suite`                                          | 在 QA gateway 线路上运行仓库支持的场景。别名：`pnpm openclaw qa suite --runner multipass` 用于一次性 Linux VM。                                                                                                                                  |
| `qa coverage`                                       | 打印 markdown 场景覆盖清单（`--json` 可输出机器可读格式）。                                                                                                                                                                                           |
| `qa parity-report`                                  | 比较两个 `qa-suite-summary.json` 文件并写出 agentic parity 报告。                                                                                                                                                                                          |
| `qa character-eval`                                 | 在多个实时模型上运行 character QA 场景并生成裁决报告。见 [Reporting](#reporting)。                                                                                                                                                            |
| `qa manual`                                         | 针对所选 provider/model 线路运行一次性提示。                                                                                                                                                                                                          |
| `qa ui`                                             | 启动 QA 调试器 UI 和本地 QA 总线（别名：`pnpm qa:lab:ui`）。                                                                                                                                                                                                    |
| `qa docker-build-image`                             | 构建预烘焙的 QA Docker 镜像。                                                                                                                                                                                                                                     |
| `qa docker-scaffold`                                | 为 QA 仪表盘 + gateway 线路生成 docker-compose 脚手架。                                                                                                                                                                                                    |
| `qa up`                                             | 构建 QA 站点，启动基于 Docker 的堆栈，并打印 URL（别名：`pnpm qa:lab:up`；`:fast` 变体会附加 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。                                                                                                  |
| `qa aimock`                                         | 仅启动 AIMock provider 服务器。                                                                                                                                                                                                                                  |
| `qa mock-openai`                                    | 仅启动具有关联场景感知的 `mock-openai` provider 服务器。                                                                                                                                                                                                            |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共享的 Convex 凭据池。                                                                                                                                                                                                                               |
| `qa matrix`                                         | 针对一次性 Tuwunel homeserver 的实时传输线路。见 [Matrix QA](/concepts/qa-matrix)。                                                                                                                                                                      |
| `qa telegram`                                       | 针对真实私有 Telegram 群组的实时传输线路。                                                                                                                                                                                                              |
| `qa discord`                                        | 针对真实私有 Discord guild 频道的实时传输线路。                                                                                                                                                                                                       |
| `qa slack`                                          | 针对真实私有 Slack 频道的实时传输线路。                                                                                                                                                                                                               |
| `qa mantis`                                         | 用于 live transport bug 的前后验证运行器，带有 Discord 状态反应证据、Crabbox 桌面/浏览器 smoke，以及 Slack-in-VNC smoke。见 [Mantis](/concepts/mantis) 和 [Mantis Slack Desktop Runbook](/concepts/mantis-slack-desktop-runbook)。 |

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

若要进行本地 OpenTelemetry 追踪冒烟测试，运行：

```bash
pnpm qa:otel:smoke
```

该脚本会启动一个本地 OTLP/HTTP 追踪接收器，使用启用
`diagnostics-otel` 插件的 `otel-trace-smoke` QA 场景，然后
解码导出的 protobuf spans，并断言发布关键形态：
必须存在 `openclaw.run`、`openclaw.harness.run`、`openclaw.model.call`、
`openclaw.context.assembled` 和 `openclaw.message.delivery`；成功回合中的模型调用不得导出 `StreamAbandoned`；原始诊断 ID 和
`openclaw.content.*` 属性必须不出现在 trace 中。它会将
`otel-smoke-summary.json` 写在 QA suite 产物旁边。

可观测性 QA 仅限源代码检出环境。npm tarball 会刻意省略
QA Lab，因此包级 Docker 发布通道不会运行 `qa` 命令。变更诊断
埋点时，请在已构建的源代码检出环境中使用
`pnpm qa:otel:smoke`。

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

对于真实传输的 Telegram、Discord 和 Slack smoke 线路：

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

它们面向一个已存在的真实频道，使用两个 bot（driver + SUT）。所需的环境变量、场景列表、输出产物以及 Convex 凭据池记录在下面的 [Telegram、Discord 和 Slack QA 参考](#telegram-discord-and-slack-qa-reference) 中。

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

操作员检查清单、GitHub workflow 触发命令、证据评论契约、hydrate-mode 决策表、耗时解释和失败处理步骤见 [Mantis Slack Desktop Runbook](/concepts/mantis-slack-desktop-runbook)。

对于 agent/CV 风格的桌面任务，运行：

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.4
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

| Lane     | Canary | Mention gating | Bot-to-bot | Allowlist block | Top-level reply | Restart resume | Thread follow-up | Thread isolation | Reaction observation | Help command | Native command registration |
| -------- | ------ | -------------- | ---------- | --------------- | --------------- | -------------- | ---------------- | ---------------- | -------------------- | ------------ | --------------------------- |
| Matrix   | x      | x              | x          | x               | x               | x              | x                | x                | x                    |              |                             |
| Telegram | x      | x              | x          |                 |                 |                |                  |                  |                      | x            |                             |
| Discord  | x      | x              | x          |                 |                 |                |                  |                  |                      |              | x                           |
| Slack    | x      | x              | x          | x               | x               | x              | x                | x                |                      |              |                             |

这让 `qa-channel` 保持为更广泛的产品行为套件，而 Matrix、
Telegram 以及未来的实时传输共享一份明确的传输契约
检查清单。

若要在不把 Docker 带入 QA 路径的情况下使用一次性 Linux VM 通道，运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这会启动一个全新的 Multipass guest，安装依赖，在 guest 内部构建 OpenClaw，
运行 `qa suite`，然后将正常的 QA 报告和
摘要复制回宿主机上的 `.artifacts/qa-e2e/...`。
它沿用与宿主机上的 `qa suite` 相同的场景选择行为。
默认情况下，宿主机和 Multipass 的 suite 运行会并行执行多个所选场景，并使用隔离的 gateway worker。`qa-channel` 默认并发度为
4，并受所选场景数量上限约束。使用 `--concurrency <count>` 可调整 worker 数量，或使用 `--concurrency 1` 进行串行执行。
当任一场景失败时，该命令以非零状态退出。若你希望保留产物但不希望失败导致退出码为失败，请使用 `--allow-failures`。
实时运行会转发对 guest 实用的受支持 QA 身份验证输入：基于环境变量的 provider 密钥、QA 实时 provider 配置路径，以及
存在时的 `CODEX_HOME`。请将 `--output-dir` 保持在仓库根目录下，这样 guest 才能通过挂载的工作区写回。

## Telegram、Discord 和 Slack QA 参考

由于场景数量以及 Docker 支持的 homeserver 预配，Matrix 有一个[专用页面](/concepts/qa-matrix)。Telegram、Discord 和 Slack 更小——每个只有少量场景，没有 profile 系统，且基于已存在的真实频道——因此它们的参考文档放在这里。

### 共享 CLI 标志

These lanes register through `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` and accept the same flags:

| Flag                                  | Default                                                         | Description                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                               | 仅运行此场景。可重复使用。                                                                                             |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | 报告/摘要/观测到的消息以及输出日志的写入位置。相对路径会相对于 `--repo-root` 解析。                                    |
| `--repo-root <path>`                  | `process.cwd()`                                                 | 从中性 cwd 调用时的仓库根目录。                                                                                        |
| `--sut-account <id>`                  | `sut`                                                           | QA gateway 配置中的临时账号 id。                                                                                       |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` 或 `live-frontier`（旧的 `live-openai` 仍然可用）。                                                       |
| `--model <ref>` / `--alt-model <ref>` | provider default                                                | 主/备用模型引用。                                                                                                      |
| `--fast`                              | off                                                             | 在受支持的情况下启用 provider 快速模式。                                                                               |
| `--credential-source <env\|convex>`   | `env`                                                           | 参见 [Convex 凭证池](#convex-credential-pool)。                                                                        |
| `--credential-role <maintainer\|ci>`  | CI 中为 `ci`，其他情况下为 `maintainer`                           | 当使用 `--credential-source convex` 时所用的角色。                                                                     |

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
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
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

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` 会在观测消息产物中保留消息正文。

场景（`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts:39`）：

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-thread-follow-up`
- `slack-thread-isolation`

输出产物：

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` - 除非设置 `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`，否则正文会被脱敏。

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

### Convex 凭证池

Telegram、Discord、Slack 和 WhatsApp 通道可以从共享的 Convex 池中租用凭证，而不是读取上面的环境变量。传入 `--credential-source convex`（或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 会获取独占租约，在运行期间发送心跳，并在关闭时释放它。池的种类包括 `"telegram"`、`"discord"`、`"slack"` 和 `"whatsapp"`。

broker 在 `admin/add` 上验证的负载形状：

- Telegram (`kind: "telegram"`): `{ groupId: string, driverToken: string, sutToken: string }` - `groupId` 必须是数字聊天 id 字符串。
- Discord (`kind: "discord"`): `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。
- WhatsApp (`kind: "whatsapp"`): `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - 电话号码必须是不同的 E.164 字符串。

Slack 通道也可以使用该池。Slack 负载形状检查目前在 Slack QA 运行器中而不是 broker 中完成；请使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`，其中 Slack 频道 id 形如 `Cxxxxxxxxxx`。有关应用和作用域的配置，请参见 [设置 Slack 工作区](#设置-slack-工作区)。

操作环境变量和 Convex broker 端点契约位于 [Testing → Shared Telegram credentials via Convex](/help/testing#shared-telegram-credentials-via-convex-v1)（该节名称早于多通道池；租约语义在各类之间是共享的）。

## 仓库内种子

种子资产位于 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

它们故意保留在 git 中，以便 QA 计划对人和 agent 都可见。

`qa-lab` 应保持为一个通用的 markdown 运行器。每个场景 markdown 文件都是一次测试运行的唯一真实来源，并且应定义：

- 场景元数据
- 可选的类别、能力、通道和风险元数据
- 文档和代码引用
- 可选的插件要求
- 可选的 gateway 配置补丁
- 可执行的 `qa-flow`

支撑 `qa-flow` 的可复用运行时表面可以保持通用和跨切面。例如，markdown 场景可以将传输侧助手与浏览器侧助手结合起来，通过 Gateway 的 `browser.request` 连接驱动嵌入式 Control UI，而无需添加特例运行器。

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

- `mock-openai` 是具备场景感知的 OpenClaw mock。它仍然是仓库内 QA 和 parity gate 的默认确定性 mock 通道。
- `aimock` 启动一个基于 AIMock 的 provider server，用于实验性的协议、fixture、record/replay 和 chaos 覆盖。它是附加性的，不会替换 `mock-openai` 的场景分发器。

provider 通道的实现位于 `extensions/qa-lab/src/providers/` 下。每个 provider 都拥有自己的默认值、本地 server 启动、gateway 模型配置、auth-profile 分阶段需求，以及 live/mock 能力标志。共享 suite 和 gateway 代码应通过 provider 注册表路由，而不是按 provider 名称分支。

## 传输适配器

`qa-lab` 为 markdown QA 场景拥有一个通用的传输连接点。`qa-channel` 是该连接点上的第一个适配器，但设计目标更广：未来真实或合成的频道都应接入同一个 suite runner，而不是新增一个特定于传输的 QA 运行器。

在架构层面，分工如下：

- `qa-lab` 负责通用的场景执行、worker 并发、产物写入和报告。
- 传输适配器负责 gateway 配置、就绪检查、入站和出站观测、传输动作，以及标准化的传输状态。
- `qa/scenarios/` 下的 markdown 场景文件定义测试运行；`qa-lab` 提供执行它们的可复用运行时表面。

### 添加一个频道

向 markdown QA 系统添加频道需要恰好两件事：

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
5. 在主题化的 `qa/scenarios/` 目录下编写或改造 markdown 场景。
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

如需了解可用场景清单——在评估后续工作量或接入新传输时很有用——请运行 `pnpm openclaw qa coverage`（加上 `--json` 可获得机器可读输出）。

如需进行角色和风格检查，请在多个在线模型
引用上运行同一个场景，并写出一份经过评判的 Markdown 报告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.5,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-6,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.5,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-6,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

该命令运行本地 QA 网关子进程，而不是 Docker。角色评估
场景应通过 `SOUL.md` 设定 persona，然后运行普通用户回合，
例如聊天、工作区帮助和小文件任务。候选模型不应被告知自己正在接受评估。
该命令会保留每份完整对话记录，记录基本运行统计，然后在支持的情况下，
以 fast 模式并使用 `xhigh` 推理要求裁判模型按自然度、氛围和幽默感对运行结果进行排序。
在比较不同提供方时使用 `--blind-judge-models`：裁判提示仍然会获得每份对话和运行状态，
但候选引用会被替换为中性标签，例如 `candidate-01`；报告会在解析后将排序映射回真实引用。
候选运行默认使用 `high` thinking，而 GPT-5.5 使用 `medium`，支持该能力的较旧 OpenAI 评估引用使用 `xhigh`。
可通过 `--model provider/model,thinking=<level>` 为单个候选项内联覆盖。`--thinking <level>` 仍然会设置全局回退值，
而较旧的 `--model-thinking <provider/model=level>` 形式保留用于兼容性。
OpenAI 候选引用默认使用 fast 模式，因此在提供方支持时会启用优先处理。
当单个候选或裁判需要覆盖时，可在内联中添加 `,fast`、`,no-fast` 或 `,fast=false`。
只有在想要对所有候选模型强制开启 fast 模式时才使用 `--fast`。
报告中会记录候选和裁判的耗时以便进行基准分析，但裁判提示会明确说明不要按速度排序。
候选和裁判模型运行默认并发度都为 16。当提供方限制或本地网关压力使运行过于嘈杂时，
可降低 `--concurrency` 或 `--judge-concurrency`。
当未传入候选 `--model` 时，角色评估默认使用
`openai/gpt-5.5`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、
`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、
`moonshot/kimi-k2.5` 和
`google/gemini-3.1-pro-preview`。
当未传入 `--judge-model` 时，裁判默认使用
`openai/gpt-5.5,thinking=xhigh,fast` 和
`anthropic/claude-opus-4-6,thinking=high`。

## 相关文档

- [矩阵 QA](/concepts/qa-matrix)
- [QA 通道](/channels/qa-channel)
- [测试](/help/testing)
- [仪表盘](/web/dashboard)
