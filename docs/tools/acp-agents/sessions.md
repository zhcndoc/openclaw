---
summary: "从 sessions_spawn 或 /acp spawn 启动 ACP 会话，并使用参数和模式参考"
title: "ACP 代理会话"
read_when:
  - "您正在从座席轮流或聊天中启动 ACP 会话"
  - "您需要运行时 acp 的 sessions_spawn 参数参考"
  - "您需要 --bind 和 --thread 模式表"
---

## <a id="start-acp-sessions"></a> 启动 ACP 会话

启动 ACP 会话有两种方式：

<Tabs>
  <Tab id="from-sessions_spawn" title="来自 sessions_spawn">
    使用 `runtime: "acp"` 从某个 agent 回合或工具调用中启动 ACP 会话。

    ```json
    {
      "task": "Open the repo and summarize failing tests",
      "runtime": "acp",
      "agentId": "codex",
      "thread": true,
      "mode": "session"
    }
    ```

    <Note>
    `runtime` 默认值为 `subagent`，因此 ACP 会话需要显式设置 `runtime: "acp"`。如果省略 `agentId`，OpenClaw 会在已配置时使用 `acp.defaultAgent`。`mode: "session"` 需要 `thread: true`，以保持持久绑定的对话。
    </Note>

  </Tab>
  <Tab id="from-%2Facp-command" title="来自 /acp 命令">
    使用 `/acp spawn` 从聊天中进行显式操作者控制。

    ```text
    /acp spawn codex --mode persistent --thread auto
    /acp spawn codex --mode oneshot --thread off
    /acp spawn codex --bind here
    /acp spawn codex --thread here
    ```

    关键标志：

    - `--mode persistent|oneshot`
    - `--bind here|off`
    - `--thread auto|here|off`
    - `--cwd <absolute-path>`
    - `--label <name>`

    参见 [斜杠命令](/tools/slash-commands)。

  </Tab>
</Tabs>

### <a id="sessions_spawn-parameters"></a> `sessions_spawn` 参数

<ParamField path="user" type="string">
  该人的 requester_profile.id，当有几个人驾驶该转弯时需要。
</ParamField>

<ParamField path="task" type="string" required>
  发送给 ACP 会话的初始提示词。
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  ACP 会话必须为 `"acp"`。
</ParamField>
<ParamField path="agentId" type="string">
  ACP 目标harness ID 或配置的 ACP 代理别名。如果设置，则回退至 `acp.defaultAgent`。原始harness在请求 OpenClaw 代理下创建子级；配置的别名拥有它们的子代。无论哪种情况，harness都保留 ACP 运行时标识。对于跨代理别名，线程绑定和内联传递使用所有者的绑定通道帐户。原始harness保留请求代理的活动入站帐户。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  请求在支持的情况下启用线程绑定流程。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` 表示一次性；`"session"` 表示持久。如果设置了 `thread: true` 而省略了 `mode`，OpenClaw 可能会根据运行时路径默认使用持久行为。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cwd" type="string">
  请求的运行时工作目录（由 backend/runtime 策略验证）。如果省略，ACP 在配置时会继承 OpenClaw 所有者的工作区；缺少继承的路径会回退到后端默认值，同时返回实际访问错误。
</ParamField>
<ParamField path="label" type="string">
  session/banner 文本中使用的面向操作员的标签。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  恢复现有的ACP会话而不是创建一个新会话。代理通过重播其对话历史记录`session/load`。需要`runtime: "acp"`。这ID必须针对选定的后端和工具进行记录，并且属于请求者（请求者本身或其生成或作为父级的会话）。未知 ID 将被拒绝，而不枚举代理的会话。历史harness拥有的记录在相同的检查下仍然符合资格；产卵不会移动或改写它们的历史。OpenClaw在初始化恢复的运行时之前再次检查所有权。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` 会将初始 ACP 运行进度摘要作为系统事件流式传回请求方会话。 OpenClaw 会在子 agent 的 SQLite 状态中记录完整的中继历史，并在删除子会话时一并移除。 默认情况下，父会话进度流会显示 assistant 的评论和 ACP 状态进度，除非设置 `streaming.progress.commentary=false`。Discord 父会话进度需要显式设置 `streaming.mode: "progress"`；未设置时，Discord 流式传输保持静默。 状态进度仍遵循 `acp.stream.tagVisibility`，因此除非显式启用，否则诸如 `plan` 之类的标签仍会隐藏。
</ParamField>

ACP `sessions_spawn` 调用的默认子回合限制使用 `agents.defaults.subagents.runTimeoutSeconds`。该工具不接受按调用覆盖的超时参数（`runTimeoutSeconds`/`timeoutSeconds` 会因 config-the-default 错误而被拒绝）。

<ParamField path="model" type="string">
  ACP 子会话的显式模型覆盖。 Codex ACP 在 `session/new` 之前生成标准化 OpenAI 引用，例如 `openai/gpt-5.4` 到 Codex ACP 启动配置；诸如 `openai/gpt-5.4/high` 之类的斜杠形式也设置了 Codex ACP 的推理工作量。省略时，`sessions_spawn({ runtime: "acp" })` 使用目标代理的 `subagents.model`，然后是 `agents.defaults.subagents.model`，最后是目标代理的显式 `model.primary`。如果未配置，则允许 ACP harness使用其自己的默认模型。本机子代理生成不会继承 ACP 代理的主要harness；他们使用本机子代理设置或本机默认设置。其他harness必须通告 ACP 模型控件以进行显式选择。如果没有这些控制，显式选择就会失败；可以省略继承的默认值，以便harness可以使用自己的默认值。
</ParamField>
<ParamField path="thinking" type="string">
  显式的 thinking/reasoning 努力。对于 Codex ACP，`minimal` 映射到低工作量，`low`/`medium`/`high`/`xhigh` 直接映射，而 `off` 省略推理工作量启动覆盖。显式值优先于 `model` 中的推理后缀，包括 `off`。省略时，ACP 生成使用现有的子代理思维默认值、配置的目标代理的 `thinkingDefault` 以及所选模型的每个模型 `params.thinking`。目标代理的 `agents.entries.<agent>.models["provider/model"]` 设置会覆盖共享的 `agents.defaults.models["provider/model"]` 设置。
</ParamField>

## <a id="spawn-bind-and-thread-modes"></a> Spawn 的 bind 和 thread 模式

<Tabs>
  <Tab id="bind-here%7Coff" title="--bind 这里|关闭">
    | 模式   | 行为                                                               |
    | ------ | ----------------------------------------------------------------------- |
    | `here` | 就地绑定当前活动对话；如果没有活动对话则失败。 |
    | `off`  | 不创建当前对话绑定。                          |

    注意：

    - `--bind here` 是“让此频道或聊天成为 Codex- 支持”的最简单的操作员路径
    - `--bind here` 不会创建子线程。
    - `--bind here` 仅在暴露当前对话绑定支持的频道上可用。
    - `--bind` 和 `--thread` 不能在同一个 `/acp spawn` 调用中同时使用。

  </Tab>
  <Tab id="thread-auto%7Chere%7Coff" title="--thread auto|这里|off">
    | 模式   | 行为                                                                                            |
    | ------ | ------------------------------------------------------------------------------------------------- |
    | `auto` | 在活动线程中：绑定该线程。线程外：create/bind 支持时为子线程。 |
    | `here` | 要求当前活动线程；如果不在线程中则失败。                                                  |
    | `off`  | 不绑定。会话以未绑定状态启动。                                                                 |

    注意：

    - 在非线程绑定入口上，默认行为实际上是 `off`。
    - 线程绑定的 spawn 需要频道策略支持：
      - Discord/Telegram: `session.threadBindings.spawnSessions=true`
    - 当你想固定当前会话而不创建子线程时，请使用 `--bind here`。

  </Tab>
</Tabs>
