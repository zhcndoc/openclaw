---
summary: "OpenClaw 中的 Runway 视频生成设置"
title: "Runway"
read_when:
  - 你想在 OpenClaw 中使用 Runway 视频生成
  - 你需要 Runway API 密钥/环境变量设置
  - 你想将 Runway 设为默认视频提供商
---

OpenClaw 提供了一个内置的 `runway` 提供商，用于托管视频生成。

| 属性        | 值                                                                |
| ----------- | ----------------------------------------------------------------- |
| 提供商 ID   | `runway`                                                          |
| 认证        | `RUNWAYML_API_SECRET`（规范）或 `RUNWAY_API_KEY`                  |
| API         | Runway 基于任务的视频生成（轮询 `GET /v1/tasks/{id}`）            |

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

## 支持的模式

| 模式           | 模型               | 参考输入                |
| -------------- | ------------------ | ----------------------- |
| 文本生成视频   | `gen4.5`（默认）   | 无                      |
| 图片生成视频   | `gen4.5`           | 1 张本地或远程图片      |
| 视频生成视频   | `gen4_aleph`       | 1 个本地或远程视频      |

<Note>
本地图片和视频引用支持通过 data URI 传入。仅文本运行
当前提供 `16:9` 和 `9:16` 两种宽高比。
</Note>

<Warning>
视频生成视频目前需要特定使用 `runway/gen4_aleph`。
</Warning>

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
    OpenClaw 同时识别 `RUNWAYML_API_SECRET`（规范）和 `RUNWAY_API_KEY`。
    任一变量都可用于对 Runway 提供商进行身份验证。
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
