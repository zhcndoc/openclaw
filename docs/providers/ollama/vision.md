---
summary: "通过本地或托管的 Ollama 视觉模型路由图像理解"
read_when:
  - "您希望通过 Ollama 视觉模型进行图像描述"
  - "您正在为 Ollama 配置图像模型默认值"
title: "Ollama视觉及图像描述"
sidebarTitle: "视觉"
---

## <a id="vision-and-image-description"></a> 视觉与图像描述

捆绑的 Ollama 插件将 Ollama 注册为具备图像能力的媒体理解提供方，因此 OpenClaw 可以将显式的图像描述请求以及已配置的图像模型默认值，通过本地或托管的 Ollama 视觉模型进行路由。

```bash
ollama pull qwen2.5vl:7b
export OLLAMA_API_KEY="ollama-local"
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --json
```

`--model` 必须是完整的 `<provider/model>` 参考；设置后，`infer image describe` 首先尝试该模型，而不是跳过已经支持原生视觉的模型的描述。如果呼叫失败，OpenClaw可以通过`agents.defaults.imageModel.fallbacks`继续； file/URL 准备错误在尝试回退之前失败。使用`infer image describe`进行OpenClaw的图像理解流程并配置`imageModel`；使用 `infer model run --file` 进行带有自定义提示的原始多模式检查。

要让 Ollama 成为入站媒体的默认图像理解提供方：

```json5
{
  agents: {
    defaults: {
      imageModel: {
        primary: "ollama/qwen2.5vl:7b",
      },
    },
  },
}
```

更喜欢完整的 `ollama/<model>` 参考号。仅当该确切模型在 `models.providers.ollama.models` 和 `input: ["text", "image"]` 下列出并且没有其他配置的图像提供程序公开相同的裸 ID 时，裸 `imageModel` 引用（例如 `qwen2.5vl:7b`）才会标准化为 `ollama/qwen2.5vl:7b`；否则显式使用提供者前缀。

较慢的本地视觉模型可能需要比云模型更长的图像理解超时时间， 并且如果 Ollama 尝试分配模型完整标称的视觉上下文，在受限硬件上可能会崩溃。请设置能力超时并限制 `num_ctx`：

```json5
{
  models: {
    providers: {
      ollama: {
        models: [
          {
            id: "qwen2.5vl:7b",
            name: "qwen2.5vl:7b",
            input: ["text", "image"],
            params: { num_ctx: 2048, keep_alive: "1m" },
          },
        ],
      },
    },
  },
  tools: {
    media: {
      models: [
        {
          provider: "ollama",
          model: "qwen2.5vl:7b",
          timeoutSeconds: 300,
          capabilities: ["image"],
        },
      ],
      image: {
        timeoutSeconds: 180,
      },
    },
  },
}
```

此超时适用于入站图像理解和显式 `view_image` 工具。 `models.providers.ollama.timeoutSeconds` 仍然控制底层 Ollama HTTP 请求防护以进行正常模型调用。

实时验证：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

如果你手动定义 `models.providers.ollama.models`，请显式标记视觉模型：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw 会拒绝对未标记为具备图像能力的模型发起图像描述请求。 在隐式发现的情况下，这一能力来自 `/api/show` 的视觉能力。
