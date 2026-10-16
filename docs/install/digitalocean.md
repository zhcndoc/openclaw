---
summary: "在 DigitalOcean Droplet 上托管 OpenClaw"
read_when:
  - "在 DigitalOcean 上设置 OpenClaw"
  - "寻找简单的付费VPS for OpenClaw"
title: "DigitalOcean"
---

在 DigitalOcean Droplet 上运行持久性 OpenClaw 网关（1 个 GB 基本计划约为 6 美元/月）。

DigitalOcean 是一个直接明了的付费 VPS 选择。对于更便宜或免费的选项：

- [HHetzner](/install/hetzner)——每美元更多 cores/RAM。
- [Oracle Cloud](/install/oracle) - 始终免费的 ARM 层（最多 4 个 OCPU、24 个 GB RAM），但注册可能很挑剔，而且仅ARM-。

## <a id="prerequisites"></a> 先决条件

- DigitalOcean 账户（[注册](https://cloud.digitalocean.com/registrations/new)）
- SSH 密钥对（或愿意使用密码认证）
- 大约 20 分钟。

## <a id="setup"></a> 设置

<Steps>
  <Step id="create-a-droplet" title="创建一个水滴">
    <Warning>
    使用干净的基础镜像（Ubuntu 24.04 LTS）。避免第三方市场1- 单击图像，除非您已查看其启动脚本和防火墙默认设置。
    </Warning>

    1. 登录 [DigitalOcean](https://cloud.digitalocean.com/)。
    2. 点击 **创建 > Droplets**。
    3. 选择：
       - **区域：** 离你最近的区域
       - **镜像：** Ubuntu 24.04 LTS
       - **规格：** Basic、Regular、1 vCPU / 1 GB RAM / 25 GB SSD
       - **身份验证：** SSH 密钥（推荐）或密码
    4. 点击 **创建 Droplet** 并记下 IP 地址。

  </Step>

  <Step id="connect-and-install" title="连接并安装">
    ```bash
    ssh root@YOUR_DROPLET_IP

    apt update && apt upgrade -y

    # Install Node.js 24 LTS
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt install -y nodejs

    # Install OpenClaw; run onboarding later as the non-root owner.
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard

    # Create the non-root user that will own OpenClaw state and services.
    adduser openclaw
    usermod -aG sudo openclaw
    loginctl enable-linger openclaw

    su - openclaw
    openclaw --version
    ```

    仅在系统引导阶段使用 root shell。请以非 root 的 `openclaw` 用户运行 OpenClaw 命令，这样状态会保存在 `/home/openclaw/.openclaw/` 下，并且网关会作为该用户的 systemd `--user` 服务安装。

  </Step>

  <Step id="run-onboarding" title="运行入门引导培训">
    ```bash
    openclaw onboard --install-daemon
    ```

    该向导将引导您完成模型验证、通道设置、网关令牌生成和守护程序安装（systemd 用户服务）。

  </Step>

  <Step id="add-swap-recommended-for-1-gb-droplets" title="添加交换（建议 1 GB Droplet）">
    ```bash
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    ```
  </Step>

  <Step id="verify-the-gateway" title="验证网关">
    ```bash
    openclaw status
    systemctl --user status openclaw-gateway.service
    journalctl --user -u openclaw-gateway.service -f
    ```
  </Step>

  <Step id="access-the-control-ui" title="访问 Control UI">
    网关默认绑定到环回。选择这些选项之一。

    **选项 A：SSH 隧道（最简单）**

    ```bash
    # From your local machine
    ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP
    ```

    然后打开 `http://localhost:18789`。

    **选项 B：Tailscale Serve**

    ```bash
    curl -fsSL https://tailscale.com/install.sh | sudo sh
    sudo tailscale up
    openclaw config set gateway.tailscale.mode serve
    openclaw gateway restart
    ```

    然后从你 tailnet 中的任何设备打开 `https://<magicdns>/`。

    Tailscale Serve 通过 tailnet 身份标头对 Control UI 和 WebSocket 流量进行身份验证，这假定网关主机本身是可信的。无论如何，HTTP API 端点仍遵循网关的正常身份验证模式 （token/password）。要通过 Serve 要求显式共享秘密凭据，请设置 `gateway.auth.allowTailscale: false` 并使用 `gateway.auth.mode: "token"` 或 `"password"`。

  </Step>
</Steps>

## <a id="persistence-and-backups"></a> 持久化与备份

OpenClaw 的状态位于：

- `~/.openclaw/` -- `openclaw.json`、channel/provider 凭证、共享和每个代理 SQLite 身份验证存储以及会话数据。
- `~/.openclaw/workspace/`——代理工作区（SOUL.md、内存、工件）。

这些在 Droplet 重启后仍然存在。要创建备份存档：

```bash
openclaw backup create
openclaw backup restore <archive.tar.gz> --target <fresh-directory>
```

DigitalOcean 快照备份整个 Droplet。 OpenClaw 档案可以传输到另一台主机。绝对符号链接保留其原始目标位置，包括指向单独备份的配置或凭据的链接。在激活另一台主机或另一条路径上的状态之前查看这些链接；请参阅 [ 备份符号链接警告 ](/cli/backup#what-gets-backed-up)。恢复验证并提取到新的暂存目录中；激活是一个单独的离线步骤。有关回滚警告和激活顺序，请参阅 [ 恢复完整存档 ](/install/backups#restore-a-full-archive)。

## <a id="1-gb-ram-tips"></a> 1 GB RAM 提示

这个 $6 的 Droplet 只有 1 GB RAM。为了保持顺畅：

- 确保上面的 swap 步骤已写入 `/etc/fstab`，这样重启后仍然有效。
- 优先选择基于 API- 的模型（Claude、GPT）而不是本地模型 - 本地 LLM 推理不适合 1 GB。
- 如果您在大型提示中遇到 OOM，请将 `agents.defaults.model.primary` 设置为较小的模型。
- 使用 `free -h` 和 `htop` 进行监控。

## <a id="troubleshooting"></a> 故障排查

**Gateway 不会启动** -- 运行 `openclaw doctor --non-interactive` 并使用 `journalctl --user -u openclaw-gateway.service -n 50` 检查日志。

**端口已被占用** -- 运行 `lsof -i :18789` 找到对应进程，然后停止它。

**内存不足** -- 验证交换是否与 `free -h` 处于活动状态。如果仍然遇到 OOM，请切换到基于 API- 的模型（Claude、GPT）而不是本地模型，或升级到 2 GB Droplet。

## <a id="next-steps"></a> 下一步

- [Channels](/channels) -- 连接 Telegram、WhatsApp、Discord 等
- [网关配置](/gateway/configuration) -- 所有配置选项
- [Updating](/install/updating) -- 使 OpenClaw 保持最新

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [Fly.io](/install/fly)
- [Hetzner](/install/hetzner)
- [VPS 托管](/vps)
