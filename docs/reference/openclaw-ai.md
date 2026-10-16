---
summary: "@openclaw/ai npm 包：可复用的模型传输、隔离运行时和宿主策略端口"
title: "@openclaw/ai封装"
read_when:
  - "你想在另一个应用程序中复用 OpenClaw 的模型传输"
  - "你正在更改 packages/ai 或 AI 传输宿主端口"
  - "你正在查看 openclaw 发布到 npm 的内容，了解除根包之外还发布了什么"
---

`@openclaw/ai` 是 OpenClaw 模型执行层的可发布库形式：提供者中立的 message/tool/stream 合约、验证、诊断、事件流、隔离的运行时注册表以及用于八个内置 API 系列（Anthropic 消息、OpenAI）的惰性适配器完成、OpenAI 响应、Azure OpenAI 响应、ChatGPT/Codex 响应、Google 生成 AI、Google 顶点、Mistral 对话）。

它会随根 `openclaw` 包在每次发布时一同发布，并固定为相同版本。其精确锁定的直接依赖会在安装时解析； 该包不包含 npm 锁文件。安装 `openclaw` 会自动安装匹配的 `@openclaw/ai`，库使用者也可以直接依赖它，而无需任何 OpenClaw 应用代码。

## <a id="quick-start"></a> 快速开始

```js
import { createLlmRuntime } from "@openclaw/ai";
import { registerBuiltInApiProviders } from "@openclaw/ai/providers";

const runtime = createLlmRuntime();
registerBuiltInApiProviders(runtime.registry);

// `model` (a model descriptor), `messages`, and `apiKey` are supplied by you;
// see `examples/ai-chat` for concrete values.
const stream = runtime.streamSimple(model, { messages }, { apiKey });
for await (const event of stream) {
  if (event.type === "text_delta") process.stdout.write(event.delta);
}
const result = await stream.result();
```

可运行版本位于仓库中的 `examples/ai-chat`。

## <a id="design-contract"></a> 设计契约

- **默认按实例作用域。** 导入该包不会在全局注册任何内容。`createApiRegistry()` / `createLlmRuntime()` 返回隔离的实例；`registerBuiltInApiProviders(registry)` 会让某个 registry 使用内置传输层。Provider SDK 模块会在首次使用时按需懒加载。
- **主机策略是注入的，而不是捆绑的。**请求获取保护（例如SSRF策略）、诊断的凭证屏蔽、OpenAI严格工具默认值和诊断日志记录是使用配置的`AiTransportHost`端口`configureAiTransportHost`。库默认是惰性的； OpenClaw 在其流外观中安装其实际实现。
- **一个事件流身份。** `@openclaw/ai/event-stream` 是由 OpenClaw 核心、代理核心和外部消费者共享的共享 `EventStream` 构造函数。
- **`internal/*` 子路径不属于 API。** 它们仅供 OpenClaw 应用自身使用，不提供任何语义化版本保证。
- Provider id、凭据、模型目录、重试和故障转移仍然属于应用层职责。OpenClaw 在该包之上封装这些能力；库的使用者直接提供一个 `Model` 对象和选项。

## <a id="subpath-exports"></a> 子路径导出

| 子路径          | 内容                                                                       |
| ---------------- | ------------------------------------------------------------------------------ |
| `.`              | 合约，`createApiRegistry`、`createLlmRuntime`、`configureAiTransportHost` |
| `./providers`    | `registerBuiltInApiProviders`, `resetApiProviders`                             |
| `./types`        | Model/message/tool/stream型                                                |
| `./validation`   | 工具参数验证                                                       |
| `./diagnostics`  | 诊断合同、传输日志和净化的 URL 格式         |
| `./event-stream` | 共享 `EventStream` 实施                                            |
| `./internal/*`   | OpenClaw-内部，无 semver 保证                                         |

当您只需要日志记录助手时，请使用 `@openclaw/ai/diagnostics` 来表示 `emitModelTransportDebug`、`formatModelTransportDebugUrl` 和 `formatModelTransportDebugBaseUrl`。该入口点将提供者传输实现排除在导入图中。
