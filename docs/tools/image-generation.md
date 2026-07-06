---
summary: "通过 image_generate 在 OpenAI、Google、fal、Microsoft Foundry、MiniMax、ComfyUI、DeepInfra、OpenRouter、LiteLLM、xAI、Vydra 上生成和编辑图像"
read_when:
  - 通过 agent 生成或编辑图像
  - 配置图像生成提供方和模型
  - 了解 image_generate 工具参数
title: "图像生成"
sidebarTitle: "图像生成"
---

`image_generate` 工具会通过你配置的提供方来创建和编辑图像。在聊天会话中，它以异步方式运行：OpenClaw 会记录一个后台任务，立即返回任务 ID，并在提供方完成时唤醒 agent。完成后的 agent 会遵循会话的正常可见回复模式：如果已配置，则自动发送最终回复；如果会话需要使用消息工具，则使用 `message(action="send")`。如果请求方会话处于非活动状态，或者其激活唤醒失败，OpenClaw 会发送一个幂等的直接回退结果，其中包含生成的图像，以免结果丢失。

<Note>
Only appears when at least one image generation provider is available. If you don’t see `image_generate` in your agent’s tools, configure `agents.defaults.imageGenerationModel`, set provider API keys, or sign in with OpenAI ChatGPT/Codex OAuth.
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
    `openai` OAuth 配置文件时，OpenClaw 会通过该 OAuth 配置文件路由图像请求，
    而不是先尝试 `OPENAI_API_KEY`。显式的 `models.providers.openai` 配置（API 密钥、自定义/Azure 基础 URL）
    会切换回直接使用 OpenAI Images API 路由。

  </Step>
  <Step title="让 agent 执行">
    _"生成一张友好机器人吉祥物的图片。"_

    agent 会自动调用 `image_generate`。无需工具白名单——当有可用提供方时，
    它默认启用。该工具会返回一个后台任务 ID，然后 completion agent 会在准备就绪时通过 `message` 工具发送生成的附件。

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
| 使用 API 计费的 OpenAI 图像生成                     | `openai/gpt-image-2`                               | `OPENAI_API_KEY`                       |
| 使用 Codex 订阅认证的 OpenAI 图像生成               | `openai/gpt-image-2`                               | OpenAI ChatGPT/Codex OAuth             |
| OpenAI 透明背景 PNG/WebP                           | `openai/gpt-image-1.5`                             | `OPENAI_API_KEY` 或 OpenAI Codex OAuth |
| DeepInfra 图像生成                                  | `deepinfra/black-forest-labs/FLUX-1-schnell`       | `DEEPINFRA_API_KEY`                    |
| fal Krea 2 表现力/风格引导生成                      | `fal/krea/v2/medium/text-to-image`                 | `FAL_KEY`                              |
| OpenRouter 图像生成                                 | `openrouter/google/gemini-3.1-flash-image-preview` | `OPENROUTER_API_KEY`                   |
| LiteLLM 图像生成                                    | `litellm/gpt-image-2`                              | `LITELLM_API_KEY`                      |
| Microsoft Foundry MAI 图像生成                      | `microsoft-foundry/<deployment-name>`              | `AZURE_OPENAI_API_KEY` 或 Entra ID     |
| Google Gemini 图像生成                              | `google/gemini-3.1-flash-image-preview`            | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`   |

同一个工具同时处理文本到图像和参考图像编辑。对单个参考图像使用 `image`，对多个参考图像使用 `images`。对于 fal 上的 Krea 2 模型，这些参考图像会作为风格参考发送，而不是作为编辑输入。  
当可用时，诸如 `quality`、`outputFormat` 和 `background` 之类的提供方支持的输出提示会被转发；当某个提供方未声明支持时，则会报告为被忽略。内置的透明背景支持是 OpenAI 特有的；其他提供方如果其后端输出了 PNG alpha 通道，仍可能保留该通道。

## 支持的提供方

| 提供方            | 默认模型                                | 编辑支持                          | 认证                                                  |
| ----------------- | --------------------------------------- | ---------------------------------- | ----------------------------------------------------- |
| ComfyUI           | `workflow`                              | 是（1 张图片，按 workflow 配置）   | 云端使用 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`    |
| DeepInfra         | `black-forest-labs/FLUX-1-schnell`      | 是（1 张图片）                     | `DEEPINFRA_API_KEY`                                   |
| fal               | `fal-ai/flux/dev`                       | 是（特定于模型的限制）             | `FAL_KEY`                                             |
| Google            | `gemini-3.1-flash-image-preview`        | 是（最多 5 张图片）                | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                  |
| LiteLLM           | `gpt-image-2`                           | 是（最多 5 张输入图片）            | `LITELLM_API_KEY`                                     |
| Microsoft Foundry | `<deployment-name>`                     | 是（仅限 MAI-Image-2.5 模型）      | `AZURE_OPENAI_API_KEY` 或 Entra ID（`az login`）      |
| MiniMax           | `image-01`                              | 是（主体参考）                     | `MINIMAX_API_KEY` 或 MiniMax OAuth（`minimax-portal`） |
| OpenAI            | `gpt-image-2`                           | 是（最多 5 张图片）                | `OPENAI_API_KEY` 或 OpenAI ChatGPT/Codex OAuth        |
| OpenRouter        | `google/gemini-3.1-flash-image-preview` | 是（最多 5 张输入图片）            | `OPENROUTER_API_KEY`                                  |
| Vydra             | `grok-imagine`                          | 否                                 | `VYDRA_API_KEY`                                       |
| xAI               | `grok-imagine-image`                    | 是（最多 5 张图片）                | `XAI_API_KEY`                                         |

在运行时使用 `action: "list"` 来检查可用的提供方和模型：

```text
/tool image_generate action=list
```

使用 `action: "status"` 来检查当前会话中的活动图像生成任务：

```text
/tool image_generate action=status

## 提供方能力

| 能力                 | ComfyUI            | DeepInfra | fal                                            | Google         | Microsoft Foundry | MiniMax               | OpenAI         | Vydra | xAI            |
| -------------------- | ------------------ | --------- | ---------------------------------------------- | -------------- | ----------------- | --------------------- | -------------- | ----- | -------------- |
| 生成（最大数量）     | 1                  | 4         | 4                                              | 4              | 1                 | 9                     | 4              | 1     | 4              |
| 编辑 / 参考          | 1 张图片（工作流）  | 1 张图片  | Flux: 1; GPT: 10; Krea 风格参考: 10; NB2: 14   | 最多 5 张图片   | 1 张图片          | 1 张图片（主体参考）  | 最多 5 张图片   | -     | 最多 5 张图片   |
| 尺寸控制             | -                  | ✓         | ✓                                              | ✓              | ✓                 | -                     | 最多 4K        | -     | -              |
| 宽高比               | -                  | -         | ✓                                              | ✓              | -                 | ✓                     | -              | -     | ✓              |
| 分辨率（1K/2K/4K）   | -                  | -         | ✓                                              | ✓              | -                 | -                     | -              | -     | 1K, 2K         |

## Tool Parameters

<ParamField path="prompt" type="string" required>
  Image generation prompt. Required when `action: "generate"`.
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  Use `"status"` to check the current session task, or use `"list"` to check
  the available providers and models at runtime.
</ParamField>
<ParamField path="model" type="string">
  Override the provider/model (for example `openai/gpt-image-2`). Transparent OpenAI backgrounds use
  `openai/gpt-image-1.5`.
</ParamField>
<ParamField path="image" type="string">
  A single reference image path or URL for edit mode.
</ParamField>
<ParamField path="images" type="string[]">
  Multiple reference images for edit mode or style-reference models (up to 14
  through the shared tool; provider-specific limits still apply).
</ParamField>
<ParamField path="size" type="string">
  Size hints: `1024x1024`, `1536x1024`, `1024x1536`, `2048x2048`, `3840x2160`.
</ParamField>
<ParamField path="aspectRatio" type="string">
  Aspect ratio: `1:1`, `2:1`, `20:9`, `19.5:9`, `2:3`, `3:2`, `2.35:1`, `3:4`,
  `4:3`, `4:5`, `5:4`, `9:16`, `9:19.5`, `9:20`, `16:9`, `21:9`, `1:2`, `4:1`,
  `1:4`, `8:1`, `1:8`. Providers validate their model-specific subset.
</ParamField>
<ParamField path="resolution" type='"1K" | "2K" | "4K"'>Resolution hint.</ParamField>
<ParamField path="quality" type='"low" | "medium" | "high" | "auto"'>
  Quality hint used when supported by the provider.
</ParamField>
<ParamField path="outputFormat" type='"png" | "jpeg" | "webp"'>
  Output format hint used when supported by the provider.
</ParamField>
<ParamField path="background" type='"transparent" | "opaque" | "auto"'>
  Background hint used when supported by the provider. For providers that support transparency, use
  `outputFormat: "png"` or `"webp"` together with `transparent`.
</ParamField>
<ParamField path="count" type="number">Number of images to generate (1-4).</ParamField>
<ParamField path="timeoutMs" type="number">
  Optional provider request timeout in milliseconds. When Codex invokes
  `image_generate` through dynamic tool calling, this per-call value still overrides
  the configured default, with an upper limit of 600000 milliseconds.
</ParamField>
<ParamField path="filename" type="string">Output filename hint.</ParamField>
<ParamField path="openai" type="object">
  OpenAI-only hints: `background`, `moderation`, `outputCompression`, and `user`.
</ParamField>
<ParamField path="fal.creativity" type='"raw" | "low" | "medium" | "high"'>
  fal Krea 2 creativity control. Default is `medium`.
</ParamField>

<Note>
Not all providers support all parameters. When a fallback provider supports a
geometric option that is similar but not identical to the request, OpenClaw maps it
to the closest supported size, aspect ratio, or resolution before submission.
Unsupported output hints are dropped for providers that do not declare support and
are reported in the tool result. The tool result reports the settings that were
applied; `details.normalization` records any transformation from request to actual
applied values.
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
  <Accordion title="超时设置">
    为较慢的图像后端设置 `agents.defaults.imageGenerationModel.timeoutMs`。单次调用的
    `timeoutMs` 工具参数会覆盖已配置的默认值，而已配置的默认值会覆盖插件作者提供的
    提供方默认值。Google 和 OpenRouter 托管的图像提供方使用 180 秒默认值；Microsoft Foundry MAI、xAI 和 Azure OpenAI 图像生成使用 600 秒。Codex 动态工具调用使用 120 秒的 `image_generate`
    桥接默认值，并在配置后遵循相同的超时预算，但受 OpenClaw 的 600000 ms 动态工具桥接最大值限制。
  </Accordion>
  <Accordion title="运行时检查">
    使用 `action: "list"` 检查当前已注册的提供方、
    它们的默认模型以及认证环境变量提示。
  </Accordion>
</AccordionGroup>

### 图像编辑

OpenAI、OpenRouter、Google、DeepInfra、fal、Microsoft Foundry、MiniMax、
ComfyUI 和 xAI 支持编辑参考图像。fal 上的 Krea 2 模型使用相同的 `image` / `images` 字段作为风格参考，而不是编辑输入。传入参考图像路径或 URL：

```text
"将这张照片生成水彩风格版本" + image: "/path/to/photo.jpg"
```

OpenAI、OpenRouter、Google 和 xAI 通过 `images` 参数最多支持 5 张参考图像。fal 支持 1 张用于 Flux 图生图的参考图像、最多 10 张用于 GPT Image 2 编辑、最多 10 张风格参考用于 Krea 2、以及最多 14 张用于 Nano Banana 2 编辑。Microsoft Foundry、MiniMax 和 ComfyUI 支持 1 张。

## Provider Deep Dive

<AccordionGroup>
  <Accordion title="OpenAI gpt-image-2（以及 gpt-image-1.5）">
    OpenAI image generation defaults to `openai/gpt-image-2`. If an `openai` OAuth profile is configured, OpenClaw will reuse the same OAuth profile used by Codex subscription chat models and send image requests through the Codex Responses backend. Legacy Codex base URLs such as `https://chatgpt.com/backend-api` will be normalized to `https://chatgpt.com/backend-api/codex` for image requests. OpenClaw will not silently fall back to `OPENAI_API_KEY` for this request — to force direct routing to the OpenAI Images API, explicitly configure `models.providers.openai` and provide an API key, custom base URL, or Azure endpoint.

    The `openai/gpt-image-1.5`, `openai/gpt-image-1`, and
    `openai/gpt-image-1-mini` models can still be selected explicitly. For transparent background PNG/WebP output, use
    `gpt-image-1.5`; the current
    `gpt-image-2` API will reject `background: "transparent"`.

    `gpt-image-2` supports both text-to-image generation and
    reference-image editing through the same `image_generate` tool. OpenClaw will forward `prompt`, `count`, `size`, `quality`, `outputFormat`
    and reference images to OpenAI. OpenAI does not directly accept
    `aspectRatio` or `resolution`; where possible, OpenClaw will map these parameters to supported `size` values, otherwise the tool will report them as
    ignored overrides.

    OpenAI-specific options live under the `openai` object:

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

    `openai.background` accepts `transparent`, `opaque`, or `auto`;
    transparent output requires `outputFormat` to be `png` or `webp`, and an OpenAI image model that supports transparent backgrounds. OpenClaw will route the default
    `gpt-image-2` transparent background request to `gpt-image-1.5`.
    `openai.outputCompression` applies to JPEG/WebP output and will be ignored for
    PNG output.

    The top-level `background` hint is provider-agnostic and currently maps to the same OpenAI `background` request field when OpenAI is selected. For providers that do not declare background support, it will be returned as `ignoredOverrides` rather than sending unsupported parameters.

    To route OpenAI image generation through an Azure OpenAI deployment instead of `api.openai.com`, see
    [Azure OpenAI endpoints](/providers/openai#azure-openai-endpoints).

  </Accordion>
  <Accordion title="Microsoft Foundry MAI 图像模型">
    Microsoft Foundry image generation uses the deployed MAI image deployment name,
    and is referenced with the `microsoft-foundry/` provider prefix. There is no
    default model at the provider level because the MAI API expects you to provide the deployment name
    in the `model` field:

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "microsoft-foundry/<deployment-name>",
            timeoutMs: 600_000,
          },
        },
      },
    }
    ```

    This provider uses Microsoft Foundry's MAI API, not the OpenAI Images API:

    - Generation endpoint: `/mai/v1/images/generations`
    - Edit endpoint: `/mai/v1/images/edits`
    - Authentication: `AZURE_OPENAI_API_KEY` / provider API key, or Entra ID via `az login`
    - Output: one PNG image
    - Size: default `1024x1024`; width and height must both be at least 768 px,
      and total pixels must be at most 1,048,576
    - Editing: one PNG or JPEG reference image, supported only by
      `MAI-Image-2.5-Flash` and `MAI-Image-2.5` deployments

    Prompt-only generation can use a custom deployment name as long as a
    Foundry endpoint is configured. Editing with a custom deployment name requires starter/model metadata so that OpenClaw can validate whether the deployment is supported by
    `MAI-Image-2.5-Flash` or `MAI-Image-2.5`.

    The current MAI image models are `MAI-Image-2.5-Flash`, `MAI-Image-2.5`,
    `MAI-Image-2e`, and `MAI-Image-2`. For setup
    and chat model behavior, see
    [Microsoft Foundry plugin](/plugins/reference/microsoft-foundry).

  </Accordion>
  <Accordion title="OpenRouter 图像模型">
    OpenRouter image generation uses the same `OPENROUTER_API_KEY`,
    and is routed through OpenRouter's chat completion image API. Use the
    `openrouter/` prefix to select an OpenRouter image model:

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

    OpenClaw will forward `prompt`, `count`, reference images, and
    Gemini-compatible `aspectRatio` / `resolution` hints to OpenRouter.
    The currently built-in OpenRouter image model shortcuts include
    `google/gemini-3.1-flash-image-preview`,
    `google/gemini-3-pro-image-preview`, and `openai/gpt-5.4-image-2`. Use
    `action: "list"` to see what your configured plugins expose.

  </Accordion>
  <Accordion title="fal Krea 2">
    The Krea 2 model on fal uses fal's native Krea schema rather than the generic
    `image_size` schema used by Flux. OpenClaw sends:

    - `aspect_ratio` for aspect-ratio hints
    - `creativity`, defaulting to `medium`
    - `image_style_references` when `image` or `images` are provided

    Choose Krea 2 Medium for faster, more expressive illustrations, or Krea 2 Large
    for slower but more detailed photorealism and texture:

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

    Krea 2 currently returns one image per request only. Prefer `aspectRatio` for Krea; OpenClaw maps `size` to the closest supported Krea aspect ratio and will report `resolution` as rejected for Krea rather than dropping it. Use `fal.creativity` when you need native Krea creativity levels:

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
  <Accordion title="MiniMax 双重认证">
    MiniMax image generation can use either of two bundled MiniMax
    authentication paths:

    - `minimax/image-01` for API key configuration
    - `minimax-portal/image-01` for OAuth configuration

  </Accordion>
  <Accordion title="xAI grok-imagine-image">
    The built-in xAI provider uses `/v1/images/generations` for prompt-only requests,
    and `/v1/images/edits` when `image` or `images` are present.

    - Models: `xai/grok-imagine-image`, `xai/grok-imagine-image-quality`
    - Count: up to 4
    - Reference images: one `image` or up to five `images`
    - Aspect ratios: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
    - Resolutions: `1K`, `2K`
    - Output: returned as an OpenClaw-hosted image attachment

    OpenClaw intentionally does not expose xAI native `quality`, `mask`,
    `user`, or additional xAI-only aspect ratios until those controls exist in the shared cross-provider `image_generate` contract.

  </Accordion>
</AccordionGroup>

## 示例

<Tabs>
  <Tab title="生成（4K 横版）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Design a clean editorial-style poster for OpenClaw image generation" size=3840x2160 count=1
```
  </Tab>
  <Tab title="生成（透明 PNG）">
```text
/tool image_generate action=generate model=openai/gpt-image-1.5 prompt="A simple red circular sticker on a transparent background" outputFormat=png background=transparent
```

Equivalent CLI:

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circular sticker on a transparent background" \
  --json
```

  </Tab>
  <Tab title="生成（OpenAI 低质量）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Low-cost draft poster for a quiet productivity app" quality=low openai='{"moderation":"low"}'
```

Equivalent CLI:

```bash
openclaw infer image generate \
  --model openai/gpt-image-2 \
  --quality low \
  --openai-moderation low \
  --prompt "Low-cost draft poster for a quiet productivity app" \
  --json
```

  </Tab>
  <Tab title="生成（两个正方形）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Provide two visual directions for a calm productivity app icon" size=1024x1024 count=2
```
  </Tab>
  <Tab title="编辑（一个参考图）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Keep the subject, but replace the background with a bright studio setting" image=/path/to/reference.png size=1024x1536
```
  </Tab>
  <Tab title="编辑（多个参考图）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Combine the character identity from the first image with the color palette from the second image" images='["/path/to/character.png","/path/to/palette.jpg"]' size=1536x1024
```
  </Tab>
  <Tab title="Krea 样式参考">
```text
/tool image_generate action=generate model=fal/krea/v2/medium/text-to-image prompt="An expressive editorial portrait using this color palette and print texture" images='["/path/to/palette.png","/path/to/texture.jpg"]' aspectRatio=9:16 fal='{"creativity":"high"}'
```
  </Tab>
</Tabs>

The same `--output-format`, `--background`, `--quality`, and
`--openai-moderation` flags can also be used in `openclaw infer image edit`; `--openai-background` remains as an OpenAI-specific alias. Bundled providers other than OpenAI
currently do not declare explicit background control, so
`background: "transparent"` will be reported as ignored for them.

## 相关内容

- [工具概览](/tools) - 所有可用的代理工具
- [ComfyUI](/providers/comfy) - 本地 ComfyUI 和 Comfy Cloud 工作流设置
- [fal](/providers/fal) - fal 图像和视频提供商设置
- [Google（Gemini）](/providers/google) - Gemini 图像提供商设置
- [Microsoft Foundry 插件](/plugins/reference/microsoft-foundry) - Microsoft Foundry 聊天和 MAI 图像设置
- [MiniMax](/providers/minimax) - MiniMax 图像提供商设置
- [OpenAI](/providers/openai) - OpenAI Images 提供商设置
- [Vydra](/providers/vydra) - Vydra 图像、视频和语音设置
- [xAI](/providers/xai) - Grok 图像、视频、搜索、代码执行和 TTS 设置
- [配置参考](/gateway/config-agents#agent-defaults) - `imageGenerationModel` 配置
- [模型](/concepts/models) - 模型配置和故障转移
