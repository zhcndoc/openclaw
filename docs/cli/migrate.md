---
summary: "openclaw migrate 的 CLI 参考（从另一个代理系统导入状态）"
read_when:
  - 你想从 Hermes 或另一个代理系统迁移到 OpenClaw
  - 你正在添加一个由插件拥有的迁移提供程序
title: "迁移"
---

# `openclaw migrate`

通过由插件拥有的迁移提供程序，从另一个代理系统导入状态。内置提供程序覆盖 Codex CLI 状态、[Claude](/install/migrating-claude) 和 [Hermes](/install/migrating-hermes)；第三方插件可以注册额外的提供程序。

<Tip>
面向用户的操作指南，请参阅 [从 Claude 迁移](/install/migrating-claude) 和 [从 Hermes 迁移](/install/migrating-hermes)。[迁移中心](/install/migrating) 列出了所有路径。
</Tip>

## 命令

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate codex --dry-run
openclaw migrate codex --skill gog-vault77-google-workspace
openclaw migrate codex --plugin google-calendar --dry-run
openclaw migrate codex --plugin google-calendar --verify-plugin-apps --dry-run
openclaw migrate hermes --dry-run
openclaw migrate hermes
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --plugin google-calendar
openclaw migrate apply codex --yes
openclaw migrate apply claude --yes
openclaw migrate apply hermes --yes
openclaw migrate apply hermes --include-secrets --yes
openclaw onboard --flow import
openclaw onboard --import-from claude --import-source ~/.claude
openclaw onboard --import-from hermes --import-source ~/.hermes
```

<ParamField path="<provider>" type="string">
  已注册迁移提供程序的名称，例如 `hermes`。运行 `openclaw migrate list` 查看已安装的提供程序。
</ParamField>
<ParamField path="--dry-run" type="boolean">
  构建计划并退出，不更改状态。
</ParamField>
<ParamField path="--from <path>" type="string">
  覆盖源状态目录。Hermes 默认为 `~/.hermes`。
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  导入受支持的凭据。默认关闭。
</ParamField>
<ParamField path="--overwrite" type="boolean">
  当计划报告冲突时，允许 apply 替换现有目标。
</ParamField>
<ParamField path="--yes" type="boolean">
  跳过确认提示。在非交互模式下必需。
</ParamField>
<ParamField path="--skill <name>" type="string">
  按技能名称或项目 ID 选择一个技能复制项。重复该标志可迁移多个技能。省略时，交互式 Codex 迁移会显示复选框选择器，非交互式迁移会保留所有计划中的技能。
</ParamField>
<ParamField path="--plugin <name>" type="string">
  按插件名称或项目 ID 选择一个 Codex 插件安装项。重复该标志可迁移多个 Codex 插件。省略时，交互式 Codex 迁移会显示原生 Codex 插件复选框选择器，非交互式迁移会保留所有计划中的插件。这仅适用于通过 Codex app-server 清单发现的源安装 `openai-curated` Codex 插件。
</ParamField>
<ParamField path="--verify-plugin-apps" type="boolean">
  仅限 Codex。在规划原生插件激活之前，强制重新执行一次源 Codex app-server 的 `app/list` 遍历。默认关闭，以保持迁移规划快速。
</ParamField>
<ParamField path="--no-backup" type="boolean">
  跳过预应用备份。当本地 OpenClaw 状态存在时，需要配合 `--force` 使用。
</ParamField>
<ParamField path="--force" type="boolean">
  当 apply 否则会拒绝跳过备份时，需要与 `--no-backup` 一起使用。
</ParamField>
<ParamField path="--json" type="boolean">
  将计划或 apply 结果以 JSON 打印。使用 `--json` 且不带 `--yes` 时，apply 会打印计划且不会修改状态。
</ParamField>

## 安全模型

`openclaw migrate` 采用先预览的方式。

<AccordionGroup>
  <Accordion title="应用前预览">
    提供程序会在任何内容发生变化之前返回一份逐项计划，包括冲突、跳过的项目和敏感项目。JSON 计划、apply 输出以及迁移报告会对嵌套的疑似密钥字段进行脱敏，例如 API 密钥、令牌、授权头、cookie 和密码。

    `openclaw migrate apply <provider>` 会先预览计划，并在更改状态前提示确认，除非设置了 `--yes`。在非交互模式下，apply 需要 `--yes`。

  </Accordion>
  <Accordion title="备份">
    apply 会在应用迁移前创建并验证一个 OpenClaw 备份。如果本地尚不存在 OpenClaw 状态，则会跳过备份步骤，迁移可继续进行。若状态已存在且要跳过备份，请同时传入 `--no-backup` 和 `--force`。
  </Accordion>
  <Accordion title="冲突">
    当计划存在冲突时，apply 会拒绝继续。请检查计划，然后在替换现有目标是有意为之时，使用 `--overwrite` 重新运行。提供程序仍可能会为迁移报告目录中被覆盖的文件写入逐项备份。
  </Accordion>
  <Accordion title="密钥">
    默认情况下绝不会导入密钥。使用 `--include-secrets` 可导入受支持的凭据。
  </Accordion>
</AccordionGroup>

## Claude 提供程序

内置的 Claude 提供程序默认检测位于 `~/.claude` 的 Claude Code 状态。使用 `--from <path>` 可导入特定的 Claude Code 主目录或项目根目录。

<Tip>
面向用户的操作指南，请参阅 [从 Claude 迁移](/install/migrating-claude)。
</Tip>

### Claude 导入内容

- 将项目 `CLAUDE.md` 和 `.claude/CLAUDE.md` 导入到 OpenClaw 代理工作区。
- 将用户 `~/.claude/CLAUDE.md` 追加到工作区 `USER.md`。
- 来自项目 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 的 MCP 服务器定义。
- 包含 `SKILL.md` 的 Claude 技能目录。
- 将 Claude 命令 Markdown 文件转换为 OpenClaw 技能，仅支持手动调用。

### 归档和人工审核状态

Claude hooks、权限、环境默认值、本地记忆、路径作用域规则、子代理、缓存、计划和项目历史将保留在迁移报告中，或作为需要人工审核的项目报告。OpenClaw 不会执行 hooks、复制宽泛的允许列表，或自动导入 OAuth/Desktop 凭据状态。

## Codex 提供程序

内置的 Codex 提供程序默认在 `~/.codex` 检测 Codex CLI 状态，或者在设置了该环境变量时于 `CODEX_HOME` 中检测。使用 `--from <path>` 可盘点特定的 Codex 主目录。

当迁移到 OpenClaw Codex harness，并且你想有意识地提升有用的个人 Codex CLI 资产时，请使用此提供程序。本地 Codex app-server 启动使用按代理划分的 `CODEX_HOME`，因此默认不会读取你的个人 `~/.codex`。正常的进程 `HOME` 仍会被继承，因此 Codex 可以看到共享的 `$HOME/.agents/*` 技能/插件市场条目，并且子进程可以找到用户主目录中的配置和令牌。

在交互式终端中运行 `openclaw migrate codex` 会先预览完整计划，然后在最终应用确认之前打开复选框选择器。先提示技能复制项。使用 `Toggle all on` 或 `Toggle all off` 进行批量选择。按 Space 可切换行，或按 Enter 激活高亮行并继续。计划中的技能默认勾选，冲突技能默认不勾选，而 `Skip for now` 会跳过本次运行中的技能复制，同时仍继续进行插件选择。当源安装的精选 Codex 插件可迁移且未提供 `--plugin` 时，迁移随后会按插件名称提示进行原生 Codex 插件激活。插件项默认勾选，除非目标 OpenClaw Codex 插件配置中已经有该插件。现有的目标插件默认不勾选，并显示类似 `conflict: plugin exists` 的冲突提示；选择 `Toggle all off` 可在该次运行中不迁移任何原生 Codex 插件，或选择 `Skip for now` 在应用前停止。对于脚本化或精确运行，请为每个技能传入一次 `--skill <name>`，例如：

```bash
openclaw migrate codex --dry-run --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
```

使用 `--plugin <name>` 可在非交互模式下将原生 Codex 插件迁移限制为一个或多个源安装的精选插件：

```bash
openclaw migrate codex --dry-run --plugin google-calendar
openclaw migrate apply codex --yes --plugin google-calendar
```

### Codex 导入内容

- `$CODEX_HOME/skills` 下的 Codex CLI 技能目录，不包括 Codex 的 `.system` 缓存。
- 位于 `$HOME/.agents/skills` 下的个人 AgentSkills，在你希望按代理拥有时会复制到当前 OpenClaw 代理工作区。
- 通过 Codex app-server `plugin/list` 发现的源安装 `openai-curated` Codex 插件。规划会为每个已启用的已安装插件读取 `plugin/read`。基于 app 的插件要求源 Codex app-server 的账户响应是 ChatGPT 订阅账户；非 ChatGPT 或缺失的账户响应会以 `codex_subscription_required` 跳过。默认情况下，迁移不会调用源 `app/list`，因此通过账户门禁的基于 app 的插件会在没有源 app 可访问性验证的情况下进行规划，而账户查询传输失败会以 `codex_account_unavailable` 跳过。当你希望迁移强制获取新的源 `app/list` 快照，并要求在规划原生激活之前每个拥有的 app 都存在、已启用且可访问时，请传入 `--verify-plugin-apps`。在该模式下，账户查询传输失败会继续进入源 app 清单验证。源 app 清单快照仅保留在当前进程内存中；不会写入迁移输出或目标配置。已禁用的插件、无法读取的插件详情、受订阅门禁限制的源账户，以及在请求验证时缺失的 app、已禁用的 app、无法访问的 app 或源 app 清单失败，都会变成带类型原因的手动跳过项，而不是目标配置条目。
  对于每个选中的符合条件的插件，apply 都会调用 app-server `plugin/install`，即使目标 app-server 已报告该插件已安装并启用。迁移后的 Codex 插件仅可在选择原生 Codex harness 的会话中使用；它们不会暴露给 Pi、普通 OpenAI 提供程序运行、ACP 会话绑定或其他 harness。

### 需要人工审核的 Codex 状态

Codex `config.toml`、原生 `hooks/hooks.json`、非精选市场、不是源安装精选插件的缓存插件包，以及未通过源订阅门禁的源安装插件，不会被自动激活。当设置了 `--verify-plugin-apps` 时，未通过源 app 清单门禁的插件也会被跳过。它们会被复制到迁移报告中，或在其中报告，以供人工审核。

对于已迁移的源安装精选插件，apply 会写入：

- `plugins.entries.codex.enabled: true`
- `plugins.entries.codex.config.codexPlugins.enabled: true`
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions: true`
- one explicit plugin entry with `marketplaceName: "openai-curated"` and
  `pluginName` for each selected plugin

迁移绝不会写入 `plugins["*"]`，也绝不会存储本地市场缓存路径。源侧订阅失败会在手动项上报告为带类型原因，例如 `codex_subscription_required`、`codex_account_unavailable`、`plugin_disabled` 或 `plugin_read_unavailable`。在使用 `--verify-plugin-apps` 时，源 app 清单失败也可能表现为 `app_inaccessible`、`app_disabled`、`app_missing` 或 `app_inventory_unavailable`。被跳过的插件不会写入目标配置。
目标侧需要认证的安装会在受影响的插件项上报告，状态为 `status: "skipped"`、`reason: "auth_required"`，并使用已脱敏的 app 标识。其显式配置条目会保持禁用状态，直到你重新授权并启用它们。其他安装失败则作为按项范围的 `error` 结果。

如果在规划期间 Codex 应用服务器插件清单不可用，迁移会退回到缓存包建议项，而不是使整个迁移失败。

## Hermes 提供程序

内置的 Hermes 提供程序默认检测位于 `~/.hermes` 的状态。若 Hermes 位于其他位置，请使用 `--from <path>`。

### Hermes 导入内容

- 来自 `config.yaml` 的默认模型配置。
- 来自 `providers` 和 `custom_providers` 的已配置模型提供程序以及自定义 OpenAI 兼容端点。
- 来自 `mcp_servers` 或 `mcp.servers` 的 MCP 服务器定义。
- 将 `SOUL.md` 和 `AGENTS.md` 导入到 OpenClaw 代理工作区。
- 将 `memories/MEMORY.md` 和 `memories/USER.md` 追加到工作区记忆文件。
- OpenClaw 文件记忆的记忆配置默认值，以及来自 Honcho 等外部记忆提供程序的归档或人工审核项目。
- 在 `skills/<name>/` 下包含 `SKILL.md` 文件的技能。
- 来自 `skills.config` 的每项技能配置值。
- 仅在使用 `--include-secrets` 时，从 `.env` 导入受支持的 API 密钥。

### 支持的 `.env` 密钥

`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`.

### 仅归档状态

OpenClaw 无法安全解释的 Hermes 状态会被复制到迁移报告中供人工审核，但不会加载到实际的 OpenClaw 配置或凭据中。这样可以保留不透明或不安全的状态，而不会假装 OpenClaw 能自动执行或信任它：

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

迁移源是插件。插件在 `openclaw.plugin.json` 中声明其 provider id：

```json
{
  "contracts": {
    "migrationProviders": ["hermes"]
  }
}
```

运行时插件调用 `api.registerMigrationProvider(...)`。该提供程序实现 `detect`、`plan` 和 `apply`。核心负责 CLI 编排、备份策略、提示、JSON 输出和冲突预检。核心将审阅后的计划传入 `apply(ctx, plan)`；为了兼容性，只有当该参数缺失时，提供程序才可重建计划。

提供程序插件可以使用 `openclaw/plugin-sdk/migration` 进行条目构建和摘要计数，也可以使用 `openclaw/plugin-sdk/migration-runtime` 进行具备冲突感知的文件复制、仅归档报告复制、缓存的 config-runtime 包装器以及迁移报告。

## 引导集成

当提供程序检测到已知来源时，引导流程可以提供迁移。`openclaw onboard --flow import` 和 `openclaw setup --wizard --import-from hermes` 都使用相同的插件迁移提供程序，并且在应用前仍会显示预览。

<Note>
引导导入需要全新的 OpenClaw 安装。如果你已经有本地状态，请先重置配置、凭据、会话和工作区。现有安装的备份加覆盖或合并导入属于功能开关控制。
</Note>

## 相关内容

- [从 Hermes 迁移](/install/migrating-hermes)：面向用户的操作指南。
- [从 Claude 迁移](/install/migrating-claude)：面向用户的操作指南。
- [迁移](/install/migrating)：将 OpenClaw 迁移到新机器。
- [Doctor](/gateway/doctor)：应用迁移后的健康检查。
- [Plugins](/tools/plugin)：插件安装和注册。
