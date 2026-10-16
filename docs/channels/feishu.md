---
summary: "Feishu 机器人概述、功能和配置"
read_when:
  - "您想要连接 Feishu/Lark 机器人"
  - "您正在配置 Feishu 通道"
title: "Feishu"
---

OpenClaw通过官方`@openclaw/feishu`插件连接到Feishu/Lark（一体化协作平台）：机器人DM、群聊、流媒体卡片回复和Feishu doc/wiki/drive/Bitable工具。

**状态：** 已可用于生产环境，支持机器人私信和群聊。WebSocket 是默认事件传输方式（无需公网 URL）；webhook 模式为可选。

Webhook 模式在 `/feishu/events` 共享网关 HTTP 端口（通常为 `18789`）。更新使用显式 `legacyWebhook` 引脚保留现有安装的先前端点；新安装不打开单独的端口。在移动现有回调之前，请参阅 [webhook 迁移指南](/channels/feishu/configuration-reference#gateway-webhook-route)。

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [飞书设置](/channels/feishu/setup) — 运行设置向导并了解持久的入站事件。
- [飞书访问控制](/channels/feishu/access-control) — DM策略、组策略、提及门控和chat/user ID查找。
- [飞书故障排除](/channels/feishu/troubleshooting) - 无声机器人、丢失事件、QR 设置和泄露的应用程序机密。
- [飞书高级配置](/channels/feishu/advanced-configuration) — 多账户、限制、流媒体、工作区工具、ACP 会话和多代理路由。
- [飞书动态代理](/channels/feishu/dynamic-agents) — 每个用户代理隔离，每个 DM 发送者都有自己的工作区。
- [飞书配置参考](/channels/feishu/configuration-reference) — 每个`channels.feishu`密钥都有其默认值。
- [飞书消息类型](/channels/feishu/messaging) — 接收和发送的消息类型、贴纸和帖子回复。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/channels/feishu#streaming`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="quick-start" />[快速入门](/channels/feishu/setup#quick-start)
- <a id="inbound-durability" />[入站耐久性](/channels/feishu/setup#inbound-durability)
- <a id="access-control" />[门禁](/channels/feishu/access-control#access-control)
- <a id="direct-messages" />[直接消息](/channels/feishu/access-control#direct-messages)
- <a id="group-chats" />[群聊](/channels/feishu/access-control#group-chats)
- <a id="group-configuration-examples" />[组配置示例](/channels/feishu/access-control#group-configuration-examples)
- <a id="allow-all-groups%2C-no-%40mention-required" />[允许所有组，不需要@mention](/channels/feishu/access-control#allow-all-groups%2C-no-%40mention-required)
- <a id="allow-all-groups%2C-still-require-%40mention" />[允许所有组，仍需要 @mention](/channels/feishu/access-control#allow-all-groups%2C-still-require-%40mention)
- <a id="allow-specific-groups-only" />[ 仅允许特定组](/channels/feishu/access-control#allow-specific-groups-only)
- <a id="restrict-senders-within-a-group" />[限制群组内的发件人](/channels/feishu/access-control#restrict-senders-within-a-group)
- <a id="bot-authored-messages" />[机器人编写的消息](/channels/feishu/access-control#bot-authored-messages)
- <a id="get-groupuser-ids" />[获取 group/user ID](/channels/feishu/access-control#get-groupuser-ids)
- <a id="get-group%2Fuser-ids" />[获取 group/user ID](/channels/feishu/access-control#get-group%2Fuser-ids)
- <a id="group-ids-(chat_id%2C-format%3A-oc_xxx)" />[组ID（chat_id，格式：oc_xxx）](</channels/feishu/access-control#group-ids-(chat_id%2C-format%3A-oc_xxx)>）
- <a id="user-ids-(open_id%2C-format%3A-ou_xxx)" />[用户ID（open_id，格式：ou_xxx）](</channels/feishu/access-control#user-ids-(open_id%2C-format%3A-ou_xxx)>）
- <a id="troubleshooting" />[故障排除](/channels/feishu/troubleshooting#troubleshooting)
- <a id="bot-does-not-respond-in-group-chats" />[机器人在群聊中不回复](/channels/feishu/troubleshooting#bot-does-not-respond-in-group-chats)
- <a id="bot-does-not-receive-messages" />[Bot未收到消息](/channels/feishu/troubleshooting#bot-does-not-receive-messages)
- <a id="qr-setup-does-not-react-in-the-feishu-mobile-app" />[QR 设置在 Feishu 移动应用程序中没有反应](/channels/feishu/troubleshooting#qr-setup-does-not-react-in-the-feishu-mobile-app)
- <a id="app-secret-leaked" />[应用秘密泄露](/channels/feishu/troubleshooting#app-secret-leaked)
- <a id="advanced-configuration" />[高级配置](/channels/feishu/advanced-configuration#advanced-configuration)
- <a id="multiple-accounts" />[多个账户](/channels/feishu/advanced-configuration#multiple-accounts)
- <a id="message-limits" />[消息限制](/channels/feishu/advanced-configuration#message-limits)
- <a id="streaming" />[Streaming](/channels/feishu/advanced-configuration#streaming)
- <a id="quota-optimization" />[配额优化](/channels/feishu/advanced-configuration#quota-optimization)
- <a id="group-session-scope-and-topic-threads" />[组会话范围和主题线程](/channels/feishu/advanced-configuration#group-session-scope-and-topic-threads)
- <a id="feishu-workspace-tools" />[飞书工作区工具](/channels/feishu/advanced-configuration#feishu-workspace-tools)
- <a id="acp-sessions" />[ACP 会话](/channels/feishu/advanced-configuration#acp-sessions)
- <a id="persistent-acp-binding" />[持久 ACP 绑定](/channels/feishu/advanced-configuration#persistent-acp-binding)
- <a id="spawn-acp-from-chat" />[从聊天中生成 ACP](/channels/feishu/advanced-configuration#spawn-acp-from-chat)
- <a id="multi-agent-routing" />[多代理路由](/channels/feishu/advanced-configuration#multi-agent-routing)
- <a id="per-user-agent-isolation-(dynamic-agent-creation)" />[每用户代理隔离（动态代理创建）](</channels/feishu/dynamic-agents#per-user-agent-isolation-(dynamic-agent-creation)>）
- <a id="quick-setup" />[快速设置](/channels/feishu/dynamic-agents#quick-setup)
- <a id="how-it-works" />[工作原理](/channels/feishu/dynamic-agents#how-it-works)
- <a id="configuration-options" />[配置选项](/channels/feishu/dynamic-agents#configuration-options)
- <a id="session-scope" />[会话范围](/channels/feishu/dynamic-agents#session-scope)
- <a id="typical-multi-user-deployment" />[典型多用户部署](/channels/feishu/dynamic-agents#typical-multi-user-deployment)
- <a id="verification" />[验证](/channels/feishu/dynamic-agents#verification)
- <a id="notes" />[注释](/channels/feishu/dynamic-agents#notes)
- <a id="configuration-reference" />[配置参考](/channels/feishu/configuration-reference#configuration-reference)
- <a id="supported-message-types" />[支持的消息类型](/channels/feishu/messaging#supported-message-types)
- <a id="receive" />[接收](/channels/feishu/messaging#receive)
- <a id="send" />[发送](/channels/feishu/messaging#send)
- <a id="sticker-replies" />[贴纸回复](/channels/feishu/messaging#sticker-replies)
- <a id="sticker-keyword-search" />[贴纸关键词搜索](/channels/feishu/messaging#sticker-keyword-search)
- <a id="threads-and-replies" />[主题和回复](/channels/feishu/messaging#threads-and-replies)
- <a id="run-the-channel-setup-wizard" />[运行通道设置向导](/channels/feishu/setup#run-the-channel-setup-wizard)
- <a id="after-setup-completes%2C-restart-the-gateway-to-apply-the-changes" />[设置后验证通道](/channels/feishu/setup#after-setup-completes%2C-restart-the-gateway-to-apply-the-changes)
- <a id="allow-all-groups-no-@mention-required" />[允许所有组，不需要@mention](/channels/feishu/access-control#allow-all-groups-no-@mention-required)
- <a id="allow-all-groups-still-require-@mention" />[允许所有组，仍需要 @mention](/channels/feishu/access-control#allow-all-groups-still-require-@mention)
- <a id="get-group/user-ids" />[获取 group/user ID](/channels/feishu/access-control#get-group/user-ids)
- <a id="group-ids-chat_id-format-oc_xxx" />[组ID（chat_id，格式：oc_xxx）](/channels/feishu/access-control#group-ids-chat_id-format-oc_xxx)
- <a id="user-ids-open_id-format-ou_xxx" />[用户 ID（open_id，格式：ou_xxx）](/channels/feishu/access-control#user-ids-open_id-format-ou_xxx)
- <a id="per-user-agent-isolation-dynamic-agent-creation" />[每用户代理隔离（动态代理创建）](/channels/feishu/dynamic-agents#per-user-agent-isolation-dynamic-agent-creation)

## <a id="common-commands"></a> 常用命令

| 命令   | 描述                 |
| --------- | --------------------------- |
| `/status` | 显示机器人状态             |
| `/reset`  | 重置当前会话   |
| `/model`  | 显示或切换 AI 模型 |

<Note>
Feishu/Lark 不支持本机斜杠命令菜单，因此请以纯文本消息的形式发送这些菜单。
</Note>

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) - 所有支持的渠道
- [Pairing](/channels/pairing) - DM 身份验证和配对流程
- [群组](/channels/groups) - 群聊行为和提及门控
- [通道路由](/channels/channel-routing) - 消息的会话路由
- [Reactions](/tools/reactions) - `message` 工具的表情符号反应语义
- [Security](/gateway/security) - 访问模型和强化
