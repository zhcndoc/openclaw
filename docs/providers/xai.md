---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - 你想在 OpenClaw 中使用 Grok 模型
  - 你正在配置 xAI 认证或模型 ID
title: "xAI"
---

OpenClaw 随附一个打包的 `xai` 提供者插件，用于 Grok 模型。

## 入门指南

<Steps>
  <Step title="创建 API 密钥">
    在 [xAI 控制台](https://console.x.ai/) 中创建 API 密钥。
  </Step>
  <Step title="设置 API 密钥">
    设置 `XAI_API_KEY`，或运行：

    ```bash
    openclaw onboard --auth-choice xai-api-key
    ```

  </Step>
  <Step title="选择模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4" } } },
    }
    ```
  </Step>
</Steps>

<Note>
OpenClaw 使用 xAI Responses API 作为打包的 xAI 传输层。同一个
`XAI_API_KEY` 也可以支持由 Grok 支持的 `web_search`、一流的 `x_search`
和远程 `code_execution`。
如果您将 xAI 密钥存储在 `plugins.entries.xai.config.webSearch.apiKey` 下，
打包的 xAI 模型提供者也会将该密钥作为备用密钥重用。
`code_execution` 调整位于 `plugins.entries.xai.config.codeExecution` 下。
</Note>

## 内置目录

OpenClaw 开箱即用地包含以下 xAI 模型系列：

| 系列           | 模型 ID                                                                |
| -------------- | ------------------------------------------------------------------------ |
| Grok 3         | `grok-3`, `grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`               |
| Grok 4         | `grok-4`, `grok-4-0709`                                                  |
| Grok 4 Fast    | `grok-4-fast`, `grok-4-fast-non-reasoning`                               |
| Grok 4.1 Fast  | `grok-4-1-fast`, `grok-4-1-fast-non-reasoning`                           |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |
| Grok Code      | `grok-code-fast-1`                                                       |

当它们遵循相同的 API 形状时，该插件还会向前解析更新的 `grok-4*` 和 `grok-code-fast*` ID。

<Tip>
`grok-4-fast`、`grok-4-1-fast` 和 `grok-4.20-beta-*` 变体是
打包目录中当前支持图像的 Grok 引用。
</Tip>

## OpenClaw 功能覆盖

打包的插件将 xAI 当前的公共 API 表面映射到 OpenClaw 的共享
提供者和工具契约上。不符合共享契约的功能
（例如流式 TTS 和实时语音）不会暴露出来——请参见下表。

| xAI 功能                  | OpenClaw 表面                          | 状态                                                              |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------- |
| 聊天 / Responses         | `xai/<model>` 模型提供者              | 是                                                                 |
| 服务端 web 搜索          | `web_search` 提供者 `grok`            | 是                                                                 |
| 服务端 X 搜索             | `x_search` 工具                           | 是                                                                 |
| 服务端代码执行            | `code_execution` 工具                     | 是                                                                 |
| 图像                     | `image_generate`                          | 是                                                                 |
| 视频                     | `video_generate`                          | 是                                                                 |
| 批量文本转语音            | `messages.tts.provider: "xai"` / `tts`    | 是                                                                 |
| 流式 TTS                 | —                                         | 未公开；OpenClaw 的 TTS 契约返回完整音频缓冲区 |
| 批量语音转文本            | `tools.media.audio` / 媒体理解          | 是                                                                 |
| 流式语音转文本            | Voice Call `streaming.provider: "xai"`    | 是                                                                 |
| 实时语音                  | —                                         | 目前未公开；需要不同的会话/WebSocket 契约               |
| 文件 / 批处理             | 仅通用模型 API 兼容性                     | 不是 OpenClaw 的一等工具                                     |

<Note>
OpenClaw 使用 xAI 的 REST 图像/视频/TTS/STT API 进行媒体生成、
语音和批量转写，使用 xAI 的流式 STT WebSocket 进行实时
语音通话转写，并使用 Responses API 处理模型、搜索和
代码执行工具。需要不同 OpenClaw 契约的功能，例如
实时语音会话，在这里作为上游能力进行记录，而不是作为隐藏的插件行为。
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

旧版别名仍会规范化为规范的打包 ID：

| 旧版别名              | 规范 ID                          |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

<AccordionGroup>
  <Accordion title="Web 搜索">
    打包的 `grok` web-search 提供者也使用 `XAI_API_KEY`：

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="视频生成">
    打包的 `xai` 插件通过共享的
    `video_generate` 工具注册视频生成。

    - 默认视频模型：`xai/grok-imagine-video`
    - 模式：文本转视频、图像转视频、远程视频编辑和远程视频
      扩展
    - 宽高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`
    - 分辨率：`480P`、`720P`
    - 时长：生成/图像转视频为 1-15 秒，扩展为 2-10 秒

    <Warning>
    不接受本地视频缓冲区。视频编辑/扩展输入请使用远程 `http(s)` URL。图像转视频接受本地图像缓冲区，因为
    OpenClaw 可以将其编码为供 xAI 使用的数据 URL。
    </Warning>

    要将 xAI 用作默认视频提供者：

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
    请参阅 [视频生成](/tools/video-generation) 以了解共享工具参数、
    提供者选择和故障转移行为。
    </Note>

  </Accordion>

  <Accordion title="图像生成">
    打包的 `xai` 插件通过共享的
    `image_generate` 工具注册图像生成。

    - 默认图像模型：`xai/grok-imagine-image`
    - 附加模型：`xai/grok-imagine-image-pro`
    - 模式：文本转图像和参考图像编辑
    - 参考输入：1 张 `image` 或最多 5 张 `images`
    - 宽高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 分辨率：`1K`、`2K`
    - 数量：最多 4 张图像

    OpenClaw 会向 xAI 请求 `b64_json` 图像响应，以便生成的媒体可以
    通过常规频道附件路径存储和传递。本地
    参考图像会转换为数据 URL；远程 `http(s)` 参考会被
    原样传递。

    要将 xAI 用作默认图像提供者：

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
    xAI 还记录了 `quality`、`mask`、`user` 以及额外的原生比例，
    例如 `1:2`、`2:1`、`9:20` 和 `20:9`。OpenClaw 目前只转发
    共享的跨提供者图像控制项；不支持的仅原生控制项会有意不通过 `image_generate` 暴露。
    </Note>

  </Accordion>

  <Accordion title="文本转语音">
    打包的 `xai` 插件通过共享的 `tts`
    提供者表面注册文本转语音。

    - 语音：`eve`、`ara`、`rex`、`sal`、`leo`、`una`
    - 默认语音：`eve`
    - 格式：`mp3`、`wav`、`pcm`、`mulaw`、`alaw`
    - 语言：BCP-47 代码或 `auto`
    - 速度：提供者原生速度覆盖
    - 不支持原生 Opus 语音笔记格式

    要将 xAI 用作默认 TTS 提供者：

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
    OpenClaw 使用 xAI 的批量 `/v1/tts` 端点。xAI 也通过 WebSocket
    提供流式 TTS，但 OpenClaw 的语音提供者契约当前要求在返回前
    先获得完整音频缓冲区。
    </Note>

  </Accordion>

  <Accordion title="语音转文本">
    打包的 `xai` 插件通过 OpenClaw 的
    媒体理解转写表面注册批量语音转文本。

    - 默认模型：`grok-stt`
    - 端点：xAI REST `/v1/stt`
    - 输入路径：multipart 音频文件上传
    - 在 OpenClaw 任何使用 `tools.media.audio` 进行入站音频转写的场景中均受支持，
      包括 Discord 语音频道片段和频道音频附件

    要强制入站音频转写使用 xAI：

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

    语言可以通过共享音频媒体配置或按调用
    转写请求提供。共享 OpenClaw 表面接受提示信息，
    但 xAI REST STT 集成只转发文件、模型和
    语言，因为这些与当前公开的 xAI 端点能够良好匹配。

  </Accordion>

  <Accordion title="流式语音转文本">
    打包的 `xai` 插件还会为实时语音通话音频注册一个实时转写提供者。

    - 端点：xAI WebSocket `wss://api.x.ai/v1/stt`
    - 默认编码：`mulaw`
    - 默认采样率：`8000`
    - 默认端点化：`800ms`
    - 中间转写：默认启用

    Voice Call 的 Twilio 媒体流发送 G.711 µ-law 音频帧，因此
    xAI 提供者可以直接转发这些帧而无需转码：

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

    提供者自有配置位于
    `plugins.entries.voice-call.config.streaming.providers.xai` 下。支持的
    键为 `apiKey`、`baseUrl`、`sampleRate`、`encoding`（`pcm`、`mulaw` 或
    `alaw`）、`interimResults`、`endpointingMs` 和 `language`。

    <Note>
    这个流式提供者用于 Voice Call 的实时转写路径。
    Discord 语音目前会录制短片段，并改用批量
    `tools.media.audio` 转写路径。
    </Note>

  </Accordion>

  <Accordion title="x_search 配置">
    打包的 xAI 插件将 `x_search` 作为 OpenClaw 工具公开，用于通过 Grok 搜索
    X（原 Twitter）内容。

    配置路径：`plugins.entries.xai.config.xSearch`

    | 键                | 类型    | 默认值            | 描述                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | —                  | 启用或禁用 x_search           |
    | `model`            | string  | `grok-4-1-fast`    | 用于 x_search 请求的模型     |
    | `inlineCitations`  | boolean | —                  | 在结果中包含行内引用  |
    | `maxTurns`         | number  | —                  | 最大对话轮次           |
    | `timeoutSeconds`   | number  | —                  | 请求超时（秒）           |
    | `cacheTtlMinutes`  | number  | —                  | 缓存生存时间（分钟）        |

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
    打包的 xAI 插件将 `code_execution` 暴露为 OpenClaw 工具，用于
    在 xAI 的沙盒环境中进行远程代码执行。

    配置路径：`plugins.entries.xai.config.codeExecution`

    | 键               | 类型    | 默认值            | 描述                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (如果该键可用) | 启用或禁用代码执行  |
    | `model`           | string  | `grok-4-1-fast`    | 用于代码执行请求的模型   |
    | `maxTurns`        | number  | —                  | 最大对话轮次               |
    | `timeoutSeconds`  | number  | —                  | 请求超时（秒）               |

    <Note>
    这是远程 xAI 沙盒执行，而非本地 [`exec`](/tools/exec)。
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
    - 目前仅支持 API 密钥认证。OpenClaw 目前还不支持 xAI OAuth 或设备码流程。
    - `grok-4.20-multi-agent-experimental-beta-0304` 不支持在常规 xAI 提供者路径上使用，因为它需要不同于标准 OpenClaw xAI 传输层的上游 API 表面。
    - xAI Realtime 语音尚未注册为 OpenClaw 提供者。它需要与批量 STT 或流式转写不同的双向语音会话契约。
    - xAI 图像的 `quality`、图像 `mask` 以及额外的仅原生宽高比，在共享 `image_generate` 工具具备相应的跨提供者控制项之前不会暴露。
  </Accordion>

  <Accordion title="高级说明">
    - OpenClaw 会在共享运行器路径上自动应用 xAI 特定的工具模式和工具调用兼容性修复。
    - 原生 xAI 请求默认 `tool_stream: true`。将
      `agents.defaults.models["xai/<model>"].params.tool_stream` 设置为 `false` 以
      禁用它。
    - 打包的 xAI 包装器在发送原生 xAI 请求之前会剥离不支持的严格工具模式标志和
      推理负载键。
    - `web_search`、`x_search` 和 `code_execution` 作为 OpenClaw
      工具暴露。OpenClaw 在每个工具请求内部启用所需的特定 xAI 内置功能，而不是将所有原生工具附加到每个聊天轮次。
    - `x_search` 和 `code_execution` 归属于打包的 xAI 插件，而不是
      硬编码到核心模型运行时中。
    - `code_execution` 是远程 xAI 沙盒执行，而非本地
      [`exec`](/tools/exec)。
  </Accordion>
</AccordionGroup>

## 实时测试

xAI 媒体路径已由单元测试和可选的实时测试套件覆盖。实时
命令会在探测 `XAI_API_KEY` 之前，从你的登录 shell 中加载密钥，
包括 `~/.profile`。

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

按提供者划分的实时文件会合成常规 TTS、适合电话系统的 PCM TTS，通过 xAI 批量 STT 转写音频，通过 xAI
实时 STT 流式传输相同的 PCM，生成文本转图像输出，并编辑参考图像。共享的图像实时文件通过 OpenClaw 的
运行时选择、回退、规范化和媒体附件路径验证同一个 xAI 提供者。

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供者、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供者选择。
  </Card>
  <Card title="所有提供者" href="/providers/index" icon="grid-2">
    更广泛的提供者概述。
  </Card>
  <Card title="故障排除" href="/help/troubleshooting" icon="wrench">
    常见问题和修复。
  </Card>
</CardGroup>