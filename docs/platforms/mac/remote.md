---
summary: "macOS 应用通过 SSH 控制远程 OpenClaw 网关的流程"
read_when:
  - 设置或调试远程 mac 控制时
title: "远程控制"
---

# 远程 OpenClaw（macOS ⇄ 远程主机）

This flow lets the macOS app act as a full remote control for an OpenClaw gateway running on another host (desktop/server). It’s the app’s **Remote over SSH** (remote run) feature. All features—health checks, Voice Wake forwarding, and Web Chat—reuse the same remote SSH configuration from _Settings → General_.

## 模式

- **本地（此 Mac）**：所有程序均在笔记本上运行。不涉及 SSH。
- **通过 SSH 远程（默认）**：OpenClaw 命令在远程主机上执行。mac 应用打开一个带有 `-o BatchMode` 及你选择的身份/密钥和本地端口转发的 SSH 连接。
- **直接远程（ws/wss）**：无 SSH 隧道。mac 应用直接连接到网关 URL（例如，通过 Tailscale Serve 或公用 HTTPS 反向代理）。

## 远程传输方式

远程模式支持两种传输方式：

- **SSH 隧道**（默认）：使用 `ssh -N -L ...` 将网关端口转发到本地。网关看到的节点 IP 是 `127.0.0.1`，因为隧道是回环的。
- **直接（ws/wss）**：直接连接到网关 URL，网关看到真实的客户端 IP。

## 远程主机的先决条件

1. 安装 Node + pnpm 并构建/安装 OpenClaw CLI（`pnpm install && pnpm build && pnpm link --global`）。
2. 确保 `openclaw` 在非交互式 shell 的 PATH 中（如有需要，软链到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 开启基于密钥认证的 SSH。我们推荐使用 **Tailscale** IP 以确保局域网外的稳定访问性。

## macOS 应用配置

1. 打开 _设置 → 通用_。
2. 在 **OpenClaw 运行方式** 下，选择 **通过 SSH 远程** 并设置：
   - **传输方式**：**SSH 隧道** 或 **直接（ws/wss）**。
   - **SSH 目标**：`user@host` （可选 `:port`）。
     - 如果网关在同一局域网并支持 Bonjour，可以从自动发现列表中选取，该字段会自动填充。
   - **网关 URL**（仅限直接连接）：`wss://gateway.example.ts.net`（局域网可用 `ws://...`）。
   - **身份文件**（高级）：密钥文件路径。
   - **项目根目录**（高级）：远程检出路径，用于执行命令。
   - **CLI 路径**（高级）：可选的可运行 `openclaw` 入口点/二进制路径（会自动填充，如果有广告服务）。
3. 点击 **测试远程**。成功表示远程 `openclaw status --json` 正常运行。失败一般是 PATH/CLI 问题；退出码 127 意味远程找不到 CLI。
4. 健康检查和网页聊天将自动通过此 SSH 隧道运行。

## 网页聊天

- **SSH 隧道**：网页聊天通过转发的 WebSocket 控制端口连接到网关（默认 18789）。
- **直接（ws/wss）**：网页聊天直接连接到配置的网关 URL。
- 目前已无独立的 WebChat HTTP 服务器。

## 权限

- 远程主机需要与本地相同的 TCC 许可（自动化、辅助功能、屏幕录制、麦克风、语音识别、通知）。在该机器上运行入门流程以授予权限。
- 节点通过 `node.list` / `node.describe` 通知权限状态，供代理知道可用权限。

## 安全注意事项

- 优先使用远程主机的回环接口绑定，并通过 SSH 或 Tailscale 连接。
- SSH 隧道使用严格的主机密钥检查；请先信任主机密钥，使其存在于 `~/.ssh/known_hosts`。
- 如果你将网关绑定到非回环接口，必须启用令牌/密码认证。
- 详见[安全](/gateway/security)与[Tailscale](/gateway/tailscale)。

## WhatsApp 登录流程（远程）

- 在**远程主机上**运行 `openclaw channels login --verbose`。用手机上的 WhatsApp 扫描二维码。
- 授权过期时，在该主机重新运行登录。健康检查会提示链接问题。

## 故障排除

- **退出码 127 / 未找到**：`openclaw` 不在非登录 shell 的 PATH 中。请将其添加到 `/etc/paths`、shell 配置文件，或软链到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **健康检查失败**：检查 SSH 可达性、PATH，确保 Baileys 已登录（`openclaw status --json`）。
- **网页聊天卡住**：确认远程主机上的网关正在运行，且转发端口和网关 WS 端口匹配；UI 需要健康的 WS 连接。
- **节点 IP 显示为 127.0.0.1**：使用 SSH 隧道时正常。若需要网关看到真实客户端 IP，请切换 **传输方式** 为 **直接（ws/wss）**。
- **语音唤醒**：触发词在远程模式下会自动转发，无需单独转发器。

## 通知声音

可在命令中为不同通知选择声音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "远程网关已准备好" --sound Glass
```

应用中不再有全局“默认声音”开关；调用方根据请求选择声音（或不选择声音）。
