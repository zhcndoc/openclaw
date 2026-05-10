---
summary: "将旧的 BlueBubbles 配置迁移到捆绑的 iMessage 插件，同时不丢失配对、允许名单或群组绑定。"
read_when:
  - 计划从 BlueBubbles 迁移到捆绑的 iMessage 插件
  - 将 BlueBubbles 配置键转换为 iMessage 对应项
  - 在启用 iMessage 插件前验证 imsg
title: "从 BlueBubbles 迁移"
---

捆绑的 `imessage` 插件现在通过在 JSON-RPC 上驱动 [`steipete/imsg`](https://github.com/steipete/imsg)，可访问与 BlueBubbles 相同的私有 API 表面（`react`、`edit`、`unsend`、`reply`、`sendWithEffect`、群组管理、附件）。如果你已经在一台安装了 `imsg` 的 Mac 上运行它，你可以弃用 BlueBubbles 服务器，让插件直接与 Messages.app 通信。

BlueBubbles 支持已被移除。OpenClaw 仅通过 `imsg` 支持 iMessage。本指南用于将旧的 `channels.bluebubbles` 配置迁移到 `channels.imessage`；没有其他受支持的迁移路径。

## 何时适合进行此迁移

- 你已经在同一台 Mac 上运行 `imsg`（或通过 SSH 可访问的 Mac），并且 Messages.app 已登录。
- 你希望减少一个组件——不再需要单独的 BlueBubbles 服务器、无需认证 REST 端点、也无需 webhook 相关配置。只用一个 CLI 二进制文件，而不是服务器 + 客户端应用 + 辅助进程。
- 你使用的是 [受支持的 macOS / `imsg` 构建版本](/channels/imessage#requirements-and-permissions-macos)，并且私有 API 探测报告 `available: true`。

## imsg 的作用

`imsg` 是一个用于 Messages 的本地 macOS CLI。OpenClaw 会启动 `imsg rpc` 作为子进程，并通过 stdin/stdout 使用 JSON-RPC 通信。这里没有 HTTP 服务器、webhook URL、后台守护进程、launch agent 或需要开放的端口。

- 读取通过只读 SQLite 句柄访问 `~/Library/Messages/chat.db`。
- 实时入站消息来自 `imsg watch` / `watch.subscribe`，它会跟踪 `chat.db` 的文件系统事件，并在必要时回退到轮询。
- 发送通过 Messages.app 自动化完成，适用于普通文本和文件发送。
- 高级操作使用 `imsg launch` 将 `imsg` 辅助程序注入 Messages.app。它解锁了已读回执、输入指示、富发送、编辑、撤回、线程式回复、Tapback 以及群组管理。
- Linux 构建可以检查复制出来的 `chat.db`，但不能发送、不能监听实时 Mac 数据库，也不能驱动 Messages.app。对于 OpenClaw 的 iMessage，请在已登录的 Mac 上运行 `imsg`，或通过该 Mac 的 SSH 包装器运行。

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

   将 `42` 替换为 `imsg chats` 返回的真实聊天 ID。发送需要 Messages.app 的自动化权限。如果 OpenClaw 会通过 SSH 运行，请使用 OpenClaw 将使用的同一个 SSH 包装器或用户上下文来执行这些命令。

3. 在需要高级操作时启用私有 API 桥接：

   ```bash
   imsg launch
   imsg status --json
   ```

   `imsg launch` 需要关闭 SIP。基本发送、历史记录和监听不需要 `imsg launch`；高级操作才需要。

4. 通过 OpenClaw 验证桥接：

   ```bash
   openclaw channels status --probe
   ```

   你希望看到 `imessage.privateApi.available: true`。如果它报告为 `false`，先修复这个问题——参见[能力检测](/channels/imessage#private-api-actions)。

5. 备份你的配置：

   ```bash
   cp ~/.openclaw/openclaw.json5 ~/.openclaw/openclaw.json5.bak
   ```

## 配置转换

iMessage 和 BlueBubbles 在很多通道级配置上是相同的。发生变化的键主要是传输层（REST 服务器 vs 本地 CLI）。行为类键（`dmPolicy`、`groupPolicy`、`allowFrom` 等）保持相同含义。

| BlueBubbles                                                | 捆绑的 iMessage                          | 备注                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channels.bluebubbles.enabled`                             | `channels.imessage.enabled`               | 语义相同。                                                                                                                                                                                                                                                                                                                                   |
| `channels.bluebubbles.serverUrl`                           | _(已移除)_                                | 没有 REST 服务器——插件通过 stdio 启动 `imsg rpc`。                                                                                                                                                                                                                                                                                          |
| `channels.bluebubbles.password`                            | _(已移除)_                                | 不需要 webhook 认证。                                                                                                                                                                                                                                                                                                                       |
| _(隐含)_                                                   | `channels.imessage.cliPath`               | `imsg` 的路径（默认 `imsg`）；在 SSH 场景下使用包装脚本。                                                                                                                                                                                                                                                                                    |
| _(隐含)_                                                   | `channels.imessage.dbPath`                | 可选的 Messages.app `chat.db` 覆盖；省略时会自动检测。                                                                                                                                                                                                                                                                                        |
| _(隐含)_                                                   | `channels.imessage.remoteHost`            | `host` 或 `user@host`——仅当 `cliPath` 是 SSH 包装器并且你希望通过 SCP 获取附件时需要。                                                                                                                                                                                                                                                       |
| `channels.bluebubbles.dmPolicy`                            | `channels.imessage.dmPolicy`              | 相同取值（`pairing` / `allowlist` / `open` / `disabled`）。                                                                                                                                                                                                                                                                                   |
| `channels.bluebubbles.allowFrom`                           | `channels.imessage.allowFrom`             | 配对批准按号码/账号标识继承，而不是按 token。                                                                                                                                                                                                                                                                                                |
| `channels.bluebubbles.groupPolicy`                         | `channels.imessage.groupPolicy`           | 相同取值（`allowlist` / `open` / `disabled`）。                                                                                                                                                                                                                                                                                               |
| `channels.bluebubbles.groupAllowFrom`                      | `channels.imessage.groupAllowFrom`        | 相同。                                                                                                                                                                                                                                                                                                                                       |
| `channels.bluebubbles.groups`                              | `channels.imessage.groups`                | **原样复制，包括任何 `groups: { "*": { ... } }` 通配符条目。** 每个群组的 `requireMention`、`tools`、`toolsBySender` 都会保留。在 `groupPolicy: "allowlist"` 下，空的或缺失的 `groups` 块会静默丢弃所有群组消息——见下方“群组注册表陷阱”。                                               |
| `channels.bluebubbles.sendReadReceipts`                    | `channels.imessage.sendReadReceipts`      | 默认 `true`。在捆绑插件中，这只会在私有 API 探测正常时触发。                                                                                                                                                                                                                                                                                 |
| `channels.bluebubbles.includeAttachments`                  | `channels.imessage.includeAttachments`    | 结构相同，**默认也为关闭**。如果你在 BlueBubbles 中有附件流转，必须在 iMessage 配置块中显式重新设置此项——它不会隐式继承，否则入站照片/媒体会在没有任何 `Inbound message` 日志行的情况下被静默丢弃，直到你设置它。                                                             |
| `channels.bluebubbles.attachmentRoots`                     | `channels.imessage.attachmentRoots`       | 本地根目录；通配符规则相同。                                                                                                                                                                                                                                                                                                                 |
| _(不适用)_                                                 | `channels.imessage.remoteAttachmentRoots` | 仅在为 SCP 获取设置了 `remoteHost` 时使用。                                                                                                                                                                                                                                                                                                   |
| `channels.bluebubbles.mediaMaxMb`                          | `channels.imessage.mediaMaxMb`            | iMessage 默认 16 MB（BlueBubbles 默认是 8 MB）。如果你想保留较低上限，请显式设置。                                                                                                                                                                                                                                                           |
| `channels.bluebubbles.textChunkLimit`                      | `channels.imessage.textChunkLimit`        | 两者默认都是 4000。                                                                                                                                                                                                                                                                                                                          |
| `channels.bluebubbles.coalesceSameSenderDms`               | `channels.imessage.coalesceSameSenderDms` | 相同的可选项。仅适用于 DM——群聊在两个通道上都保持每条消息的即时发送。启用后，如果没有显式设置 `messages.inbound.byChannel.imessage`，默认入站去抖时间会扩展到 2500 ms。参见 [iMessage 文档 § 合并同一发送者的分开发送 DM](/channels/imessage#coalescing-split-send-dms-command--url-in-one-composition)。 |
| `channels.bluebubbles.enrichGroupParticipantsFromContacts` | _(不适用)_                                   | iMessage 已经从 `chat.db` 读取发送者显示名。                                                                                                                                                                                                                                                                                                   |
| `channels.bluebubbles.actions.*`                           | `channels.imessage.actions.*`             | 每个动作的开关：`reactions`、`edit`、`unsend`、`reply`、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`、`sendAttachment`。                                                                                                                                                            |

多账户配置（`channels.bluebubbles.accounts.*`）可一对一转换为 `channels.imessage.accounts.*`。

## 群组注册表陷阱

捆绑的 iMessage 插件会连续运行 **两个** 独立的群组 allowlist 门禁。群组消息要到达 agent，两个都必须通过：

1. **发送者 / 聊天目标 allowlist** (`channels.imessage.groupAllowFrom`) — 由 `isAllowedIMessageSender` 检查。按发送者 handle、`chat_guid`、`chat_identifier` 或 `chat_id` 匹配传入消息。与 BlueBubbles 的形状相同。
2. **群组注册表** (`channels.imessage.groups`) — 由 `inbound-processing.ts:199` 中的 `resolveChannelGroupPolicy` 检查。对于 `groupPolicy: "allowlist"`，这个门禁要求满足以下任一条件：
   - 一个 `groups: { "*": { ... } }` 通配符条目（设置 `allowAll = true`），或
   - `groups` 下针对每个 `chat_id` 的显式条目。

如果门禁 1 通过但门禁 2 失败，消息会被丢弃。插件会发出两个 `warn` 级别信号，因此在默认日志级别下这不再是静默失败：

- 当设置了 `groupPolicy: "allowlist"` 但 `channels.imessage.groups` 为空（没有 `"*"` 通配符，也没有任何按 `chat_id` 的条目）时，每个账号在启动时会有一次性的 `warn` — 会在任何消息到达之前触发。
- 当某个特定群组在运行时第一次被丢弃时，会针对该 `chat_id` 发出一次性的 `warn`，其中会指出 `chat_id` 以及需要添加到 `groups` 中以允许它的确切键。

DM 仍然可以工作，因为它们走的是不同的代码路径。

这是最常见的 BlueBubbles → 捆绑 iMessage 迁移失败模式：运维人员复制了 `groupAllowFrom` 和 `groupPolicy`，却跳过了 `groups` 块，因为 BlueBubbles 的 `groups: { "*": { "requireMention": true } }` 看起来像一个无关的提及设置。实际上，它对注册表门禁来说是关键依赖。

在设置 `groupPolicy: "allowlist"` 后，要让群组消息继续流转的最小配置如下：

```json5
{
  channels: {
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123", "chat_guid:any;-;..."],
      groups: {
        "*": { requireMention: true },
      },
    },
  },
}
```

当没有配置提及模式时，`*` 下的 `requireMention: true` 是无害的：运行时会设置 `canDetectMention = false`，并在 `inbound-processing.ts:512` 处直接短路掉提及丢弃逻辑。配置了提及模式（`agents.list[].groupChat.mentionPatterns`）时，它会按预期工作。

如果网关日志出现 `imessage: dropping group message from chat_id=<id>` 或启动时出现 `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty`，说明是门禁 2 在丢弃消息——添加 `groups` 块。

## 步骤说明

1. 在现有 BlueBubbles 块旁边添加一个 iMessage 块。在新路径验证通过之前，旧块只保留为复制来源：

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         // ... 现有配置 ...
       },
       imessage: {
         enabled: false, // 在下面的干运行验证后再打开
         cliPath: "/opt/homebrew/bin/imsg",
         dmPolicy: "pairing",
         allowFrom: ["+15555550123"], // 从 bluebubbles.allowFrom 复制
         groupPolicy: "allowlist",
         groupAllowFrom: [], // 从 bluebubbles.groupAllowFrom 复制
         groups: { "*": { requireMention: true } }, // 从 bluebubbles.groups 复制 — 如果缺失会静默丢弃群组，见上面的“群组注册表陷阱”
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

2. **干运行探测** — 启动网关并确认 iMessage 报告健康：

   ```bash
   openclaw gateway
   openclaw channels status
   openclaw channels status --probe   # 期望 imessage.privateApi.available: true
   ```

   因为 `imessage.enabled` 仍然是 `false`，所以此时不会路由任何传入的 iMessage 流量——但 `--probe` 会实际探测 bridge，从而在切换前捕获权限 / 安装问题。

3. **切换过去。** 删除 BlueBubbles 配置，并在一次配置编辑中启用 iMessage：

   ```json5
   {
     channels: {
       imessage: { enabled: true /* ... */ },
     },
   }
   ```

   重启网关。此时传入的 iMessage 流量会通过捆绑插件流转。

4. **验证 DM。** 给 agent 发一条直接消息；确认回复能够送达。

5. **单独验证群组。** DM 和群组走不同的代码路径——DM 成功并不能证明群组也在正确路由。给 agent 在一个已配对的群聊中发消息，并确认回复能够送达。如果群组变得沉默（没有 agent 回复，也没有错误），检查网关日志中是否有 `imessage: dropping group message from chat_id=<id>` 或启动时的 `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty` 行——这两者在默认日志级别下都会触发。如果出现任意一个，说明你的 `groups` 块缺失或为空——见上面的“群组注册表陷阱”。

6. **验证动作能力** — 在一个已配对的 DM 中，让 agent 执行 react、edit、unsend、reply、发送照片，以及（在群组中）重命名群组 / 添加或移除成员。每个动作都应该原生落到 Messages.app 中。如果有任何动作抛出 “iMessage `<action>` requires the imsg private API bridge”，请再次运行 `imsg launch` 并刷新 `channels status --probe`。

7. **在 iMessage 的 DM、群组和动作都验证完成后，移除 BlueBubbles 服务器和配置。** OpenClaw 将不会使用 `channels.bluebubbles`。

## 一览动作对齐

| Action                                                     | legacy BlueBubbles                  | bundled iMessage                                                                                                        |
| ---------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Send text / SMS fallback                                   | ✅                                  | ✅                                                                                                                      |
| Send media (photo, video, file, voice)                     | ✅                                  | ✅                                                                                                                      |
| Threaded reply (`reply_to_guid`)                           | ✅                                  | ✅ (closes [#51892](https://github.com/openclaw/openclaw/issues/51892))                                                 |
| Tapback (`react`)                                          | ✅                                  | ✅                                                                                                                      |
| Edit / unsend (macOS 13+ recipients)                       | ✅                                  | ✅                                                                                                                      |
| Send with screen effect                                    | ✅                                  | ✅ (closes part of [#9394](https://github.com/openclaw/openclaw/issues/9394))                                           |
| Rich text bold / italic / underline / strikethrough        | ✅                                  | ✅ (typed-run formatting via attributedBody)                                                                            |
| Rename group / set group icon                              | ✅                                  | ✅                                                                                                                      |
| Add / remove participant, leave group                      | ✅                                  | ✅                                                                                                                      |
| Read receipts and typing indicator                         | ✅                                  | ✅ (gated on private API probe)                                                                                         |
| Same-sender DM coalescing                                  | ✅                                  | ✅ (DM-only; opt-in via `channels.imessage.coalesceSameSenderDms`)                                                      |
| Catchup of inbound messages received while gateway is down | ✅ (webhook replay + history fetch) | ✅ (opt-in via `channels.imessage.catchup.enabled`; closes [#78649](https://github.com/openclaw/openclaw/issues/78649)) |

iMessage 补抓现在已作为捆绑插件的可选功能提供。在网关启动时，如果 `channels.imessage.catchup.enabled` 为 `true`，网关会使用与 `imsg watch` 相同的 JSON-RPC 客户端执行一次 `chats.list` + 按聊天分别执行 `messages.history`，将每条遗漏的入站记录重新走一遍实时分发路径（allowlist、群组策略、去抖、回声缓存），并为每个账号持久化一个游标，以便后续启动从上次中断处继续。有关调优请参见 [在网关停机后进行补抓](/channels/imessage#catching-up-after-gateway-downtime)。

## 配对、会话和 ACP 绑定

- **配对批准** 会按 handle 继承。你不需要重新批准已知发送者——`channels.imessage.allowFrom` 会识别 BlueBubbles 过去使用的相同 `+15555550123` / `user@example.com` 字符串。
- **会话** 仍按 agent + chat 进行作用域划分。DM 在默认 `session.dmScope=main` 下会合并到 agent 主会话；群组会话仍按 `chat_id` 隔离。会话键不同（`agent:<id>:imessage:group:<chat_id>` vs BlueBubbles 等价键）——BlueBubbles 会话键下的旧会话历史不会迁移到 iMessage 会话中。
- 需要将引用 `match.channel: "bluebubbles"` 的 **ACP 绑定** 更新为 `"imessage"`。`match.peer.id` 的形状（`chat_id:`、`chat_guid:`、`chat_identifier:`、裸 handle）是相同的。

## 没有回滚通道

没有受支持的 BlueBubbles 运行时可以切回去。如果 iMessage 验证失败，请将 `channels.imessage.enabled: false`，重启 Gateway，修复 `imsg` 阻塞因素，然后重试切换。

回复缓存位于 `~/.openclaw/state/imessage/reply-cache.jsonl`（模式 `0600`，父目录 `0700`）。如果你想要一个全新的状态，可以安全删除它。

## 相关

- [iMessage](/channels/imessage) — 完整的 iMessage 通道参考，包括 `imsg launch` 设置和能力检测。
- `/channels/bluebubbles` — 重定向到本迁移指南的旧 URL。
- [Pairing](/channels/pairing) — DM 认证和配对流程。
- [Channel Routing](/channels/channel-routing) — 网关如何为出站回复选择通道。
