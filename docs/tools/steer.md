---
summary: "在不更改队列模式的情况下引导一个正在运行的会话"
read_when:
  - 在代理已经在运行时使用 /steer 或 /tell
  - 比较 /steer 和 /queue steer
  - 决定是引导当前运行、子代理还是 ACP 会话
title: "Steer"
sidebarTitle: "Steer"
---

`/steer` 会向一个已经处于活动状态的运行发送指导。它适用于“在运行仍在工作时调整它”这种场景，而不是用于开始一个新的回合。

## 当前会话

使用顶层 `/steer` 来针对当前会话中的活动运行：

```text
/steer prefer the smaller patch and keep the tests focused
/tell summarize before making the next tool call
```

行为：

- 仅针对当前会话中的活动运行。
- 独立于会话的 `/queue` 模式。
- 当会话处于空闲状态时，不会启动新的运行。
- 当没有可引导的活动运行时，会返回警告。
- 使用活动运行时的 steering 路径，因此模型会在下一个受支持的运行时边界看到这些指导。

## Steer 与 queue

`/queue steer` 会改变当普通传入消息在运行活动时到达时的处理方式。`/steer <message>` 是一个显式命令，它会尝试在下一个受支持的运行时边界将该命令的消息注入到活动运行中，而不管已存储的 `/queue` 设置如何。

使用：

- 当你想立即引导当前活动运行时，使用 `/steer <message>`。
- 当你希望未来普通消息默认引导活动运行时，使用 `/queue steer`。
- 当新消息应等待稍后回合而不是引导当前活动运行时，使用 `/queue collect` 或 `/queue followup`。

关于队列模式和回退行为，参见 [Command queue](/concepts/queue) 和 [Steering queue](/concepts/queue-steering)。

## 子代理

当目标是子运行时，使用 `/subagents steer`：

```text
/subagents steer 2 focus only on the API surface
```

顶层 `/steer` 不会按 id 或列表索引选择子代理。它始终针对当前会话的活动运行。有关子代理 id、标签和控制命令，请参见 [Sub-agents](/tools/subagents)。

## ACP 会话

当目标是 ACP harness 会话时，使用 `/acp steer`：

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

有关 ACP 会话选择和运行时行为，请参见 [ACP agents](/tools/acp-agents)。

## 相关内容

- [Slash commands](/tools/slash-commands)
- [Command queue](/concepts/queue)
- [Steering queue](/concepts/queue-steering)
- [Sub-agents](/tools/subagents)
