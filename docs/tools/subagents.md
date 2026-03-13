---
summary: "子代理：生成独立的代理运行，并将结果通报回请求的聊天会话"
read_when:
  - 你需要代理执行后台或并行任务
  - 你正在修改 sessions_spawn 或子代理工具策略
  - 你正在实现或排查绑定线程的子代理会话
title: "子代理"
---

# 子代理

子代理是在现有代理运行中派生的后台代理实例。它们运行在独立的会话中（`agent:<agentId>:subagent:<uuid>`），任务完成后，会**将结果通报**回请求该子代理的聊天频道。

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

`/subagents info` 显示运行元数据（状态、时间戳、会话ID、记录路径、清理信息）。

### 启动行为

`/subagents spawn` 会以用户命令启动后台子代理（不是内部转发），运行结束后会向请求的聊天频道发送最终完成更新。

- 启动命令非阻塞，立即返回运行 ID。
- 完成后，子代理将汇总结果消息通报回请求聊天频道。
- 对于手动启动，消息传递机制具有鲁棒性：
  - OpenClaw 会优先尝试使用稳定幂等键进行直接 `agent` 投递。
  - 若直接投递失败，则回退至队列路由。
  - 若队列路由不可用，则采用短时间指数退避重试，最终放弃。
- 通报过程是运行时生成的内部上下文（非用户文本），包括：
  - `Result`（助手回复文本，若助手无回复，则为最新 `toolResult`）
  - `Status`（成功完成 / 失败 / 超时 / 未知）
  - 精简的运行时/令牌统计
  - 交付指令，告知请求代理以普通助手语气复写回复（而非转发原始内部元数据）
- `--model` 和 `--thinking` 可覆盖该运行的默认设置。
- 运行完毕后，可用 `info` / `log` 查看详情和输出。
- `/subagents spawn` 默认为一次性模式（`mode: "run"`）。如需持久线程绑定会话，请使用 `sessions_spawn` 并设置 `thread: true` 及 `mode: "session"`。
- 适用于 ACP 运行时（Codex、Claude Code、Gemini CLI）的会话，使用 `sessions_spawn` 并设置 `runtime: "acp"`，详见 [ACP 代理](/tools/acp-agents)。

主要目标：

- 并行处理“调研／长任务／慢速工具”，避免阻塞主运行。
- 默认使子代理相互隔离（会话分离 + 可选沙箱）。
- 限制工具权限，子代理默认不具备会话工具访问权。
- 支持配置嵌套深度，用于编排模式。

成本提示：每个子代理拥有**独立的上下文和令牌耗费**。对于重度或重复任务，建议为子代理设置较低成本模型，主代理使用更优质模型。配置可通过 `agents.defaults.subagents.model` 或针对单个代理覆盖实现。

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
- `agentId?`（可选；若允许，可在其他代理 ID 下派生）
- `model?`（可选；覆盖子代理模型；非法值被忽略，子代理使用默认模型并在工具结果中提示警告）
- `thinking?`（可选；覆盖子代理的思考级别）
- `runTimeoutSeconds?`（若设置，则子代理运行会在指定秒数后中止；默认根据 `agents.defaults.subagents.runTimeoutSeconds`，否则为 `0`）
- `thread?`（默认 `false`；为 `true` 时，子代理会申请绑定频道线程）
- `mode?`（`run|session`）
  - 默认为 `run`
  - 如果 `thread: true` 且未指定 `mode`，默认变为 `session`
  - `mode: "session"` 要求必须 `thread: true`
- `cleanup?`（`delete|keep`，默认为 `keep`）
- `sandbox?`（`inherit|require`，默认为 `inherit`；`require` 会拒绝非沙箱子运行环境的启动）
- `sessions_spawn` 不接受频道投递参数 (`target`、`channel`、`to`、`threadId`、`replyTo`、`transport`)，发消息请使用子代理运行的 `message` / `sessions_send`。

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

发现：

- 使用 `agents_list` 查询当前被允许用于 `sessions_spawn` 的代理 ID。

自动归档：

- 子代理会话会在 `agents.defaults.subagents.archiveAfterMinutes`（默认 60 分钟）后自动归档。
- 归档过程调用 `sessions.delete`，并将对话记录重命名为 `*.deleted.<timestamp>`（同目录）。
- `cleanup: "delete"` 会在通报完成后立即归档（记录通过重命名保留）。
- 自动归档为尽力而为策略，网关重启会丢失待处理定时任务。
- `runTimeoutSeconds` 不触发自动归档，仅终止运行，会话保持至自动归档。
- 自动归档对深度 1 和深度 2 会话均适用。

## 嵌套子代理

默认子代理不能再产生子代理（`maxSpawnDepth: 1`）。可通过设置 `maxSpawnDepth: 2` 启用一层嵌套，实现**编排者模式**： 主代理 → 编排者子代理 → 工作者子子代理。

### 如何启用

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // 允许子代理派生子节点（默认1）
        maxChildrenPerAgent: 5, // 单代理会话最多同时活跃子会话数量（默认5）
        maxConcurrent: 8, // 全局并发限制（默认8）
        runTimeoutSeconds: 900, // sessions_spawn 默认超时（秒，0表示无超时）
      },
    },
  },
}
```

### 深度级别

| 深度 | 会话键格式                                  | 角色                                               | 是否可再派生            |
| ---- | ------------------------------------------ | -------------------------------------------------- | ----------------------- |
| 0    | `agent:<id>:main`                          | 主代理                                             | 始终可                 |
| 1    | `agent:<id>:subagent:<uuid>`               | 子代理（开启深度2时为编排者）                      | 仅当 `maxSpawnDepth >= 2` 时可 |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（叶子工作者）                              | 否                      |

### 通报链

结果沿链向上传递：

1. 深度 2 工作者完成 → 通报给父节点（深度 1 编排者）
2. 深度 1 编排者收到通报，综合结果后完成 → 通报给主代理
3. 主代理接收通报并交付给用户

每级只看到其直接子节点的通报。

### 按深度的工具权限策略

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

- 通报步骤运行在子代理会话（非请求者会话）内。
- 若子代理回复精确为 `ANNOUNCE_SKIP`，则不发送通报。
- 投递策略依请求深度区分：
  - 顶层请求会话使用带外投递的 `agent` 跟进调用（`deliver=true`）
  - 嵌套请求子代理会话使用内部跟进注入（`deliver=false`），便于编排者在会话内综合子结果
  - 如果嵌套请求会话不可用，OpenClaw 回退至该会话的请求者（如有）
- 汇总子层完成结果限定于当前请求运行，防止旧运行子结果混入。
- 通报回复可保留线程/话题路由信息（若频道适配器支持）。
- 通报上下文标准化为稳定内部事件块，包含：
  - 来源（`subagent` 或 `cron`）
  - 子会话键/ID
  - 通报类型及任务标签
  - 状态行，依据运行结果(`success`, `error`, `timeout`, `unknown`)
  - 通报步骤产生的结果内容（缺失则标记 `(no output)`）
  - 跟进指令，说明何时回复或保持沉默
- `Status` 非模型输出推断，而由运行时信号确定。

通报负载末尾包含统计行（即使有包装）：

- 运行时长（如 `runtime 5m12s`）
- 令牌使用（输入/输出/总计）
- 估算成本（当配置了模型计费信息 `models.providers.*.models[].cost`）
- `sessionKey`、`sessionId` 和记录路径（方便主代理通过 `sessions_history` 或本地文件查看）
- 内部元数据仅供编排使用，展示给用户的回复应以正常助手语气重写。

## 工具策略（子代理工具）

默认子代理可用**除会话工具和系统工具外所有工具**，具体剔除：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

当 `maxSpawnDepth >= 2`，深度 1 编排者子代理额外获得 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history` 权限以管理子节点。

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

- 子代理通报为**尽力而为**策略，网关重启会丢失待发送的通报。
- 子代理仍共享同一网关进程资源，`maxConcurrent` 充当保护阀。
- `sessions_spawn` 总是非阻塞：实时返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文仅注入 `AGENTS.md` + `TOOLS.md`，不含 `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md` 或 `BOOTSTRAP.md`。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1~5），推荐多数场景使用深度 2。
- `maxChildrenPerAgent` 限制每个会话活跃子节点数（默认 5，范围 1~20）。
