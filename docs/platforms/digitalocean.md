---
summary: "在 DigitalOcean 上运行 OpenClaw（简易付费 VPS 选项）"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for cheap VPS hosting for OpenClaw
title: "DigitalOcean (Platform)"
---

# 在 DigitalOcean 上运行 OpenClaw

## 目标

在 DigitalOcean 上运行持续可用的 OpenClaw 网关，费用为 **$6/月**（预订价格为 $4/月）。

如果你想要零成本选项，并且不介意 ARM 架构及供应商特定设置，参见 [Oracle Cloud 指南](/platforms/oracle)。

## 费用对比（2026年）

| 提供商      | 方案             | 规格                   | 月价       | 备注                                  |
| ----------- | ---------------- | ---------------------- | ---------- | ------------------------------------ |
| Oracle Cloud | Always Free ARM  | 最高 4 OCPU，24GB RAM  | $0         | ARM 架构，容量有限/注册繁琐           |
| Hetzner     | CX22             | 2 vCPU, 4GB RAM        | €3.79 (~$4) | 最便宜的付费选项                     |
| DigitalOcean| Basic            | 1 vCPU, 1GB RAM        | $6         | 界面简洁，文档完善                   |
| Vultr       | Cloud Compute    | 1 vCPU, 1GB RAM        | $6         | 众多机房                           |
| Linode      | Nanode           | 1 vCPU, 1GB RAM        | $5         | 现为 Akamai 旗下                    |

**选择提供商建议：**

- DigitalOcean：最简单的用户体验 + 预测性设置（本指南所述）
- Hetzner：性价比高（见 [Hetzner 指南](/install/hetzner)）
- Oracle Cloud：可零成本使用，但较为复杂且仅支持 ARM（见 [Oracle 指南](/platforms/oracle)）

---

## 前提条件

- DigitalOcean 账户（[注册即送 $200 体验金](https://m.do.co/c/signup)）
- SSH 密钥对（或愿意使用密码认证）
- 大约 20 分钟时间

## 1) 创建 Droplet

<Warning>
使用干净的基础镜像（Ubuntu 24.04 LTS）。避免使用未经审核的第三方 Marketplace 一键镜像，除非你已检查其启动脚本及防火墙默认设置。
</Warning>

1. 登录 [DigitalOcean](https://cloud.digitalocean.com/)
2. 点击 **Create → Droplets**
3. 选择：
   - **区域（Region）:** 离你或用户最近的机房
   - **镜像（Image）:** Ubuntu 24.04 LTS
   - **规格（Size）:** Basic → Regular → **$6/月**（1 vCPU，1GB RAM，25GB SSD）
   - **认证方式（Authentication）:** SSH 密钥（推荐）或密码
4. 点击 **Create Droplet**
5. 记录下 IP 地址

## 2) 通过 SSH 连接

```bash
ssh root@YOUR_DROPLET_IP
```

## 3) 安装 OpenClaw

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs

# 安装 OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash

# 验证安装
openclaw --version
```

## 4) 运行引导程序

```bash
openclaw onboard --install-daemon
```

向导将引导你完成：

- 模型认证（API 密钥或 OAuth）
- 通道设置（Telegram、WhatsApp、Discord 等）
- 网关令牌（自动生成）
- 守护进程安装（systemd）

## 5) 验证网关状态

```bash
# 查看状态
openclaw status

# 查看服务状态
systemctl --user status openclaw-gateway.service

# 查看日志
journalctl --user -u openclaw-gateway.service -f
```

## 6) 访问控制面板

网关默认绑定本地回环地址。要访问控制界面：

**选项 A：SSH 隧道（推荐）**

```bash
# 在本地机器上运行
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP

# 然后打开：http://localhost:18789
```

**选项 B：使用 Tailscale Serve（HTTPS，仅限回环）**

```bash
# 在 Droplet 上运行
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# 配置网关使用 Tailscale Serve
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

打开：`https://<magicdns>/`

注意：

- Serve 模式保持网关仅绑定回环地址，通过 Tailscale 身份头进行控制界面/WebSocket 流量认证（无 token 认证假设网关主机可信；HTTP API 仍需 token/密码）。
- 若需强制使用 token/密码，则设置 `gateway.auth.allowTailscale: false` 或使用 `gateway.auth.mode: "password"`。

**选项 C：Tailnet 绑定（无 Serve）**

```bash
openclaw config set gateway.bind tailnet
openclaw gateway restart
```

打开：`http://<tailscale-ip>:18789`（需令牌）。

## 7) 连接你的通道

### Telegram

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

### WhatsApp

```bash
openclaw channels login whatsapp
# 扫描二维码
```

其他通道请参见 [Channels](/channels)。

---

## 1GB 内存优化建议

$6 规格的 Droplet 只有 1GB 内存，为保持运行流畅：

### 添加交换分区（推荐）

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 使用更轻量的模型

如果出现内存不足（OOM）：

- 考虑使用基于 API 的模型（如 Claude，GPT）替代本地模型
- 将 `agents.defaults.model.primary` 设置为更小的模型

### 监控内存使用

```bash
free -h
htop
```

---

## 持久化数据

所有状态均保存在：

- `~/.openclaw/` — 配置、凭证、会话数据
- `~/.openclaw/workspace/` — 工作区（SOUL.md、内存等）

这些数据会保留于重启后。请定期备份：

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## Oracle Cloud 免费替代方案

Oracle Cloud 提供 **Always Free** 的 ARM 实例，性能远超本文任何付费选项 —— 每月免费。

| 配置          | 规格                   |
| ------------- | ---------------------- |
| **4 OCPU**    | ARM Ampere A1          |
| **24GB 内存** | 远超需求               |
| **200GB 存储**| 块存储                  |
| **永久免费**  | 无需信用卡费用          |

**注意事项：**

- 注册流程可能较繁琐（失败需重试）
- ARM 架构 —— 大多数软件可用，但部分二进制需对应 ARM 版本

完整安装指南见 [Oracle Cloud](/platforms/oracle)。关于注册技巧和排查注册问题，请参考社区指南：[社区指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)。

---

## 故障排除

### Gateway will not start

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl -u openclaw --no-pager -n 50
```

### 端口已被占用

```bash
lsof -i :18789
kill <PID>
```

### 内存不足

```bash
# 查看内存情况
free -h

# 添加更多交换分区
# 或升级至 $12/月（2GB RAM）Droplet
```

---

## 参考链接

- [Hetzner 指南](/install/hetzner) — 更便宜且更强大
- [Docker 安装](/install/docker) — 容器化部署
- [Tailscale](/gateway/tailscale) — 安全远程访问
- [配置参考](/gateway/configuration) — 完整配置说明
