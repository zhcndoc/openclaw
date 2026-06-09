---
summary: "消息流、会话、排队以及推理可见性"
read_when:
  - 解释入站消息如何变成回复
  - 澄清会话、排队模式或流式行为
  - 记录推理可见性及其使用影响
title: "消息"
---

OpenClaw 通过一个包含会话解析、排队、流式输出、工具执行和推理可见性的管道来处理入站消息。本页说明从入站消息到回复的路径。

## 消息流（高层）

```
入站消息
  -> 路由/绑定 -> 会话键
  -> 队列（如果有正在运行的任务）
  -> 代理运行（流式 + 工具）
  -> 出站回复（频道限制 + 分块）
```

关键开关位于配置中：

- `messages.*` 用于前缀、排队和群组行为。
- `agents.defaults.*` 用于块流式和分块默认值。
- 频道覆盖（`channels.whatsapp.*`、`channels.telegram.*` 等）用于限制和流式开关。

完整 schema 参见 [配置](/gateway/configuration)。

## 入站去重

频道在重新连接后可能会重复投递同一条消息。OpenClaw 会保留一个
短期缓存，以 channel/account/peer/session/message id 为键，因此重复
投递不会再次触发代理运行。

## 入站防抖

来自**同一发送者**的快速连续消息可以通过 `messages.inbound` 合并为一个
代理轮次。防抖按每个 channel + conversation 作用域划分，并使用最新消息来进行回复线程/ID 关联。

配置（全局默认值 + 按频道覆盖）：

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

- 防抖仅适用于**纯文本**消息；媒体/附件会立即刷新。
- 控制命令会绕过防抖，因此会保持为独立消息。显式选择启用同一发送者 DM 合并的频道，可以让 DM 命令保留在防抖窗口内，从而使拆分发送的负载能够加入同一代理轮次。

## 会话和设备

会话归网关所有，而不是客户端。

- 直接聊天会折叠到代理主会话键中。
- 群组/频道有自己的会话键。
- 会话存储和转录保留在网关主机上。

多个设备/频道可以映射到同一个会话，但历史不会完全
同步回每个客户端。建议：长对话使用一个主设备，以避免上下文分歧。控制 UI 和 TUI 始终显示
网关托管的会话转录，因此它们是事实来源。

详情： [会话管理](/concepts/session)。

## 工具结果元数据

工具结果的 `content` 是模型可见的结果。工具结果的 `details` 是
用于 UI 渲染、诊断、媒体传递和插件的运行时元数据。

OpenClaw 明确保留了这一边界：

- `toolResult.details` 在向提供方重放和压缩输入前会被剥离。
- 持久化的会话转录只保留有界的 `details`；过大的元数据
  会被替换为带有 `persistedDetailsTruncated: true` 标记的紧凑摘要。
- 插件和工具应把模型必须读取的文本放在 `content` 中，而不是只放在
  `details` 中。

## 入站主体和历史上下文

OpenClaw 将**提示主体**与**命令主体**分开：

- `BodyForAgent`: 当前消息面向主模型的主要文本。频道
  插件应将其聚焦在发送者当前带有提示意图的文本上。
- `Body`: 传统的提示回退字段。这可能包含频道包裹层和
  可选历史包装器，但当 `BodyForAgent` 可用时，当前频道不应将其
  作为主要模型输入来依赖。
- `CommandBody`: 用于指令/命令解析的原始用户文本。
- `RawBody`: `CommandBody` 的旧别名（为兼容性保留）。

当某个频道提供历史时，它使用一个共享包装器：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

对于**非直接聊天**（群组/频道/房间），**当前消息主体**会以前缀形式带上
发送者标签（与历史条目使用相同风格）。这使实时消息和排队/历史
消息在代理提示中保持一致。

历史缓冲区是**仅待处理**的：它们包含未触发运行的群组消息（例如，提及门控消息），并且**排除**
已在会话转录中的消息。

指令剥离仅适用于**当前消息**部分，因此历史会保持完整。包裹历史的频道应将 `CommandBody`（或 `RawBody`）设置为原始消息文本，并将 `Body` 保持为组合后的提示。结构化历史、回复、转发和频道元数据会在提示组装期间作为用户角色的不可信上下文块进行渲染。
历史缓冲区可通过 `messages.groupChat.historyLimit`（全局默认值）以及诸如 `channels.slack.historyLimit` 或 `channels.telegram.accounts.<id>.historyLimit` 之类的按频道覆盖进行配置（设为 `0` 可禁用）。

## 排队和后续轮次

如果运行已处于活动状态，入站消息默认会被导入当前运行。`messages.queue` 用于选择活动运行中的消息是导向、排队到以后、合并为一个稍后回合，还是中断活动运行。

- 通过 `messages.queue`（以及 `messages.queue.byChannel`）进行配置。
- 默认模式为 `steer`，对 Codex 导向批次以及 followup/collect 队列使用 500ms 防抖。
- 模式：`steer`、`followup`、`collect` 和 `interrupt`。

详情： [命令队列](/concepts/queue) 和 [引导队列](/concepts/queue-steering)。

## 频道运行所有权

频道插件可以在消息进入会话队列之前保持顺序、对输入进行防抖，并应用传输层背压。
它们不应在代理轮次本身外再施加单独超时。一旦消息被路由到
某个会话，长时间运行的工作就由会话、工具和运行时生命周期来管理，
因此所有频道都能一致地报告和恢复慢轮次。

## 流式、分块和批处理

块流式会在模型生成文本块时发送部分回复。
分块会遵守频道文本限制并避免拆分带围栏的代码。

关键设置：

- `agents.defaults.blockStreamingDefault`（`on|off`，默认 off）
- `agents.defaults.blockStreamingBreak`（`text_end|message_end`）
- `agents.defaults.blockStreamingChunk`（`minChars|maxChars|breakPreference`）
- `agents.defaults.blockStreamingCoalesce`（基于空闲的批处理）
- `agents.defaults.humanDelay`（块回复之间模拟人类的暂停）
- 频道覆盖：`*.blockStreaming` 和 `*.blockStreamingCoalesce`（非 Telegram 频道需要显式 `*.blockStreaming: true`）

详情： [流式 + 分块](/concepts/streaming)。

## 推理可见性和 token

OpenClaw 可以暴露或隐藏模型推理：

- `/reasoning on|off|stream` 控制可见性。
- 当模型生成推理内容时，它仍然计入 token 使用量。
- Telegram 支持将推理流式输出到一个临时草稿气泡中，该气泡会在最终投递后删除；使用 `/reasoning on` 可获得持久的推理输出。

详情： [思考 + 推理指令](/tools/thinking) 和 [Token 使用](/reference/token-use)。

## 前缀、线程和回复

出站消息格式由 `messages` 集中管理：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix`（出站前缀级联），以及 `channels.whatsapp.messagePrefix`（WhatsApp 入站前缀）
- 通过 `replyToMode` 以及按频道默认值进行回复线程关联

详情： [配置](/gateway/config-agents#messages) 和频道文档。

## 静默回复

确切的静默令牌 `NO_REPLY` / `no_reply` 表示“不要投递对用户可见的回复”。
当某一轮还包含待处理的工具媒体，例如生成的 TTS 音频时，OpenClaw
会剥离静默文本，但仍会投递媒体附件。
OpenClaw 会按对话类型解析该行为：

- 直接对话从不接收 `NO_REPLY` 提示引导。如果一次直接
  运行意外返回一个裸静默令牌，OpenClaw 会直接抑制它，而不是重写或投递它。
- 群组/频道默认仅允许自动群组回复静默。
  在 `message_tool` 可见回复模式中，静默表示模型不会调用
  `message(action=send)`。
- 内部编排默认允许静默。

OpenClaw 也会在非直接聊天中的通用内部运行器失败时使用静默回复，因此群组/频道不会看到网关错误说明。带有面向用户的恢复文案的已分类失败（例如缺少授权、速率限制或过载提示）仍然可以投递。默认情况下，直接聊天会显示简洁的失败文案；只有在启用 `/verbose full` 时才会显示原始运行器详情。

默认值位于 `agents.defaults.silentReply` 下；`surfaces.<id>.silentReply`
可以按 surface 覆盖群组/内部策略。

所有 surface 上都会丢弃裸静默回复，因此父会话会保持安静，
而不是把哨兵文本重写成回退闲聊。

## 相关内容

- [消息生命周期重构](/concepts/message-lifecycle-refactor) - 目标是持久化的发送和接收设计
- [流式](/concepts/streaming) — 实时消息传递
- [重试](/concepts/retry) — 消息投递重试行为
- [队列](/concepts/queue) — 消息处理队列
- [频道](/channels) — 消息平台集成
