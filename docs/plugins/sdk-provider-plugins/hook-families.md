---
summary: "用于提供商插件的共享重播、流和工具兼容系列构建器"
read_when:
  - "您希望一个建筑商连接整个提供商家庭"
  - "您需要当前的重播和流族表"
  - "您将脱离常见模式并需要底层 SDK 接口"
title: "提供商挂钩系列"
sidebarTitle: "钩子家族"
---

家庭构建者在一次调用中为提供商连接常见的重播、流和工具兼容挂钩。 [构建提供商插件](/plugins/sdk-provider-plugins)指南的一部分。

## <a id="family-builders"></a> 家庭建设者

共享帮助器构建器现在涵盖了最常见的 replay/tool-compat 系列，因此插件通常不需要一一手动连接每个钩子：

```typescript
import { buildProviderReplayFamilyHooks } from "openclaw/plugin-sdk/provider-model-shared";
import { buildProviderStreamFamilyHooks } from "openclaw/plugin-sdk/provider-stream";
import { buildProviderToolCompatFamilyHooks } from "openclaw/plugin-sdk/provider-tools";

const GOOGLE_FAMILY_HOOKS = {
  ...buildProviderReplayFamilyHooks({ family: "google-gemini" }),
  ...buildProviderStreamFamilyHooks("google-thinking"),
  ...buildProviderToolCompatFamilyHooks("gemini"),
};

api.registerProvider({
  id: "acme-gemini-compatible",
  // ...
  ...GOOGLE_FAMILY_HOOKS,
});
```

当前可用的 replay 家族：

| 家族                      | 作用                                                                                                                                                                                                                                                                   | 打包示例                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `openai-compatible`         | 适用于 OpenAI- 兼容传输的共享 OpenAI- 风格重播策略，包括工具调用 ID 清理、助理优先排序修复以及传输需要的通用 Gemini-turn 验证                                                                             | `moonshot`, `ollama`, `xai`, `zai`                  |
| `anthropic-by-model`        | Claude-aware 重播策略由 `modelId` 选择，因此当解析的模型实际上是 Claude id 时，Anthropic- 消息传输仅获得 Claude- 特定思维块清理                                                                                                    | `amazon-bedrock`                                    |
| `native-anthropic-by-model` | 与 `anthropic-by-model` 相同的 Claude-by-model 策略，加上工具调用 ID 卫生和本机 Anthropic 工具使用 ID 保留，用于必须保留供应商本机 ID 的传输                                                                                                    | `anthropic-vertex`, `clawrouter`                    |
| `google-gemini`             | 原生 Gemini replay 策略以及引导 replay 清理。共享家族会让文本输出的 Gemini CLI 使用带标签的 reasoning；直接的 `google` 提供方则将 `resolveReasoningOutputMode` 覆盖为 `native`，因为 Gemini API 的思维内容以原生 thought parts 到达。 | `google`, `google-gemini-cli`                       |
| `passthrough-gemini`        | 通过 OpenAI- 兼容代理传输运行的 Gemini 模型的 Gemini 思想签名卫生；不启用本机 Gemini 重播验证或引导重写                                                                                                    | `openrouter`, `kilocode`, `opencode`, `opencode-go` |
| `hybrid-anthropic-openai`   | 针对在一个插件中混合 Anthropic-message 和 OpenAI- 兼容模型表面的提供商的混合策略；可选的 Claude- 仅思维块掉落保持在 Anthropic 一侧                                                                                         | `minimax`                                           |

当前可用的 stream 家族：

| 家族                      | 作用                                                                                                                                                                                       | 打包示例              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `google-thinking`           | 在共享 stream 路径上规范化 Gemini thinking 负载                                                                                                                                        | `google`, `google-gemini-cli` |
| `kilocode-thinking`         | 在共享代理 stream 路径上的 Kilo reasoning 包装器，其中 `kilo-auto/balanced` 和不受支持的代理 reasoning id 会跳过注入 thinking                                                       | `kilocode`                    |
| `moonshot-thinking`         | 根据配置和 `/think` level 映射 Moonshot 二进制原生 thinking 负载                                                                                                                           | `moonshot`                    |
| `minimax-fast-mode`         | 在共享 stream 路径上重写 MiniMax fast-mode 模型                                                                                                                                              | `minimax`, `minimax-portal`   |
| `openai-responses-defaults` | 共享本机 OpenAI/Codex 响应包装器：归因标头、`/fast`/`serviceTier`、文本详细程度、本机 Codex Web 搜索、推理兼容有效负载整形和响应上下文管理 | `openai`                      |
| `openrouter-thinking`       | 用于代理路由的 OpenRouter 推理包装器，集中处理不支持的 model/`auto` 跳过                                                                                                   | `openrouter`                  |
| `tool-stream-default-on`    | 面向 Z.AI 等希望默认启用工具流式传输的提供方的默认开启 `tool_stream` 包装器，除非显式禁用                                                                                           | `zai`                         |

<a id="sdk-seams-powering-the-family-builders" />

<Accordion id="sdk-interfaces-behind-the-family-builders" title="SDK 家族构建者背后的接口">
  每个家族构建器都由同一软件包导出的更底层公共辅助函数组合而成；当某个提供方需要脱离通用模式时， 你可以直接使用这些函数：

- `openclaw/plugin-sdk/provider-model-shared` - `ProviderReplayFamily`、`buildProviderReplayFamilyHooks(...)` 和原始重播构建器（`buildOpenAICompatibleReplayPolicy`、`buildAnthropicReplayPolicyForModel`、`buildGoogleGeminiReplayPolicy`、`buildHybridAnthropicOrOpenAIReplayPolicy`）。还导出 Gemini 重放帮助程序（`sanitizeGoogleGeminiReplayHistoryAsync`、`resolveTaggedReasoningOutputMode`）和 endpoint/model 帮助程序（`resolveProviderEndpoint`、`normalizeProviderId`、`normalizeGooglePreviewModelId`）。同步 Gemini 帮助程序仍然是已弃用的第三方兼容性适配器；请参阅 [provider 重播迁移](/plugins/sdk-migration/how-to-migrate#await-provider-replay-metadata)。
- `openclaw/plugin-sdk/provider-stream` - `ProviderStreamFamily`、`buildProviderStreamFamilyHooks(...)`、`composeProviderStreamWrappers(...)`，加上共享的 OpenAI/Codex 包装器（`createOpenAIAttributionHeadersWrapper`、`createOpenAIFastModeWrapper`、`createOpenAIServiceTierWrapper`、 `createOpenAIResponsesContextManagementWrapper`、`createCodexNativeWebSearchWrapper`）、DeepSeek V4 OpenAI- 兼容包装器 （`createDeepSeekV4OpenAICompatibleThinkingWrapper`）、Anthropic 考虑预填充清理的消息 （`createAnthropicThinkingPrefillPayloadWrapper`）、纯文本工具调用兼容（`createPlainTextToolCallCompatWrapper`），并共享 proxy/provider 包装器 （`createOpenRouterWrapper`、`createToolStreamWrapper`、`createMinimaxFastModeWrapper`）。
- `openclaw/plugin-sdk/provider-stream-shared` - 用于热提供程序路径的轻量级负载和事件包装器，包括 `applyCompletionsAnthropicCacheControl`（共享聊天完成缓存标记布局；本机 Anthropic 消息使用自己的策略）、`createOpenAICompatibleCompletionsThinkingOffWrapper`、`createPayloadPatchStreamWrapper`、`createPlainTextToolCallCompatWrapper`、 `normalizeOpenAICompatibleReasoningPayload(...)` 和 `setQwenChatTemplateThinking(...)`。
- Copilot 传输可以使用 `projectCopilotRequestFacts(messages, contentMode, hasImages?)` 从 `provider-stream-shared` 导出 `{ initiator, hasImages }`。使用 `"direct"` 进行标准化直接图像块，或使用 `"nested"` 进行嵌套提供者内容，包括用户携带的 `tool_result` 延续。显式 `hasImages` 重用调用者的计算视觉事实。运行时身份、标头大小写和调用者覆盖仍保留在插件中。
- `openclaw/plugin-sdk/provider-transport-runtime` - 原生 Google 接线助手：`projectGoogleMessages(...)`、`convertGoogleTools(...)`、`requiresGoogleToolCallId(...)` 和 `consumeGoogleGenerateContentStream(...)`。在投影前准备并规范转录路线。使用 `replay: "managed"` 并流式传输 `profile: "managed"` 来管理 SSE；直接 SDK 使用 `replay: "signed-parts"` 和默认流配置文件来保留各个签名部分。运输所有者保留身份验证、重试、HTTP 取消和可信视频准入；减速器发出事件和用法，并抛出失败供调用者完成。
- `openclaw/plugin-sdk/provider-tools` - `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks("deepseek" | "gemini" | "openai")` 以及底层提供方 schema 辅助函数。

对于 Gemini- 系列提供程序，保持推理输出模式与传输保持一致。直接 Google Gemini API 提供程序应使用 `native` 推理输出，以便 OpenClaw 消耗本机思维部分，而不添加 `<think>` / `<final>` 提示指令。解析最终 JSON/text 响应的纯文本 Gemini CLI- 样式后端可以保留共享的 `google-gemini` 标记合约。

`provider-stream-shared` 中的 `transformProviderStreamMessages(stream, transformMessage)` 将提供商拥有的突变应用于流式部分消息、终端消息和 `result()`。它保留流和事件对象、事件顺序、迭代器取消和错误转发；回调必须容忍消息字段缺失和重复访问。 `provider-transport-runtime` 中的 `buildAssistantMessage` 使用调用者提供的内容和用法构建本机流助手信封。 `stripTrailingAssistantPrefillMessages(payload)` 删除尾部助理预填充消息，同时保留终端工具调用。提供者保留自己的思维和路线谓词。

一些流助手故意保持提供商本地化。 `@openclaw/anthropic-provider` 将 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、`resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 和较低级别的 Anthropic 包装器构建器保留在其自己的公共 `api.ts` / `contract-api.ts` 接口中，因为它们进行编码Claude OAuth beta 处理和 `context1m` 门控。 xAI 插件同样将本机 xAI 响应整形保留在其自己的 `wrapStreamFn` 中（`/fast` 别名、默认 `tool_stream`、不支持的严格工具清理、xAI- 特定推理有效负载删除）。

相同的包根模式还支持 `@openclaw/openai-provider`（提供程序构建器、默认模型帮助程序、实时提供程序构建器）和 `@openclaw/openrouter-provider`（提供程序构建器加上 onboarding/config 帮助程序）。
</Accordion>
