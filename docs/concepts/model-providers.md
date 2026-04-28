---
summary: "模型提供商概览，附示例配置 + CLI 流程"
read_when:
  - 你需要按提供商逐一参考的模型设置说明
  - 你想要模型提供商的示例配置或 CLI 接入命令
title: "模型提供商"
sidebarTitle: "模型提供商"
---

**LLM/模型提供商** 的参考（不是 WhatsApp/Telegram 之类的聊天频道）。关于模型选择规则，参见 [Models](/concepts/models)。

## 快速规则

<AccordionGroup>
  <Accordion title="模型引用与 CLI 辅助工具">
    - 模型引用使用 `provider/model`（示例：`opencode/claude-opus-4-6`）。
    - `agents.defaults.models` 在设置后充当允许列表。
    - CLI 辅助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
    - `models.providers.*.contextWindow` / `contextTokens` / `maxTokens` 设置提供商级默认值；`models.providers.*.models[].contextWindow` / `contextTokens` / `maxTokens` 会按模型覆盖它们。
    - 回退规则、冷却探测和会话覆盖持久化：见 [Model failover](/concepts/model-failover)。
  </Accordion>
  <Accordion title="OpenAI 提供商/运行时拆分">
    OpenAI 系列路由按前缀区分：

    - `openai/<model>` 在 PI 中使用直接的 OpenAI API key 提供商。
    - `openai-codex/<model>` 在 PI 中使用 Codex OAuth。
    - `openai/<model>` 加上 `agents.defaults.agentRuntime.id: "codex"` 会使用原生 Codex app-server harness。

    参见 [OpenAI](/providers/openai) 和 [Codex harness](/plugins/codex-harness)。如果提供商/运行时拆分让你感到困惑，请先阅读 [Agent runtimes](/concepts/agent-runtimes)。

    插件自动启用遵循同样的边界：`openai-codex/<model>` 属于 OpenAI 插件，而 Codex 插件则由 `agentRuntime.id: "codex"` 或旧版 `codex/<model>` 引用启用。

    GPT-5.5 可通过 `openai/gpt-5.5` 用于直接 API key 流量，通过 `openai-codex/gpt-5.5` 在 PI 中用于 Codex OAuth，以及在设置 `agentRuntime.id: "codex"` 时使用原生 Codex app-server harness。

  </Accordion>
  <Accordion title="CLI 运行时">
    CLI 运行时使用相同的拆分方式：先选择规范模型引用，例如 `anthropic/claude-*`、`google/gemini-*` 或 `openai/gpt-*`，然后在需要本地 CLI 后端时将 `agents.defaults.agentRuntime.id` 设为 `claude-cli`、`google-gemini-cli` 或 `codex-cli`。

    旧版 `claude-cli/*`、`google-gemini-cli/*` 和 `codex-cli/*` 引用会迁移回规范的提供商引用，同时单独记录运行时。

  </Accordion>
</AccordionGroup>

## 插件拥有的提供商行为

大多数与提供商相关的逻辑都位于提供商插件（`registerProvider(...)`）中，而 OpenClaw 保留通用推理循环。插件负责接入配置、模型目录、认证环境变量映射、传输/配置规范化、工具 schema 清理、故障转移分类、OAuth 刷新、用量报告、thinking/reasoning 配置文件等。

完整的提供商 SDK 钩子和内置插件示例列表见 [Provider plugins](/plugins/sdk-provider-plugins)。需要完全自定义请求执行器的提供商，则属于更深一层的扩展面。

<Note>
提供商运行时 `capabilities` 是共享的 runner 元数据（提供商家族、转录/工具使用怪癖、传输/缓存提示）。它不同于 [公共 capability 模型](/plugins/architecture#public-capability-model)，后者描述的是插件注册了什么（文本推理、语音等）。
</Note>

## API key 轮换

<AccordionGroup>
  <Accordion title="密钥来源与优先级">
    可通过以下方式配置多个密钥：

    - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个实时覆盖，优先级最高）
    - `<PROVIDER>_API_KEYS`（逗号或分号分隔列表）
    - `<PROVIDER>_API_KEY`（主密钥）
    - `<PROVIDER>_API_KEY_*`（编号列表，例如 `<PROVIDER>_API_KEY_1`）

    对于 Google 提供商，也会把 `GOOGLE_API_KEY` 作为回退项。密钥选择顺序会保留优先级并去重。

  </Accordion>
  <Accordion title="何时触发轮换">
    - 仅在速率限制响应时，会使用下一个密钥重试请求（例如 `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`，或周期性的用量限制消息）。
    - 非速率限制失败会立即失败；不会尝试轮换密钥。
    - 当所有候选密钥都失败时，会返回最后一次尝试的最终错误。
  </Accordion>
</AccordionGroup>

## 内置提供商（pi-ai 目录）

OpenClaw 自带 pi‑ai 目录。这些提供商**不需要** `models.providers` 配置；只需设置认证并选择一个模型即可。

### OpenAI

- 提供商：`openai`
- 认证：`OPENAI_API_KEY`
- 可选轮换：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，以及 `OPENCLAW_LIVE_OPENAI_KEY`（单个覆盖）
- 示例模型：`openai/gpt-5.5`、`openai/gpt-5.4-mini`
- 如果某个特定安装或 API key 的表现不同，可用 `openclaw models list --provider openai` 验证账户/模型可用性。
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 默认传输为 `auto`（优先 WebSocket，SSE 回退）
- 可通过 `agents.defaults.models["openai/<model>"].params.transport` 按模型覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 预热默认启用，可通过 `params.openaiWsWarmup`（`true`/`false`）控制
- 可通过 `agents.defaults.models["openai/<model>"].params.serviceTier` 启用 OpenAI 优先级处理
- `/fast` 和 `params.fastMode` 会把直接的 `openai/*` Responses 请求映射为 `api.openai.com` 上的 `service_tier=priority`
- 当你想要显式层级而不是共享的 `/fast` 开关时，使用 `params.serviceTier`
- 隐藏的 OpenClaw 归属头（`originator`、`version`、`User-Agent`）仅应用于发往 `api.openai.com` 的原生 OpenAI 流量，不适用于通用的 OpenAI 兼容代理
- 原生 OpenAI 路由还会保留 Responses 的 `store`、prompt-cache 提示，以及 OpenAI reasoning-compat 的负载整形；代理路由不会保留这些
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被刻意屏蔽，因为来自实时 OpenAI API 的请求会拒绝它，而当前 Codex 目录也未暴露它

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
}
```

### Anthropic

- 提供商：`anthropic`
- 认证：`ANTHROPIC_API_KEY`
- 可选轮换：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，以及 `OPENCLAW_LIVE_ANTHROPIC_KEY`（单个覆盖）
- 示例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice apiKey`
- 直接的公开 Anthropic 请求支持共享的 `/fast` 开关和 `params.fastMode`，包括发送到 `api.anthropic.com` 的 API key 和 OAuth 认证流量；OpenClaw 会将其映射为 Anthropic `service_tier`（`auto` vs `standard_only`）
- 推荐的 Claude CLI 配置会保持模型引用为规范形式，并将 CLI 后端单独选择：使用 `anthropic/claude-opus-4-7` 和 `agents.defaults.agentRuntime.id: "claude-cli"`。旧版 `claude-cli/claude-opus-4-7` 引用仍可为兼容性继续使用。

<Note>
Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 用法现在再次被允许，因此除非 Anthropic 发布新政策，OpenClaw 会把 Claude CLI 复用和 `claude -p` 用法视为该集成的授权使用。Anthropic setup-token 仍然作为受支持的 OpenClaw token 路径可用，但在可用时，OpenClaw 现在更偏好 Claude CLI 复用和 `claude -p`。
</Note>

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Codex OAuth

- 提供商：`openai-codex`
- 认证：OAuth（ChatGPT）
- PI 模型引用：`openai-codex/gpt-5.5`
- 原生 Codex app-server harness 引用：`openai/gpt-5.5`，并设置 `agents.defaults.agentRuntime.id: "codex"`
- 原生 Codex app-server harness 文档：见 [Codex harness](/plugins/codex-harness)
- 旧版模型引用：`codex/gpt-*`
- 插件边界：`openai-codex/*` 会加载 OpenAI 插件；原生 Codex app-server 插件仅由 Codex harness 运行时或旧版 `codex/*` 引用选择。
- CLI：`openclaw onboard --auth-choice openai-codex` 或 `openclaw models auth login --provider openai-codex`
- 默认传输为 `auto`（优先 WebSocket，SSE 回退）
- 可通过 `agents.defaults.models["openai-codex/<model>"].params.transport` 按 PI 模型覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- `params.serviceTier` 也会在原生 Codex Responses 请求（`chatgpt.com/backend-api`）中继续传递
- 隐藏的 OpenClaw 归属头（`originator`、`version`、`User-Agent`）仅附加到发往 `chatgpt.com/backend-api` 的原生 Codex 流量，不适用于通用的 OpenAI 兼容代理
- 与直接的 `openai/*` 一样，共享相同的 `/fast` 开关和 `params.fastMode` 配置；OpenClaw 会将其映射为 `service_tier=priority`
- `openai-codex/gpt-5.5` 使用 Codex 目录原生的 `contextWindow = 400000` 和默认运行时 `contextTokens = 272000`；可通过 `models.providers.openai-codex.models[].contextTokens` 覆盖运行时上限
- 政策说明：OpenAI Codex OAuth 明确支持 OpenClaw 这类外部工具/工作流。
- 当你想使用 Codex OAuth/订阅路线时，用 `openai-codex/gpt-5.5`；当你的 API key 设置和本地目录暴露了公开 API 路线时，用 `openai/gpt-5.5`。

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

<CardGroup cols={3}>
  <Card title="GLM models" href="/providers/glm">
    Z.AI Coding Plan 或通用 API 端点。
  </Card>
  <Card title="MiniMax" href="/providers/minimax">
    MiniMax Coding Plan OAuth 或 API key 访问。
  </Card>
  <Card title="Qwen Cloud" href="/providers/qwen">
    Qwen Cloud 提供商表面，以及 Alibaba DashScope 和 Coding Plan 端点映射。
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

### Google Gemini（API key）

- 提供商：`google`
- 认证：`GEMINI_API_KEY`
- 可选轮换：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 回退，以及 `OPENCLAW_LIVE_GEMINI_KEY`（单个覆盖）
- 示例模型：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 兼容性：旧版使用 `google/gemini-3.1-flash-preview` 的 OpenClaw 配置会被规范化为 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`
- Thinking：`/think adaptive` 使用 Google 动态 thinking。Gemini 3/3.1 不使用固定的 `thinkingLevel`；Gemini 2.5 会发送 `thinkingBudget: -1`。
- 直接 Gemini 运行也接受 `agents.defaults.models["google/<model>"].params.cachedContent`（或旧版 `cached_content`），用于转发提供商原生的 `cachedContents/...` 句柄；Gemini 缓存命中会在 OpenClaw 中显示为 `cacheRead`

### Google Vertex 和 Gemini CLI

- 提供商：`google-vertex`、`google-gemini-cli`
- 认证：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程

<Warning>
OpenClaw 中的 Gemini CLI OAuth 是一个非官方集成。部分用户报告称，在使用第三方客户端后其 Google 账户受到了限制。如果你选择继续，请先阅读 Google 条款，并使用一个非关键账户。
</Warning>

Gemini CLI OAuth 作为内置 `google` 插件的一部分提供。

<Steps>
  <Step title="安装 Gemini CLI">
    <Tabs>
      <Tab title="brew">
        ```bash
        brew install gemini-cli
        ```
      </Tab>
      <Tab title="npm">
        ```bash
        npm install -g @google/gemini-cli
        ```
      </Tab>
    </Tabs>
  </Step>
  <Step title="启用插件">
    ```bash
    openclaw plugins enable google
    ```
  </Step>
  <Step title="登录">
    ```bash
    openclaw models auth login --provider google-gemini-cli --set-default
    ```

    默认模型：`google-gemini-cli/gemini-3-flash-preview`。你**不需要**把 client id 或 secret 粘贴到 `openclaw.json` 中。CLI 登录流程会把 token 存储在 gateway 主机上的 auth profile 中。

  </Step>
  <Step title="设置项目（如需要）">
    如果登录后请求失败，请在 gateway 主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  </Step>
</Steps>

Gemini CLI 的 JSON 回复会从 `response` 中解析；用量信息会回退到 `stats`，其中 `stats.cached` 会被规范化为 OpenClaw 的 `cacheRead`。

### Z.AI（GLM）

- 提供商：`zai`
- 认证：`ZAI_API_KEY`
- 示例模型：`zai/glm-5.1`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 别名：`z.ai/*` 和 `z-ai/*` 会规范化为 `zai/*`
  - `zai-api-key` 会自动检测匹配的 Z.AI 端点；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 会强制使用特定入口

### Vercel AI Gateway

- 提供商：`vercel-ai-gateway`
- 认证：`AI_GATEWAY_API_KEY`
- 示例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`、`vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- 提供商：`kilocode`
- 认证：`KILOCODE_API_KEY`
- 示例模型：`kilocode/kilo/auto`
- CLI：`openclaw onboard --auth-choice kilocode-api-key`
- 基础 URL：`https://api.kilo.ai/api/gateway/`
- 静态回退目录自带 `kilocode/kilo/auto`；实时的 `https://api.kilo.ai/api/gateway/models` 发现机制可进一步扩展运行时目录。
- `kilocode/kilo/auto` 背后的精确上游路由由 Kilo Gateway 负责，而不是在 OpenClaw 中硬编码。

有关设置详情，参见 [/providers/kilocode](/providers/kilocode)。

### 其他内置提供商插件

| 提供商                | Id                               | 认证环境变量                                               | 示例模型                                   |
| --------------------- | -------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| BytePlus              | `byteplus` / `byteplus-plan`     | `BYTEPLUS_API_KEY`                                         | `byteplus-plan/ark-code-latest`            |
| Cerebras              | `cerebras`                       | `CEREBRAS_API_KEY`                                         | `cerebras/zai-glm-4.7`                     |
| Cloudflare AI Gateway | `cloudflare-ai-gateway`          | `CLOUDFLARE_AI_GATEWAY_API_KEY`                            | —                                          |
| DeepInfra             | `deepinfra`                      | `DEEPINFRA_API_KEY`                                        | `deepinfra/deepseek-ai/DeepSeek-V3.2`       |
| DeepSeek              | `deepseek`                       | `DEEPSEEK_API_KEY`                                         | `deepseek/deepseek-v4-flash`               |
| GitHub Copilot        | `github-copilot`                 | `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`       | —                                          |
| Groq                  | `groq`                           | `GROQ_API_KEY`                                             | —                                          |
| Hugging Face Inference | `huggingface`                    | `HUGGINGFACE_HUB_TOKEN` or `HF_TOKEN`                      | `huggingface/deepseek-ai/DeepSeek-R1`      |
| Kilo Gateway          | `kilocode`                       | `KILOCODE_API_KEY`                                         | `kilocode/kilo/auto`                       |
| Kimi Coding           | `kimi`                           | `KIMI_API_KEY` or `KIMICODE_API_KEY`                       | `kimi/kimi-code`                           |
| MiniMax               | `minimax` / `minimax-portal`     | `MINIMAX_API_KEY` / `MINIMAX_OAUTH_TOKEN`                  | `minimax/MiniMax-M2.7`                     |
| Mistral               | `mistral`                        | `MISTRAL_API_KEY`                                          | `mistral/mistral-large-latest`             |
| Moonshot              | `moonshot`                       | `MOONSHOT_API_KEY`                                         | `moonshot/kimi-k2.6`                       |
| NVIDIA                | `nvidia`                         | `NVIDIA_API_KEY`                                           | `nvidia/nvidia/llama-3.1-nemotron-70b-instruct` |
| OpenRouter            | `openrouter`                     | `OPENROUTER_API_KEY`                                       | `openrouter/auto`                          |
| Qianfan               | `qianfan`                        | `QIANFAN_API_KEY`                                          | `qianfan/deepseek-v3.2`                    |
| Qwen Cloud            | `qwen`                           | `QWEN_API_KEY` / `MODELSTUDIO_API_KEY` / `DASHSCOPE_API_KEY` | `qwen/qwen3.5-plus`                         |
| StepFun               | `stepfun` / `stepfun-plan`       | `STEPFUN_API_KEY`                                          | `stepfun/step-3.5-flash`                   |
| Together              | `together`                       | `TOGETHER_API_KEY`                                         | `together/moonshotai/Kimi-K2.5`            |
| Venice                | `venice`                         | `VENICE_API_KEY`                                           | —                                          |
| Vercel AI Gateway     | `vercel-ai-gateway`              | `AI_GATEWAY_API_KEY`                                       | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| Volcano Engine (Doubao) | `volcengine` / `volcengine-plan` | `VOLCANO_ENGINE_API_KEY`                                   | `volcengine-plan/ark-code-latest`          |
| xAI                   | `xai`                            | `XAI_API_KEY`                                              | `xai/grok-4`                               |
| 小米                 | `xiaomi`                         | `XIAOMI_API_KEY`                                           | `xiaomi/mimo-v2-flash`                     |

#### 值得了解的特殊行为

<AccordionGroup>
  <Accordion title="OpenRouter">
    仅在已验证的 `openrouter.ai` 路由上应用其应用归属头和 Anthropic `cache_control` 标记。DeepSeek、Moonshot 和 ZAI 引用可用于 OpenRouter 管理的 prompt 缓存的 cache-TTL，但不会接收 Anthropic 缓存标记。作为代理式 OpenAI 兼容路径，它会跳过原生 OpenAI 专属的整形（`serviceTier`、Responses `store`、prompt-cache 提示、OpenAI reasoning-compat）。基于 Gemini 的引用只保留代理-Gemini 的 thought-signature 清理。
  </Accordion>
  <Accordion title="Kilo Gateway">
    基于 Gemini 的引用遵循相同的代理-Gemini 清理路径；`kilocode/kilo/auto` 和其他不支持代理 reasoning 的引用会跳过代理 reasoning 注入。
  </Accordion>
  <Accordion title="MiniMax">
    API key 接入会写入显式的仅文本 M2.7 聊天模型定义；图像理解仍然由插件拥有的 `MiniMax-VL-01` 媒体提供商负责。
  </Accordion>
  <Accordion title="xAI">
    使用 xAI Responses 路径。`/fast` 或 `params.fastMode: true` 会将 `grok-3`、`grok-3-mini`、`grok-4` 和 `grok-4-0709` 重写为它们的 `*-fast` 变体。`tool_stream` 默认开启；可通过 `agents.defaults.models["xai/<model>"].params.tool_stream=false` 禁用。
  </Accordion>
  <Accordion title="Cerebras">
    作为内置的 `cerebras` 提供商插件提供。GLM 使用 `zai-glm-4.7`；OpenAI 兼容的基础 URL 是 `https://api.cerebras.ai/v1`。
  </Accordion>
</AccordionGroup>

## 通过 `models.providers` 提供（自定义/基础 URL）

使用 `models.providers`（或 `models.json`）来添加 **自定义** 提供方，或 OpenAI/Anthropic 兼容的代理。

下面列出的许多内置提供方插件已经发布了默认目录。只有在你想覆盖默认基础 URL、请求头或模型列表时，才使用显式的 `models.providers.<id>` 条目。

### Moonshot AI（Kimi）

Moonshot 作为一个内置提供方插件随附。默认使用内置提供方，仅在你需要覆盖基础 URL 或模型元数据时，添加显式的 `models.providers.moonshot` 条目：

- 提供方：`moonshot`
- 认证：`MOONSHOT_API_KEY`
- 示例模型：`moonshot/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice moonshot-api-key` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`

Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.6`
- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

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

### Kimi coding

Kimi Coding 使用 Moonshot AI 的 Anthropic 兼容端点：

- 提供方：`kimi`
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

旧版 `kimi/k2p5` 仍然被接受，作为兼容模型 ID。

### Volcano Engine（豆包）

Volcano Engine（火山引擎）为中国用户提供对豆包和其他模型的访问。

- 提供方：`volcengine`（coding：`volcengine-plan`）
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

上手引导默认使用 coding 界面，但通用的 `volcengine/*` 目录会同时注册。

在上手/配置模型选择器中，Volcengine 认证选项会同时优先匹配 `volcengine/*` 和 `volcengine-plan/*` 行。如果这些模型尚未加载，OpenClaw 会回退到未过滤的目录，而不是显示一个空的按提供方筛选的选择器。

<Tabs>
  <Tab title="标准模型">
    - `volcengine/doubao-seed-1-8-251228`（Doubao Seed 1.8）
    - `volcengine/doubao-seed-code-preview-251028`
    - `volcengine/kimi-k2-5-260127`（Kimi K2.5）
    - `volcengine/glm-4-7-251222`（GLM 4.7）
    - `volcengine/deepseek-v3-2-251201`（DeepSeek V3.2 128K）
  </Tab>
  <Tab title="Coding 模型（volcengine-plan）">
    - `volcengine-plan/ark-code-latest`
    - `volcengine-plan/doubao-seed-code`
    - `volcengine-plan/kimi-k2.5`
    - `volcengine-plan/kimi-k2-thinking`
    - `volcengine-plan/glm-4.7`
  </Tab>
</Tabs>

### BytePlus（国际版）

BytePlus ARK 为国际用户提供与 Volcano Engine 相同的模型访问能力。

- 提供方：`byteplus`（coding：`byteplus-plan`）
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

上手引导默认使用 coding 界面，但通用的 `byteplus/*` 目录会同时注册。

在上手/配置模型选择器中，BytePlus 认证选项会同时优先匹配 `byteplus/*` 和 `byteplus-plan/*` 行。如果这些模型尚未加载，OpenClaw 会回退到未过滤的目录，而不是显示一个空的按提供方筛选的选择器。

<Tabs>
  <Tab title="标准模型">
    - `byteplus/seed-1-8-251228`（Seed 1.8）
    - `byteplus/kimi-k2-5-260127`（Kimi K2.5）
    - `byteplus/glm-4-7-251222`（GLM 4.7）
  </Tab>
  <Tab title="Coding 模型（byteplus-plan）">
    - `byteplus-plan/ark-code-latest`
    - `byteplus-plan/doubao-seed-code`
    - `byteplus-plan/kimi-k2.5`
    - `byteplus-plan/kimi-k2-thinking`
    - `byteplus-plan/glm-4.7`
  </Tab>
</Tabs>

### Synthetic

Synthetic 通过 `synthetic` 提供方提供 Anthropic 兼容模型：

- 提供方：`synthetic`
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

MiniMax 通过 `models.providers` 进行配置，因为它使用自定义端点：

- MiniMax OAuth（全球）：`--auth-choice minimax-global-oauth`
- MiniMax OAuth（中国）：`--auth-choice minimax-cn-oauth`
- MiniMax API key（全球）：`--auth-choice minimax-global-api`
- MiniMax API key（中国）：`--auth-choice minimax-cn-api`
- 认证：`minimax` 使用 `MINIMAX_API_KEY`；`minimax-portal` 使用 `MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY`

请参见 [/providers/minimax](/providers/minimax) 获取设置细节、模型选项和配置片段。

<Note>
在 MiniMax 的 Anthropic 兼容流式路径上，OpenClaw 默认会禁用 thinking，除非你显式设置；并且 `/fast on` 会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
</Note>

插件拥有的能力拆分：

- 文本/聊天默认保持在 `minimax/MiniMax-M2.7`
- 图像生成是 `minimax/image-01` 或 `minimax-portal/image-01`
- 图像理解是插件拥有的 `MiniMax-VL-01`，在两种 MiniMax 认证路径上均可使用
- 网络搜索保持在提供方 ID `minimax`

### LM Studio

LM Studio 作为一个内置提供方插件随附，并使用原生 API：

- 提供方：`lmstudio`
- 认证：`LM_API_TOKEN`
- 默认推理基础 URL：`http://localhost:1234/v1`

然后设置一个模型（替换为 `http://localhost:1234/api/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw 默认使用 LM Studio 的原生 `/api/v1/models` 和 `/api/v1/models/load` 进行发现与自动加载，并使用 `/v1/chat/completions` 进行推理。请参见 [/providers/lmstudio](/providers/lmstudio) 获取设置与故障排查信息。

### Ollama

Ollama 作为一个内置提供方插件随附，并使用 Ollama 的原生 API：

- 提供方：`ollama`
- 认证：不需要（本地服务器）
- 示例模型：`ollama/llama3.3`
- 安装：[https://ollama.com/download](https://ollama.com/download)

```bash
# 安装 Ollama，然后拉取一个模型：
ollama pull llama3.3
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } },
  },
}
```

当你使用 `OLLAMA_API_KEY` 选择启用时，Ollama 会在本地 `http://127.0.0.1:11434` 被检测到，随附的提供方插件会将 Ollama 直接添加到 `openclaw onboard` 和模型选择器中。请参见 [/providers/ollama](/providers/ollama) 获取上手引导、云端/本地模式和自定义配置。

### vLLM

vLLM 作为一个内置提供方插件随附，面向本地/自托管的 OpenAI 兼容服务器：

- 提供方：`vllm`
- 认证：可选（取决于你的服务器）
- 默认基础 URL：`http://127.0.0.1:8000/v1`

若要在本地启用自动发现（如果你的服务器不强制认证，任意值都可用）：

```bash
export VLLM_API_KEY="vllm-local"
```

然后设置一个模型（替换为 `/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

请参见 [/providers/vllm](/providers/vllm) 获取详情。

### SGLang

SGLang 作为一个内置提供方插件随附，面向快速的自托管 OpenAI 兼容服务器：

- 提供方：`sglang`
- 认证：可选（取决于你的服务器）
- 默认基础 URL：`http://127.0.0.1:30000/v1`

若要在本地启用自动发现（如果你的服务器不强制认证，任意值都可用）：

```bash
export SGLANG_API_KEY="sglang-local"
```

然后设置一个模型（替换为 `/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

请参见 [/providers/sglang](/providers/sglang) 获取详情。

### 本地代理（LM Studio、vLLM、LiteLLM 等）

示例（OpenAI 兼容）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: { "lmstudio/my-local-model": { alias: "本地" } },
    },
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "本地模型",
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

<AccordionGroup>
  <Accordion title="默认可选字段">
    对于自定义提供方，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 都是可选的。省略时，OpenClaw 默认为：

    - `reasoning: false`
    - `input: ["text"]`
    - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
    - `contextWindow: 200000`
    - `maxTokens: 8192`

    建议：设置与代理/模型限制相匹配的显式值。

  </Accordion>
  <Accordion title="代理路由整形规则">
    - 对于非原生端点上的 `api: "openai-completions"`（任何非空的 `baseUrl`，且其主机不是 `api.openai.com`），OpenClaw 会强制设置 `compat.supportsDeveloperRole: false`，以避免因不支持 `developer` 角色而导致提供方返回 400 错误。
    - 代理风格的 OpenAI 兼容路由也会跳过原生的 OpenAI 专用请求整形：没有 `service_tier`，没有 Responses 的 `store`，没有 Completions 的 `store`，没有提示缓存提示，没有 OpenAI reasoning-compat 负载整形，也没有隐藏的 OpenClaw 归因请求头。
    - 对于需要厂商特定字段的 OpenAI 兼容 Completions 代理，请设置 `agents.defaults.models["provider/model"].params.extra_body`（或 `extraBody`），以便将额外的 JSON 合并到出站请求体中。
    - 对于 vLLM 的聊天模板控制，请设置 `agents.defaults.models["provider/model"].params.chat_template_kwargs`。当会话 thinking 级别关闭时，内置的 vLLM 插件会自动为 `vllm/nemotron-3-*` 发送 `enable_thinking: false` 和 `force_nonempty_content: true`。
    - 对于较慢的本地模型或远程 LAN/tailnet 主机，请设置 `models.providers.<id>.timeoutSeconds`。这会扩展提供方模型的 HTTP 请求处理，包括连接、请求头、正文流式传输以及整体受保护的 fetch 超时，而不会增加整个代理运行时超时。
    - 如果 `baseUrl` 为空/省略，OpenClaw 会保留默认的 OpenAI 行为（它会解析为 `api.openai.com`）。
    - 为安全起见，在非原生 `openai-completions` 端点上，即使显式设置了 `compat.supportsDeveloperRole: true`，也仍会被覆盖为关闭。
  </Accordion>
</AccordionGroup>

## CLI 示例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另请参阅：[配置](/gateway/configuration) 以查看完整的配置示例。

## 相关内容

- [配置参考](/gateway/config-agents#agent-defaults) — 模型配置键
- [模型故障转移](/concepts/model-failover) — 回退链和重试行为
- [模型](/concepts/models) — 模型配置和别名
- [提供商](/providers) — 各提供商的设置指南