---
summary: "Webhook 安全选项和 CLI、代理工具和网关 RPC 表面"
read_when:
  - "您将代理或隧道放在语音 Webhook 前面"
  - "您正在查找语音呼叫 CLI 命令"
  - "您正在通过网关 RPC 或座席工具拨打语音电话"
title: "语音通话安全和接口"
sidebarTitle: "安全性和接口"
---

Webhook 签名和转发标头安全性，以及 CLI、代理工具和网关 RPC 表面。 [语音通话插件](/plugins/voice-call)指南的一部分。

## <a id="webhook-security"></a> Webhook 安全

当代理或隧道位于网关前方时，插件会重建用于签名验证的公共 URL。以下选项用于控制哪些转发头被信任：

<ParamField path="webhookSecurity.allowedHosts" type="string[]">
  允许来自转发头的主机白名单。
</ParamField>
<ParamField path="webhookSecurity.trustForwardingHeaders" type="boolean">
  在没有白名单的情况下信任转发头。
</ParamField>
<ParamField path="webhookSecurity.trustedProxyIPs" type="string[]">
  仅当请求的远程 IP 与列表匹配时才信任转发头。
</ParamField>

其他保护措施：

- 对于 Twilio、Telnyx 和 Plivo，Webhook **重放防护**已启用。重放的有效 Webhook 请求会被确认，但会跳过副作用处理。
- Twilio 对话回合在 `<Gather>` 回调中包含每回合令牌，因此 stale/replayed 语音回调无法满足较新的待处理转录回合。
- 当提供方所需的签名头缺失时，未认证的 Webhook 请求会在读取正文之前被拒绝。
- 语音通话 Webhook 在签名验证之前使用共享的预认证正文读取配置文件（最大 64 KB 正文、5 秒读取超时），并为每个密钥设置进行中的请求上限（默认每个密钥 8 个并发请求）。

具有稳定公共主机的示例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          publicUrl: "https://voice.example.com/voice/webhook",
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
          },
        },
      },
    },
  },
}
```

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall start --to "+15555550123"   # alias for call
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall latency                      # summarize turn latency from logs
openclaw voicecall expose --mode funnel
```

当网关已在运行时，可操作的 `voicecall` 命令将委托给网关拥有的语音呼叫运行时，因此 CLI 不会绑定第二个 Webhook 服务器。如果没有可访问的网关，命令将回退到独立的 CLI 运行时。打印调用结果后，该进程将继续为其 Webhook 提供服务，直到 SIGINT 或 SIGTERM。关闭会在关闭其资源之前加入运行时创建、接受的命令工作以及挂起的收割机挂起。

`latency` 默认从 SQLite 读取持久化的通话记录。使用 `--file <path>` 读取现有的自定义 JSONL 日志（基本名称不是 `calls.jsonl`），并使用 `--last <n>` 将分析限制为最后 N 条记录（默认 200 条）。输出包括 min/max/avg、p50 和 p95，用于表示轮次延迟和监听等待时间。

语音呼叫 JSONL 日志已停用 7 月前的状态。通过OpenClaw 2026.9.7升级，并运行`openclaw doctor --fix`将其导入到SQLite中，然后再更新。该版本将呼叫数据、事件排序和原始日志保留为 `calls.jsonl.migrated`。 Current Doctor 保留任何剩余源并报告中间升级；运行时仅读取当前的 SQLite 格式。

呼叫保留创建时选择的座席。更改配置的代理会影响新呼叫。即使会话密钥指定了代理，也不会自动恢复没有显式 `agentId` 的较旧活动记录。他们存储的行和转录本保持不变；挂断提供商处剩余的所有呼叫并开始新的呼叫。完整的历史记录在没有代理所有者的情况下仍然可读。

## <a id="agent-tool"></a> 代理工具

工具名称：`voice_call`。

| 操作          | 参数                                       |
| --------------- | ------------------------------------------ |
| `initiate_call` | `message`, `to?`, `mode?`, `dtmfSequence?` |
| `continue_call` | `callId`, `message`                        |
| `speak_to_user` | `callId`, `message`                        |
| `send_dtmf`     | `callId`, `digits`                         |
| `end_call`      | `callId`                                   |
| `get_status`    | `callId`                                   |

voice-call 插件附带一个匹配的智能体技能。

## <a id="gateway-rpc"></a> 网关 RPC

| 方法                      | 参数                                                             | 笔记                                                                     |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `voicecall.initiate`        | `to?`, `message`, `mode?`, `sessionKey?`, `requesterSessionKey?` | 当省略 `to` 时，回退到 `toNumber` 配置。                     |
| `voicecall.start`           | `to`, `message?`, `mode?`, `dtmfSequence?`, `sessionKey?`        | 与 `initiate` 相同，但也接受连接前的 `dtmfSequence`。           |
| `voicecall.continue`        | `callId`, `message`                                              | 阻塞直到当前轮次完成；返回转录内容。                   |
| `voicecall.continue.start`  | `callId`, `message`                                              | 异步版本：立即返回一个 `operationId`。                      |
| `voicecall.continue.result` | `operationId`                                                    | 轮询一个待处理的 `voicecall.continue.start` 操作以获取结果。      |
| `voicecall.speak`           | `callId`, `message`                                              | 立即播放而不等待；在 `realtime.enabled` 时使用实时桥接。 |
| `voicecall.dtmf`            | `callId`, `digits`                                               |                                                                           |
| `voicecall.end`             | `callId`                                                         |                                                                           |
| `voicecall.status`          | `callId?`                                                        | 省略 `callId` 可列出所有活动通话。                                   |

`dtmfSequence` 仅在 `mode: "conversation"` 时有效；notify 模式的通话如果需要在连接后发送按键，应在通话建立后使用 `voicecall.dtmf`。
