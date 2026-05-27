---
summary: "用于跨会话状态、回忆、消息传递和子代理编排的代理工具"
read_when:
  - 你想了解代理拥有哪些会话工具
  - 你想配置跨会话访问或子代理生成
  - 你想检查已生成子代理的状态
title: "会话工具"
---

OpenClaw 为代理提供了跨会话工作、检查状态以及编排子代理的工具。

## 可用工具

| Tool               | 功能说明                                                                  |
| ------------------ | ------------------------------------------------------------------------- |
| `sessions_list`    | 列出会话，可带可选过滤条件（kind、label、agent、最近活跃度、预览）        |
| `sessions_history` | 读取特定会话的转录记录                                                     |
| `sessions_send`    | 向另一个会话发送消息，并可选择等待响应                                       |
| `sessions_spawn`   | 为后台工作生成一个隔离的子代理会话                                           |
| `sessions_yield`   | 结束当前轮次并等待后续子代理结果                                             |
| `subagents`        | 列出该会话中已生成的子代理状态                                               |
| `session_status`   | 显示一个 `/status` 风格的信息卡，并可选设置每会话模型覆盖值                 |

这些工具仍然受当前生效的工具配置文件以及允许/拒绝策略约束。`tools.profile: "coding"` 包含完整的会话编排工具集，包括 `sessions_spawn`、`sessions_yield` 和 `subagents`。`tools.profile: "messaging"` 包含跨会话消息工具（`sessions_list`、`sessions_history`、`sessions_send`、`session_status`），但不包含子代理生成。若要保留 messaging 配置文件，同时仍允许原生委派，请添加：

```json5
{
  tools: {
    profile: "messaging",
    alsoAllow: ["sessions_spawn", "sessions_yield", "subagents"],
  },
}
```

组、提供方、沙箱以及按代理设置的策略在配置文件阶段之后仍可能移除这些工具。使用受影响会话中的 `/tools` 来查看实际生效的工具列表。

## 列出和读取会话

`sessions_list` 返回会话及其 key、agentId、kind、channel、model、
token 计数和时间戳。可按 kind（`main`、`group`、`cron`、`hook`、
`node`）、精确 `label`、精确 `agentId`、搜索文本或最近活跃度
（`activeMinutes`）进行过滤。当你需要类似邮箱的分流时，它还可以请求
基于可见性作用域的派生标题、上一条消息预览片段，或每行有界的最近
消息。派生标题和预览仅针对调用方在已配置的会话工具可见性策略下本就可以看到的会话生成，因此无关会话会保持隐藏。当可见性受限时，`sessions_list`
会返回可选的 `visibility` 元数据，显示有效模式以及结果可能受作用域限制的警告。

`sessions_history` 用于获取特定会话的对话记录。默认情况下会排除工具结果——传入 `includeTools: true` 以查看它们。返回视图经过有意的边界限制和安全过滤：

- assistant 文本在回忆前会被规范化：
  - thinking 标签会被剥离
  - `<relevant-memories>` / `<relevant_memories>` 脚手架块会被剥离
  - 纯文本工具调用 XML 负载块（如 `<tool_call>...</tool_call>`、
    `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和
    `<function_calls>...</function_calls>`）会被剥离，包括从未完整闭合的截断负载
  - 降级的工具调用/结果脚手架（如 `[Tool Call: ...]`、
    `[Tool Result ...]` 和 `[Historical context ...]`）会被剥离
  - 泄露的模型控制 token（如 `<|assistant|>`、其他 ASCII
    `<|...|>` token，以及全角 `<｜...｜>` 变体）会被剥离
  - 形态异常的 MiniMax 工具调用 XML（如 `<invoke ...>` /
    `</minimax:tool_call>`）会被剥离
- 类似凭据/token 的文本在返回前会被脱敏
- 较长的文本块会被截断
- 非常大的历史记录可能会丢弃较早的行，或将过大的行替换为
  `[sessions_history omitted: message too large]`
- 该工具会报告 `truncated`、`droppedMessages`、
  `contentTruncated`、`contentRedacted` 和 `bytes` 等汇总标志

这两个工具都接受一个**会话 key**（例如 `"main"`）或来自先前 list 调用的**会话 ID**。

如果你需要逐字节完全一致的转录，请检查磁盘上的 transcript 文件，而不要把 `sessions_history` 当作原始转储。

## 跨会话发送消息

`sessions_send` 会向另一个会话传递消息，并可选择等待响应：

- **即发即弃：** 设置 `timeoutSeconds: 0`，即可入队并立即返回。
- **等待回复：** 设置超时时间并内联获取响应。

按线程作用域的聊天会话，例如以 `:thread:<id>` 结尾的 Slack 或 Discord key，不是有效的 `sessions_send` 目标。请使用父频道会话 key 进行代理间协调，这样通过工具路由的消息就不会出现在正在进行的人类可见线程中。

消息和 A2A 后续回复会在接收提示词中（`[Inter-session message ... isUser=false]`）以及转录出处中标记为跨会话数据。接收代理应将它们视为通过工具路由的数据，而不是直接由终端用户撰写的指令。

目标响应后，OpenClaw 可以运行一个**回复回环**，其中代理交替发送消息（最多 `session.agentToAgent.maxPingPongTurns` 轮，范围为 0-20，默认 5）。目标代理可以回复 `REPLY_SKIP` 以提前停止。

## 状态和编排辅助工具

`session_status` 是当前会话或其他可见会话的轻量级 `/status` 等价工具。它会报告用量、时间、模型/运行时状态，以及在存在时关联的后台任务上下文。与 `/status` 一样，它可以从最新的转录用量条目中回填稀疏的 token/cache 计数，而 `model=default` 会清除按会话生效的覆盖值。对调用方当前会话使用 `sessionKey="current"`；诸如 `openclaw-tui` 之类的可见客户端标签并不是会话 key。

`sessions_yield` 会有意结束当前轮次，以便下一条消息可以成为你正在等待的后续事件。在生成子代理后使用它，当你希望完成结果作为下一条消息到达，而不是建立轮询循环时尤其适合。

`subagents` 是已生成 OpenClaw 子代理的可见性辅助工具。它支持 `action: "list"` 来检查活动/最近运行。

## 生成子代理

`sessions_spawn` 默认会为后台任务创建一个隔离会话。
它始终是非阻塞的——它会立即返回 `runId` 和
`childSessionKey`。原生子代理运行会在子会话的首个可见 `[Subagent Task]` 消息中接收委派任务，而系统提示词只携带子代理运行时规则和路由上下文。

关键选项：

- `runtime: "subagent"` (默认) 或 `"acp"` 用于外部宿主代理。
- `model` 和 `thinking` 可覆盖子会话设置。
- `thread: true` 用于将生成操作绑定到聊天线程（Discord、Slack 等）。
- `sandbox: "require"` 用于对子代理强制启用沙箱。
- `context: "fork"` 用于本地子代理，当子代理需要当前请求者转录时使用；如需一个干净的子代理，可省略或使用 `context: "isolated"`。
  绑定线程的本地子代理默认使用 `context: "fork"`，除非
  `threadBindings.defaultSpawnContext` 另有说明。

默认的叶子子代理不会获得会话工具。当 `maxSpawnDepth >= 2` 时，深度为 1 的编排子代理还会额外获得 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们管理自己的子任务。叶子运行仍然不会获得递归编排工具。

完成后，会有一个 announce 步骤将结果发布到请求者的频道。完成结果投递会在可用时保留绑定的线程/主题路由；如果完成来源只标识了一个频道，OpenClaw 仍可以重用请求者会话中存储的路由（`lastChannel` / `lastTo`）进行直接投递。

关于 ACP 的特定行为，请参见 [ACP Agents](/tools/acp-agents)。

## 可见性

会话工具的作用域会限制代理可见内容：

| 级别   | 范围                                     |
| ------ | ---------------------------------------- |
| `self`  | 仅当前会话                               |
| `tree`  | 当前会话 + 已生成的子代理                |
| `agent` | 该代理的所有会话                         |
| `all`   | 所有会话（若已配置，则跨代理）           |

默认值为 `tree`。无论配置如何，沙箱会话都被限制为 `tree`。

## 延伸阅读

- [Session Management](/concepts/session) -- 路由、生命周期、维护
- [ACP Agents](/tools/acp-agents) -- 外部宿主生成
- [Multi-agent](/concepts/multi-agent) -- 多代理架构
- [Gateway Configuration](/gateway/configuration) -- 会话工具配置选项

## 相关内容

- [Session management](/concepts/session)
- [Session pruning](/concepts/session-pruning)
