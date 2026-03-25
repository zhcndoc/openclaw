---
summary: "消息流、会话、排队和推理可见性"
read_when:
  - 解释入站消息如何变成回复
  - 澄清会话、排队模式或流行为
  - 记录推理可见性及使用影响
title: "消息"
---

# 消息

本页说明了 OpenClaw 如何处理入站消息、会话、排队、流式传输和推理可见性。

## 消息流程（高级）

```
入站消息
  -> 路由/绑定 -> 会话密钥
  -> 队列（如果有运行活动中）
  -> 代理运行（流式 + 工具）
  -> 出站回复（渠道限制 + 分块）
```

关键配置选项位于配置中：

- `messages.*` 用于前缀、排队和组行为。
- `agents.defaults.*` 用于块流和分块默认设置。
- 渠道覆盖（如 `channels.whatsapp.*`、`channels.telegram.*` 等）用于限制和流式切换。

查看 [配置](/gateway/configuration) 获取完整架构。

## 入站去重

渠道在重新连接后可能会重新发送相同消息。OpenClaw 保持一个由渠道/帐户/对等体/会话/消息 ID 组成的短期缓存，避免重复发送触发新的代理运行。

## 入站防抖

来自**同一发送者**的快速连续消息可通过 `messages.inbound` 合并为单个代理回合。防抖以渠道 + 会话为范围，使用最近消息进行回复线程/ID 处理。

配置（全局默认 + 每渠道覆盖）：

```json5
{
  messages: {
    inbound: {
      debounceMs: 2000,
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
        discord: 1500,
      },
    },
  },
}
```

注意：

- 防抖仅适用于**纯文本**消息；媒体/附件会立即处理。
- 控制命令绕过防抖，保持独立处理。

## 会话与设备

会话由网关拥有，而非客户端。

- 直接聊天合并为代理主会话密钥。
- 群组/频道有各自的会话密钥。
- 会话存储和聊天记录都位于网关主机。

多个设备/渠道可以映射同一个会话，但历史不会完全同步回每个客户端。建议：长聊使用一个主设备以避免上下文分叉。控制界面（UI）和文本界面（TUI）始终显示网关支持的会话记录，是事实源。

详情见：[会话管理](/concepts/session)。

## 入站消息体和历史上下文

OpenClaw 将**提示体**和**命令体**分开：

- `Body`：发送给代理的提示文本，可能包含渠道信封和可选历史包装。
- `CommandBody`：原始用户文本，用于指令/命令解析。
- `RawBody`：`CommandBody` 的旧别名（保留兼容性）。

渠道提供历史时使用共享包装：

- `[你上次回复后的聊天消息 - 用于上下文]`
- `[当前消息 - 请回复此消息]`

对于**非直接聊天**（群组/频道/聊天室），**当前消息体**会加上发送者标签（与历史条目样式相同）。这样保持实时和排队/历史消息在代理提示中的一致性。

历史缓存是**待处理的**：包含未触发运行的群组消息（例如仅提及许可的消息），并**排除**已在会话记录中的消息。

指令去除仅应用于**当前消息**部分，历史保持完整。包装历史消息的频道应将 `CommandBody`（或 `RawBody`）设置为原始消息文本，`Body` 保持为合并提示。历史缓存通过 `messages.groupChat.historyLimit` （全局默认）及渠道覆盖如 `channels.slack.historyLimit` 或 `channels.telegram.accounts.<id>.historyLimit` 配置（设为 `0` 禁用）。

## 排队与后续处理

如果当前已有运行，入站消息可以排队、引导进当前运行，或收集为后续回合。

- 通过 `messages.queue`（及 `messages.queue.byChannel`）配置。
- 模式包括：`interrupt`（中断）、`steer`（引导）、`followup`（后续）、`collect`（收集）及其积压变种。

详情见：[排队](/concepts/queue)。

## 流式、分块和批处理

块流式发送模型产生的部分回复文本块。分块遵守渠道文本限制，避免拆分代码块。

关键设置：

- `agents.defaults.blockStreamingDefault`（`on|off`，默认关闭）
- `agents.defaults.blockStreamingBreak`（`text_end|message_end`）
- `agents.defaults.blockStreamingChunk`（`minChars|maxChars|breakPreference`）
- `agents.defaults.blockStreamingCoalesce`（基于空闲时间的批处理）
- `agents.defaults.humanDelay`（块回复间类人延迟）
- 渠道覆盖：`*.blockStreaming` 和 `*.blockStreamingCoalesce`（非 Telegram 频道须显式设置 `*.blockStreaming: true`）

详情见：[流式 + 分块](/concepts/streaming)。

## 推理可见性和令牌

OpenClaw 可显示或隐藏模型推理：

- `/reasoning on|off|stream` 控制推理可见性。
- 推理内容产生时仍计入令牌使用。
- Telegram 支持推理流显示在草稿气泡中。

详情见：[思考 + 推理指令](/tools/thinking) 和 [令牌使用](/reference/token-use)。

## 前缀、线程和回复

出站消息格式统一在 `messages` 管理：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix`（出站前缀层叠），以及 `channels.whatsapp.messagePrefix`（WhatsApp 入站前缀）
- 通过 `replyToMode` 和渠道默认设置实现回复线程

详情见：[配置](/gateway/configuration-reference#messages) 和渠道文档。
