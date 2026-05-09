---
summary: "OpenClaw 的可选 Docker 化设置与入门"
read_when:
  - 你想要一个容器化网关而不是本地安装
  - 你正在验证 Docker 流程
title: "Docker"
---

Docker 是**可选的**。只有在你想要一个容器化网关或验证 Docker 流程时才使用它。

## Docker 适合我吗？

- **是**：你想要一个隔离的、用完即弃的网关环境，或者想在没有本地安装的主机上运行 OpenClaw。
- **否**：你是在自己的机器上运行，只想要最快的开发循环。请改用常规安装流程。
- **沙箱说明**：默认的沙箱后端在启用沙箱时使用 Docker，但沙箱默认是关闭的，并且运行完整网关**不需要** Docker。也可使用 SSH 和 OpenShell 沙箱后端。参见 [沙箱](/gateway/sandboxing)。

## 前置条件

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 构建镜像至少需要 2 GB RAM（在 1 GB 主机上，`pnpm install` 可能因内存不足被杀死并返回退出码 137）
- 足够的磁盘空间用于镜像和日志
- 如果运行在 VPS/公网主机上，请查看
  [网络暴露的安全加固](/gateway/security)，
  特别是 Docker `DOCKER-USER` 防火墙策略。

## 容器化网关

<Steps>
  <Step title="构建镜像">
    从仓库根目录运行设置脚本：

    ```bash
    ./scripts/docker/setup.sh
    ```

    这会在本地构建网关镜像。若要改用预构建镜像：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    预构建镜像发布在
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。
    常见标签：`main`、`latest`、`<version>`（例如 `2026.2.26`）。

  </Step>

  <Step title="完成入门配置">
    设置脚本会自动运行入门配置。它会：

    - 提示输入提供商 API 密钥
    - 生成网关令牌并写入 `.env`
    - 通过 Docker Compose 启动网关

    在设置期间，预启动入门和配置写入会直接通过
    `openclaw-gateway` 执行。`openclaw-cli` 用于网关容器已经存在
    之后你运行的命令。

  </Step>

  <Step title="打开控制界面">
    在浏览器中打开 `http://127.0.0.1:18789/`，并将配置好的
    共享密钥粘贴到 Settings 中。设置脚本默认会向 `.env` 写入一个令牌；
    如果你将容器配置切换为密码认证，则改用该密码。

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

如果你更希望自己逐步执行每一步，而不是使用设置脚本：

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"},{"path":"gateway.controlUi.allowedOrigins","value":["http://localhost:18789","http://127.0.0.1:18789"]}]'
docker compose up -d openclaw-gateway
```

<Note>
从仓库根目录运行 `docker compose`。如果你启用了 `OPENCLAW_EXTRA_MOUNTS`
或 `OPENCLAW_HOME_VOLUME`，设置脚本会写入 `docker-compose.extra.yml`；
请使用 `-f docker-compose.yml -f docker-compose.extra.yml` 将其包含进来。
</Note>

<Note>
由于 `openclaw-cli` 与 `openclaw-gateway` 共享网络命名空间，因此它是一个
启动后的工具。在 `docker compose up -d openclaw-gateway` 之前，请通过
带有 `--no-deps --entrypoint node` 的 `openclaw-gateway` 来运行入门配置
和设置时的配置写入。
</Note>

### 环境变量

设置脚本接受以下可选环境变量：

| Variable                                   | Purpose                                                         |
| ------------------------------------------ | --------------------------------------------------------------- |
| `OPENCLAW_IMAGE`                           | 使用远程镜像而不是本地构建                  |
| `OPENCLAW_DOCKER_APT_PACKAGES`             | 在构建期间安装额外的 apt 包（以空格分隔）       |
| `OPENCLAW_EXTENSIONS`                      | 在构建时包含选定的内置插件助手           |
| `OPENCLAW_EXTRA_MOUNTS`                    | 额外挂载主机绑定卷（逗号分隔的 `source:target[:opts]`） |
| `OPENCLAW_HOME_VOLUME`                     | 将 `/home/node` 持久化到命名 Docker 卷                   |
| `OPENCLAW_SANDBOX`                         | 启用沙箱引导（`1`、`true`、`yes`、`on`）          |
| `OPENCLAW_SKIP_ONBOARDING`                 | 跳过交互式入门步骤（`1`、`true`、`yes`、`on`） |
| `OPENCLAW_DOCKER_SOCKET`                   | 覆盖 Docker socket 路径                                     |
| `OPENCLAW_DISABLE_BONJOUR`                 | 禁用 Bonjour/mDNS 广播（Docker 默认值为 `1`）   |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS` | 禁用内置插件源码绑定挂载覆盖层               |
| `OTEL_EXPORTER_OTLP_ENDPOINT`              | 供 OpenTelemetry 导出的共享 OTLP/HTTP 收集器端点    |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`            | 用于 traces、metrics 或 logs 的信号特定 OTLP 端点     |
| `OTEL_EXPORTER_OTLP_PROTOCOL`              | OTLP 协议覆盖。目前仅支持 `http/protobuf` |
| `OTEL_SERVICE_NAME`                        | 用于 OpenTelemetry 资源的服务名称                   |
| `OTEL_SEMCONV_STABILITY_OPT_IN`            | 启用最新的实验性 GenAI 语义属性         |
| `OPENCLAW_OTEL_PRELOADED`                  | 当已有预加载时跳过启动第二个 OpenTelemetry SDK  |

维护者可以通过将一个插件源码目录挂载到其打包源码路径上，来测试打包镜像上的打包插件源码，例如
`OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`。
该挂载的源码目录会覆盖对应的已编译
`/app/dist/extensions/synology-chat` bundle，且插件 id 相同。

### 可观测性

OpenTelemetry 导出是从 Gateway 容器向你的 OTLP
收集器的出站连接。它不需要发布 Docker 端口。如果你本地构建镜像并希望
镜像内可用打包的 OpenTelemetry 导出器，请包含其运行时依赖：

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

在启用导出之前，请从 ClawHub 安装官方的 `@openclaw/diagnostics-otel` 插件，
用于打包的 Docker 安装。自定义源码构建的镜像仍然可以通过
`OPENCLAW_EXTENSIONS=diagnostics-otel` 包含本地插件源码。要启用导出，请在配置中允许并启用
`diagnostics-otel` 插件，然后设置
`diagnostics.otel.enabled=true`，或者使用 [OpenTelemetry 导出](/gateway/opentelemetry) 中的配置示例。
Collector 认证头通过 `diagnostics.otel.headers` 配置，而不是通过 Docker 环境变量。

Prometheus 指标使用已经发布的 Gateway 端口。安装
`clawhub:@openclaw/diagnostics-prometheus`，启用
`diagnostics-prometheus` 插件，然后抓取：

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

该路由受 Gateway 身份验证保护。不要暴露单独的公开 `/metrics` 端口或未认证的反向代理路径。参见
[Prometheus 指标](/gateway/prometheus)。

### 健康检查

容器探针端点（无需认证）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # 存活
curl -fsS http://127.0.0.1:18789/readyz     # 就绪
```

Docker 镜像包含一个内置的 `HEALTHCHECK`，会 ping `/healthz`。
如果检查持续失败，Docker 会将容器标记为 `unhealthy`，并且
编排系统可以重启或替换它。

已认证的深度健康快照：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### LAN 与 loopback

`scripts/docker/setup.sh` 默认将 `OPENCLAW_GATEWAY_BIND=lan`，这样主机访问
`http://127.0.0.1:18789` 时可与 Docker 端口发布配合工作。

- `lan`（默认）：主机浏览器和主机 CLI 都可以访问已发布的网关端口。
- `loopback`：只有容器网络命名空间中的进程才能直接访问
  网关。

<Note>
请使用 `gateway.bind` 中的绑定模式值（`lan` / `loopback` / `custom` /
`tailnet` / `auto`），不要使用像 `0.0.0.0` 或 `127.0.0.1` 这样的主机别名。
</Note>

### 主机本地提供商

当 OpenClaw 在 Docker 中运行时，容器内的 `127.0.0.1` 指的是容器
本身，而不是你的主机。对于运行在主机上的 AI 提供商，请使用
`host.docker.internal`：

| 提供商     | 主机默认 URL              | Docker 设置 URL                     |
| ---------- | -------------------------- | ------------------------------------ |
| LM Studio  | `http://127.0.0.1:1234`   | `http://host.docker.internal:1234`   |
| Ollama     | `http://127.0.0.1:11434`  | `http://host.docker.internal:11434`  |

打包的 Docker 设置使用这些主机 URL 作为 LM Studio 和 Ollama
入门配置默认值，并且 `docker-compose.yml` 会将 `host.docker.internal` 映射到
Linux Docker Engine 的 Docker host gateway。Docker Desktop 已经在 macOS 和 Windows 上提供
相同的主机名。

主机服务还必须监听 Docker 可访问的地址：

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

如果你使用自己的 Compose 文件或 `docker run` 命令，请自行添加相同的主机
映射，例如
`--add-host=host.docker.internal:host-gateway`。

### Bonjour / mDNS

Docker bridge 网络通常不会可靠地转发 Bonjour/mDNS 组播
（`224.0.0.251:5353`）。因此，打包的 Compose 设置默认
`OPENCLAW_DISABLE_BONJOUR=1`，这样当 bridge 丢弃组播流量时，Gateway
就不会陷入崩溃循环或在重启时反复广播。

Docker 主机请使用已发布的 Gateway URL、Tailscale 或广域 DNS-SD。
仅当使用 host networking、macvlan 或其他已知 mDNS 组播可工作的网络时，才将
`OPENCLAW_DISABLE_BONJOUR=0`。

有关注意事项和故障排查，请参见 [Bonjour 发现](/gateway/bonjour)。

### 存储与持久化

Docker Compose 将 `OPENCLAW_CONFIG_DIR` 绑定挂载到 `/home/node/.openclaw`，并将
`OPENCLAW_WORKSPACE_DIR` 挂载到 `/home/node/.openclaw/workspace`，因此这些路径
在容器替换后仍会保留。当任一变量未设置时，打包的
`docker-compose.yml` 会回退到 `${HOME}/.openclaw`（以及
工作区挂载的 `${HOME}/.openclaw/workspace`），如果 `HOME` 本身也缺失，则回退到
`/tmp/.openclaw`。这样可以避免在裸环境中执行 `docker compose up` 时
出现空源卷规范。

该挂载的配置目录是 OpenClaw 存放以下内容的地方：

- 用于行为配置的 `openclaw.json`
- 用于保存的提供商 OAuth/API 密钥认证的 `agents/<agentId>/agent/auth-profiles.json`
- 基于环境变量的运行时机密，如 `OPENCLAW_GATEWAY_TOKEN` 的 `.env`

已安装的可下载插件会将其包状态存储在已挂载的 OpenClaw home 下，因此插件安装记录和包根目录会在容器替换后保留。Gateway 启动不会生成内置插件依赖树。

关于 VM 部署的完整持久化细节，请参见
[Docker VM Runtime - What persists where](/install/docker-vm-runtime#what-persists-where)。

**磁盘增长热点：**关注 `media/`、session JSONL 文件、
`cron/runs/*.jsonl`、已安装插件包根目录，以及 `/tmp/openclaw/` 下的轮转日志文件。

### Shell 助手（可选）

为了更方便地进行日常 Docker 管理，请安装 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果你是从旧的 `scripts/shell-helpers/clawdock-helpers.sh` 原始路径安装的 ClawDock，请重新运行上面的安装命令，以便你的本地助手文件跟踪到新位置。

然后使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等命令。运行
`clawdock-help` 查看全部命令。
完整助手指南请参见 [ClawDock](/install/clawdock)。

<AccordionGroup>
  <Accordion title="为 Docker 网关启用代理沙箱">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    自定义 socket 路径（例如 rootless Docker）：

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    该脚本只会在沙箱前置条件通过后才挂载 `docker.sock`。如果
    沙箱设置无法完成，脚本会将 `agents.defaults.sandbox.mode`
    重置为 `off`。

  </Accordion>

  <Accordion title="自动化 / CI（非交互式）">
    使用 `-T` 禁用 Compose 的伪 TTY 分配：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

  <Accordion title="共享网络安全说明">
    `openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，因此 CLI
    命令可以通过 `127.0.0.1` 访问网关。请将其视为共享的信任边界。compose 配置会为
    `openclaw-gateway` 和 `openclaw-cli` 同时移除 `NET_RAW`/`NET_ADMIN`
    并启用 `no-new-privileges`。
  </Accordion>

  <Accordion title="openclaw-cli 中的 Docker Desktop DNS 失败">
    某些 Docker Desktop 配置在移除 `NET_RAW` 后，会在共享网络的
    `openclaw-cli` sidecar 中 DNS 查询失败，这会在诸如 `openclaw plugins install`
    之类依赖 npm 的命令中表现为 `EAI_AGAIN`。正常网关运行时请保留默认的加固 compose 文件。
    下方的本地覆盖文件会通过恢复 Docker 的默认 capabilities 来放宽 CLI 容器的安全策略，
    因此它只应用于需要访问包注册表的一次性 CLI 命令，而不是作为默认的 Compose 调用：

    ```bash
    printf '%s\n' \
      'services:' \
      '  openclaw-cli:' \
      '    cap_drop: !reset []' \
      > docker-compose.cli-no-dropped-caps.local.yml

    docker compose -f docker-compose.yml -f docker-compose.cli-no-dropped-caps.local.yml run --rm openclaw-cli plugins install <package>
    ```

    如果你已经创建了一个长期运行的 `openclaw-cli` 容器，请使用相同的覆盖重新创建它。
    `docker compose exec` 和 `docker exec` 无法为已创建的容器更改 Linux capabilities。

  </Accordion>

  <Accordion title="权限与 EACCES">
    镜像以 `node`（uid 1000）身份运行。如果你在
    `/home/node/.openclaw` 上看到权限错误，请确保你的主机绑定挂载归 uid 1000 所有：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

    同样的不匹配也可能表现为插件警告，例如
    `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
    ，随后出现 `plugin present but blocked`。这意味着进程 uid 与
    挂载的插件目录所有者不一致。请优先以默认 uid 1000 运行容器，并修正绑定挂载的所有权。
    只有在你有意长期以 root 运行 OpenClaw 时，才将
    `/path/to/openclaw-config/npm` chown 为 `root:root`。

  </Accordion>

  <Accordion title="更快的重建">
    调整 Dockerfile 顺序，使依赖层可以被缓存。这样可以避免在 lockfile 没变时重复运行
    `pnpm install`：

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
    默认镜像以安全优先为原则，并以非 root 的 `node` 运行。若要获得功能更完整的
    容器：

    1. **持久化 `/home/node`**：`export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **预装系统依赖**：`export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
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
    如果你在向导中选择 OpenAI Codex OAuth，它会打开一个浏览器 URL。对于
    Docker 或无头环境，请复制你最终到达的完整重定向 URL，并将其粘回向导中以完成认证。
  </Accordion>

  <Accordion title="基础镜像元数据">
    主 Docker 运行时镜像使用 `node:24-bookworm-slim`，并包含 `tini` 作为入口点初始化进程（PID 1），以确保长时间运行的容器能够正确回收僵尸进程并处理信号。它会发布 OCI 基础镜像注解，包括 `org.opencontainers.image.base.name`、
    `org.opencontainers.image.source` 等。Node 基础镜像的摘要会通过 Dependabot Docker 基础镜像 PR 进行刷新；发布构建不会运行发行版升级层。参见
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上运行？

请参见 [Hetzner（Docker VPS）](/install/hetzner) 和
[Docker VM Runtime](/install/docker-vm-runtime)，了解共享 VM 部署步骤，
包括二进制打包、持久化和更新。

## Agent 沙箱

当使用 Docker 后端启用 `agents.defaults.sandbox` 时，网关会将代理工具执行（shell、文件读写等）
放在隔离的 Docker 容器中运行，而网关本身仍保留在主机上。这为不受信任或多租户的代理会话提供了
一道硬隔离墙，而无需将整个网关容器化。

沙箱作用域可以是按代理（默认）、按会话或共享。每个作用域
都有自己挂载在 `/workspace` 的工作区。你还可以配置
允许/拒绝工具策略、网络隔离、资源限制和浏览器
容器。

有关完整配置、镜像、安全说明以及多代理配置文件，请参见：

- [沙箱](/gateway/sandboxing) -- 完整沙箱参考
- [OpenShell](/gateway/openshell) -- 对沙箱容器的交互式 shell 访问
- [多代理沙箱与工具](/tools/multi-agent-sandbox-tools) -- 按代理覆盖

### 快速启用

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // 关闭 | non-main | all
        scope: "agent", // session | agent | shared
      },
    },
  },
}
```

构建默认沙箱镜像（从源码检出目录）：

```bash
scripts/sandbox-setup.sh
```

对于没有源码检出目录的 npm 安装，请参见 [沙箱 § 镜像与设置](/gateway/sandboxing#images-and-setup) 以获取内联 `docker build` 命令。

## 故障排查

<AccordionGroup>
  <Accordion title="镜像缺失或沙盒容器未启动">
    使用
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    (source checkout) 或 [Sandboxing § Images and setup](/gateway/sandboxing#images-and-setup) 中的内联 `docker build` 命令（npm install），
    或将 `agents.defaults.sandbox.docker.image` 设置为你的自定义镜像。
    容器会按会话按需自动创建。
  </Accordion>

  <Accordion title="沙盒中的权限错误">
    将 `docker.user` 设置为与已挂载工作区所有权匹配的 UID:GID，
    或者对工作区文件夹执行 chown。
  </Accordion>

  <Accordion title="沙盒中找不到自定义工具">
    OpenClaw 使用 `sh -lc`（登录 shell）运行命令，这会加载
    `/etc/profile`，并可能重置 PATH。设置 `docker.env.PATH` 以在前面追加
    你的自定义工具路径，或者在 Dockerfile 中的 `/etc/profile.d/` 下添加脚本。
  </Accordion>

  <Accordion title="构建镜像时因 OOM 被杀死（exit 137）">
    虚拟机至少需要 2 GB 内存。请使用更大的机器规格并重试。
  </Accordion>

  <Accordion title="Control UI 中未经授权或需要配对">
    获取新的仪表盘链接并批准浏览器设备：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多详情：[仪表盘](/web/dashboard)，[设备](/cli/devices)。

  </Accordion>

  <Accordion title="Gateway 目标显示 ws://172.x.x.x 或 Docker CLI 出现配对错误">
    重置 gateway 模式和绑定：

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## 相关内容

- [安装概览](/install) — 所有安装方法
- [Podman](/install/podman) — Docker 的 Podman 替代方案
- [ClawDock](/install/clawdock) — Docker Compose 社区设置
- [更新](/install/updating) — 保持 OpenClaw 为最新版本
- [配置](/gateway/configuration) — 安装后的 gateway 配置
