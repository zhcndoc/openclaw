---
summary: "Oracle 云上的 OpenClaw（永久免费 ARM）"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for low-cost VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "Oracle Cloud (Platform)"
---

# Oracle 云上的 OpenClaw (OCI)

## 目标

在 Oracle 云的 **永久免费** ARM 级别上运行持久化的 OpenClaw 网关。

Oracle 的免费套餐非常适合运行 OpenClaw（尤其是如果你已经拥有 OCI 账号），但存在一些权衡：

- ARM 架构（大多数程序可用，但部分二进制文件可能仅支持 x86）
- 容量有限，注册时可能会碰到问题

## 成本比较 (2026)

| 提供商       | 方案             | 配置                      | 月价    | 备注                  |
| ------------ | ---------------- | ------------------------- | ------- | --------------------- |
| Oracle 云    | 永久免费 ARM     | 高达 4 OCPU，24GB 内存      | $0      | ARM 架构，容量有限     |
| Hetzner      | CX22             | 2 vCPU，4GB 内存           | 约 $4   | 最便宜的付费选项       |
| DigitalOcean | 基础版           | 1 vCPU，1GB 内存           | $6      | 界面简洁，文档良好     |
| Vultr        | 云计算           | 1 vCPU，1GB 内存           | $6      | 多地区可选             |
| Linode       | Nanode           | 1 vCPU，1GB 内存           | $5      | 现为 Akamai 一部分      |

---

## 前置条件

- Oracle 云账号（[注册](https://www.oracle.com/cloud/free/)） — 如遇到问题，请参见 [社区注册指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 账号（免费，详见 [tailscale.com](https://tailscale.com)）
- 约 30 分钟时间

## 1) 创建 OCI 实例

1. 登录 [Oracle 云控制台](https://cloud.oracle.com/)
2. 进入 **计算 → 实例 → 创建实例**
3. 配置：
   - **名称：** `openclaw`
   - **镜像：** Ubuntu 24.04 (aarch64)
   - **规格：** `VM.Standard.A1.Flex`（Ampere ARM）
   - **OCPU 数量：** 2（或最多 4 个）
   - **内存：** 12 GB（或最多 24 GB）
   - **启动卷：** 50 GB（最多免费 200 GB）
   - **SSH 密钥：** 添加你的公钥
4. 点击 **创建**
5. 记下公网 IP 地址

**提示：** 如果创建失败提示“容量不足”，请尝试更换可用域或稍后重试。免费层容量有限。

## 2) 连接并更新系统

```bash
# 通过公网 IP 连接
ssh ubuntu@你的公网IP

# 更新系统
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential
```

**注意：** `build-essential` 是编译某些 ARM 依赖时必需的。

## 3) 配置用户和主机名

```bash
# 设置主机名
sudo hostnamectl set-hostname openclaw

# 设置 ubuntu 用户密码
sudo passwd ubuntu

# 启用 linger（用户注销后保持服务运行）
sudo loginctl enable-linger ubuntu
```

## 4) 安装 Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --hostname=openclaw
```

这启用了 Tailscale SSH，允许你从任何 tailnet 设备通过 `ssh openclaw` 连接，无需公网 IP。

验证：

```bash
tailscale status
```

**从此之后，通过 Tailscale 连接：** `ssh ubuntu@openclaw`（或使用 Tailscale IP）。

## 5) 安装 OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
source ~/.bashrc
```

遇到“你想如何孵化机器人？”时，选择 **“稍后再做”**。

> 注意：遇到 ARM 原生编译问题时，先尝试安装系统包（如 `sudo apt install -y build-essential`），再考虑 Homebrew。

## 6) 配置网关（环回 + Token 认证）并启用 Tailscale Serve

默认使用 Token 认证。可预测且无需开启任何“不安全认证”控制界面选项。

```bash
# 保持网关仅限本机访问
openclaw config set gateway.bind loopback

# 要求网关及控制界面认证
openclaw config set gateway.auth.mode token
openclaw doctor --generate-gateway-token

# 通过 Tailscale Serve（HTTPS + tailnet 访问）暴露
openclaw config set gateway.tailscale.mode serve
openclaw config set gateway.trustedProxies '["127.0.0.1"]'

systemctl --user restart openclaw-gateway
```

## 7) 验证

```bash
# 查看版本
openclaw --version

# 查看守护进程状态
systemctl --user status openclaw-gateway

# 查看 Tailscale Serve 状态
tailscale serve status

# 本地测试响应
curl http://localhost:18789
```

## 8) 锁定 VCN 安全性

一切正常后，锁定 VCN，仅允许 Tailscale 流量。OCI 的虚拟云网络是网络边界防火墙——流量在抵达实例前即被阻断。

1. 在 OCI 控制台打开 **网络 → 虚拟云网络**
2. 点击你的 VCN → **安全列表** → 默认安全列表
3. **删除** 除下列外的所有入站规则：
   - `0.0.0.0/0 UDP 41641`（Tailscale 端口）
4. 保持默认出站规则（全部允许）

这样会阻断所有 22 端口 SSH、HTTP、HTTPS 及其它流量。以后只能通过 Tailscale 连接。

---

## 访问控制界面

从任何 Tailscale 网络设备访问：

```
https://openclaw.<tailnet-name>.ts.net/
```

将 `<tailnet-name>` 替换为你的 tailnet 名称（可通过 `tailscale status` 查看）。

无需 SSH 隧道。Tailscale 提供：

- HTTPS 加密（自动证书）
- 通过 Tailscale 身份认证
- 从任何 tailnet 设备（笔记本、手机等）访问

---

## 安全性：VCN + Tailscale（推荐基础）

结合 VCN 锁定（只开放 UDP 41641）和绑定环回接口的网关，实现深度防御：公开流量在网络边界阻断，管理员访问通过 tailnet 进行。

此设置通常不再需要额外主机防火墙规则阻止全网 SSH 暴力破解——但仍建议保持系统更新，运行 `openclaw security audit`，并核查未意外监听公网接口。

### Already protected

| 传统措施          | 需要吗？   | 说明                                                             |
| ----------------- | ---------- | ---------------------------------------------------------------- |
| UFW 防火墙        | 不需要    | VCN 在流量到达实例前阻断                                         |
| fail2ban          | 不需要    | 22 端口阻断后无暴力破解风险                                     |
| sshd 强化         | 不需要    | Tailscale SSH 不使用 sshd                                        |
| 禁用 root 登录    | 不需要    | Tailscale 使用身份认证，不用系统用户                              |
| 仅 SSH 密钥认证   | 不需要    | Tailscale 通过 tailnet 认证                                      |
| IPv6 强化         | 通常不需要 | 依赖于 VCN 和子网配置，确认实际分配和暴露内容                    |

### 仍建议执行

- **凭据权限：** `chmod 700 ~/.openclaw`
- **安全审计：** `openclaw security audit`
- **系统更新：** 定期运行 `sudo apt update && sudo apt upgrade`
- **监控 Tailscale 设备：** 查看 [Tailscale 管理控制台](https://login.tailscale.com/admin)

### 验证安全状态

```bash
# 确认无公网端口监听
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# 确认 Tailscale SSH 已激活
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH 已激活"

# 可选：完全禁用 sshd
sudo systemctl disable --now ssh
```

---

## 备用方案：SSH 隧道

若 Tailscale Serve 不可用，使用 SSH 隧道：

```bash
# 在本地（通过 Tailscale）运行
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然后访问 `http://localhost:18789`。

---

## 故障排查

### 实例创建失败（“容量不足”）

ARM 免费实例很受欢迎，尝试：

- 切换可用域
- 在非高峰（凌晨）重试
- 选择“永久免费”筛选条件创建

### Tailscale will not connect

```bash
# 检查状态
sudo tailscale status

# 重新认证
sudo tailscale up --ssh --hostname=openclaw --reset
```

### Gateway will not start

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl --user -u openclaw-gateway -n 50
```

### Cannot reach Control UI

```bash
# 验证 Tailscale Serve 是否运行
tailscale serve status

# 检查网关监听
curl http://localhost:18789

# 需要时重启
systemctl --user restart openclaw-gateway
```

### ARM 二进制文件问题

部分工具可能无 ARM 构建，检查：

```bash
uname -m  # 应显示 aarch64
```

大多数 npm 包支持。二进制文件需查找 `linux-arm64` 或 `aarch64` 版本。

---

## 持久化

所有状态存储在：

- `~/.openclaw/` — 配置、凭据、会话数据
- `~/.openclaw/workspace/` — 工作空间（SOUL.md、内存、工件）

建议定期备份：

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## 参考

- [网关远程访问](/gateway/remote) — 其它远程访问方式
- [Tailscale 集成](/gateway/tailscale) — 完整的 Tailscale 文档
- [网关配置](/gateway/configuration) — 全部配置选项
- [DigitalOcean 指南](/platforms/digitalocean) — 付费且更易注册的选择
- [Hetzner 指南](/install/hetzner) — 基于 Docker 的替代方案
