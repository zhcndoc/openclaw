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

- **适合**：您想要一个隔离的、可丢弃的网关环境，或者需要在没有本地安装的主机上运行 OpenClaw。
- **不适合**：您在自己的机器上运行，并且只想要最快的开发循环，应该使用正常的安装流程。
- **沙箱说明**：agent 沙箱也使用 Docker，但**不**要求整个网关都运行在 Docker 中。详见 [沙箱](/gateway/sandboxing)。

本指南涵盖：

- 容器化网关（完整 OpenClaw Docker 镜像）
- 每会话 Agent 沙箱（主机网关 + Docker 隔离的工具）

沙箱详情：[沙箱](/gateway/sandboxing)

## 需求

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 镜像构建至少需要 2 GB 内存（1 GB 主机会因为内存不足被 `pnpm install` 进程以 exit 137 退出）
- 足够的磁盘空间用于镜像和日志
- 如果运行在 VPS/公共主机上，请查看
  [网络暴露的安全加固](/gateway/security#04-network-exposure-bind--port--firewall)，尤其是 Docker `DOCKER-USER` 防火墙策略。

## 容器化网关（Docker Compose）

### 快速开始（推荐）

<Note>
此处的 Docker 默认绑定模式假设为绑定模式（`lan`/`loopback`），而非主机别名。
请在 `gateway.bind` 中使用绑定模式值（例如 `lan` 或 `loopback`），不要使用主机别名如 `0.0.0.0` 或 `localhost`。
</Note>

在仓库根目录执行：

```bash
./docker-setup.sh
```

该脚本会：

- 构建本地网关镜像（如果设置了 `OPENCLAW_IMAGE`，则拉取远程镜像）
- 运行入门引导
- 打印可选的提供商设置提示
- 通过 Docker Compose 启动网关
- 生成网关令牌并写入 `.env`

可选环境变量：

- `OPENCLAW_IMAGE` — 使用远程镜像代替本地构建（例如 `ghcr.io/openclaw/openclaw:latest`）
- `OPENCLAW_DOCKER_APT_PACKAGES` — 构建期间安装额外的 apt 软件包
- `OPENCLAW_EXTENSIONS` — 构建时预安装扩展依赖（空格分隔的扩展名，例如 `diagnostics-otel matrix`）
- `OPENCLAW_EXTRA_MOUNTS` — 添加额外的主机绑定挂载
- `OPENCLAW_HOME_VOLUME` — 使用命名卷持久化 `/home/node`
- `OPENCLAW_SANDBOX` — 选择启用 Docker 网关沙箱引导，仅当值明确为 `1`、`true`、`yes`、`on` 时启用
- `OPENCLAW_INSTALL_DOCKER_CLI` — 本地镜像构建时的构建参数传递（`1` 表示在镜像中安装 Docker CLI）。当本地构建且 `OPENCLAW_SANDBOX=1` 时，`docker-setup.sh` 会自动设置
- `OPENCLAW_DOCKER_SOCKET` — 覆盖 Docker 套接字路径（默认使用 `DOCKER_HOST=unix://...` 路径，否则 `/var/run/docker.sock`）
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` — 破窗措施：允许 CLI/入门客户端路径使用可信私有网络内的 `ws://` 目标（默认仅限 loopback）
- `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` — 禁用容器浏览器强化标志 `--disable-3d-apis`, `--disable-software-rasterizer`, `--disable-gpu`，当您需要 WebGL/3D 兼容性时使用
- `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` — 当浏览器流程需要扩展时，保持扩展启用（默认沙箱浏览器中禁用扩展）
- `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` — 设置 Chromium 渲染进程限制；设置为 `0` 表示跳过该标志，使用 Chromium 默认行为

完成后：

- 在浏览器打开 `http://127.0.0.1:18789/`
- 将令牌粘贴到控制界面（设置 → 令牌）
- 需要再次获取 URL？运行 `docker compose run --rm openclaw-cli dashboard --no-open`

### 为 Docker 网关启用 Agent 沙箱（可选）

`docker-setup.sh` 也可以为 Docker 部署引导 `agents.defaults.sandbox.*`。

启用方式：

```bash
export OPENCLAW_SANDBOX=1
./docker-setup.sh
```

自定义 Docker 套接字路径（例如无 root 权限 Docker）：

```bash
export OPENCLAW_SANDBOX=1
export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
./docker-setup.sh
```

注意：

- 脚本仅在沙箱前置条件通过后挂载 `docker.sock`。
- 如果无法完成沙箱设置，脚本会重置 `agents.defaults.sandbox.mode` 为 `off` ，以避免重跑时使用已有/损坏的沙箱配置。
- 如果缺少 `Dockerfile.sandbox`，脚本会打印警告并继续；如需要，请使用 `scripts/sandbox-setup.sh` 构建 `openclaw-sandbox:bookworm-slim`。
- 对于非本地的 `OPENCLAW_IMAGE`，镜像必须预包含用于沙箱执行的 Docker CLI 支持。

### 自动化/CI（非交互，关闭伪 TTY 输出）

针对脚本和 CI，使用 `-T` 禁用 Compose 伪终端分配：

```bash
docker compose run -T --rm openclaw-cli gateway probe
docker compose run -T --rm openclaw-cli devices list --json
```

如果自动化流程不导出 Claude 会话变量，`docker-compose.yml` 默认将其解析为空，避免重复出现“变量未设置”的警告。

### 共享网络安全提示（CLI + 网关）

`openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，使 CLI 命令能够通过 Docker 中的 `127.0.0.1` 可靠访问网关。

请将其视为共享的信任边界：loopback 绑定并不代表容器间隔离。如果需要更强隔离，应从别的容器或主机网络路径执行命令，而非使用捆绑的 `openclaw-cli` 服务。

为了减少 CLI 进程被攻破时的影响，compose 配置为 `openclaw-cli` 丢弃 `NET_RAW`/`NET_ADMIN` 能力并启用 `no-new-privileges`。

CLI 将配置和工作区写入主机：

- `~/.openclaw/`
- `~/.openclaw/workspace`

运行于 VPS？参见 [Hetzner (Docker VPS)](/install/hetzner)。

### 使用远程镜像（跳过本地构建）

官方预构建镜像发布于：

- [GitHub Container Registry 包](https://github.com/openclaw/openclaw/pkgs/container/openclaw)

使用镜像名 `ghcr.io/openclaw/openclaw`（非相似的 Docker Hub 镜像）。

常用标签：

- `main` — `main` 分支的最新构建
- `<version>` — 发布版本标签构建（例如 `2026.2.26`）
- `latest` — 最新稳定发布标签

### 基础镜像元数据

主 Docker 镜像当前使用：

- `node:24-bookworm`

Docker 镜像现在发布 OCI 基础镜像注释（sha256 是一个示例，并指向该标签的固定多架构清单列表）：

- `org.opencontainers.image.base.name=docker.io/library/node:24-bookworm`
- `org.opencontainers.image.base.digest=sha256:3a09aa6354567619221ef6c45a5051b671f953f0a1924d1f819ffb236e520e6b`
- `org.opencontainers.image.source=https://github.com/openclaw/openclaw`
- `org.opencontainers.image.url=https://openclaw.ai`
- `org.opencontainers.image.documentation=https://docs.openclaw.ai/install/docker`
- `org.opencontainers.image.licenses=MIT`
- `org.opencontainers.image.title=OpenClaw`
- `org.opencontainers.image.description=OpenClaw 网关与 CLI 运行时容器镜像`
- `org.opencontainers.image.revision=<git-sha>`
- `org.opencontainers.image.version=<tag-or-main>`
- `org.opencontainers.image.created=<rfc3339 时间戳>`

参考：[OCI 镜像注解](https://github.com/opencontainers/image-spec/blob/main/annotations.md)

发布背景：本仓库有标记的历史版本自 `v2026.2.22` 及更早的 2026 标签（例如 `v2026.2.21`，`v2026.2.9`）已使用 Bookworm。

默认情况下，设置脚本从源码构建镜像。若想拉取预构建镜像，请在运行脚本前设置 `OPENCLAW_IMAGE`：

```bash
export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
./docker-setup.sh
```

脚本会检测到 `OPENCLAW_IMAGE` 非默认值 `openclaw:local`，改为执行 `docker pull` 而非 `docker build`。其余（入门、网关启动、令牌生成）流程相同。

`docker-setup.sh` 仍需在仓库根目录运行，因为它利用了本地的 `docker-compose.yml` 和辅助文件。`OPENCLAW_IMAGE` 只跳过本地构建时间，不替代 compose/设置流程。

### Shell 辅助工具（可选）

为便于日常 Docker 管理，安装 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/shell-helpers/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
```

**添加至您的 shell 配置（zsh 示例）：**

```bash
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

然后可使用 `clawdock-start`, `clawdock-stop`, `clawdock-dashboard` 等命令。运行 `clawdock-help` 查看全部命令。

详情参见 [`ClawDock` 辅助工具 README](https://github.com/openclaw/openclaw/blob/main/scripts/shell-helpers/README.md)。

### 手动流程（Compose）

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm openclaw-cli onboard
docker compose up -d openclaw-gateway
```

注意：从仓库根目录运行 `docker compose ...`。如果启用了 `OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，setup 脚本会写入 `docker-compose.extra.yml`，在其他命令中需一并包含：

```bash
docker compose -f docker-compose.yml -f docker-compose.extra.yml <命令>
```

### 控制界面令牌 + 配对（Docker）

若出现“unauthorized”或“disconnected (1008): pairing required”，请获取新的仪表盘链接并批准浏览器设备：

```bash
docker compose run --rm openclaw-cli dashboard --no-open
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

更多详情：[仪表盘](/web/dashboard), [设备](/cli/devices)。

### 附加挂载（可选）

若想在容器中挂载额外主机目录，可在运行 `docker-setup.sh` 前设置 `OPENCLAW_EXTRA_MOUNTS`，支持逗号分隔的 Docker 绑定挂载列表，自动应用到 `openclaw-gateway` 和 `openclaw-cli`，生成 `docker-compose.extra.yml`。

示例：

```bash
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

注意：

- 路径在 macOS/Windows 上必须共享给 Docker Desktop。
- 每项须为 `source:target[:options]`，不能有空格、制表符或换行。
- 修改 `OPENCLAW_EXTRA_MOUNTS` 后需重新运行 setup 脚本生成新 compose 文件。
- `docker-compose.extra.yml` 为生成文件，不建议手动编辑。

### 持久化整个容器 home 目录（可选）

如果希望 `/home/node` 在容器重建时保持持久，设置命名卷 `OPENCLAW_HOME_VOLUME`。这会创建 Docker 卷，并挂载到 `/home/node`，同时保留标准配置/工作区绑定挂载。此处请使用命名卷（非绑定路径），绑定路径使用 `OPENCLAW_EXTRA_MOUNTS`。

示例：

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
./docker-setup.sh
```

可以与额外挂载结合：

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

注意：

- 命名卷名称必须匹配 `^[A-Za-z0-9][A-Za-z0-9_.-]*$`。
- 更改 `OPENCLAW_HOME_VOLUME` 后需重新运行 setup 脚本。
- 命名卷会一直存在，直到使用 `docker volume rm <name>` 删除。

### 安装额外 apt 软件包（可选）

如果需要在镜像内安装系统包（比如构建工具或多媒体库），可在运行 `docker-setup.sh` 前设置 `OPENCLAW_DOCKER_APT_PACKAGES`，镜像构建过程中安装，容器删除后仍然保留。

示例：

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="ffmpeg build-essential"
./docker-setup.sh
```

注意：

- 支持空格分隔的 apt 包名列表。
- 修改后需重新运行 setup 脚本以重建镜像。

### 预安装扩展依赖（可选）

带有自己 `package.json` 的扩展（如 `diagnostics-otel`、`matrix`、`msteams`）首次加载时会安装 npm 依赖。若想将这些依赖烘焙进镜像，请在运行 `docker-setup.sh` 前设置 `OPENCLAW_EXTENSIONS`：

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel matrix"
./docker-setup.sh
```

或直接构建时：

```bash
docker build --build-arg OPENCLAW_EXTENSIONS="diagnostics-otel matrix" .
```

注意事项：

- 该参数接受空格分隔的扩展目录名（位于 `extensions/` 下）。
- 仅影响含有 `package.json` 的扩展；无 `package.json` 的轻量插件忽略。
- 更改 `OPENCLAW_EXTENSIONS` 需重新运行 `docker-setup.sh` 重建镜像。

### 高级用户 / 全功能容器（可选）

默认 Docker 镜像为 **安全优先**，以非 root 用户 `node` 运行。这样攻击面较小，但限制如下：

- 运行时不能安装系统包
- 默认无 Homebrew
- 不包含 Chromium/Playwright 浏览器

若想获得更全功能容器，可使用以下选项：

1. **持久化 `/home/node`**，保存浏览器下载和工具缓存：

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
./docker-setup.sh
```

2. **将系统依赖烘焙进镜像**（可重复且持久）：

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"
./docker-setup.sh
```

3. **无需 `npx` 安装 Playwright 浏览器**（避免 npm 冲突）：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

如果 Playwright 需安装系统依赖，请用 `OPENCLAW_DOCKER_APT_PACKAGES` 重建镜像，不建议运行时使用 `--with-deps`。

4. **持久化 Playwright 浏览器下载**：

- 在 `docker-compose.yml` 中设置 `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright`
- 通过 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，或使用 `OPENCLAW_EXTRA_MOUNTS` 挂载 `/home/node/.cache/ms-playwright`

### 权限问题 + EACCES

镜像以 `node` 用户（uid 1000）运行。若看到 `/home/node/.openclaw` 权限错误，请确保主机绑定挂载的目录归属 uid 1000。

示例（Linux 主机）：

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

若选择 root 运行，需承受安全风险。

### 加快重建速度（推荐）

优化 Dockerfile 层次顺序，缓存依赖层，避免若无锁文件变更重复运行 `pnpm install`：

```dockerfile
FROM node:24-bookworm

# 安装 Bun（构建脚本依赖）
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

# 缓存依赖，除非 package.json 或锁文件变更
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

### 频道设置（可选）

使用 CLI 容器配置频道，必要时重启网关。

WhatsApp（二维码）：

```bash
docker compose run --rm openclaw-cli channels login
```

Telegram（机器人令牌）：

```bash
docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"
```

Discord（机器人令牌）：

```bash
docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
```

文档：[WhatsApp](/channels/whatsapp), [Telegram](/channels/telegram), [Discord](/channels/discord)

### OpenAI Codex OAuth（无头 Docker）

如果在向导中选择 OpenAI Codex OAuth，会打开浏览器 URL 并尝试捕获 `http://127.0.0.1:1455/auth/callback` 回调。在 Docker 或无头模式下，回调可能会显示浏览器错误。请复制跳转后的完整 URL 并粘贴回向导完成授权。

### 健康检查

容器探针端点（无需认证）：

```bash
curl -fsS http://127.0.0.1:18789/healthz
curl -fsS http://127.0.0.1:18789/readyz
```

别名：`/health` 和 `/ready`。

`/healthz` 是用于检测“网关进程是否启动”的浅层存活探针。  
`/readyz` 在启动宽限期内保持就绪状态，只有在宽限期后，若所需管理的频道仍然断开连接，或者之后断开，才返回 `503`。

Docker 镜像内置 `HEALTHCHECK`，后台定期 ping `/healthz`，Docker 通过检测 OpenClaw 响应性维护容器状态。若多次失败，Docker 标记容器为 `unhealthy`，容器编排系统（Docker Compose 重启策略、Swarm、Kubernetes 等）可自动重启或替换。

认证的深度健康快照（网关 + 频道）：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### 端到端冒烟测试（Docker）

```bash
scripts/e2e/onboard-docker.sh
```

### 二维码导入冒烟测试（Docker）

```bash
pnpm test:docker:qr
```

### 局域网 vs loopback（Docker Compose）

`docker-setup.sh` 默认将 `OPENCLAW_GATEWAY_BIND=lan`，使主机能够通过 Docker 端口映射访问 `http://127.0.0.1:18789`。

- `lan`（默认）：主机浏览器和 CLI 可以访问发布的网关端口。
- `loopback`：仅容器内网络命名空间内的进程可访问网关，主机端口映射可能失效。

入门脚本完成后，会将 `gateway.mode` 设为 `local`，使 Docker CLI 命令默认通过本地 loopback 访问。

遗留配置提示：请使用 `gateway.bind` 中的绑定模式值（`lan` / `loopback` / `custom` / `tailnet` / `auto`），不要用主机别名（`0.0.0.0`，`127.0.0.1`，`localhost`，`::`，`::1`）。

若从 Docker CLI 命令看到 `Gateway target: ws://172.x.x.x:18789` 或多次出现 `pairing required` 错误，运行：

```bash
docker compose run --rm openclaw-cli config set gateway.mode local
docker compose run --rm openclaw-cli config set gateway.bind lan
docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
```

### 备注

- 网关绑定默认值为 `lan` 以便容器使用（环境变量 `OPENCLAW_GATEWAY_BIND`）。
- Dockerfile 的 CMD 使用 `--allow-unconfigured`，即使挂载的配置中 `gateway.mode` 非 `local` 也能启动。如需强制限制，请覆盖 CMD。
- 网关容器是会话的主数据源（`~/.openclaw/agents/<agentId>/sessions/`）。

## Agent 沙箱（主机网关 + Docker 工具）

深入了解：[沙箱](/gateway/sandboxing)

### 功能说明

启用 `agents.defaults.sandbox` 后，**非主会话**的工具运行在 Docker 容器内。网关保持在主机上，但工具执行隔离：

- 范围默认是 `"agent"`（每个 agent 一个容器 + 工作区）
- 可设置为 `"session"` 实现每会话隔离
- 每作用域的工作区文件夹挂载到 `/workspace`
- 可选择是否允许访问 agent 工作区（`agents.defaults.sandbox.workspaceAccess`）
- 允许/禁止的工具策略（禁止优先）
- 入站媒体会复制到当前沙箱工作区（`media/inbound/*`），工具可读取（当 `workspaceAccess: "rw"` 时，该数据位于 agent 工作区）

警告：若选 `scope: "shared"`，会禁用跨会话隔离，所有会话共用一容器一工作区。

### 多 agent 的每 agent 沙箱配置

多 agent 路由时，每个 agent 可覆盖沙箱及工具设置：`agents.list[].sandbox` 和 `agents.list[].tools`（包括 `agents.list[].tools.sandbox.tools`）。这允许在同一网关中混合访问级别：

- 完全访问（个人 agent）
- 只读工具 + 只读工作区（家庭／工作 agent）
- 无文件系统或 shell 工具（公共 agent）

示例、优先级及故障排查，参见 [多 Agent 沙箱及工具](/tools/multi-agent-sandbox-tools)。

### 默认行为

- 镜像：`openclaw-sandbox:bookworm-slim`
- 每 agent 一容器
- 默认 agent 工作区访问权限：`workspaceAccess: "none"`（使用 `~/.openclaw/sandboxes`）
  - `"ro"`：沙箱工作区挂载到 `/workspace`，agent 工作区只读挂载到 `/agent`（禁用写、编辑、应用补丁）
  - `"rw"`：agent 工作区读写挂载到 `/workspace`
- 自动清理：闲置 > 24 小时或年龄 > 7 天
- 网络：默认禁止（`none`，需显式选用才允许出网）
  - `host` 被屏蔽
  - `container:<id>` 默认也被屏蔽（防止命名空间加入风险）
- 默认允许操作：`exec`, `process`, `read`, `write`, `edit`, `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- 默认禁止操作：`browser`, `canvas`, `nodes`, `cron`, `discord`, `gateway`

### 启用沙箱

若计划在 `setupCommand` 中安装软件包，注意：

- 默认 `docker.network` 是 `"none"`（无出网）
- `"host"` 网络被禁止
- `container:<id>` 网络默认被禁止
- 破窗配置：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`
- `readOnlyRoot: true` 会阻止安装软件包
- 需以 root 用户安装 apt-get（省略 `user` 或设置为 `"0:0"`）
- 当 `setupCommand` 或 Docker 配置变化时，OpenClaw 会重建容器，除非容器 `最近已使用`（约 5 分钟内）
- 热容器会记录带重建命令的警告日志

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared (默认 agent)
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
        },
        prune: {
          idleHours: 24, // 0 禁用闲置清理
          maxAgeDays: 7, // 0 禁用最长寿命清理
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: [
          "exec",
          "process",
          "read",
          "write",
          "edit",
          "sessions_list",
          "sessions_history",
          "sessions_send",
          "sessions_spawn",
          "session_status",
        ],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

安全强化选项在 `agents.defaults.sandbox.docker` 下：

`network`, `user`, `pidsLimit`, `memory`, `memorySwap`, `cpus`, `ulimits`, `seccompProfile`, `apparmorProfile`, `dns`, `extraHosts`, `dangerouslyAllowContainerNamespaceJoin`（仅破窗用）。

多 agent：可通过 `agents.list[].sandbox.{docker,browser,prune}.*` 分别为各 agent 覆盖（`scope` 设为 `"shared"` 时忽略）。

### 构建默认沙箱镜像

```bash
scripts/sandbox-setup.sh
```

基于 `Dockerfile.sandbox` 构建 `openclaw-sandbox:bookworm-slim`。

### 通用沙箱镜像（可选）

如果需要包含 Node、Go、Rust 等常用构建工具的沙箱镜像，构建通用镜像：

```bash
scripts/sandbox-common-setup.sh
```

构建 `openclaw-sandbox-common:bookworm-slim`，使用示例如下：

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "openclaw-sandbox-common:bookworm-slim" } },
    },
  },
}
```

### 沙箱浏览器镜像

需在沙箱内部运行浏览器工具时，构建浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

基于 `Dockerfile.sandbox-browser` 构建 `openclaw-sandbox-browser:bookworm-slim`。该容器启用 Chromium CDP 和可选的 noVNC 观察者（通过 Xvfb 实现带界面）。

注意事项：

- Docker and other headless/container browser flows stay on raw CDP. Chrome MCP `existing-session` is for host-local Chrome, not container takeover.
- Headful (Xvfb) reduces bot blocking vs headless.
- Headless can still be used by setting `agents.defaults.sandbox.browser.headless=true`.
- No full desktop environment (GNOME) is needed; Xvfb provides the display.
- Browser containers default to a dedicated Docker network (`openclaw-sandbox-browser`) instead of global `bridge`.
- Optional `agents.defaults.sandbox.browser.cdpSourceRange` restricts container-edge CDP ingress by CIDR (for example `172.21.0.1/32`).
- noVNC observer access is password-protected by default; OpenClaw provides a short-lived observer token URL that serves a local bootstrap page and keeps the password in URL fragment (instead of URL query).
- Browser container startup defaults are conservative for shared/container workloads, including:
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=<基于 OPENCLAW_BROWSER_CDP_PORT 的端口>`
  - `--user-data-dir=${HOME}/.chrome`
  - `--no-first-run`
  - `--no-default-browser-check`
  - `--disable-3d-apis`
  - `--disable-software-rasterizer`
  - `--disable-gpu`
  - `--disable-dev-shm-usage`
  - `--disable-background-networking`
  - `--disable-features=TranslateUI`
  - `--disable-breakpad`
  - `--disable-crash-reporter`
  - `--metrics-recording-only`
  - `--renderer-process-limit=2`
  - `--no-zygote`
  - `--disable-extensions`
  - 如果设置了 `agents.defaults.sandbox.browser.noSandbox`，还会附加 `--no-sandbox` 和 `--disable-setuid-sandbox`
  - 上述三个图形强化标志是可选的。若需启用 WebGL/3D，请将 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
  - 扩展行为由 `--disable-extensions` 控制，若需启用扩展请设置 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0`，适用于依赖扩展的页面或流程。
  - `--renderer-process-limit=2` 可通过 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT` 配置；设为 0 表示使用 Chromium 默认。

这些默认开启于捆绑镜像，如需自定义 Chromium 标志，使用定制浏览器镜像并自定义 entrypoint。

配置方式：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: { enabled: true },
      },
    },
  },
}
```

自定义浏览器镜像：

```json5
{
  agents: {
    defaults: {
      sandbox: { browser: { image: "my-openclaw-browser" } },
    },
  },
}
```

启用后，agent 会获得：

- 沙箱浏览器控制 URL（用于 `browser` 工具）
- noVNC URL（若启用且非无头模式）

注意：若有工具白名单，需加入 `browser`，且从拒绝列表中移除，否则该工具仍被阻止。清理规则（`agents.defaults.sandbox.prune`）同样适用于浏览器容器。

### 自定义沙箱镜像

自行构建镜像并指向配置：

```bash
docker build -t my-openclaw-sbx -f Dockerfile.sandbox .
```

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "my-openclaw-sbx" } },
    },
  },
}
```

### 工具策略（允许/禁止）

- 禁止优先于允许。
- 若 `allow` 为空：所有工具（除拒绝）可用。
- 若 `allow` 非空：仅允许列表内工具可用（拒绝列表依旧禁止）。

### 清理策略

两个选项：

- `prune.idleHours`：清理闲置超过 X 小时的容器（0 禁用）
- `prune.maxAgeDays`：清理存在时间超过 X 天的容器（0 禁用）

示例：

- 保持活跃会话，限制运行时间：`idleHours: 24`, `maxAgeDays: 7`
- 永不清理：`idleHours: 0`, `maxAgeDays: 0`

### 安全提示

- 隔离墙仅对 **工具**（exec/read/write/edit/apply_patch）适用。
- 类似浏览器/摄像头/画布的主机工具默认被阻止。
- 允许 `browser` 工具**破坏隔离**（浏览器运行在主机上）。

## 故障排除

- 镜像缺失：使用 [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh) 构建或设置 `agents.defaults.sandbox.docker.image`。
- 容器未运行：按需自动在会话创建。
- 沙箱权限错误：设置 `docker.user` 为挂载工作区所属的 UID:GID，或更改工作区权限。
- 自定义工具找不到：OpenClaw 通过 `sh -lc` 运行，加载 `/etc/profile` 可能重置 PATH。请设置 `docker.env.PATH` 以预先添加工具路径（例如 `/custom/bin:/usr/local/share/npm-global/bin`），或在 Dockerfile 中添加脚本至 `/etc/profile.d/`。
