---
summary: "存在快照、节点主机统计信息和广播事件范围"
read_when:
  - "在客户端中呈现节点存在或主机统计信息"
  - "确定会话接收哪些广播事件"
title: "网关协议存在和事件"
sidebarTitle: "出席和活动"
doc-schema-version: 1
---

网关如何报告哪些节点已连接，以及哪些服务器推送的事件到达给定会话。

## <a id="presence"></a> 在线状态

- `system-presence` 返回按设备标识键入的条目，包括 `deviceId`、`roles` 和 `scopes`，因此即使设备同时作为操作员和节点连接，UI 也可以为每个设备显示一行。
- `node.list` 包含可选的 `lastSeenAtMs` 和 `lastSeenReason`。已连接的节点会以 `connect` 作为原因，报告当前连接时间；已配对的节点还可以通过受信任的节点事件报告持久的后台在线状态。

本机 macOS 节点还可以发送经过身份验证的 `node.presence.activity` 事件，具有有限的输入空闲时间和可选的 `source`：`app`，用于与 OpenClaw 或 `system` 进行交互，以进行系统范围的物理活动。应用程序本地报告不需要辅助功能；全系统报告确实如此。省略的源保留了遗留的系统范围权限要求。网关根据自己的时钟获取活动时间戳，通过 `node.list` 和 `node.describe` 公开最新连接的 Mac，并向读取范围的客户端广播 `node.presence` 更新。

当禁用系统范围的检测时，应用程序会发送 `{ "action": "clear" }`，然后报告任何观察到的应用程序本地活动。当可访问性丢失时，它会回退到应用程序本地活动，或者如果未观察到任何情况，则会清除样本。网关仅清除经过确切身份验证的节点连接的时间戳。在此确认操作之前的网关将其返回为未处理，因此 Mac 节点重新连接一次，并让断开连接清理删除旧的连接状态。有关选择、隐私、模型上下文和通知路由行为，请参阅 [ 活动计算机状态 ](/nodes/presence)。

### <a id="node-host-stats"></a> Node 主机统计信息

连接的 CLI 节点主机和 macOS 应用程序的共享节点主机工作线程在连接后立即发送资源快照，然后每 60 秒发送一次。他们用 `event: "node.host.stats"` 和一个对象 `payload`（或其 `payloadJSON` 中的 JSON 编码）调用 `node.event`：

```json
{
  "event": "node.host.stats",
  "payload": {
    "cpuCount": 8,
    "loadAverage": [1.25, 1.1, 0.9],
    "memoryTotalBytes": 17179869184,
    "memoryFreeBytes": 4294967296,
    "diskTotalBytes": 1000000000000,
    "diskAvailableBytes": 250000000000
  }
}
```

`cpuCount` 是 1 到 4096 之间的整数。可选 `loadAverage` 包含 1 分钟、5 分钟和 15 分钟平均值，每个平均值均有限且介于 0 到 100000 之间。Windows 没有负载平均值；当所有三个读数都为零时，主机忽略该字段。内存和磁盘值是非负整数字节，空闲或可用字节不大于其总数。在 macOS 上，`memoryFreeBytes` 包含可回收的主机内存，因此空闲文件缓存不会报告为已使用；其他平台保留主机范围的可用内存读数。仅当主机可以读取包含其主目录的卷的容量时，磁盘字段才会一起出现，而与工作线程的当前目录无关。

网关仅接受来自当前节点连接的更新，并用自己的接收时间标记 `updatedAtMs`；节点从不发送时间戳。成功的更新在 `node.list` 和 `node.describe` 中显示为 `hostStats`，并使用 `dropIfSlow: true` 将 `node.hostStats` 和 `{ nodeId, hostStats }` 广播到读取范围的运算符。统计数据面向操作员，不会更新模型可见的节点上下文。收到后，网关会将快照保留为配对节点记录上的 `lastHostStats`。在没有新快照的情况下断开或重新连接将保持先前的值不变。 `node.list` 和 `node.describe` 在连接时使用实时会话统计信息，并在离线时将保存的快照投影为 `hostStats`，保留其原始 `updatedAtMs`，以便客户端可以显示最后已知的年龄。

结构化 `node.event` 结果使用 `reason: "updated"`、`"stale_connection"` 或 `"invalid_payload"`。较旧的网关可能会返回 `handled: false`；节点以正常节奏继续，而不立即重试。

### <a id="node-background-alive-event"></a> Node 后台活动事件

节点通过 `event: "node.presence.alive"` 调用 `node.event` 来记录配对节点在后台唤醒期间处于活动状态，而不将其标记为已连接：

```json
{
  "event": "node.presence.alive",
  "payloadJSON": "{\"trigger\":\"silent_push\",\"sentAtMs\":1737264000000,\"displayName\":\"Peter's iPhone\",\"version\":\"2026.4.28\",\"platform\":\"iOS 18.4.0\",\"deviceFamily\":\"iPhone\",\"modelIdentifier\":\"iPhone17,1\",\"pushTransport\":\"relay\"}"
}
```

`trigger` 是一个封闭枚举：`background`、`silent_push`、`bg_app_refresh`、 `significant_location`、`manual`、`connect`。未知值会规范化为 `background`（`src/shared/node-presence.ts`）。该事件仅会为经过身份验证的节点设备会话持久化；无设备或未配对的会话会返回 `handled: false`。

成功的网关会返回结构化结果：

```json
{
  "ok": true,
  "event": "node.presence.alive",
  "handled": true,
  "reason": "persisted"
}
```

对于 `node.event`，较旧的网关可能仅返回 `{ "ok": true }`；将其视为公认的 RPC，而不是持久存在。

## <a id="broadcast-event-scoping"></a> 广播事件作用域

服务器推送的广播事件受作用域限制，因此配对作用域或仅限节点的会话不会被动接收会话内容 （`src/gateway/server-broadcast.ts`）：

- 聊天、代理和工具结果帧（流式传输的 `agent` 事件、工具结果事件）至少需要 `operator.read`。不具备该作用域的会话会完全跳过这些帧。
- 默认情况下，插件定义的 `plugin.*` 广播受限于 `operator.write` 或 `operator.admin`；`plugin.approval.requested` / `plugin.approval.resolved` 等显式条目则使用 `operator.approvals`。
- 存在事件需要操作员读取访问权限（`operator.read`，`operator.write`或`operator.admin`也满足）。针对每个收件人过滤监视会话引用，包括 hello 快照和 `system-presence` 回复。
- Transport 事件（例如 `heartbeat` 和 `tick`）对每个经过身份验证的会话仍然可用。
- 未知的广播事件系列将被阻止，除非调用者具有所需的范围，除非已注册的处理程序显式放宽它们。

每个客户端连接都维护自己的客户端序列号，因此即使不同客户端看到的事件流子集因作用域过滤而不同，广播在各自的套接字上仍会保持单调有序。

`hello-ok.features.capabilities` 宣传附加线合同。仅当 `session-scoped-chat-metadata` 存在时，本机客户端才在 `chat.metadata` 中发送 `sessionKey`；否则，他们保留稳定版 `v2026.7.1-2` 支持的仅代理请求。该较旧的响应描述了代理范围内的可用性，而不是会话的选定配置文件。仅当支持的最低网关合约保证会话范围的元数据时，才取消此协商。仅存在方法或事件是不够的。
