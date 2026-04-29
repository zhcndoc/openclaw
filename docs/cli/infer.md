---
summary: "面向提供商支持的模型、图像、音频、TTS、视频、网页和嵌入工作流的优先推理 CLI"
read_when:
  - 添加或修改 `openclaw infer` 命令时
  - 设计稳定的无头能力自动化时
title: "推理 CLI"
---

`openclaw infer` 是提供商支持的推理工作流的标准无头入口。

它有意暴露的是能力家族，而不是原始网关 RPC 名称，也不是原始代理工具 ID。

## 将 infer 变成一项技能

把这段复制并粘贴给一个 agent：

```text
阅读 https://docs.openclaw.ai/cli/infer，然后创建一项技能，将我的常见工作流路由到 `openclaw infer`。
重点关注模型运行、图像生成、视频生成、音频转录、TTS、网页搜索和嵌入。
```

一个好的基于 infer 的技能应该：

- 将常见用户意图映射到正确的 infer 子命令
- 为其覆盖的工作流包含一些标准的 infer 示例
- 在示例和建议中优先使用 `openclaw infer ...`
- 避免在技能正文中重新文档化整个 infer 表面

典型的 infer 聚焦技能覆盖范围：

- `openclaw infer model run`
- `openclaw infer image generate`
- `openclaw infer audio transcribe`
- `openclaw infer tts convert`
- `openclaw infer web search`
- `openclaw infer embedding create`

## 为什么使用 infer

`openclaw infer` 为 OpenClaw 内部提供了一套一致的 CLI，用于提供商支持的推理任务。

优点：

- 使用已在 OpenClaw 中配置好的提供商和模型，而不是为每个后端编写一次性的包装器。
- 将模型、图像、音频转录、TTS、视频、网页和嵌入工作流统一到一个命令树下。
- 为脚本、自动化和 agent 驱动的工作流使用稳定的 `--json` 输出结构。
- 当任务本质上是“运行推理”时，优先使用第一方 OpenClaw 表面。
- 对于大多数 infer 命令，使用正常的本地路径，而无需依赖 gateway。

对于端到端提供商检查，在底层提供商测试通过后，优先使用 `openclaw infer ...`。它会在发起提供商请求之前，先验证随附的 CLI、配置加载、默认 agent 解析、捆绑插件激活、运行时依赖修复以及共享能力运行时。

## 命令树

```text
 openclaw infer
  list
  inspect

  model
    run
    list
    inspect
    providers
    auth login
    auth logout
    auth status

  image
    generate
    edit
    describe
    describe-many
    providers

  audio
    transcribe
    providers

  tts
    convert
    voices
    providers
    status
    enable
    disable
    set-provider

  video
    generate
    describe
    providers

  web
    search
    fetch
    providers

  embedding
    create
    providers
```

## 常见任务

此表将常见推理任务映射到相应的 infer 命令。

| 任务                         | 命令                                                                                       | 备注                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 运行文本/模型提示词           | `openclaw infer model run --prompt "..." --json`                                              | 默认使用正常的本地路径                 |
| 在图像上运行模型提示词        | `openclaw infer model run --prompt "Describe this" --file ./image.png --model provider/model` | 对多个图像输入重复 `--file`             |
| 生成图像                     | `openclaw infer image generate --prompt "..." --json`                                         | 从已有文件开始时使用 `image edit`  |
| 描述图像文件                 | `openclaw infer image describe --file ./image.png --prompt "..." --json`                      | `--model` 必须是支持图像的 `<provider/model>` |
| 转录音频                     | `openclaw infer audio transcribe --file ./memo.m4a --json`                                    | `--model` 必须是 `<provider/model>`                  |
| 合成语音                     | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json`                        | `tts status` 是面向 gateway 的                      |
| 生成视频                     | `openclaw infer video generate --prompt "..." --json`                                         | 支持诸如 `--resolution` 的提供商提示        |
| 描述视频文件                 | `openclaw infer video describe --file ./clip.mp4 --json`                                      | `--model` 必须是 `<provider/model>`                  |
| 搜索网页                     | `openclaw infer web search --query "..." --json`                                              |                                                       |
| 获取网页                     | `openclaw infer web fetch --url https://example.com --json`                                   |                                                       |
| 创建嵌入                     | `openclaw infer embedding create --text "..." --json`                                         |                                                       |

## 行为

- `openclaw infer ...` 是这些工作流的主要 CLI 表面。
- 当输出将被另一个命令或脚本消费时，使用 `--json`。
- 当需要特定后端时，使用 `--provider` 或 `--model provider/model`。
- 对于 `image describe`、`audio transcribe` 和 `video describe`，`--model` 必须使用 `<provider/model>` 形式。
- 对于 `image describe`，显式的 `--model` 会直接运行该 provider/model。该模型必须在模型目录或提供商配置中支持图像。`codex/<model>` 会运行一次受限的 Codex app-server 图像理解轮次；`openai-codex/<model>` 使用 OpenAI Codex OAuth 提供商路径。
- 无状态执行命令默认使用 local。
- 由 gateway 管理状态的命令默认使用 gateway。
- 正常的本地路径不需要 gateway 正在运行。
- 本地 `model run` 是一种精简的一次性提供商补全。它会解析已配置的 agent 模型和认证，但不会启动 chat-agent 轮次、加载工具或打开捆绑的 MCP 服务器。
- `model run --file` 接受图像文件，检测其 MIME 类型，并将它们与提供的提示一起发送给所选模型。对多个图像重复 `--file`。
- `model run --file` 会拒绝非图像输入。音频文件请使用 `infer audio transcribe`，视频文件请使用 `infer video describe`。
- `model run --gateway` 会测试 Gateway 路由、已保存的认证、提供商选择以及嵌入式运行时，但仍然作为原始模型探测运行：它会发送提供的提示和任何图像附件，不会使用先前的会话转录、bootstrap/AGENTS 上下文、上下文引擎组装、工具或捆绑的 MCP 服务器。
- `model run --gateway --model <provider/model>` 需要受信任的操作员 gateway 凭证，因为该请求要求 Gateway 运行一次性的 provider/model 覆盖。

## 模型

将 `model` 用于提供商支持的文本推理以及模型/提供商检查。

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --model openai/gpt-5.4 --json
openclaw infer model run --prompt "Describe this image in one sentence" --file ./photo.jpg --model google/gemini-2.5-flash --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.5 --json
```

使用完整的 `<provider/model>` 引用来对特定提供商进行冒烟测试，而无需
启动 Gateway 或加载完整的 agent 工具表面：

```bash
openclaw infer model run --local --model anthropic/claude-sonnet-4-6 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model cerebras/zai-glm-4.7 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model google/gemini-2.5-flash --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model groq/llama-3.1-8b-instant --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-small-latest --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model openai/gpt-4.1 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model ollama/qwen2.5vl:7b --prompt "Describe this image." --file ./photo.jpg --json
```

备注：

- 本地 `model run` 是用于检查 provider/model/auth 健康状况的最窄 CLI 冒烟测试，因为它只会将提供的提示发送给所选模型。
- 本地 `model run --file` 保持这种精简路径，并将图像内容直接附加到单个用户消息上。常见的图像文件，如 PNG、JPEG 和 WebP，只要其 MIME 类型被检测为 `image/*` 就可工作；不受支持或无法识别的文件会在调用提供商之前失败。
- 当你想直接测试所选的多模态文本模型时，`model run --file` 是最佳选择。当你想使用 OpenClaw 的图像理解提供商选择和默认图像模型路由时，请使用 `infer image describe`。
- 所选模型必须支持图像输入；仅文本模型可能会在提供商层拒绝该请求。
- `model run --prompt` 必须包含非空白文本；空提示会在调用本地提供商或 Gateway 之前被拒绝。
- 当提供商没有返回任何文本输出时，本地 `model run` 会以非零状态退出，因此不可达的本地提供商和空补全不会看起来像成功探测。
- 当你需要测试 Gateway 路由、agent 运行时设置或 Gateway 管理的提供商状态，同时保持模型输入原始时，请使用 `model run --gateway`。当你想要完整的 agent 上下文、工具、记忆和会话转录时，请使用 `openclaw agent` 或聊天界面。
- `model auth login`、`model auth logout` 和 `model auth status` 管理已保存的提供商认证状态。

## 图像

将 `image` 用于生成、编辑和描述。

```bash
openclaw infer image generate --prompt "friendly lobster illustration" --json
openclaw infer image generate --prompt "cinematic product photo of headphones" --json
openclaw infer image generate --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "simple red circle sticker on a transparent background" --json
openclaw infer image generate --prompt "slow image backend" --timeout-ms 180000 --json
openclaw infer image edit --file ./logo.png --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "keep the logo, remove the background" --json
openclaw infer image edit --file ./poster.png --prompt "make this a vertical story ad" --size 2160x3840 --aspect-ratio 9:16 --resolution 4K --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file ./receipt.jpg --prompt "Extract the merchant, date, and total" --json
openclaw infer image describe-many --file ./before.png --file ./after.png --prompt "Compare the screenshots and list visible UI changes" --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --prompt "Describe the image in one sentence" --timeout-ms 300000 --json
```

备注：

- 从现有输入文件开始时，使用 `image edit`。
- 对支持参考图像编辑几何提示的提供商/模型，在 `image edit` 中使用 `--size`、`--aspect-ratio` 或 `--resolution`。
- 对于 `--model openai/gpt-image-1.5`，使用 `--output-format png --background transparent` 来输出透明背景的 OpenAI PNG；
  `--openai-background` 仍然可用，作为 OpenAI 特定别名。未声明背景支持的提供商会将该提示报告为被忽略的覆盖项。
- 使用 `image providers --json` 来验证哪些捆绑的图像提供商可发现、已配置、已选中，以及每个提供商暴露了哪些生成/编辑能力。
- 使用 `image generate --model <provider/model> --json` 作为图像生成变更的最窄在线 CLI 冒烟测试。示例：

  ```bash
  openclaw infer image providers --json
  openclaw infer image generate \
    --model google/gemini-3.1-flash-image-preview \
    --prompt "Minimal flat test image: one blue square on a white background, no text." \
    --output ./openclaw-infer-image-smoke.png \
    --json
  ```

  JSON 响应会报告 `ok`、`provider`、`model`、`attempts` 和写入的输出路径。当设置了 `--output` 时，最终扩展名可能遵循提供商返回的 MIME 类型。

- 对于 `image describe` 和 `image describe-many`，使用 `--prompt` 给视觉模型一个特定任务的指令，例如 OCR、比较、UI 检查或简洁说明。
- 对于较慢的本地视觉模型或冷启动的 Ollama，请使用 `--timeout-ms`。
- 对于 `image describe`，`--model` 必须是支持图像的 `<provider/model>`。
- 对于本地 Ollama 视觉模型，请先拉取模型，并将 `OLLAMA_API_KEY` 设为任意占位值，例如 `ollama-local`。参见 [Ollama](/providers/ollama#vision-and-image-description)。

## 音频

使用 `audio` 进行文件转录。

```bash
openclaw infer audio transcribe --file ./memo.m4a --json
openclaw infer audio transcribe --file ./team-sync.m4a --language en --prompt "Focus on names and action items" --json
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

注意：

- `audio transcribe` 用于文件转录，不用于实时会话管理。
- `--model` 必须是 `<provider/model>`。

## TTS

使用 `tts` 进行语音合成和 TTS 提供商状态管理。

```bash
openclaw infer tts convert --text "hello from openclaw" --output ./hello.mp3 --json
openclaw infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
openclaw infer tts providers --json
openclaw infer tts status --json
```

注意：

- `tts status` 默认使用 gateway，因为它反映的是由 gateway 管理的 TTS 状态。
- 使用 `tts providers`、`tts voices` 和 `tts set-provider` 来查看并配置 TTS 行为。

## 视频

使用 `video` 进行生成和描述。

```bash
openclaw infer video generate --prompt "cinematic sunset over the ocean" --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --resolution 768P --duration 6 --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
```

注意：

- `video generate` 接受 `--size`、`--aspect-ratio`、`--resolution`、`--duration`、`--audio`、`--watermark` 和 `--timeout-ms`，并将它们转发到视频生成运行时。
- `--model` 对于 `video describe` 必须是 `<provider/model>`。

## Web

使用 `web` 进行搜索和抓取工作流。

```bash
openclaw infer web search --query "OpenClaw docs" --json
openclaw infer web search --query "OpenClaw infer web providers" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer web providers --json
```

注意：

- 使用 `web providers` 来查看可用、已配置和已选定的提供商。

## Embedding

使用 `embedding` 进行向量创建和 embedding 提供商检查。

```bash
openclaw infer embedding create --text "friendly lobster" --json
openclaw infer embedding create --text "customer support ticket: delayed shipment" --model openai/text-embedding-3-large --json
openclaw infer embedding providers --json
```

## JSON 输出

Infer 命令会在一个共享信封结构下规范化 JSON 输出：

```json
{
  "ok": true,
  "capability": "image.generate",
  "transport": "local",
  "provider": "openai",
  "model": "gpt-image-2",
  "attempts": [],
  "outputs": []
}
```

顶层字段是稳定的：

- `ok`
- `capability`
- `transport`
- `provider`
- `model`
- `attempts`
- `outputs`
- `error`

对于生成媒体的命令，`outputs` 包含由 OpenClaw 写入的文件。请在自动化中使用
该数组中的 `path`、`mimeType`、`size` 以及任何媒体特定维度，
而不是解析人类可读的 stdout。

## 常见陷阱

```bash
# 错误
openclaw infer media image generate --prompt "friendly lobster"

# 正确
openclaw infer image generate --prompt "friendly lobster"
```

```bash
# 错误
openclaw infer audio transcribe --file ./memo.m4a --model whisper-1 --json

# 正确
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

## 注意

- `openclaw capability ...` 是 `openclaw infer ...` 的别名。

## 相关

- [CLI 参考](/cli)
- [模型](/concepts/models)
