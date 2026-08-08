---
summary: "OpenClaw 如何解析 provider/model 引用、config 键，以及 `/model` 聊天命令"
read_when:
  - 更改模型回退行为或选择 UX
  - 调试“model is not allowed”或过时的默认 provider 回退
  - 处理 models.json 合并/密钥行为
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
  <Card title="模型 CLI 参考" href="/cli/models">
    完整的 `openclaw models` 命令和标志参考。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults">
    模型配置键、默认值和示例。
  </Card>
</CardGroup>

模型引用（`provider/model`）选择的是提供商和模型，而不是底层
agent 运行时。在未设置运行时策略或设置为 `auto` 时，OpenAI 的 provider-owned
路由策略可能只会为精确匹配的官方 HTTPS Platform
Responses 或 ChatGPT Responses 路由选择 Codex，且不能带有作者指定的请求覆盖；仅仅使用
`openai/*` 前缀永远不会选择 Codex。补全适配器、自定义
端点，以及作者指定的请求行为都会保留在 OpenClaw 上。纯文本的官方
HTTP 端点会被拒绝。参见 [OpenAI 隐式 agent 运行时](/providers/openai#implicit-agent-runtime)。

订阅 Copilot 引用（`github-copilot/*`）可以选择接入外部
GitHub Copilot agent 运行时插件，但该路径始终是显式的（绝不会被 `auto` 选择）。运行时覆盖应配置在 provider/model 策略上，而不是整个 agent 或会话上。运行时选择不决定计费：
OpenAI API 密钥和 ChatGPT/Codex 订阅凭证仍然是不同的。参见
[Agent 运行时](/concepts/agent-runtimes) 和
[GitHub Copilot agent 运行时](/plugins/copilot)。

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

- `agents.defaults.models` 存储别名和每个模型的设置。添加条目不会限制模型覆盖。
- `agents.defaults.modelPolicy.allow` 是可选的覆盖允许列表。使用精确引用或以 `provider/*` 和 `provider/namespace/*` 形式的尾部前缀通配符；省略它或将其设为 `[]` 可允许任意模型。按代理的 `agents.entries.*.modelPolicy.allow` 会替换该代理的默认策略。
- `agents.defaults.utilityModel` 是一个可选的低成本模型，用于简短的内部任务，例如生成仪表板会话标题、受支持的频道线程/主题标题以及进度叙述。按代理的 `agents.entries.*.utilityModel` 会覆盖它。未设置时，OpenClaw 会在存在主提供方声明的小模型默认值时使用该默认值（OpenAI → `gpt-5.6-luna`，Anthropic → `claude-haiku-4-5`），否则使用该代理的主模型；将其设置为空字符串可禁用 utility 路由。生成的标题在不同的 utility 模型失败后，会使用主模型重试一次。对于仪表板标题，自动 utility 推导和常规回退会遵循有效的会话提供方和认证配置文件；显式的 utility 模型会保留其配置的提供方/认证。空的 utility 模型仅会跳过备用小模型路径，不会跳过仪表板标题生成。utility 任务是独立的模型调用，可能会向所选模型提供方发送有限范围的任务内容。
- `agents.defaults.imageModel` 仅在主模型无法接受图像时使用。
- `agents.defaults.pdfModel` 由 `pdf` 工具使用。若未设置，该工具会回退到 `imageModel`，然后回退到解析后的会话/默认模型。
- `agents.defaults.mediaModels.{image,music,video}` 为共享的媒体生成工具提供支持。若未设置，每个工具都会推断一个基于认证的提供方默认值：先使用当前默认提供方，然后按提供方 ID 顺序使用该能力的其余已注册提供方。跨提供方回退是固定的默认行为。
- 按代理的 `agents.entries.*.model`（以及绑定）会覆盖 `agents.defaults.model` —— 参见 [多代理路由](/concepts/multi-agent)。

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

- 更改 `agents.defaults.model.primary` 不会重写现有会话的固定选择。如果状态报告 `This session is pinned to X; config primary Y will apply to new/unpinned sessions.`，请运行 `/model default` 来清除固定选择。
- CLI 默认模型和允许列表选择器会尊重 `models.mode: "replace"`，仅列出 `models.providers.*.models`，而不是完整的内置目录。
- Control UI 的模型选择器会向 Gateway 请求其已配置的模型视图。显式的 `modelPolicy.allow` 会对其进行过滤，包括尾随前缀通配符条目；否则它会显示已配置的模型以及具有可用认证的提供方。默认和已配置的选择器视图会隐藏标记为 `deprecated` 或 `disabled` 的目录行，除非该精确模型被配置为 primary、fallback、utility/tool model、别名/设置键，或精确的策略条目。隐藏行仍可通过精确的 `provider/model` 引用进行选择。完整的内置目录（包括隐藏行）仅保留给显式浏览视图（`models.list` 且 `view: "all"`，或 `openclaw models list --all`）。
- Provider inventory 界面使用带有 `view: "provider-config"` 的 `models.list` 来显示源头编写的 `models.providers.*.models` 行，而不应用选择器允许列表。

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

如果未配置主模型，新的 OpenAI API 密钥设置会选择
`openai/gpt-5.6`；直接使用 API 的裸 ID 会解析到 Sol 层级。新的
ChatGPT/Codex OAuth 设置会选择精确的 `openai/gpt-5.6-sol` 目录引用。
重新认证会保留现有的显式主模型，包括
`openai/gpt-5.5`。如果该账户无法使用 GPT-5.6，请显式选择
`openai/gpt-5.5`；OpenClaw 不会悄悄降级它。

## “模型不被允许”（以及为什么回复会停止）

如果 `agents.defaults.modelPolicy.allow` 非空，它就会成为 `/model`、会话覆盖以及 `--model` 的允许列表。选择该允许列表之外的模型会在生成任何正常回复之前直接返回。针对单个 agent 的 `agents.entries.*.modelPolicy.allow` 会替换该 agent 的默认策略。

```text
模型覆盖 "provider/model" 不被 agents.defaults.modelPolicy.allow 允许。
将 "provider/model"、"provider/*" 或更窄的 "provider/namespace/*" 前缀添加到 agents.defaults.modelPolicy.allow，或者移除/清空该列表以允许任意模型。
```

通过将模型或 provider 通配符添加到指定的 `modelPolicy.allow` 键中、移除/清空该列表，或者从 `/model list` 中选择一个模型来修复它。如果被拒绝的命令包含运行时覆盖，例如 `/model openai/gpt-5.5 --runtime codex`，请先修复允许列表，然后重试同一命令。

对于本地/GGUF 模型，允许列表需要完整的带提供方前缀的引用，例如 `ollama/gemma4:26b` 或 `lmstudio/Gemma4-26b-a4-it-gguf` —— 请使用 `openclaw models list --provider <provider>` 查看精确字符串。一旦允许列表启用，裸文件名或显示名称就不够了。

要在不列出每个模型的情况下限制提供方，请使用结尾前缀通配符条目。`provider/*` 会匹配该提供方下的所有模型；更窄的前缀例如 `clawrouter/anthropic/*` 只匹配该命名空间：

```json5
{
  agents: {
    defaults: {
      modelPolicy: {
        allow: ["openai/*", "vllm/*"],
      },
    },
  },
}
```

然后 `/model`、`/models` 和模型选择器只会显示这些提供方的已发现目录，而且无需编辑允许列表就能出现新模型。可以将精确的 `provider/model` 条目与 `provider/*` 条目混合使用，以从另一个提供方引入某一个特定模型。

带别名和按模型设置的允许表示例：

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-sonnet-4-6" },
      modelPolicy: {
        allow: ["anthropic/claude-sonnet-4-6", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
}
```

<Accordion title="显式编辑允许列表">
直接设置完整列表：

```bash
openclaw config set agents.defaults.modelPolicy.allow '["openai/gpt-5.4","anthropic/*"]' --strict-json
```

`openclaw models set`、提供方设置以及 `openclaw models aliases add` 可以在 `agents.defaults.models` 下添加条目，但它们从不更改 `modelPolicy.allow`。这使模型元数据和别名与覆盖策略保持独立。
</Accordion>

## 聊天中的 `/model`

直接由所有者/管理员发出的 `/model <model>` 请求使用**默认作用域**：它会更改当前会话，并尽力更新已配置的默认值。添加 `-s` 则使用**会话作用域**：只更改当前会话。如果代理没有显式的主模型，则其有效默认模型是共享的全局 `agents.defaults.model` 回退值。

```text
/model
/model list
/model 3
/model openai/gpt-5.4
/model openai/gpt-5.4 -s
/model default -s
/model default
/model status
```

- `/model` 和 `/model list` 会显示一个紧凑的编号选择器（模型系列 + 可用提供商）；`/model <#>` 可从中选择。Telegram 的回调选择器仅作用于当前会话。Discord 的选择器遵循直接命令流程，因此所有者/管理员提交后会请求更新已配置的默认值。`/models add` 已弃用，现在会返回一条消息，而不会从聊天中注册模型。
- **已配置的默认值：** 直接由所有者/管理员执行 `/model <model>` 会更改当前会话，并请求尽力更新有效的已配置默认值。如果代理存在显式主模型，OpenClaw 会以其为目标；否则会以共享的 `agents.defaults.model` 回退值为目标。不可变配置保持不变，异步写入失败会被记录日志，但不会回滚会话中的模型选择。
- **仅当前会话：** `/model <model> -s`（或 `--session`）会更改当前会话，而不会更改任何一个已配置的默认值。非所有者执行不带参数的 `/model <model>` 时，也仅作用于当前会话，因为该调用者无法写入已配置的默认值。只要提供商仍支持显式用户选择的模型和身份验证配置文件，它们就会在 `/new`、`/reset`、会话轮换、压缩和冷却窗口期间保持固定；自动配置文件固定可能会轮换或清除。
- **使用已配置的默认值：** `/model default`（带或不带 `-s`）会清除当前会话的模型选择，使其继承当前有效的已配置默认值。兼容的身份验证配置文件固定会保留；不兼容的固定会被清除。它不会恢复之前某次所有者/管理员执行 `/model <model>` 所替换掉的旧已配置默认值。
- 如果代理处于空闲状态，模型更改会立即应用于下一次运行。如果已有运行正在进行，则切换会排队到下一个干净的重试点（如果工具活动或回复输出已经开始，也可能会延后到更晚的重试点）。
- 用户选择的 `/model` 引用对该会话是严格的：如果它变得不可访问，回复会明确失败，而不会通过 `agents.defaults.model.fallbacks` 静默回退。已配置的默认值和 cron 任务的主模型仍会使用回退链。
- `/model status` 是详细视图：显示每个提供商的身份验证候选项，以及（在已配置时）提供商端点的 `baseUrl` 和 `api` 模式。
- 模型引用通过在第一个 `/` 处分割来解析；格式为 `provider/model`。如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含提供商前缀，例如 `/model openrouter/moonshotai/kimi-k2`。如果省略提供商，OpenClaw 会依次尝试：(1) 别名匹配；(2) 针对该完全匹配的未加前缀模型 ID，查找唯一的已配置提供商匹配项；(3) 使用已配置的默认提供商（已弃用的回退方式）——如果该提供商不再提供已配置的默认模型，则改用第一个已配置的提供商/模型，以避免显示已过时的、已移除提供商的默认值。
- 模型引用会被规范化为小写；除此之外，提供商 ID 区分大小写，因此请使用插件公布的 ID。

完整的命令行为和配置：[/斜杠命令](/tools/slash-commands)。

## 命令行界面

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

不带子命令的 `openclaw models` 是 `models status` 的快捷方式，它也会显示身份验证存储配置文件的 OAuth 过期时间（默认在 24 小时内发出警告）。完整标志、JSON 结构以及身份验证配置文件子命令：[模型 CLI 参考](/cli/models)。

<AccordionGroup>
  <Accordion title="扫描（OpenRouter 免费模型）">
    `openclaw models scan` 会检查 OpenRouter 的公开免费模型目录，并可实时探测候选项是否支持工具和图像。目录本身是公开的，因此仅元数据扫描（`--no-probe`）不需要密钥；实时探测以及 `--set-default`/`--set-image` 需要 OpenRouter API 密钥（身份验证配置文件或 `OPENROUTER_API_KEY`），否则会退回到仅元数据输出并失败关闭。

    结果的排序依据为：图像支持，其次是工具延迟，然后是上下文大小，最后是参数数量。在 TTY 中，探测结果会提示进行交互式回退选择；非交互模式需要使用 `--yes` 来接受默认值。

  </Accordion>
</AccordionGroup>

## 模型注册表（`models.json`）

### 托管目录更新

OpenClaw 可以在不等待新的 OpenClaw 版本发布的情况下，刷新已安装提供商插件所附带的模型元数据。网关会在启动时在后台进行一次 JSON `GET` 请求，然后最多每六小时检查一次。该请求不会发送任何提示词、凭据、模型使用情况或配置负载，只会携带常规的 HTTP user agent 和条件缓存头。

下载的捆绑包会存储在共享的 SQLite 状态数据库中，并在下一次网关重启后变得可见。远程数据只能为已安装插件清单中声明的提供商更新或添加模型。它不能提供 API 基础 URL 或请求头，并且会忽略比已安装发布版本构建时间戳更旧的目录。

托管文件发布自公开的 [`openclaw/catalog`](https://github.com/openclaw/catalog) GitHub 仓库。其定时工作流会根据 OpenClaw 随附的插件清单和定价来源进行刷新；每一次目录内容变更都会作为公开提交保留。

运行 `openclaw models refresh` 可立即进行元数据和定价检查，或通过设置 `models.catalogRefresh.enabled: false` 来禁用所有托管目录请求。禁用后，定价将保持为捆绑值和显式配置值。也可以通过 HTTPS 的 `models.catalogRefresh.url` 选择自托管镜像（测试时也可使用 localhost HTTP）；请参见[配置参考](/gateway/configuration-reference#models)。

在 `models.providers` 下配置的自定义提供商会写入代理目录中的 `models.json`（默认 `~/.openclaw/agents/<agentId>/agent/models.json`）。提供商插件目录会作为单独生成的、由插件拥有的目录分片存储，并自动加载。默认情况下，此文件会与配置合并；设置 `models.mode: "replace"` 可仅使用你配置的提供商。

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
- [视频生成](/tools/video-generation) — 视频模型配置。
