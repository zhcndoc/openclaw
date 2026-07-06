---
summary: "使用 Gateway WS、SSH 隧道和 tailnet 进行远程访问"
read_when:
  - 运行或排查远程网关设置时
title: "远程访问"
---

OpenClaw 在一台主机上运行一个 Gateway（主节点），并将每个客户端连接到它。Gateway 管理会话、认证配置、通道和状态；其他一切都是客户端。

- **操作员**（你，或 macOS 应用）：当 Gateway 可访问时，直接使用 LAN/Tailnet WebSocket 最简单；SSH 隧道是通用的备用方案。
- **节点**（iOS/Android 和其他设备）：连接到 Gateway 的 **WebSocket**（LAN/tailnet 或 SSH 隧道）。

## 核心思路

Gateway WebSocket 默认绑定到 **环回地址**，端口为 `18789`（`gateway.port`）。如需远程使用，可通过 Tailscale Serve / 受信任的 LAN-Tailnet 绑定对外暴露，或通过 SSH 将环回端口转发出来。

## 拓扑选项

| 设置                              | 网关运行位置                                                                                   | 最适合                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 始终在线的网关，位于你的 tailnet 中 | 持久主机（VPS 或家用服务器），通过 Tailscale 或 SSH 访问                                            | 经常休眠但需要代理始终在线的笔记本电脑。参见 [exe.dev](/install/exe-dev)（易用 VM）或 [Hetzner](/install/hetzner)（生产 VPS）。 |
| 家用桌面                         | 桌面；笔记本通过 macOS 应用的远程模式远程连接（设置 → 连接 → OpenClaw 运行） | 将代理保留在持续通电的硬件上。操作指南：[macOS 远程访问](/platforms/mac/remote)。                                       |
| 笔记本电脑                       | 笔记本电脑，通过 SSH 隧道或 Tailscale Serve 安全暴露（保持 `gateway.bind: "loopback"`）                | 单机配置。参见 [Tailscale](/gateway/tailscale) 和 [Web](/web)。                                                                       |

对于始终在线和笔记本电脑配置，建议保持 `gateway.bind: "loopback"`，并为 Control UI 使用 **Tailscale Serve**，或者使用受信任的 LAN/Tailnet 绑定并设置 `gateway.remote.transport: "direct"`。SSH 隧道是适用于任何机器的备用方案。

## 命令流（哪些东西运行在哪里）

一个 Gateway 拥有状态和通道；节点是外围设备。示例（Telegram 消息路由到一个节点工具）：

1. Telegram 消息到达 **Gateway**。
2. Gateway 运行 **agent**，它决定是否调用节点工具。
3. Gateway 通过 Gateway WebSocket 调用 **node**（`node.invoke` RPC）。
4. Node 返回结果；Gateway 回复 Telegram。

节点不会运行 Gateway 服务。除非你有意运行隔离配置文件，否则每台主机只应运行一个 Gateway（参见 [Multiple gateways](/gateway/multiple-gateways)）。macOS 应用的“node mode”只是通过 Gateway WebSocket 连接的一个 node 客户端。

## SSH 隧道（CLI + 工具）

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

隧道建立后，`openclaw health` 和 `openclaw status --deep` 会通过 `ws://127.0.0.1:18789` 访问远程 Gateway。`openclaw gateway status`、`openclaw gateway health`、`openclaw gateway probe` 和 `openclaw gateway call` 也可以通过 `--url` 目标转发后的 URL。

<Note>
将 `18789` 替换为你配置的 `gateway.port`（或 `--port` / `OPENCLAW_GATEWAY_PORT`）。
</Note>

<Warning>
`--url` 不会回退使用配置或环境中的凭据。请显式传入 `--token` 或 `--password`；如果不提供这些参数，客户端将不发送任何凭据，并且当目标 Gateway 需要认证时连接会失败。
</Warning>

## CLI 远程默认值

将远程目标持久化，以便 CLI 命令默认使用它：

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

当 Gateway 仅能通过回环地址访问时，请保持 URL 为 `ws://127.0.0.1:18789`，并先建立 SSH 隧道。在 macOS 应用的 SSH 隧道传输中，检测到的 Gateway 主机名应填写到 `gateway.remote.sshTarget`（`user@host` 或 `user@host:port`）；`gateway.remote.url` 保持为本地隧道 URL。若远程端口与本地端口不同，请设置 `gateway.remote.remotePort`。

主机密钥验证默认是严格的（`gateway.remote.sshHostKeyPolicy: "strict"`）。如需改为使用你当前生效的 OpenSSH 配置，请将其设置为 `"openssh"`；在启用前，请检查你的用户和系统 SSH 设置。

对于已经可以在受信任的 LAN 或 Tailnet 上直接访问的 Gateway，请使用直接模式：

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      transport: "direct",
      url: "ws://192.168.0.202:18789",
      token: "your-token",
    },
  },
}
```

## 凭据优先级

Gateway 凭据解析在调用 / 探测 / 状态路径以及 Discord exec-approval 监控中遵循同一共享契约。Node-host 使用相同契约，但有一个本地模式例外（它会忽略 `gateway.remote.*`）。

- 显式凭据（`--token`、`--password`，或工具的 `gatewayToken`）在接受显式认证的调用路径上始终优先。
- URL 覆盖安全性：
  - CLI `--url` 绝不会复用隐式配置 / 环境凭据。
  - 环境变量 `OPENCLAW_GATEWAY_URL` 只能使用环境凭据（`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`）。
- 本地模式默认值：
  - token: `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token`（仅在本地 token 未设置时才回退到远程）
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password`（仅在本地 password 未设置时才回退到远程）
- 远程模式默认值：
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Node-host 本地模式例外：`gateway.remote.token` / `gateway.remote.password` 会被忽略。
- 远程 probe/status 的 token 检查默认是严格的：当目标为远程模式时，它们只使用 `gateway.remote.token`（不回退到本地 token）。
- Gateway 环境覆盖只使用 `OPENCLAW_GATEWAY_*`。

## Chat UI 远程访问

WebChat 没有单独的 HTTP 端口；SwiftUI 聊天 UI 直接连接到 Gateway WebSocket。

- 通过 SSH 转发 `18789`（见上文），然后将客户端连接到 `ws://127.0.0.1:18789`。
- 对于 LAN/Tailnet 直连模式，将客户端连接到已配置的私有 `ws://` 或安全的 `wss://` URL。
- 在 macOS 上，应用的远程模式会自动管理所选传输方式。

## macOS 应用远程模式

macOS 菜单栏应用端到端驱动相同的设置：远程状态检查、WebChat 和 Voice Wake 转发。操作手册：[macOS 远程访问](/platforms/mac/remote)。

## 安全规则（远程/VPN）

除非你确定需要绑定，否则请让 Gateway 保持为 **仅限 loopback**。

- **Loopback + SSH/Tailscale Serve** 是最安全的默认方式（无公网暴露）。
- 明文 `ws://` 仅对 loopback、私有/LAN（RFC 1918）、link-local、CGNAT、`.local` 和 `.ts.net` 主机被接受。公网远程主机必须使用 `wss://`。
- **非 loopback 绑定**（`lan`/`tailnet`/`custom`，或者在 loopback 不可用时的 `auto`）必须使用 Gateway 认证：token、password，或带有 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。
- `gateway.remote.token` / `.password` 是客户端凭据来源；它们本身不会配置服务端认证。
- 本地调用路径仅可在 `gateway.auth.*` 未设置时，将 `gateway.remote.*` 作为回退。
- 如果通过 SecretRef 显式配置了 `gateway.auth.token` / `gateway.auth.password` 且尚未解析，则解析会失败并关闭（不会被远程回退掩盖）。
- `gateway.remote.tlsFingerprint` 会为 `wss://` 的远程 TLS 证书进行 pin，包括 macOS 直接模式。没有已存储的 pin 时，macOS 只会在正常系统信任通过后的首次使用时进行 pin；自签名或私有 CA 的 Gateway 需要显式 fingerprint 或通过 SSH 使用 Remote。
- **Tailscale Serve** 可以在 `gateway.auth.allowTailscale: true` 时通过身份头为 Control UI/WebSocket 流量进行认证。HTTP API 端点不使用该头部认证，而是遵循 Gateway 的正常 HTTP 认证模式。此无 token 流程假定 Gateway 主机是可信的；若希望所有地方都使用共享密钥认证，请将其设为 `false`。
- **Trusted-proxy** 认证默认期望一个非 loopback 的身份感知代理。同主机 loopback 反向代理需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。
- 将浏览器控制视为运维者访问：仅限 tailnet，并且需要有意的节点配对。

深入了解：[安全](/gateway/security)。

### macOS：通过 LaunchAgent 持久化 SSH 隧道

对于 macOS 客户端，最简单的持久化方案是使用 SSH `LocalForward` 配置项，再配合一个 LaunchAgent，以便在重启和崩溃后持续保持隧道在线。

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

```bash
openclaw config set gateway.remote.token "<your-token>"
```

如果远程 Gateway 使用密码认证，请改用 `gateway.remote.password`。`OPENCLAW_GATEWAY_TOKEN` 仍然可以作为 shell 级覆盖项使用，但持久化的远程客户端配置是 `gateway.remote.token` / `gateway.remote.password`。

#### 第 4 步：创建 LaunchAgent

保存为 `~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist`：

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

```bash
# 检查隧道是否正在运行
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789

# 重启隧道
launchctl kickstart -k gui/$UID/ai.openclaw.ssh-tunnel

# 停止隧道
launchctl bootout gui/$UID/ai.openclaw.ssh-tunnel
```

| Config entry                         | 它的作用                                                 |
| ------------------------------------ | ------------------------------------------------------------ |
| `LocalForward 18789 127.0.0.1:18789` | 将本地端口 18789 转发到远程端口 18789               |
| `ssh -N`                             | 不执行远程命令的 SSH（仅端口转发） |
| `KeepAlive`                          | 如果隧道崩溃，则自动重启它              |
| `RunAtLoad`                          | 在 LaunchAgent 于登录时加载时启动隧道        |

## 相关内容

- [Tailscale](/gateway/tailscale)
- [身份验证](/gateway/authentication)
- [远程网关设置](/gateway/remote-gateway-readme)
