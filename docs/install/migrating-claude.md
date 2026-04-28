---
summary: "将 Claude Code 和 Claude Desktop 的本地状态迁移到 OpenClaw，并提供预览式导入"
read_when:
  - 你来自 Claude Code 或 Claude Desktop，希望保留指令、MCP 服务器和技能
  - 你需要了解 OpenClaw 会自动导入哪些内容，以及哪些内容仅归档保留
title: "从 Claude 迁移"
---

OpenClaw 通过捆绑的 Claude 迁移提供程序导入本地 Claude 状态。该提供程序会在更改状态之前预览每一项，在计划和报告中对密钥进行脱敏，并在应用之前创建经过验证的备份。

<Note>
入门导入需要全新的 OpenClaw 安装。如果你已经有本地 OpenClaw 状态，请先重置 config、credentials、sessions 和 workspace，或者在查看计划后直接使用带 `--overwrite` 的 `openclaw migrate`。
</Note>

## 两种导入方式

<Tabs>
  <Tab title="入门向导">
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
    对于脚本化或可重复执行的运行，请使用 `openclaw migrate`。完整参考请参见 [`openclaw migrate`](/cli/migrate)。

    ```bash
    openclaw migrate claude --dry-run
    openclaw migrate apply claude --yes
    ```

    添加 `--from <path>` 可导入特定的 Claude Code 主目录或项目根目录。

  </Tab>
</Tabs>

## 会导入什么

<AccordionGroup>
  <Accordion title="指令和记忆">
    - 项目 `CLAUDE.md` 和 `.claude/CLAUDE.md` 的内容会被复制或追加到 OpenClaw agent workspace 的 `AGENTS.md` 中。
    - 用户 `~/.claude/CLAUDE.md` 的内容会被追加到 workspace 的 `USER.md` 中。
  </Accordion>
  <Accordion title="MCP 服务器">
    当存在时，MCP 服务器定义会从项目 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop 的 `claude_desktop_config.json` 中导入。
  </Accordion>
  <Accordion title="技能和命令">
    - 带有 `SKILL.md` 文件的 Claude skills 会被复制到 OpenClaw workspace 的 skills 目录中。
    - `.claude/commands/` 或 `~/.claude/commands/` 下的 Claude 命令 Markdown 文件会被转换为 OpenClaw skills，并带有 `disable-model-invocation: true`。
  </Accordion>
</AccordionGroup>

## 保持为仅归档内容的项目

提供程序会将这些内容复制到迁移报告中供人工审查，但**不会**将它们加载到实时 OpenClaw 配置中：

- Claude hooks
- Claude permissions 和广泛的工具 allowlists
- Claude 环境默认值
- `CLAUDE.local.md`
- `.claude/rules/`
- `.claude/agents/` 或 `~/.claude/agents/` 下的 Claude subagents
- Claude Code caches、plans 和 project history directories
- Claude Desktop 扩展和由操作系统存储的凭据

OpenClaw 不会自动执行 hooks、信任 permission allowlists，或解码不透明的 OAuth 和 Desktop 凭据信息状态。请在审查归档后，手动迁移你需要的内容。

## 来源选择

如果没有 `--from`，OpenClaw 会检查默认的 Claude Code 主目录 `~/.claude`、采样到的 Claude Code `~/.claude.json` 状态文件，以及 macOS 上的 Claude Desktop MCP 配置。

当 `--from` 指向项目根目录时，OpenClaw 只会导入该项目的 Claude 文件，例如 `CLAUDE.md`、`.claude/settings.json`、`.claude/commands/`、`.claude/skills/` 和 `.mcp.json`。在项目根目录导入时，它不会读取你的全局 Claude 主目录。

## 推荐流程

<Steps>
  <Step title="预览计划">
    ```bash
    openclaw migrate claude --dry-run
    ```

    计划会列出所有将要发生的更改，包括冲突、被跳过的项目，以及嵌套 MCP `env` 或 `headers` 字段中被脱敏的敏感值。

  </Step>
  <Step title="应用并备份">
    ```bash
    openclaw migrate apply claude --yes
    ```

    OpenClaw 在应用之前会创建并验证备份。

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

    确认 gateway 运行正常，并且你导入的指令、MCP 服务器和技能已加载。

  </Step>
</Steps>

## 冲突处理

当计划报告存在冲突时（文件或配置值已存在于目标位置），应用会拒绝继续。

<Warning>
只有在有意替换现有目标时，才使用 `--overwrite` 重新运行。提供程序仍可能会为被覆盖文件在迁移报告目录中写入逐项备份。
</Warning>

对于全新的 OpenClaw 安装，冲突并不常见。它们通常会在你对已存在用户编辑的设置重新运行导入时出现。

## 用于自动化的 JSON 输出

```bash
openclaw migrate claude --dry-run --json
openclaw migrate apply claude --json --yes
```

使用 `--json` 且不带 `--yes` 时，应用会打印计划而不会修改状态。这是 CI 和共享脚本最安全的模式。

## 故障排查

<AccordionGroup>
  <Accordion title="Claude 状态位于 ~/.claude 之外">
    传入 `--from /actual/path`（CLI）或 `--import-source /actual/path`（入门向导）。
  </Accordion>
  <Accordion title="入门向导拒绝在现有安装上导入">
    入门导入需要全新安装。要么重置状态后重新入门，要么直接使用 `openclaw migrate apply claude`，它支持 `--overwrite` 和显式的备份控制。
  </Accordion>
  <Accordion title="来自 Claude Desktop 的 MCP 服务器没有导入">
    Claude Desktop 会从特定于平台的路径读取 `claude_desktop_config.json`。如果 OpenClaw 没有自动检测到它，请将 `--from` 指向该文件所在目录。
  </Accordion>
  <Accordion title="Claude 命令变成了禁用模型调用的技能">
    这是设计如此。Claude 命令由用户触发，因此 OpenClaw 会将它们作为带有 `disable-model-invocation: true` 的技能导入。如果你希望 agent 自动调用它们，请编辑每个 skill 的 frontmatter。
  </Accordion>
</AccordionGroup>

## 相关内容

- [`openclaw migrate`](/cli/migrate)：完整的 CLI 参考、插件契约和 JSON 结构。
- [迁移指南](/install/migrating)：所有迁移路径。
- [从 Hermes 迁移](/install/migrating-hermes)：另一条跨系统导入路径。
- [入门](/cli/onboard)：向导流程和非交互式标志。
- [Doctor](/gateway/doctor)：迁移后的健康检查。
- [Agent workspace](/concepts/agent-workspace)：`AGENTS.md`、`USER.md` 和 skills 所在的位置。
