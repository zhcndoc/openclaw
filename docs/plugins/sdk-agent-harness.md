---
summary: "用于替代底层嵌入式 agent 执行器的插件实验性 SDK 接口"
title: "Agent 执行器插件"
sidebarTitle: "Agent 执行器"
read_when:
  - 你正在更改嵌入式 agent 运行时或执行器注册表
  - 你正在从捆绑或可信插件中注册 agent 执行器
  - 你需要了解 Codex 插件与模型提供方之间的关系
---

**agent 执行器** 是一个已准备好的 OpenClaw agent 回合的底层执行器。它不是模型提供方，不是通道，也不是工具注册表。关于面向用户的心智模型，请参见 [Agent 运行时](/concepts/agent-runtimes)。

仅将此接口用于捆绑或可信的原生插件。该契约仍处于实验阶段，因为参数类型有意与当前的嵌入式运行器保持一致。

## 何时使用 harness

当某个模型家族拥有自己的原生会话运行时，而常规的 OpenClaw provider 传输不是合适的抽象时，请注册一个 agent harness：

- 一个拥有线程和压缩能力的原生编程代理服务器
- 必须流式传输原生计划/推理/工具事件的本地 CLI 或守护进程
- 需要除了 OpenClaw 会话转录之外还拥有自己的恢复 ID 的模型运行时

不要只是为了增加一个新的 LLM API 就注册 harness。对于普通的 HTTP 或 WebSocket 模型 API，请构建一个 [provider 插件](/plugins/sdk-provider-plugins)。

## 核心仍然负责什么

在选择 harness 之前，OpenClaw 已经解析了：

- provider 和 model
- 运行时认证状态，除非该 harness 声明它拥有认证引导
- thinking level 和 context budget
- OpenClaw 转录/会话文件
- workspace、sandbox 和工具策略
- 通道回复回调和流式回调
- 模型回退和实时模型切换策略

一个 harness 会执行一个准备好的尝试；它不会选择 provider、替换通道传递，或静默切换模型。

### 原生工具策略强制执行

仅当 `runAttempt` 对原生工具和内置工具、OpenClaw 工具、请求方和已配置的 MCP 服务器、应用、委派以及恢复的线程，强制执行每一层显式的 OpenClaw 工具策略时，才将 `conversationToolPolicySupport: "exact"` 设置为 `"exact"`。Core 会将 `params.pluginHarnessToolPolicyRestricted` 作为已准备好的决策传入，指示原生界面必须被隔离。默认的工具配置文件收窄不会设置此标志。

当任何原生能力可以绕过这些层时，请省略该声明。OpenClaw 随后会在调用 harness 之前，明确拒绝显式受限的 turn。操作员可以将会话切换到嵌入式运行时，或升级 harness。带有限制性直接策略的通道 `/btw` 侧边问题会被 core 拒绝，不受此声明涵盖。

### Harness 拥有的认证引导

默认情况下，core 会在调用 harness 之前解析 provider 凭据。一个受信任的、可以通过其自身原生运行时进行认证的 harness，可能会在其静态 `AgentHarness` 注册中将 `authBootstrap` 设为 `"harness"`。此时，core 会跳过其通用的 provider 凭据引导，以及对该 harness 所声明的每次尝试中缺失凭据的失败处理。

如果存在，core 仍会转发一个兼容的、显式选择或按顺序排列的 OpenClaw auth profile 及其作用域存储。harness 必须在发起模型请求前解析该 profile 或其原生凭据，将密钥限制在该次尝试的作用域内，并暴露可操作的认证失败信息。不要在一个只在某些情况下拥有认证责任的 harness 上设置此能力。

### 已验证的设置运行时工件

能够为首次运行设置提供推理的本地 harness，必须证明完成探测的实现。当 `params.captureRuntimeArtifact` 为 true 时，返回一个不透明的 `result.runtimeArtifact`，其中包含稳定的 id 和内容指纹。注册一个匹配的 `runtimeArtifact.validate(...)` 能力，以在不加载其他 harness 或扫描无关插件的情况下重新检查该绑定。

已验证的 OpenClaw 续接也会传入 `params.expectedRuntimeArtifact`。  
harness 必须将其与所获取的精确原生进程进行比较，并在启动或恢复原生线程之前，如果二者不同则失败。普通的 agent turn 会省略这两个字段，因此内容哈希不会进入正常请求的热路径。远程/WebSocket harness 在参与之前需要一个服务器证明契约；仅有版本字符串并不能作为工件身份。

准备好的尝试还包含 `params.runtimePlan`，这是一个由 OpenClaw 拥有的运行时决策策略包，必须在 OpenClaw 与原生 harness 之间保持共享：

- `runtimePlan.tools.normalize(...)` 和 `runtimePlan.tools.logDiagnostics(...)` 用于感知 provider 的工具 schema 策略
- `runtimePlan.transcript.resolvePolicy(...)` 用于转录清理和工具调用修复策略
- `runtimePlan.delivery.isSilentPayload(...)` 用于共享 `NO_REPLY` 和媒体传递抑制
- `runtimePlan.outcome.classifyRunResult(...)` 用于模型回退分类
- `runtimePlan.observability` 用于已解析的 provider/model/harness 元数据

harness 可以使用该计划来做出需要与 OpenClaw 行为一致的决策，但应将其视为宿主拥有的尝试状态：不要修改它，也不要在一次 turn 中使用它来切换 provider/model。

### 请求传输契约

`supports(ctx)` 接收 `ctx.modelProvider` 中已解析的模型传输。两个无密钥、由 provider 拥有的事实描述了所选路由：

- `runtimePolicy.compatibleIds` 列出了 provider 声明与该具体路由兼容的 runtime id。缺少该 policy 表示 provider 没有声明路由级兼容性；这并不代表可以假定支持。
- `requestTransportOverrides: "none"` 表示没有必须被复现的已编写 provider/model 请求覆盖。`"present"` 表示存在已编写的 headers、auth transport、proxy、TLS、local-service、private-network 行为或请求参数。该事实不会暴露这些值。

当 harness 无法复现准备好的传输时，返回 `{ supported: false, reason }`。不要在选择后通过读取原始配置来推断支持性。当认证准备产生多个重试路由时，必须有一个 harness 支持所有路由后才能分发。如果没有插件可以拥有完整集合，则使用 OpenClaw 进行隐式选择；显式或持久化的插件选择会在闭合状态下失败。

## 注册一个 harness

**导入：** `openclaw/plugin-sdk/agent-harness`

```typescript
import type { AgentHarness } from "openclaw/plugin-sdk/agent-harness";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const myHarness: AgentHarness = {
  id: "my-harness",
  label: "我的原生 agent harness",

  supports(ctx) {
    const routeSupportsHarness =
      ctx.modelProvider?.runtimePolicy?.compatibleIds.includes("my-harness") === true;
    const canReproduceRequest = ctx.modelProvider?.requestTransportOverrides !== "present";
    return ctx.provider === "my-provider" && routeSupportsHarness && canReproduceRequest
      ? { supported: true, priority: 100 }
      : { supported: false, reason: "有效路由不兼容 harness" };
  },

  async runAttempt(params) {
    // 启动或恢复你的原生线程。
    // 使用 params.prompt、params.tools、params.images、params.onPartialReply、
    // params.onAgentEvent，以及其他已准备好的 attempt 字段。
    return await runMyNativeTurn(params);
  },
};

export default definePluginEntry({
  id: "my-native-agent",
  name: "我的原生 Agent",
  description: "通过原生 agent 守护进程运行选定模型。",
  register(api) {
    api.registerAgentHarness(myHarness);
  },
});
```

`authBootstrap` 在这个通用示例中是刻意省略的。只有当 harness 满足上述契约时，才添加
`authBootstrap: "harness"`。

### 隔离式完成

可选的 `runIsolatedCompletion(params)` 能力用于需要一次全新的、仅提示词推理调用的产品路径，
并且模型可调用的工具表面必须是字面意义上的空。核心会传入准确准备好的 `model`、`auth`、
provider、模型 id、系统提示词、用户提示词、超时时间、中止信号和流式参数。harness 不得
重新解析凭据、切换路由、复用原生线程、附加工具、调用 agent 生命周期钩子或交付输出。

返回 `{ assistant: AssistantMessage }`。核心只接受带有 `stop` 或 `length` 停止原因的终止文本/
思考内容；工具调用、失败的停止原因和空输出都会被拒绝。如果 harness 无法证明符合这些语义，
请省略此能力。随后，需要隔离式完成的调用方会在调用该 harness 前直接失败；OpenClaw 不会
通过其他运行时重放请求。

插件调用方通过
`api.runtime.llm.complete({ execution: { mode: "isolated-agent-runtime" } })`
选择此行为；harness 回调是 provider 侧的强制执行 SPI，而不是第二个调用方 API。

即使 OpenClaw 发送空工具列表，原生 agent 服务器通常也会自带环境工具。在这种情况下，请使用
能够序列化真正零工具请求的独立 provider 传输，或者不要支持此能力。

### 委托执行

harness 所有者可以将 `delegatedExecutionPluginIds` 设置为受信任
插件的 id，这些插件需要执行一个已有的、模型锁定的会话，例如继续 Codex 支持的对话的语音
传输。这是静态的所有者授权，不是核心允许列表。请保持其范围尽可能小。

受委托方只获得工作接入和嵌入式执行。OpenClaw 需要
完全相同的已存储会话密钥、存储路径和会话 id；`modelSelectionLocked:
true`；以及匹配的 `agentHarnessId` 和 `agentHarnessRuntimeOverride` 值。
随后运行会通过 harness 所有者进行范围限定。会话创建、修补、重置、删除、归档以及 Gateway 变更仍然仅限所有者操作。

## 选择策略

OpenClaw 会在 provider/model 解析之后选择 harness：

1. Model 范围的运行时策略优先。
2. Provider 范围的运行时策略其次。
3. `auto` 会询问已注册的 harness 是否支持已解析出的有效
   路由。仅凭 provider/model 前缀永远不会选择 harness。
4. 如果没有已注册的 harness 匹配，OpenClaw 会使用其内嵌运行时。

插件 harness 的失败会表现为运行失败。在 `auto` 模式下，只有当没有已注册的插件 harness 支持已解析的 provider/model 时，才会使用内嵌回退。一旦某个插件 harness 接管了某次运行，OpenClaw 就不会通过另一个运行时重放同一轮，因为这可能改变认证/运行时语义，或导致副作用重复。

在 harness 启动任何模型工作之前发生的失败，可以使用
`openclaw/plugin-sdk/agent-harness-runtime` 中的
`AgentHarnessPreflightError`。默认错误对于整个模型回退链仍然是终止性的。仅当失败局限于所选 harness，且在同一 harness 上重试另一个模型会再次触发该失败时，才传入 `{ scope: "harness" }`。OpenClaw 会在尝试边界记录实际选中的 harness，仅跳过已证明使用该 harness 的后续候选项，并通过其正常的运行时和策略检查运行归属不同的候选项。插件可以选择使用该作用域，但绝不会在错误中指定 harness 所有者。在请求或工具操作可能已经产生副作用后，不要使用 harness 作用域。

已配置的运行时策略仍然是期望运行时的权威来源。持久化会话中的 `agentHarnessId` 会在路由/认证准备仍在进行时保留其原生记录的所有权。这两者都不会使不兼容的路由变得兼容：一旦准备好的事实存在，所选或固定的 harness 就必须支持这些事实，否则运行会安全失败。`/status` 会显示根据策略、持久化所有权和路由支持情况选出的有效运行时。
准备状态是明确的：缺少 `runtimePolicy` 时会保持未声明状态，而不会根据碰巧存在的传输字段进行推断。
当由 harness 所有的认证使多个物理路由仍未解析时，准备好的支持事实是这些路由兼容运行时 id 的交集；如果任何候选项包含请求覆盖项，也会报告这些覆盖项。因此，一个未声明的候选项会使原生兼容性为空；`preparedAuth.source: "harness"` 表示认证所有者，而不是允许推断路由支持。

如果选中的 harness 出乎意料，请启用 `agents/harness` 调试日志，并检查 gateway 的结构化 `agent harness selected` 记录：其中包含所选的 harness id、选择原因、运行时/回退策略，以及在 `auto` 模式下每个插件候选项的支持结果。

捆绑的 Codex 插件会将 `codex` 注册为其 harness id。核心会将其视为普通的插件 harness id；Codex 特定别名应放在插件或运维配置中，而不是放在共享运行时选择器中。

## provider 与 harness 配对

大多数 harness 还应同时注册一个 provider。provider 会将模型引用、认证状态、模型元数据以及 `/model` 选择暴露给 OpenClaw 的其他部分。随后 harness 通过 `supports(...)` 声明对该 provider 的认领。

捆绑的 Codex 插件遵循此模式：

- 优先用户模型 refs: `openai/gpt-5.6-sol`
- 兼容性 refs: 旧的 `codex/gpt-*` refs 仍然被接受，但新的
  配置不应再将它们用作常规 provider/model refs
- harness id: `codex`
- 认证: 合成的 provider 可用性，因为 Codex harness 拥有
  原生 Codex 登录/会话
- app-server 请求: OpenClaw 将裸模型 id 发送给 Codex，并让
  harness 与原生 app-server 协议交互

Codex 插件是增量式的。在运行时策略未设置或为 `auto` 时，OpenAI
仅在其 provider 拥有的路由契约声明 `codex`
兼容时才会选择 Codex：即一个精确的官方 HTTPS Platform Responses 或 ChatGPT Responses
路由，且没有作者自定义的请求覆盖。仅有 `openai/*`
前缀不会选择 Codex。自定义端点、Completions 适配器，以及作者定义的请求行为
都保留在 OpenClaw 上。纯文本的官方 HTTP 端点会被拒绝。较旧的 `codex/gpt-*`
refs 仍然是兼容性输入。参见
[OpenAI 隐式 agent 运行时](/providers/openai#implicit-agent-runtime)。

有关运维设置、模型前缀示例以及仅 Codex 的配置，请参见
[Codex Harness](/plugins/codex-harness)。

Codex 插件会强制执行 [Codex Harness](/plugins/codex-harness) 中记录的最低 app-server 版本。它会检查 initialize 握手并
阻止更旧或未版本化的服务器，因此 OpenClaw 只会在其已测试过的协议
表面上运行。

### 工具结果中间件

捆绑插件以及显式启用、且其 manifest contract 匹配的已安装插件，可以通过 `api.registerAgentToolResultMiddleware(...)` 挂载与运行时无关的工具结果中间件，前提是其 manifest 在 `contracts.agentToolResultMiddleware` 中声明了目标 runtime id。这个受信任的接缝用于异步工具结果转换，这些转换必须在 OpenClaw 或 Codex 将工具输出回传给模型之前运行。

中间件选项可以将 `runtimes` 与 `matcher` 工具名称列表结合使用。
每次注册都会保持这对配置不变，因此为不同 runtime 注册同一处理程序不会扩大任一 matcher 的范围。Matcher 使用非空的规范化 OpenClaw 工具 id；省略 `matcher` 可匹配所有工具。

旧版捆绑插件仍然可以使用
`api.registerCodexAppServerExtensionFactory(...)` 来注册仅限 Codex app-server 的中间件，但新的结果转换应使用与 runtime 无关的 API。仅供嵌入式 runner 使用的 `api.registerEmbeddedExtensionFactory(...)` 钩子已被移除；嵌入式工具结果转换必须使用与 runtime 无关的中间件。

### 终态分类

拥有自身协议映射的原生 harness，可以在一次完成的 turn 没有产生可见 assistant 文本时，使用 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `classifyAgentHarnessTerminalOutcome(...)`。该辅助函数会返回 `empty`、`reasoning-only` 或 `planning-only`，以便 OpenClaw 的回退策略决定是否切换到其他模型重试。`planning-only` 需要 harness 显式提供 `planText` 字段；OpenClaw 不会从 assistant 的自然语言中推断它。该辅助函数会有意忽略提示词错误、进行中的 turn，以及诸如 `NO_REPLY` 之类的刻意静默回复。

### Agent-end 副作用

原生 harness 在完成一次尝试后，必须调用 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `runAgentEndSideEffects(...)`。它会派发可移植的 `agent_end` 钩子以及 OpenClaw 的研究捕获，而不会延迟交互式回复。对于本地的非交互式运行，如果在这些副作用完成之前尝试不得解析，则使用 `awaitAgentEndSideEffects(...)`。这两个辅助函数都接受与 `runAgentHarnessAgentEndHook(...)` 相同的 `{ event, ctx }` 负载；它们的失败不会改变已完成尝试的结果。

### 用户输入与工具界面

公开 runtime 级用户输入请求的原生 harness 应使用 `openclaw/plugin-sdk/agent-harness-runtime` 中的用户输入辅助函数来格式化提示，通过 OpenClaw 的阻塞回复路径传递，并将选择/自由形式答案规范化回该 runtime 的原生响应形状。该辅助函数会保持通道/TUI 展现一致，而每个 harness 仍保留自己的协议解析和待处理请求生命周期。

需要类似 PI 的紧凑工具路由的原生 harness 应使用 `openclaw/plugin-sdk/agent-harness-tool-runtime` 中的 `createAgentHarnessToolSurfaceRuntime(...)`。它负责工具搜索/代码模式控制选择、本地模型精简默认值、与运行时兼容的 schema 过滤、隐藏目录执行、目录 hydration 以及目录清理。harness 仍然负责其 SDK 特定的工具转换和原生执行回调。

### 原生 MCP 清单

在 OpenClaw 的进程内 MCP runtime 之外拥有 MCP 连接的 harness
可以实现 `loadMcpToolCatalog(params)`。该回调供编排器工具访问视图等只读
控制界面使用。它会接收权威的会话身份、runtime 配置、工作区以及稀疏的会话
MCP 覆盖项。`mcpServerNames` 是 OpenClaw 配置的服务器集合中的有界子集，
harness 可以表示这些服务器的会话策略。只为该集合返回 OpenClaw 的
`McpToolCatalog` 形状。

只能使用已经绑定的原生进程和线程。返回 `undefined` 表示没有可用的实时清单；不要仅为
回答清单请求而启动新的 harness 进程。保留原始服务器/工具名称，使用
`assignMcpCatalogSafeServerNames(...)` 分配可安全处理冲突的服务器名称，并将仅因会话拒绝
而隐藏的工具保留在 `sessionDeniedTools` 中。Core 仍会在公开这些行之前，应用最终的
OpenClaw 工具策略和 schema 兼容性检查。

转发嵌入式尝试参数的 harness 应传递
`skillWorkshopProposalOnly`。仅提案的 skill-workshop 运行会被刻意限制为单工具运行，
runtime 会将其保留在原始工具界面上，而不会启用代码模式或工具搜索目录。

### 原生 Codex harness 模式

捆绑的 `codex` harness 是用于嵌入式 OpenClaw agent turns 的原生 Codex 模式。请先启用捆绑的 `codex` 插件；如果你的配置使用了限制性的 allowlist，还需要在 `plugins.allow` 中包含 `codex`。原生 app-server 配置应使用 `openai/gpt-*`；OpenAI agent turns 只有在有效路由声明了 Codex 兼容性时才会选择 Codex harness。旧的 Codex 模型 refs 应通过 `openclaw doctor --fix` 修复，而旧的 `codex/*`
模型 refs 仍然是原生 harness 的兼容性别名。

当此模式运行时，Codex 拥有原生线程 id、恢复行为、压缩以及 app-server 执行。OpenClaw 仍然拥有聊天通道、可见的转录镜像、工具策略、审批、媒体传递以及会话选择。需要证明只有 Codex app-server 路径可以认领该运行时时，请使用 provider/model `agentRuntime.id: "codex"`。显式插件 runtime 会失败关闭；Codex app-server 选择失败和 runtime 失败不会通过其他 runtime 重试。

## 运行时严格性

默认情况下，OpenClaw 使用 `auto` provider/model 运行时策略：已注册的
插件 harness 可以声明兼容的有效路由，而当没有匹配项时，内嵌
运行时会处理该轮对话。仅有 provider/model 前缀本身绝不会
选择某个 harness。请在缺少 harness 选择时使用显式的 provider/model 插件运行时，例如
`agentRuntime.id: "codex"`，这样就会失败，而不是通过内嵌运行时进行路由。
显式选择不会使不兼容的路由变为兼容。所选插件 harness 的失败始终会硬失败。
这不会阻止显式的 provider/model
`agentRuntime.id: "openclaw"`。

用于仅 Codex 的内嵌式运行：

```json
{
  "models": {
    "providers": {
      "openai": {
        "agentRuntime": {
          "id": "codex"
        }
      }
    }
  },
  "agents": {
    "defaults": {
      "model": "openai/gpt-5.6-sol"
    }
  }
}
```

如果你希望某个规范模型使用 CLI 后端，请把运行时放在该模型条目上：

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-opus-5",
      "models": {
        "anthropic/claude-opus-5": {
          "agentRuntime": {
            "id": "claude-cli"
          }
        }
      }
    }
  }
}
```

逐 agent 覆盖使用相同的按模型范围形状：

```json
{
  "agents": {
    "list": [
      {
        "id": "codex-only",
        "model": "openai/gpt-5.6-sol",
        "models": {
          "openai/gpt-5.6-sol": {
            "agentRuntime": { "id": "codex" }
          }
        }
      }
    ]
  }
}
```

如下这类旧的按整个 agent 设定运行时示例会被忽略：

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "codex"
      }
    }
  }
}
```

在显式插件运行时下，当请求的 harness 未注册、不支持已解析的 provider/model，或在产生 turn 副作用之前失败时，session 会提前失败。这是为仅 Codex 部署以及必须证明实际使用了 Codex app-server 路径的在线测试所刻意设计的。

此设置只控制内嵌式 agent harness。它不会禁用图片、视频、音乐、TTS、PDF 或其他 provider 特定的模型路由。

## 原生会话和转录镜像

执行框架可能会保留原生会话 ID、线程 ID 或守护进程端的恢复令牌。将该绑定显式地与 OpenClaw 会话关联起来，并持续将用户可见的助手/工具输出镜像到 OpenClaw 转录中。

OpenClaw 转录仍然是以下功能的兼容层：

- 频道可见的会话历史
- 转录搜索和索引
- 在后续轮次中切换回内置的 OpenClaw 执行框架
- 通用的 `/new`、`/reset` 以及会话删除行为

如果你的执行框架存储了 sidecar 绑定，请实现 `reset(...)`，以便当所属的 OpenClaw 会话被重置时，OpenClaw 可以清除它。

## 工具和媒体结果

Core 会构建 OpenClaw 工具列表，并将其传入已准备好的
attempt。当 harness 执行动态工具调用时，请通过 harness 结果结构返回工具结果，
而不是自行发送 channel media。

这样可以让文本、图片、视频、音乐、TTS、审批和 messaging-tool
输出，与由 OpenClaw 支持的运行保持在相同的传递路径上。

仅对受信任的 harness 运行时自行创建并持久化的原生产物设置
`AgentHarnessAttemptResult.hostOwnedToolMediaUrls`。每个条目也必须出现在
`toolMediaUrls` 中。绝不要包含模型选择的动态工具或 OpenClaw 工具媒体。在
`message_tool_only` 路由上，这种严格的来源标记可以让原生运行时产物在抑制源回复时仍然保留；正常的发送策略和环境房间准入规则仍然适用。

### 终端工具结果

`AgentHarnessAttemptParams.observeToolTerminal` 是由主机拥有的终端结果累加器。执行 OpenClaw 动态工具或原生工具的 harness，必须在每个工具达到一个终端结果时调用它，并且要在 attempt 结果最终确定之前调用。不执行工具的 harness 无需调用它。

从执行边界报告事实：

- 如果存在协议调用 id，则传入该 id、规范工具名称，以及准备或钩子重写后实际到达工具的参数。
- 当验证、审批或其他守卫在工具实现开始前阻止调用时，将 `executionStarted: false`。一旦可能已经进行分发，则应保守地报告为 `true`。
- 报告 `outcome: "success"` 或 `outcome: "failure"`。使用运行时提供的结构化失败字段，而不是从显示文本中推断失败。
- 仅对不使用 OpenClaw 工具定义的原生工具使用 `nativeMutation`。在其中提供由协议拥有的变更和重放事实；不要将 OpenClaw 的变更分类器复制到 harness 中。

回调会返回该调用的规范解析结果。将其
`lastToolError` 传入 `AgentHarnessAttemptResult`，并在 harness 投影中使用其中的执行、参数和副作用事实，而不是推导出并行状态。主机会在无关工具成功时保留未解决的变更失败，并且只会在匹配的操作成功后清除它。

出于源代码兼容性考虑，该回调对于较旧的实验性 harness 仍然是可选的。但对于执行工具的 harness，可选并不意味着可以忽略：如果没有终端报告，OpenClaw 就无法在后续工具调用之间保留变更工具失败事实，包括安静的心跳完成。

### 已结算工具的最终处理

当 harness 已完成所有工具调用，但其原生轮次结束时没有助手文本，OpenClaw 可能需要再生成一次最终可见回答。harness 可以通过实现
`finalizeSettledTurn({ attempt, settledAttempt })` 来选择启用此恢复机制。

该回调是一项独立能力，而不是另一个普通 attempt。它必须：

- 使用精确的受限原生 transcript，或使用在已结算工具结果边界处冻结的完整应用 transcript；
- 不暴露工具、权限授予或用户输入能力、原生执行钩子、agents、skills、memory、调度、扩展或远程控制；
- 仅发送主机提供的最终处理提示；并且
- 如果其选择的 transcript/隔离策略无法强制执行这些限制，则安全失败。

OpenClaw 会在普通 attempt 和重试循环之外，将该回调作为终端子操作调用一次。失败会以考虑副作用的不完整轮次警告结束运行；它不能进入普通的身份验证/配置文件轮换、模型回退、上下文恢复、压缩继续、或由钩子请求的修订路径。最终处理还会跳过插件提示词修改、`before_agent_run`、LLM 输入/输出、终端修订和 `agent_end` 钩子。Core 诊断仍会记录该操作及其失败。

该回调返回 `AgentHarnessSettledTurnFinalizationResult`，而不是普通的 attempt 结果。其公共字段仅限于已完成的助手消息、最终处理调用的使用情况、transcript 所有权元数据和诊断跟踪。工具、传递、媒体、生成、生命周期、重放、会话和回退状态不能跨越此结果边界。未知字段和助手工具调用会触发安全失败。

内部复用完整 attempt 引擎的 harness，可以在返回前调用
`projectSettledTurnFinalizationAttemptResult(...)`。该辅助函数会拒绝规范失败、工具、传递、重放和生命周期证据，然后仅投影出范围受限的结果。它是在原生隔离之后提供的纵深防御措施，不能替代移除原生能力表面。

基于投影的 harness 必须将完整上下文放入
`settledAttempt.settledTurnFinalizationContext`，并设置
`source: "openclaw-transcript"`。它必须在已结算轮次完成镜像后捕获活动分支，证明当前提示以及截至该边界的每个当前工具调用/结果都已存在，并在返回 attempt 前冻结生成的消息数组。最终处理器必须拒绝缺失、不受支持、有歧义或超大的上下文。它不得截断消息、丢弃较早的历史记录，也不得将此应用 transcript 描述为精确的原生历史记录。恢复单个受限原生会话的 harness 不需要此投影字段。

不要通过调用带有尽力而为的 `disableTools` 提示的 `runAttempt` 来实现此回调。harness 所有者必须强制执行完整的原生能力边界。OpenClaw 不提供通用回退机制，因为它无法证明任意原生运行时遵守了这些限制。

出于实验性第三方 harness 兼容性的考虑，该回调仍然是可选的。当所选 harness 未实现它时，OpenClaw 会保留现有的不完整轮次错误，而不是冒险产生重复副作用。

## 当前限制

- 公共导入路径是通用的，但某些 attempt/result 类型别名
  仍保留旧名称以兼容。
- 第三方 harness 安装处于实验阶段。除非你需要原生会话运行时，
  否则优先使用提供方插件。
- 支持在不同轮次之间切换 harness。不要在一轮中途，在原生工具、审批、助手文本或消息
  发送已经开始后切换 harness。

## 相关

- [SDK 概览](/plugins/sdk-overview)
- [运行时辅助工具](/plugins/sdk-runtime)
- [提供方插件](/plugins/sdk-provider-plugins)
- [Codex Harness](/plugins/codex-harness)
- [模型提供方](/concepts/model-providers)
