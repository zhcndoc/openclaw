---
summary: "openclaw 模型 CLI 参考（status/list/set/scan、别名、回退、认证）"
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
- 提供方认证设置：[快速开始](/start/getting-started)。

## 常用命令

```bash
openclaw models --json
openclaw models status
openclaw models list
openclaw models refresh
openclaw models set <model-or-alias>
openclaw models set-image <model-or-alias>
openclaw models scan
```

`status` 和 `auth` 子命令接受 `--agent <id>` 来指定一个已配置的 agent；`list`、`scan`、`aliases` 以及 `fallbacks`/`image-fallbacks` 始终使用已配置的默认 agent，而 `set`/`set-image` 会直接拒绝 `--agent`。在未指定时，支持 `--agent` 的命令会使用 `OPENCLAW_AGENT_DIR`（如果已设置），否则使用已配置的默认 agent。

### 状态

直接运行 `openclaw models` 等同于运行 `openclaw models status`。  
`openclaw models --json` 返回与 `openclaw models status --json` 相同的对象。

`openclaw models status` 会显示解析后的默认模型/回退模型以及认证概览。对于 Codex 等由插件拥有的 agent 运行时，它还会检查所属插件是否已启用，以及是否通过了启动负载验证。拥有有效凭据但运行时不可用的路由会报告 `status: unavailable`，而不是 `usable`；JSON 输出会分别包含 `authStatus`、`runtimeStatus` 以及受限的运行时诊断信息。当提供方使用情况快照可用时，OAuth/API 密钥状态部分会包含提供方使用窗口和配额快照。目前支持使用窗口的提供方：Anthropic、GitHub Copilot、OpenAI、MiniMax、Xiaomi 和 z.ai。使用情况认证在可用时来自提供方专用钩子；否则 OpenClaw 会从认证配置文件、环境变量或配置中匹配 OAuth/API 密钥凭据。

在 `--json` 输出中，`auth.providers` 是面向环境/配置/存储且感知的提供方概览，而 `auth.oauth` 仅表示 auth-store 中 profile 的健康状态。

选项：

| Flag                      | 作用                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `--json`                  | JSON 输出；auth-profile、provider 和启动诊断会输出到 stderr，这样 stdout 仍可直接通过管道传给 `jq`。                            |
| `--plain`                 | 纯文本输出。                                                                                                                       |
| `--check`                 | 如果认证即将过期/已过期，或所选 agent 运行时不可用，则以非零状态退出：`1` = 不可用/已过期/缺失，`2` = 即将过期。 |
| `--probe`                 | 对已配置的 auth profile 进行实时探测。会发起真实请求；可能消耗 token 并触发速率限制。                                       |
| `--probe-provider <name>` | 仅探测一个提供方。                                                                                                                 |
| `--probe-profile <id>`    | 探测特定的 auth profile id（可重复或用逗号分隔）。                                                                             |
| `--probe-timeout <ms>`    | 每次探测的超时时间。                                                                                                                       |
| `--probe-concurrency <n>` | 并发探测数。                                                                                                                       |
| `--probe-max-tokens <n>`  | 探测时的最大 token 数（尽力而为）。                                                                                                          |
| `--agent <id>`            | 已配置的 agent id；会覆盖 `OPENCLAW_AGENT_DIR`。                                                                                     |

探测结果行可能来自 auth profile、环境凭据或 `models.json`。探测状态桶：`ok`、`auth`、`rate_limit`、`billing`、`timeout`、`format`、`unknown`、`no_model`。

当一次探测从未真正发起模型调用时，预期会看到以下探测详情/原因代码：

- `excluded_by_auth_order`：存在已存储的 profile，但显式的 `auth.order.<provider>` 将其省略，因此探测会报告被排除，而不是尝试它。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：profile 已存在，但不符合条件或无法解析。
- `ineligible_profile`：该 profile 因其他原因与提供方配置不兼容。
- `no_model`：存在提供方认证，但 OpenClaw 无法为该提供方解析出可探测的模型候选。

对于 OpenAI ChatGPT/Codex OAuth 排障，`openclaw models status`、`openclaw models auth list --provider openai` 和 `openclaw config get agents.defaults.model --json` 是最快确认某个 agent 是否拥有可用于通过原生 Codex 运行时访问 `openai/*` 的有效 `openai` OAuth profile 的方法。参见 [OpenAI 提供方设置](/providers/openai#check-and-recover-codex-oauth-routing)。

### 列表

`openclaw models list` 是只读的：它读取配置、auth profile、现有 catalog 状态以及由 provider 提供的 catalog 行，但绝不会重写 `models.json`。

`openclaw models refresh [--json]` 会强制立即检查托管 catalog。  
更新后的行会在下一次重启后应用到正在运行的 Gateway。若 `models.catalogRefresh.enabled` 为 `false`，该命令会明确输出已禁用的结果。  
catalog 的公开变更历史位于
[`openclaw/catalog`](https://github.com/openclaw/catalog)，其中每次内容更新都会由计划发布器提交。

选项：`--all`（完整 catalog）、`--local`（筛选本地模型）、`--provider <id>`、`--json`、`--plain`。

注意：

- `Auth` 列是只读的。对于由提供方拥有的模型路由（例如 OpenAI），它会将每一行的 API/base-URL 路由与有效 `auth.order`、环境/配置凭据以及已解析的命令作用域 SecretRefs 中的可用 profile 进行匹配。某个具体的 OpenAI 行在其路由策略不可用时会保持未知，而不会借用提供方级别认证；仅提供方旧版检查和其他提供方仍保留提供方级别行为。插件的 synthetic-auth 元数据只是运行时能力提示，并不能证明原生账号认证可用，因此在没有 registry 正向证据时，依赖账号的路由仍会显示为未知。该命令不会加载提供方运行时、读取 keychain 密钥、调用提供方 API，也不会证明确切的执行就绪状态。
- `models list --all --provider <id>` 即使你尚未在该提供方完成认证，也可以包含来自插件清单或内置提供方 catalog 元数据的提供方拥有的静态 catalog 行。这些行在未配置匹配认证之前仍会显示为不可用。
- 当提供方 catalog 发现过程较慢时，`models list` 会保持控制平面响应迅速。默认视图和已配置视图会在短暂等待后回退到已配置或合成的模型行，并让发现过程在后台继续完成。若你需要精确的完整发现 catalog 且愿意等待提供方发现完成，请使用 `--all`。
- 宽泛的 `models list --all` 会在不加载提供方运行时补充 hook 的情况下，将 manifest catalog 行合并到 registry 行之上。按提供方筛选的 manifest 快速路径只使用标记为 `static` 的提供方；标记为 `refreshable` 的提供方仍保持 registry/cache-backed，并将 manifest 行作为补充追加；而标记为 `runtime` 的提供方则仍依赖 registry/runtime 发现。
- `models list` 会将原生模型元数据与运行时上限区分开来。在表格输出中，当有效运行时上限与原生上下文窗口不同时，`Ctx` 会显示 `contextTokens/contextWindow`；JSON 行在提供方暴露该上限时会包含 `contextTokens`。
- 对于由提供方拥有的路由，`models list` 会将一个逻辑 provider/model 行投影到所选路由上。`Input` 和 `Ctx` 只来自完全匹配的物理路由 catalog 行，并在最后应用显式配置的逻辑覆盖；未解析的路由选择会显示未知能力字段，而不会借用同级路由的元数据。
- `models list --provider <id>` 通过提供方 id 进行筛选，例如 `moonshot` 或 `openai`。它不接受交互式提供方选择器中的显示标签，例如 `Moonshot AI`。
- 模型引用通过拆分第一个 `/` 来解析。如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含提供方前缀（例如 `openrouter/moonshotai/kimi-k2`）。
- 如果你省略提供方，OpenClaw 会先将输入解析为别名，然后解析为与该确切模型 id 对应的唯一已配置提供方匹配，最后才带着弃用警告回退到已配置的默认提供方。如果该提供方不再暴露已配置的默认模型，OpenClaw 会回退到第一个已配置的提供方/模型，而不是显示一个已失效、已移除提供方的默认值。
- `models status` 在认证输出中可能会显示 `marker(<value>)`，用于非密钥占位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），而不是将它们掩码为密钥。

### 设置默认/图像模型

```bash
openclaw models set <model-or-alias>
openclaw models set-image <model-or-alias>
```

`set` 会写入 `agents.defaults.model.primary`；`set-image` 会写入 `agents.defaults.imageModel.primary`。两者都接受 `provider/model` 或已配置的别名。`set` 还会在新选择的模型需要时修复 Codex/Copilot 运行时插件安装；`set-image` 不会。两个命令都不接受 `--agent`；它们始终写入 agent 默认值。

### 扫描

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

别名按模型条目存储为 `agents.defaults.models.<key>.alias`。`add` 会先将 `<model-or-alias>` 解析为规范的提供方/模型键，因此对别名再添加别名时会重新指向它，而不是形成链式引用。  
添加别名不会更改 `agents.defaults.modelPolicy.allow`，也不会限制模型覆盖。

## 回退

```bash
openclaw models fallbacks list [--json] [--plain]
openclaw models fallbacks add <model-or-alias>
openclaw models fallbacks remove <model-or-alias>
openclaw models fallbacks clear
```

管理 `agents.defaults.model.fallbacks`。`openclaw models image-fallbacks list|add|remove|clear` 以相同的子命令形式管理并行的 `agents.defaults.imageModel.fallbacks` 列表。

## 认证配置文件

```bash
openclaw models auth add
openclaw models auth list [--provider <id>] [--json]
openclaw models auth login --provider <id>
openclaw models auth login --provider openai --profile-id openai:work
openclaw models auth login-github-copilot
openclaw models auth logout <profileId> [--yes]
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

`models auth logout <profileId>` 会从所选 agent 的认证存储中移除一个已保存的认证配置文件。请使用 `models auth list` 显示的配置文件 id。它还会从你的配置中的 `auth.profiles` 以及所有 `auth.order` 列表中删除该配置文件，因此不会留下过期引用，并且会删除一个原本会被清空的 `auth.order.<provider>` 条目（已定义的空顺序表示“选择不使用任何配置文件”，这会禁用该 provider）。在 TTY 环境下会提示确认；脚本和 agent 请传入 `--yes`。如果该配置文件不在存储中，或者有 `models.providers.<id>.apiKey` 条目指向它，logout 会拒绝执行——请先更改该配置值。

`models auth login-github-copilot` 是 `models auth login --provider github-copilot --method device`（GitHub device flow）的快捷方式；它接受 `--yes`，可在不提示的情况下覆盖现有配置文件。

使用 `openclaw models auth --agent <id> <subcommand>` 可将认证结果写入某个特定的已配置 agent 存储。父级 `--agent` 标志适用于 `add`、`list`、`login`、`logout`、`paste-api-key`、`setup-token`、`paste-token`、`login-github-copilot` 以及 `order get`/`set`/`clear`。

对于 OpenAI 模型，`--provider openai` 默认使用 ChatGPT/Codex 账号登录。只有当你想添加 OpenAI API key 配置文件时才使用 `--method api-key`，通常这是 Codex 订阅额度的备用方案。运行 `openclaw doctor --fix` 可将旧版遗留的 OpenAI Codex 前缀认证/配置文件状态迁移到 `openai`。

示例：

```bash
openclaw models auth login --provider openai --set-default
openclaw models auth login --provider openai --method api-key
openclaw models auth paste-api-key --provider openai
openclaw models auth list --provider openai
openclaw models auth logout openai:manual --yes
```

注意：

- `paste-api-key` 接受在其他地方生成的 API key，会提示你输入 key 值，并将其写入默认配置文件 id `<provider>:manual`，除非你传入 `--profile-id`。在自动化场景中，可以通过 stdin 管道传入 key，例如 `printf "%s\n" "$OPENAI_API_KEY" | openclaw models auth paste-api-key --provider openai`。
- `setup-token` 和 `paste-token` 仍然是适用于暴露 token 认证方法的 provider 的通用 token 命令。
- `setup-token` 需要交互式 TTY，并运行 provider 的 token-auth 方法（默认使用该 provider 暴露的 `setup-token` 方法）。
- `paste-token` 需要 `--provider`，默认会提示输入 token 值，并将其写入默认配置文件 id `<provider>:manual`，除非你传入 `--profile-id`。在自动化场景中，请通过 stdin 管道传入 token，而不要将其作为参数传递，这样 provider 凭据就不会出现在 shell 历史或进程列表中。
- `paste-token --expires-in <duration>` 会将相对时长（例如 `365d` 或 `12h`）保存为绝对 token 过期时间。
- 对于 `openai`，OpenAI API key 和 ChatGPT/OAuth token 材料属于不同的认证形态。`sk-...` OpenAI API key 请使用 `paste-api-key`，而 `paste-token` 仅用于 token 认证材料。
- Anthropic：`setup-token`/`paste-token` 是适用于 `anthropic` 的 OpenClaw 认证路径，但在主机上如果可用，OpenClaw 更倾向于复用 Claude CLI（`claude -p`）。
- `auth order get/set/clear` 管理某个 provider 的按 agent 认证配置文件顺序覆盖，该信息存储在 `auth-state.json` 中（与 `auth.order.<provider>` 配置键分开）。`set` 按优先级顺序接收一个或多个 profile id；`clear` 则回退到配置/轮询排序。

## 相关

- [CLI 参考](/cli)
- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
