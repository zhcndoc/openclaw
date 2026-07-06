---
summary: "带有示例配置和 CLI 流程的模型提供商概览"
read_when:
  - 你需要按提供商逐一查看模型设置参考
  - 你想获取模型提供商的示例配置或 CLI 入门命令
title: "模型提供商"
sidebarTitle: "模型提供商"
---

**LLM/模型提供商**（不是 WhatsApp/Telegram 之类的聊天渠道）的参考文档。关于模型选择规则，请参见 [Models](/concepts/models)。

## 快速规则

<AccordionGroup>
  <Accordion title="模型引用与 CLI 辅助工具">
    - 模型引用使用 `provider/model`（示例：`opencode/claude-opus-4-6`）。
    - `agents.defaults.models` 在设置后会作为允许列表。
    - CLI 辅助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
    - `models.providers.*.contextWindow` / `contextTokens` / `maxTokens` 设置提供商级默认值；`models.providers.*.models[].contextWindow` / `contextTokens` / `maxTokens` 按模型覆盖这些默认值。
    - 回退规则、冷却探测和会话覆盖持久化： [模型故障切换](/concepts/model-failover)。

  </Accordion>
  <Accordion title="添加提供商认证不会更改你的主模型">
    `openclaw configure` 在你添加或重新认证某个提供商时，会保留现有的 `agents.defaults.model.primary`。`openclaw models auth login` 也会这样做，除非你传入 `--set-default`。提供商插件仍可能在其认证配置补丁中返回一个推荐的默认模型，但当主模型已存在时，OpenClaw 会把这理解为“让该模型可用”，而不是“替换当前主模型”。

    若要有意切换默认模型，请使用 `openclaw models set <provider/model>` 或 `openclaw models auth login --provider <id> --set-default`。

  </Accordion>
  <Accordion title="OpenAI 提供商/运行时分离">
    OpenAI 系列路由以缀前区分：

    - `openai/<model>` 默认使用原生 Codex app-server 运行时处理代理回合。这通常是 ChatGPT/Codex 订阅配置。
    - 旧式 Codex 模型引用是旧配置，doctor 会将其重写为 `openai/<model>`。
    - `openai/<model>` 搭配 provider/model `agentRuntime.id: "openclaw"` 时，会使用 OpenClaw 内置运行时来处理显式 API key 或兼容性路由。

    参见 [OpenAI](/providers/openai) 和 [Codex harness](/plugins/codex-harness)。如果提供商/运行时分离让你感到困惑，请先阅读 [Agent runtimes](/concepts/agent-runtimes)。

    插件自动启用遵循相同边界：`openai/*` 代理引用会为默认路由启用 Codex 插件；显式 provider/model `agentRuntime.id: "codex"` 或旧式 `codex/<model>` 引用也同样需要它。

    GPT-5.5 默认可通过 `openai/gpt-5.5` 使用原生 Codex app-server 运行时获取；当 provider/model 运行时策略显式选择 `openclaw` 时，则通过 OpenClaw 运行时提供。

  </Accordion>
  <Accordion title="CLI 运行时">
    CLI 运行时使用相同的拆分方式：先选择规范模型引用，例如 `anthropic/claude-*` 或 `google/gemini-*`，然后在你想使用本地 CLI 后端时，将 provider/model 运行时策略设置为 `claude-cli` 或 `google-gemini-cli`。

    旧式 `claude-cli/*` 和 `google-gemini-cli/*` 引用会迁移回规范的提供商引用，同时把运行时单独记录。旧式 `codex-cli/*` 引用会迁移为 `openai/*` 并使用 Codex app-server 路由；OpenClaw 不再保留捆绑的 Codex CLI 后端。

  </Accordion>
</AccordionGroup>

## 插件拥有的提供商行为

大多数特定提供商逻辑都位于提供商插件（`registerProvider(...)`）中，而 OpenClaw 保留通用推理循环。插件负责上手引导、模型目录、认证环境变量映射、传输/配置规范化、工具 schema 清理、失败切换分类、OAuth 刷新、用量上报、思考/推理配置文件等。

完整的提供商 SDK 钩子与捆绑插件示例列表见 [Provider plugins](/plugins/sdk-provider-plugins)。需要完全自定义请求执行器的提供商，则属于更深层的扩展面。

<Note>
提供商拥有的运行器行为位于显式提供商钩子上，例如重放策略、工具 schema 规范化、流包装，以及传输/请求辅助工具。旧的 `ProviderPlugin.capabilities` 静态集合仅用于兼容，不再被共享运行器逻辑读取。
</Note>

## API key 轮换

<AccordionGroup>
  <Accordion title="密钥来源与优先级">
    通过以下方式配置多个密钥：

    - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个实时覆盖，优先级最高）
    - `<PROVIDER>_API_KEYS`（逗号或分号分隔列表）
    - `<PROVIDER>_API_KEY`（主密钥）
    - `<PROVIDER>_API_KEY_*`（编号列表，例如 `<PROVIDER>_API_KEY_1`）

    对于 Google 提供商，也会将 `GOOGLE_API_KEY` 作为回退项。密钥选择顺序会保留优先级并去重。

  </Accordion>
  <Accordion title="何时触发轮换">
    - 只有在速率限制响应时才会使用下一个密钥重试请求（例如 `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`，或周期性的用量限制消息）。
    - 非速率限制失败会立即失败；不会尝试密钥轮换。
    - 当所有候选密钥都失败时，返回最后一次尝试的最终错误。

  </Accordion>
</AccordionGroup>

## 官方提供商插件

官方提供商插件会发布它们自己的模型目录行。这些提供商**不需要** `models.providers` 模型条目；只需启用提供商插件、完成认证并选择一个模型。只有在需要显式自定义提供商或设置较窄的请求参数（例如超时）时，才使用 `models.providers`。

### OpenAI

- Provider: `openai`
- Auth: `OPENAI_API_KEY`
- Optional rotation: `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, plus `OPENCLAW_LIVE_OPENAI_KEY` (single override)
- Example models: `openai/gpt-5.5`, `openai/gpt-5.4-mini`
- Verify account/model availability with `openclaw models list --provider openai` if a specific install or API key behaves differently.
- CLI: `openclaw onboard --auth-choice openai-api-key`
- Default transport is `auto`; OpenClaw passes the transport choice to the shared model runtime.
- Override per model via `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"`, or `"auto"`)
- OpenAI priority processing can be enabled via `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` and `params.fastMode` map direct `openai/*` Responses requests to `service_tier=priority` on `api.openai.com`
- Use `params.serviceTier` when you want an explicit tier instead of the shared `/fast` toggle
- Hidden OpenClaw attribution headers (`originator`, `version`, `User-Agent`) apply only on native OpenAI traffic to `api.openai.com`, not generic OpenAI-compatible proxies
- Native OpenAI routes also keep Responses `store`, prompt-cache hints, and OpenAI reasoning-compat payload shaping; proxy routes do not
- `openai/gpt-5.3-codex-spark` is available only through ChatGPT/Codex OAuth; direct OpenAI API-key and Azure API-key routes reject it

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
- 直接的公共 Anthropic 请求支持共享的 `/fast` 开关和 `params.fastMode`，包括发送到 `api.anthropic.com` 的 API key 和 OAuth 认证流量；OpenClaw 会将其映射为 Anthropic `service_tier`（`auto` vs `standard_only`）
- 推荐的 Claude CLI 配置会保持模型引用为规范形式，并单独选择 CLI 后端：`anthropic/claude-opus-4-8` 搭配按模型范围设置的 `agentRuntime.id: "claude-cli"`。旧式 `claude-cli/claude-opus-4-7` 引用仍可兼容使用。

<Note>
Claude CLI reuse (`claude -p`) is a sanctioned OpenClaw integration path. Anthropic setup-token auth remains supported, but OpenClaw prefers Claude CLI reuse when available.
</Note>

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI ChatGPT/Codex OAuth

- Provider: `openai`
- Auth: OAuth (ChatGPT)
- Native Codex app-server harness ref: `openai/gpt-5.5`
- Native Codex app-server harness docs: [Codex harness](/plugins/codex-harness)
- Legacy model refs: `codex/gpt-*`
- Plugin boundary: `openai/*` loads the OpenAI plugin; the native Codex app-server plugin is selected by the Codex harness runtime.
- CLI: `openclaw onboard --auth-choice openai` or `openclaw models auth login --provider openai`
- Default transport is `auto` (WebSocket-first, SSE fallback)
- Override per OpenAI Codex model via `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"`, or `"auto"`)
- `params.serviceTier` is also forwarded on native Codex Responses requests (`chatgpt.com/backend-api`)
- Hidden OpenClaw attribution headers (`originator`, `version`, `User-Agent`) are only attached on native Codex traffic to `chatgpt.com/backend-api`, not generic OpenAI-compatible proxies
- Shares the same `/fast` toggle and `params.fastMode` config as direct `openai/*`; OpenClaw maps that to `service_tier=priority`
- `openai/gpt-5.5` uses the Codex catalog native `contextWindow = 400000` and default runtime `contextTokens = 272000`; override the runtime cap with `models.providers.openai.models[].contextTokens`
- Sign in with `openai` auth and configure `openai/gpt-5.5` for the standard subscription plus native Codex runtime route; OpenAI agent turns select Codex by default.
- Use provider/model `agentRuntime.id: "openclaw"` only when you want the built-in OpenClaw route; otherwise keep `openai/gpt-5.5` on the default Codex harness.
- Legacy Codex GPT refs are legacy state, not a live provider route. Use `openai/gpt-5.5` on the native Codex runtime for new agent config, and run `openclaw doctor --fix` to migrate old legacy Codex model refs to canonical `openai/*` refs.

```json5
{
  plugins: { entries: { codex: { enabled: true } } },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
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

### 其他订阅式托管选项

<CardGroup cols={3}>
  <Card title="MiniMax" href="/providers/minimax">
    MiniMax 编程计划 OAuth 或 API key 访问。
  </Card>
  <Card title="Qwen Cloud" href="/providers/qwen">
    Qwen Cloud 提供商表面，以及阿里巴巴 DashScope 和编程计划端点映射。
  </Card>
  <Card title="Z.AI (GLM)" href="/providers/zai">
    Z.AI Coding Plan or general API endpoints.
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
- 兼容性：使用 `google/gemini-3.1-flash-preview` 的旧式 OpenClaw 配置会被规范化为 `google/gemini-3-flash-preview`
- 别名：`google/gemini-3.1-pro` 会被接受并规范化为 Google 实际 Gemini API id `google/gemini-3.1-pro-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`
- 思考：`/think adaptive` 使用 Google 动态思考。Gemini 3/3.1 省略固定的 `thinkingLevel`；Gemini 2.5 发送 `thinkingBudget: -1`。
- 直接的 Gemini 运行也接受 `agents.defaults.models["google/<model>"].params.cachedContent`（或旧式 `cached_content`），以转发提供商原生的 `cachedContents/...` 句柄；Gemini 缓存命中会作为 OpenClaw `cacheRead` 暴露

### Google Vertex 和 Gemini CLI

- 提供商：`google-vertex`、`google-gemini-cli`
- 认证：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程

<Warning>
OpenClaw 中的 Gemini CLI OAuth 是一个非官方集成。有些用户在使用第三方客户端后报告过 Google 账号限制。若你选择继续，请先查看 Google 条款，并使用非关键账号。
</Warning>

Gemini CLI OAuth 作为捆绑的 `google` 插件的一部分一起发布。

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

    默认模型：`google-gemini-cli/gemini-3-flash-preview`。你**不需要**把 client id 或 secret 粘贴到 `openclaw.json` 中。CLI 登录流程会将 token 存储在 gateway 主机上的 auth 配置文件里。

  </Step>
  <Step title="设置项目（如有需要）">
    如果登录后请求失败，请在 gateway 主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  </Step>
</Steps>

Gemini CLI 默认使用 `stream-json`。OpenClaw 会读取 assistant 流消息，并将 `stats.cached` 规范化为 `cacheRead`；旧的
`--output-format json` 覆盖仍会从 `response` 读取回复文本。

### Z.AI（GLM）

- 提供商：`zai`
- 认证：`ZAI_API_KEY`
- 示例模型：`zai/glm-5.2`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 模型引用使用规范的 `zai/*` 提供商 ID。
  - `zai-api-key` 会自动检测匹配的 Z.AI 端点；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 会强制使用特定表面

### Vercel AI Gateway

- 提供商：`vercel-ai-gateway`
- 认证：`AI_GATEWAY_API_KEY`
- 示例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`、`vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### 其他捆绑提供商插件

| 提供商                                | Id                               | 认证环境变量                                         | 示例模型                                              |
| --------------------------------------- | -------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| Arcee                                   | `arcee`                          | `ARCEEAI_API_KEY` or `OPENROUTER_API_KEY`            | `arcee/trinity-large-thinking`                             |
| BytePlus                                | `byteplus` / `byteplus-plan`     | `BYTEPLUS_API_KEY`                                   | `byteplus-plan/ark-code-latest`                            |
| Cerebras                                | `cerebras`                       | `CEREBRAS_API_KEY`                                   | `cerebras/zai-glm-4.7`                                     |
| Chutes                                  | `chutes`                         | `CHUTES_API_KEY` or `CHUTES_OAUTH_TOKEN`             | `chutes/zai-org/GLM-4.7-TEE`                               |
| ClawRouter                              | `clawrouter`                     | `CLAWROUTER_API_KEY`                                 | `clawrouter/anthropic/claude-sonnet-4-6`                   |
| Cohere                                  | `cohere`                         | `COHERE_API_KEY`                                     | `cohere/command-a-03-2025`                                 |
| DeepInfra                               | `deepinfra`                      | `DEEPINFRA_API_KEY`                                  | `deepinfra/deepseek-ai/DeepSeek-V4-Flash`                  |
| DeepSeek                                | `deepseek`                       | `DEEPSEEK_API_KEY`                                   | `deepseek/deepseek-v4-flash`                               |
| GitHub Copilot                          | `github-copilot`                 | `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN` | -                                                          |
| GMI Cloud                               | `gmi`                            | `GMI_API_KEY`                                        | `gmi/google/gemini-3.1-flash-lite`                         |
| Groq                                    | `groq`                           | `GROQ_API_KEY`                                       | `groq/llama-3.3-70b-versatile`                             |
| Hugging Face Inference                  | `huggingface`                    | `HUGGINGFACE_HUB_TOKEN` or `HF_TOKEN`                | `huggingface/deepseek-ai/DeepSeek-R1`                      |
| MiniMax                                 | `minimax` / `minimax-portal`     | `MINIMAX_API_KEY` / `MINIMAX_OAUTH_TOKEN`            | `minimax/MiniMax-M3`                                       |
| Mistral                                 | `mistral`                        | `MISTRAL_API_KEY`                                    | `mistral/mistral-large-latest`                             |
| Moonshot                                | `moonshot`                       | `MOONSHOT_API_KEY`                                   | `moonshot/kimi-k2.6`                                       |
| NVIDIA                                  | `nvidia`                         | `NVIDIA_API_KEY`                                     | `nvidia/nvidia/nemotron-3-ultra-550b-a55b`                 |
| NovitaAI                                | `novita`                         | `NOVITA_API_KEY`                                     | `novita/deepseek/deepseek-v3-0324`                         |
| [Ollama Cloud](/providers/ollama-cloud) | `ollama-cloud`                   | `OLLAMA_API_KEY`                                     | `ollama-cloud/kimi-k2.6`                                   |
| OpenRouter                              | `openrouter`                     | OpenRouter OAuth or `OPENROUTER_API_KEY`             | `openrouter/auto`                                          |
| Qianfan                                 | `qianfan`                        | `QIANFAN_API_KEY`                                    | `qianfan/deepseek-v3.2`                                    |
| [Qwen OAuth](/providers/qwen-oauth)     | `qwen-oauth`                     | `QWEN_API_KEY`                                       | `qwen-oauth/qwen3.5-plus`                                  |
| Tencent TokenHub                        | `tencent-tokenhub`               | `TOKENHUB_API_KEY`                                   | `tencent-tokenhub/hy3-preview`                             |
| Together                                | `together`                       | `TOGETHER_API_KEY`                                   | `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`         |
| Venice                                  | `venice`                         | `VENICE_API_KEY`                                     | -                                                          |
| Vercel AI Gateway                       | `vercel-ai-gateway`              | `AI_GATEWAY_API_KEY`                                 | `vercel-ai-gateway/anthropic/claude-opus-4.6`              |
| Volcano Engine (Doubao)                 | `volcengine` / `volcengine-plan` | `VOLCANO_ENGINE_API_KEY`                             | `volcengine-plan/ark-code-latest`                          |
| xAI                                     | `xai`                            | SuperGrok/X Premium OAuth or `XAI_API_KEY`           | `xai/grok-4.3`                                             |
| Xiaomi                                  | `xiaomi` / `xiaomi-token-plan`   | `XIAOMI_API_KEY` / `XIAOMI_TOKEN_PLAN_API_KEY`       | `xiaomi/mimo-v2-flash` / `xiaomi-token-plan/mimo-v2.5-pro` |

#### 值得注意的特殊行为

<AccordionGroup>
  <Accordion title="OpenRouter">
    仅在经过验证的 `openrouter.ai` 路由上应用其应用归因请求头和 Anthropic `cache_control` 标记。DeepSeek、Moonshot 和 ZAI 引用可用于 OpenRouter 托管的提示缓存 TTL，但不会接收 Anthropic 缓存标记。作为类代理的 OpenAI 兼容路径，它会跳过仅限原生 OpenAI 的形状处理（`serviceTier`、Responses `store`、提示缓存提示、OpenAI reasoning-compat）。基于 Gemini 的引用只保留代理-Gemini 思维签名清理。
  </Accordion>
  <Accordion title="Kilo Gateway">
    基于 Gemini 的引用遵循相同的代理-Gemini 清理路径；`kilocode/kilo/auto` 和其他不支持代理推理的引用会跳过代理推理注入。
  </Accordion>
  <Accordion title="MiniMax">
    API-key onboarding 会写入明确的 M3 和 M2.7 聊天模型定义；图像理解仍保留在插件拥有的 `MiniMax-VL-01` 媒体提供商上。
  </Accordion>
  <Accordion title="NVIDIA">
    模型 id 使用 `nvidia/<vendor>/<model>` 命名空间（例如 `nvidia/nvidia/nemotron-...`，以及 `nvidia/moonshotai/kimi-k2.5`）；选择器会保留字面上的 `<provider>/<model-id>` 组合，而发送到 API 的规范键仍保持单前缀。
  </Accordion>
  <Accordion title="xAI">
    使用 xAI Responses 路径。推荐路径是 SuperGrok/X Premium OAuth；API key 仍可通过 `XAI_API_KEY` 或插件配置使用，Grok `web_search` 会在回退到 API key 之前复用同一认证配置文件。`grok-4.3` 是捆绑的默认聊天模型，而 `grok-build-0.1` 可用于构建/编码导向工作。`/fast` 或 `params.fastMode: true` 会将 `grok-3`、`grok-3-mini`、`grok-4` 和 `grok-4-0709` 重写为其 `*-fast` 变体。`tool_stream` 默认开启；可通过 `agents.defaults.models["xai/<model>"].params.tool_stream=false` 关闭。
  </Accordion>
</AccordionGroup>

## 通过 `models.providers` 提供（自定义/基础 URL）

使用 `models.providers`（或 `models.json`）来添加**自定义**提供商或 OpenAI/Anthropic 兼容代理。

下面许多内置的提供商插件已经发布了默认目录。只有在你想覆盖默认基础 URL、请求头或模型列表时，才使用显式的 `models.providers.<id>` 条目。

网关模型能力检查也会读取显式的 `models.providers.<id>.models[]` 元数据。如果自定义或代理模型支持图像，请在该模型上设置 `input: ["text", "image"]`，这样 WebChat 和 node-origin 附件路径会将图像作为原生模型输入传递，而不是仅文本的媒体引用。

`agents.defaults.models["provider/model"]` 只控制 agent 的模型可见性、别名和每个模型的元数据。它本身不会注册新的运行时模型。对于自定义提供商模型，还需要添加 `models.providers.<provider>.models[]`，并至少包含匹配的 `id`。

### Moonshot AI (Kimi)

在 onboarding 之前安装 `@openclaw/moonshot-provider`。只有在你需要覆盖基础 URL 或模型元数据时，才添加显式的 `models.providers.moonshot` 条目：

- 提供商：`moonshot`
- 认证：`MOONSHOT_API_KEY`
- 示例模型：`moonshot/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice moonshot-api-key` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`

Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.6`
- `moonshot/kimi-k2.7-code`
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

See [Moonshot AI (Kimi + Kimi Coding)](/providers/moonshot) for the full setup guide.

### Kimi Coding

Kimi Coding 使用 Moonshot AI 的 Anthropic 兼容端点：

- 提供商：`kimi`
- 认证：`KIMI_API_KEY`
- 示例模型：`kimi/kimi-for-coding`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-for-coding" } },
  },
}
```

旧版的 `kimi/kimi-code` 和 `k2p5` 仍然作为兼容的模型 id 被接受，并会归一化为 Kimi 的稳定 API 模型 id。

### 火山引擎（豆包）

火山引擎提供对中国境内的豆包及其他模型的访问。

- 提供商：`volcengine`（coding：`volcengine-plan`）
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

注册时默认使用 coding 界面，但通用的 `volcengine/*` 目录会同时注册。

在 onboarding/configure 模型选择器中，Volcengine 认证选项会优先显示 `volcengine/*` 和 `volcengine-plan/*` 两类条目。如果这些模型尚未加载，OpenClaw 会回退到未过滤的目录，而不是显示一个空的按提供商分组选择器。

<Tabs>
  <Tab title="标准模型">
    - `volcengine/doubao-seed-1-8-251228`（豆包 Seed 1.8）
    - `volcengine/doubao-seed-code-preview-251028`
    - `volcengine/kimi-k2-5-260127` (Kimi K2.5)
    - `volcengine/glm-4-7-251222` (GLM 4.7)
    - `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2)

  </Tab>
  <Tab title="编程模型（volcengine-plan）">
    - `volcengine-plan/ark-code-latest`
    - `volcengine-plan/doubao-seed-code`
    - `volcengine-plan/kimi-k2.5`
    - `volcengine-plan/kimi-k2-thinking`
    - `volcengine-plan/glm-4.7`

  </Tab>
</Tabs>

### BytePlus（国际版）

BytePlus ARK 为国际用户提供与火山引擎相同的模型访问能力。

- 提供商：`byteplus`（coding：`byteplus-plan`）
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

注册时默认使用 coding 界面，但通用的 `byteplus/*` 目录会同时注册。

在 onboarding/configure 模型选择器中，BytePlus 认证选项会优先显示 `byteplus/*` 和 `byteplus-plan/*` 两类条目。如果这些模型尚未加载，OpenClaw 会回退到未过滤的目录，而不是显示一个空的按提供商分组选择器。

<Tabs>
  <Tab title="标准模型">
    - `byteplus/seed-1-8-251228`（Seed 1.8）
    - `byteplus/kimi-k2-5-260127`（Kimi K2.5）
    - `byteplus/glm-4-7-251222`（GLM 4.7）

  </Tab>
  <Tab title="编程模型（byteplus-plan）">
    - `byteplus-plan/ark-code-latest`
    - `byteplus-plan/doubao-seed-code`
    - `byteplus-plan/kimi-k2.5`
    - `byteplus-plan/kimi-k2-thinking`
    - `byteplus-plan/glm-4.7`

  </Tab>
</Tabs>

### Synthetic

Synthetic 通过 `synthetic` 提供商提供 Anthropic 兼容模型：

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

- MiniMax OAuth（全球）：`--auth-choice minimax-global-oauth`
- MiniMax OAuth（中国）：`--auth-choice minimax-cn-oauth`
- MiniMax API key（全球）：`--auth-choice minimax-global-api`
- MiniMax API key（中国）：`--auth-choice minimax-cn-api`
- 认证：`minimax` 使用 `MINIMAX_API_KEY`；`minimax-portal` 使用 `MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY`

请参见 [/providers/minimax](/providers/minimax) 获取设置详情、模型选项和配置片段。

<Note>
在 MiniMax 的 Anthropic 兼容流式路径上，OpenClaw 默认会为 M2.x 系列关闭 thinking，除非你显式设置；MiniMax-M3（以及 M3.x）默认保持提供商省略/自适应 thinking 路径。`/fast on` 会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
</Note>

插件拥有的能力划分：

- 文本/聊天默认使用 `minimax/MiniMax-M3`
- 图像生成使用 `minimax/image-01` 或 `minimax-portal/image-01`
- 图像理解在两种 MiniMax 认证路径上都由插件拥有的 `MiniMax-VL-01` 提供
- Web 搜索保持在提供商 id `minimax`

### LM Studio

LM Studio 作为一个内置提供商插件发布，使用原生 API：

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

OpenClaw 使用 LM Studio 的原生 `/api/v1/models` 和 `/api/v1/models/load` 进行发现 + 自动加载，并默认使用 `/v1/chat/completions` 进行推理。如果你希望由 LM Studio 自己管理模型生命周期（JIT 加载、TTL 和自动逐出），请将 `models.providers.lmstudio.params.preload: false`。有关设置和故障排除，请参见 [/providers/lmstudio](/providers/lmstudio)。

### Ollama

Ollama 作为一个内置提供商插件发布，并使用 Ollama 的原生 API：

- 提供商：`ollama`
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

当你通过 `OLLAMA_API_KEY` 选择启用时，Ollama 会在本地 `http://127.0.0.1:11434` 被检测到，内置提供商插件会将 Ollama 直接加入 `openclaw onboard` 和模型选择器。请参见 [/providers/ollama](/providers/ollama) 获取 onboarding、云端/本地模式和自定义配置说明。

### vLLM

vLLM 作为一个内置提供商插件发布，用于本地/自托管的 OpenAI 兼容服务器：

- 提供商：`vllm`
- 认证：可选（取决于你的服务器）
- 默认基础 URL：`http://127.0.0.1:8000/v1`

要在本地启用自动发现（如果你的服务器不强制认证，任何值都可以）：

```bash
export VLLM_API_KEY="vllm-local"
```

然后设置一个模型（替换为 `/v1/models` 返回的某个 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

详情请参见 [/providers/vllm](/providers/vllm)。

### SGLang

SGLang 作为一个内置提供商插件发布，用于快速的自托管 OpenAI 兼容服务器：

- 提供商：`sglang`
- 认证：可选（取决于你的服务器）
- 默认基础 URL：`http://127.0.0.1:30000/v1`

要在本地启用自动发现（如果你的服务器不强制认证，任何值都可以）：

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

详情请参见 [/providers/sglang](/providers/sglang)。

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
    对于自定义提供商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 都是可选的。未指定时，OpenClaw 默认：

    - `reasoning: false`
    - `input: ["text"]`
    - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
    - `contextWindow: 200000`
    - `maxTokens: 8192`

    建议：设置与你的代理/模型限制相匹配的显式值。

  </Accordion>
  <Accordion title="代理路由整形规则">
    - 对于非原生端点上的 `api: "openai-completions"`（任何主机不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 会强制 `compat.supportsDeveloperRole: false`，以避免提供商因不支持的 `developer` 角色而返回 400 错误。
    - 代理风格的 OpenAI 兼容路由也会跳过原生 OpenAI 专用的请求整形：不发送 `service_tier`、不发送 Responses 的 `store`、不发送 Completions 的 `store`、不发送 prompt-cache 提示、不进行 OpenAI reasoning 兼容载荷整形，并且不会添加隐藏的 OpenClaw 归因请求头。
    - 对于需要供应商特定字段的 OpenAI 兼容 Completions 代理，请设置 `agents.defaults.models["provider/model"].params.extra_body`（或 `extraBody`），将额外的 JSON 合并到出站请求体中。
    - 对于 vLLM 的 chat-template 控制，请设置 `agents.defaults.models["provider/model"].params.chat_template_kwargs`。当会话的 thinking 级别关闭时，随附的 vLLM 插件会自动为 `vllm/nemotron-3-*` 发送 `enable_thinking: false` 和 `force_nonempty_content: true`。
    - 对于较慢的本地模型或远程 LAN/tailnet 主机，请设置 `models.providers.<id>.timeoutSeconds`。这会延长提供商模型的 HTTP 请求处理时间，包括连接、请求头、流式请求体以及总的受保护 fetch 中止时间，但不会增加整个 agent 运行时的超时时间。如果 `agents.defaults.timeoutSeconds` 或某次运行的特定超时更低，也需要同时提高那个上限；提供商超时不能延长整个运行时长。
    - 模型提供商的 HTTP 调用仅允许 Surge、Clash 和 sing-box 的 fake-IP DNS 应答（`198.18.0.0/15` 和 `fc00::/7`）用于已配置的提供商 `baseUrl` 主机名。自定义/本地提供商端点也会对该精确配置的 `scheme://host:port` 来源信任受保护的模型请求，包括回环、局域网和 tailnet 主机。这不是一个新的配置选项；你配置的 `baseUrl` 只会将请求策略扩展到该来源。fake-IP 主机名允许与精确来源信任是相互独立的机制。其他私有地址、回环、链路本地、元数据目标以及不同端口仍然需要显式启用 `models.providers.<id>.request.allowPrivateNetwork: true`。设置 `models.providers.<id>.request.allowPrivateNetwork: false` 可退出精确来源信任。
    - 如果 `baseUrl` 为空/未指定，OpenClaw 会保持默认的 OpenAI 行为（即解析到 `api.openai.com`）。
    - 出于安全考虑，即使显式设置了 `compat.supportsDeveloperRole: true`，在非原生 `openai-completions` 端点上也仍会被覆盖。
    - 对于非直连端点上的 `api: "anthropic-messages"`（任何非标准的 `anthropic` 提供商，或者主机不是公开 `api.anthropic.com` 端点的自定义 `models.providers.anthropic.baseUrl`），OpenClaw 会抑制隐式的 Anthropic beta 请求头，例如 `claude-code-20250219`、`interleaved-thinking-2025-05-14` 和 OAuth 标记，从而避免自定义的 Anthropic 兼容代理拒绝不受支持的 beta 标志。如果你的代理需要特定的 beta 功能，请显式设置 `models.providers.<id>.headers["anthropic-beta"]`。

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

- [配置参考](/gateway/config-agents#agent-defaults) - 模型配置键
- [模型故障转移](/concepts/model-failover) - 回退链和重试行为
- [模型](/concepts/models) - 模型配置和别名
- [提供商](/providers) - 每个提供商的设置指南
