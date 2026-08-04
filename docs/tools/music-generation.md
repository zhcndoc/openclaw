---
summary: "通过 ComfyUI、fal、Google Lyria、MiniMax 和 OpenRouter 工作流生成音乐"
read_when:
  - 通过 agent 生成音乐或音频
  - 配置音乐生成提供方和模型
  - 了解 music_generate 工具参数
title: "音乐生成"
sidebarTitle: "音乐生成"
---

`music_generate` 工具通过共享的音乐生成能力创建音乐或音频，底层由 ComfyUI、fal、Google、MiniMax 和 OpenRouter 提供支持。

<Note>
当至少有一个音乐生成提供方可用时，才会出现 `music_generate`：一个显式的 `agents.defaults.mediaModels.music` 配置，或一个已完成认证配置的提供方（例如已设置 API key）。
</Note>

对于基于会话的 agent 运行，`music_generate` 会先作为后台任务启动，在任务账本中跟踪进度，然后在音轨准备就绪时唤醒 agent，以便它告知用户并附加生成完成的音频。完成代理遵循会话的可见回复约定：在已配置时自动发送最终回复，或者在会话需要 message 工具时使用 `message(action="send")`。如果请求者会话处于非活动状态，或其唤醒失败且生成的音频仍未出现在回复中，OpenClaw 会发送一个幂等的直接回退，只包含缺失的音频。

## 快速开始

<Tabs>
  <Tab title="共享提供方支持">
    <Steps>
      <Step title="配置认证">
        为至少一个提供方设置 API 密钥——例如 `GEMINI_API_KEY` 或 `MINIMAX_API_KEY`。
      </Step>
      <Step title="选择默认模型（可选）">
        ```json5
        {
          agents: {
            defaults: {
              musicGenerationModel: {
                primary: "google/lyria-3-clip-preview",
              },
            },
          },
        }
        ```
      </Step>
      <Step title="向智能体提问">
        _“生成一首充满活力的合成流行乐，主题是夜间穿行于霓虹城市。”_

        智能体会自动调用 `music_generate`。无需设置工具白名单。
      </Step>
    </Steps>

    在没有基于会话的智能体运行（直接/本地上下文）时，该工具会内联运行，并在同一个工具结果中返回最终媒体路径。

  </Tab>
  <Tab title="ComfyUI 工作流">
    <Steps>
      <Step title="配置工作流">
        配置 `plugins.entries.comfy.config.music`，包含一个工作流 JSON 以及 prompt/output 节点。
      </Step>
      <Step title="云端认证（可选）">
        对于 Comfy Cloud，设置 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`。
      </Step>
      <Step title="调用工具">
        ```text
        /tool music_generate prompt="温暖的氛围感合成器循环，带有柔和磁带质感"
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

示例提示词：

```text
生成一首具有柔和弦乐且无人声的电影感钢琴曲。
```

```text
生成一段充满活力的芯片音乐循环，主题是在日出时发射火箭。
```

使用 `action: "list"` 来查看可用的提供方/模型，并使用
`action: "status"` 来查看当前基于会话的音乐任务：

```text
/tool music_generate action=list
/tool music_generate action=status
```

直接生成示例：

```text
/tool music_generate prompt="梦幻的 lo-fi 嘻哈，带有黑胶质感和轻柔雨声" instrumental=true
```

## 支持的提供方

| 提供方      | 默认模型                     | 参考输入       | 支持的控制项                                       | 认证                                   |
| ---------- | ---------------------------- | -------------- | -------------------------------------------------- | -------------------------------------- |
| ComfyUI    | `workflow`                   | 最多 1 张图片  | 工作流定义的音乐或音频                             | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| fal        | `fal-ai/minimax-music/v2.6`  | 无             | `lyrics`, `instrumental`, `durationSeconds`, `format` | `FAL_KEY` or `FAL_API_KEY`             |
| Google     | `lyria-3-clip-preview`       | 最多 10 张图片  | `lyrics`, `instrumental`, `format`                    | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax    | `music-2.6`                  | 无             | `lyrics`, `instrumental`, `format`（仅 mp3）          | `MINIMAX_API_KEY` or MiniMax OAuth     |
| OpenRouter | `google/lyria-3-pro-preview` | 最多 1 张图片  | `lyrics`, `instrumental`, `durationSeconds`, `format` | `OPENROUTER_API_KEY`                   |

MiniMax 注册了两个共享同一模型的提供方 id：用于 API 密钥认证的 `minimax`，以及用于 OAuth 的 `minimax-portal`。模型引用遵循认证路径（`minimax/music-2.6` vs `minimax-portal/music-2.6`）；参见
[MiniMax](/providers/minimax#music-generation)。

fal 还在其默认的基于 MiniMax 的模型之外，提供 `fal-ai/ace-step/prompt-to-audio`（wav，不支持歌词，不支持 instrumental 开关）以及 `fal-ai/stable-audio-25/text-to-audio`（wav，仅支持提示词）。Google 的默认 `lyria-3-clip-preview` 仅输出 mp3；`lyria-3-pro-preview` 也支持 wav。MiniMax 还提供 `music-2.6-free`、`music-cover` 和
`music-cover-free`。OpenRouter 还提供 `google/lyria-3-clip-preview`。

### 能力矩阵

`music_generate`、契约测试以及共享 live sweep 所使用的显式模式契约：

| 提供方     | `generate` | `edit` | 编辑限制   | 共享实时通道                                                         |
| ---------- | :--------: | :----: | ---------- | ------------------------------------------------------------------- |
| ComfyUI    |     ✓      |   ✓    | 1 张图片   | 不在共享 sweep 中；由 `extensions/comfy/comfy.live.test.ts` 覆盖     |
| fal        |     ✓      |   —    | 无         | `generate`                                                          |
| Google     |     ✓      |   ✓    | 10 张图片  | `generate`, `edit`                                                  |
| MiniMax    |     ✓      |   —    | 无         | `generate`                                                          |
| OpenRouter |     ✓      |   ✓    | 1 张图片   | `generate`, `edit`                                                  |

## 工具参数

<ParamField path="prompt" type="string" required>
  音乐生成提示词。对于 `action: "generate"` 为必填。
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` 返回当前会话任务；`"list"` 检查提供方。
</ParamField>
<ParamField path="model" type="string">
  提供方/模型覆盖（例如 `google/lyria-3-pro-preview`，
  `comfy/workflow`）。
</ParamField>
<ParamField path="lyrics" type="string">
  当提供方支持显式歌词输入时，可选填写歌词。
</ParamField>
<ParamField path="instrumental" type="boolean">
  当提供方支持时，请求仅器乐输出。
</ParamField>
<ParamField path="image" type="string">
  单张参考图片路径或 URL。
</ParamField>
<ParamField path="images" type="string[]">
  多张参考图片（支持的提供方最多 10 张）。
</ParamField>
<ParamField path="durationSeconds" type="number">
  当提供方支持时长提示时的目标时长（秒）。
</ParamField>
<ParamField path="format" type='"mp3" | "wav"'>
  当提供方支持时的输出格式提示。
</ParamField>
<ParamField path="filename" type="string">输出文件名提示。</ParamField>

<Note>
并非所有提供方都支持所有参数。OpenClaw 仍会在提交前验证诸如输入数量之类的硬性限制。当某个提供方支持时长但其最大值小于请求值时，OpenClaw 会将其夹取到最接近的受支持时长。真正不受支持的可选提示会在所选提供方或模型无法满足时被忽略，并给出警告。工具结果会报告已应用的设置；`details.normalization` 会记录任何从请求值到应用值的映射。
</Note>

提供方请求超时仅由运维配置控制。OpenClaw 使用
`agents.defaults.mediaModels.music.timeoutMs`（如已配置），会将
低于 120000ms 的值提升到 120000ms，否则默认将提供方请求
设为 300000ms。

## 异步行为

基于会话的音乐生成会作为后台任务运行：

- **后台任务：** `music_generate` 会创建一个后台任务，立即返回一个已开始/任务响应，并在稍后的后续 agent 消息中发布完成的音轨。
- **重复防止：** 当任务处于 `queued` 或 `running` 状态时，同一会话中后续的 `music_generate` 调用会返回任务状态，而不会启动另一个生成。使用 `action: "status"` 可显式检查。最近完成的匹配请求也会在 2 分钟内去重。
- **状态查询：** `openclaw tasks list` 或 `openclaw tasks show <taskId>` 可检查排队中、运行中以及终态状态。
- **完成唤醒：** OpenClaw 会将一个内部完成事件注入回同一会话，因此模型可以自己编写面向用户的后续内容。
- **提示线索：** 当音乐任务已经在运行中时，同一会话中后续的用户/手动轮次会得到一个较小的运行时提示，这样模型就不会再次盲目调用 `music_generate`。
- **无会话回退：** 没有真实 agent 会话的直接/本地上下文会以内联方式运行，并在同一轮返回最终音频结果。

### 任务生命周期

音乐任务呈现与通用任务注册表相同的状态（完整状态机包括 `timed_out`、`cancelled` 和 `lost`，请参见 [后台任务](/automation/tasks#task-lifecycle)）。大多数音乐运行会经过：

| 状态       | 含义                                                                                           |
| -------- | -------------------------------------------------------------------------------------------- |
| `queued`    | 任务已创建，等待提供方接受。                                           |
| `running`   | 提供方正在处理（通常为 30 秒到 3 分钟，取决于提供方和时长）。 |
| `succeeded` | 音轨已就绪；agent 被唤醒并将其发布到对话中。                                 |
| `failed`    | 提供方错误或超时；agent 被唤醒并附带错误详情。                                 |

通过 CLI 检查状态：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

## 配置

### 模型选择

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
        fallbacks: ["fal/fal-ai/minimax-music/v2.6", "minimax/music-2.6"],
      },
    },
  },
}
```

### 提供方选择顺序

OpenClaw 按以下顺序尝试提供方：

1. `model` 参数来自工具调用（如果代理指定了一个）。
2. 来自配置的 `musicGenerationModel.primary`。
3. 按顺序使用 `musicGenerationModel.fallbacks`。
4. 仅使用带有认证支持的提供方默认值进行自动检测：
   - 如果当前默认文本模型提供方也提供音乐生成，则优先使用；
   - 其余已注册的音乐生成提供方，按提供方 id 的字母顺序排列。

如果某个提供方失败，会自动尝试下一个候选项。如果全部失败，错误信息会包含每次尝试的详细信息。

跨已认证提供方的自动回退始终启用。每次调用的
`model` 仍然具有最高优先级。

## 提供方说明

<AccordionGroup>
  <Accordion title="ComfyUI">
    由工作流驱动，并依赖已配置的图以及用于提示词/输出字段的节点映射。
    `comfy` 插件通过音乐生成提供方注册表接入共享的
    `music_generate` 工具。
  </Accordion>
  <Accordion title="fal">
    通过共享的提供方授权路径使用 fal 模型端点。捆绑的提供方默认使用 `fal-ai/minimax-music/v2.6`，并且还为 prompt-to-audio 请求提供 `fal-ai/ace-step/prompt-to-audio` 和 `fal-ai/stable-audio-25/text-to-audio`。歌词和纯器乐模式仅适用于 MiniMax 模型；另外两个模型仅支持 prompt。
  </Accordion>
  <Accordion title="Google (Lyria 3)">
    使用 Lyria 3 批量生成。当前捆绑的流程支持 prompt、可选的歌词文本以及可选的参考图像。默认的 `lyria-3-clip-preview` 模型仅输出 mp3；`lyria-3-pro-preview` 模型也支持 wav。
  </Accordion>
  <Accordion title="MiniMax">
    使用批量 `music_generation` 端点。通过 `minimax` API key 认证或 `minimax-portal` OAuth，支持 prompt、可选歌词、器乐模式以及 mp3 输出。还提供 `music-2.6-free`、`music-cover` 和 `music-cover-free` 模型。
  </Accordion>
  <Accordion title="OpenRouter">
    使用启用流式传输的 OpenRouter 聊天补全音频输出。捆绑的提供方默认使用 `google/lyria-3-pro-preview`，并且还提供 `openrouter/google/lyria-3-clip-preview`。
  </Accordion>
</AccordionGroup>

## 选择合适的路径

- **基于共享提供方**：当你需要模型选择、提供方故障切换以及内置的异步任务/状态流程时。
- **插件路径（ComfyUI）**：当你需要自定义工作流图，或者需要不属于共享打包音乐能力一部分的提供方时。

如果你正在调试 ComfyUI 特定行为，请参阅
[ComfyUI](/providers/comfy)。如果你正在调试共享提供方
行为，请从 [fal](/providers/fal)、[Google (Gemini)](/providers/google)、
[MiniMax](/providers/minimax) 或 [OpenRouter](/providers/openrouter) 开始。

## 提供商能力模式

共享的音乐生成契约支持显式模式声明：

- `generate`：用于仅基于提示词的生成。
- `edit`：用于请求中包含一个或多个参考图片时。

新的提供商实现应优先使用显式的模式块：

```typescript
capabilities: {
  generate: {
    maxTracks: 1,
    supportsLyrics: true,
    supportsFormat: true,
  },
  edit: {
    enabled: true,
    maxTracks: 1,
    maxInputImages: 1,
    supportsFormat: true,
  },
}
```

诸如 `maxInputImages`、`supportsLyrics` 和
`supportsFormat` 之类的旧式扁平字段，**不足以** 声明对编辑的支持。提供商
应显式声明 `generate` 和 `edit`，以便实时测试、契约
测试以及共享的 `music_generate` 工具能够确定性地验证模式支持。

## 实时测试

为共享打包提供方（fal、Google、MiniMax、
OpenRouter）启用按需实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

等效的仓库封装命令，驱动的是同一个测试文件：

```bash
pnpm test:live:media:music
```

此实时文件默认优先使用已导出的提供方环境变量，而不是存储的认证配置，并且在提供方启用 edit 模式时会同时运行 `generate` 和已声明的 `edit` 覆盖。当前覆盖情况：

- `google`：`generate` 以及 `edit`
- `fal`：仅 `generate`
- `minimax`：仅 `generate`
- `openrouter`：`generate` 以及 `edit`
- `comfy`：独立的 Comfy 实时覆盖，不属于共享提供方 sweep

打包的 ComfyUI 音乐路径的可选实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

当相关部分已配置时，Comfy 实时文件还会覆盖 comfy 图片和视频工作流。

## 相关内容

- [后台任务](/automation/tasks) — 用于分离的 `music_generate` 运行的任务跟踪
- [ComfyUI](/providers/comfy)
- [配置参考](/gateway/config-agents#agent-defaults) — `musicGenerationModel` 配置
- [Google (Gemini)](/providers/google)
- [MiniMax](/providers/minimax)
- [模型](/concepts/models) — 模型配置和故障切换
- [工具概览](/tools)。
