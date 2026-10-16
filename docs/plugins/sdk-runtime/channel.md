---
summary: "用于分块、路由、配对、媒体和提及的特定于通道的运行时帮助程序组"
read_when:
  - "您正在构建或维护频道插件"
  - "您需要频道媒体下载、提及策略或入站内核帮助程序"
title: "插件运行时通道助手"
sidebarTitle: "渠道助手"
---

通道特定的运行时助手，在加载通道插件时可用。 [Plugin 运行时助手](/plugins/sdk-runtime) 参考的一部分； [频道插件](/plugins/sdk-channel-plugins) 是分步指南。

## <a id="channel-namespaces"></a> 频道命名空间

<AccordionGroup>
  <Accordion title="api.runtime.channel">
    Channel 特定的运行时辅助工具（加载 channel 插件时可用）。按关注点分组：

    | 团体 | 用途 |
    | --- | --- |
    | `text` | 分块（`chunkText`、`chunkMarkdownText`、`resolveChunkMode`）、控制命令检测、Markdown 表格转换。 |
    | `reply` | 缓冲块回复调度、信封格式化、有效的 messages/human-delay 配置解析。 |
    | `routing` | `buildAgentSessionKey`, `resolveAgentRoute`. |
    | `pairing` | `buildPairingReply`、白名单 reads/removals、配对请求更新插入以及请求派生的批准条目。 |
    | `media` | 远程媒体 download/save（见下文）。 |
    | `activity` | Record/read 最后通道活动。 |
    | `session` | 从入站事件获取会话元数据、更新最近路由。 |
    | `mentions` | 提及策略辅助工具（见下文）。 |
    | `reactions` | 用于正在进行的处理指示器的确认反应句柄。 |
    | `groups` | 群组策略和需提及解析。 |
    | `debounce` | 入站消息去抖。 |
    | `commands` | 命令授权和文本命令门控。 |
    | `outbound` | 加载 channel 的出站适配器。 |
    | `inbound` | 使用主机绑定的 `ingress` 帮助程序解决入口问题，构建入站事件上下文，并运行共享的入站 event/reply 内核。 |
    | `threadBindings` | 调整绑定会话线程的idle-timeout/max-age。 |
    | `runtimeContexts` | 注册、读取和监视每个 channel/account/capability 的进程本地上下文。 |

    `api.runtime.channel.media` 是 channel 媒体下载和存储的首选接口：

    ```typescript
    const saved = await api.runtime.channel.media.saveRemoteMedia({
      url,
      subdir: "inbound",
      maxBytes,
      filePathHint: fileName,
    });
    ```

    当远程 URL 应成为 OpenClaw 媒体时，请使用 `saveRemoteMedia(...)`。当插件已通过插件拥有的身份验证、重定向或白名单处理获取 `Response` 时，请使用 `saveResponseMedia(...)`。仅当插件需要原始字节进行检查、转换、解密或重新上传时才使用 `readRemoteMediaBuffer(...)`。 `fetchRemoteMedia(...)` 仍然是 `readRemoteMediaBuffer(...)` 的已弃用兼容性别名，在 [ 兼容性注册表中跟踪为 `plugin-runtime-api-compat-aliases` ](/plugins/compatibility#current-compatibility-areas)，`removeAfter` 日期为 2026 年 10 月 1 日。

    对于不成功的 HTTP 响应，媒体错误会报告状态并包括可用的有界正文摘录。丢弃的错误正文不会报告为空上游响应。没有正文的成功响应仍会被视为空媒体而被拒绝。

    远程媒体选项和 `openclaw/plugin-sdk/ssrf-runtime` 中的 `fetchWithSsrFGuard(...)` 接受同步 `beforeRequest` 回调以进行最​​终调度授权检查。它在代理、DNS 和调度程序准备之后以及每个物理请求之前立即运行。重定向每跳调用一次；媒体重试会在每次尝试和跳跃时再次调用它。如果抛出异常，则不会发送该请求并且会传播相同的错误。承诺或可实现的结果在运输调度之前被拒绝。

    对于 `saveRemoteMedia(...)`，当读取主体正在下载时可能会失去权限时，传递同步 `assertCurrent` 回调。媒体所有者将其与任何封闭的读取范围结合起来，并通过请求、流式传输和本地文件发布重新检查它，并在失败时清除未接受的文件。也可使用 `requestInit.signal` 进行前向取消。省略 `assertCurrent` 保留现有行为； `beforeRequest` 仍然是每个请求的钩子而不是文件发布防护。

    受保护的提取还接受同步 `resolveDispatcherPolicy(url)` 覆盖，为每个重定向重新评估。未定义的结果使用 `dispatcherPolicy`，或在未提供默认策略时使用直接路由。保留运营商配置的代理路由的提供商可以使用 `openclaw/plugin-sdk/fetch-runtime` 中的 `resolveEnvHttpProxyAgentOptions` 和 `matchesNoProxy` 来选择每个跃点。 `trusted_explicit_proxy` 模式允许 HTTP、HTTPS、`socks:` 和 `socks5:` 代理 URL，并将目标 DNS 委托给显式信任的代理；代理主机验证和目标主机策略仍然适用。直接跳跃保持 DNS 固定。严格模式拒绝 SOCKS 代理，并且单独的 trust-env-proxy 门仍然仅 HTTP（S）。

    返回流式传输的受保护响应时，使用 `openclaw/plugin-sdk/fetch-runtime` 中的 `responseWithRelease(response, release)` 来保留请求所有权，直到其主体完成、失败或取消。明确消耗或取消主体以立即释放；废弃包装器的垃圾收集仅提供尽力清理。

    受保护的提取接受 `streamTimeoutMs`，因为 header/body 不活动，独立于整个请求 `timeoutMs`；当两者都提供时，`timeoutMs` 优先。现有的 `createPinnedDispatcher` 帮助器也接受 `streamTimeoutMs` 作为其第五个参数。这些流设置保留 TCP/TLS 连接截止时间，并在省略时默认为现有传输策略。

    `api.runtime.channel.mentions` 是使用运行时注入的捆绑 channel 插件共享的入站提及策略接口：

    ```typescript
    const mentionMatch = api.runtime.channel.mentions.matchesMentionWithExplicit(text, {
      mentionRegexes,
      mentionPatterns,
    });

    const decision = api.runtime.channel.mentions.resolveInboundMentionDecision({
      facts: {
        canDetectMention: true,
        wasMentioned: mentionMatch.matched,
        implicitMentionKinds: api.runtime.channel.mentions.implicitMentionKindWhen(
          "reply_to_bot",
          isReplyToBot,
        ),
      },
      policy: {
        isGroup,
        requireMention,
        allowTextCommands,
        hasControlCommand,
        commandAuthorized,
      },
    });
    ```

    可用的提及辅助工具：

    - `buildMentionRegexes`
    - `matchesMentionPatterns`
    - `matchesMentionWithExplicit`
    - `implicitMentionKindWhen`
    - `resolveInboundMentionDecision`

    使用规范化的 `{ facts, policy }` 路径进行提及决策。

    `reply`、`session` 和 `inbound` 下的几个字段携带每个字段 `@deprecated` 注释，指向当前通道轮换内核或通道出站适配器；在构建新代码之前，检查特定帮助器上的内联 JSDoc。它们共享相同的 `plugin-runtime-api-compat-aliases` 注册表记录和 `removeAfter` 日期 2026-10-01。

  </Accordion>
</AccordionGroup>

回复选项接受 `onVisibleWorkSessions(sessions)` 以接收可见的工作会话。对于通过本地网关创建的新子级，主机在子级第一次轮流之前等待此回调，因此插件可以首先保留会话范围的上下文。在最终答复交付之前还会报告已接受的会话，包括当已解决的运行失败时。每个描述符携带`sessionKey`、会话`url`和可选的`label`。可以在创建时报告孩子，并在定居时再次报告；消费者必须通过会话密钥实现幂等。

## <a id="awaited-conversation-binding-mutations"></a> Awaited 对话绑定突变

从 `openclaw/plugin-sdk/conversation-binding-runtime` 导入路由和服务助手。

在发布绑定更改之前等待 `service.bind(input)` 和 `service.unbind(input)`。当前会话持久性使用现有的工作人员所有者并在提交之前重新检查所选的适配器。失败或不确定的写入不会授权重播。已发布的同步选择器保留其当前合约；捆绑的会话列表等待内部所有者。

对于目录所有权检查，请实施 `messaging.prepareConversationRouteOwnersAsync(inputs, inspectBindings)`。等待提供的 `inspectBindings(refs)` 一次，以便批次在工人中准备有约束力的事实。它返回这些事实的同步读取器。以相同的顺序为每个输入返回一个同步解析器，并在每个解析器内调用读取器，以便进程内写入收据在生效之前使所有权无效。核心保留解析器的错误和回退处理，并在操作结束时释放准备好的事实；请勿保留阅读器以供后续操作。

已发布的同步 `resolveConversationRouteOwner` 挂钩在插件迁移时仍保持已弃用的兼容性。未发布的同步 `prepareConversationRouteOwners` 钩子已被删除。请参见 [ 绑定迁移](/plugins/sdk-migration/how-to-migrate#await-plugin-state-and-conversation-bindings)。

记录绑定活动时等待 `getSessionBindingService().touchAsync(bindingId, at, scope)`。适配器实现 `touchAsync` 以返回解决其接受的突变的 Promise。异步调度更喜欢该方法并传播其失败；它不会同时调用旧版 `touch`。在调用每个选定的适配器之前，调度会检查其注册是否仍然是最新的。它会跳过已退役的注册，而不采用其替代者。

使用 `resolveRuntimeConversationBindingRouteAsync` 进行记录活动的路由。它等待选定的突变，然后在返回其路由之前重新检查当前绑定。使用 `await service.inspectByConversationAsync(conversation)` 准备所有权事实，然后将这些事实传递给 `inspectRuntimeConversationBindingRoute({ route, inspection })`。此同步投影不执行存储访问。检查保留了丢失的绑定和不可用的适配器之间的区别，而无需创建丢失的存储或修剪过期的行。

`inspectRuntimeConversationBindingRoute` 和同步 `resolveRuntimeConversationBindingRoute` 还接受延迟的 `resolveRoute` 回调，而不是已完成的 `route`。恰好通过 `route` 或 `resolveRoute` 之一；输入类型拒绝提供两者或都不提供。现有呼叫者可以继续通过已完成的路线。所有者对绑定进行分类后，在普通代理选择之前，回调收到 `{ inspection, bindingOwnerAvailable, bindingRecord, boundAgentId }`：

```ts
const result = inspectRuntimeConversationBindingRoute({
  inspection,
  resolveRoute: ({ bindingOwnerAvailable, boundAgentId }) => {
    if (!bindingOwnerAvailable) {
      throw new Error("Conversation binding owner is unavailable; retry the message.");
    }
    return resolveAgentRoute({
      channel: "acme-chat",
      accountId,
      peer,
      cfg: boundAgentId ? { session: cfg.session } : cfg,
      defaultAgentId: boundAgentId,
    });
  },
});
```

从 `openclaw/plugin-sdk/routing` 导入 `resolveAgentRoute`。因此，即使普通名册需要显式选择，绑定代理也可以提供路线。代理范围的会话密钥优先于元数据；无范围目标可以使用 `metadata.agentId`。丢失、忽略的 cron-run 和插件拥有的绑定不提供绑定代理。没有非空元数据代理 ID 的无作用域目标也会导致 `boundAgentId` 未定义；它没有发明默认代理。插件绑定保留其记录，以便通道可以区分插件后备和未绑定的父查找。 `inspection` 保留准备好的对话标识，用于在其选定的父级之前编写线程观察，而无需再次读取绑定存储。回调拥有路由构建； core 仍会预测选定的会话和所有权事实。如果代理拥有的绑定选择不同的代理，则核心会为该代理重建 `mainSessionKey`，同时保留基本路由的主键名称，然后根据绑定代理的主会话派生 `lastRoutePolicy`。这也适用于已完成的路由输入，并保持普通路由不变以进行特定于通道的陈旧绑定比较。通过上下文构建保留这些事实，以便回复许可可以拒绝撤销、重新分配或不可用的所有者。当活动必须保留捕获的选择时，请在投影后等待范围内的 `touchAsync` 并保留该路线以供进入，而不是默默地选择替换。

适配器提供 `inspectByConversationAsync` 用于只读检查和 `resolveByConversationAsync` 用于普通查找。主机服务公开这两种方法。通用绑定和捆绑的帐户范围适配器在共享状态读取工作线程中运行检查；查找修复和活动写入使用现有的写入代理。他们的交易谓词、到期规则和账户所有权保持不变。主机资格在 IPC 之前准备好，并且在读取和写入准入后重新检查当前适配器和注册表所有权。

生命周期 setter 有明确的 Promise 返回对应项：`channel.threadBindings.setIdleTimeoutBySessionKeyAsync` 和 `setMaxAgeBySessionKeyAsync`。通道适配器公开相同的后缀方法。调用者在报告受影响的绑定之前等待结果。

现有的同步查找、触摸、路由解析器和生命周期设置器合约在 2026 年 12 月 31 日之前仍然弃用，并在 2027 年 1 月的第一个稳定版本中删除。请参阅 [ 绑定迁移映射](/plugins/sdk-migration/sqlite-async#conversation-and-native-session-bindings)。同步入口点仅调用同步实现；他们从不启动结果会丢失的异步突变。暴露这两个变体的适配器使它们处于同一状态所有者之下。

在分阶段迁移期间，当异步分派不存在时，异步分派将回退到适配器的现有同步方法。这保留了外部插件的兼容性；该回退不会使旧适配器成为非阻塞。通用和帐户范围的 bind/unbind 操作和捆绑会话列表使用共享状态工作线程。他们发布的同步选择器在兼容性边界内仍然可用。单独的生命周期设置器和其他捆绑存储保留其现有行为，直到各自的切换；这种执行变化并不会加强他们的耐久性合同。
