---
summary: "在隔离的 git 检出中运行代理任务，并自动进行快照和清理"
read_when:
  - 你想要为代理任务使用隔离的分支和检出
  - 你正在为 Workboard 卡片配置 worktree 工作区
  - 你需要恢复或清理由 OpenClaw 管理的 worktree
title: "受管 worktree"
---

受管 worktree 为代理任务提供其自己的 git 分支和检出，而不会将临时目录放在源代码仓库内部。OpenClaw 会将它们创建在其状态目录下，把它们记录在共享状态数据库中，并在移除前对其受跟踪内容和未被忽略的未跟踪内容进行快照。

## 布局和名称

每个工作树位于：

```text
<openclaw-state-dir>/worktrees/<repo-fingerprint>/<name>
```

仓库指纹是对规范化 git 公共目录和 origin URL 进行 SHA-256 哈希后得到的前 16 个十六进制字符。提供的名称必须匹配 `[a-z0-9][a-z0-9-]{0,63}`。如果未提供名称，OpenClaw 会生成一个易读的、以甲壳类动物为主题的名称，例如 `brisk-lobster`。如果推断出的名称已被任何已注册的 worktree（包括调用方自己已移除的检出）、本地分支或非受管路径占用，则会添加数字后缀，例如 `brisk-lobster-2`；只有提供的名称才会复用或恢复调用方已有的记录。

OpenClaw 会在请求的基础引用处创建分支 `openclaw/<name>`。如果没有基础引用，它会 fetch `origin`，在可用时使用远程默认分支；如果仓库离线或没有可用的远程，则回退到本地 `HEAD`。

## 提供被忽略的文件

在源仓库根目录添加 `.worktreeinclude`，以将选定的被忽略、未跟踪文件复制到新的 worktree 中。该文件使用 gitignore 模式语法，每行一个模式，并支持 `#` 注释：

```gitignore
.env.local
fixtures/generated/**
```

只有同时被 git 报告为已忽略且未跟踪的文件才符合条件。已跟踪文件已经通过 git 存在，因此永远不会通过此步骤复制。OpenClaw 不会覆盖或更改已存在的目标文件，不会跟随符号链接目录，并会保留已复制文件的模式。它只记录实际创建的路径，因此后续对清单的编辑不会使这些文件从清理保护中消失。

## 运行仓库设置

如果 `.openclaw/worktree-setup.sh` 在源仓库中存在并且可执行，OpenClaw 会以新的工作树作为当前目录来运行它。该脚本接收：

```text
OPENCLAW_SOURCE_TREE_PATH=<source checkout>
OPENCLAW_WORKTREE_PATH=<managed worktree>
```

非零退出码会中止创建，并移除新的工作树和分支。这是一个仓库本地约定；没有用于此的 OpenClaw 配置键。

## 会话工作树

从一个由 Git 支持的文件夹开始一个隔离的聊天，并使用工作树会话：在 Control UI 的 New session 页面中，使用 **Place** 选择器选择一个 Gateway 源文件夹，然后选择 **Worktree**（可选地指定基础分支和工作树名称）。当名称被省略时，OpenClaw 会根据显式会话标签或从第一条消息生成的简短标题来推导名称，然后再回退到一个以甲壳类动物为主题的名称。只有在 Gateway 确认所选文件夹是一个 Git 检出目录之后，该选项才会出现；普通文件夹会直接运行，并且不会显示 Git 隔离控制。iOS 会从 Chat actions 中暴露相同的选项，而 Android 会在 New Chat 旁边暴露它，当活动代理工作区由 Git 支持时。

Place 选择器的 **Projects** 部分可以从已注册的项目 ID 启动相同的工作树流程。Gateway 会解析记录的检出路径，因此该路径在 `operator.write` 处仍然可用；选择任意主机文件夹仍需要 `operator.admin`。

Coding agents 还可以在发现当前任务之外已确认的后续工作时调用 `suggest_task`。Control UI 会显示一个建议标签，但不会启动任何操作，而由 Gateway 支持的 TUI 会显示一个包含相同操作的交互式提示。选择 **Start in worktree** 会从建议的项目创建一个全新的、归会话所有的工作树，并将自包含的提示作为其第一轮消息发送；忽略该建议会使仓库保持不变。建议及其 ID 是临时的，不会在 Gateway 重启后保留。

OpenClaw 仅向具有可操作 Gateway UI 的 operator 会话暴露这些工具。Channel 会话和本地/嵌入式 TUI 会话在这些界面具备可移植的类型化任务操作契约之前不会收到它们。

生成的受管工作树归该会话所有，且该会话中的每次代理运行都会使用它的检出版本。当工作区是仓库的子目录时，工作树会锚定在仓库根目录，且会话会从其中对应的子目录运行。会话工作树的创建使用该方法的 `operator.write` 范围，但仓库检出钩子和 `.openclaw/worktree-setup.sh` 步骤仅对 `operator.admin` 调用者运行，因为它们会执行仓库代码；`.worktreeinclude` 的预配仍适用于所有调用者。删除会话时，只有在无损的情况下才会移除工作树。脏工作树或包含未推送提交的分支会继续保留；每小时清理会在 7 天无活动后对会话工作树创建快照，并将最近的会话活动视为工作树活动。已移除的工作树可按下文所述从其快照中恢复。

`sessions.create` 可以包含绝对 `cwd`，以便直接在另一个 Gateway 文件夹中运行，选择源检出目录并同时使用 `worktree: true`，或设置配对节点的工作目录。具有 `operator.write` 的连接可以使用包含在任何已配置代理工作区中的 Gateway `cwd`；realpath 包含约束可以防止符号链接逃逸出该边界。位于这些工作区之外的 Gateway 路径，以及每个配对节点的工作目录，都需要 `operator.admin`。普通工作树聊天创建仍然使用 `operator.write`，并继续锚定在已配置的工作区中。

`sessions.create` 还接受与 `worktree: true` 一起使用的 `worktreeBaseRef` 和 `worktreeName`，以选择基础引用和工作树名称（分支将变为 `openclaw/<name>`）；两者仍保持在 `operator.write`。如果省略 `worktreeName`，会话标签或生成的首条消息标题会提供可读的分支名称，并带有一个以甲壳类动物为主题的回退名称。创建出的工作树会在创建结果中返回，并以 `worktree: { id, branch, repoRoot }` 的形式持久化到会话行中，因此会话列表可以显示检出信息和分支。删除会话时，如果保留了脏检出，会报告为 `worktreePreserved`，而不是默默地将其留在原处。

## 快照、清理和恢复

移除操作首先会创建一个合成提交，其中包含已跟踪文件和未被忽略的未跟踪文件，然后将其固定到 `refs/openclaw/snapshots/<id>`。被忽略的文件绝不会进入仓库对象数据库。OpenClaw 仅在分块共享状态数据库行中存储其实际提供过的被忽略文件；即使 `.worktreeinclude` 之后发生更改或消失，记录的路径集合仍然具有权威性。恢复时会从不可变快照中读取这些字节，并重新应用其完整模式。如果快照创建失败，移除操作将停止。显式强制删除可以在没有快照的情况下继续。

OpenClaw 应用以下清理规则：

- 在运行结束时，只有当 `git status --porcelain` 为空且 `git log HEAD --not --remotes --oneline` 没有找到未推送提交时，才会移除 worktree。否则只会释放活动锁。
- 每小时清理会为处于解锁状态、由 Workboard 和会话拥有、且空闲超过 7 天的 worktree 创建快照并将其移除，即使其内容有变更也是如此。手动 worktree 永远不会被自动移除。
- 快照记录在 30 天内仍可恢复。之后清理会删除快照引用和注册表行。
- 运行中的 OpenClaw 进程锁，以及任何外部或无法识别的 git worktree 锁，都会阻止 worktree 被垃圾回收。

运行结束时，清理操作会在 worktree 记录中记录其结果：无损移除；由于检出内容繁忙、存在未提交更改、存在未推送提交或存在已配置文件漂移而保留；或因错误原因而失败。使用 `openclaw worktrees list --json` 或 `worktrees.list` 查看记录的结果。

恢复操作会在原始快照提交之前的提交上重新创建 `openclaw/<name>`，然后将快照差异重新构建为未暂存的修改和未跟踪文件。这样可以将合成快照提交排除在分支历史之外。快照引用仍会作为来源记录保留。

## CLI

```bash
openclaw worktrees list [--json]
openclaw worktrees create <repo-root> [--name <name>] [--base-ref <ref>] [--json]
openclaw worktrees remove <id> [--force] [--json]
openclaw worktrees restore <id> [--json]
openclaw worktrees gc [--json]
```

设置中的控制界面 **工作树** 页面提供相同的操作，此外还可通过基础分支选择器进行创建，显示每个工作树的所有者（手动、工作看板，或拥有该工作树的会话，并带有指向其聊天的链接），并在移除操作报告快照失败时提供强制重试。

## 网关方法

| 方法                 | 用途                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| `worktrees.list`     | 列出活动的以及可恢复的 worktree 记录。                                |
| `worktrees.branches` | 列出仓库的本地和远程分支，用于 base-ref 选择器。                      |
| `worktrees.create`   | 创建或复用一个命名的受管 worktree。                                   |
| `worktrees.remove`   | 为 worktree 生成快照并将其移除。强制移除会报告 `snapshotError`。       |
| `worktrees.restore`  | 从快照中恢复已移除的 worktree。                                       |
| `worktrees.gc`       | 立即运行空闲、孤立和保留清理。                                        |

`worktrees.list` 需要 `operator.read`，而修改状态的方法需要 `operator.admin`。对于已配置的 agent 工作区，`worktrees.branches` 需要 `operator.write`；而任何其他主机路径都需要 `operator.admin`（与 `sessions.create` 的 cwd 限制一致）。它只读取现有引用，绝不会 fetch，并且仅存在于远端的分支会以远端限定形式返回（`origin/feature-a`），因此每个返回的名称都可解析为 base ref。New Session 也可以通过此方法请求一个类型化的仓库状态；普通目录或不可用的 checkout 不会返回分支，而不是让 UI 通过错误字符串来推断 Git 能力。

## Workboard 工作区

捆绑的 [Workboard 插件](/plugins/workboard) 可以将卡片工作区实例化为受管理的工作树：

```json
{
  "kind": "worktree",
  "path": "/absolute/path/to/source-checkout",
  "branch": "main"
}
```

`path` 标识源 git 检出目录。`branch` 是可选的，并会成为基础引用。对于完整主机调用方，Workboard 会创建或复用 `wb-<card-id>`，以受管理的检出目录作为其工作目录运行子代理，并将解析后的路径和分支写回卡片。网关客户端需要 `operator.admin` 才能进行完整主机实例化。运行结束时，只有在可证明无损的情况下，Workboard 才会移除该检出目录；有未清理的工作内容或未推送的提交则会继续保留可用。

对于绑定工作区的调用方，`path` 和仓库根目录必须与目标代理工作区完全匹配。此时，Workboard 会直接在该目录中运行，并记录目录工作区，而不是在主机上实例化受管理的工作树。目标必须对同一工作区使用可写、非共享的 Docker 沙箱，其实时容器哈希必须与请求的挂载和策略一致，并且不得暴露提升的执行权限、主机控制、主机范围会话、持久化的主机／节点执行，或未分类的插件和 MCP 工具。如果目标策略或实时容器范围更宽，分发会使卡片保持未认领状态，并报告不兼容的状态。
