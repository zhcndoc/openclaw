---
summary: "模型 CLI：列出、设置、别名、回退、扫描、状态"
read_when:
  - 添加或修改 models CLI（models list/set/scan/aliases/fallbacks）
  - 更改模型回退行为或选择交互体验
  - 更新模型扫描探测（工具/图像）
title: "模型 CLI"
sidebarTitle: "模型 CLI"
---

<CardGroup cols={2}>
  <Card title="模型故障转移" href="/concepts/model-failover">
    认证配置轮换、冷却时间，以及这与回退机制如何交互。
  </Card>
  <Card title="模型提供商" href="/concepts/model-providers">
    供应商概览和快速示例。
  </Card>
  <Card title="Agent runtimes" href="/concepts/agent-runtimes">
    OpenClaw、Codex 和其他 agent 循环运行时。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults">
    模型配置键。
  </Card>
</CardGroup>

模型引用会选择提供商和模型。它们通常不会选择底层 agent 运行时。OpenAI agent 引用是主要例外：在官方 OpenAI 提供商上，`openai/gpt-5.5` 默认通过 Codex app-server 运行时运行。订阅版 Copilot 引用（`github-copilot/*`）还可以选择接入外部 GitHub Copilot agent runtime 插件——这条路径保持显式（不会 `auto` 回退）。显式的运行时覆盖应放在提供商/模型策略上，而不是整个 agent 或会话上。在 Codex 运行时模式下，`openai/gpt-*` 引用并不意味着按 API key 计费；认证可以来自 Codex 账户或 `openai` OAuth 配置文件。参见 [Agent runtimes](/concepts/agent-runtimes) 和 [GitHub Copilot agent runtime](/plugins/copilot)。

## 模型选择如何工作

OpenClaw 按以下顺序选择模型：

<Steps>
  <Step title="主模型">
    `agents.defaults.model.primary`（或 `agents.defaults.model`）。
  </Step>
  <Step title="回退模型">
    `agents.defaults.model.fallbacks`（按顺序）。
  </Step>
  <Step title="提供商认证故障转移">
    认证故障转移会在切换到下一个模型之前在提供商内部发生。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="相关模型入口">
    - `agents.defaults.models` 是 OpenClaw 可使用模型的白名单/目录（加上别名）。使用 `provider/*` 条目可以限制可见提供商，同时保持提供商发现的动态性。
    - `agents.defaults.imageModel` **仅在**主模型不能接受图像时使用。
    - `agents.defaults.pdfModel` 由 `pdf` 工具使用。若省略，该工具会回退到 `agents.defaults.imageModel`，然后回退到已解析的会话/默认模型。
    - `agents.defaults.imageGenerationModel` 由共享的图像生成能力使用。若省略，`image_generate` 仍可推断一个带认证的提供商默认值。它会先尝试当前默认提供商，然后按 provider-id 顺序尝试其余已注册的图像生成提供商。如果你设置了特定提供商/模型，也要配置该提供商的认证/API key。
    - `agents.defaults.musicGenerationModel` 由共享的音乐生成能力使用。若省略，`music_generate` 仍可推断一个带认证的提供商默认值。它会先尝试当前默认提供商，然后按 provider-id 顺序尝试其余已注册的音乐生成提供商。如果你设置了特定提供商/模型，也要配置该提供商的认证/API key。
    - `agents.defaults.videoGenerationModel` 由共享的视频生成能力使用。若省略，`video_generate` 仍可推断一个带认证的提供商默认值。它会先尝试当前默认提供商，然后按 provider-id 顺序尝试其余已注册的视频生成提供商。如果你设置了特定提供商/模型，也要配置该提供商的认证/API key。
    - 每个 agent 的默认值可以通过 `agents.list[].model` 结合绑定来覆盖 `agents.defaults.model`（参见 [Multi-agent routing](/concepts/multi-agent)）。

  </Accordion>
</AccordionGroup>

## 选择来源与回退行为

同一个 `provider/model`，根据来源不同，含义也可能不同：

- 配置的默认值（`agents.defaults.model.primary` 和特定 agent 的主模型）是正常起点，并使用 `agents.defaults.model.fallbacks`。
- 自动回退选择是临时恢复状态。它们以 `modelOverrideSource: "auto"` 存储，因此后续轮次可以继续使用回退链，而无需每次都探测一个已知失效的主模型；OpenClaw 会定期再次探测原始主模型，在恢复后清除自动选择，并且每次状态变化只宣布一次回退/恢复转换。
- 用户会话选择是精确的。`/model`、模型选择器、`session_status(model=...)` 和 `sessions.patch` 会存储 `modelOverrideSource: "user"`；如果所选的提供商/模型不可达，OpenClaw 会显式失败，而不是继续落到其他已配置模型。
- 更改 `agents.defaults.model.primary` 不会重写现有会话选择。如果状态显示 `This session is pinned to X; config primary Y will apply to new/unpinned sessions.`，请使用 `/model Y` 切换当前会话，或使用 `/reset` 清除过期的会话状态。
- Cron `--model` / payload `model` 是每个作业的主模型。除非作业提供显式的 payload `fallbacks`，否则它仍会使用已配置的回退（对严格的 cron 运行使用 `fallbacks: []`）。
- CLI 默认模型和允许列表选择器会遵守 `models.mode: "replace"`，通过列出显式的 `models.providers.*.models`，而不是加载完整的内置目录。
- Control UI 模型选择器会向 Gateway 请求其配置的模型视图：如果存在 `agents.defaults.models`，则使用它，包括 provider-wide 的 `provider/*` 条目；否则使用显式的 `models.providers.*.models` 加上具有可用认证的提供商。完整的内置目录仅保留给显式浏览视图，例如 `models.list` 搭配 `view: "all"` 或 `openclaw models list --all`。

## 快速模型策略

- 将主模型设置为你可用的、最强的最新一代模型。
- 对于成本/延迟敏感的任务和风险较低的聊天，使用回退模型。
- 对于启用工具的 agent 或不可信输入，避免较旧/较弱的模型层级。

## 入门（推荐）

如果你不想手动编辑配置，请运行 onboarding：

```bash
openclaw onboard
```

它可以为常见提供商设置模型和认证，包括 **OpenAI Code（Codex）订阅**（OAuth）和 **Anthropic**（API key 或 Claude CLI）。

## 配置键（概览）

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` 和 `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` 和 `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` 和 `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models`（白名单 + 别名 + 提供商参数 + `provider/*` 动态提供商条目）
- `models.providers`（写入 `models.json` 的自定义提供商）

<Note>
模型引用会归一化为小写。提供商 ID 其他方面保持精确；请使用插件公布的提供商 ID。

包括 OpenCode 在内的提供商配置示例位于 [OpenCode](/providers/opencode)。
</Note>

### 安全的白名单编辑

手动更新 `agents.defaults.models` 时使用增量写入：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

<AccordionGroup>
  <Accordion title="防覆盖保护规则">
    `openclaw config set` 会保护模型/提供商映射，避免意外覆盖。对 `agents.defaults.models`、`models.providers` 或 `models.providers.<id>.models` 的普通对象赋值，如果会删除现有条目，则会被拒绝。增量更改请使用 `--merge`；仅当你提供的值应该成为完整目标值时才使用 `--replace`。

    交互式提供商设置和 `openclaw configure --section model` 也会将提供商范围内的选择合并到现有白名单中，因此添加 Codex、Ollama 或其他提供商不会删除无关的模型条目。重新应用提供商认证时，Configure 会保留现有的 `agents.defaults.model.primary`。像 `openclaw models auth login --provider <id> --set-default` 和 `openclaw models set <model>` 这样的显式默认设置命令仍然会替换 `agents.defaults.model.primary`。

  </Accordion>
</AccordionGroup>

## “Model is not allowed”（以及为什么回复会停止）

如果设置了 `agents.defaults.models`，它就会成为 `/model` 和会话覆盖的**白名单**。当用户选择的模型不在该白名单中时，OpenClaw 会返回：

```
Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
```

<Warning>
这会在生成正常回复**之前**发生，所以消息可能会让人感觉“没有响应”。解决方法是以下之一：

- 将模型添加到 `agents.defaults.models`，或
- 清除白名单（移除 `agents.defaults.models`），或
- 从 `/model list` 中选择一个模型。

</Warning>

当被拒绝的命令包含运行时覆盖，例如 `/model openai/gpt-5.5 --runtime codex` 时，先修复白名单，然后重试同一个 `/model ... --runtime ...` 命令。对于原生 Codex 执行，所选模型仍然是 `openai/gpt-5.5`；`codex` 运行时会选择执行器并单独使用 Codex 认证。

对于本地/GGUF 模型，请在白名单中存储完整的带提供商前缀引用，
例如 `ollama/gemma4:26b`、`lmstudio/Gemma4-26b-a4-it-gguf`，或
`openclaw models list --provider <provider>` 显示的精确提供商/模型。
当白名单启用时，裸本地文件名或显示名称是不够的。

如果你想限制提供商而不必手动列出每个模型，可将
`provider/*` 条目添加到 `agents.defaults.models`：

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/*": {},
        "vllm/*": {},
      },
    },
  },
}
```

使用该策略后，`/model`、`/models` 和模型选择器只会显示这些提供商已发现的目录。所选提供商的新模型可以在不编辑允许列表的情况下出现。当你需要来自另一个提供商的某个特定模型时，可以将精确的 `provider/model` 条目与 `provider/*` 条目混合使用。

允许列表配置示例：

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-sonnet-4-6" },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
}
```

## 在聊天中切换模型（`/model`）

你可以在不重启的情况下切换当前会话的模型：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

<AccordionGroup>
  <Accordion title="选择器行为">
    - `/model`（以及 `/model list`）是一个紧凑的编号选择器（模型家族 + 可用提供商）。
    - 在 Discord 中，`/model` 和 `/models` 会打开一个交互式选择器，包含提供商和模型下拉框以及一个提交步骤。
    - 在 Telegram 中，`/models` 选择器的选择仅作用于当前会话；它们不会更改 `openclaw.json` 中 agent 的持久默认值。
    - `/models add` 已弃用，现在会返回弃用提示，而不是从聊天中注册模型。
    - `/model <#>` 会从该选择器中进行选择。

  </Accordion>
  <Accordion title="持久化与在线切换">
    - `/model` 会立即持久化新的会话选择。
    - 如果 agent 处于空闲状态，下一次运行会立刻使用新模型。
    - 如果某次运行已经在进行中，OpenClaw 会将在线切换标记为待处理，并只会在一个干净的重试点重新启动到新模型。
    - 如果工具活动或回复输出已经开始，待处理切换可能会继续排队，直到后续某次重试机会或下一轮用户交互。
    - 用户选择的 `/model` 引用对于该会话是严格的：如果所选的提供商/模型不可达，回复会显式失败，而不是静默地从 `agents.defaults.model.fallbacks` 回答。这与已配置的默认值和 cron 任务主模型不同，它们仍然可以使用回退链。
    - `/model status` 是详细视图（认证候选项，以及在已配置时的提供商端点 `baseUrl` + `api` 模式）。

  </Accordion>
  <Accordion title="引用解析">
    - 模型引用通过在**第一个** `/` 处分割来解析。输入 `/model <ref>` 时请使用 `provider/model`。
    - 如果模型 ID 本身包含 `/`（OpenRouter 风格），你必须包含提供商前缀（例如：`/model openrouter/moonshotai/kimi-k2`）。
    - 如果你省略提供商，OpenClaw 会按以下顺序解析输入：
      1. 别名匹配
      2. 对该未加前缀的精确模型 id 的唯一已配置提供商匹配
      3. 回退到已配置的默认提供商——如果该提供商不再暴露已配置的默认模型，OpenClaw 会改为回退到第一个已配置的提供商/模型，以避免暴露一个已删除提供商的过期默认值。
  </Accordion>
</AccordionGroup>

完整的命令行为/配置： [斜杠命令](/tools/slash-commands)。

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

默认显示已配置/可认证使用的模型。实用标志：

<ParamField path="--all" type="boolean">
  完整目录。在配置认证之前，包含捆绑的、由提供方拥有的静态目录行，因此仅用于发现的视图可以显示那些在添加匹配的提供方凭据之前不可用的模型。
</ParamField>
<ParamField path="--local" type="boolean">
  仅本地提供方。
</ParamField>
<ParamField path="--provider <id>" type="string">
  按提供方 ID 过滤，例如 `moonshot`。不接受交互式选择器中的显示标签。
</ParamField>
<ParamField path="--plain" type="boolean">
  每行一个模型。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读输出。
</ParamField>

### `models status`

显示已解析的主模型、回退模型、图像模型，以及已配置提供商的认证概览。它还会展示在认证存储中找到的配置文件的 OAuth 过期状态（默认在 24 小时内发出警告）。`--plain` 仅打印已解析的主模型。

<AccordionGroup>
  <Accordion title="认证与探测行为">
    - 始终显示 OAuth 状态（并包含在 `--json` 输出中）。如果某个已配置提供方没有凭据，`models status` 会打印 **缺少认证** 部分。
    - JSON 包含 `auth.oauth`（警告窗口 + 配置文件）和 `auth.providers`（每个提供方的有效认证，包括基于环境变量的凭据）。`auth.oauth` 仅表示认证存储中的配置文件健康状况；仅环境变量提供方不会出现在其中。
    - 使用 `--check` 进行自动化（当缺失/过期时退出码为 `1`，即将过期时退出码为 `2`）。
    - 使用 `--probe` 进行实时认证检查；探测行可以来自认证配置文件、环境凭据或 `models.json`。
    - 如果显式的 `auth.order.<provider>` 省略了已存储的配置文件，探测会报告 `excluded_by_auth_order`，而不是尝试它。如果认证存在但无法为该提供方解析出可探测的模型，探测会报告 `status: no_model`。

  </Accordion>
</AccordionGroup>

<Note>
认证选择取决于提供商/账户。对于始终在线的网关主机，API 密钥通常是最可预测的；也支持复用 Claude CLI 以及现有的 Anthropic OAuth/令牌配置文件。
</Note>

示例（Claude CLI）：

```bash
claude auth login
openclaw models status
```

## 扫描（OpenRouter 免费模型）

`openclaw models scan` 会检查 OpenRouter 的 **免费模型目录**，并可选地探测模型的工具和图像支持。

<ParamField path="--no-probe" type="boolean">
  跳过实时探测（仅元数据）。
</ParamField>
<ParamField path="--min-params <b>" type="number">
  最小参数规模（十亿）。
</ParamField>
<ParamField path="--max-age-days <days>" type="number">
  跳过较旧的模型。
</ParamField>
<ParamField path="--provider <name>" type="string">
  提供方前缀过滤器。
</ParamField>
<ParamField path="--max-candidates <n>" type="number">
  回退列表大小。
</ParamField>
<ParamField path="--set-default" type="boolean">
  将 `agents.defaults.model.primary` 设置为第一个选择。
</ParamField>
<ParamField path="--set-image" type="boolean">
  将 `agents.defaults.imageModel.primary` 设置为第一个图像选择。
</ParamField>

<Note>
OpenRouter 的 `/models` 目录是公开的，因此仅元数据扫描无需密钥即可列出免费候选项。探测和推理仍然需要 OpenRouter API 密钥（来自认证配置文件或 `OPENROUTER_API_KEY`）。如果没有可用密钥，`openclaw models scan` 会回退到仅元数据输出，并保持配置不变。使用 `--no-probe` 可显式请求仅元数据模式。
</Note>

扫描结果按以下顺序排序：

1. 图像支持
2. 工具延迟
3. 上下文大小
4. 参数数量

输入：

- OpenRouter `/models` 列表（过滤 `:free`）
- 实时探测需要来自认证配置文件或 `OPENROUTER_API_KEY` 的 OpenRouter API 密钥（参见 [环境变量](/help/environment)）
- 可选过滤条件：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 请求/探测控制：`--timeout`、`--concurrency`

当实时探测在 TTY 中运行时，你可以交互式选择回退项。在非交互模式下，传入 `--yes` 以接受默认值。仅元数据结果仅供参考；`--set-default` 和 `--set-image` 需要实时探测，这样 OpenClaw 才不会配置一个不可用、无需密钥的 OpenRouter 模型。

## 模型注册表（`models.json`）

Custom providers in `models.providers` are written into `models.json` under the agent directory (default `~/.openclaw/agents/<agentId>/agent/models.json`). Provider-plugin catalogs are stored as generated plugin-owned catalog shards under the agent's plugin state and loaded automatically. This file is merged by default unless `models.mode` is set to `replace`.

<AccordionGroup>
  <Accordion title="合并模式优先级">
    匹配提供方 ID 的合并模式优先级：

    - 代理 `models.json` 中已存在且非空的 `baseUrl` 优先。
    - 仅当当前配置/认证配置文件上下文中该提供方不受 SecretRef 管理时，代理 `models.json` 中非空的 `apiKey` 才优先。
    - 受 SecretRef 管理的提供方 `apiKey` 值会从源标记刷新（环境引用为 `ENV_VAR_NAME`，文件/执行引用为 `secretref-managed`），而不是持久化解析后的密钥。
    - 受 SecretRef 管理的提供方 header 值会从源标记刷新（环境引用为 `secretref-env:ENV_VAR_NAME`，文件/执行引用为 `secretref-managed`）。
    - 代理中为空或缺失的 `apiKey`/`baseUrl` 会回退到配置中的 `models.providers`。
    - 其他提供方字段会从配置和规范化后的目录数据中刷新。

  </Accordion>
</AccordionGroup>

<Note>
标记持久化以源为权威：OpenClaw 会根据当前源配置快照（解析前）写入标记，而不是根据运行时解析后的密钥值。每当 OpenClaw 重新生成 `models.json` 时都适用这一点，包括像 `openclaw agent` 这样的命令驱动路径。
</Note>

## 相关内容

- [Agent runtimes](/concepts/agent-runtimes) — OpenClaw, Codex, and other agent loop runtimes
- [Configuration reference](/gateway/config-agents#agent-defaults) — model config keys
- [Image generation](/tools/image-generation) — image model configuration
- [Model failover](/concepts/model-failover) — fallback chains
- [Model providers](/concepts/model-providers) — provider routing and auth
- [Music generation](/tools/music-generation) — music model configuration
- [Video generation](/tools/video-generation) — video model configuration
