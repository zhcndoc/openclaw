---
summary: "OpenClaw 支持的模型提供商（LLMs）"
read_when:
  - 你想选择一个模型提供商
  - 你需要快速了解支持的 LLM 后端
title: "提供商目录"
---

OpenClaw 可以使用许多 LLM 提供商。选择一个提供商，完成认证，然后将
默认模型设置为 `provider/model`。

正在查找聊天频道文档（WhatsApp/Telegram/Discord/Slack/Mattermost（插件）/等）？请参见 [Channels](/channels)。

## 快速开始

1. 使用提供商进行认证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 提供商文档

- [阿里巴巴 Model Studio](/providers/alibaba)
- [Amazon Bedrock](/providers/bedrock)
- [Amazon Bedrock Mantle](/providers/bedrock-mantle)
- [Anthropic（API + Claude CLI）](/providers/anthropic)
- [Arcee AI（Trinity 模型）](/providers/arcee)
- [Azure Speech](/providers/azure-speech)
- [Baseten (Inkling + Model APIs)](/providers/baseten)
- [BytePlus (International)](/concepts/model-providers#byteplus-international)
- [Cerebras](/providers/cerebras)
- [Chutes](/providers/chutes)
- [ClawRouter（托管的多提供商路由）](/providers/clawrouter)
- [Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
- [Cohere](/providers/cohere)
- [ComfyUI](/providers/comfy)
- [DeepSeek](/providers/deepseek)
- [ds4（本地 DeepSeek V4）](/providers/ds4)
- [ElevenLabs](/providers/elevenlabs)
- [fal](/providers/fal)
- [Featherless AI](/providers/featherless)
- [Fireworks](/providers/fireworks)
- [GitHub Copilot](/providers/github-copilot)
- [GMI Cloud](/providers/gmi)
- [Google（Gemini）](/providers/google)
- [Gradium](/providers/gradium)
- [Groq（LPU 推理）](/providers/groq)
- [Hugging Face（推理）](/providers/huggingface)
- [inferrs（本地模型）](/providers/inferrs)
- [Kilocode](/providers/kilocode)
- [LiteLLM（统一网关）](/providers/litellm)
- [LM Studio（本地模型）](/providers/lmstudio)
- [LongCat](/providers/longcat)
- [MiniMax](/providers/minimax)
- [Mistral](/providers/mistral)
- [Moonshot AI（Kimi + Kimi Coding）](/providers/moonshot)
- [NovitaAI](/providers/novita)
- [NVIDIA](/providers/nvidia)
- [Ollama（云 + 本地模型）](/providers/ollama)
- [Ollama Cloud](/providers/ollama-cloud)
- [OpenAI（API + Codex）](/providers/openai)
- [OpenCode](/providers/opencode)
- [OpenCode Go](/providers/opencode-go)
- [OpenRouter](/providers/openrouter)
- [Perplexity（网络搜索）](/providers/perplexity-provider)
- [Qianfan](/providers/qianfan)
- [Qwen Cloud](/providers/qwen)
- [Runway](/providers/runway)
- [SenseAudio](/providers/senseaudio)
- [SGLang（本地模型）](/providers/sglang)
- [StepFun](/providers/stepfun)
- [Synthetic](/providers/synthetic)
- [Tencent Cloud (TokenHub / TokenPlan)](/providers/tencent)
- [Together AI](/providers/together)
- [Venice（Venice AI，注重隐私）](/providers/venice)
- [Vercel AI Gateway](/providers/vercel-ai-gateway)
- [vLLM（本地模型）](/providers/vllm)
- [Volcengine（Doubao）](/providers/volcengine)
- [Vydra](/providers/vydra)
- [xAI](/providers/xai)
- [Xiaomi](/providers/xiaomi)
- [Z.AI (GLM)](/providers/zai)

## 共享概览页面

- [附加提供方变体](/providers/models#additional-provider-variants) - Anthropic Vertex、Copilot Proxy 和 Gemini CLI OAuth
- [图像生成](/tools/image-generation) - 共享 `image_generate` 工具、提供方选择和故障转移
- [音乐生成](/tools/music-generation) - 共享 `music_generate` 工具、提供方选择和故障转移
- [视频生成](/tools/video-generation) - 共享 `video_generate` 工具、提供方选择和故障转移

## 转录提供商

- [Deepgram（音频转录）](/providers/deepgram)
- [ElevenLabs](/providers/elevenlabs#speech-to-text)
- [Mistral](/providers/mistral#audio-transcription-voxtral)
- [OpenAI](/providers/openai)
- [SenseAudio](/providers/senseaudio)
- [xAI](/providers/xai)

## 社区工具

- [Claude Max API 代理](/providers/claude-max-api-proxy) - 用于 Claude 订阅凭证的社区代理（使用前请核实 Anthropic 政策/条款）

如需完整的提供商目录（xAI、Groq、Mistral 等）以及高级配置，
请参见 [模型提供商](/concepts/model-providers)。
