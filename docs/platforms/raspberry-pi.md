---
summary: "在树莓派上运行 OpenClaw（实惠的自托管方案）"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi (Platform)"
---

# 在树莓派上运行 OpenClaw

## 目标

在树莓派上运行一个持续、全天候的 OpenClaw 网关，**一次性投入约 35-80 美元**（无月费）。

非常适合：

- 24/7 个人 AI 助手
- 家庭自动化中枢
- 低功耗、始终在线的 Telegram/WhatsApp 机器人

## 硬件要求

| Pi 型号         | 内存    | 可用？   | 备注                              |
| --------------- | ------- | -------- | ---------------------------------- |
| **Pi 5**        | 4GB/8GB | ✅ 最佳  | 性能最快，推荐                     |
| **Pi 4**        | 4GB     | ✅ 良好  | 多数用户的最佳选择                 |
| **Pi 4**        | 2GB     | ✅ 还行  | 可用，建议加交换空间               |
| **Pi 4**        | 1GB     | ⚠️ 紧张  | 需要交换空间，配置最小化             |
| **Pi 3B+**      | 1GB     | ⚠️ 慢    | 可用但反应迟缓                   |
| **Pi Zero 2 W** | 512MB   | ❌       | 不推荐                          |

**最低配置：**1GB 内存，1 核心，500MB 硬盘  
**推荐配置：**2GB+ 内存，64位操作系统，16GB+ SD 卡（或 USB SSD）

## What you need

- Raspberry Pi 4 或 5（建议2GB及以上内存）
- MicroSD 卡（16GB及以上）或 USB SSD（性能更好）
- 电源（推荐官方 Pi 电源）
- 网络连接（以太网或 WiFi）
- 约 30 分钟

## 1) 刷写操作系统

使用**Raspberry Pi OS Lite（64位）** —— 无需桌面环境，适合无头服务器。

1. 下载 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. 选择操作系统：**Raspberry Pi OS Lite (64-bit)**
3. 点击齿轮图标（⚙️）进行预配置：
   - 设置主机名：`gateway-host`
   - 启用 SSH
   - 设置用户名/密码
   - 配置 WiFi（若不用以太网）
4. 刷写到 SD 卡或 USB 盘
5. 插入电源启动 Pi

## 2) 通过 SSH 连接

```bash
ssh user@gateway-host
# 或使用 IP 地址
ssh user@192.168.x.x
```

## 3) 系统设置

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必备软件包
sudo apt install -y git curl build-essential

# 设置时区（cron 和提醒很重要）
sudo timedatectl set-timezone America/Chicago  # 换成你的时区
```

## 4) 安装 Node.js 24（ARM64）

```bash
# 通过 NodeSource 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version  # 应显示 v24.x.x
```
npm --version
```

## 5) 添加交换空间（2GB 或更小内存时很重要）

交换空间可以防止内存不足崩溃：

```bash
# 创建 2GB 交换文件
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 设置开机自动启用
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 优化低内存环境（减少交换倾向）
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 6) 安装 OpenClaw

### 方案 A：标准安装（推荐）

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### 方案 B：可修改安装（适合调试）

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
npm link
```

可修改安装允许你直接访问日志和代码 —— 适合排查 ARM 特定问题。

## 7) 运行引导安装

```bash
openclaw onboard --install-daemon
```

按向导指示操作：

1. **网关模式：** 本地
2. **认证：** 推荐 API Key（OAuth 在无头 Pi 上可能不稳定）
3. **频道：** Telegram 最简单入手
4. **守护进程：** 是（systemd）

## 8) 验证安装

```bash
# 查看状态
openclaw status

# 查看服务状态
sudo systemctl status openclaw

# 查看日志
journalctl -u openclaw -f
```

## 9) 访问 OpenClaw 仪表盘

将 `user@gateway-host` 替换为你的 Pi 用户名和主机名或 IP 地址。

在你的电脑上，让 Pi 打印一个新的仪表盘 URL：

```bash
ssh user@gateway-host 'openclaw dashboard --no-open'
```

该命令会打印 `Dashboard URL:`。根据 `gateway.auth.token` 的配置，URL 可能是普通的 `http://127.0.0.1:18789/` 链接，或包含 `#token=...` 的链接。

在你电脑的另一个终端中，创建 SSH 隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```
```

然后在本地浏览器中打开打印出的仪表盘 URL。

如果界面要求认证，请将 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）中的令牌粘贴到控制界面设置中。

关于持续远程访问，请参见 [Tailscale](/gateway/tailscale)。

---

## 性能优化

### 使用 USB SSD（巨大提升）

SD 卡速度慢且容易磨损，用 USB SSD 性能大幅提升：

```bash
# 检查是否从 USB 启动
lsblk
```

参见 [Pi USB 启动指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot)。

### 加速 CLI 启动（模块编译缓存）

在低功耗 Pi 主机上启用 Node 的模块编译缓存，加快 CLI 多次运行速度：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

说明：

- `NODE_COMPILE_CACHE` 加速后续命令（`status`、`health`、`--help`）运行
- `/var/tmp` 比 `/tmp` 更持久，重启后缓存保留更久
- `OPENCLAW_NO_RESPAWN=1` 避免 CLI 自我重启带来额外启动成本
- 首次运行会预热缓存，后续运行速度明显提升

### systemd 启动调整（可选）

如果 Pi 主要运行 OpenClaw，添加服务覆盖文件，减少重启抖动，保持启动环境稳定：

```bash
sudo systemctl edit openclaw
```

写入以下内容：

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

应用配置：

```bash
sudo systemctl daemon-reload
sudo systemctl restart openclaw
```

如果可能，将 OpenClaw 状态/缓存放到 SSD 设备，避免 SD 卡在冷启动时出现随机 I/O 瓶颈。

关于 `Restart=` 策略如何帮助自动恢复：[systemd 可自动恢复服务](https://www.redhat.com/en/blog/systemd-automate-recovery)。

### 减少内存占用

```bash
# 禁用 GPU 内存分配（无头模式）
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt

# 如果不需要，禁用蓝牙
sudo systemctl disable bluetooth
```

### 监控资源

```bash
# 查看内存使用
free -h

# 查看 CPU 温度
vcgencmd measure_temp

# 实时监控
htop
```

---

## ARM 特定说明

### 二进制兼容性

大多数 OpenClaw 功能支持 ARM64，但部分外部二进制需 ARM 构建版本：

| 工具               | ARM64 状态 | 备注                             |
| ------------------ | ---------- | -------------------------------- |
| Node.js            | ✅         | 完全支持                       |
| WhatsApp (Baileys) | ✅         | 纯 JS，无问题                   |
| Telegram           | ✅         | 纯 JS，无问题                   |
| gog (Gmail CLI)    | ⚠️         | 请检查 ARM 版本                   |
| Chromium (浏览器)  | ✅         | `sudo apt install chromium-browser` |

若某技能失败，检查其二进制是否有 ARM 构建版本。许多 Go/Rust 工具支持 ARM，有些不支持。

### 32 位 vs 64 位

**务必使用64位操作系统。** Node.js 和多数现代工具需64位。验证命令：

```bash
uname -m
# 输出应为：aarch64（64位），非 armv7l（32位）
```

---

## 推荐模型配置

由于 Pi 仅做网关（模型运行云端），建议使用 API 模型：

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-20250514",
        "fallbacks": ["openai/gpt-4o-mini"]
      }
    }
  }
}
```

**切勿尝试在 Pi 上本地运行大型语言模型** —— 即使是小型模型速度也太慢。让 Claude/GPT 处理复杂计算。

---

## 开机自动启动

Onboarding sets this up, but to verify:

```bash
# 检查服务是否启用
sudo systemctl is-enabled openclaw

# 如未启用，则启用
sudo systemctl enable openclaw

# 启动服务
sudo systemctl start openclaw
```

---

## 故障排查

### 内存不足（OOM）

```bash
# 查看内存使用
free -h

# 增加交换空间（参考步骤 5）
# 或减少 Pi 上运行的服务数量
```

### 性能缓慢

- 使用 USB SSD 替代 SD 卡
- 禁用不需要的服务：`sudo systemctl disable cups bluetooth avahi-daemon`
- 检查 CPU 是否降频节流：`vcgencmd get_throttled`（结果应为 `0x0`）

### Service will not start

```bash
# 查看日志
journalctl -u openclaw --no-pager -n 100

# 常用解决：重新编译
cd ~/openclaw  # 若使用可修改安装
npm run build
sudo systemctl restart openclaw
```

### ARM 二进制问题

若技能失败并报错“exec format error”：

1. 检查该二进制是否有 ARM64 版本
2. 尝试从源码编译
3. 或使用支持 ARM 的 Docker 容器

### WiFi 断线问题

无头 Pi 连接 WiFi 时：

```bash
# 关闭 WiFi 节能管理
sudo iwconfig wlan0 power off

# 设置永久生效
echo 'wireless-power off' | sudo tee -a /etc/network/interfaces
```

---

## 费用对比

| 方案           | 一次性成本     | 月费          | 备注                         |
| -------------- | ------------- | ------------ | ---------------------------- |
| **Pi 4 (2GB)** | 约 $45        | $0           | 另需电费（约 $5/年）         |
| **Pi 4 (4GB)** | 约 $55        | $0           | 推荐配置                     |
| **Pi 5 (4GB)** | 约 $60        | $0           | 最佳性能                     |
| **Pi 5 (8GB)** | 约 $80        | $0           | 过剩，但具备未来适应力        |
| DigitalOcean   | $0            | $6/月        | $72/年                      |
| Hetzner        | $0            | €3.79/月     | 约 $50/年                   |

**成本平衡点：** 与云 VPS 比较，树莓派大约 6-12 个月内即可回本。

---

## 相关链接

- [Linux 指南](/platforms/linux) — 通用 Linux 设置
- [DigitalOcean 指南](/platforms/digitalocean) — 云端方案
- [Hetzner 指南](/install/hetzner) — Docker 设置
- [Tailscale](/gateway/tailscale) — 远程访问
- [节点](/nodes) — 将你的笔记本/手机与 Pi 网关配对
