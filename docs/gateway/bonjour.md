---
summary: "Bonjour/mDNS 发现 + 调试（Gateway 信标、客户端和常见故障模式）"
read_when:
  - "在 macOS/iOS 上调试 Bonjour 发现问题"
  - "更改 mDNS 服务类型、TXT 记录或发现 UX"
title: "Bonjour 发现"
---

OpenClaw 可以使用 Bonjour （mDNS/DNS-SD） 发现活动网关（WebSocket 端点）。多播`local.`浏览是**LAN-唯一的便利**：捆绑的`bonjour`插件拥有LAN广告，在macOS主机上自动启动并在Linux上选择加入， Windows，以及容器化网关部署。同一信标还可以通过配置的广域 DNS-SD 域进行发布，以进行跨网络发现。发现是尽力而为，**not** 是否取代 SSH 或基于 Tailnet 的连接。

## <a id="wide-area-bonjour-(unicast-dns-sd)-over-tailscale"></a><a id="wide-area-bonjour-unicast-dns-sd-over-tailscale"></a> Tailscale 上的广域 Bonjour（单播 DNS-SD）

如果节点和网关位于不同网络，则组播 mDNS 无法跨越边界。通过在 Tailscale 上切换到 **unicast DNS-SD**（“广域 Bonjour”）来保持相同的发现 UX：

1. 在网关主机上运行一个 DNS 服务器，并可通过 Tailnet 访问。
2. 在专用区域下发布 `_openclaw-gw._tcp` 的 DNS-SD 记录（示例：`openclaw.internal.`）。
3. 配置 Tailscale **分流 DNS**，让你选择的域通过该 DNS 服务器解析给客户端，包括 iOS。

上面的 `openclaw.internal.` 只是示例——OpenClaw 支持任意发现域。iOS/Android 节点会同时浏览 `local.` 和你配置的广域域。

### <a id="gateway-config"></a> 网关配置

```json5
{
  gateway: { bind: "tailnet" }, // tailnet-only (recommended)
  discovery: { wideArea: { domain: "openclaw.internal" } },
}
```

设置 `discovery.wideArea.domain` 启用网关广域发布。 `OPENCLAW_WIDE_AREA_DOMAIN` 环境变量为 CLI 发现和 DNS 设置提供默认值；它本身不启用网关发布。

### <a id="one-time-dns-server-setup-(gateway-host%2C-macos-only)"></a><a id="one-time-dns-server-setup-gateway-host-macos-only"></a> 一次性 DNS 服务器设置（网关主机，仅 macOS）

```bash
openclaw dns setup --apply
```

此命令仅是 macOS-，并且需要 Homebrew 和正在运行的 Tailscale 连接。它安装 CoreDNS （`brew install coredns`） 并将其配置为：

- 仅在 Gateway 的 Tailscale 接口上监听 53 端口
- 从 `~/.openclaw/dns/<domain>.db` 提供您选择的域（例如：`openclaw.internal.`）

先不带 `--apply` 运行，以便在不安装任何内容的情况下预览计划（域名、区域文件路径、检测到的 Tailnet IP、推荐配置）。

从连接到 Tailnet 的机器上验证：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### <a id="tailscale-dns-settings"></a> Tailscale DNS 设置

在 Tailscale 管理控制台中：

- 添加一个指向网关 Tailnet IP 的名称服务器（UDP/TCP 53）。
- 添加分流 DNS，使你的发现域使用该名称服务器。

一旦客户端接受 Tailnet DNS，iOS 节点和 CLI 发现就可以在你的发现域中浏览 `_openclaw-gw._tcp`，而无需组播。

### <a id="gateway-listener-security"></a> 网关监听器安全性

网关WS端口（默认`18789`）默认绑定环回。对于 LAN/Tailnet 访问，显式绑定并保持身份验证启用。对于仅 Tailnet 设置，请在 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"` 并重新启动网关（或 macOS 菜单栏应用程序）。

## <a id="what-advertises"></a> 谁会进行广播

仅网关通告`_openclaw-gw._tcp`。 LAN 多播广告在启用时来自捆绑的 `bonjour` 插件；广域 DNS-SD 发布仍由网关拥有。

## <a id="service-types"></a> 服务类型

- `_openclaw-gw._tcp` - 网关传输信标，由 macOS/iOS/Android 节点使用。

## <a id="txt-keys-(non-secret-hints)"></a><a id="txt-keys-non-secret-hints"></a> TXT 键（非秘密提示）

| 键                           | 存在时机                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `role=gateway`                | 始终。                                                                        |
| `displayName=<friendly name>` | 始终。                                                                        |
| `lanHost=<hostname>.local`    | 始终。                                                                        |
| `gatewayPort=<port>`          | 始终（gateway WS + HTTP）。                                                    |
| `transport=gateway`           | 始终。                                                                        |
| `gatewayTls=1`                | 仅当 TLS 启用时。                                                      |
| `gatewayTlsSha256=<sha256>`   | 仅当 TLS 启用且指纹可用时。                       |
| `gatewayDirectReachable=1`    | 仅当网关可直接访问时（不仅通过 relay/proxy 路径）。 |
| `tailnetDns=<magicdns>`       | 仅限 mDNS 完整模式；当 Tailnet 可用时作为可选提示。                  |
| `sshPort=<port>`              | 仅限完整模式；在最小模式和关闭模式下省略。                              |
| `cliPath=<path>`              | 仅限完整模式；在最小模式和关闭模式下省略。                              |

安全说明：

- Bonjour/mDNS TXT 记录是**未经认证的**。客户端不得将 TXT 视为权威路由信息。
- 提供基于发现的路由的客户端应使用已解析的服务端点 （SRV + A/AAAA）。仅将 `lanHost`、`tailnetDns`、`gatewayPort` 和 `gatewayTlsSha256` 视为提示。
- 在受支持的情况下，SSH 自动定位同样应使用已解析的服务主机，而不是 TXT- 仅提示。
- TLS 固定绝不能让广告的 `gatewayTlsSha256` 覆盖先前存储的引脚。
- iOS/Android 节点应将基于发现的直接连接视为 **TLS-only**，并在信任首次指纹之前需要明确的用户确认。

macOS 应用程序也将解析的端点视为提示。选择 **Nearby Gateways** 打开连接编辑器；它不会对所公布的目标进行身份验证、更改已保存的路线或导入 SSH 详细信息或证书 pin。提供可信地址、SSH 目标或所有者提供的设置代码，然后保存连接。参见[应用程序中的配置](/platforms/mac/remote#configure-in-the-app)。

## <a id="debugging-on-macos"></a> 在 macOS 上调试

内置工具：

```bash
# Browse instances
dns-sd -B _openclaw-gw._tcp local.

# Resolve one instance (replace <instance>)
dns-sd -L "<instance>" _openclaw-gw._tcp local.
```

如果浏览可以但解析失败，通常是遇到了 LAN 策略或 mDNS 解析器问题。

## <a id="debugging-in-gateway-logs"></a> 在 Gateway 日志中调试

网关会写入一个滚动日志文件（启动时会打印为 `gateway log file: ...`）。请查找 `bonjour:` 行，尤其是：

- `bonjour: advertise failed ...`
- `bonjour: suppressing ciao netmask assertion ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`

OpenClaw 启动每个 Bonjour 服务一次，然后将检查、重试、名称冲突解决和接口更改重新发布留给 mDNS 响应程序。这可以避免正常网络混乱期间的重叠发布尝试。重复的内部自检消息会被抑制，因此它们不会淹没网关日志，就像在响应者的接口轮询之间删除网络接口（例如短暂的 Docker 网桥）时发生的瞬时 `ENODEV` MDNS 套接字警告一样。

当多个 OpenClaw 网关从同一主机进行通告时，Bonjour 可能会附加后缀（例如 `(2)` 或 `(3)`）以保持服务实例名称唯一。这些后缀是正常的冲突解决方法。

当通告的 `.local` 主机是有效的 DNS 标签时，Bonjour 使用系统主机名。如果系统主机名包含空格、下划线或其他无效的 DNS-label 字符，则 OpenClaw 回退到 `openclaw.local`。当您需要显式主机标签时，请在启动网关之前设置 `OPENCLAW_MDNS_HOSTNAME=<name>`。

## <a id="debugging-on-ios-node"></a> 在 iOS 节点上调试

iOS 节点使用 `NWBrowser` 发现 `_openclaw-gw._tcp`。

要捕获日志：设置 → 网关 → 高级 → **发现调试日志**，然后设置 → 网关 → 高级 → **发现日志** → 复现 → **复制**。日志包括浏览器状态转换和结果集变化。

## <a id="when-to-enable-bonjour"></a> 何时启用 Bonjour

Bonjour 在 macOS 主机上自动启动空配置网关启动，因为本地应用程序和附近的 iOS/Android 节点通常依赖于相同的 LAN 发现。

当 Same-LAN 自动发现在 Linux、Windows 或其他非 macOS 主机上有用时，显式启用它：

```bash
openclaw plugins enable bonjour
```

启用后，Bonjour 使用 `discovery.mdns.mode` 来决定要发布多少 TXT 元数据；相同的模式控制广域 DNS-SD 记录中的可选 TXT 提示。模式：

| 模式                | 行为                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`（默认） | 仅包含核心 TXT 键；省略 `sshPort`、`cliPath`、`tailnetDns`。                                                                            |
| `full`              | 添加 `sshPort`、`cliPath`、`tailnetDns`——在客户端需要这些提示时使用。                                                             |
| `off`               | 抑制 LAN 多播而不更改插件启用；设置 `discovery.wideArea.domain` 后，广域 DNS-SD 仍然可以发布。 |

模式更改热应用，无需重新启动网关或断开客户端连接。发现所有者在发布新模式之前停止先前的广告。减少泄露还会更新任何配置的广域 DNS-SD 区域中的 TXT 提示。更改模式不会启用已禁用的 Bonjour 插件。

## <a id="when-to-disable-bonjour"></a> 何时禁用 Bonjour

当 LAN 多播广播不必要、不可用或有害时，请保持 Bonjour 处于禁用状态——常见情况包括非 macOS 服务器、Docker 桥接网络、WSL，或会丢弃 mDNS 多播的网络策略。网关仍可通过其已发布的 URL、SSH、Tailnet 或广域 DNS-SD 访问；只是 LAN 自动发现不可靠。

当问题仅限于某次部署范围时，请使用环境变量覆盖（适用于 Docker 镜像、服务文件、启动脚本、一次性调试——它会在环境消失时一并失效）：

```bash
OPENCLAW_DISABLE_BONJOUR=1
```

当你有意要为该 OpenClaw 配置关闭内置的 LAN 发现插件时，请使用插件配置：

```bash
openclaw plugins disable bonjour
```

## <a id="docker-gotchas"></a> Docker 注意事项

捆绑的 Bonjour 插件在检测到容器且 `OPENCLAW_DISABLE_BONJOUR` 未设置时，会自动禁用 LAN 多播广播。Docker bridge 网络通常不会在容器和 LAN 之间转发 mDNS 多播（`224.0.0.251:5353`），因此从容器进行广播很少能让发现正常工作。

注意事项：

- Bonjour 会在 macOS 主机上自动启动，在其他环境中则可选择启用。保持其禁用不会停止网关——只会跳过 LAN 多播广播。
- 禁用 Bonjour 不会改变 `gateway.bind`；Docker 仍然默认使用 `OPENCLAW_GATEWAY_BIND=lan`，因此已发布的主机端口仍可正常工作。
- 禁用 Bonjour 不会禁用广域 DNS-SD。当网关和节点不在同一 LAN 上时，请使用广域发现或 Tailnet。
- 在 Docker 外部重用相同的 `OPENCLAW_CONFIG_DIR` 不会保留容器的自动禁用策略。
- 仅在 host networking、macvlan 或其他已知 mDNS 多播可以通过的网络中将 `OPENCLAW_DISABLE_BONJOUR=0`；将其设置为 `1` 可强制禁用。

## <a id="troubleshooting-disabled-bonjour"></a> 排查已禁用的 Bonjour

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
   - Control UI 或本地工具：`http://127.0.0.1:18789`
   - LAN 客户：`http://<gateway-host>:18789`
   - 跨网络客户端：Tailnet MagicDNS、Tailnet IP、SSH 隧道，或广域 DNS-SD

4. 如果你在 Docker 中特意启用了 Bonjour 插件，并通过 `OPENCLAW_DISABLE_BONJOUR=0` 强制广播，请在主机上测试多播：

   ```bash
   dns-sd -B _openclaw-gw._tcp local.
   ```

   如果浏览为空，或者网关日志显示重复的 ciao 检查失败，请恢复 `OPENCLAW_DISABLE_BONJOUR=1` 并使用直接或 Tailnet 路由。

## <a id="common-failure-modes"></a> 常见故障模式

- **Bonjour 不会跨网络传递**：请使用 Tailnet 或 SSH。
- **多播被阻止**：某些 Wi-Fi 网络会禁用 mDNS。
- **广告商陷入 checking/announcing**：具有阻止的多播、容器桥接、WSL 或接口流失的主机可以使响应者处于未通告状态。网关通过直接、SSH、Tailnet 或广域 DNS-SD 路由保持可用；当多播不可用时，使用 `discovery.mdns.mode: "off"` 或 `OPENCLAW_DISABLE_BONJOUR=1` 禁用 LAN Bonjour。
- **Docker 桥接网络**：在检测到的容器中，Bonjour 会自动禁用。仅在主机、macvlan 或其他支持 mDNS 的网络上设置 `OPENCLAW_DISABLE_BONJOUR=0`。
- **Sleep/interface churn**：macOS 可能会暂时丢弃 mDNS 结果；重试。
- **浏览正常但解析失败**：请保持机器名简单（避免表情符号或标点），然后重启网关。服务实例名来自主机名，因此过于复杂的名称可能会让某些解析器出错。

## <a id="escaped-instance-names-(%5C032)"></a><a id="escaped-instance-names-\032"></a> 转义的实例名（`\032`）

Bonjour/DNS-SD 通常会在服务实例名中将字节转义为十进制的 `\DDD` 序列（空格会变成 `\032`）。这在协议层面是正常的；用户界面应在显示时进行解码（iOS 使用 `BonjourEscapes.decode`）。

## <a id="enabling-%2F-disabling-%2F-configuration"></a><a id="enabling-/-disabling-/-configuration"></a> 启用 / 禁用 / 配置

| 设置                                              | 作用                                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `openclaw plugins enable bonjour`                    | 在默认未启用该插件的主机上，启用捆绑的 LAN 发现插件。 |
| `openclaw plugins disable bonjour`                   | 通过禁用捆绑插件来关闭 LAN 多播广播。               |
| `OPENCLAW_DISABLE_BONJOUR=1` (或 `true`/`yes`/`on`)  | 在不更改插件配置的情况下，关闭 LAN 多播广播。                |
| `OPENCLAW_DISABLE_BONJOUR=0` (或 `false`/`no`/`off`) | 强制开启 LAN 多播广播，包括在检测到的容器内。        |
| `discovery.mdns.mode`                                | `off` \| `minimal`（默认）\| `full` — 参见上面的模式。                         |
| `gateway.bind`                                       | 控制 `~/.openclaw/openclaw.json` 中的网关绑定模式。                    |
| `OPENCLAW_SSH_PORT`                                  | 当 `sshPort` 被广播时（完整模式）覆盖 SSH 端口。                  |
| `OPENCLAW_TAILNET_DNS`                               | 当启用 mDNS 完整模式时，在 TXT 中发布 MagicDNS 提示。                  |
| `OPENCLAW_CLI_PATH`                                  | 覆盖广播的 CLI 路径（完整模式）。                                    |

macOS 主机会默认自动启动捆绑的 LAN 发现插件。启用 Bonjour 插件且未设置 `OPENCLAW_DISABLE_BONJOUR` 时，Bonjour 会在普通主机上进行广播，并在检测到的容器内自动禁用（Docker、Fly.io machines 以及常见容器运行时）。

## <a id="related-docs"></a> 相关文档

- 发现策略与传输选择：[发现](/gateway/discovery)
- Node 配对 + 批准：[网关配对](/gateway/pairing)
- 广域 DNS-SD 设置助手：[`openclaw dns`](/cli/dns)
