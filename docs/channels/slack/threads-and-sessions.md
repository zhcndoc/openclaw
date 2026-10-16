---
summary: "会话密钥、话题回复、回复标签和代理查看 DM"
read_when:
  - "确定 Slack 消息到达哪个 OpenClaw 会话"
  - "配置回复线程或手动回复标签"
  - "使用 Slack 代理查看 DM"
title: "Slack 线程和会话"
sidebarTitle: "话题和会话"
---

Slack 对话如何映射到 OpenClaw 会话，以及回复的位置。

## <a id="threading%2C-sessions%2C-and-reply-tags"></a><a id="threading-sessions-and-reply-tags"></a> 线程、会话与回复标签

- DM 路由为 `direct`；通道为`channel`； MPIM 为 `group`。
- Slack 路由绑定接受原始对等 ID 加上 Slack 目标形式，例如 `channel:C12345678`、`user:U12345678` 和 `<@U12345678>`。
- 使用默认 `session.dmScope=main` 时，普通 Slack DM 会崩溃到代理主会话。代理视图根和现有助理视图线程保持隔离为 `:thread:<threadTs>` 会话；请参阅 [Agent 查看 DM](/channels/slack/threads-and-sessions#agent-view-dms)。
- 频道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 普通顶层频道消息会留在按频道划分的会话中，即使 `replyToMode` 不是 `off` 也是如此。
- Slack 频道、MPIM、Agent View 和 Assistant View 的线程回复会使用父级 Slack `thread_ts` 作为会话后缀（`:thread:<threadTs>`）。普通 DM 回复线程仍然只是基于 DM 主会话的 UI 表现。
- 当 OpenClaw 需要将符合条件的顶级通道根播种到 `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>` 中时，该根预计将启动可见的 Slack 线程，因此根和后续线程回复共享一个 OpenClaw 会话。这适用于 `app_mention` 事件、显式机器人或配置的提及模式匹配，以及具有非 `off` `replyToMode` 的 `requireMention: false` 通道。
- `channels.slack.thread.historyScope` 默认值为 `thread`；`thread.inheritParent` 默认值为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制新线程会话启动时获取的现有线程消息数量（默认 `20`；将 `0` 设置为禁用）。房间线程播种也受 `historyLimit` 的限制。
- `channels.slack.implicitMentions.replyToBot` 控制是否允许回复机器人自己的消息时绕过提及门控（默认 `true`）。
- `channels.slack.implicitMentions.threadParticipation` 控制机器人已回复的线程中的后续操作是否绕过提及门控（默认 `true`）。将其设置为 `false` 以要求在这些后续操作中明确提及新的内容。 `openclaw doctor --fix` 将以前的 `channels.slack.thread.requireExplicitMention` 密钥迁移到此正标志。
- 账户级覆盖位于 `channels.slack.accounts.<id>.implicitMentions`；共享默认值位于 `channels.defaults.implicitMentions`。
- `requireMentionInBotThreads` 覆盖此机器人启动的线程中的提及门控：`false` 允许未提及的回复；无论隐式回复或参与信号如何，`true` 都需要提及。在 Slack 根、帐户或通道范围中配置它。省略它以保留上面的隐式提及行为。其他人发起的线程保持其正常策略。请参阅 [bot 创建的线程设置](/channels/slack/access-control#bot-created-threads)。

回复线程控制：

- `channels.slack.channels.<id>.replyToMode`：Slack channel/private-channel 消息的每通道覆盖
- `channels.slack.replyToMode`：`off|first|all|batched`（默认 `off`）
- `channels.slack.replyToModeByChatType`：按 `direct|group|channel` 区分
- 直聊的旧版回退：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

对于来自 `message` 工具的显式 Slack thread replies，设置 `replyBroadcast: true`，并配合 `action: "send"` 和 `threadId` 或 `replyTo`，以请求 Slack 也将该 thread reply 广播到父频道。这会映射到 Slack 的 `chat.postMessage` `reply_broadcast` 标志，并且仅支持文本或 Block Kit 发送，不支持媒体上传。

当 `message` 工具调用在 Slack 线程内运行并针对同一频道时，OpenClaw 通常会根据有效帐户、聊天类型或每个频道 `replyToMode` 继承当前 Slack 线程。自动回复和同一通道 `send` 或 `upload-file` 呼叫使用相同的每通道覆盖。在 `action: "send"` 或 `action: "upload-file"` 上设置 `topLevel: true` 以强制使用新的父通道消息。 `threadId: null` 被接受为相同的顶级选择退出。

<Note>
`replyToMode="off"` 禁用可选的出站 Slack 回复线程，包括显式 `[[reply_to_*]]` 标签。代理视图和助理视图是 Slack- 托管线程体验，因此无论此设置如何，它们的回复和状态都保留在可见根上。它不会展平其他入站 Slack 线程会话。这与 Telegram 不同，在 `"off"` 模式下仍支持显式标记。 Slack 线程隐藏来自通道的消息，而 Telegram 回复保持内嵌可见。
</Note>

### <a id="agent-view-dms"></a> Agent 查看 DM

Slack 代理视图 （`features.agent_view`） 是 Slack 针对 AI 应用程序的消息传递体验。 Slack 将应用程序标记为代理，并且在应用程序的 **Messages** 选项卡中，在顶级编辑器中键入的每条消息都会启动一个新根，Slack 会自行线程化；后续活动属于该根的线程内。 OpenClaw 将每个根视为一个单独的会话：

- Each 根在 `session.dmScope` 选择的任何基本会话之上获得 `:thread:<rootTs>` 后缀，因此即使在默认的 `main` 范围下，根也保持隔离。对于 `per-channel-peer`，根看起来像 `agent:main:slack:direct:U12345678:thread:1777244748.777299`； `main` 看起来像 `agent:main:main:thread:1777244748.777299`。
- 根线程内的后续活动保留在该根的会话上。新的顶级作曲家消息启动新会话。
- 无论 `replyToMode` 为何， 回复和线程状态都保留在可见根上，因为 Slack 拥有线程。
- Slack 的活动视图实体 （`app_context`） 仅作为 Slack 相关顺序中的结构化不可信上下文到达代理；没有 `app_context` 的 DM 会清除该回合的实体，而不是重用陈旧的实体。

Slack从不说明应用程序使用哪些体验，所以OpenClaw从它看到的第一个信号记录代理视图：`app_context_changed`事件，一个DM携带着`app_context`，或无螺纹`assistant.threads.setSuggestedPrompts`称呼OpenClaw当会员打开**留言**选项卡。Slack接听电话`ok` or `internal_error`对于 Agent View 应用程序和`not_agent_app`对于 Assistant View 应用程序，因此两者`ok`和`internal_error`算作证据；传输失败仍不确定，并在下次打开时重试。一个DM谁`thread_ts`等于自己的`ts`被认为是Slack-自行管理根。在看到这些信号之一之前，一个简单的DM根遵循普通DM路由。

该标记是持久的，并由帐户、工作区和 Slack 应用程序 ID 键入，因此一旦应用程序 ID 已知，代理视图就可以在网关重新启动后继续存在。套接字模式在启动时从应用程序令牌读取应用程序 ID。 HTTP 模式从启动后的第一个签名事件中学习并记录 `slack app id <id> learned from signed event` 一次。中继模式没有应用程序 ID 源，因此其标记仅存在于正在运行的进程中。 `features.assistant_view` 上的现有应用程序保留 Assistant View 线程；请参阅 [ 附加清单设置 ](/channels/slack/manifest-and-scopes#additional-manifest-settings)。

## <a id="recent-room-history"></a> 最近房间历史记录

允许的通道和组轮流从 Slack 获取最近的窗口，包括在网关重新启动后。 `channels.slack.historyLimit` 限制窗口（默认 `50`，`messages.groupChat.historyLimit` 作为后备）。帐户覆盖适用。自动观察消息窗口的上限为 200 条消息； JSON 整数最大值 （`9007199254740991`） 选择 50 条消息默认值。

对于观察到的 DM 上下文，`dmHistoryLimit` 和 `dms.<userId>.historyLimit` 使用默认值 `0`（禁用）和最多 200 条消息。 JSON 整数最大值选择禁用的默认值，包括每个 DM 覆盖。

这些保存的字段还控制用户轮流中的嵌入式会话记录修剪，其中 `0` 表示不修剪，并且现有的逐出缓冲仍然适用。 Doctor 保留配置的值；观察到的消息上限不会强加新的转录轮次上限。使用 `requireMention: true`，不满足配置的提及或隐式提及门的消息不会启动代理轮流或自动历史记录读取。

Slack 保持权威：编辑、删除、保留、令牌范围和可用性控制检索。没有单独的 OpenClaw 消息存档。恢复不会重写之前的代理记录。新的最近窗口尊重活动会话边界；初始线程播种保持其现有的 `thread.initialHistoryLimit` 行为。当前消息、去抖源消息和后续消息均从最近窗口中排除。初始线程历史记录使用其现有渲染路径一次。对于 `thread.historyScope: "channel"`，最近的窗口使用通道时间线，而初始线程播种保持独立。

线程范围的历史记录仅读取该线程。 Slack 首先返回最早的线程回复，因此自动线程恢复在三页后停止。如果无法到达最近的末尾，OpenClaw 会记录一个遗漏，而不是将旧的前缀显示为最新的。过滤和 Slack 页面限制也可以产生更短的窗口。读取失败会忽略自动历史记录，但不会丢弃所寻址的消息。最近窗口媒体恢复最多尝试四个图像附件，包括失败的尝试。当前消息和明确回复媒体保持各自的限制。

设置 `historyLimit: 0` 以禁用自动房间历史记录，包括初始房间线程历史记录。显式回复和线程启动上下文保持分离。现有的 `message(action="read")` 工具可以在重新启动或会话重置后对旧的 Slack 消息进行分页，但需要 Slack 访问和保留。
