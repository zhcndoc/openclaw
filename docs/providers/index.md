---
summary: "OpenClaw 支持的模型提供商（LLMs）"
read_when:
  - "你想选择一个模型提供商"
  - "你需要快速了解支持的 LLM 后端"
title: "提供商目录"
---

OpenClaw 可以使用许多 LLM 提供商。选择一个提供商，完成认证，然后将默认模型设置为 `provider/model`。

正在查找聊天频道文档（WhatsApp/Telegram/Discord/Slack/Mattermost（插件）/等）？请参见 [Channels](/channels)。

## <a id="quick-start"></a> 快速开始

1. 使用提供商进行认证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## <a id="provider-docs"></a> 提供商文档

- [阿里巴巴 Model Studio](/providers/alibaba)
- [亚马逊 Bedrock](/providers/bedrock)
- [亚马逊基岩 Mantle](/providers/bedrock-mantle)
- [人类 （API + Claude CLI）](/providers/anthropic)
- [Arcee AI（Trinity 模型）](/providers/arcee)
- [Azure Speech](/providers/azure-speech)
- [Baseten（Inkling + 模型 API）](/providers/baseten)
- [BytePlus（国际版）](/concepts/model-providers#byteplus-international)
- [Cerebras](/providers/cerebras)
- [滑槽](/providers/chutes)
- [ClawRouter（托管的多提供商路由）](/providers/clawrouter)
- [Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
- [Cohere](/providers/cohere)
- [ComfyUI](/providers/comfy)
- [DeepSeek](/providers/deepseek)
- [ds4（本地 DeepSeek V4）](/providers/ds4)
- [ElevenLabs](/providers/elevenlabs)
- [fal](/providers/fal)
- [无羽 AI](/providers/featherless)
- [烟花](/providers/fireworks)
- [GitHub Copilot](/providers/github-copilot)
- [GMI Cloud](/providers/gmi)
- [Google （Gemini）](/providers/google)
- [Gradiium](/providers/gradium)
- [Groq（LPU 推理）](/providers/groq)
- [Hugging Face（推理）](/providers/huggingface)
- [Kie AI](/providers/kie)
- [千码](/providers/kilocode)
- [LiteLLM（统一网关）](/providers/litellm)
- [llama.cpp（托管或现有服务器）](/plugins/llama-cpp)
- [llmman（本地+混合local/hosted模型）](/providers/llmman)
- [LM Studio（本地模型）](/providers/lmstudio)
- [长猫](/providers/longcat)
- [MiniMax](/providers/minimax)
- [Mistral](/providers/mistral)
- [Moonshot AI（Kimi + Kimi 编码）](/providers/moonshot)
- [霓虹灯 AI Gateway](/providers/neon)
- [诺维塔AI](/providers/novita)
- [NVIDIA](/providers/nvidia)
- [Ollama（云端 + 本地模型）](/providers/ollama)
- [Ollama Cloud](/providers/ollama-cloud)
- [OpenAI （API + Codex）](/providers/openai)
- [开放代码](/providers/opencode)
- [OpenCode Go](/providers/opencode-go)
- [OpenRouter](/providers/openrouter)
- [Perplexity（网络搜索）](/providers/perplexity-provider)
- [池畔 （Laguna）](/providers/poolside)
- [千帆](/providers/qianfan)
- [Q文 Cloud](/providers/qwen)
- [半径](/providers/radius)
- [跑道](/providers/runway)
- [SenseAudio](/providers/senseaudio)
- [SGLang（本地模型）](/providers/sglang)
- [StepFun](/providers/stepfun)
- [合成](/providers/synthetic)
- [Telnyx（AI推断）](/providers/telnyx)
- [腾讯云（TokenHub / TokenPlan）](/providers/tencent)
- [一起 AI](/providers/together)
- [Venice（Venice AI，注重隐私）](/providers/venice)
- [Vercel AI Gateway](/providers/vercel-ai-gateway)
- [vLLM（本地模型）](/providers/vllm)
- [火山引擎（Doubao）](/providers/volcengine)
- [Vydra](/providers/vydra)
- [xAI](/providers/xai)
- [小米](/providers/xiaomi)
- [Z.AI (GLM)](/providers/zai)

## <a id="shared-overview-pages"></a> 共享概览页面

- [其他提供商变体](/providers/models#additional-provider-variants) - Anthropic Vertex、Copilot Proxy，以及可选的 Gemini CLI 运行时
- [Image Generation](/tools/image-generation) - 共享 `image_generate` 工具、提供商选择和故障转移
- [Music Generation](/tools/music-generation) - 共享 `music_generate` 工具、提供商选择和故障转移
- [Video Generation](/tools/video-generation) - 共享 `video_generate` 工具、提供商选择和故障转移

## <a id="transcription-providers"></a> 转录提供商

- [Deepgram（音频转录）](/providers/deepgram)
- [ElevenLabs](/providers/elevenlabs#speech-to-text)
- [Mistral](/providers/mistral#audio-transcription-voxtral)
- [OpenAI](/providers/openai)
- [SenseAudio](/providers/senseaudio)
- [xAI](/providers/xai)

## <a id="community-tools"></a> 社区工具

- [Claude Max API Proxy](/providers/claude-max-api-proxy) - Claude 订阅凭证的社区代理（使用前验证 Anthropic policy/terms）

如需完整的提供商目录（xAI、Groq、Mistral 等）以及高级配置， 请参见 [模型提供商](/concepts/model-providers)。
