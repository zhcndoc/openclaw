---
summary: "消息流、会话、排队以及推理可见性"
read_when:
  - 解释入站消息如何变成回复
  - 澄清会话、排队模式或流式行为
  - 记录推理可见性及其使用影响
title: "消息"
---

入站消息会经过路由、去重/防抖、代理运行以及出站传递：

```text
入站消息
  -> 路由/绑定 -> 会话键
  -> 去重 + 防抖
  -> 队列（如果已有运行正在进行）
  -> 代理运行（流式 + 工具）
  -> 出站回复（渠道限制 + 分块）
```

关键配置项：

- `messages.*`：用于前缀、排队、入站防抖和群组行为。
- `agents.defaults.*`：用于块流式、分块以及静默回复默认值。
- 渠道覆盖项（`channels.telegram.*`、`channels.whatsapp.*` 等）：用于按渠道的上限和流式开关。

完整 schema 请参见 [配置](/gateway/configuration)。

## 入站去重

通道在重新连接后可能会重新投递相同的消息。OpenClaw 会维护一个以内存缓存，以 agent 作用域、通道路由（channel + peer + account + thread）和消息 ID 为键，因此重复投递的消息不会触发第二次 agent 运行。该缓存条目会在 20 分钟后过期，或在跟踪到 5000 个条目后过期，以先发生者为准。

## 入站防抖

来自同一发送者的连续快速文本消息可以通过 `messages.inbound` 合并为一次代理轮次。防抖作用范围按每个频道 + 会话划分，并使用最近一条消息进行回复线程/ID 关联。

```json5
{
  messages: {
    inbound: {
      debounceMs: 2000,
      byChannel: {
        discord: 1500,
        slack: 1500,
        whatsapp: 5000,
      },
    },
  },
}
```

- 防抖仅适用于纯文本消息；媒体/附件会立即刷新发送。
- 控制命令（stop/abort/status 等）会绕过防抖，因此会立即分发。
- 默认关闭：`messages.inbound.debounceMs` 没有内置默认值，因此只有在你设置后（全局或按频道）防抖才会生效。
- iMessage 的 `coalesceSameSenderDms` 可选项是唯一的例外：它会将同一发送者的所有 DM 文本（包括命令）保留足够长时间，以便 Apple 的 command+URL 拆分发送能够作为一次轮次到达。无论此设置如何，群聊始终会立即分发。

## 会话和设备

会话归网关所有，而不是客户端。

- 直接聊天会折叠到代理的主会话键中。
- 群组/频道会有各自的会话键。
- 会话存储和转录内容位于网关主机上。

多个设备/频道可以映射到同一个会话，但历史记录不会完全同步回每个客户端。对于长对话，请使用一个主设备，以避免上下文分叉。Control UI 和 TUI 始终显示由网关托管的会话转录，因此它们是事实来源。

详情： [会话管理](/concepts/session)。

## 提示正文和历史上下文

通道插件会在入站上下文中填充几个文本字段，按从最优先到最不优先的顺序如下：

| 字段             | 用途                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `BodyForAgent`    | 面向模型的当前轮文本。若未设置，则回退到 `CommandBody` / `RawBody` / `Body`。        |
| `BodyForCommands` | 用于指令/命令解析的干净文本。若未设置，则回退到 `CommandBody` / `RawBody` / `Body`。 |
| `CommandBody`     | 旧的中间正文；优先使用 `BodyForCommands`。                                                         |
| `RawBody`         | `CommandBody` 的已弃用别名。                                                                         |
| `Body`            | 旧的提示正文；可能包含通道封装和历史包装。                                     |

当通道提供历史记录时，会使用以下内容将其包裹：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

对于非直接聊天（群组/频道/房间），当前消息正文会以前缀发送者标签的形式出现，风格与历史条目一致。指令剥离仅适用于当前消息部分，因此历史内容保持完整。对历史记录进行包装的通道应将 `BodyForCommands`（或旧的 `CommandBody` / `RawBody`）设置为原始消息文本，并将 `Body` 保持为合并后的提示。

历史缓冲区仅包含待处理内容：它们包括未触发运行的群组消息（例如，只有提及才触发的消息），并排除已存在于会话转录中的消息。结构化历史、回复、转发以及通道元数据在提示组装期间会作为不受信任的用户角色上下文块进行渲染。

可通过 `messages.groupChat.historyLimit`（全局默认值）或按通道覆盖来配置历史大小，例如 `channels.slack.historyLimit` 和 `channels.telegram.accounts.<id>.historyLimit`（设为 `0` 可禁用）。

## 工具结果元数据

工具结果 `content` 是模型可见的结果；`details` 是用于 UI 渲染、诊断、媒体传递和插件的运行时元数据。

- `toolResult.details` 会在提供方重放之前以及在压缩输入之前被移除。
- 持久化的会话转录只保留有界的 `details`；超大的元数据会被替换为一个带有 `persistedDetailsTruncated: true` 标记的紧凑摘要。
- 插件和工具应将模型必须读取的文本放在 `content` 中，而不是只放在 `details` 中。

## 排队和后续轮次

当一个运行已经处于活动状态时，传入消息默认会被引导到其中。`messages.queue` 控制该模式：

| 模式               | 行为                                               |
| ------------------ | -------------------------------------------------- |
| `steer`（默认）    | 将新提示注入到当前活动运行中。                      |
| `followup`         | 在当前活动运行结束后运行该消息。                    |
| `collect`          | 将兼容消息批量合并到后续的一个回合中。                |
| `interrupt`        | 中止当前活动运行，然后启动最新的提示。                |

默认值：`messages.queue.debounceMs` 为 500ms（同样适用于 steer、followup 和 collect 的批处理），`messages.queue.cap` 为 20 条排队消息，`messages.queue.drop` 为 `summarize`（也可使用 `old` 和 `new`）。可通过 `messages.queue.byChannel` 和 `messages.queue.debounceMsByChannel` 配置按频道覆盖。

详情： [命令队列](/concepts/queue) 和 [引导队列](/concepts/queue-steering)。

## 频道运行所有权

频道插件可以在消息进入会话队列之前维护顺序、对输入进行防抖，并应用传输背压。它们不应在代理轮次本身外再施加单独的超时。一旦消息被路由到会话中，会话、工具和运行时生命周期将负责管理长时间运行的工作，这样所有频道都能一致地报告并从缓慢的轮次中恢复。

## 流式、分块和批处理

块流式传输会在模型生成文本块时发送部分回复；分块会遵守频道文本限制，并避免拆分围栏代码。

- `agents.defaults.blockStreamingDefault` (`on|off`，默认 `off`)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce`（基于空闲的批处理）
- `agents.defaults.humanDelay`（块回复之间类似人类的暂停）
- 频道覆盖：`*.blockStreaming` 和 `*.blockStreamingCoalesce`（除非在每个频道上都显式将 `*.blockStreaming` 设置为 `true`，否则块流式传输为关闭状态，包括 Telegram 在内的所有频道）

详情： [流式 + 分块](/concepts/streaming)。

## 推理可见性和 token

- `/reasoning on|off|stream` 控制可见性。
- 当模型生成推理内容时，该内容仍会计入 token 使用量。
- Telegram 支持将推理流式输出到临时草稿气泡中，并在最终发送后删除；使用 `/reasoning on` 可获得持久的推理输出。

详情： [思考 + 推理指令](/tools/thinking) 和 [Token 使用](/reference/token-use)。

## 前缀、线程和回复

- 出站前缀级联：`messages.responsePrefix`、`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。WhatsApp 还提供 `channels.whatsapp.messagePrefix` 作为入站前缀。
- 通过 `replyToMode` 进行回复线程管理，并支持按频道设置默认值。

详情： [配置](/gateway/config-agents#messages) 和频道文档。

## 静默回复

静默标记 `NO_REPLY`（不区分大小写，因此 `no_reply` 也会匹配）表示“不要发送用户可见的回复”。当某个轮次还带有待处理的工具媒体（例如生成的 TTS 音频）时，OpenClaw 会剥离静默文本，但仍然传递媒体附件。

静默策略按对话类型进行解析：

- 直接对话从不会收到 `NO_REPLY` 的提示指导。如果一次直接运行意外返回了一个裸静默标记，OpenClaw 会直接抑制它，而不是重写或发送它。
- 群组/频道默认允许静默。在 `message_tool` 可见回复模式下，静默意味着模型不会调用 `message(action=send)`。
- 内部编排默认允许静默。

默认值位于 `agents.defaults.silentReply`；`surfaces.<id>.silentReply` 可以按每个 surface 覆盖群组/内部策略。

OpenClaw 还会在非直接聊天中将静默回复用于通用的内部运行器失败，因此群组/频道不会看到网关错误的模板化提示。带有用户可见恢复文案的已分类失败，例如缺少认证、限流或过载通知，仍然可以发送。直接聊天默认显示简洁的失败文案；只有启用 `/verbose full` 时才会显示原始运行器详情。

所有 surface 上的裸静默回复都会被丢弃，因此父会话会保持安静，而不是把哨兵文本重写成兜底闲聊。

## 相关内容

- [消息生命周期重构](/concepts/message-lifecycle-refactor) - 目标是实现持久化发送和接收设计
- [流式传输](/concepts/streaming) - 实时消息传递
- [重试](/concepts/retry) - 消息传递重试行为
- [队列](/concepts/queue) - 消息处理队列
- [频道](/channels) - 消息平台集成
