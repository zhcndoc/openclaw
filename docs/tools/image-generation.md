---
summary: "通过 image_generate 在 OpenAI、Google、fal、MiniMax、ComfyUI、DeepInfra、OpenRouter、LiteLLM、xAI、Vydra 上生成和编辑图像"
read_when:
  - 通过 agent 生成或编辑图像
  - 配置图像生成提供方和模型
  - 了解 image_generate 工具参数
title: "图像生成"
sidebarTitle: "图像生成"
---

`image_generate` 工具允许 agent 使用已配置的提供方创建和编辑图像。在聊天会话中，图像生成是异步运行的：OpenClaw 会记录一个后台任务，立即返回任务 ID，并在提供方完成后唤醒 agent。完成代理遵循会话的常规可见回复模式：在已配置时自动发送最终回复，或者在会话需要消息工具时使用 `message(action="send")`。如果请求方会话处于非活动状态，或者其主动唤醒失败，并且某些生成的图像仍然缺失于完成回复中，OpenClaw 会发送一个幂等的直接回退，仅包含缺失的图像。

<Note>
只有在至少有一个图像生成提供方可用时，该工具才会出现。如果你在 agent 的工具中看不到 `image_generate`，请配置 `agents.defaults.imageGenerationModel`、设置提供方 API 密钥，或使用 OpenAI ChatGPT/Codex OAuth 登录。
</Note>

## 快速开始

<Steps>
  <Step title="配置认证">
    为至少一个提供方设置 API 密钥（例如 `OPENAI_API_KEY`、
    `GEMINI_API_KEY`、`OPENROUTER_API_KEY`）或使用 OpenAI Codex OAuth 登录。
  </Step>
  <Step title="选择默认模型（可选）">
    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "openai/gpt-image-2",
            timeoutMs: 180_000,
          },
        },
      },
    }
    ```

    ChatGPT/Codex OAuth 使用相同的 `openai/gpt-image-2` 模型引用。当配置了
    `openai` OAuth 配置文件时，OpenClaw 会通过该 OAuth 配置文件路由图像请求，而不是先尝试
    `OPENAI_API_KEY`。显式的 `models.providers.openai` 配置（API 密钥、自定义/Azure base URL）
    会改回直接使用 OpenAI Images API 路由。

  </Step>
  <Step title="让 agent 执行">
    _"生成一张友好机器人吉祥物的图片。"_

    agent 会自动调用 `image_generate`。无需工具 allow-listing——当有提供方可用时，它默认启用。该工具会返回一个后台任务 ID，随后完成后的 agent 会在准备好后通过 `message` 工具发送生成的附件。

  </Step>
</Steps>

<Warning>
对于 OpenAI 兼容的 LAN 端点，例如 LocalAI，请保留自定义的
`models.providers.openai.baseUrl`，并显式启用 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。默认情况下，私有和
内部图像端点仍会被阻止。
</Warning>

## 常用路由

| 目标                                                 | 模型引用                                           | 认证                                   |
| ---------------------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| OpenAI image generation with API billing             | `openai/gpt-image-2`                               | `OPENAI_API_KEY`                       |
| OpenAI image generation with Codex subscription auth | `openai/gpt-image-2`                               | OpenAI ChatGPT/Codex OAuth             |
| OpenAI transparent-background PNG/WebP               | `openai/gpt-image-1.5`                             | `OPENAI_API_KEY` or OpenAI Codex OAuth |
| DeepInfra image generation                           | `deepinfra/black-forest-labs/FLUX-1-schnell`       | `DEEPINFRA_API_KEY`                    |
| fal Krea 2 expressive/style-directed generation      | `fal/krea/v2/medium/text-to-image`                 | `FAL_KEY`                              |
| OpenRouter image generation                          | `openrouter/google/gemini-3.1-flash-image-preview` | `OPENROUTER_API_KEY`                   |
| LiteLLM image generation                             | `litellm/gpt-image-2`                              | `LITELLM_API_KEY`                      |
| Google Gemini image generation                       | `google/gemini-3.1-flash-image-preview`            | `GEMINI_API_KEY` or `GOOGLE_API_KEY`   |

同一个 `image_generate` 工具同时处理文本生成图像和参考图像编辑。单个参考图像使用 `image`，多个参考图像使用 `images`。对于 fal 上的 Krea 2 模型，这些参考图像会作为风格参考而不是编辑输入发送。提供方支持的输出提示，如 `quality`、`outputFormat` 和 `background`，会在可用时透传；当某个提供方不支持这些提示时，会报告为已忽略。内置的透明背景支持是 OpenAI 专属；其他提供方如果其后端输出了 PNG alpha，也可能保留该透明度。

## 支持的提供方

| Provider   | Default model                           | Edit support                       | Auth                                                  |
| ---------- | --------------------------------------- | ---------------------------------- | ----------------------------------------------------- |
| ComfyUI    | `workflow`                              | Yes (1 image, workflow-configured) | `COMFY_API_KEY` or `COMFY_CLOUD_API_KEY` for cloud    |
| DeepInfra  | `black-forest-labs/FLUX-1-schnell`      | Yes (1 image)                      | `DEEPINFRA_API_KEY`                                   |
| fal        | `fal-ai/flux/dev`                       | Yes (model-specific limits)        | `FAL_KEY`                                             |
| Google     | `gemini-3.1-flash-image-preview`        | Yes                                | `GEMINI_API_KEY` or `GOOGLE_API_KEY`                  |
| LiteLLM    | `gpt-image-2`                           | Yes (up to 5 input images)         | `LITELLM_API_KEY`                                     |
| MiniMax    | `image-01`                              | Yes (subject reference)            | `MINIMAX_API_KEY` or MiniMax OAuth (`minimax-portal`) |
| OpenAI     | `gpt-image-2`                           | Yes (up to 4 images)               | `OPENAI_API_KEY` or OpenAI ChatGPT/Codex OAuth        |
| OpenRouter | `google/gemini-3.1-flash-image-preview` | Yes (up to 5 input images)         | `OPENROUTER_API_KEY`                                  |
| Vydra      | `grok-imagine`                          | No                                 | `VYDRA_API_KEY`                                       |
| xAI        | `grok-imagine-image`                    | Yes (up to 5 images)               | `XAI_API_KEY`                                         |

在运行时使用 `action: "list"` 来检查可用的提供方和模型：

```text
/tool image_generate action=list
```

使用 `action: "status"` 来检查当前会话中的活动图像生成任务：

```text
/tool image_generate action=status
```

## 提供方能力

| Capability            | ComfyUI            | DeepInfra | fal                                            | Google         | MiniMax               | OpenAI         | Vydra | xAI            |
| --------------------- | ------------------ | --------- | ---------------------------------------------- | -------------- | --------------------- | -------------- | ----- | -------------- |
| Generate (max count)  | Workflow-defined   | 4         | 4                                              | 4              | 9                     | 4              | 1     | 4              |
| Edit / reference      | 1 image (workflow) | 1 image   | Flux: 1; GPT: 10; Krea style refs: 10; NB2: 14 | Up to 5 images | 1 image (subject ref) | Up to 5 images | -     | Up to 5 images |
| Size control          | -                  | ✓         | ✓                                              | ✓              | -                     | Up to 4K       | -     | -              |
| Aspect ratio          | -                  | -         | ✓                                              | ✓              | ✓                     | -              | -     | ✓              |
| Resolution (1K/2K/4K) | -                  | -         | ✓                                              | ✓              | -                     | -              | -     | 1K, 2K         |

## 工具参数

<ParamField path="prompt" type="string" required>
  图像生成提示词。`action: "generate"` 时必填。
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  使用 `"status"` 来检查当前会话任务，或使用 `"list"` 在运行时检查
  可用的提供方和模型。
</ParamField>
<ParamField path="model" type="string">
  覆盖提供方/模型（例如 `openai/gpt-image-2`）。透明的 OpenAI 背景使用
  `openai/gpt-image-1.5`。
</ParamField>
<ParamField path="image" type="string">
  用于编辑模式的单个参考图像路径或 URL。
</ParamField>
<ParamField path="images" type="string[]">
  编辑模式或风格参考模型的多个参考图像（通过共享工具最多 10 张；
  但仍受提供方特定限制约束）。
</ParamField>
<ParamField path="size" type="string">
  尺寸提示：`1024x1024`、`1536x1024`、`1024x1536`、`2048x2048`、`3840x2160`。
</ParamField>
<ParamField path="aspectRatio" type="string">
  宽高比：`1:1`、`2:3`、`3:2`、`2.35:1`、`3:4`、`4:3`、`4:5`、
  `5:4`、`9:16`、`16:9`、`21:9`、`4:1`、`1:4`、`8:1`、`1:8`。提供方
  会验证其模型特定的子集。
</ParamField>
<ParamField path="resolution" type='"1K" | "2K" | "4K"'>分辨率提示。</ParamField>
<ParamField path="quality" type='"low" | "medium" | "high" | "auto"'>
  当提供方支持时使用的质量提示。
</ParamField>
<ParamField path="outputFormat" type='"png" | "jpeg" | "webp"'>
  当提供方支持时使用的输出格式提示。
</ParamField>
<ParamField path="background" type='"transparent" | "opaque" | "auto"'>
  当提供方支持时使用的背景提示。对支持透明的提供方，使用
  `outputFormat: "png"` 或 `"webp"` 搭配 `transparent`。
</ParamField>
<ParamField path="count" type="number">生成图像数量（1-4）。</ParamField>
<ParamField path="timeoutMs" type="number">
  可选的提供方请求超时时间，单位为毫秒。当 Codex 通过动态工具调用
  `image_generate` 时，这个按次调用的值仍会覆盖已配置的默认值，
  且上限为 600000 毫秒。
</ParamField>
<ParamField path="filename" type="string">输出文件名提示。</ParamField>
<ParamField path="openai" type="object">
  仅适用于 OpenAI 的提示：`background`、`moderation`、`outputCompression` 和 `user`。
</ParamField>
<ParamField path="fal.creativity" type='"raw" | "low" | "medium" | "high"'>
  fal Krea 2 创造力控制。默认值为 `medium`。
</ParamField>

<Note>
并非所有提供方都支持所有参数。当回退提供方支持一个
与请求不完全相同但相近的几何选项时，OpenClaw 会在提交前映射到
最接近的受支持尺寸、宽高比或分辨率。不受支持的输出提示会被对不声明
支持的提供方丢弃，并在工具结果中报告。工具结果会报告已应用的
设置；`details.normalization` 会记录任何从请求到实际应用的
转换。
</Note>

## 配置

### 模型选择

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        timeoutMs: 180_000,
        fallbacks: [
          "openrouter/google/gemini-3.1-flash-image-preview",
          "google/gemini-3.1-flash-image-preview",
          "fal/fal-ai/flux/dev",
        ],
      },
    },
  },
}
```

### 提供方选择顺序

OpenClaw 会按以下顺序尝试提供方：

1. **`model` 参数**，来自工具调用（如果 agent 指定了）。
2. 配置中的 **`imageGenerationModel.primary`**。
3. 按顺序的 **`imageGenerationModel.fallbacks`**。
4. **自动检测** - 仅基于认证的提供方默认值：
   - 先使用当前默认提供方；
   - 然后按 provider-id 顺序使用其余已注册的图像生成提供方。

如果某个提供方失败（认证错误、速率限制等），会自动尝试下一个已配置的候选项。如果全部失败，错误信息会包含每次尝试的详细信息。

<AccordionGroup>
  <Accordion title="单次调用的模型覆盖是精确的">
    单次调用的 `model` 覆盖只会尝试该提供方/模型，不会继续使用已配置的 primary/fallback
    或自动检测到的提供方。
  </Accordion>
  <Accordion title="自动检测会感知认证">
    只有当 OpenClaw 实际能够认证该提供方时，该提供方默认值才会进入候选列表。将
    `agents.defaults.mediaGenerationAutoProviderFallback: false` 设置为仅使用
    显式的 `model`、`primary` 和 `fallbacks` 条目。
  </Accordion>
  <Accordion title="超时">
    为较慢的图像后端设置 `agents.defaults.imageGenerationModel.timeoutMs`。按次调用的
    `timeoutMs` 工具参数会覆盖已配置的默认值，而已配置的默认值会覆盖插件作者提供的
    提供方默认值。Google 和 OpenRouter 托管的图像提供方使用 180 秒默认值；xAI 和 Azure OpenAI
    图像生成使用 600 秒。Codex 动态工具调用使用 120 秒的 `image_generate` 桥接默认值，
    并在配置时遵循相同的超时预算，上限受 OpenClaw 的 600000 毫秒动态工具桥接最大值限制。
  </Accordion>
  <Accordion title="运行时检查">
    使用 `action: "list"` 检查当前已注册的提供方、
    它们的默认模型以及认证环境变量提示。
  </Accordion>
</AccordionGroup>

### 图像编辑

OpenAI、OpenRouter、Google、DeepInfra、fal、MiniMax、ComfyUI 和 xAI 支持编辑
参考图像。fal 上的 Krea 2 模型使用相同的 `image` / `images` 字段作为风格参考，而不是编辑输入。传入参考图像路径或 URL：

```text
"将这张照片生成水彩风格版本" + image: "/path/to/photo.jpg"
```

OpenAI、OpenRouter、Google 和 xAI 通过 `images` 参数支持最多 5 张参考图像。fal 支持 1 张用于 Flux 图像到图像的参考图像、最多 10 张用于 GPT Image 2 编辑、最多 10 张用于 Krea 2 风格参考，以及最多 14 张用于 Nano Banana 2 编辑。MiniMax 和 ComfyUI 支持 1。

## 提供商深度解析

<AccordionGroup>
  <Accordion title="OpenAI gpt-image-2 (and gpt-image-1.5)">
    OpenAI 图像生成功能默认使用 `openai/gpt-image-2`。如果配置了 `openai` OAuth 配置文件，OpenClaw 会复用 Codex 订阅聊天模型所使用的同一 OAuth 配置文件，并通过 Codex Responses 后端发送图像请求。像 `https://chatgpt.com/backend-api` 这样的旧版 Codex 基础 URL 会在图像请求中规范化为 `https://chatgpt.com/backend-api/codex`。OpenClaw 不会为该请求静默回退到 `OPENAI_API_KEY` —— 若要强制直接路由到 OpenAI Images API，请显式配置 `models.providers.openai`，并提供 API key、自定义 base URL 或 Azure 端点。

    `openai/gpt-image-1.5`、`openai/gpt-image-1` 和
    `openai/gpt-image-1-mini` 模型仍然可以显式选择。对于透明背景 PNG/WebP 输出，请使用
    `gpt-image-1.5`；当前
    `gpt-image-2` API 会拒绝 `background: "transparent"`。

    `gpt-image-2` 通过同一个 `image_generate` 工具同时支持文本生成图像和
    参考图像编辑。OpenClaw 会将 `prompt`、`count`、`size`、`quality`、`outputFormat`
    和参考图像转发给 OpenAI。OpenAI 不会直接接收
    `aspectRatio` 或 `resolution`；在可能的情况下，OpenClaw 会将
    这些参数映射为受支持的 `size`，否则工具会将它们报告为
    被忽略的覆盖项。

    OpenAI 特定选项位于 `openai` 对象下：

    ```json
    {
      "quality": "low",
      "outputFormat": "jpeg",
      "openai": {
        "background": "opaque",
        "moderation": "low",
        "outputCompression": 60,
        "user": "end-user-42"
      }
    }
    ```

    `openai.background` 接受 `transparent`、`opaque` 或 `auto`；
    透明输出需要 `outputFormat` 为 `png` 或 `webp`，并且需要支持透明背景的 OpenAI 图像模型。OpenClaw 会将默认的
    `gpt-image-2` 透明背景请求路由到 `gpt-image-1.5`。
    `openai.outputCompression` 适用于 JPEG/WebP 输出，并会在
    PNG 输出时被忽略。

    顶层的 `background` 提示是与提供商无关的，目前在选择 OpenAI 提供商时会映射
    到相同的 OpenAI `background` 请求字段。对于不声明支持背景的提供商，会将其作为
    `ignoredOverrides` 返回，而不会接收不支持的参数。

    若要通过 Azure OpenAI 部署而不是 `api.openai.com` 来路由 OpenAI 图像生成，请参阅
    [Azure OpenAI 端点](/providers/openai#azure-openai-endpoints)。

  </Accordion>
  <Accordion title="OpenRouter 图像模型">
    OpenRouter 图像生成使用相同的 `OPENROUTER_API_KEY`，并通过
    OpenRouter 的聊天补全图像 API 路由。使用带有 `openrouter/`
    前缀的 OpenRouter 图像模型：

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "openrouter/google/gemini-3.1-flash-image-preview",
          },
        },
      },
    }
    ```

    OpenClaw 会将 `prompt`、`count`、参考图像，以及
    与 Gemini 兼容的 `aspectRatio` / `resolution` 提示转发给 OpenRouter。
    当前内置的 OpenRouter 图像模型快捷方式包括
    `google/gemini-3.1-flash-image-preview`、
    `google/gemini-3-pro-image-preview` 和 `openai/gpt-5.4-image-2`。使用
    `action: "list"` 查看你的已配置插件暴露了哪些内容。

  </Accordion>
  <Accordion title="fal Krea 2">
    fal 上的 Krea 2 模型使用 fal 原生的 Krea schema，而不是 Flux 使用的通用
    `image_size` schema。OpenClaw 会发送：

    - `aspect_ratio` 用于宽高比提示
    - `creativity`，默认为 `medium`
    - 在提供 `image` 或 `images` 时使用 `image_style_references`

    选择 Krea 2 Medium 可获得更快的表现性插画，选择 Krea 2 Large
    则可获得更慢但更细致的照片写实和纹理效果：

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

    Krea 2 当前每次请求只返回一张图像。对 Krea 优先使用 `aspectRatio`；OpenClaw 会将 `size` 映射为最接近受支持的 Krea 宽高比，并且会为 Krea 拒绝 `resolution`，而不是将其丢弃。需要原生 Krea 创意等级时，请使用 `fal.creativity`：

    ```json
    {
      "model": "fal/krea/v2/medium/text-to-image",
      "prompt": "A cyber zine portrait with risograph texture",
      "aspectRatio": "9:16",
      "fal": {
        "creativity": "high"
      }
    }
    ```

  </Accordion>
  <Accordion title="MiniMax dual-auth">
    MiniMax 图像生成可通过两个捆绑的 MiniMax
    认证路径使用：

    - `minimax/image-01` 用于 API key 配置
    - `minimax-portal/image-01` 用于 OAuth 配置

  </Accordion>
  <Accordion title="xAI grok-imagine-image">
    内置的 xAI 提供商在仅提示词请求时使用 `/v1/images/generations`，
    当存在 `image` 或 `images` 时使用 `/v1/images/edits`。

    - 模型：`xai/grok-imagine-image`, `xai/grok-imagine-image-quality`
    - 数量：最多 4
    - 参考图：一个 `image` 或最多五个 `images`
    - 宽高比：`1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
    - 分辨率：`1K`, `2K`
    - 输出：作为 OpenClaw 托管的图像附件返回

    在共享的跨提供商 `image_generate` 合同中尚未具备这些控制项之前，OpenClaw 有意不暴露 xAI 原生的 `quality`、`mask`、
    `user`，或额外的仅原生支持的宽高比。

  </Accordion>
</AccordionGroup>

## 示例

<Tabs>
  <Tab title="生成（4K 横版）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="为 OpenClaw 图像生成设计一张干净的编辑风格海报" size=3840x2160 count=1
```
  </Tab>
  <Tab title="生成（透明 PNG）">
```text
/tool image_generate action=generate model=openai/gpt-image-1.5 prompt="在透明背景上的一个简单红色圆形贴纸" outputFormat=png background=transparent
```

等效 CLI：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "在透明背景上的一个简单红色圆形贴纸" \
  --json
```

  </Tab>
  <Tab title="生成（两个正方形）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="为一个平静的效率应用图标提供两个视觉方向" size=1024x1024 count=2
```
  </Tab>
  <Tab title="编辑（一个参考图）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="保留主体，将背景替换为明亮的工作室场景" image=/path/to/reference.png size=1024x1536
```
  </Tab>
  <Tab title="编辑（多个参考图）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="将第一张图像中的角色身份与第二张图像中的配色方案结合起来" images='["/path/to/character.png","/path/to/palette.jpg"]' size=1536x1024
```
  </Tab>
  <Tab title="Krea 样式参考">
```text
/tool image_generate action=generate model=fal/krea/v2/medium/text-to-image prompt="An expressive editorial portrait using this color palette and print texture" images='["/path/to/palette.png","/path/to/texture.jpg"]' aspectRatio=9:16 fal='{"creativity":"high"}'
```
  </Tab>
</Tabs>

`--output-format` 和 `--background` 标志同样可用于
`openclaw infer image edit`；`--openai-background` 仍然作为
OpenAI 特定的别名保留。除 OpenAI 之外的内置提供商目前不声明
显式的背景控制，因此 `background: "transparent"` 会被报告为
它们的忽略项。

## 相关内容

- [工具概览](/tools) - 所有可用的 agent 工具
- [ComfyUI](/providers/comfy) - 本地 ComfyUI 和 Comfy Cloud 工作流设置
- [fal](/providers/fal) - fal 图像和视频提供商设置
- [Google (Gemini)](/providers/google) - Gemini 图像提供商设置
- [MiniMax](/providers/minimax) - MiniMax 图像提供商设置
- [OpenAI](/providers/openai) - OpenAI 图像提供商设置
- [Vydra](/providers/vydra) - Vydra 图像、视频和语音设置
- [xAI](/providers/xai) - Grok 图像、视频、搜索、代码执行和 TTS 设置
- [配置参考](/gateway/config-agents#agent-defaults) - `imageGenerationModel` 配置
- [模型](/concepts/models) - 模型配置和故障转移
