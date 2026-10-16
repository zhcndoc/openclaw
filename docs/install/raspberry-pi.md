---
summary: "在 Raspberry Pi 上托管 OpenClaw，以实现始终在线的自托管"
read_when:
  - "在 Raspberry Pi 上设置 OpenClaw"
  - "在 ARM 设备上运行 OpenClaw"
  - "构建一个低成本、始终在线的个人 AI"
title: "Raspberry Pi"
---

在 Raspberry Pi 上运行持久、始终在线的 OpenClaw 网关。由于 Pi 只是网关（模型通过 API 在云中运行），因此即使是普通的 Pi 也能很好地处理工作负载 - 典型硬件成本为 **一次性 35-80 美元**，无月租费。

## <a id="hardware-compatibility"></a> 硬件兼容性

| Pi模型    | RAM    | 作品？ | 笔记                               |
| ----------- | ------ | ------ | ----------------------------------- |
| Pi 5        | 4/8 GB | 最佳   | 速度最快，推荐。               |
| Pi 4        | 4 GB   | 良好   | 适合大多数用户的最佳选择。          |
| Pi 4        | 2 GB   | OK     | 添加交换。                           |
| Pi 4        | 1 GB   | 紧张  | 配合交换空间可用，配置要尽量精简。 |
| Pi 3B+      | 1 GB   | 慢   | 可以运行，但比较卡。                 |
| Pi零2 W | 512 MB | No     | 不推荐。                    |

**最小：** 1 GB RAM，1核，500个MB可用磁盘，64位OS。 **推荐：** 2 GB+ RAM、16 GB+ SD 卡（或 USB SSD）、以太网。

## <a id="prerequisites"></a> 先决条件

- Raspberry Pi 4 或 5 个，带 2 个 GB+ RAM（推荐 4 个 GB）
- MicroSD 卡（16 GB+）或 USB SSD（性能更好）
- 官方Pi电源
- 网络连接（以太网或WiFi）
- 64 位 Raspberry Pi OS（必需 - 请勿使用 32 位）
- 约 30 分钟

## <a id="setup"></a> 设置

<Steps>
  <Step id="flash-the-os" title="闪存 OS">
    使用 **Raspberry Pi OS Lite (64-bit)** -- 无需桌面环境，适合无头服务器。

    1. 下载 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)。
    2. 选择OS：**Raspberry Pi OS Lite（64位）**。
    3. 在设置对话框中，预先配置：
       - 主机名：`gateway-host`
       - 启用 SSH
       - 设置用户名和密码
       - 配置 WiFi（如果不使用以太网）
    4. 将系统刷写到 SD 卡或 USB 驱动器中，插入后启动 Pi。

  </Step>

  <Step id="connect-via-ssh" title="通过 SSH 连接">
    ```bash
    ssh user@gateway-host
    ```
  </Step>

  <Step id="update-the-system" title="更新系统">
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y git curl build-essential

    # Set your timezone (important for cron and reminders).
    # Replace America/Chicago with your own IANA zone (`timedatectl list-timezones`).
    sudo timedatectl set-timezone America/Chicago
    ```

  </Step>

  <Step id="install-node-js-24-lts" title="安装 Node.js 24 LTS">
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt install -y nodejs
    node --version
    ```
  </Step>

  <Step id="add-swap-important-for-2-gb-or-less" title="添加交换（对于 2 GB 或更少很重要）">
    ```bash
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

    # Reduce swappiness for low-RAM devices
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    ```

  </Step>

  <Step id="install-openclaw" title="安装 OpenClaw">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
    ```
  </Step>

  <Step id="run-onboarding" title="运行入门引导培训">
    ```bash
    openclaw onboard --install-daemon
    ```

    按照向导操作。对于无头设备，建议使用 API 密钥而不是 OAuth。Telegram 是最容易上手的渠道。

  </Step>

  <Step id="verify" title="验证">
    ```bash
    openclaw status
    systemctl --user status openclaw-gateway.service
    journalctl --user -u openclaw-gateway.service -f
    ```
  </Step>

  <Step id="access-the-control-ui" title="访问 Control UI">
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

## <a id="performance-tips"></a> 性能提示

**使用 USB SSD** -- SD 卡速度慢且磨损。 USB SSD 显着提高了性能并能承受更多的写入周期；如果您将 OS 保留在 SD 上，则可将其用于 `OPENCLAW_STATE_DIR`。请参阅 [Pi USB 启动指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot)。

**Enable 模块编译缓存** -- 加速低功耗 Pi 主机上重复的 CLI 调用。 `OPENCLAW_NO_RESPAWN=1` 保持例行网关在进程内重新启动，避免额外的进程切换并保持 PID 在小型主机上的简单跟踪：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

使用 `/var/tmp`，而不是 `/tmp`——一些发行版在启动时清除 `/tmp`，这会删除预热的缓存。网关主线程保持未缓存状态，以避免同步缓存写入延迟启动或关闭。工作人员保留缓存；请参阅 [ 网关缓存策略](/gateway#module-compile-cache)。

**降低内存使用** -- 对于无头设置，释放 GPU 内存并禁用未使用的服务：

```bash
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt
sudo systemctl disable bluetooth
```

**systemd 用于特定于主机的启动调整的插入项** — 受管单元拥有通用重新启动策略（`Restart=always`、`RestartSec=5`）。如果此 Pi 主要运行 OpenClaw，则仅为特定于主机的启动设置添加服务插入项：

```bash
systemctl --user edit openclaw-gateway.service
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
TimeoutStartSec=90
```

然后执行 `systemctl --user daemon-reload && systemctl --user restart openclaw-gateway.service`。在无头 Pi 上，还应先启用 lingering，这样用户服务在注销后也能继续运行：`sudo loginctl enable-linger "$(whoami)"`。

## <a id="recommended-model-setup"></a> 推荐模型设置

由于 Pi 仅运行网关，因此请使用云托管的 API 模型 - 不要在 Pi 上运行本地 LLM，即使是小型模型也太慢而无法使用：

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

## <a id="arm-binary-notes"></a> ARM 二进制说明

大多数 OpenClaw 功能在 ARM64 上无需修改即可运行（Node.js、Telegram、WhatsApp/Baileys、Chromium）。偶尔缺少 ARM 构建的二进制文件通常是由技能提供的可选 Go/Rust CLI 工具。先使用 `uname -m` 验证架构（应显示 `aarch64`），然后在缺失二进制文件的发布页面上检查是否有 `linux-arm64` / `aarch64` 产物，再在必要时回退为从源代码构建。

## <a id="persistence-and-backups"></a> 持久化与备份

OpenClaw 的状态位于：

- `~/.openclaw/` -- `openclaw.json`，共享和每个代理 SQLite 身份验证存储，channel/provider 状态，会话。
- `~/.openclaw/workspace/` -- agent 工作区（SOUL.md、memory、artifacts）。

这些产品在重新启动后仍能幸存，并受益于 SSD 而非 SD 卡的性能和使用寿命。使用以下命令创建备份存档：

```bash
openclaw backup create
openclaw backup restore <archive.tar.gz> --target <fresh-directory>
```

绝对符号链接保留其原始目标位置，包括指向单独备份的配置或凭据的链接。在激活另一台主机或另一条路径上的状态之前查看这些链接；请参阅 [ 备份符号链接警告 ](/cli/backup#what-gets-backed-up)。恢复验证并提取到新的暂存目录中；激活是一个单独的离线步骤。有关回滚警告和激活顺序，请参阅 [ 恢复完整存档 ](/install/backups#restore-a-full-archive)。

## <a id="troubleshooting"></a> 故障排查

**内存不足** -- 验证交换是否与 `free -h` 处于活动状态。禁用未使用的服务 （`sudo systemctl disable cups bluetooth avahi-daemon`）。仅使用基于 API- 的模型。

**性能缓慢** -- 使用 USB SSD 代替 SD 卡。通过 `vcgencmd get_throttled` 检查 CPU 是否降频（应返回 `0x0`）。

**服务无法启动** -- 使用 `journalctl --user -u openclaw-gateway.service --no-pager -n 100` 查看日志，并运行 `openclaw doctor --non-interactive`。如果这是无头 Pi，还要验证 lingering 是否已启用：`sudo loginctl enable-linger "$(whoami)"`。

**ARM 二进制问题** -- 如果某个 skill 失败并显示 "exec format error"，请检查该二进制是否有 ARM64 构建。使用 `uname -m` 验证架构（应显示 `aarch64`）。

**WiFi 断开** -- 关闭 WiFi 电源管理：`sudo iwconfig wlan0 power off`。

## <a id="next-steps"></a> 下一步

- [Channels](/channels) -- 连接 Telegram、WhatsApp、Discord 等
- [网关配置](/gateway/configuration) -- 所有配置选项
- [Updating](/install/updating) -- 使 OpenClaw 保持最新

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [Linux 服务器](/vps)
- [平台](/platforms)
