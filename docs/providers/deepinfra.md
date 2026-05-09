---
summary: "使用 DeepInfra 的统一 API，在 OpenClaw 中访问最受欢迎的开源和前沿模型"
read_when:
  - 你想要为最顶级的开源 LLM 使用一个统一的 API 密钥
  - 你想在 OpenClaw 中通过 DeepInfra 的 API 运行模型
title: "DeepInfra"
---

DeepInfra 提供了一个**统一 API**，通过单一的
端点和 API 密钥将请求路由到最受欢迎的开源和前沿模型。它与 OpenAI 兼容，因此只需切换 base URL，大多数 OpenAI SDK 都可以直接使用。

## 获取 API 密钥

1. 前往 [https://deepinfra.com/](https://deepinfra.com/)
2. 登录或创建账户
3. 进入 Dashboard / Keys 并生成一个新的 API 密钥，或使用自动创建的密钥

## CLI 设置

```bash
openclaw onboard --deepinfra-api-key <key>
```

或者设置环境变量：

```bash
export DEEPINFRA_API_KEY="<your-deepinfra-api-key>" # pragma: allowlist secret
```

## 配置片段

```json5
{
  env: { DEEPINFRA_API_KEY: "<your-deepinfra-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "deepinfra/deepseek-ai/DeepSeek-V3.2" },
    },
  },
}
```

## 支持的 OpenClaw 接入面

随附的插件会注册所有符合当前
OpenClaw 提供方契约的 DeepInfra 接入面：

| 接入面                   | 默认模型                            | OpenClaw 配置/工具                                   |
| ------------------------ | ---------------------------------- | -------------------------------------------------------- |
| 聊天 / 模型提供方        | `deepseek-ai/DeepSeek-V3.2`        | `agents.defaults.model`                                  |
| 图像生成/编辑            | `black-forest-labs/FLUX-1-schnell` | `image_generate`, `agents.defaults.imageGenerationModel` |
| 媒体理解                 | `moonshotai/Kimi-K2.5` 用于图像     | inbound image understanding                              |
| 语音转文本               | `openai/whisper-large-v3-turbo`     | inbound audio transcription                              |
| 文本转语音               | `hexgrad/Kokoro-82M`               | `messages.tts.provider: "deepinfra"`                     |
| 视频生成                 | `Pixverse/Pixverse-T2V`            | `video_generate`, `agents.defaults.videoGenerationModel` |
| 记忆嵌入                 | `BAAI/bge-m3`                      | `agents.defaults.memorySearch.provider: "deepinfra"`     |

DeepInfra 还提供重排序、分类、目标检测以及其他
原生模型类型。OpenClaw 目前还没有针对这些类别的一级提供方契约，
因此这个插件暂时不会注册它们。

## 可用模型

OpenClaw 会在启动时动态发现可用的 DeepInfra 模型。使用
`/models deepinfra` 查看可用模型的完整列表。

DeepInfra.com 上可用的任何模型都可以使用 `deepinfra/` 前缀：

```
deepinfra/MiniMaxAI/MiniMax-M2.5
deepinfra/deepseek-ai/DeepSeek-V3.2
deepinfra/moonshotai/Kimi-K2.5
deepinfra/zai-org/GLM-5.1
...还有更多
```

## 说明

- 模型引用格式为 `deepinfra/<provider>/<model>`（例如，`deepinfra/Qwen/Qwen3-Max`）。
- 默认模型：`deepinfra/deepseek-ai/DeepSeek-V3.2`
- Base URL: `https://api.deepinfra.com/v1/openai`
- Native video generation uses `https://api.deepinfra.com/v1/inference/<model>`.

## 相关链接

- [模型提供方](/concepts/model-providers)
- [所有提供方](/providers/index)
