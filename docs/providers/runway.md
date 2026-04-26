---
summary: "在 OpenClaw 中运行 Runway 视频生成设置"
title: "Runway"
read_when:
  - 您想在 OpenClaw 中使用 Runway 视频生成
  - 您需要 Runway API 密钥/环境变量设置
  - 您想将 Runway 设为默认视频提供商
---

OpenClaw 随附一个捆绑的 `runway` 提供商，用于托管视频生成。

| 属性         | 值                                                                |
| ------------ | ----------------------------------------------------------------- |
| 提供商 ID    | `runway`                                                          |
| 认证         | `RUNWAYML_API_SECRET`（规范）或 `RUNWAY_API_KEY`                  |
| API          | Runway 基于任务的视频生成（`GET /v1/tasks/{id}` 轮询）            |

## 快速开始

<Steps>
  <Step title="设置 API 密钥">
    ```bash
    openclaw onboard --auth-choice runway-api-key
    ```
  </Step>
  <Step title="将 Runway 设为默认视频提供商">
    ```bash
    openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5"
    ```
  </Step>
  <Step title="生成视频">
    要求代理生成视频。Runway 将被自动使用。
  </Step>
</Steps>

## 支持的模式

| 模式           | 模型               | 参考输入                |
| -------------- | ------------------ | ----------------------- |
| 文生视频       | `gen4.5`（默认）   | 无                      |
| 图生视频       | `gen4.5`           | 1 张本地或远程图片      |
| 视频生视频     | `gen4_aleph`       | 1 个本地或远程视频      |

<Note>
支持通过 data URIs 引用本地图片和视频。仅文本运行目前支持 `16:9` 和 `9:16` 纵横比。
</Note>

<Warning>
视频生视频目前专门需要 `runway/gen4_aleph`。
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
    OpenClaw 识别 `RUNWAYML_API_SECRET`（规范）和 `RUNWAY_API_KEY`。
    任一变量均可认证 Runway 提供商。
  </Accordion>

  <Accordion title="任务轮询">
    Runway 使用基于任务的 API。提交生成请求后，OpenClaw
    会轮询 `GET /v1/tasks/{id}` 直到视频就绪。轮询行为
    无需额外配置。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享工具参数、提供商选择和异步行为。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    包括视频生成模型的 Agent 默认设置。
  </Card>
</CardGroup>
