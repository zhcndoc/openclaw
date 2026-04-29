---
summary: "Oracle Cloud 上的 OpenClaw（Always Free ARM）"
read_when:
  - 在 Oracle Cloud 上搭建 OpenClaw
  - 寻找适合 OpenClaw 的低成本 VPS 托管
  - 想在小型服务器上 24/7 运行 OpenClaw
title: "Oracle Cloud（平台）"
---

# Oracle Cloud 上的 OpenClaw（OCI）

## 目标

在 Oracle Cloud 的 **Always Free** ARM 层运行一个持久化的 OpenClaw Gateway。

Oracle 的免费套餐非常适合 OpenClaw（尤其是如果你已经有 OCI 账户），但也有一些取舍：

- ARM 架构（大多数东西都能用，但某些二进制文件可能只支持 x86）
- 容量和注册流程可能比较棘手

## 价格对比（2026）

| 提供商       | 套餐            | 规格                    | 每月价格 | 备注                 |
| ------------ | --------------- | ----------------------- | ------- | --------------------- |
| Oracle Cloud | Always Free ARM | 最高 4 OCPU，24GB 内存   | $0      | ARM，容量有限         |
| Hetzner      | CX22            | 2 vCPU，4GB 内存         | ~ $4    | 最便宜的付费选项      |
| DigitalOcean | Basic           | 1 vCPU，1GB 内存         | $6      | 界面简单，文档完善    |
| Vultr        | Cloud Compute   | 1 vCPU，1GB 内存         | $6      | 地点众多              |
| Linode       | Nanode          | 1 vCPU，1GB 内存         | $5      | 现已成为 Akamai 旗下  |

---

## 前提条件

- Oracle Cloud 账户（[注册](https://www.oracle.com/cloud/free/)）——如果遇到问题，请查看[社区注册指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 账户（可在 [tailscale.com](https://tailscale.com) 免费获取）
- 大约 30 分钟

## 1) 创建 OCI 实例

1. 登录 [Oracle Cloud Console](https://cloud.oracle.com/)
2. 导航到 **Compute → Instances → Create Instance**
3. 配置：
   - **名称：** `openclaw`
   - **镜像：** Ubuntu 24.04（aarch64）
   - **形状：** `VM.Standard.A1.Flex`（Ampere ARM）
   - **OCPU：** 2（最多可到 4）
   - **内存：** 12 GB（最多可到 24 GB）
   - **启动卷：** 50 GB（免费额度最高 200 GB）
   - **SSH 密钥：** 添加你的公钥
4. 点击 **Create**
5. 记下公网 IP 地址

**提示：** 如果实例创建失败并提示 “Out of capacity”，请尝试不同的可用域，或稍后重试。免费套餐容量有限。

## 2) 连接并更新

```bash
# 通过公网 IP 连接
ssh ubuntu@YOUR_PUBLIC_IP

# 更新系统
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential
```

**注意：** 某些依赖项的 ARM 编译需要 `build-essential`。

## 3) 配置用户和主机名

```bash
# 设置主机名
sudo hostnamectl set-hostname openclaw

# 为 ubuntu 用户设置密码
sudo passwd ubuntu

# 启用 lingering（在退出登录后仍保持用户服务运行）
sudo loginctl enable-linger ubuntu
```

## 4) 安装 Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --hostname=openclaw
```

这将启用 Tailscale SSH，因此你可以从 tailnet 中的任何设备通过 `ssh openclaw` 连接——不需要公网 IP。

验证：

```bash
tailscale status
```

**从现在开始，通过 Tailscale 连接：** `ssh ubuntu@openclaw`（或者使用 Tailscale IP）。

## 5) 安装 OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
source ~/.bashrc
```

当提示 “How do you want to hatch your bot?” 时，选择 **“Do this later”**。

> 注意：如果你遇到 ARM 原生构建问题，请先安装系统包（例如 `sudo apt install -y build-essential`），再考虑使用 Homebrew。

## 6) 配置 Gateway（loopback + token auth）并启用 Tailscale Serve

默认使用 token auth。它更可预测，也避免了需要任何“insecure auth” Control UI 标志位。

```bash
# 将 Gateway 保持在 VM 内部私有
openclaw config set gateway.bind loopback

# 为 Gateway + Control UI 要求认证
openclaw config set gateway.auth.mode token
openclaw doctor --generate-gateway-token

# 通过 Tailscale Serve 暴露（HTTPS + tailnet 访问）
openclaw config set gateway.tailscale.mode serve
openclaw config set gateway.trustedProxies '["127.0.0.1"]'

systemctl --user restart openclaw-gateway.service
```

这里的 `gateway.trustedProxies=["127.0.0.1"]` 仅用于本地 Tailscale Serve 代理的转发 IP / 本地客户端处理。它**不是** `gateway.auth.mode: "trusted-proxy"`。在此设置下，Diff viewer 路由保持 fail-closed 行为：没有转发代理头的原始 `127.0.0.1` viewer 请求可能会返回 `Diff not found`。若要处理附件，请使用 `mode=file` / `mode=both`，或者如果你需要可共享的 viewer 链接，则有意启用远程 viewer，并设置 `plugins.entries.diffs.config.viewerBaseUrl`（或传入代理 `baseUrl`）。

## 7) 验证

```bash
# 检查版本
openclaw --version

# 检查守护进程状态
systemctl --user status openclaw-gateway.service

# 检查 Tailscale Serve
tailscale serve status

# 测试本地响应
curl http://localhost:18789
```

## 8) 锁定 VCN 安全组

现在一切都已正常工作，接下来锁定 VCN，阻止除 Tailscale 之外的所有流量。OCI 的 Virtual Cloud Network 作为网络边缘的防火墙——流量会在到达实例之前被阻止。

1. 在 OCI Console 中进入 **Networking → Virtual Cloud Networks**
2. 点击你的 VCN → **Security Lists** → Default Security List
3. **移除**除以下内容外的所有入站规则：
   - `0.0.0.0/0 UDP 41641`（Tailscale）
4. 保留默认出站规则（允许所有出站）

这会在网络边缘阻止 22 端口的 SSH、HTTP、HTTPS 以及其他所有流量。从现在开始，你只能通过 Tailscale 连接。

---

## 访问 Control UI

在你的 Tailscale 网络中的任意设备上访问：

```
https://openclaw.<tailnet-name>.ts.net/
```

将 `<tailnet-name>` 替换为你的 tailnet 名称（可在 `tailscale status` 中查看）。

无需 SSH 隧道。Tailscale 提供：

- HTTPS 加密（自动证书）
- 通过 Tailscale 身份进行认证
- 可从你 tailnet 中的任何设备访问（笔记本、手机等）

---

## 安全性：VCN + Tailscale（推荐基线）

在 VCN 已锁定（仅开放 UDP 41641）且 Gateway 绑定到 loopback 的情况下，你将获得强大的纵深防御：公共流量在网络边缘被阻止，管理访问则通过你的 tailnet 完成。

这种设置通常会消除单纯为了阻止全网 SSH 暴力破解而额外配置主机防火墙规则的_必要性_——但你仍然应该保持系统更新，运行 `openclaw security audit`，并确认自己没有意外监听公共接口。

### 已经受到保护的内容

| 传统步骤           | 需要吗？ | 原因                                                                         |
| ------------------ | -------- | ---------------------------------------------------------------------------- |
| UFW 防火墙         | 否       | VCN 会在流量到达实例前拦截                                                  |
| fail2ban           | 否       | 如果 22 端口在 VCN 被阻止，就没有暴力破解                                    |
| sshd 加固          | 否       | Tailscale SSH 不使用 sshd                                                   |
| 禁用 root 登录     | 否       | Tailscale 使用 Tailscale 身份，而不是系统用户                                |
| 仅使用 SSH 密钥认证 | 否       | Tailscale 通过你的 tailnet 进行认证                                         |
| IPv6 加固          | 通常不需要 | 取决于你的 VCN / 子网设置；请确认实际分配/暴露了什么                           |

### 仍然推荐

- **凭据权限：** `chmod 700 ~/.openclaw`
- **安全审计：** `openclaw security audit`
- **系统更新：** 定期执行 `sudo apt update && sudo apt upgrade`
- **监控 Tailscale：** 在 [Tailscale 管理控制台](https://login.tailscale.com/admin) 检查设备

### 验证安全状态

```bash
# 确认没有公开监听的端口
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# 验证 Tailscale SSH 已启用
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH active"

# 可选：完全禁用 sshd
sudo systemctl disable --now ssh
```

---

## 备用方案：SSH 隧道

如果 Tailscale Serve 无法工作，请使用 SSH 隧道：

```bash
# 从你的本地机器（通过 Tailscale）
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然后打开 `http://localhost:18789`。

---

## 故障排查

### 实例创建失败（“Out of capacity”）

免费套餐 ARM 实例很受欢迎。请尝试：

- 不同的可用域
- 在非高峰时段重试（清晨）
- 选择形状时使用 “Always Free” 过滤器

### Tailscale 无法连接

```bash
# 检查状态
sudo tailscale status

# 重新认证
sudo tailscale up --ssh --hostname=openclaw --reset
```

### Gateway 无法启动

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl --user -u openclaw-gateway.service -n 50
```

### 无法访问 Control UI

```bash
# 验证 Tailscale Serve 正在运行
tailscale serve status

# 检查 gateway 是否在监听
curl http://localhost:18789

# 如有需要，重启
systemctl --user restart openclaw-gateway.service
```

### ARM 二进制问题

某些工具可能没有 ARM 构建版本。检查：

```bash
uname -m  # 应显示 aarch64
```

大多数 npm 包都能正常工作。对于二进制文件，请寻找 `linux-arm64` 或 `aarch64` 版本。

---

## 持久化

所有状态都保存在：

- `~/.openclaw/` — `openclaw.json`、每个 agent 的 `auth-profiles.json`、channel/provider 状态以及会话数据
- `~/.openclaw/workspace/` — 工作区（SOUL.md、memory、artifacts）

定期备份：

```bash
openclaw backup create
```

---

## 相关内容

- [Gateway 远程访问](/gateway/remote) — 其他远程访问模式
- [Tailscale 集成](/gateway/tailscale) — 完整的 Tailscale 文档
- [Gateway 配置](/gateway/configuration) — 所有配置选项
- [DigitalOcean 指南](/platforms/digitalocean) — 如果你想要付费且更容易注册
- [Hetzner 指南](/install/hetzner) — 基于 Docker 的替代方案
