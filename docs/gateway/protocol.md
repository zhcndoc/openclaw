---
summary: "网关 WebSocket 协议：握手、帧、版本管理"
read_when:
  - 实现或更新网关 WS 客户端时
  - 调试协议不匹配或连接失败时
  - 重新生成协议 schema/models 时
title: "网关协议"
---

网关 WS 协议是 OpenClaw 的单一控制平面和节点传输层。操作员和节点客户端（CLI、Web UI、macOS app、iOS/Android nodes、无头节点）通过 WebSocket 连接，并在握手时声明一个**角色**和**作用域**。

## npm 软件包

这些软件包随 OpenClaw 发布版本一同提供。在初始推出期间，直到首个包含软件包的版本发布，npm 可能会返回 `E404`。

- [`@openclaw/gateway-protocol`](https://www.npmjs.com/package/@openclaw/gateway-protocol)
  发布架构、验证器、TypeScript 类型、轻量级帧和错误辅助工具以及版本常量。其 tarball 包含生成的
  [`protocol.schema.json`](https://unpkg.com/@openclaw/gateway-protocol@beta/protocol.schema.json)
  机器可读契约。
- [`@openclaw/gateway-client`](https://www.npmjs.com/package/@openclaw/gateway-client)
  发布参考 Node 客户端，以及浏览器安全入口
  `@openclaw/gateway-client/browser`。

有关应用生命周期指南，请参阅
[构建 Gateway 客户端](https://docs.openclaw.ai/gateway/clients)。对于将 Gateway 作为子进程进行监控的应用，请参阅
[嵌入 OpenClaw](https://docs.openclaw.ai/gateway/embedding)。

## 传输与帧

- WebSocket、文本帧、JSON 载荷。
- 第一帧**必须**是 `connect` 请求。
- 连接建立前的帧上限为 64 KiB（`MAX_PREAUTH_PAYLOAD_BYTES`）。握手完成后，遵循
  `hello-ok.policy.maxPayload` 和
  `hello-ok.policy.maxBufferedBytes`。启用诊断后，超大的入站帧和缓慢的出站缓冲区会在网关关闭或丢弃帧之前发出 `payload.large` 事件。这些事件包含 `surface`、字节大小、限制和安全原因代码，绝不包含消息正文、附件内容、原始帧字节、令牌、Cookie 或密钥。

帧结构：

- 请求：`{type:"req", id, method, params, traceparent?}`
- 响应：`{type:"res", id, ok, payload|error}`
- 事件：`{type:"event", event, payload, seq?, stateVersion?}`

身份验证后，客户端可以在每个请求帧中包含 W3C `traceparent` 字符串。网关会将有效值作为该请求的子追踪上下文继续传递。缺失或语法格式错误的值（在 128 个字符的字段限制内）会保持默认的新请求追踪，并且不会导致 RPC 失败；更长的值会使请求帧无效。初始的 `connect` 请求不会为后续帧建立追踪上下文。在长连接上，为每个逻辑请求使用单独的 `traceparent`；不要将 WebSocket 本身视为一条追踪。

响应错误使用 `{ code, message, details?, retryable?, retryAfterMs? }`。客户端应根据 `code` 和 `details.code` 分支处理；`message` 保持人类可读，但可以更改，除非兼容性说明另有规定。方法级授权失败使用顶层 `code: "FORBIDDEN"`，并附带结构化的缺失范围详情：

- 缺失范围：`{ code: "MISSING_SCOPE", missingScope, requiredScopes }`。
  `requiredScopes` 是请求操作的完整已知范围集合。
  为兼容旧客户端，保留旧版 `missing scope: <scope>` 消息。

客户端应首先读取 `details`，仅将旧版消息作为兼容性回退。`readMissingScopeError` 和 `readMissingScopeErrorDetails` 从
`@openclaw/gateway-protocol/gateway-error-details` 导出；浏览器安全的网关客户端从
`@openclaw/gateway-client/browser` 重新导出它们。

这些架构从
`@openclaw/gateway-protocol/schema` 导出，名称为
`GatewayErrorDetailsSchema`、`MissingScopeErrorDetailsSchema`。
HTTP 范围失败会在 `error.details` 下复用 `MISSING_SCOPE` 对象，并使用 HTTP 状态 `403`。

产生副作用的方法需要幂等键（请参阅架构）。

## Gateway 控制的 WebRTC 对话

`talk.client.create` 接受附加能力
`gateway-control-v1`。目前仅适用于具有可解析 Platform API-key 身份验证的 OpenAI GA Realtime
会话。成功结果包括 `clientControl: { owner: "gateway" }`、位于
`clientSecret` 中的 60 秒一次性 Gateway broker token，以及相对路径
`offerUrl: "/plugins/openai/realtime/calls"`。

客户端仅向该路由发送 `application/sdp`，并携带 broker token。客户端不得创建 provider control data channel。Gateway
会创建通话，在返回 answer SDP 之前附加 provider sideband，并负责工具、
转录、引导、取消和关闭生命周期。省略该能力的客户端将保留现有的浏览器会话行为。无法提供所请求所有者的 Gateway 或已配置的身份验证路径将返回
`UNAVAILABLE`；它绝不会将请求降级为由客户端拥有的控制。

## 握手

Gateway 发送预连接挑战：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

设备认证客户端将挑战中的 `ts` 用作 `connect.params.device.signedAt`。
对于 WebSocket 挑战，`ts` 必须是非负整数。明确支持
`connect.challenge` 尚不存在的旧版 Gateway 的客户端，仅在未收到挑战时才能使用本地
时间；如果收到的挑战缺少 `ts` 或其格式错误，则该挑战无效。

客户端使用 `connect` 回复：

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 4,
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

Gateway 使用 `hello-ok` 响应：

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
      "tickIntervalMs": 15000,
      "attachments": { "maxBytes": 20971520, "maxImageBytes": 6291456 }
    }
  }
}
```

`server`、`features`、`snapshot`、`policy` 和 `auth` 都是
`HelloOkSchema`（`packages/gateway-protocol/src/schema/frames.ts`）要求的字段。
即使未签发设备令牌，`auth` 也会报告协商后的角色以及当前 socket 的有效授权范围
（结构如上）。如果存在 `deviceToken`，它就是同一设备和角色的主要可复用凭据。
`policy.attachments` 是可选字段（较旧的 Gateway 会省略它），用于公布
`chat.send`、`sessions.send` 和会话创建初始轮次中聊天附件所面临的解码后大小上限：

| 字段            | 含义                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------ |
| `maxBytes`      | 单个附件可接受的最大解码后大小（`agents.defaults.mediaMaxMb`，默认 20 MB）                |
| `maxImageBytes` | 单个图像可接受的最大解码后大小：`min(maxBytes, 6 MB agent-hydration cap)`                  |

发送前进行验证：

1. 检查每个文件的解码后大小：图像对照 `maxImageBytes`，其他内容对照
   `maxBytes`。
2. 序列化整个请求，并检查其编码后大小是否不超过 `policy.maxPayload`。
   `policy.attachments` 是每个附件的上限，绝不意味着整个帧一定能够容纳该附件：
   附件会以 base64 传输，因此一个 20 MB 的文件在线上传输时约为 26.7 MB，
   单独就会超过默认的 25 MiB 帧上限。
3. 其他所有事项以服务器为准。可接受的 MIME 类型和每条消息的处理方式不会被主动公布，
   因为它们取决于入口点、解析后的模型和载荷嗅探。Gateway 可以返回类型化拒绝；
   而纯文本模型运行可能会在达到其卸载上限后省略额外图像，但仍然完成请求。
4. 每次重新连接时重新读取这些值。它们是连接时快照，因此对正在运行的
   `mediaMaxMb` 编辑，只有在重新连接后才会传达到现有连接。

`pluginSurfaceUrls` 是可选字段，用于将插件界面名称（例如
`canvas`）映射到有范围限制的托管 URL；该 URL 可能会过期，因此节点会调用
`node.pluginSurface.refresh`，并传入 `{ "surface": "canvas" }` 来获取新的入口。
不支持已弃用的 `canvasHostUrl`／`canvasCapability`／`node.canvas.capability.refresh`
路径；请使用插件界面。
`sessions.observer.ask` 方法已移除；请使用 `sessions.companion.ask`。
快照中可选的 `appliedConfigHash` 是活动 Gateway 运行时接受的已解析源配置修订版本。
客户端可以将其与 `config.get.configRevisionHash` 进行比较，以确定是否仍需重启才能应用
较新的已保存配置。`config.get.hash` 仍然是配置写入冲突保护所使用的原始根文件修订版本。

当 Gateway 仍在完成启动 sidecar 时，`connect` 可能会返回带有
`details.reason: "startup-sidecars"` 和 `retryAfterMs` 的可重试
`UNAVAILABLE` 错误。请在连接预算内重试，而不要将其视为终止性的握手失败。

签发设备令牌时，`hello-ok.auth` 会添加该令牌：

```json validate=false
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read"]
  }
}
```

内置 QR／setup-code 引导是移动端交接路径。成功的基础 setup-code 连接会返回一个主要
节点令牌以及一个范围受限的 operator 令牌：

```json validate=false
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

此 operator 交接有意限制了范围：它足以启动移动端 operator 循环和原生设置流程，
其中 `operator.write` 可满足 Talk 会话，`operator.talk.secrets` 可覆盖 Talk 配置读取，
但不包含配对变更范围，也不包含 `operator.admin`。更广泛的
配对／管理员访问权限需要单独经过批准的配对或令牌流程。只有当引导认证通过受信任的
传输方式（`wss://` 或回环／本地配对）运行时，才持久化
`hello-ok.auth.deviceTokens`。

受信任的同进程后端客户端（`client.id: "gateway-client"`、
`client.mode: "backend"`）在通过共享 Gateway 令牌／密码进行认证的直接回环连接中，
可以省略 `device`。此路径保留给内部控制平面 RPC（例如子代理会话更新），用于避免
过期的 CLI／设备配对基线阻塞本地后端工作。远程客户端、浏览器来源客户端、节点客户端
以及明确使用设备令牌／设备身份的客户端，仍然需要经过正常的配对和范围升级检查。

### Worker 角色与封闭协议

Workers 通过主 TLS 端点上的公共
`/__openclaw__/worker` WebSocket 路径，或通过由 Gateway 所有并固定主机密钥的 SSH 隧道到达的专用
回环入口，使用封闭协议。该路由会在读取帧之前选择 worker 模式，因此绝不会分派
常规身份验证、节点事件、operator RPC 或插件方法。公共接入共享每客户端预认证预算和身份验证速率限制器；
其线路错误会将凭据和环境详情合并为
`admission-rejected`，而受信任的 Gateway 诊断会保留内部原因。严格的
`connect` 会验证一个在静态存储时经过哈希处理的短期凭据，该凭据绑定到环境、bundle 哈希、所有者纪元、
RPC 集版本、过期时间以及一个可为空的会话；它还会单独检查当前版本和功能集。
成功后返回最小化的 `worker-hello-ok`；功能协商独立于常规协议版本。帧大小保持在 64 KiB 以下，
但经协商的 `worker.inference.start` 帧最大可达 25 MiB。封闭允许列表包含
`worker.heartbeat`、`worker.transcript.commit`、`worker.live-event`、
`worker.inference.start` 和 `worker.inference.cancel`。

Transcript 提交使用 owner-epoch fencing、Gateway 所有的会话绑定、base-leaf
compare-and-swap 以及持久化序列重放；Gateway 通过常规会话写入器生成 transcript
条目 ID 和父级 ID。每次 RPC 都会重新检查所有权和过期状态。

### 客户端能力

Operator 客户端可以在 `connect.params.caps` 中公布可选能力：

- `tool-events`：接受结构化的工具生命周期事件。
- `inline-widgets`：能够渲染托管的内联 widget 工具结果。

客户端能力描述的是已连接的客户端，而不是授权。Agent 工具可以声明所需能力；
只有当发起客户端的 `caps` 中包含每项要求时，Gateway 才会提供这些工具。由 Channel
发起的运行没有 Gateway 客户端能力，因此即使工具策略明确允许，受能力限制的工具
仍然不可用。

### Node 连接示例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 4,
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

节点在连接时声明能力声明：

- `caps`：高级类别，例如 `camera`、`canvas`、`screen`、
  `location`、`voice`、`talk`。
- `commands`：用于 invoke 的命令允许列表。
- `permissions`：细粒度开关（例如 `screen.record`、`camera.capture`）。

Gateway 将这些内容视为声明，并在服务器端强制执行允许列表。

## 角色和作用域

有关完整的 operator scope 模型、审批时检查以及共享密钥语义，请参见 [Operator scopes](/gateway/operator-scopes)。

角色：

- `operator`：控制平面客户端（CLI/UI/自动化）。
- `node`：能力主机（camera/screen/canvas/system.run）。
- `worker`：在专用、封闭的 worker protocol 上运行的云执行主机。

Operator scopes（`src/gateway/operator-scopes.ts`），完整的封闭集合：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk`
- `operator.talk.secrets`

为兼容现有客户端，`operator.write` 仍然满足 `operator.talk`。语音设备设置可以签发更窄的 Talk 授权，而无需常规的 Gateway 写入权限。

`talk.config` 搭配 `includeSecrets: true` 时，需要 `operator.talk.secrets`（或
`operator.admin`）。包含密钥时，请从 `talk.resolved.config.apiKey` 读取当前生效的 Talk 提供商凭据；`talk.providers.<id>.apiKey`
保持源形态，可能是 SecretRef 对象或已脱敏字符串。

插件注册的 Gateway RPC 方法可以请求自己的 operator scope，但以下保留的核心前缀始终解析为
`operator.admin`（`src/shared/gateway-method-policy.ts`）：`config.*`、`exec.approvals.*`、
`wizard.*`、`update.*`。

方法 scope 只是第一道关卡。某些通过
`chat.send` 到达的斜杠命令会应用更严格的命令级检查：持久化的 `/config set` 和 `/config unset` 写入操作，即使对于已经持有较低 operator scope 的 Gateway 客户端，也需要 `operator.admin`。

`node.pair.approve` 在基础方法 scope（`operator.pairing`）之上，还会在审批时根据待处理请求声明的
`commands`（`src/infra/node-pairing-authz.ts`）进行额外的 scope 检查：

| 声明的命令                                                                                                                                        | 所需作用域                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| 无                                                                                                                                                     | `operator.pairing`                    |
| 普通命令                                                                                                                                        | `operator.pairing` + `operator.write` |
| 包含 `system.run`、`system.run.prepare`、`system.which`、`browser.proxy`、`browser.proxy.upload.v1`、`fs.listDir` 或 `system.execApprovals.get/set` | `operator.pairing` + `operator.admin` |

### 能力／命令／权限（node）

节点在连接时声明能力声明：

- `caps`：高层能力类别，例如 `camera`、`canvas`、`screen`、
  `location`、`voice` 和 `talk`。
- `commands`：用于 invoke 的命令允许列表。
- `permissions`：细粒度开关（例如 `screen.record`、`camera.capture`）。

Gateway 将这些视为**声明**，并在服务器端强制执行允许列表。
已连接的节点可以在成功连接或重新连接后，通过 `node.pluginTools.update` 发布可选的 agent 可见插件或 MCP 工具
描述符。无头节点主机会重启，以应用声明式 MCP 清单变更。此更新方法是唯一的发布路径；插件工具描述符不接受在
`connect` 参数中传入。每个描述符必须使用对提供商安全的工具 `name`，并指定节点当前命令允许列表中的一个
`command`。Gateway 信任已配对节点提供的描述符元数据，过滤掉超出已批准命令范围的描述符，在节点断开连接时移除它们，并拒绝 operator 试图修改其他节点目录的操作。设置
`gateway.nodes.pluginTools.enabled: false` 可忽略节点发布的描述符。

已连接的节点主机会通过
`node.skills.update` 发布其完整的技能替换目录。此 node 角色方法是唯一的节点技能发布路径；技能不接受在
`connect` 参数中传入。每个描述符都包含安全名称、描述以及有界的 `SKILL.md` 内容。Gateway 使用常规技能加载器解析该
内容，在节点连接期间将其包含在 agent 技能快照中，并在断开连接时将其移除。设置
`gateway.nodes.allowSkills: false` 可忽略节点发布的技能。

## 在线状态

- `system-presence` 返回按设备身份键控的条目，包括
  `deviceId`、`roles` 和 `scopes`，因此即使设备同时以 operator 和 node 身份连接，
  UI 也可以为每台设备显示一行。
- `node.list` 包含可选的 `lastSeenAtMs` 和 `lastSeenReason`。已连接的节点会以
  `connect` 作为原因，报告当前连接时间；已配对的节点还可以通过受信任的节点事件
  报告持久的后台在线状态。

原生 macOS 节点还可以发送带有受限输入空闲时间的、经过身份验证的
`node.presence.activity` 事件。Gateway 使用自身的时钟推导活动时间戳，通过
`node.list` 和 `node.describe` 暴露最近活动的已连接 Mac，并向具有读取范围权限的客户端广播
`node.presence` 更新。
当用户禁用活动共享时，app 会发送 `{ "action": "clear" }`；Gateway 仅为该经过身份验证的节点连接清除时间戳。
早于此确认操作的 Gateway 会将其作为未处理操作返回，因此 Mac 节点会重新连接一次，并让断开连接清理逻辑移除旧的连接状态。
有关选择、隐私、模型上下文和通知路由行为，请参阅[活跃计算机在线状态](/nodes/presence)。

### 节点后台存活事件

节点调用 `node.event`，并将 `event` 设置为 `node.presence.alive`，以记录已配对节点在后台唤醒期间处于存活状态，而不将其标记为已连接：

```json
{
  "event": "node.presence.alive",
  "payloadJSON": "{\"trigger\":\"silent_push\",\"sentAtMs\":1737264000000,\"displayName\":\"Peter's iPhone\",\"version\":\"2026.4.28\",\"platform\":\"iOS 18.4.0\",\"deviceFamily\":\"iPhone\",\"modelIdentifier\":\"iPhone17,1\",\"pushTransport\":\"relay\"}"
}
```

`trigger` 是一个封闭枚举：`background`、`silent_push`、`bg_app_refresh`、
`significant_location`、`manual`、`connect`。未知值会规范化为
`background`（`src/shared/node-presence.ts`）。该事件仅会为经过身份验证的节点设备会话持久化；无设备或未配对的会话会返回
`handled: false`。

成功的网关会返回结构化结果：

```json
{
  "ok": true,
  "event": "node.presence.alive",
  "handled": true,
  "reason": "persisted"
}
```

较旧的网关可能只会为 `node.event` 返回 `{ "ok": true }`；应将其视为已确认的 RPC，而不是持久化的在线状态。

## 广播事件作用域

服务器推送的广播事件受作用域限制，因此配对作用域或仅限节点的
会话不会被动接收会话内容
（`src/gateway/server-broadcast.ts`）：

- 聊天、代理和工具结果帧（流式传输的 `agent` 事件、工具结果
  事件）至少需要 `operator.read`。不具备该作用域的会话会完全跳过
  这些帧。
- 默认情况下，插件定义的 `plugin.*` 广播受限于 `operator.write` 或
  `operator.admin`；`plugin.approval.requested` /
  `plugin.approval.resolved` 等显式条目则使用
  `operator.approvals`。
- 状态／传输事件（`heartbeat`、`presence`、`tick`、连接／断开
  生命周期）保持不受限制，以便每个已认证会话都能观察传输健康状况。
- 未知的广播事件族默认受作用域限制（故障关闭），除非已注册的处理程序
  明确放宽限制。

每个客户端连接都维护自己的客户端序列号，因此即使不同客户端看到的事件流子集因作用域过滤而不同，广播在各自的套接字上仍会保持单调有序。

## RPC 方法系列

`hello-ok.features.methods` 是一个保守的发现列表，由
`src/gateway/server-methods-list.ts` 以及已加载的插件／频道方法
导出构成——它不是所有方法的生成式转储，并且某些方法（例如
`push.test`、`web.login.start`、`web.login.wait`、` sessions.usage`）
即使是真实且可调用的方法，也会被有意排除在发现列表之外。请将其视为功能发现列表，而不是对
`src/gateway/server-methods/*.ts` 的完整枚举。

<AccordionGroup>
  <Accordion title="系统与身份">
    - `health` 返回缓存的或刚刚探测的网关健康状态快照。
    - `diagnostics.stability` 返回近期有界诊断稳定性记录器：事件名称、计数、字节大小、内存读数、队列／会话状态、频道／插件名称、会话 ID。不包含聊天文本、Webhook 正文、工具输出、原始请求／响应正文、令牌、Cookie 或机密信息。需要 `operator.read`。
    - `status` 返回 `/status` 风格的网关摘要；敏感字段仅对管理员范围的操作员客户端返回。
    - `gateway.identity.get` 返回中继和配对流程使用的网关设备身份。
    - `system-presence` 返回已连接操作员／节点设备的当前在线状态快照。
    - `system-event` 追加系统事件，并可以更新／广播在线状态上下文。
    - `last-heartbeat` 返回最新持久化的心跳事件。
    - `set-heartbeats` 切换网关上的心跳处理。
    - `gateway.restart.preflight` 是已弃用的、只读的重启专用活动工作兼容性预览。它不会关闭接入、创建暂停租约，也不会提供 `gateway.suspend.prepare` 的原子完整工作围栏；新的重启流程应调用 `gateway.restart.request`。
    - `gateway.suspend.prepare` 仅在跟踪的 Gateway 工作处于空闲状态时创建一个短期协作暂停租约。准备期间，经过身份验证的 WebSocket 连接仍可用，但除 `gateway.suspend.*` 外的每个方法都会受到围栏限制。`gateway.suspend.status` 检查租约，`gateway.suspend.resume` 则在解冻或主机操作中止后释放租约。

  </Accordion>

  <Accordion title="模型与用量">
    - `models.list` 返回运行时允许的模型目录。请参阅下文的“`models.list` 视图”。
    - `usage.status` 返回提供商用量窗口／剩余配额摘要。
    - `usage.cost` 返回指定日期范围的聚合成本用量摘要。传入 `agentId` 可查询单个代理，或传入 `agentScope: "all"` 聚合已配置的代理。
    - `doctor.memory.status` 返回当前默认代理工作区的向量记忆／缓存嵌入就绪状态。仅在明确需要实时嵌入提供商 ping 时传入 `{ "probe": true }` 或 `{ "deep": true }`。传入 `{ "agentId": "agent-id" }` 可将 Dreaming 存储统计限定到一个代理工作区；省略时则聚合已配置的 Dreaming 工作区。
    - `doctor.memory.dreamDiary`、`doctor.memory.backfillDreamDiary`、`doctor.memory.resetDreamDiary`、`doctor.memory.resetGroundedShortTerm`、`doctor.memory.repairDreamingArtifacts` 和 `doctor.memory.dedupeDreamDiary` 接受可选的 `{ "agentId": "agent-id" }`；省略时，它们作用于已配置的默认代理工作区。
    - `sessions.usage` 返回每个会话的用量摘要。传入 `agentId` 可查询单个代理，或传入 `agentScope: "all"` 一并列出已配置的代理。
      两种用量方法都接受带有 IANA `timeZone` 的 `mode: "specific"`，用于支持 DST 的日历日边界和分桶。旧客户端仍可使用 `utcOffset`；当网关运行时无法识别所请求的时区时，`utcOffset` 也会作为回退方案。
    - `sessions.usage.timeseries` 返回单个会话的时序用量。
    - `sessions.usage.logs` 返回单个会话的用量日志条目。

  </Accordion>

  <Accordion title="频道与登录辅助功能">
    - `channels.status` 返回内置频道以及捆绑频道／插件的状态摘要。
    - `channels.logout` 在频道支持的情况下退出指定频道／账户。
    - `web.login.start` 为当前支持 QR 的 Web 频道提供商启动 QR／Web 登录流程。
    - `web.login.wait` 等待该流程完成，并在成功后启动频道。
    - `push.test` 向已注册的 iOS 节点发送测试 APNs 推送。
    - `voicewake.get` 返回已存储的唤醒词触发器。
    - `voicewake.set` 更新唤醒词触发器并广播变更。

  </Accordion>

  <Accordion title="插件管理">
    - `plugins.list`（`operator.read`）返回已安装的插件清单，以及本地整理的官方推荐项、诊断信息和当前安装模式是否允许变更。
    - `plugins.search`（`operator.read`）搜索可安装的 ClawHub 代码插件和捆绑插件系列。传入非空的 `query`，以及可选的 1 到 100 之间的 `limit`。
    - `plugins.install`（`operator.admin`）可以通过 `{ source: "official", pluginId }` 安装官方目录条目，或通过 `{ source: "clawhub", packageName, version?, acknowledgeClawHubRisk? }` 安装 ClawHub 软件包。ClawHub 安装会保留网关信任、完整性和安装策略检查。安装成功后需要重启网关。
    - `plugins.setEnabled`（`operator.admin`）通过 `{ pluginId, enabled }` 更改一个已安装插件的启用策略。响应包括更新后的目录条目、重启元数据以及任何槽位选择警告。
    - `plugins.uninstall`（`operator.admin`）通过 `{ pluginId }` 移除一个外部安装的插件，包括配置引用、安装记录和受管理文件。捆绑插件无法卸载，只能禁用。响应会列出移除操作，并始终需要重启网关。

  </Accordion>

  <Accordion title="消息与日志">
    - `send` 是聊天运行器之外、面向频道／账户／线程目标发送消息的直接出站传递 RPC。
    - `logs.tail` 返回已配置的网关文件日志尾部内容，并支持游标／限制和最大字节数控制。

  </Accordion>

  <Accordion title="操作员终端">
    - `terminal.open` 为明确指定的 `agentId` 或默认代理启动主机 PTY，并返回解析后的代理、工作目录、Shell 和隔离状态。
    - `terminal.input` 和 `terminal.resize` 操作由调用连接拥有的会话，以及该连接作为附加查看者访问的代理拥有会话。`terminal.close` 会终止连接拥有的会话，但对于代理拥有的会话，只会将调用方查看者分离。
    - `terminal.upload` 接受一个最大 16 MiB 的 Base64 文件，将其暂存到会话网关或配对节点主机上的私有 24 小时临时目录中，并返回绝对路径。调用方仍必须粘贴或以其他方式使用该路径；该 RPC 从不写入终端输入或执行命令。
    - `terminal.data` 和 `terminal.exit` 事件会流式传输给连接所有者和附加查看者。当任务所属代理终端的权威任务达到终止状态时，该终端会关闭；普通对话所属的代理终端则保持持久状态。
    - 连接断开的会话会被分离而不是终止：在 `gateway.terminal.detachedSessionTimeoutSeconds` 指定的时间内仍可重新附加（默认值为 300；设置为 `0` 可恢复断开即终止），同时最近的输出会累积在有界的服务端缓冲区中。
    - `terminal.list` 返回可附加的会话；`terminal.attach` 将活动或已分离的会话重新绑定到调用连接，并返回回放缓冲区（类似 tmux 的接管行为——之前的活动所有者会收到原因是 `detached` 的 `terminal.exit`）。
    - 每个终端方法都需要 `operator.admin`；`gateway.terminal.enabled` 默认开启，设置为 `false` 时会拒绝所有方法。完全沙箱化的代理会被拒绝，代理策略变更会关闭现有和正在进行中的 PTY，包括已分离的 PTY。

  </Accordion>

  <Accordion title="Talk 与 TTS">
    - `talk.catalog` 返回只读的 Talk 提供商目录，用于语音、流式转录和实时语音：规范提供商 ID、注册表别名、标签、配置状态、可选的组级 `ready` 结果、公开的模型／语音 ID、规范模式、传输方式、brain 策略，以及实时音频／能力标志；不会返回提供商机密信息或修改全局配置。当前网关会在应用运行时提供商选择后设置 `ready`；在较旧网关上，应将其缺失视为未经验证。
    - `talk.config` 返回生效的 Talk 配置负载；`includeSecrets` 需要 `operator.talk.secrets`（或 `operator.admin`）。
    - `talk.session.create`（`operator.talk`）为 `realtime/gateway-relay`、`transcription/gateway-relay` 或 `stt-tts/managed-room` 创建由网关拥有的 Talk 会话。对于 `stt-tts/managed-room`，传入 `sessionKey` 的非管理员调用方还必须传入 `spawnedBy`，以获得受限的会话密钥可见性；无范围的 `sessionKey` 创建以及 `brain: "direct-tools"` 需要 `operator.admin`。
    - `talk.session.appendAudio` 将 Base64 PCM 输入音频追加到由网关拥有的实时中继和转录会话。
    - `talk.session.cancelOutput` 停止助手音频输出，主要用于网关中继会话中由 VAD 控制的插话。
    - `talk.session.submitToolResult` 完成由网关拥有的实时中继会话发出的提供商工具调用。请求会等待提供商桥接层公开的任何异步完成信号；提交失败会使关联运行保持活动状态，并且不会发出成功的工具结果事件。当需要中间工具输出时传入 `options: { willContinue: true }`；当提供商桥接层声明支持抑制，且结果不应启动另一个响应时，传入 `options: { suppressResponse: true }`。
    - `talk.session.steer` 向由代理支持的网关 Talk 会话发送活动运行的语音控制：`{ sessionId, text, mode? }`，其中 `mode` 可以是 `status`、`steer`、`cancel` 或 `followup`；省略模式时，会根据口述文本进行分类。
    - `talk.session.close` 关闭由网关拥有的中继、转录或 managed-room 会话，并发出终止 Talk 事件。
    - `talk.mode` 为 WebChat／Control UI 客户端设置／广播当前 Talk 模式状态。
    - `talk.client.create` 使用 `webrtc` 或 `provider-websocket` 创建或恢复由客户端拥有的实时提供商会话，同时由网关拥有凭据、指令、工具策略和返回的 `voiceSessionId`。在一次通话期间，客户端传入 `sessionKey`，并在替换提供商传输方式时复用 `voiceSessionId`。协商 `gateway-control-v1` 的客户端会保持 WebRTC 媒体直连，但将提供商控制通道和工具生命周期移交给网关。
    - `talk.client.transcript` 向普通代理会话追加一个最终确定的 `{ role, text }` 条目。必需的 `entryId` 在 `voiceSessionId` 内具有幂等性；重试不会重复转录消息。
    - `talk.client.close` 在待处理的转录写入完成后关闭逻辑语音会话。关闭操作具有幂等性，并可能向该会话最近使用的非 WebChat 频道发送仅包含变更的通话摘要。
    - `talk.client.toolCall` 允许客户端拥有的实时传输方式将提供商工具调用转发给网关策略。第一个受支持的工具是 `openclaw_agent_consult`；客户端会获取运行 ID，并等待普通聊天生命周期事件，然后再提交提供商专用的工具结果。绑定语音的高影响操作会返回 `VOICE_CONFIRMATION_REQUIRED:<id>`，直到稍后的最终用户话语明确确认该确切的最终执行操作，并且下一次 consult 提供 `confirmationId`；策略或钩子重写会再次要求确认。
    - `talk.client.steer` 为客户端拥有的实时传输发送活动运行的语音控制。网关从 `sessionKey` 解析活动嵌入式运行，并返回结构化的已接受／已拒绝结果，而不是静默丢弃控制。
    - `talk.event` 是实时、转录、STT／TTS、managed-room、电话和会议适配器共用的 Talk 事件通道。
    - `talk.speak` 通过活动 Talk 语音提供商合成语音。
    - `tts.status` 返回 TTS 启用状态、活动提供商、回退提供商和提供商配置状态。
    - `tts.providers` 返回可见的 TTS 提供商清单。
    - `tts.enable` 和 `tts.disable` 切换 TTS 偏好状态。
    - `tts.setProvider` 更新首选 TTS 提供商。
    - `tts.convert` 执行一次性文本转语音转换。
    - `tts.speak`（`operator.write`）使用已配置的通用 TTS 提供商链渲染非空的 `text`，并以内联的 `audioBase64` 形式返回一个完整音频片段，以及 `provider` 和可选的 `outputFormat`、`mimeType`、`fileExtension` 元数据。与 `tts.convert` 不同，它不会返回网关本地路径；与 `talk.speak` 不同，它不需要 Talk 提供商。超过 `tts.maxTextLength` 的文本返回 `INVALID_REQUEST`；合成失败返回 `UNAVAILABLE`。

  </Accordion>

  <Accordion title="机密、配置、更新与向导">
    - `secrets.reload` 重新解析活动的 SecretRef，并以原子方式发布所有者感知的运行时状态。符合条件的所有者失败可以作为冷或陈旧降级发布，并带有 `warningCount`；严格或未映射的失败会拒绝重新加载并保留活动快照。
    - `secrets.resolve` 为特定的命令／目标集合解析命令目标机密分配。
    - `secrets.store.list`（`operator.admin`）返回团队范围的元数据，并仅对 `kind: "env"` 条目返回值。`kind: "secret"` 条目使用不含值字段的独立结果结构；没有显示方法。
    - `secrets.store.set` 和 `secrets.store.delete`（`operator.admin`）创建／更新或软删除一个团队范围的条目。成功写入后，仅当名称被活动源配置中的 `store` SecretRef 引用时，网关才会刷新活动机密运行时。
    - `config.get` 返回当前磁盘上的配置快照、原始根文件 `hash`、解析后的 `configRevisionHash`，以及可选的 `appliedConfigHash`，后者对应活动网关运行时接受的已解析版本。
    - `config.set` 写入经过验证的配置负载。
    - `config.patch` 合并部分配置更新。破坏性的数组替换要求受影响路径位于 `replacePaths` 中；数组条目下的嵌套数组使用 `[]` 路径，例如 `agents.entries.*.skills`。
    - `config.apply` 验证并替换完整配置负载。
    - `config.schema` 返回 Control UI 和 CLI 工具使用的实时配置模式负载：模式、`uiHints`、版本、生成元数据，以及可加载时的插件和频道模式元数据。它包含与 UI 相同的标签／帮助文本中的 `title`／`description` 元数据，包括嵌套对象、通配符、数组项，以及存在匹配字段文档时的 `anyOf`／`oneOf`／`allOf` 组合分支。
    - `config.schema.lookup` 返回单个配置路径的路径范围查找负载：规范化路径、浅层模式节点、匹配的提示及 `hintPath`、可选的 `reloadKind`，以及供 UI／CLI 逐层查看的直接子项摘要。`reloadKind` 为 `restart`、`hot` 或 `none` 之一（`src/config/schema.ts`），并反映网关配置重新加载规划器针对所请求路径的规划。查找模式节点保留面向用户的文档和常见验证字段（`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、数值／字符串／数组／对象边界、`additionalProperties`、`deprecated`、`readOnly`、`writeOnly`）。子项摘要公开 `key`、规范化的 `path`、`type`、`required`、`hasChildren`、可选的 `reloadKind`，以及匹配的 `hint`／`hintPath`。
    - `update.run` 运行网关更新流程，并仅在更新成功时安排重启；拥有会话的调用方可以包含 `continuationMessage`，使启动过程通过重启继续队列恢复一次后续代理轮次。控制平面中的包管理器更新和受监管的 Git 检出更新使用分离的受管理服务交接，而不是替换包树，或在活动网关内部修改检出／构建输出。已启动的交接返回 `ok: true`，其中 `result.reason: "managed-service-handoff-started"` 且 `handoff.status: "started"`。由同一网关进程处理的第二个并发 `update.run` 返回 `ok: false`，其中 `result.reason: "managed-service-handoff-already-running"` 且 `handoff.status: "already-running"`；其继续操作不会被接受，因此调用方可以在活动更新完成后重试。独立 CLI 更新器和替换网关进程不受此进程内保护机制约束。不可用或失败的交接返回 `ok: false`，其中包含 `managed-service-handoff-unavailable` 或 `managed-service-handoff-failed`；当需要手动 Shell 更新时，还会返回 `handoff.command`。不可用意味着 OpenClaw 缺少安全的监管边界或持久服务身份，例如 systemd 所需的 `OPENCLAW_SYSTEMD_UNIT`。在已启动的交接期间，重启哨兵可能会短暂报告 `stats.reason: "restart-health-pending"`；继续操作会延迟到 CLI 验证重启后的网关并写入最终 `ok` 哨兵之后。
    - `update.status` 刷新并返回最新的更新重启哨兵，包括可用时的重启后运行版本。
    - `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 通过 WS RPC 提供入门向导。

  </Accordion>

  <Accordion title="代理与工作区辅助功能">
    - `agents.list` 返回网关可见的代理条目，包括生效的模型／运行时元数据和可选的语义 `kind`（`agent` 或 `system`）。客户端在握手时声明 `agent-kind` 能力后，可接收完整的类型化代理清单；不具备该能力的客户端仍获得不含系统行的、对选择器安全的传统清单。具备类型感知能力的客户端会从普通选择器中排除 `system` 行，但在诊断视图中保留它们。较旧的 v4 网关可能返回不带 `kind` 的行。
    - `agents.create`、`agents.update` 和 `agents.delete` 管理代理记录及工作区连接。
    - `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理为代理公开的引导工作区文件。
    - `audit.activity.list` 返回带版本的、仅包含元数据的活动账本；`audit.run.inspect` 发现执行 ID 或检查一个确切的执行身份上下文；`audit.list` 仍是兼容性安全的运行／工具 RPC。
    - `agents.workspace.list` 和 `agents.workspace.get`（`operator.read`）为位于 [操作员范围](/gateway/operator-scopes) 所述可信操作员域中的客户端，提供代理工作区目录的只读分页浏览。请求仅接受相对于工作区的路径；读取始终限制在真实路径化的工作区根目录内（拒绝符号链接和硬链接逃逸）、有大小上限，并仅支持 UTF-8 文本和常见图像类型（Base64）。响应不会公开主机工作区路径。此命名空间中没有写操作。
    - `tasks.list`、`tasks.get` 和 `tasks.cancel` 向 SDK 和操作员客户端公开网关任务账本。请参阅下文的[任务账本 RPC](#task-ledger-rpcs)。
    - `artifacts.list`、`artifacts.get` 和 `artifacts.download` 为明确的 `sessionKey`、`runId` 或 `taskId` 范围公开从转录派生的工件摘要和下载。运行和任务查询会在服务端解析所属会话，并且只返回来源匹配的转录媒体；不安全或本地 URL 源会返回不受支持的下载，而不是由服务端获取。
    - `environments.list` 和 `environments.status` 即使没有云工作者配置文件也仍可用，并保留网关本地和节点环境发现。已配置的云工作者以及早期配置文件留下的持久记录会添加带有 `providerId`、可选的 `leaseId`、`state`、`ageMs`、可选的 `idleMs` 和 `attachedSessionIds` 的 `worker` 元数据。工作者生命周期状态包括 `requested`、`provisioning`、`bootstrapping`、`ready`、`attached`、`idle`、`draining`、`destroying`、`destroyed`、`failed` 和 `orphaned`。
    - `environments.create`（`{ profileId, idempotencyKey }`）从已配置的插件提供商配置文件中配置一个工作者；使用相同密钥重试时会复用持久操作。`environments.destroy`（`{ environmentId }`）请求对持久工作者环境进行幂等拆除。两者都需要 `operator.admin`，属于控制平面写入，并返回与状态响应相同的环境摘要结构。
    - `worker.desktop.observe`（`{ environmentId, control? }`、`operator.admin`）启动或复用环境的桌面转发，并返回 `{ transport, wsPath, expiresAtMs, control, vncPassword? }`。`wsPath` 携带一个供网关桌面观察者 WebSocket 使用的、一次性且有效期为 60 秒的令牌；重新连接需要新的 observe 调用。具有可观察桌面的环境会在 `environments.list` 中公布 `worker.desktop: true`。仅当启用 `cloudWorkers.desktop` lab 时才会公布该方法。请参阅[云工作者](/gateway/cloud-workers#desktop-interactive)。
    - `agent.identity.get` 返回代理或会话的生效助手身份。
    - `agent.wait` 等待一次运行完成，并在可用时返回终止快照。

  </Accordion>

  <Accordion title="会话控制">
    - `sessions.list` 返回当前会话索引；当配置了代理运行时后端时，还会包含每行的 `agentRuntime` 元数据。当启用云工作者放置或存在持久恢复状态时，会话行还会包含一个封闭的 `placement` 状态（`local`、`requested`、`provisioning`、`syncing`、`starting`、`active`、`draining`、`reconciling`、`reclaimed` 或 `failed`），以及特定于状态的环境、所有者纪元、工作区、捆绑包、ACK 游标或恢复字段。
    - `sessions.subscribe` 为当前 WebSocket 客户端启用会话变更事件。该客户端断开连接时订阅结束。
    - `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切换某个会话的转录／消息事件订阅。传入 `includeApprovals: true` 后，还会接收经过清理的 `session.approval` 生命周期事件，前提是这些审批的持久化受众包含该确切会话，且其审核者绑定授权订阅客户端。订阅响应随后会包含有界的待处理 `approvalReplay`；当 `truncated` 为 false 时，它具有权威性。该选择加入项按每次订阅调用生效，不会持久保持：重新订阅同一会话时不传入 `includeApprovals: true`，会移除现有的审批订阅。除正常的会话读取权限外，该选择加入项还需要 `operator.admin`，或配对设备上的 `operator.approvals`。
    - `sessions.preview` 返回特定会话密钥的有界转录预览。
    - `sessions.describe` 返回精确会话密钥对应的一行网关会话记录。
    - `sessions.resolve` 根据密钥、原始会话 ID、标签或 Control UI 短 ID 解析或规范化会话目标。含糊的短 ID 会作为成功的 RPC 结果返回有界候选列表。
    - `sessions.create` 创建新的会话条目。可选的 `model` 和 `thinkingLevel` 值会以原子方式持久化初始模型和推理覆盖项。`worktree: true` 会配置受管理的工作树；可选的 `worktreeBaseRef`／`worktreeName` 选择基础引用和分支名称，而 `execNode`（`operator.admin`）将会话执行绑定到节点主机。不传入 `worktreeName` 时，OpenClaw 会根据会话标签或生成的首条消息标题派生可读名称，之后回退到甲壳类主题名称；已被其他所有者、本地分支或非受管理路径占用的名称会获得数字后缀。创建的工作树会在结果中回显，并持久化到会话行（`worktree: { id, branch, repoRoot }`）。当条目已创建但其嵌套的初始 `chat.send` 被拒绝时，成功结果会包含 `runStarted: false` 和 `runError`；客户端可以保留提示，并针对返回的会话密钥重试。传入 `parentSessionKey` 且 `emitCommandHooks: true` 的调用方还应声明独立子会话的生命周期处置：`succeedsParent: true` 会以 `session_end` 结束父会话，而 `false` 会保持父会话活动状态并仅发出子会话的 `session_start`。省略 `succeedsParent` 会为现有客户端保留旧的父会话轮换行为。该处置要求同时具备父会话关联和命令钩子；分叉不能成功结束其父会话。主会话原地重置行为不变，因为不会创建独立子会话。新行会从受信任的创建入口写入一次性创建来源（`createdVia`、`createdActor`、`createdAt`）；采用现有密钥时不会重新写入。对于人类配置文件操作员，投影行时会根据当前用户配置文件解析 `createdActor.label`，不会将其存储在会话条目中，因此配置文件重命名不会产生漂移。会话行还携带 `parentSessionKey`（导航父项，持久化）、`controlOwnerSessionKey`（运行时控制器，处于活动状态时）、`forkSource`（分叉的精确源密钥及转录生成版本）以及 `previousSessionId`（相同密钥下的先前转录生成版本）。
    - `sessions.dispatch`（`operator.admin`）将一个现有的本地 OpenClaw 会话（该会话具有活动的、由注册表拥有的会话受管理工作树）迁移到已配置的云工作者配置文件。传入 `{ key, profileId, agentId? }`。未配置工作者配置文件时，Gateway 不会公布该方法。Dispatch 会在排空活动工作前关闭本地轮次接入，并仅在放置达到活动工作者所有权后返回。任意普通目录不可进行 dispatch；接入后，如果受管理工作树的 Git 元数据变得不可用，工作区传输可以使用清单镜像。SSH 回退候选项仅针对幂等探测、内容寻址传输、受回执／锁保护的工件安装、收敛式受管理工作树镜像和隧道重连进行轮换。含糊且未受保护的有状态命令会安全失败，不会重放。Dispatch 是单向的；工作者到本地的拉回不属于此 RPC。
    - `sessions.groups.list`、`sessions.groups.put`、`sessions.groups.rename` 和 `sessions.groups.delete` 管理由网关拥有的自定义会话组目录（名称及显示顺序）。成员关系保留在每个会话的 `category` 字段中；重命名和删除会在服务端更新成员会话。
    - `sessions.send` 向现有会话发送消息。
    - `sessions.steer` 是活动会话的中断并引导变体。
    - `sessions.abort` 中止会话的活动工作。传入 `key` 以及可选的 `runId`，或仅传入 `runId` 以处理网关可以解析到会话的活动运行。提供 `runId` 会使取消范围限定在该运行。对仅按密钥且非全局的请求设置 `clearQueued: true`，还会丢弃由该会话拥有的后续队列和通道队列。省略 `clearQueued` 的现有调用方会保留这些队列。字面值为 `global` 的密钥保留现有的、按代理限定的 `chat.abort` 所有权规则，不会执行非全局后续队列或通道队列清理。
    - `sessions.patch` 更新会话元数据／覆盖项，并报告解析后的规范模型以及生效的 `agentRuntime`。会话组织字段和每会话 `model` 覆盖项需要 `operator.write`；思考、快速、详细、跟踪、推理和其他特权覆盖项需要 `operator.admin`。只有管理员进行的模型选择才能持久化为已配置的代理默认值。归档和恢复补丁要求调用方将从 `sessions.list` 或 `sessions.describe` 观察到的会话 `sessionId` 作为 `expectedSessionId`；缺失或已更改的目标会在不实例化或修改替代项的情况下失败。设置 `archived: true` 时，Gateway 会保护代理主会话（包括配置了全局范围时的 `global`）和 `unknown` 哨兵；对于其他每个真实会话，它会先围栏限制新的接入，取消精确会话的活动、待处理、排队、回复、嵌入式和工作者工作，并等待接入和运行时终止持久化排空后再提交 `archivedAt`。取消、排空或持久化失败会返回可重试的 `UNAVAILABLE`，并使会话保持未归档状态。`sessions.patchMany` 为每个目标携带 `expectedSessionId`，在同一批次生命周期围栏内按输入顺序准备归档目标，并返回按目标排序的结果。生成谱系（`spawnedBy`、`spawnedWorkspaceDir`、`spawnedCwd`、`spawnDepth`、`subagentRole`、`subagentControlScope`）不再可公开修改；这些事实由受信任的创建路径一次性写入，仍发送这些字段的请求会被拒绝。
    - `sessions.reset`、`sessions.delete` 和 `sessions.compact` 执行会话维护。
    - `sessions.get` 返回完整的已存储会话行。
    - 聊天执行仍使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。对于 UI 客户端，`chat.history` 会进行显示规范化：从可见文本中移除内联指令标签，移除纯文本工具调用 XML 负载（`<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及截断的工具调用块）和泄露的 ASCII／全角模型控制令牌，省略纯静默令牌的助手行（准确的 `NO_REPLY`／`no_reply`），并可将过大的行替换为占位符。
    - `chat.message.get` 是针对单个可见转录条目的附加有界完整消息读取器。传入 `sessionKey`，如果会话选择按代理限定，则可选传入 `agentId`，以及此前通过 `chat.history` 返回的转录 `messageId`；当存储条目仍可用且未过大时，网关会返回相同的显示规范化投影，但不受轻量级历史记录截断上限限制。
    - `chat.toolTitles` 返回在 Control UI 中呈现的工具调用的简短用途标题（批量处理，最多 24 项，输入有界）。该功能通过 `gateway.controlUi.toolTitles` 选择启用（默认关闭）；禁用的网关会返回 `{ titles: {}, disabled: true }`，不会调用模型，以便客户端停止请求。启用后，标题使用标准实用模型路由：优先使用明确配置的 `utilityModel`（该操作员决定与所有实用任务一样，可能会将有界任务内容发送给所选提供商），否则使用会话提供商声明的小模型默认值，因此不会隐式产生新的数据流出目的地；空的 `utilityModel` 会完全禁用标题。标题永远不会回退到主模型。结果会缓存在每个代理的状态数据库中，以工具名称和输入为键，因此重复查看不会对相同调用重复计费。
    - `chat.send` 接受单轮 `fastMode: "auto"`，以便对自动截止时间之前启动的模型调用使用快速模式，而之后启动的重试、回退、工具结果或继续调用不使用快速模式。截止时间默认为 60 秒（`DEFAULT_FAST_MODE_AUTO_ON_SECONDS`），并可通过 `agents.defaults.models["<provider>/<model>"].params.fastAutoOnSeconds` 按模型配置。`chat.send` 调用方可以传入单轮 `fastAutoOnSeconds`，以覆盖该请求的截止时间。传入 `queueMode`（`steer`、`followup`、`collect` 或 `interrupt`）可以仅为本次请求覆盖已存储的队列模式；明确的 Control UI 引导操作使用 `queueMode: "steer"`。现代客户端，尤其是会持久化或重试引导操作的客户端，还应传入当前的 `expectedRunId`；Gateway 会将其绑定到一个确切运行，使重试无法触达后继运行。旧式无目标的 `queueMode: "steer"` 请求仍仅作为绑定叶节点的兼容路径被接受：它们必须传入活动操作不可变的 `expectedLeafEntryId`（或者为权威空转录传入特意设置的 `null`），并且在无法证明叶节点、所有者、新鲜度或注入能力时可能以 `details.reason: "active-leaf-changed"` 拒绝。其他交互式发送可以传入 `expectedLeafEntryId`，以便在其他客户端先切换转录分支时拒绝。

  </Accordion>

  <Accordion title="设备配对与设备令牌">
    - `device.pair.list` 返回待处理和已批准的配对设备。
    - `device.pair.setupCode` 创建移动设备设置代码，默认情况下还会创建 PNG QR 数据 URL。它需要 `operator.admin`，并且有意不包含在公布的发现列表中。结果包括 `setupCode`、可选的 `qrDataUrl`、`gatewayUrl`、非机密的 `auth` 标签以及 `urlSource`。
    - `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理设备配对记录。
    - `device.pair.rename` 分配操作员标签（`{ deviceId, label }`），该标签优先于客户端报告的显示名称，并且在设备修复或重新批准后仍然保留。
    - `device.token.rotate` 在已批准的角色和调用方范围限制内轮换配对设备令牌。
    - `device.token.revoke` 在已批准的角色和调用方范围限制内撤销配对设备令牌。

    设置代码会嵌入短期引导凭据。客户端不得在配对流程之外记录或持久化该凭据。

  </Accordion>

  <Accordion title="节点配对、调用与待处理工作">
    - `node.pair.list`、`node.pair.approve`、`node.pair.reject` 和 `node.pair.remove` 处理节点能力批准。`node.pair.request` 和 `node.pair.verify` 已在 2026.7 中与独立节点配对存储一同移除；待处理请求由网关在节点连接期间创建。
    - `node.list` 和 `node.describe` 返回已知／已连接的节点状态。
    - `node.rename` 更新配对节点标签。
    - `node.invoke` 将命令转发给已连接的节点。
    - `node.invoke.result` 返回调用请求的结果。
    - `mcp.tools.call.v1` 是用于调用已配置节点本地 MCP 工具的无头节点主机命令。它通过 `node.invoke` 传输，要求节点声明该命令，并且仍受配对批准和 `gateway.nodes.commands.deny` 约束。
    - `node.event` 将节点发起的事件传回网关。
    - `node.pluginTools.update` 是替换已连接节点的代理可见插件／MCP 工具描述符的唯一发布路径；`connect` 参数不携带这些描述符。
    - `node.pending.pull` 和 `node.pending.ack` 是已连接节点的队列 API。
    - `node.pending.enqueue` 和 `node.pending.drain` 管理离线／断开节点的持久待处理工作。

  </Accordion>

  <Accordion title="审批系列">
    - `approval.history` 返回为 exec、插件和系统代理请求保留 30 天的、按最新优先排列的终止审批（范围为 `operator.approvals`）。它支持游标分页以及可选的类型筛选；待处理审批不是历史记录行。
    - `approval.get` 和 `approval.resolve` 是与类型无关的持久审批方法（范围为 `operator.approvals`）。`approval.get` 返回经过清理的待处理或保留终止投影，并带有稳定的 `urlPath`；`approval.resolve` 接受规范审批 ID、明确的 `kind` 和决定，采用先答复者获胜的解析方式，并始终返回已记录的规范结果。
    - `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 处理一次性 exec 审批请求以及待处理审批查找／回放。它们是同一持久审批注册表之上的协议边界适配器。
    - `exec.approval.waitDecision` 等待一个待处理的 exec 审批，并返回最终决定（超时时返回 `null`）。
    - `exec.approvals.get` 和 `exec.approvals.set` 管理网关 exec 审批策略快照。
    - `exec.approvals.node.get` 和 `exec.approvals.node.set` 通过节点中继命令管理节点本地 exec 审批策略。
    - `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 处理插件定义的审批流程。

  </Accordion>

  <Accordion title="Control UI 命令">
    - `ui.command` 允许 `operator.write` 调用方向声明 `ui-commands` 能力的已连接 Control UI 客户端发送类型化布局和导航命令。
    - 命令涵盖窗格拆分／关闭／聚焦、侧边栏可见性、终端／浏览器面板可见性和停靠，以及会话导航。
    - 协议 v1 会有意将命令扇出到每个已连接且具备能力的 Control UI。如果没有连接任何客户端，请求会失败并返回 `UNAVAILABLE`，而不是假装布局已经改变。

  </Accordion>

  <Accordion title="自动化、技能与工具">
    - 自动化：`wake` 安排立即或下一次心跳唤醒文本注入；`cron.get`、`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run`、`cron.runs` 管理计划任务。
    - `cron.run` 仍是用于手动运行的入队式 RPC。需要完成语义的客户端应读取返回的 `runId` 并轮询 `cron.runs`。
    - `cron.runs` 接受可选的非空 `runId` 筛选器，使客户端能够跟踪一个排队的手动运行，而无需与同一任务的其他历史条目竞争。
    - 技能与工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`、`tools.invoke`。请参阅下文的[操作员辅助方法](#operator-helper-methods)。

  </Accordion>
</AccordionGroup>

### 常见事件族

- `chat`：UI 聊天更新，例如 `chat.inject` 以及其他仅限聊天记录的
  事件。在 protocol v4 中，增量负载携带 `deltaText`；`message` 仍然是
  累积的 assistant 快照。非前缀替换会设置 `replace=true`，并使用
  `deltaText` 作为替换文本。
- `session.message`、`session.operation`、`session.tool`：已订阅会话的聊天记录、进行中的
  会话操作以及事件流更新。
- `session.approval`：针对明确选择加入的精确会话订阅者，提供经过清理的待处理和终止审批事实。子审批使用
  持久化的祖先受众；事件不会修改聊天记录或唤醒代理。
- `session.observer`：安全的实时会话标题和状态摘要。模型编写的
  前导文本可以立即更新标题；实用模型的评估结果可用后会替换该标题。Web、iOS 和 Android 使用相同的运行范围摘要。
- `sessions.changed`：会话索引或元数据已更改。
- `presence`：系统在线状态快照更新。
- `tick`：定期的保活／存活事件。
- `health`：网关健康状态快照更新。
- `heartbeat`：心跳事件流更新。
- `cron`：cron 运行／作业变更事件。
- `shutdown`：网关关闭通知。
- `node.pair.requested`／`node.pair.resolved`：节点配对生命周期。
- `node.invoke.request`：节点调用请求广播。
- `device.pair.requested`／`device.pair.resolved`：已配对设备生命周期。
- `voicewake.changed`：唤醒词触发配置已更改。
- `config.changed`：配置写入已持久化（负载携带配置路径、新快照哈希和时间戳——从不携带配置内容）。按操作员读取范围限定；客户端通过
  `config.get` 刷新。
- `skills.changed`：网关使其技能快照失效后，连接状态、技能目录、配置或资格状态发生了变化。负载中的
  `reason` 可以是 `watch`、`watch-targets`、`manual`、`remote-node`、
  `config-change` 或 `workshop`。按操作员读取范围限定；客户端通过
  `skills.status` 刷新。
- `exec.approval.requested`／`exec.approval.resolved`：exec 审批
  生命周期。
- `plugin.approval.requested`／`plugin.approval.resolved`：plugin 审批
  生命周期。

### 节点助手方法

节点可以调用 `skills.bins`，以获取当前技能可执行文件列表，用于自动允许检查。

## 审计账本 RPC

`audit.activity.list` 为 operator 客户端提供 agent 运行、工具操作和选择加入的消息生命周期元数据的稳定最新优先视图。它要求
`operator.read`。查询会排除早于 30 天的记录，共享 SQLite ledger 的上限为 100,000 条记录。过期行会在 Gateway
启动、每小时维护以及后续写入期间删除。有关数据模型和隐私语义，请参阅
[Audit history](/gateway/audit)。

- 参数：可选的精确 `agentId`、`sessionKey` 或 `runId`；可选的 `kind`
  （`"agent_run"`、`"tool_action"` 或 `"message"`）；可选的 `status`
  （`"started"`、`"succeeded"`、`"failed"`、`"cancelled"`、`"timed_out"`、
  `"blocked"` 或 `"unknown"`）；可选的消息 `direction`（`"inbound"` 或
  `"outbound"`）和精确 `channel`；可选的包含边界的 Unix 毫秒时间范围
  `after`／`before`；可选的从 `1` 到 `500` 的 `limit`；以及可选的来自前一页的
  字符串 `cursor`。
- 结果：`{ "events": AuditActivityEventV1[], "nextCursor"?: string }`。

命名的 V1 结果联合类型具有独立的代理运行、工具操作、入站消息
和出站消息架构。`eventType` 判别字段分别为
`agent_run`、`tool_action`、`inbound_message` 或 `outbound_message`；`kind` 和消息
`direction` 仍可用于筛选和显示。每个事件都有整数
`schemaVersion: 1`。消息身份引用使用精确的
`hmac-sha256:v1:<32 hex key id>:<64 hex digest>` 格式；channel-sender actor
id 使用相同格式。

所有变体都要求 `eventType`、`schemaVersion`、`eventId`、`sequence`、
`sourceSequence`、`occurredAt`、`kind`、`action`、`status`、`actor` 和
`redaction`。变体字段如下：

| `eventType`        | 必填字段                                                       | 可选字段                                                                                                                        |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `agent_run`        | `agentId`、`runId`；`kind: "agent_run"`                         | `sessionKey`、`sessionId`、`errorCode`                                                                                          |
| `tool_action`      | `agentId`、`runId`；`kind: "tool_action"`                       | `sessionKey`、`sessionId`、`toolCallId`、`toolName`、`errorCode`                                                                |
| `inbound_message`  | `direction: "inbound"`、`channel`、`conversationKind`、`outcome`  | `agentId`、`runId`、`durationMs`、`resultCount`、身份引用、`reasonCode`、`errorCode`                                 |
| `outbound_message` | `direction: "outbound"`、`channel`、`conversationKind`、`outcome` | `agentId`、`runId`、`durationMs`、`resultCount`、身份引用、`reasonCode`、`deliveryKind`、`failureStage`、`errorCode`        |

封闭的消息枚举如下：

- `conversationKind`：`direct`、`group`、`channel` 或 `unknown`。
- 入站 `outcome`：`completed`、`skipped` 或 `failed`；可选的
  `reasonCode`：`duplicate`、`reply_operation_active`、
  `reply_operation_aborted`、`fast_abort`、`plugin_bound_handled`、
  `plugin_bound_unavailable`、`plugin_bound_declined`、`plugin_bound_error`、
  `before_dispatch_handled`、`acp_dispatch_completed`、`acp_dispatch_failed`、
  `acp_dispatch_empty` 或 `acp_dispatch_aborted`。
- 出站 `outcome`：`sent`、`suppressed`、`failed` 或 `unknown`；可选的
  `reasonCode`：`cancelled_by_message_sending_hook`、
  `cancelled_by_reply_payload_sending_hook`、`empty_after_message_sending_hook`、
  `empty_after_reply_payload_sending_hook` 或 `no_visible_payload`。当适配器未返回平台身份时为
  `unknown`，因为无法证明外部副作用未发生。
- `deliveryKind`：`text`、`media` 或 `other`；`failureStage`：
  `platform_send`、`queue` 或 `unknown`。

终止字段具有关联性，而非彼此独立可选：

| 变体             | 终止映射                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent run        | `started` 不含 `errorCode`；每个非成功的完成状态都要求对应的 `run_*` 代码。                                                                                 |
| Tool action      | `started` 和 succeeded 不含 `errorCode`；其他每个完成状态都要求对应的 `tool_*` 代码。                                                                       |
| Inbound message  | succeeded = `completed`；blocked = `skipped`；failed = `failed` 加上 `message_processing_failed`。存在时，`reasonCode` 必须属于该终止系列。 |
| Outbound message | succeeded = `sent`；blocked = `suppressed` 加上 `reasonCode`；failed = `failed` 加上 `errorCode` 和 `failureStage`；unknown = `unknown` 加上 `failureStage`。      |

每个 activity 事件都包含稳定的事件 id、单调递增的 ledger sequence、
源事件 sequence、时间戳、actor、action、status、整数
`schemaVersion: 1` 以及 `redaction: "metadata_only"`。运行和工具记录
要求 agent 和 run 溯源信息，并且可以包含 session 溯源信息。消息记录可以包含
agent 和 run id，但有意从不包含 `sessionKey` 或 `sessionId`；因此 `sessionKey` 查询筛选器仅适用于
run 和 tool 行。工具事件可以包含工具调用 id 和工具名称。

消息记录使用 `message.inbound.processed` 或
`message.outbound.finished`，并添加 direction、channel、conversation kind、
规范化 outcome，以及可选的 delivery kind、failure stage、duration、
result count、reason code 和安装本地的带密钥
account／conversation／message／target 伪名。这些伪名有助于
关联，但并不构成匿名化：状态数据库包含其密钥，而 RPC 和 CLI 导出不包含。该 ledger 不存储提示词、消息正文、工具参数、工具结果、命令输出或原始错误文本。
Run/tool `sessionKey` 值仍是原始关联元数据，并且可能嵌入
平台 account 或 peer id；消息记录省略 session key。

对于入站行，`durationMs` 衡量从核心 dispatch 到终止的时间，
`resultCount` 统计最终确定的已排队工具、阻止和回复 payload。对于出站行，
`durationMs` 跨越从交付所有权到确认、死信或对账的整个过程
（包括排队等待时间），`resultCount` 统计已识别的实际平台发送次数。存在时，`deliveryKind`
描述经过 hooks 和渲染后的有效 payload；被抑制或崩溃导致状态不明确的行会省略它。

当前消息覆盖范围包括已接受并到达核心
dispatch 的入站消息，包括核心重复／终止结果。出站覆盖范围会为每个到达共享持久化
delivery 的原始逻辑回复 payload 写入一条终止行；分块和适配器扇出会汇总到
`resultCount` 中。可排队重试或状态不明确的发送仅在确认、死信或对账后记录。绕过这些共享边界的
plugin-local 和 direct-send 路径目前尚未覆盖。受限的 worker queue 采用尽力而为策略，
可能会在失败或饱和时丢弃记录，因此该表面不是
无损的合规存档。

记录默认开启，并由
[`logging.audit.enabled`](/gateway/configuration-reference#audit) 控制。消息
记录由 `logging.audit.messages` 单独控制，默认值为
`"off"`。当
记录被禁用时，`audit.activity.list` 仍会继续提供之前写入、直到过期的记录。

`audit.run.inspect` 同样要求 `operator.read`。其封闭请求会选择一个
`executionId` 进行精确检查，或选择一个 `runId` 进行有界的执行发现。一个 run 匹配项会直接解析；多个匹配项会返回明确的
`ambiguous` 结果，最多包含 50 个候选项，并要求精确选择执行。决策页最多包含 100 个回执。执行身份收集默认单独关闭，并要求
`logging.audit.executionIdentity: true`，同时在 Gateway 重启后启用 audit ledger。缺失的尽力而为证据永远不能证明某个 run 未发生。

已提供的 `audit.list` 请求、结果和 `AuditEvent` 架构保持不变，并且仅返回
agent-run 和 tool-action 记录。当 Gateway 宣布支持 `audit.activity.list` 时，
新的 operator 客户端应调用它。较旧的 Gateway 可能报告
`unknown method: audit.activity.list`，或者由于已发布版本中授权先于方法查找，对具有 read 作用域的请求报告
`missing scope: operator.admin`。仅当该方法未被宣布支持时，才将后者视为方法不存在。随后，客户端只有在其筛选条件不要求消息 kind、direction 或 channel
支持时，才可以重试 `audit.list`。

使用 [`openclaw audit`](/cli/audit) 进行文本查询和有界 JSON 导出。

## 任务账本 RPC

操作员客户端通过任务账本 RPC（`packages/gateway-protocol/src/schema/tasks.ts`）检查和取消网关后台任务记录。这些 RPC 返回经过清理的任务摘要，而非原始运行时状态。

- `tasks.list` 需要 `operator.read`。
  - 参数：可选的 `status`（`"queued"`、`"running"`、`"completed"`、`"failed"`、`"cancelled"` 或 `"timed_out"`）或这些状态组成的数组，可选的 `agentId`、可选的 `sessionKey`、可选的范围为 `1` 到 `500` 的 `limit`，以及可选的字符串 `cursor`。
  - 结果：`{ "tasks": TaskSummary[], "nextCursor"?: string }`。
- `tasks.get` 需要 `operator.read`。
  - 参数：`{ "taskId": string }`。
  - 结果：`{ "task": TaskSummary }`。
  - 缺少的任务 ID 会返回网关的未找到错误结构。
- `tasks.cancel` 需要 `operator.write`。
  - 参数：`{ "taskId": string, "reason"?: string }`。
  - 结果：`{ "found": boolean, "cancelled": boolean, "reason"?: string, "task"?: TaskSummary }`。
  - `found` 表示账本中是否存在匹配的任务。`cancelled`
    表示运行时是否接受或记录了取消操作。

`TaskSummary` 包含 `id`、`status` 以及可选的元数据：`kind`、
`runtime`、`title`、`agentId`、`sessionKey`、`childSessionKey`、`ownerKey`、
`runId`、`taskId`、`flowId`、`parentTaskId`、`sourceId`、时间戳、进度、
终止摘要以及经过清理的错误文本。`agentId` 标识执行任务的代理；
`sessionKey` 和 `ownerKey` 保留请求方和控制上下文。

## Operator 辅助方法

- `commands.list`（`operator.read`）获取某个 agent 的运行时命令清单。
  - `agentId` 可选；省略后读取默认 agent 工作区。
  - `scope` 控制主 `name` 所指向的界面：`text` 返回不带前导 `/` 的主文本命令令牌；`native` 和默认的 `both` 路径在可用时返回 provider 感知的原生命令名称。
  - `textAliases` 携带准确的斜杠别名，例如 `/model` 和 `/m`。
  - `nativeName` 携带 provider 感知的原生命令名称（如果存在）。
  - `provider` 可选，仅影响原生命名以及原生插件命令的可用性。
  - `includeArgs=false` 会从响应中省略序列化的参数元数据。
- `tools.catalog`（`operator.read`）获取某个 agent 的运行时工具目录。响应包括分组工具和来源元数据：
  - `source`：`core` 或 `plugin`
  - `pluginId`：当 `source="plugin"` 时的插件所有者
  - `optional`：插件工具是否为可选工具
- `tools.effective`（`operator.read`）获取某个会话的运行时有效工具清单。
  - 必须提供 `sessionKey`。
  - 网关在服务端从会话中派生可信的运行时上下文，而不是接受调用方提供的身份验证或传递上下文。
  - 响应是会话范围内、由服务端派生的活动工具清单投影，其中包括核心工具、插件工具、频道工具，以及已发现的 MCP 服务器工具。
  - 对 MCP 而言，`tools.effective` 是只读的：它可以通过最终工具策略投影温会话 MCP 目录，但不会创建 MCP 运行时、连接传输层或发出 `tools/list`。如果不存在匹配的温目录，响应可能会包含诸如 `mcp-not-yet-connected`、`mcp-not-yet-listed` 或 `mcp-stale-catalog` 之类的通知。
  - 有效工具条目使用 `source="core"`、`source="plugin"`、`source="channel"` 或 `source="mcp"`。
- `tools.invoke`（`operator.write`）通过与 `/tools/invoke` 相同的网关策略路径调用一个可用工具。
  - 必须提供 `name`。`args`、`sessionKey`、`agentId`、`confirm` 和 `idempotencyKey` 可选。
  - 如果同时提供了 `sessionKey` 和 `agentId`，解析出的会话 agent 必须与 `agentId` 匹配。
  - 仅所有者可用的核心包装器，例如 `cron`、`gateway` 和 `nodes`，要求所有者／管理员身份（`operator.admin`），即使 `tools.invoke` 本身是 `operator.write`。
  - 响应是面向 SDK 的信封，包含 `ok`、`toolName`、可选的 `output` 以及类型化的 `error` 字段。审批或策略拒绝会在载荷中返回 `ok:false`，而不是绕过网关工具策略管道。
- `skills.status`（`operator.read`）获取某个 agent 可见的技能清单。
  - `agentId` 可选；省略后读取默认 agent 工作区。
  - 响应包括资格、缺失要求、配置检查以及经过清理的安装选项，不会暴露原始机密值。
- `skills.search` 和 `skills.detail`（`operator.read`）返回 ClawHub 发现元数据。
- `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit`（`operator.admin`）会在安装私有技能归档之前暂存它。这是面向受信任客户端的独立管理员上传路径，不是常规的 ClawHub 技能安装流程；除非启用 `skills.install.allowUploadedArchives`，否则默认禁用。
  - `skills.upload.begin({ kind: "skill-archive", slug, sizeBytes, sha256?, force?, idempotencyKey? })` 创建一个绑定到该 slug 和 force 值的上传。
  - `skills.upload.chunk({ uploadId, offset, dataBase64 })` 在准确的解码偏移处追加字节。
  - `skills.upload.commit({ uploadId, sha256? })` 验证最终大小和 SHA-256。提交只会完成上传，不会安装技能。
  - 上传的技能归档是包含根目录 `SKILL.md` 的 zip 归档。归档的内部目录名称不会选择安装目标。
- `skills.install`（`operator.admin`）有三种模式：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 将技能文件夹安装到默认 agent 工作区的 `skills/` 目录中。
  - 上传模式：`{ source: "upload", uploadId, slug, force?, sha256?, timeoutMs? }` 将已提交的上传内容安装到默认 agent 工作区的 `skills/<slug>` 目录中。slug 和 force 值必须与原始的 `skills.upload.begin` 请求匹配。除非启用 `skills.install.allowUploadedArchives`，否则会被拒绝；此设置不影响 ClawHub 安装。
  - 网关安装器模式：`{ name, installId, timeoutMs? }` 在网关主机上运行声明的 `metadata.openclaw.install` 操作。旧版客户端可能仍会发送 `dangerouslyForceUnsafeInstall`；此字段已弃用，仅为协议兼容而接受，并会被忽略。请使用 `security.installPolicy` 处理由 Operator 所有的安装决策。
- `skills.update`（`operator.admin`）有两种模式：
  - ClawHub 模式更新默认 agent 工作区中一个受跟踪的 slug，或所有受跟踪的 ClawHub 安装。
  - 配置模式修改 `skills.entries.<skillKey>` 值，例如 `enabled`、`apiKey` 和 `env`。

### `models.list` 视图

`models.list` 接受可选的 `view` 参数
（`src/agents/model-catalog-visibility.ts`）：

- 省略或使用 `"default"`：如果配置了 `agents.defaults.modelPolicy.allow`，响应就是允许的目录，其中包括针对 `provider/*` 条目的动态发现模型。否则，响应就是完整的网关目录。
- `"configured"`：选择器大小的行为。如果配置了 `agents.defaults.modelPolicy.allow`，它仍然优先，包括针对 `provider/*` 条目的 provider 范围发现。没有允许列表时，响应使用显式的 `models.providers.<provider>.models` 条目；仅当不存在已配置的模型行时，才回退到完整目录。
- `"provider-config"`：由来源编写的 `models.providers.*.models` 清单，独立于选择器允许列表。行中包括公开的模型能力和路由感知的可用性，但省略 provider 端点、身份验证材料以及运行时请求配置。
- `"all"`：完整的网关目录，绕过 `agents.defaults.modelPolicy.allow`。用于诊断／发现界面，不用于常规模型选择器。

## Exec 审批

- 当 Exec 请求需要审批时，网关会广播
  `exec.approval.requested`。
- Operator 客户端通过调用 `exec.approval.resolve`（需要
  `operator.approvals`）来完成处理。
- 对于 `host=node`，`exec.approval.request` 必须包含
  `systemRunPlan`（规范的 `argv`／`cwd`／`rawCommand`／session metadata）。缺少
  `systemRunPlan` 的请求会被拒绝。
- 审批通过后，转发的 `node.invoke system.run` 调用会将该规范的
  `systemRunPlan` 重新用作权威的命令／cwd／会话上下文。
- 如果调用方在准备阶段与最终获批的 `system.run` 转发之间修改了
  `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，网关会拒绝运行，而不是信任已被修改的负载。

## Agent 投递回退

- `agent` 请求可以包含 `deliver=true`，以请求出站投递。
- `bestEffortDeliver=false`（默认值）保持严格行为：无法解析的或仅限内部的投递目标会返回 `INVALID_REQUEST`。
- `bestEffortDeliver=true` 允许在无法解析外部可投递路由时回退到仅会话执行（例如内部／webchat 会话或含义不明确的多渠道配置）。
- 请求投递时，最终的 `agent` 结果可能包含 `result.deliveryStatus`，使用
  [`openclaw agent --json --deliver`](/cli/agent#json-delivery-status) 中记录的相同
  `sent`、`suppressed`、`partial_failed` 和
  `failed` 状态。

## 版本管理

- `PROTOCOL_VERSION`、`MIN_CLIENT_PROTOCOL_VERSION`、
  `MIN_NODE_PROTOCOL_VERSION` 和 `MIN_PROBE_PROTOCOL_VERSION` 位于
  `packages/gateway-protocol/src/version.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`。Operator 和 UI 客户端必须将当前协议包含在该范围内；当前客户端和服务器运行协议 v4。
- 同时具有 `role: "node"` 和 `client.mode: "node"` 的已认证客户端可以使用 N-1 节点协议（当前为 v3）。轻量级重启探针使用相同的 N-1 窗口。设备认证、配对、作用域、命令策略和 exec 审批不会因该兼容性窗口而改变。在节点升级到当前协议之前，会暂缓提供插件拥有的节点能力和命令，因为其托管表面不属于 N-1 合约。
- Schema 和模型由 TypeBox 定义生成：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客户端常量

参考客户端实现位于 `packages/gateway-client/src/`
（OpenClaw 通过轻量的 `src/gateway/client.ts` facade 对其进行封装）。这些
默认值在协议 v4 中保持稳定，是第三方客户端应采用的预期基线。

| 常量                                      | 默认值                                                | 来源                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `PROTOCOL_VERSION`                        | `4`                                                   | `packages/gateway-protocol/src/version.ts`                                                                                |
| `MIN_CLIENT_PROTOCOL_VERSION`             | `4`                                                   | `packages/gateway-protocol/src/version.ts`                                                                                |
| `MIN_NODE_PROTOCOL_VERSION`               | `3`                                                   | `packages/gateway-protocol/src/version.ts`                                                                                |
| `MIN_PROBE_PROTOCOL_VERSION`              | `3`                                                   | `packages/gateway-protocol/src/version.ts`                                                                                |
| 请求超时（每个 RPC）                      | `30_000` 毫秒                                         | `packages/gateway-client/src/client.ts`（`requestTimeoutMs`）                                                             |
| 预认证／connect-challenge 超时            | `15_000` 毫秒                                         | `packages/gateway-client/src/timeouts.ts`（`OPENCLAW_HANDSHAKE_TIMEOUT_MS` 环境变量可以提高配对的服务器／客户端预算） |
| 初始重连退避                              | `1_000` 毫秒                                          | `packages/gateway-client/src/client.ts`（`GATEWAY_RECONNECT_POLICY`）                                                      |
| 最大重连退避                              | `30_000` 毫秒                                         | `packages/gateway-client/src/client.ts`（`GATEWAY_RECONNECT_POLICY`）                                                      |
| 设备令牌关闭后的快速重试限制               | `250` 毫秒                                            | `packages/gateway-client/src/client.ts`                                                                                   |
| `terminate()` 前的强制停止宽限时间         | `250` 毫秒                                            | `FORCE_STOP_TERMINATE_GRACE_MS`                                                                                           |
| `stopAndWait()` 默认超时                   | `1_000` 毫秒                                          | `STOP_AND_WAIT_TIMEOUT_MS`                                                                                                |
| 默认 tick 间隔（`hello-ok` 之前）          | `30_000` 毫秒                                         | `packages/gateway-client/src/client.ts`                                                                                   |
| tick 超时关闭                              | 静默超过 `tickIntervalMs * 2` 时，代码为 `4000`        | `packages/gateway-client/src/client.ts`                                                                                   |
| `MAX_PAYLOAD_BYTES`                       | `25 * 1024 * 1024`（25 MB）                            | `src/gateway/server-constants.ts`                                                                                         |
| 聊天附件上限                              | `agents.defaults.mediaMaxMb`，默认解码后 20 MB        | `src/gateway/chat-attachment-policy.ts`                                                                                   |
| 聊天附件图片上限                          | `min(附件上限, 6 MB)`                                  | `src/gateway/chat-attachment-policy.ts`、`packages/media-core/src/constants.ts`                                          |

服务器会在
`hello-ok` 中公布实际生效的
`policy.tickIntervalMs`、`policy.maxPayload`、`policy.maxBufferedBytes` 和 `policy.attachments`；
客户端应遵循这些值，而不是使用握手前的默认值或硬编码的附件大小。

当每个待处理请求都有配置的截止时间时，参考客户端允许有限请求使用其配置的截止时间。没有有限 `timeoutMs` 的 `expectFinal` 请求、任何 `timeoutMs: null` 的请求，或有限请求与无界请求的混合，会使 tick 看门狗保持活动状态。如果入站事件和响应在超过 tick 超时阈值后仍保持静默，客户端会以代码 `4000` 关闭 socket，拒绝所有待处理请求，并重新连接。重新连接后不会重放被拒绝的请求。

## 身份验证

- 共享密钥网关身份验证根据配置的
  `gateway.auth.mode`（`"none" | "token" | "password" | "trusted-proxy"`），使用 `connect.params.auth.token` 或
  `connect.params.auth.password`。
- 带有身份信息的模式，例如 Tailscale Serve（`gateway.auth.allowTailscale: true`）
  或非 loopback 的 `gateway.auth.mode: "trusted-proxy"`，会通过请求标头而不是 `connect.params.auth.*` 满足 connect
  身份验证检查。
- 私有入口的 `gateway.auth.mode: "none"` 会完全跳过共享密钥 connect 身份验证；不要在公共／不受信任的入口上暴露该模式。
- 配对后，网关会签发一个限定于连接角色＋已批准授权的设备令牌，并在 `hello-ok.auth.deviceToken` 中返回。成功 connect 后，如果该令牌是新的或不同于已存储的令牌，客户端应将其与 `hello-ok.auth.scopes` 一起持久化。
- `hello-ok.auth.scopes` 是当前 socket 的实时权限，并与 RPC 分发所执行的 scopes 相匹配。
- 当 `hello-ok.auth.deviceToken` 与同一网关、设备、客户端和角色已存储的令牌完全匹配时，应保留该记录中存储的 scopes，而不是将其替换为更窄的实时 scope 集合。新签发或轮换后的令牌使用 `hello-ok.auth.scopes`；该令牌签发时，其已批准授权与该连接相匹配。
- 使用已存储的设备令牌重新连接时，也应复用该令牌已存储的已批准 scope 集合。这样可以保留已授予的读取／探测／状态访问权限，并避免将重新连接静默收缩为更窄的隐式管理员专属 scope。
- 客户端侧的 connect 身份验证组装（`packages/gateway-client/src/client.ts` 中的 `selectConnectAuth`）：
  - `auth.password` 是正交的，只要设置就始终转发。
  - `auth.token` 按以下优先顺序填充：首先是显式共享令牌，然后是显式 `deviceToken`，最后是按 `deviceId`＋`role` 索引的已存储每设备令牌。
  - 只有在上述选项都未解析出 `auth.token` 时，才会发送 `auth.bootstrapToken`。共享令牌或任何已解析的设备令牌都会抑制它。
  - 在一次性的 `AUTH_TOKEN_MISMATCH` 重试中，已存储设备令牌的自动提升仅对受信任端点开放：loopback，或带有固定 `tlsFingerprint` 的 `wss://`。未固定指纹的公共 `wss://` 不符合条件。
- 内置设置码 bootstrap 会返回主节点的
  `hello-ok.auth.deviceToken`，以及一个用于受信任移动端交接的有界 operator 令牌，并在 `hello-ok.auth.deviceTokens` 中返回。该 operator 令牌包含用于原生 Talk 配置读取的 `operator.talk.secrets`，但排除配对变更 scopes 和 `operator.admin`。
- `hello-ok.auth.deviceTokens` 仅包含额外的 bootstrap 交接令牌。不要将其用作主要 `deviceToken` 重连记录的元数据。
- 当非 baseline 设置码 bootstrap 等待批准时，
  `PAIRING_REQUIRED` 详情会包含 `recommendedNextStep: "wait_then_retry"`、
  `retryable: true` 和 `pauseReconnect: false`。使用相同的 bootstrap 令牌持续重新连接，直到请求获批或令牌失效。
- 仅当 connect 使用了受信任传输上的 bootstrap 身份验证时，才持久化 `hello-ok.auth.deviceTokens`，例如 `wss://` 或 loopback／本地配对。
- 如果客户端提供了显式 `deviceToken` 或显式 `scopes`，则调用方请求的 scope 集合在实时连接中保持权威，并在 `hello-ok.auth.scopes` 中报告；仅当客户端复用已存储的每设备令牌时，才会复用缓存的令牌授权 scopes。
- 设备令牌可以通过 `device.token.rotate` 和 `device.token.revoke` 进行轮换／撤销（需要 `operator.pairing`）。轮换或撤销 node 或其他非 operator 角色还需要 `operator.admin`。
- `device.token.rotate` 会返回轮换元数据。只有对于已经使用该设备令牌完成身份验证的同设备调用，才会回显替换后的 bearer 令牌，以便仅使用令牌的客户端在重新连接前持久化替换令牌。共享／管理员轮换不会回显 bearer 令牌。
- 令牌签发、轮换和撤销始终受限于该设备配对条目中记录的已批准角色集合；令牌变更不能扩展到或针对配对批准从未授予的设备角色。
- 对于已配对设备令牌会话，设备管理的范围限定于自身，除非调用方还具有 `operator.admin`：非管理员调用方只能管理其自身设备条目的 operator 令牌。Node 和其他非 operator 令牌的管理仅限管理员，即使是针对调用方自己的设备也一样。
- `device.token.rotate` 和 `device.token.revoke` 还会根据调用方当前会话 scopes 检查目标 operator 令牌的 scope 集合。
  非管理员调用方不能轮换或撤销 scope 范围比其自身已持有权限更广的 operator 令牌。
- 身份验证失败会包含 `error.details.code` 以及恢复提示：
  - `error.details.canRetryWithDeviceToken`（布尔值）
  - `error.details.recommendedNextStep`：以下值之一：`retry_with_device_token`、
    `update_auth_configuration`、`update_auth_credentials`、
    `wait_then_retry`、`review_auth_configuration`
    （`packages/gateway-protocol/src/connect-error-details.ts`）。
- `AUTH_TOKEN_MISMATCH` 的客户端行为：
  - 受信任客户端可以使用缓存的每设备令牌尝试一次有界重试。
  - 如果该重试失败，则停止自动重连循环，并向操作员显示操作指引。
- `AUTH_SCOPE_MISMATCH` 表示设备令牌已被识别，但未覆盖所请求的角色／scopes。不要将其显示为令牌错误；应提示操作员重新配对，或批准范围更窄／更宽的 scope 合约。

## 设备身份与配对

- 节点应包含稳定的设备身份（`device.id`），该身份由密钥对指纹派生。
- 网关按设备和角色签发令牌。
- 除非启用了本地自动批准，否则新设备 ID 必须经过配对批准。
- 配对自动批准以直接本地回环连接为中心。
- OpenClaw 还为受信任的共享密钥辅助流程提供了一条范围狭窄的后端／容器本地自连接路径。
- 同主机 tailnet 或 LAN 连接在配对时仍被视为远程连接，并且需要批准。
- WS 客户端通常会在 `connect` 期间包含 `device` 身份（操作员 + 节点）。唯一不包含设备身份的操作员例外是明确的信任路径：
  - 成功通过 `gateway.auth.mode: "trusted-proxy"` 进行操作员 Control UI 身份验证。
  - 保留的内部辅助路径上的直接回环 `gateway-client` 后端 RPC。
- 省略设备身份会产生范围影响。当无设备身份的操作员连接通过明确的信任路径获准时，除非该路径具有具名的范围保留例外，OpenClaw 仍会将自行声明的范围清除为空集。随后，受范围限制的方法会失败，并返回 `missing scope`。
- 保留的直接回环 `gateway-client` 后端辅助路径仅为内部本地控制平面 RPC 保留范围；自定义后端 ID 不享有此例外。
- 所有连接都必须对服务器提供的 `connect.challenge` nonce 进行签名。

### 设备认证迁移诊断

对于仍使用挑战前签名行为的旧版客户端，`connect` 会在 `error.details.code` 下返回 `DEVICE_AUTH_*` 详细代码，并提供稳定的 `error.details.reason`。

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
- 使用 `connect.challenge.payload.ts` 作为 `connect.params.device.signedAt`。
- 对包含服务器 nonce 的 v2 负载进行签名。
- 在 `connect.params.device.nonce` 中发送相同的 nonce。
- 首选签名负载为 `v3`
  （`packages/gateway-client/src/device-auth.ts` 中的 `buildDeviceAuthPayloadV3`），
  除设备／客户端／角色／范围／令牌／nonce 字段之外，该负载还会绑定
  `platform` 和 `deviceFamily`。
- 为保持兼容性，仍接受旧版 `v2` 签名，但重新连接时，配对设备元数据固定仍会控制命令策略。

## TLS 与固定

- WS 连接支持 TLS（`gateway.tls` 配置）。
- 客户端可以选择通过 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint` 固定网关证书指纹。

## 范围

此协议公开了完整的 gateway API：状态、频道、模型、聊天、代理、会话、节点、审批等。其确切接口由从 `packages/gateway-protocol/src/schema.ts` 重新导出的 TypeBox schemas 定义。

## 相关

- [构建 Gateway 客户端](https://docs.openclaw.ai/gateway/clients)
- [嵌入 OpenClaw](https://docs.openclaw.ai/gateway/embedding)
- [Bridge 协议](/gateway/bridge-protocol)
- [Gateway 运行手册](/gateway)。
