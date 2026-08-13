---
summary: "openclaw message 命令的 CLI 参考（发送 + 频道操作）"
read_when:
  - 添加或修改消息 CLI 操作时
  - 更改出站频道行为时
title: "消息"
---

# `openclaw message`

用于在 Discord、Google Chat、iMessage、Matrix、Mattermost（插件）、Microsoft Teams、
Signal、Slack、Telegram 和 WhatsApp 之间发送消息和执行频道操作的单一出站命令。

```bash
openclaw message <subcommand> [flags]
```

## 频道选择

- 如果配置了多个频道，则必须使用 `--channel <name>`；如果只配置了一个频道，则该频道为默认值。
- 可选值：`discord|googlechat|imessage|matrix|mattermost|msteams|signal|slack|telegram|whatsapp`
  （Mattermost 需要插件）。
- 带频道前缀的目标（例如 `discord:channel:123`）会在不显式指定 `--channel` 的情况下解析出
  所属插件。

## 目标格式（`-t, --target`）

| 渠道               | 格式                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| Discord            | `channel:<id>`、`user:<id>`、`<@id>` 提及，或纯数字 id（视为频道 id）                                         |
| Google Chat        | `spaces/<spaceId>` 或 `users/<userId>`                                                                     |
| iMessage           | 句柄、`chat_id:<id>`、`chat_guid:<guid>`，或 `chat_identifier:<id>`                                          |
| Mattermost（插件） | `channel:<id>`、`user:<id>`、`@username`，或纯 id（视为频道）                                               |
| Matrix             | `@user:server`、`!room:server`，或 `#alias:server`                                                          |
| Microsoft Teams    | `conversation:<id>`（`19:...@thread.tacv2`）、纯 conversation id，或 `user:<aad-object-id>`                   |
| Signal             | `+E.164`、`group:<id>`、`uuid:<id>`、`username:<name>`/`u:<name>`，或以上任意形式前加 `signal:`               |
| Slack              | `channel:<id>` 或 `user:<id>`（纯 id 视为频道）                                                              |
| Telegram           | chat id、`@username`，或论坛主题目标：`<chatId>:topic:<topicId>`（或 `--thread-id <topicId>`）               |
| WhatsApp           | E.164、群组 JID（`...@g.us`），或 Channel/Newsletter JID（`...@newsletter`）                                |

频道名称查找：对于带有目录的提供方（Discord/Slack 等），像 `Help` 或 `#help` 这样的名称会通过目录缓存进行解析；如果缓存未命中，并且该提供方支持，则会回退到实时目录查找。

## 常用标志

每个操作都接受：`--channel <name>`、`--account <id>`、`--json`、
`--dry-run`、`--verbose`。需要指定目标的操作还接受
`-t, --target <dest>`。

## SecretRef 解析

`openclaw message` 会在运行操作之前解析 channel SecretRefs，
并尽可能将作用域限定得最小：

- 当设置了 `--channel` 时，作用域为 channel 级别（或从带前缀的目标中推断得出）
- 当同时设置了 `--account` 时，作用域为 account 级别
- 当两者都未设置时，作用域为所有已配置的 channels

无关 channels 上未解析的 SecretRefs 绝不会阻止一次有针对性的操作；在所选 channel/account 上未解析的 SecretRef 会导致该操作失败并关闭。

## 操作

### 核心

| 操作             | 支持渠道                                                                                                        | 必需项                                                       | 备注                                                                                                                                                                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `send`          | Discord, Google Chat, iMessage, Matrix, Mattermost (plugin), Microsoft Teams, Signal, Slack, Telegram, WhatsApp | `--target`，以及 `--message`/`--media`/`--presentation` 之一 | 参见下方 [发送](#send)。                                                                                                                                                                                                                                                                               |
| `poll`          | Discord, Matrix, Microsoft Teams, Telegram, WhatsApp                                                            | `--target`、`--poll-question`、`--poll-option`（可重复）        | 参见下方 [投票](#poll)。                                                                                                                                                                                                                                                                               |
| `react`         | Discord, Matrix, Nextcloud Talk, Signal, Slack, Telegram, WhatsApp                                              | `--message-id`、`--target`                                     | `--emoji`、`--remove`（需要 `--emoji`；若要清除自己在受支持平台上的反应，可省略它，参见 [Reactions](/tools/reactions)）。WhatsApp：`--participant`、`--from-me`。Signal 群组反应需要 `--target-author` 或 `--target-author-uuid`。Nextcloud Talk 只会添加反应；`--remove` 会报错。 |
| `reactions`     | Discord, Matrix, Microsoft Teams, Slack                                                                         | `--message-id`、`--target`                                     | `--limit`。                                                                                                                                                                                                                                                                                             |
| `read`          | Discord, Matrix, Microsoft Teams, Slack                                                                         | `--target`                                                     | `--limit`、`--message-id`、`--before`、`--after`。Discord：`--around`、`--include-thread`。Slack：`--message-id` 读取特定时间戳，结合 `--thread-id` 可精确读取某条线程回复。                                                                                                     |
| `edit`          | Discord, Matrix, Microsoft Teams, Slack, Telegram                                                               | `--message-id`、`--message`、`--target`                        | Telegram 论坛线程使用 `--thread-id`。                                                                                                                                                                                                                                                              |
| `delete`        | Discord, Matrix, Microsoft Teams, Slack, Telegram                                                               | `--message-id`、`--target`                                     |                                                                                                                                                                                                                                                                                                        |
| `pin` / `unpin` | Discord, Matrix, Microsoft Teams, Slack                                                                         | `--message-id`、`--target`                                     | `unpin` 也接受 `--pinned-message-id`（Microsoft Teams：这是 pin/list-pins 资源 ID，不是聊天消息 ID）。                                                                                                                                                                                  |
| `pins`（列表）   | Discord, Matrix, Microsoft Teams, Slack                                                                         | `--target`                                                     | `--limit`。                                                                                                                                                                                                                                                                                             |
| `permissions`   | Discord, Matrix                                                                                                 | `--target`                                                     | Matrix：仅在启用加密且允许验证操作时可用。                                                                                                                                                                                                                |
| `search`        | Discord                                                                                                         | `--guild-id`、`--query`                                        | `--channel-id`、`--channel-ids`（可重复）、`--author-id`、`--author-ids`（可重复）、`--limit`。                                                                                                                                                                                                           |
| `member info`   | Discord, Matrix, Microsoft Teams, Slack                                                                         | `--user-id`                                                    | `--guild-id`（Discord）。                                                                                                                                                                                                                                                                                |

### 发送

```bash
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

- `--media <path-or-url>`：附加图像/音频/视频/文档（本地路径或
  URL）。
- `--presentation <json>`：包含 `text`、`context`、`divider`、
  `chart`、`table`、`buttons` 和 `select` 块的共享负载，根据各频道的功能进行渲染。参见 [消息呈现](/plugins/message-presentation)。
- `--delivery <json>`：通用传递偏好设置，例如 `{"pin":
true}`。当频道支持置顶传递时，`--pin` 是其简写形式。
- `--reply-to <id>`、`--thread-id <id>`（Telegram 论坛主题；Slack 线程
  时间戳，与 `--reply-to` 使用相同字段）。
- `--force-document`：在 Slack 上保留原始图像字节，或在 Telegram 和 WhatsApp 上将
  图像/GIF/视频作为文档发送，以避免频道压缩。
- `--silent`（Telegram、Discord）：发送时不发出通知。
- `--gif-playback`（仅限 WhatsApp）：将视频媒体作为 GIF 播放处理。

```bash
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Approve","value":"approve","style":"success"},{"label":"Decline","value":"decline","style":"danger"}]}]}'
```

```bash
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Yes","value":"cmd:yes"},{"label":"No","value":"cmd:no"}]}]}'
```

Slack 会原生渲染受支持的 chart 块；其他频道会收到相同
数据的可读文本形式：

```bash
openclaw message send --channel slack --target channel:C123 \
  --presentation '{"blocks":[{"type":"chart","chartType":"bar","title":"Quarterly revenue","categories":["Q1","Q2"],"series":[{"name":"Revenue","values":[120,145]}],"xLabel":"Quarter"}]}'
```

Slack 也会原生渲染显式的 table 块。其他频道会收到
标题和每一行的确定性文本：

```bash
openclaw message send --channel slack --target channel:C123 \
  --presentation '{"title":"Pipeline report","blocks":[{"type":"table","caption":"Open pipeline","headers":["Account","Stage","ARR"],"rows":[["Acme","Won",125000],["Globex","Review",82000]],"rowHeaderColumnIndex":0}]}'
```

Telegram Mini App 按钮使用 `webApp`（`web_app` 仍会为旧版
JSON 解析），且仅在用户与机器人之间的私聊中渲染：

```bash
openclaw message send --channel telegram --target 123456789 --message "Open app:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Launch","webApp":{"url":"https://example.com/app"}}]}]}'
```

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```

```bash
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --presentation '{"title":"状态更新","blocks":[{"type":"text","text":"构建已完成"}]}'
```

### 投票

```bash
openclaw message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

- `--poll-option <choice>`：重复 2-12 次。
- `--poll-multi`：允许多选。
- Discord：`--poll-duration-hours`、`--silent`、`--message`。
- Telegram：`--poll-duration-seconds <n>`（5-600）、`--silent`、
  `--poll-anonymous` / `--poll-public`、`--thread-id`。

```bash
openclaw message poll --channel telegram \
  --target @mychat \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-duration-seconds 120 --silent
```

```bash
openclaw message poll --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi
```

### 线程

- `thread create`：渠道 Discord。必需：`--thread-name`、`--target`
  （频道 id）。可选：`--message-id`、`--message`、`--auto-archive-min`。
- `thread list`：渠道 Discord。必需：`--guild-id`。可选：
  `--channel-id`、`--include-archived`、`--before`、`--limit`。
- `thread reply`：渠道 Discord。必需：`--target`（线程 id）、
  `--message`。可选：`--media`、`--reply-to`。

### 表情

- `emoji list`：Discord（`--guild-id`）、Slack（无需额外标志）。
- `emoji upload`：Discord。必需：`--guild-id`、`--emoji-name`、`--media`。
  可选：`--role-ids`（可重复）。

### 贴纸

- `sticker send`：Discord。必需：`--target`、`--sticker-id`（可重复）。
  可选：`--message`。
- `sticker upload`：Discord。必需：`--guild-id`、`--sticker-name`、
  `--sticker-desc`、`--sticker-tags`、`--media`。

### 角色、频道、语音、事件（Discord）

- `role info`：`--guild-id`。
- `role add` / `role remove`：`--guild-id`、`--user-id`、`--role-id`。
- `channel info`：`--target`。
- `channel list`：`--guild-id`。
- `voice status`：`--guild-id`、`--user-id`。
- `event list`：`--guild-id`。
- `event create`：必需 `--guild-id`、`--event-name`、`--start-time`；
  可选 `--end-time`、`--desc`、`--channel-id`、`--location`、
  `--event-type`、`--image <url-or-path>`。

### 审核管理（Discord）

- `timeout`：`--guild-id`、`--user-id`；可选 `--duration-min` 或
  `--until`（两者都省略则清除 timeout）、`--reason`。
- `kick`：`--guild-id`、`--user-id`、`--reason`。
- `ban`：`--guild-id`、`--user-id`、`--delete-days`、`--reason`。

### 广播

```bash
openclaw message broadcast --targets <target...> [--channel all] [--message <text>] [--media <url>] [--dry-run]
```

向多个目标发送一份负载。`--targets` 接受以空格分隔的列表。使用 `--channel all` 可针对所有已配置的提供方。

## 相关内容

- [CLI 参考](/cli)
- [Agent 发送](/tools/agent-send)
- [消息呈现](/plugins/message-presentation)。
