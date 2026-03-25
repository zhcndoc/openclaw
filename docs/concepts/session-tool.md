---
summary: "代理会话工具，用于列出会话、获取历史记录及发送跨会话消息"
read_when:
  - 添加或修改会话工具时
title: "会话工具"
---

# 会话工具

目标：设计一组小巧且难以误用的工具，允许代理列出会话、获取历史并向另一个会话发送消息。

## 工具名称

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

## 关键模型

- 主要直接聊天桶始终是字面键 `"main"`（解析为当前代理的主键）。
- 群组聊天使用 `agent:<agentId>:<channel>:group:<id>` 或 `agent:<agentId>:<channel>:channel:<id>`（传递完整键）。
- 定时任务使用 `cron:<job.id>`。
- 钩子使用 `hook:<uuid>`，除非明确设置。
- 节点会话使用 `node-<nodeId>`，除非明确设置。

`global` 和 `unknown` 是保留值，永远不会出现在列表中。如果 `session.scope = "global"`，我们将在所有工具中将其别名为 `main`，这样调用者永远不会看到 `global`。

## sessions_list

以行数组形式列出会话。

参数：

- `kinds?: string[]` 过滤器：任意 `"main" | "group" | "cron" | "hook" | "node" | "other"`
- `limit?: number` 最大行数（默认：服务器默认，限制例如200）
- `activeMinutes?: number` 仅返回最近 N 分钟内更新的会话
- `messageLimit?: number` 0 = 无消息（默认0）；>0 = 包含最近 N 条消息

行为：

- 当 `messageLimit > 0`，为每个会话获取 `chat.history`，并包括最近 N 条消息。
- 工具结果会被过滤出列表输出；使用 `sessions_history` 获取工具消息。
- 在 **沙箱环境**代理会话中运行时，会话工具默认只显示 **已生成的会话**（见下文）。

行结构（JSON）：

- `key`：会话键（字符串）
- `kind`：`main | group | cron | hook | node | other`
- `channel`：`whatsapp | telegram | discord | signal | imessage | webchat | internal | unknown`
- `displayName`（如果有，群组显示标签）
- `updatedAt`（毫秒）
- `sessionId`
- `model`、`contextTokens`、`totalTokens`
- `thinkingLevel`、`verboseLevel`、`systemSent`、`abortedLastRun`
- `sendPolicy`（如果设置，表示会话覆盖）
- `lastChannel`、`lastTo`
- `deliveryContext`（当可用时，归一化的 `{ channel, to, accountId }`）
- `transcriptPath`（从存储目录 + sessionId 最佳推断路径）
- `messages?`（仅当 `messageLimit > 0` 时）

## sessions_history

获取单个会话的聊天记录。

参数：

- `sessionKey`（必需；接受会话键或 `sessions_list` 返回的 `sessionId`）
- `limit?: number` 最大消息数（服务器限制）
- `includeTools?: boolean`（默认 false）

行为：

- `includeTools=false` 时，过滤掉 `role: "toolResult"` 消息。
- 返回消息数组，格式为原始聊天记录格式。
- 如果传入 `sessionId`，OpenClaw 会将其解析为对应的会话键（缺失ID会报错）。

## 网关会话历史和实时转录 API

Control UI 和网关客户端可以直接使用底层历史和实时转录接口。

HTTP:

- `GET /sessions/{sessionKey}/history`
- 查询参数：`limit`、`cursor`、`includeTools=1`、`follow=1`
- 未知会话返回 HTTP `404`，`error.type = "not_found"`
- `follow=1` 将响应升级为 SSE 流，用于接收该会话的转录更新

WebSocket:

- `sessions.subscribe` 订阅客户端可见的所有会话生命周期和转录事件
- `sessions.messages.subscribe { key }` 仅订阅单个会话的 `session.message` 事件
- `sessions.messages.unsubscribe { key }` 移除该定向转录订阅
- `session.message` 携带追加的转录消息以及可用的实时使用元数据
- `sessions.changed` 发出 `phase: "message"` 用于转录追加，以便会话列表可以刷新计数器和预览

## sessions_send

向另一个会话发送消息。

参数：

- `sessionKey`（必需；接受会话键或 `sessions_list` 返回的 `sessionId`）
- `message`（必需）
- `timeoutSeconds?: number`（默认 >0；0 表示发送即忘）

行为：

- `timeoutSeconds = 0`：入队并立即返回 `{ runId, status: "accepted" }`。
- `timeoutSeconds > 0`：最多等待 N 秒完成，然后返回 `{ runId, status: "ok", reply }`。
- 如果等待超时：返回 `{ runId, status: "timeout", error }`。运行继续；稍后调用 `sessions_history` 查询。
- 如果运行失败：返回 `{ runId, status: "error", error }`。
- 主要运行完成后进行公告（announce）运行，属于尽力而为；`status: "ok"` 不保证公告已送达。
- 通过网关 `agent.wait` 等待（服务器端），以保证断线重连不丢失等待。
- 主运行注入了代理间消息上下文。
- 跨会话消息持久化时，`message.provenance.kind = "inter_session"`，使聊天记录阅读者能区分路由代理指令和外部用户输入。
- 主运行完成后，OpenClaw 开启 **回复循环**：
  - 第2轮及以后在请求方和目标代理间轮流。
  - 回复精确为 `REPLY_SKIP` 可停止回合。
  - 最大回合数为 `session.agentToAgent.maxPingPongTurns`（0–5，默认5）。
- 循环结束后，OpenClaw 启动 **代理间公告阶段**（仅目标代理）：
  - 若回复精确为 `ANNOUNCE_SKIP` 则保持静默。
  - 其他回复发往目标频道。
  - 公告步骤包含原始请求 + 第1轮回复 + 最新回合回复。

## channel 字段

- 群组聊天，`channel` 为会话条目记录的频道。
- 直接聊天，`channel` 映射自 `lastChannel`。
- 定时任务/钩子/节点，`channel` 为 `internal`。
- 若缺失，`channel` 为 `unknown`。

## 安全 / 发送策略

基于策略的阻止，按频道/聊天类型（非单会话ID）控制。

```json
{
  "session": {
    "sendPolicy": {
      "rules": [
        {
          "match": { "channel": "discord", "chatType": "group" },
          "action": "deny"
        }
      ],
      "default": "allow"
    }
  }
}
```

运行时覆盖（每会话条目）：

- `sendPolicy: "allow" | "deny"`（未设置时继承配置）
- 可通过 `sessions.patch` 或仅限拥有者的 `/send on|off|inherit`（独立消息）设置。

执行点：

- `chat.send` / `agent`（网关）
- 自动回复投递逻辑

## sessions_spawn

启动一个独立的委托会话。

- 默认运行时：OpenClaw 子代理（`runtime: "subagent"`）。
- ACP 工具会话使用 `runtime: "acp"`，并遵循 ACP 特定的目标定位/策略规则。
- 除非另有说明，本节聚焦于子代理行为。有关 ACP 特定行为，请参阅 [ACP Agents](/tools/acp-agents)。

参数：

- `task`（必需）
- `runtime?`（`subagent|acp`；默认 `subagent`）
- `label?`（可选；用于日志/UI）
- `agentId?`（可选）
  - `runtime: "subagent"`：如果 `subagents.allowAgents` 允许，目标为另一个 OpenClaw 代理 ID
  - `runtime: "acp"`：如果 `acp.allowedAgents` 允许，目标为 ACP 工具 ID
- `model?`（可选；覆盖子代理模型；无效值报错）
- `thinking?`（可选；覆盖子代理运行的思考级别）
- `runTimeoutSeconds?`（设置时默认 `agents.defaults.subagents.runTimeoutSeconds`，否则 `0`；设置后 N 秒后中止子代理运行）
- `thread?`（默认 false；当频道/插件支持时，请求此生成绑定线程路由）
- `mode?`（`run|session`；默认 `run`，但 `thread=true` 时默认 `session`；`mode="session"` 要求 `thread=true`）
- `cleanup?`（`delete|keep`，默认 `keep`）
- `sandbox?`（`inherit|require`，默认 `inherit`；`require` 会在目标子运行时未沙箱化时拒绝生成）
- `attachments?`（可选内联文件数组；仅子代理运行时，ACP 拒绝）。每项：`{ name, content, encoding?: "utf8" | "base64", mimeType? }`。文件物化为子工作区 `.openclaw/attachments/<uuid>/`。返回每项文件的 sha256 收据。
- `attachAs?`（可选；`{ mountPath? }` 提示保留用于未来挂载实现）

白名单：

- `runtime: "subagent"`：`agents.list[].subagents.allowAgents` 控制通过 `agentId` 允许哪些 OpenClaw 代理 ID（`["*"]` 允许任意）。默认：仅请求代理自身。
- `runtime: "acp"`：`acp.allowedAgents` 控制允许哪些 ACP 工具 ID。这与 `subagents.allowAgents` 是独立的策略。
- 沙箱继承守卫：如果请求会话已沙箱化，`sessions_spawn` 会拒绝将在非沙箱环境中运行的目标。

发现：

- 使用 `agents_list` 发现 `runtime: "subagent"` 的允许目标。
- 对于 `runtime: "acp"`，使用配置的 ACP 工具 ID 和 `acp.allowedAgents`；`agents_list` 不列出 ACP 工具目标。

行为：

- 启动新会话：`agent:<agentId>:subagent:<uuid>`，`deliver: false`。
- 子代理默认拥有完整工具集，**不含会话工具**（可配置于 `tools.subagents.tools`）。
- 子代理不可调用 `sessions_spawn`（禁止子代理再生成子代理）。
- 永远非阻塞：立即返回 `{ status: "accepted", runId, childSessionKey }`。
- `thread=true` 时，频道插件可绑定投递/路由至线程目标（Discord 支持由 `session.threadBindings.*` 和 `channels.discord.threadBindings.*` 控制）。
- 完成后，OpenClaw 执行子代理 **公告步骤**，并将结果发布至请求者聊天频道。
  - 若助手最终回复为空，则包含子代理历史中最新的 `toolResult` 作为 `Result`。
- 在公告步骤中回复精确 `ANNOUNCE_SKIP` 保持静默。
- 公告回复规范化为 `Status`/`Result`/`Notes`；`Status` 来源于运行结果（非模型文本）。
- 子代理会话会在 `agents.defaults.subagents.archiveAfterMinutes`（默认60分钟）后自动归档。
- 公告回复包含统计行（运行时间，令牌数，会话键/ID，聊天记录路径及可选成本）。

## 沙箱会话可见性

会话工具可设置作用范围以减少跨会话访问。

默认行为：

- `tools.sessions.visibility` 默认值为 `tree`（当前会话 + 其生成的子代理会话）。
- 沙箱会话中，`agents.defaults.sandbox.sessionToolsVisibility` 可强制限制可见性。

配置示例：

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      // 默认: "tree"
      visibility: "tree",
    },
  },
  agents: {
    defaults: {
      sandbox: {
        // 默认: "spawned"
        sessionToolsVisibility: "spawned", // 或 "all"
      },
    },
  },
}
```

说明：

- `self`：仅当前会话键可见。
- `tree`：当前会话 + 当前会话生成的会话。
- `agent`：当前代理ID所属的所有会话。
- `all`：任何会话（跨代理访问仍需 `tools.agentToAgent` 权限）。
- 当会话位于沙箱且 `sessionToolsVisibility="spawned"` 时，即使设置 `tools.sessions.visibility="all"`，OpenClaw 也会强制将可见性限制为 `tree`。
