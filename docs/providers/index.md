---
summary: "OpenClaw 支持的模型提供商（大型语言模型）"
read_when:
  - 你想选择一个模型提供商
  - 你需要支持的 LLM 后端的快速概览
title: "提供商目录"
---

# 模型提供商

OpenClaw 可以使用许多大型语言模型提供商。选择一个提供商，进行身份认证，然后将默认模型设置为 `provider/model`。

寻找聊天渠道文档（WhatsApp/Telegram/Discord/Slack/Mattermost（插件）等）？请参见 [频道](/channels)。

## 快速开始

1. 与提供商进行身份认证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 提供商文档

- [Alibaba Model Studio](/providers/alibaba)
- [Amazon Bedrock](/providers/bedrock)
- [Amazon Bedrock Mantle](/providers/bedrock-mantle)
- [Anthropic (API + Claude CLI)](/providers/anthropic)
- [Arcee AI (Trinity models)](/providers/arcee)
- [Azure Speech](/providers/azure-speech)
- [BytePlus (International)](/concepts/model-providers#byteplus-international)
- [Cerebras](/providers/cerebras)
- [Chutes](/providers/chutes)
- [Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
- [ComfyUI](/providers/comfy)
- [DeepSeek](/providers/deepseek)
- [ElevenLabs](/providers/elevenlabs)
- [fal](/providers/fal)
- [Fireworks](/providers/fireworks)
- [GitHub Copilot](/providers/github-copilot)
- [GLM 模型](/providers/glm)
- [Google（Gemini）](/providers/google)
- [Gradium](/providers/gradium)
- [Groq（LPU 推理）](/providers/groq)
- [Hugging Face（推理）](/providers/huggingface)
- [inferrs（本地模型）](/providers/inferrs)
- [Kilocode](/providers/kilocode)
- [LiteLLM（统一网关）](/providers/litellm)
- [LM Studio（本地模型）](/providers/lmstudio)
- [MiniMax](/providers/minimax)
- [Mistral](/providers/mistral)
- [Moonshot AI（Kimi + Kimi Coding）](/providers/moonshot)
- [NVIDIA](/providers/nvidia)
- [Ollama（云 + 本地模型）](/providers/ollama)
- [OpenAI（API + Codex）](/providers/openai)
- [OpenCode](/providers/opencode)
- [OpenCode Go](/providers/opencode-go)
- [OpenRouter](/providers/openrouter)
- [Perplexity（网络搜索）](/providers/perplexity-provider)
- [千帆](/providers/qianfan)
- [通义千问云](/providers/qwen)
- [Runway](/providers/runway)
- [SGLang（本地模型）](/providers/sglang)
- [StepFun](/providers/stepfun)
- [Synthetic](/providers/synthetic)
- [Tencent Cloud (TokenHub)](/providers/tencent)
- [Together AI](/providers/together)
- [Venice（Venice AI，注重隐私）](/providers/venice)
- [Vercel AI Gateway](/providers/vercel-ai-gateway)
- [vLLM（本地模型）](/providers/vllm)
- [Volcengine（Doubao）](/providers/volcengine)
- [Vydra](/providers/vydra)
- [xAI](/providers/xai)
- [小米](/providers/xiaomi)
- [Z.AI](/providers/zai)

## 共享概览页面

- [其他捆绑变体](/providers/models#additional-bundled-provider-variants) - Anthropic Vertex、Copilot Proxy 和 Gemini CLI OAuth
- [图像生成](/tools/image-generation) - 共享 `image_generate` 工具、提供商选择和故障转移
- [音乐生成](/tools/music-generation) - 共享 `music_generate` 工具、提供商选择和故障转移
- [视频生成](/tools/video-generation) - 共享 `video_generate` 工具、提供商选择和故障转移

## 转录提供商

- [Deepgram（音频转录）](/providers/deepgram)
- [ElevenLabs](/providers/elevenlabs#speech-to-text)
- [Mistral](/providers/mistral#audio-transcription-voxtral)
- [OpenAI](/providers/openai#speech-to-text)
- [xAI](/providers/xai#speech-to-text)

## 社区工具

- [Claude Max API 代理](/providers/claude-max-api-proxy) - Claude 订阅凭证的社区代理（使用前请确认 Anthropic 策略/条款）

欲了解完整的提供商目录（xAI、Groq、Mistral 等）及高级配置，
请参见 [模型提供商](/concepts/model-providers)。
