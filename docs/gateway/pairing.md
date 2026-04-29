---
summary: "面向 iOS 和其他远程节点的网关拥有的节点配对（选项 B）"
read_when:
  - 在没有 macOS UI 的情况下实现节点配对审批
  - 添加用于批准远程节点的 CLI 流程
  - 用节点管理扩展网关协议
title: "网关拥有的配对"
---

在网关拥有的配对中，**Gateway** 是哪些节点被允许加入的事实来源。UI（macOS 应用、未来客户端）只是用于批准或拒绝待处理请求的前端。

**重要：** WS 节点在 `connect` 期间使用的是**设备配对**（角色 `node`）。`node.pair.*` 是一个独立的配对存储，并且**不会**限制 WS 握手。只有显式调用 `node.pair.*` 的客户端才会使用此流程。

## 概念

- **待处理请求**：节点请求加入；需要批准。
- **已配对节点**：已批准并签发认证令牌的节点。
- **传输层**：Gateway WS 端点会转发请求，但不决定成员资格。（已移除对旧 TCP bridge 的支持。）

## 配对如何工作

1. 节点连接到 Gateway WS 并请求配对。
2. Gateway 存储一个**待处理请求**并发出 `node.pair.requested`。
3. 你批准或拒绝该请求（CLI 或 UI）。
4. 批准后，Gateway 签发一个**新令牌**（重新配对时令牌会轮换）。
5. 节点使用该令牌重新连接，然后就变成“已配对”。

待处理请求会在 **5 分钟**后自动过期。

## CLI 工作流（适合无头环境）

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name "客厅 iPad"
```

`nodes status` 会显示已配对/已连接的节点及其能力。

## API 表面（gateway 协议）

事件：

- `node.pair.requested` — 在创建新的待处理请求时发出。
- `node.pair.resolved` — 在请求被批准/拒绝/过期时发出。

方法：

- `node.pair.request` — 创建或复用一个待处理请求。
- `node.pair.list` — 列出待处理 + 已配对节点（`operator.pairing`）。
- `node.pair.approve` — 批准一个待处理请求（签发令牌）。
- `node.pair.reject` — 拒绝一个待处理请求。
- `node.pair.remove` — 移除一条过期的已配对节点记录。
- `node.pair.verify` — 验证 `{ nodeId, token }`。

注意：

- `node.pair.request` 对每个节点都是幂等的：重复调用会返回同一个待处理请求。
- 对同一待处理节点的重复请求也会刷新存储的节点元数据，以及最新的允许列表中的声明命令快照，便于操作者查看。
- 批准**始终**会生成一个新鲜的令牌；`node.pair.request` 永远不会返回令牌。
- 请求可以包含 `silent: true` 作为自动批准流程的提示。
- `node.pair.approve` 会使用待处理请求声明的命令来强制执行额外的批准范围：
  - 无命令请求：`operator.pairing`
  - 非 exec 命令请求：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which` 请求：
    `operator.pairing` + `operator.admin`

<Warning>
节点配对是一种信任与身份流程，并伴随令牌签发。它**不会**按每个节点固定实时节点命令面。

- 实时节点命令来自节点在连接时声明的内容，并在应用网关的全局节点命令策略（`gateway.nodes.allowCommands` 和 `denyCommands`）后生效。
- 每节点的 `system.run` allow 与 ask 策略位于节点上的 `exec.approvals.node.*`，而不在配对记录中。

</Warning>

## 节点命令门控（2026.3.31+）

<Warning>
**破坏性变更：** 从 `2026.3.31` 开始，在节点配对获得批准之前，节点命令将被禁用。仅有设备配对已不足以暴露已声明的节点命令。
</Warning>

当节点首次连接时，会自动请求配对。在配对请求获批之前，该节点发出的所有待处理节点命令都会被过滤且不会执行。一旦通过配对批准建立了信任，该节点声明的命令就会在正常命令策略约束下可用。

这意味着：

- 之前仅依赖设备配对来暴露命令的节点，现在必须完成节点配对。
- 在配对批准之前排队的命令会被丢弃，而不是延后执行。

## 节点事件信任边界（2026.3.31+）

<Warning>
**破坏性变更：** 现在，节点发起的运行会停留在一个受限的受信任表面上。
</Warning>

节点发起的摘要以及相关会话事件被限制在预期的受信任表面内。此前依赖更宽泛的主机或会话工具访问的通知驱动或节点触发流程可能需要调整。这一加固确保节点事件无法在超出节点信任边界允许的范围内升级为主机级工具访问。

持久化的节点存在性更新遵循相同的身份边界。`node.presence.alive` 事件仅接受来自已认证节点设备会话的请求，并且只有在设备/节点身份已经配对时才会更新配对元数据。自声明的 `client.id` 值不足以写入最后活动状态。

## 自动批准（macOS 应用）

macOS 应用可以在以下情况下选择性地尝试**静默批准**：

- 该请求被标记为 `silent`，并且
- 应用能够使用同一用户验证到网关主机的 SSH 连接。

如果静默批准失败，它会回退到正常的“批准/拒绝”提示。

## 基于受信任 CIDR 的设备自动批准

`role: node` 的 WS 设备配对默认仍然需要手动审批。对于网关已经信任网络路径的私有节点网络，操作员可以通过显式 CIDR 或精确 IP 开启自动批准：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

安全边界：

- 当 `gateway.nodes.pairing.autoApproveCidrs` 未设置时禁用。
- 不存在对整个 LAN 或私有网络的自动批准模式。
- 只有没有请求范围的新鲜 `role: node` 设备配对才有资格。
- Operator、浏览器、Control UI 和 WebChat 客户端仍然需要手动审批。
- 角色、范围、元数据和公钥升级仍然需要手动审批。
- 同主机回环受信任代理头路径不具备资格，因为本地调用者可以伪造该路径。

## 元数据升级自动批准

当一个已经配对的设备重新连接时，如果只有非敏感元数据发生变化（例如显示名称或客户端平台提示），OpenClaw 会将其视为 `metadata-upgrade`。静默自动批准的范围很窄：它只适用于已证明持有本地或共享凭据的受信任非浏览器本地重新连接，包括在 OS 版本元数据变化之后的同主机原生应用重新连接。浏览器/Control UI 客户端和远程客户端仍然使用显式重新批准流程。范围升级（read 到 write/admin）和公钥变更**不**符合元数据升级自动批准资格——它们仍然需要显式重新批准请求。

## QR 配对辅助

`/pair qr` 会将配对载荷渲染为结构化媒体，以便移动端和浏览器客户端可以直接扫码。

删除设备时也会清除该设备 id 的所有过期待处理配对请求，因此在撤销后 `nodes pending` 不会显示孤立行。

## 本地性与转发头

Gateway 配对仅在原始 socket 和任何上游代理证据都一致时，才将连接视为回环连接。如果请求到达时是回环连接，但携带的 `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` 头指向非本地来源，那么这些转发头证据会否定回环本地性的主张。此时配对路径需要显式批准，而不是静默地将该请求视为同主机连接。关于操作员认证的等价规则，请参见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)。

## 存储（本地，私有）

配对状态存储在 Gateway 状态目录下（默认 `~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果你覆盖 `OPENCLAW_STATE_DIR`，`nodes/` 文件夹也会随之迁移。

安全说明：

- 令牌是机密；请将 `paired.json` 视为敏感数据。
- 轮换令牌需要重新批准（或删除节点条目）。

## 传输行为

- 传输层是**无状态**的；它不存储成员资格。
- 如果 Gateway 离线或配对被禁用，节点将无法配对。
- 如果 Gateway 处于远程模式，配对仍然会针对远程 Gateway 的存储进行。

## 相关内容

- [通道配对](/channels/pairing)
- [节点](/nodes)
- [设备 CLI](/cli/devices)
