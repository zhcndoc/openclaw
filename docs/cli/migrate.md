---
summary: "openclaw migrate 的 CLI 参考（从另一个代理系统导入状态）"
read_when:
  - 你想从 Hermes 或其他代理系统迁移到 OpenClaw
  - 你正在添加一个由插件拥有的迁移提供程序
title: "迁移"
---

# `openclaw migrate`

通过由插件拥有的迁移提供程序从另一个代理系统导入状态。内置提供程序支持 [Claude](/install/migrating-claude) 和 [Hermes](/install/migrating-hermes)；第三方插件可以注册其他提供程序。

<Tip>
如需面向用户的操作指南，请参见 [从 Claude 迁移](/install/migrating-claude) 和 [从 Hermes 迁移](/install/migrating-hermes)。[迁移中心](/install/migrating) 列出了所有路径。
</Tip>

## 命令

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate hermes --dry-run
openclaw migrate hermes
openclaw migrate apply claude --yes
openclaw migrate apply hermes --yes
openclaw migrate apply hermes --include-secrets --yes
openclaw onboard --flow import
openclaw onboard --import-from claude --import-source ~/.claude
openclaw onboard --import-from hermes --import-source ~/.hermes
```

<ParamField path="<provider>" type="string">
  已注册的迁移提供程序名称，例如 `hermes`。运行 `openclaw migrate list` 查看已安装的提供程序。
</ParamField>
<ParamField path="--dry-run" type="boolean">
  构建计划并退出，不更改状态。
</ParamField>
<ParamField path="--from <path>" type="string">
  覆盖源状态目录。Hermes 默认使用 `~/.hermes`。
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  导入受支持的凭据。默认关闭。
</ParamField>
<ParamField path="--overwrite" type="boolean">
  允许在计划报告冲突时，apply 替换现有目标。
</ParamField>
<ParamField path="--yes" type="boolean">
  跳过确认提示。在非交互模式下必需。
</ParamField>
<ParamField path="--no-backup" type="boolean">
  跳过应用前备份。当本地 OpenClaw 状态存在时，需要配合 `--force` 使用。
</ParamField>
<ParamField path="--force" type="boolean">
  当 apply 原本会因跳过备份而拒绝继续时，需与 `--no-backup` 一同使用。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 形式打印计划或应用结果。使用 `--json` 且不带 `--yes` 时，apply 会打印计划且不会修改状态。
</ParamField>

## 安全模型

`openclaw migrate` 采用先预览的方式。

<AccordionGroup>
  <Accordion title="应用前预览">
    提供程序会在任何内容变更前返回逐项计划，包括冲突、跳过的项目和敏感项目。JSON 计划、apply 输出和迁移报告会对嵌套的疑似密钥字段进行脱敏，例如 API key、token、authorization 头、cookie 和密码。

    `openclaw migrate apply <provider>` 会先预览计划，并在更改状态前提示确认，除非设置了 `--yes`。在非交互模式下，apply 需要 `--yes`。
  </Accordion>
  <Accordion title="备份">
    apply 在应用迁移前会创建并验证一个 OpenClaw 备份。如果尚不存在本地 OpenClaw 状态，则会跳过备份步骤，迁移可以继续。若要在状态存在时跳过备份，请同时传入 `--no-backup` 和 `--force`。
  </Accordion>
  <Accordion title="冲突">
    当计划存在冲突时，apply 会拒绝继续。请检查计划，然后在替换现有目标是有意为之时，使用 `--overwrite` 重新运行。提供程序仍可能为被覆盖文件在迁移报告目录中写入项目级备份。
  </Accordion>
  <Accordion title="密钥">
    默认绝不导入密钥。使用 `--include-secrets` 以导入受支持的凭据。
  </Accordion>
</AccordionGroup>

## Claude 提供程序

内置的 Claude 提供程序默认会检测 `~/.claude` 中的 Claude Code 状态。使用 `--from <path>` 可导入特定的 Claude Code 主目录或项目根目录。

<Tip>
如需面向用户的操作指南，请参见 [从 Claude 迁移](/install/migrating-claude)。
</Tip>

### Claude 会导入什么

- 项目 `CLAUDE.md` 和 `.claude/CLAUDE.md` 到 OpenClaw 代理工作区。
- 用户 `~/.claude/CLAUDE.md` 追加到工作区 `USER.md`。
- 来自项目 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 的 MCP 服务器定义。
- 包含 `SKILL.md` 的 Claude 技能目录。
- 转换为 OpenClaw 技能、且仅允许手动调用的 Claude 命令 Markdown 文件。

### 归档和人工审查状态

Claude hooks、权限、环境默认值、本地记忆、路径作用域规则、子代理、缓存、计划以及项目历史会保留在迁移报告中，或作为需要人工审查的项目报告。OpenClaw 不会执行 hooks、复制宽泛的允许列表，或自动导入 OAuth/Desktop 凭据状态。

## Hermes 提供程序

内置的 Hermes 提供程序默认会检测 `~/.hermes` 中的状态。若 Hermes 位于其他位置，请使用 `--from <path>`。

### Hermes 会导入什么

- 来自 `config.yaml` 的默认模型配置。
- 来自 `providers` 和 `custom_providers` 的已配置模型提供程序以及自定义 OpenAI 兼容端点。
- 来自 `mcp_servers` 或 `mcp.servers` 的 MCP 服务器定义。
- `SOUL.md` 和 `AGENTS.md` 到 OpenClaw 代理工作区。
- `memories/MEMORY.md` 和 `memories/USER.md` 追加到工作区记忆文件。
- 用于 OpenClaw 文件记忆的默认记忆配置，以及外部记忆提供程序（例如 Honcho）的归档或人工审查项目。
- 在 `skills/<name>/` 下包含 `SKILL.md` 文件的技能。
- 来自 `skills.config` 的按技能配置值。
- 来自 `.env` 的受支持 API key，仅在使用 `--include-secrets` 时导入。

### 支持的 `.env` 键

`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`OPENROUTER_API_KEY`、`GOOGLE_API_KEY`、`GEMINI_API_KEY`、`GROQ_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`DEEPSEEK_API_KEY`。

### 仅归档状态

OpenClaw 无法安全解释的 Hermes 状态会被复制到迁移报告中供人工审查，但不会加载到实际的 OpenClaw 配置或凭据中。这会保留不透明或不安全的状态，而不会假装 OpenClaw 能自动执行或信任它：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `auth.json`
- `state.db`

### 应用后

```bash
openclaw doctor
```

## 插件契约

迁移源是插件。插件在 `openclaw.plugin.json` 中声明其提供程序 id：

```json
{
  "contracts": {
    "migrationProviders": ["hermes"]
  }
}
```

运行时，插件调用 `api.registerMigrationProvider(...)`。该提供程序实现 `detect`、`plan` 和 `apply`。核心部分负责 CLI 编排、备份策略、提示、JSON 输出以及冲突预检。核心部分会将已审核的计划传入 `apply(ctx, plan)`，并且仅当该参数因兼容性原因缺失时，提供程序才可重建计划。

提供程序插件可以使用 `openclaw/plugin-sdk/migration` 进行项目构建和摘要计数，也可以使用 `openclaw/plugin-sdk/migration-runtime` 进行感知冲突的文件复制、仅归档报告复制以及迁移报告。

## 入门集成

当提供程序检测到已知来源时，入门流程可以提供迁移选项。`openclaw onboard --flow import` 和 `openclaw setup --wizard --import-from hermes` 都使用相同的插件迁移提供程序，并且在应用前仍会显示预览。

<Note>
入门导入需要全新的 OpenClaw 设置。如果你已经有本地状态，请先重置配置、凭据、会话和工作区。对于已有设置，备份加覆盖或合并导入属于功能门控。
</Note>

## 相关内容

- [从 Hermes 迁移](/install/migrating-hermes)：面向用户的操作指南。
- [从 Claude 迁移](/install/migrating-claude)：面向用户的操作指南。
- [迁移](/install/migrating)：将 OpenClaw 迁移到新机器。
- [Doctor](/gateway/doctor)：应用迁移后的健康检查。
- [插件](/tools/plugin)：插件安装与注册。
