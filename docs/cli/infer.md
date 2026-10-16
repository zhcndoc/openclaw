---
summary: "面向提供商支持的模型、图像、音频、TTS、视频、网页和嵌入工作流的优先推理 CLI"
read_when:
  - "添加或修改 `openclaw infer` 命令时"
  - "设计稳定的无头能力自动化时"
title: "推理 CLI"
---

`openclaw infer` 是用于提供商支持的推理的主要无头命令。它公开功能系列（`model`、`image`、`audio`、`tts`、`video`、`web`、`embedding`），而不是原始网关 RPC 名称或代理工具 ID。 `openclaw capability ...` 是同一命令树的别名。

优先使用它而不是一次性的提供商包装器，原因如下：

- 复用 OpenClaw 中已配置的提供商和模型。
- 为脚本和由代理驱动的自动化提供稳定的 `--json` 封装（参见 [JSON 输出](#json-output)）。
- 对于大多数子命令，会走正常的本地路径而不经过网关。
- 对于端到端提供商检查，它会在提供商请求发出之前，先验证随 CLI 一同发布的命令、配置加载、默认代理解析、内置插件激活以及共享的能力运行时。

## <a id="command-tree"></a> 命令树

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

`infer list` / `infer inspect --name <capability>` 将此树显示为数据（功能 ID、传输、描述）。

父命令和子命令有助于公开完整的推理命令树，而无需加载提供程序执行运行时。这些命令定义还提供推理 shell 完成元数据。

## <a id="common-tasks"></a> 常见任务

| 任务                          | 命令                                                                                       | 笔记                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 运行 text/model 提示符       | `openclaw infer model run --prompt "..." --json`                                              | 默认为本地                                      |
| 在图片上运行模型提示  | `openclaw infer model run --prompt "Describe this" --file ./image.png --model provider/model` | 传入多个图片时重复使用 `--file`                   |
| 生成图片             | `openclaw infer image generate --prompt "..." --json`                                         | 从已有文件开始时使用 `image edit`  |
| 描述图片文件或 URL | `openclaw infer image describe --file ./image.png --prompt "..." --json`                      | `--model` 必须是支持图片的 `<provider/model>` |
| 转写音频              | `openclaw infer audio transcribe --file ./memo.m4a --json`                                    | `--model` 必须是 `<provider/model>`                  |
| 合成语音             | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json`                        | `tts status` 仅通过网关运行            |
| 生成视频              | `openclaw infer video generate --prompt "..." --json`                                         | 支持诸如 `--resolution` 的提供方提示        |
| 描述视频文件         | `openclaw infer video describe --file ./clip.mp4 --json`                                      | `--model` 必须是 `<provider/model>`                  |
| 搜索网页                | `openclaw infer web search --query "..." --json`                                              |                                                       |
| 获取网页              | `openclaw infer web fetch --url https://example.com --json`                                   |                                                       |
| 创建嵌入向量             | `openclaw infer embedding create --text "..." --json`                                         |                                                       |

## <a id="behavior"></a> 行为

- 当输出将作为其他命令或脚本的输入时，使用 `--json`；否则使用文本输出。
- 使用 `--provider` 或 `--model provider/model` 固定指定的后端。
- `--limit`、`--count`、`--duration` 和 `--timeout-ms` 的显式空值或仅空白值是错误的。省略该标志以保留其默认行为。
- `image edit` 和 `image describe-many` 需要至少一个 `--file`； `embedding create` 需要至少一个 `--text`。对多个输入重复该标志。省略它是使用错误，而不是空的成功结果，并且不会发送推理请求。
- 使用 `model run --thinking <level>` 进行一次性 thinking/reasoning 覆盖：`off`、`minimal`、`low`、`medium`、`high`、`adaptive`、 `xhigh`，或`max`。
- 对于 `image describe`、`audio transcribe` 和 `video describe`，`--model` 必须使用 `<provider/model>` 格式。
- 对于 `image describe`，`--file` 接受本地路径和 HTTP（S） URL；远程 URL 通过正常的媒体获取 SSRF 策略。
- 无状态执行命令（`model run`、`image *`、`audio *`、`video *`、`web *`、`embedding *`）默认使用本地。由网关管理的状态命令（`tts status`）默认使用网关。
- 本地路径不要求网关正在运行。
- Provider 库存命令，其 `configured` 状态可以来自已保存的代理身份验证接受 `--agent <id>`。如果没有它，他们将使用 `agents.defaults.systemAgent.agentId` 或唯一配置的代理；没有系统所有者的显式多代理队列必须通过 `--agent`。提供商目录保持汇总状态； `--agent` 范围保存的身份验证和每个代理选择事实。网关拥有的 TTS 提供程序状态仍然是网关全局的，因此 `tts providers --gateway` 不接受 `--agent`。
- 解析代理拥有的模型或身份验证状态的命令（`model run`、`image generate`、`image edit`、`image describe`、`image describe-many`、`audio transcribe`、`video generate`、 `video describe`、`embedding create` 和 `model auth login/logout/status`） 也接受 `--agent <id>`。他们首先解析显式 ID，然后解析 `agents.defaults.systemAgent.agentId`，最后解析唯一配置的代理。
- 生成的图像和视频 `--output` 文件会暂存于目标位置旁边，只有在完整缓冲区写入后才会替换目标文件；写入失败会保留现有目标文件不变。
- 本地 `model run` 是一次精简的提供商补全操作：它解析已配置的代理模型和身份验证，但不会启动聊天代理回合、加载工具或打开捆绑的 MCP 服务器。
- 仅当显式模型覆盖包含大写字符时，Model 才会运行加载目录以进行大小写更正。使用配置的默认值或小写模型引用运行，跳过该目录查找。
- `model run --file` 会将图像文件（自动检测 MIME 类型）附加到提示中；重复使用 `--file` 可添加多个图像。不接受非图像文件——请改用 `infer audio transcribe` 或 `infer video describe`。
- `model run --gateway` 执行网关路由、保存的身份验证、提供程序选择和嵌入式运行时，但保留原始模型检查：没有先前的会话记录、bootstrap/AGENTS 上下文、工具或捆绑的 MCP 服务器。
- `model run --gateway --model <provider/model>` 需要可信运营商网关凭证，因为它要求网关运行一次性 provider/model 覆盖。

## <a id="model"></a> 模型

文本推理和 model/provider 检查。

`model list`、`model inspect` 和 `model providers` 读取所选代理的模型目录。它们保留配置的模型详细信息并排除该目录之外的模型。使用`infer model --agent <id> list --json`或`infer model --agent <id> inspect --model <provider/model> --json`选择代理。供应商数量使用相同的库存。

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --model openai/gpt-5.4 --json
openclaw infer model run --prompt "Describe this image in one sentence" --file ./photo.jpg --model google/gemini-2.5-flash --json
openclaw infer model run --prompt "Use more reasoning here" --thinking high --json
openclaw infer model providers --agent <id> --json
openclaw infer model inspect --model gpt-6-astra --json
```

使用完整的 `<provider/model>` 参考和 `--local` 对一个提供商进行冒烟测试，而无需启动网关或加载代理工具界面：

```bash
openclaw infer model run --local --model anthropic/claude-sonnet-4-6 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model cerebras/gpt-oss-120b --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model google/gemini-2.5-flash --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model groq/openai/gpt-oss-120b --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model llmman/qwen3.8 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model llmman/gemma4:e4b --prompt "Describe this image." --file ./photo.jpg --json
openclaw infer model run --local --model mistral/mistral-medium-3-5 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-small-latest --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model openai/gpt-5.6-luna --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model ollama/qwen2.5vl:7b --prompt "Describe this image." --file ./photo.jpg --json
```

注意：

- Local `model run` 是 provider/model/auth 运行状况的最窄 CLI 烟雾：对于非 ChatGPT-Codex 提供商，它仅发送提供的提示。
- Local `model run --model <provider/model>` 可以在将该提供程序写入配置之前解析精确的捆绑静态目录行（与 [`openclaw models list --all`](/cli/models) 显示的相同行）。仍然需要提供者身份验证；缺少凭据会因身份验证错误而失败，而不是 `Unknown model`。
- 对于Mistral中3.5推理检查，离开温度unset/default. Mistral拒绝`reasoning_effort="high"`与`temperature: 0`；使用默认温度或非零值，例如 `0.7`。
- OpenAI ChatGPT/Codex OAuth （`openai-chatgpt-responses` API） 本地检查添加最小系统指令，以便传输可以填充其所需的 `instructions` 字段 — 无需完整的代理上下文、工具、内存或会话记录。
- `model run --file` 将图像内容直接附加到单个用户消息中。当 MIME 类型检测为 `image/*` 时，常见格式（PNG、JPEG、WebP）有效；不支持或无法识别的文件在调用提供程序之前会失败。当您需要 OpenClaw 的图像模型路由和回退而不是直接的多模式模型检查时，请使用 `infer image describe`。
- 所选模型必须支持图像输入；纯文本模型可能会在提供方层拒绝该请求。
- `model run --prompt` 必须包含非空白文本；空提示词会在任何提供方或 Gateway 调用之前被拒绝。
- 对于空输出或 failed/aborted 响应，Local `model run` 退出非零，即使收到部分文本也是如此。这些运行不会发出成功的 JSON 包络。
- 当网关报告失败、超时或取消运行时，`model run --gateway` 也会以非零值退出，保留其错误详细信息，而不是将回复包装在成功的 JSON 信封中。
- 当完成的响应仅包含推理而没有最终文本时，本地 `model run` 报告它返回推理但没有文本输出，并在其停止于输出令牌限制时进行注释。失败或中止的响应会保留通用无文本错误以及任何提供程序错误详细信息。推理内容不作为答案打印。
- 使用 `model run --gateway` 测试网关路由或代理运行时设置，同时保持模型输入原始。使用 [`openclaw agent`](/cli/agent) 或聊天界面获取完整的座席上下文、工具、内存和会话记录。
- `--thinking adaptive` 映射到 completion-runtime 级别的 `medium`；`--thinking max` 映射到支持原生 max effort 的 OpenAI 模型的 `max`，否则映射到 `xhigh`。
- `model auth login`、`model auth logout` 和 `model auth status` 用于管理已保存的提供方认证状态。

## <a id="image"></a> 图像

生成、编辑和描述。

```bash
openclaw infer image generate --prompt "friendly lobster illustration" --json
openclaw infer image generate --prompt "cinematic product photo of headphones" --json
openclaw infer image generate --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "simple red circle sticker on a transparent background" --json
openclaw infer image generate --model openai/gpt-image-2 --quality low --openai-moderation low --prompt "low-cost draft poster" --json
openclaw infer image generate --prompt "slow image backend" --timeout-ms 180000 --json
openclaw infer image edit --file ./logo.png --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "keep the logo, remove the background" --json
openclaw infer image edit --file ./poster.png --prompt "make this a vertical story ad" --size 2160x3840 --aspect-ratio 9:16 --resolution 4K --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file https://example.com/photo.png --json
openclaw infer image describe --file ./receipt.jpg --prompt "Extract the merchant, date, and total" --json
openclaw infer image describe-many --file ./before.png --file ./after.png --prompt "Compare the screenshots and list visible UI changes" --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-5.4-mini --json
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --prompt "Describe the image in one sentence" --timeout-ms 300000 --json
```

注意：

- 从现有输入文件启动时使用 `image edit`； `--size`、`--aspect-ratio` 或 `--resolution` 在支持它们的 providers/models 上添加几何提示。
- `--output-format png --background transparent` 与 `--model openai/gpt-image-1.5` 提供透明背景 OpenAI PNG 输出； `--openai-background` 是同一提示的 OpenAI- 特定别名。未声明后台支持的提供程序将其报告为忽略覆盖（请参阅 [JSON 信封 ](#json-output) 中的 `ignoredOverrides`）。
- `--quality low|medium|high|auto` 适用于支持图像质量提示的提供方，包括 OpenAI。OpenAI 还接受 `--openai-moderation low|auto`。
- `image providers --json` 列出了哪些捆绑图像提供程序是可发现、配置、选择的，以及每个提供程序公开哪些 generation/edit 功能。
- `image generate --model <provider/model> --json` 是图像生成变更最窄范围的在线冒烟测试：

  ```bash
  openclaw infer image providers --json
  openclaw infer image generate \
    --model google/gemini-3.1-flash-image \
    --prompt "Minimal flat test image: one blue square on a white background, no text." \
    --output ./openclaw-infer-image-smoke.png \
    --json
  ```

  响应会报告 `ok`、`provider`、`model`、`attempts` 和写入的输出路径。当设置了 `--output` 时，最终扩展名可能会遵循提供方返回的 MIME 类型。

- 对于 `image describe` 和 `image describe-many`，使用 `--prompt` 来提供任务特定指令（OCR、对比、UI 检查、简洁描述）。
- 对于较慢的本地视觉模型或冷启动的 Ollama，请使用 `--timeout-ms`。
- 对于 `image describe`，显式指定的 `--model`（必须是具备图像能力的 `<provider/model>`）会先运行，然后在该调用失败时尝试配置中的 `agents.defaults.imageModel.fallbacks`。输入准备错误（缺少文件、不支持的 URL）会在任何回退尝试之前失败，并且该模型必须在模型目录或提供方配置中具备图像能力。
- 对于本地 Ollama 视觉模型，请先拉取模型，并将 `OLLAMA_API_KEY` 设置为任意占位值，例如 `ollama-local`。参见 [Ollama](/providers/ollama#vision-and-image-description)。
- 对于 llmman 视觉模型（例如 `llmman/gemma4:e4b`），请在模型条目上使用 `input: ["text", "image"]` 配置 `llmman` 提供程序，并将 `LLMMAN_API_KEY` 设置为占位符（例如 `llmman-local`）。参见 [llmman](/providers/llmman#vision-and-image-description)。

## <a id="audio"></a> 音频

文件转录（不是实时会话管理）。

```bash
openclaw infer audio transcribe --file ./memo.m4a --json
openclaw infer audio transcribe --agent <id> --file ./memo.m4a --json
openclaw infer audio transcribe --file ./team-sync.m4a --language en --prompt "Focus on names and action items" --json
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

`--model` 必须是 `<provider/model>`。

对于 CLI- 支持的转录，结果的 `provider` 标识工具系列，`model` 报告执行的命令。自动检测工具报告其解析的可执行路径；显式 CLI 条目保留其编写的命令值。该字段不识别工具内部加载的语音模型。

## TTS

语音合成和TTS provider/persona状态。

```bash
openclaw infer tts convert --text "hello from openclaw" --output ./hello.mp3 --json
openclaw infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
openclaw infer tts convert --provider xiaomi --text "Provider-only selection" --output ./xiaomi.mp3 --json
openclaw infer tts providers --json
openclaw infer tts personas --json
openclaw infer tts status --json
```

注意：

- `tts status` 仅支持 `--gateway`（它反映由网关管理的 TTS 状态）。
- 本地和回环网关的 `tts convert --output` 会在目标文件旁执行复制阶段，并且仅在成功后替换目标文件；复制失败会保留现有文件不变。
- 远程网关 `tts convert --output` 在请求语音合成之前被拒绝。
- 在选择提供方但不覆盖其模型时，请使用 `tts convert --provider <id>`。
- 使用 `tts providers`、`tts voices`、`tts personas`、`tts set-provider` 和 `tts set-persona` 来检查和配置 TTS 行为。

## <a id="video"></a> 视频

生成和描述。

```bash
openclaw infer video generate --prompt "cinematic sunset over the ocean" --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --resolution 768P --duration 6 --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --agent <id> --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-5.4-mini --json
```

注意：

- `video generate` 接受 `--size`、`--aspect-ratio`、`--resolution`、`--duration`、`--audio`、`--watermark` 和 `--timeout-ms`，并将其转发给视频生成运行时。
- `--duration` 是必须舍入为 1–9007199254740991 秒的秒数。零、负、非数字和四舍五入到零的较小值在提供程序分派之前失败。有效分数（例如 `2.5`）保留正常的提供商支持的舍入；省略该标志将使提供者保持默认状态。
- Provider 托管的视频下载会拒绝空响应、文本响应和 JSON 响应，而不是将不可用的文件报告为成功输出。
- 与`--output`一起，URL-将视频流备份到同级临时文件，并仅在完整非空下载成功后才替换目标；失败的流会使现有目标保持不变。
- 对于 `video describe`，`--model` 必须是 `<provider/model>`。

## <a id="web"></a> 网页

搜索并获取。

```bash
openclaw infer web search --query "OpenClaw docs" --json
openclaw infer web search --query "OpenClaw infer web providers" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer web providers --agent <id> --json
```

`web providers` 列出用于搜索和获取的可用、已配置和已选定提供商。

## <a id="embedding"></a> 嵌入

向量创建和嵌入提供方检查。

```bash
openclaw infer embedding create --text "friendly lobster" --json
openclaw infer embedding create --text "customer support ticket: delayed shipment" --model openai/text-embedding-3-large --json
openclaw infer embedding providers --agent <id> --json
```

如果没有 `--json`，`embedding create` 将显示提供程序和模型，然后是每个输入、其维度计数以及前八个向量值的预览。较长的向量以 `...` 结尾；使用 `--json` 检索完整的向量。

## <a id="json-output"></a> JSON 输出

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

## <a id="common-pitfalls"></a> 常见陷阱

```bash
# Bad
openclaw infer media image generate --prompt "friendly lobster"

# Good
openclaw infer image generate --prompt "friendly lobster"
```

```bash
# Bad
openclaw infer audio transcribe --file ./memo.m4a --model whisper-1 --json

# Good
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

## <a id="turn-infer-into-a-skill"></a> 将 infer 变成一项技能

把这段复制并粘贴给一个代理：

```text
Read https://docs.openclaw.ai/cli/infer, then create a skill that routes my common workflows to `openclaw infer`.
Focus on model runs, image generation, video generation, audio transcription, TTS, web search, and embeddings.
```

良好的基于​​推理的技能将常见的用户意图映射到正确的子命令，每个工作流程包括一些标准示例，相对于较低级别的替代方案更喜欢 `openclaw infer ...`，并且不会在技能正文中重新记录整个推理表面。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [模型](/concepts/models)
