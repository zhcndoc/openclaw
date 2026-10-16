---
summary: "导出的 Span 目录及其属性，以及指标和 Span 背后的诊断事件目录"
title: "导出的跨度和诊断事件"
sidebarTitle: "跨度和事件"
read_when:
  - "您需要准确的跨度名称或属性形状来构建仪表板或警报"
  - "您正在订阅公共诊断事件的插件"
  - "您需要导出的指标有意忽略的与会话相关的使用情况"
---

## <a id="exported-spans"></a> 导出的 spans

- `openclaw.gateway.rpc.response`, `openclaw.gateway.rpc.handler`, `openclaw.gateway.rpc.dispatch`
  - 使用 `openclaw.gateway.rpc.method`、`openclaw.gateway.rpc.phase` 和 `openclaw.gateway.rpc.outcome` 完成相位观测
  - Handler跨度包括`openclaw.gateway.rpc.admission_ms`；调度跨度包括`openclaw.gateway.rpc.response`，调度结算时的响应状态
  - 保留提供的上游请求父级；它们不会引入长期存在的 RPC 父跨度或更改下游跟踪传播

- `openclaw.model.usage`
  - `openclaw.channel`、`openclaw.provider`、`openclaw.model`、可选 `openclaw.agent`（已知时拥有运行的代理）
  - 仅适用于受信任插件运行时完成的、可选的源自主机的 `openclaw.plugin`
  - `openclaw.tokens.*` (input/output/cache_read/cache_write/total)
  - 默认使用 `gen_ai.system`，或者在启用最新 GenAI 语义约定时使用 `gen_ai.provider.name`
  - `gen_ai.request.model`, `gen_ai.operation.name`, `gen_ai.usage.*`

插件归属信息仅存在于 span 中。它不会向共享的 OpenTelemetry 指标添加插件维度，也不会更改 Prometheus 指标标签。

- `openclaw.run`
  - `openclaw.outcome`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`、`openclaw.errorCategory`、可选`openclaw.agent`
- `openclaw.model.call`
  - 默认使用 `gen_ai.system`，或者在启用最新 GenAI 语义约定时使用 `gen_ai.provider.name`
  - `gen_ai.request.model`、`gen_ai.operation.name`、`openclaw.provider`、`openclaw.model`、`openclaw.api`、`openclaw.transport`、`openclaw.model_call.observation_unit`（`request` 或`turn`），可选 `openclaw.agent`
  - 出错时使用 `openclaw.errorCategory`、`error.type`，以及可选的 `openclaw.failureKind`
  - `openclaw.model_call.request_bytes`, `openclaw.model_call.response_bytes`, `openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.model_call.prompt.input_messages_count`、`openclaw.model_call.prompt.input_messages_chars`、`openclaw.model_call.prompt.system_prompt_chars`、`openclaw.model_call.prompt.tool_definitions_count`、`openclaw.model_call.prompt.tool_definitions_chars`、`openclaw.model_call.prompt.total_chars`（仅包含安全的组件大小，不包含提示词文本）
  - 当结果携带该请求或聚合回合的使用量时，包含 `openclaw.model_call.usage.*` 和 `gen_ai.usage.*`
  - 当上游提供程序结果公开请求 ID 时，具有属性 `openclaw.upstreamRequestIdHash`（有界、基于哈希）的 Span 事件 `openclaw.provider.request`；原始 ID 永远不会导出
  - 当设置 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` 时，请求 spans 使用最新 GenAI 推理 span 名称 `{gen_ai.operation.name} {gen_ai.request.model}`。由于 OpenClaw 不会从不透明的 CLI 边界声明原生 agent 名称，回合 spans 使用 `invoke_agent`。两者都使用 `CLIENT` span 类型，而不是 `openclaw.model.call`。
- `openclaw.harness.run`
  - `openclaw.harness.id`、`openclaw.harness.plugin`、`openclaw.outcome`、`openclaw.provider`、`openclaw.model`、`openclaw.channel`、可选`openclaw.agent`
  - 完成时：`openclaw.harness.result_classification`、`openclaw.harness.yield_detected`、`openclaw.harness.items.started`、`openclaw.harness.items.completed`、`openclaw.harness.items.active`
  - 出错时：`openclaw.harness.phase`、`openclaw.errorCategory`、可选的 `openclaw.harness.cleanup_failed`
  - Span 事件 `openclaw.agent.commentary`，用于来自支持的harness的完整前导码，包括内置运行时、Codex 和 Claude CLI。属性包括 `openclaw.commentary.sequence`、`openclaw.commentary.text_length` 和 `openclaw.commentary.content_truncated`。现有的 `diagnostics.otel.captureContent` 设置控制有界的、经过编辑的输出消息内容。
  - With `captureContent: true`：开始时有界、经过编辑的 `input.value` 和完成时的 `output.value`（运行时的最终消息文本）。对于 Claude CLI 后端，`input.value` 是 CLI 在历史记录重新播种、插件输入文本转换和提示上下文之后收到的精确组合提示； Codex harness记录 OpenClaw 递给它的转弯提示。 Gemini CLI 后端在 `openclaw.message.processed` 上发布捕获的内容（入站消息和模型的最终响应）；它不会在这些运行级别跨度上记录其组成的 CLI 提示符。
- `openclaw.tool.execution`
  - `gen_ai.tool.name`、`gen_ai.operation.name` （`execute_tool`）、`openclaw.toolName`、`openclaw.tool.source`、可选 `gen_ai.tool.call.id`、`openclaw.tool.owner`、`openclaw.tool.params.*`、可选`openclaw.agent`
  - 出错时可选的 `openclaw.errorCategory`/`openclaw.errorCode`；当因策略或沙箱被拒绝时，使用 `openclaw.deniedReason` 和 `openclaw.outcome=blocked`
- `openclaw.exec`
  - `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`, `openclaw.exec.command_length`, `openclaw.exec.exit_code`, `openclaw.exec.exit_signal`, `openclaw.exec.timed_out`
- `openclaw.webhook.processed`
  - `openclaw.channel`, `openclaw.webhook`
- `openclaw.webhook.error`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`、`openclaw.outcome`、`openclaw.reason`、可选 `openclaw.agent`（最初提取提示的代理）
  - Isolated cron 代理轮流使用此跨度作为其harness跨度的父级，使模型调用、工具和使用在完成或失败时保持在同一跟踪上。
  - 与 `captureContent: true`：有界、经过编辑的 `input.value`（入站消息文本）和 `output.value`（模型自己的响应文本；永远不会捕获挂钩回复和主机通知）
- `openclaw.message.delivery`
  - `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`, `openclaw.delivery.result_count`
- `openclaw.session.stuck`
  - `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth`
- `openclaw.context.assembled`
  - `openclaw.prompt.size`、`openclaw.history.size`、`openclaw.context.tokens`、`openclaw.errorCategory`（不包含提示词、历史、响应或 session-key 内容）
- `openclaw.tool.loop`
  - `openclaw.toolName`、`openclaw.loop.level`、`openclaw.loop.action`、`openclaw.loop.detector`、`openclaw.loop.count`、可选 `openclaw.loop.paired_tool`、可选 `openclaw.agent`（无循环消息、参数或工具输出）
- `openclaw.memory.pressure`
  - `openclaw.memory.level`、`openclaw.memory.reason`、`openclaw.memory.rss_bytes`、`openclaw.memory.heap_used_bytes`、`openclaw.memory.heap_total_bytes`、`openclaw.memory.external_bytes`、`openclaw.memory.array_buffers_bytes`、可选的 `openclaw.memory.threshold_bytes`/`openclaw.memory.rss_growth_bytes`/`openclaw.memory.window_ms`

当显式启用内容捕获时，模型和工具 spans 还可以包含针对你选择启用的特定内容类别的、受限且已脱敏的 `openclaw.content.*` 属性。

`openclaw.message.processed` 和 `openclaw.harness.run` 跨度遵循相同的现有 `captureContent` 设置。当它是 `true` 时，`input.value` 和 `output.value` 携带入站消息或转向提示以及模型的最终响应文本，每个字段限制为 128 个 KiB（131072 UTF-16 代码单元），并通过与其他导出内容相同的敏感文本过滤器进行编辑。 `output.value` 记录了 LLM 实际响应的内容（模型自己在传递过滤之前的最终响应），因此 `NO_REPLY` 等哨兵回复会逐字显示；这是LLM-可观测性数据，不是交货记录。只有模型最后一条消息的文本才有效。传递给 `message` 工具的模型文本是工具调用的参数，而不是其最终消息，因此仅工具会记录模型的关闭消息（通常是 `NO_REPLY`）或什么也不记录；发送的文本位于子 `openclaw.model.call` 输出消息上，对于内置运行时，位于 `openclaw.tool.execution` 范围 （`gen_ai.tool.call.arguments`） 上。 CLI 后端不导出工具参数，因此它们的消息工具文本不会在任何范围内捕获。轮中的早期旁白（“现在检查...”）永远不会被报告为最终响应：以工具调用结束的消息不是最终消息，CLI 轮流仅记录最终消息，而不是累积回复文本。模型未编写的文本永远不会被捕获，即使它被传递到聊天：插件挂钩回复（`before_dispatch`、`before_agent_reply`）、不可见回复回退、继续状态、失败文本和网关重启通知。没有模型生成的文本的转弯不带有 `output.value`。捕获的内容仅作为私有侦听器有效负载数据路由到受信任的诊断导出器；它永远不会出现在公共事件有效负载中。

**升级说明：** 如果您已经使用 `diagnostics.otel.captureContent: true` 运行，这些消息和运行范围属性是新的 - 您现有的设置现在也导出此提示和回复内容，无需进一步更改配置。当 `captureContent` 未设置或 `false` 时，不会导出任何新内容。

## <a id="diagnostic-event-catalog"></a> 诊断事件目录

下面的事件支持 [metrics](/gateway/opentelemetry/model-calls-and-metrics#exported-metrics) 并跨越上面。公共活动也可用于直接插件订阅；受信任的核心事件（例如 `model.usage`）仅限于授权的内部使用者。 `run.progress` 和 `run.execution_phase` 是直接生命周期信号； Diagnostics-otel 插件不会将它们导出为独立的 OTLP 信号。事件类型和 `run.execution_phase.phase` 值是相加的。 TypeScript 消费者应该保留默认分支，而不是假设任一联合永久详尽。

在负载丰富和排队之前，没有感兴趣的订阅者或跟踪导出者的事件将被丢弃；它们不会为未来的订阅者缓冲。

`agent.commentary` 记录完整的前导码，而不是文本增量。它携带原始代理事件序列和时间戳，并附加到活动harness跨度。每次尝试都会抑制最近的重复完成。与其他排队诊断一样，评论可能会在队列压力下被丢弃；会话记录仍然是持久的对话记录。在调试级别，`diagnostic` 记录器还记录没有注释文本的完成元数据。

**模型使用**

`model.usage` 是受信任的进程内诊断事件，而不是 JSONL 日志记录。一个具有代表性的事件如下：

```json
{
  "type": "model.usage",
  "ts": 1735689600000,
  "seq": 42,
  "provider": "openai",
  "model": "gpt-5.4",
  "channel": "webchat",
  "agentId": "main",
  "sessionId": "session-123",
  "sessionKey": "agent:main:main",
  "usage": {
    "input": 120,
    "output": 40,
    "cacheRead": 30,
    "cacheWrite": 10,
    "promptTokens": 160,
    "total": 200
  },
  "lastCallUsage": {
    "input": 120,
    "output": 40,
    "cacheRead": 30,
    "cacheWrite": 10,
    "total": 200
  },
  "context": { "limit": 128000, "used": 160 },
  "costUsd": 0.0012,
  "durationMs": 850,
  "trace": {
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "spanId": "00f067aa0ba902b7",
    "traceFlags": "01"
  }
}
```

- `ts` 是以毫秒为单位的 Unix 时间戳；`seq` 是进程本地的序列号。
- `usage` 保存单轮的令牌计数。`promptTokens` 包含 `input`、 `cacheRead` 和 `cacheWrite`；如果可用，`lastCallUsage` 描述最终的模型调用。
- `context.used` 是当前 prompt/context 快照，当涉及缓存输入或工具循环调用时，可以低于 `usage.total`。
- Provider/model/session标识符、令牌桶、`lastCallUsage`、`context`、`costUsd`、`durationMs`和`trace`字段是可选的。 `costUsd` 是估计值，当模型定价不可用时可以不存在；这不是提供商报告的账单。跟踪上下文还可以包括 `parentSpanId`。

Gateway 的 `/tmp/openclaw/openclaw-YYYY-MM-DD.log` JSONL 文件和 `diagnostics.otel.logsExporter: "stdout"` 包含普通日志记录，而不是原始的 `model.usage` 事件。公共诊断订阅和 `diagnostics.stability` 不会暴露受信任的核心使用事件。 diagnostics-otel 插件会将它们转换为诸如 `openclaw.tokens` 和 `openclaw.cost.usd` 这样的指标，以及 `openclaw.model.usage` 跨度；这些使用指标和跨度会有意省略会话标识符。

对于需要按会话关联使用情况的外部集成，请改为查询经过身份验证的 Gateway：

```bash
openclaw gateway call sessions.usage --params '{"range":"30d","agentScope":"all"}' --json
openclaw gateway usage-cost --days 30 --all-agents --json
```

这两个命令都需要 `operator.read`。 `sessions.usage` 可以包括每个会话的 `sessionId`、provider/model 详细信息和 token/cost 摘要；当缓存刷新时，每个会话的使用量可以暂时为 `null`。 `usage-cost` 提供汇总估算。省略 `agentScope` 或 `--all-agents` 可将报告范围限定为默认代理。对于持续更新的客户端，[ 订阅会话更改，而不是轮询使用情况报告](/gateway/clients#subscribe-instead-of-polling-usage)。使用方法和请求选项请参见[Gateway RPC方法参考](/gateway/protocol/rpc-methods#rpc-method-families)。

**消息流转**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**网关 RPC**

- `gateway.rpc` - 具有 `received`、`response`、`handler` 和 `dispatch` 阶段的可信请求观察。响应结果为 `ok`、`error`、`unavailable` 或 `suppressed`；处理程序结果为 `returned` 或 `threw`；调度结果为 `returned`、`threw`、`rejected` 或 `cancelled`。 Dispatch 在结算时记录其响应状态（`none`、`sent`、`unavailable` 或 `suppressed`）；稍后的回复仍然可以到达。持续时间和 queue/admission 语义在 [Gateway RPC 指标](/gateway/opentelemetry#gateway-rpc) 中描述。

**队列和会话**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.long_running` / `session.stalled` / `session.stuck`
- `run.attempt` / `run.progress`
- `run.execution_phase`（公共事件，与会话关联的嵌入式运行器启动里程碑）
- `diagnostic.heartbeat`（合计计数器：webhooks/queue/session）
- `gateway.event_loop.sample`（仅内部指标完成窗口：`intervalMs`、`delayMaxMs`；无读者身份）

**Harness 生命周期**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` - 代理harness的每次运行生命周期。包括 `harnessId`、可选 `pluginId`、provider/model/channel 和运行 ID。完成添加 `durationMs`、`outcome`、可选 `resultClassification`、`yieldDetected` 和 `itemLifecycle` 计数。错误添加 `phase` （`prepare`/`start`/`send`/`resolve`/`cleanup`）、`errorCategory` 和可选的 `cleanupFailed`。使用 `captureContent: true`，开始和完成的事件还带有有界的、经过编辑的转向提示和最终辅助文本，作为在跨度上导出的私有侦听器数据，而不是在公共有效负载上。

**Exec**

- `exec.process.completed` - 最终结果、持续时间、目标、模式、退出码，以及失败类型。命令文本和工作目录不包括在内。
- `exec.approval.followup_suppressed` - 过时的批准跟进在盘中反弹后下降。包括 `approvalId`、`reason` （`session_rebound`）、`phase`（`direct_delivery` 或 `gateway_preflight`）和调度程序时间戳。不包括会话密钥、路由和命令文本。
