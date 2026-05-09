---
summary: "在廉价的 Hetzner VPS（Docker）上 24/7 运行 OpenClaw Gateway，具备持久状态和内置二进制文件"
read_when:
  - 你希望 OpenClaw 在云 VPS 上 24/7 运行（而不是在你的笔记本上）
  - 你希望在自己的 VPS 上运行一个生产级、始终在线的 Gateway
  - 你希望对持久化、二进制文件和重启行为拥有完全控制权
  - 你正在 Hetzner 或类似提供商的 Docker 中运行 OpenClaw
title: "Hetzner"
---

## 目标

使用 Docker 在 Hetzner VPS 上运行一个持久化的 OpenClaw Gateway，具备持久状态、内置二进制文件和安全的重启行为。

如果你想要“花大约 5 美元实现 OpenClaw 24/7”，这是最简单可靠的方案。  
Hetzner 的定价会变化；请选择最小的 Debian/Ubuntu VPS，如果遇到 OOM 再升级。

安全模型提醒：

- 当所有人都处于同一信任边界内且运行时仅用于业务时，共享公司的 agent 是可以的。
- 保持严格隔离：专用 VPS/运行时 + 专用账户；该主机上不要有个人的 Apple/Google/浏览器/密码管理器配置文件。
- 如果用户彼此具有对抗性，请按 gateway/host/OS 用户进行拆分。

参见 [安全性](/gateway/security) 和 [VPS 托管](/vps)。

## 我们在做什么（简单来说）？

- 租用一台小型 Linux 服务器（Hetzner VPS）
- 安装 Docker（隔离的应用运行时）
- 在 Docker 中启动 OpenClaw Gateway
- 将主机上的 `~/.openclaw` + `~/.openclaw/workspace` 持久化（重启/重建后仍保留）
- 通过 SSH 隧道在你的笔记本上访问 Control UI

挂载的 `~/.openclaw` 状态包括 `openclaw.json`、按 agent 区分的
`agents/<agentId>/agent/auth-profiles.json` 以及 `.env`。

Gateway 可通过以下方式访问：

- 从你的笔记本进行 SSH 端口转发
- 如果你自己管理防火墙和令牌，也可以直接暴露端口

本指南假设你在 Hetzner 上使用 Ubuntu 或 Debian。  
如果你使用的是其他 Linux VPS，请相应映射软件包。
有关通用 Docker 流程，请参见 [Docker](/install/docker)。

---

## 快速路径（有经验的操作者）

1. 创建 Hetzner VPS
2. 安装 Docker
3. 克隆 OpenClaw 仓库
4. 创建持久化的主机目录
5. 配置 `.env` 和 `docker-compose.yml`
6. 将所需二进制文件烘焙进镜像
7. `docker compose up -d`
8. 验证持久化和 Gateway 访问

---

## 你需要准备什么

- 具有 root 访问权限的 Hetzner VPS
- 从你的笔记本进行 SSH 访问
- 对 SSH + 复制/粘贴的基本熟悉
- ~20 分钟
- Docker 和 Docker Compose
- 模型认证凭据
- 可选的提供商凭据
  - WhatsApp QR
  - Telegram bot token
  - Gmail OAuth

---

<Steps>
  <Step title="创建 VPS">
    在 Hetzner 中创建一台 Ubuntu 或 Debian VPS。

    以 root 身份连接：

    ```bash
    ssh root@YOUR_VPS_IP
    ```

    本指南假定该 VPS 是有状态的。
    不要把它当作一次性基础设施。

  </Step>

  <Step title="安装 Docker（在 VPS 上）">
    ```bash
    apt-get update
    apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sh
    ```

    验证：

    ```bash
    docker --version
    docker compose version
    ```

  </Step>

  <Step title="克隆 OpenClaw 仓库">
    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    ```

    本指南假定你将构建自定义镜像，以保证二进制文件的持久化。

  </Step>

  <Step title="创建持久化的主机目录">
    Docker 容器是短暂的。
    所有长期状态都必须保留在主机上。

    ```bash
    mkdir -p /root/.openclaw/workspace

    # 将所有权设置为容器用户（uid 1000）：
    chown -R 1000:1000 /root/.openclaw
    ```

  </Step>

  <Step title="配置环境变量">
    在仓库根目录创建 `.env`。

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

    当你希望通过 `.env` 来管理稳定的 gateway
    token 时，请设置 `OPENCLAW_GATEWAY_TOKEN`；否则，在依赖跨重启的客户端之前，
    请先配置 `gateway.auth.token`。如果两者都不存在，OpenClaw 会为该次启动使用
    仅运行时有效的 token。生成一个 keyring 密码并将其粘贴到
    `GOG_KEYRING_PASSWORD`：

    ```bash
    openssl rand -hex 32
    ```

    **不要提交此文件。**

    这个 `.env` 文件用于容器/运行时环境变量，例如 `OPENCLAW_GATEWAY_TOKEN`。
    存储的提供商 OAuth/API key 认证信息保存在挂载的
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中。

  </Step>

  <Step title="Docker Compose 配置">
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
          # 推荐：在 VPS 上将 Gateway 仅绑定到回环地址；通过 SSH 隧道访问。
          # 如果要公开暴露，请移除 `127.0.0.1:` 前缀并相应配置防火墙。
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

    `--allow-unconfigured` 仅用于引导阶段的便利，它不能替代正确的 gateway 配置。仍然要设置认证（`gateway.auth.token` 或密码）并为你的部署使用安全的绑定设置。

  </Step>

  <Step title="共享 Docker VM 运行时步骤">
    对于通用 Docker 主机流程，请使用共享运行时指南：

    - [将所需二进制文件烘焙进镜像](/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [构建并启动](/install/docker-vm-runtime#build-and-launch)
    - [哪些内容持久化在哪里](/install/docker-vm-runtime#what-persists-where)
    - [更新](/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Hetzner 特定访问">
    在完成共享的构建和启动步骤后，完成以下设置以打开隧道：

    **前提条件：** 确保你的 VPS sshd 配置允许 TCP 转发。如果你
    已经强化了 SSH 配置，请检查 `/etc/ssh/sshd_config` 并设置：

    ```
    AllowTcpForwarding local
    ```

    `local` 允许从你的笔记本使用 `ssh -L` 本地转发，同时阻止
    来自服务器的远程转发。将其设置为 `no` 会导致隧道失败，
    报错如下：
    `channel 3: open failed: administratively prohibited: open failed`

    确认已启用 TCP 转发后，重启 SSH 服务
    （`systemctl restart ssh`），并在你的笔记本上运行隧道：

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
    ```

    打开：

    `http://127.0.0.1:18789/`

    粘贴已配置的共享密钥。本指南默认使用 gateway token；如果你改用了密码认证，则改用该密码。

  </Step>
</Steps>

共享持久化映射位于 [Docker VM Runtime](/install/docker-vm-runtime#what-persists-where)。

## 基础设施即代码（Terraform）

对于偏好基础设施即代码工作流的团队，社区维护的 Terraform 方案提供了：

- 带远程状态管理的模块化 Terraform 配置
- 通过 cloud-init 自动化创建
- 部署脚本（bootstrap、deploy、backup/restore）
- 安全加固（防火墙、UFW、仅 SSH 访问）
- 用于 gateway 访问的 SSH 隧道配置

**仓库：**

- 基础设施：[openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Docker 配置：[openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

这种方式在上面的 Docker 设置基础上，补充了可复现部署、版本控制的基础设施和自动化灾难恢复。

<Note>
由社区维护。如有问题或贡献，请参见上面的仓库链接。
</Note>

## 下一步

- 设置消息通道：[Channels](/channels)
- 配置 Gateway：[Gateway configuration](/gateway/configuration)
- 保持 OpenClaw 最新：[Updating](/install/updating)

## 相关内容

- [安装概览](/install)
- [Fly.io](/install/fly)
- [Docker](/install/docker)
- [VPS 托管](/vps)
