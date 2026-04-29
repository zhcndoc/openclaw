---
summary: "用于通过 SSH 控制远程 OpenClaw gateway 的 macOS 应用流程"
read_when:
  - 设置或调试远程 mac 控制
title: "远程控制"
---

# 远程 OpenClaw（macOS ⇄ 远程主机）

此流程让 macOS 应用可以作为 OpenClaw gateway 的完整远程控制端，该 gateway 运行在另一台主机（桌面/服务器）上。它是应用的 **通过 SSH 远程运行**（remote run）功能。所有功能——健康检查、Voice Wake 转发以及 Web Chat——都复用来自 _设置 → 常规_ 的同一份远程 SSH 配置。

## 模式

- **本地（这台 Mac）**：所有内容都在笔记本上运行。不涉及 SSH。
- **通过 SSH 远程（默认）**：OpenClaw 命令在远程主机上执行。mac 应用会使用 `-o BatchMode` 加上你选择的身份/密钥以及本地端口转发来打开一个 SSH 连接。
- **远程直连（ws/wss）**：不使用 SSH 隧道。mac 应用直接连接到 gateway URL（例如通过 Tailscale Serve 或公开的 HTTPS 反向代理）。

## 远程传输

远程模式支持两种传输方式：

- **SSH 隧道**（默认）：使用 `ssh -N -L ...` 将 gateway 端口转发到 localhost。由于隧道是回环，gateway 会将节点的 IP 视为 `127.0.0.1`。
- **直连（ws/wss）**：直接连接到 gateway URL。gateway 会看到真实的客户端 IP。

在 SSH 隧道模式下，发现的 LAN/tailnet 主机名会保存为
`gateway.remote.sshTarget`。应用会将 `gateway.remote.url` 保持为本地
隧道端点，例如 `ws://127.0.0.1:18789`，因此 CLI、Web Chat 以及
本地 node-host 服务都会使用同一个安全的回环传输。

远程模式下的浏览器自动化由 CLI node host 负责，而不是由
原生 macOS 应用节点负责。应用会在可能时启动已安装的 node host 服务；
如果你需要从那台 Mac 进行浏览器控制，请使用
`openclaw node install ...` 和 `openclaw node start` 安装/启动它（或者运行
`openclaw node run ...` 前台运行），然后将目标指向那个具备浏览器能力的
节点。

## 远程主机前置条件

1. 安装 Node + pnpm，并构建/安装 OpenClaw CLI（`pnpm install && pnpm build && pnpm link --global`）。
2. 确保在非交互式 shell 中 `openclaw` 位于 PATH 中（如有需要，可链接到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 开启支持密钥认证的 SSH。我们推荐使用 **Tailscale** IP，以便在脱离 LAN 时仍可稳定访问。

## macOS 应用设置

1. 打开 _设置 → 常规_。
2. 在 **OpenClaw 运行方式** 下，选择 **通过 SSH 远程** 并设置：
   - **传输方式**：**SSH 隧道** 或 **远程直连（ws/wss）**。
   - **SSH 目标**：`user@host`（可选 `:port`）。
     - 如果 gateway 在同一 LAN 上并广播了 Bonjour，请从已发现列表中选择它以自动填充此字段。
   - **Gateway URL**（仅直连）：`wss://gateway.example.ts.net`（或本地/LAN 使用 `ws://...`）。
   - **Identity file**（高级）：你的密钥路径。
   - **Project root**（高级）：命令使用的远程检出路径。
   - **CLI path**（高级）：可运行的 `openclaw` 入口点/二进制文件的可选路径（在有广播时会自动填充）。
3. 点击 **测试远程**。成功表示远程的 `openclaw status --json` 可以正常运行。失败通常意味着 PATH/CLI 有问题；退出码 127 表示远程找不到 CLI。
4. 健康检查和 Web Chat 现在会自动通过此 SSH 隧道运行。

## Web Chat

- **SSH 隧道**：Web Chat 通过转发后的 WebSocket 控制端口（默认 18789）连接到 gateway。
- **直连（ws/wss）**：Web Chat 直接连接到配置的 gateway URL。
- 不再有单独的 WebChat HTTP 服务器。

## 权限

- 远程主机需要与本地相同的 TCC 授权（Automation、Accessibility、屏幕录制、麦克风、语音识别、通知）。在那台机器上运行 onboarding 以一次性授予这些权限。
- 节点会通过 `node.list` / `node.describe` 上报其权限状态，以便代理知道可用项。

## 安全说明

- 优先在远程主机上使用回环绑定，并通过 SSH 或 Tailscale 连接。
- SSH 隧道使用严格的主机密钥检查；请先信任主机密钥，使其存在于 `~/.ssh/known_hosts` 中。
- 如果将 Gateway 绑定到非回环接口，请要求有效的 Gateway 认证：token、密码，或者带有 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。
- 参见 [安全](/gateway/security) 和 [Tailscale](/gateway/tailscale)。

## WhatsApp 登录流程（远程）

- 在**远程主机**上运行 `openclaw channels login --verbose`。使用手机上的 WhatsApp 扫描二维码。
- 如果认证过期，请在那台主机上重新执行登录。健康检查会暴露链接问题。

## 故障排查

- **exit 127 / not found**：`openclaw` 没有出现在非登录 shell 的 PATH 中。将其添加到 `/etc/paths`、你的 shell rc，或链接到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **健康探测失败**：检查 SSH 可达性、PATH，以及 Baileys 是否已登录（`openclaw status --json`）。
- **Web Chat 卡住**：确认 gateway 正在远程主机上运行，并且转发端口与 gateway WS 端口一致；UI 需要健康的 WS 连接。
- **节点 IP 显示为 127.0.0.1**：SSH 隧道下这是正常现象。如果你希望 gateway 看到真实客户端 IP，请将 **传输方式** 切换为 **远程直连（ws/wss）**。
- **Voice Wake**：在远程模式下，触发短语会自动转发；不需要单独的转发器。

## 通知声音

可从脚本中使用 `openclaw` 和 `node.invoke` 为每条通知选择声音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "远程 gateway 已就绪" --sound Glass
```

应用中不再提供全局的“默认声音”切换；调用方需要为每个请求选择声音（或不选择）。

## 相关内容

- [macOS 应用](/platforms/macos)
- [远程访问](/gateway/remote)
