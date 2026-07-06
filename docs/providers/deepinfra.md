---
summary: "使用 DeepInfra 的统一 API，在 OpenClaw 中访问最受欢迎的开源和前沿模型"
read_when:
  - 你想为最顶级的开源 LLM 使用一个统一的 API 密钥
  - 你想在 OpenClaw 中通过 DeepInfra 的 API 运行模型
title: "DeepInfra"
---

DeepInfra 通过一个兼容 OpenAI 的单一端点和 API 密钥，将请求路由到流行的开源和前沿模型。大多数 OpenAI SDK 只需切换 base URL 即可使用。

## 安装插件

```bash
openclaw plugins install @openclaw/deepinfra-provider
openclaw gateway restart
```

## 获取 API 密钥

1. 在 [deepinfra.com](https://deepinfra.com/) 登录
2. 前往 Dashboard / Keys 并生成一个密钥，或者使用自动创建的密钥

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
      model: { primary: "deepinfra/deepseek-ai/DeepSeek-V4-Flash" },
    },
  },
}
```

## 支持的接入面

聊天、图像生成和视频生成会在设置了 `DEEPINFRA_API_KEY` 后，直接从 `https://api.deepinfra.com/v1/openai/models?sort_by=openclaw&filter=with_meta` 实时刷新它们的模型目录。其他接入面则继续使用下面的静态默认值，直到它们也迁移到同一个实时目录。

| 接入面                   | 默认模型                                                                                              | OpenClaw 配置/工具                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 聊天 / model provider    | 来自实时目录中第一个带有 chat 标签的条目（静态回退 `deepseek-ai/DeepSeek-V4-Flash`）                  | `agents.defaults.model`                                  |
| 图像生成/编辑            | 来自实时目录中第一个带有 `image-gen` 标签的条目（静态回退 `black-forest-labs/FLUX-1-schnell`）        | `image_generate`, `agents.defaults.imageGenerationModel` |
| 媒体理解                  | `moonshotai/Kimi-K2.5` 用于图像                                                                         | inbound image understanding                              |
| 语音转文本                | `openai/whisper-large-v3-turbo`                                                                       | inbound audio transcription                              |
| 文本转语音                | `hexgrad/Kokoro-82M`                                                                                  | `messages.tts.provider: "deepinfra"`                     |
| 视频生成                  | 静态回退 `Pixverse/Pixverse-T2V`（目前 DeepInfra 没有实时的 video-gen 行）                              | `video_generate`, `agents.defaults.videoGenerationModel` |
| 记忆嵌入                  | `BAAI/bge-m3`                                                                                         | `agents.defaults.memorySearch.provider: "deepinfra"`     |

DeepInfra 还提供重排序、分类、目标检测以及其他原生模型类型。OpenClaw 目前对这些类别还没有 provider 合约，因此这个插件不会注册它们。

## 可用模型

一旦配置了密钥，OpenClaw 会动态发现 DeepInfra 模型。使用
`/models deepinfra` 或 `openclaw models list --provider deepinfra` 来查看
当前列表。

[deepinfra.com](https://deepinfra.com/) 上的任何模型都可以与
`deepinfra/` 前缀一起使用：

```text
deepinfra/deepseek-ai/DeepSeek-V4-Flash
deepinfra/deepseek-ai/DeepSeek-V3.2
deepinfra/MiniMaxAI/MiniMax-M2.5
deepinfra/moonshotai/Kimi-K2.5
deepinfra/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B
deepinfra/zai-org/GLM-5.1
...还有更多
```

## 说明

- Model refs are `deepinfra/<provider>/<model>`（例如 `deepinfra/Qwen/Qwen3-Max`）。
- 默认聊天模型：`deepinfra/deepseek-ai/DeepSeek-V4-Flash`
- 基础 URL：`https://api.deepinfra.com/v1/openai`
- 原生视频生成功能使用 `https://api.deepinfra.com/v1/inference/<model>`。

## 相关链接

- [模型提供方](/concepts/model-providers)
- [所有提供方](/providers/index)
