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

OpenRouter 将请求路由到多个模型，统一使用一个 API 和一个密钥。它与 OpenAI 兼容，因此 OpenClaw 通过与其他代理提供商相同的 `openai-completions` 风格传输与它通信。

## 开始使用

<Tabs>
  <Tab title="OAuth">
    <Steps>
      <Step title="运行 OAuth 引导">
        ```bash
        openclaw onboard --auth-choice openrouter-oauth
        ```

        OpenClaw 会打开 OpenRouter 的浏览器登录流程（PKCE），将
        代码换取为 OpenRouter API 密钥，并将其存储在默认的
        OpenRouter 认证配置文件中。在远程/无头主机上，OpenClaw 会打印
        登录 URL，并在你登录后要求你粘贴重定向 URL。
      </Step>
      <Step title="（可选）切换到特定模型">
        引导默认使用 `openrouter/auto`。之后可选择具体模型：

        ```bash
        openclaw models set openrouter/<provider>/<model>
        ```

      </Step>
    </Steps>

  </Tab>
  <Tab title="API 密钥">
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
  env: { vars: { OPENROUTER_API_KEY: "sk-or-..." } },
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

内置备用模型，仅在无法进行实时目录发现时使用：

| 模型引用                          | 说明                         |
| --------------------------------- | ---------------------------- |
| `openrouter/auto`                 | OpenRouter 自动路由           |
| `openrouter/moonshotai/kimi-k2.6` | 通过 MoonshotAI 提供的 Kimi K2.6 |
| `openrouter/moonshotai/kimi-k2.5` | 通过 MoonshotAI 提供的 Kimi K2.5 |

任何其他 `openrouter/<provider>/<model>` 引用，包括
`openrouter/openrouter/fusion`（参见 [Fusion 路由器](#fusion-router)），都会
根据 OpenRouter 的实时模型目录动态解析。

## 图像生成

OpenRouter 支持 `image_generate` 工具。将 OpenRouter 图像模型设置在
`agents.defaults.mediaModels.image` 下：

```json5
{
  env: { vars: { OPENROUTER_API_KEY: "sk-or-..." } },
  agents: {
    defaults: {
      mediaModels: {
        image: {
          primary: "openrouter/google/gemini-3.1-flash-image-preview",
          timeoutMs: 180000,
        },
      },
    },
  },
}
```

OpenClaw 使用带有 `modalities: ["image", "text"]` 的 OpenRouter 聊天补全图像 API
发送图像请求。Gemini 图像模型还会通过 OpenRouter 的 `image_config` 接收
`aspectRatio` 和 `resolution` 提示；其他图像模型则不会。对于响应较慢的模型，请使用
`agents.defaults.mediaModels.image.timeoutMs`；`image_generate` 工具每次调用的
`timeoutMs` 仍具有更高优先级。

## 视频生成

OpenRouter 可以通过其异步的
`/videos` API 支持 `video_generate` 工具。在
`agents.defaults.mediaModels.video` 下设置 OpenRouter 视频模型：

```json5
{
  env: { vars: { OPENROUTER_API_KEY: "sk-or-..." } },
  agents: {
    defaults: {
      mediaModels: {
        video: {
          primary: "openrouter/google/veo-3.1-fast",
        },
      },
    },
  },
}
```

OpenClaw 将提交文生视频和图生视频任务，轮询返回的
`polling_url`，并从 OpenRouter 的 `unsigned_urls` 或任务内容端点下载已完成的视频。默认情况下，参考图像使用首帧/末帧图像；标记为 `reference_image` 的图像将作为输入参考发送。内置的 `google/veo-3.1-fast` 默认支持 4/6/8 秒时长、`720P`/`1080P` 分辨率以及 `16:9`/`9:16` 宽高比。不支持视频到视频：上游 API 仅接受文本和图像参考。

## 音乐生成

OpenRouter 可以通过聊天补全的音频输出支持 `music_generate` 工具。
在 `agents.defaults.mediaModels.music` 下设置一个 OpenRouter 音频模型：

```json5
{
  env: { vars: { OPENROUTER_API_KEY: "sk-or-..." } },
  agents: {
    defaults: {
      mediaModels: {
        music: {
          primary: "openrouter/google/lyria-3-pro-preview",
          timeoutMs: 180000,
        },
      },
    },
  },
}
```

打包的 OpenRouter 音乐提供方默认使用 `google/lyria-3-pro-preview`
，并且也提供 `google/lyria-3-clip-preview`。OpenClaw 会发送 `modalities:
["text", "audio"]`，流式接收响应，收集音频片段，并将结果保存
为用于通道投递的生成媒体。Lyria 模型通过共享的 `music_generate image=...` 参数接受一张参考图像。
流式音频、转录保留以及派生的 SSE 事件封装都会受到 `agents.defaults.mediaMaxMb`
的限制（默认音频上限为 16 MB）。

## 文本转语音

OpenRouter 可以通过其与 OpenAI 兼容的
`/audio/speech` 端点充当 TTS 提供商。

```json5
{
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
}
```

如果未设置 `tts.providers.openrouter.apiKey`，TTS 将回退使用
`models.providers.openrouter.apiKey`，然后使用 `OPENROUTER_API_KEY`。

## 语音转文本（入站音频）

OpenRouter 可以通过共享的
`tools.media.audio` 路径，使用其 STT 端点（`/audio/transcriptions`）转写入站语音/音频附件。
这适用于任何将入站语音/音频转发到
媒体理解预检的通道插件。

```json5
{
  tools: {
    media: {
      models: [
        {
          provider: "openrouter",
          model: "openai/whisper-large-v3-turbo",
          capabilities: ["audio"],
        },
      ],
      audio: { enabled: true },
    },
  },
}
```

OpenClaw 会将 OpenRouter STT 请求作为 JSON 发送，并将 base64 音频放在
`input_audio` 下（OpenRouter 的 STT 契约），而不是作为 multipart 的 OpenAI 表单
上传。

## Fusion 路由器

OpenRouter Fusion 会将一个 OpenClaw 模型引用并行发送给多个 OpenRouter 模型，随后让 OpenRouter 对它们的回答进行裁决，并通过正常的 OpenRouter 端点返回一个最终响应。上游模型 slug 是
`openrouter/fusion`，因此 OpenClaw 模型引用同时包含 OpenClaw 的提供方前缀和上游 OpenRouter 命名空间：

```bash
openclaw models set openrouter/openrouter/fusion
```

通过模型的 `params.extraBody` 配置 Fusion 的面板和裁判；
这些字段会直接转发到 OpenRouter 聊天补全请求体中。Fusion 同时支持 OAuth 或 API 密钥接入；如果使用 OAuth，请省略下面的
`env.vars.OPENROUTER_API_KEY` 行。

```json5
{
  env: { vars: { OPENROUTER_API_KEY: "sk-or-..." } },
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

`analysis_models` 是并行面板；Fusion 插件配置中的 `model` 是裁判模型。不要在普通 agent/chat 轮次中将顶层 `tool_choice` 设为 `"required"` 来尝试强制使用 Fusion：OpenClaw 的轮次可能包含其自身的工具定义，而顶层 required tool choice 可能会选中其中某个工具，而不是 Fusion 路由器。当前置入此 Fusion 插件配置时，OpenClaw 会添加一条经过清理的系统提示注释，列出已配置的分析模型和裁判模型，因此 agent 可以回答关于其自身 Fusion 面板的问题。其他 `extraBody` 字段不会被复制到提示中。

Fusion 的设计本身就更慢：OpenRouter 会将提示分发到多个分析模型，然后执行裁判/综合步骤，因此延迟会高于直接的单模型请求。请将其用于有意的、高质量回答或升级路径，而不是对延迟敏感的默认选项。保持面板精简，并选择更快的分析/裁判模型以获得更快响应。

使用一次性本地调用测试已配置的引用：

```bash
openclaw infer model run --local \
  --model openrouter/openrouter/fusion \
  --prompt "Reply with exactly: FUSION_OK" \
  --json
```

## 身份验证和请求头

OpenRouter 使用来自你的 API key 的 Bearer token。OpenRouter OAuth 是一种 PKCE
登录流程，会签发一个 OpenRouter API key，因此 OpenClaw 会将结果存储在
同一个 `openrouter:default` API-key 认证配置文件中，该配置文件也用于手动 API-key
设置。

要在现有安装中登录或轮换已存储的密钥，而无需重新运行
完整的引导流程：

```bash
openclaw models auth login --provider openrouter --method oauth
openclaw models auth login --provider openrouter --method api-key
```

在已验证的 OpenRouter 请求（`https://openrouter.ai/api/v1`）中，OpenClaw 会添加
OpenRouter 文档中定义的应用归因请求头：

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
    OpenRouter 响应缓存是可选启用的。按模型单独开启：

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

    OpenClaw 会发送 `X-OpenRouter-Cache: true`，并在配置后发送
    `X-OpenRouter-Cache-TTL`。`responseCacheClear: true` 会强制刷新
    当前请求并存储替换后的响应。也接受 snake_case 别名（`response_cache`、
    `response_cache_ttl_seconds`、`response_cache_clear`），以及不带
    `Seconds` 后缀的 `responseCacheTtl` / `response_cache_ttl`。

    这与提供商提示缓存以及 OpenRouter 的 Anthropic `cache_control`
    标记不同。它只适用于已验证的 `openrouter.ai` 路由，不适用于自定义代理基础 URL。

  </Accordion>

  <Accordion title="Anthropic 缓存标记">
    在已验证的 OpenRouter 路由上，Anthropic 模型引用会保留 OpenRouter 的
    Anthropic `cache_control` 标记，以便在 system/developer 提示块上更好地复用提示缓存。
  </Accordion>

  <Accordion title="Anthropic 推理预填充">
    在已验证的 OpenRouter 路由上，启用了推理的 Anthropic 模型引用会在请求到达
    OpenRouter 之前删除末尾的 assistant 预填充轮次，以符合 Anthropic 的要求：
    推理对话必须以 user 轮次结束。
  </Accordion>

  <Accordion title="思考 / 推理注入">
    在受支持的非 `auto` 路由上，OpenClaw 会将所选思考级别映射到 OpenRouter 代理推理负载。
    `openrouter/auto` 和不受支持的模型提示会跳过该注入。过时的 `openrouter/hunter-alpha`
    引用也会跳过，因为 OpenRouter 可能会在该已停用路由的推理字段中返回最终答案文本。
  </Accordion>

  <Accordion title="DeepSeek V4 推理回放">
    在已验证的 OpenRouter 路由上，`openrouter/deepseek/deepseek-v4-flash` 和
    `openrouter/deepseek/deepseek-v4-pro` 会在回放的 assistant 轮次中补全缺失的 `reasoning_content`，
    使思考/工具对话保持为 DeepSeek V4 所要求的后续形状。OpenClaw 会为这些路由发送
    OpenRouter 支持的 `reasoning.effort` 值：`xhigh`/`max` 映射为 `xhigh`，
    其他所有非 off 级别都映射为 `high`。
  </Accordion>

  <Accordion title="仅 OpenAI 的请求形状处理">
    OpenRouter 通过代理式的 OpenAI 兼容路径运行，因此不会转发诸如 `serviceTier`、Responses 的 `store`、
    OpenAI 推理兼容负载以及提示缓存提示等仅 OpenAI 的原生请求形状处理。
  </Accordion>

  <Accordion title="Gemini 支持的路由">
    基于 Gemini 的 OpenRouter 引用会保留在代理 Gemini 路径上：OpenClaw 会在此保留 Gemini 思考签名清理，
    但不会启用原生 Gemini 回放验证或 bootstrap 重写。
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

    每个模型的参数会覆盖全局提供商路由对象：

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