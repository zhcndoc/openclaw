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

模型选择器中的可选 id。对于现有配置，插件仍然会解析较旧的 Grok 3、
Grok 4、Grok 4 Fast、Grok 4.1 Fast 和 Grok Code 的 id；
参见 [旧版兼容性和迁移别名](#legacy-compatibility-and-moving-aliases)。

| Family         | Model ids                                                    |
| -------------- | ------------------------------------------------------------ |
| Grok 4.5       | `grok-4.5`（别名：`grok-4.5-latest`、`grok-build-latest`） |
| Grok Build 0.1 | `grok-build-0.1`                                             |
| Grok 4.3       | `grok-4.3`（别名：`grok-4.3-latest`、`grok-latest`）       |
| Grok 4.20      | `grok-4.20-0309-reasoning`、`grok-4.20-0309-non-reasoning`   |

<Tip>
在可用时，通用聊天、编码和代理式工作请使用 `grok-4.5`。
Grok 4.3 仍然是区域安全设置的默认值；`grok-build-0.1` 和两个
带日期的 Grok 4.20 变体仍可选择。
</Tip>

目录上下文和 token 成本元数据遵循 xAI 的实时
[模型页面](https://docs.x.ai/developers/models)和
[定价页面](https://docs.x.ai/developers/pricing)。当请求超过其文档中的长上下文阈值时，xAI 会收取更高费率；
OpenClaw 的固定目录成本字段记录的是短上下文费率。Grok Build，xAI 旗下独立的
编码代理 CLI，可在 [x.ai/cli](https://x.ai/cli) 获取，目前
使用 Grok 4.5。

## 功能覆盖

捆绑插件将受支持的 xAI API 映射到 OpenClaw 的共享 provider 和
tool 合约。那些不符合共享合约的能力列在
下方或已知限制中。

| xAI 能力                   | OpenClaw 表面                          | 状态                                               |
| -------------------------- | ------------------------------------- | -------------------------------------------------- |
| 聊天 / Responses           | `xai/<model>` 模型 provider           | 是                                                 |
| 服务端网页搜索             | `web_search` provider `grok`          | 是                                                 |
| 服务端 X 搜索               | `x_search` tool                       | 是                                                 |
| 服务端代码执行              | `code_execution` tool                 | 是                                                 |
| 图片                       | `image_generate`                      | 是                                                 |
| 视频                       | `video_generate`                      | 是                                                 |
| 批量文本转语音             | `tts.provider: "xai"` / `tts`         | 是                                                 |
| 流式 TTS                   | `textToSpeechStream`                  | 是，通过 `wss://api.x.ai/v1/tts`（不是实时语音）      |
| 批量语音转文本             | `tools.media.audio` 媒体理解          | 是                                                 |
| 流式语音转文本             | Voice Call `streaming.provider: "xai"` | 是                                                 |
| 实时语音                   | Talk `talk.realtime.provider: "xai"`   | 是；原生 Talk 节点使用 gateway-relay               |
| 文件 / 批处理              | 仅通用模型 API 兼容性                  | 不是 OpenClaw 的一等公民 tool                      |

<Note>
OpenClaw 使用 xAI 的 REST image/video/TTS/STT API 进行媒体生成和
批量转录，使用 xAI 的流式 STT WebSocket 进行实时语音通话
转录，使用 xAI 的 Grok Voice Agent WebSocket 进行 Talk 实时会话，
并使用 Responses API 处理聊天、搜索和代码执行工具。
</Note>

### 旧版 fast-mode 兼容性

`/fast on` 或 `agents.defaults.models["xai/<model>"].params.fastMode: true`
仍会按如下方式重写旧的 xAI 配置。这些目标 id
仅为兼容而保留；新的配置请使用当前可选模型。

| 源模型        | 快速模式目标     |
| ------------- | ------------------ |
| `grok-3`      | `grok-3-fast`      |
| `grok-3-mini` | `grok-3-mini-fast` |
| `grok-4`      | `grok-4-fast`      |
| `grok-4-0709` | `grok-4-fast`      |

### 旧版兼容性与迁移别名

较旧的别名会按如下方式归一化：

| 旧别名                                                     | 归一化后的 id   |
| ---------------------------------------------------------- | ---------------- |
| `grok-code-fast-1`, `grok-code-fast`, `grok-code-fast-1-0825` | `grok-build-0.1` |

带日期的 0309 id 是可选目录条目。OpenClaw 会将其他
当前 Grok 4.20 别名原样发送，因此 xAI 仍可控制 stable、latest、
beta、experimental 和 dated 别名语义。全局 `grok-latest` 别名也
会原样保留。

xAI 已退役以下精确 id。OpenClaw 将它们作为隐藏的兼容
行保留，以支持已发布的配置，并使用其当前
重定向目标的限制和定价：

| 已退役 id                                                           | 当前行为                      |
| ------------------------------------------------------------------- | ----------------------------- |
| `grok-4-1-fast-reasoning`, `grok-4-fast-reasoning`, `grok-4-0709`   | 启用 `low` 推理的 Grok 4.3    |
| `grok-4-1-fast-non-reasoning`, `grok-4-fast-non-reasoning`, `grok-3` | 禁用推理的 Grok 4.3          |
| `grok-code-fast-1`                                                  | Grok Build 0.1               |
| `grok-imagine-image-pro`                                            | Grok Imagine Image Quality   |

`openclaw doctor --fix` 会更新已持久化的 xAI server-tool 默认值和
已退役的质量图片 slug，移除过时的生成目录行，并修复
活动 4.20 行上的过时上下文元数据。它不会将活动的 4.20
`beta-latest` 别名固定到某个日期快照。

## 功能

<Warning>
  `x_search` 和 `code_execution` 运行在 xAI 的服务器上。xAI 按每 1,000
  次工具调用收取 5 美元，外加模型的输入和输出 token 费用。对于每个工具，
  如果省略 `enabled` 设置，OpenClaw 仅在激活的 xAI 模型下暴露它。已知的
  非 xAI 模型提供方需要显式设置每个工具的 `enabled: true`；缺失或无法解析
  的提供方会默认关闭。始终需要 xAI 认证，且 `enabled: false` 会对所有提供方
  禁用该工具。
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

    - 默认模型：`xai/grok-imagine-video`
    - 额外模型：`xai/grok-imagine-video-1.5`
    - 经典模式：文本转视频、图像转视频、参考图像生成、
      远程视频编辑和远程视频扩展
    - Video 1.5 模式：仅支持图像转视频，且必须恰好提供一张首帧图像
    - 宽高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`；
      经典模式和 Video 1.5 图像转视频在省略时会继承源图像的宽高比
    - 分辨率：经典模式为 `480P`/`720P`；Video 1.5 也支持 `1080P`；所有
      生成模式默认 `480P`
    - 时长：生成/图像转视频为 1-15 秒，使用经典 `reference_image` 角色时
      为 1-10 秒，经典扩展为 2-10 秒
    - 参考图像生成：将每张提供的图像的 `imageRoles` 设为
      `reference_image`；xAI 最多接受 7 张此类图像
    - 视频编辑/扩展会继承输入视频的宽高比和分辨率；
      这些操作不接受几何形状覆盖
    - 默认操作超时：600 秒，除非设置了 `video_generate.timeoutMs`
      或 `agents.defaults.mediaModels.video.timeoutMs`

    <Warning>
    本地视频缓冲区不被接受。视频编辑/扩展输入请使用远程 `http(s)` URL。
    Image-to-video 接受本地图像缓冲区，因为 OpenClaw 会将其编码为数据 URL 供 xAI 使用。
    </Warning>

    Video 1.5 还识别 xAI 的 `grok-imagine-video-1.5-preview` 和
    `grok-imagine-video-1.5-2026-05-30` 标识符。OpenClaw 会原样转发
    选定的标识符，但会应用相同的仅图像验证。

    要将 xAI 用作默认视频提供方：

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

    - 默认图像模型：`xai/grok-imagine-image`
    - 额外模型：`xai/grok-imagine-image-quality`
    - 模式：文本转图像和参考图像编辑
    - 参考输入：一张 `image` 或最多三张 `images`
    - 宽高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`、`2:1`、
      `1:2`、`19.5:9`、`9:19.5`、`20:9`、`9:20`
    - 分辨率：`1K`、`2K`
    - 数量：最多 4 张图像
    - 默认操作超时：600 秒，除非设置了 `image_generate.timeoutMs`
      或 `agents.defaults.mediaModels.image.timeoutMs`

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
    xAI 也记录了 `quality`、`mask`、`user` 和一个 `auto` 宽高比。
    OpenClaw 目前仅转发共享的跨提供方图像控制；这些仅原生支持的参数
    还不会通过 `image_generate` 暴露。
    </Note>

  </Accordion>

  <Accordion title="文本转语音">
    内置的 `xai` 插件通过共享的 `tts`
    提供方接口注册文本转语音功能。

    - 语音：来自 xAI 的已认证实时目录；使用
      `openclaw infer tts voices --provider xai` 列出
    - 离线回退语音：`ara`、`eve`、`leo`、`rex`、`sal`
    - 默认语音：`eve`
    - 即使账号自定义语音 ID 不在内置目录响应中，也会继续透传
    - 格式：`mp3`、`wav`、`pcm`、`mulaw`、`alaw`
    - 语言：BCP-47 代码或 `auto`
    - 速度：提供方原生速度覆盖
    - 不支持原生 Opus 语音备注格式

    要将 xAI 用作默认 TTS 提供方：

    ```json5
    {
      tts: {
        provider: "xai",
        providers: {
          xai: {
            voiceId: "eve",
          },
        },
      },
    }
    ```

    <Note>
    OpenClaw 使用 xAI 的批量 `/v1/tts` 端点进行缓冲合成，使用已认证的
    `/v1/tts/voices` 目录发现，以及原生 `wss://api.x.ai/v1/tts` 进行流式合成。
    流式合成仅限原生 `api.x.ai` 主机，因此此路径会拒绝自定义 `baseUrl`
    值。它会使用现有的语言、语音、编码和速度控制；采样率和比特率采用 xAI
    默认值。音频文件合成会遵循所有已配置的编码。语音备注目标在流式和缓冲
    回退时都使用 MP3，因为 xAI 的原始编码不携带编码/采样率元数据。
    流会先发送 `text.delta` 然后发送 `text.done`，接收 `audio.delta`、
    `audio.done` 或 `error`，并应用一个在每个音频块到达时刷新的空闲
    `timeoutMs`。它与实时语音会话是分开的。请参见 xAI 的
    [Streaming TTS API](https://docs.x.ai/developers/rest-api-reference/inference/voice) 协议。
    </Note>

  </Accordion>

  <Accordion title="语音转文本">
    内置的 `xai` 插件通过 OpenClaw 的
    媒体理解转录接口注册批量语音转文本功能。

    - 端点：xAI REST `/v1/stt`
    - 输入路径：multipart 音频文件上传
    - 模型选择：xAI 在内部选择转录模型；该
      端点没有模型选择器
    - 适用于所有入站音频转录读取 `tools.media.audio` 的场景，
      包括 Discord 语音频道片段和频道音频附件

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

    语言可以通过共享的音频媒体配置或按调用的转录请求提供。
    共享的 OpenClaw 接口接受提示词提示，但 xAI REST STT 集成仅转发
    文件和语言，因为它们映射到当前公开的 xAI 端点。

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

  <Accordion title="实时语音（Talk）">
    内置的 `xai` 插件通过共享的 `registerRealtimeVoiceProvider` 契约，
    为 Talk 模式注册 Grok Voice Agent 实时会话。

    - 端点：`wss://api.x.ai/v1/realtime?model=<voice-model>`
    - 默认模型：`grok-voice-latest`
    - 默认语音：`eve`
    - 传输：`gateway-relay`（iOS、Android 和 Control UI 中继路径）
    - 音频：PCM16 24 kHz 或 G.711 µ-law 8 kHz
    - 抢话打断：xAI 服务器 VAD 会中断响应；OpenClaw 会清除队列中的播放内容
      并截断未播放的提供方历史记录

    在 Gateway 上配置 Talk：

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
              // 仅在接受提供方侧会话回放时启用。
              sessionResumption: false,
            },
          },
        },
      },
      env: { XAI_API_KEY: "xai-..." },
    }
    ```

    当 Voice Call 或共享实时选择器复用同一提供方映射时，
    提供方拥有的配置也会从 `plugins.entries.voice-call.config.realtime.providers.xai`
    解析。支持的键包括 `apiKey`、`baseUrl`、`model`、`voice`、`vadThreshold`、
    `silenceDurationMs`、`prefixPaddingMs`、`reasoningEffort` 和 `sessionResumption`。
    `reasoningEffort` 仅接受 `high` 或 `none`，与 xAI Voice Agent API 保持一致。

    xAI 的服务器 VAD 会始终创建响应并处理音频中断。
    请使用 `consultRouting: "provider-direct"`；强制转录路由以及禁用输入音频中断
    不受 xAI Voice Agent 协议支持。

    <Note>
    xAI OAuth 或 `XAI_API_KEY` 可用于实时语音认证。浏览器拥有的
    WebRTC 目前不属于该提供方能力范围；请在原生节点或 Control UI 中继路径上
    使用 gateway-relay Talk。
    </Note>

    <Note>
    `sessionResumption` 默认值为 `false`。设为 `true` 时，OpenClaw 会要求
    xAI 保留足够的会话状态，以便在重新连接后恢复同一会话，然后使用返回的
    conversation id 重新连接。当不接受提供方侧回放/保留时，请保持禁用；
    此时被中断的 socket 会直接失败关闭，而不是静默地启动一个新会话。
    </Note>

  </Accordion>

  <Accordion title="x_search 配置">
    捆绑的 xAI 插件将 `x_search` 暴露为一个 OpenClaw 工具，用于
    通过 Grok 搜索 X（原 Twitter）内容。

    配置路径：`plugins.entries.xai.config.xSearch`

    | Key               | Type    | Default                   | Description                                      |
    | ----------------- | ------- | ------------------------- | ------------------------------------------------ |
    | `enabled`         | boolean | 对 xAI 模型自动启用        | 禁用，或为已知的非 xAI 提供方显式启用 |
    | `model`           | string  | `grok-4.3`                | 用于 x_search 请求的模型                        |
    | `baseUrl`         | string  | -                         | xAI Responses 基础 URL 覆盖                     |
    | `inlineCitations` | boolean | -                         | 在结果中包含内联引用                          |
    | `maxTurns`        | number  | -                         | 最大对话轮数                                   |
    | `timeoutSeconds`  | number  | `30`                      | 请求超时（秒）                                 |
    | `cacheTtlMinutes` | number  | `15`                      | 缓存存活时间（分钟）                           |

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
    | `enabled`        | boolean | 对 xAI 模型自动启用      | 禁用，或为已知的非 xAI 提供方显式启用 |
    | `model`          | string  | `grok-4.3`               | 用于代码执行请求的模型                          |
    | `maxTurns`       | number  | -                        | 最大对话轮数                                   |
    | `timeoutSeconds` | number  | `30`                     | 请求超时（秒）                                 |

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

  <Accordion title="已知限制">
    - xAI 认证可以使用 API key、环境变量、插件配置
      回退或适用于合格 xAI 账号的 OAuth。OAuth 使用设备码
      验证，不需要 localhost 回调。xAI 决定哪些账号
      可以获得 OAuth API 令牌，且授权页面可能会显示 Grok Build，
      即使 OpenClaw 并不需要 Grok Build 应用。
    - OpenClaw 目前不暴露 xAI 多代理模型家族。xAI 通过
      Responses API 提供这些模型，但它们不接受 OpenClaw 共享代理循环
      所使用的客户端或自定义工具。
      参见
      [xAI multi-agent limitations](https://docs.x.ai/developers/model-capabilities/text/multi-agent#limitations)。
    - xAI Realtime voice 目前仅暴露 gateway-relay Talk 传输。
      浏览器拥有的提供方 WebSocket 会话尚未在 Control UI 中接入。
    - xAI 图像 `quality`、图像 `mask` 以及额外的仅原生支持的宽高比，
      在共享的 `image_generate` 工具具备相应的跨提供方控制之前不会暴露。
  </Accordion>

  <Accordion title="高级说明">
    - OpenClaw 会在共享运行器路径上自动应用 xAI 特定的工具 schema 和工具调用兼容性
      修复。
    - 原生 xAI 请求默认 `tool_stream: true`。将
      `agents.defaults.models["xai/<model>"].params.tool_stream` 设为 `false`
      可将其禁用。
    - 捆绑的 xAI 包装器会在发送原生 xAI 请求前，移除不受支持的 contains-count schema
      边界和不受支持的 reasoning *effort* 载荷键。Grok 4.5 支持 low、medium 和
      high effort（默认 high）。Grok 4.3 支持 none、low、medium 和 high
      effort（默认 low）。其他具备推理能力的 xAI 模型不提供可配置的 effort
      控制，但仍会请求 `include: ["reasoning.encrypted_content"]`，以便之前的
      加密推理可以在后续轮次中回放。
    - `web_search`、`x_search` 和 `code_execution` 作为 OpenClaw
      工具暴露。OpenClaw 只会将每个工具所需的特定 xAI 内置能力附加到该工具的
      请求中，而不是把每个原生工具都附加到每一轮聊天里。
    - Grok `web_search` 读取 `plugins.entries.xai.config.webSearch.baseUrl`。
      `x_search` 读取 `plugins.entries.xai.config.xSearch.baseUrl`，然后
      回退到 Grok web-search 基础 URL。
    - `x_search` 和 `code_execution` 由捆绑的 xAI 插件拥有，而不是硬编码进核心模型运行时。
    - `code_execution` 是远程 xAI 沙箱执行，不是本地
      [`exec`](/tools/exec)。
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

提供方特定的在线文件会生成普通 TTS、适合电话的 PCM TTS，通过 xAI 批量 STT 转录音频，
通过 xAI 实时 STT 流式传输相同的 PCM，生成文生图输出，并编辑参考图像。
共享的图像在线文件通过 OpenClaw 的运行时选择、回退、规范化和媒体附件路径验证同一个 xAI 提供方。
可选的 Video 1.5 用例会提交一张以 1080P 生成的首帧图像，并验证已完成的视频下载。

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
