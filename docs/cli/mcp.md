---
summary: "通过 MCP 暴露 OpenClaw 渠道对话并管理保存的 MCP 服务器定义"
read_when:
  - 连接 Codex、Claude Code 或其他 MCP 客户端到 OpenClaw 支持的渠道
  - 运行 `openclaw mcp serve`
  - 管理 OpenClaw 保存的 MCP 服务器定义
title: "MCP"
---

`openclaw mcp` 有两个职责：

- 使用 `openclaw mcp serve` 将 OpenClaw 作为 MCP 服务器运行
- 使用 `list`、`show`、`set` 和 `unset` 管理 OpenClaw 拥有的出站 MCP 服务器定义

换句话说：

- `serve` 是 OpenClaw 作为 MCP 服务器运行
- `list` / `show` / `set` / `unset` 是 OpenClaw 作为 MCP 客户端侧注册表，用于其运行时稍后可能使用的其他 MCP 服务器

当 OpenClaw 应自行托管代码会话环境并通过 ACP 路由该运行时时，请使用 [`openclaw acp`](/cli/acp)。

## OpenClaw 作为 MCP 服务器

这是 `openclaw mcp serve` 路径。

## 何时使用 serve

当以下情况时使用 `openclaw mcp serve`：

- Codex、Claude Code 或其他 MCP 客户端应直接与 OpenClaw 支持的渠道对话通信
- 你已经拥有具有已路由会话的本地或远程 OpenClaw Gateway
- 你想要一个跨 OpenClaw 渠道后端工作的 MCP 服务器，而不是运行单独的每渠道桥接

当 OpenClaw 应自行托管代码运行时并将代理会话保留在 OpenClaw 内部时，请改用 [`openclaw acp`](/cli/acp)。

## 工作原理

`openclaw mcp serve` 启动一个 stdio MCP 服务器。MCP 客户端拥有该进程。当客户端保持 stdio 会话打开时，桥接通过 WebSocket 连接到本地或远程 OpenClaw Gateway，并通过 MCP 暴露已路由的渠道对话。

生命周期：

1. MCP 客户端生成 `openclaw mcp serve`
2. 桥接连接到 Gateway
3. 已路由的会话变为 MCP 对话和记录/历史工具
4. 实时事件在桥接连接时在内存中排队
5. 如果启用了 Claude 渠道模式，同一会话也可以接收 Claude 特定的推送通知

重要行为：

- 活动队列状态在桥接连接时开始
- 较早的记录历史通过 `messages_read` 读取
- Claude 推送通知仅在 MCP 会话存活期间存在
- 当客户端断开连接时，桥接退出，活动队列消失
- OpenClaw 启动的 stdio MCP 服务器（内置或用户配置的）在关闭时会作为进程树被拆除，因此由服务器启动的子进程不会在父 stdio 客户端退出后继续存活
- 删除或重置会话会通过共享的运行时清理路径处置该会话的 MCP 客户端，因此不会留下与已移除会话绑定的残留 stdio 连接

## 选择客户端模式

以两种不同的方式使用同一桥接：

- 通用 MCP 客户端：仅标准 MCP 工具。使用 `conversations_list`、`messages_read`、`events_poll`、`events_wait`、`messages_send` 和审批工具。
- Claude Code：标准 MCP 工具加上 Claude 特定的渠道适配器。启用 `--claude-channel-mode on` 或保留默认值 `auto`。

目前，`auto` 的行为与 `on` 相同。尚未进行客户端能力检测。

## serve 暴露的内容

桥接使用现有的 Gateway 会话路由元数据来暴露渠道支持的对话。当 OpenClaw 已经具有带有已知路由的会话状态时，对话会出现，例如：

- `channel`
- 收件人或目标元数据
- 可选 `accountId`
- 可选 `threadId`

这为 MCP 客户端提供了一个地方来：

- 列出最近的已路由对话
- 读取最近的记录历史
- 等待新的入站事件
- 通过同一路由发送回复
- 查看桥接连接时到达的审批请求

## 用法

```bash
# 本地 Gateway
openclaw mcp serve

# 远程 Gateway
openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# 使用密码认证的远程 Gateway
openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password

# 启用详细的桥接日志
openclaw mcp serve --verbose

# 禁用 Claude 特定的推送通知
openclaw mcp serve --claude-channel-mode off
```

## 桥接工具

当前桥接暴露这些 MCP 工具：

- `conversations_list`
- `conversation_get`
- `messages_read`
- `attachments_fetch`
- `events_poll`
- `events_wait`
- `messages_send`
- `permissions_list_open`
- `permissions_respond`

### `conversations_list`

列出 Gateway 会话状态中已经具有路由元数据的最近会话支持的对话。

有用的过滤器：

- `limit`
- `search`
- `channel`
- `includeDerivedTitles`
- `includeLastMessage`

### `conversation_get`

通过 `session_key` 返回一个对话。

### `messages_read`

读取一个会话支持的对话的最近记录消息。

### `attachments_fetch`

从一个记录消息中提取非文本消息内容块。这是记录内容的元数据视图，而不是独立的持久化附件 blob 存储。

### `events_poll`

从数字游标开始读取排队的实时事件。

### `events_wait`

长轮询直到下一个匹配的排队事件到达或超时过期。

当通用 MCP 客户端需要近实时交付而不需要 Claude 特定的推送协议时使用此功能。

### `messages_send`

通过会话上已记录的同一路由发送文本回去。

当前行为：

- 需要现有的对话路由
- 使用会话的渠道、收件人、账户 id 和线程 id
- 仅发送文本

### `permissions_list_open`

列出桥接自连接到 Gateway 以来观察到的待处理 exec/插件审批请求。

### `permissions_respond`

解决一个待处理的 exec/插件审批请求，使用：

- `allow-once`
- `allow-always`
- `deny`

## 事件模型

桥接在连接时保持一个内存事件队列。

当前事件类型：

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

重要限制：

- 队列仅是实时的；它在 MCP 桥接启动时开始
- `events_poll` 和 `events_wait` 本身不会重放旧的 Gateway 历史
- 持久化积压应通过 `messages_read` 读取

## Claude 渠道通知

桥接还可以暴露 Claude 特定的渠道通知。这是 OpenClaw 等效的 Claude Code 渠道适配器：标准 MCP 工具仍然可用，但实时入站消息也可以作为 Claude 特定的 MCP 通知到达。

标志：

- `--claude-channel-mode off`：仅标准 MCP 工具
- `--claude-channel-mode on`：启用 Claude 渠道通知
- `--claude-channel-mode auto`：当前默认值；与 `on` 的桥接行为相同

当启用 Claude 渠道模式时，服务器宣传 Claude 实验性功能并可以发出：

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

当前桥接行为：

- 入站 `user` 记录消息作为 `notifications/claude/channel` 转发
- 通过 MCP 接收的 Claude 权限请求在内存中跟踪
- 如果关联的对话稍后发送 `yes abcde` 或 `no abcde`，桥接将其转换为 `notifications/claude/channel/permission`
- 这些通知仅是实时会话的；如果 MCP 客户端断开连接，则没有推送目标

这是故意针对特定客户端的。通用 MCP 客户端应依赖标准轮询工具。

## MCP 客户端配置

示例 stdio 客户端配置：

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "openclaw",
      "args": [
        "mcp",
        "serve",
        "--url",
        "wss://gateway-host:18789",
        "--token-file",
        "/path/to/gateway.token"
      ]
    }
  }
}
```

对于大多数通用 MCP 客户端，从标准工具集开始并忽略 Claude 模式。仅针对实际理解 Claude 特定通知方法的客户端开启 Claude 模式。

## 选项

`openclaw mcp serve` 支持：

- `--url <url>`：Gateway WebSocket URL
- `--token <token>`：Gateway 令牌
- `--token-file <path>`：从文件读取令牌
- `--password <password>`：Gateway 密码
- `--password-file <path>`：从文件读取密码
- `--claude-channel-mode <auto|on|off>`：Claude 通知模式
- `-v`, `--verbose`：stderr 上的详细日志

可能时优先使用 `--token-file` 或 `--password-file` 而不是内联密钥。

## 安全性和信任边界

桥接不创建路由。它仅暴露 Gateway 已经知道如何路由的对话。

这意味着：

- 发送者白名单、配对和渠道级信任仍然属于底层 OpenClaw 渠道配置
- `messages_send` 只能通过现有的存储路由进行回复
- 审批状态仅针对当前桥接会话是实时/内存中的
- 桥接认证应使用与你信任任何其他远程 Gateway 客户端相同的 Gateway 令牌或密码控制

如果对话在 `conversations_list` 中缺失，通常原因不是 MCP 配置。而是底层 Gateway 会话中缺失或不完整的路由元数据。

## 测试

OpenClaw 为此桥接提供确定性 Docker 冒烟测试：

```bash
pnpm test:docker:mcp-channels
```

该冒烟测试：

- 启动一个预植数据的 Gateway 容器
- 启动第二个容器生成 `openclaw mcp serve`
- 验证对话发现、记录读取、附件元数据读取、实时事件队列行为和出站发送路由
- 通过真实的 stdio MCP 桥接验证 Claude 风格渠道和权限通知

这是证明桥接工作而无需将真实的 Telegram、Discord 或 iMessage 账户接入测试运行的最快方法。

有关更广泛的测试上下文，请参阅 [测试](/help/testing)。

## 故障排除

### 未返回对话

通常意味着 Gateway 会话尚不可路由。确认底层会话已存储渠道/提供商、收件人和可选账户/线程路由元数据。

### `events_poll` 或 `events_wait` 错过旧消息

预期行为。实时队列在桥接连接时开始。使用 `messages_read` 读取旧的记录历史。

### Claude 通知未显示

检查所有这些：

- 客户端保持 stdio MCP 会话打开
- `--claude-channel-mode` 是 `on` 或 `auto`
- 客户端实际理解 Claude 特定的通知方法
- 入站消息发生在桥接连接之后

### 审批缺失

`permissions_list_open` 仅显示桥接连接时观察到的审批请求。它不是持久化的审批历史 API。

## OpenClaw 作为 MCP 客户端注册表

这是 `openclaw mcp list`、`show`、`set` 和 `unset` 路径。

这些命令不会通过 MCP 暴露 OpenClaw。它们管理 OpenClaw 配置中 `mcp.servers` 下的 OpenClaw 拥有的 MCP 服务器定义。

这些保存的定义用于 OpenClaw 启动或配置的运行时，例如嵌入式 Pi 和其他运行时适配器。OpenClaw 集中存储这些定义，以便这些运行时不需要保留自己重复的 MCP 服务器列表。

重要行为：

- 这些命令只读取或写入 OpenClaw 配置
- 它们不会连接到目标 MCP 服务器
- 它们不会验证命令、URL 或远程传输是否此刻可达
- 运行时适配器在执行时决定它们实际支持哪些传输形态
- embedded Pi 在正常的 `coding` 和 `messaging` 工具配置文件中暴露已配置的 MCP 工具；`minimal` 仍然隐藏它们，而 `tools.deny: ["bundle-mcp"]` 会显式禁用它们

## 已保存的 MCP 服务器定义

OpenClaw 还在配置中存储一个轻量级的 MCP 服务器注册表，供需要 OpenClaw 管理的 MCP 定义的界面使用。

命令：

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp unset <name>`

注意：

- `list` 对服务器名称进行排序。
- `show` 不带名称时打印完整配置的 MCP 服务器对象。
- `set` 期望命令行上有一个 JSON 对象值。
- 如果命名的服务器不存在，`unset` 将失败。

示例：

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp set docs '{"url":"https://mcp.example.com"}'
openclaw mcp unset context7
```

示例配置结构：

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },
      "docs": {
        "url": "https://mcp.example.com"
      }
    }
  }
}
```

### Stdio 传输

启动本地子进程并通过 stdin/stdout 进行通信。

| 字段                       | 描述                           |
| -------------------------- | ------------------------------ |
| `command`                  | 要生成的可执行文件（必需）     |
| `args`                     | 命令行参数数组                 |
| `env`                      | 额外环境变量                   |
| `cwd` / `workingDirectory` | 进程的工作目录                 |

#### Stdio env safety filter

OpenClaw 会拒绝那些可在第一个 RPC 之前改变 stdio MCP 服务器启动方式的解释器启动环境变量键，即使它们出现在服务器的 `env` 块中也是如此。被阻止的键包括 `NODE_OPTIONS`、`PYTHONSTARTUP`、`PYTHONPATH`、`PERL5OPT`、`RUBYOPT`、`SHELLOPTS`、`PS4` 以及类似的运行时控制变量。启动时会以配置错误拒绝这些变量，因此它们不能注入隐式前导代码、替换解释器，或对 stdio 进程启用调试器。普通的凭据、代理和服务器特定环境变量（`GITHUB_TOKEN`、`HTTP_PROXY`、自定义 `*_API_KEY` 等）不受影响。

如果你的 MCP 服务器确实需要这些被阻止的变量之一，请将其设置在 Gateway 主机进程上，而不是放在 stdio 服务器的 `env` 下。

### SSE / HTTP transport

通过 HTTP 服务器发送事件连接到远程 MCP 服务器。

| 字段                 | 描述                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `url`                 | 远程服务器的 HTTP 或 HTTPS URL（必需）                |
| `headers`             | HTTP 头部的可选键值映射（例如认证令牌） |
| `connectionTimeoutMs` | 每个服务器的连接超时时间（毫秒）（可选）                   |

示例：

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

`url`（用户信息）和 `headers` 中的敏感值在日志和状态输出中会被遮蔽。

### Streamable HTTP 传输

`streamable-http` 是 `sse` 和 `stdio` 之外的另一种传输选项。它使用 HTTP 流式传输与远程 MCP 服务器进行双向通信。

| 字段                 | 描述                                                                            |
| --------------------- | -------------------------------------------------------------------------------------- |
| `url`                 | 远程服务器的 HTTP 或 HTTPS URL（必需）                                      |
| `transport`           | 设置为 `"streamable-http"` 以选择此传输；省略时，OpenClaw 使用 `sse` |
| `headers`             | HTTP 头部的可选键值映射（例如认证令牌）                       |
| `connectionTimeoutMs` | 每个服务器的连接超时时间（毫秒）（可选）                                         |

示例：

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectionTimeoutMs": 10000,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

这些命令仅管理保存的配置。它们不会启动渠道桥接，不会打开活动的 MCP 客户端会话，也不会证明目标服务器是否可达。

## Current Limitations

This page records the bridge features that are currently released.

Current limitations:

- conversation discovery depends on existing Gateway session route metadata
- no generic push protocol beyond the Claude-specific adapter
- no message edit or react tools yet
- HTTP/SSE/streamable-http transport connects to a single remote server; no multiplexed upstream yet
- `permissions_list_open` only includes approvals observed while the bridge is
  connected

## Related

- [CLI reference](/cli)
- [Plugins](/cli/plugins)
