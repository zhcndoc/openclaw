---
summary: "使用 Ansible、Tailscale VPN 和防火墙隔离实现自动化、强化的 OpenClaw 安装"
read_when:
  - 您希望实现自动化服务器部署并加强安全性
  - 您需要通过防火墙隔离设置并通过 VPN 访问
  - 您正在部署到远程的 Debian/Ubuntu 服务器
title: "Ansible"
---

# Ansible 安装

使用 **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** 将 OpenClaw 部署到生产服务器——这是一个采用安全优先架构的自动化安装程序。

<Info>
[openclaw-ansible](https://github.com/openclaw/openclaw-ansible) 仓库是 Ansible 部署的权威来源。本页面是一个快速概览。
</Info>

## 系统要求

| 要求        | 详情                                                      |
| ----------- | --------------------------------------------------------- |
| **操作系统** | Debian 11+ 或 Ubuntu 20.04+                               |
| **访问权限** | root 或 sudo 权限                                         |
| **网络**    | 用于软件包安装的网络连接                                  |
| **Ansible** | 2.14+（由快速启动脚本自动安装）                           |

## 您将获得

- **防火墙优先的安全** -- UFW + Docker 隔离（仅 SSH + Tailscale 可访问）
- **Tailscale VPN** -- 安全的远程访问，无需将服务公开暴露
- **Docker** -- 隔离的沙盒容器，仅本地绑定
- **纵深防御** -- 四层安全架构
- **Systemd 集成** -- 开机自动启动并附带安全加固
- **单命令安装** -- 几分钟内完成部署

## 快速开始

一条命令安装：

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

## 将安装的内容

Ansible 剧本将安装并配置：

1. **Tailscale** -- 用于安全远程访问的 mesh VPN
2. **UFW firewall** -- 仅开放 SSH + Tailscale 端口
3. **Docker CE + Compose V2** -- 用于智能体沙盒
4. **Node.js 24 + pnpm** -- 运行时依赖（Node 22 LTS，目前 `22.14+` 仍受支持）
5. **OpenClaw** -- 基于主机运行，而非容器化
6. **Systemd service** -- 自动启动并进行安全加固

<Note>
网关在主机上直接运行（不在 Docker 中），但智能体沙盒使用 Docker 进行隔离。详情请参见 [沙盒](/gateway/sandboxing)。
</Note>

## 安装后配置

<Steps>
  <Step title="切换到 openclaw 用户">
    ```bash
    sudo -i -u openclaw
    ```
  </Step>
  <Step title="运行引导向导">
    安装后脚本会引导您配置 OpenClaw 设置。
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
    加入您的 VPN 网状网络以进行安全的远程访问。
  </Step>
</Steps>

### 快速命令

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

该部署使用四层防御模型：

1. **防火墙 (UFW)** -- 仅 SSH (22) + Tailscale (41641/udp) 对外公开暴露
2. **VPN (Tailscale)** -- 仅通过 VPN 网状网络可访问网关
3. **Docker 隔离** -- DOCKER-USER iptables 链阻止外部端口暴露
4. **Systemd 加固** -- NoNewPrivileges、PrivateTmp、非特权用户

要验证您的外部攻击面：

```bash
nmap -p- YOUR_SERVER_IP
```

应该只有 22 端口（SSH）是开放的。所有其他服务（网关、Docker）都被锁定。

Docker 是为智能体沙盒（隔离的工具执行）而安装的，不是为了运行网关本身。有关沙盒配置，请参见 [多智能体沙盒和工具](/tools/multi-agent-sandbox-tools)。

## 手动安装

如果您更倾向于手动掌控自动化过程：

<Steps>
  <Step title="安装前置条件">
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
  <Step title="安装 Ansible 集合">
    ```bash
    ansible-galaxy collection install -r requirements.yml
    ```
  </Step>
  <Step title="运行剧本">
    ```bash
    ./run-playbook.sh
    ```

    或者，直接运行然后手动执行设置脚本：
    ```bash
    ansible-playbook playbook.yml --ask-become-pass
    # 然后运行: /tmp/openclaw-setup.sh
    ```

  </Step>
</Steps>

## 更新

Ansible 安装器设置了手动更新流程。标准更新操作详见 [更新指南](/install/updating)。

要重新运行 Ansible 剧本（例如，用于配置更改）：

```bash
cd openclaw-ansible
./run-playbook.sh
```

这是幂等的，可以安全地多次运行。

## 故障排查

<AccordionGroup>
  <Accordion title="防火墙阻止了我的连接">
    - 首先确保您可以通过 Tailscale VPN 访问
    - SSH 访问（22 端口）始终被允许
    - 按照设计，网关仅可通过 Tailscale 访问
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
    确保您以 `openclaw` 用户身份运行：
    ```bash
    sudo -i -u openclaw
    openclaw channels login
    ```
  </Accordion>
</AccordionGroup>

## 高级配置

有关详细的安全架构和故障排查，请参阅 openclaw-ansible 仓库：

- [安全架构](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [技术细节](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [故障排查指南](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## 相关资源

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) -- 完整部署指南
- [Docker](/install/docker) -- 容器化网关设置
- [沙盒](/gateway/sandboxing) -- 智能体沙盒配置
- [多智能体沙盒和工具](/tools/multi-agent-sandbox-tools) -- 每个智能体的隔离
