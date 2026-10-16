---
summary: "日常 Compose 命令、操作手风琴和图像维护"
read_when:
  - "您删除了 ClawDock 并且需要简单的 Compose 命令"
  - "您遇到 EACCES、DNS 或重建问题"
  - "您想知道发布的图片是如何刷新的"
title: "Docker 撰写操作和图像维护"
sidebarTitle: "组合操作"
---

替换 ClawDock 的 Compose 命令表、可操作的折叠面板以及已发布图像的刷新方式。 [Docker](/install/docker) 指南的一部分。

## <a id="clawdock-migration"></a> ClawDock 迁移

ClawDock 已被删除。直接使用 Docker Compose 进行日常操作。使用 `curl` 下载的现有副本不会自动卸载。从 shell 启动文件（`~/.zshrc` 或 `~/.bashrc`）中删除 `source ~/.clawdock/clawdock-helpers.sh` 行，然后启动新的 shell。如果您从 `scripts/clawdock/` 或旧的 `scripts/shell-helpers/` 路径获取签出副本，请删除该源行。保留您的 OpenClaw 状态、凭据、工作区、项目 `.env` 和卷。

从包含 `docker-compose.yml` 的目录运行命令。 **在每个命令上保持相同的 Compose 文件集和顺序**，以便安装和设置保持不变。通过默认文件发现，Compose 会在存在 `docker-compose.override.yml` 时自动加载。额外文件和沙箱文件需要明确的 `-f` 选项；使用 `-f` 时，如果您使用标准覆盖，也请包括标准覆盖。例如，如果您的部署使用全部四个文件：

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml \
  -f docker-compose.extra.yml -f docker-compose.sandbox.yml ps
```

仅使用您的部署已使用的文件。以下命令显示默认文件集；需要时，在 `docker compose` 之后插入现有的 `-f` 选项。请参阅 [ 手动流程 ](/install/docker#manual-flow) 了解设置和额外安装。

| 任务             | 命令                                                            |
| ---------------- | ------------------------------------------------------------------ |
| 启动            | `docker compose up -d openclaw-gateway`                            |
| 停止堆栈   | `docker compose down`                                              |
| 重新启动          | `docker compose restart openclaw-gateway`                          |
| 集装箱状态 | `docker compose ps`                                                |
| 关注日志      | `docker compose logs -f openclaw-gateway`                          |
| 网关外壳    | `docker compose exec openclaw-gateway bash`                        |
| CLI              | `docker compose run --rm openclaw-cli <command>`                   |
| 仪表板URL    | `docker compose run --rm openclaw-cli dashboard --no-open`         |
| 列出设备     | `docker compose run --rm openclaw-cli devices list`                |
| 批准设备 | `docker compose run --rm openclaw-cli devices approve <requestId>` |
| 检查配置   | `docker compose run --rm openclaw-cli config get <path>`           |

使用 shell 或 CLI 命令之前启动网关。对于自定义主机端口，请按照 [Containerized Gateway](/install/docker#containerized-gateway) 中的说明调整打印仪表板 URL。使用 [ 运行状况检查 ](/install/docker#health-checks) 验证网关，使用 [ 更新 OpenClaw](/install/docker-vm-runtime#update-openclaw) 进行映像更新。

当 CLI 共享网关状态时，将 `pid: "service:openclaw-gateway"` 添加到 Compose 覆盖中的 `openclaw-cli` 服务中，以便所有权检查可以看到网关的进程；单独共享网络并不共享 PID 命名空间。或者，使用 `docker compose exec openclaw-gateway openclaw tui` 在网关容器内运行 TUI。不同的 PID 命名空间现在拒绝无法验证的所有权，而不是回收正在运行的网关的锁。 `tui --local` 启动嵌入式代理，不是共享状态的 PID- 命名空间解决方法。较旧的锁保留其先前的恢复行为，直到网关下次启动并写入名称空间标识。即使 Docker 分配了不同的主机名，替换网关也会在大约 90 秒后回收崩溃容器的状态锁和 SQLite 所有者租用，而没有所有者心跳。 Startup 最多等待 95 秒，让新的所有权证据过期。医生立即拒绝新的、无法证实的主人；停止前一个网关后，在其最后一次心跳后等待最多 90 秒，然后重试。旧映像的现有租约使用其记录的主机名和心跳，直到替换版本发布启动和 PID 命名空间标识。即使租赁期限已过，经过验证的现任业主仍会阻止收购。映像更新不需要架构迁移或手动删除租约。

令牌设置属于[Docker设置流程](/install/docker#containerized-gateway)。如果您需要Control UI代币，请从项目`.env`私下读取`OPENCLAW_GATEWAY_TOKEN`。 [`config get <path>`](/cli/config) 编辑敏感值；它不会透露完整的令牌。

<AccordionGroup>
  <Accordion id="enable-agent-sandbox-for-docker-gateway" title="为 Docker 网关启用代理沙箱">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    自定义套接字路径（e.g. 无根 Docker）：

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    仅在沙箱先决条件通过后，脚本才会挂载 `docker.sock`。如果沙箱设置无法完成，则会将 `agents.defaults.sandbox.mode` 重置为 `off`。当 OpenClaw 沙箱处于活动状态时，Codex 代码模式被禁用（请参阅 [Sandboxing § Docker 后端 ](/gateway/sandboxing#docker-backend)）；切勿将主机 Docker 套接字挂载到代理沙箱容器中。

  </Accordion>

  <Accordion id="automation-ci-non-interactive" title="自动化/CI（非交互式）">
    使用 `-T` 禁用 Compose 的伪 TTY 分配：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

  <Accordion id="shared-network-security-note" title="共享网络安全说明">
    `openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，因此 CLI 命令可以通过 `127.0.0.1` 到达网关。将此视为共享信任边界。撰写配置会删除 `NET_RAW`/`NET_ADMIN` 并在 `openclaw-gateway` 和 `openclaw-cli` 上启用 `no-new-privileges`。
  </Accordion>

  <Accordion id="docker-desktop-dns-failures-in-openclaw-cli" title="Docker 桌面 DNS 在 openclaw-cli 中失败">
    删除 `NET_RAW` 后，某些 Docker 桌面设置无法从共享网络 `openclaw-cli` sidecar 进行 DNS 查找，在 npm- 支持的命令（如 `openclaw plugins install`）期间显示为 `EAI_AGAIN`。保留默认的强化撰写文件以进行正常操作。下面的覆盖仅恢复 `openclaw-cli` 容器的默认功能 - 将其用于需要注册表访问的一次性命令，而不是作为默认调用：

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

  <Accordion id="permissions-and-eacces" title="权限和EACCES">
    该镜像以 `node`（uid 1000）运行。如果你在 `/home/node/.openclaw` 上看到权限错误，请确保宿主机的 bind mount 归属 uid 1000：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

    同样的不匹配也可能表现为 `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`，随后出现 `plugin present but blocked`——这是进程 uid 与挂载的插件目录所有者不一致。建议使用默认的 uid 1000 运行，并修复 bind mount 的所有权。只有在你有意长期以 root 运行 OpenClaw 时，才将 `/path/to/openclaw-config/npm` chown 为 `root:root`。

  </Accordion>

  <Accordion id="faster-rebuilds" title="更快的重建">
    使用 repo-root `Dockerfile` 而不是用缩短的单阶段示例替换它。其 `workspace-deps` 阶段提取 `pnpm-workspace.yaml` 所需的包清单。构建和生产依赖阶段共享这些输入并运行单独的冻结锁定文件安装。这使得两个依赖层都可缓存，而不会忽略 `packages/*`、选定的 `extensions/*` 或其他所需的工作区元数据。

    这`runtime-assets`阶段继承`production-deps`和覆盖`/app`从`runtime-build-output`， 的副本`build`删除依赖树。这会重用新的生产安装层，同时保留编译的工作区包和本机插件输出。它不运行`pnpm prune`从图像层继承的依赖关系；pnpm 12可能会导致该操作失败`EXDEV` on OverlayFS。这`build`目标保留实时测试容器的开发依赖项。

    相同的 Dockerfile 保留了生产运行时合约：摘要固定的 Node 和 Bun 基础、非 root uid 1000、`tini`、内置运行状况检查和 `/usr/local/bin/openclaw` 符号链接。 Dependabot 刷新已审查的基础摘要；不要用浮动 `FROM node:24-bookworm` 标签替换它们。

  </Accordion>

  <Accordion id="power-user-container-options" title="高级用户容器选项">
    默认镜像以安全优先方式运行，并以非 root 的 `node` 用户运行。若要使用功能更完整的容器：

    1. **持久化 `/home/node`**: `export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **预装系统依赖**: `export OPENCLAW_IMAGE_APT_PACKAGES="git curl jq"`
    3. **预装 Python 依赖**: `export OPENCLAW_IMAGE_PIP_PACKAGES="requests==2.32.5 humanize==4.14.0"`
    4. **预装 Playwright Chromium**: `export OPENCLAW_INSTALL_BROWSER=1`，或使用官方的 `-browser` 镜像标签
    5. **保留浏览器下载和缓存**：使用`OPENCLAW_HOME_VOLUME`或`OPENCLAW_EXTRA_MOUNTS`。 OpenClaw 自动检测 Linux 上映像的 Playwright- 管理的 Chromium。

  </Accordion>

  <Accordion id="openai-codex-oauth-headless-docker" title="OpenAI Codex OAuth（无头Docker）">
    如果你在向导中选择 OpenAI Codex OAuth，它会打开一个浏览器 URL。在 Docker 或无头环境中，请复制你最终落地到的完整重定向 URL，并将其粘贴回向导中以完成认证。
  </Accordion>

  <Accordion id="base-image-metadata" title="基础图像元数据">
    运行时映像使用 `node:24-bookworm-slim` 并将 `tini` 作为 PID 1 运行，因此可以在长时间运行的容器中捕获僵尸进程并正确处理信号。它发布了 OCI 基础图像注释，包括 `org.opencontainers.image.base.name` 和 `org.opencontainers.image.source`。 Dependabot 刷新固定的 Node 基础摘要，每个版本都应用当前的 Debian 点发布更新。 See [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

## <a id="image-contents-and-security-scanning"></a> 图像内容和安全扫描

运行时映像仅包含生产 Node.js 依赖项。发布版本通过摘要固定基础映像并使用 `apt-get dist-upgrade` 应用当前的 Debian 安全更新； `-browser` 变体安装由其 Playwright 版本固定的 Chromium 版本。

扫描仪总数可以包括 Debian 结果，该分布标记为 `wont-fix`。要根据当前基础和包元数据在本地重建，请运行 `docker build --pull -t openclaw:local .`。

## <a id="weekly-image-refreshes"></a> 每周图像刷新

`latest*`、`main*` 和 `extended-stable*` 移动标签每周都会从相同的标记版本源重新构建，因此它们会在 OpenClaw 版本之间获取当前的 OS 安全更新。稳定版和扩展稳定版的刷新仍然是分开的，并且测试版映像不会按照此计划重建。

每次刷新还会发布一个带日期的标签，例如 `2026.8.1-r20260820`（以及 `-slim` 和 `-browser` 变体）。普通版标签和注明日期的 `-rYYYYMMDD` 标签是不可变的；当您不希望部署遵循移动标签时，固定任一形式。

## <a id="running-on-a-vps%3F"></a><a id="running-on-a-vps"></a> 在 VPS 上运行吗？

请参阅 [HHetzner （Docker VPS）](/install/hetzner) 和 [Docker VM Runtime](/install/docker-vm-runtime)，了解共享的 VM 部署步骤，包括二进制烘焙、持久化和更新。
