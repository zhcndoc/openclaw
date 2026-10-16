---
summary: "自动化、强化的 OpenClaw 安装，带有 Ansible、Tailscale VPN 和防火墙隔离"
read_when:
  - "你希望通过自动化方式部署服务器并进行安全加固"
  - "你需要带有防火墙隔离和 VPN 访问的部署方案"
  - "你正在部署到远程 Debian/Ubuntu 服务器"
title: "安西布尔"
---

使用 **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** 将 OpenClaw 部署到生产服务器，这是一个采用安全优先架构的自动化安装程序。

<Info>
[openclaw-ansible](https://github.com/openclaw/openclaw-ansible) 仓库是 Ansible 部署的唯一可信来源。本页面仅作快速概览。
</Info>

## <a id="prerequisites"></a> 先决条件

| 要求 | 细节                                                   |
| ----------- | --------------------------------------------------------- |
| OS          | Debian 11+ or Ubuntu 20.04+                               |
| 使用权      | Root 或 sudo 权限                                   |
| 网络     | 用于安装软件包的互联网连接              |
| 安西布尔     | 2.14+（由快速入门脚本自动安装） |

## <a id="what-you-get"></a> 你将获得什么

- 防火墙优先的安全性：UFW + Docker 隔离（仅可通过 SSH + Tailscale 访问）
- 用于远程访问的 Tailscale VPN，无需公开暴露服务
- 使用 Docker 创建仅绑定到 localhost 的隔离沙箱容器
- 带有加固措施的 Systemd 集成，开机自动启动
- 一条命令完成设置

## <a id="quick-start"></a> 快速开始

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

## <a id="what-gets-installed"></a> 将安装什么

1. Tailscale（用于安全远程访问的网格 VPN）
2. UFW 防火墙（仅限 SSH + Tailscale 端口）
3. Docker CE + Compose V2（默认代理沙箱后端）
4. Node.js 和 pnpm（OpenClaw 需要 Node 24.16+ 或 26.1+；建议使用 Node 26）
5. OpenClaw，基于主机安装，非容器化
6. A systemd 安全加固服务

<Note>
网关直接运行在主机上，而不是在 Docker 中。Agent 沙箱化是可选的；本指南安装 Docker，因为它是默认的沙箱后端。有关其他后端，请参见 [Sandboxing](/gateway/sandboxing)。
</Note>

## <a id="post-install-setup"></a> 安装后设置

<Steps>
  <Step id="switch-to-the-openclaw-user" title="切换到openclaw用户">
    ```bash
    sudo -i -u openclaw
    ```
  </Step>
  <Step id="run-the-onboarding-wizard" title="运行入门向导">
    安装后脚本会引导你完成 OpenClaw 的配置。
  </Step>
  <Step id="connect-messaging-channels" title="连接消息传递渠道">
    登录 WhatsApp、Telegram、Discord 或 Signal：
    ```bash
    openclaw channels login --channel <name>
    ```
  </Step>
  <Step id="verify-the-installation" title="验证安装">
    ```bash
    sudo systemctl status openclaw
    sudo journalctl -u openclaw -f
    ```
  </Step>
  <Step id="connect-to-tailscale" title="连接到 Tailscale">
    加入你的 VPN mesh，以便安全远程访问。
  </Step>
</Steps>

### <a id="quick-commands"></a> 快速命令

```bash
# Check service status
sudo systemctl status openclaw

# View live logs
sudo journalctl -u openclaw -f

# Restart gateway (run as openclaw user)
openclaw gateway restart

# Channel login (run as openclaw user)
sudo -i -u openclaw
openclaw channels login --channel <name>
```

`openclaw gateway restart` 记录托管重启意图。对于系统范围的服务，请遵循其打印的确切 `sudo systemctl restart <unit>` 命令。

## <a id="security-architecture"></a> 安全架构

四层防御模型：

1. 防火墙（UFW）：仅对外开放 SSH（22）和 Tailscale（41641/udp）
2. VPN（Tailscale）：网关只能通过 VPN mesh 访问
3. Docker 隔离：`DOCKER-USER` iptables 链阻止外部端口暴露
4. 系统加固：`NoNewPrivileges`、`PrivateTmp`、非特权用户

检查哪些端口可公开访问：

```bash
nmap -p- YOUR_SERVER_IP
```

只有 22 端口（SSH）应该是开放的。网关和 Docker 都应保持锁定。

Docker 是为了代理沙箱（隔离工具执行）而安装的，而不是为了运行网关。请参阅[多代理沙箱和工具](/tools/multi-agent-sandbox-tools)了解沙箱配置。

## <a id="manual-installation"></a> 手动安装

<Steps>
  <Step id="install-prerequisites" title="安装先决条件">
    ```bash
    sudo apt update && sudo apt install -y ansible git
    ```
  </Step>
  <Step id="clone-the-repository" title="克隆存储库">
    ```bash
    git clone https://github.com/openclaw/openclaw-ansible.git
    cd openclaw-ansible
    ```
  </Step>
  <Step id="install-ansible-collections" title="安装 Ansible 集合">
    ```bash
    ansible-galaxy collection install -r requirements.yml
    ```
  </Step>
  <Step id="run-the-playbook" title="运行剧本">
    ```bash
    ./run-playbook.sh
    ```

    或者直接运行 playbook，然后手动运行安装脚本：
    ```bash
    ansible-playbook playbook.yml --ask-become-pass
    # Then run: /tmp/openclaw-setup.sh
    ```

  </Step>
</Steps>

## <a id="updating"></a> 更新

Ansible 安装程序会为手动更新设置 OpenClaw；有关标准流程，请参阅[更新](/install/updating)。

要重新运行 playbook（例如，在配置更改之后）：

```bash
cd openclaw-ansible
./run-playbook.sh
```

您可以多次运行此命令，而不会重复其效果。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="firewall-blocks-my-connection" title="防火墙阻止我的连接">
    - 先通过 Tailscale VPN 连接；按设计，网关只能通过这种方式访问。
    - SSH（22 端口）始终允许。

  </Accordion>
  <Accordion id="service-will-not-start" title="服务将无法启动">
    ```bash
    # Check logs
    sudo journalctl -u openclaw -n 100

    # Verify permissions
    sudo ls -la /opt/openclaw

    # Test manual start
    sudo -i -u openclaw
    cd ~/openclaw
    openclaw gateway run
    ```

  </Accordion>
  <Accordion id="docker-sandbox-issues" title="Docker 沙箱问题">
    ```bash
    # Verify Docker is running
    sudo systemctl status docker

    # Check sandbox image
    sudo docker images | grep openclaw-sandbox

    # Build the sandbox image if missing (requires a source checkout)
    cd /opt/openclaw/openclaw
    sudo -u openclaw ./scripts/sandbox-setup.sh
    # For npm installs without a source checkout, see
    # https://docs.openclaw.ai/gateway/sandboxing#images-and-setup
    ```

  </Accordion>
  <Accordion id="channel-login-fails" title="频道登录失败">
    请确保你正在以 `openclaw` 用户身份运行：
    ```bash
    sudo -i -u openclaw
    openclaw channels login --channel <name>
    ```
  </Accordion>
</AccordionGroup>

## <a id="advanced-configuration"></a> 高级配置

有关详细的安全架构和故障排查，请参见 openclaw-ansible 仓库：

- [安全 Architecture](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [技术 Details](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [故障排除 Guide](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## <a id="related"></a> 相关内容

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible): 完整部署指南
- [Docker](/install/docker): 容器化网关设置
- [Sandboxing](/gateway/sandboxing): 代理沙盒配置
- [多代理沙箱和工具](/tools/multi-agent-sandbox-tools)：每个代理隔离
