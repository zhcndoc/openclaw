---
summary: "覆盖模型、塑造提示并保留插件拥有的会话状态"
read_when:
  - "您正在覆盖代理轮流的提供者或模型"
  - "您正在添加提示上下文或缩小转弯的工具表面"
  - "您需要授权的保单后即时充实"
  - "您正在持久会话扩展或排队下一轮注入"
title: "提示和会话挂钩"
sidebarTitle: "提示和会话"
---

模型解析、提示构建、最终确定和持久的插件拥有的会话状态。 [ 插件挂钩 ](/plugins/hooks) 指南的一部分。

## <a id="debug-runtime-hooks"></a> 调试运行时钩子

使用 `before_model_resolve` 切换代理轮次的提供商或模型 - 它在模型解析之前运行。 `llm_output` 描述运行时发出尝试时的输出； `assistantTexts` 可以为空而 `lastAssistant` 不存在，因此该事件本身并不能证明成功的最终答案。

要验证会话模型是否生效，请检查运行时注册信息，然后使用 `openclaw sessions` 或 Gateway 的 session/status 界面。要调试提供方载荷，请使用 `--raw-stream` 和 `--raw-stream-path <path>` 启动 Gateway，将原始模型流事件写入 jsonl 文件。

## <a id="prompt-and-model-hooks"></a> 提示词与模型钩子

新插件应使用按阶段划分的钩子：

- `before_model_resolve`：仅接收当前提示和附件元数据。返回 `providerOverride`、`modelOverride` 或 `fallbacksOverride`。如果提供，`fallbacksOverride` 将替换本次运行的后备链； `[]` 禁用模型回退，因此失败的主数据库将导致运行失败。非字符串数组的值将被视为 `[]`。省略它以保留配置的后备行为。
- `agent_turn_prepare`：接收当前提示、准备好的会话消息以及为此会话消耗的排队注入。返回 `prependContext` 或 `appendContext`。
- `before_prompt_build`：接收准备好的提示消息和会话消息。harness还可以提供 `currentUserMessage`（history/context 投影之前的当前请求）和 `currentUserMessageId`（其本地准入标识）。 ID 在重建和重试一个已承认的请求时保持稳定，并且在不同的承认之间有所不同。如果可用，请使用明确的意图检测请求； `prompt` 可能包含重建的历史。不要解析信封标记来恢复请求边界。显式空字符串意味着没有文本请求，包括仅图像输入或没有保留请求的延续。它决不能倒退到历史之中。 Codex 运行时刷新保留原始记录器的文本和标识。如果没有录音机，Codex 提供当前文本，但不准许 ID；单独运行 ID 的相同文本和相关性并不能识别入场。省略的字段保留现有的harness行为。返回 `prependContext`、`appendContext`、`systemPrompt`、`prependSystemContext`、`appendSystemContext` 或 `toolsAllow`。 `toolsAllow` 只能缩小当前转弯的主机解析刀具曲面； `[]` 未提交任何可选工具，而省略它会使现有表面保持不变。多个钩子返回的限制是相交的。嵌入式运行器和 Copilot harness将该场应用于其旋转范围提交的工具表面。 Codex 应用程序服务器harness拒绝限制性值，因为其动态工具是线程范围的，并且 Codex `turn/start` 没有工具表面覆盖；当插件需要此​​策略时，使用嵌入式或 Copilot 运行时。
- `before_prompt_build` 和 `{ requiresToolAuthority: true }`：在第二个策略后阶段运行。当提示充实通过工具支持的功能读取数据并且必须允许同一回合调用该工具时，请使用它。参见[授权提示充实](/plugins/hooks/prompt-and-session#authorized-prompt-enrichment)。
- `heartbeat_prompt_contribution`: 仅在心跳回合运行，并返回 `prependContext` 或 `appendContext`。用于需要在不改变用户发起回合的情况下总结当前状态的后台监控器。

在嵌入式、CLI 和工具运行时提示准备路径（包括 ACPX、代理 API、Codex 和 Copilot）上，排序为：排出排队注入 → `agent_turn_prepare` → 心跳贡献（如果适用）→ 普通`before_prompt_build`→工具政策敲定→授权提示丰富。

对于多个注册，第一个定义的 provider/model/fallback 覆盖，`systemPrompt` 获胜。上下文添加按优先级顺序连接，工具限制交叉。当其外部调度处于活动状态时，同一运行器上的嵌套普通 `before_prompt_build` 调度将被跳过；其他钩子系列和独立转弯仍然可用。

消息消耗提示挂钩接收分离的模型上下文快照。改变嵌套消息不会更改调用者的历史记录，包括处理程序在返回后保留其输入的情况。一次调度内的注册按优先顺序共享该快照；准备、普通提示构建、授权丰富和后续提示重建接收单独的快照。这些快照中不包括仅存储的本机提示文本和工具结果详细信息。

### <a id="restrict-a-run-to-local-models"></a> 限制运行到本地模型

当路由决策必须在模型故障中幸存下来时，返回显式后备列表。仅提供程序和模型覆盖即可使配置的后备可用。

```typescript
api.on("before_model_resolve", () => ({
  providerOverride: "ollama",
  modelOverride: "qwen3:8b",
  fallbacksOverride: ["ollama/qwen3:4b"],
}));
```

使用 `fallbacksOverride: []` 仅允许选定的主节点。列表相互替换；它们从不串联。挂钩按优先级降序运行，注册顺序打破平局。第一个定义的列表获胜，包括空列表；提供者和模型覆盖是通过相同的规则独立选择的。

初始路由挂钩在逻辑运行选择其候选链之前运行。显式列表在尝试中保持固定，因此稍后的候选者不会通过同一钩子的另一次调用重定向回主列表。每个符合条件的候选者都会保留自己配置的尝试超时。会话模型锁和操作员模型限制仍然适用。这些覆盖是运行范围的，不会更改保存的配置或会话的选定模型。安装维修保留其单独承认的模型列表。

### <a id="handler-lifetime"></a> Handler 生命周期

每个 `before_prompt_build` 处理程序在普通提示阶段和授权提示阶段都会接收只读 `ctx.hookInvocation.assertActive()` 能力。它在运行程序停止等待单个处理程序（包括超时、返回或错误）后，在下一个处理程序开始之前抛出。在等待的工作之后和同步副作用之前调用它，其结果必须仍然符合此钩子调用的条件。其他处理程序具有独立的功能，即使在同一提示调度内也是如此。

此功能仅检查处理程序的结果接受生命周期。它不授予工具授权，不取消底层工作，也不保证稍后的模型调用会消​​耗上下文。该字段为可选，用于SDK兼容性；需要它的插件必须显式处理不受支持的主机，而不是替换其自己的超时预算副本。

### <a id="authorized-prompt-enrichment"></a> 授权提示充实

当插件必须在检索上下文之前验证最终的每轮工具策略时，将 `before_prompt_build` 注册到 `requiresToolAuthority: true`：

```typescript
api.on(
  "before_prompt_build",
  async (event, ctx) => {
    const authority = ctx.toolAuthority;
    if (!authority?.allows("memory_search")) {
      return;
    }

    const recalledContext = await recallForPrompt(event.prompt);
    authority.assertActive();
    return { prependContext: recalledContext };
  },
  { requiresToolAuthority: true },
);
```

主机将此处理程序排除在普通提示构建阶段之外。在所有普通挂钩和工具限制解决后，受支持的运行时会调用它，并将 `ctx.toolAuthority` 绑定到确切的活动转弯和最终的工具表面。嵌入式、CLI、Copilot 和 Codex 运行时支持此阶段。如果运行时无法证明权限，它将跳过处理程序。

将 `toolAuthority` 视为临时功能：

- `allows(toolName)` 根据最终表面检查标准工具 ID，并验证该功能是否仍处于活动状态。
- `assertActive()` 在中止、取消、运行替换、生命周期轮换或挂钩调度完成后拒绝。在等待的工作之后和提交插件拥有的副作用之前调用它。
- `fingerprint` 是不透明的缓存分区输入。它不是不记名令牌或授权证明；永远不要将其作为权威来坚持、传播或比较。
- 从此阶段仅返回 `prependContext` 或 `appendContext`。策略确定后，不能替换系统提示或更改`toolsAllow`。

主机在每个等待的处理程序之后重新验证权限并丢弃陈旧的丰富内容。保留的 `toolAuthority` 对象在调度后拒绝使用。

此选项需要一个实施后策略阶段的主机。已发布的插件必须将 `package.json` `openclaw.compat.pluginApi` 设置为从他们为此合约构建的第一个 OpenClaw 版本开始的范围。较旧的主机在发现过程中会跳过不兼容的软件包，并拒绝不兼容的安装或更新。不要发布使用此选项的包，同时声称与旧插件 API 兼容；否则，较旧的主机可能会将未知选项视为普通的预策略挂钩。

在嵌入式和 CLI 运行器上，`before_agent_run` 在快速构建之后和模型提交之前运行，包括 `llm_input` 观察。在嵌入路径上，它也先于提示本地图像加载。它接收当前用户输入 `prompt`，以及 `messages` 中加载的会话历史记录和活动系统提示符。返回 `{ outcome: "block", reason, message? }` 以在模型读取提示之前停止运行。 `reason` 为内部； `message` 是面向用户的替代品。仅支持 `pass` 和 `block` 结果；不支持的决策形状将被拒绝。

当运行被阻止时，OpenClaw 只会在 `message.content` 中存储替换文本， 以及非敏感的阻止元数据，例如阻止插件 id 和时间戳。原始用户文本不会保留在转录或未来上下文中。内部阻止原因被视为敏感信息， 不会出现在转录、历史、广播、日志和诊断载荷中。可观测性应使用已清洗字段，例如阻止者 id、结果、时间戳或安全分类。

暴露`event.runId`的钩子，例如`agent_end`和`before_agent_finalize`，当OpenClaw可以识别活动运行时接收它； `ctx.runId` 上也有相同的值。提示挂钩并不都具有事件 `runId` 字段，因此请使用其类型化上下文进行关联。当发射器提供时，Cron 驱动的运行还可以公开 `ctx.jobId`（原始 cron 作业 ID），因此挂钩可以将指标、副作用或状态限定到特定的计划作业。不要假设每个代理事件都携带它。 `ctx.jobId` 不是 `before_tool_call` 工具上下文的一部分。

对于 `before_prompt_build`，`ctx.inputProvenance` 携带嵌入式 CLI、Codex 和 Copilot 提示路径上回合用户角色输入的主机分类来源。其 `kind` 为 `external_user`、`inter_session` 或 `internal_system`。可选源字段为 `originSessionId`、`sourceSessionKey`、`sourceChannel` 和 `sourceTool`。

该字段是可选的。当生产者不提供分类时，包括普通人在某些路径上的转弯，它就不存在。缺席并不能证明人类起源。即使提示钩子收到它，其他钩子事件也可能会忽略它。

`ctx.trigger === "user"` 是运行触发器，而不是来源分类。会话间交付（例如 `sessions_send`、`subagent_settle` 和 `subagent_announce`）可以保留该触发器。使用类型来源来区分这些输入；不解析提示前缀。出处描述了来源，并不授予使用工具或访问其他会话的权限。

对于通道发起的运行，`ctx.channel` 和 `ctx.messageProvider` 用于标识提供方表面，例如 `discord` 或 `telegram`，而 `ctx.channelId` 是会话目标标识符，当 OpenClaw 能从 session key 或投递元数据推导出时会提供。

当发送者身份可用时，agent 钩子上下文还包括：

- `ctx.senderId` - 通道范围的发送方 ID（e.g. Feishu `open_id`、Discord 用户 ID）。当运行源自具有已知发件人元数据的用户消息时填充。
- `ctx.chatId` - 传输本机会话标识符（e.g. Feishu `chat_id`、Telegram `chat_id`）。当始发通道提供本机对话 ID 时填充。
- `ctx.channelContext.sender.id` - 与 `ctx.senderId` 相同的发送者 ID， 位于一个由通道拥有的对象下，插件可以通过通道特定字段进行扩展。
- `ctx.channelContext.chat.id` - 与 `ctx.chatId` 相同的会话 ID， 位于一个由通道拥有的对象下，插件可以通过通道特定字段进行扩展。

Core仅定义嵌套的`id`字段。通过入站助手传递更丰富的发件人或聊天元数据的通道插件可以从 `openclaw/plugin-sdk/channel-inbound` 增强 `PluginHookChannelSenderContext` 或 `PluginHookChannelChatContext`：

```ts
declare module "openclaw/plugin-sdk/channel-inbound" {
  interface PluginHookChannelSenderContext {
    unionId?: string;
    userId?: string;
  }
}
```

通道插件通过 inbound SDK helper 传递这些字段：

```ts
buildChannelInboundEventContext({
  // ...
  channelContext: {
    sender: { id: senderOpenId, unionId, userId },
    chat: { id: chatId },
  },
});
```

这些字段是可选的，对于系统发起的运行（heartbeat、cron、exec-event）则不存在。

`ctx.senderExternalId` 仍作为一个废弃的向后兼容字段保留给旧插件。 Core 不会填充它；新的通道特定发送者身份应通过模块增强放在 `ctx.channelContext.sender` 下。

`agent_end`是观察钩。通道支持的路径通常在回合后运行即发即忘，而本地一次性路径可以在进程清理之前等待钩子承诺，因此受信任的插件可以刷新终端可观察性或捕获状态。钩子运行程序对每个处理程序应用 30 秒的默认超时，因此楔形插件或嵌入端点不能让钩子承诺永远悬而未决。记录超时并继续 OpenClaw；它不会取消插件拥有的网络工作，除非插件也使用自己的中止信号。

使用 `model_call_started` 和 `model_call_ended` 进行提供商调用遥测，不应接收原始提示、历史记录、响应、标头、请求正文或提供商请求 ID。这些钩子包括稳定的元数据，例如 `runId`、`callId`、`provider`、`model`、可选的 `api`/`transport`、终端 `durationMs`/`outcome` 和 `upstreamRequestIdHash`（当 OpenClaw 可以派生有界提供者请求 ID 哈希时）。当运行时解析上下文窗口元数据时，挂钩事件和上下文还包括 `contextTokenBudget`、模型配置、固定模型合约和运行时发现后的有效代币预算，以及应用较低上限时的 `contextWindowSource` 和 `contextWindowReferenceTokens`。

这些提供者调用挂钩仅由嵌入式模型调用路径发出。公开 `llm_input` / `llm_output` 的harness不会自动公开相同的提供商调用遥测数据。在外部harness中，LLM 事件描述适配器可见的输入和输出，不一定是原始提供程序请求或完整的本机历史记录。

`before_agent_finalize` 仅在harness即将接受自然的最终助理答案时运行。它不是 `/stop` 取消路径，并且当用户中止回合时不会运行。返回 `{ action: "revise", reason }` 要求harness在最终确定之前再进行一次模型传递，返回 `{ action: "finalize", reason? }` 强制最终确定，或者忽略结果继续。处理程序有 15 秒的默认预算；超时时，OpenClaw 记录失败并保留其他处理程序的决策。由于没有做出修改决定，正常的定稿工作仍在继续。多个`revise`原因组合；任何 `finalize` 决定都会优先于修订请求。此挂钩需要最终化集成：嵌入式运行器和本机挂钩中继提供它，但 Copilot harness不会调度它。 Codex 本机 `Stop` 挂钩将作为 OpenClaw `before_agent_finalize` 决策中继到此挂钩。

返回 `action: "revise"` 时，插件可以包含 `retry` 元数据以绑定运行中的重复修订请求：

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` 附加到发送到harness的修订原因中。 `idempotencyKey` 允许主机在一次运行中计算等效最终决策的重试次数；如果没有密钥，它会对指令进行哈希处理。 `maxAttempts` 默认为该密钥额外传递一次。使用特定于插件的密钥以避免与其他插件共享预算。harness可以应用更严格的总体修订限制；嵌入式运行器最多允许三个。

对话访问和提示突变有单独的权限门；在启用这些挂钩之前，请参阅 [Permissions 和scope](/plugins/hooks#permissions-and-scope)。

### <a id="session-extensions-and-next-turn-injections"></a> 会话扩展与下一回合注入

工作流插件可以保留与 `api.session.state.registerSessionExtension(...)` 兼容的小型 JSON- 会话状态，并通过网关 `sessions.pluginPatch` 方法更新它。会话行通过 `pluginExtensions` 投影注册的扩展状态，让 Control UI 和其他客户端呈现插件拥有的状态，而无需了解插件内部结构。 `api.registerSessionExtension(...)` 仍然有效，但已被弃用，取而代之的是 `api.session.state` 命名空间。

当插件需要为下一个提示构建排队的持久上下文时，请使用 `api.session.workflow.enqueueNextTurnInjection(...)`（顶级 `api.enqueueNextTurnInjection(...)` 是具有相同行为的已弃用别名）。即使没有注册提示钩子，OpenClaw也会在嵌入式、CLI和harness运行时路径上的提示钩子之前耗尽排队的注入。它会删除过期的条目以及插件处于非活动状态或禁用提示注入的条目。 `idempotencyKey` 对同一插件和会话的未过期待处理条目进行重复删除；密钥使用后可以重复使用。耗尽的条目在活动运行中的重试中重复使用，但消耗条目并不是模型看到它的收据：以后的失败可能会阻止提交。这是批准简历、策略摘要、后台监控增量和命令延续的正确钩子，这些内容应该在下一轮模型中可见，但不应成为永久的系统提示文本。

配置多个代理时，将 `agentId` 与无作用域的 `sessionKey` 一起传递，例如 `global`。排队、消费和插件会话状态保留在该代理的存储中；所有者选择器不是持久注入的一部分。

消费仍然与所选的存储会话绑定。重置或冲突的旧身份和合格身份可防止耗尽消耗另一个对话的队列。读取或使用旧别名不会重命名其存储的会话密钥。

使用 `api.session.workflow.steerActiveRun({ sessionKey, text, displayText?, idempotencyKey? })` 为会话的活动运行提供指导，而无需开始新的回合。当运行接受文本时，它返回 `{ steered: true, runId? }`；当没有运行处于活动状态、运行不接受转向或运行时拒绝转向时，它返回 `{ steered: false, reason }`。接受并不等待成绩单承诺。在同一活动运行中重复 `idempotencyKey` 会重复使用原始接受的结果，而无需对另一个模型输入进行排队，包括当调用重叠时。已存储在会话中的密钥还会阻止传递到以后的运行：当其转向收据可用时，主机返回原始 `runId`，否则返回 `{ steered: false, reason: "duplicate" }`。重复是终端无操作；不要为其添加后备指导。被拒绝的尝试不会保留密钥，因此可以重试。仅在本地接受后，内部 Codex 指导才会附加到成绩单中。预调度拒绝不会在以后的模型上下文中留下任何指导，并且不会阻止重试密钥。

主动转向需要受保护的 （V2） 运行时，例如内置 OpenClaw 运行时或 Codex。旧版 V1 运行时（包括 Copilot）会返回 `{ steered: false, reason: "active runtime does not support guarded steering" }`，而不对指导进行排队。 API 不会自动将稍后的回合加入队列；需要时使用下面的显式后备。

转向需要 `plugins.entries.<id>.hooks.allowPromptInjection`（除非明确设置为 `false`，否则启用）和实时插件实例。禁用提示注入返回`steered: false`；过期的插件实例无法调度。主机和受保护的运行时在分派之前重新检查插件实例，包括在转录持久化之后。在指导悬而未决时禁用或处置插件会拒绝引导，而不是默默地丢弃它。输入仍然隐藏，由插件编写的内部上下文，来源为 `{ kind: "internal_system", sourceTool: "plugin:<id>" }`。它不具有发件人或所有者权限，并且从不回答未决的用户问题。 Control UI 单独将其显示为折叠的 **插件名称指南** 通知及其时间戳；展开通知会显示指导，而无需开始新的聊天回合。该通知确认记录的指导，而不是交付：运行时可以在其记录行被持久化后拒绝指导。指导说明不会发送到聊天频道或显示在本机客户端或 TUI 中。

当 `text` 包含仅模型交付说明时，请使用可选的 `displayText` 作为面向操作员的注释。该模型仍保留原来的`text`；仅Control UI通知使用`displayText`。省略它即可显示 `text` 不变。主机用注释记录插件的显示名称。下一回合注入仍然是下一条用户消息的模型提示的一部分，而不是单独的转向通知。他们捕获的 `modelPromptProjection` 是私有重放状态，并且从所有显示历史记录和消息事件中省略；可见的用户消息保持不变。

如果引导应该持续到另一个转弯，则在转向不可用时回退到持久注入队列：

```typescript
const guidance = { sessionKey, text, idempotencyKey: "review-1" };
const result = await api.session.workflow.steerActiveRun(guidance);
if (!result.steered && result.reason !== "duplicate") {
  await api.session.workflow.enqueueNextTurnInjection({
    ...guidance,
    ttlMs: 24 * 60 * 60 * 1000,
  });
}
```

清理语义是契约的一部分。会话扩展清理和运行时生命周期清理回调会接收 `reset`、 `delete`、`disable` 或 `restart`。主机会在 reset/delete/disable 时移除拥有该插件的持久会话扩展状态和待处理的下一回合注入；restart 会保留持久会话状态，而清理回调则允许插件释放旧运行代的调度器任务、运行上下文以及其他带外资源。

禁用清理会保留该插件的工具拥有的模型锁定会话。重新启动会保留扩展状态和挂起的注入，但可以清除陈旧的升级顶级会话字段。
