---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - 你想在 OpenClaw 中使用 Grok 模型
  - 你正在配置 xAI 认证或模型 ID
title: "xAI"
---

OpenClaw 附带了一个内置的 `xai` 提供方插件，用于 Grok 模型。对于大多数
用户，推荐的方式是使用符合条件的 SuperGrok 或 X Premium
订阅进行 Grok OAuth。OpenClaw 保持本地优先：Gateway、配置、路由和
工具都运行在你的机器上，而 Grok 模型请求则通过 xAI 进行身份验证，
并发送到 xAI 的 API。

OAuth 不需要 xAI API 密钥，也不需要 Grok Build
应用。xAI 在同意页面上仍可能显示 Grok Build，因为 OpenClaw 使用了
xAI 的共享 OAuth 客户端。

## 选择你的设置路径

使用与你的 OpenClaw 安装状态相匹配的路径：

<Steps>
  <Step title="全新 OpenClaw 安装">
    在设置新的本地 Gateway 时，运行带 daemon 安装的 onboarding，然后在模型/认证步骤中选择 xAI/Grok OAuth 选项：

    ```bash
    openclaw onboard --install-daemon
    ```

    在 VPS 上或通过 SSH 时，请在 onboarding 期间使用 device-code：

    ```bash
    openclaw onboard --install-daemon --auth-choice xai-device-code
    ```

    OAuth 不需要 xAI API 密钥。OpenClaw 不需要 Grok
    Build 应用。xAI 在同意页面上仍可能将应用标记为 Grok Build，因为
    OpenClaw 使用了 xAI 的共享 OAuth 客户端。

  </Step>
  <Step title="现有 OpenClaw 安装">
    如果 OpenClaw 已经配置好，只需登录 xAI。不要为了连接 Grok 而重新运行完整
    onboarding 或重新安装 daemon：

    ```bash
    openclaw models auth login --provider xai --method oauth
    ```

    当 Gateway 运行在 SSH、Docker 或 VPS 上，而 localhost 浏览器回调不方便时，请改用
    device-code 流程：

    ```bash
    openclaw models auth login --provider xai --device-code
    ```

    如果你想在登录后将 Grok 设为默认模型，请单独应用：

    ```bash
    openclaw models set xai/grok-4.3
    ```

    只有在你有意更改 Gateway、daemon、channel、workspace 或其他设置选项时，才重新运行完整 onboarding。

  </Step>
  <Step title="API 密钥路径">
    API 密钥设置仍然适用于 xAI Console 密钥，以及需要基于密钥的提供方配置的媒体表面：

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
OpenClaw 使用 xAI Responses API 作为内置的 xAI 传输层。通过
`openclaw models auth login --provider xai --method oauth`、
`openclaw models auth login --provider xai --device-code` 或
`openclaw models auth login --provider xai --method api-key` 获取的同一凭证，也可以用于一等公民的
`web_search`、`x_search`、远程 `code_execution` 以及 xAI 图像/视频生成。
语音和转录目前需要 `XAI_API_KEY` 或提供方配置。
基于 Grok 的 `web_search` 优先使用 xAI OAuth，并在没有时回退到 `XAI_API_KEY` 或
插件 web-search 配置。
如果你将 xAI 密钥存储在 `plugins.entries.xai.config.webSearch.apiKey` 下，
内置的 xAI 模型提供方也会将该密钥作为备用复用。
将 `plugins.entries.xai.config.webSearch.baseUrl` 设置为通过运营商 xAI Responses 代理路由 Grok 的 `web_search`
，并且默认情况下也会路由 `x_search`。
`code_execution` 的调优位于 `plugins.entries.xai.config.codeExecution` 下。
</Note>

## OAuth 故障排查

- 如果浏览器 OAuth 无法访问 `127.0.0.1:56121`，请使用
  `openclaw models auth login --provider xai --device-code`。
- 如果登录成功但 Grok 不是默认模型，请运行
  `openclaw models set xai/grok-4.3`。
- 要检查已保存的 xAI 认证配置文件，请运行：

  ```bash
  openclaw models auth list --provider xai
  openclaw models status
  ```

- xAI 决定哪些账户可以接收 OAuth API 令牌。如果某个账户不符合
  条件，请尝试 API 密钥路径，或检查 xAI 侧的订阅状态。

<Tip>
在通过 SSH、Docker 或 VPS 登录时，请使用 `xai-device-code`。OpenClaw
会打印一个 xAI URL 和短代码；在任意本地浏览器中完成登录，而远程进程会轮询 xAI 以等待
完成令牌交换。
</Tip>

## 内置目录

OpenClaw 默认包含当前的 xAI 聊天模型，并在模型选择器中按
最新优先排序：

| 家族            | 模型 ID                                                                 |
| -------------- | ------------------------------------------------------------------------ |
| Grok Build 0.1 | `grok-build-0.1`                                                         |
| Grok 4.3       | `grok-4.3`                                                               |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |

该插件仍会为现有配置正向解析旧的 Grok 3、Grok 4、Grok 4 Fast、Grok 4.1
Fast 和 Grok Code slug。官方 Grok Code Fast 别名会规范化为 `grok-build-0.1`；OpenClaw 不再在可选目录中显示其他已退役的
上游 slug。

<Tip>
一般聊天请使用 `grok-4.3`，构建/编码导向的工作负载请使用 `grok-build-0.1`，除非你明确需要 Grok 4.20 beta 别名。
</Tip>

## OpenClaw 功能覆盖

捆绑的插件将 xAI 当前的公共 API 表面映射到 OpenClaw 共享的
提供方和工具契约上。不符合共享契约的能力
（例如流式 TTS 和实时语音）不会暴露——见下表。

| xAI 能力                  | OpenClaw 接口                          | 状态                                                              |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| Chat / Responses           | `xai/<model>` model provider              | 是                                                                 |
| Server-side web search     | `web_search` provider `grok`              | 是                                                                 |
| Server-side X search       | `x_search` tool                           | 是                                                                 |
| Server-side code execution | `code_execution` tool                     | 是                                                                 |
| Images                     | `image_generate`                          | 是                                                                 |
| Videos                     | `video_generate`                          | 是                                                                 |
| Batch text-to-speech       | `messages.tts.provider: "xai"` / `tts`    | 是                                                                 |
| Streaming TTS              | -                                         | 未暴露；OpenClaw 的 TTS 契约返回完整音频缓冲区 |
| Batch speech-to-text       | `tools.media.audio` / media understanding | 是                                                                 |
| Streaming speech-to-text   | Voice Call `streaming.provider: "xai"`    | 是                                                                 |
| Realtime voice             | -                                         | 目前未暴露；不同的会话/WebSocket 契约               |
| Files / batches            | Generic model API compatibility only      | 不是 OpenClaw 的一等公民工具                                     |

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
| `grok-code-fast-1`        | `grok-build-0.1`                      |
| `grok-code-fast`          | `grok-build-0.1`                      |
| `grok-code-fast-1-0825`   | `grok-build-0.1`                      |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

<AccordionGroup>
  <Accordion title="Web search">
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
    - 额外模型：`xai/grok-imagine-image-quality`
    - 模式：text-to-image 和 reference-image edit
    - 参考输入：一个 `image` 或最多五个 `images`
    - 长宽比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 分辨率：`1K`、`2K`
    - 数量：最多 4 张图像
    - 默认操作超时：600 秒，除非设置了 `image_generate.timeoutMs`
      或 `agents.defaults.imageGenerationModel.timeoutMs`

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
              speakerVoiceId: "eve",
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
    | `enabled`          | boolean | -                  | 启用或禁用 x_search                  |
    | `model`            | string  | `grok-4-1-fast`    | 用于 x_search 请求的模型              |
    | `baseUrl`          | string  | -                  | xAI Responses 基础 URL 覆盖          |
    | `inlineCitations`  | boolean | -                  | 在结果中包含行内引用                  |
    | `maxTurns`         | number  | -                  | 最大对话轮数                          |
    | `timeoutSeconds`   | number  | -                  | 请求超时时间（秒）                   |
    | `cacheTtlMinutes`  | number  | -                  | 缓存生存时间（分钟）                 |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
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

    | 键               | 类型    | 默认值            | 说明                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (if key available) | 启用或禁用代码执行            |
    | `model`           | string  | `grok-4-1-fast`    | 用于代码执行请求的模型         |
    | `maxTurns`        | number  | -                  | 最大对话轮数               |
    | `timeoutSeconds`  | number  | -                  | 请求超时时间（秒）               |

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
    - xAI 认证可以使用 API 密钥、环境变量、插件配置回退、
      浏览器 OAuth，或适用于符合条件的 xAI 账户的 device-code OAuth。浏览器
      OAuth 使用 `127.0.0.1:56121` 上的本地回调；对于远程主机，请使用
      `xai-device-code`，除非你想在打开登录 URL 之前转发该端口。xAI 决定哪些账户可以接收 OAuth API 令牌，而
      同意页面可能会显示 Grok Build，尽管 OpenClaw 不需要
      Grok Build 应用。
    - `grok-4.20-multi-agent-experimental-beta-0304` 在
      常规 xAI 提供方路径上不受支持，因为它需要与标准 OpenClaw xAI 传输
      不同的上游 API 表面。
    - xAI Realtime voice 目前还没有注册为 OpenClaw 提供方。它
      需要与批量 STT 或流式转录不同的双向语音会话契约。
    - xAI 图像的 `quality`、图像 `mask` 和额外的仅原生长宽比在共享的
      `image_generate` 工具具备相应的跨提供方控制之前不会暴露。
  </Accordion>

  <Accordion title="高级说明">
    - OpenClaw 会在共享运行器路径上自动应用 xAI 特定的工具 schema 和工具调用兼容性修复。
    - 原生 xAI 请求默认 `tool_stream: true`。将
      `agents.defaults.models["xai/<model>"].params.tool_stream` 设为 `false` 可
      禁用它。
    - 捆绑的 xAI 包装器会在发送原生 xAI 请求之前移除不受支持的严格工具 schema 标志和
      推理负载键。
    - `web_search`、`x_search` 和 `code_execution` 作为 OpenClaw
      工具暴露。OpenClaw 会在每个工具请求中启用其所需的特定 xAI 内置能力，而不是把所有原生工具都附加到每一轮聊天中。
    - Grok 的 `web_search` 会读取 `plugins.entries.xai.config.webSearch.baseUrl`。
      `x_search` 会读取 `plugins.entries.xai.config.xSearch.baseUrl`，然后
      回退到 Grok 网页搜索基础 URL。
    - `x_search` 和 `code_execution` 由捆绑的 xAI 插件负责，而不是硬编码到核心模型运行时中。
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
