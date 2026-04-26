---
summary: "Google Gemini 设置（API 密钥 + OAuth、图像生成、媒体理解、TTS、网络搜索）"
title: "Google（Gemini）"
read_when:
  - 您想在使用 OpenClaw 时使用 Google Gemini 模型
  - 您需要 API 密钥或 OAuth 认证流程
---

Google 插件通过 Google AI Studio 提供对 Gemini 模型的访问，并通过
Gemini Grounding 提供图像生成、媒体理解（图像/音频/视频）、文本转语音和网络搜索。

- Provider: `google`
- Auth: `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- API: Google Gemini API
- Runtime option: `agents.defaults.embeddedHarness.runtime: "google-gemini-cli"`
  reuses Gemini CLI OAuth while keeping model refs canonical as `google/*`.

## 入门指南

选择您首选的认证方法并按照设置步骤操作。

<Tabs>
  <Tab title="API 密钥">
    **最适合：** 通过 Google AI Studio 进行标准 Gemini API 访问。

    <Steps>
      <Step title="运行引导">
        ```bash
        openclaw onboard --auth-choice gemini-api-key
        ```

        或直接传递密钥：

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
    环境变量 `GEMINI_API_KEY` 和 `GOOGLE_API_KEY` 均被接受。使用您已配置的任何其中一个。
    </Tip>

  </Tab>

  <Tab title="Gemini CLI (OAuth)">
    **最适合：** 通过 PKCE OAuth 重用现有的 Gemini CLI 登录，而不是使用单独的 API 密钥。

    <Warning>
    `google-gemini-cli` 提供商是非官方集成。一些用户报告通过这种方式使用 OAuth 时账户受到限制。请自行承担风险。
    </Warning>

    <Steps>
      <Step title="安装 Gemini CLI">
        本地 `gemini` 命令必须在 `PATH` 中可用。

        ```bash
        # 通过 Homebrew
        brew install gemini-cli

        # 或通过 npm
        npm install -g @google/gemini-cli
        ```

        OpenClaw 支持 Homebrew 安装和全局 npm 安装，包括常见的 Windows/npm 布局。
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

    - Default model: `google/gemini-3.1-pro-preview`
    - Runtime: `google-gemini-cli`
    - Alias: `gemini-cli`

    **环境变量：**

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

    （或 `GEMINI_CLI_*` 变体。）

    <Note>
    如果登录后 Gemini CLI OAuth 请求失败，请在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID` 并重试。
    </Note>

    <Note>
    如果登录在浏览器流程开始前失败，请确保本地 `gemini` 命令已安装并在 `PATH` 中。
    </Note>

    `google-gemini-cli/*` model refs are legacy compatibility aliases. New
    configs should use `google/*` model refs plus the `google-gemini-cli`
    runtime when they want local Gemini CLI execution.

  </Tab>
</Tabs>

## 功能

| Capability             | Supported                     |
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
Gemini 3 模型使用 `thinkingLevel` 而非 `thinkingBudget`。OpenClaw 将 Gemini 3、Gemini 3.1 以及 `gemini-*-latest` 别名的推理控制映射到 `thinkingLevel`，因此默认/低延迟运行不会发送禁用的 `thinkingBudget` 值。

`/think adaptive` 保持 Google 的动态思考语义，而不是选择固定的 OpenClaw 级别。Gemini 3 和 Gemini 3.1 省略固定的 `thinkingLevel`，以便 Google 可以选择级别；Gemini 2.5 发送 Google 的动态哨兵值 `thinkingBudget: -1`。

Gemma 4 模型（例如 `gemma-4-26b-a4b-it`）支持思考模式。OpenClaw 会将 `thinkingBudget` 重写为 Gemma 4 支持的 Google `thinkingLevel`。将思考设置为 `off` 会保留思考禁用状态，而不是映射为 `MINIMAL`。
</Tip>

## 图像生成

内置的 `google` 图像生成提供商默认为 `google/gemini-3.1-flash-image-preview`。

- 也支持 `google/gemini-3-pro-image-preview`
- 生成：每个请求最多 4 张图像
- 编辑模式：已启用，最多 5 张输入图像
- 几何控制：`size`、`aspectRatio` 和 `resolution`

要将 Google 用作默认图像提供商：

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
请参阅 [图像生成](/tools/image-generation) 了解共享工具参数、提供商选择和故障转移行为。
</Note>

## 视频生成

内置的 `google` 插件还通过共享的 `video_generate` 工具注册视频生成。

- 默认视频模型：`google/veo-3.1-fast-generate-preview`
- 模式：文生视频、图生视频和单视频参考流程
- 支持 `aspectRatio`、`resolution` 和 `audio`
- 当前持续时间限制：**4 到 8 秒**

要将 Google 用作默认视频提供商：

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
请参阅 [视频生成](/tools/video-generation) 了解共享工具参数、提供商选择和故障转移行为。
</Note>

## 音乐生成

内置的 `google` 插件还通过共享的 `music_generate` 工具注册音乐生成。

- 默认音乐模型：`google/lyria-3-clip-preview`
- 也支持 `google/lyria-3-pro-preview`
- 提示控制：`lyrics` 和 `instrumental`
- 输出格式：默认为 `mp3`，`google/lyria-3-pro-preview` 上还支持 `wav`
- 参考输入：最多 10 张图像
- 会话支持的运行通过共享的任务/状态流程分离，包括 `action: "status"`

要将 Google 用作默认音乐提供商：

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
请参阅 [音乐生成](/tools/music-generation) 了解共享工具参数、提供商选择和故障转移行为。
</Note>

## Text-to-speech

捆绑的 `google` 语音提供商使用带有 `gemini-3.1-flash-tts-preview` 的 Gemini API TTS 路径。

- 默认语音：`Kore`
- 认证：`messages.tts.providers.google.apiKey`、`models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- 输出：WAV 格式的常规 TTS 附件，PCM 格式的 Talk/telephony
- 本地语音笔记输出：不支持此 Gemini API 路径，因为 API 返回 PCM 而非 Opus

要将 Google 用作默认 TTS 提供商：

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
        },
      },
    },
  },
}
```

Gemini API TTS 接受文本中的表达性方括号音频标签，例如 `[whispers]` 或 `[laughs]`。为了在发送 TTS 时将标签保留在可见聊天回复之外，请将其放在 `[[tts:text]]...[[/tts:text]]` 块中：

```text
Here is the clean reply text.

[[tts:text]][whispers] Here is the spoken version.[[/tts:text]]
```

<Note>
需要限制为 Gemini API 的 Google Cloud Console API 密钥可用于此提供程序。这不是单独的 Cloud Text-to-Speech API 路径。
</Note>

## Realtime voice

The bundled `google` plugin registers a realtime voice provider backed by the
Gemini Live API for backend audio bridges such as Voice Call and Google Meet.

| Setting               | Config path                                                         | Default                                                                               |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Model                 | `plugins.entries.voice-call.config.realtime.providers.google.model` | `gemini-2.5-flash-native-audio-preview-12-2025`                                       |
| Voice                 | `...google.voice`                                                   | `Kore`                                                                                |
| Temperature           | `...google.temperature`                                             | (unset)                                                                               |
| VAD start sensitivity | `...google.startSensitivity`                                        | (unset)                                                                               |
| VAD end sensitivity   | `...google.endSensitivity`                                          | (unset)                                                                               |
| Silence duration      | `...google.silenceDurationMs`                                       | (unset)                                                                               |
| API key               | `...google.apiKey`                                                  | Falls back to `models.providers.google.apiKey`, `GEMINI_API_KEY`, or `GOOGLE_API_KEY` |

Example Voice Call realtime config:

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
Google Live API 使用双向音频和函数调用，通过 WebSocket 进行。
OpenClaw 会将电话/Meet 桥接音频适配为 Gemini 的 PCM Live API 流，并
将工具调用保留在共享的 realtime voice 合同上。除非您需要更改采样，
否则请将 `temperature` 保持未设置；OpenClaw 会省略非正值，因为 Google Live
在 `temperature: 0` 时可能返回无音频的转录内容。Gemini API 转录在未设置
`languageCodes` 的情况下启用；当前 Google SDK 会拒绝此 API 路径上的语言代码提示。
</Note>

<Note>
Control UI Talk 浏览器会话仍然需要一个带有浏览器 WebRTC 会话实现的 realtime voice 提供商。当前该路径为 OpenAI Realtime；Google 提供商用于后端 realtime 桥接。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="直接 Gemini 缓存重用">
    对于直接 Gemini API 运行（`api: "google-generative-ai"`），OpenClaw 将配置的 `cachedContent` 句柄传递给 Gemini 请求。

    - 使用 `cachedContent` 或旧版 `cached_content` 配置每个模型或全局参数
    - 如果两者都存在，`cachedContent` 优先
    - 示例值：`cachedContents/prebuilt-context`
    - Gemini 缓存命中用法从上游 `cachedContentTokenCount` 标准化为 OpenClaw `cacheRead`

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
    使用 `google-gemini-cli` OAuth 提供商时，OpenClaw 标准化 CLI JSON 输出如下：

    - 回复文本来自 CLI JSON `response` 字段。
    - 当 CLI 留空 `usage` 时，使用情况回退到 `stats`。
    - `stats.cached` 被标准化为 OpenClaw `cacheRead`。
    - 如果 `stats.input` 缺失，OpenClaw 从 `stats.input_tokens - stats.cached` 推导输入令牌。

  </Accordion>

  <Accordion title="环境和守护进程设置">
    如果网关作为守护进程运行（launchd/systemd），请确保 `GEMINI_API_KEY` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
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
