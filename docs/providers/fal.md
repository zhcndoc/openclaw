---
summary: "OpenClaw 中的 fal 图像、视频和音乐生成设置"
title: "Fal"
read_when:
  - "当您想在 OpenClaw 中使用 fal 图像生成功能时"
  - "当您需要 FAL_KEY 认证流程时"
  - "当您想了解 image_generate、video_generate 或 music_generate 的 fal 默认设置时"
---

OpenClaw 提供了一个内置的 `fal` 提供程序，用于托管图像、视频和音乐
生成。

| 属性     | 值                                                            |
| -------- | ------------------------------------------------------------- |
| 提供程序 | `fal`                                                         |
| 认证     | `FAL_KEY`（规范；`FAL_API_KEY` 也可作为回退使用） |
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

| Capability     | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Max images     | 4 per request; Krea 2: 1 per request                               |
| Edit mode      | Flux: 1 reference image; GPT Image 2: 10; Nano Banana 2: 14        |
| Style refs     | Krea 2: up to 10 style references via `image` / `images`           |
| Size overrides | Supported                                                          |
| Aspect ratio   | Supported for generate, Krea 2, and GPT Image 2/Nano Banana 2 edit |
| Resolution     | Supported                                                          |
| Output format  | `png` or `jpeg`                                                    |

<Warning>
Flux 图像到图像请求不支持 `aspectRatio` 覆盖。GPT
Image 2 和 Nano Banana 2 编辑请求使用 fal 的 `/edit` 端点并接受
宽高比提示。Nano Banana 2 还接受额外的原生宽/高比例，
例如 `4:1`、`1:4`、`8:1` 和 `1:8`；Krea 2 仅验证其自身更小的
宽高比子集。
</Warning>

Krea 2 模型使用 fal 的原生 Krea 负载架构。OpenClaw 发送
`aspect_ratio`、`creativity` 和 `image_style_references`，而不是 Flux 使用的
通用 `image_size` / 编辑端点负载。模型引用为：

- `fal/krea/v2/medium/text-to-image`
- `fal/krea/v2/large/text-to-image`

Medium 适合更快的表现型插画、动漫、绘画和艺术风格。Large 适合更慢的写实、
原始纹理、胶片颗粒和更细致的效果。Krea 默认 `fal.creativity: "medium"`；
支持的值为 `raw`、`low`、`medium` 和 `high`。

Krea 2 在 fal 的请求架构中暴露的是宽高比，而不是 `image_size`。优先使用 `aspectRatio`；
OpenClaw 会将 `size` 映射为最接近的 Krea 支持的宽高比，并拒绝 Krea 的 `resolution`
覆盖项，而不是忽略它。

当您希望从暴露 `output_format` 的 fal 模型获得 PNG 输出时，请使用
`outputFormat: "png"`。fal 在 OpenClaw 中没有声明明确的透明背景控制，因此
`background: "transparent"` 会被报告为 fal 模型被忽略的覆盖项。
Krea 2 端点不会通过 fal 暴露 `output_format` 请求字段，因此
OpenClaw 会拒绝 Krea 请求中的 `outputFormat` 覆盖项。

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

要使用 Krea 2 Medium：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "fal/krea/v2/medium/text-to-image",
      },
    },
  },
}
```

## 视频生成

内置的 `fal` 视频生成提供程序默认使用
`fal/fal-ai/minimax/video-01-live`。

| 能力       | 值                                                              |
| ---------- | ------------------------------------------------------------------ |
| 模式       | 文本生成视频、单图参考、Seedance 参考生成视频 |
| 运行时     | 面向长时间运行任务的基于队列的提交/状态/结果流程       |

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

## 音乐生成

内置的 `fal` 插件还为共享的 `music_generate` 工具注册了一个音乐生成提供程序。

| 能力         | 值                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| 默认模型     | `fal/fal-ai/minimax-music/v2.6`                                                                        |
| 模型         | `fal-ai/minimax-music/v2.6`, `fal-ai/ace-step/prompt-to-audio`, `fal-ai/stable-audio-25/text-to-audio` |
| 运行时       | 同步请求加生成音频下载                                                      |

将 fal 设为默认音乐提供程序：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "fal/fal-ai/minimax-music/v2.6",
      },
    },
  },
}
```

`fal-ai/minimax-music/v2.6` 支持显式歌词和纯音乐模式。
ACE-Step 和 Stable Audio 是 prompt-to-audio 端点；当您需要这些模型家族时，请使用
`model` 覆盖项来选择它们。

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
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    共享的音乐工具参数和提供程序选择。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认设置，包括图像、视频和音乐模型选择。
  </Card>
</CardGroup>
