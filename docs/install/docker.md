---
summary: "适用于 OpenClaw 的可选基于 Docker- 的设置和登录"
read_when:
  - "您需要容器化网关而不是本地安装"
  - "你正在验证 Docker 流程"
  - "您正在从 ClawDock shell 助手迁移"
title: "Docker"
---

Docker为**可选**。将其用于隔离的一次性网关环境或没有本地安装的主机。如果您已经在自己的计算机上进行开发，请改用正常的安装流程。

默认的 Docker 沙箱后端仅使用 `docker` CLI。设置后端为`"podman"`，直接选择原生Podman。沙箱默认处于关闭状态，并且不需要网关本身在容器中运行。 SSH 和 OpenShell 沙箱后端也可用；请参阅 [Sandboxing](/gateway/sandboxing)。

托管相互不信任的用户？为每个信任边界运行单独的网关，最好在单独的 OS 用户或主机下运行。参见[安全信任模型](/gateway/security/trust-model)。

## <a id="prerequisites"></a> 先决条件

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 本地源镜像构建至少需要 6 个 GB RAM；预构建的图像避免了这种构建要求
- 为镜像和日志预留足够的磁盘空间
- 在VPS/public主机上，查看[网络暴露的安全强化](/gateway/security)，特别是Docker `DOCKER-USER`防火墙链

## <a id="containerized-gateway"></a> 集装箱网关

<Steps>
  <Step id="build-the-image" title="构建图像">
    从仓库根目录执行：

    ```bash
    ./scripts/docker/setup.sh
    ```

    这会在本地将网关映像构建为 `openclaw:local`。要使用预构建的图像来代替：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    预构建镜像会首先发布到 [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。GHCR 是发布自动化、固定部署和来源检查的主仓库。相同的发布也会在 Docker Hub 镜像仓库 `openclaw/openclaw` 上提供镜像：

    ```bash
    export OPENCLAW_IMAGE="openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    使用 `ghcr.io/openclaw/openclaw` 或 `openclaw/openclaw` 并避免非官方镜像，它们不共享 OpenClaw 的发布时间或保留策略。版本特定的标签包括 `2026.9.3` 等发行版和 `2026.9.1-beta.1` 等预发行版。稳定版本移动`latest`和`main`；过去一个月的网关版本仅移动 `extended-stable`。变体包括 `slim`、`main-slim`、`extended-stable-slim`、`latest-browser`、`main-browser` 和 `extended-stable-browser`。默认映像捆绑 `codex` 和 `diagnostics-otel` 插件。 `-browser` 变体还附带为 [ 网关控制的浏览器 ](/install/docker#using-the-control-ui-browser) 烘焙的 Chromium。代理沙箱浏览器使用单独的图像。

  </Step>

  <Step id="airgapped-rerun" title="气隙重新运行">
    在离线主机上，请先传输并加载镜像：

    ```bash
    docker load -i openclaw-image.tar
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh --offline
    ```

    `--offline` 验证 `OPENCLAW_IMAGE` 已在本地存在，禁用隐式 Compose pulls/builds，然后运行正常流程：`.env` 同步、权限修复、载入、网关配置同步、Compose 启动。

    如果是 `OPENCLAW_SANDBOX=1`，离线安装还会检查 `OPENCLAW_DOCKER_SOCKET` 后面的守护进程上配置的默认沙箱映像和每个代理沙箱映像，包括 Docker- 支持的浏览器映像上的浏览器合同标签。如果所需的映像丢失或过时，安装程​​序将退出而不更改沙箱配置，而不是报告失败的成功。

  </Step>

  <Step id="complete-onboarding" title="完成入门引导">
    设置脚本会自动运行引导：

    - 提示输入提供方 API 密钥
    - 生成网关令牌并将其写入`.env`
    - 创建旧版身份验证配置文件密钥目录
    - 通过 Docker Compose 启动网关

    预启动载入和配置写入直接通过 `openclaw-gateway` 运行（使用 `--no-deps --entrypoint node`），因为 `openclaw-cli` 共享网关的网络命名空间，并且仅在网关容器存在时才起作用。

  </Step>

  <Step id="open-the-control-ui" title="打开 Control UI">
    打开 `http://127.0.0.1:18789/`，并将写入 `.env` 的令牌粘贴到“设置”中。如果你把容器切换为密码认证，则改用该密码。

    需要再次获取 URL？

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

    使用自定义`OPENCLAW_GATEWAY_PORT`，将打印的URL中的端口`18789`替换为您的主机端口，然后在浏览器中打开它；保持 URL 的其余部分完好无损。任一容器内的仪表板命令都使用内部侦听器端口。

  </Step>

  <Step id="configure-channels-optional" title="配置通道（可选）">
    ```bash
    # WhatsApp (QR)
    docker compose run --rm openclaw-cli channels login

    # Telegram
    docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"

    # Discord
    docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
    ```

    文档：[WhatsApp](/channels/whatsapp)、[Telegram](/channels/telegram)、[Discord](/channels/discord)

  </Step>
</Steps>

### <a id="using-the-control-ui-browser"></a> 使用Control UI浏览器

这[控制UI浏览器面板](/web/control-ui/panels#browser-panel)显示由网关控制的浏览器。它与笔记本电脑或手机上打开仪表板的浏览器是分开的。对于具有以下功能的本地托管浏览器Docker网关，Chromium必须可用**在网关容器内**。

对于新安装，请使用带有正常 Compose 设置的官方浏览器映像；不需要自定义 Dockerfile：

```bash
export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest-browser"
./scripts/docker/setup.sh
```

对于固定部署，请选择版本的 `-browser` 标签，而不是移动的 `latest-browser` 标签。对于现有的 Compose 安装，请将 `.env` 中的 `OPENCLAW_IMAGE` 更改为浏览器变体，然后使用与当前部署相同的 Compose 文件和覆盖来拉取并重新创建网关：

```bash
docker compose pull openclaw-gateway openclaw-cli
docker compose up -d openclaw-gateway
```

保留现有的卷、端口和其他设置。不要使用空 shell 环境重新运行安装程序来仅更改映像：安装程序会从当前 shell 和默认值重写 `.env`。

覆盖 `/home/node/.cache/ms-playwright` 的现有主卷或绑定安装可以隐藏映像的捆绑 Chromium。如果镜像切换后浏览器发现仍然失败，请检查这些安装。保留数据，然后在安装的主页中配置 Chromium 或调整安装以使图像的浏览器缓存可见；重新创建容器不会刷新已填充的主卷。

对于从本地源构建进行的新安装，请将 Chromium 烘焙到映像中：

```bash
OPENCLAW_IMAGE=openclaw:local OPENCLAW_INSTALL_BROWSER=1 ./scripts/docker/setup.sh
```

此构建时选项安装 Chromium 和 Xvfb；将其设置在已构建的容器上不会安装浏览器。

该图像提供 Chromium，不能替代您的浏览器配置：

- 保持浏览器控制启用（`browser.enabled`）。对容器的 Chromium 使用本地托管配置文件（例如 `openclaw`），而不是用于其他浏览器的扩展、仅附加或远程 CDP 配置文件。
- OpenClaw 自动检测 Linux 上映像的 Playwright- 管理的 Chromium。显式 `browser.executablePath` 或配置文件可执行路径必须指向容器内的二进制文件；您笔记本电脑上的路径在那里不起作用。
- A 无头容器需要无头浏览器操作。如果启动报告缺少显示，请检查显式 `browser.headless`、配置文件无头设置和 `OPENCLAW_BROWSER_HEADLESS` 覆盖。请参阅 [ 浏览器配置](/tools/browser-control)。
- 与 `operator.admin` 连接访问广告 `browser.request` 的网关。在聊天侧面板中打开 **+ → Browser**，导航到页面，并确认其快照加载和导航正常。单独加载仪表板并不能验证 Chromium 是否可以启动。

这不是沙盒代理会话使用的单独的 [ 沙盒浏览器 ](/gateway/sandboxing#sandboxed-browser) 容器。选择网关 `-browser` 映像不会构建或配置该沙箱映像。

### <a id="headless-bootstrap"></a> 无头引导

对于无人值守的容器主机，请将提供方、Gateway 和通道凭据放入 Compose `.env` 文件中，这样一次性引导容器和长期运行的 Gateway 都能接收相同的值：

```bash
OPENAI_API_KEY=<provider-key>
OPENCLAW_GATEWAY_TOKEN=<gateway-token>
TELEGRAM_BOT_TOKEN=<bot-token>
```

在没有伪 TTY 的情况下运行引导和通道配置，然后启动 Gateway：

```bash
docker compose run -T --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN \
  --skip-channels \
  --no-install-daemon
docker compose run -T --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js channels add --channel telegram --use-env
docker compose up -d openclaw-gateway
```

如果插件声明的环境变量缺失，通道命令会在更改配置前失败。引导后请将 `TELEGRAM_BOT_TOKEN` 保留在 `.env` 中：`--use-env` 会将凭据查找留给环境，而不会将令牌复制到 `openclaw.json` 中，运行中的 Gateway 也需要相同的变量。启动后通道配置发生变化时，Gateway 的配置监视器会自动热重载受影响的通道。

请参阅 [`openclaw channels`](/cli/channels)，了解凭据标志替代方案和其他通道插件。

### <a id="manual-flow"></a> 手动流程

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
从存储库根目录运行 `docker compose`。如果启用了 `OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，则安装脚本会写入 `docker-compose.extra.yml`；将其包含在您自己维护的任何 `docker-compose.override.yml` e.g. `-f docker-compose.yml -f docker-compose.override.yml -f docker-compose.extra.yml` 之后。
</Note>

### <a id="upgrading-container-images"></a> 升级容器镜像

当您替换 OpenClaw 映像但保留相同安装的 state/config 时，映像入口点会在启动网关之前在独占维护所有权下运行 `openclaw doctor --fix --non-interactive`。这涵盖了默认图像命令和 Compose 的前台 Gateway 命令，包括其选定的配置文件。常规映像升级不需要单独的医生通行证。

Doctor 第一次在容器中捕获时，激活会在 `<state-dir>.update-captures/` 下保留本地状态的完整修复前副本。稍后启动同一容器（`docker stop`/`docker start`、重新启动策略、主机重新启动）仍会运行 Doctor 修复通行证，但会跳过该重复的完整副本，保留它，并且仍会停用超过 30 天的其他 Doctor 副本；特定于修复的备份仍然适用。如果捕获失败，则下次启动时会重试。新映像、重新创建的容器或 `/tmp` 在重新启动后不会持续存在的容器会再次捕获。

在较旧的 Linux 主机（例如 Synology DSM）上，不可用的 `openat2` 系统调用可以使较旧的映像报告另一个网关甚至拥有空状态卷。当前镜像使用受保护的文件系统后备；保持本机文件系统检查启用。 Doctor 报告底层的锁定失败和恢复操作，而不是将每个获取错误视为活动网关。权限错误需要容器用户的可写状态挂载。如果文件系统无法为状态所有权提供独占文件创建，请停止 OpenClaw，备份其状态，并将状态卷移动到支持它的本地文件系统。普通数据库事务在该卷上使用 SQLite 锁定。不要删除状态或锁定文件来绕过所有权。

其他CLI命令和帮助通过不变。如果您替换映像的入口点，请在启动网关之前针对相同安装的 state/config 运行 Doctor；自定义入口点绕过此激活步骤。

这包括代理数据库架构升级、共享状态审核迁移和旧工作区设置导入。在推进数据库架构之前，Doctor 将经过验证的 SQLite 副本保存在原始文件旁边，命名为 `<database>.pre-startup-migration-<id>.bak`。完全声明的表迁移可能会使用 `.scoped.bak` 存档；使用 `openclaw database restore-migration-backup` 恢复那些，切勿通过替换数据库文件。请参阅 [ 声明的迁移范围](/reference/database-schemas/versioning#declared-migration-backup-scopes)。共享数据库和受影响的代理数据库使用相同的备份 ID。配置备份和停用的工作区文件存档遵循正常的 Doctor 修复规则。将这些文件与升级前的备份一起保存；回滚必须恢复匹配状态以及旧映像。请参见 [rollback](/install/updating#rollback)。

使用相同的候选构建、数据库文件和目标模式重试，可以验证并重用完整数据库清单的第一个完成的备份组，包括在部分完成的迁移之后。临时 `.bak.capturing` 文件记录未完成的捕获，并在迁移开始之前永久删除。重新捕获中断的捕获；已完成组中丢失或损坏的成员会停止迁移并保留幸存的快照以供恢复。因此，重复失败的尝试不会每次都创建另一个完整备份组。较旧的备份组仍可用于操作员管理的回滚。医生将这些原件记录为 `openclaw update cleanup --dry-run`。它们将一直受到保护，直到 Doctor 验证迁移已完成并且稍后的更新已成功完成。在您确认后，清理可以取消记录的组。较旧的未录制 `.bak` 文件被列为受保护。当您仍然需要匹配的回滚时，将这些文件与升级前的备份一起保留。

在 FUSE 文件系统（例如 Unraid 的 `shfs`）上，当支持相同目录硬链接时，丢失的本机无替换重命名不需要本机 `auto` 模式下的操作步骤。 fs-safe 通过独占硬链接发布和取消链接保留源 inode 和字节。本机 `require` 模式仍然拒绝不支持的原语。 Doctor 恢复中断的 source/claim 对，而无需替换另一个文件。其单独的缺失addon/native-off兼容性路径在删除旧名称之前同步源和目录；本机移动不保证每次移动崩溃的持久性。档案强化和持久恢复检查点仍归 Doctor 所有。 SQLite 备份验证在 FUSE 修改或更改时间戳漂移时重新检查快照字节，同时仍然拒绝更改的内容或文件标识。

当默认或系统代理数据库被拒绝时，就绪状态仍然为假，并且就绪响应包括准入原因。被拒绝的可选代理保持隔离状态，而健康的代理可以处理请求。

在会话启动完成之前，架构迁移所有者会重建丢失或漂移的所需 SQLite 索引。修复警告标识代理、数据库路径、重建索引和已用时间。当前架构形状拒绝报告按稳定路径顺序列出所有受影响的数据库。缺少所需的表、不兼容的列以及其他无法安全重建的更改仍然需要Doctor；启动时不会将丢失的数据表重新创建为空表。

在没有文件创建时间戳的 Linux 主机上，正常的 SQLite 写入和权限修复可能会更改报告的文件生成时间。这些更改不会使打开的数据库失效；实际的文件替换仍然会停止准入。

当无法安全迁移所需状态时，启动会退出并显示代码 `78`：例如，源身份冲突、数据不可读、另一个写入者拥有该状态，或者文件系统没有提供安全、持久的方式来发布声明。保留的源、声明和备份是恢复输入；不要删除它们来消除错误。如果文件系统缺少所需的原语，请停止网关并在重试之前通过其本机支持文件系统公开相同的数据（例如，Unraid 池路径而不是 `shfs` 共享）。

使用重新启动策略，Docker、Podman 或 Kubernetes 可能会显示网关容器正在重新启动。保留已挂载的状态卷，然后使用 `openclaw doctor --fix` 作为容器命令运行相同的映像一次，使用网关使用的相同 state/config 挂载：

```bash
docker run --rm -v <openclaw-state>:/home/node/.openclaw <image> openclaw doctor --fix
podman run --rm -v <openclaw-state>:/home/node/.openclaw <image> openclaw doctor --fix
```

doctor 完成后，使用默认命令重新启动 Gateway 容器。在 Kubernetes 中，在安装到同一 PVC 的一次性作业或调试 Pod 中运行相同的命令，然后重新启动 Deployment 或 StatefulSet。

容器再次运行后，针对相同的安装状态运行只读部署预检：

```bash
docker compose run --rm openclaw-cli doctor --json
```

### <a id="source-built-images-with-selected-plugins"></a> 使用所选插件的源码构建镜像

`OPENCLAW_EXTENSIONS` 从源结帐中选择插件清单 id；当现有的源目录名称不同时，也可以接受它们。 Docker 构建将选择解析为源目录一次，安装生产依赖项，将每个选定插件自己的运行时依赖项链接到 `/app/dist/extensions/<id>` 中其打包根目录下，并将选定的插件运行时包含在映像中。源代码检查还编译与 `openclaw.build.bundledDist: false` 单独发布的第一方插件；该标记仍然保留插件的外部 npm 或 ClawHub 所有权，并且不会更改任何工件合同。未知、无效或不明确的 ID 会导致映像构建失败。这包括 WhatsApp：`OPENCLAW_EXTENSIONS=whatsapp` 编译并打包其运行时。普通源构建通过单独的外部插件构建路径生成其运行时； root npm 工件继续排除它。所选插件必须编译成功；未选择的外部插件源和运行时输出将被修剪。

安装层暂存每个工作区的 `package.json`，因此冻结锁定文件验证可以检查整个工作区。构建阶段安装编译插件资源所需的工作区依赖项；生产阶段仅安装核心、共享包以及必需或选定的插件。暂存插件清单不会为运行时映像选择该插件。

例如，这些命令为 ClickClack、Slack 和 Microsoft Teams 构建单独的多架构独立 FakeCo 网关映像。 ClawRouter 已经是根 OpenClaw 运行时的一部分，因此 ClickClack 映像仅选择 `clickclack`。显式的空浏览器参数使默认图像不受 Chromium 的影响：

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

使用 `--platform linux/arm64 --load` 或 `--platform linux/amd64 --load` 进行单个本机本地构建。多平台输出和附加的 SBOM/provenance 需要注册表或另一个保留证明的 Buildx 输出。推送后，检查清单并部署不可变摘要而不是可变 source-SHA 标签：

```bash
docker buildx imagetools inspect \
  "${REGISTRY}/openclaw-clickclack:${SOURCE_SHA}"
# Deploy: registry.example.com/fakeco/openclaw-clickclack@sha256:<manifest-digest>
```

这些映像适用于基于 OCI- 的独立网关和通用 Docker 用户。 Crabhelm 管理的网关不使用它们：该交付路径构建一个单独的 x86_64 设备存档，其中包含 OpenClaw npm tarball 并固定 Node、存档和清单摘要。独立于相同的已登陆 OpenClaw 源构建该设备。

要针对打包映像测试捆绑插件源，请将一个插件源目录挂载到其打包源路径 e.g. `OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro` 上。这会覆盖相同插件 ID 的匹配编译 `/app/dist/extensions/synology-chat` 包。添加或更改挂载后重新启动网关；运行时加载和设置使用已安装的源。

### <a id="observability"></a> 可观测性

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

### <a id="health-checks"></a> 健康检查

容器检查端点（无需身份验证）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/startupz  # startup and traffic admission
curl -fsS http://127.0.0.1:18789/readyz    # deep, channel-aware readiness
```

镜像的内置`HEALTHCHECK` ping `/healthz`；重复的失败会将容器标记为 `unhealthy`，以便编排器可以重新启动或替换它。使用 `/startupz` 进行协调器启动或准备情况检查，以便失败的通道帐户不会从服务中删除其他正常的网关和 Control UI。使用 `/readyz` 进行监视，故意将硬通道故障视为未就绪。请参阅 [ 运行状况检查 ](/gateway/health#http-probes) 了解响应详细信息。

已认证的深度健康快照：

```bash
docker compose exec openclaw-gateway sh -lc 'node dist/index.js gateway health --token "$OPENCLAW_GATEWAY_TOKEN"'
```

## <a id="detailed-topics"></a> 详细主题

<CardGroup cols={2}>
  <Card title="环境变量" href="/install/docker/environment-variables" icon="gear">
    完整的变量表、apt/pip 构建附加功能以及构建内存调整。
  </Card>
  <Card title="网络和存储" href="/install/docker/networking-and-storage" icon="server">
    LAN 与环回、host.docker.internal、Claude CLI、Bonjour 和安装状态。
  </Card>
  <Card title="组合操作" href="/install/docker/compose-operations" icon="terminal">
    编写命令表、sandbox/CI/DNS/EACCES 手风琴和图像刷新。
  </Card>
  <Card title="沙箱和故障排除" href="/install/docker/sandbox-and-troubleshooting" icon="shield">
    启用代理沙箱以及 Docker 故障排除手风琴。
  </Card>
</CardGroup>

- <a id="environment-variables" />[环境变量](/install/docker/environment-variables#environment-variables)
- <a id="lan-vs-loopback" />[LAN 与环回](/install/docker/networking-and-storage#lan-vs-loopback)
- <a id="host-local-providers" />[主机本地提供商](/install/docker/networking-and-storage#host-local-providers)
- <a id="claude-cli-backend-in-docker" />[Claude CLI Docker](/install/docker/networking-and-storage#claude-cli-backend-in-docker) 后端
- <a id="bonjour-%2F-mdns" /><a id="bonjour-/-mdns" />[Bonjour / mDNS](/install/docker/networking-and-storage#bonjour-%2F-mdns)
- <a id="storage-and-persistence" />[存储和持久性](/install/docker/networking-and-storage#storage-and-persistence)
- <a id="clawdock-migration" />[ClawDock迁移](/install/docker/compose-operations#clawdock-migration)
  - <a id="enable-agent-sandbox-for-docker-gateway" />[为 Docker 网关启用代理沙箱](/install/docker/compose-operations#enable-agent-sandbox-for-docker-gateway)
  - <a id="automation-ci-non-interactive" />[自动化/CI（非交互式）](/install/docker/compose-operations#automation-ci-non-interactive)
  - <a id="shared-network-security-note" />[共享网络安全说明](/install/docker/compose-operations#shared-network-security-note)
  - <a id="docker-desktop-dns-failures-in-openclaw-cli" />[Docker Desktop DNS openclaw-cli 中的故障](/install/docker/compose-operations#docker-desktop-dns-failures-in-openclaw-cli)
  - <a id="permissions-and-eacces" />[权限和EACCES](/install/docker/compose-operations#permissions-and-eacces)
  - <a id="faster-rebuilds" />[更快重建](/install/docker/compose-operations#faster-rebuilds)
  - <a id="power-user-container-options" />[高级用户容器选项](/install/docker/compose-operations#power-user-container-options)
  - <a id="openai-codex-oauth-headless-docker" />[OpenAI Codex OAuth（无头Docker）](/install/docker/compose-operations#openai-codex-oauth-headless-docker)
  - <a id="base-image-metadata" />[基础图像元数据](/install/docker/compose-operations#base-image-metadata)
- <a id="image-contents-and-security-scanning" />[图像内容和安全扫描](/install/docker/compose-operations#image-contents-and-security-scanning)
- <a id="weekly-image-refreshes" />[每周图像刷新](/install/docker/compose-operations#weekly-image-refreshes)
- <a id="running-on-a-vps%3F" /><a id="running-on-a-vps" />[在 VPS？](/install/docker/compose-operations#running-on-a-vps%3F) 上运行
- <a id="agent-sandbox" />[代理沙箱](/install/docker/sandbox-and-troubleshooting#agent-sandbox)
  - <a id="quick-enable" />[快速启用](/install/docker/sandbox-and-troubleshooting#quick-enable)
- <a id="troubleshooting" />[故障排除](/install/docker/sandbox-and-troubleshooting#troubleshooting)
  - <a id="image-missing-or-sandbox-container-not-starting" />[图像丢失或沙箱容器未启动](/install/docker/sandbox-and-troubleshooting#image-missing-or-sandbox-container-not-starting)
  - <a id="permission-errors-in-sandbox" />[沙箱中的权限错误](/install/docker/sandbox-and-troubleshooting#permission-errors-in-sandbox)
  - <a id="custom-tools-not-found-in-sandbox" />[沙箱中未找到自定义工具](/install/docker/sandbox-and-troubleshooting#custom-tools-not-found-in-sandbox)
  - <a id="oom-killed-during-image-build-exit-137" />[OOM- 在映像构建期间被杀死（退出 137）](/install/docker/sandbox-and-troubleshooting#oom-killed-during-image-build-exit-137)
  - <a id="unauthorized-or-pairing-required-in-control-ui" />[ Control 中未经授权或需要配对 UI](/install/docker/sandbox-and-troubleshooting#unauthorized-or-pairing-required-in-control-ui)
  - <a id="gateway-target-shows-ws-172-x-x-x-or-pairing-errors-from-docker-cli" />[Gateway 目标显示 ws：//172.x.x.x 或来自 Docker CLI](/install/docker/sandbox-and-troubleshooting#gateway-target-shows-ws-172-x-x-x-or-pairing-errors-from-docker-cli) 的配对错误

## <a id="related"></a> 相关内容

- [Install Overview](/install) — 所有安装方法
- [Podman](/install/podman) — Podman 替代 Docker
- [Kubernetes](/install/kubernetes) — 在集群上运行网关的最小 Kustomize 起点
- [Ansible](/install/ansible) — 使用 Tailscale VPN 和防火墙隔离进行自动化服务器部署
- [Cloudflare Containers](/install/cloudflare) — 实验性 Worker 加容器部署，并使用 Litestream 备份到 R2
- [更新](/install/updating) — 保持 OpenClaw 为最新版本
- [Configuration](/gateway/configuration) — 安装后的网关配置
