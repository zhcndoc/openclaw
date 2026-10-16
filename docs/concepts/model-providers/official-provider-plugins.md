---
summary: "捆绑提供程序插件、捆绑提供程序表和提供程序怪癖的每个提供程序设置。"
read_when:
  - "您正在设置捆绑提供程序，例如 OpenAI、Anthropic 或 Google"
  - "您需要捆绑的提供商 ID、身份验证环境和示例模型"
  - "您遇到了特定于提供商的怪癖"
title: "官方提供商插件"
---

## <a id="official-provider-plugins"></a> 官方提供商插件

官方提供商插件会发布自己的模型目录条目。这些提供商**不需要**`models.providers`模型条目；只需启用提供商插件、完成身份验证并选择模型。仅当你需要明确自定义提供商或设置更严格的请求参数（例如超时时间）时，才使用`models.providers`。

### OpenAI

- 提供商：`openai`
- 认证：`OPENAI_API_KEY`
- 可选轮换：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，以及 `OPENCLAW_LIVE_OPENAI_KEY`（单一覆盖）
- 新设置默认值：`openai/gpt-6-astra`。
- 示例模型：`openai/gpt-6-astra`、`openai/gpt-5.6-sol`、`openai/gpt-5.6-terra`、`openai/gpt-5.6-luna`、`openai/gpt-5.5`；仍然支持裸直接 API `openai/gpt-5.6` 别名。
- 如果特定安装或 API 密钥的行为不同，请使用 `openclaw models list --provider openai` 验证 account/model 的可用性。
- CLI: `openclaw onboard --auth-choice openai-api-key`
- 直接 OpenAI API-key Responses 请求默认为 `"sse"`。
- 通过 `agents.defaults.models["openai/<model>"].params.transport`（`"sse"`、`"websocket"`、`"websocket-cached"` 或 `"auto"`）覆盖每个模型。缓存的 WebSockets 重用会话连接，并在历史记录仍然匹配时仅使用 `previous_response_id` 发送新输入。
- `"sse"` 传输还支持在确切的公共 `https://api.openai.com/v1` 基础 URL 上对本机 `openai/openai-responses` 模型进行 HTTP 延续（ChatGPT/Codex `openai-chatgpt-responses` 路由被排除并故意保留） `store: false`）：OpenClaw 缓存每个会话+凭证的请求，并且当下一回合的历史记录是严格扩展时，仅发送新输入加上 `previous_response_id`，而不是完整的增长历史记录。 rejected/expired `previous_response_id`（零数据保留，TTL 驱逐）在同一轮中重试一次，并发出完整请求。
  - 进程内缓存在 90 分钟没有轮流后驱逐会话的基线；比这更长的间隙会重新发送完整历史记录一次并开始新的基线。这是固定的默认设置，不是操作员可配置的设置。
  - 对于自定义 `openai-responses` 模型，请在验证其端点支持存储的响应和 `previous_response_id` 后设置 `models.providers.<provider>.models[].compat.supportsResponsesContinuation: true`。这使得该模型能够使用 `store: true`，即使转弯无法继续，后端也可以保留请求。其他自定义模型保持无状态。 `compat.supportsStore: false` 禁用此选择加入。 `azure-openai-responses` 和 ChatGPT/Codex 传输以及 `azure-openai` 和 `azure-openai-responses` 提供商 ID 均被排除。
- 使用 `params.serviceTier` 或 `params.service_tier` 设置明确的 OpenAI API 服务层级；快速模式（以前称为 Priority processing）使用 `service_tier=priority`。
- 在本机公共 OpenAI 和 ChatGPT/Codex 响应请求上，优先级是 payload/transport `service_tier`，然后是有效的显式模型参数，然后是快速模式默认值。
- `/fast` 和有效的 `params.fastMode`／`params.fast_mode` 值是共享的代理运行时控制项；对于直接嵌入的 `openai/*` Responses 请求，仅当不存在更高优先级的层级时，它们才会提供 `service_tier=priority`。
- Hidden OpenClaw 归因标头（`originator`、`version`、`User-Agent`）仅适用于到 `api.openai.com` 的本机 OpenAI 流量，不适用于通用 OpenAI- 兼容代理
- Native OpenAI 提供商管理的存储、提示缓存提示和推理负载整形未更改。原始本机传输调用默认保留 `store: false`。自定义模型延续选择仅启用存储；它不启用提示缓存提示或服务器压缩。
- `openai/gpt-5.3-codex-spark` 仅可通过 ChatGPT/Codex OAuth 使用；直接 OpenAI API-key 和 Azure API-key 路由会拒绝它

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-6-astra" } } },
}
```

如果 API 组织未公开 GPT-5.6，请显式设置为 `openai/gpt-5.5`。正常的 onboarding 和重新认证会保留已有的显式主模型；`models auth login --set-default` 和 `models set` 是有意进行替换的路径。

### Anthropic

- 提供商：`anthropic`
- 认证：`ANTHROPIC_API_KEY`
- 可选轮换：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，以及 `OPENCLAW_LIVE_ANTHROPIC_KEY`（单一覆盖）
- 示例模型：`anthropic/claude-opus-5-5`
- CLI: `openclaw onboard --auth-choice apiKey`
- Direct公共Anthropic请求支持共享`/fast`切换和`params.fastMode`，包括发送到`api.anthropic.com`的API-key和OAuth-经过身份验证的流量； OpenClaw 将其映射到 Anthropic `service_tier`（`auto` 与 `standard_only`）
- Preferred Claude CLI 配置将模型引用保持在标准形式，并单独选择 CLI 后端：`anthropic/claude-opus-5-5` 和模型范围的 `agentRuntime.id: "claude-cli"`。旧版 `claude-cli/claude-opus-4-7` 参考仍然适用于兼容性。

<Note>
Claude CLI 复用（`claude -p`）是 OpenClaw 认可的集成路径。仍然支持 Anthropic 的 setup-token 认证，但在可用时 OpenClaw 更倾向于使用 Claude CLI 复用。
</Note>

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-5-5" } } },
}
```

### OpenAI ChatGPT/Codex OAuth

- 提供商：`openai`
- 认证：OAuth（ChatGPT）
- 新鲜本机 Codex 应用程序服务器harness参考：`openai/gpt-6-astra`
- 原生 Codex app-server harness 文档：[Codex harness](/plugins/codex-harness)
- 当账户支持时，Astra （`openai/gpt-6-astra`） 默认为 `medium` 推理工作。 [OpenAI 提供程序 default](/providers/openai/models#gpt-6-astra) 由模型控件和两个运行时共享；明确的思维设置优先。
- 旧版模型引用：`codex/gpt-*`、`openai-codex/gpt-*`
- 插件边界：`openai/*` 会加载 OpenAI 插件；是否选择原生 Codex app-server 插件，则由显式运行时策略或提供商所属的有效路由决定。
- CLI：`openclaw onboard --auth-choice openai` 或 `openclaw models auth login --provider openai`
- OpenClaw 的嵌入式 ChatGPT 响应传输默认为 `auto`（首先是 WebSocket-，后备是 SSE）。
- `agents.defaults.models["openai/<model>"].params.transport` 和 `params.serviceTier` 是由内置提供商编写的请求设置。它们会将隐式运行时选择保留在 OpenClaw 中；原生 Codex 负责其 app-server 的传输方式和服务层级。
- 有效的模型级 `params.fastMode` / `params.fast_mode` 值以及有效的截断键，是可移植的、类型化的代理运行时控制项。它们不计入由用户编写的提供商请求参数，也不会选择运行时。当配方依赖某个运行时时，请固定 `agentRuntime.id: "openclaw"` 或 `agentRuntime.id: "codex"`。
- 隐OpenClaw归因标头 （`originator`， `version`， `User-Agent`） 仅附加在本机上Codex交通至`chatgpt.com/backend-api`，不是通用的OpenAI-兼容代理
- 共享的 `/fast` 切换、配置的默认值和有效的模型范围快速参数通过一个运行时控制策略进行解析。请参阅 [ 思维水平 ](/tools/thinking#fast-mode-%2Ffast) 了解优先顺序。
- OpenAI API 快速模式价格昂贵且特定于模型。 GPT-5.6 Sol 目前的成本是标准代币定价的 2 倍，以及长上下文乘数堆栈。 ChatGPT/Codex-credit 快速模式是独立的：GPT-5.6 和 GPT-5.5 当前消耗 2.5× 标准积分，而 API-key Codex 运行使用 API 代币定价。请参阅 [ 快速模式](https://openai.com/api-priority-processing/)、[API 定价](https://developers.openai.com/api/docs/pricing) 和[Codex 速度](https://learn.chatgpt.com/docs/agent-configuration/speed)。
- 原生 Codex 目录可根据账户访问权限公开精确的 `openai/gpt-5.6-sol`、`openai/gpt-5.6-terra` 和 `openai/gpt-5.6-luna` 引用。它不会在客户端应用直接 API 的裸 `gpt-5.6` 别名。
- `openai/gpt-5.5` 使用 Codex 目录中的原生 `contextWindow = 400000`，以及默认运行时 `contextTokens = 272000`；可通过 `models.providers.openai.models[].contextTokens` 覆盖运行时上限。
- 使用 `openai` 身份验证登录并使用 `openai/gpt-6-astra` 进行全新的订阅支持设置。如果 Codex 工作区不公开 Astra，则显式选择 `openai/gpt-5.5`。
- 使用 provider/model `agentRuntime.id: "openclaw"` 在内置运行时上保留其他合格的路由。在运行时未设置或 `auto` 的情况下，只有没有编写的提供程序请求覆盖的确切官方 HTTPS Responses/ChatGPT-compatible 路由可以隐式选择 Codex。
- Legacy Codex GPT 参考是旧状态，而不是实时提供者路由。使用标准 `openai/*` 引用进行新代理配置，并运行 `openclaw doctor --fix` 来迁移 `codex/*` 和 `openai-codex/*` 引用，同时保留其本机 Codex 语义与模型范围的 `agentRuntime.id: "codex"`。现有的显式 `openai/gpt-5.5` 选择不会升级。

```json5
{
  plugins: { entries: { codex: { enabled: true } } },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-6-astra" },
    },
  },
}
```

```json5
{
  models: {
    providers: {
      openai: {
        models: [{ id: "gpt-5.5", contextTokens: 160000 }],
      },
    },
  },
}
```

### <a id="other-subscription-style-hosted-options"></a> 其他订阅式托管选项

<CardGroup cols={3}>
  <Card title="MiniMax" href="/providers/minimax">
    MiniMax 编程计划 OAuth 或 API 密钥访问。
  </Card>
  <Card title="Qwen 云" href="/providers/qwen">
    Qwen Cloud 提供商界面，以及阿里巴巴 DashScope 和编程计划端点映射。
  </Card>
  <Card title="Z.AI (GLM)" href="/providers/zai">
    Z.AI 编程计划或通用 API 端点。
  </Card>
</CardGroup>

### OpenCode

- 认证：`OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）
- Zen 运行时提供商：`opencode`
- Go 运行时提供商：`opencode-go`
- 示例模型：`opencode/claude-opus-4-6`、`opencode-go/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### <a id="google-gemini-(api-key)"></a><a id="google-gemini-api-key"></a> Google Gemini（API 密钥）

- 提供者：`google`
- 认证：`GEMINI_API_KEY`
- 可选轮换：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 回退，以及 `OPENCLAW_LIVE_GEMINI_KEY`（单一覆盖）
- 默认模型：`google/gemini-4-argon`
- 其他捆绑模型包括`google/gemini-3.8-flash`和`google/gemini-3.5-flash-lite`
- 兼容性：使用 `google/gemini-3.1-flash-preview` 的旧版 OpenClaw 配置会被规范化为 `google/gemini-3-flash-preview`
- 别名：`google/gemini-3.1-pro` 被接受并标准化为 Google 的实时 Gemini API id、`google/gemini-3.1-pro-preview`
- CLI: `openclaw onboard --auth-choice gemini-api-key`
- 思考：`/think adaptive` 使用 Google 动态思考。Gemini 3/3.1 不使用固定的 `thinkingLevel`；Gemini 2.5 会发送 `thinkingBudget: -1`
- 直接运行 Gemini 还支持 `agents.defaults.models["google/<model>"].params.cachedContent`（或旧版 `cached_content`），以传递提供方原生的 `cachedContents/...` 句柄；Gemini 的缓存命中会作为 OpenClaw 的 `cacheRead` 显示

### <a id="google-vertex-and-gemini-cli-runtime"></a> Google Vertex 和 Gemini CLI 运行时

- `google-vertex`：通过 gcloud 应用程序默认凭据托管 Google 云访问。通过在网关服务环境中识别出的 ADC 文件加上 `GOOGLE_CLOUD_PROJECT`（或 `GCLOUD_PROJECT`）和 `GOOGLE_CLOUD_LOCATION`，OpenClaw 会自动发现提供商，无需存储凭证。对于仅元数据凭证或显式覆盖，通过存储文字标记值 `gcp-vertex-credentials` 来选择 ADC 路径。其他存储的值作为 API 密钥发送，而不是作为 ADC 凭证发送；不要粘贴 OAuth 访问令牌。请参阅 [Google 提供商设置](/providers/google)。
- `google-gemini-cli`：显式配置的标准 `google/*` 模型的可选本地运行时。

OpenClaw 不会创建 Gemini CLI OAuth 或反重力 OAuth 配置文件。通过 AI Studio API 密钥或 Vertex AI 连接 Google。如果您明确选择 Gemini CLI 运行时，则它可以使用选定的 Google API-key 配置文件。现有有效的 Gemini CLI OAuth 配置文件保持运行时兼容，但它们不是设置或恢复路径。

Gemini CLI 默认使用 `stream-json`。OpenClaw 会读取 assistant 流消息，并将 `stats.cached` 规范化为 `cacheRead`；旧的 `--output-format json` 覆盖仍会从 `response` 读取回复文本。

### Z.AI (GLM)

- 提供商：`zai`
- 认证：`ZAI_API_KEY`
- 示例模型：`zai/glm-5.2`
- CLI: `openclaw onboard --auth-choice zai-api-key`
  - Model 参考使用标准 `zai/*` 提供程序 ID。
  - `zai-api-key` 会自动检测匹配的 Z.AI 端点；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 会强制使用特定表面。

### <a id="vercel-ai-gateway"></a> Vercel AI 网关

- 提供商：`vercel-ai-gateway`
- 认证：`AI_GATEWAY_API_KEY`
- 示例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`、`vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI: `openclaw onboard --auth-choice ai-gateway-api-key`

### <a id="other-bundled-provider-plugins"></a> 其他捆绑提供商插件

| 提供者                                | Id                               | 认证环境变量                                       | 示例模型                                              |
| --------------------------------------- | -------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| [Arcee](/providers/arcee)               | `arcee`                          | `ARCEEAI_API_KEY` 或 `OPENROUTER_API_KEY`      | `arcee/trinity-large-thinking`                             |
| BytePlus                                | `byteplus` / `byteplus-plan`     | `BYTEPLUS_API_KEY`                             | `byteplus-plan/ark-code-latest`                            |
| Cerebras                                | `cerebras`                       | `CEREBRAS_API_KEY`                             | `cerebras/gpt-oss-120b`                                    |
| Chutes                                  | `chutes`                         | `CHUTES_API_KEY` 或 `CHUTES_OAUTH_TOKEN`       | `chutes/zai-org/GLM-5-TEE`                                 |
| ClawRouter                              | `clawrouter`                     | `CLAWROUTER_API_KEY`                           | `clawrouter/anthropic/claude-sonnet-4-6`                   |
| Cohere                                  | `cohere`                         | `COHERE_API_KEY`                               | `cohere/command-a-plus-05-2026`                            |
| DeepInfra                               | `deepinfra`                      | `DEEPINFRA_API_KEY`                            | `deepinfra/deepseek-ai/DeepSeek-V4-Flash`                  |
| DeepSeek                                | `deepseek`                       | `DEEPSEEK_API_KEY`                             | `deepseek/deepseek-v4-flash`                               |
| Featherless AI                          | `featherless`                    | `FEATHERLESS_API_KEY`                          | `featherless/Qwen/Qwen3-32B`                               |
| GitHub Copilot                          | `github-copilot`                 | `COPILOT_GITHUB_TOKEN`                         | -                                                          |
| GMI Cloud                               | `gmi`                            | `GMI_API_KEY`                                  | `gmi/google/gemini-3.1-flash-lite`                         |
| Groq                                    | `groq`                           | `GROQ_API_KEY`                                 | `groq/openai/gpt-oss-120b`                                 |
| Hugging Face 推理                  | `huggingface`                    | `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`          | `huggingface/deepseek-ai/DeepSeek-R1`                      |
| MiniMax                                 | `minimax` / `minimax-portal`     | `MINIMAX_API_KEY` / `MINIMAX_OAUTH_TOKEN`      | `minimax/MiniMax-M3`                                       |
| Mistral                                 | `mistral`                        | `MISTRAL_API_KEY`                              | `mistral/mistral-large-latest`                             |
| Moonshot                                | `moonshot`                       | `MOONSHOT_API_KEY`                             | `moonshot/kimi-k2.6`                                       |
| NVIDIA                                  | `nvidia`                         | `NVIDIA_API_KEY`                               | `nvidia/nvidia/nemotron-3-ultra-550b-a55b`                 |
| NovitaAI                                | `novita`                         | `NOVITA_API_KEY`                               | `novita/deepseek/deepseek-v3-0324`                         |
| [Ollama Cloud](/providers/ollama-cloud) | `ollama-cloud`                   | `OLLAMA_API_KEY`                               | `ollama-cloud/kimi-k2.6`                                   |
| OpenRouter                              | `openrouter`                     | OpenRouter OAuth 或 `OPENROUTER_API_KEY`       | `openrouter/auto`                                          |
| Qianfan                                 | `qianfan`                        | `QIANFAN_API_KEY`                              | `qianfan/deepseek-v3.2`                                    |
| 腾讯TokenHub                        | `tencent-tokenhub`               | `TOKENHUB_API_KEY`                             | `tencent-tokenhub/hy3-preview`                             |
| Together                                | `together`                       | `TOGETHER_API_KEY`                             | `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`         |
| Venice                                  | `venice`                         | `VENICE_API_KEY`                               | -                                                          |
| Vercel AI 网关                       | `vercel-ai-gateway`              | `AI_GATEWAY_API_KEY`                           | `vercel-ai-gateway/anthropic/claude-opus-4.6`              |
| 火山发动机 （Doubao）                 | `volcengine` / `volcengine-plan` | `VOLCANO_ENGINE_API_KEY`                       | `volcengine-plan/ark-code-latest`                          |
| xAI                                     | `xai`                            | SuperGrok/X Premium OAuth 或 `XAI_API_KEY`     | `xai/grok-4.7`                                             |
| 小米                                  | `xiaomi` / `xiaomi-token-plan`   | `XIAOMI_API_KEY` / `XIAOMI_TOKEN_PLAN_API_KEY` | `xiaomi/mimo-v2.6-pro` / `xiaomi-token-plan/mimo-v2.6-pro` |

#### <a id="quirks-worth-knowing"></a> 值得注意的特殊行为

<AccordionGroup>
  <Accordion title="OpenRouter">
    仅在经过验证的 `openrouter.ai` 路由上应用其应用属性标头和 Anthropic `cache_control` 标记。 DeepSeek、Moonshot 和 ZAI 引用是符合 OpenRouter- 托管提示缓存条件的缓存 TTL，但不接收 Anthropic 缓存标记。作为代理样式的 OpenAI- 兼容路径，它跳过本机 OpenAI-only 整形（`serviceTier`、响应 `store`、提示缓存提示、OpenAI 推理兼容）。 Gemini-支持的参考仅保留代理Gemini思想签名卫生。
  </Accordion>
  <Accordion title="Kilo Gateway">
    Gemini-backed refs遵循相同的proxy-Gemini卫生路径； `kilocode/kilo-auto/balanced` 和其他不支持代理推理的引用跳过代理推理注入。
  </Accordion>
  <Accordion title="MiniMax">
    API-key onboarding 写入明确的 M3 和 M2.7 聊天模型定义；图像理解保留在插件拥有的 `MiniMax-VL-01` 媒体提供商上。
  </Accordion>
  <Accordion title="NVIDIA">
    模型 ID 使用 `nvidia/<vendor>/<model>` 命名空间（例如 `nvidia/nvidia/nemotron-...`）；选择器保留文字 `<provider>/<model-id>` 组合，而发送到 API 的标准化密钥保持单前缀。
  </Accordion>
  <Accordion title="xAI">
    使用 xAI 响应路径。推荐路径为SuperGrok/X Premium OAuth； OAuth 和 API-key 设置使用策划的 `xai/grok-4.7` 默认值。现有的主要模型保持固定。运行 `openclaw doctor --fix` 以修复本机 API 和订阅路由上已停用的 `xai/auto` 选择。 API 密钥仍然可以通过 `XAI_API_KEY` 或插件配置使用。 Grok `web_search` 在 API-key 回退之前重复使用相同的身份验证配置文件。较旧的 `/fast` 和 `params.fastMode: true` 配置仍可通过 xAI 的 Grok 4.3 兼容性重定向进行解析，但新配置应直接选择当前模型。 `tool_stream` 默认开启；通过 `agents.defaults.models["xai/<model>"].params.tool_stream=false` 禁用。
  </Accordion>
</AccordionGroup>
