---
summary: "DigitalOcean 上的 OpenClaw（简单的付费 VPS 选项）"
read_when:
  - 在 DigitalOcean 上设置 OpenClaw
  - 为 OpenClaw 寻找便宜的 VPS 托管
title: "DigitalOcean（平台）"
---

# DigitalOcean 上的 OpenClaw

## 目标

在 DigitalOcean 上运行一个持久化的 OpenClaw Gateway，价格为 **每月 $6**（或使用预留定价时为每月 $4）。

如果你想要每月 $0 的方案，并且不介意 ARM 架构 + 特定于提供商的设置，请参阅 [Oracle Cloud 指南](/platforms/oracle)。

## 成本对比（2026）

| 提供商       | 套餐            | 配置                   | 月价格      | 备注                                  |
| ------------ | --------------- | ---------------------- | ----------- | ------------------------------------- |
| Oracle Cloud | Always Free ARM | 最高 4 OCPU，24GB RAM   | $0          | ARM，容量有限 / 注册流程有些特殊        |
| Hetzner      | CX22            | 2 vCPU，4GB RAM        | €3.79（约 $4） | 最便宜的付费选项                      |
| DigitalOcean | Basic           | 1 vCPU，1GB RAM        | $6          | 界面易用，文档完善                    |
| Vultr        | Cloud Compute   | 1 vCPU，1GB RAM        | $6          | 地区很多                              |
| Linode       | Nanode          | 1 vCPU，1GB RAM        | $5          | 现已成为 Akamai 的一部分               |

**选择提供商：**

- DigitalOcean：最简单的用户体验 + 可预测的设置流程（本指南）
- Hetzner：性价比不错（参见 [Hetzner 指南](/install/hetzner)）
- Oracle Cloud：可能是每月 $0，但更麻烦，而且仅支持 ARM（参见 [Oracle 指南](/platforms/oracle)）

---

## 前提条件

- DigitalOcean 账户（[使用 $200 免费额度注册](https://m.do.co/c/signup)）
- SSH 密钥对（或者愿意使用密码认证）
- 大约 20 分钟

## 1) 创建 Droplet

<Warning>
请使用干净的基础镜像（Ubuntu 24.04 LTS）。除非你已经检查过第三方 Marketplace 一键镜像的启动脚本和防火墙默认设置，否则请避免使用它们。
</Warning>

1. 登录 [DigitalOcean](https://cloud.digitalocean.com/)
2. 点击 **Create → Droplets**
3. 选择：
   - **Region:** 离你（或你的用户）最近的地区
   - **Image:** Ubuntu 24.04 LTS
   - **Size:** Basic → Regular → **$6/mo**（1 vCPU，1GB RAM，25GB SSD）
   - **Authentication:** SSH key（推荐）或密码
4. 点击 **Create Droplet**
5. 记下 IP 地址

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

# 验证
openclaw --version
```

## 4) 运行引导流程

```bash
openclaw onboard --install-daemon
```

向导会引导你完成以下步骤：

- 模型认证（API 密钥或 OAuth）
- 渠道设置（Telegram、WhatsApp、Discord 等）
- Gateway 令牌（自动生成）
- 守护进程安装（systemd）

## 5) 验证 Gateway

```bash
# 检查状态
openclaw status

# 检查服务
systemctl --user status openclaw-gateway.service

# 查看日志
journalctl --user -u openclaw-gateway.service -f
```

## 6) 访问仪表板

Gateway 默认绑定到回环地址。要访问 Control UI：

**选项 A：SSH 隧道（推荐）**

```bash
# 在你的本地机器上
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP

# 然后打开： http://localhost:18789
```

**选项 B：Tailscale Serve（HTTPS，仅回环）**

```bash
# 在 droplet 上
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# 配置 Gateway 使用 Tailscale Serve
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

打开：`https://<magicdns>/`

说明：

- Serve 会保持 Gateway 仅监听回环，并通过 Tailscale 身份标头对 Control UI/WebSocket 流量进行认证（无令牌认证默认假设网关主机是可信的；HTTP API 不使用这些 Tailscale 标头，而是遵循网关的正常 HTTP 认证模式）。
- 如果想改为显式的共享密钥凭证，请设置 `gateway.auth.allowTailscale: false`，并使用 `gateway.auth.mode: "token"` 或 `"password"`。

**选项 C：Tailnet 绑定（不使用 Serve）**

```bash
openclaw config set gateway.bind tailnet
openclaw gateway restart
```

打开：`http://<tailscale-ip>:18789`（需要令牌）。

## 7) 连接你的渠道

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

其他提供商请参阅 [Channels](/channels)。

---

## 1GB RAM 的优化

这个 $6 的 droplet 只有 1GB RAM。为了让它平稳运行：

### 添加 swap（推荐）

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 使用更轻量的模型

如果你遇到 OOM，考虑：

- 使用基于 API 的模型（Claude、GPT），而不是本地模型
- 将 `agents.defaults.model.primary` 设置为更小的模型

### 监控内存

```bash
free -h
htop
```

---

## 持久性

所有状态都保存在：

- `~/.openclaw/` — `openclaw.json`、每个 agent 的 `auth-profiles.json`、渠道/提供商状态，以及会话数据
- `~/.openclaw/workspace/` — workspace（SOUL.md、memory 等）

这些内容会在重启后保留。请定期备份：

```bash
openclaw backup create
```

---

## Oracle Cloud 免费替代方案

Oracle Cloud 提供 **Always Free** ARM 实例，性能明显强于这里的任何付费选项——而且每月只要 $0。

| 你将获得       | 配置                  |
| ----------------- | ---------------------- |
| **4 OCPUs**       | ARM Ampere A1          |
| **24GB RAM**      | 完全足够               |
| **200GB 存储**    | 块存储卷               |
| **永久免费**      | 不会产生信用卡扣费      |

**注意事项：**

- 注册流程可能有点麻烦（如果失败请重试）
- ARM 架构——大多数内容都能正常工作，但有些二进制文件需要 ARM 构建版本

完整设置指南请参阅 [Oracle Cloud](/platforms/oracle)。有关注册技巧和排障入门流程，请参阅这份 [社区指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)。

---

## 故障排查

### Gateway 无法启动

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl --user -u openclaw-gateway.service --no-pager -n 50
```

### 端口已被占用

```bash
lsof -i :18789
kill <PID>
```

### 内存不足

```bash
# 检查内存
free -h

# 添加更多 swap
# 或升级到每月 $12 的 droplet（2GB RAM）
```

---

## 相关内容

- [Hetzner 指南](/install/hetzner) — 更便宜，性能更强
- [Docker 安装](/install/docker) — 容器化设置
- [Tailscale](/gateway/tailscale) — 安全的远程访问
- [配置](/gateway/configuration) — 完整配置参考
