---
summary: "用于替换底层嵌入式代理执行器的插件实验性 SDK 表面"
title: "Agent harness 插件"
sidebarTitle: "Agent Harness"
read_when:
  - 您正在更改嵌入式代理运行时或 harness 注册表
  - 您正在从捆绑或受信任的插件注册代理 harness
  - 您需要了解 Codex 插件如何与模型提供商关联
---

**agent harness** 是一个已准备好的 OpenClaw 代理
回合的底层执行器。它不是模型提供商，不是通道，也不是工具注册表。
有关面向用户的心智模型，请参阅 [Agent runtimes](/concepts/agent-runtimes)。

仅将此项表面用于捆绑或受信任的原生插件。该契约仍然是实验性的，因为参数类型有意镜像了当前的嵌入式运行器。

## 何时使用 harness

当模型家族拥有自己的原生会话运行时且正常的 OpenClaw 提供商传输是错误的抽象时，注册一个 agent harness。

示例：

- 一个拥有线程和压缩的原生 coding-agent 服务器
- 一个必须流式传输原生计划/推理/工具事件的本地 CLI 或守护进程
- 一个除了 OpenClaw 会话转录外还需要自己的恢复 id 的模型运行时

**不要**仅仅为了添加新的 LLM API 而注册 harness。对于正常的 HTTP 或 WebSocket 模型 API，构建一个 [提供商插件](/plugins/sdk-provider-plugins)。

## Core 仍然拥有的内容

在选择 harness 之前，OpenClaw 已经解析了：

- 提供商和模型
- 运行时认证状态
- 思考级别和上下文预算
- OpenClaw 转录/会话文件
- 工作区、沙盒和工具策略
- 通道回复回调和流式回调
- 模型回退和实时模型切换策略

这种拆分是有意的。harness 运行一个准备好的尝试；它不选择提供商，不替换通道交付，也不静默切换模型。

## 注册 harness

**导入：** `openclaw/plugin-sdk/agent-harness`

```typescript
import type { AgentHarness } from "openclaw/plugin-sdk/agent-harness";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const myHarness: AgentHarness = {
  id: "my-harness",
  label: "My native agent harness",

  supports(ctx) {
    return ctx.provider === "my-provider"
      ? { supported: true, priority: 100 }
      : { supported: false };
  },

  async runAttempt(params) {
    // 启动或恢复您的原生线程。
    // 使用 params.prompt, params.tools, params.images, params.onPartialReply,
    // params.onAgentEvent 和其他准备好的尝试字段。
    return await runMyNativeTurn(params);
  },
};

export default definePluginEntry({
  id: "my-native-agent",
  name: "My Native Agent",
  description: "通过原生代理守护进程运行所选模型。",
  register(api) {
    api.registerAgentHarness(myHarness);
  },
});
```

## 选择策略

OpenClaw 在提供商/模型解析后选择 harness：

1. 现有会话记录的 harness id 优先，因此配置/env 更改不会将该转录热切换到其他运行时。
2. `OPENCLAW_AGENT_RUNTIME=<id>` 为尚未固定的会话强制使用具有该 id 的已注册 harness。
3. `OPENCLAW_AGENT_RUNTIME=pi` 强制使用内置 PI harness。
4. `OPENCLAW_AGENT_RUNTIME=auto` 会询问已注册的 harness 是否支持解析出的提供商/模型。
5. 如果没有已注册的 harness 匹配，OpenClaw 会使用 PI，除非已禁用 PI 回退。

插件 harness 失败会作为运行失败暴露出来。在 `auto` 模式下，只有当没有注册的插件 harness 支持解析出的提供商/模型时，才会使用 PI 回退。一旦某个插件 harness 已经接管了一次运行，OpenClaw 不会再通过 PI 重放同一回合，因为那可能改变认证/运行时语义，或重复产生副作用。

选定的 harness id 会在嵌入式运行后与会话 id 一起持久化。创建于 harness 固定之前的旧会话，在具有转录历史后会被视为固定到 PI。更改 PI 和原生插件 harness 之间的切换时，请使用新的/重置的会话。`/status` 会在 `Fast` 旁边显示非默认的 harness id，例如 `codex`；PI 保持隐藏，因为它是默认兼容路径。如果所选 harness 出乎意料，请启用 `agents/harness` 调试日志，并检查网关结构化的 `agent harness selected` 记录。它包含所选 harness id、选择原因、运行时/回退策略，以及在 `auto` 模式下每个插件候选项的支持结果。

捆绑的 Codex 插件将 `codex` 注册为其 harness id。Core 将其视为普通的插件 harness id；Codex 特定别名应放在插件或运维配置中，而不是共享运行时选择器中。

## 提供商加 harness 配对

大多数 harness 也应该注册一个提供商。提供商使模型引用、认证状态、模型元数据和 `/model` 选择对 OpenClaw 的其余部分可见。然后 harness 在 `supports(...)` 中声明该提供商。

捆绑的 Codex 插件遵循此模式：

- preferred user model refs: `openai/gpt-5.5` plus
  `embeddedHarness.runtime: "codex"`
- compatibility refs: legacy `codex/gpt-*` refs remain accepted, but new
  configs should not use them as normal provider/model refs
- harness id: `codex`
- auth: synthetic provider availability, because the Codex harness owns the
  native Codex login/session
- app-server request: OpenClaw sends the bare model id to Codex and lets the
  harness talk to the native app-server protocol

Codex 插件是增量式的。普通的 `openai/gpt-*` 引用仍然会继续使用正常的 OpenClaw 提供商路径，除非您通过 `embeddedHarness.runtime: "codex"` 强制使用 Codex harness。较旧的 `codex/gpt-*` 引用仍会为兼容性选择 Codex 提供商和 harness。

有关操作员设置、模型前缀示例和仅 Codex 配置，请参阅 [Codex Harness](/plugins/codex-harness)。

OpenClaw 需要 Codex 应用服务器 `0.118.0` 或更高版本。Codex 插件检查应用服务器初始化握手，并阻止较旧或未版本化的服务器，以便 OpenClaw 仅针对经过测试的协议表面运行。

### Tool-result middleware

捆绑插件可以通过
`api.registerAgentToolResultMiddleware(...)` 挂接运行时中立的 tool-result 中间件，只要其 manifest 在 `contracts.agentToolResultMiddleware` 中声明了
目标 runtime id。这个受信任的接缝适用于必须在 PI 或 Codex 将工具输出反馈到模型之前运行的异步 tool-result 转换。

旧的捆绑插件仍然可以将
`api.registerCodexAppServerExtensionFactory(...)` 用于仅限 Codex app-server 的
中间件，但新的结果转换应使用运行时中立的 API。
已移除仅 PI 的 `api.registerEmbeddedExtensionFactory(...)` 钩子；
PI tool-result 转换必须使用运行时中立的中间件。

### 原生 Codex harness 模式

捆绑的 `codex` harness 是嵌入式 OpenClaw
代理回合的原生 Codex 模式。先启用捆绑的 `codex` 插件，如果您的配置使用限制性允许列表，还要在
`plugins.allow` 中包含 `codex`。原生 app-server 配置应使用 `openai/gpt-*` 并配合 `embeddedHarness.runtime: "codex"`。
如果改为通过 PI 使用 Codex OAuth，请使用 `openai-codex/*`。旧的 `codex/*`
模型引用仍然是原生 harness 的兼容别名。

当此模式运行时，Codex 拥有原生线程 id、恢复行为、
压缩和 app-server 执行。OpenClaw 仍然拥有聊天通道、
可见转录镜像、工具策略、审批、媒体传输和会话
选择。在需要证明只有 Codex app-server 路径可以接管运行时，请使用 `embeddedHarness.runtime: "codex"` 且不要使用 `fallback` 覆盖。
显式插件运行时默认已经是失败即关闭。仅当您有意希望 PI 处理缺失的 harness 选择时，才设置 `fallback: "pi"`。
Codex app-server 失败已经会直接失败，而不是通过 PI 重试。

## 禁用 PI 回退

默认情况下，OpenClaw 运行嵌入式代理时，`agents.defaults.embeddedHarness` 设置为 `{ runtime: "auto", fallback: "pi" }`。在 `auto` 模式下，注册的插件 harness 可以声明一个提供商/模型对。如果没有任何匹配项，OpenClaw 会回退到 PI。

在 `auto` 模式下，如果您需要缺失的插件 harness 选择直接失败而不是使用 PI，请设置 `fallback: "none"`。显式插件运行时，例如
`runtime: "codex"`，默认情况下已经是失败即关闭，除非在同一配置或环境覆盖范围中设置了 `fallback: "pi"`。选定的插件 harness 失败始终会硬失败。这不会阻止显式的 `runtime: "pi"` 或 `OPENCLAW_AGENT_RUNTIME=pi`。

对于仅 Codex 的嵌入式运行：

```json
{
  "agents": {
    "defaults": {
      "model": "openai/gpt-5.5",
      "embeddedHarness": {
        "runtime": "codex"
      }
    }
  }
}
```

如果您希望任何已注册的插件 harness 声明匹配的模型，但绝不希望 OpenClaw 静默回退到 PI，请保持 `runtime: "auto"` 并禁用回退：

```json
{
  "agents": {
    "defaults": {
      "embeddedHarness": {
        "runtime": "auto",
        "fallback": "none"
      }
    }
  }
}
```

每个代理的覆盖使用相同的形状：

```json
{
  "agents": {
    "defaults": {
      "embeddedHarness": {
        "runtime": "auto",
        "fallback": "pi"
      }
    },
    "list": [
      {
        "id": "codex-only",
        "model": "openai/gpt-5.5",
        "embeddedHarness": {
          "runtime": "codex",
          "fallback": "none"
        }
      }
    ]
  }
}
```

`OPENCLAW_AGENT_RUNTIME` 仍然覆盖配置的运行时。使用 `OPENCLAW_AGENT_HARNESS_FALLBACK=none` 从环境禁用 PI 回退。

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

禁用回退后，当请求的 harness 未注册、不支持解析的提供商/模型或在产生回合副作用之前失败时，会话会早期失败。这对于仅 Codex 的部署和必须证明 Codex 应用服务器路径实际正在使用的实时测试是故意的。

此设置仅控制嵌入式代理 harness。它不禁用图像、视频、音乐、TTS、PDF 或其他特定于提供商的模型路由。

## 原生会话和转录镜像

harness 可能保留原生会话 id、线程 id 或守护进程侧恢复令牌。保持该绑定与 OpenClaw 会话显式关联，并继续将用户可见的助手/工具输出镜像到 OpenClaw 转录中。

OpenClaw 转录仍然是以下内容的兼容层：

- 通道可见会话历史
- 转录搜索和索引
- 在后续回合切换回内置 PI harness
- 通用 `/new`、`/reset` 和会话删除行为

如果您的 harness 存储侧车绑定，请实现 `reset(...)` 以便 OpenClaw 可以在拥有它的 OpenClaw 会话重置时清除它。

## 工具和媒体结果

Core 构建 OpenClaw 工具列表并将其传入准备好的尝试中。当 harness 执行动态工具调用时，通过 harness 结果形状返回工具结果，而不是自己发送通道媒体。

这使文本、图像、视频、音乐、TTS、批准和消息传递工具输出保持在与 PI 支持的运行相同的交付路径上。

## 当前限制

- 公共导入路径是通用的，但一些尝试/结果类型别名仍然携带 `Pi` 名称以保持兼容性。
- 第三方 harness 安装是实验性的。在需要原生会话运行时之前，首选提供商插件。
- 支持跨回合切换 harness。不要在回合中间切换 harness，即在原生工具、批准、助手文本或消息发送开始之后。

## 相关内容

- [SDK 概述](/plugins/sdk-overview)
- [运行时助手](/plugins/sdk-runtime)
- [提供商插件](/plugins/sdk-provider-plugins)
- [Codex Harness](/plugins/codex-harness)
- [模型提供商](/concepts/model-providers)
