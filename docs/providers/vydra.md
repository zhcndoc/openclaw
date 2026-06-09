---
summary: "在 OpenClaw 中使用 Vydra 图像、视频和语音"
read_when:
  - 你想在 OpenClaw 中使用 Vydra 媒体生成功能
  - 你需要 Vydra API 密钥设置指导
title: "Vydra"
---

捆绑的 Vydra 插件新增了：

- 通过 `vydra/grok-imagine` 进行图像生成
- 通过 `vydra/veo3` 和 `vydra/kling` 进行视频生成
- 通过 Vydra 基于 ElevenLabs 的 TTS 路由进行语音合成

OpenClaw 对这三种能力都使用相同的 `VYDRA_API_KEY`。

| Property        | Value                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| Provider id     | `vydra`                                                                   |
| Plugin          | bundled, `enabledByDefault: true`                                         |
| Auth env var    | `VYDRA_API_KEY`                                                           |
| Onboarding flag | `--auth-choice vydra-api-key`                                             |
| Direct CLI flag | `--vydra-api-key <key>`                                                   |
| Contracts       | `imageGenerationProviders`, `videoGenerationProviders`, `speechProviders` |
| Base URL        | `https://www.vydra.ai/api/v1` (使用 `www` 主机)                           |

<Warning>
  请使用 `https://www.vydra.ai/api/v1` 作为基础 URL。Vydra 的顶级域名主机（`https://vydra.ai/api/v1`）当前会重定向到 `www`。某些 HTTP 客户端会在这种跨主机重定向时丢弃 `Authorization`，从而把有效的 API 密钥变成误导性的身份验证失败。捆绑插件直接使用 `www` 基础 URL 以避免这种情况。
</Warning>

## 设置

<Steps>
  <Step title="运行交互式引导">
    ```bash
    openclaw onboard --auth-choice vydra-api-key
    ```

    或直接设置环境变量：

    ```bash
    export VYDRA_API_KEY="vydra_live_..."
    ```

  </Step>
  <Step title="选择默认能力">
    从下面的能力中选择一个或多个（图像、视频或语音），并应用相应的配置。
  </Step>
</Steps>

## 功能

<AccordionGroup>
  <Accordion title="图像生成">
    默认图像模型：

    - `vydra/grok-imagine`

    将其设置为默认图像提供方：

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "vydra/grok-imagine",
          },
        },
      },
    }
    ```

    当前捆绑的支持仅限于文本生成图像。Vydra 托管的编辑路由期望远程图像 URL，而 OpenClaw 目前尚未在捆绑插件中添加 Vydra 专用的上传桥接。

    <Note>
    有关共享工具参数、提供方选择和故障转移行为，请参见[图像生成](/tools/image-generation)。
    </Note>

  </Accordion>

  <Accordion title="视频生成">
    已注册的视频模型：

    - `vydra/veo3` 用于文本生成视频
    - `vydra/kling` 用于图像生成视频

    将 Vydra 设置为默认视频提供方：

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "vydra/veo3",
          },
        },
      },
    }
    ```

    注：

    - `vydra/veo3` 目前仅作为文本生成视频捆绑。
    - `vydra/kling` 当前需要一个远程图像 URL 引用。本地文件上传会被直接拒绝。
    - Vydra 当前的 `kling` HTTP 路由在是否需要 `image_url` 或 `video_url` 方面表现不一致；捆绑的提供方会将同一个远程图像 URL 映射到这两个字段中。
    - 捆绑插件保持保守，不会转发诸如宽高比、分辨率、水印或生成音频等未文档化的样式选项。

    <Note>
    有关共享工具参数、提供方选择和故障转移行为，请参见[视频生成](/tools/video-generation)。
    </Note>

  </Accordion>

  <Accordion title="视频实时测试">
    提供方特定的实时覆盖：

    ```bash
    OPENCLAW_LIVE_TEST=1 \
    OPENCLAW_LIVE_VYDRA_VIDEO=1 \
    pnpm test:live -- extensions/vydra/vydra.live.test.ts
    ```

    现在捆绑的 Vydra 实时文件覆盖：

    - `vydra/veo3` 文本生成视频
    - 使用远程图像 URL 的 `vydra/kling` 图像生成视频

    需要时可覆盖远程图像 fixture：

    ```bash
    export OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL="https://example.com/reference.png"
    ```

  </Accordion>

  <Accordion title="语音合成">
    将 Vydra 设置为语音提供方：

    ```json5
    {
      messages: {
        tts: {
          provider: "vydra",
          providers: {
            vydra: {
              apiKey: "${VYDRA_API_KEY}",
              speakerVoiceId: "21m00Tcm4TlvDq8ikWAM",
            },
          },
        },
      },
    }
    ```

    默认值：

    - 模型：`elevenlabs/tts`
    - 语音 id：`21m00Tcm4TlvDq8ikWAM`

    当前捆绑插件仅暴露一个已知可用的默认语音，并返回 MP3 音频文件。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="提供方目录" href="/providers/index" icon="list">
    浏览所有可用的提供方。
  </Card>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享的图像工具参数和提供方选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享的视频工具参数和提供方选择。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    Agent 默认值和模型配置。
  </Card>
</CardGroup>