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

通常是的。全新安装默认会启用捆绑的 `acpx` 运行时插件，并带有一个插件本地固定版本的 `acpx` 二进制，OpenClaw 会在启动时探测并自动修复它。运行 `/acp doctor` 可进行就绪检查。

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

重要区别：

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

### 绑定模型

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

行为：

- OpenClaw 确保在使用前配置好的 ACP 会话存在。
- 该频道或话题中的消息路由到配置的 ACP 会话。
- 在绑定的对话中，`/new` 和 `/reset` 会就地重置相同的 ACP 会话键。
- 临时运行时绑定（例如由线程聚焦流创建的）在存在时仍然适用。
- 对于没有显式 `cwd` 的跨代理 ACP 生成，OpenClaw 从代理配置继承目标代理工作区。
- 缺失的继承工作区路径回退到后端默认 cwd；非缺失的访问失败会作为生成错误显示。

## 启动 ACP 会话（接口）

### 通过 `sessions_spawn`

用 `runtime: "acp"` 从代理回合或工具调用启动 ACP 会话。

```json
{
  "task": "打开仓库并总结失败的测试",
  "runtime": "acp",
  "agentId": "codex",
  "thread": true,
  "mode": "session"
}
```

说明：

- `runtime` 默认为 `subagent`，所以必须显式设置 `runtime: "acp"` 来启用 ACP 会话。
- 如果遗漏 `agentId`，OpenClaw 将使用配置中的 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 以保持持久绑定的对话。

接口详情：

- `task` (required): 发送到 ACP 会话的初始提示。
- `runtime` (required for ACP): 必须为 `"acp"`。
- `agentId` (optional): ACP 目标 harness id。若已设置，则回退到 `acp.defaultAgent`。
- `thread` (optional, default `false`): 在支持时请求线程绑定流程。
- `mode` (optional): `run`（一次性）或 `session`（持久）。
  - 默认是 `run`
  - 如果 `thread: true` 且未指定 mode，OpenClaw 可能会根据运行时路径默认采用持久行为
  - `mode: "session"` 需要 `thread: true`
- `cwd` (optional): 请求的运行时工作目录（由后端/运行时策略校验）。若省略，ACP 生成会在配置了目标代理工作区时继承该工作区；缺失的继承路径会回退到后端默认值，而真实访问错误会被返回。
- `label` (optional): 面向操作者的标签，用于会话/横幅文本。
- `resumeSessionId` (optional): 恢复现有的 ACP 会话，而不是创建新会话。代理通过 `session/load` 回放其对话历史。需要 `runtime: "acp"`。
- `streamTo` (optional): `"parent"` 会将初始 ACP 运行进度摘要以系统事件形式流回请求者会话。
  - 在可用时，接受的响应包括 `streamLogPath`，它指向一个会话范围的 JSONL 日志（`<sessionId>.acp-stream.jsonl`），你可以 tail 它以获取完整转发历史。
- `model` (optional): 为 ACP 子会话显式覆盖模型。对 `runtime: "acp"` 生效，因此子会话会使用请求的模型，而不是悄悄回退到目标代理默认值。

## 交付模型

ACP 会话可以是交互式工作区，也可以是父级拥有的后台工作。交付路径取决于这种形态。

### 交互式 ACP 会话

交互式会话旨在在可见的聊天界面上持续对话：

- `/acp spawn ... --bind here` 将当前对话绑定到 ACP 会话。
- `/acp spawn ... --thread ...` 将频道线程/话题绑定到 ACP 会话。
- 持久化配置的 `bindings[].type="acp"` 会将匹配的对话路由到同一个 ACP 会话。

绑定对话中的后续消息会直接路由到 ACP 会话，ACP 输出也会回传到同一个频道/线程/话题。

### 父级拥有的一次性 ACP 会话

由另一个代理运行生成的一次性 ACP 会话属于后台子任务，类似子代理：

- 父级通过 `sessions_spawn({ runtime: "acp", mode: "run" })` 请求工作。
- 子会话在其自己的 ACP harness 会话中运行。
- 完成后通过内部任务完成通知路径回报。
- 当需要面向用户的回复时，父级会用正常的助手语气重写子会话结果。

不要将这条路径视为父子之间的点对点聊天。子会话已经有一条回到父级的完成通道。

### `sessions_send` 与 A2A 交付

`sessions_send` 在生成会话后可以定向到另一个会话。对于普通的对等会话，OpenClaw 在注入消息后会使用 agent-to-agent（A2A）后续路径：

- 等待目标会话的回复
- 可选地允许请求方和目标方进行有限次数的后续轮次
- 要求目标生成一条 announce 消息
- 将该 announce 发送到可见频道或线程

对于发送方需要可见后续的对等发送，这条 A2A 路径是一个回退机制。只要无关会话能够看到并向 ACP 目标发消息，它就保持启用，例如在宽泛的 `tools.sessions.visibility` 设置下。

只有当请求方是其自身父级拥有的一次性 ACP 子会话的父级时，OpenClaw 才会跳过 A2A 后续。在这种情况下，在任务完成之上再运行 A2A 可能会用子会话的结果唤醒父级，把父级的回复再转回子会话，并形成父/子回声循环。对于这种拥有子会话的情况，`sessions_send` 结果会报告 `delivery.status="skipped"`，因为完成路径已经负责处理结果。

### 恢复现有会话

使用 `resumeSessionId` 继续先前的 ACP 会话，而不是启动新的会话。代理通过 `session/load` 回放历史，以完整上下文继续对话。

```json
{
  "task": "继续上次进度 —— 修复剩余测试失败",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常见用例：

- 从笔记本切换到手机继续 Codex 会话，指示代理接续之前的上下文
- 从交互式 CLI 续接一个编码会话，转为无头通过代理运行
- 恢复被网关重启或闲置超时中断的工作

说明：

- `resumeSessionId` 需要 `runtime: "acp"`，与子代理运行时不兼容，会返回错误。
- 恢复会话时，`thread` 和 `mode` 正常生效，且 `mode: "session"` 仍要求 `thread: true`。
- 目标代理须支持 `session/load`（Codex 和 Claude Code 已支持）。
- 找不到指定的会话 ID 会导致启动失败并返回明确错误，不会静默退回到新会话。

<Accordion title="部署后冒烟测试">

在网关部署后，不要只相信单元测试，而应运行一次真实的端到端检查：

1. 验证目标主机上的已部署网关版本和提交。
2. 打开一个临时 ACPX 桥接会话连接到一个在线代理。
3. 要求该代理调用 `sessions_spawn`，并设置 `runtime: "acp"`、`agentId: "codex"`、`mode: "run"`，以及任务 `Reply with exactly LIVE-ACP-SPAWN-OK`。
4. 验证 `accepted=yes`、真实的 `childSessionKey`，且没有校验器错误。
5. 清理临时桥接会话。

请将门控保持为 `mode: "run"`，并跳过 `streamTo: "parent"` —— 线程绑定的 `mode: "session"` 和流转发路径是单独的、更丰富的集成阶段。

</Accordion>

## 沙盒兼容性

ACP 会话当前在主机运行时执行，不在 OpenClaw 沙盒内。

当前限制：

- 请求者会话如被沙盒限制，ACP spawn 调用被阻止（无论 `sessions_spawn({ runtime: "acp" })` 还是 `/acp spawn`）。
  - 错误信息：`'沙盒会话无法生成 ACP 会话，因为 runtime="acp" 在主机上运行。请在沙盒会话中使用 runtime="subagent"。'`
- 使用 `runtime: "acp"` 的 `sessions_spawn` 不支持 `sandbox: "require"`。
  - 错误信息：`'sessions_spawn sandbox="require" 不支持 runtime="acp"，因为 ACP 会话在沙盒外运行。请使用 runtime="subagent" 或 sandbox="inherit"。'`

需要使用沙盒环境时，请改用 `runtime: "subagent"`。

### 通过 `/acp` 命令

亦可通过聊天命令显式启动 ACP 会话。

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --bind here
/acp spawn codex --thread here
```

主要参数：

- `--mode persistent|oneshot`
- `--bind here|off`
- `--thread auto|here|off`
- `--cwd <绝对路径>`
- `--label <名称>`

详见 [斜杠命令](/tools/slash-commands)。

## 会话目标解析

大多数 `/acp` 操作支持可选的会话目标（`session-key`、`session-id` 或 `session-label`）。

解析顺序：

1. 显式目标参数（或 `/acp steer` 的 `--session`）
   - 尝试以键值匹配
   - 若非键，则尝试 UUID 格式的会话 ID
   - 再尝试标签匹配
2. 当前线程绑定的 ACP 会话（若本会话/线程绑定 ACP）
3. 当前请求者的会话回退集

当前对话绑定和线程绑定都参与步骤 2。

如果未解析到目标，OpenClaw 将返回明确的错误（`无法解析会话目标：...`）。

## 生成绑定模式

`/acp spawn` 支持 `--bind here|off`。

| 模式   | 行为                                                               |
| ------ | ------------------------------------------------------------------ |
| `here` | 就地绑定当前激活的对话；若无激活则失败。                           |
| `off`  | 不创建当前对话绑定。                                               |

说明：

- `--bind here` 是让“此频道或聊天由 Codex 支持”的最简单操作路径。
- `--bind here` 不会创建子线程。
- `--bind here` 仅适用于暴露当前对话绑定支持的频道。
- `--bind` 和 `--thread` 不能在同一 `/acp spawn` 调用中组合使用。

## 生成线程模式

`/acp spawn` 支持参数 `--thread auto|here|off`。

| 模式   | 行为说明                                                         |
| ------ | ---------------------------------------------------------------- |
| `auto` | 在线程内激活时绑定该线程；在外部激活且支持时创建/绑定子线程。    |
| `here` | 只允许当前激活线程；非线程环境使用会失败。                      |
| `off`  | 不绑定线程；启动时不关联任何线程。                              |

说明：

- 不支持线程绑定的环境中，默认等同于 `off`。
- 线程绑定启动需频道适配器策略支持：
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`
- 当你想固定当前对话而不创建子线程时，请使用 `--bind here`。

## ACP 控制命令

| 命令                 | 作用                                                     | 示例                                                        |
| -------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| `/acp spawn`         | 创建 ACP 会话；可选当前绑定或线程绑定。                 | `/acp spawn codex --bind here --cwd /repo`                  |
| `/acp cancel`        | 取消目标会话进行中的回合。                               | `/acp cancel agent:codex:acp:<uuid>`                        |
| `/acp steer`         | 向运行中的会话发送引导指令。                             | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 关闭会话并解绑线程目标。                                 | `/acp close`                                                |
| `/acp status`        | 显示后端、模式、状态、运行时选项、能力。               | `/acp status`                                               |
| `/acp set-mode`      | 设置目标会话的运行时模式。                               | `/acp set-mode plan`                                        |
| `/acp set`           | 通用运行时配置选项写入。                                 | `/acp set model openai/gpt-5.4`                             |
| `/acp cwd`           | 设置运行时工作目录覆盖。                                 | `/acp cwd /Users/user/Projects/repo`                        |
| `/acp permissions`   | 设置审批策略配置文件。                                   | `/acp permissions strict`                                   |
| `/acp timeout`       | 设置运行时超时（秒）。                                   | `/acp timeout 120`                                          |
| `/acp model`         | 设置运行时模型覆盖。                                     | `/acp model anthropic/claude-opus-4-6`                      |
| `/acp reset-options` | 移除会话运行时选项覆盖。                                 | `/acp reset-options`                                        |
| `/acp sessions`      | 列出存储中最近的 ACP 会话。                               | `/acp sessions`                                             |
| `/acp doctor`        | 后端健康状态、能力、可操作的修复。                       | `/acp doctor`                                               |
| `/acp install`       | 打印确定的安装和启用步骤。                               | `/acp install`                                              |

`/acp status` 显示生效的运行时选项以及运行时级和后端级会话标识。若后端缺少某项能力，受支持性控制错误会清晰暴露。`/acp sessions` 读取当前绑定或请求者会话的存储；目标令牌（`session-key`、`session-id` 或 `session-label`）通过网关会话发现进行解析，包括每个代理自定义的 `session.store` 根目录。

`/acp sessions` 读取当前绑定或请求者会话的存储。接受 `session-key`、`session-id` 或 `session-label` 令牌的命令通过网关会话发现解析目标，包括自定义每个代理的 `session.store` 根目录。

`/acp` 除了便捷命令，也支持通用设置写入。

等价关系：

- `/acp model <id>` 映射到运行时配置键 `model`。
- `/acp permissions <profile>` 映射到 `approval_policy`。
- `/acp timeout <seconds>` 映射到 `timeout`。
- `/acp cwd <路径>` 更新运行时的 cwd 覆盖。
- `/acp set <key> <value>` 通用路径。
  - 特殊情形：若 `key=cwd`，使用 cwd 覆盖更新。
- `/acp reset-options` 清除目标会话所有运行时覆盖。

## acpx harness、插件设置和权限

有关 acpx harness 配置（Claude Code / Codex / Gemini CLI 别名）、plugin-tools 和 OpenClaw-tools MCP 桥接，以及 ACP 权限模式，请参见
[ACP 代理 —— 设置](/tools/acp-agents-setup)。

## 故障排查

| 症状                                                                     | 可能原因                                                                    | 修复                                                                                                                                                                      |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ACP runtime backend is not configured`                                  | 后端插件缺失或已禁用。                                                      | 安装并启用后端插件，然后运行 `/acp doctor`。                                                                                                                             |
| `ACP is disabled by policy (acp.enabled=false)`                          | ACP 已全局禁用。                                                            | 设置 `acp.enabled=true`。                                                                                                                                               |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`        | 来自普通线程消息的分发被禁用。                                              | 设置 `acp.dispatch.enabled=true`。                                                                                                                                      |
| `ACP agent "<id>" is not allowed by policy`                              | 该代理不在允许列表中。                                                      | 使用允许的 `agentId`，或更新 `acp.allowedAgents`。                                                                                                                     |
| `Unable to resolve session target: ...`                                  | key/id/label 令牌无效。                                                     | 运行 `/acp sessions`，复制准确的 key/label 后重试。                                                                                                                     |
| `--bind here requires running /acp spawn inside an active ... conversation` | 在没有激活的可绑定对话时使用了 `--bind here`。                                | 切换到目标聊天/频道后重试，或使用未绑定的 spawn。                                                                                                                      |
| `Conversation bindings are unavailable for <channel>.`                   | 适配器缺少当前对话 ACP 绑定能力。                                            | 在支持的情况下使用 `/acp spawn ... --thread ...`，配置顶层 `bindings[]`，或切换到受支持的频道。                                                                          |
| `--thread here requires running /acp spawn inside an active ... thread`  | 在线程上下文之外使用了 `--thread here`。                                     | 切换到目标线程，或使用 `--thread auto`/`off`。                                                                                                                         |
| `Only <user-id> can rebind this channel/conversation/thread.`            | 另一位用户拥有当前激活的绑定目标。                                          | 由拥有者重新绑定，或使用不同的对话或线程。                                                                                                                              |
| `Thread bindings are unavailable for <channel>.`                          | 适配器缺少线程绑定能力。                                                    | 使用 `--thread off`，或切换到受支持的适配器/频道。                                                                                                                     |
| `Sandboxed sessions cannot spawn ACP sessions ...`                       | ACP 运行在主机侧；请求者会话被沙盒限制。                                     | 在沙盒会话中使用 `runtime="subagent"`，或从非沙盒会话运行 ACP spawn。                                                                                                   |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`  | 为 ACP 运行时请求了 `sandbox="require"`。                                     | 若需要强制沙盒，请使用 `runtime="subagent"`；或者在非沙盒会话中使用 `sandbox="inherit"` 的 ACP。                                                                          |
| Missing ACP metadata for bound session                                   | 绑定的 ACP 会话元数据过期/已删除。                                          | 使用 `/acp spawn` 重新创建，然后重新绑定/聚焦线程。                                                                                                                    |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`  | `permissionMode` 在非交互 ACP 会话中阻止写入/执行。                          | 将 `plugins.entries.acpx.config.permissionMode` 设为 `approve-all` 并重启网关。参见 [权限配置](/tools/acp-agents-setup#permission-configuration)。                         |
| ACP session fails early with little output                                 | `permissionMode`/`nonInteractivePermissions` 阻止了权限提示。                | 检查网关日志中的 `AcpRuntimeError`。若要完整权限，设置 `permissionMode=approve-all`；若要优雅降级，设置 `nonInteractivePermissions=deny`。                               |
| ACP session stalls indefinitely after completing work                      | harness 进程已结束，但 ACP 会话未报告完成。                                  | 使用 `ps aux \| grep acpx` 监控；手动杀掉陈旧进程。                                                                                                                     |

## 相关

- [子代理](/tools/subagents)
- [多代理沙盒工具](/tools/multi-agent-sandbox-tools)
- [代理发送](/tools/agent-send)
