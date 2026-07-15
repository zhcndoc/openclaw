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

| 工具               | 作用                                                                |
| ------------------ | --------------------------------------------------------------------------- |
| `sessions_list`    | 列出会话，可按条件筛选（kind、label、agent、archive、preview）  |
| `sessions_history` | 读取特定会话的对话记录                                   |
| `sessions_send`    | 向另一个会话发送消息，并可选择等待回复                       |
| `sessions_spawn`   | 为后台工作创建一个隔离的子代理会话                     |
| `sessions_yield`   | 结束当前轮次并等待后续子代理结果               |
| `subagents`        | 列出此会话中已创建的子代理状态                              |
| `session_status`   | 显示一个 `/status` 风格的卡片，并可选设置每个会话的模型覆盖                               |

这些工具仍然受当前工具配置文件和允许/禁止策略的约束。`tools.profile: "coding"` 包含完整的会话编排工具集，包括 `sessions_spawn`、`sessions_yield` 和 `subagents`。`tools.profile: "messaging"` 包含跨会话消息工具（`sessions_list`、`sessions_history`、`sessions_send`、`session_status`），但不包含子代理创建。若要保持 messaging 配置文件，同时仍允许原生委派，请添加：

```json5
{
  tools: {
    profile: "messaging",
    alsoAllow: ["sessions_spawn", "sessions_yield", "subagents"],
  },
}
```

组、提供方、沙箱以及每个代理的策略在配置文件阶段之后仍可能移除这些工具。请在受影响的会话中使用 `/tools` 来检查实际生效的工具列表。

## 列出和读取会话

`sessions_list` 返回会话及其 key、agentId、kind、channel、model、token 计数和时间戳。可按 `kinds` 过滤（数组；可接受值：`main`、`group`、`cron`、`hook`、`node`、`other`）、精确 `label`、精确 `agentId`、`search` 文本或新近程度（`activeMinutes`）筛选。默认返回活跃会话；传入 `archived: true` 可改为查看已归档会话。每一行都包含 `pinned` 和 `archived` 状态。需要类似邮箱分拣的视图时，可设置 `includeDerivedTitles`、`includeLastMessage` 或 `messageLimit`（上限为 20）：这样可分别获得基于可见性作用域的派生标题、最后一条消息预览片段，或每行受限数量的最近消息。派生标题和预览仅对调用方在已配置的会话工具可见性策略下已经可以看到的会话生成，因此无关会话仍会保持隐藏。当可见性受限时，`sessions_list` 会返回可选的 `visibility` 元数据，显示实际模式以及结果可能受范围限制的警告。

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

这两个工具都接受来自上一次列表调用的 **session key**（例如 `"main"`）或 **session ID**。

如果你需要精确的原始转录，请检查作用域限定的 SQLite 转录行，而不是将 `sessions_history` 视为未过滤的转储。

## 跨会话发送消息

`sessions_send` 将一条消息发送到另一个会话，并可选择等待响应：

- **即发即弃：** 将 `timeoutSeconds: 0` 以入队并立即返回。
- **等待回复：** 设置超时时间并内联获取响应。

线程作用域的聊天会话，例如以 `:thread:<id>` 结尾的键，不是有效的 `sessions_send` 目标。请使用父频道会话键进行智能体间协调，这样工具路由消息就不会出现在活动的人类可见线程中。

消息和 A2A 后续回复会在接收方提示词中标记为跨会话数据（`[Inter-session message ... isUser=false]`），并体现在转录来源中。接收方智能体应将其视为工具路由数据，而不是直接由最终用户编写的指令。

在目标方响应后，OpenClaw 可以运行一个 **回复回环**，在此过程中智能体交替发送消息（最多 `session.agentToAgent.maxPingPongTurns` 次，范围 0-20，默认 5）。目标智能体可以回复 `REPLY_SKIP` 以提前停止。

传递 `watch: true` 以同时将发送方注册为目标的状态变更观察者：当其他参与者之后向目标发送直接人类消息或更改其目标时，发送方会收到一条系统通知，指向 `session_status` 的 `changesSince`。注册会在成功分发后进行，目标是实际接收到消息的会话，并从其当前状态版本开始，因此只有后续更改才会产生通知。结果会在注册成功时报告 `watched: true`。另请参阅[会话状态感知](/concepts/session-state)。

## 状态与编排助手

`session_status` 是当前或另一个可见会话的轻量级 `/status` 等价工具。它会报告用量、时间、模型/运行时状态，以及在存在时关联的后台任务上下文。与 `/status` 一样，它可以根据最新的转录用量条目回填稀疏的 token/cache 计数器，并且 `model=default` 会清除每个会话的覆盖设置。对调用方的当前会话使用 `sessionKey="current"`；像 `openclaw-tui` 这样的可见客户端标签不是 session key。

当路由元数据可用时，`session_status` 还会包含一个可见的 `Route context` JSON 块以及匹配的结构化 `details` 字段。这些字段用于区分会话 key 与当前正在处理实时运行的路由：

- `origin` 是会话创建的位置，或者在旧状态缺少已存储的 origin 元数据时，由可交付会话 key 前缀推断出的提供方。
- `active` 是当前实时运行的路由。它只会针对当前正在处理的实时或当前会话报告。
- `deliveryContext` 是存储在会话上的持久化交付路由，OpenClaw 即使在活动界面不同的情况下，也可以在后续交付中复用它。

## 会话状态变更

OpenClaw 会保留一份持久的信号日志，记录重要的会话状态变更（发给受监视会话的直接人工消息、子运行结果、目标变更、压缩）。`sessions_list` 行和 `session_status` 会公开该会话的 `stateVersion`，并且 `session_status` 接受 `changesSince: <version>`，以返回该版本之后的类型化事件；当请求的版本早于保留历史时，会精确通过 `historyGap` 发出信号。监视者——由父级自动生成，或通过 `sessions_send watch: true` 显式设置——在其他参与者更改受监视会话时，会收到一条合并后的过期状态通知。

有关完整模型，请参见 [会话状态感知](/concepts/session-state)：事件种类、监视者注册、反垃圾通知协议、协调流程以及当前限制。

`sessions_yield` 会有意结束当前回合，以便下一条消息可以成为你正在等待的后续事件。当你在生成子代理后，希望完成结果作为下一条消息到达，而不是构建轮询循环时，请使用它。

`subagents` 是用于查看已启动的 OpenClaw 子代理的可见性辅助工具。它支持 `action: "list"` 来检查活动/最近运行。

## 生成子代理

`sessions_spawn` 默认会为后台任务创建一个隔离的会话。它始终是非阻塞的；它会立即返回 `runId` 和 `childSessionKey`。原生子代理运行会在子会话中首个可见的 `[Subagent Task]` 消息里接收委派的任务，而系统提示词只携带子代理运行时规则和路由上下文。

关键选项：

- `runtime: "subagent"`（默认）或用于外部执行器代理的 `"acp"`。
- `model` 和 `thinking` 覆盖子会话的设置。
- `thread: true` 将 spawn 绑定到聊天线程（Discord、Slack 等）。
- `sandbox: "require"` 强制对子进程启用沙箱。
- `context: "fork"` 用于原生子代理，当子进程需要当前请求者的对话记录时；若要创建干净的子进程，可省略它或使用 `context: "isolated"`。`context: "fork"` 仅在 `runtime: "subagent"` 时有效。绑定线程的原生子代理默认使用 `context: "fork"`，除非 `threadBindings.defaultSpawnContext` 指定了其他值。

默认的叶子子代理不会获得会话工具。当 `maxSpawnDepth >= 2` 时，深度为 1 的编排子代理还会额外获得 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们管理自己的子代理。叶子运行仍然不会获得递归编排工具。

完成后，会有一个 announce 步骤将结果发布到请求者的频道。完成投递会在可用时保留绑定的线程/主题路由；如果完成来源只标识了一个频道，OpenClaw 仍然可以复用请求者会话中存储的路由（`lastChannel` / `lastTo`）进行直接投递。

关于 ACP 的特定行为，请参见 [ACP Agents](/tools/acp-agents)。

## 可见性

会话工具的作用范围限制了代理可以看到的内容：

| 级别   | 范围                                   |
| ------ | ---------------------------------------- |
| `self`  | 仅当前会话                    |
| `tree`  | 当前会话 + 生成的子代理               |
| `agent` | 该代理的所有会话               |
| `all`   | 所有会话（如果已配置，则跨代理） |

默认值为 `tree`。无论配置如何，沙盒会话都会被限制为 `tree`。

## 延伸阅读

- [会话管理](/concepts/session): 路由、生命周期、维护
- [子代理](/tools/subagents): 子会话生命周期与交付
- [ACP 代理](/tools/acp-agents): 外部控制程序启动
- [多代理](/concepts/multi-agent): 多代理架构
- [网关配置](/gateway/configuration): 会话工具配置选项

## 相关内容

- [会话管理](/concepts/session)
- [会话修剪](/concepts/session-pruning)
