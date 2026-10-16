---
summary: "Slack 设置和运行时行为（Socket Mode、HTTP Request URLs 和 relay 模式）"
read_when:
  - "设置 Slack 或调试 Slack socket、HTTP 或 relay 模式"
title: "Slack"
---

Slack 支持涵盖通过 Slack 应用程序集成的 DM 和渠道。默认传输是套接字模式。还支持 HTTP 请求 URL。中继模式适用于受信任路由器拥有 Slack 入口的托管部署。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Slack 私信默认使用配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    本机命令行为和命令目录。
  </Card>
  <Card title="频道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
</CardGroup>

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [Slack setup](/channels/slack/setup) — 安装插件，创建 Slack 应用程序并配置令牌。
- [Slack 传输](/channels/slack/transports) — 套接字模式、HTTP 请求 URL 和中继模式进行比较。
- [Slack Enterprise Grid](/channels/slack/enterprise-grid) — 跨网格组织的组织范围安装。
- [Slack 清单和范围](/channels/slack/manifest-and-scopes) — 基本应用程序清单、OAuth 范围和可选设置。
- [Slack 访问控制](/channels/slack/access-control) — DM 策略、通道允许列表、提及门控和操作门。
- [Slack 线程和会话](/channels/slack/threads-and-sessions) — 会话密钥、回复线程和代理视图 DM。
- [Slack 消息行为](/channels/slack/messaging) — ack 反应、流式预览和斜线命令。
- [Slack 媒体和附件](/channels/slack/media) — 音频剪辑、入站文件、分块和交付目标。
- [Slack 图表、表格和批准](/channels/slack/rich-messages) — 本机图表、表格、模态和批准按钮。
- [Slack 事件和操作](/channels/slack/events) — 系统事件、交互和状态轮询。
- [Slack 故障排除](/channels/slack/troubleshooting) — 静默通道、被忽略的 DM 和死传输。

## <a id="huddles"></a> H乱七八糟

使用单独的 [Slack 会话插件 ](/plugins/slack-huddles) 将客服人员呼叫到活动会话中。它在 OpenClaw Chrome 配置文件中驱动 Slack，并作为专用 Slack 用户帐户登录。 Slack 应用程序和机器人令牌无法加入群组或读取其音频。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/channels/slack#text-streaming`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="choosing-a-transport" />[选择运输](/channels/slack/transports#choosing-a-transport)
- <a id="relay-mode" />[继电器方式](/channels/slack/transports#relay-mode)
- <a id="enterprise-grid-org-wide-installs" />[Enterprise Grid 组织范围安装](/channels/slack/enterprise-grid#enterprise-grid-org-wide-installs)
- <a id="socket-mode" />[插座 Mode](/channels/slack/enterprise-grid#socket-mode)
- <a id="http-request-urls" />[HTTP 请求 URL](/channels/slack/enterprise-grid#http-request-urls)
- <a id="install" />[安装](/channels/slack/setup#install)
- <a id="quick-setup" />[快速设置](/channels/slack/setup#quick-setup)
- <a id="user-identity-(post-as-a-real-person)" />[用户身份（以真人身份发帖）](</channels/slack/setup#user-identity-(post-as-a-real-person)>）
- <a id="socket-mode-transport-tuning" />[套接字模式传输调整](/channels/slack/transports#socket-mode-transport-tuning)
- <a id="manifest-and-scope-checklist" />[清单和范围清单](/channels/slack/manifest-and-scopes#manifest-and-scope-checklist)
- <a id="additional-manifest-settings" />[附加清单设置](/channels/slack/manifest-and-scopes#additional-manifest-settings)
- <a id="token-model" />[代币模型](/channels/slack/setup#token-model)
- <a id="actions-and-gates" />[动作和门](/channels/slack/access-control#actions-and-gates)
- <a id="access-control-and-routing" />[访问控制和路由](/channels/slack/access-control#access-control-and-routing)
- <a id="group-dms-(mpdms)-and-bots" />[Group DM （MPDM） 和机器人](</channels/slack/access-control#group-dms-(mpdms)-and-bots>）
- <a id="threading%2C-sessions%2C-and-reply-tags" />[线程、会话和回复标签](/channels/slack/threads-and-sessions#threading%2C-sessions%2C-and-reply-tags)
- <a id="agent-view-dms" />[代理查看 DM](/channels/slack/threads-and-sessions#agent-view-dms)
- <a id="ack-reactions" />[确认反应](/channels/slack/messaging#ack-reactions)
- <a id="emoji-(ackreaction)" />[Emoji （ackReaction）](</channels/slack/messaging#emoji-(ackreaction)>）
- <a id="scope-(messages.ackreactionscope)" />[范围 （messages.ackReactionScope）](</channels/slack/messaging#scope-(messages.ackreactionscope)>）
- <a id="text-streaming" />[文本流](/channels/slack/messaging#text-streaming)
- <a id="typing-reaction-fallback" />[打字反应回退](/channels/slack/messaging#typing-reaction-fallback)
- <a id="voice-input" />[语音输入](/channels/slack/media#voice-input)
- <a id="media%2C-chunking%2C-and-delivery" />[媒体、分块和交付](/channels/slack/media#media%2C-chunking%2C-and-delivery)
- <a id="commands-and-slash-behavior" />[命令和斜杠行为](/channels/slack/messaging#commands-and-slash-behavior)
- <a id="native-charts" />[原生图表](/channels/slack/rich-messages#native-charts)
- <a id="native-tables" />[本机表](/channels/slack/rich-messages#native-tables)
- <a id="plugin-owned-modal-submissions" />[插件拥有的模式提交](/channels/slack/rich-messages#plugin-owned-modal-submissions)
- <a id="native-approvals-in-slack" />[ Slack](/channels/slack/rich-messages#native-approvals-in-slack) 的本地批准
- <a id="events-and-operational-behavior" />[事件和操作行为](/channels/slack/events#events-and-operational-behavior)
- <a id="presence-events" />[出席活动](/channels/slack/events#presence-events)
- <a id="troubleshooting" />[故障排除](/channels/slack/troubleshooting#troubleshooting)
- <a id="attachment-media-reference" />[附件介质参考](/channels/slack/media#attachment-media-reference)
- <a id="supported-media-types" />[支持的介质类型](/channels/slack/media#supported-media-types)
- <a id="inbound-pipeline" />[入库管道](/channels/slack/media#inbound-pipeline)
- <a id="thread-root-attachment-inheritance" />[线程根附件继承](/channels/slack/media#thread-root-attachment-inheritance)
- <a id="multi-attachment-handling" />[多附件处理](/channels/slack/media#multi-attachment-handling)
- <a id="size%2C-download%2C-and-model-limits" />[尺寸、下载和模型限制](/channels/slack/media#size%2C-download%2C-and-model-limits)
- <a id="known-limits" />[已知限制](/channels/slack/media#known-limits)
- <a id="related-documentation" />[相关文档](/channels/slack/media#related-documentation)
- <a id="user-identity-post-as-a-real-person" />[用户身份（以真人身份发帖）](/channels/slack/setup#user-identity-post-as-a-real-person)
- <a id="group-dms-mpdms-and-bots" />[群组 DM （MPDM） 和机器人](/channels/slack/access-control#group-dms-mpdms-and-bots)
- <a id="threading-sessions-and-reply-tags" />[线程、会话和回复标签](/channels/slack/threads-and-sessions#threading-sessions-and-reply-tags)
- <a id="emoji-ackreaction" />[Emoji（确认反应）](/channels/slack/messaging#emoji-ackreaction)
- <a id="scope-messages-ackreactionscope" />[范围 （messages.ackReactionScope）](/channels/slack/messaging#scope-messages-ackreactionscope)
- <a id="media-chunking-and-delivery" />[媒体、分块和交付](/channels/slack/media#media-chunking-and-delivery)
- <a id="size-download-and-model-limits" />[尺寸、下载和模型限制](/channels/slack/media#size-download-and-model-limits)
- <a id="socket-mode-default" />[插座模式（默认）](/channels/slack/setup#socket-mode-default)
- <a id="create-a-new-slack-app" />[创建新的Slack应用程序](/channels/slack/setup#create-a-new-slack-app)
- <a id="configure-openclaw" />[配置OpenClaw](/channels/slack/setup#configure-openclaw)
- <a id="start-gateway" />[启动网关](/channels/slack/setup#start-gateway)
- <a id="http-request-urls-1" />[HTTP 请求 URL](/channels/slack/setup#http-request-urls)
- <a id="create-a-new-slack-app-1" />[创建新的Slack应用程序](/channels/slack/setup#create-a-new-slack-app-1)
- <a id="configure-openclaw-1" />[配置OpenClaw](/channels/slack/setup#configure-openclaw-1)
- <a id="start-gateway-1" />[启动网关](/channels/slack/setup#start-gateway-1)
- <a id="optional-native-slash-commands" />[可选本机斜杠命令](/channels/slack/manifest-and-scopes#optional-native-slash-commands)
- <a id="socket-mode-default-2" />[插座模式（默认）](/channels/slack/manifest-and-scopes#socket-mode-default)
- <a id="http-request-urls-2" />[HTTP 请求 URL](/channels/slack/manifest-and-scopes#http-request-urls)
- <a id="optional-authorship-scopes-write-operations" />[可选作者范围（写入操作）](/channels/slack/manifest-and-scopes#optional-authorship-scopes-write-operations)
- <a id="optional-user-token-scopes-read-operations" />[可选用户令牌范围（读取操作）](/channels/slack/manifest-and-scopes#optional-user-token-scopes-read-operations)
- <a id="dm-policy" />[DM 政策](/channels/slack/access-control#dm-policy)
- <a id="channel-policy" />[渠道政策](/channels/slack/access-control#channel-policy)
- <a id="mentions-and-channel-users" />[提及和频道用户](/channels/slack/access-control#mentions-and-channel-users)
- <a id="inbound-attachments" />[入站附件](/channels/slack/media#inbound-attachments)
- <a id="outbound-text-and-files" />[出站文本和文件](/channels/slack/media#outbound-text-and-files)
- <a id="delivery-targets" />[交货目标](/channels/slack/media#delivery-targets)
- <a id="no-replies-in-channels" />[频道中没有回复](/channels/slack/troubleshooting#no-replies-in-channels)
- <a id="dm-messages-ignored" />[DM 消息被忽略](/channels/slack/troubleshooting#dm-messages-ignored)
- <a id="agent-view-dms-share-one-session" />[代理查看DM共享一个会话](/channels/slack/troubleshooting#agent-view-dms-share-one-session)
- <a id="socket-mode-not-connecting" />[Socket模式未连接](/channels/slack/troubleshooting#socket-mode-not-connecting)
- <a id="http-mode-not-receiving-events" />[HTTP模式未接收事件](/channels/slack/troubleshooting#http-mode-not-receiving-events)
- <a id="native-slash-commands-not-firing" />[Native/slash 命令未触发](/channels/slack/troubleshooting#native-slash-commands-not-firing)

## <a id="configuration-reference"></a> 配置参考

主要参考：[配置参考 - Slack](/gateway/config-channels#slack)。

<Accordion id="high-signal-slack-fields" title="高信号 Slack 字段">

- mode/auth: `postAs`, `mode`, `botToken`, `appToken`, `userToken`, `signingSecret`, `webhookPath`, `accounts.*`
- DM 访问：`dm.enabled`、`dmPolicy`、`allowFrom`（旧版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
- 兼容性切换：`dangerouslyAllowNameMatching`（打破玻璃，除非需要，否则请勿靠近）
- 通道访问：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`、`requireMentionInBotThreads`（也根据account/channel）、`implicitMentions.*`
- 群组介绍：`joinIntro`、`accounts.*.joinIntro`（默认：`true`）
- threading/history: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- 存在唤醒：`presenceEvents.mode`、`presenceEvents.prompt`、`channels.*.presenceEvents.*`（`off|auto|on`，默认`off`）
- 传递：`textChunkLimit`、`streaming.chunkMode`、`mediaMaxMb`、`streaming`、`streaming.nativeTransport`、`streaming.preview.toolProgress`
- unfurls：`unfurlLinks`（默认：`false`），`unfurlMedia`用于`chat.postMessage` link/media预览控件。设置 `unfurlLinks: true` 以选择返回链接预览
- ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

</Accordion>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="配对" icon="link" href="/channels/pairing">
    将 Slack 用户与网关配对。
  </Card>
  <Card title="反应" icon="thumbs-up" href="/tools/reactions">
    `message` 工具的表情符号反应语义。
  </Card>
  <Card title="群组" icon="users" href="/channels/groups">
    频道和群组 DM 的行为。
  </Card>
  <Card title="频道路由" icon="route" href="/channels/channel-routing">
    将入站消息路由至代理。
  </Card>
  <Card title="安全" icon="shield" href="/gateway/security">
    威胁模型与加固。
  </Card>
  <Card title="配置" icon="sliders" href="/gateway/configuration">
    配置布局与优先级。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    命令目录与行为。
  </Card>
</CardGroup>
