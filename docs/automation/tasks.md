---
summary: "ACP 运行、子代理、隔离 cron 作业以及 CLI 操作的后台任务跟踪"
read_when:
  - 检查正在进行或最近完成的后台工作
  - 调试分离代理运行的投递失败
  - 了解后台运行如何与会话、cron 和 heartbeat 相关联
title: "后台任务"
sidebarTitle: "后台任务"
---

<Note>
在找调度功能吗？请参阅 [Automation and tasks](/automation)，以选择合适的机制。本页是后台工作的活动台账，不是调度器。
</Note>

后台任务用于跟踪**在主对话会话之外**运行的工作：ACP 运行、子代理启动、隔离的 cron 作业执行，以及由 CLI 发起的操作。

任务**不会**取代会话、cron 作业或 heartbeats —— 它们是**活动台账**，用于记录哪些分离的工作发生了、何时发生，以及是否成功。

<Note>
并非每次代理运行都会创建任务。heartbeat 回合和普通的交互式聊天不会。所有 cron 执行、ACP 启动、子代理启动以及 CLI 代理命令都会创建任务。
</Note>

## TL;DR

- 任务是**记录**，不是调度器——cron 和 heartbeat 决定 _何时_ 运行工作，任务跟踪 _发生了什么_。
- ACP、子代理、所有 cron 作业和 CLI 操作都会创建任务。heartbeat 回合不会。
- 每个任务都会经过 `queued → running → terminal`（succeeded、failed、timed_out、cancelled 或 lost）。
- 只要 cron 运行时仍然持有该作业，cron 任务就会保持存活；如果
  内存中的运行时状态已经消失，任务维护会先检查持久化的 cron
  运行历史，然后再将任务标记为 lost。
- 完成采用推送驱动：分离的工作完成后可以直接通知，或唤醒
  请求者会话/heartbeat，因此状态轮询循环通常并不是合适的方式。
- 隔离 cron 运行和子代理完成会尽力在最终清理记账之前，
  清理其子会话关联的浏览器标签页/进程。
- 隔离 cron 投递会在后代子代理工作仍在收尾时抑制过时的中间父级回复，并且如果最终的后代输出先于投递到达，则优先使用它。
- 完成通知会直接发送到某个通道，或排队等待下一次 heartbeat。
- `openclaw tasks list` 显示所有任务；`openclaw tasks audit` 会暴露问题。
- 终态记录保留 7 天，然后自动清理。

## 快速开始

<Tabs>
  <Tab title="列出和筛选">
    ```bash
    # 列出所有任务（最新优先）
    openclaw tasks list

    # 按运行时或状态筛选
    openclaw tasks list --runtime acp
    openclaw tasks list --status running
    ```

  </Tab>
  <Tab title="检查">
    ```bash
    # 显示某个特定任务的详情（按 ID、run ID 或 session key）
    openclaw tasks show <lookup>
    ```
  </Tab>
  <Tab title="取消和通知">
    ```bash
    # 取消一个正在运行的任务（会终止子会话）
    openclaw tasks cancel <lookup>

    # 更改某个任务的通知策略
    openclaw tasks notify <lookup> state_changes
    ```

  </Tab>
  <Tab title="审计和维护">
    ```bash
    # 运行健康审计
    openclaw tasks audit

    # 预览或应用维护
    openclaw tasks maintenance
    openclaw tasks maintenance --apply
    ```

  </Tab>
  <Tab title="任务流">
    ```bash
    # 检查 TaskFlow 状态
    openclaw tasks flow list
    openclaw tasks flow show <lookup>
    openclaw tasks flow cancel <lookup>
    ```
  </Tab>
</Tabs>

## 什么会创建任务

| Source                 | Runtime type | When a task record is created                          | Default notify policy |
| ---------------------- | ------------ | ------------------------------------------------------ | --------------------- |
| ACP background runs    | `acp`        | Spawning a child ACP session                           | `done_only`           |
| Subagent orchestration | `subagent`   | Spawning a subagent via `sessions_spawn`               | `done_only`           |
| Cron jobs (all types)  | `cron`       | Every cron execution (main-session and isolated)       | `silent`              |
| CLI operations         | `cli`        | `openclaw agent` commands that run through the gateway | `silent`              |
| Agent media jobs       | `cli`        | Session-backed `music_generate`/`video_generate` runs  | `silent`              |

<AccordionGroup>
  <Accordion title="cron 和媒体的通知默认值">
    主会话 cron 任务默认使用 `silent` 通知策略——它们会创建记录用于跟踪，但不会生成通知。隔离 cron 任务也默认使用 `silent`，但因为它们在自己的会话中运行，所以更容易被看到。

    基于会话的 `music_generate` 和 `video_generate` 运行也使用 `silent` 通知策略。它们仍然会创建任务记录，但完成后会作为内部唤醒交还给原始代理会话，这样代理就可以编写后续消息并自行附加已完成的媒体。如果你启用 `tools.media.asyncCompletion.directSend`，异步 `video_generate` 完成会先尝试直接发送到通道；异步 `music_generate` 完成则仍走请求者会话唤醒路径。

  </Accordion>
  <Accordion title="并发 video_generate 保护机制">
    当一个由会话承载的 `video_generate` 任务仍处于活动状态时，该工具也充当保护机制：在同一个会话中重复调用 `video_generate` 会返回当前活动任务的状态，而不会启动第二个并发生成。如果你想从代理侧明确查询进度/状态，请使用 `action: "status"`。
  </Accordion>
  <Accordion title="什么不会创建任务">
    - heartbeat 回合——主会话；参见 [Heartbeat](/gateway/heartbeat)
    - 普通交互式聊天回合
    - 直接 `/command` 响应

  </Accordion>
</AccordionGroup>

## 任务生命周期

```mermaid
stateDiagram-v2
    [*] --> queued
    queued --> running : agent starts
    running --> succeeded : completes ok
    running --> failed : error
    running --> timed_out : timeout exceeded
    running --> cancelled : operator cancels
    queued --> lost : session gone > 5 min
    running --> lost : session gone > 5 min
```

| 状态         | 含义                                                               |
| ------------ | ------------------------------------------------------------------ |
| `queued`     | 已创建，等待代理开始                                               |
| `running`    | 代理回合正在执行                                                   |
| `succeeded`  | 成功完成                                                         |
| `failed`     | 以错误结束                                                       |
| `timed_out`  | 超过了配置的超时时间                                             |
| `cancelled`  | 被操作员通过 `openclaw tasks cancel` 停止                        |
| `lost`       | 在 5 分钟宽限期后，运行时失去了权威的后备状态                    |

状态会自动转换——当关联的代理运行结束时，任务状态会更新为相应结果。

代理运行完成是活动任务记录的权威来源。一次成功的分离运行会最终标记为 `succeeded`，普通运行错误会最终标记为 `failed`，而超时或中止结果会最终标记为 `timed_out`。如果操作员已经取消了该任务，或者运行时已经记录了更强的终态，例如 `failed`、`timed_out` 或 `lost`，那么稍后到达的成功信号不会降低该终态状态。

`lost` 是具备运行时感知的：

- ACP 任务：后备的 ACP 子会话元数据消失了。
- 子代理任务：后备子会话从目标代理存储中消失了。
- Cron 任务：cron 运行时不再将该作业视为活动状态，并且持久化
  cron 运行历史中没有显示该运行的终态结果。离线 CLI
  审计不会将其自身空的进程内 cron 运行时状态视为权威。
- CLI 任务：隔离的子会话任务使用子会话；基于聊天的
  CLI 任务则改用实时运行上下文，因此残留的
  通道/群组/直接会话行不会让它们继续存活。网关支持的
  `openclaw agent` 运行也会根据其运行结果最终完成，因此已完成的运行
  不会一直处于活动状态，直到 sweeper 将其标记为 `lost`。

## 投递和通知

当任务到达终态时，OpenClaw 会通知你。投递路径有两种：

**直接投递**——如果任务有通道目标（`requesterOrigin`），完成消息会直接发送到该通道（Telegram、Discord、Slack 等）。对于子代理完成，OpenClaw 在可用时还会保留绑定的线程/主题路由，并且在放弃直接投递之前，可以从请求者会话存储的路由（`lastChannel` / `lastTo` / `lastAccountId`）中补全缺失的 `to` / account。

**会话排队投递**——如果直接投递失败或未设置来源，则更新会作为系统事件排队到请求者的会话中，并在下一次 heartbeat 时显示。

<Tip>
任务完成会立即触发 heartbeat 唤醒，因此你可以很快看到结果——你不必等到下一次计划中的 heartbeat tick。
</Tip>

这意味着通常的工作流是推送式的：先启动一次分离的工作，然后让运行时在完成时唤醒或通知你。只有在需要调试、干预，或进行明确审计时，才轮询任务状态。

### 通知策略

控制你从每个任务中接收到多少信息：

| 策略                  | 投递内容                                                            |
| --------------------- | ------------------------------------------------------------------- |
| `done_only`（默认）   | 只投递终态（succeeded、failed 等）——**这是默认值**                |
| `state_changes`       | 每一次状态转换和进度更新                                           |
| `silent`              | 什么都不投递                                                        |

在任务运行期间更改通知策略：

```bash
openclaw tasks notify <lookup> state_changes
```

## CLI 参考

<AccordionGroup>
  <Accordion title="tasks list">
    ```bash
    openclaw tasks list [--runtime <acp|subagent|cron|cli>] [--status <status>] [--json]
    ```

    输出列：Task ID、Kind、Status、Delivery、Run ID、Child Session、Summary。

  </Accordion>
  <Accordion title="tasks show">
    ```bash
    openclaw tasks show <lookup>
    ```

    查找令牌可以接受 task ID、run ID 或 session key。显示完整记录，包括计时、传递状态、错误和终端摘要。

  </Accordion>
  <Accordion title="tasks cancel">
    ```bash
    openclaw tasks cancel <lookup>
    ```

    对于 ACP 和 subagent 任务，这会终止子会话。对于由 CLI 跟踪的任务，取消会记录在任务注册表中（没有单独的子运行时句柄）。状态会变为 `cancelled`，并在适用时发送传递通知。

  </Accordion>
  <Accordion title="tasks notify">
    ```bash
    openclaw tasks notify <lookup> <done_only|state_changes|silent>
    ```
  </Accordion>
  <Accordion title="tasks audit">
    ```bash
    openclaw tasks audit [--json]
    ```

    暴露运行问题。检测到问题时，发现项也会出现在 `openclaw status` 中。

    | Finding                   | Severity   | Trigger                                                                                                      |
    | ------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
    | `stale_queued`            | warn       | 排队超过 10 分钟                                                                                             |
    | `stale_running`           | error      | 运行超过 30 分钟                                                                                             |
    | `lost`                    | warn/error | 由运行时支持的任务所有权消失；保留的 lost 任务在 `cleanupAfter` 之前显示为警告，之后变为错误                  |
    | `delivery_failed`         | warn       | 传递失败且通知策略不是 `silent`                                                                              |
    | `missing_cleanup`         | warn       | 终态任务缺少 cleanup 时间戳                                                                                  |
    | `inconsistent_timestamps` | warn       | 时间线违规（例如结束时间早于开始时间）                                                                       |

  </Accordion>
  <Accordion title="tasks maintenance">
    ```bash
    openclaw tasks maintenance [--json]
    openclaw tasks maintenance --apply [--json]
    ```

    用于预览或应用任务及 Task Flow 状态的协调修复、清理时间戳设置和裁剪。

    协调修复感知运行时：

    - ACP/subagent 任务会检查其后备子会话。
    - 如果子代理任务的子会话带有 restart-recovery 墓碑，则会标记为 lost，而不是当作可恢复的后备会话。
    - Cron 任务会检查 cron 运行时是否仍然拥有该作业，然后在回退为 `lost` 之前，从持久化的 cron 运行日志/作业状态中恢复终态。只有 Gateway 进程对内存中的 cron 活动作业集合具有权威性；离线 CLI 审计会使用持久化历史，但不会仅因为本地 Set 为空就把 cron 任务标记为 lost。
    - 基于聊天的 CLI 任务会检查拥有它的实时运行上下文，而不仅仅是聊天会话行。

    完成清理同样感知运行时：

    - subagent 完成时会尽力在公告清理继续之前关闭该子会话跟踪的浏览器标签页/进程。
    - 隔离 cron 完成时会尽力在运行完全拆除之前关闭该 cron 会话跟踪的浏览器标签页/进程。
    - 隔离 cron 传递会在需要时等待后代 subagent 后续跟进，并抑制过时的父级确认文本，而不是宣布它。
    - subagent 完成传递优先使用最新可见的 assistant 文本；如果为空，则回退到已清理的最新 tool/toolResult 文本，而仅因超时工具调用的运行可能会折叠为简短的部分进度摘要。终态失败的运行会宣布失败状态，而不会回放捕获到的回复文本。
    - 清理失败不会掩盖真实的任务结果。

  </Accordion>
  <Accordion title="tasks flow list | show | cancel">
    ```bash
    openclaw tasks flow list [--status <status>] [--json]
    openclaw tasks flow show <lookup> [--json]
    openclaw tasks flow cancel <lookup>
    ```

    当你关心的是编排用的 Task Flow，而不是某一条单独的后台任务记录时，请使用这些命令。

  </Accordion>
</AccordionGroup>

## 聊天任务面板（`/tasks`）

在任意聊天会话中使用 `/tasks` 来查看与该会话关联的后台任务。面板会显示活跃和最近完成的任务，以及运行时、状态、时间信息和进度或错误详情。

当当前会话没有可见的关联任务时，`/tasks` 会回退到 agent 本地任务计数，因此你仍能获得概览，而不会泄露其他会话的详情。

如需完整的操作员账本，请使用 CLI：`openclaw tasks list`。

## 状态集成（任务压力）

`openclaw status` 包含一目了然的任务摘要：

```
Tasks: 3 queued · 2 running · 1 issues
```

该摘要报告：

- **active** — `queued` + `running` 的数量
- **failures** — `failed` + `timed_out` + `lost` 的数量
- **byRuntime** — 按 `acp`、`subagent`、`cron`、`cli` 的细分

`/status` 和 `session_status` 工具都使用一个具备清理感知的任务快照：优先显示活跃任务，隐藏过期的已完成行，并且只有在没有活跃工作时才显示最近的失败。这使状态卡片专注于当前最重要的内容。

## 存储与维护

### 任务存放位置

任务记录持久化在 SQLite 中，路径为：

```
$OPENCLAW_STATE_DIR/tasks/runs.sqlite
```

注册表在 gateway 启动时加载到内存，并将写入同步到 SQLite，以确保跨重启的持久性。
Gateway 通过使用 SQLite 默认的
autocheckpoint 阈值以及定期和关闭时的 `TRUNCATE` 检查点，来限制 SQLite 写前日志的大小。

### 自动维护

每 **60 秒** 运行一次 sweeper，并处理四件事：

<Steps>
  <Step title="协调修复">
    检查活跃任务是否仍有权威的运行时支撑。ACP/subagent 任务使用子会话状态，cron 任务使用活跃作业所有权，而由聊天支持的 CLI 任务使用拥有的运行上下文。如果该支撑状态消失超过 5 分钟，任务会被标记为 `lost`。
  </Step>
  <Step title="ACP 会话修复">
    关闭终态或孤立的、由父级拥有的一次性 ACP 会话，并且只有在不再存在活跃会话绑定时，才关闭过期终态或孤立的持久 ACP 会话。
  </Step>
  <Step title="清理时间戳设置">
    为终态任务设置 `cleanupAfter` 时间戳（endedAt + 7 天）。在保留期内，lost 任务在审计中仍作为警告出现；在 `cleanupAfter` 过期后，或清理元数据缺失时，它们会变成错误。
  </Step>
  <Step title="裁剪">
    删除超过其 `cleanupAfter` 日期的记录。
  </Step>
</Steps>

<Note>
**保留期：** 终态任务记录会保留 **7 天**，然后自动裁剪。无需配置。
</Note>

## 任务如何与其他系统关联

<AccordionGroup>
  <Accordion title="Tasks and Task Flow">
    [任务流](/automation/taskflow) 是位于后台任务之上的流程编排层。单个 flow 在其生命周期内可使用托管或镜像同步模式协调多个任务。使用 `openclaw tasks` 查看单个任务记录，使用 `openclaw tasks flow` 查看编排 flow。

    详情参见 [任务流](/automation/taskflow)。

  </Accordion>
  <Accordion title="Tasks and cron">
    cron job 的**定义**位于 `~/.openclaw/cron/jobs.json`；运行时执行状态位于其旁边的 `~/.openclaw/cron/jobs-state.json`。**每一次** cron 执行都会创建一条任务记录——包括主会话和隔离会话。主会话 cron 任务默认使用 `silent` 通知策略，因此只跟踪而不生成通知。

    详情参见 [Cron Jobs](/automation/cron-jobs)。

  </Accordion>
  <Accordion title="Tasks and heartbeat">
    heartbeat 运行是主会话轮次——它们不会创建任务记录。当任务完成时，它可以触发 heartbeat 唤醒，这样你就能及时看到结果。

    详情参见 [Heartbeat](/gateway/heartbeat)。

  </Accordion>
  <Accordion title="Tasks and sessions">
    任务可以引用 `childSessionKey`（工作运行的位置）和 `requesterSessionKey`（发起者）。会话是对话上下文；任务是在此之上的活动跟踪。
  </Accordion>
  <Accordion title="Tasks and agent runs">
    任务的 `runId` 链接到执行工作的 agent run。agent 生命周期事件（开始、结束、错误）会自动更新任务状态——你无需手动管理生命周期。
  </Accordion>
</AccordionGroup>

## 相关内容

- [Automation & Tasks](/automation) — 一览所有自动化机制
- [CLI: Tasks](/cli/tasks) — CLI 命令参考
- [Heartbeat](/gateway/heartbeat) — 周期性的主会话轮次
- [Scheduled Tasks](/automation/cron-jobs) — 调度后台工作
- [Task Flow](/automation/taskflow) — 位于 tasks 之上的流程编排
