---
summary: "流式传输 + 分块行为（区块回复、频道预览流、模式映射）"
read_when:
  - 讲解频道上的流式传输或分块如何工作
  - 修改区块流式传输或频道分块行为
  - 调试重复/过早的区块回复或频道预览流
title: "流式传输与分块"
---

# 流式传输 + 分块

OpenClaw 有两个独立的流式传输层：

- **区块流式传输（频道）：** 当助手生成时，发送已完成的**区块**。这些是普通频道消息（非令牌增量）。
- **预览流式传输（Telegram/Discord/Slack）：** 生成过程中实时更新一个临时的**预览消息**。

目前**没有真正的令牌增量流式传输**到频道消息。预览流是基于消息的（发送 + 编辑/追加）。

## 区块流式传输（频道消息）

区块流式传输以粗粒度块的形式发送助手输出，一旦输出可用即发送。

```
模型输出
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ 分块器随着缓冲区增长发送区块
       └─ (blockStreamingBreak=message_end)
            └─ 分块器在消息结束时刷新
                   └─ 频道发送（区块回复）
```

图例：

- `text_delta/events`：模型流事件（对于非流模式模型可能是稀疏的）。
- `chunker`：`EmbeddedBlockChunker`，应用最小/最大边界 + 中断偏好。
- `channel send`：实际出站消息（区块回复）。

**控制参数：**

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（默认关闭）。
- 频道覆盖设置：`*.blockStreaming` （及按账户划分变体），可强制对频道开启/关闭。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（在发送前合并流式块）。
- 频道硬限制：`*.textChunkLimit`（例如 `channels.whatsapp.textChunkLimit`）。
- 频道分块模式：`*.chunkMode`（默认 `length`，`newline` 会在空行（段落边界）处拆分，再按长度分块）。
- Discord 软限制：`channels.discord.maxLinesPerMessage`（默认 17），分割过长回复以避免 UI 裁剪。

**边界语义：**

- `text_end`：分块器一发出区块即流出；每遇 `text_end` 刷新。
- `message_end`：等助手消息完成后，再刷新缓冲输出。

`message_end` 模式下，如果缓冲文本超过了 `maxChars`，仍然会调用分块器，可能在结尾处输出多个区块。

## 分块算法（低/高边界）

区块分块由 `EmbeddedBlockChunker` 实现：

- **低边界：** 缓冲区未达到 `minChars` 不输出（除非被强制）。
- **高边界：** 优先在 `maxChars` 之前分段；若被强制，则在 `maxChars` 处拆分。
- **中断偏好顺序：** `paragraph` → `newline` → `sentence` → `whitespace` → 硬中断。
- **代码块：** 永远不在代码区块内拆分；若在 `maxChars` 处被迫拆分，则关闭后重新打开代码块，保持 Markdown 合法。

`maxChars` 会被限制为频道的 `textChunkLimit`，因此无法超出频道最大限制。

## 合并（合并流式块）

启用区块流式传输时，OpenClaw 可以**合并连续的区块片段**再发送。这减少了"单行刷屏"，同时仍支持渐进输出。

- 合并会等待**空闲间隙**（`idleMs`）后刷新。
- 缓冲区大小限制为 `maxChars`，超过则强制刷新。
- `minChars` 防止过小片段被发送，直到累计足够文本为止（最后刷新时会发送剩余文本）。
- 拼接符由 `blockStreamingChunk.breakPreference` 决定（`paragraph` → `\n\n`，`newline` → `\n`，`sentence` → 空格）。
- 频道覆盖配置支持 `*.blockStreamingCoalesce`（包括按账户分配置）。
- Signal/Slack/Discord 默认将合并最小字符数提至 1500，除非覆盖。

## 区块间仿人类节奏

启用区块流式传输时，可以在区块回复之间（首个区块之后）添加**随机停顿**，让多气泡回复更自然。

- 配置项：`agents.defaults.humanDelay`（可通过 `agents.list[].humanDelay` 针对单个代理覆盖）。
- 模式：`off`（默认）、`natural`（800–2500ms）、`custom`（`minMs`/`maxMs`）。
- 仅对**区块回复**生效，不影响最终回复或工具汇总。

## "Stream chunks or everything" 映射

- **流式分块：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（边生成边发送）。非 Telegram 频道也需 `*.blockStreaming: true`。
- **全部流式输出于完成时：** `blockStreamingBreak: "message_end"`（一次刷新，极长文本时可能分多个区块）。
- **不使用区块流式：** `blockStreamingDefault: "off"`（仅最终回复）。

**频道提醒：** 除非显式将 `*.blockStreaming` 设置为 `true`，区块流式默认关闭。频道可以流式发送实时预览（`channels.<频道>.streaming`），无区块回复。

配置位置提示：`blockStreaming*` 默认值位于 `agents.defaults` 下，而非根配置。

## 预览流式模式

标准配置键：`channels.<channel>.streaming`

模式：

- `off`：禁用预览流式。
- `partial`：单一预览消息，持续替换为最新文本。
- `block`：预览消息以分块追加更新。
- `progress`：生成中显示进度/状态预览，完成显示最终答案。

### 频道映射

| 频道     | `off` | `partial` | `block` | `progress`       |
| -------- | ----- | --------- | ------- | ---------------- |
| Telegram | ✅    | ✅        | ✅      | 映射为 `partial` |
| Discord  | ✅    | ✅        | ✅      | 映射为 `partial` |
| Slack    | ✅    | ✅        | ✅      | ✅               |

Slack 特有：

- `channels.slack.nativeStreaming` 用于当 `streaming=partial` 时，切换 Slack 原生流式 API 调用（默认：`true`）。

旧配置迁移：

- Telegram：`streamMode` + 布尔型 `streaming` 自动迁移至 `streaming` 枚举。
- Discord：`streamMode` + 布尔型 `streaming` 自动迁移至 `streaming` 枚举。
- Slack：`streamMode` 自动迁移至 `streaming` 枚举；布尔型 `streaming` 自动迁移至 `nativeStreaming`。

### 运行时行为

Telegram：

- 在私信和群组/话题中使用 `sendMessage` + `editMessageText` 进行预览更新。
- 明确启用 Telegram 区块流式时，跳过预览流式（避免双重流式）。
- `/reasoning stream` 可将推理写入预览。

Discord：

- 使用发送 + 编辑预览消息。
- `block` 模式使用草稿分块（`draftChunk`）。
- 明确启用 Discord 区块流式时，跳过预览流式。

Slack：

- `partial` 模式时，如果可用，使用 Slack 原生流式接口（`chat.startStream`/`append`/`stop`）。
- `block` 使用追加式草稿预览。
- `progress` 先显示状态预览文本，随后显示最终答案。
