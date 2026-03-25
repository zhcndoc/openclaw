---
summary: "代理循环生命周期、流和等待语义"
read_when:
  - 你需要对代理循环或生命周期事件进行精确的 walkthrough
title: "代理循环"
---

# 代理循环（OpenClaw）

代理循环是代理的完整“真实”运行流程：输入 → 上下文组装 → 模型推理 → 工具执行 → 流式回复 → 持久化。这是将消息转化为动作和最终回复的权威路径，同时保持会话状态一致。

在 OpenClaw 中，循环是每个会话的单一序列化运行，它将在模型思考、调用工具和流式输出时发出生命周期和流事件。本文档解释了该真实循环如何端到端连接。

## 入口点

- 网关 RPC：`agent` 和 `agent.wait`。
- CLI：`agent` 命令。

## 工作原理（高层次）

1. `agent` RPC 验证参数，解析会话（sessionKey/sessionId），持久化会话元数据，立即返回 `{ runId, acceptedAt }`。
2. `agentCommand` 运行代理：
   - 解析模型 + 思考/详细模式默认值
   - 加载技能快照
   - 调用 `runEmbeddedPiAgent`（pi-agent-core 运行时）
   - 如果嵌入式循环未发出生命周期结束/错误事件，则发出 **生命周期结束/错误** 事件
3. `runEmbeddedPiAgent`：
   - 通过每个会话和全局走道序列化运行
   - 解析模型 + 认证配置，构建 pi 会话
   - 订阅 pi 事件并流式传输助手/工具增量
   - 强制超时 -> 超时则中止运行
   - 返回有效载荷和使用元数据
4. `subscribeEmbeddedPiSession` 桥接 pi-agent-core 事件到 OpenClaw `agent` 流：
   - 工具事件 => `stream: "tool"`
   - 助手增量 => `stream: "assistant"`
   - 生命周期事件 => `stream: "lifecycle"`（`phase: "start" | "end" | "error"`）
5. `agent.wait` 使用 `waitForAgentJob`：
   - 等待指定 `runId` 的 **生命周期结束/错误**
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 排队 + 并发

- 运行将根据会话键（会话走道）序列化，且可选通过全局走道。
- 这防止了工具/会话竞争，保持会话历史一致。
- 消息通道可选择队列模式（collect/steer/followup）以喂入此走道系统。
  详见 [命令队列](/concepts/queue)。

## 会话 + 工作区准备

- 解析并创建工作区；沙盒运行可能重定向到沙盒工作区根目录。
- 加载技能（或重用快照），注入环境和提示。
- 解析引导/上下文文件，并注入系统提示报告。
- 获取会话写锁；在流式前打开并准备 `SessionManager`。

## 提示组装 + 系统提示

- 系统提示由 OpenClaw 基础提示、技能提示、引导上下文和每次运行的覆盖组成。
- 强制模型特定限制及压缩保留令牌。
- 参见 [系统提示](/concepts/system-prompt) 了解模型能看到的内容。

## 钩子点（可拦截的地方）

OpenClaw 有两种钩子系统：

- **内部钩子**（Gateway 钩子）：针对命令和生命周期事件的事件驱动脚本。
- **插件钩子**：代理/工具生命周期和网关管道内的扩展点。

### 内部钩子（Gateway 钩子）

- **`agent:bootstrap`**：在构建引导文件、系统提示定稿之前运行。用于添加或移除引导上下文文件。
- **命令钩子**：`/new`、`/reset`、`/stop` 等命令事件（详见钩子文档）。

详见 [Hooks](/automation/hooks) 的设置和示例。

### 插件钩子（代理 + 网关生命周期）

这些钩子运行在代理循环或网关管道内：

- **`before_model_resolve`**：在会话前运行（无 `messages`），用于确定性覆盖提供方/模型选择。
- **`before_prompt_build`**：会话加载后运行（带 `messages`），用来注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`，在提示提交前调用。`prependContext` 用于每轮动态文本，系统上下文字段用于稳定且应保持在系统提示空间的指导内容。
- **`before_agent_start`**：遗留兼容钩子，可能在任一阶段运行；优先使用上述显式钩子。
- **`agent_end`**：完成后检查最终消息列表和运行元数据。
- **`before_compaction` / `after_compaction`**：观察或注释压缩周期。
- **`before_tool_call` / `after_tool_call`**：拦截工具参数和结果。
- **`tool_result_persist`**：同步变换工具结果，在写入会话记录前。
- **`message_received` / `message_sending` / `message_sent`**：入站 + 出站消息钩子。
- **`session_start` / `session_end`**：会话生命周期边界。
- **`gateway_start` / `gateway_stop`**：网关生命周期事件。

See [Plugin hooks](/plugins/architecture#provider-runtime-hooks) for the hook API and registration details.

## 流式传输 + 部分回复

- 助手增量从 pi-agent-core 流式传输并作为 `assistant` 事件发出。
- 块式流可以在 `text_end` 或 `message_end` 发出部分回复。
- 推理流可以独立成流或作为块回复发出。
- 见 [Streaming](/concepts/streaming) 了解分块和块回复行为。

## 工具执行 + 消息工具

- 工具启动/更新/结束事件在 `tool` 流发出。
- 工具结果在记录/发出前进行大小和图像载荷的清理。
- 消息工具发送被追踪以抑制重复助手确认。

## 回复塑形 + 抑制

- 最终有效载荷由以下组成：
  - 助手文本（和可选的推理）
  - 内联工具摘要（当详细 + 允许时）
  - 模型错误时的助手错误文本
- `NO_REPLY` 视为静默令牌，从外发有效载荷中过滤。
- 消息工具重复项从最终载荷列表移除。
- 若无可呈现载荷且工具发生错误，则发出备用工具错误回复（除非消息工具已发出用户可见回复）。

## 压缩 + 重试

- 自动压缩发出 `compaction` 流事件，可触发重试。
- 重试时重置内存缓冲区和工具摘要，避免重复输出。
- 详见 [Compaction](/concepts/compaction) 的压缩管道。

## 事件流（目前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 发出（若无则由 `agentCommand` 作为兜底）
- `assistant`：pi-agent-core 的流式增量
- `tool`：pi-agent-core 流式工具事件

## 聊天通道处理

- 助手增量缓冲为聊天 `delta` 消息。
- 在 **生命周期结束/错误** 时发出聊天 `final`。

## 超时

- `agent.wait` 默认：30秒（仅等待），可由 `timeoutMs` 参数覆盖。
- 代理运行时：`agents.defaults.timeoutSeconds` 默认 600 秒；在 `runEmbeddedPiAgent` 超时定时中强制执行。

## 可能提前结束的情况

- 代理超时（中止）
- AbortSignal（取消）
- 网关断开或 RPC 超时
- `agent.wait` 超时（仅等待，不停止代理）
