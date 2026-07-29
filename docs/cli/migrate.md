---
summary: "openclaw migrate 的 CLI 参考（从另一个代理系统导入状态）"
read_when:
  - 你想从 Hermes 或另一个代理系统迁移到 OpenClaw
  - 你正在添加一个由插件拥有的迁移提供程序
title: "迁移"
---

# `openclaw migrate`

通过由插件拥有的迁移提供程序从另一个代理系统导入状态。内置提供程序覆盖 Claude、Codex CLI 和 [Hermes](/install/migrating-hermes)；插件可以注册额外的提供程序。

<Tip>
如需面向用户的指南，请参阅 [从 Claude 迁移](/install/migrating-claude) 和 [从 Hermes 迁移](/install/migrating-hermes)。
[迁移中心](/install/migrating) 列出了所有路径。
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

不带其他标志运行 `openclaw migrate <provider>` 会先规划、预览，并在交互式终端（TTY）中在应用前提示确认。`openclaw migrate plan <provider>` 和 `openclaw migrate apply <provider>` 将预览和应用拆分为独立子命令，并使用相同的标志。

<ParamField path="<provider>" type="string">
  已注册迁移提供程序的名称，例如 `hermes`。运行 `openclaw migrate list` 查看已安装的提供程序。
</ParamField>
<ParamField path="--dry-run" type="boolean">
  构建计划并退出，不更改状态。
</ParamField>
<ParamField path="--from <path>" type="string">
  覆盖源状态目录。Hermes 会遵循 `$HERMES_HOME` 和当前活动配置文件，然后使用平台默认值（`~/.hermes` 或 `%LOCALAPPDATA%\hermes`）。Codex 默认为 `~/.codex`（或 `$CODEX_HOME`），Claude 默认为 `~/.claude`。
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  在不提示的情况下导入受支持的凭据。交互式 apply 会在检测到身份验证凭据时询问是否导入，默认选中 yes；非交互式 `--yes` 需要 `--include-secrets` 才会导入它们。
</ParamField>
<ParamField path="--no-auth-credentials" type="boolean">
  跳过身份验证凭据导入，包括交互式提示。
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
  按插件名称或项目 ID 选择一个 Codex 插件安装项。重复该标志可迁移多个 Codex 插件。省略时，交互式 Codex 迁移会显示原生的 Codex 插件复选框选择器，非交互式迁移会保留所有计划中的插件。仅适用于由 Codex 应用服务器清单发现的源端已安装 `openai-curated` Codex 插件。
</ParamField>
<ParamField path="--verify-plugin-apps" type="boolean">
  仅限 Codex。在规划原生插件激活之前，强制重新遍历源端 Codex 应用服务器的 `app/list`。默认关闭，以保持迁移规划快速。
</ParamField>
<ParamField path="--backup-output <path>" type="string">
  迁移前备份归档路径或目录。透传给 `openclaw backup create`。
</ParamField>
<ParamField path="--no-backup" type="boolean">
  跳过预应用备份。当本地 OpenClaw 状态存在时，需要配合 `--force` 使用。
</ParamField>
<ParamField path="--force" type="boolean">
  当应用原本会拒绝跳过备份时，需要与 `--no-backup` 一起使用。
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
    应用会在应用迁移之前创建并验证一个 OpenClaw 备份。如果尚不存在本地 OpenClaw 状态，则会跳过备份步骤并继续迁移。若要在状态已存在时跳过备份，请同时传入 `--no-backup` 和 `--force`。
  </Accordion>
  <Accordion title="冲突">
    当计划存在冲突时，apply 会拒绝继续。请检查计划，然后在替换现有目标是有意为之时，使用 `--overwrite` 重新运行。提供程序仍可能会为迁移报告目录中被覆盖的文件写入逐项备份。
  </Accordion>
  <Accordion title="密钥">
    交互式 apply 会询问是否导入检测到的认证凭据，默认选择是。使用 `--no-auth-credentials` 可跳过它们，或使用 `--include-secrets` 搭配 `--yes` 进行无人值守的凭据导入。
  </Accordion>
</AccordionGroup>

## Claude 提供程序

内置的 Claude 提供程序默认检测位于 `~/.claude` 的 Claude Code 状态。使用 `--from <path>` 可导入特定的 Claude Code 主目录或项目根目录。

<Tip>
面向用户的操作指南，请参阅 [从 Claude 迁移](/install/migrating-claude)。
</Tip>

### Claude 导入内容

- Claude Code 自动记忆 Markdown 来自 `~/.claude/projects/*/memory` 以及一个
  用户配置的 `autoMemoryDirectory`，会复制到
  `memory/imports/claude-code/` 下以供索引检索。
- 项目 `CLAUDE.md` 和 `.claude/CLAUDE.md` 会导入到 OpenClaw agent 工作区（`AGENTS.md`）。
- 用户的 `~/.claude/CLAUDE.md` 会追加到工作区 `USER.md`。
- 来自项目 `.mcp.json`、Claude Code `~/.claude.json`（包括其按项目的条目）以及 Claude Desktop `claude_desktop_config.json` 的 MCP 服务器定义。
- 包含 `SKILL.md` 的 Claude skill 目录（用户 `~/.claude/skills` 和项目 `.claude/skills`）。
- Claude 命令 Markdown 文件（用户 `~/.claude/commands` 和项目 `.claude/commands`）会转换为 OpenClaw skills，仅可手动调用。

### 归档和人工审核状态

Claude hooks、权限、环境默认值、项目 `CLAUDE.local.md`、`.claude/rules`、用户和项目的 `agents/` 目录，以及项目历史（`~/.claude` 下的 `projects`、`cache`、`plans`）会保留在迁移报告中，或作为需要人工审核的项进行报告。OpenClaw 不会执行 hooks、复制宽泛的 allowlist，也不会自动导入 OAuth/Desktop 凭据状态。

## Codex 提供程序

默认情况下，捆绑的 Codex 提供程序会检测 `~/.codex` 下的 Codex CLI 状态，或者在设置了 `CODEX_HOME` 环境变量时检测该变量所指定的位置。使用 `--from <path>` 可以清点特定的 Codex 目录。

当你要迁移到 OpenClaw Codex harness，并且希望有意地保留有用的个人 Codex CLI 资产时，请使用此提供程序。本地 Codex app-server 启动会为每个 agent 使用单独的 `CODEX_HOME`，因此默认情况下不会读取你个人的 `~/.codex`。不过，普通进程的 `HOME` 仍然会被继承，所以 Codex 可以看到共享的 `$HOME/.agents/*` skills/plugin marketplace 条目，而子进程也可以找到用户主目录中的配置和 token。

在交互式终端中运行 `openclaw migrate codex` 时，会先预览完整计划，然后在最终应用确认前打开复选框选择器。首先会提示复制 skill 项目。使用 `Toggle all on` 或 `Toggle all off` 进行批量选择。按 Space 可切换行，或按 Enter 激活高亮行并继续。计划中的 skills 默认勾选，冲突 skills 默认不勾选，而 `Skip for now` 会在本次运行中跳过 skill 复制，但仍继续进行 plugin 选择。当可迁移的源安装精选 Codex plugins 存在，且未提供 `--plugin` 时，迁移随后会按 plugin 名称提示启用原生 Codex plugin。除非目标 OpenClaw Codex plugin 配置中已经包含该 plugin，否则 plugin 项默认勾选。现有的目标 plugins 默认不勾选，并显示类似 `conflict: plugin exists` 的冲突提示；选择 `Toggle all off` 可在本次运行中不迁移任何原生 Codex plugins，或选择 `Skip for now` 在应用前停止。

对于脚本化或精确运行，请显式选择一个或多个 skills 或 plugins：

```bash
openclaw migrate codex --dry-run --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
openclaw migrate codex --dry-run --plugin google-calendar
openclaw migrate apply codex --yes --plugin google-calendar
```

### Codex 导入内容

- 从 `$CODEX_HOME/memories` 汇总的 Codex `MEMORY.md` 和 `memory_summary.md`，复制到 `memory/imports/codex/` 下用于索引回忆。原始 rollout memory 不会被导入。
- `$CODEX_HOME/skills` 下的 Codex CLI skill 目录，不包括 Codex 的 `.system` 缓存。
- `$HOME/.agents/skills` 下的个人 AgentSkills，会复制到当前 OpenClaw agent 工作区中，以便按 agent 归属管理。
- 通过 Codex app-server `plugin/list` 发现的源安装 `openai-curated` Codex plugins。规划阶段会针对每个已启用的已安装 plugin 读取 `plugin/read`。

基于 App 的 plugin 迁移有额外门槛：

- 基于 App 的 plugins 要求源 Codex app-server 账号是 ChatGPT 订阅账号。非 ChatGPT 账号或缺失账号响应会被跳过，并标记为 `codex_subscription_required`。
- 默认情况下，迁移不会调用源 `app/list`，因此即使通过账号门槛的基于 App plugins 也会在未进行源 app 可访问性验证的情况下进入规划；账号查询的传输失败会跳过，并标记为 `codex_account_unavailable`。
- 传入 `--verify-plugin-apps` 可强制获取一份新的源 `app/list` 快照，并要求在规划原生启用之前，每个归属 app 都必须存在、已启用且可访问。在这种模式下，账号查询的传输失败会继续进入源 app 清单验证。该快照仅保存在当前进程的内存中；绝不会写入迁移输出或目标配置。

被禁用的 plugins、不可读的 plugin 详情、受订阅门控的源账号，以及（当设置了 `--verify-plugin-apps` 时）缺失、禁用或不可访问的 apps，都会成为带类型原因的手动跳过项，而不是目标配置条目。即使目标 app-server 已报告该 plugin 已安装并启用，应用阶段仍会对每个被选中的合格 plugin 调用 app-server `plugin/install`。迁移后的 Codex plugins 只能在选择原生 Codex harness 的会话中使用；它们不会在 OpenClaw provider 运行、ACP conversation bindings 或其他 harness 中暴露。

### 需要人工审核的 Codex 状态

Codex `config.toml`、原生 `hooks/hooks.json`、非精选 marketplaces、不是源安装精选 plugins 的缓存 plugin bundles，以及未通过源订阅门槛的源安装 plugins，均不会自动激活。设置 `--verify-plugin-apps` 时，未通过源 app 清单门槛的 plugins 也会被跳过。所有这些内容都会在迁移报告中被复制或报告，以供人工审查。

对于已迁移的源安装精选插件，apply 会写入：

- `plugins.entries.codex.enabled: true`
- `plugins.entries.codex.config.codexPlugins.enabled: true`
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions: true`
- one explicit plugin entry with `marketplaceName: "openai-curated"` and `pluginName` for each selected plugin

Migration 绝不会写入 `plugins["*"]`，也绝不会存储本地 marketplace 缓存路径。

被跳过的 plugins 不会写入目标配置。源侧订阅失败会在带类型原因的人工项中报告：`codex_subscription_required`、`codex_account_unavailable`、`plugin_disabled` 或 `plugin_read_unavailable`。在设置了 `--verify-plugin-apps` 的情况下，源 app 清单失败也可能显示为 `app_inaccessible`、`app_disabled`、`app_missing` 或 `app_inventory_unavailable`。目标侧需要认证的安装会在受影响的 plugin 项上报告为 `status: "skipped"`、`reason: "auth_required"`，并附带已脱敏的 app 标识；其显式配置条目会写为禁用状态，直到你重新授权并启用它们。其他安装失败则是按项范围的 `error` 结果。

如果在规划过程中 Codex app-server plugin 清单不可用，迁移会回退到缓存 bundle 的建议项，而不会使整个迁移失败。

## Hermes 提供程序

捆绑的 Hermes 提供程序会遵循 `$HERMES_HOME` 和当前激活的配置文件，然后使用平台默认路径（`~/.hermes` 或 `%LOCALAPPDATA%\hermes`）。使用 `--from <path>` 可覆盖自动发现。

### Hermes 导入内容

- 默认模型配置来自 `config.yaml`。
- 从 `model`、`providers` 和 `custom_providers` 导入已配置的模型提供程序和自定义 OpenAI 兼容端点。
- 从 `mcp_servers` 或 `mcp.servers` 导入 MCP 服务器定义。精确的 OpenClaw 映射覆盖默认的 Streamable HTTP 路由、OAuth 作用域、布尔值 TLS 验证、独立的客户端证书/密钥路径，以及 Hermes 原生/资源/提示工具策略。不支持的仅 Hermes 运行时或凭据字段会被报告以供人工审查。
- 将 `SOUL.md` 和 `AGENTS.md` 导入 OpenClaw 代理工作区。
- 将 `memories/MEMORY.md` 和 `memories/USER.md` 追加到工作区记忆文件中。
  仅记忆表面（入门记忆页面和控制 UI 记忆导入页面）会改为将这些文件复制到 `memory/imports/hermes/` 下，以便在不触碰现有工作区记忆的情况下进行索引式检索。
- OpenClaw 文件记忆的记忆配置默认值，以及外部记忆提供程序（如 Honcho）的归档或人工审查项。
- 包含 `SKILL.md` 文件的技能，位于 `skills/` 下的任意位置；嵌套技能会被展平到工作区技能目录中。
- 来自 `skills.config` 的每项技能配置值。
- 当接受交互式凭据迁移时，或设置了 `--include-secrets` 时，当前 Hermes OpenAI Codex OAuth 凭据和 OpenCode OpenAI OAuth 凭据。不要让 Hermes 和 OpenClaw 使用同一个已导入的刷新授权。
- 当接受交互式凭据迁移时，或设置了 `--include-secrets` 时，来自 Hermes `.env` 和 OpenCode `auth.json` 的受支持 API 密钥和令牌。

### 支持的 `.env` 密钥

`AI_GATEWAY_API_KEY`, `ALIBABA_API_KEY`, `ANTHROPIC_API_KEY`, `ARCEEAI_API_KEY`, `CEREBRAS_API_KEY`, `CHUTES_API_KEY`, `CLOUDFLARE_AI_GATEWAY_API_KEY`, `COPILOT_GITHUB_TOKEN`, `DASHSCOPE_API_KEY`, `DEEPINFRA_API_KEY`, `DEEPSEEK_API_KEY`, `FIREWORKS_API_KEY`, `GEMINI_API_KEY`, `GH_TOKEN`, `GITHUB_TOKEN`, `GLM_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`, `HF_TOKEN`, `HUGGINGFACE_HUB_TOKEN`, `KILOCODE_API_KEY`, `KIMICODE_API_KEY`, `KIMI_API_KEY`, `KIMI_CODING_API_KEY`, `MINIMAX_API_KEY`, `MINIMAX_CODING_API_KEY`, `MISTRAL_API_KEY`, `MODELSTUDIO_API_KEY`, `MOONSHOT_API_KEY`, `NVIDIA_API_KEY`, `OPENAI_API_KEY`, `OPENCODE_API_KEY`, `OPENCODE_GO_API_KEY`, `OPENCODE_ZEN_API_KEY`, `OPENROUTER_API_KEY`, `QIANFAN_API_KEY`, `QWEN_API_KEY`, `TOGETHER_API_KEY`, `VENICE_API_KEY`, `XAI_API_KEY`, `XIAOMI_API_KEY`, `ZAI_API_KEY`, `Z_AI_API_KEY`.

### 仅归档状态

OpenClaw 无法安全解释的 Hermes 状态会被复制到迁移报告中供人工审查，但不会加载到实时 OpenClaw 配置或凭据中。这包括 `plugins/`、`sessions/`、`logs/`、`cron/`、`mcp-tokens/`、`plans/`、`workspace/`、`skins/`、`kanban/`、配对/平台状态、网关路由/进程状态，以及检测到的 Hermes SQLite 数据库。

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

运行时，插件调用 `api.registerMigrationProvider(...)`。该 provider 实现 `detect`、`plan` 和 `apply`。核心负责 CLI 编排、备份策略、提示、JSON 输出以及冲突预检。核心会将已审核的计划传入 `apply(ctx, plan)`，并且为兼容性考虑，只有在该参数缺失时，provider 才可以重建计划。迁移条目可以设置 `applyPhase: "after-promotion"`，用于外部激活动作；引导流程必须将这类操作延后，直到分阶段的本地数据已被持久化发布。此类 provider 必须声明 `deferredApply: { retrySafe: true }`，并使每个延后操作在进程中断后能够安全重放；未声明的延后操作会被引导流程拒绝。幂等的空操作应返回一个不可变更的条目，并设置 `deferredCompletion: true`，以便恢复流程能够将其记录为已完成。独立的 `openclaw migrate` 仍然会通过其正常的、带备份的流程来应用完整计划。

提供程序插件可以使用 `openclaw/plugin-sdk/migration` 进行条目构建和摘要计数，也可以使用 `openclaw/plugin-sdk/migration-runtime` 进行具备冲突感知的文件复制、仅归档报告复制、缓存的 config-runtime 包装器以及迁移报告。

## 引导集成

当提供方检测到已知源时，引导流程可以提供迁移。`openclaw onboard --flow import` 和 `openclaw setup --wizard --import-from hermes` 都使用相同的插件迁移提供方，并且在应用前仍会显示预览。不同于独立迁移，全新的目标引导路径会暂存本地工件和导入的凭据，在暂存区内验证或修复导入的推理，然后在提交配置之前提升工作区和代理状态。一个模式为 `0600` 的提升日志可让下一次运行完成或回滚中断的发布，包括任何延迟的外部激活，而无需重放已导入的本地数据。

<Note>
引导导入需要全新的 OpenClaw 安装。如果你已经有本地状态，请先重置配置、凭据、会话和工作区。现有安装的备份加覆盖或合并导入属于功能开关控制。
</Note>

## 相关内容

- [从 Hermes 迁移](/install/migrating-hermes)：面向用户的操作指南。
- [从 Claude 迁移](/install/migrating-claude)：面向用户的操作指南。
- [迁移](/install/migrating)：将 OpenClaw 迁移到新机器。
- [Doctor](/gateway/doctor)：应用迁移后的健康检查。
- [插件](/tools/plugin)：插件安装和注册。
