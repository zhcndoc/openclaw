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

That mounted `~/.openclaw` state includes `openclaw.json`, per-agent
`agents/<agentId>/agent/auth-profiles.json`, and `.env`.

该挂载的 `~/.openclaw` 状态包括 `openclaw.json`、每个代理对应的
`agents/<agentId>/agent/auth-profiles.json`，以及 `.env`。

The Gateway can be accessed via:

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
    在 Hetzner 创建一个 Ubuntu 或 Debian 的 VPS。

    以 root 身份连接：

    ```bash
    ssh root@YOUR_VPS_IP
    ```

    本指南假设 VPS 是有状态的。
    不要将其视为可丢弃的基础设施。

  </Step>

  <Step title="Install Docker (on the VPS)">
    ```bash
    apt-get update
    apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sh
    ```

    验证安装：

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

    本指南假设你将构建自定义镜像以保证二进制文件的持久化。

  </Step>

  <Step title="Create persistent host directories">
    Docker 容器是短暂的。
    所有长期状态必须保留在主机上。

    ```bash
    mkdir -p /root/.openclaw/workspace

    # 将目录所有者设置为容器用户（uid 1000）：
    chown -R 1000:1000 /root/.openclaw
    ```

  </Step>

  <Step title="Configure environment variables">
    在仓库根目录创建 `.env` 文件。

    ```bash
    OPENCLAW_IMAGE=openclaw:latest
    OPENCLAW_GATEWAY_TOKEN=
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/root/.openclaw
    OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

    GOG_KEYRING_PASSWORD=
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    除非你明确希望通过 `.env` 管理，否则请留空 `OPENCLAW_GATEWAY_TOKEN`；OpenClaw 会在首次启动时向配置中写入一个随机的 Gateway 令牌。生成一个密钥环密码并将其粘贴到 `GOG_KEYRING_PASSWORD`：

    ```bash
    openssl rand -hex 32
    ```

    **不要提交此文件。**

    此 `.env` 文件用于容器/运行时环境变量，例如 `OPENCLAW_GATEWAY_TOKEN`。
    存储提供商 OAuth/API 密钥等认证信息的位置是挂载的
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`。

  </Step>

  <Step title="Docker Compose configuration">
    创建或更新 `docker-compose.yml`。

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
          # 推荐：将 Gateway 绑定在回环地址上；通过 SSH 隧道访问。
          # 若要公开暴露端口，请删除 `127.0.0.1:` 前缀并相应配置防火墙。
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

    `--allow-unconfigured` 仅用于引导阶段的便利，它不能替代正确的网关配置。请务必设置认证（`gateway.auth.token` 或密码），并根据部署情况使用安全的绑定设置。

  </Step>

  <Step title="Shared Docker VM runtime steps">
    使用共享运行时指南处理通用 Docker 主机流程：

    - [将所需二进制文件烘焙进镜像](/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [构建并启动](/install/docker-vm-runtime#build-and-launch)
    - [数据持久化位置说明](/install/docker-vm-runtime#what-persists-where)
    - [更新指南](/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Hetzner-specific access">
    完成共享构建和启动步骤后，从笔记本通过 SSH 建立隧道：

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
    ```

    打开：

    `http://127.0.0.1:18789/`

    粘贴已配置的共享密钥。默认使用 Gateway 令牌；如果切换到密码认证，请使用对应密码。

  </Step>
</Steps>

持久化映射位于 [Docker VM Runtime](/install/docker-vm-runtime#what-persists-where)。

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

> **注意：** 由社区维护。如有问题或贡献，请参见上方仓库链接。

## 下一步

- 设置消息通道：[Channels](/channels)
- 配置 Gateway：[Gateway configuration](/gateway/configuration)
- 保持 OpenClaw 更新：[Updating](/install/updating)

## 相关内容

- [安装概览](/install)
- [Fly.io](/install/fly)
- [Docker](/install/docker)
- [VPS 托管](/vps)
