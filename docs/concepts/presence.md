---
summary: "OpenClaw 的 presence 条目如何生成、合并和显示"
read_when:
  - 调试 Control UI Devices 页面上的实时状态
  - 排查重复或过时的实例行
  - 更改 gateway WS 连接或系统事件信标
title: "Presence"
---

OpenClaw 的 "presence" 是一种轻量级、尽力而为的视图，展示：

- **Gateway** 本身，以及
- **连接到 Gateway 的用户可见客户端**（mac app、WebChat、nodes 等）

Presence 会在 Control UI 的 **Devices** 页面
（位于 **Settings → Devices** 下）以及 macOS app 的 **Instances** 选项卡中呈现实时连接元数据。

本页涵盖 Gateway 客户端名册。要检测你最近使用的 Mac 并将 node 警报路由到那里，请参见
[Active computer presence](/nodes/presence)。

## Presence 字段（显示内容）

Presence 条目是结构化对象，包含如下字段：

- `instanceId` (可选但强烈推荐): 稳定的客户端身份标识（通常是 `connect.client.instanceId`）
- `host`: 人类可读的主机名
- `ip`: 尽力获取的 IP 地址
- `version`: 客户端版本字符串
- `deviceFamily` / `modelIdentifier`: 硬件提示信息
- `mode`: `ui`, `webchat`, `cli`, `backend`, `node`, `probe`, `test`
- `lastInputSeconds`: 距离上次用户输入的秒数（如果已知）
- `reason`: 客户端提供的自由格式字符串；Gateway 本身仅会输出 `self`、`connect` 和 `disconnect`
- `deviceId`, `roles`, `scopes`: 来自 connect 握手的设备身份以及角色/作用域提示
- `ts`: 最后更新时间戳（自 Unix epoch 起的毫秒数）

## 产生者（presence 的来源）

Presence 条目由多个来源产生，并被**合并**。

### 1) Gateway 自身条目

Gateway 会在启动时始终生成一个 "self" 条目，因此即使在没有任何客户端连接之前，UI 也能显示 gateway 主机。

### 2) WebSocket connect

每个 WS 客户端都会以一个 `connect` 请求开始。握手成功后，Gateway 会为该连接 upsert 一条 presence 条目。

#### 为什么临时的控制平面连接不会显示出来

CLI 命令、后端 RPC 客户端和探测通常只会短暂连接。为了避免将这种 churn 在完整的 presence TTL 期间一直保留，处于 `cli`、`backend` 或 `probe` 模式的客户端**不会**被转换为 presence 条目。测试模式客户端会继续被跟踪，因为测试套件会把它们当作真实客户端的替身。

### 3) `system-event` beacon

客户端可以通过 `system-event` 方法发送更丰富的周期性 beacon。mac
应用使用它来报告主机名、IP、版本和存活元数据。物理
输入活动不属于这个通用 beacon；在 [Active computer presence](/nodes/presence) 中描述的、
面向特定用途的原生
node 事件负责它。Mac 会用 `system-presence-clear-last-input` 标记这些 beacon；当前的 Gateway
会使用这个向后兼容的标记来移除从较旧应用中保留的任何输入最近时间。该 beacon 还携带一个固定的 30 天值，以便忽略该标记的旧版 Gateway 会覆盖精确的最近时间，而不是保留它。为了兼容性，这个值不会采样任何新的活动。

### 4) Node 连接（role: node）

当某个 node 通过 Gateway WebSocket 以 `role: node` 连接时，Gateway 会为该 node upsert 一条 presence 条目（与其他 WS 客户端流程相同）。

## 合并 + 去重规则（为什么 `instanceId` 很重要）

Presence 条目存储在一个单一的内存 map 中，键按大小写不敏感方式生成，优先使用以下第一个可用值，按顺序依次为：配对设备 id、`connect.client.instanceId`，或者在最后兜底使用每个连接的 id。

短暂的控制平面客户端完全不纳入跟踪（见上文），因此它们的连接 id 永远不会成为键。对于其他所有客户端，连接 id 的兜底规则意味着：如果某个客户端在没有稳定 `instanceId` 的情况下重新连接，就会显示为一行**重复**记录。

## TTL 和最大容量

Presence 被刻意设计为短暂存在：

- **TTL：** 超过 5 分钟的条目将被清理
- **最大条目数：** 200（最旧的条目会优先被丢弃）

这可以保持列表的新鲜度，并防止内存无限增长。

## 远程/隧道注意事项（回环 IP）

当客户端通过 SSH 隧道 / 本地端口转发连接时，Gateway
可能会将远程地址视为 `127.0.0.1`。为避免将该隧道
地址记录为客户端的 IP，连接处理会对检测到的本地（回环）客户端完全省略 `ip`，
而不是将回环地址写入条目中。

## 消费者

### Control UI Devices 页面

**设备**页面将 `system-presence` 与持久配对和节点记录结合起来。它会优先固定 Gateway 自身的 beacon，并对 live platform、version、model 和 input-recency 元数据使用匹配的设备或实例 ID。

### macOS Instances 选项卡

macOS 应用会渲染 `system-presence` 的输出，并根据最后更新时间的年龄应用一个小型状态指示器（Active/Idle/Stale）。

## 调试提示

- 要查看原始列表，请对 Gateway 调用 `system-presence`。
- 如果看到重复项：
  - 确认客户端在握手中发送了稳定的 `client.instanceId`
  - 确认周期性 beacon 使用了相同的 `instanceId`
  - 检查连接派生的条目是否缺少 `instanceId`（出现重复是预期行为）

## 相关内容

<CardGroup cols={2}>
  <Card title="活动的电脑存在状态" href="/nodes/presence" icon="computer-mouse">
    物理 Mac 输入如何选择一个活动节点并路由连接提醒。
  </Card>
  <Card title="输入指示器" href="/concepts/typing-indicators" icon="ellipsis">
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
