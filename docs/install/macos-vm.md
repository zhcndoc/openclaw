---
summary: "当您需要隔离或 iMessage 时，在沙盒 macOS VM（本地或托管）中运行 OpenClaw"
read_when:
  - "你想让 OpenClaw 与你的主 macOS 环境隔离"
  - "你想在沙箱中使用 iMessage 集成"
  - "你想要一个可重置、可克隆的 macOS 环境"
  - "你想比较本地与托管的 macOS VM 选项"
title: "macOS 虚拟机"
---

## <a id="recommended-default-(most-users)"></a><a id="recommended-default-most-users"></a> 推荐默认方案（大多数用户）

- **小型 Linux VPS**，用于始终在线的 Gateway 且成本较低。请参阅 [VPS 托管](/vps)。
- 如果您想要完全控制，则需要 **专用硬件**（Mac mini 或 Linux 盒子），而 **住宅 IP** 用于浏览器自动化。许多网站都会屏蔽数据中心 IP，因此本地浏览通常效果更好。
- **Hybrid**：将网关保留在便宜的 VPS 上，并在需要 browser/UI 自动化时将 Mac 作为 **node** 连接。请参阅 [Nodes](/nodes) 和 [Gateway Remote](/gateway/remote)。

仅当您特别需要 macOS-only 功能（例如 iMessage）或希望与日常 Mac 严格隔离时，才使用 macOS VM。

## <a id="macos-vm-options"></a> macOS VM 选项

### <a id="local-vm-on-your-apple-silicon-mac-(lume)"></a><a id="local-vm-on-your-apple-silicon-mac-lume"></a> 在你的 Apple Silicon Mac 上本地运行 VM（Lume）

使用 [Lume](https://cua.ai/docs/lume) 在现有 Apple Silicon Mac 上的沙盒 macOS VM 中运行 OpenClaw。这给你：

- 完整且隔离的 macOS 环境（你的宿主机保持干净）
- 通过 `imsg` 支持 iMessage；默认的本地路径在 Linux/Windows 上不可行
- 克隆虚拟机即时重置
- 无需额外硬件或云成本

### <a id="hosted-mac-providers-(cloud)"></a><a id="hosted-mac-providers-cloud"></a> 托管 Mac 提供商（云端）

如果你想在云端使用 macOS，托管 Mac 提供商也可以：

- [MacStadium](https://www.macstadium.com/)（托管 Mac）
- 其他托管 Mac 厂商也可以；请遵循它们的 VM + SSH 文档

一旦您拥有 SSH 对 macOS VM 的访问权限，请继续执行下面的 [Install OpenClaw](#6-install-openclaw)。

## <a id="quick-path-(lume%2C-experienced-users)"></a><a id="quick-path-lume-experienced-users"></a> 快速路径（Lume，有经验的用户）

1. 安装 Lume。
2. `lume create openclaw --os macos --ipsw latest`
3. 完成设置助理，启用远程登录（SSH）。
4. `lume run openclaw --no-display`
5. SSH 进入，安装 OpenClaw，配置频道。
6. 完成。

## <a id="what-you-need-(lume)"></a><a id="what-you-need-lume"></a> 你需要准备什么（Lume）

- Apple 硅 Mac （M1/M2/M3/M4）
- 宿主机上运行 macOS Sequoia 或更高版本
- ~60 GB 每个 VM 的可用磁盘空间
- 约 20 分钟

## <a id="1)-install-lume"></a><a id="1-install-lume"></a> 1) 安装 Lume

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh)"
```

如果 `~/.local/bin` 不在你的 PATH 中：

```bash
echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.zshrc && source ~/.zshrc
```

验证：

```bash
lume --version
```

文档：[Lume Installation](https://cua.ai/docs/lume/guide/getting-started/installation)

## <a id="2)-create-the-macos-vm"></a><a id="2-create-the-macos-vm"></a> 2） 创建 macOS VM

```bash
lume create openclaw --os macos --ipsw latest
```

这将下载 macOS 并创建 VM。 VNC 窗口会自动打开。

<Note>
下载时间可能会比较久，取决于你的网络连接。
</Note>

## <a id="3)-complete-setup-assistant"></a><a id="3-complete-setup-assistant"></a> 3) 完成设置助手

在 VNC 窗口中：

1. 选择语言和地区。
2. 跳过 Apple ID（如果之后想使用 iMessage，也可以登录）。
3. 创建一个用户账户（记住用户名和密码）。
4. 跳过所有可选功能。

设置完成后：

1. 启用 SSH：System Settings -> General -> Sharing，开启“Remote Login”。
2. 对于无头 VM 使用，启用自动登录：系统设置 -> 用户和组，选择“自动登录为：”，然后选择 VM 用户。

## <a id="4)-get-the-vm-ip-address"></a><a id="4-get-the-vm-ip-address"></a> 4）获取 VM 的 IP 地址

```bash
lume get openclaw
```

查找 IP 地址（通常是 `192.168.64.x`）。

## <a id="5)-ssh-into-the-vm"></a><a id="5-ssh-into-the-vm"></a> 5）通过 SSH 连接到 VM

```bash
ssh youruser@192.168.64.X
```

将 `youruser` 替换为你创建的账户，并将 IP 替换为你的 VM 的 IP。

## <a id="6)-install-openclaw"></a><a id="6-install-openclaw"></a> 6) 安装 OpenClaw

新鲜的 macOS VM 没有 Node.js 或 npm。在 VM 内，运行 [ 安装程序脚本](/install/installer)。它会在需要时安装受支持的 Node 运行时、安装 OpenClaw 并开始载入：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

按照引导提示设置你的模型提供商（Anthropic、OpenAI 等）。

Quick start 将网关保留在该终端的前台，但 VM 稍后将无头运行，因此网关需要作为后台服务运行。按 **Ctrl+C** 停止前台网关，然后安装该服务并验证其是否正在运行：

```bash
openclaw gateway install
openclaw gateway status
```

如果VM已经有[Node 24.16+或26.1+](/install/node)，则可以直接安装该软件包。在 npm 12 或 npm 11.16+ 上使用以下命令。在 npm 11.15 及更早版本上，省略 `--allow-scripts=openclaw`。

```bash
npm install -g openclaw@latest --allow-scripts=openclaw
openclaw onboard --install-daemon
```

## <a id="7)-configure-channels"></a><a id="7-configure-channels"></a> 7) 配置 channels

将 Telegram 令牌保留在网关环境中，而不是将其复制到 `openclaw.json` 中。将`TELEGRAM_BOT_TOKEN=<bot-token>`添加到`~/.openclaw/.env`，然后在当前shell中加载并添加通道：

```bash
export TELEGRAM_BOT_TOKEN="<bot-token>"
openclaw channels add --channel telegram --use-env
```

受管网关在重新启动后读取相同的状态目录 `.env`。对于 WhatsApp，配置您的白名单，然后扫描登录 QR 代码：

```bash
openclaw config set channels.whatsapp.dmPolicy allowlist
openclaw config set channels.whatsapp.allowFrom '["+15551234567"]' --strict-json
openclaw channels login --channel whatsapp
```

## <a id="8)-run-the-vm-headlessly"></a><a id="8-run-the-vm-headlessly"></a> 8) 无头运行 VM

停止 VM 并在不显示界面的情况下重新启动：

```bash
lume stop openclaw
lume run openclaw --no-display
```

VM 在后台运行；OpenClaw 的守护进程会保持网关持续运行。要检查状态：

```bash
ssh youruser@192.168.64.X "openclaw status"
```

## <a id="bonus%3A-imessage-integration"></a><a id="bonus-imessage-integration"></a> Bonus: iMessage 集成

这是在 macOS 上运行的杀手级功能。使用 [iMessage](/channels/imessage) 和 `imsg` 将 Messages 添加到 OpenClaw。

在 VM 内：

1. 登录 Messages。
2. 安装 `imsg`。
3. 为运行 OpenClaw/`imsg`. 的进程授予完全磁盘访问和自动化权限
4. 使用 `imsg rpc --help` 验证 RPC 支持。

在你的 OpenClaw 配置中添加：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "imsg",
      dbPath: "~/Library/Messages/chat.db",
    },
  },
}
```

重新启动网关。您的客服人员现在可以发送和接收 iMessage。完整设置详细信息：[i消息通道](/channels/imessage)。

## <a id="save-a-golden-image"></a> 保存金镜像

在进一步自定义之前，先快照你的干净状态：

```bash
lume stop openclaw
lume clone openclaw openclaw-golden
```

随时重置：

```bash
lume stop openclaw && lume delete openclaw
lume clone openclaw-golden openclaw
lume run openclaw --no-display
```

## <a id="running-24%2F7"></a><a id="running-24/7"></a> 24/7 运行

通过以下方式保持 VM 运行：

- 让你的 Mac 一直插着电
- 在系统设置 -> 节能中禁用睡眠
- 如有需要，使用 `caffeinate`

如果需要真正的始终在线，建议使用专用 Mac mini 或小型 VPS。参见 [VPS 托管](/vps)。

## <a id="troubleshooting"></a> 故障排查

| 问题                  | 解决方案                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------- |
| 无法 SSH 连接到 VM       | 检查 VM 的系统设置中是否已启用“远程登录”                             |
| 未显示 VM IP        | 等待 VM 完全启动后，再次运行 `lume get openclaw`                                |
| 找不到 Lume 命令   | 将 `~/.local/bin` 添加到你的 PATH                                                         |
| WhatsApp QR 未扫描 | 检查运行 `openclaw channels login` 时是否登录到 VM（不是主机） |

## <a id="related-docs"></a> 相关文档

- [VPS 托管](/vps)
- [节点](/nodes)
- [Gateway 远程](/gateway/remote)
- [iMessage 通道](/channels/imessage)
- [Lume Quickstart](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI Reference](https://cua.ai/docs/lume/reference/cli-reference)
- [无人值守 VM Setup](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup)（高级）
- [Docker Sandboxing](/install/docker)（替代隔离方法）
