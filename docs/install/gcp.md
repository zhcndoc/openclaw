---
summary: "在 GCP Compute Engine VM（Docker）上 24/7 运行 OpenClaw Gateway，并持久保存状态"
read_when:
  - 你想让 OpenClaw 在 GCP 上 24/7 运行
  - 你想在自己的 VM 上运行一个生产级、始终在线的 Gateway
  - 你想完全控制持久化、二进制文件和重启行为
title: "GCP"
---

使用 Docker 在 GCP Compute Engine VM 上运行一个持久化的 OpenClaw Gateway，带有持久状态、内置二进制文件和安全的重启行为。

价格因机器类型和区域而异；请选择能满足你工作负载的最小 VM，如果遇到 OOM 再向上扩展。

Gateway 可以通过从你的笔记本电脑进行 SSH 端口转发访问，或者在你自行管理防火墙和 token 的情况下通过直接端口暴露访问。

本指南使用 GCP Compute Engine 上的 Debian。Ubuntu 也可以；请相应映射软件包。有关通用的 Docker 流程，请参见 [Docker](/install/docker)。

## 你需要准备什么

- GCP 账户（`e2-micro` 符合免费套餐资格）
- `gcloud` CLI，或 [Cloud Console](https://console.cloud.google.com)
- 从你的笔记本电脑进行 SSH 访问
- Docker 和 Docker Compose
- 模型认证凭据
- 可选的提供商凭据（WhatsApp QR、Telegram 机器人令牌、Gmail OAuth）
- 约 20-30 分钟

## 快速路径

1. 创建一个 GCP 项目，启用计费和 Compute Engine API
2. 创建一个 Compute Engine VM（`e2-small`、Debian 12、20GB）
3. SSH 连接到 VM，安装 Docker
4. 克隆 OpenClaw 仓库
5. 创建持久化主机目录
6. 配置 `.env` 和 `docker-compose.yml`
7. 烘焙所需二进制文件，构建并启动

<Steps>
  <Step title="安装 gcloud CLI（或使用控制台）">
    从 [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install) 安装，然后：

    ```bash
    gcloud init
    gcloud auth login
    ```

    或者直接通过 [Cloud Console](https://console.cloud.google.com) Web 界面完成下面的每一步。

  </Step>

  <Step title="创建一个 GCP 项目">
    ```bash
    gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
    gcloud config set project my-openclaw-project
    gcloud services enable compute.googleapis.com
    ```

    在 [console.cloud.google.com/billing](https://console.cloud.google.com/billing) 启用计费（Compute Engine 必需）。

    控制台等效操作：IAM & Admin > Create Project，启用计费，然后 APIs & Services > Enable APIs > "Compute Engine API" > Enable。

  </Step>

  <Step title="创建 VM">
    | 类型      | 配置                     | 费用               | 说明                                         |
    | --------- | ------------------------ | ------------------ | -------------------------------------------- |
    | e2-medium | 2 vCPU, 4GB RAM          | 约 $25/月          | 本地 Docker 构建最可靠                       |
    | e2-small  | 2 vCPU, 2GB RAM          | 约 $12/月          | Docker 构建最低推荐                         |
    | e2-micro  | 2 vCPU（共享），1GB RAM  | 可享免费额度       | 使用 Docker 构建时经常因 OOM 失败（exit 137） |

    ```bash
    gcloud compute instances create openclaw-gateway \
      --zone=us-central1-a \
      --machine-type=e2-small \
      --boot-disk-size=20GB \
      --image-family=debian-12 \
      --image-project=debian-cloud
    ```

  </Step>

  <Step title="SSH 进入 VM">
    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
    ```

    控制台：在 Compute Engine 仪表板中点击 VM 旁边的 "SSH"。

    VM 创建后，SSH 密钥传播可能需要 1-2 分钟；如果连接被拒绝，请等待后重试。

  </Step>

  <Step title="安装 Docker（在 VM 上）">
    ```bash
    sudo apt-get update
    sudo apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    ```

    退出并重新登录以使组变更生效，然后重新 SSH 进入：

    ```bash
    exit
    ```

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

    本指南会构建一个自定义镜像，因此你烘焙进去的任何二进制文件在重启后仍会保留。

  </Step>

  <Step title="创建持久化主机目录">
    Docker 容器是短暂的；所有长期状态都必须保存在主机上。

    ```bash
    mkdir -p ~/.openclaw
    mkdir -p ~/.openclaw/workspace
    ```

  </Step>

  <Step title="配置环境变量">
    在仓库根目录创建 `.env`：

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

    将 `OPENCLAW_GATEWAY_TOKEN` 设置为通过 `.env` 管理稳定的 gateway token；否则在依赖跨重启的客户端之前配置 `gateway.auth.token`。如果两者都未设置，OpenClaw 会在该次启动中使用仅运行时有效的 token。为 `GOG_KEYRING_PASSWORD` 生成一个 keyring 密码：

    ```bash
    openssl rand -hex 32
    ```

    **不要提交此文件。** 它包含容器/运行时环境变量，例如 `OPENCLAW_GATEWAY_TOKEN`。已存储的提供商 OAuth/API key 认证位于挂载的 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中。

  </Step>

  <Step title="Docker Compose 配置">
    创建或更新 `docker-compose.yml`：

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
          # 推荐：让 Gateway 仅在 VM 上绑定回环地址；通过 SSH 隧道访问。
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

    `--allow-unconfigured` 只是为了方便引导启动，并不能替代真正的 gateway 配置。部署时仍应设置认证（`gateway.auth.token` 或密码）以及安全的绑定模式。

  </Step>

  <Step title="共享 Docker VM 运行时步骤">
    按照共享运行时指南中的通用 Docker 主机流程操作：

    - [将所需二进制文件烘焙进镜像](/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [构建并启动](/install/docker-vm-runtime#build-and-launch)
    - [哪些内容会持久化到哪里](/install/docker-vm-runtime#what-persists-where)
    - [更新](/install/docker-vm-runtime#updates)

  </Step>

  <Step title="GCP 特定启动说明">
    如果在 `pnpm install --frozen-lockfile` 期间构建失败并显示 `Killed` 或 `exit code 137`，说明 VM 内存不足。至少使用 `e2-small`，或者使用 `e2-medium` 以获得更可靠的首次构建体验。

    当绑定到 LAN（`OPENCLAW_GATEWAY_BIND=lan`）时，在继续之前先配置一个受信任的浏览器来源：

    ```bash
    docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
    ```

    如果你更改了端口，请将 `18789` 替换为你配置的端口。

  </Step>

  <Step title="从你的笔记本电脑访问">
    创建一个 SSH 隧道来转发 Gateway 端口：

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
    ```

    在浏览器中打开 `http://127.0.0.1:18789/`。

    重新打印一个干净的仪表板链接：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

    如果 UI 提示共享密钥认证，请将已配置的 token 或密码粘贴到 Control UI 设置中（此 Docker 流程默认会写入一个 token；如果你切换到了密码认证，请改用你配置的密码）。

    如果 Control UI 显示 `unauthorized` 或 `disconnected (1008): pairing required`，请批准浏览器设备：

    ```bash
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    有关共享持久化映射，请参见 [Docker VM Runtime](/install/docker-vm-runtime#what-persists-where)，有关 [更新流程](/install/docker-vm-runtime#updates) 也可参考该文档。

  </Step>
</Steps>

## 故障排查

**SSH 连接被拒绝**

VM 创建后，SSH 密钥传播可能需要 1-2 分钟。请等待后重试。

**OS Login 问题**

检查你的 OS Login 配置文件：

```bash
gcloud compute os-login describe-profile
```

确保你的账号拥有所需的 IAM 权限（Compute OS Login 或 Compute OS Admin Login）。

**内存不足（OOM）**

如果 Docker 构建失败并显示 `Killed` 和 `exit code 137`，说明 VM 因 OOM 被终止：

```bash
# 先停止 VM
gcloud compute instances stop openclaw-gateway --zone=us-central1-a

# 更改机器类型
gcloud compute instances set-machine-type openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small

# 启动 VM
gcloud compute instances start openclaw-gateway --zone=us-central1-a
```

## 服务账号（安全最佳实践）

对于个人使用，你的默认用户账号就足够了。对于自动化或 CI/CD，请创建一个权限尽可能少的专用服务账号：

```bash
gcloud iam service-accounts create openclaw-deploy \
  --display-name="OpenClaw 部署"

gcloud projects add-iam-policy-binding my-openclaw-project \
  --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
  --role="roles/compute.instanceAdmin.v1"
```

自动化场景下避免使用 Owner 角色；请使用最小可用的角色。参见 [理解角色](https://cloud.google.com/iam/docs/understanding-roles)。

## 后续步骤

- 设置消息通道：[Channels](/channels)
- 将本地设备配对为节点：[Nodes](/nodes)
- 配置网关：[Gateway configuration](/gateway/configuration)

## 相关内容

- [安装概览](/install)
- [Azure](/install/azure)
- [VPS 托管](/vps)
