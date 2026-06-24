---
summary: "安装用于本地 GGUF 内存嵌入的官方 llama.cpp provider"
read_when:
  - 你需要来自本地 GGUF 模型的内存搜索嵌入
  - 你正在配置 memorySearch.provider = "local"
  - 你需要拥有 node-llama-cpp 运行时的 OpenClaw 插件
title: "llama.cpp Provider"
sidebarTitle: "llama.cpp Provider"
---

`llama-cpp` 是用于本地 GGUF 嵌入的官方外部 provider 插件。
它拥有 `memorySearch.provider: "local"` 所使用的 `node-llama-cpp` 运行时依赖。

在使用本地内存嵌入之前先安装它：

```bash
openclaw plugins install @openclaw/llama-cpp-provider
```

主 `openclaw` npm 包不包含 `node-llama-cpp`。将这个原生依赖保留在此插件中，可以防止正常的 OpenClaw npm 更新删除 OpenClaw 包目录中手动安装的运行时。

## 配置

将内存搜索 provider 设置为 `local`：

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

默认模型是 `embeddinggemma-300m-qat-Q8_0.gguf`。你也可以将 `local.modelPath` 指向本地 `.gguf` 文件。

## 原生运行时

使用 Node 24 可获得最顺畅的原生安装路径。使用 pnpm 的源码检出可能需要批准并重建原生依赖：

```bash
pnpm approve-builds
pnpm rebuild node-llama-cpp
```

如果想要更低摩擦的本地嵌入，可以改用本地服务提供方，例如 Ollama 或 LM Studio。
