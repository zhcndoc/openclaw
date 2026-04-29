---
summary: "树莓派上的 OpenClaw（预算型自托管方案）"
read_when:
  - 在树莓派上设置 OpenClaw
  - 在 ARM 设备上运行 OpenClaw
  - 构建一个便宜的全天候个人 AI
title: "Raspberry Pi（平台）"
---

# 树莓派上的 OpenClaw

## 目标

在树莓派上运行一个持久在线、始终开启的 OpenClaw Gateway，**一次性成本约 $35-80**（无月费）。

非常适合：

- 24/7 个人 AI 助手
- 家庭自动化中枢
- 低功耗、随时可用的 Telegram/WhatsApp 机器人

## 硬件要求

| Pi 型号         | 内存    | 可用？   | 说明                               |
| --------------- | ------- | -------- | ---------------------------------- |
| **Pi 5**        | 4GB/8GB | ✅ 最佳  | 最快，推荐                          |
| **Pi 4**        | 4GB     | ✅ 良好  | 大多数用户的最佳选择                |
| **Pi 4**        | 2GB     | ✅ 可以  | 可用，需添加交换分区                |
| **Pi 4**        | 1GB     | ⚠️ 紧张 | 可配合交换分区使用，配置要精简      |
| **Pi 3B+**      | 1GB     | ⚠️ 慢    | 可用但比较卡顿                      |
| **Pi Zero 2 W** | 512MB   | ❌       | 不推荐                               |

**最低规格：** 1GB RAM，1 核，500MB 磁盘  
**推荐：** 2GB+ RAM，64 位操作系统，16GB+ SD 卡（或 USB SSD）

## 你需要准备的东西

- Raspberry Pi 4 或 5（推荐 2GB+）
- MicroSD 卡（16GB+）或 USB SSD（性能更好）
- 电源适配器（建议使用官方 Pi 电源）
- 网络连接（以太网或 WiFi）
- 约 30 分钟

## 1) 刷写操作系统

使用 **Raspberry Pi OS Lite（64-bit）** —— 作为无头服务器不需要桌面环境。

1. 下载 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. 选择操作系统：**Raspberry Pi OS Lite (64-bit)**
3. 点击齿轮图标（⚙️）进行预配置：
   - 设置主机名：`gateway-host`
   - 启用 SSH
   - 设置用户名/密码
   - 配置 WiFi（如果不使用以太网）
4. 刷写到你的 SD 卡 / USB 盘
5. 插入并启动 Pi

## 2) 通过 SSH 连接

```bash
ssh user@gateway-host
# 或者使用 IP 地址
ssh user@192.168.x.x
```

## 3) 系统设置

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础软件包
sudo apt install -y git curl build-essential

# 设置时区（对 cron/提醒很重要）
sudo timedatectl set-timezone America/Chicago  # 更改为你的时区
```

## 4) 安装 Node.js 24（ARM64）

```bash
# 通过 NodeSource 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# 验证
node --version  # 应显示 v24.x.x
npm --version
```

## 5) 添加交换分区（对 2GB 或更少内存很重要）

交换分区可防止内存不足导致崩溃：

```bash
# 创建 2GB 交换文件
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 设为永久生效
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 针对低内存优化（降低 swappiness）
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 6) 安装 OpenClaw

### 选项 A：标准安装（推荐）

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### 选项 B：可修改安装（用于折腾）

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
npm link
```

可修改安装让你可以直接访问日志和代码——这对调试 ARM 相关问题很有用。

## 7) 运行初始化向导

```bash
openclaw onboard --install-daemon
```

按照向导完成设置：

1. **Gateway 模式：** 本地
2. **认证：** 推荐使用 API key（在无头 Pi 上 OAuth 可能不太稳定）
3. **频道：** Telegram 最容易上手
4. **守护进程：** 是（systemd）

## 8) 验证安装

```bash
# 检查状态
openclaw status

# 检查服务（标准安装 = systemd 用户单元）
systemctl --user status openclaw-gateway.service

# 查看日志
journalctl --user -u openclaw-gateway.service -f
```

## 9) 访问 OpenClaw 仪表盘

将 `user@gateway-host` 替换为你的 Pi 用户名以及主机名或 IP 地址。

在你的电脑上，让 Pi 打印一个新的仪表盘 URL：

```bash
ssh user@gateway-host 'openclaw dashboard --no-open'
```

该命令会输出 `Dashboard URL:`。根据 `gateway.auth.token`
的配置方式，URL 可能是普通的 `http://127.0.0.1:18789/` 链接，也可能是
包含 `#token=...` 的链接。

在你电脑的另一个终端中，创建 SSH 隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

然后在本地浏览器中打开打印出来的 Dashboard URL。

如果 UI 要求共享密钥认证，请把配置好的 token 或密码
粘贴到 Control UI 设置中。对于 token 认证，使用 `gateway.auth.token`（或
`OPENCLAW_GATEWAY_TOKEN`）。

如果要实现始终在线的远程访问，请参见 [Tailscale](/gateway/tailscale)。

---

## 性能优化

### 使用 USB SSD（巨大提升）

SD 卡速度慢，而且会磨损。USB SSD 能显著提升性能：

```bash
# 检查是否从 USB 启动
lsblk
```

查看 [Pi USB 启动指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot) 了解设置方法。

### 加快 CLI 启动速度（模块编译缓存）

在性能较低的 Pi 主机上，启用 Node 的模块编译缓存，这样重复运行 CLI 会更快：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

说明：

- `NODE_COMPILE_CACHE` 可以加速后续运行（`status`、`health`、`--help`）。
- `/var/tmp` 比 `/tmp` 更能在重启后保留内容。
- `OPENCLAW_NO_RESPAWN=1` 可避免 CLI 自我重启带来的额外启动开销。
- 第一次运行会预热缓存；后续运行受益最大。

### systemd 启动调优（可选）

如果这台 Pi 主要运行 OpenClaw，可以添加一个服务 drop-in 来减少重启
抖动，并保持启动环境稳定：

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

然后应用：

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw-gateway.service
```

如果可以，尽量把 OpenClaw 状态/缓存放在 SSD 支持的存储上，以避免 SD 卡
在冷启动时出现随机 I/O 瓶颈。

如果这是无头 Pi，请先启用 lingering，这样用户服务在退出登录后也能继续运行：

```bash
sudo loginctl enable-linger "$(whoami)"
```

`Restart=` 策略如何帮助自动恢复：
[systemd 可以自动化服务恢复](https://www.redhat.com/en/blog/systemd-automate-recovery)。

### 降低内存占用

```bash
# 禁用 GPU 内存分配（无头模式）
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt

# 如果不需要，禁用蓝牙
sudo systemctl disable bluetooth
```

### 监控资源

```bash
# 查看内存
free -h

# 查看 CPU 温度
vcgencmd measure_temp

# 实时监控
htop
```

---

## ARM 特定说明

### 二进制兼容性

大多数 OpenClaw 功能都可以在 ARM64 上运行，但某些外部二进制文件可能需要 ARM 构建：

| 工具               | ARM64 状态 | 说明                                |
| ------------------ | ---------- | ----------------------------------- |
| Node.js            | ✅         | 运行良好                            |
| WhatsApp (Baileys) | ✅         | 纯 JS，无问题                       |
| Telegram           | ✅         | 纯 JS，无问题                       |
| gog (Gmail CLI)    | ⚠️         | 检查是否有 ARM 版本                 |
| Chromium (browser) | ✅         | `sudo apt install chromium-browser` |

如果某个 skill 失败，请检查它的二进制文件是否有 ARM 构建。许多 Go/Rust 工具都有；有些没有。

### 32 位 vs 64 位

**务必使用 64 位操作系统。** Node.js 和许多现代工具都需要它。可通过以下命令检查：

```bash
uname -m
# 应显示：aarch64（64 位），而不是 armv7l（32 位）
```

---

## 推荐的模型配置

由于 Pi 只是 Gateway（模型运行在云端），请使用基于 API 的模型：

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

**不要尝试在 Pi 上运行本地 LLM**——即使是小模型也太慢。让 Claude/GPT 负责重活。

---

## 开机自动启动

初始化向导已经设置好了，但你可以验证一下：

```bash
# 检查服务是否已启用
systemctl --user is-enabled openclaw-gateway.service

# 如果没有，则启用
systemctl --user enable openclaw-gateway.service

# 开机启动
systemctl --user start openclaw-gateway.service
```

---

## 故障排除

### 内存不足（OOM）

```bash
# 查看内存
free -h

# 添加更多交换分区（见步骤 5）
# 或减少 Pi 上运行的服务
```

### 性能缓慢

- 使用 USB SSD 代替 SD 卡
- 禁用未使用的服务：`sudo systemctl disable cups bluetooth avahi-daemon`
- 检查 CPU 降频：`vcgencmd get_throttled`（应返回 `0x0`）

### 服务无法启动

```bash
# 查看日志
journalctl --user -u openclaw-gateway.service --no-pager -n 100

# 常见修复：重新构建
cd ~/openclaw  # 如果使用的是可修改安装
npm run build
systemctl --user restart openclaw-gateway.service
```

### ARM 二进制问题

如果某个 skill 报错 "exec format error"：

1. 检查该二进制是否有 ARM64 构建
2. 尝试从源代码构建
3. 或使用支持 ARM 的 Docker 容器

### WiFi 掉线

对于使用 WiFi 的无头 Pi：

```bash
# 禁用 WiFi 省电管理
sudo iwconfig wlan0 power off

# 设为永久生效
echo 'wireless-power off' | sudo tee -a /etc/network/interfaces
```

---

## 成本对比

| 方案           | 一次性成本 | 月成本       | 说明                      |
| -------------- | ---------- | ------------ | ------------------------- |
| **Pi 4 (2GB)** | ~$45      | $0           | + 电费（约 $5/年）        |
| **Pi 4 (4GB)** | ~$55      | $0           | 推荐                       |
| **Pi 5 (4GB)** | ~$60      | $0           | 性能最佳                   |
| **Pi 5 (8GB)** | ~$80      | $0           | 有些过头，但可面向未来    |
| DigitalOcean   | $0         | $6/月        | $72/年                    |
| Hetzner        | $0         | €3.79/月     | ~$50/年                   |

**收支平衡：** 与云 VPS 相比，Pi 大约在 6-12 个月内就能回本。

---

## 相关内容

- [Linux 指南](/platforms/linux) — 通用 Linux 设置
- [DigitalOcean 指南](/platforms/digitalocean) — 云端替代方案
- [Hetzner 指南](/install/hetzner) — Docker 设置
- [Tailscale](/gateway/tailscale) — 远程访问
- [节点](/nodes) — 将你的笔记本/手机与 Pi 网关配对
