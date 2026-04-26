---
summary: "在 OpenClaw 中使用 Vydra 图像、视频和语音"
read_when:
  - 您希望在 OpenClaw 中使用 Vydra 媒体生成
  - 您需要 Vydra API 密钥设置指导
title: "Vydra"
---

捆绑的 Vydra 插件添加了：

- 通过 `vydra/grok-imagine` 生成图像
- 通过 `vydra/veo3` 和 `vydra/kling` 生成视频
- 通过 Vydra 基于 ElevenLabs 的 TTS 路由进行语音合成

OpenClaw 对所有这三种功能使用相同的 `VYDRA_API_KEY`。

<Warning>
使用 `https://www.vydra.ai/api/v1` 作为基础 URL。

Vydra 的主机 (`https://vydra.ai/api/v1`) 目前会重定向到 `www`。某些 HTTP 客户端在这种跨主机重定向时会丢弃 `Authorization` 头，导致有效的 API 密钥变成令人困惑的认证失败。捆绑的插件直接使用 `www` 基础 URL 以避免这种情况。
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
  <Step title="选择默认功能">
    选择以下一种或多种功能（图像、视频或语音），并应用匹配的配置。
  </Step>
</Steps>

## 功能

<AccordionGroup>
  <Accordion title="图像生成">
    默认图像模型：

    - `vydra/grok-imagine`

    将其设置为默认图像提供商：

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

    当前捆绑支持仅限文生图。Vydra 的托管编辑路由需要远程图像 URL，而 OpenClaw 尚未在捆绑插件中添加 Vydra 特定的上传桥接。

    <Note>
    请参阅 [图像生成](/tools/image-generation) 了解共享工具参数、提供商选择和故障转移行为。
    </Note>

  </Accordion>

  <Accordion title="视频生成">
    已注册的视频模型：

    - `vydra/veo3` 用于文生视频
    - `vydra/kling` 用于图生视频

    将 Vydra 设置为默认视频提供商：

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

    注意：

    - `vydra/veo3` 捆绑为仅文生视频。
    - `vydra/kling` 目前需要远程图像 URL 引用。本地文件上传会被直接拒绝。
    - Vydra 当前的 `kling` HTTP 路由对于需要 `image_url` 还是 `video_url` 一直不一致；捆绑的提供商将相同的远程图像 URL 映射到这两个字段。
    - 捆绑的插件保持保守，不转发未记录的风格参数，如纵横比、分辨率、水印或生成的音频。

    <Note>
    请参阅 [视频生成](/tools/video-generation) 了解共享工具参数、提供商选择和故障转移行为。
    </Note>

  </Accordion>

  <Accordion title="视频实时测试">
    提供商特定的实时覆盖范围：

    ```bash
    OPENCLAW_LIVE_TEST=1 \
    OPENCLAW_LIVE_VYDRA_VIDEO=1 \
    pnpm test:live -- extensions/vydra/vydra.live.test.ts
    ```

    捆绑的 Vydra 实时文件现在涵盖：

    - `vydra/veo3` 文生视频
    - `vydra/kling` 使用远程图像 URL 的图生视频

    必要时覆盖远程图像测试素材：

    ```bash
    export OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL="https://example.com/reference.png"
    ```

  </Accordion>

  <Accordion title="语音合成">
    将 Vydra 设置为语音提供商：

    ```json5
    {
      messages: {
        tts: {
          provider: "vydra",
          providers: {
            vydra: {
              apiKey: "${VYDRA_API_KEY}",
              voiceId: "21m00Tcm4TlvDq8ikWAM",
            },
          },
        },
      },
    }
    ```

    默认值：

    - 模型：`elevenlabs/tts`
    - 语音 ID: `21m00Tcm4TlvDq8ikWAM`

    捆绑的插件目前公开一个已知良好的默认语音，并返回 MP3 音频文件。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="提供商目录" href="/providers/index" icon="list">
    浏览所有可用提供商。
  </Card>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    Agent 默认值和模型配置。
  </Card>
</CardGroup>