---
summary: "使用 OpenRouter 的统一 API 在 OpenClaw 中访问众多模型"
read_when:
  - 你想为多个 LLM 使用一个 API 密钥
  - 你想在 OpenClaw 中通过 OpenRouter 运行模型
  - 你想使用 OpenRouter 进行图像生成
  - 你想使用 OpenRouter 进行音乐生成
  - 你想使用 OpenRouter 进行视频生成
title: "OpenRouter"
---

OpenRouter 提供了一个 **统一 API**，可通过单一
端点和 API 密钥将请求路由到许多模型。它兼容 OpenAI，因此大多数 OpenAI SDK 只需切换 base URL 即可使用。

## 开始使用

<Tabs>
  <Tab title="OAuth">
    <Steps>
      <Step title="运行 OAuth 引导">
        ```bash
        openclaw onboard --auth-choice openrouter-oauth
        ```

        OpenClaw 会打开 OpenRouter 的浏览器登录流程，将 PKCE
        代码兑换为 OpenRouter API 密钥，并将该密钥存储在默认的
        OpenRouter 认证配置文件中。在远程/无头主机上，OpenClaw 会打印
        登录 URL，并要求你在登录后粘贴重定向 URL。
      </Step>
      <Step title="（可选）切换到特定模型">
        引导默认使用 `openrouter/auto`。之后可选择具体模型：

        ```bash
        openclaw models set openrouter/<provider>/<model>
        ```

      </Step>
    </Steps>

  </Tab>
  <Tab title="API key">
    <Steps>
      <Step title="获取你的 API 密钥">
        在 [openrouter.ai/keys](https://openrouter.ai/keys) 创建一个 API 密钥。
      </Step>
      <Step title="运行 API 密钥引导">
        ```bash
        openclaw onboard --auth-choice openrouter-api-key
        ```
      </Step>
      <Step title="（可选）切换到特定模型">
        引导默认使用 `openrouter/auto`。之后可选择具体模型：

        ```bash
        openclaw models set openrouter/<provider>/<model>
        ```

      </Step>
    </Steps>

  </Tab>
</Tabs>

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
| `openrouter/auto`                 | OpenRouter 自动路由 |
| `openrouter/openrouter/fusion`    | OpenRouter Fusion 路由器     |
| `openrouter/moonshotai/kimi-k2.6` | 通过 MoonshotAI 使用 Kimi K2.6     |
| `openrouter/moonshotai/kimi-k2.5` | 通过 MoonshotAI 使用 Kimi K2.5     |

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

## 音乐生成

OpenRouter 也可以通过 chat completions
音频输出来支持 `music_generate` 工具。在
`agents.defaults.musicGenerationModel` 下使用 OpenRouter 音频模型：

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "openrouter/google/lyria-3-pro-preview",
        timeoutMs: 180_000,
      },
    },
  },
}
```

捆绑的 OpenRouter 音乐提供商默认使用
`google/lyria-3-pro-preview`，并且还提供
`google/lyria-3-clip-preview`。OpenClaw 会发送 `modalities: ["text",
"audio"]`，启用流式传输，收集流式音频分片，并将结果保存为用于通道交付的生成媒体。Lyria 模型可通过共享的 `music_generate image=...`
参数接受参考图像。

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
          speakerVoice: "af_alloy",
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

## Fusion 路由器

当你想让一个 OpenClaw 模型引用并行询问多个
OpenRouter 模型、由 OpenRouter 评判它们的答案，并通过常规 OpenRouter 提供商端点返回
单个最终响应时，请使用 OpenRouter Fusion。由于
上游模型 slug 是 `openrouter/fusion`，OpenClaw 模型引用同时包含
OpenClaw 提供商前缀和上游 OpenRouter 命名空间：

```bash
openclaw models set openrouter/openrouter/fusion
```

通过模型的 `params.extraBody` 配置 Fusion 的 panel 和 judge。这些
字段会被转发到 OpenRouter chat-completions 请求体中。Fusion
既可与 OpenRouter OAuth 引导配合使用，也可与 API 密钥引导配合使用；如果你使用
OAuth，请从下面的示例中省略 `env.OPENROUTER_API_KEY` 这一行。

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/openrouter/fusion" },
      models: {
        "openrouter/openrouter/fusion": {
          params: {
            extraBody: {
              plugins: [
                {
                  id: "fusion",
                  analysis_models: [
                    "google/gemini-3.5-flash",
                    "moonshotai/kimi-k2.6",
                    "deepseek/deepseek-v4-pro",
                  ],
                  model: "google/gemini-3.5-flash",
                },
              ],
            },
          },
        },
      },
    },
  },
}
```

`analysis_models` 列表是并行面板，Fusion
插件配置中的 `model` 是 judge 模型。不要在普通的 OpenClaw 代理/聊天回合中将顶层 `tool_choice` 设置为
`"required"` 以尝试强制使用 Fusion；OpenClaw 回合可能包含 OpenClaw 工具定义，而顶层 required 工具选择可能会要求其中一个工具而不是 Fusion 路由器。当前面存在该 Fusion 插件配置时，OpenClaw 还会添加一条经过清理的
system 提示注释，其中包含已配置的分析模型和 judge 模型，以便
代理可以回答有关其当前 Fusion 面板的问题。其他 `extraBody`
字段不会被复制到提示中。

Fusion 的设计本来就更慢。OpenRouter 可能会将相同的 OpenClaw 提示发送给
多个分析模型，然后执行最终的 judge/合成步骤，因此延迟通常
高于直接的单模型请求。Fusion 适合用于慎重的、高质量的回答或升级路径，而不是作为
延迟敏感型聊天的默认选择。若想更快响应，请保持面板较小，并选择
更快的分析模型和 judge 模型。

使用一次性本地模型调用测试已配置的引用：

```bash
openclaw infer model run --local \
  --model openrouter/openrouter/fusion \
  --prompt "Reply with exactly: FUSION_OK" \
  --json
```

## 身份验证和请求头

OpenRouter 底层使用你的 API 密钥作为 Bearer token。OpenRouter
OAuth 是一个 PKCE 登录流程，会颁发 OpenRouter API 密钥，因此 OpenClaw 会将
结果存储为与手动 API 密钥设置路径相同的 `openrouter:default` API 密钥认证配置文件。

对于已存在的安装，可在不重新运行完整引导的情况下登录或轮换已存储的 OpenRouter 密钥：

```bash
openclaw models auth login --provider openrouter --method oauth
```

当你想粘贴自己在 OpenRouter 手动创建的密钥时，请使用
`openclaw models auth login --provider openrouter --method api-key`。

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
  <Accordion title="响应缓存">
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

  <Accordion title="Anthropic 缓存标记">
    在已验证的 OpenRouter 路由上，Anthropic 模型引用会保留
    OpenRouter 特定的 Anthropic `cache_control` 标记，OpenClaw 会使用这些标记来
    更好地在 system/developer 提示块上复用提示缓存。
  </Accordion>

  <Accordion title="Anthropic 推理预填充">
    在已验证的 OpenRouter 路由上，启用推理的 Anthropic 模型引用会在请求到达 OpenRouter 之前移除末尾的 assistant prefill 回合，以符合 Anthropic 的要求：推理对话必须以 user 回合结束。
  </Accordion>

  <Accordion title="思考 / 推理注入">
    在受支持的非 `auto` 路由上，OpenClaw 会将所选的思考级别映射到
    OpenRouter 代理推理负载。未受支持的模型提示和
    `openrouter/auto` 会跳过该推理注入。Hunter Alpha 也会为过期的已配置模型引用跳过代理推理，因为 OpenRouter 可能会针对该已退役路由在推理字段中返回最终答案文本。
  </Accordion>

  <Accordion title="DeepSeek V4 推理重放">
    在已验证的 OpenRouter 路由上，`openrouter/deepseek/deepseek-v4-flash` 和
    `openrouter/deepseek/deepseek-v4-pro` 会在重放的 assistant 回合中补全缺失的 `reasoning_content`，以便思考/工具对话保持 DeepSeek V4 所需的后续形状。OpenClaw 会为这些路由发送 OpenRouter 支持的
    `reasoning_effort` 值；`xhigh` 是当前声明的最高级别，过时的 `max` 覆盖会映射为 `xhigh`。
  </Accordion>

  <Accordion title="仅 OpenAI 的请求形状">
    OpenRouter 仍然通过代理式的 OpenAI 兼容路径运行，因此诸如 `serviceTier`、Responses `store`、OpenAI reasoning-compat 负载和提示缓存提示等原生 OpenAI 专属请求形状不会被转发。
  </Accordion>

  <Accordion title="Gemini 支持的路由">
    由 Gemini 支持的 OpenRouter 引用仍保持在代理 Gemini 路径上：OpenClaw 会保留
    其中的 Gemini thought-signature 清理，但不会启用原生 Gemini
    重放验证或 bootstrap 重写。
  </Accordion>

  <Accordion title="提供商路由元数据">
    OpenRouter 支持一个用于底层提供商路由的 `provider` 请求对象。通过
    `models.providers.openrouter.params.provider` 为所有 OpenRouter 文本模型请求配置默认策略：

    ```json5
    {
      models: {
        providers: {
          openrouter: {
            params: {
              provider: {
                sort: "latency",
                require_parameters: true,
                data_collection: "deny",
              },
            },
          },
        },
      },
    }
    ```

    OpenClaw 会将该对象作为请求 `provider` 负载转发给 OpenRouter。请使用 OpenRouter 文档中的 snake_case 字段，包括 `sort`、
    `only`、`ignore`、`order`、`allow_fallbacks`、`require_parameters`、
    `data_collection`、`quantizations`、`max_price`、`preferred_max_latency`、
    `preferred_min_throughput`、`zdr` 和 `enforce_distillable_text`。

    按模型设置的参数仍然会覆盖全局提供商路由对象：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openrouter/anthropic/claude-sonnet-4-6": {
              params: {
                provider: {
                  order: ["anthropic"],
                  allow_fallbacks: false,
                },
              },
            },
          },
        },
      },
    }
    ```

    这只适用于 OpenRouter chat-completions 路由。直接的 Anthropic、
    Google、OpenAI 或自定义提供商路由会忽略 OpenRouter 路由参数。

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