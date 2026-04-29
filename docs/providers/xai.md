---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - 你想在 OpenClaw 中使用 Grok 模型
  - 你正在配置 xAI 认证或模型 ID
title: "xAI"
---

OpenClaw 随附一个内置的 `xai` 提供方插件，用于 Grok 模型。

## 快速开始

<Steps>
  <Step title="创建 API 密钥">
    在 [xAI 控制台](https://console.x.ai/) 中创建一个 API 密钥。
  </Step>
  <Step title="设置你的 API 密钥">
    设置 `XAI_API_KEY`，或者运行：

    ```bash
    openclaw onboard --auth-choice xai-api-key
    ```

  </Step>
  <Step title="选择一个模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4" } } },
    }
    ```
  </Step>
</Steps>

<Note>
OpenClaw 使用 xAI Responses API 作为内置的 xAI 传输层。相同的
`XAI_API_KEY` 也可用于支持 Grok 的 `web_search`、一等公民级 `x_search`
以及远程 `code_execution`。
如果你将 xAI 密钥存储在 `plugins.entries.xai.config.webSearch.apiKey` 下，
内置的 xAI 模型提供方也会将该密钥作为后备复用。
`code_execution` 的调优配置位于 `plugins.entries.xai.config.codeExecution`。
</Note>

## 内置目录

OpenClaw 默认包含以下 xAI 模型家族：

| 家族            | 模型 ID                                                                 |
| -------------- | ------------------------------------------------------------------------ |
| Grok 3         | `grok-3`, `grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`               |
| Grok 4         | `grok-4`, `grok-4-0709`                                                  |
| Grok 4 Fast    | `grok-4-fast`, `grok-4-fast-non-reasoning`                               |
| Grok 4.1 Fast  | `grok-4-1-fast`, `grok-4-1-fast-non-reasoning`                           |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |
| Grok Code      | `grok-code-fast-1`                                                       |

当新的 `grok-4*` 和 `grok-code-fast*` ID 具有相同的 API 结构时，该插件也会向前解析它们。

<Tip>
`grok-4-fast`、`grok-4-1-fast` 和 `grok-4.20-beta-*` 变体是当前内置目录中支持图像能力的 Grok 引用。
</Tip>

## OpenClaw 功能覆盖

内置插件将 xAI 当前公开的 API 面映射到 OpenClaw 共享的提供方和工具契约上。那些不符合共享契约的能力
（例如流式 TTS 和实时语音）不会暴露出来——请参见下表。

| xAI 能力                  | OpenClaw 接口                          | 状态                                                              |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| 聊天 / Responses          | `xai/<model>` 模型提供方               | 是                                                                 |
| 服务端网页搜索            | `web_search` 提供方 `grok`              | 是                                                                 |
| 服务端 X 搜索             | `x_search` 工具                           | 是                                                                 |
| 服务端代码执行            | `code_execution` 工具                     | 是                                                                 |
| 图像                      | `image_generate`                          | 是                                                                 |
| 视频                      | `video_generate`                          | 是                                                                 |
| 批量文本转语音            | `messages.tts.provider: "xai"` / `tts`    | 是                                                                 |
| 流式 TTS                  | —                                         | 不暴露；OpenClaw 的 TTS 契约返回完整音频缓冲区 |
| 批量语音转文本            | `tools.media.audio` / 媒体理解           | 是                                                                 |
| 流式语音转文本            | Voice Call `streaming.provider: "xai"`    | 是                                                                 |
| 实时语音                  | —                                         | 目前未暴露；需要不同的会话/WebSocket 契约               |
| 文件 / 批处理             | 仅通用模型 API 兼容性                     | 不是 OpenClaw 的一等公民工具                                      |

<Note>
OpenClaw 使用 xAI 的 REST 图像/视频/TTS/STT API 来进行媒体生成、语音和批量转录，
使用 xAI 的流式 STT WebSocket 来进行实时语音通话转录，并使用 Responses API 来支持模型、
搜索和代码执行工具。需要不同 OpenClaw 契约的功能，例如 Realtime 语音会话，
会在这里作为上游能力进行文档说明，而不是隐藏的插件行为。
</Note>

### 快速模式映射

`/fast on` 或 `agents.defaults.models["xai/<model>"].params.fastMode: true`
会将原生 xAI 请求重写如下：

| 源模型        | 快速模式目标     |
| ------------- | ------------------ |
| `grok-3`      | `grok-3-fast`      |
| `grok-3-mini` | `grok-3-mini-fast` |
| `grok-4`      | `grok-4-fast`      |
| `grok-4-0709` | `grok-4-fast`      |

### 旧版兼容别名

旧版别名仍会规范化为内置的标准 ID：

| 旧别名                    | 标准 ID                               |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

<AccordionGroup>
  <Accordion title="网页搜索">
    内置的 `grok` 网页搜索提供方也会使用 `XAI_API_KEY`：

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="视频生成">
    内置的 `xai` 插件通过共享的
    `video_generate` 工具注册视频生成功能。

    - 默认视频模型：`xai/grok-imagine-video`
    - 模式：文本转视频、图像转视频、参考图像生成、远程
      视频编辑，以及远程视频扩展
    - 宽高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`
    - 分辨率：`480P`、`720P`
    - 时长：生成/图像转视频时为 1-15 秒，使用
      `reference_image` 角色时为 1-10 秒，扩展时为 2-10 秒
    - 参考图像生成：将每个提供的图像的 `imageRoles` 设置为 `reference_image`；xAI 最多接受 7 张此类图像

    <Warning>
    不支持本地图像缓冲区。用于视频编辑/扩展输入时请使用远程 `http(s)` URL。
    图像转视频接受本地图像缓冲区，因为 OpenClaw 可以将其编码为适用于 xAI 的 data URL。
    </Warning>

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
    有关共享工具参数、提供方选择和故障转移行为，请参见[视频生成](/tools/video-generation)。
    </Note>

  </Accordion>

  <Accordion title="图像生成">
    内置的 `xai` 插件通过共享的
    `image_generate` 工具注册图像生成功能。

    - 默认图像模型：`xai/grok-imagine-image`
    - 额外模型：`xai/grok-imagine-image-pro`
    - 模式：文本转图像和参考图像编辑
    - 参考输入：一个 `image` 或最多五个 `images`
    - 宽高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 分辨率：`1K`、`2K`
    - 数量：最多 4 张图像

    OpenClaw 会向 xAI 请求 `b64_json` 图像响应，以便生成的媒体可以
    通过常规的频道附件路径进行存储和传递。本地参考图像会被转换为 data URL；远程 `http(s)` 参考会直接传递。

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
    xAI 还记录了 `quality`、`mask`、`user`，以及额外的原生比例
    如 `1:2`、`2:1`、`9:20` 和 `20:9`。OpenClaw 目前仅转发共享的跨提供方图像控制项；
    不支持的仅原生参数不会通过 `image_generate` 暴露。
    </Note>

  </Accordion>

  <Accordion title="文本转语音">
    内置的 `xai` 插件通过共享的 `tts`
    提供方接口注册文本转语音功能。

    - 音色：`eve`、`ara`、`rex`、`sal`、`leo`、`una`
    - 默认音色：`eve`
    - 格式：`mp3`、`wav`、`pcm`、`mulaw`、`alaw`
    - 语言：BCP-47 代码或 `auto`
    - 速度：提供方原生速度覆盖
    - 不支持原生 Opus 语音便笺格式

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
    OpenClaw 使用 xAI 的批量 `/v1/tts` 端点。xAI 也提供通过 WebSocket 的流式 TTS，
    但 OpenClaw 的语音提供方契约当前要求在返回回复前先获得完整音频缓冲区。
    </Note>

  </Accordion>

  <Accordion title="语音转文本">
    内置的 `xai` 插件通过 OpenClaw 的
    媒体理解转录接口注册批量语音转文本功能。

    - 默认模型：`grok-stt`
    - 端点：xAI REST `/v1/stt`
    - 输入路径：multipart 音频文件上传
    - 当传入音频转录使用 `tools.media.audio` 时由 OpenClaw 支持，包括 Discord 语音频道片段和
      频道音频附件

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
                model: "grok-stt",
              },
            ],
          },
        },
      },
    }
    ```

    语言可以通过共享的音频媒体配置或逐次转录请求提供。共享的 OpenClaw
    接口接受提示词提示，但 xAI REST STT 集成只会转发文件、模型和
    语言，因为这些与当前公开的 xAI 端点能很好地对应。

  </Accordion>

  <Accordion title="流式语音转文本">
    内置的 `xai` 插件还为实时语音通话音频注册了一个实时转录提供方。

    - 端点：xAI WebSocket `wss://api.x.ai/v1/stt`
    - 默认编码：`mulaw`
    - 默认采样率：`8000`
    - 默认 endpointing：`800ms`
    - 中间转录：默认启用

    Voice Call 的 Twilio 媒体流发送的是 G.711 µ-law 音频帧，因此
    xAI 提供方可以直接转发这些帧而无需转码：

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
    该流式提供方用于 Voice Call 的实时转录路径。
    Discord 语音当前会录制短片段，并改用批量
    `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="x_search 配置">
    内置的 xAI 插件将 `x_search` 暴露为一个 OpenClaw 工具，用于通过 Grok 搜索
    X（原 Twitter）内容。

    配置路径：`plugins.entries.xai.config.xSearch`

    | 键                 | 类型    | 默认值             | 说明                                 |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | —                  | 启用或禁用 x_search                   |
    | `model`            | string  | `grok-4-1-fast`    | 用于 x_search 请求的模型              |
    | `inlineCitations`  | boolean | —                  | 在结果中包含行内引用                  |
    | `maxTurns`         | number  | —                  | 最大对话轮数                          |
    | `timeoutSeconds`   | number  | —                  | 请求超时时间（秒）                    |
    | `cacheTtlMinutes`  | number  | —                  | 缓存存活时间（分钟）                  |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
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

    | 键               | 类型    | 默认值            | 说明                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true`（如果密钥可用） | 启用或禁用代码执行  |
    | `model`           | string  | `grok-4-1-fast`    | 用于代码执行请求的模型   |
    | `maxTurns`        | number  | —                  | 最大对话轮数               |
    | `timeoutSeconds`  | number  | —                  | 请求超时时间（秒）               |

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
                model: "grok-4-1-fast",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="已知限制">
    - 目前仅支持 API 密钥认证。OpenClaw 还没有 xAI OAuth 或设备码流程。
    - `grok-4.20-multi-agent-experimental-beta-0304` 在常规 xAI 提供方路径上不受支持，
      因为它需要与标准 OpenClaw xAI 传输层不同的上游 API 面。
    - xAI Realtime 语音尚未作为 OpenClaw 提供方注册。它需要比批量 STT 或
      流式转录更不同的双向语音会话契约。
    - xAI 图像的 `quality`、图像 `mask` 以及额外的仅原生宽高比在共享的 `image_generate` 工具具备相应的
      跨提供方控制之前不会暴露。
  </Accordion>

  <Accordion title="高级说明">
    - OpenClaw 会在共享运行路径上自动应用 xAI 特定的工具 schema 和工具调用兼容性修复。
    - 原生 xAI 请求默认 `tool_stream: true`。将
      `agents.defaults.models["xai/<model>"].params.tool_stream` 设置为 `false` 可将其禁用。
    - 内置的 xAI 包装器会在发送原生 xAI 请求前移除不受支持的 strict 工具 schema 标志和
      reasoning 负载键。
    - `web_search`、`x_search` 和 `code_execution` 会作为 OpenClaw
      工具暴露。OpenClaw 会在每次工具请求中启用所需的特定 xAI 内置能力，而不是在每轮聊天中附加所有原生工具。
    - `x_search` 和 `code_execution` 归内置的 xAI 插件所有，而不是硬编码到核心模型运行时中。
    - `code_execution` 是远程 xAI 沙箱执行，不是本地
      [`exec`](/tools/exec)。
  </Accordion>
</AccordionGroup>

## 在线测试

xAI 媒体路径由单元测试和可选的在线套件覆盖。在线
命令会在探测 `XAI_API_KEY` 之前，从你的登录 shell 中加载密钥，包括 `~/.profile`。

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

按提供方区分的在线文件会合成普通 TTS、适用于电话的 PCM TTS，通过 xAI 批量 STT 转录音频，
通过 xAI 实时 STT 流式传输相同的 PCM，生成文本到图像输出，并编辑参考图像。
共享的图像在线文件通过 OpenClaw 的运行时选择、回退、规范化和媒体附件路径验证同一个 xAI 提供方。

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
