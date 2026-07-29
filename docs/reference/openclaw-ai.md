---
summary: "@openclaw/ai npm 包：可复用的模型传输、隔离运行时和宿主策略端口"
title: "@openclaw/ai package"
read_when:
  - 你想在另一个应用程序中复用 OpenClaw 的模型传输
  - 你正在更改 packages/ai 或 AI 传输宿主端口
  - 你正在查看 openclaw 发布到 npm 的内容，了解除根包之外还发布了什么
---

`@openclaw/ai` 是 OpenClaw 模型执行层的可发布库形式：与提供方无关的消息/工具/流契约、验证、诊断、
事件流、一个隔离的运行时注册表，以及面向八种内置 API 系列的懒加载适配器（Anthropic Messages、OpenAI Completions、OpenAI
Responses、Azure OpenAI Responses、ChatGPT/Codex Responses、Google Generative
AI、Google Vertex、Mistral Conversations）。

它会随根 `openclaw` 包在每次发布时一同发布，并固定为相同版本。其精确锁定的直接依赖会在安装时解析；
该包不包含 npm 锁文件。安装 `openclaw` 会自动安装匹配的 `@openclaw/ai`，库使用者也可以直接依赖它，而无需任何 OpenClaw 应用代码。

## 快速开始

```js
import { createLlmRuntime } from "@openclaw/ai";
import { registerBuiltInApiProviders } from "@openclaw/ai/providers";

const runtime = createLlmRuntime();
registerBuiltInApiProviders(runtime.registry);

const stream = runtime.streamSimple(model, { messages }, { apiKey });
for await (const event of stream) {
  if (event.type === "text_delta") process.stdout.write(event.delta);
}
const result = await stream.result();
```

可运行版本位于仓库中的 `examples/ai-chat`。

## 设计契约

- **默认按实例作用域。** 导入该包不会在全局注册任何内容。`createApiRegistry()` / `createLlmRuntime()` 返回隔离的实例；`registerBuiltInApiProviders(registry)` 会让某个 registry 使用内置传输层。Provider SDK 模块会在首次使用时按需懒加载。
- **宿主策略是注入的，不是打包进来的。** 请求 fetch 保护（例如 SSRF 策略）、工具结果回放文本的密钥脱敏、OpenAI 严格工具默认值，以及诊断日志记录，都是通过 `configureAiTransportHost` 配置的 `AiTransportHost` 端口。库的默认实现是无操作的；OpenClaw 会在其流式外观层中安装真实实现。
- **只有一个事件流身份。** `@openclaw/ai/event-stream` 是由 OpenClaw core、agent-core 和外部消费者共享的规范 `EventStream` 构造函数。
- **`internal/*` 子路径不属于 API。** 它们仅供 OpenClaw 应用自身使用，不提供任何语义化版本保证。
- Provider id、凭据、模型目录、重试和故障转移仍然属于应用层职责。OpenClaw 在该包之上封装这些能力；库的使用者直接提供一个 `Model` 对象和选项。

## Subpath Exports

| Subpath           | Contents                                                                         |
| ----------------- | -------------------------------------------------------------------------------- |
| `.`              | contracts, `createApiRegistry`, `createLlmRuntime`, `configureAiTransportHost`     |
| `./providers`    | `registerBuiltInApiProviders`, `resetApiProviders`                            |
| `./types`        | model/message/tool/stream types                                                          |
| `./validation`   | tool parameter validation                                                                   |
| `./diagnostics`  | diagnostics contracts                                                                      |
| `./event-stream` | shared `EventStream` implementation                                                     |
| `./internal/*`   | used internally by OpenClaw, semantic version compatibility is not guaranteed                                      |
