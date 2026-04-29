---
summary: "插件 SDK 子路径目录：按领域分组说明各类导入所在位置"
read_when:
  - 为插件导入选择合适的 plugin-sdk 子路径
  - 审核 bundled-plugin 子路径和 helper 接口面
title: "插件 SDK 子路径"
---

插件 SDK 以 `openclaw/plugin-sdk/` 下的一组窄子路径形式暴露。
本页按用途整理了常用子路径。生成的 200+ 子路径完整列表位于 `scripts/lib/plugin-sdk-entrypoints.json`；
保留的 bundled-plugin helper 子路径也会出现在其中，但除非文档页面明确推广，否则它们都属于实现细节。
维护者可以使用 `pnpm plugins:boundary-report:summary` 审核当前启用的保留 helper 子路径；未使用的保留 helper 导出会让 CI 报告失败，而不会继续作为公共 SDK 中沉睡的兼容性债务存在。

有关插件编写指南，请参见 [Plugin SDK overview](/plugins/sdk-overview)。

## 插件入口

| 子路径                                   | 主要导出                                                                                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`                 | `definePluginEntry`                                                                                                                                                          |
| `plugin-sdk/core`                         | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema`                                       |
| `plugin-sdk/config-schema`                | `OpenClawSchema`                                                                                                                                                             |
| `plugin-sdk/provider-entry`               | `defineSingleProviderPluginEntry`                                                                                                                                            |
| `plugin-sdk/testing`                      | 面向旧版插件测试的宽兼容桶；新的扩展测试请优先使用更聚焦的测试子路径                                                                     |
| `plugin-sdk/plugin-test-api`              | 用于直接插件注册单元测试的最小 `OpenClawPluginApi` mock 构建器                                                                                           |
| `plugin-sdk/agent-runtime-test-contracts` | 原生 agent-runtime 适配器契约夹具，涵盖认证档案、交付抑制、fallback 分类、工具钩子、prompt 覆盖层、schema 和转录修复 |
| `plugin-sdk/channel-test-helpers`         | 频道账号生命周期、目录、发送配置、运行时 mock、hook、bundled channel 入口、信封时间戳、配对回复以及通用频道契约测试 helper   |
| `plugin-sdk/channel-target-testing`       | 共享的频道目标解析错误场景测试套件                                                                                                                       |
| `plugin-sdk/plugin-test-contracts`        | 插件注册、包清单、公共产物、运行时 API、导入副作用和直接导入契约 helper                                                  |
| `plugin-sdk/plugin-test-runtime`          | 用于测试的插件运行时、注册表、provider 注册、setup 向导和运行时任务流夹具                                                                      |
| `plugin-sdk/provider-test-contracts`      | provider 运行时、认证、发现、onboard、目录、媒体能力、重放策略、实时 STT 直播音频、web-search/fetch 以及向导契约 helper                 |
| `plugin-sdk/provider-http-test-mocks`     | 用于测试 `plugin-sdk/provider-http` 的可选 Vitest HTTP/auth mocks                                                                                    |
| `plugin-sdk/test-env`                     | 测试环境、fetch/网络、可释放 HTTP 服务器、传入请求、live-test、临时文件系统和时间控制夹具                                        |
| `plugin-sdk/test-fixtures`                | 通用 CLI、sandbox、skill、agent-message、system-event、模块重载、bundled plugin 路径、终端、分块、auth-token 和 typed-case 测试夹具                   |
| `plugin-sdk/test-node-mocks`              | 供在 Vitest `vi.mock("node:*")` 工厂内部使用的聚焦版 Node 内置 mock helper                                                                                        |
| `plugin-sdk/migration`                    | 迁移 provider 条目 helper，例如 `createMigrationItem`、原因常量、条目状态标记、脱敏 helper 和 `summarizeMigrationItems`                       |
| `plugin-sdk/migration-runtime`            | 运行时迁移 helper，例如 `copyMigrationFileItem` 和 `writeMigrationReport`                                                                                         |

<AccordionGroup>
  <Accordion title="Channel 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` 的 Zod schema 导出（`OpenClawSchema`） |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`，以及 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` |
    | `plugin-sdk/setup` | 共享的 setup 向导 helper、allowlist 提示、setup 状态构建器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多账号配置/动作门控 helper、默认账号回退 helper |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、账号 ID 规范化 helper |
    | `plugin-sdk/account-resolution` | 账号查找 + 默认回退 helper |
    | `plugin-sdk/account-helpers` | 窄范围账号列表/账号动作 helper |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline`, `resolveChannelSourceReplyDeliveryMode` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | 共享 channel 配置 schema 基元和通用构建器 |
    | `plugin-sdk/bundled-channel-config-schema` | 仅供维护中的 bundled 插件使用的 bundled OpenClaw channel 配置 schemas |
    | `plugin-sdk/channel-config-schema-legacy` | bundled-channel 配置 schemas 的已弃用兼容别名 |
    | `plugin-sdk/telegram-command-config` | Telegram 自定义命令规范化/校验 helper，带 bundled-contract 回退 |
    | `plugin-sdk/command-gating` | 窄范围命令授权门控 helper |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, `createChannelRunQueue`，草稿流生命周期/终结 helper |
    | `plugin-sdk/inbound-envelope` | 共享的入站路由 + 信封构建器 helper |
    | `plugin-sdk/inbound-reply-dispatch` | 共享的入站记录与分发 helper |
    | `plugin-sdk/messaging-targets` | 目标解析/匹配 helper |
    | `plugin-sdk/outbound-media` | 共享的出站媒体加载 helper |
    | `plugin-sdk/outbound-send-deps` | 面向 channel 适配器的轻量出站发送依赖查找 |
    | `plugin-sdk/outbound-runtime` | 出站交付、身份、发送委派、会话、格式化和 payload 规划 helper |
    | `plugin-sdk/poll-runtime` | 窄范围投票规范化 helper |
    | `plugin-sdk/thread-bindings-runtime` | 线程绑定生命周期和适配器 helper |
    | `plugin-sdk/agent-media-payload` | 旧版 agent 媒体 payload 构建器 |
    | `plugin-sdk/conversation-runtime` | 会话/线程绑定、配对和配置绑定 helper |
    | `plugin-sdk/runtime-config-snapshot` | 运行时配置快照 helper |
    | `plugin-sdk/runtime-group-policy` | 运行时组策略解析 helper |
    | `plugin-sdk/channel-status` | 共享 channel 状态快照/摘要 helper |
    | `plugin-sdk/channel-config-primitives` | 窄范围 channel config-schema 基元 |
    | `plugin-sdk/channel-config-writes` | channel 配置写入授权 helper |
    | `plugin-sdk/channel-plugin-common` | 共享 channel 插件前置导出 |
    | `plugin-sdk/allowlist-config-edit` | allowlist 配置编辑/读取 helper |
    | `plugin-sdk/group-access` | 共享组访问决策 helper |
    | `plugin-sdk/direct-dm` | 共享直接 DM 认证/守卫 helper |
    | `plugin-sdk/discord` | 已弃用的 Discord 兼容门面，适用于发布的 `@openclaw/discord@2026.3.13` 和跟踪中的 owner 兼容性；新插件应使用通用 channel SDK 子路径 |
    | `plugin-sdk/telegram-account` | 已弃用的 Telegram 账号解析兼容门面，用于跟踪中的 owner 兼容性；新插件应使用注入的运行时 helper 或通用 channel SDK 子路径 |
    | `plugin-sdk/interactive-runtime` | 语义消息展示、交付和旧版交互式回复 helper。参见 [Message Presentation](/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 面向向后兼容的桶，包含入站 debounce、mention 匹配、mention 策略 helper 和信封 helper |
    | `plugin-sdk/channel-inbound-debounce` | 窄范围入站 debounce helper |
    | `plugin-sdk/channel-mention-gating` | 无更大入站运行时面向的窄范围 mention 策略、mention 标记和 mention 文本 helper |
    | `plugin-sdk/channel-envelope` | 窄范围入站信封格式化 helper |
    | `plugin-sdk/channel-location` | channel 位置上下文和格式化 helper |
    | `plugin-sdk/channel-logging` | 用于入站丢弃以及 typing/ack 失败的 channel 日志 helper |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | channel 消息动作 helper，以及为插件兼容性保留的已弃用原生 schema helper |
    | `plugin-sdk/channel-route` | 共享路由规范化、基于解析器的目标解析、线程 ID 字符串化、去重/压缩路由键、解析后目标类型，以及路由/目标比较 helper |
    | `plugin-sdk/channel-targets` | 目标解析 helper；路由比较的调用方应使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | channel 契约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/reaction 接线 |
    | `plugin-sdk/channel-secret-runtime` | 窄范围 secret 契约 helper，例如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment` 和 secret 目标类型 |
  </Accordion>

  <Accordion title="Provider 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` |
    | `plugin-sdk/lmstudio` | 支持的 LM Studio provider 门面，用于 setup、目录发现和运行时模型准备 |
    | `plugin-sdk/lmstudio-runtime` | 支持的 LM Studio 运行时门面，用于本地服务器默认值、模型发现、请求头和已加载模型 helper |
    | `plugin-sdk/provider-setup` | 精选的本地/自托管 provider setup helper |
    | `plugin-sdk/self-hosted-provider-setup` | 聚焦的 OpenAI 兼容自托管 provider setup helper |
    | `plugin-sdk/cli-backend` | CLI 后端默认值 + watchdog 常量 |
    | `plugin-sdk/provider-auth-runtime` | 用于 provider 插件的运行时 API key 解析 helper |
    | `plugin-sdk/provider-auth-api-key` | API key 上手/写入档案 helper，例如 `upsertApiKeyProfile` |
    | `plugin-sdk/provider-auth-result` | 标准 OAuth 认证结果构建器 |
    | `plugin-sdk/provider-auth-login` | 面向 provider 插件的共享交互式登录 helper |
    | `plugin-sdk/provider-env-vars` | provider 认证环境变量查找 helper |
    | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`, `writeOAuthCredentials` |
    | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享 replay 策略构建器、provider 端点 helper，以及模型 ID 规范化 helper，例如 `normalizeNativeXaiModelId` |
    | `plugin-sdk/provider-catalog-runtime` | provider 目录增强运行时钩子，以及用于契约测试的 plugin-provider 注册表缝合点 |
    | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` |
    | `plugin-sdk/provider-http` | 通用 provider HTTP/端点能力 helper、provider HTTP 错误，以及音频转录 multipart form helper |
    | `plugin-sdk/provider-web-fetch-contract` | 窄范围 web-fetch 配置/选择契约 helper，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` |
    | `plugin-sdk/provider-web-fetch` | web-fetch provider 注册/缓存 helper |
    | `plugin-sdk/provider-web-search-config-contract` | 适用于不需要插件启用接线的 provider 的窄范围 web-search 配置/凭据 helper |
    | `plugin-sdk/provider-web-search-contract` | 窄范围 web-search 配置/凭据契约 helper，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig`，以及作用域凭据 setter/getter |
    | `plugin-sdk/provider-web-search` | web-search provider 注册/缓存/运行时 helper |
    | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini schema 清理 + 诊断，以及 xAI 兼容 helper，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` |
    | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 等 |
    | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、流包装器类型，以及共享的 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器 helper |
    | `plugin-sdk/provider-transport-runtime` | 原生 provider 传输 helper，例如受保护的 fetch、传输消息转换，以及可写传输事件流 |
    | `plugin-sdk/provider-onboard` | onboard 配置补丁 helper |
    | `plugin-sdk/global-singleton` | 进程本地单例/映射/缓存 helper |
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
    | `plugin-sdk/channel-secret-runtime` | 面向 channel/plugin secret 表面的窄范围 secret 契约收集 helper |
    | `plugin-sdk/secret-ref-runtime` | 面向 secret 契约/config 解析的窄范围 `coerceSecretRef` 和 SecretRef 类型 helper |
    | `plugin-sdk/security-runtime` | 共享信任、DM 门控、外部内容、敏感文本脱敏、常量时间 secret 比较和 secret 收集 helper |
    | `plugin-sdk/ssrf-policy` | 主机 allowlist 和私有网络 SSRF 策略 helper |
    | `plugin-sdk/ssrf-dispatcher` | 无广泛 infra 运行时面的窄范围 pinned-dispatcher helper |
    | `plugin-sdk/ssrf-runtime` | pinned-dispatcher、SSRF 保护的 fetch、SSRF 错误和 SSRF 策略 helper |
    | `plugin-sdk/secret-input` | secret 输入解析 helper |
    | `plugin-sdk/webhook-ingress` | webhook 请求/目标 helper 以及原始 websocket/body 强制转换 |
    | `plugin-sdk/webhook-request-guards` | 请求体大小/超时 helper |
  </Accordion>

  <Accordion title="运行时与存储子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/runtime` | 广泛的运行时/日志/备份/plugin 安装 helper |
    | `plugin-sdk/runtime-env` | 窄范围运行时环境、logger、超时、重试和退避 helper |
    | `plugin-sdk/browser-config` | 支持的浏览器配置门面，用于规范化的 profile/默认值、CDP URL 解析和浏览器控制认证 helper |
    | `plugin-sdk/channel-runtime-context` | 通用 channel 运行时上下文注册和查找 helper |
    | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` |
    | `plugin-sdk/plugin-runtime` | 共享 plugin 命令/hook/http/interactive helper |
    | `plugin-sdk/hook-runtime` | 共享 webhook/内部 hook 管道 helper |
    | `plugin-sdk/lazy-runtime` | 懒加载运行时导入/绑定 helper，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` |
    | `plugin-sdk/process-runtime` | 进程 exec helper |
    | `plugin-sdk/cli-runtime` | CLI 格式化、等待、版本、参数调用以及懒加载命令组 helper |
    | `plugin-sdk/gateway-runtime` | gateway 客户端、gateway CLI RPC、gateway 协议错误和 channel 状态补丁 helper |
    | `plugin-sdk/config-types` | 面向插件 config 形状的仅类型 config 接口，例如 `OpenClawConfig` 以及 channel/provider config 类型 |
    | `plugin-sdk/plugin-config-runtime` | 运行时插件配置查找 helper，例如 `requireRuntimeConfig`、`resolvePluginConfigObject` 和 `resolveLivePluginConfigObject` |
    | `plugin-sdk/config-mutation` | 事务性配置变更 helper，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` |
    | `plugin-sdk/runtime-config-snapshot` | 当前进程配置快照 helper，例如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和测试快照 setter |
    | `plugin-sdk/telegram-command-config` | Telegram 命令名/描述规范化和重复/冲突检查，即使 bundled Telegram 契约面不可用 |
    | `plugin-sdk/text-autolink-runtime` | 不依赖广泛 text-runtime 桶的文件引用自动链接检测 |
    | `plugin-sdk/approval-runtime` | exec/plugin 审批 helper、审批能力构建器、认证/档案 helper、原生路由/运行时 helper，以及结构化审批展示路径格式化 |
    | `plugin-sdk/reply-runtime` | 共享入站/回复运行时 helper、分块、分发、heartbeat、回复规划器 |
    | `plugin-sdk/reply-dispatch-runtime` | 窄范围回复分发/终结和会话标签 helper |
    | `plugin-sdk/reply-history` | 共享的短窗口回复历史 helper 和标记，例如 `buildHistoryContext`、`HISTORY_CONTEXT_MARKER`、`recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` |
    | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` |
    | `plugin-sdk/reply-chunking` | 窄范围文本/markdown 分块 helper |
    | `plugin-sdk/session-store-runtime` | 会话存储路径、会话键、更新时间和存储变更 helper |
    | `plugin-sdk/cron-store-runtime` | cron 存储路径/加载/保存 helper |
    | `plugin-sdk/state-paths` | state/OAuth 目录路径 helper |
    | `plugin-sdk/routing` | 路由/会话键/账号绑定 helper，例如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` |
    | `plugin-sdk/status-helpers` | 共享 channel/账号状态摘要 helper、运行时状态默认值和问题元数据 helper |
    | `plugin-sdk/target-resolver-runtime` | 共享目标解析器 helper |
    | `plugin-sdk/string-normalization-runtime` | slug/string 规范化 helper |
    | `plugin-sdk/request-url` | 从 fetch/request 风格输入中提取字符串 URL |
    | `plugin-sdk/run-command` | 带定时的命令运行器，输出规范化的 stdout/stderr 结果 |
    | `plugin-sdk/param-readers` | 常用 tool/CLI 参数读取器 |
    | `plugin-sdk/tool-payload` | 从 tool 结果对象中提取规范化 payload |
    | `plugin-sdk/tool-send` | 从 tool 参数中提取规范化的发送目标字段 |
    | `plugin-sdk/temp-path` | 共享临时下载路径 helper |
    | `plugin-sdk/logging-core` | 子系统 logger 和脱敏 helper |
    | `plugin-sdk/markdown-table-runtime` | markdown 表格模式和转换 helper |
    | `plugin-sdk/model-session-runtime` | 模型/会话覆盖 helper，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` |
    | `plugin-sdk/talk-config-runtime` | talk provider 配置解析 helper |
    | `plugin-sdk/json-store` |  მცირე型 JSON 状态读写 helper |
    | `plugin-sdk/file-lock` | 可重入文件锁 helper |
    | `plugin-sdk/persistent-dedupe` | 磁盘支持的去重缓存 helper |
    | `plugin-sdk/acp-runtime` | ACP 运行时/会话和回复分发 helper |
    | `plugin-sdk/acp-runtime-backend` | 面向启动时加载插件的轻量 ACP 后端注册和回复分发 helper |
    | `plugin-sdk/acp-binding-resolve-runtime` | 不引入生命周期启动 import 的只读 ACP 绑定解析 |
    | `plugin-sdk/agent-config-primitives` | 窄范围 agent 运行时 config-schema 基元 |
    | `plugin-sdk/boolean-param` | 宽松布尔参数读取器 |
    | `plugin-sdk/dangerous-name-runtime` | 危险名称匹配解析 helper |
    | `plugin-sdk/device-bootstrap` | 设备启动和配对 token helper |
    | `plugin-sdk/extension-shared` | 共享 passive-channel、状态和 ambient proxy helper 基元 |
    | `plugin-sdk/models-provider-runtime` | `/models` 命令/provider 回复 helper |
    | `plugin-sdk/skill-commands-runtime` | skill 命令列表 helper |
    | `plugin-sdk/native-command-registry` | 原生命令注册表/构建/序列化 helper |
    | `plugin-sdk/agent-harness` | 面向低级 agent harness 的实验性受信插件接口：harness 类型、主动运行 steer/abort helper、OpenClaw tool bridge helper、运行时计划 tool 策略 helper、终端结果分类、tool 进度格式化/详情 helper，以及尝试结果工具 |
    | `plugin-sdk/provider-zai-endpoint` | Z.AI 端点检测 helper |
    | `plugin-sdk/async-lock-runtime` | 用于小型运行时状态文件的进程本地异步锁 helper |
    | `plugin-sdk/channel-activity-runtime` | channel 活动遥测 helper |
    | `plugin-sdk/concurrency-runtime` | 有界异步任务并发 helper |
    | `plugin-sdk/dedupe-runtime` | 内存中的去重缓存 helper |
    | `plugin-sdk/delivery-queue-runtime` | 出站待交付 drain helper |
    | `plugin-sdk/file-access-runtime` | 安全的本地文件和媒体源路径 helper |
    | `plugin-sdk/heartbeat-runtime` | heartbeat 事件和可见性 helper |
    | `plugin-sdk/number-runtime` | 数值强制转换 helper |
    | `plugin-sdk/secure-random-runtime` | 安全 token/UUID helper |
    | `plugin-sdk/system-event-runtime` | 系统事件队列 helper |
    | `plugin-sdk/transport-ready-runtime` | 传输就绪等待 helper |
    | `plugin-sdk/infra-runtime` | 已弃用的兼容性 shim；请使用上方更聚焦的 runtime 子路径 |
    | `plugin-sdk/collection-runtime` | 小型有界缓存 helper |
    | `plugin-sdk/diagnostic-runtime` | 诊断标志、事件和 trace 上下文 helper |
    | `plugin-sdk/error-runtime` | 错误图、格式化、共享错误分类 helper、`isApprovalNotFoundError` |
    | `plugin-sdk/fetch-runtime` | 包装的 fetch、代理、EnvHttpProxyAgent 选项和 pinned 查找 helper |
    | `plugin-sdk/runtime-fetch` | 感知 dispatcher 的运行时 fetch，不依赖 proxy/guarded-fetch 导入 |
    | `plugin-sdk/response-limit-runtime` | 有界响应体读取器，不依赖广泛媒体运行时面 |
    | `plugin-sdk/session-binding-runtime` | 当前会话绑定状态，不含已配置绑定路由或配对存储 |
    | `plugin-sdk/session-store-runtime` | 不包含广泛 config 写入/维护导入的 session-store helper |
    | `plugin-sdk/context-visibility-runtime` | 上下文可见性解析和补充上下文过滤，不包含广泛 config/security 导入 |
    | `plugin-sdk/string-coerce-runtime` | 窄范围原始记录/string 强制转换和规范化 helper，不含 markdown/logging 导入 |
    | `plugin-sdk/host-runtime` | 主机名和 SCP 主机规范化 helper |
    | `plugin-sdk/retry-runtime` | 重试配置和重试运行器 helper |
    | `plugin-sdk/agent-runtime` | agent 目录/身份/workspace helper |
    | `plugin-sdk/directory-runtime` | 基于配置的目录查询/去重 |
    | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
  </Accordion>

  <Accordion title="能力与测试子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/media-runtime` | 共享媒体 fetch/转换/存储 helper、基于 ffprobe 的视频尺寸探测，以及媒体 payload 构建器 |
    | `plugin-sdk/media-store` | 窄范围媒体存储 helper，例如 `saveMediaBuffer` |
    | `plugin-sdk/media-generation-runtime` | 共享媒体生成失败切换 helper、候选项选择和缺失模型提示 |
    | `plugin-sdk/media-understanding` | 媒体理解 provider 类型以及面向 provider 的图像/音频 helper 导出 |
    | `plugin-sdk/text-runtime` | 共享文本/markdown/日志 helper，例如 assistant 可见文本剥离、markdown 渲染/分块/表格 helper、脱敏 helper、directive-tag helper 和安全文本工具 |
    | `plugin-sdk/text-chunking` | 出站文本分块 helper |
    | `plugin-sdk/speech` | 语音 provider 类型以及面向 provider 的 directive、注册表、校验、OpenAI 兼容 TTS 构建器和语音 helper 导出 |
    | `plugin-sdk/speech-core` | 共享语音 provider 类型、注册表、directive、规范化和语音 helper 导出 |
    | `plugin-sdk/realtime-transcription` | 实时转录 provider 类型、注册表 helper 和共享 WebSocket 会话 helper |
    | `plugin-sdk/realtime-voice` | 实时语音 provider 类型和注册表 helper |
    | `plugin-sdk/image-generation` | 图像生成 provider 类型，以及图像资产/data URL helper 和 OpenAI 兼容图像 provider 构建器 |
    | `plugin-sdk/image-generation-core` | 共享图像生成类型、失败切换、认证和注册表 helper |
    | `plugin-sdk/music-generation` | 音乐生成 provider/请求/结果类型 |
    | `plugin-sdk/music-generation-core` | 共享音乐生成类型、失败切换 helper、provider 查找和 model-ref 解析 |
    | `plugin-sdk/video-generation` | 视频生成 provider/请求/结果类型 |
    | `plugin-sdk/video-generation-core` | 共享视频生成类型、失败切换 helper、provider 查找和 model-ref 解析 |
    | `plugin-sdk/webhook-targets` | webhook 目标注册表和路由安装 helper |
    | `plugin-sdk/webhook-path` | webhook 路径规范化 helper |
    | `plugin-sdk/web-media` | 共享远程/本地媒体加载 helper |
    | `plugin-sdk/zod` | 重新导出的 `zod`，供 plugin SDK 消费者使用 |
    | `plugin-sdk/testing` | 面向旧版插件测试的宽兼容桶。新的扩展测试应改为导入更聚焦的 SDK 子路径，例如 `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures` |
    | `plugin-sdk/plugin-test-api` | 用于直接插件注册单元测试的最小 `createTestPluginApi` helper，无需导入仓库测试 helper 桥接层 |
    | `plugin-sdk/agent-runtime-test-contracts` | 原生 agent-runtime 适配器契约夹具，用于认证、交付、fallback、tool-hook、prompt-overlay、schema 和 transcript projection 测试 |
    | `plugin-sdk/channel-test-helpers` | 面向 channel 的测试 helper，涵盖通用动作/setup/status 契约、目录断言、账号启动生命周期、send-config 线程、运行时 mock、状态问题、出站交付和 hook 注册 |
    | `plugin-sdk/channel-target-testing` | 面向 channel 测试的共享目标解析错误场景套件 |
    | `plugin-sdk/plugin-test-contracts` | 插件包、注册、公共产物、直接导入、运行时 API 和导入副作用契约 helper |
    | `plugin-sdk/provider-test-contracts` | provider 运行时、认证、发现、onboard、目录、向导、媒体能力、重放策略、实时 STT 直播音频、web-search/fetch 和流契约 helper |
    | `plugin-sdk/provider-http-test-mocks` | 用于测试 `plugin-sdk/provider-http` 的可选 Vitest HTTP/auth mocks |
    | `plugin-sdk/test-fixtures` | 通用 CLI 运行时捕获、sandbox 上下文、skill writer、agent-message、system-event、模块重载、bundled plugin 路径、终端文本、分块、auth-token 和 typed-case 夹具 |
    | `plugin-sdk/test-node-mocks` | 供在 Vitest `vi.mock("node:*")` 工厂内部使用的聚焦版 Node 内置 mock helper |
  </Accordion>

  <Accordion title="Memory 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/memory-core` | 面向 manager/config/file/CLI helper 的 bundled memory-core helper 接口面 |
    | `plugin-sdk/memory-core-engine-runtime` | 内存索引/搜索运行时门面 |
    | `plugin-sdk/memory-core-host-engine-foundation` | Memory host foundation engine 导出 |
    | `plugin-sdk/memory-core-host-engine-embeddings` | Memory host embedding 契约、注册表访问、本地 provider，以及通用批量/远程 helper |
    | `plugin-sdk/memory-core-host-engine-qmd` | Memory host QMD engine 导出 |
    | `plugin-sdk/memory-core-host-engine-storage` | Memory host 存储引擎导出 |
    | `plugin-sdk/memory-core-host-multimodal` | Memory host 多模态 helper |
    | `plugin-sdk/memory-core-host-query` | Memory host 查询 helper |
    | `plugin-sdk/memory-core-host-secret` | Memory host secret helper |
    | `plugin-sdk/memory-core-host-events` | Memory host 事件日志 helper |
    | `plugin-sdk/memory-core-host-status` | Memory host 状态 helper |
    | `plugin-sdk/memory-core-host-runtime-cli` | Memory host CLI 运行时 helper |
    | `plugin-sdk/memory-core-host-runtime-core` | Memory host 核心运行时 helper |
    | `plugin-sdk/memory-core-host-runtime-files` | Memory host 文件/运行时 helper |
    | `plugin-sdk/memory-host-core` | 面向供应商中立的 memory host 核心运行时 helper 别名 |
    | `plugin-sdk/memory-host-events` | 面向供应商中立的 memory host 事件日志 helper 别名 |
    | `plugin-sdk/memory-host-files` | 面向供应商中立的 memory host 文件/运行时 helper 别名 |
    | `plugin-sdk/memory-host-markdown` | 面向内存相关插件的共享 managed-markdown helper |
    | `plugin-sdk/memory-host-search` | 面向 search-manager 访问的活动内存运行时门面 |
    | `plugin-sdk/memory-host-status` | 面向供应商中立的 memory host 状态 helper 别名 |
  </Accordion>

  <Accordion title="保留的 bundled-helper 子路径">
    当前没有保留的 bundled-helper SDK 子路径。owner 专用 helper 位于对应的插件包内部，而可复用的 host 契约则使用通用 SDK 子路径，例如 `plugin-sdk/gateway-runtime`、
    `plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。
  </Accordion>
</AccordionGroup>

## 相关内容

- [插件 SDK 概览](/plugins/sdk-overview)
- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
