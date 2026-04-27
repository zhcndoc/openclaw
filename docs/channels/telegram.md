---
summary: "Telegram 机器人支持状态、功能和配置"
read_when:
  - 在开发 Telegram 功能或处理 webhook 时
title: "Telegram"
---

适用于通过 grammY 向机器人私聊和群组的生产就绪方案。长轮询是默认模式；webhook 模式可选。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Telegram 的默认私聊策略为配对。
  </Card>
  <Card title="频道故障排除" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断和修复操作手册。
  </Card>
  <Card title="网关配置" icon="settings" href="/gateway/configuration">
    完整频道配置模式及示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="在 BotFather 创建机器人令牌">
    打开 Telegram，聊天窗口输入 **@BotFather**（确保用户名精确为 `@BotFather`）。

    执行 `/newbot`，按照提示操作，保存生成的令牌。

  </Step>

  <Step title="配置令牌和私聊策略">

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

    环境变量回退：`TELEGRAM_BOT_TOKEN=...`（仅适用于默认账户）。
    Telegram 不支持使用 `openclaw channels login telegram`；请在配置文件或环境变量中配置令牌后启动网关。

  </Step>

  <Step title="启动网关并批准首次私聊">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配对码一小时后过期。

  </Step>

  <Step title="将机器人添加到群组">
    将机器人添加到您的群组，然后配置 `channels.telegram.groups` 和 `groupPolicy` 以匹配您的访问模型。
  </Step>
</Steps>

<Note>
令牌解析顺序会根据账户不同而不同。实际使用中，配置文件中的值优先于环境变量回退，且 `TELEGRAM_BOT_TOKEN` 只适用于默认账户。
</Note>

## Telegram 端设置

<AccordionGroup>
  <Accordion title="隐私模式与群组可见性">
    Telegram 机器人默认启用**隐私模式**，限制它们接收的群组消息范围。

    若机器人需查看所有群消息，可以：

    - 通过 `/setprivacy` 关闭隐私模式，或
    - 将机器人设置为群组管理员。

    切换隐私模式时，需将机器人从每个群组中移除再重新添加，以使 Telegram 应用改动。

  </Accordion>

  <Accordion title="群组权限">
    管理员身份由 Telegram 群组设置控制。

    成为管理员的机器人可收到所有群消息，适合需要持续监听的群场景。

  </Accordion>

  <Accordion title="BotFather 相关快捷切换">

    - `/setjoingroups` 控制是否允许加入群组
    - `/setprivacy` 控制群组消息可见行为

  </Accordion>
</AccordionGroup>

## 访问控制与激活

<Tabs>
  <Tab title="私聊策略">
    `channels.telegram.dmPolicy` 决定私聊访问策略：

    - `pairing`（默认）
    - `allowlist`（需要 `allowFrom` 至少包含一个发送者 ID）
    - `open`（需要 `allowFrom` 包含 `"*"`）
    - `disabled`

    `channels.telegram.allowFrom` 接受数字 Telegram 用户 ID。支持 `telegram:` / `tg:` 前缀，并会被规范化。
    `dmPolicy: "allowlist"` 且 `allowFrom` 为空时会阻止所有私聊，并在配置校验中被拒绝。
    设置仅接受数字用户 ID。
    如果您升级后配置中包含 `@username` 白名单条目，请运行 `openclaw doctor --fix` 进行解析（尽力而为；需要 Telegram bot token）。
    如果您之前依赖 pairing-store 白名单文件，`openclaw doctor --fix` 可以在白名单流程中恢复条目到 `channels.telegram.allowFrom`（例如 `dmPolicy: "allowlist"` 但尚未明确配置 ID 时）。

    推荐拥有者的机器人配置中使用显式数字 `allowFrom` 和 `dmPolicy: "allowlist"`，确保访问策略在配置中持久保存。

    常见误区：DM 配对批准并不意味着“此发送者在任何地方都已授权”。
    配对仅授予 DM 访问权限。群组发送者授权仍来自显式配置白名单。
    如果您希望“我一次授权后，DM 和群组命令都能使用”，请将您的数字 Telegram 用户 ID 放入 `channels.telegram.allowFrom`。

    ### 查找您的 Telegram 用户 ID

    更安全（无第三方机器人）：

    1. 向机器人发送私聊消息。
    2. 执行 `openclaw logs --follow`。
    3. 查找 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方工具（隐私性较低）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群组策略及白名单">
    主要控制项：

    1. **允许的群组**（`channels.telegram.groups`）
       - 无 `groups` 配置：
         - 若 `groupPolicy: "open"`：所有群组均可通过群组 ID 检查
         - 若 `groupPolicy: "allowlist"`（默认）：所有群组默认被阻止，需添加 `groups` 条目（或 `"*"`）以放行
       - 配置了 `groups`：作为白名单（明确的群组 ID 或 `"*"`）

    2. **允许的群组发送者**（`channels.telegram.groupPolicy`）
       - `open`
       - `allowlist`（默认）
       - `disabled`

    `groupAllowFrom` 用于群组发送者过滤。如果未设置，Telegram 将回退到 `allowFrom`。
    `groupAllowFrom` 条目应为数字 Telegram 用户 ID（`telegram:` / `tg:` 前缀会被规范化）。
    不要将 Telegram 群组或超级群聊 ID 放入 `groupAllowFrom`。负数聊天 ID 应放在 `channels.telegram.groups` 下。
    非数字条目在发送者授权时会被忽略。
    安全边界（`2026.2.25+`）：群组发送者授权**不**继承 DM 配对存储的批准。
    配对保持仅限 DM。对于群组，请设置 `groupAllowFrom` 或每群组/每主题 `allowFrom`。
    如果 `groupAllowFrom` 未设置，Telegram 将回退到配置 `allowFrom`，而不是配对存储。
    单所有者机器人的实用模式：在 `channels.telegram.allowFrom` 中设置您的用户 ID，不留 `groupAllowFrom`，并在 `channels.telegram.groups` 下允许目标群组。
    运行时注意：如果 `channels.telegram` 完全缺失，运行时默认为故障关闭 `groupPolicy="allowlist"`，除非显式设置了 `channels.defaults.groupPolicy`。

    例子：允许某特定群任意成员发言：

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

    示例：仅允许特定用户在指定群组内发言：

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
      常见误区：`groupAllowFrom` 不是 Telegram 群组白名单。

      - 将负数的 Telegram 群组或超级群聊 ID（如 `-1001234567890`）放在 `channels.telegram.groups` 下。
      - 想限制允许群组内哪些人可以触发机器人时，将 Telegram 用户 ID（如 `8734062810`）放在 `groupAllowFrom`。
      - 只有想允许群组中任意成员能够与机器人交互时，才使用 `groupAllowFrom: ["*"]`。
    </Warning>

  </Tab>

  <Tab title="@提及行为">
    群组回复默认需要 @提及。

    @提及可以来自：

    - 原生 `@botusername` 提及，或
    - 下列字段定义的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    会话级命令切换：

    - `/activation always`
    - `/activation mention`

    仅更新会话状态，持久化请使用配置。

    持久化配置示例：

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

    获取群聊 ID：

    - 转发一条群消息到 `@userinfobot` 或 `@getidsbot`
    - 或通过 `openclaw logs --follow` 查看 `chat.id`
    - 或从 Bot API 的 `getUpdates` 里查看

  </Tab>
</Tabs>

## 运行时行为

- Telegram 由网关进程持有。
- 路由是确定性的：Telegram 入站消息会回到 Telegram（模型不会选择频道）。
- 入站消息会归一化为共享的频道信封，并带有回复元数据和媒体占位符。
- 群组会话按群组 ID 隔离。论坛主题会附加 `:topic:<threadId>` 以保持主题隔离。
- DM 消息可以携带 `message_thread_id`；OpenClaw 会使用线程感知的会话键进行路由，并在回复中保留线程 ID。
- 长轮询使用 grammY runner，并按聊天/按线程顺序处理。整体 runner sink 并发使用 `agents.defaults.maxConcurrent`。
- 默认情况下，长轮询 watchdog 会在 120 秒内未完成 `getUpdates` 存活检查时重启。只有在长时间工作期间仍出现误判式长轮询停滞重启时，才提高 `channels.telegram.pollingStallThresholdMs`。该值以毫秒为单位，允许范围为 `30000` 到 `600000`；支持按账户覆盖。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时预览（原生草稿 + 消息编辑）">
    OpenClaw 可实时流式输出部分回复：

    - 个人聊天：通过 Telegram 原生草稿流 `sendMessageDraft`
    - 群组/主题：预览消息 + `editMessageText`

    要求：

    - `channels.telegram.streaming` 的取值为 `off | partial | block | progress`（默认：`partial`）
    - `progress` 在 Telegram 上映射为 `partial`（与跨频道命名保持兼容）
    - `streaming.preview.toolProgress` 控制工具/进度更新是否复用同一条已编辑的预览消息（默认：`true`）。设为 `false` 可保留单独的工具/进度消息。
    - 旧版 `channels.telegram.streamMode` 和布尔类型 `streaming` 值会自动映射

    Telegram 从 Bot API 9.5（2026 年 3 月 1 日）起为所有机器人启用 `sendMessageDraft`。

    仅纯文本回复：

    - 私聊：OpenClaw 在原地更新草稿（无额外预览消息）
    - 群组/主题：OpenClaw 保持同一预览消息，最终文本直接编辑更新（无第二条消息）

    复杂回复（如媒体负载）退回正常的最终发送并清理预览消息。

    - short DM/group/topic previews: OpenClaw keeps the same preview message and performs a final edit in place
    - previews older than about one minute: OpenClaw sends the completed reply as a fresh final message and then cleans up the preview, so Telegram's visible timestamp reflects completion time instead of the preview creation time

    若原生草稿传输不可用或被拒绝，OpenClaw 自动降级为 `sendMessage` + `editMessageText`。

    Telegram 特有的推理流：

    - `/reasoning stream` 在生成过程中将推理发送至实时预览
    - 最终答案不包含推理文本

  </Accordion>

  <Accordion title="格式化及 HTML 兼容回退">
    出站文本使用 Telegram 的 `parse_mode: "HTML"`。

    - 类 Markdown 文本渲染为 Telegram 可解析的 HTML。
    - 原始模型 HTML 会转义，减少解析失败。
    - 若 Telegram 拒绝 HTML，OpenClaw 会重试为纯文本。

    链接预览默认开启，可通过 `channels.telegram.linkPreview: false` 关闭。

  </Accordion>

  <Accordion title="原生命令与自定义命令">
    Telegram 命令菜单在启动时通过 `setMyCommands` 注册。

    原生命令默认：

    - `commands.native: "auto"` 为 Telegram 启用原生命令

    添加自定义命令菜单项：

```json5
{
  channels: {
    telegram: {
      customCommands: [
        { command: "backup", description: "Git 备份" },
        { command: "generate", description: "创建图像" },
      ],
    },
  },
}
```

    规则：

    - 名称归一化（去除前导 `/`，转小写）
    - 合法模式：`a-z`, `0-9`, `_`，长度 `1..32`
    - 自定义命令不能覆盖原生命令
    - 冲突/重复项被跳过并记录日志

    注意：

    - 自定义命令仅用于菜单展示，不自动实现行为
    - 插件/技能命令即使未列在菜单中，也可直接输入使用

    若禁用原生命令，内置命令将被移除。自定义／插件命令若配置，仍可注册。

    常见配置失败：

    - `setMyCommands failed` 报 `BOT_COMMANDS_TOO_MUCH` 意味着 Telegram 菜单在截断后仍溢出；需减少插件/技能/自定义命令或禁用 `channels.telegram.commands.native`。
    - 网络/拉取错误通常表明出站 DNS/HTTPS 访问 `api.telegram.org` 被阻断。

    ### 设备配对命令（`device-pair` 插件）

    安装 `device-pair` 插件后：

    1. `/pair` 生成设置代码
    2. 将代码粘贴到 iOS 应用中
    3. `/pair pending` 列出待处理请求（包括角色/范围）
    4. 批准请求：
       - `/pair approve <requestId>` 用于明确批准
       - `/pair approve` 当只有一个待处理请求时
       - `/pair approve latest` 用于最近的请求

    设置代码携带一个短效引导令牌。内置引导交接将主节点令牌保持在 `scopes: []`；任何交接的操作员令牌仍局限于 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。引导范围检查带有角色前缀，因此操作员白名单仅满足操作员请求；非操作员角色仍需要在其自己的角色前缀下拥有范围。

    如果设备重试时更改了认证详细信息（例如角色/范围、公钥），之前的待处理请求将被取代，新请求使用不同的 `requestId`。批准前请重新运行 `/pair pending`。

    详情见：[配对](/channels/pairing#pair-via-telegram-recommended-for-ios)。

  </Accordion>

  <Accordion title="内联按钮">
    配置内联键盘范围：

```json5
{
  channels: {
    telegram: {
      capabilities: {
        inlineButtons: "allowlist",
      },
    },
  },
}
```

    单账户覆盖：

```json5
{
  channels: {
    telegram: {
      accounts: {
        main: {
          capabilities: {
            inlineButtons: "allowlist",
          },
        },
      },
    },
  },
}
```

    范围可选：

    - `off`
    - `dm`
    - `group`
    - `all`
    - `allowlist`（默认）

    旧版 `capabilities: ["inlineButtons"]` 映射为 `inlineButtons: "all"`。

    消息动作示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "请选择一个选项：",
  buttons: [
    [
      { text: "是", callback_data: "yes" },
      { text: "否", callback_data: "no" },
    ],
    [{ text: "取消", callback_data: "cancel" }],
  ],
}
```

    回调点击事件作为文本传给代理：
    `callback_data: <值>`

  </Accordion>

  <Accordion title="面向代理和自动化的 Telegram 消息操作">
    Telegram 工具操作包括：

    - `sendMessage`（`to`, `content`, 可选 `mediaUrl`, `replyToMessageId`, `messageThreadId`）
    - `react`（`chatId`, `messageId`, `emoji`）
    - `deleteMessage`（`chatId`, `messageId`）
    - `editMessage`（`chatId`, `messageId`, `content`）
    - `createForumTopic`（`chatId`, `name`, 可选 `iconColor`, `iconCustomEmojiId`）

    频道消息操作提供便捷别名（`send`、`react`、`delete`、`edit`、`sticker`、`sticker-search`、`topic-create`）。

    权限控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker`（默认禁用）

    注意：`edit` 和 `topic-create` 默认启用，暂无独立开关。

    运行时发送使用活动配置/密钥快照（启动/重载），动作路径发送时不进行即席 SecretRef 重解析。

    反应移除语义见：[反应工具](/tools/reactions)。

  </Accordion>

  <Accordion title="回复线程标签">
    Telegram 支持生成输出中的显式回复线程标签：

    - `[[reply_to_current]]` 回复触发消息
    - `[[reply_to:<id>]]` 回复特定 Telegram 消息 ID

    `channels.telegram.replyToMode` 控制处理方式：

    - `off`（默认）
    - `first`
    - `all`

    备注：`off` 禁用隐式线程回复。显式 `[[reply_to_*]]` 标签依旧有效。

  </Accordion>

  <Accordion title="论坛主题和线程行为">
    论坛超级群：

    - 主题会话键追加 `:topic:<threadId>`
    - 回复和输入动作针对指定主题线程
    - 主题配置路径：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主题（`threadId=1`）特殊处理：

    - 发送消息时省略 `message_thread_id`（Telegram 拒绝发送 `sendMessage(...thread_id=1)`）
    - 输入动作仍包含 `message_thread_id`

    主题继承：主题条目除 `agentId` 外继承群组设置(`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`)。
    `agentId` 仅主题层级特有，不继承群组默认。

    **每主题代理路由**：每个主题可配置不同代理的 `agentId`，实现独立工作区、记忆和会话。示例：

    ```json5
    {
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "1": { agentId: "main" },      // 一般主题 → main 代理
                "3": { agentId: "zu" },        // 开发主题 → zu 代理
                "5": { agentId: "coder" }      // 代码审查 → coder 代理
              }
            }
          }
        }
      }
    }
    ```

    每个主题对应专属会话键：`agent:zu:telegram:group:-1001234567890:topic:3`

    **Persistent ACP topic binding**: 论坛主题可以通过顶层类型化 ACP 绑定（`bindings[]`，包含 `type: "acp"`、`match.channel: "telegram"`、`peer.kind: "group"`，以及类似 `-1001234567890:topic:42` 的带主题限定 ID）来固定 ACP 执行会话。目前仅适用于群组/超级群组中的论坛主题。参见 [ACP Agents](/tools/acp-agents)。

    **Thread-bound ACP spawn from chat**: `/acp spawn <agent> --thread here|auto` 会将当前主题绑定到一个新的 ACP 会话；后续跟进会直接路由到那里。OpenClaw 会将 spawn 确认固定在该主题内。需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    模板上下文暴露 `MessageThreadId` 和 `IsForum`。带 `message_thread_id` 的 DM 聊天仍保持 DM 路由，但会使用感知线程的会话键。

  </Accordion>

  <Accordion title="音频、视频及贴纸">
    ### 语音消息

    Telegram 区分语音笔记和音频文件。

    - 默认处理为音频文件
    - 代理回复包含标签 `[[audio_as_voice]]` 时，强制发送语音笔记

    消息动作示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/voice.ogg",
  asVoice: true,
}
```

    ### 视频消息

    Telegram 区分视频文件和视频笔记。

    消息动作示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/video.mp4",
  asVideoNote: true,
}
```

    视频笔记不支持字幕，消息文本单独发送。

    ### 贴纸

    入站贴纸处理：

    - 静态 WEBP：下载处理（占位符 `<media:sticker>`）
    - 动画 TGS：跳过
    - 视频 WEBM：跳过

    贴纸上下文字段：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    贴纸缓存文件：

    - `~/.openclaw/telegram/sticker-cache.json`

    贴纸描述尽量只调用一次且缓存，减少重复调用视觉识别。

    启用贴纸动作：

```json5
{
  channels: {
    telegram: {
      actions: {
        sticker: true,
      },
    },
  },
}
```

    发送贴纸动作：

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

    搜索缓存贴纸：

```json5
{
  action: "sticker-search",
  channel: "telegram",
  query: "cat waving",
  limit: 5,
}
```

  </Accordion>

  <Accordion title="反应通知">
    Telegram 反应通过独立的 `message_reaction` 更新抵达（与消息负载分开）。

    启用时，OpenClaw 会生成系统事件：

    - `Telegram 反应已添加：👍 由 Alice (@alice) 在消息 42 上`

    配置：

    - `channels.telegram.reactionNotifications`：`off | own | all`（默认：`own`）
    - `channels.telegram.reactionLevel`：`off | ack | minimal | extensive`（默认：`minimal`）

    备注：

    - `own` 指用户对机器人发送消息的反应（基于已发送消息缓存的最佳努力）
    - 反应事件仍受 Telegram 访问控制限制(`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`)”，非授权发件人事件会被丢弃。
    - Telegram 不提供反应更新的线程 ID。
      - 非论坛群组路由至群聊会话
      - 论坛群组路由至群组通用主题会话（`:topic:1`），而非具体发起主题

    长轮询/Webhook 的 `allowed_updates` 会自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="确认反应">
    `ackReaction` 用于 OpenClaw 处理入站消息时发送确认表情。

    解析优先级：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情备用 (`agents.list[].identity.emoji`，否则默认 "👀")

    备注：

    - Telegram 期望 Unicode 表情（例如 "👀"）。
    - 设为空字符串 `""` 可禁用该频道或账户的确认反应。

  </Accordion>

  <Accordion title="来自 Telegram 事件和命令的配置写入">
    默认启用频道配置写入（`configWrites !== false`）。

    Telegram 触发的写入包括：

    - 群组迁移事件 (`migrate_to_chat_id`) 更新 `channels.telegram.groups`
    - `/config set` 和 `/config unset` 命令（需开启命令支持）

    禁用示例：

```json5
{
  channels: {
    telegram: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="长轮询与 webhook">
    默认是长轮询。要使用 webhook 模式，请设置 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可选 `webhookPath`、`webhookHost`、`webhookPort`（默认分别为 `/telegram-webhook`、`127.0.0.1`、`8787`）。

    本地监听绑定到 `127.0.0.1:8787`。如需公网入口，可在本地端口前放置反向代理，或有意设置 `webhookHost: "0.0.0.0"`。

  </Accordion>

  <Accordion title="限制、重试与 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认值为 4000。
    - `channels.telegram.chunkMode="newline"` 在按长度拆分前优先按段落边界（空行）切分。
    - `channels.telegram.mediaMaxMb`（默认 100）限制入站和出站 Telegram 媒体大小。
    - `channels.telegram.timeoutSeconds` 覆盖 Telegram API 客户端超时（若未设置，则使用 grammY 默认值）。
    - `channels.telegram.pollingStallThresholdMs` 默认值为 `120000`；仅在误报长轮询停滞重启时调整到 `30000` 到 `600000` 之间。
    - 群组上下文历史使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；`0` 表示禁用。
    - 回复/引用/转发的补充上下文目前按接收到的原样传递。
    - Telegram 白名单主要用于限制谁可以触发代理，而不是完整的补充上下文脱敏边界。
    - DM 历史控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - Telegram 发送助手（CLI/工具/动作）的重试策略由 `channels.telegram.retry` 配置，适用于可恢复的出站 API 错误。

    CLI 发送目标可为数字聊天 ID 或用户名：

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
```

    Telegram 投票支持论坛主题：

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "发货吗？" --poll-option "是" --poll-option "否"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "选个时间" --poll-option "上午 10 点" --poll-option "下午 2 点" \
  --poll-duration-seconds 300 --poll-public
```

    Telegram 专有投票标志：

    - `--poll-duration-seconds`（5-600 秒）
    - `--poll-anonymous`
    - `--poll-public`
    - 论坛主题使用 `--thread-id` 或在目标中使用 `:topic:` 语法

    Telegram 发送还支持：

    - `--presentation` with `buttons` blocks for inline keyboards when `channels.telegram.capabilities.inlineButtons` allows it
    - `--pin` or `--delivery '{"pin":true}'` to request pinned delivery when the bot can pin in that chat
    - `--force-document` to send outbound images and GIFs as documents instead of compressed photo or animated-media uploads

    动作网关控制：

    - `channels.telegram.actions.sendMessage=false` 禁止所有出站 Telegram 消息，包括投票
    - `channels.telegram.actions.poll=false` 禁止创建 Telegram 投票，但允许普通发送

  </Accordion>

  <Accordion title="Telegram 中的执行审批">
    Telegram 支持在审批人私聊中进行执行审批，并可选择在发起聊天或主题中发布提示。审批人必须是数字 Telegram 用户 ID。

配置路径：

    - `channels.telegram.execApprovals.enabled`（当至少一个审批人可解析时自动启用）
    - `channels.telegram.execApprovals.approvers`（回退到 `allowFrom` / `defaultTo` 中的数字所有者 ID）
    - `channels.telegram.execApprovals.target`: `dm`（默认） | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    频道投递会在聊天中显示命令文本；仅在受信任的群组/主题中启用 `channel` 或 `both`。当提示落在论坛主题中时，OpenClaw 会保留该主题用于审批提示和后续跟进。执行审批默认 30 分钟后过期。

    内联审批按钮也要求 `channels.telegram.capabilities.inlineButtons` 允许目标界面（`dm`、`group` 或 `all`）。以 `plugin:` 为前缀的审批 ID 通过插件审批解析；其他则优先通过执行审批解析。

    参见 [执行审批](/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 错误回复控制

当代理遇到交付或提供商错误时，Telegram 可以回复错误文本或抑制它。两个配置键控制此行为：

| 键                                 | 值            | 默认值 | 描述                                                                                     |
| ----------------------------------- | ----------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 向聊天发送友好的错误消息。`silent` 完全抑制错误回复。 |
| `channels.telegram.errorCooldownMs` | 数字 (ms)       | `60000` | 向同一聊天发送错误回复的最小时间间隔。防止中断期间错误刷屏。        |

支持每账户、每群组和每主题覆盖（与其他 Telegram 配置键相同的继承规则）。

```json5
{
  channels: {
    telegram: {
      errorPolicy: "reply",
      errorCooldownMs: 120000,
      groups: {
        "-1001234567890": {
          errorPolicy: "silent", // 抑制此群组中的错误
        },
      },
    },
  },
}
```

## 故障排除

<AccordionGroup>
  <Accordion title="机器人对未提及的群消息无响应">

    - 若 `requireMention=false`，需关闭 Telegram 隐私模式全开放。
      - BotFather：执行 `/setprivacy` → 禁用
      - 然后从群组移除并重新添加机器人
    - `openclaw channels status` 会提醒配置期望收取未提及群消息时的风险。
    - `openclaw channels status --probe` 可检测明确的数字群组 ID；通配符 `"*"` 无法检测成员资格。
    - 快速会话测试：执行 `/activation always`。

  </Accordion>

  <Accordion title="机器人完全看不到群消息">

    - 当配置了 `channels.telegram.groups`，必须包含该群组或 `"*"`
    - 确认机器人为群成员
    - 查看日志：`openclaw logs --follow` 查找跳过原因

  </Accordion>

  <Accordion title="命令部分或全部失效">

    - 授权你的发送者身份（配对和/或数字 `allowFrom`）
    - 即使群组策略是 `open`，命令授权仍然适用
    - `setMyCommands failed` 并显示 `BOT_COMMANDS_TOO_MUCH` 表示本地菜单条目过多；需减少插件/技能/自定义命令或禁用本地菜单
    - `setMyCommands failed` 出现网络/获取错误通常表示对 `api.telegram.org` 的 DNS/HTTPS 可达性问题

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - Node 22+ + 自定义 fetch/代理在 AbortSignal 类型不匹配时可能触发立即中止行为。
    - 某些主机会将 `api.telegram.org` 先解析到 IPv6；若 IPv6 出站有问题，可能导致 Telegram API 间歇性失败。
    - 如果日志包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 现在会将其重试为可恢复的网络错误。
    - 如果日志包含 `Polling stall detected`，OpenClaw 会在默认情况下于 120 秒内没有完成的长轮询存活信号后重启轮询并重建 Telegram 传输。
    - 只有当长期运行的 `getUpdates` 调用本身正常，但你的主机仍错误地报告轮询卡住重启时，才提高 `channels.telegram.pollingStallThresholdMs`。持续性卡住通常指向主机与 `api.telegram.org` 之间的代理、DNS、IPv6 或 TLS 出站问题。
    - 在直连出站/TLS 不稳定的 VPS 主机上，可通过 `channels.telegram.proxy` 将 Telegram API 调用路由出去：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认 `autoSelectFamily=true`（WSL2 除外），`dnsResultOrder=ipv4first`。
    - 若使用 WSL2 或明确更适合 IPv4，仅需关闭自动选择：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - 默认已允许 RFC 2544 基准范围答案（`198.18.0.0/15`）用于 Telegram 媒体下载。如果受信任的 fake-IP 或透明代理在媒体下载期间将 `api.telegram.org` 重写为其他私有/内部/特殊用途地址，您可以选择加入仅限 Telegram 的 bypass：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每个账户也可在 `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 处进行相同的选择加入。
    - 如果您的代理将 Telegram 媒体主机解析为 `198.18.x.x`，请先关闭危险标志。Telegram 媒体默认已允许 RFC 2544 基准范围。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 会削弱 Telegram
      媒体 SSRF 保护。仅当受信任的操作员控制代理环境（如 Clash、Mihomo 或 Surge fake-IP 路由）在
      RFC 2544 基准范围之外合成私有或特殊用途答案时才使用它。正常公共互联网 Telegram 访问请保持关闭。
    </Warning>

    - 环境变量覆盖（临时）：
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - 验证 DNS 解析：

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

更多帮助：[频道故障排除](/channels/troubleshooting)。

## 配置参考

主要参考：[配置参考 - Telegram](/gateway/config-channels#telegram)。

<Accordion title="高信号 Telegram 字段">

- 启动/认证：`enabled`, `botToken`, `tokenFile`, `accounts.*`（`tokenFile` 必须指向普通文件；拒绝符号链接）
- 访问控制：`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, 顶层 `bindings[]`（`type: "acp"`）
- 执行审批：`execApprovals`, `accounts.*.execApprovals`
- 命令/菜单：`commands.native`, `commands.nativeSkills`, `customCommands`
- 线程/回复：`replyToMode`
- 流式传输：`streaming`（预览）、`streaming.preview.toolProgress`、`blockStreaming`
- 格式化/交付：`textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- 媒体/网络：`mediaMaxMb`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- webhook：`webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- 操作/能力：`capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反应：`reactionNotifications`, `reactionLevel`
- 错误：`errorPolicy`, `errorCooldownMs`
- 写入/历史：`configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

</Accordion>

<Note>
多账户优先级：当配置了两个或更多账户 ID 时，请设置 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`），以明确默认路由。否则 OpenClaw 会回退到第一个规范化的账户 ID，并且 `openclaw doctor` 会发出警告。命名账户会继承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不会继承 `accounts.default.*` 的值。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="配对" icon="link" href="/channels/pairing">
    将 Telegram 用户与网关配对。
  </Card>
  <Card title="群组" icon="users" href="/channels/groups">
    群组和主题允许列表行为。
  </Card>
  <Card title="频道路由" icon="route" href="/channels/channel-routing">
    将入站消息路由到代理。
  </Card>
  <Card title="安全" icon="shield" href="/gateway/security">
    威胁模型与加固。
  </Card>
  <Card title="多代理路由" icon="sitemap" href="/concepts/multi-agent">
    将群组和主题映射到代理。
  </Card>
  <Card title="故障排除" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断。
  </Card>
</CardGroup>
