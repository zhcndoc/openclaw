---
summary: "通过 MCP 暴露 OpenClaw 频道对话并管理已保存的 MCP 服务器定义"
read_when:
  - 将 Codex、Claude Code 或其他 MCP 客户端连接到由 OpenClaw 支持的频道
  - 运行 `openclaw mcp serve`
  - 管理 OpenClaw 保存的 MCP 服务器定义
title: "MCP"
sidebarTitle: "MCP"
---

`openclaw mcp` 有两个职责：

- 使用 `openclaw mcp serve` 将 OpenClaw 作为 MCP 服务器运行
- 使用 `list`、`show`、`set` 和 `unset` 管理 OpenClaw 拥有的出站 MCP 服务器定义

换句话说：

- `serve` 是 OpenClaw 作为 MCP 服务器运行
- `list` / `show` / `set` / `unset` 是 OpenClaw 作为 MCP 客户端侧注册表，用于其运行时后续可能消费的其他 MCP 服务器

当 OpenClaw 应该自行托管一个编码 harness 会话并通过 ACP 路由该运行时时，请改用 [`openclaw acp`](/cli/acp)。

## OpenClaw 作为 MCP 服务器

这就是 `openclaw mcp serve` 路径。

### 何时使用 `serve`

在以下情况下使用 `openclaw mcp serve`：

- Codex、Claude Code 或其他 MCP 客户端应直接与由 OpenClaw 支持的频道对话
- 你已经有一个带有路由会话的本地或远程 OpenClaw Gateway
- 你希望使用一个适用于 OpenClaw 各频道后端的 MCP 服务器，而不是为每个频道分别运行桥接

当 OpenClaw 应该自行托管编码运行时并将代理会话保留在 OpenClaw 内部时，请改用 [`openclaw acp`](/cli/acp)。

### 工作原理

`openclaw mcp serve` 会启动一个 stdio MCP 服务器。MCP 客户端拥有该进程。在客户端保持 stdio 会话打开期间，桥接通过 WebSocket 连接到本地或远程 OpenClaw Gateway，并通过 MCP 暴露已路由的频道对话。

<Steps>
  <Step title="客户端启动桥接">
    MCP 客户端启动 `openclaw mcp serve`。
  </Step>
  <Step title="桥接连接到 Gateway">
    桥接通过 WebSocket 连接到 OpenClaw Gateway。
  </Step>
  <Step title="会话变为 MCP 对话">
    已路由的会话会变为 MCP 对话以及转写/历史工具。
  </Step>
  <Step title="实时事件队列">
    在桥接连接期间，实时事件会在内存中排队。
  </Step>
  <Step title="可选的 Claude 推送">
    如果启用了 Claude 频道模式，同一会话也可以接收 Claude 特定的推送通知。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="重要行为">
    - 实时队列状态从桥接连接时开始
    - 较早的转写历史通过 `messages_read` 读取
    - Claude 推送通知只在 MCP 会话存活期间存在
    - 当客户端断开连接时，桥接退出，实时队列也会消失
    - `openclaw agent` 和 `openclaw infer model run` 等一次性代理入口在回复完成时会退役其打开的任何捆绑 MCP 运行时，因此重复的脚本运行不会累积 stdio MCP 子进程
    - OpenClaw 启动的 stdio MCP 服务器（捆绑的或用户配置的）会在关闭时作为进程树被拆除，因此由服务器启动的子进程不会在父级 stdio 客户端退出后继续存活
    - 删除或重置会话会通过共享运行时清理路径释放该会话的 MCP 客户端，因此不会残留与已移除会话关联的 stdio 连接

  </Accordion>
</AccordionGroup>

### 选择客户端模式

同一个桥接可以用两种不同方式使用：

<Tabs>
  <Tab title="通用 MCP 客户端">
    仅使用标准 MCP 工具。使用 `conversations_list`、`messages_read`、`events_poll`、`events_wait`、`messages_send` 和审批工具。
  </Tab>
  <Tab title="Claude Code">
    标准 MCP 工具加上 Claude 特定的频道适配器。启用 `--claude-channel-mode on`，或保持默认的 `auto`。
  </Tab>
</Tabs>

<Note>
目前，`auto` 的行为与 `on` 相同。尚未进行客户端能力检测。
</Note>

### `serve` 暴露什么

该桥接使用现有的 Gateway 会话路由元数据来暴露由频道支持的对话。当 OpenClaw 已经拥有具有已知路由的会话状态时，会显示一个对话，例如：

- `channel`
- 接收方或目标元数据
- 可选的 `accountId`
- 可选的 `threadId`

这让 MCP 客户端可以在一个地方完成：

- 列出最近的路由对话
- 读取最近的转写历史
- 等待新的入站事件
- 通过同一路由发送回复
- 查看桥接连接期间到达的审批请求

### 用法

<Tabs>
  <Tab title="本地 Gateway">
    ```bash
    openclaw mcp serve
    ```
  </Tab>
  <Tab title="远程 Gateway（token）">
    ```bash
    openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
    ```
  </Tab>
  <Tab title="远程 Gateway（password）">
    ```bash
    openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password
    ```
  </Tab>
  <Tab title="详细日志 / 关闭 Claude">
    ```bash
    openclaw mcp serve --verbose
    openclaw mcp serve --claude-channel-mode off
    ```
  </Tab>
</Tabs>

### 桥接工具

当前桥接暴露以下 MCP 工具：

<AccordionGroup>
  <Accordion title="conversations_list">
    列出最近的、已绑定会话的对话，这些对话在 Gateway 会话状态中已经有路由元数据。

    有用的过滤条件：

    - `limit`
    - `search`
    - `channel`
    - `includeDerivedTitles`
    - `includeLastMessage`

  </Accordion>
  <Accordion title="conversation_get">
    通过 `session_key` 使用直接的 Gateway 会话查找返回一个对话。
  </Accordion>
  <Accordion title="messages_read">
    读取一个已绑定会话对话的最近转写消息。
  </Accordion>
  <Accordion title="attachments_fetch">
    从一条转写消息中提取非文本消息内容块。这是对转写内容的元数据视图，而不是独立的持久化附件 blob 存储。
  </Accordion>
  <Accordion title="events_poll">
    从一个数值游标开始读取已排队的实时事件。
  </Accordion>
  <Accordion title="events_wait">
    长轮询直到下一个匹配的已排队事件到达或超时结束。

    当通用 MCP 客户端需要接近实时的投递，但不使用 Claude 特定推送协议时，请使用这个工具。

  </Accordion>
  <Accordion title="messages_send">
    通过会话上已记录的同一路由发送文本回复。

    当前行为：

    - 需要一个现有的对话路由
    - 使用会话的 channel、recipient、account id 和 thread id
    - 仅发送文本

  </Accordion>
  <Accordion title="permissions_list_open">
    列出桥接自连接到 Gateway 以来观察到的待处理 exec/plugin 审批请求。
  </Accordion>
  <Accordion title="permissions_respond">
    使用以下之一解决一个待处理的 exec/plugin 审批请求：

    - `allow-once`
    - `allow-always`
    - `deny`

  </Accordion>
</AccordionGroup>

### 事件模型

桥接在连接期间会维护一个内存中的事件队列。

当前事件类型：

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

<Warning>
- 队列仅限实时；它从 MCP 桥接启动时开始
- `events_poll` 和 `events_wait` 本身不会回放更早的 Gateway 历史
- 持久的历史积压应通过 `messages_read` 读取

</Warning>

### Claude 频道通知

该桥接还可以暴露 Claude 特定的频道通知。这是 OpenClaw 对 Claude Code 频道适配器的对应实现：标准 MCP 工具仍然可用，但实时入站消息也可以作为 Claude 特定的 MCP 通知到达。

<Tabs>
  <Tab title="off">
    `--claude-channel-mode off`：仅使用标准 MCP 工具。
  </Tab>
  <Tab title="on">
    `--claude-channel-mode on`：启用 Claude 频道通知。
  </Tab>
  <Tab title="auto（默认）">
    `--claude-channel-mode auto`：当前默认值；行为与 `on` 相同。
  </Tab>
</Tabs>

启用 Claude 频道模式后，服务器会声明 Claude 实验性能力，并可以发出：

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

当前桥接行为：

- 入站 `user` 转写消息会作为 `notifications/claude/channel` 转发
- 通过 MCP 接收的 Claude 权限请求会在内存中跟踪
- 如果链接的对话后来发送了 `yes abcde` 或 `no abcde`，桥接会将其转换为 `notifications/claude/channel/permission`
- 这些通知仅在实时会话中有效；如果 MCP 客户端断开连接，就没有推送目标了

这故意是客户端特定的。通用 MCP 客户端应依赖标准轮询工具。

### MCP 客户端配置

stdio 客户端配置示例：

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

对于大多数通用 MCP 客户端，请从标准工具面开始，并忽略 Claude 模式。只有当客户端确实理解 Claude 特定通知方法时，才开启 Claude 模式。

### 选项

`openclaw mcp serve` 支持：

<ParamField path="--url" type="string">
  Gateway WebSocket URL。
</ParamField>
<ParamField path="--token" type="string">
  Gateway token。
</ParamField>
<ParamField path="--token-file" type="string">
  从文件读取 token。
</ParamField>
<ParamField path="--password" type="string">
  Gateway 密码。
</ParamField>
<ParamField path="--password-file" type="string">
  从文件读取密码。
</ParamField>
<ParamField path="--claude-channel-mode" type='"auto" | "on" | "off"'>
  Claude 通知模式。
</ParamField>
<ParamField path="-v, --verbose" type="boolean">
  在 stderr 上输出详细日志。
</ParamField>

<Tip>
尽可能优先使用 `--token-file` 或 `--password-file`，而不是内联密钥。
</Tip>

### 安全性与信任边界

桥接不会凭空创造路由。它只暴露 Gateway 已经知道如何路由的对话。

这意味着：

- 发送方允许列表、配对以及频道级信任仍然属于底层 OpenClaw 频道配置
- `messages_send` 只能通过现有已存储的路由进行回复
- 审批状态仅对当前桥接会话是实时的、内存中的
- 桥接认证应使用与任何其他远程 Gateway 客户端相同的 Gateway token 或 password 控制

如果 `conversations_list` 中缺少某个对话，通常原因不是 MCP 配置有问题，而是底层 Gateway 会话中缺少或不完整的路由元数据。

### 测试

OpenClaw 为此桥接提供了确定性的 Docker 冒烟测试：

```bash
pnpm test:docker:mcp-channels
```

该冒烟测试会：

- 启动一个带种子的 Gateway 容器
- 启动第二个容器来运行 `openclaw mcp serve`
- 验证对话发现、转写读取、附件元数据读取、实时事件队列行为，以及出站发送路由
- 通过真实的 stdio MCP 桥接验证 Claude 风格的频道和权限通知

这是在不把真实的 Telegram、Discord 或 iMessage 账户接入测试运行的情况下证明桥接可用的最快方式。

有关更广泛的测试背景，请参阅 [测试](/help/testing)。

### 故障排查

<AccordionGroup>
  <Accordion title="未返回任何对话">
    通常表示 Gateway 会话尚不可路由。请确认底层会话已存储 channel/provider、recipient，以及可选的 account/thread 路由元数据。
  </Accordion>
  <Accordion title="events_poll 或 events_wait 漏掉了较早的消息">
    这是预期行为。实时队列从桥接连接时开始。请使用 `messages_read` 读取更早的转写历史。
  </Accordion>
  <Accordion title="Claude 通知没有出现">
    请检查以下所有项：

    - 客户端保持了 stdio MCP 会话打开
    - `--claude-channel-mode` 为 `on` 或 `auto`
    - 客户端确实理解 Claude 特定的通知方法
    - 入站消息发生在桥接连接之后

  </Accordion>
  <Accordion title="缺少审批">
    `permissions_list_open` 只显示桥接连接期间观察到的审批请求。它不是一个持久的审批历史 API。
  </Accordion>
</AccordionGroup>

## 作为 MCP 客户端注册表的 OpenClaw

这是 `openclaw mcp list`、`show`、`set` 和 `unset` 的路径。

这些命令不会通过 MCP 暴露 OpenClaw。它们管理 OpenClaw 配置中 `mcp.servers` 下由 OpenClaw 拥有的 MCP 服务器定义。

这些已保存的定义适用于 OpenClaw 后续启动或配置的运行时，例如嵌入式 Pi 和其他运行时适配器。OpenClaw 将这些定义集中存储，因此这些运行时不需要维护自己重复的 MCP 服务器列表。

<AccordionGroup>
  <Accordion title="重要行为">
    - 这些命令只读取或写入 OpenClaw 配置
    - 它们不会连接到目标 MCP 服务器
    - 它们不会验证当前命令、URL 或远程传输是否可达
    - 运行时适配器会在执行时决定它们实际支持哪些传输形式
    - 嵌入式 Pi 会在普通 `coding` 和 `messaging` 工具配置文件中暴露已配置的 MCP 工具；`minimal` 仍然会隐藏它们，而 `tools.deny: ["bundle-mcp"]` 会显式禁用它们
    - 作用域为会话的捆绑 MCP 运行时会在空闲 `mcp.sessionIdleTtlMs` 毫秒后被清理（默认 10 分钟；设为 `0` 可禁用），一次性嵌入式运行会在运行结束时清理它们

  </Accordion>
</AccordionGroup>

运行时适配器可能会将这个共享注册表规范化为其下游客户端所期望的形状。例如，嵌入式 Pi 直接使用 OpenClaw 的 `transport` 值，而 Claude Code 和 Gemini 接收 CLI 原生的 `type` 值，例如 `http`、`sse` 或 `stdio`。

Codex app-server 也支持每个服务器上的可选 `codex` 块。这是仅针对 Codex app-server 线程的 OpenClaw 投影元数据；它不会更改 ACP 会话、通用 Codex harness 配置或其他运行时适配器。使用非空的 `codex.agents` 可以将服务器仅投影到特定的 OpenClaw agent id。空的、空白的或无效的 agent 列表会被配置验证拒绝，并且会在运行时投影路径中被省略，而不是变成全局配置。使用 `codex.defaultToolsApprovalMode`（`auto`、`prompt` 或 `approve`）为受信任的服务器发出 Codex 原生的 `default_tools_approval_mode`。在将原生 `mcp_servers` 配置交给 Codex 之前，OpenClaw 会剥离 `codex` 元数据。

### 已保存的 MCP 服务器定义

OpenClaw 还会在配置中存储一个轻量级的 MCP 服务器注册表，用于希望使用 OpenClaw 管理的 MCP 定义的界面。

命令：

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp unset <name>`

说明：

- `list` 会按服务器名称排序。
- 不带名称的 `show` 会打印完整配置的 MCP 服务器对象。
- `set` 期望在命令行中提供一个 JSON 对象值。
- 对于 Streamable HTTP MCP 服务器，请使用 `transport: "streamable-http"`。`openclaw mcp set` 还会将 CLI 原生的 `type: "http"` 规范化为相同的标准配置形状以兼容。
- 如果指定名称的服务器不存在，`unset` 会失败。

示例：

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
openclaw mcp unset context7
```

示例配置形状：

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },
      "docs": {
        "url": "https://mcp.example.com",
        "transport": "streamable-http"
      }
    }
  }
}
```

### Stdio 传输

启动一个本地子进程，并通过 stdin/stdout 通信。

| 字段                       | 说明                          |
| -------------------------- | ----------------------------- |
| `command`                  | 要启动的可执行文件（必需）     |
| `args`                     | 命令行参数数组                |
| `env`                      | 额外的环境变量                |
| `cwd` / `workingDirectory` | 进程的工作目录                |

<Warning>
**Stdio 环境变量安全过滤器**

OpenClaw 会拒绝那些可能在首次 RPC 之前改变 stdio MCP 服务器启动方式的解释器启动环境键，即使它们出现在服务器的 `env` 块中。被阻止的键包括 `NODE_OPTIONS`、`PYTHONSTARTUP`、`PYTHONPATH`、`PERL5OPT`、`RUBYOPT`、`SHELLOPTS`、`PS4` 以及类似的运行时控制变量。启动时会因配置错误拒绝这些变量，因此它们不能注入隐式前置内容、替换解释器或针对 stdio 进程启用调试器。普通的凭据、代理和服务器特定环境变量（`GITHUB_TOKEN`、`HTTP_PROXY`、自定义 `*_API_KEY` 等）不受影响。

如果你的 MCP 服务器确实需要其中某个被阻止的变量，请将其设置在网关主机进程上，而不是放在 stdio 服务器的 `env` 下。
</Warning>

### SSE / HTTP 传输

通过 HTTP Server-Sent Events 连接到远程 MCP 服务器。

| 字段                 | 说明                                                      |
| --------------------- | --------------------------------------------------------- |
| `url`                 | 远程服务器的 HTTP 或 HTTPS URL（必需）                    |
| `headers`             | HTTP 头的可选键值映射（例如认证令牌）                     |
| `connectionTimeoutMs` | 每个服务器的连接超时时间，单位为 ms（可选）               |

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

`url` 中的敏感值（userinfo）和 `headers` 会在日志和状态输出中被隐藏。

### Streamable HTTP 传输

`streamable-http` 是与 `sse` 和 `stdio` 并列的另一种传输选项。它使用 HTTP 流式传输与远程 MCP 服务器进行双向通信。

| 字段                 | 说明                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| `url`                 | 远程服务器的 HTTP 或 HTTPS URL（必需）                                          |
| `transport`           | 设为 `"streamable-http"` 以选择此传输；如果省略，OpenClaw 将使用 `sse`          |
| `headers`             | HTTP 头的可选键值映射（例如认证令牌）                                           |
| `connectionTimeoutMs` | 每个服务器的连接超时时间，单位为 ms（可选）                                     |

OpenClaw 配置使用 `transport: "streamable-http"` 作为标准写法。通过 `openclaw mcp set` 保存时会接受 CLI 原生的 MCP `type: "http"` 值，并由 `openclaw doctor --fix` 修复现有配置，但 `transport` 才是嵌入式 Pi 直接使用的值。

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

<Note>
这些命令只管理已保存的配置。它们不会启动通道桥接、打开一个实时的 MCP 客户端会话，也不能证明目标服务器可达。
</Note>

## 当前限制

此页面记录的是当前随版本发布的桥接功能。

当前限制：

- 会话发现依赖于现有的 Gateway 会话路由元数据
- 除了 Claude 特定适配器之外，没有通用的推送协议
- 目前还没有消息编辑或反应工具
- HTTP/SSE/streamable-http 传输连接到单个远程服务器；尚未支持多路复用上游
- `permissions_list_open` 只包含桥接连接期间观察到的审批

## 相关

- [CLI 参考](/cli)
- [插件](/cli/plugins)
