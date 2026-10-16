---
summary: "支持状态、能力和配置的 Telegram 机器人"
read_when:
  - "处理 Telegram 功能或 webhooks 时"
title: "Telegram"
---

此页面将 Telegram 机器人连接到 OpenClaw 并设置允许向其发送消息的人员。

Telegram 已为机器人 DM 和通过 grammY 的群组做好了生产准备。长轮询是默认传输。 Webhook 模式是可选的。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Telegram 的默认 DM 策略是配对。
  </Card>
  <Card title="频道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
  <Card title="网关配置" icon="settings" href="/gateway/configuration">
    完整的通道配置模式和示例。
  </Card>
</CardGroup>

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [Telegram setup](/channels/telegram/setup) — 安装机器人，设置令牌，批准第一个 DM，并将机器人添加到组中。
- [电报访问控制](/channels/telegram/access-control) — DM 策略、组白名单、提及门控和每聊天工具策略。
- [电报消息行为](/channels/telegram/messaging) — 运行时模型、流预览、本机命令、回复标签和发送限制。
- [Telegram 线程和会话](/channels/telegram/threads-and-sessions) — 论坛主题会话密钥、每个主题代理和 ACP 绑定。
- [Telegram 丰富消息和批准](/channels/telegram/rich-messages) — 机器人 API 10.3 丰富消息、内联按钮、消息操作和执行批准。
- [电报媒体和附件](/channels/telegram/media) — 相册、语音和视频笔记、位置、场地和贴纸。
- [电报事件和操作](/channels/telegram/events) — 反应通知、配置写入和错误回复策略。
- [Telegram 传输](/channels/telegram/transports) — 长轮询和 webhook 模式进行比较。
- [Telegram Control UI Mini App](/channels/telegram/mini-app) — 用 `/controlui` 打开 Telegram 内的 Control UI。
- [Telegram 故障排除](/channels/telegram/troubleshooting) — 静默组、丢失命令、拒绝令牌和不稳定的轮询。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/channels/telegram#troubleshooting`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="quick-setup" />[快速设置](/channels/telegram/setup#quick-setup)
- <a id="telegram-side-settings" />[电报侧设置](/channels/telegram/setup#telegram-side-settings)
- <a id="dashboard-mini-app" />[控制 UI 迷你 App](/channels/telegram/mini-app#dashboard-mini-app)
- <a id="access-control-and-activation" />[访问控制和激活](/channels/telegram/access-control#access-control-and-activation)
- <a id="group-bot-identity" />[群组机器人身份](/channels/telegram/access-control#group-bot-identity)
- <a id="finding-your-telegram-user-id" />[查找您的 Telegram 用户 ID](/channels/telegram/access-control#finding-your-telegram-user-id)
- <a id="runtime-behavior" />[运行时行为](/channels/telegram/messaging#runtime-behavior)
- <a id="feature-reference" />[功能参考](/channels/telegram#what-each-page-covers)
- <a id="device-pairing-commands-(device-pair-plugin)" />[设备配对命令（`device-pair`插件）](</channels/telegram/messaging#device-pairing-commands-(device-pair-plugin)>）
- <a id="photo-albums" />[相册](/channels/telegram/media#photo-albums)
- <a id="audio-messages" />[音频消息](/channels/telegram/media#audio-messages)
- <a id="video-messages" />[视频留言](/channels/telegram/media#video-messages)
- <a id="locations-and-venues" />[地点和场地](/channels/telegram/media#locations-and-venues)
- <a id="stickers" />[贴纸](/channels/telegram/media#stickers)
- <a id="error-reply-controls" />[错误回复控件](/channels/telegram/events#error-reply-controls)
- <a id="troubleshooting" />[故障排除](/channels/telegram/troubleshooting#troubleshooting)
- <a id="device-pairing-commands-device-pair-plugin" />[设备配对命令（`device-pair`插件）](/channels/telegram/messaging#device-pairing-commands-device-pair-plugin)
- <a id="create-the-bot-token-in-botfather" />[在BotFather](/channels/telegram/setup#create-the-bot-token-in-botfather)中创建机器人令牌
- <a id="configure-token-and-dm-policy" />[配置令牌和DM策略](/channels/telegram/setup#configure-token-and-dm-policy)
- <a id="restart-the-gateway" />[验证通道](/channels/telegram/setup#restart-the-gateway)
- <a id="approve-your-first-dm" />[批准您的第一个 DM](/channels/telegram/setup#approve-your-first-dm)
- <a id="add-the-bot-to-a-group" />[将机器人添加到群组](/channels/telegram/setup#add-the-bot-to-a-group)
- <a id="privacy-mode-and-group-visibility" />[隐私模式和组可见性](/channels/telegram/setup#privacy-mode-and-group-visibility)
- <a id="group-permissions" />[组权限](/channels/telegram/setup#group-permissions)
- <a id="helpful-botfather-toggles" />[H有用的BotFather开关](/channels/telegram/setup#helpful-botfather-toggles)
- <a id="dm-policy" />[DM 政策](/channels/telegram/access-control#dm-policy)
- <a id="group-policy-and-allowlists" />[组策略和允许列表](/channels/telegram/access-control#group-policy-and-allowlists)
- <a id="mention-behavior" />[提及行为](/channels/telegram/access-control#mention-behavior)
- <a id="live-stream-preview-message-edits" />[直播预览（消息编辑）](/channels/telegram/messaging#live-stream-preview-message-edits)
- <a id="rich-message-formatting" />[丰富的消息格式](/channels/telegram/rich-messages#rich-message-formatting)
- <a id="native-commands-and-custom-commands" />[原生命令和自定义命令](/channels/telegram/messaging#native-commands-and-custom-commands)
- <a id="inline-buttons" />[内联按钮](/channels/telegram/rich-messages#inline-buttons)
- <a id="telegram-message-actions-for-agents-and-automation" />[代理和自动化的电报消息操作](/channels/telegram/rich-messages#telegram-message-actions-for-agents-and-automation)
- <a id="reply-threading-tags" />[回复线程标签](/channels/telegram/messaging#reply-threading-tags)
- <a id="forum-topics-and-thread-behavior" />[论坛主题和线程行为](/channels/telegram/threads-and-sessions#forum-topics-and-thread-behavior)
- <a id="photo-albums-audio-video-and-stickers" />[相册、音频、视频和贴纸](/channels/telegram/media#photo-albums-audio-video-and-stickers)
- <a id="reaction-notifications" />[反应通知](/channels/telegram/events#reaction-notifications)
- <a id="ack-reactions" />[确认反应](/channels/telegram/messaging#ack-reactions)
- <a id="config-writes-from-telegram-events-and-commands" />[Config 从 Telegram 事件和命令写入](/channels/telegram/events#config-writes-from-telegram-events-and-commands)
- <a id="long-polling-vs-webhook" />[长轮询与 webhook](/channels/telegram/transports#long-polling-vs-webhook)
- <a id="limits-and-cli-targets" />[限制和 CLI 目标](/channels/telegram/messaging#limits-and-cli-targets)
- <a id="exec-approvals-in-telegram" />[Telegram](/channels/telegram/rich-messages#exec-approvals-in-telegram)中的Exec批准
- <a id="bot-does-not-respond-to-non-mention-group-messages" />[机器人不回复非提及群组消息](/channels/telegram/troubleshooting#bot-does-not-respond-to-non-mention-group-messages)
- <a id="bot-not-seeing-group-messages-at-all" />[Bot根本看不到群组消息](/channels/telegram/troubleshooting#bot-not-seeing-group-messages-at-all)
- <a id="commands-work-partially-or-not-at-all" />[命令部分工作或根本不工作](/channels/telegram/troubleshooting#commands-work-partially-or-not-at-all)
- <a id="startup-reports-unauthorized-token" />[Startup 报告未授权令牌](/channels/telegram/troubleshooting#startup-reports-unauthorized-token)
- <a id="polling-or-network-instability" />[轮询或网络不稳定](/channels/telegram/troubleshooting#polling-or-network-instability)

## <a id="configuration-reference"></a> 配置参考

主要参考：[配置参考 - Telegram](/gateway/config-channels#telegram)。

`openclaw doctor --fix` 从以前的配置范围中删除了已停用的调整设置（`timeoutSeconds`、`mediaGroupFlushMs`、`pollingStallThresholdMs`、`retry` 和 `errorCooldownMs`）。帐户名称和特定于发件人的工具策略密钥将被保留，即使它们与已停用的设置名称匹配也是如此。

<Accordion id="high-signal-telegram-fields" title="高信号 Telegram 字段">

- startup/auth：`enabled`、`botToken`、`tokenFile`（必须是常规文件；符号链接被拒绝）、`accounts.*`
- 访问控制：`dmPolicy`, `allowFrom`, `direct.*.tools`, `direct.*.toolsBySender`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`，顶层 `bindings[]`（`type: "acp"`）
- 群组介绍：`joinIntro`、`accounts.*.joinIntro`（默认：`true`）
- topic 默认：`groups.<chatId>.topics."*"` 适用于不匹配的论坛主题；确切的主题 ID 会覆盖它
- 执行审批：`execApprovals`, `accounts.*.execApprovals`
- command/menu: `commands.native`, `commands.nativeSkills`, `customCommands`
- threading/replies: `replyToMode`, `threadBindings`
- 流式传输：`streaming`（模式 `off | partial | block | progress`），`streaming.preview.toolProgress`
- formatting/delivery: `textChunkLimit`, `streaming.chunkMode`, `richMessages`, `markdown.tables` (`off | bullets | code | block`), `linkPreview`, `responsePrefix`
- media/network: `mediaMaxMb`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- 自定义 API 根路径：`apiRoot`（仅限 Bot API 根路径；不要包含 `/bot<TOKEN>`），`trustedLocalFileRoots`（自托管 Bot API 的绝对 `file_path` 根路径）
- webhook：`webhookUrl`、`webhookSecret`、`webhookPath`、`webhookCertPath`、`legacyWebhook`（可选显式转发端点；省略或`false`仅使用网关端口）
- actions/capabilities: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker|createForumTopic|editForumTopic`
- 反应：`reactionNotifications`, `reactionLevel`
- 错误：`errorPolicy`, `silentErrorReplies`
- writes/history: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

</Accordion>

`mediaMaxMb` 接受小数限制。超大警告使用二进制单位报告有效限制，因此 `mediaMaxMb: 0.5` 显示为 `512KB`。

<Note>
多账户优先：配置两个或多个账户ID时，设置`channels.telegram.defaultAccount`（或包含`channels.telegram.accounts.default`）以使默认路由显式。否则，OpenClaw 会回退到第一个标准化帐户 ID 和 `openclaw doctor` 发出警告。省略的账户`dmPolicy`、`groupPolicy`、`allowFrom`和`groupAllowFrom`继承通道根，而不是`accounts.default.*`。明确的账户政策获胜；如果两个范围都没有设置它们，则 DM 使用 `pairing`，组使用 `allowlist`。
</Note>

## <a id="multi-agent-account-ownership"></a> 多代理账户所有权

每个 Telegram 帐户都需要一个可解析的代理所有者。要将默认帐户绑定到 `main`，请将此条目添加到顶级 `bindings` 数组中：

```json5 validate=false
{ agentId: "main", match: { channel: "telegram", accountId: "default" } }
```

使用为您的网关配置的代理和帐户 ID。失踪的所有者会通过频道状态中的确切绑定补救措施来阻止该帐户；其他帐户继续运行。添加绑定并重新启动网关。

升级旧版 `agents.list` 配置时，Doctor 在保存显式所有权之前会在绑定中保留以前的隐式帐户所有者。 Doctor 需要原始名册，并且从不提倡更窄的对话路径来实现帐户范围的所有权。缺少历史所有权需要运营商做出选择；医生报告要添加的确切绑定，而无需更改现有路线。请参阅 [ 迁移修复 ](/gateway/doctor/config-migrations#channel-ownership-during-an-update)。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="配对" icon="link" href="/channels/pairing">
    将 Telegram 用户与网关配对。
  </Card>
  <Card title="反应" icon="thumbs-up" href="/tools/reactions">
    `message` 工具的表情符号反应语义。
  </Card>
  <Card title="群组" icon="users" href="/channels/groups">
    群组和主题白名单行为。
  </Card>
  <Card title="频道路由" icon="route" href="/channels/channel-routing">
    将入站消息路由至代理。
  </Card>
  <Card title="安全" icon="shield" href="/gateway/security">
    威胁模型与加固。
  </Card>
  <Card title="多智能体路由" icon="sitemap" href="/concepts/multi-agent">
    将群组和主题映射到代理。
  </Card>
  <Card title="故障排查" icon="wrench" href="/channels/troubleshooting">
    跨渠道诊断。
  </Card>
</CardGroup>
