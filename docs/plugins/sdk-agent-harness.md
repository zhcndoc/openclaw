---
summary: "用于替代底层嵌入式 agent 执行器的插件实验性 SDK 接口"
title: "Agent harness 插件"
sidebarTitle: "Agent Harness"
read_when:
  - 你正在更改嵌入式 agent 运行时或 harness 注册表
  - 你正在从捆绑或可信插件中注册 agent harness
  - 你需要了解 Codex 插件与模型提供方之间的关系
---

**agent harness** 是一个已准备好的 OpenClaw agent 单次 turn 的底层执行器。它不是模型提供方，不是通道，也不是工具注册表。面向用户的心智模型请参见 [Agent runtimes](/concepts/agent-runtimes)。

仅将此接口用于捆绑或可信的原生插件。该契约仍处于实验阶段，因为参数类型是刻意与当前嵌入式运行器保持一致的。

## 何时使用 harness

当某个模型家族拥有自己的原生会话运行时，而标准的 OpenClaw provider 传输并不是合适抽象时，请注册一个 agent harness。

示例：

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

这种分层是有意为之。harness 运行的是一个已准备好的 attempt；它不会选择 provider，不会替代通道投递，也不会静默切换模型。

已准备好的 attempt 还包含 `params.runtimePlan`，这是一个由 OpenClaw 拥有的策略包，用于必须在 PI 和原生 harness 之间共享的运行时决策：

- `runtimePlan.tools.normalize(...)` 和
  `runtimePlan.tools.logDiagnostics(...)`，用于感知 provider 的工具 schema 策略
- `runtimePlan.transcript.resolvePolicy(...)`，用于转录净化和工具调用修复策略
- `runtimePlan.delivery.isSilentPayload(...)`，用于共享的 `NO_REPLY` 和媒体投递抑制
- `runtimePlan.outcome.classifyRunResult(...)`，用于模型回退分类
- `runtimePlan.observability`，用于已解析的 provider/model/harness 元数据

harness 可以使用该 plan 做出需要与 PI 行为一致的决策，但仍应将其视为宿主拥有的 attempt 状态。不要修改它，也不要用它在一次 turn 内切换 provider/model。

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

1. Model-scoped runtime policy wins.
2. Provider-scoped runtime policy comes next.
3. `auto` asks registered harnesses if they support the resolved
   provider/model.
4. If no registered harness matches, OpenClaw uses PI unless PI fallback is
   disabled.

插件 harness 的失败会表现为运行失败。在 `auto` 模式下，只有当没有已注册的插件 harness 支持已解析的 provider/model 时，才会使用 PI fallback。一旦某个插件 harness 已经认领了一个 run，OpenClaw 不会再通过 PI 重放同一个 turn，因为那可能改变认证/运行时语义或产生重复副作用。

Whole-session and whole-agent runtime pins are ignored by selection. That
includes stale session `agentHarnessId` values, `agents.defaults.agentRuntime`,
`agents.list[].agentRuntime`, and `OPENCLAW_AGENT_RUNTIME`. `/status` shows the
effective runtime selected from the provider/model route.
If the selected harness is surprising, enable `agents/harness` debug logging and
inspect the gateway's structured `agent harness selected` record. It includes
the selected harness id, selection reason, runtime/fallback policy, and, in
`auto` mode, each plugin candidate's support result.

捆绑的 Codex 插件会将 `codex` 注册为其 harness id。核心将其视为普通的插件 harness id；Codex 特定别名应放在插件或运维配置中，而不是放在共享运行时选择器中。

## provider 与 harness 配对

大多数 harness 还应同时注册一个 provider。provider 会将模型引用、认证状态、模型元数据以及 `/model` 选择暴露给 OpenClaw 的其他部分。随后 harness 通过 `supports(...)` 声明对该 provider 的认领。

捆绑的 Codex 插件遵循此模式：

- preferred user model refs: `openai/gpt-5.5`
- compatibility refs: legacy `codex/gpt-*` refs remain accepted, but new
  configs should not use them as normal provider/model refs
- harness id: `codex`
- auth: synthetic provider availability, because the Codex harness owns the
  native Codex login/session
- app-server request: OpenClaw sends the bare model id to Codex and lets the
  harness talk to the native app-server protocol

The Codex plugin is additive. Plain `openai/gpt-*` agent refs on the official
OpenAI provider select the Codex harness by default. Older `codex/gpt-*` refs
still select the Codex provider and harness for compatibility.

有关运维设置、模型前缀示例以及仅 Codex 的配置，请参见
[Codex Harness](/plugins/codex-harness)。

OpenClaw 要求 Codex app-server `0.125.0` 或更高版本。Codex 插件会检查 app-server 初始化握手，并阻止较旧或未版本化的服务器，以便 OpenClaw 仅在其经过测试的协议表面上运行。`0.125.0` 的最低版本包含在 Codex `0.124.0` 中落地的原生 MCP hook payload 支持，同时将 OpenClaw 锁定到更新且经过测试的稳定版本线。

### 工具结果中间件

当其 manifest 在 `contracts.agentToolResultMiddleware` 中声明了目标运行时 id 时，捆绑插件可以通过 `api.registerAgentToolResultMiddleware(...)` 附加与运行时无关的工具结果中间件。这个受信任的接入点用于异步工具结果转换，这些转换必须在 PI 或 Codex 将工具输出反馈回模型之前运行。

旧的捆绑插件仍可使用
`api.registerCodexAppServerExtensionFactory(...)` 处理仅限 Codex app-server 的中间件，但新的结果转换应使用与运行时无关的 API。
仅限 Pi 的 `api.registerEmbeddedExtensionFactory(...)` 钩子已被移除；Pi 的工具结果转换必须使用与运行时无关的中间件。

### 终态分类

拥有自己协议投影的原生 harness，可以在完成的 turn 未产生可见 assistant 文本时，使用
`openclaw/plugin-sdk/agent-harness-runtime` 中的 `classifyAgentHarnessTerminalOutcome(...)`。该辅助函数会返回 `empty`、`reasoning-only` 或
`planning-only`，以便 OpenClaw 的 fallback 策略决定是否改用其他模型重试。它有意不会对 prompt 错误、进行中的 turn，以及诸如 `NO_REPLY` 之类的刻意静默回复进行分类。

### 原生 Codex harness 模式

捆绑的 `codex` harness 是嵌入式 OpenClaw agent turn 的原生 Codex 模式。请先启用捆绑的 `codex` 插件，并在你的配置使用限制性 allowlist 时，将 `codex` 加入 `plugins.allow`。原生 app-server 配置应使用 `openai/gpt-*`；OpenAI agent turn 会默认选择 Codex harness。旧的 `openai-codex/*` 路由应使用 `openclaw doctor --fix` 修复，而旧的 `codex/*` model refs 仍作为原生 harness 的兼容别名保留。

在此模式运行时，Codex 拥有原生线程 id、恢复行为、压缩以及 app-server 执行。OpenClaw 仍然拥有聊天通道、可见转录镜像、工具策略、审批、媒体投递和会话选择。当你需要证明只有 Codex app-server 路径能够认领该 run 时，请在 provider/model 中使用 `agentRuntime.id: "codex"`。显式插件运行时会失败关闭；Codex app-server 选择失败和运行时失败不会通过 PI 重试。

## 运行时严格性

默认情况下，OpenClaw 使用 `auto` provider/model runtime policy：已注册的插件 harness 可以认领一个 provider/model 对，而当没有任何匹配时，PI 负责处理该 turn。官方 OpenAI provider 上的 OpenAI agent refs 默认选择 Codex。若缺少 harness 选择时应当失败而不是通过 PI 路由，请使用显式的 provider/model 插件运行时，例如 `agentRuntime.id: "codex"`。已选中的插件 harness 失败时总是硬失败。这不会阻止显式的 provider/model `agentRuntime.id: "pi"`。

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
      "model": "anthropic/claude-opus-4-7",
      "models": {
        "anthropic/claude-opus-4-7": {
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

此设置只控制嵌入式 agent harness。它不会禁用图片、视频、音乐、TTS、PDF 或其他 provider 特定的模型路由。

## 原生会话和转录镜像

一个 harness 可能会保留原生会话 id、线程 id，或守护进程端的恢复 token。
请将该绑定明确关联到 OpenClaw 会话，并将用户可见的助手/工具输出持续镜像到 OpenClaw 转录中。

OpenClaw 转录仍然是以下功能的兼容层：

- 通道可见的会话历史
- 转录搜索和索引
- 在后续轮次切回内置 PI harness
- 通用的 `/new`、`/reset` 以及会话删除行为

如果你的 harness 存储了一个旁路绑定，请实现 `reset(...)`，这样当所属的 OpenClaw 会话被重置时，OpenClaw 就可以清除它。

## 工具和媒体结果

Core 会构建 OpenClaw 工具列表并将其传入准备好的尝试中。
当 harness 执行动态工具调用时，请通过 harness 结果结构返回工具结果，而不是自行发送通道媒体。

这使得文本、图像、视频、音乐、TTS、审批以及消息工具输出都沿用与 PI 支持运行相同的传递路径。

## 当前限制

- 公共导入路径是通用的，但某些 attempt/result 类型别名为了兼容性仍保留 `Pi` 名称。
- 第三方 harness 安装仍处于实验阶段。除非你需要原生会话运行时，否则优先使用提供方插件。
- 支持跨轮次切换 harness。在一轮之中，一旦原生工具、审批、助手文本或消息发送已经开始，就不要切换 harness。

## 相关

- [SDK 概览](/plugins/sdk-overview)
- [运行时辅助工具](/plugins/sdk-runtime)
- [提供方插件](/plugins/sdk-provider-plugins)
- [Codex Harness](/plugins/codex-harness)
- [模型提供方](/concepts/model-providers)
