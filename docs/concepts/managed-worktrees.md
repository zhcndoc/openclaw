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

仓库指纹是对规范化的 git 公共目录和 origin URL 进行 SHA-256 哈希后得到的前 16 个十六进制字符。提供的名称必须匹配 `[a-z0-9][a-z0-9-]{0,63}`。如果不提供名称，OpenClaw 会生成 `wt-` 后跟 8 个随机十六进制字符的名称。

OpenClaw 会在请求的基础引用处创建分支 `openclaw/<name>`。如果没有基础引用，它会 fetch `origin`，在可用时使用远程默认分支；如果仓库离线或没有可用的远程，则回退到本地 `HEAD`。

## 提供被忽略的文件

在源仓库根目录添加 `.worktreeinclude`，以将选定的被忽略、未跟踪文件复制到新的 worktree 中。该文件使用 gitignore 模式语法，每行一个模式，并支持 `#` 注释：

```gitignore
.env.local
fixtures/generated/**
```

只有同时被 git 报告为“已忽略”和“未跟踪”的文件才符合条件。已跟踪文件已经通过 git 存在，因此这一步不会复制它们。OpenClaw 不会覆盖目标文件，也不会跟随符号链接目录，并且会保留已复制文件的模式位。

## 运行仓库设置

如果 `.openclaw/worktree-setup.sh` 在源仓库中存在并且可执行，OpenClaw 会以新的工作树作为当前目录来运行它。该脚本接收：

```text
OPENCLAW_SOURCE_TREE_PATH=<source checkout>
OPENCLAW_WORKTREE_PATH=<managed worktree>
```

非零退出码会中止创建，并移除新的工作树和分支。这是一个仓库本地约定；没有用于此的 OpenClaw 配置键。

## 会话工作树

通过基于工作树的会话，从当前代理的 git 工作区启动一个隔离聊天：在 Control UI 的新会话页面启用 **Worktree**（这里还提供基础分支选择器和可选的工作树名称），或者在 iOS 上使用聊天操作菜单，或在 Android 上使用 New Chat 旁边的更多操作。该选项仅适用于具备此能力的 git-backed 代理；无法预检该选项的客户端会改为显示网关错误。

当编码代理发现当前任务之外已确认的后续工作时，也可以调用 `spawn_task`。Control UI 会显示一个建议 chip，但不会立即启动任何内容，而基于 Gateway 的 TUI 会显示一个带有相同操作的交互式提示。选择 **Start in worktree** 会从建议的项目创建一个新的、由会话拥有的工作树，并将自包含的提示作为其第一轮发送；忽略该建议则不会对仓库做任何更改。建议及其 ID 是临时的，在 Gateway 重启后不会保留。

OpenClaw 仅向具有可操作 Gateway UI 的 operator 会话暴露这些工具。Channel 会话和本地/嵌入式 TUI 会话在这些界面具备可移植的类型化任务操作契约之前不会收到它们。

生成的受管工作树归该会话所有，该会话中的每次代理运行都使用其检出的版本。当工作区是仓库的子目录时，工作树会锚定在仓库根目录，且会话从其中对应的子目录运行。会话工作树创建使用方法的 `operator.write` 范围，但 `.openclaw/worktree-setup.sh` 步骤仅对 `operator.admin` 调用者运行，因为它会执行仓库代码；`.worktreeinclude` 的配置仍适用于所有调用者。删除会话时，仅在无损的情况下才会删除工作树。脏工作树或带有未推送提交的分支会保留可用；每小时清理会在 7 天无活动后对会话工作树创建快照，将最近的会话活动视为工作树活动。被移除的工作树可按下文所述从快照中恢复。

当任务目标指向的项目不是已配置的代理工作区时，`sessions.create` 可在 `worktree: true` 的同时包含一个绝对 `cwd`。该显式宿主路径要求 `operator.admin`；普通的工作树聊天创建仍然是 `operator.write`，并保持锚定在已配置的工作区。

`sessions.create` 还接受与 `worktree: true` 一起提供的 `worktreeBaseRef` 和 `worktreeName`，用于选择基础 ref 和工作树名称（分支将变为 `openclaw/<name>`）；二者都保持在 `operator.write` 范围内。创建出的工作树会在创建结果中返回，并以 `worktree: { id, branch, repoRoot }` 的形式持久化到会话行中，因此会话列表可以显示检出状态和分支。删除会话时，如果保留了一个脏的检出，会报告为 `worktreePreserved`，而不是静默地将其遗留在那里。

## 快照、清理和恢复

删除首先会创建一个合成提交，其中包含已跟踪文件和未被忽略的未跟踪文件，并将其固定在 `refs/openclaw/snapshots/<id>`。Git 忽略的文件不会包含在仓库对象数据库中；在恢复期间，`.worktreeinclude` 选中的文件会再次被复制。如果快照创建失败，删除将停止。显式强制删除可以在没有快照的情况下继续执行。

OpenClaw 应用以下清理规则：

- 在运行结束时，仅当 `git status --porcelain` 为空且 `git log HEAD --not --remotes --oneline` 未找到任何未推送提交时，才会删除工作树。否则只会释放活动锁。
- 每小时清理会为已解锁、由 Workboard 和会话拥有且空闲超过 7 天的工作树创建快照并将其删除，即使它们处于脏状态。手动工作树绝不会被自动删除。
- 当配置了 `worktrees.cleanup.maxCount` 或 `worktrees.cleanup.maxTotalSizeGb` 时，清理还会为最近活动时间最早的、由 Workboard 和会话拥有的工作树创建快照并将其删除，直到总数量和磁盘大小符合限制。所有受管理的工作树都会计入总数，但手动及其他受保护的工作树永远不会因限额而被驱逐，因此在存在符合条件的工作树之前，限制可能会一直超出。`0` 或未设置会禁用该限制。
- 快照记录可在 30 天内恢复。之后清理会删除快照引用和注册表行。
- 运行中的 OpenClaw 进程锁以及任何外部或无法识别的 git 工作树锁都会保护工作树免于垃圾回收。

恢复会在原始的快照前提交上重新创建 `openclaw/<name>`，然后将快照差异重建为未暂存的修改和未跟踪文件。这样可以使合成的快照提交不进入分支历史。快照引用仍会被记录为来源证明。

## CLI

```bash
openclaw worktrees list [--json]
openclaw worktrees create <repo-root> [--name <name>] [--base-ref <ref>] [--json]
openclaw worktrees remove <id> [--force] [--json]
openclaw worktrees restore <id> [--json]
openclaw worktrees gc [--json]
```

设置中的 Control UI **Worktrees** 页面提供相同的操作，并额外支持通过基准分支选择器进行创建，显示每个 worktree 的所有者（manual、Workboard，或带有指向其聊天链接的所属会话），并在删除操作报告快照失败时提供强制重试。其 **Cleanup** 部分可编辑在 [配置参考](/gateway/configuration-reference#worktrees) 中描述的 `worktrees.cleanup` 保留限制。

## 网关方法

| 方法                 | 用途                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| `worktrees.list`     | 列出活动的以及可恢复的 worktree 记录。                                |
| `worktrees.branches` | 列出仓库的本地和远程分支，用于 base-ref 选择器。                      |
| `worktrees.create`   | 创建或复用一个命名的受管 worktree。                                   |
| `worktrees.remove`   | 为 worktree 生成快照并将其移除。强制移除会报告 `snapshotError`。       |
| `worktrees.restore`  | 从快照中恢复已移除的 worktree。                                       |
| `worktrees.gc`       | 立即运行空闲、孤立和保留清理。                                        |

`worktrees.list` 需要 `operator.read`，而会修改状态的方法需要 `operator.admin`。`worktrees.branches` 在已配置的代理工作区中需要 `operator.write`，而任何其他主机路径都需要 `operator.admin`（与 `sessions.create` 的 cwd 限制一致）。它只读取现有引用，且绝不会 fetch，远程专属分支会以远程限定形式返回（`origin/feature-a`），因此返回的每个名称都可解析为 base ref。

## Workboard 工作区

捆绑的 [Workboard 插件](/plugins/workboard) 可以将卡片工作区实例化为受管理的工作树：

```json
{
  "kind": "worktree",
  "path": "/absolute/path/to/source-checkout",
  "branch": "main"
}
```

`path` 用于标识源 git 检出目录。`branch` 是可选项，并会成为基础 ref。当 dispatch 启动卡片的 worker 时，Workboard 会创建或重用 `wb-<card-id>`，以受管理的检出目录作为工作目录运行子代理，并将解析后的路径和分支写回卡片。由 Gateway 触发的实例化需要 `operator.admin`。在运行结束时，只有在能够证明不会丢失任何内容的情况下，Workboard 才会移除该检出目录；有未清理的工作内容或尚未推送的提交会保持可用。

目前，受沙盒限制的嵌入式代理会拒绝位于其配置的代理工作区之外的任务工作目录。在沙盒运行时支持附加的检出挂载之前，请为 Workboard 受管理工作树卡片使用非沙盒目标代理。
