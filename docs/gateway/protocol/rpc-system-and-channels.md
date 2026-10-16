---
summary: "网关 RPC 系列用于系统状态、内存、模型、通道、插件、消息传递和操作员终端"
read_when:
  - "查找系统、内存、模型、通道或插件 RPC"
  - "接线操作员终端或消息传送方法"
  - "检查网关方法所需的范围"
title: "网关协议体系和通道方法"
sidebarTitle: "体系及渠道"
doc-schema-version: 1
---

RPC 方法系列，用于网关状态和身份、模型和使用、通道和登录、插件管理、消息传递和日志以及操作员终端。

## <a id="system-and-identity"></a> 系统和身份

- `health` 返回缓存的或新检查的网关运行状况快照。
- `diagnostics.stability` 返回最近有界诊断稳定性记录器：事件名称、计数、字节大小、内存读数、queue/session 状态、channel/plugin 名称、会话 ID。没有聊天文本、webhook 主体、工具输出、原始 request/response 主体、令牌、cookie 或机密。需要 `operator.read`。
- `status` 返回 `/status`-style 网关摘要；敏感字段仅适用于管理员范围的操作员客户端。
- `gateway.identity.get` 返回中继和配对流程使用的网关设备身份。
- `system-presence` 返回已连接 operator/node 设备的当前存在快照。
- `system-event` 附加系统事件并且可以 update/broadcast 存在上下文。
- `last-heartbeat` 返回最新持久化的心跳事件。
- `set-heartbeats` 切换网关上的心跳处理。
- `gateway.restart.preflight` 是已弃用的、只读的重启专用活动工作兼容性预览。它不会关闭接入、创建暂停租约，也不会提供 `gateway.suspend.prepare` 的原子完整工作围栏；新的重启流程应调用 `gateway.restart.request`。
- `gateway.suspend.prepare` 仅当跟踪的网关工作空闲时才创建短期合作暂停租约。准备就绪后，经过身份验证的 WebSocket 连接仍然可用，但只有 `gateway.suspend.*` 和精确定位的非安全 `gateway.restart.request` 可以运行；安全和无针对性的重启仍然受到限制。 `gateway.suspend.status` 检查租约，`gateway.suspend.resume` 在解冻或中止主机操作后释放它。

## <a id="models-and-usage"></a> 模型及用途

- `models.list` 返回运行时允许的模型目录。请参阅 [`models.list` 视图 ](/gateway/protocol/operator-methods#models-list-views)。
- `usage.status` 返回提供程序使用情况 windows/remaining 配额摘要。宣传 `usage-refreshing` 的客户端会立即收到冷缓存上的 `refreshing: true` 占位符，并且必须按有限的时间表重新获取；其他调用者阻止冷提供者读取。
- `usage.cost` 返回指定日期范围的聚合成本用量摘要。传入 `agentId` 可查询单个代理，或传入 `agentScope: "all"` 聚合已配置的代理。
- `doctor.memory.status` 返回本机内存提供程序的提供程序运行状况，或传统提供程序的向量内存/缓存嵌入准备情况。仅针对显式旧嵌入提供商 ping 传递 `{ "probe": true }` 或 `{ "deep": true }`。将 `{ "agentId": "agent-id" }` 传递给 Dreaming 商店统计数据到一个代理工作区；省略它会聚合配置的 Dreaming 工作区。
- `doctor.memory.dreamDiary`、`doctor.memory.backfillDreamDiary`、`doctor.memory.resetDreamDiary`、`doctor.memory.resetGroundedShortTerm`、`doctor.memory.repairDreamingArtifacts` 和 `doctor.memory.dedupeDreamDiary` 接受可选的 `{ "agentId": "agent-id" }`；省略时，它们作用于已配置的默认代理工作区。
- `sessions.usage`返回每个会话的使用情况摘要。经过`agentId`对于一名智能体，或`agentScope: "all"`将已配置的代理一起列出。报告读取持久的使用情况存储桶，而不是重播对齐日历范围的记录；令牌计数保持精确，而成本加法在浮点精度上可能有所不同。每个代理读取共享一个32 MiB允许保留的缓存有效负载和解码JSON；上面的各个缓存主体1 MiB在加载之前被推迟。精确的部分边界使用每个代理5-第二，16 MiB重播预算。延迟的行保持标记`computing`在部分缓存快照中，而不安排刷新其他当前数据。最多允许一个请求20,000创建者过滤后的会话实例，并且具有15-第二个截止日期；如果超出这些限制，请缩小日期范围或选择一个会话。断开连接会取消该请求，而其他客户端的报告将独立继续。在返回行和总计之前会检查每行的访问权限，因此撤销会删除受影响的行，而不会丢弃报表的其余部分。上下文水合在撤销后回填所选页面；持续的访问变化可能会在两次水化过程后留下一小页。两种使用方法都接受`mode: "specific"`与一个IANA `timeZone`为了DST-了解日历日的界限和时间段。`utcOffset`仍然支持较旧的客户端，并在网关运行时无法识别所请求的区域时作为后备。
- `sessions.usage.timeseries` 返回单个会话的时序用量。
- `sessions.usage.logs` 返回一个会话的使用日志条目。两种详细方法都接受所选行的 `key` 和可选的 `agentId`。打开非限定密钥（例如 `global`）的详细信息时，保留这两个字段。

## <a id="memory"></a> 内存

- `memory.search` 和 `version: 2` 搜索选定的提供者并返回提供者范围内的引用。省略 `version` 或发送 `version: 1`，仅对旧提供商使用旧文件形合同。本机提供程序返回命名插件的错误；使用 `version: 2` 重试。
- `memory.get` 通过选定的提供程序解析提供程序范围的引用。
- `memory.status` 报告所选提供商的运行状况。

这些方法需要经过身份验证的操作员读取权限。 `memory.get`和`memory.status`直接使用provider-runtime合约；当 `version: 2` 存在时，`memory.search` 选择该合约。

## <a id="channels-and-login-helpers"></a> 频道和登录助手

- `channels.status` 返回内置 + 捆绑的 channel/plugin 状态摘要。
- `channels.start`（`operator.admin`）启动一个通道帐户运行时，无需重新验证。参数 `{ channel, accountId? }`；省略`accountId`选择默认帐户。仅当生成的运行时快照报告 `running: true` 时，才响应 `{ channel, accountId, started, outcome }`，`started` 为 true。 `outcome` 携带帐户生命周期决策：`{ status: "handed-off" }`、`{ status: "retry", reason }` 或 `{ status: "skipped", reason }`。 RPC 是自动启动抑制的手动超控；不接受 `manual` 参数。这不是提供商连接检查；请参阅 [ 按账户恢复 ](/cli/channels#per-account-recovery-non-destructive) 了解原因和恢复指南。
- `channels.stop` （`operator.admin`） 停止一个通道帐户运行而不清除身份验证状态。参数 `{ channel, accountId? }`；省略`accountId`选择默认帐户。当生成的运行时快照不报告 `running: true` 时，响应 `{ channel, accountId, stopped }`，`stopped` 为 true。与 `channels.logout` 不同，它保留帐户的凭据。
- `channels.logout` 注销通道支持的特定 channel/account。
- `web.login.start` 启动 QR/web 登录流程。参数包括可选的 `{ channel, accountId, force, timeoutMs, verbose }`。当 `channel` 存在时，网关会标准化其标准 ID 或别名，并仅分派到已安装的通道插件。省略 `channel` 会保留选择第一个加载的 QR- 功能的提供程序的旧行为。如果通道配置的账号超过1个，则需要填写`accountId`；省略或空白的 ID 会因有效帐户 ID 被拒绝。单帐户请求保留其现有的默认行为。仅停止或恢复所选帐户的侦听器。提供者可以通过其 QR 响应返回不透明的 `sessionKey`。如果配对期间通道配置发生变化，请开始新的登录。
- `web.login.wait` 等待该流程完成并在成功时启动通道。参数包括可选的 `{ channel, accountId, sessionKey, timeoutMs, currentQrDataUrl }`。使用与 `web.login.start` 相同的 `channel` 和 `accountId` 并不变地传递其返回的 `sessionKey`，以便提供者可以将等待请求与 QR 会话关联起来。省略 `channel` 会保留与 `web.login.start` 相同的旧提供程序回退。
- `push.test` 向已注册的 iOS 节点发送测试 APNs 推送。
- `voicewake.get` 返回已存储的唤醒词触发器。
- `voicewake.set` 更新唤醒词触发器并广播变更。

### <a id="channel-dm-pairing"></a> 通道 DM 配对

`channels.pairing.list`、`channels.pairing.approve`和`channels.pairing.dismiss`管理通道DM访问请求。它们与 [device bootstrap](/gateway/protocol/rpc-devices-nodes-and-approvals#device-pairing-and-device-tokens) 分开。

现有列表请求接受可选的 `channel` 和 `accountId` 并返回 `accounts`、`requests`、`commandOwnerConfigured` 和 `limits`。公共请求行包含 `requestId` 和 sender/account 元数据，而不是配对代码。现有审批和驳回使用`channel`、`accountId`、`requestId`；批准还接受 `notify` 和 `bootstrapCommandOwner`。批准返回 `requestId`、`senderId`、`notification` 和 `commandOwnerBootstrap`；解雇返回 `requestId` 和 `senderId`。这些合同保持不变。

在协商相应的 [ 所有者能力 ](/gateway/protocol/versioning#local-state-owner-routing) 后，本地 CLI 使用两个显式的、`operator.admin`- 受保护的分支：

| 方法                     | 要求                                                             | 结果                                                                                              |
| -------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `channels.pairing.list`    | `format: "cli"`、`channel`、`expectedOwnerId`；可选`accountId` | 原始请求数组包含 `id`、`code`、`createdAt`、`lastSeenAt` 和可选的 `meta`。          |
| `channels.pairing.approve` | `channel`、`code`、`expectedOwnerId`；可选`accountId`          | `{ id, entry }`，其中 `entry` 是原始批准的请求，如果没有待处理的代码匹配，则为 `null`。 |

代码选择器和现有的 request-ID 选择器是互斥的。在CLI分支中省略`accountId`可以保留跨账户列表和代码查找；明确的帐户限制两者。所有者解析并改变匹配的请求。 CLI 输出保持不变，第一命令所有者配置引导和可选通知在确认后仍保留在客户端。两者都不会在拒绝或未知结果后运行。列表具有突变能力，因为它会修剪过期或过多的待处理请求。

## <a id="plugin-management"></a> 插件管理

- `plugins.list` （`operator.read`） 返回已安装的插件清单以及本地策划的官方选择、诊断以及当前安装模式是否允许突变。它包括当前运行时 `generation` 以及每个插件的运行时状态，与配置的启用分开。
- `plugins.inspect` （`operator.read`） 接受 `{ pluginId }` 作为已安装、上演或正式候选人； `{ source: "clawhub", packageName, version? }` 用于任意 ClawHub 插件；或使用发现身份的 `{ catalogId, version? }`。安装和分阶段检查包括用于能力同意的 `reviewToken`。远程检查公开所选目录的详细信息、适用的拨款并释放信任。他们的 `declaredSurfaceStatus` 是 `partial` 或 `unavailable`：注册表摘要省略了一些功能组和包同级，因此他们无法颁发同意令牌。不支持的空组并不意味着该包声明没有此类功能。
- `plugins.search`（`operator.read`）搜索可安装的 ClawHub 代码插件和捆绑插件系列。传入非空的 `query`，以及可选的 1 到 100 之间的 `limit`。
- `plugins.catalog.browse` （`operator.read`） 返回 ClawHub 发现结果，其中包含网关本地安装和捆绑状态。 Control UI 仅在手动输入至少两个字符稳定 250 ms 后才添加 `searchSource: "openclaw-control-ui"`。初始浏览、刷新、过滤器更改和通用 API 搜索都会忽略它。网关遵循 `CLAWHUB_DISABLE_TELEMETRY`，并且在瞬时故障后不会重播归因于 HTTP 的搜索。 ClawHub 记录规范化查询、源和远程结果计数；这些计数不包括网关添加的仅限本地的匹配项。观察中不包括已安装的清单以及操作员、设备和会话身份。
- `plugins.catalog.get` （`operator.read`） 使用来自 `plugins.catalog.browse` 的未更改发现 ID 接受 `{ id, version? }`。详细信息包括发布者元数据、README、主题、包标签、选定发行说明、功能、配置、验证和安全性（由 ClawHub 提供）。 `detail.selectedRelease` 独立于 `plugin.catalog.latestVersion` 命名实际版本； null 表示未选择任何版本。 `detail.metadata` 明确报告可用或缺失的 README、清单和安全数据。安装的对应项可以在注册表中断期间提供本地详细信息； `remoteError` 解释了该故障，而远程选择发布事实仍然未知。仅本地身份不支持远程版本选择。
- `plugins.install` （`operator.admin`） 接受以下特定于源的请求字段：

  | `source`      | 字段                                                                     |
  | ------------- | -------------------------------------------------------------------------- |
  | `bundled`     | `pluginId`，可选`spec`                                                |
  | `clawhub`     | `packageName`，可选`version`，`expectedPluginId`，`expectedIntegrity` |
  | `git`         | `spec`                                                                     |
  | `local`       | `path`，可选`link`                                                    |
  | `marketplace` | `marketplace`, `plugin`                                                    |
  | `npm`         | `spec`，可选`pin`，`expectedPluginId`，`expectedIntegrity`            |
  | `npm-pack`    | `archivePath`                                                              |
  | `official`    | `pluginId`，可选`version: "latest"`，`pin`                            |

  每个请求还可以包括 `mode: "install" | "update"`、`acknowledgeInstallPolicyWarning: true` 和 `acknowledgeCapabilities: { reviewToken }`。省略`mode`表示安装。本地路径、npm-pack 档案、市场源和本地 Git 源需要网关识别为本地的连接；路径引用该网关主机。对特定的官方软件包版本使用 npm 规范。

  当安装策略返回 `warn` 时，错误 `details` 包括 `installPolicyCode: "install_policy_warning_acknowledgement_required"`、目标、原因和可选结果。经过审查后，使用 `acknowledgeInstallPolicyWarning: true` 重试相同的操作会批准该安装调用中的每个警告；在继续安装之前，会重新评估每个警告。 `block` 和策略失败仍然是最终的。 ClawHub 安装可保留网关信任和完整性检查。

- `plugins.setEnabled` （`operator.admin`） 使用 `{ pluginId, enabled, acknowledgeCapabilities? }` 更改已安装插件的启用策略。响应包括更新的目录条目和任何槽位选择警告。
- `plugins.reload` （`operator.admin`） 使用 `{ plugins: [{ pluginId, installHash?, sourceDigests? }], acknowledgeCapabilities? }` 重新加载一个或多个已发现的插件，保留配置的启用。发送 1-64 个目标；单插件请求使用相同的数组信封。响应包含 `pluginIds`、布尔值 `restartRequired` 和必需的 `runtime` 收据。当编译的捆绑代码在文件更改后保留其加载的模块时，`restartRequired` 是 `true`，结果解释了原因。
- `plugins.refresh` （`operator.admin`） 刷新插件元数据并将生成的注册表应用于 `{}`。
- `plugins.uninstall` （`operator.admin`） 使用 `{ pluginId, keepFiles? }` 删除一个外部安装的插件：配置引用、安装记录和托管文件。捆绑的插件无法卸载，只能禁用。响应列出了删除操作。

### <a id="catalog-detail-and-client-confirmation"></a> 目录详细信息和客户确认

`detail.downloadability` 具有以下形状之一：

| 状态                                         | 含义                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `{ "status": "downloadable" }`                 | 消息来源已确认选定版本工件的可用性。       |
| `{ "status": "unavailable", "reason": "..." }` | 缺少版本或源下载策略会阻止下载。         |
| `{ "status": "unknown", "reason": "..." }`     | 源无法建立可用性，或者注册表读取失败。 |

ClawHub 当前公开了选定插件版本的下载策略块，但其只读详细信息和工件解析器不检查存储的工件字节。因此，允许的安全判决、下载 URL、列表或本地安装操作会生成 `unknown`，而不是 `downloadable`。无副作用的每次发布可用性事实需要 ClawHub 合同延期。网关检查不下载包来检查；注册表下载路由记录遥测。

本机客户端可以获取 `plugins.catalog.get`，检查相同的 `catalogId`，显示返回的事实，并自行收集确认。批准后，使用 `source: "clawhub"`、准确返回的 `packageName` 和 `selectedRelease.version`（如果存在）调用 `plugins.install`。保留范围和出版商拼写；不要从运行时插件 ID 重建包名称。如果安装需要功能同意或安装策略确认，则显示所有者发布的审查并重试相同的意图及其确认。目录检查不会授予同意或绕过安装策略、完整性、信任或授权。取消发送不安装RPC。网关不管理确认对话框。

仅运行时刷新适用于只读、Nix 管理的和根 `$include` 配置，无需重写它们。当另一个插件或配置操作已在应用时，插件生命周期和 Claw 包删除请求将返回可重试的 `UNAVAILABLE` 和 `retryAfterMs`。这种繁忙的响应发生在请求的突变开始之前；当前操作完成后重试。突变开始后的失败会保留其应用程序详细信息，并且不会自动重试。

这些突变会等待运行时应用程序，而无需重新启动网关。成功的回复包括 `restartRequired` 和带有 `operationId`、`generation`、`pluginIds` 和可选 `sourceDigests` 的 `runtime` 收据。重新加载未更改的捆绑代码或替换捕获的外部代码将返回 `restartRequired: false`；已编辑的捆绑代码若仍处于加载状态，或其文件无法验证，则需要重新启动。发布后，网关将 `plugins.changed` 与 `{ generation }` 一起广播。运行时替换错误包括 `details.runtime.phase` 和 `details.runtime.committed`，因此客户端可以区分发布前的拒绝和新一代激活后的失败。

如果多步突变发布运行时但后来失败，则 `details.runtime` 会保留已发布的收据 `committed: true`。在发布之前失败的后续替换在 `details.runtimeAttempt` 中单独报告。客户端应该在任何提交的更改后刷新其运行时视图，即使整体突变失败。

安装错误还可能包括 `details.persistence: { operation: "install", pluginId }`。这记录了安装已保存，与运行时发布无关。刷新已安装的清单和配置；修复报告的问题并重新加载已安装的插件，而不是盲目地重复安装。 `details.runtime.committed: false` 并不意味着安装已回滚。

安装、启用和重新加载可能需要能力同意。审核申报能力后，通过`acknowledgeCapabilities: { reviewToken }`；在应用之前，将根据新的检查对令牌进行检查。这与安装策略警告批准是分开的。参见[插件管理](/plugins/manage-plugins)。

重新加载前提条件是可选的。 `installHash` 是以标准化形式保存的安装记录的小写 SHA-256，并且需要跟踪的软件包。 `sourceDigests` 将已解析的运行时插件 ID 映射到小写 SHA-256 源摘要。跟踪目标解析其整个包；没有安装记录的捆绑或配置源解析其发现的运行时 ID。不明确、缺失或冲突的托管所有权仍会拒绝该请求。网关在同意之前和之后检查目标所有权和预期记录，然后根据其加载的捕获的代码验证源期望。同意可以更新保存的安装记录：如果这更改了提供的 `installHash`，则重新加载会明显失败，而无需发布运行时。调用者在重试之前必须刷新其预期状态；网关永远不会重写提供的哈希值。确认覆盖其已审查的声明表面，并且不同的所需表面在运行时发布之前停止操作。重新加载不会重建编译的捆绑代码或授予文件修改权限。

`sourceDigests` 需要捕获源插件实例和 Node 的同步模块挂钩。没有这些钩子的运行时（包括 Bun 1.4.3）会忽略这些摘要并拒绝提供它们的请求。普通Bun重载捕获新的源用于替换，同时为认可的消费者保留旧实例；请参阅 [ 运行时实例和源生命周期 ](/plugins/architecture#runtime-instance-and-source-lifetime)。

## <a id="clawhub-catalog-discovery"></a> ClawHub 目录发现

`catalog.browse` 和 `catalog.searchKeywords` 需要 `operator.read`。客户使用前检查`hello-ok.features.methods`；旧的网关继续公开现有的插件和技能 RPC。所有注册表请求都在网关上运行，包括远程运行或在 WSL 内部运行时。

### <a id="browse-and-search"></a> 浏览搜索

使用以下字段调用 `catalog.browse`：

| 字段          | 契约                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `kind`         | 必需：`plugin` 或 `skill`。结果保持在这种范围内。                                                                       |
| `query`        | 可选文本，最多 200 个字符。仅空白文本意味着浏览。                                                           |
| `feed`         | `catalog`（默认）或 `trending`。搜索无法选择 `trending`。                                                                 |
| `officialOnly` | 可选布尔值，默认 `false`。网关排除任何没有明确官方标志的列表。                              |
| `pageSize`     | 1 到 100 之间的整数，默认 20。                                                                                                  |
| `cursor`       | 来自相同种类、提要和过滤器请求的不透明延续。搜索不接受光标。                                  |
| `agentId`      | 选择技能工作区。仅当网关可以明确选择代理时才省略。插件发现不需要代理。 |

例如：

```json
{
  "kind": "skill",
  "officialOnly": true,
  "pageSize": 20,
  "agentId": "main"
}
```

响应包含`items`和`mode`（`catalog`、`trending`或`search`）。目录和趋势页面可以返回 `nextCursor`。过滤可以产生一个带有延续的空页；当光标存在时继续。完整目录浏览使用注册表的分页插件和本机技能目录。趋势是一个有限的排名源，而不是完整的目录。现有的初始 `plugins.catalog.browse` 概述保留其有界行为。

文本搜索最多返回 `searchLimit` 上游候选，等于请求的页面大小。官方过滤可以减少该数量。上游搜索没有延续，因此它不能保证所有可能的匹配列表。成功的空响应意味着没有返回符合条件的列表。 `remoteError`表示注册表发现失败；任何返回的光标都会重复输入光标，以便客户端可以重试同一页面。安装状态失败返回 `UNAVAILABLE`，而不是声称列表已卸载。

每个项目都有 `kind`、`registry`、`id`、`catalog` 元数据和 `local` 事实。将 `(kind, registry, id)` 视为其唯一标识。插件 ID 保留现有的 `ch_...` 发现身份，因此 `plugins.catalog.get` 可以打开详细信息； `catalog.packageName` 提供现有的插件安装定位器。技能 ID 等于 `installRef`：本机 `@publisher/slug` 或源限定的外部参考。将 `installRef` 不变地作为 `slug` 传递到现有技能生命周期 RPC。尊重`installOnly`；这些条目没有普通技能明细卡。伴随列表详细信息工作流不会更改这些身份。

技能本地事实包括已解析的 `agentId`、`installed`、`enabled`、`eligible` 以及安装后的 `skillKey`。它们来自所选工作区的现有状态读取器和有效的跟踪 registry/source/publisher 身份。匹配的显示名称或裸线名不会建立安装。插件本地事实重用现有的托管库存和突变策略。这两项操作都不会安装任何内容或更改批准要求。

### <a id="bulk-keyword-discovery"></a> 批量关键字发现

使用 `keywords`（1–100 个非空字符串，每个最多 200 个字符）、可选 `kinds`（`plugin`、`skill` 或两者；默认两者）、`agentId`、`pageSize` 调用 `catalog.searchKeywords` （1–100，默认 20），以及可选返回的 `cursor`。 Gateway 会修剪和折叠空格、小写并删除重复术语，并搜索每个选定类型的单个术语。它始终仅返回官方列表，并按固定身份顺序按唯一身份进行重复数据删除。它从不连接术语或解释应用程序清单。客户自己的应用程序检测和关键字生成。

响应包含归一化的 `keywords`、`items`、`searchLimit: 100`、`errors`（每个包含 `kind`、`query` 和 `message`）以及可选的 `nextCursor`。光标分页那些有界搜索的完整联合；该联盟内的任何匹配项都不会被默默删除。上游 100 名候选者限制仍然适用于每个术语和种类，因此这不是详尽的注册表搜索。没有错误的空联合与查询失败的空联合或部分联合不同。重试有错误的请求以恢复失败的条款。

批量延续会重新读取相同的有界搜索，最多执行四个搜索，而不保留第二个库存。游标绑定规范化的术语、类型、注册表和选定的工作区。当远程列表在请求之间发生变化时，分页是最好的选择：延续使用其在当前结果中的偏移量，因此列表可能会重复或被跳过。重新启动发现以进行新的遍历。大型关键字集和后续页面比普通搜索执行更多的注册表读取；客户端应允许更长的 RPC 请求超时并保留原始请求以进行重试。

### <a id="upstream-contracts-and-gaps"></a> 上游合约和缺口

原生技能目录浏览和搜索使用ClawHub现有的`/api/v1/packages?family=skill`和`/api/v1/packages/search?family=skill`合约。这些项目显示本机技能目录并公开列表的 `isOfficial` 标志。 `/api/v1/skills` 目前忽略该标志。现有的技能搜索和趋势可以结合发布者和列表官方状态；新目录不使用出版商​​官方身份作为替代。因此，本机趋势条目会从有界批次的包元数据中读取其列表标志。 package-detail路由可以优先解析同名包；仅当家族、蛞蝓和出版商与确切的技能匹配时，其元数据才符合资格。元数据不匹配导致官方状态未知。缺少旗帜永远不符合资格；特色状态、验证级别、发布者句柄和捆绑出处也不能限定列表。

包技能目录目前涵盖原生 ClawHub 技能。外部来源可以以其原始的仅安装身份出现在现有的趋势提要中，但目前没有公开单独的列表级官方标志，并且没有资格获得官方建议。现有的`skills.search`保留其现有的跨源搜索和省略查询趋势行为；其公共结果合约还声明了现有的可选 `official` 字段。没有引入跨种类的类别分类法或全球相关性排名。

## <a id="messaging-and-logs"></a> 消息和日志

- `send` 是 channel/account/thread-targeted 在聊天运行器外部发送的直接出站递送 RPC。
- `logs.tail` 返回配置的网关文件日志尾部以及 cursor/limit 和最大字节控制。

## <a id="operator-terminal"></a> 操作终端

- `terminal.open` 为显式 `agentId` 或默认代理启动主机 PTY 并返回已解析的代理、工作目录、shell 和限制状态。传递 `sessionKey` 会将 PTY 绑定到该确切的代理会话，并将调用连接附加为其第一个查看器；省略它会创建一个连接拥有的操作员终端。
- `terminal.input` 和 `terminal.resize` 在呼叫连接拥有的会话和代理拥有的会话（其中该连接是附加查看器）上运行。 `terminal.close` 终止连接拥有的会话，但仅将呼叫查看器与已建立的代理拥有的会话分离。对于新的会话绑定 Control UI 终端，发起查看器的关闭或断开连接会丢弃 PTY，直到浏览器或精确会话代理首先通过授权操作采用它。
- `terminal.upload` 接受一个最大 16 MiB 的 Base64 文件，将其暂存到会话网关或配对节点主机上的私有 24 小时临时目录中，并返回绝对路径。调用方仍必须粘贴或以其他方式使用该路径；该 RPC 从不写入终端输入或执行命令。
- `terminal.data` 和 `terminal.exit` 事件流向连接所有者和连接的查看器。会话拥有的终端仍然存在。面向代理的 `terminal` 工具只能列出、读取、调整大小或关闭操作员为其确切会话打开的终端；它无法打开终端。代理输入遵循有效的会话和执行策略：`full` （YOLO） 立即发送，`guarded` 和 `workspace`（包括仅接受或监护人审核的流程）需要对该确切输入进行显式一次性批准，并且 `read-only` 或 `deny` 会阻止它。
- Connection 拥有的会话，其连接丢失是分离的，而不是终止的：它们在 `gateway.terminal.detachedSessionTimeoutSeconds` 中保持可重新连接（默认 300；`0` 恢复断开连接时终止），同时最近的输出累积在有界的服务器端缓冲区中。已建立的代理拥有的会话同样可以在观众断开连接后继续存在。
- `terminal.list` 返回可附加会话。 `terminal.attach` 返回重播缓冲区，并重新绑定连接拥有的会话（tmux 式接管 — 先前的实时所有者出于 `detached` 的原因接收 `terminal.exit`），或者将连接添加为代理拥有的会话的查看者。
- 每个终端方法都需要`operator.admin`； `gateway.terminal.enabled` 默认开启，设置为 `false` 时拒绝所有方法。完全沙盒代理将被拒绝，代理策略更改将关闭现有的和运行中的 PTY，包括分离的 PTY。
