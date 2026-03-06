---
summary: "指令队列设计，实现入站自动回复执行的串行化"
read_when:
  - 更改自动回复执行或并发设置时
title: "指令队列"
---

# 指令队列 (2026-01-16)

我们通过一个小型的进程内队列对所有渠道的入站自动回复运行进行串行化，以防止多个代理运行冲突，同时仍允许跨会话的安全并行执行。

## 原因

- 自动回复运行可能代价高昂（调用大型语言模型），且当多个入站消息接近同时到达时，可能会发生冲突。
- 串行化避免了对共享资源（会话文件、日志、CLI 标准输入）的竞争，并降低了上游速率限制的风险。

## 工作原理

- 一个支持通道感知的先进先出（FIFO）队列以可配置的并发上限（未配置的通道默认为1；主通道默认4，子代理默认8）处理每个通道。
- `runEmbeddedPiAgent` 通过**会话键**（通道为 `session:<key>`）入队，保证每个会话中只有一个活动运行。
- 每个会话的运行接着被加入到一个**全局通道**（默认为 `main`），因此总体并行度受 `agents.defaults.maxConcurrent` 限制。
- 启用详细日志时，若排队等待超过约2秒，队列中的运行将发出简短通知。
- 输入指示符会在入队时立即触发（若渠道支持），保证用户体验不受排队影响。

## 队列模式（按渠道区分）

入站消息可以指挥当前运行、等待下一轮，或同时两者：

- `steer`：立即注入当前运行（会在下一工具边界后取消待处理的工具调用）。如不支持流式，退回到跟进。
- `followup`：当前运行结束后排队等待下一次代理轮次。
- `collect`：将所有排队消息合并为**单次**跟进轮次（默认）。若消息目标渠道/线程不同，则单独处理以确保路由正确。
- `steer-backlog`（又名 `steer+backlog`）：即时指挥当前运行**且**保留消息以跟进。
- `interrupt`（旧版）：中止该会话的活动运行，然后执行最新消息。
- `queue`（旧版别名）：等同于 `steer`。

steer-backlog 意味着你可在指挥运行后得到跟进响应，因此流式界面可能看起来有重复。若希望每条入站消息只产生一次响应，建议使用 `collect` 或 `steer`。
键入 `/queue collect` 作为独立命令（针对单会话）或设置 `messages.queue.byChannel.discord: "collect"`。

默认（配置未设置时）：

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

选项适用于 `followup`、`collect` 和 `steer-backlog`（`steer` 退回到跟进时亦适用）：

- `debounceMs`：在开始跟进轮次前等待静默时间（防止连续“继续，继续”）。
- `cap`：每个会话最大排队消息数。
- `drop`：溢出策略（`old`、`new`、`summarize`）。

`summarize` 会保留被丢弃消息的短列表，并作为合成跟进提示注入。
默认值：`debounceMs: 1000`，`cap: 20`，`drop: summarize`。

## 单会话覆盖

- 发送 `/queue <mode>` 作为独立命令，存储当前会话的模式。
- 选项可组合使用，如 `/queue collect debounce:2s cap:25 drop:summarize`。
- `/queue default` 或 `/queue reset` 清除会话覆盖设置。

## 范围与保证

- 适用于所有使用网关回复管道的入站自动回复代理运行（WhatsApp 网页，Telegram，Slack，Discord，Signal，iMessage，网页聊天等）。
- 默认通道（`main`）为进程范围，处理入站及主心跳；可通过设置 `agents.defaults.maxConcurrent` 允许多个会话并行。
- 可能存在额外通道（如 `cron`、`subagent`），使后台作业可并行运行且不阻塞入站回复。
- 单会话通道保证同一时间只有一个代理运行访问该会话。
- 无外部依赖或后台工作线程；纯 TypeScript + promise 实现。

## 故障排查

- 如果命令似乎卡住，开启详细日志，查找“queued for …ms”日志确认队列是否正常消化。
- 如需查看队列深度，开启详细日志并留意队列时序日志。
