---
summary: "模型 CLI：列表、设置、别名、回退、扫描、状态"
read_when:
  - 添加或修改模型 CLI（models list/set/scan/aliases/fallbacks）
  - 更改模型回退行为或选择用户体验
  - 更新模型扫描探针（工具/图像）
title: "模型 CLI"
---

# 模型 CLI

有关认证配置文件轮换、冷却时间及其与回退交互的详情，请参见 [/concepts/model-failover](/concepts/model-failover)。
快速提供商概览及示例见：[/concepts/model-providers](/concepts/model-providers)。

## 模型选择如何工作

OpenClaw 按以下顺序选择模型：

1. **主用**模型（`agents.defaults.model.primary` 或 `agents.defaults.model`）。
2. `agents.defaults.model.fallbacks` 中的**回退**模型（按顺序）。
3. **提供商认证故障切换**会在同一提供商内部发生，之后才会切换到下一个模型。

相关说明：

- `agents.defaults.models` 是 OpenClaw 可用模型的白名单/目录（含别名）。
- `agents.defaults.imageModel` 仅在主用模型无法接受图像时使用。
- 每个代理的默认配置可通过 `agents.list[].model` 及绑定覆盖 `agents.defaults.model`（详见 [/concepts/multi-agent](/concepts/multi-agent)）。

## 快速模型策略

- 将主用模型设置为您可用的最强最新一代模型。
- 回退模型用于成本/延迟敏感任务及低风险聊天。
- 对于具备工具功能的代理或不受信任的输入，避免使用较旧/较弱模型等级。

## 设置向导（推荐）

如果不想手动编辑配置，可以运行入门向导：

```bash
openclaw onboard
```

此向导可为常见提供商设置模型及认证，包括 **OpenAI Code (Codex) 订阅**（OAuth）和 **Anthropic**（API 密钥 或 `claude setup-token`）。

## 配置键（概览）

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.models`（白名单 + 别名 + 提供商参数）
- `models.providers`（自定义提供商，写入 `models.json`）

模型引用会被规范化为小写。提供商别名如 `z.ai/*` 规范为 `zai/*`。

提供商配置示例（包含 OpenCode Zen）见[/gateway/configuration](/gateway/configuration#opencode-zen-multi-model-proxy)。

## “模型不被允许”以及回复停止的原因

如果设置了 `agents.defaults.models`，它将作为 `/model` 和会话覆盖的**白名单**。当用户选择的模型不在此白名单内时，OpenClaw 会返回：

```
模型 "provider/model" 不允许。使用 /model 列出可用模型。
```

此情景发生在正常回复生成之前，因此消息可能感觉像是“未响应”。解决方式是：

- 将该模型添加至 `agents.defaults.models`，
- 或清除白名单（移除 `agents.defaults.models`），
- 或从 `/model list` 选择一个模型。

示例白名单配置：

```json5
{
  agent: {
    model: { primary: "anthropic/claude-sonnet-4-5" },
    models: {
      "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
      "anthropic/claude-opus-4-6": { alias: "Opus" },
    },
  },
}
```

## 聊天中切换模型（`/model`）

无需重启即可为当前会话切换模型：

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model status
```

说明：

- `/model`（及 `/model list`）为简洁的编号选择器（模型系列 + 可用提供商）。
- 在 Discord 中，`/model` 和 `/models` 打开带有提供商和模型下拉菜单及提交步骤的交互式选择器。
- `/model <#>` 从选择器中选择对应编号的模型。
- `/model status` 显示详细视图（认证候选和配置时的提供商端点 `baseUrl` + `api` 模式）。
- 模型引用通过第一个 `/` 分割解析。输入时使用 `provider/model` 格式 `/model <ref>`。
- 若模型 ID 本身包含 `/`（OpenRouter 风格），必须包含提供商前缀（示例：`/model openrouter/moonshotai/kimi-k2`）。
- 如果省略提供商，OpenClaw 会将输入视为默认提供商的别名或模型（仅当模型 ID 中无 `/` 时有效）。

完整命令行为及配置见：[Slash commands](/tools/slash-commands)。

## CLI 命令

```bash
openclaw models list
openclaw models status
openclaw models set <provider/model>
openclaw models set-image <provider/model>

openclaw models aliases list
openclaw models aliases add <alias> <provider/model>
openclaw models aliases remove <alias>

openclaw models fallbacks list
openclaw models fallbacks add <provider/model>
openclaw models fallbacks remove <provider/model>
openclaw models fallbacks clear

openclaw models image-fallbacks list
openclaw models image-fallbacks add <provider/model>
openclaw models image-fallbacks remove <provider/model>
openclaw models image-fallbacks clear
```

`openclaw models`（无子命令）是 `models status` 的快捷方式。

### `models list`

默认显示配置的模型。有用参数：

- `--all`：完整目录
- `--local`：仅本地提供商
- `--provider <name>`：按提供商过滤
- `--plain`：每行一个模型
- `--json`：机器可读输出

### `models status`

显示解析后的主用模型、回退模型、图像模型及已配置提供商的认证概览。还会显示认证存储中发现的配置文件 OAuth 过期状态（默认 24 小时内警告）。`--plain` 仅打印解析后的主用模型。
OAuth 状态始终显示（且包含在 `--json` 输出中）。若某提供商配置缺失凭证，`models status` 会打印**缺失认证**部分。
JSON 包括 `auth.oauth`（警告窗口 + 配置文件）和 `auth.providers`（每个提供商的有效认证）。
使用 `--check` 方便自动化（缺失/过期返回代码 `1`，即将过期返回代码 `2`）。

认证选择依赖于提供商及账户。对于常开网关主机，API 密钥通常最稳定；也支持订阅令牌流。

举例（Anthropic setup-token）：

```bash
claude setup-token
openclaw models status
```

## 扫描（OpenRouter 免费模型）

`openclaw models scan` 检查 OpenRouter 的**免费模型目录**，并可选探测模型的工具及图像支持。

关键参数：

- `--no-probe`：跳过实时探针（仅元数据）
- `--min-params <b>`：最低参数规模（十亿计）
- `--max-age-days <天>`：过滤较旧模型
- `--provider <name>`：提供商前缀过滤
- `--max-candidates <n>`：回退列表大小
- `--set-default`：将 `agents.defaults.model.primary` 设为首个选中模型
- `--set-image`：将 `agents.defaults.imageModel.primary` 设为首个图像模型

探针需要 OpenRouter API 密钥（从认证配置文件或 `OPENROUTER_API_KEY` 环境变量获取）。无密钥时使用 `--no-probe` 仅列出候选模型。

扫描结果排序依据：

1. 图像支持
2. 工具延迟
3. 上下文大小
4. 参数数量

输入

- OpenRouter `/models` 列表（过滤 `:free`）
- 需要 OpenRouter API 密钥（来自认证配置文件或 `OPENROUTER_API_KEY`，详见 [/environment](/help/environment)）
- 可选过滤器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 探针控制：`--timeout`、`--concurrency`

在 TTY 中运行时，您可以交互式选择回退模型。在非交互模式下，传递 `--yes` 以接受默认。

## 模型注册表（`models.json`）

自定义提供商配置在 `models.providers` 中写入代理目录下的 `models.json`（默认路径为 `~/.openclaw/agents/<agentId>/models.json`）。默认情况下此文件会被合并，除非 `models.mode` 设置为 `replace`。

匹配提供商 ID 的合并模式优先级：

- 代理目录中已有的非空 `apiKey`/`baseUrl` 优先保留。
- 代理目录中为空或缺失的 `apiKey`/`baseUrl` 会使用配置中 `models.providers` 的值。
- 其他提供商字段从配置和规范化目录数据刷新。
