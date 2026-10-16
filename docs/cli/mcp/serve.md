---
summary: "将 OpenClaw 作为 stdio MCP 服务器运行，以便 MCP 客户端可以读取和发送通道对话"
title: "将 OpenClaw 作为 MCP 服务器运行"
read_when:
  - "将 Codex、Claude Code 或另一个 MCP 客户端连接到 OpenClaw- 支持的通道"
  - "运行 `openclaw mcp serve`"
  - "调试桥接事件、Claude 通知或丢失的对话"
---

本页介绍了 `openclaw mcp serve` 路径：OpenClaw 充当 stdio 上的 MCP 服务器、其工具、事件模型及其限制。

## <a id="openclaw-as-an-mcp-server"></a> OpenClaw 作为 MCP 服务器

这是 `openclaw mcp serve` 路径。

### <a id="when-to-use-serve"></a> 何时使用 serve

在以下情况下使用 `openclaw mcp serve`：

- Codex、Claude Code 或其他 MCP 客户端应直接与 OpenClaw- 支持的通道对话进行对话
- 你已经有一个带有已路由对话的本地或远程 OpenClaw Gateway
- 您需要一台跨 OpenClaw 通道后端工作的 MCP 服务器，而不是运行单独的每通道桥接器

当 OpenClaw 应该自行托管编码运行时并将代理会话保留在 OpenClaw 内部时，请改用 [`openclaw acp`](/cli/acp)。

### <a id="how-it-works"></a> 工作原理

`openclaw mcp serve` 启动 stdio MCP 服务器。 MCP 客户端拥有该进程。当客户端保持 stdio 会话打开时，桥接器通过 WebSocket 连接到本地或远程 OpenClaw 网关，并通过 MCP 公开路由通道对话。

<Steps>
  <Step id="client-spawns-the-bridge" title="客户端生成桥">
    MCP 客户端启动 `openclaw mcp serve`。
  </Step>
  <Step id="bridge-connects-to-gateway" title="网桥连接到网关">
    该网桥通过 WebSocket 连接到 OpenClaw 网关。
  </Step>
  <Step id="sessions-become-mcp-conversations" title="会话变成 MCP 对话">
    路由会话变成 MCP 对话和 transcript/history 工具。
  </Step>
  <Step id="live-events-queue" title="现场活动队列">
    在桥接器连接期间，实时事件会在内存中排队。
  </Step>
  <Step id="optional-claude-push" title="可选Claude推">
    如果启用Claude通道模式，同一会话还可以接收Claude-特定的推送通知。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion id="important-behavior" title="重要行为">
    - 实时队列状态在桥接器连接时开始
    - 更早的转录历史通过 `messages_read` 读取
    - Claude 推送通知仅在 MCP 会话存活期间存在
    - 当客户端断开连接时，桥接器退出，实时队列消失
    - 取消`events_wait`请求立即释放其服务器端等待和超时
    - bridge 或 MCP 传输关闭失败使 `openclaw mcp serve` 失败，而不是报告干净关闭
    - 一次性 agent 入口点（例如 `openclaw agent` 和 `openclaw infer model run`）会在回复完成时退出它们打开的任何打包 MCP 运行时，因此重复运行脚本不会累积 stdio MCP 子进程
    - stdio MCP 由 OpenClaw 启动的服务器（捆绑或用户配置）在关闭时会作为进程树被拆除，因此在父 stdio 客户端退出后，由服务器启动的子进程将无法生存
    - 删除或重置会话会通过共享运行时清理路径释放该会话的 MCP 客户端，因此不会有任何 stdio 连接仍然附着在已移除的会话上

  </Accordion>
</AccordionGroup>

### <a id="choose-a-client-mode"></a> 选择客户端模式

<Tabs>
  <Tab id="generic-mcp-clients" title="通用 MCP 客户端">
    仅使用标准 MCP 工具。使用 `conversations_list`、`messages_read`、`events_poll`、`events_wait`、`messages_send` 以及审批工具。
  </Tab>
  <Tab title="Claude Code">
    标准 MCP 工具加上 Claude- 特定通道适配器。启用 `--claude-channel-mode on` 或保留默认值 `auto`。
  </Tab>
</Tabs>

<Note>
`auto` 的行为与 `on` 相同。没有客户端能力检测。
</Note>

### <a id="what-serve-exposes"></a> serve 暴露的内容

该桥接使用现有的 Gateway 会话路由元数据来暴露由 channel 支持的对话。当 OpenClaw 已经拥有已知路由的会话状态时，你会得到如下对话信息：

- `channel`
- 收件人或目标元数据
- 可选的 `accountId`
- 可选的 `threadId`

这使得 MCP 客户端可以在一个地方完成以下所有操作：

- 列出最近的已路由对话
- 读取最近的会话记录历史
- 等待新的入站事件
- 通过相同路由发送回复
- 查看桥接连接期间到达的审批请求

### <a id="usage"></a> 用法

<Tabs>
  <Tab id="local-gateway" title="本地网关">
    ```bash
    openclaw mcp serve
    ```
  </Tab>
  <Tab id="remote-gateway-token" title="远程网关（令牌）">
    ```bash
    openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
    ```
  </Tab>
  <Tab id="remote-gateway-password" title="远程网关（密码）">
    ```bash
    openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password
    ```
  </Tab>
  <Tab id="verbose-%2F-claude-off" title="详细 / Claude 关闭">
    ```bash
    openclaw mcp serve --verbose
    openclaw mcp serve --claude-channel-mode off
    ```
  </Tab>
</Tabs>

### <a id="bridge-tools"></a> 桥接工具

<AccordionGroup>
  <Accordion title="conversations_list">
    列出最近的、由会话支持的对话，这些对话在 Gateway 会话状态中已经有路由元数据。

    筛选条件：`limit`（最大 500）、`search`、`channel`、`includeDerivedTitles`、`includeLastMessage`。

  </Accordion>
  <Accordion title="conversation_get">
    使用 `session_key` 通过直接的 Gateway 会话查询返回一个对话。
  </Accordion>
  <Accordion title="messages_read">
    读取一个由会话支持的对话的最近转写消息。`limit` 默认为 20，最大 200。
  </Accordion>
  <Accordion title="attachments_fetch">
    从一封抄本消息中提取非文本消息内容块和存储的媒体元数据。直接通过网关查找`message_id`，因此该消息不需要出现在最近历史记录窗口中。持久化条目使用 `{ "type": "openclaw_media", "media": { ... } }`，其中 `media` 可以包括 `url`、`contentType`、`kind`、`fileName`、维度、持续时间或大小。这是一个元数据视图，而不是独立的持久附件 Blob 存储。
  </Accordion>
  <Accordion title="events_poll">
    读取自数字游标以来排队的实时事件。 `limit` 最大 200。如果请求的游标早于保留的队列历史记录，则结果还包括 `gap.requested_after_cursor` 和 `gap.oldest_available_cursor`。
  </Accordion>
  <Accordion title="events_wait">
    长轮询，直到下一个匹配的排队事件到达或超时到期（默认 30 秒，最长 300 秒）。

    当通用 MCP 客户端需要近实时传送而无需 Claude- 特定推送协议时，请使用此选项。即使当前没有保留匹配事件，已知的游标间隙也会立即返回，并带有相同的附加 `gap` 元数据。

  </Accordion>
  <Accordion title="messages_send">
    通过已记录在该对话上的相同路由发送文本回复。

    当前行为：

    - 需要存在一个已有的对话路由
    - 使用会话的 channel、recipient、account id 和 thread id
    - 仅发送文本

  </Accordion>
  <Accordion title="permissions_list_open">
    列出自连接到 Gateway 以来由 bridge 观察到的待处理 exec/plugin 审批请求。
  </Accordion>
  <Accordion title="permissions_respond">
    使用以下之一来处理一个待处理的 exec/plugin 审批请求：

    - `allow-once`
    - `allow-always`
    - `deny`

  </Accordion>
</AccordionGroup>

### <a id="event-model"></a> 事件模型

桥在连接期间维护一个内存中的事件队列。

当前事件类型：

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

<Warning>
- 该队列仅在运行时存在；它在 MCP 桥启动时开始
- `events_poll` 和 `events_wait` 本身不会重放更早的 Gateway 历史记录
- 队列是有界的；当 `gap` 存在时，使用 `messages_read` 读取持久历史记录，然后将 `after_cursor` 设置为比 `gap.oldest_available_cursor` 少 1 来恢复
- 持久化的历史积压应通过 `messages_read` 读取

</Warning>

### <a id="claude-channel-notifications"></a> Claude 通道通知

该桥还可以公开 Claude- 特定通道通知。这是 OpenClaw 相当于 Claude Code 通道适配器：标准 MCP 工具仍然可用，但实时入站消息也可以作为 Claude- 特定的 MCP 通知到达。

<Tabs>
  <Tab id="off" title="关闭">
    `--claude-channel-mode off`：仅提供标准 MCP 工具。
  </Tab>
  <Tab title="on">
    `--claude-channel-mode on`：启用 Claude 通道通知。
  </Tab>
  <Tab id="auto-default" title="自动（默认）">
    `--claude-channel-mode auto`：当前默认值；行为与 `on` 相同。
  </Tab>
</Tabs>

启用 Claude 通道模式后，服务器会声明 Claude 实验性能力，并且可以发出：

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

当前桥接行为：

- 传入的 `user` 转录消息会作为 `notifications/claude/channel` 转发
- 通过 MCP 收到的 Claude 权限请求在内存中进行跟踪
- 如果链接会话中的命令所有者稍后发送 `yes <id>` 或 `no <id>`（`<id>` 是 5 个字母的请求 ID，不包括 `l`），桥会将其转换为 `notifications/claude/channel/permission`
- 这些通知仅限于当前在线会话；如果 MCP 客户端断开连接，就没有推送目标

这是有意为之的客户端特定行为。通用 MCP 客户端应依赖标准的轮询工具。

### <a id="mcp-client-config"></a> MCP 客户端配置

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

对于大多数通用 MCP 客户端，从标准工具表面开始并忽略 Claude 模式。仅对真正了解 Claude- 特定通知方法的客户端打开 Claude 模式。

### <a id="options"></a> 选项

`openclaw mcp serve` 支持：

<ParamField path="--url" type="string">
  网关 WebSocket URL。配置时默认使用 `gateway.remote.url`。
</ParamField>
<ParamField path="--token" type="string">
  网关令牌。
</ParamField>
<ParamField path="--token-file" type="string">
  从文件中读取令牌。
</ParamField>
<ParamField path="--password" type="string">
  网关密码。
</ParamField>
<ParamField path="--password-file" type="string">
  从文件中读取密码。
</ParamField>
<ParamField path="--claude-channel-mode" type='"auto" | "on" | "off"'>
  Claude 通知模式。默认 `auto`。
</ParamField>
<ParamField path="-v, --verbose" type="boolean">
  将详细日志输出到 stderr。
</ParamField>

<Tip>
在可能的情况下，优先使用 `--token-file` 或 `--password-file`，而不是直接内联密钥。
</Tip>

### <a id="security-and-trust-boundary"></a> 安全与信任边界

桥接器不会凭空创建路由。它只会暴露 Gateway 已经知道如何路由的对话。

这意味着：

- 发送方允许列表、配对以及通道级信任仍然属于底层的 OpenClaw 通道配置
- `messages_send` 只能通过已有的已存储路由进行回复
- 批准状态仅针对当前桥接会话为 live/in-memory
- 桥接器认证应与其他远程 Gateway 客户端一样使用相同的 Gateway token 或密码控制

如果 `conversations_list` 中缺少某个对话，通常原因不是 MCP 配置损坏，而是底层 Gateway 会话中的路由元数据缺失或不完整。

### <a id="testing"></a> 测试

OpenClaw 为这座桥提供了可重复的 Docker 烟雾检查：

```bash
pnpm test:docker:mcp-channels
```

该烟雾运行单个容器：它播种对话状态，启动网关，然后生成 `openclaw mcp serve` 作为 stdio 子进程，并将其作为 MCP 客户端驱动。它通过真实的 stdio MCP 桥验证对话发现、转录读取、附件元数据读取、实时事件队列行为以及 Claude-style 通道和权限通知。出站发送路由（`messages_send` 重用存储的对话路由）由 `src/mcp/channel-server.test.ts` 中的单元测试单独覆盖。

这是在不将真实的 Telegram、Discord 或 iMessage 账号接入测试运行的情况下，证明桥接可正常工作的最快方式。

有关更广泛的测试上下文，请参阅 [测试](/help/testing)。

### <a id="troubleshooting"></a> 故障排除

<AccordionGroup>
  <Accordion id="no-conversations-returned" title="没有返回任何对话">
    这通常意味着 Gateway 会话尚未可路由。请确认底层会话已存储 channel/provider、recipient，以及可选的 account/thread 路由元数据。
  </Accordion>
  <Accordion id="events-poll-or-events-wait-misses-older-messages" title="events_poll 或 events_wait 错过较旧的消息">
    实时队列在网桥连接时启动并保留有界窗口。如果结果包含 `gap`，请使用 `messages_read` 读取持久转录本历史记录，然后将 `after_cursor` 设置为比 `gap.oldest_available_cursor` 少 1 来恢复。
  </Accordion>
  <Accordion id="claude-notifications-do-not-show-up" title="Claude 通知不显示">
    请检查以下所有项：

    - 客户端保持了 stdio MCP 会话处于打开状态
    - `--claude-channel-mode` 为 `on` 或 `auto`
    - 客户端实际了解了Claude-具体通知方法
    - 传入消息发生在桥接器连接之后

  </Accordion>
  <Accordion id="approvals-are-missing" title="缺少批准">
    `permissions_list_open` 只显示在桥接器连接期间观察到的审批请求。它不是一个持久化的审批历史 API。
  </Accordion>
</AccordionGroup>

## <a id="current-limits"></a> 当前限制

该桥有以下限制：

- 会话发现依赖于现有的 Gateway 会话路由元数据
- 没有超出 Claude- 特定适配器的通用推送协议
- 没有消息编辑或反应工具
- HTTP/SSE/streamable-http 传输连接到单个远程服务器；上游未复用
- `permissions_list_open` 只包含桥接连接期间观察到的审批。
