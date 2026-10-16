---
summary: "通过 MCP 公开 OpenClaw 通道对话并管理保存的 MCP 服务器定义"
read_when:
  - "将 Codex、Claude Code 或另一个 MCP 客户端连接到 OpenClaw- 支持的通道"
  - "运行 `openclaw mcp serve`"
  - "管理 OpenClaw- 保存的 MCP 服务器定义"
title: "MCP"
sidebarTitle: "MCP"
---

`openclaw mcp` 有两个职责：

- 使用 `openclaw mcp serve` 将 OpenClaw 作为 MCP 服务器运行
- manage OpenClaw- 托管出站 MCP 服务器定义，包括 `list`、`show`、`status`、`doctor`、`probe`、`add`、 `set`、`configure`、`tools`、`login`、`logout`、`reload` 和 `unset`

`serve` 是 OpenClaw 作为 MCP 服务器运行。其他子命令则是 OpenClaw 作为 MCP 客户端侧的服务器注册表，供其自身运行时稍后使用。

<Note>
  `list`、`show`、`set` 和 `unset` 仅读取和写入 OpenClaw 配置中的 OpenClaw- 托管 `mcp.servers` 条目。它们不包括 `config/mcporter.json` 的 mcporter 服务器；使用 `mcporter list` 作为该注册表。
</Note>

当 OpenClaw 应该自行托管编码 harness 会话，并将该运行时通过 ACP 路由时，请使用 [`openclaw acp`](/cli/acp)。

## <a id="choose-the-right-mcp-path"></a> 选择合适的 MCP 路径

| 目标                                                                | 用途                                                                  | 原因                                                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 让外部 MCP 客户端 read/send OpenClaw 通道会话 | `openclaw mcp serve`                                                 | OpenClaw 是 MCP 服务器，通过 stdio 公开网关支持的对话。                                 |
| 保存第三方 MCP 服务器以供 OpenClaw- 托管代理运行        | `openclaw mcp add`, `set`, `configure`, `tools`, `login`             | OpenClaw 是 MCP 客户端注册表，稍后将这些服务器投影到合格的运行时中。               |
| 在不运行代理回合的情况下检查已保存的服务器                  | `openclaw mcp status`, `doctor`, `probe`                             | `status` 和 `doctor` 用于检查配置；`probe` 会打开实时 MCP 连接并列出能力。               |
| 从浏览器编辑 MCP 配置                                      | Control UI `/settings/mcp`（`/mcp` 别名）                            | 该页面显示清单、启用、OAuth/filter 摘要、命令提示和范围 `mcp` 编辑器。         |
| 为 Codex app-server 提供一个作用域受限的原生 MCP 服务器                    | `mcp.servers.<name>.codex`                                           | `codex` 块仅影响 Codex app-server 线程投影，并会在传给原生配置前被剥离。 |
| 运行 ACP- 托管harness会话                                     | [`openclaw acp`](/cli/acp) 和 [ACP Agents](/tools/acp-agents-setup) | ACP 桥接模式不接受每会话 MCP 服务器注入；配置 gateway/plugin 桥接器。     |

<Tip>
如果你不确定需要哪条路径，可以先运行 `openclaw mcp status --verbose`。它会显示 OpenClaw 已保存的内容，而不会启动任何 MCP 服务器。
</Tip>

## <a id="mcp-pages"></a> MCP 页数

此页是一个索引。 `openclaw mcp` 有六页，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                            | 读它的时候                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [作为 MCP 服务器运行 OpenClaw](/cli/mcp/serve) | MCP 客户端应通过 `openclaw mcp serve` 读取或发送 OpenClaw 通道对话。 |
| [管理已保存的MCP服务器](/cli/mcp/registry)   | 您正在保存、检查或批准用于 OpenClaw- 托管运行的第三方 MCP 服务器。    |
| [JSON 输出形状](/cli/mcp/json-output)      | 您正在针对 `status --json`、`doctor --json` 或 `probe --json` 编写脚本。                 |
| [传输和 OAuth](/cli/mcp/transports)     | 您需要传输配置字段，或者您正在运行 MCP OAuth 登录流程。                |
| [MCP 中的 Control UI](/cli/mcp/control-ui)    | 您想要从浏览器编辑或检查 MCP 配置。                                         |
| [MCP Apps](/cli/mcp/apps)                       | 您正在启用或保护 MCP Apps 主机桥。                                         |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本中的每个锚点仍可在此处解析，因此现有链接（例如 `/cli/mcp#bridge-tools`）仍然有效。每个条目都指向现在保存内容的页面。

- <a id="openclaw-as-an-mcp-server" />[OpenClaw 作为 MCP 服务器](/cli/mcp/serve#openclaw-as-an-mcp-server)
- <a id="when-to-use-serve" />[何时使用服务](/cli/mcp/serve#when-to-use-serve)
- <a id="how-it-works" />[工作原理](/cli/mcp/serve#how-it-works)
- <a id="client-spawns-the-bridge" />[客户端生成桥](/cli/mcp/serve#client-spawns-the-bridge)
- <a id="bridge-connects-to-gateway" />[桥连接到Gateway](/cli/mcp/serve#bridge-connects-to-gateway)
- <a id="sessions-become-mcp-conversations" />[会话变为 MCP 对话](/cli/mcp/serve#sessions-become-mcp-conversations)
- <a id="live-events-queue" />[直播事件队列](/cli/mcp/serve#live-events-queue)
- <a id="optional-claude-push" />[可选Claude推](/cli/mcp/serve#optional-claude-push)
- <a id="important-behavior" />[重要行为](/cli/mcp/serve#important-behavior)
- <a id="choose-a-client-mode" />[选择客户端模式](/cli/mcp/serve#choose-a-client-mode)
- <a id="generic-mcp-clients" />[通用 MCP 客户端](/cli/mcp/serve#generic-mcp-clients)
- <a id="claude-code" />[克劳德 Code](/cli/mcp/serve#claude-code)
- <a id="what-serve-exposes" />[什么服务暴露](/cli/mcp/serve#what-serve-exposes)
- <a id="usage" />[Usage](/cli/mcp/serve#usage)
- <a id="local-gateway" />[本地 Gateway](/cli/mcp/serve#local-gateway)
- <a id="remote-gateway-token" />[远程网关（令牌）](/cli/mcp/serve#remote-gateway-token)
- <a id="remote-gateway-password" />[远程网关（密码）](/cli/mcp/serve#remote-gateway-password)
- <a id="verbose-%2F-claude-off" />[详细/Claude关闭](/cli/mcp/serve#verbose-%2F-claude-off)
- <a id="bridge-tools" />[桥梁工具](/cli/mcp/serve#bridge-tools)
- <a id="conversations-list" />[conversations_list](/cli/mcp/serve#conversations-list)
- <a id="conversation-get" />[conversation_get](/cli/mcp/serve#conversation-get)
- <a id="messages-read" />[messages_read](/cli/mcp/serve#messages-read)
- <a id="attachments-fetch" />[attachments_fetch](/cli/mcp/serve#attachments-fetch)
- <a id="events-poll" />[events_poll](/cli/mcp/serve#events-poll)
- <a id="events-wait" />[events_wait](/cli/mcp/serve#events-wait)
- <a id="messages-send" />[messages_send](/cli/mcp/serve#messages-send)
- <a id="permissions-list-open" />[permissions_list_open](/cli/mcp/serve#permissions-list-open)
- <a id="permissions-respond" />[permissions_respond](/cli/mcp/serve#permissions-respond)
- <a id="event-model" />[事件模型](/cli/mcp/serve#event-model)
- <a id="claude-channel-notifications" />[克劳德频道通知](/cli/mcp/serve#claude-channel-notifications)
- <a id="off" />[off](/cli/mcp/serve#off)
- <a id="on" />[on](/cli/mcp/serve#on)
- <a id="auto-default" />[自动（默认）](/cli/mcp/serve#auto-default)
- <a id="mcp-client-config" />[MCP 客户端配置](/cli/mcp/serve#mcp-client-config)
- <a id="options" />[选项](/cli/mcp/serve#options)
- <a id="param-url" />[--url](/cli/mcp/serve#param-url)
- <a id="param-token" />[--代币](/cli/mcp/serve#param-token)
- <a id="param-token-file" />[--令牌文件](/cli/mcp/serve#param-token-file)
- <a id="param-password" />[--密码](/cli/mcp/serve#param-password)
- <a id="param-password-file" />[--密码文件](/cli/mcp/serve#param-password-file)
- <a id="param-claude-channel-mode" />[--克劳德通道模式](/cli/mcp/serve#param-claude-channel-mode)
- <a id="param-v-verbose" />[-v, --verbose](/cli/mcp/serve#param-v-verbose)
- <a id="security-and-trust-boundary" />[安全与信任边界](/cli/mcp/serve#security-and-trust-boundary)
- <a id="testing" />[测试](/cli/mcp/serve#testing)
- <a id="troubleshooting" />[故障排除](/cli/mcp/serve#troubleshooting)
- <a id="no-conversations-returned" />[没有返回对话](/cli/mcp/serve#no-conversations-returned)
- <a id="events-poll-or-events-wait-misses-older-messages" />[events_poll 或 events_wait 错过旧消息](/cli/mcp/serve#events-poll-or-events-wait-misses-older-messages)
- <a id="claude-notifications-do-not-show-up" />[克劳德通知不显示](/cli/mcp/serve#claude-notifications-do-not-show-up)
- <a id="approvals-are-missing" />[ 缺少批准](/cli/mcp/serve#approvals-are-missing)
- <a id="openclaw-as-an-mcp-client-registry" />[OpenClaw 作为 MCP 客户端注册表](/cli/mcp/registry#openclaw-as-an-mcp-client-registry)
- <a id="important-behavior-1" />[重要行为](/cli/mcp/registry#important-behavior)
- <a id="codex-tool-approvals" />[Codex 工具认证](/cli/mcp/registry#codex-tool-approvals)
- <a id="saved-mcp-server-definitions" />[已保存 MCP 服务器定义](/cli/mcp/registry#saved-mcp-server-definitions)
- <a id="common-server-recipes" />[普通服务器菜谱](/cli/mcp/registry#common-server-recipes)
- <a id="filesystem" />[文件系统](/cli/mcp/registry#filesystem)
- <a id="memory" />[内存](/cli/mcp/registry#memory)
- <a id="local-script" />[本地脚本](/cli/mcp/registry#local-script)
- <a id="remote-http" />[远程 HTTP](/cli/mcp/registry#remote-http)
- <a id="desktop%2Fcua" />[Desktop/CUA](/cli/mcp/registry#desktop%2Fcua)
- <a id="json-output-shapes" />[JSON 输出形状](/cli/mcp/json-output#json-output-shapes)
- <a id="status-json" />[状态 --json](/cli/mcp/json-output#status-json)
- <a id="doctor-json" />[医生--json](/cli/mcp/json-output#doctor-json)
- <a id="probe-json" />[探头 --json](/cli/mcp/json-output#probe-json)
- <a id="stdio-transport" />[Stdio传输](/cli/mcp/transports#stdio-transport)
- <a id="sse-%2F-http-transport" />[SSE / HTTP 运输](/cli/mcp/transports#sse-%2F-http-transport)
- <a id="sse-/-http-transport" />[SSE / HTTP 运输](/cli/mcp/transports#sse-/-http-transport)
- <a id="oauth-workflow" />[OAuth 工作流程](/cli/mcp/transports#oauth-workflow)
- <a id="save-the-server" />[保存服务器](/cli/mcp/transports#save-the-server)
- <a id="start-login" />[开始登录](/cli/mcp/transports#start-login)
- <a id="use-the-manual-fallback-when-needed" />[ 需要时使用手动回退](/cli/mcp/transports#use-the-manual-fallback-when-needed)
- <a id="check-authorization" />[检查授权](/cli/mcp/transports#check-authorization)
- <a id="clear-credentials" />[清除凭证](/cli/mcp/transports#clear-credentials)
- <a id="streamable-http-transport" />[可流 HTTP 传输](/cli/mcp/transports#streamable-http-transport)
- <a id="control-ui" />[控制 UI](/cli/mcp/control-ui#control-ui)
- <a id="mcp-apps" />[MCP Apps](/cli/mcp/apps#mcp-apps)
- <a id="current-limits" />[电流限制](/cli/mcp/serve#current-limits)

## <a id="related"></a> 相关内容

- [连接 MCP 服务器](/tools/mcp)
- [CLI 参考](/cli)
- [插件](/cli/plugins)
- [`openclaw attach`](/cli/attach) — 使用临时会话范围网关 MCP 授权启动 Claude Code
