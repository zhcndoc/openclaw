---
summary: "构建 OpenClaw 的模型提供方插件的分步指南"
title: "构建提供方插件"
sidebarTitle: "提供方插件"
read_when:
  - 你正在构建一个新的模型提供方插件
  - 你想为 OpenClaw 添加一个兼容 OpenAI 的代理或自定义 LLM
  - 你需要了解提供方认证、目录和运行时钩子
---

本指南将带你构建一个为 OpenClaw 添加模型提供方（LLM）的插件。到最后，你将拥有一个带有模型目录、API 密钥认证和动态模型解析能力的提供方。

<Info>
  如果你之前没有构建过任何 OpenClaw 插件，请先阅读
  [入门指南](/plugins/building-plugins)，了解基本的软件包
  结构和清单配置。
</Info>

<Tip>
  提供方插件会将模型添加到 OpenClaw 的常规推理循环中。如果模型
  必须通过一个原生代理守护进程运行，并由该守护进程负责线程、压缩或工具
  事件，那么应将该提供方与一个 [agent harness](/plugins/sdk-agent-harness)
  配对使用，而不是把守护进程协议细节放进核心中。
</Tip>

## 操作流程

<Steps>
  <Step title="Package 和 manifest">
    ### 第 1 步：Package 和 manifest

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
      "description": "Acme AI 模型提供方",
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

    清单中声明 `providerAuthEnvVars`，这样 OpenClaw 就可以在不加载你的插件运行时的情况下检测
    凭据。当某个提供方变体应复用另一个提供方 id 的认证时，请添加 `providerAuthAliases`。
    `modelSupport` 是可选项，它允许 OpenClaw 在运行时钩子出现之前，就通过诸如
    `acme-large` 这样的简写模型 id 自动加载你的提供方插件。如果你把该
    提供方发布到 ClawHub，则 `package.json` 中的这些 `openclaw.compat` 和 `openclaw.build` 字段
    是必需的。

  </Step>

  <Step title="注册提供方">
    一个最小的文本提供方需要 `id`、`label`、`auth` 和 `catalog`。
    `catalog` 是提供方拥有的运行时/配置钩子；它可以调用实时
    厂商 API，并返回 `models.providers` 条目。

    ```typescript index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth";

    export default definePluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      description: "Acme AI 模型提供方",
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
              hint: "来自 Acme AI 控制台的 API 密钥",
              optionKey: "acmeAiApiKey",
              flagName: "--acme-ai-api-key",
              envVar: "ACME_AI_API_KEY",
              promptMessage: "输入你的 Acme AI API 密钥",
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

        api.registerModelCatalogProvider({
          provider: "acme-ai",
          kinds: ["text"],
          liveCatalog: async (ctx) => {
            const apiKey = ctx.resolveProviderApiKey("acme-ai").apiKey;
            if (!apiKey) return null;
            return [
              {
                kind: "text",
                provider: "acme-ai",
                model: "acme-large",
                label: "Acme Large",
                source: "live",
              },
            ];
          },
        });
      },
    });
    ```

    `registerModelCatalogProvider` 是用于列表/帮助/选择器 UI 的较新的控制平面目录
    表面。将它用于文本、图像生成、视频生成和音乐生成条目。把厂商端点调用和
    响应映射保留在插件中；OpenClaw 负责共享的行形状、来源
    标签和帮助渲染。

    这就是一个可工作的提供方。用户现在可以
    `openclaw onboard --acme-ai-api-key <key>` 并选择
    `acme-ai/acme-large` 作为他们的模型。

    如果上游提供方使用的控制 token 与 OpenClaw 不同，不要替换流路径，而是添加一个
    小的双向文本转换：

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

    `input` 会在传输前重写最终的系统提示词和文本消息内容。`output` 会在 OpenClaw 解析
    自己的控制标记或通道投递之前，重写助手文本增量和最终文本。

    对于只注册一个文本提供方、使用 API 密钥认证并且只有一个基于目录的运行时的打包提供方，
    优先使用更窄的 `defineSingleProviderPluginEntry(...)` 辅助函数：

    ```typescript
    import { defineSingleProviderPluginEntry } from "openclaw/plugin-sdk/provider-entry";

    export default defineSingleProviderPluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      description: "Acme AI 模型提供方",
      provider: {
        label: "Acme AI",
        docsPath: "/providers/acme-ai",
        auth: [
          {
            methodId: "api-key",
            label: "Acme AI API 密钥",
            hint: "来自 Acme AI 控制台的 API 密钥",
            optionKey: "acmeAiApiKey",
            flagName: "--acme-ai-api-key",
            envVar: "ACME_AI_API_KEY",
            promptMessage: "输入你的 Acme AI API 密钥",
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

    `buildProvider` 是动态目录路径，在 OpenClaw 能解析真实提供方认证时使用。它可以执行
    提供方特定的发现逻辑。`buildStaticProvider` 仅用于离线行，这些内容在认证配置完成之前也应是安全可展示的；
    它不能依赖凭据，也不能发起网络请求。OpenClaw 的 `models list --all` 当前只会为打包的提供方插件执行静态目录，
    并且配置为空、环境变量为空，也没有 agent/workspace 路径。

    如果你的认证流程还需要在 onboarding 期间修补 `models.providers.*`、别名和 agent 默认模型，
    请使用 `openclaw/plugin-sdk/provider-onboard` 中的预设辅助函数。最小粒度的辅助函数有
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)` 和
    `createModelCatalogPresetAppliers(...)`。

    当某个提供方的原生端点在常规 `openai-completions` 传输上支持流式 usage 块时，
    应优先使用 `openclaw/plugin-sdk/provider-catalog-shared` 中共享的目录辅助函数，而不是硬编码
    提供方 id 判断。`supportsNativeStreamingUsageCompat(...)` 和
    `applyProviderNativeStreamingUsageCompat(...)` 会根据端点能力映射检测支持情况，因此即使插件使用了自定义提供方 id，
    原生 Moonshot/DashScope 风格端点也仍然可以接入。

  </Step>

  <Step title="添加动态模型解析">
    如果你的提供方接受任意模型 ID（例如代理或路由器），请添加
    `resolveDynamicModel`：

    ```typescript
    api.registerProvider({
      // ... 上面的 id、label、auth、catalog

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

    如果解析需要网络调用，请使用 `prepareDynamicModel` 进行异步
    预热 - 完成后 `resolveDynamicModel` 会再次运行。

  </Step>

  <Step title="添加运行时钩子（按需）">
    大多数提供方只需要 `catalog` + `resolveDynamicModel`。随着你的提供方需要，再逐步添加钩子。

    现在共享辅助构建器已经覆盖了最常见的 replay/tool-compat 家族，因此插件通常不需要逐个手工连接每个钩子：

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

    | Family | 作用 | 打包示例 |
    | --- | --- | --- |
    | `openai-compatible` | 面向 OpenAI 兼容传输的共享 OpenAI 风格 replay 策略，包括 tool-call-id 清理、assistant-first 顺序修复，以及在传输需要时进行通用的 Gemini turn 校验 | `moonshot`, `ollama`, `xai`, `zai` |
    | `anthropic-by-model` | 由 `modelId` 选择的 Claude 感知 replay 策略，因此只有在解析出的模型确实是 Claude id 时，Anthropic 消息传输才会获得 Claude 专属的 thinking-block 清理 | `amazon-bedrock`, `anthropic-vertex` |
    | `google-gemini` | 原生 Gemini replay 策略，加上 bootstrap replay 清理和标记的 reasoning 输出模式 | `google`, `google-gemini-cli` |
    | `passthrough-gemini` | 用于通过 OpenAI 兼容代理传输运行的 Gemini 模型的 Gemini thought-signature 清理；不会启用原生 Gemini replay 校验或 bootstrap 重写 | `openrouter`, `kilocode`, `opencode`, `opencode-go` |
    | `hybrid-anthropic-openai` | 适用于在一个插件中混合 Anthropic 消息和 OpenAI 兼容模型表面的混合策略；可选的仅 Claude thinking-block 删除仍然只作用于 Anthropic 一侧 | `minimax` |

    当前可用的 stream 家族：

    | Family | 作用 | 打包示例 |
    | --- | --- | --- |
    | `google-thinking` | 共享流路径上的 Gemini thinking 负载规范化 | `google`, `google-gemini-cli` |
    | `kilocode-thinking` | 共享代理流路径上的 Kilo reasoning 包装器，对 `kilo/auto` 和不受支持的代理 reasoning ids 跳过注入的 thinking | `kilocode` |
    | `moonshot-thinking` | 基于配置 + `/think` 级别的 Moonshot 二进制原生 thinking 负载映射 | `moonshot` |
    | `minimax-fast-mode` | 共享流路径上的 MiniMax fast-mode 模型重写 | `minimax`, `minimax-portal` |
    | `openai-responses-defaults` | 共享的原生 OpenAI/Codex Responses 包装器：归因 headers、`/fast`/`serviceTier`、文本详细程度、原生 Codex web search、reasoning-compat 负载塑形，以及 Responses 上下文管理 | `openai`, `openai-codex` |
    | `openrouter-thinking` | 面向代理路由的 OpenRouter reasoning 包装器，不支持的模型/`auto` 跳过由中心处理 | `openrouter` |
    | `tool-stream-default-on` | 面向 Z.AI 等希望默认启用工具流的提供方的 `tool_stream` 包装器，除非显式禁用 | `zai` |

    <Accordion title="驱动这些家族构建器的 SDK 接口">
      每个家族构建器都由同一软件包导出的更底层公共辅助函数组合而成；当某个提供方需要脱离通用模式时，
      你可以直接使用这些函数：

      - `openclaw/plugin-sdk/provider-model-shared` - `ProviderReplayFamily`, `buildProviderReplayFamilyHooks(...)`, and the raw replay builders (`buildOpenAICompatibleReplayPolicy`, `buildAnthropicReplayPolicyForModel`, `buildGoogleGeminiReplayPolicy`, `buildHybridAnthropicOrOpenAIReplayPolicy`). Also exports Gemini replay helpers (`sanitizeGoogleGeminiReplayHistory`, `resolveTaggedReasoningOutputMode`) and endpoint/model helpers (`resolveProviderEndpoint`, `normalizeProviderId`, `normalizeGooglePreviewModelId`).
      - `openclaw/plugin-sdk/provider-stream` - `ProviderStreamFamily`, `buildProviderStreamFamilyHooks(...)`, `composeProviderStreamWrappers(...)`, plus the shared OpenAI/Codex wrappers (`createOpenAIAttributionHeadersWrapper`, `createOpenAIFastModeWrapper`, `createOpenAIServiceTierWrapper`, `createOpenAIResponsesContextManagementWrapper`, `createCodexNativeWebSearchWrapper`), DeepSeek V4 OpenAI-compatible wrapper (`createDeepSeekV4OpenAICompatibleThinkingWrapper`), Anthropic Messages thinking prefill cleanup (`createAnthropicThinkingPrefillPayloadWrapper`), plain-text tool-call compat (`createPlainTextToolCallCompatWrapper`), and shared proxy/provider wrappers (`createOpenRouterWrapper`, `createToolStreamWrapper`, `createMinimaxFastModeWrapper`).
      - `openclaw/plugin-sdk/provider-tools` - `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks("deepseek" | "gemini" | "openai")`, and underlying provider schema helpers.

      某些 stream 辅助函数会刻意保持为提供方本地私有。`@openclaw/anthropic-provider` 将 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、`resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 以及更底层的 Anthropic 包装器构建器保留在自己的公共 `api.ts` / `contract-api.ts` 接口边界内，因为它们编码了 Claude OAuth beta 处理和 `context1m` 门控。xAI 插件也将原生 xAI Responses 形状保留在自己的 `wrapStreamFn` 中（`/fast` 别名、默认 `tool_stream`、不支持的 strict-tool 清理、xAI 特定的 reasoning 负载移除）。

      同样的 package-root 模式也支撑着 `@openclaw/openai-provider`（提供方构建器、默认模型辅助函数、realtime 提供方构建器）以及 `@openclaw/openrouter-provider`（提供方构建器加 onboarding/config 辅助函数）。
    </Accordion>

    <Tabs>
      <Tab title="Token 交换">
        对于需要在每次推理调用前进行 token 交换的提供方：

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
        对于需要自定义请求头或请求体修改的提供方：

        ```typescript
        // wrapStreamFn 从 ctx.streamFn 派生出一个 StreamFn
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
        对于需要在通用 HTTP 或 WebSocket 传输上携带原生请求/会话头或元数据的提供方：

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
      <Tab title="用量和计费">
        对于暴露用量/计费数据的提供方：

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

    <Accordion title="所有可用的提供方钩子">
      OpenClaw 会按以下顺序调用这些钩子。大多数提供方只会用到 2-3 个：
      OpenClaw 不再调用的仅兼容字段，例如
      `ProviderPlugin.capabilities` 和 `suppressBuiltInModel`，不在此列出。

      | # | Hook | 适用场景 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型目录或 base URL 默认值 |
      | 2 | `applyConfigDefaults` | 配置实例化期间由提供方拥有的全局默认值 |
      | 3 | `normalizeModelId` | 查找前清理旧版/预览版 model-id 别名 |
      | 4 | `normalizeTransport` | 生成通用模型前清理提供方家族 `api` / `baseUrl` |
      | 5 | `normalizeConfig` | 规范化 `models.providers.<id>` 配置 |
      | 6 | `applyNativeStreamingUsageCompat` | 配置提供方的原生流式 usage 兼容重写 |
      | 7 | `resolveConfigApiKey` | 提供方拥有的 env-marker 认证解析 |
      | 8 | `resolveSyntheticAuth` | 本地/自托管或由配置支持的合成认证 |
      | 9 | `shouldDeferSyntheticProfileAuth` | 在 env/config 认证之下延后合成存储的 profile 占位符 |
      | 10 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 11 | `prepareDynamicModel` | 解析前的异步元数据获取 |
      | 12 | `normalizeResolvedModel` | 运行器之前的传输重写 |
      | 13 | `contributeResolvedModelCompat` | 位于另一个兼容传输之后的厂商模型兼容标志 |
      | 14 | `normalizeToolSchemas` | 注册前由提供方拥有的 tool-schema 清理 |
      | 15 | `inspectToolSchemas` | 由提供方拥有的 tool-schema 诊断 |
      | 16 | `resolveReasoningOutputMode` | 标记式 vs 原生 reasoning-output 协议 |
      | 17 | `prepareExtraParams` | 默认请求参数 |
      | 18 | `createStreamFn` | 完全自定义的 StreamFn 传输 |
      | 19 | `wrapStreamFn` | 常规流路径上的自定义请求头/请求体包装器 |
      | 20 | `resolveTransportTurnState` | 原生的每轮请求头/元数据 |
      | 21 | `resolveWebSocketSessionPolicy` | 原生 WS 会话头/冷却时间 |
      | 22 | `formatApiKey` | 自定义运行时 token 形状 |
      | 23 | `refreshOAuth` | 自定义 OAuth 刷新 |
      | 24 | `buildAuthDoctorHint` | 认证修复指引 |
      | 25 | `matchesContextOverflowError` | 提供方拥有的溢出检测 |
      | 26 | `classifyFailoverReason` | 提供方拥有的限流/过载分类 |
      | 27 | `isCacheTtlEligible` | 提示缓存 TTL 门控 |
      | 28 | `buildMissingAuthMessage` | 自定义缺失认证提示 |
      | 29 | `augmentModelCatalog` | 合成的前向兼容行 |
      | 30 | `resolveThinkingProfile` | 模型特定的 `/think` 选项集 |
      | 31 | `isBinaryThinking` | 二进制 thinking 开/关兼容性 |
      | 32 | `supportsXHighThinking` | `xhigh` reasoning 支持兼容性 |
      | 33 | `resolveDefaultThinkingLevel` | 默认 `/think` 策略兼容性 |
      | 34 | `isModernModelRef` | 线上/冒烟测试模型匹配 |
      | 35 | `prepareRuntimeAuth` | 推理前的 token 交换 |
      | 36 | `resolveUsageAuth` | 自定义用量凭据解析 |
      | 37 | `fetchUsageSnapshot` | 自定义用量端点 |
      | 38 | `createEmbeddingProvider` | 面向 memory/search 的提供方拥有 embedding 适配器 |
      | 39 | `buildReplayPolicy` | 自定义对话回放/压缩策略 |
      | 40 | `sanitizeReplayHistory` | 通用清理之后的提供方特定回放重写 |
      | 41 | `validateReplayTurns` | 嵌入式运行器之前的严格 replay-turn 校验 |
      | 42 | `onModelSelected` | 选择后的回调（例如遥测） |

      运行时回退说明：

      - `normalizeConfig` 会先检查匹配到的提供方，然后再检查其他支持钩子的提供方插件，直到有一个真正修改了配置。如果没有任何提供方钩子重写受支持的 Google 家族配置项，打包的 Google 配置规范化器仍会生效。
      - `resolveConfigApiKey` 会在暴露时使用提供方钩子。打包的 `amazon-bedrock` 路径在这里也有内置的 AWS env-marker 解析器，尽管 Bedrock 运行时认证本身仍然使用 AWS SDK 默认链。
      - `resolveSystemPromptContribution` 允许提供方为某个模型家族注入支持缓存感知的系统提示指导。若行为属于某个单独的提供方/模型家族，并且应保留稳定/动态缓存拆分，则应优先使用它，而不是 `before_prompt_build`。

      有关详细说明和真实示例，请参见 [内部机制：提供方运行时钩子](/plugins/architecture-internals#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="添加额外能力（可选）">
    ### 第 5 步：添加额外能力

    提供方插件可以在文本推理之外同时注册 embeddings、语音、实时转写、
    实时语音、媒体理解、图像生成、视频生成、网页抓取和网页搜索。OpenClaw 将这类插件归类为
    **hybrid-capability** 插件——这是公司级插件的推荐模式
    （每个厂商一个插件）。参见
    [内部机制：能力所有权](/plugins/architecture#capability-ownership-model)。

    在 `register(api)` 中与你现有的
    `api.registerProvider(...)` 调用并列注册每种能力。只选择你需要的选项卡：

    <Tabs>
      <Tab title="语音（TTS）">
        ```typescript
        import {
          assertOkOrThrowProviderError,
          postJsonRequest,
        } from "openclaw/plugin-sdk/provider-http";

        api.registerSpeechProvider({
          id: "acme-ai",
          label: "Acme Speech",
          defaultTimeoutMs: 120_000,
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

        对提供方 HTTP 失败请使用 `assertOkOrThrowProviderError(...)`，这样插件可以共享
        有上限的错误正文读取、JSON 错误解析和 request-id 后缀。
      </Tab>
      <Tab title="实时转写">
        优先使用 `createRealtimeTranscriptionWebSocketSession(...)` - 共享
        辅助函数会处理代理捕获、重连退避、关闭刷新、就绪
        握手、音频排队和关闭事件诊断。你的插件
        只需要映射上游事件。

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

        通过 multipart 上传音频的批量 STT 提供方应使用
        `openclaw/plugin-sdk/provider-http` 中的 `buildAudioTranscriptionFormData(...)`。
        该辅助函数会规范化上传文件名，包括 AAC 上传在需要与兼容转写 API
        配合时必须使用的 M4A 风格文件名。
      </Tab>
      <Tab title="实时语音">
        ```typescript
        api.registerRealtimeVoiceProvider({
          id: "acme-ai",
          label: "Acme Realtime Voice",
          capabilities: {
            transports: ["gateway-relay"],
            inputAudioFormats: [{ encoding: "pcm16", sampleRateHz: 24000, channels: 1 }],
            outputAudioFormats: [{ encoding: "pcm16", sampleRateHz: 24000, channels: 1 }],
            supportsBargeIn: true,
            supportsToolCalls: true,
          },
          isConfigured: ({ providerConfig }) => Boolean(providerConfig.apiKey),
          createBridge: (req) => ({
            // 只有当提供方接受一次调用对应多个工具响应时才设置此项，
            // 例如先返回一个即时的“正在处理”响应，再返回最终结果。
            supportsToolResultContinuation: false,
            connect: async () => {},
            sendAudio: () => {},
            setMediaTimestamp: () => {},
            handleBargeIn: () => {},
            submitToolResult: () => {},
            acknowledgeMark: () => {},
            close: () => {},
            isConnected: () => true,
          }),
        });
        ```

        声明 `capabilities`，这样 `talk.catalog` 就可以向浏览器和原生 Talk
        客户端暴露有效模式、传输、音频格式和功能标志。当传输能够检测到人类正在打断助手播放，并且提供方支持截断或清空当前音频响应时，实现 `handleBargeIn`。
      </Tab>
      <Tab title="媒体理解">
        ```typescript
        api.registerMediaUnderstandingProvider({
          id: "acme-ai",
          capabilities: ["image", "audio"],
          describeImage: async (req) => ({ text: "一张……的照片" }),
          transcribeAudio: async (req) => ({ text: "转写文本..." }),
        });
        ```
      </Tab>
      <Tab title="Embeddings">
        ```typescript
        api.registerEmbeddingProvider({
          id: "acme-ai",
          defaultModel: "acme-embed",
          transport: "remote",
          authProviderId: "acme-ai",
          create: async ({ model }) => ({
            provider: {
              id: "acme-ai",
              model,
              dimensions: 1536,
              embed: async (input) => {
                const text = typeof input === "string" ? input : input.text;
                return fetchAcmeEmbedding(text);
              },
              embedBatch: async (inputs) =>
                Promise.all(
                  inputs.map((input) =>
                    fetchAcmeEmbedding(typeof input === "string" ? input : input.text),
                  ),
                ),
            },
          }),
        });
        ```

        在 `contracts.embeddingProviders` 中声明相同的 id。这是用于可复用向量生成的一般 embedding 契约。
        只有面向 memory-engine 的适配器才使用 `registerMemoryEmbeddingProvider(...)`。
      </Tab>
      <Tab title="图像和视频生成">
        视频能力使用一种**模式感知**的形状：`generate`、
        `imageToVideo` 和 `videoToVideo`。像
        `maxInputImages` / `maxInputVideos` / `maxDurationSeconds` 这样的扁平聚合字段
        不足以清晰地声明转换模式支持或禁用模式。
        音乐生成遵循相同模式，使用显式的 `generate` /
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
          defaultTimeoutMs: 600_000,
          capabilities: {
            generate: { maxVideos: 1, maxDurationSeconds: 10, supportsResolution: true },
            imageToVideo: {
              enabled: true,
              maxVideos: 1,
              maxInputImages: 1,
              maxInputImagesByModel: { "acme/reference-to-video": 9 },
              maxDurationSeconds: 5,
            },
            videoToVideo: { enabled: false },
          },
          generateVideo: async (req) => ({ videos: [] }),
        });
        ```
      </Tab>
      <Tab title="网页抓取与搜索">
        ```typescript
        api.registerWebFetchProvider({
          id: "acme-ai-fetch",
          label: "Acme Fetch",
          hint: "通过 Acme 的渲染后端抓取网页。",
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
    ### 第 6 步：测试

    ```typescript src/provider.test.ts
    import { describe, it, expect } from "vitest";
    // 从 index.ts 或一个专门的文件中导出你的提供方配置对象
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

提供方插件与其他外部代码插件的发布方式相同：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

这里不要使用旧的仅技能发布别名；插件包应使用
`clawhub package publish`。

## 文件结构

```
<bundled-plugin-root>/acme-ai/
├── package.json              # openclaw.providers 元数据
├── openclaw.plugin.json      # 带有提供者认证元数据的清单
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # 测试
    └── usage.ts              # 使用端点（可选）
```

## 目录顺序参考

`catalog.order` 控制你的目录与内置提供者合并的相对时机：

| 顺序      | 时机         | 使用场景                                        |
| --------- | ------------ | ----------------------------------------------- |
| `simple`  | 第一轮       | 纯 API 密钥提供者                               |
| `profile` | simple 之后 | 由认证配置文件控制的提供者                      |
| `paired`  | profile 之后 | 合成多个相关条目                                |
| `late`    | 最后一轮     | 覆盖现有提供者（冲突时获胜）                    |

## 下一步

- [Channel Plugins](/plugins/sdk-channel-plugins) - 如果你的插件还提供一个 channel
- [SDK Runtime](/plugins/sdk-runtime) - `api.runtime` 辅助函数（TTS、搜索、subagent）
- [SDK Overview](/plugins/sdk-overview) - 完整的子路径导入参考
- [Plugin Internals](/plugins/architecture-internals#provider-runtime-hooks) - hook 详情和捆绑示例

## 相关内容

- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
- [构建渠道插件](/plugins/sdk-channel-plugins)
