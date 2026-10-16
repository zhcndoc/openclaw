---
summary: "OpenClaw 的 presence 条目如何生成、合并和显示"
read_when:
  - "调试 Control UI Devices 页面上的实时状态"
  - "排查重复或过时的实例行"
  - "更改 gateway WS 连接或系统事件信标"
title: "在场"
---

OpenClaw 的 "presence" 是一种轻量级、尽力而为的视图，展示：

- **Gateway** 本身，以及
- **连接到 Gateway 的用户可见客户端**（mac app、WebChat、nodes 等）

Presence 会在 Control UI 的 **Devices** 页面 （位于 **Settings → Devices** 下）以及 macOS app 的 **Instances** 选项卡中呈现实时连接元数据。

本页涵盖 Gateway 客户端名册。要检测你最近使用的 Mac 并将 node 警报路由到那里，请参见 [Active computer presence](/nodes/presence)。

## <a id="ask-the-agent-about-presence"></a> 询问代理是否在场

核心 `presence` 工具读取人员、其连接的客户端和设备以及观察到的活动的当前快照。它适用于个人和共享网关，无需 shell 访问。通过网关 RPC 可以使用与 `presence.query` 相同的读取模型。

| 参数  | 含义                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| `action`   | `list`（默认）、`person` 或 `device`。                                                                      |
| `person`   | `person` 需要：`me`、返回的 person/profile、ID 或明确的显示名称。                    |
| `deviceId` | `device` 需要：存在返回的设备 ID。                                                      |
| `include`  | 可选阵列 `devices`、`network` 和 `location`。网络和位置详细信息还包括设备行。 |
| `limit`    | 列表中的最大人数，从 1 到 100；默认值 50。识别截断的结果。                        |

示例：

```json
{ "action": "list" }
```

```json
{ "action": "person", "person": "me", "include": ["devices"] }
```

```json
{ "action": "person", "person": "Alex", "include": ["network", "location"] }
```

`list` 包括请求者，并为每个连接的身份返回一行，而不是每个浏览器选项卡返回一行。 `me` 使用请求轮流的经过身份验证的人员，包括远程工作人员。名字不明确的候选人返回；身份不明的轮流收到 `me` 的 `identity-unavailable`。

设备活动保留其源：`openclaw-interaction`、`app-input` 或 `system-input`。人员的活动摘要标识与他们最近观察到的活动关联的设备。没有经过身份验证的人员关联的设备保持独立；使用 `list` 和 `devices` 来检查共享或未识别的计算机。浏览器客户端不一定识别物理计算机，并且匹配的名称或 IP 地址永远不会建立该关联。

结果包括`observedAt`；缺失的活动是 `null`，不是某人不活动的证据。在线意味着已连接，包括空闲选项卡。这是实时存在，而不是保留的活动历史记录：断开连接的设备和之前的网关进程不会建立历史上上次使用的计算机。

`network` 包括观察到的连接 IP（如果可用）。 `location` 懒惰地使用现有的 [geolocation 插件 ](/plugins/geolocation)，返回粗略的 IP 地理位置以及来源归属。缺少结果和无法提供服务是截然不同的。时区仍由客户报告； IP 地理位置可以描述 VPN 或网络出口。 Presence 永远不会请求 GPS 或更改设备权限。

经过身份验证的呼叫者需要与在线名册相同的 `operator.read` 访问权限。受信任的本地操作员轮流、配置的通道所有者和操作员拥有的计划运行也可以在其源权限保持活动状态时查询是否存在。没有读取访问权限的其他频道调用者和请求者拥有的时间表无法查询名册。该工具不会公开监视会话引用或授予设备控制权。兼容的远程工作人员将读取的内容转发到他们的接纳网关；连接到网关但不具有在线功能的工作人员会忽略该工具。

从CLI查询相同的快照：

```bash
openclaw gateway call presence.query --params '{"action":"person","person":"me","include":["devices"]}' --json
```

## <a id="presence-fields-(what-shows-up)"></a><a id="presence-fields-what-shows-up"></a> Presence 字段（显示内容）

Presence 条目是结构化对象，包含如下字段：

- `instanceId` (可选但强烈推荐): 稳定的客户端身份标识（通常是 `connect.client.instanceId`）
- `host`: 人类可读的主机名
- `clientId`：来自接受的连接的客户端类型，与其显示名称分开；人员卡使用它来区分 **Terminal** 和本机 **App**
- `ip`：尽力IP地址。 [地理定位插件](/plugins/geolocation)将其解析为一个可用的粗略城市
- `version`: 客户端版本字符串
- `deviceFamily` / `modelIdentifier`: 硬件提示信息
- `timeZone`：自报告IANA区域，例如`Europe/Vienna`。浏览器在连接期间报告它。当连接 IP 为环回、隧道或 CGNAT 时，它仍然有用
- `mode`: `ui`, `webchat`, `cli`, `backend`, `node`, `probe`, `test`
- `lastInputSeconds`: 距离上次用户输入的秒数（如果已知）
- `reason`：客户端提供的自由格式字符串。网关本身仅发出 `self`、`connect` 和 `disconnect`
- `deviceId`、`roles`、`scopes`：来自连接握手的设备标识和 role/scope 提示
- `ts`：上次存在更新时间戳（自纪元以来的毫秒数），包括心跳更新。这不是用户活动时间戳
- `onlineSince`：经过身份验证的人当前连续在线时间的开始，在重叠连接之间共享
- `lastActivityAt`：在线期间最新观察到的接受的交互。在观察到活动之前它不存在
- `connectionLastActivityAt`：在全人聚合之前，此确切客户端连接上最新接受的交互
- `connectionId`：当前连接的网关分配标识
- `watchedSessions`：客户端明确声明其正在查看的会话密钥，为收件人进行过滤

## <a id="who-can-see-presence"></a> 谁可以看到存在

存在名册与具有 `operator.read` 访问权限的操作员共享。 `operator.write` 和 `operator.admin` 还授予读取访问权限。读者可以看到其他人的在线和活动时间并报告`timeZone`，包括没有观看会话的人。 Node 连接、仅配对操作员和其他没有读取访问权限的连接在连接快照中收到空存在名册，并且没有 `presence` 事件。 `system-presence` RPC 需要相同的操作员读取访问权限。

使用与 `sessions.list` 相同的可见性规则单独过滤每个收件人的观看会话引用。隐藏或丢失的会话将被完全省略，没有计数或占位符。此过滤适用于连接快照、`system-presence` 响应和存在事件。被查看的人不会授予收件人访问其会话的权限。

草稿、隐身会话和操作员角色限制遵循这些列表规则。即使对于管理员来说，丢失或删除的参考文献也会被忽略。密钥保留其代理范围，包括代理限定的 `global` 和 `unknown` 引用。等待经过身份验证的个人资料验证的非管理员读者会收到个人元数据，但不会收到观看的参考资料。已建立的管理员授权保留管理员列表的可见性。当没有可见的引用时，`watchedSessions` 被省略。消息订阅本身并不能声明查看者的存在。

此策略不会更改读取器之间共享的 IP 地址，也不会隔离所有网关元数据。当读者不能看到彼此的存在或其他共享元数据时，请使用单独的网关信任边界。

## <a id="producers-(where-presence-comes-from)"></a><a id="producers-where-presence-comes-from"></a> 产生者（presence 的来源）

Presence 条目由多个来源产生，并被**合并**。

### <a id="1)-gateway-self-entry"></a><a id="1-gateway-self-entry"></a> 1) Gateway 自身条目

网关始终在启动时植入一个“自身”条目，因此即使在任何客户端连接之前，UI 也会显示网关主机。

### <a id="2)-websocket-connect"></a><a id="2-websocket-connect"></a> 2） WebSocket 连接

每个 WS 客户端都会以一个 `connect` 请求开始。握手成功后，Gateway 会为该连接 upsert 一条 presence 条目。

#### <a id="why-ephemeral-control-plane-connections-do-not-show-up"></a> 为什么临时的控制平面连接不会显示出来

CLI 命令、后端 RPC 客户端和检查通常会短暂连接。为了避免保留完全在线状态 TTL 的流失，`cli`、`backend` 或 `probe` 模式中的客户端将 **not** 转换为在线状态条目。测试模式客户端会被跟踪，因为测试套件将它们用作真实客户端的替身。

### <a id="3)-system-event-beacons"></a><a id="3-system-event-beacons"></a> 3） `system-event` 信标

客户端可以通过`system-event`方法发送更丰富的周期性信标。 Mac 应用程序使用它来报告主机名、IP、版本和活动元数据。计算机输入活动不是此通用信标的一部分。 [活动计算机存在](/nodes/presence)中描述的特定目的本机节点事件拥有它。 Mac 用 `system-presence-clear-last-input` 标记这些信标。当前的网关使用向后兼容的标记来删除旧应用程序中保留的任何输入新近度。该信标还带有固定的 30 天值，因此忽略该标签的旧网关会覆盖确切的新近度而不是保留它。不会针对此兼容性值对新活动进行采样。

### <a id="4)-node-connects-(role%3A-node)"></a><a id="4-node-connects-role-node"></a> 4) Node 连接（role: node）

当某个 node 通过 Gateway WebSocket 以 `role: node` 连接时，Gateway 会为该 node upsert 一条 presence 条目（与其他 WS 客户端流程相同）。

## <a id="connection-rows-and-beacon-deduplication"></a> 连接行和信标重复数据删除

存在条目存储在具有不区分大小写键的单个内存映射中。用户 WebSocket 客户端每个连接只有一行，因此监视不同会话的两个选项卡不能相互覆盖。 Node 连接使用其设备 ID，然后使用 `connect.client.instanceId`，最后使用连接 ID。

`system-event` 信标在提供时按设备 ID 或实例 ID 合并，否则按解析的主机或其他信标元数据合并。稳定的 `instanceId` 可以帮助消费者将行与同一客户端关联起来。它不会合并单独的用户 WebSocket 连接。临时控制平面客户端完全被排除在跟踪之外。

Control UI 在显示人员时按记录的身份命名空间对连接行进行分组。具有相同合格配置文件身份的连接共享一个人。具有相同原始 ID 的不合格连接形成一个单独的组。与配置文件 ID 匹配的原始 ID 绝不会合并其观看的会话、连接事实或观看者计数。网关对 online/activity 计时和协作打字计数使用相同的命名空间边界。重叠的选项卡仅在其名称空间内共享计时事实。如果原始选项卡获得配置文件资格，则后续活动将保持独立。在线名册包括您自己的关联身份。会话查看器指示器会根据经过身份验证的用户记录的资格将您排除在外，仅当该用户不可用时才使用当前连接。只有具有确切合格配置文件身份的显示所有者才会从会话的实时查看者中删除重复数据。 [ 人员卡](/concepts/multi-user#people-cards) 将在线持续时间和观察到的活动与每个条目的心跳新鲜度分开。

接受的交互（包括打字）会更新该人的每个实时连接的确切活动时间戳。仅活动存在事件最多合并为每个身份每 30 秒一个。第一个观察到的活动以及该窗口之后的活动安排发布；连接、断开连接、配置文件和监视会话更改共享一个锚定到第一个待处理更改的 200 毫秒发布窗口。稍后的更改不会推迟它。 Hello 快照和 `system-presence` 回复立即读取当前状态。因此，人员卡的活动年龄可以滞后最近一次交互不到 30 秒。新快照和 `system-presence` 读取包括最新存储的时间戳。

## <a id="online-and-recent-activity"></a> 在线和近期活动

关联人为 **Online**。活动是一个单独的、最近的交互提示：

- **Active：** 不到两分钟前观察到可接受的交互。
- **Idle：** 观察到交互，但至少已有两分钟历史。
- **Online** 没有活动标签：没有可用的交互时间戳。人员卡显示 **Activity unavailable**，而不是猜测活动或空闲。

侧边栏使活跃的人变得闲置，而无需等待另一个网关更新。该卡将连续在线持续时间与 **最后交互** 分开。 UI 活动标签在个人的实时、身份认证连接中使用最新的 OpenClaw 交互。心跳和本机输入新近度无法确定此标签。代理的存在查询还公开本机设备活动及其源，因此它可以识别最近使用的连接机器，而无需将本机输入视为与 OpenClaw 的交互。

Control UI 报告其初始前台访问以及受限制的键盘、指针和滚动交互。自动重新连接、后台选项卡、传入消息和后台请求不算作新交互。不报告交互的客户端仍然可以在线。这描述了最近对 OpenClaw 的使用，而不是物理存在或关注：有人在不互动的情况下阅读可能会变得无所事事。单独的本机 [ 活动计算机信号 ](/nodes/presence) 无法识别个人。

## <a id="ttl-and-bounded-size"></a> TTL 和最大容量

Presence 被刻意设计为短暂存在：

- **TTL：** 超过 5 分钟的条目将被清理
- **最大条目数：** 200（最旧的条目会优先被丢弃）

这可以保持列表的新鲜度，并防止内存无限增长。

到期和驱逐使用心跳的挂钟时间戳。主机时钟校正可能会保留陈旧的行或使新的行提前过期。完整状态更新或重新连接重新发布当前元数据；当墙上时间赶上或重新启动时，陈旧的行会被清除。存在即是最大的努力；它不授予设备权限。

## <a id="remote%2Ftunnel-caveat-(loopback-ips)"></a><a id="remote/tunnel-caveat-loopback-ips"></a> Remote/tunnel 警告（环回 IP）

当客户端通过 SSH 隧道 / 本地端口转发连接时，Gateway 可能会将远程地址视为 `127.0.0.1`。为避免将该隧道地址记录为客户端的 IP，连接处理会对检测到的本地（回环）客户端完全省略 `ip`， 而不是将回环地址写入条目中。

## <a id="consumers"></a> 消费者

### <a id="control-ui-devices-page"></a> Control UI Devices 页面

**Devices** 页面将 `system-presence` 与持久配对和节点记录结合在一起。它首先固定网关自身信标，并使用匹配的设备或实例 ID 来获取实时平台、版本、模型和输入新近度元数据。

### <a id="macos-instances-tab"></a> macOS Instances 选项卡

macOS 应用会渲染 `system-presence` 的输出，并根据最后更新时间的年龄应用一个小型状态指示器（Active/Idle/Stale）。

## <a id="debugging-tips"></a> 调试提示

- 要查看为您的连接投影的列表，请针对网关调用 `system-presence`。
- 如果看到重复项：
  - 确认客户端在握手中发送了稳定的 `client.instanceId`
  - 确认周期性 beacon 使用了相同的 `instanceId`
  - 检查多个选项卡或重新连接。单独的用户连接具有单独的行，旧行在 TTL 之后过期

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="活动电脑存在" href="/nodes/presence" icon="computer-mouse">
    物理 Mac 输入如何选择一个活动节点并路由连接提醒。
  </Card>
  <Card title="输入中指示器" href="/concepts/typing-indicators" icon="ellipsis">
    何时发送输入指示器，以及如何调整它们。
  </Card>
  <Card title="流式传输与分块" href="/concepts/streaming" icon="bars-staggered">
    出站流式传输、分块以及按通道格式化。
  </Card>
  <Card title="网关架构" href="/concepts/architecture" icon="diagram-project">
    网关组件以及驱动 presence 更新的 WebSocket 协议。
  </Card>
  <Card title="网关协议" href="/gateway/protocol" icon="plug">
    `connect`、`system-event` 和 `system-presence` 的线协议。
  </Card>
</CardGroup>
