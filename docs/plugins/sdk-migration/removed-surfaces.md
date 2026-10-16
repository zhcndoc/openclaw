---
doc-schema-version: 1
summary: "删除了 SDK 表面以及每个删除或弃用的 API 的替换"
read_when:
  - "删除的导出、挂钩或清单字段正在破坏您的插件"
  - "您需要更换特定的旧版 API"
title: "移除的表面和替换的表面"
sidebarTitle: "移除的表面"
---

2026 年 7 月扫描删除的内容，以及针对已删除表面和稍后窗口弃用的每 API 替换映射。 [Plugin SDK 迁移](/plugins/sdk-migration) 指南的一部分。

## <a id="removed-compatibility-surfaces"></a> 已移除的兼容性接口

2026 年 7 月的清理删除了根 SDK 和兼容桶、扩展 API 桥、过期的 SDK 子路径别名、未使用的 SDK 子路径以及对仅捆绑的 SDK 模块的类型化公共访问。私有-本地构建映射保留给存储库所有者，生产私有 JavaScript 导出支持官方插件运行时。两者都不提供类型化的第三方 SDK 访问。

### <a id="channel%2C-config%2C-and-infrastructure-compatibility-facades"></a><a id="channel-config-and-infrastructure-compatibility-facades"></a> 通道、配置和基础设施兼容性外观

`channel-lifecycle`、`channel-message`、`channel-reply-pipeline`、`config-runtime` 和 `infra-runtime` 已于 2026 年 9 月 30 日经 SDK-owner 批准删除。渠道进口转向集中出库和入库合同；配置访问使用提供的配置、快照和突变助手；基础设施导入移动到匹配的重点运行时或注入的 API。系统事件快照检查和消费使用`system-event-runtime`。

一些遗留帮助程序和命名类型需要调用者更改而不是导入路径替换。请参阅 [ 通道映射 ](/plugins/sdk-migration/import-paths#retained-channel-facade-mappings) 和 [ 配置和基础设施迁移步骤 ](/plugins/sdk-migration/how-to-migrate)。

### <a id="command%2C-discord%2C-and-telegram-account-facades"></a><a id="command-discord-and-telegram-account-facades"></a> Command、Discord 和 Telegram 帐户外观

`command-auth`、`discord` 和 `telegram-account` 已于 2026 年 10 月 2 日经 SDK-owner 明确批准删除。将发件人授权移至 `channel-ingress-runtime`，将本机命令帮助程序移至 `command-auth-native`，并将帮助构建者移至 `command-status`。 Discord 和 Telegram 行为仍归其插件所有；使用通用通道合约并从外部插件注入运行时帮助程序，以及为存储库使用者提供拥有插件的 `api.ts` / `runtime-api.ts` 桶。

这些是对仍然导入旧子路径的第三方插件的破坏性删除，包括旧发布的 `@openclaw/discord` 包。在升级主机之前升级受影响的插件。并非每个导出都有仅路径替换；请参阅 [ 每表面映射 ](/plugins/sdk-migration/import-paths#removed-command-and-channel-facades)。

### <a id="retroactively-recorded-shipped-exports"></a> 追溯记录发货出口

以下导出以 `v2026.9.8` 形式发货，并在没有兼容性窗口的情况下被删除。它们的清除记录是在 2026 年 10 月 7 日引入运输表面防护装置时追溯的；出口仍然被删除。注册表的 `removeAfter` 是删除提交落地前的 UTC 天，而不是向插件作者提供的兼容性窗口。

| 删除导出（`openclaw/plugin-sdk/` 前缀）                 | 已落地 （UTC） | `removeAfter` | 替代方案                                                                                           |
| -------------------------------------------------------------- | ------------ | ------------- | ----------------------------------------------------------------------------------------------------- |
| `allow-from.mapBasicAllowlistResolutionEntries`                | 2026-10-05   | 2026-10-04    | 没有任何；消费插件中的项目 `BasicAllowlistResolutionEntry` 字段。                         |
| `computer-use.compileComputerUseValidator`                     | 2026-10-05   | 2026-10-04    | `Compile(schema).Check` 来自 `typebox/compile`，使用导出的计算机使用架构。              |
| `extension-shared.runStoppablePassiveMonitor`                  | 2026-10-05   | 2026-10-04    | `channel-outbound.runPassiveAccountLifecycle` 与 `stop: (monitor) => monitor.stop()`。               |
| `gateway-runtime.resolveAdvertisedLanHost`                     | 2026-10-05   | 2026-10-04    | 没有任何；通告的 LAN 主机发现是主机拥有的。                                                    |
| `json-store.readJsonFileWithFallback`                          | 2026-10-05   | 2026-10-04    | 没有任何；插件中拥有自己的 JSON 工件解析、回退和文件存在处理。                 |
| `provider-auth.normalizeSecretInputModeInput`                  | 2026-10-05   | 2026-10-04    | 没有任何；将插件拥有的输入验证为导出的 `SecretInputMode` 值 `plaintext` 或 `ref`。      |
| `persistent-dedupe.PersistentDedupeLegacyJsonMigrationOptions` | 2026-10-05   | 2026-10-04    | 没有任何；旧版 JSON 迁移已停用。                                                          |
| `persistent-dedupe.PersistentDedupeLegacyJsonMigrationResult`  | 2026-10-05   | 2026-10-04    | 没有任何；旧版 JSON 迁移已停用。                                                          |
| `persistent-dedupe.listPersistentDedupeLegacyJsonFileEntries`  | 2026-10-05   | 2026-10-04    | 没有任何；旧版 JSON 迁移已停用。                                                          |
| `persistent-dedupe.migratePersistentDedupeLegacyJsonFile`      | 2026-10-05   | 2026-10-04    | 没有任何；旧版 JSON 迁移已停用。运行时重复数据删除通过 SQLite- 支持的 API 继续进行。 |
| `provider-auth.CachedCopilotToken`                             | 2026-10-02   | 2026-10-01    | 提供商本地 GitHub Copilot 身份验证 API；公众中没有SDK。                                      |
| `provider-auth.DEFAULT_COPILOT_API_BASE_URL`                   | 2026-10-02   | 2026-10-01    | 提供商本地 GitHub Copilot 身份验证 API；公众中没有SDK。                                      |
| `provider-auth.deriveCopilotApiBaseUrlFromToken`               | 2026-10-02   | 2026-10-01    | 提供商本地 GitHub Copilot 身份验证 API；公众中没有SDK。                                      |
| `provider-auth.resolveCopilotApiToken`                         | 2026-10-02   | 2026-10-01    | 提供商本地 GitHub Copilot 身份验证 API；公众中没有SDK。                                      |

前 6 个导出已在 [`2fec39f57319be5b6e0b20b5305665ed1ff5e685`](https://github.com/openclaw/openclaw/commit/2fec39f57319be5b6e0b20b5305665ed1ff5e685) 中删除。 [`bd64d93ff1ae704d13813f6580c4809ba0e76606`](https://github.com/openclaw/openclaw/commit/bd64d93ff1ae704d13813f6580c4809ba0e76606) 中删除了四个旧版 JSON 迁移导出。四个 Copilot 导出及其之前的弃用条目已在 [`f2de06b38de710854aacd19218327358445816c8`](https://github.com/openclaw/openclaw/commit/f2de06b38de710854aacd19218327358445816c8) 中删除；第三方插件必须拥有其特定于提供商的令牌交换和缓存。

### <a id="reply-silence-parsing"></a> 回复沉默解析

`isSilentReplyText` 和 `isSilentReplyPayloadText` 已从 `openclaw/plugin-sdk/reply-chunking` 中删除。确切的完整回复分类器仍然可以从 `openclaw/plugin-sdk/reply-runtime` 获取原始生产者输入。交付插件必须转发准备好的文本而不对其重新分类：文字 `NO_REPLY` 可以是可见的答案。

`SILENT_REPLY_TOKEN` 也从 `openclaw/plugin-sdk/reply-chunking` 中删除。从现有的 `openclaw/plugin-sdk/reply-runtime` 导出中导入它：

```ts
import { SILENT_REPLY_TOKEN } from "openclaw/plugin-sdk/reply-runtime";
```

harness生产者在原始最终文本上使用 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `prepareAgentRunTerminalReply` 一次，然后渲染返回的文本并发布匹配的终端事实。提供完整的返回文本而不是有界的 `terminalReply.text` 快照。完全大写的 `NO_REPLY`，忽略周围的空白，请求静音；标点符号、引号、JSON 和散文则没有。文字前导 `NO_REPLY\n` 会删除一行，而不会对后缀重新分类。参见[无声回复](/concepts/messages#silent-replies)。

### <a id="tool-argument-redaction"></a> 工具参数编辑

作为维护者批准删除自动工具参数和结果屏蔽的一部分，`sanitizeToolArgs` 于 2026 年 10 月 11 日从 `openclaw/plugin-sdk/agent-harness-runtime` 中删除。删除其导入并按原样传递参数。没有替代或兼容性屏蔽路径。日志记录和诊断编辑助手仍然可用。

### <a id="process-global-api-provider-publication"></a> Process-global API-provider 出版物

`registerApiProvider(...)` 和 `unregisterApiProviders(...)` 已从 `openclaw/plugin-sdk/llm` 中移除。它们会将 API 传输发布到进程全局状态中，而由生命周期管理的模型运行时随后必须将这些传输复制到每个已准备好的注册表中。

提供者插件应通过 `api.registerProvider(...)` 注册文本推理提供者。构造 `ApiRegistry` 的宿主代码和测试应直接在该注册表上进行注册，以便提供者的所有权和清理范围保持在已准备好的运行时内。

### <a id="deactivate-hook-alias"></a> deactivate 钩子别名

`api.on("deactivate", handler)` 兼容性别名已移除。请使用 `gateway_stop` 注册相同的关闭清理逻辑：

```typescript
// Before
api.on("deactivate", async (event, ctx) => {
  await stopPluginService(ctx);
});

// After
api.on("gateway_stop", async (event, ctx) => {
  await stopPluginService(ctx);
});
```

### <a id="skill-workshop-proposal-hooks"></a> 技能工坊提案挂钩

`skill_proposal_evaluate` 和 `skill_proposal_changed` 挂钩与技能研讨会提案一起被删除。 Workshop 现在立即应用每个更改并保留可恢复的版本，因此没有待评估的待定草案，也没有要观察的提案生命周期。删除了 hook runner 方法 `runSkillProposalEvaluate` 和 `runSkillProposalChanged`，并且 `openclaw/plugin-sdk/plugin-entry` 不再导出 `PluginHookSkillProposalEvaluateEvent`、`PluginHookSkillProposalEvaluateResult`、`PluginHookSkillProposalEvaluationOutcome`、`PluginHookSkillProposalChangedEvent`、`PluginHookSkillProposalKind`、 `PluginHookSkillEvaluationFinding`、`PluginHookSkillBundleFile` 或 `PluginHookSkillBundleSnapshot`。 `PluginHookSkillChangedEvent` 上的可选 `proposal` 字段也被删除。

要观察提交的 Workshop 技能写入，请注册 `skill_changed` 并在 `source: "workshop"` 上进行筛选。预申请评估是无可替代的。注册已删除的挂钩名称会记录 `unknown typed hook` 警告，并且处理程序永远不会运行。

### <a id="private-testing-barrel"></a> 私有测试 barrel

`openclaw/plugin-sdk/testing` 仅限仓库本地使用，并且被排除在已发布的软件包构件之外，因此在其 2026-07-28 的 `removeAfter` 日期之前被移除。仓库测试使用诸如 `plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、 `plugin-sdk/channel-target-testing`、`plugin-sdk/test-env` 和 `plugin-sdk/test-fixtures` 等专用子路径。

### <a id="credential-prompt-builder"></a> 凭证提示生成器

`buildCredentialSafetyPrompt` 仍可从 `openclaw/plugin-sdk/agent-harness-runtime` 购买。通过可调用 `openclaw` 和 `gateway` 工具设置 `controlToolsAvailable` 的选项对象，它会返回根据要求使用或存储用户共享凭据的指导，完成任务，并在最终回复中简要确认其使用或存储，而无需重复其值。该承认仍然是事实且不令人担忧。当两个控制工具都不可用时，它还会返回私有登录代码切换指南和终端设置路线。

旧字符串参数从 2026 年 9 月 9 日起已弃用，但到 2026 年 11 月 30 日仍受支持。它被接受并被忽略：可用性未知，因此助手仅返回专用切换线路。将字符串替换为 `{ controlToolsAvailable }`；从 2026 年 12 月 1 日开始，字符串形式可以被删除。助手本身并没有被弃用。

## <a id="migration-reference"></a> 迁移参考

这些映射涵盖了 2026 年 7 月删除的表面和稍后窗口活动弃用的表面。映射是迁移指导，而不是旧表面仍然可用的证据；请查阅兼容性注册表和删除时间表以了解当前状态。

<AccordionGroup>
  <Accordion id="command-auth-help-builders-command-status" title="command-auth help builders -> 命令状态">
    **旧** (`openclaw/plugin-sdk/command-auth`)：`buildCommandsMessage`、 `buildCommandsMessagePaginated`、`buildHelpMessage`。

    **新** (`openclaw/plugin-sdk/command-status`)：签名相同，但从更精简的子路径导入。`command-auth` 的兼容性重新导出已被移除。

    ```typescript
    // Before
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // After
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="Mention gating helpers ->resolveInboundMentionDecision">
    **Old**：来自 `openclaw/plugin-sdk/channel-inbound` 或 `openclaw/plugin-sdk/channel-mention-gating` 的 `resolveMentionGating(params)` 和 `resolveMentionGatingWithBypass(params)`。

    **新**：`resolveInboundMentionDecision({ facts, policy })` —— 使用一个决策对象，而不是两种拆分的调用形式。

    已应用于 Discord、iMessage、Matrix、MS Teams、QQBot、Signal、 Telegram、WhatsApp 和 Zalo。Slack 自身的 `app_mention` 事件模型不使用此辅助函数。

  </Accordion>

  <Accordion id="channel-runtime-shim-and-channel-actions-helpers" title="通道运行时垫片和通道操作助手">
    `openclaw/plugin-sdk/channel-runtime` 已被移除。注册运行时对象时，请使用 `openclaw/plugin-sdk/channel-runtime-context`。

    `openclaw/plugin-sdk/channel-actions` 中的原生消息 schema 辅助函数已随原始“actions”通道导出一并移除。请改为通过语义化的 `presentation` 接口暴露能力——通道插件声明它们渲染的内容（卡片、按钮、选择器），而不是声明它们接受哪些原始操作名称。

  </Accordion>

  插件上的 <Accordion id="web-search-provider-tool-helper-createtool-on-the-plugin" title="Web search provider tool() helper -> createTool（）">
    **Old**：`tool()` 工厂来自 `openclaw/plugin-sdk/provider-web-search`。

    **新**：直接在 provider 插件上实现 `createTool(...)`。 OpenClaw 不再需要 SDK 辅助工具来注册工具包装器。

  </Accordion>

  <Accordion title="Plaintext channel envelopes -> BodyForAgent">
    **旧**：使用 `api.runtime.channel.reply.formatInboundEnvelope(...)`（以及入站消息对象上的 `channelEnvelope` 字段），从入站通道消息构建扁平的纯文本提示信封。

    **新**：使用 `BodyForAgent` 加上结构化的用户上下文块。通道插件将路由元数据（线程、主题、回复目标、反应）作为类型化字段附加，而不是将其拼接到提示字符串中。`formatAgentEnvelope(...)` 辅助函数仍支持为面向 assistant 的合成信封提供服务，但入站纯文本信封即将退出。

    受影响的区域：`inbound_claim`、`message_received`，以及任何对旧信封文本进行后处理的自定义通道插件。

  </Accordion>

  <Accordion id="subagent-spawning-hook-core-thread-binding" title="subagent_spawning hook -> 芯线装订">
    **旧**：`api.on("subagent_spawning", handler)` 返回 `threadBindingReady` 或 `deliveryOrigin`。

    **新**：让核心通过通道会话绑定适配器准备 `thread: true` 的子 agent 绑定。仅使用 `api.on("subagent_spawned", handler)` 进行启动后的观察。

    ```typescript
    // Before
    api.on("subagent_spawning", async () => ({
      status: "ok",
      threadBindingReady: true,
      deliveryOrigin: { channel: "discord", to: "channel:123", threadId: "456" },
    }));

    // After
    api.on("subagent_spawned", async (event) => {
      await observeSubagentLaunch(event);
    });
    ```

    在线程绑定移至核心会话绑定路径后，`subagent_spawning` 挂钩及其 event/result 类型于 2026 年 8 月被删除。

  </Accordion>

  <Accordion id="provider-discovery-types-provider-catalog-types" title="Provider discovery types -> 提供商目录类型">
    四个发现类型别名现在是 catalog 时代类型的薄封装：

    | 旧别名                 | 新类型                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    这些别名以及旧版的 `ProviderCapabilities` 静态容器已被移除。Provider 插件应使用明确的 provider 钩子，例如 `buildReplayPolicy`、 `normalizeToolSchemas` 和 `wrapStreamFn`，而不是使用静态对象。

  </Accordion>

  <Accordion id="thinking-policy-hooks-resolvethinkingprofile" title="Thinking policy hooks -> 解决ThinkingProfile">
    **旧**（`ProviderThinkingPolicy` 上的三个独立钩子）： `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)` 和 `resolveDefaultThinkingLevel(ctx)`。

    **New**：单个 `resolveThinkingProfile(ctx)`，返回 `ProviderThinkingProfile` 以及标准 `id`、可选 `label` 和排名级别列表。 OpenClaw 在执行期间按配置文件等级钳制不支持的请求，从而保留跨模型切换的存储首选项。

    上下文包含 `provider`、`modelId`、可选合并的 `reasoning`， 以及可选合并的模型 `compat` 事实。Provider 插件可以使用这些 catalog 事实，仅在配置的请求契约支持时暴露模型特定的 profile。

    实现一个钩子，而不是三个。旧钩子已被移除。

  </Accordion>

  <Accordion title="External auth providers -> contracts.externalAuthProviders">
    **旧**：实现外部 auth 钩子，但未在插件清单中声明 provider。

    **新**：在插件清单中声明 `contracts.externalAuthProviders` **并且**实现 `resolveExternalAuthProfiles(...)`。

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider env-var lookup -> setup.providers[].envVars">
    **旧**清单字段：`providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`。

    **New**：将相同的环境变量查找镜像到清单上的 `setup.providers[].envVars` 中。这将 setup/status env 元数据合并到一处，并避免仅仅为了回答 env-var 查找而启动插件运行时。

    `providerAuthEnvVars` 不再被接受。

  </Accordion>

  <Accordion id="memory-plugin-registration-registermemorycapability" title="Memory plugin registration -> 注册内存能力">
    **旧**：三个独立调用——`api.registerMemoryPromptSection(...)`、 `api.registerMemoryFlushPlan(...)`、`api.registerMemoryRuntime(...)`。

    **新**：在 memory-state API 上一次调用： `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`。

    槽位保持不变，但改为单次注册调用。增量式提示和语料辅助工具 (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`) 不受影响。

  </Accordion>

  <Accordion id="memory-embedding-provider-api" title="内存嵌入提供商 API">
    **旧**：`api.registerMemoryEmbeddingProvider(...)` 加上 `contracts.memoryEmbeddingProviders`。

    **新**：`api.registerEmbeddingProvider(...)` 加上 `contracts.embeddingProviders`。

    通用嵌入提供程序合约可在外部内存中重用，并且是每个提供程序支持的路径。在 **2026-08-21** 迁移截止日期后，删除了特定于内存的注册 API 和清单合同。

  </Accordion>

  <Accordion title="Raw channel send results -> OutboundDeliveryResult">
    **Old**：通过`ChannelSendRawResult`返回`{ ok, messageId, error }`，并用`createRawChannelSendResultAdapter(...)`对其进行归一化。

    **New**：返回`OutboundDeliveryResult`字段并将通道附加到`createAttachedChannelResultAdapter(...)`。发送失败应该抛出异常而不是返回错误字符串。将平台目标放入`target: { kind: "chat" | "channel" | "room" | "conversation", id }`；不再接受旧的并行 `chatId`、`channelId`、`roomId` 和 `conversationId` 结果字段。原始结果类型仍然可用，直到其单独宣布的普通稳定删除版本为止。

  </Accordion>

  <Accordion id="subagent-session-messages-types-renamed" title="重命名的子代理会话消息类型">
    两个旧版类型别名仍从 `src/plugins/runtime/types.ts` 导出：

    | 老的                           | 新的                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    运行时方法 `readSession` 已弃用，建议改用 `getSessionMessages`。签名相同；旧方法会转调新方法。

  </Accordion>

  <Accordion id="removed-session-and-transcript-file-apis" title="删除了会话和转录文件 API">
    SQLite session/transcript 翻转删除或弃用了暴露活动 `sessions.json` 存储、JSONL 转录路径或会话文件列表的面向插件的 API。运行时插件应使用会话标识和 SDK 运行时帮助程序，而不是解析或更改活动文件。

    | 迁移接口 | 替代方案 |
    | ----------------- | ----------- |
    | 删除了 `loadSessionStore(...)` 和 `resolveSessionStoreEntry(...)`，包括包根 `loadSessionStore(...)` | `await getSessionEntryAsync(...)` 表示一个作用域行，或 `await listSessionEntriesAsync(...)` 表示来自 `openclaw/plugin-sdk/session-store-runtime` 的作用域元数据迭代。 |
    | 删除了 `updateSessionStore(...)`、包根 `saveSessionStore(...)` 和 SDK 文件存储写入 | `patchSessionEntry(...)`、`upsertSessionEntry(...)` 和 `deleteSessionEntry(...)` 来自 `openclaw/plugin-sdk/session-store-runtime`；仅改变预期的行，而不是替换分离的整个存储快照。 |
    | 删除了 `LoadSessionStoreOptions` 和 `UpdateSessionStoreOptions` | 作用域行 API 接受的参数；全商店缓存和回调选项不再适用。 |
    | 删除了 `resolveSessionFilePath(...)` | 具有 `openclaw/plugin-sdk/session-transcript-runtime` 的会话标识（`agentId`、`sessionKey` 和 `sessionId`）或在当前会话上运行的网关方法。 |
    | 已移除的 `resolveSessionTranscriptPathInDir(...)` 和 `resolveAndPersistSessionFile(...)` | 会话身份，以及操作当前会话的 Gateway 方法。 |
    | `readLatestAssistantTextFromSessionTranscript(...)` | 当插件位于转录本所有者路径之外时，由当前运行时上下文或网关 history/session 方法公开的身份支持转录本读取器。 |
    | `SessionTranscriptUpdate.sessionFile` | `SessionTranscriptUpdate.target` 与 `agentId`、`sessionKey` 和 `sessionId`。 |
    | 内存同步输入，例如 `sessionFiles` | 主机提供的身份支持的 transcript/session 源；不要对实时会话的活动 JSONL 文件进行爬网。 |
    | 用于活动会话的名为 `transcriptPath` 或 `sessionFile` 的运行时选项 | `sessionTarget`/runtime 携带存储中立会话标识的目标对象。 |

    旧版 JSONL transcript 文件仍可作为导入、归档、导出和支持工件使用。但它们不再是活动会话的稳态运行时契约。

    与 `v2026.7.1-beta.5` 一起发布的官方 `@openclaw/codex` 和 `@openclaw/feishu` 插件导入了已退役的桥。 SDK-owner 于 2026 年 9 月 30 日获得批准，提前关闭了其兼容性窗口，取代了之前的 10 月 12 日截止日期。支持的插件截止排除了该版本以及仍在导入桥的任何其他包。在升级 OpenClaw 之前，将受影响的插件升级到使用替换版本的版本。仅较新的版本号并不能证明迁移。

    `openclaw/plugin-sdk/session-store-runtime` 和 `resolveStorePath(...)` 仍受支持。将选定的 `agentId` 显式传递给作用域行操作；解析路径不再记录稍后全店呼叫的座席选择。此删除不会更改 SQLite 架构或旧状态导入和 Doctor 迁移。

    `openclaw plugins inspect --all --runtime` 报告非捆绑插件，其加载错误或诊断仍然引用这些已删除的文件 API。 `@openclaw/plugin-inspector` 咨询扫描必须使用版本 `0.3.17` 或更新版本，因此外部包扫描还会在发布之前标记整个存储会话帮助程序、会话文件路径帮助程序、旧副本文件目标和低级副本帮助程序。

  </Accordion>

  <Accordion id="agent-harness-attempt-params-v2-host-capability-contract" title="Agent harness attempt params -> V2 主机能力合约">
    新建或更新的 harness 插件应实现 `AgentHarnessV2`，并使用 `AgentHarnessAttemptParamsV2`、`EmbeddedRunAttemptParamsV2` 或 `AgentHarnessSideQuestionParamsV2`。V2 参数类型要求包含 `hostCapabilities`，与核心在选定 harness 边界处提供的内容一致。采用这些 V2 契约的插件必须在其包清单中声明 `openclaw.compat.pluginApi: ">=2026.8.1"`（或更高的最低版本），以便旧版宿主在加载插件前拒绝该插件。

    现有插件可以继续实现 `AgentHarness`，并在 2026-10-12 之前构造不含该字段的 `AgentHarnessAttemptParams`、`EmbeddedRunAttemptParams` 或 `AgentHarnessSideQuestionParams` 类型。这些契约仅为保持源码兼容性而使能力字段可选；它们不会创建无能力的运行时路径。迁移时，请更改导入的类型名称，并通过 `params.hostCapabilities` 绑定工具或原生操作接口。

  </Accordion>

  <Accordion id="tasks-and-taskflow-apis-removed" title="任务和 TaskFlow API 已删除">
    任务注册表和 TaskFlow 编排 API 已被删除，包括 `api.runtime.tasks`、`registerDetachedTaskRuntime` 和 `agent-harness-task-runtime` SDK 子路径。不存在兼容性外观。使用本机子代理 launch/wait/history API、cron 运行历史记录和普通 Lobster 运行程序来执行各自的操作。harness完成路由使用仅完成 `agent-harness-completion` 子路径。此删除不会更改物理数据库架构。现有的 `task_runs`、`task_delivery_state` 和 `flow_runs` 表、列和索引保持不变。 Cron 仅读取和写入 `task_runs` 中的 `runtime = 'cron'` 历史记录行；非 Cron 任务和 TaskFlow 行保持不变，并且不被运行时使用。 Codex 插件的 [Doctor 迁移](/gateway/doctor/config-migrations#native-codex-recovery-after-tasks-removal) 在现有父绑定元数据中保留合格的所有者标记的本机恢复事实，使源行字节相同。它不添加运行时任务读取器或替换 SDK 表面；当前的请求者权限仍然控制完成交付。请参阅 [ 版本控制合约 ](/reference/database-schemas/versioning)。
  </Accordion>

  <Accordion id="embedded-extension-factories-agent-tool-result-middleware" title="Embedded extension factories ->代理工具-结果中间件">
    [ 中介绍了如何迁移](/plugins/sdk-migration/how-to-migrate#how-to-migrate)。为了完整起见，此处包含：已删除的仅限嵌入式运行程序的 `api.registerEmbeddedExtensionFactory(...)` 路径由 `api.registerAgentToolResultMiddleware(...)` 替换，并在 `contracts.agentToolResultMiddleware` 中包含显式运行时列表。
  </Accordion>

  <Accordion title="OpenClawSchemaType alias -> OpenClawConfig">
    `OpenClawSchemaType` root-SDK 别名已删除。使用主 `OpenClawConfig` 名称。

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
    ```

  </Accordion>
</AccordionGroup>

<Note>
扩展级弃用（在 `extensions/` 下捆绑的 channel/provider 插件内）在其自己的 `api.ts` 和 `runtime-api.ts` 桶内进行跟踪。它们不影响第三方插件合约，因此未在此处列出。如果您直接使用捆绑插件的本地桶，请在升级之前阅读该桶中的弃用注释。
</Note>
