---
summary: "通过 music_generate 在 Google Lyria、MiniMax 和 ComfyUI 工作流中生成音乐"
read_when:
  - 通过 agent 生成音乐或音频
  - 配置音乐生成提供方和模型
  - 了解 music_generate 工具参数
title: "音乐生成"
sidebarTitle: "音乐生成"
---

`music_generate` 工具允许 agent 通过已配置的提供方使用共享的音乐生成能力来创建音乐或音频——当前支持 Google、MiniMax，以及通过工作流配置的 ComfyUI。

对于有会话支持的 agent 运行，OpenClaw 会将音乐生成作为后台任务启动，在任务账本中跟踪它，然后在音轨就绪时再次唤醒 agent，以便 agent 告知用户并附加已完成的音频。在使用仅 message-tool 可见传递的群组/频道聊天中，agent 会通过 message tool 中继结果。如果完成 agent 只写入一条私有的最终回复，OpenClaw 会回退为直接渠道发送已生成的媒体。完成唤醒会明确警告 agent，在这些路径中普通最终回复是私有的。

<Note>
内置的共享工具只有在至少有一个音乐生成提供方可用时才会出现。如果你在 agent 的工具中看不到 `music_generate`，请配置 `agents.defaults.musicGenerationModel` 或设置提供方 API 密钥。
</Note>

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
      <Step title="向 agent 提问">
        _“生成一首充满活力的合成流行乐，主题是夜间穿行于霓虹城市。”_

        agent 会自动调用 `music_generate`。无需设置工具白名单。
      </Step>
    </Steps>

    对于没有基于会话的 agent 运行的直接同步上下文，内置工具仍会回退到内联生成，并在工具结果中返回最终媒体路径。

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

## 支持的提供方

| 提供方   | 默认模型               | 参考输入         | 支持的控制项                                              | 认证                                   |
| -------- | ---------------------- | ---------------- | --------------------------------------------------------- | -------------------------------------- |
| ComfyUI  | `workflow`             | 最多 1 张图片    | 工作流定义的音乐或音频                                       | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| Google   | `lyria-3-clip-preview` | 最多 10 张图片   | `lyrics`, `instrumental`, `format`                        | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax  | `music-2.6`            | 无               | `lyrics`, `instrumental`, `durationSeconds`, `format=mp3` | `MINIMAX_API_KEY` 或 MiniMax OAuth     |

### 能力矩阵

`music_generate`、契约测试以及共享 live sweep 所使用的显式模式契约：

| 提供方   | `generate` | `edit` | 编辑限制 | 共享 live 线路                                                         |
| -------- | :--------: | :----: | -------- | ------------------------------------------------------------------------- |
| ComfyUI  |     ✓      |   ✓    | 1 张图片 | 不在共享 sweep 中；由 `extensions/comfy/comfy.live.test.ts` 覆盖 |
| Google   |     ✓      |   ✓    | 10 张图片 | `generate`, `edit`                                                        |
| MiniMax  |     ✓      |   —    | 无       | `generate`                                                                |

使用 `action: "list"` 在运行时检查可用的共享提供方和模型：

```text
/tool music_generate action=list
```

使用 `action: "status"` 检查当前基于会话的音乐任务：

```text
/tool music_generate action=status
```

直接生成示例：

```text
/tool music_generate prompt="带有黑胶质感和轻柔雨声的梦幻 lo-fi hip hop" instrumental=true
```

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
<ParamField path="timeoutMs" type="number">可选的提供方请求超时时间，单位为毫秒。10000ms 以下的值会提升到 10000ms，并在工具结果中报告。</ParamField>

<Note>
并非所有提供方都支持所有参数。OpenClaw 仍会在提交前验证诸如输入数量之类的硬性限制。当某个提供方支持时长但其最大值小于请求值时，OpenClaw 会将其夹取到最接近的受支持时长。真正不受支持的可选提示会在所选提供方或模型无法满足时被忽略，并给出警告。工具结果会报告已应用的设置；`details.normalization` 会记录任何从请求值到应用值的映射。
</Note>

## 异步行为

基于会话的音乐生成会作为后台任务运行：

- **后台任务：** `music_generate` 会创建一个后台任务，立即返回 started/task 响应，并在稍后的 agent 跟进消息中发布完成后的音轨。
- **重复防护：** 当任务处于 `queued` 或 `running` 状态时，同一会话中的后续 `music_generate` 调用会返回任务状态，而不会启动另一个生成。使用 `action: "status"` 可显式检查。
- **状态查询：** `openclaw tasks list` 或 `openclaw tasks show <taskId>` 可检查 queued、running 和终态。
- **完成唤醒：** OpenClaw 会将内部完成事件注入回同一会话，以便模型自行撰写面向用户的后续消息。
- **提示提示：** 当音乐任务已经在运行时，同一会话中的后续用户/手动轮次会获得一个轻量运行时提示，因此模型不会盲目再次调用 `music_generate`。
- **无会话回退：** 没有真实 agent 会话的直接/本地上下文会内联运行，并在同一轮返回最终音频结果。

### 任务生命周期

| 状态       | 含义                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------- |
| `queued`    | 任务已创建，正在等待提供方接受。                                           |
| `running`   | 提供方正在处理（通常需要 30 秒到 3 分钟，具体取决于提供方和时长）。 |
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
        fallbacks: ["minimax/music-2.6"],
      },
    },
  },
}
```

### 提供方选择顺序

OpenClaw 按以下顺序尝试提供方：

1. 工具调用中的 `model` 参数（如果 agent 指定了）。
2. 配置中的 `musicGenerationModel.primary`。
3. 按顺序使用 `musicGenerationModel.fallbacks`。
4. 仅使用带认证的提供方默认值进行自动检测：
   - 先使用当前默认提供方；
   - 再按 provider-id 顺序使用其余已注册的音乐生成提供方。

如果某个提供方失败，会自动尝试下一个候选项。如果全部失败，错误信息会包含每次尝试的详细信息。

将 `agents.defaults.mediaGenerationAutoProviderFallback: false` 设为仅使用显式的 `model`、`primary` 和 `fallbacks` 条目。

## 提供方说明

<AccordionGroup>
  <Accordion title="ComfyUI">
    由工作流驱动，并依赖已配置的图结构以及 prompt/output 字段的节点映射。随附的 `comfy` 插件通过音乐生成提供方注册表接入共享的 `music_generate` 工具。
  </Accordion>
  <Accordion title="Google（Lyria 3）">
    使用 Lyria 3 批量生成。当前捆绑流程支持提示词、可选歌词文本以及可选参考图片。
  </Accordion>
  <Accordion title="MiniMax">
    使用批量 `music_generation` 端点。通过 `minimax` API 密钥认证或 `minimax-portal` OAuth，支持提示词、可选歌词、器乐模式、时长引导以及 mp3 输出。
  </Accordion>
</AccordionGroup>

## 选择合适的路径

- **共享 provider-backed**：当你需要模型选择、provider
  故障切换以及内置的异步任务/状态流程时。
- **插件路径（ComfyUI）**：当你需要自定义工作流图，或者需要
  不属于共享打包音乐能力一部分的 provider 时。

如果你在排查 ComfyUI 特定行为，请参阅
[ComfyUI](/providers/comfy)。如果你在排查共享 provider
行为，请从 [Google (Gemini)](/providers/google) 或
[MiniMax](/providers/minimax) 开始。

## Provider 能力模式

共享音乐生成契约支持显式的模式声明：

- `generate`：用于仅提示词生成。
- `edit`：当请求包含一张或多张参考图片时使用。

新的 provider 实现应优先使用显式的模式块：

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
`supportsFormat` 之类的旧式扁平字段，**不足以**声明 edit 支持。Provider
应显式声明 `generate` 和 `edit`，这样实时测试、契约
测试以及共享的 `music_generate` 工具才能确定性地验证模式支持。

## 实时测试

共享打包 provider 的可选实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

仓库包装命令：

```bash
pnpm test:live:media music
```

此实时文件会从 `~/.profile` 加载缺失的 provider 环境变量，默认优先使用
实时/环境 API 密钥，而不是已存储的 auth 配置文件，并且在 provider
启用 edit 模式时同时运行 `generate` 和已声明的 `edit` 覆盖。当前覆盖：

- `google`：`generate` 加上 `edit`
- `minimax`：仅 `generate`
- `comfy`：单独的 Comfy 实时覆盖，不包含在共享 provider 扫描中

打包的 ComfyUI 音乐路径的可选实时覆盖：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

当相关部分已配置时，Comfy 实时文件还会覆盖 comfy 图片和视频工作流。

## 相关内容

- [Background tasks](/automation/tasks) — 用于分离的 `music_generate` 运行的任务跟踪
- [ComfyUI](/providers/comfy)
- [Configuration reference](/gateway/config-agents#agent-defaults) — `musicGenerationModel` 配置
- [Google (Gemini)](/providers/google)
- [MiniMax](/providers/minimax)
- [Models](/concepts/models) — 模型配置和故障切换
- [Tools overview](/tools)
