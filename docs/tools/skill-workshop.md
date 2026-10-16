---
summary: "您的代理自行学习的技能：如何保存、撤消、未使用的技能清理、/学习、配置、存储和操作员界面"
read_when:
  - "您想知道您的代理如何保存和更新自己的技能"
  - "您想要撤消、存档或恢复学到的技能"
  - "您正在打开或关闭技能工坊学习"
title: "技能工作坊"
sidebarTitle: "技能工作坊"
---

技能工坊拥有代理为自己编写的技能，称为 **学习技能**。代理在经过多步艰苦的工作后保存了一个程序，并修复了误导它的学到的技能； 30 天内无人使用的技能将被存档。每个更改都会立即应用，首先保存以前的版本，并且可以撤消。

学到的技能是程序，而不是记忆：用户重复执行任务的方法，因此代理不会每次都重新计算出来。关于用户或世界的事实属于[内存](/concepts/memory)。有关一个代码库的知识（例如其约定、构建命令或体系结构）属于该存储库的文档或 `AGENTS.md`，在那里工作的每个代理都会读取它，因此代理不会将其保存为学习的技能。

学到的技能属于一个代理，并且始终对其可见：它们绕过 `agents.defaults.skills` 和 `agents.entries.<id>.skills` 允许列表。要隐藏一个，请将其存档。

您自己编写的技能（工作区、项目、托管、ClawHub、插件和捆绑技能）不是 Workshop 技能。在源头编辑它们；参见[创作技巧](/tools/creating-skills)。有关共享网关上的配置文件拥有的技能，请参阅 [ 个人库创作](/tools/skill-workshop/personal-library)。

## <a id="how-the-agent-learns"></a> 智能体如何学习

- **在回合期间：** 当代理使用的已学技能结果错误或不完整时，它会查看该技能并修补误导步骤。在您可能会重复进行艰苦的多步骤工作之后，它可以节省工作流程，修补涵盖此类任务的技能，或者在没有技能时创建一项技能。
- **后台审查：**在对话中累积10次模型迭代后，后台运行对其进行审查并保存任何值得保留的内容。参见[自学](/tools/self-learning)。
- **`/learn [request]`：** 要求客服人员立即从当前对话或您指定的来源保存技能。参见 [`/learn`](#learn)。
- **从历史记录中学习：** Control UI 按钮可打开正常聊天，客服人员可在其中查看之前的对话并保存找到的内容。
- **未使用的技能清理：**学习的技能30天无人使用被存档。请参见 [ 未使用技能清理 ](#unused-skill-cleanup)。

新会话中的技能负载发生了变化。正在运行的会话会保留其开始时的技能快照。

<a id="changes-and-recovery" />

## <a id="undo"></a> 撤消

当后台运行更改技能时，Control UI 聊天会显示紧凑的 **Learned** 行；每个技能名称都会在创意工坊中打开该技能。频道消息默认关闭。设置 `skills.workshop.autonomous.channelNotices: true` 将通知发布到触发审核的对话；该会话的 Control UI 聊天然后将其显示为纯文本：

```text
💾 Learned: updated `deploy-staging` (tightened the rollback step). Say "undo" to revert this skill change.
```

在对话中说“撤消”，无论通道通知打开还是关闭，代理都会使用 `skill_workshop` 恢复之前的版本。当评论没有改变时，什么也不会出现。 Slack 永远不会收到频道消息；它的会话仍然获得 Control UI 行。

要在不询问代理的情况下恢复一条评论更改的所有内容：

- 按通知上的 **撤消**。带按钮的通道将其呈现在线条下方；纯文本通道显示要复制的命令。
- 在 Control UI **Learned** 行上按 **撤消**。
- 发送`/learn undo <id>`，其中`<id>`是频道通知命令中的评论id。

每个都会恢复在审核第一次更改技能之前保存的版本，并对审核创建的技能进行存档。再次按下它会报告更改已被撤消。聊天命令需要所有者以及来自网关客户端的 `operator.admin`。

您还可以从 Control UI（技能的最新更改或其“历史记录”选项卡中的 **Undo**）或 CLI 撤消一项技能：

```bash
openclaw skills workshop restore deploy-staging
openclaw skills workshop restore deploy-staging --version <version-id>
```

恢复会在替换之前保存当前副本，因此撤消本身可以撤消。刚刚创建的技能没有早期版本；而是将其存档。

<a id="collection-review" />
<a id="weekly-curator" />

## <a id="unused-skill-cleanup"></a> 未使用的技能清理

学习开启后，OpenClaw 会存档 30 天内没有任何活动的已学技能，并在更改源中显示原因 `unused for 30 days` 和参与者 `curator`。活动是最新的：对其 `SKILL.md` 的记录读取、前台 `skill_workshop` `view` 及其最后更改（创建、修补、恢复）。少于 30 天的技能永远不会被存档。在完成转弯后，每个代理每天最多运行一次检查，并且不会延迟转弯。存档是普通版本存档：随时恢复。

清理仅针对网关进程中默认运行时为嵌入式 OpenClaw harness的代理运行。 Codex 应用程序服务器利用其本机 shell 读取技能，OpenClaw 无法将其归因于技能，因此 Codex 代理的清理工作不会进行，而不是归档正在使用的技能。

早期版本每周运行一次策展人自动化 （`skill-collection-review:<agentId>`）。它已退役：网关在升级时删除这些 cron 行并且不创建替换项。

<a id="learn" />

## `/learn`

```text
/learn
/learn docs/runbook.md; focus on recovery
```

`/learn` 是正常的前台转弯。如果没有请求，代理会保存当前对话中的可重用工作流程。通过请求，它会使用其常规工具收集命名路径、URL、注释或对话引用，并尊重您提供的任何焦点、范围或命名。它首先查看相关技能，修补涵盖该任务的技能，并仅在没有技能时创建新技能。涵盖同一类任务的相关技能被合并为一项总括技能：它修补幸存者并用 `absorbed_into` 归档其余部分。然后它会告诉你哪个技能发生了变化。如果没有什么可以持久学习的东西，那就什么也改变不了。

`/learn` 在两种学习模式下均可工作。当 `skill_workshop` 不可用时（例如在沙盒会话中或当工具策略隐藏该工具时），它会回复解释。

`/learn undo <id>` 是一个例外：使用评论 ID，它会在不进行模型转换的情况下恢复后台评论。请参见 [ 撤消 ](#undo)。 `/learn` 之后的任何其他文本都是请求。

## <a id="agent-tool"></a> 代理工具

内置的 `skill_workshop` 工具是每次学习技能更改的方式。它是`tools.profile: "coding"`的一部分；如果策略更严格，则添加到`tools.allow`或`tools.alsoAllow`。

| 操作        | 参数                                           | 作用                                                                   |
| ------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| `list`        | —                                                    | 列出实时技能和存档技能                                    |
| `view`        | `name`，可选`file_path`，`version`              | 读取当前文件或已保存版本的文件                            |
| `create`      | `name`、`content`（完整 `SKILL.md`）                  | 创造新技能                                                      |
| `patch`       | `name`、`old_text`、`new_text`、可选 `file_path` | 替换一个精确、唯一的跨度                                          |
| `write_file`  | `name`, `file_path`, `content`                       | 写入支持文件，或重写`SKILL.md`                            |
| `remove_file` | `name`, `file_path`                                  | 删除一个支持文件； `SKILL.md` 仅经过 `archive`         |
| `archive`     | `name`，可选`absorbed_into`，`reason`           | 隐藏技能； `absorbed_into` 命名现在涵盖它的实时技能 |
| `restore`     | `name`，可选`version`                           | 恢复最新保存的版本，或名为                      |

每个变异操作都接受 `reason`，这是出现在更改提要和聊天通知中的一小行。每次更改都会首先保存以前的版本。

写入在落地之前会经过验证：

- 新名称使用 1-63 个小写字母、数字或连字符，并以字母或数字开头。早期版本保存的较长名称仍会列出并易于管理。
- `SKILL.md` 需要 `name` 与技能目录匹配的 frontmatter 和 1-1024 字节的 `description`（目标为 160 左右）。它必须适合 `skills.workshop.maxSkillBytes`。
- 支持文件位于 `references/`、`templates/`、`scripts/` 或 `assets/` 下，每个最多 256 个 KiB。绝对路径、遍历和符号链接都被拒绝。
- A 关键安全扫描程序发现（包括字面上的秘密）拒绝写入并命名文件、行和规则。

背景审查必须是`view`一项现有技能才可以`patch`、`write_file`、`remove_file`或`archive`它，并且其档案需要`absorbed_into`或`reason`。前台 `view` 算作使用该技能。

成功的 `create`、`patch` 或 `write_file` 或 `SKILL.md` 可能会以最多三行 `Advisory (not blocking)` 结尾：编写引入的写入问题（超过 160 字节的描述或以“此技能”开头，正文超过 250 行或 12 KB，强调字、三个或更多 Never/Don 步骤、更新注释或日期）。写入已经落地。 `create` 还列出了代理学习的其他技能，因此代理自行决定新技能是否重复并应合并。

## <a id="configuration"></a> 配置

```json5
{
  skills: {
    workshop: {
      autonomous: { mode: "auto" },
      maxSkillBytes: 40000,
    },
  },
}
```

| 设置                                     | 默认值  | 作用                                                                                  |
| ------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `skills.workshop.autonomous.mode`           | `"auto"` | `"auto"` 启用后台审查和未使用的技能清理。 `"off"` 禁用两者。 |
| `skills.workshop.autonomous.channelNotices` | `false`  | 还向频道对话发布背景审核通知，Slack 除外。             |
| `skills.workshop.maxSkillBytes`             | `40000`  | 最大 `SKILL.md` 大小（以字节为单位）（1024-200000）。                                         |

```bash
openclaw config set skills.workshop.autonomous.mode off
openclaw config set skills.workshop.autonomous.mode auto
```

借助 `off`，当您通过 `/learn` 提出请求时，或在 **会话中学习过去的对话** 会话时，代理仍然可以创建和更新已学习的技能。有关架构，请参阅 [Skills config](/tools/skills-config#workshop-skills-workshop)。

## <a id="where-files-live"></a> 文件所在位置

```text
<agentDir>/workshop-skills/
  <name>/
    SKILL.md
    references/  templates/  scripts/  assets/
  .archive/
    <name>/<versionId>/     # full copy of the skill before each change
```

`<agentDir>` 默认为 `<state-dir>/agents/<agentId>/agent`，或设置时为 `agents.entries.<id>.agentDir`。 `<state-dir>` 是 `~/.openclaw`，除非 `OPENCLAW_STATE_DIR` 覆盖它。

每次更改之前都会保存一个版本，包括存档和恢复。每个技能保留最新的 10 个版本。存档技能没有实时目录；其最新版本恢复了它。更改源（谁更改了哪些技能、何时更改以及为何更改）位于状态数据库中，并为每个代理保留最新的 500 个条目。

## <a id="operator-surfaces"></a> 操作员表面

- **Control UI：** 打开**插件→技能工坊**。学到的技能首先列出最常用的技能（或按最近的活动或名称），每个技能都有其最新更改和 **Undo**；闲置两周的技能会被标记，因为 [unused-skill cleanup](#unused-skill-cleanup) 可能会在 30 天后将其存档。选择一项技能会显示其说明、支持文件和历史记录。从历史记录中，您可以将早期版本与当前版本进行比较、恢复它或撤消更改。 **Archive** 和 **Restore** 在活动列表和存档列表之间切换技能。页眉保存着学习模式开关和**从历史中学习**。如果无法加载学习配置，页面会显示错误和 **Retry** 按钮，同时保持技能库可用。
- **CLI：** `openclaw skills workshop list | changes | show | archive | restore`。请参阅 [ 技能 CLI](/cli/skills#skill-workshop)。
- **插件：** [`skill_changed`](/plugins/hooks/reference#skill-lifecycle) 挂钩观察每个提交的创意工坊更改。

网关方法采用可选的 `agentId`（省略时默认代理）：

| 方法                    | 范围            | 参数                          | 返回内容                                                                                         |
| ------------------------- | ---------------- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `skills.workshop.list`    | `operator.read`  | —                               | `agentId`、`mode`、`root`、现场 `skills`（带 `useCount`、`lastUsedAtMs`）、`archived` 版本 |
| `skills.workshop.changes` | `operator.read`  | `limit` (up to 500), `beforeMs` | `changes`，最新的在前                                                                         |
| `skills.workshop.read`    | `operator.read`  | `name`, `filePath`, `versionId` | `name`, `filePath`, `content`, `files`                                                          |
| `skills.workshop.archive` | `operator.admin` | `name`, `reason`                | `change`                                                                                        |
| `skills.workshop.restore` | `operator.admin` | `name`, `versionId`             | `change`                                                                                        |
| `skills.workshop.undo`    | `operator.admin` | `runId`（评论的运行 ID）     | `status`（`undone` 或 `already-undone`）、`changes` 通过此调用                            |

CLI、Control UI、聊天或网关的存档、恢复和撤消将记录为 `user` 更改。

<a id="when-an-older-backup-cannot-be-restored-automatically" />

## <a id="upgrading-from-earlier-releases"></a> 从早期版本升级

早期版本将学到的技能作为草稿进行审查。 `openclaw doctor --fix` 导出所有待处理的草稿并删除旧设置；请参阅 [ 状态迁移 ](/cli/doctor/state-migrations) 和 [ 技能配置 ](/tools/skills-config#workshop-skills-workshop)。导出的草稿未加载。如果您还需要，请让智能体以 `/learn` 保存一份。

早期的 `skills.proposals.*` 和 `skills.curator.*` 网关方法保持注册状态，但返回指向上述方法的错误。删除了 `skill_proposal_evaluate` 和 `skill_proposal_changed` 插件挂钩；参见 [ 移除表面 ](/plugins/sdk-migration/removed-surfaces#skill-workshop-proposal-hooks)。

不再读取先前每周审核在 `<agentDir>/skill-workshop/collection-backups/` 下编写的备份。手动从其中复制您需要的任何文件； OpenClaw 不会恢复它们。

## <a id="troubleshooting"></a> 故障排查

| 问题                            | 检查                                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 从来没有学到什么            | `skills.workshop.autonomous.mode` 为 `auto`，会话符合条件，并且工具策略允许 `skill_workshop`。参见[自学](/tools/self-learning#troubleshooting)。 |
| 代理无法调用 `skill_workshop` | 沙盒运行无法获取该工具。使用非沙盒会话或 CLI。否则，将该工具添加到 `tools.allow` 或 `tools.alsoAllow`。                                      |
| 写入被拒绝                 | 该错误指定了修复方法：重命名技能、更正标题、缩短描述或 `SKILL.md`，或删除标记行。                                         |
| 进行了不需要的更改        | 按通知上的 **Undo**，说“撤消”，发送 `/learn undo <id>`，或运行 `openclaw skills workshop restore <name>`。                                                           |
| 技能意外存档  | 未使用的技能清理会存档 30 天内没有活动的技能。运行 `openclaw skills workshop restore <name>`。                                                              |

在 `auto` 模式下，`openclaw doctor` 对每个代理运行 `core/doctor/skill-workshop-tool-policy` 检查。它命名隐藏 `skill_workshop` 的沙箱设置或配置层以及要进行的确切 `allow` 或 `alsoAllow` 更改。

## <a id="related"></a> 相关内容

- [自学](/tools/self-learning)用于背景审查
- [Skills](/tools/skills) 用于加载顺序和可见性
- [手写创作技巧](/tools/creating-skills) `SKILL.md`
- [`skills.workshop` 架构的技能配置](/tools/skills-config#workshop-skills-workshop)
- [`openclaw skills workshop` 的技能 CLI](/cli/skills#skill-workshop)
