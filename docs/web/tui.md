---
summary: "终端 UI（TUI）：连接到 Gateway 或在嵌入式模式下本地运行"
read_when:
  - "你想要一个适合初学者的 TUI 操作指南"
  - "你需要 TUI 功能、命令和快捷键的完整列表"
title: "TUI"
---

## <a id="quick-start"></a> 快速开始

### <a id="gateway-mode"></a> 网关模式

1. 启动网关。

```bash
openclaw gateway
```

2. 打开 TUI。

```bash
openclaw tui
```

3. 输入消息并按 Enter。

远程网关：

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

如果你的网关使用密码认证，请使用 `--password`。

### <a id="local-mode"></a> 本地模式

无需运行网关即可使用 TUI：

```bash
openclaw chat
# or
openclaw tui --local
```

- `openclaw chat` 和 `openclaw terminal` 是 `openclaw tui --local` 的别名。
- `--local` 不能与 `--url`、`--token` 或 `--password` 组合使用。
- 本地模式直接使用嵌入式代理运行时。大多数本地工具都可以使用，但仅网关功能不可用。
- Bare `openclaw`（无子命令）自动选择目标。未配置的安装运行推理载入。无效的配置会打开经典的医生指南。可访问的已配置网关以网关模式打开此 TUI shell。否则，配置的本地模型会以本地模式打开它。

## <a id="what-you-see"></a> 你将看到什么

- 页眉：连接 URL、当前代理、当前会话。
- 聊天记录：用户消息、助手回复、系统通知、工具卡片。
- 在支持超链接的终端上，Markdown 链接打开其编写的目标，包括包装链接和 URL- 形状标签。
- 在支持图像的终端上，图像附件在消息和工具输出中显示为内联预览。
- 状态线：connection/run状态（连接、运行、流式传输、空闲、错误）。
- 页脚：代理+会话+模型+目标状态+think/fast/verbose/trace/reasoning+代币计数+交付。
- 输入：带自动补全的文本编辑器。

## <a id="mental-model%3A-agents-%2B-sessions"></a><a id="mental-model-agents-+-sessions"></a> 心智模型：代理 + 会话

- Agent 是独特的段头 （e.g. `main`、`research`）。网关公开该列表。
- 会话属于当前代理。
- 会话键会存储为 `agent:<agentId>:<sessionKey>`。
  - 如果你输入 `/session main`，TUI 会将其展开为 `agent:<currentAgent>:main`。
  - 如果你输入 `/session agent:other:main`，你会显式切换到那个代理会话。
- 会话作用域：
  - `per-sender`（默认）：每个代理都有多个会话。
  - `global`：默认和 `main` 选择使用 `global` 会话（选取器可能为空）。
- 当前代理 + 会话会始终显示在页脚中。
- 如果会话具有 [ 目标 ](/tools/goal)，则页脚显示其紧凑状态：`Pursuing goal`、`Goal paused (/goal resume)`、`Goal blocked (/goal resume)` 或 `Goal achieved`。
- 当在没有 `--session` 的情况下启动时，网关模式 TUI 将恢复上次选择的会话。网关、代理和会话范围必须匹配，并且该会话必须仍然存在。传递 `--session`、`/session`、`/new` 或 `/reset` 仍然是显式的。
- 会话详细信息和记住的会话恢复可保留所选代理和准确的对话，即使另一个代理具有相同的会话名称也是如此。重新连接后，先前连接的元数据将被丢弃。
- Bare `global` 选择代理的主页：每个发送者范围中的 `agent:<id>:main`，或全局范围中的 `global`。当存储的对话存在时，显式 `agent:<id>:global` 选择该对话。如果读取的准确历史记录确认它不存在，则旧别名会选择同一代理的主页。历史记录错误永远不会选择后备对话。
- 加载新会话选择时提交的消息将保留在编辑器中。准备好后再次按 Enter。如果历史加载失败，请重试 `/session <key>` 或选择其他会话；在选择准备就绪之前，与会话相关的命令也保持不可用。

## <a id="sending-%2B-delivery"></a><a id="sending-+-delivery"></a> 发送 + 投递

- 消息始终发送至网关（或本地模式下的嵌入式运行时）。将助理的回复发送回聊天提供商是一个单独的、默认关闭的步骤。
- TUI 是一个像 WebChat 一样的内部源表面，而不是通用的出站通道。需要 `tools.message` 进行可见回复的harness可以通过无目标 `message.send` 满足主动 TUI 转弯。显式提供程序交付仍然使用正常配置的通道，并且永远不会回退到 `lastChannel`。
- Delivery 在整个 TUI 会话启动时是固定的。从 `openclaw tui --deliver` 开始将其打开。没有 `/deliver` 斜线命令或设置切换来在会话中翻转它。重启TUI即可更改。
- Delivered 轮次在持久完成到达时返回空闲状态，即使没有聊天回复事件也是如此。确认会话空闲后，Escape清除陈旧的本地繁忙状态；仍在完成的运行会保留其完成跟踪。

## <a id="pickers-%2B-overlays"></a><a id="pickers-+-overlays"></a> 选择器 + 覆盖层

- 模型选择器：列出所选代理的已发布模型并设置会话覆盖。不可用的选择及其原因仍然可见。选择一项即可显示指导，而无需更改会话。可用性未知的选项仍然可以选择。发布目录之前的网关保留其现有的选择行为。
- 代理选择器：选择不同的代理。
- 会话选择器：显示最近 7 天内更新的当前代理的最多 50 个会话。使用 `/session <key>` 跳转到较早的已知会话。
- 设置（`/settings`）：切换工具输出展开和思考可见性。此面板不控制传递。

Esc 或 Ctrl+C 关闭选择器。在会话选择器中，第一次按下会清除非空过滤器。再按一次将其关闭。

模型选择器立即打开，如果尚无模型，则显示检查状态。在网关模式下，它会在后台刷新时重用所选代理的最后已知列表。当该模型仍然存在时，目录更改会更新打开的选取器，而不会清除其搜索或移动其突出显示的选择。首先列出了当前模型以及各提供商的 [ 推荐模型 ](/concepts/recommended-models)。选择**所有模型（N）**显示其余；输入搜索总是匹配每个模型。

## <a id="questions"></a> 问题

当座席呼叫 [`ask_user`](/tools/ask-user) 时，TUI 打开活动会话的问题提示。这适用于网关模式和本地模式（`openclaw chat` 或 `openclaw tui --local`）。最多包含三个问题的提示一次显示一个问题，并带有步进器和剩余时间。

使用箭头键或数字键选择一个选项，然后按 Enter 继续。对于多选问题，切换您想要的选项并接受它们。 **其他...**始终让您输入自己的答案，而**Skip**拒绝整个提示。最后一个问题后，TUI 提交答案并显示紧凑的系统通知。

按 Esc 折叠提示并返回到编辑器。这个问题仍然悬而未决，状态指示器很窄。 `/question` 重新打开它。正常回复仍会回答活动运行中符合条件的待决问题。过期的问题和在其他地方回答的问题会自动关闭。重新连接或切换会话会恢复所选会话的待处理问题。在本地模式下，待处理问题仅适用于当前 TUI 进程。

网关连接的 [`secrets`](/tools/secrets) 请求使用屏蔽输入来呈现项目符号并将值保留在聊天和输入历史记录之外。提示显示条目名称、原因和建议的允许主机。主机在这里是只读的：提交接受如图所示的列表。使用 Control UI 进行编辑。本地模式无法满足存储绑定请求。将 `openclaw secrets store` 或 Control UI 与正在运行的网关结合使用。仅在屏蔽提示中输入凭据，切勿在编辑器中输入凭据。

## <a id="keyboard-shortcuts"></a> 键盘快捷键

- Enter: 发送消息
- Shift+Enter 或 Ctrl+J: 插入换行而不发送
- Esc：折叠未解决的问题提示，或中止编辑器的活动运行
- Ctrl+C：清除输入并在聊天记录中显示退出提示（按两次退出）；活动运行状态保持可见
- Ctrl+D: 退出
- Ctrl+L: 模型选择器
- Ctrl+G: 智能体选择器
- Ctrl+P: 会话选择器
- Ctrl+O: 切换工具输出展开
- Ctrl+T: 切换思考可见性（重新加载历史记录）。

## <a id="slash-commands"></a> 斜杠命令

多行输入遵循正常的聊天路径，而不是 TUI 的本地命令调度程序。粘贴带有尾随换行符的 `/exit` 可使 TUI 保持打开状态。 `/stop` 和 `/btw` 等共享聊天命令保留其正常含义。

核心：

- `/help`
- `/status`（网关转发，显示session/model摘要）
- `/gateway-status`（别名 `/gwstatus`）显示网关版本、通道配置摘要和存储的会话清单，包括存档会话。
- `/agent <id>`（或 `/agents`）
- `/session <key>`（或 `/sessions`）
- `/model <provider/model|default>`（或`/models`）。 `default` 清除会话覆盖。
- `/question`（重新打开活动会话的待决问题）

网关连接的模型更新遵循可选的 [`agents.defaults.modelSelectionScope`](/gateway/config-agents/models#agentsdefaultsmodelselectionscope) 设置。取消设置后，他们会为管理员保留现有的配置默认行为。无论此设置如何，嵌入式本地 TUI 都保持仅会话状态。

会话控制：

- `/think <off|minimal|low|medium|high|default>`（更高级别可能会添加 `xhigh`/`max` 等级别，具体取决于模型）。 `default` 清除会话覆盖。
- `/fast <status|auto|on|off|default>`（`default` 清除会话覆盖）
- `/verbose <on|full|off>`
- `/trace <on|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full|cost|reset>`（`cost` 显示会话、今天和 30 天的成本）。 `reset`/`inherit`/`clear`/`default` 清除会话覆盖。
- `/goal <objective> | /goal [status] | /goal start <objective> | /goal edit <objective> | /goal pause|resume|complete|block|clear`
- `/btw <side question>`（别名：`/side`）在不更改未来会话上下文的情况下进行询问。
- `/elevated <on|off|ask|full>`（别名：`/elev`）
- `/activation <mention|always>`
- `/queue <steer|followup|collect|interrupt> [debounce:<duration>] [cap:<n>] [drop:<summarize|old|new>]`
- `/queue default`（或 `/queue reset`）清除会话覆盖设置

会话生命周期：

- `/new`（在新密钥下生成一个新的、隔离的会话）。它不会影响旧会话上的其他 TUI 客户端。
- `/reset`（就地重置当前会话键）
- `/abort`（中止当前运行）
- `/stop`（停止当前运行或排队中的运行）
- `/settings`
- `/exit`（或 `/quit`）

当前会话重置时，TUI 刷新记录后上报。这包括由另一个客户端启动的重置。

仅本地模式：

- `/auth [provider]` 在 TUI 内打开提供者 auth/login 流。

本地模式在嵌入式运行时内实现相同的队列模式。中间运行提示遵循会话的 `/queue` 策略：`steer` 在运行时可以接受时注入，`followup` 等待单独的回合，`collect` 组合挂起的提示，`interrupt` 在开始新的提示之前停止当前运行。显式 `/steer <message>` 仅适用于网关。在本地模式下使用 `/queue steer` 加上普通消息。

OpenClaw:

- `/openclaw [request]` 从普通代理 TUI 返回到 [OpenClaw](#openclaw-setup-and-repair-helper) setup/repair 聊天，可选择转发一个请求。

其他 Gateway 斜杠命令（例如 `/context`）会转发给 Gateway，并作为系统输出显示。请参阅 [斜杠命令](/tools/slash-commands)。

## <a id="local-chrome-setup"></a> 本地Chrome设置

使用 `/browser-setup`（或 `/browser-setup inspect`）检查 **TUI 进程主机** 上的 Chrome 扩展设置，而不是连接的网关。 `/browser-setup install` 明确准备自动本地设置； `/browser-setup verify` 检查本地认证分机中继。支持的本地本机引导程序不需要配对代码。 Chrome 仍然需要自己的扩展安装和权限批准，并且保留现有的配对和自动设置选择退出。

这些命令是本地 CLI 操作，而不是发送给代理的消息。不要将凭据粘贴到其中。 `/stop`、`/abort`、Escape 或退出 TUI 会取消挂起的设置命令。中断后，再次检查以协调已完成的准备工作。当TUI通过SSH运行时，安装程​​序在SSH主机上运行；物理终端查看器不假定托管 Chrome。

## <a id="local-shell-commands"></a> 本地 shell 命令

- 在行首添加 `!`，即可在 TUI 主机上运行本地 shell 命令。
- TUI 每个会话提示一次以允许本地执行。拒绝会使 `!` 禁用会话。
- 命令在 TUI 工作目录中的全新非交互式 shell 中运行（无持久性 `cd`/env）。
- 本地 shell 命令在其环境中会收到 `OPENCLAW_SHELL=tui-local`。
- A 单独的 `!` 作为普通消息发送。前导空格不会触发本地执行。

## <a id="openclaw-setup-and-repair-helper"></a> OpenClaw 设置和修复助手

OpenClaw 是零环 setup/repair 助手。配置的默认模型通过实时推理检查后，它会显示为 `openclaw setup`。如果推理不可用，交互式调用将返回推理启动，并且自动化会失败并提供修复指导。它在与 `openclaw tui --local` 相同的本地 TUI shell 中运行，并由 AI 代理支持，该代理仅限于 OpenClaw 的类型化、审批门控操作：

```bash
openclaw setup                       # start interactively
openclaw setup -m "status"           # run one request and exit
openclaw setup -m "set default model openai/gpt-5.2" --yes   # apply a config write
```

- 持久配置写入需要批准：交互批准或通过 `--yes`。
- `--json` 会以 JSON 格式打印启动概览，而不是启动聊天。
- 从 OpenClaw 内部，`open-tui` 请求退出 OpenClaw 并打开常规代理 TUI。一个例子是要求与普通智能体交谈。在那里使用`/openclaw`回来。

当当前配置已通过验证并且您希望嵌入式代理对其进行处理时，请使用本地模式。该代理检查同一台计算机上的配置，将其与文档进行比较，并帮助修复偏差。本地模式不依赖于正在运行的网关。

如果 `openclaw config validate` 已经出现故障，请先从 `openclaw configure` 或 `openclaw doctor --fix` 开始。 `openclaw chat` 仍然需要可加载配置才能启动。

典型流程：

1. 启动本地模式：

```bash
openclaw chat
```

2. 让 agent 检查你想要验证的内容，例如：

```text
Compare my gateway auth config with the docs and suggest the smallest fix.
```

3. 使用本地 shell 命令获取准确证据并进行验证：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

4. 使用 `openclaw config set` 或 `openclaw configure` 应用小范围更改，然后重新运行 `!openclaw config validate`。
5. 如果 Doctor 建议自动迁移或修复，请先审查，再运行 `!openclaw doctor --fix`。

提示：

- 优先选择 `openclaw config set` 或 `openclaw configure` 而不是手动编辑 `openclaw.json`。
- `openclaw docs "<query>"` 会从同一台机器上搜索实时文档索引。
- 当您需要结构化架构和 SecretRef/resolvability 错误时，`openclaw config validate --json` 非常有用。

## <a id="tool-output"></a> 工具输出

- 工具调用会以包含参数 + 结果的卡片形式显示。
- Ctrl+O 在 collapsed/expanded 视图之间切换。
- 工具运行期间，部分更新会流式写入同一张卡片。

## <a id="image-previews"></a> 图片预览

TUI 在兼容终端（包括 Ghostty、iTerm2 和 Kitty）中显示接收和生成的图像附件的静态预览。重新打开对话或重新连接时也会出现预览。工具图像结果出现在他们的工具卡中；恢复的工具输出遵循会话的详细设置。

网关模式使用与 Control UI 相同的媒体访问规则从连接的网关检索托管附件。本地模式通过本地媒体存储读取托管附件。普通Markdown中的图片链接不会触发下载。

即使 Control UI 托管已禁用，网关图像预览也能正常工作。

预览保留宽高比并适合 60 列和 20 行。 TUI 在每条消息中最多保留 4 个预览，并在可见记录中保留 24 个最新预览。 PNG、JPEG、GIF 和 WebP 输入显示为静态 PNG 缩略图； GIF 动画不受支持。大或不可用的图像会显示预览通知。使用 Control UI 检查原始图像或解决媒体访问故障。

不支持图形协议的终端保留文本输出。默认情况下，图像在 tmux 和 GNU Screen 内被禁用。不支持 Sixel。

## <a id="terminal-colors"></a> 终端颜色

- TUI 会将助手正文保持为终端的默认前景色，因此深色和浅色终端都能保持可读。
- 如果您的终端使用浅色背景并且自动检测错误，请在启动 `openclaw tui` 之前设置 `OPENCLAW_THEME=light`。
- 若要强制使用原始深色调色板，则设置 `OPENCLAW_THEME=dark`。

## <a id="history-%2B-streaming"></a><a id="history-+-streaming"></a> 历史记录 + 流式传输

- 连接时，TUI 会加载最新的历史记录（默认 200 条消息）。
- 重新连接和事件间隙恢复可协调活动运行与历史记录。它们保留并发和新观察到的运行。它们不会恢复确切历史记录所排除的运行。
- 流式响应会就地更新，直到完成。
- 长单词、电子邮件地址和标识符会换行到终端宽度，而不在消息文本中插入空格。
- 失败的助手附件会在任何回复文本旁边显示可操作的警告。附件摘要使用通用媒体类型，而不暴露文件名或源 URL。
- 从另一个客户端发送到同一会话的消息会自动出现。
- TUI 还会监听 agent 工具事件，以显示更丰富的工具卡片。

## <a id="connection-details"></a> 连接详情

- TUI 在粗 `ui` 客户端模式下与客户端 id `openclaw-tui` 连接。 Control UI 和 WebChat 对网关策略使用相同的模式。
- Reconnects 显示系统消息。事件间隙会在日志中显示。

## <a id="options"></a> 选项

- `--local`: 连接到本地嵌入式代理运行时
- `--url <url>`: 网关 WebSocket URL（默认使用配置中的 `gateway.remote.url`，或者在回环地址上使用 `ws://127.0.0.1:<port>`）
- `--token <token>`：网关令牌（如果需要）
- `--password <password>`: 网关密码（如需要）
- `--tls-fingerprint <sha256>`: 预期的 TLS 证书指纹，用于固定的 `wss://` 网关
- `--session <key>`: 会话键（默认：`main`，或在作用域为全局时为 `global`）
- `--deliver`: 将助手回复发送给提供方（默认关闭）
- `--thinking <level>`: 覆盖发送时的思考级别
- `--message <text>`：连接后发送初始消息。如果选择的历史记录不可用，则TUI报告初始消息未发送；会话恢复后它不会自动重播。
- `--timeout-ms <ms>`: 代理超时，单位为毫秒（默认值为 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`: 要加载的历史记录条目数（默认 `200`）

<Warning>
当你设置了 `--url` 时，TUI 不会回退使用配置或环境中的凭据。请显式传入 `--token` 或 `--password`，如果目标使用的是固定证书，还需要传入 `--tls-fingerprint`。缺少显式凭据会报错。在本地模式下，不要传入 `--url`、`--token`、`--password` 或 `--tls-fingerprint`。
</Warning>

## <a id="troubleshooting"></a> 故障排查

发送消息后没有输出：

- 在TUI中运行`/status`来检查网关是否已连接和idle/busy.
- 检查 Gateway 日志：`openclaw logs --follow`。
- 检查代理是否可以运行：`openclaw status`和`openclaw models status`。
- 如果您希望在聊天频道中收到消息，请检查 TUI 是否以 `--deliver` 启动。如果不重新启动，则稍后无法开启交付。

## <a id="connection-troubleshooting"></a> 连接故障排查

- `disconnected`：检查网关是否正在运行并且您的 `--url/--token/--password` 是否正确。
- 选择器中没有 agent：检查 `openclaw agents list` 和你的路由配置。
- 会话选择器为空：你可能处于 global 作用域，或者还没有任何会话。

## <a id="related"></a> 相关内容

- [控制 UI](/web/control-ui) — 基于 Web 的控制界面
- [配置](/cli/config) — 检查、验证并编辑 `openclaw.json`
- [Doctor](/cli/doctor) — 引导式修复和迁移检查
- [CLI Reference](/cli) — 完整的 CLI 命令参考
- [`openclaw resume`](/cli/resume) — 将 TUI 连接到最近的网关会话
- [`openclaw tui`](/cli/tui) — 终端 UI 的命令参考和标志
