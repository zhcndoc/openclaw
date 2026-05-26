---
summary: "自动回复队列模式、默认值和按会话覆盖"
read_when:
  - 更改自动回复执行或并发
  - 解释 /queue 模式或消息引导行为
title: "命令队列"
---

我们通过一个极小的进程内队列来串行化传入的自动回复运行（所有渠道），以防止多个代理运行相互冲突，同时仍允许跨会话的安全并行。

## 原因

- 自动回复运行可能成本很高（LLM 调用），并且当多条传入消息几乎同时到达时可能发生冲突。
- 串行化可以避免对共享资源的竞争（会话文件、日志、CLI stdin），并降低触发上游速率限制的可能性。

## 工作原理

- 一个感知 lane 的 FIFO 队列会以可配置的并发上限来清空每个 lane（未配置的 lane 默认是 1；main 默认 4，subagent 默认 8）。
- `runEmbeddedPiAgent` 按 **会话键** 入队（lane `session:<key>`），以保证每个会话同一时间只有一个活跃运行。
- 然后每个会话运行会再进入一个 **全局 lane**（默认 `main`），因此整体并发由 `agents.defaults.maxConcurrent` 限制。
- 启用详细日志时，如果排队等待超过约 2 秒才开始，队列中的运行会输出一条简短提示。
- 当输入指示器受支持时，它仍然会在入队后立即触发，因此在等待轮到我们时，用户体验不会改变。

## 默认值

未设置时，所有传入渠道表面使用：

- `mode: "steer"`
- `debounceMs: 500`
- `cap: 20`
- `drop: "summarize"`

同轮引导是默认行为。若某个提示在运行中途到达，并且该运行可以接受引导，那么它会被注入到当前运行时中，因此不会启动第二次会话运行。如果当前运行无法接受引导，OpenClaw 会等待当前运行结束后再开始处理该提示。

## 队列模式

`/queue` 控制当会话已经有一个活跃运行时，正常的入站消息会如何处理：

- `steer`: 将消息注入到活跃运行时。Pi 会在当前助手轮次完成其工具调用执行之后、下一次 LLM 调用之前，传递所有待处理的引导消息；Codex app-server 会收到一个批量的 `turn/steer`。如果运行并未在主动流式输出，或者不可用引导，OpenClaw 会等待当前运行结束后再开始处理该提示。
- `followup`: 不进行引导。将每条消息入队，待当前运行结束后再进行后续的代理轮次。
- `collect`: 不进行引导。将队列中的消息合并为在静默窗口之后的 **单个** 后续轮次。如果消息针对不同的渠道/线程，则会分别清空以保持路由不变。
- `interrupt`: 中止该会话的活跃运行，然后运行最新消息。

有关运行时特定的时序和依赖行为，请参见
[Steering queue](/concepts/queue-steering)。有关显式的 `/steer <message>`
命令，请参见 [Steer](/tools/steer)。

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

选项适用于已排队的传递。`debounceMs` 在 `steer` 模式下也会设置 Codex 引导的静默窗口：

- `debounceMs`: 在清空排队的后续消息或 collect 批次之前的静默窗口；在 Codex 的 `steer` 模式下，则是在发送批量 `turn/steer` 之前的静默窗口。裸数字表示毫秒；`/queue` 选项接受 `ms`、`s`、`m`、`h` 和 `d` 单位。
- `cap`: 每个会话的最大排队消息数。小于 `1` 的值会被忽略。
- `drop: "summarize"`：默认值。按需丢弃最旧的队列条目，保留简短摘要，并将其作为合成的后续提示注入。
- `drop: "old"`：按需丢弃最旧的队列条目，不保留摘要。
- `drop: "new"`：当队列已满时拒绝最新消息。

默认值：`debounceMs: 500`、`cap: 20`、`drop: summarize`。

## 引导与流式输出

当渠道流式输出为 `partial` 或 `block` 时，引导可能会表现为在活跃运行到达运行时边界之前出现若干条较短的可见回复：

- `partial`: 预览可能会提前完成，然后在引导被接受后启动新的预览。
- `block`: 草稿大小的块也可能产生相同的顺序外观。
- 在没有流式输出时，当运行时无法接受同轮引导，引导会回退为活跃运行结束后的后续轮次。

`steer` 不会中止正在执行中的工具。若最新消息应当中止当前运行，请使用 `/queue interrupt`。

## 优先级

对于模式选择，OpenClaw 的解析顺序是：

1. 内联或已存储的按会话 `/queue` 覆盖。
2. `messages.queue.byChannel.<channel>`。
3. `messages.queue.mode`。
4. 默认 `steer`。

对于选项，内联或已存储的 `/queue` 选项优先于配置。然后应用按渠道的 debounce（`messages.queue.debounceMsByChannel`）、插件 debounce 默认值、全局 `messages.queue` 选项以及内置默认值。`cap` 和 `drop` 是全局/会话选项，而不是按渠道配置键。

## 按会话覆盖

- 发送 `/queue <steer|followup|collect|interrupt>` 作为独立命令，以存储当前会话的队列模式。
- 选项可以组合：`/queue collect debounce:0.5s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 会清除会话覆盖。

## 作用范围与保证

- 适用于所有使用网关回复管道的传入渠道上的自动回复代理运行（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）。
- 默认 lane（`main`）是进程级的，适用于传入 + main 心跳；设置 `agents.defaults.maxConcurrent` 可允许多个会话并行。
- 还可能存在额外的 lane（例如 `cron`、`cron-nested`、`nested`、`subagent`），这样后台作业可以并行运行而不会阻塞传入回复。隔离的 cron 代理轮次会占用一个 `cron` 槽位，而其内部代理执行则使用 `cron-nested`；两者都使用 `cron.maxConcurrentRuns`。共享的非 cron `nested` 流保持其各自的 lane 行为。这些分离的运行被跟踪为 [后台任务](/automation/tasks)。
- 按会话划分的 lane 保证同一时间只有一个代理运行会触及给定会话。
- 不依赖外部组件或后台工作线程；纯 TypeScript + promises。

## 故障排查

- 如果命令似乎卡住了，请启用详细日志并查找 "queued for ...ms" 行，以确认队列正在排空。
- 如果你需要队列深度，请启用详细日志并查看队列计时行。
- 接受一个 turn 然后停止输出进度的 Codex app-server 运行，会被 Codex 适配器中断，从而让活跃会话 lane 释放，而不是一直等到外层运行超时。
- 启用诊断时，若会话在 `processing` 状态下超过 `diagnostics.stuckSessionWarnMs`，且没有观察到回复、工具、状态、阻塞或 ACP 进度，则会按当前活动进行分类。活跃工作会记录为 `session.long_running`；没有近期进度的活跃工作会记录为 `session.stalled`；`session.stuck` 仅保留给没有活跃工作的陈旧会话账务处理，且只有该路径才能释放受影响的会话 lane，从而让排队工作继续排空。只要会话保持不变，重复的 `session.stuck` 诊断就会退避。

## 相关内容

- [会话管理](/concepts/session)
- [Steering queue](/concepts/queue-steering)
- [Steer](/tools/steer)
- [重试策略](/concepts/retry)
