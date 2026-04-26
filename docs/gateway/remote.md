---
summary: "使用 SSH 隧道（Gateway WS）和 tailnets 实现远程访问"
read_when:
  - 运行或排查远程网关设置时
title: "远程访问"
---

This repo 支持“通过 SSH 远程访问”，方法是在专用主机（桌面/服务器）上保持单个 Gateway（主控端）运行，并将客户端连接到它。

- 对于 **操作者（你 / macOS 应用）**：SSH 隧道是通用的后备方案。
- 对于 **节点（iOS/Android 及未来设备）**：连接到 Gateway **WebSocket**（通过 LAN/tailnet 或根据需要通过 SSH 隧道）。

## 核心思路

- Gateway WebSocket 绑定到你配置的端口上的 **回环接口**（默认端口为 18789）。
- 远程使用时，你可以通过 SSH 将该回环端口转发（或者使用 tailnet/VPN，减少隧道需求）。

## 常见的 VPN/tailnet 配置（Agent 所在的位置）

将 **Gateway 主机** 看作"Agent 所在之处”，它负责管理会话、认证配置、通道和状态。  
你的笔记本/桌面（以及节点）连接到该主机。

### 1) 在你的 tailnet 中的常驻 Gateway（VPS 或家庭服务器）

在一个持久运行的主机上运行 Gateway，并通过 **Tailscale** 或 SSH 访问它。

- **最佳用户体验：** 保持 `gateway.bind: "loopback"`，并使用 **Tailscale Serve** 提供控制界面。
- **备选方案：** 保持回环绑定 + 从任何需要访问的机器通过 SSH 隧道。
- **示例：** [exe.dev](/install/exe-dev)（易用的虚拟机）或 [Hetzner](/install/hetzner)（生产环境 VPS）。

当你的笔记本经常休眠但你希望 Agent 持续在线时，这种方案非常理想。

### 2) 家用台式机运行 Gateway，笔记本作为远程控制端

笔记本**不运行 Agent**，而是远程连接：

- 使用 macOS 应用的 **远程 SSH 模式**（设置 → 通用 → "OpenClaw 运行方式”）。
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

- `openclaw health` 和 `openclaw status --deep` 现在通过 `ws://127.0.0.1:18789` 访问远程网关。
- `openclaw gateway status`、`openclaw gateway health`、`openclaw gateway probe` 和 `openclaw gateway call` 在需要时也可以通过 `--url` 指定转发后的 URL。

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
- macOS 上优先使用应用的“远程 SSH"模式，它会自动管理隧道。

## macOS app "Remote over SSH"

macOS 菜单栏应用可端到端驱动相同配置（远程状态检查、WebChat 和语音唤醒转发）。

使用文档：[macOS 远程访问](/platforms/mac/remote)。

## 安全规则（远程/VPN）

简而言之：**保持 Gateway 仅绑定回环接口**，除非你确定需要绑定其它接口。

- **回环 + SSH/Tailscale Serve** 是最安全的默认方案（不会公开暴露）。
- 明文 `ws://` 默认仅限回环使用。对于可信的私有网络，可在客户端进程上设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作为紧急开关。`openclaw.json` 中没有等价配置；这必须是发起 WebSocket 连接的客户端进程环境变量。
- **非回环绑定**（`lan`/`tailnet`/`custom`，或在回环不可用时使用 `auto`）必须使用 gateway auth：token、password，或带有 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。
- `gateway.remote.token` / `.password` 是客户端凭据来源。它们本身**不会**配置服务器认证。
- 当 `gateway.auth.*` 未设置时，本地调用路径可以将 `gateway.remote.*` 作为回退。
- 如果通过 SecretRef 显式配置了 `gateway.auth.token` / `gateway.auth.password` 且尚未解析，则解析会以闭合方式失败（不会被远程回退掩盖）。
- `gateway.remote.tlsFingerprint` 会在使用 `wss://` 时锁定远程 TLS 证书。
- **Tailscale Serve** 可在 `gateway.auth.allowTailscale: true` 时通过身份标头对 Control UI/WebSocket 流量进行认证；HTTP API 端点不会使用该 Tailscale 标头认证，而是遵循 gateway 的常规 HTTP 认证模式。此无 token 流程假设 gateway 主机是可信的。如果你希望所有地方都使用共享密钥认证，请将其设为 `false`。
- **Trusted-proxy** 认证仅适用于非回环、具备身份感知的代理部署。同主机回环反向代理不满足 `gateway.auth.mode: "trusted-proxy"`。
- 将浏览器控制视为操作者访问：仅限 tailnet，并进行明确的节点配对。

深入探讨：[安全](/gateway/security)。

### macOS：通过 LaunchAgent 实现持久 SSH 隧道

对于连接到远程网关的 macOS 客户端，最简单的持久化设置是使用 SSH `LocalForward` 配置项加上一个 LaunchAgent，以便在重启和崩溃后保持隧道活跃。

#### 步骤 1：添加 SSH 配置

编辑 `~/.ssh/config`：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>
    User <REMOTE_USER>
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

将 `<REMOTE_IP>` 和 `<REMOTE_USER>` 替换为你的值。

#### 步骤 2：复制 SSH 密钥（一次性）

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

#### 步骤 3：配置网关 token

将 token 存储在配置中，以便在重启后持久存在：

```bash
openclaw config set gateway.remote.token "<your-token>"
```

#### 步骤 4：创建 LaunchAgent

将此保存为 `~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.ssh-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/ssh</string>
        <string>-N</string>
        <string>remote-gateway</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

#### 步骤 5：加载 LaunchAgent

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist
```

隧道将在登录时自动启动，崩溃时重启，并保持转发端口活跃。

注意：如果你有一个来自旧设置的遗留 `com.openclaw.ssh-tunnel` LaunchAgent，请卸载并删除它。

#### 故障排查

检查隧道是否正在运行：

```bash
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789
```

重启隧道：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.ssh-tunnel
```

停止隧道：

```bash
launchctl bootout gui/$UID/ai.openclaw.ssh-tunnel
```

| 配置项                               | 作用                                                 |
| ------------------------------------ | ------------------------------------------------------------ |
| `LocalForward 18789 127.0.0.1:18789` | 将本地端口 18789 转发到远程端口 18789               |
| `ssh -N`                             | 不执行远程命令的 SSH（仅端口转发） |
| `KeepAlive`                          | 如果隧道崩溃则自动重启              |
| `RunAtLoad`                          | 在 LaunchAgent 加载时启动隧道        |

## 相关内容

- [Tailscale](/gateway/tailscale)
- [认证](/gateway/authentication)
- [远程网关设置](/gateway/remote-gateway-readme)
