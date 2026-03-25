---
summary: "OpenClaw 中的 presence 条目如何产生、合并和显示"
read_when:
  - 调试 Instances 标签页
  - 调查重复或过期的实例行
  - 修改网关 WS 连接或 system-event 信标
title: "Presence（存在状态）"
---

# Presence（存在状态）

OpenClaw 的“presence”是一种轻量级、尽最大努力展示的视图：

- **网关（Gateway）** 本身，以及
- **连接到网关的客户端**（mac 应用、WebChat、CLI 等）

Presence 主要用于渲染 macOS 应用的 **Instances** 标签页，并提供快速的运维人员可视化。

## Presence 字段（显示内容）

Presence 条目是结构化对象，包含如下字段：

- `instanceId`（可选，但强烈推荐）：稳定的客户端身份标识（通常是 `connect.client.instanceId`）
- `host`：易读的主机名
- `ip`：尽力获取的 IP 地址
- `version`：客户端版本字符串
- `deviceFamily` / `modelIdentifier`：硬件提示信息
- `mode`：`ui`、`webchat`、`cli`、`backend`、`probe`、`test`、`node` 等
- `lastInputSeconds`：距离上次用户输入时间的秒数（如果已知）
- `reason`：`self`、`connect`、`node-connected`、`periodic` 等原因标识
- `ts`：最后更新时间戳（自纪元起的毫秒数）

## 产生者（Presence 来源）

Presence 条目由多个来源产生并**合并**。

### 1）网关自有条目

网关启动时总会创建一个“self”条目，确保 UI 在任何客户端连接前就能显示网关主机。

### 2）WebSocket 连接

每个 WS 客户端连接时都会发起 `connect` 请求。握手成功后，网关会更新该连接的 presence 条目。

#### 为何一次性 CLI 命令不会显示

CLI 常用于短暂的一次性命令。为了避免刷屏，`client.mode === "cli"` **不会**被转换为 presence 条目。

### 3）`system-event` 信标

客户端可以通过 `system-event` 方法发送更丰富的定期信标。mac 应用使用它报告主机名、IP 和 `lastInputSeconds`。

### 4）节点连接（role: node）

当节点通过网关 WebSocket 连接且 `role: node` 时，网关会更新该节点的 presence 条目（流程同其他 WS 客户端）。

## 合并与去重规则（为何 `instanceId` 很重要）

Presence 条目存储于单一内存映射中：

- 条目以 **presence key** 为键。
- 最佳键是稳定的 `instanceId`（来自 `connect.client.instanceId`），可抵抗重启影响。
- 键不区分大小写。

如果客户端未带稳定的 `instanceId` 重新连接，可能会显示为**重复**行。

## TTL 与大小限制

Presence 设计为临时信息：

- **TTL**：超过 5 分钟的条目会被清理
- **最大条目数**：200（最旧的先丢弃）

这样保持列表新鲜，避免内存无限增长。

## 远程/隧道注意事项（回环 IP）

当客户端通过 SSH 隧道 / 本地端口转发连接时，网关可能会看到远程地址为 `127.0.0.1`。为避免覆盖客户端报告的有效 IP，回环远程地址会被忽略。

## 消费者

### macOS Instances 标签页

macOS 应用渲染 `system-presence` 输出，并根据最后更新时间为条目添加状态指示器（活跃/空闲/过期）。

## 调试提示

- 要查看原始列表，请向网关调用 `system-presence`。
- 如果看到重复行：
  - 确认客户端握手时发送了稳定的 `client.instanceId`
  - 确认周期性信标也使用相同的 `instanceId`
  - 查看基于连接的条目是否缺少 `instanceId`（缺少时重复是预期的）
