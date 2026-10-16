---
summary: "OpenClaw 如何在后台审查已完成的工作并将经验教训保存为学到的技能"
read_when:
  - "您希望 OpenClaw 从其对话中学习可重用的过程"
  - "您正在决定是开启还是关闭自学"
  - "您需要了解背景审查的内容、成本或变化"
  - "什么也没学到，你想知道为什么"
title: "自学习"
sidebarTitle: "自学习"
---

自学将纠正和来之不易的程序变成[学到的技能](/tools/skill-workshop)未来的会话加载。默认情况下它处于打开状态（`skills.workshop.autonomous.mode: "auto"`）。

学习发生在三个地方：

- **前台代理**修补了误导它的学习技能，并在艰苦的多步骤工作后在同一回合中保存了程序。
- **A 后台审查** 在足够的工作后回顾对话并保存前台代理没有保存的内容。本页涵盖了它。
- **未使用技能清理** 存档已学习30天未使用的技能。请参见 [ 未使用技能清理 ](/tools/skill-workshop#unused-skill-cleanup)。

每个更改都会立即应用并且可以撤消。后台审核更改显示在 Control UI 聊天中。请参见 [ 撤消 ](/tools/skill-workshop#undo)。

## <a id="when-a-review-runs"></a> 审核运行时

OpenClaw 计算每个会话的模型迭代次数。当会话自上次审阅后达到 10 时，审阅将排队并重新开始计数。当前台回合本身更改了已学技能时，计数也会重置，因此不会再次查看代理已保存的工作。

阅读或查看学到的技能不会导致额外的复习；这些回合计入相同的 10 次迭代阈值。

排队审核将在 30 秒后开始，且没有任何代理或回复处于活动状态；同一会话中的后续活动将重新启动该等待。评论一次运行一个。前台回复从不等待审核。一旦开始，审核将保留其原始的已完成回合快照，而后续回合将继续。重置对话或更改其权限会取消审核。在更改技能之前，审核还会验证其原始转录锚点仍然有效。

这些回合不算数：

- 导致提供程序或提示错误结束。你打断的回合仍然算数。
- cron、心跳、挂钩、子代理、内存和隐身会话以及后台 Workshop 自行运行。
- 打开不报告其解析模型以及 `skill_workshop` 是否可用的运行时。嵌入式运行器和 Codex 应用程序服务器harness都会报告这两者。
- 转至工具策略隐藏 `skill_workshop` 的位置。

压缩会话符合资格。计数保存在内存中，因此网关重新启动后会重新开始计数。

## <a id="what-a-review-does"></a> 评论的作用是什么

审核会在完成的回合中分叉对话，并附加一条指令，重用前台提供程序、模型、身份验证配置文件和工具架构，以便应用提供程序的提示缓存。模型回退被禁用。它在嵌入的 OpenClaw harness上运行，且不会出现在您的成绩单中的私人会话下。这是内部系统工作，而不是新用户轮流；仅用户回复挂钩，包括顾问准入，不运行它。

评论可以用`read`、`ls`、`view_image`、`web_search`、`web_fetch`、`sessions_history`、`sessions_search`、`memory_search`和`memory_get`进行查找； `skill_workshop` 是唯一可以改变任何事情的工具。起作用的工具（例如 `exec`、`write` 或 `message`）会返回正常结果，例如 `exec is not available in this background run.` 该结果不是失败，并且审核不会重新运行您的任务。在对其进行修补、写入或存档之前，审核必须为 `view` 一项技能，并且存档需要 `absorbed_into` 或 `reason`。

审稿人将你学到的技能保留为一小组可重复的程序，因此大多数审稿不会改变任何内容。它仅更改您将再次要求的一类任务的技能，在这种情况下，下一次运行将出错或在不进行更改的情况下重做工作。证据是以下之一：

- a 更正代理方法。
- 一种经过反复试验后有效的非显而易见的方法。
- a 通过错误、缺失或过时的步骤学习了技能。

仅针对一项请求的详细信息，例如一种产品、订单、菜单、日期、地点或预订，请留在对话中。

一次审核最多会做出一项更改。它首先列出了学到的技能，然后要么加强该类任务的技能中课程变化的步骤，要么在没有涵盖它的情况下创建一项重点技能。不相关的任务类别会获得自己的技能，而不是现有任务中的新分支。当两个列出的技能涵盖同一类任务时，审核会将它们合并：它修补幸存者并用 `absorbed_into` 存档另一个技能。当转弯被中断时，它只保留在停车之前明显有效的步骤。

它不会捕获特定于环境的或暂时的故障、有关工具的负面声明、未解决的故障或猜测、有关一个代码库的知识、一次性任务、个人事实、秘密或没有具体命令、路径或 ID 的通用建议。

## <a id="what-you-see"></a> 你将看到什么

当评论更改技能时，Control UI 聊天会显示 **Learned** 行：每个更改的技能一个筹码，每个技能都会在技能工坊中打开该技能，以及一个 **Undo** 按钮。当什么都没有改变时，什么也不会出现。

频道消息默认关闭。设置 `skills.workshop.autonomous.channelNotices: true` 将通知发布到触发审核的对话。该会话的 Control UI 聊天随后将频道消息显示为纯文本，而不是 **Learned** 行：

```text
💾 Learned: updated `deploy-staging` (tightened the rollback step). Say "undo" to revert this skill change.
```

Slack 永远不会收到频道消息；它的会话仍然获得 Control UI 行。

要撤消审核更改的所有内容，请按 Control UI 行或频道通知上的 **Undo**。不渲染按钮的通道显示可复制的 `/learn undo <id>` 命令； id来自频道通知。您还可以在对话中说“撤消”，无论频道通知打开还是关闭，代理都会恢复之前的版本。请参阅 [ 技能工坊撤消 ](/tools/skill-workshop#undo)。

如果您关闭学习，或者源会话在运行时被删除、替换或更改权限模式，则审核会停止，不会进一步更改任何内容。已经做出的更改保留下来，每个更改都保存了以前的版本。网关关闭或源记录更改期间的预期取消仅出现在调试日志中。提供者和存储故障仍然会产生警告。

## <a id="turn-it-on-or-off"></a> 打开或关闭

```bash
openclaw config set skills.workshop.autonomous.mode off
openclaw config set skills.workshop.autonomous.mode auto
```

Control UI **插件→技能工坊**页面也有同样的开关。 `off` 停止后台审查和未使用的技能清理。当您通过 `/learn` 提出请求时，或在 **从过去的对话** 会话中学习时，代理仍然可以创建或更新已学习的技能。

## <a id="cost-and-privacy"></a> 成本与隐私

审核是在前台提供程序上运行的一个额外模型，并且是在大量工作之后而不是在每条消息之后运行的模型。它可以在查看和编辑技能时发出多个请求。提示缓存重用降低了重新读取对话的成本；提供商定价仍然适用。

**从历史记录中学习**在Control UI中打开一个正常的聊天，其中代理使用其配置的模型和工具读取它可以访问的早期对话。您可以观看、驾驶或停止它。开始学习不会改变学习模式。

<Warning>
  背景审查和学习会话将对话内容（包括工具输入和结果）发送到配置的模型提供程序。选择符合工作区隐私和数据处理要求的提供商和模式。
</Warning>

## <a id="troubleshooting"></a> 故障排查

### <a id="nothing-is-learned"></a> 什么也没学到

1. `skills.workshop.autonomous.mode` 是活动网关配置中的 `auto`。
2. 自上次审核以来，该会话至少进行了 10 次模型迭代，没有提供程序或提示错误。
3. 该会话是普通对话，不是 cron、heartbeat、hook、subagent 或 Incognito。
4. Tool 策略允许 `skill_workshop` 并且会话未沙盒化。在 `auto` 模式下，`openclaw doctor` 报告隐藏它的设置，除非匹配拒绝故意选择退出代理。拒绝 `skill_workshop` 或 `group:agents` 会在没有 Doctor 警告的情况下选择该特工退出。
5. 网关在 30 秒的等待时间内保持空闲状态。

运行的审查仍然可以决定没有什么值得保存。这是日常工作的预期结果。

### <a id="too-many-or-unwanted-changes"></a> 太多或不需要的更改

使用“撤消”、Control UI、**Undo** 按钮或 `openclaw skills workshop restore <name>` 撤消各个更改。使用 `openclaw skills workshop archive <name>` 归档您不需要的技能。要停止后台学习，请将模式设置为 `off`。

## <a id="related"></a> 相关内容

- [Skill Workshop](/tools/skill-workshop) 用于工具、存储、撤消和未使用的技能清理
- [创作技巧](/tools/creating-skills)手写技巧
- [`skills.workshop`的技能配置](/tools/skills-config#workshop-skills-workshop)
- [`openclaw skills workshop` 的技能 CLI](/cli/skills#skill-workshop)
