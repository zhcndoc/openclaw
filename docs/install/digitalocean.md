---
summary: "在 DigitalOcean Droplet 上托管 OpenClaw"
read_when:
  - 在 DigitalOcean 上设置 OpenClaw
  - 为 OpenClaw 寻找一个简单的付费 VPS
title: "DigitalOcean"
---

在 DigitalOcean Droplet 上运行一个持久的 OpenClaw Gateway（1 GB 基础套餐约 $6/月）。

DigitalOcean 是一个直接明了的付费 VPS 选择。对于更便宜或免费的选项：

- [Hetzner](/install/hetzner) -- 每美元可获得更多核心/RAM。
- [Oracle Cloud](/install/oracle) -- 永久在线免费 ARM 套餐（最多 4 OCPU、24 GB RAM），但注册可能比较麻烦，而且仅支持 ARM。

## 前提条件

- DigitalOcean 账户（[注册](https://cloud.digitalocean.com/registrations/new)）
- SSH 密钥对（或愿意使用密码认证）
- 大约 20 分钟

## 设置

<Steps>
  <Step title="创建 Droplet">
    <Warning>
    使用干净的基础镜像（Ubuntu 24.04 LTS）。除非你已经检查过第三方 Marketplace 一键镜像的启动脚本和防火墙默认设置，否则请避免使用它们。
    </Warning>

    1. 登录 [DigitalOcean](https://cloud.digitalocean.com/)。
    2. 点击 **Create > Droplets**。
    3. 选择：
       - **Region:** 离你最近的区域
       - **Image:** Ubuntu 24.04 LTS
       - **Size:** Basic, Regular, 1 vCPU / 1 GB RAM / 25 GB SSD
       - **Authentication:** SSH key（推荐）或密码
    4. 点击 **Create Droplet** 并记下 IP 地址。

  </Step>

  <Step title="连接并安装">
    ```bash
    ssh root@YOUR_DROPLET_IP

    apt update && apt upgrade -y

    # Install Node.js 26
    curl -fsSL https://deb.nodesource.com/setup_26.x | bash -
    apt install -y nodejs

    # 安装 OpenClaw
    curl -fsSL https://openclaw.ai/install.sh | bash

    # 创建将拥有 OpenClaw 状态和服务的非 root 用户。
    adduser openclaw
    usermod -aG sudo openclaw
    loginctl enable-linger openclaw

    su - openclaw
    openclaw --version
    ```

    仅在系统引导阶段使用 root shell。请以非 root 的 `openclaw` 用户运行 OpenClaw 命令，这样状态会保存在 `/home/openclaw/.openclaw/` 下，并且 Gateway 会作为该用户的 systemd `--user` 服务安装。

  </Step>

  <Step title="运行 onboarding">
    ```bash
    openclaw onboard --install-daemon
    ```

    向导会引导你完成模型认证、通道设置、gateway token 生成以及 daemon 安装（systemd 用户服务）。

  </Step>

  <Step title="添加 swap（推荐用于 1 GB Droplet）">
    ```bash
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ```
  </Step>

  <Step title="验证 gateway">
    ```bash
    openclaw status
    systemctl --user status openclaw-gateway.service
    journalctl --user -u openclaw-gateway.service -f
    ```
  </Step>

  <Step title="访问 Control UI">
    默认情况下，gateway 绑定到回环地址。请选择以下选项之一。

    **选项 A：SSH 隧道（最简单）**

    ```bash
    # 从你的本地机器执行
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

    Tailscale Serve 会通过 tailnet 身份头对 Control UI 和 WebSocket 流量进行身份验证，这假设 gateway 主机本身是可信的。无论如何，HTTP API 端点仍然遵循 gateway 的正常认证模式（token/password）。若要通过 Serve 强制使用显式共享密钥凭据，请设置 `gateway.auth.allowTailscale: false`，并使用 `gateway.auth.mode: "token"` 或 `"password"`。

    **选项 C：Tailnet bind（不使用 Serve）**

    ```bash
    openclaw config set gateway.bind tailnet
    openclaw gateway restart
    ```

    然后打开 `http://<tailscale-ip>:18789`（需要 token）。

  </Step>
</Steps>

## 持久化与备份

OpenClaw 状态存放在：

- `~/.openclaw/` -- `openclaw.json`、channel/provider 凭据、按 agent 划分的 `auth-profiles.json`，以及会话数据。
- `~/.openclaw/workspace/` -- agent 工作区（SOUL.md、memory、artifacts）。

这些内容会在 Droplet 重启后保留。要创建一个可移植的快照：

```bash
openclaw backup create
```

DigitalOcean snapshots 会备份整个 Droplet；`openclaw backup create` 可跨主机移植。

## 1 GB RAM 提示

这个 $6 的 Droplet 只有 1 GB RAM。为了保持顺畅：

- 确保上面的 swap 步骤已写入 `/etc/fstab`，这样重启后仍然有效。
- 优先使用基于 API 的模型（Claude、GPT），而不是本地模型——本地 LLM 推理无法适配 1 GB 内存。
- 如果在处理大提示词时遇到 OOM，将 `agents.defaults.model.primary` 设置为更小的模型。
- 使用 `free -h` 和 `htop` 进行监控。

## 故障排除

**Gateway 无法启动** -- 运行 `openclaw doctor --non-interactive`，并使用 `journalctl --user -u openclaw-gateway.service -n 50` 检查日志。

**端口已被占用** -- 运行 `lsof -i :18789` 找到对应进程，然后停止它。

**内存不足** -- 使用 `free -h` 检查 swap 是否已启用。如果仍然出现 OOM，请切换到基于 API 的模型（Claude、GPT），而不是本地模型，或者升级到 2 GB 的 Droplet。

## 下一步

- [Channels](/channels) -- 连接 Telegram、WhatsApp、Discord 等
- [Gateway configuration](/gateway/configuration) -- 所有配置选项
- [Updating](/install/updating) -- 保持 OpenClaw 为最新版本

## 相关

- [安装概览](/install)
- [Fly.io](/install/fly)
- [Hetzner](/install/hetzner)
- [VPS 托管](/vps)
