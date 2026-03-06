---
summary: "代理工作区：位置、布局和备份策略"
read_when:
  - 你需要解释代理工作区或其文件布局
  - 你想备份或迁移代理工作区
title: "代理工作区"
---

# 代理工作区

工作区是代理的“家”。它是用于文件工具和工作区上下文的唯一工作目录。保持其私密性，并将其视为记忆。

这与存储配置、凭据和会话的 `~/.openclaw/` 目录是分开的。

**重要提示：** 工作区是**默认的当前工作目录 (cwd)**，而不是严格的沙箱。工具会相对于工作区解析相对路径，但绝对路径仍然可以访问主机上的其他位置，除非启用了沙箱隔离。如果你需要隔离，请使用 [`agents.defaults.sandbox`](/gateway/sandboxing)（和/或每个代理的沙箱配置）。启用沙箱且 `workspaceAccess` 不为 `"rw"` 时，工具将在 `~/.openclaw/sandboxes` 下的沙箱工作区内运行，而非主机工作区。

## 默认位置

- 默认路径：`~/.openclaw/workspace`
- 如果设置了 `OPENCLAW_PROFILE` 且不为 `"default"`，默认路径变为
  `~/.openclaw/workspace-<profile>`。
- 可在 `~/.openclaw/openclaw.json` 中覆盖：

```json5
{
  agent: {
    workspace: "~/.openclaw/workspace",
  },
}
```

`openclaw onboard`、`openclaw configure` 或 `openclaw setup` 会在缺失时创建工作区并初始化启动文件。
沙箱初始化复制仅接受常规的工作区内文件；解析到工作区外部的符号链接/硬链接别名会被忽略。

如果你已经自行管理工作区文件，可以禁用启动文件创建：

```json5
{ agent: { skipBootstrap: true } }
```

## 额外的工作区文件夹

旧版本安装可能创建了 `~/openclaw`。保留多个工作区目录可能导致认证混乱或状态漂移，因为一次只能激活一个工作区。

**建议：** 保持单个活动工作区。如果不再使用额外文件夹，归档或移动到废纸篓（例如 `trash ~/openclaw`）。
如果你有意保留多个工作区，请确保
`agents.defaults.workspace` 指向当前激活的工作区。

`openclaw doctor` 会在检测到额外工作区目录时发出警告。

## 工作区文件映射（每个文件的意义）

以下是 OpenClaw 期望工作区内包含的标准文件：

- `AGENTS.md`
  - 代理的操作说明及其如何使用记忆。
  - 每次会话开始时加载。
  - 适合放规则、优先级和“如何表现”的细节。

- `SOUL.md`
  - 角色、语气和边界。
  - 每次会话加载。

- `USER.md`
  - 用户身份及如何称呼用户。
  - 每次会话加载。

- `IDENTITY.md`
  - 代理名字、氛围及表情符号。
  - 在启动仪式中创建/更新。

- `TOOLS.md`
  - 关于本地工具和约定的备注。
  - 不控制工具可用性，仅提供指导。

- `HEARTBEAT.md`
  - 可选的短小心跳运行清单。
  - 保持简短以避免消耗过多令牌。

- `BOOT.md`
  - 可选的启动清单，在网关重启且启用内部钩子时执行。
  - 保持简洁；使用消息工具发送外发内容。

- `BOOTSTRAP.md`
  - 一次性首次运行仪式。
  - 仅为全新工作区创建。
  - 仪式完成后请删除。

- `memory/YYYY-MM-DD.md`
  - 每日记忆日志（每日一个文件）。
  - 建议在会话开始时读取当天和前一天的文件。

- `MEMORY.md`（可选）
  - 精选的长期记忆。
  - 仅在主私有会话中加载（非共享/群组上下文）。

参见 [Memory](/concepts/memory) 了解工作流和自动记忆刷新。

- `skills/`（可选）
  - 工作区特定技能。
  - 当名称冲突时覆盖管理/捆绑技能。

- `canvas/`（可选）
  - 用于节点显示的画布 UI 文件（例如 `canvas/index.html`）。

如果任何启动文件缺失，OpenClaw 会在会话中注入“缺失文件”标记并继续。注入时大文件会被截断；可通过 `agents.defaults.bootstrapMaxChars`（默认：20000）和 `agents.defaults.bootstrapTotalMaxChars`（默认：150000）调整限制。
`openclaw setup` 可以重新创建缺失的默认文件但不覆盖已存在文件。

## 工作区中不包含的内容

以下内容存放于 `~/.openclaw/`，不应提交到工作区仓库：

- `~/.openclaw/openclaw.json`（配置文件）
- `~/.openclaw/credentials/`（OAuth 令牌、API 密钥）
- `~/.openclaw/agents/<agentId>/sessions/`（会话记录和元数据）
- `~/.openclaw/skills/`（管理技能）

如果需要迁移会话或配置，请单独复制，且不要纳入版本控制。

## Git 备份（推荐，私密）

将工作区视为私密记忆。将其放入**私有** git 仓库，以便备份和恢复。

在运行 Gateway 的机器上执行以下步骤（工作区所在位置）。

### 1) 初始化仓库

如果已安装 git，全新工作区会自动初始化。如果此工作区尚未是仓库，请运行：

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
git commit -m "Add agent workspace"
```

### 2) 添加私有远程仓库（适合初学者选项）

选项 A：GitHub 网页 UI

1. 在 GitHub 上创建一个新的**私有**仓库。
2. 不要初始化 README（避免合并冲突）。
3. 复制 HTTPS 远程 URL。
4. 添加远程并推送：

```bash
git branch -M main
git remote add origin <https-url>
git push -u origin main
```

选项 B：GitHub CLI (`gh`)

```bash
gh auth login
gh repo create openclaw-workspace --private --source . --remote origin --push
```

选项 C：GitLab 网页 UI

1. 在 GitLab 上创建一个新的**私有**仓库。
2. 不要初始化 README（避免合并冲突）。
3. 复制 HTTPS 远程 URL。
4. 添加远程并推送：

```bash
git branch -M main
git remote add origin <https-url>
git push -u origin main
```

### 3) 持续更新

```bash
git status
git add .
git commit -m "Update memory"
git push
```

## 不要提交秘密信息

即使在私有仓库中，也应避免将秘密信息存储在工作区：

- API 密钥、OAuth 令牌、密码或私密凭据。
- `~/.openclaw/` 目录下的内容。
- 聊天内容原始转储或敏感附件。

如果必须存储敏感引用，请使用占位符，并将真实密钥保存在其他地方（密码管理器、环境变量或 `~/.openclaw/`）。

建议的 `.gitignore` 起始文件：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 将工作区迁移到新机器

1. 克隆仓库到目标路径（默认 `~/.openclaw/workspace`）。
2. 在 `~/.openclaw/openclaw.json` 中将 `agents.defaults.workspace` 设置为该路径。
3. 运行 `openclaw setup --workspace <path>`，以初始化缺失文件。
4. 若需要会话，单独复制旧机器的 `~/.openclaw/agents/<agentId>/sessions/`。

## 高级说明

- 多代理路由可以为每个代理使用不同工作区。请参见
  [Channel routing](/channels/channel-routing) 配置路由。
- 如果启用了 `agents.defaults.sandbox`，非主会话可以使用位于
  `agents.defaults.sandbox.workspaceRoot` 下的每会话沙箱工作区。
