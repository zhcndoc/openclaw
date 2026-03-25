---
summary: "OpenClaw 的可选基于 Docker 的设置和入门指南"
read_when:
  - 您想要一个容器化的网关，而不是本地安装
  - 您正在验证 Docker 流程
title: "Docker"
---

# Docker（可选）

Docker 是 **可选的**。仅当您需要容器化的网关或验证 Docker 流程时使用。

## Docker 适合我吗？

- **是**：您想要一个隔离的、可随意处置的网关环境，或者希望在没有本地安装的主机上运行 OpenClaw。
- **否**：您正在自己的机器上运行，只想要最快的开发循环。请改用常规安装流程。
- **沙盒说明**：代理沙盒也使用 Docker，但**不要求**整个网关在 Docker 中运行。请参阅[沙盒](/gateway/sandboxing)。

## 前提条件

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 至少 2 GB 内存用于镜像构建（在仅有 1 GB 内存的主机上，`pnpm install` 可能因 OOM 被终止并返回退出码 137）
- 足够的磁盘空间用于镜像和日志
- 如果在 VPS/公共主机上运行，请查阅[网络暴露安全加固](/gateway/security)，特别是 Docker 的 `DOCKER-USER` 防火墙策略。

## 容器化网关

<Steps>
  <Step title="构建镜像">
    从仓库根目录运行设置脚本：

    ```bash
    ./scripts/docker/setup.sh
    ```

    这会本地构建网关镜像。如需改用预构建的镜像：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    预构建镜像发布于 [GitHub 容器仓库](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。
    常用标签：`main`、`latest`、`<version>`（例如 `2026.2.26`）。

  </Step>

  <Step title="完成入门设置">
    设置脚本会自动运行入门流程。它将：

    - 提示输入提供商 API 密钥
    - 生成网关令牌并写入 `.env`
    - 通过 Docker Compose 启动网关

    在设置期间，启动前的入门配置和配置写入直接通过 `openclaw-gateway` 运行。`openclaw-cli` 用于在网关容器已存在后执行的命令。

  </Step>

  <Step title="打开控制界面">
    在浏览器中打开 `http://127.0.0.1:18789/`，并将令牌粘贴到设置中。

    需要再次获取 URL？

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="配置通道（可选）">
    使用 CLI 容器添加消息通道：

    ```bash
    # WhatsApp（二维码）
    docker compose run --rm openclaw-cli channels login

    # Telegram
    docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"

    # Discord
    docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
    ```

    文档：[WhatsApp](/channels/whatsapp)、[Telegram](/channels/telegram)、[Discord](/channels/discord)

  </Step>
</Steps>

### 手动流程

如果您希望自行运行每个步骤，而不是使用设置脚本：

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.mode local
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.bind lan
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.controlUi.allowedOrigins \
  '["http://localhost:18789","http://127.0.0.1:18789"]' --strict-json
docker compose up -d openclaw-gateway
```

<Note>
在仓库根目录运行 `docker compose`。如果您启用了 `OPENCLAW_EXTRA_MOUNTS`
或 `OPENCLAW_HOME_VOLUME`，设置脚本会写入 `docker-compose.extra.yml`；
请使用 `-f docker-compose.yml -f docker-compose.extra.yml` 将其包含进来。
</Note>

<Note>
由于 `openclaw-cli` 共享 `openclaw-gateway` 的网络命名空间，因此它是一个
启动后工具。在运行 `docker compose up -d openclaw-gateway` 之前，请通过带有
`--no-deps --entrypoint node` 的 `openclaw-gateway` 运行入门设置和设置时的配置写入。
</Note>

### 环境变量

设置脚本接受以下可选环境变量：

| 变量                           | 用途                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| `OPENCLAW_IMAGE`               | 使用远程镜像而非本地构建                                       |
| `OPENCLAW_DOCKER_APT_PACKAGES` | 构建期间安装额外的 apt 软件包（空格分隔）                      |
| `OPENCLAW_EXTENSIONS`          | 构建时预安装扩展依赖（空格分隔的名称）                        |
| `OPENCLAW_EXTRA_MOUNTS`        | 额外的主机绑定挂载（逗号分隔的 `source:target[:opts]`）        |
| `OPENCLAW_HOME_VOLUME`         | 将 `/home/node` 持久化到命名 Docker 卷中                      |
| `OPENCLAW_SANDBOX`             | 选择加入沙盒引导（`1`、`true`、`yes`、`on`）                  |
| `OPENCLAW_DOCKER_SOCKET`       | 覆盖 Docker 套接字路径                                         |

### 健康检查

容器探针端点（无需认证）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # 存活探测
curl -fsS http://127.0.0.1:18789/readyz     # 就绪探测
```

Docker 镜像包含内置的 `HEALTHCHECK`，会 ping `/healthz`。
如果检查持续失败，Docker 会将容器标记为 `unhealthy`，编排系统可以重启或替换它。

经过认证的深度健康快照：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### LAN 与回环

`scripts/docker/setup.sh` 默认设置 `OPENCLAW_GATEWAY_BIND=lan`，以便通过 Docker 端口映射后，主机可以访问 `http://127.0.0.1:18789`。

- `lan`（默认）：主机浏览器和主机 CLI 可以访问已发布的网关端口。
- `loopback`：只有容器网络命名空间内的进程才能直接访问网关。

<Note>
在 `gateway.bind` 中使用绑定模式值（`lan` / `loopback` / `custom` /
`tailnet` / `auto`），而不是主机别名如 `0.0.0.0` 或 `127.0.0.1`。
</Note>

### 存储与持久化

Docker Compose 将 `OPENCLAW_CONFIG_DIR` 绑定挂载到 `/home/node/.openclaw`，将
`OPENCLAW_WORKSPACE_DIR` 绑定挂载到 `/home/node/.openclaw/workspace`，因此这些路径
在容器更换后仍然保留。

有关 VM 部署的完整持久化详情，请参阅
[Docker VM 运行时 - 哪些数据会持久化](/install/docker-vm-runtime#what-persists-where)。

**磁盘增长热点：** 关注 `media/`、会话 JSONL 文件、`cron/runs/*.jsonl`，
以及 `/tmp/openclaw/` 下的滚动文件日志。

### Shell 助手（可选）

为了更轻松地管理 Docker 日常操作，请安装 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/shell-helpers/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

然后使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等命令。运行
`clawdock-help` 查看所有命令。
参见 [`ClawDock` 助手自述文件](https://github.com/openclaw/openclaw/blob/main/scripts/shell-helpers/README.md)。

<AccordionGroup>
  <Accordion title="为 Docker 网关启用代理沙盒">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    自定义套接字路径（例如 rootless Docker）：

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    脚本仅在沙盒前提条件通过后才会挂载 `docker.sock`。如果
    沙盒设置无法完成，脚本会将 `agents.defaults.sandbox.mode`
    重置为 `off`。

  </Accordion>

  <Accordion title="自动化 / CI（非交互式）">
    使用 `-T` 禁用 Compose 伪 TTY 分配：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

  <Accordion title="共享网络安全说明">
    `openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，以便 CLI
    命令可以通过 `127.0.0.1` 访问网关。请将其视为共享的信任边界。compose 配置会丢弃 `NET_RAW`/`NET_ADMIN` 权限，并在 `openclaw-cli` 上启用 `no-new-privileges`。
  </Accordion>

  <Accordion title="权限与 EACCES">
    镜像以 `node` 用户（uid 1000）运行。如果您在
    `/home/node/.openclaw` 上看到权限错误，请确保您的主机绑定挂载由 uid 1000 拥有：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

  </Accordion>

  <Accordion title="加速重新构建">
    合理安排 Dockerfile 顺序，使依赖层被缓存。这可以避免在
    lockfiles 未更改时重新运行 `pnpm install`：

    ```dockerfile
    FROM node:24-bookworm
    RUN curl -fsSL https://bun.sh/install | bash
    ENV PATH="/root/.bun/bin:${PATH}"
    RUN corepack enable
    WORKDIR /app
    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
    COPY ui/package.json ./ui/package.json
    COPY scripts ./scripts
    RUN pnpm install --frozen-lockfile
    COPY . .
    RUN pnpm build
    RUN pnpm ui:install
    RUN pnpm ui:build
    ENV NODE_ENV=production
    CMD ["node","dist/index.js"]
    ```

  </Accordion>

  <Accordion title="高级用户容器选项">
    默认镜像以安全优先，并以非 root 用户 `node` 运行。如需功能更完整的容器：

    1. **持久化 `/home/node`**：`export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **烘焙系统依赖**：`export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **安装 Playwright 浏览器**：
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **持久化浏览器下载**：设置
       `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` 并使用
       `OPENCLAW_HOME_VOLUME` 或 `OPENCLAW_EXTRA_MOUNTS`。

  </Accordion>

  <Accordion title="OpenAI Codex OAuth（无头 Docker）">
    如果您在向导中选择 OpenAI Codex OAuth，它会打开浏览器 URL。在
    Docker 或无头设置中，复制您最终到达的完整重定向 URL 并粘贴回向导中以完成认证。
  </Accordion>

  <Accordion title="基础镜像元数据">
    主 Docker 镜像使用 `node:24-bookworm` 并发布 OCI 基础镜像
    注解，包括 `org.opencontainers.image.base.name`、
    `org.opencontainers.image.source` 等。参见
    [OCI 镜像注解](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上运行？

请参阅 [Hetzner (Docker VPS)](/install/hetzner) 和
[Docker VM 运行时](/install/docker-vm-runtime) 了解共享 VM 部署步骤，
包括二进制烘焙、持久化和更新。

## 代理沙盒

当启用 `agents.defaults.sandbox` 时，网关在隔离的 Docker 容器内运行代理工具执行
（shell、文件读写等），而网关本身保留在主机上。这为您提供了针对不受信任或多租户代理会话的硬隔离墙，而无需将整个网关容器化。

沙盒作用域可以是每个代理（默认）、每个会话或共享。每个作用域都有自己的工作空间，挂载在 `/workspace`。您还可以配置允许/拒绝工具策略、网络隔离、资源限制和浏览器容器。

有关完整配置、镜像、安全说明和多代理配置文件，请参阅：

- [沙盒](/gateway/sandboxing) —— 完整的沙盒参考
- [OpenShell](/gateway/openshell) —— 对沙盒容器的交互式 shell 访问
- [多代理沙盒与工具](/tools/multi-agent-sandbox-tools) —— 每个代理的覆盖设置

### 快速启用

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // 关闭 | 非主进程 | 全部
        scope: "agent", // 会话 | 代理 | 共享
      },
    },
  },
}
```

构建默认沙盒镜像：

```bash
scripts/sandbox-setup.sh
```

## 故障排查

<AccordionGroup>
  <Accordion title="镜像缺失或沙盒容器无法启动">
    使用 [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh) 构建沙盒镜像，或将 `agents.defaults.sandbox.docker.image` 设置为你的自定义镜像。容器会在每个会话中按需自动创建。
  </Accordion>

  <Accordion title="沙盒中出现权限错误">
    将 `docker.user` 设置为与挂载的工作空间所有者匹配的 UID:GID，或者使用 chown 修改工作空间文件夹的权限。
  </Accordion>

  <Accordion title="在沙盒中找不到自定义工具">
    OpenClaw 使用 `sh -lc`（登录 shell）运行命令，该命令会读取 `/etc/profile` 并可能重置 PATH。设置 `docker.env.PATH` 以在前面添加你的自定义工具路径，或者在 Dockerfile 中的 `/etc/profile.d/` 下添加脚本。
  </Accordion>

  <Accordion title="镜像构建时因 OOM 被终止（退出码 137）">
    虚拟机至少需要 2 GB 内存。使用更大规格的机器类型并重试。
  </Accordion>

  <Accordion title="Control UI 中显示未授权或需要配对">
    获取新的仪表板链接并批准浏览器设备：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多详情：[仪表板](/web/dashboard)、[设备](/cli/devices)。

  </Accordion>

  <Accordion title="网关目标显示 ws://172.x.x.x 或 Docker CLI 出现配对错误">
    重置网关模式和绑定：

    ```bash
    docker compose run --rm openclaw-cli config set gateway.mode local
    docker compose run --rm openclaw-cli config set gateway.bind lan
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>