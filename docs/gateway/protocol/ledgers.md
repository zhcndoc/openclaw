---
summary: "审计账本 RPC、范围、游标和有效负载"
read_when:
  - "通过网关协议读取审计账本"
title: "网关协议账本 RPC"
sidebarTitle: "账本 RPC"
doc-schema-version: 1
---

审计账本可通过网关协议获得。

## <a id="audit-ledger-rpc"></a> 审计账本 RPC

`audit.activity.list` 为运营商客户提供代理运行、工具操作、入站消息和终端出站消息元数据的稳定的最新优先视图。它需要 `operator.read`。查询排除超过 30 天的记录，共享 SQLite 分类帐的记录上限为 100,000 条。过期的行将在网关启动、每小时维护和以后写入期间删除。有关数据模型和隐私语义，请参阅 [ 审核历史记录](/gateway/audit)。

- Params：可选精确`agentId`、`sessionKey`或`runId`；可选 `kind`（`"agent_run"`、`"tool_action"` 或 `"message"`）；可选 `status`（`"started"`、`"succeeded"`、`"failed"`、`"cancelled"`、`"timed_out"`、`"blocked"` 或 `"unknown"`）；可选消息 `direction`（`"inbound"` 或 `"outbound"`）和确切的 `channel`；可选的包含 `after` / `before` Unix 毫秒范围；可选`limit`从`1`到`500`；以及上一页中的可选字符串 `cursor`。
- 结果：`{ "events": AuditActivityEventV1[], "nextCursor"?: string }`。

命名的 V1 结果联合类型具有独立的代理运行、工具操作、入站消息和出站消息架构。`eventType` 判别字段分别为 `agent_run`、`tool_action`、`inbound_message` 或 `outbound_message`；`kind` 和消息 `direction` 仍可用于筛选和显示。每个事件都有整数 `schemaVersion: 1`。消息身份引用使用精确的 `hmac-sha256:v1:<32 hex key id>:<64 hex digest>` 格式；channel-sender actor id 使用相同格式。

所有变体都要求 `eventType`、`schemaVersion`、`eventId`、`sequence`、 `sourceSequence`、`occurredAt`、`kind`、`action`、`status`、`actor` 和 `redaction`。变体字段如下：

| `eventType`        | 必填字段                                                   | 可选字段                                                                                                                 |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `agent_run`        | `agentId`, `runId`; `kind: "agent_run"`                           | `sessionKey`, `sessionId`, `errorCode`                                                                                          |
| `tool_action`      | `agentId`, `runId`; `kind: "tool_action"`                         | `sessionKey`, `sessionId`, `toolCallId`, `toolName`, `errorCode`                                                                |
| `inbound_message`  | `direction: "inbound"`, `channel`, `conversationKind`, `outcome`  | `agentId`、`runId`、`durationMs`、`resultCount`、身份引用、`reasonCode`、`errorCode`                                 |
| `outbound_message` | `direction: "outbound"`, `channel`, `conversationKind`, `outcome` | `agentId`、`runId`、`durationMs`、`resultCount`、身份引用、`reasonCode`、`deliveryKind`、`failureStage`、`errorCode` |

封闭的消息枚举如下：

- `conversationKind`：`direct`、`group`、`channel` 或 `unknown`。
- 入站 `outcome`：`completed`、`skipped` 或 `failed`；可选的 `reasonCode`：`duplicate`、`reply_operation_active`、 `reply_operation_aborted`、`fast_abort`、`plugin_bound_handled`、 `plugin_bound_unavailable`、`plugin_bound_declined`、`plugin_bound_error`、 `before_dispatch_handled`、`acp_dispatch_completed`、`acp_dispatch_failed`、 `acp_dispatch_empty` 或 `acp_dispatch_aborted`。
- 出站 `outcome`：`sent`、`suppressed`、`failed` 或 `unknown`；可选的 `reasonCode`：`cancelled_by_message_sending_hook`、 `cancelled_by_reply_payload_sending_hook`、`empty_after_message_sending_hook`、 `empty_after_reply_payload_sending_hook` 或 `no_visible_payload`。当适配器未返回平台身份时为 `unknown`，因为无法证明外部副作用未发生。
- `deliveryKind`：`text`、`media` 或 `other`；`failureStage`： `platform_send`、`queue` 或 `unknown`。

终止字段具有关联性，而非彼此独立可选：

| 变体          | 终止映射                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 代理运行        | `started` 不含 `errorCode`；每个非成功的完成状态都要求对应的 `run_*` 代码。                                                                 |
| 工具动作      | `started` 和 succeeded 不含 `errorCode`；其他每个完成状态都要求对应的 `tool_*` 代码。                                                       |
| 入站消息  | succeeded = `completed`；blocked = `skipped`；failed = `failed` 加上 `message_processing_failed`。存在时，`reasonCode` 必须属于该终止系列。 |
| 出站消息 | succeeded = `sent`；blocked = `suppressed` 加上 `reasonCode`；failed = `failed` 加上 `errorCode` 和 `failureStage`；unknown = `unknown` 加上 `failureStage`。      |

每个 activity 事件都包含稳定的事件 id、单调递增的 ledger sequence、 源事件 sequence、时间戳、actor、action、status、整数 `schemaVersion: 1` 以及 `redaction: "metadata_only"`。运行和工具记录要求 agent 和 run 溯源信息，并且可以包含 session 溯源信息。消息记录可以包含 agent 和 run id，但有意从不包含 `sessionKey` 或 `sessionId`；因此 `sessionKey` 查询筛选器仅适用于 run 和 tool 行。工具事件可以包含工具调用 id 和工具名称。

活动分类账返回 `message.inbound.processed` 和 `message.outbound.finished` 记录并添加方向、渠道、对话类型、标准化结果和可选交付类型、故障阶段、持续时间、结果计数、原因代码和安装本地键控的 account/conversation/message/target 假名。这些假名有助于关联，但并不匿名：状态数据库包含它们的密钥，而 RPC 和 CLI 导出则不包含。分类帐不存储提示、消息正文、工具参数、工具结果、命令输出或原始错误文本。 Run/tool `sessionKey` 值保留原始相关元数据，并且可以嵌入平台帐户或对等 ID；消息记录省略会话密钥。

对于入站行，`durationMs` 衡量从核心 dispatch 到终止的时间， `resultCount` 统计最终确定的已排队工具、阻止和回复 payload。对于出站行， `durationMs` 跨越从交付所有权到确认、死信或对账的整个过程 （包括排队等待时间），`resultCount` 统计已识别的实际平台发送次数。存在时，`deliveryKind` 描述经过 hooks 和渲染后的有效 payload；被抑制或崩溃导致状态不明确的行会省略它。

当前消息覆盖范围包括已接受的到达核心调度的入站消息，包括核心 duplicate/terminal 结果。出站覆盖将重放安全队列和平台启动记录写入惰性所有者本机同伴，并为每个原始逻辑回复有效负载写入一个终端活动行，以达到共享持久交付；运行检查会合并这些源。分块和适配器扇出在终端 `resultCount` 中聚合。只有在确认、死信或协调之后，不明确的发送才会到达终端。不包括绕过这些共享边界的插件本地路径和直接发送路径。有界进程拥有的异步队列是尽力而为的，可能会在饱和、终端持久性失败或关闭超时时删除记录，因此该表面不是无损合规性存档。

录音默认开启并由 [`logging.audit.enabled`](/gateway/config-observability#audit) 控制。留言录音由`logging.audit.messages`单独控制，默认为`"off"`。当禁用记录时，`audit.activity.list` 会保留之前写入的记录，直至其过期。

`audit.run.inspect` 同样要求 `operator.read`。其封闭请求会选择一个 `executionId` 进行精确检查，或选择一个 `runId` 进行有界的执行发现。一个 run 匹配项会直接解析；多个匹配项会返回明确的 `ambiguous` 结果，最多包含 50 个候选项，并要求精确选择执行。决策页最多包含 100 个回执。执行身份收集默认单独关闭，并要求 `logging.audit.executionIdentity: true`，同时在 Gateway 重启后启用 audit ledger。缺失的尽力而为证据永远不能证明某个 run 未发生。

对于选定的运行，决策收据将终端出库活动与所有者本地 `queued` 和 `platform_started` 进度合并。进度仅归因，存在于惰性伴随存储中，并且不是 `audit.activity.list` 结果架构的一部分。

已提供的 `audit.list` 请求、结果和 `AuditEvent` 架构保持不变，并且仅返回 agent-run 和 tool-action 记录。当 Gateway 宣布支持 `audit.activity.list` 时， 新的 operator 客户端应调用它。较旧的 Gateway 可能报告 `unknown method: audit.activity.list`，或者由于已发布版本中授权先于方法查找，对具有 read 作用域的请求报告 `missing scope: operator.admin`。仅当该方法未被宣布支持时，才将后者视为方法不存在。随后，客户端只有在其筛选条件不要求消息 kind、direction 或 channel 支持时，才可以重试 `audit.list`。

使用 [`openclaw audit`](/cli/audit) 进行文本查询和有界 JSON 导出。
