---
summary: "Agent loop 生命周期、流式传输与等待语义"
read_when:
  - 你需要对 agent loop 或生命周期事件进行精确的逐步说明
  - 你正在更改 session 队列、transcript 写入或 session 写锁行为
title: "Agent loop"
---

agentic loop 是 agent 的完整“真实”运行：接收输入 → 组装上下文 → 模型推理 →
工具执行 → 流式回复 → 持久化。它是将消息转化为动作和最终回复的权威路径，同时保持 session 状态一致。

在 OpenClaw 中，loop 是每个 session 一次单线程串行运行：当模型思考、调用工具并流式输出时，它会发出生命周期和流事件。本文说明这个真实 loop 是如何端到端连接起来的。

## 入口点

- Gateway RPC：`agent` 和 `agent.wait`。
- CLI：`agent` 命令。

## 工作原理（高层）

1. `agent` RPC 验证参数，解析 session（sessionKey/sessionId），持久化 session 元数据，并立即返回 `{ runId, acceptedAt }`。
2. `agentCommand` 运行 agent：
   - 解析模型 + thinking/verbose/trace 默认值
   - 加载 skills 快照
   - 调用 `runEmbeddedPiAgent`（pi-agent-core 运行时）
   - 如果嵌入式 loop 没有发出 **lifecycle end/error**，则发出该事件
3. `runEmbeddedPiAgent`：
   - 通过每 session + 全局队列串行化运行
   - 解析模型 + 认证配置文件并构建 pi session
   - 订阅 pi 事件并流式输出 assistant/tool 增量
   - 强制超时 -> 超出则中止运行
   - 对于 Codex app-server turns，如果已接受的 turn 在没有产生 app-server 进度且没有终止事件之前停止，则中止它
   - 返回 payload 和 usage 元数据
4. `subscribeEmbeddedPiSession` 将 pi-agent-core 事件桥接到 OpenClaw `agent` 流：
   - tool 事件 => `stream: "tool"`
   - assistant 增量 => `stream: "assistant"`
   - lifecycle 事件 => `stream: "lifecycle"`（`phase: "start" | "end" | "error"`）
5. `agent.wait` 使用 `waitForAgentRun`：
   - 等待 `runId` 的 **lifecycle end/error**
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 排队 + 并发

- 运行会按 session key（session lane）串行化，并且可选地通过全局 lane 串行化。
- 这可以防止工具/session 竞争，并保持 session 历史一致。
- 消息通道可以选择队列模式（collect/steer/followup），并将其输入这个 lane 系统。
  见 [Command Queue](/concepts/queue)。
- transcript 写入也受到 session 文件上的 session write lock 保护。该锁具备进程感知且基于文件，因此能够捕获绕过进程内队列的写入者，或来自其他进程的写入者。
- session write lock 默认不可重入。如果某个 helper 有意在保持单一逻辑写入者的前提下，对同一把锁进行嵌套获取，则必须显式使用 `allowReentrant: true` 进行开启。

## Session + workspace 准备

- workspace 会被解析并创建；沙箱运行可能会重定向到沙箱 workspace 根目录。
- skills 会被加载（或复用快照）并注入到 env 和 prompt。
- bootstrap/context 文件会被解析并注入到 system prompt 报告中。
- 会获取 session write lock；在流式传输开始前，`SessionManager` 会被打开并准备好。任何后续的 transcript 重写、压缩或截断路径，在打开或修改 transcript 文件之前都必须获取同一把锁。

## Prompt 组装 + system prompt

- system prompt 由 OpenClaw 的基础 prompt、skills prompt、bootstrap context 和每次运行的覆盖项构成。
- 会强制执行与模型相关的限制和压缩预留 token。
- 参见 [System prompt](/concepts/system-prompt) 了解模型会看到什么。

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

- **`before_model_resolve`**：在 session 前运行（没有 `messages`），用于在模型解析前确定性地覆盖 provider/model。
- **`before_prompt_build`**：在 session 加载后运行（带有 `messages`），用于在 prompt 提交前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。`prependContext` 适合每轮动态文本，而 system-context 字段适合放置应位于 system prompt 空间中的稳定指导。
- **`before_agent_start`**：兼容旧版的 hook，可能在任一阶段运行；优先使用上面的显式 hooks。
- **`before_agent_reply`**：在内联动作之后、LLM 调用之前运行，允许插件接管本轮并返回一个合成回复，或完全让本轮静默。
- **`agent_end`**：在完成后检查最终消息列表和运行元数据。
- **`before_compaction` / `after_compaction`**：观察或标注 compaction 周期。
- **`before_tool_call` / `after_tool_call`**：拦截工具参数/结果。
- **`before_install`**：检查内置扫描结果，并可选择阻止 skill 或 plugin 安装。
- **`tool_result_persist`**：在工具结果写入 OpenClaw 所拥有的 session transcript 之前，进行同步转换。
- **`message_received` / `message_sending` / `message_sent`**：入站 + 出站消息 hooks。
- **`session_start` / `session_end`**：session 生命周期边界。
- **`gateway_start` / `gateway_stop`**：gateway 生命周期事件。

出站/工具守卫的 hook 决策规则：

- `before_tool_call`：`{ block: true }` 是终止性的，并停止低优先级处理器。
- `before_tool_call`：`{ block: false }` 是无操作，不会清除之前的 block。
- `before_install`：`{ block: true }` 是终止性的，并停止低优先级处理器。
- `before_install`：`{ block: false }` 是无操作，不会清除之前的 block。
- `message_sending`：`{ cancel: true }` 是终止性的，并停止低优先级处理器。
- `message_sending`：`{ cancel: false }` 是无操作，不会清除之前的 cancel。

参见 [Plugin hooks](/plugins/hooks) 了解 hook API 和注册细节。

Harness 可能会以不同方式适配这些 hooks。Codex app-server harness 将 OpenClaw plugin hooks 作为文档化镜像表面的兼容性契约，而 Codex native hooks 则保持为一套独立的更底层 Codex 机制。

## 流式传输 + 部分回复

- assistant 增量会从 pi-agent-core 流式传出，并作为 `assistant` 事件发出。
- block 流式传输可以在 `text_end` 或 `message_end` 时发出部分回复。
- reasoning 流式传输可以作为单独的 stream 发出，也可以作为 block 回复发出。
- 参见 [Streaming](/concepts/streaming) 了解分块和 block reply 行为。

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

- `lifecycle`：由 `subscribeEmbeddedPiSession` 发出（并且由 `agentCommand` 作为兜底）
- `assistant`：来自 pi-agent-core 的流式增量
- `tool`：来自 pi-agent-core 的流式工具事件

## Chat 通道处理

- assistant 增量会被缓冲为 chat `delta` 消息。
- chat `final` 会在 **lifecycle end/error** 时发出。

## 超时

- `agent.wait` 默认：30s（仅等待时间）。`timeoutMs` 参数可覆盖。
- Agent 运行时：`agents.defaults.timeoutSeconds` 默认 172800s（48 小时）；在 `runEmbeddedPiAgent` 的中止计时器中强制执行。
- Cron 运行时：独立的 agent-turn `timeoutSeconds` 由 cron 管理。调度器会在执行开始时启动该计时器，在配置的截止时间中止底层运行，然后在记录超时前执行有界清理，以免陈旧的子 session 一直占住 lane。
- 卡住的 session 恢复：在启用诊断时，`diagnostics.stuckSessionWarnMs` 会检测长时间处于 `processing` 的 session。活跃的嵌入式运行、活跃的回复操作以及活跃的 session-lane 任务默认仅发出警告；如果诊断显示该 session 没有活跃工作，watchdog 会释放受影响的 session lane，以便排队中的启动工作得以继续。
- 模型空闲超时：当在空闲窗口之前没有收到响应分块时，OpenClaw 会中止模型请求。`models.providers.<id>.timeoutSeconds` 会为较慢的本地/自托管 provider 延长这个空闲 watchdog；否则 OpenClaw 会在配置时使用 `agents.defaults.timeoutSeconds`，默认上限为 120s。对于没有显式模型或 agent 超时的 cron 触发运行，将禁用空闲 watchdog，并依赖 cron 外层超时。
- Provider HTTP 请求超时：`models.providers.<id>.timeoutSeconds` 适用于该 provider 的模型 HTTP fetch，包括 connect、headers、body、SDK 请求超时、总的受保护 fetch 中止处理，以及模型流空闲 watchdog。在提高整个 agent 运行时超时之前，可先为较慢的本地/自托管 provider（例如 Ollama）使用此项。

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
