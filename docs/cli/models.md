---
summary: "CLI `openclaw models` 的参考（status/list/set/scan、别名、后备、共享身份验证、个人帐户）"
read_when:
  - "你想更改默认模型或查看提供方认证状态"
  - "您想要扫描可用的 models/providers 并调试身份验证配置文件"
  - "您想要登录或选择共享网关上的个人模型帐户"
title: "模型"
---

# `openclaw models`

模型发现、扫描和配置（默认模型、回退、认证配置文件）。

相关：

- 提供方 + 模型：[模型](/providers/models)
- 模型选择概念 + `/models` 斜杠命令：[模型](/concepts/models)
- 提供商身份验证设置：[入门](/start/getting-started)

## <a id="common-commands"></a> 常用命令

```bash
openclaw models --json
openclaw models status
openclaw models list
openclaw models refresh
openclaw models set <model-or-alias>
openclaw models set-image <model-or-alias>
openclaw models scan
```

`status`、`list` 和 `auth` 子命令接受 `--agent <id>` 以配置的代理为目标。如果没有它，模型检查在配置时使用 `agents.defaults.systemAgent.agentId`，否则使用唯一配置的代理。配置多个代理时，身份验证突变需要 `--agent <id>`。

对于 `models status`，当省略 `--agent` 时，`OPENCLAW_AGENT_DIR` 会覆盖检查的 auth 目录。匹配配置的 `agentDir` 在凭证刷新期间保留该代理的所有权。显式 `--agent <id>` 优先于环境覆盖。

`set`、`set-image`、`scan`、`refresh`、`aliases` 和 `fallbacks`/`image-fallbacks` `add`、`remove` 和 `clear` 按全局默认值运行并拒绝`--agent`。

`models set`、`models set-image`、`models aliases add`、`models fallbacks add` 和 `models image-fallbacks add` 需要已知的提供程序：已安装的插件声明、准备好的运行时提供程序别名或 `models.providers` 条目。未知提供者以非零值退出而不更改配置。如果插件清单不可用或保留的运行时生成未加载提供程序，则命令保存时会出现警告，因为无法验证提供程序所有权。

`models set`和`models set-image`当本地目录中不存在已知提供商的模型时也会发出警告；新发布的和自托管的模型可能尚未编目。别名和后备添加不会检查目录成员资格。写作`agents.defaults.model`和[`openclaw config set`](/cli/config#values)比`models set`：它拒绝它无法解析的模型引用，而不是发出警告。该检查仅是文本模型；`config set`不验证`agents.defaults.imageModel`根本没有，所以这不是更严格的路径`set-image`环境。`openclaw doctor --json`报告配置的未知提供商；添加`--severity-min info`还可以查看本地目录无法确认的活动模型。

默认模型、别名和后备更改使用当前插件配置解析提供者拥有的模型别名。当存储的条目解析为所选模型时，它们的设置将移动到其完整密钥；该键的现有设置优先。添加别名会替换模型以前的别名。如果在准备过程中配置发生变化，该命令将拒绝写入；针对更新的配置重新运行它。

与已配置的提供者模型匹配的显式 `provider/model` 会保留其字面标识，即使另一个模型具有冲突的别名也是如此。裸别名和非冲突 `provider/alias` 选择仍然可以正常解析。

### <a id="status"></a> 状态

直接运行 `openclaw models` 等同于运行 `openclaw models status`。 `openclaw models --json` 返回与 `openclaw models status --json` 相同的对象。

`openclaw models status`显示已解决的default/fallbacks加上授权概述。活动配置文件冷却时间显示在**不可用的身份验证配置文件**以及存储的原因和恢复操作；JSON输出暴露相同的数据`auth.unusableProfiles`。对于插件拥有的代理运行时，例如Codex， status 还会检查所属插件是否已启用并通过启动负载验证。具有有效凭据但不可用的运行时报告的路由`status: unavailable`而不是`usable`； JSON输出包括单独的`authStatus`， `runtimeStatus`，以及有界运行时诊断。当提供者使用情况快照可用时，OAuth/API-key状态部分包括提供程序使用窗口和配额快照。当前使用窗口提供商：Anthropic， GitHub Copilot， OpenAI， MiniMax， SuperGrok通过xAI OAuth、小米和z.ai.使用验证来自提供者特定的挂钩（如果可用）；否则OpenClaw回退到匹配OAuth/API-key来自身份验证配置文件、env 或 config 的凭据。

在诊断代理的选择时使用显式代理：

```bash
openclaw models list --agent <agentId>
openclaw models status --agent <agentId>
openclaw models status --agent <agentId> --json --check
```

该列表显示模型库存。状态解释了其路由的配置默认值、后备和身份验证。它不会检查聊天会话的模型覆盖；在该会话中使用 [`/model status`](/concepts/models#model-in-chat)。

对于具有 `runtime.type: "acp"` 的代理，状态和身份验证检查会检查本机默认和本机后备策略。代理的 `model.primary` 选择其 ACP harness，并且不是本机检查的候选模型。使用 ACP 会话控件检查或更改外部harness模型。

#### <a id="read-status-correctly"></a> 正确读取状态

这些部分回答不同的问题：

| 输出                                           | 含义                                                                                   |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **授权概述** / `auth.providers`             | 在环境、提供程序配置或身份验证存储中找到的凭证源。              |
| **OAuth/token 状态** / `auth.oauth`            | 存储的配置文件运行状况和到期时间。 JSON 对象还包括 API-key 配置文件。         |
| **模型路线问题** / `auth.modelRouteIssues` | 路线不兼容、缺少路线凭证或无法确认准备情况。 |
| **运行时授权** / `auth.runtimeAuthRoutes`      | 使用单独代理运行时的路由的身份验证和运行时可用性。     |

存储的配置文件或 `static` 运行状况条目并不证明其凭证现在可以使用。例如，存储的 `file` 或 `exec` SecretRef（对机密的引用）可以出现在概览中，而其路由仍为 `indeterminate`。这意味着无法在此命令路径中确认准备情况；这并不意味着提供商拒绝了该凭证。在替换凭据之前检查路由诊断和配置的秘密源。

没有 `--probe` 的状态不是模型调用测试。它仍然可以解析目标配置机密并检查提供商拥有的身份验证状态。仅当您打算发出下述实时请求时才使用 `--probe`。

对于 `--check`，退出代码为：

- `0`：未发现配置的路由身份验证或运行时问题，并且没有选定的凭据即将过期。这并不能证明模型请求会成功。
- `1`：路由缺少或过期的身份验证、不兼容的路由、不可用的运行时或不确定的准备情况。
- `2`：选定的凭证即将过期，且没有需要退出代码 `1` 的条件。

命令失败（例如无法解析所需的配置机密）也会以非零值退出。在JSON模式下，这些可以返回命令错误而不是状态对象；检查进程退出代码以及输出。

非秘密占位符可以显示为 `marker(<value>)`，例如 `secretref-managed` 或环境变量名称。这些标签描述了凭证来源；它们不是已解决的秘密。

选项：

| 标志                      | 作用                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `--json`                  | JSON 输出；auth-profile、provider 和启动诊断会输出到 stderr，这样 stdout 仍可直接通过管道传给 `jq`。 |
| `--plain`                 | 纯文本输出。                                                                                            |
| `--check`                 | 返回上述 auth/runtime 检查退出代码，包括用于不确定准备情况的 `1`。           |
| `--probe`                 | 实时检查配置的身份验证配置文件。真实的请求；可能会消耗代币并触发速率限制。            |
| `--probe-provider <name>` | 仅检查一个提供商。                                                                                      |
| `--probe-profile <id>`    | 检查特定的身份验证配置文件 ID（重复或以逗号分隔）。                                                  |
| `--probe-timeout <ms>`    | 每次检查超时。                                                                                            |
| `--probe-concurrency <n>` | 并发检查。                                                                                            |
| `--probe-max-tokens <n>`  | 每张支票的最大令牌数（尽力而为）。                                                                       |
| `--agent <id>`            | 已配置的 agent id；会覆盖 `OPENCLAW_AGENT_DIR`。                                                          |

`--probe-timeout` 要求为正数； `--probe-concurrency` 和 `--probe-max-tokens` 需要正整数。省略这些选项以使用其默认值（分别为 `8000`、`2` 和 `8`）；明确的空值将被拒绝。

检查行可以来自身份验证配置文件、env 凭据或 `models.json`。检查状态桶：`ok`、`auth`、`rate_limit`、`billing`、`timeout`、`format`、`unknown`、`no_model`。

检查通过 OpenClaw 的提供者传输发出新的、仅提示的请求，而无需创建正常的代理会话。 OAuth 配置文件保留正常的持久凭证刷新所有者。报告的每个凭证延迟测量请求往返，不包括模型和凭证准备；在发送请求之前失败的检查没有延迟。当测试多个凭据时，整体检查可能需要更长的时间。

直接 `models status --probe` 运行需要配置状态目录的独占所有权。在检查之前使用 `openclaw gateway stop` 停止正在运行的网关。临时身份验证目录和状态锁将保持保留状态，直到接受的工作和清理工作完成为止，包括在中断之后。报告清理失败；超时并不证明资源已关闭。

检查 detail/reason 代码，以预期检查何时从未到达模型调用：

- `excluded_by_auth_order`：存在存储的配置文件，但显式 `auth.order.<provider>` 忽略了它，因此检查报告排除而不是尝试它。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：profile 已存在，但不符合条件或无法解析。
- `ineligible_profile`：该 profile 因其他原因与提供方配置不兼容。
- `no_model`：提供者身份验证存在，但 OpenClaw 无法解析可针对该提供者进行测试的模型候选者。

对于 OpenAI ChatGPT/Codex OAuth 故障排除，`openclaw models status`、`openclaw models auth list --provider openai` 和 `openclaw config get agents.defaults.model --json` 是确认代理是否具有可用的 `openai` OAuth 配置文件的最快方法`openai/*` 通过本机 Codex 运行时。请参阅 [OpenAI 提供商设置](/providers/openai/setup#check-and-recover-codex-oauth-routing)。

### <a id="list"></a> 列表

`openclaw models list` 返回已发布的模型库存，无需等待提供程序发现或重写 `models.json`。这也适用于 `--all` 和 `--provider <id>`。网关支持的请求可以在后台更新过期的库存，如下所述。

```bash
openclaw models list --agent <agentId>
openclaw models list --agent <agentId> --provider <providerId> --json
openclaw models list --agent <agentId> --refresh
```

当本地网关正在运行，或者通过配置或环境选择远程网关时，该命令将读取该网关的目录。 `--agent` 在该网关上选择一个代理。提供者过滤、模型可见性和可用性使用网关捕获的配置和身份验证事实。该命令不会解析该请求的本地模型提供者机密。

当提供商保存的库存过期时，库存请求将返回保存的行，同时网关在后台刷新该提供商。内部聊天和会话元数据读取不会安排发现。稍后的库存请求显示新发布的模型。刷新失败会保留已保存的行；使用 `--refresh` 重试。聊天模型菜单、Control UI 和 `models list` 显示目录的刷新警告。 CLI 将警告写入 stderr，保持 JSON 和普通 stdout 机器可读。

成功的 Ollama、LM Studio 和共享 OpenAI- 兼容发现可以标记服务器未列出的已配置模型 ID。 `models list` 警告在该服务器上提取或下载模型，或修复其配置的名称，然后运行 ​​`openclaw models list --refresh`。 `models status` 和医生的 `core/doctor/model-references` 检查读取相同的准备好的网关事实，而无需启动提供商发现。编辑配置的模型引用会根据热重载时保留的列表重新计算这些警告；除非服务器清单发生更改，否则不需要重新启动或目录刷新。他们的警告不会改变模型可用性、配置有效性或选择。未发现的脱机服务器和目录不会产生 Missing-ID 警告。当网关停止时，Doctor 和 status 没有实时库存可供比较；使用 `models list --refresh` 来检查本地刷新。

拒绝目录身份验证的提供程序会与其提供程序一起生成单独的 CLI 诊断信息，并在可用时生成配置文件 ID。打开 Control UI 中的 **Models** 以检查登录和目录访问，然后使用 `--refresh` 重试。目录拒绝本身不会导致通用刷新警告或证明模型请求将失败。即使另一个提供商需要登录，超时和其他发现失败仍然会产生刷新警告。

在每种输出模式下，发现诊断都会进入 stderr。当网关或本地目录发布 JSON 输出时，它们还包括 `providerOutcomes`：每个条目包含 `provider`、可选的 `profileId` 和 `status`（`ready`、`auth-rejected` 或 `unavailable`）。成功的结果还可能包括咨询 `unlistedConfiguredModelIds`，包括没有库存行的参考。这些是目录范围内的结果，独立于模型行过滤器（例如 `--provider` 和 `--local`）。不包括提供者错误主体和凭据。普通标准输出每行保留一个模型键。

选定的网关必须通告 `published-model-catalog`。如果没有，请更新或重新启动并重试。直接报告连接、授权和能力错误；他们不会将命令切换到不同的本地列表。

如果没有正在运行的本地网关或显式网关目标，该命令将识别它正在显示本地缓存的目录。此回退可以准备配置的静态事实并解析其配置的身份验证，但仅在提供 `--refresh` 时才启动模型发现。本地刷新使用配置的托管代理进行提供程序发现，并在发现完成时释放它。缓存列表和网关请求不会启动 CLI 的托管代理。

本地代理运行重用保存的提供程序清单，包括为未配置默认模型的经过身份验证的提供程序发现的模型。对于新上市的模型，请先运行 `openclaw models list --refresh --provider <id>`，然后再运行 `openclaw agent --local --model <id>/<model> --message "Hello"`。如果没有保存库存，现有的提供商发现和静态模型仍然适用；未知模型错误会告诉您刷新提供商的模型列表。

在上市前使用 `--refresh` 获取提供商库存。刷新失败时会发出警告，同时显示可用的已发布行。成功空收购保持空；它不会恢复旧的发现行。如果发布的所有者尚未准备好，请在网关启动或当前刷新完成后重试。

选项：`--all`（完整发布的目录）、`--refresh`（提供商发现）、`--local`（本地端点）、`--provider <id>`、`--agent <id>`、`--json` 和 `--plain`。提供商过滤器读取该提供商的完整已发布库存，因此不需要 `--all`。

注意：

- `Auth` 列使用准备好的凭据和运行时证据。单独的 API 密钥并不能证明本机 CLI 登录。未知的准备情况仍然未知，目录元数据并不能证明模型请求会成功。参见[正确读取状态](/cli/models#read-status-correctly)。
- A 插件声明的本机端点之外的提供程序级别 `models.providers.<id>.baseUrl` 不包括其隐式目录行，包括缓存的发现。将您代理支持的模型添加到`models.providers.<id>.models`；显式创建的行、名称、默认值和别名保持不变。单独的模型级 URL 覆盖不会排除提供程序目录。
- 静态目录行无需身份验证即可保持可见。列出它们并不授予选择受限模型或更改 `modelPolicy.allow` 的权限。
- 在合并模式下，刷新生成的目录会保留手动根模型，包括其提供程序也具有生成的目录的模型。显式替换模式保留其现有的替换行为。
- 对于仅在需要时加载的插件 （`activation.onStartup: false`），缓存目录中符合条件的提供程序需要当前配置文件、环境或提供程序配置身份验证，然后目录才能提供隐式行。仅保留在生成的目录内的凭据不符合资格。显式模型声明仍然可见。
- 当运行时上限与本机上下文窗口不同时，`Ctx` 显示 `contextTokens/contextWindow`。 JSON 在提供时保留 `contextTokens`。
- `Input` 和 `Ctx` 使用选定的物理路由加上显式配置的逻辑覆盖。未解析的路由元数据保持未知状态，而不是借用其他路由的功能。
- 配置的模型 ID 保留外壳。例如，`Reader` 和 `reader` 仍然不同。提供商拥有的别名仍然适用，并且配置的别名保留在表标签和 JSON 输出中。
- `--provider` 采用提供者 ID（例如 `moonshot`），而不是选择器标签（例如 `Moonshot AI`）。
- 未知提供者 ID 失败并返回非零退出并命名被拒绝的提供者。运行 `openclaw models list --all` 以列出模型及其提供商 ID。
- 模型参考在第一个`/`上分开。当模型 ID 包含 `/` 时，请包含提供商前缀，例如 `openrouter/moonshotai/kimi-k2`。

通过 `models list --refresh` 的提供者发现与 `models refresh` 执行的托管元数据下载是分开的，如下所述。有关线控装置，请参阅 [ 网关目录请求 ](/gateway/protocol/operator-methods#models-list-views)。

### <a id="refresh-the-hosted-catalog"></a> 刷新托管目录

`openclaw models refresh [--json]` 检查托管元数据目录。它不会登录提供程序、测试凭据或激活正在运行的网关中下载的行。它拒绝 `--agent`，因为托管目录是全局的。

该命令要求停止本地网关。通过其服务所有者停止它，运行刷新，然后再次启动它。它通过下载和写入结算来获取独占的离线所有权，并且当网关拥有状态目录时拒绝。成功的结果描述了已保存的下载；下一个网关启动时会加载兼容的元数据。正在运行的网关继续执行其自己的计划目录刷新。如果 `models.catalogRefresh.enabled` 为 `false`，则该命令报告刷新已禁用。

请参阅 [ 托管目录更新](/concepts/models#hosted-catalog-updates) 了解更新生命周期。公共变更历史记录位于 [`openclaw/catalog`](https://github.com/openclaw/catalog) 中。

### <a id="set-default-%2F-image-model"></a><a id="set-default-/-image-model"></a> 设置默认/图像模型

```bash
openclaw models set <model-or-alias>
openclaw models set-image <model-or-alias>
```

`set` 会写入 `agents.defaults.model.primary`；`set-image` 会写入 `agents.defaults.imageModel.primary`。两者都接受 `provider/model` 或已配置的别名。`set` 还会在新选择的模型需要时修复 Codex/Copilot 运行时插件安装；`set-image` 不会。两个命令都不接受 `--agent`；它们始终写入 agent 默认值。

如果您在选择模型时省略提供程序，OpenClaw 会尝试配置的别名，然后尝试与该模型 ID 匹配的唯一配置的提供程序，最后是带有弃用警告的配置的默认提供程序。如果该提供程序不再公开配置的默认值，则使用第一个配置的 provider/model。

### <a id="scan"></a> 扫描

`models scan` 会读取 OpenRouter 的公开 `:free` catalog，并对候选项进行排序以供回退使用。catalog 本身是公开的，因此仅元数据扫描不需要 OpenRouter key。

默认情况下，OpenClaw 尝试通过实时模型调用检查工具和图像支持。如果未配置 OpenRouter 密钥，该命令将回退到仅元数据输出，并解释 `:free` 模型仍然需要 `OPENROUTER_API_KEY` 进行检查和推理。

选项：

- `--no-probe`（仅限元数据；无 config/secrets 查找）
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>`（目录请求和每次检查超时）
- `--concurrency <n>`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

数字扫描选项拒绝空值和纯空格值。省略标志以保留其默认行为。

即使没有 `--set-default`，探测扫描也会写入配置。它将用所选模型替换 `agents.defaults.model.fallbacks`，在选择支持图像的模型时替换 `agents.defaults.imageModel.fallbacks`，并将所选模型添加到 `agents.defaults.models`。 `--set-default` 和 `--set-image` 还设置了匹配的初级。 `--json` 仍然在写。使用 `--no-probe` 在不更改配置的情况下检查候选者。

`--set-default` 和 `--set-image` 需要实时检查；仅元数据扫描结果仅供参考，不会应用于配置。

## <a id="aliases"></a> 别名

```bash
openclaw models aliases list [--json] [--plain]
openclaw models aliases add <alias> <model-or-alias>
openclaw models aliases remove <alias>
```

每个模型条目的别名存储为 `agents.defaults.models.<key>.alias`。 `add` 首先将 `<model-or-alias>` 解析为完整的 provider/model 密钥，因此为别名添加别名会重新指向它而不是链接。添加别名不会更改 `agents.defaults.modelPolicy.allow` 或限制模型覆盖。

## <a id="fallbacks"></a> 回退

```bash
openclaw models fallbacks list [--json] [--plain]
openclaw models fallbacks add <model-or-alias>
openclaw models fallbacks remove <model-or-alias>
openclaw models fallbacks clear
```

管理 `agents.defaults.model.fallbacks`。`openclaw models image-fallbacks list|add|remove|clear` 以相同的子命令形式管理并行的 `agents.defaults.imageModel.fallbacks` 列表。

## <a id="personal-model-accounts"></a> 个人模特账户

对于所选网关上您的登录者拥有的帐户，请使用 `models accounts`。 CLI 和 **设置 → 配置文件 → 连接帐户** 使用相同的网关帐户存储，包括共享服务器时。

| 范围          | 命令                                            | 凭证所属的地方                                        |
| -------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| 个人的       | `models accounts login [provider]`                 | 您在所选网关（可能是远程）上经过验证的配置文件。 |
| 系统/代理 | `models auth login --provider <id> [--agent <id>]` | 在运行命令的机器上安装 OpenClaw。       |

要为远程服务器配置 system/agent 凭证，请在该服务器上运行 `models auth` 及其 OpenClaw state/config. 在笔记本电脑上配置远程网关 URL 不会使 `models auth` 写入服务器。

```bash
openclaw models accounts list
openclaw models accounts login
openclaw models accounts login anthropic --method api-key
openclaw models accounts login openai --method device-code
openclaw models accounts login xai --method api-key
openclaw models accounts use <account-id>
openclaw models accounts clear-default <provider>
```

每个帐户命令都会在访问帐户或要求提供提供商凭据之前显示 **Gateway**、**Person** 和 **Scope： Personal**。此上下文转到 stderr，因此 `--json` 输出保持可通过管道传送。该人是网关保存的、经过验证的配置文件，而不是您的操作系统用户名或未保存的显示名称编辑。

网关访问和提供商登录是分开的。帐户所有权遵循网关在此连接上分配的配置文件。单用户 Control UI 连接可以使用持久 **Owner** 配置文件，但短期 CLI 连接不会自动分配该配置文件。因此，即使本地 Control UI 已经显示 **Owner**，个人账户 CLI 也需要一个身份承载端点。

对于共享服务器上的单独人员，请使用其承载身份的 WebSocket 端点，例如 [Tailscale Serve](/gateway/tailscale#tailscale-identity-headers-serve-only) 或 [ 受信任代理 ](/gateway/trusted-proxy-auth)。如果需要，请单独批准设备配对：配对授予设备访问权限，而不是特定人员的身份。提供共享网关 token/password 凭据优先于 Tailscale 身份验证。浏览器登录不会将其身份传输到 CLI。对于身份感知边缘，请遵循 [ 远程边缘身份验证](/gateway/remote#gateway-behind-an-identity-aware-proxy)。

如果未识别出任何人，该命令将在提供商登录之前停止，并解释如何使用身份承载端点。它不会推断所有权或更改网关身份验证。这些命令不接受 `--agent` 或所有者 ID，并且它们不会修改本地共享身份验证存储或模型配置。顶层`openclaw connect`命令注册一个节点；这不是个人帐户登录。

`list` 需要 `operator.read` 并返回最多 50 个已保存帐户的一页：id、提供商、友好标签、身份验证类型以及每个帐户是否是新会话默认值。它永远不会返回凭据。使用 `--json` 进行结构化输出，使用 `list --cursor <nextCursor>` 进行下一页。

`login`、`use` 和 `clear-default` 需要 `operator.write`。 `login`需要交互终端，并提供与**在Control UI中添加帐户**相同的提供商和登录方法。省略提供者从网关的目录中进行选择；使用`--method <id>`直接选择方法。该目录仅包含由其提供商插件为个人帐户启用的方法，而不是每个 system/agent 设置方法。

Anthropic 使用 API 密钥进行个人设置，而不是 Claude 订阅令牌。 OpenAI提供API密钥、浏览器登录和设备代码方法； Grok （`xai`） 提供 API 密钥和设备登录。按照所选网关显示的步骤进行操作。凭证和授权代码进入受保护的输入，绝不是命令参数或聊天。在浏览器登录期间，即使重定向提示打开，CLI 也会不断检查是否完成。

保持命令运行，直到报告最终结果。 Ctrl-C 取消确切的登录尝试并等待网关的确认；关闭的连接必须开始新的尝试。保存帐户本身并不能证明模型请求会成功。

`use` 为新会话选择已保存的帐户，无需再次登录。 `clear-default` 仅删除该提供商的个人默认设置：它保留保存的凭据和现有会话选择。这两种操作都不会撤销提供者的访问权限。有关协作者、分叉和故障转移行为，请参阅 [ 每人模型帐户](/concepts/multi-user#per-person-model-accounts)。

所有帐户子命令接受 `--url <url>`、`--port <port>`、`--token-file <path>`、`--password-file <path>`、`--timeout <ms>`（默认 `30000`）和 `--json`。 token/password 文件验证 **Gateway**，而不是提供商，并且不会为此 CLI 建立个人身份。显式 `--url` 可以使用身份承载端点，而无需提供共享令牌。它不会向覆盖发送环境或配置的共享凭据；配置的边缘凭据仍绑定到其自己的端点。标志可以位于 leaf 命令之前或之后：

```bash
openclaw models accounts --timeout 45000 list --json
openclaw models accounts list --timeout 45000 --json
```

## <a id="auth-profiles"></a> 认证配置文件

这些命令管理 **System / agent** 凭证，而不是个人网关帐户。在提供商登录之前，`models auth login` 显示所选代理，并且它正在运行 OpenClaw 的计算机上运行。

`models auth paste-api-key --provider <id>` 可以在本地网关运行时保存密钥。 CLI 将密钥发送到该状态所有者的经过身份验证的网关；网关保存凭证并刷新其模型目录，而无需重新启动。输入仍然来自受保护的终端提示符或标准输入。 `--agent` 选择与离线使用时相同的代理。网关 API 不支持显式 `--profile-id`：忽略它以使用网关的 API-key 配置文件，或停止网关并离线运行命令。

替换已保存的API在此或输入**设置 → 模型 → 设置API钥匙**清除该配置文件之前的冷却时间和失败计数器，因此下一个请求可以立即尝试替换。其他配置文件和使用历史记录均被保留。

如果正在运行的网关不通告所有者绑定的 API-key 写入，请更新并重新启动它，或者停止它并离线重试。 CLI 不会将密钥发送到缺乏此支持的旧网关。

`models auth login` 和 `models auth login-github-copilot` 还委托给拥有所选状态目录的本地网关。 CLI 在您的终端中呈现网关的向导，包括浏览器 URL、设备代码、受保护的输入和模型访问选择。 `--provider`、`--method`、`--device-code` 和 `--agent` 选择声明的仅凭证插件流。省略提供者或方法以从可用流中进行选择。不可用或不明确的插件方法不会默默地替换为不同的登录名。该菜单读取选定的本地配置，包括 `plugins.load.paths`，并支持插件禁用和白名单。

对于这些在线登录，`--profile-id`、`--force`、`--set-default` 和 Copilot `--yes` 在开始登录之前会被拒绝，因为网关登录 API 不代表这些选项。停止网关以离线使用这些选项。当前默认模型保持不变。需要本地 CLI 导入或未声明为仅凭凭据登录的插件方法保持离线状态。

该向导停留在一个经过身份验证的连接上。 Ctrl-C 取消该会话；断开连接会关闭它，而不是在另一个连接上重播登录。 OAuth 环回回调在网关主机上运行，​​该主机与本地 CLI 是同一台计算机。在完成浏览器登录时保持命令运行。不支持所有者绑定登录的旧版网关不会收到登录请求：更新并重新启动它，或者停止它并离线重试。

其他 `models auth` 命令需要所选本地状态的独占离线所有权。通过其服务所有者停止网关，等待其释放所有权，然后运行命令。这包括 `paste-token`（其凭证类型和过期时间不能由 API-key RPC 表示），以及 `list` 和 `order get`（其加载程序可以初始化持久状态）。所有权将一直保留，直到命令的数据库工作和清理完成为止。

CLI 永远不会围绕实时所有者进行写入，也不会在本地重试失败的网关写入。如果网关身份验证失败，请在 CLI 环境中通过 `OPENCLAW_GATEWAY_TOKEN` 提供其共享令牌或通过 `OPENCLAW_GATEWAY_PASSWORD` 提供其密码，然后重试。当网关仅在启动时收到其秘密时，这也适用。设备配对不能替代此路径上的共享网关身份验证。如果写入结果未知，请在重试之前检查模型页面。

使用 `gateway.auth.mode: "none"` 显式配置的环回网关也支持这些委托身份验证命令，无需令牌或设备标识。 CLI 仍然使用已发现的本地状态所有者；这不会启用远程或任意 URL 身份验证绕过。

网关的 **Models** 页面提供相同的受支持在线登录流程。 CLI-仅设置选项、本地提供商 CLI 导入和部分配置文件顺序覆盖仍保持离线操作。个人 `models accounts` 命令继续使用选定的网关。

```bash
openclaw models auth add
openclaw models auth list [--provider <id>] [--json]
openclaw models auth login --provider <id> [--agent <agentId>]
openclaw models auth login --provider openai --profile-id openai:work
openclaw models auth login-github-copilot
openclaw models auth activate <profileId> [--agent <id>]
openclaw models auth logout <profileId> [--yes]
openclaw models auth paste-api-key --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token --provider <id>
openclaw models auth order get --provider <id>
openclaw models auth order set --provider <id> <profileIds...>
openclaw models auth order clear --provider <id>
```

`models auth add` 是交互式认证助手。根据你选择的 provider，它可以启动 provider 的认证流程（OAuth/API key），也可以引导你手动粘贴 token。

`models auth list` 列出了所选代理的已保存身份验证配置文件，无需打印令牌、API-key 或 OAuth 秘密材料。主动冷却和禁用条目包括其原因和恢复操作。有效订阅阻止包括其原因、来源、到期时间以及是否适用于整个配置文件或一种模型；过期的块被忽略。旧版 Gemini CLI OAuth 冷却时间会将您引导至受支持的 Google AI Studio API- 密钥设置，而不是提供不可用的 Gemini CLI 登录流程。使用 `--provider <id>` 筛选到一个提供程序，例如 `openai` 和 `--json` 进行脚本编写。

`models auth login` 会运行 provider 插件的认证流程（OAuth/API key）。使用 `openclaw plugins list` 查看已安装哪些 provider。`login` 支持 `--profile-id <id>`，适用于在登录期间支持命名配置文件的 provider（可用来将同一 provider 的多个登录分开保存），`--method <id>` 用于选择特定认证方法，`--device-code` 作为 `--method device-code` 的快捷方式，`--set-default` 用于应用 provider 推荐的默认模型，`--force` 用于先移除该 provider 现有的配置文件（当缓存的 OAuth 配置文件卡住，或你想切换账号时使用）。

保存凭据后，现有模型限制可能会提示 **显示所有 &lt;Provider&gt; 模型** 或 **保留当前限制**。只有第一个选择会将该提供商的通配符添加到当前限制中。无论哪种方式，凭证都会得到保存。 CLI、私人聊天登录和 Control UI 使用相同的选择。当提供商已不受限制时，不会出现任何提示。如果登录期间限制发生变化，OpenClaw 会保留较新的设置并要求您再次选择模型访问权限。

CLI 报告保存的模型访问与已确认的网关应用程序分开。离线更改将在网关下次启动时生效。

如果没有 `--set-default`，登录将保留当前默认值，包括未设置的默认值，并保留登录运行时所做的不相关配置编辑。如果保存凭据但无法应用提供程序设置，则错误会单独报告已保存的凭据。网关刷新警告不会撤消已保存的更改；离线操作完成后启动网关。

对于共享主代理，`--force` 清除提供者的共享凭证和主代理本地覆盖，包括它们的顺序和运行状况。对于另一个代理，它仅清除该代理的本地配置文件，使共享凭据保持不变。繁忙的身份验证存储会在登录开始之前停止命令；使用相同状态目录关闭其他 OpenClaw 命令并重试。 SQLite 锁诊断可以命名共享状态数据库或代理数据库，因此仅检查旧版身份验证文件中的打开句柄并不能排除争用。

`models auth activate <profileId>` 测试保存的登录并为所选代理选择其经过验证的模型和帐户。使用无人值守更换设置后打印的确切命令，或使用 `models auth list --json` 查找保存的 ID。该命令确认激活，无需其他提示；失败的测试会使当前连接保持不变。

`models auth logout <profileId>` 从选定的代理身份验证存储中删除一个已保存的身份验证配置文件。使用 `models auth list` 显示的配置文件 ID。它还从 `auth.profiles` 和配置中的每个 `auth.order` 列表中删除该配置文件，因此不会留下过时的引用，并且它会删除否则会被清空的 `auth.order.<provider>` 条目（编写的空订单意味着“不选择配置文件”并将禁用提供程序）。 TTY 上提示确认；通过 `--yes` 获取脚本和代理。在删除凭证之前，会清除提供者密钥引用。模型默认值和连接设置保持不变。当配置文件不在商店中时，注销会被拒绝。

注销还会从生成的插件模型目录缓存中删除所选凭证的副本，包括保留的迁移副本，同时保留模型清单和其他帐户。无法使用的生成缓存行将被丢弃，而不是保留未知的秘密。清理会一起检查候选存储，并仅写入需要删除凭据或丢弃不可用行的目录。已进行的目录刷新会在发布前重新检查已保存的凭据。医生目录凭证恢复未更改。当选定的配置文件仍保存时，此清理将适用；它无法从已被旧版本删除的配置文件中识别缓存的凭据。

如果最终目录清理失败，注销会恢复保存的凭据及其配置引用，以便您可以使用相同的配置文件 ID 重新运行相同的命令。错误报告恢复是否完成；并发身份验证更改可能会阻止完全恢复，并且需要在重试之前检查当前配置文件。

`models auth login-github-copilot` 是 `models auth login --provider github-copilot --method device`（GitHub device flow）的快捷方式；它接受 `--yes`，可在不提示的情况下覆盖现有配置文件。

使用 `openclaw models auth --agent <id> <subcommand>` 或 `openclaw models auth <subcommand> --agent <id>` 来定位特定的已配置代理存储。 `add`、`list`、`login`、`activate`、`logout`、`paste-api-key`、`setup-token`、`paste-token`、`login-github-copilot` 和`order get`/`set`/`clear`.

对于OpenAI模型，`--provider openai`默认使用ChatGPT/Codex账户登录。仅当您想要添加 OpenAI API-key 配置文件时才使用 `--method api-key`，通常作为 Codex 订阅限制的备份。运行 `openclaw doctor --fix` 将旧版 OpenAI Codex 前缀 auth/profile 状态迁移到 `openai`。

请参阅 [OpenAI 身份验证](/providers/openai/authentication) 来比较 Codex、OAuth、设备代码、API 密钥以及使用 ChatGPT（测试版）（`--method siwc`） 登录，包括模型访问、托管插件以及共享与个人设置。

示例：

```bash
openclaw models auth login --provider openai --set-default
openclaw models auth login --provider openai --method api-key
openclaw models auth paste-api-key --provider openai
openclaw models auth list --provider openai
openclaw models auth logout openai:manual --yes
```

注意：

- `paste-api-key` 接受在其他地方生成的 API 密钥，提示输入密钥值，并使用与模型页面相同的凭证编写器。它更新配置的配置文件或活动的保存密钥，或者在两者都不存在时创建 `<provider>:manual`。使用 `--profile-id` 更新命名配置文件或添加备份，而无需更改活动提供程序连接。配置的提供程序存储配置文件引用，而密钥材料保留在身份验证存储中。保存的更改会报告任何网关刷新失败以及恢复步骤。在自动化中，通过管道传输标准输入上的密钥，例如 `printf "%s\n" "$OPENAI_API_KEY" | openclaw models auth paste-api-key --provider openai`。
- `setup-token` 和 `paste-token` 仍然是适用于暴露 token 认证方法的 provider 的通用 token 命令。
- `setup-token` 需要交互式 TTY，并运行 provider 的 token-auth 方法（默认使用该 provider 暴露的 `setup-token` 方法）。
- `paste-token` 需要 `--provider`，默认会提示输入 token 值，并将其写入默认配置文件 id `<provider>:manual`，除非你传入 `--profile-id`。在自动化场景中，请通过 stdin 管道传入 token，而不要将其作为参数传递，这样 provider 凭据就不会出现在 shell 历史或进程列表中。
- `paste-token --expires-in <duration>` 会将相对时长（例如 `365d` 或 `12h`）保存为绝对 token 过期时间。
- 对于 `openai`、OpenAI API 密钥和 ChatGPT/OAuth 令牌材料是不同的身份验证形状。将 `paste-api-key` 用于 `sk-...` OpenAI API 密钥，将 `paste-token` 仅用于令牌身份验证材料。
- Anthropic：`setup-token`/`paste-token` 是适用于 `anthropic` 的 OpenClaw 认证路径，但在主机上如果可用，OpenClaw 更倾向于复用 Claude CLI（`claude -p`）。
- `auth order get/set/clear` 管理 SQLite 身份验证存储中一个提供商的每代理身份验证配置文件顺序覆盖，与 `auth.order.<provider>` 配置密钥分开。 `set` 按优先级顺序获取一个或多个配置文件 ID。存储的顺序优先于配置文件选择和 CLI 运行时路由的配置； `clear` 回退到 config/round-robin 排序。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
- [`openclaw promos`](/cli/promos) — 列出并领取促销模型优惠
