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

访问 Gateway 的方式：

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
  <Step title="Install gcloud CLI (or use Console)">
    **Option A: gcloud CLI** (recommended for automation)

    Install from [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

    Initialize and authenticate:

    ```bash
    gcloud init
    gcloud auth login
    ```

    **Option B: Cloud Console**

    All steps can be done via the web UI at [https://console.cloud.google.com](https://console.cloud.google.com)

  </Step>

  <Step title="Create a GCP project">
    **CLI:**

    ```bash
    gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
    gcloud config set project my-openclaw-project
    ```

    Enable billing at [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) (required for Compute Engine).

    Enable the Compute Engine API:

    ```bash
    gcloud services enable compute.googleapis.com
    ```

    **Console:**

    1. Go to IAM & Admin > Create Project
    2. Name it and create
    3. Enable billing for the project
    4. Navigate to APIs & Services > Enable APIs > search "Compute Engine API" > Enable

  </Step>

  <Step title="Create the VM">
    **Machine types:**

    | Type      | Specs                    | Cost               | Notes                                        |
    | --------- | ------------------------ | ------------------ | -------------------------------------------- |
    | e2-medium | 2 vCPU, 4GB RAM          | ~$25/mo            | Most reliable for local Docker builds        |
    | e2-small  | 2 vCPU, 2GB RAM          | ~$12/mo            | Minimum recommended for Docker build         |
    | e2-micro  | 2 vCPU (shared), 1GB RAM | Free tier eligible | Often fails with Docker build OOM (exit 137) |

    **CLI:**

    ```bash
    gcloud compute instances create openclaw-gateway \
      --zone=us-central1-a \
      --machine-type=e2-small \
      --boot-disk-size=20GB \
      --image-family=debian-12 \
      --image-project=debian-cloud
    ```

    **Console:**

    1. Go to Compute Engine > VM instances > Create instance
    2. Name: `openclaw-gateway`
    3. Region: `us-central1`, Zone: `us-central1-a`
    4. Machine type: `e2-small`
    5. Boot disk: Debian 12, 20GB
    6. Create

  </Step>

  <Step title="SSH into the VM">
    **CLI:**

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
    ```

    **Console:**

    Click the "SSH" button next to your VM in the Compute Engine dashboard.

    Note: SSH key propagation can take 1-2 minutes after VM creation. If connection is refused, wait and retry.

  </Step>

  <Step title="Install Docker (on the VM)">
    ```bash
    sudo apt-get update
    sudo apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    ```

    Log out and back in for the group change to take effect:

    ```bash
    exit
    ```

    Then SSH back in:

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
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
    mkdir -p ~/.openclaw
    mkdir -p ~/.openclaw/workspace
    ```

  </Step>

  <Step title="Configure environment variables">
    Create `.env` in the repository root.

    ```bash
    OPENCLAW_IMAGE=openclaw:latest
    OPENCLAW_GATEWAY_TOKEN=change-me-now
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/home/$USER/.openclaw
    OPENCLAW_WORKSPACE_DIR=/home/$USER/.openclaw/workspace

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
          # Recommended: keep the Gateway loopback-only on the VM; access via SSH tunnel.
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

  <Step title="GCP-specific launch notes">
    On GCP, if build fails with `Killed` or `exit code 137` during `pnpm install --frozen-lockfile`, the VM is out of memory. Use `e2-small` minimum, or `e2-medium` for more reliable first builds.

    When binding to LAN (`OPENCLAW_GATEWAY_BIND=lan`), configure a trusted browser origin before continuing:

    ```bash
    docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
    ```

    If you changed the gateway port, replace `18789` with your configured port.

  </Step>

  <Step title="Access from your laptop">
    Create an SSH tunnel to forward the Gateway port:

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
    ```

    Open in your browser:

    `http://127.0.0.1:18789/`

    Fetch a fresh tokenized dashboard link:

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

    Paste the token from that URL.

    If Control UI shows `unauthorized` or `disconnected (1008): pairing required`, approve the browser device:

    ```bash
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    Need the shared persistence and update reference again?
    See [Docker VM Runtime](/install/docker-vm-runtime#what-persists-where) and [Docker VM Runtime updates](/install/docker-vm-runtime#updates).

  </Step>
</Steps>

---

## 故障排查

**SSH 连接被拒绝**

VM 创建后 SSH 密钥传播可能需 1-2 分钟。请等待后重试。

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
     --display-name="OpenClaw Deployment"
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

- 设定消息通道：[Channels](/channels)
- 配对本地设备作为节点：[Nodes](/nodes)
- 配置 Gateway：[Gateway configuration](/gateway/configuration)
