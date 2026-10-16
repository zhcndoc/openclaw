---
summary: "通过 imsg 提供原生 iMessage 支持（通过 stdio 传输的 JSON-RPC），并提供用于回复、tapback、效果、投票、附件和群组管理的私有 API 操作。对于符合主机要求的新 OpenClaw iMessage 设置，优先使用此方式。"
read_when:
  - "设置 iMessage 支持"
  - "调试 iMessage send/receive"
title: "iMessage"
---

<Note>
对于常见的 OpenClaw iMessage 部署，请在同一台已登录的 macOS Messages 主机上运行 Gateway 和 `imsg`。如果你的 Gateway 运行在其他位置，请将 `channels.imessage.cliPath` 指向一个透明的 SSH 包装器，由其在 Mac 上运行 `imsg`。

**入站恢复是自动的。** 在网桥或网关重新启动后，iMessage 会重播在关闭时错过的消息并抑制陈旧的“积压炸弹”。Apple 可以在推送恢复后刷新，进行重复数据删除，因此不会发送两次任何内容。没有可启用的配置 — 请参阅 [ 网桥或网关重新启动后的入站恢复](/channels/imessage/messaging#inbound-recovery-after-a-bridge-or-gateway-restart)。
</Note>

<Warning>
BlueBubbles 支持已被删除。将 `channels.bluebubbles` 配置迁移到 `channels.imessage`。 OpenClaw 仅支持 iMessage 至 `imsg`。从 [BlueBubbles 删除和 imsg iMessage 路径 ](/announcements/bluebubbles-imessage) 开始，用于简短公告，或从 [ 来自 BlueBubbles](/channels/imessage-from-bluebubbles) 开始，用于完整迁移表。
</Warning>

状态：本机外部 CLI 集成。网关生成 `imsg rpc` 并通过 stdio 讲 JSON-RPC — 没有单独的守护进程或端口。对于完整的 iMessage 通道，强烈建议使用私有 API 模式。回复、回击、效果、民意调查、附件回复和群组操作需要 `imsg launch` 和成功的私人 API 检查。

对于常见的本地安装，OpenClaw 安装程序可以在登录的 Messages Mac 上为 `imsg` 提供用户确认的 Homebrew 安装或更新。手动设置和 SSH-wrapper 拓扑仍然由操作员管理：在将运行网关或包装器的同一用户上下文中安装或更新 `imsg`。

<CardGroup cols={3}>
  <Card title="设置" icon="rocket" href="/channels/imessage/setup">
    安装插件，设置`imsg`，并授予macOS权限。
  </Card>
  <Card title="私人API" icon="wand-sparkles" href="/channels/imessage/private-api">
    禁用 SIP，注入帮助程序，并解锁本机操作。
  </Card>
  <Card title="故障排查" icon="wrench" href="/channels/imessage/troubleshooting">
    修复了静默入站、忽略聊天和失败附件的问题。
  </Card>
</CardGroup>

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [iMessage setup](/channels/imessage/setup) — 安装插件，在 Messages Mac 上设置 `imsg`，并授予完全磁盘访问和自动化。
- [启用 imsg 私有 API](/channels/imessage/private-api) — SIP 和库验证过程、帮助程序注入以及 SIP 保持开启时保持可用的内容。
- [i消息访问控制和路由](/channels/imessage/access-control) — DM 和组策略、提及门控、每组提示、ACP 绑定和配置写入。
- [iMessage 部署模式](/channels/imessage/deployment) — 专用机器人 macOS 用户、通过 Tailscale 的远程 Mac、多帐户和 DM 历史记录。
- [i消息媒体和附件](/channels/imessage/media) — 附件摄取和暂存、出站分块和传送目标格式。
- [iMessage 私有 API 操作](/channels/imessage/rich-messages) — 回击、线程回复、效果、本机民意调查、批准控制和问题反应。
- [iMessage 消息行为](/channels/imessage/messaging) — 重新启动后拆分发送 DM 合并和自动入站恢复。
- [i消息故障排除](/channels/imessage/troubleshooting) — 症状优先修复和配置参考链接。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/channels/imessage#troubleshooting`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="install-the-plugin" />[安装插件](/channels/imessage/setup#install-the-plugin)
- <a id="quick-setup" />[快速设置](/channels/imessage/setup#quick-setup)
- <a id="requirements-and-permissions-(macos)" />[要求和权限 （macOS）](</channels/imessage/setup#requirements-and-permissions-(macos)>）
- <a id="enabling-the-imsg-private-api" />[启用imsg私有API](/channels/imessage/private-api#enabling-the-imsg-private-api)
- <a id="setup" />[设置](/channels/imessage/private-api#setup)
- <a id="when-sip-stays-enabled" />[当SIP保持启用时](/channels/imessage/private-api#when-sip-stays-enabled)
- <a id="access-control-and-routing" />[访问控制和路由](/channels/imessage/access-control#access-control-and-routing)
- <a id="acp-conversation-bindings" />[ACP 对话绑定](/channels/imessage/access-control#acp-conversation-bindings)
- <a id="deployment-patterns" />[部署模式](/channels/imessage/deployment#deployment-patterns)
- <a id="media%2C-chunking%2C-and-delivery-targets" />[媒体、分块和交付目标](/channels/imessage/media#media%2C-chunking%2C-and-delivery-targets)
- <a id="private-api-actions" />[私人 API 操作](/channels/imessage/rich-messages#private-api-actions)
- <a id="config-writes" />[配置写入](/channels/imessage/access-control#config-writes)
- <a id="coalescing-split-send-dms-command--url-in-one-composition" />[合并分流发送 DM（命令 + URL 为一个组合）](/channels/imessage/messaging#coalescing-split-send-dms-command--url-in-one-composition)
- <a id="coalescing-split-send-dms-(command-%2B-url-in-one-composition)" />[合并分流发送 DM（命令 + URL 为一个组合）](</channels/imessage/messaging#coalescing-split-send-dms-(command-%2B-url-in-one-composition)>）
- <a id="inbound-recovery-after-a-bridge-or-gateway-restart" />[网桥或网关重新启动后的入站恢复](/channels/imessage/messaging#inbound-recovery-after-a-bridge-or-gateway-restart)
- <a id="operator-visible-signal" />[操作员可见信号](/channels/imessage/messaging#operator-visible-signal)
- <a id="migration" />[迁移](/channels/imessage/messaging#migration)
- <a id="troubleshooting" />[故障排除](/channels/imessage/troubleshooting#troubleshooting)
- <a id="configuration-reference-pointers" />[配置参考指针](/channels/imessage/troubleshooting#configuration-reference-pointers)
- <a id="requirements-and-permissions-macos" />[要求和权限 （macOS）](/channels/imessage/setup#requirements-and-permissions-macos)
- <a id="media-chunking-and-delivery-targets" />[媒体、分块和交付目标](/channels/imessage/media#media-chunking-and-delivery-targets)
- <a id="coalescing-split-send-dms-command-+-url-in-one-composition" />[合并分流发送 DM（命令 + URL 为一个组合）](/channels/imessage/messaging#coalescing-split-send-dms-command-+-url-in-one-composition)
- <a id="local-mac-fast-path" />[本地Mac（快速路径）](/channels/imessage/setup#local-mac-fast-path)
- <a id="install-and-verify-imsg" />[安装并验证imsg](/channels/imessage/setup#install-and-verify-imsg)
- <a id="configure-openclaw" />[配置OpenClaw](/channels/imessage/setup#configure-openclaw)
- <a id="start-gateway" />[启动网关](/channels/imessage/setup#start-gateway)
- <a id="approve-first-dm-pairing-default-dmpolicy" />[批准第一个 DM 配对（默认 dmPolicy）](/channels/imessage/setup#approve-first-dm-pairing-default-dmpolicy)
- <a id="remote-mac-over-ssh" />[ 通过 SSH](/channels/imessage/setup#remote-mac-over-ssh) 的远程 Mac
- <a id="ssh-wrapper-sends-fail-with-appleevents-1743" />[SSH 包装器发送失败，并显示 AppleEvents -1743](/channels/imessage/setup#ssh-wrapper-sends-fail-with-appleevents-1743)
- <a id="dm-policy" />[DM 政策](/channels/imessage/access-control#dm-policy)
- <a id="group-policy-%2B-mentions" />[团体政策+提及](/channels/imessage/access-control#group-policy-%2B-mentions)
- <a id="sessions-and-deterministic-replies" />[会话和回复路由](/channels/imessage/access-control#sessions-and-deterministic-replies)
- <a id="dedicated-bot-macos-user-separate-imessage-identity" />[专用机器人 macOS 用户（单独的 iMessage 身份）](/channels/imessage/deployment#dedicated-bot-macos-user-separate-imessage-identity)
- <a id="remote-mac-over-tailscale-example" />[ 通过 Tailscale 的远程 Mac（示例）](/channels/imessage/deployment#remote-mac-over-tailscale-example)
- <a id="multi-account-pattern" />[多账户模式](/channels/imessage/deployment#multi-account-pattern)
- <a id="direct-message-history" />[私信历史记录](/channels/imessage/deployment#direct-message-history)
- <a id="attachments-and-media" />[附件和介质](/channels/imessage/media#attachments-and-media)
- <a id="outbound-text-and-chunking" />[出站文本和分块](/channels/imessage/media#outbound-text-and-chunking)
- <a id="addressing-formats" />[寻址格式](/channels/imessage/media#addressing-formats)
- <a id="available-actions" />[可用操作](/channels/imessage/rich-messages#available-actions)
- <a id="message-ids" />[消息 ID](/channels/imessage/rich-messages#message-ids)
- <a id="capability-detection" />[能力检测](/channels/imessage/rich-messages#capability-detection)
- <a id="read-receipts-and-typing" />[阅读收据并打字](/channels/imessage/rich-messages#read-receipts-and-typing)
- <a id="inbound-tapbacks" />[入站回拨](/channels/imessage/rich-messages#inbound-tapbacks)
- <a id="approval-polls-and-reactions" />[投票和反应](/channels/imessage/rich-messages#approval-polls-and-reactions)
- <a id="question-reactions-1-2-3-4" />[问题反应 （1️⃣ / 2️⃣ / 3️⃣ / 4️⃣）](/channels/imessage/rich-messages#question-reactions-1-2-3-4)
- <a id="imsg-not-found-or-rpc-unsupported" />[imsg 未找到或 RPC 不受支持](/channels/imessage/troubleshooting#imsg-not-found-or-rpc-unsupported)
- <a id="messages-send-but-inbound-imessages-do-not-arrive" />[消息已发送，但入站 iMessage 未到达](/channels/imessage/troubleshooting#messages-send-but-inbound-imessages-do-not-arrive)
- <a id="gateway-is-not-running-on-macos" />[Gateway 未在 macOS 上运行](/channels/imessage/troubleshooting#gateway-is-not-running-on-macos)
- <a id="dms-are-ignored" />[DM 被忽略](/channels/imessage/troubleshooting#dms-are-ignored)
- <a id="group-messages-are-ignored" />[群组消息被忽略](/channels/imessage/troubleshooting#group-messages-are-ignored)
- <a id="remote-attachments-fail" />[远程附件失败](/channels/imessage/troubleshooting#remote-attachments-fail)
- <a id="macos-permission-prompts-were-missed" />[ 错过了 macOS 权限提示](/channels/imessage/troubleshooting#macos-permission-prompts-were-missed)

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="渠道概览" icon="list" href="/channels">
    所有支持的频道。
  </Card>
  <Card title="从 BlueBubbles 迁移" icon="right-left" href="/channels/imessage-from-bluebubbles">
    配置转换表和逐步切换。
  </Card>
  <Card title="配对" icon="link" href="/channels/pairing">
    DM 认证和配对流程。
  </Card>
  <Card title="反应" icon="thumbs-up" href="/tools/reactions">
    `message` 工具的表情符号反应语义。
  </Card>
  <Card title="群组" icon="users" href="/channels/groups">
    群聊行为和提及门控。
  </Card>
  <Card title="频道路由" icon="route" href="/channels/channel-routing">
    消息的会话路由。
  </Card>
  <Card title="配置参考" icon="sliders" href="/gateway/config-channels#imessage">
    iMessage 字段完整参考。
  </Card>
  <Card title="RPC 适配器" icon="plug" href="/reference/rpc">
    行分隔的 JSON-RPC stdio 协议 OpenClaw 与 `imsg rpc` 通信。
  </Card>
  <Card title="macOS 虚拟机" icon="display" href="/install/macos-vm">
    当您希望 iMessage 与主 Mac 隔离时，在沙盒 macOS VM（本地或托管）中运行 OpenClaw。
  </Card>
</CardGroup>
