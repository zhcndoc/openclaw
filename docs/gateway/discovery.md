---
summary: "Node 发现和传输（Bonjour、Tailscale、SSH）用于查找网关"
read_when:
  - "实施或更改 Bonjour discovery/advertising"
  - "调整远程连接模式（直连 vs SSH）"
  - "设计用于远程节点的节点发现 + 配对"
title: "发现与传输"
---

OpenClaw 有两个相关但不同的发现问题：

1. **操作员远程控制**：macOS菜单栏应用程序控制在其他地方运行的网关。
2. **Node 配对**：iOS/Android（和未来的节点）找到网关并安全配对。

所有网络discovery/advertising驻留在**Gateway**（`openclaw gateway`）；客户端（mac 应用程序、iOS）仅为消费者。

## <a id="terms"></a> 术语

- **Gateway**：一个单一的长运行进程，负责持有状态（会话、 配对、节点注册表）并运行通道。大多数部署每台主机使用一个； 也可以进行隔离的多 Gateway 部署。
- **Gateway WS（控制平面）**：默认位于 `127.0.0.1:18789` 的 WebSocket 端点； 可通过 `gateway.bind` 将其绑定到 LAN/tailnet。
- **Direct WS 传输**：LAN/tailnet-facing 网关 WS 端点（无 SSH）。
- **SSH transport（fallback）**：通过 SSH 转发 `127.0.0.1:18789` 进行远程控制。

协议细节：[网关协议](/gateway/protocol)。

## <a id="why-direct-and-ssh-both-exist"></a> 为什么直接连接和 SSH 都存在

- **Direct WS** 是同一网络和尾网内最好的 UX：LAN 通过 Bonjour 自动发现，配对网关拥有的令牌和 ACL，并且不需要 shell 访问。
- **SSH** 是通用后备：可以在任何有 SSH 访问权限的地方工作，甚至跨不相关的网络，可以解决 multicast/mDNS 问题，并且除了 SSH 之外不需要新的入站端口。

## <a id="discovery-inputs"></a> 发现输入

### <a id="1)-bonjour-%2F-dns-sd"></a><a id="1-bonjour-/-dns-sd"></a> 1） 卓悦 / DNS-SD

多播 Bonjour 是尽力而为的，并且不跨网络。 OpenClaw 还支持通过配置的广域 DNS-SD 域浏览相同的网关信标，因此发现可以覆盖同一 LAN 上的 `local.` 和配置的单播 DNS-SD 域以进行跨网络发现。

当启用捆绑的 `bonjour` 插件时，**Gateway** 通过 Bonjour 通告其 WS 端点；客户端浏览并显示“选择网关”列表，然后应用其连接信任策略。在 macOS 上，选择打开连接编辑器；它不保存通告的端点。请参阅应用程序](/platforms/mac/remote#configure-in-the-app)中的[配置。

故障排查和信标细节：[Bonjour](/gateway/bonjour)。

#### <a id="service-beacon-details"></a> 信标细节

- 服务类型：`_openclaw-gw._tcp`（网关传输信标）。
- TXT 键（非敏感）：

  | 键                         | 笔记                                                                                                                                                            |
  | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `role=gateway`              | 始终存在。                                                                                                                                                  |
  | `transport=gateway`         | 始终存在。                                                                                                                                                  |
  | `displayName=<name>`        | 运维配置的显示名称。                                                                                                                                |
  | `lanHost=<hostname>.local`  | 仅限 LAN mDNS 广播器；广域 DNS-SD 不会写入。                                                                                                       |
  | `gatewayPort=18789`         | 网关 WS + HTTP 端口。                                                                                                                                          |
  | `gatewayTls=1`              | 仅当 TLS 启用时。                                                                                                                                        |
  | `gatewayTlsSha256=<sha256>` | 仅当 TLS 启用且指纹可用时。                                                                                                         |
  | `tailnetDns=<magicdns>`     | 可选提示；当 Tailscale 可用时自动检测。                                                                                                        |
  | `sshPort=<port>`            | 仅当 `discovery.mdns.mode="full"` 时存在；在 LAN 广告商和广域 DNS-SD 上，在默认 `"minimal"` 模式下省略（SSH 默认为 `22`）。 |
  | `cliPath=<path>`            | `discovery.mdns.mode="full"` 门与 `sshPort` 相同； CLI 路径的远程安装提示。                                                                     |

安全说明：

- Bonjour/mDNS TXT 记录是**未认证**的。客户端必须仅将 TXT 值视为 UX 提示。
- Routing （host/port） 应优先选择 **解析的服务端点** （SRV + A/AAAA） 而不是 TXT- 提供的 `lanHost`， `tailnetDns`，或`gatewayPort`。
- TLS 固定绝不能让广告的 `gatewayTlsSha256` 覆盖先前存储的引脚。
- 当所选路由为 secure/TLS-based. 时，iOS/Android 节点在存储首次 PIN（带外验证）之前应要求明确的“信任此指纹”确认

启用、禁用和覆盖：

- `openclaw plugins enable bonjour` 启用 LAN 组播广播。
- `openclaw.json` 中的 `discovery.mdns.mode` 控制 mDNS 广播：`"minimal"`（默认）、`"full"`（将 `cliPath`/`sshPort` 添加到 LAN 信标和任何广域 DNS-SD 区域），或`"off"`（禁用 mDNS）。
- `OPENCLAW_DISABLE_BONJOUR=1` 强制禁用广播；`discovery.mdns.mode="off"` 可单独禁用它。`OPENCLAW_DISABLE_BONJOUR=0` 是一个显式的启用选项，可覆盖插件在检测到容器（Docker、containerd、Kubernetes、LXC）中的自动禁用；它不会覆盖 `discovery.mdns.mode="off"`。捆绑的 `bonjour` 插件在 macOS 主机上会自动启动（`enabledByDefaultOnPlatforms: ["darwin"]`），并在检测到容器内时自动禁用；Linux、Windows 和其他容器化部署需要显式执行 `plugins enable bonjour`。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制网关绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖广播的 SSH 端口（仅在 `discovery.mdns.mode="full"` 时生效）。
- `OPENCLAW_TAILNET_DNS` 发布 `tailnetDns` 提示（MagicDNS）。
- `OPENCLAW_CLI_PATH` 覆盖广播的 CLI 路径。

### <a id="2)-tailnet-(cross-network)"></a><a id="2-tailnet-cross-network"></a> 2) Tailnet（跨网络）

对于不同物理网络上的网关，Bonjour 将无济于事。推荐的直接目标是 Tailscale MagicDNS 名称（首选）或稳定的尾网 IP。

如果网关检测到它正在 Tailscale 下运行，它会发布 `tailnetDns` 作为客户端的可选提示（包括广域信标）。对于配置的 macOS 连接，首选受信任的 MagicDNS 名称而不是原始 Tailscale IP，以便该名称解析为当前地址。发现不会替换已保存的地址。

对于移动节点配对，发现提示永远不会放松 tailnet/public 路由上的传输安全性：

- iOS/Android 仍需要安全的首次 tailnet/public 连接路径（`wss://` 或 Tailscale Serve/Funnel）。
- 发现到的原始 tailnet IP 只是路由提示，不代表可以使用明文远程 `ws://`。
- 仍然支持私有 LAN 直连 `ws://`。
- 对于移动节点上最简单的 Tailscale 路径，使用 Tailscale Serve，这样发现和设置都会解析到同一个安全的 MagicDNS 端点。

### <a id="3)-manual-%2F-ssh-target"></a><a id="3-manual-/-ssh-target"></a> 3) 手动 / SSH 目标

当没有直连路由（或禁用直连）时，客户端始终可以通过转发环回网关端口通过 SSH 进行连接。请参阅 [ 远程访问 ](/gateway/remote)。

## <a id="transport-selection-(client-policy)"></a><a id="transport-selection-client-policy"></a> 传输选择（客户端策略）

macOS 应用程序使用其配置的直接或 SSH 传输。发现不会替换该路由或选择后备路径。对于新连接，用户在连接编辑器中提供可信地址、SSH 目标或设置代码并保存。

基于发现的客户端选择遵循以下策略：

1. 如果已配置并且可达的配对直连端点，则使用它。
2. Else，如果发现在 `local.` 或配置的广域域上找到网关，则为该候选者提供设置。在保存直接端点之前应用客户端的信任策略；仅仅发现并不是授权。
3. Else，如果配置了尾网DNS/IP，请尝试直接。对于 tailnet/public 路由上的移动节点，直接表示安全端点，而不是明文远程 `ws://`。
4. 否则，回退到 SSH。

## <a id="pairing-and-auth-(direct-transport)"></a><a id="pairing-and-auth-direct-transport"></a> 配对与认证（直接传输）

网关是 node/client 准入的事实来源：

- 网关中的配对请求为 created/approved/rejected（请参阅 [ 网关配对 ](/gateway/pairing)）。
- 网关强制执行身份验证 （token/keypair）、scopes/ACLs（它不是每种方法的原始代理）和速率限制。

## <a id="responsibilities-by-component"></a> 各组件职责

- **Gateway**: 广播发现信标，负责配对决策，托管 WS 端点。
- **macOS app**：编辑受信任的网关连接，显示配对提示，并使用配置的直接或 SSH 传输。
- **iOS/Android nodes**: 作为便利功能浏览 Bonjour，连接到已配对的 Gateway WS。

## <a id="related"></a> 相关内容

- [远程访问](/gateway/remote)
- [尾盘](/gateway/tailscale)
- [Bonjour 发现](/gateway/bonjour)
