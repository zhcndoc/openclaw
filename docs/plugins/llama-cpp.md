---
summary: "Run local GGUF text inference and memory embeddings in OpenClaw with llama.cpp"
read_when:
  - You want local text inference without an API key or model server
  - You want memory search embeddings from a local GGUF model
  - You are configuring memory.search.provider = "local"
  - You need the OpenClaw plugin that owns the node-llama-cpp runtime
title: "llama.cpp Provider"
sidebarTitle: "llama.cpp Provider"
---

`llama-cpp` is the official external provider plugin for in-process local GGUF
text inference and embeddings. It registers text provider `llama-cpp`,
embedding provider `local`, and owns the `node-llama-cpp` native runtime.

Install it before using either local inference or local memory embeddings:

```bash
openclaw plugins install @openclaw/llama-cpp-provider
```

主 `openclaw` npm 包不包含 `node-llama-cpp`。将这个原生依赖保留在此插件中，可以防止正常的 OpenClaw npm 更新删除 OpenClaw 包目录中手动安装的运行时。

## Local text inference

Choose **Local model (llama.cpp)** during interactive onboarding. OpenClaw asks
before downloading the default model:

`hf:bartowski/Qwen_Qwen3-4B-Instruct-2507-GGUF/Qwen_Qwen3-4B-Instruct-2507-Q4_K_M.gguf`

The Qwen3 4B Instruct 2507 Q4_K_M file is about 2.5 GB. Budget roughly 3 GB of
RAM for model weights, plus context and OpenClaw runtime overhead. The default
context is automatically sized with an 8,192-token cap so it remains practical
on 8 GB machines. Configure a larger context only when the machine has enough
memory.

The onboarding discovery check is read-only. It offers llama.cpp automatically
only when the default or configured GGUF file is already in the model cache; it
never downloads during discovery. Ollama and LM Studio remain separate local
service choices and keep their own discovery flows. Manually choosing llama.cpp
is the path that prompts for the default model download.

The provider uses the GGUF model's embedded chat template and native
node-llama-cpp function calling. Text streams token by token. Tool calls return
to OpenClaw for execution rather than running inside node-llama-cpp.

### Use another GGUF model

Add a model to `models.providers.llama-cpp`. Put a local path or full `hf:` file
URI in `params.modelPath`:

```json5
{
  models: {
    mode: "merge",
    providers: {
      "llama-cpp": {
        baseUrl: "local://llama-cpp",
        api: "openai-completions",
        params: {
          modelCacheDir: "~/.node-llama-cpp/models",
        },
        models: [
          {
            id: "my-local-model",
            name: "My local GGUF",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 8192,
            maxTokens: 2048,
            params: {
              modelPath: "~/Models/my-model.Q4_K_M.gguf",
              contextSize: 8192,
            },
            compat: { supportsTools: true },
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "llama-cpp/my-local-model" },
    },
  },
}
```

Inference never downloads a missing model implicitly. For a custom `hf:` URI,
download the GGUF into `modelCacheDir` first. Discovery uses node-llama-cpp's
own read-only cache resolver, including repository, branch, and split-file naming.

## Memory embedding configuration

Set `memory.search.provider` to `local`:

```json5
{
  memory: {
    search: {
      provider: "local",
      local: {
        modelPath: "hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf",
      },
    },
  },
}
```

`local.modelPath` 默认使用上面显示的 `hf:` URI（`embeddinggemma-300m-qat-Q8_0.gguf`）。
将其指向另一个 `hf:` URI 或本地 `.gguf` 文件，即可使用其他
模型。`local.modelCacheDir` 用于覆盖已下载模型的缓存位置
（默认值：`~/.node-llama-cpp/models`），`local.contextSize` 接受一个
整数或 `"auto"`。

当 `local.contextSize` 为数值时，提供程序也会将该需求传递给
node-llama-cpp 的自动 GPU 层放置。这样 node-llama-cpp 就可以在
保留其内存安全检查的同时，将模型和嵌入上下文一起装入内存。
而使用 `"auto"` 时，node-llama-cpp 会保持其正常的自动放置行为。

## Native runtime

使用 Node 24 可获得最顺畅的原生安装路径。使用
pnpm 的源码检出可能需要批准并重新构建原生依赖：

```bash
pnpm approve-builds
pnpm rebuild node-llama-cpp
```

## Memory runtime diagnostics

在提供程序加载完成后，运行 `openclaw memory status --deep`，以检查
所选后端和构建、设备名称、GPU 卸载层数、请求的
上下文大小，以及最近一次观察到的 VRAM 或统一内存快照。VRAM
值包含一个观测时间戳，因为被动状态读取不会
重新加载模型或轮询设备。

当运行中的 Gateway 已经使用过本地提供程序时，相同的最新已知信息也可能出现在 `openclaw doctor` 中。普通的 status 或 doctor 命令
不会为了收集诊断信息而加载模型。

## 故障排查

如果 `node-llama-cpp` 缺失或加载失败，OpenClaw 会按如下方式报告该失败信息：

1. 安装插件：`openclaw plugins install @openclaw/llama-cpp-provider`。
2. 在本地安装/更新时使用 Node 24。
3. 如果是从 pnpm 源码检出：先运行 `pnpm approve-builds`，然后运行 `pnpm rebuild node-llama-cpp`。

For local inference without an in-process native dependency, use the Ollama or
LM Studio provider instead. For lower-friction local embeddings, set
`memory.search.provider` to a remote embedding provider such as `lmstudio`,
`ollama`, `openai`, or `voyage` instead.
