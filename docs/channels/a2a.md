---
summary: "通过 A2A 1.0 JSON-RPC 协议将外部代理连接到 OpenClaw"
read_when:
  - "您希望 A2A- 兼容代理发现 OpenClaw 并发送消息"
  - "您需要配置经过身份验证的 A2A 对等体或出站代理消息"
title: "A2A"
---

A2A 通道插件通过 Linux 基金会 [Agent2Agent 协议 ](https://a2a-protocol.org) 将 OpenClaw 连接到其他代理。外部代理通过公共代理卡发现网关，并使用 A2A 1.0 JSON-RPC 绑定提交经过身份验证的文本任务。 OpenClaw 还可以向配置的对等代理发送消息。

## <a id="quick-setup"></a> 快速设置

将捆绑插件添加到您的 OpenClaw 配置中，并为每个受信任的对等点定义单独的承载令牌：

```json5
{
  channels: {
    a2a: {
      enabled: true,
      advertisedUrl: "https://openclaw.example.com",
      peers: {
        hermes: {
          token: "${A2A_HERMES_TOKEN}",
        },
      },
    },
  },
}
```

在网关环境中将 `A2A_HERMES_TOKEN` 设置为强大的、唯一的机密，然后重新启动网关。当网关在反向代理后面运行时，使用外部可访问的 HTTPS 源作为 `advertisedUrl`。如果省略，插件将从传入的发现请求中派生出通告的来源。

## <a id="discover-the-agent-card"></a> 发现代理卡

无需认证即可获取公共A2A代理卡：

```bash
curl http://127.0.0.1:18789/.well-known/agent-card.json
```

该卡通告网关 JSON-RPC 端点、支持的文本输入和输出以及每个公开的 OpenClaw 代理的一项技能。将 `channels.a2a.exposeAgents` 设置为代理 ID 数组以限制出现的代理。如果未设置或为空，则通告所有已配置的代理。

`/.well-known/agent.json` 为较旧的 A2A 客户端返回相同的卡。

## <a id="send-a-task"></a> 发送任务

向 `/a2a/v1` 发送经过身份验证的 `SendMessage` JSON-RPC 请求：

```bash
curl http://127.0.0.1:18789/a2a/v1 \
  -H "Authorization: Bearer $A2A_HERMES_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "request-1",
    "method": "SendMessage",
    "params": {
      "message": {
        "messageId": "message-1",
        "role": "ROLE_USER",
        "parts": [{ "text": "Summarize my latest project updates." }]
      }
    }
  }'
```

默认情况下，请求等待代理响应。已完成的响应包含一个任务，其工件中包含回复：

```json
{
  "jsonrpc": "2.0",
  "id": "request-1",
  "result": {
    "task": {
      "id": "<task-id>",
      "contextId": "<context-id>",
      "status": {
        "state": "TASK_STATE_COMPLETED",
        "timestamp": "2026-01-01T12:00:00.000Z"
      },
      "artifacts": [
        {
          "artifactId": "<artifact-id>",
          "parts": [{ "text": "Here are your latest project updates..." }]
        }
      ],
      "history": []
    }
  }
}
```

在后续请求中包含 `message.contextId` 以继续与新任务进行相同的对话。省略 `message.taskId`：不支持继续执行现有任务，包括在该任务正在运行时。上下文 ID 可以包含字母、数字、句点、下划线、冒号和连字符，且不得超过 128 个字符。

如果提供了 `message.taskId`，则未知、过期或其他对等方的任务 ID 将返回 JSON-RPC 错误 `-32001`。具有冲突 `message.contextId` 的自有任务返回 `-32602`；否则，请求将返回 `-32004`，表示任务继续不受支持。这些请求都不会启动新工作或更改引用的任务。

要在代理继续工作时立即返回，请将 `"configuration": { "returnImmediately": true }` 与 `"message"` 一起添加到 `params` 中。该任务最初报告 `TASK_STATE_WORKING`。超过 `replyTimeoutMs` 的请求也会返回当前工作任务，而不是取消它。

较旧的客户端可以使用 `message/send` 作为 `SendMessage` 的别名。

## <a id="poll-a-task"></a> 轮询任务

通过将 ID 发送到 `GetTask` 来轮询任务：

```bash
curl http://127.0.0.1:18789/a2a/v1 \
  -H "Authorization: Bearer $A2A_HERMES_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "poll-1",
    "method": "GetTask",
    "params": { "id": "<task-id>" }
  }'
```

任务从 `TASK_STATE_WORKING` 转换到 `TASK_STATE_COMPLETED`、`TASK_STATE_FAILED` 或 `TASK_STATE_REJECTED`。较旧的客户端可以使用 `tasks/get` 作为兼容性别名。

`CancelTask` 被拒绝，并出现 JSON-RPC 错误 `-32004`，而不是被确认。调度的代理运行没有用于停止它的插件 API，因此报告 `TASK_STATE_CANCELED` 将告诉对等方工作已停止，而运行仍在使用工具。拒绝可以使报告的状态保持诚实。

## <a id="configure-outbound-peers"></a> 配置出站对等体

当 OpenClaw 应向另一个 A2A 代理发送消息时，添加对等 URL。当远程代理需要自己的承载令牌时，设置 `outboundToken`：

```json5
{
  channels: {
    a2a: {
      enabled: true,
      peers: {
        hermes: {
          token: "${A2A_HERMES_TOKEN}",
          url: "https://hermes.example.com/a2a/v1",
          outboundToken: "${A2A_HERMES_OUTBOUND_TOKEN}",
        },
      },
    },
  },
}
```

将出站消息地址发送至 `a2a:hermes`。该插件将 `SendMessage` 直接发送到配置的 URL，而不执行代理卡发现。出站消息重用每个对等方的稳定对话上下文。未配置 `url` 的对等体无法接收出站消息。

代理回复（包括排队的后续回复）仅向 A2A 对等方传送终端回复内容。主机状态通知（包括仅元数据诊断）和运行失败消息不会作为新的对等消息或任务工件转发。失败的代理运行会将其原始任务标记为 `TASK_STATE_FAILED`，原因为 `Agent run failed`，包括运行排队的时间。如果收集模式组合请求，则失败的运行将标记每个原始任务失败。这不会改变面向人的渠道上的错误报告。

## <a id="configuration-reference"></a> 配置参考

| 键                          | 类型     | 默认值  | 描述                                                                    |
| ---------------------------- | -------- | -------- | ------------------------------------------------------------------------------ |
| `enabled`                    | 布尔值  | -        | 启用或禁用 A2A 通道。                                           |
| `advertisedUrl`              | 字符串   | 要求  | 代理卡中使用的公共网关源。                                  |
| `replyTimeoutMs`             | 数字   | `120000` | 最大阻塞回复等待时间；允许的范围是 `5000` 到 `600000` 毫秒。 |
| `rateLimitPerMinute`         | 数字   | `30`     | 每个对等点的滑动窗口请求限制； `0` 禁用限制。                 |
| `exposeAgents`               | 细绳[] | 全部      | 特工 ID 被宣传为特工卡技能。                                     |
| `peers`                      | 目的   | `{}`     | 受信任的对等点由最多 64 个字符的小写名称键入。                    |
| `peers.<name>.token`         | 字符串   | 必填 | 当该对等方向 OpenClaw 发送请求时需要承载令牌。               |
| `peers.<name>.url`           | 字符串   | -        | 出站消息的对等 JSON-RPC 端点。                                  |
| `peers.<name>.outboundToken` | 字符串   | -        | 承载令牌 OpenClaw 发送到配置的对等点 URL。                        |

对等名称必须以小写字母或数字开头，还可以包含句点、下划线和连字符。

## <a id="session-isolation"></a> 会话隔离

每个经过身份验证的对等点和 A2A `contextId` 对都会获得自己的代理会话。 A2A 固定最隔离的直接消息范围，而不是继承 `session.dmScope`，因此远程对等内容永远不会加入操作员的主会话，并且一个对等点无法读取另一对等点的对话历史记录。

对于代理绑定，请使用配置的对等名称作为直接对等 ID，例如 `hermes`。上下文特定的 `hermes:<contextId>` 绑定优先于该稳定对等点绑定，并且稳定对等点绑定优先于更广泛的 A2A 帐户或通道路由。

## <a id="security"></a> 安全

代理卡发现有意公开：任何能够到达网关的人都可以读取实例描述和公开的代理 ID。使用 `exposeAgents` 来限制泄露，并在可通过不受信任的网络访问时通过 HTTPS 公开网关。

每个 JSON-RPC 请求都需要配置的对等承载令牌。不存在未经身份验证的模式。每个经过身份验证的对等点也是用于正常 OpenClaw 通道入口策略的发送者身份。为每个对等方使用不同的高熵令牌，使令牌不受源代码控制，并通过更新网关环境和重新启动来轮换令牌。

A2A 对等方发送任务，而不是用户命令。以 `/` 开头的消息将被拒绝，并显示 `TASK_STATE_REJECTED` 和解释。普通任务中类似命令的文本保持原义。它无法更改会话设置或解决批准问题。当对等方将协议消息角色设置为 `ROLE_USER` 时，这也适用：该字段不对人类用户进行身份验证。

普通任务保留其路由代理的工具和权限。需要批准的工作仍然需要授权运营商通过支持的用户渠道或 Control UI 做出决定。通过 A2A 发送斜杠命令的现有集成必须使用纯文本任务进行代理工作，并使用授权用户界面执行命令。没有选择加入的对等命令。

当等待执行批准时，原始任务仍然有效。操作员做出决定后，同一代理运行会接收结果并通过其原始回复路径完成任务。入站对等方不需要出站 `url` 即可通过 `GetTask` 接收该完成。

请求限制为 1 MiB，JSON-RPC 批次限制为 30 个条目，序列化 JSON-RPC 响应限制为 1 MiB。提取的消息文本的上限为 64 KiB，并在缩短时包含显式截断标记。默认滑动窗口限制为每个对等点每分钟 30 个请求。架构无效的请求计入该限制。仅在单独受保护的网络上将 `rateLimitPerMinute` 设置为 `0`。速率限制请求返回 JSON-RPC 错误，同时保持 HTTP 状态 200。

出站目标仅来自操作员配置的对等 URL。入站呼叫者无法提供代理目标或将 OpenClaw 重定向到另一个目标。

## <a id="a2a-1.0-limitations"></a><a id="a2a-1-0-limitations"></a> A2A 1.0 限制

当前插件支持文本消息和结构化 JSON 数据部分，这些数据部分作为紧凑的 JSON 文本附加。文件 URL 和原始二进制部分将被忽略。不支持流、服务器发送事件、推送通知、任务取消、任务列表、扩展代理卡和多租户路由。

代理卡标有 `pushNotifications: false`。推送通知配置方法返回 JSON-RPC 错误 `-32003` （`PushNotificationNotSupportedError`），按照 [A2A 1.0 规范 ](https://a2a-protocol.org/v1.0.0/specification/#334-capability-validation) 的要求。其他公认的不支持的方法返回`-32004`；未知方法名称返回 `-32601`。

来自同一经过身份验证的对等方的重复 `messageId` 返回现有任务及其当前状态，同时保留该任务。即使重试忽略 `contextId`，它也不会启动另一个代理轮次。使用新的 `messageId` 进行新的工作。回复与开始轮次的任务相关联，包括当一个上下文中的消息无序完成时。没有回复文本的已完成回合不会出现任何伪影；停止通道会导致未完成的任务失败。

任务仅保留在内存中。已完成的终端任务和其他终端任务最多保留 24 小时，最多保留 500 条条目。重新启动网关会丢弃所有任务和任务历史记录。

## <a id="related"></a> 相关内容

- [渠道概览](/channels)
- [频道路由](/channels/channel-routing)
- [网关安全](/gateway/security)
- [频道插件 SDK](/plugins/sdk-channel-plugins)
- [A2A 插件参考](/plugins/reference/a2a) — 插件的清单、配置和工具参考
