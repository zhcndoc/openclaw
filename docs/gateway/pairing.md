---
summary: "适用于 iOS 和其他远程节点的网关拥有节点配对（方案 B）"
read_when:
  - 实现无 macOS UI 的节点配对审批
  - 增加远程节点审批的 CLI 流程
  - 扩展网关协议以实现节点管理
title: "网关拥有配对"
---

# 网关拥有配对（方案 B）

在网关拥有配对中，**网关** 是允许哪些节点加入的唯一权威。UI（macOS 应用、未来的客户端）只是前端，用于批准或拒绝待处理请求。

**重要：** WS 节点在 `connect` 时使用 **设备配对**（角色为 `node`）。`node.pair.*` 是一个独立的配对存储，并不作为 WS 握手的门禁。只有显式调用 `node.pair.*` 的客户端才使用此流程。

## 概念

- **待处理请求**：节点请求加入，需审批。
- **已配对节点**：已获批准并下发认证令牌的节点。
- **传输层**：网关 WS 端点转发请求，但不决定成员资格。（传统 TCP 桥接支持已弃用/移除。）

## 配对流程

1. 节点连接到网关 WS 并请求配对。
2. 网关存储一个 **待处理请求** 并发出 `node.pair.requested` 事件。
3. 你审批或拒绝该请求（CLI 或 UI）。
4. 批准后，网关下发一个 **新令牌**（令牌在重新配对时轮换）。
5. 节点使用该令牌重新连接，现已“配对”。

待处理请求将在 **5 分钟** 后自动过期。

## CLI 工作流（适合无头环境）

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes rename --node <id|name|ip> --name "客厅 iPad"
```

`nodes status` 显示已配对/已连接节点及其功能。

## API 接口（网关协议）

事件：

- `node.pair.requested` — 新的待处理请求创建时触发。
- `node.pair.resolved` — 请求被批准/拒绝/过期时触发。

方法：

- `node.pair.request` — 创建或重用待处理请求。
- `node.pair.list` — 列出待处理及已配对节点。
- `node.pair.approve` — 批准待处理请求（下发令牌）。
- `node.pair.reject` — 拒绝待处理请求。
- `node.pair.verify` — 验证 `{ nodeId, token }`。

备注：

- `node.pair.request` 针对单个节点是幂等的：重复调用返回相同待处理请求。
- 批准**总是**生成新的令牌；`node.pair.request` 不会返回任何令牌。
- 请求可以包含 `silent: true`，作为自动批准流程的提示。

## 自动批准（macOS 应用）

macOS 应用可以选择在以下情况下尝试**静默批准**：

- 请求标记为 `silent`，且
- 应用能通过同一用户验证 SSH 连接到网关主机。

若静默批准失败，则回退到常规的“批准/拒绝”提示。

## 存储（本地、私有）

配对状态存储于网关状态目录下（默认 `~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

若覆盖 `OPENCLAW_STATE_DIR`，则 `nodes/` 目录随之移动。

安全提示：

- 令牌是秘密信息，需将 `paired.json` 视为敏感文件。
- 轮换令牌需要重新批准（或删除节点条目）。

## 传输层行为

- 传输层是**无状态**的；不存储成员资格。
- 如果网关离线或配对被禁用，节点无法配对。
- 如果网关处于远程模式，配对仍针对远程网关的存储进行。
