---
summary: "模型提供商概述及示例配置 + CLI 流程"
read_when:
  - 您需要逐个提供商的模型设置参考
  - 您想要模型提供商的示例配置或 CLI 注册命令
title: "模型提供商"
---

# 模型提供商

本页涵盖**LLM/模型提供商**（非聊天渠道如 WhatsApp/Telegram）。  
有关模型选择规则，请参见 [/concepts/models](/concepts/models)。

## 快速规则

- 模型引用使用 `provider/model` 格式（示例：`opencode/claude-opus-4-6`）。  
- 如果设置了 `agents.defaults.models`，则它成为允许列表。  
- CLI 辅助工具：`openclaw onboard`，`openclaw models list`，`openclaw models set <provider/model>`。

## API 密钥轮换

- 支持针对选定提供商的通用密钥轮换。  
- 通过以下方式配置多个密钥：  
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个生效覆盖，优先级最高）  
  - `<PROVIDER>_API_KEYS`（逗号或分号分隔列表）  
  - `<PROVIDER>_API_KEY`（主密钥）  
  - `<PROVIDER>_API_KEY_*`（编号列表，例如 `<PROVIDER>_API_KEY_1`）  
- 对于 Google 提供商，还包含 `GOOGLE_API_KEY` 作为备用。  
- 密钥选择顺序保持优先级并去重。  
- 仅在收到速率限制响应（如 `429`，`rate_limit`，`quota`，`resource exhausted`）时，才使用下一个密钥重试请求。  
- 非速率限制失败将立即失败；不尝试密钥轮换。  
- 当所有候选密钥均失败时，最终错误来自最后一次尝试。

## 内置提供商（pi-ai 目录）

OpenClaw 自带 pi-ai 目录。这些提供商无需配置 `models.providers`；只需设置认证并选择模型。

### OpenAI

- 提供商：`openai`  
- 认证：`OPENAI_API_KEY`  
- 可选轮换：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2` 及 `OPENCLAW_LIVE_OPENAI_KEY`（单个覆盖）  
- 示例模型：`openai/gpt-5.4`，`openai/gpt-5.4-pro`  
- CLI：`openclaw onboard --auth-choice openai-api-key`  
- 默认传输为 `auto`（优先 WebSocket，失败时降级 SSE）  
- 可通过 `agents.defaults.models["openai/<model>"].params.transport` 覆盖单个模型传输方式（`"sse"`、`"websocket"` 或 `"auto"`）  
- OpenAI 响应 WebSocket 预热默认启用，通过 `params.openaiWsWarmup` 设置（`true`/`false`）  
- 可通过 `agents.defaults.models["openai/<model>"].params.serviceTier` 启用 OpenAI 优先级处理  
- 可通过 `agents.defaults.models["<provider>/<model>"].params.fastMode` 为单个模型启用 OpenAI 快速模式  
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中有意被屏蔽，因为实时 OpenAI API 拒绝该模型；Spark 仅作为 Codex 使用

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- 提供商：`anthropic`  
- 认证：`ANTHROPIC_API_KEY` 或 `claude setup-token`  
- 可选轮换：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2` 及 `OPENCLAW_LIVE_ANTHROPIC_KEY`（单个覆盖）  
- 示例模型：`anthropic/claude-opus-4-6`  
- CLI：`openclaw onboard --auth-choice token`（粘贴 setup-token）或 `openclaw models auth paste-token --provider anthropic`  
- 直连 API-key 模型支持共享的 `/fast` 开关和 `params.fastMode`；OpenClaw 将其映射为 Anthropic 的 `service_tier`（`auto` 或 `standard_only`）  
- 策略说明：setup-token 支持是为技术兼容；Anthropic 以前曾阻止部分订阅在 Claude Code 以外的使用。请核查当前 Anthropic 条款，并根据风险承受能力决策。  
- 建议：Anthropic API 密钥认证是更安全、推荐的方式，优于订阅 setup-token 认证。

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI 代码（Codex）

- 提供商：`openai-codex`  
- 认证：OAuth（ChatGPT）  
- 示例模型：`openai-codex/gpt-5.4`  
- CLI：`openclaw onboard --auth-choice openai-codex` 或 `openclaw models auth login --provider openai-codex`  
- 默认传输为 `auto`（优先 WebSocket，失败时降级 SSE）  
- 可通过 `agents.defaults.models["openai-codex/<model>"].params.transport` 覆盖单个模型传输方式（`"sse"`、`"websocket"` 或 `"auto"`）  
- 共享与直连 `openai/*` 相同的 `/fast` 开关与 `params.fastMode` 配置  
- 当 Codex OAuth 目录暴露时，`openai-codex/gpt-5.3-codex-spark` 仍可用；但依赖授权  
- 策略说明：OpenAI Codex OAuth 明确支持外部工具/工作流，如 OpenClaw。

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

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
- 可选轮换：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 备用及 `OPENCLAW_LIVE_GEMINI_KEY`（单个覆盖）  
- 示例模型：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`  
- 兼容性说明：旧版 OpenClaw 配置使用 `google/gemini-3.1-flash-preview` 会被规范化为 `google/gemini-3-flash-preview`  
- CLI：`openclaw onboard --auth-choice gemini-api-key`

### Google Vertex、Antigravity 和 Gemini CLI

- 提供商：`google-vertex`、`google-antigravity`、`google-gemini-cli`  
- 认证：Vertex 使用 gcloud ADC；Antigravity/Gemini CLI 使用各自的认证流程  
- 注意：Antigravity 和 Gemini CLI OAuth 在 OpenClaw 中是非官方集成。一些用户报告使用第三方客户端后 Google 账户受到限制。请审查 Google 条款，并优先使用非重要账户。  
- Antigravity OAuth 以捆绑插件形式内置（`google-antigravity-auth`，默认禁用）。  
  - 启用：`openclaw plugins enable google-antigravity-auth`  
  - 登录：`openclaw models auth login --provider google-antigravity --set-default`  
- Gemini CLI OAuth 以捆绑插件形式内置（`google-gemini-cli-auth`，默认禁用）。  
  - 启用：`openclaw plugins enable google-gemini-cli-auth`  
  - 登录：`openclaw models auth login --provider google-gemini-cli --set-default`  
  - 注：无需将客户端 ID 或密钥粘贴至 `openclaw.json`。CLI 登录流程将令牌存储于网关主机的认证配置中。

### Z.AI（GLM）

- 提供商：`zai`  
- 认证：`ZAI_API_KEY`  
- 示例模型：`zai/glm-5`  
- CLI：`openclaw onboard --auth-choice zai-api-key`  
  - 别名：`z.ai/*` 和 `z-ai/*` 均归一至 `zai/*`

### Vercel AI Gateway

- 提供商：`vercel-ai-gateway`  
- 认证：`AI_GATEWAY_API_KEY`  
- 示例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`  
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- 提供商：`kilocode`  
- 认证：`KILOCODE_API_KEY`  
- 示例模型：`kilocode/anthropic/claude-opus-4.6`  
- CLI：`openclaw onboard --kilocode-api-key <key>`  
- 基础 URL：`https://api.kilo.ai/api/gateway/`  
- 扩展内置目录包含 GLM-5 Free，MiniMax M2.5 Free，GPT-5.2，Gemini 3 Pro Preview，Gemini 3 Flash Preview，Grok Code Fast 1 和 Kimi K2.5。  

详情见 [/providers/kilocode](/providers/kilocode)。

### 其他内置提供商

- OpenRouter：`openrouter`（`OPENROUTER_API_KEY`）  
- 示例模型：`openrouter/anthropic/claude-sonnet-4-5`  
- Kilo Gateway：`kilocode`（`KILOCODE_API_KEY`）  
- 示例模型：`kilocode/anthropic/claude-opus-4.6`  
- xAI：`xai`（`XAI_API_KEY`）  
- Mistral：`mistral`（`MISTRAL_API_KEY`）  
- 示例模型：`mistral/mistral-large-latest`  
- CLI：`openclaw onboard --auth-choice mistral-api-key`  
- Groq：`groq`（`GROQ_API_KEY`）  
- Cerebras：`cerebras`（`CEREBRAS_API_KEY`）  
  - Cerebras 上的 GLM 模型使用 id：`zai-glm-4.7` 和 `zai-glm-4.6`  
  - OpenAI 兼容基础 URL：`https://api.cerebras.ai/v1`  
- GitHub Copilot：`github-copilot`（`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`）  
- Hugging Face 推理：`huggingface`（`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`）— OpenAI 兼容路由；示例模型：`huggingface/deepseek-ai/DeepSeek-R1`；CLI：`openclaw onboard --auth-choice huggingface-api-key`。详见 [Hugging Face (Inference)](/providers/huggingface)。

## 通过 `models.providers` 设定的提供商（自定义/base URL）

使用 `models.providers`（或 `models.json`）添加**自定义**提供商或 OpenAI/Anthropic 兼容代理。

### Moonshot AI（Kimi）

Moonshot 使用 OpenAI 兼容端点，故可配置为自定义提供商：

- 提供商：`moonshot`  
- 认证：`MOONSHOT_API_KEY`  
- 示例模型：`moonshot/kimi-k2.5`  

Kimi K2 模型 ID：

<!-- markdownlint-disable MD037 -->

{/_ moonshot-kimi-k2-model-refs:start _/ && null}

<!-- markdownlint-enable MD037 -->

- `moonshot/kimi-k2.5`  
- `moonshot/kimi-k2-0905-preview`  
- `moonshot/kimi-k2-turbo-preview`  
- `moonshot/kimi-k2-thinking`  
- `moonshot/kimi-k2-thinking-turbo`  
  <!-- markdownlint-disable MD037 -->
  {/_ moonshot-kimi-k2-model-refs:end _/ && null}
  <!-- markdownlint-enable MD037 -->

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.5", name: "Kimi K2.5" }],
      },
    },
  },
}
```

### Kimi Coding

Kimi Coding 使用 Moonshot AI 的 Anthropic 兼容端点：

- 提供商：`kimi-coding`  
- 认证：`KIMI_API_KEY`  
- 示例模型：`kimi-coding/k2p5`  

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi-coding/k2p5" } },
  },
}
```

### Qwen OAuth（免费层）

Qwen 通过设备码流程提供对 Qwen Coder + Vision 的 OAuth 访问。  
启用捆绑插件后登录：

```bash
openclaw plugins enable qwen-portal-auth
openclaw models auth login --provider qwen-portal --set-default
```

模型引用：

- `qwen-portal/coder-model`  
- `qwen-portal/vision-model`  

详情见 [/providers/qwen](/providers/qwen)。

### Volcano Engine（斗宝）

火山引擎提供对斗宝等中国模型的访问。

- 提供商：`volcengine`（编码：`volcengine-plan`）  
- 认证：`VOLCANO_ENGINE_API_KEY`  
- 示例模型：`volcengine/doubao-seed-1-8-251228`  
- CLI：`openclaw onboard --auth-choice volcengine-api-key`  

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine/doubao-seed-1-8-251228" } },
  },
}
```

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

- 提供商：`byteplus`（编码：`byteplus-plan`）  
- 认证：`BYTEPLUS_API_KEY`  
- 示例模型：`byteplus/seed-1-8-251228`  
- CLI：`openclaw onboard --auth-choice byteplus-api-key`  

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus/seed-1-8-251228" } },
  },
}
```

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

Synthetic 提供基于 Anthropic 的兼容模型，使用 `synthetic` 提供商：

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

- MiniMax（Anthropic 兼容）：`--auth-choice minimax-api`  
- 认证：`MINIMAX_API_KEY`  

详情见 [/providers/minimax](/providers/minimax)，含设置细节、模型选项和配置片段。

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

Ollama 在本地 `http://127.0.0.1:11434` 被自动检测，需启用 `OLLAMA_API_KEY`，捆绑插件可直接将 Ollama 添加到 `openclaw onboard` 和模型选择器中。详见 [/providers/ollama](/providers/ollama) 获取上手、本地/云模式及自定义配置说明。

### vLLM

vLLM 是打包提供的本地/自托管 OpenAI 兼容服务器插件：

- 提供商：`vllm`  
- 认证：可选（取决于服务器）  
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
- 认证：可选（取决于服务器）
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
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: { "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" } },
    },
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "LMSTUDIO_KEY",
        api: "openai-completions",
        models: [
          {
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5",
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

- 对于自定义提供商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 均为可选。  
  未设置时，OpenClaw 默认：  
  - `reasoning: false`  
  - `input: ["text"]`  
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`  
  - `contextWindow: 200000`  
  - `maxTokens: 8192`  
- 建议设置与代理/模型限制匹配的明确数值。  
- 对于非原生端点的 `api: "openai-completions"`（即除 `api.openai.com` 以外任意非空 `baseUrl`），OpenClaw 会强制设置 `compat.supportsDeveloperRole: false`，以避免提供商因不支持 `developer` 角色而返回 400 错误。  
- 若 `baseUrl` 为空或省略，OpenClaw 保持默认 OpenAI 行为（解析到 `api.openai.com`）。  
- 出于安全考虑，即使显式设置了 `compat.supportsDeveloperRole: true`，在非原生 `openai-completions` 端点上仍会被覆盖。

## CLI 示例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另请参阅：[/gateway/configuration](/gateway/configuration) 获取完整配置示例。
