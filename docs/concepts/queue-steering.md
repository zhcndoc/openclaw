---
summary: "运行时边界处的主动运行 steering 队列如何发送消息"
read_when:
  - 解释代理在使用工具时 steer 的行为
  - 更改 active-run 队列行为或运行时 steering 集成
  - 比较 steering 与 followup、collect 和 interrupt 队列模式
title: "Steering 队列"
---

当会话运行已经在流式输出时，如果此时有普通提示到达，OpenClaw
默认会尝试在队列模式为 `steer` 时把该提示发送到活跃运行时。这个默认行为
不需要任何配置项，也不需要任何队列指令。OpenClaw 和原生 Codex app-server harness 在投递
细节上的实现方式不同。

## 运行时边界

Steering 不会中断已经运行中的工具调用。OpenClaw 会在模型边界检查
已排队的 steering 消息：

1. 助手请求工具调用。
2. OpenClaw 执行当前助手消息的工具调用批次。
3. OpenClaw 发出回合结束事件。
4. OpenClaw 清空已排队的 steering 消息。
5. OpenClaw 在下一次 LLM 调用之前，将这些消息作为用户消息附加进去。

这样可以让工具结果与请求它们的助手消息保持配对，
然后让下一次模型调用看到最新的用户输入。

原生 Codex app-server harness 暴露的是 `turn/steer`，而不是 OpenClaw 运行时的
内部 steering 队列。OpenClaw 会在配置的静默窗口内批量处理已排队的提示，
然后以到达顺序将收集到的所有用户输入一次性发送为一个 `turn/steer` 请求。

Codex review 和手动压缩回合会拒绝同回合 steering。当
运行时无法在 `steer` 模式下接受 steering 时，OpenClaw 会等待活跃
运行结束后再开始处理该提示。

本页说明的是当模式为 `steer` 时，普通入站消息的队列模式 steering。如果模式
是 `followup` 或 `collect`，普通消息不会进入这个 steering 路径；它们会等待活跃运行
结束。关于显式的 `/steer <message>` 命令，请参见 [Steer](/tools/steer)。

## 模式

| Mode        | 活跃运行行为                                         | 后续行为                                                                            |
| ----------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `steer`     | 在可以的时候将提示 steer 到活跃运行时。             | 如果 steering 不可用，则等待活跃运行结束。                                          |
| `followup`  | 不 steer。                                           | 在活跃运行结束后稍后运行已排队的消息。                                               |
| `collect`   | 不 steer。                                           | 在去抖窗口之后，将兼容的已排队消息合并为一次后续回合。                                 |
| `interrupt` | 中止活跃运行，而不是 steering 它。                  | 在中止后开始处理最新消息。                                                           |

## 突发示例

如果在代理执行工具调用时有四个用户发送消息：

- 默认行为下，活跃运行会在下一次模型决策之前按到达顺序接收全部四条消息。OpenClaw 会在下一次模型
  边界清空它们；Codex 会将它们作为一个批量的 `turn/steer` 接收。
- 使用 `/queue collect` 时，OpenClaw 不会 steer。它会等到活跃运行
  结束，然后在去抖窗口之后用兼容的已排队消息创建一个后续回合。
- 使用 `/queue interrupt` 时，OpenClaw 会中止活跃运行，并改为开始处理最新
  消息，而不是 steering 它。

## 作用范围

Steering 始终针对当前活跃的会话运行。它不会创建新会话，不会更改活跃运行的工具策略，也不会按发送者拆分消息。在多用户频道中，入站提示本来就包含发送者和路由上下文，因此下一次模型调用可以看到每条消息是谁发送的。

当你希望消息默认排队而不是 steering 活跃运行时，请使用 `followup` 或 `collect`。当最新提示应该
替换活跃运行时，请使用 `interrupt`。

## 去抖

`messages.queue.debounceMs` 适用于已排队的 `followup` 和 `collect` 投递。
在原生 Codex harness 的 `steer` 模式下，它也会设置发送批量 `turn/steer` 之前的静默窗口。
对于 OpenClaw，主动 steering 本身不使用
去抖计时器，因为 OpenClaw 会自然地把消息批量到下一次模型
边界。

## 相关内容

- [Command queue](/concepts/queue)
- [Steer](/tools/steer)
- [Messages](/concepts/messages)
- [Agent loop](/concepts/agent-loop)
