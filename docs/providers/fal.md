---
summary: "fal 在 OpenClaw 中的图像和视频生成设置"
title: "Fal"
read_when:
  - 您想在 OpenClaw 中使用 fal 图像生成
  - 您需要 FAL_KEY 认证流程
  - 您想要 image_generate 或 video_generate 的 fal 默认值
---

OpenClaw 提供了一个内置的 `fal` 提供商，用于托管图像和视频生成。

| 属性 | 值                                                         |
| -------- | ------------------------------------------------------------- |
| 提供商 | `fal`                                                         |
| 认证     | `FAL_KEY`（规范；`FAL_API_KEY` 也可作为备选） |
| API      | fal 模型端点                                           |

## 入门指南

<Steps>
  <Step title="设置 API 密钥">
    ```bash
    openclaw onboard --auth-choice fal-api-key
    ```
  </Step>
  <Step title="设置默认图像模型">
    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "fal/fal-ai/flux/dev",
          },
        },
      },
    }
    ```
  </Step>
</Steps>

## 图像生成

捆绑的 `fal` 图像生成提供商默认为
`fal/fal-ai/flux/dev`。

| 功能     | 值                      |
| -------------- | -------------------------- |
| 最大图像数     | 每个请求 4 张              |
| 编辑模式      | 启用，1 张参考图像 |
| 大小覆盖 | 支持                  |
| 纵横比   | 支持                  |
| 分辨率     | 支持                  |

<Warning>
fal 图像编辑端点 **不** 支持 `aspectRatio` 覆盖。
</Warning>

要将 fal 用作默认图像提供商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "fal/fal-ai/flux/dev",
      },
    },
  },
}
```

## 视频生成

捆绑的 `fal` 视频生成提供商默认为
`fal/fal-ai/minimax/video-01-live`。

| 功能 | 值                                                        |
| ---------- | ------------------------------------------------------------ |
| 模式      | 文生视频，单图像参考                        |
| 运行时    | 基于队列的提交/状态/结果流程，适用于长时间运行的任务 |

<AccordionGroup>
  <Accordion title="可用视频模型">
    **HeyGen video-agent:**

    - `fal/fal-ai/heygen/v2/video-agent`

    **Seedance 2.0:**

    - `fal/bytedance/seedance-2.0/fast/text-to-video`
    - `fal/bytedance/seedance-2.0/fast/image-to-video`
    - `fal/bytedance/seedance-2.0/text-to-video`
    - `fal/bytedance/seedance-2.0/image-to-video`

  </Accordion>

  <Accordion title="Seedance 2.0 配置示例">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "fal/bytedance/seedance-2.0/fast/text-to-video",
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="HeyGen video-agent 配置示例">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "fal/fal-ai/heygen/v2/video-agent",
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

<Tip>
使用 `openclaw models list --provider fal` 查看可用的 fal
模型完整列表，包括任何最近添加的条目。
</Tip>

## 相关内容

<CardGroup cols={2}>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="Configuration reference" href="/gateway/config-agents#agent-defaults" icon="gear">
    Agent defaults including image and video model selection.
  </Card>
</CardGroup>
