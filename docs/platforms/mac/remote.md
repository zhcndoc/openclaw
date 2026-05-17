---
summary: "用于控制远程 OpenClaw 网关的 macOS 应用流程"
read_when:
  - 设置或调试远程 Mac 控制
title: "远程控制"
---

此流程可让 macOS 应用充当运行在另一台主机（桌面/服务器）上的 OpenClaw 网关的完整远程控制器。应用可以直接连接到受信任的 LAN/Tailnet 网关 URL，也可以在远程网关仅支持回环访问时管理 SSH 隧道。健康检查、Voice Wake 转发和 Web Chat 都会复用来自 _设置 → 通用_ 的同一份远程配置。

## 模式

- **Local (this Mac)**：所有内容都在这台笔记本上运行。不涉及 SSH。
- **Remote over SSH (default)**：OpenClaw 命令在远程主机上执行。mac 应用会使用 `-o BatchMode`、你选择的身份/密钥以及本地端口转发来打开 SSH 连接。
- **Remote direct (ws/wss)**：不使用 SSH 隧道。mac 应用直接连接到网关 URL（例如通过 LAN、Tailscale、Tailscale Serve 或公共 HTTPS 反向代理）。

## 远程传输

远程模式支持两种传输方式：

- **SSH 隧道**（默认）：使用 `ssh -N -L ...` 将网关端口转发到 localhost。由于隧道是回环连接，网关会将节点的 IP 视为 `127.0.0.1`。
- **直接（ws/wss）**：直接连接到网关 URL。网关会看到真实的客户端 IP。

在 SSH 隧道模式下，已发现的 LAN/tailnet 主机名会保存到
`gateway.remote.sshTarget`。应用会将 `gateway.remote.url` 保持为本地
隧道端点，例如 `ws://127.0.0.1:18789`，因此 CLI、Web Chat，以及
本地节点主机服务都会使用同一个安全的回环传输。
如果本地隧道端口与远程网关端口不同，请将
`gateway.remote.remotePort` 设置为远程主机上的端口。

远程模式下的浏览器自动化由 CLI 节点主机处理，而不是原生 macOS 应用节点。
应用会在可能时启动已安装的节点主机服务；如果你需要从那台 Mac 控制浏览器，
请使用 `openclaw node install ...` 和 `openclaw node start` 安装/启动它（或者在前台运行
`openclaw node run ...`），并将目标指向那个具备浏览器能力的
节点。

## 远程主机前置条件

1. 安装 Node + pnpm，并构建/安装 OpenClaw CLI（`pnpm install && pnpm build && pnpm link --global`）。
2. 确保 `openclaw` 在非交互式 shell 的 PATH 中（如有需要，可链接到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 仅针对 SSH 传输：使用密钥认证打开 SSH。对于离开 LAN 后的稳定可达性，我们建议使用 **Tailscale** IP。

## macOS 应用设置

要在不经过欢迎流程的情况下预先配置应用：

```bash
openclaw-mac configure-remote \
  --ssh-target user@gateway.local \
  --local-port 18789 \
  --remote-port 18789 \
  --token "$OPENCLAW_GATEWAY_TOKEN"
```

对于已经可通过受信任的 LAN 或 Tailnet 访问的网关，完全跳过 SSH：

```bash
openclaw-mac configure-remote \
  --direct-url ws://192.168.0.202:18789 \
  --token "$OPENCLAW_GATEWAY_TOKEN"
```

这会写入远程配置、标记引导完成，并让应用在启动时接管所选的传输方式。

1. 打开 _设置 → 通用_。
2. 在 **OpenClaw 运行位置** 下，选择 **远程** 并设置：
   - **传输方式**：**SSH 隧道** 或 **直接（ws/wss）**。
   - **SSH 目标**：`user@host`（可选 `:port`）。
     - 如果网关位于同一 LAN 且支持 Bonjour，请从已发现列表中选择它，以自动填充此字段。
   - **网关 URL**（仅直接模式）：`wss://gateway.example.ts.net`（本地/LAN 可用 `ws://...`）。
   - **身份文件**（高级）：你的密钥路径。
   - **项目根目录**（高级）：命令所使用的远程检出路径。
   - **CLI 路径**（高级）：可运行的 `openclaw` 入口点/二进制文件的可选路径（在已宣布时会自动填充）。
3. 点击 **测试远程**。成功表示远程 `openclaw status --json` 能正确运行。失败通常意味着 PATH/CLI 问题；退出码 127 表示远程找不到该 CLI。
4. 健康检查和 Web Chat 现在会自动通过所选传输方式运行。

## Web Chat

- **SSH 隧道**：Web Chat 通过转发后的 WebSocket 控制端口（默认 18789）连接到网关。
- **直接（ws/wss）**：Web Chat 直接连接到已配置的网关 URL。
- 现在不再有单独的 WebChat HTTP 服务器。

## 权限

- 远程主机需要与本地相同的 TCC 授权（自动化、辅助功能、屏幕录制、麦克风、语音识别、通知）。在那台机器上运行一次引导流程即可授予这些权限。
- 节点会通过 `node.list` / `node.describe` 暴露其权限状态，方便代理知道哪些能力可用。

## 安全说明

- 优先在远程主机上使用回环绑定，并通过 SSH、Tailscale Serve，或受信任的 Tailnet/LAN 直连 URL 进行连接。
- SSH 隧道使用严格的主机密钥检查；请先信任主机密钥，使其存在于 `~/.ssh/known_hosts` 中。
- 如果你将 Gateway 绑定到非回环接口，请要求有效的 Gateway 认证：token、密码，或带有 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。
- 参见 [Security](/gateway/security) 和 [Tailscale](/gateway/tailscale)。

## WhatsApp 登录流程（远程）

- 在**远程主机**上运行 `openclaw channels login --verbose`。用手机上的 WhatsApp 扫描二维码。
- 如果认证过期，请在那台主机上重新运行登录。健康探测会暴露连接问题。

## 故障排查

- **exit 127 / not found**：`openclaw` 未添加到非登录 shell 的 PATH 中。将其添加到 `/etc/paths`、你的 shell rc，或链接到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**：检查 SSH 可达性、PATH，以及 Baileys 是否已登录（`openclaw status --json`）。
- **Web Chat stuck**：确认网关正在远程主机上运行，并且转发端口与网关的 WS 端口匹配；UI 需要健康的 WS 连接。
- **Node IP shows 127.0.0.1**：使用 SSH 隧道时这是预期行为。如果你希望网关看到真实的客户端 IP，请将 **Transport** 切换为 **Direct (ws/wss)**。
- **Dashboard works but Mac capabilities are offline**：这表示应用的 operator/control 连接是健康的，但 companion 节点连接未连接或缺少其命令面。打开菜单栏设备部分，检查该 Mac 是否为 `paired · disconnected`。对于 `wss://*.ts.net` 的 Tailscale Serve 端点，应用会在证书轮换后检测到过期的旧 TLS leaf pin，在 macOS 信任新证书时清除过期 pin，并自动重试。如果证书未被系统信任，或者主机不是 Tailscale Serve 名称，请将 `gateway.remote.tlsFingerprint` 设置为预期的证书指纹，查看证书，或切换到 **Remote over SSH**。
- **Voice Wake**：触发短语在远程模式下会自动转发；不需要单独的转发器。

## 通知声音

可从脚本中使用 `openclaw` 和 `node.invoke` 为每条通知选择声音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "远程 gateway 已就绪" --sound Glass
```

应用中现在不再有全局的“默认声音”开关；调用方需要为每次请求单独选择声音（或不选）。

## 相关内容

- [macOS 应用](/platforms/macos)
- [远程访问](/gateway/remote)
