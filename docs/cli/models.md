---
summary: "openclaw models 的 CLI 参考（status/list/set/scan、别名、回退、认证）"
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
openclaw models scan
```

`openclaw models status` 会显示解析后的默认值/回退以及认证概览。
当可用提供方使用快照时，OAuth/API 密钥状态部分会包含
提供方使用窗口和配额快照。
当前使用窗口提供方：Anthropic、GitHub Copilot、Gemini CLI、OpenAI
Codex、MiniMax、小米和 z.ai。使用认证来自提供方特定的钩子，
如果可用；否则 OpenClaw 会回退为从认证配置文件、环境变量或配置中
匹配 OAuth/API 密钥凭据。
在 `--json` 输出中，`auth.providers` 是支持环境/配置/存储感知的提供方
概览，而 `auth.oauth` 仅是认证存储配置文件健康状态。
添加 `--probe` 可针对每个已配置的提供方配置文件运行实时认证探测。
探测是真实请求（可能消耗令牌并触发速率限制）。
使用 `--agent <id>` 可检查某个已配置代理的模型/认证状态。省略时，
命令会使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（如果已设置），否则使用
已配置的默认代理。
探测行可以来自认证配置文件、环境凭据或 `models.json`。

注意：

- `models set <model-or-alias>` 接受 `provider/model` 或别名。
- `models list` 是只读的：它会读取配置、认证配置文件、现有目录
  状态以及提供方拥有的目录行，但不会重写
  `models.json`。
- `models list --all --provider <id>` 可以包含来自插件清单或内置提供方目录元数据的
  提供方拥有的静态目录行，即使你
  还没有对该提供方进行认证。这些行仍会显示为
  不可用，直到配置了匹配的认证。
- 广泛的 `models list --all` 会在不加载提供方运行时补充钩子的情况下，将清单目录行覆盖到注册表行之上。
  按提供方过滤的清单快速路径只使用标记为 `static` 的提供方；标记为 `refreshable` 的提供方
  仍保持由注册表/缓存支持，并将清单行作为补充追加，而
  标记为 `runtime` 的提供方仍停留在注册表/运行时发现路径上。
- `models list` 会保持原生模型元数据与运行时上限彼此独立。
  在表格输出中，`Ctx` 会在有效运行时上限与
  原生上下文窗口不同时显示 `contextTokens/contextWindow`；JSON 行在
  提供方公开该上限时会包含 `contextTokens`。
- `models list --provider <id>` 按提供方 id 过滤，例如 `moonshot` 或
  `openai-codex`。它不接受交互式提供方选择器中的显示标签，
  例如 `Moonshot AI`。
- 模型引用通过按**第一个** `/` 分割来解析。如果模型 ID 中包含 `/`（OpenRouter 风格），请包含提供方前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果你省略提供方，OpenClaw 会先将输入解析为别名，
  然后解析为该精确模型 id 的唯一已配置提供方匹配，最后才在
  配置的默认提供方上回退，并给出弃用警告。
  如果该提供方不再公开配置的默认模型，OpenClaw 会回退到
  第一个已配置的提供方/模型，而不是暴露一个已失效、被移除提供方的默认值。
- `models status` 可能会在认证输出中显示 `marker(<value>)`，用于非秘密占位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），而不是将它们掩码为秘密。

### Models scan

`models scan` 会读取 OpenRouter 的公开 `:free` 目录并为回退用途
对候选项进行排序。目录本身是公开的，因此仅元数据扫描不需要
OpenRouter key。

默认情况下，OpenClaw 会尝试通过实时模型调用探测工具和图像支持。
如果未配置 OpenRouter key，该命令会回退到仅元数据输出，并说明
`:free` 模型在探测和推理时仍需要 `OPENROUTER_API_KEY`。

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

`--set-default` 和 `--set-image` 需要实时探测；仅元数据的扫描结果
仅供参考，不会应用到配置中。

### Models status

选项：

- `--json`
- `--plain`
- `--check`（退出码 1=已过期/缺失，2=即将过期）
- `--probe`（对已配置的认证配置文件进行实时探测）
- `--probe-provider <name>`（探测一个提供方）
- `--probe-profile <id>`（可重复或逗号分隔的配置文件 id）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`（已配置代理 id；覆盖 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`）

`--json` 会保留 stdout 仅用于 JSON 负载。认证配置文件、提供方和
启动诊断会路由到 stderr，因此脚本可以将 stdout 直接管道传给
诸如 `jq` 之类的工具。

探测状态桶：

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

可预期的探测详情/原因代码情况：

- `excluded_by_auth_order`：存在已存储的配置文件，但显式
  `auth.order.<provider>` 将其省略，因此探测会报告该排除，而不是
  尝试它。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：
  配置文件存在，但不可用/不可解析。
- `no_model`：提供方认证存在，但 OpenClaw 无法解析出该提供方可探测的
  模型候选项。

## 别名 + 回退

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 认证配置文件

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` 是交互式认证助手。它可以启动提供方认证
流程（OAuth/API 密钥），或根据你选择的提供方引导你手动粘贴令牌。

`models auth login` 会运行提供方插件的认证流程（OAuth/API 密钥）。使用
`openclaw plugins list` 查看已安装了哪些提供方。
使用 `openclaw models auth --agent <id> <subcommand>` 可将认证结果写入
特定已配置的代理存储。父级 `--agent` 标志适用于
`add`、`login`、`setup-token`、`paste-token` 和 `login-github-copilot`。

示例：

```bash
openclaw models auth login --provider openai-codex --set-default
```

注意：

- `setup-token` 和 `paste-token` 仍然是通用的令牌命令，适用于
  提供令牌认证方法的提供方。
- `setup-token` 需要交互式 TTY，并运行提供方的令牌认证
  方法（当其暴露了该方法时，默认使用该提供方的 `setup-token` 方法）。
- `paste-token` 接受在其他地方生成或来自自动化的令牌字符串。
- `paste-token` 需要 `--provider`，会提示输入令牌值，并将其写入
  默认配置文件 id `<provider>:manual`，除非你传入
  `--profile-id`。
- `paste-token --expires-in <duration>` 会根据相对时长（如 `365d` 或 `12h`）存储一个绝对令牌过期时间。
- Anthropic 说明：Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 使用现在再次被允许，因此 OpenClaw 会将 Claude CLI 复用和 `claude -p` 的使用视为该集成已获授权，除非 Anthropic 发布新政策。
- Anthropic `setup-token` / `paste-token` 仍然作为受支持的 OpenClaw 令牌路径可用，但 OpenClaw 现在在可用时优先使用 Claude CLI 复用和 `claude -p`。

## 相关

- [CLI 参考](/cli)
- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
