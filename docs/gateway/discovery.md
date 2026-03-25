---
summary: "节点发现与传输（Bonjour、Tailscale、SSH），用于查找网关"
read_when:
  - 实施或修改 Bonjour 发现/广告
  - 调整远程连接模式（直连 vs SSH）
  - 设计远程节点的节点发现与配对
title: "发现与传输"
---

# 发现与传输

OpenClaw 有两个表面上看起来相似但实质不同的问题：

1. **操作者远程控制**：macOS 菜单栏应用控制运行在其他地方的网关。
2. **节点配对**：iOS/Android（及未来节点）查找网关并安全配对。

设计目标是将所有网络发现/广告保留在 **节点网关** (`openclaw gateway`) 中，客户端（mac 应用，iOS）作为消费者。

## 术语

- **网关**：一个持续运行的网关进程，拥有状态（会话、配对、节点注册表）并运行通道。大多数部署在每台主机上运行一个；也可以实现隔离的多网关设置。
- **网关 WS（控制面）**：默认监听在 `127.0.0.1:18789` 的 WebSocket 端点；可通过 `gateway.bind` 绑定到局域网/尾网。
- **直连 WS 传输**：面向局域网/尾网的网关 WS 端点（无 SSH）。
- **SSH 传输（回退方案）**：通过 SSH 转发 `127.0.0.1:18789` 实现远程控制。
- **旧版 TCP 桥接（已废弃/移除）**：早期节点传输方式（见[桥接协议](/gateway/bridge-protocol)）；不再用于发现广告。

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

### 1) Bonjour / mDNS（仅限局域网）

Bonjour 是尽力而为，不能跨网段。仅用于"同一局域网"便利性。

目标方向：

- **网关** 通过 Bonjour 广播其 WS 端点。
- 客户端浏览并显示"选择网关"列表，然后保存所选端点。

故障排除与信标详情见：[Bonjour](/gateway/bonjour)。

#### 服务信标详情

- 服务类型：
  - `_openclaw-gw._tcp`（网关传输信标）
- TXT 键（非秘密）：
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22`（或实际广播端口）
  - `gatewayPort=18789`（网关 WS + HTTP）
  - `gatewayTls=1`（仅当启用 TLS 时）
  - `gatewayTlsSha256=<sha256>`（仅当启用 TLS 且有指纹时）
  - `canvasPort=<port>`（画布主机端口；当前画布启用时和 `gatewayPort` 相同）
  - `cliPath=<path>`（可选，指向可运行的 `openclaw` 入口点或二进制的绝对路径）
  - `tailnetDns=<magicdns>`（可选提示；当检测到 Tailscale 可用时自动填充）

安全说明：

- Bonjour/mDNS TXT 记录**不具备身份认证**，客户端须将 TXT 值仅视为用户体验提示。
- 路由（主机/端口）应优先使用**解析后的服务端点**（SRV + A/AAAA），而非 TXT 中的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS Pinning 绝不能允许广播的 `gatewayTlsSha256` 覆盖之前保存的 Pin。
- iOS/Android 节点应将基于发现的直连视为**仅限 TLS**，首次保存 Pin 前需明确"信任此指纹"确认（需链外验证）。

禁用/覆盖：

- `OPENCLAW_DISABLE_BONJOUR=1` 禁用广告。
- `gateway.bind` 配置于 `~/.openclaw/openclaw.json` 控制网关绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖 TXT 中广播的 SSH 端口（默认 22）。
- `OPENCLAW_TAILNET_DNS` 发布 `tailnetDns` 提示（MagicDNS）。
- `OPENCLAW_CLI_PATH` 覆盖广播的 CLI 路径。

### 2) 尾网（跨网络）

对于伦敦/维也纳式部署，Bonjour 无法工作。推荐的"直连"目标是：

- Tailscale MagicDNS 名称（优先）
- 稳定的尾网 IP

如果网关检测到运行于 Tailscale 下，它会发布 `tailnetDns` 作为客户端的可选提示（包括广域信标）。

### 3) 手动 / SSH 目标

若无直连路径（或直连已禁用），客户端总能通过 SSH 转发回环网关端口连接。

详见：[远程访问](/gateway/remote)。

## 传输选择（客户端策略）

推荐客户端行为：

1. 如果配置并可达配对好的直连端点，则使用之。
2. 否则，如果 Bonjour 找到局域网内网关，显示"一键使用此网关"并保存为直连端点。
3. 否则，如果配置了尾网 DNS/IP，尝试直连。
4. 否则，回退使用 SSH。

## 配对 + 认证（直连传输）

网关是节点/客户端接纳的事实来源。

- 配对请求由网关创建/审批/拒绝（见[网关配对](/gateway/pairing)）。
- 网关负责执行：
  - 认证（令牌 / 密钥对）
  - 范围/访问控制列表（网关非简单代理每个方法）
  - 速率限制

## 各组件职责

- **网关**：广播发现信标，负责配对决策，并托管 WS 端点。
- **macOS 应用**：辅助选择网关，展示配对提示，仅在回退时使用 SSH。
- **iOS/Android 节点**：以 Bonjour 作为便利，连接配对好的网关 WS。
