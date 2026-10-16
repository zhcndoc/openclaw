---
summary: "Google Gemini 设置（AI Studio API 密钥、Vertex AI、可选 CLI 运行时和多模态工具）"
title: "Google (Gemini)"
read_when:
  - "您想要将 Google Gemini 模型与 OpenClaw 一起使用"
  - "需要 Google AI Studio、Vertex AI 或 Gemini CLI 运行时指南"
---

Google 插件提供通过 Google AI Studio 访问 Gemini 模型，以及图像生成、媒体理解 （image/audio/video）、文本转语音和通过 Gemini Grounding 的网络搜索。

- 提供者：`google`
- 身份验证：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API: Google Gemini API
- 默认模型：`google/gemini-4-argon`
- 托管云提供商：`google-vertex`，使用 Google Cloud 应用程序默认凭据
- 可选运行时：`agentRuntime.id: "google-gemini-cli"` 通过本地 Gemini CLI 运行显式配置的模型。

## <a id="getting-started"></a> 入门

对于大多数安装，请使用 Google AI Studio API 密钥。当 Gateway 已经运行在受管控的 Google Cloud 环境中时，请使用 `google-vertex`。

<Tabs>
  <Tab id="ai-studio-api-key" title="AI Studio API 密钥">
    **推荐用于：** 标准 Gemini API 访问。

    <Steps>
      <Step id="get-an-api-key" title="获取 API 密钥">
        在 [Google AI Studio](https://aistudio.google.com/apikey) 中创建免费密钥。
      </Step>
      <Step id="run-onboarding" title="运行入门引导培训">
        ```bash
        openclaw onboard --auth-choice gemini-api-key
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --non-interactive --accept-risk --skip-health \
          --mode local \
          --auth-choice gemini-api-key \
          --gemini-api-key "$GEMINI_API_KEY"
        ```
      </Step>
      <Step id="set-a-default-model" title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "google/gemini-4-argon" },
            },
          },
        }
        ```
      </Step>
      <Step id="verify-the-model-is-available" title="验证模型是否可用">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    <Tip>
    `GEMINI_API_KEY` 和 `GOOGLE_API_KEY` 都可接受。请使用你已经配置好的那个。
    </Tip>

    使用配置的 API 密钥，OpenClaw 会从 Gemini `models.list` API 刷新 Google AI Studio 的文本模型目录。因此，受支持的 Gemini 文本模型会出现在 `openclaw models list --provider google` 中，而无需等待 OpenClaw 版本。失败的刷新会报告失败并保留上次成功的库存或第一次成功之前的捆绑模型。成功的空响应将清除已发现的模型。 Vertex 使用其单独的静态目录。

  </Tab>

  <Tab id="vertex-ai-adc" title="顶点 AI （ADC）">
    **推荐用于：**内部运行的网关实例Google云 （GCE， GKE、Cloud Run）或已通过 gcloud 应用程序默认凭据进行身份验证的工作站。

    <Steps>
      <Step id="authenticate-with-gcloud-adc" title="使用 gcloud ADC 进行身份验证">
        在工作站上，运行：

        ```bash
        gcloud auth application-default login
        ```

        在具有附加服务帐户的 Google 云 VM 上，元数据服务器已提供凭据，不需要任何文件。
      </Step>
      <Step id="set-project-and-location" title="设置项目和位置">
        网关服务环境中两者都需要：

        ```bash
        export GOOGLE_CLOUD_PROJECT="my-project"
        export GOOGLE_CLOUD_LOCATION="us-central1"
        ```

        `GCLOUD_PROJECT` 也被该项目接受。如果没有项目，则运行失败，并显示 `Vertex AI requires a project ID. Set GOOGLE_CLOUD_PROJECT/GCLOUD_PROJECT or pass project in options.` 如果没有位置，则错误为 `Vertex AI requires a location. Set GOOGLE_CLOUD_LOCATION or pass location in options.`
      </Step>
      <Step id="credential%3A-automatic-discovery-or-manual-sentinel" title="凭证：自动发现或手动哨兵">
        通过识别的 ADC 文件（由 `gcloud auth application-default login` 创建）**和** 以及项目和位置变量集，OpenClaw 会自动发现 `google-vertex` — 无需存储任何内容。

        仅对于仅元数据凭据（例如带有附加服务帐户且磁盘上没有 ADC 文件的 GCE VM）或显式选择 ADC 路径，才需要手动存储。 ADC 路径是由哨兵值选择的，而不是真正的密钥 - 准确存储 `gcp-vertex-credentials`：

        ```bash
        openclaw models auth paste-api-key --provider google-vertex
        # paste exactly: gcp-vertex-credentials
        ```

        <Warning>
        其他存储的值在 `x-goog-api-key` 标头中发送，而不是作为 ADC 凭证发送。请勿粘贴来自 `gcloud auth print-access-token` 的 OAuth 访问令牌：它不是 API 密钥，可能会导致身份验证错误，例如 `401 UNAUTHENTICATED`。
        </Warning>
      </Step>
      <Step id="list-the-vertex-catalog" title="列出顶点目录">
        ```bash
        openclaw models list --refresh --all --provider google-vertex
        ```

        `--all` 包括您尚未配置的模型。 `--refresh` 在尚未加载时填充本地目录；它不会查询实时 Vertex 模型库存或验证 ADC 是否可以获得令牌。
      </Step>
    </Steps>

    <Tip>
    Vertex使用单独的静态模型目录；新的 Gemini 变体出现在每个 OpenClaw 版本中，而不是通过 AI Studio 关键路径使用的实时刷新。
    </Tip>

  </Tab>

  <Tab id="gemini-cli-runtime" title="Gemini CLI 运行时">
    **仅高级使用：** 通过已安装的 Gemini CLI 运行标准 `google/*` 模型，同时在支持的 AI Studio API-key 路径上保持身份验证。

    OpenClaw 不提供新的 Gemini CLI OAuth 或反重力 OAuth 设置。 [Google 最终消费者 Gemini CLI 于 2026 年 6 月 18 日使用 Google 访问权限登录](https://developers.google.com/gemini-code-assist/docs/deprecations/code-assist-individuals)，并且 [ 反重力条款 ](https://antigravity.google/terms) 禁止第三方工具通过反重力访问服务OAuth。请改用 AI Studio API 密钥或 Vertex AI。

    <Steps>
      <Step id="configure-google-ai-studio" title="配置Google AI Studio">
        在第一个选项卡中完成 API-key 设置。在选择 CLI 运行时之前，OpenClaw 必须具有可用的 `google` API-key 配置文件。
      </Step>
      <Step id="install-gemini-cli" title="安装 Gemini CLI">
        本地的 `gemini` 命令必须位于 `PATH` 中。

        ```bash
        # Homebrew
        brew install gemini-cli

        # or npm
        npm install -g @google/gemini-cli
        ```

        OpenClaw 同时支持 Homebrew 安装和全局 npm 安装，包括常见的 Windows/npm 布局。
      </Step>
      <Step id="select-the-cli-runtime" title="选择 CLI 运行时">
        保留标准 Google 模型引用并将该模型选择到 CLI 运行时中：

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
    - Auth：选择 Google AI Studio API-key 配置文件
    - 模型参考：`google/*`

    `google-gemini-cli` 是捆绑的 Google 插件注册的 CLI 后端。请参阅 [CLI backends](/gateway/cli-backends) 了解其 argv、JSONL 方言、会话和压缩行为，以及每个注册后端共享的设置。

    现有有效的 Gemini CLI OAuth 配置文件仍然可执行以实现兼容性，但 OpenClaw 无法创建或修复它们。如果其中一个损坏，请将其替换为 Google AI Studio API-key 配置文件。

    `google-gemini-cli/*` 引用仍是旧版兼容别名。新配置应使用 `google/*` 模型引用，并采用上述显式运行时选择。

  </Tab>
</Tabs>

<Note>
`google/gemini-3-pro-preview`于2026年3月9日退役；请改用 `google/gemini-4-argon`。重新运行 Gemini API 密钥设置（`openclaw onboard --auth-choice gemini-api-key` 或 `openclaw models auth login --provider google`）将配置的主要模型更新为 `google/gemini-4-argon`。
</Note>

## <a id="gemini-4-argon"></a> Gemini 4 氩气

`google/gemini-4-argon` 是默认的 Google 模型，具有 1,048,576 个令牌上下文窗口和最多 65,536 个输出令牌。 `google/gemini-4`是它的简写；相同模型 ID 和简写可用于 `google-vertex`。

Gemini 4 Argon 支持文本、图像、音频、视频和 PDF 输入、函数调用、结构化输出和搜索接地。它仅使用隐式上下文缓存：不支持显式 `cachedContents` 句柄和 Live API。请参阅 [Google 的模型文档](https://ai.google.dev/gemini-api/docs/models/gemini-4-argon)。

捆绑目录还包括稳定的 `google/gemini-3.8-flash`，具有 1,048,576 个令牌上下文窗口和多达 65,536 个输出令牌。内置`gemini-flash`别名选择该模型； `gemini-flash-lite` 选择 `google/gemini-3.5-flash-lite`。

## <a id="capabilities"></a> 功能

| 能力             | 支持                     |
| ---------------------- | ----------------------------- |
| 聊天补全       | 是                           |
| 图像生成       | 是                           |
| 音乐生成       | 是                           |
| 文本转语音         | 是                           |
| 实时语音         | 是（Google Live API）         |
| 图像理解    | 是                           |
| 音频转录    | 是                           |
| 视频理解    | 是                           |
| 网络搜索（Grounding） | 是                           |
| Thinking/reasoning     | 是（Gemini 2.5+ / Gemini 3+） |
| Gemma 4 模型         | 是                           |

标记为 `MAX_TOKENS` 或 `CONTINUATION` 的响应已达到生成限制。 OpenClaw 保留其部分内容并报告长度有限的结果。该部分响应中的函数调用仍然不完整，而不是成为可执行的工具使用转向。

## <a id="web-search"></a> 网页搜索

捆绑的 `gemini` 网络搜索提供商使用 Gemini Google 搜索接地。在`plugins.entries.google.config.webSearch`下配置专用搜索键，或者让它在`GEMINI_API_KEY`之后重用`models.providers.google.apiKey`：

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            apiKey: "AIza...", // optional if GEMINI_API_KEY or models.providers.google.apiKey is set
            baseUrl: "https://generativelanguage.googleapis.com/v1beta", // falls back to models.providers.google.baseUrl
            model: "gemini-3.6-flash",
          },
        },
      },
    },
  },
}
```

凭据优先级依次为专用的 `webSearch.apiKey`、`GEMINI_API_KEY`， 然后是 `models.providers.google.apiKey`。`webSearch.baseUrl` 是可选的， 用于运营方代理或兼容的 Gemini API 端点；如果省略， Gemini 网页搜索会复用 `models.providers.google.baseUrl`。参见 [Gemini 搜索](/tools/gemini-search) 了解 provider 特定的工具行为。

<Tip>
Gemini 3 和 Gemini 4 模型使用 `thinkingLevel` 而不是 `thinkingBudget`。 OpenClaw 将这些模型和 `gemini-*-latest` 别名推理控制映射到 `thinkingLevel`，因此 default/low-latency 运行不会发送禁用的 `thinkingBudget` 值。

`/think adaptive`保留了Google的动态思维语义，而不是选择固定的OpenClaw级别。 Gemini 3和Gemini 4省略了固定的`thinkingLevel`，因此Google可以选择级别； Gemini 2.5 发送 Google 的动态哨兵 `thinkingBudget: -1`。

Gemini 4 Argon 支持 `low`、`medium` 和 `high`。 OpenClaw 将 `minimal` 和 `off` 映射到 `low`，因为在此模型上无法完全禁用思维。

Gemma 4个模型（例如`gemma-4-26b-a4b-it`）支持思维模式。 OpenClaw 将 `thinkingBudget` 重写为 Gemma 的受支持的 Google `thinkingLevel` 4. 将思考设置为 `off` 会保留思考禁用状态，而不是映射到 `MINIMAL`。

Gemini 2.5 Pro仅在思考模式下工作并拒绝显式的`thinkingBudget: 0`。通过显式 `maxTokens`，OpenClaw 在思考关闭时使用其最小思考预算 128。如果没有明确的上限，OpenClaw 继续忽略被拒绝的零预算。

Google 将思维计算在其输出令牌限制内。对于具有固定数字思维预算的 Gemini API 和 Vertex 请求，OpenClaw 将该预算添加到调用者的 `maxTokens` 中，上限为模型的输出限制。思考闪现保持呼叫者的上限不变。思维水平、adaptive/automatic 思维和交互请求使调用者的 `maxTokens` 上限保持不变。省略的上限仍然被省略。
</Tip>

## <a id="image-generation"></a> 图像生成

捆绑的 `google` 图像生成 provider 默认为 `google/gemini-3.1-flash-image`。

- 也支持 `google/gemini-3-pro-image`
- 生成：每次请求最多 4 张图像
- 编辑模式：已启用，最多支持 5 张输入图像
- 几何控制：`size`、`aspectRatio` 和 `resolution`

要将 Google 设为默认图像 provider：

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        image: {
          primary: "google/gemini-3.1-flash-image",
        },
      },
    },
  },
}
```

<Note>
有关共享工具参数、提供程序选择和故障转移行为，请参阅 [Image Generation](/tools/image-generation)。
</Note>

## <a id="video-generation"></a> 视频生成

内置的 `google` 插件还通过共享的 `video_generate` 工具注册视频生成。

- 默认视频模型：`google/veo-3.1-fast-generate-preview`
- 模式：文本转视频、图像转视频，以及单视频参考流程
- 支持 `aspectRatio`（`16:9`、`9:16`）和 `resolution`（`720P`、`1080P`）；Veo 目前不支持音频输出
- 支持时长：**4、6 或 8 秒**（其他值会自动调整到最接近的允许值）

要将 Google 设为默认视频 provider：

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        video: {
          primary: "google/veo-3.1-fast-generate-preview",
        },
      },
    },
  },
}
```

<Note>
有关共享工具参数、提供程序选择和故障转移行为，请参阅 [Video Generation](/tools/video-generation)。
</Note>

## <a id="music-generation"></a> 音乐生成

内置的 `google` 插件还通过共享的 `music_generate` 工具注册音乐生成。

- 默认音乐模型: `google/lyria-3-clip-preview`
- 也支持 `google/lyria-3-pro-preview`
- 提示控制：`lyrics` 和 `instrumental`
- 输出格式：默认为`mp3`，在`google/lyria-3-pro-preview`上加上`wav`
- 参考输入：最多 10 张图片
- Session-backed 通过共享 task/status 流运行分离，包括 `action: "status"`

要将 Google 设为默认音乐 provider：

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        music: {
          primary: "google/lyria-3-clip-preview",
        },
      },
    },
  },
}
```

<Note>
有关共享工具参数、提供程序选择和故障转移行为，请参阅 [Music Generation](/tools/music-generation)。
</Note>

## <a id="text-to-speech"></a> 文本转语音

捆绑的 `google` 语音提供程序使用 Gemini API TTS。默认模型仍为 `gemini-3.1-flash-tts-preview`。将 `model` 设置为 `gemini-3.8-flash-tts` 以选择 Gemini 3.8，或 `gemini-3.8-flash-lite-tts` 以获得更快、成本更低的变体。 `gemini-2.5-flash-preview-tts` 和 `gemini-2.5-pro-preview-tts` 仍然可用。

- 默认语音：`Kore`
- 身份验证：`tts.providers.google.apiKey`、`models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- 输出：WAV用于常规TTS附件，Opus用于语音注释目标，PCM用于Talk/telephony
- 语音消息输出：Google PCM 会被封装为 WAV，并通过 `ffmpeg` 转码为 48 kHz Opus

OpenClaw 通过与 `store: false` 的交互 API （`POST /v1beta/interactions`） 发送 Gemini 3.8 TTS。 Google 还在 `generateContent` 上记录了 3.8；交互是 OpenClaw 的路由选择，而不是模型要求。 OpenClaw 请求无标头 24 kHz PCM （`audio/l16`），并且仍然在本地包装 PCM。 `audioProfile` 和 `personaPrompt` 作为 `speech_metadata.style`、`speakerName` 作为结构化 `speaker` 标签发送，并且它们都不会作为文字记录的一部分被朗读。瞬时3.8声音标签使用尖括号，例如`<laugh>`或`<short pause>`；诸如耳语之类的持续传递属于`audioProfile`。

将 `speakers` 设置为恰好两个 `{ speaker, voice, style? }` 条目以投射对话。只有以这两个名字之一开头并后跟冒号的行才开始一个回合（`Puck: Hello` 和 `Puck:Hello` 都算），并且不会说出该名字。其他所有行都作为当前回合的一部分朗读，包括普通的冒号前缀散文（例如 `Budget: 10 dollars`）和任何未配置的标签（例如 `Alice: Hi`）。第一个标签之前的单词由第一个说话者说出，而不是被丢弃。未配置标签的转录内容保留在单语音路径上。多发言者对话需要 `gemini-3.8-flash-tts` 或 `gemini-3.8-flash-lite-tts`。

```text
Puck: Headphones on. <laugh> We opened it.
Kore: It is waiting at the maintainer gate.
```

Gemini 3.1 和 2.5 预览 TTS 仍然使用 `generateContent`。这些模型保留了旧的行为：`audioProfile` 被添加到转录本中，表达标签使用方括号，例如 `[whispers]`。未知的 `gemini-3.8-*-tts` ID 将被拒绝，而不是发送到 `generateContent`。

对于最低延迟的语音对话，请使用由 Gemini Live API 支持的 Google 实时语音提供程序，而不是批量 TTS。

要将 Google 设为默认 TTS 提供商：

```json5
{
  tts: {
    auto: "always",
    provider: "google",
    providers: {
      google: {
        model: "gemini-3.8-flash-tts",
        speakerVoice: "Kore",
        audioProfile: "Speak professionally with a calm tone.",
        speakers: [
          { speaker: "Puck", voice: "Puck", style: "bright" },
          { speaker: "Kore", voice: "Kore", style: "whispered" },
        ],
      },
    },
  },
}
```

Gemini API TTS 使用自然语言提示进行样式控制。设置 `audioProfile` 以实现可重复使用的交付方式。在 Gemini 3.8 上，样式为 `speech_metadata.style` 并且不会大声朗读。在 Gemini、3.1 和 2.5 预览模型上，它仍保留在语音文本前面。当演出需要指定扬声器时，设置`speakerName`； 3.8 将其作为结构化 `speech_metadata.speaker` 标签发送，而不是作为样式文本发送，并且所选语音保留单个配置的语音。

Gemini 3.1 和 2.5 预览 TTS 接受文本中富有表现力的方括号音频标签，例如 `[whispers]` 或 `[laughs]`。 Gemini 3.8 使用尖括号语音标签，例如 `<laugh>`。要在将标签发送到 TTS 时使标签远离可见的聊天回复，请将它们放在 `[[tts:text]]...[[/tts:text]]` 块内：

```text
Here is the clean reply text.

[[tts:text]]<laugh> Here is the spoken version. <short pause> Enjoy.[[/tts:text]]
```

<Note>
仅限于 Gemini API 的 Google 云控制台 API 密钥对此提供商有效。这不是单独的云文本转语音 API 路径。
</Note>

## <a id="realtime-voice"></a> 实时语音

内置的 `google` 插件注册了一个由 Gemini Live API 支持的实时语音 provider，用于后端音频桥接，例如 Voice Call 和 Google Meet。

Talk 和 Discord 在其语音目录中公开 Google 的预构建语音。在通话或 Discord 通话过程中，使用 `talk_voice` 选择新语音。 OpenClaw 重新连接该声音，同时保留对话和未完成的座席工作；保存的语音默认值保持不变。请参阅 [Discord 语音更改 ](/channels/discord/voice-follow)。

| 设置               | 配置路径                                                         | 默认值                                                                               |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 模型                 | `plugins.entries.voice-call.config.realtime.providers.google.model` | `gemini-3.1-flash-live-preview`                                                       |
| 声音                 | `...google.voice`                                                   | `Kore`                                                                                |
| 温度           | `...google.temperature`                                             | （未设置）                                                                               |
| VAD 开始灵敏度 | `...google.startSensitivity`                                        | （未设置）                                                                               |
| VAD 结束灵敏度   | `...google.endSensitivity`                                          | （未设置）                                                                               |
| 静默时长      | `...google.silenceDurationMs`                                       | （未设置）                                                                               |
| 活动处理     | `...google.activityHandling`                                        | Google 默认值，`start-of-activity-interrupts`                                        |
| 回合覆盖范围         | `...google.turnCoverage`                                            | Google 默认值，`audio-activity-and-all-video`                                        |
| 禁用自动 VAD      | `...google.automaticActivityDetectionDisabled`                      | `false`                                                                               |
| 会话恢复    | `...google.sessionResumption`                                       | `true`                                                                                |
| 上下文压缩   | `...google.contextWindowCompression`                                | `true`                                                                                |
| API 密钥               | `...google.apiKey`                                                  | 回退到 `models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` |

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
Google Live API 通过 WebSocket 使用双向音频和函数调用。 OpenClaw 将 telephony/Meet 桥接音频调整为 Gemini 的 PCM Live API 流，并在共享实时语音合约上保持工具调用。除非您需要进行采样更改，否则请保留 `temperature` 未设置； OpenClaw 忽略非正值，因为 Google Live 可以返回没有 `temperature: 0` 音频的文字记录。 Gemini API 转录无需 `languageCodes` 即可启用；当前的 Google SDK 拒绝此 API 路径上的语言代码提示。
</Note>

<Note>
Gemini 3.1 Live 接受通过实时输入传入的会话文本，并使用顺序函数调用。OpenClaw 会为此模型省略较旧的 `NON_BLOCKING`、函数响应调度和情感对话字段。优先使用 `thinkingLevel`；已配置的正值 `thinkingBudget` 会映射到最接近的受支持级别，而 `-1` 会保留 Google 的默认值。参见 [Gemini Live 能力对比](https://ai.google.dev/gemini-api/docs/live-api/capabilities)。
</Note>

<Note>
Gemini 3.8 Live （`gemini-3.8-live`） 保留异步函数调用合约并拒绝任何思考配置，因此 OpenClaw 不会发送任何内容。 Gemini 3.8 Live Extended Thinking （`gemini-3.8-live-extended-thinking`） 需要 `NON_BLOCKING` 工具，拒绝功能响应调度，并在临时响应后放弃呼叫，因此 OpenClaw 每次座席咨询都会发送一个最终结果，而无需“工作”临时。使用 `thinkingLevel`（`low`、`medium` 或 `high`；`minimal` 映射到 `low`）或映射到最近级别的正 `thinkingBudget` 配置其推理深度。口语填充物有自己的话语边界，而交互仍在进行； OpenClaw 最终确定转录和音频，但保持响应活动，直到 Google 报告交互空闲。在此模型上，显式停止或插入会通过简短的客户端内容转向来中断生成，该转向告诉模型它已被中断（空转向使其恢复）。取消当前生成是可靠的，但随后的沉默是尽力而为：模型仍可能恢复或启动另一个响应，因此将停止视为“停止此回复”，而不是保证沉默。其他 Gemini Live 模型仅通过服务器端语音活动检测中断。请参阅 [Gemini 3.8 实时思维指南](https://ai.google.dev/gemini-api/docs/live-api/thinking)。
</Note>

<Note>
Control UI Talk 支持使用受限的一次性令牌进行 Google Live 浏览器会话。在 Video Talk 中，浏览器会将有界 JPEG 帧直接发送到 Google Live，发送速率上限为提供商规定的每秒一帧。`describe_view` 函数会报告摄像头流是否处于活动状态。 摄像头帧不会经过 Gateway。仅后端的实时语音提供商也可以通过通用 Gateway 中继传输运行，从而使提供商凭据保留在 Gateway 上。
</Note>

对于维护人员实时验证，请运行 `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`。烟雾还覆盖了 OpenAI backend/WebRTC 路径； Google 分支铸造与 Control UI Talk 使用的相同受限 Live API 令牌形状，打开浏览器 WebSocket 端点，发送初始设置有效负载和 JPEG 帧，并验证文本响应和 `describe_view` 函数往返。 OpenAI 路径还执行合成的 PCM24 语音到响应音频往返；通过 `--openai-audio-cycles 3` 进行短暂的重复生命周期浸泡。

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="gemini-interactions-api-stateless" title="Gemini 交互 API（无状态）">
    Gemini 交互是默认 `google-generative-ai` 传输的可选替代方案。向 `api: "google-interactions"` 注册提供商并通过该提供商 ID 选择模型：

    ```json5
    {
      models: {
        mode: "merge",
        providers: {
          "google-interactions": {
            baseUrl: "https://generativelanguage.googleapis.com/v1beta",
            apiKey: "***",
            api: "google-interactions",
            models: [
              {
                id: "gemini-3.8-flash",
                name: "Gemini 3.8 Flash (Interactions)",
                reasoning: true,
                input: ["text", "image"],
                contextWindow: 1048576,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
      agents: {
        defaults: { model: { primary: "google-interactions/gemini-3.8-flash" } },
      },
    }
    ```

    此传输是无状态的：OpenClaw 发送 `store: false`，不保留服务器端交互 ID，并重播每个请求所需的对话上下文。此路由不支持显式 Gemini `cachedContent` 句柄；使用 `google-generative-ai` 来实现该功能。

    中断的文本回复使用正常的瞬态错误重试和故障转移策略。格式错误的流 JSON 会导致请求失败，而不是默默地丢弃内容。格式错误的已完成工具调用参数仍被拒绝。

  </Accordion>

  <Accordion id="direct-gemini-cache-reuse" title="直接 Gemini 缓存重用">
    对于直接 Gemini API 运行 （`api: "google-generative-ai"`），OpenClaw 将配置的 `cachedContent` 句柄传递给支持的 Gemini 模型。 Gemini 4 Argon 仅支持隐式缓存；不要为其配置显式缓存句柄。

    - 使用 `cachedContent` 或旧版 `cached_content`，按模型或全局范围配置参数
    - 更具体作用域中的参数（模型级优先于全局）始终生效。 在同一作用域内，如果两个键都设置了，则 `cached_content` 生效。 每个作用域只使用一个键，以避免意外。
    - 示例值：`cachedContents/prebuilt-context`
    - Gemini 缓存命中使用情况标准化为来自上游 `cachedContentTokenCount` 的 OpenClaw `cacheRead`

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

  <Accordion id="gemini-cli-usage-notes" title="Gemini CLI 使用说明">
    可选的 `google-gemini-cli` 运行时默认使用 Gemini CLI 的 `stream-json` 输出，并从最终的 `stats` 负载中规范化用量。 旧版的 `--output-format json` 覆盖设置仍使用 JSON 解析器。

    - 流式回复文本来自 assistant 的 `message` 事件。
    - 对于旧版 JSON 输出，回复文本来自 CLI JSON 的 `response` 字段。
    - 当 CLI 将 `usage` 留空时，Usage 回落到 `stats`。
    - `stats.cached` 会被规范化为 OpenClaw 的 `cacheRead`。
    - 如果缺少 `stats.input`，OpenClaw 会根据 `stats.input_tokens - stats.cached` 推导输入 token 数。

  </Accordion>

  <Accordion id="environment-and-daemon-setup" title="环境和守护进程设置">
    如果 Gateway 以守护进程方式运行（launchd/systemd），请确保 `GEMINI_API_KEY` 对该进程可用（例如，放在 `~/.openclaw/.env` 中或通过 `env.shellEnv` 提供）。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
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
  <Card title="CLI 后端" href="/gateway/cli-backends" icon="terminal">
    Gemini CLI 后端设置和运行时详细信息。
  </Card>
  <Card title="语音通话插件" href="/plugins/voice-call" icon="phone">
    使用 Gemini Live 实时语音提供程序的音频桥。
  </Card>
</CardGroup>
