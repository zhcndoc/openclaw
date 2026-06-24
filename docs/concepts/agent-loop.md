---
summary: "Agent loop 生命周期、流式传输与等待语义"
read_when:
  - 你需要对 agent loop 或生命周期事件进行精确的逐步说明
  - 你正在更改 session 队列、transcript 写入或 session 写锁行为
title: "Agent loop"
---

agentic loop 是 agent 的完整“真实”运行：接收输入 → 组装上下文 → 模型推理 →
工具执行 → 流式回复 → 持久化。它是将一条消息转换为动作和最终回复的权威路径，同时保持 session 状态一致。

在 OpenClaw 中，loop 是每个 session 一次单线程串行运行：当模型思考、调用工具并流式输出时，它会发出生命周期和流事件。本文说明这个真实 loop 是如何端到端连接起来的。

## 入口点

- Gateway RPC：`agent` 和 `agent.wait`。
- CLI：`agent` 命令。

## 工作原理（高层）

1. `agent` RPC 验证参数，解析 session（`sessionKey`/`sessionId`），持久化 session 元数据，并立即返回 `{ runId, acceptedAt }`。
2. `agentCommand` 运行 agent：
   - 解析模型 + thinking/verbose/trace 默认值
   - 加载 skills 快照
   - 调用 `runEmbeddedAgent`（OpenClaw agent 运行时）
   - 如果嵌入式 loop 没有发出生命周期结束/错误事件，则发出 **lifecycle end/error**
3. `runEmbeddedAgent`：
   - 通过每个 session + 全局队列串行化运行
   - 解析模型 + auth profile 并构建 OpenClaw session
   - 订阅 runtime 事件并流式传输 assistant/tool 增量
   - 强制执行超时 -> 超时后中止运行
   - 对于 Codex app-server turn，如果已接受的 turn 在没有产生 app-server 进度且未到终态事件前停止，则中止该 turn
   - 返回 payload 和 usage 元数据
4. `subscribeEmbeddedAgentSession` 将 agent runtime 事件桥接到 OpenClaw `agent` 流：
   - tool 事件 => `stream: "tool"`
   - assistant deltas => `stream: "assistant"`
   - lifecycle 事件 => `stream: "lifecycle"`（`phase: "start" | "end" | "error"`）
5. `agent.wait` 使用 `waitForAgentRun`：
   - 等待 `runId` 的 **lifecycle end/error**
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 排队 + 并发

- 运行会按 session key（session lane）串行化，并且可选地通过全局 lane 进一步串行化。
- 这可以防止工具/session 竞争，并保持 session 历史一致。
- 消息通道可以选择队列模式（steer/followup/collect/interrupt），这些模式会进入该 lane 系统。
  参见 [Command Queue](/concepts/queue)。
- transcript 写入也受 session 文件上的 session 写锁保护。该锁具有进程感知且基于文件，因此可以捕获绕过进程内队列或来自其他进程的写入者。session transcript 写入器最多等待 `session.writeLock.acquireTimeoutMs`
  之后才会将 session 报告为繁忙；默认值为 `60000` ms。
- session 写锁默认不可重入。如果某个 helper 有意在保持单一逻辑写入者的同时嵌套获取同一把锁，则必须显式启用
  `allowReentrant: true`。

## Session + workspace 准备

- workspace 会被解析并创建；沙箱运行可能会重定向到沙箱 workspace 根目录。
- skills 会被加载（或复用快照）并注入到 env 和 prompt。
- bootstrap/context 文件会被解析并注入到 system prompt 报告中。
- 会获取 session write lock；在流式传输开始前，`SessionManager` 会被打开并准备好。任何后续的 transcript 重写、压缩或截断路径，在打开或修改 transcript 文件之前都必须获取同一把锁。

## Prompt 组装 + system prompt

- 系统提示词基于 OpenClaw 的基础提示词、skills 提示词、bootstrap 上下文以及每次运行的覆盖项构建。
- 会强制执行模型相关限制和 compaction 预留 token。
- 参见 [System prompt](/concepts/system-prompt) 了解模型能看到的内容。

## Hook 点（你可以在这里拦截）

OpenClaw 有两套 hook 系统：

- **内部 hooks**（Gateway hooks）：用于命令和生命周期事件的事件驱动脚本。
- **插件 hooks**：agent/tool 生命周期和 gateway pipeline 内的扩展点。

### 内部 hooks（Gateway hooks）

- **`agent:bootstrap`**：在构建 bootstrap 文件、system prompt 最终定稿之前运行。
  可用于添加/移除 bootstrap 上下文文件。
- **命令 hooks**：`/new`、`/reset`、`/stop` 以及其他命令事件（见 Hooks 文档）。

参见 [Hooks](/automation/hooks) 了解配置与示例。

### 插件 hooks（agent + gateway 生命周期）

这些 hook 在 agent loop 或 gateway pipeline 内部运行：

- **`before_model_resolve`**：在 session 之前运行（没有 `messages`），用于在模型解析之前确定性地覆盖 provider/model。
- **`before_prompt_build`**：在 session 加载之后运行（带有 `messages`），用于在提交 prompt 之前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。对每轮动态文本使用 `prependContext`，对适合放在 system prompt 空间中的稳定指导使用 system-context 字段。
- **`before_agent_start`**：遗留兼容 hook，可能在任一阶段运行；优先使用上面的显式 hook。
- **`before_agent_reply`**：在内联动作之后、LLM 调用之前运行，允许插件接管该轮并返回合成回复，或者完全静默该轮。
- **`agent_end`**：在完成后检查最终消息列表和运行元数据。
- **`before_compaction` / `after_compaction`**：观察或注释 compaction 周期。
- **`before_tool_call` / `after_tool_call`**：拦截工具参数/结果。
- **`before_install`**：在运维安装策略运行之后、当前 OpenClaw 进程中加载了插件 hooks 时，检查已分阶段的 skill 或插件安装材料。
- **`tool_result_persist`**：在工具结果写入 OpenClaw 拥有的 session transcript 之前，同步转换这些结果。
- **`message_received` / `message_sending` / `message_sent`**：入站 + 出站消息 hooks。
- **`session_start` / `session_end`**：session 生命周期边界。
- **`gateway_start` / `gateway_stop`**：gateway 生命周期事件。

出站/工具守卫的 hook 决策规则：

- `before_tool_call`: `{ block: true }` 是终止性的，并会停止低优先级处理器。
- `before_tool_call`: `{ block: false }` 是无操作，不会清除先前的 block。
- `before_install`: `{ block: true }` 是终止性的，并会停止低优先级处理器。
- `before_install`: `{ block: false }` 是无操作，不会清除先前的 block。
- 对于必须覆盖 CLI 安装和更新路径的、由运维拥有的安装允许/阻止决策，请使用 `security.installPolicy`，而不是 `before_install`。
- `message_sending`: `{ cancel: true }` 是终止性的，并会停止低优先级处理器。
- `message_sending`: `{ cancel: false }` 是无操作，不会清除先前的 cancel。

参见 [Plugin hooks](/plugins/hooks) 了解 hook API 和注册细节。

Harness 可能会以不同方式适配这些 hooks。Codex app-server harness 将 OpenClaw plugin hooks 作为文档化镜像表面的兼容性契约，而 Codex native hooks 则保持为一套独立的更底层 Codex 机制。

## 流式传输 + 部分回复

- Assistant 增量会从 agent runtime 流式输出，并作为 `assistant` 事件发出。
- 块流式传输可以在 `text_end` 或 `message_end` 时发出部分回复。
- Reasoning 流式传输可以作为单独的流或块回复发出。
- 参见 [Streaming](/concepts/streaming) 了解分块和块回复行为。

## 工具执行 + 消息工具

- 工具 start/update/end 事件会在 `tool` stream 上发出。
- 工具结果在记录/发出前会针对大小和图像载荷进行清理。
- 会跟踪 messaging tool 的发送，以抑制重复的 assistant 确认。

## 回复整形 + 抑制

- 最终 payload 会由以下内容组装：
  - assistant 文本（以及可选的 reasoning）
  - 内联工具摘要（在 verbose 且允许时）
  - 当模型出错时的 assistant 错误文本
- 精确的静默 token `NO_REPLY` / `no_reply` 会从出站 payload 中过滤掉。
- messaging tool 的重复内容会从最终 payload 列表中移除。
- 如果没有可渲染的 payload，且工具发生错误，则会发出一个兜底的工具错误回复
  （除非某个 messaging tool 已经向用户发送了可见回复）。

## 压缩 + 重试

- 自动压缩会发出 `compaction` stream 事件，并且可能触发重试。
- 重试时，会重置内存缓冲区和工具摘要，以避免重复输出。
- 参见 [Compaction](/concepts/compaction) 了解 compaction 流水线。

## 事件流（当前）

- `lifecycle`：由 `subscribeEmbeddedAgentSession` 发出（并且作为后备由 `agentCommand` 发出）
- `assistant`：来自 agent runtime 的流式增量
- `tool`：来自 agent runtime 的流式工具事件

## Chat 通道处理

- assistant 增量会被缓冲为 chat `delta` 消息。
- chat `final` 会在 **生命周期结束/错误** 时发出。

## 超时

- `agent.wait` 默认值：30s（仅等待）。`timeoutMs` 参数可覆盖。
- Agent runtime：`agents.defaults.timeoutSeconds` 默认 172800s（48 小时）；由 `runEmbeddedAgent` 中的 abort 定时器强制执行。
- Cron runtime：隔离的 agent-turn `timeoutSeconds` 由 cron 拥有。调度器会在执行开始时启动该定时器，在配置的截止时间到达时中止底层运行，然后在记录超时前执行有界清理，这样陈旧的子 session 就不会让 lane 卡住。
- Session 生命体征诊断：启用诊断后，`diagnostics.stuckSessionWarnMs` 会将长时间 `processing` 且未观察到回复、工具、状态、block 或 ACP 进度的 session 归类。活动中的嵌入式运行、模型调用和工具调用会报告为 `session.long_running`；有主的静默模型调用也会保持为 `session.long_running`，直到 `diagnostics.stuckSessionAbortMs`，这样慢速或不流式的提供方不会过早被报告为卡住。没有最近进度的活动工作会报告为 `session.stalled`；有主的模型调用会在或超过中止阈值时切换为 `session.stalled`，而无主的陈旧模型/工具活动只要仍然存在，就不会被隐藏为 long-running。`session.stuck` 保留给可恢复的陈旧 session 记账，包括带有陈旧无主模型/工具活动的空闲排队 session。陈旧 session 记账在恢复门通过后会立即释放受影响的 session lane；卡住的嵌入式运行只会在 `diagnostics.stuckSessionAbortMs` 之后进行中止清理（默认：至少 5 分钟且为警告阈值的 3 倍），这样排队工作可以恢复，而不会仅仅因为运行缓慢就被切断。恢复会发出结构化的 requested/completed 结果，并且只有在同一 processing generation 仍然是当前代时，诊断状态才会标记为空闲。只要 session 保持不变，重复的 `session.stuck` 诊断就会退避。
- 模型空闲超时：当在空闲窗口结束前没有到达响应分块时，OpenClaw 会中止模型请求。`models.providers.<id>.timeoutSeconds` 会为缓慢的本地/自托管提供方延长这个空闲看门狗，但它仍然受更低的 `agents.defaults.timeoutSeconds` 或运行特定超时的约束，因为这些控制的是整个 agent 运行。否则，OpenClaw 在配置时会使用 `agents.defaults.timeoutSeconds`，默认上限为 120s。没有显式模型或 agent 超时的 cron 触发云模型运行会使用相同的默认空闲看门狗；cron 触发的本地或自托管模型运行会禁用隐式看门狗，除非配置了显式超时，因此较慢的本地提供方应设置 `models.providers.<id>.timeoutSeconds`。
- 提供方 HTTP 请求超时：`models.providers.<id>.timeoutSeconds` 适用于该提供方的模型 HTTP fetch，包括连接、headers、body、SDK 请求超时、总受保护 fetch 中止处理以及模型流空闲看门狗。对于像 Ollama 这样的缓慢本地/自托管提供方，在提高整个 agent 运行时超时之前应优先使用此项；当模型请求需要运行更久时，agent/runtime 超时应至少保持同样高。

## 何时会更早结束

- Agent 超时（abort）
- AbortSignal（cancel）
- Gateway 断开连接或 RPC 超时
- `agent.wait` 超时（仅等待，不停止 agent）

## 相关内容

- [Tools](/tools) — 可用的 agent 工具
- [Hooks](/automation/hooks) — 由 agent 生命周期事件触发的事件驱动脚本
- [Compaction](/concepts/compaction) — 如何对长对话进行摘要
- [Exec Approvals](/tools/exec-approvals) — shell 命令的审批门禁
- [Thinking](/tools/thinking) — thinking/reasoning 级别配置
