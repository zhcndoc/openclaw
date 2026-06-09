---
summary: "在无根 Podman 容器中运行 OpenClaw"
read_when:
  - 你想使用 Podman 而不是 Docker 来运行容器化网关
title: "Podman"
---

在一个无根 Podman 容器中运行 OpenClaw Gateway，由你当前的非 root 用户管理。

目标模型是：

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
    在仓库根目录下运行 `./scripts/podman/setup.sh`。
  </Step>

  <Step title="启动 Gateway 容器">
    使用 `./scripts/run-openclaw-podman.sh launch` 启动容器。
  </Step>

  <Step title="在容器内运行引导流程">
    运行 `./scripts/run-openclaw-podman.sh launch setup`，然后打开 `http://127.0.0.1:18789/`。
  </Step>

  <Step title="通过主机 CLI 管理正在运行的容器">
    设置 `OPENCLAW_CONTAINER=openclaw`，然后从主机直接使用常规 `openclaw` 命令。
  </Step>
</Steps>

设置详情：

- `./scripts/podman/setup.sh` 默认会在你的无根 Podman 存储中构建 `openclaw:local`，或者在你设置了 `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE` 时使用它们。
- 如果缺失，它会创建 `~/.openclaw/openclaw.json`，并设置 `gateway.mode: "local"`。
- 如果缺失，它会创建 `~/.openclaw/.env`，并写入 `OPENCLAW_GATEWAY_TOKEN`。
- 对于手动启动，辅助脚本只会从 `~/.openclaw/.env` 中读取少量与 Podman 相关的白名单键，并将显式的运行时环境变量传递给容器；它不会把整个 env 文件直接交给 Podman。

由 Quadlet 管理的设置：

```bash
./scripts/podman/setup.sh --quadlet
```

Quadlet 是仅限 Linux 的选项，因为它依赖 systemd 用户服务。

你也可以设置 `OPENCLAW_PODMAN_QUADLET=1`。

可选的构建/设置环境变量：

- `OPENCLAW_IMAGE` or `OPENCLAW_PODMAN_IMAGE` -- 使用现有/已拉取的镜像，而不是构建 `openclaw:local`
- `OPENCLAW_IMAGE_APT_PACKAGES` -- 在镜像构建期间安装额外的 apt 包（也接受旧的 `OPENCLAW_DOCKER_APT_PACKAGES`）
- `OPENCLAW_IMAGE_PIP_PACKAGES` -- 在镜像构建期间安装额外的 Python 包；请固定版本并且只使用你信任的包索引
- `OPENCLAW_EXTENSIONS` -- 在构建时预安装插件依赖
- `OPENCLAW_INSTALL_BROWSER` -- 为浏览器自动化预安装 Chromium 和 Xvfb（设为 `1` 以启用）

容器启动：

```bash
./scripts/run-openclaw-podman.sh launch
```

该脚本会使用你当前的 uid/gid，并带上 `--userns=keep-id` 启动容器，同时将你的 OpenClaw 状态挂载到容器中。

引导流程：

```bash
./scripts/run-openclaw-podman.sh launch setup
```

然后打开 `http://127.0.0.1:18789/`，并使用 `~/.openclaw/.env` 中的 token。

Model auth in Podman:

- Use OpenClaw-managed auth during setup: Anthropic API keys for Anthropic, or OpenAI Codex browser OAuth/device-code auth for Codex-backed OpenAI.
- The Podman launcher does not mount host CLI credential homes such as `~/.claude` or `~/.codex` into the setup or gateway container.
- Existing host CLI logins are same-host convenience paths. For container installs, keep provider auth in the mounted `~/.openclaw` state that setup manages.

Host CLI default:

```bash
export OPENCLAW_CONTAINER=openclaw
```

然后如下命令会自动在该容器内运行：

```bash
openclaw dashboard --no-open
openclaw gateway status --deep   # 包含额外的服务扫描
openclaw doctor
openclaw channels login
```

在 macOS 上，Podman machine 可能会使浏览器在网关看来像是非本地的。
如果控制 UI 在启动后报告设备认证错误，请使用
[Podman 和 Tailscale](#podman--tailscale) 中的 Tailscale 指南。

<a id="podman--tailscale"></a>

## Podman 和 Tailscale

如需 HTTPS 或远程浏览器访问，请遵循主要的 Tailscale 文档。

Podman 相关说明：

- 保持 Podman 发布主机为 `127.0.0.1`。
- 优先使用主机管理的 `tailscale serve`，而不是 `openclaw gateway --tailscale serve`。
- 在 macOS 上，如果本地浏览器设备认证上下文不可靠，请改用 Tailscale 访问，而不是临时的本地隧道替代方案。

参见：

- [Tailscale](/gateway/tailscale)
- [Control UI](/web/control-ui)

## Systemd（Quadlet，可选）

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

对于 SSH/无头主机上的开机持久化，请为当前用户启用 lingering：

```bash
sudo loginctl enable-linger "$(whoami)"
```

## 配置、环境变量和存储

- **配置目录：** `~/.openclaw`
- **工作区目录：** `~/.openclaw/workspace`
- **令牌文件：** `~/.openclaw/.env`
- **启动辅助脚本：** `./scripts/run-openclaw-podman.sh`

启动脚本和 Quadlet 会将主机状态挂载到容器中：

- `OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`

默认情况下，这些是主机目录，而不是匿名容器状态，因此
`openclaw.json`、按代理划分的 `auth-profiles.json`、channel/provider 状态、
sessions 和 workspace 都会在容器替换后保留下来。
Podman 设置还会在已发布的 gateway 端口上为 `127.0.0.1` 和 `localhost` 预先配置 `gateway.controlUi.allowedOrigins`，因此本地 dashboard 可以与容器的非回环绑定正常配合工作。

手动启动器的有用环境变量：

- `OPENCLAW_PODMAN_CONTAINER` -- 容器名称（默认是 `openclaw`）
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- 要运行的镜像
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- 映射到容器 `18789` 的主机端口
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- 映射到容器 `18790` 的主机端口
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- 已发布端口使用的主机接口；默认是 `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- 容器内的 gateway 绑定模式；默认是 `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id`（默认）、`auto` 或 `host`

手动启动器会在最终确定容器/镜像默认值之前读取 `~/.openclaw/.env`，因此你可以把这些值持久化在其中。

如果你使用非默认的 `OPENCLAW_CONFIG_DIR` 或 `OPENCLAW_WORKSPACE_DIR`，请在 `./scripts/podman/setup.sh` 和后续的 `./scripts/run-openclaw-podman.sh launch` 命令中都设置相同的变量。仓库本地的启动器不会在不同 shell 之间保留自定义路径覆盖。

Quadlet 说明：

- 生成的 Quadlet 服务故意保持固定、强化的默认形态：`127.0.0.1` 已发布端口、容器内 `--bind lan`，以及 `keep-id` 用户命名空间。
- 它固定设置 `OPENCLAW_NO_RESPAWN=1`、`Restart=on-failure` 和 `TimeoutStartSec=300`。
- 它同时发布 `127.0.0.1:18789:18789`（gateway）和 `127.0.0.1:18790:18790`（bridge）。
- 它将 `~/.openclaw/.env` 作为运行时 `EnvironmentFile` 读取，以获取诸如 `OPENCLAW_GATEWAY_TOKEN` 之类的值，但不会使用手动启动器的 Podman 特定覆盖白名单。
- 如果你需要自定义发布端口、发布主机或其他容器运行标志，请使用手动启动器，或者直接编辑 `~/.config/containers/systemd/openclaw.container`，然后重新加载并重启服务。

## 有用命令

- **容器日志：** `podman logs -f openclaw`
- **停止容器：** `podman stop openclaw`
- **移除容器：** `podman rm -f openclaw`
- **从主机 CLI 打开 dashboard URL：** `openclaw dashboard --no-open`
- **通过主机 CLI 查看健康/状态：** `openclaw gateway status --deep`（RPC 探测 + 额外
  的服务扫描）

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
