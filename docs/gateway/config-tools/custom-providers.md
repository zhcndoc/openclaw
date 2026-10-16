---
summary: "models.providers 注册、基础 URL 信任以及完整的提供商字段参考"
read_when:
  - "注册自定义或自托管模型提供商"
  - "覆盖提供商基础 URL、传输或 TLS 设置"
  - "声明自定义端点路由的功能"
title: "配置——自定义提供程序和基本 URL"
---

在 `models.providers` 下注册自定义提供商、自定义 `baseUrl` 对网络信任的含义以及完整的提供商字段参考。有关有效配置，请参阅 [ 提供程序示例](/gateway/config-tools/provider-examples)。

## <a id="custom-providers-and-base-urls"></a> 自定义提供商和基本 URL

提供商插件会发布自己的模型目录行。可通过配置中的 `models.providers` 或 `~/.openclaw/agents/<agentId>/agent/models.json` 添加自定义提供商。

配置 custom/local 提供程序 `baseUrl` 也是模型 HTTP 请求的狭义网络信任决策：OpenClaw 允许通过受保护的获取路径精确获取 `scheme://host:port` 源，而无需添加单独的配置选项或信任其他私有源。

```json5
{
  models: {
    mode: "merge", // merge (default) | replace
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "LITELLM_KEY",
        api: "openai-completions", // openai-completions | openai-responses | anthropic-messages | google-generative-ai | etc.
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            contextTokens: 96000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion id="auth-and-merge-precedence" title="验证和合并优先级">
    - 使用 `authHeader: true` + `headers` 满足自定义身份验证需求。
    - 使用 `OPENCLAW_AGENT_DIR` 覆盖 agent 配置根目录。
    - 匹配提供商 ID 的合并优先级：
      - 非空的 agent `models.json` `baseUrl` 值优先。
      - 仅当该提供者在当前 config/auth-profile 上下文中不是 SecretRef 管理时，非空代理 `apiKey` 值才会获胜。
      - SecretRef 托管提供程序 `apiKey` 值从源标记刷新（`ENV_VAR_NAME` 用于环境引用，`secretref-managed` 用于 file/exec/store 引用），而不是保留已解析的机密。
      - SecretRef 管理的提供程序标头值从源标记刷新（`secretref-env:ENV_VAR_NAME` 用于环境引用，`secretref-managed` 用于 file/exec/store 引用）。
      - E 空或缺少代理 `apiKey`/`baseUrl` 回退到配置中的 `models.providers`。
      - 匹配模型`contextWindow`/`maxTokens`：显式配置值在存在且有效时获胜（正有限数）；否则使用 implicit/generated 目录值。
      - 匹配模型的 `contextTokens` 遵循相同的“明确值优先，否则使用隐式值”规则；使用它可以限制有效上下文，而不改变原生模型元数据。
      - 提供商插件目录会作为由插件拥有的生成目录分片存储在 agent 的插件状态下。
      - 当您希望配置完全重写 `models.json` 并跳过插件拥有的目录分片中的合并时，请使用 `models.mode: "replace"`。
      - 标记持久化以源为准：标记会根据活动源配置快照（解析前）写入，而不是根据已解析的运行时密钥值写入。

  </Accordion>
</AccordionGroup>

## <a id="provider-field-details"></a> Provider 字段详细信息

<AccordionGroup>
  <Accordion id="top-level-catalog" title="顶级目录">
    - `models.mode`：提供商目录行为（`merge` 或 `replace`）。
    - `models.providers`：按 provider id 键入的自定义 provider 映射。
      - 安全编辑：使用 `openclaw config set models.providers.<id> '<json>' --strict-json --merge` 或 `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` 进行增量更新。`config set` 会拒绝破坏性替换，除非你传入 `--replace`。

  </Accordion>
  <Accordion id="provider-connection-and-auth" title="提供商连接和身份验证">
    - `models.providers.*.api`：请求适配器（`openai-completions`、`openai-responses`、`openai-chatgpt-responses`、`anthropic-messages`、`google-generative-ai`、`google-vertex`、`github-copilot`、 `bedrock-converse-stream`、`ollama`、`pi-messages`、`azure-openai-responses`）。 `pi-messages` 使用提供商拥有的本机消息传输，由 [Radius 插件 ](/providers/radius) 提供。对于自托管 `/v1/chat/completions` 后端（例如 MLX、vLLM、SGLang 和大多数 OpenAI- 兼容本地服务器），请使用 `openai-completions`。具有 `baseUrl` 但没有 `api` 的自定义提供程序默认为 `openai-completions`；仅当后端支持`/v1/responses`时才设置`openai-responses`。
    - `models.providers.*.apiKey`：provider 凭证（优先使用 SecretRef/env 替换）。
    - `models.providers.*.auth`：认证策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
    - `models.providers.*.maxTokens`：当模型条目未设置 `maxTokens` 时，该 provider 下模型的默认输出 token 上限。
    - `models.providers.*.timeoutSeconds`：可选的按 provider 配置的模型 HTTP 请求超时时间（秒），包括连接、头部、主体以及总请求中止处理。
    - `models.providers.*.injectNumCtxForOpenAICompat`：用于 Ollama + `openai-completions`，将 `options.num_ctx` 注入请求中（默认：`true`）。
    - `models.providers.*.authHeader`：在需要时强制将凭证通过 `Authorization` 头传递。
    - `models.providers.*.baseUrl`：上游 API 基础 URL。
    - `models.providers.*.headers`：proxy/tenant 路由的额外静态标头。

  </Accordion>
  <Accordion id="request-transport-overrides" title="请求传输覆盖">
    `models.providers.*.request`：用于模型 provider HTTP 请求的传输覆盖。

    - `request.headers`：额外头（与 provider 默认值合并）。值支持 SecretRef。
    - `request.auth`：验证策略覆盖。模式：`"provider-default"`（使用提供商的内置身份验证）、`"authorization-bearer"`（使用 `token`）、`"header"`（使用 `headerName`、`value`，可选 `prefix`）。显式选择的 bearer/header 覆盖必须解析为非空凭证；空或不可用的凭据是一个错误，而不是退回到提供商默认值或匿名发送的请求。
    - `request.proxy`：HTTP 代理覆盖。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 环境变量）、`"explicit-proxy"`（配合 `url`）。两种模式都支持可选的 `tls` 子对象。
    - `request.tls`：直接连接的 TLS 覆盖。字段：`ca`、`cert`、`key`、`passphrase`（均支持 SecretRef）、`serverName`、`insecureSkipVerify`。
    - `request.allowPrivateNetwork`：当 `true` 时，允许受保护的模型提供者 HTTP 和 WebSocket 通过共享专用网络策略向专用、CGNAT 或类似范围发出请求。 Custom/local 提供商基本 URL 已信任确切配置的源，但元数据、链接本地和本地使用 NAT64 （`64:ff9b:1::/48`） 源除外，这些源在没有明确选择加入的情况下仍会被阻止。将其设置为 `false` 以选择退出确切来源信任。默认`false`。

  </Accordion>
  <Accordion id="model-catalog-entries" title="模型目录条目">
    - `models.providers.*.models`：显式提供者模型目录条目和元数据覆盖。在合并模式下，这些行不会限制合格的提供者发现。使用 `agents.defaults.modelPolicy.allow`（或每代理策略）来限制选择，或使用 `models.mode: "replace"` 仅使用配置的清单而不进行发现。
    - `models.providers.*.models.*.input`：模型输入方式。对于纯文本模型使用 `["text"]`，对于本机 image/vision 模型使用 `["text", "image"]`。仅当所选模型被标记为支持图像时，图像附件才会注入到代理轮次中。
    - `models.providers.*.models.*.contextWindow`：该模型的本机上下文窗口元数据。
    - `models.providers.*.models.*.contextTokens`：该模型可选有源输入电容；当您想要与模型的原生 `contextWindow` 不同的有效预算时使用它； `openclaw models list` 在两者不同时显示两者。
    - `models.providers.*.models.*.responseModelEquivalent`：配置中用户创建的自定义提供者行的可选布尔值。当路由器或代理自行解析此模型 ID 并报告其服务的具体模型时，设置 `true`。然后，OpenClaw 将该端点的任何响应模型视为请求的路由，包括端点内部替换。所服务的模型 ID 和使用情况在元数据中仍然可见，但不会向父代理通告模型路由更改。 OpenClaw 回退并覆盖另一个配置的模型或提供程序仍然会产生通知。捆绑式和官方提供商政策仍然具有权威性；即使提供者没有等效挂钩，此键也无法覆盖它。 Plugin/catalog 行、代理 `models.json` 行和标记为 `metadataSource: "models-add"` 的行无法授予等效性。省略或`false`保留正常的路由检测。此可选密钥不需要 Doctor 迁移。

    #### <a id="custom-provider-capability-declarations"></a> 自定义 provider 能力声明

    provider 目录负责维护内置模型路由和目录已知模型路由的 `compat`。不要将这些标志复制到配置中：当已配置的 `api` 和 `baseUrl` 仍能标识该路由时，OpenClaw 会使用目录行。`openclaw doctor --fix` 会移除匹配的旧版覆盖，并报告存在差异的值供审核。

    对于真正的自定义 provider、自定义模型，或路由到不同端点的目录模型，仍支持使用 `compat` 块。仅设置已针对该端点验证过的能力：

    | 自定义路由键 | 运行时契约 |
    | --- | --- |
    | `supportsStore` | 接受 OpenAI 的 `store` 请求字段。 |
    | `supportsPromptCacheKey` | 接受 OpenAI 提示 - cache/session-affinity 键。 |
    | `supportsDeveloperRole` | 接受 `developer` 消息，而不要求使用 `system`。 |
    | `supportsReasoningEffort` | 接受推理努力控制。自定义 `openai-completions` 路由默认为标记为 `reasoning: true` 的模型启用此功能；设置 `false` 选择退出。 |
    | `supportsTemperature` | 接受此模型和适配器的 `temperature`。 |
    | `supportsUsageInStreaming` | 在流式响应中发出用量元数据。 |
    | `supportsInstructions` | 仅响应 API：通过顶层 `instructions` 接受系统提示，而不是嵌入到 `input` 中。默认为 `true` 仅适用于本机 OpenAI 和 xAI 的主路由 - 具有已确认合同证据的两条路由。所有其他路由（捆绑或自定义）默认为 `false`；一旦针对该端点进行验证，就显式设置。 |
    | `supportsTools` | 支持结构化tool/function呼叫。设置 `false` 以禁用工具。 |
    | `supportsStrictMode` | 接受 `strict` 工具字段。在兼容的完成和响应路由上，`true` 允许显式 `strict: false`，因此可选工具参数仍然是可选的。 |
    | `requiresStringContent` | 要求 Chat Completions 消息内容为普通字符串。 |
    | `strictMessageKeys` | 要求传出的消息仅包含可接受的键。 |
    | `visibleReasoningDetailTypes` | 可安全显示在记录中的推理详细信息块类型名称。 |
    | `supportedReasoningEfforts` | 列出端点可接受的推理标签。请求被限制在这个阶梯上。未知模型默认为 `low`、`medium` 和 `high`。 |
    | `reasoningEffortMap` | 将 OpenClaw 思维标签映射到特定于端点的标签。默认情况下，自定义完成路线会省略 `off` 的工作量；显式关闭映射可以发送端点接受的禁用值。 |
    | `maxTokensField` | 选择 `max_tokens` 或 `max_completion_tokens`。 |
    | `thinkingFormat` | 选择端点的推理负载方言。 |
    | `requiresToolResultName` | 要求工具结果消息包含工具名称。 |
    | `requiresAssistantAfterToolResult` | 要求工具结果之后有一条 assistant 消息。 |
    | `requiresThinkingAsText` | 将推理作为文本而非结构化内容重放。 |
    | `requiresReasoningContentOnAssistantMessages` | 在重放期间保留 DeepSeek- 样式 `reasoning_content`。 |
    | `toolSchemaProfile` | 选择工具模式标准化配置文件。自定义模型条目可识别 `llamacpp` 和 `gemini`。 `llamacpp` 配置文件删除了 2000 或以上的 `pattern` 和 `maxLength` 值；内置 `llama-cpp`、`ollama` 和 `lmstudio` 提供程序会自动应用相同的清洁程序。指向 llama-server 的自定义提供程序 ID 必须显式选择它。请参阅 [llama.cpp 示例 ](/gateway/config-tools/provider-examples#local-models-llama-cpp-llama-server)。 |
    | `unsupportedToolSchemaKeywords` | 在发送工具 schema 之前，移除端点拒绝的指定 JSON Schema 关键字。用于处理超出配置针对性转换范围的端点特定缺陷。 |
    | `toolCallArgumentsEncoding` | 选择端点的工具调用参数编码。 |
    | `requiresOpenAiAnthropicToolPayload` | 将 OpenAI- 形工具调用转换为 Anthropic- 系列有效负载。 |

    升级后，带有 `reasoning: true` 的现有自定义 `openai-completions` 模型开始发送 `reasoning_effort` 以启用思维，除非明确选择退出。如果服务器拒绝该字段，则请求错误会指定补救措施：在 `models.providers.<provider>.models` 中的该条目上设置 `compat.supportsReasoningEffort: false`。有关工作量映射和 `/think off` 行为，请参阅 [ 自定义端点思维 ](/tools/thinking#custom-openai-compatible-endpoints)。

    未知远程 `openai-completions` 端点默认为 `supportsUsageInStreaming: false`，因此 OpenClaw 不会请求 `stream_options.include_usage`。环回端点和捆绑的 llama.cpp、LM Studio、Ollama 和 vLLM 提供程序已请求或收集使用情况。对于支持此选项的自定义远程服务器，请在每个模型条目上设置 `compat.supportsUsageInStreaming: true`。当启用此选项时，Ollama `/v1` 和 LM Studio 返回流式使用情况。

    当成功的流未返回任何使用情况时，OpenClaw 会将提供程序上下文使用标记为不可用，因此压缩会使用内容估计，而不是将缺失计数视为零。估计值是近似值；令牌和成本核算无法从丢失的使用记录中恢复。禁用流使用的自定义远程端点还会为每个模型记录一次 `<provider>/<model> returned no token usage`，并使用上面的配置提示。

  </Accordion>
  <Accordion id="amazon-bedrock-discovery" title="Amazon Bedrock发现">
    - `plugins.entries.amazon-bedrock.config.discovery`：Bedrock 自动发现设置根。
    - `plugins.entries.amazon-bedrock.config.discovery.enabled`：转隐式发现on/off.
    - `plugins.entries.amazon-bedrock.config.discovery.region`：用于发现的 AWS 区域。
    - `plugins.entries.amazon-bedrock.config.discovery.providerFilter`：用于定向发现的可选 provider-id 过滤器。
    - `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`：发现刷新的轮询间隔。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`：已发现模型的回退上下文窗口。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`：已发现模型的回退最大输出 token。

  </Accordion>
</AccordionGroup>

交互式定制提供商入门推断已知视觉模型 ID 模式的图像输入，包括 GPT-4o/GPT-4.1/GPT-5+、`o1`/`o3`/`o4` 推理系列、Claude、Gemini、任何 `-vl`- 后缀的 ID （Qwen-VL 和类似），以及 LLaVA、Pixtral、InternVL、Mllama、MiniCPM-V 和 GLM-4V 等命名系列；它会跳过已知纯文本系列（Llama、DeepSeek、Mistral/Mixtral、Kimi/Moonshot、Codestral、Devstral、Phi、QwQ、CodeLlama 和裸 Qwen id 的额外问题） vl/vision 后缀）。未知模型 ID 仍会提示图像支持。非交互式入门引导使用相同的推论；通过 `--custom-image-input` 强制使用图像元数据或 `--custom-text-input` 强制使用纯文本元数据。
