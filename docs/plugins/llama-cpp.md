---
summary: "在 OpenClaw 中使用 llama.cpp 运行本地 GGUF 文本推理和内存嵌入"
read_when:
  - 你希望无需 API 密钥或模型服务器即可进行本地文本推理
  - 你希望使用本地 GGUF 模型生成内存搜索嵌入
  - 你正在配置 memory.search.provider = "local"
  - 你需要负责管理 node-llama-cpp 运行时的 OpenClaw 插件
title: "llama.cpp 提供商"
sidebarTitle: "llama.cpp 提供商"
---

`llama-cpp` 是官方的外部提供商插件，用于进程内本地 GGUF
文本推理和嵌入。它注册文本提供商 `llama-cpp`、
嵌入提供商 `local`，并负责管理 `node-llama-cpp` 原生运行时。

在使用本地推理或本地内存嵌入之前，请先安装它：

```bash
openclaw plugins install @openclaw/llama-cpp-provider
```

主 `openclaw` npm 包不包含 `node-llama-cpp`。将这个原生依赖保留在此插件中，可以防止正常的 OpenClaw npm 更新删除 OpenClaw 包目录中手动安装的运行时。

## 本地文本推理

在交互式引导过程中选择 **llama.cpp**。OpenClaw 会安装官方提供商插件，然后在下载默认模型前征得确认：

`hf:unsloth/gemma-4-E4B-it-GGUF/gemma-4-E4B-it-Q4_K_M.gguf`

Gemma 4 E4B IT Q4_K_M 文件约为 5.0 GB。OpenClaw 仅会在内存至少为 16 GiB 的计算机上提供此默认模型，为模型权重、上下文和 Gateway 开销预留空间。默认上下文会自动设置，最大为 8,192 个 token。只有在计算机内存充足时，才配置更大的上下文。

引导发现检查为只读操作。仅当默认或已配置的 GGUF 文件已经位于模型缓存中时，它才会自动提供 llama.cpp；发现过程中绝不会下载模型。Ollama 和 LM Studio 仍是独立的本地服务选项，并保留各自的发现流程。手动选择 llama.cpp 会安装运行时、提示下载默认模型，并在将设置标记为完成前验证真实的模型回复。

该提供商使用 GGUF 模型内嵌的聊天模板和原生的 node-llama-cpp 函数调用功能。文本会逐个 token 流式传输。工具调用会返回给 OpenClaw 执行，而不是在 node-llama-cpp 内部运行。

### 使用其他 GGUF 模型

将模型添加到 `models.providers.llama-cpp`。在 `params.modelPath` 中填入本地路径或完整的 `hf:` 文件 URI：

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

推理绝不会隐式下载缺失的模型。对于自定义的 `hf:` URI，请先将 GGUF 下载到 `modelCacheDir` 中。发现功能使用 node-llama-cpp 自身的只读缓存解析器，包括仓库、分支和分片文件命名。

## 内存嵌入配置

将 `memory.search.provider` 设置为 `local`：

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

`local.modelPath` 默认使用上方所示的 `hf:` URI（`embeddinggemma-300m-qat-Q8_0.gguf`）。
将其指向不同的 `hf:` URI 或本地 `.gguf` 文件，即可使用其他模型。缓存位置和嵌入上下文大小由
llama.cpp 提供程序管理；`memory.search.local` 仅公开 `modelPath`。

## 原生运行时

使用 Node 24 可获得最顺畅的原生安装路径。使用
pnpm 的源码检出可能需要批准并重新构建原生依赖：

```bash
pnpm approve-builds
pnpm rebuild node-llama-cpp
```

## 内存运行时诊断

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
2. 在本地安装／更新时使用 Node 24。
3. 如果是从 pnpm 源码检出：先运行 `pnpm approve-builds`，然后运行 `pnpm rebuild node-llama-cpp`。

如需在没有进程内原生依赖的情况下进行本地推理，请改用 Ollama 或
LM Studio 提供商。如需更便捷地使用本地嵌入，请将
`memory.search.provider` 设置为远程嵌入提供商，例如 `lmstudio`、
`ollama`、`openai` 或 `voyage`。
