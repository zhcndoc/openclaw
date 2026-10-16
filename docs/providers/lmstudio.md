---
summary: "使用 LM Studio 运行 OpenClaw"
read_when:
  - "您想通过 LM Studio 运行带有开源模型的 OpenClaw"
  - "你想设置并配置 LM Studio"
title: "LM Studio"
---

LM Studio 在本地运行 llama.cpp （GGUF） 或 MLX 模型，作为 GUI 应用程序或无头 `llmster` 守护程序。有关安装和产品文档，请参阅 [lmstudio.ai](https://lmstudio.ai/).

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="install-and-start-the-server" title="安装并启动服务器">
    安装 LM Studio（桌面版）或 `llmster`（无头模式），然后启动服务器：

    ```bash
    lms server start --port 1234
    ```

    或运行无头守护进程：

    ```bash
    lms daemon up
    ```

    如果使用桌面应用程序，请启用 JIT 以实现平滑的模型加载；请参阅 [LM Studio JIT 和 TTL 指南](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict)。

  </Step>
  <Step id="set-an-api-key-if-auth-is-enabled" title="如果启用了身份验证，则设置 API 密钥">
    ```bash
    export LM_API_TOKEN="your-lm-studio-api-token"
    ```

    如果禁用 LM Studio 身份验证，请在设置过程中将 API 密钥留空。请参阅 [LM Studio Authentication](https://lmstudio.ai/docs/developer/core/authentication)。

  </Step>
  <Step id="run-onboarding" title="运行入门引导培训">
    ```bash
    openclaw onboard
    ```

    选择 `LM Studio`，然后在 `Default model` 提示处选择一个模型。

    服务器 URL 提示符还接受主机简写，例如 `localhost:1234`。无效的 URL 会保留在提示中，以便您可以在模型发现之前更正它们。

    在全新的引导式设置中，OpenClaw 首先在默认或配置的 LM Studio 主机上查询 `/api/v1/models`。仅当 LM Studio 报告工具培训和至少 16K 有效上下文时，才会自动提供现有的 LLM。对于加载的模型，加载的实例上下文优先于较大的通告最大值。相同的 CLI/macOS 设置梯形图在保存之前验证路线是否真实完成。自动检查从不下载模型并忽略仅嵌入的目录条目。

  </Step>
</Steps>

稍后更改默认模型：

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

LM Studio 模型密钥使用 `author/model-name` 格式 （e.g. `qwen/qwen3.5-9b`）； OpenClaw 模型参考前缀为提供商：`lmstudio/qwen/qwen3.5-9b`。通过运行以下命令并查看 `key` 字段来查找模型的确切密钥：

```bash
curl http://localhost:1234/api/v1/models
```

在LM Studio中安装另一个模型后，刷新OpenClaw的模型列表：

```bash
openclaw models list --provider lmstudio --refresh
```

在默认合并模式下，刷新会添加发现的模型，同时保留配置的行及其创作的元数据，包括名称和上下文限制。配置为空的 `models` 阵列还支持在未经身份验证的服务器上进行发现。 `models.mode: "replace"` 仅保留显式配置的模型。

## <a id="non-interactive-onboarding"></a> 非交互式入门引导

```bash
openclaw onboard --non-interactive --accept-risk --skip-health --auth-choice lmstudio
```

或者显式指定基础 URL、模型和 API key：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --skip-health \
  --auth-choice lmstudio \
  --custom-base-url http://localhost:1234/v1 \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --custom-model-id qwen/qwen3.5-9b
```

`--custom-model-id` 采用 LM Studio （e.g. `qwen/qwen3.5-9b`） 返回的模型密钥，不带 `lmstudio/` 提供商前缀。通过`--lmstudio-api-key`（或设置`LM_API_TOKEN`）来验证服务器；对于未经身份验证的服务器省略它，并且 OpenClaw 存储本地非秘密标记。为了兼容性，`--custom-api-key` 仍被接受，但 `--lmstudio-api-key` 是首选。

这会写入 `models.providers.lmstudio`，并将默认模型设置为 `lmstudio/<custom-model-id>`。 如果提供了 API key，还会写入 `lmstudio:default` 认证配置文件。

添加 `--json` 以获得机器可读的结果。连接、HTTP 和模型选择失败会返回 JSON 错误，并具有与人工输出相同的恢复指导，并退出非零值，而不应用建议的提供程序配置。

交互式设置还可以额外提示输入首选的加载上下文长度，并将其应用于它保存到配置中的已发现模型。

## <a id="configuration"></a> 配置

### <a id="streaming-usage-compatibility"></a> 流式使用量兼容性

LM Studio 并不总是在流响应上发出 OpenAI- 形状的 `usage` 对象。 OpenClaw 从 llama.cpp-style `timings.prompt_n` / `timings.predicted_n` 元数据恢复令牌计数。任何解析为本地端点（环回主机）的 OpenAI- 兼容端点都会获得相同的回退，其中涵盖其他本地后端，例如 vLLM、SGLang、llama.cpp、LocalAI、Jan、TabbyAPI 和 text- Generation-webui。

### <a id="gemma-4-tool-call-recovery"></a> Gemma 4工具调用恢复

对于使用 `openai-completions` 的 Gemma 4 模型，如果服务器将其作为文本返回，OpenClaw 会恢复完整的独立 `<|tool_call>call:...<tool_call|>` 批次，包括当调用是 `finish_reason: "stop"` 之前的最后一个内容时。恢复保留原始字符串参数并需要完整的参数对象；不完整的调用、散文和代码示例仍然是文本。截断、过滤、取消或未终止的流不会授权恢复的呼叫。如果本机工具调用也出现在流中，则它们仍然具有权威性，并且不会提升原始文本。

### <a id="thinking-compatibility"></a> 思考兼容性

当 LM Studio 的 `/api/v1/models` 发现结果报告了模型特定的推理选项时，OpenClaw 会在模型兼容性元数据中暴露对应的 `reasoning_effort` 值（`none`、`minimal`、`low`、`medium`、`high`、`xhigh`）。 某些 LM Studio 构建版会声明一个二元 UI 选项（`allowed_options: ["off", "on"]`），但在 `/v1/chat/completions` 上会拒绝这些字面值；OpenClaw 会在发送请求前将这种二元形态规范化为六级尺度，包括那些仍然保留 `off`/`on` 推理映射的旧版已保存配置。

对于分级选项，新的发现将 `max`（以及 Ultra 的提供商工作量）映射到最高广告标准工作量级别，无论选项顺序如何。例如，`off`、`low`、`medium` 将 `max` 映射到 `medium`。现有保存的分级 `reasoningEffortMap` 值保持显式配置；重新运行 LM Studio 安装程序以从当前服务器元数据重新生成它们。

### <a id="explicit-configuration"></a> 显式配置

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        models: [
          {
            id: "qwen/qwen3-coder-next",
            name: "Qwen 3 Coder Next",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### <a id="model-instances-and-context"></a> Model 实例和上下文

启用预加载后，OpenClaw 将聊天请求路由到具有足够上下文的已加载实例，以满足所选模型预算。新加载的实例由 LM Studio 返回的标识符进行寻址。您配置的模型引用和对话模型标识保留配置的模型密钥。

模型加载使用配置的提供程序 `timeoutSeconds`（或请求超时覆盖），并具有两分钟的默认匹配嵌入加载。对于慢速冷负载，增加 `models.providers.lmstudio.timeoutSeconds`。如果加载失败，而每个已知加载的实例都太小，OpenClaw 会报告模型和请求的上下文，而不是向较小的实例发送提示。等待 LM Studio 加载完成并重试，或降低模型的 `contextTokens`。

启用预加载后，嵌入请求还会检查其模型是否已加载并路由到为配置的上下文长度准备的实例。这可以避免通过较小的加载实例截断输入，并让内存嵌入在模型驱逐后恢复，即使 LM Studio JIT 加载被禁用。嵌入模型和缓存标识保留配置的模型密钥。

### <a id="disabling-preload"></a> 禁用预加载

LM Studio 支持即时（JIT）模型加载，即在首次请求时加载模型。默认情况下，OpenClaw 会通过 LM Studio 的原生加载端点预加载模型，这在 JIT 被禁用时很有帮助。若要让 LM Studio 的 JIT、空闲 TTL 和自动逐出行为自行管理模型生命周期， 请禁用 OpenClaw 的预加载步骤：

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        api: "openai-completions",
        params: { preload: false },
        models: [{ id: "qwen/qwen3.5-9b" }],
      },
    },
  },
}
```

### <a id="lan-or-tailnet-host"></a> LAN 或尾网主机

使用 LM Studio 主机可访问的地址，保留 `/v1`，并确保该机器上的 LM Studio 绑定到了回环地址之外：

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://gpu-box.local:1234/v1",
        apiKey: "lmstudio",
        api: "openai-completions",
        models: [{ id: "qwen/qwen3.5-9b" }],
      },
    },
  },
}
```

`lmstudio` 自动信任其配置的模型请求端点，包括环回、LAN 和尾网主机（元数据、链接本地和本地使用 NAT64 `64:ff9b:1::/48` 源除外）。任何 custom/local OpenAI- 兼容的提供商条目都会获得相同的确切来源信任。对不同私有主机或端口的请求仍然需要 `models.providers.<id>.request.allowPrivateNetwork: true`；将其设置为 `false` 以选择退出默认信任。

## <a id="troubleshooting"></a> 故障排查

### <a id="context-overflow"></a> 上下文溢出

当 LM Studio 因为超出加载的上下文而拒绝提示时，OpenClaw 会尝试 [ 压缩并重试 ](/concepts/compaction)，包括报告 `Trying to keep the first N tokens` 和 `the model is loaded with context length of only M tokens, which is not enough` 的旧服务器。如果单个消息太大，请缩短它或加载具有更大上下文的模型；压缩早期历史并不能缩小这一信息。没有溢出错误的服务器端截断不会触发此恢复。

### <a id="model-discovery-failures"></a> 模型发现失败

当配置的服务器无法列出模型时，OpenClaw 报告不可用的目录或目录身份验证拒绝。当连接和凭据仍然匹配时，刷新可以保留上次成功的清单。成功的空响应会清除已发现的模型；显式配置的模型仍然可用，无需被发现。恢复服务器连接或更正其凭据，然后刷新模型列表。

### <a id="lm-studio-not-detected"></a> 未检测到 LM Studio

请确保 LM Studio 正在运行：

```bash
lms server start --port 1234
```

如果启用了身份验证，还需要设置 `LM_API_TOKEN`。验证 API 是否可访问：

```bash
curl http://localhost:1234/api/v1/models
```

### <a id="authentication-errors-(http-401)"></a><a id="authentication-errors-http-401"></a> 身份验证错误（HTTP 401）

- 检查 `LM_API_TOKEN` 是否与 LM Studio 中配置的密钥一致。
- 参见 [LM Studio Authentication](https://lmstudio.ai/docs/developer/core/authentication)。
- 如果服务器不需要身份验证，请在设置过程中将密钥留空。

## <a id="related"></a> 相关内容

- [模型选择](/concepts/model-providers)
- [Ollama](/providers/ollama)
- [本地模型](/gateway/local-models)
