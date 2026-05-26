---
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

这些子路径仍作为较旧插件和 OpenClaw 测试套件的包导出保留，
但新代码不应再从中添加导入：`agent-runtime-test-contracts`、
`channel-contract-testing`、`channel-target-testing`、`channel-test-helpers`、
`plugin-test-api`、`plugin-test-contracts`、`provider-http-test-mocks`、
`provider-test-contracts`、`test-env`、`test-fixtures`、`test-node-mocks`、
`testing`、`channel-runtime`、`compat`、`config-types`、`infra-runtime`、
`text-runtime` 和 `zod`。在新的插件代码中应直接从 `zod` 导入 `zod`。
`plugin-test-runtime` 仍是一个活跃且聚焦的测试 helper 子路径。

### 保留的 bundled plugin helper 子路径

这些子路径是面向其所属 bundled plugin 的插件自有兼容性表面，不是通用 SDK API：`plugin-sdk/codex-mcp-projection` 和
`plugin-sdk/codex-native-task-runtime`。跨所有者的扩展导入会被包契约防护机制阻止。

### 已弃用且未使用的公共子路径

这些公共子路径至少存在了一个月，但当前没有
bundled 扩展的生产导入。它们仍可导入以保持兼容性，
但新的插件代码应改用聚焦且仍被积极使用的 SDK 子路径：
`agent-config-primitives`、`channel-config-schema-legacy`、
`channel-reply-pipeline`、`channel-runtime`、`channel-secret-runtime`、
`command-auth`、`compat`、`config-runtime`、`config-schema`、`discord`、
`group-access`、`infra-runtime`、`matrix`、`mattermost`、
`media-generation-runtime-shared`、`memory-core-engine-runtime`、
`memory-core-host-multimodal`、`memory-core-host-query`、
`music-generation-core`、`self-hosted-provider-setup`、`telegram-account`、
`telegram-command-config` 和 `zalouser`。

### 已弃用且较少使用的公共子路径

当前仅被一两个 bundled plugin 所有者使用的公共子路径，
对新的插件代码也同样已弃用。它们仍作为包导出以保证兼容性，
但新代码应优先选择仍被积极共享的 SDK 接口面或插件自有的包 API。维护者在
`scripts/lib/plugin-sdk-deprecated-public-subpaths.json` 中跟踪确切集合，并通过 `pnpm plugin-sdk:surface` 跟踪当前预算。

### 已弃用的宽泛 barrel 导出

这些宽泛的重新导出 barrel 对 OpenClaw 源码和
兼容性检查仍可构建，但新代码应优先使用更聚焦的 SDK 子路径：
`agent-runtime`、`channel-lifecycle`、`channel-runtime`、`cli-runtime`、
`compat`、`config-types`、`conversation-runtime`、`hook-runtime`、
`infra-runtime`、`media-runtime`、`plugin-runtime`、`security-runtime` 和
`text-runtime`。`channel-runtime`、`compat`、`config-types`、`infra-runtime`，
以及 `text-runtime` 仍仅作为向后兼容的包导出；请改用
聚焦的 channel/runtime 子路径、`config-contracts`、`string-coerce-runtime`、
`text-chunking`、`text-utility-runtime` 和 `logging-core`。

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
    | `plugin-sdk/channel-reply-pipeline` | 旧版 reply pipeline helper。新的 channel reply pipeline 代码应使用 `plugin-sdk/channel-message` 中的 `createChannelMessageReplyPipeline` 和 `resolveChannelMessageSourceReplyDeliveryMode`。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共享 channel config schema 基元，以及 Zod 和直接 JSON/TypeBox 构建器 |
    | `plugin-sdk/bundled-channel-config-schema` | 仅供已维护的 bundled plugins 使用的 bundled OpenClaw channel config schemas |
    | `plugin-sdk/channel-config-schema-legacy` | bundled-channel config schemas 的已弃用兼容性别名 |
    | `plugin-sdk/telegram-command-config` | 带 bundled-contract 回退的 Telegram 自定义命令规范化/验证 helper |
    | `plugin-sdk/command-gating` | 窄范围命令授权门控 helper |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | 已弃用的低层 channel ingress 兼容性门面。新的接收路径应使用 `plugin-sdk/channel-ingress-runtime`。 |
    | `plugin-sdk/channel-ingress-runtime` | 面向迁移后 channel 接收路径的实验性高层 channel ingress 运行时解析器和 route fact 构建器。相较于在每个插件中单独组装有效 allowlist、命令 allowlist 和旧版投影，优先使用此子路径。参见 [Channel ingress API](/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`、`createChannelRunQueue`，以及旧版 draft stream 生命周期 helper。新的预览定稿代码应使用 `plugin-sdk/channel-message`。 |
    | `plugin-sdk/channel-message` | 低成本消息生命周期契约 helper，例如 `defineChannelMessageAdapter`、`createChannelMessageAdapterFromOutbound`、`createChannelMessageReplyPipeline`、`createReplyPrefixContext`、`resolveChannelMessageSourceReplyDeliveryMode`、durable-final 能力推导、发送/receipt/side-effect 能力的能力证明 helper、`MessageReceiveContext`、receive ack policy 证明、`defineFinalizableLivePreviewAdapter`、`deliverWithFinalizableLivePreviewAdapter`、live-preview 和 live-finalizer 能力证明、durable 恢复状态、`RenderedMessageBatch`、消息 receipt 类型以及 receipt id helper。参见 [Channel message API](/plugins/sdk/channel-message)。旧版 reply-dispatch 门面仅作为兼容性保留。 |
    | `plugin-sdk/channel-message-runtime` | 可能加载 outbound delivery 的运行时交付 helper，包括 `deliverInboundReplyWithMessageSendContext`、`sendDurableMessageBatch` 和 `withDurableMessageSendContext`。已弃用的 reply-dispatch 桥接仍可导入，但仅供兼容性 dispatcher 使用。请在监控/send 运行时模块中使用，不要放在热路径的插件 bootstrap 文件中。 |
    | `plugin-sdk/inbound-envelope` | 共享 inbound route + envelope 构建 helper |
    | `plugin-sdk/inbound-reply-dispatch` | 旧版共享 inbound record-and-dispatch helper、visible/final dispatch 谓词，以及面向已准备 channel dispatcher 的已弃用 `deliverDurableInboundReplyPayload` 兼容实现。新的 channel receive/dispatch 代码应从 `plugin-sdk/channel-message-runtime` 导入运行时生命周期 helper。 |
    | `plugin-sdk/messaging-targets` | 已弃用的 target 解析别名；请使用 `plugin-sdk/channel-targets` |
    | `plugin-sdk/outbound-media` | 共享 outbound media 加载 helper |
    | `plugin-sdk/outbound-send-deps` | 面向 channel adapter 的轻量 outbound send 依赖查找 |
    | `plugin-sdk/outbound-runtime` | outbound identity、send delegate、session、格式化和 payload 规划 helper。`deliverOutboundPayloads` 等直接交付 helper 是已弃用的兼容性底层；新 send 路径请使用 `plugin-sdk/channel-message-runtime`。 |
    | `plugin-sdk/poll-runtime` | 窄范围 poll 规范化 helper |
    | `plugin-sdk/thread-bindings-runtime` | thread-binding 生命周期和 adapter helper |
    | `plugin-sdk/agent-media-payload` | 旧版 agent media payload 构建器 |
    | `plugin-sdk/conversation-runtime` | conversation/thread binding、pairing 和 configured-binding helper |
    | `plugin-sdk/runtime-config-snapshot` | 运行时 config 快照 helper |
    | `plugin-sdk/runtime-group-policy` | 运行时组策略解析 helper |
    | `plugin-sdk/channel-status` | 共享 channel 状态快照/摘要 helper |
    | `plugin-sdk/channel-config-primitives` | 窄范围 channel config-schema 基元 |
    | `plugin-sdk/channel-config-writes` | channel config 写入授权 helper |
    | `plugin-sdk/channel-plugin-common` | 共享 channel plugin 前导导出 |
    | `plugin-sdk/allowlist-config-edit` | allowlist config 编辑/读取 helper |
    | `plugin-sdk/group-access` | 共享 group-access 决策 helper |
    | `plugin-sdk/direct-dm` | 共享 direct-DM 认证/守卫 helper |
    | `plugin-sdk/discord` | 面向已发布 `@openclaw/discord@2026.3.13` 和已跟踪所有者兼容性的已弃用 Discord 兼容性门面；新插件应使用通用 channel SDK 子路径 |
    | `plugin-sdk/telegram-account` | 面向已跟踪所有者兼容性的已弃用 Telegram 账号解析兼容性门面；新插件应使用注入的运行时 helper 或通用 channel SDK 子路径 |
    | `plugin-sdk/zalouser` | 面向仍导入发送方命令授权的已发布 Lark/Zalo 包的已弃用 Zalo Personal 兼容性门面；新插件应使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 语义化消息展示、交付以及旧版交互式回复 helper。参见 [Message Presentation](/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 面向事件分类、上下文构建、debounce、mention 匹配、mention-policy 和 envelope 格式化的共享 inbound helper |
    | `plugin-sdk/channel-inbound-debounce` | 窄范围 inbound debounce helper |
    | `plugin-sdk/channel-mention-gating` | 不含更宽泛 inbound runtime 表面的窄范围 mention-policy、mention 标记和 mention 文本 helper |
    | `plugin-sdk/channel-envelope` | 窄范围 inbound envelope 格式化 helper |
    | `plugin-sdk/channel-location` | channel location 上下文和格式化 helper |
    | `plugin-sdk/channel-logging` | 面向 inbound 丢弃和 typing/ack 失败的 channel logging helper |
    | `plugin-sdk/channel-send-result` | reply 结果类型 |
    | `plugin-sdk/channel-actions` | channel message-action helper，以及为插件兼容性保留的已弃用 native schema helper |
    | `plugin-sdk/channel-route` | 共享 route 规范化、解析器驱动的 target 解析、thread-id 字符串化、去重/压缩 route key、parsed-target 类型，以及 route/target 比较 helper |
    | `plugin-sdk/channel-targets` | target 解析 helper；route 比较调用方应使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | channel 契约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/反应 wiring |
    | `plugin-sdk/channel-secret-runtime` | 窄范围 secret-contract helper，例如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment` 和 secret target 类型 |
  </Accordion>

  <Accordion title="Provider 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` |
    | `plugin-sdk/lmstudio` | 面向 setup、目录发现和运行时模型准备的受支持 LM Studio provider 门面 |
    | `plugin-sdk/lmstudio-runtime` | 面向本地服务器默认值、模型发现、请求头和已加载模型 helper 的受支持 LM Studio 运行时门面 |
    | `plugin-sdk/provider-setup` | 经过筛选的本地/自托管 provider setup helper |
    | `plugin-sdk/self-hosted-provider-setup` | 聚焦的 OpenAI 兼容自托管 provider setup helper |
    | `plugin-sdk/cli-backend` | CLI 后端默认值 + watchdog 常量 |
    | `plugin-sdk/provider-auth-runtime` | 面向 provider 插件的运行时 API key 解析 helper |
    | `plugin-sdk/provider-auth-api-key` | API key onboarding/profile-write helper，例如 `upsertApiKeyProfile` |
    | `plugin-sdk/provider-auth-result` | 标准 OAuth auth-result 构建器 |
    | `plugin-sdk/provider-env-vars` | provider 认证环境变量查找 helper |
    | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`，以及已弃用的 `resolveOpenClawAgentDir` 兼容导出 |
    | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享 replay 策略构建器、provider endpoint helper，以及共享 model-id 规范化 helper |
    | `plugin-sdk/provider-catalog-runtime` | provider 目录增强运行时 hook 以及用于契约测试的 plugin-provider registry 接缝 |
    | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` |
    | `plugin-sdk/provider-http` | 通用 provider HTTP/endpoint 能力 helper、provider HTTP 错误，以及音频转写 multipart form helper |
    | `plugin-sdk/provider-web-fetch-contract` | 窄范围 web-fetch config/选择契约 helper，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` |
    | `plugin-sdk/provider-web-fetch` | web-fetch provider 注册/缓存 helper |
    | `plugin-sdk/provider-web-search-config-contract` | 面向不需要 plugin-enable wiring 的 provider 的窄范围 web-search config/凭据 helper |
    | `plugin-sdk/provider-web-search-contract` | 窄范围 web-search config/凭据契约 helper，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig`，以及作用域化的凭据 setter/getter |
    | `plugin-sdk/provider-web-search` | web-search provider 注册/缓存/运行时 helper |
    | `plugin-sdk/embedding-providers` | 通用 embedding provider 类型和读取 helper，包括 `EmbeddingProviderAdapter`、`getEmbeddingProvider(...)` 和 `listEmbeddingProviders(...)`；插件通过 `api.registerEmbeddingProvider(...)` 注册 provider，以便强制执行 manifest 所有权 |
    | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`，以及 DeepSeek/Gemini/OpenAI schema 清理 + 诊断 |
    | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 等 |
    | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、stream wrapper 类型、纯文本 tool-call 兼容，以及共享 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot wrapper helper |
    | `plugin-sdk/provider-stream-shared` | 公共共享 provider stream wrapper helper，包括 `composeProviderStreamWrappers`、`createPlainTextToolCallCompatWrapper`、`createPayloadPatchStreamWrapper`、`createToolStreamWrapper`，以及 Anthropic/DeepSeek/OpenAI 兼容的 stream 工具 |
    | `plugin-sdk/provider-transport-runtime` | 原生 provider transport helper，例如受保护的 fetch、transport 消息转换和可写 transport 事件流 |
    | `plugin-sdk/provider-onboard` | onboarding 配置补丁 helper |
    | `plugin-sdk/global-singleton` | 进程本地 singleton/map/cache helper |
    | `plugin-sdk/group-activation` | 窄范围组激活模式和命令解析 helper |
  </Accordion>

  <Accordion title="认证与安全子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/command-auth` | `resolveControlCommandGate`，命令注册表 helper（包括动态参数菜单格式化），发送方授权 helper |
    | `plugin-sdk/command-status` | 命令/帮助消息构建器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` |
    | `plugin-sdk/approval-auth-runtime` | 审批者解析以及同聊天动作授权 helper |
    | `plugin-sdk/approval-client-runtime` | 原生 exec 审批档案/过滤 helper |
    | `plugin-sdk/approval-delivery-runtime` | 原生审批能力/交付适配器 |
    | `plugin-sdk/approval-gateway-runtime` | 共享审批网关解析 helper |
    | `plugin-sdk/approval-handler-adapter-runtime` | 用于热 channel 入口点的轻量原生审批适配器加载 helper |
    | `plugin-sdk/approval-handler-runtime` | 更广泛的审批处理器运行时 helper；当更窄的适配器/网关分界足够时，优先使用它们 |
    | `plugin-sdk/approval-native-runtime` | 原生审批目标 + 账号绑定 helper |
    | `plugin-sdk/approval-reply-runtime` | exec/plugin 审批回复 payload helper |
    | `plugin-sdk/approval-runtime` | exec/plugin 审批 payload helper、原生审批路由/运行时 helper，以及结构化审批展示 helper，例如 `formatApprovalDisplayPath` |
    | `plugin-sdk/reply-dedupe` | 窄范围入站回复去重重置 helper |
    | `plugin-sdk/channel-contract-testing` | 无广泛 testing 桶的窄范围 channel 契约测试 helper |
    | `plugin-sdk/command-auth-native` | 原生命令认证、动态参数菜单格式化以及原生会话目标 helper |
    | `plugin-sdk/command-detection` | 共享命令检测 helper |
    | `plugin-sdk/command-primitives-runtime` | 用于热 channel 路径的轻量命令文本谓词 |
    | `plugin-sdk/command-surface` | 命令正文规范化和命令表面 helper |
    | `plugin-sdk/allow-from` | `formatAllowFromLowercase` |
    | `plugin-sdk/channel-secret-runtime` | 面向 channel/plugin secret 表面的窄范围 secret-contract 收集 helper |
    | `plugin-sdk/secret-ref-runtime` | 面向 secret-contract/config 解析的窄范围 `coerceSecretRef` 和 SecretRef 类型 helper |
    | `plugin-sdk/security-runtime` | 共享信任、DM 门控、以根目录为边界的文件/路径 helper，包括仅创建写入、同步/异步原子文件替换、同级临时写入、跨设备移动回退、私有文件存储 helper、符号链接父级防护、外部内容、敏感文本脱敏、常量时间 secret 比较，以及 secret 收集 helper |
    | `plugin-sdk/ssrf-policy` | 主机 allowlist 和私有网络 SSRF policy helper |
    | `plugin-sdk/ssrf-dispatcher` | 不带广泛 infra runtime 表面的窄范围 pinned-dispatcher helper |
    | `plugin-sdk/ssrf-runtime` | pinned-dispatcher、受 SSRF 保护的 fetch、SSRF 错误和 SSRF policy helper |
    | `plugin-sdk/secret-input` | secret 输入解析 helper |
    | `plugin-sdk/webhook-ingress` | webhook 请求/target helper 以及原始 websocket/body 强制转换 |
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
    | `plugin-sdk/lazy-runtime` | 延迟运行时导入/绑定 helper，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` |
    | `plugin-sdk/process-runtime` | 进程执行 helper |
    | `plugin-sdk/cli-runtime` | CLI 格式化、等待、版本、参数调用和延迟命令组 helper |
    | `plugin-sdk/gateway-method-runtime` | 为声明了 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 的插件 HTTP 路由保留的 Gateway 方法派发 helper |
    | `plugin-sdk/gateway-runtime` | Gateway 客户端、事件循环就绪的客户端启动 helper、gateway CLI RPC、gateway 协议错误，以及 channel-status 补丁 helper |
    | `plugin-sdk/config-contracts` | 面向插件 config 形状（如 `OpenClawConfig` 以及 channel/provider config 类型）的聚焦型仅类型 config 表面 |
    | `plugin-sdk/plugin-config-runtime` | 运行时 plugin-config 查找 helper，例如 `requireRuntimeConfig`、`resolvePluginConfigObject` 和 `resolveLivePluginConfigObject` |
    | `plugin-sdk/config-mutation` | 事务型 config 变更 helper，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` |
    | `plugin-sdk/runtime-config-snapshot` | 当前进程 config 快照 helper，例如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和测试快照设置器 |
    | `plugin-sdk/telegram-command-config` | Telegram 命令名/描述规范化和重复/冲突检查，即使 bundled Telegram contract 表面不可用也能使用 |
    | `plugin-sdk/text-autolink-runtime` | 不使用宽泛 text barrel 的文件引用自动链接检测 |
    | `plugin-sdk/approval-runtime` | exec/plugin 审批 helper、审批能力构建器、auth/profile helper、原生路由/运行时 helper，以及结构化审批展示路径格式化 |
    | `plugin-sdk/reply-runtime` | 共享入站/reply 运行时 helper、分块、派发、心跳、reply 规划器 |
    | `plugin-sdk/reply-dispatch-runtime` | 窄范围 reply 派发/定稿和会话标签 helper |
    | `plugin-sdk/reply-history` | 共享短窗口 reply-history helper。新的消息回合代码应使用 `createChannelHistoryWindow`；底层 map helper 仅作为已弃用兼容性导出保留 |
    | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` |
    | `plugin-sdk/reply-chunking` | 窄范围文本/Markdown 分块 helper |
    | `plugin-sdk/session-store-runtime` | Session workflow helper（`getSessionEntry`、`listSessionEntries`、`patchSessionEntry`、`upsertSessionEntry`）、旧版 session store path/session-key helper、updated-at 读取，以及已弃用的整库变更 helper |
    | `plugin-sdk/cron-store-runtime` | cron store 路径/加载/保存 helper |
    | `plugin-sdk/state-paths` | state/OAuth 目录路径 helper |
    | `plugin-sdk/routing` | route/session-key/account 绑定 helper，例如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` |
    | `plugin-sdk/status-helpers` | 共享 channel/account 状态摘要 helper、runtime-state 默认值和 issue 元数据 helper |
    | `plugin-sdk/target-resolver-runtime` | 共享 target resolver helper |
    | `plugin-sdk/string-normalization-runtime` | slug/字符串规范化 helper |
    | `plugin-sdk/request-url` | 从 fetch/request 类输入中提取字符串 URL |
    | `plugin-sdk/run-command` | 带计时的命令运行器，输出标准化 stdout/stderr 结果 |
    | `plugin-sdk/param-readers` | 常见工具/CLI 参数读取器 |
    | `plugin-sdk/tool-plugin` | 定义一个简单的类型化 agent-tool 插件，并为 manifest 生成暴露静态元数据 |
    | `plugin-sdk/tool-payload` | 从工具结果对象中提取规范化 payload |
    | `plugin-sdk/tool-send` | 从工具参数中提取规范化发送目标字段 |
    | `plugin-sdk/sandbox` | 沙箱后端类型以及 SSH/OpenShell 命令 helper，包括 fail-fast exec 命令预检 |
    | `plugin-sdk/temp-path` | 共享临时下载路径 helper 和私有安全临时工作区 |
    | `plugin-sdk/logging-core` | 子系统 logger 和脱敏 helper |
    | `plugin-sdk/markdown-table-runtime` | Markdown 表格模式和转换 helper |
    | `plugin-sdk/model-session-runtime` | 模型/session 覆盖 helper，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` |
    | `plugin-sdk/talk-config-runtime` | talk provider config 解析 helper |
    | `plugin-sdk/json-store` | 轻量 JSON 状态读写 helper |
    | `plugin-sdk/file-lock` | 可重入文件锁 helper |
    | `plugin-sdk/persistent-dedupe` | 磁盘支持的去重缓存 helper |
    | `plugin-sdk/acp-runtime` | ACP 运行时/session 和 reply-dispatch helper |
    | `plugin-sdk/acp-runtime-backend` | 面向启动时加载插件的轻量 ACP backend 注册和 reply-dispatch helper |
    | `plugin-sdk/acp-binding-resolve-runtime` | 不引入生命周期启动 import 的只读 ACP binding 解析 |
    | `plugin-sdk/agent-config-primitives` | 窄范围 agent 运行时 config-schema 基元 |
    | `plugin-sdk/boolean-param` | 宽松布尔参数读取器 |
    | `plugin-sdk/dangerous-name-runtime` | 危险名称匹配解析 helper |
    | `plugin-sdk/device-bootstrap` | 设备引导和配对令牌 helper |
    | `plugin-sdk/extension-shared` | 共享 passive-channel、状态和 ambient proxy helper 基元 |
    | `plugin-sdk/models-provider-runtime` | `/models` 命令/provider 回复 helper |
    | `plugin-sdk/skill-commands-runtime` | skill 命令列表 helper |
    | `plugin-sdk/native-command-registry` | 原生命令 registry/build/serialize helper |
    | `plugin-sdk/agent-harness` | 面向底层 agent harness 的实验性受信任插件表面：harness 类型、active-run steer/abort helper、OpenClaw 工具桥接 helper、runtime-plan 工具策略 helper、终端结果分类、工具进度格式化/详情 helper，以及 attempt 结果工具 |
    | `plugin-sdk/provider-zai-endpoint` | 已弃用的 Z.AI provider 所有端点检测门面；请使用 Z.AI 插件公共 API |
    | `plugin-sdk/async-lock-runtime` | 用于小型运行时状态文件的进程本地 async lock helper |
    | `plugin-sdk/channel-activity-runtime` | channel 活动遥测 helper |
    | `plugin-sdk/concurrency-runtime` | 有界异步任务并发 helper |
    | `plugin-sdk/dedupe-runtime` | 内存去重缓存 helper |
    | `plugin-sdk/delivery-queue-runtime` | outbound 待投递清空 helper |
    | `plugin-sdk/file-access-runtime` | 安全本地文件和 media-source 路径 helper |
    | `plugin-sdk/heartbeat-runtime` | heartbeat 唤醒、事件和可见性 helper |
    | `plugin-sdk/number-runtime` | 数值强制转换 helper |
    | `plugin-sdk/secure-random-runtime` | 安全 token/UUID helper |
    | `plugin-sdk/system-event-runtime` | 系统事件队列 helper |
    | `plugin-sdk/transport-ready-runtime` | transport 就绪等待 helper |
    | `plugin-sdk/infra-runtime` | 已弃用的兼容性 shim；请使用上方更聚焦的运行时子路径 |
    | `plugin-sdk/collection-runtime` | 轻量有界缓存 helper |
    | `plugin-sdk/diagnostic-runtime` | 诊断标志、事件和 trace-context helper |
    | `plugin-sdk/error-runtime` | 错误图、格式化、共享错误分类 helper，`isApprovalNotFoundError` |
    | `plugin-sdk/fetch-runtime` | 包装后的 fetch、proxy、EnvHttpProxyAgent 选项和 pinned lookup helper |
    | `plugin-sdk/runtime-fetch` | 无 proxy/guarded-fetch import 的 dispatcher-aware runtime fetch |
    | `plugin-sdk/response-limit-runtime` | 有界 response-body 读取器，不包含宽泛 media runtime 表面 |
    | `plugin-sdk/session-binding-runtime` | 当前 conversation 绑定状态，不包含 configured binding 路由或 pairing store |
    | `plugin-sdk/session-store-runtime` | 不包含宽泛 config 写入/维护 import 的 session-store helper |
    | `plugin-sdk/context-visibility-runtime` | context 可见性解析和补充 context 过滤，不包含宽泛 config/security import |
    | `plugin-sdk/string-coerce-runtime` | 窄范围 primitive record/string 强制转换和规范化 helper，不包含 markdown/logging import |
    | `plugin-sdk/host-runtime` | 主机名和 SCP 主机规范化 helper |
    | `plugin-sdk/retry-runtime` | 重试配置和重试运行器 helper |
    | `plugin-sdk/agent-runtime` | agent 目录/身份/workspace helper，包括 `resolveAgentDir`、`resolveDefaultAgentDir`，以及已弃用的 `resolveOpenClawAgentDir` 兼容导出 |
    | `plugin-sdk/directory-runtime` | 基于 config 的目录查询/去重 |
    | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
  </Accordion>

  <Accordion title="能力与测试子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/media-runtime` | 共享 media 获取/转换/存储 helper，包括 `saveRemoteMedia`、`saveResponseMedia`、`readRemoteMediaBuffer`，以及已弃用的 `fetchRemoteMedia`；当 URL 应转换为 OpenClaw media 时，优先在读取 buffer 之前使用存储 helper |
    | `plugin-sdk/media-mime` | 窄范围 MIME 规范化、文件扩展名映射、MIME 检测和 media-kind helper |
    | `plugin-sdk/media-store` | 窄范围 media store helper，例如 `saveMediaBuffer` 和 `saveMediaStream` |
    | `plugin-sdk/media-generation-runtime` | 共享媒体生成 failover helper、候选项选择和缺失模型提示 |
    | `plugin-sdk/meeting-notes` | 会议纪要源 provider 类型、registry 查找和 provider id 规范化 helper |
    | `plugin-sdk/media-understanding` | media understanding provider 类型，以及面向 provider 的图像/音频/结构化提取 helper 导出 |
    | `plugin-sdk/meeting-notes` | 会议纪要源 provider 类型、registry helper 和 provider id 规范化 |
    | `plugin-sdk/text-chunking` | 文本和 Markdown 分块/渲染 helper、Markdown 表格转换、directive-tag 去除，以及安全文本工具 |
    | `plugin-sdk/text-chunking` | outbound 文本分块 helper |
    | `plugin-sdk/speech` | speech provider 类型，以及面向 provider 的 directive、registry、验证、OpenAI 兼容 TTS 构建器和 speech helper 导出 |
    | `plugin-sdk/speech-core` | 共享 speech provider 类型、registry、directive、规范化和 speech helper 导出 |
    | `plugin-sdk/realtime-transcription` | 实时转写 provider 类型、registry helper 和共享 WebSocket session helper |
    | `plugin-sdk/realtime-bootstrap-context` | 面向受限 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 上下文注入的实时 profile 引导 helper |
    | `plugin-sdk/realtime-voice` | 实时 voice provider 类型、registry helper 和共享实时 voice 行为 helper，包括输出活动跟踪 |
    | `plugin-sdk/image-generation` | 图像生成 provider 类型，以及图像资产/data URL helper 和 OpenAI 兼容图像 provider 构建器 |
    | `plugin-sdk/image-generation-core` | 共享图像生成类型、failover、认证和 registry helper |
    | `plugin-sdk/music-generation` | 音乐生成 provider/request/result 类型 |
    | `plugin-sdk/music-generation-core` | 共享音乐生成类型、failover helper、provider 查找和 model-ref 解析 |
    | `plugin-sdk/video-generation` | 视频生成 provider/request/result 类型 |
    | `plugin-sdk/video-generation-core` | 共享视频生成类型、failover helper、provider 查找和 model-ref 解析 |
    | `plugin-sdk/meeting-notes` | 共享会议纪要源 provider 类型、registry helper、session 描述符和话语元数据 |
    | `plugin-sdk/webhook-targets` | webhook target registry 和 route-install helper |
    | `plugin-sdk/webhook-path` | 已弃用的兼容性别名；请使用 `plugin-sdk/webhook-ingress` |
    | `plugin-sdk/web-media` | 共享远程/本地 media 加载 helper |
    | `plugin-sdk/zod` | 已弃用的兼容性再导出；请直接从 `zod` 导入 `zod` |
    | `plugin-sdk/testing` | 仓库本地、已弃用的兼容性 barrel，供旧版 OpenClaw 测试使用。新的仓库测试应改为导入聚焦的本地测试子路径，例如 `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures` |
    | `plugin-sdk/plugin-test-api` | 仓库本地的最小 `createTestPluginApi` helper，用于直接插件注册单元测试，无需导入仓库测试 helper 桥接层 |
    | `plugin-sdk/agent-runtime-test-contracts` | 仓库本地的原生 agent-runtime adapter 契约 fixture，供 auth、delivery、fallback、tool-hook、prompt-overlay、schema 和 transcript projection 测试使用 |
    | `plugin-sdk/channel-test-helpers` | 仓库本地面向 channel 的测试 helper，适用于通用 actions/setup/status 契约、目录断言、账号启动生命周期、send-config 线程、runtime mock、状态问题、outbound delivery 和 hook 注册 |
    | `plugin-sdk/channel-target-testing` | 仓库本地、供 channel 测试使用的共享 target 解析错误案例套件 |
    | `plugin-sdk/plugin-test-contracts` | 仓库本地的插件包、注册、公共产物、直接导入、运行时 API 和导入副作用契约 helper |
    | `plugin-sdk/provider-test-contracts` | 仓库本地的 provider 运行时、认证、发现、onboard、目录、wizard、媒体能力、replay 策略、实时 STT live-audio、web-search/fetch 和 stream 契约 helper |
    | `plugin-sdk/provider-http-test-mocks` | 仓库本地、可选启用的 Vitest HTTP/auth mock，供使用 `plugin-sdk/provider-http` 的 provider 测试使用 |
    | `plugin-sdk/test-fixtures` | 仓库本地的通用 CLI runtime 捕获、sandbox 上下文、skill writer、agent-message、system-event、模块重载、bundled plugin 路径、terminal-text、chunking、auth-token 和类型化 case fixture |
    | `plugin-sdk/test-node-mocks` | 仓库本地、面向 Node 内置模块的聚焦 mock helper，供 Vitest `vi.mock("node:*")` 工厂内部使用 |
  </Accordion>

  <Accordion title="Memory 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/memory-core` | 面向 manager/config/file/CLI helper 的 bundled memory-core helper 表面 |
    | `plugin-sdk/memory-core-engine-runtime` | memory 索引/搜索运行时外观 |
    | `plugin-sdk/memory-core-host-engine-foundation` | memory host foundation engine 导出 |
    | `plugin-sdk/memory-core-host-engine-embeddings` | memory host embedding 契约、registry 访问、本地 provider 和通用 batch/remote helper |
    | `plugin-sdk/memory-core-host-engine-qmd` | memory host QMD engine 导出 |
    | `plugin-sdk/memory-core-host-engine-storage` | memory host 存储引擎导出 |
    | `plugin-sdk/memory-core-host-multimodal` | memory host 多模态 helper |
    | `plugin-sdk/memory-core-host-query` | memory host 查询 helper |
    | `plugin-sdk/memory-core-host-secret` | memory host secret helper |
    | `plugin-sdk/memory-core-host-events` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-host-events` |
    | `plugin-sdk/memory-core-host-status` | memory host 状态 helper |
    | `plugin-sdk/memory-core-host-runtime-cli` | memory host CLI runtime helper |
    | `plugin-sdk/memory-core-host-runtime-core` | memory host core runtime helper |
    | `plugin-sdk/memory-core-host-runtime-files` | memory host 文件/runtime helper |
    | `plugin-sdk/memory-host-core` | memory host core runtime helper 的供应商中立别名 |
    | `plugin-sdk/memory-host-events` | memory host event journal helper 的供应商中立别名 |
    | `plugin-sdk/memory-host-files` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-core-host-runtime-files` |
    | `plugin-sdk/memory-host-markdown` | 面向 memory 邻近插件的共享 managed-markdown helper |
    | `plugin-sdk/memory-host-search` | 用于 search-manager 访问的活动 memory runtime 外观 |
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
