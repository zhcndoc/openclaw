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

注意：

- `openclaw chat` 和 `openclaw terminal` 是 `openclaw tui --local` 的别名。
- `--local` 不能与 `--url`、`--token` 或 `--password` 组合使用。
- 本地模式直接使用嵌入式 agent 运行时。大多数本地工具都可用，但仅限 Gateway 的功能不可用。
- `openclaw` 和 `openclaw crestodian` 也会使用这个 TUI shell，其中 Crestodian 作为本地的设置与修复聊天后端。

## 你会看到什么

- 标题栏：连接 URL、当前 agent、当前会话。
- 聊天日志：用户消息、助手回复、系统通知、工具卡片。
- 状态栏：连接/运行状态（connecting、running、streaming、idle、error）。
- 底部栏：连接状态 + agent + 会话 + 模型 + think/fast/verbose/trace/reasoning + token 计数 + deliver。
- 输入区：带自动补全的文本编辑器。

## 心智模型：agents + sessions

- Agents 是唯一的 slug（例如 `main`、`research`）。Gateway 会公开该列表。
- Sessions 归属于当前 agent。
- 会话键以 `agent:<agentId>:<sessionKey>` 存储。
  - 如果你输入 `/session main`，TUI 会将其展开为 `agent:<currentAgent>:main`。
  - 如果你输入 `/session agent:other:main`，你会显式切换到那个 agent 会话。
- 会话范围：
  - `per-sender`（默认）：每个 agent 有多个会话。
  - `global`：TUI 始终使用 `global` 会话（选择器可能为空）。
- 当前 agent + 会话始终会显示在底部栏中。

## 发送 + 交付

- 消息发送到 Gateway；向 provider 的交付默认关闭。
- 开启交付：
  - `/deliver on`
  - 或在 Settings 面板中
  - 或启动时使用 `openclaw tui --deliver`

## 选择器 + 覆盖层

- 模型选择器：列出可用模型并设置会话覆盖项。
- Agent 选择器：选择不同的 agent。
- 会话选择器：只显示当前 agent 的会话。
- 设置：切换 deliver、工具输出展开，以及思考内容可见性。

## 键盘快捷键

- Enter：发送消息
- Esc：中止当前运行
- Ctrl+C：清空输入（按两次退出）
- Ctrl+D：退出
- Ctrl+L：模型选择器
- Ctrl+G：agent 选择器
- Ctrl+P：会话选择器
- Ctrl+O：切换工具输出展开
- Ctrl+T：切换思考内容可见性（会重新加载历史）

## 斜杠命令

核心：

- `/help`
- `/status`
- `/agent <id>`（或 `/agents`）
- `/session <key>`（或 `/sessions`）
- `/model <provider/model>`（或 `/models`）

会话控制：

- `/think <off|minimal|low|medium|high>`
- `/fast <status|on|off>`
- `/verbose <on|full|off>`
- `/trace <on|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>`（别名：`/elev`）
- `/activation <mention|always>`
- `/deliver <on|off>`

会话生命周期：

- `/new` 或 `/reset`（重置会话）
- `/abort`（中止当前运行）
- `/settings`
- `/exit`

仅本地模式：

- `/auth [provider]` 会在 TUI 内打开 provider 的认证/登录流程。

其他 Gateway 斜杠命令（例如 `/context`）会转发到 Gateway，并显示为系统输出。请参阅 [斜杠命令](/tools/slash-commands)。

## 本地 shell 命令

- 在一行前加 `!` 即可在 TUI 主机上运行本地 shell 命令。
- TUI 会在每个会话中提示一次是否允许本地执行；如果拒绝，该会话中 `!` 将保持禁用。
- 命令会在 TUI 工作目录中的全新、非交互式 shell 里运行（不会保留 `cd`/环境变量）。
- 本地 shell 命令会在其环境中接收 `OPENCLAW_SHELL=tui-local`。
- 单独的 `!` 会作为普通消息发送；行首空格不会触发本地执行。

## 从本地 TUI 修复配置

当当前配置已经通过验证，而你希望嵌入式 agent 在同一台机器上检查它、将其与文档对比，并在不依赖运行中的 Gateway 的情况下帮助修复偏差时，请使用本地模式。

如果 `openclaw config validate` 已经失败，请先从 `openclaw configure` 或 `openclaw doctor --fix` 开始。`openclaw chat` 不会绕过无效配置的保护。

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

- 连接时，TUI 会加载最新历史记录（默认 200 条消息）。
- 流式响应会就地更新，直到最终完成。
- TUI 还会监听 agent 的工具事件，以生成更丰富的工具卡片。

## 连接详情

- TUI 会以 `mode: "tui"` 向 Gateway 注册。
- 重连会显示一条系统消息；事件间隙会在日志中体现。

## 选项

- `--local`：针对本地嵌入式 agent 运行时运行
- `--url <url>`：Gateway WebSocket URL（默认为配置或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway token（如需要）
- `--password <password>`：Gateway 密码（如需要）
- `--session <key>`：会话键（默认：`main`；当作用域为 global 时为 `global`）
- `--deliver`：将助手回复交付给 provider（默认关闭）
- `--thinking <level>`：为发送覆盖思考级别
- `--message <text>`：连接后发送初始消息
- `--timeout-ms <ms>`：agent 超时时间（毫秒，默认 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`：要加载的历史记录条数（默认 `200`）

<Warning>
当你设置了 `--url` 时，TUI 不会回退到配置或环境凭据。请显式传入 `--token` 或 `--password`。缺少显式凭据会导致错误。在本地模式下，不要传入 `--url`、`--token` 或 `--password`。
</Warning>

## 故障排查

发送消息后没有输出：

- 在 TUI 中运行 `/status`，确认 Gateway 已连接且处于 idle/busy 状态。
- 查看 Gateway 日志：`openclaw logs --follow`。
- 确认 agent 可以运行：`openclaw status` 和 `openclaw models status`。
- 如果你期望消息出现在聊天频道中，请开启交付（`/deliver on` 或 `--deliver`）。

## 连接故障排查

- `disconnected`：确保 Gateway 正在运行，并且你的 `--url/--token/--password` 正确。
- 选择器中没有 agent：检查 `openclaw agents list` 和你的路由配置。
- 会话选择器为空：你可能处于 global 作用域，或者还没有任何会话。

## 相关内容

- [Control UI](/web/control-ui) — 基于 Web 的控制界面
- [Config](/cli/config) — 检查、验证并编辑 `openclaw.json`
- [Doctor](/cli/doctor) — 引导式修复和迁移检查
- [CLI Reference](/cli) — 完整的 CLI 命令参考
