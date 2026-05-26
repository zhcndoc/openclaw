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
openclaw models scan
```

`openclaw models status` 会显示解析后的默认值/回退项以及认证概览。
当可用提供方使用情况快照时，OAuth/API 密钥状态部分会包含
提供方使用窗口和配额快照。
当前使用窗口提供方：Anthropic、GitHub Copilot、Gemini CLI、OpenAI
Codex、MiniMax、Xiaomi 和 z.ai。使用认证来自
提供方特定的 hook（如可用）；否则 OpenClaw 会回退到
auth 配置文件、环境变量或配置中匹配的 OAuth/API 密钥
凭据。
在 `--json` 输出中，`auth.providers` 是考虑环境/配置/存储的提供方
概览，而 `auth.oauth` 仅是 auth store 配置文件健康状态。
添加 `--probe` 可针对每个已配置的提供方配置文件运行实时认证探测。
探测是真实请求（可能消耗 token 并触发速率限制）。
使用 `--agent <id>` 可检查已配置代理的模型/认证状态。若省略，
该命令会使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（如果已设置），否则
使用已配置的默认代理。
探测行可以来自 auth 配置文件、环境凭据或 `models.json`。
对于 Codex OAuth 故障排查，`openclaw models status`、
`openclaw models auth list --provider openai-codex`，以及
`openclaw config get agents.defaults.model --json` 是最快的方法，
可确认某个代理是否具有可用于
通过原生 Codex 运行时访问 `openai/*` 的可用 `openai-codex` auth 配置文件。参见 [OpenAI provider setup](/providers/openai#check-and-recover-codex-oauth-routing)。

注意：

- `models set <model-or-alias>` 接受 `provider/model` 或别名。
- `models list` 是只读的：它会读取配置、认证配置文件、现有目录
  状态以及提供方拥有的目录行，但不会重写
  `models.json`。
- `Auth` 列是提供方级别且只读的。它根据本地
  认证配置文件元数据、环境标记、已配置的提供方密钥、本地提供方
  标记、AWS Bedrock 环境/配置文件标记以及插件合成认证元数据计算；
  它不会加载提供方运行时、读取密钥环机密、调用提供方
  API，也不会证明逐模型的精确执行就绪状态。
- `models list --all --provider <id>` 即使你尚未对该提供方完成认证，
  也可以包含来自插件清单或内置提供方目录元数据的、由提供方拥有的
  静态目录行。此类行在匹配认证配置之前仍会显示为
  不可用。
- `models list` 会在提供方目录发现较慢时保持控制平面响应。
  默认和已配置视图会在短暂等待后回退到已配置或合成的模型行，
  并让发现过程在后台继续完成。若你需要精确的完整发现目录并且
  愿意等待提供方发现，请使用 `--all`。
- 广泛的 `models list --all` 会将清单目录行叠加到注册表行之上，
  而不会加载提供方运行时补充 hook。按提供方过滤的清单快速路径仅使用
  标记为 `static` 的提供方；标记为 `refreshable` 的提供方仍保持
  由注册表/缓存支持，并将清单行作为补充附加，而标记为 `runtime`
  的提供方仍依赖注册表/运行时发现。
- `models list` 会保持原生模型元数据与运行时限制的区分。在表格
  输出中，若有效运行时限制不同于原生上下文窗口，`Ctx` 会显示
  `contextTokens/contextWindow`；JSON 行会在提供方暴露该限制时包含
  `contextTokens`。
- `models list --provider <id>` 按提供方 id 过滤，例如 `moonshot` 或
  `openai-codex`。它不接受交互式提供方选择器中的显示标签，例如
  `Moonshot AI`。
- 模型引用会通过按**第一个** `/` 分割来解析。如果模型 id 包含 `/`（OpenRouter 风格），请包含提供方前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果你省略提供方，OpenClaw 会先将输入解析为别名，然后解析为该精确模型 id 的唯一已配置提供方匹配，最后才会带着弃用警告回退到已配置的默认提供方。
  如果该提供方不再暴露已配置的默认模型，OpenClaw 会回退到第一个已配置的提供方/模型，而不是暴露一个过时的已移除提供方默认值。
- `models status` 在认证输出中可能会为非秘密占位符显示 `marker(<value>)`（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），而不是将其掩码为密钥。

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
openclaw models auth list [--provider <id>] [--json]
openclaw models auth login --provider <id>
openclaw models auth login --provider openai --profile-id openai:work
openclaw models auth paste-api-key --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` 是交互式认证助手。它可以启动提供方认证
流程（OAuth/API 密钥），或根据你选择的提供方引导你手动粘贴令牌。

`models auth list` 会列出所选代理的已保存认证配置文件，而不会
打印 token、API 密钥或 OAuth 密钥材料。使用 `--provider <id>` 可
筛选到单个提供方，例如 `openai-codex`，并使用 `--json` 便于脚本处理。

`models auth login` 运行提供方插件的认证流程（OAuth/API 密钥）。使用
`openclaw plugins list` 可查看已安装哪些提供方。
使用 `openclaw models auth --agent <id> <subcommand>` 可将认证结果写入
特定的已配置代理存储。父级 `--agent` 标志会被
`add`、`list`、`login`、`paste-api-key`、`setup-token`、`paste-token` 和
`login-github-copilot` 继承。

对于 OpenAI 模型，`--provider openai` 默认使用 ChatGPT/Codex 账户登录。
仅当你想添加 OpenAI API 密钥配置文件时才使用 `--method api-key`，
通常这是 Codex 订阅额度的备用方案。旧的
`--provider openai-codex` 写法对现有脚本仍然有效。

示例：

```bash
openclaw models auth login --provider openai --set-default
openclaw models auth login --provider openai --method api-key
openclaw models auth paste-api-key --provider openai-codex
openclaw models auth list --provider openai
```

注意：

- `login` 接受 `--profile-id <id>`，适用于在登录期间支持命名
  配置文件的提供方。使用它可以将同一
  提供方的多个登录彼此分开。
- `paste-api-key` 接受在别处生成的 API 密钥，提示输入密钥
  值，并将其写入默认配置文件 id `<provider>:manual`，除非你
  传入 `--profile-id`。在自动化中，可将密钥通过 stdin 传入，例如
  `printf "%s\n" "$OPENAI_API_KEY" | openclaw models auth paste-api-key --provider openai-codex`。
- `setup-token` 和 `paste-token` 仍然是面向暴露令牌认证方法的
  提供方的通用令牌命令。
- `setup-token` 需要交互式 TTY，并运行提供方的令牌认证
  方法（当该提供方暴露该方法时，默认为其 `setup-token` 方法）。
- `paste-token` 接受在别处或通过自动化生成的令牌字符串。
- `paste-token` 需要 `--provider`，提示输入令牌值，并将其写入
  默认配置文件 id `<provider>:manual`，除非你传入
  `--profile-id`。
- `paste-token --expires-in <duration>` 会将相对时长（如 `365d` 或 `12h`）
  转换为绝对令牌过期时间并保存。
- 对于 `openai-codex`，OpenAI API 密钥和 ChatGPT/OAuth 令牌材料属于
  不同的认证形态。`sk-...` OpenAI API 密钥请使用 `paste-api-key`，
  仅对令牌认证材料使用 `paste-token`。
- Anthropic 注：Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 用法已再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 会将 Claude CLI 复用和 `claude -p` 用法视为该集成的受认可用法。
- Anthropic `setup-token` / `paste-token` 仍可作为受支持的 OpenClaw 令牌路径使用，但 OpenClaw 现在在可用时更倾向于 Claude CLI 复用和 `claude -p`。

## 相关

- [CLI 参考](/cli)
- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
