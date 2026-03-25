---
summary: "`openclaw message` 的命令行参考（发送消息 + 频道操作）"
read_when:
  - 添加或修改消息 CLI 操作时
  - 更改出站频道行为时
title: "message"
---

# `openclaw message`

单一出站命令，用于发送消息和频道操作
（Discord/Google Chat/Slack/Mattermost（插件）/Telegram/WhatsApp/Signal/iMessage/Microsoft Teams）。

## 用法

```
openclaw message <子命令> [标志]
```

频道选择：

- 如果配置了多个频道，则必须指定 `--channel`。
- 如果只配置了一个频道，则该频道为默认。
- 取值：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams` （Mattermost 需要插件）

目标格式 (`--target`)：

- WhatsApp: E.164 或群组 JID
- Telegram: 聊天 ID 或 `@username`
- Discord: `channel:<id>` 或 `user:<id>`（或 `<@id>` 提及；纯数字 ID 被视为频道）
- Google Chat: `spaces/<spaceId>` 或 `users/<userId>`
- Slack: `channel:<id>` 或 `user:<id>`（接受纯频道 ID）
- Mattermost (plugin): `channel:<id>`、`user:<id>` 或 `@username`（裸 ID 被视为频道）
- Signal: `+E.164`、`group:<id>`、`signal:+E.164`、`signal:group:<id>` 或 `username:<name>`/`u:<name>`
- iMessage: handle、`chat_id:<id>`、`chat_guid:<guid>` 或 `chat_identifier:<id>`
- Microsoft Teams: 对话 ID (`19:...@thread.tacv2`) 或 `conversation:<id>` 或 `user:<aad-object-id>`

名称查找：

- 对于支持的提供商（Discord/Slack 等），频道名如 `Help` 或 `#help` 会通过目录缓存解析。
- 如果缓存未命中，且提供商支持，OpenClaw 会尝试实时目录查找。

## 通用标志

- `--channel <名称>`
- `--account <ID>`
- `--target <目标>`（发送/投票/读取等的目标频道或用户）
- `--targets <名称>`（可重复；仅广播用）
- `--json`
- `--dry-run`
- `--verbose`

## SecretRef 行为

- `openclaw message` 在执行选定的操作之前解析受支持的频道 SecretRef。
- 解析范围尽可能限定在当前活动操作目标：
  - 设置了 `--channel`（或从带前缀的目标如 `discord:...` 推断出）时为频道作用域
  - 设置了 `--account` 时为账户作用域（频道全局变量 + 所选账户表面）
  - 省略 `--account` 时，OpenClaw 不会强制使用 `default` 账户 SecretRef 作用域
- 未解析的无关频道 SecretRef 不会阻止定向消息操作。
- 如果所选频道/账户的 SecretRef 未解析，该命令会针对该操作失败关闭。

## 操作

### 核心操作

- `send`
  - 频道：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage/Microsoft Teams
  - 必需：`--target`，以及 `--message` 或 `--media`
  - 可选：`--media`、`--reply-to`、`--thread-id`、`--gif-playback`
  - 仅 Telegram：`--buttons`（需要 `channels.telegram.capabilities.inlineButtons` 才能允许）
  - 仅 Telegram：`--force-document`（以文档形式发送图片和 GIF 以避免 Telegram 压缩）
  - 仅 Telegram：`--thread-id`（论坛主题 ID）
  - 仅 Slack：`--thread-id`（讨论串时间戳；`--reply-to` 使用相同字段）
  - 仅 WhatsApp：`--gif-playback`

- `poll`
  - 频道：WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - 必需：`--target`、`--poll-question`、`--poll-option`（可重复）
  - 可选：`--poll-multi`
  - 仅 Discord：`--poll-duration-hours`、`--silent`、`--message`
  - 仅 Telegram：`--poll-duration-seconds`（5-600）、`--silent`、`--poll-anonymous` / `--poll-public`、`--thread-id`

- `react`
  - 频道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal
  - 必需：`--message-id`，`--target`
  - 可选：`--emoji`，`--remove`，`--participant`，`--from-me`，`--target-author`，`--target-author-uuid`
  - 注：`--remove` 需要 `--emoji`（省略 `--emoji` 可清除自身反应，视支持情况；参见 /tools/reactions）
  - 仅 WhatsApp：`--participant`，`--from-me`
  - Signal 群组反应：需 `--target-author` 或 `--target-author-uuid`

- `reactions`
  - 频道：Discord/Google Chat/Slack
  - 必需：`--message-id`，`--target`
  - 可选：`--limit`

- `read`
  - 频道：Discord/Slack
  - 必需：`--target`
  - 可选：`--limit`，`--before`，`--after`
  - 仅 Discord：`--around`

- `edit`
  - 频道：Discord/Slack
  - 必需：`--message-id`，`--message`，`--target`

- `delete`
  - 频道：Discord/Slack/Telegram
  - 必需：`--message-id`，`--target`

- `pin` / `unpin`
  - 频道：Discord/Slack
  - 必需：`--message-id`，`--target`

- `pins`（列表）
  - 频道：Discord/Slack
  - 必需：`--target`

- `permissions`
  - 频道：Discord
  - 必需：`--target`

- `search`
  - 频道：Discord
  - 必需：`--guild-id`，`--query`
  - 可选：`--channel-id`、`--channel-ids`（可重复）、`--author-id`、`--author-ids`（可重复）、`--limit`

### 讨论串（Threads）

- `thread create`
  - 频道：Discord
  - 必需：`--thread-name`，`--target`（频道 ID）
  - 可选：`--message-id`、`--message`、`--auto-archive-min`

- `thread list`
  - 频道：Discord
  - 必需：`--guild-id`
  - 可选：`--channel-id`、`--include-archived`、`--before`、`--limit`

- `thread reply`
  - 频道：Discord
  - 必需：`--target`（讨论串 ID），`--message`
  - 可选：`--media`，`--reply-to`

### 表情符号（Emojis）

- `emoji list`
  - Discord：`--guild-id`
  - Slack：无额外标志

- `emoji upload`
  - 频道：Discord
  - 必需：`--guild-id`，`--emoji-name`，`--media`
  - 可选：`--role-ids`（可重复）

### 贴图（Stickers）

- `sticker send`
  - 频道：Discord
  - 必需：`--target`，`--sticker-id`（可重复）
  - 可选：`--message`

- `sticker upload`
  - 频道：Discord
  - 必需：`--guild-id`，`--sticker-name`，`--sticker-desc`，`--sticker-tags`，`--media`

### 角色 / 频道 / 成员 / 语音

- `role info`（Discord）：`--guild-id`
- `role add` / `role remove`（Discord）：`--guild-id`，`--user-id`，`--role-id`
- `channel info`（Discord）：`--target`
- `channel list`（Discord）：`--guild-id`
- `member info`（Discord/Slack）：`--user-id`（Discord 需要加 `--guild-id`）
- `voice status`（Discord）：`--guild-id`，`--user-id`

### 活动（Events）

- `event list`（Discord）：`--guild-id`
- `event create`（Discord）：`--guild-id`，`--event-name`，`--start-time`
  - 可选：`--end-time`，`--desc`，`--channel-id`，`--location`，`--event-type`

### 管理（Discord）

- `timeout`：`--guild-id`，`--user-id`（可选 `--duration-min` 或 `--until`；两者皆省略则清除超时）
- `kick`：`--guild-id`，`--user-id`（可加 `--reason`）
- `ban`：`--guild-id`，`--user-id`（可加 `--delete-days`，`--reason`）
  - `timeout` 同时支持 `--reason`

### 广播（Broadcast）

- `broadcast`
  - 频道：任意已配置频道；使用 `--channel all` 可针对所有提供商
  - 必需：`--targets`（可重复）
  - 可选：`--message`、`--media`、`--dry-run`

## 示例

发送 Discord 回复：

```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

发送带组件的 Discord 消息：

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --components '{"text":"Choose a path","blocks":[{"type":"actions","buttons":[{"label":"Approve","style":"success"},{"label":"Decline","style":"danger"}]}]}'
```

完整结构请参见 [Discord 组件](/channels/discord#interactive-components)。

创建 Discord 投票：

```
openclaw message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

创建 Telegram 投票（2 分钟后自动关闭）：

```
openclaw message poll --channel telegram \
  --target @mychat \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-duration-seconds 120 --silent
```

发送 Teams 主动消息：

```
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 --message "hi"
```

创建 Teams 投票：

```
openclaw message poll --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi
```

Slack 中添加反应：

```
openclaw message react --channel slack \
  --target C123 --message-id 456 --emoji "✅"
```

Signal 群组中添加反应：

```
openclaw message react --channel signal \
  --target signal:group:abc123 --message-id 1737630212345 \
  --emoji "✅" --target-author-uuid 123e4567-e89b-12d3-a456-426614174000
```

发送 Telegram 内联按钮：

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --buttons '[ [{"text":"Yes","callback_data":"cmd:yes"}], [{"text":"No","callback_data":"cmd:no"}] ]'
```

以文档形式发送 Telegram 图片以避免压缩：

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```
