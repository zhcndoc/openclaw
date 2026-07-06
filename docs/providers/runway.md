---
summary: "OpenClaw 中的 Runway 视频生成设置"
title: "Runway"
read_when:
  - 你想在 OpenClaw 中使用 Runway 视频生成
  - 你需要 Runway API 密钥/环境变量设置
  - 你想将 Runway 设为默认视频提供商
---

OpenClaw 附带了一个用于托管视频生成的 `runway` 提供商，默认启用，并注册到 `videoGenerationProviders` 合同。

| 属性            | 值                                                                |
| --------------- | ----------------------------------------------------------------- |
| 提供商 id       | `runway`                                                          |
| 插件            | 捆绑内置，`enabledByDefault: true`                                 |
| 认证环境变量    | `RUNWAYML_API_SECRET`（规范）或 `RUNWAY_API_KEY`             |
| 入门标志        | `--auth-choice runway-api-key`                                    |
| 直接 CLI 标志   | `--runway-api-key <key>`                                          |
| API             | Runway 基于任务的视频生成（轮询 `GET /v1/tasks/{id}`）            |
| 默认模型        | `runway/gen4.5`                                                   |

## 开始使用

<Steps>
  <Step title="设置 API 密钥">
    ```bash
    openclaw onboard --auth-choice runway-api-key
    ```
  </Step>
  <Step title="将 Runway 设置为默认视频提供商">
    ```bash
    openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5"
    ```
  </Step>
  <Step title="生成视频">
    让代理生成一个视频。Runway 将会自动使用。
  </Step>
</Steps>

## Supported Modes and Models

This provider exposes seven Runway models across three modes. The same model id can serve more than one mode (for example, `gen4.5` is available for both text-to-video and image-to-video).

| Mode             | Model                                                                  | Reference Input          |
| ---------------- | --------------------------------------------------------------------- | ------------------------ |
| Text to video    | `gen4.5` (default), `veo3.1`, `veo3.1_fast`, `veo3`                    | None                     |
| Image to video   | `gen4.5`, `gen4_turbo`, `gen3a_turbo`, `veo3.1`, `veo3.1_fast`, `veo3` | 1 local or remote image  |
| Video to video   | `gen4_aleph`                                                           | 1 local or remote video  |

Local images and videos can be referenced via data URI.

| Aspect Ratio          | Allowed Values                              |
| --------------------- | ------------------------------------------- |
| Text to video         | `16:9`, `9:16`                              |
| Image and video edit  | `1:1`, `16:9`, `9:16`, `3:4`, `4:3`, `21:9` |

<Warning>
  Video to video currently requires `runway/gen4_aleph`. Other Runway model ids will reject video reference inputs.
</Warning>

<Note>
  Choosing a Runway model id from the error column will produce a clear error before the API request leaves OpenClaw. This provider validates `model` in `extensions/runway/video-generation-provider.ts` according to the mode allowlists (`TEXT_ONLY_MODELS`, `IMAGE_MODELS`, `VIDEO_MODELS`).
</Note>

## 配置

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "runway/gen4.5",
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="环境变量别名">
    OpenClaw 同时识别 `RUNWAYML_API_SECRET`（规范名称）和 `RUNWAY_API_KEY`。
    任意一个变量都可用于验证 Runway 提供方。
  </Accordion>

  <Accordion title="任务轮询">
    Runway 使用基于任务的 API。提交生成请求后，OpenClaw
    会轮询 `GET /v1/tasks/{id}`，直到视频准备就绪。轮询行为无需额外
    配置。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享工具参数、提供商选择和异步行为。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    包括视频生成模型在内的代理默认设置。
  </Card>
</CardGroup>
