---
summary: "使用 Gateway WS、SSH 隧道和 tailnet 进行远程访问"
read_when:
  - "运行或排查远程网关设置时"
title: "远程访问"
---

OpenClaw 在一台主机上运行一个 Gateway（主节点），并将每个客户端连接到它。Gateway 管理会话、认证配置、通道和状态；其他一切都是客户端。

- **操作员**（你，或 macOS 应用）：当 Gateway 可访问时，直接使用 LAN/Tailnet WebSocket 最简单；SSH 隧道是通用的备用方案。
- **节点**（iOS/Android 和其他设备）：连接到 Gateway 的 **WebSocket**（LAN/tailnet 或 SSH 隧道）。

远程客户端可以通过 URL 或简短引用继续同一 Gateway 所拥有的对话。请参阅[会话同步和附加](/concepts/session-attachment)。

## <a id="the-core-idea"></a> 核心理念

Gateway WebSocket 默认绑定到 **环回地址**，端口为 `18789`（`gateway.port`）。如需远程使用，可通过 Tailscale Serve / 受信任的 LAN-Tailnet 绑定对外暴露，或通过 SSH 将环回端口转发出来。

## <a id="topology-options"></a> 拓扑选项

| 设置                             | 网关运行位置                                                                                    | 最适合                                                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 始终在线的网关，位于你的 tailnet 中 | 持久主机（VPS 或家用服务器），通过 Tailscale 或 SSH 访问                                        | 经常休眠但需要代理始终在线的笔记本电脑。参见 [exe.dev](/install/exe-dev)（易用 VM）或 [Hetzner](/install/hetzner)（生产 VPS）。 |
| 家用桌面                      | 桌面；笔记本通过 macOS 应用的远程模式远程连接（设置 → 连接 → OpenClaw 运行） | 将代理保留在持续通电的硬件上。操作指南：[macOS 远程访问](/platforms/mac/remote)。                                       |
| 笔记本电脑                            | 笔记本电脑，通过 SSH 隧道或 Tailscale Serve 安全暴露（保持 `gateway.bind: "loopback"`）                | 单机配置。参见 [Tailscale](/gateway/tailscale) 和 [Web](/web)。                                                                       |

对于始终开启和笔记本电脑设置，最好保留 `gateway.bind: "loopback"` 并使用 **Tailscale Serve** 来表示 Control UI，或者将受信任的 LAN/Tailnet 与 `gateway.remote.transport: "direct"` 绑定。 SSH 隧道是可在任何机器上运行的后备通道。

应用程序预览需要自己的私有入口。仅转发网关端口的隧道不转发门户。使用[托管私有服务或通配符门户ingress](/gateway/portals#remote-access)；浏览器和应用程序必须使用服务返回的门户 URL，而不替换其主机或端口。

## <a id="command-flow-(what-runs-where)"></a><a id="command-flow-what-runs-where"></a> 命令流（哪些东西运行在哪里）

一个 Gateway 拥有状态和通道；节点是外围设备。示例（Telegram 消息路由到一个节点工具）：

1. Telegram 消息到达 **Gateway**。
2. Gateway 运行 **agent**，它决定是否调用节点工具。
3. Gateway 通过 Gateway WebSocket 调用 **node**（`node.invoke` RPC）。
4. Node 返回结果；Gateway 回复 Telegram。

节点不会运行 Gateway 服务。除非你有意运行隔离配置文件，否则每台主机只应运行一个 Gateway（参见 [Multiple gateways](/gateway/multiple-gateways)）。macOS 应用的“node mode”只是通过 Gateway WebSocket 连接的一个 node 客户端。

## <a id="ssh-tunnel-(cli-%2B-tools)"></a><a id="ssh-tunnel-cli-+-tools"></a> SSH 隧道（CLI + 工具）

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

隧道建立后，`openclaw health` 和 `openclaw status --deep` 会通过 `ws://127.0.0.1:18789` 访问远程 Gateway。`openclaw gateway status`、`openclaw gateway health`、`openclaw gateway probe` 和 `openclaw gateway call` 也可以通过 `--url` 目标转发后的 URL。

要使用一个私有的 `wss://` 端点替代每个客户端的 SSH 隧道，同时让 Gateway 保持在回环地址上，请参阅[为你的 Gateway 提供稳定的 HTTPS URL](/gateway/stable-https-url)。

<Note>
第一个端口是本地端口；最终端口是远程网关目标。要保留上面的本地 URL，请仅将远程目标替换为您配置的 `gateway.port`（或 `--port` / `OPENCLAW_GATEWAY_PORT`）。例如，`ssh -N -L 18789:127.0.0.1:29443 user@gateway-host` 通过同一本地 URL 到达远程端口 `29443` 上的网关。发现和加入使用此目标的已解析网关服务端口。
</Note>

<Warning>
`--url` 不会回退使用配置或环境中的凭据。请显式传入 `--token` 或 `--password`；如果不提供这些参数，客户端将不发送任何凭据，并且当目标 Gateway 需要认证时连接会失败。
</Warning>

## <a id="cli-remote-defaults"></a> CLI 远程默认值

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

对于手动管理的SSH隧道，请保持URL为`ws://127.0.0.1:18789`，并先打开隧道。对于客户端管理的隧道，设置`gateway.remote.sshTarget`（`user@host`或`user@host:port`）； `gateway.remote.url` 保留本地隧道 URL。 macOS 应用程序使用相同的设置。如果远端端口与本地端口不同，则设置`gateway.remote.remotePort`。

当配置环回远端时URL有`gateway.remote.sshTarget`而且交通不是`direct`， CLI客户拥有SSH隧道，正如macOS应用程序确实如此。它们缓存所选设备的配对设备凭据SSH目标和远程网关端口，独立于分配的本地端口。放`gateway.remote.remotePort`当远程网关端口与网关端口不同时URL. TUI/RPC客户端和诊断检查共享该凭证范围；配对后，诊断不需要在每个连接上共享令牌或密码。客户端在关闭时关闭其隧道，并且无法通过释放的转发端口重新连接。现有配置`sshTarget`在升级时采用此客户端管理的路线。放`gateway.remote.transport: "direct"`而是保留手动管理的转发。

已固定`wss://`环回端点使用还包含证书指纹的凭证范围。无法识别的、手动转发的环回 URL 无法安全地重用仅为该 URL 保存的设备令牌URL：同一端口现在可能通向另一个网关。配置SSH目标或TLS使用固定并注册所选路线`gateway.remote.token` / `gateway.remote.password`，然后批准该网关上的配对。历史URL-只有条目保持不变，永远不会默默地重新分配给新路线。CLI和环境URL覆盖保留选定的侦听器而不是启动配置的侦听器SSH隧道，即使 URL 匹配。一个CLI `--url`仍然遵循上面明确的凭证规则。SSH别名及其OpenSSH配置仍然是运营商拥有的路由选择，而不是加密网关标识符。重新分配已注册的SSH别名保留其保存的凭据范围，因此其设备令牌可以发送到新选择的目标。连接到不同网关时使用新别名。

本地诊断更喜欢本地配对设备凭证；原始缓存后备必须与本地网关的配对记录匹配。非环回远程检查保留其现有的确切来源缓存。这些更改使用现有凭证表，而不添加架构迁移。仅恢复路由绑定会使两个凭据集保持不变。如果较旧的二进制文件拒绝独立升级的数据库架构，请恢复兼容的更新前状态；单独保留的令牌行并不是数据库降级。

跑步`openclaw configure --section gateway`或交互式登录再次保留远程TLS指纹和传输设置保持不变URL（忽略周围的空白）。改变URL清除这些端点设置。新确认的发现指纹将仅替换已发现的已保存的 PINURL，并且您选择的身份验证方法仍然适用。接受发现的直接连接选择直接传输。选择一个已发现的SSH隧道清除建议环回的已保存传输设置URL，现在可能到达不同的主机；手动启动显示的隧道。

加入和配置准备情况检查使用为同一端点保存的 TLS 指纹。检查不同的 URL 不会继承其证书 pin。

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

## <a id="gateway-behind-an-identity-aware-proxy"></a> 身份感知代理后面的 Gateway

要从头开始部署这种方式（隧道、访问应用程序、网关可信代理身份验证和节点路由），请参阅 [Cloudflare 隧道和 Access](/gateway/cloudflare-access)。本节仅介绍客户端：CLI、TUI 或应用程序如何向该边缘进行身份验证。

当身份感知代理必须在流量到达网关之前对 WebSocket 升级进行身份验证时，请使用 `gateway.remote.edgeAuth`。标头值是 `SecretInput` 字段，因此它们可以来自 `env`、`file`、`exec` 或 `store` 秘密提供程序，而无需将凭据直接放置在配置中。

对于 Cloudflare Access，通用 exec 秘密提供程序可以从操作员安装的 `cloudflared` 二进制文件中获取短期应用程序令牌：

```json5
{
  secrets: {
    providers: {
      "cloudflare-access": {
        source: "exec",
        command: "/usr/local/bin/cloudflared",
        args: ["access", "token", "-app=https://gateway.example"],
        jsonOnly: false,
        passEnv: ["HOME"],
        trustedDirs: ["/usr/local/bin"],
      },
    },
  },
  gateway: {
    mode: "remote",
    remote: {
      url: "wss://gateway.example",
      edgeAuth: {
        "Cf-Access-Token": {
          source: "exec",
          provider: "cloudflare-access",
          id: "token",
        },
      },
    },
  },
}
```

`secrets.providers.*.command` 必须是绝对路径；将 `/usr/local/bin/cloudflared` 替换为主机上真实的非符号链接安装位置，例如 Homebrew 前缀下解析的可执行文件，并保持 `trustedDirs` 指向实际保存它的目录。

Exec 提供程序在清理环境中运行。 `cloudflared` 从用户的主目录读取其缓存的应用程序令牌，因此 `passEnv: ["HOME"]` 是必需的；如果没有它，提供程序将以非零值退出，并且不会生成标头。首先运行 `cloudflared access login <gateway-url>` 一次，以便存在可以读取的令牌。

对于 Cloudflare 访问服务令牌，请提供来自任何支持的秘密提供程序的两个固定标头。此示例从环境支持的 SecretRefs 读取它们：

```json5
{
  secrets: {
    providers: {
      default: { source: "env" },
    },
  },
  gateway: {
    mode: "remote",
    remote: {
      url: "wss://gateway.example",
      edgeAuth: {
        "CF-Access-Client-Id": {
          source: "env",
          provider: "default",
          id: "CF_ACCESS_CLIENT_ID",
        },
        "CF-Access-Client-Secret": {
          source: "env",
          provider: "default",
          id: "CF_ACCESS_CLIENT_SECRET",
        },
      },
    },
  },
}
```

OpenClaw 的网关连接代码本身从不运行 `cloudflared`，并且没有 Cloudflare 依赖项或登录流程。只有通用执行机密提供程序才会调用操作员配置的确切命令。仅当目标与配置的 `gateway.remote.url` 范围匹配时，仅通过 `wss://` 发送已解析的边缘身份验证标头，并且从不跨重定向发送。

## <a id="credential-precedence"></a> 凭据优先级

网关凭证解析遵循跨 call/check/status 路径和 Discord 执行批准监控的一份共享合约。 Node-host 使用相同的合约，但有一个本地模式异常（它忽略 `gateway.remote.*`）。

- 显式凭据（`--token`、`--password` 或工具的 `gatewayToken`）在接受显式身份验证的调用路径中始终优先。
- URL 覆盖安全性：
  - CLI `--url` 从不重复使用隐式 config/env 凭证。
  - 环境变量 `OPENCLAW_GATEWAY_URL` 只能使用环境凭据（`OPENCLAW_GATEWAY_TOKEN`／`OPENCLAW_GATEWAY_PASSWORD`）。
- 本地模式默认值：
  - token：`gateway.auth.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.remote.token`（仅当本地 token 未设置时才使用远程回退）
  - password：`gateway.auth.password` -> `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password`（仅当本地 password 未设置时才使用远程回退）
- 远程模式默认值：
  - 代币：`gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - 密码：`OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Node-host 本地模式例外：环境凭据保持优先，并且会忽略 `gateway.remote.token`／`gateway.remote.password`，因为 node 命令会指向显式的主机和端口。
- Remote startup/status/wizard 检查与 SecretRef 支持将配置的 `gateway.remote.token` 和 `gateway.remote.password` 视为配置目标的权威。仅当远程凭证均未配置时，才会考虑周围环境凭证。如果配置的远程 SecretRef 无法解析，检查会发出警告并且不会回退到环境凭据；成功解析的单独配置的同级凭据仍然可用。
- Gateway 环境变量覆盖仅使用 `OPENCLAW_GATEWAY_*`。

## <a id="chat-ui-remote-access"></a> Chat UI 远程访问

WebChat 没有单独的 HTTP 端口；SwiftUI 聊天 UI 直接连接到 Gateway WebSocket。

- 通过 SSH 转发 `18789`（见上文），然后将客户端连接到 `ws://127.0.0.1:18789`。
- 对于 LAN/Tailnet 直连模式，将客户端连接到已配置的私有 `ws://` 或安全的 `wss://` URL。
- 在 macOS 上，应用的远程模式会自动管理所选传输方式。

## <a id="macos-app-remote-mode"></a> macOS 应用远程模式

macOS 菜单栏应用端到端驱动相同的设置：远程状态检查、WebChat 和 Voice Wake 转发。操作手册：[macOS 远程访问](/platforms/mac/remote)。

## <a id="security-rules-(remote%2Fvpn)"></a><a id="security-rules-remote/vpn"></a> 安全规则（remote/VPN）

除非你确定需要绑定，否则请让 Gateway 保持为 **仅限 loopback**。

- **Loopback + SSH/Tailscale Serve** 是最安全的默认配置（不暴露到公共网络）。
- Plaintext `ws://` 接受环回、private/LAN （RFC 1918）、链路本地、CGNAT、`.local` 和 `.ts.net` 主机。公共远程主机必须使用 `wss://`。
- **非 loopback 绑定**（`lan`/`tailnet`/`custom`，或 loopback 不可用时的 `auto`）必须使用 Gateway 身份验证：令牌、密码，或配置了 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。
- `gateway.remote.token` / `.password` 是客户端凭据来源；它们本身不会配置服务器身份验证。
- 仅当 `gateway.auth.*` 未设置时，本地调用路径才能使用 `gateway.remote.*` 作为后备。
- 如果通过 SecretRef 显式配置 `gateway.auth.token` / `gateway.auth.password` 并且未解析，则解析会因错误而停止，而不是回退到远程凭据。
- `gateway.remote.tlsFingerprint`固定遥控器TLS证书`wss://`，包括两者operator/control流量和同伴节点macOS直接模式。没有存储的引脚，macOS仅在正常系统信任通过后才确定首次使用；自签名或私有-CA网关需要显式指纹或远程控制SSH。
- 当 `gateway.auth.allowTailscale: true` 时，**Tailscale Serve** 可以通过身份标头对 Control UI/WebSocket 流量进行身份验证。 HTTP API 端点不使用该标头身份验证，而是遵循网关的正常 HTTP 身份验证模式。此无令牌流程假设网关主机是可信的；将其设置为 `false` 以便在任何地方进行共享秘密身份验证。
- **Trusted-proxy** 身份验证默认要求使用非 loopback 的身份感知代理。同主机上的 loopback 反向代理必须显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。
- 将浏览器控制视同操作员访问：仅限 tailnet，并有意进行节点配对。

深入了解：[安全](/gateway/security)。

### <a id="macos%3A-persistent-ssh-tunnel-via-launchagent"></a><a id="macos-persistent-ssh-tunnel-via-launchagent"></a> macOS：通过 LaunchAgent 持久化 SSH 隧道

对于 macOS 客户端，最简单的持久化方案是使用 SSH `LocalForward` 配置项，再配合一个 LaunchAgent，以便在重启和崩溃后持续保持隧道在线。

#### <a id="step-1%3A-add-ssh-config"></a><a id="step-1-add-ssh-config"></a> 第 1 步：添加 SSH 配置

编辑 `~/.ssh/config`：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>
    User <REMOTE_USER>
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

将 `<REMOTE_IP>` 和 `<REMOTE_USER>` 替换为你的值。

#### <a id="step-2%3A-copy-ssh-key-(one-time)"></a><a id="step-2-copy-ssh-key-one-time"></a> 第 2 步：复制 SSH 密钥（仅一次）

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

#### <a id="step-3%3A-configure-the-gateway-token"></a><a id="step-3-configure-the-gateway-token"></a> 第 3 步：配置 gateway token

```bash
openclaw config set gateway.remote.token "<your-token>"
```

网关接受其在任一字段中配置的机密：`gateway.remote.token` 或 `gateway.remote.password` 均有效，包括密码模式网关。服务器的 `gateway.auth.mode` 选择要使用的配置密钥。 `OPENCLAW_GATEWAY_TOKEN` 作为 shell 级覆盖仍然有效，但持久的远程客户端设置是 `gateway.remote.token` / `gateway.remote.password`。

#### <a id="step-4%3A-create-the-launchagent"></a><a id="step-4-create-the-launchagent"></a> 第 4 步：创建 LaunchAgent

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

#### <a id="step-5%3A-load-the-launchagent"></a><a id="step-5-load-the-launchagent"></a> 第 5 步：加载 LaunchAgent

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist
```

隧道会在登录时自动启动，在崩溃后重启，并保持转发端口持续可用。

设置后打开或重新打开 OpenClaw.app，然后使用 [macOS 远程访问 ](/platforms/mac/remote) 检查来验证连接。

<Note>
如果你从旧配置中遗留了 `com.openclaw.ssh-tunnel` LaunchAgent，请将其卸载并删除。
</Note>

#### <a id="troubleshooting"></a> 故障排查

```bash
# Check if the tunnel is running
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789

# Restart the tunnel
launchctl kickstart -k gui/$UID/ai.openclaw.ssh-tunnel

# Stop the tunnel
launchctl bootout gui/$UID/ai.openclaw.ssh-tunnel
```

| 配置项                         | 它的作用                                                 |
| ------------------------------------ | ------------------------------------------------------------ |
| `LocalForward 18789 127.0.0.1:18789` | 将本地端口 18789 转发到远程端口 18789               |
| `ssh -N`                             | 不执行远程命令的 SSH（仅端口转发） |
| `KeepAlive`                          | 如果隧道崩溃，则自动重启它              |
| `RunAtLoad`                          | 在 LaunchAgent 于登录时加载时启动隧道        |

## <a id="related"></a> 相关内容

- [尾盘](/gateway/tailscale)
- [认证](/gateway/authentication)
- [可信代理身份验证](/gateway/trusted-proxy-auth) — 通过反向代理验证远程访问
- [Network](/network) — OpenClaw 如何跨本地主机、LAN 和尾网连接、配对和保护设备的集线器
