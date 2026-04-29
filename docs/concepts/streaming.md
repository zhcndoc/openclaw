---
summary: "流式传输 + 分块行为（区块回复、频道预览流、模式映射）"
read_when:
  - 解释频道上的流式传输或分块如何工作
  - 更改区块流式传输或频道分块行为
  - 调试重复/过早的区块回复或频道预览流
title: "流式传输与分块"
---

OpenClaw 有两层独立的流式传输机制：

- **区块流式传输（频道）：** 在助手写作时发出已完成的 **区块**。这些是普通频道消息（不是 token 增量）。
- **预览流式传输（Telegram/Discord/Slack）：** 在生成过程中更新一条临时 **预览消息**。

目前没有真正的 token 增量流式传输到频道消息。预览流式传输是基于消息的（发送 + 编辑/追加）。

## 区块流式传输（频道消息）

区块流式传输会在助手输出可用时，以较粗粒度的块发送。

```
模型输出
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ chunker 随着缓冲区增长发出区块
       └─ (blockStreamingBreak=message_end)
            └─ chunker 在 message_end 时刷新
                   └─ 频道发送（区块回复）
```

图例：

- `text_delta/events`：模型流事件（对于非流式模型可能很稀疏）。
- `chunker`：`EmbeddedBlockChunker`，应用最小/最大边界 + 断点偏好。
- `channel send`：实际的外发消息（区块回复）。

**控制项：**

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（默认关闭）。
- 频道覆盖：`*.blockStreaming`（以及按账户的变体），用于按频道强制 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（在发送前合并已流式输出的区块）。
- 频道硬上限：`*.textChunkLimit`（例如 `channels.whatsapp.textChunkLimit`）。
- 频道分块模式：`*.chunkMode`（`length` 为默认值，`newline` 会先按空白行（段落边界）拆分，再进行长度分块）。
- Discord 软上限：`channels.discord.maxLinesPerMessage`（默认 17），会拆分过长回复以避免 UI 裁切。

**边界语义：**

- `text_end`：chunker 一旦发出区块就立即流式发送；每次 `text_end` 都刷新。
- `message_end`：等待助手消息结束，然后刷新已缓冲输出。

如果缓冲文本超过 `maxChars`，`message_end` 仍会使用 chunker，因此它可能在结束时发出多个分块。

### 使用区块流式传输的媒体投递

`MEDIA:` 指令是正常的投递元数据。当区块流式传输提前发送一个
媒体区块时，OpenClaw 会记住该轮次的投递。如果最终的
助手载荷重复了相同的媒体 URL，最终投递会去掉
重复媒体，而不会再次发送附件。

完全相同的最终载荷会被抑制。如果最终载荷在已经流式发送过的媒体周围增加了
不同的文本，OpenClaw 仍会发送
新增文本，同时保持媒体只投递一次。这样可以防止在
Telegram 等频道中出现重复的语音备注或文件，尤其是在 agent 在
流式传输期间发出 `MEDIA:`，而提供方在完整回复中也包含它时。

## 分块算法（低/高边界）

区块分块由 `EmbeddedBlockChunker` 实现：

- **低边界：** 除非被强制，否则在缓冲区 >= `minChars` 前不发出。
- **高边界：** 优先在 `maxChars` 之前拆分；如被强制，则在 `maxChars` 处拆分。
- **断点偏好：** `paragraph` → `newline` → `sentence` → `whitespace` → 硬断开。
- **代码围栏：** 绝不在围栏内部拆分；如在 `maxChars` 处被强制，会关闭 + 重新打开围栏以保持 Markdown 合法。

`maxChars` 会被限制到频道的 `textChunkLimit`，因此你无法超过每个频道的上限。

## 合并（合并已流式区块）

启用区块流式传输时，OpenClaw 可以在发送前 **合并连续的区块分块**
。这可以减少“单行刷屏”，同时仍然提供
渐进式输出。

- 合并会等待 **空闲间隔**（`idleMs`）后再刷新。
- 缓冲区受 `maxChars` 限制，超过时会刷新。
- `minChars` 会阻止过小片段发送，直到积累到足够文本
  （最终刷新总会发送剩余文本）。
- 连接符由 `blockStreamingChunk.breakPreference` 决定
  （`paragraph` → `\n\n`，`newline` → `\n`，`sentence` → 空格）。
- 可通过 `*.blockStreamingCoalesce` 使用频道覆盖（包括按账户配置）。
- 默认的合并 `minChars` 对 Signal/Slack/Discord 会提升到 1500，除非被覆盖。

## 区块之间的人类化节奏

启用区块流式传输时，你可以在
区块回复之间加入 **随机暂停**（首个区块之后）。这会让多气泡回复显得
更自然。

- 配置：`agents.defaults.humanDelay`（可通过 `agents.list[].humanDelay` 按 agent 覆盖）。
- 模式：`off`（默认）、`natural`（800–2500ms）、`custom`（`minMs`/`maxMs`）。
- 仅适用于 **区块回复**，不适用于最终回复或工具摘要。

## “流式分块还是一次全部输出”

对应如下：

- **流式分块：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（边生成边发出）。非 Telegram 频道还需要 `*.blockStreaming: true`。
- **在末尾一次性流式输出全部：** `blockStreamingBreak: "message_end"`（刷新一次，如内容很长则可能分成多个区块）。
- **不进行区块流式传输：** `blockStreamingDefault: "off"`（仅最终回复）。

**频道说明：** 区块流式传输默认是 **关闭** 的，除非
`*.blockStreaming` 被显式设为 `true`。频道可以流式显示实时预览
（`channels.<channel>.streaming`），而无需区块回复。

配置位置提醒：`blockStreaming*` 默认值位于
`agents.defaults` 下，而不是根配置。

## 预览流式模式

规范键：`channels.<channel>.streaming`

模式：

- `off`：禁用预览流式传输。
- `partial`：单个预览，会被最新文本替换。
- `block`：预览按分块/追加步骤更新。
- `progress`：生成期间显示进度/状态预览，完成时显示最终答案。

### 频道映射

| 频道       | `off` | `partial` | `block` | `progress`        |
| ---------- | ----- | --------- | ------- | ----------------- |
| Telegram   | ✅    | ✅        | ✅      | 映射为 `partial`  |
| Discord    | ✅    | ✅        | ✅      | 映射为 `partial`  |
| Slack      | ✅    | ✅        | ✅      | ✅                |
| Mattermost | ✅    | ✅        | ✅      | ✅                |

仅限 Slack：

- 当 `channels.slack.streaming.mode="partial"` 时，`channels.slack.streaming.nativeTransport` 会切换 Slack 原生流式 API 调用（默认：`true`）。
- Slack 原生流式传输和 Slack 助手线程状态都需要一个回复线程目标；顶层私信不会显示那种线程式预览。

旧键迁移：

- Telegram：检测到旧版 `streamMode` 和标量/布尔 `streaming` 值后，会通过 doctor/config 兼容路径迁移到 `streaming.mode`。
- Discord：`streamMode` + 布尔 `streaming` 会自动迁移为 `streaming` 枚举。
- Slack：`streamMode` 会自动迁移到 `streaming.mode`；布尔 `streaming` 会自动迁移到 `streaming.mode` + `streaming.nativeTransport`；旧版 `nativeStreaming` 会自动迁移到 `streaming.nativeTransport`。

### 运行时行为

Telegram：

- 在私信和群组/话题中，使用 `sendMessage` + `editMessageText` 进行预览更新。
- 如果预览已显示约一分钟，则发送一条新的最终消息，而不是原地编辑，然后清理预览，以便 Telegram 的时间戳反映回复完成时间。
- 当 Telegram 区块流式传输被显式启用时，会跳过预览流式传输（以避免双重流式输出）。
- `/reasoning stream` 可以把推理写入预览。

Discord：

- 使用发送 + 编辑预览消息。
- `block` 模式使用 draft chunking（`draftChunk`）。
- 当 Discord 区块流式传输被显式启用时，会跳过预览流式传输。
- 最终媒体、错误和显式回复载荷会取消待处理的预览，而不会刷新新草稿，然后使用正常投递。

Slack：

- 当可用时，`partial` 可以使用 Slack 原生流式传输（`chat.startStream`/`append`/`stop`）。
- `block` 使用追加式草稿预览。
- `progress` 使用状态预览文本，然后输出最终答案。
- 原生和草稿预览流式传输会抑制该轮次的区块回复，因此 Slack 回复只会通过一种投递路径流式发送。
- 最终媒体/错误载荷和进度最终结果不会创建一次性的草稿消息；只有可以编辑预览的文本/区块最终结果才会刷新待处理的草稿文本。

Mattermost：

- 将思考、工具活动和部分回复文本流式写入同一条草稿预览帖子，并在最终答案可以安全发送时原地定稿。
- 如果预览帖子已被删除或在最终定稿时不可用，则回退为发送一条新的最终帖子。
- 最终媒体/错误载荷会在正常投递前取消待处理的预览更新，而不是刷新一个临时预览帖子。

Matrix：

- 当最终文本可以复用预览事件时，草稿预览会原地定稿。
- 仅媒体、错误以及回复目标不匹配的最终结果会在正常投递前取消待处理的预览更新；已经可见的陈旧预览会被遮蔽。

### 工具进度预览更新

预览流式传输还可以包含 **工具进度** 更新——类似“正在搜索网页”、“正在读取文件”或“正在调用工具”这样的简短状态行——它们会在工具运行期间显示在同一条预览消息中，早于最终回复出现。这样可以让多步骤工具轮次在视觉上保持“活着”，而不是在第一段思考预览和最终答案之间静默。

支持的界面：

- **Discord**、**Slack**、**Telegram** 和 **Matrix** 在预览流式传输启用时，默认会把工具进度流式写入实时预览编辑。
- Telegram 自 `v2026.4.22` 起已启用工具进度预览更新；保持启用可以保留这一已发布行为。
- **Mattermost** 已经将工具活动折叠进其单个草稿预览帖子中（见上文）。
- 工具进度编辑遵循当前启用的预览流式模式；当预览流式为 `off` 或区块流式已经接管消息时，它们会被跳过。在 Telegram 上，`streaming.mode: "off"` 是仅最终输出：通用进度闲聊也会被抑制，而不会作为独立的“正在处理...”消息发送，但审批提示、媒体载荷和错误仍会正常路由。
- 若要保留预览流式但隐藏工具进度行，可为该频道将 `streaming.preview.toolProgress` 设为 `false`。若要完全禁用预览编辑，则将 `streaming.mode` 设为 `off`。

示例：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "partial",
        "preview": {
          "toolProgress": false
        }
      }
    }
  }
}
```

## 相关内容

- [消息](/concepts/messages) — 消息生命周期和投递
- [重试](/concepts/retry) — 投递失败时的重试行为
- [频道](/channels) — 按频道支持流式传输
