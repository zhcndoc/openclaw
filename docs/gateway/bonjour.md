---
summary: "Bonjour/mDNS 发现 + 调试（Gateway 信标、客户端和常见故障模式）"
read_when:
  - 在 macOS/iOS 上调试 Bonjour 发现问题
  - 更改 mDNS 服务类型、TXT 记录或发现交互体验
title: "Bonjour 发现"
---

OpenClaw 可以使用 Bonjour（mDNS/DNS-SD）来发现一个活动的 gateway（WebSocket 端点）。多播 `local.` 浏览是一种 **仅限局域网的便利功能**：捆绑的 `bonjour` 插件负责局域网广播，会在 macOS 主机上自动启动，并可在 Linux、Windows 和容器化 gateway 部署中选择启用。同一个信标也可以通过已配置的广域 DNS-SD 域进行发布，以便跨网络发现。发现功能尽力而为，**不能**替代 SSH 或基于 Tailnet 的连接。

## 通过 Tailscale 使用广域 Bonjour（单播 DNS-SD）

如果节点和网关位于不同网络，组播 mDNS 无法跨越边界。可以通过 Tailscale 切换到 **单播 DNS-SD**（“广域 Bonjour”），以保持相同的发现体验：

1. 在网关主机上运行一个 DNS 服务器，并可通过 Tailnet 访问。
2. 在专用区域下发布 `_openclaw-gw._tcp` 的 DNS-SD 记录（示例：`openclaw.internal.`）。
3. 配置 Tailscale **分流 DNS**，让你选择的域通过该 DNS 服务器解析给客户端，包括 iOS。

上面的 `openclaw.internal.` 只是示例——OpenClaw 支持任意发现域。iOS/Android 节点会同时浏览 `local.` 和你配置的广域域。

### 网关配置

```json5
{
  gateway: { bind: "tailnet" }, // 仅限 tailnet（推荐）
  discovery: { wideArea: { enabled: true, domain: "openclaw.internal" } },
}
```

当 `discovery.wideArea.domain` 未设置时，也可以回退使用 `OPENCLAW_WIDE_AREA_DOMAIN` 环境变量。

### 一次性 DNS 服务器设置（网关主机，仅 macOS）

```bash
openclaw dns setup --apply
```

此命令仅适用于 macOS，并且需要 Homebrew 以及正在运行的 Tailscale 连接。它会安装 CoreDNS（`brew install coredns`），并将其配置为：

- 仅在 Gateway 的 Tailscale 接口上监听 53 端口
- 从 `~/.openclaw/dns/<domain>.db` 提供你选择的域（示例：`openclaw.internal.`）

先不带 `--apply` 运行，以便在不安装任何内容的情况下预览计划（域名、区域文件路径、检测到的 Tailnet IP、推荐配置）。

从连接到 Tailnet 的机器上验证：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS 设置

在 Tailscale 管理控制台中：

- 添加一个指向网关 Tailnet IP 的 nameserver（UDP/TCP 53）。
- 添加分流 DNS，使你的发现域使用该 nameserver。

一旦客户端接受 Tailnet DNS，iOS 节点和 CLI 发现就可以在你的发现域中浏览 `_openclaw-gw._tcp`，而无需组播。

### 网关监听器安全性

网关 WS 端口（默认 `18789`）默认绑定到本地回环接口。对于 LAN/Tailnet 访问，请显式绑定并保持认证开启。对于仅限 Tailnet 的设置，请在 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"`，然后重启网关（或 macOS 菜单栏应用）。

## 谁会进行广播

只有网关会发布 `_openclaw-gw._tcp`。启用后，局域网组播广播由内置的 `bonjour` 插件提供；广域 DNS-SD 发布仍由网关负责。

## 服务类型

- `_openclaw-gw._tcp` - 网关传输信标，由 macOS/iOS/Android 节点使用。

## TXT 键（非秘密提示）

| 键                            | 存在时机                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `role=gateway`                | 始终。                                                                       |
| `displayName=<friendly name>` | 始终。                                                                       |
| `lanHost=<hostname>.local`    | 始终。                                                                       |
| `gatewayPort=<port>`          | 始终（gateway WS + HTTP）。                                                 |
| `transport=gateway`           | 始终。                                                                       |
| `gatewayTls=1`                | 仅当启用 TLS 时。                                                            |
| `gatewayTlsSha256=<sha256>`   | 仅当启用 TLS 且可获得指纹时。                                                |
| `gatewayDirectReachable=1`    | 仅当网关可直接访问时（不仅仅通过中继/代理路径）。                              |
| `canvasPort=<port>`           | 仅当启用 canvas 主机时；当前与 `gatewayPort` 相同。                           |
| `tailnetDns=<magicdns>`       | 仅限 mDNS 完整模式；当 Tailnet 可用时作为可选提示。                           |
| `sshPort=<port>`              | 仅限完整模式；在最小模式和关闭模式下省略。                                    |
| `cliPath=<path>`              | 仅限完整模式；在最小模式和关闭模式下省略。                                    |

安全说明：

- Bonjour/mDNS TXT 记录是**未经认证的**。客户端不得将 TXT 视为权威路由信息。
- 客户端应使用解析得到的服务端点（SRV + A/AAAA）进行路由。将 `lanHost`、`tailnetDns`、`gatewayPort` 和 `gatewayTlsSha256` 仅视为提示。
- SSH 自动目标定位同样应使用解析得到的服务主机，而不是仅依赖 TXT 提示。
- TLS 固定（pinning）绝不能让广告中的 `gatewayTlsSha256` 覆盖之前已保存的固定值。
- iOS/Android 节点应将基于发现的直接连接视为**仅限 TLS**，并在首次信任指纹前要求用户显式确认。

## 在 macOS 上调试

内置工具：

```bash
# 浏览实例
dns-sd -B _openclaw-gw._tcp local.

# 解析一个实例（替换 <instance>）
dns-sd -L "<instance>" _openclaw-gw._tcp local.
```

如果浏览可以但解析失败，通常是遇到了 LAN 策略或 mDNS 解析器问题。

## 在 Gateway 日志中调试

网关会写入一个滚动日志文件（启动时会打印为 `gateway log file: ...`）。请查找 `bonjour:` 行，尤其是：

- `bonjour: advertise failed ...`
- `bonjour: suppressing ciao cancellation ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`
- `bonjour: disabling advertiser after ... failed restarts ...`

看门狗会将活跃的 `probing`、`announcing` 以及新发生冲突后的重命名视为进行中的状态。若服务始终未达到 `announced`，OpenClaw 会重新创建 advertiser，并在多次失败后，为该网关进程禁用 Bonjour，而不是无限期地重新广播。

当系统主机名是有效的 DNS 标签时，Bonjour 会使用它作为已广播的 `.local` 主机名。如果系统主机名包含空格、下划线或其他无效的 DNS 标签字符，OpenClaw 会回退到 `openclaw.local`。在需要显式主机标签时，请在启动网关之前设置 `OPENCLAW_MDNS_HOSTNAME=<name>`。

## 在 iOS 节点上调试

iOS 节点使用 `NWBrowser` 发现 `_openclaw-gw._tcp`。

要捕获日志：Settings -> Gateway -> Advanced -> **Discovery Debug Logs**，然后 Settings -> Gateway -> Advanced -> **Discovery Logs** -> 复现 -> **Copy**。日志包括浏览器状态转换和结果集变化。

## 何时启用 Bonjour

Bonjour 会在 macOS 主机上针对空配置网关启动时自动启动，因为本地应用和附近的 iOS/Android 节点通常依赖同一局域网内的发现。

当在 Linux、Windows 或其他非 macOS 主机上，局域网内自动发现有用时，请显式启用它：

```bash
openclaw plugins enable bonjour
```

启用后，Bonjour 会使用 `discovery.mdns.mode` 来决定要发布多少 TXT 元数据；同样的模式也会控制广域 DNS-SD 记录中的可选 TXT 提示。模式如下：

| 模式                | 行为                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`（默认）   | 仅包含核心 TXT 键；省略 `sshPort`、`cliPath`、`tailnetDns`。                                                                                                 |
| `full`              | 添加 `sshPort`、`cliPath`、`tailnetDns` —— 当客户端需要这些提示时使用。                                                                                      |
| `off`               | 在不改变插件启用状态的情况下抑制局域网多播；当 `discovery.wideArea.enabled` 为 true 时，广域 DNS-SD 仍可发布最小信标。 |

## 何时禁用 Bonjour

当 LAN 多播广播不必要、不可用或有害时，请保持 Bonjour 处于禁用状态——常见情况包括非 macOS 服务器、Docker 桥接网络、WSL，或会丢弃 mDNS 多播的网络策略。网关仍可通过其已发布的 URL、SSH、Tailnet 或广域 DNS-SD 访问；只是 LAN 自动发现不可靠。

当问题仅限于某次部署范围时，请使用环境变量覆盖（适用于 Docker 镜像、服务文件、启动脚本、一次性调试——它会在环境消失时一并失效）：

```bash
OPENCLAW_DISABLE_BONJOUR=1
```

当你有意要为该 OpenClaw 配置关闭内置的 LAN 发现插件时，请使用插件配置：

```bash
openclaw plugins disable bonjour
```

## Docker 注意事项

捆绑的 Bonjour 插件在检测到容器且 `OPENCLAW_DISABLE_BONJOUR` 未设置时，会自动禁用 LAN 多播广播。Docker bridge 网络通常不会在容器和 LAN 之间转发 mDNS 多播（`224.0.0.251:5353`），因此从容器进行广播很少能让发现正常工作。

注意事项：

- Bonjour 会在 macOS 主机上自动启动，在其他环境中则为可选启用。保持其禁用不会停止网关——只会跳过 LAN 多播广播。
- 禁用 Bonjour 不会改变 `gateway.bind`；Docker 仍然默认使用 `OPENCLAW_GATEWAY_BIND=lan`，因此已发布的主机端口仍可正常工作。
- 禁用 Bonjour 不会禁用广域 DNS-SD。当网关和节点不在同一 LAN 上时，请使用广域发现或 Tailnet。
- 在 Docker 外部重用相同的 `OPENCLAW_CONFIG_DIR` 不会保留容器的自动禁用策略。
- 仅在 host networking、macvlan 或其他已知 mDNS 多播可以通过的网络中将 `OPENCLAW_DISABLE_BONJOUR=0`；将其设置为 `1` 可强制禁用。

## 排查已禁用的 Bonjour

如果某个节点在 Docker 设置后不再自动发现网关：

1. 确认网关当前是自动、强制开启，还是强制关闭模式：

   ```bash
   docker compose config | grep OPENCLAW_DISABLE_BONJOUR
   ```

2. 确认网关本身是否可通过已发布端口访问：

   ```bash
   curl -fsS http://127.0.0.1:18789/healthz
   ```

3. 在禁用 Bonjour 时使用直接目标：
   - 控制 UI 或本地工具：`http://127.0.0.1:18789`
   - 局域网客户端：`http://<gateway-host>:18789`
   - 跨网络客户端：Tailnet MagicDNS、Tailnet IP、SSH 隧道，或广域 DNS-SD

4. 如果你在 Docker 中特意启用了 Bonjour 插件，并通过 `OPENCLAW_DISABLE_BONJOUR=0` 强制广播，请在主机上测试多播：

   ```bash
   dns-sd -B _openclaw-gw._tcp local.
   ```

   如果浏览结果为空，或者网关日志显示 ciao watchdog 反复取消，请恢复 `OPENCLAW_DISABLE_BONJOUR=1`，并改用直接路由或 Tailnet 路由。

## 常见故障模式

- **Bonjour 不会跨网络工作**：请使用 Tailnet 或 SSH。
- **多播被阻止**：某些 Wi-Fi 网络会禁用 mDNS。
- **发布者卡在 probing/announcing 状态**：主机上的多播被阻止、容器桥接、WSL 或接口频繁变动，都可能使 ciao 发布者停留在未发布状态。OpenClaw 会重试几次，然后为当前网关进程禁用 Bonjour，而不是无限重启发布者。
- **Docker bridge 网络**：在检测到的容器中，Bonjour 会自动禁用。仅在主机、macvlan 或其他支持 mDNS 的网络上设置 `OPENCLAW_DISABLE_BONJOUR=0`。
- **睡眠/接口频繁变动**：macOS 可能会暂时丢失 mDNS 结果；请重试。
- **浏览可用但解析失败**：保持机器名简单（避免表情符号或标点），然后重启网关。服务实例名来源于主机名，因此过于复杂的名称可能会让某些解析器感到困惑。

## 转义的实例名（`\032`）

Bonjour/DNS-SD 通常会在服务实例名中将字节转义为十进制的 `\DDD` 序列（空格会变成 `\032`）。这在协议层面是正常的；用户界面应在显示时进行解码（iOS 使用 `BonjourEscapes.decode`）。

## 启用 / 禁用 / 配置

| 设置                                                 | 效果                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `openclaw plugins enable bonjour`                    | 在默认未启用该插件的主机上，启用捆绑的 LAN 发现插件。                               |
| `openclaw plugins disable bonjour`                   | 通过禁用捆绑插件来关闭 LAN 多播广播。                                              |
| `OPENCLAW_DISABLE_BONJOUR=1` (或 `true`/`yes`/`on`)   | 在不更改插件配置的情况下，关闭 LAN 多播广播。                                       |
| `OPENCLAW_DISABLE_BONJOUR=0` (或 `false`/`no`/`off`)  | 强制开启 LAN 多播广播，包括在检测到的容器内。                                       |
| `discovery.mdns.mode`                                | `off` \| `minimal`（默认）\| `full` — 参见上面的模式。                              |
| `gateway.bind`                                       | 控制 `~/.openclaw/openclaw.json` 中的网关绑定模式。                                 |
| `OPENCLAW_SSH_PORT`                                  | 当 `sshPort` 被广播时（完整模式）覆盖 SSH 端口。                                     |
| `OPENCLAW_TAILNET_DNS`                               | 在启用 mDNS 完整模式时，在 TXT 中发布 MagicDNS 提示。                               |
| `OPENCLAW_CLI_PATH`                                  | 覆盖广播的 CLI 路径（完整模式）。                                                    |

macOS 主机会默认自动启动捆绑的 LAN 发现插件。启用 Bonjour 插件且未设置 `OPENCLAW_DISABLE_BONJOUR` 时，Bonjour 会在普通主机上进行广播，并在检测到的容器内自动禁用（Docker、Fly.io machines 以及常见容器运行时）。

## 相关文档

- 发现策略与传输选择：[发现](/gateway/discovery)
- 节点配对 + 审批：[网关配对](/gateway/pairing)
