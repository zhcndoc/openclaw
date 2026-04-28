---
summary: "用于跨会话状态、回忆、消息传递和子智能体编排的智能体工具"
read_when:
  - 你想了解智能体有哪些会话工具
  - 你想配置跨会话访问或生成子智能体
  - 你想检查状态或控制已生成的子智能体
title: "会话工具"
---

OpenClaw 为智能体提供了跨会话工作、检查状态以及编排子智能体的工具。

## 可用工具

| 工具               | 功能                                                                |
| ------------------ | --------------------------------------------------------------------------- |
| `sessions_list`    | 列出会话，可带可选过滤条件（类型、标签、智能体、最近程度、预览） |
| `sessions_history` | 读取特定会话的转录记录                                   |
| `sessions_send`    | 向另一个会话发送消息，并可选择等待回复                       |
| `sessions_spawn`   | 为后台工作生成一个隔离的子智能体会话                     |
| `sessions_yield`               | 结束当前回合并等待后续子智能体结果               |
| `subagents`        | 列出、引导或终止为此会话生成的子智能体                    |
| `session_status`   | 显示一个类似 `/status` 的卡片，并可选择设置每会话模型覆盖 |

These tools are still subject to the active tool profile and allow/deny
policy. `tools.profile: "coding"` includes the full session orchestration
set, including `sessions_spawn`, `sessions_yield`, and `subagents`.
`tools.profile: "messaging"` includes cross-session messaging tools
(`sessions_list`, `sessions_history`, `sessions_send`, `session_status`) but
does not include sub-agent spawning. To keep a messaging profile and still
allow native delegation, add:

```json5
{
  tools: {
    profile: "messaging",
    alsoAllow: ["sessions_spawn", "sessions_yield", "subagents"],
  },
}
```

Group, provider, sandbox, and per-agent policies can still remove those tools
after the profile stage. Use `/tools` from the affected session to inspect the
effective tool list.

## Listing and reading sessions

`sessions_list` 返回会话及其 key、agentId、kind、channel、model、
token 数量和时间戳。可按 kind（`main`、`group`、`cron`、`hook`、
`node`）、精确 `label`、精确 `agentId`、搜索文本或最近程度
（`activeMinutes`）进行过滤。当你需要类似邮箱的分拣时，它还可以请求一个
按可见性范围限定的派生标题、最后一条消息预览片段，或每行受限的
最近消息。派生标题和预览仅针对调用方在已配置的会话工具
可见性策略下已经能够看到的会话生成，因此无关会话仍然保持隐藏。

`sessions_history` 获取特定会话的对话转录记录。
默认情况下，工具结果被排除——传递 `includeTools: true` 以查看它们。
返回的视图有意受限并经过安全过滤：

- 助手文本在回忆前被标准化：
  - 思考标签被剥离
  - `<relevant-memories>` / `<relevant_memories>` 脚手架块被剥离
  - 纯文本工具调用 XML 负载块（如 `<tool_call>...</tool_call>`、
    `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和
    `<function_calls>...</function_calls>`）被剥离，包括截断
    且从未正常关闭的负载
  - 降级的工具调用/结果脚手架（如 `[Tool Call: ...]`、
    `[Tool Result ...]` 和 `[Historical context ...]`）被剥离
  - 泄露的模型控制令牌（如 `<|assistant|>`、其他 ASCII
    `<|...|>` 令牌和全角 `<｜...｜>` 变体）被剥离
  - 格式错误的 MiniMax 工具调用 XML（如 `<invoke ...>` /
    `</minimax:tool_call>`）被剥离
- 凭据/令牌类文本在返回前被编辑
- 长文本块被截断
- 非常大的历史记录可能会丢弃较旧的行或用
  `[sessions_history omitted: message too large]` 替换过大的行
- 该工具报告摘要标志，如 `truncated`、`droppedMessages`、
  `contentTruncated`、`contentRedacted` 和 `bytes`

这两个工具都接受 **会话 key**（如 `"main"`）或来自先前列表调用的 **会话 ID**。

如果你需要精确的逐字节转录记录，请检查磁盘上的转录文件，而不是将 `sessions_history` 视为原始转储。

## 发送跨会话消息

`sessions_send` 将消息传递给另一个会话并可选等待响应：

- **发后即忘：** 设置 `timeoutSeconds: 0` 以入队并立即返回。
- **等待回复：** 设置超时并内联获取响应。

目标响应后，OpenClaw 可以运行一个 **回复循环**，智能体交替发送消息（最多 5 轮）。目标智能体可以回复 `REPLY_SKIP` 以提前停止。

## 状态和编排助手

`session_status` 是当前会话或另一个可见会话的轻量级 `/status` 等效工具。它会报告使用情况、时间、模型/运行时状态，以及在存在时关联的后台任务上下文。与 `/status` 一样，它可以从最新的转录使用条目中补齐稀疏的 token/cache 计数，并且 `model=default` 会清除每会话覆盖。对调用方当前会话使用 `sessionKey="current"`；`openclaw-tui` 之类的可见客户端标签不是会话 key。

`sessions_yield` 有意结束当前回合，以便下一条消息可以是你等待的后续事件。在生成子智能体后使用它，当你希望完成结果作为下一条消息到达而不是构建轮询循环时。

`subagents` 是已生成的 OpenClaw 子智能体的控制平面助手。它支持：

- `action: "list"` 检查活跃/最近的运行
- `action: "steer"` 向运行中的子项发送后续指导
- `action: "kill"` 停止一个子项或 `all`

## 生成子智能体

`sessions_spawn` 默认会为后台任务创建一个隔离会话。
它始终是非阻塞的——它会立即返回 `runId` 和
`childSessionKey`。

关键选项：

- `runtime: "subagent"` (default) or `"acp"` for external harness agents.
- `model` and `thinking` overrides for the child session.
- `thread: true` to bind the spawn to a chat thread (Discord, Slack, etc.).
- `sandbox: "require"` to enforce sandboxing on the child.
- `context: "fork"` for native sub-agents when the child needs the current
  requester transcript; omit it or use `context: "isolated"` for a clean child.

默认叶子的子智能体不会获得会话工具。当
`maxSpawnDepth >= 2` 时，depth-1 编排器子智能体还会接收
`sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们可以管理自己的子项。叶子运行仍然不会获得递归
编排工具。

完成后，宣布步骤将结果发布到请求者的频道。完成交付在可用时保留绑定的线程/主题路由，如果完成来源仅识别一个频道，OpenClaw 仍然可以重用请求者会话的存储路由（`lastChannel` / `lastTo`）进行直接交付。

有关 ACP 特定行为，请参阅 [ACP 智能体](/tools/acp-agents)。

## 可见性

会话工具的作用域限制了智能体可以看到的内容：

| 级别   | 范围                                    |
| ------- | ---------------------------------------- |
| `self`  | 仅当前会话                               |
| `tree`  | 当前会话 + 派生的子智能体                |
| `agent` | 此智能体的所有会话                       |
| `all`   | 所有会话（如果配置了跨智能体）           |

默认为 `tree`。沙箱会话无论配置如何都被限制为 `tree`。

## 进一步阅读

- [Session Management](/concepts/session) -- 路由、生命周期、维护
- [ACP Agents](/tools/acp-agents) -- 外部宿主生成
- [Multi-agent](/concepts/multi-agent) -- 多智能体架构
- [Gateway Configuration](/gateway/configuration) -- 会话工具配置选项

## 相关

- [Session management](/concepts/session)
- [Session pruning](/concepts/session-pruning)
