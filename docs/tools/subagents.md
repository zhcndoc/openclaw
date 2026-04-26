---
summary: "子代理：生成独立的代理运行，并将结果通报回请求的聊天会话"
read_when:
  - 当你需要通过代理进行后台/并行工作时
  - 当你正在更改 sessions_spawn 或子代理工具策略时
  - 当你正在实现或排查线程绑定的子代理会话时
title: "子代理"
---

子代理是从现有代理运行中派生出的后台代理运行。它们在各自独立的会话中运行（`agent:<agentId>:subagent:<uuid>`），完成后会将结果**通报**回请求者聊天频道。每个子代理运行都会作为一个[后台任务](/automation/tasks)进行跟踪。

## 斜杠命令

使用 `/subagents` 查看或控制**当前会话**的子代理运行：

- `/subagents list`
- `/subagents kill <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`
- `/subagents steer <id|#> <message>`
- `/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]`

线程绑定控制：

这些命令仅在支持持久线程绑定的频道中有效。详见下文**支持线程的频道**。

- `/focus <subagent-label|session-key|session-id|session-label>`
- `/unfocus`
- `/agents`
- `/session idle <duration|off>`
- `/session max-age <duration|off>`

`/subagents info` 显示运行元数据（状态、时间戳、会话 ID、转录路径、清理）。
使用 `sessions_history` 获取有边界、经过安全过滤的回忆视图；当你需要原始完整转录时，请检查磁盘上的转录路径。

### 启动行为

`/subagents spawn` 会以用户命令启动后台子代理（不是内部转发），运行结束后会向请求的聊天频道发送最终完成更新。

- 启动命令是非阻塞的；它会立即返回一个运行 ID。
- 完成后，子代理会向请求者聊天频道发送一条摘要/结果消息。
- 完成是推送式的。启动后，不要为了等待它结束而循环轮询 `/subagents list`、`sessions_list` 或 `sessions_history`；仅在需要调试或干预时按需检查状态。
- 完成时，OpenClaw 会在通报清理流程继续之前，尽力关闭该子代理会话打开的已跟踪浏览器标签页/进程。
- 对于手动启动，投递具有弹性：
  - OpenClaw 首先尝试使用稳定的幂等键直接投递到 `agent`。
  - 如果直接投递失败，则回退到队列路由。
  - 如果队列路由仍不可用，则在最终放弃前以短指数退避重试通报。
- 完成投递会保留解析后的请求者路由：
  - 线程绑定或会话绑定的完成路由优先
  - 如果完成源只提供了频道，OpenClaw 会使用请求者会话解析后的路由（`lastChannel` / `lastTo` / `lastAccountId`）补全缺失的目标/账户，这样直接投递仍能工作
- 发给请求者会话的完成交接是运行时生成的内部上下文（不是用户编写文本），并包含：
  - `Result`（最新可见的 `assistant` 回复文本；否则为已清理的最新工具/工具结果文本；最终失败的运行不会复用捕获到的回复文本）
  - `Status`（`completed successfully` / `failed` / `timed out` / `unknown`）
  - 紧凑的运行时/令牌统计
  - 一条投递指令，要求请求者代理用正常助手语气改写（不要转发原始内部元数据）
- `--model` 和 `--thinking` 会覆盖该特定运行的默认值。
- 使用 `info`/`log` 在完成后检查详情和输出。
- `/subagents spawn` 是一次性模式（`mode: "run"`）。对于持久的线程绑定会话，请使用带有 `thread: true` 和 `mode: "session"` 的 `sessions_spawn`。
- 对于 ACP harness 会话（Codex、Claude Code、Gemini CLI），请使用 `runtime: "acp"` 的 `sessions_spawn`，并参阅 [ACP Agents](/tools/acp-agents)，尤其是在排查完成或代理间循环时查看 [ACP 交付模型](/tools/acp-agents#delivery-model)。

主要目标：

- 并行处理“调研／长任务／慢速工具”，避免阻塞主运行。
- 默认使子代理相互隔离（会话分离 + 可选沙箱）。
- 限制工具权限，子代理默认不具备会话工具访问权。
- 支持配置嵌套深度，用于编排模式。

Cost note: each sub-agent has its **own** context and token usage by default. For heavy or
repetitive tasks, set a cheaper model for sub-agents and keep your main agent on a
higher-quality model. You can configure this via `agents.defaults.subagents.model` or per-agent
overrides. When a child genuinely needs the requester's current transcript, the agent can request
`context: "fork"` on that one spawn.

## Context modes

Native sub-agents start isolated unless the caller explicitly asks to fork the
current transcript.

| Mode       | When to use it                                                                                                                         | Behavior                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `isolated` | Fresh research, independent implementation, slow tool work, or anything that can be briefed in the task text                           | Creates a clean child transcript. This is the default and keeps token use lower.  |
| `fork`     | Work that depends on the current conversation, prior tool results, or nuanced instructions already present in the requester transcript | Branches the requester transcript into the child session before the child starts. |

Use `fork` sparingly. It is for context-sensitive delegation, not a replacement
for writing a clear task prompt.

## 工具

使用 `sessions_spawn` 工具：

- 启动子代理运行（`deliver: false`，全局队列通道：`subagent`）
- 接着执行通报步骤，将结果回复发布至请求聊天频道
- 默认模型：继承调用者模型，除非设置了 `agents.defaults.subagents.model`（或针对单代理的 `agents.list[].subagents.model`）；显式的 `sessions_spawn.model` 优先。
- 默认思考级别：继承调用者思考级别，除非设置了 `agents.defaults.subagents.thinking`（或单代理覆盖）；显式的 `sessions_spawn.thinking` 优先。
- 默认运行超时：若未设置 `sessions_spawn.runTimeoutSeconds`，OpenClaw 使用 `agents.defaults.subagents.runTimeoutSeconds`（若已设置）；否则默认为 `0`（无超时）。

工具参数：

- `task`（必填）
- `label?`（可选）
- `agentId?`（可选；如果允许，可在其他 agent ID 下启动）
- `model?`（可选；覆盖子代理模型；无效值会被跳过，子代理将使用默认模型运行，并在工具结果中给出警告）
- `thinking?`（可选；覆盖该子代理运行的思考级别）
- `runTimeoutSeconds?`（默认在设置了 `agents.defaults.subagents.runTimeoutSeconds` 时使用该值，否则为 `0`；设置后，子代理运行会在 N 秒后中止）
- `thread?`（默认 `false`；当为 `true` 时，请求频道线程绑定该子代理会话）
- `mode?`（`run|session`）
  - 默认值为 `run`
  - 如果设置了 `thread: true` 且省略 `mode`，默认变为 `session`
  - `mode: "session"` 需要 `thread: true`
- `cleanup?`（`delete|keep`，默认 `keep`）
- `sandbox?`（`inherit|require`，默认 `inherit`；`require` 会在目标子运行时未沙箱化时拒绝启动）
- `context?`（`isolated|fork`，默认 `isolated`；仅适用于原生子代理）
  - `isolated` 会创建一个干净的子转录，并且是默认值。
  - `fork` 会将请求者当前转录分支到子会话中，使子会话以相同的对话上下文启动。
  - 仅在子节点确实需要当前转录时使用 `fork`。对于局部工作，请省略 `context`。
- `sessions_spawn` 不接受频道投递参数（`target`、`channel`、`to`、`threadId`、`replyTo`、`transport`）。如需投递，请对已启动的运行使用 `message`/`sessions_send`。

## 绑定线程的会话

当频道支持线程绑定时，子代理可绑定到某线程，使后续同线程用户消息继续定向该子代理会话。

### 支持线程的频道

- Discord（目前唯一支持的频道）：支持持久线程绑定的子代理会话（`sessions_spawn` 使用 `thread: true`），手动线程控制命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`），以及适配器配置键：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`、`channels.discord.threadBindings.spawnSubagentSessions`。

快速流程：

1. 使用 `sessions_spawn` 并设置 `thread: true`（可选 `mode: "session"`）启动。
2. OpenClaw 在活跃频道创建或绑定一个线程到该会话目标。
3. 该线程中的回复及后续消息均路由至绑定的子代理会话。
4. 使用 `/session idle` 查看/设置非活动自动解绑时间，使用 `/session max-age` 控制最大绑定时长。
5. 使用 `/unfocus` 手动解绑线程。

手动控制：

- `/focus <target>` 绑定当前线程（或新建线程）至指定子代理/会话目标。
- `/unfocus` 移除当前绑定线程的绑定。
- `/agents` 列出活跃运行及绑定状态（`thread:<id>` 或 `unbound`）。
- `/session idle` 和 `/session max-age` 仅对已绑定线程有效。

配置开关：

- 全局默认：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`
- 频道覆盖及启动自动绑定键依适配器而异，详见上文**支持线程的频道**。

白名单：

- `agents.list[].subagents.allowAgents`：允许通过 `agentId` 指定的代理 ID 列表（`["*"]` 允许所有）。默认仅允许请求代理本身。
- 沙箱继承限制：请求会话为沙箱环境时，`sessions_spawn` 会拒绝指向非沙箱运行时的目标。

- `agents.list[].subagents.allowAgents`：可通过 `agentId` 作为目标的代理 ID 列表（`["*"]` 表示允许任意）。默认：仅请求者代理。
- `agents.defaults.subagents.allowAgents`：当请求者代理未设置自己的 `subagents.allowAgents` 时使用的默认目标代理白名单。
- 沙箱继承保护：如果请求者会话处于沙箱中，`sessions_spawn` 会拒绝会在未沙箱化环境中运行的目标。
- `agents.defaults.subagents.requireAgentId` / `agents.list[].subagents.requireAgentId`：为 `true` 时，阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式选择配置文件）。默认：`false`。

- 使用 `agents_list` 查询当前被允许用于 `sessions_spawn` 的代理 ID。

自动归档：

- 子代理会话会在 `agents.defaults.subagents.archiveAfterMinutes`（默认 60 分钟）后自动归档。
- 归档过程调用 `sessions.delete`，并将对话记录重命名为 `*.deleted.<timestamp>`（同目录）。
- `cleanup: "delete"` 会在通报完成后立即归档（记录通过重命名保留）。
- 自动归档为尽力而为策略，网关重启会丢失待处理定时任务。
- `runTimeoutSeconds` 不触发自动归档，仅终止运行，会话保持至自动归档。
- 自动归档对深度 1 和深度 2 会话均适用。

- 子代理会话会在 `agents.defaults.subagents.archiveAfterMinutes`（默认：60）后自动归档。
- 归档使用 `sessions.delete`，并将转录重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 会在通报后立即归档（仍会通过重命名保留转录）。
- 自动归档是尽力而为的；如果网关重启，待处理的定时器会丢失。
- `runTimeoutSeconds` 不会自动归档；它只会停止运行。会话会一直保留到自动归档。
- 自动归档同样适用于深度 1 和深度 2 会话。
- 浏览器清理与归档清理是分开的：运行结束时，已跟踪的浏览器标签页/进程会尽力关闭，即使会话记录被保留。

默认子代理不能再产生子代理（`maxSpawnDepth: 1`）。可通过设置 `maxSpawnDepth: 2` 启用一层嵌套，实现**编排者模式**：主代理 → 编排者子代理 → 工作者子子代理。

### 如何启用

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // 允许子代理派生子节点（默认 1）
        maxChildrenPerAgent: 5, // 单代理会话最多同时活跃子会话数量（默认 5）
        maxConcurrent: 8, // 全局并发限制（默认 8）
        runTimeoutSeconds: 900, // sessions_spawn 默认超时（秒，0 表示无超时）
      },
    },
  },
}
```

### 深度级别

| 深度 | 会话键格式                                  | 角色                                               | 是否可再派生            |
| ---- | ------------------------------------------ | -------------------------------------------------- | ----------------------- |
| 0    | `agent:<id>:main`                          | 主代理                                             | 始终可                 |
| 1    | `agent:<id>:subagent:<uuid>`               | 子代理（开启深度 2 时为编排者）                      | 仅当 `maxSpawnDepth >= 2` 时可 |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（叶子工作者）                              | 否                      |

### 通报链

结果沿链向上传递：

1. 深度 2 工作者完成 → 通报给父节点（深度 1 编排者）
2. 深度 1 编排者收到通报，综合结果后完成 → 通报给主代理
3. 主代理接收通报并交付给用户

每级只看到其直接子节点的通报。

操作指南：

- 启动一次子任务并等待完成事件，不要围绕 `sessions_list`、`sessions_history`、`/subagents list` 或 `exec` 的 sleep 命令构建轮询循环。
- 如果子完成事件在你已经发送最终答案后才到达，那么正确的后续操作是精确的静默标记 `NO_REPLY` / `no_reply`。

### 按深度划分的工具策略

- 角色和控制范围在派生时写入会话元数据。这避免了扁平或恢复的会话密钥意外地重新获得编排者权限。
- **深度 1（编排者，`maxSpawnDepth >= 2`）**：拥有 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便管理其子节点。其他会话/系统工具禁用。
- **深度 1（叶子，`maxSpawnDepth == 1`）**：无会话工具（当前默认行为）。
- **深度 2（叶子工作者）**：无会话工具，`sessions_spawn` 始终禁用，无法继续派生。

### 每代理派生限制

每个代理会话（任意深度）最多可同时拥有 `maxChildrenPerAgent`（默认 5）个活跃子会话，防止单点无限扩展。

### 级联停止

停止深度 1 编排者会级联停止其所有深度 2 子节点：

- 在主聊天执行 `/stop` 停止所有深度 1 子代理及其深度 2 子节点。
- `/subagents kill <id>` 停止指定子代理及其子节点。
- `/subagents kill all` 停止请求者所有子代理并级联。

## 身份验证

子代理认证基于**代理 ID**，而非会话类型：

- 子代理会话键格式为：`agent:<agentId>:subagent:<uuid>`。
- 认证信息从该代理的 `agentDir` 加载。
- 主代理的认证配置作为**备用**合并：若冲突，代理配置优先。

注：合并为新增式，主代理配置始终作为回退。尚不支持代理间完全独立的认证。

## 通报（Announce）

子代理通过通报步骤汇报结果：

- 通报步骤在子代理会话内部运行（不是在请求者会话中）。
- 如果子代理恰好回复 `ANNOUNCE_SKIP`，则不会发布任何内容。
- 如果最新的 assistant 文本恰好是静默标记 `NO_REPLY` / `no_reply`，则即使之前已有可见进展，通报输出也会被抑制。
- 否则投递方式取决于请求者深度：
  - 顶层请求者会话使用带外投递的后续 `agent` 调用（`deliver=true`）
  - 嵌套的请求者子代理会话接收内部后续注入（`deliver=false`），这样编排器就可以在会话内综合子结果
  - 如果嵌套的请求者子代理会话已不存在，OpenClaw 会在可用时回退到该会话的请求者
- 对于顶层请求者会话，完成模式的直接投递会先解析任何已绑定的会话/线程路由和 hook 覆盖，然后用请求者会话存储的路由补全缺失的频道目标字段。这样即使完成源只标识了频道，也能将完成保留在正确的聊天/主题中。
- 构建嵌套完成结论时，子完成聚合仅限于当前请求者运行，防止旧运行的子输出泄漏到当前通报中。
- 通报回复会在频道适配器支持时保留线程/主题路由。
- 通报上下文会被规范化为一个稳定的内部事件块：
  - 来源（`subagent` 或 `cron`）
  - 子会话键/ID
  - 通报类型 + 任务标签
  - 由运行结果派生的状态行（`success`、`error`、`timeout` 或 `unknown`）
  - 结果内容从最新可见的 assistant 文本中选择；否则为已清理的最新工具/工具结果文本；最终失败的运行报告失败状态，不会重放捕获到的回复文本
  - 一条后续指令，说明何时应回复以及何时应保持静默
- `Status` 不从模型输出推断；它来自运行结果信号。
- 超时后，如果子任务只执行到了工具调用，通报可以把那段历史压缩成一个简短的部分进度摘要，而不是重放原始工具输出。

通报负载末尾包含统计行（即使有包装）：

- 运行时长（如 `runtime 5m12s`）
- 令牌使用（输入/输出/总计）
- 估算成本（当配置了模型计费信息 `models.providers.*.models[].cost`）
- `sessionKey`、`sessionId` 和记录路径（方便主代理通过 `sessions_history` 或本地文件查看）
- 内部元数据仅供编排使用，展示给用户的回复应以正常助手语气重写。

`sessions_history` 是更安全的编排路径：

- assistant 回忆会先进行规范化：
  - 思考标签会被移除
  - `<relevant-memories>` / `<relevant_memories>` 脚手架块会被移除
  - 诸如 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和 `<function_calls>...</function_calls>` 之类的纯文本工具调用 XML 负载块会被移除，包括从未完整闭合的截断负载
  - 降级的工具调用/结果脚手架和历史上下文标记会被移除
  - 泄漏的模型控制标记，例如 `<|assistant|>`、其他 ASCII `<|...|>` 标记以及全角 `<｜...｜>` 变体都会被移除
  - 格式错误的 MiniMax 工具调用 XML 会被移除
- 凭据/类似令牌的文本会被脱敏
- 长块可能会被截断
- 超大的历史记录可能会丢弃较早的行，或将过大的行替换为 `[sessions_history omitted: message too large]`
- 当你需要逐字节的完整转录时，直接检查磁盘上的原始转录是后备方案

## 工具策略（子代理工具）

默认子代理可用**除会话工具和系统工具外所有工具**，具体剔除：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` 在这里同样是有界的、经过净化的回忆视图；它不是
原始的完整转录转储。

当 `maxSpawnDepth >= 2` 时，深度为 1 的编排子代理还会额外获得 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便管理它们的子节点。

可通过配置覆写：

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 1,
      },
    },
  },
  tools: {
    subagents: {
      tools: {
        // 拒绝优先
        deny: ["gateway", "cron"],
        // 如果设置 allow，将变为仅允许列表（deny 依然优先）
        // allow: ["read", "exec", "process"]
      },
    },
  },
}
```

## 并发

子代理使用独立的进程内队列通道：

- 通道名：`subagent`
- 并发数上限：`agents.defaults.subagents.maxConcurrent`（默认 8）

## 停止

- 在请求聊天内发送 `/stop` 会中止请求会话，并停止任何由其派生的活跃子代理，级联停止所有嵌套子节点。
- `/subagents kill <id>` 停止指定子代理，并级联停止其子节点。

## 限制

- 子代理通报采用**尽力而为**方式。如果网关重启，待处理的“通报回写”工作会丢失。
- 子代理仍然共享相同的网关进程资源；请将 `maxConcurrent` 视为安全阀。
- `sessions_spawn` 始终是非阻塞的：它会立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文只注入 `AGENTS.md` + `TOOLS.md`（不注入 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1–5）。大多数用例推荐深度 2。
- `maxChildrenPerAgent` 限制每个会话的活跃子节点数（默认：5，范围：1–20）。

## 相关

- [ACP agents](/tools/acp-agents)
- [Multi-agent sandbox tools](/tools/multi-agent-sandbox-tools)
- [Agent send](/tools/agent-send)
