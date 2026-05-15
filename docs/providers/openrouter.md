---
summary: "使用 OpenRouter 的统一 API 在 OpenClaw 中访问众多模型"
read_when:
  - 你希望为许多 LLM 使用一个 API 密钥
  - 你希望在 OpenClaw 中通过 OpenRouter 运行模型
  - 你希望使用 OpenRouter 进行图像生成
  - 你希望使用 OpenRouter 进行视频生成
title: "OpenRouter"
---

OpenRouter 提供了一个 **统一 API**，可通过单一
端点和 API 密钥将请求路由到许多模型。它兼容 OpenAI，因此大多数 OpenAI SDK 只需切换 base URL 即可使用。

## 开始使用

<Steps>
  <Step title="获取你的 API 密钥">
    在 [openrouter.ai/keys](https://openrouter.ai/keys) 创建一个 API 密钥。
  </Step>
  <Step title="运行引导">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="（可选）切换到特定模型">
    引导过程默认使用 `openrouter/auto`。之后可选择一个具体模型：

    ```bash
    openclaw models set openrouter/<provider>/<model>
    ```

  </Step>
</Steps>

## 配置示例

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## 模型引用

<Note>
模型引用遵循 `openrouter/<provider>/<model>` 的格式。有关可用提供商和模型的完整列表，请参见 [/concepts/model-providers](/concepts/model-providers)。
</Note>

内置回退示例：

| Model ref                         | 说明                         |
| --------------------------------- | ---------------------------- |
| `openrouter/auto`                 | OpenRouter 自动路由          |
| `openrouter/moonshotai/kimi-k2.6` | 通过 MoonshotAI 的 Kimi K2.6 |
| `openrouter/moonshotai/kimi-k2.5` | 通过 MoonshotAI 的 Kimi K2.5 |

## 图像生成

OpenRouter 也可以支持 `image_generate` 工具。在 `agents.defaults.imageGenerationModel` 下使用 OpenRouter 图像模型：

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openrouter/google/gemini-3.1-flash-image-preview",
        timeoutMs: 180_000,
      },
    },
  },
}
```

OpenClaw 会将图像请求发送到 OpenRouter 的 chat completions 图像 API，并使用 `modalities: ["image", "text"]`。Gemini 图像模型会通过 OpenRouter 的 `image_config` 接收支持的 `aspectRatio` 和 `resolution` 提示。对于较慢的 OpenRouter 图像模型，请使用 `agents.defaults.imageGenerationModel.timeoutMs`；`image_generate` 工具的单次调用 `timeoutMs` 参数仍然优先生效。

## 视频生成

OpenRouter 也可以通过其异步 `/videos` API 支持 `video_generate` 工具。在 `agents.defaults.videoGenerationModel` 下使用 OpenRouter 视频模型：

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "openrouter/google/veo-3.1-fast",
      },
    },
  },
}
```

OpenClaw 会将文本生成视频和图像生成视频任务提交给 OpenRouter，轮询
返回的 `polling_url`，并从 OpenRouter 的 `unsigned_urls` 或文档中说明的任务内容端点下载已完成的视频。默认情况下，参考图像会作为首帧/尾帧图像发送；带有 `reference_image` 标记的图像会作为 OpenRouter 输入引用发送。内置的 `google/veo-3.1-fast` 默认项声明了当前支持的 4/6/8
秒时长、`720P`/`1080P` 分辨率以及 `16:9`/`9:16` 宽高比。由于上游视频生成 API 目前仅接受文本和图像引用，因此 OpenRouter 上未注册视频转视频功能。

## 文本转语音

OpenRouter 也可通过其兼容 OpenAI 的
`/audio/speech` 端点作为 TTS 提供商使用。

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openrouter",
      providers: {
        openrouter: {
          model: "hexgrad/kokoro-82m",
          voice: "af_alloy",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```

如果省略 `messages.tts.providers.openrouter.apiKey`，TTS 将依次复用
`models.providers.openrouter.apiKey`，然后是 `OPENROUTER_API_KEY`。

## 语音转文本（入站音频）

OpenRouter 可以通过其 STT 端点（`/audio/transcriptions`），使用共享的
`tools.media.audio` 路径转录入站语音/音频附件。
这适用于任何将入站语音/音频转发到
媒体理解预检的通道插件。

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "openrouter", model: "openai/whisper-large-v3-turbo" }],
      },
    },
  },
}
```

OpenClaw 会将 OpenRouter STT 请求作为 JSON 发送，并在
`input_audio` 下附带 base64 音频（OpenRouter STT 合约），而不是作为 multipart OpenAI 表单上传。

## 身份验证和请求头

OpenRouter 在底层使用带有你的 API 密钥的 Bearer token。

在真实的 OpenRouter 请求（`https://openrouter.ai/api/v1`）中，OpenClaw 还会添加
OpenRouter 文档中定义的应用归属请求头：

| Header                    | Value                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HTTP-Referer`            | `https://openclaw.ai`                                                                                  |
| `X-OpenRouter-Title`      | `OpenClaw`                                                                                             |
| `X-OpenRouter-Categories` | `cli-agent,cloud-agent,programming-app,creative-writing,writing-assistant,general-chat,personal-agent` |

<Warning>
如果你将 OpenRouter 提供商重新指向其他代理或 base URL，OpenClaw
不会注入这些 OpenRouter 特定的请求头或 Anthropic 缓存标记。
</Warning>

## 高级配置

<AccordionGroup>
  <Accordion title="Response caching">
    OpenRouter 响应缓存是可选启用的。可通过模型参数为每个 OpenRouter 模型单独启用：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openrouter/auto": {
              params: {
                responseCache: true,
                responseCacheTtlSeconds: 300,
              },
            },
          },
        },
      },
    }
    ```

    OpenClaw 发送 `X-OpenRouter-Cache: true`，并在配置时发送
    `X-OpenRouter-Cache-TTL`。`responseCacheClear: true` 会强制刷新
    当前请求并存储替换后的响应。snake_case 别名
    （`response_cache`、`response_cache_ttl_seconds` 和
    `response_cache_clear`）也同样被接受。

    这与提供商提示缓存以及 OpenRouter 的 Anthropic `cache_control` 标记是分开的。它只会应用于已验证的
    `openrouter.ai` 路由，而不会应用于自定义代理 base URL。

  </Accordion>

  <Accordion title="Anthropic cache markers">
    在已验证的 OpenRouter 路由上，Anthropic 模型引用会保留
    OpenRouter 特定的 Anthropic `cache_control` 标记，OpenClaw 会使用这些标记来
    更好地在 system/developer 提示块上复用提示缓存。
  </Accordion>

  <Accordion title="Anthropic reasoning prefill">
    在已验证的 OpenRouter 路由上，启用推理的 Anthropic 模型引用会在请求到达 OpenRouter 之前移除末尾的 assistant prefill 回合，以符合 Anthropic 的要求：推理对话必须以 user 回合结束。
  </Accordion>

  <Accordion title="Thinking / reasoning injection">
    在受支持的非 `auto` 路由上，OpenClaw 会将所选的思考级别映射到
    OpenRouter 代理推理负载。未受支持的模型提示和
    `openrouter/auto` 会跳过该推理注入。Hunter Alpha 也会为过期的已配置模型引用跳过代理推理，因为 OpenRouter 可能会针对该已退役路由在推理字段中返回最终答案文本。
  </Accordion>

  <Accordion title="DeepSeek V4 reasoning replay">
    在已验证的 OpenRouter 路由上，`openrouter/deepseek/deepseek-v4-flash` 和
    `openrouter/deepseek/deepseek-v4-pro` 会在重放的 assistant 回合中补全缺失的 `reasoning_content`，以便思考/工具对话保持 DeepSeek V4 所需的后续形状。OpenClaw 会为这些路由发送 OpenRouter 支持的
    `reasoning_effort` 值；`xhigh` 是当前声明的最高级别，过时的 `max` 覆盖会映射为 `xhigh`。
  </Accordion>

  <Accordion title="OpenAI-only request shaping">
    OpenRouter 仍然通过代理式的 OpenAI 兼容路径运行，因此诸如 `serviceTier`、Responses `store`、OpenAI reasoning-compat 负载和提示缓存提示等原生 OpenAI 专属请求形状不会被转发。
  </Accordion>

  <Accordion title="Gemini 支持的路由">
    由 Gemini 支持的 OpenRouter 引用仍保持在代理 Gemini 路径上：OpenClaw 会保留
    其中的 Gemini thought-signature 清理，但不会启用原生 Gemini
    重放验证或 bootstrap 重写。
  </Accordion>

  <Accordion title="提供商路由元数据">
    如果你在模型参数中传入 OpenRouter 提供商路由，OpenClaw 会在共享流包装器运行之前将其作为 OpenRouter 路由元数据转发。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    agents、models 和 providers 的完整配置参考。
  </Card>
</CardGroup>