---
summary: "使用 SSH 隧道（Gateway WS）和 tailnet 的远程访问"
read_when:
  - 运行或排查远程网关设置时
title: "远程访问"
---

这个仓库通过在专用主机（桌面/服务器）上保持单个 Gateway（master）运行，并将客户端连接到它，来支持“通过 SSH 远程访问”。

- 对于 **操作员（你 / macOS 应用）**：SSH 隧道是通用的兜底方案。
- 对于 **节点（iOS/Android 和未来设备）**：连接到 Gateway **WebSocket**（按需使用 LAN/tailnet 或 SSH 隧道）。

## 核心思路

- Gateway WebSocket 绑定到你配置端口上的 **loopback**（默认是 18789）。
- 对于远程使用，你可以通过 SSH 转发这个 loopback 端口（或者使用 tailnet/VPN，从而减少隧道需求）。

## 常见的 VPN 和 tailnet 方案

把 **Gateway 主机** 看作 agent 所在的位置。它拥有会话、身份验证配置、通道和状态。你的笔记本、台式机以及节点都连接到这台主机。

### 在你的 tailnet 中始终在线的 Gateway

在持久化主机（VPS 或家用服务器）上运行 Gateway，并通过 **Tailscale** 或 SSH 访问它。

- **最佳体验：** 保持 `gateway.bind: "loopback"`，并使用 **Tailscale Serve** 提供 Control UI。
- **兜底：** 保持 loopback，再从任何需要访问的机器通过 SSH 隧道连接。
- **示例：** [exe.dev](/install/exe-dev)（简单 VM）或 [Hetzner](/install/hetzner)（生产级 VPS）。

适用于你的笔记本经常休眠、但又希望 agent 一直在线的场景。

### 家用桌面运行 Gateway

笔记本**不**运行 agent。它通过远程方式连接：

- 使用 macOS 应用的 **Remote over SSH** 模式（Settings → General → OpenClaw runs）。
- 应用会打开并管理隧道，因此 WebChat 和健康检查都能正常工作。

运行手册：[macOS 远程访问](/platforms/mac/remote)。

### 笔记本运行 Gateway

保持 Gateway 在本地运行，但安全地对外提供访问：

- 从其他机器通过 SSH 隧道连接到这台笔记本，或者
- 使用 Tailscale Serve 提供 Control UI，并让 Gateway 仅绑定 loopback。

指南：[Tailscale](/gateway/tailscale) 和 [Web 概览](/web)。

## 命令流（哪些东西运行在哪里）

一个 gateway 服务负责状态 + 通道。节点只是外围设备。

流程示例（Telegram → 节点）：

- Telegram 消息到达 **Gateway**。
- Gateway 运行 **agent**，并决定是否调用节点工具。
- Gateway 通过 Gateway WebSocket（`node.*` RPC）调用 **node**。
- Node 返回结果；Gateway 再把回复发回 Telegram。

说明：

- **节点不会运行 gateway 服务。** 除非你有意运行隔离配置文件（见 [Multiple gateways](/gateway/multiple-gateways)），否则每台主机只应运行一个 gateway。
- macOS 应用的“node 模式”本质上只是通过 Gateway WebSocket 连接的节点客户端。

## SSH 隧道（CLI + 工具）

创建到远程 Gateway WS 的本地隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

隧道建立后：

- `openclaw health` 和 `openclaw status --deep` 现在会通过 `ws://127.0.0.1:18789` 访问远程 gateway。
- `openclaw gateway status`、`openclaw gateway health`、`openclaw gateway probe` 和 `openclaw gateway call` 也可以在需要时通过 `--url` 指向转发后的 URL。

<Note>
将 `18789` 替换为你配置的 `gateway.port`（或 `--port` 或 `OPENCLAW_GATEWAY_PORT`）。
</Note>

<Warning>
当你传入 `--url` 时，CLI 不会回退到配置或环境中的凭据。请显式包含 `--token` 或 `--password`。缺少显式凭据会导致错误。
</Warning>

## CLI 远程默认值

你可以持久化一个远程目标，这样 CLI 命令默认就会使用它：

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

当 gateway 仅绑定 loopback 时，请保持 URL 为 `ws://127.0.0.1:18789`，并先建立 SSH 隧道。
在 macOS 应用的 SSH 隧道传输中，发现的 gateway 主机名应放在
`gateway.remote.sshTarget`；`gateway.remote.url` 仍然保持为本地隧道 URL。

## 凭据优先级

Gateway 凭据解析在 call/probe/status 路径以及 Discord exec-approval 监控中遵循同一共享契约。Node-host 使用相同的基础契约，但有一个本地模式例外（它会有意忽略 `gateway.remote.*`）：

- 显式凭据（`--token`、`--password` 或工具 `gatewayToken`）总是在接受显式认证的 call 路径上优先。
- URL 覆盖安全性：
  - CLI 的 URL 覆盖（`--url`）绝不会复用隐式配置/环境凭据。
  - 环境变量 URL 覆盖（`OPENCLAW_GATEWAY_URL`）只能使用环境凭据（`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`）。
- 本地模式默认值：
  - token: `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token`（远程回退仅在本地 auth token 输入未设置时适用）
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password`（远程回退仅在本地 auth password 输入未设置时适用）
- 远程模式默认值：
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Node-host 本地模式例外：`gateway.remote.token` / `gateway.remote.password` 会被忽略。
- 远程 probe/status 的 token 检查默认是严格的：当目标为远程模式时，它们只使用 `gateway.remote.token`（不回退到本地 token）。
- Gateway 环境覆盖只使用 `OPENCLAW_GATEWAY_*`。

## 通过 SSH 访问聊天 UI

WebChat 不再使用单独的 HTTP 端口。SwiftUI 聊天 UI 直接连接到 Gateway WebSocket。

- 通过 SSH 转发 `18789`（见上文），然后将客户端连接到 `ws://127.0.0.1:18789`。
- 在 macOS 上，优先使用应用的“Remote over SSH”模式，它会自动管理隧道。

## macOS 应用 Remote over SSH

macOS 菜单栏应用可以端到端驱动同一套配置（远程状态检查、WebChat 和 Voice Wake 转发）。

运行手册：[macOS 远程访问](/platforms/mac/remote)。

## 安全规则（远程/VPN）

简而言之：**保持 Gateway 仅绑定 loopback**，除非你确定确实需要对外绑定。

- **Loopback + SSH/Tailscale Serve** 是最安全的默认方式（不会公开暴露）。
- 明文 `ws://` 默认仅限 loopback。对于受信任的私有网络，
  可在客户端进程上设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作为
  应急开关。没有对应的 `openclaw.json` 配置；这必须是发起 WebSocket 连接的客户端进程
  环境变量。
- **非 loopback 绑定**（`lan`/`tailnet`/`custom`，或者在 loopback 不可用时的 `auto`）必须使用 gateway 认证：token、password，或带有 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。
- `gateway.remote.token` / `.password` 是客户端凭据来源。它们**不会**单独配置服务器认证。
- 本地调用路径只有在 `gateway.auth.*` 未设置时才可以将 `gateway.remote.*` 作为回退。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 明确配置但未解析成功，则解析会安全失败关闭（不会被远程回退掩盖）。
- 使用 `wss://` 时，`gateway.remote.tlsFingerprint` 会固定远程 TLS 证书。
- **Tailscale Serve** 可通过身份头对 Control UI/WebSocket 流量进行认证，当 `gateway.auth.allowTailscale: true` 时生效；HTTP API 端点不使用该 Tailscale 头认证，而是遵循 gateway 的正常 HTTP 认证模式。该无 token 流程假定 gateway 主机是可信的。如果你希望所有地方都使用共享密钥认证，请将其设为 `false`。
- **Trusted-proxy** 认证默认期望非 loopback 的身份感知代理设置。
  同主机的 loopback 反向代理需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。
- 将浏览器控制视为操作员访问：仅限 tailnet + 有意进行的节点配对。

深入了解：[安全](/gateway/security)。

### macOS：通过 LaunchAgent 持久化 SSH 隧道

对于连接远程 gateway 的 macOS 客户端，最简单的持久化方案是使用 SSH `LocalForward` 配置项，再配合 LaunchAgent，让隧道在重启和崩溃后持续保持。

#### 第 1 步：添加 SSH 配置

编辑 `~/.ssh/config`：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>
    User <REMOTE_USER>
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

将 `<REMOTE_IP>` 和 `<REMOTE_USER>` 替换为你的值。

#### 第 2 步：复制 SSH 密钥（仅一次）

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

#### 第 3 步：配置 gateway token

将 token 存储到配置中，这样重启后仍会保留：

```bash
openclaw config set gateway.remote.token "<your-token>"
```

#### 第 4 步：创建 LaunchAgent

将以下内容保存为 `~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist`：

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

#### 第 5 步：加载 LaunchAgent

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist
```

隧道会在登录时自动启动，在崩溃后重启，并保持转发端口持续可用。

<Note>
如果你从旧配置中遗留了 `com.openclaw.ssh-tunnel` LaunchAgent，请将其卸载并删除。
</Note>

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

| 配置项                                  | 作用                                                         |
| --------------------------------------- | ------------------------------------------------------------ |
| `LocalForward 18789 127.0.0.1:18789`    | 将本地端口 18789 转发到远程端口 18789                         |
| `ssh -N`                                | SSH 不执行远程命令（仅端口转发）                             |
| `KeepAlive`                             | 如果隧道崩溃，自动重启它                                      |
| `RunAtLoad`                             | 在 LaunchAgent 于登录时加载时启动隧道                         |

## 相关内容

- [Tailscale](/gateway/tailscale)
- [身份验证](/gateway/authentication)
- [远程网关设置](/gateway/remote-gateway-readme)
