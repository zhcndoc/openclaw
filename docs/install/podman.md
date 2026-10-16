---
summary: "在无根 Podman 容器中运行 OpenClaw"
read_when:
  - "你想使用 Podman 而不是 Docker 来运行容器化网关"
title: "Podman"
---

在无根 Podman 容器中运行 OpenClaw 网关，由当前非 root 用户管理。

模型：

- Podman 运行网关容器。
- 你主机上的 `openclaw` CLI 作为控制平面。
- 持久化状态默认保存在主机上的 `~/.openclaw` 下。
- 日常管理使用 `openclaw --container <name> ...`，而不是 `sudo -u openclaw`、`podman exec` 或单独的服务用户。

## <a id="prerequisites"></a> 先决条件

- **Podman** 处于无根模式，其主机 init 可执行文件（通常为 `catatonit`）可用于启动器的 `--init` 标志。在最小的 Debian/Ubuntu 主机上，显式安装两者：`sudo apt-get install podman catatonit`。对于 Podman 机器，助手必须在机器内部可用。
- 主机上已安装 **OpenClaw CLI**
- **可选：** 如果你想要由 Quadlet 管理的自动启动，则需要 `systemd --user`
- **可选：** `sudo` 仅当您希望 `loginctl enable-linger "$(whoami)"` 在无头主机上实现引导持久性时

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="one-time-setup" title="一次性设置">
    从仓库根目录运行 `./scripts/podman/setup.sh`。

    这会在无根 Podman 存储中构建 `openclaw:local`（或者拉动 `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE`，如果设置），使用 `gateway.mode: "local"` 创建 `~/.openclaw/openclaw.json`（如果缺失），并使用生成的 `OPENCLAW_GATEWAY_TOKEN` 创建 `~/.openclaw/.env`（如果）失踪了。

    可选的构建时环境变量：

    | 变量 | 作用 |
    | --- | --- |
    | `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE` | 使用 existing/pulled 映像而不是构建 `openclaw:local` |
    | `OPENCLAW_IMAGE_APT_PACKAGES` | 在镜像构建期间安装额外的 apt 包（也支持旧的 `OPENCLAW_DOCKER_APT_PACKAGES`） |
    | `OPENCLAW_IMAGE_PIP_PACKAGES` | 在镜像构建期间安装额外的 Python 包；请固定版本并仅使用你信任的包索引 |
    | `OPENCLAW_EXTENSIONS` | Compile/package 支持选定的插件并安装其运行时依赖项 |
    | `OPENCLAW_INSTALL_BROWSER` | 为浏览器自动化预安装 Chromium 和 Xvfb（设为 `1`） |

    如果想改用 Quadlet 管理的设置方式（仅限 Linux + systemd 用户服务）：

    ```bash
    ./scripts/podman/setup.sh --quadlet
    ```

    或设置 `OPENCLAW_PODMAN_QUADLET=1`。

  </Step>

  <Step id="start-the-gateway-container" title="启动网关容器">
    ```bash
    ./scripts/run-openclaw-podman.sh launch
    ```

    以当前 uid/gid 启动容器，并使用 `--userns=keep-id`，同时将你的 OpenClaw 状态绑定挂载到容器中。

  </Step>

  <Step id="run-onboarding-inside-the-container" title="在容器内运行入门引导">
    ```bash
    ./scripts/run-openclaw-podman.sh launch setup
    ```

    然后打开 `http://127.0.0.1:18789/`，并使用 `~/.openclaw/.env` 中的令牌。

    模型身份验证：在设置过程中使用 OpenClaw- 托管身份验证（Anthropic API 密钥，或 OpenAI Codex 浏览器 OAuth/device-code 身份验证用于 Codex- 支持的 OpenAI）。 Podman 启动器不会将主机 CLI 凭证主目录（例如 `~/.claude` 或 `~/.codex`）装载到设置或网关容器中。现有主机 CLI 登录仅是同一主机便捷路径 - 对于容器安装，请将提供程序身份验证保持在安装程序管理的已安装 `~/.openclaw` 状态中。

  </Step>

  <Step id="manage-the-running-container-from-the-host-cli" title="从主机 CLI 管理正在运行的容器">
    ```bash
    export OPENCLAW_CONTAINER=openclaw
    ```

    然后普通的 `openclaw` 命令会自动在该容器内运行：

    ```bash
    openclaw dashboard --no-open
    openclaw gateway status --deep   # includes extra service scan
    openclaw doctor
    openclaw channels login
    ```

    在 macOS 上，Podman machine 可能会让浏览器对 gateway 看起来不像本地端。若 Control UI 在启动后报告设备认证错误，请参考 [Podman and Tailscale](#podman-and-tailscale) 中的 Tailscale 指引。

  </Step>
</Steps>

手动启动器仅从 `~/.openclaw/.env` 读取 Podman- 相关密钥的一小部分白名单，并将显式运行时环境变量传递给容器；它不会将完整的环境文件交给 Podman。

## <a id="agent-sandbox-backend"></a> Agent沙箱后端

本页介绍在 Podman 容器中运行网关本身。代理沙箱是独立的。设置`agents.defaults.sandbox.backend: "podman"`直接选择原生的Podman CLI。默认的 `"docker"` 后端仅保留 Docker-。

Podman 重用与 Docker 相同的 `agents.defaults.sandbox.docker.*` 容器设置，但通过本机 `podman` CLI 执行它们。浏览器沙箱目前仅保留 Docker-。

请参阅[沙箱](/gateway/sandboxing#podman-backend)，了解配置示例和镜像构建命令。

## <a id="podman-and-tailscale"></a> Podman 和 Tailscale

如需 HTTPS 或远程浏览器访问，请遵循主要的 Tailscale 文档。

Podman-具体说明：

- 保持 Podman 发布主机为 `127.0.0.1`。
- 优先使用主机管理的 `tailscale serve`，而不是 `openclaw gateway --tailscale serve`。
- 在 macOS 上，如果本地浏览器设备认证上下文不可靠，请改用 Tailscale 访问，而不是临时的本地隧道替代方案。

请参见 [Tailscale](/gateway/tailscale) 和 [Control UI](/web/control-ui)。

## <a id="systemd-(quadlet%2C-optional)"></a><a id="systemd-quadlet-optional"></a> Systemd（Quadlet，可选）

如果你运行了 `./scripts/podman/setup.sh --quadlet`，安装程序会在 `~/.config/containers/systemd/openclaw.container` 安装一个 Quadlet 文件。

| 操作 | 命令                                    |
| ------ | ------------------------------------------ |
| 启动  | `systemctl --user start openclaw.service`  |
| 停止   | `systemctl --user stop openclaw.service`   |
| 状态 | `systemctl --user status openclaw.service` |
| 日志   | `journalctl --user -u openclaw.service -f` |

编辑 Quadlet 文件后：

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw.service
```

为了在 SSH/headless 主机上保持启动持久性，请为当前用户启用延迟：

```bash
sudo loginctl enable-linger "$(whoami)"
```

生成的 Quadlet 服务保持固定的、强化的默认形状：`127.0.0.1`已发布的端口（`18789`网关，`18790`桥），`--bind lan`容器内，`keep-id`用户命名空间，`OPENCLAW_NO_RESPAWN=1`， `Restart=on-failure`， 和`TimeoutStartSec=300`。上面写着`~/.openclaw/.env`作为运行时`EnvironmentFile`对于诸如以下的值`OPENCLAW_GATEWAY_TOKEN`，但不消耗手动启动器的Podman-特定覆盖允许列表。对于自定义发布端口、发布主机或其他容器运行标志，请改用手动启动器，或编辑`~/.config/containers/systemd/openclaw.container`直接然后重新加载并重新启动服务。

## <a id="config%2C-env%2C-and-storage"></a><a id="config-env-and-storage"></a> 配置、环境和存储

- **配置目录：** `~/.openclaw`
- **工作区目录：** `~/.openclaw/workspace`
- **令牌文件：** `~/.openclaw/.env`
- **启动辅助脚本：** `./scripts/run-openclaw-podman.sh`

启动脚本和 Quadlet 将主机状态绑定到容器中：`OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`、`OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`。默认情况下，这些是主机目录，而不是匿名容器状态，因此 `openclaw.json`、共享和每个代理 SQLite 身份验证存储、channel/provider 状态、会话和工作区在容器更换后仍然存在。安装程序还会在已发布的网关端口上为 `127.0.0.1` 和 `localhost` 播种 `gateway.controlUi.allowedOrigins`，以便本地仪表板与容器的非环回绑定配合使用。

对于手动启动器有用的环境变量（将它们保留在 `~/.openclaw/.env` 中；启动器在最终确定 container/image 默认值之前读取该文件）：

| 变量                                        | 默认值          | 作用                                 |
| ------------------------------------------ | ---------------- | -------------------------------------- |
| `OPENCLAW_PODMAN_CONTAINER`                | `openclaw`       | 容器名称                         |
| `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` | `openclaw:local` | 要运行的镜像                           |
| `OPENCLAW_PODMAN_GATEWAY_HOST_PORT`        | `18789`          | 映射到容器 `18789` 的宿主机端口  |
| `OPENCLAW_PODMAN_BRIDGE_HOST_PORT`         | `18790`          | 映射到容器 `18790` 的宿主机端口  |
| `OPENCLAW_PODMAN_PUBLISH_HOST`             | `127.0.0.1`      | 已发布端口使用的宿主机接口     |
| `OPENCLAW_GATEWAY_BIND`                    | `lan`            | 容器内部的网关绑定模式 |
| `OPENCLAW_PODMAN_USERNS`                   | `keep-id`        | `keep-id`、`auto` 或 `host`           |

如果你使用非默认的 `OPENCLAW_CONFIG_DIR` 或 `OPENCLAW_WORKSPACE_DIR`，请为 `./scripts/podman/setup.sh` 以及后续的 `./scripts/run-openclaw-podman.sh launch` 命令都设置相同的变量——仓库本地启动器不会在不同 shell 之间保留自定义路径覆盖。

## <a id="upgrading-images"></a> 升级镜像

在你重新构建或拉取新镜像后，请重启容器或 Quadlet 服务。 对于新 OpenClaw 版本的首次启动，网关会先执行安全状态和插件修复，然后再报告就绪。

如果网关退出而不是准备就绪，请使用 `openclaw doctor --fix` 针对相同安装的 state/config 运行相同的映像，然后正常重新启动网关：

```bash
OPENCLAW_CONFIG_DIR="${OPENCLAW_CONFIG_DIR:-$HOME/.openclaw}"
OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-$OPENCLAW_CONFIG_DIR/workspace}"
OPENCLAW_PODMAN_IMAGE="${OPENCLAW_PODMAN_IMAGE:-${OPENCLAW_IMAGE:-openclaw:local}}"

podman run --rm -it \
  --userns=keep-id \
  --user "$(id -u):$(id -g)" \
  -e HOME=/home/node \
  -e NPM_CONFIG_CACHE=/home/node/.openclaw/.npm \
  -v "$OPENCLAW_CONFIG_DIR:/home/node/.openclaw:rw" \
  -v "$OPENCLAW_WORKSPACE_DIR:/home/node/.openclaw/workspace:rw" \
  "$OPENCLAW_PODMAN_IMAGE" \
  openclaw doctor --fix
```

在启用了 SELinux 的主机上，如果 Podman 阻止访问已挂载状态，请在两个绑定挂载上都添加 `,Z`。

使用更新的映像重新启动网关后，通过容器感知主机 CLI 运行只读部署预检：

```bash
export OPENCLAW_CONTAINER=openclaw
openclaw doctor --json
```

## <a id="useful-commands"></a> 有用的命令

- **容器日志：** `podman logs -f openclaw`
- **停止容器：** `podman stop openclaw`
- **移除容器：** `podman rm -f openclaw`
- **从主机 CLI 打开仪表盘 URL：** `openclaw dashboard --no-open`
- **Health/status 通过主机 CLI：** `openclaw gateway status --deep`（RPC 检查 + 额外服务扫描）

## <a id="troubleshooting"></a> 故障排查

- **令牌生成失败：** 当选定的随机源（`openssl`、Python 或 `od`）失败时，安装和启动会在保存生成的令牌或启动容器之前停止。修复该命令并重试。
- **Init 可执行文件丢失 （`lookup init binary` / `container-init binary not found on the host`）：** 在 Podman 引擎主机上安装 `catatonit` 或修复其配置的 `init_path`/`helper_binaries_dir` `containers.conf`，然后重试。在网关或沙箱映像内安装帮助程序不会修复引擎主机。保持 `--init` 启用；请参见 [ 主机初始化先决条件 ](/gateway/sandboxing/podman-backend#host-init-prerequisite)。
- **配置或工作区上的权限被拒绝 （EACCES）：** 默认情况下，容器使用 `--userns=keep-id` 和 `--user <your uid>:<your gid>` 运行。检查主机 config/workspace 路径是否属于您的当前用户。
- **网关启动被阻止（缺少`gateway.mode=local`）：** 检查`~/.openclaw/openclaw.json`是否存在并设置`gateway.mode="local"`。如果缺失，`scripts/podman/setup.sh` 将创建此值。
- **镜像更新后容器重启：** 先运行一次性命令 `openclaw doctor --fix`，参见 [升级镜像](#upgrading-images)，然后再次启动网关。
- **容器 CLI 命令命中了错误的目标：** 显式使用 `openclaw --container <name> ...`，或者在 shell 中导出 `OPENCLAW_CONTAINER=<name>`。
- **`openclaw update` 失败，并显示 `--container`：** 预期。 Rebuild/pull 镜像，然后重新启动容器或 Quadlet 服务。
- **Quadlet 服务未启动：** 运行 `systemctl --user daemon-reload`，然后执行 `systemctl --user start openclaw.service`。在无头系统上，您可能还需要运行 `sudo loginctl enable-linger "$(whoami)"`。
- **SELinux 阻止 bind 挂载：** 保持默认挂载行为不变；当 Linux 上 SELinux 处于 enforcing 或 permissive 模式时，启动器会自动添加 `:Z`。

## <a id="related"></a> 相关内容

- [Docker](/install/docker)
- [沙箱隔离](/gateway/sandboxing#podman-backend)
- [网关后台进程](/gateway/background-process)
- [网关故障排查](/gateway/troubleshooting)
