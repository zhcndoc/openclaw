---
summary: "插件 SDK 的子路径目录：按领域分组说明各类导入位置"
read_when:
  - 为插件导入选择合适的 `plugin-sdk` 子路径
  - 审核 `bundled-plugin` 子路径和 helper 接口面
title: "插件 SDK 子路径"
---

插件 SDK 包含位于 `openclaw/plugin-sdk/` 下的精简公共子路径和仅供代码仓库使用的 bundled
helper。本页面汇总了这两类内容，并明确标注 private-local 条目。以下三个文件定义了边界：

- `scripts/lib/plugin-sdk-entrypoints.json`：维护的入口点清单，构建时会对其进行编译。
- `scripts/lib/plugin-sdk-private-local-only-subpaths.json`：从类型化、文档化 SDK 中排除的内部子路径。生产环境条目仍作为仅限 JavaScript 的宿主运行时导出项，为单独发布的官方插件提供支持；仅供测试使用的条目则保持不导出。
- `scripts/lib/plugin-sdk-entries.mts`：派生的公共／私有导出元数据、受支持的 bundled 外观接口以及插件自有的公共接口面。

维护人员使用 `pnpm plugin-sdk:surface` 审核公共导出数量，并使用
`pnpm plugins:boundary-report:summary` 检查兼容性队列。

有关插件编写指南，请参见 [Plugin SDK overview](/plugins/sdk-overview)。

## 插件入口

| 子路径                         | 导出项                                                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`      | `definePluginEntry`                                                                                                                                                                                     |
| `plugin-sdk/core`              | `defineChannelPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase`、`defineSetupPluginEntry`、`buildChannelConfigSchema`、`buildJsonChannelConfigSchema`、`resolveTailscalePublishedHost` |
| `plugin-sdk/provider-entry`    | 2026 年 7 月之后为私有本地；`defineSingleProviderPluginEntry`                                                                                                                                             |
| `plugin-sdk/migration`         | 2026 年 7 月之后为私有本地；迁移提供程序项目辅助工具，例如 `createMigrationItem`、原因常量、项目状态标记、脱敏辅助工具和 `summarizeMigrationItems`                   |
| `plugin-sdk/migration-runtime` | 2026 年 7 月之后为私有本地；运行时迁移辅助工具，例如 `copyMigrationFileItem`、`resolvePlannedMigrationTargets`、`withCachedMigrationConfigRuntime` 和 `writeMigrationReport`              |
| `plugin-sdk/health`            | 面向随附健康检查消费者的 Doctor 健康检查注册、检测、修复、选择、严重性和发现类型                                                                                |

### 兼容性和私有本地辅助工具

只有后期窗口中已弃用的子路径仍会导出。2026 年 7 月的别名和未使用的子路径已被删除，而仅供 bundled 使用的辅助工具已从公共包中移除，并在下方标记为 private-local。维护的列表是
`scripts/lib/plugin-sdk-deprecated-public-subpaths.json`；CI 会拒绝 bundled 对这些仅用于兼容性的子路径的导入。广泛的领域级 barrel
`plugin-sdk/agent-runtime`、`plugin-sdk/channel-lifecycle`、
`plugin-sdk/conversation-runtime`、`plugin-sdk/hook-runtime`、
`plugin-sdk/media-runtime`、`plugin-sdk/plugin-runtime` 和
`plugin-sdk/security-runtime` 同样已弃用，建议改用专注于具体功能的子路径。

OpenClaw 基于 Vitest 的测试辅助子路径仅限仓库本地使用，不再作为包导出：`agent-runtime-test-contracts`、
`channel-contract-testing`、`channel-target-testing`、`channel-test-helpers`、
`plugin-state-test-runtime`、`plugin-test-api`、`plugin-test-contracts`、
`plugin-test-runtime`、`provider-http-test-mocks`、`provider-test-contracts`、
`reply-payload-testing`、`sqlite-runtime-testing`、`test-env`、`test-fixtures`、
`test-live`、`test-live-auth`、`test-media-generation`、
`test-media-understanding`、`test-node-mocks` 和 `testing`。私有的捆绑辅助工具接口
`ssrf-runtime-internal` 同样仅限仓库本地使用。

### Bundled 插件辅助模块子路径

仅供 Bundled 使用的辅助模块在 2026 年 7 月的清理之后为 private-local。
包契约防护机制会将仍保持公开、直到通用契约取代它们之前受支持的 bundled 外观接口归类为支持项。这些外观接口不建议用于新代码；请参见下方各行的说明。

<AccordionGroup>
  <Accordion title="Channel 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`、`defineSetupPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase`、`createChannelConfigUiHints` |
    | `plugin-sdk/json-schema-runtime` | 2026 年 7 月后为私有本地模块；面向插件自有 schema 的缓存 JSON Schema 验证辅助工具 |
    | `plugin-sdk/channel-setup` | `defineChannelSetupContract`、Channel 自有的设置字段／输入类型、`createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，以及 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` |
    | `plugin-sdk/channel-dm-policy` | 用于面向账户的设置策略描述符的 `createChannelDmPolicy` |
    | `plugin-sdk/setup` | 共享设置向导辅助工具、设置转换器、allowlist 提示、设置状态构建器 |
    | `plugin-sdk/setup-runtime` | `defineChannelSetupContract`、`createSetupTranslator`、`createPatchedAccountSetupAdapter`、`createEnvPatchedAccountSetupAdapter`、`createSetupInputPresenceValidator`、`noteChannelLookupFailure`、`noteChannelLookupSummary`、`promptResolvedAllowFrom`、`splitSetupEntries`、`createAllowlistSetupWizardProxy`、`createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` |
    | `plugin-sdk/archive` | `extractArchive`、`readArchiveEntry`、归档限制和条目类型 |
    | `plugin-sdk/root-walk` | `walkRootDirectory`、root-walk 选项和条目 |
    | `plugin-sdk/secret-file` | `createSecretFileAtomic`、同步和异步 secret 读取 |
    | `plugin-sdk/account-core` | 多账户配置／action-gate 辅助工具、默认账户回退辅助工具 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、账户 ID 规范化辅助工具 |
    | `plugin-sdk/account-resolution` | 账户查找与默认回退辅助工具 |
    | `plugin-sdk/account-helpers` | 窄范围账户列表／账户操作辅助工具 |
    | `plugin-sdk/access-groups` | 2026 年 7 月后为私有本地模块；Access-group allowlist 解析和已脱敏的群组诊断辅助工具 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | 已弃用的兼容性门面。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`、`resolveChannelDmAccess`、`resolveChannelDmAllowFrom`、`resolveChannelDmPolicy`、`normalizeChannelDmPolicy`、`normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共享 Channel 配置 schema 原语，以及 Zod 和直接 JSON／TypeBox 构建器 |
    | `plugin-sdk/bundled-channel-config-schema` | 2026 年 7 月后为私有本地模块；仅供维护中的 Bundled 插件使用的 Bundled OpenClaw Channel 配置 schema |
    | `plugin-sdk/chat-channel-ids` | 2026 年 7 月后为私有本地模块；`BUNDLED_CHAT_CHANNEL_IDS`、`BUNDLED_CHAT_CHANNEL_ENVELOPE_PREFIXES`、`ChatChannelId`。规范的 Bundled／官方聊天 Channel ID，以及供需要识别带 envelope 前缀文本的插件使用的格式化标签／别名，避免插件硬编码自己的表。 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress-runtime` | Experimental high-level channel ingress runtime resolver, implicit-mention policy resolver, and route fact builders for migrated channel receive paths. Prefer this over assembling effective allowlists, command allowlists, and legacy projections in each plugin. See [Channel ingress API](/plugins/sdk-channel-ingress). |
    | `plugin-sdk/channel-lifecycle` | Deprecated compatibility facade. Use `plugin-sdk/channel-outbound`. |
    | `plugin-sdk/channel-outbound` | Message lifecycle contracts plus reply pipeline options, receipts, live preview/streaming, lifecycle helpers, outbound identity, payload planning, durable sends, and message-send context helpers. See [Channel outbound API](/plugins/sdk-channel-outbound). |
    | `plugin-sdk/channel-message` | Deprecated compatibility alias for `plugin-sdk/channel-outbound`. |
    | `plugin-sdk/inbound-envelope` | Shared inbound route + envelope builder helpers |
    | `plugin-sdk/inbound-event-delivery` | Process-local correlation between active inbound events and successful channel sends |
    | `plugin-sdk/inbound-reply-dispatch` | Deprecated compatibility shim for `dispatchInboundReplyWithBase`; its compatibility-ledger gate is the next Plugin SDK major, not a calendar date. Use `plugin-sdk/channel-inbound` for inbound runners and `plugin-sdk/channel-outbound` for message delivery helpers. |
    | `plugin-sdk/messaging-targets` | Deprecated target parsing alias; use `plugin-sdk/channel-targets` |
    | `plugin-sdk/outbound-media` | Private-local after July 2026; Shared outbound media loading and hosted-media state helpers |
    | `plugin-sdk/poll-runtime` | Private-local after July 2026; Narrow poll normalization helpers |
    | `plugin-sdk/thread-bindings-runtime` | Private-local after July 2026; Thread-binding lifecycle and adapter helpers |
    | `plugin-sdk/agent-media-payload` | Deprecated compatibility facade for legacy `Media*` payload projection. Pass ordered facts through `MsgContext.media` / `toInboundMediaFacts(...)`; import local-root policy from `plugin-sdk/media-local-roots`. |
    | `plugin-sdk/conversation-runtime` | Deprecated broad barrel for conversation/thread binding, pairing, and configured-binding helpers; prefer focused binding subpaths such as `plugin-sdk/thread-bindings-runtime` and `plugin-sdk/session-binding-runtime` |
    | `plugin-sdk/runtime-group-policy` | Runtime group-policy resolution helpers |
    | `plugin-sdk/channel-status` | Shared channel status snapshot/summary helpers |
    | `plugin-sdk/channel-config-primitives` | Narrow channel config-schema primitives |
    | `plugin-sdk/channel-config-writes` | Private-local after July 2026; Channel config-write authorization helpers |
    | `plugin-sdk/channel-plugin-common` | Shared channel plugin prelude exports |
    | `plugin-sdk/allowlist-config-edit` | Allowlist config edit/read helpers |
    | `plugin-sdk/direct-dm-guard-policy` | Private-local after July 2026; Narrow direct-DM pre-crypto guard policy helpers |
    | `plugin-sdk/discord` | Deprecated Discord compatibility facade for published `@openclaw/discord@2026.3.13` and tracked owner compatibility; new plugins should use generic channel SDK subpaths |
    | `plugin-sdk/telegram-account` | Deprecated Telegram account-resolution compatibility facade for tracked owner compatibility; new plugins should use injected runtime helpers or generic channel SDK subpaths |
    | `plugin-sdk/interactive-runtime` | Semantic message presentation, delivery, and legacy interactive reply helpers. See [Message Presentation](/plugins/message-presentation) |
    | `plugin-sdk/question-gateway-runtime` | Resolve runtime-authored `ask_user` choices through the Gateway from channel interaction handlers |
    | `plugin-sdk/channel-inbound` | Shared inbound helpers for event classification, context building, formatting, roots, debounce, mention matching, mention-policy, and inbound logging |
    | `plugin-sdk/channel-inbound-debounce` | Narrow inbound debounce helpers |
    | `plugin-sdk/channel-mention-gating` | Private-local after July 2026; Narrow mention-policy, mention marker, and mention text helpers without the broader inbound runtime surface |
    | `plugin-sdk/channel-streaming-config` | Dependency-light channel streaming config readers (`getChannelStreamingConfigObject`, `resolveChannelStreamingNativeTransport`) for doctor contract closures and other control-plane paths that must not load the reply pipeline |
    | `plugin-sdk/channel-send-result` | Reply result types |
    | `plugin-sdk/channel-actions` | Channel message-action helpers, plus deprecated native schema helpers kept for plugin compatibility |
    | `plugin-sdk/channel-route` | Private-local after July 2026; Shared route normalization, parser-driven target resolution, thread-id stringification, dedupe/compact route keys, parsed-target types, and route/target comparison helpers |
    | `plugin-sdk/channel-targets` | Private-local after July 2026; Target parsing helpers; route comparison callers should use `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | Channel contract types |
    | `plugin-sdk/channel-feedback` | Feedback/reaction wiring |
  </Accordion>

较晚窗口的 Channel 兼容性子路径仅在其 registry 日期之前保持公开。7 月别名（例如 direct-DM 访问、reply-options、配对路径和 Channel runtime 分支）已被移除；仅限 Bundled 的辅助模块为私有本地模块。

  <Accordion title="Provider 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/provider-entry` | 2026 年 7 月后为私有本地模块；`defineSingleProviderPluginEntry` |
    | `plugin-sdk/provider-setup` | 2026 年 7 月后为私有本地模块；精选的本地／自托管 Provider 设置辅助工具 |
    | `plugin-sdk/cli-backend` | 2026 年 7 月后为私有本地模块；CLI backend 默认值与 watchdog 常量 |
    | `plugin-sdk/provider-auth-runtime` | 2026 年 7 月后为私有本地模块；Provider auth runtime 辅助工具：OAuth loopback 流程、token exchange、auth 持久化和 API key 解析 |
    | `plugin-sdk/provider-oauth-runtime` | 2026 年 7 月后为私有本地模块；通用 Provider OAuth 回调类型、回调页面渲染、PKCE／state 辅助工具、授权输入解析、token 过期辅助工具和 abort 辅助工具 |
    | `plugin-sdk/provider-auth-api-key` | 2026 年 7 月后为私有本地模块；API key onboarding／profile 写入辅助工具，例如 `upsertApiKeyProfile` |
    | `plugin-sdk/provider-auth-result` | 2026 年 7 月后为私有本地模块；标准 OAuth auth-result 构建器 |
    | `plugin-sdk/provider-env-vars` | 2026 年 7 月后为私有本地模块；Provider auth 环境变量查找辅助工具 |
    | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`、OpenAI Codex auth-import 辅助工具、已弃用的 `resolveOpenClawAgentDir` 兼容性导出 |
    | `plugin-sdk/provider-model-shared` | 2026 年 7 月后为私有本地模块；`ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`resolveFamilyForwardCompatModel`、`selectPreferredLocalModelId`、`normalizeModelCompat`、`parseModelRef`、共享 replay-policy 构建器、Provider endpoint 辅助工具和共享 model-id 规范化辅助工具 |
    | `plugin-sdk/provider-catalog-live-runtime` | 2026 年 7 月后为私有本地模块；用于受防护 `/models` 风格发现的实时 Provider 模型目录辅助工具：`buildLiveModelProviderConfig`、Provider 自有的 `projectRows`、`fetchLiveProviderModelRows`、`getCachedLiveProviderModelRows`、`fetchLiveProviderModelIds`、`LiveModelCatalogHttpError`、`clearLiveCatalogCacheForTests`、TTL 缓存和静态回退 |
    | `plugin-sdk/provider-catalog-runtime` | Provider catalog augmentation runtime hook 和用于契约测试的 plugin-provider registry 接缝 |
    | `plugin-sdk/provider-catalog-shared` | 2026 年 7 月后为私有本地模块；`findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` |
    | `plugin-sdk/provider-http` | 2026 年 7 月后为私有本地模块；通用 Provider HTTP／endpoint 能力辅助工具、Provider HTTP 错误以及音频转录 multipart 表单辅助工具 |
    | `plugin-sdk/provider-web-fetch-contract` | 2026 年 7 月后为私有本地模块；窄范围 web-fetch 配置／选择契约辅助工具，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` |
    | `plugin-sdk/provider-web-fetch` | 2026 年 7 月后为私有本地模块；Web-fetch Provider 注册／缓存辅助工具 |
    | `plugin-sdk/provider-web-search-config-contract` | 2026 年 7 月后为私有本地模块；不需要插件启用接线的 Provider 所用的窄范围 web-search 配置／凭据辅助工具 |
    | `plugin-sdk/provider-web-search-contract` | 2026 年 7 月后为私有本地模块；窄范围 web-search 配置／凭据契约辅助工具，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 以及作用域化凭据 setter／getter |
    | `plugin-sdk/provider-web-search` | 2026 年 7 月后为私有本地模块；Web-search Provider 注册／缓存／runtime 辅助工具 |
    | `plugin-sdk/embedding-providers` | 2026 年 7 月后为私有本地模块；通用 embedding Provider 类型和读取辅助工具，包括 `EmbeddingProviderAdapter`、`getEmbeddingProvider(...)` 和 `listEmbeddingProviders(...)`；插件通过 `api.registerEmbeddingProvider(...)` 注册 Provider，从而强制执行 manifest 所有权 |
    | `plugin-sdk/provider-tools` | 2026 年 7 月后为私有本地模块；`ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`，以及 DeepSeek／Gemini／OpenAI schema 清理与诊断 |
    | `plugin-sdk/provider-usage` | 2026 年 7 月后为私有本地模块；Provider usage 快照类型、共享 usage 获取辅助工具，以及 `fetchClaudeUsage` 等 Provider fetcher |
    | `plugin-sdk/provider-stream` | 2026 年 7 月后为私有本地模块；`ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、stream wrapper 类型、纯文本 tool-call 兼容性，以及共享 Anthropic／Google／Kilocode／MiniMax／Moonshot／OpenAI／OpenRouter／Z.AI wrapper 辅助工具 |
    | `plugin-sdk/provider-stream-shared` | 2026 年 7 月后为私有本地模块；公开的共享 Provider stream wrapper 辅助工具，包括 `composeProviderStreamWrappers`、`createOpenAICompatibleCompletionsThinkingOffWrapper`、`createPlainTextToolCallCompatWrapper`、`createPayloadPatchStreamWrapper`、`createToolStreamWrapper`、`normalizeOpenAICompatibleReasoningPayload`、`setQwenChatTemplateThinking`，以及 Anthropic／DeepSeek／OpenAI-compatible stream 工具 |
    | `plugin-sdk/provider-transport-runtime` | 2026 年 7 月后为私有本地模块；原生 Provider transport 辅助工具，例如受防护的 fetch、tool-result 文本提取、transport 消息转换和可写 transport 事件流 |
    | `plugin-sdk/provider-onboard` | 2026 年 7 月后为私有本地模块；Onboarding 配置补丁辅助工具 |
    | `plugin-sdk/global-singleton` | 2026 年 7 月后为私有本地模块；进程本地 singleton／map／cache 辅助工具 |
    | `plugin-sdk/group-activation` | 2026 年 7 月后为私有本地模块；窄范围群组激活模式和命令解析辅助工具 |
  </Accordion>

Provider usage 快照通常会报告一个或多个 quota `windows`，每个都带有标签、已使用百分比和可选的重置时间。对于显示余额或账户状态文本、而不是可重置 quota windows 的 Provider，应返回带空 `windows` 数组的 `summary`，而不是伪造百分比。OpenClaw 会在状态输出中显示该 summary 文本；仅当 usage 端点失败或返回了不可用的 usage 数据时，才使用 `error`。

  <Accordion title="Auth and security 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/command-auth` | 已弃用的宽泛命令授权接口（`resolveControlCommandGate`、包括动态参数菜单格式化在内的命令注册表辅助工具、发送者授权辅助工具）；请使用 Channel ingress／runtime 授权或命令状态辅助工具 |
    | `plugin-sdk/command-status` | 命令／帮助消息构建器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` |
    | `plugin-sdk/approval-auth-runtime` | 审批者解析和同聊天 action-auth 辅助工具 |
    | `plugin-sdk/approval-client-runtime` | 原生 exec 审批 profile／filter 辅助工具 |
    | `plugin-sdk/approval-delivery-runtime` | 原生审批 capability／delivery 适配器 |
    | `plugin-sdk/approval-gateway-runtime` | 共享审批 Gateway 解析器 |
    | `plugin-sdk/approval-reference-runtime` | 2026 年 7 月后为私有本地模块；面向受 transport 限制的审批回调的确定性持久 locator 辅助工具 |
    | `plugin-sdk/approval-handler-adapter-runtime` | 面向高频 Channel 入口的轻量原生审批适配器加载辅助工具 |
    | `plugin-sdk/approval-handler-runtime` | 更广泛的审批处理器 runtime 辅助工具；在较窄的 adapter／gateway 接缝足够时应优先使用它们 |
    | `plugin-sdk/approval-native-runtime` | 原生审批目标、账户绑定、route-gate、转发回退以及本地原生 exec 提示抑制辅助工具 |
    | `plugin-sdk/approval-reaction-runtime` | 2026 年 7 月后为私有本地模块；硬编码审批 reaction 绑定、reaction 提示 payload、reaction 目标存储、reaction 提示文本辅助工具，以及本地原生 exec 提示抑制的兼容性导出 |
    | `plugin-sdk/approval-reply-runtime` | Exec／plugin 审批回复 payload 辅助工具 |
    | `plugin-sdk/approval-runtime` | Exec／plugin 审批 payload 辅助工具、审批 capability 构建器、审批 auth／profile 辅助工具、原生审批路由／runtime 辅助工具，以及 `formatApprovalDisplayPath` 等结构化审批显示辅助工具 |
    | `plugin-sdk/command-auth-native` | 原生命令 auth、动态参数菜单格式化和原生 session-target 辅助工具 |
    | `plugin-sdk/command-detection` | 共享命令检测辅助工具 |
    | `plugin-sdk/command-primitives-runtime` | 面向高频 Channel 路径的轻量命令文本谓词 |
    | `plugin-sdk/command-surface` | 2026 年 7 月后为私有本地模块；命令正文规范化和命令接口辅助工具 |
    | `plugin-sdk/allow-from` | Allow-from 解析、规范化、解析和匹配辅助工具 |
    | `plugin-sdk/provider-auth-login-flow-runtime` | 2026 年 7 月后为私有本地模块；面向私有 Channel 和 Web UI 设备代码配对的延迟 Provider auth 登录流程辅助工具 |
    | `plugin-sdk/channel-secret-basic-runtime` | 面向非 TTS Channel／plugin secret 接口的窄范围 secret 契约导出和目标注册表构建器 |
    | `plugin-sdk/channel-secret-tts-runtime` | 2026 年 7 月后为私有本地模块；窄范围嵌套 Channel TTS secret 赋值辅助工具 |
    | `plugin-sdk/secret-ref-runtime` | 面向插件自有 secret Provider 的窄范围 SecretRef 类型、解析、设置计划构建和设置 CLI 脚手架 |
    | `plugin-sdk/security-runtime` | 已弃用的宽泛 barrel，用于信任、DM gating、根目录边界文件／路径辅助工具（包括仅创建写入、同步／异步原子文件替换、同级临时文件写入、跨设备移动回退、私有文件存储辅助工具、符号链接父目录防护、外部内容、敏感文本脱敏、恒定时间 secret 比较和 secret 集合辅助工具）；请优先使用聚焦的 security／SSRF／secret 子路径 |
    | `plugin-sdk/ssrf-policy` | Host allowlist 和私有网络 SSRF 策略辅助工具 |
    | `plugin-sdk/ssrf-dispatcher` | 2026 年 7 月后为私有本地模块；不含宽泛 infra runtime 接口的窄范围固定 dispatcher 辅助工具 |
    | `plugin-sdk/ssrf-runtime` | 固定 dispatcher、SSRF 防护 fetch、SSRF 错误、SSRF 策略辅助工具，以及 loopback／私有 Host 分类 |
    | `plugin-sdk/secret-input` | Secret 输入解析辅助工具 |
    | `plugin-sdk/webhook-ingress` | Webhook 请求／目标辅助工具以及原始 websocket／body 强制转换 |
    | `plugin-sdk/webhook-request-guards` | 请求 body 大小／超时辅助工具、通过 `resolveAcceptedBrowserOrigin` 实现的规范 Gateway 浏览器来源接受逻辑，以及用于已跟踪确认后处理的 `runDetachedWebhookWork` |
  </Accordion>

当插件必须只接受本机时，请使用 `isLoopbackHost(host)`。它接受 `localhost`、`127.0.0.0/8` 范围内的 IPv4 loopback 字面量、`::1`、带括号的 IPv6，以及 IPv4 映射的 IPv6 loopback 字面量。它会解析 IP 字面量，而不是匹配文本前缀，因此诸如 `127.0.0.1.evil.com` 的 DNS 名称不会被视为 loopback。仅当 RFC 1918 地址等私有网络 Host 也有效时，才使用 `isPrivateOrLoopbackHost(host)`。

  <Accordion title="Runtime and storage 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/runtime` | Runtime／logging／backup 辅助工具、插件安装路径警告以及进程辅助工具 |
    | `plugin-sdk/runtime-env` | 窄范围 runtime env、logger、timeout、retry 和 backoff 辅助工具 |
    | `plugin-sdk/browser-config` | 2026 年 7 月后为私有本地模块；用于规范化 profile／defaults、CDP URL 解析和浏览器控制 auth 辅助工具的受支持 browser config 门面 |
    | `plugin-sdk/agent-harness-task-runtime` | 2026 年 7 月后为私有本地模块；面向使用 Host 签发 task scope 的 harness-backed agent 的通用任务生命周期和完成交付辅助工具 |
    | `plugin-sdk/agent-harness-runtime` | Agent-harness runtime 辅助工具。`acquireSessionWriteLock`、`resolveSessionWriteLockAcquireTimeoutMs`、`resolveSessionWriteLockOptions` 和 `SessionWriteLockAcquireTimeoutConfig` 是已弃用的无操作兼容性导出，计划在 2026.10 发布序列中移除。它们不再阻塞或创建锁 sidecar；harness 应依赖 OpenClaw 的按会话 lane，以及持久 writer claim 和事务内 fence。 |
    | `plugin-sdk/codex-mcp-projection` | 2026 年 7 月后为私有本地模块；用于将用户 MCP server 配置投影到 Codex thread 配置中的 Bundled Codex 辅助工具；不供第三方插件使用 |
    | `plugin-sdk/codex-session-transcript-runtime` | 私有本地 Bundled Codex 辅助工具，用于序列化 transcript-mirror 写入；不供第三方插件使用 |
    | `plugin-sdk/channel-runtime-context` | 通用 Channel runtime-context 注册和查找辅助工具 |
    | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` |
    | `plugin-sdk/plugin-command-runtime` | 与 registry 生成绑定的原生插件命令候选项、终端目录决策和精确选定的 dispatch 执行 |
    | `plugin-sdk/plugin-runtime` | 已弃用的宽泛 barrel，用于插件 command／hook／http／interactive 辅助工具；请优先使用聚焦的 plugin runtime 子路径 |
    | `plugin-sdk/hook-runtime` | 已弃用的宽泛 barrel，用于 webhook／internal hook 流程辅助工具；请优先使用聚焦的 hook／plugin runtime 子路径 |
    | `plugin-sdk/lazy-runtime` | 延迟 runtime 导入／绑定辅助工具，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` |
    | `plugin-sdk/process-runtime` | 2026 年 7 月后为私有本地模块；进程 exec 辅助工具 |
    | `plugin-sdk/node-host` | 2026 年 7 月后为私有本地模块；Node-host 可执行文件解析和 PTY 恢复辅助工具 |
    | `plugin-sdk/cli-argv` | 面向 CLI 元数据的低依赖根选项解析，包括 `getRootOptionAwareCommandPath` 和 `consumeRootOptionToken` |
    | `plugin-sdk/cli-runtime` | 2026 年 7 月后为私有本地模块；已弃用的宽泛 barrel，用于 CLI 格式化、等待、版本、参数调用和延迟命令组辅助工具；请优先使用聚焦的 CLI／runtime 子路径 |
    | `plugin-sdk/qa-runner-runtime` | 2026 年 7 月后为私有本地模块；通过 CLI 命令接口公开插件 QA 场景的受支持门面 |
    | `plugin-sdk/tts-runtime` | 2026 年 7 月后为私有本地模块；用于文字转语音配置 schema 和 runtime 辅助工具的受支持门面 |
    | `plugin-sdk/gateway-method-runtime` | 面向声明了 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 的插件 HTTP 路由的保留 Gateway 方法 dispatch 辅助工具 |
    | `plugin-sdk/gateway-runtime` | Gateway client、事件循环就绪的 client 启动辅助工具、Gateway CLI RPC、Gateway 协议错误、对外公布的 LAN Host 解析以及 Channel 状态 patch 辅助工具 |
    | `plugin-sdk/config-contracts` | 面向 `OpenClawConfig` 等插件配置形状和 Channel／Provider 配置类型的聚焦配置接口，以及低依赖 runtime 辅助工具 `resolveGatewayPublicOrigin(cfg)`，用于返回规范化的 `gateway.publicOrigin`（裸 http(s) origin、可选反向代理路径、无 query/hash）；未设置时返回 `undefined`，用于构建返回 Gateway 的链接 |
    | `plugin-sdk/plugin-config-runtime` | runtime plugin-config 辅助工具的已弃用兼容性门面；新插件使用 `api.pluginConfig` 以及聚焦的 config contracts、snapshots 和 mutation 辅助工具 |
    | `plugin-sdk/config-mutation` | 事务性配置变更辅助工具，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` |
    | `plugin-sdk/message-tool-delivery-hints` | 2026 年 7 月后为私有本地模块；共享 message-tool delivery 元数据提示字符串 |
    | `plugin-sdk/runtime-config-snapshot` | 当前进程配置快照辅助工具，例如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和测试快照 setter |
    | `plugin-sdk/text-autolink-runtime` | 2026 年 7 月后为私有本地模块；不含宽泛 text barrel 的文件引用自动链接检测 |
    | `plugin-sdk/reply-runtime` | 共享 inbound／reply runtime 辅助工具、分块、dispatch、heartbeat 和 reply planner |
    | `plugin-sdk/reply-dispatch-runtime` | 窄范围 reply dispatch／finalize 和 conversation-label 辅助工具 |
    | `plugin-sdk/reply-history` | 共享短窗口 reply-history 辅助工具。新的消息轮次代码应使用 `createChannelHistoryWindow`；较低层级的 map 辅助工具仅保留为已弃用的兼容性导出 |
    | `plugin-sdk/reply-reference` | 2026 年 7 月后为私有本地模块；`createReplyReferencePlanner` |
    | `plugin-sdk/reply-chunking` | 窄范围文本／markdown 分块辅助工具 |
    | `plugin-sdk/agent-scope-runtime` | 面向低依赖 control-plane 和迁移路径的聚焦 agent ID、目录、默认 agent 和 session-agent 作用域解析辅助工具 |
    | `plugin-sdk/session-store-runtime` | Session 工作流辅助工具（`getSessionEntry`、`listSessionEntries`、`patchSessionEntry`、`upsertSessionEntry`）、修复／生命周期辅助工具（`deleteSessionEntry`、`cleanupSessionLifecycleArtifacts`、`resolveSessionStoreBackupPaths`）、过渡性 `sessionFile` 值的 marker 辅助工具、按 session identity 限定的近期 user／assistant transcript 文本读取、session store 路径／session-key 辅助工具和 updated-at 读取，不包含宽泛配置写入／维护导入 |
    | `plugin-sdk/session-catalog` | 外部 session 目录契约、投影、采用辅助工具和历史记录导入 |
    | `plugin-sdk/session-discussion` | 外部 session discussion Provider 契约、注册以及规范 Control UI session 路径构建 |
    | `plugin-sdk/session-transcript-runtime` | 2026 年 7 月后为私有本地模块；Transcript identity、有界 raw／visible cursor、作用域化 target／read／write 辅助工具、可见消息条目投影、更新发布、写锁和 transcript memory hit key |
    | `plugin-sdk/sqlite-runtime` | 2026 年 7 月后为私有本地模块；面向一方 runtime 的聚焦 SQLite agent-schema、路径和事务辅助工具，不包含数据库生命周期控制 |
    | `plugin-sdk/cron-store-runtime` | 2026 年 7 月后为私有本地模块；Cron store 路径／加载／保存辅助工具 |
    | `plugin-sdk/state-paths` | State／OAuth 目录路径辅助工具 |
    | `plugin-sdk/plugin-state-runtime` | 2026 年 7 月后为私有本地模块；插件作用域的 keyed-state 和 BLOB 契约，以及连接 pragma、已验证的 WAL 维护和原子 STRICT-schema 迁移辅助工具。插件状态 lease 已移除；请改用 SQLite 事务和 keyed store |
    | `plugin-sdk/routing` | Route／session-key／account binding 辅助工具，例如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` |
    | `plugin-sdk/status-helpers` | 共享 Channel／account 状态摘要辅助工具、runtime-state 默认值和问题元数据辅助工具 |
    | `plugin-sdk/target-resolver-runtime` | 2026 年 7 月后为私有本地模块；共享 target resolver 辅助工具 |
    | `plugin-sdk/string-normalization-runtime` | 2026 年 7 月后为私有本地模块；Slug／字符串规范化辅助工具 |
    | `plugin-sdk/request-url` | 2026 年 7 月后为私有本地模块；从 fetch／request-like 输入中提取字符串 URL |
    | `plugin-sdk/run-command` | 带计时的命令运行器，返回规范化的 stdout／stderr 结果 |
    | `plugin-sdk/param-readers` | 通用 tool／CLI 参数读取器 |
    | `plugin-sdk/tool-plugin` | 定义简单的类型化 agent-tool 插件，并公开静态元数据以生成 manifest |
    | `plugin-sdk/tool-payload` | 2026 年 7 月后为私有本地模块；从 tool result 对象中提取规范化 payload |
    | `plugin-sdk/tool-results` | 类型化文本和 JSON agent tool 结果构建器 |
    | `plugin-sdk/tool-send` | 从 tool 参数中提取规范的发送目标字段 |
    | `plugin-sdk/sandbox` | 2026 年 7 月后为私有本地模块；Sandbox backend 类型和 SSH／OpenShell 命令辅助工具，包括快速失败的 exec 命令预检 |
    | `plugin-sdk/temp-path` | 共享临时下载路径辅助工具和私有安全临时工作区 |
    | `plugin-sdk/logging-core` | 子系统 logger 和脱敏辅助工具 |
    | `plugin-sdk/markdown-table-runtime` | 2026 年 7 月后为私有本地模块；Markdown 表格模式和转换辅助工具 |
    | `plugin-sdk/model-session-runtime` | Model／session 覆盖辅助工具，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` |
    | `plugin-sdk/talk-config-runtime` | 2026 年 7 月后为私有本地模块；Talk Provider 配置解析辅助工具 |
    | `plugin-sdk/json-store` | 小型 JSON 状态读写辅助工具 |
    | `plugin-sdk/json-unsafe-integers` | 2026 年 7 月后为私有本地模块；将不安全整数文字保留为字符串的 JSON 解析辅助工具 |
    | `plugin-sdk/file-lock` | 2026 年 7 月后为私有本地模块；所有者作用域的可重入文件锁辅助工具，以及 Doctor 安全回收明确过期且未更改的已退役锁 sidecar。只有调用者传入相同逻辑操作的 `reentrantOwner` 时，嵌套获取才共享引用计数；无所有者或不同所有者的调用将正常竞争 |
    | `plugin-sdk/persistent-dedupe` | 基于磁盘的去重缓存辅助工具 |
    | `plugin-sdk/ingress-effect-once` | 面向非幂等 ingress 副作用的持久 claim／commit 防护 |
    | `plugin-sdk/acp-runtime` | 2026 年 7 月后为私有本地模块；ACP runtime／session 和 reply-dispatch 辅助工具 |
    | `plugin-sdk/acp-runtime-backend` | 2026 年 7 月后为私有本地模块；面向启动时加载插件的轻量 ACP backend 注册和 reply-dispatch 辅助工具 |
    | `plugin-sdk/acp-binding-resolve-runtime` | 2026 年 7 月后为私有本地模块；不导入生命周期启动模块的只读 ACP binding 解析 |
    | `plugin-sdk/boolean-param` | 宽松布尔参数读取器 |
    | `plugin-sdk/dangerous-name-runtime` | 2026 年 7 月后为私有本地模块；危险名称匹配解析辅助工具 |
    | `plugin-sdk/device-bootstrap` | 设备 bootstrap 和配对 token 辅助工具，包括 `BOOTSTRAP_HANDOFF_OPERATOR_SCOPES` |
    | `plugin-sdk/extension-shared` | 共享 passive-channel、状态和 ambient proxy 辅助工具原语 |
    | `plugin-sdk/models-provider-runtime` | `/models` 命令／Provider 回复辅助工具 |
    | `plugin-sdk/skill-commands-runtime` | Skill 命令列表辅助工具 |
    | `plugin-sdk/native-command-registry` | 原生命令 registry／构建／序列化辅助工具 |
    | `plugin-sdk/agent-harness` | Experimental trusted-plugin surface for low-level agent harnesses: harness types, active-run steer/abort helpers, OpenClaw tool bridge helpers, runtime-plan tool policy helpers, terminal outcome classification, tool progress formatting/detail helpers, and attempt result utilities |
    | `plugin-sdk/async-lock-runtime` | 2026 年 7 月后为私有本地模块；面向小型 runtime 状态文件的进程本地异步锁辅助工具 |
    | `plugin-sdk/channel-activity-runtime` | 2026 年 7 月后为私有本地模块；Channel 活动遥测辅助工具 |
    | `plugin-sdk/concurrency-runtime` | 2026 年 7 月后为私有本地模块；有界异步任务并发辅助工具 |
    | `plugin-sdk/dedupe-runtime` | 内存和持久化后端去重缓存辅助工具 |
    | `plugin-sdk/delivery-queue-runtime` | 2026 年 7 月后为私有本地模块；出站待处理交付排空辅助工具 |
    | `plugin-sdk/file-access-runtime` | 2026 年 7 月后为私有本地模块；安全本地文件、临时根目录、媒体源路径和目录持久性辅助工具 |
    | `plugin-sdk/heartbeat-runtime` | 2026 年 7 月后为私有本地模块；Heartbeat 唤醒、事件和可见性辅助工具 |
    | `plugin-sdk/expect-runtime` | 2026 年 7 月后为私有本地模块；用于可证明 runtime 不变量的必需值断言辅助工具 |
    | `plugin-sdk/number-runtime` | 2026 年 7 月后为私有本地模块；数值强制转换辅助工具 |
    | `plugin-sdk/secure-random-runtime` | 2026 年 7 月后为私有本地模块；安全 token／UUID 辅助工具 |
    | `plugin-sdk/system-event-runtime` | 2026 年 7 月后为私有本地模块；窄范围系统事件入队／查看辅助工具 |
    | `plugin-sdk/transport-ready-runtime` | 2026 年 7 月后为私有本地模块；Transport 就绪等待辅助工具 |
    | `plugin-sdk/exec-approvals-runtime` | 2026 年 7 月后为私有本地模块；不含宽泛 infra-runtime barrel 的 Exec 审批策略文件辅助工具 |
    | `plugin-sdk/infra-runtime` | 已弃用的兼容性 shim；请使用注入式 runtime API 或文档化的类型化公开子路径 |
    | `plugin-sdk/collection-runtime` | 小型有界缓存辅助工具 |
    | `plugin-sdk/diagnostic-runtime` | Diagnostic 标志、事件、trace-context 和低基数维度规范化辅助工具 |
    | `plugin-sdk/error-runtime` | Error graph、格式化、未知值强制转换、共享错误分类辅助工具、`PlatformMessageNotDispatchedError`、`isApprovalNotFoundError` |
    | `plugin-sdk/fetch-runtime` | 2026 年 7 月后为私有本地模块；包装 fetch、proxy、EnvHttpProxyAgent 选项和固定 lookup 辅助工具 |
    | `plugin-sdk/runtime-fetch` | 2026 年 7 月后为私有本地模块；不导入 proxy／guarded-fetch 的支持 dispatcher 的 runtime fetch |
    | `plugin-sdk/inline-image-data-url-runtime` | 2026 年 7 月后为私有本地模块；不含宽泛 media runtime 接口的内联图像 data URL 清理和签名探测辅助工具 |
    | `plugin-sdk/response-limit-runtime` | 2026 年 7 月后为私有本地模块；不含宽泛 media runtime 接口的按字节、空闲时间和截止时间限制的响应 body 读取器 |
    | `plugin-sdk/session-binding-runtime` | 2026 年 7 月后为私有本地模块；不含已配置 binding 路由或配对存储的当前会话 binding 状态 |
    | `plugin-sdk/context-visibility-runtime` | 2026 年 7 月后为私有本地模块；不含宽泛 config／security 导入的上下文可见性解析和补充上下文过滤 |
    | `plugin-sdk/string-coerce-runtime` | 不含 markdown／logging 导入的窄范围基础 record／字符串强制转换和规范化辅助工具 |
    | `plugin-sdk/html-entity-runtime` | 2026 年 7 月后为私有本地模块；不含宽泛文本工具的单次、以分号结尾的 HTML5 entity 解码 |
    | `plugin-sdk/text-utility-runtime` | 2026 年 7 月后为私有本地模块；底层文本和路径辅助工具，包括五种 entity 的 HTML 转义 |
    | `plugin-sdk/widget-html` | 自包含 HTML widget 的完整文档检测、大小验证和工具输入错误 |
    | `plugin-sdk/host-runtime` | 2026 年 7 月后为私有本地模块；Hostname 和 SCP Host 规范化辅助工具 |
    | `plugin-sdk/retry-runtime` | 2026 年 7 月后为私有本地模块；Retry 配置和 retry runner 辅助工具 |
    | `plugin-sdk/agent-runtime` | 已弃用的宽泛 barrel，用于 agent 目录／身份／工作区辅助工具，包括 `resolveAgentDir`、`resolveDefaultAgentDir` 和已弃用的 `resolveOpenClawAgentDir` 兼容性导出；请优先使用聚焦的 agent／runtime 子路径 |
    | `plugin-sdk/directory-runtime` | 基于配置的目录查询／去重 |
    | `plugin-sdk/keyed-async-queue` | 2026 年 7 月后为私有本地模块；`KeyedAsyncQueue` |
  </Accordion>

  <Accordion title="能力与测试子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/media-runtime` | 已弃用的宽泛 media barrel，包括 `saveRemoteMedia`、`saveResponseMedia`、`readRemoteMediaBuffer` 和已弃用的 `fetchRemoteMedia`；请优先使用 `plugin-sdk/media-store`、`plugin-sdk/media-mime`、`plugin-sdk/outbound-media` 和 capability runtime 子路径；当 URL 应转换为 OpenClaw media 时，优先使用 store 辅助工具，再读取 buffer |
    | `plugin-sdk/media-local-roots` | 聚焦的 `getAgentScopedMediaLocalRoots(...)` 和具备策略感知能力的 `getAgentScopedMediaLocalRootsForSources(...)` 辅助工具，用于插件自有的本地媒体读取 |
    | `plugin-sdk/media-mime` | 窄范围 MIME 规范化、文件扩展名映射、MIME 检测和媒体类型辅助工具 |
    | `plugin-sdk/media-store` | 窄范围媒体存储辅助工具，例如 `saveMediaBuffer` 和 `saveMediaStream` |
    | `plugin-sdk/media-generation-runtime` | 2026 年 7 月后为私有本地模块；共享媒体生成故障转移辅助工具、候选项选择和模型缺失消息 |
    | `plugin-sdk/media-understanding` | media-understanding Provider 类型和辅助工具的已弃用兼容性门面；新 Provider 通过注入的插件 API 注册，并将请求辅助工具保留在插件内部 |
    | `plugin-sdk/text-chunking` | 出站文本和保留偏移量的范围分块、markdown 分块／渲染辅助工具、引号感知的 HTML 标签标记化、markdown 表格转换、指令标签剥离和安全文本工具 |
    | `plugin-sdk/speech` | 2026 年 7 月后为私有本地模块；Speech Provider 类型以及面向 Provider 的指令、registry、验证、OpenAI-compatible TTS 构建器和 speech 辅助工具导出 |
    | `plugin-sdk/speech-core` | 2026 年 7 月后为私有本地模块；共享 Speech Provider 类型、registry、指令、规范化和 speech 辅助工具导出 |
    | `plugin-sdk/speech-settings` | 不含 Provider registry 或 synthesis runtime 的轻量 TTS 配置解析和规范化原语 |
    | `plugin-sdk/realtime-transcription` | 2026 年 7 月后为私有本地模块；Realtime transcription Provider 类型、registry 辅助工具和共享 WebSocket session 辅助工具 |
    | `plugin-sdk/realtime-bootstrap-context` | 2026 年 7 月后为私有本地模块；用于注入有界 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 上下文的 Realtime profile bootstrap 辅助工具 |
    | `plugin-sdk/realtime-voice-audio-queue` | 仅限私有本地 JavaScript 的 Host runtime，供 Bundled 或单独发布的官方插件使用；面向延迟 realtime voice Provider 门面的窄范围有界音频队列接缝；不导入更广泛的 realtime voice runtime；不供第三方插件使用 |
    | `plugin-sdk/realtime-voice-activation` | 私有本地模块；低依赖 realtime-voice activation-name 辅助工具（规范化、匹配、单词计数、排序），用于 doctor contract closure 和其他不得加载 realtime voice runtime 的 control-plane 路径 |
    | `plugin-sdk/realtime-voice` | 2026 年 7 月后为私有本地模块；Realtime voice Provider 类型、registry 辅助工具、共享音频能量／speech-onset gate 和 realtime voice 行为辅助工具，包括与 transport 无关的 session harness 和输出活动跟踪。对于官方 runtime 使用者，sender-auth 契约修订版 1 会原样转发经过 ingress auth 的 `senderId` 和 `senderIsOwner`；认证由 ingress 负责，需要该交接的使用者必须针对其他修订版默认拒绝。 |
    | `plugin-sdk/meeting-runtime` | Browser-meeting session runtime、realtime audio engine／transport、`MeetingPlatformAdapter`、browser／node 控制、agent-consult、voice-call delegation、设置检查和 SoX 命令辅助工具 |
    | `plugin-sdk/image-generation` | 2026 年 7 月后为私有本地模块；Image generation Provider 类型以及 image asset／data URL 辅助工具和 OpenAI-compatible image Provider 构建器 |
    | `plugin-sdk/image-generation-core` | 2026 年 7 月后为私有本地模块；共享 image-generation 类型、故障转移、auth 和 registry 辅助工具 |
    | `plugin-sdk/music-generation` | 2026 年 7 月后为私有本地模块；Music generation Provider／request／result 类型 |
    | `plugin-sdk/video-generation` | 2026 年 7 月后为私有本地模块；Video generation Provider／request／result 类型 |
    | `plugin-sdk/video-generation-core` | 2026 年 7 月后为私有本地模块；共享 video-generation 类型、故障转移辅助工具、Provider 查找和 model-ref 解析 |
    | `plugin-sdk/transcripts` | 2026 年 7 月后为私有本地模块；共享 transcript source Provider 类型、registry 辅助工具、meeting-provider bridge factory、session descriptor 和 utterance 元数据 |
    | `plugin-sdk/webhook-targets` | 2026 年 7 月后为私有本地模块；Webhook target registry 和 route-install 辅助工具 |
    | `plugin-sdk/web-media` | 共享远程／本地媒体加载辅助工具 |
    | `plugin-sdk/plugin-test-api` | 仓库本地的最小 `createTestPluginApi` 辅助工具，用于直接插件注册单元测试，而无需导入仓库测试辅助 bridge |
    | `plugin-sdk/agent-runtime-test-contracts` | 仓库本地的原生 agent-runtime adapter 契约 fixture，用于 auth、delivery、fallback、tool-hook、prompt-overlay、schema 和 transcript projection 测试 |
    | `plugin-sdk/channel-test-helpers` | 仓库本地的 Channel 测试辅助工具，用于通用 action／setup／status 契约、目录断言、账户启动生命周期、send-config 传递、runtime mock、状态问题、出站交付和 hook 注册 |
    | `plugin-sdk/channel-target-testing` | 仓库本地的共享 target-resolution 错误用例套件，用于 Channel 测试 |
    | `plugin-sdk/channel-contract-testing` | 仓库本地的窄范围 Channel 契约测试辅助工具，不含宽泛 testing barrel |
    | `plugin-sdk/plugin-test-contracts` | 仓库本地的 plugin package、注册、公开 artifact、直接导入、runtime API 和导入副作用契约辅助工具 |
    | `plugin-sdk/plugin-state-test-runtime` | 仓库本地的 plugin state store、ingress queue 和 state DB 测试辅助工具 |
    | `plugin-sdk/provider-test-contracts` | 仓库本地的 Provider runtime、auth、discovery、onboard、catalog、wizard、media capability、replay policy、realtime STT live-audio、web-search／fetch 和 stream 契约辅助工具 |
    | `plugin-sdk/provider-http-test-mocks` | 2026 年 7 月后为私有本地模块；仓库本地的可选 Vitest HTTP／auth mock，用于测试调用 `plugin-sdk/provider-http` 的 Provider |
    | `plugin-sdk/reply-payload-testing` | 仓库本地的辅助工具，用于向 reply payload fixture 附加元数据 |
    | `plugin-sdk/sqlite-runtime-testing` | 仓库本地的 SQLite 生命周期辅助工具，用于一方测试 |
    | `plugin-sdk/test-state` | 仓库本地的隔离 OpenClaw 状态、配置、工作区、环境和 auth-profile fixture，用于插件测试 |
    | `plugin-sdk/test-fixtures` | 仓库本地的通用 CLI runtime 捕获、sandbox context、skill writer、agent-message、system-event、模块重新加载、Bundled 插件路径、终端文本、分块、auth-token 和类型化用例 fixture |
    | `plugin-sdk/test-node-mocks` | 仓库本地的聚焦 Node 内置模块 mock 辅助工具，用于 Vitest `vi.mock("node:*")` factory 内部 |
  </Accordion>

  <Accordion title="Memory 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/memory-core-host-embedding-registry` | 2026 年 7 月后为私有本地模块；轻量 Memory embedding Provider registry 辅助工具 |
    | `plugin-sdk/memory-core-host-engine-curated` | 面向 doctor 和 promotion 路径的私有本地精选 Memory annotation 解析 |
    | `plugin-sdk/memory-core-host-engine-foundation` | Memory host foundation engine 导出 |
    | `plugin-sdk/memory-core-host-engine-fs` | 面向 doctor 迁移的私有本地聚焦文件系统和用户路径辅助工具 |
    | `plugin-sdk/memory-core-host-engine-embeddings` | 2026 年 7 月后为私有本地模块；Memory host embedding 契约、registry 访问、本地 Provider 和通用 batch／remote 辅助工具。此表面的 `registerMemoryEmbeddingProvider` 已弃用；新 Provider 请使用通用 embedding Provider API。 |
    | `plugin-sdk/memory-core-host-engine-sessions` | 2026 年 7 月后为私有本地模块；Memory session transcript 和查询辅助工具 |
    | `plugin-sdk/memory-core-host-engine-schema` | 面向 doctor 迁移的私有本地聚焦 Memory index schema 和 sqlite-vec 辅助工具 |
    | `plugin-sdk/memory-core-host-engine-storage` | 2026 年 7 月后为私有本地模块；Memory host storage engine 导出 |
    | `plugin-sdk/memory-core-host-secret` | 2026 年 7 月后为私有本地模块；。Memory host secret 辅助工具 |
    | `plugin-sdk/memory-core-host-status` | 2026 年 7 月后为私有本地模块；Memory host 状态辅助工具 |
    | `plugin-sdk/memory-core-host-runtime-cli` | 2026 年 7 月后为私有本地模块；Memory host CLI runtime 辅助工具 |
    | `plugin-sdk/memory-core-host-runtime-core` | 2026 年 7 月后为私有本地模块；Memory host core runtime 辅助工具 |
    | `plugin-sdk/memory-core-host-runtime-files` | 2026 年 7 月后为私有本地模块；Memory host 文件／runtime 辅助工具 |
    | `plugin-sdk/memory-host-core` | Vendor-neutral Memory host 辅助工具的已弃用兼容性门面。新的 Memory 插件使用注入的 Memory 能力和 Host 准备的 prompt；在存在聚焦读取接缝之前，配套插件仍使用保留的门面进行公开 artifact 发现。 |
    | `plugin-sdk/memory-host-events` | 2026 年 7 月后为私有本地模块；Memory host event journal 辅助工具的 Vendor-neutral 别名 |
    | `plugin-sdk/memory-host-markdown` | 2026 年 7 月后为私有本地模块；面向 Memory 相关插件的共享 managed-markdown 辅助工具 |
    | `plugin-sdk/memory-host-search` | 2026 年 7 月后为私有本地模块；用于访问 search-manager 的活动 Memory runtime 门面 |
  </Accordion>

  <Accordion title="保留的 Bundled 辅助模块子路径">
    保留的 Bundled 辅助模块 SDK 子路径是面向 Bundled 插件代码的窄范围、特定所有者表面。
    它们会被纳入 SDK inventory，以确保包构建和别名保持确定性，但并非通用的插件开发 API。新的可复用 Host 契约应使用通用 SDK 子路径，例如
    `plugin-sdk/gateway-runtime` 和 `plugin-sdk/ssrf-runtime`。

    | 子路径 | 所有者与用途 |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | 2026 年 7 月后为私有本地模块；用于将用户 MCP server config 投影到 Codex app-server thread config 的 Bundled Codex 插件辅助工具（仅默认导出的包导出） |
    | `plugin-sdk/codex-session-transcript-runtime` | 用于序列化 transcript-mirror 写入的私有本地 Bundled Codex 插件辅助工具（仅默认导出的包导出） |

  </Accordion>
</AccordionGroup>

## 相关内容

- [插件 SDK 概览](/plugins/sdk-overview)
- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
