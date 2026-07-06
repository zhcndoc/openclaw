---
summary: "OpenClaw 如何解析 provider/model 引用、config 键，以及 `/model` 聊天命令"
read_when:
  - 更改模型回退行为或选择 UX
  - 调试“model is not allowed”或过时的默认 provider 回退
  - 处理 models.json 合并/密钥行为
title: "Models CLI"
sidebarTitle: "Models CLI"
---

<CardGroup cols={2}>
  <Card title="模型故障转移" href="/concepts/model-failover">
    认证配置轮换、冷却时间，以及这与回退机制如何交互。
  </Card>
  <Card title="模型提供商" href="/concepts/model-providers">
    供应商概览和快速示例。
  </Card>
  <Card title="Models CLI reference" href="/cli/models">
    完整的 `openclaw models` 命令和标志参考。
  </Card>
  <Card title="Configuration reference" href="/gateway/config-agents#agent-defaults">
    模型配置键、默认值和示例。
  </Card>
</CardGroup>

模型引用（`provider/model`）会选择一个提供商和模型。它通常不会选择底层的 agent 运行时。OpenAI 是主要例外：在官方 OpenAI 提供商上，`openai/gpt-5.5` 默认通过 Codex app-server 运行时运行。订阅版 Copilot 引用（`github-copilot/*`）可以选择接入外部 GitHub Copilot agent 运行时插件，但该路径始终是显式指定的（绝不会被 `auto` 选择）。运行时覆盖应当放在 provider/model 策略上，而不是整个 agent 或会话上。在 Codex 运行时模式下，`openai/gpt-*` 并不意味着按 API 密钥计费；认证可以来自 Codex 账户或 `openai` OAuth 配置文件。参见 [Agent runtimes](/concepts/agent-runtimes) 和 [GitHub Copilot agent runtime](/plugins/copilot)。

## 选择顺序

<Steps>
  <Step title="主模型">
    `agents.defaults.model.primary`（或将 `agents.defaults.model` 作为普通字符串）。
  </Step>
  <Step title="备用模型">
    `agents.defaults.model.fallbacks`，按顺序依次尝试。
  </Step>
  <Step title="认证故障转移">
    在 OpenClaw 转到下一个备用模型之前，认证配置文件轮换会先在提供方内部发生。
  </Step>
</Steps>

相关的模型配置入口：

- `agents.defaults.models` 是 OpenClaw 可使用的模型白名单/目录，以及别名。使用 `provider/*` 条目可允许某个提供方中发现的所有模型，而无需逐个列出。
- `agents.defaults.utilityModel` 是一个可选的低成本模型，用于较短的内部任务，例如生成仪表盘会话标题以及受支持的频道线程/主题标题。每个代理的 `agents.list[].utilityModel` 会覆盖它。未设置时，这些任务会使用该代理的主模型。实用任务是独立的模型调用，可能会向选定的模型提供方发送有范围限制的任务内容。
- `agents.defaults.imageModel` 仅在主模型无法接受图像时使用。
- `agents.defaults.pdfModel` 由 `pdf` 工具使用。若未设置，该工具会回退到 `imageModel`，然后回退到已解析的会话/默认模型。
- `agents.defaults.imageGenerationModel`、`musicGenerationModel` 和 `videoGenerationModel` 为共享的媒体生成工具提供支持。若未设置，每个工具会推断一个带认证支持的提供方默认值：先使用当前默认提供方，然后按 provider-id 顺序使用该能力下其余已注册的提供方。设置 `agents.defaults.mediaGenerationAutoProviderFallback: false` 可在保留显式备用项的同时禁用这种跨提供方推断。
- 每个代理的 `agents.list[].model`（加上绑定）会覆盖 `agents.defaults.model`——参见 [多代理路由](/concepts/multi-agent)。

完整键参考、默认值和 JSON5 示例：[配置参考](/gateway/config-agents#agent-defaults)。

## 选择来源与回退严格性

同一个 `provider/model` 会因其来源不同而表现不同：

| 来源                                                                    | 行为                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 配置的默认值（`agents.defaults.model.primary`，每个 agent 的 primary） | 正常起点；使用 `agents.defaults.model.fallbacks`。                                                                                                                                                                                                          |
| 自动回退                                                               | 临时恢复状态，存储为 `modelOverrideSource: "auto"`。OpenClaw 会定期重新探测原始 primary，在恢复时清除自动选择，并且在每次状态变化时播报一次回退/恢复切换。                              |
| 用户会话选择                                                          | 精确且严格。`/model`、模型选择器、`session_status(model=...)` 和 `sessions.patch` 会存储 `modelOverrideSource: "user"`。如果该 provider/model 变得不可达，运行会明显失败，而不会继续落到另一个已配置的模型。 |
| Cron `--model` / payload `model`                                        | 每个任务的 primary。仍然使用已配置的回退，除非任务提供自己的 payload `fallbacks`（`fallbacks: []` 会强制严格运行）。                                                                                                                    |

其他选择规则：

- 更改 `agents.defaults.model.primary` 不会重写现有会话的固定设置。如果状态报告 `This session is pinned to X; config primary Y will apply to new/unpinned sessions.`，请运行 `/model default` 来清除固定设置。
- CLI 默认模型和允许列表选择器会尊重 `models.mode: "replace"`，此时只列出 `models.providers.*.models`，而不是完整的内建目录。
- Control UI 模型选择器会向 Gateway 请求其配置的模型视图：如果设置了 `agents.defaults.models`（包括 `provider/*` 通配符条目），则使用该视图；否则使用 `models.providers.*.models` 以及具有可用认证的 providers。完整的内建目录仅保留给显式浏览视图（`models.list` 且 `view: "all"`，或 `openclaw models list --all`）。

完整机制：[模型故障切换](/concepts/model-failover)。

## 快速模型策略

- 将主模型设置为你可用的、最强的最新一代模型。
- 对于成本/延迟敏感的任务和风险较低的聊天，使用回退模型。
- 对于启用工具的 agent 或不可信输入，避免较旧/较弱的模型层级。

## 入门

```bash
openclaw onboard
```

为常见提供商设置模型和认证，无需手动编辑配置，包括 OpenAI Codex 订阅 OAuth 和 Anthropic（API 密钥或 Claude CLI 复用）。

## “Model is not allowed”（以及为什么回复会停止）

如果设置了 `agents.defaults.models`，它就会成为 `/model` 和会话覆盖的允许列表。选择该允许列表之外的模型时，在生成任何正常回复之前会返回：

```text
Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
```

通过将模型添加到 `agents.defaults.models`、完全清空允许列表（删除该键），或从 `/model list` 中选择一个模型来修复它。如果被拒绝的命令包含运行时覆盖，例如 `/model openai/gpt-5.5 --runtime codex`，请先修复允许列表，然后重试相同的 `/model ... --runtime ...` 命令。

对于本地/GGUF 模型，允许列表需要完整的带提供方前缀的引用，例如 `ollama/gemma4:26b` 或 `lmstudio/Gemma4-26b-a4-it-gguf` —— 请使用 `openclaw models list --provider <provider>` 查看精确字符串。一旦允许列表启用，裸文件名或显示名称就不够了。

要在不逐个列出每个模型的情况下限制提供方，请使用 `provider/*` 通配符条目：

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

然后 `/model`、`/models` 和模型选择器只会显示这些提供方的已发现目录，而且无需编辑允许列表就能出现新模型。可以将精确的 `provider/model` 条目与 `provider/*` 条目混合使用，以从另一个提供方引入某一个特定模型。

带别名的允许列表示例：

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

<Accordion title="通过 CLI 安全编辑允许列表">
添加性更改请使用 `--merge`：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

当 `openclaw config set` 对 `agents.defaults.models`、`models.providers` 或 `models.providers.<id>.models` 的普通对象赋值会丢弃现有条目时，它会拒绝该操作；只有在新值应成为完整目标值时才使用 `--replace`。交互式提供方设置和 `openclaw configure --section model` 已经会将按提供方范围的选择合并到允许列表中，因此添加提供方不会丢弃无关条目；`configure` 会保留现有的 `agents.defaults.model.primary`。像 `openclaw models auth login --provider <id> --set-default` 和 `openclaw models set <model>` 这样的显式命令仍会替换 primary。
</Accordion>

## 聊天中的 `/model`

```text
/model
/model list
/model 3
/model openai/gpt-5.4
/model default
/model status
```

- `/model` 和 `/model list` 会显示一个紧凑的编号选择器（模型家族 + 可用提供方）；`/model <#>` 会从中进行选择。在 Discord 中，这会打开提供方/模型下拉菜单，并带有一个提交步骤；在 Telegram 中，选择器的选择仅限于当前会话范围，且绝不会重写 `openclaw.json` 中代理的持久默认值。`/models add` 已弃用，并且会返回一条消息，而不是从聊天中注册模型。
- `/model` 会立即持久化新的会话选择。如果代理处于空闲状态，下一次运行会立即使用它；如果某次运行已经在进行中，则切换会排队，等待下一次干净的重试点（如果工具活动或回复输出已经开始，则会等待更晚的重试点）。
- `/model default` 会清除会话选择，使其重新继承已配置的主模型。
- 用户选择的 `/model` 引用对该会话是严格生效的：如果它变得不可达，回复会显式失败，而不会悄悄通过 `agents.defaults.model.fallbacks` 回退。已配置的默认值和 cron 作业主模型仍然使用回退链。
- `/model status` 是详细视图：每个提供方的认证候选项，以及（在已配置时）提供方端点 `baseUrl` 和 `api` 模式。
- 模型引用通过在第一个 `/` 处分割来解析；类型为 `provider/model`。如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含提供方前缀，例如 `/model openrouter/moonshotai/kimi-k2`。如果省略提供方，OpenClaw 会依次尝试：(1) 别名匹配，(2) 对该未加前缀的精确模型 ID 进行唯一的已配置提供方匹配，(3) 已配置的默认提供方（已弃用的回退）——并且如果该提供方不再暴露已配置的默认模型，则使用第一个已配置的提供方/模型，以避免显示一个已失效、已移除提供方的默认值。
- 模型引用会规范化为小写；但提供方 ID 仍然保持精确匹配，因此请使用插件所公布的 ID。

完整的命令行为和配置：[/Slash commands](/tools/slash-commands)。

## CLI

```bash
openclaw models status
openclaw models list
openclaw models set <provider/model>
openclaw models set-image <provider/model>
openclaw models scan
openclaw models aliases list|add|remove
openclaw models fallbacks list|add|remove|clear
openclaw models image-fallbacks list|add|remove|clear
openclaw models auth list|add|login|paste-api-key|paste-token|setup-token|order
```

不带子命令的 `openclaw models` 是 `models status` 的快捷方式，它也会显示 auth-store 配置文件的 OAuth 过期时间（默认在 24 小时内发出警告）。完整标志、JSON 结构以及 auth-profile 子命令：[Models CLI reference](/cli/models)。

<AccordionGroup>
  <Accordion title="扫描（OpenRouter 免费模型）">
    `openclaw models scan` 会检查 OpenRouter 的公开免费模型目录，并可实时探测候选项是否支持工具和图像。目录本身是公开的，因此仅元数据扫描（`--no-probe`）不需要密钥；实时探测以及 `--set-default`/`--set-image` 需要 OpenRouter API 密钥（auth 配置文件或 `OPENROUTER_API_KEY`），否则会退回到仅元数据输出并失败关闭。

    结果的排序依据为：图像支持，其次是工具延迟，然后是上下文大小，最后是参数数量。在 TTY 中，探测结果会提示进行交互式回退选择；非交互模式需要使用 `--yes` 来接受默认值。

  </Accordion>
</AccordionGroup>

## 模型注册表（`models.json`）

在 `models.providers` 下配置的自定义提供商会写入代理目录下的 `models.json`（默认 `~/.openclaw/agents/<agentId>/agent/models.json`）。提供商插件目录会作为单独生成的、由插件拥有的目录分片进行存储，并自动加载。默认情况下，此文件会与配置合并；设置 `models.mode: "replace"` 可仅使用你配置的提供商。

<AccordionGroup>
  <Accordion title="合并模式优先级">
    对于匹配的提供商 ID：

    - 代理 `models.json` 中已存在的非空 `baseUrl` 优先。
    - `models.json` 中非空的 `apiKey` 只有在当前配置/认证配置文件上下文中该提供商不是由 SecretRef 管理时才优先。
    - 由 SecretRef 管理的 `apiKey` 值会从源标记刷新，而不是持久化已解析的密钥：环境变量引用使用 env 变量名，文件/exec 引用使用 `secretref-managed`。
    - 由 SecretRef 管理的 header 值以相同方式刷新，环境变量引用使用 `secretref-env:ENV_VAR_NAME`。
    - `models.json` 中空或缺失的 `apiKey`/`baseUrl` 会回退到配置中的 `models.providers`。
    - 其他提供商字段会从配置和规范化后的目录数据中刷新。

  </Accordion>
</AccordionGroup>

标记持久化以源为权威：每当 OpenClaw 重新生成 `models.json` 时，都会从当前激活的源配置快照（解析前）写入标记，而不是从解析后的运行时密钥值写入——这也包括像 `openclaw agent` 这样的命令驱动路径。

## 相关内容

- [Agent 运行时](/concepts/agent-runtimes) — OpenClaw、Codex 以及其他 agent 循环运行时
- [配置参考](/gateway/config-agents#agent-defaults) — 模型配置键
- [图像生成](/tools/image-generation) — 图像模型配置
- [模型故障转移](/concepts/model-failover) — 回退链
- [模型提供商](/concepts/model-providers) — 提供商路由和认证
- [Models CLI 参考](/cli/models) — 完整命令和标志参考
- [音乐生成](/tools/music-generation) — 音乐模型配置
- [视频生成](/tools/video-generation) — 视频模型配置
