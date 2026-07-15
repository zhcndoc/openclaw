---
summary: "流式传输 + 分块行为（区块回复、频道预览流、模式映射）"
read_when:
  - 解释频道上的流式传输或分块如何工作
  - 更改区块流式传输或频道分块行为
  - 调试重复/过早的区块回复或频道预览流
title: "流式传输与分块"
---

OpenClaw 有两个独立的流式层，并且当前**没有真正的
token-delta 流式传输**到频道消息：

- **区块流式传输（频道）：** 在助手
  写入时发出已完成的**区块**。这些是普通的频道消息，不是 token delta。
- **预览流式传输（Telegram/Discord/Slack/Matrix/Mattermost/MS Teams）：**
  在生成过程中更新一个临时的**预览消息**（发送 + 编辑/追加）。

## 区块流式传输（频道消息）

区块流式传输会在助手输出可用时，以较粗粒度的块发送。

```text
模型输出
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ chunker 随着缓冲区增长发出区块
       └─ (blockStreamingBreak=message_end)
            └─ chunker 在 message_end 时刷新
                   └─ 频道发送（区块回复）
```

- `text_delta/events`: 模型流事件（对于非流式模型，可能是稀疏的）。
- `chunker`: `EmbeddedBlockChunker`，应用最小/最大边界 + 中断偏好。
- `channel send`: 实际的出站消息（区块回复）。

**控制项**（除非另有说明，均位于 `agents.defaults` 下）：

| Key                                                          | Values / shape                                                          | Default    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- | ---------- |
| `blockStreamingDefault`                                      | `"on"` / `"off"`                                                        | `"off"`    |
| `blockStreamingBreak`                                        | `"text_end"` / `"message_end"`                                          | -          |
| `blockStreamingChunk`                                        | `{ minChars, maxChars, breakPreference? }`                              | -          |
| `blockStreamingCoalesce`                                     | `{ minChars?, maxChars?, idleMs? }` (发送前合并流式区块)              | -          |
| `*.streaming.block.enabled` (频道覆盖)                        | `true` / `false`，按频道（以及按账户）强制启用区块流式传输              | -          |
| `*.textChunkLimit` (例如 `channels.whatsapp.textChunkLimit`) | number，硬上限                                                      | 4000       |
| `*.streaming.chunkMode`                                      | `"length"` / `"newline"`                                                | `"length"` |
| `channels.discord.maxLinesPerMessage`                        | number，软行数上限，用于拆分过高的回复以避免 UI 裁剪                 | 17         |

`streaming.chunkMode: "newline"` 会按空白行（段落边界）拆分，
而不是每一行；当文本超过限制后，再回退到按长度分块。

打包频道将这些覆盖项写作
`channels.<id>.streaming.{chunkMode,block.enabled,block.coalesce}`。扁平的
`*.chunkMode` / `*.blockStreaming` / `*.blockStreamingCoalesce` 写法在所有打包频道中都属于
旧版：`openclaw doctor --fix` 会把它们迁移为嵌套结构，且频道 schema 会拒绝它们。外部 SDK 插件
配置如果仍在使用这些扁平写法，仍可通过已弃用的回退路径继续工作（并会在运行时给出警告），直到下一个发布周期。

**`blockStreamingBreak` 的边界语义**：

- `text_end`：一旦 chunker 发出区块就立即流式发送；每次 `text_end` 都刷新。
- `message_end`：等助手消息结束后，再刷新缓冲输出。若缓冲文本超过 `maxChars`，仍会使用 chunker，因此在结束时可以发出多个区块。

### 使用区块流式传输的媒体投递

流式媒体必须使用结构化载荷字段，例如 `mediaUrl` 或 `mediaUrls`；流式文本不会被解析为附件命令。当区块流式传输较早发送媒体时，OpenClaw 会记住该轮投递。如果最终的助手载荷重复了相同的媒体 URL，最终投递会去除重复媒体，而不是再次发送附件。

完全重复的最终载荷会被抑制。如果最终载荷在已经流式发送过的媒体周围加入了不同的文本，OpenClaw 仍会发送新文本，同时保持媒体只投递一次。这可以防止 Telegram 等频道中重复出现语音笔记或文件。

## 分块算法（低/高边界）

区块分块由 `EmbeddedBlockChunker` 实现：

- **低边界：** 缓冲区未达到 `minChars` 前不输出（除非被强制）。
- **高边界：** 优先在 `maxChars` 之前进行切分；如果被强制，则在 `maxChars` 处切分。
- **断点偏好链：** `paragraph` -> `newline` -> `sentence` ->
  空白符 -> 强制断开。
- **代码围栏：** 永远不要在围栏内部切分；当在 `maxChars` 处被强制切分时，关闭
  并重新打开围栏，以保持 Markdown 有效。

`maxChars` 会被限制为频道的 `textChunkLimit`，因此你不能超过
每个频道的上限。

## 合并（合并已流式区块）

当启用区块流式传输时，OpenClaw 可以在发送前**合并连续的区块
片段**，在保持渐进式输出的同时减少单行刷屏。

- 合并会在刷新前等待**空闲间隔**（`idleMs`）。
- 缓冲区会受 `maxChars` 限制，并在超过时立即刷新。
- `minChars` 可防止过小的片段过早发送，直到累积到足够文本
  （最终刷新始终会发送剩余文本）。
- 连接符由 `blockStreamingChunk.breakPreference` 决定：`paragraph` ->
  `\n\n`，`newline` -> `\n`，`sentence` -> 空格。
- 可通过 `*.streaming.block.coalesce` 进行频道覆盖（包括
  按账户配置）。
- Discord、Signal 和 Slack 的默认合并配置为 `{ minChars: 1500, idleMs: 1000 }`
  ，除非被覆盖。

## 区块之间的人类化节奏

当启用区块流式传输时，在第一个区块之后，在区块回复之间添加一个**随机暂停**，让多气泡回复感觉更自然。

| `agents.defaults.humanDelay.mode` | 行为                    |
| --------------------------------- | ----------------------- |
| `off`（默认）                    | 无暂停                  |
| `natural`                         | 800-2500 毫秒随机暂停   |
| `custom`                          | `minMs`/`maxMs`         |

可通过 `agents.list[].humanDelay` 为每个 agent 单独覆盖。仅适用于**区块回复**，不适用于最终回复或工具摘要。

## “流式分块还是一次全部输出”

- **流式分块：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`
  （边生成边输出）。非 Telegram 渠道还需要
  `*.streaming.block.enabled: true`。
- **在末尾一次性输出全部内容：** `blockStreamingBreak: "message_end"`（一次
  刷出，内容很长时可能会分成多个块）。
- **不进行分块流式输出：** `blockStreamingDefault: "off"`（仅最终回复）。

除非 `*.streaming.block.enabled` 明确设置为 `true`，否则块流式输出为**关闭**状态（例外：QQ Bot 没有 `streaming.block` 相关键，且会流式输出块回复，除非 `channels.qqbot.streaming.mode` 为 `"off"`）。各渠道可以在不启用块回复的情况下，流式输出实时预览（`channels.<channel>.streaming.mode`）。`blockStreaming*` 的默认值位于 `agents.defaults` 下，而不是配置根目录。

## 预览流式模式

Canonical key: `channels.<channel>.streaming` (nested `{ mode, ... }`; legacy
top-level boolean/string spellings are rewritten by `openclaw doctor --fix`).

| Mode       | 行为                                                                 |
| ---------- | -------------------------------------------------------------------- |
| `off`      | 禁用预览流式传输                                                       |
| `partial`  | 单个预览被最新文本替换                                                 |
| `block`    | 预览以分块/追加步骤更新                                                |
| `progress` | 生成期间显示进度/状态预览，完成时输出最终答案                           |

`streaming.mode: "block"` 是适用于可编辑频道（如 Discord 和 Telegram）的预览流式模式；它本身不会在这些频道中启用频道块投递。正常的块回复请使用 `streaming.block.enabled`。
Microsoft Teams 是个例外：它没有草稿预览块传输，因此 `streaming.mode:
"block"` 会完全禁用原生流式传输，回复会作为普通块投递，而不是原生的 partial/progress 流式传输。Mattermost 也有所不同：在 `block` 模式下，它会在已完成文本和工具活动块之间轮换预览，因此较早的块会作为单独帖子保持可见，而不会在一个可编辑草稿中被覆盖。

### 频道映射

| Channel    | `off` | `partial` | `block` | `progress`              |
| ---------- | ----- | --------- | ------- | ----------------------- |
| Telegram   | Yes   | Yes       | Yes     | 可编辑的进度草稿         |
| Discord    | Yes   | Yes       | Yes     | 可编辑的进度草稿         |
| Slack      | Yes   | Yes       | Yes     | Yes                     |
| Mattermost | Yes   | Yes       | Yes     | Yes                     |
| MS Teams   | Yes   | Yes       | Yes     | 原生进度流                |

预览分块配置（`streaming.preview.chunk.*`，例如在 `channels.discord.streaming` 或 `channels.telegram.streaming` 下）默认值为 `minChars: 200`、`maxChars: 800`（会限制在频道的 `textChunkLimit` 之内），以及 `breakPreference: "paragraph"`。

仅限 Slack：

- 当 `channels.slack.streaming.mode="partial"` 时，`channels.slack.streaming.nativeTransport` 会切换 Slack 原生流式 API 调用（`chat.startStream`/`chat.appendStream`/`chat.stopStream`）（默认：`true`）。
- Slack 原生流式传输和 Slack assistant 线程状态都需要一个回复线程目标。顶层 DM 不会显示那种线程样式的预览，但仍然可以使用 Slack 草稿预览帖子和编辑。

### 旧键迁移

| Channel  | Legacy keys                                                 | Status                                                                                                                                               |
| ---------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Telegram | `streamMode`, scalar/boolean `streaming`                    | 由 `openclaw doctor --fix` 重写为 `streaming.mode`；运行时不会读取                                                                                       |
| Discord  | `streamMode`, boolean `streaming`                           | 由 `openclaw doctor --fix` 重写为 `streaming.mode`；运行时不会读取                                                                                       |
| Slack    | `streamMode`; boolean `streaming`; legacy `nativeStreaming` | 由 `openclaw doctor --fix` 重写为 `streaming.mode`（以及布尔值/旧形式对应的 `streaming.nativeTransport`）；运行时不会读取                                 |
| Matrix   | scalar/boolean `streaming`                                  | 由 `openclaw doctor --fix` 重写为 `streaming.mode`（包括 Matrix 的 `"quiet"` 模式）；运行时不会读取                                                   |
| Feishu   | boolean `streaming`                                         | 由 `openclaw doctor --fix` 重写为 `streaming.mode`；运行时不会读取                                                                                       |
| QQ Bot   | boolean `streaming`; `streaming.c2cStreamApi`               | 由 `openclaw doctor --fix` 重写为 `streaming.mode`（以及布尔值/`c2cStreamApi` 形式对应的 `streaming.nativeTransport`）；运行时不会读取                   |

## 运行时行为

### Telegram

- 在私信和群组/话题中，使用 `sendMessage` + `editMessageText` 进行预览更新；最终文本会就地编辑当前预览。Telegram 的临时 30 秒“输入中”草稿（`sendMessageDraft`）不用于答案流式传输。
- 短的初始预览仍会为推送通知体验而进行防抖，但会在有界延迟后呈现，因此活跃运行不会在视觉上保持沉默。
- 长文本最终结果会复用预览消息的第一块，只发送其余分块。
- `block` 模式会在 `streaming.preview.chunk.maxChars` 处将预览轮换为新消息（默认 800，且受 Telegram 4096 字符编辑限制上限约束）；其他模式会将一个预览增长到 4096 字符。
- `progress` 模式会将工具进度保留在可编辑的状态草稿中；当答案流式传输已激活但尚无工具行可用时，会呈现状态标签；完成时清除草稿，并通过常规投递发送最终答案。
- 如果在完成文本被确认之前最终编辑失败，OpenClaw 会使用常规最终投递并清理过期预览。
- 当 Telegram block streaming 被显式启用时，会跳过预览流式传输，以避免双重流式传输。
- `/reasoning stream` 可以将推理写入一个临时预览，该预览会在最终投递后被删除。
- Telegram 选中的引用回复是一个例外：当 `replyToMode` 不是 `"off"` 且存在选中的引用文本时，OpenClaw 会跳过该轮的答案预览流（最终答案必须通过原生引用回复路径），因此工具进度预览行无法渲染。没有选中引用文本的当前消息回复仍会保留预览流。详情请参见 [Telegram channel docs](/channels/telegram)。

### Discord

- 使用发送 + 编辑预览消息。
- `block` 模式使用草稿分块（`draftChunk`）。
- 当 Discord block streaming 被显式启用时，会跳过预览流式传输。
- `progress` 模式会在最终答案后附加一个小的 `-#` 活动回执（思考/工具调用计数以及耗时），并在该答案送达后删除状态草稿，因此繁忙频道不会在回复上方留下孤立的工具日志。错误类最终结果会保留草稿，作为失败轮次的记录。
- 最终媒体、错误以及显式回复载荷会取消待处理的预览，而不会刷新新的草稿，然后使用常规投递。

### Slack

- `partial` 在可用时可以使用 Slack 原生流式传输（`chat.startStream`/`append`/`stop`）。
- `block` 使用追加式草稿预览。
- `progress` 先使用状态预览文本，然后发送最终答案。
- 不带回复线程的顶层私信会使用草稿预览发布和编辑，而不是 Slack 原生流式传输。
- 原生和草稿预览流式传输会抑制该轮的 block 回复，因此 Slack 回复只会通过一种投递路径进行流式传输。
- 最终媒体/错误载荷以及 progress 最终结果不会创建一次性的草稿消息；只有能够编辑预览的文本/block 最终结果才会刷新待处理的草稿文本。

### Mattermost

- 在 `partial` 模式下，会将思考和部分回复文本流式传输到同一个草稿预览帖子中，并在最终答案可以安全发送时就地完成。
- 在 `progress` 模式下，会将思考和工具活动流式传输到同一个状态预览中，并在最终答案可以安全发送时就地完成。
- 在 `block` 模式下，会在已完成文本和工具活动帖子之间轮换；并行和连续的工具更新会共享当前的工具活动帖子。
- 如果预览帖子已被删除，或在完成时不可用，则会回退为发送一条新的最终帖子。
- 最终媒体/错误载荷会在常规投递之前取消待处理的预览更新，而不是刷新一个临时预览帖子。

### Matrix

- 当最终文本可以复用预览事件时，草稿预览会就地完成。
- 仅媒体、错误以及回复目标不匹配的最终结果会在常规投递之前取消待处理的预览更新；已经可见的过期预览会被重写。

## 工具进度预览更新

预览流还可以包含 **工具进度** 更新：像“正在搜索网页”“正在读取文件”或“正在调用工具”这样的简短状态行，会在工具运行期间以同一条预览消息中的形式出现，并早于最终回复。在 Codex app-server 模式下，Codex 的前言/说明消息也使用同一预览路径，因此简短的“我正在检查……”进度提示可以流入可编辑草稿，而不会成为最终答案的一部分。这样可以让多步骤工具调用在视觉上保持“活跃”，而不是在第一次思考预览和最终答案之间静默无声。

长时间运行的工具在返回之前可能会发出带类型的进度信息。例如，`web_fetch` 在启动时会启动一个五秒计时器：如果抓取仍在进行中，预览会显示 `正在获取页面内容...`；如果抓取在此之前完成或被取消，则不会发出进度行。随后较晚到达的最终工具结果仍会正常传递给模型。

支持的场景：

- **Discord**、**Slack**、**Telegram** 和 **Matrix** 在预览流处于活动状态时，默认会将工具进度和 Codex 前言更新流入实时预览编辑。Microsoft Teams 在个人聊天中使用其原生进度流。
- Telegram 自 `v2026.4.22` 起已启用工具进度预览更新；保持启用可保留该已发布行为。
- **Mattermost** 会在 `partial` 和 `progress` 模式下将工具活动折叠到一条预览帖子中，或在 `block` 模式下将一条工具活动帖子插入文本块之间（见上文）。
- 工具进度编辑会遵循当前活动的预览流模式；当预览流为 `off` 或块流已经接管消息时，它们会被跳过。在 Telegram 上，`streaming.mode: "off"` 表示仅最终输出：通用进度闲聊也会被抑制，不会作为独立状态消息发送，而审批提示、媒体载荷和错误仍会正常路由。
- 要保留预览流但隐藏工具进度行，可为该频道将 `streaming.preview.toolProgress` 设为 `false`（默认值为 `true`）。要在隐藏命令/执行文本的同时保留工具进度行可见，可将 `streaming.preview.commandText` 设为 `"status"`，或将 `streaming.progress.commandText` 设为 `"status"`；默认值为 `"raw"`，以保留已发布行为。此策略适用于使用 OpenClaw 紧凑进度渲染器的草稿/进度通道，包括 Discord、Matrix、Microsoft Teams、Mattermost、Slack 草稿预览和 Telegram。要完全禁用预览编辑，请将 `streaming.mode` 设为 `off`。

## Progress 草稿渲染

进度模式草稿（`streaming.progress.*`）是有上限且可按
通道配置的：

| 键                                | 默认值         | 行为                                                           |
| --------------------------------- | -------------- | -------------------------------------------------------------- |
| `streaming.progress.maxLines`     | `8`            | 保留在草稿标签下方的最多紧凑进度行数                          |
| `streaming.progress.maxLineChars` | `120`          | 每行紧凑内容在截断前允许的最多字符数（按单词感知）             |
| `streaming.progress.label`       | `"auto"`       | 草稿标题；可自定义字符串，或设为 `false` 以隐藏它             |
| `streaming.progress.labels`      | 内置池         | 当 `label: "auto"` 时使用的候选标签                            |

### 评论进度通道

除了工具进度之外，紧凑进度渲染器还可以在草稿中显示另一条通道：

- **`streaming.progress.commentary`** - 渲染模型在工具调用前的
  **commentary**（一段简短的“我会检查……然后……”式叙述），并与
  工具行交错显示在进度草稿中。在 Discord 和 Telegram 的进度模式下，
  即使关闭了这个可选通道，同样的前导文本也会提供状态标题；其他通道则保留其现有的进度行为。参见
  [进度草稿](/concepts/progress-drafts#status-headline)。

```json
{
  "channels": {
    "discord": {
      "streaming": { "mode": "progress", "progress": { "commentary": true } }
    }
  }
}
```

保持进度行可见，但隐藏原始命令/执行文本：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "partial",
        "preview": {
          "toolProgress": true,
          "commandText": "状态"
        }
      }
    }
  }
}
```

在另一个紧凑进度通道键下使用相同的结构，例如
`channels.discord`、`channels.matrix`、`channels.msteams`、
`channels.mattermost`，或 Slack 草稿预览。对于进度草稿模式，请在
`streaming.progress` 下放置相同的策略：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "progress",
        "progress": {
          "toolProgress": true,
          "commandText": "状态"
        }
      }
    }
  }
}
```

## 相关内容

- [消息生命周期重构](/concepts/message-lifecycle-refactor) - 目标是共享用于预览、编辑、流式传输和完成的设计
- [进度草稿](/concepts/progress-drafts) - 在长时间轮次中更新的可见进行中消息
- [消息](/concepts/messages) - 消息生命周期和传递
- [重试](/concepts/retry) - 传递失败时的重试行为
- [通道](/channels) - 各通道的流式支持
