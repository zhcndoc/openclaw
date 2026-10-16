---
summary: "插件 SDK 的子路径目录：按领域分组说明各类导入位置"
doc-schema-version: 1
read_when:
  - "为插件导入选择正确的plugin-sdk子路径"
  - "审核捆绑插件子路径和辅助表面"
title: "插件 SDK 子路径"
---

插件 SDK 包含狭窄的公共子路径和 `openclaw/plugin-sdk/` 下的仅存储库捆绑帮助程序。此页面对每个键入的公共子路径进行编目，并明确标记所选的私有本地条目；它不是每个内部运行时助手的清单。四个文件定义边界：

- `scripts/lib/plugin-sdk-entrypoints.json`：维护的入口点清单，构建时会对其进行编译。
- `scripts/lib/plugin-sdk-private-local-only-subpaths.json`：从键入、记录的 SDK 中排除的内部子路径。生产条目仍可作为 JavaScript-only 主机运行时导出用于单独发布的官方插件；仅测试条目保持未导出状态。
- `scripts/lib/plugin-sdk-deprecated-public-subpaths.json`：仅通过其记录的删除窗口保留公共兼容性子路径。
- `scripts/lib/plugin-sdk-entries.mts`：派生的 public/private 导出元数据、支持的捆绑外观和插件拥有的公共表面。

更改入口点清单后，运行 `pnpm plugin-sdk:sync-exports`，然后运行 ​​`pnpm plugin-sdk:check-exports`。相同的注册命令维护包导出、`package.json` 的 `files` 中的私有工件排除以及 `extensions/tsconfig.package-boundary.paths.json` 和 `extensions/xai/tsconfig.json` 中的私有工作区声明别名。它拥有字面平面 `!dist/plugin-sdk/<name>.js` 和 `.d.ts` 排除项，包括带有下划线、大写字母、点或 Unicode 的名称，并在条目公开或被删除时删除过时的排除项。嵌套路径、glob 或转义语法、非入口点元数据和其他文件规则保留其顺序；不相关的映射和 XAI 故意省略的私有别名被保留。这些本地声明别名不会将类型添加到 JavaScript-，仅发布 SDK 导出；仅测试条目保持未导出状态。

维护人员使用 `pnpm plugin-sdk:surface` 审核公共导出数量，并使用 `pnpm plugins:boundary-report:summary` 检查兼容性队列。

有关插件编写指南，请参见 [Plugin SDK overview](/plugins/sdk-overview)。

## <a id="plugin-entry"></a> 插件入口

本机功能创作使用 `plugin-sdk/feature-contract`（`defineFeatureContract`、`createFeatureClient`）、`plugin-sdk/feature-plugin`（`defineFeaturePlugin`）和 `plugin-sdk/control-ui`（`defineControlUiPlugin`、主机和视图类型）。合约和 Control UI 子路径是浏览器安全的； `feature-plugin` 仅是后端。请参阅 [ 功能插件](/plugins/feature-plugins)。

| 子路径                             | 主要导出                                                                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`           | `definePluginEntry`, `PluginCapabilityCatalog`, `PluginCapabilityCatalogEntry`, `PluginCapabilityCatalogContext`, `PluginCapabilityCatalogHostEntry`, `PluginCapabilityCatalogHostContext`              |
| `plugin-sdk/core`                   | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema`, `buildJsonChannelConfigSchema`, `resolveTailscalePublishedHost` |
| `plugin-sdk/provider-entry`         | 2026 年 7 月后私有-本地； `defineSingleProviderPluginEntry`                                                                                                                                        |
| `plugin-sdk/migration`              | 2026 年 7 月后私有-本地；迁移提供程序项目帮助程序，例如 `createMigrationItem`、原因常量、项目状态标记、编辑帮助程序和 `summarizeMigrationItems`                   |
| `plugin-sdk/migration-runtime`      | 2026 年 7 月后私有-本地；运行时迁移帮助程序，例如 `copyMigrationFileItem`、`resolvePlannedMigrationTargets`、`withCachedMigrationConfigRuntime` 和 `writeMigrationReport`              |
| `plugin-sdk/health`                 | 面向随附健康检查消费者的 Doctor 健康检查注册、检测、修复、选择、严重性和发现类型                                                                                |
| `plugin-sdk/gateway-ingress`        | 服务拥有的远程 Control UI 入口工厂、句柄、套接字、请求、cookie 和类型化错误合约；参见 [ 远程 Control UI 入口 ](/plugins/sdk-gateway-ingress)                              |
| `plugin-sdk/channel-entry-contract` | 捆绑的通道入口和设置入口合约、功能声明和惰性模块加载助手                                                                                                  |

使用`host.ui.registerNavigation`注册的导航项可以将`parent`设置为同一个插件中的另一个导航ID； `host.ui.pinNavigation(id)` 使用用户现有的侧边栏首选项固定已注册的项目。

### <a id="control-ui-conversation-dock"></a> Control UI 通话底座

`openclaw/plugin-sdk/control-ui` 中的 `ControlUiHost` 有这个可选成员：

```typescript
dock?: {
  /** Dock a conversation beside the current page; replaces a conversation dock already open. */
  openSession: (params: {
    sessionKey: string;
    agentId: string;
    label: string;
    context?: { page: string; detail?: Readonly<Record<string, string>> };
  }) => void;
  close: () => void;
  readonly openSessionKey: string | null;
};
```

在呈现停靠操作之前检查 `host.dock`。为预期对话提供 `sessionKey` 和 `agentId`； `label` 是其停靠选项卡标题。 `openSession` 重用主页聊天窗格、草稿、附件、位置和大小持久性以及关闭和放置控件。它取代了“主页”、“询问 OpenClaw”或之前停靠的对话。 `close()` 没有打开任何扩展坞，并且不会恢复之前的对话。

导航使扩展坞保持打开状态，但在与聊天或仪表板页面打开相同的会话和代理时它会隐藏。离开该页面会再次显示停靠栏。 `openSessionKey` 是可见的插件打开的会话密钥，或者在没有时为 `null`，包括隐藏或显示 Home 或 Ask OpenClaw 时。当该值更改时，`host.subscribe(...)` 侦听器将触发。

插件激活拥有打开的扩展坞。处理已安装的视图会停用其主机句柄，但会在导航期间保持扩展坞打开。仅当扩展坞仍属于该激活时，处置该激活才会关闭该扩展坞；它不会关闭由另一个激活打开的替换。保留的坞站操作在其查看或激活结束后会被拒绝。

正常的聊天窗格强制查看者的访问。只读查看者可以打开扩展坞并接收现有的只读编写器行为。查看器无法打开的会话会显示窗格的正常错误状态。对接不会授予额外的会话访问权限。

可选的 `context` 提供不受信任的环境提示。 `page` 可以命名插件页面； `detail` 是字符串字段的平面记录。主机按排序键顺序保留最多四个详细字段，省略空或过大的键，并将每个转义键限制为 32 个字符，将每个 JSON-encoded 值限制为 128 个字符。这些限制包括逃逸；价值限制包括其 JSON 报价。该页面使用现有的 64 个字符工作上下文限制。当省略 `context` 时，主机将像对主页一样构建当前页面的引用。

操作员可以在发送之前删除引用。在发送时，主机捕获快照并将其格式化为引用的参考数据，而不是访问另一个会话的指令或权限。发送的消息保留**Context附加的**表示； **技术细节**包括插件字段。队列和重试保留捕获的快照。

### <a id="capability-catalog-entry"></a> 能力目录条目

清单的 `capabilityCatalogEntry` 默认导出满足 `PluginCapabilityCatalogEntry` 和 `openclaw/plugin-sdk/plugin-entry`：

```ts
import type { PluginCapabilityCatalogEntry } from "openclaw/plugin-sdk/plugin-entry";
import { buildSpeechProvider } from "./speech-provider.js";

export default {
  speechProviders: [buildSpeechProvider()],
} satisfies PluginCapabilityCatalogEntry;
```

可选集合为 `speechProviders`、`realtimeTranscriptionProviders` 和 `realtimeVoiceProviders`。使用与完整注册相同的提供商工厂；保留它们的配置、别名、就绪函数、执行方法和不可枚举的内部方法。主机通过普通注册器注册描述符，保留其所有权和注册生命周期。

相反，导出可能是接收 `PluginCapabilityCatalogHostContext` 的同步工厂。它提供本机主机操作以进行准备、身份验证解析、提供程序标头、有界 HTTP 响应、WebSocket 转录和 capture/logging. 将提供程序使用的操作传递到其共享工厂中；保留同步构造函数并仅在需要时调用操作。这可以避免在目录构建或连接设置期间通过插件源加载器转换主机运行时模块。构造不得查询身份验证存储、启动会话或导入广泛的主机或插件运行时模块。冷发现不接收实时经纪人；主动注册保留其代理绑定行为。

`PluginCapabilityCatalogHostContext` 需要 `captureWsEventAsync`；对于使用它的工厂使用 `PluginCapabilityCatalogHostEntry`。已发货的 `PluginCapabilityCatalogContext` 和 `PluginCapabilityCatalogEntry` 类型仍然可用，包括已弃用的同步 `captureWsEvent` 成员。接受旧上下文的回调仍然可分配给主机注册回调：主机提供所有旧字段以及异步功能。主机组合拥有这些操作；目录验证不会加载捕获运行时来添加它们。

有关系列覆盖范围、兼容性、工件选择和故障行为，请参阅 [ 清单功能目录](/plugins/manifest#capability-catalogs)。

### <a id="compatibility-and-private-local-helpers"></a> 兼容性和私有本地辅助工具

已弃用的兼容性子路径仍会在其记录的窗口和保留阻止程序下导出。 2026 年 7 月的别名和未使用的子路径被删除，而仅捆绑的帮助程序被排除在类型公共 SDK 之外，并在下面标记为私有本地。生产专用 JavaScript 导出仍然可用于官方插件运行时。维护的列表为`scripts/lib/plugin-sdk-deprecated-public-subpaths.json`； CI 拒绝这些仅兼容子路径的捆绑导入。宽域桶 `plugin-sdk/agent-runtime`、`plugin-sdk/conversation-runtime`、`plugin-sdk/hook-runtime`、`plugin-sdk/media-runtime`、`plugin-sdk/plugin-runtime` 和 `plugin-sdk/security-runtime` 也同样被弃用，取而代之的是集中子路径。

已于 2026 年 9 月 30 日经 SDK- 所有者批准删除 `channel-lifecycle`、`channel-message`、`channel-reply-pipeline`、`config-runtime` 和 `infra-runtime` 兼容性子路径。使用 [ 迁移Guide](/plugins/sdk-migration) 用于重点替换和每次导出的差异。

OpenClaw 的 Vitest 支持的测试帮助程序子路径仅是存储库本地的，不再是包导出：`agent-runtime-test-contracts`、`channel-contract-testing`、`channel-target-testing`、`channel-test-helpers`、`compiled-subprocess-testing`、`plugin-state-test-runtime`、 `plugin-test-api`、`plugin-test-contracts`、`plugin-test-runtime`、`provider-http-test-mocks`、`provider-test-contracts`、`reply-payload-testing`、`sqlite-runtime-testing`、`test-env`、`test-fixtures`、 `test-live`、`test-live-auth`、`test-media-generation`、`test-media-understanding`、`test-node-mocks` 和 `testing`。 `ssrf-runtime-internal` 是为精确可信的本地服务插件保留的 JavaScript-only 主机运行时；它不是创作 API 的公共插件。

私有本地 `session-key-runtime` 提供纯 cron/dreaming 会话密钥分类和使用计数的转录文件名解析。捆绑内存读取器使用它时无需加载会话存储、工件清理或存档压缩。文件名解析与工件助手共享纯语法。现有的内存会话外观保留这些导出以实现已安装插件的兼容性。

### <a id="bundled-plugin-helper-subpaths"></a> Bundled 插件辅助模块子路径

在 2026 年 7 月的扫描之后，仅捆绑的帮助程序模块是私有本地的。包合约护栏对受支持的捆绑外观进行分类，这些外观在通用合约取代它们之前一直保持公开状态。新代码已弃用这些外观；请参阅下面的每行注释。

<AccordionGroup>
  <Accordion id="channel-subpaths" title="通道子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `createChannelConfigUiHints` |
    | `plugin-sdk/json-schema-runtime` | 2026 年 7 月后私有-本地；用于插件拥有的模式的缓存 JSON 模式验证助手 |
    | `plugin-sdk/channel-setup` | `defineChannelSetupContract`、通道自有设置 field/input 类型、`createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard` 以及 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` |
    | `plugin-sdk/channel-dm-policy` | 用于面向账户的设置策略描述符的 `createChannelDmPolicy` |
    | `plugin-sdk/setup` | 共享设置向导辅助工具、设置转换器、allowlist 提示、设置状态构建器 |
    | `plugin-sdk/setup-runtime` | `defineChannelSetupContract`, `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/archive` | `extractArchive`、`readArchiveEntry`、归档限制和条目类型 |
    | `plugin-sdk/root-walk` | `walkRootDirectory`、root-walk 选项和条目 |
    | `plugin-sdk/secret-file` | `createSecretFileAtomic`、同步和异步 secret 读取 |
    | `plugin-sdk/account-core` | 多账户 config/action-gate 帮助程序、默认账户后备帮助程序 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`，帐户 ID 规范化助手 |
    | `plugin-sdk/account-resolution` | 账户查找与默认回退辅助工具 |
    | `plugin-sdk/account-helpers` | 狭义账户-list/account-action 帮手 |
    | `plugin-sdk/access-groups` | 2026 年 7 月后私有-本地；访问组白名单解析和编辑组诊断帮助程序 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共享通道配置模式原语以及 Zod 和直接 JSON/TypeBox 构建器 |
    | `plugin-sdk/bundled-channel-config-schema` | 2026 年 7 月后私有-本地；捆绑的 OpenClaw 通道配置模式仅用于维护的捆绑插件 |
    | `plugin-sdk/chat-channel-ids` | 2026 年 7 月后私有-本地； `BUNDLED_CHAT_CHANNEL_IDS`、`BUNDLED_CHAT_CHANNEL_ENVELOPE_PREFIXES`、`ChatChannelId`。标准 bundled/official 聊天频道 ID 加上格式化程序 labels/aliases，适用于需要识别信封前缀文本而无需硬编码自己的表的插件。 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress-runtime` | 用于迁移通道接收路径的实验性高级通道入口运行时解析器、隐式提及策略解析器和路由事实构建器。与在每个插件中组装有效的允许列表、命令允许列表和遗留投影相比，更喜欢这样做。请参阅 [ 通道入口 API](/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-outbound` | 消息生命周期合同以及回复管道选项、收据、实时 preview/streaming、生命周期帮助程序、出站身份、有效负载规划、持久发送和消息发送上下文帮助程序。请参见 [ 通道出站 API](/plugins/sdk-channel-outbound)。 |
    | `plugin-sdk/inbound-envelope` | 共享呼入路线+信封构建器助手 |
    | `plugin-sdk/inbound-event-delivery` | 活动入站事件和成功通道发送之间的进程本地关联 |
    | `plugin-sdk/inbound-reply-dispatch` | 已弃用 `dispatchInboundReplyWithBase` 的兼容性垫片；其单独的普通稳定移除窗口尚未公布日期。使用 `plugin-sdk/channel-inbound` 作为入站跑步者，使用 `plugin-sdk/channel-outbound` 作为消息传递助手。 |
    | `plugin-sdk/outbound-media` | 2026 年 7 月后私有-本地；共享出站媒体加载和托管媒体状态助手 |
    | `plugin-sdk/poll-runtime` | 2026 年 7 月后私有-本地；缩小民意调查标准化助手 |
    | `plugin-sdk/thread-bindings-runtime` | 2026 年 7 月后私有-本地；线程绑定生命周期和适配器助手 |
    | `plugin-sdk/agent-media-payload` | 已弃用旧版 `Media*` 有效负载投影的兼容性外观。通过`MsgContext.media` / `toInboundMediaFacts(...)`传递有序事实；从 `plugin-sdk/media-local-roots` 导入本地根策略。 |
    | `plugin-sdk/conversation-runtime` | 已弃用 conversation/thread 绑定、配对和配置绑定助手的宽桶；更喜欢集中绑定子路径，例如 `plugin-sdk/thread-bindings-runtime` 和 `plugin-sdk/session-binding-runtime` |
    | `plugin-sdk/runtime-group-policy` | 运行时组策略解析助手 |
    | `plugin-sdk/channel-status` | 共享通道状态 snapshot/summary 帮助程序 |
    | `plugin-sdk/channel-config-primitives` | 窄通道配置模式原语 |
    | `plugin-sdk/channel-config-writes` | 2026 年 7 月后私有-本地；通道配置写入授权助手 |
    | `plugin-sdk/channel-plugin-common` | 共享通道插件前奏导出 |
    | `plugin-sdk/allowlist-config-edit` | 允许列表配置 edit/read 帮助程序 |
    | `plugin-sdk/direct-dm-guard-policy` | 2026 年 7 月后私有-本地；狭义直接-DM 预加密保护策略助手 |
    | `plugin-sdk/interactive-runtime` | 语义消息呈现、传递和遗留交互式回复助手。查看[消息Presentation](/plugins/message-presentation) |
    | `plugin-sdk/question-gateway-runtime` | 通过网关从通道交互处理程序解析运行时编写的 `ask_user` 选择 |
    | `plugin-sdk/channel-inbound` | 用于事件分类、上下文构建、格式化、根、反跳、提及匹配、提及策略和入站日志记录的共享入站帮助程序 |
    | `plugin-sdk/channel-inbound-debounce` | 具有待处理感知 `resolveDebounceMs`、可选 `canAppend` 批处理边界和 `maxWaitMs` 的键控入站批处理（默认为五个初始安静窗口，永远不会短于第一个安静窗口）。 `shouldBuffer(item)`先于`enqueue(item)`同步检查准入情况。取消包括等待发货的密封批次，但不包括正在进行的工作。 |
    | `plugin-sdk/channel-mention-gating` | 2026 年 7 月后私有-本地；狭窄的提及策略、提及标记和提及文本帮助程序，没有更广泛的入站运行时表面 |
    | `plugin-sdk/channel-streaming-config` | 用于医生合同闭包和其他不得加载回复管道的控制平面路径的依赖轻通道流式配置读取器（`getChannelStreamingConfigObject`、`resolveChannelStreamingNativeTransport`） |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | 通道消息操作帮助程序，以及为插件兼容性而保留的已弃用的本机模式帮助程序 |
    | `plugin-sdk/channel-route` | 2026 年 7 月后私有-本地；共享路由规范化、解析器驱动的目标解析、线程 ID 字符串化、dedupe/compact 路由键、解析目标类型和 route/target 比较助手 |
    | `plugin-sdk/channel-targets` | 2026 年 7 月后私有-本地；目标解析助手；路线比较调用者应使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | 渠道合同类型 |
    | `plugin-sdk/channel-feedback` | Feedback/reaction接线 |
    | `plugin-sdk/reply-payload` | 回复负载类型、规范化、content/media 检查、主机通知分类 （`isHostNoticePayload`）、本机问题选项排序、分块发送帮助程序、推理检测和回复扇出 |
  </Accordion>

9 月份的通道立面将作为 `removal-pending` 记录保持公开状态，直到其记录的拦截器得到解决；注册日期不会自动删除导出。请参阅 [ 删除时间表 ](/plugins/sdk-migration#removal-timeline)。 7 月份的别名，例如直接 DM 访问、回复选项、配对路径和通道运行时碎片已被删除；仅捆绑的助手是私有本地的。

  <Accordion id="provider-subpaths" title="提供者子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/provider-entry` | 2026 年 7 月后私有-本地； `defineSingleProviderPluginEntry` |
    | `plugin-sdk/provider-setup` | 2026 年 7 月后私有-本地；精心策划的 local/self-hosted 提供商设置帮助程序 |
    | `plugin-sdk/cli-backend` | 2026 年 7 月后私有-本地； CLI 后端默认值 + 看门狗常量 |
    | `plugin-sdk/provider-auth-runtime` | 2026 年 7 月后私有-本地；提供商身份验证运行时助手，包括 `startProviderOAuthLoopbackCallbackServer`、令牌交换、身份验证持久性和 API-key 解析 |
    | `plugin-sdk/provider-oauth-runtime` | 2026 年 7 月后私有-本地；通用提供程序 OAuth 回调类型、回调页面渲染、PKCE/state 帮助程序、授权输入解析、共享 OpenAI JWT 有效负载解码和身份提取、令牌过期帮助程序和中止帮助程序 |
    | `plugin-sdk/provider-auth-api-key` | 2026 年 7 月后私有-本地； API-key onboarding/profile-write 帮助程序，例如 `upsertApiKeyProfile` |
    | `plugin-sdk/provider-auth-result` | 2026 年 7 月后私有-本地；标准 OAuth 验证结果生成器 |
    | `plugin-sdk/provider-env-vars` | 2026 年 7 月后私有-本地；提供商身份验证环境变量查找助手 |
    | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`、OpenAI Codex auth-import 辅助工具、已弃用的 `resolveOpenClawAgentDir` 兼容性导出 |
    | `plugin-sdk/model-ref-parse` | 2026 年 7 月后私有-本地；轻量级模型引用解析、提供程序 ID 规范化和 `findNormalizedProviderValue`，用于配置提供程序查找，无需广泛的身份验证运行时 |
    | `plugin-sdk/provider-model-shared` | 2026 年 7 月后私有-本地； `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`resolveFamilyForwardCompatModel`、`selectPreferredLocalModelId`、`normalizeModelCompat`、`parseModelRef`、共享重播策略构建器、提供者端点帮助器和共享模型 ID 规范化帮助器 |
    | `plugin-sdk/provider-catalog-live-runtime` | 2026 年 7 月后私有-本地；用于受保护的 `/models`- 风格发现的实时提供者模型目录助手：`buildLiveModelProviderConfig`、提供者拥有的 `projectRows`、`buildOpenAICompatibleLiveModels`（默认投影，用于细化其行的提供者投影）、`fetchLiveProviderModelRows`、`getCachedLiveProviderModelRows`、`fetchLiveProviderModelIds`、 `LiveModelCatalogHttpError`、`clearLiveCatalogCacheForTests`、TTL 缓存和静态回退 |
    | `plugin-sdk/provider-catalog-runtime` | 用于合约测试的提供商目录扩充运行时挂钩和插件提供商注册表接口 |
    | `plugin-sdk/provider-catalog-shared` | 2026 年 7 月后私有-本地； `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` |
    | `plugin-sdk/provider-http` | 2026 年 7 月后私有-本地；通用提供程序 HTTP/endpoint 功能帮助程序、用于共享模型提供程序精确 origin/private-network 策略的 `resolveProviderTransportSsrFPolicy`、用于精确主动凭证反射检查的 `createProviderCredentialMatcher`、提供程序 HTTP 错误和音频转录多部分表单帮助程序 |
    | `plugin-sdk/provider-binary-stream` | 具有拟合前缀传递和显式 overflow/release 错误的直接读取器有界二进制流 |
    | `plugin-sdk/provider-web-fetch-contract` | 2026 年 7 月后私有-本地；狭义网络获取 config/selection 合约助手，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` |
    | `plugin-sdk/provider-web-fetch` | 2026 年 7 月后私有-本地； Web 获取提供程序 registration/cache 帮助程序 |
    | `plugin-sdk/provider-web-search-config-contract` | 2026 年 7 月后私有-本地；针对不需要插件启用接线的提供商的窄网络搜索 config/credential 帮助程序 |
    | `plugin-sdk/provider-web-search-contract` | 2026 年 7 月后私有-本地；狭义网络搜索 config/credential 合约助手，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 和范围凭证 setters/getters |
    | `plugin-sdk/provider-web-search` | 2026 年 7 月后私有-本地；网络搜索提供商 registration/cache/runtime 帮助程序 |
    | `plugin-sdk/embedding-providers` | 2026 年 7 月后私有-本地；通用嵌入提供程序类型和读取帮助程序，包括 `EmbeddingProviderAdapter`、`getEmbeddingProvider(...)` 和 `listEmbeddingProviders(...)`；插件通过 `api.registerEmbeddingProvider(...)` 注册提供程序，以便强制执行清单所有权 |
    | `plugin-sdk/embedding-provider-runtime-contract` | 公共文本批处理功能：`EmbeddingBatchChunk`、`EmbeddingBatchOptions` 和 `EmbeddingProviderBatchRuntime`；提供者拥有异步作业，而主机提供执行选项 |
    | `plugin-sdk/provider-tools` | 2026 年 7 月后私有-本地； `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks` 和 DeepSeek/Gemini/OpenAI 架构清理 + 诊断 |
    | `plugin-sdk/provider-usage` | 2026 年 7 月后私有-本地；提供程序使用情况快照类型、共享使用情况获取帮助程序和提供程序获取程序（例如 `fetchClaudeUsage`） |
    | `plugin-sdk/provider-stream` | 2026 年 7 月后私有-本地； `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、流包装器类型、纯文本工具调用兼容性和共享 Anthropic/Google/Kilocode/MiniMax/Moonshot/OpenAI/OpenRouter/Z.AI 包装器帮助程序 |
    | `plugin-sdk/provider-stream-shared` | 2026 年 7 月后私有-本地；公共共享提供程序流包装器助手，包括 `composeProviderStreamWrappers`、`createOpenAICompatibleCompletionsThinkingOffWrapper`、`createPlainTextToolCallCompatWrapper`、`createPayloadPatchStreamWrapper`、`createToolStreamWrapper`、`normalizeOpenAICompatibleReasoningPayload`、`setQwenChatTemplateThinking` 和 Anthropic/DeepSeek/OpenAI-compatible 流实用程序 |
    | `plugin-sdk/provider-transport-runtime` | 2026 年 7 月后私有-本地；本机提供程序传输助手，例如受保护的获取、工具结果文本提取、传输消息转换、可写传输事件流以及用于受保护的运行时事实重定位的 `splitSystemPromptRelocatableBoundary` |
    | `plugin-sdk/provider-onboard` | 2026 年 7 月后私有-本地；载入配置补丁助手 |
    | `plugin-sdk/global-singleton` | 2026 年 7 月后私有-本地；进程本地单例和映射助手 |
    | `plugin-sdk/group-activation` | 2026 年 7 月后私有-本地；窄组激活模式和命令解析助手 |
  </Accordion>

`createBoundedProviderBinaryStream` 需要请求 `cleanup` 回调。流取消和 `release()` 启动源取消、解锁读取器并运行一次清理，然后等待这两个操作。取消会传播源故障； `release()` 忽略它们。在这两种情况下，清理失败都会优先。溢出保留其拟合前缀和错误，无需等待清理；后来 `release()` 报告清理失败。在 EOF 或读取错误之后，调用者仍必须调用并等待 `release()`。

提供程序使用情况快照通常会报告一个或多个配额 `windows`，每个配额都带有标签、使用百分比和可选的重置时间。公开余额或帐户状态文本而不是可重置配额窗口的提供商应返回带有空 `windows` 数组的 `summary`，而不是伪造百分比。 OpenClaw 在状态输出中显示该摘要文本；仅当使用端点失败或未返回可用的使用数据时才使用 `error`。

  <Accordion id="auth-and-security-subpaths" title="身份验证和安全子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/command-status` | Command/help 消息生成器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` |
    | `plugin-sdk/approval-auth-runtime` | 审批者解析和同聊天 action-auth 辅助工具 |
    | `plugin-sdk/approval-client-runtime` | 本机执行批准 profile/filter 帮助程序 |
    | `plugin-sdk/approval-delivery-runtime` | 本机认证 capability/delivery 适配器 |
    | `plugin-sdk/approval-gateway-runtime` | 共享审批 Gateway 解析器 |
    | `plugin-sdk/approval-reference-runtime` | 2026 年 7 月后私有-本地；用于传输限制批准回调的稳定耐用定位器助手 |
    | `plugin-sdk/approval-handler-adapter-runtime` | 面向高频 Channel 入口的轻量原生审批适配器加载辅助工具 |
    | `plugin-sdk/approval-handler-runtime` | 更广泛的批准处理程序运行时助手；当接口足够时，更喜欢较窄的 adapter/gateway 接口 |
    | `plugin-sdk/approval-native-runtime` | 原生审批目标、账户绑定、route-gate、转发回退以及本地原生 exec 提示抑制辅助工具 |
    | `plugin-sdk/approval-reaction-runtime` | 2026 年 7 月后私有-本地；硬编码批准反应绑定、反应提示有效负载、反应目标存储、反应提示文本帮助程序以及用于本地本机执行提示抑制的兼容性导出 |
    | `plugin-sdk/approval-reply-runtime` | Exec/plugin 批准回复有效负载助手 |
    | `plugin-sdk/approval-runtime` | Exec/plugin/system-agent 批准负载帮助程序、批准能力构建器、批准 auth/profile 帮助程序、本机批准 routing/runtime 帮助程序以及结构化批准显示帮助程序（例如 `formatApprovalDisplayPath`） |
    | `plugin-sdk/command-auth-native` | 原生命令 auth、动态参数菜单格式化和原生 session-target 辅助工具 |
    | `plugin-sdk/command-detection` | 共享命令检测辅助工具 |
    | `plugin-sdk/command-primitives-runtime` | 面向高频 Channel 路径的轻量命令文本谓词 |
    | `plugin-sdk/command-surface` | 2026 年 7 月后私有-本地；命令体标准化和命令面助手 |
    | `plugin-sdk/allow-from` | Allow-from 解析、规范化、解析和匹配辅助工具 |
    | `plugin-sdk/provider-auth-login-flow-runtime` | 2026 年 7 月后私有-本地；用于专用通道和 Web 的惰性提供商身份验证登录流程帮助程序 UI 设备代码配对 |
    | `plugin-sdk/channel-secret-basic-runtime` | 非 TTS channel/plugin 秘密表面的狭义秘密合同导出和目标注册表构建器 |
    | `plugin-sdk/channel-secret-tts-runtime` | 2026 年 7 月后私有-本地；窄嵌套通道 TTS 秘密分配助手 |
    | `plugin-sdk/secret-ref-runtime` | 狭窄的 SecretRef 打字、解析、设置计划构建以及插件拥有的秘密提供者的设置 CLI 构建块 |
    | `plugin-sdk/secret-egress-runtime` | 私人官方插件运行时；命令范围的受保护模型凭证、公共 CA 传输以及通过 `withConfiguredModelEgress` 的可撤销 HTTPS 出口；不是第三方插件 API |
    | `plugin-sdk/security-runtime` | 已弃用的信任宽桶、DM 门控、根范围 file/path 帮助程序，包括仅创建写入、sync/async 原子文件替换、同级临时写入、跨设备移动后备、私有文件存储帮助程序、符号链接父级防护、外部内容、`redactSensitiveText`、恒定时间秘密比较和秘密收集帮手；更喜欢集中的 security/SSRF/secret 子路径 |
    | `plugin-sdk/ssrf-policy` | Host allowlist 和私有网络 SSRF 策略辅助工具 |
    | `plugin-sdk/ssrf-dispatcher` | 2026 年 7 月后私有-本地；没有广泛的基础运行时表面的狭窄固定调度程序助手 |
    | `plugin-sdk/ssrf-runtime` | 固定调度程序、SSRF-guarded 获取、`SsrFBlockedError` 和 `GuardedFetchRedirectError`、SSRF 策略帮助程序以及 loopback/private 主机分类 |
    | `plugin-sdk/secret-input` | 秘密输入解析助手和 `isBuiltInDefaultSecretProviderRef(config, ref)`，当内置 `env` 或 `store` 提供程序拥有其源的选定默认别名时返回 true，对于同源显式提供程序条目返回 false |
    | `plugin-sdk/secret-input-runtime` | 秘密输入规范化、SecretRef 强制、配置的秘密解析和清单拥有的能力可用性防护 |
    | `plugin-sdk/secret-ref-readonly` | 关闭 available/missing/blocked 解析和只读环境 SecretRefs 的提供者策略检查 |
    | `plugin-sdk/webhook-ingress` | Webhook request/target 帮助程序和原始 websocket/body 强制 |
    | `plugin-sdk/webhook-request-guards` | 请求主体 size/timeout 帮助程序，通过 `resolveAcceptedBrowserOrigin` 共享网关浏览器源接受，以及用于跟踪确认后处理的 `runDetachedWebhookWork` |
  </Accordion>

### <a id="sensitive-text-redaction"></a> 敏感文本密文

保留的 `openclaw/plugin-sdk/security-runtime` 导出及其 `@openclaw/plugin-sdk/security-runtime` 封装外观暴露了 `redactSensitiveText(text, options?)`。它返回经过编辑的字符串。

- `text` 是一个字符串。如果没有 `options`，该功能将使用日志记录配置。
- `mode` 接受 `"tools"`（默认）或 `"off"`。即使模式为 `"off"`，注册的确切秘密也会被屏蔽。
- `patterns` 是字符串、`RegExp` 对象或同步匹配器对象的只读数组。省略或空数组使用默认字符串规则。非空数组将替换该字符串列表。当模式为 `"tools"` 时，内置表单主体、结构化身份验证和 AWS 裸键保护始终适用。字符串规则在表单正文和结构化身份验证预处理后按顺序运行。
- String 条目接受正则表达式源（默认标志 ​​`gi`）或 `/source/flags`。字符串通过配置正则表达式安全验证器。正则表达式条目在不存在时获得 `g`。捕获选择要屏蔽的值；如果没有捕获，整个比赛都会被掩盖。
- `sensitiveFieldPatterns` 具有相同的条目类型，但由结构化编辑使用，而不是由此文本函数使用。

匹配器具有 `source: string`（诊断标签）和 `exec(input): Iterable<{ match: string; groups: string[]; input: string; offset: number }>`。它必须同步完成并为每次调用返回一个新的可迭代对象。将游标和其他扫描状态保留在该调用本地；同一个对象可以重复使用。每条记录必须满足以下要求：

- `input` 是在注册秘密屏蔽和早期规则之后传递给 `exec` 的当前字符串。不要使用原始用户文本的偏移量。
- `offset` 是当前字符串的 UTF-16 代码单元索引。 `match` 是从此处开始的非空精确子字符串。按升序发出记录，不重叠。
- `groups` 按顺序包含捕获字符串，使用 `""` 表示不匹配的组。最后一个非空捕获选择 `match` 中秘密的最后一次出现；空的捕获列表选择整个匹配。仅在该捕获中包含预期的秘密，以便周围的文本保持完整。

Matcher 对象和 `RegExp` 对象是编程参数。它们永远不会序列化为 `logging.redactPatterns`，它仍然是一个字符串数组。 OpenClaw 不会保留此参数类型的匹配器状态或迁移配置。现有的字符串和正则表达式调用程序仍然受支持。较旧的主机不需要支持匹配器对象；使用它们的插件必须需要支持它们的主机版本。

对于结构化 SecretRefs，当引用无法使用时，`resolveReadOnlyEnvSecretRef` 返回 `blocked`，包括允许的 env 引用，其值缺失或为空。调用者只能对 `missing` 应用现有的后备；被阻止的引用不得借用环境或身份验证配置文件凭据。其提供程序检查遵循特定于源的默认别名和显式环境允许列表。

使用`isLoopbackHost(host)`当插件必须仅接受本地计算机时。它接受`localhost`， IPv4环回文字`127.0.0.0/8`， `::1`， 括号内IPv6， 和IPv4-映射的IPv6环回文字。它解析IP文字而不是匹配文本前缀，所以DNS名称如`127.0.0.1.evil.com`不是环回。使用`isPrivateOrLoopbackHost(host)`仅当专用网络主机（例如RFC 1918地址也是有效的。

  <Accordion id="runtime-and-storage-subpaths" title="运行时和存储子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/runtime` | Runtime/logging/backup 帮助程序、插件安装路径警告和进程帮助程序 |
    | `plugin-sdk/runtime-env` | 窄范围 runtime env、logger、timeout、retry 和 backoff 辅助工具 |
    | `plugin-sdk/browser-cdp` | 私有主机运行时； `parseBrowserHttpUrl` 和 `redactCdpUrl` 用于浏览器 URL 处理。 JavaScript- 仅包导出，不是类型化的第三方 SDK 合约。 |
    | `plugin-sdk/browser-config` | 2026 年 7 月后私有-本地；支持规范化 profile/defaults、CDP URL 解析和浏览器控制身份验证帮助程序的浏览器配置外观 |
    | `plugin-sdk/agent-harness-completion` | 私有本地 JavaScript-only 用于官方harness插件的主机运行时；使用主机发出的请求者范围、保留的完成保管和源绑定事件接收器进行本机完成交付；没有通用的任务生命周期 |
    | `plugin-sdk/agent-harness-session-runtime` | 私有本地 JavaScript-only 用于官方harness插件的主机运行时；绑定租约、生成准入、初始化回滚和事务性删除；不是第三方插件 API |
    | `plugin-sdk/agent-harness-attempt-runtime` | 私有本地 JavaScript-only 用于官方harness插件的主机运行时； execution/settlement 截止日期、取消和 lifecycle/event 公布；不是第三方插件 API |
    | `plugin-sdk/agent-harness-runtime` | 代理harness运行时助手，包括有界的 `agentHarnessStructuredInput` form/URL 编译和执行表面。 `acquireSessionWriteLock`、`resolveSessionWriteLockAcquireTimeoutMs`、`resolveSessionWriteLockOptions` 和 `SessionWriteLockAcquireTimeoutConfig` 是已弃用的无操作兼容性导出，计划在 2026.10 版本系列中删除。它们不再阻塞或创建锁边车；harness应依赖于 OpenClaw 的每会话通道以及持久的作者声明和事务中栅栏。 |
    | `plugin-sdk/codex-client-version-runtime` | 私人-本地捆绑门面； `resolveCodexClientVersion` 返回管理 Codex 在此进程中运行的 Codex 二进制文件的版本，或者当 Codex 插件处于非活动状态时返回 `undefined` ；不适用于第三方插件 |
    | `plugin-sdk/codex-mcp-projection` | 2026 年 7 月后私有-本地；捆绑 Codex 帮助程序，用于将用户 MCP 服务器配置投影到 Codex 线程配置中；不适用于第三方插件 |
    | `plugin-sdk/native-hook-relay-runtime` | 用于保留本机直接子挂钩策略的私有本地捆绑运行时助手；不适用于第三方插件 |
    | `plugin-sdk/codex-session-transcript-runtime` | 用于转录镜像写入和所有者绑定上下文读取的私有本地捆绑 Codex 帮助程序，包括非活动的隐身演员适配器；不适用于第三方插件 |
    | `plugin-sdk/channel-runtime-context` | 通用 Channel runtime-context 注册和查找辅助工具 |
    | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` |
    | `plugin-sdk/plugin-command-runtime` | 与 registry 生成绑定的原生插件命令候选项、终端目录决策和精确选定的 dispatch 执行 |
    | `plugin-sdk/plugin-runtime` | 已弃用插件 command/hook/http/interactive 助手的宽桶；更喜欢集中插件运行时子路径 |
    | `plugin-sdk/hook-runtime` | 已弃用 webhook/internal 钩子管道助手的宽桶；更喜欢集中 hook/plugin 运行时子路径 |
    | `plugin-sdk/lazy-runtime` | 惰性运行时 import/binding 帮助程序，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` |
    | `plugin-sdk/process-runtime` | 2026 年 7 月后私有-本地；具有每个流和聚合输出上限的有界进程执行、选择加入流错误终止、可配置的 TERM-to-KILL 宽限、`createOwnedStdioProcess` / `closeOwnedStdioProcess` 和 `OwnedStdioProcess` / `OwnedStdioProcessOptions` 用于双向 CLI 生命周期和清理， `prepareSecretInputStdio` 用于一次性凭证描述符，`createCpuTrackedWorker` 用于共享 Worker 资源和生命周期诊断 |
    | `plugin-sdk/node-host` | 2026 年 7 月后私有-本地； Node-host 可执行解析和 PTY 恢复助手 |
    | `plugin-sdk/node-selection-runtime` | 用于共享功能门控节点选择策略的私有-本地捆绑运行时外观 |
    | `plugin-sdk/cli-argv` | 面向 CLI 元数据的低依赖根选项解析，包括 `getRootOptionAwareCommandPath` 和 `consumeRootOptionToken` |
    | `plugin-sdk/cli-runtime` | 2026 年 7 月后私有-本地；已弃用 CLI 格式化、等待、版本、参数调用和惰性命令组帮助程序的宽桶；更喜欢集中的 CLI/runtime 子路径 |
    | `plugin-sdk/node-cli-runtime` | 共享节点 CLI 网关选项、调用信封、终端呈现和插件拥有的节点命令的授权提示错误处理 |
    | `plugin-sdk/qa-runner-runtime` | 2026 年 7 月后私有-本地；支持通过 CLI 命令界面公开插件 QA 场景的外观 |
    | `plugin-sdk/tts-runtime` | 2026 年 7 月后私有-本地；支持文本转语音配置模式和运行时助手的外观 |
    | `plugin-sdk/gateway-config-runtime` | 用于依赖轻网关端口解析 （`resolveGatewayPort`）、检查路径分类 （`classifyGatewayProbePath`）、受保护路径检查 （`resolvePluginRoutePathContext`、`isProtectedPluginRoutePathFromContext`） 和凭证路径的未解析引用检测 （`hasUnresolvedConfigValue(cfg, segments)`，它采用根运行时配置和具体路径段，以便捆绑通道） 的私有本地捆绑运行时外观可以拒绝带有未解析的 `${VAR}` 的请求）；不适用于第三方插件 |
    | `plugin-sdk/gateway-method-runtime` | 用于声明 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 的经过身份验证的插件 HTTP 路由和 RPC 处理程序的调用者范围网关调度 |
    | `plugin-sdk/gateway-runtime` | Gateway client、事件循环就绪的 client 启动辅助工具、Gateway CLI RPC、Gateway 协议错误、对外公布的 LAN Host 解析以及 Channel 状态 patch 辅助工具 |
    | `plugin-sdk/websocket-runtime` | Node- 兼容的 `WebSocket`、`WebSocketServer` 和 `createWebSocketStream` 导出由已安装的 `ws` 软件包支持，加上一次性观察员票证、WebSocket keepalive 和升级拒绝帮助程序。当插件需要跨受支持的运行时的完整 Node `ws` 选项和事件契约时，请使用此子路径。 |
    | `plugin-sdk/config-contracts` | 插件配置形状的集中配置界面，例如 `OpenClawConfig` 和 channel/provider 配置类型，加上轻依赖运行时助手 `resolveGatewayPublicOrigin(cfg)`，它返回标准化 `gateway.publicOrigin`（裸 http（s） 原点，可选反向代理路径，无 query/hash）或 `undefined`未设置，用于构建返回网关的链接 |
    | `plugin-sdk/plugin-config-runtime` | runtime plugin-config 辅助工具的已弃用兼容性门面；新插件使用 `api.pluginConfig` 以及聚焦的 config contracts、snapshots 和 mutation 辅助工具 |
    | `plugin-sdk/config-mutation` | 事务性配置变更辅助工具，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` |
    | `plugin-sdk/message-tool-delivery-hints` | 2026 年 7 月后私有-本地；共享消息工具传递元数据提示字符串 |
    | `plugin-sdk/runtime-config-snapshot` | 当前进程配置快照辅助工具，例如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和测试快照 setter |
    | `plugin-sdk/text-autolink-runtime` | 2026 年 7 月后私有-本地；无需宽文本桶的文件引用自动链接检测 |
    | `plugin-sdk/reply-runtime` | 共享 inbound/reply 运行时助手、分块、调度、心跳、回复规划器 |
    | `plugin-sdk/reply-dispatch-runtime` | 缩小回复 dispatch/finalize 和对话标签助手 |
    | `plugin-sdk/reply-history` | 共享短窗口 reply-history 辅助工具。新的消息轮次代码应使用 `createChannelHistoryWindow`；较低层级的 map 辅助工具仅保留为已弃用的兼容性导出 |
    | `plugin-sdk/reply-reference` | 2026 年 7 月后私有-本地； `createReplyReferencePlanner` |
    | `plugin-sdk/reply-chunking` | 窄 text/markdown 分块助手，包括 `chunkByParagraph` 和 `splitLongParagraphs: false`，用于特定于传​​输的最终大小调整 |
    | `plugin-sdk/agent-scope-runtime` | 针对轻依赖控制平面和迁移路径的集中代理 ID、目录、默认代理和会话代理范围解析帮助程序。新插件使用 `resolveSessionAgentIdsStrict` 或 `resolveSessionAgentIdStrict` 以及明确或准备好的所有者。旧版解析器名称在 2026 年 11 月 29 日之前保留环境系统代理回退；请参阅 [ 插件兼容性](/plugins/compatibility#session-agent-resolution-aliases)。 |
    | `plugin-sdk/session-store-runtime` | 会话工作流程帮助程序（`getSessionEntry`、`listSessionEntries`、`patchSessionEntry`、`upsertSessionEntry`）、repair/lifecycle 帮助程序（`deleteSessionEntry`、`cleanupSessionLifecycleArtifacts`、`resolveSessionStoreBackupPaths`）、过渡标记帮助程序`sessionFile` 值、按会话身份读取的有界最近 user/assistant 转录文本、会话存储 path/session-key 帮助程序以及更新读取，无需广泛配置 writes/maintenance 导入 |
    | `plugin-sdk/session-catalog` | 外部会话目录合约、共享 cursor/parameter/transcript 分页、显式本地加节点系列组成、节点主机绑定、采用帮助程序和历史导入 |
    | `plugin-sdk/session-discussion` | 外部会话讨论提供商合同、注册和标准 Control UI 会话路径构建 |
    | `plugin-sdk/session-transcript-runtime` | 2026 年 7 月后私有-本地；转录本标识、有界原始和可见光标、范围 target/read/write 帮助程序、具有可移植发件人属性的只读本机转录本目录页面、可见消息条目投影、更新发布、写入锁定和转录本内存命中键 |
    | `plugin-sdk/sqlite-runtime` | 2026 年 7 月后私有-本地；通过 `openOpenClawAgentSqliteWorkerStoreV2` 的工作人员拥有的代理存储，具有所需的实时权限和明确的工作人员准备。可写本机句柄和主机 SQL/callback 帮助程序保留其已发布的行为，但在 2026 年 12 月 31 日之前已弃用，并在 2027 年 1 月的第一个稳定版本中删除；仅在工作后端内使用 `sqlite-worker-runtime`。仍支持显式只读检查和离线 Doctor 维护。仅类型 `Generated` 和 `Selectable` 模型在 Kysely 表定义中生成列和选定行。 `compileSqliteQueryBindings` 编译固定的 Kysely SQL，并为调用者拥有的本机语句提供新的绑定；语句的生命周期由调用者保留。 `iterateSqliteQuerySync` 流式传输 Kysely 查询行以进行增量解码；在关闭数据库之前使用迭代器。 `sqliteStringSet` 将字符串成员资格绑定为一个 SQLite JSON 表值查询参数，保留一个查询快照，而无需可变计数占位符列表。 `borrowOpenClawAgentDatabase` 返回 `{ db, release }`；主动借用可防止缓存驱逐，`release()` 不会关闭句柄，并且显式所有者处置仍会撤销它。 `withOpenClawAgentDatabaseAsync` 异步接纳连接，并通过操作结算保留其原始身份；它不会将回调执行移出调用者线程。 |
    | `plugin-sdk/sqlite-worker-runtime` | 用于工作后端及其共享助手的私有本地本机 SQLite、Kysely 查询、同步事务和操作准入原语。 `runSqliteDeferredTransactionSync` 将同步读取分组到一个 SQLite 快照中；它的回调不得返回 Promise。 `admitSqliteSchema` 承认与共享物理目录的跟踪连接； `tableExists` 无需进行其他目录查询即可使用这些事实。 `getSqliteDatabaseAdmission`、`publishSqliteDatabaseAdmission` 和 `SqliteDatabaseAdmissionKey` 每个物理数据库每个进程共享一次所有者验证的事实，包括工作进程重新打开；成功初始化或迁移后发布，并用 `schemaDependent: true` 标记与模式相关的事实。 `hasSqliteWorkerOutcomeUnknown` 在不导入主机生命周期代码的情况下对不确定的工作人员写入进行分类。直接导入现有所有者，以便工作人员不会加载主机数据库生命周期代码。主机存储创建和生命周期协调仍保留在 `sqlite-runtime` 上。 |
    | `plugin-sdk/cron-store-runtime` | 2026 年 7 月后私有-本地； Cron 存储 path/load/save 帮助程序 |
    | `plugin-sdk/state-paths` | 共享 config/state/OAuth 路径助手。 `resolveConfigPath(env?, stateDir?, homedir?)` 返回选定的本地配置路径，而不加载配置或打开状态数据库。它尊重 `OPENCLAW_CONFIG_PATH`（包括相对于主目录的扩展）、选定的状态目录以及标准回退之前的现有旧配置候选。它可以检查文件系统是否存在；它不会创建文件、验证配置内容或建立路径 ownership/permission 权限。使用它来预配置本机引导程序选择，而不是复制路径策略；调用者仍然强制执行他们的文件系统和生命周期准入检查。 |
    | `plugin-sdk/plugin-state-runtime` | 2026 年 7 月后私有-本地；插件范围的键控状态和 BLOB 合约以及连接编译指示、经过验证的 WAL 维护以及原子 STRICT-schema 迁移帮助程序。插件状态租约被删除；使用 SQLite 事务和密钥存储代替 |
    | `plugin-sdk/routing` | Route/session-key/account绑定助手，例如`resolveAgentRoute`， `buildAgentSessionKey`， 和`resolveDefaultAgentBoundAccountId`。使用`normalizeAgentId`当省略输入时应解析为`main`；使用返回结果`normalizeAgentIdStrict`对于明确提供的ID不得回退到默认代理。 |
    | `plugin-sdk/status-helpers` | 共享 channel/account 状态摘要帮助程序、运行时状态默认值和问题元数据帮助程序 |
    | `plugin-sdk/target-resolver-runtime` | 2026 年 7 月后私有-本地；共享目标解析器助手 |
    | `plugin-sdk/string-normalization-runtime` | 2026 年 7 月后私有-本地； Slug/string 规范化和 ASCII 控制字符检测助手 |
    | `plugin-sdk/request-url` | 2026 年 7 月后私有-本地；从 fetch/request-like 输入中提取字符串 URL |
    | `plugin-sdk/run-command` | 具有标准化 stdout/stderr 结果的定时命令运行程序 |
    | `plugin-sdk/param-readers` | 常见 tool/CLI 参数读取器 |
    | `plugin-sdk/tool-plugin` | 定义简单的类型化 agent-tool 插件，并公开静态元数据以生成 manifest |
    | `plugin-sdk/tool-payload` | 2026 年 7 月后私有-本地；从工具结果对象中提取标准化有效负载 |
    | `plugin-sdk/tool-results` | 类型化文本和 JSON agent tool 结果构建器 |
    | `plugin-sdk/tool-send` | 从工具参数中提取规范化的发送目标字段 |
    | `plugin-sdk/sandbox` | 2026 年 7 月后私有-本地；沙箱后端类型和 SSH/OpenShell 命令帮助程序，包括快速失败执行命令预检和 `resolveReadOnlyWorkspaceSkillMounts`，用于在可写工作区中共享只读技能覆盖 |
    | `plugin-sdk/temp-path` | 共享临时下载路径助手和私有安全临时工作区。 `buildRandomTempFilePath` 保留相对的 `tmpDir` 路径并修剪可选的 `uuid`；空白值生成 UUID，而非空白值必须是安全的文件名组件。 `sanitizeTempFileName` 向保留的 Windows 设备名称添加后缀，保留其扩展名。 |
    | `plugin-sdk/logging-core` | 子系统 logger 和脱敏辅助工具 |
    | `plugin-sdk/markdown-table-runtime` | 2026 年 7 月后私有-本地； Markdown 表模式和转换助手 |
    | `plugin-sdk/model-session-runtime` | Model/session 覆盖助手，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` |
    | `plugin-sdk/talk-config-runtime` | 2026 年 7 月后私有-本地；讨论提供商配置解析助手 |
    | `plugin-sdk/json-store` | 小JSON 状态read/write 帮手 |
    | `plugin-sdk/json-unsafe-integers` | 2026 年 7 月后私有-本地； JSON 解析助手将不安全的整数文字保留为字符串 |
    | `plugin-sdk/file-lock` | 2026 年 7 月后私有-本地；所有者范围内的可重入文件锁助手加上医生安全的回收绝对陈旧的、未更改的退役锁边车。仅当调用者传递相同的逻辑操作 `reentrantOwner` 时，嵌套获取才共享引用计数；无主或异主呼叫正常竞争 |
    | `plugin-sdk/persistent-dedupe` | 基于磁盘的去重缓存辅助工具 |
    | `plugin-sdk/ingress-effect-once` | 耐用的 claim/commit 防护装置可防止不安全重复的入口副作用 |
    | `plugin-sdk/acp-runtime` | 2026 年 7 月后私有-本地； ACP runtime/session 和回复调度助手 |
    | `plugin-sdk/acp-runtime-backend` | 2026 年 7 月后私有-本地；用于启动加载插件的轻量级 ACP 后端注册和回复调度帮助程序 |
    | `plugin-sdk/acp-binding-resolve-runtime` | 2026 年 7 月后私有-本地；只读 ACP 绑定解析，无需生命周期启动导入 |
    | `plugin-sdk/boolean-param` | 宽松布尔参数读取器 |
    | `plugin-sdk/dangerous-name-runtime` | 2026 年 7 月后私有-本地；危险名称匹配解析助手 |
    | `plugin-sdk/device-bootstrap` | 设备引导和配对令牌帮助程序，包括 `BOOTSTRAP_HANDOFF_OPERATOR_SCOPES`。异步 `resolvePairingGatewayUrl(config, options)` 解析通告的 WebSocket 端点，而不颁发凭证，并返回 `{ url, source }` 或 `{ error }`。传递 `env`、`networkInterfaces`、用于配对覆盖的可选 `publicUrl` 以及用于 Tailscale 发现的可选 `runCommandWithTimeout`。默认 `publicOriginPreference: "fallback"` 保留设备路由：`publicUrl`、首选远程 URL、Tailscale、非首选远程 URL、绑定派生地址，然后是仅环回错误之前的 `gateway.publicOrigin`。在 `publicUrl` 之后、发现之前，云注册通过 `publicOriginPreference: "prefer"` 选择 `publicOrigin`。 `preferRemoteUrl` 将遥控器 URL 移动到 Tailscale 之前； `useLocalGateway` 省略。默认 `urlPathMode: "preserve"` 将上下文路径保留在完全限定的 URL 中，用于加入代码、QR 设置和云注册； `/pair` 传递 `urlPathMode: "origin-only"` 以保留其先前的 URL 映射。共享惰性运行时绑定程序推迟加载解析器直到调用。 |
    | `plugin-sdk/extension-shared` | 共享 passive-channel、状态和 ambient proxy 辅助工具原语 |
    | `plugin-sdk/models-provider-runtime` | `/models` command/provider 回复助手。在可用选项旁边显示 `ModelsProviderData.refreshWarning`，并在保存的菜单选项不再可用时使用 `MODEL_PICKER_CHANGED_MESSAGE`。 |
    | `plugin-sdk/skill-commands-runtime` | 同步技能命令列表。远程工作空间仅公开网关拥有的技能；菜单不等待harness。 |
    | `plugin-sdk/native-command-registry` | 本机命令 registry/build/serialize 帮助程序 |
    | `plugin-sdk/agent-harness` | 用于低级代理工具的实验性可信插件表面：工具类型、主动运行的 steer/abort 帮助程序、OpenClaw 工具桥帮助程序、运行时计划工具策略帮助程序、终端结果分类、工具进度 formatting/detail 帮助程序和尝试结果实用程序 |
    | `plugin-sdk/async-lock-runtime` | 2026 年 7 月后私有-本地；用于小型运行时状态文件的进程本地异步锁助手 |
    | `plugin-sdk/channel-activity-runtime` | 2026 年 7 月后私有-本地；频道活动遥测助手 |
    | `plugin-sdk/concurrency-runtime` | 2026 年 7 月后私有-本地；有界异步任务并发 （`runTasksWithConcurrency`）、可取消的许可准入 （`createPermitPool`） 和生命周期拥有的工作 （`AsyncWorkScope`）。业主停止新的准入，等待`drain()`才释放资源；工作范围不授予执行权。 |
    | `plugin-sdk/dedupe-runtime` | 内存和持久化后端去重缓存辅助工具 |
    | `plugin-sdk/delivery-queue-runtime` | 2026 年 7 月后私有-本地；出站待交货排水助手 |
    | `plugin-sdk/file-access-runtime` | 2026 年 7 月后私有-本地；安全本地文件、路径包含、临时根、媒体源路径、目录持久性和借用句柄 I/O：`readFileHandleBounded` 在字节上限下读取 EOF； `readFileWindowFully` 通过短读取填充位置缓冲区； `writeFileWindowFully` 完成短写入，无需截断、同步、回滚； `sha256File` 从路径或借用的句柄流式传输有界 SHA-256 摘要。借用的手柄保持打开状态。 `tempFile` 创建一个拥有的临时子目录用于暂存；它的默认清理在删除之前会检查目录身份。 `resolvePathPrefixSync` 在物理符号链接遍历之后观察到符号链接已解析且原始缺失后缀的现有前缀，而无需授权以后访问。 |
    | `plugin-sdk/heartbeat-runtime` | 2026 年 7 月后私有-本地；心跳唤醒、事件和可见性助手 |
    | `plugin-sdk/expect-runtime` | 2026 年 7 月后私有-本地；用于可证明运行时不变量的必需值断言助手 |
    | `plugin-sdk/number-runtime` | 2026 年 7 月后私有-本地；数字强制转换助手 |
    | `plugin-sdk/secure-random-runtime` | 2026 年 7 月后私有-本地；保护 token/UUID 帮助程序 |
    | `plugin-sdk/system-event-runtime` | 专注于系统事件队列、快照检查和消费助手；在使用选定条目时保留每个快照的不透明事件 ID |
    | `plugin-sdk/transport-ready-runtime` | 2026 年 7 月后私有-本地；运输准备等待助手 |
    | `plugin-sdk/exec-approvals-runtime` | 2026 年 7 月后私有-本地；没有广泛的运行时桶的 Exec 批准策略文件助手 |
    | `plugin-sdk/collection-runtime` | 小型有界缓存辅助工具 |
    | `plugin-sdk/diagnostic-flags` | `isDiagnosticFlagEnabled` 适用于仅标志消费者，无需事件、跟踪或编辑初始化 |
    | `plugin-sdk/diagnostic-runtime` | Diagnostic 标志、事件、trace-context 和低基数维度规范化辅助工具 |
    | `plugin-sdk/error-runtime` | Error graph、格式化、未知值强制转换、共享错误分类辅助工具、`PlatformMessageNotDispatchedError`、`isApprovalNotFoundError` |
    | `plugin-sdk/fetch-runtime` | 2026 年 7 月后私有-本地；包装的提取、代理、EnvHttpProxyAgent 选项和固定的查找帮助程序 |
    | `plugin-sdk/proxy-capture` | 调试代理配置、异步捕获存储和非创建读取器、HTTP/WebSocket 捕获事件、生命周期帮助程序以及附带的同步兼容性 API；参见 [async capture](/plugins/sdk-subpaths#asynchronous-proxy-capture) |
    | `plugin-sdk/runtime-fetch` | 2026 年 7 月后私有-本地；无需 proxy/guarded-fetch 导入的调度程序感知运行时获取 |
    | `plugin-sdk/blob-runtime` | 私人官方插件运行时；用于同步 Blob 构造的精确缓冲区视图 |
    | `plugin-sdk/inline-image-data-url-runtime` | 2026 年 7 月后私有-本地；内联图像数据 URL 清理程序和签名嗅探助手，无需广泛的媒体运行时界面 |
    | `plugin-sdk/response-limit-runtime` | 2026 年 7 月后私有-本地；字节、空闲和截止时间限制的响应主体读取器，没有广泛的媒体运行时表面 |
    | `plugin-sdk/session-binding-runtime` | 2026 年 7 月后私有-本地；未配置绑定路由或配对存储的当前对话绑定状态 |
    | `plugin-sdk/context-visibility-runtime` | 2026 年 7 月后私有-本地；上下文可见性解析和补充上下文过滤，无需广泛的 config/security 导入 |
    | `plugin-sdk/string-coerce-runtime` | 浏览器安全的原语强制、字符串规范化、日期有效时间戳和 UTF-16 截断 |
    | `plugin-sdk/html-entity-runtime` | 2026 年 7 月后私有-本地；无需宽文本实用程序的单遍分号终止 HTML5 实体解码 |
    | `plugin-sdk/text-grapheme` | `findGraphemeChunkEnd` 的私人官方插件外观。发布构建器捆绑了共享的纯规范化实现，因此插件在早于此 SDK 绑定的受支持主机上保留字形边界。 |
    | `plugin-sdk/text-utility-runtime` | 2026 年 7 月后私有-本地；低级文本和路径助手，包括预算感知字素块选择、UTF-8 前缀截断和五实体 HTML 转义 |
    | `plugin-sdk/simple-completion-runtime` | 2026 年 7 月后私有-本地；为轻量级代理任务准备了简单完成模型助手和辅助文本提取 |
    | `plugin-sdk/widget-html` | 小部件 CDN 起源、完整文档检测、尺寸验证和工具输入错误 |
    | `plugin-sdk/host-runtime` | 2026 年 7 月后私有-本地；主机名和 SCP 主机规范化帮助程序 |
    | `plugin-sdk/retry-runtime` | 2026 年 7 月后私有-本地；重试配置和重试运行器助手 |
    | `plugin-sdk/agent-runtime` | 已弃用代理 dir/identity/workspace 帮助程序的宽桶，包括 `resolveAgentDir`、`resolveDefaultAgentDir` 以及已弃用的 `resolveOpenClawAgentDir` 兼容性导出；更喜欢集中的 agent/runtime 子路径 |
    | `plugin-sdk/directory-runtime` | 配置支持目录 query/dedup |
    | `plugin-sdk/keyed-async-queue` | 2026 年 7 月后私有-本地； `KeyedAsyncQueue` |

    私有进程调用者在生成之前声明 `using prepared = prepareSecretInputStdio(stdio, secretInput)`，然后调用 `await prepared?.deliverTo(child)` 一次。交付关闭写入器并将临时凭证缓冲区清零；处理会关闭所有未传输的描述符，包括在生成抛出时。 POSIX 使用匿名管道，支持描述符路径读取器，无需凭证文件； Windows 保留其重叠的子管道。当传递失败时，调用者自己负责子清理。

  </Accordion>

  <Accordion id="capability-and-testing-subpaths" title="能力和测试子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/media-runtime` | 已弃用的宽泛 media barrel，包括 `saveRemoteMedia`、`saveResponseMedia`、`readRemoteMediaBuffer` 和已弃用的 `fetchRemoteMedia`；请优先使用 `plugin-sdk/media-store`、`plugin-sdk/media-mime`、`plugin-sdk/outbound-media` 和 capability runtime 子路径；当 URL 应转换为 OpenClaw media 时，优先使用 store 辅助工具，再读取 buffer |
    | `plugin-sdk/media-local-roots` | 聚焦的 `getAgentScopedMediaLocalRoots(...)` 和具备策略感知能力的 `getAgentScopedMediaLocalRootsForSources(...)` 辅助工具，用于插件自有的本地媒体读取 |
    | `plugin-sdk/media-mime` | 窄范围 MIME 规范化、文件扩展名映射、MIME 检测和媒体类型辅助工具 |
    | `plugin-sdk/media-store` | 窄媒体存储助手，例如 `saveMediaBuffer`、`saveMediaStream` 和 `saveMediaSource`（本地路径或 HTTP（S） URL 到托管媒体，具有核心的 SSRF、字节、重定向和超时限制） |
    | `plugin-sdk/media-generation-runtime` | 2026 年 7 月后私有-本地；共享媒体生成故障转移助手、候选选择和缺失模型消息传递 |
    | `plugin-sdk/media-understanding` | media-understanding Provider 类型和辅助工具的已弃用兼容性门面；新 Provider 通过注入的插件 API 注册，并将请求辅助工具保留在插件内部 |
    | `plugin-sdk/media-understanding-runtime` | 通道音频 preflight/echo 帮助程序以及图像、视频、音频和结构化媒体理解运行时功能 |
    | `plugin-sdk/computer-use` | 计算机使用 v2 操作和快照架构、JSON 解析器、验证、功能描述符和提供程序注册 |
    | `plugin-sdk/native-command-config-runtime` | 轻依赖本机命令和技能启用配置检查 |
    | `plugin-sdk/text-chunking` | 字形感知的出站文本和偏移量保留范围分块、通过 `findCodeRegions(text, { includeSource: true, syntax: "commonmark" })`（默认为 GFM）选择加入内联代码源映射和渲染器语法、代理安全 `avoidTrailingHighSurrogateBreak` 边界助手、markdown chunking/render 助手、引号感知 HTML 标签标记化、降价表转换、指令标签剥离和安全文本实用程序 |
    | `plugin-sdk/speech` | 2026 年 7 月后私有-本地；语音提供程序类型以及面向提供程序的指令、注册表、验证、OpenAI- 兼容 TTS 构建器和语音助手导出 |
    | `plugin-sdk/speech-core` | 2026 年 7 月后私有-本地；共享语音提供程序类型、注册表、指令、规范化和语音助手导出 |
    | `plugin-sdk/speech-provider` | 私有本地 JavaScript-only 官方插件的主机运行时；语音提供程序类型、配置和指令帮助程序以及 OpenAI- 兼容的提供程序工厂，无需主机注册表或合成导入。 |
    | `plugin-sdk/speech-settings` | 不含 Provider registry 或 synthesis runtime 的轻量 TTS 配置解析和规范化原语 |
    | `plugin-sdk/realtime-transcription` | 2026 年 7 月后私有-本地；实时转录提供程序类型、注册表帮助程序和共享 WebSocket 会话帮助程序 |
    | `plugin-sdk/realtime-transcription-session` | 私有本地 JavaScript-only 官方插件的主机运行时；共享 WebSocket 会话构造和类型，无需加载主机提供商注册表。将其用于提供程序实施导入。 |
    | `plugin-sdk/realtime-bootstrap-context` | 2026 年 7 月后私有-本地； `resolveRealtimeBootstrapContextInstructions` 加载有界配置文件上下文，带有可选的工作区相关 `files: readonly string[]` 和 `maxChars`（默认 `12000`）。 `resolveRealtimeVoiceAgentContextInstructions` 在 `includeIdentity: true`（默认 `false`）时添加始终存在的代理上下文段落和配置的身份。默认配置文件名称及其类型仍然可用，如 `REALTIME_BOOTSTRAP_CONTEXT_FILE_NAMES` 和 `RealtimeBootstrapContextFileName`。 |
    | `plugin-sdk/realtime-voice-audio-queue` | 私有本地 JavaScript-only 主机运行时，用于捆绑或单独发布的官方插件；用于惰性实时语音提供者外观的窄界音频队列接口，无需导入更广泛的实时语音运行时；不适用于第三方插件 |
    | `plugin-sdk/realtime-voice-playback` | 用于音频可听性和输出活动跟踪的私人官方插件外观。源工作人员避免会话运行时；已发布的插件使用已建立的 `realtime-voice` 主机绑定来实现兼容性。 |
    | `plugin-sdk/realtime-voice-provider` | 私有本地 JavaScript-only 官方插件的主机运行时；提供程序类型、音频 formats/codecs、音频能量和输出活动、响应结果以及连接生命周期原语，无需主机提供程序注册或代理咨询执行。媒体工作人员使用此表面来保持主机会话运行时远离其启动路径。 |
    | `plugin-sdk/realtime-voice-activation` | 私人-本地； Doctor 和控制平面路径的激活名称验证和前缀规范化不得加载实时语音运行时 |
    | `plugin-sdk/realtime-voice` | 2026 年 7 月后私有-本地；实时语音提供程序类型、注册表帮助程序、共享音频 energy/speech-onset 门和实时语音行为帮助程序，包括独立于传输的会话工具、输出活动跟踪和用于通道拥有的呼叫的 `registerRealtimeVoiceSelection`。将每个座席运行绑定到确切的呼叫和当前发言者权限；回合后释放其绑定，并在呼叫结束时取消注册。在采用就绪连接之前，替换者必须重新验证所提供的请求。对于官方运行时消费者，发送者身份验证合约修订版 1 转发经过入口身份验证的 `senderId` 和 `senderIsOwner` 不变； ingress 拥有身份验证，需要切换的消费者必须拒绝其他修改。 |
    | `plugin-sdk/meeting-page-script-runtime` | 私有本地 JavaScript-only 官方浏览器会议插件的主机运行时；共享脚本并留下页面脚本源构建器；不是第三方插件 API |
    | `plugin-sdk/meeting-runtime` | 浏览器会议会话运行时、实时音频 engines/transports、`MeetingPlatformAdapter` 及其声明性 `defineBrowserMeetingPlugin` 工厂、browser/node 控制、座席咨询、语音呼叫委派、设置检查和 SoX 命令帮助程序 |
    | `plugin-sdk/image-generation` | 2026 年 7 月后私有-本地；图像生成提供程序类型以及图像 asset/data URL 帮助程序和 OpenAI- 兼容的图像提供程序生成器 |
    | `plugin-sdk/image-generation-core` | 2026 年 7 月后私有-本地；提供者环境变量查找 |
    | `plugin-sdk/music-generation` | 2026 年 7 月后私有-本地；音乐世代 provider/request/result 类型 |
    | `plugin-sdk/video-generation` | 2026 年 7 月后私有-本地；视频生成 provider/request/result 类型 |
    | `plugin-sdk/transcripts` | 2026 年 7 月后私有-本地；共享转录源提供程序类型、注册表帮助程序、会议提供程序桥接工厂、会话描述符和话语元数据 |
    | `plugin-sdk/webhook-targets` | 2026 年 7 月后私有-本地； Webhook 目标注册表和路由安装帮助程序 |
    | `plugin-sdk/web-media` | 共享 remote/local 媒体加载助手 |
    | `plugin-sdk/plugin-test-api` | 仓库本地的最小 `createTestPluginApi` 辅助工具，用于直接插件注册单元测试，而无需导入仓库测试辅助 bridge |
    | `plugin-sdk/agent-runtime-test-contracts` | 仓库本地的原生 agent-runtime adapter 契约 fixture，用于 auth、delivery、fallback、tool-hook、prompt-overlay、schema 和 transcript projection 测试 |
    | `plugin-sdk/channel-test-helpers` | 面向存储库本地通道的测试助手，用于通用 actions/setup/status 合约、目录断言、帐户启动生命周期、发送配置线程、运行时模拟、状态问题、出站交付和挂钩注册 |
    | `plugin-sdk/channel-target-testing` | 仓库本地的共享 target-resolution 错误用例套件，用于 Channel 测试 |
    | `plugin-sdk/channel-contract-testing` | 仓库本地的窄范围 Channel 契约测试辅助工具，不含宽泛 testing barrel |
    | `plugin-sdk/compiled-subprocess-testing` | 用于测试收集的存储库本地仅副作用编译子进程声明预加载；没有导出或生产包工件 |
    | `plugin-sdk/plugin-test-contracts` | 存储库本地插件包、注册、公共工件、运行时 API 和导入副作用合约助手 |
    | `plugin-sdk/plugin-state-test-runtime` | 仓库本地的 plugin state store、ingress queue 和 state DB 测试辅助工具 |
    | `plugin-sdk/provider-test-contracts` | 存储库本地提供商运行时、身份验证、发现、板载、目录、向导、媒体功能、重播策略、实时 STT 现场音频、web-search/fetch 和流合同助手 |
    | `plugin-sdk/provider-http-test-mocks` | 2026 年 7 月后私有-本地；回购本地选择加入 Vitest HTTP/auth 模拟执行 `plugin-sdk/provider-http` 的提供商测试 |
    | `plugin-sdk/reply-payload-testing` | 存储库本地回复负载、交付结算、线程和元数据测试助手 |
    | `plugin-sdk/sqlite-runtime-testing` | 用于第一方测试的存储库本地 SQLite 生命周期和工作故障助手 |
    | `plugin-sdk/test-state` | 仓库本地的隔离 OpenClaw 状态、配置、工作区、环境和 auth-profile fixture，用于插件测试 |
    | `plugin-sdk/test-fixtures` | 存储库本地通用 CLI 运行时捕获、直接导入烟雾、沙箱上下文、技能编写器、代理消息、系统事件、模块重新加载、捆绑插件路径、终端文本、分块、身份验证令牌和类型化案例固定装置 |
    | `plugin-sdk/test-node-mocks` | 仓库本地的聚焦 Node 内置模块 mock 辅助工具，用于 Vitest `vi.mock("node:*")` factory 内部 |

    对于捆绑插件，`markdown-table-runtime` 公开 `markdownToIRWithMeta(text, { tableMode: "block" })` 返回的表的 `getMarkdownTableSource(table)`。它返回源 `start`/`end` 偏移量、延续 `prefix` 以及 `headers`/`rows`. 中的原始单元格 Markdown 对相同的输入字符串进行切片以保留表字节，而无需重新解析 Markdown 容器。该元数据是不可枚举的；对于没有它的表，getter 返回 `undefined`。

  </Accordion>

  <Accordion id="memory-subpaths" title="内存子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/memory-core-host-embedding-registry` | 2026 年 7 月后私有-本地；轻量级内存嵌入提供程序注册表助手 |
    | `plugin-sdk/memory-core-host-engine-curated` | 面向 doctor 和 promotion 路径的私有本地精选 Memory annotation 解析 |
    | `plugin-sdk/memory-core-host-engine-foundation` | Memory host foundation engine 导出 |
    | `plugin-sdk/memory-core-host-engine-fs` | 面向 doctor 迁移的私有本地聚焦文件系统和用户路径辅助工具 |
    | `plugin-sdk/memory-core-host-engine-embeddings` | 2026 年 7 月后私有-本地；内存主机嵌入合约和 batch/remote 帮助程序。提供程序通过通用嵌入提供程序 API 进行注册。 |
    | `plugin-sdk/memory-core-host-engine-sessions` | 2026 年 7 月后私有-本地；记忆会话记录和查询助手。运行时归档库存使用`loadArchivedSessionsAsync`、`resolveMemorySessionTargetsAsync`； `loadArchivedSessions` 保留其同步合约。 |
    | `plugin-sdk/memory-core-host-engine-schema` | Doctor、主机维护和本机发布工作人员共享的私有本地内存索引架构和 sqlite-vec 操作 |
    | `plugin-sdk/memory-core-host-engine-indexing` | 索引工作器的私有-本地不可变块准备、注释、哈希和嵌入输入限制 |
    | `plugin-sdk/memory-core-host-engine-knn` | 私有本地只读 SQLite 所有权检查、sqlite-vec、text/vector 原语以及隔离检索工作人员和子项的查询令牌扩展 |
    | `plugin-sdk/memory-core-host-engine-storage` | 2026 年 7 月后私有-本地；内存主机存储引擎导出 |
    | `plugin-sdk/memory-core-host-secret` | 2026 年 7 月后私有-本地；内存宿主秘密帮手 |
    | `plugin-sdk/memory-core-host-status` | 2026 年 7 月后私有-本地；内存主机状态助手 |
    | `plugin-sdk/memory-core-host-runtime-cli` | 2026 年 7 月后私有-本地；内存主机 CLI 运行时助手 |
    | `plugin-sdk/memory-core-host-runtime-core` | 2026 年 7 月后私有-本地；内存主机核心运行时助手 |
    | `plugin-sdk/memory-core-host-runtime-files` | 2026 年 7 月后私有-本地；内存主机 file/runtime 助手 |
    | `plugin-sdk/memory-host-core` | 已弃用供应商中立内存主机助手的兼容性外观。新的内存插件使用注入内存功能和主机准备的提示；配套插件仍然使用保留的外观来发现公共工件，直到存在聚焦的读取接口。 |
    | `plugin-sdk/memory-host-events` | 2026 年 7 月后私有-本地；内存主机事件日志助手的供应商中立别名 |
    | `plugin-sdk/memory-host-markdown` | 2026 年 7 月后私有-本地；用于内存相邻插件的共享托管降价助手 |
    | `plugin-sdk/memory-host-search` | 2026 年 7 月后私有-本地；用于搜索管理器、提供商中立租赁及其本地类型的捆绑式主动内存外观 |
  </Accordion>

  <Accordion id="reserved-bundled-helper-subpaths" title="保留的捆绑帮助程序子路径">
    保留的捆绑帮助程序 SDK 子路径是捆绑插件代码的狭窄所有者特定表面。它们在 SDK 库存中进行跟踪，因此包构建和别名保持可预测，但它们不是通用插件创作 API。新的可重用主机合约应使用通用 SDK 子路径，例如 `plugin-sdk/gateway-runtime` 和 `plugin-sdk/ssrf-runtime`。

    | 子路径 | 所有者与用途 |
    | --- | --- |
    | `plugin-sdk/codex-client-version-runtime` | 私有本地捆绑的 Codex 插件外观，OpenAI 插件使用它来报告 ChatGPT 模型发现中正在运行的 Codex 二进制文件的版本（仅默认包导出） |
    | `plugin-sdk/codex-mcp-projection` | 2026 年 7 月后私有-本地；捆绑的 Codex 插件帮助程序，用于将用户 MCP 服务器配置投影到 Codex 应用程序服务器线程配置（仅默认包导出） |
    | `plugin-sdk/codex-session-transcript-runtime` | 用于转录镜像写入和所有者绑定上下文读取的私有本地捆绑 Codex 插件帮助程序，包括非活动的隐身演员适配器（仅默认包导出） |
    | `plugin-sdk/ssrf-runtime-internal` | 专用本地主机帮助程序，用于由捆绑的 Ollama/browser 和确切的官方 `@openclaw/llama-cpp-provider` 包（仅默认包导出）拥有的配置环回请求 |

  </Accordion>
</AccordionGroup>

## <a id="asynchronous-proxy-capture"></a> 异步代理捕获

使用 `openclaw/plugin-sdk/proxy-capture` 中的 `initializeDebugProxyCaptureAsync`、`captureHttpExchangeAsync`、`captureWsEventAsync` 和 `finalizeDebugProxyCaptureAsync` 进行运行时捕获。在所属流程允许的任何地方等待初始化、直接存储操作和捕获调用。 HTTP 捕获读取克隆的响应正文：等待该读取不得延迟将原始响应交给其调用者。 WebSocket 事件回调同样将捕获完成留给其生命周期所有者。

已发布的 2026.9.6 主机不会公开这些异步捕获操作。支持该主机的插件必须从 SDK 模块命名空间读取可选的诊断操作，并在调用它们之前检查可用性。无需进行这些诊断即可继续正常的渠道或提供商运营；配置的代理路由仍然适用。不要退回到同步捕获写入。需要捕获存储或读回的功能必须报告不可用的功能，而不是声明成功捕获。当插件的最低支持主机包含异步操作时，删除这些可用性检查。

对于长期存在的流，单独观察捕获完成情况，并让运行时终结器在清理期间解决它。如果维护回调返回或等待捕获 Promise，则维护也会等待该主体捕获。当拥有请求必须在 EOF 之前结束其读取时，请使用捕获信号。

捕获所有者立即观察仅回调写入、报告和保留失败，并在异步完成期间重新抛出它们。插件调用包装器可以返回派生的 Promise，因此被忽略的回调调用还必须观察最终返回的 Promise，例如 `void captureWsEventAsync(event, settings).catch(() => {});`。该观察者不会更改捕获 API 的原始拒绝 Promise 或替换在关闭时等待的 `finalizeDebugProxyCaptureAsync(settings)`。

使用 `await acquireDebugProxyCaptureStoreAsync({ env })` 获取异步存储，并始终在 `finally` 中获取 `await lease.release()`。在关闭其数据库之前，完成运行时捕获所有者并释放拥有的租约。直接关闭底层数据库进行维护会使捕获准入失效；它不能替代捕获完成和耗尽。医生和迁移维护者在发布执行声明之前耗尽了自己的捕获工作。共享会话仅在其最后一个声明结束时结束；周围的运行时保留其自己的声明。异步捕获完成以整个选定会话为目标。为了进行检查，使用 `createDebugProxyCaptureReaderAsync({ env })`：构造不会打开数据库，其异步 `getSessionEvents` 和 `readBlob` 方法读取现有状态而不创建丢失的数据库，在不存在时返回 `[]` 或 `null`。

同步捕获编写器 initialization/finalization 和存储 constructors/accessors 仍然是已弃用的已发布插件的兼容性 API。将调用者和生命周期清理一起迁移；删除需要破坏插件 SDK 版本。将传统同步写入与异步命令混合不会建立一种全局顺序：同步写入可能会在异步命令之间交错。 `finalizeDebugProxyCapture` 同步解决会话的遗留捕获读取器并写入和释放其存储。如果主机也使用异步捕获，则其声明和获取捕获将保持活动状态，直到其异步生命周期清理完成。稍后的遗留捕获调用将保持不活动状态，直到显式初始化。当调用者拥有整个混合会话的关闭时，使用 `await finalizeDebugProxyCaptureAsync(settings)`。

## <a id="related"></a> 相关内容

- [插件 SDK 概览](/plugins/sdk-overview)
- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
- [插件架构内部](/plugins/architecture-internals)。
- [工具插件](/plugins/tool-plugins)
