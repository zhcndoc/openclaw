---
summary: "将 Claude Code 和 Claude Desktop 的本地状态迁移到 OpenClaw，并预览导入内容"
read_when:
  - 你来自 Claude Code 或 Claude Desktop，并希望保留指令、MCP 服务器和技能
  - 你需要了解 OpenClaw 会自动导入哪些内容，以及哪些内容只会归档
title: "从 Claude 迁移"
---

OpenClaw 通过随附的 Claude 迁移提供程序导入本地 Claude 状态。该提供程序会在更改状态前预览每一项，在计划和报告中对密钥进行脱敏，并在应用前创建经过验证的备份。

<Note>
入职导入需要全新的 OpenClaw 设置。如果你已经有本地 OpenClaw 状态，请先重置 config、credentials、sessions 和 workspace，或者在查看计划后直接使用带有 `--overwrite` 的 `openclaw migrate`。
</Note>

## 两种导入方式

<Tabs>
  <Tab title="入职向导">
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
    对于脚本化或可重复运行的场景，请使用 `openclaw migrate`。完整参考请参见 [`openclaw migrate`](/cli/migrate)。

    ```bash
    openclaw migrate claude --dry-run
    openclaw migrate apply claude --yes
    ```

    添加 `--from <path>` 可导入特定的 Claude Code home 或项目根目录。

  </Tab>
</Tabs>

## 会导入哪些内容

<AccordionGroup>
  <Accordion title="指令和记忆">
    - 项目 `CLAUDE.md` 和 `.claude/CLAUDE.md` 的内容会被复制或追加到 OpenClaw agent workspace 的 `AGENTS.md` 中。
    - 用户 `~/.claude/CLAUDE.md` 的内容会追加到 workspace 的 `USER.md` 中。

  </Accordion>
  <Accordion title="MCP 服务器">
    当存在时，会从项目 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 中导入 MCP 服务器定义。
  </Accordion>
  <Accordion title="技能和命令">
    - 带有 `SKILL.md` 文件的 Claude skills 会被复制到 OpenClaw workspace 的 skills 目录中。
    - `.claude/commands/` 或 `~/.claude/commands/` 下的 Claude 命令 Markdown 文件会被转换为 OpenClaw skills，并设置 `disable-model-invocation: true`。

  </Accordion>
</AccordionGroup>

## 仅归档的内容

提供程序会将这些内容复制到迁移报告中供人工审查，但不会将它们加载到实时 OpenClaw config 中：

- Claude hooks
- Claude permissions 和宽泛的工具 allowlists
- Claude environment defaults
- `CLAUDE.local.md`
- `.claude/rules/`
- `.claude/agents/` 或 `~/.claude/agents/` 下的 Claude subagents
- Claude Code caches、plans 和 project history directories
- Claude Desktop extensions 和 OS 存储的 credentials

OpenClaw 拒绝自动执行 hooks、信任 permission allowlists，或解码不透明的 OAuth 和 Desktop credential state。请在审查归档后，手动迁移你需要的内容。

## 来源选择

如果没有 `--from`，OpenClaw 会检查默认的 Claude Code home：`~/.claude`、采样到的 Claude Code `~/.claude.json` 状态文件，以及 macOS 上的 Claude Desktop MCP config。

当 `--from` 指向项目根目录时，OpenClaw 只会导入该项目的 Claude 文件，例如 `CLAUDE.md`、`.claude/settings.json`、`.claude/commands/`、`.claude/skills/` 和 `.mcp.json`。在项目根目录导入时，它不会读取你的全局 Claude home。

## 推荐流程

<Steps>
  <Step title="预览计划">
    ```bash
    openclaw migrate claude --dry-run
    ```

    计划会列出所有将要变更的内容，包括冲突、跳过的项目，以及从嵌套 MCP `env` 或 `headers` 字段中脱敏后的敏感值。

  </Step>
  <Step title="应用并备份">
    ```bash
    openclaw migrate apply claude --yes
    ```

    OpenClaw 会在应用前创建并验证备份。

  </Step>
  <Step title="运行 doctor">
    ```bash
    openclaw doctor
    ```

    [Doctor](/gateway/doctor) 会在导入后检查 config 或 state 问题。

  </Step>
  <Step title="重启并验证">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    确认 gateway 运行正常，并且你导入的指令、MCP 服务器和技能都已加载。

  </Step>
</Steps>

## 冲突处理

当计划报告冲突时，apply 会拒绝继续（即某个文件或 config 值已存在于目标位置）。

<Warning>
仅当明确要替换现有目标时，才重新运行并使用 `--overwrite`。提供程序仍可能会在 migration report 目录中为被覆盖的文件写入逐项备份。
</Warning>

对于全新的 OpenClaw 安装，冲突并不常见。它们通常出现在你在已经有用户编辑的设置上重新运行导入时。

## 用于自动化的 JSON 输出

```bash
openclaw migrate claude --dry-run --json
openclaw migrate apply claude --json --yes
```

在使用 `--json` 且不带 `--yes` 时，apply 会打印计划而不会修改状态。这是 CI 和共享脚本中最安全的模式。

## 故障排除

<AccordionGroup>
  <Accordion title="Claude 状态位于 ~/.claude 之外">
    传入 `--from /actual/path`（CLI）或 `--import-source /actual/path`（onboarding）。
  </Accordion>
  <Accordion title="Onboarding 拒绝在已有设置上导入">
    入职导入需要全新设置。你可以重置状态后重新进行 onboarding，或者直接使用 `openclaw migrate apply claude`，它支持 `--overwrite` 和显式的备份控制。
  </Accordion>
  <Accordion title="来自 Claude Desktop 的 MCP 服务器没有导入">
    Claude Desktop 会从平台相关路径读取 `claude_desktop_config.json`。如果 OpenClaw 没有自动检测到，请将 `--from` 指向该文件所在目录。
  </Accordion>
  <Accordion title="Claude 命令变成了禁用模型调用的 skills">
    这是设计如此。Claude 命令由用户触发，因此 OpenClaw 会将它们作为带有 `disable-model-invocation: true` 的 skills 导入。如果你希望 agent 自动调用它们，请编辑每个 skill 的 frontmatter。
  </Accordion>
</AccordionGroup>

## 相关内容

- [`openclaw migrate`](/cli/migrate)：完整 CLI 参考、插件契约和 JSON 结构。
- [迁移指南](/install/migrating)：所有迁移路径。
- [从 Hermes 迁移](/install/migrating-hermes)：另一条跨系统导入路径。
- [入职](/cli/onboard)：向导流程和非交互式标志。
- [Doctor](/gateway/doctor)：迁移后的健康检查。
- [Agent workspace](/concepts/agent-workspace)：`AGENTS.md`、`USER.md` 和 skills 的存放位置。
