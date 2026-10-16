---
summary: "`openclaw migrate` 的 CLI 参考（从另一个代理系统导入状态）"
read_when:
  - "你想从 Hermes 或另一个代理系统迁移到 OpenClaw"
  - "你正在添加一个由插件拥有的迁移提供程序"
title: "迁移"
---

# `openclaw migrate`

通过插件拥有的迁移提供商从另一个代理系统导入状态。捆绑的提供商涵盖 Claude、Codex CLI 和 [Hermes](/install/migrating-hermes)。插件可以注册其他提供者。

<Tip>
有关面向用户的演练，请参阅 [ 从 Claude](/install/migrating-claude) 迁移和 [ 从 Hermes](/install/migrating-hermes) 迁移。 [ 迁移中心](/install/migrating) 列出了所有路径。
</Tip>

迁移提供程序加载、预览和导入需要本地国家专有所有权。通过其服务管理器或原始终端停止正在运行的网关，等待其停止，然后重新运行该命令。如果网关仍然拥有状态目录，则该命令会在加载提供程序或更改状态之前拒绝。该命令通过提供程序清理和任何导入回滚保留脱机所有权。网关内部调用的内存导入继续使用该网关的所有权。

## <a id="commands"></a> 命令

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

共享标志在任一位置都有效，因此 `openclaw migrate --no-auth-credentials apply hermes --yes` 和 `openclaw migrate apply hermes --no-auth-credentials --yes` 的行为相同。放置在子命令上的标志将覆盖放置在其前面的相同标志。 `--dry-run` 是例外：`openclaw migrate apply` 拒绝它而不是申请，因为申请总是改变状态。

<ParamField path="<provider>" 类型 = "字符串">
  已注册迁移提供程序的名称，例如 `hermes`。运行 `openclaw migrate list` 查看已安装的提供程序。
</ParamField>
<ParamField path="--dry-run" type="boolean">
  制定计划并退出而不改变状态。 `openclaw migrate apply` 不接受；请改用 `openclaw migrate plan <provider>`。
</ParamField>
<ParamField path="--from <path>" 类型 = "字符串">
  覆盖源状态目录。Hermes 会遵循 `$HERMES_HOME` 和当前活动配置文件，然后使用平台默认值（`~/.hermes` 或 `%LOCALAPPDATA%\hermes`）。Codex 默认为 `~/.codex`（或 `$CODEX_HOME`），Claude 默认为 `~/.claude`。
</ParamField>
<ParamField path="--agent <id>" 类型 = "字符串">
  导入到已配置的代理中。仅当配置的默认代理是预期所有者时才忽略此项。无效和未知的代理 ID 将被拒绝。
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  导入支持的凭据，无需 OpenClaw 确认提示。 Codex 仍可能请求操作系统凭证存储访问，例如 macOS 钥匙串访问。交互式应用在检查和导入身份验证凭据之前会询问，默认情况下选择“是”。非交互式 `--yes` 需要 `--include-secrets` 导入它们。
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
<ParamField path="--skill <name>" 类型 = "字符串">
  按技能名称或项目 ID 选择一项技能副本项目。重复该标志可迁移多项技能。省略时，交互式 Codex 迁移会显示复选框选择器，非交互式迁移会保留所有计划的技能。
</ParamField>
<ParamField path="--plugin <name>" 类型 = "字符串">
  通过插件名称或项目 ID 选择一个 Codex 插件安装项目。重复该标志以迁移多个 Codex 插件。省略时，交互式 Codex 迁移显示本机 Codex 插件复选框选择器，非交互式迁移保留所有计划的插件。仅适用于 Codex 应用程序服务器清单发现的源安装的 `openai-curated` Codex 插件。
</ParamField>
<ParamField path="--item <id>" 类型 = "字符串">
  按计划 ID 选择一个确切的迁移项。重复该标志可迁移多个项目。例如，`--item auth:openai` 会将 Codex 迁移限制为检测到的 OpenAI 凭据项。
</ParamField>
<ParamField path="--verify-plugin-apps" type="boolean">
  仅适用于 Codex。在规划原生插件激活之前，强制重新读取源 Codex 应用服务器的 `app/installed` 快照。默认关闭，以保持迁移规划的快速运行。
</ParamField>
<ParamField path="--backup-output <path>" 类型 = "字符串">
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

## <a id="safety-model"></a> 安全模型

`openclaw migrate` 采用先预览的方式。

<AccordionGroup>
  <Accordion id="preview-before-apply" title="申请前预览">
    提供程序会在任何内容发生变化之前返回一份逐项计划，包括冲突、跳过的项目和敏感项目。JSON 计划、apply 输出以及迁移报告会对嵌套的疑似密钥字段进行脱敏，例如 API 密钥、令牌、授权头、cookie 和密码。

    `openclaw migrate apply <provider>` 会先预览计划，并在更改状态前提示确认，除非设置了 `--yes`。在非交互模式下，apply 需要 `--yes`。

  </Accordion>
  <Accordion id="backups" title="备份">
    应用会在应用迁移之前创建并验证一个 OpenClaw 备份。如果尚不存在本地 OpenClaw 状态，则会跳过备份步骤并继续迁移。若要在状态已存在时跳过备份，请同时传入 `--no-backup` 和 `--force`。
  </Accordion>
  <Accordion id="conflicts" title="冲突">
    当计划存在冲突时，apply 会拒绝继续。请检查计划，然后在替换现有目标是有意为之时，使用 `--overwrite` 重新运行。提供程序仍可能会为迁移报告目录中被覆盖的文件写入逐项备份。
  </Accordion>
  <Accordion id="secrets" title="密钥">
    交互式 apply 会询问是否导入检测到的认证凭据，默认选择是。使用 `--no-auth-credentials` 可跳过它们，或使用 `--include-secrets` 搭配 `--yes` 进行无人值守的凭据导入。
  </Accordion>
</AccordionGroup>

## <a id="claude-provider"></a> Claude 提供程序

内置的 Claude 提供程序默认检测位于 `~/.claude` 的 Claude Code 状态。使用 `--from <path>` 可导入特定的 Claude Code 主目录或项目根目录。

<Tip>
有关面向用户的演练，请参阅从 Claude](/install/migrating-claude) 迁移 [。
</Tip>

### <a id="what-claude-imports"></a> Claude 导入内容

- Claude Code 自动记忆 Markdown 来自 `~/.claude/projects/*/memory` 以及一个用户配置的 `autoMemoryDirectory`，会复制到 `memory/imports/claude-code/` 下以供索引检索。
- 项目 `CLAUDE.md` 和 `.claude/CLAUDE.md` 会导入到 OpenClaw agent 工作区（`AGENTS.md`）。
- 用户的 `~/.claude/CLAUDE.md` 会追加到工作区 `USER.md`。
- 来自项目 `.mcp.json`、Claude Code `~/.claude.json`（包括其每个项目条目）和 Claude 桌面 `claude_desktop_config.json` 的 MCP 服务器定义。
- 包含 `SKILL.md` 的 Claude skill 目录（用户 `~/.claude/skills` 和项目 `.claude/skills`）。
- Claude 命令 Markdown 文件（用户 `~/.claude/commands` 和项目 `.claude/commands`）会转换为 OpenClaw skills，仅可手动调用。

### <a id="archive-and-manual-review-state"></a> 归档和人工审核状态

Claude 挂钩、权限、环境默认值、项目 `CLAUDE.local.md`、`.claude/rules`、用户和项目 `agents/` 目录以及项目历史记录（`projects`、`cache`、`~/.claude` 下的 `plans`）都保存在迁移报告或报告为手动审核项目。 OpenClaw 不会自动执行挂钩、复制广泛的允许列表或导入 OAuth/Desktop 凭证状态。

## <a id="codex-provider"></a> Codex 提供程序

默认情况下，捆绑的 Codex 提供程序会检测 `~/.codex` 下的 Codex CLI 状态，或者在设置了 `CODEX_HOME` 环境变量时检测该变量所指定的位置。使用 `--from <path>` 可以清点特定的 Codex 目录。

当你要迁移到 OpenClaw Codex harness，并且希望有意地保留有用的个人 Codex CLI 资产时，请使用此提供程序。本地 Codex app-server 启动会为每个 agent 使用单独的 `CODEX_HOME`，因此默认情况下不会读取你个人的 `~/.codex`。不过，普通进程的 `HOME` 仍然会被继承，所以 Codex 可以看到共享的 `$HOME/.agents/*` skills/plugin marketplace 条目，而子进程也可以找到用户主目录中的配置和 token。

Codex 凭证是敏感的迁移输入。初始凭证规划提供导入，无需检查本机凭证存储。接受交互式凭证提示或通过 `--include-secrets` 允许检查并从 Codex 的选定存储中导入； macOS 可能会请求钥匙串访问。本机插件清单发现单独遵循 Codex 的身份验证行为，包括在试运行期间。默认代理范围的运行时不会直接使用复制或安装的 `auth.json`。将这些凭证显式导入所属代理的 OpenClaw 身份验证存储中。将 `<agent-id>` 替换为该已配置代理的 ID：

```bash
openclaw migrate plan codex --from <codex-home> --agent <agent-id> --include-secrets --item auth:openai
openclaw migrate apply codex --from <codex-home> --agent <agent-id> --include-secrets --item auth:openai --yes
```

对于嵌入 Codex 迁移提供程序的调用方，显式 `providerOptions.allowKeychainPrompt: false` 会禁用身份验证导入的凭据检查，包括文件支持的导入，即使使用 `includeSecrets: true` 也是如此。早期标记版本可以使用该覆盖导入文件凭据。本机启动可以在 OpenClaw 检查所选存储之前访问凭证存储，因此当此覆盖为 false 时，身份验证导入步骤不会启动其本机读取器。正常迁移 CLI 和加入同意流程不会设置此覆盖。插件发现是独立的，并且仍然可以请求操作系统凭据访问。

在交互式终端中运行 `openclaw migrate codex` 可以预览完整计划，然后在最终应用确认之前打开复选框选择器。首先会提示技能副本项目。使用 `Toggle all on` 或 `Toggle all off` 进行批量选择。按 Space 切换行，或按 Enter 激活突出显示的行并继续。计划技能开始检查，冲突技能开始未检查，`Skip for now` 跳过本次运行的技能副本，同时仍然继续插件选择。当源安装的精选 Codex 插件可迁移并且未提供 `--plugin` 时，迁移会提示按插件名称激活本机 Codex 插件。除非目标 OpenClaw Codex 插件配置已具有该插件，否则开始检查插件项。现有目标插件在未检查的情况下启动并显示冲突提示，例如 `conflict: plugin exists`。选择 `Toggle all off` 在该运行中不迁移本机 Codex 插件，或选择 `Skip for now` 在应用之前停止。

对于脚本化或精确运行，请显式选择一个或多个 skills 或 plugins：

```bash
openclaw migrate codex --dry-run --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
openclaw migrate codex --dry-run --plugin google-calendar
openclaw migrate apply codex --yes --plugin google-calendar
```

### <a id="what-codex-imports"></a> Codex 导入内容

- 来自 Codex 选定本机存储的 ChatGPT OAuth 或 OpenAI API-key 凭证，仅在设置 `--include-secrets` 时导入到代理的 OpenClaw 身份验证存储中。
- 从`$CODEX_HOME/memories`合并Codex `MEMORY.md`和`memory_summary.md`，复制到`memory/imports/codex/`下以进行索引召回。不导入原始转出内存。
- `$CODEX_HOME/skills` 下的 Codex CLI 技能目录，不包括 Codex 的 `.system` 缓存。
- `$HOME/.agents/skills` 下的个人 AgentSkills，复制到当前 OpenClaw agent 工作区中，以实现按 agent 所有。
- 通过 Codex 应用程序服务器 `plugin/installed` 发现的源安装的 `openai-curated` Codex 插件。对于每个已启用的已安装插件，Planning 会读取 `plugin/read`。

Codex 会话和聊天历史记录不会导入。巩固记忆不是谈话记录。迁移不会移动或删除您的源文件。

在入门引导期间，迁移建议会在询问是否继续之前解释此范围。继续打开导入选项；凭证需要单独同意，可以选择技能和符合条件的插件，并且在申请之前需要最终确认。

基于 App 的 plugin 迁移有额外门槛：

- 基于 App 的插件要求源 Codex app-server 账户为 ChatGPT 订阅账户。非 ChatGPT 账户或缺少账户的响应会被跳过，并标记为 `codex_subscription_required`。
- 默认情况下，迁移不会读取源应用清单。因此，通过帐户门的应用程序支持的插件是在没有源应用程序可访问性验证的情况下规划的。使用 `codex_account_unavailable` 跳过帐户查找传输失败。
- Pass `--verify-plugin-apps` 强制生成新源 `app/installed` 快照，其中包含来自批处理 `app/read` 的授权元数据。该模式要求每个拥有的应用程序在计划本机激活之前都存在、启用和可访问。在这种模式下，帐户查找传输失败会导致源应用程序清单验证。快照仅针对当前进程保留在内存中。它永远不会写入迁移输出或目标配置。

禁用的插件、不可读的插件详细信息、订阅门控源帐户以及（设置 `--verify-plugin-apps` 时）丢失、禁用或无法访问的应用程序将成为手动跳过的项目，并键入原因而不是目标配置条目。 Apply 会为每个选定的符合条件的插件调用应用程序服务器 `plugin/install`，即使目标应用程序服务器已报告该插件已安装并已启用。迁移的 Codex 插件仅在选择本机 Codex harness的会话中可用。它们不会暴露于 OpenClaw 提供程序运行、ACP 对话绑定或其他工具。

### <a id="manual-review-codex-state"></a> 需要人工审核的 Codex 状态

Codex `config.toml`、原生 `hooks/hooks.json`、非精选 marketplaces、不是源安装精选 plugins 的缓存 plugin bundles，以及未通过源订阅门槛的源安装 plugins，均不会自动激活。设置 `--verify-plugin-apps` 时，未通过源 app 清单门槛的 plugins 也会被跳过。所有这些内容都会在迁移报告中被复制或报告，以供人工审查。

对于已迁移的源安装精选插件，apply 会写入：

- `plugins.entries.codex.enabled: true`
- `plugins.entries.codex.config.codexPlugins.enabled: true`
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions: true`
- 为每个选中的插件写入一个明确的插件条目，其中包含 `marketplaceName: "openai-curated"` 和 `pluginName`

Migration 绝不会写入 `plugins["*"]`，也绝不会存储本地 marketplace 缓存路径。

跳过的插件不会写入目标配置。手动项目上报告源端订阅失败，并键入原因：`codex_subscription_required`、`codex_account_unavailable`、`plugin_disabled` 或 `plugin_read_unavailable`。对于 `--verify-plugin-apps`，源应用程序清单故障也可能显示为 `app_inaccessible`、`app_disabled`、`app_missing` 或 `app_inventory_unavailable`。受影响的插件项目上报告了目标端需要身份验证的安装，其中包含 `status: "skipped"`、`reason: "auth_required"` 和已清理的应用程序标识符。它们的显式配置条目将被禁用，直到您重新授权并启用它们为止。其他安装失败是项目范围的 `error` 结果。

如果在规划过程中 Codex app-server plugin 清单不可用，迁移会回退到缓存 bundle 的建议项，而不会使整个迁移失败。

## <a id="hermes-provider"></a> Hermes 提供程序

捆绑的 Hermes 提供程序会遵循 `$HERMES_HOME` 和当前激活的配置文件，然后使用平台默认路径（`~/.hermes` 或 `%LOCALAPPDATA%\hermes`）。使用 `--from <path>` 可覆盖自动发现。

### <a id="what-hermes-imports"></a> Hermes 导入内容

- `config.yaml` 的默认模型配置。 `--agent <id>` 将模型应用于选定的代理，而不更改共享默认值或其他代理。
- 来自 `model`、`providers` 和 `custom_providers` 的配置模型提供程序和自定义 OpenAI- 兼容端点，包括支持的 Hermes 传输别名、camelCase 字段和模型列表元数据。
- MCP 服务器定义来自 `mcp_servers` 或 `mcp.servers`。精确的 OpenClaw 映射涵盖默认 Streamable HTTP 路由、OAuth 范围、布尔 TLS 验证、单独的客户端 certificate/key 路径和 Hermes native/resource/prompt 工具策略。报告不支持的仅 Hermes 运行时或凭证字段以供手动审核。
- 将 `SOUL.md` 和 `AGENTS.md` 导入 OpenClaw 代理工作区。
- `memories/MEMORY.md` 和 `memories/USER.md` 附加到工作区内存文件。仅内存表面（载入内存页面和 Control UI 内存导入页面）将这些文件复制到 `memory/imports/hermes/` 下以进行索引调用，而无需触及现有工作区内存。
- OpenClaw 文件记忆的记忆配置默认值，以及外部记忆提供程序（如 Honcho）的归档或人工审查项。
- 包括 `skills/` 中活动目录下的 `SKILL.md` 文件的技能。嵌套技能被平铺到工作区技能目录中，组织镜像遵循 `_org/.active_org`。
- 来自 `skills.config` 的每技能配置值和来自 `skills.disabled` 的全局禁用状态。
- 当接受交互式凭据迁移时，或设置了 `--include-secrets` 时，当前 Hermes OpenAI Codex OAuth 凭据和 OpenCode OpenAI OAuth 凭据。不要让 Hermes 和 OpenClaw 使用同一个已导入的刷新授权。
- 当接受交互式凭证迁移或设置 `--include-secrets` 时，支持来自 Hermes `.env` 和 OpenCode `auth.json` 的 API 密钥和令牌。

### <a id="supported-.env-keys"></a><a id="supported-env-keys"></a> 支持的 `.env` 密钥

`AI_GATEWAY_API_KEY`, `ALIBABA_API_KEY`, `ALIBABA_CODING_PLAN_API_KEY`, `ANTHROPIC_API_KEY`, `ARCEEAI_API_KEY`, `CEREBRAS_API_KEY`, `CHUTES_API_KEY`, `CLOUDFLARE_AI_GATEWAY_API_KEY`, `COPILOT_GITHUB_TOKEN`, `DASHSCOPE_API_KEY`, `DEEPINFRA_API_KEY`, `DEEPSEEK_API_KEY`, `FIREWORKS_API_KEY`, `GEMINI_API_KEY`, `GLM_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`, `HF_TOKEN`, `HUGGINGFACE_HUB_TOKEN`, `KILOCODE_API_KEY`, `KIMICODE_API_KEY`, `KIMI_API_KEY`, `KIMI_CN_API_KEY`, `KIMI_CODING_API_KEY`, `MINIMAX_API_KEY`, `MINIMAX_CN_API_KEY`, `MINIMAX_CODING_API_KEY`, `MISTRAL_API_KEY`, `MODELSTUDIO_API_KEY`, `MOONSHOT_API_KEY`, `NVIDIA_API_KEY`, `OPENAI_API_KEY`, `OPENCODE_API_KEY`, `OPENCODE_GO_API_KEY`, `OPENCODE_ZEN_API_KEY`, `OPENROUTER_API_KEY`, `QIANFAN_API_KEY`, `QWEN_API_KEY`, `TOGETHER_API_KEY`, `VENICE_API_KEY`, `XAI_API_KEY`, `XIAOMI_API_KEY`, `ZAI_API_KEY`, `Z_AI_API_KEY`.

### <a id="archive-only-state"></a> 仅归档状态

Hermes声明OpenClaw无法安全解释被复制到迁移报告中以供人工审核。它不会加载到实时 OpenClaw 配置或凭证中。这包括 `plugins/`、`sessions/`、`logs/`、`cron/`、`mcp-tokens/`、`plans/`、`workspace/`、`skins/`、`kanban/`、 pairing/platform状态、网关routing/process状态以及检测到的Hermes SQLite数据库。

### <a id="after-applying"></a> 应用后

```bash
openclaw doctor
```

## <a id="plugin-contract"></a> 插件契约

迁移源是插件。插件在 `openclaw.plugin.json` 中声明其 provider id：

```json
{
  "contracts": {
    "migrationProviders": ["hermes"]
  }
}
```

在运行时，插件调用 `api.registerMigrationProvider(...)`。提供程序实现 `detect`、`plan` 和 `apply`。核心拥有 CLI 编排、备份策略、提示、JSON 输出和冲突预检。 Core 将经过审查的计划传递到 `apply(ctx, plan)`，并且仅当不存在兼容性参数时，提供商才可以重建计划。迁移项目可能会为外部激活效果设置 `applyPhase: "after-promotion"`，该效果必须推迟到暂存的本地数据持久发布为止。这些提供者必须声明 `deferredApply: { retrySafe: true }` 并使每个延迟效果在中断过程后可以安全地重播。入门引导拒绝未申报的递延效应。已经完成的效果应该返回一个带有 `deferredCompletion: true` 的非变异项，以便恢复可以将其记录为完成。独立 `openclaw migrate` 仍然通过其正常的备份支持流程应用完整的计划。

提供程序插件可以使用 `openclaw/plugin-sdk/migration` 进行条目构建和摘要计数，也可以使用 `openclaw/plugin-sdk/migration-runtime` 进行具备冲突感知的文件复制、仅归档报告复制、缓存的 config-runtime 包装器以及迁移报告。

在 JSON 模式下，以项目错误或冲突结束的应用会写入一份完整的迁移报告，并以代码 `1` 退出。检查 `summary` 和 `items` 以识别部分结果。

## <a id="onboarding-integration"></a> 引导集成

当提供商检测到已知来源时，入门引导可以提供迁移。 `openclaw onboard --flow import` 和 `openclaw setup --wizard --import-from hermes` 都使用相同的插件迁移提供程序，并且在应用之前仍然显示预览。与独立迁移不同，新目标加入路径会暂存本地工件和导入的凭据。它验证或修复分段内导入的推理。然后，它会在提交配置之前提升工作区和代理状态。模式 `0600` 升级日志允许下一次运行完成或回滚中断的发布，包括任何延迟的外部激活，而无需重播导入的本地数据。

<Note>
引导导入需要全新的 OpenClaw 安装。如果你已经有本地状态，请先重置配置、凭据、会话和工作区。现有安装的备份加覆盖或合并导入属于功能开关控制。
</Note>

## <a id="related"></a> 相关内容

- [从 Hermes](/install/migrating-hermes) 迁移：面向用户的演练。
- [从 Claude](/install/migrating-claude) 迁移：面向用户的演练。
- [迁移](/install/migrating)：将 OpenClaw 迁移到新机器。
- [Doctor](/gateway/doctor)：应用迁移后的健康检查。
- [Plugins](/tools/plugin)：插件安装和注册。
