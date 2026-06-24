---
summary: "通过 Skill Workshop 审核创建和更新工作区技能"
read_when:
  - 你希望代理从聊天中创建或更新一个技能
  - 你需要审查、应用、拒绝或隔离一个生成的技能草稿
  - 你正在配置 Skill Workshop 的审批、自主性、存储或限制
title: "Skill Workshop"
sidebarTitle: "Skill Workshop"
---

Skill Workshop 是 OpenClaw 为创建和更新工作区技能提供的受管路径。

代理和操作员不会通过此路径直接编写生效的 `SKILL.md` 文件。它们首先创建一个 **proposal**。proposal 是一个待处理的草稿，包含建议的技能内容、目标绑定、扫描器状态、哈希、支持文件元数据以及回滚元数据。只有在应用后，它才会成为生效的技能。

Skill Workshop 只会写入工作区技能。它不会修改内置、插件、ClawHub、额外根目录、受管、个人代理或系统技能。

## 工作方式

- **先提案：** 生成的技能内容会存储为 `PROPOSAL.md`，而不是 `SKILL.md`。
- **只有 apply 才会写入生效内容：** create、update 和 revise 都不会更改当前生效的技能。
- **工作区作用域：** 创建目标是工作区的 `skills/` 根目录。只有可写的工作区技能才允许更新。
- **不覆盖：** 如果目标技能已存在，create 会失败。
- **哈希绑定：** 更新提案会绑定到当前目标哈希，如果在应用前生效技能发生变化，提案就会失效。
- **扫描器门控：** apply 会在写入前重新运行扫描。
- **可恢复：** apply 会在更改生效文件之前写入回滚元数据。
- **一致的接入面：** 聊天、CLI 和 Gateway 都调用同一个 Skill Workshop 服务。

## 生命周期

```text
create/update -> pending
revise        -> pending
apply         -> applied
reject        -> rejected
quarantine    -> quarantined
target change -> stale
```

只有 `pending` 提案可以被 revise、apply、reject 或 quarantine。

## 聊天

向代理提出你想要的技能。代理会调用 `skill_workshop` 并返回一个 proposal id。

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

默认情况下，代理发起的 `apply`、`reject` 和 `quarantine` 在运行前会显示审批提示。将 `skills.workshop.approvalPolicy` 设置为 `"auto"` 可在受信任环境中跳过该提示。

## CLI

创建新的技能提案：

```bash
openclaw skills workshop propose-create \
  --name morning-catchup \
  --description "每日收件箱跟进：分诊、归档、提炼、起草、计划" \
  --proposal ./PROPOSAL.md
```

为现有的工作区技能创建更新提案：

```bash
openclaw skills workshop propose-update trip-planning --proposal ./PROPOSAL.md
```

列出并查看：

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
```

在审批前修订：

```bash
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
```

结束提案流程：

```bash
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "重复"
openclaw skills workshop quarantine <proposal-id> --reason "需要安全审查"
```

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

在 apply 时，Skill Workshop 会写入生效的 `SKILL.md`，并移除仅用于提案的字段：`status`、提案 `version` 和提案 `date`。

## 支持文件

当提议的技能需要与 `PROPOSAL.md` 并列的文件时，请使用 `--proposal-dir`：

```bash
openclaw skills workshop propose-create \
  --name weekly-update \
  --description "周五总结：统计、亮点、下周前三项重点" \
  --proposal-dir ./weekly-update-proposal
```

该目录必须包含 `PROPOSAL.md`。支持文件必须位于以下目录下：

- `assets/`
- `examples/`
- `references/`
- `scripts/`
- `templates/`

Skill Workshop 会对支持文件进行扫描、哈希处理并与提案一起存储。只有在 apply 时，它们才会被写到生效的 `SKILL.md` 旁边。

被拒绝的支持文件路径包括绝对路径、隐藏路径段、路径穿越、重叠路径、来自提案目录的可执行文件、非 UTF-8 文本、空字节，以及标准支持文件夹之外的文件。

## 代理工具

模型使用 `skill_workshop`：

```text
action: create | update | revise | list | inspect | apply | reject | quarantine
```

代理必须对生成的技能工作使用 `skill_workshop`。它们不得通过 `write`、`edit`、`exec`、shell 命令或直接文件系统操作来创建或更改提案文件。

<Note>
`skill_workshop` 是一个内置代理工具，并包含在 `tools.profile: "coding"` 中。如果更严格的策略隐藏了它，请将 `skill_workshop` 添加到当前的 `tools.allow` 列表，或者在使用不带显式 `tools.allow` 的 profile 时，使用 `tools.alsoAllow: ["skill_workshop"]`。沙箱运行不会构造宿主侧的 Skill Workshop 工具，因此请从正常的宿主侧代理会话或 CLI 中运行提案审查操作。
</Note>

## 审批与自主性

```json5
{
  skills: {
    workshop: {
      autonomous: {
        enabled: false,
      },
      allowSymlinkTargetWrites: false,
      approvalPolicy: "pending",
      maxPending: 50,
      maxSkillBytes: 40000,
    },
  },
}
```

- `autonomous.enabled`：允许 OpenClaw 在成功轮次后，根据持久化的对话信号创建待处理提案。默认值：`false`。
- `allowSymlinkTargetWrites`：允许 apply 通过工作区技能符号链接写入，其真实目标已列在 `skills.load.allowSymlinkTargets` 中。默认值：`false`。
- `approvalPolicy: "pending"`：在代理发起的 `apply`、`reject` 或 `quarantine` 之前需要审批提示。
- `approvalPolicy: "auto"`：跳过该审批提示。代理仍必须调用该动作。
- `maxPending`：限制每个工作区的待处理和已隔离提案数量。
- `maxSkillBytes`：限制提案正文大小。默认值：`40000`。

提案描述始终限制为 160 字节。

## Gateway 方法

```text
skills.proposals.list
skills.proposals.inspect
skills.proposals.create
skills.proposals.update
skills.proposals.revise
skills.proposals.apply
skills.proposals.reject
skills.proposals.quarantine
```

只读方法需要 `operator.read`。变更方法需要 `operator.admin`。

## 存储

```text
<OPENCLAW_STATE_DIR>/skill-workshop/
  proposals.json
  proposals/<proposal-id>/
    proposal.json
    PROPOSAL.md
    rollback.json
    assets/
    examples/
    references/
    scripts/
    templates/
```

默认状态目录：`~/.openclaw`。

- `proposal.json`：规范化的提案记录。
- `proposals.json`：用于快速列出的索引，可由提案文件夹重建。
- `PROPOSAL.md`：待处理的技能提案。
- `rollback.json`：在 apply 更改生效文件之前写入的恢复元数据。

## 限制

- 描述：160 字节。
- 提案正文：`skills.workshop.maxSkillBytes`（默认 40,000）。
- 支持文件：每个提案 64 个。
- 单个支持文件大小：256 KB，总计 2 MB。
- 待处理和已隔离提案：每个工作区 `skills.workshop.maxPending` 个
  （默认 50）。

## 故障排查

| 问题                                        | 解决方案                                                                                                                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Skill proposal description is too large`      | 将 `description` 缩短到 160 字节或更少。                                                                                                                                                                 |
| `Skill proposal content is too large`          | 缩短提案正文，或提高 `skills.workshop.maxSkillBytes`。                                                                                                                                         |
| `Target skill changed after proposal creation` | 根据当前目标修订提案，或创建一个新提案。                                                                                                                                   |
| `Proposal scan failed`                         | 检查扫描器发现的问题，然后修订或隔离该提案。                                                                                                                                           |
| `untrusted symlink target`                     | 仅对有意共享的技能根目录配置 `skills.load.allowSymlinkTargets` 并启用 `skills.workshop.allowSymlinkTargetWrites`。                                                                  |
| `Support file paths must be under one of...`   | 将支持文件移至 `assets/`、`examples/`、`references/`、`scripts/` 或 `templates/` 下。                                                                                                                |
| Proposal does not show in list                 | 检查所选的 `--agent` 工作区和 `OPENCLAW_STATE_DIR`。                                                                                                                                            |
| Agent cannot call `skill_workshop`             | 检查当前工具策略和运行模式。`coding` 包含该工具；限制性 `tools.allow` 策略必须显式列出它，而沙箱运行必须使用正常的宿主侧代理会话或 CLI。 |

## 相关内容

- [技能](/tools/skills)，了解加载顺序、优先级和可见性
- [创建技能](/tools/creating-skills)，了解手写 `SKILL.md`
  的基础知识
- [技能配置](/tools/skills-config)，了解完整的 `skills.workshop` schema
- [Skills CLI](/cli/skills)，了解 `openclaw skills` 命令
