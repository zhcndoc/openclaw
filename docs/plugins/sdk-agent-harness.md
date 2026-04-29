---
summary: "用于替代底层嵌入式 agent 执行器的插件实验性 SDK 接口"
title: "Agent harness plugins"
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

1. 现有 session 记录的 harness id 优先，因此配置/env 变更不会把该转录热切换到另一个运行时。
2. `OPENCLAW_AGENT_RUNTIME=<id>` 会强制对尚未固定的 session 使用该 id 的已注册 harness。
3. `OPENCLAW_AGENT_RUNTIME=pi` 会强制使用内置 PI harness。
4. `OPENCLAW_AGENT_RUNTIME=auto` 会询问已注册的 harness 是否支持已解析的 provider/model。
5. 如果没有已注册的 harness 匹配，OpenClaw 会使用 PI，除非禁用了 PI fallback。

插件 harness 的失败会表现为运行失败。在 `auto` 模式下，只有当没有已注册的插件 harness 支持已解析的 provider/model 时，才会使用 PI fallback。一旦某个插件 harness 已经认领了一个 run，OpenClaw 不会再通过 PI 重放同一个 turn，因为那可能改变认证/运行时语义或产生重复副作用。

已选择的 harness id 会在嵌入式运行后与 session id 一起持久化。早于 harness pin 机制创建的旧 session，在拥有转录历史后会被视为已固定到 PI。切换 PI 与原生插件 harness 时，请使用新的/重置的 session。`/status` 会显示非默认的 harness id，例如 `codex`，并显示在 `Fast` 旁边；PI 作为默认兼容路径会被隐藏。如果所选 harness 出乎意料，请启用 `agents/harness` 调试日志，并检查 gateway 的结构化 `agent harness selected` 记录。它包含已选中的 harness id、选择原因、运行时/fallback 策略，以及在 `auto` 模式下每个插件候选项的支持结果。

捆绑的 Codex 插件会将 `codex` 注册为其 harness id。核心将其视为普通的插件 harness id；Codex 特定别名应放在插件或运维配置中，而不是放在共享运行时选择器中。

## provider 与 harness 配对

大多数 harness 还应同时注册一个 provider。provider 会将模型引用、认证状态、模型元数据以及 `/model` 选择暴露给 OpenClaw 的其他部分。随后 harness 通过 `supports(...)` 声明对该 provider 的认领。

捆绑的 Codex 插件遵循此模式：

- 首选用户模型引用：`openai/gpt-5.5`，以及
  `agentRuntime.id: "codex"`
- 兼容性引用：仍然接受旧的 `codex/gpt-*` 引用，但新配置不应将其作为普通的 provider/model 引用使用
- harness id：`codex`
- 认证：合成的 provider 可用性，因为 Codex harness 自己持有原生 Codex 登录/session
- app-server 请求：OpenClaw 会把裸模型 id 发送给 Codex，并让 harness 与原生 app-server 协议通信

Codex 插件是增量式的。普通的 `openai/gpt-*` 引用仍会使用标准的 OpenClaw provider 路径，除非你通过 `agentRuntime.id: "codex"` 强制使用 Codex harness。较旧的 `codex/gpt-*` 引用为了兼容性，仍会选择 Codex provider 和 harness。

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

捆绑的 `codex` harness 是嵌入式 OpenClaw agent turn 的原生 Codex 模式。请先启用捆绑的 `codex` 插件，并在配置使用限制性 allowlist 时将 `codex` 加入 `plugins.allow`。原生 app-server 配置应使用 `openai/gpt-*`，并设置 `agentRuntime.id: "codex"`。
若要通过 PI 使用 Codex OAuth，请改用 `openai-codex/*`。旧的 `codex/*` 模型引用仍作为原生 harness 的兼容别名保留。

当此模式运行时，Codex 负责原生线程 id、resume 行为、压缩以及 app-server 执行。OpenClaw 仍负责聊天通道、可见转录镜像、工具策略、审批、媒体投递和 session 选择。当你需要证明只有 Codex app-server 路径能够认领该 run 时，请使用 `agentRuntime.id: "codex"` 且不要覆盖 `fallback`。显式插件运行时默认已经是 fail closed。只有在你有意希望由 PI 处理缺失的 harness 选择时，才设置 `fallback: "pi"`。Codex app-server 失败会直接失败，而不是通过 PI 重试。

## 禁用 PI fallback

默认情况下，OpenClaw 运行嵌入式 agent 时，`agents.defaults.agentRuntime` 设置为 `{ id: "auto", fallback: "pi" }`。在 `auto` 模式下，已注册的插件 harness 可以认领一个 provider/model 对。如果都不匹配，OpenClaw 会回退到 PI。

在 `auto` 模式下，当你需要缺失的插件 harness 选择直接失败而不是使用 PI 时，请将 `fallback: "none"`。显式插件运行时，例如 `runtime: "codex"`，默认已经是 fail closed，除非在同一配置或环境覆盖作用域中设置了 `fallback: "pi"`。已选择的插件 harness 失败时总是会硬失败。这不会阻止显式的 `runtime: "pi"` 或 `OPENCLAW_AGENT_RUNTIME=pi`。

用于仅 Codex 的嵌入式运行：

```json
{
  "agents": {
    "defaults": {
      "model": "openai/gpt-5.5",
      "agentRuntime": {
        "id": "codex"
      }
    }
  }
}
```

如果你希望任何已注册的插件 harness 都可以认领匹配的模型，但又不希望 OpenClaw 静默回退到 PI，请保留 `runtime: "auto"` 并禁用 fallback：

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "auto",
        "fallback": "none"
      }
    }
  }
}
```

按 agent 的覆盖使用相同结构：

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "auto",
        "fallback": "pi"
      }
    },
    "list": [
      {
        "id": "codex-only",
        "model": "openai/gpt-5.5",
        "agentRuntime": {
          "id": "codex",
          "fallback": "none"
        }
      }
    ]
  }
}
```

`OPENCLAW_AGENT_RUNTIME` 仍会覆盖已配置的 runtime。使用
`OPENCLAW_AGENT_HARNESS_FALLBACK=none` 可从环境中禁用 PI fallback。

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

在禁用 fallback 的情况下，当请求的 harness 未注册、不支持已解析的 provider/model，或在产生 turn 副作用之前失败时，session 会提前失败。这对于仅 Codex 的部署以及必须证明实际使用了 Codex app-server 路径的在线测试而言，是有意如此。

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
