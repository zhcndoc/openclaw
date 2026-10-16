---
summary: "消息流、会话、排队以及推理可见性"
read_when:
  - "解释入站消息如何变成回复"
  - "澄清会话、排队模式或流式行为"
  - "记录推理可见性及其使用影响"
title: "消息"
---

入站消息通过路由、dedupe/debounce、代理运行和出站传递移动：

```text
Inbound message
  -> routing/bindings -> session key
  -> dedupe + debounce
  -> queue (if a run is already active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

关键配置项：

- `messages.*`：用于前缀、排队、入站防抖和群组行为。
- `agents.defaults.*`：用于块流式、分块以及静默回复默认值。
- 渠道覆盖项（`channels.telegram.*`、`channels.whatsapp.*` 等）：用于按渠道的上限和流式开关。

完整 schema 请参见 [配置](/gateway/configuration)。

## <a id="inbound-dedupe"></a> 入站去重

通道可以在重新连接后重新传递相同的消息。 OpenClaw 保留一个由代理范围、通道路由（通道 + 对等 + 帐户 + 线程）和消息 ID 键入的内存缓存，因此重新传递的消息不会触发第二个代理运行。缓存条目将在 20 分钟后或跟踪 5000 个条目后过期（以先到者为准）。

## <a id="inbound-debouncing"></a> 入站防抖

来自同一发件人的快速短信可以通过 `messages.inbound` 批量发送给一个客服人员。去抖的范围是每个通道 + 会话，并使用最新的消息进行回复 threading/IDs. 它是一种安静窗口启发式方法，不能保证长消息的每个部分都会一次性到达。

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

- Debounce 适用于纯文本消息； media/attachments 立即冲洗。
- Control 命令（stop/abort/status 等）绕过去抖，因此它们会立即调度。
- Telegram 在 300 毫秒的安静窗口后默认批处理普通文本。除非配置，否则其他通道没有通用去抖延迟。
- `messages.inbound.byChannel.<channel>` 优先于 `messages.inbound.debounceMs`；要么覆盖通道默认值。设置 `0` 以禁用普通突发批处理。
- 对于非转发的 Telegram 文本，至少 4000 个字符的消息允许最多 1500 毫秒的连续时间。短消息和长消息共享同一个批次，不需要连续的消息 ID。当普通批处理被禁用时，这种自动长粘贴装配保持活动状态。
- iMessage 遵循相同的通用去抖策略。 `imsg` 0.13.1 和较新的合并 Apple URL-preview 在 OpenClaw 接收它们之前进行拆分发送，因此不需要 iMessage- 特定的去抖设置。

对 `messages.inbound.debounceMs` 和 `messages.inbound.byChannel` 的更改无需重新连接即可应用 Discord、Feishu、iMessage、Mattermost、Microsoft Teams、Signal、Slack、 Telegram，或WhatsApp。新接纳的入站工作使用承诺的延迟。单独的配置更改不会重新安排待处理的批次；后面的消息可以在原来的最大期限内更新其空闲延迟。显式传输定时覆盖保持固定。 Telegram 的转发消息收集窗口保持独立。

## <a id="sessions-and-devices"></a> 会话和设备

会话归网关所有，而不是客户端。

- 直接聊天会折叠到代理的主会话键中。
- Groups/channels 获得自己的会话密钥。
- 会话存储和转录内容位于网关主机上。

多个 devices/channels 可以映射到同一会话，但历史记录并未完全同步回每个客户端。使用一台主要设备进行长时间对话，以避免上下文不一致。 Control UI 和 TUI 始终显示网关支持的会话记录，因此它们是事实来源。

如果在保存助理回复之前运行失败或超时，其记录会收到一个可见的失败通知。即使请求回合结束后，嵌套运行也会保留自己的失败通知。

失败通知保留在聊天历史记录中，而不会成为后续模型请求中的用户指令。这也适用于早期版本保存的通知；存储的转录字节保持不变。

详情： [会话管理](/concepts/session)。

## <a id="prompt-bodies-and-history-context"></a> 提示正文和历史上下文

通道插件会在入站上下文中填充几个文本字段，按从最优先到最不优先的顺序如下：

| 字段             | 用途                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `BodyForAgent`    | 面向模型的当前轮文本。若未设置，则回退到 `CommandBody` / `RawBody` / `Body`。        |
| `BodyForCommands` | 用于 directive/command 解析的干净文本。未设置时回落至 `CommandBody` / `RawBody` / `Body`。 |
| `CommandBody`     | 旧的中间正文；优先使用 `BodyForCommands`。                                                         |
| `RawBody`         | `CommandBody` 的已弃用别名。                                                                         |
| `Body`            | 旧的提示正文；可能包含通道封装和历史包装。                                     |

当通道提供历史记录时，会使用以下内容将其包裹：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

线程启动器和线程历史记录在其上下文之后使用相同的当前消息标记，使请求与早期消息分开。排队轮次在此标记之前插入新的活动目标。该标记是运行时上下文，不会更改已保存的用户消息。环境房间事件忽略它并保留其可选响应策略。

对于非直接聊天 （groups/channels/rooms），当前消息正文以发件人标签为前缀，与历史记录条目使用的样式匹配。指令剥离仅适用于当前消息部分，因此历史记录保持不变。回绕历史记录的通道应将 `BodyForCommands`（或旧版 `CommandBody` / `RawBody`）设置为原始消息文本，并保留 `Body` 作为组合提示。

历史缓冲区仅包含待处理内容：它们包括未触发运行的群组消息（例如，只有提及才触发的消息），并排除已存在于会话转录中的消息。结构化历史、回复、转发以及通道元数据在提示组装期间会作为不受信任的用户角色上下文块进行渲染。

可通过 `messages.groupChat.historyLimit`（全局默认值）或按通道覆盖来配置历史大小，例如 `channels.slack.historyLimit` 和 `channels.telegram.accounts.<id>.historyLimit`（设为 `0` 可禁用）。

## <a id="tool-result-metadata"></a> 工具结果元数据

工具结果 `content` 是模型可见的输出；`details` 是用于 UI 渲染、诊断、媒体传递和插件执行的运行时元数据。

- `toolResult.details` 将在提供方重放之前以及在输入压缩之前被移除。
- 持久化会话转录只保留有限的 `details`；超大的元数据将被替换为带有 `persistedDetailsTruncated: true` 标记的简要摘要。
- 显示历史记录保留工具状态标志和会话密钥，以及命令退出代码、持续时间和有界工作目录（当工具提供时）。
- 插件和工具应将模型必须读取的文本放在 `content` 中，而不仅仅放在 `details` 中。

当工具错误警告是代理的唯一答复时，WebChat 将显示并保留它。该警告本身不会将已完成的代理运行更改为运行时故障；失败的工具结果将单独记录。

## <a id="queueing-and-followups"></a> 排队和后续轮次

当一个运行已经处于活动状态时，传入消息默认会被引导到其中。`messages.queue` 控制该模式：

| 模式              | 行为                                            |
| ----------------- | --------------------------------------------------- |
| `steer`（默认） | 将新提示注入到当前活动运行中。          |
| `followup`        | 在当前活动运行结束后运行该消息。      |
| `collect`         | 将兼容消息批量合并到后续的一个回合中。      |
| `interrupt`       | 中止当前活动运行，然后启动最新的提示。 |

具有单独持久入口准入的消息（包括 Discord 和 Telegram 消息）即使在 `collect` 模式下也会保留在单独的后续轮次中。兼容网关 `chat.send` 输入仍然可以组合。

队列对 steer、followup 和 collect 批处理使用内置的 500ms 防抖。`messages.queue.cap` 默认为 20 条排队消息，`messages.queue.drop` 默认为 `summarize`（也可用 `old` 和 `new`）。可通过 `messages.queue.byChannel` 和 `messages.queue.debounceMsByChannel` 配置按通道覆盖。

详情： [命令队列](/concepts/queue) 和 [引导队列](/concepts/queue-steering)。

## <a id="channel-run-ownership"></a> 频道运行所有权

频道插件可以在消息进入会话队列之前维护顺序、对输入进行防抖，并应用传输背压。它们不应在代理轮次本身外再施加单独的超时。一旦消息被路由到会话中，会话、工具和运行时生命周期将负责管理长时间运行的工作，这样所有频道都能一致地报告并从缓慢的轮次中恢复。

一旦轮流被持久地接受，在其回答之前的意外失败会在直接聊天和启用自动回复的明确寻址对话中产生紧凑的错误回复。进展确认并不能取代最终结果。轮次仍然失败，并且不会作为新的入站消息重播；已通过消息工具发送的传递策略和回复仍然适用。

最终源回复仅完成其回答的输入。当另一个输入引导同一正在运行的代理时，即使较早的输入已经通过消息工具收到了最终答复，其答案或失败仍然可见。

当当前输入的答复的传送处于挂起状态时，OpenClaw 在发送替换答复或失败消息之前等待其结果。

使用 OpenClaw 运行时，在生成部分文本后出错或中止的助手轮（没有工具调用）将在下一个模型请求中显示为简短的失败标记。其未完成的文本不会重播，并且存储的失败回合保持不变。空的和仅占位符的失败仍然被排除；失败的工具调用保留其现有的配对规则。该标记无法确定先前的操作是否已完成。

## <a id="streaming%2C-chunking%2C-and-batching"></a><a id="streaming-chunking-and-batching"></a> 流式传输、分块与批处理

块流式传输会在模型生成文本块时发送部分回复；分块会遵守频道文本长度限制，并避免拆分带围栏的代码块。

- `agents.defaults.blockStreamingDefault` (`on|off`，默认 `off`)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce`（基于空闲时间的批处理）
- `agents.defaults.humanDelay`（块回复之间的人类式停顿）
- 频道覆盖：打包频道上的 `*.streaming.block.enabled` 和 `*.streaming.block.coalesce`；过时的扁平键会通过 `openclaw doctor --fix` 迁移。除非显式启用，块流式传输在所有频道上都是关闭的，包括 Telegram。QQ Bot 是个例外：它没有 `streaming.block` 键，并且会流式发送块回复，除非 `channels.qqbot.streaming.mode` 为 `"off"`。

详情：[流式传输 + 分块](/concepts/streaming)。

## <a id="reasoning-visibility-and-tokens"></a> 推理可见性和 token

- `/reasoning on|off|stream` 控制可见性。
- 当模型生成推理内容时，该内容仍会计入 token 使用量。
- Telegram 支持将推理流式输出到临时草稿气泡中，并在最终发送后删除；使用 `/reasoning on` 可获得持久的推理输出。

详情： [思考 + 推理指令](/tools/thinking) 和 [Token 使用](/reference/token-use)。

## <a id="prefixes%2C-threading%2C-and-replies"></a><a id="prefixes-threading-and-replies"></a> 前缀、线程和回复

- 支持回复前缀的通道使用 `channels.<channel>.responsePrefix`，当支持多帐户配置时，使用 `channels.<channel>.accounts.<id>.responsePrefix`。帐户值获胜，包括 `""` 以禁用继承的前缀。使用 `"auto"` 作为代理身份名称或模板，例如用于所选模型的 `"[{model}]"`。自动回复支持是特定于渠道的。当这些当前字段未设置时，Doctor 将全局回退复制到支持的配置通道块中； `messages.responsePrefix` 仍然作为隐式和自定义通道的后备。
- 显式 `message` 工具和 CLI 文本发送也应用已解析的前缀，而不重复已存在的前缀。他们解析身份占位符，但不选择模型；包含未解析的模型、提供者或思维级别占位符的前缀将被完全省略。
- 通过 `replyToMode` 和按频道默认值进行回复线程管理。

详细信息：[Configuration](/gateway/config-agents/messages-and-talk#messages) 和通道文档。

## <a id="agent-reactions-to-webchat-prompts"></a> 代理对 WebChat 提示的反应

在承认的 WebChat 回合中，座席可以使用现有消息工具确认当前提示：

```json
{ "action": "react", "emoji": "👍" }
```

省略目标和消息 ID：主机将此操作绑定到已提交的当前提示和正在运行的代理的身份。使用相同的表情符号设置 `remove: true` 以消除该特工的反应。重复添加或删除是无操作的。反应出现在会话历史记录和实时更新中；它不镜像到继承的外部通道。外部反应仍然需要正常的通道路由和外部消息ID。

在没有当前提示（例如心跳和内部事件）的情况下运行，无法添加提示反应。针对提示的尝试在本地失败，而不是要求您配置外部通道。要从外部做出反应，请传递显式的 `channel`、`target` 和 `messageId`。

当执行开始时，排队的轮次将反应绑定到它们自己提交的提示上。仅当新输入被提交并被正在运行的代理使用后，转向才会更新当前提示；待处理或拒绝的输入不会重新定位反应。收集的输入使用其提交的组合提示。

当进行更多工作时，省略 `final` 或设置 `final: false`。当代理选择它时，带有显式 `final: true` 的附加反应可以是完整的回复。一旦确认当前源消息的传送，OpenClaw 就会结束回合，而不请求另一个文本响应。删除、对其他消息的反应、无操作、空运行和失败的反应都不会计算在内。正常的消息工具权限仍然适用，并且当前提示功能在其承认的轮次后到期。

## <a id="silent-replies"></a> 静默回复

静默令牌 `NO_REPLY` 是为连接到外部消息通道的会话保留的。只有完整的结尾，其整个文本为大写 `NO_REPLY`，忽略周围的空白，请求安静。它故意结束回合而不进行其他回复，包括在交叉聊天发送、反应、群聊或故意屈服之后，即使承认的回合通常需要回复。子代理、私人完成、Control UI 和其他内部会话仍然必须返回结果或继续未完成的工作。

直接消息提示省略了无声回复指导。模型发出的确切 `NO_REPLY` 仍然遵循此协议；省略提示指导并不强制要求额外的答案。

被截断的响应或未完成的工具转动不是成功的无声结局，即使其部分文本是 `NO_REPLY`。已提交至当前 WebChat 成绩单的完整最终结果满足结果要求；稍后的 `NO_REPLY` 不会使所提供的答案无效。进度更新不满足该要求。 Control UI 中的直接系统代理聊天也需要一个结果：`NO_REPLY` 或空输出遵循现有的恢复或故障路径，而不是默默地完成请求。

由可信输入处理选择的显式回复期望优先于这些会话默认值。例如，即使在 WebChat 中，迟到的对等结果也可以是可选的，因此使用它不需要再次确认或重复已提供的答案。

`NO_REPLY` 会丢弃本回合写入的所有未发送的内容，因此请在静默结束之前发送确认。它不会撤回已发送的消息或取消待处理的工作。字面上的前导 `NO_REPLY\n` 会删除该控制行，并保持其余文本不变；即使它是另一个 `NO_REPLY`，其余部分仍然可见。待处理的工具媒体（例如生成的 TTS 音频）在删除无声模型文本后仍会传送。

终端生产者准备一次回复并记录它是可见的还是无声的。交付和客户端使用该事实和完整准备的有效负载，而无需再次解释文本；即使显式可见事实的文本是 `NO_REPLY`，它仍然可见。小写 `no_reply`、`NO_REPLY.`、`"NO_REPLY"`、`{"action":"NO_REPLY"}` 以及普通散文附加或尾随的标记是可见文本，而不是无声结尾。存储的助手历史记录首先使用现有的显示和最终结果事实，然后对原始助手文本进行相同的精确检查；用户文本永远不会被视为静音指令。

对话策略仍然控制准入和默认回复期望：

- Direct 和接受的 group/channel 请求通常会收到应答。显式仅令牌 `NO_REPLY` 可以静默结束。
- 提及和访问门仍然决定哪些消息到达代理。 `silentReply.group: "allow"` 允许选择性处理未寻址的组请求；不需要遵守明确的 `NO_REPLY`。
- [房间环境事件](/channels/ambient-room-events)可以保持沉默。在`message_tool`可见回复模式下，可见输出使用`message(action=send)`。私人子代理完成情况记录了家长内部审核的结果。

默认值位于 `agents.defaults.silentReply.group` 下； `surfaces.<id>.silentReply.group` 可以覆盖每个表面的组策略。 Doctor 在配置迁移期间删除了已停用的 `internal` 设置。

通用内部运行器故障对于未显示可见输出的可选转弯保持安静，包括明确配置为允许安静的组。所需的匝数仍然会收到错误。分类恢复指南（例如缺少身份验证、速率限制或过载通知）仍然可以交付，并且可见的进度会收到失败结果，而不是未完成。直接聊天默认显示紧凑的故障副本；原始跑步者详细信息仅在启用 `/verbose full` 时显示。

可选回合不产生结果：空的决赛安静地结束，没有恢复或通知，并且仍然被分类为空而不是 `NO_REPLY`。仅当已完成的转弯是明确可选的时，模型后备才会跳过空结果；没有这项政策的空洞结果仍然需要恢复。

当结果已定时，空洞的决赛并不是故意的沉默。 OpenClaw 保持其有界恢复路径，而不重复已完成的操作。如果恢复仍然没有返回答案，则运行失败。已承认的用户请求最多会收到一条简短的系统通知：“未返回答案。请再次询问您是否还需要答案。”当模型回退可用时，该通知仅在回退链耗尽后出现，而不是每个候选者出现一次。它不会保存或分类为助理答案。心跳、cron 和其他后台或内部故障都会被记录下来，而不会在聊天中发布缺少答案的通知。现有的分类故障指导和警报路径仍然适用；静默恢复无法将提供商的失败转变为成功。已确认的交付或仍然拥有的交付可防止重复恢复；见[回复整形](/concepts/agent-loop#reply-shaping)。

没有作者确认的待处理工作将保留其现有的等待状态，因此支持的通道可以保留实时进度卡，直到结果到达。显式的 `NO_REPLY` 仍然会默默结束，而不会取消该工作。失败的委派任务使用相同的简短缺失答案副本；他们现有的交付和请求者历史镜像保持不变。

待处理的 WebChat 和 Control UI 工作保留进度卡和等待状态，同时仍欠结果。

## <a id="related"></a> 相关内容

- [通道入站 API](/plugins/sdk-channel-inbound) - 接收编排和确认策略
- [通道出站 API](/plugins/sdk-channel-outbound) - 持久发送和送达收据
- [流式传输](/concepts/streaming) - 实时消息传递
- [重试](/concepts/retry) - 消息传递重试行为
- [队列](/concepts/queue) - 消息处理队列
- [频道](/channels) - 消息平台集成
