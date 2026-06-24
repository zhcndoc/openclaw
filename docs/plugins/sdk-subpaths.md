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

已弃用的子路径仍会为了旧插件而导出，但新代码应使用下面聚焦的 SDK 子路径。维护列表位于
`scripts/lib/plugin-sdk-deprecated-public-subpaths.json`；CI 会拒绝从其中引入 bundled 生产导入。诸如 `compat`、`config-types`、
`infra-runtime`、`text-runtime` 和 `zod` 之类的大而全导出仅用于兼容性。请直接从 `zod` 导入 `zod`。

OpenClaw 基于 Vitest 的测试 helper 子路径仅限仓库本地使用，且已不再是包导出：`agent-runtime-test-contracts`、
`channel-contract-testing`、`channel-target-testing`、`channel-test-helpers`、
`plugin-test-api`、`plugin-test-contracts`、`plugin-test-runtime`、
`provider-http-test-mocks`、`provider-test-contracts`、`test-env`、
`test-fixtures`、`test-node-mocks` 和 `testing`。

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
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` |
    | `plugin-sdk/lmstudio` | 支持的 LM Studio provider 门面，用于 setup、目录发现和运行时模型准备 |
    | `plugin-sdk/lmstudio-runtime` | 支持的 LM Studio 运行时门面，用于本地服务器默认值、模型发现、请求头和已加载模型 helper |
    | `plugin-sdk/provider-setup` | 经过整理的本地/自托管 provider setup helper |
    | `plugin-sdk/self-hosted-provider-setup` | 聚焦于 OpenAI 兼容的自托管 provider setup helper |
    | `plugin-sdk/cli-backend` | CLI 后端默认值 + watchdog 常量 |
    | `plugin-sdk/provider-auth-runtime` | 面向 provider 插件的运行时 API 密钥解析 helper |
    | `plugin-sdk/provider-oauth-runtime` | 通用 provider OAuth 回调类型、回调页渲染、PKCE/state helper、授权输入解析、令牌过期 helper 和中止 helper |
    | `plugin-sdk/provider-auth-api-key` | API 密钥 onboarding/profile 写入 helper，例如 `upsertApiKeyProfile` |
    | `plugin-sdk/provider-auth-result` | 标准 OAuth auth-result 构建器 |
    | `plugin-sdk/provider-env-vars` | provider auth 环境变量查找 helper |
    | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`、OpenAI Codex auth-import helper，以及已弃用的 `resolveOpenClawAgentDir` 兼容性导出 |
    | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享 replay-policy 构建器、provider-endpoint helper，以及共享 model-id 规范化 helper |
    | `plugin-sdk/provider-catalog-live-runtime` | 用于受保护的 `/models` 风格发现的实时 provider 模型目录 helper：`buildLiveModelProviderConfig`、`fetchLiveProviderModelRows`、`getCachedLiveProviderModelRows`、`fetchLiveProviderModelIds`、`LiveModelCatalogHttpError`、`clearLiveCatalogCacheForTests`、model-id 过滤、TTL 缓存和静态回退 |
    | `plugin-sdk/provider-catalog-runtime` | provider catalog 增强运行时钩子和 plugin-provider registry 接缝，用于契约测试 |
    | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` |
    | `plugin-sdk/provider-http` | 通用 provider HTTP/endpoint 能力 helper、provider HTTP 错误以及音频转写 multipart form helper |
    | `plugin-sdk/provider-web-fetch-contract` | 用于 `enablePluginInConfig` 和 `WebFetchProviderPlugin` 等的窄范围 web-fetch config/selection 契约 helper |
    | `plugin-sdk/provider-web-fetch` | Web-fetch provider 注册/缓存 helper |
    | `plugin-sdk/provider-web-search-config-contract` | 面向不需要 plugin-enable wiring 的 provider 的窄范围 web-search config/credential helper |
    | `plugin-sdk/provider-web-search-contract` | 用于 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 以及作用域 credential setter/getter 等的窄范围 web-search config/credential 契约 helper |
    | `plugin-sdk/provider-web-search` | Web-search provider 注册/缓存/运行时 helper |
    | `plugin-sdk/embedding-providers` | 通用 embedding provider 类型和读取 helper，包括 `EmbeddingProviderAdapter`、`getEmbeddingProvider(...)` 和 `listEmbeddingProviders(...)`；插件通过 `api.registerEmbeddingProvider(...)` 注册 provider，以便强制执行 manifest 所有权 |
    | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`，以及 DeepSeek/Gemini/OpenAI schema 清理 + 诊断 |
    | `plugin-sdk/provider-usage` | provider usage snapshot 类型、共享 usage 获取 helper，以及诸如 `fetchClaudeUsage` 的 provider fetcher |
    | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、stream wrapper 类型、纯文本 tool-call 兼容，以及共享 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot wrapper helper |
    | `plugin-sdk/provider-stream-shared` | 公共共享 provider stream wrapper helper，包括 `composeProviderStreamWrappers`、`createOpenAICompatibleCompletionsThinkingOffWrapper`、`createPlainTextToolCallCompatWrapper`、`createPayloadPatchStreamWrapper`、`createToolStreamWrapper`、`normalizeOpenAICompatibleReasoningPayload`、`setQwenChatTemplateThinking`，以及 Anthropic/DeepSeek/OpenAI 兼容的 stream utility |
    | `plugin-sdk/provider-transport-runtime` | 原生 provider transport helper，例如受保护的 fetch、transport 消息转换和可写 transport event stream |
    | `plugin-sdk/provider-onboard` | onboarding config patch helper |
    | `plugin-sdk/global-singleton` | 进程本地 singleton/map/cache helper |
    | `plugin-sdk/group-activation` | 窄范围 group activation 模式和命令解析 helper |
  </Accordion>

Provider usage snapshots 通常会报告一个或多个 quota `windows`，每个都带有标签、已使用百分比和可选的重置时间。对于显示余额或账户状态文本、而不是可重置 quota windows 的 provider，应返回带空 `windows` 数组的 `summary`，而不是伪造百分比。OpenClaw 会在状态输出中显示该 summary 文本；仅当 usage 端点失败或返回了不可用的 usage 数据时，才使用 `error`。

  <Accordion title="Auth and security subpaths">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/command-auth` | `resolveControlCommandGate`、命令注册表 helper（包括动态参数菜单格式化）、sender-authorisation helper |
    | `plugin-sdk/command-status` | 命令/帮助消息构建器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` |
    | `plugin-sdk/approval-auth-runtime` | approver 解析和 same-chat action-auth helper |
    | `plugin-sdk/approval-client-runtime` | 原生 exec approval profile/filter helper |
    | `plugin-sdk/approval-delivery-runtime` | 原生 approval capability/delivery 适配器 |
    | `plugin-sdk/approval-gateway-runtime` | 共享 approval gateway-resolution helper |
    | `plugin-sdk/approval-handler-adapter-runtime` | 用于热 channel 入口点的轻量级原生 approval adapter 加载 helper |
    | `plugin-sdk/approval-handler-runtime` | 更广泛的 approval handler 运行时 helper；在窄一些的 adapter/gateway 接缝已经足够时优先使用它们 |
    | `plugin-sdk/approval-native-runtime` | 原生 approval target、account-binding、route-gate、forwarding fallback 和本地原生 exec prompt suppression helper |
    | `plugin-sdk/approval-reaction-runtime` | 硬编码 approval reaction 绑定、reaction prompt payload、reaction target store，以及本地原生 exec prompt suppression 的兼容性导出 |
    | `plugin-sdk/approval-reply-runtime` | exec/plugin approval reply payload helper |
    | `plugin-sdk/approval-runtime` | exec/plugin approval payload helper、native approval routing/runtime helper，以及结构化 approval 显示 helper，例如 `formatApprovalDisplayPath` |
    | `plugin-sdk/reply-dedupe` | 窄范围入站 reply 去重重置 helper |
    | `plugin-sdk/channel-contract-testing` | 不含大而全 testing barrel 的窄范围 channel contract 测试 helper |
    | `plugin-sdk/command-auth-native` | 原生命令授权、动态参数菜单格式化和原生 session-target helper |
    | `plugin-sdk/command-detection` | 共享命令检测 helper |
    | `plugin-sdk/command-primitives-runtime` | 用于热 channel 路径的轻量级命令文本谓词 |
    | `plugin-sdk/command-surface` | 命令正文规范化和 command-surface helper |
    | `plugin-sdk/allow-from` | `formatAllowFromLowercase` |
    | `plugin-sdk/channel-secret-runtime` | 用于 channel/plugin secret 表面的窄范围 secret-contract 收集 helper |
    | `plugin-sdk/secret-ref-runtime` | 用于 secret-contract/config 解析的窄范围 `coerceSecretRef` 和 SecretRef 类型 helper |
    | `plugin-sdk/secret-provider-integration` | 仅类型的 SecretRef provider 集成 manifest 和 preset 契约，适用于发布外部 secret provider preset 的插件 |
    | `plugin-sdk/security-runtime` | 共享信任、DM gate、以根目录为边界的文件/路径 helper，包括仅创建写入、同步/异步原子文件替换、同级临时文件写入、跨设备移动回退、私有文件存储 helper、符号链接父目录守卫、外部内容、敏感文本脱敏、常数时间 secret 比较和 secret collection helper |
    | `plugin-sdk/ssrf-policy` | 主机 allowlist 和私有网络 SSRF policy helper |
    | `plugin-sdk/ssrf-dispatcher` | 不含大而全 infra runtime 表面的窄范围 pinned-dispatcher helper |
    | `plugin-sdk/ssrf-runtime` | pinned-dispatcher、SSRF 受保护的 fetch、SSRF 错误和 SSRF policy helper |
    | `plugin-sdk/secret-input` | secret input 解析 helper |
    | `plugin-sdk/webhook-ingress` | webhook request/target helper 和原始 websocket/body 强制转换 |
    | `plugin-sdk/webhook-request-guards` | 请求体大小/超时 helper |
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
    | `plugin-sdk/plugin-runtime` | 共享插件 command/hook/http/interactive helper |
    | `plugin-sdk/hook-runtime` | 共享 webhook/internal hook pipeline helper |
    | `plugin-sdk/lazy-runtime` | 惰性运行时导入/绑定 helper，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` |
    | `plugin-sdk/process-runtime` | 进程 exec helper |
    | `plugin-sdk/cli-runtime` | CLI 格式化、等待、版本、参数调用和惰性 command-group helper |
    | `plugin-sdk/qa-live-transport-scenarios` | 共享 live transport QA 场景 id、基线覆盖 helper 和场景选择 helper |
    | `plugin-sdk/gateway-method-runtime` | 为声明 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 的插件 HTTP 路由保留的 Gateway method 分发 helper |
    | `plugin-sdk/gateway-runtime` | Gateway client、event-loop-ready client 启动 helper、gateway CLI RPC、gateway 协议错误和 channel-status 补丁 helper |
    | `plugin-sdk/config-contracts` | 面向插件 config 形状（如 `OpenClawConfig` 和 channel/provider config 类型）的聚焦型仅类型 config 表面 |
    | `plugin-sdk/plugin-config-runtime` | 运行时 plugin-config 查找 helper，例如 `requireRuntimeConfig`、`resolvePluginConfigObject` 和 `resolveLivePluginConfigObject` |
    | `plugin-sdk/config-mutation` | 事务性 config mutation helper，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` |
    | `plugin-sdk/message-tool-delivery-hints` | 共享消息工具投递元数据提示字符串 |
    | `plugin-sdk/runtime-config-snapshot` | 当前进程 config snapshot helper，例如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和测试 snapshot setter |
    | `plugin-sdk/telegram-command-config` | Telegram 命令名/描述规范化以及重复/冲突检查，即使 bundled Telegram contract 表面不可用时也适用 |
    | `plugin-sdk/text-autolink-runtime` | 不含大而全 text barrel 的文件引用自动链接检测 |
    | `plugin-sdk/approval-reaction-runtime` | 硬编码 approval reaction 绑定、reaction prompt payload、reaction target store，以及本地原生 exec prompt suppression 的兼容性导出 |
    | `plugin-sdk/approval-runtime` | exec/plugin approval helper、approval-capability 构建器、auth/profile helper、native routing/runtime helper，以及结构化 approval 显示路径格式化 |
    | `plugin-sdk/reply-runtime` | 共享入站/reply 运行时 helper、分块、dispatch、heartbeat、reply planner |
    | `plugin-sdk/reply-dispatch-runtime` | 窄范围 reply dispatch/finalize 和 conversation-label helper |
    | `plugin-sdk/reply-history` | 共享短窗口 reply-history helper。新的消息轮次代码应使用 `createChannelHistoryWindow`；更底层的 map helper 仅保留为已弃用兼容性导出 |
    | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` |
    | `plugin-sdk/reply-chunking` | 窄范围文本/Markdown 分块 helper |
    | `plugin-sdk/session-store-runtime` | 会话工作流 helper（`getSessionEntry`、`listSessionEntries`、`patchSessionEntry`、`upsertSessionEntry`）、按会话身份限制的最近用户/assistant 转录文本读取、旧版 session store 路径/session-key helper、updated-at 读取，以及仅迁移用的整个存储/文件路径兼容性 helper |
    | `plugin-sdk/session-transcript-runtime` | 转录身份、作用域目标/读写 helper、更新发布、写锁和转录 memory 命中键 |
    | `plugin-sdk/sqlite-runtime` | 面向 first-party runtime 的聚焦型 SQLite agent-schema、路径和事务 helper |
    | `plugin-sdk/cron-store-runtime` | Cron store 路径/加载/保存 helper |
    | `plugin-sdk/state-paths` | 状态/OAuth 目录路径 helper |
    | `plugin-sdk/plugin-state-runtime` | 插件侧车 SQLite 键控状态类型，以及面向插件拥有数据库的集中连接 pragma 和 WAL 维护设置 |
    | `plugin-sdk/routing` | 路由/session-key/account 绑定 helper，例如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` |
    | `plugin-sdk/status-helpers` | 共享 channel/account status summary helper、运行时状态默认值和 issue 元数据 helper |
    | `plugin-sdk/target-resolver-runtime` | 共享 target resolver helper |
    | `plugin-sdk/string-normalization-runtime` | slug/string 规范化 helper |
    | `plugin-sdk/request-url` | 从 fetch/request-like 输入中提取字符串 URL |
    | `plugin-sdk/run-command` | 带标准化 stdout/stderr 结果的定时 command runner |
    | `plugin-sdk/param-readers` | 常见 tool/CLI 参数读取器 |
    | `plugin-sdk/tool-plugin` | 定义一个简单的 typed agent-tool plugin，并为 manifest 生成暴露静态元数据 |
    | `plugin-sdk/tool-payload` | 从 tool result 对象中提取规范化 payload |
    | `plugin-sdk/tool-send` | 从 tool args 中提取规范化发送目标字段 |
    | `plugin-sdk/sandbox` | Sandbox backend 类型以及 SSH/OpenShell 命令 helper，包括 fail-fast exec 命令预检 |
    | `plugin-sdk/temp-path` | 共享临时下载路径 helper 和私有安全临时工作区 |
    | `plugin-sdk/logging-core` | 子系统 logger 和脱敏 helper |
    | `plugin-sdk/markdown-table-runtime` | Markdown 表格模式和转换 helper |
    | `plugin-sdk/model-session-runtime` | 模型/session 覆盖 helper，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` |
    | `plugin-sdk/talk-config-runtime` | Talk provider config 解析 helper |
    | `plugin-sdk/json-store` | 小型 JSON 状态读写 helper |
    | `plugin-sdk/json-unsafe-integers` | 将不安全整数字面量保留为字符串的 JSON 解析 helper |
    | `plugin-sdk/file-lock` | 可重入文件锁 helper |
    | `plugin-sdk/persistent-dedupe` | 磁盘支持的去重缓存 helper |
    | `plugin-sdk/acp-runtime` | ACP 运行时/session 和 reply-dispatch helper |
    | `plugin-sdk/acp-runtime-backend` | 面向启动时加载插件的轻量级 ACP backend 注册和 reply-dispatch helper |
    | `plugin-sdk/acp-binding-resolve-runtime` | 不引入生命周期启动导入的只读 ACP binding 解析 |
    | `plugin-sdk/agent-config-primitives` | 窄范围 agent 运行时 config-schema 基元 |
    | `plugin-sdk/boolean-param` | 宽松布尔参数读取器 |
    | `plugin-sdk/dangerous-name-runtime` | 危险名称匹配解析 helper |
    | `plugin-sdk/device-bootstrap` | 设备引导和配对令牌 helper |
    | `plugin-sdk/extension-shared` | 共享 passive-channel、status 和 ambient proxy helper 基元 |
    | `plugin-sdk/models-provider-runtime` | `/models` 命令/provider 回复 helper |
    | `plugin-sdk/skill-commands-runtime` | 技能命令列表 helper |
    | `plugin-sdk/native-command-registry` | 原生命令注册表/构建/序列化 helper |
    | `plugin-sdk/agent-harness` | 面向低层 agent harness 的实验性受信任插件表面：harness 类型、active-run steer/abort helper、OpenClaw tool bridge helper、runtime-plan tool policy helper、终端结果分类、tool 进度格式化/详情 helper，以及 attempt result 实用工具 |
    | `plugin-sdk/provider-zai-endpoint` | 已弃用的 Z.AI provider 专属端点检测门面；请使用 Z.AI 插件公共 API |
    | `plugin-sdk/async-lock-runtime` | 用于小型运行时状态文件的进程本地异步锁 helper |
    | `plugin-sdk/channel-activity-runtime` | channel activity 遥测 helper |
    | `plugin-sdk/concurrency-runtime` | 受限的异步任务并发 helper |
    | `plugin-sdk/dedupe-runtime` | 内存去重缓存 helper |
    | `plugin-sdk/delivery-queue-runtime` | outbound 待投递 drain helper |
    | `plugin-sdk/file-access-runtime` | 安全本地文件和媒体源路径 helper |
    | `plugin-sdk/heartbeat-runtime` | heartbeat wake、event 和 visibility helper |
    | `plugin-sdk/number-runtime` | 数值强制转换 helper |
    | `plugin-sdk/secure-random-runtime` | 安全 token/UUID helper |
    | `plugin-sdk/system-event-runtime` | 系统事件队列 helper |
    | `plugin-sdk/transport-ready-runtime` | transport 就绪等待 helper |
    | `plugin-sdk/exec-approvals-runtime` | 不含大而全 infra-runtime barrel 的 exec approval policy 文件 helper |
    | `plugin-sdk/infra-runtime` | 已弃用的兼容性 shim；请使用上方聚焦的运行时子路径 |
    | `plugin-sdk/collection-runtime` | 小型受限缓存 helper |
    | `plugin-sdk/diagnostic-runtime` | 诊断标志、事件和 trace-context helper |
    | `plugin-sdk/error-runtime` | 错误图、格式化、共享错误分类 helper、`isApprovalNotFoundError` |
    | `plugin-sdk/fetch-runtime` | 包装后的 fetch、proxy、EnvHttpProxyAgent 选项和 pinned lookup helper |
    | `plugin-sdk/runtime-fetch` | 不含 proxy/guarded-fetch 导入的 dispatcher-aware runtime fetch |
    | `plugin-sdk/inline-image-data-url-runtime` | 不含大而全 media runtime 表面的内联图像 data URL 清理和签名嗅探 helper |
    | `plugin-sdk/response-limit-runtime` | 不含大而全 media runtime 表面的受限响应体读取器 |
    | `plugin-sdk/session-binding-runtime` | 当前会话绑定状态，不含已配置绑定路由或配对存储 |
    | `plugin-sdk/session-store-runtime` | 不含大而全 config 写入/维护导入的 session-store helper |
    | `plugin-sdk/sqlite-runtime` | 不含数据库生命周期控制的聚焦型 SQLite agent-schema、路径和事务 helper |
    | `plugin-sdk/context-visibility-runtime` | 不含大而全 config/security 导入的上下文可见性解析和补充上下文过滤 |
    | `plugin-sdk/string-coerce-runtime` | 不含 markdown/logging 导入的窄范围原始记录/string 强制转换和规范化 helper |
    | `plugin-sdk/host-runtime` | 主机名和 SCP 主机规范化 helper |
    | `plugin-sdk/retry-runtime` | 重试 config 和重试运行器 helper |
    | `plugin-sdk/agent-runtime` | agent 目录/身份/工作区 helper，包括 `resolveAgentDir`、`resolveDefaultAgentDir` 和已弃用的 `resolveOpenClawAgentDir` 兼容性导出 |
    | `plugin-sdk/directory-runtime` | 配置支持的目录查询/去重 |
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
    | `plugin-sdk/memory-core` | Bundled memory-core helper 表面，用于 manager/config/file/CLI helper |
    | `plugin-sdk/memory-core-engine-runtime` | Memory index/search 运行时门面 |
    | `plugin-sdk/memory-core-host-embedding-registry` | 轻量级 memory embedding provider registry helper |
    | `plugin-sdk/memory-core-host-engine-foundation` | Memory host foundation engine 导出 |
    | `plugin-sdk/memory-core-host-engine-embeddings` | Memory host embedding 契约、registry 访问、本地 provider 和通用 batch/remote helper。此表面上的 `registerMemoryEmbeddingProvider` 已弃用；新 provider 请使用通用 embedding provider API。 |
    | `plugin-sdk/memory-core-host-engine-qmd` | Memory host QMD engine 导出 |
    | `plugin-sdk/memory-core-host-engine-storage` | Memory host storage engine 导出 |
    | `plugin-sdk/memory-core-host-multimodal` | Memory host multimodal helper |
    | `plugin-sdk/memory-core-host-query` | Memory host query helper |
    | `plugin-sdk/memory-core-host-secret` | Memory host secret helper |
    | `plugin-sdk/memory-core-host-events` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-host-events` |
    | `plugin-sdk/memory-core-host-status` | Memory host status helper |
    | `plugin-sdk/memory-core-host-runtime-cli` | Memory host CLI runtime helper |
    | `plugin-sdk/memory-core-host-runtime-core` | Memory host core runtime helper |
    | `plugin-sdk/memory-core-host-runtime-files` | Memory host file/runtime helper |
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
