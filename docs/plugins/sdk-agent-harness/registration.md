---
summary: "注册 AgentHarnessV2，以及可选的隔离完成和委托执行功能"
read_when:
  - "您正在编写调用 `api.registerAgentHarness` 的插件条目"
  - "您正在实施 `runIsolatedCompletionV2`"
  - "您需要让受信任的插件执行您的工具拥有的会话"
title: "注册代理harness"
sidebarTitle: "登记"
---

注册调用本身以及注册的工具可以添加的两个可选功能：一个新的免工具推理调用，以及同意受信任的委托执行现有的模型锁定会话。 [Agent harness插件 ](/plugins/sdk-agent-harness) 参考的一部分。

## <a id="register-a-harness"></a> 注册一个 harness

**导入：** `openclaw/plugin-sdk/agent-harness`

```typescript
import type { AgentHarnessV2 } from "openclaw/plugin-sdk/agent-harness";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const myHarness: AgentHarnessV2 = {
  id: "my-harness",
  label: "My native agent harness",

  supports(ctx) {
    const routeSupportsHarness =
      ctx.modelProvider?.runtimePolicy?.compatibleIds.includes("my-harness") === true;
    const canReproduceRequest = ctx.modelProvider?.requestTransportOverrides !== "present";
    return ctx.provider === "my-provider" && routeSupportsHarness && canReproduceRequest
      ? { supported: true, priority: 100 }
      : { supported: false, reason: "effective route is not harness-compatible" };
  },

  async runAttempt(params) {
    // Start or resume your native thread.
    // Use params.prompt, params.tools, params.images, params.onPartialReply,
    // params.onAgentEvent, and the other prepared attempt fields.
    return await runMyNativeTurn(params);
  },
};

export default definePluginEntry({
  id: "my-native-agent",
  name: "My Native Agent",
  description: "Runs selected models through a native agent daemon.",
  register(api) {
    api.registerAgentHarness(myHarness);
  },
});
```

此通用示例中故意没有 `authBootstrap`。仅当harness满足 [harness 拥有的身份验证引导合同 ](/plugins/sdk-agent-harness/core-ownership#harness-owned-auth-bootstrap) 时，才添加 `authBootstrap: "harness"`。

### <a id="executor-controller-plugins"></a> Executor 控制器插件

具有提供者管理的工作区的harness可以声明 `workspaceEnvironment: { kind: "provider-hosted", label: "Provider workspace" }`。网关将此元数据投影到配置的 model/runtime 选择上，以便 Control UI 可以区分托管工作区与本地文件夹和云工作人员。仅将其声明为活动托管配置，而不是自托管执行器。此演示元数据不授予可用性、身份验证、放置或文件同步功能；那些人留在他们现有的主人那里。

harness可以将自托管执行器连接管理委托给单独的插件。向 `api.registerAgentExecutorController(...)` 注册一台控制器。注册表从注册插件的 ID 分配所有权；控制器不会选择另一个 ID 或注册第二个harness。

使用使用此控制器的运行时 ID 来声明 `activation.onAgentHarnesses`，例如 `["my-harness"]`。此清单提示包括准备好的运行时注册表中的插件，而无需注册harness。仅启动激活并不包括每个模型选择的注册表中的插件。

```typescript
import type { AgentExecutorController } from "openclaw/plugin-sdk/agent-harness-runtime";

const controller: AgentExecutorController = {
  workspaceDirectory: "/srv/agent/workspace",
  async ensure(binding, context) {
    context.assertCurrent();
    await connectExecutor(binding, context.signal);
    context.assertCurrent();
  },
  async retire(binding, context) {
    context.assertCurrent();
    await disconnectExecutor(binding, context.signal);
    context.assertCurrent();
  },
};

api.registerAgentExecutorController(controller);
```

`workspaceDirectory` 是执行器上的绝对路径。它可能与网关的工作区不同。 `AgentExecutorBinding` 包含 `sessionKey`、`agentId`、`nativeSessionId`、`environmentId`、`remoteUrl` 和 `workspaceDirectory`。 `ensure` 连接或重新连接该确切环境，而无需创建重复项； `retire` 释放该环境的连接，并且重复时没有附加效果。这两个操作都不会创建或删除本机代理会话。控制器拥有其传输、凭证和进程管理。对于代理API，每个本机会话都拥有其直接执行程序进程；多个会话可以共享同一主机和持久工作区。准备和连接请求是分开的：harness为当前的 `environment_connection` 操作调用 `ensure`，包括在其输入提交等待时，而不是在每次转动之前进行探测。

Harness 实现从 `openclaw/plugin-sdk/agent-harness-runtime` 导入 `resolveAgentExecutorController(pluginId)` 并在承认的调用期间解析显式配置的插件。解析仅使用该调用的注册表，并且对于丢失、禁用或不可用的所有者而言失败。它不会激活插件或回退到进程全局注册表。当其注册生成或所有者退休或注册被替换时，句柄就会过期；在每次调用中解析一个新句柄，而不是跨轮缓存一个句柄。

通过 `AgentExecutorContext` 以及所需的 `signal` 和 `assertCurrent`。主机将调用者取消与注册表和插件生命周期结合起来，在每次操作之前和之后检查权限，并在控制器调用 `assertCurrent` 时保留调用者的范围。控制器实现必须尊重信号并在等待之后和每个副作用之前重新检查权限。当操作完成时断言失效。

该工具保留了会话绑定持久性、本机就绪检查、退休前的工作结算以及可重试的清理。执行器控制器不授予重置不相关会话或停止共享运行时的权限。

`reset` 无法解决所需本地工作的harness将从 `openclaw/plugin-sdk/agent-harness-runtime` 中抛出 `AgentHarnessSessionCleanupError`。主机等待其他清理回调，然后在替换本地会话之前拒绝重置。普通的重置挂钩错误仍然会尽力解决。回复驱动的重置在提交会话边界之前使用相同的必需清理检查。

### <a id="isolated-completion"></a> 隔离式完成

可选的 `runIsolatedCompletionV2(params)` 能力服务于这样的产品路径：它们需要一次全新的、仅提示词的推理调用，并使用字面意义上的空模型可调用工具界面。Core 会传入 provider 和 model id、提示词、截止时间控制，以及一个已准备好的 `authorization`：

- `owner: "host"` 包含精确的传输 `model` 和已解析的 `auth`
- `owner: "harness"` 包含准备好的运行时认证计划，以及限制为该调用所选单个 profile 的凭据快照。Core 负责自动回退顺序，并针对每个候选项分别调用 harness

提供后，`onRequestComplete(durationMs)` 通过结算报告推理调度，包括调度失败。在运行时的请求边界进行测量，而不是围绕其整个完成方法：凭证、模型、客户端以及会话准备和请求后清理被排除在外。准备失败不得报告请求时间。当harness未报告持续时间时，Core 不会发明持续时间。

代理 API 是字面上的空工具表面的记录例外：它创建一个没有执行程序、提供的函数、Web 搜索、保险库或子代理的新会话，但该服务可能保留内置帮助程序。默认情况下启用此限制模式。拒绝工具轴承输出不会阻止助手在推理过程中采取行动。需要字面零工具保证的调用者必须选择提供它的运行时。

每个新的隔离完成都使用其承认的运行时生成的配置和 agent/workspace 目录。在该生成准备期间，显式模型、身份验证配置文件和运行时选择保持固定。注册表准备选择提供者和工具所有者，包括其声明的工具依赖项。准备工作不会仅因为代理选择内存或上下文引擎插件而添加它们，也不会添加不相关的启动插件，并且不采用网关代理功能。

主机授权的调用必须使用提供的模型和凭证，不得替换。使用共享主机准备的完成帮助程序来保留准确的路线、截止日期、采样选项和空工具表面。当计划将授权留给harness时，harness授权的调用可能仅解析提供的准备好的路线和范围配置文件，或harness的本机帐户。harness不得切换路由、重用本机线程、附加工具、调用代理生命周期挂钩或传递输出。

要在实用模型设置中报告相同的执行路线，harness可以添加 `resolveIsolatedCompletionRuntime({ authorizationOwner })`，其中所有者是 `"host"` 或 `"harness"`。当授权所有者使用共享主机准备的完成帮助程序时，返回 `"openclaw"`；当工具执行调用时，返回 `"self"`。如果没有此挂钩，设置将报告harness本身。保持选择器同步且无副作用，并在隔离调度中重用它，以便报告的路由跟随执行。

提供后，在准备等待之后以及每次凭证移交、推理请求或流程开始（包括重试）之前立即调用 `params.assertCurrent()`。它重新验证调用者的实时权限，并在完成结束时过期。抛出的断言结束执行；不要将其视为凭据失败或使用其他配置文件重试。继续兑现`abortSignal`；授权到期后，清理工作必须保持可用。

返回`{ assistant: AssistantMessage }`。核心仅接受带有 `stop` 或 `length` 停止原因的终端 text/thinking 内容；工具调用、失败的停止和空输出都会被拒绝。标题请求设置 `outputTextPolicy: "strict-visible"`：保持推理独立，而不将模糊推理恢复为可见文本；空的可见结果是有效的。主机准备的帮助程序将此策略映射到恢复前的严格解析。省略保留了普通的恢复行为。 CLI- 支持的标题调用还允许干净的空输出，而无需静默回复令牌；普通的 CLI 调用仍然拒绝空响应。较旧的外部harness可能会忽略该策略；最终的标题过滤器无法恢复已丢弃的工具的出处，因此这不是通用的推理隐私保证。除了已记录的代理 API 限制之外，如果harness无法强制隔离，请忽略该功能。需要隔离完成的调用者会在调用该工具之前拒绝运行； OpenClaw 不会通过另一个运行时重播请求。插件调用者通过`api.runtime.llm.complete({ execution: { mode: "isolated-agent-runtime" } })`请求隔离执行；harness回调是提供者端执行 SPI，而不是第二个调用者 API。

旧版仅支持宿主认证的 `runIsolatedCompletion(params)` 能力已弃用，但在 2026-10-12 之前仍可供外部插件使用。对于由 harness 负责或原生认证的场景，请实现 V2；当只有旧版能力存在时，OpenClaw 永远不会凭空创建宿主凭据。

即使 OpenClaw 发送空工具列表，本机代理服务器通常也具有环境内置工具。为新的转变禁用并证明这些本机功能，使用可以序列化真正的零工具请求的单独传输，或者不支持该功能。代理 API 保留上述记录的异常，直到其服务可以强制执行该边界。

审计证据遵循相同的界限。 OpenClaw 可以记录注册的插件所有权并运行许可，但它不能声明来自 ACP 更新或记录的外部本机副作用。完全在该运行时内的副作用是 `unsupported`，除非适配器在操作之前调用 OpenClaw-owned 回调。不要从本机工具状态事件重建回调。

### <a id="delegated-execution"></a> 委托执行

harness所有者可以将 `delegatedExecutionPluginIds` 设置为需要执行现有模型锁定会话的受信任插件的 ID，例如继续 Codex- 支持的对话的语音传输。这是静态所有者同意，而不是核心许可名单。保持狭窄。

受委托方只获得工作接入和嵌入式执行。OpenClaw 需要完全相同的已存储会话密钥、存储路径和会话 id；`modelSelectionLocked: true`；以及匹配的 `agentHarnessId` 和 `agentHarnessRuntimeOverride` 值。 随后运行会通过 harness 所有者进行范围限定。会话创建、修补、重置、删除、归档以及 Gateway 变更仍然仅限所有者操作。
