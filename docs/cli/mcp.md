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
- 使用 `list`、`show`、`status`、`doctor`、`probe`、`add`、`set`、`configure`、`tools`、`login`、`logout`、`reload` 和 `unset` 管理 OpenClaw 托管的出站 MCP 服务器定义

`serve` 是 OpenClaw 作为 MCP 服务器运行。其他子命令则是 OpenClaw 作为 MCP 客户端侧的服务器注册表，供其自身运行时稍后使用。

<Note>
  `list`、`show`、`set` 和 `unset` 只会读取和写入 OpenClaw 配置中的 OpenClaw 托管 `mcp.servers` 条目。它们不包含来自 `config/mcporter.json` 的 mcporter 服务器；请使用 `mcporter list` 查看该注册表。
</Note>

当 OpenClaw 应该自行托管编码 harness 会话，并将该运行时通过 ACP 路由时，请使用 [`openclaw acp`](/cli/acp)。

## 选择合适的 MCP 路径

| 目标                                                                | 使用                                                                  | 原因                                                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 让外部 MCP 客户端读取/发送 OpenClaw 通道对话 | `openclaw mcp serve`                                                 | OpenClaw 是 MCP 服务器，并通过 stdio 暴露由 Gateway 支持的对话。                                 |
| 为 OpenClaw 管理的代理运行保存第三方 MCP 服务器        | `openclaw mcp add`, `set`, `configure`, `tools`, `login`             | OpenClaw 是 MCP 客户端侧注册表，之后会将这些服务器投影到符合条件的运行时中。               |
| 在不运行代理回合的情况下检查已保存的服务器                  | `openclaw mcp status`, `doctor`, `probe`                             | `status` 和 `doctor` 用于检查配置；`probe` 会打开实时 MCP 连接并列出能力。               |
| 从浏览器编辑 MCP 配置                                      | Control UI `/settings/mcp`（`/mcp` 别名）                            | 该页面显示清单、启用状态、OAuth/过滤摘要、命令提示，以及一个作用域受限的 `mcp` 编辑器。         |
| 为 Codex app-server 提供一个作用域受限的原生 MCP 服务器                    | `mcp.servers.<name>.codex`                                           | `codex` 块仅影响 Codex app-server 线程投影，并会在传给原生配置前被剥离。 |
| 运行 ACP 托管的 harness 会话                                     | [`openclaw acp`](/cli/acp) 和 [ACP Agents](/tools/acp-agents-setup) | ACP bridge 模式不接受按会话注入 MCP 服务器；请改为配置 gateway/plugin bridges。     |

<Tip>
如果你不确定需要哪条路径，可以先运行 `openclaw mcp status --verbose`。它会显示 OpenClaw 已保存的内容，而不会启动任何 MCP 服务器。
</Tip>

## 作为 MCP 服务器的 OpenClaw

这是 `openclaw mcp serve` 路径。

### 何时使用 serve

在以下情况下使用 `openclaw mcp serve`：

- Codex、Claude Code 或其他 MCP 客户端应直接与由 OpenClaw 支持的通道通信
- 你已经有一个带有已路由对话的本地或远程 OpenClaw Gateway
- 你希望有一个可跨 OpenClaw 通道后端工作的 MCP 服务器，而不是为每个通道运行一个桥接器

当 OpenClaw 应该自行托管编码运行时并将代理会话保留在 OpenClaw 内部时，请改用 [`openclaw acp`](/cli/acp)。

### 工作原理

`openclaw mcp serve` 启动一个 stdio MCP 服务器。MCP 客户端拥有该进程。在客户端保持 stdio 会话打开期间，桥接器会通过 WebSocket 连接到本地或远程的 OpenClaw Gateway，并通过 MCP 暴露已路由的通道会话。

<Steps>
  <Step title="客户端启动桥接器">
    MCP 客户端启动 `openclaw mcp serve`。
  </Step>
  <Step title="桥接器连接到 Gateway">
    桥接器通过 WebSocket 连接到 OpenClaw Gateway。
  </Step>
  <Step title="会话成为 MCP 对话">
    已路由的会话会成为 MCP 对话以及转录/历史工具。
  </Step>
  <Step title="实时事件队列">
    在桥接器连接期间，实时事件会在内存中排队。
  </Step>
  <Step title="可选的 Claude 推送">
    如果启用了 Claude 通道模式，同一会话还可以接收 Claude 特定的推送通知。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="重要行为">
    - 实时队列状态在桥接器连接时开始
    - 更早的转录历史通过 `messages_read` 读取
    - Claude 推送通知仅在 MCP 会话存活期间存在
    - 当客户端断开连接时，桥接器退出，实时队列消失
    - 一次性 agent 入口点（例如 `openclaw agent` 和 `openclaw infer model run`）会在回复完成时退出它们打开的任何打包 MCP 运行时，因此重复运行脚本不会累积 stdio MCP 子进程
    - OpenClaw 启动的 stdio MCP 服务器，无论是打包的还是用户配置的，都会在关闭时作为进程树被拆除，因此由服务器启动的子进程不会比父 stdio 客户端存活更久
    - 删除或重置会话会通过共享运行时清理路径释放该会话的 MCP 客户端，因此不会有任何 stdio 连接仍然附着在已移除的会话上

  </Accordion>
</AccordionGroup>

### 选择客户端模式

<Tabs>
  <Tab title="Generic MCP client">
    仅使用标准 MCP 工具。使用 `conversations_list`、`messages_read`、`events_poll`、`events_wait`、`messages_send` 以及审批工具。
  </Tab>
  <Tab title="Claude Code">
    标准 MCP 工具加上 Claude 专用通道适配器。启用 `--claude-channel-mode on`，或者保留默认的 `auto`。
  </Tab>
</Tabs>

<Note>
目前，`auto` 的行为与 `on` 相同。尚未实现客户端能力检测。
</Note>

### serve 暴露的内容

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

### 用法

<Tabs>
  <Tab title="本地网关">
    ```bash
    openclaw mcp serve
    ```
  </Tab>
  <Tab title="远程网关（token）">
    ```bash
    openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
    ```
  </Tab>
  <Tab title="远程网关（密码）">
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
    从转写消息中提取非文本消息内容块。这是对转写内容的元数据视图，而不是一个单独持久化的附件 blob 存储。
  </Accordion>
  <Accordion title="events_poll">
    读取自数值游标以来排队的实时事件。`limit` 最大 200。
  </Accordion>
  <Accordion title="events_wait">
    长轮询，直到下一个匹配的排队事件到达或超时结束（默认 30 秒，最大 300 秒）。

    当通用 MCP 客户端需要近实时交付、且不使用 Claude 特定的推送协议时，请使用此功能。

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

### 事件模型

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
- 持久化的历史积压应通过 `messages_read` 读取

</Warning>

### Claude 通道通知

该桥接器还可以暴露 Claude 特定的通道通知。这是 OpenClaw 对 Claude Code 通道适配器的对应实现：标准 MCP 工具仍然可用，但实时传入消息也可以作为 Claude 特定的 MCP 通知到达。

<Tabs>
  <Tab title="关闭">
    `--claude-channel-mode off`：仅提供标准 MCP 工具。
  </Tab>
  <Tab title="开启">
    `--claude-channel-mode on`：启用 Claude 通道通知。
  </Tab>
  <Tab title="auto（默认）">
    `--claude-channel-mode auto`：当前默认值；行为与 `on` 相同。
  </Tab>
</Tabs>

启用 Claude 通道模式后，服务器会声明 Claude 实验性能力，并且可以发出：

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

当前桥接行为：

- 传入的 `user` 转录消息会作为 `notifications/claude/channel` 转发
- 通过 MCP 接收到的 Claude 权限请求会在内存中跟踪
- 如果关联对话中的命令所有者随后发送 `yes <id>` 或 `no <id>`（`<id>` 是 5 位请求 ID，不包含 `l`），桥接器会将其转换为 `notifications/claude/channel/permission`
- 这些通知仅限于当前在线会话；如果 MCP 客户端断开连接，就没有推送目标

这是有意为之的客户端特定行为。通用 MCP 客户端应依赖标准的轮询工具。

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

对于大多数通用 MCP 客户端，请从标准工具接口开始，并忽略 Claude 模式。只有当客户端确实理解 Claude 特定的通知方法时，才启用 Claude 模式。

### 选项

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

### 安全与信任边界

Bridge 不会凭空创建路由。它只会暴露 Gateway 已经知道如何路由的对话。

这意味着：

- 发送方允许列表、配对以及通道级信任仍然属于底层的 OpenClaw 通道配置
- `messages_send` 只能通过已有的已存储路由进行回复
- 允许状态仅在当前 bridge 会话期间处于实时内存中
- Bridge 认证应与其他远程 Gateway 客户端一样使用相同的 Gateway token 或密码控制

如果 `conversations_list` 中缺少某个对话，通常原因不是 MCP 配置损坏，而是底层 Gateway 会话中的路由元数据缺失或不完整。

### 测试

OpenClaw 为此桥接提供了一个确定性的 Docker 烟雾测试：

```bash
pnpm test:docker:mcp-channels
```

该烟雾测试运行一个单独的容器：它会初始化会话状态，启动 Gateway，然后以 stdio 子进程的形式启动 `openclaw mcp serve`，并将其作为 MCP 客户端进行驱动。它会验证会话发现、转录读取、附件元数据读取、实时事件队列行为，以及通过真实的 stdio MCP 桥接进行的 Claude 风格频道和权限通知。出站发送路由（`messages_send` 复用已存储的会话路由）则由 `src/mcp/channel-server.test.ts` 中的单元测试单独覆盖。

这是在不将真实的 Telegram、Discord 或 iMessage 账号接入测试运行的情况下，证明桥接可正常工作的最快方式。

有关更广泛的测试上下文，请参阅 [测试](/help/testing)。

### 故障排查

<AccordionGroup>
  <Accordion title="没有返回任何对话">
    这通常意味着 Gateway 会话尚未可路由。请确认底层会话已存储 channel/provider、recipient，以及可选的 account/thread 路由元数据。
  </Accordion>
  <Accordion title="events_poll 或 events_wait 漏掉了更早的消息">
    这是预期行为。实时队列会在 bridge 连接时开始。请使用 `messages_read` 获取更早的转录历史。
  </Accordion>
  <Accordion title="Claude 通知没有出现">
    请检查以下所有项：

    - 客户端保持了 stdio MCP 会话处于打开状态
    - `--claude-channel-mode` 为 `on` 或 `auto`
    - 客户端实际上理解 Claude 特定的通知方法
    - 传入消息发生在 bridge 连接之后

  </Accordion>
  <Accordion title="审批缺失">
    `permissions_list_open` 只显示在 bridge 连接期间观察到的审批请求。它不是一个持久化的审批历史 API。
  </Accordion>
</AccordionGroup>

## 作为 MCP 客户端注册表的 OpenClaw

这是 `openclaw mcp list`、`show`、`status`、`doctor`、`probe`、`add`、`set`、`configure`、`tools`、`login`、`logout`、`reload` 和 `unset` 路径。

这些命令不会通过 MCP 暴露 OpenClaw。它们管理 OpenClaw 配置中 `mcp.servers` 下由 OpenClaw 托管的 MCP 服务器定义。它们不会从 `config/mcporter.json` 读取 mcporter 服务器。

这些已保存的定义适用于 OpenClaw 之后会启动或配置的运行时，例如嵌入式 OpenClaw 和其他运行时适配器。OpenClaw 将这些定义集中存储，因此这些运行时无需维护各自重复的 MCP 服务器列表。

<AccordionGroup>
  <Accordion title="重要行为">
    - 这些命令只会读取或写入 OpenClaw 配置
    - `status`、`list`、`show`、`doctor`（不带 `--probe`）、`set`、`configure`、`tools`、`logout`、`reload` 和 `unset` 不会连接到目标 MCP 服务器
    - `login` 会为已配置的 HTTP 服务器执行 MCP OAuth 网络流程，并保存生成的本地凭据
    - `status --verbose` 会在不连接的情况下打印已解析的传输、认证、超时、过滤器和并行工具调用提示
    - `doctor` 会检查已保存定义中的本地设置问题，例如缺失的 stdio 命令、无效的工作目录、缺失的 TLS 文件、已禁用的服务器、字面量敏感标头/env 值，以及不完整的 OAuth 授权
    - `doctor --probe` 在静态检查通过后会加入与 `probe` 相同的在线连接验证
    - `probe` 会连接到所选服务器或所有已配置服务器，列出工具，并报告能力/诊断信息
    - `add` 会根据标志构建定义，并在保存前进行探测，除非设置了 `--no-probe` 或者需要先完成 OAuth 授权
    - 运行时适配器会在执行时决定它们实际支持的传输形态
    - `enabled: false` 会保留服务器定义，但会将其排除在嵌入式运行时发现之外
    - `requestTimeoutMs` 和 `connectionTimeoutMs` 以毫秒为单位分别为每个服务器设置请求和连接超时
    - `supportsParallelToolCalls: true` 表示适配器可以并发调用这些服务器
    - HTTP 服务器可以使用静态标头、OAuth 登录、TLS 验证控制以及 mTLS 证书/密钥路径
    - 嵌入式 OpenClaw 会在常规 `coding` 和 `messaging` 工具配置文件中暴露已配置的 MCP 工具；`minimal` 仍然会隐藏它们，而 `tools.deny: ["bundle-mcp"]` 会显式禁用它们
    - 每个服务器的 `toolFilter.include` 和 `toolFilter.exclude` 会在发现 MCP 工具后、成为 OpenClaw 工具之前对其进行过滤
    - 声明资源或提示词的服务器也会暴露用于列出/读取资源以及列出/获取提示词的实用工具；这些生成的实用工具名称（`resources_list`、`resources_read`、`prompts_list`、`prompts_get`）使用相同的 include/exclude 过滤器
    - 动态的 MCP 工具列表变更会使该会话的缓存目录失效；下一次发现/使用时会从服务器刷新
    - 重复的 MCP 工具请求/协议失败会暂时暂停该服务器，这样一个损坏的服务器就不会占用整个轮次
    - 会话范围内捆绑的 MCP 运行时会在空闲 10 分钟后被清理，而一次性嵌入式运行会在运行结束时清理它们

  </Accordion>
</AccordionGroup>

运行时适配器可能会将这个共享注册表规范化为其下游客户端所期望的形状。例如，嵌入式 OpenClaw 会直接消费 OpenClaw 的 `transport` 值，而 Claude Code 和 Gemini 则接收 CLI 原生的 `type` 值，例如 `http`、`sse` 或 `stdio`。

Codex app-server 也支持每个服务器上的可选 `codex` 块。这是仅针对 Codex app-server 线程的 OpenClaw 投影元数据；它不会更改 ACP 会话、通用 Codex harness 配置或其他运行时适配器。使用非空的 `codex.agents` 可以将服务器仅投影到特定的 OpenClaw agent id。空的、空白的或无效的 agent 列表会被配置验证拒绝，并且会在运行时投影路径中被省略，而不是变成全局配置。使用 `codex.defaultToolsApprovalMode`（`auto`、`prompt` 或 `approve`）为受信任的服务器发出 Codex 原生的 `default_tools_approval_mode`。在将原生 `mcp_servers` 配置交给 Codex 之前，OpenClaw 会剥离 `codex` 元数据。

### 已保存的 MCP 服务器定义

命令：

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp status [--verbose]`
- `openclaw mcp doctor [name] [--probe]`
- `openclaw mcp probe [name]`
- `openclaw mcp add <name> [flags]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp configure <name> [flags]`
- `openclaw mcp tools <name> [--include csv] [--exclude csv] [--clear]`
- `openclaw mcp login <name> [--code code]`
- `openclaw mcp logout <name>`
- `openclaw mcp reload`
- `openclaw mcp unset <name>`

说明：

- `list` 会对服务器名称进行排序。
- 不带名称的 `show` 会打印完整的已配置 MCP 服务器对象。
- `status` 在不连接的情况下对已配置的传输进行分类。`--verbose` 会包含解析后的启动、超时、OAuth、过滤和并行调用详细信息，包括存储的 OAuth 令牌需要额外授权的情况。带凭据的 stdio 参数会在文本和 JSON 输出中被隐藏。
- `doctor` 在不连接的情况下执行静态检查。若命令还应验证已启用服务器是否可连接，请添加 `--probe`。
- `probe` 会连接并报告工具数量、resources/prompts 支持、列表变更支持以及诊断信息。
- `add` 接受 stdio 标志，例如 `--command`、`--arg`、`--env` 和 `--cwd`，或 HTTP 标志，例如 `--url`、`--transport`、`--header`、`--auth oauth`、TLS、超时和工具选择标志。
- `set` 期望在命令行中提供一个 JSON 对象值。
- `configure` 会更新启用状态、工具过滤器、超时、OAuth、TLS 和并行工具调用提示，而不会替换整个服务器定义。添加 `--probe` 可在保存前验证更新后的服务器。
- `tools` 会更新每个服务器的工具过滤器。include/exclude 条目是 MCP 工具名称和简单的 `*` 通配符。
- `login` 会为配置了 `auth: "oauth"` 的 HTTP 服务器运行 OAuth 流程。首次运行会打印授权 URL；批准后使用 `--code` 重新运行。
- `logout` 会清除指定服务器已存储的 OAuth 凭据，而不会移除已保存的服务器定义。
- `reload` 仅会释放当前 CLI 进程中缓存的进程内 MCP 运行时。其他进程中的网关或代理进程仍然需要各自的 reload 或重启路径。
- 对于可流式 HTTP MCP 服务器，请使用 `transport: "streamable-http"`。为了兼容，`openclaw mcp set` 也会将 CLI 原生的 `type: "http"` 规范化为相同的标准配置形状。
- 如果指定名称的服务器不存在，`unset` 会失败。

示例：

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp status --verbose
openclaw mcp doctor --probe
openclaw mcp probe context7 --json
openclaw mcp add memory --command npx --arg -y --arg @modelcontextprotocol/server-memory
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp tools context7 --include 'resolve-library-id,get-library-docs'
openclaw mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
openclaw mcp configure docs --timeout 20 --connect-timeout 5 --include 'search,read_*'
openclaw mcp configure docs --auth oauth --oauth-scope 'docs.read'
openclaw mcp login docs
openclaw mcp logout docs
openclaw mcp unset context7
```

### 常见服务器配方

这些示例只会保存服务器定义。之后，运行 `openclaw mcp doctor --probe` 来证明服务器已启动并暴露了工具。

<Tabs>
  <Tab title="文件系统">
    ```bash
    openclaw mcp add files \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-filesystem \
      --arg "$HOME/Documents" \
      --include 'read_file,list_directory,search_files'
    openclaw mcp doctor files --probe
    ```

    将文件系统服务器的作用范围限制在代理应读取或编辑的最小目录树内。

  </Tab>
  <Tab title="内存">
    ```bash
    openclaw mcp add memory \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-memory
    openclaw mcp probe memory --json
    ```

    如果服务器暴露了不应提供给普通代理的写入工具，请使用工具过滤。

  </Tab>
  <Tab title="本地脚本">
    ```bash
    openclaw mcp add local-tools \
      --command node \
      --arg ./dist/mcp-server.js \
      --cwd /srv/openclaw-tools \
      --env API_BASE=https://internal.example
    openclaw mcp status --verbose
    ```

    `doctor` 会检查 `cwd` 是否存在，以及是否可以从已配置的环境中解析该命令。

  </Tab>
  <Tab title="远程 HTTP">
    ```bash
    openclaw mcp add docs \
      --url https://mcp.example.com/mcp \
      --transport streamable-http \
      --auth oauth \
      --oauth-scope docs.read \
      --timeout 20 \
      --connect-timeout 5 \
      --include 'search,read_*'
    openclaw mcp doctor docs --probe
    ```

    当远程服务器支持 OAuth 时请使用它。如果服务器需要静态请求头，请避免提交字面量 bearer token。

  </Tab>
  <Tab title="桌面/CUA">
    ```bash
    openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
    openclaw mcp tools cua-driver --include 'list_apps,get_window_state,click,type_text'
    openclaw mcp doctor cua-driver --probe
    ```

    直接的桌面控制服务器会继承启动它的进程权限。请使用更窄的工具过滤和操作系统级权限提示。

  </Tab>
</Tabs>

### JSON 输出形状

脚本和仪表盘请使用 `--json`。字段集可能会随着时间增长，因此消费者应忽略未知键。

<AccordionGroup>
  <Accordion title="status --json">
    ```json
    {
      "path": "/home/user/.openclaw/openclaw.json",
      "servers": [
        {
          "name": "docs",
          "configured": true,
          "enabled": true,
          "ok": true,
          "transport": "streamable-http",
          "launch": "streamable-http https://mcp.example.com/mcp",
          "auth": "oauth",
          "authStatus": {
            "hasTokens": true,
            "requiresAuthorization": false,
            "hasClientInformation": true,
            "hasCodeVerifier": false,
            "hasDiscoveryState": true,
            "hasLastAuthorizationUrl": false
          },
          "requestTimeoutMs": 20000,
          "connectionTimeoutMs": 5000,
          "toolFilter": {
            "include": ["search", "read_*"],
            "exclude": []
          },
          "supportsParallelToolCalls": true
        }
      ]
    }
    ```
  </Accordion>
  <Accordion title="doctor --json">
    ```json
    {
      "ok": true,
      "path": "/home/user/.openclaw/openclaw.json",
      "servers": [
        {
          "name": "docs",
          "ok": true,
          "issues": [
            {
              "level": "warning",
              "message": "OAuth 凭据尚未授权；请运行 openclaw mcp login docs"
            }
          ]
        }
      ]
    }
    ```

    当任何已启用且已检查的服务器存在 `error` 级别问题时，`doctor --json` 会以非零状态码退出。`warning` 和 `info` 问题会被报告，但不会单独导致命令失败。

  </Accordion>
  <Accordion title="probe --json">
    ```json
    {
      "generatedAt": "2026-05-31T09:00:00.000Z",
      "servers": {
        "docs": {
          "launch": "streamable-http https://mcp.example.com/mcp",
          "tools": 2,
          "resources": true,
          "listChanged": {
            "tools": true,
            "resources": false,
            "prompts": false
          }
        }
      },
      "tools": ["docs__read_page", "docs__search"],
      "diagnostics": []
    }
    ```

    `probe --json` 会打开一个实时 MCP 客户端会话，并直接打印其结果；与 `status`/`doctor` 不同，输出没有顶层的 `path` 字段。只有当服务器实际声明了该能力时，才会包含 `resources` 和 `prompts` 键（不支持 prompts 的服务器会省略 `prompts` 键，而不是报告为 `false`）。`probe` 适用于连通性和能力验证，不适用于静态配置审计。

  </Accordion>
</AccordionGroup>

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
        "transport": "streamable-http",
        "requestTimeoutMs": 20000,
        "connectionTimeoutMs": 5000,
        "supportsParallelToolCalls": true,
        "auth": "oauth",
        "oauth": {
          "scope": "docs.read"
        },
        "sslVerify": true,
        "clientCert": "/path/to/client.crt",
        "clientKey": "/path/to/client.key",
        "toolFilter": {
          "include": ["search_*"],
          "exclude": ["admin_*"]
        }
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

OpenClaw 在启动 stdio MCP 服务器之前，会拒绝解释器启动、加载器劫持和 shell 初始化相关的环境变量键，即使它们出现在服务器的 `env` 块中也一样。其使用与其他由 OpenClaw 启动的进程相同的主机环境安全策略：会阻止已知的解释器启动钩子（例如 `NODE_OPTIONS`、`PYTHONSTARTUP`、`PERL5OPT`、`RUBYOPT`、`BASHOPTS`、`KSH_ENV`）、共享库和函数注入前缀（`DYLD_*`、`LD_*`、`BASH_FUNC_*`），以及类似的运行时控制变量。启动时会静默丢弃这些变量并记录警告，因此它们无法注入隐式前置内容、替换解释器、启用调试器，或针对 stdio 进程劫持动态链接器。显式允许列表保留了普通 MCP 凭据环境变量的可用性（`GITHUB_TOKEN`、`GH_TOKEN`、`GITLAB_TOKEN`、`NPM_TOKEN`、`NODE_AUTH_TOKEN`、`DATABASE_URL`、`MONGODB_URI`、`REDIS_URL`、`AMQP_URL`、`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`、`AWS_SESSION_TOKEN`、`AZURE_CLIENT_ID`、`AZURE_CLIENT_SECRET`），以及普通代理和特定服务器的环境变量（`HTTP_PROXY`、自定义 `*_API_KEY` 等）。其他 `AWS_*` 键，例如 `AWS_CONFIG_FILE` 和 `AWS_SHARED_CREDENTIALS_FILE`，仍然会被阻止，因为它们指向的是凭据文件，而不是直接携带凭据值。

如果你的 MCP 服务器确实需要其中某个被阻止的变量，请将其设置在网关主机进程上，而不是放在 stdio 服务器的 `env` 下。
</Warning>

### SSE / HTTP 传输

通过 HTTP Server-Sent Events 连接到远程 MCP 服务器。

| 字段                       | 描述                                                      |
| -------------------------- | --------------------------------------------------------- |
| `url`                       | 远程服务器的 HTTP 或 HTTPS URL（必填）                    |
| `headers`                   | 可选的 HTTP 头键值映射（例如认证令牌）                   |
| `connectionTimeoutMs`       | 每个服务器的连接超时时间，单位为毫秒（可选）             |
| `requestTimeoutMs`          | 每个服务器的 MCP 请求超时时间，单位为毫秒                |
| `auth: "oauth"`             | 使用 `openclaw mcp login` 保存的 MCP OAuth 凭据         |
| `sslVerify`                 | 仅在明确受信任的私有 HTTPS 端点上设置为 false            |
| `clientCert` / `clientKey`  | mTLS 客户端证书和密钥路径                                 |
| `supportsParallelToolCalls` | 提示此服务器可安全地进行并发调用                         |

示例：

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "auth": "oauth",
        "requestTimeoutMs": 20000,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

`url` 中的敏感值（userinfo）和 `headers` 会在日志和状态输出中被脱敏。`openclaw mcp doctor` 会在 `headers` 或 `env` 条目包含字面量值时发出警告，以便操作员将这些值移出已提交的配置。

### OAuth 工作流

OAuth 适用于声明了 MCP OAuth 流程的 HTTP MCP 服务器。当启用 `auth: "oauth"` 时，静态 `Authorization` 标头会被该服务器忽略。由 `openclaw mcp login` 保存的凭据可用于嵌入式 MCP、CLI 运行器以及本地 Codex 应用服务器。

Native MCP OAuth sessions live in the owner-only shared SQLite database at `<state-dir>/state/openclaw.sqlite` (`mcp_oauth_stores`). The row can contain access and refresh tokens, dynamic client registration secrets, discovery metadata, and the temporary PKCE verifier. Refresh, login, and logout use the same SQLite lease, so parallel OpenClaw processes cannot consume one refresh token or resurrect a logged-out session.

Upgrades from the retired `<state-dir>/mcp-oauth/*.json` store are handled only by `openclaw doctor --fix`. Runtime code never reads, writes, or falls back to those files.

Until credentials are available, OpenClaw omits only that MCP server from the agent runtime instead of failing the agent turn. The operator, or an agent with shell access, can then run `openclaw mcp login <name>` and use the server on a later turn.

If a server rejects a token with `insufficient_scope`, OpenClaw preserves the requested scope and asks for `openclaw mcp login <name>` instead of repeating a refresh that cannot grant new scope. That login starts a new authorization request while keeping the previous token until replacement credentials are saved.

When a remote MCP service is already backed by a separate OpenClaw refresh-capable auth profile, you can optionally set `oauth.authProfileId`. OpenClaw refreshes either credential source before runtime projection and passes only the current access token to the downstream MCP client.

<Steps>
  <Step title="保存服务器">
    使用 `auth: "oauth"` 和任何可选的 OAuth 元数据添加或更新服务器。

    ```bash
    openclaw mcp set docs '{"url":"https://mcp.example.com/mcp","transport":"streamable-http","auth":"oauth","oauth":{"scope":"docs.read"}}'
    ```

    对于由 auth-profile 支持的 bearer，保存配置文件绑定：

    ```bash
    openclaw mcp set docs '{"url":"https://mcp.example.com/mcp","transport":"streamable-http","auth":"oauth","oauth":{"authProfileId":"docs:mcp"}}'
    ```

  </Step>
  <Step title="开始登录">
    运行登录以创建授权请求。

    ```bash
    openclaw mcp login docs
    ```

    OpenClaw 会打印授权 URL，并将临时 OAuth verifier 状态存储在共享 SQLite 中。

  </Step>
  <Step title="使用 code 完成">
    在浏览器中批准后，将返回的 code 传回给 OpenClaw。

    ```bash
    openclaw mcp login docs --code abc123
    ```

  </Step>
  <Step title="检查授权">
    使用 status 或 doctor 确认令牌已存在且不需要额外授权。如果 status 报告 `authorization-required`，或者 doctor 提示需要额外授权，请再次运行 `openclaw mcp login <name>`。

    ```bash
    openclaw mcp status --verbose
    openclaw mcp doctor docs --probe
    ```

  </Step>
  <Step title="清除凭据">
    Logout 会移除已存储的 OAuth 凭据，但会保留已保存的服务器定义。

    ```bash
    openclaw mcp logout docs
    ```

  </Step>
</Steps>

如果提供方轮换了令牌，或者授权状态卡住了，请运行 `openclaw mcp logout <name>`，然后重复 `login`。即使 `auth: "oauth"` 已从配置中移除，只要服务器名称和 URL 仍然能标识该凭据存储条目，`logout` 也可以清除已保存 HTTP 服务器的凭据。

### Streamable HTTP 传输

`streamable-http` 是与 `sse` 和 `stdio` 并列的另一种传输选项。它使用 HTTP 流式传输与远程 MCP 服务器进行双向通信。

| 字段                        | 描述                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `url`                       | 远程服务器的 HTTP 或 HTTPS URL（必填）                                                |
| `transport`                 | 设置为 `"streamable-http"` 以选择此传输；如果省略，OpenClaw 将使用 `sse`            |
| `headers`                   | 可选的 HTTP 头键值映射（例如认证令牌）                                                 |
| `connectionTimeoutMs`       | 每个服务器的连接超时时间（毫秒，可选）                                                 |
| `requestTimeoutMs`          | 每个服务器的 MCP 请求超时时间（毫秒）                                                  |
| `auth: "oauth"`             | 使用由 `openclaw mcp login` 保存的 MCP OAuth 凭据                                      |
| `sslVerify`                 | 仅在明确可信的私有 HTTPS 端点上设置为 false                                            |
| `clientCert` / `clientKey`  | mTLS 客户端证书和密钥路径                                                              |
| `supportsParallelToolCalls` | 提示此服务器可安全并发调用                                                             |

OpenClaw 配置使用 `transport: "streamable-http"` 作为规范写法。通过 `openclaw mcp set` 保存时会接受 CLI 原生的 `type: "http"` 值，并由 `openclaw doctor --fix` 在现有配置中修复，但 `transport` 才是嵌入式 OpenClaw 直接消费的内容。

示例：

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectionTimeoutMs": 10000,
        "requestTimeoutMs": 30000,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

<Note>
注册表命令不会启动通道桥接。只有 `probe` 和 `doctor --probe` 会打开实时 MCP 客户端会话，以证明目标服务器可达。
</Note>

## Control UI

浏览器 Control UI 包含一个专用的 MCP 设置页面，位于 `/settings/mcp`；之前的 `/mcp` 路径仍然是一个别名。该页面显示已配置的服务器数量、已启用/OAuth/过滤器摘要、每个服务器的传输行、启用/禁用控制、常用 CLI 命令，以及 `mcp` 配置部分的作用域编辑器。

将此页面用于运维修改和快速盘点。需要实时服务器证明时，请使用 `openclaw mcp doctor --probe` 或 `openclaw mcp probe`。

运维工作流：

1. 打开 Control UI 并选择 **MCP**。
2. 查看摘要卡片中的总数、已启用、OAuth 和已过滤服务器。
3. 使用每个服务器行查看传输、认证、过滤、超时和命令提示。
4. 当你想保留定义但将其排除在运行时发现之外时，切换启用状态。
5. 编辑作用域内的 `mcp` 配置段，以进行结构性更改，例如新增服务器、头部、TLS、OAuth 元数据或工具过滤器。
6. 选择 **Save** 仅持久化配置，或选择 **Save & Publish** 通过 Gateway 配置路径应用。
7. 当你需要该已编辑服务器已启动并列出工具的实时证明时，运行 `openclaw mcp doctor --probe`。

说明：

- 命令片段会给服务器名称加引号，因此即使是不常见的名称，在 shell 中也很方便复制
- 当显示的类 URL 值包含嵌入式凭据时，会在渲染前进行脱敏
- 该页面不会自行启动 MCP 传输
- 活动运行时可能需要 `openclaw mcp reload`、Gateway 配置发布或进程重启，具体取决于哪个进程持有 MCP 客户端

## MCP Apps

OpenClaw 可以渲染实现稳定版 [MCP Apps 扩展](https://modelcontextprotocol.io/extensions/apps) 的工具。Apps 采用按需启用，因为它们的 HTML 来自已配置的 MCP 服务器，并且可以请求同一服务器中对 app 可见的工具或资源。

启用主机桥接：

```bash
openclaw config set mcp.apps.enabled true --strict-json
```

更改此设置后请重启 Gateway。启用后，OpenClaw 会在 Gateway 端口加一（默认 Gateway 为 `18790`）上启动一个仅限沙箱的 HTTP(S) 监听器。Control UI 从那个独立源加载 Apps；该监听器绝不会提供 Control UI、已认证的 Gateway 路由或用户数据。

直接连接 Gateway 需要同时访问这两个端口。如果反向代理或 TLS 终止器暴露了 Control UI，请为 Apps 提供专用的公共源，并仅将该源代理到沙箱监听器：

```json5
{
  mcp: {
    apps: {
      enabled: true,
      sandboxOrigin: "https://mcp-apps.example.com",
      sandboxPort: 18790,
    },
  },
}
```

沙箱源必须与 Control UI 源不同。不要在其上托管其他已认证或敏感内容。

例如，官方基础 React 演示可以配置为：

```json5
{
  mcp: {
    apps: { enabled: true },
    servers: {
      "basic-react": {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-basic-react", "--stdio"],
      },
    },
  },
}
```

行为与安全边界：

- 只有在启用 Apps 时，OpenClaw 才会声明 `io.modelcontextprotocol/ui` 扩展。
- 只有 `ui://` 资源且 MIME 类型精确为 `text/html;profile=mcp-app` 时才会渲染。
- UI 资源大小上限为 2 MiB，放置在专用外层源上的双 iframe 代理后面，加载到不透明的内层 App 源中，并受由资源元数据派生的 CSP 约束。
- 仅限 App 的工具（`_meta.ui.visibility: ["app"]`）不会出现在模型工具列表中。Apps 只能调用其所属服务器上对 app 可见的工具，并且这些工具还必须通过创建该视图的运行所对应的有效 OpenClaw 工具策略。
- 基于源绑定的 App 权限（如摄像头、麦克风和地理位置）不会授予，因为内层 App 文档使用不透明源以实现跨 App 隔离。
- App HTML、完整工具参数和原始结果保存在一个有界的十分钟内存视图租约中，不会写入磁盘，也不会复制到对话预览元数据中。转录仅存储一个有界的服务器/工具/资源描述符，并与原始工具调用 ID 绑定。Gateway 重启后，Control UI 可以根据经过认证的会话转录验证该描述符，并重新获取 `ui://` 资源；重建的视图在新的运行建立当前工具权限之前均为只读。
- 在频道对话中，某一轮中最新成功的 App 视图会在最终的助手回复中增加一个 **Open App** 风格的动作。Telegram 私信使用原生 Mini App 按钮；Slack 和 Discord 将相同的可移植动作渲染为链接。其他频道则保留原始回复文本，并附加一个可理解的 HTTPS 链接。
- 只有在 Gateway Tailscale 暴露已准备好一个已发布的 HTTPS 源时，才可获得频道启动链接。`gateway.tailscale.mode: "serve"` 只能从 tailnet 访问；`"funnel"` 可从公共互联网访问。由 `gateway.tailscale.preserveFunnel` 保留的外部管理 Funnel 也视为可从互联网访问。参见 [Tailscale](/gateway/tailscale)。
- 启动票据是不透明的，仅在生成最终频道回复时铸造，并在最多两分钟后或底层视图租约到期时失效，以先发生者为准。URL 不包含 Gateway bearer 凭证、会话密钥、视图元数据、App HTML、工具输入或工具结果。
- 如果没有可用的已发布源或票据容量，或者视图/票据已过期，或者传输无法渲染原生控件，则保留原始助手文本。Control UI 会保留其现有的内联 App 画布，并且不会收到重复的启动动作。
- 在桥接启用时，`openclaw security audit` 会发出警告。若不需要，请使用 `openclaw config set mcp.apps.enabled false --strict-json` 将其禁用。

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
