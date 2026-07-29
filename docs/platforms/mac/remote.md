---
summary: "用于控制远程 OpenClaw 网关的 macOS 应用流程"
read_when:
  - 设置或调试远程 Mac 控制
title: "远程控制"
---

此流程可让 macOS 应用充当运行在另一台主机（桌面/服务器）上的 OpenClaw 网关的完整远程控制器。应用会直接连接到受信任的 LAN/Tailnet 网关 URL，或者在远程网关仅限于 loopback 时管理 SSH 隧道。健康检查、语音唤醒转发和 Web Chat 复用来自 _Settings -> General_ 的相同远程配置。

## 模式

- **本地（这台 Mac）**：所有内容都在笔记本上运行；不涉及 SSH。
- **通过 SSH 远程（默认）**：OpenClaw 命令在远程主机上运行。应用使用 `-o BatchMode`、你选择的身份/密钥以及本地端口转发来建立 SSH 连接。
- **远程直连（ws/wss）**：不使用 SSH 隧道；应用直接连接到网关 URL（局域网、Tailscale、Tailscale Serve，或公共 HTTPS 反向代理）。

## 远程传输

- **SSH 隧道**（默认）：使用 `ssh -N -L ...` 将网关端口转发到 localhost。由于隧道是回环的，网关看到的节点 IP 为 `127.0.0.1`。
- **直接（ws/wss）**：直接连接到网关 URL。网关会看到真实的客户端 IP。

应用会为其自身的 SSH 进程禁用 SSH 连接复用和认证后的后台运行，这样即使所选别名启用了 `ControlMaster` 或 `ForkAfterAuthentication`，它也能监控并重启确切的进程。

SSH 主机密钥验证默认是严格的，因为网关凭据会通过此隧道传输。若要采用受管理的 SSH 别名自身的信任行为，可通过 `openclaw-mac configure-remote` 设置 `--ssh-host-key-policy openssh`，或直接将 `gateway.remote.sshHostKeyPolicy` 设置为 `"openssh"`。在启用之前，请检查别名以及任何匹配的 `Host *` 或系统配置。更改 SSH 目标（在应用中或通过 `configure-remote`）会将策略重置回 `strict`，除非你为新目标再次明确启用。

在 SSH 隧道模式下，发现的 LAN/tailnet 主机名会保存为 `gateway.remote.sshTarget`。应用会将 `gateway.remote.url` 保持为本地隧道端点（例如 `ws://127.0.0.1:18789`），这样 CLI、Web Chat 和本地 node-host 服务都使用相同的回环传输。当发现结果同时包含原始 Tailnet IP 和稳定主机名时，应用会优先使用 Tailscale MagicDNS 或 LAN 名称，以便连接在地址变化后更能持续可用。如果本地隧道端口与远程网关端口不同，请将 `gateway.remote.remotePort` 设置为远程主机上的端口。

远程模式下的浏览器自动化由 CLI node host 拥有，而不是原生 macOS 应用节点。应用会在可能时启动已安装的 node host 服务；要在该 Mac 上启用浏览器控制，请使用 `openclaw node install ...` 和 `openclaw node start` 安装/启动它（或者在前台运行 `openclaw node run ...`），然后将目标指向那个具备浏览器能力的节点。

## 远程主机前置条件

1. 安装 Node + pnpm，并构建/安装 OpenClaw CLI（`pnpm install && pnpm build && pnpm link --global`）。
2. 确保 `openclaw` 在非交互式 shell 的 PATH 中（如有需要，创建符号链接到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 对于 SSH 传输：请设置基于密钥的 SSH 身份验证。为在局域网外获得稳定可达性，推荐使用 Tailscale IP。

## macOS 应用设置

要在不经过欢迎流程的情况下预配置应用，请通过 SSH：

```bash
openclaw-mac configure-remote \
  --ssh-target user@gateway-host \
  --local-port 18789 \
  --remote-port 18789 \
  --token "$OPENCLAW_GATEWAY_TOKEN"
```

或者，对于已可在受信任的 LAN 或 Tailnet 上直接访问的网关，可以完全跳过 SSH：

```bash
openclaw-mac configure-remote \
  --direct-url ws://192.168.0.202:18789 \
  --token "$OPENCLAW_GATEWAY_TOKEN"
```

`openclaw-mac connect`, `wizard`, 和 `configure-remote` 会按以下顺序解析当前配置：`OPENCLAW_CONFIG_PATH`，然后是 `$OPENCLAW_STATE_DIR/openclaw.json`，最后是 `~/.openclaw/openclaw.json`。这两种配置方式都会写入该当前文件，标记引导已完成，并让应用在下次启动时接管所选传输方式。`--local-port`/`--remote-port` 默认为 `18789`。其他标志：`--password`、`--identity <path>`、`--ssh-host-key-policy <strict|openssh>`、`--project-root <path>`、`--cli-path <path>`、`--json`。运行 `openclaw-mac configure-remote --help` 查看完整参考。

也可以通过 UI 进行配置：

1. 打开 _设置 -> 通用_。
2. 在 **OpenClaw 运行** 下，选择 **远程** 并设置：
   - **传输方式**：**SSH 隧道** 或 **直接（ws/wss）**。
   - **SSH 目标**：`user@host`（可选 `:port`）。如果网关位于同一 LAN 且广播了 Bonjour，请从发现列表中选择它以自动填充此字段。
   - **网关 URL**（仅直接方式）：`wss://gateway.example.ts.net`（本地/LAN 则使用 `ws://...`）。
   - **身份文件**（高级）：你的密钥路径。
   - **项目根目录**（高级）：用于命令的远程检出路径。
   - **CLI 路径**（高级）：可运行的 `openclaw` 入口点/二进制文件的可选路径（如果已通告则会自动填充）。
3. 点击 **测试远程**。成功表示远程 `openclaw status --json` 已正确运行。失败通常意味着 PATH/CLI 有问题；退出码 127 表示远程未找到 CLI。
4. 健康检查和 Web Chat 现在会自动通过所选传输方式运行。

## Web 聊天

- **SSH 隧道**：通过转发的 WebSocket 控制端口（默认 18789）连接到网关。
- **直接（ws/wss）**：直接连接到配置的网关 URL。
- 没有单独的 Web 聊天 HTTP 服务器。

## 权限

- 远程主机需要与本地相同的 TCC 授权（Automation、Accessibility、屏幕录制、麦克风、语音识别、通知）。请在该机器上运行一次 onboarding 以授予这些权限。
- 节点通过 `node.list` / `node.describe` 公布其权限状态，以便代理了解可用内容。

## 安全说明

- 优先在远程主机上使用 loopback 绑定，并通过 SSH、Tailscale Serve 或受信任的 Tailnet/LAN 直连 URL 进行连接。
- 默认情况下，SSH 隧道要求目标主机密钥已经被信任。请先信任该主机密钥（将其添加到已配置的 known-hosts 文件中），或者为你接受其 OpenSSH 信任策略的受管别名显式设置 `gateway.remote.sshHostKeyPolicy: "openssh"`。
- 如果将 Gateway 绑定到非 loopback 接口，则需要有效的 Gateway 身份验证：token、密码，或使用 `gateway.auth.mode: "trusted-proxy"` 的具备身份感知能力的反向代理。
- 直接的 `wss://` 连接会对操作/控制流量和 Mac companion 节点应用同一证书策略。请设置 `gateway.remote.tlsFingerprint` 以进行显式 pinning。若未设置，应用会在正常的 macOS 信任验证成功后，才记录首次使用的 pin。
- 参见 [安全](/gateway/security) 和 [Tailscale](/gateway/tailscale)。

## WhatsApp 登录流程（远程）

- 在远程主机上运行 `openclaw channels login --channel whatsapp --verbose`。使用手机上的 WhatsApp 扫描二维码。
- 如果认证过期，请在该主机上重新运行登录。健康检查会显示链接问题。

## 故障排查

| 症状                                          | 原因 / 修复                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exit 127` / 未找到                           | 非登录 shell 的 PATH 中没有 `openclaw`。将其添加到 `/etc/paths`、你的 shell rc，或创建符号链接到 `/usr/local/bin`/`/opt/homebrew/bin`。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 健康检查探测失败                              | 检查 SSH 是否可达、PATH 是否正确，以及 Baileys（WhatsApp）是否已登录（`openclaw status --json`）。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Web Chat 卡住                                   | 确认网关正在远程主机上运行，并且转发端口与网关 WS 端口匹配；UI 需要健康的 WS 连接。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Node IP 显示 `127.0.0.1`                        | 这是 SSH 隧道下的预期表现。如果你希望网关看到真实的客户端 IP，请将 **Transport** 切换为 **Direct (ws/wss)**。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 仪表盘可用但 Mac 功能离线 | 操作/控制连接是健康的，但 companion 节点连接未连接，或缺少其命令界面。打开菜单栏设备部分，检查该 Mac 是否为 `paired · disconnected`。直接的 `wss://` operator 和 node 连接使用相同的已配置或已存储证书策略。对于受信任的 `wss://*.ts.net` Tailscale Serve 端点，旧的已存储 leaf pin 会在证书轮换后被替换，并自动重试。已配置的 pin 不会自动轮换；在查看新证书后更新 `gateway.remote.tlsFingerprint`，或者切换到 **Remote over SSH**。 |
| Voice Wake                                       | 触发短语在远程模式下会自动转发；不需要单独的转发器。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## 通知声音

使用 `openclaw nodes notify` 从脚本中为每条通知选择声音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "远程 gateway 已就绪" --sound Glass
```

应用中没有全局默认声音开关；调用方需要为每次请求单独选择声音（或不选择）。

## 相关内容

- [macOS 应用](/platforms/macos)
- [远程访问](/gateway/remote)
