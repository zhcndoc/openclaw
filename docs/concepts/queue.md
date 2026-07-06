---
summary: "自动回复队列模式、默认值和按会话覆盖"
read_when:
  - 更改自动回复执行或并发
  - 解释 /queue 模式或消息引导行为
title: "命令队列"
---

OpenClaw 通过一个轻量级的进程内队列对传入的自动回复运行（所有渠道）进行串行化处理，以防止多个代理运行相互冲突，同时仍允许在不同会话之间安全并行。

## 原因

- 自动回复运行可能成本很高（LLM 调用），并且当多条传入消息几乎同时到达时可能发生冲突。
- 串行化可以避免对共享资源的竞争（会话文件、日志、CLI stdin），并降低触发上游速率限制的可能性。

## 工作原理

- 一个感知 lane 的 FIFO 队列会以可配置的并发上限来处理每个 lane（未配置的 lane 默认是 1；`main` 默认为 4，`subagent` 默认为 8）。
- `runEmbeddedAgent` 按 **session key** 入队（lane `session:<key>`），以保证每个 session 同时只会有一个活跃运行。
- 然后每个 session 的运行会被排入一个 **全局 lane**（默认是 `main`），因此总体并行度会受 `agents.defaults.maxConcurrent` 限制。
- 当启用详细日志时，如果排队的运行在开始前等待了超过约 2 秒，便会输出一条简短提示。
- 输入中提示状态仍会在入队时立即触发（当频道支持时），因此在运行等待轮到它时，用户体验不会改变。

## 默认值

未设置时，所有传入渠道表面使用：

- `mode: "steer"`
- `debounceMs: 500`
- `cap: 20`
- `drop: "summarize"`

同轮转向是默认行为。运行过程中途到达的提示会在运行可接受转向时注入到当前活动运行中，因此不会启动第二个会话运行。如果当前活动运行无法接受转向，OpenClaw 会等待当前活动运行完成后再开始该提示。

## 队列模式

`/queue` 控制在会话已经有一个活跃运行时，普通传入消息应如何处理：

- `steer`：将消息注入到活跃运行中。OpenClaw 会在当前助手轮次执行完其工具调用之后、下一次 LLM 调用之前交付所有待处理的引导消息；Codex app-server 会接收一个批量的 `turn/steer`。如果运行未在主动流式输出，或者引导不可用，OpenClaw 会等到活跃运行结束后再开始处理提示。
- `followup`：不进行引导。在当前运行结束后，将每条消息排入稍后的代理轮次。
- `collect`：不进行引导。将排队消息合并为静默窗口之后的 **单个** 后续轮次。如果消息目标指向不同的渠道/线程，则会分别清空，以保留路由。
- `interrupt`：中止该会话的活跃运行，然后运行最新消息。

有关运行时特定的时序和依赖行为，请参见 [Steering queue](/concepts/queue-steering)。关于显式的 `/steer <message>` 命令，请参见 [Steer](/tools/steer)。

通过 `messages.queue` 全局配置或按渠道配置：

```json5
{
  messages: {
    queue: {
      mode: "steer",
      debounceMs: 500,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
    },
  },
}
```

## 队列选项

这些选项适用于队列投递。`debounceMs` 还会在 `steer` 模式下设置 Codex 的静默窗口：

- `debounceMs`：在清空排队的后续消息或收集批次之前的静默窗口；在 Codex 的 `steer` 模式下，是发送批量 `turn/steer` 之前的静默窗口。裸数字表示毫秒；`/queue` 选项接受 `ms`、`s`、`m`、`h` 和 `d` 这些单位。
- `cap`：每个会话中排队消息的最大数量。小于 `1` 的值会被忽略。
- `drop: "summarize"`（默认）：根据需要丢弃最早的排队条目，保留简短摘要，并将其作为合成的后续提示注入。
- `drop: "old"`：根据需要丢弃最早的排队条目，不保留摘要。
- `drop: "new"`：当队列已满时拒绝最新消息。

默认值：`debounceMs: 500`、`cap: 20`、`drop: summarize`。

## 引导与流式输出

当 channel streaming 为 `partial` 或 `block` 时，steering 可能表现为几段短的可见回复，而当前运行会到达运行时边界：

- `partial`：预览可能会提前完成，然后在接受 steering 后启动新的预览。
- `block`：草稿大小的分块也可能产生相同的连续外观。
- 在没有流式输出时，当运行时无法接受同轮 steering，steering 会回退为在当前运行结束后的 followup。

`steer` 不会中止正在进行中的 tools。如果最新消息应当中止当前运行，请使用 `/queue interrupt`。

## 优先级

对于模式选择，OpenClaw 的解析顺序是：

1. 内联或已存储的按会话 `/queue` 覆盖。
2. `messages.queue.byChannel.<channel>`。
3. `messages.queue.mode`。
4. 默认 `steer`。

对于选项，内联或已存储的 `/queue` 选项优先于配置。然后依次应用按频道区分的 debounce（`messages.queue.debounceMsByChannel`）、插件 debounce 默认值、全局 `messages.queue` 选项以及内置默认值。`cap` 和 `drop` 是全局/会话选项，不是按频道配置键。

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

客户端（包括 TUI）会转发运行中的提示，并让 Gateway 应用队列模式。Esc `/stop` 使用会话范围的中止，因此丢失本地句柄不会让仍在排队中的提示继续运行。

## 范围与保证

- 适用于所有使用网关回复管道的传入渠道上的自动回复代理运行（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）。
- 默认 lane（`main`）是进程级的，适用于传入 + main 心跳；设置 `agents.defaults.maxConcurrent` 可允许多个会话并行。
- 还可能存在额外的 lane（例如 `cron`、`cron-nested`、`nested`、`subagent`），这样后台作业可以并行运行而不会阻塞传入回复。隔离的 cron 代理轮次会占用一个 `cron` 槽位，而其内部代理执行则使用 `cron-nested`；两者都使用 `cron.maxConcurrentRuns`。共享的非 cron `nested` 流保持其各自的 lane 行为。这些分离的运行被跟踪为 [后台任务](/automation/tasks)。
- 按会话划分的 lane 保证同一时间只有一个代理运行会触及给定会话。
- 不依赖外部组件或后台工作线程；纯 TypeScript + promises。

## 故障排查

- 如果命令看起来卡住了，请启用详细日志，并查找 `"queued for ...ms"` 行以确认队列正在排空。
- Codex app-server 运行在接受一个回合后又停止输出进度时，会被 Codex 适配器中断，这样活动会话通道就可以释放，而不是等待外层运行超时。
- 启用诊断后，若会话在 `processing` 状态下停留超过 `diagnostics.stuckSessionWarnMs`，且没有观察到回复、工具、状态、阻塞或 ACP 进度，则会按当前活动类型进行分类：
  - 近期有进度日志的活动工作归类为 `session.long_running`。受管的静默模型调用也会保持为 `session.long_running`，直到 `diagnostics.stuckSessionAbortMs`，这样缓慢或非流式的提供方不会过早被报告为卡住。
  - 没有近期进度日志的活动工作归类为 `session.stalled`；受管模型调用、被阻塞的工具调用以及卡住的嵌入式运行会在达到或超过中止阈值时切换为 `session.stalled`。只要尚未达到长时间运行的条件，属于 ownerless 的过期模型/工具活动就不会被隐藏为长时间运行。
  - `session.stuck` 仅保留给可恢复的过期会话账本状态，包括空闲队列中的会话及其过期的 ownerless 模型/工具活动。
  - `session.stuck` 始终会触发恢复，从而释放受影响的会话通道。超过 `diagnostics.stuckSessionAbortMs` 的 `session.stalled` 分类（被阻塞的工具调用、卡住的模型调用或卡住的嵌入式运行）也可以触发主动中止恢复，因此这两种分类都能解除队列阻塞，而不只是 `session.stuck`。
  - 在会话保持不变时，重复的 `session.stuck` 和 `session.long_running` 警告日志行会指数退避；但无论这种退避如何，恢复尝试都会在每次心跳 tick 上运行。

## 相关内容

- [会话管理](/concepts/session)
- [转向队列](/concepts/queue-steering)
- [转向](/tools/steer)
- [重试策略](/concepts/retry)
