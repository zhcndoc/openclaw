---
summary: "在 GCP Compute Engine 虚拟机（Docker）上全天候运行 OpenClaw Gateway，具备持久状态"
read_when:
  - 你想让 OpenClaw 在 GCP 上全天候运行
  - 你想在自己的虚拟机上部署生产级、始终在线的 Gateway
  - 你想完全控制持久化、二进制文件和重启行为
title: "GCP"
---

# 在 GCP Compute Engine（Docker，生产 VPS 指南）上运行 OpenClaw

## 目标

使用 Docker 在 GCP Compute Engine 虚拟机上运行持久化的 OpenClaw Gateway，支持持久状态、内置二进制文件和安全重启行为。

如果你想实现“大约 $5-12/月全天候运行 OpenClaw”，这是 Google Cloud 上一个可靠的部署方案。
价格会因机器类型和区域而异；选择满足工作负载的最小虚拟机，遇到内存不足（OOM）再进行升级。

## 我们在做什么（简单说明）

- 创建一个 GCP 项目并启用计费
- 创建一台 Compute Engine 虚拟机
- 安装 Docker（独立应用运行环境）
- 在 Docker 中启动 OpenClaw Gateway
- 在宿主机上持久化保存 `~/.openclaw` 和 `~/.openclaw/workspace`（重启和重建时不会丢失）
- 通过 SSH 隧道从你的笔记本访问控制界面

挂载的 `~/.openclaw` 状态包括 `openclaw.json`、按代理划分的
`agents/<agentId>/agent/auth-profiles.json` 以及 `.env`。

Gateway 可以通过以下方式访问：

- 从笔记本通过 SSH 端口转发访问
- 如果你自行控制防火墙和令牌，也可以直接暴露端口

本指南使用 GCP Compute Engine 上的 Debian。
Ubuntu 也可用，只需对应调整安装包。
有关通用 Docker 流程，参见 [Docker](/install/docker)。

---

## 快速路径（适合有经验的操作人员）

1. 创建 GCP 项目并启用 Compute Engine API
2. 创建 Compute Engine 虚拟机（e2-small，Debian 12，20GB）
3. SSH 连接到虚拟机
4. 安装 Docker
5. 克隆 OpenClaw 仓库
6. 创建持久化宿主目录
7. 配置 `.env` 和 `docker-compose.yml`
8. 烘焙所需二进制文件，构建镜像并启动服务

---

## 你需要的条件

- GCP 账户（e2-micro 免费等级可用）
- 安装好 gcloud 命令行工具（或者使用 Cloud Console）
- 可以从笔记本 SSH 访问虚拟机
- 熟悉 SSH 操作及复制粘贴
- 约需 20-30 分钟
- Docker 和 Docker Compose
- 模型认证凭据
- 可选的服务商凭据
  - WhatsApp 二维码
  - Telegram 机器人令牌
  - Gmail OAuth

---

<Steps>
  <Step title="安装 gcloud CLI（或使用控制台）">
    **选项 A：gcloud CLI**（推荐用于自动化）

    从 [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install) 安装

    初始化并认证：

    ```bash
    gcloud init
    gcloud auth login
    ```

    **选项 B：Cloud Console**

    所有步骤都可以通过网页界面在 [https://console.cloud.google.com](https://console.cloud.google.com) 中完成

  </Step>

  <Step title="创建 GCP 项目">
    **CLI：**

    ```bash
    gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
    gcloud config set project my-openclaw-project
    ```

    在 [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) 启用计费（Compute Engine 需要）。

    启用 Compute Engine API：

    ```bash
    gcloud services enable compute.googleapis.com
    ```

    **控制台：**

    1. 进入 IAM 与管理 > 创建项目
    2. 命名并创建
    3. 为该项目启用计费
    4. 导航到 API 与服务 > 启用 API > 搜索 "Compute Engine API" > 启用

  </Step>

  <Step title="创建虚拟机">
    **机器类型：**

    | 类型      | 配置                     | 费用                | 说明                                         |
    | --------- | ------------------------ | ------------------ | -------------------------------------------- |
    | e2-medium | 2 vCPU, 4GB RAM          | ~$25/月            | 本地 Docker 构建最可靠                        |
    | e2-small  | 2 vCPU, 2GB RAM          | ~$12/月            | 推荐用于 Docker 构建的最低配置               |
    | e2-micro  | 2 vCPU（共享），1GB RAM  | 可享免费层         | Docker 构建时经常因 OOM 失败（exit 137）     |

    **CLI：**

    ```bash
    gcloud compute instances create openclaw-gateway \
      --zone=us-central1-a \
      --machine-type=e2-small \
      --boot-disk-size=20GB \
      --image-family=debian-12 \
      --image-project=debian-cloud
    ```

    **控制台：**

    1. 进入 Compute Engine > VM instances > Create instance
    2. 名称：`openclaw-gateway`
    3. 区域：`us-central1`，可用区：`us-central1-a`
    4. 机器类型：`e2-small`
    5. 启动磁盘：Debian 12，20GB
    6. 创建

  </Step>

  <Step title="SSH 进入虚拟机">
    **CLI：**

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
    ```

    **控制台：**

    点击 Compute Engine 控制台中你的虚拟机旁边的 "SSH" 按钮。

    注意：虚拟机创建后，SSH 密钥传播可能需要 1-2 分钟。如果连接被拒绝，请等待后重试。

  </Step>

  <Step title="安装 Docker（在虚拟机上）">
    ```bash
    sudo apt-get update
    sudo apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    ```

    退出并重新登录，使组更改生效：

    ```bash
    exit
    ```

    然后重新 SSH 进入：

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
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

    本指南假设你将构建一个自定义镜像，以确保二进制文件持久化。

  </Step>

  <Step title="创建持久化宿主目录">
    Docker 容器是临时的。
    所有长期状态都必须保存在宿主机上。

    ```bash
    mkdir -p ~/.openclaw
    mkdir -p ~/.openclaw/workspace
    ```

  </Step>

  <Step title="配置环境变量">
    在仓库根目录创建 `.env`。

    ```bash
    OPENCLAW_IMAGE=openclaw:latest
    OPENCLAW_GATEWAY_TOKEN=
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/home/$USER/.openclaw
    OPENCLAW_WORKSPACE_DIR=/home/$USER/.openclaw/workspace

    GOG_KEYRING_PASSWORD=
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    除非你明确希望通过 `.env` 管理它，否则保持 `OPENCLAW_GATEWAY_TOKEN` 为空；OpenClaw 会在首次启动时将随机的 gateway token 写入配置。生成一个 keyring 密码并将其粘贴到 `GOG_KEYRING_PASSWORD` 中：

    ```bash
    openssl rand -hex 32
    ```

    **不要提交此文件。**

    这个 `.env` 文件用于容器/运行时环境，例如 `OPENCLAW_GATEWAY_TOKEN`。
    存储的提供商 OAuth/API key 认证信息位于挂载的
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
          # 推荐：将 Gateway 仅绑定到虚拟机回环地址；通过 SSH 隧道访问。
          # 若要公开暴露，请移除 `127.0.0.1:` 前缀并相应配置防火墙。
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

    `--allow-unconfigured` 仅用于引导阶段的便利，它不能替代正确的 gateway 配置。仍然要设置认证（`gateway.auth.token` 或密码），并为你的部署使用安全的绑定设置。

  </Step>

  <Step title="共享 Docker VM 运行时步骤">
    对于通用的 Docker 主机流程，请使用共享运行时指南：

    - [将所需二进制文件烘焙进镜像](/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [构建并启动](/install/docker-vm-runtime#build-and-launch)
    - [哪些内容会持久化到哪里](/install/docker-vm-runtime#what-persists-where)
    - [更新](/install/docker-vm-runtime#updates)

  </Step>

  <Step title="GCP 特定启动说明">
    在 GCP 上，如果在 `pnpm install --frozen-lockfile` 期间构建失败并出现 `Killed` 或 `exit code 137`，说明虚拟机内存不足。请至少使用 `e2-small`，或者使用 `e2-medium` 以获得更可靠的首次构建。

    当绑定到 LAN（`OPENCLAW_GATEWAY_BIND=lan`）时，在继续之前配置受信任的浏览器源：

    ```bash
    docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
    ```

    如果你更改了 gateway 端口，请将 `18789` 替换为你配置的端口。

  </Step>

  <Step title="从你的笔记本访问">
    创建一个 SSH 隧道以转发 Gateway 端口：

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
    ```

    在浏览器中打开：

    `http://127.0.0.1:18789/`

    重新打印一个干净的 dashboard 链接：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

    如果 UI 提示共享密钥认证，请将已配置的 token 或
    密码粘贴到 Control UI 设置中。此 Docker 流程默认会写入一个 token；如果你将容器配置切换为密码认证，请改用该
    密码。

    如果 Control UI 显示 `unauthorized` 或 `disconnected (1008): pairing required`，请批准浏览器设备：

    ```bash
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    还需要共享持久化和更新参考？
    参见 [Docker VM Runtime](/install/docker-vm-runtime#what-persists-where) 和 [Docker VM Runtime updates](/install/docker-vm-runtime#updates)。

  </Step>
</Steps>

---

## 故障排查

**SSH 连接被拒绝**

虚拟机创建后 SSH 密钥传播可能需要 1-2 分钟。请等待后重试。

**操作系统登录问题**

检查 OS 登录配置：

```bash
gcloud compute os-login describe-profile
```

确保你的账户具备相应 IAM 权限（Compute OS Login 或 Compute OS Admin Login）。

**内存不足（OOM）**

如果 Docker 构建失败并报 `Killed` 及 `exit code 137`，表示虚拟机因内存不足被杀死。升级到 `e2-small`（最低）或 `e2-medium`（更稳定）：

```bash
# 先停止虚拟机
gcloud compute instances stop openclaw-gateway --zone=us-central1-a

# 修改机器类型
gcloud compute instances set-machine-type openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small

# 启动虚拟机
gcloud compute instances start openclaw-gateway --zone=us-central1-a
```

---

## 服务账户（安全最佳实践）

个人使用默认用户账户即可。

自动化或 CI/CD 建议创建权限最小的专用服务账户：

1. 创建服务账户：

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw 部署"
   ```

2. 授予 Compute 实例管理员角色（或更窄的自定义角色）：

   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

避免自动化使用 Owner 角色，遵循最小权限原则。

详情请参见 [https://cloud.google.com/iam/docs/understanding-roles](https://cloud.google.com/iam/docs/understanding-roles)。

---

## 下一步

- 设置消息渠道：[Channels](/channels)
- 将本地设备配对为节点：[Nodes](/nodes)
- 配置网关：[Gateway configuration](/gateway/configuration)

## 相关内容

- [安装概览](/install)
- [Azure](/install/azure)
- [VPS 托管](/vps)
