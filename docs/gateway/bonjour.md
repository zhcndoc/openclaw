---
summary: "Bonjour/mDNS 发现 + 调试（网关信标、客户端及常见失败模式）"
read_when:
  - 在 macOS/iOS 上调试 Bonjour 发现问题
  - 更改 mDNS 服务类型、TXT 记录或发现用户体验（UX）
title: "Bonjour 发现"
---

# Bonjour / mDNS 发现

OpenClaw 使用 Bonjour（mDNS / DNS-SD）作为**局域网内的便捷方式**来发现  
活动的网关（WebSocket 端点）。这是尽力而为的机制，**不**替代 SSH 或基于 Tailnet 的连接。

## Wide-area Bonjour (Unicast DNS-SD) over Tailscale

如果节点和网关处于不同网络，组播 mDNS 无法跨越网络边界。您可以通过切换为**单播 DNS-SD**  
（“广域 Bonjour”）来保持相同的发现用户体验，该服务通过 Tailscale 实现。

高层步骤：

1. 在网关主机上运行一个 DNS 服务器（通过 Tailnet 可达）。
2. 在专用域名下发布 DNS-SD 记录 `_openclaw-gw._tcp`  
   （示例：`openclaw.internal.`）。
3. 配置 Tailscale **分割 DNS**，使客户端（包括 iOS）通过该 DNS 服务器解析所选域名。

OpenClaw 支持任何发现域；`openclaw.internal.` 只是一个例子。  
iOS/Android 节点会同时浏览 `local.` 和您配置的广域域名。

### 网关配置（推荐）

```json5
{
  gateway: { bind: "tailnet" }, // 仅限 tailnet（推荐）
  discovery: { wideArea: { enabled: true } }, // 启用广域 DNS-SD 发布
}
```

### 一次性 DNS 服务器设置（网关主机）

```bash
openclaw dns setup --apply
```

该命令安装 CoreDNS 并配置：

- 仅在网关的 Tailscale 接口上监听 53 端口
- 从 `~/.openclaw/dns/<domain>.db` 服务您选择的域（例如 `openclaw.internal.`）

从通过 tailnet 连接的机器验证：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS 设置

在 Tailscale 管理控制台：

- 添加指向网关 tailnet IP 的名称服务器（UDP/TCP 53 端口）。
- 添加分割 DNS，使您的发现域使用该名称服务器。

客户端启用 tailnet DNS 后，iOS 节点可以在您的发现域中浏览  
`_openclaw-gw._tcp`，无需组播。

### 网关监听安全（推荐）

网关 WS 端口（默认 `18789`）默认绑定到环回接口。对于局域网/尾网访问，建议显式绑定并保持认证启用。

对于仅 tailnet 的设置：

- 在 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"`。
- 重启网关（或重启 macOS 菜单栏应用）。

## 通告的内容

仅网关会通告 `_openclaw-gw._tcp`。

## 服务类型

- `_openclaw-gw._tcp` — 网关传输信标（macOS/iOS/Android 节点使用）。

## TXT 键（非秘密提示）

网关会通告一些小的非秘密提示，以简化 UI 流程：

- `role=gateway`
- `displayName=<友好名称>`
- `lanHost=<hostname>.local`
- `gatewayPort=<端口>`（网关 WS + HTTP）
- `gatewayTls=1`（仅当启用 TLS 时）
- `gatewayTlsSha256=<sha256>`（仅当启用 TLS 且有指纹时）
- `canvasPort=<端口>`（仅当启用画布主机；当前与 `gatewayPort` 相同）
- `sshPort=<端口>`（未覆盖时默认为 22）
- `transport=gateway`
- `cliPath=<路径>`（可选；可运行的 `openclaw` 入口点的绝对路径）
- `tailnetDns=<magicdns>`（当 Tailnet 可用时的可选提示）

安全提示：

- Bonjour/mDNS TXT 记录是**无认证的**。客户端不应将 TXT 视为权威路由。  
- 客户端应使用解析出的服务端点（SRV + A/AAAA）路由。将 `lanHost`、`tailnetDns`、`gatewayPort` 和 `gatewayTlsSha256` 仅作为提示。  
- TLS 固定不应允许通告的 `gatewayTlsSha256` 覆盖先前存储的指纹。  
- iOS/Android 节点应将基于发现的直接连接视为**仅限 TLS**，需要用户明确确认首个指纹后才信任。

## 在 macOS 上调试

内置的有用工具：

- 浏览实例：

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- 解析单个实例（替换 `<instance>`）：

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

如果浏览可用但解析失败，通常是遇到局域网策略或 mDNS 解析器问题。

## 在网关日志中调试

网关写入循环日志文件（启动时打印为 `gateway log file: ...`）。关注 `bonjour:` 行，特别是：

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## 在 iOS 节点调试

iOS 节点使用 `NWBrowser` 来发现 `_openclaw-gw._tcp`。

捕获日志：

- 设置 → 网关 → 高级 → **发现调试日志**  
- 设置 → 网关 → 高级 → **发现日志** → 重现问题 → **复制**

日志包含浏览器状态变更和结果集更新。

## 常见失败模式

- **Bonjour 不跨网络**：使用 Tailnet 或 SSH。  
- **组播被阻止**：部分 Wi-Fi 网络禁用了 mDNS。  
- **睡眠/接口变动**：macOS 可能临时丢失 mDNS 结果；重试。  
- **浏览成功但解析失败**：保持机器名简单（避免表情符号或标点），然后重启网关。服务实例名来源于主机名，过于复杂的名称可能令某些解析器混淆。

## 转义的实例名（`\032`）

Bonjour/DNS-SD 频繁将服务实例名中的字节转义为十进制 `\DDD` 序列（如空格转成 `\032`）。

- 这是协议层面的正常现象。  
- UI 应该解码以用于显示（iOS 使用 `BonjourEscapes.decode`）。

## 禁用 / 配置

- `OPENCLAW_DISABLE_BONJOUR=1` 禁用通告（旧版：`OPENCLAW_DISABLE_BONJOUR`）。  
- `gateway.bind` 在 `~/.openclaw/openclaw.json` 中控制网关绑定模式。  
- `OPENCLAW_SSH_PORT` 覆盖 TXT 中通告的 SSH 端口（旧版：`OPENCLAW_SSH_PORT`）。  
- `OPENCLAW_TAILNET_DNS` 在 TXT 中发布 MagicDNS 提示（旧版：`OPENCLAW_TAILNET_DNS`）。  
- `OPENCLAW_CLI_PATH` 覆盖通告的 CLI 路径（旧版：`OPENCLAW_CLI_PATH`）。

## 相关文档

- 发现策略与传输选择：[Discovery](/gateway/discovery)  
- 节点配对 + 审批：[Gateway pairing](/gateway/pairing)
