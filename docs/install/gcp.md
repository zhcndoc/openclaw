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

## 1）安装 gcloud CLI（或使用 Cloud Console）

**选项 A：gcloud CLI**（推荐用于自动化）

从 [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install) 安装

初始化并认证：

```bash
gcloud init
gcloud auth login
```

**选项 B：Cloud Console**

所有操作也可通过网站 UI 完成：
[https://console.cloud.google.com](https://console.cloud.google.com)

---

## 2）创建 GCP 项目

**命令行：**

```bash
gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
gcloud config set project my-openclaw-project
```

在 [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) 启用计费（Compute Engine 必须）。

启用 Compute Engine API：

```bash
gcloud services enable compute.googleapis.com
```

**控制台：**

1. 进入 IAM & 管理 > 创建项目
2. 命名并创建
3. 为项目启用计费
4. 导航至 API 与服务 > 启用 API > 搜索 “Compute Engine API” > 启用

---

## 3）创建虚拟机

**机器类型：**

| 类型      | 规格                | 费用          | 备注                          |
| --------- | ------------------- | ------------- | ----------------------------- |
| e2-medium | 2 vCPU，4GB 内存    | 约 25 美元/月 | 本地 Docker 构建最稳定选择    |
| e2-small  | 2 vCPU，2GB 内存    | 约 12 美元/月 | Docker 构建的最低推荐         |
| e2-micro  | 2 vCPU（共享），1GB | 免费等级适用  | Docker 构建经常因内存不足失败 |

**命令行：**

```bash
gcloud compute instances create openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --boot-disk-size=20GB \
  --image-family=debian-12 \
  --image-project=debian-cloud
```

**控制台：**

1. 进入 Compute Engine > 虚拟机实例 > 创建实例
2. 名称：`openclaw-gateway`
3. 地区：`us-central1`，分区：`us-central1-a`
4. 机器类型：`e2-small`
5. 启动盘：Debian 12，20GB
6. 点击创建

---

## 4）SSH 连接虚拟机

**命令行：**

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

**控制台：**

点击 Compute Engine 控制面板中虚拟机旁的 “SSH” 按钮。

注意：VM 创建后，SSH 密钥传播可能需 1-2 分钟。如连接被拒绝，请等待后再试。

---

## 5）在虚拟机上安装 Docker

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

注销并重新登录生效：

```bash
exit
```

然后重新 SSH 登录：

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

验证安装：

```bash
docker --version
docker compose version
```

---

## 6）克隆 OpenClaw 仓库

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

本指南假设你将构建自定义镜像以保证二进制文件持久性。

---

## 7）创建持久化宿主目录

Docker 容器为临时环境。
所有长期状态必须保存在宿主机。

```bash
mkdir -p ~/.openclaw
mkdir -p ~/.openclaw/workspace
```

---

## 8）配置环境变量

在仓库根目录创建 `.env` 文件。

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

生成强密码：

```bash
openssl rand -hex 32
```

**请勿将此文件提交至版本库。**

---

## 9）Docker Compose 配置

新建或更新 `docker-compose.yml`：

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
      # 建议：将 Gateway 限制在虚拟机回环接口，通过 SSH 隧道访问。
      # 若需公开暴露，请去掉前缀 `127.0.0.1:` 并做好防火墙配置。
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
      ]
```

---

## 10) Shared Docker VM runtime steps

Use the shared runtime guide for the common Docker host flow:

- [Bake required binaries into the image](/install/docker-vm-runtime#bake-required-binaries-into-the-image)
- [Build and launch](/install/docker-vm-runtime#build-and-launch)
- [What persists where](/install/docker-vm-runtime#what-persists-where)
- [Updates](/install/docker-vm-runtime#updates)

---

## 11) GCP-specific launch notes

On GCP, if build fails with `Killed` or `exit code 137` during `pnpm install --frozen-lockfile`, the VM is out of memory. Use `e2-small` minimum, or `e2-medium` for more reliable first builds.

当绑定到局域网 (`OPENCLAW_GATEWAY_BIND=lan`) 时，继续前请先配置可信浏览器来源：

```bash
docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
```

如果你修改了端口号，请将此处的 `18789` 替换为你的端口。

## 12) Access from your laptop

建立 SSH 隧道转发 Gateway 端口：

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

然后在浏览器打开：

`http://127.0.0.1:18789/`

获取最新的令牌链接：

```bash
docker compose run --rm openclaw-cli dashboard --no-open
```

将命令输出的令牌粘贴至浏览器。

若控制界面显示 `unauthorized` 或 `disconnected (1008): pairing required`，需批准浏览器设备：

```bash
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

Need the shared persistence and update reference again?
See [Docker VM Runtime](/install/docker-vm-runtime#what-persists-where) and [Docker VM Runtime updates](/install/docker-vm-runtime#updates).

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
