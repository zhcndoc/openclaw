---
summary: "Google Gemini 设置（API 密钥 + OAuth，图像生成，媒体理解，TTS，网页搜索）"
title: "Google（Gemini）"
read_when:
  - 你想在 OpenClaw 中使用 Google Gemini 模型
  - 你需要 API 密钥或 OAuth 身份验证流程
---

Google 插件通过 Google AI Studio 提供对 Gemini 模型的访问，同时还提供图像生成、媒体理解（图像/音频/视频）、文本转语音，以及通过 Gemini Grounding 实现的网页搜索。

- Provider: `google`
- Auth: `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- API: Google Gemini API
- Runtime option: `agentRuntime.id: "google-gemini-cli"` 复用 Gemini CLI OAuth，同时保持模型引用为规范的 `google/*`。

## 开始使用

选择你偏好的身份验证方式并按照设置步骤操作。

<Tabs>
  <Tab title="API 密钥">
    **最佳适用场景：** 通过 Google AI Studio 进行标准 Gemini API 访问。

    <Steps>
      <Step title="Get an API key">
        Create a free key in [Google AI Studio](https://aistudio.google.com/apikey).
      </Step>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice gemini-api-key
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --non-interactive \
          --mode local \
          --auth-choice gemini-api-key \
          --gemini-api-key "$GEMINI_API_KEY"
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "google/gemini-3.1-pro-preview" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    <Tip>
    `GEMINI_API_KEY` 和 `GOOGLE_API_KEY` 都可接受。请使用你已经配置好的那个。
    </Tip>

    With a configured API key, OpenClaw refreshes Google AI Studio's text-model
    catalog from the Gemini `models.list` API. Newly released Gemini 3 Pro, Flash,
    and Flash-Lite variants therefore appear in
    `openclaw models list --provider google` without waiting for an OpenClaw
    release. If discovery is unavailable, OpenClaw keeps the bundled fallback
    catalog.

  </Tab>

  <Tab title="Gemini CLI (OAuth)">
    **Best for:** signing in with your Google account through Gemini CLI OAuth instead of using a separate API key.

    <Warning>
    `google-gemini-cli` provider 是一个非官方集成。部分用户
    报告在以这种方式使用 OAuth 时会出现账户限制。请自行承担风险使用。
    </Warning>

    <Steps>
      <Step title="安装 Gemini CLI">
        本地的 `gemini` 命令必须可在 `PATH` 中找到。

        ```bash
        # Homebrew
        brew install gemini-cli

        # 或 npm
        npm install -g @google/gemini-cli
        ```

        OpenClaw 同时支持 Homebrew 安装和全局 npm 安装，包括
        常见的 Windows/npm 布局。
      </Step>
      <Step title="通过 OAuth 登录">
        ```bash
        openclaw models auth login --provider google-gemini-cli --set-default
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    - 默认模型: `google/gemini-3.1-pro-preview`
    - Runtime: `google-gemini-cli`
    - 别名: `gemini-cli`

    Gemini 3.1 Pro 的 Gemini API model id 是 `gemini-3.1-pro-preview`。OpenClaw 出于便利性接受更短的 `google/gemini-3.1-pro` 作为别名，并在 provider 调用前将其规范化。

    **环境变量：**

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID` / `GEMINI_CLI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET` / `GEMINI_CLI_OAUTH_CLIENT_SECRET`

    <Note>
    如果 Gemini CLI OAuth 请求在登录后失败，请在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或
    `GOOGLE_CLOUD_PROJECT_ID`，然后重试。
    </Note>

    <Note>
    如果登录在浏览器流程开始前就失败，请确保本地 `gemini`
    命令已安装并位于 `PATH` 中。
    </Note>

    Onboarding auto-detection lists an existing Gemini CLI login but never
    auto-tests it because Gemini CLI has no tool-free probe. Choose Gemini CLI
    OAuth or a Gemini API key to continue.

    `google-gemini-cli/*` model refs are legacy compatibility aliases. New
    configs should use `google/*` model refs plus the `google-gemini-cli`
    runtime when they want local Gemini CLI execution.

  </Tab>
</Tabs>

<Note>
`google/gemini-3-pro-preview` 已于 2026-03-09 停用；请改用 `google/gemini-3.1-pro-preview`。重新运行 Gemini API key 设置（`openclaw onboard --auth-choice gemini-api-key` 或 `openclaw models auth login --provider google`）会将已过期配置的默认模型改写为当前模型。
</Note>

## 功能

| 功能                    | 支持情况                      |
| ---------------------- | ----------------------------- |
| 聊天补全               | 是                           |
| 图像生成               | 是                           |
| 音乐生成               | 是                           |
| 文本转语音             | 是                           |
| 实时语音               | 是（Google Live API）         |
| 图像理解               | 是                           |
| 音频转录               | 是                           |
| 视频理解               | 是                           |
| 网络搜索（Grounding）  | 是                           |
| 思考/推理              | 是（Gemini 2.5+ / Gemini 3+） |
| Gemma 4 模型          | 是                           |

## Web search

捆绑的 `gemini` 网页搜索 provider 使用 Gemini Google Search grounding。
在 `plugins.entries.google.config.webSearch` 下配置专用搜索密钥，
或者让它在 `GEMINI_API_KEY` 后复用 `models.providers.google.apiKey`：

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            apiKey: "AIza...", // 如果已设置 GEMINI_API_KEY 或 models.providers.google.apiKey，则为可选项
            baseUrl: "https://generativelanguage.googleapis.com/v1beta", // 回退到 models.providers.google.baseUrl
            model: "gemini-2.5-flash",
          },
        },
      },
    },
  },
}
```

凭据优先级依次为专用的 `webSearch.apiKey`、`GEMINI_API_KEY`，
然后是 `models.providers.google.apiKey`。`webSearch.baseUrl` 是可选的，
用于运营方代理或兼容的 Gemini API 端点；如果省略，
Gemini 网页搜索会复用 `models.providers.google.baseUrl`。参见
[Gemini search](/tools/gemini-search) 了解 provider 特定的工具行为。

<Tip>
Gemini 3 模型使用 `thinkingLevel` 而不是 `thinkingBudget`。OpenClaw 将
Gemini 3、Gemini 3.1 和 `gemini-*-latest` 别名的推理控制映射到
`thinkingLevel`，因此默认/低延迟运行不会发送被禁用的
`thinkingBudget` 值。

`/think adaptive` 保留 Google 的动态思考语义，而不是选择一个
固定的 OpenClaw 级别。Gemini 3 和 Gemini 3.1 会省略固定的 `thinkingLevel`，以便
Google 可以自行选择级别；Gemini 2.5 会发送 Google 的动态哨兵值
`thinkingBudget: -1`。

Gemma 4 模型（例如 `gemma-4-26b-a4b-it`）支持思考模式。OpenClaw 会将
`thinkingBudget` 重写为 Gemma 4 支持的 Google `thinkingLevel`。
将思考设置为 `off` 会保留禁用思考的状态，而不是映射到
`MINIMAL`。

Gemini 2.5 Pro 仅在思考模式下工作，并且会拒绝显式的
`thinkingBudget: 0`；OpenClaw 会在 Gemini 2.5 Pro 请求中去除该值，
而不是将其发送出去。
</Tip>

## 图像生成

The bundled `google` image-generation provider defaults to
`google/gemini-3.1-flash-image`.

- Also supports `google/gemini-3-pro-image`
- Generate: up to 4 images per request
- Edit mode: enabled, up to 5 input images
- Geometry controls: `size`, `aspectRatio`, and `resolution`

要将 Google 设为默认图像 provider：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "google/gemini-3.1-flash-image",
      },
    },
  },
}
```

<Note>
共享工具参数、provider 选择和故障切换行为请参见 [图像生成](/tools/image-generation)。
</Note>

## 视频生成

内置的 `google` 插件还通过共享的
`video_generate` 工具注册视频生成。

- 默认视频模型: `google/veo-3.1-fast-generate-preview`
- 模式：文本转视频、图像转视频，以及单视频参考流程
- 支持 `aspectRatio`（`16:9`、`9:16`）和 `resolution`（`720P`、`1080P`）；Veo 目前不支持音频输出
- 支持时长：**4、6 或 8 秒**（其他值会自动调整到最接近的允许值）

要将 Google 设为默认视频 provider：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
      },
    },
  },
}
```

<Note>
共享工具参数、provider 选择和故障切换行为请参见 [视频生成](/tools/video-generation)。
</Note>

## 音乐生成

内置的 `google` 插件还通过共享的
`music_generate` 工具注册音乐生成。

- 默认音乐模型: `google/lyria-3-clip-preview`
- 也支持 `google/lyria-3-pro-preview`
- 提示控制：`lyrics` 和 `instrumental`
- 输出格式：默认 `mp3`，`google/lyria-3-pro-preview` 还支持 `wav`
- 参考输入：最多 10 张图片
- 基于会话的运行会通过共享的任务/状态流程进行分离，包括 `action: "status"`

要将 Google 设为默认音乐 provider：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
      },
    },
  },
}
```

<Note>
共享工具参数、provider 选择和故障切换行为请参见 [音乐生成](/tools/music-generation)。
</Note>

## 文本转语音

内置的 `google` 语音 provider 使用 Gemini API 的 TTS 路径，
并采用 `gemini-3.1-flash-tts-preview`。

- Default voice: `Kore`
- Auth: `tts.providers.google.apiKey`, `models.providers.google.apiKey`, `GEMINI_API_KEY`, or `GOOGLE_API_KEY`
- Output: WAV for regular TTS attachments, Opus for voice-note targets, PCM for Talk/telephony
- Voice-note output: Google PCM is wrapped as WAV and transcoded to 48 kHz Opus with `ffmpeg`

Google 的批量 Gemini TTS 路径会在完成的 `generateContent` 响应中返回生成的音频。
对于最低延迟的语音对话，请使用由 Gemini Live API 支持的 Google 实时语音 provider，
而不是批量 TTS。

要将 Google 设为默认 TTS provider：

```json5
{
  tts: {
    auto: "always",
    provider: "google",
    providers: {
      google: {
        model: "gemini-3.1-flash-tts-preview",
        speakerVoice: "Kore",
        audioProfile: "Speak professionally with a calm tone.",
      },
    },
  },
}
```

Gemini API TTS 使用自然语言提示来控制风格。将
`audioProfile` 设置为在朗读文本之前附加一个可复用的风格提示。当前提示文本中提到特定姓名说话人时，设置
`speakerName`。

Gemini API TTS 还接受文本中的带方括号的富有表现力音频标签，例如 `[whispers]` 或 `[laughs]`。若要在发送给 TTS 的同时让这些标签不出现在可见聊天回复中，请将它们放入
`[[tts:text]]...[[/tts:text]]` 块中：

```text
这里是干净的回复文本。

[[tts:text]][whispers] 这里是朗读版本。[[/tts:text]]
```

<Note>
受限于 Gemini API 的 Google Cloud Console API key 对此
provider 是有效的。这不是独立的 Cloud Text-to-Speech API 路径。
</Note>

## 实时语音

内置的 `google` 插件注册了一个由
Gemini Live API 支持的实时语音 provider，用于后端音频桥接，例如 Voice Call 和 Google Meet。

| 设置                  | 配置路径                                                          | 默认值                                                                               |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Model                 | `plugins.entries.voice-call.config.realtime.providers.google.model` | `gemini-3.1-flash-live-preview`                                                       |
| Voice                 | `...google.voice`                                                   | `Kore`                                                                                |
| Temperature           | `...google.temperature`                                             | (unset)                                                                               |
| VAD start sensitivity | `...google.startSensitivity`                                          | (unset)                                                                               |
| VAD end sensitivity   | `...google.endSensitivity`                                            | (unset)                                                                               |
| Silence duration      | `...google.silenceDurationMs`                                       | (unset)                                                                               |
| Activity handling     | `...google.activityHandling`                                        | Google 默认，`start-of-activity-interrupts`                                        |
| Turn coverage         | `...google.turnCoverage`                                            | Google 默认，`audio-activity-and-all-video`                                        |
| Disable auto VAD      | `...google.automaticActivityDetectionDisabled`                      | `false`                                                                               |
| Session resumption    | `...google.sessionResumption`                                       | `true`                                                                                |
| Context compression   | `...google.contextWindowCompression`                                | `true`                                                                                |
| API key               | `...google.apiKey`                                                  | 回退到 `models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` |

Voice Call 实时配置示例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          realtime: {
            enabled: true,
            provider: "google",
            providers: {
              google: {
                model: "gemini-3.1-flash-live-preview",
                speakerVoice: "Kore",
                activityHandling: "start-of-activity-interrupts",
                turnCoverage: "audio-activity-and-all-video",
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>
Google Live API 使用双向音频和函数调用，并通过 WebSocket 进行通信。
OpenClaw 会将电话/Meet 桥接音频适配为 Gemini 的 PCM Live API 流，并
保持工具调用遵循共享的实时语音契约。除非你需要采样变化，否则保留 `temperature`
未设置；OpenClaw 会省略非正值，因为 Google Live 在 `temperature: 0` 时可能返回无音频的转录。
Gemini API 转录在没有 `languageCodes` 的情况下启用；当前 Google
SDK 会拒绝此 API 路径上的语言代码提示。
</Note>

<Note>
Gemini 3.1 Live 接受通过实时输入传入的会话文本，并使用
顺序函数调用。OpenClaw 会为此模型省略较旧的 `NON_BLOCKING`、函数
响应调度和情感对话字段。优先使用 `thinkingLevel`；已配置的正值 `thinkingBudget`
会映射到最接近的受支持级别，而 `-1` 会保留 Google 的默认值。参见
[Gemini Live 能力对比](https://ai.google.dev/gemini-api/docs/live-api/capabilities)。
</Note>

<Note>
Control UI Talk supports Google Live browser sessions with constrained one-use
tokens. In Video Talk, the browser sends bounded JPEG frames directly to
Google Live at the provider's maximum of one frame per second. The
`describe_view` function reports whether that camera stream is active.
Camera frames do not pass through the Gateway. Backend-only realtime voice
providers can also run through the generic Gateway relay transport, which
keeps provider credentials on the Gateway.
</Note>

对于维护者的实时验证，请运行
`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`.
The smoke also covers OpenAI backend/WebRTC paths; the Google leg mints the same
constrained Live API token shape used by Control UI Talk, opens the browser
WebSocket endpoint, sends the initial setup payload plus a JPEG frame, and
verifies a text response and `describe_view` function roundtrip.

## 高级配置

<AccordionGroup>
  <Accordion title="直接复用 Gemini 缓存">
    对于直接的 Gemini API 运行（`api: "google-generative-ai"`），OpenClaw
    会将已配置的 `cachedContent` 句柄传递给 Gemini 请求。

    - 使用 `cachedContent` 或旧版 `cached_content`，按模型或全局范围配置参数
    - 更具体作用域中的参数（模型级优先于全局）始终生效。
      在同一作用域内，如果两个键都设置了，则 `cached_content` 生效。
      每个作用域只使用一个键，以避免意外。
    - 示例值：`cachedContents/prebuilt-context`
    - Gemini 缓存命中用量会从上游的 `cachedContentTokenCount`
      规范化为 OpenClaw 的 `cacheRead`

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "google/gemini-2.5-pro": {
              params: {
                cachedContent: "cachedContents/prebuilt-context",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Gemini CLI 使用说明">
    当使用 `google-gemini-cli` OAuth 提供方时，OpenClaw 默认使用 Gemini CLI 的
    `stream-json` 输出，并从最终的 `stats` 负载中规范化用量。旧版的 `--output-format json`
    覆盖方式仍会使用 JSON 解析器。

    - 流式回复文本来自 assistant 的 `message` 事件。
    - 对于旧版 JSON 输出，回复文本来自 CLI JSON 的 `response` 字段。
    - 当 CLI 的 `usage` 为空时，用量会回退到 `stats`。
    - `stats.cached` 会被规范化为 OpenClaw 的 `cacheRead`。
    - 如果缺少 `stats.input`，OpenClaw 会根据 `stats.input_tokens - stats.cached`
      推导输入 token 数。

  </Accordion>

  <Accordion title="环境和守护进程设置">
    如果 Gateway 以守护进程方式运行（launchd/systemd），请确保
    `GEMINI_API_KEY` 对该进程可用（例如，放在 `~/.openclaw/.env` 中或通过
    `env.shellEnv` 提供）。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用以及故障切换行为。
  </Card>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享的图像工具参数和提供方选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享的视频工具参数和提供方选择。
  </Card>
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    共享的音乐工具参数和提供方选择。
  </Card>
</CardGroup>
