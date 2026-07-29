---
summary: "使用 LM Studio 运行 OpenClaw"
read_when:
  - 你想通过 LM Studio 使用开源模型运行 OpenClaw
  - 你想设置并配置 LM Studio
title: "LM Studio"
---

LM Studio 在本地运行 llama.cpp（GGUF）或 MLX 模型，可作为 GUI 应用或无头 `llmster`
守护进程运行。有关安装和产品文档，请参见 [lmstudio.ai](https://lmstudio.ai/)。

## 快速开始

<Steps>
  <Step title="安装并启动服务器">
    安装 LM Studio（桌面版）或 `llmster`（无头模式），然后启动服务器：

    ```bash
    lms server start --port 1234
    ```

    或运行无头守护进程：

    ```bash
    lms daemon up
    ```

    如果使用桌面应用程序，请启用 JIT 以实现平滑的模型加载；请参阅
    [LM Studio JIT and TTL guide](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict)。

  </Step>
  <Step title="如果启用了身份验证，请设置 API 密钥">
    ```bash
    export LM_API_TOKEN="your-lm-studio-api-token"
    ```

    如果已禁用 LM Studio 身份验证，则在设置过程中将 API 密钥留空。请参阅
    [LM Studio Authentication](https://lmstudio.ai/docs/developer/core/authentication)。

  </Step>
  <Step title="运行引导">
    ```bash
    openclaw onboard
    ```

    选择 `LM Studio`，然后在 `Default model` 提示处选择一个模型。

    On a fresh guided setup, OpenClaw first queries `/api/v1/models` on the
    default or configured LM Studio host. An existing LLM is offered automatically
    only when LM Studio reports tool training and at least 16K of effective
    context. For loaded models, the loaded instance context takes precedence over
    the larger advertised maximum. The same CLI/macOS setup ladder verifies the
    route with a real completion before saving it. The automatic check never
    downloads a model and ignores embedding-only catalog entries.

  </Step>
</Steps>

稍后更改默认模型：

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

LM Studio 的模型键使用 `author/model-name` 格式（例如 `qwen/qwen3.5-9b`）；OpenClaw 的模型引用会
在前面加上提供方：`lmstudio/qwen/qwen3.5-9b`。要查找某个模型的准确键，请运行下面的
命令并查看 `key` 字段：

```bash
curl http://localhost:1234/api/v1/models
```

## 非交互式 onboarding

```bash
openclaw onboard --non-interactive --accept-risk --auth-choice lmstudio
```

或者显式指定基础 URL、模型和 API key：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio \
  --custom-base-url http://localhost:1234/v1 \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --custom-model-id qwen/qwen3.5-9b
```

`--custom-model-id` 使用 LM Studio 返回的模型键（例如 `qwen/qwen3.5-9b`），不包含
`lmstudio/` 提供方前缀。对需要认证的服务器传入 `--lmstudio-api-key`（或设置 `LM_API_TOKEN`）；
对于未认证的服务器则省略它，OpenClaw 会改为存储一个本地的非机密标记。
`--custom-api-key` 仍然可为兼容性而接受，但优先使用 `--lmstudio-api-key`。

这会写入 `models.providers.lmstudio`，并将默认模型设置为 `lmstudio/<custom-model-id>`。
如果提供了 API key，还会写入 `lmstudio:default` 认证配置文件。

交互式设置还可以额外提示输入首选的加载上下文长度，并将其应用于
它保存到配置中的已发现模型。

## 配置

### 流式使用量兼容性

LM Studio 并不总是在流式响应中发出 OpenAI 风格的 `usage` 对象。OpenClaw
会改为从 llama.cpp 风格的 `timings.prompt_n` / `timings.predicted_n` 元数据中
恢复 token 计数。任何被解析为本地端点（回环主机）的 OpenAI 兼容端点都会获得同样的
回退逻辑，这也涵盖了其他本地后端，例如 vLLM、SGLang、llama.cpp、LocalAI、Jan、TabbyAPI，
以及 text-generation-webui。

### 思考兼容性

当 LM Studio 的 `/api/v1/models` 发现结果报告了模型特定的推理选项时，OpenClaw
会在模型兼容性元数据中暴露对应的 `reasoning_effort` 值（`none`、`minimal`、`low`、`medium`、`high`、`xhigh`）。
某些 LM Studio 构建版会声明一个二元 UI 选项（`allowed_options: ["off",
"on"]`），但在 `/v1/chat/completions` 上会拒绝这些字面值；OpenClaw 会在发送请求前
将这种二元形态规范化为六级尺度，包括那些仍然保留 `off`/`on` 推理映射的旧版已保存配置。

### 显式配置

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

### 禁用预加载

LM Studio 支持即时（JIT）模型加载，即在首次请求时加载模型。默认情况下，OpenClaw
会通过 LM Studio 的原生加载端点预加载模型，这在 JIT 被禁用时很有帮助。若要让 LM Studio 的 JIT、空闲 TTL 和自动逐出行为自行管理模型生命周期，
请禁用 OpenClaw 的预加载步骤：

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

### 局域网或 tailnet 主机

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

`lmstudio` 会自动信任其配置的模型请求端点，包括回环、局域网和 tailnet 主机（元数据/链路本地来源除外）。任何自定义/本地的 OpenAI 兼容
提供方条目都会获得同样的同源信任。对不同私有主机或端口的请求仍然需要
`models.providers.<id>.request.allowPrivateNetwork: true`；将其设置为 `false` 可退出默认信任。

## 故障排查

### 未检测到 LM Studio

请确保 LM Studio 正在运行：

```bash
lms server start --port 1234
```

如果启用了身份验证，还需要设置 `LM_API_TOKEN`。验证 API 是否可访问：

```bash
curl http://localhost:1234/api/v1/models
```

### 身份验证错误（HTTP 401）

- 检查 `LM_API_TOKEN` 是否与 LM Studio 中配置的密钥一致。
- 参见 [LM Studio Authentication](https://lmstudio.ai/docs/developer/core/authentication)。
- 如果服务器不需要身份验证，请在设置过程中将密钥留空。

## 相关内容

- [模型选择](/concepts/model-providers)
- [Ollama](/providers/ollama)
- [本地模型](/gateway/local-models)
