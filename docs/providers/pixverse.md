---
summary: "OpenClaw 中的 PixVerse 视频生成设置"
title: "PixVerse"
read_when:
  - 你想在 OpenClaw 中使用 PixVerse 视频生成
  - 你需要 PixVerse API 密钥 / 环境变量设置
  - 你想将 PixVerse 设为默认视频提供方
---

OpenClaw 将 `pixverse` 作为官方外部插件提供，用于托管的 PixVerse 视频生成。该插件会在 `videoGenerationProviders` 合约上注册 `pixverse` 提供方。

| 属性               | 值                                                                   |
| ------------------ | -------------------------------------------------------------------- |
| 提供方 id         | `pixverse`                                                           |
| 插件包             | `@openclaw/pixverse-provider`                                        |
| 认证环境变量       | `PIXVERSE_API_KEY`                                                   |
| 引导标志           | `--auth-choice pixverse-api-key`                                     |
| 直接 CLI 标志      | `--pixverse-api-key <key>`                                           |
| API                | PixVerse Platform API v2（提交 `video_id` 并轮询结果）                |
| 默认模型           | `pixverse/v6`                                                        |
| 默认 API 区域      | 国际                                                                  |

## 开始使用

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install @openclaw/pixverse-provider
    openclaw gateway restart
    ```
  </Step>
  <Step title="设置 API 密钥">
    ```bash
    openclaw onboard --auth-choice pixverse-api-key
    ```

    向导会在将 `region` 和 `baseUrl` 写入提供商配置之前，提示选择国际或 CN 端点（见下方 API 区域）。
    非交互式运行（通过 `--pixverse-api-key` 或 `PIXVERSE_API_KEY` 获取密钥）默认使用 International。

    如果尚未配置默认视频模型，引导流程还会将 `agents.defaults.mediaModels.video.primary` 设置为
    `pixverse/v6`。

  </Step>
  <Step title="切换现有的默认视频提供商（可选）">
    ```bash
    openclaw config set agents.defaults.mediaModels.video.primary "pixverse/v6"
    ```
  </Step>
  <Step title="生成视频">
    让代理生成一个视频。PixVerse 将自动被使用。
  </Step>
</Steps>

## 支持的模式和模型

该提供方通过 OpenClaw 的共享视频工具暴露 PixVerse 生成模型。

| 模式           | 模型                 | 参考输入                |
| -------------- | -------------------- | ----------------------- |
| 文本生成视频    | `v6`（默认）、`c1`   | 无                      |
| 图片生成视频    | `v6`（默认）、`c1`   | 1 张本地或远程图片      |

本地图片引用会在图片生成视频请求之前上传到 PixVerse。远程图片 URL 会作为 `image_url` 传递到 PixVerse 图片上传端点。

| 选项          | 支持的值                                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 时长        | 1-15 秒（默认 5）                                                                                                         |
| 分辨率      | `360P`、`540P`、`720P`、`1080P`（默认 `540P`；`480P` 请求会映射到 `540P`）                                                  |
| 宽高比    | `16:9`（默认）、`4:3`、`1:1`、`3:4`、`9:16`、`2:3`、`3:2`、`21:9`；仅适用于文本生成视频，图片生成视频遵循源图片 |
| 生成音频 | `audio: true`                                                                                                                    |

<Note>
PixVerse 图片模板生成功能尚未通过 `image_generate` 暴露。该 API 由 template-id 驱动，而 OpenClaw 的共享图片生成合约目前没有 PixVerse 专用的类型化选项包。
</Note>

## 提供方选项

视频提供方接受以下可选的提供方专属键：

| 选项                                 | 类型   | 作用                                          |
| ------------------------------------ | ------ | --------------------------------------------- |
| `seed`                               | number | 确定性种子，0 到 2147483647                   |
| `negativePrompt` / `negative_prompt` | string | 负面提示词                                     |
| `quality`                            | string | PixVerse 质量，例如 `720p`                    |
| `motionMode` / `motion_mode`         | string | 图像转视频运动模式（默认 `normal`）           |
| `cameraMovement` / `camera_movement` | string | PixVerse 摄像机移动预设                       |
| `templateId` / `template_id`         | number | 已激活的 PixVerse 模板 id                     |

## 配置

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        video: {
          primary: "pixverse/v6",
        },
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="API 区域">
    | 区域值          | PixVerse API 基础 URL                      |
    | --------------- | --------------------------------------------- |
    | `international` | `https://app-api.pixverse.ai/openapi/v2`      |
    | `cn`            | `https://app-api.pixverseai.cn/openapi/v2`    |

    当你的密钥属于某个特定的 PixVerse 平台区域时，请手动设置 `models.providers.pixverse.region`，
    或运行 `openclaw onboard --auth-choice pixverse-api-key`，在设置向导中选择一个：

    ```json5
    {
      models: {
        providers: {
          pixverse: {
            region: "cn", // "international" 或 "cn"
            baseUrl: "https://app-api.pixverseai.cn/openapi/v2",
            models: [],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="自定义基础 URL">
    仅当通过受信任的兼容代理路由时，才设置 `models.providers.pixverse.baseUrl`。
    `baseUrl` 的优先级高于 `region`。

    ```json5
    {
      models: {
        providers: {
          pixverse: {
            baseUrl: "https://app-api.pixverse.ai/openapi/v2",
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="任务轮询">
    PixVerse 会在生成请求中返回一个 `video_id`。OpenClaw 每 5 秒轮询一次
    `/openapi/v2/video/result/{video_id}`，直到任务成功、失败或达到超时（默认为 5 分钟；可通过
    `agents.defaults.mediaModels.video.timeoutMs` 覆盖）。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享工具参数、提供方选择和异步行为。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    包括视频生成模型在内的代理默认设置。
  </Card>
</CardGroup>