---
summary: "使用 Ansible、Tailscale VPN 和防火墙隔离对 OpenClaw 进行自动化加固安装"
read_when:
  - 你希望通过自动化方式部署服务器并进行安全加固
  - 你需要带有防火墙隔离和 VPN 访问的部署方案
  - 你正在部署到远程 Debian/Ubuntu 服务器
title: "Ansible"
---

# Ansible 安装

使用 **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** 将 OpenClaw 部署到生产服务器——这是一个以安全优先架构为核心的自动化安装器。

<Info>
[openclaw-ansible](https://github.com/openclaw/openclaw-ansible) 仓库是 Ansible 部署的唯一可信来源。本页面仅作快速概览。
</Info>

## 前置条件

| 要求 | 详情                                                      |
| ---- | --------------------------------------------------------- |
| **操作系统** | Debian 11+ 或 Ubuntu 20.04+                               |
| **访问权限** | Root 或 sudo 权限                                         |
| **网络** | 用于安装软件包的互联网连接                                 |
| **Ansible** | 2.14+（由快速开始脚本自动安装）                            |

## 你将获得什么

- **防火墙优先的安全性** -- UFW + Docker 隔离（仅 SSH + Tailscale 可访问）
- **Tailscale VPN** -- 无需公开暴露服务即可安全远程访问
- **Docker** -- 隔离的沙盒容器，仅绑定到 localhost
- **纵深防御** -- 4 层安全架构
- **Systemd 集成** -- 开机自动启动并进行加固
- **一条命令完成设置** -- 几分钟内完成部署

## 快速开始

一条命令安装：

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

## 将安装什么

Ansible playbook 会安装并配置：

1. **Tailscale** -- 用于安全远程访问的 mesh VPN
2. **UFW 防火墙** -- 仅开放 SSH + Tailscale 端口
3. **Docker CE + Compose V2** -- 用于默认的 agent 沙盒后端
4. **Node.js 24 + pnpm** -- 运行时依赖（Node 22 LTS，当前 `22.14+`，仍受支持）
5. **OpenClaw** -- 基于主机运行，而非容器化
6. **Systemd 服务** -- 带安全加固的自动启动

<Note>
网关直接运行在主机上（不在 Docker 中）。Agent 沙盒化是可选的；此 playbook 安装 Docker 是因为它是默认的沙盒后端。有关详细信息和其他后端，请参见 [Sandboxing](/gateway/sandboxing)。
</Note>

## 安装后设置

<Steps>
  <Step title="切换到 openclaw 用户">
    ```bash
    sudo -i -u openclaw
    ```
  </Step>
  <Step title="运行入门向导">
    安装后脚本会引导你配置 OpenClaw 设置。
  </Step>
  <Step title="连接消息服务提供商">
    登录 WhatsApp、Telegram、Discord 或 Signal：
    ```bash
    openclaw channels login
    ```
  </Step>
  <Step title="验证安装">
    ```bash
    sudo systemctl status openclaw
    sudo journalctl -u openclaw -f
    ```
  </Step>
  <Step title="连接到 Tailscale">
    加入你的 VPN mesh，以便安全远程访问。
  </Step>
</Steps>

### 快速命令

```bash
# 检查服务状态
sudo systemctl status openclaw

# 查看实时日志
sudo journalctl -u openclaw -f

# 重启网关
sudo systemctl restart openclaw

# 提供商登录（以 openclaw 用户运行）
sudo -i -u openclaw
openclaw channels login
```

## 安全架构

该部署采用 4 层防御模型：

1. **防火墙（UFW）** -- 仅对外公开 SSH（22）+ Tailscale（41641/udp）
2. **VPN（Tailscale）** -- 网关仅可通过 VPN mesh 访问
3. **Docker 隔离** -- DOCKER-USER iptables 链可防止外部端口暴露
4. **Systemd 加固** -- NoNewPrivileges、PrivateTmp、非特权用户

要验证你的外部攻击面：

```bash
nmap -p- YOUR_SERVER_IP
```

应当只开放 22 端口（SSH）。所有其他服务（网关、Docker）都已锁定。

Docker 安装是为了 agent 沙盒（隔离的工具执行），而不是为了运行网关本身。有关沙盒配置，请参见 [Multi-Agent Sandbox and Tools](/tools/multi-agent-sandbox-tools)。

## 手动安装

如果你更希望手动控制自动化过程：

<Steps>
  <Step title="安装前置依赖">
    ```bash
    sudo apt update && sudo apt install -y ansible git
    ```
  </Step>
  <Step title="克隆仓库">
    ```bash
    git clone https://github.com/openclaw/openclaw-ansible.git
    cd openclaw-ansible
    ```
  </Step>
  <Step title="安装 Ansible collections">
    ```bash
    ansible-galaxy collection install -r requirements.yml
    ```
  </Step>
  <Step title="运行 playbook">
    ```bash
    ./run-playbook.sh
    ```

    或者，也可以直接运行，然后在之后手动执行设置脚本：
    ```bash
    ansible-playbook playbook.yml --ask-become-pass
    # 然后运行：/tmp/openclaw-setup.sh
    ```

  </Step>
</Steps>

## 更新

Ansible 安装器会将 OpenClaw 设置为手动更新。有关标准更新流程，请参见 [Updating](/install/updating)。

要重新运行 Ansible playbook（例如进行配置更改）：

```bash
cd openclaw-ansible
./run-playbook.sh
```

这具有幂等性，可以安全地多次运行。

## 故障排查

<AccordionGroup>
  <Accordion title="防火墙阻止了我的连接">
    - 确保你可以先通过 Tailscale VPN 访问
    - SSH 访问（端口 22）始终允许
    - 按设计，网关只能通过 Tailscale 访问

  </Accordion>
  <Accordion title="服务无法启动">
    ```bash
    # 检查日志
    sudo journalctl -u openclaw -n 100

    # 验证权限
    sudo ls -la /opt/openclaw

    # 测试手动启动
    sudo -i -u openclaw
    cd ~/openclaw
    openclaw gateway run
    ```

  </Accordion>
  <Accordion title="Docker 沙盒问题">
    ```bash
    # 验证 Docker 是否正在运行
    sudo systemctl status docker

    # 检查沙盒镜像
    sudo docker images | grep openclaw-sandbox

    # 如果缺失则构建沙盒镜像
    cd /opt/openclaw/openclaw
    sudo -u openclaw ./scripts/sandbox-setup.sh
    ```

  </Accordion>
  <Accordion title="提供商登录失败">
    请确保你是以 `openclaw` 用户身份运行：
    ```bash
    sudo -i -u openclaw
    openclaw channels login
    ```
  </Accordion>
</AccordionGroup>

## 高级配置

有关详细的安全架构和故障排查，请参见 openclaw-ansible 仓库：

- [安全架构](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [技术细节](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [故障排查指南](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## 相关内容

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) -- 完整部署指南
- [Docker](/install/docker) -- 容器化网关设置
- [Sandboxing](/gateway/sandboxing) -- agent 沙盒配置
- [Multi-Agent Sandbox and Tools](/tools/multi-agent-sandbox-tools) -- 每个 agent 的隔离
