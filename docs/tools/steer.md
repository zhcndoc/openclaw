---
summary: "在不更改队列模式的情况下引导一个正在运行的会话"
read_when:
  - "使用 /steer 或 /tell 时，且已有代理正在运行"
  - "比较 /steer 与 /queue 模式"
  - "决定是引导当前运行还是一个 ACP 会话"
title: "引导"
sidebarTitle: "引导"
---

`/steer` 首先会尝试向一个已经处于活动状态的运行发送指导。它适用于“在当前运行仍在工作时调整它”这类场景。如果当前运行时无法接受 steering，OpenClaw 会将该消息作为普通提示发送，而不是丢弃它。

`/tell` 是 `/steer` 的别名。这两个名称在本页的任何地方都可以互换。

## <a id="current-session"></a> 当前会话

使用顶层 `/steer` 来针对当前会话中的活动运行：

```text
/steer prefer the smaller patch and keep the tests focused
/tell summarize before making the next tool call
```

行为：

- 仅针对当前会话中的活动运行。
- 独立于会话的 `/queue` 模式。
- 当会话处于空闲状态，或活动运行无法接受 steering 时，会使用相同的消息开启一次正常轮次。
- 使用活动运行时的 steering 路径，因此模型会在下一个受支持的运行时边界看到该指导。

## <a id="steer-vs-queue"></a> Steer 与 queue

`/queue steer` 会让普通的传入消息在活动运行仍在进行时尝试引导它们。`/steer <message>` 是一个显式命令，它会尝试在下一个受支持的运行时边界将该命令的消息注入活动运行，而不受已保存的 `/queue` 设置影响。当无法进行该注入时，会移除命令前缀，并将 `<message>` 作为普通提示继续处理。

显式的 `/steer`（以及 `/tell`）命令由 Gateway 支持。在 `openclaw chat` 或 `openclaw tui --local` 中，选择 `/queue steer` 并将引导内容作为普通消息发送；嵌入式运行时会应用相同的引导策略，而不会转发 Gateway 命令。

使用方式：

- 当你现在就想引导活动运行时，使用 `/steer <message>`。
- 当你希望未来的普通消息默认引导活动运行时，使用 `/queue steer`。
- 当你希望未来的普通消息等待后续轮次，而不是引导活动运行时，使用 `/queue collect` 或 `/queue followup`。
- 当最新消息应替换活动运行，而不是引导它时，使用 `/queue interrupt`。

有关 queue 模式和 steering 边界，请参见 [Command queue](/concepts/queue) 和 [Steering queue](/concepts/queue-steering)。

## <a id="sub-agents"></a> 子代理

顶级 `/steer` 针对当前会话的活动运行。子代理向其 parent/requester 会话报告； `/subagents` 仅用于可见性。

## <a id="acp-sessions"></a> ACP 会话

当目标是 ACP harness 会话时，使用 `/acp steer`：

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

ACP harness会话无法接受中途输入。 `/acp steer` 将指令排队并在活动回合结束后运行它；首先使用 `/acp cancel` 停止正在进行的工作。请参见 [ACP 控制 ](/tools/acp-agents/controls#acp-controls)。

有关 ACP 会话选择和运行时行为，请参见 [ACP agents](/tools/acp-agents)。

## <a id="related"></a> 相关内容

- [斜杠命令](/tools/slash-commands)
- [命令队列](/concepts/queue)
- [转向队列](/concepts/queue-steering)
- [子代理](/tools/subagents)
