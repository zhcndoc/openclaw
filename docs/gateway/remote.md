---
summary: "使用 Gateway WS、SSH 隧道和 tailnet 进行远程访问"
read_when:
  - 运行或排查远程网关设置时
title: "远程访问"
---

OpenClaw 在一台主机上运行一个 Gateway（主节点），并将每个客户端连接到它。Gateway 管理会话、认证配置、通道和状态；其他一切都是客户端。

- **操作员**（你，或 macOS 应用）：当 Gateway 可访问时，直接使用 LAN/Tailnet WebSocket 最简单；SSH 隧道是通用的备用方案。
- **节点**（iOS/Android 和其他设备）：连接到 Gateway 的 **WebSocket**（LAN/tailnet 或 SSH 隧道）。

远程客户端可以通过 URL 或简短引用继续同一 Gateway 所拥有的对话。请参阅[会话同步和附加](/concepts/session-attachment)。

## 核心理念

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

要使用一个私有的 `wss://` 端点替代每个客户端的 SSH 隧道，同时让 Gateway 保持在回环地址上，请参阅[为你的 Gateway 提供稳定的 HTTPS URL](/gateway/stable-https-url)。

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

- 显式凭据（`--token`、`--password` 或工具的 `gatewayToken`）在接受显式身份验证的调用路径中始终优先。
- URL 覆盖安全性：
  - CLI `--url` 不会重用隐式配置／环境凭据。
  - 环境变量 `OPENCLAW_GATEWAY_URL` 只能使用环境凭据（`OPENCLAW_GATEWAY_TOKEN`／`OPENCLAW_GATEWAY_PASSWORD`）。
- 本地模式默认值：
  - token：`gateway.auth.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.remote.token`（仅当本地 token 未设置时才使用远程回退）
  - password：`gateway.auth.password` -> `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password`（仅当本地 password 未设置时才使用远程回退）
- 远程模式默认值：
  - token：`gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password：`OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Node-host 本地模式例外：环境凭据保持优先，并且会忽略 `gateway.remote.token`／`gateway.remote.password`，因为 node 命令会指向显式的主机和端口。
- 支持 SecretRef 的远程启动／状态／向导探测会将配置的
  `gateway.remote.token` 和 `gateway.remote.password` 视为配置目标的权威凭据。仅当远程凭据均未配置时，才会考虑环境凭据。如果配置的远程 SecretRef 无法解析，探测会发出警告，且不会回退到环境凭据；单独配置且成功解析的同级凭据仍可使用。
- Gateway 环境变量覆盖仅使用 `OPENCLAW_GATEWAY_*`。

## Chat UI 远程访问

WebChat 没有单独的 HTTP 端口；SwiftUI 聊天 UI 直接连接到 Gateway WebSocket。

- 通过 SSH 转发 `18789`（见上文），然后将客户端连接到 `ws://127.0.0.1:18789`。
- 对于 LAN/Tailnet 直连模式，将客户端连接到已配置的私有 `ws://` 或安全的 `wss://` URL。
- 在 macOS 上，应用的远程模式会自动管理所选传输方式。

## macOS 应用远程模式

macOS 菜单栏应用端到端驱动相同的设置：远程状态检查、WebChat 和 Voice Wake 转发。操作手册：[macOS 远程访问](/platforms/mac/remote)。

## 安全规则（远程/VPN）

除非你确定需要绑定，否则请让 Gateway 保持为 **仅限 loopback**。

- **Loopback + SSH/Tailscale Serve** 是最安全的默认配置（不暴露到公共网络）。
- 明文 `ws://` 可用于 loopback、私有网络/LAN（RFC 1918）、链路本地地址、CGNAT、`.local` 和 `.ts.net` 主机。公共远程主机必须使用 `wss://`。
- **非 loopback 绑定**（`lan`/`tailnet`/`custom`，或 loopback 不可用时的 `auto`）必须使用 Gateway 身份验证：令牌、密码，或配置了 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。
- `gateway.remote.token` / `.password` 是客户端凭据来源；它们本身不会配置服务器身份验证。
- 只有在 `gateway.auth.*` 未设置时，本地调用路径才能将 `gateway.remote.*` 作为回退方案。
- 如果通过 SecretRef 显式配置了 `gateway.auth.token` / `gateway.auth.password`，但 SecretRef 无法解析，则解析会安全失败（不会使用远程回退方案进行掩盖）。
- `gateway.remote.tlsFingerprint` 会为 `wss://` 固定远程 TLS 证书，包括操作员/控制流量以及 macOS 直连模式下的伴随节点。如果没有存储的指纹，macOS 仅会在首次使用时、且正常通过系统信任验证后进行固定；自签名或私有 CA Gateway 需要显式指纹，或通过 SSH 使用 Remote。
- **Tailscale Serve** 可以在 `gateway.auth.allowTailscale: true` 时，通过身份标头对控制界面/WebSocket 流量进行身份验证。HTTP API 端点不使用该标头身份验证，而是遵循 Gateway 的常规 HTTP 身份验证模式。此无令牌流程默认 Gateway 主机是受信任的；如果希望所有地方都使用共享密钥身份验证，请将其设置为 `false`。
- **Trusted-proxy** 身份验证默认要求使用非 loopback 的身份感知代理。同主机上的 loopback 反向代理必须显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。
- 将浏览器控制视同操作员访问：仅限 tailnet，并有意进行节点配对。

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

| 配置项                              | 它的作用                                                 |
| ------------------------------------ | ------------------------------------------------------------ |
| `LocalForward 18789 127.0.0.1:18789` | 将本地端口 18789 转发到远程端口 18789               |
| `ssh -N`                             | 不执行远程命令的 SSH（仅端口转发） |
| `KeepAlive`                          | 如果隧道崩溃，则自动重启它              |
| `RunAtLoad`                          | 在 LaunchAgent 于登录时加载时启动隧道        |

## 相关内容

- [Tailscale](/gateway/tailscale)
- [身份验证](/gateway/authentication)
- [远程网关设置](/gateway/remote-gateway-readme)
