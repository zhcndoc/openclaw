---
summary: "节点能力审批：节点在设备配对后如何获得命令暴露权限"
read_when:
  - 在不使用 macOS UI 的情况下实现节点配对审批
  - 为批准远程节点添加 CLI 流程
  - 扩展网关协议以支持节点管理
title: "节点配对"
---

节点配对分为两个层级，二者都存储在 Gateway 的 SQLite 状态数据库中的已配对设备记录里：

- **设备配对**（角色 `node`）限制 `connect` 握手。参见
  [受信任 CIDR 设备自动批准](#trusted-cidr-device-auto-approval)
  下文以及 [通道配对](/channels/pairing)。
- **节点能力审批**（`node.pair.*`）限制已连接节点可以暴露哪些已声明的
  能力/命令。Gateway 是事实来源；UI（macOS 应用、Control UI）是用于批准或
  拒绝待处理请求的前端。

先前独立的节点配对存储（`nodes/paired.json`，每个节点一个令牌，
已于 2026 年 1 月从 connect 路径中退役）已经移除：网关会在启动时将任何剩余记录并入设备记录，
并使用 `.migrated` 后缀归档旧文件。已移除旧版 TCP 桥接支持。

## 能力审批如何工作

1. 节点连接到 Gateway WS（设备配对会对这一步进行门控）。
2. Gateway 将声明的能力/命令表面与已批准的表面进行比较；新的或扩展后的表面会在设备记录上存储一个**待处理请求**，并发出 `node.pair.requested`。
3. 你批准或拒绝该请求（CLI 或 UI）。
4. 在批准之前，节点命令会保持过滤状态；批准后会暴露声明的表面，但仍受正常命令策略约束。

待处理请求会在**节点最后一次重试后 5 分钟**自动过期——一个持续重连的节点会让其这一个待处理请求保持有效，而不是每次尝试都生成新的请求（以及批准提示）。

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

- `node.pair.list` - 列出待处理和已配对的节点（`operator.pairing`）。
- `node.pair.approve` - 批准待处理请求。
- `node.pair.reject` - 拒绝待处理请求。
- `node.pair.remove` - 移除已配对的节点。这会撤销该设备在已配对设备存储中的 `node`
  角色，连同它一起移除已批准的节点表面，并使该设备的 node 角色会话失效/断开。**混合角色**
  设备（例如同时拥有 `operator` 的设备）会保留其记录，只失去 `node` 角色；仅具有 node 的设备记录将被删除。授权：
  `operator.pairing` 可以移除非 operator 的 node 记录；而设备令牌调用方在混合角色设备上撤销其**自己的** node 角色时，还需要
  `operator.admin`。
- `node.rename` - 重命名已配对节点面向 operator 显示的名称。

已在 2026.7 中移除：`node.pair.request` 和 `node.pair.verify`。待处理
请求由 Gateway 在节点连接时自行创建，而它们曾经服务的独立按节点令牌
已不再存在；node 认证现在是设备配对令牌。

注意：

- 使用未变更表面的重新连接会复用该待处理请求；重复
  请求会刷新存储的节点元数据以及最新的允许列表中的已声明命令快照，以便 operator 查看。
- Operator 范围级别和批准时检查已在
  [Operator scopes](/gateway/operator-scopes) 中总结。
- `node.pair.approve` 使用待处理请求中声明的命令来强制执行额外的批准范围：
  - 无命令请求：`operator.pairing`
  - 普通命令请求：`operator.pairing` + `operator.write`
  - 包含 `system.run`、`system.run.prepare`、`system.which`、`browser.proxy`、`fs.listDir` 或
    `system.execApprovals.get/set` 的管理员敏感请求：`operator.pairing` + `operator.admin`

<Warning>
节点配对批准会记录受信任的能力表面。它**不会**按节点固定实时 node 命令表面。

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

## 基于 SSH 验证的设备自动批准（默认）

从私有/CGNAT 地址进行的首次 `role: node` 设备配对，只要网关能够通过 SSH **证明机器所有权**，就会被自动批准：它会回连到配对主机（`BatchMode`、`StrictHostKeyChecking=yes`），在那里运行 `openclaw node identity --json`，并且仅当远程设备 id 和公钥与待处理请求完全匹配时才予以批准。正是密钥匹配让这一机制安全：仅凭可达性绝不会批准，因此 NAT 共享邻居、共享主机上的其他用户以及局域网欺骗都会继续进入正常提示流程。

默认启用。触发条件如下：

- 网关进程用户（或 `sshVerify.user`）可以通过 SSH 非交互式连接到节点主机（密钥/agent；Tailscale SSH 也可），且该主机密钥已被信任。
- `openclaw` 在远程的 `sh -lc` 非交互环境下可从 `PATH` 中解析到。
- 连接 IP 是直接的（非代理、非回环）私有地址、ULA、链路本地地址或 CGNAT 地址，或者在设置了 `sshVerify.cidrs` 时与其匹配。
- 与受信任 CIDR 批准相同的准入门槛：仅限新的、无作用域的节点配对；升级、浏览器、Control UI 和 WebChat 始终会提示。

在探测运行期间，节点客户端会被告知继续重试（`wait_then_retry`），而不是暂停等待人工批准；如果探测失败，下一次尝试会回退到正常的提示流程。失败的目标会进入短暂冷却期（密钥不匹配后 5 分钟）。

已批准的设备会记录 `approvedVia: "ssh-verified"`，并且它们首次声明的能力面也会在同一步中获批——因为密钥匹配已经证明该节点在其所有者拥有的机器上、并以操作者的账户运行，这与手动能力批准所断言的内容相同。后续的能力面升级仍然会提示。

加固或禁用：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        // 完全禁用：
        sshVerify: false,
        // ...或者限定/调整探测：
        // sshVerify: { user: "me", identity: "~/.ssh/probe", timeoutMs: 7000, cidrs: ["10.0.0.0/8"] },
      },
    },
  },
}
```

## 自动批准（macOS 应用）

当满足以下条件时，macOS 应用可以尝试对节点能力请求进行**静默批准**：

- 请求被标记为 `silent`（当设备配对以非交互方式获批时，网关会将第一个能力界面标记为静默），并且
- 应用能够使用相同用户验证到网关主机的 SSH 连接。

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

- 当 `gateway.nodes.pairing.autoApproveCidrs` 未设置时，将禁用。
- 不存在一刀切的 LAN 或私有网络自动批准模式；上文所述的基于 SSH 验证的
  自动批准要求设备密钥的加密学匹配，绝不只是依赖网络位置。
- 只有没有请求任何作用域的全新 `role: node` 设备配对请求才具备资格。
- 运维人员、浏览器、Control UI 和 WebChat 客户端仍然需要手动处理。
- 角色、作用域、元数据和公钥升级仍然需要手动处理。
- 同主机回环的受信任代理头路径不具备资格，因为该路径可能被本地调用者伪造。

## 静默配对替代清理

非交互式批准会在已配对设备行上记录其来源：
同主机本地策略批准记为 `silent`，受信任 CIDR 节点批准记为 `trusted-cidr`，SSH 验证节点批准记为 `ssh-verified`。其状态目录是临时性的客户端（临时 home、容器、按次运行的沙箱）会在每次运行时生成一对新的设备密钥，并且每次运行都会静默地重新配对为一个全新的设备——如果不清理，已配对列表会随着每次运行增长一条过期记录。

当 Gateway 静默批准一个**本地**设备配对时，它会清理属于同一客户端集群的较旧 `silent` 批准记录（匹配 `clientId`、`clientMode` 和显示名称），且这些记录当前未连接。本地客户端运行在网关主机本机上，因此集群键不可能匹配到其他机器。被清理的行会立即失去其令牌；任何匹配的旧节点配对条目都会被清除，并广播一个 `node.pair.resolved` 移除事件。

边界条件：

- 只有最新批准为同主机本地（`silent`）的记录才有资格，既作为触发条件，也作为目标。受信任 CIDR 和 SSH 验证配对跨越主机，而显示元数据并不是机器身份，因此它们绝不会被自动移除——请对这些使用 Control UI 清理或 `openclaw nodes remove`。
- 由所有者批准以及 QR/设置码（bootstrap）配对绝不会被自动移除。即使后来同一设备 ID 又被静默重新批准，之前在尚未记录来源时批准的记录也会继续受到保护。
- 当前已连接的设备会被跳过，因此使用独立状态目录的并发本地会话在在线期间会保留各自的令牌。最近一分钟内批准的记录也会被跳过，因此同时进行的配对握手不会在连接注册之前互相清理。
- 受影响的客户端从结构上就是本地客户端，因此它们会在下次连接时静默重新配对。

## 元数据升级自动批准

当一个已经配对的设备仅在重新连接时发生非敏感元数据更改（例如显示名称或客户端平台提示），OpenClaw 会将其视为 `metadata-upgrade`。静默自动批准的范围很窄：它仅适用于已证明拥有本地或共享凭据的受信任、非浏览器的本地重新连接，包括在操作系统版本元数据变更后同一主机上的原生应用重新连接。浏览器/控制界面客户端和远程客户端仍然使用显式重新批准流程。权限范围升级（读权限到写权限/管理员权限）和公钥更改**不**符合 metadata-upgrade 自动批准条件；它们仍然保持为显式重新批准请求。

## QR 配对辅助

`/pair qr` 会将配对载荷渲染为结构化媒体，以便移动端和浏览器客户端可以直接扫码。

删除设备时也会清除该设备 id 的所有已过期待处理配对请求，因此在撤销后 `nodes pending` 不会显示孤立行。

## 本地性与转发头

Gateway 配对仅在原始套接字和任何上游代理证据都一致时，才将连接视为回环连接。如果请求到达回环地址，但携带 `Forwarded`、任何 `X-Forwarded-*` 或 `X-Real-IP` 头部证据，则这些转发头证据会使回环本地性声明失效，并且配对路径需要显式批准，而不是静默地将该请求视为同主机连接。关于运维者认证中的等价规则，请参见
[Trusted Proxy Auth](/gateway/trusted-proxy-auth)。

## 存储（本地，私有）

配对状态存储在共享 SQLite 状态数据库中的已配对设备记录里，位于 Gateway 状态目录下（默认 `~/.openclaw`）：

- `~/.openclaw/state/openclaw.sqlite`（包含带设备认证的已配对设备、已批准的节点表面、待处理的表面请求、待处理的设备配对请求以及引导令牌）

如果你覆盖了 `OPENCLAW_STATE_DIR`，数据库也会随之移动。由带有 JSON 存储的版本升级而来的 Gateways 会在启动时导入这些数据，并保留 `devices/*.json.migrated` 和 `nodes/*.json.migrated` 归档文件。

安全说明：

- 设备令牌是机密信息；请将状态数据库视为敏感数据。
- 轮换设备令牌时使用 `openclaw devices rotate` /
  `device.token.rotate`。

## 传输行为

- 该传输是**无状态**的；它不存储成员关系。
- 如果 Gateway 离线或已禁用配对，则节点无法进行配对。
- 在远程模式下，配对会针对远程 Gateway 的存储进行。

## 相关内容

- [通道配对](/channels/pairing)
- [节点 CLI](/cli/nodes)
- [设备 CLI](/cli/devices)
