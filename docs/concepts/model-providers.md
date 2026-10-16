---
summary: "模型提供程序参考索引：快速规则、Control UI 和密钥、捆绑的提供程序插件和自定义提供程序"
read_when:
  - "你需要按提供商逐一查看模型设置参考"
  - "你想获取模型提供商的示例配置或 CLI 入门命令"
title: "模型提供商"
sidebarTitle: "模型提供商"
---

**LLM/model 提供商的参考**（不是像WhatsApp/Telegram 这样的聊天频道）。选型规则参见[Models](/concepts/models)。

此页是一个索引。提供者参考记录共四页，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                                              | 读它的时候                                                                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [快速规则](/concepts/model-providers/quick-rules)                              | 您需要模型引用、CLI 帮助程序或决定您的主要模型和 OpenAI 运行时的规则。                   |
| [控制UI和API键](/concepts/model-providers/control-ui-and-keys)          | 您正在从“设置”->“模型”配置提供商，或设置多个 API 密钥和轮换。                |
| [官方提供商插件](/concepts/model-providers/official-provider-plugins)  | 您正在设置捆绑提供程序，或者需要其 id、auth env、示例模型和怪癖。                         |
| [自定义提供程序和本地运行时](/concepts/model-providers/custom-providers) | 您正在通过 `models.providers`、自定义基础 URL、代理或本地推理服务器配置提供程序。 |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/concepts/model-providers#byteplus-international`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="quick-rules" />[快速规则](/concepts/model-providers/quick-rules#quick-rules)
- <a id="model-refs-and-cli-helpers" />[模型参考和CLI帮助器](/concepts/model-providers/quick-rules#model-refs-and-cli-helpers)
- <a id="adding-provider-auth-does-not-change-your-primary-model" />[添加提供商身份验证不会更改您的主要模型](/concepts/model-providers/quick-rules#adding-provider-auth-does-not-change-your-primary-model)
- <a id="openai-provider-runtime-split" />[OpenAI provider/runtime split](/concepts/model-providers/quick-rules#openai-provider-runtime-split)
- <a id="cli-runtimes" />[CLI 运行时间](/concepts/model-providers/quick-rules#cli-runtimes)
- <a id="configure-providers-in-the-control-ui" />[在 Control UI](/concepts/model-providers/control-ui-and-keys#configure-providers-in-the-control-ui) 中配置提供程序
- <a id="plugin-owned-provider-behavior" />[插件拥有的提供者行为](/concepts/model-providers/control-ui-and-keys#plugin-owned-provider-behavior)
- <a id="api-key-rotation" />[API 钥匙旋转](/concepts/model-providers/control-ui-and-keys#api-key-rotation)
- <a id="key-sources-and-priority" />[关键来源和优先级](/concepts/model-providers/control-ui-and-keys#key-sources-and-priority)
- <a id="when-rotation-kicks-in" />[旋转开始时](/concepts/model-providers/control-ui-and-keys#when-rotation-kicks-in)
- <a id="official-provider-plugins" />[官方提供商插件](/concepts/model-providers/official-provider-plugins#official-provider-plugins)
- <a id="openai" />[OpenAI](/concepts/model-providers/official-provider-plugins#openai)
- <a id="anthropic" />[人类](/concepts/model-providers/official-provider-plugins#anthropic)
- <a id="openai-chatgpt%2Fcodex-oauth" /><a id="openai-chatgpt/codex-oauth" />[OpenAI ChatGPT/Codex OAuth](/concepts/model-providers/official-provider-plugins#openai-chatgpt/codex-oauth)
- <a id="other-subscription-style-hosted-options" />[其他订阅式托管选项](/concepts/model-providers/official-provider-plugins#other-subscription-style-hosted-options)
- <a id="opencode" />[OpenCode](/concepts/model-providers/official-provider-plugins#opencode)
- <a id="google-gemini-(api-key)" /><a id="google-gemini-api-key" />[Google Gemini（API 密钥）](/concepts/model-providers/official-provider-plugins#google-gemini-api-key)
- <a id="google-vertex-and-gemini-cli-runtime" />[Google Vertex 和 Gemini CLI 运行时](/concepts/model-providers/official-provider-plugins#google-vertex-and-gemini-cli-runtime)
- <a id="z.ai-(glm)" /><a id="z-ai-glm" />[Z.AI (GLM)](/concepts/model-providers/official-provider-plugins#z-ai-glm)
- <a id="vercel-ai-gateway" />[Vercel AI Gateway](/concepts/model-providers/official-provider-plugins#vercel-ai-gateway)
- <a id="other-bundled-provider-plugins" />[其他捆绑的提供商插件](/concepts/model-providers/official-provider-plugins#other-bundled-provider-plugins)
- <a id="quirks-worth-knowing" />[值得了解的怪癖](/concepts/model-providers/official-provider-plugins#quirks-worth-knowing)
- <a id="openrouter" />[OpenRouter](/concepts/model-providers/official-provider-plugins#openrouter)
- <a id="kilo-gateway" />[基洛 Gateway](/concepts/model-providers/official-provider-plugins#kilo-gateway)
- <a id="minimax-1" />[MiniMax（怪癖）](/concepts/model-providers/official-provider-plugins#minimax)
- <a id="nvidia" />[NVIDIA](/concepts/model-providers/official-provider-plugins#nvidia)
- <a id="xai" />[xAI](/concepts/model-providers/official-provider-plugins#xai)
- <a id="providers-via-models.providers-(custom%2Fbase-url)" /><a id="providers-via-models-providers-custom/base-url" />[通过 `models.providers` 提供者 （custom/base URL）](/concepts/model-providers/custom-providers#providers-via-models-providers-custom/base-url)
- <a id="moonshot-ai-(kimi)" /><a id="moonshot-ai-kimi" />[Moonshot AI （Kimi）](/concepts/model-providers/custom-providers#moonshot-ai-kimi)
- <a id="kimi-coding" />[Kimi Coding](/concepts/model-providers/custom-providers#kimi-coding)
- <a id="volcano-engine-(doubao)" /><a id="volcano-engine-doubao" />[火山发动机 （Doubao）](/concepts/model-providers/custom-providers#volcano-engine-doubao)
- <a id="standard-models" />[标准模型（火山发动机）](/concepts/model-providers/custom-providers#standard-models)
- <a id="coding-models-volcengine-plan" />[编码模型（volcengine-plan）](/concepts/model-providers/custom-providers#coding-models-volcengine-plan)
- <a id="byteplus-(international)" /><a id="byteplus-international" />[BytePlus（国际）](/concepts/model-providers/custom-providers#byteplus-international)
- <a id="standard-models-2" />[标准模型（BytePlus）](/concepts/model-providers/custom-providers#standard-models-2)
- <a id="coding-models-byteplus-plan" />[编码模型（byteplus-plan）](/concepts/model-providers/custom-providers#coding-models-byteplus-plan)
- <a id="synthetic" />[合成](/concepts/model-providers/custom-providers#synthetic)
- <a id="minimax" />[MiniMax](/concepts/model-providers/custom-providers#minimax)
- <a id="llama.cpp" /><a id="llama-cpp" />[llama.cpp](/concepts/model-providers/custom-providers#llama-cpp)
- <a id="llmman" />[llmman](/concepts/model-providers/custom-providers#llmman)
- <a id="lm-studio" />[LM Studio](/concepts/model-providers/custom-providers#lm-studio)
- <a id="ollama" />[Ollama](/concepts/model-providers/custom-providers#ollama)
- <a id="vllm" />[vLLM](/concepts/model-providers/custom-providers#vllm)
- <a id="sglang" />[SGLang](/concepts/model-providers/custom-providers#sglang)
- <a id="local-proxies-(lm-studio%2C-vllm%2C-litellm%2C-etc.)" /><a id="local-proxies-lm-studio-vllm-litellm-etc" />[本地代理（LM Studio、vLLM、LiteLLM等）](/concepts/model-providers/custom-providers#local-proxies-lm-studio-vllm-litellm-etc)
- <a id="default-optional-fields" />[默认可选字段](/concepts/model-providers/custom-providers#default-optional-fields)
- <a id="proxy-route-shaping-rules" />[代理路由整形规则](/concepts/model-providers/custom-providers#proxy-route-shaping-rules)

## <a id="cli-examples"></a> CLI 示例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另请参阅：[配置](/gateway/configuration) 以查看完整的配置示例。

## <a id="related"></a> 相关内容

- [配置参考](/gateway/config-agents#agent-defaults) - 模型配置键
- [模型故障转移](/concepts/model-failover) - 回退链和重试行为
- [模型](/concepts/models) - 模型配置和别名
- [提供商](/providers) - 每个提供商的设置指南。
- [代理harness插件](/plugins/sdk-agent-harness) - SDK 用于替换嵌入式代理执行器的插件的表面
- [`openclaw models`](/cli/models) - 列出、选择和验证来自 CLI 的提供程序
