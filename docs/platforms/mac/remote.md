---
summary: "用于通过 SSH 控制远程 OpenClaw 网关的 macOS 应用流程"
read_when:
  - 设置或调试远程 Mac 控制
title: "远程控制"
---

此流程让 macOS 应用可以作为一个完整的远程控制器，控制运行在另一台主机（桌面/服务器）上的 OpenClaw 网关。这就是应用的 **通过 SSH 远程**（远程运行）功能。所有功能——健康检查、Voice Wake 转发和 Web Chat——都复用来自 _设置 → 通用_ 的同一份远程 SSH 配置。

## 模式

- **本地（这台 Mac）**：所有内容都在笔记本上运行。不会涉及 SSH。
- **通过 SSH 远程（默认）**：OpenClaw 命令在远程主机上执行。mac 应用会使用 `-o BatchMode`、你选择的身份/密钥以及本地端口转发建立一个 SSH 连接。
- **直接远程（ws/wss）**：不使用 SSH 隧道。mac 应用直接连接到网关 URL（例如通过 Tailscale Serve 或公共 HTTPS 反向代理）。

## 远程传输

远程模式支持两种传输方式：

- **SSH 隧道**（默认）：使用 `ssh -N -L ...` 将网关端口转发到 localhost。由于隧道是回环连接，网关会将节点的 IP 视为 `127.0.0.1`。
- **直接（ws/wss）**：直接连接到网关 URL。网关会看到真实的客户端 IP。

在 SSH 隧道模式下，发现的 LAN/tailnet 主机名会存储在
`gateway.remote.sshTarget` 中。应用会将 `gateway.remote.url` 保持为本地
隧道终点，例如 `ws://127.0.0.1:18789`，这样 CLI、Web Chat 以及
本地节点主机服务都能共享同一个安全的回环传输。

远程模式下的浏览器自动化由 CLI 节点主机处理，而不是原生 macOS 应用节点。
应用会在可能时启动已安装的节点主机服务；如果你需要从那台 Mac 控制浏览器，
请使用 `openclaw node install ...` 和 `openclaw node start` 安装/启动它（或者在前台运行
`openclaw node run ...`），并将目标指向那个具备浏览器能力的
节点。

## 远程主机前置条件

1. 安装 Node + pnpm，并构建/安装 OpenClaw CLI（`pnpm install && pnpm build && pnpm link --global`）。
2. 确保 `openclaw` 在非交互式 shell 的 PATH 中（如有需要，符号链接到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 启用带密钥认证的 SSH。我们建议使用 **Tailscale** IP，以便主机在离开局域网后仍可访问。

## macOS 应用设置

1. 打开 _设置 → 通用_。
2. 在 **OpenClaw 的运行方式** 下，选择 **通过 SSH 远程** 并配置：
   - **传输方式**：**SSH 隧道** 或 **直接远程（ws/wss）**。
   - **SSH 目标**：`user@host`（可选 `:port`）。
     - 如果网关在同一局域网且支持 Bonjour 广播，可从发现列表中选择它以自动填充此字段。
   - **网关 URL**（仅直接模式）：`wss://gateway.example.ts.net`（本地/LAN 则使用 `ws://...`）。
   - **身份文件**（高级）：你的密钥路径。
   - **项目根目录**（高级）：用于命令的远程检出路径。
   - **CLI 路径**（高级）：可选的可运行 `openclaw` 入口/二进制路径（在可广播时会自动填充）。
3. 点击 **测试远程**。成功表示远程 `openclaw status --json` 运行正常。失败通常意味着 PATH/CLI 问题；退出码 127 表示远程找不到 CLI。
4. 健康检查和 Web Chat 现在会自动通过这个 SSH 隧道运行。

## Web Chat

- **SSH 隧道**：Web Chat 通过转发的 WebSocket 控制端口（默认 18789）连接到网关。
- **直接（ws/wss）**：Web Chat 直接连接到已配置的网关 URL。
- 现在不再有单独的 WebChat HTTP 服务器。

## 权限

- 远程主机需要与本地相同的 TCC 授权（自动化、辅助功能、屏幕录制、麦克风、语音识别、通知）。在那台机器上运行一次引导流程即可授予这些权限。
- 节点会通过 `node.list` / `node.describe` 暴露其权限状态，方便代理知道哪些能力可用。

## 安全说明

- 优先在远程主机上绑定回环地址，并通过 SSH 或 Tailscale 连接。
- SSH 隧道使用严格的主机密钥检查；请先信任主机密钥，使其存在于 `~/.ssh/known_hosts` 中。
- 如果你将 Gateway 绑定到非回环接口，请使用真实的 Gateway 认证：token、密码，或带身份感知的反向代理，并设置 `gateway.auth.mode: "trusted-proxy"`。
- 参见 [安全](/gateway/security) 和 [Tailscale](/gateway/tailscale)。

## WhatsApp 登录流程（远程）

- 在**远程主机**上运行 `openclaw channels login --verbose`。用手机上的 WhatsApp 扫描二维码。
- 如果认证过期，请在那台主机上重新运行登录。健康探测会暴露连接问题。

## 故障排查

- **exit 127 / not found**: `openclaw` 未添加到非登录 shell 的 PATH 中。将其添加到 `/etc/paths`、你的 shell rc，或链接到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**: 检查 SSH 可达性、PATH，以及 Baileys 是否已登录（`openclaw status --json`）。
- **Web Chat stuck**: 确认网关正在远程主机上运行，并且转发端口与网关的 WS 端口匹配；UI 需要健康的 WS 连接。
- **Node IP shows 127.0.0.1**: 使用 SSH 隧道时这是预期行为。如果你希望网关看到真实的客户端 IP，请将 **Transport** 切换为 **Direct (ws/wss)**。
- **Dashboard works but Mac capabilities are offline**: 这表示应用的 operator/control 连接是健康的，但 companion 节点连接未连接或缺少其命令面。打开菜单栏设备部分，检查该 Mac 是否为 `paired · disconnected`。对于 `wss://*.ts.net` 的 Tailscale Serve 端点，应用会在证书轮换后检测到过期的旧 TLS leaf pin，在 macOS 信任新证书时清除过期 pin，并自动重试。如果证书未被系统信任，或者主机不是 Tailscale Serve 名称，请将 `gateway.remote.tlsFingerprint` 设置为预期的证书指纹，查看证书，或切换到 **Remote over SSH**。
- **Voice Wake**: 触发短语在远程模式下会自动转发；不需要单独的转发器。

## 通知声音

可从脚本中使用 `openclaw` 和 `node.invoke` 为每条通知选择声音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "远程 gateway 已就绪" --sound Glass
```

应用中现在不再有全局的“默认声音”开关；调用方需要为每次请求单独选择声音（或不选）。

## 相关内容

- [macOS 应用](/platforms/macos)
- [远程访问](/gateway/remote)
