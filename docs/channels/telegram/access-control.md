---
summary: "DM 策略、组白名单、提及门控和每聊天工具策略"
read_when:
  - "决定谁可以使用 DM Telegram 机器人"
  - "允许群组或论坛主题及其发件人"
  - "为群组打开或关闭提及门控"
title: "Telegram门禁"
sidebarTitle: "访问控制"
---

谁可以通过 DM 和群组与 Telegram 机器人交谈，以及他们可以让它做什么。

对 `dmPolicy`、`allowFrom`、`groupAllowFrom` 和 `groupPolicy` 的更改适用于新的准入，而无需在通道根和 `accounts.<accountId>` 下重新连接 Telegram。已承认的转弯将保留其捕获的设置。账户 creation/removal、令牌、传输设置和本机命令注册仍然刷新通道。

## <a id="access-control-and-activation"></a> 访问控制和激活

### <a id="group-bot-identity"></a> 群组机器人身份

在群组和论坛主题中，明确提及已配置的机器人句柄可寻址选定的 OpenClaw 代理。示例句柄是 `@my_bot`。即使代理角色名称与 Telegram 用户名不同，这一点也成立。组沉默策略仍然适用于不相关的流量，但机器人句柄本身绝不是“其他人”

<Tabs>
  <Tab id="dm-policy" title="DM 政策">
    `channels.telegram.dmPolicy` 控制直接消息访问：

    - `pairing`（默认）
    - `allowlist`（至少需要在 `allowFrom` 中包含一个发送者 ID）
    - `open`（要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `dmPolicy: "open"` 和 `allowFrom: ["*"]` 允许任何找到或猜测机器人用户名的 Telegram 帐户命令机器人。仅将其用于具有严格限制工具的故意公开的机器人。一主机器人应使用带有数字用户 ID 的 `allowlist`。

    `channels.telegram.allowFrom` 接受数字 Telegram 用户 ID。 `telegram:` / `tg:` 前缀被接受并标准化。在多账户配置中，限制性顶级 `channels.telegram.allowFrom` 是安全边界。帐户级别 `allowFrom: ["*"]` 不会公开该帐户，除非合并的有效白名单仍包含显式通配符。具有空 `allowFrom` 的 `dmPolicy: "allowlist"` 会阻止所有 DM，并被配置验证拒绝。安装程序仅要求提供数字用户 ID。较旧的设置可能有 `@username` 允许列表条目。运行 `openclaw doctor --fix` 将它们解析为数字 ID。该解决方案是尽力解决的，并且需要 Telegram 机器人令牌。如果您以前依赖配对存储允许列表文件，`openclaw doctor --fix` 可以将条目恢复到 `channels.telegram.allowFrom` 中的允许列表流。其中一种情况是 `dmPolicy: "allowlist"` 尚无显式 ID。

    对于单所有者机器人，更喜欢具有明确数字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，而不是依赖于之前的配对批准。

    常见困惑：DM 配对批准并不意味着“此发件人在任何地方都得到授权”。配对仅授予 DM 访问权限。如果尚不存在命令所有者，则第一个批准的配对也会设置 `commands.ownerAllowFrom`。这为仅限所有者的命令和执行批准提供了明确的操作员帐户。组发件人授权仍然来自显式配置允许列表。要使用一个身份获得 DM 和组命令的授权，请将您的数字 Telegram 用户 ID 放入 `channels.telegram.allowFrom`。对于仅限所有者的命令，请确保 `commands.ownerAllowFrom` 包含 `telegram:<your user id>`。

    使用 `channels.telegram.direct.<chatId>.tools` 为单个 DM 设置内置工具策略。`toolsBySender` 根据类型化的发送者键选择特定发送者策略，例如 `channel:telegram:<userId>` 或 `id:<userId>`：

```json5
{
  channels: {
    telegram: {
      direct: {
        "*": { tools: { deny: ["write", "edit"] } },
        "603767951": { tools: {} },
      },
    },
  },
}
```

    匹配的 `toolsBySender` 条目将替换该 DM 的 `tools`。精确的聊天条目替换整个 `"*"` 条目；它不继承通配符字段。帐户级别 `direct` 会替换存在的根 `direct` 映射，并且仅在省略时继承它。选定的直接策略、全局策略、每代理策略、`tools.toolsBySender` 和 `agents.<id>.tools.toolsBySender` 应用为相交层；任何层中的拒绝仍然会阻止该工具。 Codex 使用策略过滤的 OpenClaw 工具来明确限制转弯，并保留其本机工具表面以实现默认轮廓缩小。 ACP-bound 会话在运行时无法强制执行限制性直接策略时会拒绝该策略。

    ### <a id="finding-your-telegram-user-id"></a> 查找你的 Telegram 用户 ID

    更安全（无第三方机器人）：使用 DM 策略 `pairing`、DM 您的机器人并在其配对回复中读取 `Your Telegram user id`。您还可以运行 `openclaw logs --follow` 并读取 `telegram pairing request` 条目中的 `senderUserId`。两者均来自传入消息的 `from.id`。

    使用您的数字用户 ID 代替 `allowFrom`，而不是电话号码、用户名、chat/group、ID 或机器人的 ID。获得 ID 后，请停止关注，并将不相关的日志内容保密。如果您当前的策略阻止此流程，请使用已经验证的 ID；不要仅仅为了发现它而扩大访问范围。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方（隐私性较差）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab id="group-policy-and-allowlists" title="组策略和许可名单">
    两项控制共同生效：

    1. **允许哪些群组**（`channels.telegram.groups`）
       - 未配置 `groups`，`groupPolicy: "open"`：任何群组都可通过 group ID 检查
       - 未配置 `groups`，`groupPolicy: "allowlist"`（默认）：在你添加 `groups` 条目（或 `"*"`）之前，所有群组都被阻止
       - `groups` 配置：充当白名单（显式 ID 或 `"*"`）

    2. **群组中允许哪些发送者**（`channels.telegram.groupPolicy`）
       - `open` / `allowlist`（默认）/ `disabled`

    `groupAllowFrom` 过滤组发件人。如果未设置，Telegram 将回退到 `allowFrom`，而不是配对存储。组发件人身份验证永远不会继承 DM 配对存储批准，这是自 `2026.2.25` 以来的安全边界。 `groupAllowFrom` 条目应为数字 Telegram 用户 ID，并且 `telegram:` / `tg:` 前缀已标准化。非数字条目将被忽略。不要将群组或超级群组聊天 ID 放在此处 - 负聊天 ID 属于 `channels.telegram.groups`。在多账户配置中，根 `channels.telegram.groups` 是省略 `groups` 的账户的共享默认值。账户级 `groups` 映射将替换该账户的根映射。它不是深度合并的。显式的空帐户映射 （`groups: {}`） 使该帐户与共享组隔离。一所有者机器人的实用模式：在 `channels.telegram.allowFrom` 中设置您的用户 ID，保留 `groupAllowFrom` 未设置，并允许 `channels.telegram.groups` 下的目标组。如果配置中完全缺少 `channels.telegram`，则运行时默认为 `groupPolicy="allowlist"`，除非显式设置 `channels.defaults.groupPolicy`。

    仅所有者的群组设置：

```json5
{
  channels: {
    telegram: {
      enabled: true,
      dmPolicy: "pairing",
      allowFrom: ["<YOUR_TELEGRAM_USER_ID>"],
      groupPolicy: "allowlist",
      groups: {
        "<GROUP_CHAT_ID>": {
          requireMention: true,
        },
      },
    },
  },
}
```

    在群组中使用 `@<bot_username> ping` 进行测试。启用 `requireMention: true` 时，普通群组消息不会触发机器人。

    允许某一个特定群组中的任何成员：

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          groupPolicy: "open",
          requireMention: false,
        },
      },
    },
  },
}
```

    只允许某一个特定群组中的特定用户：

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          requireMention: true,
          allowFrom: ["8734062810", "745123456"],
        },
      },
    },
  },
}
```

    <Warning>
      常见错误：`groupAllowFrom` 不是群组 allowlist。

      - 负 Telegram group/supergroup 聊天 ID （`-1001234567890`） 位于 `channels.telegram.groups` 下。
      - Telegram 用户 ID （`8734062810`） 位于 `groupAllowFrom` 下，以限制允许组内的人员可以触发机器人。
      - 只有在想让允许的群组中的任意成员都能与机器人对话时，才使用 `groupAllowFrom: ["*"]`。

    </Warning>

  </Tab>

  <Tab id="mention-behavior" title="提及行为">
    默认情况下，群组回复需要提及。提及可以来自：

    - 原生的 `@botusername` 提及，或
    - `agents.entries.*.groupChat.mentionPatterns` 或 `messages.groupChat.mentionPatterns` 中的提及模式

    会话级切换（仅状态，不持久化）：`/activation always`、`/activation mention`。如需持久化，请使用配置：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: false },
      },
    },
  },
}
```

    要保留组中所需的提及，但允许此机器人创建的论坛主题中的普通消息，请设置 `requireMentionInBotThreads: false`：

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          requireMention: true,
          requireMentionInBotThreads: false,
        },
      },
    },
  },
}
```

    仅当 OpenClaw 知道接收机器人创建了论坛主题时，此选项才适用。主题的 `requireMentionInBotThreads` 会覆盖选定的组设置。将其设置为 `true` 以要求在这些主题中提及，即使普通 `requireMention` 是 `false` 或消息回复机器人。本机和授权控制命令保持其现有行为。省略保留现有提及政策的选项。

    Telegram 必须传递普通群组消息才能使 `false` 工作：禁用隐私模式或使机器人成为群组管理员。请参阅 [ 隐私模式和组可见性](/channels/telegram/setup#privacy-mode-and-group-visibility)。组和发件人授权、组静默策略和可见回复策略仍然适用。请参阅 [Bot 创建的论坛主题](/channels/telegram/threads-and-sessions#bot-created-forum-topics) 了解所有权跟踪及其限制。

    组历史上下文以 `historyLimit`（默认 50）为界。设置 `channels.telegram.historyLimit: 0` 以禁用自动窗口，而不删除保留的组消息或禁用显式历史记录读取。当需要提及时，允许未提及的消息将被记录，而无需启动座席轮流。请参阅 [ 保留组历史记录 ](/channels/telegram/messaging#retained-group-history)。 `openclaw doctor --fix` 删除已停用的 `includeGroupHistoryContext` 密钥。

    获取群聊ID：将群消息转发到`@userinfobot` / `@getidsbot`，从`openclaw logs --follow`读取`chat.id`，检查Bot API `getUpdates`，或者（一旦允许群）运行`/whoami@<bot_username>`。

  </Tab>
</Tabs>
