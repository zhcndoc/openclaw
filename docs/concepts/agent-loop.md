---
summary: "Agent loop 生命周期、流式传输与等待语义"
read_when:
  - 你需要对 agent loop 或生命周期事件进行精确的逐步说明
  - 你正在更改 session 队列、transcript 写入或 session 写锁行为
title: "Agent loop"
---

agent loop 是按会话串行执行的运行流程，它将一条消息转换为
动作和回复：接收、上下文组装、模型推理、工具
执行、流式传输、持久化。

## 入口点

- Gateway RPC: `agent` 和 `agent.wait`。
- CLI: `openclaw agent`。

## 运行顺序

1. `agent` RPC 验证参数，解析会话（`sessionKey`/`sessionId`），持久化会话元数据，并立即返回 `{ runId, acceptedAt }`。
2. `agentCommand` 执行该轮：解析模型 + thinking/verbose/trace 默认值，加载 skills 快照，调用 `runEmbeddedAgent`，并在嵌入式循环尚未发出时补发一个 **lifecycle end/error**。
3. `runEmbeddedAgent`：通过按会话和全局队列串行化运行，解析模型 + 认证配置文件，构建 OpenClaw 会话，订阅运行时事件，流式输出 assistant/tool 增量，强制执行运行超时（到期时中止），并返回 payload 及 usage 元数据。对于 Codex app-server 轮次，它还会在已接受的轮次停止产生 app-server 进度且未触发终态事件时中止该轮次。
4. `subscribeEmbeddedAgentSession` 将运行时事件桥接到 `agent` 流：工具事件映射到 `stream: "tool"`，assistant 增量映射到 `stream: "assistant"`，生命周期事件映射到 `stream: "lifecycle"`（`phase: "start" | "end" | "error"`）。
5. `agent.wait`（`waitForAgentRun`）等待某个 `runId` 上的 **lifecycle end/error**，并返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`。

## 排队与并发

运行会按每个会话键（session lane）进行串行处理，并可选地通过全局 lane 进行处理，从而防止工具/会话竞争。消息通道会选择一种队列模式（steer/followup/collect/interrupt）并将其送入该 lane 系统；参见 [命令队列](/concepts/queue)。

转录写入还会受到会话文件上的会话写锁保护。该锁具备进程感知并基于文件，因此可以捕获绕过进程内队列或来自其他进程的写入者。写入者在报告会话忙碌之前，会等待最多 `session.writeLock.acquireTimeoutMs`（默认 `60000` 毫秒；环境变量覆盖 `OPENCLAW_SESSION_WRITE_LOCK_ACQUIRE_TIMEOUT_MS`）。

会话写锁默认是不可重入的。若某个辅助函数有意在保持单个逻辑写入者的前提下嵌套获取同一把锁，则必须显式启用 `allowReentrant: true`。

## 会话和工作区准备

- 工作区已解析并创建；在沙箱中运行时，可能会重定向到沙箱工作区根目录。
- 技能已加载（或从快照中复用），并注入到环境和提示中。
- 启动/上下文文件已解析，并注入到系统提示中。
- 在流式传输开始之前，会获取会话写锁并准备会话转录目标。任何后续的转录重写、压缩或截断路径在修改 SQLite 转录行之前都必须获取同一把锁。

## 提示词组装

系统提示词由 OpenClaw 的基础提示词、技能提示词、引导上下文以及每次运行的覆盖项构建而成。模型特定的限制和压缩预留 token 会被强制执行。有关模型所看到的内容，请参见[系统提示词](/concepts/system-prompt)。

## Hooks

OpenClaw 有两套 hook 系统：

- **内部 hooks**（Gateway hooks）：用于命令和生命周期事件的事件驱动脚本。
- **插件 hooks**：agent/tool 生命周期和 gateway pipeline 内的扩展点。

### 内部 hooks（Gateway hooks）

- **`agent:bootstrap`**: 在系统提示词最终确定之前，构建 bootstrap 文件时运行。可用于添加或移除 bootstrap 上下文文件。
- **命令 hooks**：`/new`、`/reset`、`/stop`，以及其他命令事件（参见 Hooks 文档）。

参见 [Hooks](/automation/hooks) 了解配置与示例。

### 插件 hooks

这些 hook 在 agent loop 或 gateway pipeline 内部运行：

| Hook                                                    | 运行时机                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `before_model_resolve`                                  | 会话前期（没有 `messages`），用于在解析前确定性地覆盖 provider/model。                                                                                                                                                                                                                     |
| `before_prompt_build`                                   | 会话加载后（有 `messages`），在提交前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。`prependContext` 适用于每轮动态文本，而 system-context 字段适用于应放在 system prompt 空间中的稳定指导。                                                         |
| `before_agent_start`                                    | 为兼容旧版而保留的 hook，可能在任一阶段运行；优先使用上面的显式 hooks。                                                                                                                                                                                                                   |
| `before_agent_reply`                                    | 在内联操作之后、LLM 调用之前运行。允许插件接管该轮并返回一个合成回复，或完全静默处理。                                                                                                                                                                                                      |
| `agent_end`                                             | 完成后运行，带有最终消息列表和运行元数据。                                                                                                                                                                                                                                                 |
| `before_compaction` / `after_compaction`                | 观察或注释压缩周期。                                                                                                                                                                                                                                                                       |
| `before_tool_call` / `after_tool_call`                  | 拦截工具参数/结果。                                                                                                                                                                                                                                                                       |
| `before_install`                                        | 在运维安装策略运行之后、在当前进程加载插件 hooks 时，对已分阶段的 skill/plugin 安装 सामग्री 运行。                                                                                                                                                                                          |
| `tool_result_persist`                                   | 在工具结果写入 OpenClaw 所拥有的会话转录之前，同步转换这些结果。                                                                                                                                                                                                                          |
| `message_received` / `message_sending` / `message_sent` | 入站和出站消息 hooks。                                                                                                                                                                                                                                                                     |
| `session_start` / `session_end`                         | 会话生命周期边界。                                                                                                                                                                                                                                                                         |
| `gateway_start` / `gateway_stop`                        | Gateway 生命周期事件。                                                                                                                                                                                                                                                                    |

出站/工具守卫的 hook 决策规则：

- `before_tool_call`: `{ block: true }` 是终态并会停止低优先级处理器。`{ block: false }` 是无操作，不会清除先前的阻止。
- `before_install`: 与上面的终态/无操作语义相同。对于必须覆盖 CLI 安装和更新路径的、由运维拥有的安装允许/阻止决策，请使用 `security.installPolicy`，而不是 `before_install`。
- `message_sending`: `{ cancel: true }` 是终态并会停止低优先级处理器。`{ cancel: false }` 是无操作，不会清除先前的取消。

参见 [Plugin hooks](/plugins/hooks) 了解 hook API 和注册细节。

Harnesses 可以适配这些 hooks。Codex app-server harness 将 OpenClaw plugin hooks 作为文档化镜像表面的兼容性契约；Codex 原生 hooks 是一套独立的、更底层的 Codex 机制。

## 流式传输

- Assistant 增量会从代理运行时作为 `assistant` 事件流式输出。
- 块流式传输可以在 `text_end` 或 `message_end` 上发出部分回复。
- 推理流式传输可以是单独的流，也可以是块回复。
- 有关分块和块回复行为，请参阅 [流式传输](/concepts/streaming)。

## 工具执行

- Tool start/update/end events are emitted on the `tool` stream.
- Before logging/emitting, tool results are sanitized for size and image payloads.
- Message tool sends are tracked to suppress duplicate assistant confirmations.

## 回复整形

最终载荷由助手文本（加上可选推理）、内联工具摘要（在详细且允许时）以及模型出错时的助手错误文本组成。

- 精确的静默标记 `NO_REPLY` 会从外发载荷中被过滤掉。
- 消息工具的重复项会从最终载荷列表中移除。
- 如果没有可渲染的载荷剩余，并且某个工具出错了，则会发出一个回退工具错误回复，除非某个消息工具已经发送了用户可见的回复。

## 压缩和重试

自动压缩会发出 `compaction` 流事件，并且可以触发重试。重试时，内存中的缓冲区和工具摘要会重置，以避免重复输出。参见 [压缩](/concepts/compaction)。

## 事件流

- `lifecycle`：由 `subscribeEmbeddedAgentSession` 发出（并且在 `agentCommand` 中作为回退机制）。
- `assistant`：来自代理运行时的流式增量。
- `tool`：来自代理运行时的流式工具事件。

Gateway 将生命周期和工具开始/终止事件投影到有界的、
仅元数据的 [审计账本](/cli/audit) 中。此投影会记录来源信息和
结果代码，而不会将提示、消息、工具参数、工具结果或原始错误
从转录/运行时路径中复制出去。

## 聊天通道处理

Assistant 增量内容缓冲到 chat `delta` 消息中。chat `final` 会在 **生命周期结束/出错** 时发出。

## 超时

| Timeout                                          | Default                                | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent.wait`                                     | 30s                                    | 仅等待；`timeoutMs` 参数会覆盖。不会停止底层运行。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Agent runtime (`agents.defaults.timeoutSeconds`) | 172800s (48h)                          | 由 `runEmbeddedAgent` 的中止计时器强制执行。设置为 `0` 表示无限运行预算；但模型流存活看门狗仍然适用。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Cron isolated agent turn                         | owned by cron                          | 调度器会在执行开始时启动自己的计时器，在配置的截止时间中止运行，然后在记录超时之前执行有界清理，这样陈旧的子会话就不会一直占住该执行通道。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Model idle timeout                               | Cloud 120s; self-hosted 300s           | 当在空闲窗口到达之前没有响应块到来时，OpenClaw 会中止模型请求。`models.providers.<id>.timeoutSeconds` 会为缓慢的本地/自托管提供商延长此空闲看门狗，但仍受任何更低的有限 `agents.defaults.timeoutSeconds` 或运行特定超时的限制，因为这些控制的是整个代理运行。无限运行预算仍会保留提供商级别的空闲看门狗。没有显式模型/代理超时的 Cron 触发云模型运行使用相同默认值；如果显式设置了 cron 运行超时，云模型流卡住时会在 60s 处封顶，这样配置的模型回退仍可在外层 cron 截止时间之前运行。对真正本地端点（loopback/private baseUrl）的 Cron 触发运行会保留本地空闲豁免；使用网络 baseUrl 的自托管提供商会获得 300s 的隐式看门狗。若显式设置了 cron 运行超时，本地/自托管卡住会在该超时处封顶。为缓慢的本地提供商设置 `models.providers.<id>.timeoutSeconds`。 |
| Provider HTTP request timeout                    | `models.providers.<id>.timeoutSeconds` | 覆盖连接、响应头、正文、SDK 请求超时、受保护 fetch 的中止处理，以及该提供商的模型流空闲看门狗。用于缓慢的本地/自托管提供商（例如 Ollama），在提高整个代理运行超时之前先使用此项；当模型请求需要运行更久时，确保代理/运行超时至少同样高。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

### 卡住会话诊断

启用诊断后，`diagnostics.stuckSessionWarnMs`（默认 `120000` ms）会将长时间处于 `processing` 且未观察到回复、工具、状态、阻塞或 ACP 进度的会话归类为以下情况：

- 活跃的嵌入式运行、模型调用和工具调用会报告为 `session.long_running`。拥有者可见的静默模型调用会保持为 `session.long_running`，直到 `diagnostics.stuckSessionAbortMs`，这样缓慢或不流式的提供商就不会过早被标记为停滞。
- 没有最近进展的活跃工作会报告为 `session.stalled`。拥有者可见的模型调用在达到或超过中止阈值时会切换为 `session.stalled`；无拥有者的陈旧模型/工具活动不会被隐藏为 long-running。
- `session.stuck` 仅保留给可恢复的陈旧会话账本记录，包括带有陈旧无拥有者模型/工具活动的空闲排队会话。

`diagnostics.stuckSessionAbortMs` 的默认值至少为 5 分钟且为警告阈值的 3 倍。陈旧会话账本在恢复门通过后会立即释放受影响的会话通道；停滞的嵌入式运行只会在中止阈值之后被中止并清理，因此排队工作会恢复，而不会仅仅因为运行较慢就被切断。恢复会发出结构化的请求/完成结果；只有在相同的 processing 生成仍为当前时，诊断状态才会被标记为空闲，而且当会话保持不变时，重复的 `session.stuck` 诊断会退避。

## 何时会更早结束

- Agent 超时（中止）
- AbortSignal（取消）
- 网关断开连接或 RPC 超时
- `agent.wait` 超时（仅等待，不会停止 agent）

## 相关内容

- [工具](/tools) - 可用的代理工具
- [钩子](/automation/hooks) - 由代理生命周期事件触发的事件驱动脚本
- [压缩](/concepts/compaction) - 对长对话进行摘要的方式
- [执行审批](/tools/exec-approvals) - shell 命令的审批关卡
- [思考](/tools/thinking) - 思考/推理级别配置
