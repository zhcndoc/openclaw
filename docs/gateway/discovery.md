---
summary: "用于查找网关的节点发现与传输方式（Bonjour、Tailscale、SSH）"
read_when:
  - 实现或更改 Bonjour 发现/广播
  - 调整远程连接模式（直连 vs SSH）
  - 设计用于远程节点的节点发现 + 配对
title: "发现与传输"
---

# 发现与传输

OpenClaw 在表面上看有两个相似但实际上不同的问题：

1. **操作员远程控制**：由 macOS 菜单栏应用控制运行在其他位置的网关。
2. **节点配对**：iOS/Android（以及未来的节点）发现网关并安全地进行配对。

设计目标是将所有网络发现/广播都保留在 **Node Gateway**（`openclaw gateway`）中，并将客户端（Mac 应用、iOS）作为消费者。

## 术语

- **Gateway**：一个单独的、长期运行的网关进程，拥有状态（会话、配对、节点注册表）并运行通道。大多数部署每台主机使用一个；也可以进行隔离的多网关部署。
- **Gateway WS（控制平面）**：默认情况下位于 `127.0.0.1:18789` 的 WebSocket 端点；可以通过 `gateway.bind` 绑定到 LAN/tailnet。
- **直接 WS 传输**：面向 LAN/tailnet 的 Gateway WS 端点（不通过 SSH）。
- **SSH 传输（回退）**：通过 SSH 转发 `127.0.0.1:18789` 进行远程控制。
- **旧版 TCP 桥接（已移除）**：旧的节点传输方式（见
  [桥接协议](/gateway/bridge-protocol)）；不再用于
  发现广播，也不再是当前构建的一部分。

协议细节：

- [Gateway 协议](/gateway/protocol)
- [桥接协议（旧版）](/gateway/bridge-protocol)

## 为什么我们同时保留“直连”和 SSH

- **直接 WS** 在同一网络和 tailnet 内提供最佳用户体验：
  - 通过 Bonjour 在 LAN 上自动发现
  - 配对令牌 + ACL 由网关管理
  - 不需要 shell 访问；协议面可以保持紧凑且易于审计
- **SSH** 仍然是通用的回退方案：
  - 只要你有 SSH 访问权限，就可以在任何地方使用（即使跨越无关网络）
  - 能抵御 multicast/mDNS 问题
  - 除 SSH 外不需要新的入站端口

## 发现输入（客户端如何获知网关的位置）

### 1) Bonjour / DNS-SD 发现

Multicast Bonjour 只是尽力而为，并不会跨网络传递。OpenClaw 也可以通过配置好的广域 DNS-SD 域浏览
同一个网关信标，因此发现可以覆盖：

- 同一 LAN 上的 `local.`
- 用于跨网络发现的已配置单播 DNS-SD 域

目标方向：

- **网关**通过 Bonjour 广播其 WS 端点。
- 客户端浏览并显示“选择一个网关”列表，然后保存所选端点。

故障排查和信标细节：[Bonjour](/gateway/bonjour)。

#### 信标细节

- 服务类型：
  - `_openclaw-gw._tcp`（网关传输信标）
- TXT 键（非机密）：
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>`（由操作员配置的显示名称）
  - `lanHost=<hostname>.local`
  - `gatewayPort=18789`（Gateway WS + HTTP）
  - `gatewayTls=1`（仅在启用 TLS 时）
  - `gatewayTlsSha256=<sha256>`（仅在启用 TLS 且指纹可用时）
  - `canvasPort=<port>`（canvas 主机端口；当前在启用 canvas host 时与 `gatewayPort` 相同）
  - `tailnetDns=<magicdns>`（可选提示；在可用 Tailscale 时自动检测）
  - `sshPort=<port>`（仅 mDNS 完整模式；广域 DNS-SD 可能省略它，此时 SSH 默认保持为 `22`）
  - `cliPath=<path>`（仅 mDNS 完整模式；广域 DNS-SD 仍会将其写为远程安装提示）

安全说明：

- Bonjour/mDNS TXT 记录是**未经认证**的。客户端必须将 TXT 值仅作为 UI 提示。
- 路由（主机/端口）应优先使用**解析后的服务端点**（SRV + A/AAAA），而不是 TXT 中提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS pinning 绝不能允许广告中的 `gatewayTlsSha256` 覆盖先前已存储的 pin。
- iOS/Android 节点在所选路线为安全/TLS 方式时，应要求先进行一次明确的“信任此指纹”确认，然后再存储首次 pin（带外验证）。

禁用/覆盖：

- `OPENCLAW_DISABLE_BONJOUR=1` 可禁用广播。
- 当未设置 `OPENCLAW_DISABLE_BONJOUR` 时，Bonjour 会在普通主机上广播，并在检测到容器时自动禁用。仅在主机、macvlan 或其他支持 mDNS 的网络中使用 `0`；使用 `1` 可强制禁用。
- `gateway.bind` 在 `~/.openclaw/openclaw.json` 中控制 Gateway 的绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖 `sshPort` 发出时广播的 SSH 端口。
- `OPENCLAW_TAILNET_DNS` 发布 `tailnetDns` 提示（MagicDNS）。
- `OPENCLAW_CLI_PATH` 覆盖广播的 CLI 路径。

### 2) Tailnet（跨网络）

对于 London/Vienna 这样的部署，Bonjour 没有帮助。推荐的“直连”目标是：

- Tailscale MagicDNS 名称（首选）或稳定的 tailnet IP。

如果网关能够检测到自己运行在 Tailscale 下，它会将 `tailnetDns` 作为可选提示发布给客户端（包括广域信标）。

macOS 应用现在在网关发现时更偏好 MagicDNS 名称，而不是原始的 Tailscale IP。这提高了 tailnet IP 变化时的可靠性（例如节点重启或 CGNAT 重新分配之后），因为 MagicDNS 名称会自动解析到当前 IP。

对于移动端节点配对，发现提示不会降低 tailnet/public 路线上的传输安全性：

- iOS/Android 仍然需要安全的首次 tailnet/public 连接路径（`wss://` 或 Tailscale Serve/Funnel）。
- 发现到的原始 tailnet IP 只是路由提示，不代表可以使用明文远程 `ws://`。
- 私有 LAN 直连 `ws://` 仍然受支持。
- 如果你希望为移动节点使用最简单的 Tailscale 路径，请使用 Tailscale Serve，这样发现和设置代码都能解析到同一个安全的 MagicDNS 端点。

### 3) 手动 / SSH 目标

当没有直连路径（或直连被禁用）时，客户端始终可以通过 SSH 转发回环网关端口进行连接。

参见 [远程访问](/gateway/remote)。

## 传输选择（客户端策略）

推荐的客户端行为：

1. 如果已配置且可达的已配对直连端点存在，则使用它。
2. 否则，如果发现网关位于 `local.` 或已配置的广域域名上，则提供一键“使用此网关”的选项，并将其保存为直连端点。
3. 否则，如果配置了 tailnet DNS/IP，则尝试直连。
   对于 tailnet/public 路线上的移动节点，直连意味着安全端点，而不是明文远程 `ws://`。
4. 否则，回退到 SSH。

## 配对 + 认证（直连传输）

网关是节点/客户端准入的事实来源。

- 配对请求在网关中创建/批准/拒绝（参见 [Gateway 配对](/gateway/pairing)）。
- 网关强制执行：
  - 认证（token / keypair）
  - scopes/ACLs（网关不是对每个方法的原始代理）
  - 速率限制

## 各组件职责

- **Gateway**：广播发现信标，负责配对决策，并托管 WS 端点。
- **macOS 应用**：帮助你选择网关，显示配对提示，并仅在回退时使用 SSH。
- **iOS/Android 节点**：浏览 Bonjour 作为便利方式，并连接到已配对的 Gateway WS。

## 相关内容

- [远程访问](/gateway/remote)
- [Tailscale](/gateway/tailscale)
- [Bonjour 发现](/gateway/bonjour)
