---
summary: "将旧版 BlueBubbles 配置迁移到官方 iMessage 插件：键映射、群组允许列表门控以及切换验证。"
read_when:
  - "计划从 BlueBubbles 迁移到官方 iMessage 插件"
  - "将 BlueBubbles 配置键转换为 iMessage 对应项"
  - "在启用 iMessage 插件前验证 imsg"
title: "从 BlueBubbles 迁移"
---

BlueBubbles 支持已被删除。 OpenClaw 仅通过官方 `@openclaw/imessage` 插件支持 iMessage，该插件通过 JSON-RPC 驱动 [`steipete/imsg`](https://github.com/steipete/imsg) 并达到 BlueBubbles 具有的相同私有 API 表面（`react`， `edit`、`unsend`、`reply`、`sendWithEffect`、本机民意调查、群组管理、附件）。一个 CLI 二进制文件替换了 BlueBubbles 服务器 + 客户端应用程序 + webhook 管道：没有 REST 端点，没有 webhook 身份验证。

本指南将旧的 `channels.bluebubbles` 配置迁移为 `channels.imessage`。没有其他受支持的迁移路径。在当前 OpenClaw 中，残留的 `channels.bluebubbles` 块不会生效——运行时不会读取它。

<Note>
关于简短公告和运维摘要，请参见 [BlueBubbles 移除以及 imsg iMessage 路径](/announcements/bluebubbles-imessage)。
</Note>

## <a id="migration-checklist"></a> 迁移清单

如果你已经知道旧的 BlueBubbles 配置，最安全的最短迁移路径如下：

1. 使用`openclaw plugins install @openclaw/imessage`安装官方插件并检查[应用结果](/plugins/manage-plugins#apply-changes-and-inspect)。
2. 在运行 Messages.app 的 Mac 上直接验证 `imsg`（`imsg chats`、`imsg history`、`imsg send`、`imsg rpc --help`）。
3. 将行为配置键从 `channels.bluebubbles` 复制到 `channels.imessage`：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`includeAttachments`、`attachmentRoots`、`mediaMaxMb`、`textChunkLimit` 和 `actions`。
4. Drop 不再存在的传输密钥：`serverUrl`、`password`、webhook URL 和 BlueBubbles 服务器设置。
5. 如果 Gateway 未运行在 Messages 所在的 Mac 上，请将 `channels.imessage.cliPath` 设置为 SSH 包装器在 Gateway 所在机器上的绝对路径，并将 `dbPath` 保持为该 Mac 上的绝对路径。对于复杂的包装器，请将 `remoteHost` 设置为 Messages 所在的 Mac；OpenClaw 会自动检测简单的透明包装器形式以保持兼容性。
6. 启用`channels.imessage`，然后运行`openclaw channels status --probe --channel imessage`。配置更改遵循[hot reload](/gateway/configuration/hot-reload)；如果网关离线，则启动网关。
7. 测试一个 DM、一个允许的组、附件（如果已启用）以及您希望代理使用的每个私有 API 操作。
8. 验证 iMessage 路径后删除 BlueBubbles 服务器和旧的 `channels.bluebubbles` 配置。

<Note>
远程 `imsg` v0.13.4 有两个有限的 RPC 限制：投票必须使用 `pollOptionId`，而不能使用索引或选项文本；附件回复无法指定非零的消息部分索引。本地 `imsg` 的行为不受影响。
</Note>

## <a id="what-imsg-does"></a> imsg 的作用

`imsg` 是消息的本地 macOS CLI。 OpenClaw 将 `imsg rpc` 作为子进程启动，并通过 stdin/stdout. 与 JSON-RPC 进行对话。没有要公开的 HTTP 服务器、Webhook URL、后台守护程序、启动代理或端口。

- 读取内容来自 `~/Library/Messages/chat.db`，使用只读的 SQLite 句柄。
- 实时传入消息来自 `imsg watch` / `watch.subscribe`，它会通过轮询回退机制跟踪 `chat.db` 的文件系统事件。
- 发送消息时，普通文本和文件发送会使用 Messages.app 自动化。
- 高级操作使用 `imsg launch` 将 `imsg` 帮助程序注入到 Messages.app. 中，这就是解锁已读回执、键入指示器、丰富发送、编辑、取消发送、线程回复、tapback、民意调查和组管理的功能。
- Linux 版本可以检查复制的 `chat.db`，但无法发送、观看实时 Mac 数据库或驱动 Messages.app. 对于 OpenClaw iMessage，请在登录的 Mac 上运行 `imsg` 或通过SSH 对该 Mac 的包装。

## <a id="before-you-start"></a> 开始之前

1. 在运行 Messages.app 的 Mac 上安装 `imsg`：

   ```bash
   brew install steipete/tap/imsg
   brew update && brew upgrade imsg
   imsg --version
   imsg chats --limit 3
   ```

   对于通常的本地安装，OpenClaw 安装程序可以在登录的 Messages Mac 上为 `imsg` 提供用户确认的 Homebrew 安装或更新。手动设置和 SSH-wrapper 拓扑仍由操作员管理：在将运行 `imsg` 的同一本地或远程用户上下文中重复 Homebrew 更新。如果 `imsg chats` 因 `unable to open database file`、空输出或 `authorization denied` 失败，请向终端、编辑器、Node 进程、网关服务或启动 `imsg` 的 SSH 父进程授予完全磁盘访问权限，然后重新打开该父进程。

2. 在更改 OpenClaw 配置之前验证读取、监视、发送和 RPC 表面：

   ```bash
   imsg chats --limit 10 --json | jq -s
   imsg history --chat-id 42 --limit 10 --attachments --json | jq -s
   imsg watch --chat-id 42 --reactions --json
   imsg send --chat-id 42 --text "OpenClaw imsg test"
   imsg rpc --help
   ```

   将 `42` 替换为 `imsg chats` 中的真实聊天 ID。发送需要 Messages.app. 的自动化权限如果 OpenClaw 将通过 SSH 运行，请通过 SSH 包装器或 OpenClaw 将使用的用户上下文运行这些命令。如果读取成功但发送失败，提示 AppleEvents `-1743`，请检查 Automation 是否降落在 `/usr/libexec/sshd-keygen-wrapper`；请参阅 [SSH 包装器发送失败，并显示 AppleEvents -1743](/channels/imessage#requirements-and-permissions-macos)。

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

   iMessage账户应报告`works`；对于`--json`，校验负载包括`privateApi.available: true`。如果报告 `false`，请首先修复该问题 - 请参阅 [ 能力检测 ](/channels/imessage#private-api-actions)。检查需要一个可访问的网关（否则 CLI 会回退到仅配置输出）并且仅检查已配置、启用的帐户。

5. 备份你的配置：

   ```bash
   cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak
   ```

## <a id="config-translation"></a> 配置转换

iMessage 和 BlueBubbles 共享大多数通道级行为键。不同之处在于传输方式（REST 服务器 vs 本地 CLI）以及群组注册表键格式。

| BlueBubbles                                                | iMessage 插件                           | 笔记                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `channels.bluebubbles.enabled`                             | `channels.imessage.enabled`               | 语义相同（区块存在后默认为 `true`）。                                                                                                                                                                                                                                                 |
| `channels.bluebubbles.serverUrl`                           | _(已移除)_                               | 没有 REST 服务器——插件通过标准输入输出启动 `imsg rpc`。                                                                                                                                                                                                                                              |
| `channels.bluebubbles.password`                            | _(已移除)_                               | 不需要 Webhook 身份验证。                                                                                                                                                                                                                                                                      |
| _(隐式)_                                               | `channels.imessage.cliPath`               | `imsg` 的路径（默认为 `imsg`）；对于 SSH，请使用 Gateway 主机上包装脚本的绝对路径。                                                                                                                                                                                                       |
| _(隐式)_                                               | `channels.imessage.dbPath`                | 可选的 Messages.app `chat.db` 覆盖路径；对于 SSH，这是 Messages Mac 上的绝对路径，绝不会基于 Gateway 的 home 目录进行展开。                                                                                                                                                        |
| _(隐式)_                                               | `channels.imessage.remoteHost`            | Mac 消息为 `host` 或 `user@host`；显式配置获胜，而简单的透明 SSH 包装器会在每个进程中自动检测一次。通过严格的 SSH/SCP. 启用入站附件获取和仅限所有者的出站暂存尽最大努力进行清理；故障会发出警告，并可能留下仅限所有者的残留物。 |
| `channels.bluebubbles.dmPolicy`                            | `channels.imessage.dmPolicy`              | 值相同（`pairing` / `allowlist` / `open` / `disabled`）；默认为 `pairing`。                                                                                                                                                                                                                        |
| `channels.bluebubbles.allowFrom`                           | `channels.imessage.allowFrom`             | 句柄格式相同（`+15555550123`、`user@example.com`）。配对存储中的批准不会迁移——见下文。                                                                                                                                                                                         |
| `channels.bluebubbles.groupPolicy`                         | `channels.imessage.groupPolicy`           | 值相同（`allowlist` / `open` / `disabled`）；默认为 `allowlist`。                                                                                                                                                                                                                                  |
| `channels.bluebubbles.groupAllowFrom`                      | `channels.imessage.groupAllowFrom`        | 相同的。未设置时，iMessage 回落至 `allowFrom`；显式为空的 `groupAllowFrom: []` 会阻止 `groupPolicy: "allowlist"` 下的所有组。                                                                                                                                                     |
| `channels.bluebubbles.groups`                              | `channels.imessage.groups`                | 原样复制 `"*"` 通配符条目；按数字形式的 iMessage `chat_id` 为每个群组条目重新设置键——见“群组注册表陷阱”。`requireMention`、`tools`、`toolsBySender`、`systemPrompt` 会继续生效。                                                                                                  |
| `channels.bluebubbles.sendReadReceipts`                    | `channels.imessage.sendReadReceipts`      | 默认`true`。仅当私人 API 检查启动时才会触发。                                                                                                                                                                                                                                      |
| `channels.bluebubbles.includeAttachments`                  | `channels.imessage.includeAttachments`    | 相同的形状，默认情况下相同。如果附件在 BlueBubbles 上流动，请显式设置此项 — 入站 photos/media 将被静默丢弃（无 `Inbound message` 日志行），直到您执行此操作。                                                                                                                   |
| `channels.bluebubbles.attachmentRoots`                     | `channels.imessage.attachmentRoots`       | 本地根目录；通配符规则相同。                                                                                                                                                                                                                                                                      |
| _(N/A)_                                                    | `channels.imessage.remoteAttachmentRoots` | 仅当为 SCP 获取设置 `remoteHost` 时才使用。                                                                                                                                                                                                                                                    |
| `channels.bluebubbles.mediaMaxMb`                          | `channels.imessage.mediaMaxMb`            | iMessage 默认为 16 MB（BlueBubbles 默认为 8 MB）。如需保持较低上限，请显式设置。                                                                                                                                                                                                        |
| `channels.bluebubbles.textChunkLimit`                      | `channels.imessage.textChunkLimit`        | 两者默认均为 4000。                                                                                                                                                                                                                                                                                  |
| `channels.bluebubbles.coalesceSameSenderDms`               | _(已移除)_                               | 不要迁移此密钥。 `imsg` 0.13.1 和较新的 Apple URL-preview 在 OpenClaw 接收之前进行拆分发送； `openclaw doctor --fix` 删除过时的 iMessage 密钥。                                                                                                                          |
| `channels.bluebubbles.enrichGroupParticipantsFromContacts` | _(N/A)_                                   | `imsg` 已显示 `chat.db` 中的发件人显示名称。                                                                                                                                                                                                                                           |
| `channels.bluebubbles.actions.*`                           | `channels.imessage.actions.*`             | 每项操作的开关相同（`reactions`、`edit`、`unsend`、`reply`、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`、`sendAttachment`），另新增 `polls`。全部默认为启用；私有 API 操作仍需要桥接。                       |

多账户配置（`channels.bluebubbles.accounts.*`）可以一对一转换为 `channels.imessage.accounts.*`。

## <a id="group-registry-footgun"></a> 群组注册表陷阱

iMessage 插件会连续执行两道群组门禁。群组消息必须通过两道门禁才能到达代理：

1. **发送者 / 聊天目标白名单** (`channels.imessage.groupAllowFrom`) — 匹配发送者句柄或聊天目标（`chat_id:`、`chat_guid:`、`chat_identifier:` 条目）。当 `groupAllowFrom` 未设置时，此门禁会回退到 `allowFrom`；显式设置 `groupAllowFrom: []` 会禁用该回退，并在 `groupPolicy: "allowlist"` 下丢弃所有群组消息。
2. **群组注册表** (`channels.imessage.groups`) — 以数字 iMessage `chat_id` 为键：
   - 没有 `groups` 块（或为空）：只要门禁 1 有一个非空的有效发送者白名单，群组就会通过此门禁；发送者过滤器负责访问控制，并且不会触发启动时的“全部丢弃”警告。
   - `groups` 有条目但没有 `"*"`：只有列出的 `chat_id` 键可以通过。即使在 `groupPolicy: "open"` 下，列出任意群组也会把注册表变成白名单。
   - `groups: { "*": { ... } }`：所有群组都能通过此门禁。

迁移陷阱：BlueBubbles 通过聊天 GUID / 聊天标识符键入 `groups` 条目，而 iMessage 注册表项通过数字 `chat_id`。逐字复制的每组条目会创建一个非空注册表，其密钥永远不会匹配，因此每个组消息都会在门 2 处丢弃。逐字复制 `"*"` 通配符；使用 `imsg chats` 中的 `chat_id` 值重新键入特定组条目。

这两条丢弃路径都可以在默认日志级别下通过 `warn` 行看到：

- 在启动时，每个账号只会出现一次：当设置了 `groupPolicy: "allowlist"` 且有效的群组发送者白名单为空时，会记录：`imessage: groupPolicy="allowlist" for account "<id>" but no group sender allowlist is configured ...`。请设置 `groupAllowFrom`（或 `allowFrom`）以允许发送者；仅添加 `groups` 并不能满足发送者门禁。
- 在运行时，每个 `chat_id` 只会出现一次：当注册表丢弃某个群组时，会记录：`imessage: dropping group message from chat_id=<id> ... not in channels.imessage.groups allowlist`，并指出需要添加的确切键。

无论哪种方式，DM 都会继续工作 — 它们采用不同的代码路径，因此 DM 的成功并不能证明组路由。

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

## <a id="step-by-step"></a> 步骤说明

1. 翻译配置。编辑时保持新块处于禁用状态；当前 OpenClaw 会忽略旧的 `channels.bluebubbles` 块，它可以与新配置并排保留作为参考：

   ```json5
   {
     channels: {
       imessage: {
         enabled: false, // flip to true when ready to cut over
         cliPath: "/opt/homebrew/bin/imsg",
         dmPolicy: "pairing",
         allowFrom: ["+15555550123"], // copy from bluebubbles.allowFrom
         groupPolicy: "allowlist",
         groupAllowFrom: [], // copy from bluebubbles.groupAllowFrom
         groups: { "*": { requireMention: true } }, // wildcard copies verbatim; re-key per-chat entries by chat_id
         // actions default to enabled; set individual toggles false to disable
       },
     },
   }
   ```

2. **切换并检查。** 设置`channels.imessage.enabled: true`，让[hot重新加载](/gateway/configuration/hot-reload)应用更改，并确认通道报告正常：

   ```bash
   openclaw channels status --probe --channel imessage   # expect "works"; --json shows privateApi.available: true
   ```

   该检查需要可访问的网关，并且仅检查已配置、已启用的帐户。在启动 ](#before-you-start) 之前使用 [ 中的直接 `imsg` 命令来验证 Mac 本身。

3. **验证DM。** 向代理发送直接消息；确认回复落地。

4. **分别验证组。** DM 和组采用不同的代码路径 — DM 成功并不能证明组正在路由。在允许的群聊中发送消息并确认回复。如果组变得静默（没有代理回复，没有错误），请检查网关日志中“组注册表 footgun”中的两行 `warn`。启动警告表示有效发件人白名单为空； per-`chat_id` 警告意味着填充的 `groups` 注册表不包含该聊天。

5. **验证操作面。** 从配对的 DM 中，要求代理做出反应、编辑、取消发送、回复、发送照片，以及（在群组中）将群组或 add/remove 重命名为参与者。每个操作都应本地登陆 Messages.app. 如果任何操作抛出 `iMessage <action> requires the imsg private API bridge`，请再次运行 `imsg launch` 并使用 `openclaw channels status --probe` 刷新。

6. **一旦验证了 iMessage DM、组和操作，请删除 BlueBubbles 服务器和 `channels.bluebubbles` 块**。 OpenClaw 不读取 `channels.bluebubbles`。

## <a id="action-parity-at-a-glance"></a> 动作一览

| 操作                                              | 旧版 BlueBubbles | iMessage 插件                                                               |
| --------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| 发送文本 / SMS 回退                            | ✅                 | ✅                                                                            |
| 发送媒体（照片、视频、文件、语音）              | ✅                 | ✅                                                                            |
| 线程回复（`reply_to_guid`）                    | ✅                 | ✅（关闭 [#51892](https://github.com/openclaw/openclaw/issues/51892)）       |
| 回击 （`react`）                                   | ✅                 | ✅                                                                            |
| 编辑 / 撤回（macOS 13+ 收件人）                | ✅                 | ✅                                                                            |
| 发送屏幕效果                             | ✅                 | ✅（关闭 [#9394](https://github.com/openclaw/openclaw/issues/9394)） |
| 富文本加粗 / 斜体 / 下划线 / 删除线 | ✅                 | ✅（通过 attributedBody 实现 typed-run 格式化）                                  |
| 原生“信息”投票（创建和投票）             | ❌                 | ✅（`actions.polls`；收件人需要 iOS/macOS 26+ 才能原生渲染）      |
| 重命名群组 / 设置群组图标                       | ✅                 | ✅                                                                            |
| 添加 / 移除参与者，退出群组               | ✅                 | ✅                                                                            |
| 已读回执和输入指示器                  | ✅                 | ✅（通过私人 API 支票进行门控）                                               |
| Apple URL-预览拆分发送合并             | ✅                 | ✅（由 `imsg` 0.13.1 及更新版本处理上游；无 OpenClaw 设置）         |
| 重启后的入站恢复                    | ✅                 | ✅（自动：`since_rowid` 回放 + GUID 去重；本地环境的窗口更大）     |

iMessage 会恢复网关宕机期间遗漏的消息：启动时，它会通过 `imsg watch.subscribe` 的 `since_rowid` 从最后已分发的 rowid 重新回放，按 GUID 去重，并通过过期的积压年龄边界来抑制 Push-flush 的“积压炸弹”。这运行在 `imsg` RPC 连接之上，因此远程 SSH 的 `cliPath` 配置同样适用；本地配置则拥有更大的恢复窗口，因为它们可以读取 `chat.db`。参见 [桥接或网关重启后的入站恢复](/channels/imessage#inbound-recovery-after-a-bridge-or-gateway-restart)。

## <a id="pairing%2C-sessions%2C-and-acp-bindings"></a><a id="pairing-sessions-and-acp-bindings"></a> 配对、会话和 ACP 绑定

- **允许列表按 handle 继承。** `channels.imessage.allowFrom` 会识别 BlueBubbles 使用的相同 `+15555550123` / `user@example.com` 字符串——请原样复制。
- **配对存储中的审批不会迁移。** 配对存储是按 channel 区分的，旧的 BlueBubbles 存储不会迁移过来。仅通过配对获批的发送者必须在 iMessage 下重新配对一次，或者你把他们的 handle 加到 `allowFrom` 中。
- **Sessions** 保持每个代理 + 聊天的范围。默认 `session.dmScope=main` 下 DM 崩溃到座席主会话中；使用默认值 `session.groupScope="per-group"`，组会话根据 `chat_id` （`agent:<agentId>:imessage:group:<chat_id>`） 保持隔离。 BlueBubbles 会话密钥下的旧对话历史记录不会带入 iMessage 会话中。
- **ACP 绑定** 中引用 `match.channel: "bluebubbles"` 的地方必须改为 `"imessage"`。`match.peer.id` 的形式（`chat_id:`、`chat_guid:`、`chat_identifier:`、裸 handle）是相同的。

## <a id="no-rollback-channel"></a> 没有回滚通道

没有可切换回的受支持的 BlueBubbles 运行时。如果 iMessage 验证失败，请设置 `channels.imessage.enabled: false`，使用 `openclaw channels status` 验证通道已停止，修复 `imsg` 阻止程序，然后重试切换。如果自动配置重新加载关闭，请按照 [ 手动应用 ](/gateway/configuration/hot-reload) 操作。

回复缓存位于 SQLite 插件状态。要导入6月之前的`imessage/reply-cache.jsonl` sidecar，请通过`2026.9.5`](/install/updating#upgrading-very-old-versions)升级[并首先运行其Doctor。当前版本保持旧文件不变。

## <a id="related"></a> 相关内容

- [BlueBubbles 移除和 imsg iMessage 路径](/announcements/bluebubbles-imessage) — 简短公告和运维摘要。
- [iMessage](/channels/imessage) — 完整的 iMessage 通道参考，包括 `imsg launch` 设置和能力检测。
- `/channels/bluebubbles` — 重定向到此迁移指南的旧 URL。
- [配对](/channels/pairing) — DM 认证和配对流程。
- [通道路由](/channels/channel-routing) — 网关如何选择出站回复的通道。
