---
summary: "在不堵塞共享模型和工具容量的情况下运行并行专长代理"
title: "并行专长通道"
sidebarTitle: "专长通道"
read_when:
  - "你将群聊路由到专用代理时"
  - "你希望并行工作而不会被某个长任务阻塞所有聊天时"
  - "你正在设计多代理运维设置时"
status: active
---

并行专长通道使一个 Gateway 能够将不同的聊天或房间路由到不同的代理，同时保持用户体验的流畅。应将并行性视为稀缺资源的设计问题，而不仅仅是“更多代理”。

## <a id="first-principles"></a> 第一原则

只有当专长通道减少了真实瓶颈的争用时，它才会提升吞吐量：

- **会话锁**：同一时间只应有一个运行修改给定会话。
- **全局模型容量**：所有可见的聊天运行仍然共享提供方限制。
- **工具容量**：shell、浏览器、网络和仓库工作可能比模型轮次本身更慢。
- **上下文预算**：较长的对话记录会让未来每一轮更慢且更不聚焦。
- **所有权歧义**：多个代理重复做同一件事会浪费容量。

OpenClaw 已经通过 [command queue](/concepts/queue) 对每个会话的运行进行串行化，并限制了全局并行度。专长通道是在此基础上增加策略：哪个代理负责哪项工作，哪些内容保留在聊天中，哪些内容变成后台工作。

## <a id="recommended-rollout"></a> 推荐推进方式

对于现成的起点，`openclaw agents team create` 将这些通道合同作为协调员、研究员、作家和审阅者角色提供。每个角色将其范围、工件移交、审批门和升级规则放在 `AGENTS.md` 中。预设将协调员连接到专家，并指示专家返回结果而无需进一步授权。请参阅 [ 团队预设 ](/concepts/multi-agent#team-preset)。

### <a id="phase-1%3A-lane-contracts-%2B-background-heavy-work"></a><a id="phase-1-lane-contracts-+-background-heavy-work"></a> 阶段 1：通道契约 + 后台重任务

在其 [agent 工作区 ](/concepts/agent-workspace) `AGENTS.md` 中为每个通道提供书面合同，该合同在每个会话开始时加载到系统提示符中：

- **目的**：该通道负责的工作。
- **非目标**：它应该交接而不是尝试处理的工作。
- **聊天预算**：简短回答留在聊天中；长任务简要确认， 然后在后台子代理或任务中运行。
- **交接规则**：当其他通道负责该工作时，说明应该去哪里， 并提供一个简明的交接摘要。
- **工具风险规则**：优先使用能够完成工作的最小工具表面。

这是成本最低的阶段，并且能解决大多数堵塞问题：一个编码任务不再把研究通道变成糖浆，每个聊天也都能保持自己的上下文干净。

### <a id="phase-2%3A-priority-and-concurrency-controls"></a><a id="phase-2-priority-and-concurrency-controls"></a> 阶段 2：优先级与并发控制

围绕每个通道的业务价值来调整队列和模型容量：

```json5
{
  agents: {
    defaults: {
      maxConcurrent: 4,
      subagents: { maxConcurrent: 8, delegationMode: "prefer" },
    },
  },
  messages: {
    queue: {
      mode: "collect",
      cap: 20,
      drop: "summarize",
    },
  },
}
```

`maxConcurrent` 限制共享主车道； `subagents.maxConcurrent` 为每个生成会话提供自己的子执行预算。

使用 direct/personal 聊天和生产操作代理来执行高优先级工作。当系统繁忙时，让研究、起草和批量编码转移到后台任务。 `subagents.delegationMode` 仅为提示指导；请参阅 [ 子代理委托 ](/tools/subagents/tool-reference) 了解每个值的用途，并参阅 [ 命令队列 ](/concepts/queue) 了解 `mode`、`cap` 和 `drop`。

### <a id="phase-3%3A-coordinator-%2F-traffic-controller"></a><a id="phase-3-coordinator-/-traffic-controller"></a> 阶段 3：协调器／流量控制器

当多个通道开始活跃后，再添加一个小型协调器模式：

- 跟踪活跃的通道任务和所有者。
- 检测跨群组的重复请求。
- 在通道之间路由交接摘要。
- 只暴露阻塞项、完成结果，以及人类必须做出的决策。

不要从这里开始。没有通道契约的协调器，只是在协调混乱。

## <a id="minimal-lane-contract-template"></a> 最小通道契约模板

将其保存在车道代理的工作区 `AGENTS.md` 中：

```md
# Lane contract

## Owns

- <job this lane is responsible for>

## Does not own

- <work to hand off>

## Chat budget

- Answer quick questions directly.
- For multi-step, slow, or tool-heavy work: acknowledge briefly, spawn/background
  the work, then return the result when complete.

## Handoff

If another lane owns the request, reply with:

- target lane
- objective
- relevant context
- exact next action

## Tool posture

Use the smallest tool surface that can complete the task. Avoid broad shell or
network work unless this lane explicitly owns it.
```

## <a id="related"></a> 相关内容

- [多代理路由](/concepts/multi-agent)
- [命令队列](/concepts/queue)
- [子代理](/tools/subagents)
