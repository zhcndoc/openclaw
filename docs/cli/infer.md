---
summary: "面向提供者支持的模型、图像、音频、TTS、视频、网页和嵌入工作流的优先推理CLI"
read_when:
  - 添加或修改 `openclaw infer` 命令
  - 设计稳定的无头功能自动化
title: "推理 CLI"
---

`openclaw infer` 是提供者支持的推理工作流的规范无头接口。

它有意暴露功能系列，而不是原始的网关 RPC 名称和原始的代理工具 ID。

## 将推理转化为技能

复制并粘贴以下内容到代理中：

```text
阅读 https://docs.openclaw.ai/cli/infer，然后创建一个将我的常用工作流程路由到 `openclaw infer` 的技能。
重点关注模型运行、图像生成、视频生成、音频转录、TTS、网页搜索和嵌入。
```

一个好的基于推理的技能应该：

- 将常见的用户意图映射到正确的推理子命令
- 包含几个它所覆盖工作流的规范推理示例
- 在示例和建议中优先使用 `openclaw infer ...`
- 避免在技能主体内重新记录整个推理界面

典型的专注于推理的技能覆盖范围：

- `openclaw infer model run`
- `openclaw infer image generate`
- `openclaw infer audio transcribe`
- `openclaw infer tts convert`
- `openclaw infer web search`
- `openclaw infer embedding create`

## 为什么使用推理

`openclaw infer` 为 OpenClaw 内部的提供者支持的推理任务提供了一个一致的 CLI。

优点：

- 使用已在 OpenClaw 中配置的提供者和模型，而不是为每个后端设置一次性包装器。
- 将模型、图像、音频转录、TTS、视频、网页和嵌入工作流程统一在一个命令树下。
- 为脚本、自动化和代理驱动的工作流程使用稳定的 `--json` 输出格式。
- 当任务本质上是"运行推理"时，优先使用第一方 OpenClaw 界面。
- 对于大多数推理命令，使用常规本地路径而不需要网关。

对于端到端的提供者检查，在较低级别的提供者测试通过后，优先使用 `openclaw infer ...`。它在发出提供者请求之前，会对已发布的 CLI、配置加载、默认代理解析、捆绑插件激活、运行时依赖修复以及共享能力运行时进行验证。

## Command tree

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

此表将常见的推理任务映射到相应的推理命令。

| Task                    | Command                                                                | Notes                                                 |
| ----------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| 运行文本/模型提示词      | `openclaw infer model run --prompt "..." --json`                       | 默认使用常规本地路径                                 |
| 生成图像               | `openclaw infer image generate --prompt "..." --json`                  | 从现有文件开始时使用 `image edit`                    |
| 描述图像文件           | `openclaw infer image describe --file ./image.png --json`              | `--model` 必须是支持图像的 `<provider/model>`         |
| 转录音频               | `openclaw infer audio transcribe --file ./memo.m4a --json`             | `--model` 必须是 `<provider/model>`                  |
| 合成语音               | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json` | `tts status` 以网关为导向                            |
| 生成视频               | `openclaw infer video generate --prompt "..." --json`                  |                                                       |
| 描述视频文件           | `openclaw infer video describe --file ./clip.mp4 --json`               | `--model` 必须是 `<provider/model>`                  |
| 搜索网页               | `openclaw infer web search --query "..." --json`                       |                                                       |
| 获取网页               | `openclaw infer web fetch --url https://example.com --json`            |                                                       |
| 创建嵌入               | `openclaw infer embedding create --text "..." --json`                  |                                                       |

## 行为

- `openclaw infer ...` 是这些工作流的主要 CLI 接口。
- 当输出将被另一个命令或脚本消费时，使用 `--json`。
- 当需要特定后端时，使用 `--provider` 或 `--model provider/model`。
- 对于 `image describe`、`audio transcribe` 和 `video describe`，`--model` 必须使用 `<provider/model>` 形式。
- 对于 `image describe`，显式指定 `--model` 会直接运行该 provider/model。该模型必须在模型目录或提供者配置中具备图像能力。`codex/<model>` 会运行一次受限的 Codex app-server 图像理解回合；`openai-codex/<model>` 则使用 OpenAI Codex OAuth 提供者路径。
- 无状态执行命令默认使用本地。
- 由网关管理状态的命令默认使用网关。
- 正常的本地路径不需要网关正在运行。

## 模型

使用 `model` 进行提供者支持的文本推理和模型/提供者检查。

```bash
openclaw infer model run --prompt "精确回复：smoke-ok" --json
openclaw infer model run --prompt "总结此变更日志条目" --provider openai --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.5 --json
```

说明：

- `model run` 重用代理运行时，因此提供者/模型覆盖的行为类似于正常代理执行。
- `model auth login`、`model auth logout` 和 `model auth status` 管理保存的提供者认证状态。

## 图像

使用 `image` 进行生成、编辑和描述。

```bash
openclaw infer image generate --prompt "友好的龙虾插图" --json
openclaw infer image generate --prompt "耳机的电影级产品照片" --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --json
```

说明：

- 当从现有输入文件开始时，使用 `image edit`。
- 使用 `image providers --json` 来验证哪些捆绑的图像提供者是可发现、已配置、已选择的，以及每个提供者暴露了哪些生成/编辑能力。
- 使用 `image generate --model <provider/model> --json` 作为图像生成变更最窄范围的在线 CLI 冒烟测试。示例：

  ```bash
  openclaw infer image providers --json
  openclaw infer image generate \
    --model google/gemini-3.1-flash-image-preview \
    --prompt "Minimal flat test image: one blue square on a white background, no text." \
    --output ./openclaw-infer-image-smoke.png \
    --json
  ```

  JSON 响应会报告 `ok`、`provider`、`model`、`attempts` 和写入的输出路径。当设置了 `--output` 时，最终扩展名可能会遵循提供者返回的 MIME 类型。

- 对于 `image describe`，`--model` 必须是支持图像的 `<provider/model>`。
- 对于本地 Ollama 视觉模型，请先拉取模型，并将 `OLLAMA_API_KEY` 设为任意占位值，例如 `ollama-local`。参见 [Ollama](/providers/ollama#vision-and-image-description)。

## 音频

使用 `audio` 进行文件转录。

```bash
openclaw infer audio transcribe --file ./memo.m4a --json
openclaw infer audio transcribe --file ./team-sync.m4a --language en --prompt "专注于姓名和行动项" --json
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

说明：

- `audio transcribe` 用于文件转录，而不是实时会话管理。
- `--model` 必须是 `<provider/model>`。

## TTS

使用 `tts` 进行语音合成和 TTS 提供者状态管理。

```bash
openclaw infer tts convert --text "来自 openclaw 的问候" --output ./hello.mp3 --json
openclaw infer tts convert --text "您的构建已完成" --output ./build-complete.mp3 --json
openclaw infer tts providers --json
openclaw infer tts status --json
```

说明：

- `tts status` 默认为网关，因为它反映网关管理的 TTS 状态。
- 使用 `tts providers`、`tts voices` 和 `tts set-provider` 来检查和配置 TTS 行为。

## 视频

使用 `video` 进行生成和描述。

```bash
openclaw infer video generate --prompt "海洋上的电影级日落" --json
openclaw infer video generate --prompt "森林湖泊上方的慢速无人机镜头" --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
```

说明：

- 对于 `video describe`，`--model` 必须是 `<provider/model>`。

## 网页

使用 `web` 进行搜索和获取工作流。

```bash
openclaw infer web search --query "OpenClaw 文档" --json
openclaw infer web search --query "OpenClaw 推理网页提供者" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer web providers --json
```

说明：

- 使用 `web providers` 来检查可用、已配置和已选择的提供者。

## 嵌入

使用 `embedding` 进行向量创建和嵌入提供者检查。

```bash
openclaw infer embedding create --text "友好的龙虾" --json
openclaw infer embedding create --text "客户支持工单：延迟发货" --model openai/text-embedding-3-large --json
openclaw infer embedding providers --json
```

## JSON 输出

推理命令在共享信封下标准化 JSON 输出：

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

顶级字段是稳定的：

- `ok`
- `capability`
- `transport`
- `provider`
- `model`
- `attempts`
- `outputs`
- `error`

对于生成媒体命令，`outputs` 包含由 OpenClaw 写入的文件。请在自动化中使用该数组中的 `path`、`mimeType`、`size` 以及任何与媒体相关的尺寸信息，而不是解析人类可读的标准输出。

## 常见陷阱

```bash
# 错误
openclaw infer media image generate --prompt "友好的龙虾"

# 正确
openclaw infer image generate --prompt "友好的龙虾"
```

```bash
# 错误
openclaw infer audio transcribe --file ./memo.m4a --model whisper-1 --json

# 正确
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

## 说明

- `openclaw capability ...` 是 `openclaw infer ...` 的别名。

## 相关

- [CLI reference](/cli)
- [Models](/concepts/models)
