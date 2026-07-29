---
summary: "代理工作区：位置、布局与备份策略"
read_when:
  - 你需要解释代理工作区或其文件布局
  - 你想备份或迁移代理工作区
title: "代理工作区"
sidebarTitle: "代理工作区"
---

工作区是代理的主目录：文件工具使用的工作目录
以及工作区上下文。请保持其私密，并将其视为内存。

这与 `~/.openclaw/` 不同，后者存储配置、凭据和会话。

<Warning>
工作区是**默认 cwd**，但不是一个硬沙箱。工具会基于工作区解析相对路径，但除非启用了沙箱，否则绝对路径仍可能访问主机上的其他位置。如果你需要隔离，请使用 [`agents.defaults.sandbox`](/gateway/sandboxing)（以及/或者每个代理的沙箱配置）。

当启用沙箱且 `workspaceAccess` 不是 `"rw"` 时，工具会在 `~/.openclaw/sandboxes` 下的沙箱工作区内运行，而不是在你的主机工作区中。
</Warning>

## 默认位置

- 默认值：`~/.openclaw/workspace`
- 如果设置了 `OPENCLAW_PROFILE` 且不为 `"default"`，默认值会变为 `~/.openclaw/workspace-<profile>`。
- 设置 `OPENCLAW_WORKSPACE_DIR` 时会覆盖以上两者。
- 当 `OPENCLAW_STATE_DIR` 为非默认值时，`openclaw onboard --non-interactive` 会使用 `<state-dir>/workspace`，包括初始的 `main` agent 条目。
- 未显式指定工作区的非默认 agents（`agents.entries.*`）会解析为 `<state-dir>/workspace-<agentId>`，而不是共享的默认工作区。

在 `~/.openclaw/openclaw.json` 中覆盖：

```json5
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
    },
  },
}
```

按 agent 覆盖：`agents.entries.*.workspace`。

`openclaw onboard`、`openclaw configure` 或 `openclaw setup` 会创建工作区，并在启动文件缺失时为其填充引导文件。

<Note>
沙箱种子复制只接受工作区内的普通文件；任何解析到源工作区外部的符号链接/硬链接别名都会被忽略。
</Note>

如果你已经自行管理工作区文件，请禁用引导文件创建：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## 额外的工作区文件夹

较旧的安装可能会创建 `~/openclaw`。保留多个工作区目录可能会导致令人困惑的认证问题或状态漂移，因为一次只有一个工作区处于活动状态。

<Note>
**建议：** 只保留一个活动的工作区。如果你不再使用额外的文件夹，请将它们归档或移到废纸篓（例如 `trash ~/openclaw`）。如果你有意保留多个工作区，请确保 `agents.defaults.workspace`（或每个 agent 的 `workspace` 键）指向当前活动的那个。
</Note>

## 工作区文件映射

OpenClaw 预期工作区内包含的标准文件：

<AccordionGroup>
  <Accordion title="AGENTS.md - 操作说明">
    代理的操作说明以及它应如何使用记忆。在每个会话开始时加载。适合作为规则、优先级以及“应如何表现”等细节的存放处。
  </Accordion>
  <Accordion title="SOUL.md - 人设与语气">
    人设、语气和边界。每次会话都会加载。指南：[SOUL.md 人设指南](/concepts/soul)。
  </Accordion>
  <Accordion title="USER.md - 基于指令的用户模型（可选）">
    稳定的偏好、沟通风格、关系以及当前项目上下文。将条目写为带日期的生效或已被取代的指令。每次会话都会加载，拥有单独的 4,000 字符预算。参见 [User model](/concepts/user-model)。
  </Accordion>
  <Accordion title="IDENTITY.md - 名字、风格、表情符号">
    代理的名字、风格和表情符号。在引导仪式期间创建/更新。
  </Accordion>
  <Accordion title="AGENTS.md Tools section - 本地工具约定">
    `## Tools` 部分包含本地环境说明和约定。它不控制工具可用性；仅作为指导。
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
  <Accordion title="MEMORY.md - 筛选后的长期记忆（可选）">
    筛选后的长期记忆：持久的非个人资料事实、决策和简短摘要。将详细日志保存在 `memory/YYYY-MM-DD.md` 中，以便记忆工具可以按需检索，而无需将它们注入每个提示。仅在主私人会话中加载 `MEMORY.md`（不在共享/群组上下文中）。参见 [Memory](/concepts/memory) 了解工作流和自动记忆刷新。
  </Accordion>
  <Accordion title="skills/ - 工作区技能（可选）">
    工作区特定技能。该工作区中优先级最高的技能位置，优先于项目代理技能、个人代理技能、托管技能、捆绑技能，以及名称冲突时的 `skills.load.extraDirs`。
  </Accordion>
  <Accordion title="canvas/ - Canvas UI 文件（可选）">
    用于节点显示的 Canvas UI 文件（例如 `canvas/index.html`）。
  </Accordion>
</AccordionGroup>

<Note>
如果缺少必需的引导文件，OpenClaw 会向会话中注入一个“缺少文件”标记并继续。可选的 `USER.md` 和 `MEMORY.md` 文件在不存在时会被省略。注入的大型引导文件会被截断；可通过 `agents.defaults.bootstrapMaxChars`（默认：`20000`）和 `agents.defaults.bootstrapTotalMaxChars`（默认：`60000`）调整通用限制。`USER.md` 仍保留其单独的 4,000 字符上限。`openclaw setup` 可以在不覆盖现有文件的情况下重新创建缺失的默认文件。
</Note>

## 不属于工作区的内容

以下内容位于 `~/.openclaw/` 下，不应提交到工作区仓库中：

- `~/.openclaw/openclaw.json`（配置）
- `~/.openclaw/state/openclaw.sqlite`（共享工作区设置状态和证明）
- `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`（模型认证配置文件、路由状态、常驻意图以及其他 agent 级持久化）
- `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`（会话行、转录以及每个 agent 的运行时状态）
- `~/.openclaw/agents/<agentId>/agent/codex-home/`（每个 agent 的 Codex 运行时账户、配置、技能、插件和原生线程状态）
- `~/.openclaw/credentials/`（通道/提供方状态以及旧版 OAuth 导入数据）
- `~/.openclaw/agents/<agentId>/sessions/`（旧版迁移源和归档/支持工件）
- `~/.openclaw/skills/`（受管理的技能）

如果你需要迁移会话或配置，请单独复制它们，并使它们脱离版本控制。

较旧的 OpenClaw 版本会写入 `openclaw-workspace-state.json`、
`.openclaw/workspace-state.json` 和 `.attested` 工作区旁侧文件。当前
运行时仅使用共享 SQLite 数据库来保存这些状态。如果 Doctor 报告
其中一个文件，请运行 `openclaw doctor --fix`；Doctor 会导入有效的旧版
状态，并且只会在验证数据库行之后删除源文件。

## Git 备份（推荐，私有）

将工作区视为私密记忆。把它放入一个**私有** git 仓库，以便备份和恢复。

请在 Gateway 运行所在的机器上执行以下步骤（也就是工作区所在的位置）。

<Steps>
  <Step title="初始化仓库">
    如果已安装 git，新的工作区会自动初始化。如果此工作区还不是仓库，请运行：

    ```bash
    cd ~/.openclaw/workspace
    git init
    git add AGENTS.md SOUL.md IDENTITY.md USER.md memory/
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
    git commit -m "更新记忆"
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
    如果你需要会话，请从旧机器单独复制 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`
    仅在你也需要旧版迁移输入或归档/支持工件时，才复制 `~/.openclaw/agents/<agentId>/sessions/`。
  </Step>
</Steps>

## 高级说明

- Multi-agent routing can use different workspaces per agent via `agents.entries.*.workspace`. See [Channel routing](/channels/channel-routing) for routing configuration.
- If `agents.defaults.sandbox` is enabled, non-main sessions can use per-session sandbox workspaces under `agents.defaults.sandbox.workspaceRoot`.

## 相关内容

- [心跳](/gateway/heartbeat) - 心跳监视器和 cron 临时存储
- [沙盒化](/gateway/sandboxing) - 沙盒环境中的工作区访问
- [会话](/concepts/session) - 会话存储路径
- [长期指令](/automation/standing-orders) - 工作区文件中的持久化指令
