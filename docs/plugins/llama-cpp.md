---
summary: "安装用于本地 GGUF 内存嵌入的官方 llama.cpp provider"
read_when:
  - 你需要来自本地 GGUF 模型的内存搜索嵌入
  - 你正在配置 memorySearch.provider = "local"
  - 你需要拥有 node-llama-cpp 运行时的 OpenClaw 插件
title: "llama.cpp Provider"
sidebarTitle: "llama.cpp Provider"
---

`llama-cpp` 是用于本地 GGUF
嵌入的官方外部 provider 插件。它注册嵌入 provider id `local`，并提供由 `memorySearch.provider: "local"` 使用的 `node-llama-cpp` 运行时依赖。

在使用本地内存嵌入之前先安装它：

```bash
openclaw plugins install @openclaw/llama-cpp-provider
```

主 `openclaw` npm 包不包含 `node-llama-cpp`。将这个原生依赖保留在此插件中，可以防止正常的 OpenClaw npm 更新删除 OpenClaw 包目录中手动安装的运行时。

## 配置

将 `memorySearch.provider` 设置为 `local`：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "local",
        local: {
          modelPath: "hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf",
        },
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

## 原生运行时

使用 Node 24 可获得最顺畅的原生安装路径。使用
pnpm 的源码检出可能需要批准并重新构建原生依赖：

```bash
pnpm approve-builds
pnpm rebuild node-llama-cpp
```

## 故障排除

如果 `node-llama-cpp` 缺失或加载失败，OpenClaw 会报告该失败信息，方式如下：

1. 安装插件：`openclaw plugins install @openclaw/llama-cpp-provider`。
2. 本地安装/更新时使用 Node 24。
3. 如果是从 pnpm 源码检出：先运行 `pnpm approve-builds`，然后运行 `pnpm rebuild node-llama-cpp`。

如果想在不进行本地构建步骤的情况下获得更低门槛的本地嵌入，请将 `memorySearch.provider` 设置为远程嵌入提供方，例如 `lmstudio`、`ollama`、`openai` 或 `voyage`。
