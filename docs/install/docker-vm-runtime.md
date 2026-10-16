---
summary: "长期 OpenClaw 网关主机的共享 Docker VM 运行时步骤"
doc-schema-version: 1
read_when:
  - "您正在使用 Docker 在云 VM 上部署 OpenClaw"
  - "您需要共享设置、二进制烘焙、持久性和更新流程"
title: "Docker VM 运行时"
---

在配置 VM 并安装 Docker 后使用此运行时流程。 [GCP](/install/gcp) 和 [Hetzner](/install/hetzner) 等提供商指南拥有 VM 创建、防火墙规则、SSH 访问以及返回笔记本电脑的隧道。此页面拥有这些主机共享的 Docker 设置。

## <a id="before-you-begin"></a> 开始之前

你需要：

- A Debian 或 Ubuntu VM 与 Docker 引擎和 Docker Compose v2
- 源镜像构建至少需要 6 个 GB RAM；较小的主机应使用下面的官方预构建映像
- OpenClaw 源在 VM 上签出
- 用于入门引导的提供程序和模型凭据
- 仅 SSH- 或其他受限制的提供商防火墙；不要将网关端口直接暴露给公共互联网

来自 VM：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
docker --version
docker compose version
```

## <a id="prepare-persistent-host-state"></a> 准备持久主机状态

维护的设置脚本默认状态为当前 VM 用户的主页：

```bash
export OPENCLAW_CONFIG_DIR="$HOME/.openclaw"
export OPENCLAW_WORKSPACE_DIR="$HOME/.openclaw/workspace"
export OPENCLAW_AUTH_PROFILE_SECRET_DIR="$HOME/.openclaw-auth-profile-secrets"
```

如果您的 VM 使用专用数据磁盘，请在设置前覆盖这些路径。将所有三个目录保留在备份中。当前的 OAuth 令牌材料以明文形式存储在 `OPENCLAW_CONFIG_DIR` 下的 SQLite 中，包括访问、刷新和 ID- 令牌值。将 config 目录及其备份或副本视为凭据。

auth-profile 秘密目录仅包含用于恢复旧版加密 OAuth sidecar 凭证的本地密钥。它必须针对该恢复路径持续存在并与 `OPENCLAW_CONFIG_DIR` 保持分离，但它不会加密当前的 SQLite 行或保护仅状态备份或副本。

<a id="build-and-launch" />

## <a id="run-the-maintained-docker-setup"></a> 运行维护的 Docker 设置

```bash
./scripts/docker/setup.sh
```

该脚本创建主机目录，构建 `openclaw:local`，运行载入，生成网关令牌，同步 `.env`，并通过存储库的 `docker-compose.yml` 启动网关。 Compose 文件将容器端状态固定到 `/home/node/.openclaw`，同时使用上面的主机路径作为绑定安装源。

要使用官方预构建映像而不是从源构建：

```bash
export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
./scripts/docker/setup.sh
```

对于无人值守设置、提供程序 SecretRefs、额外安装、沙箱设置以及所有支持的环境变量，请使用完整的 [Docker 指南](/install/docker)。

<Warning>
`OPENCLAW_GATEWAY_BIND=lan` 是正常的容器设置：`loopback` 会将网关限制为容器自己的网络命名空间。使用云防火墙将已发布的主机端口保持私有，然后通过提供商指南中的 SSH 隧道到达该端口。
</Warning>

## <a id="bake-required-binaries-into-the-image"></a> 将所需二进制文件烘焙进镜像

在正在运行的容器内安装二进制文件是一个陷阱：重新创建容器时，运行时安装的任何内容都会丢失。在构建时将技能所需的每个外部二进制文件烘焙到映像中。

下面的示例只涵盖三个二进制文件，按字母顺序排列：

- `gog`（来自 `gogcli`），用于访问 Gmail
- `goplaces`，用于 Google Places
- `wacli`，用于 WhatsApp

这些只是示例，并非完整列表。 Docker Compose 构建存储库根 `Dockerfile`，因此扩展该文件而不是创建独立示例或替换其内容。存储库 Dockerfile 需要清单提取、构建、生产依赖项、运行时资产和最终运行时阶段。构建和生产安装共享相同的清单和锁定文件，包括 `packages/*` 和选定的插件工作区。

对于 Debian 包，更喜欢现有的构建参数：

```bash
export OPENCLAW_IMAGE_APT_PACKAGES="socat"
```

对于下载的发布二进制文件（例如 `gog`、`goplaces` 或 `wacli`），请将下载和安装命令添加到 repo-root `Dockerfile` 最终运行时阶段，位于其软件包安装块之后、`USER node` 之前。保留现有的非 root uid 1000 设置、`tini` 入口点、运行状况检查和 `openclaw` 符号链接。

<Note>
存储库 Dockerfile 摘要固定其 Node 和 Bun 基础映像。保留这些已检查的引脚，而不是将其更改为浮动 `FROM node:24-bookworm` 参考。对于基于 ARM- 的虚拟机，选择 `arm64` 发布资产以获取额外的二进制文件；对于可重现的构建，请使用版本化的资产 URL 并验证其校验和。
</Note>

重建自定义镜像，无需重复启动：

```bash
OPENCLAW_SKIP_ONBOARDING=1 ./scripts/docker/setup.sh
```

如果在依赖项安装或捆绑期间构建失败并显示 `Killed` 或退出代码 137，则 VM 内存不足。重试之前调整其大小。

验证烘焙的二进制文件：

```bash
docker compose exec openclaw-gateway which gog
docker compose exec openclaw-gateway which goplaces
docker compose exec openclaw-gateway which wacli
```

## <a id="verify-and-administer-the-gateway"></a> 验证和管理网关

```bash
docker compose ps
docker compose logs --tail=100 openclaw-gateway
curl -fsS http://127.0.0.1:18789/healthz
docker compose run --rm openclaw-cli dashboard --no-open
```

`/healthz` 返回 200 响应确认网关进程正在侦听。图像 `HEALTHCHECK` 轮询同一端点。如果 Control UI 需要设备批准：

```bash
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

## <a id="what-persists-where"></a> 哪些内容存放在哪里

OpenClaw 在 Docker 中运行，但容器文件系统不是事实来源。长期存在的状态必须能够在重新启动、重建和重新引导后继续存在。

| 组件            | 集装箱位置                  | 持久化机制       | 笔记                                                                                      |
| -------------------- | ----------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| 网关 state/config | `/home/node/.openclaw/`             | `OPENCLAW_CONFIG_DIR` 安装座 | 包括 `openclaw.json`、共享状态和已安装的插件包根                 |
| 代理工作区      | `/home/node/.openclaw/workspace/`   | 工作区安装             | 代码和代理工件                                                                   |
| 渠道凭证  | `/home/node/.openclaw/credentials/` | 配置挂载                | 渠道凭证材料                                                                |
| 模型认证配置文件  | `/home/node/.openclaw/`             | 配置挂载                | 共享`state/openclaw.sqlite`；代理本地 `agents/<agentId>/agent/openclaw-agent.sqlite` |
| 身份验证配置文件密钥     | `/home/node/.config/openclaw/`      | 秘密目录挂载      | 传统加密 sidecar 恢复密钥；不保护当前 SQLite 行                |
| 技能状态          | `/home/node/.openclaw/skills/`      | 配置挂载                | 技能级状态                                                                          |
| 外部二进制文件    | `/usr/local/bin/`                   | Docker 镜像                | 必须在构建时打包进去                                                                |
| Node 和 OS 封装 | 容器文件系统                | Docker 镜像                | 用图像重建；不要在运行时安装                                          |
| Docker 容器     | 短暂存在                           | 可重启                 | 验证安装状态后可安全更换                                            |

## <a id="common-pitfall%3A-never-file-bind-openclaw.json"></a><a id="common-pitfall-never-file-bind-openclaw-json"></a> 常见陷阱：从不进行文件绑定 `openclaw.json`

将网关状态 **挂载为目录**，切勿挂载为单个文件。仓库 `docker-compose.yml` 已经这样做了：

```yaml
# Supported: whole state directory.
- "${OPENCLAW_CONFIG_DIR:-${HOME:-/tmp}/.openclaw}:/home/node/.openclaw"
```

```yaml
# Unsupported: single-file bind. Do not use this.
# - "./openclaw.json:/home/node/.openclaw/openclaw.json"
```

单文件绑定仍附加到已安装的文件。正常的 OpenClaw 配置保存替换 `openclaw.json`。如果在容器启动后主机端保存替换了单文件绑定的源，则容器可以继续读取旧文件，而主机路径指向新文件。主机端保存可以成功，而无需更新容器所看到的内容。就地写入同一文件的编辑不会导致这种差异。

修复：保留 Compose 的目录挂载。在该目录内的主机上编辑 `openclaw.json`。

<a id="updates" />

## <a id="update-openclaw"></a> 更新 OpenClaw

对于源构建的映像：

```bash
git pull --ff-only
OPENCLAW_SKIP_ONBOARDING=1 ./scripts/docker/setup.sh
docker compose run --rm openclaw-cli doctor --json
```

对于固定或预构建的映像，请在重新运行安装脚本之前将 `OPENCLAW_IMAGE` 更新为预期标签或摘要。例行映像升级针对已安装状态运行启动安全迁移；请参阅 [ 升级容器映像](/install/docker#upgrading-container-images) 以在迁移无法自动完成时进行恢复。

## <a id="related"></a> 相关内容

- [Docker](/install/docker)
- [Podman](/install/podman)
