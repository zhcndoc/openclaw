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
      "setup": {
        "providers": [
          {
            "id": "acme-ai",
            "envVars": ["ACME_AI_API_KEY"]
          }
        ]
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

    清单声明 `setup.providers[].envVars`，这样 OpenClaw 就能在不加载你的插件运行时的情况下检测
    凭据。当某个提供方变体应复用另一个提供方 id 的认证时，添加 `providerAuthAliases`。`modelSupport`
    是可选项，它允许 OpenClaw 在运行时钩子存在之前，就从像 `acme-large` 这样的简写
    模型 id 自动加载你的提供方插件。如果你在 ClawHub 上发布该提供方，那么 `package.json` 中的
    `openclaw.compat` 和 `openclaw.build` 字段是必需的。

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

    ### Live model discovery

    如果你的提供方暴露了一个 `/models` 风格的 API，请将提供方特定的
    端点和行投影保留在插件中，并使用
    `openclaw/plugin-sdk/provider-catalog-live-runtime` 来处理共享的获取生命周期。
    该辅助函数为你提供受保护的 HTTP 获取、提供方认证头、
    结构化 HTTP 错误、TTL 缓存和静态回退行为，而不会把提供方策略放进 OpenClaw 核心。

    当 live API 只告诉你哪些由提供方拥有的静态目录行当前可用时，请使用 `buildLiveModelProviderConfig`：

    ```typescript index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import {
      buildLiveModelProviderConfig,
      type LiveModelCatalogFetchGuard,
    } from "openclaw/plugin-sdk/provider-catalog-live-runtime";

    const STATIC_MODELS = [
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
    ] as const;

    async function buildAcmeLiveProvider(params: {
      apiKey: string;
      discoveryApiKey?: string;
      fetchGuard?: LiveModelCatalogFetchGuard;
    }) {
      return await buildLiveModelProviderConfig({
        providerId: "acme-ai",
        endpoint: "https://api.acme-ai.com/v1/models",
        providerConfig: {
          baseUrl: "https://api.acme-ai.com/v1",
          api: "openai-completions",
        },
        models: STATIC_MODELS,
        apiKey: params.apiKey,
        discoveryApiKey: params.discoveryApiKey,
        fetchGuard: params.fetchGuard,
        ttlMs: 60_000,
        auditContext: "acme-ai-model-discovery",
      });
    }

    export default definePluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      register(api) {
        api.registerProvider({
          id: "acme-ai",
          label: "Acme AI",
          catalog: {
            order: "simple",
            run: async (ctx) => {
              const auth = ctx.resolveProviderAuth("acme-ai");
              const apiKey =
                auth.apiKey ?? ctx.resolveProviderApiKey("acme-ai").apiKey;
              if (!apiKey) return null;
              return {
                provider: await buildAcmeLiveProvider({
                  apiKey,
                  discoveryApiKey: auth.discoveryApiKey,
                }),
              };
            },
          },
          staticCatalog: {
            order: "simple",
            run: async () => ({
              provider: {
                baseUrl: "https://api.acme-ai.com/v1",
                api: "openai-completions",
                models: [...STATIC_MODELS],
              },
            }),
          },
        });
      },
    });
    ```

    当提供方 API 返回更丰富的元数据，而插件需要自行将行投影为 OpenClaw 模型定义时，请使用
    `getCachedLiveProviderModelRows`：

    ```typescript index.ts
    import {
      getCachedLiveProviderModelRows,
      LiveModelCatalogHttpError,
    } from "openclaw/plugin-sdk/provider-catalog-live-runtime";

    async function discoverAcmeModels(apiKey: string) {
      try {
        const rows = await getCachedLiveProviderModelRows({
          providerId: "acme-ai",
          endpoint: "https://api.acme-ai.com/v1/models",
          apiKey,
          ttlMs: 60_000,
          auditContext: "acme-ai-model-discovery",
        });
        return rows
          .map((row) => projectAcmeModel(row))
          .filter((model) => model !== null);
      } catch (error) {
        if (error instanceof LiveModelCatalogHttpError) {
          return STATIC_MODELS;
        }
        throw error;
      }
    }
    ```

    `run` 应保持认证门控，并在没有可用凭据时返回 `null`。保留一个离线的 `staticRun` 或静态回退，
    这样设置、文档、测试和选择器界面就不会依赖实时网络访问。使用适合模型列表新鲜度的 TTL，
    避免请求时文件系统轮询，并且只有在上游响应不是 OpenAI 兼容的 `{ data: [{ id, object }] }`
    形状时，才传入提供方特定的 `readRows` / `readModelId`。

    如果上游提供方使用的控制标记与 OpenClaw 不同，请添加一个小型的双向文本变换，而不是替换流路径：

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

    上面的 live discovery 示例涵盖了 `/models` 风格的提供方 API。请将该发现逻辑保留在 `catalog.run` 中，
    并基于可用认证进行门控，同时让 `staticRun` 保持不依赖网络，以便离线生成目录。

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
    | `openai-compatible` | Shared OpenAI-style replay policy for OpenAI-compatible transports, including tool-call-id sanitation, assistant-first ordering fixes, and generic Gemini-turn validation where the transport needs it | `moonshot`, `ollama`, `xai`, `zai` |
    | `anthropic-by-model` | Claude-aware replay policy chosen by `modelId`, so Anthropic-message transports only get Claude-specific thinking-block cleanup when the resolved model is actually a Claude id | `amazon-bedrock`, `anthropic-vertex` |
    | `google-gemini` | Native Gemini replay policy plus bootstrap replay sanitation. The shared family keeps the text-output Gemini CLI on tagged reasoning; the direct `google` provider overrides `resolveReasoningOutputMode` to `native` because Gemini API thinking arrives as native thought parts. | `google`, `google-gemini-cli` |
    | `passthrough-gemini` | Gemini thought-signature sanitation for Gemini models running through OpenAI-compatible proxy transports; does not enable native Gemini replay validation or bootstrap rewrites | `openrouter`, `kilocode`, `opencode`, `opencode-go` |
    | `hybrid-anthropic-openai` | Hybrid policy for providers that mix Anthropic-message and OpenAI-compatible model surfaces in one plugin; optional Claude-only thinking-block dropping stays scoped to the Anthropic side | `minimax` |

    当前可用的 stream 家族：

    | Family | 作用 | 打包示例 |
    | --- | --- | --- |
    | `google-thinking` | Gemini thinking payload normalization on the shared stream path | `google`, `google-gemini-cli` |
    | `kilocode-thinking` | Kilo reasoning wrapper on the shared proxy stream path, with `kilo/auto` and unsupported proxy reasoning ids skipping injected thinking | `kilocode` |
    | `moonshot-thinking` | Moonshot binary native-thinking payload mapping from config + `/think` level | `moonshot` |
    | `minimax-fast-mode` | MiniMax fast-mode model rewrite on the shared stream path | `minimax`, `minimax-portal` |
    | `openai-responses-defaults` | Shared native OpenAI/Codex Responses wrappers: attribution headers, `/fast`/`serviceTier`, text verbosity, native Codex web search, reasoning-compat payload shaping, and Responses context management | `openai` |
    | `openrouter-thinking` | OpenRouter reasoning wrapper for proxy routes, with unsupported-model/`auto` skips handled centrally | `openrouter` |
    | `tool-stream-default-on` | Default-on `tool_stream` wrapper for providers like Z.AI that want tool streaming unless explicitly disabled | `zai` |

    <Accordion title="驱动这些家族构建器的 SDK 接口">
      每个家族构建器都由同一软件包导出的更底层公共辅助函数组合而成；当某个提供方需要脱离通用模式时，
      你可以直接使用这些函数：

      - `openclaw/plugin-sdk/provider-model-shared` - `ProviderReplayFamily`, `buildProviderReplayFamilyHooks(...)`, and the raw replay builders (`buildOpenAICompatibleReplayPolicy`, `buildAnthropicReplayPolicyForModel`, `buildGoogleGeminiReplayPolicy`, `buildHybridAnthropicOrOpenAIReplayPolicy`). Also exports Gemini replay helpers (`sanitizeGoogleGeminiReplayHistory`, `resolveTaggedReasoningOutputMode`) and endpoint/model helpers (`resolveProviderEndpoint`, `normalizeProviderId`, `normalizeGooglePreviewModelId`).
      - `openclaw/plugin-sdk/provider-stream` - `ProviderStreamFamily`, `buildProviderStreamFamilyHooks(...)`, `composeProviderStreamWrappers(...)`, plus the shared OpenAI/Codex wrappers (`createOpenAIAttributionHeadersWrapper`, `createOpenAIFastModeWrapper`, `createOpenAIServiceTierWrapper`, `createOpenAIResponsesContextManagementWrapper`, `createCodexNativeWebSearchWrapper`), DeepSeek V4 OpenAI-compatible wrapper (`createDeepSeekV4OpenAICompatibleThinkingWrapper`), Anthropic Messages thinking prefill cleanup (`createAnthropicThinkingPrefillPayloadWrapper`), plain-text tool-call compat (`createPlainTextToolCallCompatWrapper`), and shared proxy/provider wrappers (`createOpenRouterWrapper`, `createToolStreamWrapper`, `createMinimaxFastModeWrapper`).
      - `openclaw/plugin-sdk/provider-tools` - `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks("deepseek" | "gemini" | "openai")`, and underlying provider schema helpers.

      对于 Gemini 家族提供方，请让 reasoning-output 模式与传输保持一致。直接的 Google Gemini API 提供方应使用
      `native` reasoning output，这样 OpenClaw 就会消费原生 thought parts，而不会额外加入 `<think>` / `<final>` 提示指令。
      解析最终 JSON/text 响应的仅文本 Gemini CLI 风格后端则可以保留共享的 `google-gemini` 标记契约。

      某些流式辅助函数有意保持为提供方本地。`@openclaw/anthropic-provider` 将 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、`resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 以及更底层的 Anthropic 包装器构建器保留在其自己的公开 `api.ts` / `contract-api.ts` 接口中，因为它们编码了 Claude OAuth beta 处理和 `context1m` 门控。xAI 插件也将原生 xAI Responses 形态保留在自己的 `wrapStreamFn` 中（`/fast` 别名、默认 `tool_stream`、不支持的 strict-tool 清理、xAI 特定的 reasoning-payload 移除）。

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

        `resolveUsageAuth` has three outcomes. Return `{ token, accountId? }`
        when the provider has a usage/billing credential. Return
        `{ handled: true }` only when the provider has definitively handled usage
        auth but has no usable usage token, and OpenClaw must skip generic
        API-key/OAuth fallback. Return `null` or `undefined` when the provider did
        not handle the request and OpenClaw should continue with generic fallback.
      </Tab>
    </Tabs>

    <Accordion title="所有可用的提供方钩子">
      OpenClaw 会按以下顺序调用这些钩子。大多数提供方只会用到 2-3 个：
      OpenClaw 不再调用的仅兼容字段，例如
      `ProviderPlugin.capabilities` 和 `suppressBuiltInModel`，不在此列出。

      | # | Hook | 适用场景 |
      | --- | --- | --- |
      | 1 | `catalog` | Model catalog or base URL defaults |
      | 2 | `applyConfigDefaults` | Provider-owned global defaults during config materialization |
      | 3 | `normalizeModelId` | Legacy/preview model-id alias cleanup before lookup |
      | 4 | `normalizeTransport` | Provider-family `api` / `baseUrl` cleanup before generic model assembly |
      | 5 | `normalizeConfig` | Normalize `models.providers.<id>` config |
      | 6 | `applyNativeStreamingUsageCompat` | Native streaming-usage compat rewrites for config providers |
      | 7 | `resolveConfigApiKey` | Provider-owned env-marker auth resolution |
      | 8 | `resolveSyntheticAuth` | Local/self-hosted or config-backed synthetic auth |
      | 9 | `shouldDeferSyntheticProfileAuth` | Lower synthetic stored-profile placeholders behind env/config auth |
      | 10 | `resolveDynamicModel` | Accept arbitrary upstream model IDs |
      | 11 | `prepareDynamicModel` | Async metadata fetch before resolving |
      | 12 | `normalizeResolvedModel` | Transport rewrites before the runner |
      | 13 | `normalizeToolSchemas` | Provider-owned tool-schema cleanup before registration |
      | 14 | `inspectToolSchemas` | Provider-owned tool-schema diagnostics |
      | 15 | `resolveReasoningOutputMode` | Tagged vs native reasoning-output contract |
      | 16 | `prepareExtraParams` | Default request params |
      | 17 | `createStreamFn` | Fully custom StreamFn transport |
      | 19 | `wrapStreamFn` | Custom headers/body wrappers on the normal stream path |
      | 20 | `resolveTransportTurnState` | Native per-turn headers/metadata |
      | 21 | `resolveWebSocketSessionPolicy` | Native WS session headers/cool-down |
      | 22 | `formatApiKey` | Custom runtime token shape |
      | 23 | `refreshOAuth` | Custom OAuth refresh |
      | 24 | `buildAuthDoctorHint` | Auth repair guidance |
      | 25 | `matchesContextOverflowError` | Provider-owned overflow detection |
      | 26 | `classifyFailoverReason` | Provider-owned rate-limit/overload classification |
      | 27 | `isCacheTtlEligible` | Prompt cache TTL gating |
      | 28 | `buildMissingAuthMessage` | Custom missing-auth hint |
      | 29 | `augmentModelCatalog` | Synthetic forward-compat rows |
      | 30 | `resolveThinkingProfile` | Model-specific `/think` option set |
      | 31 | `isBinaryThinking` | Binary thinking on/off compatibility |
      | 32 | `supportsXHighThinking` | `xhigh` reasoning support compatibility |
      | 33 | `resolveDefaultThinkingLevel` | Default `/think` policy compatibility |
      | 34 | `isModernModelRef` | Live/smoke model matching |
      | 35 | `prepareRuntimeAuth` | Token exchange before inference |
      | 36 | `resolveUsageAuth` | Custom usage credential parsing |
      | 37 | `fetchUsageSnapshot` | Custom usage endpoint |
      | 38 | `createEmbeddingProvider` | Provider-owned embedding adapter for memory/search |
      | 39 | `buildReplayPolicy` | Custom transcript replay/compaction policy |
      | 40 | `sanitizeReplayHistory` | Provider-specific replay rewrites after generic cleanup |
      | 41 | `validateReplayTurns` | Strict replay-turn validation before the embedded runner |
      | 42 | `onModelSelected` | Post-selection callback (e.g. telemetry) |

      运行时回退说明：

      - `normalizeConfig` checks the matched provider first, then other hook-capable provider plugins until one actually changes the config. If no provider hook rewrites a supported Google-family config entry, the bundled Google config normalizer still applies.
      - `resolveConfigApiKey` uses the provider hook when exposed. Amazon Bedrock keeps AWS env-marker resolution in its provider plugin; runtime auth itself still uses the AWS SDK default chain when configured with `auth: "aws-sdk"`.
      - `resolveThinkingProfile(ctx)` receives the selected `provider`, `modelId`, optional merged `reasoning` catalog hint, and optional merged model `compat` facts. Use `compat` only to select the provider's thinking UI/profile.
      - `resolveSystemPromptContribution` lets a provider inject cache-aware system-prompt guidance for a model family. Prefer it over `before_prompt_build` when the behavior belongs to one provider/model family and should preserve the stable/dynamic cache split.

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

        本地或自托管媒体提供方如果有意不需要凭据，可以暴露 `resolveAuth` 并返回 `kind: "none"`。
        对于未明确选择加入的提供方，OpenClaw 仍然保留常规认证门控。现有提供方可以继续读取 `req.apiKey`；
        新提供方应优先使用 `req.auth`。

        ```typescript
        api.registerMediaUnderstandingProvider({
          id: "local-audio",
          capabilities: ["audio"],
          resolveAuth: () => ({
            kind: "none",
            source: "local-audio plugin no-auth",
          }),
          transcribeAudio: async (req) => ({ text: "Transcript..." }),
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

        在 `contracts.embeddingProviders` 中声明相同的 id。这是用于可复用向量生成的通用 embedding
        契约，包括 memory search。`registerMemoryEmbeddingProvider(...)` 是面向现有 memory 专用适配器的
        弃用兼容方式。
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
