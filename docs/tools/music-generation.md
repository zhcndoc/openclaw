---
summary: "通过 music_generate 在 ComfyUI、fal、Google Lyria、MiniMax 和 OpenRouter 工作流程中生成音乐"
read_when:
  - "通过 agent 生成音乐或音频"
  - "配置音乐生成提供方和模型"
  - "了解 music_generate 工具参数"
title: "音乐生成"
sidebarTitle: "音乐生成"
---

`music_generate` 工具通过共享的音乐生成能力创建音乐或音频，底层由 ComfyUI、fal、Google、MiniMax 和 OpenRouter 提供支持。

<Note>
当至少有一个音乐生成提供方可用时，才会出现 `music_generate`：一个显式的 `agents.defaults.mediaModels.music` 配置，或一个已完成认证配置的提供方（例如已设置 API key）。
</Note>

对于会话支持的代理运行，`music_generate` 作为后台任务启动，跟踪其媒体运行时的进度，然后在轨道准备就绪时唤醒代理，以便它可以告诉用户并附加完成的音频。完成代理遵循会话的可见回复契约：配置时自动最终回复，或当会话需要消息工具时 `message(action="send")`。如果请求者会话处于非活动状态或其唤醒失败，并且生成的音频在回复中仍然丢失，OpenClaw 会发送仅包含丢失音频的直接回退。重试不会再次发布相同的音频。

## <a id="quick-start"></a> 快速开始

<Tabs>
  <Tab id="shared-provider-backed" title="由共享提供商支持">
    <Steps>
      <Step id="configure-auth" title="配置身份验证">
        为至少一个提供方设置 API 密钥——例如 `GEMINI_API_KEY` 或 `MINIMAX_API_KEY`。
      </Step>
      <Step id="pick-a-default-model-optional" title="选择默认模型（可选）">
        ```json5
        {
          agents: {
            defaults: {
              mediaModels: {
                music: {
                  primary: "google/lyria-3-clip-preview",
                },
              },
            },
          },
        }
        ```
      </Step>
      <Step id="ask-the-agent" title="询问代理">
        _“生成一首充满活力的合成流行乐，主题是夜间穿行于霓虹城市。”_

        智能体会自动调用 `music_generate`。无需设置工具白名单。
      </Step>
    </Steps>

    如果没有会话支持的代理运行（direct/local 上下文），该工具将内联运行并在同一工具结果中返回最终媒体路径。

  </Tab>
  <Tab id="comfyui-workflow" title="ComfyUI 工作流程">
    <Steps>
      <Step id="configure-the-workflow" title="配置工作流程">
        配置 `plugins.entries.comfy.config.music`，包含一个工作流 JSON 以及 prompt/output 节点。
      </Step>
      <Step id="cloud-auth-optional" title="云认证（可选）">
        对于 Comfy Cloud，设置 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`。
      </Step>
      <Step id="call-the-tool" title="调用工具">
        ```text
        /tool music_generate prompt="Warm ambient synth loop with soft tape texture"
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

示例提示词：

```text
Generate a cinematic piano track with soft strings and no vocals.
```

```text
Generate an energetic chiptune loop about launching a rocket at sunrise.
```

使用 `action: "list"` 检查可用的 providers/models，并使用 `action: "status"` 检查活动的会话支持的音乐任务：

```text
/tool music_generate action=list
/tool music_generate action=status
```

直接生成示例：

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## <a id="supported-providers"></a> 支持的提供商

| 提供者   | 默认模型                | 参考输入 | 支持的控制项                                    | 认证                                   |
| ---------- | ---------------------------- | ---------------- | ----------------------------------------------------- | -------------------------------------- |
| ComfyUI    | `workflow`                   | 最多 1 张图片    | 工作流定义的音乐或音频                       | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| fal        | `fal-ai/minimax-music/v2.6`  | 无             | `lyrics`, `instrumental`, `durationSeconds`, `format` | `FAL_KEY` 或 `FAL_API_KEY`             |
| Google     | `lyria-3-clip-preview`       | 最多 10 张图片  | `lyrics`, `instrumental`, `format`                    | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax    | `music-2.6`                  | 无             | `lyrics`、`instrumental`、`format`（仅 mp3）         | `MINIMAX_API_KEY` 或 MiniMax OAuth     |
| OpenRouter | `google/lyria-3-pro-preview` | 最多 1 张图片    | `lyrics`, `instrumental`, `durationSeconds`, `format` | `OPENROUTER_API_KEY`                   |

MiniMax 注册两个共享相同模型的提供商 ID：API-key auth 的 `minimax` 和 OAuth 的 `minimax-portal`。模型参考遵循身份验证路径（`minimax/music-2.6` 与 `minimax-portal/music-2.6`）；参见 [MiniMax](/providers/minimax#music-generation)。

fal 还公开了 `fal-ai/ace-step/prompt-to-audio`（wav，无歌词，无乐器切换）和 `fal-ai/stable-audio-25/text-to-audio`（wav，仅提示）及其默认的 MiniMax- 支持模型。 Google默认`lyria-3-clip-preview`仅输出mp3； `lyria-3-pro-preview` 还支持 wav。 MiniMax 还公开了 `music-2.6-free`、`music-cover` 和 `music-cover-free`。 OpenRouter还曝光了`google/lyria-3-clip-preview`。

### <a id="capability-matrix"></a> 能力矩阵

`music_generate`、契约测试以及共享 live sweep 所使用的显式模式契约：

| 提供者   | `generate` | `edit` | 编辑限制 | 共享实时通道                                                         |
| ---------- | :--------: | :----: | ---------- | ------------------------------------------------------------------------- |
| ComfyUI    |     ✓      |   ✓    | 1 张图片    | 不在共享 sweep 中；由 `extensions/comfy/comfy.live.test.ts` 覆盖 |
| fal        |     ✓      |   —    | 无       | `generate`                                                                |
| Google     |     ✓      |   ✓    | 10 张图片  | `generate`, `edit`                                                        |
| MiniMax    |     ✓      |   —    | 无       | `generate`                                                                |
| OpenRouter |     ✓      |   ✓    | 1 张图片    | `generate`, `edit`                                                        |

## <a id="tool-parameters"></a> 工具参数

<ParamField path="prompt" type="string" required>
  音乐生成提示词。对于 `action: "generate"` 为必填。
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` 返回当前会话任务； `"list"` 检查提供商。
</ParamField>
<ParamField path="model" type="string">
  Provider/model 覆盖（e.g. `google/lyria-3-pro-preview`、`comfy/workflow`）。
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
<ParamField path="filename" type="string">输出文件名 hint.</ParamField>

<Note>
并非所有提供方都支持所有参数。OpenClaw 仍会在提交前验证诸如输入数量之类的硬性限制。当某个提供方支持时长但其最大值小于请求值时，OpenClaw 会将其夹取到最接近的受支持时长。真正不受支持的可选提示会在所选提供方或模型无法满足时被忽略，并给出警告。工具结果会报告已应用的设置；`details.normalization` 会记录任何从请求值到应用值的映射。
</Note>

提供方请求超时仅由运维配置控制。OpenClaw 使用 `agents.defaults.mediaModels.music.timeoutMs`（如已配置），会将低于 120000ms 的值提升到 120000ms，否则默认将提供方请求设为 300000ms。

## <a id="async-behavior"></a> 异步行为

基于会话的音乐生成会作为后台任务运行：

- **后台任务：** `music_generate` 创建后台任务，立即返回 started/task 响应，并稍后在后续代理消息中发布完成的曲目。
- **重复防止：**当任务是`queued`或`running`时，稍后`music_generate`在同一聊天中调用返回任务状态而不是开始另一代。使用 `action: "status"` 进行显式检查。最近完成的匹配请求也会进行 2 分钟的重复数据删除。直接聊天即使共享主会话记录，也会保留单独的任务；完成返回给请求方。
- **状态查找：**使用`music_generate`和`action: "status"`。
- **完成唤醒：** OpenClaw 会将一个内部完成事件注入回同一会话，因此模型可以自己编写面向用户的后续内容。
- **提示提示：**稍后user/manual在同一会话中轮流时，当音乐任务已经在运行时，会得到一个小的运行时提示，因此模型不会盲目地再次调用`music_generate`。
- **无会话回退：** direct/local 没有真正代理会话的上下文内联运行，并在同一回合中返回最终音频结果。

### <a id="task-lifecycle"></a> 任务生命周期

媒体运行时报告生成进度：

| 状态       | 含义                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `queued`    | 任务已创建，等待提供者接受。                                           |
| `running`   | 提供方正在处理（通常为 30 秒到 3 分钟，取决于提供方和时长）。 |
| `succeeded` | 音轨已就绪；agent 被唤醒并将其发布到对话中。                                 |
| `failed`    | 提供者错误或超时；代理醒来时会显示错误详细信息。                                 |

## <a id="configuration"></a> 配置

### <a id="model-selection"></a> 模型选择

```json5
{
  agents: {
    defaults: {
      mediaModels: {
        music: {
          primary: "google/lyria-3-clip-preview",
          fallbacks: ["fal/fal-ai/minimax-music/v2.6", "minimax/music-2.6"],
        },
      },
    },
  },
}
```

### <a id="provider-selection-order"></a> 提供方选择顺序

对于 `music_generate`，OpenClaw 按以下顺序尝试提供程序：

1. `model` 来自工具调用的参数。设置后，仅尝试此模型。
2. 配置中的 `agents.defaults.mediaModels.music.primary`。
3. 按顺序使用 `agents.defaults.mediaModels.music.fallbacks`。
4. 当主模型和后备模型均未配置时，使用配置的提供程序默认值进行自动检测：
   - 首先使用当前默认的文本模型提供方，前提是该提供方也提供音乐生成；
   - 剩余的注册音乐生成提供商，按提供商 ID 的字母顺序排列。

如果某个提供者失败，则会自动尝试下一个候选者。如果全部失败，错误将包含每次尝试的详细信息。每个失败的候选者都会在 `warn` 处记录其提供者、模型和错误。对于参考图像请求，无法使用图像或接受所提供的参考计数的候选者将被跳过。

显式音乐模型配置限制回退到配置列表； OpenClaw 不附加自动检测的提供程序。

## <a id="provider-notes"></a> 提供方说明

<AccordionGroup>
  <Accordion title="ComfyUI">
    工作流驱动，取决于配置的图形以及 prompt/output 字段的节点映射。 `comfy` 插件通过音乐生成提供商注册表插入共享 `music_generate` 工具。
  </Accordion>
  <Accordion title="fal">
    通过共享提供程序身份验证路径使用 fal 模型端点。捆绑的提供程序默认为 `fal-ai/minimax-music/v2.6`，并且还公开 `fal-ai/ace-step/prompt-to-audio` 和 `fal-ai/stable-audio-25/text-to-audio` 以用于提示音频请求。歌词和乐器模式仅限 MiniMax- 模型；其他两种模型仅提示。
  </Accordion>
  <Accordion id="google-lyria-3" title="Google （天琴座 3）">
    使用 Lyria 3 批量生成。当前捆绑的流程支持 prompt、可选的歌词文本以及可选的参考图像。默认的 `lyria-3-clip-preview` 模型仅输出 mp3；`lyria-3-pro-preview` 模型也支持 wav。
  </Accordion>
  <Accordion title="MiniMax">
    使用批处理 `music_generation` 端点。通过 `minimax` API-key auth 或 `minimax-portal` OAuth 支持提示、可选歌词、乐器模式和 mp3 输出。还公开了 `music-2.6-free`、`music-cover` 和 `music-cover-free` 模型。
  </Accordion>
  <Accordion title="OpenRouter">
    使用启用流式传输的 OpenRouter 聊天补全音频输出。捆绑的提供方默认使用 `google/lyria-3-pro-preview`，并且还提供 `openrouter/google/lyria-3-clip-preview`。
  </Accordion>
</AccordionGroup>

## <a id="choosing-the-right-path"></a> 选择合适的路径

- 当您需要模型选择、提供程序故障转移和内置异步 task/status 流时，**共享提供程序支持的**。
- **插件路径（ComfyUI）**：当你需要自定义工作流图，或者需要不属于共享打包音乐能力一部分的提供方时。

如果你正在调试 ComfyUI 特定行为，请参阅 [ComfyUI](/providers/comfy)。如果你正在调试共享提供方行为，请从 [fal](/providers/fal)、[Google（Gemini）](/providers/google)、 [MiniMax](/providers/minimax) 或 [OpenRouter](/providers/openrouter) 开始。

## <a id="provider-capability-modes"></a> Provider能力模式

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

遗留的平地，例如`maxInputImages`， `supportsLyrics`， 和`supportsFormat`是**不是**足以宣传编辑支持。提供者应声明`generate`和`edit`明确地进行实时测试、合同测试和共享`music_generate`工具可以验证这些声明的模式支持。

## <a id="live-tests"></a> 实时测试

为共享打包提供方（fal、Google、MiniMax、 OpenRouter）启用按需实时覆盖：

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

## <a id="related"></a> 相关内容

- [ComfyUI](/providers/comfy)
- [配置参考](/gateway/config-agents#agent-defaults) — `agents.defaults.mediaModels.music` 配置
- [Google （Gemini）](/providers/google)
- [MiniMax](/providers/minimax)
- [模型](/concepts/models) — 模型配置和故障切换
- [工具概览](/tools)
- [媒体概述](/tools/media-overview) — 媒体工具如何组合在一起
