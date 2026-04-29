---
summary: "Google Gemini 设置（API 密钥 + OAuth，图像生成，媒体理解，TTS，网页搜索）"
title: "Google（Gemini）"
read_when:
  - 你想在 OpenClaw 中使用 Google Gemini 模型
  - 你需要 API 密钥或 OAuth 身份验证流程
---

Google 插件通过 Google AI Studio 提供对 Gemini 模型的访问，并通过
Gemini Grounding 提供图像生成、媒体理解（图像/音频/视频）、文本转语音和网页搜索。

- Provider: `google`
- Auth: `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- API: Google Gemini API
- Runtime option: `agents.defaults.agentRuntime.id: "google-gemini-cli"`
  复用 Gemini CLI OAuth，同时保持模型引用为规范化的 `google/*`。

## 开始使用

选择你偏好的身份验证方式并按照设置步骤操作。

<Tabs>
  <Tab title="API key">
    **最佳适用场景：** 通过 Google AI Studio 进行标准 Gemini API 访问。

    <Steps>
      <Step title="运行引导">
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
    环境变量 `GEMINI_API_KEY` 和 `GOOGLE_API_KEY` 都可以接受。请使用你已经配置好的那个。
    </Tip>

  </Tab>

  <Tab title="Gemini CLI (OAuth)">
    **最佳适用场景：** 通过 PKCE OAuth 复用现有的 Gemini CLI 登录，而不是单独使用 API 密钥。

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

        # or npm
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

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

    （或 `GEMINI_CLI_*` 变体。）

    <Note>
    如果 Gemini CLI OAuth 请求在登录后失败，请在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或
    `GOOGLE_CLOUD_PROJECT_ID`，然后重试。
    </Note>

    <Note>
    如果登录在浏览器流程开始前就失败，请确保本地 `gemini`
    命令已安装并位于 `PATH` 中。
    </Note>

    `google-gemini-cli/*` model refs 是旧版兼容别名。新的
    配置在需要本地 Gemini CLI 执行时，应使用 `google/*` model refs，并配合
    `google-gemini-cli` runtime。

  </Tab>
</Tabs>

## 功能支持

| 功能                    | 支持情况                      |
| ---------------------- | ----------------------------- |
| Chat completions       | Yes                           |
| Image generation       | Yes                           |
| Music generation       | Yes                           |
| Text-to-speech         | Yes                           |
| Realtime voice         | Yes (Google Live API)         |
| Image understanding    | Yes                           |
| Audio transcription    | Yes                           |
| Video understanding    | Yes                           |
| Web search (Grounding) | Yes                           |
| Thinking/reasoning     | Yes (Gemini 2.5+ / Gemini 3+) |
| Gemma 4 models         | Yes                           |

<Tip>
Gemini 3 模型使用 `thinkingLevel` 而不是 `thinkingBudget`。OpenClaw 将
Gemini 3、Gemini 3.1 和 `gemini-*-latest` 别名的推理控制映射到
`thinkingLevel`，因此默认/低延迟运行不会发送被禁用的
`thinkingBudget` 值。

`/think adaptive` 保留 Google 的动态思考语义，而不是选择一个
固定的 OpenClaw 级别。Gemini 3 和 Gemini 3.1 会省略固定的 `thinkingLevel`，以便
Google 可以自行选择级别；Gemini 2.5 会发送 Google 的动态哨兵值
`thinkingBudget: -1`。

Gemma 4 模型（例如 `gemma-4-26b-a4b-it`）支持思考模式。OpenClaw
会将 `thinkingBudget` 重写为 Gemma 4 支持的 Google `thinkingLevel`。将思考设置为 `off` 时，会保留禁用思考状态，而不是映射到
`MINIMAL`。
</Tip>

## 图像生成

内置的 `google` 图像生成 provider 默认使用
`google/gemini-3.1-flash-image-preview`。

- 也支持 `google/gemini-3-pro-image-preview`
- 生成：每次请求最多 4 张图片
- 编辑模式：已启用，最多 5 张输入图片
- 形状控制：`size`、`aspectRatio` 和 `resolution`

要将 Google 设为默认图像 provider：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "google/gemini-3.1-flash-image-preview",
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
- 支持 `aspectRatio`、`resolution` 和 `audio`
- 当前时长限制：**4 到 8 秒**

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

- 默认语音: `Kore`
- Auth: `messages.tts.providers.google.apiKey`、`models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- 输出：常规 TTS 附件为 WAV，语音便笺目标为 Opus，Talk/电话场景为 PCM
- 语音便笺输出：Google PCM 会被包装为 WAV，并通过 `ffmpeg` 转码为 48 kHz Opus

要将 Google 设为默认 TTS provider：

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          model: "gemini-3.1-flash-tts-preview",
          voiceName: "Kore",
          audioProfile: "以平静的语气专业地表达。",
        },
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
| 模型                 | `plugins.entries.voice-call.config.realtime.providers.google.model` | `gemini-2.5-flash-native-audio-preview-12-2025`                                       |
| 语音                 | `...google.voice`                                                   | `Kore`                                                                                |
| 温度                 | `...google.temperature`                                             | (unset)                                                                               |
| VAD 开始敏感度       | `...google.startSensitivity`                                        | (unset)                                                                               |
| VAD 结束敏感度       | `...google.endSensitivity`                                          | (unset)                                                                               |
| 静音时长             | `...google.silenceDurationMs`                                       | (unset)                                                                               |
| 活动处理             | `...google.activityHandling`                                        | Google default, `start-of-activity-interrupts`                                        |
| 回合覆盖             | `...google.turnCoverage`                                            | Google default, `only-activity`                                                       |
| 禁用自动 VAD         | `...google.automaticActivityDetectionDisabled`                      | `false`                                                                               |
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
                model: "gemini-2.5-flash-native-audio-preview-12-2025",
                voice: "Kore",
                activityHandling: "start-of-activity-interrupts",
                turnCoverage: "only-activity",
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
Control UI Talk 支持带受限一次性令牌的 Google Live 浏览器会话。
仅后端的实时语音 provider 也可以通过通用的
Gateway relay transport 运行，这会将 provider 凭据保留在 Gateway 上。
</Note>

对于维护者的实时验证，请运行
`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`。
Google 这一路会生成与 Control
UI Talk 使用的相同受限 Live API 令牌格式，打开浏览器 WebSocket 端点，发送初始设置负载，
并等待 `setupComplete`。

## 高级配置

<AccordionGroup>
  <Accordion title="直接复用 Gemini 缓存">
    对于直接的 Gemini API 运行（`api: "google-generative-ai"`），OpenClaw
    会将已配置的 `cachedContent` 句柄传递给 Gemini 请求。

    - 可使用 `cachedContent` 或旧版 `cached_content` 配置按模型或全局参数
    - 如果两者都存在，则以 `cachedContent` 为准
    - 示例值：`cachedContents/prebuilt-context`
    - Gemini 缓存命中用量会从上游 `cachedContentTokenCount`
      归一化为 OpenClaw 的 `cacheRead`

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

  <Accordion title="Gemini CLI JSON 使用说明">
    使用 `google-gemini-cli` OAuth 提供方时，OpenClaw 会按如下方式
    规范化 CLI JSON 输出：

    - 回复文本来自 CLI JSON 的 `response` 字段。
    - 当 CLI 将 `usage` 留空时，使用 `stats` 作为回退。
    - `stats.cached` 会被归一化为 OpenClaw 的 `cacheRead`。
    - 如果 `stats.input` 缺失，OpenClaw 会从
      `stats.input_tokens - stats.cached` 推导输入 token 数。

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
