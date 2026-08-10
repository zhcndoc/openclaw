---
summary: "将旧版 BlueBubbles 配置迁移到官方 iMessage 插件：键映射、群组允许列表门控以及切换验证。"
read_when:
  - 计划从 BlueBubbles 迁移到官方 iMessage 插件
  - 将 BlueBubbles 配置键转换为 iMessage 对应项
  - 在启用 iMessage 插件前验证 imsg
title: "从 BlueBubbles 迁移"
---

BlueBubbles 支持已被移除。OpenClaw 仅通过官方 `@openclaw/imessage` 插件支持 iMessage，该插件通过 JSON-RPC 驱动 [`steipete/imsg`](https://github.com/steipete/imsg)，并访问 BlueBubbles 所使用的同一私有 API 接口（`react`、`edit`、`unsend`、`reply`、`sendWithEffect`、原生投票、群组管理、附件）。一个 CLI 二进制文件取代了 BlueBubbles 服务器、客户端应用和 webhook 连接：没有 REST 端点，也没有 webhook 身份验证。

本指南将旧的 `channels.bluebubbles` 配置迁移为 `channels.imessage`。没有其他受支持的迁移路径。在当前 OpenClaw 中，残留的 `channels.bluebubbles` 块不会生效——运行时不会读取它。

<Note>
关于简短公告和运维摘要，请参见 [BlueBubbles 移除以及 imsg iMessage 路径](/announcements/bluebubbles-imessage)。
</Note>

## 迁移清单

如果你已经知道旧的 BlueBubbles 配置，最安全的最短迁移路径如下：

1. 使用 `openclaw plugins install @openclaw/imessage` 安装官方插件，然后重启 Gateway。
2. 在运行 Messages.app 的 Mac 上直接验证 `imsg`（`imsg chats`、`imsg history`、`imsg send`、`imsg rpc --help`）。
3. 将行为配置键从 `channels.bluebubbles` 复制到 `channels.imessage`：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`includeAttachments`、`attachmentRoots`、`mediaMaxMb`、`textChunkLimit` 和 `actions`。
4. 删除不再存在的传输配置键：`serverUrl`、`password`、Webhook URL，以及 BlueBubbles 服务器设置。
5. 如果 Gateway 未运行在 Messages 所在的 Mac 上，请将 `channels.imessage.cliPath` 设置为 SSH 包装器在 Gateway 所在机器上的绝对路径，并将 `dbPath` 保持为该 Mac 上的绝对路径。对于复杂的包装器，请将 `remoteHost` 设置为 Messages 所在的 Mac；OpenClaw 会自动检测简单的透明包装器形式以保持兼容性。
6. 启用 `channels.imessage`，重启 Gateway，然后运行 `openclaw channels status --probe --channel imessage`。
7. 测试一条私信、一个允许的群组、附件（如果已启用），以及你希望代理使用的每个私有 API 操作。
8. 在确认 iMessage 路径运行正常后，删除 BlueBubbles 服务器和旧的 `channels.bluebubbles` 配置。

<Note>
远程 `imsg` v0.13.4 有两个有限的 RPC 限制：投票必须使用 `pollOptionId`，而不能使用索引或选项文本；附件回复无法指定非零的消息部分索引。本地 `imsg` 的行为不受影响。
</Note>

## imsg 的作用

`imsg` 是一个用于 Messages 的本地 macOS CLI。OpenClaw 会启动 `imsg rpc` 作为子进程，并通过 stdin/stdout 使用 JSON-RPC 通信。这里没有 HTTP 服务器、webhook URL、后台守护进程、launch agent 或需要开放的端口。

- 读取内容来自 `~/Library/Messages/chat.db`，使用只读的 SQLite 句柄。
- 实时传入消息来自 `imsg watch` / `watch.subscribe`，它会通过轮询回退机制跟踪 `chat.db` 的文件系统事件。
- 发送消息时，普通文本和文件发送会使用 Messages.app 自动化。
- 高级操作会使用 `imsg launch` 将 `imsg` helper 注入 Messages.app。这样才能解锁已读回执、正在输入指示、富文本发送、编辑、撤回、线程回复、Tapback、投票以及群组管理。
- Linux 构建可以检查一个已复制的 `chat.db`，但不能发送、不能监听实时的 Mac 数据库，也不能驱动 Messages.app。对于 OpenClaw iMessage，请在已登录的 Mac 上运行 `imsg`，或者通过指向该 Mac 的 SSH 包装器来运行。

## 开始之前

1. 在运行 Messages.app 的 Mac 上安装 `imsg`：

   ```bash
   brew install steipete/tap/imsg
   brew update && brew upgrade imsg
   imsg --version
   imsg chats --limit 3
   ```

   对于常见的本地设置，OpenClaw 设置可以在已登录的 Messages Mac 上，为 `imsg` 提供用户确认的 Homebrew 安装或更新。手动设置和 SSH 包装器拓扑仍由操作者管理：请在将运行 `imsg` 的相同本地或远程用户上下文中重复执行 Homebrew 更新。如果 `imsg chats` 失败并报 `unable to open database file`、输出为空，或 `authorization denied`，请将终端、编辑器、Node 进程、Gateway 服务或启动 `imsg` 的 SSH 父进程授予“完全磁盘访问权限”，然后重新打开该父进程。

2. 在更改 OpenClaw 配置之前，先验证读取、监听、发送和 RPC 能力：

   ```bash
   imsg chats --limit 10 --json | jq -s
   imsg history --chat-id 42 --limit 10 --attachments --json | jq -s
   imsg watch --chat-id 42 --reactions --json
   imsg send --chat-id 42 --text "OpenClaw imsg test"
   imsg rpc --help
   ```

   将 `42` 替换为 `imsg chats` 返回的真实聊天 ID。发送需要为 Messages.app 授予自动化权限。如果 OpenClaw 将通过 SSH 运行，请通过 OpenClaw 将使用的同一 SSH 包装器或用户上下文运行这些命令。如果读取正常但发送因 AppleEvents `-1743` 失败，请检查自动化是否落到了 `/usr/libexec/sshd-keygen-wrapper` 上；参见 [SSH wrapper sends fail with AppleEvents -1743](/channels/imessage#requirements-and-permissions-macos)。

3. 启用私有 API 桥接。对于 OpenClaw iMessage，这一点强烈建议启用，因为回复、tapback、效果、投票、附件回复和群组操作都依赖它：

   ```bash
   imsg launch
   imsg status --json
   ```

   `imsg launch` 需要禁用 SIP（并且在现代 macOS 上，还需要放宽库验证——参见 [启用 imsg 私有 API](/channels/imessage#enabling-the-imsg-private-api)）。基础发送、历史记录和监听在不使用 `imsg launch` 的情况下也能工作；但完整的 OpenClaw iMessage 操作范围则不行。

4. 在启用 `channels.imessage` 并启动 Gateway 之后，通过 OpenClaw 验证桥接：

   ```bash
   openclaw channels status --probe
   ```

   iMessage 账户应报告为 `works`；使用 `--json` 时，探测负载会包含 `privateApi.available: true`。如果它报告为 `false`，请先修复这一点——参见 [能力检测](/channels/imessage#private-api-actions)。探测需要可访问的 Gateway（否则 CLI 会回退到仅配置输出），且只会探测已配置并启用的账户。

5. 备份你的配置：

   ```bash
   cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak
   ```

## 配置转换

iMessage 和 BlueBubbles 共享大多数通道级行为键。不同之处在于传输方式（REST 服务器 vs 本地 CLI）以及群组注册表键格式。

| BlueBubbles                                                | iMessage 插件                           | 注意事项                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `channels.bluebubbles.enabled`                             | `channels.imessage.enabled`               | 语义相同（区块存在后默认为 `true`）。                                                                                                                                                                                                                                                                    |
| `channels.bluebubbles.serverUrl`                           | _(已移除)_                               | 没有 REST 服务器——插件通过标准输入输出启动 `imsg rpc`。                                                                                                                                                                                                                                                  |
| `channels.bluebubbles.password`                            | _(已移除)_                               | 不需要 Webhook 身份验证。                                                                                                                                                                                                                                                                                 |
| _(隐式)_                                                   | `channels.imessage.cliPath`               | `imsg` 的路径（默认为 `imsg`）；对于 SSH，请使用 Gateway 主机上包装脚本的绝对路径。                                                                                                                                                                                                                       |
| _(隐式)_                                                   | `channels.imessage.dbPath`                | 可选的 Messages.app `chat.db` 覆盖路径；对于 SSH，这是 Messages Mac 上的绝对路径，绝不会基于 Gateway 的 home 目录进行展开。                                                                                                                                                                             |
| _(隐式)_                                                   | `channels.imessage.remoteHost`            | 作为 `host` 或 `user@host` 的 Messages Mac；显式配置优先，而简单的透明 SSH 包装器会在每个进程中自动检测一次。通过严格的 SSH/SCP 启用入站附件获取以及仅限所有者的出站暂存。清理为尽力而为；失败时会发出警告，并可能留下仅限所有者访问的残留文件。 |
| `channels.bluebubbles.dmPolicy`                            | `channels.imessage.dmPolicy`              | 值相同（`pairing` / `allowlist` / `open` / `disabled`）；默认为 `pairing`。                                                                                                                                                                                                                              |
| `channels.bluebubbles.allowFrom`                           | `channels.imessage.allowFrom`             | 句柄格式相同（`+15555550123`、`user@example.com`）。配对存储中的批准不会迁移——见下文。                                                                                                                                                                                                                   |
| `channels.bluebubbles.groupPolicy`                         | `channels.imessage.groupPolicy`           | 值相同（`allowlist` / `open` / `disabled`）；默认为 `allowlist`。                                                                                                                                                                                                                                        |
| `channels.bluebubbles.groupAllowFrom`                      | `channels.imessage.groupAllowFrom`        | 相同。未设置时，iMessage 回退使用 `allowFrom`；在 `groupPolicy: "allowlist"` 下，显式设置为空的 `groupAllowFrom: []` 会阻止所有群组。                                                                                                                                                                    |
| `channels.bluebubbles.groups`                              | `channels.imessage.groups`                | 原样复制 `"*"` 通配符条目；按数字形式的 iMessage `chat_id` 为每个群组条目重新设置键——见“群组注册表陷阱”。`requireMention`、`tools`、`toolsBySender`、`systemPrompt` 会继续生效。                                                                                                                            |
| `channels.bluebubbles.sendReadReceipts`                    | `channels.imessage.sendReadReceipts`      | 默认为 `true`。仅当私有 API 探测可用时才会触发。                                                                                                                                                                                                                                                          |
| `channels.bluebubbles.includeAttachments`                  | `channels.imessage.includeAttachments`    | 结构相同，默认均为关闭。如果 BlueBubbles 中启用了附件传递，请显式设置此项——在此之前，入站照片/媒体会被静默丢弃（不会出现 `Inbound message` 日志行）。                                                                                                                                                |
| `channels.bluebubbles.attachmentRoots`                     | `channels.imessage.attachmentRoots`       | 本地根目录；通配符规则相同。                                                                                                                                                                                                                                                                              |
| _(不适用)_                                                 | `channels.imessage.remoteAttachmentRoots` | 仅在设置了 `remoteHost` 并通过 SCP 获取文件时使用。                                                                                                                                                                                                                                                       |
| `channels.bluebubbles.mediaMaxMb`                          | `channels.imessage.mediaMaxMb`            | iMessage 默认为 16 MB（BlueBubbles 默认为 8 MB）。如需保持较低上限，请显式设置。                                                                                                                                                                                                                         |
| `channels.bluebubbles.textChunkLimit`                      | `channels.imessage.textChunkLimit`        | 两者默认均为 4000。                                                                                                                                                                                                                                                                                       |
| `channels.bluebubbles.coalesceSameSenderDms`               | _(已移除)_                               | 不要迁移此键。`imsg` 0.13.1 及更高版本会在 OpenClaw 接收 Apple URL 预览拆分消息之前将其合并；`openclaw doctor --fix` 会移除过时的 iMessage 键。                                                                                                                                                           |
| `channels.bluebubbles.enrichGroupParticipantsFromContacts` | _(不适用)_                               | `imsg` 已经会从 `chat.db` 中提供发送者的显示名称。                                                                                                                                                                                                                                                        |
| `channels.bluebubbles.actions.*`                           | `channels.imessage.actions.*`             | 每项操作的开关相同（`reactions`、`edit`、`unsend`、`reply`、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`、`sendAttachment`），另新增 `polls`。全部默认为启用；私有 API 操作仍需要桥接。 |

多账户配置（`channels.bluebubbles.accounts.*`）可以一对一转换为 `channels.imessage.accounts.*`。

## 群组注册表陷阱

iMessage 插件会连续执行两道群组门禁。群组消息必须通过两道门禁才能到达代理：

1. **发送者 / 聊天目标白名单** (`channels.imessage.groupAllowFrom`) — 匹配发送者句柄或聊天目标（`chat_id:`、`chat_guid:`、`chat_identifier:` 条目）。当 `groupAllowFrom` 未设置时，此门禁会回退到 `allowFrom`；显式设置 `groupAllowFrom: []` 会禁用该回退，并在 `groupPolicy: "allowlist"` 下丢弃所有群组消息。
2. **群组注册表** (`channels.imessage.groups`) — 以数字 iMessage `chat_id` 为键：
   - 没有 `groups` 块（或为空）：只要门禁 1 有一个非空的有效发送者白名单，群组就会通过此门禁；发送者过滤器负责访问控制，并且不会触发启动时的“全部丢弃”警告。
   - `groups` 有条目但没有 `"*"`：只有列出的 `chat_id` 键可以通过。即使在 `groupPolicy: "open"` 下，列出任意群组也会把注册表变成白名单。
   - `groups: { "*": { ... } }`：所有群组都能通过此门禁。

迁移陷阱：BlueBubbles 将 `groups` 条目按聊天 GUID / 聊天标识符进行键控，而 iMessage 注册表使用数字 `chat_id` 作为键。逐个群组条目原样复制会创建一个非空注册表，但这些键永远不会匹配，因此每条群组消息都会在门禁 2 被丢弃。请原样复制 `"*"` 通配条目；特定群组条目则需要使用 `imsg chats` 中的 `chat_id` 值重新设置键。

这两条丢弃路径都可以在默认日志级别下通过 `warn` 行看到：

- 在启动时，每个账号只会出现一次：当设置了 `groupPolicy: "allowlist"` 且有效的群组发送者白名单为空时，会记录：`imessage: groupPolicy="allowlist" for account "<id>" but no group sender allowlist is configured ...`。请设置 `groupAllowFrom`（或 `allowFrom`）以允许发送者；仅添加 `groups` 并不能满足发送者门禁。
- 在运行时，每个 `chat_id` 只会出现一次：当注册表丢弃某个群组时，会记录：`imessage: dropping group message from chat_id=<id> ... not in channels.imessage.groups allowlist`，并指出需要添加的确切键。

无论哪种情况，私信都会继续工作——它们走的是不同的代码路径，所以私信成功并不能证明群组路由正常。

在 `groupPolicy: "allowlist"` 下，最小的按发送者范围控制的配置如下：

```json5
{
  channels: {
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123", "chat_guid:any;-;..."],
    },
  },
}
```

这会允许配置中的发送者在任何群组中发送消息。你可以添加 `groups` 条目来限定允许的聊天，或设置诸如 `requireMention` 之类的每个聊天选项；请原样复制 BlueBubbles 的 `"*"` 条目，但特定条目需要使用数字 iMessage `chat_id` 值重新设置键。

## 步骤说明

1. 翻译配置。编辑时保持新块处于禁用状态；当前 OpenClaw 会忽略旧的 `channels.bluebubbles` 块，它可以与新配置并排保留作为参考：

   ```json5
   {
     channels: {
       imessage: {
         enabled: false, // 准备切换时改为 true
         cliPath: "/opt/homebrew/bin/imsg",
         dmPolicy: "pairing",
         allowFrom: ["+15555550123"], // 从 bluebubbles.allowFrom 复制
         groupPolicy: "allowlist",
         groupAllowFrom: [], // 从 bluebubbles.groupAllowFrom 复制
         groups: { "*": { requireMention: true } }, // 通配符按原样复制；按 chat_id 为每个聊天条目重新设置键
         // 动作默认启用；将单独的开关设为 false 可禁用
       },
     },
   }
   ```

2. **切换并探测。** 将 `channels.imessage.enabled` 设为 `true`，重启 Gateway，并确认该通道报告健康：

   ```bash
   openclaw gateway restart
   openclaw channels status --probe --channel imessage   # 预期为 "works"；--json 会显示 privateApi.available: true
   ```

   该探测需要 Gateway 可达，并且只会探测已配置且已启用的账号。使用 [开始之前](#before-you-start) 中的直接 `imsg` 命令来验证 Mac 本机。

3. **验证 DM。** 给 agent 发送一条直接消息；确认回复成功送达。

4. **单独验证群聊。** DM 和群聊走的是不同的代码路径——DM 成功并不能证明群聊路由正常。请在一个允许的群聊中发送消息，并确认回复成功送达。如果群聊没有响应（没有 agent 回复，也没有错误），请查看 gateway 日志中上文 “Group registry footgun” 提到的两条 `warn` 日志。启动时的警告意味着有效的发送者 allowlist 为空；按 `chat_id` 的警告则意味着已填充的 `groups` 注册表中不包含该聊天。

5. **验证动作能力。** 在已配对的 DM 中，让 agent 执行 react、edit、unsend、reply、发送照片，以及（在群聊中）重命名群组或添加/移除参与者。每个动作都应当原生出现在 Messages.app 中。如果任何动作抛出 `iMessage <action> requires the imsg private API bridge`，请再次运行 `imsg launch`，并使用 `openclaw channels status --probe` 刷新状态。

6. **在确认 iMessage 的 DM、群聊和动作都正常后，移除 BlueBubbles 服务器和 `channels.bluebubbles` 块。** OpenClaw 不会读取 `channels.bluebubbles`。

## 动作一览

| 动作                                              | 旧版 BlueBubbles | iMessage 插件                                                               |
| ------------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| 发送文本 / SMS 回退                               | ✅                 | ✅                                                                            |
| 发送媒体（照片、视频、文件、语音）                 | ✅                 | ✅                                                                            |
| 线程回复（`reply_to_guid`）                        | ✅                 | ✅（关闭 [#51892](https://github.com/openclaw/openclaw/issues/51892)）       |
| Tapback（`react`）                                | ✅                 | ✅                                                                            |
| 编辑 / 撤回（macOS 13+ 收件人）                    | ✅                 | ✅                                                                            |
| 发送屏幕效果                                      | ✅                 | ✅（关闭 [#9394](https://github.com/openclaw/openclaw/issues/9394)）         |
| 富文本加粗 / 斜体 / 下划线 / 删除线                | ✅                 | ✅（通过 attributedBody 实现 typed-run 格式化）                              |
| 原生“信息”投票（创建和投票）                       | ❌                 | ✅（`actions.polls`；收件人需要 iOS/macOS 26+ 才能原生渲染）                 |
| 重命名群组 / 设置群组图标                           | ✅                 | ✅                                                                            |
| 添加 / 移除参与者，退出群组                        | ✅                 | ✅                                                                            |
| 已读回执和输入指示器                               | ✅                 | ✅（基于私有 API 探测进行门控）                                              |
| Apple URL 预览拆分发送合并                         | ✅                 | ✅（由 `imsg` 0.13.1 及更高版本在上游处理；无需 OpenClaw 设置）              |
| 重启后的入站恢复                                   | ✅                 | ✅（自动：`since_rowid` 回放 + GUID 去重；本地环境的窗口更大）               |

iMessage 会恢复网关宕机期间遗漏的消息：启动时，它会通过 `imsg watch.subscribe` 的 `since_rowid` 从最后已分发的 rowid 重新回放，按 GUID 去重，并通过过期的积压年龄边界来抑制 Push-flush 的“积压炸弹”。这运行在 `imsg` RPC 连接之上，因此远程 SSH 的 `cliPath` 配置同样适用；本地配置则拥有更大的恢复窗口，因为它们可以读取 `chat.db`。参见 [桥接或网关重启后的入站恢复](/channels/imessage#inbound-recovery-after-a-bridge-or-gateway-restart)。

## 配对、会话和 ACP 绑定

- **允许列表按 handle 继承。** `channels.imessage.allowFrom` 会识别 BlueBubbles 使用的相同 `+15555550123` / `user@example.com` 字符串——请原样复制。
- **配对存储中的审批不会迁移。** 配对存储是按 channel 区分的，旧的 BlueBubbles 存储不会迁移过来。仅通过配对获批的发送者必须在 iMessage 下重新配对一次，或者你把他们的 handle 加到 `allowFrom` 中。
- **会话** 仍然按 agent + chat 作用域划分。默认 `session.dmScope=main` 下，DM 会折叠到 agent 的主会话中；群聊会话仍按 `chat_id` 保持隔离（`agent:<agentId>:imessage:group:<chat_id>`）。BlueBubbles 会话键下的旧对话历史不会进入 iMessage 会话。
- **ACP 绑定** 中引用 `match.channel: "bluebubbles"` 的地方必须改为 `"imessage"`。`match.peer.id` 的形式（`chat_id:`、`chat_guid:`、`chat_identifier:`、裸 handle）是相同的。

## 没有回滚通道

没有受支持的 BlueBubbles 运行时可以切回去。如果 iMessage 验证失败，请将 `channels.imessage.enabled: false`，重启 Gateway，修复 `imsg` 阻塞因素，然后重试切换。

回复缓存位于 SQLite 插件状态中。`openclaw doctor --fix` 会在存在旧的 `imessage/reply-cache.jsonl` 旁车文件时导入并归档它。

## 相关

- [BlueBubbles 移除和 imsg iMessage 路径](/announcements/bluebubbles-imessage) — 简短公告和运维摘要。
- [iMessage](/channels/imessage) — 完整的 iMessage 通道参考，包括 `imsg launch` 设置和能力检测。
- `/channels/bluebubbles` — 重定向到此迁移指南的旧 URL。
- [配对](/channels/pairing) — DM 认证和配对流程。
- [通道路由](/channels/channel-routing) — 网关如何为出站回复选择通道。
