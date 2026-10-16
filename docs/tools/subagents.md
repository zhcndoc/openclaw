---
summary: "OpenClaw 子代理文档的索引，每个读者作业一页"
read_when:
  - "你想通过代理进行后台或并行工作"
  - "你正在更改 sessions_spawn 或子代理工具策略"
  - "你正在实现或排查线程绑定的子代理会话"
  - "您正在寻找与您的任务匹配的子代理页面"
title: "子代理"
sidebarTitle: "子代理"
---

子代理是从现有代理运行生成的后台代理运行。每个会话都在自己的会话 （`agent:<agentId>:subagent:<uuid>`） 中运行，默认情况下，**announces** 其结果返回给请求者以供审核。子代理运行由本机子代理生命周期所有者跟踪。

目标：

- 并行处理研究、长任务和缓慢的工具工作，而不阻塞主运行。
- 默认保持子代理隔离（会话分离，可选沙箱）。
- 保持工具面不易被滥用：子代理默认**不**获得会话或消息工具。
- 支持可配置的嵌套深度，以满足编排器模式。

<Note>
**费用说明：** 默认情况下，每个子代理都有自己的上下文和 token 用量。对于繁重或重复性的任务，为子代理设置更便宜的模型，并通过 `agents.defaults.subagents.model` 或按代理覆盖的方式，让主代理使用更高质量的模型。当子代理确实需要请求者当前的转录内容时，请使用 `context: "fork"` 启动它。线程绑定的子代理会话默认使用 `context: "fork"`，因为它们会将当前对话分支为一个后续线程。
</Note>

Control UI 显示分配的任务，而无需仅模型子代理指令。命名子代理会话使用其任务标题，不带自动“子代理：”前缀；他们的父关系和仅查看状态仍然标识运行。

子代理运行结束；会话则不然。在 Control UI 中，从父对话中打开 **Subagents**，以查看 **Running** 和 **Finished** 下的子运行，包括 swarm 工作线程。选择一个运行会在父级旁边打开其现有的仅供查看的记录。 **返回子代理** 返回列表而不替换父对话或其草稿。面板自动加载所有子页面；即使新孩子已经完成，年长的跑步工人仍然可见。并行任务视图还显示总体集群进度。

直接打开的子代理页面会保留一个命名其父级的紧凑通知和一个 **打开父会话** 按钮。嵌入面板会忽略该通知，因为父面板已经位于其旁边。当网关报告可中止运行并且您的会话访问允许时，您仍然可以使用 **Stop**。使用 `visible: true` 创建的持久会话是会话树中的普通会话：它们保留其父级以用于导航和完成公告，并且您始终可以输入它们并像任何其他会话一样引导它们。

使用普通子代理进行内部 QA、研究、编码、审查和测试通道，并将结果返回到父任务。仅当用户请求单独的会话或需要返回并引导独立工作时，才创建持久可见会话。 PR 或报告、长期运行或单独的独立工作树并不会使工作人员成为单独的面向用户的任务。请求子代理并不请求新的侧边栏会话或类别。

此页是一个索引。子代理记录在七页上，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                                         | 读它的时候                                                                            |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [子代理斜线命令](/tools/subagents/slash-command)                    | 您想要从聊天中检查运行，或者需要完成交付规则。             |
| [子代理工具参考](/tools/subagents/tool-reference)                  | 您正在调用 `sessions_spawn`、`sessions_yield` 或 `subagents` 并且需要参数。 |
| [线程绑定子代理会话](/tools/subagents/thread-bound-sessions)    | 您要将子代理绑定到通道线程，或者需要许可名单和存档规则。   |
| [嵌套子代理和身份验证](/tools/subagents/nesting)             | 您正在构建一个协调器，并且需要深度上限、公告链或身份验证。      |
| [分代理公告](/tools/subagents/announce)                              | 您正在调试子结果如何到达请求者。                             |
| [分代理工具政策](/tools/subagents/tool-policy)                        | 您需要子代理总是丢失的工具，或者想要进一步缩小它们的范围。            |
| [子代理并发、恢复和停止](/tools/subagents/operations) | 您正在调整并发性、重新启动后恢复或停止子树。       |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本中的每个部分标题、手风琴、步骤和参数 ID 都保留其锚点，因此现有链接（例如 `/tools/subagents#thread-bound-sessions`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="slash-command" />[斜线命令](/tools/subagents/slash-command#slash-command)
- <a id="thread-binding-controls" />[螺纹装订控件](/tools/subagents/slash-command#thread-binding-controls)
- <a id="spawn-behavior" />[生成行为](/tools/subagents/slash-command#spawn-behavior)
- <a id="non-blocking-push-based-completion" />[非阻塞、基于推送的完成](/tools/subagents/slash-command#non-blocking-push-based-completion)
- <a id="completion-delivery" />[竣工发货](/tools/subagents/slash-command#completion-delivery)
- <a id="completion-handoff-metadata" />[完成切换元数据](/tools/subagents/slash-command#completion-handoff-metadata)
- <a id="modes-and-acp-runtime" />[模式和ACP运行时间](/tools/subagents/slash-command#modes-and-acp-runtime)
- <a id="context-modes" />[上下文模式](/tools/subagents/tool-reference#context-modes)
- <a id="tool%3A-sessions_spawn" /><a id="tool-sessions_spawn" />[工具：`sessions_spawn`](/tools/subagents/tool-reference#tool-sessions_spawn)
- <a id="delegation-prompt-mode" />[委托提示方式](/tools/subagents/tool-reference#delegation-prompt-mode)
- <a id="tool-parameters" />[刀具参数](/tools/subagents/tool-reference#tool-parameters)
- <a id="param-task" />[`task`](/tools/subagents/tool-reference#param-task)
- <a id="param-task-name" />[`taskName`](/tools/subagents/tool-reference#param-task-name)
- <a id="param-label" />[`label`](/tools/subagents/tool-reference#param-label)
- <a id="param-agent-id" />[`agentId`](/tools/subagents/tool-reference#param-agent-id)
- <a id="param-cwd" />[`cwd`](/tools/subagents/tool-reference#param-cwd)
- <a id="param-runtime" />[`runtime`](/tools/subagents/tool-reference#param-runtime)
- <a id="param-resume-session-id" />[`resumeSessionId`](/tools/subagents/tool-reference#param-resume-session-id)
- <a id="param-stream-to" />[`streamTo`](/tools/subagents/tool-reference#param-stream-to)
- <a id="param-model" />[`model`](/tools/subagents/tool-reference#param-model)
- <a id="param-run-timeout-seconds" />[`runTimeoutSeconds`](/tools/subagents/tool-reference#param-run-timeout-seconds)
- <a id="param-thinking" />[`thinking`](/tools/subagents/tool-reference#param-thinking)
- <a id="param-thread" />[`thread`](/tools/subagents/tool-reference#param-thread)
- <a id="param-mode" />[`mode`](/tools/subagents/tool-reference#param-mode)
- <a id="param-cleanup" />[`cleanup`](/tools/subagents/tool-reference#param-cleanup)
- <a id="param-expects-completion-message" />[`expectsCompletionMessage`](/tools/subagents/tool-reference#param-expects-completion-message)
- <a id="param-sandbox" />[`sandbox`](/tools/subagents/tool-reference#param-sandbox)
- <a id="param-context" />[`context`](/tools/subagents/tool-reference#param-context)
- <a id="param-project-id" />[`projectId`](/tools/subagents/tool-reference#param-project-id)
- <a id="param-project-git-url" />[`projectGitUrl`](/tools/subagents/tool-reference#param-project-git-url)
- <a id="param-visible" />[`visible`](/tools/subagents/tool-reference#param-visible)
- <a id="param-group" />[`group`](/tools/subagents/tool-reference#param-group)
- <a id="param-worktree" />[`worktree`](/tools/subagents/tool-reference#param-worktree)
- <a id="param-worktree-name" />[`worktreeName`](/tools/subagents/tool-reference#param-worktree-name)
- <a id="param-worktree-base-ref" />[`worktreeBaseRef`](/tools/subagents/tool-reference#param-worktree-base-ref)
- <a id="task-names-and-targeting" />[任务名称和目标](/tools/subagents/tool-reference#task-names-and-targeting)
- <a id="tool%3A-sessions_yield" /><a id="tool-sessions_yield" />[工具：`sessions_yield`](/tools/subagents/tool-reference#tool-sessions_yield)
- <a id="tool%3A-subagents" /><a id="tool-subagents" />[工具：`subagents`](/tools/subagents/tool-reference#tool-subagents)
- <a id="thread-bound-sessions" />[线程绑定会话](/tools/subagents/thread-bound-sessions#thread-bound-sessions)
- <a id="thread-supporting-channels" />[螺纹配套通道](/tools/subagents/thread-bound-sessions#thread-supporting-channels)
- <a id="quick-flow" />[快流](/tools/subagents/thread-bound-sessions#quick-flow)
- <a id="spawn" />[Spawn](/tools/subagents/thread-bound-sessions#spawn)
- <a id="bind" />[Bind](/tools/subagents/thread-bound-sessions#bind)
- <a id="route-follow-ups" />[路线跟进](/tools/subagents/thread-bound-sessions#route-follow-ups)
- <a id="inspect-timeouts" />[检查超时](/tools/subagents/thread-bound-sessions#inspect-timeouts)
- <a id="detach" />[分离](/tools/subagents/thread-bound-sessions#detach)
- <a id="manual-controls" />[手动控制](/tools/subagents/thread-bound-sessions#manual-controls)
- <a id="config-switches" />[配置开关](/tools/subagents/thread-bound-sessions#config-switches)
- <a id="allowlist" />[许可列表](/tools/subagents/thread-bound-sessions#allowlist)
- <a id="param-agents-entries-subagents-allow-agents" />[`agents.entries.*.subagents.allowAgents`](/tools/subagents/thread-bound-sessions#param-agents-entries-subagents-allow-agents)
- <a id="param-agents-defaults-subagents-allow-agents" />[`agents.defaults.subagents.allowAgents`](/tools/subagents/thread-bound-sessions#param-agents-defaults-subagents-allow-agents)
- <a id="param-agents-defaults-subagents-require-agent-id" />[`agents.defaults.subagents.requireAgentId`](/tools/subagents/thread-bound-sessions#param-agents-defaults-subagents-require-agent-id)
- <a id="param-agents-defaults-subagents-announce-timeout-ms" />[`agents.defaults.subagents.announceTimeoutMs`](/tools/subagents/thread-bound-sessions#param-agents-defaults-subagents-announce-timeout-ms)
- <a id="discovery" />[发现](/tools/subagents/thread-bound-sessions#discovery)
- <a id="auto-archive" />[自动存档](/tools/subagents/thread-bound-sessions#auto-archive)
- <a id="nested-sub-agents" />[嵌套子代理](/tools/subagents/nesting#nested-sub-agents)
- <a id="depth-levels" />[深度级别](/tools/subagents/nesting#depth-levels)
- <a id="announce-chain" />[公告链](/tools/subagents/nesting#announce-chain)
- <a id="tool-policy-by-depth" />[按深度划分的工具策略](/tools/subagents/nesting#tool-policy-by-depth)
- <a id="per-agent-spawn-limit" />[每个代理生成限制](/tools/subagents/nesting#per-agent-spawn-limit)
- <a id="reset-a-conversation" />[重置对话](/tools/subagents/nesting#reset-a-conversation)
- <a id="cascade-stop" />[串级停止](/tools/subagents/nesting#cascade-stop)
- <a id="authentication" />[认证](/tools/subagents/nesting#authentication)
- <a id="announce" />[公告](/tools/subagents/announce#announce)
- <a id="announce-context" />[公告上下文](/tools/subagents/announce#announce-context)
- <a id="stats-line" />[统计行](/tools/subagents/announce#stats-line)
- <a id="why-prefer-sessions_history" />[为什么更喜欢`sessions_history`](/tools/subagents/announce#why-prefer-sessions_history)
- <a id="tool-policy" />[刀具政策](/tools/subagents/tool-policy#tool-policy)
- <a id="override-via-config" />[通过配置覆盖](/tools/subagents/tool-policy#override-via-config)
- <a id="concurrency" />[并发](/tools/subagents/operations#concurrency)
- <a id="liveness-and-recovery" />[活性和恢复](/tools/subagents/operations#liveness-and-recovery)
- <a id="stopping" />[停止](/tools/subagents/operations#stopping)
- <a id="limitations" />[限制](/tools/subagents/operations#limitations)

## <a id="related"></a> 相关内容

- [会话工具和状态更改](/concepts/session-tool)
- [ACP 代理](/tools/acp-agents)
- [Agent 发送](/tools/agent-send)
- [多代理沙箱工具](/tools/multi-agent-sandbox-tools)
- [并行专业通道](/concepts/parallel-specialist-lanes) — 单个作业的角色范围通道
- [Steer](/tools/steer) — 重定向正在运行的代理中间任务
