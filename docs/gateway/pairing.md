---
summary: "适用于 iOS 和其他远程节点的网关拥有节点配对（选项 B）"
read_when:
  - 在没有 macOS UI 的情况下实现节点配对批准
  - 添加用于批准远程节点的 CLI 流程
  - 使用节点管理扩展网关协议
title: "网关拥有的配对"
---

在网关拥有的配对中，**网关** 是哪些节点可以加入的唯一真实来源。UI（macOS 应用、未来的客户端）只是用于批准或拒绝待处理请求的前端。

**重要：**WS 节点在 `connect` 期间使用 **设备配对**（角色 `node`）。`node.pair.*` 是一个单独的、旧版的配对存储，并且**不会**影响 WS 握手。只有显式调用 `node.pair.*` 的客户端才会使用此流程。

## 概念

- **待处理请求**：一个节点请求加入；需要批准。
- **已配对节点**：已获批准并已发放认证令牌的节点。
- **传输**：Gateway WS 端点负责转发请求，但不决定成员资格。已移除对旧版 TCP 桥接的支持。

## 配对如何工作

1. 节点连接到 Gateway WS 并请求配对。
2. Gateway 存储一个 **待处理请求** 并发出 `node.pair.requested`。
3. 你批准或拒绝该请求（CLI 或 UI）。
4. 批准后，Gateway 会签发一个 **新令牌**（重新配对时令牌会轮换）。
5. 节点使用该令牌重新连接，并且现在已完成配对。

待处理请求会在 **5 分钟**后自动过期。

## CLI 工作流（适用于无头环境）

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

- `node.pair.requested` - 在创建新的待处理请求时发出。
- `node.pair.resolved` - 在请求被批准、拒绝或
  过期时发出。

方法：

- `node.pair.request` - 创建或复用一个待处理请求。
- `node.pair.list` - 列出待处理和已配对的节点（`operator.pairing`）。
- `node.pair.approve` - 批准一个待处理请求（签发一个令牌）。
- `node.pair.reject` - 拒绝一个待处理请求。
- `node.pair.remove` - 移除一个已配对节点。对于由设备支持的配对，这会
  撤销该设备的 `node` 角色：它会修改 `devices/paired.json` 并
  使该设备的 node-role 会话失效/断开。一个**混合角色**
  设备（例如同时持有 `operator` 的设备）会保留其行，只会
  失去 `node` 角色；仅具备 node 的设备行会被删除。它还会清除任何
  匹配的旧版 gateway-owned node 配对条目。授权：`operator.pairing`
  可以移除非 operator 的 node 行；调用方如果是设备令牌并撤销其
  **自身**在混合角色设备上的 node 角色，则还需要
  `operator.admin`。
- `node.pair.verify` - 验证 `{ nodeId, token }`。

注意：

- `node.pair.request` 对每个节点是幂等的：重复调用会返回相同的
  待处理请求。
- 对同一待处理节点的重复请求会刷新存储的节点
  元数据，以及最新的 allowlisted 声明命令快照，便于 operator 查看。
- 批准**总是**生成一个新的令牌；`node.pair.request` 从不
  返回令牌。
- Operator 作用域级别和批准时检查已在
  [Operator scopes](/gateway/operator-scopes) 中汇总。
- 请求可以包含 `silent: true` 作为自动批准流程的提示。
- `node.pair.approve` 使用待处理请求的声明命令来强制执行额外的批准作用域：
  - 无命令请求：`operator.pairing`
  - 非 exec 命令请求：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which` 请求：
    `operator.pairing` + `operator.admin`

<Warning>
节点配对是一种信任和身份流程，并伴随令牌签发。它**不会**按节点固定实时节点命令面。

- 实时 node 命令来自节点在连接时声明的内容，并经过
  gateway 全局 node 命令策略（`gateway.nodes.allowCommands` 和
  `denyCommands`）过滤。
- 每个节点的 `system.run` 允许和询问策略保存在节点上的
  `exec.approvals.node.*` 中，而不是配对记录中。

</Warning>

## 节点命令门控（2026.3.31+）

<Warning>
**重大变更：** 从 `2026.3.31` 开始，在节点配对获得批准之前，节点命令将被禁用。仅完成设备配对已不再足以暴露已声明的节点命令。
</Warning>

当节点首次连接时，会自动请求配对。
在该请求获得批准之前，该节点发出的所有待处理节点命令都会被过滤，不会执行。一旦配对获得批准，该节点声明的命令将可用，并受常规命令策略约束。

这意味着：

- 之前仅依赖设备配对即可暴露命令的节点，现在还必须完成节点配对。
- 在配对批准之前排队的命令会被丢弃，而不是延后执行。

## 节点事件信任边界（2026.3.31+）

<Warning>
**重大变更：** 由节点发起的运行现在将保持在一个缩减的受信表面上。
</Warning>

由节点发起的摘要和相关会话事件仅限于预期的受信表面。之前依赖更广泛的主机或会话工具访问的通知驱动或节点触发流程可能需要调整。这种加固措施可防止节点事件提升为超出节点信任边界所允许的主机级工具访问。

持久化的节点存在状态更新遵循相同的身份边界：`node.presence.alive` 事件仅接受来自已认证的节点设备会话，并且只有在设备/节点身份已经配对时才会更新配对元数据。仅仅自声明一个 `client.id` 值不足以写入最后一次在线状态。

## 自动批准（macOS 应用）

当满足以下条件时，macOS 应用可以尝试进行**静默批准**：

- 请求被标记为 `silent`，并且
- 应用可以使用相同的
  用户验证到网关主机的 SSH 连接。

如果静默批准失败，则会回退到正常的批准/拒绝提示。

## 基于受信任 CIDR 的设备自动批准

`role: node` 的 WS 设备配对默认仍然是手动的。对于网关已经信任网络路径的私有节点
网络，运维人员可以通过显式 CIDR 或精确 IP 启用自动批准：

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

- 当 `gateway.nodes.pairing.autoApproveCidrs` 未设置时会禁用。
- 不存在对整个 LAN 或私有网络的自动批准模式。
- 只有没有请求作用域的全新 `role: node` 设备配对请求才符合条件。
- Operator、浏览器、Control UI 和 WebChat 客户端仍保持手动流程。
- 角色、作用域、元数据和公钥升级仍保持手动流程。
- 同主机回环的受信任代理头路径不符合条件，因为该路径可能被本地调用者伪造。

## Metadata 升级自动批准

当一个已经配对的设备仅在重新连接时发生非敏感元数据更改（例如显示名称或客户端平台提示），OpenClaw 会将其视为 `metadata-upgrade`。静默自动批准的范围很窄：它仅适用于已证明拥有本地或共享凭据的受信任、非浏览器的本地重新连接，包括在操作系统版本元数据变更后同一主机上的原生应用重新连接。浏览器/控制界面客户端和远程客户端仍然使用显式重新批准流程。权限范围升级（读权限到写权限/管理员权限）和公钥更改**不**符合 metadata-upgrade 自动批准条件；它们仍然保持为显式重新批准请求。

## QR 配对辅助

`/pair qr` 会将配对载荷渲染为结构化媒体，以便移动端和浏览器客户端可以直接扫码。

删除设备时也会清除该设备 id 的所有已过期待处理配对请求，因此在撤销后 `nodes pending` 不会显示孤立行。

## 本地性与转发头

Gateway 配对仅在原始套接字和任何上游代理证据都一致时，才将连接视为回环连接。如果请求到达回环地址，但携带 `Forwarded`、任何 `X-Forwarded-*` 或 `X-Real-IP` 头部证据，则这些转发头证据会使回环本地性声明失效，并且配对路径需要显式批准，而不是静默地将该请求视为同主机连接。关于运维者认证中的等价规则，请参见
[Trusted Proxy Auth](/gateway/trusted-proxy-auth)。

## 存储（本地，私有）

配对状态存储在 Gateway 状态目录下（默认
`~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果你覆盖 `OPENCLAW_STATE_DIR`，`nodes/` 文件夹也会随之迁移。

安全说明：

- 令牌是机密；请将 `paired.json` 视为敏感数据。
- 轮换令牌需要重新批准（或删除节点条目）。

## 传输行为

- 该传输是**无状态**的；它不存储成员关系。
- 如果 Gateway 离线或已禁用配对，则节点无法进行配对。
- 在远程模式下，配对会针对远程 Gateway 的存储进行。

## 相关内容

- [通道配对](/channels/pairing)
- [节点 CLI](/cli/nodes)
- [设备 CLI](/cli/devices)
