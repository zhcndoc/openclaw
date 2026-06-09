我会严格保留原有 Markdown/HTML 结构，只翻译可见文本内容，并先检查是否有仓库级说明会影响这类文档翻译。先快速确认一下仓库指引与需要保留的格式边界，然后直接给出翻译结果。---
summary: "插件 SDK 的子路径目录：按领域分组说明各类导入位置"
read_when:
  - 为插件导入选择合适的 `plugin-sdk` 子路径
  - 审核 `bundled-plugin` 子路径和 helper 接口面
title: "插件 SDK 子路径"
---

插件 SDK 作为一组窄范围的公共子路径暴露在
`openclaw/plugin-sdk/` 下。本页按用途整理了常用子路径。生成的编译器入口清单位于
`scripts/lib/plugin-sdk-entrypoints.json`；包导出是在扣除
`scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的仓库本地测试/内部子路径后的公共子集。维护者可以使用 `pnpm plugin-sdk:surface` 审核公共导出数量，并使用 `pnpm plugins:boundary-report:summary` 查看当前保留的 helper 子路径；未使用的保留 helper 导出会在 CI 报告中失败，而不会继续作为公共 SDK 中惰性的兼容性债务存在。

有关插件编写指南，请参见 [Plugin SDK overview](/plugins/sdk-overview)。

## 插件入口

| 子路径                         | 主要导出                                                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`      | `definePluginEntry`                                                                                                                                                    |
| `plugin-sdk/core`              | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema`, `buildJsonChannelConfigSchema` |
| `plugin-sdk/config-schema`     | `OpenClawSchema`                                                                                                                                                       |
| `plugin-sdk/provider-entry`    | `defineSingleProviderPluginEntry`                                                                                                                                      |
| `plugin-sdk/migration`         | 迁移 provider item helper，例如 `createMigrationItem`、原因常量、item 状态标记、脱敏 helper，以及 `summarizeMigrationItems`                 |
| `plugin-sdk/migration-runtime` | 运行时迁移 helper，例如 `copyMigrationFileItem`、`withCachedMigrationConfigRuntime` 和 `writeMigrationReport`                                              |
| `plugin-sdk/health`            | 面向 bundled health consumer 的 Doctor 健康检查注册、检测、修复、选择、严重级别和 finding 类型                                               |

### 已弃用的兼容性和测试 helper

Deprecated subpaths stay exported for older plugins, but new code should use the
focused SDK subpaths below. The maintained list is
`scripts/lib/plugin-sdk-deprecated-public-subpaths.json`; CI rejects bundled
production imports from it. Broad barrels such as `compat`, `config-types`,
`infra-runtime`, `text-runtime`, and `zod` are compatibility only. Import `zod`
directly from `zod`.

OpenClaw's Vitest-backed test-helper subpaths are repo-local only and are no
longer package exports: `agent-runtime-test-contracts`,
`channel-contract-testing`, `channel-target-testing`, `channel-test-helpers`,
`plugin-test-api`, `plugin-test-contracts`, `plugin-test-runtime`,
`provider-http-test-mocks`, `provider-test-contracts`, `test-env`,
`test-fixtures`, `test-node-mocks`, and `testing`.

### 保留的 bundled plugin helper 子路径

这些子路径是面向其所属 bundled plugin 的插件自有兼容性表面，不是通用 SDK API：`plugin-sdk/codex-mcp-projection` 和
`plugin-sdk/codex-native-task-runtime`。跨所有者的扩展导入会被包契约防护机制阻止。

<AccordionGroup>
  <Accordion title="Channel 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` 的 Zod schema 导出（`OpenClawSchema`） |
    | `plugin-sdk/json-schema-runtime` | 面向插件自有 schema 的缓存 JSON Schema 验证 helper |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`，以及 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` |
    | `plugin-sdk/setup` | 共享 setup 向导 helper、setup translator、allowlist 提示、setup 状态构建器 |
    | `plugin-sdk/setup-runtime` | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | 已弃用的兼容性别名；请使用 `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多账号 config/action-gate helper，默认账号回退 helper |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`，账号 ID 规范化 helper |
    | `plugin-sdk/account-resolution` | 账号查找 + 默认回退 helper |
    | `plugin-sdk/account-helpers` | 窄范围账号列表/账号动作 helper |
    | `plugin-sdk/access-groups` | 访问组 allowlist 解析和脱敏组诊断 helper |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | 已弃用的兼容性门面。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共享 channel config schema 基元，以及 Zod 和直接 JSON/TypeBox 构建器 |
    | `plugin-sdk/bundled-channel-config-schema` | 仅供受维护的 bundled plugin 使用的 Bundled OpenClaw channel config schemas |
    | `plugin-sdk/chat-channel-ids` | `BUNDLED_CHAT_CHANNEL_IDS`, `BUNDLED_CHAT_CHANNEL_ENVELOPE_PREFIXES`, `ChatChannelId`。为需要识别 envelope 前缀文本、且不想硬编码自身表的插件提供规范化的 bundled/official chat channel ids 及格式化标签/别名。 |
    | `plugin-sdk/channel-config-schema-legacy` | bundled-channel config schemas 的已弃用兼容性别名 |
    | `plugin-sdk/telegram-command-config` | 带 bundled-contract 回退的 Telegram 自定义命令规范化/验证 helper |
    | `plugin-sdk/command-gating` | 窄范围命令授权门控 helper |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | 已弃用的低层 channel ingress 兼容性门面。新的接收路径应使用 `plugin-sdk/channel-ingress-runtime`。 |
    | `plugin-sdk/channel-ingress-runtime` | 面向已迁移 channel 接收路径的实验性高层 channel ingress runtime resolver 和 route fact builder。请优先使用它，而不是在每个插件中各自组装有效 allowlist、命令 allowlist 和旧版投影。参见 [Channel ingress API](/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-lifecycle` | 已弃用的兼容性门面。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-outbound` | 消息生命周期契约，以及 reply pipeline 选项、回执、实时预览/流式处理、生命周期 helper、outbound 身份、payload 规划、持久化发送和消息发送上下文 helper。参见 [Channel outbound API](/plugins/sdk-channel-outbound)。 |
    | `plugin-sdk/channel-message` | `plugin-sdk/channel-outbound` 的已弃用兼容性别名，外加旧版 reply-dispatch 门面。 |
    | `plugin-sdk/channel-message-runtime` | `plugin-sdk/channel-outbound` 的已弃用兼容性别名，外加旧版 reply-dispatch 门面。 |
    | `plugin-sdk/inbound-envelope` | 共享 inbound route + envelope builder helper |
    | `plugin-sdk/inbound-reply-dispatch` | 已弃用的兼容性门面。入站 runner 和 dispatch predicate 请使用 `plugin-sdk/channel-inbound`，消息投递 helper 请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/messaging-targets` | 已弃用的 target 解析别名；请使用 `plugin-sdk/channel-targets` |
    | `plugin-sdk/outbound-media` | 共享 outbound media 加载和 hosted-media 状态 helper |
    | `plugin-sdk/outbound-send-deps` | 已弃用的兼容性门面。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/outbound-runtime` | 已弃用的兼容性门面。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/poll-runtime` | 窄范围 poll 规范化 helper |
    | `plugin-sdk/thread-bindings-runtime` | 线程绑定生命周期和适配器 helper |
    | `plugin-sdk/agent-media-payload` | 旧版 agent media payload 构建器 |
    | `plugin-sdk/conversation-runtime` | conversation/thread 绑定、配对和已配置绑定 helper |
    | `plugin-sdk/runtime-config-snapshot` | 运行时 config snapshot helper |
    | `plugin-sdk/runtime-group-policy` | 运行时 group-policy 解析 helper |
    | `plugin-sdk/channel-status` | 共享 channel status snapshot/summary helper |
    | `plugin-sdk/channel-config-primitives` | 窄范围 channel config-schema 基元 |
    | `plugin-sdk/channel-config-writes` | channel config 写入授权 helper |
    | `plugin-sdk/channel-plugin-common` | 共享 channel plugin prelude 导出 |
    | `plugin-sdk/allowlist-config-edit` | allowlist config 编辑/读取 helper |
    | `plugin-sdk/group-access` | 共享 group-access 决策 helper |
    | `plugin-sdk/direct-dm`, `plugin-sdk/direct-dm-access` | 已弃用的兼容性门面。请使用 `plugin-sdk/channel-inbound`。 |
    | `plugin-sdk/direct-dm-guard-policy` | 窄范围 direct-DM pre-crypto guard policy helper |
    | `plugin-sdk/discord` | 面向已发布 `@openclaw/discord@2026.3.13` 及已跟踪 owner 兼容性的已弃用 Discord 兼容性门面；新插件应使用通用 channel SDK 子路径 |
    | `plugin-sdk/telegram-account` | 面向已跟踪 owner 兼容性的已弃用 Telegram account-resolution 兼容性门面；新插件应使用注入的 runtime helper 或通用 channel SDK 子路径 |
    | `plugin-sdk/zalouser` | 面向已发布仍导入 sender command authorization 的 Lark/Zalo 包的已弃用 Zalo Personal 兼容性门面；新插件应使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 语义化消息呈现、投递和旧版 interactive reply helper。参见 [Message Presentation](/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 用于事件分类、上下文构建、格式化、根、debounce、mention 匹配、mention-policy 和 inbound logging 的共享入站 helper |
    | `plugin-sdk/channel-inbound-debounce` | 窄范围 inbound debounce helper |
    | `plugin-sdk/channel-mention-gating` | 不含更广泛 inbound runtime 表面的窄范围 mention-policy、mention marker 和 mention text helper |
    | `plugin-sdk/channel-envelope`, `plugin-sdk/channel-inbound-roots`, `plugin-sdk/channel-location`, `plugin-sdk/channel-logging` | 已弃用的兼容性门面。请使用 `plugin-sdk/channel-inbound` 或 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-pairing-paths` | 已弃用的兼容性门面。请使用 `plugin-sdk/channel-pairing`。 |
    | `plugin-sdk/channel-reply-options-runtime` | 已弃用的兼容性门面。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-streaming` | 已弃用的兼容性门面。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-send-result` | reply 结果类型 |
    | `plugin-sdk/channel-actions` | channel message-action helper，外加为插件兼容性保留的已弃用 native schema helper |
    | `plugin-sdk/channel-route` | 共享 route 规范化、基于 parser 的 target 解析、thread-id 字符串化、route key 去重/压缩、parsed-target 类型，以及 route/target 比较 helper |
    | `plugin-sdk/channel-targets` | target 解析 helper；route 比较调用方应使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | channel contract 类型 |
    | `plugin-sdk/channel-feedback` | feedback/reaction 接线 |
    | `plugin-sdk/channel-secret-runtime` | 窄范围 secret-contract helper，例如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment` 以及 secret target 类型 |
  </Accordion>

Deprecated channel helper families stay available only for published-plugin
compatibility. The removal plan is: keep them through the external plugin
migration window, keep repo/bundled plugins on `channel-inbound` and
`channel-outbound`, then remove the compatibility subpaths in the next major
SDK cleanup. This applies to the old channel message/runtime, channel
streaming, direct-DM access, inbound helper splinter, reply-options,
and pairing-path families.

  <Accordion title="Provider 子路径">
    | Subpath | Key exports |
    | --- | --- |
    | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` |
    | `plugin-sdk/lmstudio` | Supported LM Studio provider facade for setup, catalog discovery, and runtime model preparation |
    | `plugin-sdk/lmstudio-runtime` | Supported LM Studio runtime facade for local server defaults, model discovery, request headers, and loaded-model helpers |
    | `plugin-sdk/provider-setup` | Curated local/self-hosted provider setup helpers |
    | `plugin-sdk/self-hosted-provider-setup` | Focused OpenAI-compatible self-hosted provider setup helpers |
    | `plugin-sdk/cli-backend` | CLI backend defaults + watchdog constants |
    | `plugin-sdk/provider-auth-runtime` | Runtime API-key resolution helpers for provider plugins |
    | `plugin-sdk/provider-oauth-runtime` | Generic provider OAuth callback types, callback-page rendering, PKCE/state helpers, authorization-input parsing, token-expiry helpers, and abort helpers |
    | `plugin-sdk/provider-auth-api-key` | API-key onboarding/profile-write helpers such as `upsertApiKeyProfile` |
    | `plugin-sdk/provider-auth-result` | Standard OAuth auth-result builder |
    | `plugin-sdk/provider-env-vars` | Provider auth env-var lookup helpers |
    | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`, `writeOAuthCredentials`, OpenAI Codex auth-import helpers, deprecated `resolveOpenClawAgentDir` compatibility export |
    | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, shared replay-policy builders, provider-endpoint helpers, and shared model-id normalization helpers |
    | `plugin-sdk/provider-catalog-live-runtime` | Live provider model catalog helpers for guarded `/models`-style discovery: `buildLiveModelProviderConfig`, `fetchLiveProviderModelRows`, `getCachedLiveProviderModelRows`, `fetchLiveProviderModelIds`, `LiveModelCatalogHttpError`, `clearLiveCatalogCacheForTests`, model-id filtering, TTL cache, and static fallback |
    | `plugin-sdk/provider-catalog-runtime` | Provider catalog augmentation runtime hook and plugin-provider registry seams for contract tests |
    | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` |
    | `plugin-sdk/provider-http` | Generic provider HTTP/endpoint capability helpers, provider HTTP errors, and audio transcription multipart form helpers |
    | `plugin-sdk/provider-web-fetch-contract` | Narrow web-fetch config/selection contract helpers such as `enablePluginInConfig` and `WebFetchProviderPlugin` |
    | `plugin-sdk/provider-web-fetch` | Web-fetch provider registration/cache helpers |
    | `plugin-sdk/provider-web-search-config-contract` | Narrow web-search config/credential helpers for providers that do not need plugin-enable wiring |
    | `plugin-sdk/provider-web-search-contract` | Narrow web-search config/credential contract helpers such as `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, and scoped credential setters/getters |
    | `plugin-sdk/provider-web-search` | Web-search provider registration/cache/runtime helpers |
    | `plugin-sdk/embedding-providers` | General embedding provider types and read helpers, including `EmbeddingProviderAdapter`, `getEmbeddingProvider(...)`, and `listEmbeddingProviders(...)`; plugins register providers through `api.registerEmbeddingProvider(...)` so manifest ownership is enforced |
    | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, and DeepSeek/Gemini/OpenAI schema cleanup + diagnostics |
    | `plugin-sdk/provider-usage` | Provider usage snapshot types, shared usage fetch helpers, and provider fetchers such as `fetchClaudeUsage` |
    | `plugin-sdk/provider-stream` | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, stream wrapper types, plain-text tool-call compat, and shared Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot wrapper helpers |
    | `plugin-sdk/provider-stream-shared` | Public shared provider stream wrapper helpers including `composeProviderStreamWrappers`, `createPlainTextToolCallCompatWrapper`, `createPayloadPatchStreamWrapper`, `createToolStreamWrapper`, and Anthropic/DeepSeek/OpenAI-compatible stream utilities |
    | `plugin-sdk/provider-transport-runtime` | Native provider transport helpers such as guarded fetch, transport message transforms, and writable transport event streams |
    | `plugin-sdk/provider-onboard` | Onboarding config patch helpers |
    | `plugin-sdk/global-singleton` | Process-local singleton/map/cache helpers |
    | `plugin-sdk/group-activation` | Narrow group activation mode and command parsing helpers |
  </Accordion>

Provider usage snapshots normally report one or more quota `windows`, each with
a label, percent used, and optional reset time. Providers that expose balance or
account-state text instead of resettable quota windows should return
`summary` with an empty `windows` array rather than fabricating percentages.
OpenClaw displays that summary text in status output; use `error` only when the
usage endpoint failed or returned no usable usage data.

  <Accordion title="Auth and security subpaths">
    | Subpath | Key exports |
    | --- | --- |
    | `plugin-sdk/command-auth` | `resolveControlCommandGate`, command registry helpers including dynamic argument menu formatting, sender-authorization helpers |
    | `plugin-sdk/command-status` | Command/help message builders such as `buildCommandsMessagePaginated` and `buildHelpMessage` |
    | `plugin-sdk/approval-auth-runtime` | Approver resolution and same-chat action-auth helpers |
    | `plugin-sdk/approval-client-runtime` | Native exec approval profile/filter helpers |
    | `plugin-sdk/approval-delivery-runtime` | Native approval capability/delivery adapters |
    | `plugin-sdk/approval-gateway-runtime` | Shared approval gateway-resolution helper |
    | `plugin-sdk/approval-handler-adapter-runtime` | Lightweight native approval adapter loading helpers for hot channel entrypoints |
    | `plugin-sdk/approval-handler-runtime` | Broader approval handler runtime helpers; prefer the narrower adapter/gateway seams when they are enough |
    | `plugin-sdk/approval-native-runtime` | Native approval target, account-binding, route-gate, forwarding fallback, and local native exec prompt suppression helpers |
    | `plugin-sdk/approval-reaction-runtime` | Hardcoded approval reaction bindings, reaction prompt payloads, reaction target stores, and compatibility export for local native exec prompt suppression |
    | `plugin-sdk/approval-reply-runtime` | Exec/plugin approval reply payload helpers |
    | `plugin-sdk/approval-runtime` | Exec/plugin approval payload helpers, native approval routing/runtime helpers, and structured approval display helpers such as `formatApprovalDisplayPath` |
    | `plugin-sdk/reply-dedupe` | Narrow inbound reply dedupe reset helpers |
    | `plugin-sdk/channel-contract-testing` | Narrow channel contract test helpers without the broad testing barrel |
    | `plugin-sdk/command-auth-native` | Native command auth, dynamic argument menu formatting, and native session-target helpers |
    | `plugin-sdk/command-detection` | Shared command detection helpers |
    | `plugin-sdk/command-primitives-runtime` | Lightweight command text predicates for hot channel paths |
    | `plugin-sdk/command-surface` | Command-body normalization and command-surface helpers |
    | `plugin-sdk/allow-from` | `formatAllowFromLowercase` |
    | `plugin-sdk/channel-secret-runtime` | Narrow secret-contract collection helpers for channel/plugin secret surfaces |
    | `plugin-sdk/secret-ref-runtime` | Narrow `coerceSecretRef` and SecretRef typing helpers for secret-contract/config parsing |
    | `plugin-sdk/secret-provider-integration` | Type-only SecretRef provider integration manifest and preset contracts for plugins that publish external secret provider presets |
    | `plugin-sdk/security-runtime` | Shared trust, DM gating, root-bounded file/path helpers including create-only writes, sync/async atomic file replacement, sibling temp writes, cross-device move fallback, private file-store helpers, symlink-parent guards, external-content, sensitive text redaction, constant-time secret comparison, and secret-collection helpers |
    | `plugin-sdk/ssrf-policy` | Host allowlist and private-network SSRF policy helpers |
    | `plugin-sdk/ssrf-dispatcher` | Narrow pinned-dispatcher helpers without the broad infra runtime surface |
    | `plugin-sdk/ssrf-runtime` | Pinned-dispatcher, SSRF-guarded fetch, SSRF error, and SSRF policy helpers |
    | `plugin-sdk/secret-input` | Secret input parsing helpers |
    | `plugin-sdk/webhook-ingress` | Webhook request/target helpers and raw websocket/body coercion |
    | `plugin-sdk/webhook-request-guards` | Request body size/timeout helpers |
  </Accordion>

  <Accordion title="运行时与存储子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/runtime` | 宽泛的运行时/日志/备份/插件安装 helper |
    | `plugin-sdk/runtime-env` | 窄范围运行时环境、logger、timeout、retry 和 backoff helper |
    | `plugin-sdk/browser-config` | 面向规范化 profile/default、CDP URL 解析和 browser-control 认证 helper 的受支持浏览器配置门面 |
    | `plugin-sdk/agent-harness-task-runtime` | 面向使用主机分配 task scope 的 harness-backed agent 的通用任务生命周期和完成交付 helper |
    | `plugin-sdk/codex-mcp-projection` | 保留的 bundled Codex helper，用于将用户 MCP server config 投影到 Codex thread config；不供第三方插件使用 |
    | `plugin-sdk/codex-native-task-runtime` | 私有的 bundled Codex helper，用于 native task mirror/runtime wiring；不供第三方插件使用 |
    | `plugin-sdk/channel-runtime-context` | 通用 channel runtime-context 注册和查找 helper |
    | `plugin-sdk/matrix` | 面向较旧第三方 channel 包的已弃用 Matrix 兼容性门面；新插件应直接导入 `plugin-sdk/run-command` |
    | `plugin-sdk/mattermost` | 面向较旧第三方 channel 包的已弃用 Mattermost 兼容性门面；新插件应直接导入通用 SDK 子路径 |
    | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` |
    | `plugin-sdk/plugin-runtime` | Shared plugin command/hook/http/interactive helpers |
    | `plugin-sdk/hook-runtime` | Shared webhook/internal hook pipeline helpers |
    | `plugin-sdk/lazy-runtime` | Lazy runtime import/binding helpers such as `createLazyRuntimeModule`, `createLazyRuntimeMethod`, and `createLazyRuntimeSurface` |
    | `plugin-sdk/process-runtime` | Process exec helpers |
    | `plugin-sdk/cli-runtime` | CLI formatting, wait, version, argument-invocation, and lazy command-group helpers |
    | `plugin-sdk/qa-live-transport-scenarios` | Shared live transport QA scenario ids, baseline coverage helpers, and scenario-selection helper |
    | `plugin-sdk/gateway-method-runtime` | Reserved Gateway method dispatch helper for plugin HTTP routes that declare `contracts.gatewayMethodDispatch: ["authenticated-request"]` |
    | `plugin-sdk/gateway-runtime` | Gateway client, event-loop-ready client start helper, gateway CLI RPC, gateway protocol errors, and channel-status patch helpers |
    | `plugin-sdk/config-contracts` | Focused type-only config surface for plugin config shapes such as `OpenClawConfig` and channel/provider config types |
    | `plugin-sdk/plugin-config-runtime` | Runtime plugin-config lookup helpers such as `requireRuntimeConfig`, `resolvePluginConfigObject`, and `resolveLivePluginConfigObject` |
    | `plugin-sdk/config-mutation` | Transactional config mutation helpers such as `mutateConfigFile`, `replaceConfigFile`, and `logConfigUpdated` |
    | `plugin-sdk/runtime-config-snapshot` | Current process config snapshot helpers such as `getRuntimeConfig`, `getRuntimeConfigSnapshot`, and test snapshot setters |
    | `plugin-sdk/telegram-command-config` | Telegram command-name/description normalization and duplicate/conflict checks, even when the bundled Telegram contract surface is unavailable |
    | `plugin-sdk/text-autolink-runtime` | File-reference autolink detection without the broad text barrel |
    | `plugin-sdk/approval-reaction-runtime` | Hardcoded approval reaction bindings, reaction prompt payloads, reaction target stores, and compatibility export for local native exec prompt suppression |
    | `plugin-sdk/approval-runtime` | Exec/plugin approval helpers, approval-capability builders, auth/profile helpers, native routing/runtime helpers, and structured approval display path formatting |
    | `plugin-sdk/reply-runtime` | Shared inbound/reply runtime helpers, chunking, dispatch, heartbeat, reply planner |
    | `plugin-sdk/reply-dispatch-runtime` | Narrow reply dispatch/finalize and conversation-label helpers |
    | `plugin-sdk/reply-history` | Shared short-window reply-history helpers. New message-turn code should use `createChannelHistoryWindow`; lower-level map helpers remain deprecated compatibility exports only |
    | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` |
    | `plugin-sdk/reply-chunking` | Narrow text/markdown chunking helpers |
    | `plugin-sdk/session-store-runtime` | Session workflow helpers (`getSessionEntry`, `listSessionEntries`, `patchSessionEntry`, `upsertSessionEntry`), target discovery, legacy session store path/session-key helpers, updated-at reads, and deprecated whole-store mutation helpers |
    | `plugin-sdk/cron-store-runtime` | Cron store path/load/save helpers |
    | `plugin-sdk/state-paths` | State/OAuth dir path helpers |
    | `plugin-sdk/plugin-state-runtime` | Plugin sidecar SQLite keyed-state types |
    | `plugin-sdk/routing` | Route/session-key/account binding helpers such as `resolveAgentRoute`, `buildAgentSessionKey`, and `resolveDefaultAgentBoundAccountId` |
    | `plugin-sdk/status-helpers` | Shared channel/account status summary helpers, runtime-state defaults, and issue metadata helpers |
    | `plugin-sdk/target-resolver-runtime` | Shared target resolver helpers |
    | `plugin-sdk/string-normalization-runtime` | Slug/string normalization helpers |
    | `plugin-sdk/request-url` | 从 fetch/request-like 输入中提取字符串 URL |
    | `plugin-sdk/run-command` | 带标准化 stdout/stderr 结果的定时命令运行器 |
    | `plugin-sdk/param-readers` | 通用 tool/CLI 参数读取器 |
    | `plugin-sdk/tool-plugin` | 定义一个简单的 typed agent-tool plugin，并暴露用于 manifest 生成的静态元数据 |
    | `plugin-sdk/tool-payload` | 从 tool result 对象中提取标准化 payload |
    | `plugin-sdk/tool-send` | 从 tool 参数中提取规范的发送目标字段 |
    | `plugin-sdk/sandbox` | Sandbox 后端类型以及 SSH/OpenShell 命令 helper，包括 fail-fast exec 命令预检 |
    | `plugin-sdk/temp-path` | 共享临时下载路径 helper 和私有安全临时工作区 |
    | `plugin-sdk/logging-core` | 子系统 logger 和脱敏 helper |
    | `plugin-sdk/markdown-table-runtime` | Markdown 表格模式和转换 helper |
    | `plugin-sdk/model-session-runtime` | 模型/会话覆盖 helper，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` |
    | `plugin-sdk/talk-config-runtime` | Talk provider config 解析 helper |
    | `plugin-sdk/json-store` | 小型 JSON 状态读写 helper |
    | `plugin-sdk/json-unsafe-integers` | 保留不安全整数字面量为字符串的 JSON 解析 helper |
    | `plugin-sdk/file-lock` | 可重入文件锁 helper |
    | `plugin-sdk/persistent-dedupe` | 磁盘支持的 dedupe 缓存 helper |
    | `plugin-sdk/acp-runtime` | ACP runtime/session 和 reply-dispatch helper |
    | `plugin-sdk/acp-runtime-backend` | 面向启动时加载插件的轻量 ACP backend 注册和 reply-dispatch helper |
    | `plugin-sdk/acp-binding-resolve-runtime` | 不含生命周期启动导入的只读 ACP binding 解析 |
    | `plugin-sdk/agent-config-primitives` | 窄范围 agent runtime config-schema 基元 |
    | `plugin-sdk/boolean-param` | 宽松布尔参数读取器 |
    | `plugin-sdk/dangerous-name-runtime` | 危险名称匹配解析 helper |
    | `plugin-sdk/device-bootstrap` | 设备引导和配对 token helper |
    | `plugin-sdk/extension-shared` | 共享 passive-channel、status 和 ambient proxy helper 基元 |
    | `plugin-sdk/models-provider-runtime` | `/models` 命令/provider 回复 helper |
    | `plugin-sdk/skill-commands-runtime` | 技能命令列表 helper |
    | `plugin-sdk/native-command-registry` | native command registry/build/serialize helper |
    | `plugin-sdk/agent-harness` | 面向低层 agent harness 的实验性受信任插件表面：harness 类型、active-run steer/abort helper、OpenClaw tool bridge helper、runtime-plan tool policy helper、terminal outcome 分类、tool progress 格式化/细节 helper，以及 attempt result 工具 |
    | `plugin-sdk/provider-zai-endpoint` | 已弃用的 Z.AI provider-owned endpoint 检测门面；请使用 Z.AI 插件公共 API |
    | `plugin-sdk/async-lock-runtime` | 用于小型 runtime 状态文件的进程本地 async lock helper |
    | `plugin-sdk/channel-activity-runtime` | channel 活动遥测 helper |
    | `plugin-sdk/concurrency-runtime` | 有界异步任务并发 helper |
    | `plugin-sdk/dedupe-runtime` | 内存 dedupe 缓存 helper |
    | `plugin-sdk/delivery-queue-runtime` | outbound 待投递 drain helper |
    | `plugin-sdk/file-access-runtime` | 安全本地文件和 media-source 路径 helper |
    | `plugin-sdk/heartbeat-runtime` | 心跳唤醒、事件和可见性 helper |
    | `plugin-sdk/number-runtime` | 数值强制转换 helper |
    | `plugin-sdk/secure-random-runtime` | 安全 token/UUID helper |
    | `plugin-sdk/system-event-runtime` | 系统事件队列 helper |
    | `plugin-sdk/transport-ready-runtime` | transport 就绪等待 helper |
    | `plugin-sdk/exec-approvals-runtime` | 不含 broad infra-runtime barrel 的 exec approval policy 文件 helper |
    | `plugin-sdk/infra-runtime` | 已弃用的兼容性 shim；请使用上面的聚焦 runtime 子路径 |
    | `plugin-sdk/collection-runtime` | 小型有界缓存 helper |
    | `plugin-sdk/diagnostic-runtime` | diagnostic 标志、事件和 trace-context helper |
    | `plugin-sdk/error-runtime` | 错误图、格式化、共享错误分类 helper，`isApprovalNotFoundError` |
    | `plugin-sdk/fetch-runtime` | 包装后的 fetch、proxy、EnvHttpProxyAgent 选项和 pinned lookup helper |
    | `plugin-sdk/runtime-fetch` | 不包含 proxy/guarded-fetch 导入的 dispatcher-aware runtime fetch |
    | `plugin-sdk/inline-image-data-url-runtime` | 不含广义 media runtime 表面的 inline image data URL sanitizer 和 signature sniffing helper |
    | `plugin-sdk/response-limit-runtime` | 不含广义 media runtime 表面的有界 response-body 读取器 |
    | `plugin-sdk/session-binding-runtime` | 当前 conversation binding 状态，不含已配置绑定路由或配对存储 |
    | `plugin-sdk/session-store-runtime` | 不含 broad config writes/maintenance 导入的 session-store helper |
    | `plugin-sdk/context-visibility-runtime` | 不含 broad config/security 导入的 context visibility 解析和补充上下文过滤 |
    | `plugin-sdk/string-coerce-runtime` | 不含 markdown/logging 导入的窄范围 primitive record/string 强制转换和规范化 helper |
    | `plugin-sdk/host-runtime` | 主机名和 SCP host 规范化 helper |
    | `plugin-sdk/retry-runtime` | 重试 config 和重试运行器 helper |
    | `plugin-sdk/agent-runtime` | agent dir/identity/workspace helper，包括 `resolveAgentDir`、`resolveDefaultAgentDir`，以及已弃用的 `resolveOpenClawAgentDir` 兼容性导出 |
    | `plugin-sdk/directory-runtime` | 基于 config 的目录查询/去重 |
    | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
  </Accordion>

  <Accordion title="能力与测试子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/media-runtime` | 共享媒体抓取/转换/存储 helper，包括 `saveRemoteMedia`、`saveResponseMedia`、`readRemoteMediaBuffer` 和已弃用的 `fetchRemoteMedia`；当 URL 应转换为 OpenClaw 媒体时，应优先使用存储 helper，再进行 buffer 读取 |
    | `plugin-sdk/media-mime` | 窄范围 MIME 规范化、文件扩展名映射、MIME 检测和 media-kind helper |
    | `plugin-sdk/media-store` | 窄范围媒体存储 helper，例如 `saveMediaBuffer` 和 `saveMediaStream` |
    | `plugin-sdk/media-generation-runtime` | 共享媒体生成故障转移 helper、候选项选择和缺失模型消息提示 |
    | `plugin-sdk/media-understanding` | 媒体理解 provider 类型，以及面向 provider 的图像/音频/结构化提取 helper 导出 |
    | `plugin-sdk/text-chunking` | 文本和 Markdown 分块/渲染 helper、Markdown 表格转换、directive-tag 清理以及安全文本工具 |
    | `plugin-sdk/text-chunking` | 输出文本分块 helper |
    | `plugin-sdk/speech` | 语音 provider 类型，以及面向 provider 的 directive、registry、验证、OpenAI 兼容 TTS 构建器和语音 helper 导出 |
    | `plugin-sdk/speech-core` | 共享语音 provider 类型、registry、directive、规范化和语音 helper 导出 |
    | `plugin-sdk/realtime-transcription` | 实时转写 provider 类型、registry helper 和共享 WebSocket session helper |
    | `plugin-sdk/realtime-bootstrap-context` | 面向受限 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 上下文注入的实时 profile 引导 helper |
    | `plugin-sdk/realtime-voice` | 实时语音 provider 类型、registry helper 和共享实时语音行为 helper，包括输出活动跟踪 |
    | `plugin-sdk/image-generation` | 图像生成 provider 类型，以及图像资源/data URL helper 和 OpenAI 兼容图像 provider 构建器 |
    | `plugin-sdk/image-generation-core` | 共享图像生成类型、故障转移、认证和 registry helper |
    | `plugin-sdk/music-generation` | 音乐生成 provider/请求/结果类型 |
    | `plugin-sdk/music-generation-core` | 共享音乐生成类型、故障转移 helper、provider 查找和 model-ref 解析 |
    | `plugin-sdk/video-generation` | 视频生成 provider/请求/结果类型 |
    | `plugin-sdk/video-generation-core` | 共享视频生成类型、故障转移 helper、provider 查找和 model-ref 解析 |
    | `plugin-sdk/transcripts` | 共享 transcripts source provider 类型、registry helper、session 描述符和 utterance 元数据 |
    | `plugin-sdk/webhook-targets` | webhook target registry 和 route-install helper |
    | `plugin-sdk/webhook-path` | 已弃用的兼容性别名；请使用 `plugin-sdk/webhook-ingress` |
    | `plugin-sdk/web-media` | 共享远程/本地媒体加载 helper |
    | `plugin-sdk/zod` | 已弃用的兼容性重新导出；请直接从 `zod` 导入 `zod` |
    | `plugin-sdk/testing` | 仓库本地、面向旧版 OpenClaw 测试的已弃用兼容性 barrel。新的仓库测试应改为导入聚焦的本地测试子路径，例如 `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures` |
    | `plugin-sdk/plugin-test-api` | 仓库本地、用于直接插件注册单元测试的最小 `createTestPluginApi` helper，不导入仓库测试 helper 桥接层 |
    | `plugin-sdk/agent-runtime-test-contracts` | 仓库本地、面向 native agent-runtime adapter contract 的 auth、delivery、fallback、tool-hook、prompt-overlay、schema 和 transcript projection 测试夹具 |
    | `plugin-sdk/channel-test-helpers` | 仓库本地、面向 channel 的测试 helper，用于通用 actions/setup/status 契约、目录断言、账号启动生命周期、send-config 线程、runtime mocks、status issues、outbound delivery 和 hook registration |
    | `plugin-sdk/channel-target-testing` | 仓库本地、面向 channel 测试的共享 target-resolution 错误案例套件 |
    | `plugin-sdk/plugin-test-contracts` | 仓库本地、面向 plugin 包、注册、公开产物、直接导入、runtime API 和导入副作用的契约 helper |
    | `plugin-sdk/provider-test-contracts` | 仓库本地、面向 provider runtime、auth、discovery、onboard、catalog、wizard、media capability、replay policy、realtime STT live-audio、web-search/fetch 和 stream 的契约 helper |
    | `plugin-sdk/provider-http-test-mocks` | 仓库本地、面向使用 `plugin-sdk/provider-http` 的 provider 测试的可选 Vitest HTTP/auth mocks |
    | `plugin-sdk/test-fixtures` | 仓库本地、通用 CLI runtime capture、sandbox 上下文、skill writer、agent-message、system-event、module reload、bundled plugin path、terminal-text、chunking、auth-token 和 typed-case 夹具 |
    | `plugin-sdk/test-node-mocks` | 仓库本地、用于 Vitest `vi.mock("node:*")` 工厂内部的精简 Node builtin mock helper |
  </Accordion>

  <Accordion title="Memory 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/memory-core` | Bundled memory-core helper surface for manager/config/file/CLI helpers |
    | `plugin-sdk/memory-core-engine-runtime` | Memory index/search runtime facade |
    | `plugin-sdk/memory-core-host-embedding-registry` | Lightweight memory embedding provider registry helpers |
    | `plugin-sdk/memory-core-host-engine-foundation` | Memory host foundation engine exports |
    | `plugin-sdk/memory-core-host-engine-embeddings` | Memory host embedding contracts, registry access, local provider, and generic batch/remote helpers. `registerMemoryEmbeddingProvider` on this surface is deprecated; use the generic embedding provider API for new providers. |
    | `plugin-sdk/memory-core-host-engine-qmd` | Memory host QMD engine exports |
    | `plugin-sdk/memory-core-host-engine-storage` | Memory host storage engine exports |
    | `plugin-sdk/memory-core-host-multimodal` | Memory host multimodal helpers |
    | `plugin-sdk/memory-core-host-query` | Memory host query helpers |
    | `plugin-sdk/memory-core-host-secret` | Memory host secret helpers |
    | `plugin-sdk/memory-core-host-events` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-host-events` |
    | `plugin-sdk/memory-core-host-status` | Memory host status helpers |
    | `plugin-sdk/memory-core-host-runtime-cli` | Memory host CLI runtime helpers |
    | `plugin-sdk/memory-core-host-runtime-core` | Memory host core runtime helpers |
    | `plugin-sdk/memory-core-host-runtime-files` | Memory host file/runtime helpers |
    | `plugin-sdk/memory-host-core` | memory host core runtime helper 的供应商中立别名 |
    | `plugin-sdk/memory-host-events` | memory host event journal helper 的供应商中立别名 |
    | `plugin-sdk/memory-host-files` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-core-host-runtime-files` |
    | `plugin-sdk/memory-host-markdown` | 面向 memory 邻近插件的共享 managed-markdown helper |
    | `plugin-sdk/memory-host-search` | 用于 search-manager 访问的活动 memory runtime 门面 |
    | `plugin-sdk/memory-host-status` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-core-host-status` |
  </Accordion>

  <Accordion title="保留的 bundled-helper 子路径">
    保留的 bundled-helper SDK 子路径是面向 bundled plugin 代码的窄范围、所有者专属表面。它们会在 SDK 清单中跟踪，以便包构建和别名保持确定性，但它们不是通用插件编写 API。新的可复用 host 契约应使用通用 SDK 子路径，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和
    `plugin-sdk/plugin-config-runtime`。

    | 子路径 | 所有者与用途 |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | bundled Codex plugin helper，用于将用户 MCP server config 投影到 Codex app-server thread config |
    | `plugin-sdk/codex-native-task-runtime` | bundled Codex plugin helper，用于将 Codex app-server native subagents 镜像到 OpenClaw task state |

  </Accordion>
</AccordionGroup>

## 相关内容

- [插件 SDK 概览](/plugins/sdk-overview)
- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
