---
summary: "通道插件的会话对话语法、对话路由所有权和帐户范围的对话绑定支持"
read_when:
  - "您的平台在对话 ID 中存储额外的范围"
  - "您需要拥有频道的对话路由解析"
  - "您正在控制每个帐户的当前对话绑定"
title: "通道会话和绑定"
sidebarTitle: "会话和绑定"
---

将提供商对话 ID 映射到 OpenClaw 会话，并拥有与其相关的路由和绑定规则。 [构建频道插件](/plugins/sdk-channel-plugins)指南的一部分。

## <a id="session-conversation-grammar"></a> Session会话语法

如果您的平台在对话 ID 中存储额外的范围，请使用 `messaging.resolveSessionConversation(...)` 将该解析保留在插件中。这是将 `rawId` 映射到基本会话 id、可选线程 id、显式 `baseConversationId` 和任何 `parentConversationCandidates` 的主要挂钩。当您返回 `parentConversationCandidates` 时，将它们从最窄的父级排序到 broadest/base 会话。

`messaging.resolveParentConversationCandidates(...)` 是一个已弃用的兼容性回退，适用于只需要 generic/raw id 之上的父回退的插件。如果两个钩子都存在，则核心首先使用 `resolveSessionConversation(...).parentConversationCandidates`，并且仅当主钩子忽略它们时才回退到 `resolveParentConversationCandidates(...)`。

需要在 channel registry 启动之前完成同样解析的捆绑插件，可以提供一个顶层 `session-key-api.ts` 文件，并导出匹配的 `resolveSessionConversation(...)`（参见 Feishu 和 Telegram 插件）。只有在运行时插件 registry 还不可用时，core 才会使用这个启动安全的接口。

当插件代码需要标准化类似路由的字段、将子线程与其父路由进行比较或从 `{ channel, to, accountId, threadId }` 构建稳定的重复数据删除密钥时，请使用 `openclaw/plugin-sdk/channel-route`。帮助程序以与核心相同的方式标准化数字线程 ID，因此比临时 `String(threadId)` 比较更喜欢它。具有特定于提供者的目标语法的插件应公开 `messaging.resolveOutboundSessionRoute(...)`，以便核心无需解析器填充程序即可获取提供者本机会话和线程身份。

所有者派生的心跳路由将 `deliveryPurpose: "heartbeat-owner"` 传递到此解析器。插件可以使用它来解决丢失的接线员传递上下文，而无需放松其他出站呼叫者的目标要求。

## <a id="conversation-route-ownership"></a> 会话路由所有权

当通用路由匹配无法重现通道的配置和运行时绑定规则时，实施 `messaging.prepareConversationRouteOwnersAsync(...)`。准备接收一系列当前配置、帐户和记录的对话身份，包括与路由对等点不同时的传递 `target`。等待 `inspectBindings(refs)` 在工作线程中准备绑定事实，然后为每个输入返回一个同步解析器。在每个解析器内调用返回的绑定读取器，以便提交的更改在生效之前使所有权无效。使用与入站路由相同的优先级和提供商身份语法。

解析器是只读的。不要刷新绑定活动、执行网络请求或推断缺失的提供者事实。返回：

- `{ kind: "agent", agentId }` 为代理拥有的路由。
- `{ kind: "plugin", pluginId, fallbackAgentId }` 用于插件拥有的运行时绑定。 `fallbackAgentId` 是当该插件没有活动的入站声明处理程序时使用的路由。
- `{ kind: "unavailable" }` 当权威所有者状态暂时不可用且调用者应重试时。
- `null` 当提供的身份无效或无法授权时，包括已删除或禁用的帐户。该帐户保留的对话历史记录不得导致活动帐户列表失败。
- `undefined` 委托给核心的通用所有者解析。

保持临时不可用性与 `null` 不同：适配器重新启动并不能证明先前绑定的会话是无主的。使用 `inspectConversationBindingAsync(...)` 及其 `ConversationBindingInspection` 从 `openclaw/plugin-sdk/conversation-binding-inspection-runtime` 的结果来区分路由准备之外的 available/unavailable。此公共检查助手是只读的，不会刷新绑定活跃度。当插件迁移到异步准备时，同步 `inspectConversationBinding` 和 `resolveConversationRouteOwner` API 仍保持已弃用的兼容性。未发布的同步`prepareConversationRouteOwners`钩子已被移除；参见[绑定迁移](/plugins/sdk-migration/how-to-migrate#await-plugin-state-and-conversation-bindings)。

## <a id="account-scoped-conversation-binding-support"></a> 帐户范围的对话绑定支持

当通道支持通用当前对话绑定时，设置 `conversationBindings.supportsCurrentConversationBinding`。 `createChatChannelPlugin(...)` 默认将此静态能力设置为 `true`。其显示器拥有自定义绑定适配器的通道也必须设置 `bindingStore: "adapter"`；然后，当该适配器不可用时，核心会阻止绑定操作，而不是读取或写入通用绑定行。较旧的 `createManager`-only 插件保留相同的适配器拥有的行为。

如果支持情况因已配置账号而异，还应实现 `conversationBindings.isCurrentConversationBindingSupported({ accountId })`。core 只有在静态能力启用后才会评估这个同步 hook。返回 `false` 会使该账号不可用通用的当前会话能力、bind、lookup、list、touch 和 unbind 操作。省略该 hook 则会把静态能力应用于每个账号。

从已加载的帐户配置或运行时状态解析答案。该钩子仅控制通用的当前会话绑定；它不会取代配置的绑定规则或插件拥有的会话路由。合约测试应通过 `openclaw/plugin-sdk/channel-core` 导出的 `ChannelPlugin["conversationBindings"]` 合约覆盖至少 1 个支持的账户和 1 个不支持的账户。

绑定 ID 是频道和帐户本地的。 `SessionBindingService.touchAsync(bindingId, at?, scope?)` 和 `unbind({ bindingId, reason, scope })` 接受可选的 `{ channel, accountId }` 范围来选择该所有者。对于单个突变，传递现有绑定的 `conversation` 作为范围。例如，要分离已解析的绑定：

```ts
await getSessionBindingService().unbind({
  bindingId: binding.bindingId,
  scope: binding.conversation,
  reason: "manual",
});
```

从 `openclaw/plugin-sdk/session-binding-runtime` 导入 `getSessionBindingService`。如需活动更新，请等待 `service.touchAsync(binding.bindingId, at, binding.conversation)`。仅针对有意的​​全局清理或现有的遗留跨渠道操作省略范围。范围不会更改绑定 ID 或需要新的适配器方法。

刷新相同的目标会话和目标类型会保留省略的运行时元数据。替换都会启动新的目标元数据，因此新会话无法继承以前的插件所有者、代理或标签。将对话传输详细信息和显式生命周期设置与目标元数据分开。

使用 `openclaw/plugin-sdk/thread-bindings-session-runtime` 中的 `resolveThreadBindingLifecycle(...)` 进行标准空闲和最大期限到期。具有不同旧版时间戳合约的插件可以将准备好的 `inactivityExpiresAt` 和 `maxAgeExpiresAt` 值传递到同一子路径上的 `resolveThreadBindingExpiry(...)`。它选择较早的截止日期及其原因，更喜欢关系的空闲到期；省略的最后期限将被禁用。该插件仍然拥有时间戳验证和持续时间默认值。

在同一子路径上，`projectThreadBindingRecord(...)` 项目准备了对话身份和过期时间，并具有显式元数据合并回调。 `createAccountScopedBindingAdapter(...)` 共享以帐户为前缀的绑定 ID 的列表、解析、触摸和解绑调度。该插件的管理器仍然拥有存储、突变许可和结算、子项创建和关闭。具有不同身份语法的平台，例如Matrix家长房间密钥，可以在没有帐户前缀适配器的情况下使用投影。

投影绑定记录时保留不透明的插件所有权元数据。插件拥有的目标不需要 OpenClaw 代理 ID；在解析代理之前，使用 `openclaw/plugin-sdk/conversation-binding-runtime` 中的 `isPluginOwnedSessionBindingRecord(...)` 将它们与代理拥有的目标区分开来。

对于具有无范围会话密钥（例如 `global`）的代理拥有的目标，请保留 `metadata.agentId`，以便路由保留绑定的所有者。代理范围的目标密钥对于冲突的元数据仍然具有权威性。
