---
doc-schema-version: 1
summary: "订阅 MCP 事件并通过签名的 webhook 运行现有的自动化"
read_when:
  - "将 MCP 事件源连接到自动化"
  - "配置签名 MCP 事件回调或对其进行故障排除"
  - "测试订阅续订、重复传送或重新启动恢复"
title: "MCP 活动"
---

MCP 事件将远程 MCP 服务器连接到 [Automations](/automation/cron-jobs)。 MCP 服务器过滤更改并发送签名的 Webhook。 OpenClaw 持久地接受它们并运行自动化的现有指令、工具策略、交付和历史记录。事件不会引入另一个调度程序或需要 MCP 应用程序视图保持打开状态。

## <a id="supported-profile"></a> 支持的配置文件

捆绑的、选择性加入的 `mcp-events` 插件实现了 [OpenAI webhook 配置文件](https://developers.openai.com/plugins/build/mcp-events)：MCP 协议 `2026-07-28`、`server/discover`、`events/list`、`events/subscribe` 和`events/unsubscribe` 通过流媒体 HTTP。它使用 OpenClaw 现有配置的 MCP 连接和身份验证。旧版 MCP 工具连接保留现有的握手。

这是与实验性规范的版本化集成，而不是声称支持每个草稿事件功能。轮询、推送流以及草稿的 `gap` 和 `terminated` Webhook 通知不属于此配置文件的一部分。

## <a id="configure-the-callback"></a> 配置回调

通过现有的 [MCP 设置 ](/tools/mcp) 连接服务器，然后使用公共 HTTPS 回调源启用插件：

```json5
{
  mcp: {
    servers: {
      reviews: {
        transport: "streamable-http",
        url: "https://mcp.example.com/mcp",
      },
    },
  },
  plugins: {
    entries: {
      "mcp-events": {
        enabled: true,
        config: {
          callbackOrigin: "https://events.example.com",
        },
      },
    },
  },
}
```

源必须没有凭据、路径、查询或片段。通过 HTTPS 反向代理仅将 `/plugins/mcp-events/callback/` 路由到网关。请勿公开 Control UI、网关 WebSocket 或其他管理路径。 OpenClaw 不会打开隧道或更改您的网络配置。

远程服务器必须能够到达此源并验证其 TLS 证书。公共 DNS 验证是先决条件，而不是可达性证明；订阅回调验证提供了这一证据。如果没有单独配置的路由，需要额外交互式登录或承载标头的基础设施无法接受这些回调：MCP 事件提供自己的每订阅 HMAC 身份验证。

使用现有的 MCP 凭证配置或登录流程。请勿将 MCP 不记名令牌或 Webhook 签名机密放入自动化指令中。

## <a id="create-an-event-automation"></a> 创建事件自动化

该插件公开了 `mcp_events` 发现工具，其中列出了一页 Webhook 事件及其已配置的 `serverName` 的参数架构。它不会创建单独的订阅或调度系统。自动化编辑器中提供了相同的目录。

使用事件源、代理轮流有效负载和显式输出传递创建自动化。源引用配置的MCP服务器；它不包含第二个连接 URL 或凭证存储。

自动化作业形状为：

```json
{
  "name": "Review new document comments",
  "agentId": "main",
  "enabled": true,
  "schedule": {
    "kind": "event",
    "source": "mcp-events",
    "options": {
      "server": "reviews",
      "name": "comment.created",
      "arguments": { "document_id": "doc_example" }
    }
  },
  "sessionTarget": "isolated",
  "wakeMode": "now",
  "payload": {
    "kind": "agentTurn",
    "message": "Summarize the new review comment. Do not modify the document."
  },
  "delivery": { "mode": "none" }
}
```

此示例将结果保留在自动化运行历史记录中，而不发送聊天公告。当结果应发送到通道或对话时，配置常用的 [ 传送目标 ](/automation/cron-jobs/delivery)。更喜欢独立运行外部评论和文档。该事件是不受信任的数据，与用户授权的指令分开；签名不会使有效负载文本成为可信指令或授予其他工具。

事件参数必须满足服务器的 `inputSchema`。交付的数据必须满足其`payloadSchema`。服务器在发送事件之前应用订阅过滤器。事件名称、描述和架构来自该服务器，不是受信任的授权事实。

## <a id="subscription-lifecycle"></a> 订阅生命周期

OpenClaw 在订阅之前准备回调绑定和签名密钥。因此，服务器可以在返回订阅 ID 之前发送其签名的验证质询。验证确认回调；它永远不会启动代理。

订阅的租约是有限的。 OpenClaw 使用现有的网关调度程序和最后一个持久游标在服务器的 `refreshBefore` 截止日期之前刷新它们。协议维护不调用模型。将 `cron.triggers.enabled` 设置为 `false` 会暂停事件运行准入以及现有的触发表面，而不丢弃已接受的事件。订阅状态在网关重启后仍然存在；原始聊天回合或应用程序视图不拥有其生命周期。不可用的源会不断重试，退避时间上限为五分钟，同时其自动化保持启用状态；暂停或删除自动化会取消恢复工作。

暂停、删除或替换源可防止从已停用的源生成中运行新事件。迟到的请求无法重新激活它。远程取消订阅使用原始事件名称、参数和回调 URL。如果清理无法建立当前的凭证授权，则关闭失败；有限的远程租约限制了孤儿生命周期。重新启用自动化不会恢复上一代的回调。

请求者范围的连接保留其经过身份验证的所有者。不可用或撤销的请求者连接不会回退到共享操作员凭据。接收和排队调度通过凭证所有者重新验证。成功的令牌刷新会保留绑定； disconnect/reconnect 创建不同的授权生命周期，并且不会恢复旧的回调。临时凭证存储失败会返回可重试的响应并保留排队的工作。自定义请求者连接解析器必须提供实时授权观察，而不仅仅是 URL 和标头。仅当提供者报告或经过身份验证的请求观察到拒绝时，才能检测到仅远程撤销。持久的身份验证配置文件源使用其实际共享或代理凭证所有者；个人模型帐户 ID、仅限外部的凭据以及有界或仅限环境的身份验证范围不会提升为环境共享权限。

## <a id="receipt%2C-execution%2C-and-recovery"></a><a id="receipt-execution-and-recovery"></a> 接收、执行和恢复

成功的 Webhook 响应确认持久接收，而不是模型完成或输出交付。 OpenClaw 在确切的请求正文上验证签名，检查签名时间戳和源绑定，并在返回 `2xx` 之前存储事件。一个请求包含一个事件，不大于256 KiB。

当自动化繁忙时，现有入口队列会保留待处理事件。重复的事件 ID 的范围仅限于其源绑定；它们不会抑制来自其他服务器或订阅的不相关事件。切换到运行会传输入口声明并一起记录自动化收据。在传输之前，重新启动恢复可以重试准入。之后，运行收据拥有完成或中断； OpenClaw 不会自动重复可能产生副作用的运行来隐藏不确定的结果。

该插件的 `maxPendingEvents` 设置限制待处理的摄入量（默认为 10,000）。全面接纳拒绝新的活动，而不是驱逐已经接受的工作。待处理和已声明的事件永远不会被保留驱逐。已完成和失败的入口记录使用共享的 30 天/每个帐户 20,000 条记录保留界限；重复数据删除受保留的历史记录的限制。远程清理或有界租约清理窗口后，已停用的订阅机密将被删除。执行错误、故意暂停、来源无效和成功接收是不同的结果；检查自动化历史记录和插件运行状况，而不是将 Webhook `2xx` 视为任务成功。

### <a id="limits-of-replay"></a> 重播限制

MCP Events 不保证端到端的一次性效果或每个上游事件都到达。服务器可能会耗尽其重试预算。事件交付可能无序。 `null` 光标表示源不提供重播，`truncated: true` 表示请求的历史记录不再可用。

光标是不透明的水印，而不是要排序或进行数字比较的值。该草案允许水印传递服务器放弃的事件。对于关键工作流程，与权威源状态进行协调并使写入操作具有幂等性。持久的本地队列保护已接受的事件；它无法恢复源从未交付且不再保留的更改。

## <a id="disable-or-downgrade"></a> 禁用或降级

在禁用插件之前暂停或删除事件自动化。在降级到事件计划之前的版本之前，请删除使用当前版本的这些作业，并根据复制的状态数据库检查目标版本的 [ 数据库兼容性 ](/reference/database-schemas/storage-changes#preflight-a-target-release)。删除事件作业不会撤消数据库架构升级。如果目标版本拒绝较新的架构，请恢复兼容的升级前备份，而不是用它打开升级状态。旧版本不理解持久的 `event` 调度类型；单独禁用插件不会将其转换为定时计划。

## <a id="developer-proof-server"></a> 开发者证明服务器

该存储库包括 `scripts/mcp-events-test-server.mjs` 和 `test/fixtures/mcp-events/README.md`。这是一个真正经过身份验证的 HTTP MCP 服务器，具有签名回调、JSON 和请求范围的 SSE 响应、持久固定装置订阅以及对重复、无效签名、突发、到期、轮换、撤销、重新启动和重播的控制。

仅使用合成记录和仅限固定装置的凭据。以隔离状态和专用配置文件运行网关。固定装置的交付响应本身并不能提供端到端的证明：验证实际的自动化运行、持续的结果和预期效果。切勿禁用 TLS 验证或削弱生产回调验证来使测试通过。

## <a id="related"></a> 相关内容

- [自动化](/automation/cron-jobs)
- [Inbound webhooks](/automation/cron-jobs/webhooks) — 单独的承载身份验证挂钩
- [MCP 连接](/tools/mcp)
- [插件服务运行时](/plugins/sdk-runtime/gateway-and-nodes)
