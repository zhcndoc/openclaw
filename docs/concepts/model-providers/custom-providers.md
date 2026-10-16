---
summary: "通过 models.providers 配置的提供程序：自定义端点、基本 URL 和本地推理服务器。"
read_when:
  - "您正在通过 models.providers 配置提供程序"
  - "您将 OpenClaw 指向自定义基础 URL 或代理"
  - "您正在运行 llama.cpp、LM Studio、Ollama、vLLM 或 SGLang"
title: "自定义提供程序和本地运行时"
---

## <a id="providers-via-models.providers-(custom%2Fbase-url)"></a><a id="providers-via-models-providers-custom/base-url"></a> 通过 `models.providers` 提供者 （custom/base URL）

使用 `models.providers`（或 `models.json`）添加 **custom** 提供程序或 OpenAI/Anthropic-compatible 代理。

下面许多内置的提供商插件已经发布了默认目录。只有在你想覆盖默认基础 URL、请求头或模型列表时，才使用显式的 `models.providers.<id>` 条目。

捆绑和目录已知的路由从拥有的提供商插件中获取其 `compat` 功能。配置 `compat` 块用于自定义 provider/model 或您已验证其端点合同的不同 `api`/`baseUrl` 路由；请参阅 [ 定制提供商能力指南](/gateway/config-tools#custom-provider-capability-declarations)。 Doctor 删除了仅重复目录的遗留值，并留下不同的值供操作员查看。

自定义端点不会继承原始目录路由的首选代码模式层。通过自动代码模式并且无需自定义 `compat.codeMode` 声明，嵌入式运行时保持其正常的工具表面。仅在验证该端点上的代码模式后才设置 `compat.codeMode: "preferred"`。

提供商标准化别名（例如 Anthropic 端点的 `/v1` 后缀）保留其标准目录功能。

Gateway 的模型能力检查也会读取显式的 `models.providers.<id>.models[]` 元数据。如果自定义或代理模型接受图像，请在该模型上设置 `input: ["text", "image"]`，这样 WebChat 和 node-origin 附件路径就会将图像作为原生模型输入传递，而不是仅文本的媒体引用。

`agents.defaults.models["provider/model"]` 用于控制 agents 的别名和每个模型的元数据。它既不会限制覆盖，也不会单独注册新的运行时模型。对于自定义提供商模型，还要添加 `models.providers.<provider>.models[]`，并至少包含匹配的 `id`；当你想要覆盖限制时，请另外使用 `agents.defaults.modelPolicy.allow`。

### Moonshot AI (Kimi)

在引导流程之前安装 `@openclaw/moonshot-provider`。只有在你需要覆盖基础 URL 或模型元数据时，才添加显式的 `models.providers.moonshot` 条目：

- 提供方：`moonshot`
- 认证：`MOONSHOT_API_KEY`
- 示例模型：`moonshot/kimi-k3`
- CLI：`openclaw onboard --auth-choice moonshot-api-key` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`

Kimi 模型 ID：

[//]： # "moonshot-kimi-k2-model-refs：start"

- `moonshot/kimi-k2.6`
- `moonshot/kimi-k3`
- `moonshot/kimi-k2.7-code`
- `moonshot/kimi-k2.7-code-highspeed`
- `moonshot/kimi-k2.5`

[//]： # "moonshot-kimi-k2-model-refs：end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k3" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k3", name: "Kimi K3" }],
      },
    },
  },
}
```

参见 [Moonshot AI（Kimi + Kimi Coding）](/providers/moonshot) 获取完整设置指南。

### <a id="kimi-coding"></a> Kimi 编程

Kimi 编码使用 Moonshot AI 的 Anthropic- 兼容端点：

- 提供商：`kimi`
- 认证：`KIMI_API_KEY`
- Kimi K3：`kimi/k3`（最高 1M，按层级开放）或 `kimi/k3-256k`（256K，较低配额使用）
- Kimi 代码：`kimi/kimi-for-coding`
- Kimi 代码 HighSpeed： `kimi/kimi-for-coding-highspeed`

```json5
{
  env: { vars: { KIMI_API_KEY: "sk-..." } },
  agents: {
    defaults: { model: { primary: "kimi/kimi-for-coding" } },
  },
}
```

Kimi K3 使用自适应思考。`--thinking minimal|low` 选择低强度， `--thinking medium|high|adaptive` 选择高强度，而 `--thinking xhigh|max` 选择最高强度。目录定价为输入 $3/MTok、输出 $15/MTok，以及缓存读取 $0.30/MTok。旧版 `kimi/kimi-code` 和 `kimi/k2p5` 仍然被接受为兼容模型 id，并会规范化为 Kimi 稳定 API 的模型 id；此前发布的 `kimi/k3[1m]` 引用会规范化为 `kimi/k3`，以兼容现有配置。

### <a id="volcano-engine-(doubao)"></a><a id="volcano-engine-doubao"></a> 火山发动机（Doubao）

火山引擎（Volcano Engine）提供在中国访问 Doubao 等模型的服务。

- 提供商：`volcengine`（编码：`volcengine-plan`）
- 认证：`VOLCANO_ENGINE_API_KEY`
- 示例模型：`volcengine-plan/ark-code-latest`
- CLI: `openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

注册时默认使用编码界面，但通用的 `volcengine/*` 目录会同时注册。

在 onboarding/configure 模型选择器中，Volcengine 身份验证选择更喜欢 `volcengine/*` 和 `volcengine-plan/*` 行。如果这些模型尚未加载，OpenClaw 会回退到未过滤的目录，而不是显示空的提供者范围选择器。

<Tabs>
  <Tab id="standard-models" title="标准模型">
    - `volcengine/doubao-seed-evolving`（Doubao 种子进化）
    - `volcengine/doubao-seed-2-1-pro-260628`（Doubao 种子 2.1 专业版）
    - `volcengine/doubao-seed-2-1-turbo-260628`（Doubao 种子 2.1 涡轮）
    - `volcengine/glm-5-2-260617` (GLM 5.2)
    - `volcengine/deepseek-v4-pro-260425` （DeepSeek V4 Pro）
    - `volcengine/deepseek-v4-flash-260425`（DeepSeek V4 闪存）

  </Tab>
  <Tab id="coding-models-volcengine-plan" title="编码模型（volcengine-plan）">
    - `volcengine-plan/ark-code-latest`（方舟编码方案）
    - `volcengine-plan/doubao-seed-2.1-turbo`（Doubao 种子 2.1 涡轮）
    - `volcengine-plan/glm-5.2` (GLM 5.2)
    - `volcengine-plan/deepseek-v4-pro` （DeepSeek V4 Pro）
    - `volcengine-plan/deepseek-v4-flash`（DeepSeek V4 闪存）

  </Tab>
</Tabs>

### <a id="byteplus-(international)"></a><a id="byteplus-international"></a> BytePlus（国际版）

BytePlus ARK 为国际用户提供与火山引擎相同的模型访问能力。

- 插件：`@openclaw/byteplus-provider`
- 提供商：`byteplus`（编程：`byteplus-plan`）
- 认证：`BYTEPLUS_API_KEY`
- 示例模型：`byteplus-plan/ark-code-latest`
- CLI: `openclaw onboard --auth-choice byteplus-api-key`

安装官方插件并重启网关：

```bash
openclaw plugins install @openclaw/byteplus-provider
openclaw gateway restart
```

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

注册时默认使用编程界面，但通用的 `byteplus/*` 目录会同时注册。

在 onboarding/configure 模型选择器中，BytePlus 身份验证选择更喜欢 `byteplus/*` 和 `byteplus-plan/*` 行。如果这些模型尚未加载，OpenClaw 会回退到未过滤的目录，而不是显示空的提供者范围选取器。

<Tabs>
  <Tab id="standard-models-2" title="标准模型">
    - `byteplus/dola-seed-2-1-turbo-260628` （Dola Seed 2.1 Turbo）
    - `byteplus/seed-2-0-code-preview-260328`（种子2.0代码预览）
    - `byteplus/glm-5-2-260617` (GLM 5.2)
    - `byteplus/deepseek-v4-pro-260425` （DeepSeek V4 Pro）
    - `byteplus/deepseek-v4-flash-260425`（DeepSeek V4 闪存）

  </Tab>
  <Tab id="coding-models-byteplus-plan" title="编码模型（byteplus-plan）">
    - `byteplus-plan/ark-code-latest`（方舟编码方案）
    - `byteplus-plan/kimi-k2.5`（Kimi K2.5 编码）

  </Tab>
</Tabs>

### Synthetic

Synthetic 在 `synthetic` 提供程序背后提供 Anthropic- 兼容模型：

- 提供商：`synthetic`
- 认证：`SYNTHETIC_API_KEY`
- 示例模型：`synthetic/hf:MiniMaxAI/MiniMax-M3`
- CLI: `openclaw onboard --auth-choice synthetic-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M3" } },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [{ id: "hf:MiniMaxAI/MiniMax-M3", name: "MiniMax M3" }],
      },
    },
  },
}
```

### MiniMax

MiniMax 通过 `models.providers` 配置，因为它使用自定义端点：

- MiniMax OAuth（全球）：`--auth-choice minimax-global-oauth`
- MiniMax OAuth (CN): `--auth-choice minimax-cn-oauth`
- MiniMax API 密钥（全球）：`--auth-choice minimax-global-api`
- MiniMax API 密钥 （CN）： `--auth-choice minimax-cn-api`
- Auth：`MINIMAX_API_KEY` 为 `minimax`； `MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY` 适用于 `minimax-portal`

请参见 [/providers/minimax](/providers/minimax) 获取设置详情、模型选项和配置片段。

<Note>
在 MiniMax 的 Anthropic- 兼容流路径上，OpenClaw 默认禁用 M2.x 系列的思考，除非您明确设置；默认情况下，MiniMax-M3（和 M3.x）保留在提供商的 omitted/adaptive 思维路径上。 `/fast on` 将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
</Note>

插件拥有的能力划分：

- Text/chat 默认保留在 `minimax/MiniMax-M3`
- 图像生成使用 `minimax/image-01` 或 `minimax-portal/image-01`
- 图像理解在两种 MiniMax 认证路径上都由插件拥有的 `MiniMax-VL-01` 提供
- Web 搜索停留在提供商 ID `minimax` 上

### llama.cpp

捆绑的 `llama-cpp` 插件为一个本地文本提供程序提供了两种设置选择：

- **托管本地服务器**安装并监督经过验证的llama服务器和本地GGUF文件。
- **E现有的 llama-server** 连接到您操作的服务器并发现其模型。

为任一路径安装一次插件：

```bash
openclaw plugins install @openclaw/llama-cpp-provider
```

两者都使用 `llama-cpp/<model>` 参考。有关设置、发现、身份验证和托管本地嵌入的信息，请参阅 [llama.cpp](/plugins/llama-cpp)。

### llmman

llmman 通过 `models.providers` 配置为 OpenAI- 兼容的本地服务器。它将模型作为 OCI 工件拉取，并通过上游 `llama-server`、`vllm` 或 `mlx-lm` 为它们提供服务，并且可以在单个模型 ID 下将本地模型与托管模型配对：

- Provider：`llmman`（自定义；`api: "openai-completions"`）
- Auth：不强制执行；设置 `LLMMAN_API_KEY=llmman-local` 并使用 `apiKey: "${LLMMAN_API_KEY}"`
- 默认底座URL：`http://127.0.0.1:17434/v1`
- 示例模型：`llmman/qwen3.8`
- H混合示例：`llmman/llmman.hybrid/qwen3.8,openai/gpt-5.6-luna`

```bash
llmman pull qwen3.8
llmman serve
```

```json5
{
  agents: {
    defaults: { model: { primary: "llmman/qwen3.8" } },
  },
  models: {
    providers: {
      llmman: {
        baseUrl: "http://127.0.0.1:17434/v1",
        apiKey: "${LLMMAN_API_KEY}",
        api: "openai-completions",
        models: [
          { id: "qwen3.8", name: "Qwen3.8 (llmman)", reasoning: true, input: ["text", "image"] },
        ],
      },
    },
  },
}
```

请参阅 [/providers/llmman](/providers/llmman) 了解设置、混合本地 + 托管路由、愿景和故障排除。

### LM Studio

LM Studio 作为一个内置提供商插件发布，使用原生 API：

- 提供商：`lmstudio`
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

OpenClaw 使用 LM Studio 的原生 `/api/v1/models` 和 `/api/v1/models/load` 进行发现 + 自动加载，并默认使用 `/v1/chat/completions` 进行推理。如果你希望由 LM Studio 自己管理模型生命周期（JIT 加载、TTL 和自动逐出），请将 `models.providers.lmstudio.params.preload: false`。有关设置和故障排除，请参见 [/providers/lmstudio](/providers/lmstudio)。

### Ollama

Ollama 作为一个内置提供商插件发布，并使用 Ollama 的原生 API：

- 提供商：`ollama`
- 认证：不需要（本地服务器）
- 示例模型：`ollama/llama3.3`
- 安装：[https://ollama.com/download](https://ollama.com/download)

```bash
# Install Ollama, then pull a model:
ollama pull llama3.3
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } },
  },
}
```

当您选择使用 `OLLAMA_API_KEY` 时，会在 `http://127.0.0.1:11434` 本地检测到 Ollama，并且捆绑的提供程序插件将 Ollama 直接添加到 `openclaw onboard` 和模型选择器中。请参阅 [/providers/ollama](/providers/ollama) 了解入门、cloud/local 模式和自定义配置。

### vLLM

vLLM 作为 local/self-hosted OpenAI- 兼容服务器的捆绑提供商插件提供：

- 提供商：`vllm`
- 认证：可选（取决于你的服务器）
- 默认基础 URL：`http://127.0.0.1:8000/v1`

要在本地启用自动发现（如果你的服务器不强制认证，任何值都可以）：

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

详情请参见 [/providers/vllm](/providers/vllm)。

### <a id="sglang"></a> SG郎

SGLang 作为快速自托管 OpenAI- 兼容服务器的捆绑提供程序插件提供：

- 提供商：`sglang`
- 认证：可选（取决于你的服务器）
- 默认基础 URL：`http://127.0.0.1:30000/v1`

要在本地启用自动发现（如果你的服务器不强制认证，任何值都可以）：

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

详情请参见 [/providers/sglang](/providers/sglang)。

### <a id="local-proxies-(lm-studio%2C-vllm%2C-litellm%2C-etc.)"></a><a id="local-proxies-lm-studio-vllm-litellm-etc"></a> 本地代理（LM Studio、vLLM、LiteLLM 等）

示例（OpenAI- 兼容）：

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
        timeoutSeconds: 300,
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

<AccordionGroup>
  <Accordion id="default-optional-fields" title="默认可选字段">
    对于自定义提供商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 都是可选的。未指定时，OpenClaw 默认：

    - `reasoning: false`
    - `input: ["text"]`
    - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
    - `maxTokens`：无固定默认值。对于 OpenAI- 兼容完成，未知输出限制会忽略 `max_tokens` 和 `max_completion_tokens`，从而让提供程序应用其默认值。

    当模型的 `maxTokens` 未知时，Anthropic 和 Mistral 请求保留显式请求输出限制。 Anthropic 当没有可用的模型输出能力时，手动思维必须符合该要求限制。

    省略的 `contextWindow` 保持未设置状态，因此编写的本机窗口元数据是明确的。当发现和每个模型上下文元数据都不可用时，上下文预算调用者将使用标准 `200000`-token 后备。

    建议：设置与 proxy/model 限制相匹配的显式值。

    模型选择元数据将功能与 API 和提供它们的端点相关联。配置的路由更改会丢弃先前路由中的元数据，同时将显式 `thinkingLevelMap` 应用于配置的模型。

  </Accordion>
  <Accordion id="proxy-route-shaping-rules" title="代理路由整形规则">
    - 对于非本机端点上的 `api: "openai-completions"`（主机不是 `api.openai.com` 的任何非空 `baseUrl`），OpenClaw 强制 `compat.supportsDeveloperRole: false` 避免针对不受支持的 `developer` 角色出现提供程序 400 错误。
    - 当路由支持该角色时，Runtime 通知将按照会话顺序保留为 `developer` 消息，否则标记为 `user` 消息。他们从不添加后来的 `system` 消息，因此严格的聊天模板可以在通知后继续，而无需更改主要提示或存储的历史记录。
    - Proxy 风格的 OpenAI- 兼容路由跳过本机 OpenAI-only 请求整形：无 `service_tier`、无响应 `store`、无完成 `store`、无提示缓存提示、无隐藏的 OpenClaw 归因标头。
    - 自定义`openai-completions`标记为`reasoning: true`的模型在启用思考时默认发送`reasoning_effort`。如果模型的端点拒绝该字段，则在模型上设置 `compat.supportsReasoningEffort: false`。 `/think off` 默认省略它，让服务器自己的推理默认生效；有关明确的关闭映射和支持的工作级别，请参阅 [ 自定义端点思维 ](/tools/thinking#custom-openai-compatible-endpoints)。
    - 对于需要供应商特定字段的 OpenAI- 兼容完成代理，请设置 `agents.defaults.models["provider/model"].params.extra_body`（或 `extraBody`）以将额外的 JSON 合并到出站请求正文中。
    - 对于 vLLM 聊天模板控件，设置 `agents.defaults.models["provider/model"].params.chat_template_kwargs`。当会话思考级别关闭时，捆绑的 vLLM 插件会自动发送 `enable_thinking: false` 和 `vllm/nemotron-3-*` 的 `force_nonempty_content: true`。
    - 对于慢速本地模型或远程 LAN/tailnet 主机，设置 `models.providers.<id>.timeoutSeconds`。这扩展了提供程序模型 HTTP 请求处理，包括连接、标头、正文流和总受保护的获取中止，而不会增加代理运行时的每次尝试超时。初始响应标头等待使用第一个事件预算：云端点为 120 秒，local/self-hosted 端点为 300 秒，除非被提供商超时或较低的尝试上限覆盖。在提供者接受请求后，这不会向本地流添加空闲间隙监管。如果没有明确的提供程序超时，TCP/TLS 连接设置将保持其 10 秒默认值，与较长的流超时无关，包括重新连接池传输时。如果 `agents.defaults.timeoutSeconds` 或特定于运行的超时较低，则也提高该上限；提供者超时无法延长当前模型尝试。每个配置的后备都会获得新的尝试预算。
    - Model 提供者 HTTP 调用允许 Surge、Clash 和 sing-box fake-IP DNS 仅针对配置的提供者 `baseUrl` 主机名在 `198.18.0.0/15` 和 `fc00::/7` 中应答。 Custom/local 提供程序端点还信任受保护模型请求的精确配置的 `scheme://host:port` 源，包括环回、LAN 和 tailnet 主机。这不是一个新的配置选项；您配置的 `baseUrl` 仅扩展该源的请求策略。 Fake-IP 主机名允许和确切来源信任是独立的机制。其他私有、环回、链路本地、元数据、本地使用 NAT64 （`64:ff9b:1::/48`） 目标和不同端口仍然需要显式 `models.providers.<id>.request.allowPrivateNetwork: true` 选择加入。设置 `models.providers.<id>.request.allowPrivateNetwork: false` 以选择退出确切来源信任。
    - 如果 `baseUrl` 是 empty/omitted，则 OpenClaw 保留默认的 OpenAI 行为（解析为 `api.openai.com`）。
    - 出于安全考虑，即使显式设置了 `compat.supportsDeveloperRole: true`，在非原生 `openai-completions` 端点上也仍会被覆盖。
    - 对于非直接端点上的 `api: "anthropic-messages"`（标准 `anthropic` 提供程序以外的任何提供程序，或主机不是公共 `api.anthropic.com` 端点的自定义 `models.providers.anthropic.baseUrl`），OpenClaw 抑制隐式 Anthropic beta 标头，例如`claude-code-20250219`、`interleaved-thinking-2025-05-14` 和 OAuth 标记，因此自定义 Anthropic- 兼容代理不会拒绝不支持的 beta 标志。如果您的代理需要特定的测试版功能，请明确设置 `models.providers.<id>.headers["anthropic-beta"]`。

  </Accordion>
</AccordionGroup>
