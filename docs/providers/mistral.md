---
summary: "在 OpenClaw 中使用 Mistral 模型和 Voxtral 转录"
read_when:
  - 你想在 OpenClaw 中使用 Mistral 模型
  - 你需要 Mistral API 密钥接入和模型引用
title: "Mistral"
---

# Mistral

OpenClaw 支持 Mistral，用于文本/图像模型路由（`mistral/...`）以及通过 Voxtral 进行媒体理解中的音频转录。  
Mistral 也可以用于记忆向量嵌入（`memorySearch.provider = "mistral"`）。

## 命令行设置

```bash
openclaw onboard --auth-choice mistral-api-key
# 或非交互式
openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
```

## 配置示例（LLM 提供者）

```json5
{
  env: { MISTRAL_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
}
```

## 配置示例（使用 Voxtral 的音频转录）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

## 注意事项

- Mistral 认证使用 `MISTRAL_API_KEY`。  
- 提供者基本 URL 默认为 `https://api.mistral.ai/v1`。  
- 默认接入模型是 `mistral/mistral-large-latest`。  
- Mistral 的媒体理解默认音频模型是 `voxtral-mini-latest`。  
- 媒体转录路径使用 `/v1/audio/transcriptions`。  
- 记忆向量嵌入路径使用 `/v1/embeddings`（默认模型：`mistral-embed`）。
