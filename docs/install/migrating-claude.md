---
summary: "将 Claude Code 和 Claude Desktop 的本地状态迁移到 OpenClaw，并预览导入内容"
read_when:
  - "你来自 Claude Code 或 Claude Desktop，并希望保留指令、MCP 服务器和技能"
  - "你需要了解 OpenClaw 会自动导入哪些内容，以及哪些内容只会归档"
title: "从 Claude 迁移"
---

OpenClaw 通过捆绑的 Claude 迁移提供程序导入本地 Claude 状态。提供者在更改状态之前预览每个项目，并在计划和报告中编辑秘密。独立`openclaw migrate`创建经过验证的备份；新的入门路径会暂存导入并仅在验证成功后发布。

<Note>
载入导入需要全新的 OpenClaw 设置。如果您已有本地 OpenClaw 状态，请首先重置配置、凭据、会话和工作区，或者在查看计划后直接将 `openclaw migrate` 与 `--overwrite` 一起使用。
</Note>

## <a id="two-ways-to-import"></a> 两种导入方式

<Tabs>
  <Tab id="onboarding-wizard" title="设置向导">
    当向导检测到本地 Claude 状态时，会提供 Claude 选项。

    ```bash
    openclaw onboard --flow import
    ```

    或者指定特定来源：

    ```bash
    openclaw onboard --import-from claude --import-source ~/.claude
    ```

  </Tab>
  <Tab title="CLI">
    使用 `openclaw migrate` 进行脚本化或可重复运行。完整参考请参见 [`openclaw migrate`](/cli/migrate)。

    ```bash
    openclaw migrate claude --dry-run
    openclaw migrate apply claude --yes
    ```

    添加 `--from <path>` 可导入特定的 Claude Code home 或项目根目录。

  </Tab>
</Tabs>

## <a id="what-gets-imported"></a> 导入什么

<AccordionGroup>
  <Accordion id="instructions-and-memory" title="指令和记忆">
    - 项目 `CLAUDE.md` 和 `.claude/CLAUDE.md` 的内容会被复制或追加到 OpenClaw agent workspace 的 `AGENTS.md` 中。
    - 用户 `~/.claude/CLAUDE.md` 的内容会追加到 workspace 的 `USER.md` 中。

  </Accordion>
  <Accordion id="mcp-servers" title="MCP 服务器">
    MCP 服务器定义是从项目 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude 桌面 `claude_desktop_config.json`（如果存在）导入的。
  </Accordion>
  <Accordion id="skills-and-commands" title="技能和命令">
    - 带有 `SKILL.md` 文件的 Claude skills 会被复制到 OpenClaw workspace 的 skills 目录中。
    - `.claude/commands/` 或 `~/.claude/commands/` 下的 Claude 命令 Markdown 文件会被转换为 OpenClaw skills，并设置 `disable-model-invocation: true`。

  </Accordion>
</AccordionGroup>

## <a id="what-stays-archive-only"></a> 仅存档的内容

提供商将这些内容复制到迁移报告中以供手动审核，但 **not** 是否将它们加载到实时 OpenClaw 配置中：

- Claude 挂钩
- Claude permissions 和宽泛的工具 allowlists
- Claude 环境默认值
- `CLAUDE.local.md`
- `.claude/rules/`
- `.claude/agents/` 或 `~/.claude/agents/` 下的 Claude subagents
- Claude Code caches、plans 和 project history directories
- Claude 桌面扩展和 OS- 存储的凭据

OpenClaw 拒绝自动执行 hooks、信任 permission allowlists，或解码不透明的 OAuth 和 Desktop credential state。请在审查归档后，手动迁移你需要的内容。

## <a id="source-selection"></a> 来源选择

如果没有 `--from`，OpenClaw 将检查位于 `~/.claude` 的默认 Claude Code 主目录、采样的 Claude Code `~/.claude.json` 状态文件以及 Claude 桌面 MCP 配置macOS。

当 `--from` 指向项目根目录时，OpenClaw 只导入该项目的 Claude 文件，例如 `CLAUDE.md`、`.claude/settings.json`、`.claude/commands/`、`.claude/skills/` 和 `.mcp.json`。在项目根目录导入期间，它不会读取你的全局 Claude home。

## <a id="recommended-flow"></a> 推荐流程

<Steps>
  <Step id="preview-the-plan" title="预览计划">
    ```bash
    openclaw migrate claude --dry-run
    ```

    计划会列出所有将要变更的内容，包括冲突、跳过的项目，以及从嵌套 MCP `env` 或 `headers` 字段中脱敏后的敏感值。

  </Step>
  <Step id="apply-with-backup" title="申请并备份">
    ```bash
    openclaw migrate apply claude --yes
    ```

    OpenClaw 会在应用前创建并验证备份。

  </Step>
  <Step id="run-doctor" title="跑医生">
    ```bash
    openclaw doctor
    ```

    [Doctor](/gateway/doctor) 会在导入后检查 config 或 state 问题。

  </Step>
  <Step id="restart-and-verify" title="重启并验证">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    确认 gateway 运行正常，并且你导入的指令、MCP 服务器和技能都已加载。

  </Step>
</Steps>

## <a id="conflict-handling"></a> 冲突处理

当计划报告冲突时（目标中已存在文件或配置值），Apply 拒绝继续。

<Warning>
仅当有意替换现有目标时才使用 `--overwrite` 重新运行。
</Warning>

在覆盖 Claude 命令生成的技能之前，OpenClaw 会备份其整个目录，并将该项目的 `details.backupPath` 中的路径记录在 `report.json` 中。如果覆盖失败，该路径仍然可用。如果无法读取命令源，迁移会报告错误，但不更改现有技能。

对于全新的 OpenClaw 安装，冲突并不常见。它们通常出现在你在已经有用户编辑的设置上重新运行导入时。

## <a id="json-output-for-automation"></a> 用于自动化的 JSON 输出

```bash
openclaw migrate claude --dry-run --json
openclaw migrate apply claude --json --yes
```

`--yes` 是 `migrate apply` 在非交互式终端中所必需的；如果没有它，OpenClaw 不会执行应用，而是报错，因此脚本和 CI 必须显式传入 `--yes`。先使用 `--dry-run --json` 进行预览，然后在计划看起来正确时，再使用 `--json --yes` 进行应用。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="claude-state-lives-outside-claude" title="Claude 状态位于 ~/.claude 之外">
    通过 `--from /actual/path` （CLI） 或 `--import-source /actual/path`（入门引导）。
  </Accordion>
  <Accordion id="onboarding-refuses-to-import-on-an-existing-setup" title="入门引导拒绝导入现有设置">
    入职导入需要全新设置。你可以重置状态后重新进行 onboarding，或者直接使用 `openclaw migrate apply claude`，它支持 `--overwrite` 和显式的备份控制。
  </Accordion>
  <Accordion id="mcp-servers-from-claude-desktop-did-not-import" title="未从 Claude 桌面导入 MCP 服务器">
    Claude Desktop 会从平台相关路径读取 `claude_desktop_config.json`。如果 OpenClaw 没有自动检测到，请将 `--from` 指向该文件所在目录。
  </Accordion>
  <Accordion id="claude-commands-became-skills-with-model-invocation-disabled" title="Claude 命令成为禁用模型调用的技能">
    这是设计如此。Claude 命令由用户触发，因此 OpenClaw 会将它们作为带有 `disable-model-invocation: true` 的 skills 导入。如果你希望 agent 自动调用它们，请编辑每个 skill 的 frontmatter。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

- [`openclaw migrate`](/cli/migrate)：完整的 CLI 参考、插件合约和 JSON 形状。
- [迁移指南](/install/migrating)：所有迁移路径。
- [从Hermes](/install/migrating-hermes)迁移：另一个跨系统导入路径。
- [Onboarding](/cli/onboard)：向导流程和非交互式标志。
- [Doctor](/gateway/doctor)：迁移后的健康检查。
- [Agent 工作区](/concepts/agent-workspace)：`AGENTS.md`、`USER.md` 和 skills 的存放位置。
