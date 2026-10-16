---
summary: "频道配置：访问控制、配对、跨 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 等的每频道密钥"
read_when:
  - "配置频道插件（认证、访问控制、多账号）"
  - "排查每频道配置键"
  - "审计 DM 策略、群组策略或提及门控"
title: "配置 — channels"
---

`channels.*` 下的每频道配置键：DM 和群组访问、多账号设置、提及门控，以及适用于 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 和其他频道插件的每频道密钥。

有关 agents、tools、gateway runtime 以及其他顶层键，请参见 [配置参考](/gateway/configuration-reference)。

## <a id="channels"></a> 渠道

每个渠道在其配置部分存在时都会自动启动（除非设置了 `enabled: false`）。Telegram 已内置于核心 `openclaw` 软件包中。其他官方渠道（iMessage、Discord、Slack、WhatsApp、Matrix、Microsoft Teams、IRC、Google Chat、Signal、Mattermost 等）都作为独立插件安装，使用 `openclaw plugins install <spec>`；完整列表和安装规格请参阅[渠道](/channels)。

## <a id="other-plugin-channels"></a> 其他插件频道

许多插件频道配置为 `channels.<id>` 并记录在其专用频道页面中（例如 Feishu、Nextcloud Talk、Nostr、QQ Bot、Synology Chat、Twitch 和 Zalo）。请参阅完整频道索引：[Channels](/channels)。

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [配置 — 共享通道策略](/gateway/config-channels/shared-policies) — DM 和组访问策略、`channels.modelByChannel`、`channels.defaults`、心跳可见性和共享多帐户模式。
- [配置 — 个人消息通道](/gateway/config-channels/personal-messaging) — WhatsApp、Telegram、Signal、iMessage 和 LINE 的 `channels.*` 密钥。
- [配置 — 工作场所聊天频道](/gateway/config-channels/workplace-chat) — Google Chat、Slack、Mattermost 和 Microsoft Teams 的 `channels.*` 密钥。
- [配置 — 社区聊天频道](/gateway/config-channels/community-chat) — Discord、Matrix 和 IRC 的 `channels.*` 密钥。
- [配置 — 群组提及门控和历史记​​录](/gateway/config-channels/mention-gating-and-history) — 提及门控、可见回复模式、DM 历史记录限制和自聊天模式。
- [配置 — 聊天命令](/gateway/config-channels/commands) — `commands.*` 块：命令界面、bash 和配置门控以及所有者白名单。

## <a id="where-each-section-moved"></a> 各部分移动的地方

此页面用于发布的每个标题都在此处保留其锚点，因此现有链接（例如 `/gateway/config-channels#imessage`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="dm-and-group-access" />[DM 并组接入](/gateway/config-channels/shared-policies#dm-and-group-access)
- <a id="channel-model-overrides" />[通道模型覆盖](/gateway/config-channels/shared-policies#channel-model-overrides)
- <a id="channel-defaults-and-heartbeat" />[通道默认和心跳](/gateway/config-channels/shared-policies#channel-defaults-and-heartbeat)
- <a id="multi-account-(all-channels)" /><a id="multi-account-all-channels" />[多账户（所有通道）](/gateway/config-channels/shared-policies#multi-account-all-channels)
- <a id="whatsapp" />[WhatsApp](/gateway/config-channels/personal-messaging#whatsapp)
- <a id="multi-account-whatsapp" />[多账户 WhatsApp](/gateway/config-channels/personal-messaging#multi-account-whatsapp)
- <a id="telegram" />[电报](/gateway/config-channels/personal-messaging#telegram)
- <a id="signal" />[信号](/gateway/config-channels/personal-messaging#signal)
- <a id="imessage" />[i消息](/gateway/config-channels/personal-messaging#imessage)
- <a id="imessage-ssh-wrapper-example" />[iMessage SSH 包装示例](/gateway/config-channels/personal-messaging#imessage-ssh-wrapper-example)
- <a id="line" />[LINE](/gateway/config-channels/personal-messaging#line)
- <a id="google-chat" />[Google Chat](/gateway/config-channels/workplace-chat#google-chat)
- <a id="slack" />[Slack](/gateway/config-channels/workplace-chat#slack)
- <a id="mattermost" />[Mattermost](/gateway/config-channels/workplace-chat#mattermost)
- <a id="microsoft-teams" />[微软Teams](/gateway/config-channels/workplace-chat#microsoft-teams)
- <a id="discord" />[Discord](/gateway/config-channels/community-chat#discord)
- <a id="matrix" />[矩阵](/gateway/config-channels/community-chat#matrix)
- <a id="irc" />[IRC](/gateway/config-channels/community-chat#irc)
- <a id="group-chat-mention-gating" />[群聊提及门控](/gateway/config-channels/mention-gating-and-history#group-chat-mention-gating)
- <a id="dm-history-limits" />[DM历史限制](/gateway/config-channels/mention-gating-and-history#dm-history-limits)
- <a id="self-chat-mode" />[自聊模式](/gateway/config-channels/mention-gating-and-history#self-chat-mode)
- <a id="commands-(chat-command-handling)" /><a id="commands-chat-command-handling" />[Commands（聊天命令处理）](/gateway/config-channels/commands#commands-chat-command-handling)
- <a id="command-details" />[命令详情](/gateway/config-channels/commands#command-details)

---

## <a id="related"></a> 相关内容

- [配置参考](/gateway/configuration-reference) — 顶级键
- [配置 — 代理](/gateway/config-agents)
- [渠道概览](/channels)
