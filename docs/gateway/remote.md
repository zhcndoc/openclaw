---
summary: "使用 SSH 隧道（Gateway WS）和 tailnets 实现远程访问"
read_when:
  - 运行或排查远程网关配置时
title: "远程访问"
---

# 远程访问（SSH，隧道和 tailnets）

本仓库支持通过在专用主机（桌面/服务器）上运行单个 Gateway（主控节点），并将客户端连接至该 Gateway，从而实现“基于 SSH 的远程访问”。

- 对于 **操作者（你 / macOS 应用）**：SSH 隧道是通用的后备方案。
- 对于 **节点（iOS/Android 及未来设备）**：连接到 Gateway **WebSocket**（通过 LAN/tailnet 或根据需要通过 SSH 隧道）。

## 核心思路

- Gateway WebSocket 绑定到你配置的端口上的 **回环接口**（默认端口为18789）。
- 远程使用时，你可以通过 SSH 将该回环端口转发（或者使用 tailnet/VPN，减少隧道需求）。

## 常见的 VPN/tailnet 配置（Agent 所在的位置）

将 **Gateway 主机** 看作“Agent 所在之处”，它负责管理会话、认证配置、通道和状态。  
你的笔记本/桌面（以及节点）连接到该主机。

### 1) 在你的 tailnet 中的常驻 Gateway（VPS 或家庭服务器）

在一个持久运行的主机上运行 Gateway，并通过 **Tailscale** 或 SSH 访问它。

- **最佳用户体验：** 保持 `gateway.bind: "loopback"`，并使用 **Tailscale Serve** 提供控制界面。
- **备选方案：** 保持回环绑定 + 从任何需要访问的机器通过 SSH 隧道。
- **示例：** [exe.dev](/install/exe-dev)（易用的虚拟机）或 [Hetzner](/install/hetzner)（生产环境 VPS）。

当你的笔记本经常休眠但你希望 Agent 持续在线时，这种方案非常理想。

### 2) 家用台式机运行 Gateway，笔记本作为远程控制端

笔记本**不运行 Agent**，而是远程连接：

- 使用 macOS 应用的 **远程 SSH 模式**（设置 → 通用 → “OpenClaw 运行方式”）。
- 应用程序打开并管理隧道，因此 WebChat 和健康检查均能“顺畅工作”。

使用文档：[macOS 远程访问](/platforms/mac/remote)。

### 3) 笔记本运行 Gateway，其它机器远程访问

保持 Gateway 本地运行，但安全地暴露它：

- 从其它机器通过 SSH 隧道连接笔记本，或者
- 使用 Tailscale Serve 提供控制 UI，同时保持 Gateway 仅允许回环访问。

指南：[Tailscale](/gateway/tailscale) 和 [Web 概览](/web)。

## 命令流（运行位置）

一个 Gateway 服务拥有状态和通道，节点是外围设备。

流程示例（Telegram → 节点）：

- Telegram 消息到达 **Gateway**。
- Gateway 启动 **agent** 并决定是否调用节点工具。
- Gateway 通过 Gateway WebSocket （`node.*` RPC）调用 **节点**。
- 节点返回结果；Gateway 反馈给 Telegram。

备注：

- **节点不运行 Gateway 服务。** 每台主机只应运行一个 Gateway，除非你有意运行隔离的配置文件（参见 [多个 Gateway](/gateway/multiple-gateways)）。
- macOS 应用的“节点模式”仅是通过 Gateway WebSocket 的节点客户端。

## SSH 隧道（CLI 和工具）

创建本地到远程 Gateway WS 的隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

隧道建立后：

- `openclaw health` 和 `openclaw status --deep` 通过 `ws://127.0.0.1:18789` 访问远程 Gateway。
- `openclaw gateway {status,health,send,agent,call}` 也可以通过 `--url` 指定此转发 URL。

注意：将 `18789` 替换为你配置的 `gateway.port`（或者使用 `--port`/`OPENCLAW_GATEWAY_PORT`）。  
注意：传入 `--url` 时，CLI 不会回退到配置或环境凭证。  
需要显式包含 `--token` 或 `--password`，否则会报错。

## CLI 远程默认值

你可以持久化一个远程目标，使 CLI 命令默认使用该目标：

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://127.0.0.1:18789",
      token: "your-token",
    },
  },
}
```

当 Gateway 仅绑定回环时，保持 URL 为 `ws://127.0.0.1:18789` 并先开启 SSH 隧道。

## 凭证优先级

Gateway 凭据解析在调用/探测/状态路径以及 Discord 执行审批监控中遵循统一的规则。节点主机使用相同的基础规则，但有一个本地模式例外（它会故意忽略 `gateway.remote.*`）：

- 显式凭据（`--token`、`--password` 或工具 `gatewayToken`）在接受显式认证的调用路径上始终优先。
- URL 覆盖安全机制：
  - CLI URL 覆盖（`--url`）从不重用隐式配置/环境凭据。
  - 环境变量 URL 覆盖（`OPENCLAW_GATEWAY_URL`）仅可使用环境变量凭据（`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`）。
- 本地模式默认值：
  - token：`OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token`（仅当本地认证 token 输入未设置时才应用远程回退）
  - password：`OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password`（仅当本地认证密码输入未设置时才应用远程回退）
- 远程模式默认值：
  - token：`gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password：`OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- 节点主机本地模式例外：忽略 `gateway.remote.token` / `gateway.remote.password`。
- 远程探测/状态 token 检查默认严格：针对远程模式时，仅使用 `gateway.remote.token`（无本地 token 回退）。
- Gateway 环境变量覆盖仅使用 `OPENCLAW_GATEWAY_*`。

## 通过 SSH 使用 Chat UI

WebChat 不再使用单独的 HTTP 端口。SwiftUI 聊天界面直接连接到 Gateway WebSocket。

- 通过 SSH 转发端口 `18789`（见上文），然后连接到 `ws://127.0.0.1:18789`。
- macOS 上优先使用应用的“远程 SSH”模式，它会自动管理隧道。

## macOS app "Remote over SSH"

macOS 菜单栏应用可端到端驱动相同配置（远程状态检查、WebChat 和语音唤醒转发）。

使用文档：[macOS 远程访问](/platforms/mac/remote)。

## 安全规则（远程/VPN）

简而言之：**保持 Gateway 仅绑定回环接口**，除非你确定需要绑定其它接口。

- **回环 + SSH/Tailscale Serve** 是最安全的默认配置（无公网暴露）。
- 明文 `ws://` 默认仅可在回环访问。若在受信任的私有网络使用，  
  可在客户端进程设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作为破窗措施。
- **非回环绑定**（`lan`/`tailnet`/`custom`，或回环不可用时的 `auto`）必须启用认证 token/密码。
- `gateway.remote.token` / `.password` 是客户端凭证来源，**不会单独配置服务器端认证**。
- 本地调用路径未设置 `gateway.auth.*` 时，可回退到 `gateway.remote.*`。
- 如果通过 SecretRef 明确配置了 `gateway.auth.token` / `gateway.auth.password` 且未解析成功，则解析失败将以关闭方式处理（无远程回退掩盖）。
- `gateway.remote.tlsFingerprint` 用于使用 `wss://` 时固定远程 TLS 证书。
- **Tailscale Serve** 可通过身份验证头验证控制 UI/WebSocket 流量（当 `gateway.auth.allowTailscale: true` 时）；HTTP API 端点仍需 token/密码认证。此无 token 流程假设网关主机是可信的。如果想全部使用 token/密码，设置其为 `false`。
- 浏览器控制如同操作者访问：仅限 tailnet + 有意节点配对。

深入内容参见：[安全](/gateway/security)。
