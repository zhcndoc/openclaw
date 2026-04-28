---
summary: "命令行界面参考：`openclaw models`（状态/列表/设置/扫描，别名，回退，认证）"
read_when:
  - 您想更改默认模型或查看提供商认证状态
  - 您想扫描可用模型/提供商并调试认证配置文件
title: "模型"
---

# `openclaw models`

模型发现、扫描与配置（默认模型、回退、认证配置文件）。

相关内容：

- Providers + models: [模型](/providers/models)
- Model selection concepts + `/models` slash command: [模型](/concepts/models)
- Provider auth setup: [入门指南](/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 显示解析后的默认/回退模型以及认证概览。
当提供商用量快照可用时，OAuth/API 密钥状态部分包括
提供商用量窗口和配额快照。
当前用量窗口提供商：Anthropic, GitHub Copilot, Gemini CLI, OpenAI
Codex, MiniMax, Xiaomi, 和 z.ai。用量认证来自提供商特定的钩子
（如果可用）；否则 OpenClaw 回退到匹配来自认证配置文件、环境变量或配置的 OAuth/API 密钥
凭证。
在 `--json` 输出中，`auth.providers` 是感知环境/配置/存储的提供商
概览，而 `auth.oauth` 仅是认证存储配置文件的健康状态。
添加 `--probe` 以针对每个配置的认证配置文件运行实时认证探测。
探测是真实请求（可能会消耗令牌并触发速率限制）。
使用 `--agent <id>` 检查配置代理的模型/认证状态。当省略时，
如果设置了 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`，命令将使用它们，否则使用
配置的默认代理。
探测行可能来自认证配置文件、环境凭证或 `models.json`。

注意事项：

- `models set <model-or-alias>` 接受 `provider/model` 或别名。
- `models list` 是只读的：它读取配置、认证配置文件、现有目录
  状态以及提供商拥有的目录行，但不会重写
  `models.json`。
- `models list --all --provider <id>` 即使你还没有对该提供商完成认证，也可以
  包括来自插件清单或内置提供商目录元数据的提供商拥有的静态目录
  行。这些行在配置匹配的认证之前仍会显示为不可用。
- `models list` 会区分原生模型元数据和运行时上限。在表格
  输出中，当有效运行时上限不同于原生上下文窗口时，`Ctx` 会显示 `contextTokens/contextWindow`；
  JSON 行在提供商暴露该上限时会包含 `contextTokens`。
- `models list --provider <id>` 按提供商 id 过滤，例如 `moonshot` 或
  `openai-codex`。它不接受交互式提供商选择器中的显示标签，例如
  `Moonshot AI`。
- 模型引用通过按**第一个** `/` 拆分解析。如果模型 ID 中包含 `/`（OpenRouter 风格），请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果你省略提供商，OpenClaw 会先将输入解析为别名，然后
  解析为该确切模型 id 的唯一已配置提供商匹配，最后才
  回退到已配置的默认提供商，并给出弃用警告。
  如果该提供商不再暴露已配置的默认模型，OpenClaw
  会回退到第一个已配置的提供商/模型，而不是暴露一个已失效的已移除提供商默认值。
- `models status` 在认证输出中可能显示 `marker(<value>)`，用于非秘密占位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），而不是将它们掩码为秘密。

### Models scan

`models scan` 读取 OpenRouter 的公共 `:free` 目录，并按回退用途对候选项排序。目录本身是公开的，因此仅元数据扫描不需要 OpenRouter 密钥。

默认情况下，OpenClaw 会尝试通过实时模型调用探测工具和图像支持。
如果未配置 OpenRouter 密钥，该命令会退回到仅元数据输出，并说明 `:free` 模型仍然需要 `OPENROUTER_API_KEY` 才能进行探测和推理。

选项：

- `--no-probe`（仅元数据；不进行配置/密钥查找）
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>`（目录请求和每次探测的超时）
- `--concurrency <n>`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

`--set-default` 和 `--set-image` 需要实时探测；仅元数据扫描结果仅供参考，不会应用到配置中。

### Models status

选项：

- `--json`
- `--plain`
- `--check`（退出码 1=过期/缺失，2=即将过期）
- `--probe`（对配置的认证配置文件进行实时探测）
- `--probe-provider <name>`（探测指定提供商）
- `--probe-profile <id>`（重复或逗号分隔的配置文件 ID）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`（配置代理 ID；覆盖 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`）

`--json` 会保持 stdout 只输出 JSON 负载。认证配置文件、提供商
和启动诊断会被路由到 stderr，因此脚本可以将 stdout 直接管道传给
诸如 `jq` 的工具。

探测状态桶：

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

预期出现的探测详情/原因代码情况：

- `excluded_by_auth_order`: 存在存储的配置文件，但显式
  `auth.order.<provider>` 省略了它，因此探测报告排除情况而不是
  尝试它。
- `missing_credential`, `invalid_expires`, `expired`, `unresolved_ref`:
  配置文件存在但不符合资格/无法解析。
- `no_model`: 提供商认证存在，但 OpenClaw 无法为该提供商解析可探测的
  模型候选。

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

`models auth add` 是交互式认证助手。它可以启动提供商认证
流程（OAuth/API 密钥）或指导你进行手动令牌粘贴，具体取决于你选择的
提供商。

`models auth login` 运行提供商插件的认证流程（OAuth/API 密钥）。使用
`openclaw plugins list` 查看安装了哪些提供商。

示例：

```bash
openclaw models auth login --provider openai-codex --set-default
```

注意事项：

- `setup-token` 和 `paste-token` 仍然是适用于暴露令牌认证方法的
  提供商的通用令牌命令。
- `setup-token` 需要交互式 TTY，并运行提供商的令牌认证
  方法（当该提供商暴露了 `setup-token` 方法时，默认使用它）。
- `paste-token` 接受在别处生成或由自动化提供的令牌字符串。
- `paste-token` 需要 `--provider`，会提示输入令牌值，并将其写入默认配置文件 id `<provider>:manual`，除非你传入
  `--profile-id`。
- `paste-token --expires-in <duration>` 会根据相对时长存储绝对令牌过期时间，例如 `365d` 或 `12h`。
- Anthropic 注意：Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 用法再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 会将 Claude CLI 复用和 `claude -p` 用法视为在此集成中获准。
- Anthropic `setup-token` / `paste-token` 仍然作为受支持的 OpenClaw 令牌路径可用，但在可用时，OpenClaw 现在更偏好 Claude CLI 复用和 `claude -p`。

## 相关内容

- [CLI 参考](/cli)
- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
