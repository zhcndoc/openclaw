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
2. 前往 Dashboard / Keys 并生成一个密钥，或者使用自动创建的密钥。

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
  env: { vars: { DEEPINFRA_API_KEY: "<your-deepinfra-api-key>" } }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "deepinfra/deepseek-ai/DeepSeek-V4-Flash" },
    },
  },
}
```

## 支持的接入面

Chat、图像生成和视频生成会在配置 `DEEPINFRA_API_KEY` 后，实时从
`https://api.deepinfra.com/v1/openai/models?sort_by=openclaw&filter=with_meta`
刷新其模型目录。实时发现会扩展可选模型列表；每个接入面的默认模型仍为下方的静态值。
其他接入面在迁移到相同的实时目录之前，会使用静态目录。

| 接入面                   | 默认模型                                                                       | OpenClaw 配置/工具                                  |
| ------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Chat / 模型提供方        | `deepseek-ai/DeepSeek-V4-Flash`（实时目录会添加更多 Chat 模型）                 | `agents.defaults.model`                               |
| 图像生成/编辑             | `black-forest-labs/FLUX-1-schnell`（实时目录会添加更多 `image-gen` 模型）       | `image_generate`、`agents.defaults.mediaModels.image` |
| 媒体理解                 | 图像使用 `moonshotai/Kimi-K2.5`                                                  | 入站图像理解                                           |
| 语音转文本               | `openai/whisper-large-v3-turbo`                                                | 入站音频转录                                           |
| 文本转语音               | `hexgrad/Kokoro-82M`                                                           | `tts.provider: "deepinfra"`                           |
| 视频生成                 | `Pixverse/Pixverse-T2V`（实时目录会添加更多 `video-gen` 模型）                  | `video_generate`、`agents.defaults.mediaModels.video` |
| 记忆嵌入                 | `BAAI/bge-m3`                                                                  | `memory.search.provider: "deepinfra"`                 |

DeepInfra 还提供重排序、分类、目标检测以及其他原生模型类型。OpenClaw 目前对这些类别还没有 provider 合约，因此这个插件不会注册它们。

## 可用模型

一旦配置了密钥，OpenClaw 会动态发现 DeepInfra 模型。使用
`/models deepinfra` 或 `openclaw models list --provider deepinfra` 来查看
当前列表。

[deepinfra.com](https://deepinfra.com/) 上的任何模型都可以与
`deepinfra/` 前缀一起使用：

```text
deepinfra/deepseek-ai/DeepSeek-V4-Flash
deepinfra/deepseek-ai/DeepSeek-V4-Pro
deepinfra/zai-org/GLM-5.2
deepinfra/stepfun-ai/Step-3.7-Flash
deepinfra/moonshotai/Kimi-K2.7-Code
deepinfra/moonshotai/Kimi-K2.6
deepinfra/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B
deepinfra/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B
...and many more
```

## 说明

- 模型引用格式为 `deepinfra/<provider>/<model>`（例如 `deepinfra/Qwen/Qwen3-Max`）。
- 默认聊天模型：`deepinfra/deepseek-ai/DeepSeek-V4-Flash`
- 基础 URL：`https://api.deepinfra.com/v1/openai`
- 视频生成使用 OpenAI 兼容的异步端点 `https://api.deepinfra.com/v1/openai/videos`（先提交，然后轮询）。系统会遵循已配置的 `baseUrl`。`openclaw doctor --fix` 会自动将 `api.deepinfra.com` 上旧版的 `nativeBaseUrl` 或 `/v1/inference` 值迁移到 `baseUrl`；自定义原生端点已弃用，doctor 会发出通知，并且需要手动配置 OpenAI 兼容的 `baseUrl`。当 `baseUrl` 仍指向已弃用的 `/v1/inference` 接口时，视频生成会在发送任何请求之前失败，并提供可执行的错误信息。

## 相关链接

- [模型提供方](/concepts/model-providers)
- [所有提供方](/providers/index)
