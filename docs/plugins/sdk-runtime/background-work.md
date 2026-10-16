---
doc-schema-version: 1
summary: "钩子代理转动并且子代理运行"
read_when:
  - "您正在为不受信任的外部内容派遣代理"
  - "您正在启动或等待后台子代理运行"
title: "插件运行时后台工作"
sidebarTitle: "后台工作"
---

在后台启动代理工作：钩子调度轮流用于外部内容和子代理运行。 [Plugin 运行时助手](/plugins/sdk-runtime) 参考的一部分。

## <a id="background-work-namespaces"></a> 后台工作命名空间

<AccordionGroup>
  <Accordion title="api.runtime.hooks">
    调度隔离代理轮流寻找不受信任的外部内容触发器，例如电子邮件观察程序。与 `api.runtime.subagent.run(...)` 不同，挂钩调度包装外部内容，序列化同一会话的运行，并通过网关报告完成情况。插件轮流共享 cron 执行预算，而不需要 HTTP 挂钩端点。启用 HTTP 挂钩后，该共享预算中的一个槽位仍保留用于 HTTP 工作。

    ```typescript
    const result = await api.runtime.hooks.dispatchHookAgentTurn({
      name: "IMAP inbox",
      agentId: "mail",
      sessionKey: "hook:imap:account:123:456",
      message: "Summarize the new email and identify any requested actions.",
      externalContentSource: "email",
      deliver: true,
      thinking: "low", // optional
      timeoutSeconds: 60, // optional
      idempotencyKey: "account:123:456", // optional
    });

    if (!result.ok) {
      api.logger.warn(`Hook agent turn was rejected: ${result.reason}`);
    }
    ```

    `agentId` 是必需的，并且 `sessionKey` 必须以 `hook:` 开头，并且不包含空格或控制字符。 `externalContentSource` 目前仅接受 `"email"`；无法禁用外部内容换行。将 `deliver` 设置为 `false` 以记录完成而不通知。成功入场返回`{ ok: true, runId }`；拒绝录取返回`{ ok: false, reason }`。

    此功能仅适用于捆绑插件和受信任的官方插件安装。它不需要启用或配置 HTTP 挂钩端点。

  </Accordion>
  <Accordion title="api.runtime.subagent">
    启动并管理后台 subagent 运行。

    对于无需保留会话或回复传送的免工具完成，请使用 `complete(...)`：

    ```typescript
    const { text } = await api.runtime.subagent.complete({
      agentId: "research", // required configured agent that owns this work
      message: "Summarize these notes.",
      extraSystemPrompt: "Return a concise summary.", // optional
      timeoutMs: 30_000, // optional; defaults to 30 seconds
      // model: "openai/gpt-5.6-luna", // optional authorized override
      // signal: abortController.signal, // optional cancellation
    });
    ```

    需要 `agentId` 和 `message`。 `extraSystemPrompt`、`model`、`timeoutMs` 和 `signal` 是可选的。当省略 `model` 时，所选代理将提供其配置的默认模型和凭证所有者。结果是`{ text: string }`；不需要会话创建、消息轮询、删除或完成传递。配置的运行时必须支持新鲜的、免工具的隔离推理；不受支持的运行时在推理之前失败。

    完成在后台优先级使用 [ 子代理队列](/concepts/queue#background-work)，跨插件和工作区共享 `agents.defaults.subagents.maxConcurrent`。将此现有限制设置为 `1` 以序列化它们。取消会立即删除排队的工作。正在运行的工作会保留其插槽，直到底层运行时清理完成，然后拒绝；取消、超时或运行时退出后，不会返回延迟输出。调用需要实时网关绑定和插件身份。请求范围的调用保留调用者的操作员范围和代理访问权限；当调用结束时，在操作员工具调用内启动的完成将被取消。模型覆盖保留现有的子代理授权和下面的 `allowedModels` 策略。

    当您需要会话或代理工具界面时，请使用 `run(...)`：

    ```typescript
    // Start a subagent run
    const { runId, sessionKey } = await api.runtime.subagent.run({
      sessionKey: "agent:main:subagent:search-helper",
      message: "Expand this query into focused follow-up searches.",
      toolsAlsoAllow: ["my_plugin_progress"],
      promptMode: "minimal", // optional bounded subagent prompt
      provider: "openai", // optional override
      model: "gpt-6-astra", // optional override
      deliver: false,
      completionDelivery: "current-requester", // optional, before_dispatch hooks only
    });

    // Wait for completion
    const result = await api.runtime.subagent.waitForRun({ runId, timeoutMs: 30000 });

    // Read session messages
    const { messages } = await api.runtime.subagent.getSessionMessages({
      sessionKey: "agent:main:subagent:search-helper",
      limit: 10,
    });

    // Delete a session
    await api.runtime.subagent.deleteSession({
      sessionKey: "agent:main:subagent:search-helper",
    });
    ```

    网关支持的运行返回标准化接受的 `sessionKey` 以及 `runId`。该字段在 TypeScript 结果中是可选的，只是为了使显式自定义运行时保持兼容。

    `waitForRun(...)` 返回标准网关等待结果。 `status` 是 `"ok"`、`"error"`、`"timeout"` 或 `"pending"`；待定是正常的非终止观察，而不是例外。可选 `error`、`startedAt`、`endedAt`、`stopReason`、`livenessState`、`yielded`、`pendingError`、`timeoutPhase`、`providerStarted` 和`terminalReply` 元数据被保留，以便调用者可以区分观察超时和终端结果。 `timeoutMs` 限制等待调用；它不会取消运行。

    <Warning>
    在授权网关请求之外，模型覆盖需要操作员通过配置中的 `plugins.entries.<id>.subagent.allowModelOverride: true` 选择加入。没有选择加入的插件可以使用配置的模型，但覆盖请求会被拒绝。
    </Warning>

    `plugins.entries.<id>.subagent.allowedModels` 可以限制对标准化 `provider/model` 目标的覆盖。 `complete` 也适用同样的政策；请求范围的调用保留其经过身份验证的客户端的覆盖权限。检查使用目标代理的模型配置，包括精确配置的模型 ID，并应用于插件的初始覆盖。配置的默认值、操作员安装的模型路由挂钩和自动模型回退保留其自己的选择策略。

    `toolsAlsoAllow` 会将由调用插件注册且由其唯一拥有的工具，按精确名称添加到 worker 的常规工具接口中。运行时会拒绝 Core 工具以及与其他插件共享的名称。Profile 和操作员工具策略仍然适用，包括显式允许列表和拒绝列表。

    所有者授权的命令启动可以将其捕获的断言传递为 `subagent.run({ ..., assertCurrent })`；网关在运行准入时应用它。托管 `worktrees.create({ ..., commitGuard })` 通过其现有创建所有者接受相同的断言。撤销可以防止挂起的启动或工作树写入，而接受的工作保留其清理和完成责任。

    `promptMode: "minimal"` 选择有界子代理提示而不是完整对话提示。插件运行时仅公开此模式；省略保留完整提示。当运行必须具有精确的空工具表面时，也可以使用 `disableTools: true`。

    `completionDelivery: "current-requester"` 默认关闭，仅在 `before_dispatch` 挂钩处理经过身份验证的入站请求时可用。 OpenClaw 在调用插件之前捕获已解析的请求者会话和传递路由，然后通过正常的公告路径传递子代理完成。插件无法提供或覆盖请求者沿袭或目标字段。请求者绑定的钩子上下文之外的调用将被拒绝。

    `deleteSession(...)` 可以删除同一插件通过 `api.runtime.subagent.run(...)` 创建的会话。删除任意用户或操作员会话仍然需要具有 admin 作用域的 Gateway 请求。

  </Accordion>
</AccordionGroup>

## <a id="native-harness-completion-delivery"></a> Nativeharness完成交付

捆绑的harness使用 `openclaw/plugin-sdk/agent-harness-completion` 通过现有请求者完成交付所有者路由本机子结果。 `deliverAgentHarnessCompletion` 需要主机发出的 `AgentHarnessCompletionScope` 和实时 `isSourceSessionAdmissionAllowed` 回调。保持回调绑定到确切的本机分配及其当前父级。在等待路由之后和新效果之前，将重新检查请求者的身份和准入。本机运行时历史记录、取消和提交收据仍归该工具所有；没有通用任务注册表或受管理流 API。

对于分离的本机工作，在发布注册或启动本机子工作之前，在接纳父级注册期间等待 `captureAgentHarnessCompletionCustody(scope)`。准备保留原始请求者生命周期，并在返回托管之前拒绝替换或撤销。每个接受的子分配都保留其自己的 `retain()` 保留，并在传递其结果时将其作为 `completionCustody` 传递。当其注册或分配结束时，释放每个保留。保留保留了原始操作员上限和请求者生命周期；它不授予一般工具访问权限，也不会在撤销或网关关闭后继续存在。

将 `createAgentHarnessCompletionEventSink(...)` 绑定到相同的完成托管和 `isSourceCurrent` 回调以进行精确的本机分配。在本机终端持久化和第一次完成切换解决后，在休眠传递重试之前调用 `completionCustody.settleExecution()`。这释放了执行消耗义务，同时保留了完成交付权限。重新启动后，恢复必须从实时注册中获取新的托管权并验证其请求者；存储的历史永远不会授予权威。
