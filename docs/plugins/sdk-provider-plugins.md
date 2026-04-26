---
summary: "构建 OpenClaw 的模型提供商插件的分步指南"
title: "构建 Provider 插件"
sidebarTitle: "Provider 插件"
read_when:
  - 你正在构建一个新的模型 Provider 插件
  - 你想添加一个 OpenAI 兼容的代理或自定义 LLM 到 OpenClaw
  - 你需要理解 Provider 认证、Catalog 和运行时钩子
---

本指南将带你构建一个为 OpenClaw 添加模型提供商
（LLM）的 provider 插件。到最后，你将拥有一个带有模型 catalog、
API 密钥认证和动态模型解析的 provider。

<Info>
  如果你之前没有构建过任何 OpenClaw 插件，请先阅读
  [入门指南](/plugins/building-plugins) 以了解基本的包
  结构和清单设置。
</Info>

<Tip>
  Provider 插件将模型添加到 OpenClaw 的正常推理循环中。如果模型
  必须通过拥有线程、压缩或工具事件的本机代理守护进程运行，请将 Provider 与 [agent harness](/plugins/sdk-agent-harness)
  配对，而不是将守护进程协议细节放入核心。
</Tip>

## 逐步指南

<Steps>
  <Step title="Package and manifest">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-ai",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "providers": ["acme-ai"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-ai",
      "name": "Acme AI",
      "description": "Acme AI 模型提供商",
      "providers": ["acme-ai"],
      "modelSupport": {
        "modelPrefixes": ["acme-"]
      },
      "providerAuthEnvVars": {
        "acme-ai": ["ACME_AI_API_KEY"]
      },
      "providerAuthAliases": {
        "acme-ai-coding": "acme-ai"
      },
      "providerAuthChoices": [
        {
          "provider": "acme-ai",
          "method": "api-key",
          "choiceId": "acme-ai-api-key",
          "choiceLabel": "Acme AI API 密钥",
          "groupId": "acme-ai",
          "groupLabel": "Acme AI",
          "cliFlag": "--acme-ai-api-key",
          "cliOption": "--acme-ai-api-key <key>",
          "cliDescription": "Acme AI API 密钥"
        }
      ],
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    清单声明了 `providerAuthEnvVars`，以便 OpenClaw 可以在不加载插件运行时的情况下检测凭据。当 Provider 变体应重用另一个 Provider ID 的认证时，添加 `providerAuthAliases`。`modelSupport`
    是可选的，它允许 OpenClaw 在运行时钩子存在之前从简写模型 ID（如 `acme-large`）自动加载你的 Provider 插件。如果你在 ClawHub 上发布
    Provider，`package.json` 中需要这些 `openclaw.compat` 和 `openclaw.build` 字段。

  </Step>

  <Step title="注册 Provider">
    一个最小的 Provider 需要 `id`、`label`、`auth` 和 `catalog`：

    ```typescript index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth";

    export default definePluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      description: "Acme AI 模型提供商",
      register(api) {
        api.registerProvider({
          id: "acme-ai",
          label: "Acme AI",
          docsPath: "/providers/acme-ai",
          envVars: ["ACME_AI_API_KEY"],

          auth: [
            createProviderApiKeyAuthMethod({
              providerId: "acme-ai",
              methodId: "api-key",
              label: "Acme AI API 密钥",
              hint: "来自你的 Acme AI 控制台的 API 密钥",
              optionKey: "acmeAiApiKey",
              flagName: "--acme-ai-api-key",
              envVar: "ACME_AI_API_KEY",
              promptMessage: "请输入你的 Acme AI API 密钥",
              defaultModel: "acme-ai/acme-large",
            }),
          ],

          catalog: {
            order: "simple",
            run: async (ctx) => {
              const apiKey =
                ctx.resolveProviderApiKey("acme-ai").apiKey;
              if (!apiKey) return null;
              return {
                provider: {
                  baseUrl: "https://api.acme-ai.com/v1",
                  apiKey,
                  api: "openai-completions",
                  models: [
                    {
                      id: "acme-large",
                      name: "Acme Large",
                      reasoning: true,
                      input: ["text", "image"],
                      cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
                      contextWindow: 200000,
                      maxTokens: 32768,
                    },
                    {
                      id: "acme-small",
                      name: "Acme Small",
                      reasoning: false,
                      input: ["text"],
                      cost: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
                      contextWindow: 128000,
                      maxTokens: 8192,
                    },
                  ],
                },
              };
            },
          },
        });
      },
    });
    ```

    那是一个可工作的 Provider。用户现在可以
    执行 `openclaw onboard --acme-ai-api-key <key>` 并选择
    `acme-ai/acme-large` 作为他们的模型。

    如果上游 Provider 使用的控制令牌与 OpenClaw 不同，请添加一个小的双向文本转换，而不是替换流路径：

    ```typescript
    api.registerTextTransforms({
      input: [
        { from: /red basket/g, to: "blue basket" },
        { from: /paper ticket/g, to: "digital ticket" },
        { from: /left shelf/g, to: "right shelf" },
      ],
      output: [
        { from: /blue basket/g, to: "red basket" },
        { from: /digital ticket/g, to: "paper ticket" },
        { from: /right shelf/g, to: "left shelf" },
      ],
    });
    ```

    `input` 在传输前重写最终的系统提示和文本消息内容。`output` 在 OpenClaw 解析其自己的控制标记或渠道交付之前重写助手文本增量和最终文本。

    对于只注册一个带有 API 密钥认证且单个 Catalog 支持运行时的文本 Provider 的捆绑 Provider，推荐使用更窄的
    `defineSingleProviderPluginEntry(...)` 辅助函数：

    ```typescript
    import { defineSingleProviderPluginEntry } from "openclaw/plugin-sdk/provider-entry";

    export default defineSingleProviderPluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      description: "Acme AI 模型提供商",
      provider: {
        label: "Acme AI",
        docsPath: "/providers/acme-ai",
        auth: [
          {
            methodId: "api-key",
            label: "Acme AI API 密钥",
            hint: "来自你的 Acme AI 控制台的 API 密钥",
            optionKey: "acmeAiApiKey",
            flagName: "--acme-ai-api-key",
            envVar: "ACME_AI_API_KEY",
            promptMessage: "请输入你的 Acme AI API 密钥",
            defaultModel: "acme-ai/acme-large",
          },
        ],
        catalog: {
          buildProvider: () => ({
            api: "openai-completions",
            baseUrl: "https://api.acme-ai.com/v1",
            models: [{ id: "acme-large", name: "Acme Large" }],
          }),
          buildStaticProvider: () => ({
            api: "openai-completions",
            baseUrl: "https://api.acme-ai.com/v1",
            models: [{ id: "acme-large", name: "Acme Large" }],
          }),
        },
      },
    });
    ```

    `buildProvider` 是当 OpenClaw 可以解析真实
    provider 认证时使用的实时 catalog 路径。它可以执行 provider 特定的发现。只有当认证
    已配置且可以安全展示的离线行才使用 `buildStaticProvider`；它不能依赖凭据或发起网络请求。
    OpenClaw 的 `models list --all` 当前只会为捆绑 provider 插件执行静态 catalog，
    且配置为空、环境为空，并且没有
    agent/workspace 路径。

    如果你的认证流程还需要在 onboarding 期间补丁 `models.providers.*`、别名和 agent 默认模型，请使用
    `openclaw/plugin-sdk/provider-onboard` 中的预设辅助函数。最窄的辅助函数是
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

    当 Provider 的原生端点在正常的 `openai-completions` 传输上支持流式用量块时，推荐使用 `openclaw/plugin-sdk/provider-catalog-shared` 中的共享 Catalog 辅助函数，而不是硬编码 Provider ID 检查。`supportsNativeStreamingUsageCompat(...)` 和 `applyProviderNativeStreamingUsageCompat(...)` 从端点能力映射中检测支持情况，因此即使插件使用自定义 Provider ID，原生的 Moonshot/DashScope 风格端点仍然可以选择加入。

  </Step>

  <Step title="添加动态模型解析">
    如果你的 Provider 接受任意模型 ID（如代理或路由器），
    添加 `resolveDynamicModel`：

    ```typescript
    api.registerProvider({
      // ... 来自上方的 id, label, auth, catalog

      resolveDynamicModel: (ctx) => ({
        id: ctx.modelId,
        name: ctx.modelId,
        provider: "acme-ai",
        api: "openai-completions",
        baseUrl: "https://api.acme-ai.com/v1",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 8192,
      }),
    });
    ```

    如果解析需要网络调用，使用 `prepareDynamicModel` 进行异步
    预热 —— `resolveDynamicModel` 将在其完成后再次运行。

  </Step>

  <Step title="添加运行时钩子（按需）">
    大多数 Provider 只需要 `catalog` + `resolveDynamicModel`。随着你的
    Provider 需要，逐步添加钩子。

    共享的辅助构建器现在涵盖了最常见的 replay/tool-compat 系列，因此插件通常不需要逐个手动连接每个钩子：

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

    当前可用的 Replay 系列：

    | Family | 它接入的内容 | 捆绑示例 |
    | --- | --- | --- |
    | `openai-compatible` | 适用于 OpenAI 兼容传输的共享 OpenAI 风格 replay 策略，包括工具调用 ID 清理、assistant-first 顺序修复，以及在传输需要时进行通用 Gemini-turn 验证 | `moonshot`, `ollama`, `xai`, `zai` |
    | `anthropic-by-model` | 按 `modelId` 选择的 Claude 感知 replay 策略，因此 Anthropic-message 传输只有在解析出的模型确实是 Claude id 时才会进行 Claude 特定的 thinking-block 清理 | `amazon-bedrock`, `anthropic-vertex` |
    | `google-gemini` | 原生 Gemini replay 策略，加上启动 replay 清理和标记推理输出模式 | `google`, `google-gemini-cli` |
    | `passthrough-gemini` | 通过 OpenAI 兼容代理传输运行的 Gemini 模型的 Gemini thought-signature 清理；不启用原生 Gemini replay 验证或启动重写 | `openrouter`, `kilocode`, `opencode`, `opencode-go` |
    | `hybrid-anthropic-openai` | 适用于在一个插件中混合 Anthropic-message 和 OpenAI 兼容模型表面的 Provider 的混合策略；可选的仅 Claude thinking-block 丢弃仍然只作用于 Anthropic 一侧 | `minimax` |

    当前可用的 Stream 系列：

    | Family | 它接入的内容 | 捆绑示例 |
    | --- | --- | --- |
    | `google-thinking` | 共享流路径上的 Gemini thinking 负载规范化 | `google`, `google-gemini-cli` |
    | `kilocode-thinking` | 共享代理流路径上的 Kilo 推理包装器，支持 `kilo/auto` 和不支持的代理推理 id 跳过注入的 thinking | `kilocode` |
    | `moonshot-thinking` | 来自配置 + `/think` 级别的 Moonshot 二进制原生 thinking 负载映射 | `moonshot` |
    | `minimax-fast-mode` | 共享流路径上的 MiniMax fast-mode 模型重写 | `minimax`, `minimax-portal` |
    | `openai-responses-defaults` | 共享原生 OpenAI/Codex Responses 包装器：归因头、`/fast`/`serviceTier`、文本详细度、原生 Codex web search、reasoning-compat 负载整形，以及 Responses 上下文管理 | `openai`, `openai-codex` |
    | `openrouter-thinking` | 代理路由的 OpenRouter reasoning 包装器，对不支持的模型/`auto` 跳过进行集中处理 | `openrouter` |
    | `tool-stream-default-on` | 面向 Z.AI 等希望默认启用工具流、除非显式禁用的提供商的默认开启 `tool_stream` 包装器 | `zai` |

    <Accordion title="驱动 family 构建器的 SDK 接缝">
      每个 family 构建器都由同一包导出的更底层公共辅助函数组成；当 Provider 需要偏离常规模式时，你可以直接使用它们：

      - `openclaw/plugin-sdk/provider-model-shared` — `ProviderReplayFamily`、`buildProviderReplayFamilyHooks(...)`，以及原始 replay 构建器（`buildOpenAICompatibleReplayPolicy`、`buildAnthropicReplayPolicyForModel`、`buildGoogleGeminiReplayPolicy`、`buildHybridAnthropicOrOpenAIReplayPolicy`）。还导出 Gemini replay 辅助函数（`sanitizeGoogleGeminiReplayHistory`、`resolveTaggedReasoningOutputMode`）以及端点/模型辅助函数（`resolveProviderEndpoint`、`normalizeProviderId`、`normalizeGooglePreviewModelId`、`normalizeNativeXaiModelId`）。
      - `openclaw/plugin-sdk/provider-stream` — `ProviderStreamFamily`、`buildProviderStreamFamilyHooks(...)`、`composeProviderStreamWrappers(...)`，以及共享的 OpenAI/Codex 包装器（`createOpenAIAttributionHeadersWrapper`、`createOpenAIFastModeWrapper`、`createOpenAIServiceTierWrapper`、`createOpenAIResponsesContextManagementWrapper`、`createCodexNativeWebSearchWrapper`）和共享的代理/provider 包装器（`createOpenRouterWrapper`、`createToolStreamWrapper`、`createMinimaxFastModeWrapper`）。
      - `openclaw/plugin-sdk/provider-tools` — `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks("gemini")`、底层 Gemini schema 辅助函数（`normalizeGeminiToolSchemas`、`inspectGeminiToolSchemas`），以及 xAI 兼容辅助函数（`resolveXaiModelCompatPatch()`、`applyXaiModelCompat(model)`）。捆绑的 xAI 插件使用 `normalizeResolvedModel` + `contributeResolvedModelCompat` 来使 xAI 规则由 provider 自身拥有。

      一些 stream 辅助函数会有意保持为 provider 本地。`@openclaw/anthropic-provider` 将 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、`resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 以及更底层的 Anthropic 包装器构建器保留在自己的公共 `api.ts` / `contract-api.ts` 接口边界中，因为它们编码了 Claude OAuth beta 处理和 `context1m` 门控。xAI 插件同样将原生 xAI Responses 整形保留在自己的 `wrapStreamFn` 中（`/fast` 别名、默认 `tool_stream`、不支持的 strict-tool 清理、xAI 特定的 reasoning 负载移除）。

      相同的包根模式也支撑着 `@openclaw/openai-provider`（provider 构建器、默认模型辅助函数、realtime provider 构建器）以及 `@openclaw/openrouter-provider`（provider 构建器加 onboarding/config 辅助函数）。
    </Accordion>

    <Tabs>
      <Tab title="令牌交换">
        对于需要在每次推理调用前进行令牌交换的 Provider：

        ```typescript
        prepareRuntimeAuth: async (ctx) => {
          const exchanged = await exchangeToken(ctx.apiKey);
          return {
            apiKey: exchanged.token,
            baseUrl: exchanged.baseUrl,
            expiresAt: exchanged.expiresAt,
          };
        },
        ```
      </Tab>
      <Tab title="自定义请求头">
        对于需要自定义请求头或正文修改的 Provider：

        ```typescript
        // wrapStreamFn 返回一个源自 ctx.streamFn 的 StreamFn
        wrapStreamFn: (ctx) => {
          if (!ctx.streamFn) return undefined;
          const inner = ctx.streamFn;
          return async (params) => {
            params.headers = {
              ...params.headers,
              "X-Acme-Version": "2",
            };
            return inner(params);
          };
        },
        ```
      </Tab>
      <Tab title="原生传输身份">
        对于需要在通用 HTTP 或 WebSocket 传输上使用原生请求/会话头或元数据的 Provider：

        ```typescript
        resolveTransportTurnState: (ctx) => ({
          headers: {
            "x-request-id": ctx.turnId,
          },
          metadata: {
            session_id: ctx.sessionId ?? "",
            turn_id: ctx.turnId,
          },
        }),
        resolveWebSocketSessionPolicy: (ctx) => ({
          headers: {
            "x-session-id": ctx.sessionId ?? "",
          },
          degradeCooldownMs: 60_000,
        }),
        ```
      </Tab>
      <Tab title="用量与计费">
        对于暴露用量/计费数据的 Provider：

        ```typescript
        resolveUsageAuth: async (ctx) => {
          const auth = await ctx.resolveOAuthToken();
          return auth ? { token: auth.token } : null;
        },
        fetchUsageSnapshot: async (ctx) => {
          return await fetchAcmeUsage(ctx.token, ctx.timeoutMs);
        },
        ```
      </Tab>
    </Tabs>

    <Accordion title="所有可用的 Provider 钩子">
      OpenClaw 按此顺序调用钩子。大多数 Provider 只使用 2-3 个：

      | # | 钩子 | 何时使用 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型 catalog 或 base URL 默认值 |
      | 2 | `applyConfigDefaults` | 配置物化期间由 Provider 拥有的全局默认值 |
      | 3 | `normalizeModelId` | 查找前的旧版/预览模型 id 别名清理 |
      | 4 | `normalizeTransport` | 通用模型组装前的 Provider-family `api` / `baseUrl` 清理 |
      | 5 | `normalizeConfig` | 规范化 `models.providers.<id>` 配置 |
      | 6 | `applyNativeStreamingUsageCompat` | 配置 provider 的原生流式用量兼容重写 |
      | 7 | `resolveConfigApiKey` | Provider 拥有的 env-marker 认证解析 |
      | 8 | `resolveSyntheticAuth` | 本地/自托管或配置支持的 synthetic auth |
      | 9 | `shouldDeferSyntheticProfileAuth` | 将低优先级 synthetic 存储的 profile 占位符置于 env/config 认证之后 |
      | 10 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 11 | `prepareDynamicModel` | 在解析前进行异步元数据获取 |
      | 12 | `normalizeResolvedModel` | 运行器之前的传输重写 |
      | 13 | `contributeResolvedModelCompat` | 位于另一种兼容传输之后的厂商模型兼容标志 |
      | 14 | `capabilities` | 遗留静态 capability 包；仅用于兼容 |
      | 15 | `normalizeToolSchemas` | 注册前由 Provider 拥有的工具 schema 清理 |
      | 16 | `inspectToolSchemas` | Provider 拥有的工具 schema 诊断 |
      | 17 | `resolveReasoningOutputMode` | 标记式 vs 原生 reasoning-output 协议 |
      | 18 | `prepareExtraParams` | 默认请求参数 |
      | 19 | `createStreamFn` | 完全自定义的 StreamFn 传输 |
      | 20 | `wrapStreamFn` | 正常流路径上的自定义请求头/正文包装器 |
      | 21 | `resolveTransportTurnState` | 原生按轮次请求头/元数据 |
      | 22 | `resolveWebSocketSessionPolicy` | 原生 WS 会话头/冷却时间 |
      | 23 | `formatApiKey` | 自定义运行时令牌形状 |
      | 24 | `refreshOAuth` | 自定义 OAuth 刷新 |
      | 25 | `buildAuthDoctorHint` | 认证修复指导 |
      | 26 | `matchesContextOverflowError` | Provider 拥有的溢出检测 |
      | 27 | `classifyFailoverReason` | Provider 拥有的速率限制/过载分类 |
      | 28 | `isCacheTtlEligible` | 提示缓存 TTL 门控 |
      | 29 | `buildMissingAuthMessage` | 自定义缺失认证提示 |
      | 30 | `suppressBuiltInModel` | 隐藏过时的上游行 |
      | 31 | `augmentModelCatalog` | 合成前向兼容行 |
      | 32 | `resolveThinkingProfile` | 特定模型的 `/think` 选项集 |
      | 33 | `isBinaryThinking` | 二进制 thinking 开/关兼容性 |
      | 34 | `supportsXHighThinking` | `xhigh` reasoning 支持兼容性 |
      | 35 | `resolveDefaultThinkingLevel` | 默认 `/think` 策略兼容性 |
      | 36 | `isModernModelRef` | 实时/烟测模型匹配 |
      | 37 | `prepareRuntimeAuth` | 推理前的令牌交换 |
      | 38 | `resolveUsageAuth` | 自定义用量凭据解析 |
      | 39 | `fetchUsageSnapshot` | 自定义用量端点 |
      | 40 | `createEmbeddingProvider` | 用于 memory/search 的 Provider 拥有的 embedding 适配器 |
      | 41 | `buildReplayPolicy` | 自定义 transcript replay/compaction 策略 |
      | 42 | `sanitizeReplayHistory` | 通用清理后的 Provider 特定 replay 重写 |
      | 43 | `validateReplayTurns` | 嵌入式运行器之前的严格 replay-turn 验证 |
      | 44 | `onModelSelected` | 选择后回调（例如遥测） |

      运行时回退说明：

      - `normalizeConfig` 会先检查匹配到的 provider，然后检查其他具有钩子能力的 provider 插件，直到某个插件实际修改了配置为止。如果没有 provider 钩子重写受支持的 Google-family 配置项，捆绑的 Google 配置规范化器仍会应用。
      - `resolveConfigApiKey` 会在暴露时使用 provider 钩子。捆绑的 `amazon-bedrock` 路径在这里也内置了 AWS env-marker 解析器，尽管 Bedrock 运行时认证本身仍使用 AWS SDK 默认链。
      - `resolveSystemPromptContribution` 允许 provider 为某个模型族注入可缓存感知的系统提示指导。当行为属于某个 provider/model family 并且应保留稳定/动态缓存拆分时，优先使用它而不是 `before_prompt_build`。

      有关详细说明和真实世界示例，请参见 [内部机制：Provider 运行时钩子](/plugins/architecture-internals#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="添加额外能力（可选）">
    Provider 插件可以在文本推理之外，注册语音、实时转录、实时
    语音、媒体理解、图像生成、视频生成、网页抓取和网页搜索。
    OpenClaw 将其归类为
    **hybrid-capability** 插件——这是公司插件的推荐模式
    （每个厂商一个插件）。参见
    [内部机制：能力所有权](/plugins/architecture#capability-ownership-model)。

    在 `register(api)` 中，与你现有的
    `api.registerProvider(...)` 调用并列注册每种能力。只选择你需要的选项卡：

    <Tabs>
      <Tab title="Speech (TTS)">
        ```typescript
        import {
          assertOkOrThrowProviderError,
          postJsonRequest,
        } from "openclaw/plugin-sdk/provider-http";

        api.registerSpeechProvider({
          id: "acme-ai",
          label: "Acme Speech",
          isConfigured: ({ config }) => Boolean(config.messages?.tts),
          synthesize: async (req) => {
            const { response, release } = await postJsonRequest({
              url: "https://api.example.com/v1/speech",
              headers: new Headers({ "Content-Type": "application/json" }),
              body: { text: req.text },
              timeoutMs: req.timeoutMs,
              fetchFn: fetch,
              auditContext: "acme speech",
            });
            try {
              await assertOkOrThrowProviderError(response, "Acme Speech API error");
              return {
                audioBuffer: Buffer.from(await response.arrayBuffer()),
                outputFormat: "mp3",
                fileExtension: ".mp3",
                voiceCompatible: false,
              };
            } finally {
              await release();
            }
          },
        });
        ```

        对 provider HTTP 失败使用 `assertOkOrThrowProviderError(...)`，这样
        插件可以共享受限的错误正文读取、JSON 错误解析和
        request-id 后缀。
      </Tab>
      <Tab title="Realtime transcription">
        优先使用 `createRealtimeTranscriptionWebSocketSession(...)`——共享
        辅助函数会处理代理捕获、重连退避、关闭刷新、ready
        握手、音频排队和关闭事件诊断。你的插件
        只需映射上游事件。

        ```typescript
        api.registerRealtimeTranscriptionProvider({
          id: "acme-ai",
          label: "Acme Realtime Transcription",
          isConfigured: () => true,
          createSession: (req) => {
            const apiKey = String(req.providerConfig.apiKey ?? "");
            return createRealtimeTranscriptionWebSocketSession({
              providerId: "acme-ai",
              callbacks: req,
              url: "wss://api.example.com/v1/realtime-transcription",
              headers: { Authorization: `Bearer ${apiKey}` },
              onMessage: (event, transport) => {
                if (event.type === "session.created") {
                  transport.sendJson({ type: "session.update" });
                  transport.markReady();
                  return;
                }
                if (event.type === "transcript.final") {
                  req.onTranscript?.(event.text);
                }
              },
              sendAudio: (audio, transport) => {
                transport.sendJson({
                  type: "audio.append",
                  audio: audio.toString("base64"),
                });
              },
              onClose: (transport) => {
                transport.sendJson({ type: "audio.end" });
              },
            });
          },
        });
        ```

        通过 multipart 音频 POST 的批量 STT provider 应使用
        `openclaw/plugin-sdk/provider-http` 中的
        `buildAudioTranscriptionFormData(...)`。该辅助函数会规范化上传
        文件名，包括需要 M4A 风格文件名以兼容转录 API 的 AAC 上传。
      </Tab>
      <Tab title="Realtime voice">
        ```typescript
        api.registerRealtimeVoiceProvider({
          id: "acme-ai",
          label: "Acme Realtime Voice",
          isConfigured: ({ providerConfig }) => Boolean(providerConfig.apiKey),
          createBridge: (req) => ({
            connect: async () => {},
            sendAudio: () => {},
            setMediaTimestamp: () => {},
            submitToolResult: () => {},
            acknowledgeMark: () => {},
            close: () => {},
            isConnected: () => true,
          }),
        });
        ```
      </Tab>
      <Tab title="Media understanding">
        ```typescript
        api.registerMediaUnderstandingProvider({
          id: "acme-ai",
          capabilities: ["image", "audio"],
          describeImage: async (req) => ({ text: "一张……的照片" }),
          transcribeAudio: async (req) => ({ text: "转录文本……" }),
        });
        ```
      </Tab>
      <Tab title="Image and video generation">
        视频能力使用一种 **支持模式感知** 的形状：`generate`、
        `imageToVideo` 和 `videoToVideo`。像
        `maxInputImages` / `maxInputVideos` / `maxDurationSeconds` 这样的扁平聚合字段
        还不足以清晰地声明转换模式支持或禁用的模式。
        音乐生成遵循相同模式，并带有显式的 `generate` /
        `edit` 块。

        ```typescript
        api.registerImageGenerationProvider({
          id: "acme-ai",
          label: "Acme Images",
          generate: async (req) => ({ /* 图像结果 */ }),
        });

        api.registerVideoGenerationProvider({
          id: "acme-ai",
          label: "Acme Video",
          capabilities: {
            generate: { maxVideos: 1, maxDurationSeconds: 10, supportsResolution: true },
            imageToVideo: { enabled: true, maxVideos: 1, maxInputImages: 1, maxDurationSeconds: 5 },
            videoToVideo: { enabled: false },
          },
          generateVideo: async (req) => ({ videos: [] }),
        });
        ```
      </Tab>
      <Tab title="Web fetch and search">
        ```typescript
        api.registerWebFetchProvider({
          id: "acme-ai-fetch",
          label: "Acme Fetch",
          hint: "通过 Acme 的渲染后端抓取页面。",
          envVars: ["ACME_FETCH_API_KEY"],
          placeholder: "acme-...",
          signupUrl: "https://acme.example.com/fetch",
          credentialPath: "plugins.entries.acme.config.webFetch.apiKey",
          getCredentialValue: (fetchConfig) => fetchConfig?.acme?.apiKey,
          setCredentialValue: (fetchConfigTarget, value) => {
            const acme = (fetchConfigTarget.acme ??= {});
            acme.apiKey = value;
          },
          createTool: () => ({
            description: "通过 Acme Fetch 抓取页面。",
            parameters: {},
            execute: async (args) => ({ content: [] }),
          }),
        });

        api.registerWebSearchProvider({
          id: "acme-ai-search",
          label: "Acme Search",
          search: async (req) => ({ content: [] }),
        });
        ```
      </Tab>
    </Tabs>

  </Step>

  <Step title="测试">
    ```typescript src/provider.test.ts
    import { describe, it, expect } from "vitest";
    // 从 index.ts 或专用文件导出你的 provider 配置对象
    import { acmeProvider } from "./provider.js";

    describe("acme-ai provider", () => {
      it("resolves dynamic models", () => {
        const model = acmeProvider.resolveDynamicModel!({
          modelId: "acme-beta-v3",
        } as any);
        expect(model.id).toBe("acme-beta-v3");
        expect(model.provider).toBe("acme-ai");
      });

      it("returns catalog when key is available", async () => {
        const result = await acmeProvider.catalog!.run({
          resolveProviderApiKey: () => ({ apiKey: "test-key" }),
        } as any);
        expect(result?.provider?.models).toHaveLength(2);
      });

      it("returns null catalog when no key", async () => {
        const result = await acmeProvider.catalog!.run({
          resolveProviderApiKey: () => ({ apiKey: undefined }),
        } as any);
        expect(result).toBeNull();
      });
    });
    ```

  </Step>
</Steps>

## 发布到 ClawHub

Provider 插件的发布方式与任何其他外部代码插件相同：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

不要在此使用遗留的仅 skill 发布别名；插件包应使用
`clawhub package publish`。

## 文件结构

```
<bundled-plugin-root>/acme-ai/
├── package.json              # openclaw.providers 元数据
├── openclaw.plugin.json      # 包含提供者认证元数据的清单
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # 测试
    └── usage.ts              # 使用端点（可选）
```

## 目录顺序参考

`catalog.order` 控制你的目录相对于内置提供者合并的时机：

| 顺序      | 时机          | 用例                                            |
| --------- | ------------- | ----------------------------------------------- |
| `simple`  | 第一遍        | 普通 API 密钥提供者                             |
| `profile` | 在 simple 之后 | 基于认证配置文件门禁的提供者                    |
| `paired`  | 在 profile 之后 | 合成多个相关条目                                |
| `late`    | 最后一遍      | 覆盖现有提供者（冲突时胜出）                    |

## 后续步骤

- [Channel Plugins](/plugins/sdk-channel-plugins) — 如果你的插件还提供通道
- [SDK Runtime](/plugins/sdk-runtime) — `api.runtime` 帮助函数（TTS、搜索、subagent）
- [SDK Overview](/plugins/sdk-overview) — 完整的子路径导入参考
- [Plugin Internals](/plugins/architecture-internals#provider-runtime-hooks) — hook 详情和捆绑示例

## 相关内容

- [Plugin SDK setup](/plugins/sdk-setup)
- [Building plugins](/plugins/building-plugins)
- [Building channel plugins](/plugins/sdk-channel-plugins)
