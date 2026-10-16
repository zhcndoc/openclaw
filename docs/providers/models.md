---
summary: "OpenClaw 支持的模型提供商（LLMs）"
read_when:
  - "你想选择一个模型提供商"
  - "你想快速查看 LLM 认证和模型选择的设置示例"
title: "模型提供商快速入门"
---

选择一个提供商，完成认证，然后将默认模型设置为 `provider/model`。

## <a id="quick-start-(two-steps)"></a><a id="quick-start-two-steps"></a> Quick start（两步）

1. 使用提供商进行认证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## <a id="supported-providers-(starter-set)"></a><a id="supported-providers-starter-set"></a> 支持的提供商（入门套件）

- [阿里巴巴 Model Studio](/providers/alibaba)
- [亚马逊 Bedrock](/providers/bedrock)
- [人类 （API + Claude CLI）](/providers/anthropic)
- [Baseten（Inkling + 模型 API）](/providers/baseten)
- [BytePlus（国际版）](/concepts/model-providers#byteplus-international)
- [滑槽](/providers/chutes)
- [Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
- [Cohere](/providers/cohere)
- [ComfyUI](/providers/comfy)
- [DeepInfra](/providers/deepinfra)
- [fal](/providers/fal)
- [烟花](/providers/fireworks)
- [Kie AI](/providers/kie)
- [MiniMax](/providers/minimax)
- [Mistral](/providers/mistral)
- [Moonshot AI（Kimi + Kimi 编码）](/providers/moonshot)
- [诺维塔AI](/providers/novita)
- [OpenAI （API + Codex）](/providers/openai)
- [OpenCode （Zen + Go）](/providers/opencode)
- [OpenRouter](/providers/openrouter)
- [千帆](/providers/qianfan)
- [Qwen](/providers/qwen)
- [跑道](/providers/runway)
- [StepFun](/providers/stepfun)
- [合成](/providers/synthetic)
- [Telnyx（AI推断）](/providers/telnyx)
- [威尼斯 （Venice AI）](/providers/venice)
- [Vercel AI Gateway](/providers/vercel-ai-gateway)
- [xAI](/providers/xai)
- [Z.AI (GLM)](/providers/zai)

有关完整的提供商目录和高级配置，请参阅 [提供商目录](/providers/index) 和 [模型提供商](/concepts/model-providers)。

<a id="additional-bundled-provider-variants" />

## <a id="additional-provider-variants"></a> 其他提供商变体

- `anthropic-vertex` - 在 Google Vertex 支持上安装 `@openclaw/anthropic-vertex-provider` 以实现隐式 Anthropic。当 Vertex 凭证可用时，该支持适用。没有单独的入门引导授权选择。
- `copilot-proxy` - 本地 VS Code Copilot 代理桥。使用 `openclaw onboard --auth-choice copilot-proxy`。
- `google-gemini-cli` - 标准 `google/*` 模型的可选显式运行时。它需要本地 `gemini` 安装和受支持的 Google AI Studio API-key 配置文件。不提供新的 Gemini CLI 或反重力 OAuth 设置。

## <a id="related"></a> 相关内容

- [提供商目录](/providers/index)
- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
- [模型 CLI](/cli/models)
