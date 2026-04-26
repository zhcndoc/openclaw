---
summary: "节点发现与传输（Bonjour、Tailscale、SSH），用于查找网关"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "发现与传输"
---

# 发现与传输

OpenClaw 有两个表面上看起来相似但实质不同的问题：

1. **操作者远程控制**：macOS 菜单栏应用控制运行在其他地方的网关。
2. **节点配对**：iOS/Android（及未来节点）查找网关并安全配对。

设计目标是将所有网络发现/广告保留在 **节点网关** (`openclaw gateway`) 中，客户端（mac 应用，iOS）作为消费者。

## 术语

- **Gateway**：一个长期运行的网关进程，拥有状态（会话、配对、节点注册表）并运行通道。大多数设置每台主机使用一个；隔离的多网关设置也是可能的。
- **Gateway WS (control plane)**：默认位于 `127.0.0.1:18789` 的 WebSocket 端点；可以通过 `gateway.bind` 绑定到局域网/尾网。
- **Direct WS transport**：面向局域网/尾网的网关 WS 端点（无 SSH）。
- **SSH transport (fallback)**：通过 SSH 转发 `127.0.0.1:18789` 进行远程控制。
- **Legacy TCP bridge (removed)**：旧版节点传输（见 [桥接协议](/gateway/bridge-protocol)）；不再用于发现广告，也不再包含在当前构建中。

协议详见：

- [网关协议](/gateway/protocol)
- [桥接协议（旧版）](/gateway/bridge-protocol)

## 为何同时保留"直连"与 SSH

- **直连 WS** 是同一网络和尾网内最佳用户体验：
  - 通过 Bonjour 实现局域网自动发现
  - 配对令牌 + 访问控制列表（ACLs）由网关管理
  - 无需 shell 访问；协议接口紧凑且可审计
- **SSH** 仍然是通用的回退方案：
  - 只要有 SSH 访问权限即可使用（即使跨无关网络）
  - 可避免多播/mDNS 的问题
  - 除了 SSH 端口外无需开放新入站端口

## 发现输入（客户端如何获知网关位置）

### 1) Bonjour / DNS-SD 发现

多播 Bonjour 是尽力而为的，且无法跨越网络。OpenClaw 还可以通过配置的广域 DNS-SD 域浏览相同的网关信标，因此发现可以覆盖：

- 同一局域网上的 `local.`
- 用于跨网络发现的配置的单播 DNS-SD 域

目标方向：

- **网关** 通过 Bonjour 广播其 WS 端点。
- 客户端浏览并显示"选择网关"列表，然后保存所选端点。

故障排除与信标详情见：[Bonjour](/gateway/bonjour)。

#### 服务信标详情

- 服务类型：
  - `_openclaw-gw._tcp`（网关传输信标）
- TXT 键（非秘密）：
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>` (操作员配置的显示名称)
  - `lanHost=<hostname>.local`
  - `gatewayPort=18789` (网关 WS + HTTP)
  - `gatewayTls=1` (仅在启用 TLS 时)
  - `gatewayTlsSha256=<sha256>` (仅在启用 TLS 且指纹可用时)
  - `canvasPort=<port>` (canvas 主机端口；当前启用 canvas 主机时与 `gatewayPort` 相同)
  - `tailnetDns=<magicdns>` (可选提示；当 Tailscale 可用时自动检测)
  - `sshPort=<port>` (仅 mDNS 完整模式；广域 DNS-SD 可能省略它，此时 SSH 默认保持为 `22`)
  - `cliPath=<path>` (仅 mDNS 完整模式；广域 DNS-SD 仍将其写为远程安装提示)

安全说明：

- Bonjour/mDNS TXT 记录是**未认证的**。客户端必须仅将 TXT 值视为用户体验提示。
- 路由（主机/端口）应优先使用**解析后的服务端点**（SRV + A/AAAA），而不是 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 绑定绝不允许广告中的 `gatewayTlsSha256` 覆盖先前存储的绑定。
- 当选择的路由是安全/基于 TLS 时，iOS/Android 节点应在存储首次绑定之前要求明确的“信任此指纹”确认（带外验证）。

禁用/覆盖：

- `OPENCLAW_DISABLE_BONJOUR=1` 禁用广告。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制网关绑定模式。
- 当发出 `sshPort` 时，`OPENCLAW_SSH_PORT` 覆盖广告中的 SSH 端口。
- `OPENCLAW_TAILNET_DNS` 发布 `tailnetDns` 提示（MagicDNS）。
- `OPENCLAW_CLI_PATH` 覆盖广告的 CLI 路径。

### 2) 尾网（跨网络）

对于伦敦/维也纳式部署，Bonjour 无法工作。推荐的"直连"目标是：

- Tailscale MagicDNS 名称（优先）
- 稳定的尾网 IP

如果网关检测到运行于 Tailscale 下，它会发布 `tailnetDns` 作为客户端的可选提示（包括广域信标）。

macOS 应用现在优先使用 MagicDNS 名称而非原始 Tailscale IP 进行网关发现。这提高了当尾网 IP 变更时（例如节点重启或 CGNAT 重新分配后）的可靠性，因为 MagicDNS 名称会自动解析为当前 IP。

对于移动节点配对，发现提示不会放松尾网/公共路由上的传输安全：

- iOS/Android 仍然需要安全的首次尾网/公共连接路径（`wss://` 或 Tailscale Serve/Funnel）。
- 发现的原始尾网 IP 是路由提示，而不是使用明文远程 `ws://` 的许可。
- 私有局域网直连 `ws://` 仍然受支持。
- 如果您想要移动节点最简单的 Tailscale 路径，请使用 Tailscale Serve，这样发现和设置代码都会解析到同一个安全的 MagicDNS 端点。

### 3) 手动 / SSH 目标

若无直连路径（或直连已禁用），客户端总能通过 SSH 转发回环网关端口连接。

详见：[远程访问](/gateway/remote)。

## 传输选择（客户端策略）

推荐客户端行为：

1. 如果配置了配对的直连端点且可达，请使用它。
2. 否则，如果发现在 `local.` 或配置的广域域上的网关，提供一键“使用此网关”选择并将其保存为直连端点。
3. 否则，如果配置了尾网 DNS/IP，尝试直连。对于尾网/公共路由上的移动节点，直连意味着安全端点，而不是明文远程 `ws://`。
4. 否则，回退到 SSH。

## 配对 + 认证（直连传输）

网关是节点/客户端接纳的事实来源。

- 配对请求由网关创建/审批/拒绝（见 [网关配对](/gateway/pairing)）。
- 网关负责执行：
  - 认证（令牌 / 密钥对）
  - 范围/访问控制列表（网关非简单代理每个方法）
  - 速率限制

## 各组件职责

- **Gateway**: 广播发现信标，负责配对决策，并托管 WS 端点。
- **macOS app**: 帮助您选择网关，显示配对提示，并且仅在回退时使用 SSH。
- **iOS/Android nodes**: 作为便利功能浏览 Bonjour，并连接到已配对的 Gateway WS。

## 相关

- [远程访问](/gateway/remote)
- [Tailscale](/gateway/tailscale)
- [Bonjour 发现](/gateway/bonjour)
