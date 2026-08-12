---
summary: "用于跨会话状态、回忆、消息传递和子代理编排的代理工具"
read_when:
  - 你想了解代理拥有哪些会话工具
  - 你想配置跨会话访问或子代理生成
  - 你想检查已生成子代理的状态
title: "会话工具"
---

OpenClaw 提供代理工具，用于跨会话工作、检查状态并编排子代理。

## 可用工具

| 工具                 | 作用                                                                |
| -------------------- | --------------------------------------------------------------------------- |
| `sessions`           | 修补、重置或删除可见会话，并管理会话组          |
| `sessions_list`      | 列出会话，可选筛选条件包括（kind、label、agent、archive、preview）      |
| `sessions_search`      | 搜索可见会话转录并返回匹配的摘录             |
| `sessions_history`   | 读取特定会话的转录内容                                   |
| `sessions_send`      | 在同一个 Gateway 上运行另一个会话，并可选择等待结果                 |
| `conversations_list` | 列出稳定的外部会话地址                                 |
| `conversations_send` | 向一个精确的外部会话发送内容，不会运行本地会话     |
| `conversations_turn` | 向一个精确的外部会话发送内容，并等待其关联回复   |
| `sessions_spawn`     | 为后台工作创建一个隔离的子代理会话                     |
| `sessions_yield`     | 结束当前轮次并等待后续子代理结果               |
| `subagents`          | 列出或取消此会话树中的后台工作          |
| `session_status`     | 显示一个类似 `/status` 的卡片，并可选择为每个会话设置模型覆盖     |

这些工具仍受活动工具配置文件和允许／拒绝策略的约束，并允许使用会话编排工具集。`tools.profile: "coding"` 包括完整的会话编排工具集。`tools.profile: "messaging"` 包括会话自助服务、发现、召回、跨会话消息传递、外部会话工具，以及完整的生成生命周期（`sessions_spawn`、`sessions_yield` 和 `subagents`）。仅限 UI 的任务建议工具 `suggest_task` 和 `dismiss_task` 仍属于 coding 配置文件工具。

组、提供方、沙箱以及每个代理的策略在配置文件阶段之后仍可能移除这些工具。请在受影响的会话中使用 `/tools` 来检查实际生效的工具列表。

## 列出和读取会话

`sessions_list` 返回聚焦的发现行：会话键、代理、类型、通道、标签/标题/预览字段、父子关系、最后更新时间、归档/置顶状态、状态版本、模型、上下文/总 token 数、运行状态，以及上一次运行是否中止。可通过 `kinds`（数组；可接受值：`main`、`group`、`cron`、`hook`、`node`、`other`）、精确 `label`、精确 `agentId`、`search` 文本，或按最近活跃时间（`activeMinutes`）进行过滤。默认返回活跃会话；如需查看已归档会话，请传入 `archived: true`。当你需要类似邮箱式的初筛时，可设置 `includeDerivedTitles`、`includeLastMessage` 或 `messageLimit`（上限为 20）：分别用于显示受可见性范围限制的派生标题、最后一条消息的预览片段，或每行受限数量的最近消息。传递路径、内部会话 ID、每次运行的耗时/设置、成本估算和转录路径均有意省略；这些仅针对所有者的细节请使用 `session_status`、会话工具和 `sessions_history`。派生标题和预览仅会为调用者在当前配置的会话工具可见性策略下已经能够看到的会话生成，因此无关会话仍会保持隐藏。当可见性受限时，`sessions_list` 会返回可选的 `visibility` 元数据，显示实际生效的模式以及结果可能受作用域限制的警告。

`sessions_history` 获取特定会话的对话记录。默认情况下会排除工具结果；传入 `includeTools: true` 可查看它们。使用 `limit` 获取最新的受限尾部内容。需要分页元数据时传入 `offset: 0`，然后使用返回的 `nextOffset` 值，沿着更早的 OpenClaw 转录窗口向后翻页，而无需读取原始转录文件。显式 offset 分页不会合并外部 CLI 回退导入；当你需要那种合并后的显示历史时，请使用默认的最新尾部视图（不传 `offset`）。

返回的视图是刻意受限并经过安全过滤的：

- 在回忆前会规范化 assistant 文本：
  - 会移除 thinking 标签
  - 会移除 `<relevant-memories>` / `<relevant_memories>` 的脚手架块
  - 会移除纯文本工具调用 XML 负载块，例如 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和 `<function_calls>...</function_calls>`，包括那些未能完整闭合的截断负载
  - 会移除降级后的工具调用/结果脚手架，例如 `[Tool Call: ...]`、`[Tool Result ...]` 和 `[Historical context ...]`
  - 会移除泄漏的模型控制 token，例如 `<|assistant|>`、其他 ASCII `<|...|>` token，以及全角 `<｜...｜>` 变体
  - 会移除格式错误的 MiniMax 工具调用 XML，例如 `<invoke ...>` / `</minimax:tool_call>`
- 在返回前会对凭据/token 类文本进行脱敏
- 长文本块会被截断
- 超大历史可能会丢弃较早的行，或将过大的行替换为 `[sessions_history omitted: message too large]`
- 工具会报告诸如 `truncated`、`droppedMessages`、`contentTruncated`、`contentRedacted`、`bytes` 以及分页元数据等摘要标志

使用返回的**会话键**（例如 `"main"`）与 `sessions_history`、`sessions_send` 和 `session_status` 配合使用。这些目标工具也可以解析已知的会话 ID，但 `sessions_list` 不会暴露内部 ID。

如果你需要精确的原始转录，请检查作用域限定的 SQLite 转录行，而不是将 `sessions_history` 视为未过滤的转储。

使用 [`sessions_search`](/concepts/session-search) 可在可见的用户和助手转录文本中进行精确的全文检索。其结果包含用于后续 `sessions_history` 调用的 `sessionKey`；可见性过滤、片段脱敏和输出边界与历史边界一致。

## 管理会话设置和分组

受所有者限制的 `sessions` 工具提供了有限的自助操作范围：

- `action: "patch"` 默认更改当前会话，或更改通过 `sessionKey` 选择的其他可见会话。它可以设置标签、固定／归档状态、模型和思考级别。
- `action: "reset"` 重置通过 `sessionKey` 选择的其他可见会话。
- `action: "delete"` 首先归档，然后删除通过 `sessionKey` 选择的其他可见会话的完全相同版本。默认情况下，其会话记录会作为已删除的归档保留；传入 `deleteTranscript: false` 可保持会话记录状态不变。重置或删除当前运行该工具的会话会被拒绝。
- `group_list`、`group_set`、`group_rename` 和 `group_delete` 管理全局有序会话组目录。`group_set` 会替换有序名称列表，而不是修改其中一项。

使用带有 `visible: true` 的 `sessions_spawn` 来创建一个持久化的仪表盘会话。这样会让会话创建保持在受控的 spawn 路径上，并强制执行父级的工具策略、沙箱、并发限制以及运行超时。

由代理选择的模型补丁在该选择成功完成一次运行之前都是可回滚的。如果所选模型由于认证、计费或模型不存在而明确不可用，OpenClaw 会恢复到先前的模型并写入一条可见的系统提示。瞬时的速率限制、过载、超时、网络和服务器故障不会撤销该选择。

## 会话与对话

**会话**（session）是本地模型上下文。**对话**（conversation）是一个精确的外部地址，例如某个对等方、频道或线程。这两者是关联的，但不能互换：直接消息可以共享一个 `main` 会话，同时保留各自独立的对话地址。

`conversations_list` 会为活动代理返回不透明的 `conversationRef` 值。对于显式的 `channel`，Gateway 还会从该频道的本地目录刷新地址，例如已批准的 Reef 对等方；可使用 `query` 在当前结果页之外查找特定对等方。发现过程会对地址进行编目，但不会创建模型上下文会话；只有在需要投递或接收入站上下文时，才会创建底层会话。对话发现和投递仅限所有者使用，因为它们使用的是 Gateway 的频道凭据。使用 `conversations_send` 进行一次性投递。使用 `conversations_turn` 当远端回复属于当前模型轮次时：Gateway 会预留一个传输消息 ID，在传输 I/O 之前持久化投递操作和队列意图，并将关联的回复从工具中返回，而不是启动第二个本地代理轮次。投递操作存在于模型转录之外；捕获到的回复仅作为侧边工件保留，而工具结果才拥有模型上下文。如果 Gateway 在排队后重启，投递可以恢复，但后续回复将遵循普通的入站分发，因为进程本地的等待器已经消失。未请求的入站消息始终会继续通过正常的频道分发路径处理。

当你已经拥有显式的原始频道目标，或需要执行特定于频道的操作时，请使用共享的 `message` 工具。对话引用的作用域限定于活动代理，应通过 `conversations_list` 获取，而不要从会话键构造。

在 Code Mode 中，对话工具会复用其完全一致的 Gateway 输出契约。单个 `exec` 单元可以列出地址、选择返回的 `conversationRef`，并调用 `conversations_send` 或 `conversations_turn`；正常的工具策略和审批仍然适用于这些嵌套调用。

## 跨会话消息发送

`sessions_send` 会在同一个 Gateway 上运行另一个会话，并可选择等待响应。它的 `sessionKey`、`label` 或 `agentId` 选择的是本地模型上下文，而不是外部目标。生成的回复仍然可以通过已建立的请求者或目标传递上下文进行通知；该既有行为保持不变。若要进行精确的外部传递，请使用会话工具，或使用带有明确频道和目标的 `message`。

- **即发即弃：** 将 `timeoutSeconds: 0` 以入队并立即返回。
- **等待回复：** 设置超时时间并内联获取响应。

线程作用域的聊天会话，例如以 `:thread:<id>` 结尾的键，不是有效的 `sessions_send` 目标。请使用父频道会话键进行智能体间协调，这样工具路由消息就不会出现在活动的人类可见线程中。

消息和 A2A 后续回复会在接收方提示词中标记为跨会话数据（`[Inter-session message ... isUser=false]`），并体现在转录来源中。接收方智能体应将其视为工具路由数据，而不是直接由最终用户编写的指令。

在目标响应之后，OpenClaw 可以运行一个 **reply-back loop**，让智能体交替发送消息，直到达到内置上限。目标智能体可以回复 `REPLY_SKIP` 以提前停止。

传递 `watch: true` 以同时将发送方注册为目标的状态变更观察者：当其他参与者之后向目标发送直接人类消息或更改其目标时，发送方会收到一条系统通知，指向 `session_status` 的 `changesSince`。注册会在成功分发后进行，目标是实际接收到消息的会话，并从其当前状态版本开始，因此只有后续更改才会产生通知。结果会在注册成功时报告 `watched: true`。另请参阅[会话状态感知](/concepts/session-state)。

## 状态与编排助手

`session_status` 是当前或另一个可见会话的轻量级 `/status` 等价工具。它会报告用量、时间、模型/运行时状态，以及在存在时关联的后台任务上下文。与 `/status` 一样，它可以根据最新的转录用量条目回填稀疏的 token/cache 计数器，并且 `model=default` 会清除每个会话的覆盖设置。对调用方的当前会话使用 `sessionKey="current"`；像 `openclaw-tui` 这样的可见客户端标签不是 session key。

当路由元数据可用时，`session_status` 还会包含一个可见的 `Route context` JSON 块以及匹配的结构化 `details` 字段。这些字段用于区分会话 key 与当前正在处理实时运行的路由：

- `origin` 是会话创建的位置，或者在旧状态缺少已存储的 origin 元数据时，由可交付会话 key 前缀推断出的提供方。
- `active` 是当前实时运行的路由。它只会针对当前正在处理的实时或当前会话报告。
- `deliveryContext` 是存储在会话上的持久化交付路由，OpenClaw 即使在活动界面不同的情况下，也可以在后续交付中复用它。

## 会话状态变更

OpenClaw 会保留一份持久的信号日志，记录重要的会话状态变更（发给受监视会话的直接人工消息、子运行结果、目标变更、压缩）。`sessions_list` 行和 `session_status` 会公开该会话的 `stateVersion`，并且 `session_status` 接受 `changesSince: <version>`，以返回该版本之后的类型化事件；当请求的版本早于保留历史时，会精确通过 `historyGap` 发出信号。监视者——由父级自动生成，或通过 `sessions_send watch: true` 显式设置——在其他参与者更改受监视会话时，会收到一条合并后的过期状态通知。

状态变更事件会省略重复的会话/代理 ID，并且只暴露对模型有用的负载字段（`outcome`、`channel` 或 `turns`）。事件摘要以及执行者/运行标识符仍然可用于对账。

完整模型请参见 [会话状态感知](/concepts/session-state)：事件类型、监视者注册、反垃圾通知协议、对账流程以及当前限制。

`sessions_yield` 会有意结束当前回合，以便下一条消息可以成为你正在等待的后续事件。当你在生成子代理后，希望完成结果作为下一条消息到达，而不是构建轮询循环时，请使用它。

`subagents` 是围绕原生子代理运行和共享后台任务账本的会话树视图。`action: "list"` 会报告活动/最近的子代理，以及作用域内的 ACP、CLI/媒体和 cron 任务。`action: "cancel"` 接受返回的 `taskId`，并且只能停止调用者受控会话树内的工作；叶子子代理不能取消其他会话的任务。

## 生成子代理

`sessions_spawn` 默认会为后台任务创建一个隔离的会话。它始终是非阻塞的；它会立即返回 `runId` 和 `childSessionKey`。原生子代理运行会在子会话中首个可见的 `[Subagent Task]` 消息里接收委派的任务，而系统提示词只携带子代理运行时规则和路由上下文。

关键选项：

- `runtime: "subagent"` (默认) 或 `"acp"` 用于外部宿主代理。
- `model` 和 `thinking` 可覆盖子会话配置。
- `runTimeoutSeconds` 用于覆盖已配置的子运行超时时间；`0` 表示禁用。
- `thread: true` 用于将 spawn 绑定到聊天线程（Discord、Slack 等）。
- `sandbox: "require"` 用于强制对子代理进行沙箱化。
- `context: "fork"` 用于原生子代理，当子代理需要当前请求者的转录内容时使用；若不需要则省略，或使用 `context: "isolated"` 以获得一个干净的子会话。`context: "fork"` 仅在 `runtime: "subagent"` 时有效。绑定线程的原生子代理默认使用 `context: "fork"`，除非 `threadBindings.defaultSpawnContext` 另有说明。
- `visible: true` 用于创建一个持久的仪表板会话，而不是隐藏的子代理会话。可见 spawn 支持显式模型、工作目录、同代理转录分叉，以及可选的 [managed worktree](/concepts/managed-worktrees)；关于确切的兼容性限制，请参见 [Sub-agents](/tools/subagents#tool-parameters)。

默认的叶子子代理不会获得会话工具。当 `maxSpawnDepth >= 2` 时，深度为 1 的编排子代理还会额外获得 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们管理自己的子代理。叶子运行仍然不会获得递归编排工具。

完成后，会有一个 announce 步骤将结果发布到请求者的频道。完成投递会在可用时保留绑定的线程/主题路由；如果完成来源只标识了一个频道，OpenClaw 仍然可以复用请求者会话中存储的路由（`lastChannel` / `lastTo`）进行直接投递。

关于 ACP 的特定行为，请参见 [ACP Agents](/tools/acp-agents)。

## 可见性

会话工具的作用范围限制了代理可以看到的内容：

| Level   | Scope                                                      |
| ------- | ---------------------------------------------------------- |
| `self`  | 仅当前会话                                   |
| `tree`  | 当前 + 派生会话；读取包括被监视的同代理组 |
| `agent` | 该代理的所有会话                                |
| `all`   | 所有会话（如已配置，则跨代理）                   |

默认值为 `tree`。沙箱会话无论配置如何都会被限制为 `tree`。
在默认的 `session.dmScope: "main"` 下，组活动会使被监视的
同代理组会话可从主会话中读取，而主会话
的系统提示会列出这些被监视的会话，以便代理知道它可以
读取它们。

## 延伸阅读

- [会话管理](/concepts/session)：路由、生命周期、维护
- [子代理](/tools/subagents)：子会话生命周期与交付
- [ACP 代理](/tools/acp-agents)：外部控制程序启动
- [多代理](/concepts/multi-agent)：多代理架构
- [网关配置](/gateway/configuration)：会话工具配置选项。

## 相关内容

- [会话管理](/concepts/session)
- [会话修剪](/concepts/session-pruning)
