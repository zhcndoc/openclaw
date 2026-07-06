---
summary: "用于查找网关的节点发现与传输方式（Bonjour、Tailscale、SSH）"
read_when:
  - 实现或更改 Bonjour 发现/广播
  - 调整远程连接模式（直连 vs SSH）
  - 设计用于远程节点的节点发现 + 配对
title: "发现与传输"
---

OpenClaw 有两个相关但不同的发现问题：

1. **操作员远程控制**：由 macOS 菜单栏应用控制运行在其他位置的网关。
2. **节点配对**：iOS/Android（以及未来的节点）发现网关并安全地进行配对。

所有网络发现/广播都位于 **Node Gateway**
（`openclaw gateway`）；客户端（mac 应用、iOS）只是消费者。

## 术语

- **Gateway**：一个单一的长运行进程，负责持有状态（会话、
  配对、节点注册表）并运行通道。大多数部署每台主机使用一个；
  也可以进行隔离的多 Gateway 部署。
- **Gateway WS（控制平面）**：默认位于 `127.0.0.1:18789` 的 WebSocket 端点；
  可通过 `gateway.bind` 将其绑定到 LAN/tailnet。
- **Direct WS transport**：面向 LAN/tailnet 的 Gateway WS 端点（无 SSH）。
- **SSH transport（fallback）**：通过 SSH 转发
  `127.0.0.1:18789` 进行远程控制。
- **Legacy TCP bridge（已移除）**：较旧的节点传输方式（参见
  [Bridge protocol](/gateway/bridge-protocol)）；不再作为
  发现的广播内容，也不再是当前构建的一部分。

协议详情：[Gateway protocol](/gateway/protocol)，
[Bridge protocol (legacy)](/gateway/bridge-protocol)。

## 为什么直接连接和 SSH 都存在

- **直接 WS** 在同一网络以及 tailnet 内提供最佳用户体验：通过 Bonjour 进行 LAN
  自动发现、由网关拥有的配对令牌和 ACL，并且不需要 shell 访问权限。
- **SSH** 是通用的兜底方案：只要你有 SSH 访问权限就能在任何地方使用，甚至可以
  跨越无关网络，能够应对多播/mDNS 问题，并且除了 SSH 之外不需要新的
  入站端口。

## 发现输入

### 1) Bonjour / DNS-SD

组播 Bonjour 是尽力而为的，并且不会跨网络。OpenClaw 还支持通过已配置的广域 DNS-SD 域浏览同一个网关信标，因此发现既可以覆盖同一 LAN 上的 `local.`，也可以覆盖用于跨网络发现的已配置单播 DNS-SD 域。

当启用捆绑的 `bonjour` 插件时，**网关** 会通过 Bonjour 广播其 WS 端点；客户端会浏览并显示一个“选择网关”的列表，然后保存所选端点。

故障排查和信标细节：[Bonjour](/gateway/bonjour)。

#### 信标细节

- 服务类型：`_openclaw-gw._tcp`（网关传输信标）。
- TXT 键（非敏感）：

  | 键                          | 说明                                                                                                                                                             |
  | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `role=gateway`              | 始终存在。                                                                                                                                                       |
  | `transport=gateway`         | 始终存在。                                                                                                                                                       |
  | `displayName=<name>`        | 运维配置的显示名称。                                                                                                                                             |
  | `lanHost=<hostname>.local`  | 仅限 LAN mDNS 广播器；广域 DNS-SD 不会写入。                                                                                                                     |
  | `gatewayPort=18789`         | 网关 WS + HTTP 端口。                                                                                                                                            |
  | `gatewayTls=1`              | 仅在启用 TLS 时存在。                                                                                                                                            |
  | `gatewayTlsSha256=<sha256>` | 仅在启用 TLS 且可用指纹时存在。                                                                                                                                   |
  | `tailnetDns=<magicdns>`     | 可选提示；当 Tailscale 可用时自动检测。                                                                                                                           |
  | `sshPort=<port>`            | 仅在 `discovery.mdns.mode="full"` 时存在；在默认的 `"minimal"` 模式下，在 LAN 广播器和广域 DNS-SD 中都会省略（SSH 默认为 `22`）。                                |
  | `cliPath=<path>`            | 与 `sshPort` 相同的 `discovery.mdns.mode="full"` 条件；用于 CLI 路径的远程安装提示。                                                                              |

  插件发现契约中定义了一个 `canvasPort` TXT 键，用于未来的 canvas 主机端口，但当前没有任何代码路径设置其值，因此今天不会发出该字段。

安全说明：

- Bonjour/mDNS TXT 记录是**未认证**的。客户端必须仅将 TXT 值视为 UX 提示。
- 路由（主机/端口）应优先使用**已解析的服务端点**（SRV + A/AAAA），而不是 TXT 中提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 固定必须绝不能让广播的 `gatewayTlsSha256` 覆盖先前已存储的指纹。
- iOS/Android 节点在保存首次指纹时，应在所选路由为安全/TLS 基础时，要求显式的“信任此指纹”确认（带外验证）。

启用、禁用和覆盖：

- `openclaw plugins enable bonjour` 启用 LAN 组播广播。
- `openclaw.json` 中的 `discovery.mdns.mode` 控制 mDNS 广播：
  `"minimal"`（默认）、`"full"`（将 `cliPath`/`sshPort` 添加到 LAN 信标和任何广域 DNS-SD 区域）、或 `"off"`（禁用 mDNS）。
- `OPENCLAW_DISABLE_BONJOUR=1` 强制禁用广播；`discovery.mdns.mode="off"` 可单独禁用它。`OPENCLAW_DISABLE_BONJOUR=0` 是一个显式的启用选项，可覆盖插件在检测到容器（Docker、containerd、Kubernetes、LXC）中的自动禁用；它不会覆盖 `discovery.mdns.mode="off"`。捆绑的 `bonjour` 插件在 macOS 主机上会自动启动（`enabledByDefaultOnPlatforms: ["darwin"]`），并在检测到容器内时自动禁用；Linux、Windows 和其他容器化部署需要显式执行 `plugins enable bonjour`。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制 Gateway 绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖广播的 SSH 端口（仅在 `discovery.mdns.mode="full"` 时生效）。
- `OPENCLAW_TAILNET_DNS` 发布 `tailnetDns` 提示（MagicDNS）。
- `OPENCLAW_CLI_PATH` 覆盖广播的 CLI 路径。

### 2) Tailnet（跨网络）

对于位于不同物理网络上的网关，Bonjour 没有帮助。推荐的直接目标是 Tailscale MagicDNS 名称（优先）或稳定的 tailnet IP。

如果网关检测到自己运行在 Tailscale 下，它会将 `tailnetDns` 作为可选提示发布给客户端（包括广域信标）。macOS 应用在网关发现时更偏好 MagicDNS 名称而不是原始的 Tailscale IP；当 tailnet IP 发生变化（节点重启、CGNAT 重新分配）时，这种方式仍然可靠，因为 MagicDNS 会自动解析到当前 IP。

对于移动节点配对，发现提示绝不会削弱 tailnet/公网路由上的传输安全：

- iOS/Android 仍然要求安全的首次 tailnet/公网连接路径（`wss://` 或 Tailscale Serve/Funnel）。
- 发现到的原始 tailnet IP 只是路由提示，不代表可以使用明文远程 `ws://`。
- 仍然支持私有 LAN 直连 `ws://`。
- 对于移动节点上最简单的 Tailscale 路径，使用 Tailscale Serve，这样发现和设置都会解析到同一个安全的 MagicDNS 端点。

### 3) 手动 / SSH 目标

当没有直接路由（或已禁用直接路由）时，客户端始终可以通过 SSH 连接，方法是转发回环网关端口。参见
[远程访问](/gateway/remote)。

## 传输选择（客户端策略）

1. 如果已配置并且可达的配对直连端点，则使用它。
2. 否则，如果发现 `local.` 或已配置的广域域名上的网关，提供一个一键“使用此网关”选项，并将其保存为直连端点。
3. 否则，如果已配置 tailnet DNS/IP，则尝试直连。对于处于 tailnet/公共路由上的移动节点，直连指的是安全端点，而不是明文远程 `ws://`。
4. 否则，回退到 SSH。

## 配对与认证（直接传输）

网关是节点/客户端准入的事实来源：

- 配对请求在网关中创建/批准/拒绝（参见
  [网关配对](/gateway/pairing)）。
- 网关强制执行认证（令牌/密钥对）、作用域/ACL（它不是对每个方法的原始
  代理），以及速率限制。

## 各组件职责

- **Gateway**: 广播发现信标，负责配对决策，托管
  WS 端点。
- **macOS app**: 帮助你选择一个 gateway，显示配对提示，仅在
  作为回退时使用 SSH。
- **iOS/Android nodes**: 作为便利功能浏览 Bonjour，连接到
  已配对的 Gateway WS。

## 相关内容

- [远程访问](/gateway/remote)
- [Tailscale](/gateway/tailscale)
- [Bonjour 发现](/gateway/bonjour)
