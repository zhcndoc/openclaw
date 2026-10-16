---
summary: "使用 OpenRouter 的统一 API 在 OpenClaw 中访问众多模型"
read_when:
  - "您需要一个 API 密钥来支持多个 LLM"
  - "您想通过 OpenClaw 中的 OpenRouter 运行模型"
  - "你想使用 OpenRouter 进行图像生成"
  - "你想使用 OpenRouter 进行音乐生成"
  - "你想使用 OpenRouter 进行视频生成"
title: "OpenRouter"
---

OpenRouter 将请求路由到一个 API 和一个密钥后面的多个模型。它与 OpenAI- 兼容，因此 OpenClaw 通过用于其他代理提供程序的相同 `openai-completions`- 风格传输与其进行通信。

## <a id="getting-started"></a> 入门

在私人聊天中，发送 `/login openrouter` 或从 `/login` 中选择 OpenRouter。选择 **使用 OpenRouter** 登录，在浏览器中批准访问，然后返回聊天。 OpenClaw 接收浏览器回调并保存凭证后报告成功。使用 `/login cancel` 取消待处理的登录。

登录即可保存访问权限，无需选择入门模型。如果当前模型限制隐藏了 OpenRouter 模型，请选择 **显示所有 OpenRouter 模型** 或 **保留当前限制**。无论哪种方式，凭证都会被保存。在 Control UI 中，使用 **Settings → 模型 → Connect** 进行相同的仅凭证流程，然后使用模型菜单从网关目录中选择模型。

聊天浏览器登录使用网关的托管 [Tailscale HTTPS 地址](/gateway/tailscale)。使用 Tailscale Serve，您的浏览器必须能够访问相同的 tailnet。如果没有可用的托管 HTTPS 地址，请启用服务并重试，或使用下面的 CLI 流程。回调不会让您登录到 Control UI。

Control UI 在托管的 HTTPS 地址或直接在本地网关的环回地址和端口上打开时自动接收返回。其他地址使用手动重定向完成。如果粘贴的输入不完整或无效，请在同一登录尝试中更正它并再次提交。

<Tabs>
  <Tab title="OAuth">
    <Steps>
      <Step id="run-oauth-onboarding" title="运行 OAuth 入门">
        ```bash
        openclaw onboard --auth-choice openrouter-oauth
        ```

        OpenClaw 打开 OpenRouter 的浏览器登录流程 （PKCE），将代码交换为 OpenRouter API 密钥，并将其存储在默认的 OpenRouter 身份验证配置文件中。在 remote/headless 主机上，OpenClaw 打印登录 URL 并要求您在登录后粘贴重定向 URL。
      </Step>
      <Step id="optional-switch-to-a-specific-model" title="（可选）切换到特定模型">
        引导默认使用 `openrouter/auto`。之后可选择具体模型：

        ```bash
        openclaw models set openrouter/<provider>/<model>
        ```

      </Step>
    </Steps>

  </Tab>
  <Tab id="api-key" title="API 密钥">
    <Steps>
      <Step id="get-your-api-key" title="获取您的 API 密钥">
        在 [openrouter.ai/keys](https://openrouter.ai/keys). 创建 API 密钥
      </Step>
      <Step id="run-api-key-onboarding" title="运行 API-key 登录">
        ```bash
        openclaw onboard --auth-choice openrouter-api-key
        ```
      </Step>
      <Step id="optional-switch-to-a-specific-model-1" title="（可选）切换到特定模型">
        引导默认使用 `openrouter/auto`。之后可选择具体模型：

        ```bash
        openclaw models set openrouter/<provider>/<model>
        ```

      </Step>
    </Steps>

  </Tab>
</Tabs>

## <a id="config-example"></a> 配置示例

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

## <a id="model-references"></a> 模型引用

<Note>
模型参考遵循 `openrouter/<provider>/<model>` 模式。有关 OpenRouter 路由的提供商和模型的完整列表，请参阅 [OpenRouter 的模型目录](https://openrouter.ai/models)。有关 OpenClaw 如何解析模型引用和故障转移，请参阅 [ 模型选择](/concepts/model-providers)。
</Note>

捆绑的入门模型丰富了非空的公共目录。失败的实时请求报告发现失败而不是替换这些行；成功的空响应保持为空：

| 模型引用                         | 笔记                        |
| --------------------------------- | ---------------------------- |
| `openrouter/auto`                 | OpenRouter 自动路由 |
| `openrouter/moonshotai/kimi-k2.6` | Kimi K2.6 通过 MoonshotAI     |
| `openrouter/moonshotai/kimi-k2.5` | Kimi K2.5 通过 MoonshotAI     |

任何其他 `openrouter/<provider>/<model>` 引用，包括 `openrouter/openrouter/fusion`（参见 [Fusion 路由器](#fusion-router)），都会根据 OpenRouter 的实时模型目录动态解析。

发现的模型使用 OpenRouter 宣传的工具支持。当模型的 `supported_parameters` 列表省略 `tools` 时，OpenClaw 会发送没有工具定义或工具选择的请求。没有该元数据的模型将保留默认的工具行为。

## <a id="image-generation"></a> 图像生成

OpenRouter 支持 `image_generate` 工具。将 OpenRouter 图像模型设置在 `agents.defaults.mediaModels.image` 下：

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

OpenClaw 将标准 OpenRouter 映像请求发送到专用映像 API （`POST /api/v1/images`）。 Gemini 图像模型还接收 `aspect_ratio` 和 `resolution` 提示，图像编辑将源图像作为 `input_references` 传递。生成的图像以 base64 （`b64_json`） 形式返回，并带有可选的 `media_type`；当 `media_type` 不存在时，OpenClaw 从字节中嗅探图像格式。

配置的自定义 OpenRouter `baseUrl` 目标保留现有的聊天完成图像路由，以便与不公开专用端点的代理兼容。对于较慢的模型，使用 `agents.defaults.mediaModels.image.timeoutMs`； `image_generate` 工具的每次调用 `timeoutMs` 仍然获胜。

## <a id="video-generation"></a> 视频生成

OpenRouter 可以通过其异步 `/videos` API 支持 `video_generate` 工具。在`agents.defaults.mediaModels.video`下设置一个OpenRouter视频模型：

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

OpenClaw 提交文本转视频和图像转视频作业，轮询返回的 `polling_url`，并从 OpenRouter 的 `unsigned_urls` 或作业内容端点下载完成的视频。参考图片默认为first/last-frame图片；标记为 `reference_image` 的图像将作为输入参考发送。捆绑的 `google/veo-3.1-fast` 默认支持 4/6/8 秒持续时间、`720P`/`1080P` 分辨率和 `16:9`/`9:16` 宽高比。不支持视频到视频：上游 API 仅接受文本和图像引用。

## <a id="music-generation"></a> 音乐生成

OpenRouter 可以通过聊天补全的音频输出支持 `music_generate` 工具。 在 `agents.defaults.mediaModels.music` 下设置一个 OpenRouter 音频模型：

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

打包的 OpenRouter 音乐提供方默认使用 `google/lyria-3-pro-preview` ，并且也提供 `google/lyria-3-clip-preview`。OpenClaw 会发送 `modalities: ["text", "audio"]`，流式接收响应，收集音频片段，并将结果保存为用于通道投递的生成媒体。Lyria 模型通过共享的 `music_generate image=...` 参数接受一张参考图像。 流式音频、转录保留以及派生的 SSE 事件封装都会受到 `agents.defaults.mediaMaxMb` 的限制（默认音频上限为 16 MB）。

## <a id="text-to-speech"></a> 文本转语音

OpenRouter 可以通过其 OpenAI- 兼容的 `/audio/speech` 端点充当 TTS 提供者。

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

如果未设置 `tts.providers.openrouter.apiKey`，TTS 将回退使用 `models.providers.openrouter.apiKey`，然后使用 `OPENROUTER_API_KEY`。

## <a id="speech-to-text-(inbound-audio)"></a><a id="speech-to-text-inbound-audio"></a> 语音转文本（入站音频）

OpenRouter 可以使用其 STT 端点 （`/audio/transcriptions`） 通过共享 `tools.media.audio` 路径转录入站 voice/audio 附件。这适用于将入站 voice/audio 转发到媒体理解预检的任何通道插件。

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

OpenClaw 会将 OpenRouter STT 请求作为 JSON 发送，并将 base64 音频放在 `input_audio` 下（OpenRouter 的 STT 契约），而不是作为 multipart 的 OpenAI 表单上传。

## <a id="fusion-router"></a> Fusion 路由器

OpenRouter Fusion 会将一个 OpenClaw 模型引用并行发送给多个 OpenRouter 模型，随后让 OpenRouter 对它们的回答进行裁决，并通过正常的 OpenRouter 端点返回一个最终响应。上游模型 slug 是 `openrouter/fusion`，因此 OpenClaw 模型引用同时包含 OpenClaw 的提供方前缀和上游 OpenRouter 命名空间：

```bash
openclaw models set openrouter/openrouter/fusion
```

配置Fusion的面板，通过模型的`params.extraBody`进行判断；这些字段直接转发到 OpenRouter 聊天完成请求正文。 Fusion 可与 OAuth 或 API-key 登录配合使用；如果您使用 OAuth，请省略下面的 `env.vars.OPENROUTER_API_KEY` 行。

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

Fusion 的设计速度较慢：OpenRouter 将提示分散到多个分析模型，然后运行 ​​judge/synthesis 步骤，因此延迟比直接的单模型请求要高。将其用于深思熟虑的高质量答案或升级路径，而不是作为对延迟敏感的默认设置。保持面板较小并选择更快的 analysis/judge 模型以获得更快的响应。

使用一次性本地调用测试已配置的引用：

```bash
openclaw infer model run --local \
  --model openrouter/openrouter/fusion \
  --prompt "Reply with exactly: FUSION_OK" \
  --json
```

## <a id="authentication-and-headers"></a> 身份验证和请求头

OpenRouter 使用来自你的 API key 的 Bearer token。OpenRouter OAuth 是一种 PKCE 登录流程，会签发一个 OpenRouter API key，因此 OpenClaw 会将结果存储在同一个 `openrouter:default` API-key 认证配置文件中，该配置文件也用于手动 API-key 设置。

要在现有安装中登录或轮换已存储的密钥，而无需重新运行完整的引导流程：

```bash
openclaw models auth login --provider openrouter --method oauth
openclaw models auth login --provider openrouter --method api-key
```

在向 OpenRouter 端点 （`openrouter.ai`） 发出请求时，OpenClaw 添加 OpenRouter 记录的应用程序属性标头。这适用于捆绑的 `openrouter` 提供程序以及 `baseUrl` 指向 OpenRouter 的自定义提供程序 ID：

| 请求头                    | 值                      |
| ------------------------- | -------------------------- |
| `HTTP-Referer`            | `https://openclaw.ai`      |
| `X-OpenRouter-Title`      | `OpenClaw`                 |
| `X-OpenRouter-Categories` | `personal-agent,cli-agent` |

<Warning>
如果您将 OpenRouter 提供程序重新指向某个其他代理或基础 URL，则 OpenClaw 会 **not** 注入那些 OpenRouter- 特定标头或 Anthropic 缓存标记。
</Warning>

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="response-caching" title="响应缓存">
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

    OpenClaw 发送 `X-OpenRouter-Cache: true` 和 `X-OpenRouter-Cache-TTL`（配置后）。 `responseCacheClear: true` 强制刷新当前请求并存储替换响应。接受 Snake_case 别名（`response_cache`、`response_cache_ttl_seconds`、`response_cache_clear`），不带 `Seconds` 后缀的 `responseCacheTtl` / `response_cache_ttl` 也是如此。 TTL 值被截断并限制为 1–86400 秒；非有限值将被忽略。

    这与提供程序提示缓存和 OpenRouter 的 Anthropic `cache_control` 标记是分开的。它仅适用于经过验证的 `openrouter.ai` 路由，不适用于自定义代理基本 URL。

  </Accordion>

  <Accordion id="anthropic-cache-markers" title="Anthropic 缓存标记">
    在已验证的 OpenRouter 路由上，Anthropic 模型引用会保留 OpenRouter 的 Anthropic `cache_control` 标记，以便在 system/developer 提示块上更好地复用提示缓存。
  </Accordion>

  <Accordion id="anthropic-reasoning-prefill" title="Anthropic 推理预填">
    在已验证的 OpenRouter 路由上，启用了推理的 Anthropic 模型引用会在请求到达 OpenRouter 之前删除末尾的 assistant 预填充轮次，以符合 Anthropic 的要求： 推理对话必须以 user 轮次结束。
  </Accordion>

  <Accordion id="thinking-reasoning-injection" title="思维/推理注入">
    OpenClaw 使用所选模型的广告推理工作来进行其思考选择和请求有效负载。需要推理的模型省略了关闭选择。代理轮流和独立完成共享这些控制和推理重放规则。在受支持的非 `auto` 路由上，OpenClaw 将选定的思维级别映射到 OpenRouter 代理推理负载。 `openrouter/auto` 和不受支持的模型提示会跳过该注入。过时的 `openrouter/hunter-alpha` 参考文献也会跳过它，因为 OpenRouter 可以在该退休路线的推理字段中返回最终答案文本。

    没有工作量选择器的模型显示 on/off 控件，或者在强制推理时 **始终打开**。这些模型无需付出大量努力即可接受二进制推理控制。省略思考请求会使他们的本机推理默认值保持不变；保留配置的推理预算。

  </Accordion>

  <Accordion id="deepseek-v4-reasoning-replay" title="DeepSeek V4 推理回放">
    在经过验证的 OpenRouter 路线上，`openrouter/deepseek/deepseek-v4-flash` 和 `openrouter/deepseek/deepseek-v4-pro` 会在重放的助理轮次中填充缺失的 `reasoning_content`，从而将 thinking/tool 对话保留在 DeepSeek V4 所需的后续形状中。 OpenClaw 为这些路由发送 OpenRouter- 支持的 `reasoning.effort` 值：`xhigh`/`max` 映射到 `xhigh`，所有其他非关闭级别映射到 `high`。 `/think off` 显式发送 `reasoning.effort: "none"` 并删除推理重播字段，而不是回退到提供程序的推理默认值。
  </Accordion>

  <Accordion id="openai-only-request-shaping" title="OpenAI-仅请求整形">
    OpenRouter 通过代理样式的 OpenAI- 兼容路径运行，因此本机 OpenAI- 仅请求整形（例如 `serviceTier`）、响应 `store`、OpenAI 推理兼容负载和提示缓存提示不会转发。
  </Accordion>

  <Accordion id="gemini-backed-routes" title="Gemini-支持的路由">
    Gemini-支持的OpenRouter引用保留在代理Gemini路径上：OpenClaw在那里保留Gemini思想签名卫生，但不启用本机Gemini重放验证或引导重写。
  </Accordion>

  <Accordion id="provider-routing-metadata" title="提供商路由元数据">
    OpenRouter 支持一个用于底层提供商路由的 `provider` 请求对象。通过 `models.providers.openrouter.params.provider` 为所有 OpenRouter 文本模型请求配置默认策略：

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

    OpenClaw 会将该对象作为请求 `provider` 负载转发给 OpenRouter。请使用 OpenRouter 文档中的 snake_case 字段，包括 `sort`、 `only`、`ignore`、`order`、`allow_fallbacks`、`require_parameters`、 `data_collection`、`quantizations`、`max_price`、`preferred_max_latency`、 `preferred_min_throughput`、`zdr` 和 `enforce_distillable_text`。

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

    这只适用于 OpenRouter chat-completions 路由。直接的 Anthropic、 Google、OpenAI 或自定义提供商路由会忽略 OpenRouter 路由参数。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    agents、models 和 providers 的完整配置参考。
  </Card>
  <Card title="阿尔西" href="/providers/arcee" icon="server">
    Arcee 模型可使用 OpenRouter 密钥访问。
  </Card>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    共享音乐工具参数和提供商选择。
  </Card>
</CardGroup>
