---
summary: "fal OpenClaw 中的图像、视频和音乐生成设置"
title: "Fal"
read_when:
  - "您想在 OpenClaw 中使用 fal 图像生成"
  - "当您需要 FAL_KEY 认证流程时"
  - "当您想了解 image_generate、video_generate 或 music_generate 的 fal 默认设置时"
---

OpenClaw 提供了一个内置的 `fal` 提供程序，用于托管图像、视频和音乐生成。

| 属性 | 值                                                                           |
| -------- | ------------------------------------------------------------------------------- |
| 提供者 | `fal`                                                                           |
| 认证     | `FAL_KEY`（首选；`FAL_API_KEY` 也可作为后备）                   |
| API      | fal 模型端点（`https://fal.run`；视频任务使用 `https://queue.fal.run`） |
| 基础 URL | 使用 `models.providers.fal.baseUrl` 覆盖                                    |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="get-an-api-key" title="获取 API 密钥">
    在 [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys). 创建密钥
  </Step>
  <Step id="set-the-api-key" title="设置API密钥">
    ```bash
    openclaw onboard --auth-choice fal-api-key
    ```

    非交互式设置可以传入 `--fal-api-key <key>` 或导出 `FAL_KEY`。 在未配置默认图像模型时，初始化还会将 `fal/fal-ai/flux/dev` 设为默认图像模型。

  </Step>
  <Step id="set-a-default-image-model" title="设置默认图像模型">
    ```json5
    {
      agents: {
        defaults: {
          mediaModels: {
            image: {
              primary: "fal/fal-ai/flux/dev",
            },
          },
        },
      },
    }
    ```
  </Step>
</Steps>

## <a id="image-generation"></a> 图像生成

内置的 `fal` 图像生成提供程序默认使用 `fal/fal-ai/flux/dev`。

| 能力     | 值                                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| 最大图像数     | 每次请求最多 4 张；Krea 2：每次请求 1 张                                                    |
| 尺寸覆盖 | `1024x1024`, `1024x1536`, `1536x1024`, `1024x1792`, `1792x1024`                         |
| 宽高比   | 除 Flux 图像到图像外，其他所有地方都支持                                         |
| 分辨率     | `1K`、`2K`、`4K`（见下方各模型限制）                                               |
| 输出格式  | `png`（默认）或`jpeg`； GPT 图像 2.5 也支持 `webp`； Krea 2 拒绝覆盖 |

编辑请求（通过共享的 `image` / `images` 参数引用参考图像） 会路由到每个模型各自的编辑端点，并遵循各模型的参考图像限制：

| 模型系列              | `fal/` 后的模型引用                                | 编辑端点     | 最大参考图像数 |
| ------------------------- | ----------------------------------------------------- | ----------------- | -------------------- |
| Flux 和其他 fal 模型 | `fal-ai/flux/dev`（默认）                           | `/image-to-image` | 1                    |
| GPT 图片 2.5             | `openai/gpt-image-2.5/{flare,sunburst}/text-to-image` | 兄弟 `/edit`   | 16                   |
| 较旧的 GPT 图像           | `openai/gpt-image-*`                                  | `/edit`           | 10                   |
| Grok 想象一下              | `xai/grok-imagine-image`                              | `/edit`           | 3                    |
| Nano Banana（旧版）      | `fal-ai/nano-banana`                                  | `/edit`           | 3                    |
| 纳米香蕉2             | `fal-ai/nano-banana-*`                                | `/edit`           | 14                   |
| 纳米香蕉2 Lite        | `google/nano-banana-2-lite`                           | `/edit`           | 14                   |
| 韩国2号                    | `krea/v2/{medium,large}/text-to-image`                | 无（风格参考） | 10 个风格参考  |

<Warning>
Flux 图像到图像请求 **not** 支持 `aspectRatio` 覆盖。 GPT 图像和 Nano Banana 2 编辑请求使用 fal 的 `/edit` 端点并接受宽高比提示。 Nano Banana 2 还接受额外的原生 wide/tall 比率，例如 `4:1`、`1:4`、`8:1` 和 `1:8`； Krea 2 验证了自己的较小纵横比子集。 Grok Imagine 有自己的比率列表（包括 `2:1`、`20:9`、`19.5:9` 及其倒数），并且仅接受 `1K`/`2K` 分辨率；旧版 Nano Banana 和 Nano Banana 2 Lite 拒绝 `resolution` 覆盖。
</Warning>

### <a id="gpt-image-2.5"></a><a id="gpt-image-2-5"></a> GPT 图片 2.5

选择任一变体：

- `fal/openai/gpt-image-2.5/flare/text-to-image`
- `fal/openai/gpt-image-2.5/sunburst/text-to-image`

引用选择同级 `/edit` 端点。您还可以明确选择 `fal/openai/gpt-image-2.5/flare/edit` 或 `fal/openai/gpt-image-2.5/sunburst/edit`。

两种变体都支持 `quality: "low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"` 或 `"auto"`。 fal 默认为 `high`。他们接受 `background: "transparent"`、`"opaque"` 或 `"auto"`。对于透明度，请使用 `outputFormat: "png"` 或 `"webp"`。这些控件不会改变旧的 fal 模型。

使用 `size: "auto"` 或显式尺寸，例如 `1536x864`。尺寸必须能被 16 整除，且边缘不得超过 3840 像素。总像素必须为 655,360-8,294,400，长宽比为 1：3 到 3：1。 OpenClaw 将宽高比提示转换为有效尺寸。例如，`aspectRatio: "3:2"` 生成 `1536x1024`。使用 `size` 选择精确尺寸。 OpenClaw 拒绝无效的显式大小。这些模型拒绝 `resolution` 覆盖。没有几何提示的编辑保留 fal 的自动尺寸选择。

```bash
openclaw infer image generate \
  --model fal/openai/gpt-image-2.5/flare/text-to-image \
  --prompt "A simple red circle sticker" \
  --quality low --size 1024x1024 --json

openclaw infer image edit \
  --model fal/openai/gpt-image-2.5/sunburst/edit \
  --file /path/to/reference.png \
  --prompt "Keep the shape and change the color to blue" \
  --quality low --size auto --json
```

### <a id="krea-2"></a> 韩国2

Krea 2 模型使用 fal 的原生 Krea 负载架构。OpenClaw 发送 `aspect_ratio`、`creativity` 和 `image_style_references`，而不是 Flux 使用的通用 `image_size`／编辑端点负载。模型引用为：

- `fal/krea/v2/medium/text-to-image`
- `fal/krea/v2/large/text-to-image`

Medium 适合更快的表现型插画、动漫、绘画和艺术风格。Large 适合更慢的写实、 原始纹理、胶片颗粒和更细致的效果。Krea 默认 `fal.creativity: "medium"`； 支持的值为 `raw`、`low`、`medium` 和 `high`。

Krea 2 在 fal 的请求架构中暴露的是宽高比，而不是 `image_size`。优先使用 `aspectRatio`； OpenClaw 会将 `size` 映射为最接近的 Krea 支持的宽高比，并拒绝 Krea 的 `resolution` 覆盖项，而不是忽略它。

使用`outputFormat: "png"`当你想要的时候PNG输出来自fal暴露的模型`output_format`。外部GPT图像2.5， fal模型没有声明透明背景控件OpenClaw。他们报告`background`作为被忽略的覆盖。克里亚2端点不暴露`output_format`请求字段通过fal， so OpenClaw拒绝`outputFormat`覆盖 Krea 请求。

要使用 Krea 2 Medium：

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        image: {
          primary: "fal/krea/v2/medium/text-to-image",
        },
      },
    },
  },
}
```

## <a id="video-generation"></a> 视频生成

内置的 `fal` 视频生成提供程序默认使用 `fal/fal-ai/minimax/video-01-live`。

| 能力 | 值                                                              |
| ---------- | ------------------------------------------------------------------ |
| 模式      | 文本生成视频、单张图像参考、Seedance 参考生成视频 |
| 运行时    | 面向长时间运行任务的队列支持 submit/status/result 流程       |
| 超时    | 默认每个任务 20 分钟；每 5 秒轮询一次状态       |

<AccordionGroup>
  <Accordion id="available-video-models" title="可用的视频模型">
    **MiniMax（默认）：**

    - `fal/fal-ai/minimax/video-01-live`

    **HeyGen 视频代理：**

    - `fal/fal-ai/heygen/v2/video-agent`

    **Kling 和 Wan：**

    - `fal/fal-ai/kling-video/v2.1/master/text-to-video`
    - `fal/fal-ai/wan/v2.2-a14b/text-to-video`
    - `fal/fal-ai/wan/v2.2-a14b/image-to-video`

    **Seedance 2.0：**

    - `fal/bytedance/seedance-2.0/fast/text-to-video`
    - `fal/bytedance/seedance-2.0/fast/image-to-video`
    - `fal/bytedance/seedance-2.0/fast/reference-to-video`
    - `fal/bytedance/seedance-2.0/text-to-video`
    - `fal/bytedance/seedance-2.0/image-to-video`
    - `fal/bytedance/seedance-2.0/reference-to-video`

    MiniMax Live 和 HeyGen 请求只发送提示词以及可选的单张参考图像；不会传递其他覆盖项。Seedance 模型接受 `aspectRatio`、`size`、`resolution`、4 到 15 秒的时长，以及音频开关。

  </Accordion>

  <Accordion id="seedance-2-0-config-example" title="Seedance 2.0 配置示例">
    ```json5
    {
      agents: {
        defaults: {
          mediaModels: {
            video: {
              primary: "fal/bytedance/seedance-2.0/fast/text-to-video",
            },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion id="seedance-2-0-reference-to-video-config-example" title="Seedance 2.0 参考视频配置示例">
    ```json5
    {
      agents: {
        defaults: {
          mediaModels: {
            video: {
              primary: "fal/bytedance/seedance-2.0/fast/reference-to-video",
            },
          },
        },
      },
    }
    ```

    参考生成视频最多可通过共享的 `video_generate` `images`、`videos` 和 `audioRefs` 参数接受 9 张图片、3 个视频和 3 个音频参考， 总参考文件数最多为 12 个。音频参考要求同一请求中至少包含一个图片或视频参考。

  </Accordion>

  <Accordion id="heygen-video-agent-config-example" title="HeyGen 视频代理配置示例">
    ```json5
    {
      agents: {
        defaults: {
          mediaModels: {
            video: {
              primary: "fal/fal-ai/heygen/v2/video-agent",
            },
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

## <a id="music-generation"></a> 音乐生成

内置的 `fal` 插件还为共享的 `music_generate` 工具注册了一个音乐生成提供程序。

| 能力    | 值                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 默认模型 | `fal/fal-ai/minimax-music/v2.6`                                                                                          |
| 模型        | `fal-ai/minimax-music/v2.6` （mp3）、`fal-ai/ace-step/prompt-to-audio` （wav）、`fal-ai/stable-audio-25/text-to-audio` （wav） |
| 最大时长  | 240 秒                                                                                                              |
| 运行时       | 同步请求加生成音频下载                                                                        |

将 fal 设为默认音乐提供程序：

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        music: {
          primary: "fal/fal-ai/minimax-music/v2.6",
        },
      },
    },
  },
}
```

`fal-ai/minimax-music/v2.6` 支持显式歌词和纯音乐模式， 但不能在同一次请求中同时使用。ACE-Step 和 Stable Audio 是 prompt-to-audio 端点；当你需要这些模型系列时， 请使用 `model` 覆盖来选择它们。ACE-Step 会拒绝显式歌词；Stable Audio 会拒绝歌词和纯音乐模式。

<Tip>
上面的表格和折叠面板涵盖了内置 fal 提供程序进行特殊处理的模型系列。其他 fal 图像端点 id 仍然可以被选为图像模型；它们会像 Flux 一样处理（通用的 `image_size` 负载，通过 `/image-to-image` 仅使用一张参考图像）。
</Tip>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    共享音乐工具参数和提供商选择。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认设置，包括图像、视频和音乐模型选择。
  </Card>
</CardGroup>
