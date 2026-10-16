---
summary: "在 OpenClaw 中使用 Vydra 图像、视频和语音"
read_when:
  - "您希望在 OpenClaw 中生成 Vydra 媒体"
  - "你需要 Vydra API 密钥设置指导"
title: "Vydra"
---

官方 Vydra 插件提供：

- 使用 `vydra/grok-imagine` 进行图像生成
- 使用 `vydra/veo3`（文生视频）和 `vydra/kling`（图生视频）进行视频生成
- 通过 Vydra 的 ElevenLabs- 支持的 TTS 路线进行语音合成

OpenClaw 对这三种能力都使用相同的 `VYDRA_API_KEY`。

| 属性        | 值                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| 提供方 id     | `vydra`                                                                   |
| 插件          | `@openclaw/vydra-provider`                                                |
| 认证环境变量    | `VYDRA_API_KEY`                                                           |
| 引导标志 | `--auth-choice vydra-api-key`                                             |
| 直接 CLI 标志 | `--vydra-api-key <key>`                                                   |
| 合约       | `imageGenerationProviders`, `videoGenerationProviders`, `speechProviders` |
| 基础 URL        | `https://www.vydra.ai/api/v1`（使用 `www` 主机）                        |

<Warning>
请使用 `https://www.vydra.ai/api/v1` 作为基础 URL。Vydra 的主域名主机（`https://vydra.ai/api/v1`）当前会重定向到 `www`。某些 HTTP 客户端会在这种跨主机重定向时丢弃 `Authorization`，这会把有效的 API 密钥变成误导性的身份验证失败。捆绑插件会将任何配置的 `vydra.ai` 基础 URL 规范化为 `www.vydra.ai`，以避免这种情况。
</Warning>

## <a id="setup"></a> 设置

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/vydra-provider
    ```

    安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

  </Step>
  <Step id="run-interactive-onboarding" title="运行交互式入门引导培训">
    ```bash
    openclaw onboard --auth-choice vydra-api-key
    ```

    或直接设置环境变量：

    ```bash
    export VYDRA_API_KEY="vydra_live_..."
    ```

  </Step>
  <Step id="choose-a-default-capability" title="选择默认功能">
    从下面的能力中选择一个或多个（图像、视频或语音），并应用相应的配置。
  </Step>
</Steps>

## <a id="capabilities"></a> 功能

<AccordionGroup>
  <Accordion id="image-generation" title="图像生成">
    默认且唯一的 Vydra 图像模型：

    - `vydra/grok-imagine`

    将其设置为默认图像提供方：

    ```json5
    {
      agents: {
        defaults: {
          mediaModels: {
            image: {
              primary: "vydra/grok-imagine",
            },
          },
        },
      },
    }
    ```

    Vydra 仅支持文本到图像，每个请求最多一张图像。 Vydra 的托管编辑路由需要远程图像 URL，并且该插件不会添加 Vydra- 特定的上传桥。

    <Note>
    有关共享工具参数、提供程序选择和故障转移行为，请参阅 [Image Generation](/tools/image-generation)。
    </Note>

  </Accordion>

  <Accordion id="video-generation" title="视频生成">
    已注册的视频模型：

    - `vydra/veo3` 用于文生视频（拒绝图像引用输入）
    - `vydra/kling` 用于图生视频（要求恰好一个远程图像 URL）

    将 Vydra 设置为默认视频提供方：

    ```json5
    {
      agents: {
        defaults: {
          mediaModels: {
            video: {
              primary: "vydra/veo3",
            },
          },
        },
      },
    }
    ```

    注意：

    - `vydra/kling` 会预先拒绝本地文件上传；只有远程图像 URL 引用可用。
    - Vydra 的 `kling` HTTP 路由对于要求使用 `image_url` 还是 `video_url` 一直不一致；该插件会在两个字段中发送相同的远程图像 URL。
    - 该插件采取保守策略，不会转发宽高比、分辨率、水印或生成音频等未记录的样式参数。

    <Note>
    有关共享工具参数、提供程序选择和故障转移行为，请参阅 [Video Generation](/tools/video-generation)。
    </Note>

  </Accordion>

  <Accordion id="video-live-tests" title="视频现场测试">
    提供方特定的实时覆盖：

    ```bash
    OPENCLAW_LIVE_TEST=1 \
    OPENCLAW_LIVE_VYDRA_VIDEO=1 \
    pnpm test:live -- extensions/vydra/vydra.live.test.ts
    ```

    Vydra 实时测试文件涵盖：

    - `vydra/veo3` 文本生成视频
    - 使用远程图像 URL 的 `vydra/kling` 图像生成视频

    需要时可覆盖远程图像 fixture：

    ```bash
    export OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL="https://example.com/reference.png"
    ```

  </Accordion>

  <Accordion id="speech-synthesis" title="语音合成">
    将 Vydra 设置为语音提供方：

    ```json5
    {
      tts: {
        provider: "vydra",
        providers: {
          vydra: {
            apiKey: "${VYDRA_API_KEY}",
            voiceId: "21m00Tcm4TlvDq8ikWAM",
          },
        },
      },
    }
    ```

    默认值：

    - 模型：`elevenlabs/tts`
    - 声音 id：`21m00Tcm4TlvDq8ikWAM`（“Rachel”）

    该插件提供这一已知可用的默认声音，并返回 MP3 音频文件。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="提供商目录" href="/providers/index" icon="list">
    浏览所有可用的提供方。
  </Card>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
</CardGroup>
