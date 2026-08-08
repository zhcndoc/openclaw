---
summary: "通过 Skill Workshop 审核创建和更新工作区技能"
read_when:
  - 你想让代理从聊天中创建或更新技能
  - 你需要审查、应用、拒绝或隔离生成的技能草稿
  - 你正在配置 Skill Workshop 的批准、自主性、存储或限制
  - 你想了解自学习提案在哪里被审查
title: "Skill Workshop"
sidebarTitle: "Skill Workshop"
---

Skill Workshop 是 OpenClaw 用于创建和更新工作区技能的受管路径。通过这一路径，代理和操作员会创建一个 **提案**（包含内容、目标绑定、扫描器状态、哈希和回滚元数据的待定草稿），只有在应用后它才会成为一个生效的技能。

Skill Workshop 只会写入工作区技能。它绝不会触碰捆绑、插件、ClawHub、额外根目录、受管、个人代理或系统技能。

## 工作方式

- **先提议：** 生成的内容会存储为 `PROPOSAL.md`，而不是
  `SKILL.md`。
- **仅通过应用进行实时写入：** 创建、更新和修订都不会更改
  活跃技能。
- **工作区范围限定：** 创建目标为工作区 `skills/` 根目录；仅允许对可写的工作区技能进行更新。
- **不覆盖：** 如果目标技能已存在，则创建失败。
- **哈希绑定：** 更新提议会绑定到当前目标哈希，并且如果在应用之前实时技能发生变化，就会变为 `stale`。
- **扫描器门控：** 应用会在写入前重新运行安全扫描器。只有严重级别的发现会阻止应用；警告级别的发现仍然可见，但不会阻止它。
- **可恢复：** 应用会在触及实时文件之前写入回滚元数据。
- **一致的表面：** 聊天、CLI 和 Gateway 都调用同一服务。

## 生命周期

```text
create/update -> pending
revise        -> pending
evaluate      -> pending
apply         -> applied
reject        -> rejected
quarantine    -> quarantined
target change -> stale
```

只有 `pending` 提案可以被修订、应用、拒绝或隔离。

## 生命周期管理

Gateway 会在共享状态数据库中跟踪聚合的技能使用情况。每天一次，它会审查通过 agent autocapture 创建的已应用技能。超过 30 天未使用的技能会变为 `stale`；超过 90 天后会变为 `archived`，并从新的 agent 技能快照中排除。已归档的技能文件在磁盘上保持不变。由操作员创建的技能，包括通过 CLI 或 Gateway/Control UI 创建的提案，都被视为手动技能，且不会被整理。

置顶技能会绕过生命周期转换。陈旧的技能在被使用后，会在下一次扫描运行时恢复为 `active`。已归档的技能只能通过显式恢复来返回：

生命周期转换和恢复适用于新会话；正在运行的会话会保留其当前的技能快照。

```bash
openclaw skills curator status
openclaw skills curator pin <skill>
openclaw skills curator unpin <skill>
openclaw skills curator restore <skill>
```

所有 curator 命令都接受 `--json`。Status 还会仅作为建议报告确定性的重叠候选项；它绝不会合并技能或调用模型。

## 聊天

向代理说明你想要的技能；它会调用 `skill_workshop` 并返回一个
提案 ID。

### 从最近的工作中学习

使用 `/learn` 将当前对话或命名来源转换为一个
遵循标准的技能提案：

```text
/learn
/learn docs/runbook.md 和 https://example.com/guide；重点关注恢复
```

在没有请求时，`/learn` 会让代理从
当前对话中提炼可复用的工作流。有请求时，代理会将路径、URL、粘贴的
笔记和对话引用视为来源，同时遵守重点、范围和
命名要求。它会使用现有工具收集这些来源，然后调用
带有 `action: "create"` 的 `skill_workshop`。

生成的提案将保持 `pending`；`/learn` 从不应用它。通过常规审批流程或使用 `openclaw skills workshop` 来审查并
应用它。

创建：

```text
创建一个名为 morning-catchup 的技能，用于运行我周一的收件箱例行流程。
```

更新现有的工作区技能：

```text
更新 trip-planning，使其在预订前也检查座位图。
```

对待处理提案进行迭代：

```text
显示 morning-catchup 提案。
将其修改为也标记任何被标为 urgent 的内容。
应用 morning-catchup 提案。
```

Agent 触发的 `apply`、`reject` 和 `quarantine` 默认情况下在没有额外
审批提示的情况下运行。将 `skills.workshop.approvalPolicy` 设置为 `"pending"`
可在这些操作之前要求操作员批准。

当需要批准时，提示会标识提案 ID 和目标技能，并显示提案描述、支持文件数量和正文大小。
批准请求的执行时间受限，必须在代理工具看门狗超时前完成。如果在提示过期前没有
收到决定，生命周期操作不会运行：
提案将保持待处理且不变。可稍后在 Skill Workshop UI 中决定，或运行
`openclaw skills workshop apply|reject|quarantine <proposal-id>`。代理不应在循环中重试
已过期的生命周期操作。

## 命令行界面

```bash
# 创建
openclaw skills workshop propose-create \
  --name morning-catchup \
  --description "每日收件箱跟进：分诊、归档、提炼、起草、计划" \
  --proposal ./PROPOSAL.md

# 更新现有工作区技能
openclaw skills workshop propose-update trip-planning --proposal ./PROPOSAL.md

# 列出并查看
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>

# 在批准前修订
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md

# 对当前确切草稿运行已安装的插件评估器
openclaw skills workshop evaluate <proposal-id>

# 完成处理
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "重复"
openclaw skills workshop quarantine <proposal-id> --reason "需要安全审查"
```

每个子命令都接受 `--agent <id>`（目标工作区；默认使用从当前工作目录推断的工作区，然后使用默认代理）和 `--json`（结构化输出）。`propose-create`、`propose-update` 和 `revise` 还接受 `--goal <text>` 和 `--evidence <text>`，用于将提案上下文与 `--proposal` 一并记录。`evaluate` 通过实时 Gateway 插件注册表运行，在分发前对当前提案修订版进行快照，并接受用于外部编排的 `--correlation-id <id>`。

## 插件评估与生命周期钩子

Gateway 插件可以扩展 Skill Workshop，而无需拥有提案存储或实时技能写入权限：

- `skill_proposal_evaluate` 接收精确的候选包；对于更新提案，还会接收完整的基线技能。它返回带归属信息的发现结果、指标，以及可选的 `pass`、`revise` 或 `block` 决策。
- `skill_proposal_changed` 观察持久化的 `created`、`revised`、  
  `evaluation_completed`、`applied`、`rejected`、`quarantined` 和 `stale`  
  事件。
- `skill_changed` 观察 Workshop 以及受支持的安装/卸载路径所提交的实时技能的 `created`、`updated` 和  
  `removed` 事件。

评估可通过 CLI、控制界面、Gateway  
的 `skills.proposals.evaluate` 方法或代理的 `skill_workshop` 操作显式触发。结果会存储在确切的提案修订版本上，并记录在仅追加的提案事件账本中。评估器故障仍会作为带归属信息的结果保留；只有已完成且 `decision: "block"` 的结果会阻止应用。应用时还会重新验证经过评估的目标树，因此任何实时技能资产漂移都需要重新评估。

该生命周期支持外部优化循环，而不会将其内置其中。控制器可以消费 `skills.proposals.events.list`，评估确切的  
`revisionHash`，使用 `expectedRevisionHash` 和 `correlationId` 进行修订，然后从返回的事件序列继续执行。OpenClaw 不会调度、自动修订，也不会决定此类循环应在何时停止。

## 提案内容

在待处理期间，提案会以 `PROPOSAL.md` 的形式存储，并包含仅用于提案的 frontmatter：

```markdown
---
name: "morning-catchup"
description: "每日收件箱跟进：分诊、归档、提炼、起草、计划"
status: proposal
version: "v1"
date: "2026-05-30T00:00:00.000Z"
---
```

在应用时，Skill Workshop 会写入当前的 `SKILL.md`，并移除仅用于提案的字段：`status`、提案的 `version` 和提案的 `date`。

## 支持文件

当提议的技能除了 `PROPOSAL.md` 之外还需要文件时，请使用 `--proposal-dir`：

```bash
openclaw skills workshop propose-create \
  --name weekly-update \
  --description "周五总结：统计、亮点、下周前三项重点" \
  --proposal-dir ./weekly-update-proposal
```

该目录必须包含 `PROPOSAL.md`。支持文件必须位于
`assets/`、`examples/`、`references/`、`scripts/` 或 `templates/` 下。Skill
Workshop 会扫描、哈希并将它们与提案一同存储，然后仅在应用时将它们写入
正式的 `SKILL.md` 旁边。

拒绝的支持文件路径包括：绝对路径、隐藏路径段、路径遍历、重叠路径、可执行文件、非 UTF-8 文本、空字节，以及位于标准支持文件夹之外的路径。

## 代理工具

模型使用带有一个必需 `action` 的 `skill_workshop`：
`create | update | revise | list | inspect | evaluate | apply | reject | quarantine`。
其他参数根据操作而定：

| 参数                       | 使用于                                                         | 备注                                                               |
| -------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| `name`                     | `create`、`inspect`、`revise`                                    | `create` 必需；否则按名称解析待处理提案                                |
| `description`              | `create`、`update`、`revise`                                     | 最多 160 字节                                                        |
| `skill_name`               | `update`                                                         | 现有技能名称或键                                                    |
| `proposal_content`         | `create`、`update`、`revise`                                     | `create`/`update` 必需；`revise` 时省略以保留正文                     |
| `support_files`            | `create`、`update`、`revise`                                     | `{ path, content }` 数组                                             |
| `goal`、`evidence`         | `create`、`update`、`revise`                                     | 自由文本上下文                                                       |
| `proposal_id`              | `inspect`、`revise`、`evaluate`、`apply`、`reject`、`quarantine` | 目标提案                                                             |
| `expected_revision_hash`   | `evaluate`、`apply`、`reject`、`quarantine`                      | 拒绝过时的编排步骤                                                   |
| `correlation_id`           | `evaluate`、`revise`、`apply`、`reject`、`quarantine`            | 外部运行或实验关联标识                                               |
| `reason`                   | `apply`、`reject`、`quarantine`                                  | 可选                                                                 |
| `query`、`status`、`limit` | `list`                                                           | 筛选/分页；`limit` 最大为 50，默认为 20                              |

代理必须使用 `skill_workshop` 来处理生成的技能，不得直接创建或
修改技能或提案文件。此规则属于建议性规则，并通过提示词强制执行。目前在工具策略接口处
无法实现硬性防护。

<Note>
`skill_workshop` 是一个内置代理工具，并包含在 `tools.profile: "coding"` 中。如果更严格的策略隐藏了它，请将 `skill_workshop` 添加到当前的 `tools.allow` 列表，或者在使用不带显式 `tools.allow` 的 profile 时，使用 `tools.alsoAllow: ["skill_workshop"]`。沙箱运行不会构造宿主侧的 Skill Workshop 工具，因此请从正常的宿主侧代理会话或 CLI 中运行提案审查操作。
</Note>

## 自学习

经过大量工作后，隔离的后台审查可以将更正和成功的操作转化为 Workshop 提案；请参阅
[自学习](/tools/self-learning)。将 `skills.workshop.autonomous.mode` 设置为
`propose` 可创建待处理提案，或设置为 `auto` 通过常规 Workshop 服务应用扫描器批准的捕获结果。控制界面的 Workshop 标签页会显示自学习是否已启用；使用配置设置可选择三种模式。

### 扫描过往会话

控制界面无需启用自主自学习也可以回顾更早的工作。
打开 **插件 → Workshop** 并选择 **查找技能创意**。扫描会从最新的符合条件的会话开始，审查一个有限窗口内的重要工作。
它会跳过 cron、heartbeat、hook、subagent、ACP、plugin-owned 和内部审查会话，以及模型轮次少于六轮的对话。

审查器使用所选代理配置的模型，并接收一个经过秘密信息脱敏、大小受限的转录捆绑包。它采用与经验审查相同的保守门槛：一个具体的恢复模式，或一个稳定的流程，且能至少减少未来两次模型或工具调用。常规工作和一次性事实不应产生任何提案。

一次扫描最多可以创建或修订三个待处理提案。它不能应用、拒绝、隔离或编辑一个正在运行的技能。Workshop 会显示累计覆盖情况，例如 **已审查 20 个会话 · 6 月 18 日至今 · 发现 2 个创意**。选择 **扫描更早的工作** 可从已持久化的最早会话游标继续。可用历史耗尽后，该操作会变为 **扫描新工作**。

即使 `skills.workshop.autonomous.mode` 为 `off`，历史审查仍需手动执行。每次点击都会启动一次模型运行，因此提供商定价和数据处理条款均适用。游标和覆盖计数存储在共享的 OpenClaw 状态数据库中；转录内容不会复制到扫描状态中。

在 `propose` 和 `auto` 模式下，OpenClaw 还可以在成功完成大量工作后，以及整个代理系统进入空闲状态后，执行一次保守审查。该隔离审查最多可以起草一个待处理提案——新技能、现有工作区技能的补丁、完整正文更新，或对待处理提案的修订。它绝不会直接写入正在运行的技能，也不能应用、拒绝或隔离提案。补丁提案会引用要更改的确切现有文本；工具会根据当前技能组合出完整正文。在 `auto` 模式下，编排捕获流水线随后会通过常规的扫描器门控服务应用新技能和补丁结果；完整正文更新提案始终保持待处理状态，供操作员审查。

有关启用方式、资格、隐私和成本详情、提案阈值以及故障排除，请参阅 [自学习](/tools/self-learning)。

## 批准与自主

```json5
{
  skills: {
    workshop: {
      autonomous: {
        mode: "auto",
      },
      allowSymlinkTargetWrites: false,
      approvalPolicy: "auto",
      maxPending: 50,
      maxSkillBytes: 40000,
    },
  },
}
```

| 设置                       | 默认值   | 作用                                                                                                                                                              |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autonomous.mode`          | `"auto"` | `"off"` 禁用自主捕获，`"propose"` 创建待处理捕获，`"auto"` 通过常规 Workshop 扫描和应用路径应用捕获。        |
| `allowSymlinkTargetWrites` | `false`  | 允许应用操作写入工作区技能符号链接的真实目标，前提是该目标已列入 `skills.load.allowSymlinkTargets`。                                                 |
| `approvalPolicy`           | `"auto"` | `"auto"` 跳过代理发起的 `apply`、`reject` 或 `quarantine` 操作的额外提示（代理仍必须调用该操作）。`"pending"` 则需要批准。 |
| `maxPending`               | `50`     | 限制每个工作区中待处理和已隔离提案的数量（1-200）。                                                                                                       |
| `maxSkillBytes`            | `40000`  | 限制提案正文的字节数（1024-200000）。                                                                                                                     |

在 `propose` 和 `auto` 模式下，所选模型的隔离运行实例会决定已完成的轨迹是否达到以证据为门槛的提案标准。前台模型在回复前不会收到学习提示。后台审阅器会将前台运行保留为提案溯源信息，无法访问通用代理工具，也不能做出生命周期决策。在 `auto` 模式下，捕获管道仅会在隔离运行完成后应用由此产生的新技能和补丁提案；完整正文更新提案始终保持待处理状态，供操作员审阅，因为审阅器创建这些提案时没有机械式保留保证。只有当前台运行时报告其已解析的模型，并确认 `skill_workshop` 确实可用时，审阅才会开始。因此，受限或未知的工具策略会以故障关闭方式处理，不会创建提案。

有关完整的自主审阅行为和安全模型，请参阅 [自学习](/tools/self-learning)。

提案描述始终限制为 160 字节，与 `maxSkillBytes` 无关。

## Gateway 方法

| 方法                               | 范围             |
| ---------------------------------- | ---------------- |
| `skills.proposals.list`            | `operator.read`  |
| `skills.proposals.inspect`         | `operator.read`  |
| `skills.proposals.historyStatus`   | `operator.read`  |
| `skills.proposals.historyScan`     | `operator.admin` |
| `skills.proposals.create`          | `operator.admin` |
| `skills.proposals.update`          | `operator.admin` |
| `skills.proposals.revise`          | `operator.admin` |
| `skills.proposals.requestRevision` | `operator.admin` |
| `skills.proposals.apply`           | `operator.admin` |
| `skills.proposals.reject`          | `operator.admin` |
| `skills.proposals.quarantine`      | `operator.admin` |
| `skills.curator.status`            | `operator.read`  |
| `skills.curator.pin`               | `operator.admin` |
| `skills.curator.unpin`             | `operator.admin` |
| `skills.curator.restore`           | `operator.admin` |

`requestRevision` 仅限 Gateway（没有对应的 CLI 或 agent-tool）：它会将自由文本的修订说明转发到所属 agent 的聊天会话中，而不是直接替换 `PROPOSAL.md`，适用于那些要求 agent 修改而不是提交字面新内容的 UI。

`historyStatus` 和 `historyScan` 是 Control UI 支持方法。`historyScan`
接受 `direction: "older" | "newer"`；它始终会将结果保留为待处理
提案。

## 存储

```text
<OPENCLAW_STATE_DIR>/
  state/openclaw.sqlite
  skill-workshop/proposals/<proposal-id>/
    PROPOSAL.md
    assets/
    examples/
    references/
    scripts/
    templates/
```

默认状态目录：`~/.openclaw`。

- `state/openclaw.sqlite`：规范化的提案记录、生命周期状态、来源归属以及应用回滚元数据。
- `PROPOSAL.md`：待处理的技能提案。
- 支持文件保留在 `PROPOSAL.md` 旁边，以便操作员可以像查看普通目录一样审查拟议的技能。

`openclaw doctor --fix` 会在验证每个提案后，将之前的 `proposals.json`、`proposal.json` 和
`rollback.json` 元数据导入到 SQLite 中，然后移除
已迁移的 JSON 文件。如果某个代理配置的工作区发生变化，其较早的
提案仍会带有“之前的工作区”标记列出，而不会消失。

## 限制

| 限制                            | 数值                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------- |
| 描述                            | 160 字节                                                                     |
| 提案正文                        | `skills.workshop.maxSkillBytes`（默认 40,000；硬上限 200,000 字节）         |
| 支持文件                        | 每个提案 64 个                                                              |
| 支持文件大小                    | 每个 256 KiB，总计 2 MiB                                                    |
| 待处理 + 隔离的提案              | 每个工作区 `skills.workshop.maxPending`（默认 50）                         |

## 故障排查

| 问题                                        | 解决方案                                                                                                                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Skill proposal description is too large`      | 将 `description` 缩短到 160 字节或更少。                                                                                                                                                                 |
| `Skill proposal content is too large`          | 缩短提案正文，或提高 `skills.workshop.maxSkillBytes`。                                                                                                                                         |
| `Target skill changed after proposal creation` | 根据当前目标修订提案，或创建一个新提案。                                                                                                                                   |
| `Proposal scan failed`                         | 检查扫描器发现的问题，然后修订或隔离该提案。                                                                                                                                           |
| `untrusted symlink target`                     | 仅对有意共享的技能根目录配置 `skills.load.allowSymlinkTargets` 并启用 `skills.workshop.allowSymlinkTargetWrites`。                                                                  |
| `Support file paths must be under one of...`   | 将支持文件移至 `assets/`、`examples/`、`references/`、`scripts/` 或 `templates/` 下。                                                                                                                |
| 提案未显示在列表中                 | 检查所选的 `--agent` 工作区和 `OPENCLAW_STATE_DIR`。                                                                                                                                            |
| 代理无法调用 `skill_workshop`             | 检查当前工具策略和运行模式。`coding` 包含该工具；限制性 `tools.allow` 策略必须显式列出它，而沙箱运行必须使用正常的宿主侧代理会话或 CLI。 |

### 工具策略诊断

在 `propose` 和 `auto` 模式下，`openclaw doctor` 会为默认代理运行
`core/doctor/skill-workshop-tool-policy` 检查。如果策略隐藏了
`skill_workshop`，警告会指出第一个排除它的配置层，以及需要进行的确切
`allow` 或 `alsoAllow` 更改。较旧的运行手册可能仍使用
`openclaw plugins inspect skill-workshop`；该命令现在会说明 Skill Workshop
已内置，并在适用时输出相同的策略提示。

## 相关

- [技能](/tools/skills)：用于加载顺序、优先级和可见性
- [自学习](/tools/self-learning)：用于保守的运行后技能提议
- [创建技能](/tools/creating-skills)：用于手写 `SKILL.md`
  基础
- [技能配置](/tools/skills-config)：用于完整的 `skills.workshop` 模式
- [技能 CLI](/cli/skills)：用于 `openclaw skills` 命令
