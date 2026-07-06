---
summary: "将旧的 BlueBubbles 配置迁移到捆绑的 iMessage 插件：键映射、群组允许名单门控，以及切换验证。"
read_when:
  - 计划从 BlueBubbles 迁移到捆绑的 iMessage 插件
  - 将 BlueBubbles 配置键转换为 iMessage 对应项
  - 在启用 iMessage 插件前验证 imsg
title: "从 BlueBubbles 迁移"
---

已移除 BlueBubbles 支持。OpenClaw 仅通过捆绑的 `imessage` 插件支持 iMessage，该插件通过 JSON-RPC 驱动 [`steipete/imsg`](https://github.com/steipete/imsg)，并可访问与 BlueBubbles 相同的私有 API 接口（`react`、`edit`、`unsend`、`reply`、`sendWithEffect`、原生投票、群组管理、附件）。一个 CLI 二进制文件取代了 BlueBubbles 服务器 + 客户端应用 + webhook 连接：没有 REST 端点，也没有 webhook 认证。

本指南将旧的 `channels.bluebubbles` 配置迁移为 `channels.imessage`。没有其他受支持的迁移路径。在当前 OpenClaw 中，残留的 `channels.bluebubbles` 块不会生效——运行时不会读取它。

<Note>
关于简短公告和运维摘要，请参见 [BlueBubbles 移除以及 imsg iMessage 路径](/announcements/bluebubbles-imessage)。
</Note>

## 迁移清单

如果你已经知道旧的 BlueBubbles 配置，最安全的最短迁移路径如下：

1. 在运行 Messages.app 的 Mac 上直接验证 `imsg`（`imsg chats`、`imsg history`、`imsg send`、`imsg rpc --help`）。
2. 将行为键从 `channels.bluebubbles` 复制到 `channels.imessage`：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`includeAttachments`、`attachmentRoots`、`mediaMaxMb`、`textChunkLimit`、`coalesceSameSenderDms` 和 `actions`。
3. 删除不再存在的传输键：`serverUrl`、`password`、webhook URLs，以及 BlueBubbles server 设置。
4. 如果 Gateway 不运行在 Messages 所在的 Mac 上，将 `channels.imessage.cliPath` 设置为 SSH 包装器，并为远程附件获取设置 `remoteHost`。
5. 启用 `channels.imessage`，重启 Gateway，然后运行 `openclaw channels status --probe --channel imessage`。
6. 测试一个 DM、一个允许的群聊、（如果启用）附件，以及你期望代理使用的每个私有 API 动作。
7. 在验证 iMessage 路径后，删除 BlueBubbles server 和旧的 `channels.bluebubbles` 配置。

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
   imsg --version
   imsg chats --limit 3
   ```

   如果 `imsg chats` 失败并显示 `unable to open database file`、空输出，或 `authorization denied`，请为启动 `imsg` 的终端、编辑器、Node 进程、Gateway 服务或 SSH 父进程授予“完全磁盘访问权限”，然后重新打开该父进程。

2. 在更改 OpenClaw 配置之前，先验证读取、监听、发送和 RPC 能力：

   ```bash
   imsg chats --limit 10 --json | jq -s
   imsg history --chat-id 42 --limit 10 --attachments --json | jq -s
   imsg watch --chat-id 42 --reactions --json
   imsg send --chat-id 42 --text "OpenClaw imsg test"
   imsg rpc --help
   ```

   将 `42` 替换为 `imsg chats` 返回的真实聊天 ID。发送需要为 Messages.app 授予自动化权限。如果 OpenClaw 将通过 SSH 运行，请通过 OpenClaw 将使用的同一 SSH 包装器或用户上下文运行这些命令。如果读取正常但发送因 AppleEvents `-1743` 失败，请检查自动化是否落到了 `/usr/libexec/sshd-keygen-wrapper` 上；参见 [SSH wrapper sends fail with AppleEvents -1743](/channels/imessage#requirements-and-permissions-macos)。

3. 在需要高级操作时启用私有 API 桥接：

   ```bash
   imsg launch
   imsg status --json
   ```

   `imsg launch` 需要禁用 SIP（并且在现代 macOS 上还需要放宽库验证——参见 [启用 imsg 私有 API](/channels/imessage#enabling-the-imsg-private-api)）。基础发送、历史记录和监听无需 `imsg launch` 即可工作；高级操作则不行。

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

| BlueBubbles                                                | bundled iMessage                          | Notes                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channels.bluebubbles.enabled`                             | `channels.imessage.enabled`               | 含义相同（只要该块存在，默认值为 `true`）。                                                                                                                                                                                                                                                                          |
| `channels.bluebubbles.serverUrl`                           | _(removed)_                               | 不需要 REST 服务器——插件通过 stdio 启动 `imsg rpc`。                                                                                                                                                                                                                                                               |
| `channels.bluebubbles.password`                            | _(removed)_                               | 不需要 webhook 认证。                                                                                                                                                                                                                                                                                                |
| _(implicit)_                                               | `channels.imessage.cliPath`               | `imsg` 的路径（默认 `imsg`）；如需通过 SSH，请使用包装脚本。                                                                                                                                                                                                                                                       |
| _(implicit)_                                               | `channels.imessage.dbPath`                | 可选的 Messages.app `chat.db` 覆盖路径；若省略则自动检测。                                                                                                                                                                                                                                                          |
| _(implicit)_                                               | `channels.imessage.remoteHost`            | `host` 或 `user@host` —— 仅当 `cliPath` 是 SSH 包装器且你希望通过 SCP 获取附件时才需要。                                                                                                                                                                                                                            |
| `channels.bluebubbles.dmPolicy`                            | `channels.imessage.dmPolicy`              | 相同的取值（`pairing` / `allowlist` / `open` / `disabled`）；默认 `pairing`。                                                                                                                                                                                                                                       |
| `channels.bluebubbles.allowFrom`                           | `channels.imessage.allowFrom`             | 相同的处理对象格式（`+15555550123`、`user@example.com`）。配对存储中的授权不会迁移——见下文。                                                                                                                                                                                                                        |
| `channels.bluebubbles.groupPolicy`                         | `channels.imessage.groupPolicy`           | 相同的取值（`allowlist` / `open` / `disabled`）；默认 `allowlist`。                                                                                                                                                                                                                                                 |
| `channels.bluebubbles.groupAllowFrom`                      | `channels.imessage.groupAllowFrom`        | 相同。未设置时，iMessage 会回退使用 `allowFrom`；显式设置为空的 `groupAllowFrom: []` 会在 `groupPolicy: "allowlist"` 下阻止所有群组。                                                                                                                                                                               |
| `channels.bluebubbles.groups`                              | `channels.imessage.groups`                | 将 `"*"` 通配符条目原样复制；按数字 iMessage `chat_id` 为每个群组条目重新设定键——见“群组注册表陷阱”。`requireMention`、`tools`、`toolsBySender`、`systemPrompt` 会沿用。                                                                                                                                      |
| `channels.bluebubbles.sendReadReceipts`                    | `channels.imessage.sendReadReceipts`      | 默认 `true`。使用捆绑插件时，只有私有 API 探测可用时才会触发。                                                                                                                                                                                                                                                         |
| `channels.bluebubbles.includeAttachments`                  | `channels.imessage.includeAttachments`    | 结构相同，默认关闭。如果在 BlueBubbles 上附件能够正常流转，请显式设置此项——否则传入的照片/媒体会被静默丢弃（不会出现 `Inbound message` 日志行）。                                                                                                                                                                 |
| `channels.bluebubbles.attachmentRoots`                     | `channels.imessage.attachmentRoots`       | 本地根目录；通配符规则相同。                                                                                                                                                                                                                                                                                        |
| _(N/A)_                                                    | `channels.imessage.remoteAttachmentRoots` | 仅在为 SCP 获取设置了 `remoteHost` 时使用。                                                                                                                                                                                                                                                                          |
| `channels.bluebubbles.mediaMaxMb`                          | `channels.imessage.mediaMaxMb`            | iMessage 默认 16 MB（BlueBubbles 默认是 8 MB）。如需保持较低上限，请显式设置。                                                                                                                                                                                                                                      |
| `channels.bluebubbles.textChunkLimit`                      | `channels.imessage.textChunkLimit`        | 两者默认均为 4000。                                                                                                                                                                                                                                                                                                  |
| `channels.bluebubbles.coalesceSameSenderDms`               | `channels.imessage.coalesceSameSenderDms` | 相同的可选功能。仅限 DM——群组仍按每条消息分发。除非设置了 `messages.inbound.byChannel.imessage` 或全局 `messages.inbound.debounceMs`，否则会将默认入站防抖扩大到 7000 ms。参见 [合并同一发送者分段 DM](/channels/imessage#coalescing-split-send-dms-command--url-in-one-composition)。 |
| `channels.bluebubbles.enrichGroupParticipantsFromContacts` | _(N/A)_                                   | `imsg` 已经从 `chat.db` 中暴露发送者显示名称。                                                                                                                                                                                                                                                                      |
| `channels.bluebubbles.actions.*`                           | `channels.imessage.actions.*`             | 相同的按动作开关（`reactions`、`edit`、`unsend`、`reply`、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`、`sendAttachment`），外加新的 `polls`。所有默认都启用；私有 API 动作仍然需要桥接。                                      |

多账户配置（`channels.bluebubbles.accounts.*`）可以一对一转换为 `channels.imessage.accounts.*`。

## 群组注册表陷阱

捆绑的 iMessage 插件会连续运行两个群组门禁。群组消息必须同时通过这两个门禁才能到达 agent：

1. **发送者 / 聊天目标白名单** (`channels.imessage.groupAllowFrom`) — 匹配发送者句柄或聊天目标（`chat_id:`、`chat_guid:`、`chat_identifier:` 条目）。当 `groupAllowFrom` 未设置时，此门禁会回退到 `allowFrom`；显式设置 `groupAllowFrom: []` 会禁用该回退，并在 `groupPolicy: "allowlist"` 下丢弃所有群组消息。
2. **群组注册表** (`channels.imessage.groups`) — 以数字 iMessage `chat_id` 为键：
   - 没有 `groups` 块（或为空）：只要门禁 1 有一个非空的有效发送者白名单，群组就会通过此门禁；发送者过滤器负责访问控制，并且不会触发启动时的“全部丢弃”警告。
   - `groups` 有条目但没有 `"*"`：只有列出的 `chat_id` 键可以通过。即使在 `groupPolicy: "open"` 下，列出任意群组也会把注册表变成白名单。
   - `groups: { "*": { ... } }`：所有群组都能通过此门禁。

迁移陷阱：BlueBubbles 将 `groups` 条目按聊天 GUID / 聊天标识符进行键控，而 iMessage 注册表使用数字 `chat_id` 作为键。逐个群组条目原样复制会创建一个非空注册表，但这些键永远不会匹配，因此每条群组消息都会在门禁 2 被丢弃。请原样复制 `"*"` 通配条目；特定群组条目则需要使用 `imsg chats` 中的 `chat_id` 值重新设置键。

这两条丢弃路径都可以在默认日志级别下通过 `warn` 行看到：

- 在启动时，每个账号只会出现一次：当设置了 `groupPolicy: "allowlist"` 且有效的群组发送者白名单为空时，会记录：`imessage: groupPolicy="allowlist" for account "<id>" but no group sender allowlist is configured ...`。请设置 `groupAllowFrom`（或 `allowFrom`）以允许发送者；仅添加 `groups` 并不能满足发送者门禁。
- 在运行时，每个 `chat_id` 只会出现一次：当注册表丢弃某个群组时，会记录：`imessage: dropping group message from chat_id=<id> ... not in channels.imessage.groups allowlist`，并指出需要添加的确切键。

无论哪种情况，DM 都会继续工作——它们走的是不同的代码路径，所以 DM 成功并不能证明群组路由正常。

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

## 一览动作对齐

| Action                                              | legacy BlueBubbles | bundled iMessage                                                              |
| --------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| Send text / SMS fallback                            | ✅                 | ✅                                                                            |
| Send media (photo, video, file, voice)              | ✅                 | ✅                                                                            |
| Threaded reply (`reply_to_guid`)                    | ✅                 | ✅ (关闭 [#51892](https://github.com/openclaw/openclaw/issues/51892))       |
| Tapback (`react`)                                   | ✅                 | ✅                                                                            |
| Edit / unsend (macOS 13+ recipients)                | ✅                 | ✅                                                                            |
| Send with screen effect                             | ✅                 | ✅ (关闭 [#9394](https://github.com/openclaw/openclaw/issues/9394)) |
| Rich text bold / italic / underline / strikethrough | ✅                 | ✅（通过 attributedBody 实现 typed-run 格式化）                                  |
| Native Messages polls (create and vote)             | ❌                 | ✅ (`actions.polls`；收件人需要 iOS/macOS 26+ 才能原生渲染）      |
| Rename group / set group icon                       | ✅                 | ✅                                                                            |
| Add / remove participant, leave group               | ✅                 | ✅                                                                            |
| Read receipts and typing indicator                  | ✅                 | ✅（受私有 API 探测限制）                                               |
| Same-sender DM coalescing                           | ✅                 | ✅（仅限 DM；可通过 `channels.imessage.coalesceSameSenderDms` 选择启用）            |
| Inbound recovery after a restart                    | ✅                 | ✅（自动：`since_rowid` 重放 + GUID 去重；本地环境窗口更大）     |

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
