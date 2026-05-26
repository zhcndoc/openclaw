---
summary: "在 Raspberry Pi 上托管 OpenClaw，实现始终在线的自托管"
read_when:
  - 在 Raspberry Pi 上设置 OpenClaw
  - 在 ARM 设备上运行 OpenClaw
  - 构建一个低成本、始终在线的个人 AI
title: "Raspberry Pi"
---

在 Raspberry Pi 上运行一个持久、始终在线的 OpenClaw Gateway。由于 Pi 只是网关（模型通过 API 在云端运行），即使是配置普通的 Pi 也能很好地承担这项工作——典型硬件成本为**一次性 35–80 美元**，没有月费。

## 硬件兼容性

| Pi 型号      | 内存   | 可用？ | 说明                                |
| ------------ | ------ | ------ | ----------------------------------- |
| Pi 5        | 4/8 GB | 最佳   | 速度最快，推荐。                    |
| Pi 4        | 4 GB   | 良好   | 适合大多数用户的最佳选择。          |
| Pi 4        | 2 GB   | 可以   | 需要添加交换空间。                  |
| Pi 4        | 1 GB   | 紧张   | 配合交换空间可用，配置要尽量精简。  |
| Pi 3B+      | 1 GB   | 慢     | 可以运行，但比较卡。                |
| Pi Zero 2 W | 512 MB | 不行   | 不推荐。                            |

**最低配置：** 1 GB 内存、1 核、500 MB 可用磁盘空间、64 位操作系统。  
**推荐配置：** 2 GB+ 内存、16 GB+ SD 卡（或 USB SSD）、以太网。

## 前置条件

- 具备 2 GB+ 内存的 Raspberry Pi 4 或 5（推荐 4 GB）
- MicroSD 卡（16 GB+）或 USB SSD（性能更好）
- 官方 Pi 电源适配器
- 网络连接（以太网或 WiFi）
- 64 位 Raspberry Pi OS（必需 -- 不要使用 32 位）
- 大约 30 分钟

## 设置

<Steps>
  <Step title="刷写操作系统">
    使用 **Raspberry Pi OS Lite (64-bit)** -- 无需桌面环境，适合无头服务器。

    1. 下载 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)。
    2. 选择操作系统：**Raspberry Pi OS Lite (64-bit)**。
    3. 在设置对话框中，预先配置：
       - 主机名：`gateway-host`
       - 启用 SSH
       - 设置用户名和密码
       - 配置 WiFi（如果不使用以太网）
    4. 将系统刷写到 SD 卡或 USB 驱动器中，插入后启动 Pi。

  </Step>

  <Step title="通过 SSH 连接">
    ```bash
    ssh user@gateway-host
    ```
  </Step>

  <Step title="更新系统">
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y git curl build-essential

    # 设置时区（对 cron 和提醒很重要）
    sudo timedatectl set-timezone America/Chicago
    ```

  </Step>

  <Step title="安装 Node.js 24">
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt install -y nodejs
    node --version
    ```
  </Step>

  <Step title="添加交换空间（2 GB 或更少时很重要）">
    ```bash
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

    # 为低内存设备降低 swappiness
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    ```

  </Step>

  <Step title="安装 OpenClaw">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    ```
  </Step>

  <Step title="运行引导">
    ```bash
    openclaw onboard --install-daemon
    ```

    按照向导操作。对于无头设备，建议使用 API 密钥而不是 OAuth。Telegram 是最容易上手的渠道。

  </Step>

  <Step title="验证">
    ```bash
    openclaw status
    systemctl --user status openclaw-gateway.service
    journalctl --user -u openclaw-gateway.service -f
    ```
  </Step>

  <Step title="访问控制界面">
    在你的电脑上，从 Pi 获取仪表盘 URL：

    ```bash
    ssh user@gateway-host 'openclaw dashboard --no-open'
    ```

    然后在另一个终端中创建 SSH 隧道：

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
    ```

    在本地浏览器中打开打印出的 URL。若要实现始终在线的远程访问，请参阅 [Tailscale 集成](/gateway/tailscale)。

  </Step>
</Steps>

## 性能提示

**使用 USB SSD** -- SD 卡速度慢且容易磨损。USB SSD 能显著提升性能。请参阅 [Pi USB 启动指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot)。

**启用模块编译缓存** -- 可加快在低功耗 Pi 主机上重复执行 CLI 的速度：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

`OPENCLAW_NO_RESPAWN=1` 会使常规 Gateway 重启在进程内完成，从而避免额外的进程切换，并让小型主机上的 PID 跟踪更简单。

**降低内存使用** -- 对于无头设置，释放 GPU 内存并禁用未使用的服务：

```bash
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt
sudo systemctl disable bluetooth
```

**用于稳定重启的 systemd drop-in** -- 如果这台 Pi 主要运行 OpenClaw，请添加一个服务 drop-in：

```bash
systemctl --user edit openclaw-gateway.service
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

然后执行 `systemctl --user daemon-reload && systemctl --user restart openclaw-gateway.service`。在无头 Pi 上，还应先启用 lingering，这样用户服务在注销后也能继续运行：`sudo loginctl enable-linger "$(whoami)"`。

## 推荐模型设置

由于 Pi 只运行网关，请使用云端托管的 API 模型：

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-6",
        "fallbacks": ["openai/gpt-5.4-mini"]
      }
    }
  }
}
```

不要在 Pi 上运行本地 LLM——即使是小模型也慢得不实用。让 Claude 或 GPT 负责模型推理工作。

## ARM 二进制说明

大多数 OpenClaw 功能在 ARM64 上无需更改即可运行（Node.js、Telegram、WhatsApp/Baileys、Chromium）。偶尔缺少 ARM 构建的二进制，通常是技能包中附带的可选 Go/Rust CLI 工具。在回退到从源代码构建之前，请先检查缺失二进制的发布页面是否提供 `linux-arm64` / `aarch64` 构建产物。

## 持久化与备份

OpenClaw 的状态位于：

- `~/.openclaw/` — `openclaw.json`、按 agent 区分的 `auth-profiles.json`、渠道/提供商状态、会话。
- `~/.openclaw/workspace/` — agent 工作区（SOUL.md、memory、artifacts）。

这些内容会在重启后保留。可使用以下命令创建可移植快照：

```bash
openclaw backup create
```

如果你将这些内容放在 SSD 上，性能和寿命都会优于 SD 卡。

## 故障排查

**内存不足** -- 使用 `free -h` 验证交换空间是否已启用。禁用未使用的服务（`sudo systemctl disable cups bluetooth avahi-daemon`）。仅使用基于 API 的模型。

**性能缓慢** -- 使用 USB SSD 代替 SD 卡。通过 `vcgencmd get_throttled` 检查 CPU 是否降频（应返回 `0x0`）。

**服务无法启动** -- 使用 `journalctl --user -u openclaw-gateway.service --no-pager -n 100` 查看日志，并运行 `openclaw doctor --non-interactive`。如果这是无头 Pi，还要验证 lingering 是否已启用：`sudo loginctl enable-linger "$(whoami)"`。

**ARM 二进制问题** -- 如果某个 skill 失败并显示 "exec format error"，请检查该二进制是否有 ARM64 构建。使用 `uname -m` 验证架构（应显示 `aarch64`）。

**WiFi 断开** -- 关闭 WiFi 电源管理：`sudo iwconfig wlan0 power off`。

## 后续步骤

- [Channels](/channels) -- 连接 Telegram、WhatsApp、Discord 等更多渠道
- [Gateway configuration](/gateway/configuration) -- 所有配置选项
- [Updating](/install/updating) -- 保持 OpenClaw 为最新版本

## 相关内容

- [Install overview](/install)
- [Linux server](/vps)
- [Platforms](/platforms)
