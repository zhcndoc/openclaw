---
summary: "运行时边界处的主动运行 steering 队列如何发送消息"
read_when:
  - 解释代理使用工具时 steer 的行为
  - 更改主动运行队列行为或运行时 steering 集成
  - 比较 steer、queue、collect 和 followup 模式
title: "Steering 队列"
---

当会话运行已经在流式输出时，如果此时有一条消息到达，OpenClaw 可以
将该消息发送到当前活跃的运行时，而不是为同一会话启动另一个运行。
这些公开模式在运行时层面是中立的；Pi 和原生 Codex
app-server harness 会以不同方式实现投递细节。

## 运行时边界

Steering 不会中断已经在运行的工具调用。Pi 会在模型边界检查
已排队的 steering 消息：

1. 助手请求工具调用。
2. Pi 执行当前助手消息的工具调用批次。
3. Pi 发出回合结束事件。
4. Pi 清空已排队的 steering 消息。
5. Pi 在下一次 LLM 调用之前，将这些消息作为用户消息追加进去。

这样可以让工具结果与请求它们的助手消息保持配对，
然后让下一次模型调用看到最新的用户输入。

原生 Codex app-server harness 暴露的是 `turn/steer`，而不是 Pi 的
内部 steering 队列。OpenClaw 在那里适配相同的模式：

- `steer` 会将已排队的消息在配置的静默窗口内批量处理，然后发送一条
  `turn/steer` 请求，并按到达顺序携带所有已收集的用户输入。
- `queue` 通过发送独立的 `turn/steer`
  请求来保持旧版的串行形态。
- `followup`、`collect`、`steer-backlog` 和 `interrupt` 保持为 OpenClaw 所有的
  队列行为，围绕活跃的 Codex 回合运作。

Codex review 和手动压缩回合会拒绝同回合 steering。当某个
运行时无法接受 steering 时，OpenClaw 会回退到 followup 队列中
该模式允许的行为。

## 模式

| 模式            | 主动运行行为                                                                                                             | 后续 followup 行为                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `steer`         | 在下一个运行时边界把所有已排队的 steering 消息一起注入。这是默认模式。                                                     | 仅在 steering 不可用时回退到 followup。                           |
| `queue`         | 旧版的一次一条 steering。Pi 在每个模型边界注入一条已排队消息；Codex 发送单独的 `turn/steer` 请求。 | 仅在 steering 不可用时回退到 followup。                           |
| `steer-backlog` | 与 `steer` 相同的主动运行 steering 行为。                                                                                | 也会将相同的消息保留到稍后的 followup 回合中。                              |
| `followup`      | 不 steering 当前运行。                                                                                              | 稍后运行排队消息。                                                         |
| `collect`       | 不 steering 当前运行。                                                                                              | 在去抖窗口之后，将兼容的已排队消息合并为稍后的一次回合。 |
| `interrupt`     | 中止当前运行，然后启动最新的消息。                                                                       | 无。                                                                               |

## 突发示例

如果在代理执行工具调用时有四个用户发送消息：

- `steer`：活跃运行时会在下一次模型决策之前按到达顺序接收全部四条消息。Pi 会在下一个模型边界清空它们；Codex 会将它们作为一条批处理的 `turn/steer` 接收。
- `queue`：旧版串行 steering。Pi 一次注入一条已排队消息；Codex 接收独立的 `turn/steer` 请求。
- `collect`：OpenClaw 等待活跃运行结束，然后在去抖窗口之后使用兼容的已排队消息创建一个 followup 回合。

## 作用范围

Steering 始终针对当前活跃的会话运行。它不会创建新会话，不会更改活跃运行的工具策略，也不会按发送者拆分消息。在多用户频道中，入站提示本来就包含发送者和路由上下文，因此下一次模型调用可以看到每条消息是谁发送的。

当你希望 OpenClaw 构建一个稍后的 followup 回合，并且能够合并兼容消息并保留 followup 队列丢弃策略时，请使用 `collect`。只有在你需要更旧的、一次一条的 steering 行为时，才使用 `queue`。

## 去抖

`messages.queue.debounceMs` 适用于 followup 投递，包括 `collect`、
`followup`、`steer-backlog`，以及在主动运行 steering 不可用时的 `steer` 回退。对于 Pi，active `steer` 本身不使用去抖计时器，因为
Pi 自然会把消息批量处理到下一个模型边界。对于原生
Codex harness，OpenClaw 会使用相同的 debounce 值作为静默窗口，
然后再发送批量的 `turn/steer`。

## 相关内容

- [命令队列](/concepts/queue)
- [消息](/concepts/messages)
- [代理循环](/concepts/agent-loop)
