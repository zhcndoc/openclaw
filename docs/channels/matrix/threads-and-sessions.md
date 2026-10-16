---
summary: "会话路由、回复线程、ACP 绑定和房间历史上下文"
read_when:
  - "选择 Matrix DM 房间如何映射到 OpenClaw 会话"
  - "将 Matrix 线程绑定到 ACP 会话"
title: "Matrix 线程和会话"
sidebarTitle: "话题和会话"
---

Matrix 房间、DM 和线程如何映射到 OpenClaw 会话，以及每个回合携带多少房间历史记录。

## <a id="threads"></a> 线程

Matrix 同时支持用于自动回复和消息工具发送的原生线程。有两个独立的开关控制其行为：

### <a id="session-routing-(sessionscope)"></a><a id="session-routing-sessionscope"></a> 会话路由（`sessionScope`）

`dm.sessionScope` 决定 Matrix DM 房间如何映射到 OpenClaw 会话：

- `"per-user"`（默认）：具有相同路由对端的所有 DM 房间共享一个会话。
- `"per-room"`：每个 Matrix DM 房间都有自己的会话键，即使对端相同也是如此。

显式会话绑定始终优先于 `sessionScope`；已绑定的房间和线程会保留其选定的目标会话。

### <a id="reply-threading-(threadreplies)"></a><a id="reply-threading-threadreplies"></a> 回复线程化（`threadReplies`）

`threadReplies` 决定机器人发布回复的位置：

- `"off"`：回复为顶层消息。传入的线程消息会停留在父会话中。
- `"inbound"`：仅当传入消息本身已经位于该线程中时，才在该线程内回复。
- `"always"`：在由触发消息为根的线程中回复；从第一次触发开始，该对话会通过匹配的线程作用域会话进行路由。

`dm.threadReplies` 仅对 DMs 覆盖此行为 - 例如，保持房间线程隔离，同时保持 DMs 为扁平结构。

在线程内选择回复目标会保留线程和所选消息。普通线程消息可以携带老客户端的回复元数据； OpenClaw 不会将该兼容性回退视为代理上下文中的引用消息。

### <a id="mentions-in-bot-created-threads"></a> 在机器人创建的线程中提及

设置 `channels.matrix.requireMentionInBotThreads: false` 以接受源自接收机器人发送的事件的本机 Matrix 线程中未提及的后续操作。将其设置为 `true` 以要求在这些线程中提及，即使房间使用 `requireMention: false` 或 `autoReply: true` 也是如此。省略它会保留房间现有的提及行为。

该设置也可在 `accounts.<id>` 和每个 `groups` 或 `rooms` 条目下使用。房间条目覆盖帐户价值。与其他 Matrix 房间设置一样，精确的房间条目取代了通配符条目；精确条目中省略的字段将回退到帐户，而不是通配符。

只有原生 `m.thread` 关系才符合资格。对机器人消息的普通回复则不会。 OpenClaw 使用接收帐户解析线程根并缓存其经过验证的作者。 Matrix 内容编辑不会更改该作者，因此经过编辑的机器人创作的根仍然符合资格。如果无法读取或验证根的身份，则应用现有的提及行为。房间访问、发件人限制和 `allowBots: "mentions"` 仍然适用。

### <a id="thread-inheritance-and-slash-commands"></a> 线程继承与斜杠命令

- 传入的线程消息会将线程根消息作为额外的代理上下文包含进来。
- 当目标是同一房间（或同一 DM 用户目标）时，消息工具发送会自动继承当前的 Matrix 线程，除非显式提供了 `threadId`。
- 仅当当前会话元数据证明是在同一个 Matrix 账号上的同一个 DM 对端时，DM 用户目标复用才会生效；否则 OpenClaw 会回退到正常的按用户作用域路由。
- `/session unbind`、`/agents`、`/session idle`、`/session max-age` 和线程绑定 `/acp spawn` 均在 Matrix 房间和 DM 中工作。
- 当 `threadBindings.spawnSessions` 启用时，`/acp spawn --thread auto` 创建一个新的 Matrix 线程。
- 在现有 Matrix 线程内运行 `/acp spawn --thread here` 会将该线程绑定到位。

当 OpenClaw 检测到 Matrix DM 房间与同一共享会话上的另一个 DM 房间发生冲突时，它会发布一次性 `m.notice`，建议 `dm.sessionScope: "per-room"` 隔离房间。该通知仅在启用线程绑定时出现。

## <a id="acp-conversation-bindings"></a> ACP 会话绑定

Matrix 房间、DM 和现有的 Matrix 线程可以成为持久的 ACP 工作区，而无需更改聊天界面。

快速操作流程：

- 在 Matrix DM、房间或现有线程中运行 `/acp spawn codex --bind here`，以继续使用。
- 在顶级 DM 或房间中，当前的 DM/room 保留聊天界面，未来的消息将路由到生成的 ACP 会话。
- 在现有线程中，`--bind here` 会就地绑定当前线程。
- `/new` 和 `/reset` 会就地重置同一个已绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

`--bind here` 不会创建子 Matrix 线程。`threadBindings.spawnSessions` 会限制 `/acp spawn --thread auto|here`，其中 OpenClaw 需要创建或绑定一个子线程。

### <a id="thread-binding-config"></a> 线程绑定配置

Matrix 会继承来自 `session.threadBindings` 的全局默认值，并支持按通道覆盖：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSessions`：同时限制子代理和 ACP 线程的创建。
- 已弃用的 `threadBindings.spawnSubagentSessions` / `threadBindings.spawnAcpSessions` 密钥由 `openclaw doctor --fix` 迁移到 `spawnSessions`。
- `threadBindings.defaultSpawnContext`

Matrix 线程绑定会话默认生成。设置 `threadBindings.spawnSessions: false` 以阻止本机子代理和 ACP 线程从 creating/binding Matrix 线程生成。当本机子代理线程生成时，设置 `threadBindings.defaultSpawnContext: "isolated"` 不应分叉父记录。

## <a id="history-context"></a> 历史上下文

- `channels.matrix.historyLimit` 控制当房间消息触发代理时，作为 `InboundHistory` 包含多少条最近的房间消息。若未设置，则回退到 `messages.groupChat.historyLimit`；如果两者都未设置，最终默认值为 `0`（禁用）。
- Matrix 房间历史记录仅限房间； DM 继续使用正常的会话历史记录。
- 房间历史仅适用于待处理消息：OpenClaw 会缓冲尚未触发回复的房间消息，然后在出现提及或其他触发条件时对该窗口进行快照。
- 当前触发消息不包含在 `InboundHistory` 中；它仍保留在该轮的主入站正文中。
- 同一 Matrix 事件的重试会复用原始历史快照，而不是随着新的房间消息继续向前漂移。
