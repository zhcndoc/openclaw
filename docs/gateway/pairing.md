---
summary: "适用于 iOS 和其他远程节点的网关拥有节点配对（方案 B）"
read_when:
  - 实现无 macOS UI 的节点配对审批
  - 添加用于审批远程节点的 CLI 流程
  - 扩展网关协议以支持节点管理
title: "Gateway-owned pairing"
---

在网关拥有的配对中，**Gateway** 是哪些节点被允许加入的事实来源。UI（macOS 应用、未来的客户端）只是用于批准或拒绝待处理请求的前端。

**重要：** WS 节点在 `connect` 时使用 **设备配对**（角色为 `node`）。`node.pair.*` 是一个独立的配对存储，并不作为 WS 握手的门禁。只有显式调用 `node.pair.*` 的客户端才使用此流程。

## 概念

- **待处理请求**：节点请求加入；需要批准。
- **已配对节点**：已批准并发放了认证令牌的节点。
- **传输层**：网关 WS 端点转发请求但不决定成员资格。（已移除旧版 TCP 桥接支持。）

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
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` 显示已配对/已连接节点及其功能。

## API 接口（网关协议）

事件：

- `node.pair.requested` — 新的待处理请求创建时触发。
- `node.pair.resolved` — 请求被批准/拒绝/过期时触发。

方法：

- `node.pair.request` — 创建或复用一个待处理请求。
- `node.pair.list` — 列出待处理 + 已配对节点（`operator.pairing`）。
- `node.pair.approve` — 批准一个待处理请求（发放令牌）。
- `node.pair.reject` — 拒绝一个待处理请求。
- `node.pair.remove` — 删除一个过期的已配对节点条目。
- `node.pair.verify` — 验证 `{ nodeId, token }`。

备注：

- `node.pair.request` 对每个节点是幂等的：重复调用返回相同的待处理请求。
- 对同一待处理节点的重复请求也会刷新存储的节点元数据和最新允许列表声明的命令快照，以便操作员可见。
- 批准**总是**生成新令牌；`node.pair.request` 从不返回令牌。
- 请求可能包含 `silent: true` 作为自动批准流程的提示。
- `node.pair.approve` 使用待处理请求声明的命令来执行额外的批准范围：
  - 无命令请求：`operator.pairing`
  - 非执行命令请求：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which` 请求：`operator.pairing` + `operator.admin`

<Warning>
节点配对是一个信任与身份流程以及令牌签发流程。它**不会**按节点固定实时节点命令表面。

- 实时节点命令来自节点在连接时声明的内容，并在应用网关的全局节点命令策略（`gateway.nodes.allowCommands` 和 `denyCommands`）后生效。
- 节点级 `system.run` allow 和 ask 策略位于节点上的 `exec.approvals.node.*` 中，而不是配对记录中。
</Warning>

## 节点命令门禁 (2026.3.31+)

<Warning>
**破坏性变更：** 从 `2026.3.31` 开始，节点命令被禁用，直到节点配对被批准。仅设备配对不再足以暴露声明的节点命令。
</Warning>

当节点首次连接时，会自动请求配对。在配对请求被批准之前，来自该节点的所有待处理节点命令都会被过滤且不会执行。一旦通过配对批准建立信任，节点声明的命令将在正常命令策略下可用。

这意味着：

- 以前仅依赖设备配对来暴露命令的节点现在必须完成节点配对。
- 配对批准前排队的命令会被丢弃，而不是延迟。

## 节点事件信任边界 (2026.3.31+)

<Warning>
**破坏性变更：** 节点发起的运行现在保持在减少的信任表面上。
</Warning>

节点发起的摘要和相关会话事件被限制在预期的信任表面上。以前依赖更广泛的主机或会话工具访问的通知驱动或节点触发流程可能需要调整。此强化确保节点事件无法升级到超出节点信任边界允许的主机级工具访问。

## 自动批准（macOS 应用）

macOS 应用可以选择在以下情况下尝试**静默批准**：

- 请求标记为 `silent`，且
- 应用能通过同一用户验证 SSH 连接到网关主机。

若静默批准失败，则回退到常规的“批准/拒绝”提示。

## 元数据升级自动批准

当一个已配对设备重新连接时，如果只有非敏感元数据发生变化
（例如显示名称或客户端平台提示），OpenClaw 会将其视为 `metadata-upgrade`。静默自动批准的范围很窄：它仅适用于
已通过 loopback 证明持有共享令牌或密码的受信任本地 CLI/辅助程序重新连接。
浏览器/控制 UI 客户端和远程客户端仍然使用显式重新批准流程。范围升级（读到
写/管理员）和公钥变更**不**符合元数据升级自动批准的条件——它们仍然作为显式重新批准请求处理。

## QR 配对辅助

`/pair qr` 会将配对载荷渲染为结构化媒体，以便移动端和
浏览器客户端可以直接扫描。

删除设备时也会清理该
设备 ID 的任何过时待处理配对请求，因此 `nodes pending` 不会在撤销后显示孤立行。

## 本地性和转发头

网关配对只有在原始套接字
和任何上游代理证据都一致时，才会将连接视为 loopback。若请求到达 loopback，
但携带指向非本地来源的 `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` 头，
则这些转发头证据会使 loopback 本地性声明失效。随后配对路径将要求显式批准，
而不会静默地将该请求视为同主机连接。参见
[Trusted Proxy Auth](/gateway/trusted-proxy-auth) 了解
操作员认证上的等效规则。

## 存储（本地、私有）

配对状态存储于网关状态目录下（默认 `~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

若覆盖 `OPENCLAW_STATE_DIR`，则 `nodes/` 目录随之移动。

安全提示：

- 令牌是秘密信息，需将 `paired.json` 视为敏感文件。
- 轮换令牌需要重新批准（或删除节点条目）。

## 传输层行为

- 传输层是**无状态**的；它不存储成员资格。
- 如果 Gateway 离线或配对被禁用，节点将无法配对。
- 如果 Gateway 处于远程模式，配对仍会针对远程 Gateway 的存储进行。

## 相关内容

- [Channel pairing](/channels/pairing)
- [Nodes](/nodes)
- [Devices CLI](/cli/devices)
