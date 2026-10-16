---
summary: "OpenClaw 中的 PixVerse 视频生成设置"
title: "PixVerse"
read_when:
  - "您想在 OpenClaw 中使用 PixVerse 视频生成"
  - "您需要 PixVerse API key/env 设置"
  - "你想将 PixVerse 设为默认视频提供方"
---

OpenClaw 提供 `pixverse` 作为托管 PixVerse 视频生成的官方外部插件。该插件根据 `videoGenerationProviders` 合约注册 `pixverse` 提供程序。

| 属性           | 值                                                                |
| ------------------ | -------------------------------------------------------------------- |
| 提供方 id        | `pixverse`                                                           |
| 插件包     | `@openclaw/pixverse-provider`                                        |
| 认证环境变量       | `PIXVERSE_API_KEY`                                                   |
| 引导标志    | `--auth-choice pixverse-api-key`                                     |
| 直接 CLI 标志    | `--pixverse-api-key <key>`                                           |
| API                | PixVerse Platform API v2（提交 `video_id` 并轮询结果） |
| 默认模型      | `pixverse/v6`                                                        |
| 默认 API 区域 | 国际                                                        |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/pixverse-provider
    ```

    安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

  </Step>
  <Step id="set-the-api-key" title="设置API密钥">
    ```bash
    openclaw onboard --auth-choice pixverse-api-key
    ```

    向导会在将 `region` 和 `baseUrl` 写入提供商配置之前，提示选择国际或 CN 端点（见下方 API 区域）。 非交互式运行（通过 `--pixverse-api-key` 或 `PIXVERSE_API_KEY` 获取密钥）默认使用 International。

    如果尚未配置默认视频模型，引导流程还会将 `agents.defaults.mediaModels.video.primary` 设置为 `pixverse/v6`。

  </Step>
  <Step id="switch-an-existing-default-video-provider-optional" title="切换现有的默认视频提供商（可选）">
    ```bash
    openclaw config set agents.defaults.mediaModels.video.primary "pixverse/v6"
    ```
  </Step>
  <Step id="generate-a-video" title="生成视频">
    让代理生成一个视频。PixVerse 将自动被使用。
  </Step>
</Steps>

## <a id="supported-modes-and-models"></a> 支持的模式和模型

提供商通过 OpenClaw 的共享视频工具公开 PixVerse 一代模型。

| 模式           | 模型               | 参考输入         |
| -------------- | -------------------- | ----------------------- |
| 文本生成视频  | `v6`（默认）、`c1` | 无                    |
| 图像到视频 | `v6`（默认）、`c1` | 1 个本地或远程图像 |

本地图像参考在图像转视频请求之前上传到 PixVerse。远程图像 URL 通过 PixVerse 图像上传端点作为 `image_url` 传递。

| 选项          | 支持的值                                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 时长        | 1-15 秒（默认 5）                                                                                                         |
| 分辨率      | `360P`、`540P`、`720P`、`1080P`（默认 `540P`；`480P` 请求会映射到 `540P`）                                                  |
| 宽高比    | `16:9`（默认）、`4:3`、`1:1`、`3:4`、`9:16`、`2:3`、`3:2`、`21:9`；仅适用于文本生成视频，图片生成视频遵循源图片 |
| 生成音频 | `audio: true`                                                                                                                    |

<Note>
PixVerse 图像模板生成不通过 `image_generate` 公开。 API 是模板 ID 驱动的，而 OpenClaw 的共享图像生成合约没有 PixVerse- 特定类型的选项包。
</Note>

## <a id="provider-options"></a> 提供方选项

视频提供方接受以下可选的提供方专属键：

| 选项                               | 类型   | 作用                                        |
| ------------------------------------ | ------ | --------------------------------------------- |
| `seed`                               | 数字 | 可重复输出的种子，0 到 2147483647   |
| `negativePrompt` / `negative_prompt` | 字符串 | 负面提示词                               |
| `quality`                            | 字符串 | PixVerse 质量，例如 `720p`               |
| `motionMode` / `motion_mode`         | 字符串 | 图像转视频运动模式（默认 `normal`） |
| `cameraMovement` / `camera_movement` | 字符串 | PixVerse 摄像机移动预设               |
| `templateId` / `template_id`         | 数字 | 已激活的 PixVerse 模板 id                |

## <a id="configuration"></a> 配置

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

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="api-region" title="API 区域">
    | 区域值    | PixVerse API 基础 URL                         |
    | --------------- | --------------------------------------------- |
    | `international` | `https://app-api.pixverse.ai/openapi/v2`      |
    | `cn`            | `https://app-api.pixverseai.cn/openapi/v2`    |

    当你的密钥属于某个特定的 PixVerse 平台区域时，请手动设置 `models.providers.pixverse.region`， 或运行 `openclaw onboard --auth-choice pixverse-api-key`，在设置向导中选择一个：

    ```json5
    {
      models: {
        providers: {
          pixverse: {
            region: "cn", // "international" or "cn"
            baseUrl: "https://app-api.pixverseai.cn/openapi/v2",
            models: [],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion id="custom-base-url" title="定制底座 URL">
    仅当通过受信任的兼容代理路由时，才设置 `models.providers.pixverse.baseUrl`。 `baseUrl` 的优先级高于 `region`。

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

  <Accordion id="task-polling" title="任务轮询">
    PixVerse 会在生成请求中返回一个 `video_id`。OpenClaw 每 5 秒轮询一次 `/openapi/v2/video/result/{video_id}`，直到任务成功、失败或达到超时（默认为 5 分钟；可通过 `agents.defaults.mediaModels.video.timeoutMs` 覆盖）。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享工具参数、提供程序选择和异步行为。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    包括视频生成模型在内的代理默认设置。
  </Card>
</CardGroup>
