---
summary: "上下文模式和 sessions_spawn、sessions_yield 和子代理工具合约"
title: "子代理工具参考"
read_when:
  - "您正在调用 sessions_spawn 并需要其参数"
  - "您需要在隔离子上下文和分叉子上下文之间进行选择"
  - "您正在等待 sessions_yield 的子结果"
---

## <a id="context-modes"></a> 上下文模式

非线程本机子代理开始隔离，除非调用者明确要求分叉当前记录。线程绑定生成遵循 `threadBindings.defaultSpawnContext`，默认为 `fork`。当子级必须以干净的上下文开始时，显式传递 `context: "isolated"`。

| 模式       | 何时使用                                                                                                                          | 行为                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `isolated` | 新研究、独立实现、耗时的工具工作，或任何可以在任务文本中简要描述的内容                            | 创建一个干净的子成绩单。非线程生成的默认值；降低代币使用量。 |
| `fork`     | 取决于当前对话、之前的工具结果或请求者记录中已存在的详细说明的工作 | 在子会话开始前，将请求者对话记录分叉到子会话中。       |

请谨慎使用 `fork`。它适用于依赖上下文的委派，而不是清晰任务提示的替代品。

## <a id="tool%3A-sessions_spawn"></a><a id="tool-sessions_spawn"></a> 工具：`sessions_spawn`

通过`user`（请求者验证的`requester_profile.id`）来代理参与者。在几个人转向、穿过本地、可见和 ACP 生成点后需要它。孩子保留该人的权力，独立于父母的轮流；后来撤销仍然会阻止它。 Codex原生`spawn_agent`拒绝多人轮流；使用 `sessions_spawn` 和 `user` 代替。

启动在生成会话的子代理队列上运行的子代理，每会话并发数为 [](/tools/subagents/operations#concurrency)。普通一次性运行使用 `deliver: false` 并通过完成交付返回给请求者；收集器、安静运行和直接线程回复使用 [ 完成路径 ](/tools/subagents/slash-command#spawn-behavior)。

可用性取决于调用者的有效工具策略。内置`coding`和`messaging`配置文件包括`sessions_spawn`、`sessions_yield`和`subagents`； `minimal` 没有。 `full` 允许使用每种工具。使用 `tools.alsoAllow` 添加这些工具，或使用上面的配置文件之一，以便代理在自定义的较窄配置文件上仍应委派工作。 Channel/group、提供程序、沙箱和每代理 allow/deny 策略仍然可以在配置文件阶段后删除该工具。使用同一会话中的 `/tools` 来确认有效刀具列表。

受通道、组或每个发送者工具策略限制的发件人可能仅启动同一代理的隐藏助手。 `visible: true` 和另一个 `agentId` 被拒绝，包括 ACP 生成。隐藏助手继承受限工具、工作空间和会话根；他们无法选择另一个 `cwd`、项目或托管工作树。当 ACP 无法强制执行继承的工具或文件系统限制时，它还会拒绝生成；在这种情况下请使用 `runtime: "subagent"`。普通的全局、代理和配置文件工具策略本身并不强加此规则。所有者授权的自动化保留自己的调度策略和工作空间；普通访客无法通过工具白名单获得该权限。

在引入此规则之前创建的子项缺乏发送者策略出处。他们现有的工具 allow/deny 快照仍然适用，但启动新的助手来应用继承的生成限制。

**默认值：**

- **Model：** 同一代理本机子代理继承呼叫者的活动模型，包括会话和一次性覆盖，除非您设置 `agents.defaults.subagents.model`（或每代理 `agents.entries.*.subagents.model`）。继承的模型 ID 会被准确保留，即使它包含提供者前缀也是如此。跨代理生成使用目标代理的配置模型。 ACP 运行时生成使用相同配置的子代理模型（如果存在）；否则，ACP harness将保留其自身的默认设置。显式的 `sessions_spawn.model` 仍然获胜。
- **Thinking：** 本机子代理继承调用者明确选择的思维级别，包括一次性思维覆盖，除非您设置 `agents.defaults.subagents.thinking`（或每个代理 `agents.entries.*.subagents.thinking`）。未选择的本机子项使用自己的模型默认值。 ACP 运行时生成还应用目标代理的 `thinkingDefault`，然后应用其每个模型的 `agents.entries.*.models["provider/model"].params.thinking` 或共享的 `agents.defaults.models["provider/model"].params.thinking`。显式的 `sessions_spawn.thinking` 仍然获胜。
- **快速模式：启用群的**，仅当解析的子提供程序和模型与请求者的活动模型匹配时，本机子代理才会继承请求者的设置。不同的子模型使用自己的默认值。显式 `sessions_spawn.fastMode` 值（`true`、`false` 或 `"auto"`）优先；解析为同一模型的别名保留继承。
- **运行超时：** 传入 `runTimeoutSeconds` 可为特定的原生、ACP 或可见子代理运行设置超时。省略时，OpenClaw 使用已配置的 `agents.defaults.subagents.runTimeoutSeconds`；否则回退为 `0`（无超时）。显式设置为 `0` 会禁用该次运行的超时。
- **进程生命周期：** 分离的 OpenClaw 子代理拥有独立的运行生命周期。在外部 CLI 后端中创建的后台任务则不同：它与父 CLI 子进程共享生命周期，并会在父进程达到 `agents.defaults.timeoutSeconds` 时停止。
- **任务传递：**隐藏和可见的本机子代理在任何分叉历史记录之后附加的用户消息中接收其委托的任务。仅模型运行时上下文标识当前分配； Control UI 仅显示任务文本。隐藏的子代理会收到准确的子代和请求者会话身份、标签以及分配的请求者通道。他们的系统提示符带有共享的运行时规则，使其前缀可在等效的子生成中重复使用。继承的对话仍然是背景上下文。

拥有 `operator.sessions.write` 的来宾可以为自己的沙盒工作启动隐藏的本机子项，并接收私人父项完成内容。孩子保留发起人的权威和榜样限制。请参见 [ 操作员范围](/gateway/operator-scopes#scope-levels)。

网关重新启动、后代完成或 `sessions_send` 后续操作后的本机子代理继续保留记录的运行超时，包括无超时的 `0`，同时记录的会话身份仍然匹配。替换的会话或没有捕获的身份的注册使用普通代理超时。引导主动转弯可保留该转弯的现有预算。这包括由 v2026.9.6 保留但没有捕获标识的行：它们的下一个延续使用 `agents.defaults.timeoutSeconds`（默认值：48 小时），即使它们存储的 `runTimeoutSeconds` 是 `0`。完成、放弃和暂停唤醒使用请求者自己的超时：如果已注册，则使用其记录的子代理预算，否则为 `agents.defaults.timeoutSeconds`（默认值：48 小时）。孩子的超时永远不会成为其请求者的唤醒预算。

接受的本机子代理生成报告其实际初始化的 `context`（`fork` 或 `isolated`），包括当请求的分叉超出父上下文大小上限时的 `isolated`。大小检查包括自最新模型响应以来添加的上下文，例如完成的工具输出，并尊重压缩和重置边界。一个超大的叉子开始时带有解释性注释。生成还包括解析的子模型元数据：`resolvedModel` 包含应用的模型引用，而 `resolvedProvider` 包含提供者前缀（当引用具有提供者前缀时）。

### <a id="cloud-placement"></a> 云投放

`placement` 是可选的。省略它默认为本地执行，或使用 `{ "kind": "local" }` 显式选择本地执行。两种形式都支持本机子代理（包括隐藏的审核和测试工作人员）、可见会话，并且 ACP 在其现有运行时和可见性规则下运行。本地放置不接受云选择器。请勿提供虚拟配置文件、OS 或机器标识符。现有的本地工作树仅需要 `cwd`，而不是 `worktree: true`：

```json
{
  "task": "Review the current changes and report findings",
  "runtime": "subagent",
  "mode": "run",
  "cwd": "/path/to/existing/worktree",
  "placement": { "kind": "local" },
  "completionTarget": "parent"
}
```

在此示例中省略 `placement` 具有相同的本地行为。对于有意的云执行，请使用 `visible: true`、`worktree: true` 和真实配置的配置文件。无效放置、混合 local/cloud 选择器和失败的云放置不会回退到本地执行。

使用 `sessions({ action: "cloud_profiles" })` 发现配置的配置文件。该列表最多返回 32 个摘要，并在其他页面可用时提供 `nextOffset`。将该值作为 `offset` 传递。请求 `sessions({ action: "cloud_profiles", profileId: "build" })` 以获取该配置文件的操作系统、可用性、默认值和每个 OS 机器类别。 Discovery 读取与 Control UI 相同的提供商编写的目录，而不是配置文件设置或凭据。

然后使用选定的标识符启动子进程：

```json
{
  "task": "Run the project tests on Linux and report failures",
  "visible": true,
  "worktree": true,
  "placement": {
    "kind": "profile",
    "profileId": "build",
    "os": "linux",
    "machineClass": "tiny"
  }
}
```

云放置需要实时托管网关会话；独立和本地嵌入的传输在创建之前会被拒绝。云生成在返回接受之前等待放置；接受并不意味着任务已经完成。结果包括已解析的布局和正常子 session/run 标识符。现有的生成策略、子限制、继承的工具限制和网关放置授权仍然适用。

`childSessionKey` 的错误意味着子项被保留。 `initialTaskStatus: "not-sent"` 表示该工具未提交其初始任务； `"unknown"` 表示已尝试接受任务但未确认。在重试之前检查该子项及其位置。不要仅仅因为配置或初始回复超时而重复生成。无法注册的尝试任务通过精确运行取消来解决；它的会话和工作人员被保留以供检查。

选择云配置文件仅适用于网关端可见生成。受限制的云工作人员生成工具保留其现有的父配置文件继承契约；它不接受不同的配置文件、OS 或尺寸。

### <a id="delegation-prompt-mode"></a> 委派提示模式

`agents.defaults.subagents.delegationMode` 仅控制提示引导；它不会改变工具策略或强制授权。如果没有显式设置，OpenClaw 在每个代理的主会话中使用 `prefer`，在每个其他会话中使用 `suggest`。

- `suggest`：保持标准提示轻推以使用子代理进行较大或较慢的工作。
- `prefer`：告诉代理保持响应并委托比通过 `sessions_spawn` 直接回复更复杂的事情。

显式默认或每个代理设置始终获胜，包括主会话中的 `suggest` 和其他地方的 `prefer`。每个代理覆盖使用 `agents.entries.*.subagents.delegationMode`。

在任一模式下，内部 QA、研究、编码、审查和测试通道都使用普通子代理并将其结果返回给父任务。仅当用户请求单独的会话或需要独立重新访问和指导工作时，才将 `sessions_spawn` 与 `visible: true` 结合使用。单独的 PR 或报告、长运行时间或独立的工作树并不能证明持久侧边栏会话是合理的。请求子代理并不要求单独的会话。

```json5
{
  agents: {
    defaults: {
      subagents: {
        delegationMode: "prefer",
        maxConcurrent: 4,
      },
    },
    entries: {
      coordinator: {
        subagents: { delegationMode: "prefer" },
      },
    },
  },
}
```

### <a id="tool-parameters"></a> 工具参数

<ParamField path="task" type="string" required>
  子代理的任务描述。
</ParamField>
<ParamField path="taskName" type="string">
  用于在后续状态输出中标识特定子任务的可选稳定句柄。必须匹配 `[a-z][a-z0-9_-]{0,63}`，且不能是保留目标，例如 `last` 或 `all`。
</ParamField>
<ParamField path="label" type="string">
  可选的简短任务标题显示在会话记录中，以及可见会话的会话侧栏中。说出正在完成的工作，而不是代理；它是在运行开始时在子会话上设置的。
</ParamField>
<ParamField path="agentId" type="string">
  当 `subagents.allowAgents` 允许时，在另一个配置的代理 ID 下生成。
</ParamField>
<ParamField path="cwd" type="string">
  子运行的可选任务工作目录。本机子代理仍然从目标代理工作区加载引导文件； `cwd` 仅更改运行时工具和 CLI harness执行委派工作的位置。对于可见会话，已配置的代理工作区外部的路径需要 `operator.admin`。使用`worktree: true`，省略`cwd`、`projectId`和`projectGitUrl`继承同代理父级的实时托管存储库或直接选择的注册项目；否则使用目标代理工作区。
</ParamField>
<ParamField path="projectId" type="string">
  通过与新建会话相同的托管项目流程选择已注册的项目。仅限本地子代理；隐藏的孩子需要`worktree: true`。与 `projectGitUrl` 和 `cwd` 互斥。注册表选择不会授予任意主机路径访问权限或绕过沙箱遏制。
</ParamField>
<ParamField path="projectGitUrl" type="string">
  通过新会话的现有准备流程，为托管克隆选择 GitHub、HTTPS 或 `git@github.com` 存储库 URL。需要`visible: true`；与 `projectId` 和 `cwd` 互斥。本地路径、文件 URL 和非 GitHub 主机将被拒绝。现有网关 GitHub 凭证和沙箱检查适用。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 仅适用于外部 ACP harness（`claude`、`droid`、`gemini`、`opencode` 或明确要求的 Codex ACP/acpx）和 `agents.entries.*` 条目其`runtime.type`是`acp`。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  仅ACP-。当 `runtime: "acp"` 时恢复现有的 ACP harness会话；忽略本机子代理生成。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  仅ACP-。当 `runtime: "acp"` 时，将 ACP 运行输出流式传输到父会话；省略本机子代理生成。
</ParamField>
<ParamField path="model" type="string">
  覆盖子代理模型。无效值会被跳过，子代理将在默认模型上运行，并在工具结果中给出警告。
</ParamField>
<ParamField path="runTimeoutSeconds" type="integer">
  覆盖此子任务配置的运行超时。必须为非负整数；`0` 表示禁用超时。适用于原生、ACP 和可见会话。
</ParamField>
<ParamField path="thinking" type="string">
  覆盖子代理运行的思考级别。不适用于 `visible: true`。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  当为 `true` 时，为该子代理会话请求频道线程绑定。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  如果省略 `thread: true` 和 `mode`，则默认为 `session`。 `mode: "session"` 需要 `thread: true`。如果线程绑定对于请求者通道不可用，请改用 `mode: "run"`。对于`visible: true`，省略`mode`或使用默认的`"run"`；可见会话保持持久。 `mode: "session"` 在此路径上不可用。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 在宣布后立即存档会话，并在整个会话生命周期中删除签出之前对其托管工作树进行快照。 `"keep"` 在正常空闲和存档清理下保留会话和工作树。 Control UI 的 **Tasks** 检查器可以预览 [ 清理后访问规则 ](/tools/subagents/announce#announce) 下保留的转录本。
</ParamField>
<ParamField path="expectsCompletionMessage" type="boolean" default="true">
  为“即发即忘”儿童设置 `false`。当子进程完成时，OpenClaw 会跳过向请求者的完成移交（不通知或转向），将交付记录为不需要，并仍然运行子进程清理。使用 `subagents` 或 `sessions_history` 检查此类儿童。 `collect: true` 始终使用 `false`。
</ParamField>
<ParamField path="completionTarget" type='"parent"'>
  在私人请求者回合中返回结果，没有自动通道传递。家长审查结果，继续未完成的工作，并在内部记录结果。如果父级在等待时让步，它将恢复并根据对话的正常回复规则进行应答；仅使用消息工具的房间仍然需要 `message` 工具。仅支持隐藏的本机 `mode: "run"` 子级；对于 ACP、`collect`、`visible`、`thread`、会话模式或 `expectsCompletionMessage: false` 不可用。省略保持正常完成交付。请参见 [ 私有父完成 ](/tools/subagents/announce#private-parent-completion)。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` 会拒绝生成，除非目标子运行处于沙箱环境中。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"'>
  `fork` 将请求者的当前成绩单分支到子会话中，包括正在进行的用户轮次和已完成的工具结果。请求者可以在其可见或隐藏的子级启动时继续运行。仅限本机子代理。非线程生成默认为 `isolated`；线程绑定生成遵循 `threadBindings.defaultSpawnContext`，默认为 `fork`。显式传递 `isolated` 以保证干净的上下文。所有本机分叉，无论是隐藏的还是可见的，都必须以与请求者相同的代理为目标。 Codex-支持的分叉子项接收完整的工具输出，无需秘密屏蔽和汇总历史工具输入。上下文大小限制仍然适用。
</ParamField>
<ParamField path="visible" type="boolean" default="false">
  仅当用户请求单独的会话或需要返回并独立指导工作时，才创建持久仪表板会话。忽略此标志或将 `false` 用于支持父任务的内部 QA、研究、编码、审查和测试工作人员。可见生成仅支持 `runtime: "subagent"` 并始终保留创建的会话。
</ParamField>
<ParamField path="placement" type="object">
  省略默认本地执行，或在没有云选择器的情况下显式使用 `{ kind: "local" }`。对于已配置的云配置文件上的可见工作树会话，请将 `{ kind: "profile", profileId, os?, machineClass? }` 与 `visible: true` 和 `worktree: true` 结合使用； OS 和机器 ID 来自云配置文件发现。省略的云选择器使用配置文件默认值。网关在不启动其任务的情况下创建云子级，对其进行调度，然后在工作线程上承认其第一个任务。无效的放置以及失败或不确定的云启动永远不会默默地回退到本地执行；失败的云启动会保留子级以供检查。
</ParamField>
<ParamField path="group" type="string">
  用于可见会话的可选自定义侧边栏组；一个新名称创建该组。省略、空和仅空白值表示未分组，并且也接受隐藏或 ACP 运行。非空组需要 `visible: true`。
</ParamField>
<ParamField path="worktree" type="boolean" default="false">
  为隐藏或可见的本机子代理配置托管 git 工作树。在结帐和设置完成之前接受返回；第一轮等待托管工作区。 ACP 不支持此选项。
</ParamField>
<ParamField path="worktreeName" type="string">
  可选的托管工作树名称。需要 `worktree: true` 和 `runtime: "subagent"`。
</ParamField>
<ParamField path="worktreeBaseRef" type="string">
  托管工作树的可选 git base ref。需要 `worktree: true` 和 `runtime: "subagent"`。
</ParamField>

<Warning>
`sessions_spawn` **not** 接受通道传递参数（`target`、`channel`、`to`、`threadId`、`replyTo`、 `transport`）。本地子代理将其最新的助理返回给请求者；外部交付由 parent/requester 代理负责。
</Warning>

和`visible: true`， `group`， `model`， `cwd`， `projectId`， `projectGitUrl`，以及同一智能体`context: "fork"`都支持。为用户请求或需要重新访问和独立引导的单独会话保留此持久模式；当网络出现时，它会出现在侧边栏中UI可用并且在没有它的情况下仍然可以工作。内部的QA、编码、审查和测试通道仍然是普通的子代理，即使它们产生了PR或报告或需要隔离源工作。隐藏的本机工作人员可以使用以下命令请求托管工作树`worktree: true`；独立结帐不需要侧边栏会话。经过`group`以原子方式将新会话放入该侧边栏组中；省略或空白值使其未分组。沙盒目标限制`cwd`到该代理的工作区。非管理员呼叫者可以使用`cwd`仅在已配置的代理工作区中。和`worktree: true`， 省略`cwd`， `projectId`， 和`projectGitUrl`继承同一代理父级的实时管理存储库或直接选择的注册项目并创建单独的工作树。其他生成点使用目标代理工作区。对于另一个存储库，省略`cwd`并准确选择其中之一`projectId` or `projectGitUrl`；两者都在普通写入范围内重用现有的新会话准备流程。添加`worktree: true`对于单独的托管工作树。项目选择不会绕过目标沙箱或授予运行工作树设置脚本的权限。不要将被拒绝的持久生成替换为同步生成`openclaw agent` CLI，其命令截止时间默认为600秒。线装订，`mode: "session"`， 思维凌驾于一切之上，`lightContext`，并且附件暂存在此路径上不可用，因为可见会话是通过创建的持久仪表板会话`sessions.create`。默认`mode: "run"`， 空的`attachments`，和一个空的`attachAs.mountPath`被接受而不改变该行为。新的仪表板子项在第一次转动之前继承了请求者的有效工具策略上限，操作员配置的除外[仅拒绝目标委派授予](/tools/subagents/tool-policy#delegate-tools-to-a-coding-agent)。会话列表和寻址服从`tools.sessions.visibility`；默认值`all`范围涵盖网关上非沙盒呼叫者跨代理的会话。跨代理访问默认处于启用状态并受`tools.agentToAgent`；使用`allow`限制代理对或设置`enabled: false`阻止普通的跨代理访问（请求者拥有的本机子代理和ACP子会话在以下情况下仍可访问`tree` or `all`）。放`agent`对于仅限同一代理的访问，`tree`对于当前加上衍生范围（main 保留其相同代理异常），或者`self`仅用于当前会话访问。仅限沙箱生成的限制仍然适用。跨代理拥有的子项包含在`tree`， 不是`agent`；保留明确的`tree`对于该工作流程。看[会话工具](/concepts/session-tool#visibility)和[托管工作树](/concepts/managed-worktrees)。

隐藏的原生子项接受 `projectId`、`worktree: true`、`worktreeName` 和 `worktreeBaseRef`，包括 `completionTarget: "parent"`。它们保留本机子代理注册表、完成路由和 `cleanup` 行为。托管准备记录可见会话使用的相同会话工作树绑定；仅当结账准备就绪时，第一个回合才开始。

如果调用失败并显示 `Parameters require visible=true`，请省略指定的 `group` 或 `projectGitUrl` 以保留隐藏运行时。云放置配置文件还需要可见的工作树会话。这些错误包括精确更正的可见调用，并删除了不兼容的完成、线程、附件、群和 ACP-only 选项。仅当需要单独的持久会话时才使用该调用。 ACP 无法使用托管工作树参数；选择 `runtime: "subagent"` 或忽略这些参数。

可见的生成体通常保留请求代理作为其创建者；相反，所需的沙箱会保留父级创建者的出处。仅当该人与父会话的人类所有者匹配时，其初始所有者才是经过验证的活跃人类请求者；否则为请求代理。接受的结果兼作 `childSessionKey`、`runId`、Control UI、`sessionUrl`（当 Control UI 禁用时省略）和 `owner` 记录的收据。当确认通道中的生成时，请将会话 URL 放在第一行，将 `Owner: <label>` 放在第二行，以便用户可以打开会话并查看谁负责。所有者可以稍后重新分配；请参见 [ 多用户模式](/concepts/multi-user#agent-spawned-sessions)。

### <a id="task-names-and-targeting"></a> 任务名称和目标定位

`taskName` 是用于编排的模型可见标识，不是会话键。 当协调器稍后可能需要检查该子任务时，请将其用于稳定的子任务名称，例如 `review_subagents`、 `linux_validation` 或 `docs_update`。

目标解析接受精确的 `taskName` 匹配和明确的前缀。匹配的范围仅限于编号为 `/subagents` 的目标所使用的相同 active/recent 目标窗口，因此陈旧的已完成子项不会使重用句柄变得不明确。如果两个活跃或最近的孩子共享相同的`taskName`，则目标不明确；请改用列表索引、会话密钥或运行 ID。

保留目标 `last` 和 `all` 不能作为有效的 `taskName` 值， 因为它们已经具有控制含义。

## <a id="tool%3A-sessions_yield"></a><a id="tool-sessions_yield"></a> 工具：`sessions_yield`

结束当前模型回合并等待已宣布的子完成事件作为下一条消息到达。当请求者需要在回答之前宣布孩子的结果时使用它。它不收集 Swarm 结果：收集器需要 `agents_wait` 或 OpenClaw 代码模式下等待的 `agents.run()`，并且不发送完成通知。

`sessions_yield` 是等待已宣布完成的原语。请勿将其替换为 `subagents`、`sessions_list`、`sessions_history`、shell `sleep` 上的轮询循环，或仅为了检测子进程完成而进行的进程轮询。

使用 Astra 异步工具，`sessions_yield` 保持同步调用，因此模型响应在产量处暂停。当该响应中较早的异步工具调用具有模型尚未收到的结果时，OpenClaw 会推迟收益并保持轮次活动。下一个请求会在延迟产量结果之前交付这些结果；仅当外部工作仍需要等待时，模型才会再次产生。即使该工具已经完成并且其结果出现在记录中，这也适用。

使用可选的 `message` 字段作为恢复回合应接收的私有上下文。当交互式父回合将静默结束时，OpenClaw 会发送默认等待回复； `acknowledgment` 覆盖其文本。此等待答复不会从子代理、心跳或静默轮次发送给用户，并且不会替换轮次期间已传递的答复或消息。这种主机拥有的等待状态绕过了仅消息工具的源抑制；普通模型回复保持私密，除非模型通过消息工具发送它们。

在原生 Codex 工具环境回合中，`wait_agent` 会保持当前回合处于活动状态，并且仅用于在当前回合中有意等待，因为下一步操作会立即受子代理阻塞。当原生子代理的结果应在后续回合中恢复父代理时，请改用 `sessions_yield`。

仅当会话的有效工具列表包含 `sessions_yield` 时才使用它。某些精简或自定义工具配置可能会公开 `sessions_spawn` 和 `subagents`，但不公开 `sessions_yield`；在这种情况下，不要仅为了等待完成而臆造轮询循环。

子代理还可以显式设置 `waitFor: "message"` 来等待有关外部工作的传入延续，例如它本身不驱动的远程作业。这不会安排该消息；运营商或集成必须发送它。这适用于可见和隐藏的本机子项，基于活动的注册任务，而不是会话密钥格式。根会话、收集器、停止的任务和被取代的世代不能声明子消息等待。在同一子会话中单独承认的后续行动仍然是独立的任务。安静的本地孩子可以暂停，而无需获得宣布的完成或暂停通知。如果没有真正的待处理 child/runtime 完成或此显式消息意图，则yield 将被拒绝。将已完成的工作作为正常的最终响应返回：`sessions_yield` 不是最终结果提交。接受的收益率会暂停子运行而不是完成它。对于已宣布完成的子项，`waitFor: "message"` 每次暂停都会使用包含子项会话密钥、运行 ID、标签和修剪的 `acknowledgment` 文本（最多 12,000 个 UTF-16 代码单元，宣布文本限制）或默认的“已暂停等待继续”的需要继续的通知来唤醒其请求者一次。线。使用与完成结果相同的转义将确认呈现为子提供的数据。该通知与完成不同，并且使用请求者的现有消息队列策略（如果它已经在运行）。它不会恢复子会话：通过 `sessions_send` 的授权调用者将延续发送到指定的子会话。拥有孩子并不意味着拥有这个工具；儿童消息传递限制仍然适用。请求者再次让步不会重复已发送的暂停通知。当子进程仍在让步时，已在子进程会话中接受的默认后续操作将继续执行，因此不会发送任何通知。具有自己的请求者的后续行动将保留为单独的同级，并将通知保留在适当的位置。

然后，插件可以通过使用暂停的 `sessionKey` 调用 `api.runtime.subagent.run` 来继续相同的运行，而不是启动同级。一旦此类后续工作正常完成，就会宣布请求者；再次产生 `waitFor: "message"` 的后续操作会使运行暂停并发送新的需要继续的通知。这也适用于在子级仍在完成其屈服轮次时承认的默认交付插件后续：当暂停发布时，后续将接管请求者的完成，并且一旦后续完成就宣布请求者。

收益声明属于产生子代的回合。当同一会话的后续轮次调用 `sessions_yield` 而前轮次生成的子级仍在运行或仍欠完成时，该工具将返回 `status: "already_pending"` 以及待处理的子级（会话密钥、标签、开始时间、`running`/`completing`/`paused` 状态以及较早的产出是否已装备唤醒），而不是错误。对于运行或完成子项，不需要其他任何操作：正常结束该回合，子项的完成将作为稍后的回合到达会话中。不要重新生成、重新发送或轮询来唤醒它们。 `paused` 子级由 `waitFor: "message"` 产生，并且在收到延续之前不会完成；如果此会话拥有该后续活动，则发送一个带有 `sessions_send` 的内容。

`sessions_yield` 仅等待子会话。无需等待，它会返回 `status: "nothing_pending"`：模型指导，而不是工具故障，因此对话不会收到故障警告。分离的 `image_generate`、`video_generate` 和 `music_generate` 运行将在稍后的回合中提供结果；以此类飞行结束并且没有最终答复的转弯将保持待定状态，而不是报告丢失的答复。其等待回复为标准等待状态，或者在Telegram和Discord上回合可见进度卡，结果替换；未交付的结果会使卡片显示运行失败。

控制父级使用普通的 `sessions_send` 延续来恢复暂停的本机子级。运行时保留原始任务及其完成接收者，而不需要 `mode: "resume"`。明确的 `mode: "followup"` 故意开始一个单独的回合。复工后正常返回已完成的工作；再次屈服会使任务等待。

操作员还可以使用 `sessions.send` 网关方法及其暂停的会话密钥恢复现有子级。这会保留原始任务、请求者和父完成批次，因此父任务在子任务完成时继续。

后台 `exec` 命令无法唤醒已产生的子代理。在产生之前用`process`收集其结果；当该进程正在运行或其结果未收集时，该工具会拒绝自生成。如果旧版本让子级以这种方式等待，请使用 `sessions.send` 恢复该现有子级，并让它协调保留的结果。仅经过时间并不能证明其工作已完成。

收集器运行是例外，因为它们的结果是显式收集的而不是公布的。在收集器上下文到达工具工厂的地方，例如嵌入式运行器，不会提供轮次 `sessions_yield`，并且如果覆盖到达工具，它会返回一个错误，解释收集器结果是显式收集的。其他路径尚未传递该上下文：通过网关工具解析器的 CLI- 支持的收集器仍然可以提供该工具并接收成功的 `yielded` 结果。在每种情况下，产生的收集器都会在自己的终端上结算而不是暂停，因此它的服务员会解决而不是永久阻塞。

当其宣布的子代理安定下来时，注册表还会继续生成子代理，其中包括由 cron 生成的协调器。该内部结算唤醒保留了原始请求者并在那里交付协调器的完成。通过未作为子代理运行进行跟踪的路线的其他后续行动既不会继续暂停的运行，也不会宣布其请求者。请参阅 [Subagent 产量交接 ](/concepts/subagent-yield-handoff) 了解产量后的生命周期所有权和进度交付。

在插件运行时后续操作中，延续适用于那些使用默认交付的插件。提供自己的请求者或完成交付上下文的后续程序正在请求自己的受众，因此它作为单独的兄弟运行并在那里交付。暂停的运行保持可恢复状态，并且稍后的默认后续操作仍会继续。

当存在活动子进程时，OpenClaw 会将运行时生成的紧凑 `Active Subagents` 提示块注入到正常轮次中，以便请求者无需轮询即可查看当前子会话、运行 ID、状态、标签、任务和 `taskName` 别名。该块中的任务和标签字段被引用为数据，而不是指令，因为它们可以源自 user/model-provided 生成参数。

后来的轮次还包括 `Recently Completed Subagents`，上限为最后 30 分钟内结束的八个最新子项。这列出了执行元数据，而不是结果交付的确认。

`Child results awaiting delivery` 为请求者或控制器会话承担保留的完成义务，即使子进程在 30 分钟前结束、存在较新的执行或当前回合无法生成也是如此。它最多包含 8 个结果，最早的在前，每个结果限制为 2,000 个字符。省略的条目和截断的结果都会被标记。结果文本被引用为数据。读取此上下文并不确认或重试传递。该块仅从其输入已携带这些结果的确切请求者连续轮次中省略分派批次。其他轮次和预定的重播或重试仍然看到结果出色。

## <a id="tool%3A-subagents"></a><a id="tool-subagents"></a> 工具：`subagents`

列出请求者会话树拥有的本机子代理运行。子级只能检查其控制的子级。 ACP、shell、媒体和 cron 状态仍属于其本地所有者。

使用 `subagents` 进行按需状态和调试。使用 `sessions_yield` 来宣布完成，或者当本回合需要选定结果时，使用 `action: "wait"` 并返回 `runIds`（1-32 个 ID）和 `timeoutSeconds`（0-60，默认 30）。零超时读取快照。 `reason` 是 `completed`、`attention`、`unavailable` 或 `timeout`； `tasks` 包含授权的本机运行快照。等待不会取消执行或消耗完成交付。

列表条目包括本机 `runId`、子 `sessionKey`、状态、结果和交付状态。生成的子项保留为 `waiting`，直到其继续。对于外部等待，其控制父级可以发送带有 `sessions_send` 的延续；让步本身并不安排外部工作。

将 `action: "cancel"` 与返回的 `runId` 一起使用以停止该本机运行及其后代。取消需要现任控制人权限；对历史记录或完成结果的读取访问权限不授予控制权。 ACP会话控件，不是这个工具，自己取消ACP。

消息和控制具有不同的效果。 `sessions_send` 与 `mode: "steer"` 将指导注入活动支持的运行并拒绝空闲目标。 `mode: "followup"` 在没有转向的情况下开始或排队另一个转弯。 `mode: "notify"` 仅为目标的下一回合排队上下文，返回 `status: "queued"`、`durability: "process"` 和 `runStarted: false`；它既不会唤醒目标，也不会证明消息已被阅读。这使用现有的有界系统事件队列：网关重新启动后通知无法保留，并且当队列填满时，旧的排队事件可以被逐出。精确化身访问授权不能将超出其生命周期的通知排队。省略 `mode` 可保留自动路由。它的`targetDisposition`描述了准入，而它的`delivery.status`描述了稍后的回复传送。两者都不能证明完成。在网关处，`chat.send` 和 `queueMode: "steer"` 在支持的运行时边界上提供指导； `queueMode: "interrupt"` 替换主动执行。已弃用的 `sessions.steer` RPC 保留其记录的中断行为。操作员对暂停的本机子项的 `sessions.send` 恢复其现有任务和原始完成受众。当任务本身应该停止时使用取消。
