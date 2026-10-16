---
summary: "sessionKey 模式、sessionId 生命周期、SessionEntry 字段和记录事件流"
read_when:
  - "您需要调试会话 ID、转录事件或会话行字段"
  - "读取或写入 SessionEntry 字段、分叉或成绩单条目类型"
title: "会话密钥、ID 和转录事件"
---

## <a id="session-keys-(sessionkey)"></a><a id="session-keys-sessionkey"></a> 会话键（`sessionKey`）

`sessionKey` 标识您所在的会话存储桶（路由+隔离）。路由规则：[/concepts/session](/concepts/session).

| 模式                      | 示例                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| Main/direct 聊天（每个代理） | `agent:<agentId>:main`                                      |
| 团体                        | `agent:<agentId>:<channel>:group:<id>`                      |
| Room/channel (Discord/Slack) | `agent:<agentId>:<channel>:channel:<id>` or `...:room:<id>` |
| 克朗                         | `cron:<job.id>`                                             |
| 网络钩子                      | `hook:<uuid>`（除非被覆盖）                           |

## <a id="session-ids-(sessionid)"></a><a id="session-ids-sessionid"></a> 会话 id（`sessionId`）

每个 `sessionKey` 都指向当前的 `sessionId`（继续对话的 SQLite 转录本身份）。决策逻辑位于 `src/auto-reply/reply/session.ts` 中的 `initSessionState()` 中。

- **Gateway reset**（`/new`、`/reset`）在现有持久会话中记录重置边界并保留其 `sessionId`。尚不存在的会话会收到新的 ID。
- **不自动重置** 是默认行为。当前的 `sessionId` 会继续使用，同时压缩机制会保持活动模型上下文的边界。
- **每日重置** （`session.reset.mode: "daily"`） 在配置的本地时间边界（`session.reset.atHour`，默认 `4`）之后的下一条消息上创建新的 `sessionId`。
- **空闲过期**（`session.reset.mode: "idle"` 且 `session.reset.idleMinutes`，或旧版 `session.idleMinutes`）会在消息于空闲窗口之后到达时创建新的 `sessionId`。如果同时配置了每日和空闲重置，则以先过期者为准。
- 当网关从操作员 UI 客户端接收到匹配的 `sessionId` 时，**Control UI 重新连接恢复** 会保留一次重新连接发送的当前可见会话。这是一个一次性信号；普通陈旧发送仍会创建新的 `sessionId`。
- **系统事件**（心跳、cron 唤醒、执行通知、网关簿记）可能会改变会话行，但永远不会延长 daily/idle 重置新鲜度。新提交到其目标对话的可见自动化结果会刷新该对话的空闲时间戳；静默运行和重播结果则不然。重置翻转会在构建新提示之前丢弃上一个会话的排队系统事件通知。
- **自动父分叉策略**在创建线程或子代理分叉时使用OpenClaw的活动分支。如果该分支太大（超过固定的内部上限，当前为 100K 代币），OpenClaw 会使用隔离的上下文启动子分支，而不是失败或继承不可用的历史记录。大小调整是自动的且不可配置；旧版 `session.parentForkMaxTokens` 配置已被 `openclaw doctor --fix` 删除。
- **Operator forks**：`sessions.create { parentSessionKey, fork: true }` 从父级的当前状态分支。准入使用所选子模型的有效可用输入容量，当模型容量不可用时，回落到 100K 安全上限。当父进程处于活动状态时，正常的分叉会被拒绝；仅通过最后完成的辅助消息添加 `forkFrom: "last-completed"` 副本，不包括正在进行的尾部。与自动父分叉不同，超过其容量限制的操作员分叉将被拒绝，而不是在隔离上下文中被接受。除非显式传递，否则子级将继承父级的模型选择。响应标记为 `forkedFromParent`，并且令牌计数器重新开始。
- **Message forks**：`sessions.fork { sessionKey, entryId }` 在选定的用户消息之前从活动路径前缀创建一个子级，并将该消息返回给编写器进行编辑。父级保持不变。隐身分叉保留父级的内存中存储类别；重新启动网关会删除这两个会话。 Codex 分叉验证会比较完整的经过证明的提交提示，包括空格；有界显示-导入投影不能替代该证据。有关分叉和倒带操作，请参阅 [Control UI](/web/control-ui)。

## <a id="session-store-schema"></a> 会话存储模式

运行时存储将 `SessionEntry` 值保存在每个代理 SQLite 中。 `src/config/sessions.ts` 中的值类型为 `SessionEntry`。关键字段（并非详尽无遗）：

- `sessionId`：用​​于寻址 SQLite 成绩单行的当前成绩单 ID
- `sessionStartedAt`：当前 `sessionId` 的开始时间戳；每日重置的新鲜度判断会使用它。旧版行可能会从 JSONL 会话头中推导它。
- `lastInteractionAt`：最后一次user/channel交互或新提交的可见自动化结果；空闲重置新鲜度使用此功能，因此心跳、cron 唤醒和执行事件不会使会话保持活动状态。没有此字段的旧行将回退到恢复的会话开始时间。
- `updatedAt`：最后存储行突变时间戳，用于 listing/pruning/bookkeeping - 不是 daily/idle 新鲜度权限。
- `archivedAt`：可选的归档时间戳。已归档会话仍会保留在存储中，且其会话记录保持完整，并会从正常的活动列表中排除。
- `pinnedAt`：可选的置顶时间戳。处于活动状态且已置顶的会话会排在未置顶会话之前；归档会话会清除其置顶状态。
- Codex 线程互操作：两个字段都遵循 Codex 线程管理形状 - 线路上的 `archived`/`pinned` 布尔值始终源自时间戳和标记的服务器端，匹配 Codex `threads.archived_at` 语义和驼峰式序列化。 OpenClaw 时间戳是纪元毫秒，而 Codex 使用纪元秒，因此桥在 `codex` 插件边界进行转换。 Codex 线程方法仅涵盖归档 （`thread/archive`/`thread/unarchive`） 并且不包括固定方法，因此固定状态保持在 OpenClaw- 一侧。形状匹配，因此 Codex 引脚方法将允许绑定会话机械地往返引脚状态。
- Codex 监管列表只包含未归档的原生线程。Gateway 本地的 `idle` 或 `notLoaded` 活动未知线程，只有在操作者明确确认没有其他 Codex 进程拥有它之后，才能通过原生 `thread/archive` 归档；插件会先进行一次新的进程本地状态读取，然后该线程才会从目录中消失。该读取无法证明其他 App Server 进程没有在使用该线程。OpenClaw 会拒绝归档活动行和错误行，而在节点桥能够拥有完整的流式线程生命周期之前，成对节点归档不可用。在原生 Codex 客户端中取消归档会使该线程再次具备出现在列表中的资格。
- `snoozedUntil` / `snoozedAt`：可选纪元毫秒唤醒时间和服务器标记的贪睡时间，仅存储在 `session_nodes.entry_json` 中。 `sessions.patch { snoozedUntil }` 接受未来正整数或 `null` 来唤醒会话，需要 `expectedSessionId`。 Snooze 可从 Control UI 的活动侧边栏隐藏符合条件的活动根会话，而无需更改生命周期或工作准入。行公开时间戳；客户端将唤醒时间与其时钟进行比较，没有派生 `snoozed` 布尔值或服务器计时器。过期的字段可以保留，直到稍后的写入将其清除。 User/channel 交互和更新面向用户的活动的已完成运行清除这两个字段；系统事件和保留状态运行保留它们。暂停会保留 pin，而固定或存档会清除暂停。
- `lastReadAt` / `markedUnreadAt`：由 `sessions.patch { unread }` 在服务器端标记的读取状态时间戳 - `unread: false` 记录读取（设置 `lastReadAt`，清除 `markedUnreadAt`）； `unread: true` 记录 `markedUnreadAt` 并将会话标记为未读，直到下一次激活或显式读取。会话行将标记与派生的 `unread` 布尔值一起公开，因此已打开的客户端在仍确认新活动的同时保留手动提醒。支持广告未读确认合约的客户端自动读取补丁包括`expectedMarkedUnreadAt`（`null`表示无标记）；较新的标记使该确认成为成功的无操作，而不是删除较新的意图。裸 `unread: false` 请求保留了遗留的清晰行为，因此跨多个连接的客户端的保护需要每个活动客户端支持该合约。会话从未标记为“读停留”`unread: false`，因此现有安装在升级时不会亮起。
- `lastActivityAt`：最后一次完成的代理运行的时间戳，该运行被计为值得标记未读的活动（用户、通道和 cron 运行）。心跳和内部事件轮次，以及元数据补丁，都不会更新它；`updatedAt` 不是活动信号。
- `sessionFile`：保留传统标记以实现 migration/archive 兼容性；活动运行时使用 SQLite 身份
- `chatType`: `direct | group | room`
- `label`：显式自定义名称；始终优先，包括标签类似于自动设备名称的旧记录。使用 `sessions.patch { label: null }` 清除它会恢复自动命名。
- `autoLabel`：可选的自动设备标签，与自定义名称分开。 Android通过`sessions.patch`写入；允许重复值，`null` 将其清除。它是保存的 `displayName` 下方的显示回退，而不是唯一的会话标签。
- `subject`、`groupChannel`、`space`、`displayName`：group/channel 标签元数据； `displayName` 还存储生成的对话标题。
- 开关：`thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`、`sendPolicy`（按会话覆盖）
- 模型选择：`providerOverride`、`modelOverride`、`authProfileOverride`
- 代币计数器（最佳-effort/provider-dependent）：`inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`
- `compactionCount`：此会话密钥已完成的压缩总数
- `memoryFlushAt` / `memoryFlushCompactionCount`：上一次预压缩记忆刷新时的时间戳和压缩次数

保留现有的仅标签记录：网关不会从其文本推断保存的 `label` 是否是自动的。显式清除或替换它以更改其优先级。不支持 `autoLabel` 的旧网关会拒绝该补丁字段； Android 不会重试设备名称为 `label`，这可能会覆盖自定义名称。 Android 仍然使用其本地已知的设备名称作为其自己会话的仅显示后备，位于服务器提供的名称之下。此回退既不会发送到网关，也不会存储在会话缓存中。

Gateway 是权威来源：它可以在会话运行时重写或重新补全条目。对于旧版文件后端安装，请使用 `openclaw doctor --session-sqlite import --session-sqlite-all-agents` 进行迁移，而不是编辑 `sessions.json` 并期望运行时继续读取该文件。

## <a id="transcript-event-structure"></a> 转录事件结构

转录内容由 OpenClaw 会话访问器管理，并通过基于身份的辅助工具向运行时代码公开。事件流为仅追加：

- 首先：会话标头 - `type: "session"`、`id`、`cwd`、`timestamp`、可选的 `parentSession`。
- 然后：包含 `id` + `parentId` 的条目（树结构）。

值得注意的条目类型：

- `message`：user/assistant/toolResult 消息
- `custom_message`：由扩展注入的消息，_确实_会进入模型上下文（当 `display: true` 时在 TUI 中渲染，当 `display: false` 时完全隐藏）
- `custom`：不会进入模型上下文的扩展状态（用于在重新加载之间持久化扩展状态）
- `compaction`：持久化的压缩摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `reset`：一个新的历史窗口，可以选择保留来自 `firstKeptEntryId` 的消息
- `branch_summary`：在浏览树分支时保存的摘要

历史记录读取器在以后的压缩中保留最新的重置窗口：显式保留的重置消息和重置后的消息仍然可见，但较旧的消息和压缩摘要不会重新出现。模型上下文遵循最新的重置或压缩，因此压缩可以总结当前对话，而无需重新打开其早期历史记录。

仅模型调用者应等待 `SessionManager.openModelContextAsync(target, { admission?, signal? })` 创建独立的非持久视图，而不会阻止持久历史扫描上的网关事件循环。 `openModelContext()` 为同步消费者提供相同的视图。阅读器选择 SQLite 中的有效负载，并在模型窗口外保留轻量级导航，而不会引入历史大小截止。仅存储的本机提示文本和工具结果详细信息不在该视图中；镜像身份、发送者和媒体事实、工具内容以及有效的提供者重播状态仍然可用。原生分叉验证、重放、导出和医生操作继续使用全保真证据读取器。

`SessionManager.readSessionContext(target, read, { admission? })` 允许同步使用者在一个只读快照内处理全保真上下文消息。回调接收 `(messages, header)`：可迭代的惰性消息和未经验证的存储标头。缺少的商店提供一个空的可迭代对象，并且没有标头，而无需创建数据库。可选准入不包括当前准入的用户行和后续事件。回调错误传播，并且当回调返回或抛出时迭代器关闭；它不能保留以供以后读取。这使得重播消费者可以在获取过程中强制执行现有的限制，而不会默默地放弃早期的历史记录。导航仍然随着文字记录缩放，并且单个选定的行被整体解码；这不是固定的进程内存上限。

持久模型上下文读取在工作线程中运行。 Codex 本机重播和固定回合验证将惰性读取及其消费者放在工作线程中。工作线程读取按读取器序列化，并重用空闲工作线程。录取收据在读取快照内进行验证，并在结果被接受之前再次验证；无需许可即可读取，而是检查会话的重写生成和最后一个事件序列。已承认的读取保留其回合边界，因此稍后的单独追加不会使它们无效。无效的读取或取消的信号会拒绝结果。调用者通过上下文获取携带原始取消信号，并在调用挂钩、启动模型运行或应用提案之前检查其所有者是否保持活动状态。隐身会话在网关进程中使用相同的操作，因为它们的 SQLite 数据库保存在内存中。

OpenClaw 故意不“修复”成绩单；网关使用 `SessionManager` 至 read/write。
