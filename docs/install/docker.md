---
summary: "OpenClaw 的可选 Docker 化设置与入门"
read_when:
  - 你想要一个容器化网关而不是本地安装
  - 你正在验证 Docker 流程
title: "Docker"
---

Docker 是**可选的**。当你需要一个隔离的、一次性使用的网关环境，或者主机上没有本地安装时，可以使用它。如果你已经在自己的机器上进行开发，请改用常规安装流程。

默认的 Docker 沙箱后端仅使用 `docker` CLI。将后端设置为 `"podman"` 可直接选择原生 Podman。沙箱默认处于关闭状态，网关本身无需运行在容器中。SSH 和 OpenShell 沙箱后端也可用；请参阅 [沙箱](/gateway/sandboxing)。

要托管多个用户？请参阅 [多租户托管](/gateway/multi-tenant-hosting)，了解每个租户一个单元格的模式。

## 先决条件

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 用于镜像构建的内存至少 2 GB（在 1 GB 的主机上，`pnpm install` 可能会因 OOM 被杀死并返回 exit 137）
- 为镜像和日志预留足够的磁盘空间
- 在 VPS/公网主机上，请查看[网络暴露的安全加固](/gateway/security)，尤其是 Docker 的 `DOCKER-USER` 防火墙链。

## 容器化网关

<Steps>
  <Step title="构建镜像">
    从仓库根目录执行：

    ```bash
    ./scripts/docker/setup.sh
    ```

    这会在本地构建网关镜像为 `openclaw:local`。若要改用预构建镜像：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    预构建镜像会首先发布到 [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。GHCR 是发布自动化、固定部署和来源检查的主仓库。相同的发布也会在 Docker Hub 镜像仓库 `openclaw/openclaw` 上提供镜像：

    ```bash
    export OPENCLAW_IMAGE="openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    使用 `ghcr.io/openclaw/openclaw` 或 `openclaw/openclaw`，避免使用非官方镜像，因为它们不遵循 OpenClaw 的发布时间或保留策略。特定版本的标签包括 `2026.2.26` 等正式版本，以及 `2026.2.26-beta.1` 等预发布版本。稳定版本会更新 `latest` 和 `main`；月度末尾的网关版本只会更新 `extended-stable`。变体包括 `slim`、`main-slim`、`extended-stable-slim`、`latest-browser`、`main-browser` 和 `extended-stable-browser`。默认镜像包含 `codex` 和 `diagnostics-otel` 插件。`-browser` 变体还预装了 Chromium，可用于[沙箱浏览器](/gateway/sandboxing#sandboxed-browser)工具，无需首次运行时安装 Playwright。

  </Step>

  <Step title="离线重运行">
    在离线主机上，请先传输并加载镜像：

    ```bash
    docker load -i openclaw-image.tar
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh --offline
    ```

    `--offline` 会验证 `OPENCLAW_IMAGE` 已经存在于本地，禁用隐式的 Compose 拉取/构建，然后执行正常流程：`.env` 同步、权限修复、引导、网关配置同步、Compose 启动。

    如果 `OPENCLAW_SANDBOX=1`，离线设置还会检查通过 `OPENCLAW_DOCKER_SOCKET` 连接的守护进程上已配置的默认沙箱镜像和每个代理的沙箱镜像，包括基于 Docker 的浏览器镜像上的 browser-contract 标签。如果所需镜像缺失或已过期，设置会在不更改沙箱配置的情况下退出，而不是报告一个有问题的成功结果。

  </Step>

  <Step title="完成引导">
    设置脚本会自动运行引导：

    - 提示输入提供方 API 密钥
    - 生成网关令牌并写入 `.env`
    - 创建 auth-profile 密钥目录
    - 通过 Docker Compose 启动网关

    启动前的引导和配置写入会直接通过 `openclaw-gateway` 运行（使用 `--no-deps --entrypoint node`），因为 `openclaw-cli` 共享网关的网络命名空间，只有在网关容器存在后才能工作。

  </Step>

  <Step title="打开控制界面">
    打开 `http://127.0.0.1:18789/`，并将写入 `.env` 的令牌粘贴到“设置”中。如果你把容器切换为密码认证，则改用该密码。

    需要再次获取 URL？

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="配置通道（可选）">
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

```bash
BUILD_GIT_COMMIT="$(git rev-parse HEAD)"
BUILD_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker build \
  --build-arg "GIT_COMMIT=${BUILD_GIT_COMMIT}" \
  --build-arg "OPENCLAW_BUILD_TIMESTAMP=${BUILD_TIMESTAMP}" \
  -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"},{"path":"gateway.controlUi.allowedOrigins","value":["http://localhost:18789","http://127.0.0.1:18789"]}]'
docker compose up -d openclaw-gateway
```

Docker 上下文不包含 `.git`。请像上面所示一样，将源代码身份作为构建参数传入，这样镜像的 About 页面就会显示检出的提交和一个构建时间戳。`scripts/docker/setup.sh` 会自动解析并传入这两个值。

<Note>
从仓库根目录运行 `docker compose`。如果你启用了 `OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，设置脚本会写入 `docker-compose.extra.yml`；请将其放在你自己维护的任何 `docker-compose.override.yml` 之后，例如 `-f docker-compose.yml -f docker-compose.override.yml -f docker-compose.extra.yml`。
</Note>

### 升级容器镜像

当你替换 OpenClaw 镜像但保留相同的挂载状态/配置时，新的网关会在就绪前执行启动时安全的升级迁移和插件收敛。常规的镜像升级通常不需要额外执行一次 `openclaw doctor --fix`。

如果启动无法安全完成这些修复，网关会直接退出，而不是报告为健康状态。使用重启策略时，Docker、Podman 或 Kubernetes 可能会显示网关容器正在重启。请保留挂载的状态卷，然后使用相同的状态/配置挂载，以网关使用的相同镜像运行一次 `openclaw doctor --fix` 作为容器命令：

```bash
docker run --rm -v <openclaw-state>:/home/node/.openclaw <image> openclaw doctor --fix
podman run --rm -v <openclaw-state>:/home/node/.openclaw <image> openclaw doctor --fix
```

doctor 完成后，使用默认命令重新启动网关容器。在 Kubernetes 中，将相同的命令作为一次性 Job 或调试 Pod 运行，并挂载到相同的 PVC，然后重启 Deployment 或 StatefulSet。

### 环境变量

`scripts/docker/setup.sh` 接受的可选变量（对于网关容器，也可直接由 `docker-compose.yml` 接受）：

| 变量                                            | 用途                                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_IMAGE`                                | 使用远程镜像，而不是在本地构建                                                                                    |
| `OPENCLAW_IMAGE_APT_PACKAGES`                   | 在构建期间安装额外的 apt 软件包（以空格分隔）。旧版别名：`OPENCLAW_DOCKER_APT_PACKAGES`                         |
| `OPENCLAW_IMAGE_PIP_PACKAGES`                   | 在构建期间安装额外的 Python 软件包（以空格分隔）                                                                  |
| `OPENCLAW_EXTENSIONS`                           | 编译/打包选定的受支持插件，并安装其运行时依赖项（以逗号或空格分隔的 ID）                                           |
| `OPENCLAW_DOCKER_BUILD_NODE_OPTIONS`            | 覆盖本地源码构建的 Node 选项（默认为 `--max-old-space-size=8192`）                                                |
| `OPENCLAW_DOCKER_BUILD_TSDOWN_MAX_OLD_SPACE_MB` | 以 MB 为单位覆盖本地源码构建的 tsdown 堆内存大小                                                                  |
| `OPENCLAW_DOCKER_BUILD_SKIP_DTS`                | 在仅运行时的本地镜像构建期间跳过声明文件输出（默认为 `1`）                                                        |
| `OPENCLAW_INSTALL_BROWSER`                      | 在构建时将 Chromium + Xvfb 内置到镜像中                                                                           |
| `OPENCLAW_EXTRA_MOUNTS`                         | 额外的主机绑定挂载（以逗号分隔的 `source:target[:opts]`）                                                          |
| `OPENCLAW_HOME_VOLUME`                          | 将 `/home/node` 持久化到一个命名 Docker 卷中                                                                      |
| `OPENCLAW_TZ`                                   | 将网关和 CLI 容器的时区设置为 IANA 名称（默认为 `UTC`）                                                           |
| `OPENCLAW_SANDBOX`                              | 选择加入沙箱引导（`1`、`true`、`yes`、`on`）                                                                      |
| `OPENCLAW_SKIP_ONBOARDING`                      | 跳过交互式入门步骤（`1`、`true`、`yes`、`on`）                                                                     |
| `OPENCLAW_DOCKER_SOCKET`                        | 覆盖 Docker 套接字路径                                                                                             |
| `OPENCLAW_DISABLE_BONJOUR`                      | 强制开启（`0`）或关闭（`1`）Bonjour/mDNS 广播；请参阅 [Bonjour / mDNS](#bonjour--mdns)                           |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS`      | 禁用内置插件源绑定挂载覆盖                                                                                         |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                   | 用于 OpenTelemetry 导出的共享 OTLP/HTTP 收集器端点                                                               |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`                 | 针对追踪、指标或日志的特定信号 OTLP 端点                                                                            |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                   | 共享 OTLP 协议回退设置。目前仅支持 `http/protobuf`                                                                |
| `OTEL_EXPORTER_OTLP_*_PROTOCOL`                 | 针对追踪、指标或日志的特定信号协议回退设置；优先于共享回退设置                                                     |
| `OTEL_SERVICE_NAME`                             | 用于 OpenTelemetry 资源的服务名称                                                                                  |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                 | 选择加入最新的实验性 GenAI 语义属性                                                                                 |
| `OPENCLAW_OTEL_PRELOADED`                       | 在已预加载 OpenTelemetry SDK 时跳过启动第二个 SDK                                                                  |

官方镜像不包含 Homebrew。在入门过程中，OpenClaw 会在一个没有 `brew` 的 Linux 容器中隐藏仅适用于 brew 的技能依赖安装器；请通过自定义镜像提供这些依赖，或手动安装。对于 Debian 打包的依赖，请使用 `OPENCLAW_IMAGE_APT_PACKAGES`；对于 Python 依赖，请使用 `OPENCLAW_IMAGE_PIP_PACKAGES`（构建时会运行 `python3 -m pip install --break-system-packages`，因此请锁定版本，并且只使用你信任的索引）。

如果 Docker 报告 `ResourceExhausted`、`cannot allocate memory`，或在 `tsdown` 期间中止，请提高 Docker 构建器的内存限制，或改用更小的显式堆内存重试：

```bash
OPENCLAW_DOCKER_BUILD_NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_DOCKER_BUILD_TSDOWN_MAX_OLD_SPACE_MB=4096
```

### 使用所选插件的源码构建镜像

`OPENCLAW_EXTENSIONS` 从源码检出中选择插件清单 id；
当现有源码目录名称不同的时候，也同样接受这些名称。Docker
构建会将所选内容一次性解析为源码目录，安装生产依赖，并且当某个所选插件以单独形式发布且
`openclaw.build.bundledDist: false` 时，会将其运行时编译进根目录的 bundled
dist 中。这种仅限 Docker 的打包方式不会改变插件的 npm 或 ClawHub
工件契约。未知、无效或歧义的 id 会导致镜像构建失败。已知的仅依赖/仅源码 id 会保留其现有的源码与依赖
分层，不会获得编译后的根 dist 条目。带有统一构建条目的所选插件必须成功编译；未选中的外部插件
源码和运行时输出会被裁剪掉。

例如，下面这些命令为 ClickClack、Slack 和 Microsoft Teams 构建独立的、多架构的
FakeCo 网关镜像。ClawRouter 已经是根 OpenClaw 运行时的一部分，因此 ClickClack 镜像只选择
`clickclack`。显式传入空的 browser 参数可使默认镜像不包含 Chromium：

```bash
SOURCE_SHA="$(git rev-parse HEAD)"
BUILD_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
REGISTRY="registry.example.com/fakeco"

build_gateway_image() {
  gateway="$1"
  selected_plugin="$2"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg "GIT_COMMIT=${SOURCE_SHA}" \
    --build-arg "OPENCLAW_BUILD_TIMESTAMP=${BUILD_TIMESTAMP}" \
    --build-arg "OPENCLAW_EXTENSIONS=${selected_plugin}" \
    --build-arg OPENCLAW_INSTALL_BROWSER= \
    --provenance=mode=max \
    --sbom=true \
    --tag "${REGISTRY}/openclaw-${gateway}:${SOURCE_SHA}" \
    --push \
    .
}

build_gateway_image clickclack clickclack
build_gateway_image slack slack
build_gateway_image teams msteams
```

使用 `--platform linux/arm64 --load` 或 `--platform linux/amd64 --load` 进行
单个本地原生构建。多平台输出以及附带的 SBOM/溯源信息需要镜像仓库或其他能够保留证明材料的 Buildx 输出。推送后，请检查 manifest，并部署不可变的 digest，而不是可变的 source-SHA tag：

```bash
docker buildx imagetools inspect \
  "${REGISTRY}/openclaw-clickclack:${SOURCE_SHA}"
# 部署：registry.example.com/fakeco/openclaw-clickclack@sha256:<manifest-digest>
```

这些镜像适用于基于 OCI 的独立网关和通用 Docker 用户。
Crabhelm 管理的网关不会使用它们：该交付路径会构建一个单独的 x86_64 appliance 归档，其中包含一个 OpenClaw npm tarball，并锁定 Node、归档和 manifest 的 digest。请从相同已落地的 OpenClaw 源码独立构建该 appliance。

要测试打包镜像中的 bundled 插件源码，可以将某个插件源码目录挂载覆盖其打包后的源码路径，例如 `OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`。这会覆盖同一插件 id 对应的已编译 `/app/dist/extensions/synology-chat` bundle。

### 可观测性

OpenTelemetry 导出是从 Gateway 容器向你的 OTLP 收集器发出的；它不需要发布 Docker 端口。要在本地构建的镜像中包含捆绑的导出器：

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

官方预构建镜像已经捆绑了 `diagnostics-otel`；只有在你将其移除后，才需要自行安装 `clawhub:@openclaw/diagnostics-otel`。要启用导出，请在配置中允许并启用 `diagnostics-otel` 插件，然后设置 `diagnostics.otel.enabled=true`（完整示例见 [OpenTelemetry 导出](/gateway/opentelemetry)）。收集器认证头通过 `diagnostics.otel.headers` 传递，而不是通过 Docker 环境变量。

Prometheus 指标复用已经发布的 Gateway 端口。安装 `clawhub:@openclaw/diagnostics-prometheus`，启用 `diagnostics-prometheus` 插件，然后抓取：

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

该路由受 Gateway 身份验证保护；不要暴露单独的公共 `/metrics` 端口或未认证的反向代理路径。参见 [Prometheus 指标](/gateway/prometheus)。

### 健康检查

容器探针端点（无需认证）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # 存活
curl -fsS http://127.0.0.1:18789/readyz     # 就绪
```

镜像内置的 `HEALTHCHECK` 会 ping `/healthz`；若连续失败，会将容器标记为 `unhealthy`，以便编排器重启或替换它。

已认证的深度健康快照：

```bash
docker compose exec openclaw-gateway sh -lc 'node dist/index.js gateway health --token "$OPENCLAW_GATEWAY_TOKEN"'
```

### LAN 与回环

`scripts/docker/setup.sh` 默认将 `OPENCLAW_GATEWAY_BIND=lan`，因此主机上的 `http://127.0.0.1:18789` 可以通过 Docker 端口发布正常访问。

- `lan`（默认）：主机浏览器和主机 CLI 都可以访问已发布的网关端口。
- `loopback`：只有容器网络命名空间内的进程可以直接访问网关。

<Note>
在 `gateway.bind` 中使用绑定模式值（`lan` / `loopback` / `custom` / `tailnet` / `auto`），不要使用诸如 `0.0.0.0` 或 `127.0.0.1` 之类的主机别名。
</Note>

### 本地主机提供商

在容器内部，`127.0.0.1` 指的是容器自身，而不是主机。对于在主机上运行的提供商，请使用 `host.docker.internal`：

| 提供商     | 主机默认 URL              | Docker 设置 URL                     |
| ---------- | -------------------------- | ------------------------------------ |
| LM Studio  | `http://127.0.0.1:1234`   | `http://host.docker.internal:1234`   |
| Ollama     | `http://127.0.0.1:11434`  | `http://host.docker.internal:11434`  |

捆绑的设置会将这些 URL 用作 LM Studio/Ollama 的引导默认值，并且 `docker-compose.yml` 会将 Linux Docker Engine 上的 `host.docker.internal` 映射到主机网关（Docker Desktop 在 macOS/Windows 上提供相同的别名）。主机服务必须监听 Docker 可以访问的地址：

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

使用你自己的 Compose 文件或 `docker run`？请自行添加相同的映射，例如 `--add-host=host.docker.internal:host-gateway`。

### Docker 中的 Claude CLI 后端

官方镜像不会预装 Claude Code。请在容器内以 `node` 用户身份安装并登录，然后持久化该容器的 home 目录，这样镜像升级时就不会擦除二进制文件或认证状态。

对于新安装，请在运行设置之前启用一个持久化的 `/home/node` 卷：

```bash
export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
export OPENCLAW_HOME_VOLUME="openclaw_home"
./scripts/docker/setup.sh
```

对于已有安装，请先停止栈并重新加载当前的 `.env` 值——设置脚本总是会根据当前 shell 和默认值重写 `.env`，它不会自行读取该文件：

```bash
set -a
. ./.env
set +a
export OPENCLAW_HOME_VOLUME="${OPENCLAW_HOME_VOLUME:-openclaw_home}"
./scripts/docker/setup.sh
```

如果 `.env` 包含你的 shell 无法直接 source 的值，请先手动重新导出你依赖的内容（`OPENCLAW_IMAGE`、端口、绑定模式、自定义路径、`OPENCLAW_EXTRA_MOUNTS`、sandbox、skip-onboarding）。生成的 overlay 会为 `openclaw-gateway` 和 `openclaw-cli` 两个服务挂载 home 卷；后续命令请使用该 overlay 运行（如果你使用了 `docker-compose.override.yml`，请先加上它）：

```bash
docker compose -f docker-compose.yml -f docker-compose.extra.yml run --rm \
  --entrypoint sh openclaw-cli -lc \
  'curl -fsSL https://claude.ai/install.sh | bash'
```

原生安装程序会将 `claude` 写入 `/home/node/.local/bin/claude`。OpenClaw 镜像已将 `/home/node/.local/bin` 加入 `PATH`，因此内置的 Anthropic 插件无需适配器配置覆盖即可找到它。

使用同一个已持久化的 home 目录登录并验证：

```bash
docker compose -f docker-compose.yml -f docker-compose.extra.yml run --rm \
  --entrypoint /home/node/.local/bin/claude openclaw-cli auth login
docker compose -f docker-compose.yml -f docker-compose.extra.yml run --rm \
  --entrypoint /home/node/.local/bin/claude openclaw-cli auth status --text
docker compose -f docker-compose.yml -f docker-compose.extra.yml run --rm \
  openclaw-cli models auth login \
  --provider anthropic --method cli --set-default
docker compose -f docker-compose.yml -f docker-compose.extra.yml run --rm \
  openclaw-cli models list --provider anthropic
```

然后使用内置的 `claude-cli` 后端：

```bash
docker compose -f docker-compose.yml -f docker-compose.extra.yml run --rm \
  openclaw-cli agent \
  --agent main \
  --model claude-cli/claude-sonnet-4-6 \
  --message "Say hello from Docker Claude CLI"
```

`OPENCLAW_HOME_VOLUME` 会将原生安装持久化到 `/home/node/.local/bin` 和 `/home/node/.local/share/claude`，以及 Claude Code 的设置/认证数据持久化到 `/home/node/.claude` 和 `/home/node/.claude.json`。仅持久化 `/home/node/.openclaw` 还不够；如果你使用 `OPENCLAW_EXTRA_MOUNTS` 而不是 home 卷，请将所有这些 Claude 路径都挂载到两个服务中。

<Note>
对于共享生产自动化或可预测的 Anthropic 计费，建议优先使用 Anthropic API key 方案。Claude CLI 的复用会跟随 Claude Code 已安装的版本、账户登录、计费和更新行为。
</Note>

### Bonjour / mDNS

Docker 桥接网络通常不会可靠地转发 Bonjour/mDNS 组播（`224.0.0.251:5353`）。当 `OPENCLAW_DISABLE_BONJOUR` 未设置时，内置的 Bonjour 插件在检测到自己运行于容器中后，会自动禁用局域网广播，因此不会因为桥接网络丢弃组播而陷入崩溃重试循环。将 `OPENCLAW_DISABLE_BONJOUR=1` 设为强制关闭，无论检测结果如何；或设为 `0` 强制开启（仅适用于主机网络、macvlan，或其他已知 mDNS 组播可正常工作的网络）。

否则，请改用已发布的 Gateway URL、Tailscale，或适用于 Docker 主机的广域 DNS-SD。有关注意事项和故障排查，请参见 [Bonjour 发现](/gateway/bonjour)。

### 存储与持久化

Docker Compose 将 `OPENCLAW_CONFIG_DIR` 挂载到 `/home/node/.openclaw`，将 `OPENCLAW_WORKSPACE_DIR` 挂载到 `/home/node/.openclaw/workspace`，并将 `OPENCLAW_AUTH_PROFILE_SECRET_DIR` 挂载到 `/home/node/.config/openclaw`，因此这些路径在容器替换后仍会保留。当某个变量未设置时，`docker-compose.yml` 会回退到 `${HOME}` 下；如果 `HOME` 本身缺失，则回退到 `/tmp`，因此即使在裸环境中，`docker compose up` 也不会输出空来源卷规范。

该挂载的配置目录包含：

- 用于行为配置的 `openclaw.json`
- 用于保存提供商 OAuth/API 密钥认证的 `agents/<agentId>/agent/auth-profiles.json`
- 基于环境变量的运行时机密，例如 `OPENCLAW_GATEWAY_TOKEN` 的 `.env`

auth-profile 密钥目录用于存储 OAuth 支持的 auth profile 令牌材料的本地加密密钥。请将其与 Docker 主机状态一起保留，但与 `OPENCLAW_CONFIG_DIR` 分开。

已安装的可下载插件会在挂载的 OpenClaw 主目录下存储包状态，因此安装记录和包根目录会在容器替换后保留；网关启动不会重新生成内置插件的依赖树。

有关完整的 VM 持久化细节，请参见 [Docker VM Runtime - What persists where](/install/docker-vm-runtime#what-persists-where)。

**磁盘增长热点：** `media/`、每个 agent 的 SQLite 数据库、旧版 session JSONL 转录、共享的 SQLite 状态数据库、已安装插件的包根目录，以及 `/tmp/openclaw/` 下的滚动文件日志。

### Shell 助手（可选）

对于较短的日常命令，请安装 [ClawDock](/install/clawdock)：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果你是从较旧的 `scripts/shell-helpers/clawdock-helpers.sh` 路径安装的，请重新运行上面的命令，这样你的本地助手就会跟踪当前的位置。然后使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等命令（运行 `clawdock-help` 查看完整列表）。

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

    该脚本仅在沙箱前置条件通过后才会挂载 `docker.sock`。如果沙箱设置无法完成，它会将 `agents.defaults.sandbox.mode` 重置为 `off`。在 OpenClaw 沙箱处于活动状态的轮次中，Codex 代码模式会被禁用（参见 [Sandboxing § Docker backend](/gateway/sandboxing#docker-backend)）；绝不要将宿主机 Docker socket 挂载到代理沙箱容器中。

  </Accordion>

  <Accordion title="自动化 / CI（非交互式）">
    使用 `-T` 禁用 Compose 的伪 TTY 分配：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

  <Accordion title="共享网络安全说明">
    `openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，因此 CLI 命令可以通过 `127.0.0.1` 访问网关。请将其视为共享信任边界。compose 配置会移除 `NET_RAW`/`NET_ADMIN`，并在 `openclaw-gateway` 和 `openclaw-cli` 上启用 `no-new-privileges`。
  </Accordion>

  <Accordion title="openclaw-cli 中的 Docker Desktop DNS 故障">
    某些 Docker Desktop 配置在共享网络的 `openclaw-cli` sidecar 上移除 `NET_RAW` 后，会导致 DNS 查询失败，在基于 npm 的命令（如 `openclaw plugins install`）期间表现为 `EAI_AGAIN`。正常运行时请保留默认的加固 compose 文件。下面的覆盖配置仅为 `openclaw-cli` 容器恢复默认 capabilities——请将其用于需要 registry 访问的一次性命令，而不要作为默认调用方式：

    ```bash
    printf '%s\n' \
      'services:' \
      '  openclaw-cli:' \
      '    cap_drop: !reset []' \
      > docker-compose.cli-no-dropped-caps.local.yml

    docker compose -f docker-compose.yml -f docker-compose.cli-no-dropped-caps.local.yml run --rm openclaw-cli plugins install <package>
    ```

    如果你已经创建了一个长期运行的 `openclaw-cli` 容器，请使用相同的覆盖配置重新创建它——`docker compose exec`/`docker exec` 无法更改已创建容器的 Linux capabilities。

  </Accordion>

  <Accordion title="权限和 EACCES">
    该镜像以 `node`（uid 1000）运行。如果你在 `/home/node/.openclaw` 上看到权限错误，请确保宿主机的 bind mount 归属 uid 1000：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

    同样的不匹配也可能表现为 `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`，随后出现 `plugin present but blocked`——这是进程 uid 与挂载的插件目录所有者不一致。建议使用默认的 uid 1000 运行，并修复 bind mount 的所有权。只有在你有意长期以 root 运行 OpenClaw 时，才将 `/path/to/openclaw-config/npm` chown 为 `root:root`。

  </Accordion>

  <Accordion title="更快的重建">
    安排你的 Dockerfile，使依赖层能够被缓存，从而避免除非 lockfile 变化否则重复运行 `pnpm install`：

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
    默认镜像以安全优先方式运行，并以非 root 的 `node` 用户运行。若要使用功能更完整的容器：

    1. **持久化 `/home/node`**: `export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **预装系统依赖**: `export OPENCLAW_IMAGE_APT_PACKAGES="git curl jq"`
    3. **预装 Python 依赖**: `export OPENCLAW_IMAGE_PIP_PACKAGES="requests==2.32.5 humanize==4.14.0"`
    4. **预装 Playwright Chromium**: `export OPENCLAW_INSTALL_BROWSER=1`，或使用官方的 `-browser` 镜像标签
    5. **持久化浏览器下载内容和缓存**: 使用 `OPENCLAW_HOME_VOLUME` 或 `OPENCLAW_EXTRA_MOUNTS`。在 Linux 上，OpenClaw 会自动检测镜像中由 Playwright 管理的 Chromium。

  </Accordion>

  <Accordion title="OpenAI Codex OAuth（无头 Docker）">
    如果你在向导中选择 OpenAI Codex OAuth，它会打开一个浏览器 URL。在 Docker 或无头环境中，请复制你最终落地到的完整重定向 URL，并将其粘贴回向导中以完成认证。
  </Accordion>

  <Accordion title="基础镜像元数据">
    运行时镜像使用 `node:24-bookworm-slim`，并以 `tini` 作为 PID 1 运行，因此在长期运行的容器中，僵尸进程会被回收，信号也能被正确处理。它会发布 OCI 基础镜像注解，包括 `org.opencontainers.image.base.name` 和 `org.opencontainers.image.source`。Dependabot 会刷新固定的 Node 基础镜像摘要；发布构建不会运行单独的发行版升级层。参见 [OCI 镜像注解](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上运行？

请参见 [Hetzner（Docker VPS）](/install/hetzner) 和 [Docker VM Runtime](/install/docker-vm-runtime)，了解共享虚拟机部署步骤，包括二进制文件烘焙、持久化和更新。

## Agent 沙箱

当使用 Docker backend 启用 `agents.defaults.sandbox` 时，gateway 会将代理工具执行（shell、文件读写等）运行在隔离的 Docker 容器中，而 gateway 本身仍留在宿主机上——这在不将整个 gateway 容器化的情况下，为不受信任或多租户的代理会话提供了一道硬隔离墙。

沙箱作用域可以是按代理（默认）、按会话或共享；每个作用域都会获得自己挂载在 `/workspace` 的工作区。你还可以配置允许/拒绝的工具策略、网络隔离、资源限制以及浏览器容器。

完整配置、镜像、安全说明和多代理配置文件请参见：

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
  <Accordion title="镜像缺失或沙箱容器未启动">
    使用 [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)（源码检出）或 [沙箱 § 镜像和设置](/gateway/sandboxing#images-and-setup) 中的内联 `docker build` 命令（npm install）构建沙箱镜像，或者将 `agents.defaults.sandbox.docker.image` 设置为你的自定义镜像。容器会按需为每个会话自动创建。
  </Accordion>

  <Accordion title="沙箱中的权限错误">
    将 `docker.user` 设置为与你挂载的工作区所有权匹配的 UID:GID，或者将工作区文件夹的所有者改为当前用户。
  </Accordion>

  <Accordion title="在沙箱中找不到自定义工具">
    OpenClaw 使用 `sh -lc`（登录 shell）运行命令，这会加载 `/etc/profile` 并可能重置 PATH。将 `docker.env.PATH` 设置为在前面追加你的自定义工具路径，或者在你的 Dockerfile 中于 `/etc/profile.d/` 下添加一个脚本。
  </Accordion>

  <Accordion title="构建镜像时因 OOM 被杀死（exit 137）">
    虚拟机至少需要 2 GB 内存。请使用更大的机器规格并重试。
  </Accordion>

  <Accordion title="控制界面中未经授权或需要配对">
    获取新的仪表盘链接并批准浏览器设备：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多详情：[仪表盘](/web/dashboard)，[设备](/cli/devices)。

  </Accordion>

  <Accordion title="网关目标显示 ws://172.x.x.x 或 Docker CLI 出现配对错误">
    重置网关模式和绑定：

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
- [配置](/gateway/configuration) — 安装后的 gateway 配置。
