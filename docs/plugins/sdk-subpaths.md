---
summary: "插件 SDK 子路径目录：各导入项位于何处，按领域分组"
read_when:
  - 为插件导入选择正确的 plugin-sdk 子路径
  - 审核 bundled-plugin 子路径和辅助表面
title: "插件 SDK 子路径"
---

插件 SDK 以 `openclaw/plugin-sdk/` 下的一组窄子路径形式暴露。
本页按用途整理了常用子路径。生成的 200+ 子路径完整列表位于 `scripts/lib/plugin-sdk-entrypoints.json`；
保留的 bundled-plugin 辅助子路径也会出现在其中，但除非文档页明确提升它们的地位，否则它们都属于实现细节。

关于插件编写指南，请参见 [插件 SDK 概览](/plugins/sdk-overview)。

## 插件入口

| 子路径                        | 主要导出                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `plugin-sdk/plugin-entry`      | `definePluginEntry`                                                                                                                                    |
| `plugin-sdk/core`              | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema`                 |
| `plugin-sdk/config-schema`     | `OpenClawSchema`                                                                                                                                       |
| `plugin-sdk/provider-entry`    | `defineSingleProviderPluginEntry`                                                                                                                      |
| `plugin-sdk/migration`         | 迁移 provider 条目辅助工具，例如 `createMigrationItem`、原因常量、条目状态标记、脱敏辅助工具，以及 `summarizeMigrationItems` |
| `plugin-sdk/migration-runtime` | 运行时迁移辅助工具，例如 `copyMigrationFileItem` 和 `writeMigrationReport`                                                                   |

<AccordionGroup>
  <Accordion title="Channel 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod schema 导出（`OpenClawSchema`） |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`，以及 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共享的 setup 向导辅助工具、allowlist 提示、setup 状态构建器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多账户配置/操作门控辅助工具，默认账户回退辅助工具 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`，账户 ID 规范化辅助工具 |
    | `plugin-sdk/account-resolution` | 账户查找 + 默认回退辅助工具 |
    | `plugin-sdk/account-helpers` | 窄范围的账户列表/账户操作辅助工具 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | 共享的 channel config schema 基元和通用构建器 |
    | `plugin-sdk/channel-config-schema-legacy` | 仅为 bundled 兼容性保留的已弃用 bundled-channel config schema |
    | `plugin-sdk/telegram-command-config` | 带有 bundled-contract 回退的 Telegram 自定义命令规范化/验证辅助工具 |
    | `plugin-sdk/command-gating` | 窄范围的命令授权门控辅助工具 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`，draft stream 生命周期/终结辅助工具 |
    | `plugin-sdk/inbound-envelope` | 共享的 inbound 路由 + envelope 构建器辅助工具 |
    | `plugin-sdk/inbound-reply-dispatch` | 共享的 inbound 记录与分发辅助工具 |
    | `plugin-sdk/messaging-targets` | 目标解析/匹配辅助工具 |
    | `plugin-sdk/outbound-media` | 共享的 outbound 媒体加载辅助工具 |
    | `plugin-sdk/outbound-send-deps` | 面向 channel 适配器的轻量级 outbound 发送依赖查找 |
    | `plugin-sdk/outbound-runtime` | outbound 投递、身份、发送委托、会话、格式化和负载规划辅助工具 |
    | `plugin-sdk/poll-runtime` | 窄范围的 poll 规范化辅助工具 |
    | `plugin-sdk/thread-bindings-runtime` | 线程绑定生命周期和适配器辅助工具 |
    | `plugin-sdk/agent-media-payload` | 旧版 agent 媒体负载构建器 |
    | `plugin-sdk/conversation-runtime` | 对话/线程绑定、配对和已配置绑定辅助工具 |
    | `plugin-sdk/runtime-config-snapshot` | 运行时配置快照辅助工具 |
    | `plugin-sdk/runtime-group-policy` | 运行时群组策略解析辅助工具 |
    | `plugin-sdk/channel-status` | 共享的 channel 状态快照/摘要辅助工具 |
    | `plugin-sdk/channel-config-primitives` | 窄范围的 channel config-schema 基元 |
    | `plugin-sdk/channel-config-writes` | Channel config 写入授权辅助工具 |
    | `plugin-sdk/channel-plugin-common` | 共享的 channel plugin prelude 导出 |
    | `plugin-sdk/allowlist-config-edit` | allowlist 配置编辑/读取辅助工具 |
    | `plugin-sdk/group-access` | 共享的群组访问决策辅助工具 |
    | `plugin-sdk/direct-dm` | 共享的 direct-DM 认证/守卫辅助工具 |
    | `plugin-sdk/interactive-runtime` | 语义消息展示、投递和旧版交互式回复辅助工具。参见 [消息展示](/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 面向 inbound debounce、mention 匹配、mention-policy 辅助工具和 envelope 辅助工具的兼容 barrel |
    | `plugin-sdk/channel-inbound-debounce` | 窄范围的 inbound debounce 辅助工具 |
    | `plugin-sdk/channel-mention-gating` | 不含更广泛 inbound runtime 表面的窄范围 mention-policy、mention 标记和 mention 文本辅助工具 |
    | `plugin-sdk/channel-envelope` | 窄范围的 inbound envelope 格式化辅助工具 |
    | `plugin-sdk/channel-location` | Channel 位置上下文和格式化辅助工具 |
    | `plugin-sdk/channel-logging` | 用于 inbound 丢弃和 typing/ack 失败的 channel 日志辅助工具 |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | Channel 消息动作辅助工具，以及为插件兼容性保留的已弃用原生 schema 辅助工具 |
    | `plugin-sdk/channel-targets` | 目标解析/匹配辅助工具 |
    | `plugin-sdk/channel-contract` | Channel 合约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/反应接线 |
    | `plugin-sdk/channel-secret-runtime` | 窄范围的 secret-contract 辅助工具，例如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment` 以及 secret 目标类型 |
  </Accordion>

  <Accordion title="Provider 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` |
    | `plugin-sdk/lmstudio` | 用于 setup、目录发现和运行时模型准备的受支持 LM Studio provider 外观 |
    | `plugin-sdk/lmstudio-runtime` | 用于本地服务器默认值、模型发现、请求头和已加载模型辅助工具的受支持 LM Studio 运行时外观 |
    | `plugin-sdk/provider-setup` | 精选的本地/自托管 provider setup 辅助工具 |
    | `plugin-sdk/self-hosted-provider-setup` | 聚焦于 OpenAI 兼容的自托管 provider setup 辅助工具 |
    | `plugin-sdk/cli-backend` | CLI 后端默认值 + watchdog 常量 |
    | `plugin-sdk/provider-auth-runtime` | provider 插件的运行时 API key 解析辅助工具 |
    | `plugin-sdk/provider-auth-api-key` | API key onboarding/profile 写入辅助工具，例如 `upsertApiKeyProfile` |
    | `plugin-sdk/provider-auth-result` | 标准 OAuth auth-result 构建器 |
    | `plugin-sdk/provider-auth-login` | 面向 provider 插件的共享交互式登录辅助工具 |
    | `plugin-sdk/provider-env-vars` | provider 认证环境变量查找辅助工具 |
    | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`, `writeOAuthCredentials` |
    | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, 共享的 replay-policy 构建器、provider-endpoint 辅助工具，以及模型 ID 规范化辅助工具，例如 `normalizeNativeXaiModelId` |
    | `plugin-sdk/provider-catalog-runtime` | 供 contract 测试使用的 provider 目录运行时钩子和插件-provider 注册表缝隙 |
    | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` |
    | `plugin-sdk/provider-http` | 通用 provider HTTP/endpoint 能力辅助工具、provider HTTP 错误，以及音频转录 multipart form 辅助工具 |
    | `plugin-sdk/provider-web-fetch-contract` | 窄范围的 web-fetch 配置/选择合约辅助工具，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` |
    | `plugin-sdk/provider-web-fetch` | Web-fetch provider 注册/缓存辅助工具 |
    | `plugin-sdk/provider-web-search-config-contract` | 适用于不需要 plugin-enable 绑定的 provider 的窄范围 web-search 配置/凭据辅助工具 |
    | `plugin-sdk/provider-web-search-contract` | 窄范围的 web-search 配置/凭据合约辅助工具，例如 `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`，以及作用域凭据 setter/getter |
    | `plugin-sdk/provider-web-search` | Web-search provider 注册/缓存/运行时辅助工具 |
    | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, Gemini schema 清理 + 诊断，以及 xAI 兼容辅助工具，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` |
    | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及类似工具 |
    | `plugin-sdk/provider-stream` | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, 流包装器类型，以及共享的 Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器辅助工具 |
    | `plugin-sdk/provider-transport-runtime` | 原生 provider 传输辅助工具，例如受保护的 fetch、传输消息转换，以及可写的传输事件流 |
    | `plugin-sdk/provider-onboard` | onboarding 配置补丁辅助工具 |
    | `plugin-sdk/global-singleton` | 进程本地 singleton/map/cache 辅助工具 |
    | `plugin-sdk/group-activation` | 窄范围的群组激活模式和命令解析辅助工具 |
  </Accordion>

  <Accordion title="Auth 和安全子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/command-auth` | `resolveControlCommandGate`，命令注册表辅助工具，发送者授权辅助工具 |
    | `plugin-sdk/command-status` | 命令/帮助消息构建器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` |
    | `plugin-sdk/approval-auth-runtime` | 审批人解析和同聊天动作授权辅助工具 |
    | `plugin-sdk/approval-client-runtime` | 原生 exec 审批 profile/filter 辅助工具 |
    | `plugin-sdk/approval-delivery-runtime` | 原生审批能力/投递适配器 |
    | `plugin-sdk/approval-gateway-runtime` | 共享的审批 gateway 解析辅助工具 |
    | `plugin-sdk/approval-handler-adapter-runtime` | 用于热 channel 入口点的轻量级原生审批适配器加载辅助工具 |
    | `plugin-sdk/approval-handler-runtime` | 更广泛的审批处理器 runtime 辅助工具；当更窄的 adapter/gateway 接口已经足够时，优先使用它们 |
    | `plugin-sdk/approval-native-runtime` | 原生审批目标 + 账户绑定辅助工具 |
    | `plugin-sdk/approval-reply-runtime` | exec/plugin 审批回复负载辅助工具 |
    | `plugin-sdk/approval-runtime` | exec/plugin 审批负载辅助工具、原生审批路由/runtime 辅助工具，以及结构化审批展示辅助工具，例如 `formatApprovalDisplayPath` |
    | `plugin-sdk/reply-dedupe` | 窄范围的 inbound 回复去重重置辅助工具 |
    | `plugin-sdk/channel-contract-testing` | 不含广泛测试 barrel 的窄范围 channel 合约测试辅助工具 |
    | `plugin-sdk/command-auth-native` | 原生命令授权 + 原生会话目标辅助工具 |
    | `plugin-sdk/command-detection` | 共享的命令检测辅助工具 |
    | `plugin-sdk/command-primitives-runtime` | 面向热 channel 路径的轻量级命令文本谓词 |
    | `plugin-sdk/command-surface` | 命令正文规范化和命令表面辅助工具 |
    | `plugin-sdk/allow-from` | `formatAllowFromLowercase` |
    | `plugin-sdk/channel-secret-runtime` | 面向 channel/plugin secret 表面的窄范围 secret-contract 收集辅助工具 |
    | `plugin-sdk/secret-ref-runtime` | 面向 secret-contract/config 解析的窄范围 `coerceSecretRef` 和 SecretRef 类型辅助工具 |
    | `plugin-sdk/security-runtime` | 共享的信任、DM gating、外部内容、敏感文本脱敏、常量时间 secret 比较和 secret 收集辅助工具 |
    | `plugin-sdk/ssrf-policy` | Host allowlist 和私有网络 SSRF 策略辅助工具 |
    | `plugin-sdk/ssrf-dispatcher` | 不含广泛 infra runtime 表面的窄范围 pinned-dispatcher 辅助工具 |
    | `plugin-sdk/ssrf-runtime` | pinned-dispatcher、SSRF 保护的 fetch、SSRF 错误和 SSRF 策略辅助工具 |
    | `plugin-sdk/secret-input` | secret 输入解析辅助工具 |
    | `plugin-sdk/webhook-ingress` | Webhook 请求/目标辅助工具以及原始 websocket/body 强制转换 |
    | `plugin-sdk/webhook-request-guards` | 请求 body 大小/超时辅助工具 |
  </Accordion>

  <Accordion title="运行时和存储子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/runtime` | 广泛的运行时/日志/备份/插件安装辅助工具 |
    | `plugin-sdk/runtime-env` | 窄范围的运行时环境、日志器、超时、重试和退避辅助工具 |
    | `plugin-sdk/browser-config` | 用于规范化 profile/默认值、CDP URL 解析和浏览器控制认证辅助工具的受支持 browser config 外观 |
    | `plugin-sdk/channel-runtime-context` | 通用 channel runtime-context 注册和查找辅助工具 |
    | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` |
    | `plugin-sdk/plugin-runtime` | 共享的 plugin 命令/钩子/http/interactive 辅助工具 |
    | `plugin-sdk/hook-runtime` | 共享的 webhook/internal hook 流水线辅助工具 |
    | `plugin-sdk/lazy-runtime` | 诸如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` 的 lazy runtime 导入/绑定辅助工具 |
    | `plugin-sdk/process-runtime` | 进程 exec 辅助工具 |
    | `plugin-sdk/cli-runtime` | CLI 格式化、等待、版本、参数调用和 lazy 命令组辅助工具 |
    | `plugin-sdk/gateway-runtime` | Gateway 客户端、gateway CLI RPC、gateway 协议错误和 channel-status 补丁辅助工具 |
    | `plugin-sdk/config-types` | 插件 config 形状的仅类型 config 表面，例如 `OpenClawConfig` 以及 channel/provider config 类型 |
    | `plugin-sdk/plugin-config-runtime` | 运行时 plugin-config 查找辅助工具，例如 `requireRuntimeConfig`、`resolvePluginConfigObject` 和 `resolveLivePluginConfigObject` |
    | `plugin-sdk/config-mutation` | 事务性 config 变更辅助工具，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` |
    | `plugin-sdk/runtime-config-snapshot` | 当前进程 config 快照辅助工具，例如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和测试快照设置器 |
    | `plugin-sdk/telegram-command-config` | Telegram 命令名/描述规范化和重复/冲突检查，即使 bundled Telegram 合约表面不可用也可使用 |
    | `plugin-sdk/text-autolink-runtime` | 不含广泛 text-runtime barrel 的文件引用自动链接检测 |
    | `plugin-sdk/approval-runtime` | exec/plugin 审批辅助工具、审批能力构建器、认证/profile 辅助工具、原生路由/runtime 辅助工具，以及结构化审批展示路径格式化 |
    | `plugin-sdk/reply-runtime` | 共享的 inbound/reply runtime 辅助工具、分块、分发、heartbeat、回复规划器 |
    | `plugin-sdk/reply-dispatch-runtime` | 窄范围的回复分发/终结和对话标签辅助工具 |
    | `plugin-sdk/reply-history` | 共享的短窗口回复历史辅助工具和标记，例如 `buildHistoryContext`、`HISTORY_CONTEXT_MARKER`、`recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` |
    | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` |
    | `plugin-sdk/reply-chunking` | 窄范围的文本/markdown 分块辅助工具 |
    | `plugin-sdk/session-store-runtime` | 会话存储路径、会话键、更新时间和存储变更辅助工具 |
    | `plugin-sdk/cron-store-runtime` | Cron 存储路径/加载/保存辅助工具 |
    | `plugin-sdk/state-paths` | 状态/OAuth 目录路径辅助工具 |
    | `plugin-sdk/routing` | 路由/会话键/账户绑定辅助工具，例如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` |
    | `plugin-sdk/status-helpers` | 共享的 channel/账户状态摘要辅助工具、运行时状态默认值和问题元数据辅助工具 |
    | `plugin-sdk/target-resolver-runtime` | 共享的目标解析器辅助工具 |
    | `plugin-sdk/string-normalization-runtime` | slug/字符串规范化辅助工具 |
    | `plugin-sdk/request-url` | 从 fetch/request-like 输入中提取字符串 URL |
    | `plugin-sdk/run-command` | 带规范化 stdout/stderr 结果的计时命令运行器 |
    | `plugin-sdk/param-readers` | 通用工具/CLI 参数读取器 |
    | `plugin-sdk/tool-payload` | 从工具结果对象中提取规范化负载 |
    | `plugin-sdk/tool-send` | 从工具参数中提取规范化的发送目标字段 |
    | `plugin-sdk/temp-path` | 共享的临时下载路径辅助工具 |
    | `plugin-sdk/logging-core` | 子系统日志器和脱敏辅助工具 |
    | `plugin-sdk/markdown-table-runtime` | markdown 表格模式和转换辅助工具 |
    | `plugin-sdk/model-session-runtime` | 模型/会话覆盖辅助工具，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` |
    | `plugin-sdk/talk-config-runtime` | talk provider 配置解析辅助工具 |
    | `plugin-sdk/json-store` | 轻量级 JSON 状态读写辅助工具 |
    | `plugin-sdk/file-lock` | 可重入文件锁辅助工具 |
    | `plugin-sdk/persistent-dedupe` | 磁盘支持的去重缓存辅助工具 |
    | `plugin-sdk/acp-runtime` | ACP 运行时/会话和回复分发辅助工具 |
    | `plugin-sdk/acp-binding-resolve-runtime` | 不含生命周期启动导入的只读 ACP 绑定解析 |
    | `plugin-sdk/agent-config-primitives` | 窄范围的 agent 运行时 config-schema 基元 |
    | `plugin-sdk/boolean-param` | 宽松布尔参数读取器 |
    | `plugin-sdk/dangerous-name-runtime` | 危险名称匹配解析辅助工具 |
    | `plugin-sdk/device-bootstrap` | 设备引导和配对 token 辅助工具 |
    | `plugin-sdk/extension-shared` | 共享的 passive-channel、状态和 ambient proxy 辅助工具基元 |
    | `plugin-sdk/models-provider-runtime` | `/models` 命令/provider 回复辅助工具 |
    | `plugin-sdk/skill-commands-runtime` | 技能命令列表辅助工具 |
    | `plugin-sdk/native-command-registry` | 原生命令注册表/构建/序列化辅助工具 |
    | `plugin-sdk/agent-harness` | 面向低层 agent harness 的实验性受信任插件表面：harness 类型、活动运行 steer/abort 辅助工具、OpenClaw 工具桥接辅助工具、运行时计划工具策略辅助工具、终端结果分类、工具进度格式化/详情辅助工具，以及尝试结果工具 |
    | `plugin-sdk/provider-zai-endpoint` | Z.AI endpoint 检测辅助工具 |
    | `plugin-sdk/async-lock-runtime` | 用于小型运行时状态文件的进程本地异步锁辅助工具 |
    | `plugin-sdk/channel-activity-runtime` | channel 活动遥测辅助工具 |
    | `plugin-sdk/concurrency-runtime` | 有界异步任务并发辅助工具 |
    | `plugin-sdk/dedupe-runtime` | 内存去重缓存辅助工具 |
    | `plugin-sdk/delivery-queue-runtime` | outbound 待投递项清空辅助工具 |
    | `plugin-sdk/file-access-runtime` | 安全的本地文件和媒体源路径辅助工具 |
    | `plugin-sdk/heartbeat-runtime` | heartbeat 事件和可见性辅助工具 |
    | `plugin-sdk/number-runtime` | 数字强制转换辅助工具 |
    | `plugin-sdk/secure-random-runtime` | 安全 token/UUID 辅助工具 |
    | `plugin-sdk/system-event-runtime` | 系统事件队列辅助工具 |
    | `plugin-sdk/transport-ready-runtime` | 传输就绪等待辅助工具 |
    | `plugin-sdk/infra-runtime` | 已弃用的兼容性 shim；请使用上面更聚焦的 runtime 子路径 |
    | `plugin-sdk/collection-runtime` | 小型有界缓存辅助工具 |
    | `plugin-sdk/diagnostic-runtime` | 诊断标志、事件和 trace-context 辅助工具 |
    | `plugin-sdk/error-runtime` | 错误图、格式化、共享错误分类辅助工具、`isApprovalNotFoundError` |
    | `plugin-sdk/fetch-runtime` | 包装的 fetch、代理和 pinned lookup 辅助工具 |
    | `plugin-sdk/runtime-fetch` | 不含 proxy/guarded-fetch 导入的 dispatcher 感知 runtime fetch |
    | `plugin-sdk/response-limit-runtime` | 不含广泛 media runtime 表面的有界响应体读取器 |
    | `plugin-sdk/session-binding-runtime` | 不含已配置绑定路由或配对存储的当前对话绑定状态 |
    | `plugin-sdk/session-store-runtime` | 不含广泛 config 写入/维护导入的会话存储辅助工具 |
    | `plugin-sdk/context-visibility-runtime` | 不含广泛 config/security 导入的上下文可见性解析和补充上下文过滤 |
    | `plugin-sdk/string-coerce-runtime` | 不含 markdown/logging 导入的窄范围原始记录/字符串强制转换和规范化辅助工具 |
    | `plugin-sdk/host-runtime` | 主机名和 SCP 主机规范化辅助工具 |
    | `plugin-sdk/retry-runtime` | 重试配置和重试运行器辅助工具 |
    | `plugin-sdk/agent-runtime` | agent 目录/身份/工作区辅助工具 |
    | `plugin-sdk/directory-runtime` | 基于 config 的目录查询/去重 |
    | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
  </Accordion>

  <Accordion title="能力和测试子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/media-runtime` | 共享的媒体 fetch/transform/store 辅助工具以及媒体负载构建器 |
    | `plugin-sdk/media-store` | 窄范围的媒体存储辅助工具，例如 `saveMediaBuffer` |
    | `plugin-sdk/media-generation-runtime` | 共享的媒体生成故障转移辅助工具、候选项选择和缺失模型消息 |
    | `plugin-sdk/media-understanding` | 媒体理解 provider 类型以及面向 provider 的图像/音频辅助工具导出 |
    | `plugin-sdk/text-runtime` | 共享的文本/markdown/日志辅助工具，例如 assistant 可见文本剥离、markdown 渲染/分块/表格辅助工具、脱敏辅助工具、directive-tag 辅助工具和安全文本工具 |
    | `plugin-sdk/text-chunking` | outbound 文本分块辅助工具 |
    | `plugin-sdk/speech` | speech provider 类型以及面向 provider 的 directive、注册表、验证和 speech 辅助工具导出 |
    | `plugin-sdk/speech-core` | 共享的 speech provider 类型、注册表、directive、规范化和 speech 辅助工具导出 |
    | `plugin-sdk/realtime-transcription` | 实时转录 provider 类型、注册表辅助工具和共享的 WebSocket 会话辅助工具 |
    | `plugin-sdk/realtime-voice` | 实时语音 provider 类型和注册表辅助工具 |
    | `plugin-sdk/image-generation` | 图像生成 provider 类型 |
    | `plugin-sdk/image-generation-core` | 共享的图像生成类型、故障转移、认证和注册表辅助工具 |
    | `plugin-sdk/music-generation` | 音乐生成 provider/请求/结果类型 |
    | `plugin-sdk/music-generation-core` | 共享的音乐生成类型、故障转移辅助工具、provider 查找和模型引用解析 |
    | `plugin-sdk/video-generation` | 视频生成 provider/请求/结果类型 |
    | `plugin-sdk/video-generation-core` | 共享的视频生成类型、故障转移辅助工具、provider 查找和模型引用解析 |
    | `plugin-sdk/webhook-targets` | webhook 目标注册表和路由安装辅助工具 |
    | `plugin-sdk/webhook-path` | webhook 路径规范化辅助工具 |
    | `plugin-sdk/web-media` | 共享的远程/本地媒体加载辅助工具 |
    | `plugin-sdk/zod` | 为 plugin SDK 消费者重新导出的 `zod` |
    | `plugin-sdk/testing` | 公共扩展测试辅助工具，包括插件注册表/运行时 mock、provider 注册捕获、setup 向导辅助工具、fetch/env/temp/time fixtures、schema/media/live-test 辅助工具、`installCommonResolveTargetErrorCases`、`writeSkill`、`createTestRegistry` 和 live generation 环境加载。扩展的 `*.test-support.ts` 辅助工具保留在此处或聚焦的 SDK 子路径中，而不是核心内部 |
  </Accordion>

  <Accordion title="Memory 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/memory-core` | 面向 manager/config/file/CLI 辅助工具的 bundled memory-core 辅助表面 |
    | `plugin-sdk/memory-core-engine-runtime` | 内存索引/搜索 runtime 外观 |
    | `plugin-sdk/memory-core-host-engine-foundation` | Memory host foundation engine 导出 |
    | `plugin-sdk/memory-core-host-engine-embeddings` | Memory host embedding 合约、注册表访问、本地 provider 和通用批量/远程辅助工具 |
    | `plugin-sdk/memory-core-host-engine-qmd` | Memory host QMD engine 导出 |
    | `plugin-sdk/memory-core-host-engine-storage` | Memory host storage engine 导出 |
    | `plugin-sdk/memory-core-host-multimodal` | Memory host 多模态辅助工具 |
    | `plugin-sdk/memory-core-host-query` | Memory host 查询辅助工具 |
    | `plugin-sdk/memory-core-host-secret` | Memory host secret 辅助工具 |
    | `plugin-sdk/memory-core-host-events` | Memory host 事件日志辅助工具 |
    | `plugin-sdk/memory-core-host-status` | Memory host 状态辅助工具 |
    | `plugin-sdk/memory-core-host-runtime-cli` | Memory host CLI runtime 辅助工具 |
    | `plugin-sdk/memory-core-host-runtime-core` | Memory host core runtime 辅助工具 |
    | `plugin-sdk/memory-core-host-runtime-files` | Memory host 文件/runtime 辅助工具 |
    | `plugin-sdk/memory-host-core` | Memory host core runtime 辅助工具的供应商无关别名 |
    | `plugin-sdk/memory-host-events` | Memory host 事件日志辅助工具的供应商无关别名 |
    | `plugin-sdk/memory-host-files` | Memory host 文件/runtime 辅助工具的供应商无关别名 |
    | `plugin-sdk/memory-host-markdown` | 面向 memory 附近插件的共享 managed-markdown 辅助工具 |
    | `plugin-sdk/memory-host-search` | 用于 search-manager 访问的活动内存 runtime 外观 |
    | `plugin-sdk/memory-host-status` | Memory host 状态辅助工具的供应商无关别名 |
    | `plugin-sdk/memory-lancedb` | bundled memory-lancedb 辅助表面 |
  </Accordion>

  <Accordion title="保留的 bundled-helper 子路径">
    | 家族 | 当前子路径 | 预期用途 |
    | --- | --- | --- |
    | Browser | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | Bundled browser 插件支持辅助工具。`browser-profiles` 导出 `resolveBrowserConfig`、`resolveProfile`、`ResolvedBrowserConfig`、`ResolvedBrowserProfile` 和 `ResolvedBrowserTabCleanupConfig`，用于规范化后的 `browser.tabCleanup` 形状。`browser-support` 仍然是兼容性 barrel。 |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | Bundled Matrix 辅助/runtime 表面 |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | Bundled LINE 辅助/runtime 表面 |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | Bundled IRC 辅助表面 |
    | Channel-specific helpers | `plugin-sdk/googlechat`, `plugin-sdk/googlechat-runtime-shared`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu`, `plugin-sdk/feishu-conversation`, `plugin-sdk/feishu-setup`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/telegram-command-ui`, `plugin-sdk/tlon`, `plugin-sdk/twitch`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` | 已弃用的 bundled channel 兼容性/辅助缝隙。新插件应导入通用 SDK 子路径或插件本地 barrel。 |
    | Auth/plugin-specific helpers | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diagnostics-prometheus`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/memory-core`, `plugin-sdk/memory-lancedb`, `plugin-sdk/opencode`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | Bundled 功能/插件辅助缝隙；`plugin-sdk/github-copilot-token` 当前导出 `DEFAULT_COPILOT_API_BASE_URL`、`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## 相关内容

- [插件 SDK 概览](/plugins/sdk-overview)
- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
