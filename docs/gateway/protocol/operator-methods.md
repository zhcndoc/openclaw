---
summary: "操作员帮助方法、执行批准和代理交付回退"
read_when:
  - "在网关顶部构建操作员界面"
  - "解决客户的执行批准问题"
  - "请求代理运行外向交货"
title: "网关协议操作方法"
sidebarTitle: "操作方法"
doc-schema-version: 1
---

操作员客户端代表人员调用的方法：帮助程序读取、执行批准决议以及代理运行的交付行为。

## <a id="operator-helper-methods"></a> Operator 辅助方法

- `commands.list`（`operator.read`）获取某个 agent 的运行时命令清单。
  - `agentId` 可选；省略后读取默认 agent 工作区。
  - `scope` 控制主 `name` 所指向的界面：`text` 返回不带前导 `/` 的主文本命令令牌；`native` 和默认的 `both` 路径在可用时返回 provider 感知的原生命令名称。
  - `textAliases` 携带准确的斜杠别名，例如 `/model` 和 `/m`。
  - `nativeName` 携带 provider 感知的原生命令名称（如果存在）。
  - `provider` 可选，仅影响原生命名以及原生插件命令的可用性。
  - `includeArgs=false` 会从响应中省略序列化的参数元数据。
- `tools.catalog`（`operator.read`）获取某个 agent 的运行时工具目录。响应包括分组工具和来源元数据：
  - `source`：`core` 或 `plugin`
  - `pluginId`：当 `source="plugin"` 时的插件所有者
  - `optional`：插件工具是否为可选工具
- `tools.effective` （`operator.read`） 获取会话的预期工具预览。
  - 必须提供 `sessionKey`。
  - 网关在服务端从会话中派生可信的运行时上下文，而不是接受调用方提供的身份验证或传递上下文。
  - 响应是来自已保存设置的会话范围服务器派生的投影，包括核心、插件、通道和已发现的 MCP 服务器工具。它不是活动运行的确切工具清单：运行权限、凭据、发现和最终运行策略可以更改提供的工具。不参与此预览并不表明该工具已被禁用，并且包含该工具并不能保证执行访问。
  - 投影可以在刷新时使用缓存的库存。未保存的 UI 编辑不是输入，并且保存的或运行时的更改可能不会立即显示。
  - A 保存的 `toolOverrides.webSearch=false` 不包括核心 `web_search`。更改此覆盖会选择匹配的预览，而不是重用其他状态的缓存库存。
  - 对 MCP 而言，`tools.effective` 是只读的：它可以通过最终工具策略投影温会话 MCP 目录，但不会创建 MCP 运行时、连接传输层或发出 `tools/list`。如果不存在匹配的温目录，响应可能会包含诸如 `mcp-not-yet-connected`、`mcp-not-yet-listed` 或 `mcp-stale-catalog` 之类的通知。
  - 有效工具条目使用 `source="core"`、`source="plugin"`、`source="channel"` 或 `source="mcp"`。
- `tools.invoke`（`operator.write`）通过与 `/tools/invoke` 相同的网关策略路径调用一个可用工具。
  - 必须提供 `name`。`args`、`sessionKey`、`agentId`、`confirm` 和 `idempotencyKey` 可选。
  - 如果同时提供了 `sessionKey` 和 `agentId`，解析出的会话 agent 必须与 `agentId` 匹配。
  - Owner-only 核心包装器（例如 `cron`、`gateway` 和 `nodes`）需要 owner/admin 标识 （`operator.admin`），即使 `tools.invoke` 本身是 `operator.write`。
  - 响应是一个面向 SDK- 的信封，其中包含 `ok`、`toolName`、可选的 `output` 和键入的 `error` 字段。批准或策略拒绝会在有效负载中返回 `ok:false`，而不是绕过网关工具策略管道。
- `skills.status`（`operator.read`）获取某个 agent 可见的技能清单。
  - `agentId` 可选；省略后读取默认 agent 工作区。
  - 响应包括资格、缺失要求、配置检查以及经过清理的安装选项，不会暴露原始机密值。
- `skills.search` 和 `skills.detail` （`operator.read`） 返回 ClawHub 发现元数据。 `skills.detail({ slug, version? })` 从搜索中接受符合发布商资格的 `installRef`，并读取该版本的卡片和扫描摘要。请参阅 [ 技能注册表详细信息 ](/gateway/protocol/operator-methods#skill-registry-details)。
- `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit`（`operator.admin`）会在安装私有技能归档之前暂存它。这是面向受信任客户端的独立管理员上传路径，不是常规的 ClawHub 技能安装流程；除非启用 `skills.install.allowUploadedArchives`，否则默认禁用。
  - `skills.upload.begin({ kind: "skill-archive", slug, sizeBytes, sha256?, force?, idempotencyKey? })` 创建一个绑定到该 slug 和 force 值的上传。
  - `skills.upload.chunk({ uploadId, offset, dataBase64 })` 在准确的解码偏移处追加字节。
  - `skills.upload.commit({ uploadId, sha256? })` 验证最终大小和 SHA-256。提交只会完成上传，不会安装技能。
  - 上传的技能归档是包含根目录 `SKILL.md` 的 zip 归档。归档的内部目录名称不会选择安装目标。
- `skills.install`（`operator.admin`）有三种模式：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 将技能文件夹安装到默认 agent 工作区的 `skills/` 目录中。
  - 上传模式：`{ source: "upload", uploadId, slug, force?, sha256?, timeoutMs? }` 将已提交的上传内容安装到默认 agent 工作区的 `skills/<slug>` 目录中。slug 和 force 值必须与原始的 `skills.upload.begin` 请求匹配。除非启用 `skills.install.allowUploadedArchives`，否则会被拒绝；此设置不影响 ClawHub 安装。
  - 网关安装器模式：`{ name, installId, timeoutMs? }` 在网关主机上运行声明的 `metadata.openclaw.install` 操作。旧版客户端可能仍会发送 `dangerouslyForceUnsafeInstall`；此字段已弃用，仅为协议兼容而接受，并会被忽略。请使用 `security.installPolicy` 处理由 Operator 所有的安装决策。
- `skills.update`（`operator.admin`）有两种模式：
  - ClawHub 模式会更新默认代理工作区中安装的一个跟踪的 slug 或所有跟踪的 ClawHub。替换技能目录（其安装的文件不再与记录的安装摘要匹配）的更新将被拒绝； `details.results` 中的每项技能失败带有 `code: "force_required"`。无论如何，使用可选的 `force: true` 参数重试以替换此类技能。
  - 配置模式修改 `skills.entries.<skillKey>` 值，例如 `enabled`、`apiKey` 和 `env`。

### <a id="models.list-views"></a><a id="models-list-views"></a> `models.list` 视图

`models.list` 接受可选的 `view` 参数 （`src/agents/model-catalog-visibility.ts`）：

- 省略或使用 `"default"`：如果配置了 `agents.defaults.modelPolicy.allow`，响应就是允许的目录，其中包括针对 `provider/*` 条目的动态发现模型。否则，响应就是完整的网关目录。
- `"configured"`：一个紧凑的目录，还保留当前模型控件的配置默认值和回退。这些元数据行不一定允许手动选择。与 `provider/*` 匹配的已发布行仍包含在内。如果没有允许列表，已配置和经过身份验证的行仍然可见。
- `"provider-config"`：由来源编写的 `models.providers.*.models` 清单，独立于选择器允许列表。行中包括公开的模型能力和路由感知的可用性，但省略 provider 端点、身份验证材料以及运行时请求配置。
- `"all"`：完整网关目录，绕过`agents.defaults.modelPolicy.allow`。用于 diagnostics/discovery UI，而不是普通模型选择器。

在 `"provider-config"` 视图之外，[ 推荐模型为其提供者列出 ](/concepts/recommended-models) 名称的行带有 `recommended: true`。每个提供程序的推荐行按列表顺序排列在其他行之前，在会话选定的模型之后。选择器可以折叠“所有模型”控件后面的剩余行。

在连接 `caps` 中通告 `model-selection-policy` 的客户端会在每个 `models.list` 行上收到 `manualSelectionAllowed`。同样的事实也出现在其最初的 `models.snapshot` 中。仅在导出手动选择时使用 `false` 过滤行；保留当前模型功能和准备情况的完整目录。范围内配置的读取还保留当前会话模型的已知元数据，而不更改其选择或授予权限。

该事实与 `available` 无关，并且不授权会话写入。当选择模型时，服务器会再次检查当前策略。无盖连接保留了之前的行形状。通用客户端库不选择加入：转发有能力的连接的代理必须支持其协商的行形状，或者为较旧的封闭模式使用者使用无上限上下文。

普通请求读取已发布的目录，而不启动提供程序发现。视图选择行；他们不决定是否运行发现。如果所有者尚未发布，请求会报告模型目录尚未准备好。其所有者在投影期间变得过时的结果将被拒绝，并显示为 `UNAVAILABLE`、`retryable: true` 和 `retryAfterMs: 0`。 Control UI 在目录消费者之间共享一次重试，保留取消和任何明确的请求截止日期。

- 自动客户端仍然支持 `preparedOnly: true`。无论有或没有此标志，普通读取都是被动的。
- `refresh: true` 在读取新发布的一代之前请求提供者获取。并发刷新共享所有者构建。失败的采集保留兼容行并报告其 `providerOutcomes`；成功的空收购仍然是空的。
- `provider: "<id>"` 通过捕获的提供者别名过滤发布的结果。未知提供商 ID 返回 `INVALID_REQUEST` 以及被拒绝的 ID。忽略过滤器或运行 `openclaw models list --all` 以列出模型及其提供商 ID。
- `includeDetails: true` 包括可用的输入模式、有效的 `contextTokens` 和 `local` 端点分类。它不会公开端点 URL、标头、凭据、成本或运行时请求参数。

对于对话选择器，传递 `sessionKey` 来读取会话的已保存代理和已保存帐户选择。冲突的 `agentId` 被拒绝。查看者的当前帐户默认值不会替换已保存会话的选择。对于新草稿，`authProfileId` 预览由具有 `operator.read` 访问权限的已识别调用者拥有的保留帐户。它不保存帐户默认值。 `sessionKey` 和 `authProfileId` 是互斥的。

已保存的会话元数据和草稿预览在不相关的会话创建和写入中保持最新状态。在发布之前，网关会重新检查所选会话的身份和保存的元数据、运行时配置和当前访问权限。重新创建具有相同会话事实的行不会使读取无效。当元数据输入和访问事实保持不变时，`chat.metadata` 还允许对所选行进行标题、活动和普通首选项更新。帐户、模型、运行时、生命周期和访问权限更改仍然会使正在进行的元数据读取无效。

会话和已识别帐户结果包括 `accountSelection` 显示模型事实。协作者不会收到其他人的私人帐户定位器。 `provider-config` 视图保留共享创作库存并忽略帐户选择。 `refreshFailed: true` 报告采集失败，但兼容行仍然可用；恢复清除它。成功的空目录仍为空。

网关为此合约通告 `session-scoped-model-catalog`。 `chat.metadata` 仍可供旧客户端使用。直接读取模型的客户端可以通过`includeModels: false`跳过重复的目录、帐户选择和运行时选择投影。命令和集群可用性仍然可用。紧凑响应包括不透明的 `revision`；在稍后的紧凑读取中将其作为 `ifRevision` 传递以接收 `unchanged: true` 而不是另一个命令列表。该修订版描述了准备好的命令和集群事实。捆绑的 Control UI 无需会话或帐户选择即可读取这些代理范围的事实，并在整个会话活动中保留它们。会话范围的模型结果和完整会话行可以携带 `sessionModelRevision`，这是用于保存的模型、帐户、运行时和生命周期输入的不透明令牌。当该令牌匹配时，UI 会保留其目录；缺少令牌和显式 `catalogChanged` 通知保留权威读取。共享目录、身份验证、配置和连接更改独立失效。 Harness 拥有的模型锁定会话会忽略此标记，因为它们的本机所有者可以独立于保存的行替换私有模型绑定。也支持旧版网关的本机客户端保留默认请求形状。打开对话选择器会执行被动读取，无需模型缓存计时器或隐式提供程序刷新。元数据刷新发布模型所有者事实，而无需准备每个代理的命令和模型投影。请求根据需要准备其代理的元数据；慢速代理不会延迟其他代理。保留的命令和投影是有限的，并且不保留已完成的请求的会话文档。即使共享其模型目录，也会为当前会话预测帐户选择。未更改清单和身份验证元数据的提供程序续订可保留缓存的元数据，而无需广播 `chat.metadata.changed`。仅发现进展并不会使元数据失效；目录更改和 `refreshFailed` 转换仍然有效。发现进度会废弃共享的 RPC 响应字节，而无需重建元数据或发送另一个客户端广播。共享模型或帐户替换仍然会限制这些读取，并且历史记录仅使用已经准备好的目录，而无需启动或等待准备。模型设置页面使用 `preparedOnly: true` 进行初始加载，然后在首次为当前核心数据快照打开主模型、实用程序或后备模型选取器时请求 `refresh: true`。等待打开共享该页面的请求；完成后重新打开，读取当前发布的目录，而无需再次获取提供者。显式 **Retry** 请求新的获取。替换核心设置数据、页面、代理或网关会重置此请求状态。配置更改后核心数据会重新加载，因此下一个打开的选择器可以从新配置的提供程序中发现模型。当刷新失败时，可用的选择仍然可用。取代了之前的五分钟自动刷新策略；仅经过时间不会使重新打开的设置选择器刷新。网关共享并发提供商收购。

`preparedOnly: true` 和 `refresh: true` 保持互斥。

WebSocket 调度程序在合格的人员连接之间共享相同的 `cron.list`、`cron.status`、`sessions.list`、`models.list` 和 `chat.metadata` 响应。每个请求仍然检查自己当前的权限。共享密钥将用户和配置文件身份、范围、客户端功能和请求参数（包括代理、会话和帐户选择）分开。显式模型刷新、合成调用者和会话可见性受限的 cron 读取不会共享。会话、cron 和模型元数据广播会在客户端重新获取之前取消相关响应。配置、访问和会话行修订也可以避免重用。这些方法目前使用一秒绝对上限；这限制了不发布广播的个人模型元数据更改。这不会添加客户端轮询或提供程序刷新。会话目录和工作板读取不使用此响应共享所有者。

正在运行的 cron 所有者保留不可变的作业读取视图和聚合状态，直到提交的修订、加载的存储替换或调度程序突变更改它们。每个列表请求仍然应用其当前的可见性过滤器。交付预览保留其会话和配置依赖性；单独的 cron 修订并不能使它们可重用。被动 cron 读取器保留其存储刷新行为。

网关将这些已发布的读取和详细信息控件通告为 `published-model-catalog`。需要此合同的客户必须在发送新字段之前检查能力；较旧的网关需要更新或重新启动，而不是静默本地回退。模型 CLI 对 `models list` 和 `models list --refresh` 使用此合同。

## <a id="skill-registry-details"></a> 技能注册表详细信息

请求详细信息时，请使用 `skills.search` 中的确切 `installRef`。例如：

```json
{ "slug": "@example-publisher/example-skill", "version": "1.2.0" }
```

省略 `version` 将选择最新发布的版本。响应保留`skill`、`latestVersion`、`metadata`和`owner`，并添加`registry`、`source`、`installRef`和`selectedRelease`。 `latestVersion` 和 `metadata` 始终描述列表的最新版本； `selectedRelease`、`card` 和 `security` 描述了请求的版本。发行商和版本不匹配永远不会替代其他技能或版本。

当 `status` 为 `available` 时，`card` 包含完整的卡片文本。否则它有 `status: "unavailable"` 和 `reason`。 `security` 报告 `scanStatus`、`hasWarnings`、`hasScanResult` 以及任何扫描时间、摘要或 VirusTotal URL。丢失的扫描显然不可用。可选的释放或卡故障使基本列表元数据可读并显示在受影响的部分或 `warnings` 中。

`requirements` 报告最新版本的注册表设置项、操作系统和系统（如果可用）。其 `scope: "registry-setup"` 和 `note` 解释说设置密钥结合了环境和配置要求，不包括二进制要求。旧版本的结构化要求不可用，因为 ClawHub 仅发布最新的这些事实。这些是注册声明，而不是对当地代理资格的检查；使用 `skills.status` 进行本地要求和配置检查。

`downloadability` 与卡可用性、列表可见性和扫描结果无关。缺失或删除的版本为 `unavailable`；其他技能版本是 `unknown`，因为 ClawHub 未发布确切版本工件可用性断言。这两种状态都有一个原因。安装仍然执行自己的解析、完整性和策略检查。

外部 `skills-sh:` 参考仍然仅供安装。 `skills.detail` 拒绝它们，而不是返回具有相同 slug 的本机注册表技能。

## <a id="exec-approvals"></a> Exec 批准

- 当 Exec 请求需要审批时，网关会广播 `exec.approval.requested`。
- Operator 客户端通过调用 `exec.approval.resolve`（需要 `operator.approvals`）来完成处理。
- 对于`host=node`，`exec.approval.request`必须包括`systemRunPlan`（准备好的`argv`/`cwd`/`rawCommand`/session元数据）。缺少 `systemRunPlan` 的请求将被拒绝。
- 批准后，转发`node.invoke system.run`调用重用，存储`systemRunPlan`作为权威command/cwd/session上下文。
- 如果调用者在准备和最终批准的 `system.run` 转发之间对 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey` 进行变异，则网关将拒绝运行，而不是信任变异的有效负载。

## <a id="agent-delivery-fallback"></a> Agent 投递回退

- `agent` 请求可以包含 `deliver=true`，以请求出站投递。
- `bestEffortDeliver=false`（默认值）保持严格行为：无法解析的或仅限内部的投递目标会返回 `INVALID_REQUEST`。
- 当无法解析外部可交付路由时（例如 internal/webchat 会话或不明确的多通道配置），`bestEffortDeliver=true` 允许回退到仅会话执行。
- 最终 `agent` 结果可能包括请求交付时的 `result.deliveryStatus`，使用为 [`openclaw agent --json --deliver`](/cli/agent#json-delivery-status) 记录的相同 `sent`、`suppressed`、`partial_failed` 和 `failed` 状态。
