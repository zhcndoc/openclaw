---
summary: "在 Raspberry Pi 上托管 OpenClaw，实现始终在线的自托管"
read_when:
  - 在 Raspberry Pi 上设置 OpenClaw
  - 在 ARM 设备上运行 OpenClaw
  - 构建一个低成本、始终在线的个人 AI
title: "Raspberry Pi"
---

在 Raspberry Pi 上运行一个持久、始终在线的 OpenClaw Gateway。由于 Pi 只是网关（模型通过 API 在云端运行），即使是性能一般的 Pi 也能很好地处理这项工作。

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

**降低内存占用** -- 对于无头环境，释放 GPU 内存并禁用未使用的服务：

```bash
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt
sudo systemctl disable bluetooth
```

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
