---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - 你想在 OpenClaw 中使用 Grok 模型
  - 你正在配置 xAI 认证或模型 ID
title: "xAI"
---

OpenClaw 随附了一个用于 Grok 模型的 `xai` 提供程序插件。  
推荐的方式是使用 Grok OAuth，并订阅符合条件的 SuperGrok 或 X Premium。  
Gateway、配置、路由和工具都会保留在本地；只有 Grok 请求会发送到 xAI 的 API。

OAuth 不需要 xAI API 密钥或 Grok Build 应用。由于 OpenClaw 使用的是 xAI 的共享 OAuth 客户端，xAI 可能仍会在同意页面上显示 Grok Build。

## 设置

<Steps>
  <Step title="新安装">
    先运行带 daemon 安装的 onboarding，然后在
    model/auth 步骤选择 xAI/Grok OAuth：

    ```bash
    openclaw onboard --install-daemon
    ```

    在 VPS 上或通过 SSH 时，直接选择 xAI OAuth；它使用设备码
    验证，不需要 localhost 回调：

    ```bash
    openclaw onboard --install-daemon --auth-choice xai-oauth
    ```

  </Step>
  <Step title="现有安装">
    仅登录 xAI；不要为了连接 Grok 重新运行完整 onboarding：

    ```bash
    openclaw models auth login --provider xai --method oauth
    ```

    另外单独将 Grok 设为默认模型：

    ```bash
    openclaw models set xai/grok-4.3
    ```

    只有在你有意更改 Gateway、daemon、channel、workspace 或其他设置选项时，才重新运行完整 onboarding。

  </Step>
  <Step title="API 密钥路径">
    对于 xAI Console 密钥，以及需要基于密钥的 provider 配置的媒体表面，
    API-key 设置仍然可用：

    ```bash
    openclaw models auth login --provider xai --method api-key
    export XAI_API_KEY=xai-...
    ```

  </Step>
  <Step title="选择一个模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4.3" } } },
    }
    ```
  </Step>
</Steps>

<Note>
OpenClaw 使用 xAI Responses API 作为捆绑的 xAI 传输层。来自
`openclaw models auth login --provider xai --method oauth` 或
`--method api-key` 的同一凭据，也为 `web_search`（provider id `grok`）、`x_search`、
`code_execution`、语音/转写以及 xAI 图像/视频生成提供支持。如果你
将 xAI 密钥存储在 `plugins.entries.xai.config.webSearch.apiKey` 下，
捆绑的 xAI 模型 provider 也会将其作为回退使用。
</Note>

## OAuth 故障排查

- 对于 SSH、Docker、VPS 或其他远程环境，请使用
  `openclaw models auth login --provider xai --method oauth`；它使用
  设备码验证，而不是 localhost 回调。
- 如果登录成功但 Grok 不是默认模型，请运行
  `openclaw models set xai/grok-4.3`。
- 检查已保存的 xAI auth 配置文件：

  ```bash
  openclaw models auth list --provider xai
  openclaw models status
  ```

- xAI 决定哪些账户可以接收 OAuth API tokens。如果某个账户
  不符合条件，请使用 API-key 路径，或检查 xAI 侧的订阅状态。

<Tip>
在 SSH、Docker 或 VPS 上登录时，请使用 `xai-oauth`。OpenClaw 会打印一个
URL 和短代码；在任意本地浏览器中完成登录，同时远程
进程会轮询 xAI 以获取已完成的 token 交换。
</Tip>

## 内置目录

Selectable ids in model pickers. The plugin still resolves older Grok 3,
Grok 4, Grok 4 Fast, Grok 4.1 Fast, and Grok Code ids for existing configs;
see [legacy compatibility and moving aliases](#legacy-compatibility-and-moving-aliases).

| Family         | Model ids                                                    |
| -------------- | ------------------------------------------------------------ |
| Grok 4.5       | `grok-4.5` (aliases: `grok-4.5-latest`, `grok-build-latest`) |
| Grok Build 0.1 | `grok-build-0.1`                                             |
| Grok 4.3       | `grok-4.3` (aliases: `grok-4.3-latest`, `grok-latest`)       |
| Grok 4.20      | `grok-4.20-0309-reasoning`, `grok-4.20-0309-non-reasoning`   |

<Tip>
Use `grok-4.5` for general chat, coding, and agentic work where it is available.
Grok 4.3 remains the regional-safe setup default; `grok-build-0.1` and both
dated Grok 4.20 variants remain selectable.
</Tip>

## 功能覆盖

The bundled plugin maps supported xAI APIs onto OpenClaw's shared provider and
tool contracts. Capabilities that do not fit the shared contract are listed
below or under known limits.

| xAI capability             | OpenClaw surface                        | Status                                               |
| -------------------------- | --------------------------------------- | ---------------------------------------------------- |
| Chat / Responses           | `xai/<model>` model provider            | Yes                                                  |
| Server-side web search     | `web_search` provider `grok`            | Yes                                                  |
| Server-side X search       | `x_search` tool                         | Yes                                                  |
| Server-side code execution | `code_execution` tool                   | Yes                                                  |
| Images                     | `image_generate`                        | Yes                                                  |
| Videos                     | `video_generate`                        | Yes                                                  |
| Batch text-to-speech       | `messages.tts.provider: "xai"` / `tts`  | Yes                                                  |
| Streaming TTS              | `textToSpeechStream`                    | Yes via `wss://api.x.ai/v1/tts` (not realtime voice) |
| Batch speech-to-text       | `tools.media.audio` media understanding | Yes                                                  |
| Streaming speech-to-text   | Voice Call `streaming.provider: "xai"`  | Yes                                                  |
| Realtime voice             | Talk `talk.realtime.provider: "xai"`    | Yes; gateway-relay for native Talk nodes             |
| Files / batches            | Generic model API compatibility only    | Not a first-class OpenClaw tool                      |

<Note>
OpenClaw uses xAI's REST image/video/TTS/STT APIs for media generation and
batch transcription, xAI's streaming STT WebSocket for live voice-call
transcription, xAI's Grok Voice Agent WebSocket for Talk realtime sessions,
and the Responses API for chat, search, and code-execution tools.
</Note>

### Legacy fast-mode compatibility

`/fast on` or `agents.defaults.models["xai/<model>"].params.fastMode: true`
still rewrites older xAI configurations as follows. These target ids are
kept only for compatibility; use current selectable models for new
configurations.

| 源模型        | 快速模式目标     |
| ------------- | ------------------ |
| `grok-3`      | `grok-3-fast`      |
| `grok-3-mini` | `grok-3-mini-fast` |
| `grok-4`      | `grok-4-fast`      |
| `grok-4-0709` | `grok-4-fast`      |

### Legacy compatibility and moving aliases

Older aliases normalize as follows:

| Legacy alias                                                  | Normalized id    |
| ------------------------------------------------------------- | ---------------- |
| `grok-code-fast-1`, `grok-code-fast`, `grok-code-fast-1-0825` | `grok-build-0.1` |

The dated 0309 ids are the selectable catalog entries. OpenClaw sends all other
current Grok 4.20 aliases verbatim so xAI retains control of stable, latest,
beta, experimental, and dated alias semantics. The global `grok-latest` alias is
also preserved verbatim.

xAI retired the following exact ids. OpenClaw keeps them as hidden compatibility
rows for shipped configurations, with the limits and pricing of their current
redirect targets:

| Retired ids                                                          | Current behavior                 |
| -------------------------------------------------------------------- | -------------------------------- |
| `grok-4-1-fast-reasoning`, `grok-4-fast-reasoning`, `grok-4-0709`    | Grok 4.3 with `low` reasoning    |
| `grok-4-1-fast-non-reasoning`, `grok-4-fast-non-reasoning`, `grok-3` | Grok 4.3 with reasoning disabled |
| `grok-code-fast-1`                                                   | Grok Build 0.1                   |
| `grok-imagine-image-pro`                                             | Grok Imagine Image Quality       |

`openclaw doctor --fix` updates persisted xAI server-tool defaults and the
retired quality image slug, removes stale generated catalog rows, and repairs
stale context metadata on active 4.20 rows. It does not pin active 4.20
`beta-latest` aliases to a dated snapshot.

## 功能

<Warning>
  `x_search` and `code_execution` run on xAI's servers. xAI bills $5 per 1,000
  tool calls, plus the model's input and output tokens. With each tool's
  `enabled` setting omitted, OpenClaw exposes it only for an active xAI model.
  A known non-xAI model provider requires an explicit per-tool `enabled: true`;
  a missing or unresolved provider fails closed. xAI auth is always required,
  and `enabled: false` disables the tool for every provider.
</Warning>

<AccordionGroup>
  <Accordion title="Web 搜索">
    捆绑的 `grok` web-search 提供方优先使用 xAI OAuth，然后回退
    到 `XAI_API_KEY` 或插件 web-search 密钥：

    ```bash
    openclaw models auth login --provider xai --method oauth
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="视频生成">
    内置的 `xai` 插件通过共享的
    `video_generate` 工具注册视频生成功能。

    - Default model: `xai/grok-imagine-video`
    - Additional model: `xai/grok-imagine-video-1.5`
    - Classic modes: text-to-video, image-to-video, reference-image generation,
      remote video edit, and remote video extension
    - Video 1.5 mode: image-to-video only, with exactly one first-frame image
    - Aspect ratios: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`;
      classic and Video 1.5 image-to-video inherit the source image ratio when
      omitted
    - Resolutions: classic `480P`/`720P`; Video 1.5 also supports `1080P`; all
      generation modes default to `480P`
    - Duration: 1-15 seconds for generation/image-to-video, 1-10 seconds when
      using classic `reference_image` roles, 2-10 seconds for classic extension
    - Reference-image generation: set `imageRoles` to `reference_image` for
      every supplied image; xAI accepts up to 7 such images
    - Video edit/extend inherit the input video's aspect ratio and resolution;
      those operations do not accept geometry overrides
    - Default operation timeout: 600 seconds unless `video_generate.timeoutMs`
      or `agents.defaults.videoGenerationModel.timeoutMs` is set

    <Warning>
    本地视频缓冲区不被接受。视频编辑/扩展输入请使用远程 `http(s)` URL。
    Image-to-video 接受本地图像缓冲区，因为 OpenClaw 会将其编码为数据 URL 供 xAI 使用。
    </Warning>

    Video 1.5 also recognizes xAI's `grok-imagine-video-1.5-preview` and
    `grok-imagine-video-1.5-2026-05-30` identifiers. OpenClaw forwards the
    selected identifier unchanged, but applies the same image-only validation.

    To use xAI as the default video provider:

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "xai/grok-imagine-video",
          },
        },
      },
    }
    ```

    <Note>
    有关共享工具参数、提供方选择和回退行为，请参见 [视频生成](/tools/video-generation)。
    </Note>

  </Accordion>

  <Accordion title="图像生成">
    内置的 `xai` 插件通过共享的
    `image_generate` 工具注册图像生成功能。

    - Default image model: `xai/grok-imagine-image`
    - Additional model: `xai/grok-imagine-image-quality`
    - Modes: text-to-image and reference-image edit
    - Reference inputs: one `image` or up to three `images`
    - Aspect ratios: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `2:1`,
      `1:2`, `19.5:9`, `9:19.5`, `20:9`, `9:20`
    - Resolutions: `1K`, `2K`
    - Count: up to 4 images
    - Default operation timeout: 600 seconds unless `image_generate.timeoutMs`
      or `agents.defaults.imageGenerationModel.timeoutMs` is set

    OpenClaw 会向 xAI 请求 `b64_json` 图像响应，以便生成的媒体可以
    通过常规的通道附件路径存储和传递。本地图像参考会被转换为数据 URL；远程
    `http(s)` 参考会原样透传。

    要将 xAI 用作默认图像提供方：

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "xai/grok-imagine-image",
          },
        },
      },
    }
    ```

    <Note>
    xAI also documents `quality`, `mask`, `user`, and an `auto` aspect ratio.
    OpenClaw forwards only the shared cross-provider image controls today;
    these native-only knobs are not exposed through `image_generate`.
    </Note>

  </Accordion>

  <Accordion title="文本转语音">
    内置的 `xai` 插件通过共享的 `tts`
    提供方接口注册文本转语音功能。

    - Voices: authenticated live catalog from xAI; list it with
      `openclaw infer tts voices --provider xai`
    - Offline fallback voices: `ara`, `eve`, `leo`, `rex`, `sal`
    - Default voice: `eve`
    - Account custom voice IDs are forwarded even when they are absent from the
      built-in catalog response
    - Formats: `mp3`, `wav`, `pcm`, `mulaw`, `alaw`
    - Language: BCP-47 code or `auto`
    - Speed: provider-native speed override
    - Native Opus voice-note format is not supported

    要将 xAI 用作默认 TTS 提供方：

    ```json5
    {
      messages: {
        tts: {
          provider: "xai",
          providers: {
            xai: {
              voiceId: "eve",
            },
          },
        },
      },
    }
    ```

    <Note>
    OpenClaw uses xAI's batch `/v1/tts` endpoint for buffered synthesis,
    authenticated `/v1/tts/voices` catalog discovery, and native
    `wss://api.x.ai/v1/tts` for streaming synthesis. Streaming is restricted to
    the native `api.x.ai` host, so custom `baseUrl` values are rejected on this
    path. It uses the existing language, voice, codec, and speed controls; xAI
    defaults apply to sample rate and bit rate. Audio-file synthesis honors all
    configured codecs. Voice-note targets use MP3 for streaming and buffered
    fallback because xAI's raw codecs do not carry codec/rate metadata. The
    stream sends `text.delta` then
    `text.done`, receives `audio.delta`, `audio.done`, or `error`, and applies an
    idle `timeoutMs` that refreshes for every audio chunk. It is separate from
    realtime voice sessions. See xAI's [Streaming TTS API](https://docs.x.ai/developers/rest-api-reference/inference/voice) contract.
    </Note>

  </Accordion>

  <Accordion title="语音转文本">
    内置的 `xai` 插件通过 OpenClaw 的
    媒体理解转录接口注册批量语音转文本功能。

    - Endpoint: xAI REST `/v1/stt`
    - Input path: multipart audio file upload
    - Model selection: xAI chooses the transcription model internally; the
      endpoint has no model selector
    - Used wherever inbound audio transcription reads `tools.media.audio`,
      including Discord voice-channel segments and channel audio attachments

    要强制入站音频转录使用 xAI：

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "xai",
              },
            ],
          },
        },
      },
    }
    ```

    Language can be supplied through the shared audio media config or per-call
    transcription request. Prompt hints are accepted by the shared OpenClaw
    surface, but the xAI REST STT integration forwards only file and language
    because those map to the current public xAI endpoint.

  </Accordion>

  <Accordion title="流式语音转文本">
    内置的 `xai` 插件还为实时语音通话音频注册了一个实时转录提供方。

    - 端点：xAI WebSocket `wss://api.x.ai/v1/stt`
    - 默认编码：`mulaw`
    - 默认采样率：`8000`
    - 默认 endpointing：`800ms`
    - 中间转录：默认启用

    Voice Call 的 Twilio 媒体流发送的是 G.711 mu-law 音频帧，因此
    xAI 提供方会直接转发这些帧而不进行转码：

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              streaming: {
                enabled: true,
                provider: "xai",
                providers: {
                  xai: {
                    apiKey: "${XAI_API_KEY}",
                    endpointingMs: 800,
                    language: "en",
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

    提供方专属配置位于
    `plugins.entries.voice-call.config.streaming.providers.xai` 下。支持的
    键有 `apiKey`、`baseUrl`、`sampleRate`、`encoding`（`pcm`、`mulaw` 或
    `alaw`）、`interimResults`、`endpointingMs` 和 `language`。

    <Note>
    此流式提供方用于 Voice Call 的实时转录路径。
    Discord 语音会录制短片段，并改用批量
    `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="Realtime voice (Talk)">
    The bundled `xai` plugin registers Grok Voice Agent realtime sessions for
    Talk mode through the shared `registerRealtimeVoiceProvider` contract.

    - Endpoint: `wss://api.x.ai/v1/realtime?model=<voice-model>`
    - Default model: `grok-voice-latest`
    - Default voice: `eve`
    - Transport: `gateway-relay` (iOS, Android, and Control UI relay paths)
    - Audio: PCM16 24 kHz or G.711 µ-law 8 kHz
    - Barge-in: xAI server VAD interrupts the response; OpenClaw clears queued playback
      and truncates unplayed provider history

    Configure Talk on the Gateway:

    ```json5
    {
      talk: {
        realtime: {
          provider: "xai",
          mode: "realtime",
          transport: "gateway-relay",
          brain: "agent-consult",
          providers: {
            xai: {
              model: "grok-voice-latest",
              voice: "eve",
              // Opt in only if provider-side session replay is acceptable.
              sessionResumption: false,
            },
          },
        },
      },
      env: { XAI_API_KEY: "xai-..." },
    }
    ```

    Provider-owned config also resolves from
    `plugins.entries.voice-call.config.realtime.providers.xai` when Voice Call
    or shared realtime selectors reuse the same provider map. Supported keys are
    `apiKey`, `baseUrl`, `model`, `voice`, `vadThreshold`, `silenceDurationMs`,
    `prefixPaddingMs`, `reasoningEffort`, and `sessionResumption`.
    `reasoningEffort` accepts only `high` or `none`, matching the xAI Voice Agent API.

    xAI's server VAD always creates responses and handles audio interruption.
    Use `consultRouting: "provider-direct"`; forced transcript routing and disabling
    input-audio interruption are not supported by the xAI Voice Agent protocol.

    <Note>
    xAI OAuth or `XAI_API_KEY` can authenticate realtime voice. Browser-owned
    WebRTC is not part of this provider surface yet; use gateway-relay Talk on
    native nodes or the Control UI relay path.
    </Note>

    <Note>
    `sessionResumption` defaults to `false`. When set to `true`, OpenClaw asks
    xAI to retain enough session state to resume the same conversation after a
    reconnect and then reconnects with the returned conversation id. Leave it
    disabled when provider-side replay/retention is not acceptable; interrupted
    sockets then fail closed instead of silently starting a fresh conversation.
    </Note>

  </Accordion>

  <Accordion title="x_search configuration">
    The bundled xAI plugin exposes `x_search` as an OpenClaw tool for
    searching X (formerly Twitter) content via Grok.

    配置路径：`plugins.entries.xai.config.xSearch`

    | Key               | Type    | Default                   | Description                                      |
    | ----------------- | ------- | ------------------------- | ------------------------------------------------ |
    | `enabled`         | boolean | Automatic for xAI models  | Disable, or opt in for a known non-xAI provider |
    | `model`           | string  | `grok-4.3`                | Model used for x_search requests                 |
    | `baseUrl`         | string  | -                         | xAI Responses base URL override                  |
    | `inlineCitations` | boolean | -                         | Include inline citations in results              |
    | `maxTurns`        | number  | -                         | Maximum conversation turns                       |
    | `timeoutSeconds`  | number  | `30`                      | Request timeout in seconds                       |
    | `cacheTtlMinutes` | number  | `15`                      | Cache time-to-live in minutes                    |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4.3",
                baseUrl: "https://api.x.ai/v1",
                inlineCitations: true,
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="代码执行配置">
    内置的 xAI 插件将 `code_execution` 暴露为一个 OpenClaw 工具，用于
    在 xAI 沙箱环境中远程执行代码。

    配置路径：`plugins.entries.xai.config.codeExecution`

    | Key              | Type    | Default                  | Description                                      |
    | ---------------- | ------- | ------------------------ | ------------------------------------------------ |
    | `enabled`        | boolean | Automatic for xAI models | Disable, or opt in for a known non-xAI provider |
    | `model`          | string  | `grok-4.3`               | Model used for code execution requests           |
    | `maxTurns`       | number  | -                        | Maximum conversation turns                       |
    | `timeoutSeconds` | number  | `30`                     | Request timeout in seconds                       |

    <Note>
    这是远程 xAI 沙箱执行，不是本地 [`exec`](/tools/exec)。
    </Note>

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4.3",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Known limits">
    - xAI auth can use an API key, environment variable, plugin config
      fallback, or OAuth with an eligible xAI account. OAuth uses device-code
      verification without a localhost callback. xAI decides which accounts
      can receive OAuth API tokens, and the consent page may show Grok Build
      even though OpenClaw does not require the Grok Build app.
    - OpenClaw does not currently expose the xAI multi-agent model family. xAI
      serves these models through the Responses API, but they do not accept
      the client-side or custom tools used by OpenClaw's shared agent loop.
      See the
      [xAI multi-agent limitations](https://docs.x.ai/developers/model-capabilities/text/multi-agent#limitations).
    - xAI Realtime voice currently exposes gateway-relay Talk transport only.
      Browser-owned provider WebSocket sessions are not wired in the Control UI
      yet.
    - xAI image `quality`, image `mask`, and extra native-only aspect ratios are
      not exposed until the shared `image_generate` tool has corresponding
      cross-provider controls.
  </Accordion>

  <Accordion title="Advanced notes">
    - OpenClaw applies xAI-specific tool-schema and tool-call compatibility
      fixes automatically on the shared runner path.
    - Native xAI requests default `tool_stream: true`. Set
      `agents.defaults.models["xai/<model>"].params.tool_stream` to `false`
      to disable it.
    - The bundled xAI wrapper strips unsupported contains-count schema bounds
      and unsupported reasoning *effort* payload keys before sending native
      xAI requests. Grok 4.5 supports low, medium, and
      high effort (default high). Grok 4.3 supports none, low, medium, and high
      effort (default low). Other reasoning-capable xAI models do not expose a
      configurable effort control, but still request
      `include: ["reasoning.encrypted_content"]` so prior encrypted reasoning
      can be replayed on follow-up turns.
    - `web_search`, `x_search`, and `code_execution` are exposed as OpenClaw
      tools. OpenClaw attaches only the specific xAI built-in each tool needs
      to that tool's request instead of attaching every native tool to every
      chat turn.
    - Grok `web_search` reads `plugins.entries.xai.config.webSearch.baseUrl`.
      `x_search` reads `plugins.entries.xai.config.xSearch.baseUrl`, then
      falls back to the Grok web-search base URL.
    - `x_search` and `code_execution` are owned by the bundled xAI plugin
      rather than hardcoded into the core model runtime.
    - `code_execution` is remote xAI sandbox execution, not local
      [`exec`](/tools/exec).
  </Accordion>
</AccordionGroup>

## 在线测试

xAI 媒体路径由单元测试和可选的在线测试套件覆盖。运行在线探测前，
请先在进程环境中导出 `XAI_API_KEY`。

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_XAI_VIDEO=1 pnpm test:live -- extensions/xai/xai.live.test.ts -t "classic Grok Imagine"
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_XAI_VIDEO=1 pnpm test:live -- extensions/xai/xai.live.test.ts -t "Grok Imagine Video 1.5"
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/x-search.live.test.ts
OPENCLAW_LIVE_GATEWAY_MODELS="xai/grok-4.5,xai/grok-build-0.1,xai/grok-4.3,xai/grok-4.20-0309-reasoning,xai/grok-4.20-0309-non-reasoning" OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0 OPENCLAW_LIVE_GATEWAY_SMOKE=0 pnpm test:live -- src/gateway/gateway-models.profiles.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

The provider-specific live file synthesizes normal TTS, telephony-friendly PCM
TTS, transcribes audio through xAI batch STT, streams the same PCM through xAI
realtime STT, generates text-to-image output, and edits a reference image.
The shared image live file verifies the same xAI provider through OpenClaw's
runtime selection, fallback, normalization, and media attachment path. The
opt-in Video 1.5 case submits one generated first-frame image at 1080P and
verifies the completed video download.

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享的视频工具参数和提供商选择。
  </Card>
  <Card title="所有提供商" href="/providers/index" icon="grid-2">
    更广泛的提供商概览。
  </Card>
  <Card title="故障排除" href="/help/troubleshooting" icon="wrench">
    常见问题及修复方法。
  </Card>
</CardGroup>
