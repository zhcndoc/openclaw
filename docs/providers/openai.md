---
summary: "通过 API 密钥或 Codex 订阅在 OpenClaw 中使用 OpenAI"
read_when:
  - 您想在 OpenClaw 中使用 OpenAI 模型
  - 您希望使用 Codex 订阅认证而不是 API 密钥
  - 您需要更严格的 GPT-5 代理执行行为
title: "OpenAI"
---

OpenAI 为 GPT 模型提供开发者 API。OpenClaw 支持三种 OpenAI 系路由。模型前缀会选择对应路由：

- **API 密钥** — 直接访问 OpenAI Platform，并按用量计费（`openai/*` 模型）
- **通过 PI 的 Codex 订阅** — 使用 ChatGPT/Codex 登录并享受订阅访问（`openai-codex/*` 模型）
- **Codex app-server harness** — 原生 Codex app-server 执行（`openai/*` 模型，并配合 `agents.defaults.embeddedHarness.runtime: "codex"`）

OpenAI 明确支持在 OpenClaw 等外部工具和工作流中使用订阅 OAuth。

## 快速选择

| 目标                                          | 使用方式                                                 | 说明                                                                         |
| --------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 直接按 API 密钥计费                           | `openai/gpt-5.4`                                         | 设置 `OPENAI_API_KEY`，或运行 OpenAI API 密钥入门流程。                    |
| 使用 ChatGPT/Codex 订阅认证的 GPT-5.5        | `openai-codex/gpt-5.5`                                   | Codex OAuth 的默认 PI 路由。对于订阅配置，这是首选。                        |
| 使用原生 Codex app-server 行为的 GPT-5.5     | `openai/gpt-5.5` 加上 `embeddedHarness.runtime: "codex"` | 使用的是 Codex app-server harness，而不是公开的 OpenAI API 路由。          |
| 图像生成或编辑                                | `openai/gpt-image-2`                                     | 可与 `OPENAI_API_KEY` 或 OpenAI Codex OAuth 一起使用。                     |

<Note>
GPT-5.5 目前可通过订阅/OAuth 路由在 OpenClaw 中使用：
使用 PI 运行器的 `openai-codex/gpt-5.5`，或使用 Codex app-server harness 的
`openai/gpt-5.5`。一旦 OpenAI 在公开 API 中启用 GPT-5.5，`openai/gpt-5.5`
的直接 API 密钥访问也将受支持；在此之前，对于 `OPENAI_API_KEY` 配置，
请使用诸如 `openai/gpt-5.4` 这类支持 API 的模型。
</Note>

<Note>
启用 OpenAI 插件，或选择 `openai-codex/*` 模型，并不会启用随附的 Codex app-server 插件。
只有当您显式选择原生 Codex harness 并使用
`embeddedHarness.runtime: "codex"`，或使用旧版 `codex/*` 模型引用时，OpenClaw 才会启用该插件。
</Note>

## OpenClaw 功能覆盖

| OpenAI 能力              | OpenClaw 接入点                                         | 状态                                                   |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------------ |
| 聊天 / Responses         | `openai/<model>` 模型提供器                              | 是                                                     |
| Codex 订阅模型           | 使用 `openai-codex` OAuth 的 `openai-codex/<model>`     | 是                                                     |
| Codex app-server harness | `openai/<model>` 配合 `embeddedHarness.runtime: codex`   | 是                                                     |
| 服务端网页搜索           | 原生 OpenAI Responses 工具                               | 是，在启用网页搜索且未固定提供器时可用                 |
| 图像                     | `image_generate`                                           | 是                                                     |
| 视频                     | `video_generate`                                           | 是                                                     |
| 文本转语音               | `messages.tts.provider: "openai"` / `tts`                | 是                                                     |
| 批量语音转文本           | `tools.media.audio` / 媒体理解                            | 是                                                     |
| 流式语音转文本           | Voice Call `streaming.provider: "openai"`                 | 是                                                     |
| 实时语音                 | Voice Call `realtime.provider: "openai"` / Control UI Talk | 是                                                     |
| 嵌入                     | memory embedding provider                                  | 是                                                     |

## 入门

选择您首选的认证方法并按照设置步骤操作。

<Tabs>
  <Tab title="API 密钥 (OpenAI 平台)">
    **最适合：** 直接 API 访问和按用量计费。

    <Steps>
      <Step title="获取您的 API 密钥">
        从 [OpenAI 平台仪表板](https://platform.openai.com/api-keys) 创建或复制 API 密钥。
      </Step>
      <Step title="运行入门引导">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        或直接传递密钥：

        ```bash
        openclaw onboard --openai-api-key "$OPENAI_API_KEY"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | 模型引用 | 路由 | 认证 |
    |-----------|-------|------|
    | `openai/gpt-5.4` | 直接 OpenAI Platform API | `OPENAI_API_KEY` |
    | `openai/gpt-5.4-mini` | 直接 OpenAI Platform API | `OPENAI_API_KEY` |
    | `openai/gpt-5.5` | 一旦 OpenAI 在 API 中启用 GPT-5.5 后的未来直接 API 路由 | `OPENAI_API_KEY` |

    <Note>
    `openai/*` 是直接的 OpenAI API 密钥路由，除非您显式强制使用
    Codex app-server harness。GPT-5.5 本身目前仅支持订阅/OAuth；
    对于通过默认 PI 运行器的 Codex OAuth，请使用 `openai-codex/*`。
    </Note>

    ### 配置示例

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
    }
    ```

    <Warning>
    OpenClaw **不**提供 `openai/gpt-5.3-codex-spark`。在线 OpenAI API 请求会拒绝该模型，当前 Codex 目录中也未提供它。
    </Warning>

  </Tab>

  <Tab title="Codex 订阅">
    **最适合：** 使用您的 ChatGPT/Codex 订阅，而不是单独的 API 密钥。Codex 云需要 ChatGPT 登录。

    <Steps>
      <Step title="运行 Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        或直接运行 OAuth：

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        对于无头环境或不适合回调的环境，请添加 `--device-code`，以通过 ChatGPT 设备码流程登录，而不是使用 localhost 浏览器回调：

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="设置默认模型">
        ```bash
        openclaw config set agents.defaults.model.primary openai-codex/gpt-5.5
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider openai-codex
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | 模型引用 | 路由 | 认证 |
    |-----------|-------|------|
    | `openai-codex/gpt-5.5` | 通过 PI 的 ChatGPT/Codex OAuth | Codex 登录 |
    | `openai/gpt-5.5` + `embeddedHarness.runtime: "codex"` | Codex app-server harness | Codex app-server 认证 |

    <Note>
    进行认证/配置文件命令时，请继续使用 `openai-codex` 提供器 ID。
    `openai-codex/*` 模型前缀也是 Codex OAuth 的显式 PI 路由。
    它不会选择或自动启用随附的 Codex app-server harness。
    </Note>

    ### 配置示例

    ```json5
    {
      agents: { defaults: { model: { primary: "openai-codex/gpt-5.5" } } },
    }
    ```

    <Note>
    入门流程不再会从 `~/.codex` 导入 OAuth 材料。请使用浏览器 OAuth（默认）或上面的设备码流程登录——OpenClaw 会在其自己的代理认证存储中管理生成的凭据。
    </Note>

    ### 状态指示器

    聊天中的 `/status` 会显示当前会话正在使用的模型运行时。
    默认 PI harness 显示为 `Runtime: OpenClaw Pi Default`。当选择了
    随附的 Codex app-server harness 时，`/status` 会显示
    `Runtime: OpenAI Codex`。现有会话会保留其已记录的 harness id，因此如果您希望
    `/status` 反映新的 PI/Codex 选择，请在更改 `embeddedHarness` 后使用
    `/new` 或 `/reset`。

    ### 上下文窗口限制

    OpenClaw 将模型元数据和运行时上下文限制视为独立的值。

    对于通过 Codex OAuth 的 `openai-codex/gpt-5.5`：

    - 原生 `contextWindow`：`1000000`
    - 默认运行时 `contextTokens` 上限：`272000`

    较小的默认限制在实践中具有更好的延迟和质量特性。使用 `contextTokens` 覆盖它：

    ```json5
    {
      models: {
        providers: {
          "openai-codex": {
            models: [{ id: "gpt-5.5", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    使用 `contextWindow` 声明原生模型元数据。使用 `contextTokens` 限制运行时上下文预算。
    </Note>

    ### 目录恢复

    当上游 Codex 目录元数据中存在 `gpt-5.5` 时，OpenClaw 会使用它。
    如果在线 Codex 发现结果在账户已认证的情况下遗漏了 `openai-codex/gpt-5.5`
    这一行，OpenClaw 会合成该 OAuth 模型行，因此 cron、sub-agent 和已配置的默认模型运行
    不会因 `Unknown model` 而失败。

  </Tab>
</Tabs>

## 图像生成

随附的 `openai` 插件通过 `image_generate` 工具注册图像生成功能。
它同时支持通过同一个 `openai/gpt-image-2` 模型引用进行 OpenAI API 密钥图像生成和 Codex OAuth 图像生成。

| 功能                      | OpenAI API 密钥                    | Codex OAuth                          |
| ------------------------- | ---------------------------------- | ------------------------------------ |
| 模型引用                  | `openai/gpt-image-2`               | `openai/gpt-image-2`                 |
| 认证                      | `OPENAI_API_KEY`                   | OpenAI Codex OAuth 登录              |
| 传输                      | OpenAI Images API                  | Codex Responses 后端                |
| 每次请求最大图像数        | 4                                  | 4                                    |
| 编辑模式                  | 已启用（最多 5 张参考图像）         | 已启用（最多 5 张参考图像）           |
| 尺寸覆盖                  | 支持，包括 2K/4K 尺寸              | 支持，包括 2K/4K 尺寸                |
| 宽高比 / 分辨率           | 不会转发给 OpenAI Images API       | 在安全时映射为支持的尺寸             |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>
请参阅 [图像生成](/tools/image-generation) 了解共享工具参数、提供器选择和故障转移行为。
</Note>

`gpt-image-2` 是 OpenAI 文生图生成和图像编辑的默认模型。`gpt-image-1` 仍可作为显式模型覆盖使用，但新的 OpenAI 图像工作流应使用 `openai/gpt-image-2`。

对于 Codex OAuth 安装，请保留相同的 `openai/gpt-image-2` 引用。当配置了
`openai-codex` OAuth 配置文件时，OpenClaw 会解析该已存储的 OAuth
访问令牌，并通过 Codex Responses 后端发送图像请求。它不会先尝试
`OPENAI_API_KEY`，也不会在该请求中静默回退到 API 密钥。当您希望直接使用 OpenAI Images API
路由时，请显式配置 `models.providers.openai` 为 API 密钥、
自定义基础 URL 或 Azure 终端。
如果该自定义图像终端位于受信任的 LAN/私有地址，还请设置
`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`；除非启用了该选项，
OpenClaw 会继续阻止私有/内部 OpenAI 兼容图像终端。

生成：

```
/tool image_generate model=openai/gpt-image-2 prompt="一张适用于 macOS 上 OpenClaw 的精美发布海报" size=3840x2160 count=1
```

编辑：

```
/tool image_generate model=openai/gpt-image-2 prompt="保留物体形状，将材质改为半透明玻璃" image=/path/to/reference.png size=1024x1536
```

## 视频生成

捆绑的 `openai` 插件通过 `video_generate` 工具注册视频生成。

| 功能       | 值                                                                             |
| ---------------- | --------------------------------------------------------------------------------- |
| 默认模型    | `openai/sora-2`                                                                   |
| 模式            | 文生视频、图生视频、单视频编辑                                  |
| 参考输入 | 1 张图像或 1 个视频                                                                |
| 大小覆盖   | 支持                                                                         |
| 其他覆盖  | `aspectRatio`、`resolution`、`audio`、`watermark` 将被忽略并附带工具警告 |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>
请参阅 [视频生成](/tools/video-generation) 了解共享工具参数、提供商选择和故障转移行为。
</Note>

## GPT-5 提示词贡献

OpenClaw 为跨提供商的 GPT-5 系列运行添加了共享的 GPT-5 提示词贡献。它按模型 ID 适用，因此 `openai-codex/gpt-5.5`、`openai/gpt-5.4`、`openrouter/openai/gpt-5.5`、`opencode/gpt-5.5` 和其他兼容的 GPT-5 引用都会接收相同的叠加层。较旧的 GPT-4.x 模型不会。

捆绑的原生 Codex 运行器通过 Codex 应用服务器开发者指令使用相同的 GPT-5 行为和心跳叠加层，因此被强制通过 `embeddedHarness.runtime: "codex"` 的 `openai/gpt-5.x` 会话会保留相同的后续跟进和主动心跳指导，即使其余运行器提示词由 Codex 自己管理。

GPT-5 贡献添加了带标签的行为契约，涵盖人格保持、执行安全、工具纪律、输出形态、完成检查和验证。特定通道的回复和静默消息行为仍保留在共享的 OpenClaw 系统提示词和出站交付策略中。GPT-5 指导始终对匹配模型启用。友好的交互风格层是独立且可配置的。

| 值                  | 效果                                      |
| ---------------------- | ------------------------------------------- |
| `"friendly"`（默认） | 启用友好的交互风格层 |
| `"on"`                 | `"friendly"` 的别名                      |
| `"off"`                | 仅禁用友好风格层       |

<Tabs>
  <Tab title="配置">
    ```json5
    {
      agents: {
        defaults: {
          promptOverlays: {
            gpt5: { personality: "friendly" },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="命令行">
    ```bash
    openclaw config set agents.defaults.promptOverlays.gpt5.personality off
    ```
  </Tab>
</Tabs>

<Tip>
运行时值不区分大小写，因此 `"Off"` 和 `"off"` 都会禁用友好风格层。
</Tip>

<Note>
当共享的 `agents.defaults.promptOverlays.gpt5.personality` 设置未设置时，仍会读取旧版 `plugins.entries.openai.config.personality` 作为兼容性回退。
</Note>

## 语音和语音识别

<AccordionGroup>
  <Accordion title="语音合成 (TTS)">
    捆绑的 `openai` 插件为 `messages.tts` 表面注册语音合成。

    | 设置 | 配置路径 | 默认 |
    |---------|------------|---------|
    | 模型 | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | 语音 | `messages.tts.providers.openai.voice` | `coral` |
    | 速度 | `messages.tts.providers.openai.speed` | (未设置) |
    | 指令 | `messages.tts.providers.openai.instructions` | （未设置，仅限 `gpt-4o-mini-tts`） |
    | 格式 | `messages.tts.providers.openai.responseFormat` | 语音笔记为 `opus`，文件为 `mp3` |
    | API 密钥 | `messages.tts.providers.openai.apiKey` | 回退到 `OPENAI_API_KEY` |
    | 基础 URL | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |

    可用模型：`gpt-4o-mini-tts`、`tts-1`、`tts-1-hd`。可用语音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`fable`、`juniper`、`marin`、`onyx`、`nova`、`sage`、`shimmer`、`verse`。

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", voice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    设置 `OPENAI_TTS_BASE_URL` 以覆盖 TTS 基础 URL，而不影响聊天 API 端点。
    </Note>

  </Accordion>

  <Accordion title="语音转文本">
    捆绑的 `openai` 插件通过 OpenClaw 的媒体理解转录表面注册批量语音转文本。

    - 默认模型：`gpt-4o-transcribe`
    - 端点：OpenAI REST `/v1/audio/transcriptions`
    - 输入路径：multipart 音频文件上传
    - 在 OpenClaw 中，凡是入站音频转录使用 `tools.media.audio` 的地方都受支持，包括 Discord 语音频道片段和频道音频附件

    要强制入站音频转录使用 OpenAI：

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "openai",
                model: "gpt-4o-transcribe",
              },
            ],
          },
        },
      },
    }
    ```

    当共享的音频媒体配置或每次调用的转录请求提供语言和提示词提示时，这些内容会转发给 OpenAI。

  </Accordion>

  <Accordion title="实时转录">
    捆绑的 `openai` 插件为 Voice Call 插件注册实时转录。

    | 设置 | 配置路径 | 默认 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | 语言 | `...openai.language` | (未设置) |
    | 提示词 | `...openai.prompt` | (未设置) |
    | 静音持续时间 | `...openai.silenceDurationMs` | `800` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | API 密钥 | `...openai.apiKey` | 回退到 `OPENAI_API_KEY` |

    <Note>
    使用到 `wss://api.openai.com/v1/realtime` 的 WebSocket 连接，并采用 G.711 u-law（`g711_ulaw` / `audio/pcmu`）音频。此流式提供者用于 Voice Call 的实时转录路径；Discord 语音当前会记录短片段并改用批量 `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="实时语音">
    捆绑的 `openai` 插件为语音通话插件注册实时语音。

    | 设置 | 配置路径 | 默认 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-1.5` |
    | 语音 | `...openai.voice` | `alloy` |
    | 温度 | `...openai.temperature` | `0.8` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | 静音持续时间 | `...openai.silenceDurationMs` | `500` |
    | API 密钥 | `...openai.apiKey` | 回退到 `OPENAI_API_KEY` |

    <Note>
    支持通过 `azureEndpoint` 和 `azureDeployment` 配置键使用 Azure OpenAI。支持双向工具调用。使用 G.711 u-law 音频格式。
    </Note>

  </Accordion>
</AccordionGroup>

## Azure OpenAI 端点

捆绑的 `openai` 提供商可以通过覆盖基础 URL，将图像生成目标指向 Azure OpenAI 资源。在图像生成路径上，OpenClaw 会检测 `models.providers.openai.baseUrl` 上的 Azure 主机名，并自动切换为 Azure 的请求形状。

<Note>
实时语音使用单独的配置路径
（`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`）
，不受 `models.providers.openai.baseUrl` 影响。请参阅 [语音和语音识别](#语音和语音识别) 下的 **实时语音** 手风琴以了解其 Azure
设置。
</Note>

在以下情况下使用 Azure OpenAI：

- 你已经拥有 Azure OpenAI 订阅、额度或企业协议
- 你需要 Azure 提供的区域数据驻留或合规控制
- 你希望将流量保留在现有 Azure 租户内

### 配置

要通过捆绑的 `openai` 提供商使用 Azure 图像生成，请将
`models.providers.openai.baseUrl` 指向你的 Azure 资源，并将 `apiKey` 设置为
Azure OpenAI 密钥（而不是 OpenAI Platform 密钥）：

```json5
{
  models: {
    providers: {
      openai: {
        baseUrl: "https://<your-resource>.openai.azure.com",
        apiKey: "<azure-openai-api-key>",
      },
    },
  },
}
```

OpenClaw 识别以下 Azure 主机后缀用于 Azure 图像生成
路由：

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

对于在识别出的 Azure 主机上的图像生成请求，OpenClaw：

- 发送 `api-key` 标头，而不是 `Authorization: Bearer`
- 使用部署作用域路径（`/openai/deployments/{deployment}/...`）
- 为每个请求附加 `?api-version=...`

其他基础 URL（公共 OpenAI、OpenAI 兼容代理）会保持标准的
OpenAI 图像请求形状。

<Note>
`openai` 提供商的图像生成路径的 Azure 路由要求
OpenClaw 2026.4.22 或更高版本。更早版本会将任何自定义
`openai.baseUrl` 视为公共 OpenAI 端点，并在 Azure
图像部署上失败。
</Note>

### API 版本

设置 `AZURE_OPENAI_API_VERSION` 以为 Azure 图像生成路径固定特定的 Azure 预览版或 GA 版本：

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

当该变量未设置时，默认值为 `2024-12-01-preview`。

### 模型名称即部署名称

Azure OpenAI 将模型绑定到部署。对于通过捆绑的 `openai` 提供商路由的 Azure 图像生成请求，OpenClaw 中的 `model` 字段必须是你在 Azure 门户中配置的 **Azure 部署名称**，而不是公共 OpenAI 模型 ID。

如果你创建了一个名为 `gpt-image-2-prod`、提供 `gpt-image-2` 的部署：

```
/tool image_generate model=openai/gpt-image-2-prod prompt="一张干净的海报" size=1024x1024 count=1
```

同样的部署名称规则也适用于通过捆绑的 `openai` 提供商路由的图像生成调用。

### 区域可用性

Azure 图像生成当前仅在部分区域可用
（例如 `eastus2`、`swedencentral`、`polandcentral`、`westus3`、
`uaenorth`）。在创建部署之前请查看 Microsoft 当前的区域列表，并确认该特定模型在你的区域中提供。

### 参数差异

Azure OpenAI 和公共 OpenAI 并不总是接受相同的图像参数。Azure 可能会拒绝公共 OpenAI 允许的选项（例如 `gpt-image-2` 上的某些 `background` 值），或者仅在特定模型版本上公开这些选项。这些差异来自 Azure 和底层模型，而不是 OpenClaw。如果某个 Azure 请求因验证错误而失败，请在 Azure 门户中检查你的特定部署和 API 版本所支持的参数集。

<Note>
Azure OpenAI 使用原生传输和兼容行为，但不会接收
OpenClaw 的隐藏归属标头——请参阅 [高级配置](#高级配置) 下的 **原生路线与 OpenAI 兼容路线** 手风琴。

对于 Azure 上的聊天或 Responses 流量（超出图像生成范围），请使用
入门流程或专用的 Azure 提供商配置——仅 `openai.baseUrl` 不会采用 Azure 的 API/认证形状。另有一个单独的
`azure-openai-responses/*` 提供商存在；请参阅下面的服务器端压缩手风琴。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="传输（WebSocket 与 SSE）">
    OpenClaw 对 `openai/*` 和 `openai-codex/*` 均采用 WebSocket 优先且 SSE 回退（`"auto"`）的策略。

    在 `"auto"` 模式下，OpenClaw：
    - 在回退到 SSE 之前重试一次早期 WebSocket 失败
    - 失败后，将 WebSocket 标记为降级约 60 秒，并在冷却期间使用 SSE
    - 为重试和重连附加稳定的会话和回合身份标头
    - 标准化不同传输变体之间的使用计数器（`input_tokens` / `prompt_tokens`）

    | 值 | 行为 |
    |-------|----------|
    | `"auto"`（默认） | WebSocket 优先，SSE 回退 |
    | `"sse"` | 仅强制 SSE |
    | `"websocket"` | 仅强制 WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": {
              params: { transport: "auto" },
            },
            "openai-codex/gpt-5.5": {
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    相关 OpenAI 文档：
    - [使用 WebSocket 的 Realtime API](https://platform.openai.com/docs/guides/realtime-websocket)
    - [流式 API 响应（SSE）](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="WebSocket 预热">
    OpenClaw 默认对 `openai/*` 和 `openai-codex/*` 启用 WebSocket 预热，以降低首轮延迟。

    ```json5
    // 禁用预热
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": {
              params: { openaiWsWarmup: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="快速模式">
    OpenClaw 为 `openai/*` 和 `openai-codex/*` 提供共享的快速模式切换：

    - **聊天/UI：** `/fast status|on|off`
    - **配置：** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    启用后，OpenClaw 将快速模式映射到 OpenAI 优先处理（`service_tier = "priority"`）。现有 `service_tier` 值会被保留，且快速模式不会重写 `reasoning` 或 `text.verbosity`。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": { params: { fastMode: true } },
          },
        },
      },
    }
    ```

    <Note>
    会话覆盖优先于配置。在会话 UI 中清除会话覆盖会将会话返回到配置的默认值。
    </Note>

  </Accordion>

  <Accordion title="优先处理（service_tier）">
    OpenAI 的 API 通过 `service_tier` 暴露优先处理。在 OpenClaw 中按模型设置：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": { params: { serviceTier: "priority" } },
          },
        },
      },
    }
    ```

    支持的值：`auto`、`default`、`flex`、`priority`。

    <Warning>
    `serviceTier` 仅转发给原生 OpenAI 端点（`api.openai.com`）和原生 Codex 端点（`chatgpt.com/backend-api`）。如果您通过代理路由任一提供商，OpenClaw 将保持 `service_tier` 不变。
    </Warning>

  </Accordion>

  <Accordion title="服务器端压缩（Responses API）">
    对于直接 OpenAI Responses 模型（`api.openai.com` 上的 `openai/*`），OpenAI 插件的 Pi-harness 流包装器会自动启用服务器端压缩：

    - 强制 `store: true`（除非模型兼容性设置 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 默认 `compact_threshold`：`contextWindow` 的 70%（不可用时为 `80000`）

    这适用于内置 Pi 运行器路径以及嵌入式运行中使用的 OpenAI 提供商钩子。原生 Codex 应用服务器运行器通过 Codex 管理自己的上下文，并通过 `agents.defaults.embeddedHarness.runtime` 单独配置。

    <Tabs>
      <Tab title="显式启用">
        适用于 Azure OpenAI Responses 等兼容端点：

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.5": {
                  params: { responsesServerCompaction: true },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="自定义阈值">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.4": {
                  params: {
                    responsesServerCompaction: true,
                    responsesCompactThreshold: 120000,
                  },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="禁用">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.4": {
                  params: { responsesServerCompaction: false },
                },
              },
            },
          },
        }
        ```
      </Tab>
    </Tabs>

    <Note>
    `responsesServerCompaction` 仅控制 `context_management` 注入。直接 OpenAI Responses 模型仍然强制 `store: true`，除非兼容性设置 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="严格代理式 GPT 模式">
    对于 `openai/*` 上的 GPT-5 系列运行，OpenClaw 可以使用更严格的嵌入式执行契约：

    ```json5
    {
      agents: {
        defaults: {
          embeddedPi: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    使用 `strict-agentic` 时，OpenClaw：
    - 当有工具动作可用时，不再将仅计划的回合视为成功进展
    - 使用立即行动引导重试该回合
    - 为大量工作自动启用 `update_plan`
    - 如果模型持续计划而不行动，则显示明确的阻塞状态

    <Note>
    仅适用于 OpenAI 和 Codex GPT-5 系列运行。其他提供商和旧模型系列保持默认行为。
    </Note>

  </Accordion>

  <Accordion title="原生路线与 OpenAI 兼容路线">
    OpenClaw 对直接 OpenAI、Codex 和 Azure OpenAI 端点的处理方式与通用 OpenAI 兼容 `/v1` 代理不同：

    **原生路线**（`openai/*`、Azure OpenAI）：
    - 仅对支持 OpenAI `none` 努力值的模型保留 `reasoning: { effort: "none" }`
    - 对拒绝 `reasoning.effort: "none"` 的模型或代理省略已禁用的 reasoning
    - 默认工具 schema 为严格模式
    - 仅在已验证的原生主机上附加隐藏归属标头
    - 保留仅限 OpenAI 的请求形状（`service_tier`、`store`、reasoning 兼容、prompt-cache 提示）

    **代理/兼容路线：**
    - 使用更宽松的兼容行为
    - 不强制严格工具模式或仅限原生的标头

    Azure OpenAI 使用原生传输和兼容行为，但不会接收隐藏归属标头。

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
  <Card title="OAuth 和认证" href="/gateway/authentication" icon="key">
    认证详情和凭据重用规则。
  </Card>
</CardGroup>