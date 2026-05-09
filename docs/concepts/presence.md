---
summary: "OpenClaw 的 presence 条目如何生成、合并和显示"
read_when:
  - 调试 Instances 选项卡
  - 排查重复或陈旧的实例行
  - 更改 gateway WS 连接或 system-event beacon
title: "Presence"
---

OpenClaw 的 "presence" 是一种轻量级、尽力而为的视图，展示：

- **Gateway** 本身，以及
- **连接到 Gateway 的客户端**（mac 应用、WebChat、CLI 等）

Presence 主要用于渲染 macOS 应用的 **Instances** 选项卡，并为操作人员提供快速可视化信息。

## Presence 字段（显示内容）

Presence 条目是结构化对象，包含如下字段：

- `instanceId`（可选，但强烈建议）：稳定的客户端身份标识（通常是 `connect.client.instanceId`）
- `host`：易读的主机名
- `ip`：尽力而为的 IP 地址
- `version`：客户端版本字符串
- `deviceFamily` / `modelIdentifier`：硬件提示
- `mode`：`ui`、`webchat`、`cli`、`backend`、`probe`、`test`、`node`、...
- `lastInputSeconds`："距离上次用户输入的秒数"（如果已知）
- `reason`：`self`、`connect`、`node-connected`、`periodic`、...
- `ts`：最后更新时间戳（自 epoch 起的毫秒数）

## 产生者（presence 的来源）

Presence 条目由多个来源产生，并被**合并**。

### 1) Gateway 自身条目

Gateway 会在启动时始终生成一个 "self" 条目，因此即使在没有任何客户端连接之前，UI 也能显示 gateway 主机。

### 2) WebSocket connect

每个 WS 客户端都会以一个 `connect` 请求开始。握手成功后，Gateway 会为该连接 upsert 一条 presence 条目。

#### 为什么一次性 CLI 命令不会显示出来

CLI 通常只为短暂的、一次性的命令而连接。为了避免刷屏 Instances 列表，`client.mode === "cli"` **不会** 转换为 presence 条目。

### 3) `system-event` beacon

客户端可以通过 `system-event` 方法发送更丰富的周期性 beacon。mac 应用使用它来报告主机名、IP 和 `lastInputSeconds`。

### 4) Node 连接（role: node）

当某个 node 通过 Gateway WebSocket 以 `role: node` 连接时，Gateway 会为该 node upsert 一条 presence 条目（与其他 WS 客户端流程相同）。

## 合并 + 去重规则（为什么 `instanceId` 很重要）

Presence 条目存储在一个单独的内存 map 中：

- 条目以一个 **presence key** 作为键。
- 最佳键是稳定的 `instanceId`（来自 `connect.client.instanceId`），它在重启后仍然保持不变。
- 键不区分大小写。

如果客户端在没有稳定 `instanceId` 的情况下重新连接，它可能会显示为一行**重复**条目。

## TTL 和最大容量

Presence 是刻意设计为短暂存在的：

- **TTL：** 超过 5 分钟的条目会被清理
- **最大条目数：** 200（优先丢弃最旧的）

这样可以保持列表新鲜，并避免内存无限增长。

## 远程/隧道注意事项（回环 IP）

当客户端通过 SSH 隧道 / 本地端口转发连接时，Gateway 可能会将远程地址视为 `127.0.0.1`。为了避免覆盖客户端报告的有效 IP，会忽略回环远程地址。

## 消费者

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
  <Card title="Typing indicators" href="/concepts/typing-indicators" icon="ellipsis">
    输入指示器何时发送，以及如何调整它们。
  </Card>
  <Card title="Streaming and chunking" href="/concepts/streaming" icon="bars-staggered">
    出站流式传输、分块以及按通道格式化。
  </Card>
  <Card title="Gateway architecture" href="/concepts/architecture" icon="diagram-project">
    Gateway 组件以及驱动 presence 更新的 WebSocket 协议。
  </Card>
  <Card title="Gateway protocol" href="/gateway/protocol" icon="plug">
    `connect`、`system-event` 和 `system-presence` 的线协议。
  </Card>
</CardGroup>
