---
summary: "Discord 机器人设置、配置键、组件、语音和故障排查"
read_when:
  - "处理 Discord 频道功能时"
title: "Discord"
---

OpenClaw 通过官方 Discord 网关以机器人身份连接到 Discord。支持私信和服务器频道。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Discord 私信默认使用配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    本机命令行为和命令目录。
  </Card>
  <Card title="频道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断和修复流程。
  </Card>
</CardGroup>

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [Discord setup](/channels/discord/setup) — 安装应用程序、邀请机器人、配对并准备公会工作区。
- [Discord 访问控制](/channels/discord/access-control) — DM 策略、行会白名单、提及门控、角色路由和操作门。
- [Discord 消息行为](/channels/discord/messaging) — 运行时模型、回复标签、链接预览、ack 反应和提及别名。
- [Discord 线程和会话](/channels/discord/threads-and-sessions) — 论坛线程、历史记录限制、子代理线程和 ACP 绑定。
- [Discord 组件和批准](/channels/discord/rich-messages) — 组件 v2 容器、交互和执行批准。
- [Discord 事件和操作](/channels/discord/events) — 反应和存在唤醒、机器人存在、代理和 PluralKit。
- [Discord 语音通道](/channels/discord/voice-channels) — 实时语音对话、自动加入和语音消息附件。
- [Discord 语音笔录和会议记录](/channels/discord/voice-transcripts) — 连续捕获、笔录存储和自动笔记。
- [ 在 Discord 语音中关注用户 ](/channels/discord/voice-follow) — 让机器人加入、移动和离开选定用户的语音频道。
- [不一致故障排除](/channels/discord/troubleshooting) — 消息被阻止、意图错误、网关超时、机器人循环和 STT 丢弃。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/channels/discord#voice-channels`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="quick-setup" />[快速设置](/channels/discord/setup#quick-setup)
- <a id="recommended%3A-set-up-a-guild-workspace" />[推荐：设置公会工作区](/channels/discord/setup#recommended%3A-set-up-a-guild-workspace)
- <a id="runtime-model" />[运行时模型](/channels/discord/messaging#runtime-model)
- <a id="forum-channels" />[论坛频道](/channels/discord/threads-and-sessions#forum-channels)
- <a id="interactive-components" />[交互组件](/channels/discord/rich-messages#interactive-components)
- <a id="access-control-and-routing" />[访问控制和路由](/channels/discord/access-control#access-control-and-routing)
- <a id="guild-channel-maps-are-allowlists" />[公会频道地图属于白名单](/channels/discord/access-control#guild-channel-maps-are-allowlists)
- <a id="applying-access-policy-changes" />[应用访问策略更改](/channels/discord/access-control#applying-access-policy-changes)
- <a id="role-based-agent-routing" />[基于角色的代理路由](/channels/discord/access-control#role-based-agent-routing)
- <a id="native-commands-and-command-auth" />[本机命令和命令授权](/channels/discord/access-control#native-commands-and-command-auth)
- <a id="feature-details" />[功能详情](/channels/discord/messaging#message-behavior)
- <a id="tools-and-action-gates" />[工具和动作门](/channels/discord/access-control#tools-and-action-gates)
- <a id="components-v2-ui" />[组件 v2 UI](/channels/discord/rich-messages#components-v2-ui)
- <a id="voice" />[语音](/channels/discord/voice-channels#voice)
- <a id="voice-channels" />[语音通道](/channels/discord/voice-channels#voice-channels)
- <a id="capture-voice-transcripts" />[捕获语音记录](/channels/discord/voice-transcripts#capture-voice-transcripts)
- <a id="meeting-notes" />[会议记录](/channels/discord/voice-transcripts#meeting-notes)
- <a id="follow-users-in-voice" />[以语音方式关注用户](/channels/discord/voice-follow#follow-users-in-voice)
- <a id="voice-messages" />[语音留言](/channels/discord/voice-channels#voice-messages)
- <a id="troubleshooting" />[故障排除](/channels/discord/troubleshooting#troubleshooting)
- <a id="recommended-set-up-a-guild-workspace" />[推荐：设置公会工作区](/channels/discord/setup#recommended-set-up-a-guild-workspace)
- <a id="create-a-discord-application-and-bot" />[创建 Discord 应用程序和机器人](/channels/discord/setup#create-a-discord-application-and-bot)
- <a id="enable-privileged-intents" />[启用特权意图](/channels/discord/setup#enable-privileged-intents)
- <a id="copy-your-bot-token" />[复制您的机器人令牌](/channels/discord/setup#copy-your-bot-token)
- <a id="generate-an-invite-url-and-add-the-bot-to-your-server" />[生成邀请 URL 并将机器人添加到您的服务器](/channels/discord/setup#generate-an-invite-url-and-add-the-bot-to-your-server)
- <a id="enable-developer-mode-and-collect-your-ids" />[启用开发者模式并收集您的 ID](/channels/discord/setup#enable-developer-mode-and-collect-your-ids)
- <a id="allow-dms-from-server-members" />[允许服务器成员发DM](/channels/discord/setup#allow-dms-from-server-members)
- <a id="set-your-bot-token-securely-do-not-send-it-in-chat" />[安全地设置您的机器人令牌（不要在聊天中发送）](/channels/discord/setup#set-your-bot-token-securely-do-not-send-it-in-chat)
- <a id="configure-openclaw-and-pair" />[配置OpenClaw并配对](/channels/discord/setup#configure-openclaw-and-pair)
- <a id="ask-your-agent" />[询问您的智能体](/channels/discord/setup#ask-your-agent)
- <a id="cli-%2F-config" />[CLI / 配置](/channels/discord/setup#cli-%2F-config)
- <a id="approve-first-dm-pairing" />[批准第一个 DM 配对](/channels/discord/setup#approve-first-dm-pairing)
- <a id="ask-your-agent-2" />[询问您的智能体](/channels/discord/setup#ask-your-agent-2)
- <a id="cli" />[CLI](/channels/discord/setup#cli)
- <a id="add-your-server-to-the-guild-allowlist" />[将您的服务器添加到公会白名单](/channels/discord/setup#add-your-server-to-the-guild-allowlist)
- <a id="ask-your-agent-3" />[询问您的智能体](/channels/discord/setup#ask-your-agent-3)
- <a id="config" />[Config](/channels/discord/setup#config)
- <a id="allow-responses-without-%40mention" />[允许无 @mention](/channels/discord/setup#allow-responses-without-%40mention) 的响应
- <a id="ask-your-agent-4" />[询问您的智能体](/channels/discord/setup#ask-your-agent-4)
- <a id="config-2" />[Config](/channels/discord/setup#config-2)
- <a id="plan-for-memory-in-guild-channels" />[行会频道内存规划](/channels/discord/setup#plan-for-memory-in-guild-channels)
- <a id="ask-your-agent-5" />[询问您的智能体](/channels/discord/setup#ask-your-agent-5)
- <a id="manual" />[手动](/channels/discord/setup#manual)
- <a id="dm-policy" />[DM 政策](/channels/discord/access-control#dm-policy)
- <a id="access-groups" />[访问组](/channels/discord/access-control#access-groups)
- <a id="guild-policy" />[行会政策](/channels/discord/access-control#guild-policy)
- <a id="mentions-and-group-dms" />[提及和分组 DM](/channels/discord/access-control#mentions-and-group-dms)
- <a id="introductions-when-joining-a-server" />[加入服务器时介绍](/channels/discord/messaging#introductions-when-joining-a-server)
- <a id="reply-tags-and-native-replies" />[回复标签和本机回复](/channels/discord/messaging#reply-tags-and-native-replies)
- <a id="link-previews" />[链接预览](/channels/discord/messaging#link-previews)
- <a id="live-stream-preview" />[直播预览](/channels/discord/messaging#live-stream-preview)
- <a id="history-context-and-thread-behavior" />[H历史、上下文和线程行为](/channels/discord/threads-and-sessions#history-context-and-thread-behavior)
- <a id="thread-bound-sessions-for-subagents" />[子代理的线程绑定会话](/channels/discord/threads-and-sessions#thread-bound-sessions-for-subagents)
- <a id="persistent-acp-channel-bindings" />[持久 ACP 通道绑定](/channels/discord/threads-and-sessions#persistent-acp-channel-bindings)
- <a id="reaction-notifications" />[反应通知](/channels/discord/events#reaction-notifications)
- <a id="online-presence-events" />[在线出席活动](/channels/discord/events#online-presence-events)
- <a id="ack-reactions" />[确认反应](/channels/discord/messaging#ack-reactions)
- <a id="config-writes" />[配置写入](/channels/discord/events#config-writes)
- <a id="gateway-proxy" />[网关代理](/channels/discord/events#gateway-proxy)
- <a id="pluralkit-support" />[Plural套件支持](/channels/discord/events#pluralkit-support)
- <a id="outbound-mention-aliases" />[出站提及别名](/channels/discord/messaging#outbound-mention-aliases)
- <a id="presence-configuration" />[存在配置](/channels/discord/events#presence-configuration)
- <a id="approvals-in-discord" />[Discord](/channels/discord/rich-messages#approvals-in-discord) 的批准
- <a id="used-disallowed-intents-or-bot-sees-no-guild-messages" />[使用了不允许的意图或机器人看不到公会消息](/channels/discord/troubleshooting#used-disallowed-intents-or-bot-sees-no-guild-messages)
- <a id="guild-messages-blocked-unexpectedly" />[公会消息意外被阻止](/channels/discord/troubleshooting#guild-messages-blocked-unexpectedly)
- <a id="require-mention-false-but-still-blocked" />[要求提及错误但仍被阻止](/channels/discord/troubleshooting#require-mention-false-but-still-blocked)
- <a id="long-running-discord-turns-or-duplicate-replies" />[长时间运行Discord轮或重复回复](/channels/discord/troubleshooting#long-running-discord-turns-or-duplicate-replies)
- <a id="gateway-metadata-lookup-timeout-warnings" />[网关元数据查找超时警告](/channels/discord/troubleshooting#gateway-metadata-lookup-timeout-warnings)
- <a id="gateway-ready-timeout-restarts" />[网关READY超时重启](/channels/discord/troubleshooting#gateway-ready-timeout-restarts)
- <a id="permissions-audit-mismatches" />[权限审核不匹配](/channels/discord/troubleshooting#permissions-audit-mismatches)
- <a id="dm-and-pairing-issues" />[DM 和配对问题](/channels/discord/troubleshooting#dm-and-pairing-issues)
- <a id="bot-to-bot-loops" />[机器人到机器人循环](/channels/discord/troubleshooting#bot-to-bot-loops)
- <a id="voice-stt-drops-with-decryptionfailed" />[Voice STT 与 DecryptionFailed（...）](/channels/discord/troubleshooting#voice-stt-drops-with-decryptionfailed) 一起掉落

## <a id="configuration-reference"></a> 配置参考

主要参考：[配置参考 - Discord](/gateway/config-channels#discord)。

<Accordion id="high-signal-discord-fields" title="高信号 Discord 字段">

- startup/auth: `enabled`, `token`, `applicationId`, `accounts.*`, `allowBots`
- 政策：`groupPolicy`、`dmPolicy`、`allowFrom`、`dm.*`、`guilds.*`、`guilds.*.channels.*`
- 群组介绍：`joinIntro`、`accounts.*.joinIntro`（默认：`true`）
- 命令：`commands.native`、`commands.allowFrom`（全局）、`configWrites`、`slashCommand.ephemeral`
- 网关：`proxy`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`（默认 `2000`），`maxLinesPerMessage`（默认 `17`）
- streaming：`streaming.mode`、`streaming.chunkMode`、`streaming.preview.*`、`streaming.progress.*`、`streaming.block.*`（旧版 `streamMode`、`draftChunk`、`blockStreaming`、 `blockStreamingCoalesce`、`chunkMode` 密钥由 `openclaw doctor --fix` 迁移到 `streaming.*`）
- media: `mediaMaxMb`（限制向外发送的 Discord 上传文件大小，默认 `100`）
- 操作：`actions.*`
- 存在：`activity`、`status`、`activityType`、`activityUrl`、`autoPresence.*`
- 功能：`threadBindings`、顶级`bindings[]`（`type: "acp"`）、`pluralkit`、`execApprovals`、`intents`、`agentComponents.enabled`、`agentComponents.ttlMs`、 `activities`、`heartbeatVisibility`、`responsePrefix`

</Accordion>

### <a id="discord-activities"></a> Discord 活动

设置 `channels.discord.activities` 以使核心 `show_widget` 工具发布在 Discord 内部打开的独立 HTML 小部件。该块是选择性加入的。 Discord 静态注册活动管道，但当前频道演示者保持不可用，并且 `/discord/activity` 仍然在外部隐藏在正常 404 后面，直到启用的帐户具有可用的机器人令牌、解析的客户端密钥和应用程序 ID。有关开发人员门户、隧道、安全性和故障排除设置，请参阅 [Discord Activities](/channels/discord-activities)。

- `activities.clientSecret`：Discord 应用的 OAuth2 客户端密钥；若未设置，则回退为 `DISCORD_CLIENT_SECRET`
- `activities.applicationId`：可选的活动应用 ID；默认使用网关启动时获取到的机器人应用 ID

## <a id="safety-and-operations"></a> 安全与运维

- 将机器人令牌视为机密（在受监督的环境中优先使用 `DISCORD_BOT_TOKEN`）。
- `DISCORD_API_URL` 会覆盖进程范围的版本化 Discord REST 基础（例如，`https://discord.example.com/api/v10`）。 OpenClaw 还使用该源进行网关发现、WebSocket 连接、媒体、Webhooks、OAuth 和命令注册；设置覆盖时，请求不会回退到公共 Discord。普通 HTTP/WS 仅在环回时被接受，而 Discord 语音传输在覆盖时不可用。将其设置在网关进程环境或全局运行时 dotenv 中，而不是工作区 `.env` 中。
- 授予最低权限的 Discord 权限。
- 如果命令 deploy/state 已过时，请重新启动网关并重新检查 `openclaw channels status --probe`。

Discord 模型选择器首选项和线程绑定使用 SQLite。他们的旧 `discord/model-picker-preferences.json` 和 `discord/thread-bindings.json` 文件早于 2026 年 7 月升级支持窗口。 Doctor 会保留这些文件并报告恢复指南，而不是导入它们。保留更新前备份，[upgrade 到 OpenClaw 2026.9.5](/install/updating#upgrading-very-old-versions)，并在安装最新版本之前运行 `openclaw doctor --fix`。 7 月 SQLite 状态和 7 月命令部署缓存仍受支持。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="Discord 活动" icon="window" href="/channels/discord-activities">
    在 Discord 内启动交互式 HTML 小部件。
  </Card>
  <Card title="配对" icon="link" href="/channels/pairing">
    将 Discord 用户与网关配对。
  </Card>
  <Card title="反应" icon="thumbs-up" href="/tools/reactions">
    `message` 工具的表情符号反应语义。
  </Card>
  <Card title="群组" icon="users" href="/channels/groups">
    群聊和允许列表行为。
  </Card>
  <Card title="频道路由" icon="route" href="/channels/channel-routing">
    将入站消息路由至代理。
  </Card>
  <Card title="安全" icon="shield" href="/gateway/security">
    威胁模型与加固。
  </Card>
  <Card title="多智能体路由" icon="sitemap" href="/concepts/multi-agent">
    将服务器和频道映射到智能体。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为。
  </Card>
</CardGroup>
