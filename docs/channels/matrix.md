---
summary: "Matrix 支持状态、设置和配置示例"
read_when:
  - "在 OpenClaw 中设置 Matrix"
  - "配置 Matrix E2EE 和验证"
title: "Matrix"
---

Matrix 是一个可下载的频道插件（`@openclaw/matrix`），基于官方的 `matrix-js-sdk` 构建。它支持私信、房间、线程、媒体、反应、投票、位置和 E2EE。

Node 仍然是建议的运行时间。 Matrix 还接受 [ 选择加入 Bun 运行时 ](/install/bun)； E2EE 要求 Matrix SDK 的本机加密绑定可用于您的平台。

`openclaw matrix verify status`、`verify bootstrap`和`verify device`在本地网关运行时路由通过本地网关。如果旧网关不支持此路由，请更新它；失败的请求永远不会在本地重播。

其他`openclaw matrix`命令要求停止本地网关，包括设备诊断：准备帐户可以更新其加密状态。通过其服务所有者停止网关，运行命令，然后重新启动它。当网关拥有状态目录时，命令在加载帐户状态之前拒绝。离线所有权通过加密持久性和客户端关闭而持续。

加密会话中断后，`openclaw matrix doctor inspect` 报告需要显式快照恢复的帐户。清理会话保留其加密保护文件；不要删除它们。在接受快照回滚之前，请参阅 [ 加密状态恢复](/channels/matrix/encryption)。

<CardGroup cols={3}>
  <Card title="设置" icon="download" href="/channels/matrix/setup">
    安装插件并连接家庭服务器帐户。
  </Card>
  <Card title="加密" icon="lock" href="/channels/matrix/encryption">
    启用E2EE并验证网关设备。
  </Card>
  <Card title="Matrix 迁移" icon="arrows-rotate" href="/channels/matrix-migration">
    加密状态恢复限制和升级流程。
  </Card>
</CardGroup>

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [Matrix setup](/channels/matrix/setup) — 安装插件，将其指向家庭服务器，选择身份验证，然后控制邀请和白名单。
- [矩阵访问控制](/channels/matrix/access-control) — DM 和房间策略、允许列表、机器人到机器人流量、上下文可见性和命令授权。
- [矩阵消息行为](/channels/matrix/messaging) — 流式预览、入站语音笔记转录和反应。
- [Matrix 丰富的消息和批准](/channels/matrix/rich-messages) — 结构化回复控件、批准事件元数据和执行批准提示。
- [矩阵加密与验证](/channels/matrix/encryption) — E2EE设置、设备验证、交叉签名修复、房间密钥备份和加密存储布局。
- [Matrix 线程和会话](/channels/matrix/threads-and-sessions) — 会话路由、回复线程、ACP 对话绑定和房间历史上下文。
- [Matrix 帐户和家庭服务器](/channels/matrix/accounts-and-homeservers) — 多帐户布局、private/LAN 家庭服务器、代理、配置文件、直接房间修复和目标解析。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/channels/matrix#streaming-previews`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="install" />[安装](/channels/matrix/setup#install)
- <a id="setup" />[设置](/channels/matrix/setup#setup)
- <a id="interactive-setup" />[互动设置](/channels/matrix/setup#interactive-setup)
- <a id="minimal-config" />[最小配置](/channels/matrix/setup#minimal-config)
- <a id="auto-join" />[自动加入](/channels/matrix/setup#auto-join)
- <a id="group-join-introductions" />[集团加盟介绍](/channels/matrix/setup#group-join-introductions)
- <a id="allowlist-target-formats" />[ 允许列表目标格式](/channels/matrix/setup#allowlist-target-formats)
- <a id="account-id-normalization" />[账户ID归一化](/channels/matrix/setup#account-id-normalization)
- <a id="cached-credentials" />[缓存凭据](/channels/matrix/setup#cached-credentials)
- <a id="environment-variables" />[环境变量](/channels/matrix/setup#environment-variables)
- <a id="configuration-example" />[配置示例](/channels/matrix/setup#configuration-example)
- <a id="streaming-previews" />[流媒体预览](/channels/matrix/messaging#streaming-previews)
- <a id="voice-messages" />[语音留言](/channels/matrix/messaging#voice-messages)
- <a id="reply-controls-and-presentations" />[回复控件和演示](/channels/matrix/rich-messages#reply-controls-and-presentations)
- <a id="approval-metadata" />[批准元数据](/channels/matrix/rich-messages#approval-metadata)
- <a id="self-hosted-push-rules-for-quiet-finalized-previews" />[用于安静最终预览的自托管推送规则](/channels/matrix/rich-messages#self-hosted-push-rules-for-quiet-finalized-previews)
- <a id="bot-to-bot-rooms" />[机器人间](/channels/matrix/access-control#bot-to-bot-rooms)
- <a id="encryption-and-verification" />[加密与验证](/channels/matrix/encryption#encryption-and-verification)
- <a id="enable-encryption" />[启用加密](/channels/matrix/encryption#enable-encryption)
- <a id="status-and-trust-signals" />[状态和信任信号](/channels/matrix/encryption#status-and-trust-signals)
- <a id="verify-this-device-with-a-recovery-key" />[使用恢复密钥验证此设备](/channels/matrix/encryption#verify-this-device-with-a-recovery-key)
- <a id="bootstrap-or-repair-cross-signing" />[引导或修复交叉签名](/channels/matrix/encryption#bootstrap-or-repair-cross-signing)
- <a id="room-key-backup" />[房间钥匙备份](/channels/matrix/encryption#room-key-backup)
- <a id="listing%2C-requesting%2C-and-responding-to-verifications" />[列出、请求和响应验证](/channels/matrix/encryption#listing%2C-requesting%2C-and-responding-to-verifications)
- <a id="multi-account-notes" />[多账户票据](/channels/matrix/encryption#multi-account-notes)
- <a id="profile-management" />[档案管理](/channels/matrix/accounts-and-homeservers#profile-management)
- <a id="threads" />[线程](/channels/matrix/threads-and-sessions#threads)
- <a id="session-routing-(sessionscope)" />[会话路由（`sessionScope`）](</channels/matrix/threads-and-sessions#session-routing-(sessionscope)>）
- <a id="reply-threading-(threadreplies)" />[回复穿线（`threadReplies`）](</channels/matrix/threads-and-sessions#reply-threading-(threadreplies)>）
- <a id="thread-inheritance-and-slash-commands" />[线程继承和斜线命令](/channels/matrix/threads-and-sessions#thread-inheritance-and-slash-commands)
- <a id="acp-conversation-bindings" />[ACP 对话绑定](/channels/matrix/threads-and-sessions#acp-conversation-bindings)
- <a id="thread-binding-config" />[线程绑定配置](/channels/matrix/threads-and-sessions#thread-binding-config)
- <a id="reactions" />[反应](/channels/matrix/messaging#reactions)
- <a id="history-context" />[H历史背景](/channels/matrix/threads-and-sessions#history-context)
- <a id="context-visibility" />[上下文可见性](/channels/matrix/access-control#context-visibility)
- <a id="dm-and-room-policy" />[DM 和客房政策](/channels/matrix/access-control#dm-and-room-policy)
- <a id="direct-room-repair" />[直修](/channels/matrix/accounts-and-homeservers#direct-room-repair)
- <a id="exec-approvals" />[执行批准](/channels/matrix/rich-messages#exec-approvals)
- <a id="slash-commands" />[斜线命令](/channels/matrix/access-control#slash-commands)
- <a id="multi-account" />[多账户](/channels/matrix/accounts-and-homeservers#multi-account)
- <a id="private%2Flan-homeservers" />[Private/LAN 家庭服务器](/channels/matrix/accounts-and-homeservers#private%2Flan-homeservers)
- <a id="proxying-matrix-traffic" />[代理Matrix流量](/channels/matrix/accounts-and-homeservers#proxying-matrix-traffic)
- <a id="target-resolution" />[目标解析](/channels/matrix/accounts-and-homeservers#target-resolution)
- <a id="listing-requesting-and-responding-to-verifications" />[列出、请求和响应验证](/channels/matrix/encryption#listing-requesting-and-responding-to-verifications)
- <a id="session-routing-sessionscope" />[会话路由 （`sessionScope`）](/channels/matrix/threads-and-sessions#session-routing-sessionscope)
- <a id="reply-threading-threadreplies" />[回复穿线（`threadReplies`）](/channels/matrix/threads-and-sessions#reply-threading-threadreplies)
- <a id="private/lan-homeservers" />[Private/LAN 家庭服务器](/channels/matrix/accounts-and-homeservers#private/lan-homeservers)
- <a id="startup-behavior" />[启动行为](/channels/matrix/encryption#startup-behavior)
- <a id="verification-notices" />[验证通知](/channels/matrix/encryption#verification-notices)
- <a id="deleted-or-invalid-matrix-device" />[已删除或无效 Matrix 设备](/channels/matrix/encryption#deleted-or-invalid-matrix-device)
- <a id="device-hygiene" />[设备卫生](/channels/matrix/encryption#device-hygiene)
- <a id="crypto-store" />[加密货币商店](/channels/matrix/encryption#crypto-store)

## <a id="configuration-reference"></a> 配置参考

允许列表样式的用户字段（`groupAllowFrom`、`dm.allowFrom`、`groups.<room>.users`）接受完整的 Matrix 用户 ID（最安全）。默认情况下，将忽略非 ID 条目。如果设置了 `dangerouslyAllowNameMatching: true`，则在启动时以及每当监视器运行时允许列表发生更改时都会解析精确的 Matrix 目录显示名称匹配；无法解析的条目在运行时将被忽略。

房间白名单键（`groups`、旧版 `rooms`）应该是房间 ID 或别名。默认情况下，普通的房间名称键会被忽略； `dangerouslyAllowNameMatching: true` 恢复针对连接的房间名称的尽力查找。

### <a id="account-and-connection"></a> 账户与连接

- `enabled`：启用或禁用该通道。
- `name`：账户的可选显示标签。
- `defaultAccount`：配置了多个 Matrix 账户时的首选账户 ID。
- `accounts`：按账户命名的覆盖配置。顶层 `channels.matrix` 值会作为默认值被继承。
- `homeserver`：homeserver URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`：允许此帐户连接到 `localhost`、LAN/Tailscale IP 或内部主机名。
- `proxy`：用​​于 Matrix 流量的可选 HTTP（S） 代理 URL。支持每个帐户覆盖。
- `userId`：完整的 Matrix 用户 ID（`@bot:example.org`）。
- `accessToken`：基于令牌的身份验证的访问令牌。跨 env/file/exec/store 提供程序支持的明文和 SecretRef 值 （[Secrets Management](/gateway/secrets)）。
- `password`：基于密码登录所需的密码。支持明文值和 SecretRef 值。
- `deviceId`：显式的 Matrix 设备 ID。
- `deviceName`：使用密码登录时的设备显示名称。
- `avatarUrl`：用于个人资料同步和 `profile set` 更新的已存储自身头像 URL。
- `initialSyncLimit`：启动同步期间获取的最大事件数。

### <a id="encryption"></a> 加密

- `encryption`：启用 E2EE。默认值：`false`。
- `startupVerification`：`"if-unverified"`（启用 E2EE 时的默认值）或 `"off"`。当此设备未验证时，在启动时自动请求自验证。
- `startupVerificationCooldownHours`：下一次自动启动请求前的冷却时间。默认值：`24`。

### <a id="access-and-policy"></a> 访问与策略

- `groupPolicy`：`"open"`、`"allowlist"` 或 `"disabled"`。默认值：`"allowlist"`。
- `groupAllowFrom`：房间流量的用户 ID 允许列表。
- `mentionPatterns`：用于房间提及的作用域正则表达式模式。包含 `{ mode: "allow"|"deny", allowIn: [roomId, ...], denyIn: [roomId, ...] }` 的对象。控制已配置的 `agents.entries.*.groupChat.mentionPatterns` 是否按房间应用。
- `dm.enabled`：为 `false` 时，忽略所有私信。默认值：`true`。
- `dm.policy`：`"pairing"`（默认）、`"allowlist"`、`"open"` 或 `"disabled"`。在机器人加入并将房间分类为 DM 后适用；它不会影响邀请处理。
- `dm.allowFrom`：DM 流量的用户 ID 允许列表。
- `dm.sessionScope`：`"per-user"`（默认）或 `"per-room"`。
- `dm.threadReplies`：DM-仅覆盖回复线程（`"off"`、`"inbound"`、`"always"`）。
- `allowBots`：接受来自其他已配置 Matrix 机器人账户的消息（`true` 或 `"mentions"`）。
- `allowlistOnly`：当 `true` 时，将所有活动的 DM 策略（`"disabled"` 除外）和 `"open"` 组策略强制为 `"allowlist"`。不更改 `"disabled"` 策略。
- `dangerouslyAllowNameMatching`：当 `true` 时，允许 Matrix 显示用户白名单条目的名称目录查找和房间白名单键的加入房间名称查找。首选完整的 `@user:server` ID 和房间 ID 或别名。
- `autoJoin`：`"always"`、`"allowlist"` 或 `"off"`。默认值：`"off"`。适用于每个 Matrix 邀请，包括 DM-style 邀请。
- `autoJoinAllowlist`：当`autoJoin`为`"allowlist"`时允许rooms/aliases。仅房间 ID、别名或 `*` 可以匹配；运行时会警告并忽略其他条目（例如，属于 `dm.allowFrom` 的用户 ID）。别名条目根据主服务器进行解析，而不是根据受邀房间声明的状态进行解析。
- `contextVisibility`：补充上下文可见性（默认值为 `"all"`，也可以是 `"allowlist"`、`"allowlist_quote"`）。

### <a id="reply-behavior"></a> 回复行为

- `joinIntro`：介绍机器人何时加入允许的群组房间。默认值：`true`。每个帐户覆盖：`accounts.<accountId>.joinIntro`。
- `replyToMode`：`"off"`（默认）、`"first"`、`"all"` 或 `"batched"`。
- `threadReplies`：`"off"`、`"inbound"`（默认）或 `"always"`。
- `threadBindings`：用于线程绑定会话路由和生命周期的按通道覆盖配置。
- `streaming`：嵌套对象`{ mode, chunkMode, block: { enabled, coalesce }, preview: { toolProgress }, progress: { label, labels, maxLines, maxLineChars, toolProgress } }`。 `mode` 是 `"off"`（默认）、`"partial"`、`"quiet"` 或 `"progress"`。旧版 scalar/boolean 拼写通过 `openclaw doctor --fix` 迁移。
- `streaming.block.enabled`：为 `true` 时，已完成的助手区块会作为独立的进度消息保留。默认值：`false`。
- `markdown`：用于出站文本的可选 Markdown 渲染配置。
- `responsePrefix`：添加到出站回复前的可选字符串。
- `textChunkLimit`：当 `streaming.chunkMode: "length"` 时，以字符数计的出站分块大小。默认值：`4000`。
- `streaming.chunkMode`：`"length"`（默认，按字符数拆分）或 `"newline"`（在行边界处拆分）。
- `historyLimit`：当房间消息触发代理时，作为 `InboundHistory` 包含的最近房间消息数量。回退到 `messages.groupChat.historyLimit`。有效默认值为 `0`（禁用）。
- `mediaMaxMb`：出站发送和入站处理的媒体大小上限，单位为 MB。默认值：`20`。

### <a id="reaction-settings"></a> 反应设置

- `ackReaction`：此 channel/account. 的确认反应覆盖
- `ackReactionScope`：范围覆盖（默认 `"group-mentions"`，以及 `"group-all"`、`"direct"`、`"all"`、`"none"`、`"off"`）。
- `reactionNotifications`：入站反应通知模式（默认 `"own"`，或 `"off"`）。

### <a id="tooling-and-per-room-overrides"></a> 工具与按房间覆盖

- `actions`：按动作的工具门控（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。
- `groups`：每个房间的政策地图。会话标识使用解析后的稳定房间ID。 （`rooms` 是旧别名。）房间工具和提及策略使用从配置的键解析的房间 ID；入站显示名称永远不会选择另一个房间的策略。
  - `groups.<room>.account`：将继承的单个房间条目限制到特定账户。
  - `groups.<room>.enabled`：按房间开关。为 `false` 时，该房间会被忽略，仿佛不在映射中。
  - `groups.<room>.requireMention`：按房间覆盖通道级提及要求。
  - `groups.<room>.allowBots`：按房间覆盖通道级设置（`true` 或 `"mentions"`）。
  - `groups.<room>.botLoopProtection`：按房间覆盖机器人间循环保护预算。
  - `groups.<room>.users`：按房间发送者允许名单。
  - `groups.<room>.tools`：每个房间工具 allow/deny 覆盖。
  - `groups.<room>.autoReply`：按房间提及门控覆盖。`true` 会禁用该房间的提及要求；`false` 会强制重新启用。
  - `groups.<room>.skills`：按房间技能过滤器。
  - `groups.<room>.systemPrompt`：按房间系统提示片段。

### <a id="exec-approval-settings"></a> Exec 审批设置

- `execApprovals.enabled`：通过 Matrix-native 提示提供执行批准。
- `execApprovals.approvers`：允许批准的Matrix用户ID。回落至 `dm.allowFrom`。
- `execApprovals.target`：`"dm"`（默认）、`"channel"` 或 `"both"`。
- `execApprovals.agentFilter` / `execApprovals.sessionFilter`：可选的 agent/session 交付白名单。

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) - 所有支持的渠道
- [Pairing](/channels/pairing) - DM 身份验证和配对流程
- [群组](/channels/groups) - 群聊行为和提及门控
- [通道路由](/channels/channel-routing) - 消息的会话路由
- [Security](/gateway/security) - 访问模型和强化
