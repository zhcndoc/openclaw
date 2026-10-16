---
summary: "CLI `openclaw message` 参考（发送 + 通道操作）"
read_when:
  - "添加或修改消息 CLI 操作时"
  - "更改出站频道行为时"
title: "消息"
---

# `openclaw message`

用于在 Discord、Google Chat、iMessage、Matrix、Mattermost（插件）、Microsoft Teams、 Signal、Slack、Telegram 和 WhatsApp 之间发送消息和执行频道操作的单一出站命令。

```bash
openclaw message <subcommand> [flags]
```

## <a id="channel-selection"></a> 频道选择

- 如果配置了多个频道，则必须使用 `--channel <name>`；如果只配置了一个频道，则该频道为默认值。
- 可选值：`discord|googlechat|imessage|matrix|mattermost|msteams|signal|slack|telegram|whatsapp` （Mattermost 需要插件）。
- 带频道前缀的目标（例如 `discord:channel:123`）会在不显式指定 `--channel` 的情况下解析出所属插件。

通过显式通道，网关拥有的操作（例如 `read --channel discord`）可以验证配置，而无需运行本地状态迁移。他们需要一个可访问的网关。需要本地频道发现的本地操作、广播、试运行和命令保留本地配置和插件准备。

## <a id="agent-ownership"></a> 代理所有权

`openclaw message` 使用配置的 [System Agent](/gateway/config-agents/heartbeat-compaction-and-streaming#agents.defaults.systemagent) 作为其代理所有者，在取消设置系统代理时回退到保留的旧所有者或唯一配置的代理。

在没有所有者的显式多代理配置中，命令在发送之前停止。从 `openclaw agents list` 中选择一个现有代理 ID，将其设置为系统代理，然后重试：

```bash
openclaw config set agents.defaults.systemAgent.agentId <id>
```

此设置还选择其他环境系统工作的所有者。消息命令不接受`--agent`； `--channel`和`--account`选择通道和通道帐户。

## <a id="target-formats-(-t%2C---target)"></a><a id="target-formats-t-target"></a> 目标格式（`-t, --target`）

| 渠道             | 格式                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Discord             | `channel:<id>`、`user:<id>`、`<@id>` 提及，或纯数字 id（视为频道 id）               |
| Google Chat         | `spaces/<spaceId>` 或 `users/<userId>`                                                                     |
| iMessage            | 句柄、`chat_id:<id>`、`chat_guid:<guid>`，或 `chat_identifier:<id>`                                      |
| Mattermost（插件） | `channel:<id>`、`user:<id>`、`@username`，或纯 id（视为频道）                              |
| Matrix              | `@user:server`、`!room:server`，或 `#alias:server`                                                         |
| Microsoft Teams     | `conversation:<id>`（`19:...@thread.tacv2`）、纯 conversation id，或 `user:<aad-object-id>`             |
| Signal              | `+E.164`、`group:<id>`、`uuid:<id>`、`username:<name>`/`u:<name>`，或以上任意形式前加 `signal:` |
| Slack               | `channel:<id>` 或 `user:<id>`（纯 id 视为频道）                                          |
| Telegram            | chat id、`@username`，或论坛主题目标：`<chatId>:topic:<topicId>`（或 `--thread-id <topicId>`）     |
| WhatsApp            | E.164、群组 JID（`...@g.us`），或 Channel/Newsletter JID（`...@newsletter`）                                |

通道名称查找：对于具有目录 （Discord/Slack/etc） 的提供者，`Help` 或 `#help` 等名称通过目录缓存解析，在提供者支持的缓存未命中时回退到实时目录查找。

## <a id="common-flags"></a> 常用标志

每个操作都接受：`--channel <name>`、`--account <id>`、`--json`、 `--dry-run`、`--verbose`。需要指定目标的操作还接受 `-t, --target <dest>`。

显式为空或仅包含空格的 `--account` 值将被拒绝。忽略使用现有默认或绑定帐户的选项，包括当 shell 变量为空时。非空帐户值保留其现有的选择规则。

显式为空或仅包含空格的 `--channel` 值也会被拒绝。忽略选择唯一配置通道的选项，或在支持时使用通道前缀目标。

Discord 消息正文、标题、投票上下文和组件文本保留前导缩进。现有的空消息验证仍然适用。普通消息和标题传递仍然会修剪尾随空白。

本地消息操作在退出之前运行加载的插件的关闭挂钩，包括在操作失败之后。这些挂钩的总体预算为 2.5-second，并且不会更改操作的退出状态。 `message read` 会跳过这些关闭挂钩。然后，可执行文件在其现有的五秒清理预算内耗尽共享状态数据库工作人员。如果插件处理仍处于待处理状态，它会记录延迟并安排在处理解决后耗尽，保留未完成写入的状态，而不使命令再次等待。清理警告保留操作​​的结果；他们并不声称未完成的清理工作已完成。

## <a id="secretref-resolution"></a> SecretRef 解析

`openclaw message` 会在运行操作之前解析 channel SecretRefs， 并尽可能将作用域限定得最小：

- 当设置了 `--channel` 时，作用域为 channel 级别（或从带前缀的目标中推断得出）
- 当同时设置了 `--account` 时，作用域为 account 级别
- 当两者都未设置时，作用域为所有已配置的 channels

不相关通道上未解决的 SecretRefs 永远不会阻止目标操作；所选 channel/account 上未解析的 SecretRef 无法关闭操作。

## <a id="actions"></a> 操作

### <a id="core"></a> 核心

| 操作          | 渠道                                                                                                        | 必需的                                                       | 笔记                                                                                                                                                                                                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `send`          | Discord、Google Chat、iMessage、Matrix、Mattermost（插件）、Microsoft Teams、Signal、Slack、Telegram、 WhatsApp | `--target`，以及 `--message`/`--media`/`--presentation` 之一 | 参见下方 [发送](#send)。                                                                                                                                                                                                                                                                               |
| `poll`          | Discord, Matrix, Microsoft Teams, Telegram, WhatsApp                                                            | `--target`、`--poll-question`、`--poll-option`（可重复）        | 参见下方 [投票](#poll)。                                                                                                                                                                                                                                                                               |
| `react`         | Discord、Matrix、Nextcloud 通话、Signal、Slack、Telegram、WhatsApp                                              | `--message-id`, `--target`                                     | `--emoji`、`--remove`（需要 `--emoji`；若要清除自己在受支持平台上的反应，可省略它，参见 [Reactions](/tools/reactions)）。WhatsApp：`--participant`、`--from-me`。Signal 群组反应需要 `--target-author` 或 `--target-author-uuid`。Nextcloud Talk 只会添加反应；`--remove` 会报错。 |
| `reactions`     | Discord, Matrix, Microsoft Teams, Slack                                                                         | `--message-id`, `--target`                                     | `--limit`.                                                                                                                                                                                                                                                                                             |
| `read`          | Discord, Matrix, Microsoft Teams, Slack                                                                         | `--target`                                                     | `--limit`、`--message-id`、`--before`、`--after`。 Discord：`--around`。 Slack：`--message-id` 读取特定时间戳，与 `--thread-id` 结合以获得准确的线程回复。                                                                                                                         |
| `edit`          | Discord, Matrix, Microsoft Teams, Slack, Telegram                                                               | `--message-id`, `--message`, `--target`                        | Telegram 论坛线程使用 `--thread-id`。                                                                                                                                                                                                                                                              |
| `delete`        | Discord, Matrix, Microsoft Teams, Slack, Telegram                                                               | `--message-id`, `--target`                                     |                                                                                                                                                                                                                                                                                                        |
| `pin` / `unpin` | Discord, Matrix, Microsoft Teams, Slack                                                                         | `--message-id`, `--target`                                     | `unpin` 还接受 `--pinned-message-id`（Microsoft Teams：pin/list-pins 资源 id，而不是聊天消息 id）。                                                                                                                                                                                  |
| `pins`（列表）   | Discord, Matrix, Microsoft Teams, Slack                                                                         | `--target`                                                     | `--limit`.                                                                                                                                                                                                                                                                                             |
| `permissions`   | Discord, Matrix                                                                                                 | `--target`                                                     | Matrix：仅在启用加密且允许验证操作时可用。                                                                                                                                                                                                                |
| `search`        | Discord, Microsoft Teams                                                                                        | `--query`                                                      | `--guild-id`（Discord；省略时从 `--channel-id` 解析）、`--channel-id`（Microsoft Teams 需要作为图 `<team-id>/<channel-id>`）、`--channel-ids`（重复）、`--author-id`、 `--author-ids`（重复）、`--limit`。                                                                       |
| `member info`   | Discord, Matrix, Microsoft Teams, Slack                                                                         | `--user-id`                                                    | `--channel-id`（Matrix 和 Microsoft Teams 需要）、`--guild-id` （Discord）。                                                                                                                                                                                                                      |

反应列表以纯终端文本形式显示标签、计数和可用用户。使用 `--json` 获得完整的通道结果。

现有脚本仍然接受旧版 `message read --include-thread` 拼写，但没有任何效果。

### <a id="member-info"></a> 会员信息

使用`--channel-id`选择Matrix房间或Microsoft Teams标准通道。 Teams 需要图形 `<team-id>/<channel-id>` 表单，因为 CLI 没有当前对话。提供商访问和会员资格检查仍然适用。

```bash
openclaw message member info --channel matrix \
  --channel-id '!room:example.org' --user-id '@member:example.org'

openclaw message member info --channel msteams \
  --channel-id '<team-id>/<channel-id>' --user-id '<aad-object-id>'
```

### <a id="send"></a> 发送

```bash
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

- `--media <path-or-url>`：附加image/audio/video/document（本地路径或URL）。重复按顺序发送多个文件； Telegram 将连续照片分组到 [albums](/channels/telegram/media#photo-albums) 中。
- `--presentation <json>`：与 `text`、`context`、`divider`、`chart`、`table`、`buttons` 和 `select` 块共享有效负载，按通道功能渲染。请参阅 [ 消息 Presentation](/plugins/message-presentation)。
- `--delivery <json>`：通用传递偏好设置，例如 `{"pin": true}`。当频道支持置顶传递时，`--pin` 是其简写形式。
- `--reply-to <id>`、`--thread-id <id>`（Telegram 论坛主题；Slack 线程时间戳，与 `--reply-to` 使用相同字段）。
- `--force-document`：在Slack上保留原始图像字节，或将images/GIFs/videos作为Telegram和WhatsApp上的文档发送，以避免通道压缩。
- `--silent`（Telegram、Discord）：发送时不发出通知。
- `--gif-playback`（仅限 WhatsApp）：将视频媒体作为 GIF 播放处理。

当发送被消息挂钩抑制、失败或仅部分成功时，该命令会解释结果并以非零值退出。部分交付保留任何已确认的消息 ID。 JSON故障包括`ok: false`、`deliveryStatus`和`error`；成功的 JSON 响应保留其现有形状。

会话转录镜像显示附件文件名，同时保留其媒体引用。具有相同文件名和标题的不同附件保持不同；在转录尾部重复相同的文本和媒体将被删除重复。

```bash
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Approve","value":"approve","style":"success"},{"label":"Decline","value":"decline","style":"danger"}]}]}'
```

```bash
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Yes","value":"cmd:yes"},{"label":"No","value":"cmd:no"}]}]}'
```

Slack 会原生渲染受支持的 chart 块；其他频道会收到相同数据的可读文本形式：

```bash
openclaw message send --channel slack --target channel:C123 \
  --presentation '{"blocks":[{"type":"chart","chartType":"bar","title":"Quarterly revenue","categories":["Q1","Q2"],"series":[{"name":"Revenue","values":[120,145]}],"xLabel":"Quarter"}]}'
```

Slack 还可以原生渲染显式表块。其他通道以固定文本格式接收标题和每一行：

```bash
openclaw message send --channel slack --target channel:C123 \
  --presentation '{"title":"Pipeline report","blocks":[{"type":"table","caption":"Open pipeline","headers":["Account","Stage","ARR"],"rows":[["Acme","Won",125000],["Globex","Review",82000]],"rowHeaderColumnIndex":0}]}'
```

Telegram Mini App 按钮使用 `webApp`（`web_app` 仍会为旧版 JSON 解析），且仅在用户与机器人之间的私聊中渲染：

```bash
openclaw message send --channel telegram --target 123456789 --message "Open app:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Launch","webApp":{"url":"https://example.com/app"}}]}]}'
```

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```

```bash
openclaw message send --channel telegram --target @mychat \
  --message "Trip photos" --media ./photo-1.jpg --media ./photo-2.jpg
```

```bash
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --presentation '{"title":"Status update","blocks":[{"type":"text","text":"Build completed"}]}'
```

### <a id="poll"></a> 投票

```bash
openclaw message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

- `--poll-option <choice>`：重复 2-12 次。
- `--poll-multi`：允许多选。
- Discord: `--poll-duration-hours`, `--silent`, `--message`.
- Telegram：`--poll-duration-seconds <n>`（5-604800；最多 7 天）、`--silent`、`--poll-anonymous` / `--poll-public`、`--thread-id`。

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

### <a id="threads"></a> 线程

- `thread create`：渠道 Discord。必需：`--thread-name`、`--target` （频道 id）。可选：`--message-id`、`--message`、`--auto-archive-min`。
- `thread list`：渠道 Discord。必需：`--guild-id`。可选： `--channel-id`、`--include-archived`、`--before`、`--limit`。
- `thread reply`：渠道 Discord。必需：`--target`（线程 id）、 `--message`。可选：`--media`、`--reply-to`。

### <a id="emojis"></a> 表情

- `emoji list`：Discord（`--guild-id`）、Slack（无需额外标志）。
- `emoji upload`：Discord。必需：`--guild-id`、`--emoji-name`、`--media`。 可选：`--role-ids`（可重复）。

### <a id="stickers"></a> 贴纸

- `sticker send`：Discord。必需：`--target`、`--sticker-id`（可重复）。 可选：`--message`。
- `sticker upload`：Discord。必需：`--guild-id`、`--sticker-name`、 `--sticker-desc`、`--sticker-tags`、`--media`。

### <a id="roles%2C-channels%2C-voice%2C-events-(discord)"></a><a id="roles-channels-voice-events-discord"></a> 角色、频道、语音、事件（Discord）

- `role info`: `--guild-id`.
- `role add` / `role remove`: `--guild-id`, `--user-id`, `--role-id`.
- `channel info`: `--target`.
- `channel list`: `--guild-id`.
- `voice status`: `--guild-id`, `--user-id`.
- `event list`: `--guild-id`.
- `event create`：必需 `--guild-id`、`--event-name`、`--start-time`； 可选 `--end-time`、`--desc`、`--channel-id`、`--location`、 `--event-type`、`--image <url-or-path>`。

### <a id="moderation-(discord)"></a><a id="moderation-discord"></a> 审核管理（Discord）

- `timeout`：`--guild-id`、`--user-id`；可选 `--duration-min` 或 `--until`（两者都省略则清除 timeout）、`--reason`。
- `kick`: `--guild-id`, `--user-id`, `--reason`.
- `ban`: `--guild-id`, `--user-id`, `--delete-days`, `--reason`.

### <a id="broadcast"></a> 广播

```bash
openclaw message broadcast --targets <target...> [--channel all] [--message <text>] [--media <url>] [--dry-run]
```

向多个目标发送一份负载。`--targets` 接受以空格分隔的列表。使用 `--channel all` 可针对所有已配置的提供方。

如果任何目标失败、被抑制或仅部分传送，则广播将退出非零。文本输出标识失败的目标； JSON 报告 `ok: false` 并保留每个目标的结果，包括通道插件返回的失败。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [Agent 发送](/tools/agent-send)
- [留言 Presentation](/plugins/message-presentation)
