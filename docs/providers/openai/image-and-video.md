---
summary: "使用 OpenAI gpt-image 生成和编辑图像"
read_when:
  - "您正在通过 openai 提供商生成或编辑图像"
  - "您需要透明背景图像输出"
title: "OpenAI 图像生成"
sidebarTitle: "图像生成"
---

## <a id="image-generation"></a> 图像生成

捆绑的 `openai` 插件通过 `image_generate` 工具注册图像生成。它通过相同的 `openai/gpt-image-2` 模型参考支持 OpenAI API-key 和 Codex OAuth 图像生成。使用ChatGPT（SIWC）登录无法授权该工具。 Codex OAuth 这里表示 OpenClaw 模型认证配置文件；仅登录到本机 Codex 用户主目录不会向 `image_generate` 提供凭证。

| 能力                | OpenAI API 密钥                     | Codex OAuth                          |
| ------------------------- | ---------------------------------- | ------------------------------------ |
| 模型引用                 | `openai/gpt-image-2`               | `openai/gpt-image-2`                 |
| 认证                      | `OPENAI_API_KEY`                   | OpenAI Codex OAuth 登录           |
| 传输方式                 | OpenAI 图片 API                  | Codex Responses 后端              |
| 每次请求的最大图像数    | 4                                  | 4                                    |
| 编辑模式                 | 已启用（最多 5 张参考图像） | 已启用（最多 5 张参考图像）   |
| 内容审核                | `low` 或 `auto`；支持生成和编辑 | `low` 或 `auto`；支持生成和编辑   |
| 尺寸覆盖            | 支持，包括 2K/4K 尺寸   | 支持，包括 2K/4K 尺寸     |
| 宽高比 / 分辨率 | 不会转发到 OpenAI Images API | 在安全的情况下映射到受支持的尺寸 |

```json5
{
  agents: {
    defaults: {
      mediaModels: { image: { primary: "openai/gpt-image-2" } },
    },
  },
}
```

<Note>
有关共享工具参数、提供程序选择和故障转移行为，请参阅 [Image Generation](/tools/image-generation)。
</Note>

`gpt-image-2` 是 OpenAI 文生图和图像编辑的默认模型。`gpt-image-1.5`、`gpt-image-1` 和 `gpt-image-1-mini` 仍可作为显式模型覆盖使用。对于透明背景的 PNG/WebP 输出，请使用 `openai/gpt-image-1.5`；当前 `gpt-image-2` API 会拒绝 `background: "transparent"`。

### <a id="gpt-image-2.5"></a><a id="gpt-image-2-5"></a> GPT 图片 2.5

明确选择 `openai/gpt-image-2.5-flare` 或 `openai/gpt-image-2.5-sunburst`。两者都支持通过直接图像 API 生成和编辑。默认值仍为 `openai/gpt-image-2`。

导出`OPENAI_API_KEY`并选择API-key认证：

```json5
{
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        auth: "api-key",
        models: [],
      },
    },
  },
}
```

当 OpenAI OAuth 配置文件也存在时，此显式选择很重要。单独导出环境变量不会覆盖该配置文件。 GPT 图像 2.5 订阅访问不是通过此 API-key 设置建立的。

两种变体均接受 `low`、`medium`、`high`、`xhigh`、`max` 或 `auto` 质量。对于透明背景，请使用 PNG 或 WebP。编辑通过 OpenClaw 最多接受 5 个参考图像。

```bash
openclaw infer image generate \
  --model openai/gpt-image-2.5-flare \
  --prompt "A simple red circle sticker on a transparent background" \
  --quality low --output-format webp --background transparent --json

openclaw infer image edit \
  --model openai/gpt-image-2.5-sunburst \
  --file /path/to/reference.png \
  --prompt "Keep the shape and change the color to blue" \
  --quality low --size auto --json
```

`size` 接受 `auto` 或 `WIDTHxHEIGHT`。尺寸必须能被 16 整除，没有边缘超过 3840 像素，总像素在 655,360 到 8,294,400 之间。长宽比必须介于 1：3 和 3：1 之间。

### <a id="other-image-models"></a> 其他图片模型

对于透明背景请求，请使用 `model: "openai/gpt-image-1.5"`、`outputFormat: "png"` 或 `"webp"` 和 `background: "transparent"` 调用 `image_generate`；旧的 `openai.background` 提供商选项仍然被接受。 OpenClaw还通过将默认的`openai/gpt-image-2`透明请求重写为`gpt-image-1.5`来保护公共OpenAI和OpenAI Codex OAuth路由； Azure 和自定义 OpenAI- 兼容终结点保留其配置的 deployment/model 名称。

相同设置也可用于无头 CLI 运行：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

从输入文件启动时，使用与 `openclaw infer image edit` 相同的 `--output-format` 和 `--background` 标志。 `--openai-background` 仍可用作 OpenAI- 特定别名。使用 `--quality low|medium|high|auto` 控制 OpenAI 图像质量和成本。将 `--openai-moderation low|auto` 与 `image generate` 和 `image edit` 一起使用以传递 OpenAI 的审核提示。直接 OpenAI 图像 API 和 ChatGPT/Codex OAuth 响应后端均支持文本到图像生成和参考图像编辑的审核。

对于 ChatGPT/Codex OAuth 安装，请保留相同的 `openai/gpt-image-2` 参考。配置 `openai` OAuth 配置文件时，OpenClaw 解析存储的 OAuth 访问令牌并通过 Codex 响应后端发送图像请求；它不会首先尝试 `OPENAI_API_KEY` 或默默地回退到 API 密钥。该响应请求在 `gpt-6-astra` 上运行。如果您的 ChatGPT 计划拒绝该模型，OpenClaw 会重试 `agents.defaults.model` 中的每个 `openai/*` 模型（主要的，然后是后备的），因此请配置您的计划支持的模型。当您想要直接 OpenAI 图像 API 路由时，使用 API 密钥、自定义基础 URL 或 Azure 终结点显式配置 `models.providers.openai`。如果该自定义映像端点位于受信任的 LAN/private 地址上，则还要设置 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`； OpenClaw 会阻止 private/internal OpenAI- 兼容的图像端点，除非存在此选择。

生成：

```
/tool image_generate model=openai/gpt-image-2 prompt="A polished launch poster for OpenClaw on macOS" size=3840x2160 count=1
```

生成透明 PNG：

```
/tool image_generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```

编辑：

```
/tool image_generate model=openai/gpt-image-2 prompt="Preserve the object shape, change the material to translucent glass" image=/path/to/reference.png size=1024x1536
```

OpenAI 于 2026 年 9 月 24 日停用了 Sora 视频 API；请参阅 [ 视频生成 ](/tools/video-generation) 了解受支持的提供商。
