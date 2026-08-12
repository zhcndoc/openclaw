---
summary: "自动回复队列模式、默认值和按会话覆盖"
read_when:
  - 更改自动回复执行或并发
  - 解释 /queue 模式或消息引导行为
title: "命令队列"
---

OpenClaw 通过一个轻量级的进程内队列对传入的自动回复运行（所有渠道）进行串行化处理，以防止多个代理运行相互冲突，同时仍允许在不同会话之间安全并行。

## 原因

- 自动回复运行可能成本较高（LLM 调用），并且当多个传入消息几乎同时到达时可能发生冲突。
- 串行化可以避免对共享资源（会话状态、日志、CLI stdin）的竞争，并降低触发上游速率限制的可能性。

## 工作原理

- 一个感知 lane 的 FIFO 队列会以可配置的并发上限清空每个 lane（未配置的 lane 默认值为 1；`main` 使用 `min(16, max(8, available CPU parallelism))`，而 `subagent` 默认为 8）。
- `runEmbeddedAgent` 按 **会话键** 入队（lane `session:<key>`），以确保每个会话同时只运行一个任务。
- 然后每个会话运行都会进入一个 **全局 lane**（默认是 `main`），从而将总体并行度限制为 `agents.defaults.maxConcurrent`。
- 启用详细日志时，如果排队的运行在开始前等待超过约 2 秒，会输出一条简短提示。
- 在入队时，输入中指示器仍会立即触发（当通道支持时），因此在运行等待轮到它时，用户体验不会改变。

## 默认值

未设置时，所有传入渠道表面使用：

- `mode: "steer"`
- 内置的 500ms 防抖，用于 steer、followup 和 collect 批处理
- `cap: 20`
- `drop: "summarize"`

同轮转向是默认行为。运行过程中途到达的提示会在运行可接受转向时注入到当前活动运行中，因此不会启动第二个会话运行。如果当前活动运行无法接受转向，OpenClaw 会等待当前活动运行完成后再开始该提示。

## 队列模式

`/queue` 控制在会话已经有一个活跃运行时，普通传入消息应如何处理：

- `steer`：将消息注入活跃运行时。OpenClaw 会让已在运行的工具完成，跳过尚未启动的顺序调用，并确保 steer 消息在下一次工具启动或模型决策前可见。并行调用会在其批次通过启动检查点后继续执行。Codex app-server 会接收一条批量的 `turn/steer`，并在下一个模型边界应用它。如果运行当前未处于主动流式传输状态，或 steer 不可用，OpenClaw 会等待活跃运行结束后再启动该提示。
- `followup`：不进行 steer。将每条消息排队，待当前运行结束后再开启一次后续代理轮次。
- `collect`：不进行 steer。将排队的消息合并为一次**单独的**后续轮次，并在静默窗口结束后执行。如果消息针对不同的渠道／线程，则会分别处理，以保留路由信息。
- `interrupt`：中止该会话的活跃运行，然后运行最新消息。

有关运行时特定的时序和依赖行为，请参见 [Steering queue](/concepts/queue-steering)。关于显式的 `/steer <message>` 命令，请参见 [Steer](/tools/steer)。

通过 `messages.queue` 全局配置或按渠道配置：

```json5
{
  messages: {
    queue: {
      mode: "steer",
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
      debounceMsByChannel: { discord: 1000 },
    },
  },
}
```

## 队列选项

每个会话的 `/queue` 选项适用于排队传送。`debounce` 选项还会设置 `steer` 模式下的 Codex 引导静默窗口：

- `debounce`：在排空排队的后续消息或收集批次之前的静默窗口；在 Codex `steer` 模式下，是发送批量 `turn/steer` 之前的静默窗口。纯数字表示毫秒；接受的单位包括 `ms`、`s`、`m`、`h` 和 `d`。
- `cap`：每个会话排队消息的最大数量。小于 `1` 的值会被忽略。
- `drop: "summarize"`（默认）：根据需要丢弃最早的排队条目，保留简要摘要，并将其作为合成的后续提示注入。
- `drop: "old"`：根据需要丢弃最早的排队条目，不保留摘要。
- `drop: "new"`：当队列已满时，拒绝最新消息。

队列使用内置的 500ms 防抖。`cap` 默认为 `20`，`drop` 默认为 `summarize`。

## 引导与流式输出

当 channel streaming 为 `partial` 或 `block` 时，steering 可能表现为几段短的可见回复，而当前运行会到达运行时边界：

- `partial`：预览可能会提前完成，然后在接受 steering 后启动新的预览。
- `block`：草稿大小的分块也可能产生相同的连续外观。
- 在没有流式输出时，当运行时无法接受同轮 steering，steering 会回退为在当前运行结束后的后续消息。

`steer` 不会中止正在进行的工具调用。被跳过的 OpenClaw 工具调用会收到成对的合成错误结果，以确保记录保持有效。当最新消息应中止当前运行时，请使用 `/queue interrupt`。

## 优先级

对于模式选择，OpenClaw 的解析顺序是：

1. 内联或已存储的按会话 `/queue` 覆盖。
2. `messages.queue.byChannel.<channel>`。
3. `messages.queue.mode`。
4. 默认 `steer`。

对于选项，内联或已存储的 `/queue` 选项优先于配置。然后依次应用按频道的防抖设置（`messages.queue.debounceMsByChannel`）、插件防抖默认值和内置默认值。`cap` 和 `drop` 是全局／会话选项，而不是按频道的配置键。

## 按会话覆盖

- 发送 `/queue <steer|followup|collect|interrupt>` 作为独立命令，以存储当前会话的队列模式。
- 选项可以组合：`/queue collect debounce:0.5s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 会清除会话覆盖。

## 排队轮次取消

当一个提示停留在 followup/collect 队列中时（例如在另一个轮次处于活动状态时到达的 TUI 或 Webchat `chat.send`），Gateway 会为该客户端的 `runId` 保留一个**由 Gateway 拥有的取消标识**，直到排队内容开始运行或被丢弃。该标识会随着折叠进溢出摘要的内容一并传递。

- 如果请求方已获授权（与活动运行相同的所有权规则），`chat.abort` 携带特定 `runId` 时，会在该轮次仍处于排队状态时取消它。
- 不带 `runId` 的会话级 `chat.abort` 会先取消**已获授权的排队轮次**，然后再中止已获授权的活动运行。这个顺序可以防止队列清空时把工作推进到一个半停止的会话中。
- 不经过逐请求方检查而清空整个会话队列，并不是多所有者会话的停止路径。
- 排队等待不会在 `sessions.list` 中被投影为活动代理运行，也不适用活动运行的超时语义；只有活动阶段才适用。

由 Gateway 支持的客户端（包括 `openclaw tui`）会转发运行中的提示，并让 Gateway 应用队列模式。Esc/`/stop` 使用会话范围的 abort，因此丢失本地句柄也不会让仍处于队列中的提示继续运行。

`openclaw chat` 和 `openclaw tui --local` 在嵌入式运行时中应用相同的四种模式。本地 `steer` 会在该运行时接受 steering 时注入到一个活动的嵌入式运行中，否则会变成 followup；`followup` 和 `collect` 仍然是本地待处理工作；`interrupt` 会在启动最新消息之前中止活动的本地运行。显式的 `/steer <message>` 命令不是本地模式命令。

## 范围与保证

- 适用于通过网关回复管线的所有入站渠道中的自动回复代理运行（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）。
- 默认通道（`main`）在整个进程范围内用于入站 + 主心跳；设置 `agents.defaults.maxConcurrent` 可允许多个会话并行。
- 可能还存在额外通道（例如 `cron`、`cron-nested`、`nested`、`subagent`），因此后台任务可以并行运行而不会阻塞入站回复。隔离的 cron 代理轮次会占用一个 `cron` 槽位，而其内部代理执行则使用 `cron-nested`。共享的非 cron `nested` 流程保持其自身的通道行为。这些分离的运行会被跟踪为[后台任务](/automation/tasks)。
- 按会话划分的通道可保证同一时间只有一个代理运行会接触到给定会话。
- 不依赖外部库或后台工作线程；仅使用纯 TypeScript + promises。

## 故障排查

- 如果命令看起来卡住了，请启用详细日志，并查找 “queued for ...ms” 行，以确认队列正在被清空。
- Codex app-server 运行在接受一个 turn 之后便停止输出进度时，会被 Codex adapter 中断，这样当前会话 lane 就能释放，而不是一直等待外层运行超时。
- 当启用诊断时，对于那些在内置警告阈值之后仍停留在 `processing` 状态、且未观察到回复、工具、状态、阻塞或 ACP 进度的会话，会根据当前活动分类：
  - 有近期进度日志的活跃工作归类为 `session.long_running`。有所有权的静默模型调用也会保持为 `session.long_running`，直到内置中止阈值，因此不会过早将缓慢或非流式提供方报告为卡住。
  - 没有近期进度日志的活跃工作归类为 `session.stalled`；有所有权的模型调用、被阻塞的工具调用以及卡住的嵌入式运行会在中止阈值处或之后切换为 `session.stalled`。无所有者的过期模型／工具活动只要尚未处于 long-running，就不会被隐藏。
  - `session.stuck` 专用于可恢复的过期会话账本状态，包括处于空闲队列中的、且存在过期无所有者模型／工具活动的会话。
  - `session.stuck` 总是会触发恢复，并可释放受影响的会话 lane。超过中止阈值的 `session.stalled` 分类（被阻塞的工具调用、卡住的模型调用或卡住的嵌入式运行）也可能触发主动中止恢复，因此这两种分类都能让队列恢复，而不只是 `session.stuck`。
  - 当会话保持不变时，重复出现的 `session.stuck` 和 `session.long_running` 警告日志行会指数退避；但无论该退避如何，恢复尝试仍会在每个 heartbeat tick 上运行。

## 相关内容

- [会话管理](/concepts/session)
- [转向队列](/concepts/queue-steering)
- [转向](/tools/steer)
- [重试策略](/concepts/retry)
