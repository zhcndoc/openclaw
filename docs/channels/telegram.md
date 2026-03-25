---
summary: "Telegram 机器人支持状态、功能和配置"
read_when:
  - 在开发 Telegram 功能或处理 webhook 时
title: "Telegram"
---

# Telegram（Bot API）

状态：通过 grammY 实现机器人私聊和群组的生产就绪。默认模式为长轮询；Webhook 模式为可选。

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

    `channels.telegram.allowFrom` 接受数字 Telegram 用户 ID。支持并规范 `telegram:` / `tg:` 前缀。
    当 `dmPolicy` 为 `allowlist` 且 `allowFrom` 为空时，阻止所有私聊，且配置验证时会拒绝。
    上线时支持输入 `@username` 并解析为数字 ID。
    若升级且配置中含 `@username` 白名单项，可运行 `openclaw doctor --fix` 尝试解析（尽力而为，需 Telegram 机器人令牌）。
    若原先依赖配对存储的白名单文件，`openclaw doctor --fix` 可恢复条目至 `channels.telegram.allowFrom` 以支持白名单流程（如 `dmPolicy: "allowlist"` 时尚无显式 ID）。

    推荐拥有者的机器人配置中使用显式数字 `allowFrom` 和 `dmPolicy: "allowlist"`，确保访问策略在配置中持久保存。

    ### 查询你的 Telegram 用户 ID

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

    `groupAllowFrom` 用于群组发送者过滤。若未设置，回退到 `allowFrom`。
    `groupAllowFrom` 条目应为数字格式的 Telegram 用户 ID（支持并规范 `telegram:` / `tg:` 前缀）。
    非数字条目在授权时将被忽略。
    安全边界（2026.2.25 及以后）：群组发送者授权不再继承私聊配对存储的批准。
    配对仍限于私聊。群组请配置 `groupAllowFrom` 或针对各群/主题单独配置 `allowFrom`。
    运行时注意：若完全未配置 `channels.telegram`，默认群组策略将关闭（`allowlist`），除非显式设置了 `channels.defaults.groupPolicy`。

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

- Telegram 由网关进程拥有。
- 路由是确定性的：Telegram 入站消息回复回 Telegram（模型不选择频道）。
- 入站消息会被规范化为共享频道信封，包含回复元数据和媒体占位符。
- 群组会话按群组 ID 隔离。论坛主题通过追加 `:topic:<threadId>` 维持主题隔离。
- 私聊消息可能携带 `message_thread_id`；OpenClaw 使用线程感知的会话键路由，并保留线程 ID 用于回复。
- 长轮询使用 grammY 运行器，支持每聊/线程顺序执行。整体运行器汇聚并发使用 `agents.defaults.maxConcurrent`。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 无效）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时预览（原生草稿 + 消息编辑）">
    OpenClaw 可实时流式输出部分回复：

    - 个人聊天：通过 Telegram 原生草稿流 `sendMessageDraft`
    - 群组/主题：预览消息 + `editMessageText`

    要求：

    - `channels.telegram.streaming` 支持 `off | partial | block | progress`（默认：`partial`）
    - `progress` 映射到 Telegram 上的 `partial`（兼容跨频道命名）
    - 旧版的 `channels.telegram.streamMode` 和 boolean `streaming` 值会自动映射

    Telegram 从 Bot API 9.5（2026 年 3 月 1 日）起为所有机器人启用 `sendMessageDraft`。

    仅纯文本回复：

    - 私聊：OpenClaw 在原地更新草稿（无额外预览消息）
    - 群组/主题：OpenClaw 保持同一预览消息，最终文本直接编辑更新（无第二条消息）

    复杂回复（如媒体负载）退回正常的最终发送并清理预览消息。

    预览流与区块流独立。显式启用区块流时，OpenClaw 跳过预览流避免重复流式。

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

    1. `/pair` generates setup code
    2. paste code in iOS app
    3. `/pair pending` lists pending requests (including role/scopes)
    4. approve the request:
       - `/pair approve <requestId>` for explicit approval
       - `/pair approve` when there is only one pending request
       - `/pair approve latest` for most recent

    If a device retries with changed auth details (for example role/scopes/public key), the previous pending request is superseded and the new request uses a different `requestId`. Re-run `/pair pending` before approving.

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

    **持久 ACP 主题绑定**：论坛主题可通过顶层类型绑定将 ACP 会话钉住：

    - `bindings[]` 中 `type: "acp"` 且 `match.channel: "telegram"`

    示例：

    ```json5
    {
      agents: {
        list: [
          {
            id: "codex",
            runtime: {
              type: "acp",
              acp: {
                agent: "codex",
                backend: "acpx",
                mode: "persistent",
                cwd: "/workspace/openclaw",
              },
            },
          },
        ],
      },
      bindings: [
        {
          type: "acp",
          agentId: "codex",
          match: {
            channel: "telegram",
            accountId: "default",
            peer: { kind: "group", id: "-1001234567890:topic:42" },
          },
        },
      ],
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "42": {
                  requireMention: false,
                },
              },
            },
          },
        },
      },
    }
    ```

    当前仅支持群组和超级群的论坛主题。

    **线程绑定 ACP 会话启动：**

    - `/acp spawn <agent> --thread here|auto` 可将当前 Telegram 主题绑定至新 ACP 会话。
    - 后续主题消息直接路由至绑定的 ACP 会话（不需执行 `/acp steer`）。
    - 绑定成功后，OpenClaw 会在主题中置顶该启动确认消息。
    - 需开启 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    模板上下文包括：

    - `MessageThreadId`
    - `IsForum`

    私聊线程行为：

    - 带 `message_thread_id` 的私聊保持 DM 路由，但使用线程感知的会话键和回复目标。

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

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`：`off | own | all`（默认：`own`）
    - `channels.telegram.reactionLevel`：`off | ack | minimal | extensive`（默认：`minimal`）

    备注：

    - `own` 指用户对机器人发送消息的反应（基于已发送消息缓存的最佳努力）
    - 反应事件仍受 Telegram 访问控制限制(`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`)，非授权发件人事件会被丢弃。
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

  <Accordion title="长轮询与 Webhook">
    默认：长轮询。

    Webhook 模式配置：

    - 设置 `channels.telegram.webhookUrl`
    - 设置 `channels.telegram.webhookSecret`（设置 webhookUrl 时必需）
    - 可选 `channels.telegram.webhookPath`（默认 `/telegram-webhook`）
    - 可选 `channels.telegram.webhookHost`（默认 `127.0.0.1`）
    - 可选 `channels.telegram.webhookPort`（默认 `8787`）

    默认本地监听绑定 `127.0.0.1:8787`。

    若公网端点不同，需前置反向代理，并将 `webhookUrl` 指向公网地址。
    有意暴露外部入口时，设置如 `0.0.0.0` 的 `webhookHost`。

  </Accordion>

  <Accordion title="限制、重试及 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认 4000 字符。
    - `channels.telegram.chunkMode="newline"` 优先按段落（空行）拆分，再按长度。
    - `channels.telegram.mediaMaxMb`（默认 5MB）限制入站媒体下载/处理大小。
    - `channels.telegram.timeoutSeconds` 可覆盖 Telegram API 客户端超时（未设置则用 grammY 默认）。
    - 群聊上下文历史使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；设为 `0` 禁用。
    - 私聊历史控制：
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
  --poll-question "选个时间" --poll-option "上午10点" --poll-option "下午2点" \
  --poll-duration-seconds 300 --poll-public
```

    Telegram 专有投票标志：

    - `--poll-duration-seconds`（5-600 秒）
    - `--poll-anonymous`
    - `--poll-public`
    - 论坛主题使用 `--thread-id` 或在目标中使用 `:topic:` 语法

    Telegram send also supports:

    - `--buttons` for inline keyboards when `channels.telegram.capabilities.inlineButtons` allows it
    - `--force-document` to send outbound images and GIFs as documents instead of compressed photo or animated-media uploads

    Action gating:

    - `channels.telegram.actions.sendMessage=false` 禁止所有出站 Telegram 消息，包括投票
    - `channels.telegram.actions.poll=false` 禁止创建 Telegram 投票，但允许普通发送

  </Accordion>

  <Accordion title="Exec approvals in Telegram">
    Telegram supports exec approvals in approver DMs and can optionally post approval prompts in the originating chat or topic.

    Config path:

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`, default: `dm`)
    - `agentFilter`, `sessionFilter`

    Approvers must be numeric Telegram user IDs. When `enabled` is false or `approvers` is empty, Telegram does not act as an exec approval client. Approval requests fall back to other configured approval routes or the exec approval fallback policy.

    Delivery rules:

    - `target: "dm"` sends approval prompts only to configured approver DMs
    - `target: "channel"` sends the prompt back to the originating Telegram chat/topic
    - `target: "both"` sends to approver DMs and the originating chat/topic

    Only configured approvers can approve or deny. Non-approvers cannot use `/approve` and cannot use Telegram approval buttons.

    Channel delivery shows the command text in the chat, so only enable `channel` or `both` in trusted groups/topics. When the prompt lands in a forum topic, OpenClaw preserves the topic for both the approval prompt and the post-approval follow-up.

    Inline approval buttons also depend on `channels.telegram.capabilities.inlineButtons` allowing the target surface (`dm`, `group`, or `all`).

    Related docs: [Exec approvals](/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

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

    - Node 22+ 和定制 fetch/proxy 可能因 AbortSignal 类型不匹配导致立即中断。
    - 一些主机优先将 `api.telegram.org` 解析为 IPv6，若 IPv6 出口不稳定，会导致 Telegram API 间歇故障。
    - 日志出现 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!` 时，OpenClaw 现会重试视为可恢复网络错误。
    - VPS 主机若出口不稳定，可使用代理配置转发 Telegram API 请求：

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

    - 环境变量临时覆盖：
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

## Telegram 配置参考指引

主要参考：

- `channels.telegram.enabled`：启动/禁用频道。
- `channels.telegram.botToken`：BotFather 机器人令牌。
- `channels.telegram.tokenFile`：从文件读取令牌。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（默认 pairing）。
- `channels.telegram.allowFrom`：私聊白名单（数字 Telegram 用户 ID）。`allowlist` 需至少一个发送者 ID；`open` 需含 `"*"`。`openclaw doctor --fix` 可解析遗留的 `@用户名`，并在白名单迁移时从配对存储恢复条目。
- `channels.telegram.actions.poll`：启用或禁用 Telegram 投票创建（默认启用，仍需启用发送权限）。
- `channels.telegram.defaultTo`：CLI `--deliver` 未显式指定 `--reply-to` 时的默认 Telegram 目标。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（默认允许列表）。
- `channels.telegram.groupAllowFrom`：群组发送者白名单（数字 Telegram 用户 ID）。`openclaw doctor --fix` 可解析遗留 `@用户名`。非数字条目授权时忽略。群授权不使用私聊配对存储回退（2026.2.25 及以后）。
- 多账户优先级：
  - 配置多个账户 ID 时，请设置 `channels.telegram.defaultAccount`（或含 `channels.telegram.accounts.default`）显式默认路由。
  - 若均未设置，OpenClaw 会回退到首个标准化账户 ID，且 `openclaw doctor` 会发出警告。
  - `channels.telegram.accounts.default.allowFrom` 和 `channels.telegram.accounts.default.groupAllowFrom` 仅应用于默认账户。
  - 命名账户若无账户级允许列表，继承顶层 `channels.telegram.allowFrom` 和 `channels.telegram.groupAllowFrom`。
  - 命名账户不继承 `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`。
- `channels.telegram.groups`：群组默认与白名单（全局默认用 `"*"`）。
  - `channels.telegram.groups.<id>.groupPolicy`：群组层级 `groupPolicy` 覆盖（`open | allowlist | disabled`）。
  - `channels.telegram.groups.<id>.requireMention`：提及门控默认值。
  - `channels.telegram.groups.<id>.skills`：技能过滤（无配置 = 全部，空数组 = 无）。
  - `channels.telegram.groups.<id>.allowFrom`：群组发送者白名单覆盖。
  - `channels.telegram.groups.<id>.systemPrompt`：群组额外系统提示。
  - `channels.telegram.groups.<id>.enabled`：设置为 `false` 禁用该群组。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：主题级覆盖（群组字段与仅主题 `agentId`）。
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`：为指定主题路由特定代理（覆盖群组与绑定路由）。
  - `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`：主题级覆盖的群组策略。
  - `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：主题级提及门控覆盖。
  - 顶层 `bindings[]`，包含 `type: "acp"` 与标准主题 ID `chatId:topic:topicId` 在 `match.peer.id` 中：持久 ACP 主题绑定字段（详见[ACP 代理](/tools/acp-agents#channel-specific-settings)）。
  - `channels.telegram.direct.<id>.topics.<threadId>.agentId`：将私聊主题路由到特定代理（行为同论坛主题）。
- `channels.telegram.capabilities.inlineButtons`：`off | dm | group | all | allowlist`（默认允许列表）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：账户级覆盖。
- `channels.telegram.commands.nativeSkills`：启用/禁用 Telegram 原生技能命令。
- `channels.telegram.replyToMode`：`off | first | all`（默认关闭）。
- `channels.telegram.textChunkLimit`：出站分块大小（字符数）。
- `channels.telegram.chunkMode`：`length`（默认）或 `newline`（优先按空白行分块）。
- `channels.telegram.linkPreview`：切换出站消息链接预览（默认开启）。
- `channels.telegram.streaming`：`off | partial | block | progress`（实时预览；默认 `partial`，`progress` 映射为 `partial`，`block` 为兼容旧版）。
- `channels.telegram.mediaMaxMb`：入站媒体下载/处理上限（MB）。
- `channels.telegram.retry`：Telegram 发送助手（CLI/工具/动作）遇到可恢复 API 错误时的重试策略（重试次数、最小延迟、最大延迟、随机抖动）。
- `channels.telegram.network.autoSelectFamily`：覆盖 Node 网络族自动选择（true 启用，false 禁用）。Node 22+ 默认启用，WSL2 默认禁用。
- `channels.telegram.network.dnsResultOrder`：覆盖 DNS 结果排序 (`ipv4first` 或 `verbatim`)。Node 22+ 默认 `ipv4first`。
- `channels.telegram.proxy`：Bot API 请求代理地址（SOCKS/HTTP）。
- `channels.telegram.webhookUrl`：开启 webhook 模式（需配置 `webhookSecret`）。
- `channels.telegram.webhookSecret`：webhook secret（配置 `webhookUrl` 时必填）。
- `channels.telegram.webhookPath`：本地 webhook 路径（默认为 `/telegram-webhook`）。
- `channels.telegram.webhookHost`：本地 webhook 绑定主机（默认 `127.0.0.1`）。
- `channels.telegram.webhookPort`：本地 webhook 绑定端口（默认 `8787`）。
- `channels.telegram.actions.reactions`：控制 Telegram 工具反应权限。
- `channels.telegram.actions.sendMessage`：控制出站 Telegram 消息发送权限。
- `channels.telegram.actions.deleteMessage`：控制 Telegram 消息删除权限。
- `channels.telegram.actions.sticker`：控制 Telegram 贴纸操作权限 — 发送和搜索（默认关闭）。
- `channels.telegram.reactionNotifications`：`off | own | all` — 控制哪些反应触发系统事件（默认：`own`）。
- `channels.telegram.reactionLevel`：`off | ack | minimal | extensive` — 控制代理的反应能力（默认：`minimal`）。

- [配置参考 - Telegram](/gateway/configuration-reference#telegram)

Telegram 相关高频字段：

- 启动/认证：`enabled`, `botToken`, `tokenFile`, `accounts.*`
- 访问控制：`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, 顶层 `bindings[]`（`type: "acp"`）
- 命令菜单：`commands.native`, `commands.nativeSkills`, `customCommands`
- 线程与回复：`replyToMode`
- 流式输出：`streaming`（预览）、`blockStreaming`
- 格式与投递：`textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- 媒体与网络：`mediaMaxMb`, `timeoutSeconds`, `retry`, `network.autoSelectFamily`, `proxy`
- Webhook：`webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- 动作与能力：`capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反应相关：`reactionNotifications`, `reactionLevel`
- 写入与历史记录：`configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

## 关联文档

- [配对](/channels/pairing)
- [频道路由](/channels/channel-routing)
- [多代理路由](/concepts/multi-agent)
- [故障排查](/channels/troubleshooting)
