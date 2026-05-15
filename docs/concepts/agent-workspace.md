---
summary: "代理工作区：位置、布局与备份策略"
read_when:
  - 你需要解释代理工作区或其文件布局
  - 你想备份或迁移代理工作区
title: "代理工作区"
sidebarTitle: "代理工作区"
---

工作区是代理的主目录。它是用于文件工具和工作区上下文的唯一工作目录。请保持私密，并将其视为记忆。

这与 `~/.openclaw/` 不同，后者存储配置、凭据和会话。

<Warning>
工作区是**默认 cwd**，但不是一个硬沙箱。工具会基于工作区解析相对路径，但除非启用了沙箱，否则绝对路径仍可能访问主机上的其他位置。如果你需要隔离，请使用 [`agents.defaults.sandbox`](/gateway/sandboxing)（以及/或者每个代理的沙箱配置）。

当启用沙箱且 `workspaceAccess` 不是 `"rw"` 时，工具会在 `~/.openclaw/sandboxes` 下的沙箱工作区内运行，而不是在你的主机工作区中。
</Warning>

## 默认位置

- 默认：`~/.openclaw/workspace`
- 如果设置了 `OPENCLAW_PROFILE` 且不是 `"default"`，默认值会变为 `~/.openclaw/workspace-<profile>`。
- 在 `~/.openclaw/openclaw.json` 中覆盖：

```json5
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
    },
  },
}
```

`openclaw onboard`、`openclaw configure` 或 `openclaw setup` 会创建工作区，并在缺少引导文件时填充它们。

<Note>
沙箱种子复制只接受工作区内的普通文件；任何解析到源工作区外部的符号链接/硬链接别名都会被忽略。
</Note>

如果你已经自行管理工作区文件，可以禁用引导文件创建：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## 额外的工作区文件夹

较旧的安装可能创建过 `~/openclaw`。保留多个工作区目录可能会导致令人困惑的认证或状态漂移，因为一次只有一个工作区处于活动状态。

<Note>
**建议：** 只保留一个活动工作区。如果你不再使用额外的文件夹，请将它们归档或移到废纸篓（例如 `trash ~/openclaw`）。如果你有意保留多个工作区，请确保 `agents.defaults.workspace` 指向当前活动的那个。

`openclaw doctor` 在检测到额外工作区目录时会发出警告。
</Note>

## 工作区文件映射

以下是 OpenClaw 期望工作区内存在的标准文件：

<AccordionGroup>
  <Accordion title="AGENTS.md - 操作说明">
    代理的操作说明以及它应如何使用记忆。在每个会话开始时加载。适合作为规则、优先级以及“应如何表现”等细节的存放处。
  </Accordion>
  <Accordion title="SOUL.md - 人设与语气">
    人设、语气和边界。每次会话都会加载。指南：[SOUL.md personality guide](/concepts/soul)。
  </Accordion>
  <Accordion title="USER.md - 用户是谁">
    用户是谁，以及应该如何称呼他们。每次会话都会加载。
  </Accordion>
  <Accordion title="IDENTITY.md - 名字、风格、表情符号">
    代理的名字、风格和表情符号。在引导仪式期间创建/更新。
  </Accordion>
  <Accordion title="TOOLS.md - 本地工具约定">
    关于你的本地工具和约定的说明。不控制工具可用性；它只是指导。
  </Accordion>
  <Accordion title="HEARTBEAT.md - 心跳检查清单">
    供心跳运行使用的可选小型清单。请保持简短，以免消耗过多 token。
  </Accordion>
  <Accordion title="BOOT.md - 启动检查清单">
    在网关重启时自动运行的可选启动检查清单（当启用[内部钩子](/automation/hooks)时）。请保持简短；出站发送请使用消息工具。
  </Accordion>
  <Accordion title="BOOTSTRAP.md - 首次运行仪式">
    一次性的首次运行仪式。仅为全新的工作区创建。仪式完成后请删除它。
  </Accordion>
  <Accordion title="memory/YYYY-MM-DD.md - 每日记忆日志">
    每日记忆日志（每天一个文件）。建议在会话开始时读取今天和昨天的内容。
  </Accordion>
  <Accordion title="MEMORY.md - 精选长期记忆（可选）">
    精选长期记忆：持久的事实、偏好、决定以及简短摘要。将详细日志保留在 `memory/YYYY-MM-DD.md` 中，这样记忆工具就能按需检索它们，而无需将其注入到每个提示中。仅在主的私密会话中加载 `MEMORY.md`（不要在共享/群组上下文中加载）。有关工作流程和自动记忆刷新，请参阅 [Memory](/concepts/memory)。
  </Accordion>
  <Accordion title="skills/ - 工作区技能（可选）">
    工作区特定的技能。该工作区中优先级最高的技能位置。当名称冲突时，会覆盖项目代理技能、个人代理技能、托管技能、捆绑技能以及 `skills.load.extraDirs`。
  </Accordion>
  <Accordion title="canvas/ - Canvas UI 文件（可选）">
    用于节点显示的 Canvas UI 文件（例如 `canvas/index.html`）。
  </Accordion>
</AccordionGroup>

<Note>
如果任何引导文件缺失，OpenClaw 会在会话中注入“缺失文件”标记并继续。注入时较大的引导文件会被截断；可使用 `agents.defaults.bootstrapMaxChars`（默认：12000）和 `agents.defaults.bootstrapTotalMaxChars`（默认：60000）调整限制。`openclaw setup` 可以在不覆盖现有文件的情况下重建缺失的默认文件。
</Note>

## 不属于工作区的内容

以下内容位于 `~/.openclaw/` 下，不应提交到工作区仓库中：

- `~/.openclaw/openclaw.json` (配置)
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (模型认证配置文件：OAuth + API 密钥)
- `~/.openclaw/agents/<agentId>/agent/codex-home/`（每个代理的 Codex 运行时账户、配置、技能、插件和原生线程状态）
- `~/.openclaw/credentials/`（通道/提供方状态以及旧版 OAuth 导入数据）
- `~/.openclaw/agents/<agentId>/sessions/`（会话记录 + 元数据）
- `~/.openclaw/skills/`（托管技能）

如果你需要迁移会话或配置，请单独复制它们，并使其脱离版本控制。

## Git 备份（推荐，私有）

将工作区视为私密记忆。把它放入一个**私有** git 仓库，以便备份和恢复。

请在 Gateway 运行所在的机器上执行以下步骤（也就是工作区所在的位置）。

<Steps>
  <Step title="初始化仓库">
    如果已安装 git，新的工作区会自动初始化。如果此工作区还不是仓库，请运行：

    ```bash
    cd ~/.openclaw/workspace
    git init
    git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
    git commit -m "Add agent workspace"
    ```

  </Step>
  <Step title="添加私有远程仓库">
    <Tabs>
      <Tab title="GitHub 网页界面">
        1. 在 GitHub 上创建一个新的**私有**仓库。
        2. 不要使用 README 初始化（以避免合并冲突）。
        3. 复制 HTTPS 远程 URL。
        4. 添加远程并推送：

        ```bash
        git branch -M main
        git remote add origin <https-url>
        git push -u origin main
        ```
      </Tab>
      <Tab title="GitHub CLI (gh)">
        ```bash
        gh auth login
        gh repo create openclaw-workspace --private --source . --remote origin --push
        ```
      </Tab>
      <Tab title="GitLab 网页界面">
        1. 在 GitLab 上创建一个新的**私有**仓库。
        2. 不要使用 README 初始化（以避免合并冲突）。
        3. 复制 HTTPS 远程 URL。
        4. 添加远程并推送：

        ```bash
        git branch -M main
        git remote add origin <https-url>
        git push -u origin main
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="持续更新">
    ```bash
    git status
    git add .
    git commit -m "Update memory"
    git push
    ```
  </Step>
</Steps>

## 不要提交密钥

<Warning>
即使是在私有仓库中，也应避免在工作区中存储密钥：

- API 密钥、OAuth 令牌、密码或私有凭据。
- `~/.openclaw/` 下的任何内容。
- 聊天记录或敏感附件的原始转储。

如果你必须存储敏感引用，请使用占位符，并将真实密钥保存在其他地方（密码管理器、环境变量或 `~/.openclaw/`）。
</Warning>

建议的 `.gitignore` 起始内容：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 将工作区迁移到新机器

<Steps>
  <Step title="克隆仓库">
    将仓库克隆到所需路径（默认 `~/.openclaw/workspace`）。
  </Step>
  <Step title="更新配置">
    在 `~/.openclaw/openclaw.json` 中将 `agents.defaults.workspace` 设置为该路径。
  </Step>
  <Step title="填充缺失文件">
    运行 `openclaw setup --workspace <path>` 以填充任何缺失的文件。
  </Step>
  <Step title="复制会话（可选）">
    如果你需要会话，请从旧机器单独复制 `~/.openclaw/agents/<agentId>/sessions/`。
  </Step>
</Steps>

## 高级说明

- 多代理路由可以为不同代理使用不同的工作区。有关路由配置，请参见[Channel routing](/channels/channel-routing)。
- 如果启用了 `agents.defaults.sandbox`，非主会话可以使用 `agents.defaults.sandbox.workspaceRoot` 下的每会话沙箱工作区。

## 相关内容

- [Heartbeat](/gateway/heartbeat) - HEARTBEAT.md 工作区文件
- [Sandboxing](/gateway/sandboxing) - 沙箱环境中的工作区访问
- [Session](/concepts/session) - 会话存储路径
- [Standing orders](/automation/standing-orders) - 工作区文件中的持久指令
