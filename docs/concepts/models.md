---
summary: "模型 CLI：列表、设置、别名、回退、扫描、状态"
read_when:
  - 添加或修改模型 CLI（models list/set/scan/aliases/fallbacks）
  - 更改模型回退行为或选择用户体验
  - 更新模型扫描探针（工具/图像）
title: "模型 CLI"
---

有关认证配置文件轮换、冷却时间以及它如何与回退交互，请参见 [/concepts/model-failover](/concepts/model-failover)。
快速提供商概览 + 示例：[/concepts/model-providers](/concepts/model-providers)。
模型引用会选择一个提供商和模型。它们通常不会选择底层代理运行时。例如，`openai/gpt-5.5` 可以通过常规 OpenAI 提供商路径运行，也可以通过 Codex 应用服务器运行时运行，这取决于 `agents.defaults.embeddedHarness.runtime`。请参见
[/concepts/agent-runtimes](/concepts/agent-runtimes)。

## 模型选择如何工作

OpenClaw 按以下顺序选择模型：

1. **主用**模型（`agents.defaults.model.primary` 或 `agents.defaults.model`）。
2. `agents.defaults.model.fallbacks` 中的**回退**模型（按顺序）。
3. **提供商认证故障切换**会在同一提供商内部发生，之后才会切换到下一个模型。

相关说明：

- `agents.defaults.models` 是 OpenClaw 可使用的模型白名单/目录（加上别名）。
- `agents.defaults.imageModel` **仅当**主用模型无法接受图像时使用。
- `agents.defaults.pdfModel` 由 `pdf` 工具使用。如果省略，该工具将回退到 `agents.defaults.imageModel`，然后是解析后的会话/默认模型。
- `agents.defaults.imageGenerationModel` 由共享图像生成能力使用。如果省略，`image_generate` 仍可推断基于认证的提供商默认值。它首先尝试当前默认提供商，然后按提供商 ID 顺序尝试其余注册的图像生成提供商。如果您设置了特定的提供商/模型，请同时配置该提供商的认证/API 密钥。
- `agents.defaults.musicGenerationModel` 由共享音乐生成能力使用。如果省略，`music_generate` 仍可推断基于认证的提供商默认值。它首先尝试当前默认提供商，然后按提供商 ID 顺序尝试其余注册的音乐生成提供商。如果您设置了特定的提供商/模型，请同时配置该提供商的认证/API 密钥。
- `agents.defaults.videoGenerationModel` 由共享视频生成能力使用。如果省略，`video_generate` 仍可推断基于认证的提供商默认值。它首先尝试当前默认提供商，然后按提供商 ID 顺序尝试其余注册的视频生成提供商。如果您设置了特定的提供商/模型，请同时配置该提供商的认证/API 密钥。
- 每个代理的默认值可以通过 `agents.list[].model` 加上绑定覆盖 `agents.defaults.model`（参见 [/concepts/multi-agent](/concepts/multi-agent)）。

## 快速模型策略

- 将主用模型设置为您可用的最强最新一代模型。
- 回退模型用于成本/延迟敏感任务及低风险聊天。
- 对于具备工具功能的代理或不受信任的输入，避免使用较旧/较弱模型等级。

## 入门引导（推荐）

如果不想手动编辑配置，请运行入门向导：

```bash
openclaw onboard
```

它可以为常见提供商设置模型 + 认证，包括 **OpenAI Code (Codex) subscription** (OAuth) 和 **Anthropic** (API 密钥或 Claude CLI)。

## 配置键（概览）

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` 和 `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` 和 `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` 和 `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models`（白名单 + 别名 + 提供商参数）
- `models.providers`（写入 `models.json` 的自定义提供商）

模型引用会被规范化为小写。提供商别名如 `z.ai/*` 规范为 `zai/*`。

提供商配置示例（包括 OpenCode）位于 [/providers/opencode](/providers/opencode)。

### 安全的白名单编辑

手动更新 `agents.defaults.models` 时请使用增量写入：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

`openclaw config set` 可防止模型/提供商映射被意外覆盖。对 `agents.defaults.models`、`models.providers` 或 `models.providers.<id>.models` 进行普通对象赋值时，如果这会移除现有条目，则会被拒绝。增量更改请使用 `--merge`；仅当提供的值应成为完整目标值时才使用 `--replace`。

交互式提供商设置以及 `openclaw configure --section model` 也会将按提供商范围的选择合并到现有白名单中，因此添加 Codex、Ollama 或其他提供商不会移除无关的模型条目。重新应用提供商认证时，Configure 会保留现有的 `agents.defaults.model.primary`。诸如 `openclaw models auth login --provider <id> --set-default` 和 `openclaw models set <model>` 之类的显式默认值设置命令仍会替换 `agents.defaults.model.primary`。

## "模型不被允许"（以及为何回复会停止）

如果设置了 `agents.defaults.models`，它将作为 `/model` 和会话覆盖的**白名单**。当用户选择的模型不在此白名单内时，OpenClaw 会返回：

```
模型 "provider/model" 不允许。使用 /model 列出可用模型。
```

此情景发生在正常回复生成之前，因此消息可能感觉像是"未响应"。解决方式是：

- 将该模型添加至 `agents.defaults.models`，
- 或清除白名单（移除 `agents.defaults.models`），
- 或从 `/model list` 选择一个模型。

示例白名单配置：

```json5
{
  agent: {
    model: { primary: "anthropic/claude-sonnet-4-6" },
    models: {
      "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
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
/model openai/gpt-5.4
/model status
```

说明：

- `/model`（以及 `/model list`）是一个紧凑的带编号选择器（模型系列 + 可用提供商）。
- 在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，带有提供商和模型下拉菜单以及提交步骤。
- `/models add` 已弃用，现在会返回弃用消息，而不是从聊天中注册模型。
- `/model <#>` 从该选择器中选择。
- `/model` 会立即持久化新的会话选择。
- 如果代理处于空闲状态，下一次运行会立刻使用新模型。
- 如果运行已经处于活动状态，OpenClaw 会将实时切换标记为待处理，并且只会在一个干净的重试点重新启动到新模型。
- 如果工具活动或回复输出已经开始，待处理切换可能会保持排队，直到稍后的重试机会或下一个用户回合。
- `/model status` 是详细视图（认证候选，以及在已配置时，提供商端点 `baseUrl` + `api` 模式）。
- 模型引用通过在**第一个** `/` 处分割来解析。输入 `/model <ref>` 时请使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 风格），则必须包含提供商前缀（例如：`/model openrouter/moonshotai/kimi-k2`）。
- 如果省略提供商，OpenClaw 会按以下顺序解析输入：
  1. 别名匹配
  2. 对该精确的未加前缀模型 ID 的唯一已配置提供商匹配
  3. 已弃用的回退到已配置的默认提供商
     如果该提供商不再暴露已配置的默认模型，OpenClaw 会改为回退到第一个已配置的提供商/模型，以避免显示一个已移除提供商的过期默认值。

完整命令行为及配置见：[斜杠命令](/tools/slash-commands)。

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
- `--provider <id>`：按提供商 ID 过滤，例如 `moonshot`；不接受交互式选择器中的显示标签
- `--plain`：每行一个模型
- `--json`：机器可读输出

`--all` 会在认证配置前包含捆绑的、由提供商拥有的静态目录行，因此仅用于发现的视图可以显示那些在添加匹配的提供商凭据之前不可用的模型。

### `models status`

显示解析后的主用模型、回退模型、图像模型，以及配置提供商的认证概览。它还显示认证存储中找到的配置文件的 OAuth 过期状态（默认在 24 小时内警告）。`--plain` 仅打印解析后的主用模型。  
OAuth 状态始终显示（并包含在 `--json` 输出中）。如果配置的提供商没有凭据，`models status` 会打印一个 **缺少认证** 部分。  
JSON 包含 `auth.oauth`（警告窗口 + 配置文件）和 `auth.providers`（每个提供商的有效认证，包括基于环境的凭据）。`auth.oauth` 仅是认证存储配置文件健康状态；仅环境的提供商不会出现在那里。  
使用 `--check` 进行自动化（缺少/过期时退出 `1`，即将过期时退出 `2`）。  
使用 `--probe` 进行实时认证检查；探针行可以来自认证配置文件、环境凭据或 `models.json`。  
如果显式 `auth.order.<provider>` 省略了存储的配置文件，探针报告 `excluded_by_auth_order` 而不是尝试它。如果存在认证但无法为该提供商解析可探针的模型，探针报告 `status: no_model`。

认证选择取决于提供商/账户。对于始终在线的网关主机，API 密钥通常是最可预测的；也支持 Claude CLI 重用和现有的 Anthropic OAuth/令牌配置文件。

示例 (Claude CLI)：

```bash
claude auth login
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

自定义提供商配置在 `models.providers` 中写入代理目录下的 `models.json`（默认路径为 `~/.openclaw/agents/<agentId>/agent/models.json`）。默认情况下此文件会被合并，除非 `models.mode` 设置为 `replace`。

匹配提供商 ID 的合并模式优先级：

- 代理目录中已有的非空 `baseUrl` 会优先保留。
- 代理目录中已有的非空 `apiKey` 仅在当前配置/认证配置上下文中该提供商未被 SecretRef 管理时优先保留。
- SecretRef 管理的提供商 `apiKey` 值会从源标记刷新（环境变量引用的为 `ENV_VAR_NAME`，文件/执行引用的为 `secretref-managed`），而不是持久化解析后的密钥。
- SecretRef 管理的提供商头信息值也会从源标记刷新（环境变量引用的为 `secretref-env:ENV_VAR_NAME`，文件/执行引用的为 `secretref-managed`）。
- 代理目录中 `apiKey`/`baseUrl` 为空或缺失时会回退使用配置中的 `models.providers`。
- 其他提供商字段会从配置和规范化目录数据中刷新。

Marker 持久化以源为准：OpenClaw 从活动源配置快照（预解析）写入标记，而不是从解析后的运行时秘密值写入。每当 OpenClaw 重新生成 `models.json` 时都会应用此规则，包括命令驱动的路径（如 `openclaw agent`）。

## 相关内容

- [Model Providers](/concepts/model-providers) — 提供商路由和认证
- [Agent Runtimes](/concepts/agent-runtimes) — PI、Codex 和其他代理循环运行时
- [Model Failover](/concepts/model-failover) — 回退链
- [Image Generation](/tools/image-generation) — 图像模型配置
- [Music Generation](/tools/music-generation) — 音乐模型配置
- [Video Generation](/tools/video-generation) — 视频模型配置
- [Configuration Reference](/gateway/config-agents#agent-defaults) — 模型配置键
