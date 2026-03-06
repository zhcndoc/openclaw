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

## 1) 配置 VPS

在 Hetzner 创建一台 Ubuntu 或 Debian VPS。

以 root 用户连接：

```bash
ssh root@YOUR_VPS_IP
```

本指南假设 VPS 是有状态的。  
不要把它当作一次性基础设施。

---

## 2) 在 VPS 上安装 Docker

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

---

## 3) 克隆 OpenClaw 仓库

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

本指南假设你将构建自定义镜像以保证二进制文件持久性。

---

## 4) 创建持久化主机目录

Docker 容器是短暂的。  
所有持久状态必须保存在主机上。

```bash
mkdir -p /root/.openclaw/workspace

# 设置容器用户（uid 1000）为所有者：
chown -R 1000:1000 /root/.openclaw
```

---

## 5) 配置环境变量

在仓库根目录创建 `.env` 文件。

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

生成强密码：

```bash
openssl rand -hex 32
```

**请勿提交此文件。**

---

## 6) Docker Compose 配置

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
      # 建议：保持 Gateway 仅在 VPS 的回环接口监听，通过 SSH 隧道访问。
      # 若需公开暴露，删除 `127.0.0.1:` 前缀，并相应配置防火墙。
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

`--allow-unconfigured` 仅为启动便利，不是替代正确 Gateway 配置。仍需设置认证（`gateway.auth.token` 或密码）并为部署使用安全绑定设置。

---

## 7) 将所需二进制文件打包进镜像（关键）

在运行容器中安装二进制文件是陷阱。  
运行时安装的内容重启后会丢失。

所有技能所需的外部二进制都必须在镜像构建时安装。

下面示例只展示三个常用二进制：

- 用于 Gmail 访问的 `gog`
- 用于 Google Places 的 `goplaces`
- 用于 WhatsApp 的 `wacli`

仅为示例，不是完整列表。  
你可以用相同方式安装任意数量的二进制文件。

以后新增依赖额外二进制的技能须：

1. 更新 Dockerfile  
2. 重新构建镜像  
3. 重启容器

**示例 Dockerfile**

```dockerfile
FROM node:22-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# 示例二进制 1：Gmail CLI
RUN curl -L https://github.com/steipete/gog/releases/latest/download/gog_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/gog

# 示例二进制 2：Google Places CLI
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/goplaces

# 示例二进制 3：WhatsApp CLI
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/wacli

# 其他二进制请按此模式添加

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

---

## 8) 构建并启动

```bash
docker compose build
docker compose up -d openclaw-gateway
```

验证二进制：

```bash
docker compose exec openclaw-gateway which gog
docker compose exec openclaw-gateway which goplaces
docker compose exec openclaw-gateway which wacli
```

预期输出：

```
/usr/local/bin/gog
/usr/local/bin/goplaces
/usr/local/bin/wacli
```

---

## 9) 验证 Gateway

```bash
docker compose logs -f openclaw-gateway
```

成功示例：

```
[gateway] listening on ws://0.0.0.0:18789
```

从你的笔记本执行：

```bash
ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
```

打开浏览器访问：

`http://127.0.0.1:18789/`

粘贴你的 gateway 令牌。

---

## 各部分持久化位置（事实来源）

OpenClaw 在 Docker 中运行，但 Docker 不是事实来源。  
所有持久状态必须能在重启、重建和重启后保留。

| 组件                 | 位置                             | 持久化机制           | 备注                            |
| ------------------- | -------------------------------- | -------------------- | ------------------------------- |
| Gateway 配置         | `/home/node/.openclaw/`           | 主机卷挂载           | 包含 `openclaw.json`、令牌     |
| 模型认证配置         | `/home/node/.openclaw/`           | 主机卷挂载           | OAuth 令牌、API 密钥            |
| 技能配置             | `/home/node/.openclaw/skills/`    | 主机卷挂载           | 单技能级别状态                  |
| 代理工作空间         | `/home/node/.openclaw/workspace/` | 主机卷挂载           | 代码和代理产物                  |
| WhatsApp 会话        | `/home/node/.openclaw/`           | 主机卷挂载           | 保留二维码登录                  |
| Gmail 密钥环         | `/home/node/.openclaw/`           | 主机卷 + 密码        | 需 `GOG_KEYRING_PASSWORD`       |
| 外部二进制文件       | `/usr/local/bin/`                 | Docker 镜像          | 必须在构建时内置                |
| Node 运行时          | 容器文件系统                      | Docker 镜像          | 每次构建镜像时重建              |
| 操作系统包           | 容器文件系统                      | Docker 镜像          | 禁止运行时安装                  |
| Docker 容器          | 短暂                             | 可重启               | 可安全销毁                    |

---

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

> **注意：** 社区维护。如遇问题或需贡献，请参见上述仓库链接。
