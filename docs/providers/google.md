---
summary: "Google Gemini 设置（AI Studio API 密钥、Vertex AI、可选 CLI 运行时和多模态工具）"
title: "Google（Gemini）"
read_when:
  - 想要在 OpenClaw 中使用 Google Gemini 模型
  - 需要 Google AI Studio、Vertex AI 或 Gemini CLI 运行时指南
---

Google 插件通过 Google AI Studio 提供对 Gemini 模型的访问，同时还提供图像生成、媒体理解（图像/音频/视频）、文本转语音，以及通过 Gemini Grounding 实现的网页搜索。

- 提供商：`google`
- 身份验证：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API：Google Gemini API
- 托管云提供商：`google-vertex`，使用 Google Cloud 应用程序默认凭据
- 可选运行时：`agentRuntime.id: "google-gemini-cli"` 通过本地 Gemini CLI 运行显式配置的模型

## 开始使用

对于大多数安装，请使用 Google AI Studio API 密钥。当 Gateway 已经运行在受管控的 Google Cloud 环境中时，请使用 `google-vertex`。

<Tabs>
  <Tab title="AI Studio API 密钥">
    **推荐用于：** 标准 Gemini API 访问。

    <Steps>
      <Step title="获取 API 密钥">
        在 [Google AI Studio](https://aistudio.google.com/apikey) 中创建免费密钥。
      </Step>
      <Step title="运行引导设置">
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

    配置 API 密钥后，OpenClaw 会通过 Gemini 的 `models.list` API 刷新 Google AI Studio 的文本模型目录。因此，新发布的 Gemini 3 Pro、Flash 和 Flash-Lite 变体会出现在
    `openclaw models list --provider google` 中，无需等待 OpenClaw 发布新版本。如果无法进行发现，OpenClaw 会继续使用随附的备用目录。

  </Tab>

  <Tab title="Gemini CLI 运行时">
    **仅限高级用法：** 通过已安装的 Gemini CLI 运行规范的 `google/*` 模型，同时继续使用受支持的 AI Studio API 密钥路径进行身份验证。

    OpenClaw 不提供新的 Gemini CLI OAuth 或 Antigravity OAuth 设置。
    [Google 已于 2026 年 6 月 18 日终止消费者使用 Google 登录 Gemini CLI 的访问权限](https://developers.google.com/gemini-code-assist/docs/deprecations/code-assist-individuals)，
    并且 [Antigravity 条款](https://antigravity.google/terms)禁止第三方工具通过 Antigravity OAuth 访问该服务。请改用 AI Studio API 密钥或 Vertex AI。

    <Steps>
      <Step title="配置 Google AI Studio">
        在第一个选项卡中完成 API 密钥设置。在选择 CLI 运行时之前，OpenClaw 必须拥有可用的
        `google` API 密钥配置。
      </Step>
      <Step title="安装 Gemini CLI">
        本地的 `gemini` 命令必须位于 `PATH` 中。

        ```bash
        # Homebrew
        brew install gemini-cli

        # 或 npm
        npm install -g @google/gemini-cli
        ```

        OpenClaw 同时支持 Homebrew 安装和全局 npm 安装，包括
        常见的 Windows/npm 布局。
      </Step>
      <Step title="选择 CLI 运行时">
        保留规范的 Google 模型引用，并将该模型指定为使用 CLI 运行时：

        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "google/gemini-3.1-pro-preview" },
              models: {
                "google/gemini-3.1-pro-preview": {
                  agentRuntime: { id: "google-gemini-cli" },
                },
              },
            },
          },
        }
        ```
      </Step>
    </Steps>

    - 运行时：`google-gemini-cli`
    - 身份验证：选定的 Google AI Studio API 密钥配置
    - 模型引用：规范的 `google/*`

    现有的有效 Gemini CLI OAuth 配置仍可执行，以保持兼容性，但 OpenClaw 无法创建或修复它们。如果某个配置失效，请将其替换为 Google AI Studio API 密钥配置。

    `google-gemini-cli/*` 引用仍是旧版兼容别名。新配置应使用 `google/*` 模型引用，并采用上述显式运行时选择。

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

## 网页搜索

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
[Gemini 搜索](/tools/gemini-search) 了解 provider 特定的工具行为。

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

捆绑的 `google` 图像生成 provider 默认为
`google/gemini-3.1-flash-image`。

- 也支持 `google/gemini-3-pro-image`
- 生成：每次请求最多 4 张图像
- 编辑模式：已启用，最多支持 5 张输入图像
- 几何控制：`size`、`aspectRatio` 和 `resolution`

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

内置的 `google` 语音提供商使用 Gemini API 的 TTS 路径，
并采用 `gemini-3.1-flash-tts-preview`。

- 默认语音：`Kore`
- 身份验证：`tts.providers.google.apiKey`、`models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- 输出：常规 TTS 附件使用 WAV，语音消息目标使用 Opus，Talk/电话使用 PCM
- 语音消息输出：Google PCM 会被封装为 WAV，并通过 `ffmpeg` 转码为 48 kHz Opus

Google 的批量 Gemini TTS 路径会在完成的 `generateContent` 响应中返回生成的音频。
对于最低延迟的语音对话，请使用由 Gemini Live API 支持的 Google 实时语音提供商，
而不是批量 TTS。

要将 Google 设为默认 TTS 提供商：

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
受限于 Gemini API 的 Google Cloud Console API 密钥对此
提供商有效。这不是独立的 Cloud Text-to-Speech API 路径。
</Note>

## 实时语音

内置的 `google` 插件注册了一个由
Gemini Live API 支持的实时语音 provider，用于后端音频桥接，例如 Voice Call 和 Google Meet。

| 设置                  | 配置路径                                                          | 默认值                                                                               |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 模型                  | `plugins.entries.voice-call.config.realtime.providers.google.model` | `gemini-3.1-flash-live-preview`                                                       |
| 语音                  | `...google.voice`                                                   | `Kore`                                                                                |
| 温度                  | `...google.temperature`                                             | （未设置）                                                                            |
| VAD 开始灵敏度       | `...google.startSensitivity`                                          | （未设置）                                                                            |
| VAD 结束灵敏度       | `...google.endSensitivity`                                            | （未设置）                                                                            |
| 静音时长              | `...google.silenceDurationMs`                                       | （未设置）                                                                            |
| 活动处理              | `...google.activityHandling`                                        | Google 默认值，`start-of-activity-interrupts`                                        |
| 回合覆盖范围          | `...google.turnCoverage`                                            | Google 默认值，`audio-activity-and-all-video`                                        |
| 禁用自动 VAD          | `...google.automaticActivityDetectionDisabled`                      | `false`                                                                               |
| 会话恢复              | `...google.sessionResumption`                                       | `true`                                                                                |
| 上下文压缩            | `...google.contextWindowCompression`                                | `true`                                                                                |
| API 密钥              | `...google.apiKey`                                                  | 回退到 `models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` |

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
Control UI Talk 支持使用受限的一次性令牌进行 Google Live 浏览器会话。在 Video Talk 中，浏览器会将有界 JPEG 帧直接发送到 Google Live，发送速率上限为提供商规定的每秒一帧。`describe_view` 函数会报告摄像头流是否处于活动状态。
摄像头帧不会经过 Gateway。仅后端的实时语音提供商也可以通过通用 Gateway 中继传输运行，从而使提供商凭据保留在 Gateway 上。
</Note>

对于维护者的实时验证，请运行
`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`。
该冒烟测试还涵盖 OpenAI 后端/WebRTC 路径；Google 路径会生成与 Control UI Talk 使用的相同受限 Live API 令牌格式，打开浏览器 WebSocket 端点，发送初始设置负载和一个 JPEG 帧，并验证文本响应以及 `describe_view` 函数往返。
OpenAI 路径还会执行合成 PCM24 语音到响应音频的往返测试；传入 `--openai-audio-cycles 3` 可进行简短的重复生命周期浸泡测试。

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
    可选的 `google-gemini-cli` 运行时默认使用 Gemini CLI 的 `stream-json`
    输出，并从最终的 `stats` 负载中规范化用量。
    旧版的 `--output-format json` 覆盖设置仍使用 JSON 解析器。

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
