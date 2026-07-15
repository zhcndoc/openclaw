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

## OpenClaw as an MCP server

This is the `openclaw mcp serve` path.

### When to use serve

Use `openclaw mcp serve` when:

- Codex, Claude Code, or another MCP client should talk directly to OpenClaw-backed channels
- You already have a local or remote OpenClaw Gateway with routed conversations
- You want one MCP server that works across OpenClaw channel backends instead of running a bridge per channel

Use [`openclaw acp`](/cli/acp) instead when OpenClaw should host coding runtimes itself and keep agent sessions inside OpenClaw.

### How it works

`openclaw mcp serve` starts a stdio MCP server. The MCP client owns the process. While the client keeps the stdio session open, the bridge connects over WebSocket to a local or remote OpenClaw Gateway and exposes routed channel conversations through MCP.

<Steps>
  <Step title="Client starts the bridge">
    The MCP client launches `openclaw mcp serve`.
  </Step>
  <Step title="Bridge connects to Gateway">
    The bridge connects to the OpenClaw Gateway over WebSocket.
  </Step>
  <Step title="Sessions become MCP conversations">
    Routed sessions become MCP conversations and transcript/history tools.
  </Step>
  <Step title="Live event queue">
    Live events are queued in memory during the bridge connection.
  </Step>
  <Step title="Optional Claude push">
    If Claude channel mode is enabled, the same session can also receive Claude-specific push notifications.
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Important behavior">
    - Live queue state starts when the bridge connects
    - Earlier transcript history is read through `messages_read`
    - Claude push notifications exist only while the MCP session is alive
    - When the client disconnects, the bridge exits and the live queue disappears
    - One-shot agent entrypoints such as `openclaw agent` and `openclaw infer model run` retire any bundled MCP runtime they opened when the reply completes, so repeated script runs do not accumulate stdio MCP subprocesses
    - OpenClaw-launched stdio MCP servers, whether bundled or user-configured, are torn down as a process tree on shutdown, so children started by the server do not outlive the parent stdio client
    - Deleting or resetting a session releases that session's MCP clients through the shared runtime cleanup path, so no stdio connections remain attached to removed sessions

  </Accordion>
</AccordionGroup>

### Choose client mode

<Tabs>
  <Tab title="Generic MCP client">
    Use standard MCP tools only. Use `conversations_list`, `messages_read`, `events_poll`, `events_wait`, `messages_send`, and approval tools.
  </Tab>
  <Tab title="Claude Code">
    Standard MCP tools plus Claude-specific channel adapters. Enable `--claude-channel-mode on`, or keep the default `auto`.
  </Tab>
</Tabs>

<Note>
At the moment, `auto` behaves the same as `on`. No client capability detection has been implemented yet.
</Note>

### What serve exposes

The bridge uses existing Gateway session routing metadata to expose channel-backed conversations. When OpenClaw already has session state with known routing, you get a conversation such as:

- `channel`
- recipient or target metadata
- optional `accountId`
- optional `threadId`

This lets MCP clients do all of the following in one place:

- List recent routed conversations
- Read recent transcript history
- Wait for new inbound events
- Send replies through the same route
- View approval requests that arrive while the bridge is connected

### Usage

<Tabs>
  <Tab title="Local Gateway">
    ```bash
    openclaw mcp serve
    ```
  </Tab>
  <Tab title="Remote Gateway (token)">
    ```bash
    openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
    ```
  </Tab>
  <Tab title="Remote Gateway (password)">
    ```bash
    openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password
    ```
  </Tab>
  <Tab title="Verbose logging / Claude off">
    ```bash
    openclaw mcp serve --verbose
    openclaw mcp serve --claude-channel-mode off
    ```
  </Tab>
</Tabs>

### Bridge tools

<AccordionGroup>
  <Accordion title="conversations_list">
    Lists recent, session-backed conversations that already have routing metadata in Gateway session state.

    Filters: `limit` (max 500), `search`, `channel`, `includeDerivedTitles`, `includeLastMessage`.

  </Accordion>
  <Accordion title="conversation_get">
    Returns a conversation by direct Gateway session lookup using `session_key`.
  </Accordion>
  <Accordion title="messages_read">
    读取一个由会话支持的对话的最近转写消息。`limit` 默认为 20，最大 200。
  </Accordion>
  <Accordion title="attachments_fetch">
    Extracts non-text message content blocks from a transcript message. This is a metadata view over transcript content, not a separate persisted attachment blob store.
  </Accordion>
  <Accordion title="events_poll">
    读取自数值游标以来排队的实时事件。`limit` 最大 200。
  </Accordion>
  <Accordion title="events_wait">
    Long-polls until the next matching queued event arrives or a timeout expires (default 30s, max 300s).

    Use this when a generic MCP client needs near-real-time delivery without using Claude-specific push protocols.

  </Accordion>
  <Accordion title="messages_send">
    Sends a text reply through the same route already recorded on the conversation.

    Current behavior:

    - Requires an existing conversation route
    - Uses the session's channel, recipient, account id, and thread id
    - Sends text only

  </Accordion>
  <Accordion title="permissions_list_open">
    Lists pending exec/plugin approval requests observed by the bridge since it connected to Gateway.
  </Accordion>
  <Accordion title="permissions_respond">
    Resolves a pending exec/plugin approval request using one of:

    - `allow-once`
    - `allow-always`
    - `deny`

  </Accordion>
</AccordionGroup>

### Event model

The bridge maintains an in-memory event queue while connected.

Current event types:

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

<Warning>
- The queue is live-only; it starts when the MCP bridge starts
- `events_poll` and `events_wait` do not replay earlier Gateway history by themselves
- Persistent historical backlog should be read through `messages_read`

</Warning>

### Claude channel notifications

The bridge can also expose Claude-specific channel notifications. This is OpenClaw's equivalent of Claude Code's channel adapter: standard MCP tools remain available, but live inbound messages can also arrive as Claude-specific MCP notifications.

<Tabs>
  <Tab title="off">
    `--claude-channel-mode off`: standard MCP tools only.
  </Tab>
  <Tab title="on">
    `--claude-channel-mode on`: enables Claude channel notifications.
  </Tab>
  <Tab title="auto（默认）">
    `--claude-channel-mode auto`: current default; behaves the same as `on`.
  </Tab>
</Tabs>

When Claude channel mode is enabled, the server declares Claude experimental capabilities and can emit:

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

Current bridge behavior:

- inbound `user` transcript messages are forwarded as `notifications/claude/channel`
- Claude permission requests received over MCP are tracked in-memory
- if the command owner in the linked conversation later sends `yes <id>` or `no <id>` (`<id>` is the 5-letter request id, excluding `l`), the bridge converts that to `notifications/claude/channel/permission`
- these notifications are live-session only; if the MCP client disconnects, there is no push target

This is intentionally client-specific. Generic MCP clients should rely on the standard polling tools.

### MCP client configuration

stdio client configuration example:

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

For most generic MCP clients, start with the standard tool surface and ignore Claude mode. Only enable Claude mode if the client genuinely understands Claude-specific notification methods.

### Options

`openclaw mcp serve` supports:

<ParamField path="--url" type="string">
  Gateway WebSocket URL. Defaults to `gateway.remote.url` when configured.
</ParamField>
<ParamField path="--token" type="string">
  Gateway token。
</ParamField>
<ParamField path="--token-file" type="string">
  Read the token from a file.
</ParamField>
<ParamField path="--password" type="string">
  Gateway password。
</ParamField>
<ParamField path="--password-file" type="string">
  Read the password from a file.
</ParamField>
<ParamField path="--claude-channel-mode" type='"auto" | "on" | "off"'>
  Claude notification mode. Default `auto`.
</ParamField>
<ParamField path="-v, --verbose" type="boolean">
  Print verbose logs to stderr.
</ParamField>

<Tip>
Prefer `--token-file` or `--password-file` over inline secrets whenever possible.
</Tip>

### Security and trust boundaries

The bridge does not invent routing out of thin air. It only exposes conversations that the Gateway already knows how to route.

That means:

- Sender allowlists, pairing, and channel-level trust still belong to the underlying OpenClaw channel configuration
- `messages_send` can only reply through an existing stored route
- Approval state is live and in-memory only for the current bridge session
- Bridge authentication should use the same Gateway token or password controls as any other remote Gateway client

If a conversation is missing from `conversations_list`, the usual reason is not a broken MCP configuration, but missing or incomplete routing metadata in the underlying Gateway session.

### Testing

OpenClaw provides a deterministic Docker smoke test for this bridge:

```bash
pnpm test:docker:mcp-channels
```

That smoke runs a single container: it seeds conversation state, starts the Gateway, then spawns `openclaw mcp serve` as a stdio child process and drives it as an MCP client. It verifies conversation discovery, transcript reads, attachment metadata reads, live event queue behavior, and Claude-style channel and permission notifications over the real stdio MCP bridge. Outbound send routing (`messages_send` reusing the stored conversation route) is covered separately by unit tests in `src/mcp/channel-server.test.ts`.

This is the fastest way to prove the bridge works without wiring real Telegram, Discord, or iMessage accounts into the test run.

For broader testing context, see [Testing](/help/testing).

### Troubleshooting

<AccordionGroup>
  <Accordion title="No conversations are returned">
    This usually means the Gateway session is not yet routable. Confirm that the underlying session has stored channel/provider, recipient, and optional account/thread routing metadata.
  </Accordion>
  <Accordion title="events_poll or events_wait missed earlier messages">
    This is expected. The live queue starts when the bridge connects. Use `messages_read` for earlier transcript history.
  </Accordion>
  <Accordion title="Claude notifications are not appearing">
    Check all of the following:

    - The client kept the stdio MCP session open
    - `--claude-channel-mode` is `on` or `auto`
    - The client actually understands Claude-specific notification methods
    - The inbound messages happened after the bridge connected

  </Accordion>
  <Accordion title="Approvals are missing">
    `permissions_list_open` only shows approval requests observed during the bridge connection. It is not a persistent approval-history API.
  </Accordion>
</AccordionGroup>

## 作为 MCP 客户端注册表的 OpenClaw

这是 `openclaw mcp list`、`show`、`status`、`doctor`、`probe`、`add`、`set`、`configure`、`tools`、`login`、`logout`、`reload` 和 `unset` 路径。

这些命令不会通过 MCP 暴露 OpenClaw。它们管理 OpenClaw 配置中 `mcp.servers` 下由 OpenClaw 托管的 MCP 服务器定义。它们不会从 `config/mcporter.json` 读取 mcporter 服务器。

这些已保存的定义适用于 OpenClaw 之后会启动或配置的运行时，例如嵌入式 OpenClaw 和其他运行时适配器。OpenClaw 将这些定义集中存储，因此这些运行时无需维护各自重复的 MCP 服务器列表。

<AccordionGroup>
  <Accordion title="重要行为">
    - 这些命令只会读取或写入 OpenClaw 配置
    - `status`、`list`、`show`、不带 `--probe` 的 `doctor`、`set`、`configure`、`tools`、`logout`、`reload` 和 `unset` 不会连接到目标 MCP 服务器
    - `login` 会对已配置的 HTTP 服务器执行 MCP OAuth 网络流程，并保存生成的本地凭据
    - `status --verbose` 在不连接的情况下打印已解析的传输、认证、超时、过滤器和并行工具调用提示
    - `doctor` 会检查已保存的定义是否存在本地设置问题，例如缺少 stdio 命令、无效的工作目录、缺失的 TLS 文件、已禁用的服务器、字面量敏感头/环境变量值以及未完成的 OAuth 授权
    - `doctor --probe` 在静态检查通过后增加与 `probe` 相同的实时连接验证
    - `probe` 会连接到所选服务器或所有已配置服务器，列出工具，并报告能力/诊断信息
    - `add` 会根据标志构建定义，并在保存前进行探测，除非设置了 `--no-probe` 或需要先完成 OAuth 授权
    - 运行时适配器会在执行时决定它们实际支持哪些传输形态
    - `enabled: false` 会保留已保存的服务器，但会将其排除在嵌入式运行时发现之外
    - `timeout` 和 `connectTimeout` 以秒为单位设置每个服务器的请求和连接超时
    - `supportsParallelToolCalls: true` 用于标记适配器可以并发调用的服务器
    - HTTP 服务器可以使用静态头、OAuth 登录、TLS 验证控制以及 mTLS 证书/密钥路径
    - 嵌入式 OpenClaw 会在正常的 `coding` 和 `messaging` 工具配置中暴露已配置的 MCP 工具；`minimal` 仍会隐藏它们，而 `tools.deny: ["bundle-mcp"]` 会显式禁用它们
    - 每个服务器的 `toolFilter.include` 和 `toolFilter.exclude` 会在 MCP 工具成为 OpenClaw 工具之前对发现到的工具进行过滤
    - 声明了 resources 或 prompts 的服务器还会暴露用于列出/读取资源以及列出/获取 prompts 的实用工具；这些生成的实用工具名称（`resources_list`、`resources_read`、`prompts_list`、`prompts_get`）使用相同的 include/exclude 过滤器
    - 动态 MCP 工具列表变更会使该会话的缓存目录失效；下一次发现/使用会从服务器刷新
    - 重复的 MCP 工具请求/协议失败会暂时暂停该服务器，以免单个损坏的服务器占用整个轮次
    - 作用域为会话的打包 MCP 运行时会在 `mcp.sessionIdleTtlMs` 毫秒的空闲时间后被回收（默认 10 分钟；设为 `0` 可禁用），一次性嵌入式运行会在运行结束时清理它们

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
- `status` 在不连接的情况下对已配置的传输方式进行分类。`--verbose` 会包含解析后的启动、超时、OAuth、过滤器以及并行调用的详细信息。
- `doctor` 在不连接的情况下执行静态检查。若命令还应验证已启用的服务器是否可连接，请添加 `--probe`。
- `probe` 会进行连接，并报告工具数量、resources/prompts 支持、列表变更支持以及诊断信息。
- `add` 接受 stdio 标志，例如 `--command`、`--arg`、`--env` 和 `--cwd`，也接受 HTTP 标志，例如 `--url`、`--transport`、`--header`、`--auth oauth`、TLS、timeout 以及工具选择标志。
- `set` 需要在命令行中提供一个 JSON 对象值。
- `configure` 会更新启用状态、工具过滤器、超时、OAuth、TLS 以及并行工具调用提示，而不会替换整个服务器定义。添加 `--probe` 可在保存前验证更新后的服务器。
- `tools` 用于更新每个服务器的工具过滤器。include/exclude 条目是 MCP 工具名称和简单的 `*` 通配模式。
- `login` 为配置了 `auth: "oauth"` 的 HTTP 服务器运行 OAuth 流程。首次运行会打印授权 URL；在批准后使用 `--code` 重新运行。
- `logout` 会清除指定服务器已存储的 OAuth 凭据，而不会移除已保存的服务器定义。
- `reload` 仅会释放当前 CLI 进程中缓存的进程内 MCP 运行时。另一个进程中的 gateway 或 agent 进程仍然需要各自的 reload 或重启路径。
- 对于 Streamable HTTP MCP 服务器，请使用 `transport: "streamable-http"`。`openclaw mcp set` 也会将 CLI 原生的 `type: "http"` 规范化为相同的标准配置形状，以保证兼容性。
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

### Common Server Recipes

These examples only save the server definition. Afterwards, run `openclaw mcp doctor --probe` to prove the server has started and exposed tools.

<Tabs>
  <Tab title="File System">
    ```bash
    openclaw mcp add files \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-filesystem \
      --arg "$HOME/Documents" \
      --include 'read_file,list_directory,search_files'
    openclaw mcp doctor files --probe
    ```

    Restrict the file system server’s scope to the smallest directory tree the agent should read or edit.

  </Tab>
  <Tab title="Memory">
    ```bash
    openclaw mcp add memory \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-memory
    openclaw mcp probe memory --json
    ```

    If the server exposes write tools that should not be provided to ordinary agents, use tool filtering.

  </Tab>
  <Tab title="Local Script">
    ```bash
    openclaw mcp add local-tools \
      --command node \
      --arg ./dist/mcp-server.js \
      --cwd /srv/openclaw-tools \
      --env API_BASE=https://internal.example
    openclaw mcp status --verbose
    ```

    `doctor` checks whether `cwd` exists and whether the command can be resolved from the configured environment.

  </Tab>
  <Tab title="Remote HTTP">
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

    Use OAuth when the remote server supports it. If the server requires static headers, avoid committing literal bearer tokens.

  </Tab>
  <Tab title="Desktop/CUA">
    ```bash
    openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
    openclaw mcp tools cua-driver --include 'list_apps,observe,click,type'
    openclaw mcp doctor cua-driver --probe
    ```

    A direct desktop control server inherits the permissions of the process that started it. Use narrower tool filters and OS-level permission prompts.

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
        "timeout": 20,
        "connectTimeout": 5,
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

| Field                          | Description                                                      |
| ------------------------------ | ---------------------------------------------------------------- |
| `url`                          | 远程服务器的 HTTP 或 HTTPS URL（必需）                |
| `headers`                      | 可选的 HTTP 标头键值映射（例如认证令牌） |
| `connectionTimeoutMs`          | 每个服务器的连接超时时间，单位为 ms（可选）                   |
| `connectTimeout`               | 每个服务器的连接超时时间，单位为秒（可选）              |
| `timeout` / `requestTimeoutMs` | 每个服务器的 MCP 请求超时时间，单位为秒或 ms                  |
| `auth: "oauth"`                | 使用由 `openclaw mcp login` 保存的 MCP OAuth 凭据          |
| `sslVerify`                    | 仅在明确受信任的私有 HTTPS 端点上设置为 false    |
| `clientCert` / `clientKey`     | mTLS 客户端证书和密钥路径                            |
| `supportsParallelToolCalls`    | 提示该服务器支持安全的并发调用              |

示例：

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "auth": "oauth",
        "timeout": 20,
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

在凭据可用之前，OpenClaw 只会将该 MCP 服务器从代理运行时中省略，而不会导致代理轮次失败。此时，操作员或具有 shell 访问权限的代理可以运行 `openclaw mcp login <name>`，并在后续轮次中使用该服务器。

当远程 MCP 服务已经由单独的、支持刷新令牌的 OpenClaw 认证配置文件提供支持时，你可以选择设置 `oauth.authProfileId`。OpenClaw 会在运行时投影之前刷新任一凭据源，并且仅将当前访问令牌传递给下游 MCP 客户端。

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

    OpenClaw 会打印授权 URL，并将临时的 OAuth verifier 状态存储在 OpenClaw 状态目录下。

  </Step>
  <Step title="使用 code 完成">
    在浏览器中批准后，将返回的 code 传回给 OpenClaw。

    ```bash
    openclaw mcp login docs --code abc123
    ```

  </Step>
  <Step title="检查授权">
    使用 status 或 doctor 确认令牌已存在。

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

| Field                          | Description                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `url`                          | 远程服务器的 HTTP 或 HTTPS URL（必填）                                                 |
| `transport`                    | 设置为 `"streamable-http"` 以选择此传输；省略时，OpenClaw 使用 `sse`                 |
| `headers`                      | 可选的 HTTP 标头键值映射（例如认证令牌）                                               |
| `connectionTimeoutMs`          | 每个服务器的连接超时时间，单位为 ms（可选）                                            |
| `connectTimeout`               | 每个服务器的连接超时时间，单位为秒（可选）                                             |
| `timeout` / `requestTimeoutMs` | 每个服务器的 MCP 请求超时时间，单位为秒或 ms                                           |
| `auth: "oauth"`                | 使用由 `openclaw mcp login` 保存的 MCP OAuth 凭据                                      |
| `sslVerify`                    | 仅对明确可信的私有 HTTPS 端点设为 false                                               |
| `clientCert` / `clientKey`     | mTLS 客户端证书和密钥路径                                                              |
| `supportsParallelToolCalls`    | 提示该服务器支持并发调用是安全的                                                       |

OpenClaw 配置使用 `transport: "streamable-http"` 作为规范写法。通过 `openclaw mcp set` 保存时会接受 CLI 原生的 `type: "http"` 值，并由 `openclaw doctor --fix` 在现有配置中修复，但 `transport` 才是嵌入式 OpenClaw 直接消费的内容。

示例：

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectTimeout": 10,
        "timeout": 30,
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

- 仅当 Apps 启用时，OpenClaw 才会声明 `io.modelcontextprotocol/ui` 扩展。
- 只有 MIME 类型严格为 `text/html;profile=mcp-app` 的 `ui://` 资源才会渲染。
- UI 资源上限为 2 MiB，放置在专用外层源上的双 iframe 代理之后，加载到一个不透明的内部 App 源中，并受资源元数据派生的 CSP 约束。
- 仅限 App 的工具（`_meta.ui.visibility: ["app"]`）不会出现在模型工具列表中。Apps 只能调用其所属服务器上对 app 可见、且同样通过创建该视图的运行所对应的有效 OpenClaw 工具策略的工具。
- 诸如摄像头、麦克风和地理位置等绑定到源的 App 权限，在内部 App 文档使用不透明源以实现跨 App 隔离时不会被授予。
- App HTML、完整工具参数和原始结果会保存在受限的十分钟内存视图租约中，不会写入磁盘，也不会复制到对话预览元数据中。转录只会存储与原始工具调用 ID 关联的、受限制的服务器/工具/资源描述符。Gateway 重启后，Control UI 可以使用经过身份验证的会话转录来验证该描述符，并重新获取 `ui://` 资源；重建的视图在新的运行建立当前工具权限之前均为只读。
- 当桥接启用时，`openclaw security audit` 会发出警告。在不需要时，可通过 `openclaw config set mcp.apps.enabled false --strict-json` 将其禁用。

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
