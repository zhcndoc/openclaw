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
- 当输入指示器受支持时，它仍会在入队后立即触发，因此在等待轮到我们时，用户体验不会改变。

## 默认值

未设置时，所有传入渠道表面使用：

- `mode: "steer"`
- `debounceMs: 500`
- `cap: 20`
- `drop: "summarize"`

`steer` 是默认值，因为它能在不启动第二个会话运行的情况下，让当前模型轮次保持响应。它会在下一个模型边界之前清空所有已到达的引导消息。如果当前运行无法接受引导，OpenClaw 会回退到一个 followup 队列条目。

## 队列模式

传入消息可以引导当前运行、等待下一轮，或两者兼有：

- `steer`: 将引导消息排入当前活跃运行时。Pi 会在**当前助手轮次完成其工具调用执行之后**、下一次 LLM 调用之前，投递所有待处理的引导消息；Codex app-server 会收到一个批量的 `turn/steer`。如果运行当前没有处于活跃流式输出状态，或者引导不可用，OpenClaw 会回退到一个 followup 队列条目。
- `queue` (legacy): 旧的一次一条引导方式。Pi 会在每个模型边界投递一条排队的引导消息；Codex app-server 会收到单独的 `turn/steer` 请求。除非你需要之前那种串行化行为，否则优先使用 `steer`。
- `followup`: 将每条消息排队，等待当前运行结束后作为后续代理轮次处理。
- `collect`: 在静默窗口之后，将排队消息合并为**单个**后续轮次。如果消息面向不同的渠道/线程，它们会分别清空，以保留路由。
- `steer-backlog` (aka `steer+backlog`): 立即引导，**并且**为后续轮次保留同一条消息。
- `interrupt` (legacy): 中止该会话的当前活跃运行，然后运行最新消息。

Steer-backlog 表示你可以在被 steer 的运行之后再收到一个 followup 回复，因此流式界面看起来可能像重复消息。如果你希望每条传入消息只对应一个回复，请优先使用 `collect`/`steer`。

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

选项适用于 `followup`、`collect` 和 `steer-backlog`（以及当引导回退为 followup 时的 `steer` 或旧版 `queue`）：

- `debounceMs`: 在清空排队的 followup 之前的静默窗口。裸数字表示毫秒；`/queue` 选项接受 `ms`、`s`、`m`、`h` 和 `d` 单位。
- `cap`: 每个会话的最大排队消息数。小于 `1` 的值会被忽略。
- `drop: "summarize"`: 默认值。按需丢弃最旧的排队条目，保留紧凑摘要，并将其作为一个合成的 followup 提示注入。
- `drop: "old"`: 按需丢弃最旧的排队条目，不保留摘要。
- `drop: "new"`: 当队列已满时拒绝最新消息。

默认值：`debounceMs: 500`、`cap: 20`、`drop: summarize`。

## 优先级

对于模式选择，OpenClaw 的解析顺序是：

1. 内联或已存储的按会话 `/queue` 覆盖。
2. `messages.queue.byChannel.<channel>`。
3. `messages.queue.mode`。
4. 默认 `steer`。

对于选项，内联或已存储的 `/queue` 选项优先于配置。然后应用按渠道的 debounce（`messages.queue.debounceMsByChannel`）、插件 debounce 默认值、全局 `messages.queue` 选项以及内置默认值。`cap` 和 `drop` 是全局/会话选项，而不是按渠道配置键。

## 按会话覆盖

- 发送 `/queue <mode>` 作为独立命令，可将该模式存储为当前会话的设置。
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
- [Retry policy](/concepts/retry)
