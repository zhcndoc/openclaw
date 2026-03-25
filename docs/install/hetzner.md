---
summary: "在廉价 Hetzner VPS（Docker）上 24/7 运行 OpenClaw Gateway，实现持久状态和内置二进制文件"
read_when:
  - 你想要在云端 VPS（而不是笔记本电脑）上全天候运行 OpenClaw
  - 你想在自有 VPS 上部署生产级、始终在线的 Gateway
  - 你想对持久化、二进制文件和重启行为有完全控制
  - 你在 Hetzner 或类似供应商上使用 Docker 运行 OpenClaw
title: "Hetzner"
---

# 在 Hetzner 上运行 OpenClaw（Docker，生产 VPS 指南）

## 目标

使用 Docker 在 Hetzner VPS 上运行持久化的 OpenClaw Gateway，拥有持久状态、内置二进制文件和安全的重启行为。

如果你想要“以约 5 美元的价格全天候运行 OpenClaw”，这就是最简单且可靠的方案。  
Hetzner 价格会变动；选择最小的 Debian/Ubuntu VPS，内存不足时再升级。

安全模型提醒：

- 当大家处于同一信任边界且运行环境仅用于业务时，公司共享代理是可行的。
- 保持严格隔离：专用 VPS/运行环境 + 专用账户；不要在该主机上使用个人 Apple/Google/浏览器/密码管理器配置。
- 如果用户间存有对抗，按网关/主机/操作系统用户进行隔离。

详见 [安全](/gateway/security) 和 [VPS 托管](/vps)。

## 我们要做什么（简单说）？

- 租用一个小型 Linux 服务器（Hetzner VPS）
- 安装 Docker（隔离应用运行环境）
- 在 Docker 中启动 OpenClaw Gateway
- 将 `~/.openclaw` + `~/.openclaw/workspace` 持久化到主机（可在重启/重建后保留）
- 通过 SSH 隧道从你的笔记本访问控制界面

Gateway 可通过以下方式访问：

- 通过笔记本的 SSH 端口转发访问
- 如果你自行管理防火墙和令牌，也可直接暴露端口

本指南假设你在 Hetzner 上使用 Ubuntu 或 Debian。  
如果是其他 Linux VPS，请相应映射软件包。  
通用 Docker 流程参见 [Docker](/install/docker)。

---

## 快速通道（经验丰富的操作员）

1. 配置 Hetzner VPS  
2. 安装 Docker  
3. 克隆 OpenClaw 仓库  
4. 创建持久化主机目录  
5. 配置 `.env` 和 `docker-compose.yml`  
6. 将所需二进制文件打包进镜像  
7. `docker compose up -d` 启动  
8. 验证持久化和 Gateway 访问

---

## 所需条件

- 可 root 登录的 Hetzner VPS  
- 从笔记本能通过 SSH 访问  
- 基本 SSH 及复制粘贴能力  
- 大约 20 分钟时间  
- Docker 和 Docker Compose  
- 模型认证凭证  
- 可选提供者凭证  
  - WhatsApp 二维码  
  - Telegram 机器人令牌  
  - Gmail OAuth

---

<Steps>
  <Step title="Provision the VPS">
    Create an Ubuntu or Debian VPS in Hetzner.

    Connect as root:

    ```bash
    ssh root@YOUR_VPS_IP
    ```

    This guide assumes the VPS is stateful.
    Do not treat it as disposable infrastructure.

  </Step>

  <Step title="Install Docker (on the VPS)">
    ```bash
    apt-get update
    apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sh
    ```

    Verify:

    ```bash
    docker --version
    docker compose version
    ```

  </Step>

  <Step title="Clone the OpenClaw repository">
    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    ```

    This guide assumes you will build a custom image to guarantee binary persistence.

  </Step>

  <Step title="Create persistent host directories">
    Docker containers are ephemeral.
    All long-lived state must live on the host.

    ```bash
    mkdir -p /root/.openclaw/workspace

    # Set ownership to the container user (uid 1000):
    chown -R 1000:1000 /root/.openclaw
    ```

  </Step>

  <Step title="Configure environment variables">
    Create `.env` in the repository root.

    ```bash
    OPENCLAW_IMAGE=openclaw:latest
    OPENCLAW_GATEWAY_TOKEN=change-me-now
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/root/.openclaw
    OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

    GOG_KEYRING_PASSWORD=change-me-now
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    Generate strong secrets:

    ```bash
    openssl rand -hex 32
    ```

    **Do not commit this file.**

  </Step>

  <Step title="Docker Compose configuration">
    Create or update `docker-compose.yml`.

    ```yaml
    services:
      openclaw-gateway:
        image: ${OPENCLAW_IMAGE}
        build: .
        restart: unless-stopped
        env_file:
          - .env
        environment:
          - HOME=/home/node
          - NODE_ENV=production
          - TERM=xterm-256color
          - OPENCLAW_GATEWAY_BIND=${OPENCLAW_GATEWAY_BIND}
          - OPENCLAW_GATEWAY_PORT=${OPENCLAW_GATEWAY_PORT}
          - OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}
          - GOG_KEYRING_PASSWORD=${GOG_KEYRING_PASSWORD}
          - XDG_CONFIG_HOME=${XDG_CONFIG_HOME}
          - PATH=/home/linuxbrew/.linuxbrew/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
        volumes:
          - ${OPENCLAW_CONFIG_DIR}:/home/node/.openclaw
          - ${OPENCLAW_WORKSPACE_DIR}:/home/node/.openclaw/workspace
        ports:
          # Recommended: keep the Gateway loopback-only on the VPS; access via SSH tunnel.
          # To expose it publicly, remove the `127.0.0.1:` prefix and firewall accordingly.
          - "127.0.0.1:${OPENCLAW_GATEWAY_PORT}:18789"
        command:
          [
            "node",
            "dist/index.js",
            "gateway",
            "--bind",
            "${OPENCLAW_GATEWAY_BIND}",
            "--port",
            "${OPENCLAW_GATEWAY_PORT}",
            "--allow-unconfigured",
          ]
    ```

    `--allow-unconfigured` is only for bootstrap convenience, it is not a replacement for a proper gateway configuration. Still set auth (`gateway.auth.token` or password) and use safe bind settings for your deployment.

  </Step>

  <Step title="Shared Docker VM runtime steps">
    Use the shared runtime guide for the common Docker host flow:

    - [Bake required binaries into the image](/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [Build and launch](/install/docker-vm-runtime#build-and-launch)
    - [What persists where](/install/docker-vm-runtime#what-persists-where)
    - [Updates](/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Hetzner-specific access">
    After the shared build and launch steps, tunnel from your laptop:

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
    ```

    Open:

    `http://127.0.0.1:18789/`

    Paste your gateway token.

  </Step>
</Steps>

The shared persistence map lives in [Docker VM Runtime](/install/docker-vm-runtime#what-persists-where).

## 基础设施即代码（Terraform）

对于偏好基础设施即代码流程的团队，社区维护的 Terraform 配置提供：

- 模块化 Terraform 配置，支持远程状态管理  
- 基于 cloud-init 的自动化配置  
- 部署脚本（引导、部署、备份/恢复）  
- 安全加固（防火墙、UFW、仅限 SSH 访问）  
- Gateway 访问的 SSH 隧道配置

**代码仓库：**

- 基础设施配置：[openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)  
- Docker 配置：[openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

此方案作为上述 Docker 部署的补充，提供可复现部署、版本控制基础设施和自动灾难恢复。

> **Note:** Community-maintained. For issues or contributions, see the repository links above.

## Next steps

- Set up messaging channels: [Channels](/channels)
- Configure the Gateway: [Gateway configuration](/gateway/configuration)
- Keep OpenClaw up to date: [Updating](/install/updating)
