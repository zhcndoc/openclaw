---
summary: "通过 video_generate 从 18 个提供商后端的文本、图像或视频参考生成视频"
read_when:
  - "通过代理生成视频"
  - "配置视频生成提供商和模型"
  - "了解 video_generate 工具参数"
title: "视频生成"
sidebarTitle: "视频生成"
---

OpenClaw 代理通过 `video_generate` 根据文本提示、参考图像或现有视频生成视频。支持十八个提供商后端；代理根据配置​​和可用的 API 密钥自动选择正确的密钥。 18 个提供商 ID 涵盖 17 个插件； MiniMax 注册单独的 API-key （`minimax`） 和 OAuth （`minimax-portal`） 后端。

<Note>
`video_generate` 仅在至少有一个视频生成提供商可用时才会显示。 如果它没有出现在你的代理工具中，请设置提供商 API 密钥或配置 `agents.defaults.mediaModels.video`。
</Note>

`video_generate` 有三种运行模式，会根据调用中的参考输入来解析：

- `generate` - 无参考媒体（文生视频）。
- `imageToVideo` - 一个或多个参考图像。
- `videoToVideo` - 一个或多个参考视频。

提供商可以支持这些模式中的任意子集。该工具会在提交前验证当前活动模式，并在 `action=list` 中报告支持的模式。

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="configure-auth" title="配置身份验证">
    为任何受支持的提供商设置 API 密钥：

    ```bash
    export GEMINI_API_KEY="your-key"
    ```

  </Step>
  <Step id="pick-a-default-model-optional" title="选择默认模型（可选）">
    ```bash
    openclaw config set agents.defaults.mediaModels.video.primary "google/veo-3.1-fast-generate-preview"
    ```
  </Step>
  <Step id="ask-the-agent" title="询问代理">
    > 生成一段 5 秒的电影感视频，内容是一只友好的龙虾在日落时冲浪。

    代理将自动调用 `video_generate`。无需配置工具白名单。

  </Step>
</Steps>

## <a id="how-async-generation-works"></a> 异步生成的工作方式

视频生成是异步的：

1. OpenClaw向提供者提交请求并立即返回任务id。
2. 提供商在后台处理该任务（通常需要 30 秒到几分钟，具体取决于提供商和分辨率；依赖队列的慢速提供商最长可运行到配置的超时时间）。
3. 视频准备就绪后，OpenClaw 会通过内部完成事件唤醒同一会话。
4. 代理通过会话的正常可见回复模式报告它：自动最终回复，或当会话需要消息工具时为`message(action="send")`。如果请求方会话处于非活动状态，或者其唤醒失败，并且生成的媒体在完成回复中仍然丢失，OpenClaw 会使用媒体发送直接回退，而不会在重试时重复发送。

当作业正在进行时，同一聊天中的重复 `video_generate` 调用会返回当前任务状态，而不是开始另一代。使用`action: "status"`进行检查，不触发新一代。直接聊天即使共享主会话记录，也会保留单独的任务；完成返回给请求方。

在基于会话的代理运行之外（例如直接调用工具时），该工具会回退为内联生成，并在同一轮返回最终媒体路径。

当提供程序返回字节时，生成的视频文件保存在 OpenClaw- 托管媒体存储下。默认上限为16MB（共享视频媒体限制）； `agents.defaults.mediaMaxMb` 提高它以进行更大的渲染。当提供程序还返回托管输出 URL 时，如果本地持久性拒绝超大文件，则 OpenClaw 会传送该 URL，而不是使任务失败。

### <a id="task-lifecycle"></a> 任务生命周期

| 状态       | 含义                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `queued`    | 任务已创建，等待提供者接受。                                                   |
| `running`   | 提供商正在处理（通常需要 30 秒到几分钟，具体取决于提供商和分辨率）。 |
| `succeeded` | 视频已就绪；代理会唤醒并将其发布到对话中。                                         |
| `failed`    | 提供者错误或超时；代理醒来时会显示错误详细信息。                                         |

## <a id="supported-providers"></a> 支持的提供商

| 提供者              | 默认模型                   | 文本 | 图像引用                                            | 视频引用                                       | 认证                                     |
| --------------------- | ------------------------------- | :--: | ---------------------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| 阿里巴巴               | `wan2.6-t2v`                    |  ✓   | 本地或远程（i2v 和 Wan 2.7）                    | 是（远程 URL）                                | `MODELSTUDIO_API_KEY`                    |
| BytePlus 插件       | `seedance-1-0-pro-250528`       |  ✓   | 最多 2 张图片（首帧 + 末帧）                  | -                                               | `BYTEPLUS_API_KEY`                       |
| BytePlus 1.5 插件   | `seedance-1-5-pro-251215`       |  ✓   | 最多 2 张图片（通过角色指定首帧 + 末帧）         | -                                               | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 2.0 | `dreamina-seedance-2-0-260128`  |  ✓   | 最多 9 张参考图片                             | 最多 3 个视频                                  | `BYTEPLUS_API_KEY`                       |
| ComfyUI               | `workflow`                      |  ✓   | 1 张图片                                              | -                                               | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| DeepInfra             | `Pixverse/Pixverse-T2V`         |  ✓   | -                                                    | -                                               | `DEEPINFRA_API_KEY`                      |
| fal                   | `fal-ai/minimax/video-01-live`  |  ✓   | 1 张图片；使用 Seedance reference-to-video 时最多 9 张    | 使用 Seedance reference-to-video 时最多 3 个视频 | `FAL_KEY`                                |
| Google                | `veo-3.1-fast-generate-preview` |  ✓   | 1 张图片                                              | 1 个视频                                         | `GEMINI_API_KEY`                         |
| Kie AI                | `kling-2.6/text-to-video`       |  ✓   | 1 个本地或远程图像                              | -                                               | `KIE_API_KEY`                            |
| MiniMax               | `MiniMax-Hailuo-2.3`            |  ✓   | 1 张图片                                              | -                                               | `MINIMAX_API_KEY` 或 MiniMax OAuth       |
| 诺维塔                | `wan2.6-t2v`                    |  ✓   | 1 张图片（URL 或本地文件）                          | -                                               | `NOVITA_API_KEY`                         |
| OpenRouter            | `google/veo-3.1-fast`           |  ✓   | 最多 4 张图像（first/last 框架或参考）      | -                                               | `OPENROUTER_API_KEY`                     |
| PixVerse              | `v6`                            |  ✓   | 1 个本地或远程图像                              | -                                               | `PIXVERSE_API_KEY`                       |
| Qwen                  | `wan2.6-t2v`                    |  ✓   | 本地或远程（i2v 和 Wan 2.7）                    | 是（远程 URL）                                | `QWEN_API_KEY`                           |
| Runway                | `gen4.5`                        |  ✓   | 1 张图片                                              | 1 个视频                                         | `RUNWAYML_API_SECRET`                    |
| Together              | `Wan-AI/wan2.7-t2v`             |  ✓   | 仅限 `Wan-AI/wan2.7-i2v`                             | -                                               | `TOGETHER_API_KEY`                       |
| Vydra                 | `veo3`                          |  ✓   | 1 张图片（`kling`）                                    | -                                               | `VYDRA_API_KEY`                          |
| xAI                   | `grok-imagine-video`            |  ✓   | 经典版：1 张首帧或 7 张参考图；1.5：1 帧 | 经典版：1 个视频                                | `XAI_API_KEY`                            |
| Z.AI                  | `cogvideox-3`                   |  ✓   | 1 张图片（URL 或本地文件）                          | -                                               | `ZAI_API_KEY`                            |

某些提供商还接受额外或替代的 API 密钥环境变量。详情请参见各个[提供商页面](#related)。

运行 `video_generate action=list` 可在运行时检查可用的提供商、模型和运行模式。

### <a id="capability-matrix"></a> 能力矩阵

`video_generate`、契约测试和共享实时 sweep 使用的显式模式契约：

| 提供者   | `generate` | `imageToVideo` | `videoToVideo` | 共享实时通道                                                                                                                       |
| ---------- | :--------: | :------------: | :------------: | --------------------------------------------------------------------------------------------------------------------------------------- |
| 阿里巴巴    |     ✓      |       ✓        |       ✓        | `generate`，本地`imageToVideo`（默认路由到`wan2.6-i2v`）； `videoToVideo` 需要远程 `http(s)` 视频 URL                     |
| BytePlus   |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                              |
| ComfyUI    |     ✓      |       ✓        |       -        | 不在共享 sweep 中；工作流特定覆盖由 Comfy 测试负责                                                              |
| DeepInfra  |     ✓      |       -        |       -        | `generate`；在插件契约中，原生 DeepInfra 视频 schema 属于文本生成视频                                                     |
| fal        |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；仅在使用 Seedance reference-to-video 时支持 `videoToVideo`                                                  |
| Google     |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；共享的 `videoToVideo` 已跳过，因为当前基于缓冲区的 Gemini/Veo sweep 不接受该输入 |
| Kie AI     |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                              |
| MiniMax    |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                              |
| 诺维塔     |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                              |
| OpenRouter |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                              |
| PixVerse   |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                              |
| Qwen       |     ✓      |       ✓        |       ✓        | `generate`，本地`imageToVideo`（默认路由到`wan2.6-i2v`）； `videoToVideo` 需要远程 `http(s)` 视频 URL                     |
| Runway     |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`； `videoToVideo` 仅当所选模型为 `runway/gen4_aleph` 时运行                                     |
| Together   |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                              |
| Vydra      |     ✓      |       ✓        |       -        | `generate`；共享的 `imageToVideo` 已跳过，因为 `veo3` 仅支持文本输入，而 `kling` 需要远程图片 URL                           |
| xAI        |     ✓      |       ✓        |       ✓        | 经典版支持所有模式；Video 1.5 仅支持图像转视频；远程 MP4 输入不会使 `videoToVideo` 进入共享 sweep             |
| Z.AI       |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                              |

## <a id="tool-parameters"></a> 工具参数

### <a id="required"></a> 必需

<ParamField path="prompt" type="string" required>
  用于生成视频的文本描述。`action: "generate"` 时必填。
</ParamField>

### <a id="content-inputs"></a> 内容输入

<ParamField path="image" type="string">单张参考图像（路径或 URL）。</ParamField>
<ParamField path="images" type="string[]">多张参考图像（最多 9 张）。</ParamField>
<ParamField path="imageRoles" type="string[]">
可选的每个位置角色提示与组合图像列表平行。标准值：`first_frame`、`last_frame`、`reference_image`。
</ParamField>
<ParamField path="video" type="string">单个参考视频（路径或 URL）。</ParamField>
<ParamField path="videos" type="string[]">多个参考视频（最多 4 个）。</ParamField>
<ParamField path="videoRoles" type="string[]">
可选的每个位置角色提示与组合视频列表并行。标准值：`reference_video`。
</ParamField>
<ParamField path="audioRef" type="string">
单个参考音频（路径或 URL）。当提供方支持音频输入时，用于背景音乐或语音参考。
</ParamField>
<ParamField path="audioRefs" type="string[]">多个参考音频（最多 3 个）。</ParamField>
<ParamField path="audioRoles" type="string[]">
可选的每个位置角色提示与组合音频列表并行。标准值：`reference_audio`。
</ParamField>

<Note>
角色提示按原样转发给提供者。标准值来自 `VideoGenerationAssetRole` 联合，但提供程序可以接受其他角色字符串。 `*Roles` 数组的条目不得多于相应的引用列表；相差一的错误会因明显错误而失败。使用空字符串来保留未设置的插槽。对于xAI，将每个镜像角色设置为`reference_image`，即可使用其`reference_images`生成模式；省略该角色或使用 `first_frame` 进行单图像图像到视频。重复引用保持其位置，因此同一图像可以为循环剪辑提供 `first_frame` 和 `last_frame`。
</Note>

### <a id="style-controls"></a> 样式控制

<ParamField path="aspectRatio" type="string">
  宽高比提示，例如 `1:1`、`16:9`、`9:16`、`adaptive`，或提供方特定值。OpenClaw 会按提供方对不支持的值进行规范化或忽略。
</ParamField>
<ParamField path="resolution" type="string"> 分辨率提示，例如 `360P`、`480P`、`540P`、`720P`、`768P`、`1080P`、`4K` 或特定于提供商的值。 OpenClaw 根据 provider.</ParamField> 标准化或忽略不支持的值
<ParamField path="durationSeconds" type="number">
  目标持续时间（以秒为单位）（四舍五入到最接近的提供商支持的值）。显式值必须舍入为正安全整数（1–9007199254740991 秒）；无效值会失败，而不是被限制为一秒。省略保留提供者默认值。
</ParamField>
当提供商支持 it.</ParamField> 时，<ParamField path="size" type="string">Size 提示
<ParamField path="audio" type="boolean">
  在支持时，启用输出中的生成音频。与 `audioRef*`（输入）不同。
</ParamField>
<ParamField path="watermark" type="boolean">supported.</ParamField> 时切换提供商水印

`adaptive` 是特定于提供商的哨兵：它按原样转发给在其功能中声明 `adaptive` 的提供商（e.g. BytePlus Seedance 使用它来自动检测输入图像尺寸的比率）。未声明的提供商会通过工具结果中的 `details.ignoredOverrides` 来显示该值，因此下降是可见的。

### <a id="advanced"></a> 高级

<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` 返回当前会话任务； `"list"` 检查提供商。
</ParamField>
<ParamField path="model" type="string">Provider/model 倍率 （e.g. `runway/gen4.5`）.</ParamField>
<ParamField path="filename" type="string">输出文件名 hint.</ParamField>
<ParamField path="timeoutMs" type="number">可选提供程序操作超时（以毫秒为单位）。省略时，OpenClaw 使用 `agents.defaults.mediaModels.video.timeoutMs`（如果已配置），否则当使用 exists.</ParamField> 时，插件创作的提供程序默认

对于 Runway 和 Together，显式超时涵盖提交、轮询和下载。单个 HTTP 请求保留 120 秒的限制。如果没有明确的超时，轮询预算将在提交后开始：Together 为 20 分钟，Runway 为 120 秒。请求和下载限制保持独立。

<ParamField path="providerOptions" type="object">
  特定于提供者的选项作为 JSON 对象 （e.g. `{"seed": 42, "draft": true}`）。声明类型化模式的提供者验证键和类型；未知键或不匹配在回退期间跳过候选。没有声明模式的提供者按原样接收选项。运行 `video_generate action=list` 以查看每个提供商接受的内容。
</ParamField>

<Note>
并非所有提供方都支持所有参数。OpenClaw 会将时长规范化为最接近的提供方支持值，并在回退提供方暴露不同控制面的情况下， 重映射已翻译的几何提示，例如将 size 转为 aspect-ratio。 真正不支持的覆盖会尽力忽略，并在工具结果中以警告形式报告。 硬性能力限制（例如参考输入过多）会在提交前失败。工具结果会报告已应用的设置；`details.normalization` 会记录任何从请求到实际应用的转换。
</Note>

参考输入会选择运行时模式：

- 没有参考媒体 -> `generate`
- 任意图像参考 -> `imageToVideo`
- 任意视频参考 -> `videoToVideo`
- 参考音频输入**不要**更改解析模式；它们适用于 image/video 引用选择的任何模式，并且仅与声明 `maxInputAudios` 的提供程序一起使用。

混合图像和视频参考并不是稳定的共享能力面。每次请求尽量只使用一种参考类型。

#### <a id="fallback-and-typed-options"></a> 回退与类型化选项

某些能力检查会在回退层而不是工具边界执行，因此超出主提供方限制的请求仍可能在具备相应能力的回退提供方上运行：

- 当请求包含音频引用时，将跳过声明没有 `maxInputAudios`（或 `0`）的主动候选者；下一位候选人将被试用。同样的防护措施适用于针对 `maxInputImages`/`maxInputVideos`. 的图像和视频引用计数
- 如果活动候选项的 `maxDurationSeconds` 低于请求的 `durationSeconds`，且未声明 `supportedDurationSeconds` 列表，则该候选项会被跳过。
- 当请求包含 `providerOptions`，且活动候选项明确声明了类型化的 `providerOptions` schema 时，如果提供的键不在 schema 中，或值类型不匹配，则该候选项会被跳过。未声明 schema 的提供方会原样接收选项（向后兼容的透传）。提供方可以通过声明空 schema（`capabilities.providerOptions: {}`）来选择完全不接受任何提供方选项；这会导致与类型不匹配相同的跳过行为。

请求中的第一个跳过原因记录在 `warn` 中，以便操作员了解其主要提供商何时被忽略；随后跳过 `debug` 处的日志以保持长后备链安静。如果每个候选都被跳过，则聚合错误包括每个候选的跳过原因。如果候选在生成过程中失败，则在尝试下一个候选之前，其提供程序、模型和错误会记录在 `warn` 中。

## <a id="actions"></a> 操作

| 操作     | 它的作用                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| `generate` | 默认。根据给定的提示词和可选的参考输入创建视频。                             |
| `status`   | 检查当前会话中正在进行的视频任务状态，不会启动新的生成。 |
| `list`     | 显示可用的提供方、模型及其能力。                                                |

## <a id="model-selection"></a> 模型选择

对于 `video_generate`，OpenClaw 按以下顺序解析模型：

1. **`model` 工具参数** - 设置后，仅尝试此模型。
2. 配置中的 **`agents.defaults.mediaModels.video.primary`**。
3. 按顺序使用 **`agents.defaults.mediaModels.video.fallbacks`**。
4. **自动检测** - 仅当未配置主要模型或后备模型时，使用配置的提供程序默认值。当前的默认提供程序排在第一位，然后按字母顺序排列剩余的提供程序。

如果某个提供商失败，则会自动尝试下一个候选项。如果所有候选项都失败，错误信息将包含每次尝试的详细信息。

显式视频模型配置限制回退到配置的列表； OpenClaw 不附加自动检测的提供程序。

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        video: {
          primary: "google/veo-3.1-fast-generate-preview",
          fallbacks: ["runway/gen4.5", "qwen/wan2.6-t2v"],
          timeoutMs: 180000, // optional per-tool provider request timeout override
        },
      },
    },
  },
}
```

## <a id="provider-notes"></a> 提供方说明

<AccordionGroup>
  <Accordion id="alibaba" title="阿里巴巴">
    使用 DashScope / Model Studio 异步端点。图像转视频和Wan 2.7参考图像接受本地文件或远程URL；本地图像作为数据 URI 发送，编码前每个图像最多 20 MB。当仅包含一张图像且没有视频的文本到视频模型位于已知目录中时，该模型会使用其同代图像到视频同级模型，例如 `wan2.6-t2v` 到 `wan2.6-i2v`。结果报告已解析的模型。参考视频和 Wan 2.6 视频参考图像仍然需要远程 `http(s)` URL。
  </Accordion>
  <Accordion id="byteplus-plugin" title="BytePlus 插件">
    需要官方的 `@openclaw/byteplus-provider` 插件。 提供方 id：`byteplus`。

    模型：`seedance-1-0-pro-250528`（默认）、 `seedance-1-5-pro-251215`。

    使用统一的 `content[]` API。支持最多 2 张输入图像 （`first_frame` + `last_frame`）。可以按位置传入图像，或为每张图像显式设置 `role`。

    支持的 `providerOptions` 键：`seed`（number）、`draft`（boolean - 强制 480p）、`camera_fixed`（boolean）。

  </Accordion>
  <Accordion id="byteplus-seedance-1-5-plugin" title="BytePlus Seedance 1.5 插件">
    需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark) 插件（外部插件，未内置）。提供方 id：`byteplus-seedance15`。模型： `seedance-1-5-pro-251215`。

    使用统一的`content[]` API。最多支持 2 个输入图像（`first_frame` + `last_frame`）。所有输入必须是远程 `https://` URL。在每个图像上设置 `role: "first_frame"` / `"last_frame"`，或按位置传递图像。

    `aspectRatio: "adaptive"` 会根据输入图像自动检测比例。 `audio: true` 映射为 `generate_audio`。`providerOptions.seed` （number）会被转发。

  </Accordion>
  <Accordion title="BytePlus Seedance 2.0">
    需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark) 插件（外部插件，未内置）。提供方 id：`byteplus-seedance2`。模型： `dreamina-seedance-2-0-260128`， `dreamina-seedance-2-0-fast-260128`。

    使用统一的`content[]` API。最多支持 9 个参考图像、3 个参考视频和 3 个参考音频。所有输入必须是远程 `https://` URL。在每个资产上设置 `role` - 支持的值：`"first_frame"`、`"last_frame"`、`"reference_image"`、`"reference_video"`、`"reference_audio"`。

    `aspectRatio: "adaptive"` 会根据输入图像自动检测比例。 `audio: true` 映射为 `generate_audio`。`providerOptions.seed` （number）会被转发。

  </Accordion>
  <Accordion title="ComfyUI">
    由工作流驱动的本地或云端执行。通过配置好的图支持文本转视频和图像转视频。
  </Accordion>
  <Accordion title="fal">
    为长时间运行的任务使用基于队列的流程。OpenClaw 默认最多等待 20 分钟，然后才将正在进行的 fal 队列任务视为超时。大多数 fal 视频模型接受单张图像参考。Seedance 2.0 reference-to-video 模型最多接受 9 张图像、3 个视频和 3 个音频参考， 总参考文件数最多 12 个。
  </Accordion>
  <Accordion title="Google （Gemini / Veo）">
    支持一张图像或一个视频参考。生成的音频请求将被忽略，并在 Gemini API 路径上发出警告，因为 API 拒绝当前 Veo 视频生成的 `generateAudio` 参数。
  </Accordion>
  <Accordion title="Kie AI">
    使用 Kie 的市场任务 API for Kling、Grok Imagine、Wan、Hailuo 和 Seedance。单个参考图像会自动选择家庭的图像到视频变体。本地图像通过 Kie 记录的 base64 上传 API 上传。生成可能需要几分钟；默认情况下，提供商最多等待十分钟。请参阅 [Kie AI](/providers/kie) 了解特定于模型的限制。
  </Accordion>
  <Accordion title="MiniMax">
    仅支持单张图像参考。MiniMax 接受 `768P` 和 `1080P` 分辨率；诸如 `720P` 的请求会在提交前规范化为最接近的支持值。
  </Accordion>
  <Accordion id="novita" title="诺维塔">
    使用本机万2.6和海洛2.3异步路由。一张具有 `-t2v` 模型的图像选择该系列的 `-i2v` 路线。这两个系列都接受本地图像作为数据 URI。 Wan默认为静默输出；为生成的音频设置 `audio: true`。海洛仅支持1080P 6秒。有关模型 ID 和提供商选项，请参阅 [NovitaAI](/providers/novita)。
  </Accordion>
  <Accordion title="OpenRouter">
    使用 OpenRouter 的异步 `/videos` API。OpenClaw 会提交任务，轮询 `polling_url`，并下载 `unsigned_urls` 或文档中说明的任务内容端点。 内置的 `google/veo-3.1-fast` 默认模型声明支持 4/6/8 秒时长、 `720P`/`1080P` 分辨率，以及 `16:9`/`9:16` 宽高比。
  </Accordion>
  <Accordion title="Qwen">
    与阿里巴巴相同的 DashScope 后端。图像到视频和 Wan 2.7 图像引用在编码或远程 URL 之前接受最多 20 个 MB 的本地文件。如果只有一张图像且没有视频，`wan2.6-t2v` 会自动使用 `wan2.6-i2v` 并在结果中报告该模型。参考视频和 Wan 2.6 参考视频图像需要远程 `http(s)` URL。
  </Accordion>
  <Accordion title="Runway">
    通过数据 URI 支持本地文件。视频到视频需要 `runway/gen4_aleph`。仅文本运行会显示 `16:9` 和 `9:16` 纵横比。
  </Accordion>
  <Accordion title="Together">
    仅使用 `Wan-AI/wan2.7-i2v` 的单个第一帧图像。 Wan 2.7 请求在 OpenClaw 中使用 2-10 秒。有关支持的大小和请求参数，请参阅 [Together AI](/providers/together)。
  </Accordion>
  <Accordion title="Vydra">
    直接使用 `https://www.vydra.ai/api/v1`，以避免重定向时丢失身份验证信息。 `veo3` 仅支持文本转视频；`kling` 需要远程图像 URL。
  </Accordion>
  <Accordion title="xAI">
    默认的 `grok-imagine-video` 模型支持文本转视频、单首帧图像转视频、通过 xAI `reference_images` 最多 7 个 `reference_image` 输入以及远程视频 edit/extend 流。生成默认为`480P`；当省略 `aspectRatio` 时，单图像图像到视频继承源比率。视频 edit/extend 继承输入几何体，不接受宽高比或分辨率覆盖。扩展接受 2-10 秒。

    `grok-imagine-video-1.5` 仅支持图像转视频：必须恰好提供一张图像。 它支持 1-15 秒以及 `480P`、`720P` 或 `1080P`，默认为 `480P`；省略 `aspectRatio` 会继承源图像比例。预览版和带日期的 1.5 标识符接受相同的校验，并会原样转发。

  </Accordion>
  <Accordion title="Z.AI">
    CogVideoX-3 支持文本或一张 PNG/JPEG 图像，包括最多 5 个 MB 作为数据 URI 发送的本地文件。持续时间正常为 5 或 10 秒； `audio: true` 启用声音。视频使用配置的全球或中国区域中的常规 API 端点，包括聊天使用编码计划端点时。有关尺寸和提供商选项，请参阅 [Z.AI](/providers/zai)。
  </Accordion>
</AccordionGroup>

## <a id="provider-capability-modes"></a> Provider能力模式

共享的视频生成契约支持特定于模式的能力， 而不是仅使用扁平的聚合限制。新的提供方实现应优先使用显式的模式块：

```typescript
capabilities: {
  generate: {
    maxVideos: 1,
    maxDurationSeconds: 10,
    supportsResolution: true,
  },
  imageToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputImages: 1,
    maxInputImagesByModel: { "provider/reference-to-video": 9 },
    maxDurationSeconds: 5,
  },
  videoToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputVideos: 1,
    maxDurationSeconds: 5,
  },
}
```

平面聚合字段（例如 `maxInputImages` 和 `maxInputVideos`）是 **而不是** 足以通告转换模式支持。提供商应明确声明 `generate`、`imageToVideo` 和 `videoToVideo`，以便实时测试、合约测试和共享 `video_generate` 工具可以验证这些声明的模式支持。

当提供方中的某个模型支持比其他模型更广泛的参考输入范围时，请使用 `maxInputImagesByModel`、`maxInputVideosByModel` 或 `maxInputAudiosByModel`，而不是提高整个模式的限制。

## <a id="live-tests"></a> 实时测试

为共享的捆绑提供商启用可选的实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

仓库封装命令：

```bash
pnpm test:live:media video
```

此实时文件默认优先使用已导出的提供方环境变量，而不是存储的认证配置文件，并默认执行发布安全的烟雾测试：

- 对扫描中的每个非 FAL 提供商执行 `generate`。
- 一秒钟的 lobster 提示词。
- 每个提供商的操作上限来自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS`（默认值为 `180000`）。

由于提供商侧队列延迟可能主导发布时间，FAL 采用可选启用：

```bash
pnpm test:live:media video --video-providers fal
```

设置 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 还会运行共享扫描可安全使用本地媒体执行的已声明变换模式：

- `imageToVideo` 当 `capabilities.imageToVideo.enabled` 时。
- `videoToVideo`，当 `capabilities.videoToVideo.enabled` 和 provider/model 在共享扫描中接受缓冲区支持的本地视频输入时。

在共享扫描中，缓冲支持的 `videoToVideo` 仅适用于 `runway` 和 `runway/gen4_aleph`，适用于 `fal` 仅适用于 `reference-to-video` 模型。

## <a id="configuration"></a> 配置

在你的 OpenClaw 配置中设置默认的视频生成模型：

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        video: {
          primary: "qwen/wan2.6-t2v",
          fallbacks: ["qwen/wan2.6-r2v-flash"],
        },
      },
    },
  },
}
```

或者通过 CLI：

```bash
openclaw config set agents.defaults.mediaModels.video.primary "qwen/wan2.6-t2v"
```

## <a id="related"></a> 相关内容

- [阿里巴巴 Model Studio](/providers/alibaba)
- [BytePlus](/concepts/model-providers#byteplus-international)
- [ComfyUI](/providers/comfy)
- [配置参考](/gateway/config-agents#agent-defaults)
- [fal](/providers/fal)
- [Google （Gemini）](/providers/google)
- [Kie AI](/providers/kie)
- [MiniMax](/providers/minimax)
- [模型](/concepts/models)
- [诺维塔AI](/providers/novita)
- [OpenRouter](/providers/openrouter)
- [PixVerse](/providers/pixverse)
- [Qwen](/providers/qwen)
- [跑道](/providers/runway)
- [一起 AI](/providers/together)
- [工具概览](/tools)
- [Vydra](/providers/vydra)
- [xAI](/providers/xai)
- [Z.AI](/providers/zai)
- [媒体概述](/tools/media-overview) - 媒体工具如何组合在一起
