---
summary: "代理循环生命周期、流和等待语义"
read_when:
  - 你需要关于代理循环或生命周期事件的精确流程说明
  - 你正在更改会话排队、转录写入或会话写锁行为
title: "Agent loop"
---

一个代理式循环是代理的完整“真实”运行：接收输入 → 组装上下文 → 模型推理 →
工具执行 → 流式回复 → 持久化。它是将消息转化为动作和最终回复的权威路径，同时保持会话状态一致。

在 OpenClaw 中，循环是每个会话的单一序列化运行，它将在模型思考、调用工具和流式输出时发出生命周期和流事件。本文档解释了该真实循环如何端到端连接。

## 入口点

- 网关 RPC：`agent` 和 `agent.wait`。
- CLI：`agent` 命令。

## 工作原理（高层次）

1. `agent` RPC 验证参数，解析会话 (sessionKey/sessionId)，持久化会话元数据，立即返回 `{ runId, acceptedAt }`。
2. `agentCommand` 运行代理：
   - 解析模型 + thinking/verbose/trace 默认值
   - 加载技能快照
   - 调用 `runEmbeddedPiAgent` (pi-agent-core 运行时)
   - 如果嵌入循环未发出，则发出 **生命周期结束/错误**
3. `runEmbeddedPiAgent`:
   - 通过每会话 + 全局队列序列化运行
   - 解析模型 + 认证配置文件并构建 pi 会话
   - 订阅 pi 事件并流式传输助手/工具增量
   - 强制执行超时 -> 如果超过则中止运行
   - 返回载荷 + 使用元数据
4. `subscribeEmbeddedPiSession` 将 pi-agent-core 事件桥接到 OpenClaw `agent` 流：
   - 工具事件 => `stream: "tool"`
   - 助手增量 => `stream: "assistant"`
   - 生命周期事件 => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` 使用 `waitForAgentRun`:
   - 等待 `runId` 的 **生命周期结束/错误**
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 排队 + 并发

- 运行按会话键（session lane）串行化，并且可选地通过全局队列串行化。
- 这可以防止工具/会话竞态，并保持会话历史一致。
- 消息通道可以选择队列模式（collect/steer/followup），这些模式会进入该队列系统。
  参见 [Command Queue](/concepts/queue)。
- 转录写入也通过会话文件上的会话写锁保护。该锁具备进程感知并基于文件，因此它能够捕获绕过进程内队列或来自
  其他进程的写入者。
- 会话写锁默认是不可重入的。如果某个辅助函数在保持单一逻辑写入者的同时，有意对同一把锁进行嵌套获取，则必须显式启用
  `allowReentrant: true`。

## 会话 + 工作区准备

- 工作区会被解析并创建；沙盒化运行可能会重定向到沙盒工作区根目录。
- 技能会被加载（或从快照中复用）并注入到 env 和 prompt 中。
- 启动/上下文文件会被解析并注入系统提示报告。
- 会获取会话写锁；在流式传输之前会打开并准备 `SessionManager`。任何
  之后的转录重写、压缩或截断路径，在打开或
  修改转录文件之前都必须持有同一把锁。

## 提示组装 + 系统提示

- 系统提示由 OpenClaw 基础提示、技能提示、引导上下文和每次运行的覆盖组成。
- 强制执行模型特定限制及压缩保留令牌。
- 参见 [系统提示](/concepts/system-prompt) 了解模型能看到的内容。

## 钩子点（可拦截的地方）

OpenClaw 有两种钩子系统：

- **内部钩子**（Gateway 钩子）：针对命令和生命周期事件的事件驱动脚本。
- **插件钩子**：代理/工具生命周期和网关管道内的扩展点。

### 内部钩子（Gateway 钩子）

- **`agent:bootstrap`**：在构建引导文件、系统提示定稿之前运行。用于添加或移除引导上下文文件。
- **命令钩子**：`/new`、`/reset`、`/stop` 等命令事件（详见钩子文档）。

详见 [钩子](/automation/hooks) 的设置和示例。

### 插件钩子（代理 + 网关生命周期）

这些钩子运行在代理循环或网关管道内：

- **`before_model_resolve`**: 在会话前运行（无 `messages`），在模型解析之前确定性地覆盖 provider/model。
- **`before_prompt_build`**: 在会话加载后运行（带 `messages`），在提示提交之前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。对每轮动态文本使用 `prependContext`，对应放在系统提示空间中的稳定引导信息使用系统上下文字段。
- **`before_agent_start`**: 兼容旧版的钩子，可能在任一阶段运行；优先使用上面的显式钩子。
- **`before_agent_reply`**: 在内联动作之后、LLM 调用之前运行，允许插件接管该轮并返回一个合成回复，或完全静默该轮。
- **`agent_end`**: 在完成后检查最终消息列表和运行元数据。
- **`before_compaction` / `after_compaction`**: 观察或标注压缩循环。
- **`before_tool_call` / `after_tool_call`**: 拦截工具参数/结果。
- **`before_install`**: 检查内置扫描结果，并可选择阻止技能或插件安装。
- **`tool_result_persist`**: 在工具结果写入 OpenClaw 拥有的会话转录之前，同步转换工具结果。
- **`message_received` / `message_sending` / `message_sent`**: 入站 + 出站消息钩子。
- **`session_start` / `session_end`**: 会话生命周期边界。
- **`gateway_start` / `gateway_stop`**: 网关生命周期事件。

外发/工具守卫的 Hook 决策规则：

- `before_tool_call`：`{ block: true }` 是终态的，并停止低优先级处理程序。
- `before_tool_call`：`{ block: false }` 是无操作，不会清除之前的阻止。
- `before_install`：`{ block: true }` 是终态的，并停止低优先级处理程序。
- `before_install`：`{ block: false }` 是无操作，不会清除之前的阻止。
- `message_sending`：`{ cancel: true }` 是终态的，并停止低优先级处理程序。
- `message_sending`：`{ cancel: false }` 是无操作，不会清除之前的取消。

参见 [插件钩子](/plugins/hooks) 了解钩子 API 和注册细节。

Harnesses 可能会以不同方式调整这些钩子。Codex app-server harness 保持
OpenClaw 插件钩子作为文档化镜像表面的兼容性契约，而 Codex 原生钩子仍然是一个独立的、较底层的 Codex 机制。

## 流式传输 + 部分回复

- 助手增量从 pi-agent-core 流式传输并作为 `assistant` 事件发出。
- 块式流可以在 `text_end` 或 `message_end` 发出部分回复。
- 推理流可以独立成流或作为块回复发出。
- 见 [流式传输](/concepts/streaming) 了解分块和块回复行为。

## 工具执行 + 消息工具

- 工具启动/更新/结束事件在 `tool` 流发出。
- 工具结果在记录/发出前进行大小和图像载荷的清理。
- 消息工具发送被追踪以抑制重复助手确认。

## 回复塑形 + 抑制

- 最终载荷由以下部分组成：
  - 助手文本（及可选推理）
  - 内联工具摘要（当详细 + 允许时）
  - 模型出错时的助手错误文本
- 确切的静默令牌 `NO_REPLY` / `no_reply` 会从外发载荷中过滤掉。
- 消息工具重复项会从最终载荷列表中移除。
- 如果没有可渲染的载荷剩余且工具出错，则会发出后备工具错误回复（除非消息工具已经发送了用户可见的回复）。

## 压缩 + 重试

- 自动压缩发出 `compaction` 流事件，可触发重试。
- 重试时重置内存缓冲区和工具摘要，避免重复输出。
- 详见 [压缩](/concepts/compaction) 的压缩管道。

## 事件流（目前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 发出（若无则由 `agentCommand` 作为兜底）
- `assistant`：pi-agent-core 的流式增量
- `tool`：pi-agent-core 流式工具事件

## 聊天通道处理

- 助手增量缓冲为聊天 `delta` 消息。
- 在 **生命周期结束/错误** 时发出聊天 `final`。

## 超时

- `agent.wait` 默认：30s（仅等待）。`timeoutMs` 参数会覆盖。
- Agent 运行时：`agents.defaults.timeoutSeconds` 默认 172800s（48 小时）；在 `runEmbeddedPiAgent` 中由中止计时器强制执行。
- 模型空闲超时：当在空闲窗口结束前没有响应块到达时，OpenClaw 会中止模型请求。`models.providers.<id>.timeoutSeconds` 会为较慢的本地/自托管提供方延长此空闲看门狗；否则 OpenClaw 在配置时使用 `agents.defaults.timeoutSeconds`，默认上限为 120s。对于没有显式模型或代理超时的 cron 触发运行，会禁用空闲看门狗，并依赖 cron 外层超时。
- 提供方 HTTP 请求超时：`models.providers.<id>.timeoutSeconds` 适用于该提供方的模型 HTTP 获取，包括连接、响应头、响应体、SDK 请求超时、总受保护获取中止处理，以及模型流空闲看门狗。在为诸如 Ollama 之类较慢的本地/自托管提供方提高整个代理运行时超时之前，请使用此配置。

## 可能提前结束的情况

- 代理超时（中止）
- AbortSignal（取消）
- 网关断开或 RPC 超时
- `agent.wait` 超时（仅等待，不停止代理）

## 相关内容

- [工具](/tools) — 可用的代理工具
- [钩子](/automation/hooks) — 由代理生命周期事件触发的事件驱动脚本
- [压缩](/concepts/compaction) — 长对话如何被总结
- [执行审批](/tools/exec-approvals) — Shell 命令的审批关卡
- [思考](/tools/thinking) — 思考/推理级别配置
