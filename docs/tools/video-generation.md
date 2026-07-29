---
summary: "通过 `video_generate` 从文本、图像或视频参考跨 16 个提供商后端生成视频"
read_when:
  - 通过代理生成视频
  - 配置视频生成提供商和模型
  - 了解 `video_generate` 工具参数
title: "视频生成"
sidebarTitle: "视频生成"
---

OpenClaw 代理通过 `video_generate` 从文本提示、参考图像或
现有视频生成视频。支持 16 个提供商后端；代理会根据配置和
可用的 API 密钥自动选择合适的后端。

<Note>
`video_generate` 仅在至少有一个视频生成提供商可用时才会显示。
如果它没有出现在你的代理工具中，请设置提供商 API 密钥或
配置 `agents.defaults.mediaModels.video`。
</Note>

`video_generate` 有三种运行模式，会根据调用中的参考输入来解析：

- `generate` - 无参考媒体（文生视频）。
- `imageToVideo` - 一个或多个参考图像。
- `videoToVideo` - 一个或多个参考视频。

提供商可以支持这些模式中的任意子集。该工具会在提交前验证当前活动模式，并在 `action=list` 中报告支持的模式。

## 快速开始

<Steps>
  <Step title="设置身份验证">
    为任何受支持的提供商设置 API 密钥：

    ```bash
    export GEMINI_API_KEY="your-key"
    ```

  </Step>
  <Step title="选择默认模型（可选）">
    ```bash
    openclaw config set agents.defaults.mediaModels.video.primary "google/veo-3.1-fast-generate-preview"
    ```
  </Step>
  <Step title="让代理执行">
    > 生成一段 5 秒的电影感视频，内容是一只友好的龙虾在日落时冲浪。

    代理将自动调用 `video_generate`。无需配置工具白名单。

  </Step>
</Steps>

## 异步生成的工作方式

视频生成是异步的：

1. OpenClaw 向提供商提交请求，并立即返回一个任务 ID。
2. 提供商在后台处理该任务（通常需要 30 秒到几分钟，具体取决于提供商和分辨率；依赖队列的慢速提供商最长可运行到配置的超时时间）。
3. 视频准备就绪后，OpenClaw 会通过内部完成事件唤醒同一会话。
4. 代理会通过会话的常规可见回复模式报告结果：
   自动最终回复，或在会话需要
   message 工具时使用 `message(action="send")`。如果请求方会话处于非活动状态，或者唤醒失败且
   生成的媒体在完成回复中仍然缺失，OpenClaw 会发送
   带有媒体的幂等直接回退。

在任务运行期间，同一
会话中的重复 `video_generate` 调用会返回当前任务状态，而不是启动另一
次生成。使用 `action: "status"` 可在不触发新
生成的情况下检查状态，或者在
CLI 中使用 `openclaw tasks list` / `openclaw tasks show <lookup>`（参见 [后台任务](/automation/tasks)）。

在基于会话的代理运行之外（例如直接调用工具时），该工具会回退为内联生成，并在同一轮返回最终媒体路径。

当
提供商返回字节数据时，生成的视频文件会保存到 OpenClaw 管理的媒体存储中。默认上限为 16MB（共享的视频媒体
限制）；`agents.defaults.mediaMaxMb` 可将其提高以支持更大的渲染结果。当
提供商同时返回托管输出 URL 时，如果本地持久化因文件过大而被拒绝，OpenClaw 会直接提供该 URL
，而不是使任务失败。

### 任务生命周期

| 状态        | 含义                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `queued`    | 任务已创建，正在等待提供商接受。                                                                           |
| `running`   | 提供商正在处理（通常需要 30 秒到几分钟，具体取决于提供商和分辨率）。                                     |
| `succeeded` | 视频已就绪；代理会唤醒并将其发布到对话中。                                                                 |
| `failed`    | 提供商错误或超时；代理唤醒并附带错误详情。                                                                 |

从 CLI 检查状态：

```bash
openclaw tasks list
openclaw tasks show <lookup>
openclaw tasks cancel <lookup>
```

## 支持的提供商

| 提供商                | 默认模型                        | 文本 | 图像引用                                           | 视频引用                                      | 认证                                     |
| --------------------- | ------------------------------- | :--: | ---------------------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| Alibaba               | `wan2.6-t2v`                    |  ✓   | 是（远程 URL）                                      | 是（远程 URL）                                | `MODELSTUDIO_API_KEY`                    |
| BytePlus (bundled)    | `seedance-1-0-pro-250528`       |  ✓   | 最多 2 张图片（首帧 + 末帧）                         | -                                               | `BYTEPLUS_API_KEY`                       |
| BytePlus 1.5 plugin   | `seedance-1-5-pro-251215`       |  ✓   | 最多 2 张图片（通过角色指定首帧 + 末帧）             | -                                               | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 2.0 | `dreamina-seedance-2-0-260128`  |  ✓   | 最多 9 张参考图                                      | 最多 3 个视频                                    | `BYTEPLUS_API_KEY`                       |
| ComfyUI               | `workflow`                      |  ✓   | 1 张图片                                              | -                                               | `COMFY_API_KEY` or `COMFY_CLOUD_API_KEY` |
| DeepInfra             | `Pixverse/Pixverse-T2V`         |  ✓   | -                                                    | -                                               | `DEEPINFRA_API_KEY`                      |
| fal                   | `fal-ai/minimax/video-01-live`  |  ✓   | 1 张图片；使用 Seedance reference-to-video 时最多 9 张 | 使用 Seedance reference-to-video 时最多 3 个视频 | `FAL_KEY`                                |
| Google                | `veo-3.1-fast-generate-preview` |  ✓   | 1 张图片                                              | 1 个视频                                        | `GEMINI_API_KEY`                         |
| MiniMax               | `MiniMax-Hailuo-2.3`            |  ✓   | 1 张图片                                              | -                                               | `MINIMAX_API_KEY` 或 MiniMax OAuth       |
| OpenAI                | `sora-2`                        |  ✓   | 1 张图片                                              | 1 个视频                                        | `OPENAI_API_KEY`                         |
| OpenRouter            | `google/veo-3.1-fast`           |  ✓   | 最多 4 张图片（首帧/末帧或参考图）                    | -                                               | `OPENROUTER_API_KEY`                     |
| Qwen                  | `wan2.6-t2v`                    |  ✓   | 是（远程 URL）                                      | 是（远程 URL）                                | `QWEN_API_KEY`                           |
| Runway                | `gen4.5`                        |  ✓   | 1 张图片                                              | 1 个视频                                        | `RUNWAYML_API_SECRET`                    |
| Together              | `Wan-AI/Wan2.2-T2V-A14B`        |  ✓   | 仅 `Wan-AI/Wan2.2-I2V-A14B`                         | -                                               | `TOGETHER_API_KEY`                       |
| Vydra                 | `veo3`                          |  ✓   | 1 张图片（`kling`）                                 | -                                               | `VYDRA_API_KEY`                          |
| xAI                   | `grok-imagine-video`            |  ✓   | 经典版：1 张首帧或 7 张参考图；1.5：1 帧              | 经典版：1 个视频                                | `XAI_API_KEY`                            |

某些提供商还接受额外或替代的 API 密钥环境变量。详情请参见各个[提供商页面](#related)。

运行 `video_generate action=list` 可在运行时检查可用的提供商、模型和运行模式。

### 功能矩阵

`video_generate`、契约测试和共享 live sweep 使用的显式模式契约：

| 提供商     | `generate` | `imageToVideo` | `videoToVideo` | 当前共享 live 通道                                                                                                                |
| ---------- | :--------: | :------------: | :------------: | --------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba    |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` 已跳过，因为此提供商需要远程 `http(s)` 视频 URL                                          |
| BytePlus   |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                              |
| ComfyUI    |     ✓      |       ✓        |       -        | 不在共享 sweep 中；工作流特定覆盖由 Comfy 测试负责                                                                                      |
| DeepInfra  |     ✓      |       -        |       -        | `generate`；在插件契约中，原生 DeepInfra 视频 schema 属于文本生成视频                                                                    |
| fal        |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; 仅在使用 Seedance reference-to-video 时支持 `videoToVideo`                                                |
| Google     |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; 共享的 `videoToVideo` 已跳过，因为当前基于缓冲区的 Gemini/Veo sweep 不接受该输入                          |
| MiniMax    |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                              |
| OpenAI     |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; 共享的 `videoToVideo` 已跳过，因为此组织/输入路径当前需要提供商侧视频编辑权限                              |
| OpenRouter |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                              |
| Qwen       |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` 已跳过，因为此提供商需要远程 `http(s)` 视频 URL                                              |
| Runway     |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; 仅当所选模型为 `runway/gen4_aleph` 时运行 `videoToVideo`                                                   |
| Together   |     ✓      |       ✓        |       -        | `generate`, `imageToVideo`                                                                                                              |
| Vydra      |     ✓      |       ✓        |       -        | `generate`; 共享的 `imageToVideo` 已跳过，因为捆绑的 `veo3` 仅支持文本，而捆绑的 `kling` 需要远程图片 URL                                 |
| xAI        |     ✓      |       ✓        |       ✓        | 经典版支持所有模式；Video 1.5 仅支持图生视频；远程 MP4 输入使 `videoToVideo` 不进入共享 sweep                                             |

## 工具参数

### 必需

<ParamField path="prompt" type="string" required>
  用于生成视频的文本描述。`action: "generate"` 时必填。
</ParamField>

### 内容输入

<ParamField path="image" type="string">单张参考图像（路径或 URL）。</ParamField>
<ParamField path="images" type="string[]">多张参考图像（最多 9 张）。</ParamField>
<ParamField path="imageRoles" type="string[]">
可选的按位置角色提示，与合并后的图像列表一一对应。
规范值：`first_frame`、`last_frame`、`reference_image`。
</ParamField>
<ParamField path="video" type="string">单个参考视频（路径或 URL）。</ParamField>
<ParamField path="videos" type="string[]">多个参考视频（最多 4 个）。</ParamField>
<ParamField path="videoRoles" type="string[]">
可选的按位置角色提示，与合并后的视频列表一一对应。
规范值：`reference_video`。
</ParamField>
<ParamField path="audioRef" type="string">
单个参考音频（路径或 URL）。当提供方支持音频输入时，用于背景音乐或语音参考。
</ParamField>
<ParamField path="audioRefs" type="string[]">多个参考音频（最多 3 个）。</ParamField>
<ParamField path="audioRoles" type="string[]">
可选的按位置角色提示，与合并后的音频列表一一对应。
规范值：`reference_audio`。
</ParamField>

<Note>
角色提示会原样转发给提供方。规范值来自
`VideoGenerationAssetRole` 联合类型，但提供方可能接受额外的
角色字符串。`*Roles` 数组中的条目数不得超过相应参考列表的
条目数；越界会报出清晰的错误。使用空字符串可将某个位置留空。
对于 xAI，将每个图像角色都设为 `reference_image` 可使用其
`reference_images` 生成模式；若为单张图像转视频，则省略角色或使用
`first_frame`。
</Note>

### 样式控制

<ParamField path="aspectRatio" type="string">
  宽高比提示，例如 `1:1`、`16:9`、`9:16`、`adaptive`，或提供方特定值。OpenClaw 会按提供方对不支持的值进行规范化或忽略。
</ParamField>
<ParamField path="resolution" type="string">分辨率提示，例如 `360P`、`480P`、`540P`、`720P`、`768P`、`1080P`、`4K`，或提供方特定值。OpenClaw 会按提供方对不支持的值进行规范化或忽略。</ParamField>
<ParamField path="durationSeconds" type="number">
  目标时长（秒），会四舍五入到最接近的提供方支持值。
</ParamField>
<ParamField path="size" type="string">当提供方支持时的尺寸提示。</ParamField>
<ParamField path="audio" type="boolean">
  在支持时，启用输出中的生成音频。与 `audioRef*`（输入）不同。
</ParamField>
<ParamField path="watermark" type="boolean">在支持时切换提供方水印。</ParamField>

`adaptive` 是一个特定于提供方的哨兵值：会原样转发给
在其能力中声明了 `adaptive` 的提供方（例如 BytePlus
Seedance 会用它根据输入图像尺寸自动检测比例）。
未声明它的提供方会在工具结果中的 `details.ignoredOverrides`
里暴露该值，因此丢弃是可见的。

### 高级

<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` 返回当前会话任务；`"list"` 检查提供商。
</ParamField>
<ParamField path="model" type="string">提供方/模型覆盖（例如 `runway/gen4.5`）。</ParamField>
<ParamField path="filename" type="string">输出文件名提示。</ParamField>
<ParamField path="timeoutMs" type="number">可选的提供方操作超时，单位为毫秒。若省略，OpenClaw 会在配置存在时使用 `agents.defaults.mediaModels.video.timeoutMs`，否则使用插件作者指定的提供方默认值（如果存在）。</ParamField>
<ParamField path="providerOptions" type="object">
  作为 JSON 对象的提供方特定选项（例如 `{"seed": 42, "draft": true}`）。
  声明了类型化 schema 的提供方会验证键和值类型；未知键或类型不匹配会在回退时跳过该候选项。未声明 schema 的提供方会原样接收这些选项。运行 `video_generate action=list`
  可查看每个提供方接受什么。
</ParamField>

<Note>
并非所有提供方都支持所有参数。OpenClaw 会将时长规范化为
最接近的提供方支持值，并在回退提供方暴露不同控制面的情况下，
重映射已翻译的几何提示，例如将 size 转为 aspect-ratio。
真正不支持的覆盖会尽力忽略，并在工具结果中以警告形式报告。
硬性能力限制（例如参考输入过多）会在提交前失败。工具结果会报告
已应用的设置；`details.normalization` 会记录任何
从请求到实际应用的转换。
</Note>

参考输入会选择运行时模式：

- 没有参考媒体 -> `generate`
- 任意图像参考 -> `imageToVideo`
- 任意视频参考 -> `videoToVideo`
- 参考音频输入 **不会** 改变解析出的模式；它们会叠加在图像/视频参考所选择的模式之上，并且仅适用于声明了 `maxInputAudios` 的提供方。

混合图像和视频参考并不是稳定的共享能力面。每次请求尽量只使用一种参考类型。

#### 回退与类型化选项

Some capability checks apply at the fallback layer rather than the tool
boundary, so a request that exceeds the primary provider's limits can still
run on a capable fallback:

- Active candidate declaring no `maxInputAudios` (or `0`) is skipped when
  the request contains audio references; next candidate is tried. The same
  guard applies to image and video reference counts against
  `maxInputImages`/`maxInputVideos`.
- Active candidate's `maxDurationSeconds` below the requested `durationSeconds`
  with no declared `supportedDurationSeconds` list -> skipped.
- Request contains `providerOptions` and the active candidate explicitly
  declares a typed `providerOptions` schema -> skipped if supplied keys are
  not in the schema or value types do not match. Providers without a
  declared schema receive options as-is (backward-compatible
  pass-through). A provider can opt out of all provider options by
  declaring an empty schema (`capabilities.providerOptions: {}`), which
  causes the same skip as a type mismatch.

请求中的第一个跳过原因会以 `warn` 级别记录，因此运维人员能看到主提供方何时被跳过；后续跳过会以 `debug` 级别记录，以保持较长的回退链安静。如果所有候选项都被跳过，聚合错误会包含每个跳过原因。

## 操作

| 操作       | 描述                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `generate`   | 默认。根据给定的提示词和可选的参考输入创建视频。                     |
| `status`     | 检查当前会话中正在进行的视频任务状态，不会启动新的生成。 |
| `list`       | 显示可用的提供方、模型及其能力。                                        |

## Model Selection

OpenClaw resolves models in the following order:

1. **`model` tool parameter** - if specified by the agent in the call.
2. **`videoGenerationModel.primary`** in the configuration.
3. Use **`videoGenerationModel.fallbacks`** in order.
4. **Auto-detection** - providers with valid authentication, starting from the current default provider and then processing the remaining providers in alphabetical order.

If a provider fails, the next candidate is automatically tried. If all
candidates fail, the error will include details of each attempt.

Automatic fallback across authenticated providers is always enabled. A per-call
`model` remains authoritative.

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
        fallbacks: ["runway/gen4.5", "qwen/wan2.6-t2v"],
        timeoutMs: 180000, // Optional per-tool provider request timeout override
      },
    },
  },
}
```

## 提供方说明

<AccordionGroup>
  <Accordion title="Alibaba">
    使用 DashScope / Model Studio 异步端点。参考图像和
    视频必须是远程 `http(s)` URL。
  </Accordion>
  <Accordion title="BytePlus (bundled)">
    提供方 id: `byteplus`。

    模型：`seedance-1-0-pro-250528`（默认）、
    `seedance-1-5-pro-251215`。

    使用统一的 `content[]` API。支持最多 2 张输入图像
    （`first_frame` + `last_frame`）。可以按位置传入图像，或为每张图像显式设置
    `role`。

    支持的 `providerOptions` 键：`seed`（number）、`draft`（boolean -
    强制 480p）、`camera_fixed`（boolean）。

  </Accordion>
  <Accordion title="BytePlus Seedance 1.5 plugin">
    需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark)
    插件（外部插件，未内置）。提供方 id：`byteplus-seedance15`。模型：
    `seedance-1-5-pro-251215`。

    使用统一的 `content[]` API。最多支持 2 张输入图像
   （`first_frame` + `last_frame`）。所有输入都必须是远程 `https://`
    URL。为每张图像设置 `role: "first_frame"` / `"last_frame"`，或
    按位置传入图像。

    `aspectRatio: "adaptive"` 会根据输入图像自动检测比例。
    `audio: true` 映射为 `generate_audio`。`providerOptions.seed`
    （number）会被转发。

  </Accordion>
  <Accordion title="BytePlus Seedance 2.0">
    需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark)
    插件（外部插件，未内置）。提供方 id：`byteplus-seedance2`。模型：
    `dreamina-seedance-2-0-260128`，
    `dreamina-seedance-2-0-fast-260128`。

    使用统一的 `content[]` API。支持最多 9 张参考图像、
    3 个参考视频和 3 个参考音频。所有输入都必须是远程
    `https://` URL。为每个素材设置 `role` - 支持值：
    `"first_frame"`、`"last_frame"`、`"reference_image"`、
    `"reference_video"`、`"reference_audio"`。

    `aspectRatio: "adaptive"` 会根据输入图像自动检测比例。
    `audio: true` 映射为 `generate_audio`。`providerOptions.seed`
    （number）会被转发。

  </Accordion>
  <Accordion title="ComfyUI">
    由工作流驱动的本地或云端执行。通过配置好的图支持文本转视频和
    图像转视频。
  </Accordion>
  <Accordion title="fal">
    为长时间运行的任务使用基于队列的流程。OpenClaw 默认最多等待 20
    分钟，然后才将正在进行的 fal 队列任务视为超时。大多数 fal 视频模型
    接受单张图像参考。Seedance 2.0 reference-to-video
    模型最多接受 9 张图像、3 个视频和 3 个音频参考，
    总参考文件数最多 12 个。
  </Accordion>
  <Accordion title="Google (Gemini / Veo)">
    支持一张图像或一段视频参考。由于当前 Veo 视频生成的 Gemini API 路径会拒绝
    `generateAudio` 参数，因此生成音频请求在该路径上会被忽略并给出警告。
  </Accordion>
  <Accordion title="MiniMax">
    仅支持单张图像参考。MiniMax 接受 `768P` 和 `1080P`
    分辨率；诸如 `720P` 的请求会在提交前规范化为最接近的
    支持值。
  </Accordion>
  <Accordion title="OpenAI">
    仅转发 `size` 覆盖。其他样式覆盖
    （`aspectRatio`、`resolution`、`audio`、`watermark`）会被忽略并给出
    警告。
  </Accordion>
  <Accordion title="OpenRouter">
    使用 OpenRouter 的异步 `/videos` API。OpenClaw 会提交
    任务，轮询 `polling_url`，并下载 `unsigned_urls` 或文档中说明的任务内容端点。
    内置的 `google/veo-3.1-fast` 默认模型声明支持 4/6/8 秒时长、
    `720P`/`1080P` 分辨率，以及 `16:9`/`9:16` 宽高比。
  </Accordion>
  <Accordion title="Qwen">
    与 Alibaba 相同的 DashScope 后端。参考输入必须是远程
    `http(s)` URL；本地文件会在前置阶段被拒绝。
  </Accordion>
  <Accordion title="Runway">
    通过 data URI 支持本地文件。视频转视频需要
    `runway/gen4_aleph`。纯文本运行公开 `16:9` 和 `9:16` 宽高比。
  </Accordion>
  <Accordion title="Together">
    仅支持单张图像参考。
  </Accordion>
  <Accordion title="Vydra">
    直接使用 `https://www.vydra.ai/api/v1`，以避免认证丢失的
    重定向。`veo3` 仅作为文本转视频捆绑；`kling` 需要
    远程图像 URL。
  </Accordion>
  <Accordion title="xAI">
    默认的 `grok-imagine-video` 模型支持文本转视频、单张首帧图像转视频、
    通过 xAI `reference_images` 最多 7 个 `reference_image` 输入，以及远程视频编辑/扩展流程。生成默认
    为 `480P`；单图像图像转视频在省略 `aspectRatio` 时会继承源比例。视频编辑/扩展会继承输入几何形状，
    不接受宽高比或分辨率覆盖。扩展支持 2-10 秒。

    `grok-imagine-video-1.5` 仅支持图像转视频：必须恰好提供一张图像。
    它支持 1-15 秒以及 `480P`、`720P` 或 `1080P`，默认
    为 `480P`；省略 `aspectRatio` 会继承源图像比例。预览版和带日期的 1.5 标识符
    接受相同的校验，并会原样转发。

  </Accordion>
</AccordionGroup>

## 提供方能力模式

共享的视频生成契约支持特定于模式的能力，
而不是仅使用扁平的聚合限制。新的提供方实现
应优先使用显式的模式块：

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

诸如 `maxInputImages` 和 `maxInputVideos` 之类的扁平聚合字段
**不足以**声明转换模式支持。提供方应当
显式声明 `generate`、`imageToVideo` 和 `videoToVideo`，以便
实时测试、契约测试以及共享的 `video_generate` 工具能够
确定性地验证模式支持。

当提供方中的某个模型支持比
其他模型更广泛的参考输入范围时，请使用 `maxInputImagesByModel`、`maxInputVideosByModel` 或
`maxInputAudiosByModel`，而不是提高整个模式的限制。

## 实时测试

为共享的捆绑提供商启用可选的实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

仓库封装命令：

```bash
pnpm test:live:media video
```

此实时文件默认优先使用已导出的提供方环境变量，而不是存储的认证
配置文件，并默认执行发布安全的烟雾测试：

- 对扫描中的每个非 FAL 提供商执行 `generate`。
- 一秒钟的 lobster 提示词。
- 每个提供商的操作上限来自
  `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS`（默认值为 `180000`）。

由于提供商侧队列延迟可能主导发布
时间，FAL 采用可选启用：

```bash
pnpm test:live:media video --video-providers fal
```

设置 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 还会运行共享扫描可安全使用本地媒体
执行的已声明变换模式：

- 当 `capabilities.imageToVideo.enabled` 时执行 `imageToVideo`。
- 当 `capabilities.videoToVideo.enabled` 且
  提供商/模型在共享扫描中接受基于缓冲区的本地视频输入时执行
  `videoToVideo`。

目前共享的 `videoToVideo` 实时通道仅在你
选择 `runway/gen4_aleph` 时覆盖 `runway`。

## 配置

在你的 OpenClaw 配置中设置默认的视频生成模型：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-r2v-flash"],
      },
    },
  },
}
```

或者通过 CLI：

```bash
openclaw config set agents.defaults.mediaModels.video.primary "qwen/wan2.6-t2v"
```

## 相关内容

- [阿里云百炼](/providers/alibaba)
- [后台任务](/automation/tasks) - 用于异步视频生成的任务跟踪
- [BytePlus](/concepts/model-providers#byteplus-international)
- [ComfyUI](/providers/comfy)
- [配置参考](/gateway/config-agents#agent-defaults)
- [fal](/providers/fal)
- [Google（Gemini）](/providers/google)
- [MiniMax](/providers/minimax)
- [模型](/concepts/models)
- [OpenAI](/providers/openai)
- [Qwen](/providers/qwen)
- [Runway](/providers/runway)
- [Together AI](/providers/together)
- [工具概览](/tools)
- [Vydra](/providers/vydra)
- [xAI](/providers/xai)
