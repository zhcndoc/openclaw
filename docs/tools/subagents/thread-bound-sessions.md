---
summary: "将子代理绑定到通道线程，以及白名单、发现和自动存档规则"
title: "线程绑定的子代理会话"
read_when:
  - "你正在实现或排查线程绑定的子代理会话"
  - "您需要每个代理生成允许列表或 agents_list 发现规则"
  - "您需要知道子代理会话何时存档"
---

## <a id="thread-bound-sessions"></a> 线程绑定会话

当为通道启用线程绑定时，生成的子代理可以获得自己的新线程。该线程中的后续用户消息继续路由到同一个子代理会话，而您从中生成的对话则保留在您的代理中。

嵌入式和 CLI- 支持的代理使用当前对话来生成线程。仅当运行时可以识别该对话并且通道策略允许生成时，它才会通告线程绑定生成。调用者提供的 MCP 会话标头不授权线程绑定。

### <a id="thread-supporting-channels"></a> 支持线程的通道

`sessions_spawn` 和 `thread: true` 总是打开一个新的子线程；它永远不会将当前的对话交给工作人员。可以打开一个的捆绑通道：**Discord** 和 **Matrix**。在绑定当前对话的通道（例如 Telegram、iMessage、Feishu 和 LINE）上，`thread: true` 被拒绝；使用 `mode: "run"` 生成，结果将在对话中宣布。使用每通道 `threadBindings` 配置键来启用、超时和 `spawnSessions`。

当前对话中旧版本创建的工作绑定将被忽略：那里的消息再次路由到您的代理，并且过时的绑定将在其正常空闲超时后到期。要故意将对话交给 ACP 会话，请使用 `/acp spawn --bind here`。

### <a id="quick-flow"></a> 快速流程

<Steps>
  <Step id="spawn" title="生成">
    使用 `sessions_spawn` 搭配 `thread: true`（也可选用 `mode: "session"`）。
  </Step>
  <Step id="bind" title="绑定">
    OpenClaw 在活动通道中打开一个新的子线程并将其绑定到该会话。
  </Step>
  <Step id="route-follow-ups" title="路线追踪">
    该线程中的回复和后续消息会路由到已绑定的会话。
  </Step>
  <Step id="inspect-timeouts" title="检查超时">
    使用 `/session idle` 至 inspect/update 不活动到期和 `/session max-age` 来控制硬上限。
  </Step>
  <Step id="detach" title="分离">
    使用 `/session unbind` 进行分离而不关闭代理会话。
  </Step>
</Steps>

### <a id="manual-controls"></a> 手动控制

| 命令            | 作用                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `/session unbind`  | 删除当前会话绑定而不关闭代理会话                 |
| `/agents`          | 列出活动运行和绑定状态（`binding:<id>`、`unbound` 或 `bindings unavailable`） |
| `/session idle`    | Inspect/update 当前绑定的不活动到期                                  |
| `/session max-age` | Inspect/update 当前绑定的最大年龄                                     |

### <a id="config-switches"></a> 配置开关

- **全局默认值：** `session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- **通道覆盖和自动绑定的 spawn 键** 依赖适配器。参见上方的 [支持线程的通道](#thread-supporting-channels)。

参见 [配置参考](/gateway/configuration-reference) 和 [斜杠命令](/tools/slash-commands) 了解当前适配器详情。

### <a id="allowlist"></a> 白名单

<ParamField path="agents.entries.*.subagents.allowAgents" type="string[]">
  通过显式 `agentId` 可作为目标的已配置代理 id 列表（`["*"]` 允许任何已配置目标）。默认：仅请求者代理。如果你设置了列表，但仍希望请求者使用 `agentId` 自行创建会话，请将请求者 id 包含在列表中。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  当请求者代理未自行设置 `subagents.allowAgents` 时使用的默认已配置目标代理允许名单。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式配置文件选择）。每个代理覆盖：`agents.entries.*.subagents.requireAgentId`。
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  网关 `agent` 公告切换尝试超时。一旦接受切换，等待父会话的轮次就不会消耗此预算。执行开始后，请求者的正常[运行时超时和取消控制](/concepts/agent-loop#timeouts)适用；公告计时器不会重新启动。值是正整数毫秒，并被限制在平台安全计时器最大值。队列等待、请求者执行和瞬时重试可能会使总传递时间比配置的超时时间长。
</ParamField>

如果请求者会话处于沙箱环境中，`sessions_spawn` 会拒绝那些会以非沙箱方式运行的目标。

### <a id="discovery"></a> 发现

使用 `agents_list` 查看当前允许用于 `sessions_spawn` 的代理 id。响应会包含每个已列出代理的有效模型和嵌入的运行时元数据，以便调用方区分 OpenClaw、Codex app-server 和其他已配置的原生运行时。

`allowAgents` 条目必须指向 `agents.entries.*` 中已配置的代理 id。 `["*"]` 表示任何已配置的目标代理以及请求者。如果某个代理配置被删除，但其 id 仍保留在 `allowAgents` 中，`sessions_spawn` 会拒绝该 id， 而 `agents_list` 会省略它。运行 `openclaw doctor --fix` 可清理过期的白名单条目，或者在目标需要在继承默认值的同时仍可被 spawn 时，添加一个最小的 `agents.entries.*` 条目。

### <a id="auto-archive"></a> 自动归档

- 子代理会在 `agents.defaults.subagents.archiveAfterMinutes`（默认 `60`）后自动归档。
- 归档使用 `sessions.delete`，并将转录重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 会在通知后立即归档（仍通过重命名保留转录）。
- 自动归档尽力而为；如果网关重启，待处理的定时器会丢失。
- 已配置的运行超时**不会**自动归档；它们只会停止运行。会话会一直保留，直到自动归档。
- 自动归档同样适用于每个子代理深度。
- 浏览器清理与存档清理是分开的：运行完成时，跟踪的浏览器 tabs/processes 会尽力关闭，即使保留 transcript/session 记录也是如此。

如果较新的运行接管同一会话，则较旧的运行将停止声明选项卡以进行清理。已允许选项卡进行的清理仍取决于该选项卡捕获的所有权；它不会删除后来的注册。

`subagent_ended` 插件挂钩是尽力而为的。记录挂钩执行或插件运行时加载失败，并且不会中止子代理清理。

在启动它的请求结束后，定期上下文引擎清理将继续。尽最大努力上下文引擎清理失败会记录经过编辑的错误、清理原因和屏蔽的子会话密钥。
