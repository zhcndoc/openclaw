---
summary: "终端 UI（TUI）：连接到 Gateway 或在嵌入模式下本地运行"
read_when:
  - 您想要一个适合初学者的 TUI 使用指南
  - 您需要完整的 TUI 功能、命令和快捷键列表
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

3. 输入消息并按回车。

远程 Gateway：

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

如果您的 Gateway 使用密码认证，请加上 `--password`。

### 本地模式

不依赖 Gateway 运行 TUI：

```bash
openclaw chat
# 或
openclaw tui --local
```

注：

- `openclaw chat` 和 `openclaw terminal` 是 `openclaw tui --local` 的别名。
- `--local` 不能与 `--url`、`--token` 或 `--password` 同时使用。
- 本地模式直接使用嵌入式代理运行时。大多数本地工具可用，但仅限 Gateway 的功能不可用。

## 您会看到什么

- 页眉：连接 URL、当前代理、当前会话。
- 聊天记录：用户消息、助手回复、系统通知、工具卡片。
- 状态行：连接/运行状态（连接中、运行中、流式传输中、空闲、错误）。
- 页脚：连接状态 + 代理 + 会话 + 模型 + 思考/快速/详细/追踪/推理 + 令牌计数 + 交付。
- 输入：带自动补全的文本编辑器。

## 概念模型：代理 + 会话

- 代理是唯一的标识符（如 `main`、`research`）。Gateway 会展示代理列表。
- 会话属于当前代理。
- 会话键储存形式为 `agent:<agentId>:<sessionKey>`。
  - 如果输入 `/session main`，TUI 会扩展为 `agent:<currentAgent>:main`。
  - 如果输入 `/session agent:other:main`，则显式切换到指定代理会话。
- 会话范围：
  - `per-sender`（默认）：每个代理拥有多个会话。
  - `global`：TUI 总是使用 `global` 会话（选择器可能为空）。
- 当前代理和会话始终显示在页脚。

## 发送与发送状态

- 消息发送到 Gateway；默认不向提供者发出交付。
- 开启交付：
  - 输入 `/deliver on`
  - 或在设置面板切换
  - 或启动时加参数 `openclaw tui --deliver`

## 选择器与覆盖层

- 模型选择器：列出可用模型并设置会话覆盖。
- 代理选择器：选择不同代理。
- 会话选择器：仅显示当前代理的会话。
- 设置：切换交付、工具输出展开、思考可见性。

## 键盘快捷键

- 回车：发送消息
- Esc：中止当前运行
- Ctrl+C：清空输入（连按两次退出）
- Ctrl+D：退出
- Ctrl+L：模型选择器
- Ctrl+G：代理选择器
- Ctrl+P：会话选择器
- Ctrl+O：切换工具输出展开
- Ctrl+T：切换思考可见性（重新加载历史）

## 斜杠命令

核心命令：

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

- `/auth [provider]` 会在 TUI 内打开提供方认证/登录流程。

其他 Gateway 斜杠命令（例如 `/context`）会转发到 Gateway，并作为系统输出显示。参见 [斜杠命令](/tools/slash-commands)。

## 本地 shell 命令

- 行首加 `!` 可运行本地 shell 命令（在 TUI 主机上）。
- TUI 每个会话提示一次是否允许本地执行，拒绝则本会话内禁用 `!`。
- 命令在 TUI 工作目录的全新非交互 shell 中运行（无持久的 `cd` 或环境）。
- 本地 shell 命令环境变量包含 `OPENCLAW_SHELL=tui-local`。
- 仅 `!` 会被当作普通消息发送；前导空格不触发本地执行。

## 从本地 TUI 修复配置

当当前配置已经通过验证，而您希望使用嵌入式代理在同一台机器上检查它、与文档对比，并帮助修复偏差而不依赖正在运行的 Gateway 时，请使用本地模式。

如果 `openclaw config validate` 已经失败，请先使用 `openclaw configure` 或 `openclaw doctor --fix`。`openclaw chat` 不会绕过无效配置保护。

典型流程：

1. 启动本地模式：

```bash
openclaw chat
```

2. 让代理检查您想要的内容，例如：

```text
将我的 gateway 认证配置与文档对比，并建议最小修改。
```

3. 使用本地 shell 命令获取准确证据并验证：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

4. 使用 `openclaw config set` 或 `openclaw configure` 应用小范围修改，然后重新运行 `!openclaw config validate`。
5. 如果 Doctor 建议自动迁移或修复，请先审查，然后运行 `!openclaw doctor --fix`。

提示：

- 相比手动编辑 `openclaw.json`，更推荐使用 `openclaw config set` 或 `openclaw configure`。
- `openclaw docs "<query>"` 会在同一台机器上搜索实时文档索引。
- 当您需要结构化的 schema 以及 SecretRef/可解析性错误时，`openclaw config validate --json` 很有用。

## 工具输出

- 工具调用以卡片形式展示参数和结果。
- Ctrl+O 切换收起/展开视图。
- 工具运行时，内容会流式更新在同一卡片中。

## 终端颜色

- TUI 会将助手正文保持为终端的默认前景色，因此无论是深色还是浅色终端都能保持可读性。
- 如果你的终端使用浅色背景且自动检测不准确，请在启动 `openclaw tui` 前设置 `OPENCLAW_THEME=light`。
- 如果想强制使用原始的深色调色板，请设置 `OPENCLAW_THEME=dark`。

## 历史与流式

- 连接时加载最新历史（默认 200 条消息）。
- 流式响应实时更新，直到完成。
- TUI 会监听代理工具事件，呈现更丰富的工具卡片。

## 连接细节

- TUI 以 `mode: "tui"` 向 Gateway 注册。
- 重连时显示系统消息；事件间断会在日志中体现。

## 选项

- `--local`: 使用本地嵌入式代理运行时运行
- `--url <url>`: Gateway WebSocket URL（默认为配置或 `ws://127.0.0.1:<port>`）
- `--token <token>`: Gateway 令牌（如需要）
- `--password <password>`: Gateway 密码（如需要）
- `--session <key>`: 会话键（默认：`main`，或当作用域为 global 时为 `global`）
- `--deliver`: 将助手回复交付给提供方（默认关闭）
- `--thinking <level>`: 覆盖发送时的思考级别
- `--message <text>`: 连接后发送初始消息
- `--timeout-ms <ms>`: 代理超时时间（毫秒，默认值为 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`: 要加载的历史记录条数（默认 `200`）

<Warning>
当您设置了 `--url` 时，TUI 不会回退使用配置或环境中的凭据。请显式传入 `--token` 或 `--password`。缺少显式凭据会报错。在本地模式下，请勿传入 `--url`、`--token` 或 `--password`。
</Warning>

## 故障排查

发送消息后无输出：

- 在 TUI 中运行 `/status` 以确认 Gateway 已连接且处于空闲/忙碌状态。
- 检查 Gateway 日志：`openclaw logs --follow`。
- 确认代理可以运行：`openclaw status` 和 `openclaw models status`。
- 如果您期望在聊天频道中看到消息，请启用交付（`/deliver on` 或 `--deliver`）。

## 连接故障排查

- 已断开：确保 Gateway 正在运行，且您的 `--url/--token/--password` 正确。
- 选择器中无代理：检查 `openclaw agents list` 和您的路由配置。
- 会话选择器为空：您可能处于全局范围，或者还没有会话。

## 相关内容

- [Control UI](/web/control-ui) — 基于 Web 的控制界面
- [Config](/cli/config) — 检查、验证并编辑 `openclaw.json`
- [Doctor](/cli/doctor) — 引导式修复和迁移检查
- [CLI Reference](/cli) — 完整 CLI 命令参考
