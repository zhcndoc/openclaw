---
summary: "插件兼容性契约、弃用元数据和迁移预期"
title: "插件兼容性"
read_when:
  - "您维护一个 OpenClaw 插件"
  - "您看到插件兼容性警告"
  - "您正在规划插件 SDK 或 manifest 迁移"
---

OpenClaw 会在移除旧的插件契约之前，通过命名的兼容性适配器继续连接这些旧契约。这可以在 SDK、manifest、setup、config 和 agent runtime 契约演进的同时，保护现有的内置插件和外部插件。

所有插件 API 均为 [experimental](/plugins/sdk-overview#api-stability)。插件作者应固定并测试支持的 OpenClaw 主机版本。此稳定性指定不会取消现有的弃用窗口、兼容性适配器或下述支持的升级迁移。

## <a id="compatibility-registry"></a> 兼容性注册表

插件兼容性契约记录在核心注册表中，位于 `src/plugins/compat/registry.ts`。每条记录包括：

- 稳定的兼容性代码
- 状态：`active`、`deprecated`、`removal-pending` 或 `removed`
- 所有者：`sdk`、`config`、`setup`、`channel`、`provider`、`plugin-execution`、 `agent-runtime` 或 `core`
- 适用时的引入日期和弃用日期
- 所有者维护者批准后，准确的 `removeAfter` 日期或命名的 `removalGate`；两者均没有的记录仍不符合移除条件
- 替代方案指导
- 覆盖旧行为和新行为的文档、诊断信息和测试

注册表是维护者计划和已弃用的 SDK 导入通知的来源。如果面向插件的行为发生更改，请在添加适配器的同一更改中添加或更新兼容性记录。

Doctor 修复和迁移兼容性单独记录在 `src/commands/doctor/shared/deprecation-compat.ts`。这些记录涵盖旧的配置形状、安装账本布局，以及在运行时兼容路径移除后可能仍需保留的修复 shim。

每个医生兼容性记录均声明 `introduced` 和 `removeAfter`。当 `removeAfter` 上或之后的记录仍然是 `deprecated` 时，`pnpm check:doctor-deprecation-registry` 防护失败；维护人员必须在支持升级证明后将其删除，或者使用记录的阻止程序将其移至 `removal-pending`。 `removal-pending` 记录不会通过日期保护，但会保留在显式审核队列中，直到满足升级条件。

维护者批准的医生截止日期续订保留原始日期为 `previousRemoveAfter`，将批准日期记录为 `renewedAt`，并在不超过三个月后设置新的 `removeAfter`。续订仅更改审核时间；它不会更改运行时兼容性、配置处理、迁移行为或生命周期状态。 2026 年 8 月 29 日，所有 44 份现有医生记录均更新至 2026 年 11 月 29 日。

发布检查应同时检查两个注册表。不要仅仅因为匹配的运行时或配置兼容性记录已过期，就删除 Doctor 迁移；应先确认不存在仍需要该修复的受支持升级路径。在发布规划期间也要重新验证每条替代方案注释，因为随着提供方和渠道移出核心，插件所有权和配置覆盖范围可能会发生变化。

## <a id="observed-sdk-usage"></a> 观察到的 SDK 使用情况

OpenClaw已弃用的记录SDK当插件导入它们时使用子路径，并在插件调用它们时废弃成员。导入受支持的模块不会标记其未使用的已弃用成员。观察结果保留在内存中，每个插件一次API每个网关进程；他们不添加数据库工作。

Control UI 插件列表显示一个信息行，其中包含已宣布的停用日期（如果可用）以及 [ 迁移指南 ](/plugins/sdk-migration/how-to-migrate) 的链接。插件详细信息列出了观察到的 API 及其替代品。该通知不会改变插件的运行状况或阻止插件运行。现有的插件检查、医生、状态和设置兼容性报告还包括在其过程中进行的观察。

这是使用情况检测，而不是详尽的源审计：不会报告未执行的导入和调用。更新插件后，重新启动网关以清除以前的观察结果并收集其当前使用情况。

## <a id="deprecation-policy"></a> 弃用政策

OpenClaw 不应在引入替代方案的同一版本中移除已文档化的插件契约。迁移顺序：

1. 添加新合约。
2. 通过命名的兼容性适配器保留旧行为。
3. 当插件作者可以采取行动时，发出诊断或警告。
4. 文档化替代方案和时间线。
5. 测试旧路径和新路径。
6. 等待已宣布的迁移窗口结束。
7. 仅在维护者明确批准后才能删除以用于以后的普通稳定版本。

已弃用的记录必须包含警告开始日期、替换、文档链接以及最终删除日期或明确批准的删除门槛。 `stable-deprecation-period` 门记录了在以后的普通稳定版本中删除的准备工作。它没有设定最后期限或授权删除。一旦所有者批准了某个窗口，请将该门替换为 `removeAfter` 中的最终兼容日。 Beta 版本不满足发货替换或弃用要求。

已弃用的同步 SQLite- 支持的插件 SDK 成员通过 **2026 年 12 月 31 日** （`removeAfter: 2026-12-31`） 保持兼容。 **2027 年 1 月第一个稳定版本** 中的移除船舶，没有 SDK 主要。下一个稳定版本将宣布此窗口，其中包含可操作的警告和 [ 完整的异步迁移指南](/plugins/sdk-migration/sqlite-async)。此准备工作不会删除任何公共成员。现有的异步 API、准备好的 SQL-free 重载、工作本地 SQLite 原语和显式离线维护合约仍然受支持。

宣布的警告删除窗口不应超过三个月。该绑定不是自动到期：源注释、已过的注册日期或未注明日期的门不能替代附带的诊断、迁移说明、支持的读者检查和宣布的窗口。 [ 移除时间表 ](/plugins/sdk-migration/removal-timeline) 描述了额外的装运表面浇口。其他兼容性系列保留自己的日期或普通的稳定发布时间； SQLite 截止时间不会重新安排它们。不要在没有经过批准的门的情况下添加开放式删除窗口，除非维护人员明确决定它是永久兼容性并将其标记为 `active`。

## <a id="current-compatibility-areas"></a> 当前兼容性区域

2026 年 7 月的扫描删除了过期的根 SDK、清单、提供程序、运行时、注册表标志和插件拥有的 Web 配置别名。医生迁移仍然单独跟踪，因此支持的升级路径仍然可以修复旧配置。

剩余的、带日期的兼容性区域包括：

- 迁移指南中列出的更新的 10 月 1 日 SDK 子路径窗口
- 已随附的 agent-harness SDK 别名，其移除需等待新的、对外文档化的迁移决定
- 下面列出了 2026 年 10 月 SDK 注释系列

活跃的、无日期的 registry 记录涵盖受支持的行为，而不是待移除债务， 包括激活提示、插件捕获、捆绑插件启用以及生成的 channel-config 回退。

仅注释兼容性审核添加了这些过时的记录。他们的 `removeAfter` 日期是最早的审查日期，而不是在其规定的读取器或迁移条件仍未满足时删除表面的许可。 10 个 10 月 1 日注释系列现在为 `removal-pending`，原始日期和下面每个系列的删除条件保留在审阅队列中。这并不授权删除或要求完成已发表的读者扫描。

| 兼容性代码                            | 移除条件                                                                                     | `removeAfter` |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------- |
| `plugin-sdk-channel-setup-input-fields`       | 重复已发布插件的构件扫描，只移除不存在读取方的字段。                     | 2026-10-01    |
| `plugin-sdk-broad-runtime-barrels`            | 将捆绑的和已索引的外部使用方迁移到专用 SDK 子路径。                                  | 2026-10-01    |
| `plugin-sdk-provider-owned-helper-shims`      | 将每个已弃用的 provider helper 迁移到其 provider 本地 API，并证明不存在已发布的读取方。 | 2026-10-01    |
| `message-presentation-legacy-bridges`         | 将回复生产方和官方 channel 包迁移到 `MessagePresentation`。                          | 2026-10-01    |
| `plugin-sdk-focused-compat-aliases`           | 证明每个列出的别名都不存在捆绑或已发布的读取方。                                      | 2026-10-01    |
| `agent-harness-terminal-result-aliases`       | 将 harness 迁移到 `terminal` 和 `visibleReplies`，然后证明旧结果字段已无人读取。    | 2026-10-01    |
| `official-plugin-export-aliases`              | 将频道演示和 Discord 超时消费者移至主要 API 并清除已发布的读者。  | 2026-10-01    |
| `memory-host-compatibility-aliases`           | 在废弃覆盖之前验证当前内存表并保留旧数据。                     | 2026-10-01    |
| `plugin-runtime-api-compat-aliases`           | 将平面插件 registration/runtime 调用移至其命名空间或集中替换。              | 2026-10-01    |
| `plugin-provider-manifest-compat-aliases`     | 将 kind/setup/catalog 的所有权迁移到 manifest 和 model-catalog 注册。                        | 2026-10-01    |
| `plugin-sdk-session-agent-resolution-aliases` | 将已发布的插件移至具有明确或准备好的所有者的严格会话代理解析。         | 2026-11-29    |

`pnpm plugins:boundary-report` 会将 `removal-pending` 记录与 deprecated 记录分开报告。 某个到期的 `removal-pending` 记录在其报告的迁移条件满足且其读取方引用被清除之前， 仍会被阻止；现有的 `--fail-on-eligible-compat` gate 仍只适用于带日期的 `deprecated` 记录。读取方引用是用于分流的 surface-token 匹配；在批准移除之前， 请使用已发布构件扫描。

已弃用的 `sourceVisibleReplies` harness字段仍受支持，因为 2026 年 7 月发布的 `@openclaw/codex` 仍会生成它。在新插件中使用 [`deliveryDefaults.visibleReplies`](/plugins/sdk-agent-harness/sessions-and-results#harness-delivery-defaults)。已发布的生产者也仍然支持最终结果别名，包括 `openclaw-deepseek-harness@0.2.0`。

### <a id="session-store-bridge-retirement"></a> 会话存储桥停用

SDK 所有者批准于 2026 年 9 月 30 日停用 `deprecated-session-store-beta5-api`，取代之前的 10 月 12 日兼容性截止日期。支持的插件截止不包括 `v2026.7.1-beta.5` 和导入已停用的整个存储或转录路径桥的任何其他插件版本。在升级主机之前，使用范围行操作和身份支持的转录 API 将这些插件升级到版本。

已发布的 `@openclaw/codex@2026.9.7` 和 `@openclaw/feishu@2026.9.7` 软件包已从已停用的导入中迁移。他们的`2026.7.1-beta.5`封装仍然使用桥接器；仅较新的版本号并不能证明可以迁移到其他版本或插件。

`openclaw/plugin-sdk/session-store-runtime` 和 `resolveStorePath(...)` 仍受支持。 [session API 迁移指南](/plugins/sdk-migration/removed-surfaces#removed-session-and-transcript-file-apis) 中列出了已删除的导出、选项类型和包根别名。此次停用更改了支持的 SDK 表面； SQLite 存储和旧状态导入以及 Doctor 迁移保持不变。

### <a id="synchronous-plugin-state"></a> 同步插件状态

`plugin-state-sync-keyed-store` 命名现有的同步密钥存储适配器。它于 2026 年 9 月 11 日弃用，现在最终兼容日为 2026 年 12 月 31 日。删除将在 2027 年 1 月的第一个稳定版本中发布。实际的遗留调用会为每个网关进程的每个插件和功能系列发出一个诊断；模块导入保持沉默。现有的同步方法、插件信任资格和事务回调语义保持不变。使用 [ 状态存储迁移指南 ](/plugins/sdk-runtime/state-and-system#synchronous-keyed-store-migration) 迁移到仅数据 `openKeyedStoreV2` 操作。该窗口还涵盖 V1、`update` 和 `deleteIf` 回调。他们的 Promise 返回不会将交易移出网关线程；请改用 V2 `observe` 和 `compareAndApply` 或工作人员操作。捆绑的第一方插件支持当前主机并直接使用 V2，无需旧主机回退。

### <a id="session-agent-resolution-aliases"></a> 会话代理解析别名

新插件应使用 `resolveSessionAgentIdsStrict` 或 `resolveSessionAgentIdStrict` 并提供显式代理、代理范围的会话密钥、准备好的后备代理或持久的固定存储所有者。

仅当由于未提供所有者而严格解析失败时，较旧的 `resolveSessionAgentIds` 和 `resolveSessionAgentId` 插件 SDK 导出才会保留环境系统代理回退。这些别名将空或仅包含空格的代理 ID 视为省略；严格解析器拒绝提供的空白 ID。它们不会覆盖明确的、代理范围的、持久的、冲突的或退休的所有者结果。这些别名已于 2026 年 8 月 29 日弃用，但在 2026 年 11 月 29 日之前仍然可用。删除还需要已发布的插件读者扫描和明确的中断发布批准。

### <a id="auth-profile-cooldown-classifications"></a> Auth 配置文件冷却时间分类

`AuthProfileStore.usageStats[*].cooldownReason` 仍然是封闭的 `AuthProfileFailureReason` 联盟。主机策略将 WHAM HTTP 401 记录为 `auth`，将 HTTP 403 记录为 `auth_permanent`。

`cooldownClassification` 是可选的附加主机诊断。其当前值为 `wham_token_expired` 和 `wham_account_dead`。显示此字段的插件必须保留默认值或备用分类，以供将来的可选分类使用。主机故障切换使用`resolveProfilesUnavailableReason`；诊断仅是呈现状态，绝不能用作授权。

### <a id="channel-prompt-context-identifier-aliases"></a> Channel prompt-context 标识符别名

新通道插件应使用 `MsgContext.ChannelPromptContext`、`MsgContext.ChannelStructuredContext`、`ChannelStructuredContextEntry` 和 `SupplementalContextFacts.channelStructuredContext`。较旧的 `UntrustedContext`、`UntrustedStructuredContext`、`UntrustedStructuredContextEntry` 和补充 `untrustedContext` 名称仍保留为已弃用的 SDK 别名。他们的 2026-09-08 删除审查日期没有变化，但注册表记录 `sdk-untrusted-context-identifier-aliases` 现在是 `removal-pending`：删除仍然需要已发布插件阅读器的验证迁移和明确的中断发布批准。入站终结将这些已弃用的字段折叠到通道命名的字段中，并从运行时上下文中删除旧键。

安全运行时类似地导出 `buildChannelMetadata`；在相同的待删除条件下，已弃用的 `buildUntrustedChannelMetadata` 别名仍然可用。

### <a id="whatsapp-inbound-callback-retirement"></a> WhatsApp 入站回调退役

2026 年 8 月 WhatsApp 回调兼容窗口已关闭。运行时回调现在仅接受 `WebInboundCallbackMessage`：嵌套的 `event`、`payload`、`quote`、`group` 和 `platform` 上下文以及所需的公共 `admission` 信封。不再接受平面回调字段和顶级准入别名。

`payload.channelStructuredContext` 是从入站提供商有效负载中提取的。插件应先检查 `label`、`source` 和 `type`，然后再将其 `payload` 视为权威。

## <a id="plugin-inspector-package"></a> 插件检查器包

插件检查器应该作为一个单独的 package/repository 存在于核心 OpenClaw 存储库之外，并由版本化兼容性和清单合约支持。第一天的 CLI 应该是：

```sh
openclaw-plugin-inspector ./my-plugin
```

它应该发出 manifest/schema 验证、正在检查的合约兼容性版本、install/source 元数据检查、冷路径导入检查和 deprecation/compatibility 警告。使用 `--json` 在 CI 注释中获得稳定的机器可读输出。 OpenClaw 核心应公开检查器可以使用的合约和装置，但不应从主 `openclaw` 包发布检查器二进制文件。

### <a id="maintainer-acceptance-lane"></a> 维护者验收通道

在验证外部检查器与 OpenClaw 插件包的兼容性时，对可安装包验收通道使用基于 Crabbox 的 Blacksmith Testbox。包构建完成后，从一个干净的 OpenClaw 检出环境中运行：

```sh
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "pnpm install && pnpm build && npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/telegram --json"
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/discord --json"
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- <clawhub-plugin-dir> --json"
```

为维护人员保留此通道选择加入，因为它安装外部 npm 包，并可能检查在存储库外部克隆的插件包。本地存储库防护涵盖了 SDK 导出映射、兼容性注册表元数据、已弃用的 SDK- 导入燃尽以及捆绑扩展导入边界；当外部插件作者使用它时，测试盒检查器证明涵盖了该包。

## <a id="release-notes"></a> 发布说明

发布说明应包含即将到来的插件弃用信息，包括目标日期以及迁移文档链接，且应在兼容性路径变为 `removal-pending` 或 `removed` 之前提供。

## <a id="related"></a> 相关内容

<CardGroup cols={3}>
  <Card title="SDK 迁移" href="/plugins/sdk-migration" icon="arrow-right-arrow-left">
    已移除的表面、其替代品以及移除时间表。
  </Card>
  <Card title="插件清单" href="/plugins/manifest" icon="file-code">
    兼容性记录可以弃用的清单字段。
  </Card>
  <Card title="管理插件" href="/plugins/manage-plugins" icon="wrench">
    安装、更新和检查已安装的插件。
  </Card>
</CardGroup>
