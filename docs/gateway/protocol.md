---
summary: "Gateway WebSocket protocol: 握手、帧、版本管理"
read_when:
  - 实现或更新网关 WS 客户端时
  - 调试协议不匹配或连接失败时
  - 重新生成协议 schema/models 时
title: "网关协议"
---

Gateway WS 协议是 OpenClaw 的**单一控制平面 + 节点传输**。所有客户端（CLI、Web UI、macOS 应用、iOS/Android 节点、无头节点）都通过 WebSocket 连接，并在握手时声明其**角色** + **作用域**。

## 传输

- WebSocket，使用 JSON 负载的文本帧。
- 第一帧**必须**是 `connect` 请求。
- 连接前的帧上限为 64 KiB。成功完成握手后，客户端应遵循 `hello-ok.policy.maxPayload` 和 `hello-ok.policy.maxBufferedBytes` 限制。启用诊断后，过大的入站帧和过慢的出站缓冲会在网关关闭或丢弃受影响帧之前发出 `payload.large` 事件。这些事件会保留大小、限制、表面和安全原因代码。它们不会保留消息正文、附件内容、原始帧正文、令牌、cookie 或密钥值。

## 握手（connect）

Gateway → Client（连接前挑战）：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

Client → Gateway:

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

Gateway → Client:

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 3,
    "server": { "version": "…", "connId": "…" },
    "features": { "methods": ["…"], "events": ["…"] },
    "snapshot": { "…": "…" },
    "auth": {
      "role": "operator",
      "scopes": ["operator.read", "operator.write"]
    },
    "policy": {
      "maxPayload": 26214400,
      "maxBufferedBytes": 52428800,
      "tickIntervalMs": 15000
    }
  }
}
```

当 Gateway 仍在完成启动 sidecar 时，`connect` 请求可以返回一个可重试的 `UNAVAILABLE` 错误，其中 `details.reason` 设为 `"startup-sidecars"`，并带有 `retryAfterMs`。客户端应在其整体连接预算内重试该响应，而不是将其作为终态握手失败上报。

`server`、`features`、`snapshot` 和 `policy` 都是 schema（`src/gateway/protocol/schema/frames.ts`）所必需的。`auth` 也同样必需，并报告协商后的 role/scopes。`canvasHostUrl` 是可选的。

当未签发设备令牌时，`hello-ok.auth` 会报告协商后的权限，但不包含令牌字段：

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

受信任的同进程后端客户端（`client.id: "gateway-client"`、`client.mode: "backend"`）在使用共享的网关 token/password 进行认证时，可以在直接 loopback 连接上省略 `device`。此路径仅保留给内部控制平面 RPC，并可防止过期的 CLI/设备配对基线阻塞本地后端工作，例如 subagent 会话更新。远程客户端、浏览器来源客户端、节点客户端以及显式设备令牌/设备身份客户端仍然使用正常的配对和 scope 升级检查。

当签发了设备令牌时，`hello-ok` 还会包含：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

在受信任的 bootstrap 交接期间，`hello-ok.auth` 也可能在 `deviceTokens` 中包含额外的有界 role 条目：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "node",
    "scopes": [],
    "deviceTokens": [
      {
        "deviceToken": "…",
        "role": "operator",
        "scopes": ["operator.approvals", "operator.read", "operator.talk.secrets", "operator.write"]
      }
    ]
  }
}
```

对于内置的 node/operator bootstrap 流程，主 node token 保持 `scopes: []`，而任何交接的 operator token 仍受限于 bootstrap operator allowlist（`operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`）。bootstrap scope 检查仍保持 role 前缀化：operator 条目只满足 operator 请求，而非 operator 角色仍需要其自身 role 前缀下的 scopes。

### 节点示例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

## 帧格式

- **请求**：`{type:"req", id, method, params}`
- **响应**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

会产生副作用的方法需要**幂等键**（见 schema）。

## 角色 + scopes

### 角色

- `operator` = 控制平面客户端（CLI/UI/自动化）。
- `node` = 能力宿主（camera/screen/canvas/system.run）。

### Scopes（operator）

常见 scopes：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

带有 `includeSecrets: true` 的 `talk.config` 需要 `operator.talk.secrets`
（或 `operator.admin`）。

插件注册的网关 RPC 方法可以请求其自己的 operator scope，但保留的核心管理前缀（`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`）始终解析为 `operator.admin`。

方法 scope 只是第一道门槛。通过 `chat.send` 到达的一些斜杠命令会在此基础上施加更严格的命令级检查。例如，持久化的 `/config set` 和 `/config unset` 写入需要 `operator.admin`。

`node.pair.approve` 在基础方法 scope 之上还有额外的审批时 scope 检查：

- 无命令请求：`operator.pairing`
- 带有非 exec 节点命令的请求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的请求：
  `operator.pairing` + `operator.admin`

### Caps/commands/permissions（node）

节点在 connect 时声明能力主张：

- `caps`：高层级能力类别。
- `commands`：invoke 的命令 allowlist。
- `permissions`：细粒度开关（例如 `screen.record`、`camera.capture`）。

Gateway 将这些视为**主张**，并在服务器端执行 allowlist。

## 在线状态

- `system-presence` 返回以设备身份为键的条目。
- 在线状态条目包含 `deviceId`、`roles` 和 `scopes`，因此 UI 即使在同一设备同时以**operator**和**node**身份连接时，也能显示单行。
- `node.list` 包含可选的 `lastSeenAtMs` 和 `lastSeenReason` 字段。已连接的节点会将其当前连接时间作为 `lastSeenAtMs` 并以 `connect` 作为原因上报；已配对的节点在受信任的节点事件更新其配对元数据时，也可以上报持久化的后台在线状态。

### 节点后台存活事件

节点可以调用带有 `event: "node.presence.alive"` 的 `node.event`，以记录某个已配对节点在后台唤醒期间是存活的，但不将其标记为已连接。

```json
{
  "event": "node.presence.alive",
  "payloadJSON": "{\"trigger\":\"silent_push\",\"sentAtMs\":1737264000000,\"displayName\":\"Peter's iPhone\",\"version\":\"2026.4.28\",\"platform\":\"iOS 18.4.0\",\"deviceFamily\":\"iPhone\",\"modelIdentifier\":\"iPhone17,1\",\"pushTransport\":\"relay\"}"
}
```

`trigger` 是一个封闭枚举：`background`、`silent_push`、`bg_app_refresh`、
`significant_location`、`manual` 或 `connect`。未知的 trigger 字符串会在持久化前由网关规范化为 `background`。该事件仅对经过身份验证的节点
设备会话具有持久性；无设备或未配对会话会返回 `handled: false`。

成功的网关会返回结构化结果：

```json
{
  "ok": true,
  "event": "node.presence.alive",
  "handled": true,
  "reason": "persisted"
}
```

较旧的网关在处理 `node.event` 时可能仍返回 `{ "ok": true }`；客户端应将其视为一个已确认的 RPC，而不是持久化在线状态的存储成功。

## 广播事件作用域

服务器推送的 WebSocket 广播事件会进行 scope 门控，因此配对作用域或仅节点会话不会被动接收会话内容。

- **聊天、agent 和 tool-result 帧**（包括流式 `agent` 事件和工具调用结果）至少需要 `operator.read`。没有 `operator.read` 的会话会完全跳过这些帧。
- **插件定义的 `plugin.*` 广播** 会根据插件注册方式，被门控为 `operator.write` 或 `operator.admin`。
- **状态和传输事件**（`heartbeat`、`presence`、`tick`、连接/断开生命周期等）保持不受限制，以便每个已认证会话都能观察传输健康状况。
- **未知的广播事件族** 默认进行 scope 门控（fail-closed），除非注册的处理器显式放宽它们。

每个客户端连接都会保留其自己的按客户端序列号，因此即使不同客户端看到的是不同的、经过 scope 过滤的事件流子集，广播在该 socket 上仍能保持单调顺序。

## 常见 RPC 方法族

上面的公共 WS 接口面比握手/认证示例更广。这不是生成的完整导出清单 — `hello-ok.features.methods` 是一个保守的发现列表，由 `src/gateway/server-methods-list.ts` 以及已加载的插件/通道方法导出构建而成。应将其视为功能发现，而不是 `src/gateway/server-methods/*.ts` 的完整枚举。

<AccordionGroup>
  <Accordion title="系统与身份">
    - `health` 返回缓存的或新近探测到的网关健康状态快照。
    - `diagnostics.stability` 返回最近的、有边界的诊断稳定性记录器。它保留事件名称、计数、字节大小、内存读数、队列/会话状态、通道/插件名称以及会话 id 等运行元数据。它不会保留聊天文本、webhook 主体、工具输出、原始请求或响应主体、令牌、cookie 或秘密值。需要 operator read 范围。
    - `status` 返回 `/status` 风格的网关摘要；敏感字段仅对具有 admin 范围的 operator 客户端包含。
    - `gateway.identity.get` 返回 relay 和配对流程使用的网关设备身份。
    - `system-presence` 返回已连接 operator/node 设备的当前 presence 快照。
    - `system-event` 追加一个系统事件，并且可以更新/广播 presence 上下文。
    - `last-heartbeat` 返回最近一次持久化的 heartbeat 事件。
    - `set-heartbeats` 切换网关上的 heartbeat 处理。

  </Accordion>

  <Accordion title="模型与用量">
    - `models.list` 返回运行时允许使用的模型目录。传入 `{ "view": "configured" }` 可获取适合选择器大小的已配置模型（先取 `agents.defaults.models`，再取 `models.providers.*.models`），或传入 `{ "view": "all" }` 获取完整目录。
    - `usage.status` 返回提供方用量窗口/剩余额度摘要。
    - `usage.cost` 返回指定日期范围内的聚合成本用量摘要。
    - `doctor.memory.status` 返回当前默认 agent 工作区的向量记忆 / 缓存 embedding 就绪状态。仅当调用方明确需要一次实时 embedding provider ping 时，才传入 `{ "probe": true }` 或 `{ "deep": true }`。
    - `doctor.memory.remHarness` 为远程控制平面客户端返回一个有边界、只读的 REM harness 预览。它可能包含工作区路径、记忆片段、渲染后的 grounded markdown，以及深度提升候选项，因此调用方需要 `operator.read`。
    - `sessions.usage` 返回按会话划分的用量摘要。
    - `sessions.usage.timeseries` 返回某个会话的时间序列用量。
    - `sessions.usage.logs` 返回某个会话的用量日志条目。

  </Accordion>

  <Accordion title="通道与登录助手">
    - `channels.status` 返回内置 + 打包通道/插件的状态摘要。
    - `channels.logout` 在通道支持登出时，登出指定通道/账户。
    - `web.login.start` 为当前支持 QR 的 web 通道提供方启动 QR/web 登录流程。
    - `web.login.wait` 等待该 QR/web 登录流程完成，并在成功后启动通道。
    - `push.test` 向已注册的 iOS 节点发送一条测试 APNs 推送。
    - `voicewake.get` 返回已存储的唤醒词触发器。
    - `voicewake.set` 更新唤醒词触发器并广播该变更。

  </Accordion>

  <Accordion title="消息与日志">
    - `send` 是面向通道/账户/线程目标发送的直接出站投递 RPC，适用于 chat runner 之外。
    - `logs.tail` 返回已配置的网关文件日志 tail，支持 cursor/limit 和 max-byte 控制。

  </Accordion>

  <Accordion title="Talk 与 TTS">
    - `talk.config` 返回生效中的 Talk 配置负载；`includeSecrets` 需要 `operator.talk.secrets`（或 `operator.admin`）。
    - `talk.mode` 为 WebChat/Control UI 客户端设置/广播当前 Talk 模式状态。
    - `talk.speak` 通过当前激活的 Talk 语音提供方合成语音。
    - `tts.status` 返回 TTS 启用状态、当前提供方、回退提供方以及提供方配置状态。
    - `tts.providers` 返回可见的 TTS 提供方清单。
    - `tts.enable` 和 `tts.disable` 切换 TTS 偏好状态。
    - `tts.setProvider` 更新首选 TTS 提供方。
    - `tts.convert` 执行一次性文本转语音转换。

  </Accordion>

  <Accordion title="秘密、配置、更新与向导">
    - `secrets.reload` 仅在完全成功时重新解析当前激活的 SecretRef，并替换运行时秘密状态。
    - `secrets.resolve` 为特定命令/目标集合解析命令目标秘密分配。
    - `config.get` 返回当前配置快照和 hash。
    - `config.set` 写入已验证的配置负载。
    - `config.patch` 合并一个部分配置更新。
    - `config.apply` 验证并替换完整配置负载。
    - `config.schema` 返回 Control UI 和 CLI 工具使用的实时配置 schema 负载：schema、`uiHints`、版本和生成元数据；当运行时可以加载时，还包括插件 + 通道 schema 元数据。schema 包含由 UI 使用的相同标签和帮助文本派生出的字段 `title` / `description` 元数据，其中包括在存在匹配字段文档时的嵌套对象、通配符、数组项，以及 `anyOf` / `oneOf` / `allOf` 组合分支。
    - `config.schema.lookup` 返回某个配置路径的路径作用域查找负载：规范化路径、一个浅层 schema 节点、匹配到的 hint + `hintPath`，以及用于 UI/CLI 逐级展开的直接子项摘要。查找 schema 节点保留面向用户的文档和常见校验字段（`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、数值/字符串/数组/对象边界，以及 `additionalProperties`、`deprecated`、`readOnly`、`writeOnly` 等标志）。子项摘要暴露 `key`、规范化 `path`、`type`、`required`、`hasChildren`，以及匹配到的 `hint` / `hintPath`。
    - `update.run` 运行网关更新流程，并且仅在更新本身成功时安排重启。
    - `update.status` 返回最新缓存的更新重启哨兵，若可用则包括重启后运行版本。
    - `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 通过 WS RPC 暴露 onboarding 向导。

  </Accordion>

  <Accordion title="Agent 与工作区助手">
    - `agents.list` 返回已配置的 agent 条目，包括生效模型和运行时元数据。
    - `agents.create`、`agents.update` 和 `agents.delete` 管理 agent 记录和工作区绑定。
    - `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理为 agent 暴露的 bootstrap 工作区文件。
    - `agent.identity.get` 返回某个 agent 或会话的生效 assistant 身份。
    - `agent.wait` 等待一次运行完成，并在可用时返回终态快照。

  </Accordion>

  <Accordion title="会话控制">
    - `sessions.list` 返回当前会话索引，包括在配置了 agent runtime 后端时每一行的 `agentRuntime` 元数据。
    - `sessions.subscribe` 和 `sessions.unsubscribe` 为当前 WS 客户端切换会话变更事件订阅。
    - `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 为某个会话切换 transcript/message 事件订阅。
    - `sessions.preview` 返回特定会话 key 的有边界 transcript 预览。
    - `sessions.resolve` 解析或规范化一个会话目标。
    - `sessions.create` 创建一个新的会话条目。
    - `sessions.send` 向现有会话发送消息。
    - `sessions.steer` 是活动会话的中断并引导变体。
    - `sessions.abort` 中止会话的活动工作。
    - `sessions.patch` 更新会话元数据/覆盖项，并报告已解析的规范模型以及生效的 `agentRuntime`。
    - `sessions.reset`、`sessions.delete` 和 `sessions.compact` 执行会话维护。
    - `sessions.get` 返回完整存储的会话行。
    - Chat 执行仍然使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。`chat.history` 对 UI 客户端进行了显示规范化：可见文本中的内联指令标签会被移除，纯文本工具调用 XML 负载（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截断的 tool-call 块）和泄漏的 ASCII/全角模型控制 token 会被移除，诸如精确的 `NO_REPLY` / `no_reply` 这类纯静默 token 的 assistant 行会被省略，过大的行可以被占位符替换。

  </Accordion>

  <Accordion title="设备配对与设备令牌">
    - `device.pair.list` 返回待处理和已批准的已配对设备。
    - `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理设备配对记录。
    - `device.token.rotate` 在其已批准角色和调用方作用域边界内轮换一个已配对设备令牌。
    - `device.token.revoke` 在其已批准角色和调用方作用域边界内撤销一个已配对设备令牌。

  </Accordion>

  <Accordion title="节点配对、invoke 与待处理工作">
    - `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject`、`node.pair.remove` 和 `node.pair.verify` 涵盖节点配对和 bootstrap 验证。
    - `node.list` 和 `node.describe` 返回已知/已连接节点状态。
    - `node.rename` 更新已配对节点标签。
    - `node.invoke` 将一个命令转发到已连接节点。
    - `node.invoke.result` 返回一次 invoke 请求的结果。
    - `node.event` 将来自节点的事件带回网关。
    - `node.canvas.capability.refresh` 刷新有作用域的 canvas-capability 令牌。
    - `node.pending.pull` 和 `node.pending.ack` 是已连接节点队列 API。
    - `node.pending.enqueue` 和 `node.pending.drain` 管理离线/断开节点的持久化待处理工作。

  </Accordion>

  <Accordion title="审批族">
    - `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 涵盖一次性 exec 审批请求以及待处理审批的查询/回放。
    - `exec.approval.waitDecision` 等待一个待处理 exec 审批，并返回最终决定（若超时则返回 `null`）。
    - `exec.approvals.get` 和 `exec.approvals.set` 管理网关 exec 审批策略快照。
    - `exec.approvals.node.get` 和 `exec.approvals.node.set` 通过 node relay 命令管理节点本地 exec 审批策略。
    - `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵盖插件定义的审批流程。

  </Accordion>

  <Accordion title="自动化、技能与工具">
    - 自动化：`wake` 安排一次立即或下一次 heartbeat 的唤醒文本注入；`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run`、`cron.runs` 管理计划任务。
    - 技能与工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`。

  </Accordion>
</AccordionGroup>

### 常见事件族

- `chat`：如 `chat.inject` 和其他仅 transcript 的 chat 事件等 UI chat 更新。
- `session.message` 和 `session.tool`：已订阅会话的 transcript/event-stream 更新。
- `sessions.changed`：会话索引或元数据已变更。
- `presence`：系统 presence 快照更新。
- `tick`：周期性 keepalive / liveness 事件。
- `health`：网关健康状态快照更新。
- `heartbeat`：heartbeat 事件流更新。
- `cron`：cron 运行/作业变更事件。
- `shutdown`：网关关闭通知。
- `node.pair.requested` / `node.pair.resolved`：节点配对生命周期。
- `node.invoke.request`：节点 invoke 请求广播。
- `device.pair.requested` / `device.pair.resolved`：已配对设备生命周期。
- `voicewake.changed`：唤醒词触发配置已变更。
- `exec.approval.requested` / `exec.approval.resolved`：exec 审批生命周期。
- `plugin.approval.requested` / `plugin.approval.resolved`：插件审批生命周期。

### 节点助手方法

- 节点可以调用 `skills.bins` 来获取当前技能可执行文件列表，用于自动放行检查。

### Operator 助手方法

- Operator 可以调用 `commands.list`（`operator.read`）来获取某个 agent 的运行时命令清单。
  - `agentId` 是可选的；省略它可读取默认 agent 工作区。
  - `scope` 控制主 `name` 所针对的表面：
    - `text` 返回不带前导 `/` 的主文本命令 token
    - `native` 和默认的 `both` 路径在可用时返回具备 provider 感知的 native 名称
  - `textAliases` 包含诸如 `/model` 和 `/m` 之类的精确 slash 别名。
  - `nativeName` 在存在时包含具备 provider 感知的 native 命令名。
  - `provider` 是可选的，只影响 native 命名以及 native 插件命令可用性。
  - `includeArgs=false` 会从响应中省略序列化的参数元数据。
- Operator 可以调用 `tools.catalog`（`operator.read`）来获取某个 agent 的运行时工具目录。响应包括分组工具和来源元数据：
  - `source`：`core` 或 `plugin`
  - `pluginId`：当 `source="plugin"` 时的插件所有者
  - `optional`：某个插件工具是否可选
- Operator 可以调用 `tools.effective`（`operator.read`）来获取某个会话的运行时生效工具清单。
  - `sessionKey` 为必填。
  - 网关从会话服务端派生可信运行时上下文，而不是接受调用方提供的 auth 或 delivery 上下文。
  - 响应具有会话作用域，并反映当前活动对话现在可以使用的内容，包括 core、plugin 和 channel 工具。
- Operator 可以调用 `skills.status`（`operator.read`）来获取某个 agent 的可见技能清单。
  - `agentId` 是可选的；省略它可读取默认 agent 工作区。
  - 响应包括资格、缺失要求、配置检查和经过清理的安装选项，同时不暴露原始秘密值。
- Operator 可以调用 `skills.search` 和 `skills.detail`（`operator.read`）来获取 ClawHub 发现元数据。
- Operator 可以调用 `skills.install`（`operator.admin`）的两种模式：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 将一个技能文件夹安装到默认 agent 工作区的 `skills/` 目录。
  - 网关安装器模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    在网关主机上运行一个声明的 `metadata.openclaw.install` 动作。
- Operator 可以调用 `skills.update`（`operator.admin`）的两种模式：
  - ClawHub 模式会更新一个已跟踪的 slug，或默认 agent 工作区中所有已跟踪的 ClawHub 安装。
  - 配置模式会修补 `skills.entries.<skillKey>` 值，例如 `enabled`、`apiKey` 和 `env`。

### `models.list` 视图

`models.list` 接受一个可选的 `view` 参数：

- 省略或 `"default"`：当前运行时行为。如果配置了 `agents.defaults.models`，响应就是允许的目录；否则响应就是完整的 Gateway 目录。
- `"configured"`：适合选择器大小的行为。如果配置了 `agents.defaults.models`，它仍然优先生效。否则响应使用显式的 `models.providers.*.models` 条目，只有在不存在任何已配置模型行时才回退到完整目录。
- `"all"`：完整的 Gateway 目录，绕过 `agents.defaults.models`。将其用于诊断和发现 UI，而不是普通模型选择器。

## Exec 审批

- 当 exec 请求需要批准时，网关会广播 `exec.approval.requested`。
- 操作员客户端通过调用 `exec.approval.resolve` 来完成处理（需要 `operator.approvals` 范围）。
- 对于 `host=node`，`exec.approval.request` 必须包含 `systemRunPlan`（规范化的 `argv`/`cwd`/`rawCommand`/会话元数据）。缺少 `systemRunPlan` 的请求会被拒绝。
- 批准后，转发的 `node.invoke system.run` 调用会复用该规范化的 `systemRunPlan`，作为权威的命令/cwd/会话上下文。
- 如果调用方在 prepare 与最终获批的 `system.run` 转发之间篡改了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，网关会拒绝该运行，而不会信任被篡改的负载。

## Agent 投递回退

- `agent` 请求可以包含 `deliver=true` 来请求外发投递。
- `bestEffortDeliver=false` 保持严格行为：未解析或仅内部可用的投递目标会返回 `INVALID_REQUEST`。
- `bestEffortDeliver=true` 允许在无法解析到外部可投递路径时回退到仅会话执行（例如内部/webchat 会话或歧义的多通道配置）。

## 版本管理

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/schema/protocol-schemas.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`；服务端会拒绝不匹配的情况。
- Schema + 模型由 TypeBox 定义生成：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客户端常量

`src/gateway/client.ts` 中的参考客户端使用以下默认值。其值在 protocol v3 中保持稳定，并且是第三方客户端应采用的基线。

| 常量                                      | 默认值                                                | 来源                                                                                     |
| ----------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `PROTOCOL_VERSION`                        | `3`                                                   | `src/gateway/protocol/schema/protocol-schemas.ts`                                        |
| 请求超时（每个 RPC）                       | `30_000` ms                                           | `src/gateway/client.ts`（`requestTimeoutMs`）                                              |
| 预认证 / connect-challenge 超时            | `15_000` ms                                           | `src/gateway/handshake-timeouts.ts`（配置/env 可提高配对的服务端/客户端预算）            |
| 初始重连退避                               | `1_000` ms                                            | `src/gateway/client.ts`（`backoffMs`）                                                    |
| 最大重连退避                               | `30_000` ms                                           | `src/gateway/client.ts`（`scheduleReconnect`）                                            |
| 设备令牌关闭后的快速重试上限               | `250` ms                                              | `src/gateway/client.ts`                                                                    |
| `terminate()` 之前的强制停止宽限           | `250` ms                                              | `FORCE_STOP_TERMINATE_GRACE_MS`                                                           |
| `stopAndWait()` 默认超时                   | `1_000` ms                                            | `STOP_AND_WAIT_TIMEOUT_MS`                                                                |
| 默认 tick 间隔（`hello-ok` 之前）          | `30_000` ms                                           | `src/gateway/client.ts`                                                                    |
| tick 超时关闭                              | 当静默超过 `tickIntervalMs * 2` 时，代码 `4000`       | `src/gateway/client.ts`                                                                    |
| `MAX_PAYLOAD_BYTES`                       | `25 * 1024 * 1024`（25 MB）                           | `src/gateway/server-constants.ts`                                                         |

服务端会在 `hello-ok` 中通告实际生效的 `policy.tickIntervalMs`、`policy.maxPayload` 和 `policy.maxBufferedBytes`；客户端应遵守这些值，而不是握手前的默认值。

## 认证

- 共享密钥网关认证使用 `connect.params.auth.token` 或 `connect.params.auth.password`，具体取决于配置的认证模式。
- 具有身份的模式，例如 Tailscale Serve（`gateway.auth.allowTailscale: true`）或非回环的 `gateway.auth.mode: "trusted-proxy"`，会基于请求头而不是 `connect.params.auth.*` 来满足连接认证检查。
- 私有入口的 `gateway.auth.mode: "none"` 会完全跳过共享密钥连接认证；不要在公共/不受信任的入口上暴露该模式。
- 配对后，Gateway 会发放一个按连接角色 + 范围限定的 **device token**。它会在 `hello-ok.auth.deviceToken` 中返回，客户端应将其持久化以供后续连接使用。
- 客户端应在任何成功连接后持久化主 `hello-ok.auth.deviceToken`。
- 使用该 **已存储** 的 device token 重新连接时，也应复用该 token 已存储的已批准范围集合。这可以保留已授予的读取/probe/status 访问权限，并避免在重连时悄悄收缩为更窄的隐式仅管理员范围。
- 客户端侧连接认证组装（`src/gateway/client.ts` 中的 `selectConnectAuth`）：
  - `auth.password` 是正交的，只要设置就会始终转发。
  - `auth.token` 按优先级填充：先显式共享令牌，然后显式 `deviceToken`，再到按设备存储的 token（以 `deviceId` + `role` 为键）。
  - `auth.bootstrapToken` 仅在以上都未解析出 `auth.token` 时发送。共享令牌或任何已解析的 device token 都会抑制它。
  - 在一次性的 `AUTH_TOKEN_MISMATCH` 重试中，自动提升存储的 device token 仅限于 **受信任端点** —— 回环，或带有固定 `tlsFingerprint` 的 `wss://`。未固定指纹的公共 `wss://` 不符合条件。
- 额外的 `hello-ok.auth.deviceTokens` 条目是引导交接 token。仅当连接使用了 bootstrap 认证，且传输位于受信任通道（如 `wss://` 或回环/本地配对）时，才应持久化它们。
- 如果客户端提供了 **显式** `deviceToken` 或显式 `scopes`，则该调用方请求的范围集仍具有权威性；只有当客户端复用已存储的按设备 token 时，才会重用缓存的 scopes。
- Device token 可通过 `device.token.rotate` 和 `device.token.revoke` 进行轮换/撤销（需要 `operator.pairing` 范围）。
- `device.token.rotate` 会返回轮换元数据。只有对于已用该 device token 认证过的同设备调用，它才会回显替换后的 bearer token，因此仅凭 token 的客户端可以在重新连接前持久化其替换值。共享/管理员轮换不会回显 bearer token。
- 令牌签发、轮换和撤销都限制在该设备配对条目中记录的已批准角色集合内；令牌变更不能扩展到配对批准从未授予的设备角色，也不能指向该角色。
- 对于已配对设备的 token 会话，设备管理默认是自我范围限定的，除非调用方同时具有 `operator.admin`：非管理员调用方只能移除/撤销/轮换属于 **自己的** 设备条目。
- `device.token.rotate` 和 `device.token.revoke` 还会检查目标 operator token 的范围集合与调用方当前会话范围是否一致。非管理员调用方不能轮换或撤销比其自身所持有范围更宽的 operator token。
- 认证失败会包含 `error.details.code` 以及恢复提示：
  - `error.details.canRetryWithDeviceToken`（布尔值）
  - `error.details.recommendedNextStep`（`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`）
- `AUTH_TOKEN_MISMATCH` 的客户端行为：
  - 受信任客户端可以尝试一次受限重试，使用缓存的按设备 token。
  - 如果该重试失败，客户端应停止自动重连循环，并向操作员提供操作指导。

## 设备身份 + 配对

- 节点应包含稳定的设备身份（`device.id`），其来源于密钥对指纹。
- Gateway 按设备 + 角色签发 token。
- 新设备 ID 需要配对批准，除非启用了本地自动批准。
- 配对自动批准主要针对直接本地回环连接。
- OpenClaw 还有一条狭窄的后端/容器本地自连接路径，用于受信任的共享密钥辅助流程。
- 同主机 tailnet 或 LAN 连接在配对时仍被视为远程连接，并且需要批准。
- WS 客户端通常会在 `connect` 时包含 `device` 身份（operator + node）。唯一的无设备 operator 例外是明确的信任路径：
  - `gateway.controlUi.allowInsecureAuth=true`，用于仅 localhost 的不安全 HTTP 兼容。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` operator Control UI 认证。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`（紧急开关，严重降低安全性）。
  - 使用共享 gateway token/password 认证的直接回环 `gateway-client` 后端 RPC。
- 所有连接都必须对服务器提供的 `connect.challenge` nonce 进行签名。

### 设备认证迁移诊断

对于仍使用预挑战签名行为的旧客户端，`connect` 现在会在 `error.details.code` 下返回 `DEVICE_AUTH_*` 详情代码，并带有稳定的 `error.details.reason`。

常见迁移失败：

| 消息                        | details.code                     | details.reason           | 含义                                               |
| --------------------------- | -------------------------------- | ------------------------ | -------------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客户端省略了 `device.nonce`（或传入空值）。          |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`    | `device-nonce-mismatch`  | 客户端使用了过期/错误的 nonce 进行签名。            |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID` | `device-signature`       | 签名负载与 v2 负载不匹配。                          |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED` | `device-signature-stale` | 签名时间戳超出了允许的时钟偏差。                    |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 与公钥指纹不匹配。                     |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公钥格式/规范化失败。                               |

迁移目标：

- 始终等待 `connect.challenge`。
- 签名包含服务器 nonce 的 v2 负载。
- 在 `connect.params.device.nonce` 中发送相同的 nonce。
- 首选签名负载为 `v3`，它除了 device/client/role/scopes/token/nonce 字段外，还会绑定 `platform` 和 `deviceFamily`。
- 为兼容性，旧的 `v2` 签名仍然被接受，但已配对设备的元数据固定仍会在重连时控制命令策略。

## TLS + pinning

- WS 连接支持 TLS。
- 客户端可以选择固定网关证书指纹（参见 `gateway.tls`
  配置以及 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 范围

此协议公开了**完整的网关 API**（状态、通道、模型、聊天、
代理、会话、节点、审批等）。具体接口由
`src/gateway/protocol/schema.ts` 中的 TypeBox schemas 定义。

## 相关

- [Bridge protocol](/gateway/bridge-protocol)
- [Gateway runbook](/gateway)
