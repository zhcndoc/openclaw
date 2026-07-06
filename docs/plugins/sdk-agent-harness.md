---
summary: "用于替代底层嵌入式 agent 执行器的插件实验性 SDK 接口"
title: "Agent harness 插件"
sidebarTitle: "Agent Harness"
read_when:
  - 你正在更改嵌入式 agent 运行时或 harness 注册表
  - 你正在从捆绑或可信插件中注册 agent harness
  - 你需要了解 Codex 插件与模型提供方之间的关系
---

**agent harness** 是一个已准备好的 OpenClaw agent 回合的底层执行器。它不是模型提供方，不是通道，也不是工具注册表。关于面向用户的心智模型，请参见 [Agent runtimes](/concepts/agent-runtimes)。

仅将此接口用于捆绑或可信的原生插件。该契约仍处于实验阶段，因为参数类型有意与当前的嵌入式运行器保持一致。

## 何时使用 harness

当某个模型家族拥有自己的原生会话运行时，而常规的 OpenClaw provider 传输不是合适的抽象时，请注册一个 agent harness：

- 一个拥有线程和压缩能力的原生 coding-agent 服务器
- 必须流式传输原生 plan/reasoning/tool 事件的本地 CLI 或守护进程
- 需要除了 OpenClaw 会话转录之外还拥有自己的 resume id 的模型运行时

不要只是为了增加一个新的 LLM API 就注册 harness。对于普通的 HTTP 或 WebSocket 模型 API，请构建一个 [provider plugin](/plugins/sdk-provider-plugins)。

## 核心仍然负责什么

在选择 harness 之前，OpenClaw 已经解析了：

- provider 和模型
- 运行时认证状态
- thinking level 和上下文预算
- OpenClaw 的转录/session 文件
- 工作区、沙箱和工具策略
- 通道回复回调和流式回调
- 模型回退与实时模型切换策略

一个 harness 会执行一个准备好的尝试；它不会选择 provider、替换通道
传递，或静默切换模型。

这个准备好的尝试还包括 `params.runtimePlan`，这是一个由 OpenClaw 拥有的
用于运行时决策的策略包，必须在 OpenClaw 和
原生 harness 之间保持共享：

- `runtimePlan.tools.normalize(...)` 和 `runtimePlan.tools.logDiagnostics(...)`
  用于 provider 感知的工具 schema 策略
- `runtimePlan.transcript.resolvePolicy(...)` 用于转录清理和
  tool-call 修复策略
- `runtimePlan.delivery.isSilentPayload(...)` 用于共享 `NO_REPLY` 和媒体
  传递抑制
- `runtimePlan.outcome.classifyRunResult(...)` 用于模型回退
  分类
- `runtimePlan.observability` 用于已解析的 provider/model/harness 元数据

harness 可以使用该计划来做出需要与 OpenClaw 行为一致的决策，
但应将其视为宿主拥有的尝试状态：不要修改它，也不要在一次 turn 中使用它来切换
provider/model。

## 注册一个 harness

**导入：** `openclaw/plugin-sdk/agent-harness`

```typescript
import type { AgentHarness } from "openclaw/plugin-sdk/agent-harness";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const myHarness: AgentHarness = {
  id: "my-harness",
  label: "我的原生 agent harness",

  supports(ctx) {
    return ctx.provider === "my-provider"
      ? { supported: true, priority: 100 }
      : { supported: false };
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
  name: "My Native Agent",
  description: "通过原生 agent 守护进程运行选定模型。",
  register(api) {
    api.registerAgentHarness(myHarness);
  },
});
```

## 选择策略

OpenClaw 会在 provider/model 解析之后选择 harness：

1. 模型范围的运行时策略优先。
2. provider 范围的运行时策略其次。
3. `auto` 会询问已注册的 harness 是否支持已解析的 provider/model。
4. 如果没有已注册的 harness 匹配，OpenClaw 会使用其嵌入式运行时。

插件 harness 的失败会表现为运行失败。在 `auto` 模式下，只有当没有已注册的插件 harness 支持已解析的 provider/model 时，才会使用嵌入式回退。一旦某个插件 harness 接管了某次运行，OpenClaw 就不会通过另一个运行时重放同一轮，因为这可能改变认证/运行时语义，或导致副作用重复。

整个会话和整个代理级别的运行时固定值在选择时会被忽略。这包括过期的 session `agentHarnessId` 值、`agents.defaults.agentRuntime`、`agents.list[].agentRuntime` 和 `OPENCLAW_AGENT_RUNTIME`。`/status` 会显示从 provider/model 路由中选出的有效运行时。

如果选中的 harness 出乎意料，请启用 `agents/harness` 调试日志，并检查 gateway 的结构化 `agent harness selected` 记录：其中包含所选的 harness id、选择原因、运行时/回退策略，以及在 `auto` 模式下每个插件候选项的支持结果。

捆绑的 Codex 插件会将 `codex` 注册为其 harness id。核心会将其视为普通的插件 harness id；Codex 特定别名应放在插件或运维配置中，而不是放在共享运行时选择器中。

## provider 与 harness 配对

大多数 harness 还应同时注册一个 provider。provider 会将模型引用、认证状态、模型元数据以及 `/model` 选择暴露给 OpenClaw 的其他部分。随后 harness 通过 `supports(...)` 声明对该 provider 的认领。

捆绑的 Codex 插件遵循此模式：

- 首选用户模型引用：`openai/gpt-5.5`
- 兼容引用：旧的 `codex/gpt-*` 引用仍然可接受，但新配置不应再将其用作普通 provider/model 引用
- harness id：`codex`
- 认证：合成的 provider 可用性，因为 Codex harness 拥有原生 Codex 登录/会话
- app-server 请求：OpenClaw 将裸模型 id 发送给 Codex，并让 harness 与原生 app-server 协议通信

Codex 插件是增量式的。官方 OpenAI API 端点（`api.openai.com`）上的普通 `openai/gpt-*` agent 引用默认会选择 Codex harness；自定义的 OpenAI 兼容 base URL 则保持其已配置的 provider 行为不变。较旧的 `codex/gpt-*` 引用为兼容性目的，仍会同时选择 Codex provider 和 harness。

有关运维设置、模型前缀示例以及仅 Codex 的配置，请参见
[Codex Harness](/plugins/codex-harness)。

OpenClaw 要求 Codex app-server 版本为 `0.125.0` 或更高。Codex 插件会检查 app-server 初始化握手并阻止更旧或未指定版本的服务器，因此 OpenClaw 只会在其已测试过的协议表面上运行。

### 工具结果中间件

捆绑插件以及显式启用、且其 manifest contract 匹配的已安装插件，可以通过 `api.registerAgentToolResultMiddleware(...)` 挂载与运行时无关的 tool-result 中间件，前提是其 manifest 在 `contracts.agentToolResultMiddleware` 中声明了目标 runtime id。这个受信任的接缝用于异步 tool-result 转换，这些转换必须在 OpenClaw 或 Codex 将工具输出回传给模型之前运行。

旧的捆绑插件仍然可以为仅 Codex app-server 的中间件使用 `api.registerCodexAppServerExtensionFactory(...)`，但新的结果转换应使用与运行时无关的 API。仅嵌入式 runner 可用的 `api.registerEmbeddedExtensionFactory(...)` 钩子已被移除；嵌入式 tool-result 转换必须使用与运行时无关的中间件。

### 终态分类

拥有自身协议映射的原生 harness，可以在一次完成的 turn 没有产生可见 assistant 文本时，使用 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `classifyAgentHarnessTerminalOutcome(...)`。该辅助函数会返回 `empty`、`reasoning-only` 或 `planning-only`，以便 OpenClaw 的回退策略决定是否切换到其他模型重试。`planning-only` 需要 harness 显式提供 `planText` 字段；OpenClaw 不会从 assistant 的自然语言中推断它。该辅助函数会有意忽略提示词错误、进行中的 turn，以及诸如 `NO_REPLY` 之类的刻意静默回复。

### Agent-end 副作用

原生 harness 在完成一次尝试后，必须调用 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `runAgentEndSideEffects(...)`。它会派发可移植的 `agent_end` 钩子以及 OpenClaw 的研究捕获，而不会延迟交互式回复。对于本地的非交互式运行，如果在这些副作用完成之前尝试不得解析，则使用 `awaitAgentEndSideEffects(...)`。这两个辅助函数都接受与 `runAgentHarnessAgentEndHook(...)` 相同的 `{ event, ctx }` 负载；它们的失败不会改变已完成尝试的结果。

### 用户输入与工具界面

公开 runtime 级用户输入请求的原生 harness 应使用 `openclaw/plugin-sdk/agent-harness-runtime` 中的用户输入辅助函数来格式化提示，通过 OpenClaw 的阻塞回复路径传递，并将选择/自由形式答案规范化回该 runtime 的原生响应形状。该辅助函数会保持通道/TUI 展现一致，而每个 harness 仍保留自己的协议解析和待处理请求生命周期。

需要类似 PI 的紧凑工具路由的原生 harness 应使用 `openclaw/plugin-sdk/agent-harness-tool-runtime` 中的 `createAgentHarnessToolSurfaceRuntime(...)`。它负责工具搜索/代码模式控制选择、本地模型精简默认值、与运行时兼容的 schema 过滤、隐藏目录执行、目录 hydration 以及目录清理。harness 仍然负责其 SDK 特定的工具转换和原生执行回调。

### 原生 Codex harness 模式

捆绑的 `codex` harness 是嵌入式 OpenClaw agent turn 的原生 Codex 模式。请先启用捆绑的 `codex` 插件，并在配置使用受限 allowlist 时将 `codex` 加入 `plugins.allow`。原生 app-server 配置应使用 `openai/gpt-*`；OpenAI agent turn 默认会选择 Codex harness。旧的 Codex 模型引用路由应使用 `openclaw doctor --fix` 修复，而旧的 `codex/*` 模型引用仍作为原生 harness 的兼容别名保留。

当此模式运行时，Codex 拥有原生线程 id、恢复行为、压缩以及 app-server 执行。OpenClaw 仍然拥有聊天通道、可见的转录镜像、工具策略、审批、媒体传递以及会话选择。需要证明只有 Codex app-server 路径可以认领该运行时，请使用 provider/model `agentRuntime.id: "codex"`。显式插件 runtime 会失败关闭；Codex app-server 选择失败和 runtime 失败不会通过其他 runtime 重试。

## 运行时严格性

默认情况下，OpenClaw 使用 `auto` provider/model 运行时策略：已注册的
插件 harness 可以声明一个 provider/model 对；当没有匹配项时，内嵌运行时
会处理该 turn。官方 OpenAI provider 上的 OpenAI agent 引用默认使用 Codex。
当缺少 harness 选择时，应使用显式的 provider/model 插件运行时，
例如 `agentRuntime.id: "codex"`，这样就会失败，而不是通过内嵌运行时路由。
已选定的插件 harness 失败时总是直接硬失败。这不会阻止显式的 provider/model
`agentRuntime.id: "openclaw"`。

用于仅 Codex 的嵌入式运行：

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
      "model": "openai/gpt-5.5"
    }
  }
}
```

如果你希望某个规范模型使用 CLI 后端，请把运行时放在该模型条目上：

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-opus-4-8",
      "models": {
        "anthropic/claude-opus-4-8": {
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
        "model": "openai/gpt-5.5",
        "models": {
          "openai/gpt-5.5": {
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

harness 可能会保留原生会话 id、线程 id 或守护进程端的恢复令牌。将该绑定显式地与 OpenClaw 会话关联起来，并持续将用户可见的 assistant/tool 输出镜像到 OpenClaw 转录中。

OpenClaw 转录仍然是以下功能的兼容层：

- channel-visible 会话历史
- 转录搜索和索引
- 在后续轮次中切换回内置的 OpenClaw harness
- 通用的 `/new`、`/reset` 以及会话删除行为

如果你的 harness 存储了 sidecar 绑定，请实现 `reset(...)`，以便当所属的 OpenClaw 会话被重置时，OpenClaw 可以清除它。

## 工具和媒体结果

Core 会构建 OpenClaw 工具列表，并将其传入已准备好的
attempt。当 harness 执行动态工具调用时，请通过 harness 结果结构返回工具结果，
而不是自行发送 channel media。

这样可以让文本、图片、视频、音乐、TTS、审批和 messaging-tool
输出，与由 OpenClaw 支持的运行保持在相同的传递路径上。

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
