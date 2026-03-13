---
summary: "使用 Ansible、Tailscale VPN 和防火墙隔离实现自动化、强化的 OpenClaw 安装"
read_when:
  - 您希望实现自动化服务器部署并加强安全性
  - 您需要通过防火墙隔离设置并通过 VPN 访问
  - 您正在部署到远程的 Debian/Ubuntu 服务器
title: "Ansible"
---

# Ansible 安装

部署 OpenClaw 到生产服务器的推荐方式是通过 **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** —— 一个以安全为核心架构的自动安装工具。

## 快速开始

一条命令安装：

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

> **📦 完整指南：[github.com/openclaw/openclaw-ansible](https://github.com/openclaw/openclaw-ansible)**
>
> openclaw-ansible 仓库是 Ansible 部署的权威来源。本页为快速概览。

## 你将获得

- 🔒 **防火墙优先的安全策略**：UFW + Docker 隔离（仅允许 SSH + Tailscale 访问）
- 🔐 **Tailscale VPN**：安全的远程访问，无需公开暴露服务
- 🐳 **Docker**：隔离的沙箱容器，仅绑定本地主机
- 🛡️ **纵深防御**：四层安全架构
- 🚀 **一键安装**：几分钟完成全部部署
- 🔧 **Systemd 集成**：启动时自动启动并强化安全

## 要求

- **操作系统**：Debian 11 及以上或 Ubuntu 20.04 及以上
- **权限**：root 或 sudo 权限
- **网络**：必须可以连接互联网以安装软件包
- **Ansible**：2.14 及以上（快速开始脚本会自动安装）

## 安装内容

Ansible 剧本将安装并配置：

1. **Tailscale**（用于安全远程访问的 Mesh VPN）  
2. **UFW 防火墙**（仅开放 SSH + Tailscale 端口）  
3. **Docker CE + Compose V2**（用于代理沙箱环境）  
4. **Node.js 24 + pnpm**（运行时依赖；Node 22 版本为长期支持，目前为 `22.16+`，仍保持兼容性支持）  
5. **OpenClaw**（以主机方式运行，非容器化）  
6. **Systemd 服务**（启动时自动运行并强化安全）  

注意：网关直接运行在主机上（非 Docker 容器），但代理沙箱使用 Docker 进行隔离。详见 [沙箱机制](/gateway/sandboxing)。

## 安装后配置

安装完成后，切换到 openclaw 用户：

```bash
sudo -i -u openclaw
```

安装后脚本会引导你完成：

1. **入门向导**：配置 OpenClaw 设置
2. **提供商登录**：连接 WhatsApp/Telegram/Discord/Signal
3. **网关测试**：验证安装是否成功
4. **Tailscale 设置**：加入你的 VPN 网状网络

### 常用命令

```bash
# 查看服务状态
sudo systemctl status openclaw

# 实时查看日志
sudo journalctl -u openclaw -f

# 重启网关
sudo systemctl restart openclaw

# 提供商登录（以 openclaw 用户运行）
sudo -i -u openclaw
openclaw channels login
```

## 安全架构

### 四层防护

1. **防火墙（UFW）**：仅公开 SSH (22) 和 Tailscale (41641/udp) 端口
2. **VPN（Tailscale）**：网关仅通过 VPN 网状网络访问
3. **Docker 隔离**：DOCKER-USER iptables 链阻止外部端口暴露
4. **Systemd 加固**：NoNewPrivileges、PrivateTmp、非特权用户

### 验证

测试外部攻击面：

```bash
nmap -p- YOUR_SERVER_IP
```

应该只显示 **端口 22**（SSH）开放，其他所有服务（网关、Docker 等）均已锁定。

### Docker 使用说明

Docker 是为 **代理沙箱**（隔离工具执行）安装，而非运行网关本身。网关仅绑定本地主机，通过 Tailscale VPN 访问。

详见 [多代理沙箱 & 工具](/tools/multi-agent-sandbox-tools) 了解沙箱配置。

## 手动安装

如果你更倾向于手动掌控自动化过程：

```bash
# 1. 安装前置依赖
sudo apt update && sudo apt install -y ansible git

# 2. 克隆仓库
git clone https://github.com/openclaw/openclaw-ansible.git
cd openclaw-ansible

# 3. 安装 Ansible 组件集
ansible-galaxy collection install -r requirements.yml

# 4. 运行剧本
./run-playbook.sh

# 或直接运行（然后手动执行 /tmp/openclaw-setup.sh）
# ansible-playbook playbook.yml --ask-become-pass
```

## 更新 OpenClaw

Ansible 安装器设置了手动更新流程。标准更新操作详见 [更新指南](/install/updating)。

若需要重新运行 Ansible 剧本（例如更改配置）：

```bash
cd openclaw-ansible
./run-playbook.sh
```

注意：该操作是幂等的，可安全多次执行。

## 故障排查

### 防火墙阻断连接

如果无法访问：

- 确保先可以通过 Tailscale VPN 访问
- SSH 端口（22）始终允许访问
- 设计上网关 **仅通过 Tailscale 可访问**

### 服务无法启动

```bash
# 查看日志
sudo journalctl -u openclaw -n 100

# 验证权限
sudo ls -la /opt/openclaw

# 测试手动启动
sudo -i -u openclaw
cd ~/openclaw
pnpm start
```

### Docker 沙箱问题

```bash
# 查看 Docker 状态
sudo systemctl status docker

# 检查沙箱镜像
sudo docker images | grep openclaw-sandbox

# 缺失则构建沙箱镜像
cd /opt/openclaw/openclaw
sudo -u openclaw ./scripts/sandbox-setup.sh
```

### 提供商登录失败

确保以 `openclaw` 用户身份运行：

```bash
sudo -i -u openclaw
openclaw channels login
```

## 高级配置

详尽的安全架构与故障排查：

- [安全架构](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [技术细节](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [故障排查指南](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## 相关资源

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) — 全部署指南
- [Docker](/install/docker) — 容器化网关设置
- [沙箱机制](/gateway/sandboxing) — 代理沙箱配置
- [多代理沙箱与工具](/tools/multi-agent-sandbox-tools) — 每代理隔离配置
