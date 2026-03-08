---
summary: "在无根 Podman 容器中运行 OpenClaw"
read_when:
  - 你想用 Podman 而不是 Docker 来运行容器化网关
title: "Podman"
---

# Podman

在 **无根** Podman 容器中运行 OpenClaw 网关。使用与 Docker 相同的镜像（从仓库的 [Dockerfile](https://github.com/openclaw/openclaw/blob/main/Dockerfile) 构建）。

## 需求

- Podman（无根）
- 一次性设置时需要使用 sudo（创建用户，构建镜像）

## 快速开始

**1. 一次性设置**（在仓库根目录执行；创建用户，构建镜像，安装启动脚本）：

```bash
./setup-podman.sh
```

这也会创建一个最小的 `~openclaw/.openclaw/openclaw.json`（设置 `gateway.mode="local"`），这样网关可以在不运行向导的情况下启动。

默认情况下，容器**不会**被安装为 systemd 服务，你需要手动启动（见下文）。若要实现类似生产环境的自动启动和重启，请将其安装为 systemd Quadlet 用户服务：

```bash
./setup-podman.sh --quadlet
```

（或者设置环境变量 `OPENCLAW_PODMAN_QUADLET=1`；使用 `--container` 仅安装容器和启动脚本。）

可选的构建时环境变量（在运行 `setup-podman.sh` 之前设置）：

- `OPENCLAW_DOCKER_APT_PACKAGES` — 在镜像构建过程中安装额外的 apt 软件包
- `OPENCLAW_EXTENSIONS` — 预安装扩展依赖（以空格分隔的扩展名称，如 `diagnostics-otel matrix`）

**2. 启动网关**（手动，快速测试用）：

```bash
./scripts/run-openclaw-podman.sh launch
```

**3. 上手向导**（例如添加频道或提供者）：

```bash
./scripts/run-openclaw-podman.sh launch setup
```

然后打开 `http://127.0.0.1:18789/`，使用 `~openclaw/.openclaw/.env` 中的令牌（或设置中打印的令牌）。

## Systemd（Quadlet，可选）

如果你运行了 `./setup-podman.sh --quadlet`（或设置了 `OPENCLAW_PODMAN_QUADLET=1`），会安装一个 [Podman Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) 单元，使网关作为 openclaw 用户的 systemd 用户服务运行。安装结束时该服务被启用并启动。

- **启动：** `sudo systemctl --machine openclaw@ --user start openclaw.service`
- **停止：** `sudo systemctl --machine openclaw@ --user stop openclaw.service`
- **状态：** `sudo systemctl --machine openclaw@ --user status openclaw.service`
- **日志：** `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`

quadlet 文件位于 `~openclaw/.config/containers/systemd/openclaw.container`。要更改端口或环境变量，编辑该文件（或其引用的 `.env`），然后执行 `sudo systemctl --machine openclaw@ --user daemon-reload` 并重启服务。启动时，如果 openclaw 用户启用了 lingering（如果 loginctl 可用，setup 会自动处理），服务会自动启动。

如果最初未使用 quadlet 设置，想要后续添加，重新运行：`./setup-podman.sh --quadlet`。

## openclaw 用户（非登录）

`setup-podman.sh` 会创建一个专用的系统用户 `openclaw`：

- **Shell：** `nologin` — 不能交互登录，减少攻击面。
- **家目录：** 例如 `/home/openclaw` — 包含 `~/.openclaw`（配置、工作区）和启动脚本 `run-openclaw-podman.sh`。
- **无根 Podman：** 用户必须拥有 **subuid** 和 **subgid** 范围。很多发行版在创建用户时自动分配。如果 setup 打印警告，请向 `/etc/subuid` 和 `/etc/subgid` 中添加如下行：

  ```text
  openclaw:100000:65536
  ```

  然后以该用户身份启动网关（例如通过 cron 或 systemd）：

  ```bash
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh setup
  ```

- **配置：** 只有 `openclaw` 用户和 root 可以访问 `/home/openclaw/.openclaw`。要编辑配置：启动网关后可通过控制界面，或者使用 `sudo -u openclaw $EDITOR /home/openclaw/.openclaw/openclaw.json`。

## 环境与配置

- **令牌：** 存储于 `~openclaw/.openclaw/.env` 中，变量名为 `OPENCLAW_GATEWAY_TOKEN`。`setup-podman.sh` 和 `run-openclaw-podman.sh` 会在缺失时生成令牌（依赖 `openssl`、`python3` 或 `od`）。
- **可选：** 你可以在该 `.env` 中设置提供者密钥（如 `GROQ_API_KEY`, `OLLAMA_API_KEY`）及其他 OpenClaw 环境变量。
- **主机端口：** 默认脚本映射端口 `18789`（网关）和 `18790`（桥接）。启动时可用 `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` 和 `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` 来覆盖 **主机** 端口映射。
- **网关绑定：** 默认情况下，`run-openclaw-podman.sh` 使用 `--bind loopback` 以安全实现本地访问。若需局域网暴露网关，请设置 `OPENCLAW_GATEWAY_BIND=lan`，并在 `openclaw.json` 中配置 `gateway.controlUi.allowedOrigins`（或显式启用 host-header 回退）。
- **路径：** 主机的配置和工作区默认为 `~openclaw/.openclaw` 和 `~openclaw/.openclaw/workspace`。可通过设置 `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 以覆盖启动脚本使用的主机路径。

## 存储模型

- **持久化主机数据：** `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 绑定挂载到容器内，数据持久保存在主机。
- **临时沙箱 tmpfs：** 如果启用 `agents.defaults.sandbox`，工具沙箱容器会在 `/tmp`、`/var/tmp` 和 `/run` 挂载 `tmpfs`。这些路径是内存挂载，容器停止即消失；顶级 Podman 容器不添加自定义 tmpfs 挂载。
- **磁盘增长热点：** 主要关注路径 `media/`，`agents/<agentId>/sessions/sessions.json`，转录 JSONL 文件，`cron/runs/*.jsonl`，以及 `/tmp/openclaw/`（或配置的 `logging.file`）下的滚动日志文件。

`setup-podman.sh` 现在在私有临时目录中暂存镜像 tar 包，并在设置时打印所选基目录。对于无根运行，仅当基目录安全时才使用 `TMPDIR`，否则回退到 `/var/tmp`，再回退到 `/tmp`。保存的 tar 文件权限仅限所有者，并流入目标用户的 `podman load`，以避免调用者的私有临时目录阻塞设置。

## 常用命令

- **日志：** 使用 quadlet：`sudo journalctl --machine openclaw@ --user -u openclaw.service -f`。使用脚本：`sudo -u openclaw podman logs -f openclaw`
- **停止：** 使用 quadlet：`sudo systemctl --machine openclaw@ --user stop openclaw.service`。使用脚本：`sudo -u openclaw podman stop openclaw`
- **重新启动：** 使用 quadlet：`sudo systemctl --machine openclaw@ --user start openclaw.service`。使用脚本：重新运行启动脚本或 `podman start openclaw`
- **删除容器：** `sudo -u openclaw podman rm -f openclaw` — 主机上的配置和工作区保留

## 故障排除

- **配置或授权档权限拒绝（EACCES）：** 容器默认使用 `--userns=keep-id` 以同主机用户 uid/gid 运行。确保你的主机 `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 由该用户拥有。
- **网关启动被阻止（缺少 `gateway.mode=local`）：** 确认 `~openclaw/.openclaw/openclaw.json` 存在且设置了 `gateway.mode="local"`。`setup-podman.sh` 会在缺失时自动创建。
- **无根 Podman 对 openclaw 用户失败：** 检查 `/etc/subuid` 和 `/etc/subgid` 中是否包含 openclaw 的一行（如 `openclaw:100000:65536`）。若缺失则添加并重启。
- **容器名已被占用：** 启动脚本使用 `podman run --replace`，已存在的容器会被替换。要手动清理：`podman rm -f openclaw`。
- **作为 openclaw 运行时找不到脚本：** 确认执行过 `setup-podman.sh`，从而将 `run-openclaw-podman.sh` 拷贝到 openclaw 用户家目录（如 `/home/openclaw/run-openclaw-podman.sh`）。
- **Quadlet 服务未找到或启动失败：** 编辑 `.container` 文件后运行 `sudo systemctl --machine openclaw@ --user daemon-reload`。Quadlet 需要 cgroups v2，检查命令：`podman info --format '{{.Host.CgroupsVersion}}'` 应返回 `2`。

## 可选：以你自己的用户运行

要以普通用户身份运行网关（无专用 openclaw 用户）：构建镜像，创建 `~/.openclaw/.env` 并包含 `OPENCLAW_GATEWAY_TOKEN`，然后用 `--userns=keep-id` 及挂载到你的 `~/.openclaw` 运行容器。启动脚本是为 openclaw 用户设计，对于单用户环境，你可以手动运行脚本中的 `podman run` 命令，指向你的家目录配置和工作区。推荐大多数用户使用 `setup-podman.sh` 并作为 openclaw 用户运行，以实现配置和进程隔离。
