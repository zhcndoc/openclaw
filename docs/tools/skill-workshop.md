---
summary: "通过 Skill Workshop 审核创建和更新工作区技能"
read_when:
  - 你希望代理从聊天中创建或更新一个技能
  - 你需要审查、应用、拒绝或隔离一个生成的技能草稿
  - 你正在配置 Skill Workshop 的审批、自主性、存储或限制
title: "Skill Workshop"
sidebarTitle: "Skill Workshop"
---

Skill Workshop 是 OpenClaw 用于创建和更新工作区技能的受管路径。代理和操作员永远不会通过此路径直接写入 `SKILL.md`——他们会创建一个**提案**（包含内容、目标绑定、扫描器状态、哈希和回滚元数据的待处理草稿），只有在应用后才会成为一个生效的技能。

Skill Workshop 只会写入工作区技能。它绝不会触碰捆绑、插件、ClawHub、额外根目录、受管、个人代理或系统技能。

## 工作方式

- **优先提案：** 生成的内容将存储为 `PROPOSAL.md`，而不是
  `SKILL.md`。
- **仅 Apply 为实时写入：** create、update 和 revise 都不会更改
  现有技能。
- **工作区作用域：** create 的目标是工作区 `skills/` 根目录；update
  仅允许用于可写的工作区技能。
- **不覆盖：** 如果目标技能已存在，create 会失败。
- **哈希绑定：** update 提案绑定到当前目标哈希，如果在 apply 之前
  现有技能发生变化，则会变为 `stale`。
- **扫描器门控：** apply 会在写入前重新运行安全扫描器。
- **可恢复：** apply 在接触现有文件之前会先写入回滚元数据。
- **一致的表面：** chat、CLI 和 Gateway 都调用同一个服务。

## 生命周期

```text
创建/更新 -> pending
修订        -> pending
应用         -> applied
拒绝        -> rejected
隔离        -> quarantined
目标变更 -> stale
```

只有 `pending` 提案可以被修订、应用、拒绝或隔离。

## 聊天

向代理说明你想要的技能；它会调用 `skill_workshop` 并返回一个
提案 ID。

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

代理发起的 `apply`、`reject` 和 `quarantine` 默认会显示审批提示。
在受信任的环境中，将 `skills.workshop.approvalPolicy` 设置为 `"auto"` 可跳过该提示。

## CLI

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

# 结束处理
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "重复"
openclaw skills workshop quarantine <proposal-id> --reason "需要安全审查"
```

每个子命令都接受 `--agent <id>`（目标工作区；默认根据 cwd 推断，然后使用默认 agent）和 `--json`（结构化输出）。
`propose-create`、`propose-update` 和 `revise` 还接受 `--goal <text>` 和 `--evidence <text>`，用于与 `--proposal` 一起记录提案上下文。

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

模型使用 `skill_workshop`，并且需要一个 `action`：
`create | update | revise | list | inspect | apply | reject | quarantine`。
其他参数会根据不同的 action 而适用：

| 参数                     | 适用对象                                             | 说明                                                                 |
| ------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------- |
| `name`                   | `create`, `inspect`, `revise`                        | `create` 时必填；否则按名称解析一个待处理提案 |
| `description`            | `create`, `update`, `revise`                         | 最大 160 字节                                                        |
| `skill_name`             | `update`                                             | 现有技能名称或键                                                     |
| `proposal_content`       | `create`, `update`, `revise`                         | 存储为 `PROPOSAL.md`；受 `skills.workshop.maxSkillBytes` 上限限制    |
| `support_files`          | `create`, `update`, `revise`                         | `{ path, content }` 数组                                             |
| `goal`, `evidence`       | `create`, `update`, `revise`                         | 自由文本上下文                                                       |
| `proposal_id`            | `inspect`, `revise`, `apply`, `reject`, `quarantine` | 目标提案                                                             |
| `reason`                 | `apply`, `reject`, `quarantine`                      | 可选                                                                 |
| `query`, `status`, `limit` | `list`                                              | 过滤/分页；`limit` 最大 50，默认 20                                  |

代理在生成技能工作时必须使用 `skill_workshop`。它们不得通过 `write`、`edit`、`exec`、shell
命令或直接的文件系统操作来创建或更改提案文件。

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

| 设置                      | 默认值       | 影响                                                                                                                                                                 |
| ------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autonomous.enabled`      | `false`      | 允许 OpenClaw 在一次成功的回合后，基于持久化的对话信号创建待处理提案。                                                                                              |
| `allowSymlinkTargetWrites` | `false`      | 允许通过工作区技能符号链接执行写入，而其真实目标已列在 `skills.load.allowSymlinkTargets` 中。                                                                      |
| `approvalPolicy`          | `"pending"`  | `"pending"` 在代理发起 `apply`、`reject` 或 `quarantine` 之前需要审批提示。`"auto"` 会跳过该提示（但代理仍然需要调用该操作）。 |
| `maxPending`              | `50`         | 限制每个工作区的待处理和已隔离提案数量（1-200）。                                                                                                                    |
| `maxSkillBytes`           | `40000`      | 限制提案正文大小（以字节计）（1024-200000）。                                                                                                                        |

无论 `maxSkillBytes` 如何，提案描述始终最多为 160 字节。

## Gateway 方法

| 方法                               | 范围             |
| ---------------------------------- | ---------------- |
| `skills.proposals.list`            | `operator.read`  |
| `skills.proposals.inspect`         | `operator.read`  |
| `skills.proposals.create`          | `operator.admin` |
| `skills.proposals.update`          | `operator.admin` |
| `skills.proposals.revise`          | `operator.admin` |
| `skills.proposals.requestRevision` | `operator.admin` |
| `skills.proposals.apply`           | `operator.admin` |
| `skills.proposals.reject`          | `operator.admin` |
| `skills.proposals.quarantine`      | `operator.admin` |

`requestRevision` 仅限 Gateway（没有对应的 CLI 或 agent-tool）：它会将自由文本的修订说明转发到所属 agent 的聊天会话中，而不是直接替换 `PROPOSAL.md`，适用于那些要求 agent 修改而不是提交字面新内容的 UI。

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

| 限制                            | 值                                                                   |
| ------------------------------- | -------------------------------------------------------------------- |
| 描述                            | 160 字节                                                             |
| 提案正文                       | `skills.workshop.maxSkillBytes`（默认 40,000；硬上限 1 MiB）         |
| 支持文件                       | 每个提案 64 个                                                      |
| 支持文件大小                 | 每个 256 KiB，总计 2 MiB                                           |
| 待处理 + 隔离的提案          | 每个工作区 `skills.workshop.maxPending`（默认 50）                  |

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
