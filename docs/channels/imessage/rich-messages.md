---
summary: "iMessage 回击、线索回复、效果、本机民意调查、批准控制和问题反应"
read_when:
  - "使用代理的反应、编辑、效果或民意调查"
  - "将执行批准连接到 iMessage"
  - "调试消息工具上缺少的操作"
title: "iMessage 私人 API 操作"
sidebarTitle: "私人 API 操作"
---

在纯文本发送之上添加了已检查的私有 API 桥的操作界面。

## <a id="private-api-actions"></a> 私有 API 动作

当 `imsg launch` 正在运行并且 `openclaw channels status --probe` 报告 `privateApi.available: true` 时，除了正常的文本发送之外，消息工具还可以使用 iMessage-native 操作。

所有动作默认启用；使用 `channels.imessage.actions` 可以关闭单个动作：

```json5
{
  channels: {
    imessage: {
      actions: {
        reactions: true,
        edit: true,
        unsend: true,
        reply: true,
        sendWithEffect: true,
        sendAttachment: true,
        renameGroup: true,
        setGroupIcon: true,
        addParticipant: true,
        removeParticipant: true,
        leaveGroup: true,
        polls: true,
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion id="available-actions" title="可用的操作">
    - **react**：Add/remove iMessage 抽头（`messageId`、`emoji`、`remove`）。支持的回击映射为爱、喜欢、不喜欢、笑、强调和问题。不带表情符号的删除会清除设置的回击。
    - **reply**：向现有消息发送线程回复（`messageId`、`text` 或 `message`，以及 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`）。本地的带附件回复还需要 `imsg` 构建版本的 `send-rich` 支持 `--file`。使用远程 `imsg` v0.13.4 时，附件回复使用 JSON-RPC，并支持整条消息或第 `0` 部分；RPC 方法不支持非零附件部分索引。
    - **sendWithEffect**：发送带有 iMessage 效果的文本（`text` 或 `message`、`effect` 或 `effectId`）。短名称：slam、loud、gentle、invisibleink、confetti、lasers、fireworks、balloon、heart、echo、happybirthday、shootingstar、sparkles、spotlight。
    - **edit**：在支持的 macOS/private API 版本（`messageId`、`text` 或 `newText`）上编辑已发送消息。只能编辑网关本身发送的消息。
    - **unsend**：在支持的 macOS/private API 版本 （`messageId`） 上撤回已发送的消息。只能取消发送网关本身发送的消息。
    - **上传文件**：发送media/files（`buffer`作为base64或水合`media`/`path`/`filePath`、`filename`，可选`asVoice`）。旧别名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**：当当前目标是群组会话时管理群聊。这些动作会修改主机的 Messages 身份，因此要求发送者为所有者，或 Gateway 客户端具有 `operator.admin` 权限。
    - **poll**：创建本机 Apple 消息轮询（`pollQuestion`、`pollOption` 重复 2 到 12 次，加上 `chatGuid`、`chatId`、 `chatIdentifier` 或 `to`）。 iOS/iPadOS/macOS 26+ 上的收件人可以本地查看并投票；较旧的 OS 版本获得“已发送民意调查”文本后备。需要 `selectors.pollPayloadMessage`。
    - **poll-vote**：对现有投票进行投票（`pollId` 或 `messageId`，以及 `pollOptionIndex`、`pollOptionId` 或 `pollOptionText` 三者之一且只能选择一个）。需要 `selectors.pollVoteMessage` 和 `poll.vote` RPC 方法。远程 `imsg` v0.13.4 RPC 仅接受选项 ID，因此远程设置必须使用 `pollOptionId`；索引和文本选择器仍可用于本地设置。

    已接受的入站投票会以问题、选项标签、投票数以及 `poll-vote` 所需的投票消息 ID 呈现给代理。远程账号还会包含每个稳定的选项 ID，并指示代理使用 `pollOptionId`。

  </Accordion>

  <Accordion id="message-ids" title="消息 ID">
    入境iMessage上下文包括简短的`MessageSid`值和完整消息 GUID（`MessageSidFull`）当可用时。短 ID 的范围是最近的SQLite-支持回复缓存，并在使用前根据当前聊天进行检查。如果短路ID过期，用它重试`MessageSidFull`同时瞄准提供它的对话。完整 ID 不会绕过对话或帐户绑定，因此请替换ID来自与当前目标的另一次聊天。当当前对话证据不可用时，远程委派呼叫可以拒绝过时的完整 ID。

  </Accordion>

  <Accordion id="capability-detection" title="能力检测">
    仅当缓存检查状态表明桥不可用时，OpenClaw 才会隐藏私有 API 操作。如果状态未知，则操作保持可见并延迟调度检查，以便第一个操作可以在 `imsg launch` 之后成功，而无需单独的手动状态刷新。

  </Accordion>

  <Accordion id="read-receipts-and-typing" title="阅读收据并打字">
    当私有 API 桥接可用时，已接受的入站聊天会被标记为已读，而直接聊天会在回合被接受时立刻显示正在输入气泡，同时代理准备上下文并生成回复。可通过以下方式禁用已读标记：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    早于按方法能力列表门控的旧版 `imsg` 构建会静默关闭 typing/read；OpenClaw 会在每次重启后记录一次警告，以便将缺失的回执归因。

  </Accordion>

  <Accordion id="inbound-tapbacks" title="入站回击">
    OpenClaw 会订阅 iMessage 点按回应，并将收到的反应作为系统事件路由，而不是普通消息文本，因此用户的点按回应不会触发普通回复循环。

    通知模式由 `channels.imessage.reactionNotifications` 控制：

    - `"own"`（默认）：仅在用户对机器人生成的消息作出反应时通知。
    - `"all"`：对所有来自授权发送者的入站点按回应通知。
    - `"off"`：忽略入站点按回应。

    按账号覆盖使用 `channels.imessage.accounts.<id>.reactionNotifications`。

  </Accordion>

  <Accordion id="approval-polls-and-reactions" title="民意调查和反​​应">
    当 `approvals.exec.enabled` 或 `approvals.plugin.enabled` 为 true 且请求原生路由到 iMessage 时，网关会提供带原生控件的批准提示：

    - 在具有轮询和标题抑制支持的已检查私有 API 桥上，提示包括每个允许的决策的消息轮询。较旧的 `imsg` 版本没有 `poll send --no-comment` 保留在文本控件上。
    - 如果通过 `channels.imessage.actions.polls: false` 禁用了投票、桥接不支持投票、发送投票失败，或者可用决策少于两个，则提示会保留文本和点按回应控件。
    - 文本回退会将 `👍`（赞）映射为 `allow-once`，将 `👎`（不喜欢）映射为 `deny`。它还包含 `/approve <id> <decision>` 命令，在请求允许时也包括 `allow-always`。

    投票和反应要求执行操作的用户句柄必须是显式批准者。批准者列表从 `channels.imessage.allowFrom`（或 `channels.imessage.accounts.<id>.allowFrom`）读取；请添加用户的 E.164 格式电话号码或其 Apple ID 邮箱（如 `chat_id:*` 这类聊天目标不是有效的批准者条目）。通配符条目 `"*"` 会被接受，但会允许任何发送者批准；空的批准者列表会完全禁用投票和反应快捷方式。这些快捷方式会有意绕过 `reactionNotifications`、`dmPolicy` 和 `groupAllowFrom`，因为显式批准者白名单才是批准解析时真正重要的唯一门槛。

    目前，原生投票控件仅限于来源 iMessage 会话中的通道原生投递，或 iMessage 批准者 DM。由 `approvals.exec.mode: "targets"` 选定的显式转发目标（以及 `"both"` 的目标部分）仍然会使用现有的转发批准消息，而不是 iMessage 投票。

    `/approve` 文本命令的授权遵循相同列表：当 `channels.imessage.allowFrom` 非空时，`/approve <id> <decision>` 会依据该批准者列表进行授权（而不是更宽泛的 DM 白名单），而只在 DM 白名单中获准、但不在 `allowFrom` 中的发送者会收到明确拒绝。当 `allowFrom` 为空时，仍保持同聊天回退机制，`/approve` 会授权 DM 白名单允许的任何人。请把所有应当批准的操作员——无论是通过 `/approve` 还是通过反应——都加入 `allowFrom`。

    操作员注意：
    - 投票和反应绑定同时存储在内存中和网关的持久键值存储中（TTL 与批准到期时间一致），网关还会轮询待处理提示以查找点按回应。网关重启后，对旧控件的点击会被识别并吞掉，而不会进入代理聊天，但重启会终止进行中的命令；应请求新的批准，而不要指望旧控件恢复它。
    - 当该句柄是显式批准者时，操作员自己的 `is_from_me=true` 点按回应（例如来自配对的 Apple 设备）会解析批准。
    - 只有在配置了显式批准者时，批准提示才会路由到群组对话；否则群组中的任何成员都可能批准。
    - 旧式文本样式点按回应（来自非常旧 Apple 客户端的纯文本 `Liked "…"`）无法解析批准，因为它们不携带消息 GUID；反应解析需要当前 macOS / iOS 客户端发出的结构化点按回应元数据。

  </Accordion>

  <Accordion id="question-reactions-1-2-3-4" title="问题反应（1️⃣ / 2️⃣ / 3️⃣ / 4️⃣）">
    对于包含一个非秘密单选问题和一到四个选项的 `ask_user` 提示，OpenClaw 添加了编号的表情符号选项。使用匹配的号码对发送的提示作出反应以回答它。该反应必须携带机器人编写的消息的稳定GUID； OpenClaw 然后通过网关将该号码映射到存储的选项。过时或重复的点击将被忽略。

    多问题、多选择和自由文本提示仍然仅限文本回复。问题反应遵循正常的 iMessage DM/group 入场规则。即使一般 `reactionNotifications` 是 `"off"`，它们也能被识别，而不会将不相关的反应转化为代理事件。

  </Accordion>
</AccordionGroup>
