---
summary: "WhatsApp、Telegram、Signal、iMessage 和 LINE 的每通道配置键"
read_when:
  - "配置 WhatsApp、Telegram、Signal、iMessage 或 LINE"
  - "对个人消息通道上的机器人令牌、配对或媒体限制进行故障排除"
  - "为远程消息 Mac 设置 iMessage SSH 包装器"
title: "配置——个人消息通道"
---

`channels.*` 个人消息通道密钥：WhatsApp、Telegram、Signal、iMessage 和 LINE。

## WhatsApp

WhatsApp 通过网关的 Web 渠道（Baileys Web）运行。只要存在已链接的会话，就会自动启动。

```json5
{
  channels: {
    whatsapp: {
      enabled: true,
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "+447700900123"],
      textChunkLimit: 4000,
      streaming: { chunkMode: "length" }, // length | newline
      mediaMaxMb: 50,
      sendReadReceipts: true, // blue ticks (false in self-chat mode)
      groups: {
        "*": { requireMention: true },
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

- 具有 `type: "acp"` 的顶级 `bindings[]` 条目为 WhatsApp DM 和组配置持久 ACP 绑定。使用 E.164 直拨号码或 `match.peer.id` 中的 WhatsApp 群组 JID。字段语义在 [ACP Agents](/tools/acp-agents#persistent-channel-bindings) 中共享。

<Accordion id="multi-account-whatsapp" title="多账户 WhatsApp">

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        default: {},
        personal: {},
        biz: {
          // authDir: "~/.openclaw/credentials/whatsapp/biz",
        },
      },
    },
  },
}
```

- 出站命令默认使用 `default` 账号（如果存在）；否则使用排序后的第一个已配置账号 id。
- 可选的 `channels.whatsapp.defaultAccount` 会在其与已配置账号 id 匹配时覆盖该回退默认账号选择。
- 旧的单账号 Baileys auth dir 会由 `openclaw doctor` 迁移到 `whatsapp/default`。
- 每账号覆盖：`channels.whatsapp.accounts.<id>.sendReadReceipts`、`channels.whatsapp.accounts.<id>.dmPolicy`、`channels.whatsapp.accounts.<id>.allowFrom`。

</Accordion>

## Telegram

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "your-bot-token",
      dmPolicy: "pairing",
      allowFrom: ["tg:123456789"],
      groups: {
        "*": { requireMention: true },
        "-1001234567890": {
          allowFrom: ["@admin"],
          systemPrompt: "Keep answers brief.",
          topics: {
            "99": {
              requireMention: false,
              skills: ["search"],
              systemPrompt: "Stay on topic.",
            },
          },
        },
      },
      customCommands: [
        { command: "backup", description: "Git backup" },
        { command: "generate", description: "Create an image" },
      ],
      historyLimit: 50,
      replyToMode: "first", // off | first | all | batched
      linkPreview: true,
      streaming: { mode: "partial" }, // off | partial | block | progress (default: partial)
      actions: { reactions: true, sendMessage: true },
      reactionNotifications: "own", // off | own | all
      mediaMaxMb: 100,
      network: {
        autoSelectFamily: true,
        dnsResultOrder: "ipv4first",
      },
      apiRoot: "https://api.telegram.org",
      trustedLocalFileRoots: ["/srv/telegram-bot-api-data"],
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://example.com/telegram-webhook",
      webhookSecret: "secret",
      webhookPath: "/telegram-webhook",
    },
  },
}
```

- 机器人令牌：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（仅限普通文件；拒绝符号链接），默认账号可回退使用 `TELEGRAM_BOT_TOKEN`。
- `channels.telegram.joinIntro` 默认为 `true`。当机器人加入允许的组或超级组时，它会使用组标题、描述和可用的固定消息发布一条介绍。 Telegram 机器人 API 无法读取加入组前的历史记录。将此选项设置为 `false` 以禁用介绍，或使用 `channels.telegram.accounts.<accountId>.joinIntro` 进行特定于账户的覆盖。每个房间进行一次介绍；参见[群加入介绍](/channels#group-join-introductions)。私人聊天中绝不会进行介绍。
- `apiRoot` 仅是 Telegram Bot API 根。使用 `https://api.telegram.org` 或您自己的 hosted/proxy 根，而不是 `https://api.telegram.org/bot<TOKEN>`； `openclaw doctor --fix` 删除了意外的尾随 `/bot<TOKEN>` 后缀。
- 对于 `--local` 模式下的自托管 Bot API 服务器，`trustedLocalFileRoots` 列出 OpenClaw 允许读取的主机路径。请将服务器数据卷挂载到 OpenClaw 主机，并配置其数据根目录或按令牌的目录；`/var/lib/telegram-bot-api` 下的容器路径会映射到这些根目录中。其他绝对路径仍会被拒绝。
- 可选 `channels.telegram.defaultAccount` 在与配置的帐户 ID 匹配时覆盖默认帐户选择。
- 在多帐户设置（2+帐户ID）中，设置显式默认值（`channels.telegram.defaultAccount`或`channels.telegram.accounts.default`）以避免回退路由；当此缺失或无效时，`openclaw doctor` 会发出警告。
- `configWrites: false` 阻止 Telegram- 启动的配置写入（超组 ID 迁移、`/config set|unset`）。
- `actions.reactions` 控制消息反应和 `emoji-list`，后者列出了当前聊天中允许的标准和自定义反应。
- 具有 `type: "acp"` 的顶级 `bindings[]` 条目为论坛主题配置持久的 ACP 绑定（在 `match.peer.id` 中使用标准 `chatId:topic:topicId` 格式）。字段语义在 [ACP Agents](/tools/acp-agents#persistent-channel-bindings) 中共享。
- Telegram 流式预览使用 `sendMessage` ＋ `editMessageText`（适用于私聊和群聊）。
- `network.dnsResultOrder` 默认值为 `"ipv4first"`，以避免常见的 IPv6 获取失败。
- 重试策略：参见 [重试策略](/concepts/retry)。

## Signal

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15555550123", // optional account binding
      dmPolicy: "pairing",
      allowFrom: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      configWrites: true,
      reactionNotifications: "own", // off | own | all | allowlist
      reactionAllowlist: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      historyLimit: 50,
    },
  },
}
```

**反应通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自`reactionAllowlist`）。

- `channels.signal.account`：将频道启动固定到特定的 Signal 账号身份。
- `channels.signal.configWrites`：允许或拒绝 Signal- 发起的配置写入。
- 可选的 `channels.signal.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。

## iMessage

OpenClaw 会启动 `imsg rpc`（通过 stdio 的 JSON-RPC）。不需要守护进程或端口。这是新 OpenClaw iMessage 设置的首选路径，前提是主机可以授予 Messages 数据库和 Automation 权限。

已移除 BlueBubbles 支持。`channels.bluebubbles` 不是当前 OpenClaw 上受支持的运行时配置面。请将旧配置迁移到 `channels.imessage`；简要说明请参阅 [BlueBubbles removal and the imsg iMessage path](/announcements/bluebubbles-imessage)，完整对照表请参阅 [Coming from BlueBubbles](/channels/imessage-from-bluebubbles)。

如果网关未在登录的 Messages Mac 上运行，请保留 `channels.imessage.enabled=true` 并将 `channels.imessage.cliPath` 设置为在该 Mac 上运行 `imsg "$@"` 的网关本地 SSH 包装器的绝对路径。将 `remoteHost` 设置为 Messages Mac，而不是网关主机。 OpenClaw 自动检测简单透明的 SSH 包装器以实现兼容性，但复杂的包装器需要显式 `remoteHost`。默认本地 `imsg` 路径为 macOS-only。

在依赖 SSH 包装器进行生产发送之前，请通过该确切的包装器验证出站 `imsg send`。某些 macOS TCC 状态将消息自动化分配给 `/usr/libexec/sshd-keygen-wrapper`，这可以使读取和检查工作，而发送失败，并显示 AppleEvents `-1743`；请参阅 [iMessage](/channels/imessage) 上的 SSH 包装器故障排除部分。

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/home/openclaw/.openclaw/scripts/imsg-ssh",
      dbPath: "/Users/user/Library/Messages/chat.db",
      remoteHost: "user@messages-mac",
      dmPolicy: "pairing",
      allowFrom: ["+15555550123", "user@example.com", "chat_id:123"],
      historyLimit: 50,
      includeAttachments: false,
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      mediaMaxMb: 16,
      service: "auto",
      sendTransport: "auto",
      region: "US",
      actions: {
        reactions: true,
        edit: true,
        unsend: true,
        reply: true,
        sendWithEffect: true,
        sendAttachment: true,
      },
    },
  },
}
```

- 可选的 `channels.imessage.defaultAccount` 会在其匹配已配置的账户 id 时覆盖默认账户选择。
- 需要对消息 DB 进行完全磁盘访问。
- 优先使用 `chat_id:<id>` 目标。使用 `imsg chats --limit 20` 列出聊天。
- 对于 SSH 设置，`cliPath` 是 Gateway 主机上的绝对路径。`remoteHost`（`host` 或 `user@host`）是 Messages Mac，`dbPath` 会在该 Mac 上解释。请使用远程数据库的绝对路径，而不要根据 Gateway 用户的主目录展开路径。
- 已配置或自动检测到的 `remoteHost` 会通过现有的严格 SSH/SCP 传输启用入站附件获取和出站文件暂存。出站文件使用仅所有者可访问的远程临时路径，并在成功、失败或超时后尽力清理；清理失败时会发出警告，并可能留下仅所有者可访问的残留文件。
- `attachmentRoots` 和 `remoteAttachmentRoots` 会限制入站附件路径（默认值：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用严格的主机密钥检查，因此请检查 `~/.ssh/known_hosts` 中是否已存在 Messages Mac 主机密钥。
- `channels.imessage.configWrites`：允许或拒绝 iMessage- 发起的配置写入。
- `channels.imessage.sendTransport`：用于普通出站回复的首选 `imsg` RPC 发送传输方式。`auto`（默认值）会在 IMCore bridge 运行时对现有聊天使用它，然后回退到 AppleScript；`bridge` 要求使用私有 API 发送；`applescript` 强制使用公开的 Messages 自动化路径。
- `channels.imessage.actions.*`：启用私有 API 操作，这些操作还受 `imsg status` / `openclaw channels status --probe` 控制。
- `channels.imessage.includeAttachments` 默认关闭；在希望代理轮次接收入站媒体之前，请将其设置为 `true`。
- bridge/gateway 重新启动后的入站恢复是自动的（GUID 重复数据删除加上陈旧积压年龄围栏）。现有的 `channels.imessage.catchup.enabled: true` 配置仍然被视为已弃用的兼容性配置文件； `catchup` 默认禁用。
- `channels.imessage.groups`：群组注册表和每个群组的设置。使用 `groupPolicy: "allowlist"` 时，请配置明确的 `chat_id` 键或 `"*"` 通配符条目，以便群组消息通过注册表检查。
- 具有 `type: "acp"` 的顶级 `bindings[]` 条目可以将 iMessage 会话绑定到持久 ACP 会话。在 `match.peer.id` 中使用规范化句柄或显式聊天目标（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共享字段语义：[ACP Agents](/tools/acp-agents#persistent-channel-bindings)。

<Accordion id="imessage-ssh-wrapper-example" title="iMessage SSH 包装示例">

```bash
#!/usr/bin/env bash
exec ssh -T messages-mac imsg "$@"
```

使用远程 `imsg` v0.13.4 时，投票必须使用 `pollOptionId`；其 `poll.vote` RPC 方法不会解析索引或文本选择器。远程环境也无法回复非零部分索引的附件。这些限制不会改变本地 `imsg` 的行为。

</Accordion>

## LINE

LINE 由插件支持并在 `channels.line` 下配置。

- `channels.line.joinIntro` 默认为 `true`。当机器人加入允许的群组或多人房间时，它会使用可用的群组名称发布一条介绍。 LINE 不公开多人房间名称或主题，其消息传递 API 无法读取之前的消息。将此选项设置为 `false` 以禁用介绍，或使用 `channels.line.accounts.<accountId>.joinIntro` 进行特定于账户的覆盖。每个房间进行一次介绍，并且不会在一对一的用户聊天中进行；参见[群加入介绍](/channels#group-join-introductions)。
- 完整的 LINE 配置、Webhook 设置和访问策略记录在 [LINE](/channels/line) 中。
