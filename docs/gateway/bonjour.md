---
summary: "Bonjour/mDNS 发现 + 调试（Gateway 信标、客户端和常见故障模式）"
read_when:
  - 在 macOS/iOS 上调试 Bonjour 发现问题
  - 更改 mDNS 服务类型、TXT 记录或发现交互体验
title: "Bonjour 发现"
---

OpenClaw 可以使用 Bonjour（mDNS / DNS-SD）来发现一个正在运行的 Gateway（WebSocket 端点）。
多播 `local.` 浏览是一种**仅限 LAN 的便捷功能**。捆绑的 `bonjour`
插件负责 LAN 广播。它会在 macOS 主机上自动启动，并在
Linux、Windows 和容器化的 Gateway 部署中按需启用。对于跨网络发现，同一个
信标也可以通过已配置的广域 DNS-SD 域发布。发现
仍然是尽力而为，**不能**替代 SSH 或 Tailnet 基础的连接。

## 通过 Tailscale 使用广域 Bonjour（单播 DNS-SD）

如果节点和 Gateway 位于不同网络，多播 mDNS 不会跨越
边界。你可以通过在 Tailscale 上使用**单播 DNS-SD**
（“广域 Bonjour”）来保持相同的发现体验。

高层步骤：

1. 在 Gateway 主机上运行一个 DNS 服务器（可通过 Tailnet 访问）。
2. 在专用区域下为 `_openclaw-gw._tcp` 发布 DNS-SD 记录
   （示例：`openclaw.internal.`）。
3. 配置 Tailscale **分割 DNS**，使你选择的域通过该
   DNS 服务器为客户端（包括 iOS）解析。

OpenClaw 支持任何发现域；`openclaw.internal.` 只是一个示例。
iOS/Android 节点会同时浏览 `local.` 和你配置的广域域名。

### Gateway 配置（推荐）

```json5
{
  gateway: { bind: "tailnet" }, // 仅 tailnet（推荐）
  discovery: { wideArea: { enabled: true } }, // 启用广域 DNS-SD 发布
}
```

### 一次性 DNS 服务器设置（Gateway 主机）

```bash
openclaw dns setup --apply
```

这会安装 CoreDNS 并将其配置为：

- 仅在 Gateway 的 Tailscale 接口上监听 53 端口
- 从 `~/.openclaw/dns/<domain>.db` 提供你选择的域（示例：`openclaw.internal.`）

从一个已连接到 tailnet 的机器上验证：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS 设置

在 Tailscale 管理控制台中：

- 添加一个指向 Gateway 的 tailnet IP 的 nameserver（UDP/TCP 53）。
- 添加 split DNS，使你的发现域使用该 nameserver。

一旦客户端接受 tailnet DNS，iOS 节点和 CLI 发现就可以在你的发现域名中浏览
`_openclaw-gw._tcp`，而无需多播。

### Gateway 监听器安全性（推荐）

Gateway WS 端口（默认 `18789`）默认绑定到回环地址。对于 LAN/tailnet
访问，请显式绑定并保持启用认证。

对于仅 tailnet 的设置：

- 在 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"`。
- 重启 Gateway（或重启 macOS 菜单栏应用）。

## 谁会进行广播

只有 Gateway 会广播 `_openclaw-gw._tcp`。当插件启用时，LAN 多播广播
由捆绑的 `bonjour` 插件提供；广域
DNS-SD 发布仍由 Gateway 负责。

## 服务类型

- `_openclaw-gw._tcp` - gateway 传输信标（供 macOS/iOS/Android 节点使用）。

## TXT 键（非秘密提示）

Gateway 会广播少量非秘密提示，以便让 UI 流程更方便：

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>`（Gateway WS + HTTP）
- `gatewayTls=1`（仅在启用 TLS 时）
- `gatewayTlsSha256=<sha256>`（仅在启用 TLS 且指纹可用时）
- `canvasPort=<port>`（仅在启用 canvas host 时；当前与 `gatewayPort` 相同）
- `transport=gateway`
- `tailnetDns=<magicdns>`（仅 mDNS 完整模式；当 Tailnet 可用时的可选提示）
- `sshPort=<port>`（仅 mDNS 完整模式；广域 DNS-SD 可能省略它）
- `cliPath=<path>`（仅 mDNS 完整模式；广域 DNS-SD 仍会将其写为远程安装提示）

安全说明：

- Bonjour/mDNS TXT 记录是**未经认证**的。客户端不得将 TXT 视为权威路由信息。
- 客户端应使用解析得到的服务端点（SRV + A/AAAA）进行路由。将 `lanHost`、`tailnetDns`、`gatewayPort` 和 `gatewayTlsSha256` 仅视为提示。
- SSH 自动目标选择同样应使用解析得到的服务主机，而不是仅依赖 TXT 提示。
- TLS pinning 绝不能允许广告中的 `gatewayTlsSha256` 覆盖之前存储的 pin。
- iOS/Android 节点应将基于发现的直接连接视为 **仅 TLS**，并且在首次信任指纹前需要显式用户确认。

## 在 macOS 上调试

内置的有用工具：

- 浏览实例：

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- 解析一个实例（替换 `<instance>`）：

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

如果浏览正常但解析失败，通常是遇到了 LAN 策略或
mDNS 解析器问题。

## 在 Gateway 日志中调试

Gateway 会写入一个滚动日志文件（启动时会打印为
`gateway log file: ...`）。请查看 `bonjour:` 相关行，尤其是：

- `bonjour: advertise failed ...`
- `bonjour: suppressing ciao cancellation ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`
- `bonjour: disabling advertiser after ... failed restarts ...`

当系统主机名是有效的 DNS 标签时，Bonjour 会使用系统主机名作为广告中的 `.local` 主机名。如果系统主机名包含空格、下划线或其他无效的 DNS 标签字符，OpenClaw 会回退到 `openclaw.local`。当你需要明确的主机标签时，请在启动 Gateway 前设置 `OPENCLAW_MDNS_HOSTNAME=<name>`。

## 在 iOS 节点上调试

iOS 节点使用 `NWBrowser` 发现 `_openclaw-gw._tcp`。

要捕获日志：

- Settings → Gateway → Advanced → **Discovery Debug Logs**
- Settings → Gateway → Advanced → **Discovery Logs** → 复现 → **Copy**

日志包含浏览器状态转换和结果集变化。

## 何时启用 Bonjour

Bonjour 会在 macOS 主机上的空配置 Gateway 启动时自动启动，因为
本地应用和附近的 iOS/Android 节点通常依赖同一 LAN 的发现。

当同一 LAN 的自动发现对 Linux、
Windows 或其他非 macOS 主机有用时，请显式启用 Bonjour：

```bash
openclaw plugins enable bonjour
```

启用后，Bonjour 会使用 `discovery.mdns.mode` 来决定发布多少 TXT 元数据。
默认模式是 `minimal`；仅在本地客户端需要
`cliPath` 或 `sshPort` 提示时使用 `full`，并使用 `off` 来抑制 LAN 多播，
而不改变插件启用状态。

## 何时禁用 Bonjour

当 LAN 多播广播不必要、不可用或有害时，请保持 Bonjour 处于禁用状态。
常见情况包括非 macOS 服务器、Docker bridge 网络、
WSL，或会丢弃 mDNS 多播的网络策略。在这些环境中，Gateway 仍然可以通过其已发布的 URL、SSH、Tailnet 或广域
DNS-SD 访问，但 LAN 自动发现不可靠。

当问题属于部署范围时，优先使用现有环境覆盖：

```bash
OPENCLAW_DISABLE_BONJOUR=1
```

这会在不更改插件配置的情况下禁用 LAN 多播广播。
它适用于 Docker 镜像、服务文件、启动脚本和一次性
调试，因为当环境变量消失时，这个设置也会消失。

如果你明确希望针对该 OpenClaw 配置关闭捆绑的 LAN
发现插件，请使用插件配置：

```bash
openclaw plugins disable bonjour
```

## Docker 注意事项

在检测到的容器中，如果 `OPENCLAW_DISABLE_BONJOUR` 未设置，捆绑的 Bonjour 插件会自动禁用 LAN 多播广播。Docker bridge 网络通常不会在容器和 LAN 之间转发 mDNS 多播（`224.0.0.251:5353`），因此从容器进行广播通常无法让发现生效。

重要注意事项：

- Bonjour 会在 macOS 主机上自动启动，在其他地方则需要显式启用。保持其
  禁用不会停止 Gateway；它只会跳过 LAN 多播广播。
- 禁用 Bonjour 不会更改 `gateway.bind`；Docker 仍然默认
  `OPENCLAW_GATEWAY_BIND=lan`，因此已发布的主机端口可以工作。
- 禁用 Bonjour 不会禁用广域 DNS-SD。当 Gateway 和节点不在同一 LAN 上时，请使用广域发现
  或 Tailnet。
- 在 Docker 外部重用相同的 `OPENCLAW_CONFIG_DIR` 不会保留
  容器自动禁用策略。
- 仅在 host networking、macvlan 或其他已知支持 mDNS 多播的
  网络中将 `OPENCLAW_DISABLE_BONJOUR=0`；将其设为 `1` 可强制禁用。

## 排查已禁用的 Bonjour

如果在 Docker 设置后节点不再自动发现 Gateway：

1. 确认 Gateway 运行在自动、强制开启或强制关闭模式：

   ```bash
   docker compose config | grep OPENCLAW_DISABLE_BONJOUR
   ```

2. 确认 Gateway 本身可通过发布的端口访问：

   ```bash
   curl -fsS http://127.0.0.1:18789/healthz
   ```

3. 当 Bonjour 被禁用时，使用直接目标：
   - 控制 UI 或本地工具：`http://127.0.0.1:18789`
   - LAN 客户端：`http://<gateway-host>:18789`
   - 跨网络客户端：Tailnet MagicDNS、Tailnet IP、SSH 隧道，或
     广域 DNS-SD

4. 如果你在 Docker 中有意启用了 Bonjour 插件并使用
   `OPENCLAW_DISABLE_BONJOUR=0` 强制广播，请从主机测试多播：

   ```bash
   dns-sd -B _openclaw-gw._tcp local.
   ```

   如果浏览为空，或者 Gateway 日志显示反复的 ciao watchdog
   取消，请恢复 `OPENCLAW_DISABLE_BONJOUR=1` 并使用直接路由或
   Tailnet 路由。

## 常见故障模式

- **Bonjour 不跨网络**：请使用 Tailnet 或 SSH。
- **多播被阻止**：某些 Wi-Fi 网络会禁用 mDNS。
- **广告器卡在 probing/announcing**：主机上被阻止的多播、
  容器桥接、WSL 或接口频繁变动都可能让 ciao 广播器处于
  未宣布状态。OpenClaw 会重试几次，然后为当前 Gateway 进程
  禁用 Bonjour，而不是无限重启广告器。
- **Docker bridge 网络**：Bonjour 会在检测到的容器中自动禁用。
  仅在 host、macvlan 或其他已知支持
  mDNS 的网络中将 `OPENCLAW_DISABLE_BONJOUR=0`。
- **睡眠 / 接口频繁变动**：macOS 可能会暂时丢失 mDNS 结果；请重试。
- **浏览正常但解析失败**：保持机器名简洁（避免 emoji 或
  标点），然后重启 Gateway。服务实例名来源于
  主机名，因此过于复杂的名称可能会让某些解析器感到困惑。

## 转义的实例名（`\032`）

Bonjour/DNS-SD 通常会将服务实例名中的字节转义为十进制 `\DDD`
序列（例如空格会变成 `\032`）。

- 这是协议层面的正常现象。
- UI 应在显示时进行解码（iOS 使用 `BonjourEscapes.decode`）。

## 启用 / 禁用 / 配置

- macOS 主机会默认自动启动捆绑的 LAN 发现插件。
- `openclaw plugins enable bonjour` 会在未默认启用的主机上启用捆绑的 LAN 发现插件。
- `openclaw plugins disable bonjour` 会通过禁用捆绑插件来禁用 LAN 多播广播。
- `OPENCLAW_DISABLE_BONJOUR=1` 会在不更改插件配置的情况下禁用 LAN 多播广播；可接受的真值为 `1`、`true`、`yes` 和 `on`（旧式：`OPENCLAW_DISABLE_BONJOUR`）。
- `OPENCLAW_DISABLE_BONJOUR=0` 会强制开启 LAN 多播广播，包括在检测到的容器内；可接受的假值为 `0`、`false`、`no` 和 `off`。
- 当 Bonjour 插件已启用且 `OPENCLAW_DISABLE_BONJOUR` 未设置时，Bonjour 会在正常主机上广播，并在检测到的容器内自动禁用。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制 Gateway 的绑定模式。
- 当 `sshPort` 被广播时，`OPENCLAW_SSH_PORT` 会覆盖 SSH 端口（旧式：`OPENCLAW_SSH_PORT`）。
- 当启用 mDNS 完整模式时，`OPENCLAW_TAILNET_DNS` 会在 TXT 中发布 MagicDNS 提示（旧式：`OPENCLAW_TAILNET_DNS`）。
- `OPENCLAW_CLI_PATH` 会覆盖广播的 CLI 路径（旧式：`OPENCLAW_CLI_PATH`）。

## 相关文档

- 发现策略与传输选择：[发现](/gateway/discovery)
- 节点配对 + 审批：[网关配对](/gateway/pairing)
