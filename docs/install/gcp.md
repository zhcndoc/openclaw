---
summary: "在带有 Docker 的 GCP 计算引擎 VM 上运行 OpenClaw 网关 24/7"
doc-schema-version: 1
read_when:
  - "你想让 OpenClaw 在 GCP 上 24/7 运行"
  - "您希望在 Compute Engine VM 上有一个持久网关"
  - "您需要 GCP 配置、防火墙或 SSH 隧道指导"
title: "GCP"
---

在 Debian 计算引擎 VM 上运行持久 OpenClaw 网关。本页面涵盖 GCP 配置、网络访问和机器操作；共享的 [Docker VM 运行时](/install/docker-vm-runtime) 页面拥有容器设置、持久性、自定义二进制文件、验证和更新。

定价因机器类型和地区而异。至少使用 6 个 GB RAM 来构建源映像。在较小的计算机上，使用 [Docker VM 运行时](/install/docker-vm-runtime) 中描述的官方预构建映像。

## <a id="what-you-need"></a> 准备工作

- A GCP 启用计费的项目
- `gcloud` CLI 或 [ 云 Console](https://console.cloud.google.com)
- 从你的笔记本电脑进行 SSH 访问
- 模型和可选通道凭证
- 大约 20 分钟。

## <a id="provision-the-vm"></a> 提供VM

<Steps>
  <Step id="initialize-gcloud" title="初始化 gcloud">
    从 [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install) 安装 CLI，然后进行身份验证：

    ```bash
    gcloud init
    gcloud auth login
    ```

    您可以在 Cloud Console 中执行相同的步骤。

  </Step>

  <Step id="create-the-project" title="创建项目">
    ```bash
    gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
    gcloud config set project my-openclaw-project
    gcloud services enable compute.googleapis.com
    ```

    在[计费控制台](https://console.cloud.google.com/billing)中启用计费。如果没有它，Compute Engine 将无法启动。

  </Step>

  <Step id="choose-a-machine" title="选择机器">
    | 类型          | 配置                   | 笔记                                  |
    | ------------- | ----------------------- | -------------------------------------- |
    | e2-标准-2 | 2 个 vCPU、8 个 GB RAM        | 推荐用于源镜像构建    |
    | e2-介质     | 2 个 vCPU、4 个 GB RAM        | 使用官方预建镜像       |
    | e2-小号      | 2 个 vCPU、2 个 GB RAM        | 使用官方预建镜像       |

    创建一个Debian 12 VM：

    ```bash
    gcloud compute instances create openclaw-gateway \
      --zone=us-central1-a \
      --machine-type=e2-standard-2 \
      --boot-disk-size=20GB \
      --image-family=debian-12 \
      --image-project=debian-cloud
    ```

  </Step>

  <Step id="review-firewall-access" title="检查防火墙访问">
    保持 TCP 18789 对公共互联网关闭。下面的SSH隧道只需要SSH访问VM：

    ```bash
    gcloud compute firewall-rules list \
      --format='table(name,network,direction,sourceRanges.list():label=SOURCE_RANGES,allowed[].map().firewall_rule().list():label=ALLOW)'
    ```

    尽可能将 SSH 源范围限制在您的管理网络内。如果您有意通过反向代理或尾网公开网关，请遵循 [Gateway security](/gateway/security)，而不是为端口 18789 添加广泛的 `0.0.0.0/0` 规则。

  </Step>

  <Step id="connect-over-ssh" title="通过 SSH 连接">
    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
    ```

    创建 VM 后，SSH 密钥传播可能需要一两分钟。如果第一次连接被拒绝，请等待并重试。

  </Step>

  <Step id="install-docker" title="安装Docker">
    在 VM 上：

    ```bash
    sudo apt-get update
    sudo apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    exit
    ```

    重新连接以使组更改生效，然后验证安装：

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
    docker --version
    docker compose version
    ```

  </Step>
</Steps>

## <a id="configure-the-docker-runtime"></a> 配置Docker运行时

在 VM 上，按照 [Docker VM 运行时 ](/install/docker-vm-runtime) 从 **开始之前** 到 **验证并管理网关**。维护的安装脚本默认使用这些 GCP 主机路径：

```bash
export OPENCLAW_CONFIG_DIR="$HOME/.openclaw"
export OPENCLAW_WORKSPACE_DIR="$HOME/.openclaw/workspace"
export OPENCLAW_AUTH_PROFILE_SECRET_DIR="$HOME/.openclaw-auth-profile-secrets"
```

如果源构建以 `Killed`、`ResourceExhausted` 或退出代码 137 结束，请在重试之前调整 VM 的大小。

## <a id="access-the-control-ui"></a> 访问Control UI

从您的笔记本电脑中，打开 SSH 隧道并使其保持运行：

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

打开`http://127.0.0.1:18789/`。出现提示时，粘贴 VM 的 `.env` 中的网关令牌。要重新打印仪表板 URL 或批准浏览器设备，请在 VM 上运行：

```bash
cd openclaw
docker compose run --rm openclaw-cli dashboard --no-open
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

## <a id="troubleshooting"></a> 故障排查

### <a id="ssh-connection-refused"></a> SSH 连接被拒绝

等待一两分钟以进行 SSH 密钥传播，然后重试。检查 VM 是否正在运行，以及入口防火墙规则是否允许来自当前网络的 TCP 22。

### <a id="os-login-issues"></a> OS 登录问题

```bash
gcloud compute os-login describe-profile
```

检查您的帐户是否具有计算 OS 登录或计算 OS 管理员登录权限。

### <a id="resize-after-an-out-of-memory-build"></a> 内存不足构建后调整大小

```bash
gcloud compute instances stop openclaw-gateway --zone=us-central1-a
gcloud compute instances set-machine-type openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-medium
gcloud compute instances start openclaw-gateway --zone=us-central1-a
```

## <a id="use-a-deployment-service-account"></a> 使用部署服务帐号

对于个人设置，您的用户帐户就足够了。自动化应使用具有最窄角色的专用服务帐户：

```bash
gcloud iam service-accounts create openclaw-deploy \
  --display-name="OpenClaw Deployment"

gcloud projects add-iam-policy-binding my-openclaw-project \
  --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
  --role="roles/compute.instanceAdmin.v1"
```

避免所有者角色。请参阅 [ 了解角色](https://cloud.google.com/iam/docs/understanding-roles)。

## <a id="next-steps"></a> 下一步

- [频道](/channels)
- [节点](/nodes)
- [网关配置](/gateway/configuration)
- [Docker VM Runtime](/install/docker-vm-runtime#update-openclaw)

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [Docker VM Runtime](/install/docker-vm-runtime)
- [VPS 托管](/vps)
