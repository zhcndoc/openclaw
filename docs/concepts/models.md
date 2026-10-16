---
summary: "OpenClaw 如何解析 provider/model 引用、config 键，以及 `/model` 聊天命令"
read_when:
  - "更改模型回退行为或选择 UX"
  - "调试“model is not allowed”或过时的默认 provider 回退"
  - "处理 models.json merge/secret 行为"
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

模型引用 （`provider/model`） 选择提供程序和模型，而不是低级代理运行时。在未设置运行时策略或 `auto` 的情况下，OpenAI 的提供商拥有的路由策略可能仅针对确切的官方 HTTPS 平台响应或 ChatGPT 响应路由选择 Codex，而无需编写请求覆盖。仅 `openai/*` 前缀永远不会选择 Codex。完成适配器、自定义端点和编写的请求行为保留在 OpenClaw 上。明文官方 HTTP 端点被拒绝。请参阅 [OpenAI 隐式代理运行时](/providers/openai/runtimes#implicit-agent-runtime)。

订阅 Copilot 引用 （`github-copilot/*`） 可以选择加入外部 GitHub Copilot 代理运行时插件，但该路径始终是显式的（`auto` 从未选择）。运行时覆盖属于 provider/model 策略，而不是整个代理或会话。运行时选择并不决定计费：OpenAI API-key 和 ChatGPT/Codex 订阅凭证仍然不同。请参阅 [Agent 运行时](/concepts/agent-runtimes) 和 [GitHub Copilot 代理运行时](/plugins/copilot)。

使用本机运行时创建会话会在需要时获取该运行时的当前模型和帐户观察，包括当运行时来自模型策略时。您不需要先打开模型选择器。仅当其运行时所有者和帐户保持当前状态时，才会重用缓存的观察结果。本机读取共享会话创建的目录截止时间，如果调用者断开连接或失去权限则停止等待；未完成的目录会返回可重试的错误，而不创建会话。

## <a id="selection-order"></a> 选择顺序

<Steps>
  <Step id="primary-model" title="主要模型">
    `agents.defaults.model.primary`（或将 `agents.defaults.model` 作为普通字符串）。
  </Step>
  <Step id="fallbacks" title="后备措施">
    `agents.defaults.model.fallbacks`，按顺序依次尝试。
  </Step>
  <Step id="auth-failover" title="身份验证故障转移">
    在 OpenClaw 转到下一个备用模型之前，认证配置文件轮换会先在提供方内部发生。
  </Step>
</Steps>

相关的模型配置入口：

- `agents.defaults.models` 存储别名和每个模型的设置。旧策略迁移后，添加条目不会限制模型覆盖。
- `agents.defaults.modelSelectionScope` 选择聊天命令和网关会话模型更新的范围，而没有明确的范围。默认为当前会话。参见[选型范围](/gateway/config-agents/models#agentsdefaultsmodelselectionscope)。
- `agents.defaults.modelPolicy.allow` 是可选覆盖白名单。使用精确引用或尾随前缀通配符，例如 `provider/*` 和 `provider/namespace/*`。省略它或设置 `[]` 以允许任何模型。每个代理 `agents.entries.*.modelPolicy.allow` 替换该代理的默认策略。
- `agents.defaults.utilityModel` 是适用于短期内部任务的可选低成本模型。这些任务包括生成的仪表板会话标题、支持的频道线程或主题标题、进度旁白和滚动 [ 活动回顾 ](/web/control-ui/settings#activity-tab)。每个代理 `agents.entries.*.utilityModel` 会覆盖它。未设置时，OpenClaw 使用主要提供者声明的小模型默认值（如果存在）（OpenAI → `gpt-5.6-luna`、Anthropic → `claude-haiku-4-5`），否则使用代理的主要模型。将其设置为空字符串以禁用实用程序路由。当不同的实用新型失败时，生成的标题会使用主模型重试一次。对于仪表板标题，自动实用程序派生和定期回退遵循有效的会话提供程序和身份验证配置文件。显式实用程序模型保留其配置的提供者和身份验证。空实用模型仅跳过备用小模型路线，而不跳过仪表板标题生成。实用程序任务是单独的模型调用，并且可以将有界任务内容发送到选定的模型提供者。活动回顾使用有界的转录摘录和先前的回顾，在失败时保留缓存的文本，并且不会回退到主要模型。
- `agents.defaults.decisionModel` 选择插件的类型化决策模型作为选择、分数和布尔概率的 `provider/model`。当未设置或为空时，它被禁用。每个代理 `agents.entries.*.decisionModel` 在未设置时继承，并在空时禁用决策。 Control UI 在 Utility 旁边有一个单独的 **Decision** 选择器；决策模型永远不会出现在聊天、主要、后备或实用选择中。支持插件调用[决策运行时](/plugins/sdk-overview/capabilities#decision-models-contract-version-1)；单独的选择不会启动后台工作或取代聊天模型。
- `agents.defaults.imageModel` 仅在主模型无法接受图像时使用。
- `agents.defaults.pdfModel` 由 `pdf` 工具使用。如果未设置，该工具将回退到 `imageModel`，然后是已解析的 session/default 模型。
- `agents.defaults.mediaModels.{image,music,video}` 支持共享媒体生成工具。如果未设置，每个工具都会推断出一个支持身份验证的提供程序默认值：首先是当前默认提供程序，然后是按提供程序 ID 顺序为该功能注册的其余提供程序。跨提供商回退是固定的默认行为。
- 按代理的 `agents.entries.*.model`（以及绑定）会覆盖 `agents.defaults.model` —— 参见 [多代理路由](/concepts/multi-agent)。

完整键参考、默认值和 JSON5 示例：[配置参考](/gateway/config-agents#agent-defaults)。

标题生成需要考虑支持的地方。具有推断的 Z.AI （`zai`） 思维格式的自定义 OpenAI- 兼容端点将保留提供者的默认值，除非明确的思维格式、支持的工作量或推理-工作量映射声明了契约。这可以避免对始终思考的 GLM 模型的请求被拒绝。其他思维方式仍保留其现有的不受控制的状态。显式兼容性设置仍然具有权威性。失败的标题尝试会记录一条警告，命名为 provider/model，并建议您检查其配置或选择另一个 `utilityModel`，每 provider/model 每分钟最多一次。该警告不包括源文本和原始提供程序错误。

实用任务需要思考，以便将有限的输出预算用于标题、观察者摘要或摘要，而不是隐藏的推理。这还会覆盖针对这些请求配置的本机 Ollama `think`/`thinking` 和 OpenAI- 兼容 `enable_thinking` 开关，而无需更改普通聊天推理、其他模型参数或任务超时。需要推理的提供商仍然适用其支持的最低限度；参见[Ollama思维控制](/providers/ollama/advanced)。

有关类型化决策模型类、可用模型、评分标准和插件 API，请参阅 [ 决策模型](/concepts/decision-models)。

v2026.8.1. 中引入了显式 `modelPolicy.allow` 限制对于旧模型映射，当每个引用有效时，`openclaw doctor --fix` 将完整限制复制到 `modelPolicy.allow` 中。当一个受支持的包含文件拥有修复时，Doctor 会更新该文件并保留其祖先包含指令，包括在更新期间。跨越多个所有者的修复仍然需要编辑所属文件。如果任何裁判需要提供者资格，Doctor 会保留整个遗留限制并报告如何设置明确的政策。在此之前，模型图编辑仍然会改变旧的限制。不会默默地丢弃任何密钥，也不会用空策略来替代未解决的限制。

从包含的配置中删除显式默认模型策略会保留空的 `modelPolicy: {}`。这使得以后添加别名或模型设置时策略不受限制。

<a id="selection-source-and-fallback-behavior" />

## <a id="selection-source-and-fallback-strictness"></a> 选择来源与回退严格性

同一个 `provider/model` 会因其来源不同而表现不同：

| 来源                                               | 行为                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 配置默认值 （`agents.defaults.model.primary`） | 正常原生起点；使用 `agents.defaults.model.fallbacks`。                                                                                                                                                                                                                                                                  |
| 原生代理主要                                 | 严格除非智能体供应`model.fallbacks`；显式 `[]` 会禁用回退。                                                                                                                                                                                                                                                |
| ACP代理初级                                    | 选择外部harness模型。本机调用使用配置的本机默认值并继承其后备列表，除非代理提供 `model.fallbacks`。显式本机会话和子代理选择仍然适用。                                                                                                             |
| 自动固定 creation/spawn 模型            | 创建时选择的具体模型可以用 `modelOverrideSource: "auto"` 存储。它会在以后的默认更改中保留该模型，并允许配置后备。如果没有回退源元数据，它是一个创建引脚，而不是等待恢复的临时回退。                                                          |
| 自动回退                                        | 临时恢复状态，存储为`modelOverrideSource: "auto"`。 OpenClaw 定期重新探测原始主节点，清除恢复时的自动选择，并在每次状态更改时宣布 fallback/recovery 转换。                                                                                                      |
| 用户会话选择                               | 选择除有效代理默认值之外的模型是准确且严格的 （`modelOverrideSource: "user"`）。如果 provider/model 变得无法访问，则运行会明显失败，而不是转至另一个配置的模型。选择有效的默认值会清除模型引脚并保留其配置的后备策略。 |
| 克朗 `--model` / 有效负载 `model`                     | 每个任务的 primary。仍然使用已配置的回退，除非任务提供自己的 payload `fallbacks`（`fallbacks: []` 会强制严格运行）。                                                                                                                                                                                            |

其他选择规则：

- 更改全局或每个代理主节点不会重写现有会话引脚，包括自动创建引脚。使用 `/model`、模型选择器、`session_status(model=...)` 或 `sessions.patch` 选择有效代理默认值，或使用 `/model default` 或 `sessions.patch {model: null}` 重置，以遵循后续默认更改。如果状态报告 `This session is pinned to X; config primary Y will apply to new/unpinned sessions.`，请运行 `/model default` 以清除引脚。
- CLI 默认模型和允许列表选择器会尊重 `models.mode: "replace"`，仅列出 `models.providers.*.models`，而不是完整的内置目录。
- Control UI 从网关准备好的配置模型视图开始，因此打开聊天不会启动提供商发现。打开聊天模型选择器会读取已发布的提供程序行，包括与尾随 `provider/*` 策略条目匹配的行，并在首次使用时发现该代理的本机harness模型。使用其显式刷新操作来请求立即提供程序发现。默认和配置的选取器视图隐藏标记为 `deprecated` 或 `disabled` 的目录行。有一个例外：当该确切模型配置为主要、后备、实用程序或工具模型、别名或设置键或确切策略条目时，一行保持可见。隐藏行仍然可以通过精确的 `provider/model` 参考来选择。完整的内置目录（包括隐藏行）保留用于显式浏览视图（`models.list` 和 `view: "all"` 或 `openclaw models list --all`）。
- 当登录、密钥或 CLI 登录丢失时，已配置的模型会保留在选取器中：它们显示为不可用，而不是消失。这涵盖了主要模型、后备模型、实用程序模型和工具模型，以及每个 `agents.defaults.models` 或每个代理 `models` 条目。
- Provider 库存 UI 使用 `models.list` 和 `view: "provider-config"` 来显示源创作的 `models.providers.*.models` 行，而不应用选取器白名单。
- Chat 和新会话将默认重置选项固定在其提供商组中，然后是选定的模型，然后是该提供商的 [ 推荐模型](/concepts/recommended-models)。提供商的其他模型在**后面等待所有模型（N）**；没有推荐的提供商列出了每个模型。终端 `/models` 选择器显示当前和推荐的模型，其余行为 **所有模型 （N）** 行。文本 `/models <provider>` 页面首先放置当前模型，然后是推荐模型，而不是按字母顺序排列目录。模型设置将选定的模型放在第一位。其他行保持网关的目录顺序。选择器搜索检查完整列表，而不仅仅是可见行。
- 登录到提供商可让现有选择在打开的 Control UI 和终端模型选择器中保持可见，同时发现在后台刷新。对模型限制、操作员角色或目录模式的更改仍然会淘汰旧的选择，直到替换目录准备就绪。
- 网关启动后发布的第一个目录使用与稍后刷新相同的提供商拥有的模型顺序。捕获的行继承提供者的建议（如果可用）；没有提供者排名的行保留目录的字母顺序后备。

在共享网关上，管理员还可以配置名为 [ 的角色的模型策略](/gateway/operator-scopes#named-operator-roles)。模型发现和 Control UI、macOS 和 iOS 聊天选择器仅显示该策略允许的模型。这也适用于 Control UI 中的新会话。默认选项使用允许的自动默认值；它不授予额外的手动选择。对模型限制、操作员角色或目录模式的更改会在刷新目录之前放弃旧的选择。保存的对话保留其历史模型信息。单独的过滤不会覆盖保存的新会话模型首选项。当策略再次允许时，保存的选择可以返回；明确选择另一个模型仍然会更新偏好。

网关为CLI、`/models`、Control UI和本机应用程序准备一份模型目录。聊天和会话元数据读取已发布的行，而无需启动提供程序发现。普通`models.list`请求重用已发布的目录；提供者响应缓存过期本身不会重建它。启动、更改配置或凭据、插件和托管元数据更新以及显式 **Refresh** 自己的提供商目录获取。初创公司在后台发现供应商库存；稍后的配置或凭据更改只会重新发现受影响的提供程序。 Codex 等本机工具可根据所选代理的需求发现模型和帐户准备情况：打开其模型选择器或目录、创建本机会话或运行轮次。未使用的代理不会在启动时启动本机应用程序服务器。仅准备好的元数据读取会保留已配置的模型提示，并具有未知的本机准备情况，直到发现完成。发现失败的提供程序会保留其已保存或内置的行，并在 30 秒后在后台重试，并在不断失败时回退到 30 分钟。选定的本机模型可以在采集仍在运行时加载自己的元数据。

在聊天应用程序中，`/models` 和模型选择器按钮重复使用最新完成的提供商列表。网关模型选择器立即返回准备好的行，同时空闲的本机代理启动其利用并在后台发现模型。待处理的提供商显示 `checking models…`。再次打开菜单可以看到新发现的模型；完成发现不会编辑已发送的列表。如果可选的本机发现失败，普通目录请求将保留已发布的行并报告 `refreshFailed`；选择本机模型或显式刷新仍会报告发现错误。失败的harness并不会阻止客户退休后健康的运行时间的刷新。

刷新所选帐户还会保留其最后完成的目录可供其他读者使用，直到发现成功为止。刷新失败会保留该目录；替换帐户凭据会立即使其失效。即使对于新选择的个人帐户，普通读取也会使用已发布的库存。使用 **Refresh** 获取该帐户的特定于提供商的目录详细信息。

如果准备大型队列所需的时间超过两分钟的启动预算，则网关将从已完成准备的代理模型运行时启动。警告会列出剩余的代理和获取阶段，包括已知的工作区插件。 `openclaw health --json` 和网关 `status` RPC 报告 `modelRuntime.degraded` 和 `modelRuntime.pendingAgents`。准备工作在后台继续进行；每个已完成的代理都变得可用，并且当完整发布完成时，降级状态将清除。未完成的代理无法为模型请求提供服务，直到其运行时和身份验证事实准备就绪。

登录后，入门模型立即可用。当网关发现帐户模型时，选择器搜索字段中的小旋转器表示后台刷新。将鼠标悬停、聚焦或点击它即可查看哪些提供商正在刷新；现有模型保持可用，并且打开的选取器会在发现完成时更新。空的选择器会显示“正在加载模型...”，直到第一个模型到达。网关启动和凭据更改也会刷新受影响的目录。在模型中使用 **Refresh** 或 `openclaw models list --refresh` 请求再次刷新，包括新发布的模型。 **Retry** 失败后再次请求发现。

如果凭证刷新丢失其插件生成，OpenClaw 会针对当前插件重试发布一次。如果重试失败，记录的故障和网关警告将识别失败的新生代重试。

对于配置为使用 CLI 运行时的模型，通道选择器可用性遵循该运行时准备的身份验证。提供商 API 密钥不能替代其本机登录。当 Claude Code 注销时，其模型仍列为不可用，并且 Control UI 选择器和 `/models` 会建议 `claude auth login`。

如果发现失败，**设置 > 模型** 和 `openclaw models list` 报告失败并保留最后的兼容模型列表。如果没有，OpenClaw 显示准备好的入门模型。聊天和本机快速聊天模型选择器保留可用的选择，而不会发出目录范围的警告；所选模型的可用性仍然适用。其他提供商仍然可以更新。成功的空响应会清除该提供商已发现的模型；它不会恢复旧的选择。显式配置的模型和独立的本机运行时目录仍然存在。仅当规范化基础 URL 与该条目的创作 `baseUrl` 匹配时，在网关运行时删除 `models.providers.<id>` 条目才会清除已保存的插件目录行；没有编写的 URL 保留的其他发现端点和条目，以及在此行为可用之前进行的删除不会追溯清除。

对别名或模型限制的更改会重用兼容的库存。对提供程序、插件、凭据、环境或工作区的更改可能会使其失效。

当提供者刷新失败时，自动化和命令面板模型搜索会显示警告，同时保留网关返回的模型。打开模型以重试刷新。成功的空结果会清除发现的选择和警告。

即使另一个凭证报告失败，成功的提供程序结果也优先于保留的行。

完整机制：[模型故障切换](/concepts/model-failover)。

## <a id="quick-model-policy"></a> 快速模型策略

- 将主模型设置为你可用的、最强的最新一代模型。
- 对 cost/latency-sensitive 任务和低风险聊天使用后备。
- 对于支持工具的代理或不受信任的输入，请避免 older/weaker 模型层。

## <a id="onboarding"></a> 入门

```bash
openclaw onboard
```

为常见提供商设置模型和认证，无需手动编辑配置，包括 OpenAI Codex 订阅 OAuth 和 Anthropic（API 密钥或 Claude CLI 复用）。

在未配置主要模型的情况下，新的 OpenAI API-key 和 ChatGPT/Codex OAuth 设置选择确切的 `openai/gpt-6-astra` 目录参考号。裸直接 API `openai/gpt-5.6` 别名仍然受支持并解析为 Sol 层。重新验证会保留现有的显式主模型，包括 `openai/gpt-5.5`。如果帐户无法使用 GPT-5.6，请明确选择 `openai/gpt-5.5`。 OpenClaw并没有默默降级。

## <a id="%22model-is-not-allowed%22-(and-why-replies-stop)"></a><a id="model-is-not-allowed-and-why-replies-stop"></a> “模型不被允许”（以及为什么回复会停止）

当 `modelPolicy.allow` 被省略或为空时，即使有限 `/model` 选取器目录中不存在，您也可以选择显式 `provider/model`。该目录提供浏览选项和模型元数据。它不是隐式允许名单。提供程序可用性、运行时兼容性和身份验证都是独立检查的。无限制的策略不会使未知的提供程序或不受支持的运行时变得可用。如果省略该策略，则上述未迁移的旧模型映射限制仍然适用。

别名和策略条目并不能证明模型可以在提供者端点上运行。本机端点需要受支持的模型定义或提供商拥有的解决方案。显式自定义和本地端点可以使用未列出的模型名称。子代理生成在创建子状态之前检查相同的支持。当至少支持一个候选者时，自动选择将保持其原始的主要和后备顺序。

相同的策略适用于 `/new` 或 `/reset` 之后的显式 `provider/model` 和配置别名提示。无法识别的前导文本保留在提示中。

如果 `agents.defaults.modelPolicy.allow` 非空，它就会成为 `/model`、会话覆盖以及 `--model` 的允许列表。选择该允许列表之外的模型会在生成任何正常回复之前直接返回。针对单个 agent 的 `agents.entries.*.modelPolicy.allow` 会替换该 agent 的默认策略。

精确的条目仅允许该模型。配置的默认值和自动回退不会授予额外的手动选择。更新的选取器使用与显式模型命令相同的策略，同时保留当前模型控件。年长的客户仍然可以表现出禁止的选择；服务器拒绝其选择。重置为默认值会清除会话 pin 并保留现有的自动选择行为。

```text
Model override "provider/model" is not allowed by agents.defaults.modelPolicy.allow.
Add "provider/model", "provider/*", or a narrower "provider/namespace/*" prefix to agents.defaults.modelPolicy.allow, or remove/empty the list to allow any model.
```

通过将模型或提供程序通配符添加到命名的 `modelPolicy.allow` 密钥、列表中的 removing/emptying 或从 `/model list` 中选择模型来修复此问题。如果被拒绝的命令包含运行时覆盖（例如 `/model openai/gpt-5.5 --runtime codex`），请首先修复允许列表，然后重试相同的命令。

对于 local/GGUF 模型，白名单需要完整的提供商前缀引用，例如 `ollama/gemma4:26b` 或 `lmstudio/Gemma4-26b-a4-it-gguf` — 检查 `openclaw models list --provider <provider>` 以获得确切的字符串。一旦白名单处于活动状态，仅使用文件名或显示名称是不够的。

要限制提供程序而不列出每个模型，请使用尾随前缀通配符条目。提供商范围内的 `provider/*` 与该提供商下的每个模型相匹配。较窄的前缀（例如 `clawrouter/anthropic/*`）仅与该命名空间匹配：

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

<Accordion id="edit-the-allowlist-explicitly" title="明确编辑允许列表">
直接设置完整列表：

```bash
openclaw config set agents.defaults.modelPolicy.allow '["openai/gpt-5.4","anthropic/*"]' --strict-json
```

`openclaw models set`、提供方设置以及 `openclaw models aliases add` 可以在 `agents.defaults.models` 下添加条目，但它们从不更改 `modelPolicy.allow`。这使模型元数据和别名与覆盖策略保持独立。

### <a id="choose-the-same-model-with-different-runtimes"></a> 选择相同模型不同运行时间

在精确的模型条目上设置 `pickerRuntimes`，以在 Control UI 中提供额外的运行时选择。每个条目都会显示其harness标签。当 OpenClaw 和 Codex 配置为同一模型时，Codex 选择将 `codex` 附加到其名称中。仅配置一根harness的模型保留其简单名称。配置的 `agentRuntime` 保持默认：

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.6-sol": {
          agentRuntime: { id: "openclaw" },
          pickerRuntimes: ["codex"],
        },
      },
    },
  },
}
```

网关保留一个基础模型，并根据当前帐户、路线和启用的harness检查每个附加运行时。选择不会授予访问权限、更改凭据或重命名上游模型。每个运行时都提供自己的可用性、推理控制、上下文窗口和放置功能。其他选择还必须支持显式会话运行时选择；无法明确选择的已注册harness在此处仍处于禁用状态。 ACP 会话保留其现有模型控制；他们无法在这里选择不同的harness。打开选取器会在每个运行时获取一次缺失的本机清单，同时保留配置的默认值，然后重用当前的观察结果。显式刷新重新获取请求的清单。会话范围的选取器在检查会话访问权限后一起评估模型和运行时选择，并在返回目录之前重新检查访问权限。

代理可以通过`agents.entries.<id>.models["provider/model"].pickerRuntimes`替换继承的列表；空数组会删除该代理的其他选择。列表最多接受八个显式运行时 ID。重复运行时和默认运行时仅出现一次。此处不支持通配符模型密钥和 `auto` 或 `default` 运行时 ID。
</Accordion>

## <a id="choose-a-model-for-a-session"></a> 选择会话模型

在 Control UI 聊天模型菜单中，按模型或提供商名称进行搜索。使用箭头键在结果中移动，然后按 Enter 键选择一个。退出会清除搜索。单独键入不会更改所选模型。

网关 `sessions.create` 和 `sessions.patch` 解析目标会话的代理范围中的模型别名和 `modelPolicy.allow`。显式的每个代理白名单取代了共享默认值，包括允许任何模型的 `[]`。策略权限不提供提供者凭据或保证所选模型可用于其运行时。

在保存模型选择之前，这些网关方法会检查任何所需的嵌入式harness是否已安装可激活的插件。丢失或禁用的插件会拒绝更改并保留先前的会话选择和配置的默认值。安装并启用指定的harness插件，重新启动网关，然后再次选择模型。此检查不会启动运行时或验证提供程序凭据。

如果现有会话的工具变得不可用，则失败的回合会报告已知的所有者插件及其激活或加载阻止程序。按照错误的 `openclaw doctor --fix` 或 `openclaw plugins inspect <id> --runtime --json` 指导，修复插件，然后重新启动网关，然后重试。网关健康检查保持独立于模型执行。使用[Models status](/cli/models)和[Doctor](/gateway/doctor)对配置的路由进行诊断。

尽可能在创建会话时选择模型。 Control UI 的 **New Chat** 编辑器包含模型选择器的原因是：新的会话为所选模型提供了干净的对话边界。

更改已建立会话的模型是一项高级操作。会话记录仍然可用，但下一个模型可能具有不同的上下文窗口、提示和工具行为或提示缓存实现。因此，会话中切换可能会降低连续性，需要更早的压缩，或者失去提示缓存重用并增加延迟或成本。对于计划的模型更改，更喜欢新的会话。当您有意希望现有副本继续使用另一个模型时，请使用 `/model` 或活动会话模型选择器。

当缓存重用很重要时，保持会话的思考或推理水平稳定。在 OpenAI 上，更改推理工作会更改可重用请求状态，并可以强制下一轮再次处理完整对话。其他提供商也可能在其缓存标识中包含思维配置，因此即使模型本身保持不变，仅更改思维级别也会增加延迟和输入令牌成本。

保留推理在当前 Claude 模型上受模型限制。将会话从 Claude 神鬼寓言 5.1 中移出，不再保留《神鬼寓言》早期的想法，而是继续保留 Opus 5、Sonnet 5、Opus 4.8 和神鬼寓言 5 的想法，然后切换回来或更改`/think` 使切换前寓言推理无效。请参见 [Anthropic](/providers/anthropic#tool-calls-and-retained-thinking)。

<a id="model-in-chat" />

## <a id="%2Fmodel-in-chat"></a><a id="/model-in-chat"></a> 聊天中的 `/model`

`/model <model>` 更改当前会话。仅针对此会话使用 `-s`，使用 `-a` 来更新代理的默认值，或者使用 `-g` 来更新共享的全局默认值。长格式为 `--session`、`--agent` 和 `--global`。配置默认写入需要所有者或管理员权限。

如果没有范围标志，选择仅更改当前会话。 `agents.defaults.modelSelectionScope` 可以明确选择加入 `"agent"` 或 `"global"` 范围。 Owner/admin 权威本身永远不会扩大无范围选择。如果没有 owner/admin 权限，裸命令将保持仅会话状态，并且显式 `-a` 或 `-g` 请求将被拒绝。

```text
/model
/model list
/model Opus
/model openai/gpt-5.4
/model openai/gpt-5.4 -s
/model openai/gpt-5.4 -a
/model openai/gpt-5.4 -g
/model default -s
/model default
/model status
```

- 在文本聊天中，`/model` 显示当前选择。 `/model list`（或`/models`）浏览提供商。 `/models <provider>` 列出了模型参考。
- 选择 `/model <provider/model>` 或 `/model <alias>`（例如，使用上面配置的别名的 `/model Opus`）。不支持 `/model 3` 等数字选择。
- 在 Discord 上，不带参数的本机 `/model` 和 `/models` 打开交互式选择器。选择提供商和模型，然后按 **Submit**。 Discord 选取器遵循直接命令行为，包括 `modelSelectionScope`。
- 在Telegram、`/model`上提供了一个**浏览提供商**按钮。 `/model list`和`/models`直接打开提供商菜单。点击提供商，然后点击模型。 Telegram 回调选择始终保持仅限会话。
- `/models add` 已弃用并返回一条消息，而不是通过聊天注册模型。
- **当前会话：** `/model <model> -s`（或`--session`）仅更改此会话，无论`modelSelectionScope`如何。配置的默认值均未更改。
- **Agent 默认值：** Owner/admin `/model <model> -a`（或 `--agent`）为此会话选择模型并请求 `agents.entries.<agent>.model` 的更新。它会在需要时为配置的代理创建显式主代理，并且永远不会落入共享的全局默认值。
- **全局默认值：** Owner/admin `/model <model> -g`（或`--global`）更改此会话并请求共享`agents.defaults.model`回退的更新。它不会覆盖其他代理的显式初选或其他会话的模型引脚。新的和现有的未固定会话以及继承此默认值的 cron 作业可以在下次运行时使用更改后的模型。
- Immutable 配置保持不变。记录异步写入错误而不恢复会话选择。显式模型和验证配置文件引脚在有效时可以承受 `/new`、`/reset`、会话翻转、压缩和冷却窗口。
- **使用配置的默认值：** `/model default -s` 清除当前会话模型选择，而不写入配置的默认值。保留兼容的身份验证配置文件引脚。不兼容的引脚被清除。按名称选择有效配置的默认值也会清除会话模型引脚，但 agent/global 范围仍请求写入该配置的目标。这不会恢复由先前选择更改的较旧配置的默认值。
- **遵循兼容的运行时选择：** 仅模型更改在支持所选提供程序时保留会话运行时引脚。否则，引脚将被清除，所选模型将自动遵循其配置的运行时间。明确请求的不兼容运行时仍会被拒绝，而不更改任一选择。使用 `/model <provider/model> --runtime <runtime> -s` 切换运行时，或使用 `--runtime default` 遵循配置的路由。显式运行时行和 Control UI 中的 **Default** 仍然选择或重置运行时。
- 如果代理空闲，模型更改将立即应用于下一次运行。如果运行已处于活动状态，则交换机将排队等待下一个干净重试点。如果工具活动或回复输出已经开始，则可以将其排队等待稍后。
- 用户选择的 `/model` 引用对该会话是严格的：如果它变得不可访问，回复会明确失败，而不会通过 `agents.defaults.model.fallbacks` 静默回退。已配置的默认值和 cron 任务的主模型仍会使用回退链。
- 如果在实时切换排队时选择另一个模型，则较新的选择将保持等待状态，等待下一次安全重试机会。
- `/model status` 是详细视图：显示每个提供商的身份验证候选项，以及（在已配置时）提供商端点的 `baseUrl` 和 `api` 模式。
- `/status` 和 `session_status` 报告选定的凭证源，包括用于配置密钥的 `models.json` 和用于环境凭证的 `environment`。共享端点的自定义提供者保留自己的凭证选择；不同的保存配置文件不会替换状态输出中选定的源。
- 通过在第一个 `/` 上拆分来解析 Model 引用。模型 `provider/model`。如果模型 ID 本身包含 `/` （OpenRouter-style），请包含提供程序前缀，例如 `/model openrouter/moonshotai/kimi-k2`。如果省略提供程序，OpenClaw 首先尝试别名匹配。然后，它会尝试与该确切的无前缀模型 ID 进行唯一的配置提供程序匹配。然后它会尝试配置的默认提供程序，这是一个已弃用的后备方案。如果该提供程序不再公开配置的默认模型，则 OpenClaw 将改用第一个配置的提供程序和模型。这可以避免出现陈旧的已删除提供程序默认值。
- 别名无法将显式注册或配置的提供程序引用重定向到另一个提供程序，包括当引用具有 auth-profile 后缀时。冲突的别名仍然可以与其自己的提供者前缀一起使用。前导段是模型命名空间的斜杠形式别名仍然有效。
- 推断提供程序时，在相同配置范围内，精确模型 ID 大小写优先于不区分大小写的匹配。仅当它标识一个提供者时才使用不区分大小写的匹配。每个代理模型条目优先于全局条目和配置的提供程序目录。
- Provider ID 标准化为小写。模型 ID 遵循提供商的规范化规则。使用插件公布的拼写。
- 配置的主要模型也接受`provider/alias`。别名在推理之前在该提供程序中解析，而为该提供程序配置的确切模型 ID 保留其字面标识。可选的身份验证配置文件后缀（例如 `@work`）与模型标识保持独立。

完整的命令行为和配置：[/斜杠命令](/tools/slash-commands)。

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

不带子命令的 `openclaw models` 是 `models status` 的快捷方式，它还显示身份验证存储配置文件的 OAuth 过期（默认情况下在 24 小时内发出警告）。完整标志、JSON 形状和身份验证配置文件子命令：[Models CLI 参考](/cli/models)。

<AccordionGroup>
  <Accordion id="scanning-openrouter-free-models" title="扫描（OpenRouter免费模型）">
    `openclaw models scan` 检查 OpenRouter 的公共自由模型目录，并可以实时检查工具和图像支持的候选者。目录本身是公共的，因此仅元数据扫描 （`--no-probe`） 不需要密钥。实时检查和 `--set-default`/`--set-image` 需要 OpenRouter API 密钥（身份验证配置文件或 `OPENROUTER_API_KEY`）。如果没有的话，它们就只能输出元数据。

    结果排名如下：图像支持，然后是工具延迟，然后是上下文大小，然后是参数计数。在 TTY 中，检查的结果会提示交互式回退选择。非交互模式需要 `--yes` 接受默认值。

    即使没有 `--set-default`，探测扫描也会取代 `agents.defaults.model.fallbacks`；该标志还设置了主标志。使用 `--no-probe` 无需编写配置即可检查候选者。

  </Accordion>
</AccordionGroup>

## <a id="models-registry-(models.json)"></a><a id="models-registry-models-json"></a> 模型注册表（`models.json`）

当保存的目录包含格式错误的模型 `cost` 块时，OpenClaw 会跳过该模型并记录命名该模型的警告。同一目录中的其他有效模型仍然可用。保存的目录保持不变；更正模型的定价以使其再次可用。其他架构错误和无效模型 API 或令牌限制仍然拒绝受影响的目录，即使在定价格式错误的模型上也是如此。

### <a id="hosted-catalog-updates"></a> 托管目录更新

OpenClaw 可以在不等待新的 OpenClaw 版本发布的情况下，刷新已安装提供商插件所附带的模型元数据。网关会在启动时在后台进行一次 JSON `GET` 请求，然后最多每六小时检查一次。该请求不会发送任何提示词、凭据、模型使用情况或配置负载，只会携带常规的 HTTP 用户代理和条件缓存头。

下载的捆绑包存储在共享的 SQLite 状态数据库中。网关在后台准备新的目录生成，包括每个代理的提供商模型发现，然后一起发布其模型行和价格，而无需重新启动。 Picker在准备过程中读取继续使用当前一代；失败或被取代的准备工作会将其保留在原处。发现失败的提供者将使用新一代的内置行进行发布。承认的回合保留其捕获的模型生成。如果较新的目录取代了代理 RPC 在接受之前的运行时准备，则请求将返回可重试的 `UNAVAILABLE` 响应，而无需开始轮次。重试请求以针对当前运行时做好准备。本机模型查找可以完成已承认的轮次，而无需替换较新的共享目录。嵌套模型调用保留已承认的配置，并且每个使用量估计操作都使用一个定价上下文。

目录读取和刷新写入通过共享状态工作线程运行。如果后台刷新失败，网关会记录错误并继续为其接受的目录提供服务。下一次预定检查将在六个小时后进行。要立即重试下载，请通过其服务所有者停止网关，运行 `openclaw models refresh`，然后再次启动它。

远程数据只能为已安装的插件清单声明的提供者更新或添加模型。它无法提供 API 基本 URL 或请求标头，并且会忽略早于已安装版本的构建标记的目录。托管元数据不会覆盖提供商的帐户发现或模型准入规则。

网关在运行时拥有目录写入。 `openclaw models refresh` 需要独占离线所有权并报告已保存的下载；下一个网关启动时会加载兼容的元数据。返回当前行后，显式网关模型列表刷新会触发采用；它不会等待采用或其他代理的发现。损坏的已保存捆绑包会使已接受的一代继续服务。

托管文件从公共 [`openclaw/catalog`](https://github.com/openclaw/catalog) GitHub 存储库发布。在发布时，它还会为那些拥有插件明确选择使用 [`modelCatalog.modelsDev`](/plugins/manifest/models#modelcatalog-reference) 的提供商提供来自 models.dev 的模型 ID 和元数据。每个映射都会对上游提供者命名一次，而不是映射各个模型。没有中央提供商的后备方案。清单值仍然具有权威性，因此水合仅填充未定义的元数据，并且从不提供运输设置或价格。成本仍然来自每个提供商的定价政策。仅导入具有工具调用和文本输出的行，并跳过标记为已弃用或停用的 models.dev 行。如果 models.dev 本身无法访问或格式错误，则发布失败并且上次发布的工件保持不变。单个缺失或重命名的上游提供者只会跳过该提供者的水合作用；它的清单行仍然发布，因此一个提供商无法阻止其余提供商的目录更新。水合在发布时运行，而不是在网关中运行。下载的元数据遵循上述共享目录生成发布。其预定工作流程每四个小时检查一次 OpenClaw 的默认分支插件清单和公共定价来源。每个目录内容更改都会保留为公共提交。目录 v2 还列出了 [ 精选推荐模型列表 ](/concepts/recommended-models) 中每个提供商的匹配项。提供商拥有的策略选择完整的价格表，包括上下文层，而不混合来自不同来源的费率。声明的本机源读取公共 Cerebras、Chutes、DeepInfra、OpenCode 和 Venice 目录，因此连接的安装可以接收广告的价格更改，而无需发布新的 OpenClaw。当有效的本机 Feed 不再提供模型的价格时，发布会保留模型元数据而不进行估计。仅缺少价格并不会废弃该模型或替代其他来源的费率。显性的用户成本仍然获胜。 DeepInfra 使用其代理投影来获取模型元数据，并使用其本机 `/models/list` 源获取价格（包括数字折扣）。无法表示为无条件代币成本的合格时间表仍然未知。模型仍然可用。请参阅 [DeepInfra 价格估算](/providers/deepinfra#price-estimates)。

对于具有不需要 API 密钥的公共模型列表的提供商（Chutes、DeepInfra、Hugging Face、Kilo Gateway、Novita、NVIDIA、OpenCode Zen、OpenCode Go 和 Venice），出版物也会获取该列表。提供程序不再列出的已发布行被标记为 `deprecated`，因此选择器和推荐模型会删除它，而精确配置的引用仍然解析。 ID 完全匹配，但 Novita 除外，其列表混合了字母大小写，因此只有不区分大小写的未命中才算在内。如果列表无法访问、格式错误或为空，则该提供程序的行将按编写的方式发布。

网关停止后，运行 `openclaw models refresh` 进行即时元数据和定价检查，或使用 `models.catalogRefresh.enabled: false` 禁用每个托管目录请求。禁用后，定价将保持捆绑和明确配置的值。可以使用 HTTPS `models.catalogRefresh.url`（或用于测试的 localhost HTTP）选择自托管镜像。参见[配置参考](/gateway/config-runtime#models)。

`models.providers`下配置的自定义提供程序将写入代理目录下的`models.json`（默认`~/.openclaw/agents/<agentId>/agent/models.json`）。提供者插件目录作为生成的插件拥有的目录分片单独存储并自动加载。默认情况下，此文件与配置合并。将 `models.mode: "replace"` 设置为仅使用您配置的提供程序。

在默认的 `merge` 模式下，配置的模型行与合格的提供程序发现相结合。他们提供元数据并请求覆盖匹配模型；它们不限制发现已保存的 ID。旧的提供程序模型阵列可以保留在您的配置中，而无需隐藏新公布的模型。使用 `agents.defaults.modelPolicy.allow` 或每个代理策略来限制模型选择，并使用 `models.mode: "replace"` 来保留完全静态配置的目录。

生成的插件目录提供模型清单，而不是请求凭据。它们缓存的 API 密钥、身份验证模式和请求标头不会授权模型请求。请改用当前的身份验证配置文件或编写的请求配置。如果没有当前配置快照，会话 SDK 会保留创作的 `models.json` 密钥和标头，同时将生成的元数据合并到创作的行下方。对于当前快照，提供者的当前声明拥有请求设置；仅保留在旧文件中的键和标头不会重新获得权限。

准备好的目录在解析模型之前组成静态、生成、创作文件和当前配置的行。显式模型路由胜过捕获的路由，捕获的路由胜过提供者默认值。在替换模式下，只有当前声明进入目录；清单清单和运行时后备行无法添加其他模型。

`models.providers.*.models` 中的提供程序别名在发现之前解析一次。如果同时配置了别名及其确切目标，则目标行拥有模型字段；省略的字段不会从别名行复制。除了对已退役的 Google 和 Together 模型名称的内置更正之外，`models.json` 和插件发现中的目录 ID 在刷新期间保持原义。

<AccordionGroup>
  <Accordion id="models-json-publication-merge-precedence" title="models.json 发布合并优先级">
    文件发布步骤使用这些规则来匹配提供者 ID。它们不会覆盖准备好的运行时中的当前配置请求权限：

    - A 非空 `baseUrl` 已存在于代理 `models.json` 获胜中。
    - 仅当该提供程序在当前 config/auth-profile 上下文中不是 SecretRef 管理时，A 非空 `models.json` 中的 `apiKey` 才会获胜。
    - SecretRef 管理的 `apiKey` 值从源标记刷新，而不是保留已解析的机密：env 引用的 env 变量名称，file/exec/store 引用的 `secretref-managed`。
    - 由 SecretRef 管理的请求头值也会以相同方式刷新；对于环境变量引用，使用 `secretref-env:ENV_VAR_NAME`。
    - E`models.json` 中的 `apiKey`/`baseUrl` 为空或缺失，则回退到配置 `models.providers`。
    - 配置的模型列表和发现的模型列表以合并模式合并。对于匹配行，显式 `input` 获胜。当源行省略 `input` 时，插件发现可以填充该功能元数据。
    - 其他提供商字段会从配置和规范化目录数据中刷新。

  </Accordion>
</AccordionGroup>

标记持久性是源权威的。 OpenClaw 从活动源配置快照（预解析）写入标记，而不是从解析的运行时秘密值写入标记。每当重新生成 `models.json`（包括 `openclaw agent` 等命令驱动路径）时，它都会执行此操作。

## <a id="related"></a> 相关内容

- [Agent 运行时](/concepts/agent-runtimes) — OpenClaw、Codex 以及其他 agent 循环运行时
- [配置参考](/gateway/config-agents#agent-defaults) — 模型配置键
- [图像生成](/tools/image-generation) — 图像模型配置
- [模型故障转移](/concepts/model-failover) — 回退链
- [模型提供商](/concepts/model-providers) — 提供商路由和认证
- [Models CLI 参考](/cli/models) — 完整命令和标志参考
- [音乐生成](/tools/music-generation) — 音乐模型配置
- [推荐模型](/concepts/recommended-models) — 策划列表规则和发布
- [视频生成](/tools/video-generation) — 视频模型配置。
- [`openclaw infer`](/cli/infer) — 用于提供商支持的模型、媒体和嵌入工作流程的推断优先 CLI
