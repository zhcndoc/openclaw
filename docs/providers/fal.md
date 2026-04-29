---
summary: "OpenClaw 中 fal 图像和视频生成设置"
title: "Fal"
read_when:
  - 您想在 OpenClaw 中使用 fal 图像生成
  - 您需要 FAL_KEY 认证流程
  - 您想为 image_generate 或 video_generate 使用 fal 默认值
---

OpenClaw 自带一个 `fal` 提供程序，用于托管图像和视频生成。

| Property | Value                                                         |
| -------- | ------------------------------------------------------------- |
| Provider | `fal`                                                         |
| Auth     | `FAL_KEY`（规范；`FAL_API_KEY` 也可作为回退使用） |
| API      | fal 模型端点                                           |

## 开始使用

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

内置的 `fal` 图像生成提供程序默认使用
`fal/fal-ai/flux/dev`。

| Capability     | Value                      |
| -------------- | -------------------------- |
| Max images     | 每个请求最多 4 张              |
| Edit mode      | 已启用，1 张参考图像 |
| Size overrides | 支持                  |
| Aspect ratio   | 支持                  |
| Resolution     | 支持                  |
| Output format  | `png` 或 `jpeg`            |

<Warning>
fal 图像编辑端点**不**支持 `aspectRatio` 覆盖。
</Warning>

当您想要 PNG 输出时，请使用 `outputFormat: "png"`。fal 在 OpenClaw 中没有声明
明确的透明背景控制，因此 `background:
"transparent"` 会被标记为对 fal 模型已忽略的覆盖项。

要将 fal 设为默认图像提供程序：

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

内置的 `fal` 视频生成提供程序默认使用
`fal/fal-ai/minimax/video-01-live`。

| Capability | Value                                                              |
| ---------- | ------------------------------------------------------------------ |
| Modes      | 文本生成视频、单图参考、Seedance 参考生成视频 |
| Runtime    | 面向长时间运行任务的基于队列的提交/状态/结果流程       |

<AccordionGroup>
  <Accordion title="可用的视频模型">
    **HeyGen video-agent：**

    - `fal/fal-ai/heygen/v2/video-agent`

    **Seedance 2.0：**

    - `fal/bytedance/seedance-2.0/fast/text-to-video`
    - `fal/bytedance/seedance-2.0/fast/image-to-video`
    - `fal/bytedance/seedance-2.0/fast/reference-to-video`
    - `fal/bytedance/seedance-2.0/text-to-video`
    - `fal/bytedance/seedance-2.0/image-to-video`
    - `fal/bytedance/seedance-2.0/reference-to-video`

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

  <Accordion title="Seedance 2.0 参考生成视频配置示例">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "fal/bytedance/seedance-2.0/fast/reference-to-video",
          },
        },
      },
    }
    ```

    参考生成视频最多接受 9 张图像、3 个视频和 3 个音频参考，
    通过共享的 `video_generate` `images`、`videos` 和 `audioRefs`
    参数传入，总参考文件数最多 12 个。

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
使用 `openclaw models list --provider fal` 查看可用 fal
模型的完整列表，包括最近新增的条目。
</Tip>

## 相关内容

<CardGroup cols={2}>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享的图像工具参数和提供程序选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享的视频工具参数和提供程序选择。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值，包括图像和视频模型选择。
  </Card>
</CardGroup>
