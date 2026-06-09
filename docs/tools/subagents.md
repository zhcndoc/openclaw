---
summary: "生成隔离的后台代理运行，并将结果通知回请求者聊天"
read_when:
  - 你想通过代理进行后台或并行工作
  - 你正在更改 sessions_spawn 或子代理工具策略
  - 你正在实现或排查线程绑定的子代理会话
title: "子代理"
sidebarTitle: "子代理"
---

子代理是从现有代理运行中生成的后台代理运行。
它们在各自的会话中运行（`agent:<agentId>:subagent:<uuid>`），并且在完成后，会将结果**通知**回请求者聊天
频道。每个子代理运行都会被跟踪为一个
[后台任务](/automation/tasks)。

主要目标：

- 在不阻塞主运行的情况下，并行化“调研 / 长任务 / 慢工具”工作。
- 默认保持子代理隔离（会话分离 + 可选沙箱）。
- 尽量让工具面不易被滥用：默认情况下，子代理**不**获得会话工具。
- 支持可配置的嵌套深度，以适配编排器模式。

<Note>
**成本说明：** 默认情况下，每个子代理都有自己的上下文和令牌使用量。
对于重型或重复性任务，请为子代理设置更便宜的模型，并让主代理使用更高质量的模型。
可通过 `agents.defaults.subagents.model` 或按代理覆盖进行配置。
当子代理确实需要请求者当前转录时，代理可以在那次生成中请求
`context: "fork"`。线程绑定的子代理会话默认使用
`context: "fork"`，因为它们会把当前对话分支到后续线程中。
</Note>

## 斜杠命令

使用 `/subagents` 来检查当前会话的子代理运行：

```text
/subagents list
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
```

`/subagents info` 会显示运行元数据（状态、时间戳、会话 ID、
转录路径、清理方式）。当你需要原始完整转录时，请使用 `sessions_history`
查看受限且经过安全过滤的回溯视图；如需原始完整转录，请检查磁盘上的转录路径。

### 线程绑定控制

这些命令适用于支持持久线程绑定的频道。
参见下面的[支持线程的频道](#thread-supporting-channels)。

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### 生成行为

代理会使用 `sessions_spawn` 启动后台子代理。子代理完成
后会作为内部父会话事件返回；父/请求者代理决定
是否需要面向用户的更新。

<AccordionGroup>
  <Accordion title="非阻塞、基于推送的完成">
    - `sessions_spawn` 是非阻塞的；它会立即返回一个运行 ID。
    - 子代理完成后，会向父/请求者会话回报。
    - 需要子结果的代理轮次应在生成所需工作后调用 `sessions_yield`。这会结束当前轮次，并让完成事件作为下一条模型可见消息到达。
    - 完成是基于推送的。一旦生成，请不要仅为了等待其结束而循环轮询 `/subagents list`、`sessions_list` 或 `sessions_history`；只在需要调试可见性时按需检查状态。
    - 子输出是供请求者代理综合整理的报告/证据。它不是用户编写的指令文本，不能覆盖系统、开发者或用户策略。
    - 完成时，OpenClaw 会尽力先关闭该子代理会话打开的受跟踪浏览器标签页/进程，然后再继续通知清理流程。

  </Accordion>
  <Accordion title="完成投递">
    - OpenClaw 会通过带有稳定幂等键的 `agent` 轮次将完成结果交回请求者会话。
    - 如果请求者运行仍然活跃，OpenClaw 会先尝试唤醒/引导该运行，而不是启动第二条可见回复路径。
    - 如果无法唤醒活跃的请求者，OpenClaw 会使用相同的完成上下文回退到请求者代理交接，而不是丢弃通知。
    - 即使父级决定不需要面向用户的更新，成功的父级交接也会完成子代理投递。
    - 原生子代理不会获得消息工具。它们向父/请求者代理返回普通的 assistant 文本；面向人的可见回复由父/请求者代理的正常投递策略负责。
    - 如果无法直接交接，则回退到队列路由。
    - 如果队列路由仍然不可用，则会在最终放弃前以短指数退避重试通知。
    - 完成投递会保留已解析的请求者路由：当线程绑定或会话绑定的完成路由可用时优先使用；如果完成来源只提供频道，OpenClaw 会从请求者会话已解析的路由（`lastChannel` / `lastTo` / `lastAccountId`）中补全缺失的目标/账户，这样直接投递仍然可用。

  </Accordion>
  <Accordion title="完成交接元数据">
    发给请求者会话的完成交接是运行时生成的
    内部上下文（不是用户编写的文本），并包含：

    - `Result` — 子代理最新可见的 `assistant` 回复文本。工具/工具结果输出不会被提升到子代理结果中。终止失败的运行不会复用捕获到的回复文本。
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`。
    - 简洁的运行时/令牌统计。
    - 一条复查指令，要求请求者代理在决定原始任务是否完成前先验证结果。
    - 一条后续指导，告诉请求者代理在子结果仍需更多动作时继续任务或记录后续事项。
    - 一条用于“无需更多动作”路径的最终更新指令，以正常的 assistant 语气编写，不转发原始内部元数据。

  </Accordion>
  <Accordion title="模式与 ACP 运行时">
    - `--model` 和 `--thinking` 会覆盖该特定运行的默认值。
    - 使用 `info`/`log` 在完成后检查详细信息和输出。
    - 对于持久的线程绑定会话，请使用 `sessions_spawn` 并设置 `thread: true` 和 `mode: "session"`。
    - 如果请求者频道不支持线程绑定，请使用 `mode: "run"`，而不是重试不可能成功的线程绑定组合。
    - 对于 ACP harness 会话（Claude Code、Gemini CLI、OpenCode，或显式请求的 Codex ACP/acpx），当工具声明了该运行时时，请使用 `sessions_spawn` 并设置 `runtime: "acp"`。调试完成结果或代理间循环时，请参见 [ACP 交付模型](/tools/acp-agents#delivery-model)。当启用 `codex` 插件时，Codex 聊天/线程控制应优先使用 `/codex ...` 而不是 ACP，除非用户明确要求 ACP/acpx。
    - 在启用 ACP、请求者未处于沙箱中，并且已加载如 `acpx` 之类的后端插件之前，OpenClaw 会隐藏 `runtime: "acp"`。`runtime: "acp"` 需要一个外部 ACP harness ID，或一个 `runtime.type="acp"` 的 `agents.list[]` 条目；对于来自 `agents_list` 的 OpenClaw 常规配置代理，请使用默认的子代理运行时。

  </Accordion>
</AccordionGroup>

## 上下文模式

原生子代理默认会以隔离方式启动，除非调用方明确要求分叉
当前转录。

| 模式       | 何时使用                                                                                                                                       | 行为                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `isolated` | 全新的调研、独立实现、慢工具工作，或任何可以在任务文本中简要说明的内容                                                                       | 创建一个干净的子转录。这是默认模式，并能降低令牌使用量。                         |
| `fork`     | 依赖当前对话、之前工具结果，或请求者转录中已存在的细微指令的工作                                                     | 在子会话开始前，将请求者转录分支到子会话中。 |

请谨慎使用 `fork`。它用于依赖上下文的委派，而不是
对清晰任务提示的替代。

## 工具：`sessions_spawn`

以 `deliver: false` 在全局 `subagent` 线路上启动一个子代理运行，
然后执行一个通知步骤，并将通知回复发布到请求者
聊天频道。

可用性取决于调用方的有效工具策略。`coding` 和
`full` 配置默认暴露 `sessions_spawn`。`messaging` 配置不暴露；
为应当委派工作的代理添加 `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]`，或者使用 `tools.profile: "coding"`。频道/组、提供方、沙箱以及按代理的允许/拒绝策略仍然可以在配置文件阶段之后移除此工具。可使用同一会话中的 `/tools` 来确认实际生效的工具列表。

**默认值：**

- **模型：** 原生子代理会继承调用方，除非你设置 `agents.defaults.subagents.model`（或按代理覆盖 `agents.list[].subagents.model`）。ACP 运行生成也会在存在时使用相同配置的子代理模型；否则 ACP 宿主保持自己的默认值。显式的 `sessions_spawn.model` 仍然优先。
- **思考：** 原生子代理会继承调用方，除非你设置 `agents.defaults.subagents.thinking`（或按代理覆盖 `agents.list[].subagents.thinking`）。ACP 运行生成也会对所选模型应用 `agents.defaults.models["provider/model"].params.thinking`。显式的 `sessions_spawn.thinking` 仍然优先。
- **运行超时：** 当设置了 `agents.defaults.subagents.runTimeoutSeconds` 时，OpenClaw 会使用它；否则回退到 `0`（无超时）。`sessions_spawn` 不接受按调用覆盖的超时设置。
- **任务投递：** 原生子代理会在其首条可见的 `[Subagent Task]` 消息中接收委派任务。子代理系统提示包含运行时规则和路由上下文，而不是任务的隐藏副本。

被接受的原生子代理生成会在工具结果中包含已解析的子模型元数据：
`resolvedModel` 包含已应用的模型引用，
`resolvedProvider` 在引用带有提供方前缀时包含该前缀。

### 委派提示模式

`agents.defaults.subagents.delegationMode` 仅控制提示引导；它不会改变工具策略，也不会强制委派。

- `suggest`（默认）：保持标准提示，引导把更大或更慢的工作交给子代理。
- `prefer`：提示主代理保持响应，并将任何比直接回复更复杂的工作通过 `sessions_spawn` 委派出去。

按代理覆盖使用 `agents.list[].subagents.delegationMode`。

```json5
{
  agents: {
    defaults: {
      subagents: {
        delegationMode: "prefer",
        maxConcurrent: 4,
      },
    },
    list: [
      {
        id: "coordinator",
        subagents: { delegationMode: "prefer" },
      },
    ],
  },
}
```

### 工具参数

<ParamField path="task" type="string" required>
  子代理的任务描述。
</ParamField>
<ParamField path="taskName" type="string">
  后续状态输出中用于标识特定子项的可选稳定句柄。必须匹配 `[a-z][a-z0-9_-]{0,63}`，且不能是 `last` 或 `all` 等保留目标。
</ParamField>
<ParamField path="label" type="string">
  可选的人类可读标签。
</ParamField>
<ParamField path="agentId" type="string">
  在 `subagents.allowAgents` 允许时，在另一个已配置的代理 ID 下生成。
</ParamField>
<ParamField path="cwd" type="string">
  子运行的可选任务工作目录。原生子代理仍会从目标代理工作区加载引导文件；`cwd` 只会改变运行时工具和 CLI 宿主执行委派工作的目录。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 仅用于外部 ACP 宿主（`claude`、`droid`、`gemini`、`opencode`，或显式请求的 Codex ACP/acpx）以及 `runtime.type` 为 `acp` 的 `agents.list[]` 条目。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  仅 ACP。当 `runtime: "acp"` 时恢复一个已有的 ACP 宿主会话；对原生子代理生成会被忽略。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  仅 ACP。当 `runtime: "acp"` 时，将 ACP 运行输出流式发送到父会话；对原生子代理生成请省略。
</ParamField>
<ParamField path="model" type="string">
  覆盖子代理模型。无效值会被跳过，子代理将在默认模型上运行，并在工具结果中给出警告。
</ParamField>
<ParamField path="thinking" type="string">
  覆盖子代理运行的思考级别。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  当为 `true` 时，为该子代理会话请求频道线程绑定。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  如果设置了 `thread: true` 且省略了 `mode`，默认值将变为 `session`。`mode: "session"` 需要 `thread: true`。
  如果请求者频道不支持线程绑定，请使用 `mode: "run"`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 会在通知后立即归档（仍通过重命名保留转录）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` 会拒绝生成，除非目标子运行时已启用沙箱。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 会将请求者当前转录分支到子会话中。仅适用于原生子代理。线程绑定生成默认使用 `fork`；非线程生成默认使用 `isolated`。
</ParamField>

<Warning>
`sessions_spawn` **不**接受频道投递参数（`target`、
`channel`、`to`、`threadId`、`replyTo`、`transport`）。原生子代理会将
其最新的 assistant 轮次回报给请求者；外部投递仍由
父/请求者代理负责。
</Warning>

### 任务名称和定位

`taskName` 是用于编排的模型可见标识，不是会话键。
当协调器稍后可能需要检查该子任务时，请将其用于稳定的子任务名称，例如
`review_subagents`、
`linux_validation` 或 `docs_update`。

目标解析接受精确的 `taskName` 匹配以及无歧义
前缀。匹配范围限定在与编号 `/subagents` 目标相同的活动/最近目标窗口中，
因此已过时的已完成子任务不会使重复使用的标识变得歧义。如果两个活动或最近的子任务共享同一个
`taskName`，则该目标是有歧义的；请改用列表索引、会话键或
运行 ID。

保留目标 `last` 和 `all` 不能作为有效的 `taskName` 值，
因为它们已经具有控制含义。

## 工具：`sessions_yield`

结束当前模型轮次，并等待运行时事件，主要是
子代理完成事件，作为下一条消息到达。当请求者在这些完成到达之前
无法给出最终答案时，请在生成所需子任务后使用它。

`sessions_yield` 是等待原语。不要用
对子代理、`sessions_list`、`sessions_history`、shell `sleep`
或进程轮询的循环来替代它，只是为了检测子任务完成。

只有当会话的有效工具列表包含它时，才使用 `sessions_yield`。
某些最小或自定义工具配置文件可能会暴露 `sessions_spawn` 和
`subagents`，但不暴露 `sessions_yield`；在这种情况下，不要为了等待完成而虚构轮询循环。

当存在活动子任务时，OpenClaw 会在正常轮次中注入一个紧凑的运行时生成的
`Active Subagents` 提示块，以便请求者可以看到当前的子会话、运行 id、状态、标签、任务和
`taskName` 别名，而无需轮询。该块中的任务和标签字段被引用为数据，而不是指令，因为它们可能来自用户/模型提供的生成参数。

## 工具：`subagents`

列出由请求者会话拥有的已生成子代理运行。它的作用域
限定为当前请求者；子级只能看到自己所控制的子级。

按需使用 `subagents` 获取状态和调试信息。使用 `sessions_yield`
等待完成事件。

## 线程绑定会话

当为某个通道启用线程绑定时，子代理可以保持与某个线程绑定，
这样该线程中的后续用户消息就会继续路由到同一个子代理会话。

### 支持线程的通道

Any channel with a session-binding adapter can support persistent
thread-bound subagent sessions (`sessions_spawn` with `thread: true`).
Bundled adapters currently include Discord threads, Matrix threads,
Telegram forum topics, and current-conversation bindings for Feishu.
Use the per-channel `threadBindings` config keys for enablement,
timeouts, and `spawnSessions`.

### 快速流程

<Steps>
  <Step title="Spawn">
    使用 `sessions_spawn` 搭配 `thread: true`（也可选用 `mode: "session"`）。
  </Step>
  <Step title="Bind">
    OpenClaw 会在当前活动通道中创建或将一个线程绑定到该会话目标。
  </Step>
  <Step title="Route follow-ups">
    该线程中的回复和后续消息会路由到已绑定的会话。
  </Step>
  <Step title="Inspect timeouts">
    使用 `/session idle` 检查/更新不活动自动取消聚焦，
    使用 `/session max-age` 控制硬性上限。
  </Step>
  <Step title="Detach">
    使用 `/unfocus` 手动解除绑定。
  </Step>
</Steps>

### 手动控制

| 命令               | 作用                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| `/focus <target>`  | 将当前线程（或创建一个线程）绑定到某个子代理/会话目标                 |
| `/unfocus`         | 移除当前已绑定线程的绑定关系                                           |
| `/agents`          | 列出活动运行和绑定状态（`thread:<id>` 或 `unbound`）                  |
| `/session idle`    | 检查/更新空闲自动取消聚焦（仅限已聚焦的绑定线程）                     |
| `/session max-age` | 检查/更新硬性上限（仅限已聚焦的绑定线程）                             |

### 配置开关

- **全局默认值：** `session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- **通道覆盖和自动绑定的 spawn 键** 依赖适配器。参见上方的 [支持线程的通道](#thread-supporting-channels)。

参见 [配置参考](/gateway/configuration-reference) 和
[斜杠命令](/tools/slash-commands) 了解当前适配器详情。

### 白名单

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  已配置的代理 id 列表，可通过显式 `agentId` 进行目标指定（`["*"]` 允许任何已配置的目标）。默认值：仅请求者代理。如果你设置了列表，但仍希望请求者在使用 `agentId` 时生成自身，请将请求者 id 也包含在列表中。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  当请求者代理未自行设置 `subagents.allowAgents` 时使用的默认已配置目标代理允许名单。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式选择配置文件）。按代理覆盖：`agents.list[].subagents.requireAgentId`。
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  网关 `agent` announce 投递尝试的单次调用超时时间。值为正整数毫秒，并会被限制到平台安全的计时器最大值。临时重试可能会使总 announce 等待时间长于单个配置的超时值。
</ParamField>

如果请求者会话处于沙箱环境中，`sessions_spawn` 会拒绝那些
会以非沙箱方式运行的目标。

### 发现

使用 `agents_list` 查看当前允许用于 `sessions_spawn` 的代理 id。响应会包含每个已列出代理的有效模型和嵌入的运行时元数据，以便调用方区分 OpenClaw、Codex app-server 和其他已配置的原生运行时。

`allowAgents` 条目必须指向 `agents.list[]` 中已配置的代理 id。
`["*"]` 表示任意已配置目标代理以及请求者。如果某个代理配置
被删除，但其 id 仍保留在 `allowAgents` 中，`sessions_spawn` 会拒绝该 id，
而 `agents_list` 会省略它。运行 `openclaw doctor --fix` 可清理过期的允许名单条目，或者在目标应保持可生成且继承默认值时，添加一个最小化的 `agents.list[]` 条目。

### 自动归档

- 子代理会话会在 `agents.defaults.subagents.archiveAfterMinutes`（默认 `60`）后自动归档。
- 归档使用 `sessions.delete`，并将转录重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 会在通知后立即归档（仍通过重命名保留转录）。
- 自动归档尽力而为；如果网关重启，待处理的定时器会丢失。
- 已配置的运行超时**不会**自动归档；它们只会停止运行。会话会一直保留，直到自动归档。
- 自动归档同样适用于一级和二级会话。
- 浏览器清理与归档清理是分开的：在运行结束时，会尽力关闭已跟踪的浏览器标签页/进程，即使转录/会话记录被保留。

## 嵌套子代理

默认情况下，子代理不能再启动自己的子代理
（`maxSpawnDepth: 1`）。将 `maxSpawnDepth: 2` 可启用一层
嵌套——**编排器模式**：主代理 → 编排器子代理 →
工作子子代理。

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // 允许子代理启动子级（默认值：1）
        maxChildrenPerAgent: 5, // 每个代理会话的最大活动子级数（默认值：5）
        maxConcurrent: 8, // 全局并发通道上限（默认值：8）
        runTimeoutSeconds: 900, // sessions_spawn 的默认超时（0 = 不超时）
        announceTimeoutMs: 120000, // 每次调用的网关 announce 超时
      },
    },
  },
}
```

### 深度层级

| 深度 | 会话键形状                                  | 角色                                          | 可以启动子级？               |
| ----- | ------------------------------------------- | --------------------------------------------- | ---------------------------- |
| 0     | `agent:<id>:main`                            | 主代理                                        | 始终可以                    |
| 1     | `agent:<id>:subagent:<uuid>`                 | 子代理（当允许深度 2 时为编排器）            | 仅当 `maxSpawnDepth >= 2`   |
| 2     | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（叶子工作者）                        | 永远不可以                  |

### 通知链

结果会沿链路向上返回：

1. 深度 2 的工作者完成 → 通知其父级（深度 1 的编排器）。
2. 深度 1 的编排器收到通知，综合结果，完成 → 通知主代理。
3. 主代理收到通知并交付给用户。

每一层只能看到来自其直接子级的通知。

<Note>
**操作建议：** 先启动一次子任务并等待完成
事件，而不是围绕 `sessions_list`、
`sessions_history`、`/subagents list` 或 `exec` sleep 命令构建轮询循环。
`sessions_list` 和 `/subagents list` 会将子会话关系
聚焦于活跃工作——存活的子级保持附着，已结束的子级在短暂的最近窗口内仍可见，而仅存于存储中的过期子级链接会在其新鲜度窗口之后被忽略。这样可以防止旧的 `spawnedBy` /
`parentSessionKey` 元数据在重启后复活“幽灵子级”。如果子级完成事件在你已经发送
最终答案之后到达，正确的后续处理是精确的静默标记
`NO_REPLY` / `no_reply`。
</Note>

### 按深度划分的工具策略

- 角色和控制范围会在生成会话时写入会话元数据。这样可以防止扁平或恢复后的会话键意外重新获得编排器权限。
- **深度 1（编排器，当 `maxSpawnDepth >= 2` 时）：** 可获得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便它可以生成子级并检查其状态。其他会话/系统工具仍被拒绝。
- **深度 1（叶子，当 `maxSpawnDepth == 1` 时）：** 没有会话工具（当前默认行为）。
- **深度 2（叶子工作者）：** 没有会话工具——在深度 2 时始终拒绝 `sessions_spawn`。不能再生成更深层的子级。

### 每个代理的启动上限

每个代理会话（任意深度）在同一时间最多只能有 `maxChildrenPerAgent`
（默认 `5`）个活动子级。这可以防止单个编排器
产生失控的分叉扩散。

### 级联停止

停止一个深度 1 的编排器会自动停止其所有深度 2
子级：

- 主聊天中的 `/stop` 会停止所有深度 1 代理，并级联停止其深度 2 子级。

## 认证

子代理认证按**代理 id**解析，而不是按会话类型：

- 子代理会话键为 `agent:<agentId>:subagent:<uuid>`。
- 认证存储从该代理的 `agentDir` 加载。
- 主代理的认证配置会作为**回退**合并进来；冲突时以代理配置覆盖主配置。

合并是累加式的，因此主配置文件始终作为
回退可用。当前尚不支持每个代理完全隔离的认证。

## 通知

子代理通过一个 announce 步骤回报：

- announce 步骤在子代理会话内部运行（而不是在请求者会话中）。
- 如果子代理恰好回复 `ANNOUNCE_SKIP`，则不会发布任何内容。
- 如果最新的 assistant 文本恰好是静默标记 `NO_REPLY` / `no_reply`，即使之前存在可见进度，也会抑制 announce 输出。

交付取决于请求者深度：

- 顶层请求者会话使用带外部交付的后续 `agent` 调用（`deliver=true`）。
- 嵌套的请求者子代理会话接收内部后续注入（`deliver=false`），这样编排器就可以在会话内综合子级结果。
- 如果嵌套的请求者子代理会话已消失，OpenClaw 会在可用时回退到该会话的请求者。

对于顶层请求者会话，完成模式下的直接交付会先
解析任何已绑定的对话/线程路由和 hook 覆盖，然后再用
请求者会话中存储的路由填充缺失的通道目标字段。
这样即使完成来源只识别出通道，也能确保完成内容送达正确的聊天/主题。

在构建嵌套完成结果时，子级完成聚合仅作用于当前请求者运行，
从而防止之前运行中残留的子级输出泄漏到当前 announce 中。
当可用时，announce 回复会保留线程/主题路由，
适用于通道适配器。

### 通知上下文

announce 上下文会被规范化为稳定的内部事件块：

| 字段           | 来源                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| 来源           | `subagent` 或 `cron`                                                                                          |
| 会话 id        | 子会话键/id                                                                                                  |
| 类型           | announce 类型 + 任务标签                                                                                    |
| 状态           | 根据运行时结果推导（`success`、`error`、`timeout` 或 `unknown`）——**不是**从模型文本推断 |
| 结果内容       | 子级最新可见的 assistant 文本                                                                               |
| 后续处理       | 说明何时应回复与何时保持静默的指令                                                                           |

终态失败运行会报告失败状态，而不会重放已捕获的
回复文本。Tool/toolResult 输出不会被提升为子级结果文本。

### 统计行

announce 载荷会在末尾包含一行统计信息（即使已包裹）：

- 运行时长（例如 `runtime 5m12s`）。
- 令牌用量（输入/输出/总计）。
- 当已配置模型定价时的估算成本（`models.providers.*.models[].cost`）。
- `sessionKey`、`sessionId` 和转录路径，以便主代理可通过 `sessions_history` 获取历史或在磁盘上检查文件。

内部元数据仅用于编排；面向用户的回复
应改写为正常的 assistant 语气。

### 为什么优先使用 `sessions_history`

`sessions_history` 是更安全的编排路径：

- assistant 记忆会先被规范化：移除 thinking 标签；移除 `<relevant-memories>` / `<relevant_memories>` 脚手架；移除纯文本工具调用 XML 载荷块（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`），包括未能完整闭合的截断载荷；移除降级的工具调用/结果脚手架和历史上下文标记；移除泄露的模型控制标记（`<|assistant|>`、其他 ASCII `<|...|>`、全角 `<｜...｜>`）；移除格式损坏的 MiniMax 工具调用 XML。
- 会对凭证/令牌样式文本进行脱敏。
- 长块内容可能会被截断。
- 超大历史记录可能会丢弃较旧行，或将过大的单行替换为 `[sessions_history omitted: message too large]`。
- 当你需要按字节逐字节查看完整转录时，可回退到原始磁盘转录检查。

## 工具策略

子代理使用与父代理或目标代理相同的 profile 和工具策略管道。之后，OpenClaw 会应用子代理限制层。

在没有受限 `tools.profile` 的情况下，子代理会获得**除消息工具、会话工具和系统工具之外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`
- `message`

`sessions_history` 在这里仍然是一个有边界、经过清理的回溯视图——它
不是原始转录内容的完整转储。

当 `maxSpawnDepth >= 2` 时，深度 1 的编排器子代理还会额外获得
`sessions_spawn`、`subagents`、`sessions_list` 和
`sessions_history`，以便它们管理自己的子级。

### 通过配置覆盖

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
        // 如果设置了 allow，它会变为仅允许白名单（deny 仍然优先）
        // allow: ["read", "exec", "process"]
      },
    },
  },
}
```

`tools.subagents.tools.allow` 是最终的仅允许过滤器。它可以缩小
已经解析出的工具集，但不能**重新添加**一个被
`tools.profile` 移除的工具。例如，`tools.profile: "coding"` 包含
`web_search`/`web_fetch`，但不包含 `browser` 工具。若要让
使用 coding profile 的子代理能够使用浏览器自动化，请在
profile 阶段添加 browser：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

当只有一个代理应当获得浏览器自动化时，请使用按代理设置的
`agents.list[].tools.alsoAllow: ["browser"]`。

## 并发

子代理使用专用的进程内队列通道：

- **通道名称：** `subagent`
- **并发数：** `agents.defaults.subagents.maxConcurrent`（默认 `8`）

## 存活性与恢复

OpenClaw 不会将 `endedAt` 缺失视为子代理仍然存活的永久证据。超过陈旧运行窗口的未结束运行，在 `/subagents list`、状态摘要、后代完成门控以及按会话的并发检查中，都不再计为活动/待处理。

在网关重启后，陈旧的未结束恢复运行会被清理，除非其子会话被标记为 `abortedLastRun: true`。这些重启后中止的子会话仍可通过子代理孤儿恢复流程找回；该流程会在清除中止标记之前发送一条合成的恢复消息。

每个子会话的自动重启恢复都有边界。如果同一个子代理子会话在快速重新卡住窗口内被反复接受用于孤儿恢复，OpenClaw 会在该会话上持久化一个恢复墓碑，并在后续重启中停止自动恢复它。运行 `openclaw tasks maintenance --apply` 以协调任务记录，或运行 `openclaw doctor --fix` 清除墓碑会话上过期的中止恢复标记。

<Note>
If a sub-agent spawn fails with Gateway `PAIRING_REQUIRED` /
`scope-upgrade`, check the RPC caller before editing pairing state.
Internal `sessions_spawn` coordination dispatches in process when the
caller is already running inside the gateway request context, so it does
not open a loopback WebSocket or depend on the CLI's paired-device scope
baseline. Callers outside the gateway process still use the WebSocket
fallback as `client.id: "gateway-client"` with `client.mode: "backend"`
over direct loopback shared-token/password auth. Remote callers, explicit
`deviceIdentity`, explicit device-token paths, and browser/node clients
still need normal device approval for scope upgrades.
</Note>

## 停止

- 在请求者聊天中发送 `/stop` 会中止请求者会话，并停止由其派生的任何活动子代理运行，同时级联到嵌套子级。

## 限制

- 子代理公告是**尽力而为**的。如果网关重启，待处理的“回传公告”工作会丢失。
- 子代理仍然共享同一个网关进程资源；请将 `maxConcurrent` 视为安全阀。
- `sessions_spawn` 始终是非阻塞的：它会立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文只注入 `AGENTS.md` 和 `TOOLS.md`（不包括 `SOUL.md`、`IDENTITY.md`、`USER.md`、`MEMORY.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。Codex 原生子代理遵循相同边界：`TOOLS.md` 保留在继承的 Codex 线程指令中，而仅父级的人设、身份和用户文件会作为按轮次作用域的协作指令注入，因此子级不会克隆它们。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1–5）。对于大多数用例，建议使用深度 2。
- `maxChildrenPerAgent` 限制每个会话的活动子级数量（默认 `5`，范围 `1–20`）。

## 相关内容

- [ACP agents](/tools/acp-agents)
- [Agent send](/tools/agent-send)
- [后台任务](/automation/tasks)
- [多代理沙箱工具](/tools/multi-agent-sandbox-tools)
