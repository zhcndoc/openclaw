---
summary: "网关 WebSocket 协议：握手、帧、版本管理"
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
    "maxProtocol": 4,
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
    "protocol": 4,
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

`server`, `features`, `snapshot`, and `policy` are all required by the schema
(`packages/gateway-protocol/src/schema/frames.ts`). `auth` is also required and reports
the negotiated role/scopes. `pluginSurfaceUrls` is optional and maps plugin
surface names, such as `canvas`, to scoped hosted URLs.

带作用域的插件表面 URL 可能会过期。节点可以调用
`node.pluginSurface.refresh`，传入 `{ "surface": "canvas" }`，以在
`pluginSurfaceUrls` 中获得一条新的条目。实验性的 Canvas 插件重构不
支持已弃用的 `canvasHostUrl`、`canvasCapability` 或
`node.canvas.capability.refresh` 兼容路径；当前的原生客户端和
网关必须使用插件表面。

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

内置的 QR/setup-code 启动是一个新的移动端接入路径。成功的
baseline setup-code connect 会返回一个主节点令牌以及一个受限的
operator 令牌：

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

该 operator 接入被刻意限制，以便 QR onboarding 可以在不授予
`operator.admin` 或 `operator.pairing` 的情况下启动 mobile operator 循环。
它确实包含 `operator.talk.secrets`，这样原生客户端就能读取 bootstrap 之后所需的 Talk 配置。更广泛的 admin 和 pairing scope 需要单独审批的 operator 配对或 token 流程。客户端应仅在使用 trusted transport（如 `wss://`）或 loopback/local pairing 进行 bootstrap auth 时，持久化 `hello-ok.auth.deviceTokens`。

### 节点示例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 4,
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

有关完整的 operator scope 模型、审批时检查以及共享密钥语义，请参见 [Operator scopes](/gateway/operator-scopes)。

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

- `caps`: camera、canvas、screen、location、voice 和 talk 等高级能力类别。
- `commands`: 调用的命令允许列表。
- `permissions`: 细粒度开关（例如 `screen.record`、`camera.capture`）。

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

  <Accordion title="Models and usage">
    - `models.list` returns the runtime-allowed model catalog. Pass `{ "view": "configured" }` for picker-sized configured models (`agents.defaults.models` first, then `models.providers.*.models`), or `{ "view": "all" }` for the full catalog.
    - `usage.status` returns provider usage windows/remaining quota summaries.
    - `usage.cost` returns aggregated cost usage summaries for a date range.
      Pass `agentId` for one agent, or `agentScope: "all"` to aggregate configured agents.
    - `doctor.memory.status` returns vector-memory / cached embedding readiness for the active default agent workspace. Pass `{ "probe": true }` or `{ "deep": true }` only when the caller explicitly wants a live embedding provider ping. Dreaming-aware clients may also pass `{ "agentId": "agent-id" }` to scope Dreaming store stats to a selected agent workspace; omitting `agentId` keeps the default-agent fallback and aggregates configured Dreaming workspaces.
    - `doctor.memory.dreamDiary`, `doctor.memory.backfillDreamDiary`, `doctor.memory.resetDreamDiary`, `doctor.memory.resetGroundedShortTerm`, `doctor.memory.repairDreamingArtifacts`, and `doctor.memory.dedupeDreamDiary` accept optional `{ "agentId": "agent-id" }` params for selected-agent Dreaming views/actions. When `agentId` is omitted, they operate on the configured default agent workspace.
    - `doctor.memory.remHarness` returns a bounded, read-only REM harness preview for remote control-plane clients. It can include workspace paths, memory snippets, rendered grounded markdown, and deep promotion candidates, so callers need `operator.read`.
    - `sessions.usage` returns per-session usage summaries. Pass `agentId` for one
      agent, or `agentScope: "all"` to list configured agents together.
    - `sessions.usage.timeseries` returns timeseries usage for one session.
    - `sessions.usage.logs` returns usage log entries for one session.

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

  <Accordion title="Talk and TTS">
    - `talk.catalog` 返回用于语音、流式转录和实时语音的只读 Talk 提供方目录。它包含提供方 id、标签、已配置状态、暴露的模型/voice id、标准模式、传输、brain 策略以及实时音频/能力标志，但不会返回提供方 secrets 或修改全局配置。
    - `talk.config` 返回生效的 Talk 配置负载；`includeSecrets` 需要 `operator.talk.secrets`（或 `operator.admin`）。
    - `talk.session.create` 为 `realtime/gateway-relay`、`transcription/gateway-relay` 或 `stt-tts/managed-room` 创建一个由 Gateway 拥有的 Talk 会话。对于 `stt-tts/managed-room`，传入 `sessionKey` 的 `operator.write` 调用方还必须传入 `spawnedBy`，以便限定 session-key 可见性；无作用域的 `sessionKey` 创建以及 `brain: "direct-tools"` 需要 `operator.admin`。
    - `talk.session.join` 验证一个 managed-room 会话令牌，在需要时发出 `session.ready` 或 `session.replaced` 事件，并返回房间/会话元数据以及最近的 Talk 事件，而不返回明文令牌或已存储令牌哈希。
    - `talk.session.appendAudio` 将 base64 PCM 输入音频追加到 Gateway 拥有的实时 relay 和转录会话。
    - `talk.session.startTurn`、`talk.session.endTurn` 和 `talk.session.cancelTurn` 驱动 managed-room 的轮次生命周期，并在清除状态前拒绝陈旧轮次。
    - `talk.session.cancelOutput` 停止助手音频输出，主要用于 Gateway relay 会话中的 VAD 门控 barging-in。
    - `talk.session.submitToolResult` 完成由 Gateway 拥有的实时 relay 会话发出的提供方工具调用。对于最终结果后续仍会到达的中间工具输出，请传入 `options: { willContinue: true }`；当工具结果应当满足提供方调用而无需启动另一轮实时助手响应时，请传入 `options: { suppressResponse: true }`。
    - `talk.session.steer` 将活动运行的语音控制发送到一个由 Gateway 拥有且由 agent 驱动的 Talk 会话。它接受 `{ sessionId, text, mode? }`，其中 `mode` 为 `status`、`steer`、`cancel` 或 `followup`；省略 mode 时会根据口语文本进行分类。
    - `talk.session.close` 关闭一个由 Gateway 拥有的 relay、transcription 或 managed-room 会话，并发出终止 Talk 事件。
    - `talk.mode` 为 WebChat/Control UI 客户端设置/广播当前 Talk 模式状态。
    - `talk.client.create` 使用 `webrtc` 或 `provider-websocket` 创建一个由客户端拥有的实时提供方会话，同时由 Gateway 拥有配置、凭据、指令和工具策略。
    - `talk.client.toolCall` 允许客户端拥有的实时传输将提供方工具调用转发给 Gateway 策略。第一个支持的工具是 `openclaw_agent_consult`；客户端会收到一个 run id，并在提交提供方特定的工具结果之前等待正常的聊天生命周期事件。
    - `talk.client.steer` 为客户端拥有的实时传输发送活动运行的语音控制。Gateway 会从 `sessionKey` 中解析活动的嵌入式运行，并返回结构化的接受/拒绝结果，而不是静默丢弃 steering。
    - `talk.event` 是用于实时、转录、STT/TTS、managed-room、电话和会议适配器的单一 Talk 事件通道。
    - `talk.speak` 通过当前活跃的 Talk 语音提供方合成语音。
    - `tts.status` 返回 TTS 启用状态、当前提供方、回退提供方以及提供方配置状态。
    - `tts.providers` 返回可见的 TTS 提供方清单。
    - `tts.enable` 和 `tts.disable` 切换 TTS prefs 状态。
    - `tts.setProvider` 更新首选 TTS 提供方。
    - `tts.convert` 执行一次性文本转语音转换。

  </Accordion>

  <Accordion title="Secrets, config, update, and wizard">
    - `secrets.reload` 仅在完全成功时重新解析活动 SecretRefs 并切换运行时 secret 状态。
    - `secrets.resolve` 为特定命令/目标集合解析命令目标 secret 分配。
    - `config.get` 返回当前配置快照和 hash。
    - `config.set` 写入已验证的配置负载。
    - `config.patch` 合并部分配置更新。
    - `config.apply` 验证并替换完整配置负载。
    - `config.schema` 返回 Control UI 和 CLI 工具使用的实时配置 schema 负载：schema、`uiHints`、版本和生成元数据，包括运行时可加载时的插件 + 通道 schema 元数据。该 schema 包含从 UI 使用的相同标签和帮助文本派生的字段 `title` / `description` 元数据，包括在匹配到字段文档时的嵌套对象、通配符、数组项以及 `anyOf` / `oneOf` / `allOf` 组合分支。
    - `config.schema.lookup` 返回某个配置路径的路径作用域查找负载：规范化路径、浅层 schema 节点、匹配到的 hint + `hintPath`、可选 `reloadKind`，以及用于 UI/CLI 下钻的直接子项摘要。`reloadKind` 的值为 `restart`、`hot` 或 `none`，并与所请求路径的 Gateway 配置重新加载规划器一致。查找 schema 节点保留面向用户的文档和常见验证字段（`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、数值/字符串/数组/对象边界，以及 `additionalProperties`、`deprecated`、`readOnly`、`writeOnly` 等标志）。子项摘要暴露 `key`、规范化 `path`、`type`、`required`、`hasChildren`、可选 `reloadKind`，以及匹配到的 `hint` / `hintPath`。
    - `update.run` 运行网关更新流程，并且只有在更新本身成功时才安排重启；带有会话的调用方可以包含 `continuationMessage`，以便启动在重启 continuation 队列中恢复一个后续 agent turn。来自控制平面的包管理器更新会使用一个分离的 managed-service 接管路径，而不是直接替换 live Gateway 中的包树。已启动的接管会返回 `ok: true`，其中 `result.reason: "managed-service-handoff-started"` 且 `handoff.status: "started"`；不可用或失败的接管会返回 `ok: false`，并带有 `managed-service-handoff-unavailable` 或 `managed-service-handoff-failed`，如果需要手动 shell 更新，还会附带 `handoff.command`。在已启动接管期间，restart sentinel 可能会短暂报告 `stats.reason: "restart-health-pending"`；continuation 会延迟，直到 CLI 验证重启后的 Gateway 并写入最终的 `ok` sentinel。
    - `update.status` 返回最新缓存的更新重启 sentinel，包括可用时重启后的运行版本。
    - `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 通过 WS RPC 暴露 onboarding wizard。

  </Accordion>

  <Accordion title="Agent 和 workspace 助手">
    - `agents.list` 返回已配置的 agent 条目，包括生效模型和运行时元数据。
    - `agents.create`、`agents.update` 和 `agents.delete` 管理 agent 记录和 workspace 绑定。
    - `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理为某个 agent 暴露的 bootstrap workspace 文件。
    - `tasks.list`、`tasks.get` 和 `tasks.cancel` 向 SDK 和 operator 客户端暴露 Gateway 任务账本。
    - `artifacts.list`、`artifacts.get` 和 `artifacts.download` 为显式的 `sessionKey`、`runId` 或 `taskId` 作用域暴露由 transcript 派生的 artifact 摘要和下载内容。Run 和 task 查询会在服务端解析归属会话，并且只返回来源匹配的 transcript 媒体；不安全或本地 URL 来源返回不支持的下载，而不会在服务端抓取。
    - `environments.list` 和 `environments.status` 为 SDK 客户端暴露只读的 Gateway 本地和节点环境发现能力。
    - `agent.identity.get` 返回某个 agent 或会话的生效助手身份。
    - `agent.wait` 等待某个运行结束，并在可用时返回终态快照。

  </Accordion>

  <Accordion title="Session control">
    - `sessions.list` returns the current session index, including per-row `agentRuntime` metadata when an agent runtime backend is configured.
    - `sessions.subscribe` and `sessions.unsubscribe` toggle session change event subscriptions for the current WS client.
    - `sessions.messages.subscribe` and `sessions.messages.unsubscribe` toggle transcript/message event subscriptions for one session.
    - `sessions.preview` returns bounded transcript previews for specific session keys.
    - `sessions.describe` returns one Gateway session row for an exact session key.
    - `sessions.resolve` resolves or canonicalizes a session target.
    - `sessions.create` creates a new session entry.
    - `sessions.send` sends a message into an existing session.
    - `sessions.steer` is the interrupt-and-steer variant for an active session.
    - `sessions.abort` aborts active work for a session. A caller may pass `key` plus optional `runId`, or pass `runId` alone for active runs the Gateway can resolve to a session.
    - `sessions.patch` updates session metadata/overrides and reports the resolved canonical model plus effective `agentRuntime`.
    - `sessions.reset`, `sessions.delete`, and `sessions.compact` perform session maintenance.
    - `sessions.get` returns the full stored session row.
    - Chat execution still uses `chat.history`, `chat.send`, `chat.abort`, and `chat.inject`. `chat.history` is display-normalized for UI clients: inline directive tags are stripped from visible text, plain-text tool-call XML payloads (including `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, and truncated tool-call blocks) and leaked ASCII/full-width model control tokens are stripped, pure silent-token assistant rows such as exact `NO_REPLY` / `no_reply` are omitted, and oversized rows can be replaced with placeholders.
    - `chat.message.get` is the additive bounded full-message reader for a single visible transcript entry. Clients pass `sessionKey`, optional `agentId` when the session selection is agent-scoped, plus a transcript `messageId` previously surfaced through `chat.history`, and the Gateway returns the same display-normalized projection without the lightweight history truncation cap when the stored entry is still available and not oversized.

  </Accordion>

  <Accordion title="设备配对与设备令牌">
    - `device.pair.list` 返回待处理和已批准的已配对设备。
    - `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理设备配对记录。
    - `device.token.rotate` 在其已批准角色和调用方作用域边界内轮换一个已配对设备令牌。
    - `device.token.revoke` 在其已批准角色和调用方作用域边界内撤销一个已配对设备令牌。

  </Accordion>

  <Accordion title="节点配对、调用和待处理工作">
    - `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject`、`node.pair.remove` 和 `node.pair.verify` 涵盖节点配对和启动验证。
    - `node.list` 和 `node.describe` 返回已知/已连接的节点状态。
    - `node.rename` 更新已配对节点的标签。
    - `node.invoke` 将命令转发到已连接节点。
    - `node.invoke.result` 返回一次 invoke 请求的结果。
    - `node.event` 将节点发起的事件带回网关。
    - `node.pending.pull` 和 `node.pending.ack` 是面向已连接节点的队列 API。
    - `node.pending.enqueue` 和 `node.pending.drain` 管理离线/断开节点的持久待处理工作。

  </Accordion>

  <Accordion title="审批族">
    - `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 涵盖一次性 exec 审批请求以及待处理审批的查询/回放。
    - `exec.approval.waitDecision` 等待一个待处理 exec 审批，并返回最终决定（若超时则返回 `null`）。
    - `exec.approvals.get` 和 `exec.approvals.set` 管理网关 exec 审批策略快照。
    - `exec.approvals.node.get` 和 `exec.approvals.node.set` 通过 node relay 命令管理节点本地 exec 审批策略。
    - `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵盖插件定义的审批流程。

  </Accordion>

  <Accordion title="自动化、技能和工具">
    - 自动化：`wake` 会安排一次立即或下一次 heartbeat 的唤醒文本注入；`cron.get`、`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run`、`cron.runs` 管理定时工作。
    - `cron.run` 仍然是用于手动运行的入队式 RPC。需要完成语义的客户端应读取返回的 `runId` 并轮询 `cron.runs`。
    - `cron.runs` 接受一个可选的非空 `runId` 过滤器，以便客户端可以跟踪某个已排队的手动运行，而不会与同一作业的其他历史条目竞争。
    - 技能与工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`、`tools.invoke`。

  </Accordion>
</AccordionGroup>

### 常见事件族

- `chat`：UI 聊天更新，例如 `chat.inject` 和其他仅 transcript 的聊天
  事件。在协议 v4 中，delta 负载携带 `deltaText`；`message` 仍然是
  累积的 assistant 快照。非前缀替换会设置 `replace=true`，并使用
  `deltaText` 作为替换文本。
- `session.message`、`session.operation` 和 `session.tool`：订阅的
  会话的 transcript、进行中的会话操作，以及事件流更新。
- `sessions.changed`：会话索引或元数据已更改。
- `presence`：系统 presence 快照更新。
- `tick`：周期性 keepalive / 存活事件。
- `health`：网关健康快照更新。
- `heartbeat`：heartbeat 事件流更新。
- `cron`：cron 运行/作业变更事件。
- `shutdown`：网关关闭通知。
- `node.pair.requested` / `node.pair.resolved`：节点配对生命周期。
- `node.invoke.request`：节点 invoke 请求广播。
- `device.pair.requested` / `device.pair.resolved`：已配对设备生命周期。
- `voicewake.changed`：唤醒词触发配置已更改。
- `exec.approval.requested` / `exec.approval.resolved`：exec 审批
  生命周期。
- `plugin.approval.requested` / `plugin.approval.resolved`：插件审批
  生命周期。

### 节点助手方法

- 节点可以调用 `skills.bins` 来获取当前技能可执行文件列表，用于自动放行检查。

### Task 账本 RPC

Operator 客户端可以通过 task ledger RPC 检查和取消 Gateway 后台任务记录。
这些方法返回的是经过净化的任务摘要，而不是原始运行时状态。

- `tasks.list` 需要 `operator.read`。
  - 参数：可选 `status`（`"queued"`、`"running"`、`"completed"`、
    `"failed"`、`"cancelled"` 或 `"timed_out"`）或这些状态的数组，
    可选 `agentId`，可选 `sessionKey`，可选范围为
    `1` 到 `500` 的 `limit`，以及可选字符串 `cursor`。
  - 结果：`{ "tasks": TaskSummary[], "nextCursor"?: string }`。
- `tasks.get` 需要 `operator.read`。
  - 参数：`{ "taskId": string }`。
  - 结果：`{ "task": TaskSummary }`。
  - 缺失的 task id 会返回 Gateway 的 not-found 错误形状。
- `tasks.cancel` 需要 `operator.write`。
  - 参数：`{ "taskId": string, "reason"?: string }`。
  - 结果：
    `{ "found": boolean, "cancelled": boolean, "reason"?: string, "task"?: TaskSummary }`。
  - `found` 表示账本中是否存在匹配任务。`cancelled`
    表示运行时是否接受或记录了取消请求。

`TaskSummary` 包括 `id`、`status`，以及可选元数据，例如 `kind`、
`runtime`、`title`、`agentId`、`sessionKey`、`childSessionKey`、`ownerKey`、
`runId`、`taskId`、`flowId`、`parentTaskId`、`sourceId`、时间戳、进度、
终态摘要和净化后的错误文本。

### Operator 辅助方法

- Operators may call `commands.list` (`operator.read`) to fetch the runtime
  command inventory for an agent.
  - `agentId` is optional; omit it to read the default agent workspace.
  - `scope` controls which surface the primary `name` targets:
    - `text` returns the primary text command token without the leading `/`
    - `native` and the default `both` path return provider-aware native names
      when available
  - `textAliases` carries exact slash aliases such as `/model` and `/m`.
  - `nativeName` carries the provider-aware native command name when one exists.
  - `provider` is optional and only affects native naming plus native plugin
    command availability.
  - `includeArgs=false` omits serialized argument metadata from the response.
- Operators may call `tools.catalog` (`operator.read`) to fetch the runtime tool catalog for an
  agent. The response includes grouped tools and provenance metadata:
  - `source`: `core` or `plugin`
  - `pluginId`: plugin owner when `source="plugin"`
  - `optional`: whether a plugin tool is optional
- Operators may call `tools.effective` (`operator.read`) to fetch the runtime-effective tool
  inventory for a session.
  - `sessionKey` is required.
  - The gateway derives trusted runtime context from the session server-side instead of accepting
    caller-supplied auth or delivery context.
  - The response is a session-scoped server-derived projection of the active inventory,
    including core, plugin, channel, and already-discovered MCP server tools.
  - `tools.effective` is read-only for MCP: it may project a warm session MCP catalog through the
    final tool policy, but it does not create MCP runtimes, connect transports, or issue
    `tools/list`. If no matching warm catalog exists, the response may include a notice such as
    `mcp-not-yet-connected`, `mcp-not-yet-listed`, or `mcp-stale-catalog`.
  - Effective tool entries use `source="core"`, `source="plugin"`, `source="channel"`, or
    `source="mcp"`.
- Operators may call `tools.invoke` (`operator.write`) to invoke one available tool through the
  same gateway policy path as `/tools/invoke`.
  - `name` is required. `args`, `sessionKey`, `agentId`, `confirm`, and
    `idempotencyKey` are optional.
  - If both `sessionKey` and `agentId` are present, the resolved session agent must match
    `agentId`.
  - Owner-only core wrappers such as `cron`, `gateway`, and `nodes` require
    owner/admin identity (`operator.admin`) even though the `tools.invoke`
    method itself is `operator.write`.
  - The response is an SDK-facing envelope with `ok`, `toolName`, optional `output`, and typed
    `error` fields. Approval or policy refusals return `ok:false` in the payload rather than
    bypassing the gateway tool policy pipeline.
- Operators may call `skills.status` (`operator.read`) to fetch the visible
  skill inventory for an agent.
  - `agentId` is optional; omit it to read the default agent workspace.
  - The response includes eligibility, missing requirements, config checks, and
    sanitized install options without exposing raw secret values.
- Operators may call `skills.search` and `skills.detail` (`operator.read`) for
  ClawHub discovery metadata.
- Operators may call `skills.upload.begin`, `skills.upload.chunk`, and
  `skills.upload.commit` (`operator.admin`) to stage a private skill archive
  before installing it. This is a separate admin upload path for trusted clients,
  not the normal ClawHub skill install flow, and is disabled by default unless
  `skills.install.allowUploadedArchives` is enabled.
  - `skills.upload.begin({ kind: "skill-archive", slug, sizeBytes, sha256?, force?, idempotencyKey? })`
    creates an upload bound to that slug and force value.
  - `skills.upload.chunk({ uploadId, offset, dataBase64 })` appends bytes at
    the exact decoded offset.
  - `skills.upload.commit({ uploadId, sha256? })` verifies the final size and
    SHA-256. Commit only finalizes the upload; it does not install the skill.
  - Uploaded skill archives are zip archives containing a `SKILL.md` root. The
    archive's internal directory name never selects the install target.
- Operators may call `skills.install` (`operator.admin`) in three modes:
  - ClawHub mode: `{ source: "clawhub", slug, version?, force? }` installs a
    skill folder into the default agent workspace `skills/` directory.
  - Upload mode: `{ source: "upload", uploadId, slug, force?, sha256?, timeoutMs? }`
    installs a committed upload into the default agent workspace `skills/<slug>`
    directory. The slug and force value must match the original
    `skills.upload.begin` request. This mode is rejected unless
    `skills.install.allowUploadedArchives` is enabled. The setting does not
    affect ClawHub installs.
  - Gateway installer mode: `{ name, installId, timeoutMs? }`
    runs a declared `metadata.openclaw.install` action on the gateway host.
    Older clients may still send `dangerouslyForceUnsafeInstall`; this field is
    deprecated, accepted only for protocol compatibility, and ignored. Use
    `security.installPolicy` for operator-owned install decisions.
- Operators may call `skills.update` (`operator.admin`) in two modes:
  - ClawHub mode updates one tracked slug or all tracked ClawHub installs in
    the default agent workspace.
  - Config mode patches `skills.entries.<skillKey>` values such as `enabled`,
    `apiKey`, and `env`.

### `models.list` 视图

`models.list` 接受一个可选的 `view` 参数：

- 省略或 `"default"`：当前运行时行为。如果配置了 `agents.defaults.models`，响应为允许的目录，包括动态发现的 `provider/*` 条目模型。否则响应为完整的 Gateway 目录。
- `"configured"`：适合选择器大小的行为。如果配置了 `agents.defaults.models`，它仍然生效，包括 `provider/*` 条目的 provider 作用域发现。若没有 allowlist，响应会使用显式的 `models.providers.*.models` 条目，仅在不存在任何已配置模型行时才回退到完整目录。
- `"all"`：完整的 Gateway 目录，绕过 `agents.defaults.models`。用于诊断和发现 UI，而不是普通模型选择器。

## Exec 审批

- 当 exec 请求需要批准时，网关会广播 `exec.approval.requested`。
- 操作员客户端通过调用 `exec.approval.resolve` 来完成处理（需要 `operator.approvals` 范围）。
- 对于 `host=node`，`exec.approval.request` 必须包含 `systemRunPlan`（规范化的 `argv`/`cwd`/`rawCommand`/会话元数据）。缺少 `systemRunPlan` 的请求会被拒绝。
- 批准后，转发的 `node.invoke system.run` 调用会复用该规范化的 `systemRunPlan`，作为权威的命令/cwd/会话上下文。
- 如果调用方在 prepare 与最终获批的 `system.run` 转发之间篡改了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，网关会拒绝该运行，而不会信任被篡改的负载。

## Agent 投递回退

- `agent` 请求可以包含 `deliver=true` 以请求出站投递。
- `bestEffortDeliver=false` 保持严格行为：未解析或仅内部可用的投递目标会返回 `INVALID_REQUEST`。
- `bestEffortDeliver=true` 允许在无法解析到外部可投递路由时回退到仅会话执行（例如内部/webchat 会话或多通道配置不明确的情况）。
- 最终的 `agent` 结果在请求了投递时，可能包含 `result.deliveryStatus`，其状态与 [`openclaw agent --json --deliver`](/cli/agent#json-delivery-status) 中文档化的 `sent`、`suppressed`、`partial_failed` 和 `failed` 状态一致。

## 版本管理

- `PROTOCOL_VERSION` 位于 `packages/gateway-protocol/src/version.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`；服务器会拒绝不包含其当前协议版本的范围。当前客户端和服务器要求协议 v4。
- 模式 + 模型由 TypeBox 定义生成：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客户端常量

`src/gateway/client.ts` 中的参考客户端使用这些默认值。该值在 protocol v4 中保持稳定，是第三方客户端预期的基线。

| 常量                                      | 默认值                                                | 来源                                                                                     |
| ----------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `PROTOCOL_VERSION`                        | `4`                                                   | `packages/gateway-protocol/src/version.ts`                                                 |
| `MIN_CLIENT_PROTOCOL_VERSION`             | `4`                                                   | `packages/gateway-protocol/src/version.ts`                                                 |
| Request timeout (per RPC)                 | `30_000` ms                                           | `src/gateway/client.ts` (`requestTimeoutMs`)                                               |
| Preauth / connect-challenge timeout       | `15_000` ms                                           | `src/gateway/handshake-timeouts.ts` (配置/环境可以提高配对的服务器/客户端预算) |
| Initial reconnect backoff                 | `1_000` ms                                            | `src/gateway/client.ts` (`backoffMs`)                                                      |
| Max reconnect backoff                     | `30_000` ms                                           | `src/gateway/client.ts` (`scheduleReconnect`)                                              |
| Fast-retry clamp after device-token close | `250` ms                                              | `src/gateway/client.ts`                                                                    |
| Force-stop grace before `terminate()`     | `250` ms                                              | `FORCE_STOP_TERMINATE_GRACE_MS`                                                            |
| `stopAndWait()` default timeout           | `1_000` ms                                            | `STOP_AND_WAIT_TIMEOUT_MS`                                                                 |
| Default tick interval (pre `hello-ok`)    | `30_000` ms                                           | `src/gateway/client.ts`                                                                    |
| Tick-timeout close                        | code `4000` when silence exceeds `tickIntervalMs * 2` | `src/gateway/client.ts`                                                                    |
| `MAX_PAYLOAD_BYTES`                       | `25 * 1024 * 1024` (25 MB)                            | `src/gateway/server-constants.ts`                                                          |

服务端会在 `hello-ok` 中通告实际生效的 `policy.tickIntervalMs`、`policy.maxPayload` 和 `policy.maxBufferedBytes`；客户端应遵守这些值，而不是握手前的默认值。

## 认证

- Shared-secret gateway auth uses `connect.params.auth.token` or
  `connect.params.auth.password`, depending on the configured auth mode.
- Identity-bearing modes such as Tailscale Serve
  (`gateway.auth.allowTailscale: true`) or non-loopback
  `gateway.auth.mode: "trusted-proxy"` satisfy the connect auth check from
  request headers instead of `connect.params.auth.*`.
- Private-ingress `gateway.auth.mode: "none"` skips shared-secret connect auth
  entirely; do not expose that mode on public/untrusted ingress.
- After pairing, the Gateway issues a **device token** scoped to the connection
  role + scopes. It is returned in `hello-ok.auth.deviceToken` and should be
  persisted by the client for future connects.
- Clients should persist the primary `hello-ok.auth.deviceToken` after any
  successful connect.
- Reconnecting with that **stored** device token should also reuse the stored
  approved scope set for that token. This preserves read/probe/status access
  that was already granted and avoids silently collapsing reconnects to a
  narrower implicit admin-only scope.
- Client-side connect auth assembly (`selectConnectAuth` in
  `src/gateway/client.ts`):
  - `auth.password` is orthogonal and is always forwarded when set.
  - `auth.token` is populated in priority order: explicit shared token first,
    then an explicit `deviceToken`, then a stored per-device token (keyed by
    `deviceId` + `role`).
  - `auth.bootstrapToken` is sent only when none of the above resolved an
    `auth.token`. A shared token or any resolved device token suppresses it.
  - Auto-promotion of a stored device token on the one-shot
    `AUTH_TOKEN_MISMATCH` retry is gated to **trusted endpoints only** —
    loopback, or `wss://` with a pinned `tlsFingerprint`. Public `wss://`
    without pinning does not qualify.
- Built-in setup-code bootstrap returns the primary node
  `hello-ok.auth.deviceToken` plus a bounded operator token in
  `hello-ok.auth.deviceTokens` for trusted mobile handoff. The operator token
  includes `operator.talk.secrets` for native Talk configuration reads and
  excludes `operator.admin` and `operator.pairing`.
- While a non-baseline setup-code bootstrap is waiting for approval, `PAIRING_REQUIRED`
  details include `recommendedNextStep: "wait_then_retry"`, `retryable: true`,
  and `pauseReconnect: false`. Clients should keep reconnecting with the same
  bootstrap token until the request is approved or the token becomes invalid.
- Persist `hello-ok.auth.deviceTokens` only when the connect used bootstrap auth
  on a trusted transport such as `wss://` or loopback/local pairing.
- If a client supplies an **explicit** `deviceToken` or explicit `scopes`, that
  caller-requested scope set remains authoritative; cached scopes are only
  reused when the client is reusing the stored per-device token.
- Device tokens can be rotated/revoked via `device.token.rotate` and
  `device.token.revoke` (requires `operator.pairing` scope). Rotating or
  revoking a node or other non-operator role also requires `operator.admin`.
- `device.token.rotate` returns rotation metadata. It echoes the replacement
  bearer token only for same-device calls that are already authenticated with
  that device token, so token-only clients can persist their replacement before
  reconnecting. Shared/admin rotations do not echo the bearer token.
- Token issuance, rotation, and revocation stay bounded to the approved role set
  recorded in that device's pairing entry; token mutation cannot expand or
  target a device role that pairing approval never granted.
- For paired-device token sessions, device management is self-scoped unless the
  caller also has `operator.admin`: non-admin callers can manage only the
  operator token for their **own** device entry. Node and other non-operator
  token management is admin-only, even for the caller's own device.
- `device.token.rotate` and `device.token.revoke` also check the target operator
  token scope set against the caller's current session scopes. Non-admin callers
  cannot rotate or revoke a broader operator token than they already hold.
- Auth failures include `error.details.code` plus recovery hints:
  - `error.details.canRetryWithDeviceToken` (boolean)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Client behavior for `AUTH_TOKEN_MISMATCH`:
  - Trusted clients may attempt one bounded retry with a cached per-device token.
  - If that retry fails, clients should stop automatic reconnect loops and surface operator action guidance.
- `AUTH_SCOPE_MISMATCH` means the device token was recognized but does not cover
  the requested role/scopes. Clients should not present this as a bad token;
  prompt the operator to re-pair or approve the narrower/broader scope contract.

## 设备身份 + 配对

- Nodes should include a stable device identity (`device.id`) derived from a
  keypair fingerprint.
- Gateways issue tokens per device + role.
- Pairing approvals are required for new device IDs unless local auto-approval
  is enabled.
- Pairing auto-approval is centered on direct local loopback connects.
- OpenClaw also has a narrow backend/container-local self-connect path for
  trusted shared-secret helper flows.
- Same-host tailnet or LAN connects are still treated as remote for pairing and
  require approval.
- WS clients normally include `device` identity during `connect` (operator +
  node). The only device-less operator exceptions are explicit trust paths:
  - `gateway.controlUi.allowInsecureAuth=true` for localhost-only insecure HTTP compatibility.
  - successful `gateway.auth.mode: "trusted-proxy"` operator Control UI auth.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (break-glass, severe security downgrade).
  - direct-loopback `gateway-client` backend RPCs authenticated with the shared
    gateway token/password.
- Omitting device identity has scope consequences. When a Control UI connection
  lacks device identity, `shouldClearUnboundScopesForMissingDeviceIdentity`
  clears self-declared scopes to an empty set for token, password, and
  trusted-proxy auth. The connection is allowed on explicit trust paths, but
  scope-gated methods fail. The exception is local Control UI token/password
  sessions with `allowInsecureAuth`, which preserve scopes. For other cases,
  set `gateway.controlUi.dangerouslyDisableDeviceAuth=true` only as a
  break-glass scope-preservation path.
- All connections must sign the server-provided `connect.challenge` nonce.

### 设备认证迁移诊断

对于仍使用预挑战签名行为的旧客户端，`connect` 现在会在 `error.details.code` 下返回 `DEVICE_AUTH_*` 详情代码，并带有稳定的 `error.details.reason`。

常见迁移失败：

| 消息                        | details.code                     | details.reason           | 含义                                               |
| --------------------------- | -------------------------------- | ------------------------ | -------------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客户端省略了 `device.nonce`（或传入空值）。          |
| `device nonce mismatch`    | `DEVICE_AUTH_NONCE_MISMATCH`    | `device-nonce-mismatch`  | 客户端使用了过期/错误的 nonce 进行签名。            |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID` | `device-signature`       | 签名负载与 v2 负载不匹配。                          |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED` | `device-signature-stale` | 签名时间戳超出了允许的时钟偏差。                    |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 与公钥指纹不匹配。                     |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID`      | `device-public-key`      | 公钥格式/规范化失败。                               |

迁移目标：

- 始终等待 `connect.challenge`。
- 签名包含服务器 nonce 的 v2 负载。
- 在 `connect.params.device.nonce` 中发送相同的 nonce。
- 首选签名负载为 `v3`，它除了 device/client/role/scopes/token/nonce 字段外，还会绑定 `platform` 和 `deviceFamily`。
- 为兼容性，旧的 `v2` 签名仍然被接受，但已配对设备的元数据固定仍会在重连时控制命令策略。

## TLS + 固定指纹

- WS 连接支持 TLS。
- 客户端可以选择固定网关证书指纹（参见 `gateway.tls`
  配置以及 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 范围

此协议暴露 **完整的网关 API**（status、channels、models、chat、
agent、sessions、nodes、approvals 等）。确切的接口由
`packages/gateway-protocol/src/schema.ts` 中的 TypeBox schemas 定义。

## 相关

- [Bridge protocol](/gateway/bridge-protocol)
- [网关运行手册](/gateway)
