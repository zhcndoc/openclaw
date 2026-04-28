---
summary: "网关 WebSocket 协议：握手、帧格式、版本控制"
read_when:
  - 实现或更新网关 WS 客户端
  - 调试协议不匹配或连接失败
  - 重新生成协议 schema/models
title: "网关协议"
---

Gateway WS 协议是 OpenClaw 的**单一控制平面 + 节点传输层**。所有客户端（CLI、Web UI、macOS 应用、iOS/Android 节点、无头节点）都通过 WebSocket 连接，并在握手时声明其**角色** + **作用域**。

## 传输

- WebSocket，使用 JSON 负载的文本帧。
- 第一帧**必须**是 `connect` 请求。
- 连接前帧上限为 64 KiB。成功握手后，客户端
  应遵循 `hello-ok.policy.maxPayload` 和
  `hello-ok.policy.maxBufferedBytes` 限制。启用诊断时，
  过大的入站帧和过慢的出站缓冲会在网关关闭或丢弃受影响的帧之前发出
  `payload.large` 事件。这些事件会保留
  大小、限制、表面和安全原因码。它们不会保留消息
  正文、附件内容、原始帧正文、令牌、cookie 或秘密值。

## 握手（connect）

网关 → 客户端（连接前挑战）：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

客户端 → 网关：

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

网关 → 客户端：

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

`server`, `features`, `snapshot`, 和 `policy` 都是 schema
（`src/gateway/protocol/schema/frames.ts`）所要求的。`auth` 也必需，
并报告协商后的角色/范围。`canvasHostUrl` 是可选的。

当未签发设备令牌时，`hello-ok.auth` 会报告协商后的权限，而不包含令牌字段：

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

当签发设备令牌时，`hello-ok` 还会包含：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

在受信任的引导移交期间，`hello-ok.auth` 还可能包含 `deviceTokens` 中额外的有界角色条目：

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

对于内置的节点/操作员引导流程，主节点令牌保持 `scopes: []`，任何移交的操作员令牌仍受限于引导操作员允许列表（`operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`）。引导范围检查保持角色前缀：操作员条目仅满足操作员请求，非操作员角色仍需要其自身角色前缀下的范围。

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
    "commands": [
      "camera.snap",
      "canvas.navigate",
      "screen.record",
      "location.get"
    ],
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

有副作用的方法需要**幂等键**（详见模式）。

## 角色 + 权限范围

### 角色

- `operator` = 控制平面客户端（CLI/UI/自动化）。
- `node` = 功能主机（摄像头/屏幕/画布/系统运行）。

### 权限范围（operator）

常用权限范围：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

`talk.config` 与 `includeSecrets: true` 需要 `operator.talk.secrets`（或 `operator.admin`）。

插件注册的网关 RPC 方法可以请求它们自己的操作员范围，但保留的核心管理员前缀（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）始终解析为 `operator.admin`。

方法权限范围只是第一道门槛。一些通过 `chat.send` 访问的斜杠命令，在命令级别上会施加更严格的检查。例如，持久化的 `/config set` 和 `/config unset` 写操作需要 `operator.admin` 权限。

`node.pair.approve` 在基础方法范围之上还有一个额外的审批时范围检查：

- 无命令请求：`operator.pairing`
- 带有非执行节点命令的请求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的请求：`operator.pairing` + `operator.admin`

### 能力/命令/权限（节点）

节点在连接时申明能力声明：

- `caps`：高级能力类别。
- `commands`：调用命令白名单。
- `permissions`：具体开关（例如 `screen.record`、`camera.capture`）。

网关将其视为**声明**，并在服务器端强制检查白名单。

## 在线状态

- `system-presence` 返回以设备身份为键的条目。
- 在线状态条目包含 `deviceId`、`roles` 和 `scopes`，UI 可以对同一设备连接的**operator** 和 **node** 显示为单行。

## 广播事件范围控制

服务端推送的 WebSocket 广播事件按范围进行门控，因此配对范围或仅节点会话不会被动接收会话内容。

- **聊天、代理和工具结果帧**（包括流式 `agent` 事件和工具调用结果）至少需要 `operator.read`。没有 `operator.read` 的会话会完全跳过这些帧。
- **插件定义的 `plugin.*` 广播**按 `operator.write` 或 `operator.admin` 进行门控，具体取决于插件注册方式。
- **状态和传输事件**（`heartbeat`、`presence`、`tick`、连接/断开生命周期等）保持不受限制，因此每个经过认证的会话都能观察到传输健康状况。
- **未知的广播事件族**默认按范围门控（fail-closed），除非注册处理程序显式放宽它们。

每个客户端连接都保留自己的每客户端序列号，因此即使不同客户端看到的是不同的按范围过滤后的事件子集，广播在该 socket 上仍能保持单调顺序。

## 常见 RPC 方法族

公共 WS 表面比上面的握手/认证示例更广泛。这
不是生成的转储——`hello-ok.features.methods` 是一个保守的
发现列表，由 `src/gateway/server-methods-list.ts` 加上已加载的
插件/通道方法导出构建而成。将其视为功能发现，而不是对
`src/gateway/server-methods/*.ts` 的完整枚举。

<AccordionGroup>
  <Accordion title="System and identity">
    - `health` 返回缓存或新近探测到的网关健康快照。
    - `diagnostics.stability` 返回最近的有界诊断稳定性记录器。它保留事件名称、计数、字节大小、内存读数、队列/会话状态、通道/插件名称和会话 id 等运行元数据。它不会保留聊天文本、webhook 正文、工具输出、原始请求或响应正文、令牌、cookie 或秘密值。需要 operator read 范围。
    - `status` 返回类似 `/status` 的网关摘要；敏感字段仅对具备 admin 范围的操作员客户端可见。
    - `gateway.identity.get` 返回 relay 和配对流程使用的网关设备身份。
    - `system-presence` 返回连接中的 operator/node 设备当前在线状态快照。
    - `system-event` 追加一个系统事件，并可更新/广播在线状态上下文。
    - `last-heartbeat` 返回最近持久化的心跳事件。
    - `set-heartbeats` 切换网关上的心跳处理。
  </Accordion>

  <Accordion title="Models and usage">
    - `models.list` 返回运行时允许的模型目录。
    - `usage.status` 返回提供方使用窗口/剩余额度摘要。
    - `usage.cost` 返回指定日期范围内的聚合成本使用摘要。
    - `doctor.memory.status` 返回当前默认代理工作区的向量内存 / 缓存嵌入就绪状态。仅当调用方明确需要一次实时嵌入提供方 ping 时，才传入 `{ "probe": true }` 或 `{ "deep": true }`。
    - `sessions.usage` 返回按会话划分的使用摘要。
    - `sessions.usage.timeseries` 返回单个会话的时序使用情况。
    - `sessions.usage.logs` 返回单个会话的使用日志条目。
  </Accordion>

  <Accordion title="Channels and login helpers">
    - `channels.status` 返回内置 + 打包的通道/插件状态摘要。
    - `channels.logout` 在通道支持退出登录时，登出特定通道/账户。
    - `web.login.start` 为当前具备 QR 能力的 web 通道提供方启动 QR/web 登录流程。
    - `web.login.wait` 等待该 QR/web 登录流程完成，并在成功时启动通道。
    - `push.test` 向已注册的 iOS 节点发送测试 APNs 推送。
    - `voicewake.get` 返回已存储的唤醒词触发器。
    - `voicewake.set` 更新唤醒词触发器并广播变更。
  </Accordion>

  <Accordion title="Messaging and logs">
    - `send` 是面向通道/账户/线程目标发送的直接出站投递 RPC，适用于聊天运行器之外。
    - `logs.tail` 返回已配置的网关文件日志尾部，支持 cursor/limit 和最大字节控制。
  </Accordion>

  <Accordion title="Talk and TTS">
    - `talk.config` 返回生效中的 Talk 配置负载；`includeSecrets` 需要 `operator.talk.secrets`（或 `operator.admin`）。
    - `talk.mode` 设置/广播 WebChat/Control UI 客户端当前的 Talk 模式状态。
    - `talk.speak` 通过当前 Talk 语音提供方合成语音。
    - `tts.status` 返回 TTS 启用状态、当前提供方、回退提供方以及提供方配置状态。
    - `tts.providers` 返回可见的 TTS 提供方清单。
    - `tts.enable` 和 `tts.disable` 切换 TTS 偏好状态。
    - `tts.setProvider` 更新首选 TTS 提供方。
    - `tts.convert` 执行一次性文本转语音转换。
  </Accordion>

  <Accordion title="Secrets, config, update, and wizard">
    - `secrets.reload` 重新解析当前活动的 SecretRefs，并且仅在完全成功时交换运行时秘密状态。
    - `secrets.resolve` 解析特定命令/目标集合的命令目标秘密分配。
    - `config.get` 返回当前配置快照和哈希。
    - `config.set` 写入已验证的配置负载。
    - `config.patch` 合并部分配置更新。
    - `config.apply` 验证 + 替换完整配置负载。
    - `config.schema` 返回 Control UI 和 CLI 工具所用的实时配置 schema 负载：schema、`uiHints`、版本和生成元数据，包括运行时可加载插件 + 通道 schema 元数据。该 schema 包含从 UI 使用的相同标签和帮助文本派生而来的字段 `title` / `description` 元数据，包括在存在匹配字段文档时的嵌套对象、通配符、数组项以及 `anyOf` / `oneOf` / `allOf` 组合分支。
    - `config.schema.lookup` 返回某个配置路径的按路径范围查询负载：规范化路径、浅层 schema 节点、匹配到的提示 + `hintPath`，以及用于 UI/CLI 下钻的直接子项摘要。查询 schema 节点保留面向用户的文档和常见验证字段（`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、数值/字符串/数组/对象边界，以及 `additionalProperties`、`deprecated`、`readOnly`、`writeOnly` 等标志）。子项摘要暴露 `key`、规范化 `path`、`type`、`required`、`hasChildren`，以及匹配到的 `hint` / `hintPath`。
    - `update.run` 运行网关更新流程，并且仅在更新本身成功时安排重启。
    - `update.status` 返回最新缓存的更新重启哨兵，包括可用时重启后的运行版本。
    - `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 通过 WS RPC 暴露入门向导。
  </Accordion>

  <Accordion title="Agent and workspace helpers">
    - `agents.list` 返回已配置的代理条目。
    - `agents.create`、`agents.update` 和 `agents.delete` 管理代理记录和工作区连接。
    - `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理为代理暴露的引导工作区文件。
    - `agent.identity.get` 返回某个代理或会话的有效助手身份。
    - `agent.wait` 等待运行完成，并在可用时返回终态快照。
  </Accordion>

  <Accordion title="Session control">
    - `sessions.list` 返回当前会话索引。
    - `sessions.subscribe` 和 `sessions.unsubscribe` 为当前 WS 客户端切换会话变更事件订阅。
    - `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 为单个会话切换转录/消息事件订阅。
    - `sessions.preview` 返回特定会话键的有界转录预览。
    - `sessions.resolve` 解析或规范化会话目标。
    - `sessions.create` 创建新的会话条目。
    - `sessions.send` 向现有会话发送消息。
    - `sessions.steer` 是活动会话的中断并引导变体。
    - `sessions.abort` 中止会话的活动工作。
    - `sessions.patch` 更新会话元数据/覆盖项。
    - `sessions.reset`、`sessions.delete` 和 `sessions.compact` 执行会话维护。
    - `sessions.get` 返回完整的已存储会话行。
    - 聊天执行仍然使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。`chat.history` 对 UI 客户端进行显示规范化：可见文本中的内联指令标签会被移除，纯文本工具调用 XML 负载（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>`，以及被截断的工具调用块）和泄露的 ASCII/全角模型控制令牌会被移除，诸如精确 `NO_REPLY` / `no_reply` 之类的纯静默令牌助手行会被省略，超大的行可被占位符替换。
  </Accordion>

  <Accordion title="Device pairing and device tokens">
    - `device.pair.list` 返回待处理和已批准的已配对设备。
    - `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理设备配对记录。
    - `device.token.rotate` 在已批准的角色和范围边界内轮换已配对设备令牌。
    - `device.token.revoke` 撤销已配对设备令牌。
  </Accordion>

  <Accordion title="Node pairing, invoke, and pending work">
    - `node.pair.request`, `node.pair.list`, `node.pair.approve`, `node.pair.reject`, `node.pair.remove`, and `node.pair.verify` cover node pairing and bootstrap verification.
    - `node.list` and `node.describe` return known/connected node state.
    - `node.rename` updates a paired node label.
    - `node.invoke` forwards a command to a connected node.
    - `node.invoke.result` returns the result for an invoke request.
    - `node.event` carries node-originated events back into the gateway.
    - `node.canvas.capability.refresh` refreshes scoped canvas-capability tokens.
    - `node.pending.pull` and `node.pending.ack` are the connected-node queue APIs.
    - `node.pending.enqueue` and `node.pending.drain` manage durable pending work for offline/disconnected nodes.
  </Accordion>

  <Accordion title="Approval families">
    - `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 覆盖一次性 exec 审批请求以及待审批查找/重放。
    - `exec.approval.waitDecision` 等待一个待处理 exec 审批并返回最终决策（或在超时时返回 `null`）。
    - `exec.approvals.get` 和 `exec.approvals.set` 管理网关 exec 审批策略快照。
    - `exec.approvals.node.get` 和 `exec.approvals.node.set` 通过节点 relay 命令管理节点本地 exec 审批策略。
    - `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 覆盖插件定义的审批流程。
  </Accordion>

  <Accordion title="Automation, skills, and tools">
    - 自动化：`wake` 调度即时或下一次心跳的唤醒文本注入；`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run`、`cron.runs` 管理计划任务。
    - 技能和工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`。
  </Accordion>
</AccordionGroup>

### 常见事件族

- `chat`：UI 聊天更新，如 `chat.inject` 和其他仅转录的聊天事件。
- `session.message` 和 `session.tool`：订阅会话的转录/事件流更新。
- `sessions.changed`：会话索引或元数据更改。
- `presence`：系统存在快照更新。
- `tick`：定期保持活动/活性事件。
- `health`：网关健康快照更新。
- `heartbeat`：心跳事件流更新。
- `cron`：cron 运行/作业更改事件。
- `shutdown`：网关关闭通知。
- `node.pair.requested` / `node.pair.resolved`：节点配对生命周期。
- `node.invoke.request`：节点调用请求广播。
- `device.pair.requested` / `device.pair.resolved`：配对设备生命周期。
- `voicewake.changed`：唤醒词触发器配置更改。
- `exec.approval.requested` / `exec.approval.resolved`：执行审批生命周期。
- `plugin.approval.requested` / `plugin.approval.resolved`：插件审批生命周期。

### 节点辅助方法

- 节点可调用 `skills.bins` 以获取当前的技能可执行文件列表，用于自动允许检查。

### 操作员辅助方法

- 操作员可以调用 `commands.list` (`operator.read`) 来获取代理的运行时
  命令清单。
  - `agentId` 是可选的；省略它以读取默认代理工作区。
  - `scope` 控制主 `name` 目标指向的表面：
    - `text` 返回不带前导 `/` 的主文本命令令牌
    - `native` 和默认的 `both` 路径在可用时返回感知提供者的原生名称
  - `textAliases` 包含精确的斜杠别名，例如 `/model` 和 `/m`。
  - `nativeName` 在存在时携带感知提供者的原生命令名称。
  - `provider` 是可选的，仅影响原生命名以及原生插件
    命令的可用性。
  - `includeArgs=false` 从响应中省略序列化的参数元数据。
- 操作员可以调用 `tools.catalog` (`operator.read`) 来获取代理的运行时工具目录。响应包括分组的工具和来源元数据：
  - `source`: `core` 或 `plugin`
  - `pluginId`: 当 `source="plugin"` 时的插件所有者
  - `optional`: 插件工具是否为可选
- 操作员可以调用 `tools.effective` (`operator.read`) 来获取会话的运行时有效工具
  清单。
  - `sessionKey` 是必需的。
  - 网关从服务器端的会话派生可信的运行时上下文，而不是接受
    调用者提供的认证或交付上下文。
  - 响应是会话范围的，反映了当前活动对话可以使用的内容，
    包括核心、插件和渠道工具。
- 操作员可以调用 `skills.status` (`operator.read`) 来获取可见的
  代理技能清单。
  - `agentId` 是可选的；省略它以读取默认代理工作区。
  - 响应包括资格、缺失的要求、配置检查以及
    清理过的安装选项，而不暴露原始密钥值。
- 操作员可以调用 `skills.search` 和 `skills.detail` (`operator.read`) 以获取
  ClawHub 发现元数据。
- 操作员可以调用 `skills.install` (`operator.admin`) 两种模式：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 安装一个
    技能文件夹到默认代理工作区 `skills/` 目录。
  - 网关安装器模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    在网关主机上运行声明的 `metadata.openclaw.install` 操作。
- 操作员可以调用 `skills.update` (`operator.admin`) 两种模式：
  - ClawHub 模式更新默认代理工作区中的一个跟踪 slug 或所有跟踪的 ClawHub 安装。
  - 配置模式修补 `skills.entries.<skillKey>` 值，例如 `enabled`、
    `apiKey` 和 `env`。

## 执行审批

- 当 exec 请求需要审批时，网关广播 `exec.approval.requested`。
- 操作员客户端通过调用 `exec.approval.resolve` 来解决（需要 `operator.approvals` 范围）。
- 对于 `host=node`，`exec.approval.request` 必须包含 `systemRunPlan`（规范化的 `argv`/`cwd`/`rawCommand`/会话元数据）。缺少 `systemRunPlan` 的请求将被拒绝。
- 审批通过后，转发的 `node.invoke system.run` 调用将复用该规范化的
  `systemRunPlan` 作为权威的命令/cwd/会话上下文。
- 如果调用者在 prepare 和最终批准的 `system.run` 转发之间篡改了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，网关将拒绝该运行，而不是信任被篡改的负载。

## 代理交付回退

- `agent` 请求可以包含 `deliver=true` 以请求出站交付。
- `bestEffortDeliver=false` 保持严格行为：未解析或仅限内部的交付目标将返回 `INVALID_REQUEST`。
- `bestEffortDeliver=true` 允许在无法解析外部可交付路由时回退到仅限会话的执行（例如内部/webchat 会话或模糊的多渠道配置）。

## 版本控制

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/schema/protocol-schemas.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`；服务端会拒绝版本不匹配。
- Schema 和模型由 TypeBox 定义生成：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客户端常量

`src/gateway/client.ts` 中的参考客户端使用这些默认值。这些值在协议 v3 范围内保持稳定，也是第三方客户端应遵循的基线。

| 常量                                       | 默认值                                                | 来源                                                       |
| ------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------- |
| `PROTOCOL_VERSION`                         | `3`                                                   | `src/gateway/protocol/schema/protocol-schemas.ts`          |
| Request timeout (per RPC)                  | `30_000` ms                                           | `src/gateway/client.ts` (`requestTimeoutMs`)               |
| Preauth / connect-challenge timeout        | `10_000` ms                                           | `src/gateway/handshake-timeouts.ts` (clamp `250`–`10_000`) |
| Initial reconnect backoff                  | `1_000` ms                                            | `src/gateway/client.ts` (`backoffMs`)                      |
| Max reconnect backoff                      | `30_000` ms                                           | `src/gateway/client.ts` (`scheduleReconnect`)              |
| Fast-retry clamp after device-token close  | `250` ms                                              | `src/gateway/client.ts`                                    |
| Force-stop grace before `terminate()`      | `250` ms                                              | `FORCE_STOP_TERMINATE_GRACE_MS`                            |
| `stopAndWait()` default timeout            | `1_000` ms                                            | `STOP_AND_WAIT_TIMEOUT_MS`                                 |
| Default tick interval (pre `hello-ok`)     | `30_000` ms                                           | `src/gateway/client.ts`                                    |
| Tick-timeout close                         | code `4000` when silence exceeds `tickIntervalMs * 2` | `src/gateway/client.ts`                                    |
| `MAX_PAYLOAD_BYTES`                        | `25 * 1024 * 1024` (25 MB)                            | `src/gateway/server-constants.ts`                          |

服务器会在 `hello-ok` 中公布生效的 `policy.tickIntervalMs`、`policy.maxPayload`
和 `policy.maxBufferedBytes`；客户端应遵循这些值，
而不是握手前的默认值。

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
- Additional `hello-ok.auth.deviceTokens` entries are bootstrap handoff tokens.
  Persist them only when the connect used bootstrap auth on a trusted transport
  such as `wss://` or loopback/local pairing.
- If a client supplies an **explicit** `deviceToken` or explicit `scopes`, that
  caller-requested scope set remains authoritative; cached scopes are only
  reused when the client is reusing the stored per-device token.
- Device tokens can be rotated/revoked via `device.token.rotate` and
  `device.token.revoke` (requires `operator.pairing` scope).
- `device.token.rotate` returns rotation metadata. It echoes the replacement
  bearer token only for same-device calls that are already authenticated with
  that device token, so token-only clients can persist their replacement before
  reconnecting. Shared/admin rotations do not echo the bearer token.
- Token issuance, rotation, and revocation stay bounded to the approved role set
  recorded in that device's pairing entry; token mutation cannot expand or
  target a device role that pairing approval never granted.
- For paired-device token sessions, device management is self-scoped unless the
  caller also has `operator.admin`: non-admin callers can remove/revoke/rotate
  only their **own** device entry.
- `device.token.rotate` and `device.token.revoke` also check the target operator
  token scope set against the caller's current session scopes. Non-admin callers
  cannot rotate or revoke a broader operator token than they already hold.
- Auth failures include `error.details.code` plus recovery hints:
  - `error.details.canRetryWithDeviceToken` (boolean)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Client behavior for `AUTH_TOKEN_MISMATCH`:
  - Trusted clients may attempt one bounded retry with a cached per-device token.
  - If that retry fails, clients should stop automatic reconnect loops and surface operator action guidance.

## 设备身份 + 配对

- 节点应包含源自密钥对指纹的稳定设备身份（`device.id`）。
- 网关按设备 + 角色颁发令牌。
- 除非启用了本地自动审批，否则新设备 ID 需要配对审批。
- 配对自动审批侧重于直接本地回环连接。
- OpenClaw 还有一个狭窄的后端/容器本地自连接路径，用于受信任的共享密钥辅助流程。
- 同一主机的 tailnet 或 LAN 连接在配对时仍被视为远程，需要审批。
- 所有 WS 客户端必须在 `connect` 期间包含 `device` 身份（操作员 + 节点）。
  控制 UI 仅在这些模式下可以省略它：
  - `gateway.controlUi.allowInsecureAuth=true` 用于仅本地主机不安全 HTTP 兼容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作员控制 UI 认证。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`（紧急突破，严重安全降级）。
- 所有连接必须签署服务器提供的 `connect.challenge` nonce。

### 设备认证迁移诊断

对于仍使用旧版预挑战签名行为的遗留客户端，`connect` 现在会返回  
位于 `error.details.code` 中的 `DEVICE_AUTH_*` 详细代码及稳定的 `error.details.reason`。

常见迁移失败：

| 消息                       | details.code                     | details.reason           | 含义                                               |
| -------------------------- | -------------------------------- | ------------------------ | -------------------------------------------------- |
| `device nonce required`    | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客户端未提供 `device.nonce`（或发送空值）。       |
| `device nonce mismatch`    | `DEVICE_AUTH_NONCE_MISMATCH`    | `device-nonce-mismatch`  | 客户端用过期或错误的 nonce 签名。                  |
| `device signature invalid` | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 签名负载与 v2 负载不匹配。                         |
| `device signature expired` | `DEVICE_AUTH_SIGNATURE_EXPIRED` | `device-signature-stale` | 签名时间戳超出允许偏差范围。                       |
| `device identity mismatch` | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 与公钥指纹不匹配。                      |
| `device public key invalid`| `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公钥格式或规范化失败。                             |

迁移目标：

- 始终等待 `connect.challenge`。
- 签名包含服务器 nonce 的 v2 负载。
- 在 `connect.params.device.nonce` 中发送相同的 nonce。
- 推荐的签名负载为 `v3`，除设备/客户端/角色/权限/令牌/nonce 字段外，还绑定位于 `platform` 和 `deviceFamily`。
- 为保证兼容，旧的 `v2` 签名仍被接受，但配对设备元数据绑定用于控制重连时命令策略。

## TLS + 绑定

- WS 连接支持 TLS。
- 客户端可选择绑定网关证书指纹（见 `gateway.tls` 配置及 `gateway.remote.tlsFingerprint` 或 CLI 的 `--tls-fingerprint` 参数）。

## 范围

此协议公开了**完整的网关 API**（状态、通道、模型、聊天、代理、会话、节点、审批等）。确切的接口范围由 `src/gateway/protocol/schema.ts` 中的 TypeBox schema 定义。

## 相关

- [Bridge 协议](/gateway/bridge-protocol)
- [Gateway 运行手册](/gateway)
