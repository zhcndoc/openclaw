---
summary: "使用已配置的提供商（OpenAI、OpenAI Codex OAuth、Google Gemini、OpenRouter、fal、MiniMax、ComfyUI、Vydra、xAI）生成和编辑图像"
read_when:
  - 通过代理生成图像
  - 配置图像生成提供商和模型
  - 理解 image_generate 工具参数
title: "图像生成"
---

`image_generate` 工具使代理能够使用你配置的提供商创建和编辑图像。生成的图像会作为媒体附件自动显示在代理的回复中。

<Note>
仅当至少有一个图像生成提供商可用时，该工具才会出现。如果你在代理的工具中看不到 `image_generate`，请配置 `agents.defaults.imageGenerationModel`，设置提供商 API 密钥，或使用 OpenAI Codex OAuth 登录。
</Note>

## 快速开始

1. 为至少一个提供商设置 API 密钥（例如 `OPENAI_API_KEY`、`GEMINI_API_KEY` 或 `OPENROUTER_API_KEY`），或者使用 OpenAI Codex OAuth 登录。
2. 可选地设置你偏好的模型：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
      },
    },
  },
}
```

Codex OAuth 使用相同的 `openai/gpt-image-2` 模型引用。当配置了
`openai-codex` OAuth 配置文件时，OpenClaw 会将图像请求
通过该 OAuth 配置文件路由，而不是先尝试 `OPENAI_API_KEY`。
显式自定义 `models.providers.openai` 图像配置，例如 API 密钥或
自定义/Azure 基础 URL，会重新切回直接使用 OpenAI Images API 路由。
对于诸如 LocalAI 之类的 OpenAI 兼容 LAN 端点，请保留自定义的
`models.providers.openai.baseUrl`，并显式启用
`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`；私有/内部
图像端点默认仍会被阻止。

3. 让代理执行：_“生成一张友好机器人吉祥物的图像。”_

代理会自动调用 `image_generate`。无需工具白名单——当提供商可用时默认启用。

## 常见路由

| 目标                                                 | 模型引用                                            | 身份验证                               |
| ---------------------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| 使用 API 计费进行 OpenAI 图像生成                   | `openai/gpt-image-2`                                | `OPENAI_API_KEY`                       |
| 使用 Codex 订阅身份验证进行 OpenAI 图像生成         | `openai/gpt-image-2`                                | OpenAI Codex OAuth                    |
| OpenRouter 图像生成                                  | `openrouter/google/gemini-3.1-flash-image-preview`  | `OPENROUTER_API_KEY`                  |
| Google Gemini 图像生成                               | `google/gemini-3.1-flash-image-preview`             | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY` |

同一个 `image_generate` 工具同时处理文本生成图像和参考图像
编辑。对单个参考使用 `image`，对多个参考使用 `images`。
提供商支持的输出提示（例如 `quality`、`outputFormat`，以及
OpenAI 特有的 `background`）会在可用时转发，并在提供商不支持时标记为
已忽略。

## 支持的提供商

| 提供商     | 默认模型                           | 编辑支持                         | 身份验证                                             |
| ---------- | ---------------------------------- | -------------------------------- | ---------------------------------------------------- |
| OpenAI     | `gpt-image-2`                      | 是（最多 4 张图像）               | `OPENAI_API_KEY` 或 OpenAI Codex OAuth               |
| OpenRouter | `google/gemini-3.1-flash-image-preview` | 是（最多 5 张输入图像）      | `OPENROUTER_API_KEY`                                 |
| Google     | `gemini-3.1-flash-image-preview`   | 是                               | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                 |
| fal        | `fal-ai/flux/dev`                  | 是                               | `FAL_KEY`                                            |
| MiniMax    | `image-01`                         | 是（主体参考）                   | `MINIMAX_API_KEY` 或 MiniMax OAuth（`minimax-portal`） |
| ComfyUI    | `workflow`                         | 是（1 张图像，基于工作流配置）    | 云端使用 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`      |
| Vydra      | `grok-imagine`                     | 否                               | `VYDRA_API_KEY`                                      |
| xAI        | `grok-imagine-image`               | 是（最多 5 张图像）               | `XAI_API_KEY`                                        |

使用 `action: "list"` 在运行时检查可用的提供商和模型：

```
/tool image_generate action=list
```

## 工具参数

<ParamField path="prompt" type="string" required>
图像生成提示词。`action: "generate"` 时为必填。
</ParamField>

<ParamField path="action" type="'generate' | 'list'" default="generate">
使用 `"list"` 在运行时检查可用的提供商和模型。
</ParamField>

<ParamField path="model" type="string">
提供商/模型覆盖，例如 `openai/gpt-image-2`。
</ParamField>

<ParamField path="image" type="string">
用于编辑模式的单个参考图像路径或 URL。
</ParamField>

<ParamField path="images" type="string[]">
用于编辑模式的多个参考图像（最多 5 张）。
</ParamField>

<ParamField path="size" type="string">
尺寸提示：`1024x1024`、`1536x1024`、`1024x1536`、`2048x2048`、`3840x2160`。
</ParamField>

<ParamField path="aspectRatio" type="string">
宽高比：`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9`。
</ParamField>

<ParamField path="resolution" type="'1K' | '2K' | '4K'">
分辨率提示。
</ParamField>

<ParamField path="quality" type="'low' | 'medium' | 'high' | 'auto'">
当提供商支持时使用的质量提示。
</ParamField>

<ParamField path="outputFormat" type="'png' | 'jpeg' | 'webp'">
当提供商支持时使用的输出格式提示。
</ParamField>

<ParamField path="count" type="number">
要生成的图像数量（1–4）。
</ParamField>

<ParamField path="timeoutMs" type="number">
可选的提供商请求超时时间，单位为毫秒。
</ParamField>

<ParamField path="filename" type="string">
输出文件名提示。
</ParamField>

<ParamField path="openai" type="object">
仅 OpenAI 支持的提示：`background`、`moderation`、`outputCompression` 和 `user`。
</ParamField>

并非所有提供商都支持所有参数。当备用提供商支持与请求不完全相同但接近的几何选项时，OpenClaw 会在提交前将其重映射为最接近受支持的尺寸、宽高比或分辨率。对于未声明支持的提供商，诸如 `quality` 或 `outputFormat` 之类不受支持的输出提示会被丢弃，并在工具结果中报告。

## 配置

### 模型选择

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
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

### 提供商选择顺序

生成图像时，OpenClaw 按以下顺序尝试提供商：

1. 来自工具调用的 **`model` 参数**（如果代理指定了一个）
2. 来自配置的 **`imageGenerationModel.primary`**
3. 按顺序排列的 **`imageGenerationModel.fallbacks`**
4. **自动检测** — 仅使用基于认证的提供商默认值：
   - 首先是当前默认提供商
   - 其余注册的图像生成提供商按提供商 ID 顺序

如果某个提供商失败（身份验证错误、速率限制等），则会自动尝试下一个已配置的候选项。如果全部失败，错误将包含每次尝试的详细信息。

注意：

- 每次调用的 `model` 覆盖是精确匹配：OpenClaw 只尝试该提供商/模型，
  不会继续尝试已配置的 primary/fallback 或自动检测到的
  提供商。
- 自动检测会根据认证情况判断。只有当 OpenClaw 实际能够对该提供商进行身份验证时，
  该提供商的默认值才会进入候选列表。
- 自动检测默认启用。如果你希望图像
  生成只使用显式的 `model`、`primary` 和 `fallbacks`
  条目，请设置
  `agents.defaults.mediaGenerationAutoProviderFallback: false`。
- 使用 `action: "list"` 检查当前注册的提供商、其
  默认模型和身份验证环境变量提示。

### 图像编辑

OpenAI、OpenRouter、Google、fal、MiniMax、ComfyUI 和 xAI 支持编辑参考图像。传入参考图像路径或 URL：

```
"生成此照片的水彩版本" + image: "/path/to/photo.jpg"
```

OpenAI、OpenRouter、Google 和 xAI 支持通过 `images` 参数传入最多 5 张参考图像。fal、MiniMax 和 ComfyUI 支持 1 张。

### OpenRouter 图像模型

OpenRouter 图像生成使用相同的 `OPENROUTER_API_KEY`，并通过 OpenRouter 的聊天补全图像 API 进行路由。使用 `openrouter/` 前缀选择 OpenRouter 图像模型：

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

OpenClaw 会将 `prompt`、`count`、参考图像以及与 Gemini 兼容的 `aspectRatio` / `resolution` 提示转发给 OpenRouter。目前内置的 OpenRouter 图像模型快捷引用包括 `google/gemini-3.1-flash-image-preview`、`google/gemini-3-pro-image-preview` 和 `openai/gpt-5.4-image-2`；使用 `action: "list"` 查看你已配置的插件暴露了哪些模型。

### OpenAI `gpt-image-2`

OpenAI 图像生成默认使用 `openai/gpt-image-2`。如果配置了
`openai-codex` OAuth 配置文件，OpenClaw 会复用 Codex 订阅聊天模型所使用的同一个 OAuth
配置文件，并通过 Codex Responses 后端发送图像请求；
对于该请求，它不会静默回退到 `OPENAI_API_KEY`。要强制直接使用 OpenAI Images API 路由，
请使用 API 密钥、自定义基础 URL
或 Azure 端点显式配置 `models.providers.openai`。较早的
`openai/gpt-image-1` 模型仍可显式选择，但新的 OpenAI
图像生成和图像编辑请求应使用 `gpt-image-2`。

`gpt-image-2` 通过同一个 `image_generate` 工具同时支持文本生成图像和参考图像
编辑。OpenClaw 会将 `prompt`、
`count`、`size`、`quality`、`outputFormat` 和参考图像转发给 OpenAI。
OpenAI 不会直接接收 `aspectRatio` 或 `resolution`；在可能的情况下，
OpenClaw 会将这些值映射为受支持的 `size`，否则工具会将其报告为
已忽略的覆盖项。

OpenAI 特有选项位于 `openai` 对象下：

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

`openai.background` 接受 `transparent`、`opaque` 或 `auto`；透明
输出需要 `outputFormat` 为 `png` 或 `webp`。`openai.outputCompression`
适用于 JPEG/WebP 输出。

生成一张 4K 横向图像：

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="OpenClaw 图像生成的简洁编辑风格海报" size=3840x2160 count=1
```

生成两张正方形图像：

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="为一个平静的生产力应用图标提供两个视觉方向" size=1024x1024 count=2
```

编辑一张本地参考图像：

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="保留主体，将背景替换为明亮的摄影棚布置" image=/path/to/reference.png size=1024x1536
```

使用多张参考图像进行编辑：

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="将第一张图像中的角色身份与第二张图像中的配色方案结合起来" images='["/path/to/character.png","/path/to/palette.jpg"]' size=1536x1024
```

要通过 Azure OpenAI 部署而不是 `api.openai.com` 路由 OpenAI 图像生成，
请参见 OpenAI 提供商文档中的 [Azure OpenAI 端点](/providers/openai#azure-openai-endpoints)
。

MiniMax 图像生成可通过两种内置 MiniMax 身份验证路径使用：

- `minimax/image-01` 用于 API 密钥设置
- `minimax-portal/image-01` 用于 OAuth 设置

## 提供商能力

| 能力                 | OpenAI               | Google               | fal                 | MiniMax                    | ComfyUI                            | Vydra   | xAI                  |
| -------------------- | -------------------- | -------------------- | ------------------- | -------------------------- | ---------------------------------- | ------- | -------------------- |
| 生成                  | 是（最多 4 张）       | 是（最多 4 张）       | 是（最多 4 张）      | 是（最多 9 张）            | 是（工作流定义的输出）             | 是（1 张） | 是（最多 4 张）       |
| 编辑/参考             | 是（最多 5 张图像）   | 是（最多 5 张图像）   | 是（1 张图像）       | 是（1 张图像，主体参考）   | 是（1 张图像，工作流配置）         | 否      | 是（最多 5 张图像）   |
| 尺寸控制              | 是（最多 4K）         | 是                   | 是                  | 否                         | 否                                 | 否      | 否                   |
| 纵横比                | 否                   | 是                   | 是（仅生成时）        | 是                         | 否                                 | 否      | 是                   |
| 分辨率（1K/2K/4K）    | 否                   | 是                   | 是                  | 否                         | 否                                 | 否      | 是（1K/2K）          |

### xAI `grok-imagine-image`

捆绑的 xAI 提供商在仅提示词请求时使用 `/v1/images/generations`
在存在 `image` 或 `images` 时使用 `/v1/images/edits`。

- 模型：`xai/grok-imagine-image`、`xai/grok-imagine-image-pro`
- 数量：最多 4 张
- 参考：1 张 `image` 或最多 5 张 `images`
- 纵横比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
- 分辨率：`1K`、`2K`
- 输出：作为 OpenClaw 管理的图像附件返回

在共享的跨提供商 `image_generate` 合约中尚未具备这些控制项之前，OpenClaw 刻意不暴露 xAI 原生的 `quality`、`mask`、`user` 或其他仅原生支持的纵横比。

## 相关内容

- [Tools Overview](/tools) — 所有可用的智能体工具
- [fal](/providers/fal) — fal 图像和视频提供商设置
- [ComfyUI](/providers/comfy) — 本地 ComfyUI 和 Comfy Cloud 工作流设置
- [Google (Gemini)](/providers/google) — Gemini 图像提供商设置
- [MiniMax](/providers/minimax) — MiniMax 图像提供商设置
- [OpenAI](/providers/openai) — OpenAI 图像提供商设置
- [Vydra](/providers/vydra) — Vydra 图像、视频和语音设置
- [xAI](/providers/xai) — Grok 图像、视频、搜索、代码执行和 TTS 设置
- [Configuration Reference](/gateway/config-agents#agent-defaults) — `imageGenerationModel` 配置
- [Models](/concepts/models) — 模型配置和故障转移
