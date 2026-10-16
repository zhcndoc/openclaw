---
summary: "主机拥有的完成、模型选择策略和提供者身份验证解析"
read_when:
  - "您需要主机拥有的文本完成功能，而无需导入提供商内部结构"
  - "您正在根据代理白名单解析模型引用"
  - "您正在解析提供商凭据或身份验证配置文件"
title: "插件运行时模型助手"
sidebarTitle: "模型助手"
---

调用模型、解析模型选择策略并解析提供程序身份验证，而无需导入主机内部结构。 [Plugin 运行时助手](/plugins/sdk-runtime) 参考的一部分。

## <a id="protected-model-egress-for-standalone-commands"></a> 独立命令的受保护模型出口

来自 `openclaw/plugin-sdk/secret-egress-runtime` 的 `withConfiguredModelEgress` 为具有目标绑定凭证哨兵的官方插件运行显式独立命令。它通过正常的秘密解析器（包括文件支持的密钥）解析所选提供商配置的 API-key SecretRef，并在端口 443 上对其 HTTPS 端点使用提供商的模型路由策略。它支持 OpenAI- 兼容的响应和完成路由。不支持 OAuth、身份验证配置文件引用、自定义请求标头和自定义请求传输。这是一个私人 JavaScript-only 主机绑定，用于捆绑和单独发布的官方插件，而不是第三方插件 API。

```typescript
const { withConfiguredModelEgress } = await import("openclaw/plugin-sdk/secret-egress-runtime");
await withConfiguredModelEgress({ config, provider, model, signal }, async (egress) => {
  // Keep hostEnv on the credential-owning host for the authenticated bridge.
  // Send only sentinel, baseUrl, model, and public caBundle to the remote app.
  await runRemoteAppThroughBridge(egress, signal);
});
```

回调接收`sentinel`、`baseUrl`、`model`、`allowedHosts`、`hostEnv`和公开的`caBundle`内容。提供 `onOutput(text, stream)` 以接收实时输出，并编辑已解析的凭据，包括在块之间分割的值；将回调的 `onOutputChunk` 传递给命令运行程序。调用者拥有其桥接器和远程进程，必须接受取消，并且必须在回调解决之前加入两者。取消会立即撤销代理访问权限；回调完成或失败会撤销访问、停止隔离代理并删除其私有 CA 目录。凭证和代理授权永远不会进入共享秘密存储。

这是使用现有秘密出口实现的显式命令范围代理。它不需要启用或重新启动网关的持久出口代理。仅在命令执行路径中导入SDK模块；单独导入它不会加载模型或秘密运行时代码。

## <a id="prepared-simple-completions"></a> 准备简单的完成

`openclaw/plugin-sdk/simple-completion-runtime` 助手支持一次准备模型并重复完成。成功的准备将保留其 `model`、`auth` 和 `selection` 字段使用的提供程序资源。主机拥有这些资源，因此调用者可以在没有处理程序的情况下重用结果：

```typescript
const result = await prepareSimpleCompletionModelForAgent({ cfg, agentId });
if ("error" in result) {
  throw new Error(result.error);
}
const prepared = result;
const response = await completeWithPreparedSimpleCompletionModel({
  model: prepared.model,
  auth: prepared.auth,
  cfg,
  context: { messages },
});
```

准备接受可选的`signal`；取消可以防止后期设置返回可用模型。逻辑错误后可以继续进行资源清理；主机关闭加入了承认的设置和清理工作。保留的结果在其主机关闭之前一直保持所有权，主机关闭之前会等待接受的完成工作，然后再释放提供程序资源。重复的兼容准备共享现有一代的资源。来自关闭主机的结果无法启动另一个完成；在当前主机下再次准备。

## <a id="low-level-completions"></a> 低级完工

`openclaw/plugin-sdk/agent-runtime` 中的 `resolveApiKeyForProfile` 返回不可枚举的 `readCurrentCredential` 功能，用于个人帐户以及使用 `chatgpt-token-sharing` 的持久共享或代理配置文件。将其与已解析的令牌一起保留，并在异步准备之后在传输的最终授权边界同步调用它。根据所选配置文件和预期身份验证返回的凭据；缺少凭证必须阻止派遣。它读取网关拥有的事实，无需 SQL，拒绝待决或不可用的权限，并在解析完成后保持有效。个人账户重新连接淘汰旧功能；普通的 OAuth 刷新通过同一所有者发布其新凭证。没有保留权限能力的配置文件返回 `null`。

`openclaw/plugin-sdk/llm` 中的 `complete` 和 `completeSimple` 助手接受可选的第四个 `assertCurrent` 回调。它在传输设置之后、提供商调度之前运行。抛出的错误或中止的 `options.signal` 会阻止调度；回调位于提供者选项之外。现有的三参数调用仍然受到支持。

来自同一 SDK 子路径的 `resolveOpenAIModelReasoningEfforts`、`resolveOpenAIReasoningEffortMap` 和 `resolveOpenAIReasoningEffortMapping` 帮助程序读取 OpenAI 模型的工作能力和配置的本机映射。

本机harness可以使用 `openclaw/plugin-sdk/agent-harness-attempt-runtime` 中的 `selectSupportedReasoningEffort` 及其经过验证的工作顺序和支持的工作。它保留支持的请求，否则选择下一个更高的支持工作，或者当没有更高的工作时选择最高的可用工作。后端适配器保留协议验证和特殊模式处理。

## <a id="model-namespaces"></a> 模型命名空间

<AccordionGroup>
  <Accordion title="api.runtime.llm">
    运行主机拥有的文本完成，无需导入提供程序内部或重复 OpenClaw model/auth/base URL 准备工作。

    ```typescript
    const result = await api.runtime.llm.complete({
      messages: [{ role: "user", content: "Summarize this transcript." }],
      purpose: "my-plugin.summary",
      maxTokens: 512,
      temperature: 0.2,
      reasoning: "high",
    });
    ```

    直接提供者完成使用与代理轮流相同的身份验证配置文件健康策略来记录凭证失败，并尝试下一个合格的配置文件。每个配置文件每次完成最多尝试一次。显式 `model@profile` 引脚和提供商绑定的凭据保持固定状态。当池耗尽时，最后一个提供者错误仍然以 `stopReason: "error"` 解决；呼叫者应在使用文本之前检查该字段。成功的请求将清除该模型所选配置文件的失败状态。重试保留原始运行时租约并在分派前重复授权检查。

    `maxTokens` 和 `temperature` 是建议性的采样提示。选定的 provider、CLI 或 harness 会在其传输层提供等效控制时应用这些提示，否则可能忽略它们。它们不会削弱执行模式的隔离保证。

    要通过配置的代理运行时需要新的推理，请显式选择隔离执行：

    ```typescript
    const result = await api.runtime.llm.complete({
      messages: [{ role: "user", content: "Return one JSON value." }],
      systemPrompt: "You are a JSON-only function.",
      model: "openai/gpt-6-astra",
      execution: {
        mode: "isolated-agent-runtime",
        authProfileId: "openai:work",
        timeoutMs: 30_000,
      },
    });
    ```

    该模式只接受一条用户消息。核心派生已配置的 CLI 或harness所有者，启动新的上下文，不提供模型可调用工具，并且永远不会回退到直接提供程序传输。不受支持的运行时在推理之前失败。 `result.execution.owner` 报告所选所有者；当 CLI 无法报告时，令牌使用情况仍然不存在。

    代理 API 对字面上的零工具保证有一个已记录的例外情况：尽管没有执行程序或提供的工具，但其受限会话可能会保留服务拥有的帮助程序。输出拒绝不能阻止这些助手在推理过程中采取行动。需要零工具的调用者必须选择强制执行该边界的运行时。参见[隔离完成合约](/plugins/sdk-agent-harness/registration#isolated-completion)。

    补全失败时，抛出的错误会公开稳定的 `code`。隔离调用方可以区分授权失败、无效的隔离输入、不受支持或不可用的运行时、中止、超时、被拒绝的输出以及其他补全失败，而无需匹配错误消息文本。

    Provider 编排还可以在发出 HTTP 请求前获取已配置的本地服务生命周期：

    ```typescript
    const lease = await api.runtime.llm.acquireLocalService(
      {
        providerId,
        baseUrl,
        headers,
      },
      signal,
    );
    try {
      // Send and fully consume the provider request.
    } finally {
      await lease?.release();
    }
    ```

    `acquireLocalService(...)` 是稳定的通用 provider 服务 SDK 合约。宿主会从 `models.providers.<providerId>.localService` 解析进程配置；调用方不能提供命令、参数、环境或生命周期策略。进程生成、就绪状态、诊断和空闲停止策略仍由宿主内部负责。

    传递准确配置的提供商 ID 和解析的请求基 URL。不要用适配器 ID 替换别名：单独的别名可以指向单独的本地 GPU 主机。除了 Ollama 和 LM Studio 适配器使用的 `/v1` 规范化之外，主机拒绝与配置的提供程序基础 URL 不匹配的端点。主机拥有启动序列化、就绪检查、请求租用、中止处理和空闲关闭。

    此辅助工具使用与 OpenClaw 内置运行时相同的简单补全准备路径，以及宿主拥有的运行时配置快照。上下文引擎会接收与会话绑定的 `llm.complete` 能力，因此模型调用使用活动会话的 agent，不会静默回退到默认 agent。结果包含 provider/model/agent 归属信息，以及可用时规范化的令牌、缓存和估算成本用量。

    当没有记录成本或 configured/eligible 目录定价可用时，将省略 `usage.costUsd`。默认填充的零费率并不建立免费使用。显式运营商零定价和提供商计费零总额仍为 `0`；记录的请求成本保留其原始定价等级。

    直接完成可以为提供者本机约束输出设置 `responseFormat`。当提供者公开它们时，结果还包括具体的`responseModel`和终端`stopReason`。对安全敏感的呼叫者可以设置`requiredAuthMode: "oauth"`；然后，主机在分派之前拒绝选定的非 OAuth 凭证。隔离的代理运行时完成在分派之前拒绝这些直接提供者控制。

    OpenAI 和 Azure 响应接受原始 JSON 架构作为 `responseFormat`，并将其包装在带有 `type: "json_schema"` 和名称 `openclaw_response` 的 `text.format` 中。保留原生 `json_schema`、`json_object` 和 `text` 格式；聊天完成样式的嵌套 `json_schema` 描述符针对响应进行扁平化，包括任何提供的 `strict` 值。

    设置 `reasoning` 以请求对所选模型进行推理。主机接受标准思维级别（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive`、`max` 和`ultra`）。直接完成映射 `adaptive` 到 `medium` 和 `ultra` 到 `max`；选定的提供商传输将每项工作映射到其支持的线路值。显式 `off` 达到提供商的残疾人思维策略；是否可以禁用思维取决于所选的模型和认证路径。

    Codex 隔离完成通过本机模型的支持工作量映射传递显式推理级别。当省略推理时，这些有界调用将保持其省力的默认值。

    <Warning>
    模型覆盖需要操作员在配置中通过 `plugins.entries.<id>.llm.allowModelOverride: true` 明确选择启用。`plugins.entries.<id>.llm.allowedModels` 会限制这些覆盖；`plugins.entries.<id>.llm.allowedCompletionModels` 则单独限制每次补全，包括宿主解析的默认值。对于直接补全，`model@profile` 覆盖仍属于已授权的模型覆盖范围。隔离模式下的 `model@profile` 覆盖和 `execution.authProfileId` 需要 `plugins.entries.<id>.llm.allowAuthProfileOverride: true`。跨 agent 补全需要 `plugins.entries.<id>.llm.allowAgentIdOverride: true`。
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.modelConfig">
    同步模型选择策略，无需准备模型或启动会话。

    `resolveDefaultModelForAgent({ cfg, agentId })` 解析代理的默认配置。 `resolveAllowedModelRef({ cfg, catalog, raw, defaultProvider, defaultModel, agentId })` 根据提供的目录和代理白名单解析模型名称或别名，返回 `{ ref, key }` 或 `{ error }`。它不选择或验证代理运行时；需要特定harness的呼叫者必须应用该单独的策略。

    `resolveModelRuntimePolicy({ config, provider, modelId, agentId?, sessionKey? })` 读取配置的运行时策略。它按顺序遵循确切的 agent/default 模型条目、提供者模型条目、提供者通配符条目和提供者策略。配置时，结果包括 `policy` 及其 `source`（`"model"` 或 `"provider"`）；当没有策略匹配时，结果为空对象。此查找不会选择隐式运行时默认值或检查harness可用性。

    使用这些主机操作而不是将模型选择实现模块导入到插件的注册条目中。

  </Accordion>
  <Accordion title="api.runtime.modelAuth">
    模型和 provider 认证解析。

    还提供同步配置文件操作：`resolveProviderIdForAuth`、`ensureAuthProfileStore`、`resolveAuthProfileOrder`、`listProfilesForProvider` 和 `isProviderApiKeyConfigured`。他们使用共享主机身份验证策略。读取代理配置文件时提供所属代理目录，并使用 `readOnly: true` 和 `allowKeychainPrompt: false` 进行非交互式配置文件检查。不得记录配置文件存储和解析的凭据。

    能力工厂应该只构造描述符。将凭证检查和解析保留在需要它们的回调中，而不是在注册提供程序时执行它们。

    ```typescript
    const auth = await api.runtime.modelAuth.getApiKeyForModel({ model, cfg });

    // Request-ready auth, including provider runtime exchanges (e.g. OAuth refresh)
    const runtimeAuth = await api.runtime.modelAuth.getRuntimeAuthForModel({ model, cfg });

    const providerAuth = await api.runtime.modelAuth.resolveApiKeyForProvider({
      provider: "openai",
      cfg,
    });
    ```

  </Accordion>
</AccordionGroup>

## <a id="prepared-completion-sdk-compatibility"></a> 准备完成SDK兼容性

更喜欢 `api.runtime.llm.complete` 新插件代码。 `openclaw/plugin-sdk/simple-completion-runtime` 的现有调用者可以继续使用 `prepareSimpleCompletionModelForAgent` 准备模型并使用 `completeWithPreparedSimpleCompletionModel` 执行它。

执行器接受可选的 `options.headers` 和 `options.sessionId` 字段。省略它们的调用保持相同的调用形状。对于 HTTPS OpenCode 端点，独立完成会为每次调用获取一个新的不透明 `x-opencode-session` 路由标头。无论标头名称大小写如何，显式模型或调用者路由标头都会抑制生成。调用者标头优先于模型标头。

提供的 `sessionId` 保留其现有的提供程序会话和缓存行为。它还提供 OpenCode 路由标头，除非显式标头覆盖它。生成的路由值仅保留在标头中：它不会创建对话、记录、提示缓存或 WebSocket 会话所有权。现有的传输重试重用调用的标头；执行者不添加重试策略。

这些准备好的结果没有发布方法。他们原来的网关或CLI主机保留模型资源直到关机；独立调用者在进程生命周期中保留它们。封闭的主机拒绝新的准备和执行。即使完成已经返回，关闭也会在释放准备好的资源之前等待接受的提供程序回调和取消工作。
