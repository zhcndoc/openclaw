---
summary: "代理工作区：位置、布局与备份策略"
read_when:
  - "你需要解释代理工作区或其文件布局"
  - "你想备份或迁移代理工作区"
title: "代理工作区"
sidebarTitle: "代理工作区"
---

工作区是代理的主目录：文件工具使用的工作目录以及工作区上下文。请保持其私密，并将其视为内存。

这与 `~/.openclaw/` 不同，后者存储配置、凭据和会话。

<Warning>
工作空间是**默认的cwd**，不是硬沙箱。工具可以解析工作区的相对路径，但除非启用沙箱，否则绝对路径仍然可以到达主机上的其他位置。如果需要隔离，请使用 [`agents.defaults.sandbox`](/gateway/sandboxing)（and/or 每代理沙箱配置）。

当启用沙箱且 `workspaceAccess` 不是 `"rw"` 时，工具会在 `~/.openclaw/sandboxes` 下的沙箱工作区内运行，而不是在你的主机工作区中。
</Warning>

## <a id="default-location"></a> 默认位置

- 默认值：`~/.openclaw/workspace`
- 如果设置了 `OPENCLAW_PROFILE` 而不是 `"default"`，则默认变为 `~/.openclaw-<profile>/workspace`。
- 设置 `OPENCLAW_WORKSPACE_DIR` 时会覆盖以上两者。
- A 非默认 `OPENCLAW_STATE_DIR` 将默认工作区保留在 `<state-dir>/workspace`，包括计划维护和初始 `main` 代理条目。
- A 单独配置的代理将继承默认工作区，除非其条目设置为 `workspace`。
- 在显式多代理名册中，没有 `workspace` 的条目在配置该根时使用 `<agents.defaults.workspace>/<agentId>`，否则使用 `<state-dir>/workspace-<agentId>`。命名共享根并不会将其分配给代理。

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

每个代理覆盖：`agents.entries.*.workspace`。要将 `main` 保留在多代理名册中的现有共享根中，请将 `agents.entries.main.workspace` 显式固定到该根；仅更改 `agents.defaults.workspace` 就为取消固定的条目奠定了基础。

运行工作区选择拒绝显式提供的空白或无效代理 ID。省略选择器以使用配置的所有权，或提供预期代理 ID。

`openclaw onboard`、`openclaw configure` 或 `openclaw setup` 会创建工作区，并在启动文件缺失时为其填充引导文件。

<Note>
沙盒种子副本仅接受常规工作区内文件；在源工作区之外解析的 symlink/hardlink 别名将被忽略。
</Note>

如果你已经自行管理工作区文件，请禁用引导文件创建：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## <a id="extra-workspace-folders"></a> 额外的工作区文件夹

较旧的安装可能已创建 `~/openclaw`。每个代理使用一个已解析的工作空间；保留额外的目录不会将其角色或内存文件合并到活动工作区中。

<Note>
保留旧目录时，请保持每个代理的工作空间路径明确。在切换回较旧的工作区之前，请停止网关，配置预期路径，运行 [`openclaw doctor --fix`](/cli/doctor) 以迁移已停用的设置状态，然后重新启动。即使当前没有代理直接使用该根，Doctor 也会在仍配置的 `agents.defaults.workspace` 根中发现旧版安装文件。仅在验证要保留哪些文件后才存档未使用的文件夹。
</Note>

## <a id="workspace-file-map"></a> 工作区文件映射

使用 Control UI 中的 **Settings → Agents → Files** 编辑这些文件。 **Preview** 显示当前草稿； **Edit** 返回到编辑器，以便您可以继续键入，而 **Close** 返回到 **Preview**。

OpenClaw 预期工作区内包含的标准文件：

<AccordionGroup>
  <Accordion id="agents-md-operating-instructions" title="AGENTS.md-操作说明书">
    代理的操作说明以及它应如何使用内存。在每个会话开始时加载。放置规则、优先级和“行为方式”细节的好地方。模板：[AGENTS.md](/reference/templates/AGENTS).
  </Accordion>
  <Accordion id="soul-md-persona-and-tone" title="SOUL.md - 角色和语气">
    人设、语气和边界。每次会话都会加载。指南：[SOUL.md 人设指南](/concepts/soul)。
  </Accordion>
  <Accordion id="user-md-directive-based-user-model-optional" title="USER.md - 基于指令的用户模型（可选）">
    稳定的偏好、沟通方式、关系和活跃的项目环境。将条目编写为已注明日期的有效指令或被取代的指令。为每个会话加载单独的 4,000 个字符的预算。参见[用户模型](/concepts/user-model)。模板：[USER.md](/reference/templates/USER).
  </Accordion>
  <Accordion id="identity-md-name-vibe-emoji" title="IDENTITY.md - 名称、氛围、表情符号">
    特工的姓名、氛围和表情符号。引导仪式期间的 Created/updated。模板：[IDENTITY.md](/reference/templates/IDENTITY).
  </Accordion>
  <Accordion id="agents-md-tools-section-local-tool-conventions" title="AGENTS.md 工具部分 - 本地工具约定">
    `## Tools` 部分包含本地环境说明和约定。它不控制工具的可用性；这只是指导。模板：[AGENTS.md 工具部分](/reference/templates/AGENTS#tools)。
  </Accordion>
  <Accordion id="boot-md-startup-checklist" title="BOOT.md - 启动清单">
    当启用 [boot-md hook](/automation/hooks/bundled-hooks#boot-md) 时，可选启动检查列表在网关启动时运行。启用不同的内部挂钩不会启用 `boot-md`。保持简短；使用消息工具进行出站发送。模板：[BOOT.md](/reference/templates/BOOT).
  </Accordion>
  <Accordion id="bootstrap-md-first-run-ritual" title="BOOTSTRAP.md - 首轮仪式">
    一次性的首次运行仪式。专为全新的工作空间而创建。仪式完成后将其删除。模板：[BOOTSTRAP.md](/reference/templates/BOOTSTRAP).
  </Accordion>
  <Accordion id="memory-yyyy-mm-dd-md-daily-memory-log" title="memory/YYYY-MM-DD.md - 每日内存日志">
    每日记忆日志（每天一个文件）。建议在会话开始时读取今天和昨天的内容。
  </Accordion>
  <Accordion id="memory-md-curated-long-term-memory-optional" title="MEMORY.md - 策划的长期记忆（可选）">
    精心策划的长期记忆：持久的非侧面事实、决策和简短摘要。将详细日志保存在 `memory/YYYY-MM-DD.md` 中，以便内存工具可以按需检索它们，而无需将它们注入每个提示中。仅在主专用会话（而不是 shared/group 上下文）中加载 `MEMORY.md`。有关工作流程和自动内存刷新，请参阅 [Memory](/concepts/memory)。
  </Accordion>
  <Accordion id="skills-workspace-skills-optional" title="技能/ - 工作空间技能（可选）">
    工作区特定技能。该工作区中优先级最高的技能位置，优先于项目代理技能、个人代理技能、托管技能、捆绑技能，以及名称冲突时的 `skills.load.extraDirs`。
  </Accordion>
</AccordionGroup>

<Note>
如果缺少必需的引导文件，OpenClaw 会向会话中注入一个“缺少文件”标记并继续。可选的 `USER.md` 和 `MEMORY.md` 文件在不存在时会被省略。注入的大型引导文件会被截断；可通过 `agents.defaults.bootstrapMaxChars`（默认：`20000`）和 `agents.defaults.bootstrapTotalMaxChars`（默认：`60000`）调整通用限制。`USER.md` 仍保留其单独的 4,000 字符上限。`openclaw setup` 可以在不覆盖现有文件的情况下重新创建缺失的默认文件。
</Note>

工作区文档编辑器和 `agents.files.set` 每个文件最多接受 2 个 MiB 的 UTF-8 文本。在替换现有文档之前，较大的保存会被拒绝。此字节限制与提示截断设置和身份表单的头像支持分开。

## <a id="what-is-not-in-the-workspace"></a> 工作区中的NOT是什么

这些位于 `~/.openclaw/` 下，并且应该将 NOT 提交到工作区存储库：

- `~/.openclaw/openclaw.json`（配置）
- `~/.openclaw/state/openclaw.sqlite`（共享工作区设置状态和证明）
- `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`（模型身份验证配置文件、路由状态、常设意图、会话行、记录、内存索引状态和其他每个代理运行时持久性）
- `~/.openclaw/agents/<agentId>/agent/codex-home/`（每个 agent 的 Codex 运行时账户、配置、技能、插件和原生线程状态）
- `~/.openclaw/credentials/`（channel/provider 状态加上旧版 OAuth 导入数据）
- `~/.openclaw/agents/<agentId>/sessions/`（旧迁移源和 archive/support 工件）
- `~/.openclaw/skills/`（受管理的技能）

如果你需要迁移会话或配置，请单独复制它们，并使它们脱离版本控制。

较旧的 OpenClaw 版本编写了 `openclaw-workspace-state.json` 和 `.attested` 工作区边车。当前运行时仅使用该状态的共享 SQLite 数据库。如果 Doctor 报告这些文件之一，请运行 `openclaw doctor --fix`； Doctor 仅在验证数据库行后导入有效的旧状态并删除源。 `workspace-attestations/` 下的空保留哈希文件将被丢弃，因为它们不包含可导入的状态；其他不可读的来源保留在原处，Doctor 命名它们的路径。

7 月之前的 `.openclaw/workspace-state.json` 布局超出了支持的迁移窗口。通过`2026.9.7`升级并在更新前运行`openclaw doctor --fix`；当前的医生保留该文件不变。请参阅 [ 保留政策](/gateway/doctor/config-migrations#retention-policy)。

## <a id="git-backup-(recommended%2C-private)"></a><a id="git-backup-recommended-private"></a> Git 备份（推荐，私有）

将工作区视为私密记忆。把它放入一个**私有** git 仓库，以便备份和恢复。

Git 是可选的。空的 `.git` 目录被视为非 Git 工作区并且保持不变。部分 Git 元数据或缺少元数据的链接工作树仍然会阻止使用签出保留指导的 Git 操作；在重试之前修复原始存储库元数据。

请在 Gateway 运行所在的机器上执行以下步骤（也就是工作区所在的位置）。

<Steps>
  <Step id="initialize-the-repo" title="初始化存储库">
    如果已安装 git，新的工作区会自动初始化。如果此工作区还不是仓库，请运行：

    ```bash
    cd ~/.openclaw/workspace
    git init
    git add AGENTS.md SOUL.md IDENTITY.md USER.md memory/
    git commit -m "Add agent workspace"
    ```

  </Step>
  <Step id="add-a-private-remote" title="添加私人遥控器">
    <Tabs>
      <Tab id="github-web-ui" title="GitHub 网页 UI">
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
      <Tab id="gitlab-web-ui" title="GitLab 网页 UI">
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
  <Step id="ongoing-updates" title="持续更新">
    ```bash
    git status
    git add .
    git commit -m "Update memory"
    git push
    ```
  </Step>
</Steps>

## <a id="do-not-commit-secrets"></a> 不要提交密钥

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

## <a id="moving-the-workspace-to-a-new-machine"></a> 将工作区迁移到新机器

<Steps>
  <Step id="clone-the-repo" title="克隆存储库">
    将仓库克隆到所需路径（默认 `~/.openclaw/workspace`）。
  </Step>
  <Step id="update-config" title="更新配置">
    将 `agents.entries.<agentId>.workspace` 设置为 `~/.openclaw/openclaw.json` 中应使用它的代理的克隆路径。没有每个代理覆盖的独家代理可以使用 `agents.defaults.workspace` 代替；在多代理名册中，该设置仅更改未固定条目的基本目录。
  </Step>
  <Step id="verify-the-workspace" title="验证工作区">
    在启动网关之前，运行 `openclaw agents list` 并确认预期代理指向克隆路径。移动现有工作区不需要重新运行入门引导。
  </Step>
  <Step id="copy-sessions-optional" title="复制会话（可选）">
    如果需要会话，请单独从旧机器复制 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`。仅当您还需要旧迁移输入或 archive/support 工件时才复制 `~/.openclaw/agents/<agentId>/sessions/`。
  </Step>
</Steps>

## <a id="advanced-notes"></a> 高级说明

- 多代理路由可以通过 `agents.entries.*.workspace` 使用每个代理的不同工作区。路由配置请参见[通道路由](/channels/channel-routing)。
- 如果启用 `agents.defaults.sandbox`，非主会话可以使用 `agents.defaults.sandbox.workspaceRoot` 下的每会话沙箱工作区。

## <a id="related"></a> 相关内容

- [Backups](/install/backups) - 状态和工作区的存档、每个数据库快照、调度和异地副本
- [Bootstrapping](/start/bootstrapping) - 播种新工作区及其身份文件的首次运行仪式
- [Default AGENTS.md](/reference/AGENTS.default) - 放置在工作区中的默认代理指令和技能名册
- [心跳](/gateway/heartbeat) - 心跳监视器和 cron 临时存储
- [沙盒化](/gateway/sandboxing) - 沙盒环境中的工作区访问
- [会话](/concepts/session) - 会话存储路径
- [长期指令](/automation/standing-orders) - 工作区文件中的持久化指令
- [系统提示](/concepts/system-prompt) - 工作空间文件被注入到提示中
