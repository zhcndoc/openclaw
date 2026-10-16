---
summary: "通过网关 WebSocket 继续上游 W3C 跟踪，并控制哪些内容离开进程"
title: "隐私和跟踪上下文"
sidebarTitle: "隐私和跟踪上下文"
read_when:
  - "您希望每个数据集项有一个 OpenTelemetry 跟踪来覆盖匹配的 OpenClaw 执行"
  - "您需要准确了解导出的提示、响应或工具内容"
  - "您正在根据保留策略批准 `captureContent`"
---

## <a id="continue-an-upstream-websocket-trace"></a> 继续上游 WebSocket 追踪

经过身份验证的 Gateway WebSocket 客户端可以为每个请求帧附加 W3C `traceparent`：

```json
{
  "type": "req",
  "id": "eval-item-42",
  "method": "agent",
  "params": {},
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
}
```

Gateway 会创建一个子请求上下文，保留上游追踪 ID 和采样标志。在请求内部创建的 Agent、harness、模型调用、提供商、工具执行和 exec span 都会保留在该追踪中，包括在其父运行已结束后记录的 span。这样，本地实验运行器就可以为每个数据集项目创建一条 Langfuse/OpenTelemetry 追踪，并关联相应的 OpenClaw 执行。

追踪上下文的作用域是请求，而不是连接。在长连接 WebSocket 上，应为每个 RPC 独立生成或注入适当的 `traceparent`。即使并发请求的工作相互交错，它们仍会彼此隔离。

该字段仅在现有网关身份验证握手后接受，不会影响身份验证或方法授权。初始 `connect` 帧上的 `traceparent` 将被忽略。 128 个字符字段限制内的缺失值或语法格式错误的值会默默地回退到新的请求跟踪；较长的值会使请求帧无效。网关 WebSocket 协议不接受 `tracestate` 和 `baggage`。

## <a id="privacy-and-content-capture"></a> 隐私与内容捕获

默认导出的原始 model/tool 内容为 **，而不是**。 Span 带有有界标识符（通道、提供者、模型、错误类别、仅哈希请求 ID、工具源、工具所有者、技能 name/source），并且从不包含提示文本、响应文本、工具输入、工具输出、技能文件路径或会话密钥。在低基数属性上，看起来像作用域代理会话密钥的值（例如以 `agent:` 开头）将替换为 `unknown`。 OTLP 日志记录默认保留严重性、记录器、可用代码位置、可信跟踪上下文和清理属性；仅当`diagnostics.otel.captureContent`为`true`时才会导出原始日志消息体。子系统 `info` 记录省略代码位置以避免捕获每个例程消息的堆栈。通话指标仅导出有界事件元数据（模式、传输、提供商、事件类型） - 无文字记录、音频负载、会话 ID、转弯 ID、呼叫 ID、房间 ID 或切换令牌。

当 `diagnostics-otel` 跟踪处于活动状态时，出站模型请求可能包括来自实际导出者拥有的模型调用范围的 W3C `traceparent` 标头。诊断跟踪 ID 和跨度 ID 仅将事件与该跨度相关联；它们不用作出站 OTel 身份。如果导出器无法解析真实的跨度上下文，则 OpenClaw 会忽略标头，而不是命名未导出的父级。现有的调用者提供的 `traceparent` 标头将被删除或替换，因此插件或自定义提供程序选项无法欺骗跨服务跟踪祖先。

仅当你的收集器和保留策略已获批准，可处理提示、响应、工具及工具定义文本时，才将 `diagnostics.otel.captureContent` 设置为 `true`。此设置会启用经过限制和脱敏的输入消息、输出消息、工具输入、工具输出、工具定义以及 OTLP 日志正文的捕获。系统提示仍会被排除。提供方内部的 `thinking` 和 `redacted_thinking` 载荷也会被排除：兼容性属性仅保留经过脱敏的结构标记，而 GenAI 消息属性会省略这些部分。

相同的设置还会将有界的、经过编辑的转弯提示和模型的最终答案导出为 `openclaw.message.processed`、`openclaw.harness.run` 和 `openclaw.run` 跨度上的 `input.value` 和 `output.value`。已启用`captureContent`的运营商升级后将获得这些属性；请参阅 [ 升级说明 ](/gateway/opentelemetry/spans-and-events)。

完成的助理解说使用相同的设置。关闭内容捕获后，评论事件仅包含时间、顺序、harness和文本长度元数据。启用此功能后，每个事件可以通过现有的编辑输出消息属性包含最多 16,384 个可见注释字符。注释文本永远不会进入普通诊断日志或公共诊断事件。

捕获 `toolInputs`/`toolOutputs` 内容以用于内置代理运行时的工具执行（completed/error 跨度上的 `openclaw.content.tool_input` 和 `gen_ai.tool.call.arguments`；已完成的跨度上的 `openclaw.content.tool_output` 和 `gen_ai.tool.call.result`）。 `openclaw.content.*` 名称仍然是稳定的 OpenClaw 属性名称； `gen_ai.tool.call.*` 副本为 semconv 原生查看器镜像它们。外部harness工具调用（Codex、Claude CLI）发出不带内容负载的 `tool.execution.*` 跨度。捕获的内容在受信任的、仅限侦听器的通道上传输，并且永远不会放置在公共诊断事件总线上。
