---
summary: "面向提供商支持的模型、图像、音频、TTS、视频、网页和嵌入工作流的优先推理 CLI"
read_when:
  - 添加或修改 `openclaw infer` 命令时
  - 设计稳定的无头能力自动化时
title: "推理 CLI"
---

`openclaw infer` 是面向提供商支持的推理的标准无头接口。它公开的是能力家族（`model`、`image`、`audio`、`tts`、`video`、`web`、`embedding`），而不是原始网关 RPC 名称或代理工具 id。`openclaw capability ...` 是同一命令树的别名。

优先使用它而不是一次性的提供商包装器，原因如下：

- 复用 OpenClaw 中已配置的提供商和模型。
- 为脚本和由代理驱动的自动化提供稳定的 `--json` 封装（参见 [JSON 输出](#json-output)）。
- 对于大多数子命令，会走正常的本地路径而不经过网关。
- 对于端到端提供商检查，它会在提供商请求发出之前，先验证随 CLI 一同发布的命令、配置加载、默认代理解析、内置插件激活以及共享的能力运行时。

## 将 infer 变成一项技能

把这段复制并粘贴给一个 agent：

```text
阅读 https://docs.openclaw.ai/cli/infer，然后创建一项技能，将我的常见工作流路由到 `openclaw infer`。
重点关注模型运行、图像生成、视频生成、音频转录、TTS、网页搜索和嵌入。
```

一个好的基于 infer 的技能会将常见用户意图映射到正确的子命令，为每个工作流包含几个典型示例，优先使用 `openclaw infer ...` 而不是更底层的替代方案，并且不会在技能正文中重新记录整个 infer 接口。

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
    personas
    status
    enable
    disable
    set-provider
    set-persona

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

`infer list` / `infer inspect --name <capability>` 会将此树作为数据展示（能力 ID、传输方式、描述）。

## 常见任务

| 任务                          | 命令                                                                                       | 备注                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 运行文本/模型提示             | `openclaw infer model run --prompt "..." --json`                                              | 默认使用本地                                       |
| 在图片上运行模型提示         | `openclaw infer model run --prompt "Describe this" --file ./image.png --model provider/model` | 传入多个图片时重复使用 `--file`                     |
| 生成图片                     | `openclaw infer image generate --prompt "..." --json`                                         | 从已有文件开始时使用 `image edit`                  |
| 描述图片文件或 URL           | `openclaw infer image describe --file ./image.png --prompt "..." --json`                      | `--model` 必须是支持图片的 `<provider/model>`       |
| 转写音频                     | `openclaw infer audio transcribe --file ./memo.m4a --json`                                    | `--model` 必须是 `<provider/model>`                  |
| 合成语音                     | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json`                        | `tts status` 仅通过网关运行                         |
| 生成视频                     | `openclaw infer video generate --prompt "..." --json`                                         | 支持诸如 `--resolution` 的提供方提示                |
| 描述视频文件                 | `openclaw infer video describe --file ./clip.mp4 --json`                                      | `--model` 必须是 `<provider/model>`                  |
| 搜索网页                     | `openclaw infer web search --query "..." --json`                                              |                                                       |
| 获取网页                     | `openclaw infer web fetch --url https://example.com --json`                                   |                                                       |
| 创建嵌入向量                 | `openclaw infer embedding create --text "..." --json`                                         |                                                       |

## 行为

- 当输出会被另一个命令或脚本接收时，使用 `--json`；否则使用文本输出。
- 使用 `--provider` 或 `--model provider/model` 来固定特定后端。
- 使用 `model run --thinking <level>` 进行一次性思考/推理覆盖：`off`、`minimal`、`low`、`medium`、`high`、`adaptive`、`xhigh` 或 `max`。
- 对于 `image describe`、`audio transcribe` 和 `video describe`，`--model` 必须使用 `<provider/model>` 形式。
- 对于 `image describe`，`--file` 接受本地路径和 HTTP(S) URL；远程 URL 会经过正常的媒体获取 SSRF 策略。
- 无状态执行命令（`model run`、`image *`、`audio *`、`video *`、`web *`、`embedding *`）默认使用本地。由 Gateway 管理状态的命令（`tts status`）默认使用 Gateway。
- 本地路径从不需要 Gateway 正在运行。
- 本地 `model run` 是一种轻量的一次性提供方完成：它会解析已配置的 agent 模型和认证，但不会启动 chat-agent 回合、加载工具或打开捆绑的 MCP 服务器。
- `model run --file` 会将图像文件（自动检测 MIME 类型）附加到提示中；如需多个图像，请重复使用 `--file`。非图像文件会被拒绝——请改用 `infer audio transcribe` 或 `infer video describe`。
- `model run --gateway` 会使用 Gateway 路由、已保存的认证、提供方选择以及嵌入式运行时，但仍然是原始模型探测：没有先前的会话转录、bootstrap/AGENTS 上下文、工具或捆绑的 MCP 服务器。
- `model run --gateway --model <provider/model>` 需要受信任操作员的 Gateway 凭证，因为它要求 Gateway 运行一次性的 provider/model 覆盖。

## 模型

文本推理以及模型/提供方检查。

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --model openai/gpt-5.4 --json
openclaw infer model run --prompt "Describe this image in one sentence" --file ./photo.jpg --model google/gemini-2.5-flash --json
openclaw infer model run --prompt "Use more reasoning here" --thinking high --json
openclaw infer model providers --json
openclaw infer model inspect --model gpt-5.6-sol --json
```

使用带有 `--local` 的完整 `<provider/model>` 引用，可以在不启动 Gateway 或加载 agent 工具表面的情况下，对单个提供方进行冒烟测试：

```bash
openclaw infer model run --local --model anthropic/claude-sonnet-4-6 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model cerebras/zai-glm-4.7 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model google/gemini-2.5-flash --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model groq/llama-3.1-8b-instant --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-medium-3-5 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-small-latest --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model openai/gpt-5.6-luna --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model ollama/qwen2.5vl:7b --prompt "Describe this image." --file ./photo.jpg --json
```

备注：

- 本地 `model run` 是用于检查提供方/模型/认证健康状态的最窄 CLI 冒烟测试：对于非 ChatGPT-Codex 提供方，它只发送所提供的提示词。
- 本地 `model run --model <provider/model>` 可以在该提供方写入配置之前，解析精确的内置静态目录行（也就是 `openclaw models list --all` 显示的那些行）。仍然需要提供方认证；缺少凭据会以认证错误失败，而不是 `Unknown model`。
- 对于 Mistral Medium 3.5 的推理探测，请保持 temperature 未设置/使用默认值。Mistral 会在 `temperature: 0` 时拒绝 `reasoning_effort="high"`；请使用默认温度或非零值，例如 `0.7`。
- OpenAI ChatGPT/Codex OAuth（`openai-chatgpt-responses` API）本地探测会添加一个最小系统指令，以便传输层可以填充其必需的 `instructions` 字段——不会包含完整的 agent 上下文、工具、记忆或会话转录。
- `model run --file` 会将图片内容直接附加到单条用户消息上。检测到 MIME 类型为 `image/*` 时，常见格式（PNG、JPEG、WebP）可用；不受支持或无法识别的文件会在调用提供方之前失败。当你想要 OpenClaw 的图像模型路由和回退，而不是直接的多模态模型探测时，请改用 `infer image describe`。
- 所选模型必须支持图像输入；纯文本模型可能会在提供方层拒绝该请求。
- `model run --prompt` 必须包含非空白文本；空提示词会在任何提供方或 Gateway 调用之前被拒绝。
- 当提供方没有返回任何文本输出时，本地 `model run` 会以非零退出，因此不可达的提供方和空完成不会看起来像成功的探测。
- 使用 `model run --gateway` 来测试 Gateway 路由或 agent 运行时设置，同时保持模型输入原始。使用 `openclaw agent` 或聊天界面来获得完整的 agent 上下文、工具、记忆和会话转录。
- `--thinking adaptive` 映射到 completion-runtime 级别的 `medium`；`--thinking max` 映射到支持原生 max effort 的 OpenAI 模型的 `max`，否则映射到 `xhigh`。
- `model auth login`、`model auth logout` 和 `model auth status` 用于管理已保存的提供方认证状态。

## 图像

生成、编辑和描述。

```bash
openclaw infer image generate --prompt "友好的龙虾插画" --json
openclaw infer image generate --prompt "耳机的电影感产品照片" --json
openclaw infer image generate --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "透明背景上的简单红色圆形贴纸" --json
openclaw infer image generate --model openai/gpt-image-2 --quality low --openai-moderation low --prompt "低成本草稿海报" --json
openclaw infer image generate --prompt "缓慢的图像后端" --timeout-ms 180000 --json
openclaw infer image edit --file ./logo.png --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "保留标志，移除背景" --json
openclaw infer image edit --file ./poster.png --prompt "把这张图做成竖版故事广告" --size 2160x3840 --aspect-ratio 9:16 --resolution 4K --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file https://example.com/photo.png --json
openclaw infer image describe --file ./receipt.jpg --prompt "提取商家、日期和总额" --json
openclaw infer image describe-many --file ./before.png --file ./after.png --prompt "比较这些截图并列出可见的 UI 变更" --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-5.4-mini --json
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --prompt "用一句话描述这张图像" --timeout-ms 300000 --json
```

备注：

- 当从现有输入文件开始时，使用 `image edit`；`--size`、`--aspect-ratio` 或 `--resolution` 会为支持这些参数的提供方/模型增加几何提示。
- 与 `--model openai/gpt-image-1.5` 一起使用 `--output-format png --background transparent` 可得到 OpenAI 的透明背景 PNG 输出；`--openai-background` 是相同提示的 OpenAI 专用别名。不声明背景支持的提供方会将其报告为被忽略的覆盖项（参见 [JSON 封装](#json-output) 中的 `ignoredOverrides`）。
- `--quality low|medium|high|auto` 适用于支持图像质量提示的提供方，包括 OpenAI。OpenAI 还接受 `--openai-moderation low|auto`。
- `image providers --json` 会列出哪些内置图像提供方是可发现的、已配置的、已选中的，以及每个提供方暴露了哪些生成/编辑能力。
- `image generate --model <provider/model> --json` 是图像生成变更最窄范围的在线冒烟测试：

  ```bash
  openclaw infer image providers --json
  openclaw infer image generate \
    --model google/gemini-3.1-flash-image-preview \
    --prompt "最小化的扁平测试图像：白色背景上的一个蓝色方块，不要文字。" \
    --output ./openclaw-infer-image-smoke.png \
    --json
  ```

  响应会报告 `ok`、`provider`、`model`、`attempts` 和写入的输出路径。当设置了 `--output` 时，最终扩展名可能会遵循提供方返回的 MIME 类型。

- 对于 `image describe` 和 `image describe-many`，使用 `--prompt` 来提供任务特定指令（OCR、对比、UI 检查、简洁描述）。
- 对于较慢的本地视觉模型或冷启动的 Ollama，请使用 `--timeout-ms`。
- 对于 `image describe`，显式指定的 `--model`（必须是具备图像能力的 `<provider/model>`）会先运行，然后在该调用失败时尝试配置中的 `agents.defaults.imageModel.fallbacks`。输入准备错误（缺少文件、不支持的 URL）会在任何回退尝试之前失败，并且该模型必须在模型目录或提供方配置中具备图像能力。
- 对于本地 Ollama 视觉模型，请先拉取模型，并将 `OLLAMA_API_KEY` 设置为任意占位值，例如 `ollama-local`。参见 [Ollama](/providers/ollama#vision-and-image-description)。

## 音频

文件转录（不是实时会话管理）。

```bash
openclaw infer audio transcribe --file ./memo.m4a --json
openclaw infer audio transcribe --file ./team-sync.m4a --language en --prompt "专注于人名和行动项" --json
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

`--model` 必须是 `<provider/model>`。

## TTS

语音合成和 TTS 提供方/角色状态。

```bash
openclaw infer tts convert --text "hello from openclaw" --output ./hello.mp3 --json
openclaw infer tts convert --text "你的构建已完成" --output ./build-complete.mp3 --json
openclaw infer tts providers --json
openclaw infer tts personas --json
openclaw infer tts status --json
```

注意：

- `tts status` 仅支持 `--gateway`（它反映由网关管理的 TTS 状态）。
- 使用 `tts providers`、`tts voices`、`tts personas`、`tts set-provider` 和 `tts set-persona` 来查看和配置 TTS 行为。

## 视频

生成和描述。

```bash
openclaw infer video generate --prompt "海洋上空的电影感日落" --json
openclaw infer video generate --prompt "掠过森林湖泊的缓慢无人机镜头" --resolution 768P --duration 6 --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-5.4-mini --json
```

注意：

- `video generate` 接受 `--size`、`--aspect-ratio`、`--resolution`、`--duration`、`--audio`、`--watermark` 和 `--timeout-ms`，这些参数会转发给视频生成运行时。
- `video describe` 的 `--model` 必须是 `<provider/model>` 格式。

## Web

搜索并获取。

```bash
openclaw infer web search --query "OpenClaw 文档" --json
openclaw infer web search --query "OpenClaw infer web providers" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer web providers --json
```

`web providers` 列出用于搜索和获取的可用、已配置和已选定提供商。

## 嵌入

向量创建和嵌入提供方检查。

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

稳定的顶层字段：

- `ok`
- `capability`
- `transport`
- `provider`
- `model`
- `attempts`
- `inputs`（在适用时，随请求发送的图像附件）
- `outputs`
- `ignoredOverrides`（在适用时，提供方不支持的提示键）
- `error`

对于生成媒体的命令，`outputs` 包含由 OpenClaw 写入的文件。请改为使用该数组中的 `path`、`mimeType`、`size` 以及任何媒体特定的尺寸信息进行自动化处理，而不是解析人类可读的标准输出。

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

## 相关

- [CLI 参考](/cli)
- [模型](/concepts/models)
