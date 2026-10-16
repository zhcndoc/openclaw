---
summary: "插件钩子如何注册和执行，以及完整的类型化钩子目录"
read_when:
  - "您正在连接类型化处理程序并需要排序、超时和失败规则"
  - "您想知道表面存在哪种类型的钩子"
  - "您正在注册技能生命周期或配对观察者"
title: "挂钩参考"
sidebarTitle: "挂钩参考"
---

注册规则、执行合同、每个处理程序的预算以及完整的类型化挂钩目录。 [ 插件挂钩 ](/plugins/hooks) 指南的一部分。

## <a id="registration-and-execution"></a> 注册执行

保持 `register(api)` 同步并在那里注册处理程序。除了两个同步持久性挂钩之外，处理程序本身可以是异步的。

处理程序默认优先级为 `0`；优先级较高的优先级优先，注册顺序打破了平局。执行取决于钩子类型：

| 类型             | 执行合同                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 调整           | 顺序；结果根据下面的钩子合同进行合并。返回重写通常不会更改传递给后续处理程序的事件。 |
| 宣称            | 顺序；第一个 `{ handled: true }` 获胜并跳过剩余的处理程序。                                                                        |
| 闸门             | 顺序；一个块会停止剩余的处理程序。                                                                                                       |
| 观察          | 处理程序同时运行；返回值被忽略。发射器可以等待完成或调度即发即弃。                                 |
| 同步modify/gate | 同步，按优先顺序；每个处理程序都会看到最新的消息。承诺被忽略并带有警告。                                          |
| 评价         | 技能评估器同时运行并产生单独的归因结果。                                                                         |

优先级不会对观察副作用进行序列化。即发即弃事件可以与后续事件重叠，并且回调不是持久的事件队列。显式返回修改，而不是依赖就地突变。

`api.on(name, handler, opts?)` 接受：

| 选项                  | 作用                                                                                                                                                                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `matcher`               | 由 `before_tool_call` 或 `after_tool_call` 处理的标准 OpenClaw 工具 ID 的非空列表，例如 `exec`、`apply_patch` 或 `spawn_agent`。省略匹配所有工具。空列表、通配符、空白和特定于提供商的别名无效。 |
| `priority`              | 排序；数值越高越先运行。                                                                                                                                                                                                                          |
| `registrationId`        | 插件内一次注册的稳定身份。技能评估者将其用作`evaluatorId`；否则使用插件 ID。                                                                                                                      |
| `timeoutMs`             | 每个处理程序异步等待预算。过期应用下面的钩子失败策略；它不会取消处理程序或其副作用。忽略使用跑步者的默认值（如果有）。                                                                  |
| `eligibleTriggers`      | 仅适用于 `before_agent_reply`，将宿主分发限制为 `cron`、`heartbeat` 或 `user` 中的一个或多个触发器。                                                                                                                                                 |
| `eligibleDispatchKinds` | 仅适用于 `reply_dispatch`，将主机调度限制为 `agent`、`acp` 或两者。省略处理所有调度类型。                                                                                                                                        |
| `requiresToolAuthority` | 仅适用于 `before_prompt_build`，在主机完成当前回合的工具表面并提供临时 `ctx.toolAuthority` 后运行处理程序。使用它进行必须遵循工具策略的上下文检索。                                    |

触发器资格由宿主在调用处理器之前强制执行。因此，使用 `eligibleTriggers: ["heartbeat", "cron"]` 注册的钩子对于用户轮次处于非活动状态，包括恢复的用户轮次。省略、为空、格式错误或部分包含未知值的列表仍不受限制，因此钩子会在这些轮次中运行。其他钩子类型不接受此选项。

运维人员可以在不修改插件代码的情况下设置钩子预算：

```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "hooks": {
          "timeoutMs": 30000,
          "timeouts": {
            "before_prompt_build": 90000,
            "agent_end": 60000
          }
        }
      }
    }
  }
}
```

`hooks.timeouts.<hookName>` 会覆盖 `hooks.timeoutMs`，后者会覆盖插件编写的 `api.on(..., { timeoutMs })` 值。两个操作员配置字段接受最多 600000 毫秒的正整数。对于已知的慢钩子，更喜欢按钩子覆盖，这样一个插件就不会在任何地方都获得更长的预算。

超时处理程序 Promise 会继续运行，因为挂钩回调不会收到超时拥有的取消信号。 `before_tool_call` 可以接收所属工具调用的 `ctx.abortSignal`，但钩子超时到期不会中止它。当插件工作仍在进行时，钩子调度可以释放其网关许可。拥有长时间运行工作的插件必须提供自己的取消和关闭生命周期。

在结果变得不合格后，提示构建处理程序可以使用 `ctx.hookInvocation.assertActive()` 拒绝副作用。请参阅 [Handler 生命周期](/plugins/hooks/prompt-and-session#handler-lifetime)。

标准运行程序应用这些默认值 **per handler**：

| 钩子                                                                                                          | 默认超时                     | 抛出错误或超时时                                       |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| `before_agent_run`, `before_tool_call`, `before_install`                                                       | 15秒                          | 阻止运行、工具调用或安装                             |
| `before_agent_finalize`, `before_prompt_build`, `message_sending`, `reply_payload_sending`, `resolve_exec_env` | 15秒                          | 记录并跳过失败的处理程序；保留其他成功结果 |
| `agent_end`, `before_compaction`, `after_compaction`, `skill_changed`                                          | 30 秒                          | 记录并继续                                                 |
| `channel_pairing_requested`                                                                                    | 2秒                           | 记录并继续                                                 |
| `gateway_stop`                                                                                                 | 5秒                           | 记录并继续关闭                                        |
| 其他异步钩子，包括声明钩子                                                                | 除非配置，否则没有跑步者超时 | 记录并继续                                                 |
| `tool_result_persist`, `before_message_write`                                                                  | 无异步超时             | 记录同步错误；失败的结果将被忽略        |

发射器可以施加更严格的整体生命周期预算，例如下面的关闭 `session_end` 排水。超时仅限制异步等待；它不能中断同步JavaScript。对于策略要求，请使用一个阻止错误操作的门，而不是假设观察或交付挂钩将拒绝失败的操作。

对于声明挂钩，继续意味着尝试下一个处理程序。如果无人认领，则由呼叫者决定如何处理；绑定对话失败的 `inbound_claim` 可以生成绑定通知而不是普通代理回复。

使用 `createReplyDispatcher` 的通道插件同样可以通过 `beforeDeliverOptions: { timeoutMs }` 声明更大的正向每阶段预算，或者在通过 `dispatcher.appendBeforeDeliver(handler, { timeoutMs })` 追加工作时指定。若没有所有者声明的预算，这些回调会使用相同的 15 秒默认值，这样一个卡住的回调就不会占用序列化交付通道。

## <a id="hook-catalog"></a> 钩子目录

钩子按其延伸的表面进行分组。种类参见上述执行合同；修改钩子不是观察钩子。

**Agent 回合**

| 钩子                            | 类型    | 用途                                                                                                                         |
| ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `before_model_resolve`          | 调整  | 在加载会话消息之前覆盖提供程序、模型或运行的后备链                                              |
| `agent_turn_prepare`            | 调整  | 检查耗尽的插件转注入并在提示钩子之前添加上下文                                                      |
| `before_prompt_build`           | 调整  | 添加提示上下文，缩小当前回合提交的工具范围，或执行授权的策略后充实                     |
| `before_agent_run`              | 闸门    | 在模型提交之前检查提示和会话消息；节点在工作本地上下文组装之前打开门网关输入 |
| `before_agent_reply`            | 宣称   | 使用合成回复或静默来提前结束模型回合                                                                  |
| `before_agent_finalize`         | 调整  | 检查自然生成的最终答案，并请求模型再次处理                                                                |
| `agent_end`                     | 观察 | 观察最终消息、成功状态和运行时长                                                                         |
| `heartbeat_prompt_contribution` | 调整  | 为后台监控和生命周期插件添加仅用于心跳的上下文                                                         |

**对话观察**

| 钩子                                      | 类型    | 用途                                                                                                            |
| ----------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| `model_call_started` / `model_call_ended` | 观察 | 净化的 provider/model 调用元数据：计时、结果、有界请求 ID 哈希值。无提示或响应内容。 |
| `llm_input`                               | 观察 | 提供方输入：系统提示词、提示词、历史记录                                                                     |
| `llm_output`                              | 观察 | 提供方输出、用量，以及可用时解析得到的 `contextTokenBudget`                                       |

**工具**

| 钩子                   | 类型               | 用途                                                    |
| ---------------------- | ------------------ | ---------------------------------------------------------- |
| `before_tool_call`     | 修改/门      | 重写工具参数、阻止执行或要求批准  |
| `after_tool_call`      | 观察            | 观察工具结果、错误和持续时间                 |
| `resolve_exec_env`     | 调整             | 为 `exec` 提供插件拥有的环境变量    |
| `tool_result_persist`  | 同步修改        | 在转录持久化之前重写 toolResult 消息 |
| `before_message_write` | 同步修改/门控 | 在转录持久化之前重写或阻止消息   |

**消息与传递**

| 钩子                        | 类型          | 用途                                                                    |
| --------------------------- | ------------- | -------------------------------------------------------------------------- |
| `inbound_claim`             | 宣称         | 为拥有该消息会话绑定的插件认领入站消息 |
| `channel_pairing_requested` | 观察       | 观察新创建的 DM 配对请求                                  |
| `message_received`          | 观察       | 观察入站内容、发送者、线程和元数据                      |
| `message_sending`           | 修改/门 | 重写出站内容或取消传递                                |
| `reply_payload_sending`     | 修改/门 | 在传递前修改或取消规范化的回复负载                 |
| `message_sent`              | 观察       | 观察出站传递的成功或失败                               |
| `before_dispatch`           | 宣称         | 在正常模型调度之前处理入站消息                 |
| `reply_dispatch`            | 宣称         | 自己的回复生成和发送，而不是默认的模型路径        |

`inbound_claim` 不是全局预路由广播。 OpenClaw 仅针对拥有消息的核心管理对话绑定的插件调用它。要在模型输入之前抑制普通代理转动而不保留转录中的原始提示，请在受支持的运行器上使用 `before_agent_run`。要通过合成回复或静音来短路代理回合，请使用 `before_agent_reply`。

对于心跳轮换，当主机知道底层系统事件队列时，`before_agent_reply` 会收到 `ctx.heartbeatEventQueueSessionKey`。这可能与隔离心跳运行的 `ctx.sessionKey` 不同。使用提供的键进行事件查找；不要通过删除 `:heartbeat` 后缀来派生基本会话，因为配置的会话可以命名为 `heartbeat`。对于较旧的主机，该字段是可选的。没有它，插件只能检查 `ctx.sessionKey`；他们无法推断隔离运行的基本队列。该字段标识现有队列并且不授予额外的访问权限。

<a id="sessions-and-compaction" />

**会话与压缩**

| 钩子                                     | 类型    | 用途                                                      |
| ---------------------------------------- | ------- | ------------------------------------------------------------ |
| `session_start` / `session_end`          | 观察 | 跟踪会话生命周期边界                           |
| `before_compaction` / `after_compaction` | 观察 | 观察压实边界；没有重写或否决结果     |
| `before_reset`                           | 观察 | 观察会话重置事件（`/reset`、程序化重置） |

即使没有历史记录更改，成功的引擎拥有的内置本机压缩尝试也会发出 `after_compaction`，并带有 `compactedCount: 0`。本机跳过包括仅心跳记录和自动保留策略无操作。完成意味着尝试完成；它不保证历史重写。失败或中止的尝试不会发出该完成挂钩。

`session_end.reason` 是 `new`、`reset`、`idle`、`daily`、`compaction`、`deleted`、`shutdown`、`restart` 之一，或`unknown`。 `session_start` 无原因字段；它可以包括 `resumedFrom`。 Shutdown/restart 事件来自活动会话的网关终结器，因此插件可以在进程退出之前关闭会话状态。

在当前主机上，`session_end` 上下文包括 `endedTranscript`。当 OpenClaw 具有不可变的结束会话源时，具有会话访问权限的插件会接收 `{ available: true, readTail }`。看涨期权必须提供正值 `maxMessages` 和 `maxBytes`； OpenClaw 强制执行主机上限并返回 `{ messages, totalMessages, truncated }`。当允许的处理程序处于活动状态时，读取器仍然有效。处理程序解决、其配置的挂钩超时、所属插件实例强制退出或 shutdown/restart 耗尽截止时间后，保留或仍待处理的读取会被拒绝。

当不存在安全源时，值为`{ available: false, reason }`。当前的原因包括缺少对话权限、没有稳定截止的生命周期、已删除的隐身状态、不可用的存档以及不受支持的源。这是一个明确的非结果，而不是一个空的成绩单。根据此合同编译的插件仍应将缺失的字段视为较旧的主机。

`session_end` 本身仍然是元数据挂钩，无需对话访问即可注册。对于非捆绑插件，`plugins.entries.<id>.hooks.allowConversationAccess=true` 仅授予有界的结束转录阅读器。捆绑插件遵循相同的有效策略，可以通过 `allowConversationAccess: false` 拒绝。权限更改适用于成功发布的插件运行时替换所承认的处理程序。已经运行的处理程序保留其生成的授权，同时其有界调用仍然被允许；处理程序结算、挂钩超时、强制实例退役或关闭耗尽到期都会结束租约。前一个版本和后续版本可能会重叠。

关闭和重新启动在所有活动会话和插件处理程序中共享一个 **2 秒总计 `session_end` 消耗预算**；预算不是每个处理程序的。快速返回或保持最终确定有界和持久性崩溃一致。如果预算到期，OpenClaw 会记录 `shutdown session-end drain timed out` 并继续关闭，因此可以中断未完成的插件工作。

对于 `sessions.create` 与 `parentSessionKey` 和 `emitCommandHooks: true` 的调用，不同的子级始终接收 `session_start`。调用者声明父级是否也接收终端 `session_end` 和 `succeedsParent`：`true` 表示后继，`false` 表示并行子级。省略保留了遗留的父级翻转行为。在这两种情况下，`command:new` 和 `before_reset` 挂钩仍然描述请求的 `/new` 操作。

**子代理**

- `subagent_spawned` / `subagent_ended` - 观察子代理的启动和完成。
- `subagent_progress` - 观察便携式 `started` / `ended` 后台子运行的进度；包括 `runId`、`childSessionKey`、可选请求者路由以及 `ended` 上的结果。
- `subagent_delivery_target` - 当没有核心会话绑定可以投影路线时，修改兼容性挂钩以完成交付。第一个返回的 `origin` 获胜。
- `subagent_spawned` 在 OpenClaw 已在启动前解析出子会话原生模型时，会包含 `resolvedModel` 和 `resolvedProvider`。
- `subagent_ended` 包含 `targetSessionKey`（标识 - 与 `subagent_spawned.childSessionKey` 匹配）、`targetKind`（`"subagent"` 或 `"acp"`）、`reason`、可选的 `outcome`（`"ok"`、`"error"`、`"timeout"`、`"killed"`、`"reset"` 或 `"deleted"`）、可选的 `error`、`runId`、`endedAt`、`accountId` 和 `sendFarewell`。它**不**包含 `agentId` 或 `childSessionKey`；请使用 `targetSessionKey` 与匹配的 `subagent_spawned` 事件进行关联。

**生命周期**

| 钩子                             | 类型          | 用途                                                                                              |
| -------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `gateway_start` / `gateway_stop` | 观察       | 与 Gateway 一同启动或停止插件拥有的服务                                                 |
| `cron_reconciled`                | 观察       | 在启动或重新加载后与完整的 Gateway cron 状态进行协调                            |
| `cron_changed`                   | 观察       | 观察 Gateway 拥有的 cron 生命周期变化（添加、更新、移除、启动、完成、计划） |
| `before_install`                 | 修改/门 | 从已加载的插件运行时检查暂存的技能或插件安装材料                         |
| `skill_changed`                  | 观察       | 观察已提交的实时技能创建、更新和移除事件                                      |

### <a id="skill-lifecycle"></a> 技能生命周期

`skill_changed` 在实时技能创建、更新或删除提交后触发，并包括带有内容和树哈希的可选 before/after 工件，以及可用的声明版本和源版本。

### <a id="channel-pairing-requests"></a> 频道配对请求

当未配对的 DM 发送者创建待处理的配对请求后，插件需要通知操作员或写入审核记录时，请使用 `channel_pairing_requested`。该钩子在创建请求时调度；配对回复的通道传递不会因缓慢或失败的挂钩处理程序而延迟。

```typescript
api.on("channel_pairing_requested", async (event) => {
  await notifyOperator({
    text: `New ${event.channel} pairing request from ${event.senderId}: ${event.code}`,
  });
});
```

该钩子仅用于观察。它不会批准、拒绝、抑制或重写配对回复。有效负载包含通道、可选的 `accountId`、按通道范围的 `senderId`、配对 `code` 以及通道元数据。请将配对代码视为实时一次性批准凭证，并仅将其交付给受信任的操作员接收端。请将 `metadata` 视为不受信任的、由发送者提供的身份文本。该钩子不包含传入消息正文或媒体。
