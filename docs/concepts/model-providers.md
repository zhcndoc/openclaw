---
summary: "模型提供商概述及示例配置 + CLI 流程"
read_when:
  - 你需要按提供商查找模型设置参考
  - 你想获取模型提供商的示例配置或 CLI 入门命令
title: "Model providers"
---

此页面涵盖 **LLM/模型提供商**（而不是 WhatsApp/Telegram 之类的聊天频道）。
有关模型选择规则，请参见 [/concepts/models](/concepts/models)。

## 快速规则

- 模型引用使用 `provider/model`（示例：`opencode/claude-opus-4-6`）。
- `agents.defaults.models` 在设置后充当允许列表。
- CLI 帮助命令：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
- `models.providers.*.models[].contextWindow` 是原生模型元数据；`contextTokens` 是实际运行时上限。
- 回退规则、冷却探测和会话覆盖持久化：[模型故障转移](/concepts/model-failover)。
- OpenAI 系列路由具有前缀特定性：`openai/<model>` 使用 PI 中的直接 OpenAI API key 提供商，`openai-codex/<model>` 使用 PI 中的 Codex OAuth，而 `openai/<model>` 加上 `agents.defaults.embeddedHarness.runtime: "codex"` 则使用原生 Codex 应用服务器 harness。参见 [OpenAI](/providers/openai)
  和 [Codex harness](/plugins/codex-harness)。
- 插件自动启用遵循同样的边界：`openai-codex/<model>` 属于 OpenAI 插件，而 Codex 插件则通过
  `embeddedHarness.runtime: "codex"` 或旧式 `codex/<model>` 引用启用。
- CLI 运行时使用相同的拆分方式：选择规范模型引用，如
  `anthropic/claude-*`、`google/gemini-*` 或 `openai/gpt-*`，然后在需要本地 CLI 后端时将
  `agents.defaults.embeddedHarness.runtime` 设为 `claude-cli`、
  `google-gemini-cli` 或 `codex-cli`。旧式 `claude-cli/*`、`google-gemini-cli/*` 和 `codex-cli/*` 引用会迁移回规范的提供商引用，并将运行时单独记录。
- GPT-5.5 目前可通过订阅/OAuth 路由使用：
  在 PI 中使用 `openai-codex/gpt-5.5`，或使用 Codex 应用服务器
  harness 的 `openai/gpt-5.5`。一旦 OpenAI 在公共 API 上启用 GPT-5.5，
  直接 API key 路由的 `openai/gpt-5.5` 就会受支持；在此之前，请使用
  API 可用的模型，例如 `openai/gpt-5.4`，用于 `OPENAI_API_KEY` 配置。

## 插件拥有的提供商行为

大多数提供商特定逻辑都位于提供商插件（`registerProvider(...)`）中，而 OpenClaw 只保留通用推理循环。插件负责入门配置、模型目录、认证环境变量映射、传输/配置规范化、工具 schema 清理、故障转移分类、OAuth 刷新、用量报告、thinking/reasoning 配置文件等。

完整的提供商 SDK hooks 和捆绑插件示例列表请参见 [Provider plugins](/plugins/sdk-provider-plugins)。需要完全自定义请求执行器的提供商，则属于更独立、更深入的扩展层。

<Note>
Provider runtime `capabilities` 是共享的运行器元数据（提供商家族、转录/工具使用怪癖、传输/缓存提示）。它不同于 [public capability model](/plugins/architecture#public-capability-model)，后者描述的是插件注册了什么（文本推理、语音等）。
</Note>

## API 密钥轮换

- 支持所选提供商的通用提供商轮换。
- 通过以下方式配置多个密钥：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个实时覆盖，最高优先级）
  - `<PROVIDER>_API_KEYS`（逗号或分号列表）
  - `<PROVIDER>_API_KEY`（主密钥）
  - `<PROVIDER>_API_KEY_*`（编号列表，例如 `<PROVIDER>_API_KEY_1`）
- 对于 Google 提供商，`GOOGLE_API_KEY` 也作为后备包含在内。
- 密钥选择顺序保留优先级并去重值。
- 仅在速率限制响应时使用下一个密钥重试请求（例如 `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 或周期性用量限制消息）。
- 非速率限制失败立即失败；不尝试密钥轮换。
- 当所有候选密钥都失败时，返回最后一次尝试的最终错误。

## 内置提供商（pi-ai 目录）

OpenClaw 自带 pi-ai 目录。这些提供商无须配置 `models.providers`，只需设置认证并选择模型。

### OpenAI

- Provider: `openai`
- Auth: `OPENAI_API_KEY`
- Optional rotation: `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, plus `OPENCLAW_LIVE_OPENAI_KEY` (single override)
- Example models: `openai/gpt-5.4`, `openai/gpt-5.4-mini`
- GPT-5.5 direct API support is future-ready here once OpenAI exposes GPT-5.5 on the API
- CLI: `openclaw onboard --auth-choice openai-api-key`
- Default transport is `auto` (WebSocket-first, SSE fallback)
- Override per model via `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"`, or `"auto"`)
- OpenAI Responses WebSocket warm-up defaults to enabled via `params.openaiWsWarmup` (`true`/`false`)
- OpenAI priority processing can be enabled via `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` and `params.fastMode` map direct `openai/*` Responses requests to `service_tier=priority` on `api.openai.com`
- Use `params.serviceTier` when you want an explicit tier instead of the shared `/fast` toggle
- Hidden OpenClaw attribution headers (`originator`, `version`,
  `User-Agent`) apply only on native OpenAI traffic to `api.openai.com`, not
  generic OpenAI-compatible proxies
- Native OpenAI routes also keep Responses `store`, prompt-cache hints, and
  OpenAI reasoning-compat payload shaping; proxy routes do not
- `openai/gpt-5.3-codex-spark` is intentionally suppressed in OpenClaw because live OpenAI API requests reject it and the current Codex catalog does not expose it

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供商：`anthropic`
- 认证：`ANTHROPIC_API_KEY`
- 可选轮换：`ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, 加上 `OPENCLAW_LIVE_ANTHROPIC_KEY` (单个覆盖)
- 示例模型：`anthropic/claude-opus-4-6`
- CLI: `openclaw onboard --auth-choice apiKey`
- 直接公共 Anthropic 请求支持共享的 `/fast` 切换和 `params.fastMode`，包括发送到 `api.anthropic.com` 的 API 密钥和 OAuth 身份验证流量；OpenClaw 将其映射到 Anthropic `service_tier`（`auto` 与 `standard_only`）
- Anthropic 说明：Anthropic 工作人员告诉我们 OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 将 Claude CLI 重用和 `claude -p` 使用视为此集成的许可行为。
- Anthropic setup-token 仍然可作为支持的 OpenClaw 令牌路径使用，但 OpenClaw 现在首选 Claude CLI 重用和 `claude -p`（如果可用）。

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Codex OAuth

- Provider: `openai-codex`
- Auth: OAuth (ChatGPT)
- PI model ref: `openai-codex/gpt-5.5`
- Native Codex app-server harness ref: `openai/gpt-5.5` with `agents.defaults.embeddedHarness.runtime: "codex"`
- Legacy model refs: `codex/gpt-*`
- Plugin boundary: `openai-codex/*` loads the OpenAI plugin; the native Codex
  app-server plugin is selected only by the Codex harness runtime or legacy
  `codex/*` refs.
- CLI: `openclaw onboard --auth-choice openai-codex` or `openclaw models auth login --provider openai-codex`
- Default transport is `auto` (WebSocket-first, SSE fallback)
- Override per PI model via `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"`, or `"auto"`)
- `params.serviceTier` is also forwarded on native Codex Responses requests (`chatgpt.com/backend-api`)
- Hidden OpenClaw attribution headers (`originator`, `version`,
  `User-Agent`) are only attached on native Codex traffic to
  `chatgpt.com/backend-api`, not generic OpenAI-compatible proxies
- Shares the same `/fast` toggle and `params.fastMode` config as direct `openai/*`; OpenClaw maps that to `service_tier=priority`
- `openai-codex/gpt-5.5` keeps native `contextWindow = 1000000` and a default runtime `contextTokens = 272000`; override the runtime cap with `models.providers.openai-codex.models[].contextTokens`
- Policy note: OpenAI Codex OAuth is explicitly supported for external tools/workflows like OpenClaw.
- Current GPT-5.5 access uses this OAuth/subscription route until OpenAI enables GPT-5.5 on the public API.

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.5" } } },
}
```

```json5
{
  models: {
    providers: {
      "openai-codex": {
        models: [{ id: "gpt-5.5", contextTokens: 160000 }],
      },
    },
  },
}
```

### 其他订阅式托管选项

- [Qwen Cloud](/providers/qwen)：Qwen Cloud 提供商表面加上 Alibaba DashScope 和 Coding Plan 端点映射
- [MiniMax](/providers/minimax)：MiniMax Coding Plan OAuth 或 API 密钥访问
- [GLM Models](/providers/glm)：Z.AI Coding Plan 或通用 API 端点

### OpenCode

- 认证：`OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）
- Zen 运行时提供商：`opencode`
- Go 运行时提供商：`opencode-go`
- 示例模型：`opencode/claude-opus-4-6`、`opencode-go/kimi-k2.5`
- CLI：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini（API 密钥）

- 提供商：`google`
- 认证：`GEMINI_API_KEY`
- 可选轮换：`GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GOOGLE_API_KEY` 后备，以及 `OPENCLAW_LIVE_GEMINI_KEY` (单个覆盖)
- 示例模型：`google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- 兼容性：使用 `google/gemini-3.1-flash-preview` 的旧版 OpenClaw 配置被标准化为 `google/gemini-3-flash-preview`
- CLI: `openclaw onboard --auth-choice gemini-api-key`
- Thinking: `/think adaptive` 使用 Google 动态 thinking。Gemini 3/3.1 省略固定的
  `thinkingLevel`；Gemini 2.5 发送 `thinkingBudget: -1`。
- Direct Gemini runs also accept `agents.defaults.models["google/<model>"].params.cachedContent`
  （或旧式 `cached_content`）以转发提供商原生的
  `cachedContents/...` 句柄；Gemini cache 命中会显示为 OpenClaw `cacheRead`

### Google Vertex 和 Gemini CLI

- 提供商：`google-vertex`, `google-gemini-cli`
- 认证：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程
- 注意：OpenClaw 中的 Gemini CLI OAuth 是非官方集成。一些用户报告在使用第三方客户端后受到 Google 账户限制。如果您选择继续，请审查 Google 条款并使用非关键账户。
- Gemini CLI OAuth 作为捆绑的 `google` 插件的一部分提供。
  - 首先安装 Gemini CLI：
    - `brew install gemini-cli`
    - or `npm install -g @google/gemini-cli`
  - 启用：`openclaw plugins enable google`
  - 登录：`openclaw models auth login --provider google-gemini-cli --set-default`
  - 默认模型：`google-gemini-cli/gemini-3-flash-preview`
  - 注意：您**不要**将客户端 ID 或密钥粘贴到 `openclaw.json` 中。CLI 登录流程将令牌存储在网关主机上的身份验证配置文件中。
  - 如果登录后请求失败，请在网关上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  - Gemini CLI JSON 回复从 `response` 解析；用量回退到 `stats`，其中 `stats.cached` 被规范化为 OpenClaw `cacheRead`。

### Z.AI（GLM）

- 提供商：`zai`
- 认证：`ZAI_API_KEY`
- 示例模型：`zai/glm-5.1`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 别名：`z.ai/*` 和 `z-ai/*` 标准化为 `zai/*`
  - `zai-api-key` 自动检测匹配的 Z.AI 端点；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 强制特定表面

### Vercel AI Gateway

- Provider: `vercel-ai-gateway`
- Auth: `AI_GATEWAY_API_KEY`
- Example models: `vercel-ai-gateway/anthropic/claude-opus-4.6`,
  `vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI: `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- 提供商：`kilocode`
- 认证：`KILOCODE_API_KEY`
- 示例模型：`kilocode/kilo/auto`
- CLI: `openclaw onboard --auth-choice kilocode-api-key`
- 基础 URL：`https://api.kilo.ai/api/gateway/`
- 静态后备目录附带 `kilocode/kilo/auto`；实时 `https://api.kilo.ai/api/gateway/models` 发现可以进一步扩展运行时目录。
- `kilocode/kilo/auto` 背后的确切上游路由由 Kilo Gateway 拥有，未在 OpenClaw 中硬编码。

详情见 [/providers/kilocode](/providers/kilocode)。

### 其他内置提供商插件

| Provider                | Id                               | Auth env                                                     | Example model                                   |
| ----------------------- | -------------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| BytePlus                | `byteplus` / `byteplus-plan`     | `BYTEPLUS_API_KEY`                                           | `byteplus-plan/ark-code-latest`                 |
| Cerebras                | `cerebras`                       | `CEREBRAS_API_KEY`                                           | `cerebras/zai-glm-4.7`                          |
| Cloudflare AI Gateway   | `cloudflare-ai-gateway`          | `CLOUDFLARE_AI_GATEWAY_API_KEY`                              | —                                               |
| DeepSeek                | `deepseek`                       | `DEEPSEEK_API_KEY`                                           | `deepseek/deepseek-v4-flash`                    |
| GitHub Copilot          | `github-copilot`                 | `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`         | —                                               |
| Groq                    | `groq`                           | `GROQ_API_KEY`                                               | —                                               |
| Hugging Face Inference  | `huggingface`                    | `HUGGINGFACE_HUB_TOKEN` or `HF_TOKEN`                        | `huggingface/deepseek-ai/DeepSeek-R1`           |
| Kilo Gateway            | `kilocode`                       | `KILOCODE_API_KEY`                                           | `kilocode/kilo/auto`                            |
| Kimi Coding             | `kimi`                           | `KIMI_API_KEY` or `KIMICODE_API_KEY`                         | `kimi/kimi-code`                                |
| MiniMax                 | `minimax` / `minimax-portal`     | `MINIMAX_API_KEY` / `MINIMAX_OAUTH_TOKEN`                    | `minimax/MiniMax-M2.7`                          |
| Mistral                 | `mistral`                        | `MISTRAL_API_KEY`                                            | `mistral/mistral-large-latest`                  |
| Moonshot                | `moonshot`                       | `MOONSHOT_API_KEY`                                           | `moonshot/kimi-k2.6`                            |
| NVIDIA                  | `nvidia`                         | `NVIDIA_API_KEY`                                             | `nvidia/nvidia/llama-3.1-nemotron-70b-instruct` |
| OpenRouter              | `openrouter`                     | `OPENROUTER_API_KEY`                                         | `openrouter/auto`                               |
| Qianfan                 | `qianfan`                        | `QIANFAN_API_KEY`                                            | `qianfan/deepseek-v3.2`                         |
| Qwen Cloud              | `qwen`                           | `QWEN_API_KEY` / `MODELSTUDIO_API_KEY` / `DASHSCOPE_API_KEY` | `qwen/qwen3.5-plus`                             |
| StepFun                 | `stepfun` / `stepfun-plan`       | `STEPFUN_API_KEY`                                            | `stepfun/step-3.5-flash`                        |
| Together                | `together`                       | `TOGETHER_API_KEY`                                           | `together/moonshotai/Kimi-K2.5`                 |
| Venice                  | `venice`                         | `VENICE_API_KEY`                                             | —                                               |
| Vercel AI Gateway       | `vercel-ai-gateway`              | `AI_GATEWAY_API_KEY`                                         | `vercel-ai-gateway/anthropic/claude-opus-4.6`   |
| Volcano Engine (Doubao) | `volcengine` / `volcengine-plan` | `VOLCANO_ENGINE_API_KEY`                                     | `volcengine-plan/ark-code-latest`               |
| xAI                     | `xai`                            | `XAI_API_KEY`                                                | `xai/grok-4`                                    |
| Xiaomi                  | `xiaomi`                         | `XIAOMI_API_KEY`                                             | `xiaomi/mimo-v2-flash`                          |

值得了解的特殊情况：

- **OpenRouter** 仅在经过验证的 `openrouter.ai` 路由上应用其应用归属头和 Anthropic `cache_control` 标记。作为代理式的 OpenAI 兼容路径，它会跳过仅限原生 OpenAI 的格式化（`serviceTier`、Responses `store`、prompt-cache 提示、OpenAI reasoning 兼容）。基于 Gemini 的引用仍然只保留代理 Gemini 的 thought-signature 清理。
- **Kilo Gateway** 基于 Gemini 的引用遵循相同的代理 Gemini 清理路径；`kilocode/kilo/auto` 和其他不支持代理 reasoning 的引用会跳过代理 reasoning 注入。
- **MiniMax** API key 入门会写入显式的纯文本 M2.7 聊天模型定义；图像理解仍由插件拥有的 `MiniMax-VL-01` 媒体提供商处理。
- **xAI** 使用 xAI Responses 路径。`/fast` 或 `params.fastMode: true` 会将 `grok-3`、`grok-3-mini`、`grok-4` 和 `grok-4-0709` 重写为其 `*-fast` 变体。`tool_stream` 默认开启；可通过 `agents.defaults.models["xai/<model>"].params.tool_stream=false` 关闭。
- **Cerebras** GLM 模型使用 `zai-glm-4.7` / `zai-glm-4.6`；OpenAI 兼容的基础 URL 为 `https://api.cerebras.ai/v1`。

## 通过 `models.providers` 配置的提供商（自定义/基础 URL）

使用 `models.providers`（或 `models.json`）添加**自定义**提供商或 OpenAI/Anthropic 兼容代理。

以下许多内置的提供商插件已经发布了默认目录。仅当你想覆盖默认的基础 URL、标头信息或模型列表时，才使用显式的 `models.providers.<id>` 条目。

### Moonshot AI（Kimi）

Moonshot 作为捆绑的提供商插件提供。默认使用内置提供商，仅当你需要覆盖基础 URL 或模型元数据时，才添加显式的 `models.providers.moonshot` 条目：

- 提供商：`moonshot`
- 认证：`MOONSHOT_API_KEY`
- 示例模型：`moonshot/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice moonshot-api-key` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`

Kimi K2 模型 ID：

[//]: # "月之暗面 Kimi K2 模型参考：开始"

- `moonshot/kimi-k2.6`
- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

[//]: # "月之暗面 Kimi K2 模型参考：结束"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.6" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.6", name: "Kimi K2.6" }],
      },
    },
  },
}
```

### Kimi Coding

Kimi Coding 使用 Moonshot AI 的 Anthropic 兼容端点：

- 提供商：`kimi`
- 认证：`KIMI_API_KEY`
- 示例模型：`kimi/kimi-code`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-code" } },
  },
}
```

遗留的 `kimi/k2p5` 仍作为兼容模型 ID 被接受。

### 火山引擎 (Doubao)

火山引擎提供对斗宝等中国模型的访问。

- 提供商：`volcengine` (coding: `volcengine-plan`)
- 认证：`VOLCANO_ENGINE_API_KEY`
- 示例模型：`volcengine-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

引导流程默认使用编码表面，但通用的 `volcengine/*` 目录也会同时注册。

在引导/配置模型选择器中，火山引擎认证选项优先显示 `volcengine/*` 和 `volcengine-plan/*` 行。如果这些模型尚未加载，OpenClaw 将回退到未过滤的目录，而不是显示空的提供商范围选择器。

可用模型：

- `volcengine/doubao-seed-1-8-251228`（斗宝 Seed 1.8）  
- `volcengine/doubao-seed-code-preview-251028`  
- `volcengine/kimi-k2-5-260127`（Kimi K2.5）  
- `volcengine/glm-4-7-251222`（GLM 4.7）  
- `volcengine/deepseek-v3-2-251201`（DeepSeek V3.2 128K）  

编码模型 (`volcengine-plan`)：

- `volcengine-plan/ark-code-latest`  
- `volcengine-plan/doubao-seed-code`  
- `volcengine-plan/kimi-k2.5`  
- `volcengine-plan/kimi-k2-thinking`  
- `volcengine-plan/glm-4.7`  

### BytePlus（国际版）

BytePlus ARK 为国际用户提供与火山引擎相同模型的访问。

- 提供商：`byteplus` (coding: `byteplus-plan`)
- 认证：`BYTEPLUS_API_KEY`
- 示例模型：`byteplus-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

引导流程默认使用编码表面，但通用的 `byteplus/*` 目录也会同时注册。

在引导/配置模型选择器中，BytePlus 认证选项优先显示 `byteplus/*` 和 `byteplus-plan/*` 行。如果这些模型尚未加载，OpenClaw 将回退到未过滤的目录，而不是显示空的提供商范围选择器。

可用模型：

- `byteplus/seed-1-8-251228`（Seed 1.8）  
- `byteplus/kimi-k2-5-260127`（Kimi K2.5）  
- `byteplus/glm-4-7-251222`（GLM 4.7）  

编码模型 (`byteplus-plan`)：

- `byteplus-plan/ark-code-latest`  
- `byteplus-plan/doubao-seed-code`  
- `byteplus-plan/kimi-k2.5`  
- `byteplus-plan/kimi-k2-thinking`  
- `byteplus-plan/glm-4.7`  

### Synthetic

Synthetic 提供基于 Anthropic 兼容模型，使用 `synthetic` 提供商：

- 提供商：`synthetic`  
- 认证：`SYNTHETIC_API_KEY`  
- 示例模型：`synthetic/hf:MiniMaxAI/MiniMax-M2.5`  
- CLI：`openclaw onboard --auth-choice synthetic-api-key`  

```json5
{
  agents: {
    defaults: { model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [{ id: "hf:MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" }],
      },
    },
  },
}
```

### MiniMax

MiniMax 通过 `models.providers` 配置，因为它使用自定义端点：

- MiniMax OAuth (全球): `--auth-choice minimax-global-oauth`
- MiniMax OAuth (中国): `--auth-choice minimax-cn-oauth`
- MiniMax API key (全球): `--auth-choice minimax-global-api`
- MiniMax API key (中国): `--auth-choice minimax-cn-api`
- 认证：`MINIMAX_API_KEY` for `minimax`; `MINIMAX_OAUTH_TOKEN` or
  `MINIMAX_API_KEY` for `minimax-portal`

详情见 [/providers/minimax](/providers/minimax)，含设置细节、模型选项和配置片段。

在 MiniMax 兼容 Anthropic 的流式路径上，除非你显式设置，否则 OpenClaw 默认禁用思考（thinking），且 `/fast on` 会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。

插件拥有的能力划分：

- 文本/聊天默认保留在 `minimax/MiniMax-M2.7`
- 图像生成是 `minimax/image-01` 或 `minimax-portal/image-01`
- 图像理解在两种 MiniMax 认证路径上均为插件拥有的 `MiniMax-VL-01`
- 网络搜索保留在提供商 ID `minimax` 上

### LM Studio

LM Studio 作为捆绑的提供商插件提供，使用原生 API：

- 提供商：`lmstudio`
- 认证：`LM_API_TOKEN`
- 默认推理基础 URL：`http://localhost:1234/v1`

然后设置一个模型（替换为 `http://localhost:1234/api/v1/models` 返回的某个 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw 默认使用 LM Studio 的原生 `/api/v1/models` 和 `/api/v1/models/load`
进行发现 + 自动加载，推理则默认使用 `/v1/chat/completions`。
详情见 [/providers/lmstudio](/providers/lmstudio)，了解设置与故障排除。

### Ollama

Ollama 是打包提供的插件，使用 Ollama 的原生 API：

- 提供商：`ollama`  
- 认证：无需（本地服务器）  
- 示例模型：`ollama/llama3.3`  
- 安装：[https://ollama.com/download](https://ollama.com/download)

```bash
# 安装 Ollama，随后拉取模型：
ollama pull llama3.3
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } },
  },
}
```

Ollama 会自动检测本地地址 `http://127.0.0.1:11434`，需要启用 `OLLAMA_API_KEY`，内置插件可直接将 Ollama 添加至 `openclaw onboard` 和模型选择器中。详见 [/providers/ollama](/providers/ollama) 了解入门、本地/云模式及自定义配置说明。

### vLLM

vLLM 是打包提供的本地/自托管 OpenAI 兼容服务器插件：

- 提供商：`vllm`  
- 认证：可选（依服务器而定）  
- 默认基础 URL：`http://127.0.0.1:8000/v1`  

若要本地自动发现（若服务器不强制认证，任意值均可）：

```bash
export VLLM_API_KEY="vllm-local"
```

然后设置模型（替换为 `/v1/models` 返回的 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

详情见 [/providers/vllm](/providers/vllm)。

### SGLang

SGLang 是打包提供的快速自托管 OpenAI 兼容服务器插件：

- 提供商：`sglang`
- 认证：可选（依服务器而定）
- 默认基础 URL：`http://127.0.0.1:30000/v1`

要启用本地自动发现（服务器不强制认证时，任意值均可）：

```bash
export SGLANG_API_KEY="sglang-local"
```

然后设置一个模型（替换为 `/v1/models` 返回的某个 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

详情见 [/providers/sglang](/providers/sglang)。

### 本地代理（LM Studio、vLLM、LiteLLM 等）

示例（OpenAI 兼容）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: { "lmstudio/my-local-model": { alias: "Local" } },
    },
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

注意：

- 对于自定义提供商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 是可选的。
  省略时，OpenClaw 默认为：
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- 建议：设置与你的代理/模型限制匹配的显式值。
- 对于非原生端点上的 `api: "openai-completions"`（任何主机不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 强制 `compat.supportsDeveloperRole: false` 以避免不支持 `developer` 角色的提供商 400 错误。
- 代理风格的 OpenAI 兼容路由也会跳过原生仅限 OpenAI 的请求整形：无 `service_tier`，无 Responses `store`，无提示缓存提示，无 OpenAI 推理兼容负载整形，且无隐藏的 OpenClaw 归属头。
- 如果 `baseUrl` 为空/省略，OpenClaw 保持默认的 OpenAI 行为（解析为 `api.openai.com`）。
- 为了安全起见，在非原生 `openai-completions` 端点上，显式的 `compat.supportsDeveloperRole: true` 仍会被覆盖。

## CLI 示例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另请参阅：[/gateway/configuration](/gateway/configuration) 获取完整配置示例。

## 相关

- [Models](/concepts/models) — 模型配置和别名
- [Model Failover](/concepts/model-failover) — 回退链和重试行为
- [Configuration Reference](/gateway/config-agents#agent-defaults) — 模型配置键
- [Providers](/providers) — 各提供商的设置指南
