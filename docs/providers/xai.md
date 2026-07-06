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

模型选择器中的可选 ID。该插件仍会为现有配置解析旧的 Grok 3、
Grok 4、Grok 4 Fast、Grok 4.1 Fast 和 Grok Code ID；
请参见 [旧版兼容别名](#legacy-compatibility-aliases)。

| 家族            | 模型 ID                                                                 |
| -------------- | ------------------------------------------------------------------------ |
| Grok Build 0.1 | `grok-build-0.1`                                                         |
| Grok 4.3       | `grok-4.3`                                                               |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |

<Tip>
一般聊天请使用 `grok-4.3`，面向构建/编码的工作负载请使用 `grok-build-0.1`，除非你需要 Grok 4.20 beta 别名。
</Tip>

## 功能覆盖

捆绑插件将 xAI 当前公开的 API 表面映射到 OpenClaw 的
共享 provider 和 tool 合约上。不符合共享
合约的能力，例如流式 TTS 和实时语音，不会被暴露。

| xAI 能力                    | OpenClaw 接口                          | 状态                                                              |
| --------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| Chat / Responses           | `xai/<model>` model provider            | 是                                                                 |
| Server-side web search     | `web_search` provider `grok`            | 是                                                                 |
| Server-side X search       | `x_search` tool                         | 是                                                                 |
| Server-side code execution | `code_execution` tool                   | 是                                                                 |
| Images                     | `image_generate`                        | 是                                                                 |
| Videos                     | `video_generate`                        | 是                                                                 |
| Batch text-to-speech       | `messages.tts.provider: "xai"` / `tts`  | 是                                                                 |
| Streaming TTS              | -                                       | 未暴露；OpenClaw 的 TTS 合约返回完整音频缓冲区 |
| Batch speech-to-text       | `tools.media.audio` media understanding | 是                                                                 |
| Streaming speech-to-text   | Voice Call `streaming.provider: "xai"`  | 是                                                                 |
| Realtime voice             | -                                       | 目前未暴露；需要不同的 session/WebSocket 合约       |
| Files / batches            | Generic model API compatibility only    | 不是 OpenClaw 的一级工具                                     |

<Note>
OpenClaw 使用 xAI 的 REST 图像/视频/TTS/STT API 进行媒体生成和
批量转录，使用 xAI 的流式 STT WebSocket 进行实时语音通话
转录，并使用 Responses API 处理聊天、搜索和代码执行
工具。
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

旧版别名会规范化为标准的捆绑 id：

| Legacy alias                                                                | Canonical id                          |
| --------------------------------------------------------------------------- | ------------------------------------- |
| `grok-code-fast-1`, `grok-code-fast`, `grok-code-fast-1-0825`               | `grok-build-0.1`                      |
| `grok-4-fast-reasoning`                                                     | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning`                                                   | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`, `grok-4.20-experimental-beta-0304-reasoning`         | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning`, `grok-4.20-experimental-beta-0304-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

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

    - 默认视频模型：`xai/grok-imagine-video`
    - 模式：text-to-video、image-to-video、reference-image generation、remote
      video edit 和 remote video extension
    - 长宽比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`
    - 分辨率：`480P`、`720P`
    - 时长：生成/image-to-video 为 1-15 秒，使用
      `reference_image` 角色时为 1-10 秒，扩展为 2-10 秒
    - 参考图像生成：将每个提供的图像的 `imageRoles` 设为 `reference_image`；xAI 最多接受 7 张此类图像
    - 默认操作超时：600 秒，除非设置了 `video_generate.timeoutMs`
      或 `agents.defaults.videoGenerationModel.timeoutMs`

    <Warning>
    本地视频缓冲区不被接受。视频编辑/扩展输入请使用远程 `http(s)` URL。
    Image-to-video 接受本地图像缓冲区，因为 OpenClaw 会将其编码为数据 URL 供 xAI 使用。
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
    有关共享工具参数、提供方选择和回退行为，请参见 [视频生成](/tools/video-generation)。
    </Note>

  </Accordion>

  <Accordion title="图像生成">
    内置的 `xai` 插件通过共享的
    `image_generate` 工具注册图像生成功能。

    - 默认图像模型：`xai/grok-imagine-image`
    - 额外模型：`xai/grok-imagine-image-quality`
    - 模式：text-to-image 和 reference-image edit
    - 参考输入：一个 `image` 或最多五个 `images`
    - 长宽比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 分辨率：`1K`、`2K`
    - 数量：最多 4 张图像
    - 默认操作超时：600 秒，除非设置了 `image_generate.timeoutMs`
      或 `agents.defaults.imageGenerationModel.timeoutMs`

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
    xAI 还文档化了 `quality`、`mask`、`user` 以及额外的原生比例，
    如 `1:2`、`2:1`、`9:20` 和 `20:9`。OpenClaw 目前只转发共享的跨提供方
    图像控制项；这些仅限原生的选项不会通过 `image_generate` 暴露。
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
    OpenClaw 使用 xAI 的批量 `/v1/tts` 端点。xAI 也通过 WebSocket 提供流式
    TTS，但 OpenClaw 的语音提供方契约目前要求在回复交付前先获得完整音频缓冲区。
    </Note>

  </Accordion>

  <Accordion title="语音转文本">
    内置的 `xai` 插件通过 OpenClaw 的
    媒体理解转录接口注册批量语音转文本功能。

    - Default model: `grok-stt`
    - Endpoint: xAI REST `/v1/stt`
    - Input path: multipart audio file upload
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
                model: "grok-stt",
              },
            ],
          },
        },
      },
    }
    ```

    语言可以通过共享的音频媒体配置或按次转录请求提供。OpenClaw 的共享接口接受提示
    暗示，但 xAI REST STT 集成只会转发文件、模型和语言，因为这些与当前公开的 xAI
    端点能很好地对应。

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

  <Accordion title="x_search 配置">
    捆绑的 xAI 插件将 `x_search` 暴露为一个 OpenClaw 工具，用于
    通过 Grok 搜索 X（原 Twitter）内容。

    配置路径：`plugins.entries.xai.config.xSearch`

    | Key               | Type    | Default                       | Description                          |
    | ----------------- | ------- | ------------------------------ | ------------------------------------- |
    | `enabled`         | boolean | `true` (if key available)     | 启用或禁用 x_search              |
    | `model`           | string  | `grok-4-1-fast-non-reasoning` | x_search 请求所用模型              |
    | `baseUrl`         | string  | -                              | xAI Responses 基础 URL 覆盖      |
    | `inlineCitations` | boolean | -                              | 在结果中包含行内引用                |
    | `maxTurns`        | number  | -                              | 最大对话轮数                        |
    | `timeoutSeconds`  | number  | `30`                           | 请求超时（秒）                      |
    | `cacheTtlMinutes` | number  | `15`                           | 缓存生存时间（分钟）                |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast-non-reasoning",
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

    | Key              | Type    | Default                  | Description                            |
    | ---------------- | ------- | ------------------------ | ---------------------------------------- |
    | `enabled`        | boolean | `true` (if key available) | 启用或禁用代码执行                 |
    | `model`          | string  | `grok-4-1-fast`           | 代码执行请求所用模型              |
    | `maxTurns`       | number  | -                        | 最大对话轮数                          |
    | `timeoutSeconds` | number  | `30`                     | 请求超时（秒）                          |

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
    - xAI 认证可以使用 API key、环境变量、插件配置回退或适用的 xAI 账户 OAuth。
      OAuth 使用设备码验证，不带 localhost 回调。xAI 决定哪些账户可以接收 OAuth API 令牌，
      同意页面可能显示 Grok Build，即使 OpenClaw 并不需要 Grok Build 应用。
    - OpenClaw 目前不支持 xAI 多智能体模型系列。xAI 通过 Responses API 提供这些模型，
      但它们不接受 OpenClaw 共享 agent loop 所使用的客户端工具或自定义工具。
      参见
      [xAI multi-agent limitations](https://docs.x.ai/developers/model-capabilities/text/multi-agent#limitations)。
    - xAI Realtime voice 尚未作为 OpenClaw 提供方注册。它需要一种不同的双向语音会话契约，
      而不是批量 STT 或流式转录。
    - xAI 图像 `quality`、图像 `mask` 以及额外的仅原生比例，在共享的 `image_generate`
      工具拥有对应的跨提供方控制项之前都不会暴露。
  </Accordion>

  <Accordion title="高级说明">
    - OpenClaw 会在共享运行器路径上自动应用 xAI 专用的工具模式和工具调用兼容性修复。
    - 原生 xAI 请求默认 `tool_stream: true`。将
      `agents.defaults.models["xai/<model>"].params.tool_stream` 设为 `false`
      可将其禁用。
    - 捆绑的 xAI 包装器会在发送原生 xAI 请求前移除不受支持的严格工具模式标志
      和 reasoning *effort* 负载键。只有 `grok-4.3` / `grok-4.3-*` 声明了可配置的
      reasoning effort；所有其他具备推理能力的 xAI 模型仍会请求
      `include: ["reasoning.encrypted_content"]`，以便在后续轮次中回放先前的加密推理。
    - `web_search`、`x_search` 和 `code_execution` 作为 OpenClaw 工具暴露。
      OpenClaw 只会将每个工具所需的特定 xAI 内置能力附加到该工具的请求上，
      而不是在每一轮对话中附加所有原生工具。
    - Grok `web_search` 会读取 `plugins.entries.xai.config.webSearch.baseUrl`。
      `x_search` 会读取 `plugins.entries.xai.config.xSearch.baseUrl`，然后
      回退到 Grok web-search 基础 URL。
    - `x_search` 和 `code_execution` 由捆绑的 xAI 插件拥有，而不是硬编码在核心模型运行时中。
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
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

提供方专属的在线测试文件会合成普通 TTS、适合电话的 PCM TTS，通过 xAI 批量 STT 转录音频，
通过 xAI 实时 STT 流式传输同样的 PCM，生成 text-to-image 输出，并编辑参考图像。
共享的图像在线测试文件会通过 OpenClaw 的运行时选择、回退、归一化和媒体附件路径验证同一个 xAI 提供方。

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
