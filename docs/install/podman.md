---
summary: "在无根 Podman 容器中运行 OpenClaw"
read_when:
  - 你想使用 Podman 而不是 Docker 来运行容器化网关
title: "Podman"
---

在一个无根 Podman 容器中运行 OpenClaw Gateway，由你当前的非 root 用户管理。

模型：

- Podman 运行网关容器。
- 你主机上的 `openclaw` CLI 作为控制平面。
- 持久化状态默认保存在主机上的 `~/.openclaw` 下。
- 日常管理使用 `openclaw --container <name> ...`，而不是 `sudo -u openclaw`、`podman exec` 或单独的服务用户。

## 先决条件

- **Podman** 处于无根模式
- 主机上已安装 **OpenClaw CLI**
- **可选：** 如果你想要由 Quadlet 管理的自动启动，则需要 `systemd --user`
- **可选：** 仅当你希望在无头主机上通过 `loginctl enable-linger "$(whoami)"` 实现开机持久化时才需要 `sudo`

## 快速开始

<Steps>
  <Step title="一次性设置">
    从仓库根目录运行 `./scripts/podman/setup.sh`。

    这会在你的无 root Podman 存储中构建 `openclaw:local`（或在已设置时拉取 `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE`），在缺失时创建带有 `gateway.mode: "local"` 的 `~/.openclaw/openclaw.json`，并在缺失时创建带有生成的 `OPENCLAW_GATEWAY_TOKEN` 的 `~/.openclaw/.env`。

    可选的构建时环境变量：

    | Var | 作用 |
    | --- | --- |
    | `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE` | 使用现有/已拉取的镜像，而不是构建 `openclaw:local` |
    | `OPENCLAW_IMAGE_APT_PACKAGES` | 在镜像构建期间安装额外的 apt 包（也兼容旧版 `OPENCLAW_DOCKER_APT_PACKAGES`） |
    | `OPENCLAW_IMAGE_PIP_PACKAGES` | 在镜像构建期间安装额外的 Python 包；请固定版本并仅使用你信任的包索引 |
    | `OPENCLAW_EXTENSIONS` | 在构建时预安装插件依赖 |
    | `OPENCLAW_INSTALL_BROWSER` | 为浏览器自动化预安装 Chromium 和 Xvfb（设为 `1`） |

    如果想改用 Quadlet 管理的设置方式（仅限 Linux + systemd 用户服务）：

    ```bash
    ./scripts/podman/setup.sh --quadlet
    ```

    或设置 `OPENCLAW_PODMAN_QUADLET=1`。

  </Step>

  <Step title="启动 Gateway 容器">
    ```bash
    ./scripts/run-openclaw-podman.sh launch
    ```

    以当前 uid/gid 启动容器，并使用 `--userns=keep-id`，同时将你的 OpenClaw 状态绑定挂载到容器中。

  </Step>

  <Step title="在容器内运行引导流程">
    ```bash
    ./scripts/run-openclaw-podman.sh launch setup
    ```

    然后打开 `http://127.0.0.1:18789/`，并使用 `~/.openclaw/.env` 中的令牌。

    模型认证：在设置过程中使用 OpenClaw 管理的认证（Anthropic API 密钥，或用于 Codex 支持的 OpenAI 的 OpenAI Codex 浏览器 OAuth/device-code 认证）。Podman 启动器不会将主机 CLI 的凭据目录（例如 `~/.claude` 或 `~/.codex`）挂载到设置或 gateway 容器中。现有的主机 CLI 登录仅是同一主机上的便利路径——对于容器安装，请将提供方认证保留在设置所管理的已挂载 `~/.openclaw` 状态中。

  </Step>

  <Step title="从主机 CLI 管理正在运行的容器">
    ```bash
    export OPENCLAW_CONTAINER=openclaw
    ```

    然后普通的 `openclaw` 命令会自动在该容器内运行：

    ```bash
    openclaw dashboard --no-open
    openclaw gateway status --deep   # 包含额外的服务扫描
    openclaw doctor
    openclaw channels login
    ```

    在 macOS 上，Podman machine 可能会让浏览器对 gateway 看起来不像本地端。若 Control UI 在启动后报告设备认证错误，请参考 [Podman and Tailscale](#podman-and-tailscale) 中的 Tailscale 指引。

  </Step>
</Steps>

手动启动器只会从 `~/.openclaw/.env` 读取一小部分与 Podman 相关的允许列表键，并将显式的运行时环境变量传递给容器；它不会将整个 env 文件交给 Podman。

<a id="podman-and-tailscale"></a>

## Podman 和 Tailscale

如需 HTTPS 或远程浏览器访问，请遵循主要的 Tailscale 文档。

Podman 特定说明：

- 保持 Podman 发布主机为 `127.0.0.1`。
- 优先使用主机管理的 `tailscale serve`，而不是 `openclaw gateway --tailscale serve`。
- 在 macOS 上，如果本地浏览器设备认证上下文不可靠，请改用 Tailscale 访问，而不是临时的本地隧道替代方案。

参见 [Tailscale](/gateway/tailscale) 和 [Control UI](/web/control-ui)。

## Systemd（Quadlet，可选）

如果你运行了 `./scripts/podman/setup.sh --quadlet`，安装程序会在 `~/.config/containers/systemd/openclaw.container` 安装一个 Quadlet 文件。

| 操作 | 命令                                       |
| ---- | ------------------------------------------ |
| 启动 | `systemctl --user start openclaw.service`  |
| 停止 | `systemctl --user stop openclaw.service`   |
| 状态 | `systemctl --user status openclaw.service` |
| 日志 | `journalctl --user -u openclaw.service -f`  |

编辑 Quadlet 文件后：

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw.service
```

对于 SSH/无头主机上的开机持久化，请为当前用户启用 lingering：

```bash
sudo loginctl enable-linger "$(whoami)"
```

生成的 Quadlet 服务保持固定、加固后的默认配置：发布到 `127.0.0.1` 的端口（`18789` 网关、`18790` 桥接）、容器内使用 `--bind lan`、`keep-id` 用户命名空间、`OPENCLAW_NO_RESPAWN=1`、`Restart=on-failure`，以及 `TimeoutStartSec=300`。它将 `~/.openclaw/.env` 作为运行时 `EnvironmentFile` 读取，以获取诸如 `OPENCLAW_GATEWAY_TOKEN` 之类的值，但不会使用手动启动器的 Podman 专用覆盖允许列表。对于自定义发布端口、发布主机或其他容器运行标志，请改用手动启动器，或者直接编辑 `~/.config/containers/systemd/openclaw.container`，然后重新加载并重启服务。

## 配置、环境和存储

- **配置目录：** `~/.openclaw`
- **工作区目录：** `~/.openclaw/workspace`
- **令牌文件：** `~/.openclaw/.env`
- **启动辅助脚本：** `./scripts/run-openclaw-podman.sh`

启动脚本和 Quadlet 会将宿主机状态绑定挂载到容器中：`OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`，`OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`。默认情况下，这些是宿主机目录，而不是匿名容器状态，因此 `openclaw.json`、每个 agent 的 `auth-profiles.json`、通道/提供方状态、会话以及工作区在容器替换后仍会保留。安装过程还会为已发布的网关端口上的 `127.0.0.1` 和 `localhost` 预设 `gateway.controlUi.allowedOrigins`，这样本地仪表盘就能与容器的非回环绑定正常工作。

手动启动器可用的有用环境变量（请将其持久化保存到 `~/.openclaw/.env`；启动器会在最终确定容器/镜像默认值之前读取该文件）：

| 变量                                       | 默认值           | 作用                                   |
| ------------------------------------------ | ---------------- | -------------------------------------- |
| `OPENCLAW_PODMAN_CONTAINER`                | `openclaw`       | 容器名称                               |
| `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` | `openclaw:local` | 要运行的镜像                           |
| `OPENCLAW_PODMAN_GATEWAY_HOST_PORT`        | `18789`          | 映射到容器 `18789` 的宿主机端口        |
| `OPENCLAW_PODMAN_BRIDGE_HOST_PORT`         | `18790`          | 映射到容器 `18790` 的宿主机端口        |
| `OPENCLAW_PODMAN_PUBLISH_HOST`             | `127.0.0.1`      | 已发布端口使用的宿主机接口             |
| `OPENCLAW_GATEWAY_BIND`                    | `lan`            | 容器内部的网关绑定模式                 |
| `OPENCLAW_PODMAN_USERNS`                   | `keep-id`        | `keep-id`、`auto` 或 `host`            |

如果你使用非默认的 `OPENCLAW_CONFIG_DIR` 或 `OPENCLAW_WORKSPACE_DIR`，请为 `./scripts/podman/setup.sh` 以及后续的 `./scripts/run-openclaw-podman.sh launch` 命令都设置相同的变量——仓库本地启动器不会在不同 shell 之间保留自定义路径覆盖。

## 有用命令

- **容器日志：** `podman logs -f openclaw`
- **停止容器：** `podman stop openclaw`
- **移除容器：** `podman rm -f openclaw`
- **从主机 CLI 打开仪表盘 URL：** `openclaw dashboard --no-open`
- **通过主机 CLI 查看健康/状态：** `openclaw gateway status --deep`（RPC 探测 + 额外服务扫描）

## 故障排除

- **配置或 workspace 上出现权限拒绝（EACCES）：** 容器默认使用 `--userns=keep-id` 和 `--user <your uid>:<your gid>` 运行。请确保主机上的配置/workspace 路径归当前用户所有。
- **Gateway 启动被阻止（缺少 `gateway.mode=local`）：** 确保 `~/.openclaw/openclaw.json` 存在且设置了 `gateway.mode="local"`。`scripts/podman/setup.sh` 会在缺失时创建它。
- **容器 CLI 命令命中了错误的目标：** 显式使用 `openclaw --container <name> ...`，或在你的 shell 中导出 `OPENCLAW_CONTAINER=<name>`。
- **`openclaw update` 在使用 `--container` 时失败：** 这是预期行为。重新构建/拉取镜像，然后重启容器或 Quadlet 服务。
- **Quadlet 服务未启动：** 运行 `systemctl --user daemon-reload`，然后 `systemctl --user start openclaw.service`。在无头系统上，你可能还需要 `sudo loginctl enable-linger "$(whoami)"`。
- **SELinux 阻止了绑定挂载：** 保持默认挂载行为不变；当 SELinux 处于 enforcing 或 permissive 状态时，启动器会在 Linux 上自动添加 `:Z`。

## 相关内容

- [Docker](/install/docker)
- [Gateway 后台进程](/gateway/background-process)
- [Gateway 故障排除](/gateway/troubleshooting)
