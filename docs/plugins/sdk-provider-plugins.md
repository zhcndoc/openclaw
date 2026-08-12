---
summary: "构建 OpenClaw 的模型提供方插件的分步指南"
title: "构建提供方插件"
sidebarTitle: "提供方插件"
read_when:
  - 你正在构建一个新的模型提供方插件
  - 你想为 OpenClaw 添加一个兼容 OpenAI 的代理或自定义 LLM
  - 你需要了解提供方认证、目录和运行时钩子
---

构建一个提供方插件，将模型提供方（LLM）添加到 OpenClaw：模型目录、API 密钥认证和动态模型解析。

<Info>
  刚接触 OpenClaw 插件？请先阅读[入门指南](/plugins/building-plugins)，
  了解软件包结构和清单设置。
</Info>

<Tip>
  提供方插件会将模型添加到 OpenClaw 的常规推理循环中。如果模型必须通过
  管理线程、压缩或工具事件的原生 agent 守护进程运行，请将提供方与一个
  [agent harness](/plugins/sdk-agent-harness) 配对，而不是将守护进程协议的详细信息放入核心中。
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

    `setup.providers[].envVars` 允许 OpenClaw 在不加载你的插件运行时的情况下检测凭据。当某个提供方变体应复用另一个提供方 id 的认证时，添加 `providerAuthAliases`。`modelSupport` 是可选的，允许 OpenClaw 在运行时钩子存在之前，根据 `acme-large` 之类的简写模型 id 自动加载你的提供方插件。对于在 ClawHub 上发布，`package.json` 中的 `openclaw.compat` 和 `openclaw.build` 是必需的（`openclaw.compat.pluginApi` 和 `openclaw.build.openclawVersion` 是两个必需字段；如果省略 `minGatewayVersion`，则会回退到 `openclaw.install.minHostVersion`）。

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

    `registerModelCatalogProvider` 是较新的控制平面目录接口，用于列表、帮助和选择器 UI，涵盖 `text`、`voice`、`image_generation`、`video_generation` 和 `music_generation` 行。将厂商端点调用和响应映射保留在插件中；OpenClaw 负责共享的行结构、来源标签和帮助渲染。

    这是一个可运行的提供方。现在，用户可以运行
    `openclaw onboard --acme-ai-api-key <key>`，并选择
    `acme-ai/acme-large` 作为模型。

    ### 实时模型发现

    如果你的提供方公开了兼容 OpenAI 的 `/models` API，可以选择让单提供方辅助函数接入共享发现功能：

    ```typescript
    catalog: {
      buildProvider: () => ({
        api: "openai-completions",
        baseUrl: "https://api.acme-ai.com/v1",
        models: [...STATIC_MODELS],
      }),
      buildStaticProvider: () => ({
        api: "openai-completions",
        baseUrl: "https://api.acme-ai.com/v1",
        models: [...STATIC_MODELS],
      }),
      liveModelDiscovery: true,
    },
    ```

    `liveModelDiscovery: true` 是公共 Plugin SDK 契约，行为如下：

    | 区域 | 契约 |
    | --- | --- |
    | 凭据 | 发现功能使用目录中解析出的提供方凭据；当认证提供 `discoveryApiKey` 时优先使用它。永远不会将秘密引用标记作为令牌发送。默认请求使用 `Authorization: Bearer <token>`；如需使用其他厂商认证方案，请使用 `buildRequestHeaders`。 |
    | 端点 | 默认 URL 是相对于生效提供方 `baseUrl` 的 `models`，其中包括启用 `allowExplicitBaseUrl` 时的操作员覆盖值。如需使用其他相对路径，请使用 `endpointPath`。仅对于固定厂商 URL，使用 `endpointUrl: { url, requireBaseUrl }`；除非生效的基础 URL 仍等于 `requireBaseUrl`，否则会跳过发现功能，因此自定义代理凭据不会被发送给厂商。 |
    | 网络限制 | Fetch 使用 OpenClaw 的 SSRF 防护、跨分页共用的一个 5 秒超时预算、每页 4 MiB 的响应大小限制，以及 50 页限制。会拒绝跨来源分页链接；跨来源重定向后会移除凭据。 |
    | 缓存 | 按提供方、端点和解析出的凭据缓存成功且非空的目录 60 秒。不会缓存空结果或不可用结果。 |
    | 过滤 | 精确匹配的实时 ID 会保留其可信的静态元数据。新行会被保守地投影为文本/聊天模型。会排除禁用、已归档、已弃用、明确非聊天、嵌入、重排、审核、语音、仅图像和仅视频的行。仅当需要从非标准响应封套中选择行时才使用 `readRows`；特定于提供方的模型语义仍应放在自定义目录中。 |
    | 接纳 | 可选。当请求构造依赖模型版本时，设置 `acceptUnknownModel: ({ id, record }) => boolean`，这样发现功能就不会发布你尚无法构造有效请求的模型。它只会针对静态目录尚未发布的 ID 调用；已知 ID 会绕过它并保留已发布的元数据。返回 `false` 可丢弃该行。省略它的提供方保持之前的行为不变。相比手动维护模型列表，更推荐将厂商公布的能力与自身契约检查进行比较；当该行不携带能力数据时，应默认拒绝。 |
    | 失败 | 实时发现属于辅助功能。认证、网络、超时、分页、解析、目录为空和过滤失败时，会返回提供方拥有的静态种子，而不是移除该提供方。 |

    对于非 Bearer 或非标准的列表端点，请传入选项，而不是
    `true`：

    ```typescript
    liveModelDiscovery: {
      endpointPath: "model-catalog",
      buildRequestHeaders: ({ apiKey, discoveryApiKey }) => ({
        "vendor-version": "2026-01-01",
        "x-api-key": discoveryApiKey ?? apiKey ?? "",
      }),
      readRows: (body) =>
        body && typeof body === "object" &&
        Array.isArray((body as { models?: unknown }).models)
          ? (body as { models: unknown[] }).models
          : [],
    },
    ```

    不要将 `endpointUrl` 用作无条件的备用主机。对于模型列表主机与推理主机不同的提供方，其 `requireBaseUrl` 检查是凭据隔离边界。

    如果提供方需要的模型语义超出了保守的兼容 OpenAI 投影，请仅在插件中保留该投影。将其作为 `projectRows` 传入；共享运行时仍负责受保护的 Fetch、提供方认证请求头、缓存接纳和静态回退。

    当 live API 仅告知你提供方拥有的静态目录行当前可用时，请使用 `buildLiveModelProviderConfig`：

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
        projectRows: (rows, fallback) =>
          rows.flatMap((row) => {
            const model = projectAcmeModel(row, fallback);
            return model ? [model] : [];
          }),
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

    `run` 应保持认证门控，并在没有可用凭据时返回 `null`。保留离线 `staticRun` 或静态回退，以便设置、文档、测试和选择器界面不依赖实时网络访问。使用适合模型列表新鲜度的 TTL，避免在请求时轮询文件系统；只有当上游响应不是兼容 OpenAI 的 `{ data: [{ id, object }] }` 结构时，才传入特定于提供方的 `readRows`／`readModelId`。

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

    `buildProvider` 是动态目录路径，在 OpenClaw 能解析真实提供方认证时使用。它可以执行提供方特定的发现逻辑。`buildStaticProvider` 仅用于离线行，这些内容在认证配置完成之前也应是安全可展示的；它不能依赖凭据，也不能发起网络请求。OpenClaw 的 `models list --all` 当前只会为打包的提供方插件执行静态目录，并且配置为空、环境变量为空，也没有 agent／workspace 路径。

    如果你的认证流程还需要在 onboarding 期间修补 `models.providers.*`、别名和 agent 默认模型，请使用 `openclaw/plugin-sdk/provider-onboard` 中的预设辅助函数。最小粒度的辅助函数有 `createDefaultModelPresetAppliers(...)`、`createDefaultModelsPresetAppliers(...)` 和 `createModelCatalogPresetAppliers(...)`。

    当某个提供方的原生端点在常规 `openai-completions` 传输上支持流式 usage 块时，应优先使用 `openclaw/plugin-sdk/provider-catalog-shared` 中共享的目录辅助函数，而不是硬编码提供方 id 判断。`supportsNativeStreamingUsageCompat(...)` 和 `applyProviderNativeStreamingUsageCompat(...)` 会根据端点能力映射检测支持情况，因此即使插件使用了自定义提供方 id，原生 Moonshot／DashScope 风格端点也仍然可以接入。

    上面的实时发现示例涵盖了 `/models` 风格的提供方 API。请将该发现逻辑保留在 `catalog.run` 中，并基于可用认证进行门控，同时让 `staticRun` 保持不依赖网络，以便离线生成目录。

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
    预热——完成后 `resolveDynamicModel` 会再次运行。

  </Step>

  <Step title="添加运行时钩子（按需）">
    大多数提供方只需要 `catalog` + `resolveDynamicModel`。随着你的提供方需要，再逐步添加钩子。

    现在共享辅助构建器已经覆盖了最常见的 replay／tool-compat 家族，因此插件通常不需要逐个手工连接每个钩子：

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

    | 家族 | 作用 | 打包示例 |
    | --- | --- | --- |
    | `openai-compatible` | 面向兼容 OpenAI 传输的共享 OpenAI 风格 replay 策略，包括工具调用 ID 清理、助手优先排序修复，以及传输需要时的通用 Gemini 回合验证 | `moonshot`、`ollama`、`xai`、`zai` |
    | `anthropic-by-model` | 根据 `modelId` 选择 Claude 感知的 replay 策略，因此 Anthropic 消息传输只有在解析出的模型确实是 Claude id 时，才会获得 Claude 特定的思维块清理 | `amazon-bedrock` |
    | `native-anthropic-by-model` | 与 `anthropic-by-model` 相同的按 Claude 模型选择策略，此外还包含工具调用 ID 清理和原生 Anthropic 工具使用 ID 保留，适用于必须保留厂商原生 ID 的传输 | `anthropic-vertex`、`clawrouter` |
    | `google-gemini` | 原生 Gemini replay 策略以及引导 replay 清理。共享家族会让文本输出的 Gemini CLI 使用带标签的 reasoning；直接的 `google` 提供方则将 `resolveReasoningOutputMode` 覆盖为 `native`，因为 Gemini API 的思维内容以原生 thought parts 到达。 | `google`、`google-gemini-cli` |
    | `passthrough-gemini` | 用于通过兼容 OpenAI 的代理传输运行 Gemini 模型的 Gemini thought-signature 清理；不会启用原生 Gemini replay 验证或引导重写 | `openrouter`、`kilocode`、`opencode`、`opencode-go` |
    | `hybrid-anthropic-openai` | 用于在一个插件中混合 Anthropic 消息和兼容 OpenAI 模型接口的提供方的混合策略；可选的仅 Claude 思维块丢弃逻辑仍限定在 Anthropic 侧 | `minimax` |

    当前可用的 stream 家族：

    | 家族 | 作用 | 打包示例 |
    | --- | --- | --- |
    | `google-thinking` | 在共享 stream 路径上规范化 Gemini thinking 负载 | `google`、`google-gemini-cli` |
    | `kilocode-thinking` | 在共享代理 stream 路径上的 Kilo reasoning 包装器，其中 `kilo-auto/balanced` 和不受支持的代理 reasoning id 会跳过注入 thinking | `kilocode` |
    | `moonshot-thinking` | 根据配置和 `/think` level 映射 Moonshot 二进制原生 thinking 负载 | `moonshot` |
    | `minimax-fast-mode` | 在共享 stream 路径上重写 MiniMax fast-mode 模型 | `minimax`、`minimax-portal` |
    | `openai-responses-defaults` | 共享的原生 OpenAI／Codex Responses 包装器：归因请求头、`/fast`／`serviceTier`、文本详细程度、原生 Codex 网页搜索、reasoning 兼容负载构造，以及 Responses 上下文管理 | `openai` |
    | `openrouter-thinking` | 用于代理路由的 OpenRouter reasoning 包装器，集中处理不支持的模型／`auto` 跳过逻辑 | `openrouter` |
    | `tool-stream-default-on` | 面向 Z.AI 等希望默认启用工具流式传输的提供方的默认开启 `tool_stream` 包装器，除非显式禁用 | `zai` |

    <Accordion title="驱动这些家族构建器的 SDK 接口">
      每个家族构建器都由同一软件包导出的更底层公共辅助函数组合而成；当某个提供方需要脱离通用模式时，
      你可以直接使用这些函数：

      - `openclaw/plugin-sdk/provider-model-shared` - `ProviderReplayFamily`、`buildProviderReplayFamilyHooks(...)`，以及原始 replay 构建器（`buildOpenAICompatibleReplayPolicy`、`buildAnthropicReplayPolicyForModel`、`buildGoogleGeminiReplayPolicy`、`buildHybridAnthropicOrOpenAIReplayPolicy`）。还导出 Gemini replay 辅助函数（`sanitizeGoogleGeminiReplayHistory`、`resolveTaggedReasoningOutputMode`）以及端点／模型辅助函数（`resolveProviderEndpoint`、`normalizeProviderId`、`normalizeGooglePreviewModelId`）。
      - `openclaw/plugin-sdk/provider-stream` - `ProviderStreamFamily`、`buildProviderStreamFamilyHooks(...)`、`composeProviderStreamWrappers(...)`，以及共享的 OpenAI／Codex 包装器（`createOpenAIAttributionHeadersWrapper`、`createOpenAIFastModeWrapper`、`createOpenAIServiceTierWrapper`、`createOpenAIResponsesContextManagementWrapper`、`createCodexNativeWebSearchWrapper`）、DeepSeek V4 兼容 OpenAI 包装器（`createDeepSeekV4OpenAICompatibleThinkingWrapper`）、Anthropic Messages thinking prefill 清理（`createAnthropicThinkingPrefillPayloadWrapper`）、纯文本工具调用兼容（`createPlainTextToolCallCompatWrapper`），以及共享的代理／提供方包装器（`createOpenRouterWrapper`、`createToolStreamWrapper`、`createMinimaxFastModeWrapper`）。
      - `openclaw/plugin-sdk/provider-stream-shared` - 面向高频提供方路径的轻量负载和事件包装器，包括 `createOpenAICompatibleCompletionsThinkingOffWrapper`、`createPayloadPatchStreamWrapper`、`createPlainTextToolCallCompatWrapper`、`normalizeOpenAICompatibleReasoningPayload(...)` 和 `setQwenChatTemplateThinking(...)`。
      - `openclaw/plugin-sdk/provider-tools` - `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks("deepseek" | "gemini" | "openai")` 以及底层提供方 schema 辅助函数。

      对于 Gemini 家族提供方，请让 reasoning-output 模式与传输保持一致。直接的 Google Gemini API 提供方应使用
      `native` reasoning output，这样 OpenClaw 就会消费原生 thought parts，而不会额外加入 `<think>` / `<final>` 提示指令。
      解析最终 JSON／text 响应的仅文本 Gemini CLI 风格后端则可以保留共享的 `google-gemini` 标记契约。

      某些流式辅助函数有意保持为提供方本地。`@openclaw/anthropic-provider` 将 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、`resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 以及更底层的 Anthropic 包装器构建器保留在其自己的公开 `api.ts` / `contract-api.ts` 接口中，因为它们编码了 Claude OAuth beta 处理和 `context1m` 门控。xAI 插件也将原生 xAI Responses 形态保留在自己的 `wrapStreamFn` 中（`/fast` 别名、默认 `tool_stream`、不支持的 strict-tool 清理、xAI 特定的 reasoning-payload 移除）。

      同样的软件包根模式也支撑着 `@openclaw/openai-provider`（提供方构建器、默认模型辅助函数、realtime 提供方构建器）以及 `@openclaw/openrouter-provider`（提供方构建器加 onboarding／config 辅助函数）。
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
        对于需要在通用 HTTP 或 WebSocket 传输上携带原生请求／会话头或元数据的提供方：

        ```typescript
        resolveTransportTurnState: (ctx) => ({
          headers: {
            "x-request-id": ctx.turnId,
          },
          metadata: {
            session_id: ctx.sessionId ?? "",
            turn_id: ctx.turnId,
          },
          websocket: {
            headers: {
              "x-session-id": ctx.sessionId ?? "",
            },
            degradeCooldownMs: 60_000,
          },
        }),
        ```

        较旧的 `resolveWebSocketSessionPolicy` 钩子仍受支持，但已弃用。迁移时请将其字段移至 `resolveTransportTurnState.websocket` 下；迁移期间，新钩子中的字段优先。
      </Tab>
      <Tab title="用量和计费">
        对于暴露用量／计费数据的提供方：

        ```typescript
        resolveUsageAuth: async (ctx) => {
          const auth = await ctx.resolveOAuthToken();
          return auth ? { token: auth.token } : null;
        },
        fetchUsageSnapshot: async (ctx) => {
          return await fetchAcmeUsage(ctx.token, ctx.timeoutMs);
        },
        ```

        `resolveUsageAuth` 有三种结果。当提供方拥有用量／计费凭据时，返回 `{ token, accountId?, subscriptionType?, rateLimitTier? }`（可选字段会将已解析配置中的非秘密计划元数据传入 `fetchUsageSnapshot`）。仅当提供方已明确处理用量认证但没有可用的用量令牌，并且 OpenClaw 必须跳过通用 API 密钥／OAuth 回退时，才返回 `{ handled: true }`。当提供方未处理该请求且 OpenClaw 应继续使用通用回退时，返回 `null` 或 `undefined`。

        在 `contracts.usageProviders` 中声明提供方 id。当清单契约和**两个**钩子都存在时，OpenClaw 会自动将该提供方纳入用量收集，而无需加载无关的提供方插件。不需要更新核心允许列表。`fetchUsageSnapshot` 返回共享的、与提供方无关的结构：

        - `plan`：提供方报告的订阅或密钥标签
        - `windows`：以使用百分比表示的可重置配额窗口
        - `billing`：类型化的 `balance`、`spend` 或 `budget` 条目；`unit` 可以是 ISO 货币，也可以是 `credits` 等提供方单位
        - `summary`：无法放入上述结构化字段的紧凑型提供方特定上下文

        请保持货币语义准确。除非上游契约明确如此规定，否则提供方 credit 不等于 USD。仅实现 `fetchUsageSnapshot` 的插件仍可供显式／合成调用方使用，但不会被自动发现，因为 OpenClaw 无法解析其用量凭据。
      </Tab>
    </Tabs>

    <Accordion title="常见提供方钩子">
      OpenClaw 大致会按以下顺序调用模型／提供方插件的钩子。
      大多数提供方只使用其中 2～3 个。这不是完整的 `ProviderPlugin`
      契约——完整且当前准确的钩子列表以及回退说明，请参阅[内部机制：提供方运行时钩子](/plugins/architecture-internals#provider-runtime-hooks)。
      此处未列出 OpenClaw 不再调用的、仅用于兼容性的提供方字段，例如
      `ProviderPlugin.capabilities` 和 `suppressBuiltInModel`。

      | 钩子 | 使用时机 |
      | --- | --- |
      | `catalog` | 模型目录或基础 URL 默认值 |
      | `applyConfigDefaults` | 配置物化期间由提供方拥有的全局默认值 |
      | `normalizeModelId` | 查找前清理旧版／预览模型 id 别名 |
      | `normalizeTransport` | 通用模型组装前清理提供方家族的 `api` / `baseUrl` |
      | `normalizeConfig` | 规范化 `models.providers.<id>` 配置 |
      | `applyNativeStreamingUsageCompat` | 面向配置提供方的原生流式用量兼容重写 |
      | `resolveConfigApiKey` | 解析由提供方拥有的环境标记认证 |
      | `resolveSyntheticAuth` | 本地／自托管或基于配置的合成认证 |
      | `resolveExternalAuthProfiles` | 为 CLI／应用管理的凭据叠加由提供方拥有的外部认证配置 |
      | `shouldDeferSyntheticProfileAuth` | 将较低优先级的合成存储配置文件占位符置于环境／配置认证之后 |
      | `resolveDynamicModel` | 接受任意上游模型 ID |
      | `prepareDynamicModel` | 解析前异步获取元数据 |
      | `normalizeResolvedModel` | 在运行器之前执行传输重写 |
      | `normalizeToolSchemas` | 注册前执行由提供方拥有的工具 schema 清理 |
      | `inspectToolSchemas` | 由提供方拥有的工具 schema 诊断 |
      | `resolveReasoningOutputMode` | 带标签与原生 reasoning-output 契约 |
      | `prepareExtraParams` | 默认请求参数 |
      | `createStreamFn` | 完全自定义的 StreamFn 传输 |
      | `wrapStreamFn` | 常规 stream 路径上的自定义请求头／请求体包装器 |
      | `resolveTransportTurnState` | 原生的逐回合请求头／元数据以及 WebSocket 请求头／冷却时间 |
      | `resolveWebSocketSessionPolicy` | 已弃用的 WebSocket 兼容钩子；请使用 `resolveTransportTurnState` |
      | `formatApiKey` | 自定义运行时令牌结构 |
      | `loginOAuth` | 面向会话 SDK `AuthStorage` API 的基于回调的 OAuth 登录 |
      | `refreshOAuth` | 自定义 OAuth 刷新 |
      | `buildAuthDoctorHint` | 认证修复指导 |
      | `matchesContextOverflowError` | 由提供方拥有的溢出检测 |
      | `classifyFailoverReason` | 由提供方拥有的速率限制／过载分类 |
      | `isCacheTtlEligible` | 提示词缓存 TTL 门控 |
      | `buildMissingAuthMessage` | 自定义缺少认证提示 |
      | `augmentModelCatalog` | 合成向前兼容行（已弃用——优先使用 `registerModelCatalogProvider`） |
      | `resolveThinkingProfile` | 特定模型的 `/think` 选项集 |
      | `isBinaryThinking` | 二进制 thinking 开关兼容性（已弃用——优先使用 `resolveThinkingProfile`） |
      | `supportsXHighThinking` | `xhigh` reasoning 支持兼容性（已弃用——优先使用 `resolveThinkingProfile`） |
      | `resolveDefaultThinkingLevel` | 默认 `/think` 策略兼容性 |
      | `isModernModelRef` | 实时／冒烟模型匹配 |
      | `prepareRuntimeAuth` | 推理前的令牌交换 |
      | `resolveUsageAuth` | 自定义用量凭据解析 |
      | `fetchUsageSnapshot` | 自定义用量端点 |
      | `createEmbeddingProvider` | 由提供方拥有的 memory／搜索 embedding 适配器 |
      | `buildReplayPolicy` | 自定义 transcript replay／压缩策略 |
      | `sanitizeReplayHistory` | 通用清理后的提供方特定 replay 重写 |
      | `validateReplayTurns` | 嵌入式运行器之前的严格 replay 回合验证 |
      | `onModelSelected` | 选择后的回调（例如遥测） |

      运行时回退说明：

      - `normalizeConfig` 会为每个提供方 id 解析一个所属插件（先匹配打包提供方，再匹配运行时插件），并且只调用该钩子——不会扫描其他提供方。Google 自己的 `normalizeConfig` 钩子负责规范化 `google` / `google-vertex` / `google-antigravity` 配置条目；它不是独立的核心回退。
      - `resolveConfigApiKey` 会在提供方暴露该钩子时使用它。Amazon Bedrock 在其提供方插件中保留 AWS 环境标记解析；运行时认证本身在配置为 `auth: "aws-sdk"` 时仍使用 AWS SDK 默认链。
      - `resolveThinkingProfile(ctx)` 会接收选定的 `provider`、`modelId`、可选的合并后 `reasoning` 目录提示，以及可选的合并后模型 `compat` 事实。仅使用 `compat` 来选择提供方的 thinking UI／配置文件。
      - `resolveSystemPromptContribution` 允许提供方为某个模型家族注入感知缓存的系统提示词指导。当行为属于某个提供方／模型家族且应保留稳定／动态缓存分离时，优先使用它，而不是旧版的全插件 `before_prompt_build` 钩子。

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
        优先使用 `createRealtimeTranscriptionWebSocketSession(...)`——共享
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
            handlesInputAudioBargeIn: true,
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

        声明 `capabilities`，这样 `talk.catalog` 就可以向浏览器和原生 Talk 客户端公开有效的模式、传输方式、音频格式和功能标志。当传输可以检测到人类正在打断助手播放，且提供方支持截断或清除当前音频响应时，实现 `handleBargeIn`。
        `submitToolResult` 可以在同步提交时返回 `void`，也可以在提供方 bridge 能够公开异步完成边界时返回 `Promise<void>`。Gateway relay 会话会等待该 promise，然后再确认最终结果或清除关联的运行；提交失败时应拒绝该 promise。
        当提供方无法遵守 `options.suppressResponse` 时，设置 `supportsToolResultSuppression: false`。这样 OpenClaw 会避免对内部强制咨询和取消结果进行抑制，并拒绝直接的抑制结果请求，而不是静默启动响应。
        `createRealtimeVoiceBridgeSession` 的使用者同样可以从 `onToolCall` 返回 promise；同步抛出和拒绝会被路由到会话的 `onError` 回调。
        当响应状态为空闲时，主机可以传入 `sendUserMessage(text, { toolChoice })`，以强制该响应调用一个指定名称的函数；后续响应会恢复为会话配置的工具选择。
        仅当提供方 VAD 通过调用 `onClearAudio("barge-in")` 确认中断时，才设置 `handlesInputAudioBargeIn`。省略该标志的提供方会使用 OpenClaw 的本地输入音频回退检测。

        当主机显式协商了由服务器拥有的提供方控制权时，浏览器会话请求可以包含 `gatewayControl`。提供方会保留厂商认证和信令的私有性，在连接附加的控制传输之前调用 `gatewayControl.bindBridge(bridge)`，并通过提供的回调转发 bridge 事件。Gateway 仍然负责工具策略和运行生命周期。不要仅根据模型名称推断或启用此模式。
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
        图像和视频能力使用**感知模式**的结构。图像提供方声明必需的
        `generate` 和 `edit` 能力块；视频提供方声明 `generate`、`imageToVideo` 和
        `videoToVideo`。类似 `maxInputImages`／`maxInputVideos`／`maxDurationSeconds` 的扁平聚合字段不足以清晰地公开变换模式支持或禁用的模式。音乐生成遵循相同的 `generate`／`edit` 模式。

        ```typescript
        api.registerImageGenerationProvider({
          id: "acme-ai",
          label: "Acme Images",
          capabilities: {
            generate: { maxCount: 4, supportsSize: true },
            edit: { enabled: false },
          },
          generateImage: async (req) => ({
            images: [
              {
                buffer: await generateAcmeImageBytes(req),
                mimeType: "image/png",
                fileName: "acme-image.png",
              },
            ],
          }),
        });

        api.registerVideoGenerationProvider({
          id: "acme-ai",
          label: "Acme Video",
          defaultTimeoutMs: 600_000,
          models: ["acme-video", "acme-image-video"],
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
          catalogByModel: {
            "acme-image-video": {
              modes: ["imageToVideo"],
              capabilities: {
                imageToVideo: {
                  enabled: true,
                  maxVideos: 1,
                  maxInputImages: 1,
                  resolutions: ["480P", "720P", "1080P"],
                  supportsResolution: true,
                },
                videoToVideo: { enabled: false },
              },
            },
          },
          generateVideo: async (req) => ({
            videos: [
              {
                url: await generateAcmeVideoUrl(req),
                mimeType: "video/mp4",
              },
            ],
          }),
        });
        ```

        示例中的辅助函数代表提供方调用：图像辅助函数返回非空的编码字节，而视频辅助函数返回托管媒体 URL。视频提供方也可以改为返回非空的编码字节，或者在 URL 是传递回退时同时返回两者。空结果数组和空缓冲区会被视为候选失败，但当视频资源包含可用 URL 时，会忽略空缓冲区并继续使用该 URL。

        两种提供方类型都必须使用 `capabilities`；`edit` 以及视频变换块（`imageToVideo`、`videoToVideo`）始终需要显式的 `enabled` 标志。

        当列出的模型的静态模式或能力与提供方默认值不同时，使用 `catalogByModel`。这些元数据可以在不调用提供方代码的情况下，让 `video_generate action=list` 和模型目录保持准确。请求时的能力查找和强制执行仍应放在 `resolveModelCapabilities` 和 `generateVideo` 中；如有可能，两个路径应复用同一个能力常量。
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
          hint: "Search the web through Acme's search backend.",
          envVars: ["ACME_SEARCH_API_KEY"],
          placeholder: "acme-...",
          signupUrl: "https://acme.example.com/search",
          credentialPath: "plugins.entries.acme.config.webSearch.apiKey",
          getCredentialValue: (searchConfig) => searchConfig?.acme?.apiKey,
          setCredentialValue: (searchConfigTarget, value) => {
            const acme = (searchConfigTarget.acme ??= {});
            acme.apiKey = value;
          },
          createTool: () => ({
            description: "Search the web through Acme Search.",
            parameters: {},
            execute: async (args) => ({ content: [] }),
          }),
        });
        ```

        两种提供方类型共享相同的凭据连接结构：
        `hint`、`envVars`、`placeholder`、`signupUrl`、`credentialPath`、
        `getCredentialValue`、`setCredentialValue` 和 `createTool` 都是
        必需的。
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

`clawhub skill publish <path>` 是用于发布 skill
文件夹的不同命令，而不是用于发布插件包的命令——不要在此处使用它。

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
- [Plugin Internals](/plugins/architecture-internals#provider-runtime-hooks) - hook 详情和捆绑示例。

## 相关内容

- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
- [构建渠道插件](/plugins/sdk-channel-plugins)
