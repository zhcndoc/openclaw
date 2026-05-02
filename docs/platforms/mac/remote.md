---
summary: "A macOS app flow for controlling a remote OpenClaw gateway over SSH"
read_when:
  - setting up or debugging remote mac control
title: "Remote Control"
---

# Remote OpenClaw (macOS ⇄ remote host)

This flow lets the macOS app act as a full remote controller for an OpenClaw gateway running on another host (desktop/server). It powers the app’s **Remote over SSH** mode. All features—health probes, Voice Wake forwarding, and Web Chat—reuse the same remote SSH configuration from _Settings → General_.

## Modes

- **Local (this Mac)**: everything runs on the laptop. No SSH involved.
- **Remote over SSH (default)**: OpenClaw commands execute on the remote host. The mac app opens one SSH connection using `-o BatchMode` plus your chosen identity/key and local port forwarding.
- **Remote direct (ws/wss)**: no SSH tunnel. The mac app connects straight to the gateway URL (for example via Tailscale Serve or a public HTTPS reverse proxy).

## Remote transport

Remote mode supports two transports:

- **SSH tunnel** (default): uses `ssh -N -L ...` to forward the gateway port to localhost. Because the tunnel is loopback, the gateway sees node IPs as `127.0.0.1`.
- **Direct (ws/wss)**: connects straight to the gateway URL. The gateway sees the real client IP.

In SSH tunnel mode, discovered LAN/tailnet hostnames are stored in
`gateway.remote.sshTarget`. The app keeps `gateway.remote.url` set to the local
tunnel endpoint, such as `ws://127.0.0.1:18789`, so the CLI, Web Chat, and the
local node-host service all share the same secure loopback transport.

Browser automation in remote mode is handled by the CLI node host rather than
the native macOS app node. The app will launch an installed node host service
when possible; if you need browser control from that Mac, install/start it with
`openclaw node install ...` and `openclaw node start` (or run
`openclaw node run ...` in the foreground) and target that browser-capable
node.

## Remote host prerequisites

1. Install Node + pnpm and build/install the OpenClaw CLI (`pnpm install && pnpm build && pnpm link --global`).
2. Make sure `openclaw` is on PATH in non-interactive shells (symlink into `/usr/local/bin` or `/opt/homebrew/bin` if needed).
3. Enable SSH with key auth. We recommend using a **Tailscale** IP so the host stays reachable off-LAN.

## macOS app setup

1. Open _Settings → General_.
2. Under **How OpenClaw runs**, choose **Remote over SSH** and configure:
   - **Transport**: **SSH tunnel** or **Remote direct (ws/wss)**.
   - **SSH target**: `user@host` (optional `:port`).
     - If the gateway is on the same LAN and advertises Bonjour, choose it from the discovered list to autofill this field.
   - **Gateway URL** (direct only): `wss://gateway.example.ts.net` (or `ws://...` for local/LAN).
   - **Identity file** (advanced): path to your key.
   - **Project root** (advanced): remote checkout path used for commands.
   - **CLI path** (advanced): optional path to the runnable `openclaw` entrypoint/binary (autofilled when a broadcast is available).
3. Click **Test Remote**. Success means the remote `openclaw status --json` runs correctly. Failures usually mean a PATH/CLI issue; exit code 127 means the CLI wasn’t found remotely.
4. Health probes and Web Chat now run automatically through this SSH path.

## Web Chat

- **SSH tunnel**: Web Chat connects to the gateway over the forwarded WebSocket control port (default 18789).
- **Direct (ws/wss)**: Web Chat connects straight to the configured gateway URL.
- There is no separate WebChat HTTP server anymore.

## Permissions

- The remote host needs the same TCC grants as local (Automation, Accessibility, Screen Recording, Microphone, Speech Recognition, Notifications). Run onboarding on that machine once to grant them.
- Nodes report permission state via `node.list` / `node.describe` so the agent knows what is available.

## Security notes

- Prefer loopback binds on the remote host and connect through SSH or Tailscale.
- SSH tunneling uses strict host key checking; trust the host key first so it exists in `~/.ssh/known_hosts`.
- If you bind the Gateway to a non-loopback interface, require real Gateway auth: token, password, or an identity-aware reverse proxy with `gateway.auth.mode: "trusted-proxy"`.
- See [Security](/gateway/security) and [Tailscale](/gateway/tailscale).

## WhatsApp login flow (remote)

- Run `openclaw channels login --verbose` on the **remote host**. Scan the QR code with WhatsApp on your phone.
- If auth expires, rerun login on that host. Health probes surface link issues.

## Troubleshooting

- **exit 127 / not found**: `openclaw` 不在非登录 shell 的 PATH 中。将其添加到 `/etc/paths`、你的 shell rc，或建立符号链接到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**: 检查 SSH 可达性、PATH，以及 Baileys 是否已登录（`openclaw status --json`）。
- **Web Chat stuck**: 确认 gateway 正在远程主机上运行，且转发端口与 gateway 的 WS 端口匹配；UI 需要健康的 WS 连接。
- **Node IP shows 127.0.0.1**: 使用 SSH 隧道时这是预期行为。如果你希望 gateway 看到真实的客户端 IP，请将 **Transport** 切换为 **Direct (ws/wss)**。
- **Dashboard works but Mac capabilities are offline**: 这表示应用的 operator/control 连接是健康的，但 companion node 连接未连接或缺少其命令接口。打开菜单栏设备部分，检查该 Mac 是否显示为 `paired · disconnected`。对于 `wss://*.ts.net` 的 Tailscale Serve 端点，应用会在证书轮换后检测到陈旧的旧版 TLS 叶子 pin，并在 macOS 信任新证书时清除陈旧 pin，然后自动重试。如果证书不被系统信任，或者主机不是 Tailscale Serve 名称，请检查证书，或切换到 **Remote over SSH**。
- **Voice Wake**: 触发短语会在远程模式下自动转发；不需要单独的转发器。

## 通知声音

可从脚本中使用 `openclaw` 和 `node.invoke` 为每条通知选择声音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "远程 gateway 已就绪" --sound Glass
```

应用中不再提供全局的“默认声音”切换；调用方需要为每个请求选择声音（或不选择）。

## 相关内容

- [macOS 应用](/platforms/macos)
- [远程访问](/gateway/remote)
