---
summary: "通过 image_generate 在 OpenAI、Google、fal、Microsoft Foundry、MiniMax、ComfyUI、DeepInfra、OpenRouter、LiteLLM、xAI、Vydra 上生成和编辑图像"
read_when:
  - "通过 agent 生成或编辑图像"
  - "配置图像生成提供方和模型"
  - "了解 image_generate 工具参数"
title: "图像生成"
sidebarTitle: "图像生成"
---

`image_generate` 工具通过您配置的提供程序创建和编辑图像。在聊天会话中，它异步运行：本机媒体生成所有者跟踪操作，立即返回任务 ID，并在提供程序完成时唤醒代理。完成代理遵循会话当前的可见回复合同，其中包含面向用户的简短标题和每个结构化生成的附件。如果生成失败，代理会返回简洁的可见失败。如果请求者会话处于非活动状态或其主动唤​​醒失败，OpenClaw 会使用生成的图像发送直接回退，因此结果不会丢失。重试不会再次发布相同的图像。

您可以在完成代理仍在工作时发送后续信息。新的回合等待完成并交付稳定后再开始。

在 WebChat 和 macOS 应用程序中，生成的附件保留在完成回复中，而不是再次出现在单独的仅图像消息中。即使先前的通道对话在那里留下了外部传送路由，交互式 WebChat 请求也会在该会话中保持其完成状态。重播已完成的传递会保留相同的消息和附件标识。

<Note>
该工具仅在至少有一个图像生成提供方可用时才会显示。如果你在 agent 的工具中看不到 `image_generate`，请配置 `agents.defaults.mediaModels.image`，设置提供方 API 密钥，或通过 OpenAI ChatGPT/Codex OAuth 登录。
</Note>

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="configure-auth" title="配置身份验证">
    为至少一个提供商设置 API 密钥（例如 `OPENAI_API_KEY`、`GEMINI_API_KEY`、`OPENROUTER_API_KEY`）或使用 OpenAI ChatGPT/Codex OAuth 登录。
  </Step>
  <Step id="pick-a-default-model-optional" title="选择默认模型（可选）">
    ```json5
    {
      agents: {
        defaults: {
          mediaModels: {
            image: {
              primary: "openai/gpt-image-2",
              timeoutMs: 180000,
            },
          },
        },
      },
    }
    ```

    ChatGPT/Codex OAuth 使用相同的 `openai/gpt-image-2` 模型参考。配置 `openai` OAuth 配置文件时，OpenClaw 通过该 OAuth 配置文件路由图像请求，而不是首先尝试 `OPENAI_API_KEY`。显式 `models.providers.openai` 配置（API 密钥、custom/Azure 基础 URL）选择返回直接 OpenAI 图像 API 路由。

  </Step>
  <Step id="ask-the-agent" title="询问代理">
    _“生成一张友好机器人吉祥物的图片。”_

    座席自动呼叫 `image_generate`。无需工具允许列表 - 当提供程序可用时默认启用。该工具返回后台任务 ID，然后完成代理会在准备就绪时回复每个生成的附件。

  </Step>
</Steps>

<Warning>
对于 OpenAI- 兼容的 LAN 端点（例如 LocalAI），保留自定义 `models.providers.openai.baseUrl` 并明确选择加入 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。默认情况下，私有和内部图像端点仍处于阻止状态。
</Warning>

在 `models.providers.openai` 下配置的自定义端点可以返回 `b64_json` 或 `data[].url`。 OpenClaw 使用提供商的现有网络策略和来自 `agents.defaults.mediaMaxMb` 的图像大小上限下载 URL 结果。图像服务器必须返回图像 `Content-Type`。提供商 HTTP 凭证不会转发到图像 URL；提供商 TLS 凭据保留在提供商的来源上，包括跨重定向。 GPT 图像模型直接返回base64； OpenClaw 不会在自定义端点上强制使用旧版 `response_format` 参数。

## <a id="common-routes"></a> 常用路由

| 目标                                             | 模型引用                                                                                           | 认证                                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| OpenAI 使用 API 计费进行图像生成         | `openai/gpt-image-2`                                                                                | `OPENAI_API_KEY`                               |
| OpenAI GPT 图片 2.5                             | `openai/gpt-image-2.5-flare` or `openai/gpt-image-2.5-sunburst`                                     | 显式 OpenAI API-key 路由                  |
| 使用 ChatGPT/Codex OAuth 生成 OpenAI 图像 | `openai/gpt-image-2`                                                                                | OpenAI ChatGPT/Codex OAuth                     |
| OpenAI 透明背景 PNG/WebP           | `openai/gpt-image-1.5`                                                                              | `OPENAI_API_KEY` 或 OpenAI ChatGPT/Codex OAuth |
| DeepInfra 图像生成                       | `deepinfra/black-forest-labs/FLUX-1-schnell`                                                        | `DEEPINFRA_API_KEY`                            |
| fal Krea 2 expressive/style-directed一代  | `fal/krea/v2/medium/text-to-image`                                                                  | `FAL_KEY`                                      |
| fal GPT 图片 2.5                                | `fal/openai/gpt-image-2.5/flare/text-to-image` or `fal/openai/gpt-image-2.5/sunburst/text-to-image` | `FAL_KEY`                                      |
| OpenRouter 图像生成                      | `openrouter/google/gemini-3.1-flash-image-preview`                                                  | `OPENROUTER_API_KEY`                           |
| LiteLLM 图像生成                         | `litellm/gpt-image-2`                                                                               | `LITELLM_API_KEY`                              |
| Microsoft Foundry MAI 图像生成           | `microsoft-foundry/<deployment-name>`                                                               | `AZURE_OPENAI_API_KEY` 或 Entra ID             |
| Google Gemini 图像生成                   | `google/gemini-3.1-flash-image`                                                                     | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`           |

同一工具可以处理文本到图像和参考图像编辑。使用`image`供参考或`images`对于多个。对于韩国2模型上fal，这些引用作为样式引用而不是编辑输入发送。提供者支持的输出提示，例如`quality`， `outputFormat`， 和`background`当可用时转发，并在提供商未声明支持时报告为忽略。OpenAI和fal GPT图像2.5声明透明背景支持。其他提供商可能仍会保留PNGalpha 如果他们的后端发出它。

OpenAI 通过直接的 Images API 或 Codex Responses 后端，支持文本到图像生成和参考图像编辑使用 `low` 和 `auto` 内容审核。对于 CLI 请求，请将 `--openai-moderation low|auto` 传递给 `openclaw infer image generate` 或 `openclaw infer image edit`。

## <a id="supported-providers"></a> 支持的提供商

| 提供者          | 默认模型                           | 编辑支持                       | 认证                                                  |
| ----------------- | --------------------------------------- | ---------------------------------- | ----------------------------------------------------- |
| ComfyUI           | `workflow`                              | 是（1 张图片，按工作流配置） | 云端使用 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`    |
| DeepInfra         | `black-forest-labs/FLUX-1-schnell`      | 是（1 张图片）                      | `DEEPINFRA_API_KEY`                                   |
| fal               | `fal-ai/flux/dev`                       | 是（模型特定限制）        | `FAL_KEY`                                             |
| Google            | `gemini-3.1-flash-image`                | 是（最多 5 张图片）               | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                  |
| LiteLLM           | `gpt-image-2`                           | 是（最多 5 张输入图片）         | `LITELLM_API_KEY`                                     |
| Microsoft代工厂 | `<deployment-name>`                     | 是（仅 MAI-Image-2.5 模型）    | `AZURE_OPENAI_API_KEY` 或 Entra ID（`az login`）       |
| MiniMax           | `image-01`                              | 是（主体参考）            | `MINIMAX_API_KEY` 或 MiniMax OAuth（`minimax-portal`） |
| OpenAI            | `gpt-image-2`                           | 是（最多 5 张图片）               | `OPENAI_API_KEY` 或 OpenAI ChatGPT/Codex OAuth        |
| OpenRouter        | `google/gemini-3.1-flash-image-preview` | 是（最多 5 张输入图片）         | `OPENROUTER_API_KEY`                                  |
| Vydra             | `grok-imagine`                          | No                                 | `VYDRA_API_KEY`                                       |
| xAI               | `grok-imagine-image`                    | 是（最多 3 张图片）               | `XAI_API_KEY`                                         |

在运行时使用 `action: "list"` 来检查可用的提供方和模型：

```text
/tool image_generate action=list
```

使用 `action: "status"` 来检查当前会话中的活动图像生成任务：

```text
/tool image_generate action=status
```

任务状态和重复检测的范围仅限于请求聊天，即使直接聊天共享主会话记录也是如此。完成返回给请求图像的对等方。

## <a id="provider-capabilities"></a> 提供商能力

| 能力            | ComfyUI            | DeepInfra | fal                                                         | Google         | Microsoft代工厂 | MiniMax               | OpenAI         | Vydra | xAI            |
| --------------------- | ------------------ | --------- | ----------------------------------------------------------- | -------------- | ----------------- | --------------------- | -------------- | ----- | -------------- |
| 生成（最大计数）  | 1                  | 4         | 4                                                           | 4              | 1                 | 9                     | 4              | 1     | 4              |
| 编辑/参考      | 1 张图片（工作流程） | 1 张图片   | 通量：1； GPT：10； GPT 2.5：16；韩国风格参考：10； NB2：14 | 最多 5 张图像 | 1 张图片           | 1 张图片（主题参考） | 最多 5 张图像 | -     | 最多 3 张图像 |
| 尺寸控制          | -                  | ✓         | ✓                                                           | ✓              | ✓                 | -                     | Up to 4K       | -     | -              |
| 宽高比          | -                  | -         | ✓                                                           | ✓              | -                 | ✓                     | -              | -     | ✓              |
| 分辨率（1K/2K/4K） | -                  | -         | ✓                                                           | ✓              | -                 | -                     | -              | -     | 1K, 2K         |

## <a id="tool-parameters"></a> 工具参数

<ParamField path="prompt" type="string" required>
  图像生成提示。 `action: "generate"` 需要。
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  使用 `"status"` 检查活动会话任务或使用 `"list"` 在运行时检查可用的提供程序和模型。
</ParamField>
<ParamField path="model" type="string">
  Provider/model 覆盖 （e.g. `openai/gpt-image-2`）。将 `openai/gpt-image-1.5` 用于透明 OpenAI 背景。
</ParamField>
<ParamField path="image" type="string">
  用于编辑模式的单个参考图像路径或 URL。
</ParamField>
<ParamField path="images" type="string[]">
  用于编辑模式或样式参考模型的多个参考图像（通过共享工具最多 16 个。特定于提供商的限制仍然适用）。
</ParamField>
<ParamField path="size" type="string">
  尺寸提示：`1024x1024`、`1536x1024`、`1024x1536`、`2048x2048`、`3840x2160`。
</ParamField>
<ParamField path="aspectRatio" type="string">
  长宽比：`1:1`、`2:1`、`20:9`、`19.5:9`、`2:3`、`3:2`、`2.35:1`、`3:4`、`4:3`、 `4:5`、`5:4`、`9:16`、`9:19.5`、`9:20`、`16:9`、`21:9`、`1:2`、`4:1`、 `1:4`、`8:1`、`1:8`。提供商验证其特定于模型的子集。
</ParamField>
<ParamField path="resolution" type='"1K" | "2K" | "4K"'>分辨率 hint.</ParamField>
<ParamField path="quality" type='"low" | "medium" | "high" | "xhigh" | "max" | "auto"'>
  模型支持时的质量提示。 GPT 图像 2.5 通过 OpenAI 和 fal 支持 `xhigh` 和 `max`。
</ParamField>
<ParamField path="outputFormat" type='"png" | "jpeg" | "webp"'>
  当提供方支持时的输出格式提示。
</ParamField>
<ParamField path="background" type='"transparent" | "opaque" | "auto"'>
  提供商支持时的后台提示。对于具有透明能力的提供商，将 `transparent` 与 `outputFormat: "png"` 或 `"webp"` 结合使用。
</ParamField>
<ParamField path="count" type="number"> 生成的图像数量 （1-4）.</ParamField>
<ParamField path="timeoutMs" type="number">
  可选的提供程序请求超时（以毫秒为单位）。当 Codex 通过动态工具调用 `image_generate` 时，该每次调用值仍会覆盖配置的默认值，并且上限为 600000 毫秒。
</ParamField>
<ParamField path="filename" type="string">输出文件名 hint.</ParamField>
<ParamField path="openai" type="object">
  OpenAI-仅提示：`background`、`moderation`、`outputCompression` 和 `user`。
</ParamField>
<ParamField path="fal.creativity" type='"raw" | "low" | "medium" | "high"'>
  fal Krea 2 创意控制。默认为 `medium`。
</ParamField>

<Note>
并非所有提供程序都支持所有参数。当后备提供程序支持附近的几何选项而不是确切请求的几何选项时，OpenClaw 会在提交之前重新映射到最接近的支持尺寸、长宽比或分辨率。对于未声明支持并在工具结果中报告的提供程序，不支持的输出提示将被删除。工具结果报告应用的设置。 `details.normalization` 捕获任何请求应用的翻译。
</Note>

## <a id="configuration"></a> 配置

### <a id="model-selection"></a> 模型选择

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        image: {
          primary: "openai/gpt-image-2",
          timeoutMs: 180000,
          fallbacks: [
            "openrouter/google/gemini-3.1-flash-image-preview",
            "google/gemini-3.1-flash-image",
            "fal/fal-ai/flux/dev",
          ],
        },
      },
    },
  },
}
```

### <a id="provider-selection-order"></a> 提供方选择顺序

对于 `image_generate`，OpenClaw 按以下顺序尝试提供程序：

1. **`model` 来自工具调用的参数**。设置后，仅尝试此模型。
2. 来自配置的 **`agents.defaults.mediaModels.image.primary`**。
3. 按顺序使用 **`agents.defaults.mediaModels.image.fallbacks`**。
4. **自动检测** - 仅当未配置主要模型或后备模型时，使用配置的提供程序默认值：
   - 当前默认提供商第一。
   - 剩余按提供商 ID 顺序注册的图像生成提供商。

如果提供者失败（身份验证错误、速率限制等），则会自动尝试下一个配置的候选者。如果全部失败，错误将包含每次尝试的详细信息。对于参考图像请求，无法编辑图像或接受所提供的参考计数的候选者将被跳过。

<AccordionGroup>
  <Accordion id="per-call-model-overrides-are-exact" title="每次调用模型覆盖都是准确的">
    每次调用 `model` 覆盖仅尝试 provider/model，并且不会继续配置 primary/fallback 或自动检测的提供程序。
  </Accordion>
  <Accordion id="auto-detection-uses-configured-providers" title="自动检测使用配置的提供程序">
    自动检测会考虑准备就绪或身份验证检查通过的提供商默认值。显式图像模型配置限制回退到配置的列表。 OpenClaw 不附加自动检测的提供程序。
  </Accordion>
  <Accordion id="timeouts" title="超时">
    设置 `agents.defaults.mediaModels.image.timeoutMs` 以获得慢速图像后端。每次调用的 `timeoutMs` 工具参数会覆盖配置的默认值，并且配置的默认值会覆盖插件创作的提供程序默认值。 Google 和 OpenRouter 托管图像提供程序使用 180 秒默认值。 Microsoft Foundry MAI、xAI 和 Azure OpenAI 图像生成使用 600 秒。 Codex 动态工具调用使用 120 秒的 `image_generate` 桥接默认值，并在配置时遵循相同的超时预算，以 OpenClaw 的 600000 毫秒动态工具桥接最大值为限。
  </Accordion>
  <Accordion id="inspect-at-runtime" title="运行时检查">
    使用 `action: "list"` 检查当前已注册的提供方、 它们的默认模型以及认证环境变量提示。
  </Accordion>
</AccordionGroup>

### <a id="image-editing"></a> 图像编辑

OpenAI、OpenRouter、Google、DeepInfra、fal、Microsoft Foundry、MiniMax、 ComfyUI 和 xAI 支持编辑参考图像。fal 上的 Krea 2 模型使用相同的 `image` / `images` 字段作为风格参考，而不是编辑输入。传入参考图像路径或 URL：

```text
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI、OpenRouter 和 Google 通过 `images` 参数最多支持 5 个参考图像。 xAI 最多支持 3 个。fal 支持 Flux 图像到图像的 1 个参考图像、GPT 图像 2.5 编辑最多 16 个、旧版 GPT 图像编辑最多 10 个、Krea 2 最多 10 个样式参考、Nano 最多 14 个香蕉2编辑。 Microsoft Foundry、MiniMax 和 ComfyUI 支持 1。

## <a id="provider-deep-dives"></a> 提供方深度解析

<AccordionGroup>
  <Accordion id="gpt-image-2-5-through-openai-or-fal" title="GPT 图像 2.5 至 OpenAI 或 fal">
    明确选择任一变体。现有提供商默认值不会更改：

    - OpenAI: `openai/gpt-image-2.5-flare` or `openai/gpt-image-2.5-sunburst`
    - fal: `fal/openai/gpt-image-2.5/flare/text-to-image` or
      `fal/openai/gpt-image-2.5/sunburst/text-to-image`

    两种变体都支持生成、编辑、`xhigh` 和 `max` 质量、PNG/JPEG/WebP 输出以及 PNG 或 WebP 的透明背景。 OpenAI 通过 OpenClaw 接受最多 5 个参考图像。 fal 接受 16。通过参考图像，fal 将 `/text-to-image` 替换为 `/edit`。显式 fal `/edit` 路径保持不变。

    使用 [ 显式 OpenAI API- 密钥路由 ](/providers/openai/image-and-video#gpt-image-2.5) 进行直接 GPT 图像 2.5 请求。单独导出 `OPENAI_API_KEY` 不会覆盖现有的 OAuth 配置文件。这些示例不建立 GPT 映像 2.5 订阅访问。

    使用 `size: "auto"` 或有效的 `WIDTHxHEIGHT` 尺寸。两个尺寸都必须能被 16 整除，并且没有边缘超过 3840 像素。总像素必须为 655,360-8,294,400，长宽比为 1：3 到 3：1。 fal 将宽高比提示转换为有效尺寸，例如 `3:2` 转换为 `1536x1024`。无效的显式大小会失败并出现大小错误。 fal 不接受这些模型的 `resolution` 覆盖或从编辑输入推断分辨率。

  </Accordion>
  <Accordion id="openai-gpt-image-2-and-gpt-image-1-5" title="OpenAI gpt-image-2（和 gpt-image-1.5）">
    OpenAI图像生成默认为`openai/gpt-image-2`. If an `openai` OAuth配置文件已配置，OpenClaw重复使用相同的OAuth使用的配置文件Codex订阅聊天模型并通过以下方式发送图像请求Codex回复后端。遗产Codex基本 URL，例如`https://chatgpt.com/backend-api`被转换为`https://chatgpt.com/backend-api/codex`对于图像请求。OpenClaw做**不是**默默地落回`OPENAI_API_KEY`对于该请求 - 强制直接OpenAI图片API路由、配置`models.providers.openai`明确地与API钥匙，定制底座URL或 Azure 端点。

    仍然可以明确选择 `openai/gpt-image-1.5`、`openai/gpt-image-1` 和 `openai/gpt-image-1-mini` 模型。使用 `gpt-image-1.5` 进行透明背景 PNG/WebP 输出。当前的 `gpt-image-2` API 拒绝 `background: "transparent"`。

    `gpt-image-2` 通过相同的 `image_generate` 工具支持文本到图像生成和参考图像编辑。 OpenClaw 将 `prompt`、`count`、`size`、`quality`、`outputFormat` 和参考图像转发到 OpenAI。 OpenAI **不是** 直接接收 `aspectRatio` 或 `resolution`。如果可能，OpenClaw 将它们映射到受支持的 `size`，否则该工具会将它们报告为忽略覆盖。

    对于直接的 OpenAI Images API 请求，`gpt-image-2` 及其 `gpt-image-2-2026-04-21` 快照会保留有效的显式 `WIDTHxHEIGHT` 尺寸，而不是将其调整为预设值。两个维度都必须是 16 的倍数，且都不得超过 3840 像素， 宽高比不得超过 3:1，图像像素数必须介于 655,360 和 8,294,400 之间。例如，`1024x640` 是有效的。当仅指定 `aspectRatio` 时，OpenClaw 仍会选择最接近的受支持尺寸。

    OpenAI- 特定选项位于 `openai` 对象下：

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

    `openai.background` 接受 `transparent`、`opaque` 或 `auto`。透明输出需要 `outputFormat`、`png` 或 `webp` 以及支持透明的 OpenAI 图像模型。 OpenClaw 将默认 `gpt-image-2` 透明背景请求路由到 `gpt-image-1.5`。 `openai.outputCompression` 适用于 JPEG/WebP 输出，而对于 PNG 输出则被忽略。

    顶级 `background` 提示与提供程序无关，并且在选择 OpenAI 提供程序时映射到相同的 OpenAI `background` 请求字段。未声明后台支持的提供程序会在 `ignoredOverrides` 中返回它，而不是接收不受支持的参数。

    要通过 Azure OpenAI 部署而不是 `api.openai.com` 路由 OpenAI 映像生成，请参阅 [Azure OpenAI 端点](/providers/openai/azure#azure-openai-endpoints)。

  </Accordion>
  <Accordion id="microsoft-foundry-mai-image-models" title="Microsoft代工MAI图像模型">
    Microsoft Foundry 图像生成使用已部署的 MAI 图像部署名称， 并通过 `microsoft-foundry/` 提供方前缀引用。提供方级别没有默认模型，因为 MAI API 期望你在 `model` 字段中提供部署名称：

    ```json5
    {
      agents: {
        defaults: {
          mediaModels: {
            image: {
              primary: "microsoft-foundry/<deployment-name>",
              timeoutMs: 600000,
            },
          },
        },
      },
    }
    ```

    该提供方使用的是 Microsoft Foundry 的 MAI API，而不是 OpenAI Images API：

    - 生成端点：`/mai/v1/images/generations`
    - 编辑端点：`/mai/v1/images/edits`
    - 身份验证：`AZURE_OPENAI_API_KEY` / 提供方 API key，或通过 `az login` 使用 Entra ID
    - 输出：一张 PNG 图像
    - 尺寸：默认`1024x1024`。宽度和高度必须至少为 768 像素，总像素不得超过 1,048,576
    - 编辑：一张 PNG 或 JPEG 参考图，仅 `MAI-Image-2.5-Flash` 和 `MAI-Image-2.5` 部署支持

    仅提示生成可以使用仅配置 Foundry 端点的自定义部署名称。使用自定义部署名称进行编辑需要 onboarding/model 元数据，以便 OpenClaw 可以验证部署是否由 `MAI-Image-2.5-Flash` 或 `MAI-Image-2.5` 支持。

    当前的 MAI 图像模型有 `MAI-Image-2.5-Flash`、`MAI-Image-2.5`、 `MAI-Image-2e` 和 `MAI-Image-2`。关于设置和聊天模型行为，请参见 [Microsoft Foundry 插件](/plugins/reference/microsoft-foundry)。

  </Accordion>
  <Accordion id="openrouter-image-models" title="OpenRouter 图像模型">
    OpenRouter 图像生成使用相同的 `OPENROUTER_API_KEY` 并通过 OpenRouter 的专用 `/api/v1/images` 端点路由标准请求。配置的自定义 OpenRouter 基本 URL 保留现有的聊天完成图像路由以实现代理兼容性。选择前缀为 `openrouter/` 的 OpenRouter 镜像模型：

    ```json5
    {
      agents: {
        defaults: {
          mediaModels: {
            image: {
              primary: "openrouter/google/gemini-3.1-flash-image-preview",
            },
          },
        },
      },
    }
    ```

    OpenClaw 将 `prompt`、`count`、参考图像和 Gemini- 兼容的 `aspectRatio` / `resolution` 提示转发给 OpenRouter。当前内置的 OpenRouter 图像模型快捷方式包括 `google/gemini-3.1-flash-image`、`google/gemini-3-pro-image` 和 `openai/gpt-5.4-image-2`。使用 `action: "list"` 查看您配置的插件公开的内容。

  </Accordion>
  <Accordion id="fal-krea-2" title="fal 韩国 2">
    fal 上的 Krea 2 模型使用 fal 原生的 Krea schema，而不是 Flux 使用的通用 `image_size` schema。OpenClaw 发送：

    - `aspect_ratio` 用于宽高比提示
    - `creativity`，默认值为 `medium`
    - `image_style_references`（当提供 `image` 或 `images` 时）

    选择 Krea 2 Medium 可获得更快、更具表现力的插画；或选择 Krea 2 Large， 以获得更慢但更详细的写实效果和纹理：

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

    Krea 2 每个请求返回一张图像。对于 Krea，更喜欢 `aspectRatio`。 OpenClaw 将 `size` 映射到最接近支持的 Krea 宽高比，并拒绝 Krea 的 `resolution`，而不是丢弃它。当您想要韩国本地创造力水平时，请使用 `fal.creativity`：

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
  <Accordion id="minimax-dual-auth" title="MiniMax双认证">
    MiniMax 图像生成可以使用两种内置的 MiniMax 认证路径之一：

    - `minimax/image-01` 用于 API- 密钥设置
    - `minimax-portal/image-01` 用于 OAuth 配置

  </Accordion>
  <Accordion title="xAI grok-imagine-image">
    捆绑的 xAI 提供程序使用 `/v1/images/generations` 进行仅提示请求，并在存在 `image` 或 `images` 时使用 `/v1/images/edits`。

    - 模型：`xai/grok-imagine-image`（默认）、`xai/grok-imagine-image-2.0`、`xai/grok-imagine-image-quality`
    - 数量：最多 4
    - 参考图：一张 `image` 或最多三张 `images`
    - 宽高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`、`2:1`、 `1:2`、`19.5:9`、`9:19.5`、`20:9`、`9:20`
    - 分辨率：`1K`、`2K`
    - Outputs：作为 OpenClaw- 托管图像附件返回

    OpenClaw 故意不公开 xAI-native `quality`、`mask`、`user` 或 `auto` 纵横比，直到这些控件存在于共享跨提供商 `image_generate` 合约中。

  </Accordion>
</AccordionGroup>

## <a id="examples"></a> 示例

<Tabs>
  <Tab id="generate-4k-landscape" title="生成（4K 风景）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="A clean editorial poster for OpenClaw image generation" size=3840x2160 count=1
```
  </Tab>
  <Tab id="generate-transparent-png" title="生成（透明PNG）">
```text
/tool image_generate action=generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```

等效 CLI：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

  </Tab>
  <Tab id="generate-openai-low-quality" title="生成（OpenAI 低质量）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Low-cost draft poster for a quiet productivity app" quality=low openai='{"moderation":"low"}'
```

等效 CLI：

```bash
openclaw infer image generate \
  --model openai/gpt-image-2 \
  --quality low \
  --openai-moderation low \
  --prompt "Low-cost draft poster for a quiet productivity app" \
  --json
```

  </Tab>
  <Tab id="generate-two-square" title="生成（两个正方形）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Two visual directions for a calm productivity app icon" size=1024x1024 count=2
```
  </Tab>
  <Tab id="edit-one-reference" title="编辑（一份参考）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Keep the subject, replace the background with a bright studio setup" image=/path/to/reference.png size=1024x1536
```
  </Tab>
  <Tab id="edit-multiple-references" title="编辑（多个参考）">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Combine the character identity from the first image with the color palette from the second" images='["/path/to/character.png","/path/to/palette.jpg"]' size=1536x1024
```
  </Tab>
  <Tab id="krea-style-references" title="克里亚风格参考">
```text
/tool image_generate action=generate model=fal/krea/v2/medium/text-to-image prompt="An expressive editorial portrait using this color palette and print texture" images='["/path/to/palette.png","/path/to/texture.jpg"]' aspectRatio=9:16 fal='{"creativity":"high"}'
```
  </Tab>
</Tabs>

`openclaw infer image edit` 上也有相同的 `--output-format`、`--background` 和 `--quality` 标志。 `--openai-background` 保留为 OpenAI- 特定别名。将 `--openai-moderation low|auto` 与 OpenAI 图像生成和参考图像编辑结合使用。直接 OpenAI 图片 API 和 ChatGPT/Codex OAuth 响应后端均支持审核提示。 OpenAI 和 fal GPT 图像 2.5 模型支持显式背景控制。其他捆绑提供商将 `background: "transparent"` 报告为已忽略。

## <a id="related"></a> 相关内容

- [工具概览](/tools) - 所有可用的代理工具
- [ComfyUI](/providers/comfy) - 本地 ComfyUI 和 Comfy Cloud 工作流设置
- [fal](/providers/fal) - fal 图像和视频提供商设置
- [Google（Gemini）](/providers/google) - Gemini 图像提供商设置
- [Microsoft Foundry 插件](/plugins/reference/microsoft-foundry) - Microsoft Foundry 聊天和 MAI 图像设置
- [MiniMax](/providers/minimax) - MiniMax 图像提供商设置
- [OpenAI](/providers/openai) - OpenAI Images 提供商设置
- [OpenRouter](/providers/openrouter) - OpenRouter 图像提供程序设置
- [Vydra](/providers/vydra) - Vydra 图像、视频和语音设置
- [xAI](/providers/xai) - Grok 图像、视频、搜索、代码执行和 TTS 设置
- [配置参考](/gateway/config-agents#agent-defaults) - `agents.defaults.mediaModels.image` 配置
- [模型](/concepts/models) - 模型配置和故障转移
- [媒体概述](/tools/media-overview) - 媒体工具如何组合在一起
