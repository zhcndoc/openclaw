---
summary: "在无根 Podman 容器中运行 OpenClaw"
read_when:
  - 你想用 Podman 而不是 Docker 来运行容器化网关
title: "Podman"
---

在无根 Podman 容器中运行 OpenClaw Gateway，由你当前的非 root 用户管理。

预期模型如下：

- Podman 运行网关容器。
- 宿主机的 `openclaw` CLI 是控制平面。
- 持久化状态默认存储在宿主机的 `~/.openclaw` 下。
- 日常管理使用 `openclaw --container <name> ...` 而不是 `sudo -u openclaw`、`podman exec` 或单独的服务用户。

## 前置条件

- **Podman** 处于无根模式
- 宿主机上安装了 **OpenClaw CLI**
- **可选：** 如果想要 Quadlet 管理的自动启动，需要 `systemd --user`
- **可选：** 仅当想要在无头宿主机上实现启动持久化而运行 `loginctl enable-linger "$(whoami)"` 时才需要 `sudo`

## 快速开始

<Steps>
  <Step title="一次性设置">
    从仓库根目录运行 `./scripts/podman/setup.sh`。
  </Step>

  <Step title="启动 Gateway 容器">
    使用 `./scripts/run-openclaw-podman.sh launch` 启动容器。
  </Step>

  <Step title="在容器内运行初始化设置">
    运行 `./scripts/run-openclaw-podman.sh launch setup`，然后打开 `http://127.0.0.1:18789/`。
  </Step>

  <Step title="从宿主机 CLI 管理运行中的容器">
    设置 `OPENCLAW_CONTAINER=openclaw`，然后从宿主机使用正常的 `openclaw` 命令。
  </Step>
</Steps>

设置详情：

- `./scripts/podman/setup.sh` 默认在你的无根 Podman 存储中构建 `openclaw:local`，或者如果你设置了 `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE` 则使用它们。
- 如果缺失，它会创建包含 `gateway.mode: "local"` 的 `~/.openclaw/openclaw.json`。
- 如果缺失，它会创建包含 `OPENCLAW_GATEWAY_TOKEN` 的 `~/.openclaw/.env`。
- 对于手动启动，助手仅从 `~/.openclaw/.env` 读取少量允许列表中的 Podman 相关键，并将明确的运行时环境变量传递给容器；它不会将整个 env 文件交给 Podman。

Quadlet 管理的设置：

```bash
./scripts/podman/setup.sh --quadlet
```

Quadlet 是仅限 Linux 的选项，因为它依赖于 systemd 用户服务。

你也可以设置 `OPENCLAW_PODMAN_QUADLET=1`。

可选的构建/设置环境变量：

- `OPENCLAW_IMAGE` 或 `OPENCLAW_PODMAN_IMAGE` -- 使用现有/已拉取的镜像，而不是构建 `openclaw:local`
- `OPENCLAW_DOCKER_APT_PACKAGES` -- 在镜像构建期间安装额外的 apt 包
- `OPENCLAW_EXTENSIONS` -- 在构建时预安装插件依赖

容器启动：

```bash
./scripts/run-openclaw-podman.sh launch
```

脚本使用 `--userns=keep-id` 以当前 uid/gid 启动容器，并将你的 OpenClaw 状态绑定挂载到容器中。

初始化设置：

```bash
./scripts/run-openclaw-podman.sh launch setup
```

然后打开 `http://127.0.0.1:18789/` 并使用 `~/.openclaw/.env` 中的 token。

宿主机 CLI 默认：

```bash
export OPENCLAW_CONTAINER=openclaw
```

那么如下命令将自动在该容器内运行：

```bash
openclaw dashboard --no-open
openclaw gateway status --deep   # 包含额外的服务扫描
openclaw doctor
openclaw channels login
```

在 macOS 上，Podman machine 可能会让浏览器在网关看来像是非本地访问。
如果 Control UI 在启动后报告设备认证错误，请使用
[Podman + Tailscale](#podman--tailscale) 中的 Tailscale 指南。

<a id="podman--tailscale"></a>

## Podman + Tailscale

对于 HTTPS 或远程浏览器访问，请遵循主要的 Tailscale 文档。

Podman 特定说明：

- 将 Podman 发布主机保持为 `127.0.0.1`。
- 优先使用宿主机管理的 `tailscale serve`，而不是 `openclaw gateway --tailscale serve`。
- 在 macOS 上，如果本地浏览器设备认证上下文不可靠，请改用 Tailscale 访问，而不是临时的本地隧道变通方案。

参见：

- [Tailscale](/gateway/tailscale)
- [控制 UI](/web/control-ui)

## Systemd (Quadlet，可选)

如果你运行了 `./scripts/podman/setup.sh --quadlet`，设置会在以下位置安装一个 Quadlet 文件：

```bash
~/.config/containers/systemd/openclaw.container
```

有用的命令：

- **启动：** `systemctl --user start openclaw.service`
- **停止：** `systemctl --user stop openclaw.service`
- **状态：** `systemctl --user status openclaw.service`
- **日志：** `journalctl --user -u openclaw.service -f`

编辑 Quadlet 文件后：

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw.service
```

为了在 SSH/无头宿主机上实现启动持久化，为当前用户启用 linger：

```bash
sudo loginctl enable-linger "$(whoami)"
```

## 配置、环境和存储

- **配置目录：** `~/.openclaw`
- **工作区目录：** `~/.openclaw/workspace`
- **Token 文件：** `~/.openclaw/.env`
- **启动助手：** `./scripts/run-openclaw-podman.sh`

启动脚本和 Quadlet 将宿主机状态绑定挂载到容器中：

- `OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`

默认情况下，这些是宿主机目录，而不是匿名容器状态，因此
`openclaw.json`、每个代理的 `auth-profiles.json`、通道/提供者状态、
会话以及工作区都会在容器替换后保留下来。
Podman 设置还会在已发布的网关端口上为 `127.0.0.1` 和 `localhost` 初始化 `gateway.controlUi.allowedOrigins`，因此本地仪表板在容器的非回环绑定下也能工作。

手动启动器的有用环境变量：

- `OPENCLAW_PODMAN_CONTAINER` -- 容器名称（默认为 `openclaw`）
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- 要运行的镜像
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- 映射到容器 `18789` 的宿主机端口
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- 映射到容器 `18790` 的宿主机端口
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- 发布端口的宿主机接口；默认为 `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- 容器内的网关绑定模式；默认为 `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id`（默认）、`auto` 或 `host`

手动启动器在最终确定容器/镜像默认值之前读取 `~/.openclaw/.env`，因此你可以将这些持久化在那里。

如果你使用非默认的 `OPENCLAW_CONFIG_DIR` 或 `OPENCLAW_WORKSPACE_DIR`，请为 `./scripts/podman/setup.sh` 和后续的 `./scripts/run-openclaw-podman.sh launch` 命令设置相同的变量。仓库本地的启动器不会跨 shell 持久化自定义路径覆盖。

Quadlet 说明：

- 生成的 Quadlet 服务会刻意保持固定且加固的默认形态：`127.0.0.1` 发布端口、容器内 `--bind lan`，以及 `keep-id` 用户命名空间。
- 它固定设置 `OPENCLAW_NO_RESPAWN=1`、`Restart=on-failure` 和 `TimeoutStartSec=300`。
- 它同时发布 `127.0.0.1:18789:18789`（网关）和 `127.0.0.1:18790:18790`（桥接）。
- 它将 `~/.openclaw/.env` 作为运行时 `EnvironmentFile` 读取，例如 `OPENCLAW_GATEWAY_TOKEN` 之类的值，但不会使用手动启动器的 Podman 专用覆盖允许列表。
- 如果你需要自定义发布端口、发布主机或其他容器运行标志，请使用手动启动器，或直接编辑 `~/.config/containers/systemd/openclaw.container`，然后重新加载并重启服务。

## 常用命令

- **容器日志：** `podman logs -f openclaw`
- **停止容器：** `podman stop openclaw`
- **移除容器：** `podman rm -f openclaw`
- **从宿主机 CLI 打开仪表板 URL：** `openclaw dashboard --no-open`
- **通过宿主机 CLI 查看健康/状态：** `openclaw gateway status --deep`（RPC 探测 + 额外的
  服务扫描）

## 故障排除

- **配置或工作区上的权限被拒绝 (EACCES)：** 容器默认使用 `--userns=keep-id` 和 `--user <your uid>:<your gid>` 运行。确保宿主机配置/工作区路径由当前用户拥有。
- **Gateway 启动被阻止（缺少 `gateway.mode=local`）：** 确保 `~/.openclaw/openclaw.json` 存在并设置 `gateway.mode="local"`。`scripts/podman/setup.sh` 会在缺失时创建此文件。
- **容器 CLI 命令命中了错误的目标：** 显式使用 `openclaw --container <name> ...`，或在 shell 中导出 `OPENCLAW_CONTAINER=<name>`。
- **`openclaw update` 使用 `--container` 失败：** 这是预期的。重建/拉取镜像，然后重启容器或 Quadlet 服务。
- **Quadlet 服务未启动：** 运行 `systemctl --user daemon-reload`，然后运行 `systemctl --user start openclaw.service`。在无头系统上，你可能还需要 `sudo loginctl enable-linger "$(whoami)"`。
- **SELinux 阻止绑定挂载：** 不要更改默认挂载行为；当 SELinux 处于 enforcing 或 permissive 模式时，启动器会在 Linux 上自动添加 `:Z`。

## 相关内容

- [Docker](/install/docker)
- [网关后台进程](/gateway/background-process)
- [网关故障排除](/gateway/troubleshooting)
