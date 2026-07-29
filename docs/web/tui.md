---
summary: "终端 UI（TUI）：连接到 Gateway 或在嵌入式模式下本地运行"
read_when:
  - 你想要一个适合初学者的 TUI 操作指南
  - 你需要 TUI 功能、命令和快捷键的完整列表
title: "TUI"
---

## 快速开始

### Gateway 模式

1. 启动 Gateway。

```bash
openclaw gateway
```

2. 打开 TUI。

```bash
openclaw tui
```

3. 输入消息并按 Enter。

远程 Gateway：

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

如果你的 Gateway 使用密码认证，请使用 `--password`。

### 本地模式

无需 Gateway 运行 TUI：

```bash
openclaw chat
# 或
openclaw tui --local
```

- `openclaw chat` 和 `openclaw terminal` 是 `openclaw tui --local` 的别名。
- `--local` 不能与 `--url`、`--token` 或 `--password` 组合使用。
- 本地模式直接使用内置的 agent 运行时。大多数本地工具可用，但 Gateway 专属功能不可用。
- 直接运行 `openclaw`（不带子命令）会自动选择目标：未配置的安装会运行推理引导；无效配置会打开经典的 doctor 指引；可访问且已配置的 Gateway 会以 gateway 模式打开此 TUI shell；否则，已配置的本地模型会以本地模式打开。

## 你将看到什么

- 页眉：连接 URL、当前代理、当前会话。
- 聊天记录：用户消息、助手回复、系统通知、工具卡片。
- 状态行：连接/运行状态（connecting、running、streaming、idle、error）。
- 页脚：代理 + 会话 + 模型 + 目标状态 + think/fast/verbose/trace/reasoning + 令牌计数 + deliver。
- 输入：带自动补全的文本编辑器。

## 心智模型：agents + sessions

- Agents 是唯一的 slug（例如 `main`、`research`）。Gateway 会暴露这个列表。
- Sessions 属于当前 agent。
- Session key 会存储为 `agent:<agentId>:<sessionKey>`。
  - 如果你输入 `/session main`，TUI 会将其展开为 `agent:<currentAgent>:main`。
  - 如果你输入 `/session agent:other:main`，你会显式切换到那个 agent session。
- Session 作用域：
  - `per-sender`（默认）：每个 agent 都有多个 sessions。
  - `global`：TUI 总是使用 `global` session（选择器可能为空）。
- 当前 agent + session 会始终显示在 footer 中。
- 如果 session 有一个 [goal](/tools/goal)，footer 会显示其紧凑状态：
  `Pursuing goal`、`Goal paused (/goal resume)`、`Goal blocked (/goal resume)` 或 `Goal achieved`。
- 在不带 `--session` 启动时，gateway-mode TUI 会恢复同一 gateway、agent 和 session scope 下上一次选中的 session，前提是该 session 仍然存在。传入 `--session`、`/session`、`/new` 或 `/reset` 仍然是显式指定。

## Send + Delivery

- Messages are always sent to the Gateway (or to the embedded runtime in local mode); sending the assistant’s reply back to the chat provider is a separate, default-off step.
- The TUI is an internal source interface, similar to WebChat, rather than a general outbound channel. For harnesses that need `tools.message` in order to display replies, you can satisfy the current TUI turn by using `message.send` without specifying a target; explicit provider delivery still uses the normally configured channel and will never fall back to `lastChannel`.
- Delivery is fixed for the entire TUI session at startup: launch with `openclaw tui --deliver` to enable it. There is no `/deliver` slash command or Settings toggle you can switch mid-session; to change it, restart the TUI.

## 选择器 + 覆盖层

- 模型选择器：列出可用模型并设置会话覆盖。
- 代理选择器：选择不同的代理。
- 会话选择器：显示当前代理在过去 7 天内更新的最多 50 个会话。使用 `/session <key>` 跳转到较早的已知会话。
- 设置（`/settings`）：切换工具输出展开和思考可见性。此面板不控制传递。

## 键盘快捷键

- Enter: 发送消息
- Shift+Enter or Ctrl+J: 插入换行而不发送
- Esc: 中止当前运行
- Ctrl+C: 清空输入（按两次退出）
- Ctrl+D: 退出
- Ctrl+L: 模型选择器
- Ctrl+G: 智能体选择器
- Ctrl+P: 会话选择器
- Ctrl+O: 切换工具输出展开
- Ctrl+T: 切换思考可见性（重新加载历史记录）

## 斜杠命令

核心：

- `/help`
- `/status`（由 Gateway 转发；显示会话/模型摘要）
- `/gateway-status`（别名 `/gwstatus`；直接显示 Gateway 连接状态）
- `/agent <id>`（或 `/agents`）
- `/session <key>`（或 `/sessions`）
- `/model <provider/model>`（或 `/models`）

会话控制：

- `/think <off|minimal|low|medium|high>`（更高层级可能会根据模型增加类似 `xhigh`/`max` 的级别）
- `/fast <status|auto|on|off>`
- `/verbose <on|full|off>`
- `/trace <on|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full|reset>` (`reset`/`inherit`/`clear`/`default` 清除会话覆盖设置)
- `/goal [status] | /goal start <objective> | /goal edit <objective> | /goal pause|resume|complete|block|clear`
- `/elevated <on|off|ask|full>`（别名：`/elev`）
- `/activation <mention|always>`
- `/queue <steer|followup|collect|interrupt> [debounce:<duration>] [cap:<n>] [drop:<summarize|old|new>]`
- `/queue default` (或 `/queue reset`) 清除会话覆盖设置

会话生命周期：

- `/new`（在一个新的 key 下创建一个全新的、隔离的会话；不会影响旧会话上的其他 TUI 客户端）
- `/reset`（就地重置当前会话 key）
- `/abort`（中止当前运行）
- `/settings`
- `/exit`（或 `/quit`）

仅本地模式：

- `/auth [provider]` 会在 TUI 内打开 provider 的认证/登录流程。

Local mode implements the same queue modes inside the embedded runtime. A
mid-run prompt follows the session's `/queue` policy: `steer` injects when the
runtime can accept it, `followup` waits for a separate turn, `collect` combines
pending prompts, and `interrupt` stops the current run before starting the new
one. Explicit `/steer <message>` is Gateway-only; use `/queue steer` plus a
normal message in local mode.

OpenClaw：

- `/openclaw [request]` 会从正常的 agent TUI 返回到 [OpenClaw](#openclaw-setup-and-repair-helper) 设置/修复聊天，并可选择性地转发一条请求。

其他 Gateway 斜杠命令（例如 `/context`）会转发给 Gateway，并作为系统输出显示。请参阅 [斜杠命令](/tools/slash-commands)。

## 本地 shell 命令

- 在行首添加 `!`，即可在 TUI 主机上运行本地 shell 命令。
- TUI 会在每个会话中提示一次是否允许本地执行；如果拒绝，则该会话中 `!` 将保持禁用状态。
- 命令会在 TUI 工作目录中的一个全新的、非交互式 shell 中运行（不会保留 `cd`/环境变量）。
- 本地 shell 命令在其环境中会收到 `OPENCLAW_SHELL=tui-local`。
- 单独的 `!` 会作为普通消息发送；前导空格不会触发本地执行。

## OpenClaw 设置和修复助手

OpenClaw 是 ring-zero 设置/修复助手，在配置好的默认模型通过实时推理检查后，会以 `openclaw setup` 的形式提供。若推理不可用，交互式调用会返回到推理引导流程，自动化则会失败并给出修复指导。它运行在与 `openclaw tui --local` 相同的本地 TUI shell 中，由一个受限于 OpenClaw 类型化、需要审批的操作的 AI agent 驱动：

```bash
openclaw setup                       # 交互式启动
openclaw setup -m "status"           # 运行一次请求并退出
openclaw setup -m "set default model openai/gpt-5.2" --yes   # 应用一次配置写入
```

- 持久化配置写入需要审批：可以交互式确认，或者传入 `--yes`。
- `--json` 会以 JSON 格式打印启动概览，而不是启动聊天。
- 在 OpenClaw 内部，`open-tui` 请求（例如，要求切换到普通 agent）会退出 OpenClaw 并打开常规的 agent TUI；在其中使用 `/openclaw` 可以返回。

当当前配置已经通过验证，并且你希望内嵌 agent 在同一台机器上检查它、将它与文档对比，并在不依赖正在运行的 Gateway 的情况下帮助修复偏差时，请使用本地模式。

如果 `openclaw config validate` 已经失败，先从 `openclaw configure` 或 `openclaw doctor --fix` 开始；`openclaw chat` 仍然需要可加载的配置才能启动。

典型流程：

1. 启动本地模式：

```bash
openclaw chat
```

2. 让 agent 检查你想要验证的内容，例如：

```text
将我的 gateway 认证配置与文档进行比较，并建议最小的修复。
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

- 相比手动编辑 `openclaw.json`，更推荐使用 `openclaw config set` 或 `openclaw configure`。
- `openclaw docs "<query>"` 会从同一台机器上搜索实时文档索引。
- 当你需要结构化的 schema 以及 SecretRef/可解析性错误时，`openclaw config validate --json` 很有用。

## 工具输出

- 工具调用会以包含参数 + 结果的卡片形式显示。
- Ctrl+O 可在折叠/展开视图之间切换。
- 工具运行期间，部分更新会流式写入同一张卡片。

## 终端颜色

- TUI 会将助手正文保持为终端的默认前景色，因此深色和浅色终端都能保持可读。
- 如果你的终端使用浅色背景且自动检测不正确，请在启动 `openclaw tui` 前设置 `OPENCLAW_THEME=light`。
- 若要强制使用原始深色调色板，则设置 `OPENCLAW_THEME=dark`。

## 历史记录 + 流式传输

- 连接时，TUI 会加载最新的历史记录（默认 200 条消息）。
- 流式响应会就地更新，直到完成。
- 从另一个客户端发送到同一会话的消息会自动出现。
- TUI 还会监听 agent 工具事件，以显示更丰富的工具卡片。

## 连接详情

- TUI 使用客户端 ID `openclaw-tui` 连接，并采用粗粒度的 `ui` 客户端模式（Control UI 和 WebChat 在 Gateway 策略中也使用相同模式）。
- 重新连接时会显示一条系统消息；事件间隙会在日志中显现。

## 选项

- `--local`: 连接到本地嵌入式代理运行时
- `--url <url>`: 网关 WebSocket URL（默认使用配置中的 `gateway.remote.url`，或者在回环地址上使用 `ws://127.0.0.1:<port>`）
- `--token <token>`: 网关令牌（如需要）
- `--password <password>`: 网关密码（如需要）
- `--tls-fingerprint <sha256>`: 预期的 TLS 证书指纹，用于固定的 `wss://` 网关
- `--session <key>`: 会话键（默认：`main`，或在作用域为全局时为 `global`）
- `--deliver`: 将助手回复发送给提供方（默认关闭）
- `--thinking <level>`: 覆盖发送时的思考级别
- `--message <text>`: 连接后发送一条初始消息
- `--timeout-ms <ms>`: 代理超时，单位为毫秒（默认值为 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`: 要加载的历史记录条目数（默认 `200`）

<Warning>
当你设置了 `--url` 时，TUI 不会回退使用配置或环境中的凭据。请显式传入 `--token` 或 `--password`，如果目标使用的是固定证书，还需要传入 `--tls-fingerprint`。缺少显式凭据会报错。在本地模式下，不要传入 `--url`、`--token`、`--password` 或 `--tls-fingerprint`。
</Warning>

## 故障排查

发送消息后没有输出：

- 在 TUI 中运行 `/status`，确认 Gateway 已连接且处于空闲/忙碌状态。
- 检查 Gateway 日志：`openclaw logs --follow`。
- 确认代理可以运行：`openclaw status` 和 `openclaw models status`。
- 如果你期望在聊天频道中收到消息，请确认 TUI 是使用 `--deliver` 启动的（此选项无法在启动后再开启，需重启后才能生效）。

## 连接故障排查

- `disconnected`：确保 Gateway 正在运行，并且你的 `--url/--token/--password` 正确。
- 选择器中没有 agent：检查 `openclaw agents list` 和你的路由配置。
- 会话选择器为空：你可能处于 global 作用域，或者还没有任何会话。

## 相关内容

- [控制 UI](/web/control-ui) — 基于 Web 的控制界面
- [配置](/cli/config) — 检查、验证并编辑 `openclaw.json`
- [Doctor](/cli/doctor) — 引导式修复和迁移检查
- [CLI 参考](/cli) — 完整的 CLI 命令参考
