---
summary: "检查使用 /subagents 运行的子代理，使用线程绑定命令，并遵循完成交付路径"
title: "子代理斜线命令"
read_when:
  - "您想要检查或记录从聊天运行的子代理"
  - "您需要线程绑定斜线命令"
  - "您正在调试已完成的子项如何到达请求者"
---

## <a id="slash-command"></a> 斜杠命令

`/subagents` 检查**当前会话**的子代理运行：

```text
/subagents list
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
```

`/subagents info` 显示运行元数据（状态、时间戳、会话 ID、脚本路径、清理）。 `/subagents log` 打印最近的聊天轮次；添加 `tools` 令牌以包含工具 call/result 消息（默认情况下省略）。使用 `sessions_history` 从代理轮次内获得有界的、安全过滤的召回视图，或检查磁盘上的转录本路径以获取原始完整转录本。

`/status` 保留完整的子代理计数，但最多显示三个当前详细信息行。每行区分正在运行（可用时使用安全工具名称）、排队、等待批准、输入、子项、代理消息或外部工作，以及完成执行但结算仍待处理。待处理的孩子可能已经完成但仍欠完成交付；他们不一定在执行。 “当前活动不可用”意味着当前没有可观察到的执行，而不是任务失败。这些观察结果不会改变保留的 active/done 计数。

在 Control UI 中，子代理运行出现在其会话记录中。它们不会显示为侧边栏行，也不会向其父级添加展开控件。家长的活动环、计数、未读注意力和孩子失败警告仍然包括他们的作业。持久生成的会话和分叉保持其侧边栏嵌套。在父对话中使用 `/subagents list`、`/subagents info` 和 `/subagents log` 来检查本机运行。父级发送的后续轮次保留原始结果和任何待处理的子级等待；回复仍按照`sessions_send`投递。失败或超时的子级保留有限的失败原因，包括在任何模型回复之前工作树准备期间的失败。孩子的成绩单包括一个持久的失败通知，当时没有记录到该次跑步的助理答复。稍后的成功运行会清除先前的失败原因。

### <a id="thread-binding-controls"></a> 线程绑定控制

这些命令适用于具有持久线程绑定的通道。参见[螺纹支持通道](/tools/subagents/thread-bound-sessions#thread-supporting-channels)。

```text
/session unbind
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### <a id="spawn-behavior"></a> 生成行为

代理使用 `sessions_spawn` 工具启动后台子代理。按照已接受的收据中描述的完成路径进行操作：

- 普通宣告运行将内部完成事件返回给请求者，请求者审查结果并决定是否需要面向用户的更新。
- [Swarm收集器](/tools/swarm)通过显式收集返回结果，而不是完成通知；将它们保留用于大型并行扇出（几个类似的子级，大约五个或更多），并为一个或几个使用普通的生成。
- 线程绑定会话运行时，可交付的绑定路由直接答复该线程，无需单独的父公告。
- Caller 管理的安静运行不发送完成通知。

当启用 [ 执行身份审核](/gateway/audit#run-identity-inspection) 时，每个本机或 ACP 子项都会收到一个新的不可变身份上下文。它的谱系在可用时链接确切的父 context/run，并记录父授权、本地策略、运行时保证和约束生成的目标策略的有界引用。私有身份令牌和任务文本都不会出现在工具架构、结果、转录衍生证据或公共插件 API 中。即使 ACP 生成和子项是可观察的，不带回调的外部 ACP-native 操作仍然明确不受支持。

<AccordionGroup>
  <Accordion id="non-blocking-push-based-completion" title="非阻塞、基于推送的完成">
    - `sessions_spawn` 在接受启动后返回运行 ID，而不等待子任务完成。来自 OpenClaw 云工作线程的生成可以首先等待子配置和节点注册。
    - 宣布子代理在完成时向 parent/requester 会话报告。
    - 需要这些已公布结果的代理应在可用时致电 `sessions_yield`。这会结束当前回合，并让完成事件作为下一个模型可见消息到达。相反，收集器需要显式的结果收集。
    - 宣布完成是基于推送的。生成后，在循环中执行 **not** 轮询 `/subagents list`、`sessions_list` 或 `sessions_history`，以等待其完成；仅在调试时按需检查状态。
    - Child 输出是 report/evidence，供请求者代理进行合成。它不是用户编写的说明文本，不能覆盖系统、开发人员或用户策略。
    - A 子运行结束本身并不能完成请求者面向用户的目标。请求者将结果与请求的结果进行比较，并在回复之前继续范围内的工作，包括审查结果和失败的检查。可以使用 `sessions_send` 继续持久子会话。
    - 仅当继续需要新的用户权限或不可用的外部决策时才将总体目标报告为受阻。普通的可修复发现是继续工作，而不是终结者。
    - 完成后，OpenClaw 会尽力关闭由该子代理会话打开的跟踪浏览器 tabs/processes，然后再继续公告清理流程。

  </Accordion>
  <Accordion id="completion-delivery" title="竣工交付">
    - OpenClaw 通过 `agent` 轮次将完成情况交还给请求者会话，该轮次具有防止重复轮次的稳定密钥。
    - 如果请求者运行仍然处于活动状态，则 OpenClaw 首先尝试运行 wake/steer，而不是启动第二个可见回复路径。
    - 如果活动请求者无法接受转向，包括繁忙的 CLI 运行，则切换将在同一会话通道中等待，并在当前回合释放其声明后开始。失败的唤醒不会启动竞争回合或放弃完成。
    - 即使父级决定不需要可见的用户更新，成功的会话中父级切换也会完成子代理交付。外部完成交付需要确认发送，而不仅仅是请求者记录中保存的答案。
    - Native子代理没有获取消息工具。他们将纯文本助理文本返回给 parent/requester 代理；人类可见的回复仍属于 parent/requester 代理的正常传递政策。
    - 队列接受不是交付。如果无法使用直接切换，则交付将退回到队列路由；完成仍然是 `session_queued`，而不是交付，直到持久队列稳定下来。
    - 自动完成交付重试最多 30 分钟，从大约 15 秒开始，回退上限为 5 分钟。永久失败或截止日期到期会使子运行的完成交付未得到解决，而不是丢弃其结果。
    - 丢失或空的外部交货收据仍未确认，并遵循有界重试策略。适配器报告的未经确认的发送仍然是模棱两可的，绝不是故意抑制的。空请求者输出仍然使用现有的完成回退；这不是出站挂断取消。发送给请求者的已确认消息工具仍算作已送达。
    - 如果出站挂钩故意抑制完成，则子级可以保持完成状态，同时其完成传递标记为 `failed` 并带有抑制原因。 OpenClaw 不会重试或启动另一个请求者来绕过该决定。在手动重试之前检查传送错误和挂钩策略。
    - Delivery 保留已解析的请求者路由：线程绑定或对话绑定的完成路由在可用时获胜。如果完成源仅提供通道，则 OpenClaw 会填充请求者会话记录的传递上下文中缺失的 target/account，因此直接传递仍然有效。

  </Accordion>
  <Accordion id="completion-handoff-metadata" title="完成移交元数据">
    发给请求者会话的完成交接是运行时生成的内部上下文（不是用户编写的文本），并包含：

    - `Result` — 来自孩子的最新可见 `assistant` 回复文本。 Tool/toolResult 输出不会提升为子结果。终端运行失败不会重复使用捕获的回复文本。
    - `Model route change`——当终端生产者证明回退改变了请求的模型时，一个有界和编辑的路由事实与`Result`分开携带。本地和嵌套父级将其保留在更新中。外部通道父级将其保留为私有编排上下文，原始直接传递回退仅发送 `Result`。
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`.
    - 紧凑型runtime/token统计数据。
    - 一条复查指令，要求请求者代理在决定原始任务是否完成前先验证结果。
    - 一条后续指导，告诉请求者代理在子结果仍需更多动作时继续任务或记录后续事项。
    - 一条用于“无需更多动作”路径的最终更新指令，以正常的 assistant 语气编写，不转发原始内部元数据。

  </Accordion>
  <Accordion id="modes-and-acp-runtime" title="模式和 ACP 运行时">
    - `--model` 和 `--thinking` 会覆盖该特定运行的默认值。
    - 使用 `info`/`log` 在完成后检查详细信息和输出。
    - 对于持久的线程绑定会话，使用 `sessions_spawn` 时设置 `thread: true` 和 `mode: "session"`。
    - 如果请求者通道不支持线程绑定，则使用 `mode: "run"`，不要重试不可能的线程绑定组合。
    - 对于 ACP harness会话（Claude Code、Gemini CLI、OpenCode 或显式 Codex ACP/acpx），将 `sessions_spawn` 与当工具公布该运行时时为 `runtime: "acp"`。调试完成或代理到代理循环时，请参阅 [ACP 交付模型](/tools/acp-agents#delivery-model)。当启用 `codex` 插件时，Codex chat/thread 控件应该优先选择 `/codex ...` 而不是 ACP，除非用户明确要求 ACP/acpx.
    - OpenClaw 隐藏 `runtime: "acp"`，直到 ACP 启用、请求者未沙箱化并且加载后端插件（例如 `acpx`）。 `runtime: "acp"` 需要外部 ACP harness ID，或带有 `runtime.type="acp"` 的 `agents.entries.*` 条目；使用来自 `agents_list` 的正常 OpenClaw 配置代理的默认子代理运行时。

  </Accordion>
</AccordionGroup>
