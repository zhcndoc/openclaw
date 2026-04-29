---
summary: "命令队列设计，用于串行化传入的自动回复运行"
read_when:
  - 修改自动回复执行或并发
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

## 队列模式（按渠道）

传入消息可以引导当前运行、等待下一轮，或两者兼有：

- `steer`：立即注入当前运行（在下一个工具边界后取消待处理的工具调用）。如果不是流式模式，则回退为 followup。
- `followup`：在当前运行结束后，为下一次代理轮次入队。
- `collect`：将所有排队消息合并为 **单个** followup 轮次（默认）。如果消息面向不同的渠道/线程，则会分别清空，以保持路由。
- `steer-backlog`（又名 `steer+backlog`）：现在 steer，**并且**保留该消息用于后续 followup 轮次。
- `interrupt`（旧版）：中止该会话的活动运行，然后运行最新消息。
- `queue`（旧别名）：与 `steer` 相同。

Steer-backlog 表示你可以在被 steer 的运行之后再获得一次 followup 响应，因此流式界面看起来可能像重复。若你希望每条传入消息只对应一个响应，优先使用 `collect`/`steer`。
可发送独立命令 `/queue collect`（按会话）或设置 `messages.queue.byChannel.discord: "collect"`。

默认值（配置中未设置时）：

- 所有界面 → `collect`

可通过 `messages.queue` 全局或按渠道配置：

```json5
{
  messages: {
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
    },
  },
}
```

## 队列选项

这些选项适用于 `followup`、`collect` 和 `steer-backlog`（以及 `steer` 在回退为 followup 时）：

- `debounceMs`：在开始 followup 轮次前等待安静一段时间（防止“继续，继续”）。
- `cap`：每个会话允许排队的最大消息数。
- `drop`：溢出策略（`old`、`new`、`summarize`）。

Summarize 会保留一个简短的要点列表，记录被丢弃的消息，并将其作为合成的 followup 提示注入。
默认值：`debounceMs: 1000`、`cap: 20`、`drop: summarize`。

## 按会话覆盖

- 发送 `/queue <mode>` 作为独立命令，以便为当前会话保存该模式。
- 选项可以组合：`/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 会清除会话覆盖。

## 作用范围与保证

- 适用于所有使用网关回复管道的传入渠道上的自动回复代理运行（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）。
- 默认 lane（`main`）是进程级的，适用于传入 + main 心跳；设置 `agents.defaults.maxConcurrent` 可允许多个会话并行。
- 还可能存在额外的 lane（例如 `cron`、`cron-nested`、`nested`、`subagent`），这样后台作业可以并行运行而不会阻塞传入回复。隔离的 cron 代理轮次会占用一个 `cron` 槽位，而其内部代理执行则使用 `cron-nested`；两者都使用 `cron.maxConcurrentRuns`。共享的非 cron `nested` 流保持其各自的 lane 行为。这些分离的运行被跟踪为 [后台任务](/automation/tasks)。
- 按会话划分的 lane 保证同一时间只有一个代理运行会触及给定会话。
- 不依赖外部组件或后台工作线程；纯 TypeScript + promises。

## 故障排查

- 如果命令似乎卡住了，启用详细日志并查看 “queued for …ms” 行，以确认队列正在被清空。
- 如果你需要队列深度信息，启用详细日志并观察队列时间相关的日志行。
- 启用诊断后，若会话在 `diagnostics.stuckSessionWarnMs` 之后仍处于 `processing` 状态，会记录卡住会话警告。默认情况下，活跃的嵌入式运行、活跃的回复操作以及活跃的 lane 任务都只会给出警告；如果启动时的旧账本记录没有任何活跃会话工作，它可以释放受影响的会话 lane，从而让排队工作继续清空。

## 相关内容

- [会话管理](/concepts/session)
- [重试策略](/concepts/retry)
