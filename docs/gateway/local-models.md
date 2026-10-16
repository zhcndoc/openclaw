---
summary: "使用硬件感知本地模型设置或现有模型服务器运行 OpenClaw"
read_when:
  - "您希望 OpenClaw 推荐并安装适合您的网关硬件的模型"
  - "你想从自己的 GPU 机器提供模型服务"
  - "您正在连接 LM Studio 或 OpenAI- 兼容代理"
  - "你需要最安全的本地模型指南"
title: "本地模型"
---

OpenClaw 可以安装和管理本地模型或连接到您已运行的服务器。对于硬件感知建议，请安装 [llama.cpp 插件 ](/plugins/llama-cpp)，运行 `openclaw onboard`，然后选择 **托管本地服务器**。安装程序在下载之前显示网关主机、模型、下载大小和执行后端，然后在更改默认模型之前验证真实的工具调用。当您想要单独管理模型时，[LM、Studio](/providers/lmstudio) 和 [Ollama](/providers/ollama) 仍然是选项。

此页面还涵盖更大的本地堆栈和自定义 OpenAI- 兼容服务器。本地模型不提供托管提供商的安全过滤器。保持工具权限和提示注入防御适合模型和任务。

对于那些应仅在选定模型需要时才启动的本地服务器，请参阅 [本地模型服务](/gateway/local-model-services)。

## <a id="hardware-floor"></a> 硬件门槛

内存要求取决于模型权重、上下文大小、运行时间和主机上的其他工作。托管 llama.cpp 安装程序检查可用的 RAM、支持的 GPU 内存和磁盘空间，而不是假设特定计算机。它的精选食谱使用 64K 上下文。最小的配方有 8 个 GiB 主机内存层，而较大的配方则需要更多内存。这些地板不保证适合或速度。请参阅 [ 模型建议 ](/plugins/llama-cpp#model-recommendations) 了解当前目录。

对于自定义服务器，请为完整的 OpenClaw 提示、工具、历史记录和模型输出留出空间。加载或回答简短提示的模型仍可能导致代理轮次失败。在将其设置为默认值之前测试实际任务，并查看 [local-model security](/gateway/security)。

## <a id="pick-a-backend"></a> 选择后端

| 后端                                              | 适用场景                                                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [ds4](/providers/ds4)                                | macOS Metal 上的本地 DeepSeek V4 闪存，具有 OpenAI- 兼容工具调用                     |
| LiteLLM / OAI-proxy / 自定义 OpenAI- 兼容代理 | 您前面有另一个模型 API，需要 OpenClaw 将其视为 OpenAI                          |
| [llama.cpp](/plugins/llama-cpp)                      | 硬件感知模型选择、经过验证的下载和 OpenClaw- 托管服务器           |
| [llmman](/providers/llmman)                          | OCI-registry 模型拉取，上游 llama.cpp/vLLM/MLX 引擎，混合本地 + 托管路由 |
| [LM Studio](/providers/lmstudio)                     | 首次本地搭建、GUI 加载器、原生 Responses API                                     |
| MLX / vLLM / SGLang                                  | 具有 OpenAI- 兼容 HTTP 端点的高吞吐量自托管服务                  |
| [Ollama](/providers/ollama)                          | CLI 工作流、模型库、免管理的 systemd 服务                                       |

当后端支持时使用`api: "openai-responses"`（LM Studio支持）。否则使用 `api: "openai-completions"`。如果在具有 `baseUrl` 的自定义提供程序上省略 `api`，则 OpenClaw 默认为 `openai-completions`。

<Warning>
**WSL2 + Ollama + NVIDIA/CUDA：** 官方的 Ollama Linux 安装程序会启用一个带有 `Restart=always` 的 systemd 服务。在 WSL2 GPU 环境下，自动启动可能会在开机时重新加载上一个模型并锁定主机内存，从而导致 VM 反复重启。请参见 [WSL2 crash loop](/providers/ollama#troubleshooting)。
</Warning>

## <a id="lm-studio-%2B-large-local-model-(responses-api)"></a><a id="lm-studio-+-large-local-model-responses-api"></a> LM Studio + 大型本地模型（Responses API）

对于单独管理的本地服务器，请在 LM Studio 中加载适合您的硬件的模型。启用本地服务器（默认`http://127.0.0.1:1234`）。使用响应 API 将推理与最终文本分开。

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/my-local-model": { alias: "Local" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

设置清单：

- 安装 LM Studio: [https://lmstudio.ai](https://lmstudio.ai)
- 下载**最大可用模型构建**（避免“小”/大量量化变体），启动服务器，检查`http://127.0.0.1:1234/v1/models`是否列出它。
- 将 `my-local-model` 替换为 LM Studio 中显示的实际模型 ID。
- 保持模型加载。冷加载会增加启动延迟。
- 如果你的 LM Studio 构建版本不同，请调整 `contextWindow`/`maxTokens`。
- 对于 WhatsApp，请坚持使用 Responses API，这样只会发送最终文本。
- 保持 `models.mode: "merge"`，这样托管模型仍可作为回退方案使用。

### <a id="hybrid-config%3A-hosted-primary%2C-local-fallback"></a><a id="hybrid-config-hosted-primary-local-fallback"></a> 混合配置：托管主模型，本地回退

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["lmstudio/my-local-model", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "lmstudio/my-local-model": { alias: "Local" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

如果要优先本地并带有托管安全网，请交换 `primary`/`fallbacks` 的顺序，并保持相同的 `providers` 块以及 `models.mode: "merge"`。

OpenClaw 在提供商错误时每回合都会回退切换模型。对于在本地模型上保留小提示并仅将超大提示发送到托管模型的按请求路由，请参阅 [Hybrid inference](/providers/llmman#hybrid-inference) 和 llmman。

### <a id="regional-hosting-%2F-data-routing"></a><a id="regional-hosting-/-data-routing"></a> 区域托管 / 数据路由

托管 MiniMax/Kimi/GLM 变体也存在于具有区域固定端点的 OpenRouter 上（例如，US-hosted）。选择区域变体以将流量保持在您选择的管辖范围内，同时保留 `models.mode: "merge"` 为 Anthropic/OpenAI 后备。仅本地仍然是最强的隐私路径。当您需要提供商功能但希望控制数据流时，托管区域路由是中间立场。

## <a id="other-openai-compatible-local-proxies"></a> 其他 OpenAI- 兼容本地代理

MLX （`mlx_lm.server`）、vLLM、SGLang、LiteLLM、OAI-proxy 或任何自定义网关如果公开 OpenAI-style `/v1/chat/completions` 端点，则可以工作。使用 `openai-completions` 除非后端明确记录 `/v1/responses` 支持。

```json5
{
  agents: {
    defaults: {
      model: { primary: "local/my-local-model" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 120000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

Custom/local 提供程序条目信任其确切配置的 `baseUrl` 源来执行受保护的模型请求，包括环回、LAN、tailnet 和私有 DNS 主机。元数据、链接本地和本地使用 NAT64 （`64:ff9b:1::/48`） 源在没有明确选择加入的情况下仍会被阻止。对其他私人来源的请求仍然需要 `models.providers.<id>.request.allowPrivateNetwork: true`。将信任标志设置为 `false` 以选择退出确切来源信任。

`models.providers.<id>.models[].id` 是提供方本地的——不要包含提供方前缀。对于使用 `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` 启动的 MLX 服务器：

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

在本地或代理视觉模型上设置 `input: ["text", "image"]`，以便将图像附件注入到代理轮次中。交互式定制提供商入门会推断常见视觉模型 ID，并且仅询问未知名称。非交互式入门使用相同的推理，并使用 `--custom-image-input` / `--custom-text-input` 覆盖它。

在提升 `agents.defaults.timeoutSeconds` 之前，请对慢速 local/remote 模型服务器使用 `models.providers.<id>.timeoutSeconds`。提供程序超时仅涵盖模型 HTTP 请求的连接、标头、正文流和总保护获取中止。如果代理或特定于运行的超时较低，也请提高该超时：提供程序超时无法延长当前模型尝试的预算。每个配置的后备都会获得新的尝试预算。

<Note>
对于自定义 OpenAI- 兼容提供程序，当 `baseUrl` 解析为环回、私有 LAN、`.local` 或裸主机名时，接受非秘密本地标记，例如 `apiKey: "ollama-local"`。 OpenClaw 将其视为有效的本地凭证，而不是报告丢失的密钥。对任何接受公共主机名的提供程序使用实际值。
</Note>

local/proxied `/v1` 后端的行为说明：

- OpenClaw 将这些视为代理样式的 OpenAI- 兼容路由，而不是本机 OpenAI 端点。
- Native-OpenAI-only 请求整形不适用：无 `service_tier`、无响应 `store`、无 OpenAI 推理兼容有效负载整形、无提示缓存提示。
- H隐藏的 OpenClaw 归属标头（`originator`、`version`、`User-Agent`）不会注入到自定义代理 URL 上。

兼容性声明仅适用于此提供程序行描述的自定义端点。目录已知路由改为使用提供商拥有的功能。请参阅 [ 定制提供商能力指南 ](/gateway/config-tools#custom-provider-capability-declarations)。

更严格的 OpenAI- 兼容后端的 Compat 覆盖：

- **仅字符串内容**：某些服务器只接受字符串形式的 `messages[].content`，不接受结构化的 content-part 数组。请设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- **严格消息键**：如果服务器拒绝除 `role`/`content` 之外包含更多字段的消息条目，请设置 `compat.strictMessageKeys: true`。
- **括号工具文本**：某些本地模型以文本形式发出独立的括号工具请求，例如 `[tool_name]` 后跟 JSON 和 `[END_TOOL_REQUEST]`。仅当名称与该回合注册的工具完全匹配时，OpenClaw 才会将其提升为真正的工具调用。否则，它将保留为隐藏的、不受支持的文本。
- **非结构化工具调用文本**：模型可以发出 JSON、XML 或 ReAct 样式的文本，这些文本看起来像工具调用，但不是结构化调用。 OpenClaw 然后将其保留为文本并记录警告。警告包含运行 ID、提供程序和模型、检测到的模式以及可用的工具名称。这是 provider/model 不兼容，而不是完整的工具运行。
- **强制使用工具**：工具可以显示为辅助文本、原始JSON、XML或ReAct，或者显示为空`tool_calls`数组。首先检查服务器的聊天模板和解析器是否支持工具调用。如果解析器仅在强制使用工具时才工作，请覆盖每个模型的 `tool_choice: "auto"` 的默认代理值：

  ```json5
  {
    agents: {
      defaults: {
        models: {
          "local/my-local-model": {
            params: {
              extra_body: {
                tool_choice: "required",
              },
            },
          },
        },
      },
    },
  }
  ```

  仅在每个正常轮次都应该调用工具的场景下使用。将 `local/my-local-model` 替换为 `openclaw models list` 中的精确引用，或者通过 CLI 设置：

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- **额外推理工作**：如果自定义 OpenAI- 兼容模型接受内置配置文件之外的 OpenAI 推理工作，请在模型的 compat 块中声明它们。添加 `"xhigh"` 会在 `/think xhigh`、会话选择器、网关验证和 `llm-task` 验证中公开该模型引用：

  ```json5
  {
    models: {
      providers: {
        local: {
          baseUrl: "http://127.0.0.1:8000/v1",
          apiKey: "sk-local",
          api: "openai-responses",
          models: [
            {
              id: "gpt-5.4",
              name: "GPT 5.4 via local proxy",
              reasoning: true,
              input: ["text"],
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
              contextWindow: 196608,
              maxTokens: 8192,
              compat: {
                supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
                reasoningEffortMap: { xhigh: "xhigh" },
              },
            },
          ],
        },
      },
    },
  }
  ```

## <a id="smaller-or-stricter-backends"></a> 更小或更严格的后端

对于处理交互式和后台工作的一台共享 vLLM 服务器，请参阅 [ 每模型优先级调度](/providers/vllm#prioritize-interactive-requests)。它使用 vLLM 的本机调度程序，默认情况下处于禁用状态。

如果模型加载干净，但完整代理行为异常，请首先检查传输，然后检查工具使用和上下文预算。

1. **检查本地模型响应** - 没有工具，没有代理上下文：

   ```bash
   openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

2. **检查网关路由** - 仅发送提示。它会跳过脚本、AGENTS 引导程序、上下文引擎组装、工具和捆绑的 MCP 服务器。它仍然执行网关路由、身份验证和提供商选择：

   ```bash
   openclaw infer model run --gateway --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

3. **检查工具搜索**，如果两项检查都通过，但实际代理因格式错误的工具调用或过大的提示而失败。当未设置 `tools.toolSearch` 时，本地 Ollama 模型、LM Studio 和托管本地服务自动使用结构化 [Tool Search](/tools/tool-search)。其他后端可以使用 `tools.toolSearch: { mode: "tools" }` 启用它。这推迟了模式，同时保留了策略批准的功能。将 `localModelLean` 保留为未设置或将其设置为 `false`，以便可选工具仍然可用。还要检查服务器的实际上下文分配和内存使用情况。

4. **作为最后手段，完全禁用工具**：为该模型设置 `models.providers.<provider>.models[].compat.supportsTools: false`，这样 agent 就不会再进行工具调用。

5. **检查失败的请求和服务器日志。** 检查聊天模板、上下文窗口、内存压力和服务器错误。成功的纯文本检查并不能证明模型可以可靠地完成多步骤代理任务。

## <a id="troubleshooting"></a> 故障排查

- **网关无法连接到代理？** `curl http://127.0.0.1:1234/v1/models`.
- **Provider 主机名同时具有 IPv4 和 IPv6？** 受保护模型请求保留通过配置的 SSRF 策略的每个地址。当启用 Node 的地址系列自动选择时，连接首先尝试 IPv4，如果 IPv4 无法访问，则可以回退到 IPv6。单地址查找仍然优先选择IPv4；禁止 DNS 回答仍然拒绝请求。
- **LM Studio 模型已卸载？** 重新加载。冷启动是常见的“挂起”原因。
- **本地服务器说`terminated`、`ECONNRESET`，或者中途关闭流？** OpenClaw记录低基数`model.call.error.failureKind`加上OpenClaw进程 RSS/heap snapshot in diagnostics.对于 LM Studio/Ollama 内存压力，将该时间戳与服务器日志或 macOS crash/jetsam 日志进行匹配，以检查模型服务器是否被终止。
- **上下文错误？** OpenClaw 从检测到的模型窗口或每个模型的 `models.providers.<provider>.models[].contextTokens` 上限导出上下文窗口预检阈值。它警告低于 20%，下限为 **8k**。它使用 **4k** 地板硬块低于 10%。降低该模型条目的 `contextTokens` 或提高 server/model 上下文限制。
- **One-token 回复接近上下文限制？** 当输入估计将请求的输出上限降低到 16 个令牌以下（包括考虑时）时，OpenAI- 兼容代理请求进入上下文溢出恢复。特意设计的短帽在合适的情况下仍然有效。该估计是保守的：如果提示适合服务器但 OpenClaw 报告溢出，请减少提示或提高配置的上下文限制以匹配服务器的实际分配。
- **`messages[].content ... expected a string`？** 在该模型条目上添加 `compat.requiresStringContent: true`。
- **`validation.keys`，或“message entries only allow `role` and `content`”？** 在该模型条目上添加 `compat.strictMessageKeys: true`。
- **Direct `/v1/chat/completions` 调用工作，但 `openclaw infer model run --local` 在 Gemma 或其他本地模型上失败？** 首先检查提供程序 URL、模型引用、身份验证标记和服务器日志。 `model run` 完全跳过代理工具。如果 `model run` 成功但较大的代理轮次失败，请检查工具搜索和分配的上下文。仅对无法可靠调用工具的模型使用 `compat.supportsTools: false`。
- **Tool 调用显示为原始 JSON/XML/ReAct 文本，或者提供程序返回空的 `tool_calls` 数组？** 不要添加盲目地将辅助文本转换为工具执行的代理。首先修复服务器的聊天模板和解析器。如果模型仅在强制使用工具时才起作用，请添加上面的 `params.extra_body.tool_choice: "required"` 覆盖。仅在每次都需要调用工具的会话中使用该模型条目。
- **Safety**：本地模型跳过提供商端过滤器。保持药剂狭窄并压实，以限制快速注射造成的损害。

### <a id="local-model-lean-mode"></a> 本地模型精益模式

使用所示的高级设置在 **Settings → Agent Defaults → Agents** 中配置精益模式，或使用下面的配置示例。保留的 `experimental.localModelLean` 密钥仍然受支持。

精益模式是一种高级故障排除覆盖，明确限制功能。本地推理通常使用 [Tool Search](/tools/tool-search) 来推迟模式，同时保留功能，因此除非您故意想要更小的工具集，否则请关闭精益模式。

`agents.defaults.experimental.localModelLean: true`在构建目录之前删除可选工具：`browser`， `automations`， `message`， `image_generate`， `music_generate`， `video_generate`， `tts`， 和`pdf`。这些删除的工具无法通过工具搜索找到。明确允许或需要交付的工具仍然可用，但工具搜索可能会对它们进行编目而不是直接公开它们。精益模式还将目录默认为结构化工具搜索（`tool_search`， `tool_describe`， `dispatch_action`） 什么时候`tools.toolSearch`尚未设置。使用`agents.entries.*.experimental.localModelLean`将此范围限制为一名代理。

安装程序不再写入此标志。对于较旧的安装，`openclaw doctor --fix`删除入门引导拥有的`true`当其所有权标记仍与默认模型匹配时。显式设置和具有过时所有权标记的设置将被保留。将保留标志设置为`false`恢复可选功能；自动工具搜索仍然适用于本地路线。

如果你已经在全局调优了工具搜索，OpenClaw 会保持该配置不变。将 `tools.toolSearch: false` 设为关闭，可退出精简模式下的工具搜索默认行为。

精益工具搜索目录列出了工具名称和所有者，但没有说明。完整的描述和模式仍然可以通过工具搜索获得。因此，删除可选工具无法扩展剩余的目录描述。精益模式保留普通的系统指令、技能和工作空间环境。

在结构化 `tools` 模式下，精简运行会让 `exec` 仍然直接可见，并与工具搜索控制并列显示，这样面向代码调优的本地模型仍可选择它们熟悉的 shell 路径。这只会改变 schema 的可见性：正常的工具策略、沙箱和 exec 审批仍然适用。显式的 `code` 和 `directory` 模式会保持其正常的压缩行为。

#### <a id="why-these-tools"></a> 为什么使用这些工具

这些工具具有最大的描述、最广泛的参数形状，或者最有可能使小模型偏离正常的编码和对话路径。在小上下文或更严格的 OpenAI- 兼容后端上，区别在于：

- 工具 schema 能否装进提示词，而不是挤占对话历史。
- 模型是能否选对工具，还是因为过多相似的 schema 而发出格式错误的工具调用。
- Chat Completions 适配器是否能保持在结构化输出限制内，而不是在工具调用负载大小上返回 400。

该模型仍然具有 `read`、`write`、`edit`、`exec`、`apply_patch`、图像理解、Web search/fetch（配置后）、内存和 session/agent 工具。除非您设置 `tools.toolSearch: false`，否则仍可通过工具搜索访问其余目录工具；显式工具允许恢复精益模式删除的功能。

#### <a id="when-to-turn-it-on"></a> 何时开启

一旦你已经证明模型可以与 Gateway 通信，但完整的代理轮次表现异常，就启用精简模式：

1. `openclaw infer model run --gateway --model <ref> --prompt "Reply with exactly: pong"` 成功。
2. 正常的代理轮次因格式错误的工具调用、提示词过大，或模型忽略其工具而失败。
3. 切换为 `localModelLean: true` 后故障消失。

#### <a id="when-to-leave-it-off"></a> 何时将其关闭

保留精益模式未设置或设置 `agents.defaults.experimental.localModelLean: false` 以保留完整的策略批准的工具集。设置保留明确的选择，并且永远不会自动启用精益模式。

精简模式不能替代 `tools.profile`、`tools.allow`/`tools.deny`，也不能替代模型的 `compat.supportsTools: false` 逃生开关。若要为某个特定代理永久使用更窄的工具面板，优先使用这些稳定的配置项。

#### <a id="enable"></a> 启用

```json5
{
  agents: {
    defaults: {
      experimental: {
        localModelLean: true,
      },
    },
  },
}
```

仅针对一个代理：

```json5
{
  agents: {
    entries: {
      local: {
        model: "lmstudio/gemma-4-e4b-it",
        experimental: {
          localModelLean: true,
        },
      },
    },
  },
}
```

更改配置文件中的标志后重新启动网关。精益过滤会删除 `browser`、`automations`、`message`、`image_generate`、`music_generate`、`video_generate`、`tts` 和 `pdf`，除非您明确保留它们`tools.allow` 或 `tools.alsoAllow`；工具搜索可能仍会对保留的工具进行编目，而不是直接公开它们。

## <a id="related"></a> 相关内容

- [配置参考](/gateway/configuration-reference)
- [模型故障转移](/concepts/model-failover)
- [CLI 后端](/gateway/cli-backends) — 驱动本地 CLI 代理而不是 API 模型
