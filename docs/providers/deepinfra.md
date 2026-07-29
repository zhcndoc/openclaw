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

Chat, image generation, and video generation refresh their model catalogs
live from `https://api.deepinfra.com/v1/openai/models?sort_by=openclaw&filter=with_meta`
once `DEEPINFRA_API_KEY` is configured. Live discovery expands the list of
selectable models; the default model per surface stays the static value
below. Other surfaces use static catalogs until they move onto the same
live catalog.

| Surface                  | Default model                                                                  | OpenClaw config/tool                                  |
| ------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Chat / model provider    | `deepseek-ai/DeepSeek-V4-Flash` (live catalog adds more chat models)           | `agents.defaults.model`                               |
| Image generation/editing | `black-forest-labs/FLUX-1-schnell` (live catalog adds more `image-gen` models) | `image_generate`, `agents.defaults.mediaModels.image` |
| Media understanding      | `moonshotai/Kimi-K2.5` for images                                              | inbound image understanding                           |
| Speech-to-text           | `openai/whisper-large-v3-turbo`                                                | inbound audio transcription                           |
| Text-to-speech           | `hexgrad/Kokoro-82M`                                                           | `tts.provider: "deepinfra"`                           |
| Video generation         | `Pixverse/Pixverse-T2V` (live catalog adds more `video-gen` models)            | `video_generate`, `agents.defaults.mediaModels.video` |
| Memory embeddings        | `BAAI/bge-m3`                                                                  | `memory.search.provider: "deepinfra"`                 |

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

- Model refs are `deepinfra/<provider>/<model>` (for example `deepinfra/Qwen/Qwen3-Max`).
- Default chat model: `deepinfra/deepseek-ai/DeepSeek-V4-Flash`
- Base URL: `https://api.deepinfra.com/v1/openai`
- Video generation uses the OpenAI-compatible async endpoint `https://api.deepinfra.com/v1/openai/videos` (submit, then poll). A configured `baseUrl` is honored. `openclaw doctor --fix` migrates legacy `nativeBaseUrl` or `/v1/inference` values on `api.deepinfra.com` to `baseUrl` automatically; custom native endpoints are retired with a doctor notice and need a manually configured OpenAI-compatible `baseUrl`. Video generation fails with an actionable error (before sending any request) while `baseUrl` still targets the retired `/v1/inference` surface.

## 相关链接

- [模型提供方](/concepts/model-providers)
- [所有提供方](/providers/index)
