---
summary: "让 OpenClaw 根据修正和已完成的大量工作提出可复用技能"
read_when:
  - 当你希望 OpenClaw 从已完成的对话中学习可复用流程时
  - 当你正在决定是否启用自主技能提议时
  - 当你需要了解自学习的安全性、成本、资格条件或故障排除时
title: "自学习"
sidebarTitle: "自学习"
---

自学习可让 OpenClaw 将对话中的有用证据转化为待处理的
[技能工作坊](/tools/skill-workshop)提案。它不会训练模型
权重，不会编辑当前生效的技能，也不会静默更改代理行为。每个学到的
流程都会保持待处理状态，直到操作员进行审查并应用。

自学习默认是**禁用**的。只有在你的工作区适合额外的
后台模型运行和对话记录审查时，才启用它。

## 启用自学习

在 Control UI 中，打开 **Plugins → Workshop** 并开启 **Self-learning**。更改会立即生效；当其他配置写入器已更新该文件时，Control UI 会刷新配置快照，并在不重新加载页面或 Gateway 的情况下重试切换。

使用 CLI：

```bash
openclaw config set skills.workshop.autonomous.enabled true --strict-json
```

或者编辑 `~/.openclaw/openclaw.json`：

```json5
{
  skills: {
    workshop: {
      autonomous: {
        enabled: true,
      },
    },
  },
}
```

再次禁用它：

```bash
openclaw config set skills.workshop.autonomous.enabled false --strict-json
```

在自学习被禁用时，用户请求创建技能、`/learn` 以及手动 Skill Workshop 操作仍可继续正常工作。

## OpenClaw 可以学习什么

自学习有两条保守路径：

1. **直接指令和更正。** OpenClaw 会检测持久性的语言
   例如“从现在起”、“下次”，以及对失败方法的更正。
   在启用自学习后，它可以将这些信号转化为待处理提议，
   而无需等待另一个提示。这条确定性路径可以将相关
   指令归纳到最多三个提议中，指向可写的工作区技能，
   或修订其自身相关的待处理提议。它也会在失败回合后运行，
   因为它捕获的是用户的指令，而不是判断完成情况。
2. **经验回顾。** 在一次成功且实质性的前台回合之后，
   OpenClaw 可以回顾已完成的工作，寻找可复用的恢复技术，
   或一种稳定的流程，只要这能在未来至少减少两次模型或工具往返。

良好的候选项包括：

- 在反复的工具或模型失败后提供可靠的恢复；
- 一个不明显的顺序约束，避免了反复出现的错误；
- 一个需要重复探索的稳定多步骤工作流；或
- 一个可复用的预检，可避免未来多次调用。

审阅者应避免在以下情况下认可：常规的成功工作、一次性请求、
个人事实、简单偏好、短暂的环境故障、泛泛的建议、未被支持的负面断言，以及秘密。

## 经验复盘何时运行

经验复盘会被刻意延迟并加以限制：

- 前台轮次必须成功完成。
- 当前轮次必须至少包含十次模型迭代。
- Cron、heartbeat、memory、overflow、hook、subagent 和 review 会话被排除在外。
- 前台运行必须已经解析出提供方和模型，并且确实曾经能够访问 `skill_workshop`。
- OpenClaw 在完成后会等待 30 秒。若同一会话中后续又有前台完成，该静默期会重新开始。
- 如果任何 agent 或 reply 运行仍处于活动状态，复盘会再等待 30 秒。
- 同一时间只会运行一个经验复盘。
- 延迟复盘是进程本地的 Gateway 工作。Gateway 在空闲窗口期间必须保持运行；一次性本地运行时和基于 CLI 的运行时不会保留足够的轨迹和工具可用性上下文来调度它。

前台答案绝不会为了学习而被延迟。失败或不符合条件的轮次不会启动经验复盘，不过当自动自治被禁用时，仍然可以将直接的用户纠正作为建议提供。

## 审查者收到的内容

后台审查者只接收当前轮，从最新的用户消息开始。渲染后的轨迹最长为 60,000 个字符；必要时，OpenClaw 会保留第一条消息和最新证据，并标记省略的中间部分。

审查者会复用已解析的提供方和模型。只要该身份可用，它就会复用前台认证配置文件，并禁用模型回退。因此，审查会在配置的提供方上额外启动一次模型运行。该运行在检查或起草提案时可能会发出一次以上的提供方请求。提供方的定价和数据处理条款同样适用于前台轮次。

在开始之前，OpenClaw 会重新加载当前运行时配置，并重新检查原始对话的有效沙箱和工具策略。如果运行处于沙箱中，策略不再允许 `skill_workshop`，或者所需的运行时事实缺失，审查将会安全失败且不会创建任何内容。

<Warning>
  启用自学习后，符合条件的对话内容，包括当前轮次中的工具输入和结果，都可以被发送给所选的模型提供方，以便进行一次额外审查。请勿在该审查会违反数据处理要求的工作区中启用它。
</Warning>

## 提案安全性

审核器在一个隔离的会话中运行，具有刻意受限的工具
范围：

- 它只能列出或检查 Workshop 提案，并创建或修改一个
  待处理提案。
- 它不能更新正在运行的技能、应用提案、拒绝提案、隔离
  提案、发送消息，或使用通用代理工具。
- 一个修改预算在模型重试之间共享，因此一次审核最多只能创建或
  修改一个提案。
- 被审核的轨迹被视为不受信任的证据，而不是给后台代理的
  指令。
- Skill Workshop 会扫描提案内容，并在写入提案状态之前拒绝识别出的字面凭据。

常规 Workshop 限制仍然适用，包括 `maxPending`、`maxSkillBytes`、
支持文件限制、扫描器检查，以及仅限工作区写入。`approvalPolicy: "auto"` 设置并不会授予后台审核器对生命周期操作的访问权限。

## 审查学习到的提案

自学习会生成与手动使用 Workshop 相同的待处理提案。  
在应用之前先检查它们：

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop apply <proposal-id>
```

对有用但尚未准备好的提案进行修订、拒绝或隔离：

```bash
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop reject <proposal-id> --reason "Too specific"
openclaw skills workshop quarantine <proposal-id> --reason "Needs security review"
```

只有应用操作会写入一个 सक्रिय的 `SKILL.md`。有关完整的生命周期和存储
模型，请参阅 [Skill Workshop](/tools/skill-workshop)。

## 配置

| 设置                                       | 默认值      | 自学习效果                                                                                                               |
| ------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `skills.workshop.autonomous.enabled`       | `false`     | 启用直接修正捕获和延迟经验审查。                                                                                           |
| `skills.workshop.approvalPolicy`           | `"pending"` | 控制正常由代理发起的生命周期操作的审批提示；它不会扩展后台审查者的权限。                                                    |
| `skills.workshop.maxPending`               | `50`        | 限制每个工作区的待处理和隔离提案数量。                                                                                     |
| `skills.workshop.maxSkillBytes`            | `40000`     | 限制提案正文大小（以字节为单位）。                                                                                         |
| `skills.workshop.allowSymlinkTargetWrites` | `false`     | 仅影响应用行为；自学习本身写入的是提案状态，而不是实时技能目标。                                                            |

有关完整的 schema、范围以及相关技能设置，请参阅
[技能配置](/tools/skills-config#workshop-skills-workshop)。

## 故障排查

### 长时间回合后没有出现提案

检查以下所有项：

1. 活动的 Gateway 配置中 `skills.workshop.autonomous.enabled` 为 `true`。
2. 该回合执行成功，并且在最近一次用户消息之后至少包含十次模型迭代。
3. 该对话是正常的前台运行，而不是计划任务、内存、钩子或子代理运行。
4. 原始运行能够访问 `skill_workshop`，并且没有处于沙箱中。
5. 系统保持空闲的时间足够长，以便进行延迟审查。
6. 长时间运行的 Gateway 进程在空闲窗口期间保持活动；一次性本地命令不会等待延迟审查。

即使符合条件的审查也可能不会产生提案。当证据未达到可复用流程的标准时，放弃提案是预期结果。

### Doctor 报告 Workshop 工具被隐藏

启用自学习时，`openclaw doctor` 会检查默认代理的实际工具策略是否允许 `skill_workshop`。请按照报告中的 `tools.allow` 或 `tools.alsoAllow` 更改进行调整，或者禁用自学习。

### 出现过多低价值提案

禁用自学习，并继续使用 `/learn` 或显式的 Workshop 请求：

```bash
openclaw config set skills.workshop.autonomous.enabled false --strict-json
```

待处理的提案在功能被禁用后仍可审查。禁用自学习不会应用、拒绝或删除它们。

## 相关内容

- [技能工作坊](/tools/skill-workshop)：用于提案审核、批准和
  存储
- [创建技能](/tools/creating-skills)：用于手动编写的技能和
  `SKILL.md` 结构
- [技能配置](/tools/skills-config)：用于所有 `skills.*` 设置
- [技能 CLI](/cli/skills)：用于工作坊和策展人命令
