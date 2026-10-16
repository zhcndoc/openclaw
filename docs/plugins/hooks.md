---
summary: "插件钩子：拦截 agent、tool、message、session 以及 Gateway 生命周期事件"
title: "插件钩子"
doc-schema-version: 1
read_when:
  - "你正在构建一个需要 before_tool_call、before_agent_reply、message 钩子或生命周期钩子的插件"
  - "你需要从插件中阻止、重写或要求审批 tool 调用"
  - "你正在在内部钩子和插件钩子之间做选择"
  - "你正在将 OpenClaw cron 唤醒投射到外部主机调度器"
---

插件挂钩允许本机 OpenClaw 插件观察或更改代理运行、工具调用、消息传递和生命周期事件。使用 `api.on("hook_name", handler)` 注册类型化处理程序并返回该挂钩记录的结果。

共有三种不同的钩子系统：

| 你想要…                                                                        | 用途                                                                                                             |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 更改提示、门户工具、自定义回复或集成插件生命周期        | 此页面上键入的插件挂钩：`api.on("before_tool_call", ...)`                                              |
| 针对 `/new`、`/reset`、`/stop` 或引导事件运行操作员安装的脚本 | [内部挂钩](/automation/hooks)：`HOOK.md`和冒号事件名称，例如`command:new`或`agent:bootstrap` |
| 通过 HTTP 从外部服务触发代理                                 | [Webhooks](/automation/cron-jobs#webhooks)：网关 HTTP 端点                                              |

插件还可以使用 `api.registerHook(...)` 注册内部钩子。这不是类型化的 API：注册下划线名称（例如 `before_tool_call`）会产生警告，并且类型化的运行程序永远不会调用该注册。对 [hook 目录 ](/plugins/hooks/reference#hook-catalog) 中的每个挂钩使用 `api.on(...)`。

## <a id="quick-start"></a> 快速开始

此示例回复包含 `hook-demo-check` 的用户消息，但不调用模型。它假设您已经有一个工作网关并且可以向其发送正常的聊天消息。有关包元数据、发布和安装选项，请参阅 [ 构建插件](/plugins/building-plugins) 和 [ 插件清单](/plugins/manifest)。

使用以下文件创建本地 `hook-demo` 目录：

```json package.json
{
  "name": "hook-demo",
  "version": "1.0.0",
  "type": "module",
  "openclaw": { "extensions": ["./index.ts"] }
}
```

```json openclaw.plugin.json
{
  "id": "hook-demo",
  "name": "Hook Demo",
  "activation": { "onStartup": true },
  "configSchema": { "type": "object", "additionalProperties": false }
}
```

```typescript index.ts
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "hook-demo",
  name: "Hook Demo",
  description: "Reply to a hook check without a model call.",
  register(api) {
    api.on(
      "before_agent_reply",
      (event) => {
        if (event.cleanedBody.includes("hook-demo-check")) {
          return { handled: true, reply: { text: "Hook is working." } };
        }
      },
      { eligibleTriggers: ["user"] },
    );
  },
});
```

在加载之前检查本地插件代码：本机插件在网关进程中运行。链接并启用目录（`--force` 确认从本地源安装）：

```bash
openclaw plugins install --link ./hook-demo --force
openclaw plugins enable hook-demo
```

授予此插件对 `openclaw.json` 中对话挂钩的访问权限：

```json
{
  "plugins": {
    "entries": {
      "hook-demo": {
        "enabled": true,
        "hooks": { "allowConversationAccess": true }
      }
    }
  }
}
```

将该条目合并到现有配置中，然后让默认的混合重新加载模式应用它并检查：

```bash
openclaw plugins inspect hook-demo --runtime --json
```

将 `hook-demo-check` 作为普通聊天消息发送。预计为 `Hook is working.`；其他消息继续通过正常的代理路径。如果挂钩未运行，请参阅 [ 故障排除](/plugins/hooks#troubleshooting)。

尽管其名称如此，`cleanedBody` 是准备好的运行提示符，并且可以包含通道上下文。该示例匹配独特的标记，而不是假设该字段只是发件人的原始文本。

### <a id="permissions-and-scope"></a> 权限和范围

挂钩注册不会绕过插件加载规则。必须加载并启用插件； `plugins.enabled`、`plugins.allow` 和 `plugins.deny` 仍然适用。更改插件代码后运行 `openclaw plugins reload <id>`。使用默认的混合重新加载模式，挂钩策略会更改热重新加载现有的插件运行时。

- 非捆绑插件需要显式 `plugins.entries.<id>.hooks.allowConversationAccess: true` 用于 `before_model_resolve`、`agent_turn_prepare`、`before_prompt_build`、`before_agent_reply`、`llm_input`、`llm_output`、`before_agent_finalize`、 `agent_end` 和 `before_agent_run`。允许捆绑插件，除非此选项明确为 `false`。
- 如果没有该授权，`session_end` 仍可用作仅元数据生命周期挂钩。仅当有效对话访问策略允许时，其有界 `ctx.endedTranscript` 读取器才可用；请参阅 [ 会话生命周期合约 ](/plugins/hooks/reference#hook-catalog)。
- `allowPromptInjection: false` 阻止 `agent_turn_prepare`、`before_prompt_build`、`heartbeat_prompt_contribution` 和持久的下一回合注入。它默认为允许，但不授予对话访问权限。因此，前两个挂钩需要两种权限。
- 这些是特定的注册门，而不是沙箱或每个可以看到消息数据的挂钩的通用过滤器。仅安装您信任的插件。

隐身会话不会发送 `llm_input` 或 `llm_output` 观察结果。他们的 `agent_end` 挂钩仍然接收运行标识、成功以及清理和结算的持续时间，但接收空的 `messages` 并且没有 `error` 文本。策略、提供者、批准和显式调用的工具挂钩保持活动状态。此边界不会沙箱插件或禁用本机harness遥测。

类型化处理程序接收 `(event, ctx)`。事件描述操作；第二个参数携带特定于钩子的上下文。 `ctx.agentId`、`ctx.sessionKey` 和 `ctx.runId` 等字段在许多钩子上是可选的，并且对于发射路径可能不存在。注册不会自动限定为一个代理或会话：需要时检查处理程序中的上下文。

从注册闭包内的 `api.pluginConfig` 读取插件的解析设置。类型化挂钩不接收通用 `event.context.pluginConfig` 字段；该字段属于内部 `api.registerHook(...)` 事件合约。默认情况下，在混合重新加载模式下，编辑 `plugins.entries.<id>.config` 会替换插件实例并使用新设置重新运行注册。

### <a id="choose-a-hook"></a> 选择挂钩

| 任务                                               | 钩子                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| 无需模型调用即可回复                         | `before_agent_reply` → `{ handled: true, reply }`；省略 `reply` 表示静音 |
| 添加上下文或缩小转弯工具             | `before_prompt_build`                                                       |
| 支持的运行器上的门模型输入             | `before_agent_run` → `{ outcome: "block", reason, message? }`               |
| 阻止工具或请求批准                   | `before_tool_call`                                                          |
| 重写完整的外发回复，包括媒体   | `reply_payload_sending`                                                     |
| 重写传出文本或取消发送             | `message_sending`                                                           |
| 无需原始对话文本即可收集模型计时 | `model_call_started` / `model_call_ended`                                   |
| 转弯后或关闭时的冲洗状态            | `agent_end` / `gateway_stop`                                                |

该目录是注册号 API，并不保证每个运行时都会发出每个钩子。例如，`before_agent_run` 由嵌入式和 CLI 运行器以及 OpenClaw 节点工作轮次的网关准入来实现。 Node 准入在保留用户消息或启动工作程序之前提供网关的触发提示和加载的历史记录。块和挂钩失败仅保留经过编辑的块消息。 Node 准入省略 `systemPrompt`：节点随后组装其引导程序和技能上下文。要求最终上下文的策略必须使用受支持的本地运行器。请勿将此挂钩用作 Codex 或 Copilot 输入门。本机工具、转录本和压缩边界也有所不同。请参阅 [Codex 挂钩边界](/plugins/codex-harness-runtime#hook-boundaries) 和 [Agent harness插件](/plugins/sdk-agent-harness)。

## <a id="troubleshooting"></a> 故障排查

| 症状                                    | 检查                                                                                                                                                                                                                                                          |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 插件加载但处理程序从未运行    | 使用 `api.on` 作为键入的名称，检查 `openclaw plugins inspect <id> --runtime --json`，并检查阻止注册的诊断。运行时检查在检查过程中加载插件；代码更改后使用 `openclaw plugins reload <id>`。 |
| 对话挂钩被阻止               | 设置`plugins.entries.<id>.hooks.allowConversationAccess: true`；对于提示挂钩，还要检查 `allowPromptInjection` 是否不是 `false`。这些密钥属于 `hooks`，而不是插件的 `config`。                                                           |
| Hook 仅适用于一个运行时或触发器 | 检查运行时边界和 `eligibleTriggers`。缺少上下文字段并不能证明不同的发件人、代理或授权状态。                                                                                                                  |
| 持久化重写没有效果          | 同步返回`{ message }`。 `async` 处理程序的结果将被忽略。                                                                                                                                                                                    |
| 超时的钩子仍然执行工作       | 超时结束主机的等待，而不是插件工作。通过 I/O 传递可用的中止信号并自行绑定插件拥有的工作。                                                                                                                                 |
| 一个插件的重写消失了            | 检查钩子的合并规则和优先级。 `message_sending` 使用上次返回的内容； `reply_payload_sending` 向前传递每个更新的有效负载。                                                                                                        |

## <a id="upcoming-deprecations"></a> 即将弃用

一些与钩子相邻的表面已被弃用，但仍然受支持。在插件兼容性注册表中跟踪每个表面的删除资格，作为 `removeAfter` 日期或显式删除门，而不是在主要版本边界。立即迁移：

- **明文通道信封 `inbound_claim` 和 `message_received` 处理程序中的**。更喜欢键入字段而不是解析平面信封文本：`inbound_claim` 公开 `event.bodyForAgent`； `message_received` 公开 `event.content` 和结构化元数据，而不是 `BodyForAgent` 字段。请参阅 [ 明文通道包络 → BodyForAgent](/plugins/sdk-migration#removal-timeline)。
- **`onResolution` `before_tool_call`** 现在使用类型化的 `PluginApprovalResolution` 联合 （`allow-once` / `allow-always` / `deny` / `timeout` / `cancelled`）而不是自由形式的 `string`。
- **`api.registerSessionExtension` / `api.enqueueNextTurnInjection`** 仍作为顶层兼容性别名保留。新插件应使用 `api.session.state.registerSessionExtension(...)` 和 `api.session.workflow.enqueueNextTurnInjection(...)`。

有关完整列表 - 内存功能注册、提供程序思考配置文件、外部身份验证提供程序、提供程序发现类型、任务运行时访问器和 `command-auth` → `command-status` 重命名 - 请参阅 [Plugin SDK 迁移 → 活动弃用](/plugins/sdk-migration#removal-timeline)。

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本的每个部分现在都位于此页面或下面的五个子页面之一上。单页版本中的锚点仍然在这里解析。

### <a id="hook-reference"></a> 参考

[HHook 参考](/plugins/hooks/reference) — 注册规则、执行合同、每个处理程序的预算以及完整的类型化钩子目录。

- <a id="registration-and-execution"></a>[注册执行](/plugins/hooks/reference#registration-and-execution)
- <a id="hook-catalog"></a>[H目录册](/plugins/hooks/reference#hook-catalog)
- <a id="skill-lifecycle-and-evaluation"></a>[技能生命周期](/plugins/hooks/reference#skill-lifecycle)
- <a id="channel-pairing-requests"></a>[频道配对请求](/plugins/hooks/reference#channel-pairing-requests)

### <a id="tool-call-policy-hooks"></a> 工具调用策略挂钩

[ 工具调用策略挂钩](/plugins/hooks/tool-policy) — 参数重写、阻止、批准、执行环境贡献和转录持久性。

- <a id="tool-call-policy"></a>[工具调用策略](/plugins/hooks/tool-policy#tool-call-policy)
- <a id="sender-aware-policy-in-one-file"></a>[一个文件中的发件人感知策略](/plugins/hooks/tool-policy#sender-aware-policy-in-one-file)
- <a id="exec-environment-hook"></a>[Exec环境挂钩](/plugins/hooks/tool-policy#exec-environment-hook)
- <a id="tool-result-persistence"></a>[工具结果持久化](/plugins/hooks/tool-policy#tool-result-persistence)

### <a id="prompt-and-session-hooks"></a> 提示和会话挂钩

[提示和会话挂钩](/plugins/hooks/prompt-and-session) - 模型解析、提示构造、最终确定和持久的插件拥有的会话状态。

- <a id="debug-runtime-hooks"></a>[调试运行时挂钩](/plugins/hooks/prompt-and-session#debug-runtime-hooks)
- <a id="prompt-and-model-hooks"></a>[提示和模型挂钩](/plugins/hooks/prompt-and-session#prompt-and-model-hooks)
- <a id="authorized-prompt-enrichment"></a>[授权提示充实](/plugins/hooks/prompt-and-session#authorized-prompt-enrichment)
- <a id="session-extensions-and-next-turn-injections"></a>[会话扩展和下一轮注入](/plugins/hooks/prompt-and-session#session-extensions-and-next-turn-injections)

### <a id="message-and-delivery-hooks"></a> 消息和传递挂钩

[消息和传递挂钩](/plugins/hooks/messages) — 入站拦截、回复接管和出站传递策略。

- <a id="message-hooks"></a>[消息挂钩](/plugins/hooks/messages#message-hooks)

### <a id="gateway-and-install-lifecycle-hooks"></a> Gateway 并安装生命周期挂钩

[网关和安装生命周期挂钩](/plugins/hooks/lifecycle) — 安装时检查、网关服务生命周期和安全的外部 cron 投影。

- <a id="install-hooks"></a>[安装挂钩](/plugins/hooks/lifecycle#install-hooks)
- <a id="gateway-lifecycle"></a>[网关生命周期](/plugins/hooks/lifecycle#gateway-lifecycle)
- <a id="safe-external-cron-projection"></a>[安全外部cron投影](/plugins/hooks/lifecycle#safe-external-cron-projection)

## <a id="related"></a> 相关内容

- [插件 SDK 迁移](/plugins/sdk-migration) - 活跃弃用项和移除时间线
- [构建插件](/plugins/building-plugins)
- [插件 SDK 概览](/plugins/sdk-overview)
- [插件入口点](/plugins/sdk-entrypoints)
- [内部钩子](/automation/hooks)
- [Webhooks](/automation/cron-jobs#webhooks)
- [插件架构内部](/plugins/architecture-internals)。
