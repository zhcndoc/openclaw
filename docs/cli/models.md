---
summary: "openclaw models 模型的 CLI 参考（status/list/set/scan、别名、回退、认证）"
read_when:
  - 你想更改默认模型或查看提供方认证状态
  - 你想扫描可用的模型/提供方并调试认证配置文件
title: "模型"
---

# `openclaw models`

模型发现、扫描和配置（默认模型、回退、认证配置文件）。

相关：

- 提供方 + 模型：[模型](/providers/models)
- 模型选择概念 + `/models` 斜杠命令：[模型](/concepts/models)
- 提供方认证设置：[快速开始](/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models set-image <model-or-alias>
openclaw models scan
```

`status` 和 `auth` 子命令接受 `--agent <id>` 来指定一个已配置的 agent；`list`、`scan`、`aliases` 以及 `fallbacks`/`image-fallbacks` 始终使用已配置的默认 agent，而 `set`/`set-image` 会直接拒绝 `--agent`。在未指定时，支持 `--agent` 的命令会使用 `OPENCLAW_AGENT_DIR`（如果已设置），否则使用已配置的默认 agent。

### Status

`openclaw models status` 会显示解析后的默认值/回退项以及认证概览。 当可用提供方使用情况快照时，OAuth/API key 状态部分会包含提供方使用窗口和配额快照。当前使用窗口提供方：Anthropic、GitHub Copilot、Gemini CLI、OpenAI、MiniMax、小米和 z.ai。使用情况认证优先来自提供方特定的 hook；否则 OpenClaw 会回退到从 auth profile、环境变量或配置中匹配 OAuth/API key 凭据。

在 `--json` 输出中，`auth.providers` 是面向环境/配置/存储且感知的提供方概览，而 `auth.oauth` 仅表示 auth-store 中 profile 的健康状态。

选项：

| Flag                      | 作用                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `--json`                  | JSON 输出；auth profile、provider 和启动诊断信息会输出到 stderr，因此 stdout 仍可直接通过管道传给 `jq`。 |
| `--plain`                 | 纯文本输出。                                                                                               |
| `--check`                 | 如果认证即将过期/已过期，则以非零状态退出：`1` = 已过期/缺失，`2` = 即将过期。                             |
| `--probe`                 | 对已配置的认证 profile 进行实时探测。实际请求；可能消耗 token 并触发速率限制。                            |
| `--probe-provider <name>` | 仅探测一个提供方。                                                                                         |
| `--probe-profile <id>`    | 探测指定的认证 profile id（可重复或用逗号分隔）。                                                           |
| `--probe-timeout <ms>`    | 单次探测超时。                                                                                             |
| `--probe-concurrency <n>` | 并发探测数。                                                                                               |
| `--probe-max-tokens <n>`  | 探测时的最大 token 数（尽力而为）。                                                                        |
| `--agent <id>`            | 已配置的 agent id；会覆盖 `OPENCLAW_AGENT_DIR`。                                                           |

探测结果行可能来自 auth profile、环境凭据或 `models.json`。探测状态桶：`ok`、`auth`、`rate_limit`、`billing`、`timeout`、`format`、`unknown`、`no_model`。

当一次探测从未真正发起模型调用时，预期会看到以下探测详情/原因代码：

- `excluded_by_auth_order`：存在已存储的 profile，但显式的 `auth.order.<provider>` 将其省略，因此探测会报告被排除，而不是尝试它。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：profile 已存在，但不符合条件或无法解析。
- `ineligible_profile`：该 profile 因其他原因与提供方配置不兼容。
- `no_model`：存在提供方认证，但 OpenClaw 无法为该提供方解析出可探测的模型候选。

对于 OpenAI ChatGPT/Codex OAuth 排障，`openclaw models status`、`openclaw models auth list --provider openai` 和 `openclaw config get agents.defaults.model --json` 是最快确认某个 agent 是否拥有可用于通过原生 Codex 运行时访问 `openai/*` 的有效 `openai` OAuth profile 的方法。参见 [OpenAI provider setup](/providers/openai#check-and-recover-codex-oauth-routing)。

### List

`openclaw models list` 是只读的：它读取配置、auth profile、现有 catalog 状态以及由 provider 提供的 catalog 行，但绝不会重写 `models.json`。

选项：`--all`（完整 catalog）、`--local`（仅筛选本地模型）、`--provider <id>`、`--json`、`--plain`。

注意：

- `Auth` 列是 provider 级别且只读的。它由本地 auth profile 元数据、环境标记、已配置的 provider key、本地 provider 标记、AWS Bedrock 环境/profile 标记以及插件的 synthetic-auth 元数据计算得出；它不会加载 provider 运行时、读取 keychain 密钥、调用 provider API，也不能证明每个模型的精确执行就绪状态。
- 即使你尚未对某个提供方完成认证，`models list --all --provider <id>` 也可能包含来自插件 manifest 或内置 provider catalog 元数据的 provider-owned 静态 catalog 行。这些行在配置了匹配的认证之前仍会显示为不可用。
- `models list` 会在 provider catalog 发现过程较慢时保持控制平面响应。默认视图和已配置视图会在短暂等待后回退到已配置或 synthetic 模型行，并让发现过程在后台继续。需要精确的完整发现 catalog 且愿意等待时，请使用 `--all`。
- 广泛的 `models list --all` 会将 manifest catalog 行覆盖到 registry 行之上，而不会加载 provider runtime supplement hook。按 provider 过滤的 manifest 快速路径仅使用标记为 `static` 的 provider；标记为 `refreshable` 的 provider 仍保持 registry/cache 支持，并将 manifest 行作为补充追加，而标记为 `runtime` 的 provider 仍依赖 registry/runtime 发现。
- `models list` 会将原生模型元数据与运行时上限区分开来。在表格输出中，当有效的运行时上限与原生上下文窗口不同，`Ctx` 会显示 `contextTokens/contextWindow`；JSON 行中，当 provider 暴露该上限时会包含 `contextTokens`。
- `models list --provider <id>` 按 provider id 过滤，例如 `moonshot` 或 `openai`。它不接受交互式 provider 选择器中的显示标签，例如 `Moonshot AI`。
- 模型引用通过按 **第一个** `/` 进行拆分来解析。如果模型 ID 中包含 `/`（OpenRouter 风格），请包含 provider 前缀（例如 `openrouter/moonshotai/kimi-k2`）。
- 如果省略 provider，OpenClaw 会先将输入解析为别名，然后解析为与该精确模型 id 唯一匹配的已配置 provider，最后才在带有弃用警告的情况下回退到已配置的默认 provider。如果该 provider 不再暴露已配置的默认模型，OpenClaw 会回退到第一个已配置的 provider/model，而不是暴露一个过时的已移除 provider 默认值。
- `models status` 在 auth 输出中可能会为非密钥占位符显示 `marker(<value>)`（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），而不是将它们掩码为密钥。

### Set default / image model

```bash
openclaw models set <model-or-alias>
openclaw models set-image <model-or-alias>
```

`set` 会写入 `agents.defaults.model.primary`；`set-image` 会写入 `agents.defaults.imageModel.primary`。两者都接受 `provider/model` 或已配置的别名。`set` 还会在新选择的模型需要时修复 Codex/Copilot 运行时插件安装；`set-image` 不会。两个命令都不接受 `--agent`；它们始终写入 agent 默认值。

### Scan

`models scan` 会读取 OpenRouter 的公开 `:free` catalog，并对候选项进行排序以供回退使用。catalog 本身是公开的，因此仅元数据扫描不需要 OpenRouter key。

默认情况下，OpenClaw 会尝试通过实时模型调用来探测工具和图像支持。如果未配置 OpenRouter key，该命令会回退到仅元数据输出，并说明 `:free` 模型在探测和推理时仍需要 `OPENROUTER_API_KEY`。

选项：

- `--no-probe`（仅元数据；不查询配置/密钥）
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>`（目录请求和每次探测超时）
- `--concurrency <n>`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

`--set-default` 和 `--set-image` 需要实时探测；仅元数据的扫描结果仅供参考，不会应用到配置中。

## 别名

```bash
openclaw models aliases list [--json] [--plain]
openclaw models aliases add <alias> <model-or-alias>
openclaw models aliases remove <alias>
```

别名按每个模型条目存储为 `agents.defaults.models.<key>.alias`。`add` 会先将 `<model-or-alias>` 解析为规范的 provider/model 键，因此为别名再设置别名时，会将其重新指向而不是形成链式别名。

## 回退

```bash
openclaw models fallbacks list [--json] [--plain]
openclaw models fallbacks add <model-or-alias>
openclaw models fallbacks remove <model-or-alias>
openclaw models fallbacks clear
```

管理 `agents.defaults.model.fallbacks`。`openclaw models image-fallbacks list|add|remove|clear` 以相同的子命令形式管理并行的 `agents.defaults.imageModel.fallbacks` 列表。

## Auth profiles

```bash
openclaw models auth add
openclaw models auth list [--provider <id>] [--json]
openclaw models auth login --provider <id>
openclaw models auth login --provider openai --profile-id openai:work
openclaw models auth login-github-copilot
openclaw models auth paste-api-key --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token --provider <id>
openclaw models auth order get --provider <id>
openclaw models auth order set --provider <id> <profileIds...>
openclaw models auth order clear --provider <id>
```

`models auth add` 是交互式认证助手。根据你选择的 provider，它可以启动 provider 的认证流程（OAuth/API key），也可以引导你手动粘贴 token。

`models auth list` 会列出所选 agent 的已保存认证配置文件，但不会打印 token、API key 或 OAuth 密钥材料。使用 `--provider <id>` 可筛选到某个 provider，例如 `openai`，使用 `--json` 便于脚本化处理。

`models auth login` 会运行 provider 插件的认证流程（OAuth/API key）。使用 `openclaw plugins list` 查看已安装哪些 provider。`login` 支持 `--profile-id <id>`，适用于在登录期间支持命名配置文件的 provider（可用来将同一 provider 的多个登录分开保存），`--method <id>` 用于选择特定认证方法，`--device-code` 作为 `--method device-code` 的快捷方式，`--set-default` 用于应用 provider 推荐的默认模型，`--force` 用于先移除该 provider 现有的配置文件（当缓存的 OAuth 配置文件卡住，或你想切换账号时使用）。

`models auth login-github-copilot` 是 `models auth login --provider github-copilot --method device` 的快捷方式（GitHub device flow）；它接受 `--yes`，可在不提示的情况下覆盖现有配置文件。

使用 `openclaw models auth --agent <id> <subcommand>` 可将认证结果写入特定的已配置 agent 存储。父级 `--agent` 标志会被 `add`、`list`、`login`、`paste-api-key`、`setup-token`、`paste-token`、`login-github-copilot` 以及 `order get`/`set`/`clear` 继承。

对于 OpenAI 模型，`--provider openai` 默认使用 ChatGPT/Codex 账号登录。只有当你想添加 OpenAI API key 配置文件时才使用 `--method api-key`，通常这是 Codex 订阅额度的备用方案。运行 `openclaw doctor --fix` 可将旧版遗留的 OpenAI Codex 前缀认证/配置文件状态迁移到 `openai`。

示例：

```bash
openclaw models auth login --provider openai --set-default
openclaw models auth login --provider openai --method api-key
openclaw models auth paste-api-key --provider openai
openclaw models auth list --provider openai
```

注意：

- `paste-api-key` 接受在其他地方生成的 API key，会提示你输入 key 值，并将其写入默认配置文件 id `<provider>:manual`，除非你传入 `--profile-id`。在自动化场景中，可以通过 stdin 管道传入 key，例如 `printf "%s\n" "$OPENAI_API_KEY" | openclaw models auth paste-api-key --provider openai`。
- `setup-token` 和 `paste-token` 仍然是适用于暴露 token 认证方法的 provider 的通用 token 命令。
- `setup-token` 需要交互式 TTY，并运行 provider 的 token-auth 方法（默认使用该 provider 暴露的 `setup-token` 方法）。
- `paste-token` 需要 `--provider`，默认会提示输入 token 值，并将其写入默认配置文件 id `<provider>:manual`，除非你传入 `--profile-id`。在自动化场景中，请通过 stdin 管道传入 token，而不要将其作为参数传递，这样 provider 凭据就不会出现在 shell 历史或进程列表中。
- `paste-token --expires-in <duration>` 会将相对时长（例如 `365d` 或 `12h`）保存为绝对 token 过期时间。
- 对于 `openai`，OpenAI API key 和 ChatGPT/OAuth token 材料属于不同的认证形态。`sk-...` OpenAI API key 请使用 `paste-api-key`，而 `paste-token` 仅用于 token 认证材料。
- Anthropic：`setup-token`/`paste-token` 是 `anthropic` 支持的 OpenClaw 认证路径，但在主机上如果可用，OpenClaw 更倾向于复用 Claude CLI（`claude -p`）。
- `auth order get/set/clear` 管理某个 provider 的按 agent 认证配置文件顺序覆盖，该信息存储在 `auth-state.json` 中（与 `auth.order.<provider>` 配置键分开）。`set` 按优先级顺序接收一个或多个 profile id；`clear` 则回退到配置/轮询排序。

## 相关

- [CLI 参考](/cli)
- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
