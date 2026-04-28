---
summary: "使用 ACP 运行时会话来支持 Claude Code、Cursor、Gemini CLI、显式的 Codex ACP 回退、OpenClaw ACP，以及其他 harness 代理"
read_when:
  - 通过 ACP 运行编码 harness
  - 在消息通道上设置绑定到对话的 ACP 会话
  - 将消息通道对话绑定到持久化 ACP 会话
  - 排查 ACP 后端和插件接线问题
  - 调试 ACP 完成结果交付或代理间循环
  - 在聊天中操作 /acp 命令
title: "ACP agents"
---

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 会话让 OpenClaw 可以通过 ACP 后端插件运行外部编码 harness（例如 Pi、Claude Code、Cursor、Copilot、OpenClaw ACP、OpenCode、Gemini CLI，以及其他受支持的 ACPX harness）。

如果你用自然语言让 OpenClaw 在当前对话中绑定或控制 Codex，OpenClaw 应当使用原生 Codex app-server 插件（`/codex bind`、`/codex threads`、`/codex resume`）。如果你要求 `/acp`、ACP、acpx，或者一个 Codex 后台子会话，OpenClaw 仍然可以通过 ACP 路由 Codex。每个 ACP 会话的创建都会作为一个[后台任务](/automation/tasks)进行跟踪。

如果你用自然语言让 OpenClaw “在 thread 里启动 Claude Code” 或使用其他外部 harness，OpenClaw 应当将该请求路由到 ACP 运行时（而不是原生子代理运行时）。

如果你希望 Codex 或 Claude Code 作为外部 MCP 客户端直接连接到现有的 OpenClaw 频道对话，请使用 [`openclaw mcp serve`](/cli/mcp) 而不是 ACP。

## 我需要哪个页面？

有三个相近的界面容易混淆：

| 你想要……                                                                                        | 使用这个                            | 说明                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 在当前对话中绑定或控制 Codex                                                                    | `/codex bind`、`/codex threads`      | 原生 Codex app-server 路径；包括绑定聊天回复、图像转发、模型/fast/权限、停止和 steer 控件。ACP 是显式回退 |
| 通过 OpenClaw 运行 Claude Code、Gemini CLI、显式 Codex ACP，或其他外部 harness                  | 本页：ACP agents                    | 绑定到聊天的会话、`/acp spawn`、`sessions_spawn({ runtime: "acp" })`、后台任务、运行时控制                                                |
| 将一个 OpenClaw Gateway 会话作为 ACP server 暴露给编辑器或客户端                                 | [`openclaw acp`](/cli/acp)          | 桥接模式。IDE/客户端通过 stdio/WebSocket 与 OpenClaw 进行 ACP 通信                                                                                         |
| 将本地 AI CLI 复用为纯文本回退模型                                                              | [CLI Backends](/gateway/cli-backends) | 不是 ACP。没有 OpenClaw 工具、没有 ACP 控件、没有 harness 运行时                                                                                            |

## 开箱即用吗？

通常是的。全新安装默认是启用捆绑的 `acpx` 运行时插件，并带有一个插件本地固定版本的 `acpx` 二进制，OpenClaw 会在启动时探测并自动修复它。运行 `/acp doctor` 可进行就绪检查。

首次运行的注意事项：

- 目标 harness 适配器（Codex、Claude 等）可能会在你第一次使用它们时通过 `npx` 按需获取。
- 该 harness 所需的供应商认证仍然必须存在于主机上。
- 如果主机没有 npm 或网络访问，首次适配器获取会失败，直到缓存被预热或以其他方式安装了适配器。

## 操作手册

从聊天中快速使用 `/acp` 的流程：

1. **启动** — `/acp spawn claude --bind here`、`/acp spawn gemini --mode persistent --thread auto`，或显式 `/acp spawn codex --bind here`
2. **工作** 在绑定的对话或 thread 中进行（或者显式指定 session key）。
3. **检查状态** — `/acp status`
4. **调整** — `/acp model <provider/model>`、`/acp permissions <profile>`、`/acp timeout <seconds>`
5. **Steer**，而不替换上下文 — `/acp steer tighten logging and continue`
6. **停止** — `/acp cancel`（当前轮次）或 `/acp close`（会话 + 绑定）

应当路由到原生 Codex 插件的自然语言触发：

- “把这个 Discord 频道绑定到 Codex。”
- “把这个聊天附加到 Codex thread `<id>`。”
- “显示 Codex threads，然后绑定这个。”

原生 Codex 对话绑定是默认的聊天控制路径。OpenClaw 的动态工具仍然通过 OpenClaw 执行，而诸如 shell/apply-patch 之类的 Codex 原生工具则在 Codex 内部执行。对于 Codex 原生工具事件，OpenClaw 会注入一个按轮次的原生 hook relay，这样插件 hook 就可以阻止 `before_tool_call`、观察 `after_tool_call`，并将 Codex 的 `PermissionRequest` 事件通过 OpenClaw 的审批流程进行路由。v1 relay 是刻意保守的：它不会修改 Codex 原生工具参数、重写 Codex thread 记录，也不会对最终答案/Stop hooks 进行门控。只有在你想要 ACP 运行时/会话模型时，才使用显式 ACP。

应当路由到 ACP 运行时的自然语言触发：

- “把这个作为一次性的 Claude Code ACP 会话运行，并总结结果。”
- “用 Gemini CLI 在一个 thread 中处理这个任务，然后把后续跟进留在同一个 thread 里。”
- “通过 ACP 在后台 thread 中运行 Codex。”

OpenClaw 会选择 `runtime: "acp"`，解析 harness 的 `agentId`，在支持时绑定到当前对话或 thread，并将后续消息路由到该会话，直到关闭/过期。只有在 ACP 是显式指定时，或者请求的后台运行时仍需要 ACP 时，Codex 才会走这条路径。

## ACP 与子代理的区别

当你想要外部 harness 运行时时使用 ACP。要进行 Codex 对话绑定/控制，请使用原生 Codex app-server。要使用 OpenClaw 原生委派运行时，请使用子代理。

| 区域     | ACP 会话                          | 子代理运行                        |
| -------- | --------------------------------- | --------------------------------- |
| 运行时   | ACP 后端插件（例如 acpx）         | OpenClaw 原生子代理运行时         |
| 会话键   | `agent:<agentId>:acp:<uuid>`      | `agent:<agentId>:subagent:<uuid>` |
| 主要命令 | `/acp ...`                        | `/subagents ...`                  |
| 启动工具 | `sessions_spawn`，`runtime:"acp"` | `sessions_spawn`（默认运行时）    |

另见 [子代理](/tools/subagents)。

## ACP 如何运行 Claude Code

对于通过 ACP 运行的 Claude Code，堆栈如下：

1. OpenClaw ACP 会话控制平面
2. 捆绑的 `acpx` 运行时插件
3. Claude ACP 适配器
4. Claude 侧运行时/会话机制

    对于 `sessions_spawn`，只有在 ACP 已启用、请求方未处于沙箱中并且已加载 ACP 运行时后端时，才会公开 `runtime: "acp"`。`acp.dispatch.enabled=false` 会暂停自动 ACP thread 分派，但不会隐藏或阻止显式的 `sessions_spawn({ runtime: "acp" })` 调用。它面向诸如 `codex`、`claude`、`droid`、`gemini` 或 `opencode` 之类的 ACP harness id。不要传入来自 `agents_list` 的普通 OpenClaw 配置 agent id，除非该条目已明确配置为 `agents.list[].runtime.type="acp"`；否则请使用默认的子代理运行时。当 OpenClaw 代理配置为 `runtime.type="acp"` 时，OpenClaw 会使用 `runtime.acp.agent` 作为底层 harness id。

- ACP Claude 是一个具有 ACP 控制、会话恢复、后台任务跟踪和可选对话/线程绑定的工具会话。
- CLI 后端是独立的仅文本本地回退运行时。参见 [CLI 后端](/gateway/cli-backends)。

对于操作员，实际规则是：

- 想要 `/acp spawn`、可绑定会话、运行时控制或持久工具工作：使用 ACP
- 想要通过原始 CLI 进行简单的本地文本回退：使用 CLI 后端

## 绑定会话

### 当前对话绑定

`/acp spawn <harness> --bind here` 会将当前对话固定到启动的 ACP 会话——没有子 thread，使用相同的聊天界面。OpenClaw 继续负责传输、认证、安全和交付；该对话中的后续消息会路由到同一个会话；`/new` 和 `/reset` 会就地重置会话；`/acp close` 会移除绑定。

思维模型：

- **chat surface** — 人们持续对话的地方（Discord 频道、Telegram 话题、iMessage 聊天）。
- **ACP session** — OpenClaw 路由到的持久化 Codex/Claude/Gemini 运行时状态。
- **child thread/topic** — 仅由 `--thread ...` 创建的可选额外消息界面。
- **runtime workspace** — harness 运行所在的文件系统位置（`cwd`、repo checkout、backend workspace）。与聊天界面相互独立。

示例：

- `/codex bind` — 保持这个聊天，启动或附加原生 Codex app-server，将未来消息路由到这里。
- `/codex model gpt-5.4`、`/codex fast on`、`/codex permissions yolo` — 从聊天中调整已绑定的原生 Codex thread。
- `/codex stop` 或 `/codex steer focus on the failing tests first` — 控制当前活跃的原生 Codex 轮次。
- `/acp spawn codex --bind here` — Codex 的显式 ACP 回退。
- `/acp spawn codex --thread auto` — OpenClaw 可能会创建一个子 thread/topic 并绑定到那里。
- `/acp spawn codex --bind here --cwd /workspace/repo` — 相同的聊天绑定，Codex 在 `/workspace/repo` 中运行。

注意：

- `--bind here` 和 `--thread ...` 互斥。
- `--bind here` 仅适用于支持当前对话绑定的频道；否则 OpenClaw 会返回明确的“不支持”消息。绑定会在网关重启后继续保留。
- 在 Discord 上，只有当 OpenClaw 需要为 `--thread auto|here` 创建一个子 thread 时，才需要 `spawnAcpSessions`——而不是用于 `--bind here`。
- 如果你在没有 `--cwd` 的情况下生成到另一个 ACP agent，OpenClaw 默认会继承**目标 agent**的工作区。缺失的继承路径（`ENOENT`/`ENOTDIR`）会回退到后端默认值；其他访问错误（例如 `EACCES`）会作为生成错误显示。

### 线程绑定会话

当某频道适配器启用线程绑定时，ACP 会话可以绑定到线程：

- OpenClaw 将线程绑定到目标 ACP 会话。
- 该线程中的后续消息路由到绑定的 ACP 会话。
- ACP 输出返回到同一线程。
- 失焦／关闭／归档／空闲超时或最大存活期后解除绑定。

线程绑定支持依赖适配器。如果当前频道适配器不支持线程绑定，OpenClaw 会返回明确的“不支持/不可用”消息。

线程绑定 ACP 所需的功能开关：

- `acp.enabled=true`
- `acp.dispatch.enabled` 默认处于开启状态（设为 `false` 可暂停 ACP 分派）
- 频道适配器的 ACP 线程启动标志（适配器特定）
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

### 支持线程的频道

- 任何暴露会话/线程绑定能力的频道适配器。
- 当前内置支持：
  - Discord 线程／频道
  - Telegram 话题（群组/超级群组的论坛话题和私聊话题）
- 插件频道可通过相同绑定接口添加支持。

## 频道特定设置

对于非临时工作流，在顶层 `bindings[]` 条目中配置持久的 ACP 绑定。

    - `acp.enabled=true`
    - `acp.dispatch.enabled` 默认处于开启状态（设为 `false` 可暂停自动 ACP thread 分派；显式的 `sessions_spawn({ runtime: "acp" })` 调用仍然可用）。
    - 启用频道适配器的 ACP 线程生成标志（适配器特定）：
      - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
      - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

- `bindings[].type="acp"` 标记持久的 ACP 对话绑定。
- `bindings[].match` 识别目标对话：
  - Discord 频道或线程：`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 论坛话题：`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - BlueBubbles DM/群组聊天：`match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    对于稳定的群组绑定，首选 `chat_id:*` 或 `chat_identifier:*`。
  - iMessage DM/群组聊天：`match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    对于稳定的群组绑定，首选 `chat_id:*`。
- `bindings[].agentId` 是拥有的 OpenClaw 代理 id。
- 可选的 ACP 覆盖位于 `bindings[].acp` 下：
  - `mode`（`persistent` 或 `oneshot`）
  - `label`
  - `cwd`
  - `backend`

### 每代理的运行时默认值

用 `agents.list[].runtime` 为每个代理定义 ACP 默认值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent`（工具 ID，如 `codex` 或 `claude`）
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

ACP 绑定会话的覆盖优先级：

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. 全局 ACP 默认值（例如 `acp.backend`）

示例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
      {
        id: "claude",
        runtime: {
          type: "acp",
          acp: { agent: "claude", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
    {
      type: "acp",
      agentId: "claude",
      match: {
        channel: "telegram",
        accountId: "default",
        peer: { kind: "group", id: "-1001234567890:topic:42" },
      },
      acp: { cwd: "/workspace/repo-b" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "discord", accountId: "default" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "telegram", accountId: "default" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": { requireMention: false },
          },
        },
      },
    },
    telegram: {
      groups: {
        "-1001234567890": {
          topics: { "42": { requireMention: false } },
        },
      },
    },
  },
}
```

### 行为

- OpenClaw 会确保配置的 ACP 会话在使用前已存在。
- 该频道或话题中的消息会路由到配置的 ACP 会话。
- 在绑定对话中，`/new` 和 `/reset` 会就地重置相同的 ACP 会话键。
- 临时运行时绑定（例如由 thread-focus 流程创建）在存在时仍然适用。
- 对于没有显式 `cwd` 的跨代理 ACP 生成，OpenClaw 会从代理配置中继承目标代理工作区。
- 缺失的继承工作区路径会回退到后端默认 cwd；不存在的访问失败会作为生成错误显示。

## 启动 ACP 会话

启动 ACP 会话有两种方式：

<Tabs>
  <Tab title="从 sessions_spawn">
    使用 `runtime: "acp"` 从代理回合或工具调用中启动 ACP 会话。

    ```json
    {
      "task": "打开仓库并总结失败的测试",
      "runtime": "acp",
      "agentId": "codex",
      "thread": true,
      "mode": "session"
    }
    ```

    <Note>
    `runtime` 默认是 `subagent`，因此请为 ACP 会话显式设置
    `runtime: "acp"`。如果省略 `agentId`，OpenClaw 会在配置了
    `acp.defaultAgent` 时使用该值。`mode: "session"` 需要
    `thread: true` 才能保持持久的绑定会话。
    </Note>

  </Tab>
  <Tab title="从 /acp 命令">
    使用 `/acp spawn` 从聊天中进行显式的操作员控制。

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

    参见 [Slash commands](/tools/slash-commands)。

  </Tab>
</Tabs>

### `sessions_spawn` 参数

<ParamField path="task" type="string" required>
  发送到 ACP 会话的初始提示。
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  ACP 会话必须为 `"acp"`。
</ParamField>
<ParamField path="agentId" type="string">
  ACP 目标 harness id。如果设置了，则回退到 `acp.defaultAgent`。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  在支持的情况下，请求线程绑定流程。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` 表示一次性执行；`"session"` 表示持久会话。如果 `thread: true` 且
  省略了 `mode`，OpenClaw 可能会根据运行时路径默认使用持久行为。`mode: "session"` 需要
  `thread: true`。
</ParamField>
<ParamField path="cwd" type="string">
  请求的运行时工作目录（由后端/运行时策略验证）。如果省略，ACP spawn 会在配置了
  目标代理工作区时继承它；未找到继承路径时会回退到后端默认值，而真实的访问错误会被返回。
</ParamField>
<ParamField path="label" type="string">
  在会话/横幅文本中使用的、面向操作员的标签。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  继续现有的 ACP 会话，而不是创建新的会话。代理通过 `session/load`
  回放其会话历史。需要 `runtime: "acp"`。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` 会将初始 ACP 运行进度摘要作为系统事件流回请求者会话。接受的响应包括
  指向会话范围 JSONL 日志的 `streamLogPath`
  （`<sessionId>.acp-stream.jsonl`），你可以对其进行 tail 以查看完整的转发历史。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  在 N 秒后中止 ACP 子回合。`0` 会让该回合走网关的无超时路径。相同的值会同时应用于 Gateway
  运行和 ACP runtime，因此卡住/配额耗尽的 harness 不会无限占用父代理通道。
</ParamField>
<ParamField path="model" type="string">
  ACP 子会话的显式模型覆盖。Codex ACP spawns 会在 `session/new` 之前，将 OpenClaw Codex 引用
  如 `openai-codex/gpt-5.4` 规范化为 Codex ACP 启动配置；像
  `openai-codex/gpt-5.4/high` 这样的斜杠形式也会为 Codex ACP 设置推理力度。
  其他 harness 必须公开 ACP `models` 并支持 `session/set_model`；否则 OpenClaw/acpx 会明确失败，
  而不是静默回退到目标代理默认值。
</ParamField>
<ParamField path="thinking" type="string">
  显式的思考/推理力度。对于 Codex ACP，`minimal` 映射为低力度，`low`/`medium`/`high`/`xhigh`
  直接映射，而 `off` 则省略推理力度启动覆盖。
</ParamField>

## Spawn 绑定和线程模式

<Tabs>
  <Tab title="--bind here|off">
    | 模式   | 行为                                                                 |
    | ------ | -------------------------------------------------------------------- |
    | `here` | 就地绑定当前活动会话；如果没有活动会话则失败。                        |
    | `off`  | 不创建当前会话绑定。                                                 |

    注意：

    - `--bind here` 是将“这个频道或聊天交给 Codex 提供支持”的最简单操作路径。
    - `--bind here` 不会创建子线程。
    - `--bind here` 仅适用于提供当前会话绑定支持的频道。
    - `--bind` 和 `--thread` 不能在同一个 `/acp spawn` 调用中同时使用。

  </Tab>
  <Tab title="--thread auto|here|off">
    | 模式   | 行为                                                                                          |
    | ------ | --------------------------------------------------------------------------------------------- |
    | `auto` | 在活动线程中：绑定该线程。在线程外：在支持时创建/绑定子线程。                                 |
    | `here` | 需要当前活动线程；如果不在其中则失败。                                                        |
    | `off`  | 不绑定。会话以未绑定状态启动。                                                                 |

    注意：

    - 在非线程绑定界面上，默认行为实际上等同于 `off`。
    - 线程绑定的 spawn 需要频道策略支持：
      - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
      - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`
    - 当你想固定当前会话但不创建子线程时，请使用 `--bind here`。

  </Tab>
</Tabs>

## 交付模型

ACP 会话可以是交互式工作区，也可以是父级拥有的后台工作。交付路径取决于这种形态。

<AccordionGroup>
  <Accordion title="交互式 ACP 会话">
    交互式会话旨在可见聊天界面上持续对话：

    - `/acp spawn ... --bind here` 会将当前会话绑定到 ACP 会话。
    - `/acp spawn ... --thread ...` 会将频道线程/话题绑定到 ACP 会话。
    - 持久配置的 `bindings[].type="acp"` 会将匹配的会话路由到同一个 ACP 会话。

    绑定会话中的后续消息会直接路由到 ACP 会话，ACP 输出也会返回到同一
    频道/线程/话题。

    OpenClaw 发送给 harness 的内容：

    - 常规的绑定后续消息会作为提示文本发送，仅当 harness/backend 支持时才附带附件。
    - `/acp` 管理命令和本地 Gateway 命令会在 ACP 分发前被拦截。
    - 运行时生成的完成事件会按目标具体实例化。OpenClaw 代理会获得 OpenClaw 内部的运行时上下文封装；外部 ACP harness 会获得包含子结果和指令的普通提示。原始的 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>` 封装绝不应发送给外部 harness，也不应作为 ACP 用户转录文本持久保存。
    - ACP 转录条目使用用户可见的触发文本或普通完成提示。内部事件元数据尽可能在 OpenClaw 中保持结构化，不会被视为用户撰写的聊天内容。

  </Accordion>
  <Accordion title="父级拥有的一次性 ACP 会话">
    由另一个代理回合启动的一次性 ACP 会话是后台子任务，类似于子代理：

    - 父级通过 `sessions_spawn({ runtime: "acp", mode: "run" })` 请求工作。
    - 子级在其自己的 ACP harness 会话中运行。
    - 子回合运行在与原生子代理 spawn 相同的后台通道上，因此缓慢的 ACP harness 不会阻塞无关的主会话工作。
    - 完成结果通过任务完成公告路径返回。OpenClaw 会在发送给外部 harness 之前，把内部完成元数据转换为普通 ACP 提示，因此 harness 不会看到仅属于 OpenClaw 的运行时上下文标记。
    - 当需要面向用户的回复时，父级会以正常助手语气改写子结果。

    不要将此路径视为父级和子级之间的点对点聊天。子级已经有一条回传给父级的完成通道。

  </Accordion>
  <Accordion title="sessions_send 和 A2A 交付">
    `sessions_send` 在 spawn 之后可以定向到另一个会话。对于正常的同级会话，OpenClaw 在注入消息后会使用代理到代理（A2A）后续路径：

    - 等待目标会话回复。
    - 可选地让请求者与目标之间交换有限数量的后续回合。
    - 要求目标生成一条公告消息。
    - 将该公告投递到可见频道或线程。

    该 A2A 路径是同级发送的后备方案，当发送者需要可见的后续回复时会使用。只要一个无关会话能够看到并向 ACP 目标发消息，它就保持启用，例如在较宽松的 `tools.sessions.visibility` 设置下。

    OpenClaw 仅在请求者是其自身的父级拥有的一次性 ACP 子会话的父级时，才跳过 A2A 后续流程。在这种情况下，在任务完成之上再运行 A2A 可能会用子级结果唤醒父级、把父级回复再转回子级，并创建父/子回显循环。对于这种拥有子级的情况，`sessions_send` 结果会报告 `delivery.status="skipped"`，因为完成路径已经负责该结果。

  </Accordion>
  <Accordion title="恢复现有会话">
    使用 `resumeSessionId` 来继续之前的 ACP 会话，而不是重新开始。代理通过
    `session/load` 回放其会话历史，因此会带着之前内容的完整上下文继续。

    ```json
    {
      "task": "继续我们上次停下的地方——修复剩余的测试失败",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    常见用例：

    - 将 Codex 会话从你的笔记本电脑接力到手机上——让你的代理接着你离开的地方继续。
    - 继续你在 CLI 中以交互方式开始的编码会话，现在通过你的代理无头继续。
    - 接续因网关重启或空闲超时而中断的工作。

    注意：

    - `resumeSessionId` 仅在 `runtime: "acp"` 时适用；默认的子代理 runtime 会忽略这个仅适用于 ACP 的字段。
    - `streamTo` 仅在 `runtime: "acp"` 时适用；默认的子代理 runtime 会忽略这个仅适用于 ACP 的字段。
    - `resumeSessionId` 是主机本地的 ACP/harness 恢复 id，不是 OpenClaw 频道会话键；OpenClaw 在分发前仍会检查 ACP spawn 策略和目标代理策略，而 ACP 后端或 harness 负责对加载该上游 id 的授权。
    - `resumeSessionId` 会恢复上游 ACP 会话历史；`thread` 和 `mode` 仍会正常应用于你正在创建的新 OpenClaw 会话，因此 `mode: "session"` 仍需要 `thread: true`。
    - 目标代理必须支持 `session/load`（Codex 和 Claude Code 都支持）。
    - 如果找不到该会话 id，spawn 会以清晰的错误失败——不会静默回退到新会话。

  </Accordion>
  <Accordion title="部署后冒烟测试">
    在网关部署后，请运行一次真实的端到端检查，而不是依赖单元测试：

    1. 验证目标主机上已部署的网关版本和提交。
    2. 打开一个临时的 ACPX 桥接会话到一个在线代理。
    3. 要求该代理调用 `sessions_spawn`，并设置 `runtime: "acp"`、`agentId: "codex"`、`mode: "run"`，任务为 `Reply with exactly LIVE-ACP-SPAWN-OK`。
    4. 验证 `accepted=yes`、真实的 `childSessionKey`，以及没有验证器错误。
    5. 清理临时桥接会话。

    将门禁保持为 `mode: "run"`，并跳过 `streamTo: "parent"` —
    线程绑定的 `mode: "session"` 和流转发路径属于更丰富的独立集成流程。

  </Accordion>
</AccordionGroup>

## 沙箱兼容性

ACP 会话当前运行在主机运行时上，**不**在 OpenClaw 沙箱内部运行。

<Warning>
**安全边界：**

- 外部 harness 可根据其自身的 CLI 权限和所选 `cwd` 进行读写。
- OpenClaw 的沙箱策略**不会**包裹 ACP harness 执行。
- OpenClaw 仍然会强制执行 ACP 功能开关、允许的代理、会话所有权、频道绑定以及 Gateway 交付策略。
- 对于受沙箱强制约束的 OpenClaw 原生工作，请使用 `runtime: "subagent"`。
</Warning>

当前限制：

- 如果请求者会话处于沙箱中，则 ACP spawn 会被阻止，无论是 `sessions_spawn({ runtime: "acp" })` 还是 `/acp spawn` 都一样。
- `runtime: "acp"` 的 `sessions_spawn` 不支持 `sandbox: "require"`。

## 会话目标解析

大多数 `/acp` 操作都接受一个可选的会话目标（`session-key`、
`session-id` 或 `session-label`）。

**解析顺序：**

1. 显式目标参数（或者 `/acp steer` 的 `--session`）
   - 先尝试 key
   - 然后尝试 UUID 形状的 session id
   - 最后尝试 label
2. 当前线程绑定（如果此对话/线程已绑定到一个 ACP 会话）。
3. 当前请求者会话回退。

当前对话绑定和线程绑定都会参与
第 2 步。

如果没有任何目标能够解析，OpenClaw 会返回一个清晰的错误
（`Unable to resolve session target: ...`）。

## ACP 控制

| 命令              | 功能                                                     | 示例                                                       |
| ----------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| `/acp spawn`      | 创建 ACP 会话；可选当前绑定或线程绑定。                 | `/acp spawn codex --bind here --cwd /repo`                |
| `/acp cancel`     | 取消目标会话正在进行中的轮次。                           | `/acp cancel agent:codex:acp:<uuid>`                      |
| `/acp steer`      | 向运行中的会话发送 steer 指令。                          | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`      | 关闭会话并解除线程目标绑定。                             | `/acp close`                                              |
| `/acp status`     | 显示后端、模式、状态、运行时选项、能力。                 | `/acp status`                                             |
| `/acp set-mode`    | 为目标会话设置运行时模式。                               | `/acp set-mode plan`                                      |
| `/acp set`         | 通用运行时配置项写入。                                   | `/acp set model openai/gpt-5.4`                           |
| `/acp cwd`         | 设置运行时工作目录覆盖。                                 | `/acp cwd /Users/user/Projects/repo`                     |
| `/acp permissions` | 设置审批策略配置文件。                                   | `/acp permissions strict`                                 |
| `/acp timeout`     | 设置运行时超时（秒）。                                   | `/acp timeout 120`                                       |
| `/acp model`       | 设置运行时模型覆盖。                                     | `/acp model anthropic/claude-opus-4-6`                    |
| `/acp reset-options` | 移除会话运行时选项覆盖。                               | `/acp reset-options`                                     |
| `/acp sessions`    | 列出存储中的最近 ACP 会话。                              | `/acp sessions`                                           |
| `/acp doctor`      | 后端健康状态、能力、可执行修复。                         | `/acp doctor`                                             |
| `/acp install`     | 打印确定性的安装和启用步骤。                             | `/acp install`                                            |

`/acp status` 会显示生效中的运行时选项，以及运行时级别和
后端级别的会话标识符。当后端缺少某项能力时，
不支持控制的错误会清晰地显示出来。`/acp sessions` 会读取
当前绑定会话或请求者会话的存储；目标令牌
（`session-key`、`session-id` 或 `session-label`）会通过
网关会话发现来解析，包括每个 agent 自定义的 `session.store`
根目录。

### 运行时选项映射

`/acp` 提供了便捷命令和一个通用 setter。等价
操作如下：

| 命令                         | 映射到                              | 备注                                                                                                                                                                         |
| ---------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/acp model <id>`            | 运行时配置键 `model`                | 对于 Codex ACP，OpenClaw 会将 `openai-codex/<model>` 规范化为适配器模型 id，并将诸如 `openai-codex/gpt-5.4/high` 这样的带斜杠推理后缀映射到 `reasoning_effort`。 |
| `/acp set thinking <level>`  | 运行时配置键 `thinking`             | 对于 Codex ACP，OpenClaw 会在适配器支持时发送对应的 `reasoning_effort`。                                                                                                  |
| `/acp permissions <profile>` | 运行时配置键 `approval_policy`      | —                                                                                                                                                                            |
| `/acp timeout <seconds>`     | 运行时配置键 `timeout`              | —                                                                                                                                                                            |
| `/acp cwd <path>`            | 运行时 cwd 覆盖                    | 直接更新。                                                                                                                                                                   |
| `/acp set <key> <value>`     | 通用                               | `key=cwd` 使用 cwd 覆盖路径。                                                                                                                                               |
| `/acp reset-options`         | 清除所有运行时覆盖                   | —                                                                                                                                                                            |

## acpx harness、插件设置和权限

关于 acpx harness 配置（Claude Code / Codex / Gemini CLI
别名）、plugin-tools 和 OpenClaw-tools MCP 桥接，以及 ACP
权限模式，请参见
[ACP agents — setup](/tools/acp-agents-setup)。

## 故障排查

| 症状                                                                        | 可能原因                                                                     | 修复                                                                                                                                                                     |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ACP runtime backend is not configured`                                     | 后端插件缺失、被禁用，或被 `plugins.allow` 阻止。                              | 安装并启用后端插件；如果设置了 allowlist，则将 `acpx` 包含进去，然后运行 `/acp doctor`。                                                                                |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 全局被禁用。                                                              | 设置 `acp.enabled=true`。                                                                                                                                               |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 来自普通线程消息的自动分发被禁用。                                            | 设置 `acp.dispatch.enabled=true` 以恢复自动线程路由；显式的 `sessions_spawn({ runtime: "acp" })` 调用仍然可用。                                                        |
| `ACP agent "<id>" is not allowed by policy`                                 | agent 不在允许列表中。                                                        | 使用允许的 `agentId`，或更新 `acp.allowedAgents`。                                                                                                                     |
| `/acp doctor` reports backend not ready right after startup                 | 插件依赖探测或自我修复仍在运行。                                              | 稍等片刻后重新运行 `/acp doctor`；如果一直不健康，请检查后端安装错误和插件允许/拒绝策略。                                                                              |
| Harness command not found                                                   | 适配器 CLI 未安装，或首次运行时 `npx` 获取失败。                               | 在 Gateway 主机上安装/预热适配器，或显式配置 acpx agent 命令。                                                                                                          |
| Model-not-found from the harness                                            | 模型 id 对其他提供商/harness 有效，但对该 ACP 目标无效。                      | 使用该 harness 列出的模型，在 harness 中配置模型，或省略覆盖。                                                                                                        |
| Vendor auth error from the harness                                          | OpenClaw 状态正常，但目标 CLI/提供商未登录。                                 | 在 Gateway 主机环境中登录，或提供所需的提供商密钥。                                                                                                                     |
| `Unable to resolve session target: ...`                                     | key/id/label 令牌错误。                                                       | 运行 `/acp sessions`，复制准确的 key/label，然后重试。                                                                                                                  |
| `--bind here requires running /acp spawn inside an active ... conversation` | 在没有活动可绑定对话的情况下使用了 `--bind here`。                            | 切换到目标聊天/频道并重试，或使用未绑定的 spawn。                                                                                                                       |
| `Conversation bindings are unavailable for <channel>.`                      | 适配器缺少当前对话 ACP 绑定能力。                                              | 在支持的情况下使用 `/acp spawn ... --thread ...`，或配置顶层 `bindings[]`，或者切换到受支持的频道。                                                                    |
| `--thread here requires running /acp spawn inside an active ... thread`     | 在线程上下文之外使用了 `--thread here`。                                      | 切换到目标线程，或使用 `--thread auto`/`off`。                                                                                                                         |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一个用户拥有当前活动绑定目标。                                              | 由所有者重新绑定，或使用不同的对话或线程。                                                                                                                             |
| `Thread bindings are unavailable for <channel>.`                            | 适配器缺少线程绑定能力。                                                      | 使用 `--thread off`，或切换到受支持的适配器/频道。                                                                                                                     |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 运行时在主机侧；请求者会话处于沙箱中。                                     | 从沙箱会话中使用 `runtime="subagent"`，或从非沙箱会话中运行 ACP spawn。                                                                                                |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | 为 ACP 运行时请求了 `sandbox="require"`。                                      | 对于必须沙箱化的情况使用 `runtime="subagent"`，或者从非沙箱会话中使用带 `sandbox="inherit"` 的 ACP。                                                                   |
| `Cannot apply --model ... did not advertise model support`                  | 目标 harness 未暴露通用 ACP 模型切换能力。                                     | 使用声明了 ACP `models`/`session/set_model` 的 harness，使用 Codex ACP 模型引用，或如果 harness 有自己的启动标志，则直接在 harness 中配置模型。                         |
| Missing ACP metadata for bound session                                      | ACP 会话元数据过期/已删除。                                                   | 通过 `/acp spawn` 重新创建，然后重新绑定/聚焦线程。                                                                                                                    |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | 在非交互 ACP 会话中，`permissionMode` 阻止了写入/执行。                        | 将 `plugins.entries.acpx.config.permissionMode` 设置为 `approve-all` 并重启 gateway。参见 [权限配置](/tools/acp-agents-setup#permission-configuration)。               |
| ACP session fails early with little output                                  | `permissionMode`/`nonInteractivePermissions` 阻止了权限提示。                | 检查 gateway 日志中的 `AcpRuntimeError`。若要获得完整权限，将 `permissionMode` 设为 `approve-all`；若要优雅降级，将 `nonInteractivePermissions` 设为 `deny`。            |
| ACP session stalls indefinitely after completing work                       | harness 进程已结束，但 ACP 会话未报告完成。                                    | 使用 `ps aux \| grep acpx` 监控；手动终止残留进程。                                                                                                                      |
| Harness sees `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                        | 内部事件信封泄漏到了 ACP 边界之外。                                            | 更新 OpenClaw 并重新运行完成流程；外部 harness 应只接收普通的完成提示。                                                                                                 |

## 相关

- [ACP 代理 — 设置](/tools/acp-agents-setup)
- [代理发送](/tools/agent-send)
- [CLI 后端](/gateway/cli-backends)
- [Codex harness](/plugins/codex-harness)
- [多代理沙箱工具](/tools/multi-agent-sandbox-tools)
- [`openclaw acp`（桥接模式）](/cli/acp)
- [子代理](/tools/subagents)
