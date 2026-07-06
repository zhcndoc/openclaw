---
summary: "用于 Docker 部署的 OpenClaw 的 ClawDock shell 辅助工具"
read_when:
  - 你经常通过 Docker 运行 OpenClaw，并希望日常命令更简短
  - 你希望为仪表盘、日志、令牌设置和配对流程提供一层辅助工具
title: "ClawDock"
---

ClawDock 是一个用于 Docker 部署的 OpenClaw 的小型 shell 辅助层。

它为你提供诸如 `clawdock-start`、`clawdock-dashboard` 和 `clawdock-fix-token` 之类的短命令，而不是更长的 `docker compose ...` 调用。

如果你还没有设置 Docker，请先查看 [Docker](/install/docker)。

## 安装

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果你之前是从 `scripts/shell-helpers/clawdock-helpers.sh` 安装的 ClawDock，请从当前的 `scripts/clawdock/clawdock-helpers.sh` 路径重新安装；旧的 GitHub 原始链接已被移除。

这些辅助脚本会在首次使用时自动检测你的 OpenClaw 检出目录（会检查诸如 `~/openclaw`、`~/projects/openclaw` 等常见路径），并将结果缓存到 `~/.clawdock/config`。如果你的检出目录位于其他位置，请自行设置 `CLAWDOCK_DIR`。

## 你将获得什么

### 基本操作

| 命令            | 说明                 |
| ------------------ | ---------------------- |
| `clawdock-start`   | 启动网关      |
| `clawdock-stop`    | 停止网关       |
| `clawdock-restart` | 重启网关    |
| `clawdock-status`  | 检查容器状态 |
| `clawdock-logs`    | 跟踪网关日志    |

### 容器访问

| 命令                   | 说明                                   |
| ------------------------- | --------------------------------------------- |
| `clawdock-shell`          | 在网关容器内打开 shell     |
| `clawdock-cli <command>`  | 在 Docker 中运行 OpenClaw CLI 命令           |
| `clawdock-exec <command>` | 在容器中执行任意命令 |

### Web UI 和配对

| 命令                 | 说明                  |
| ----------------------- | ---------------------------- |
| `clawdock-dashboard`    | 打开控制 UI 的 URL      |
| `clawdock-devices`      | 列出待处理的设备配对 |
| `clawdock-approve <id>` | 批准配对请求    |

### 设置和维护

| 命令              | 说明                                       |
| -------------------- | ------------------------------------------------- |
| `clawdock-fix-token` | 将网关令牌写入容器配置 |
| `clawdock-update`    | 拉取、重建并重启                        |
| `clawdock-rebuild`   | 仅重建 Docker 镜像                     |
| `clawdock-clean`     | 移除容器和卷                     |

### 实用工具

| 命令                | 说明                             |
| ---------------------- | --------------------------------------- |
| `clawdock-health`      | 运行网关健康检查              |
| `clawdock-token`       | 打印网关令牌                 |
| `clawdock-cd`          | 跳转到 OpenClaw 项目目录  |
| `clawdock-config`      | 打开 `~/.openclaw`                      |
| `clawdock-show-config` | 打印已脱敏值的配置文件 |
| `clawdock-workspace`   | 打开工作区目录            |
| `clawdock-help`        | 列出所有 ClawDock 命令              |

## 首次使用流程

```bash
clawdock-start
clawdock-fix-token
clawdock-dashboard
```

如果浏览器提示需要配对：

```bash
clawdock-devices
clawdock-approve <request-id>
```

## 配置和密钥

ClawDock 读取两个独立的 `.env` 文件，与 [Docker](/install/docker) 中描述的拆分方式一致：

- `docker-compose.yml` 旁边的项目 `.env`：Docker 专用值，例如镜像名称、端口和 `OPENCLAW_GATEWAY_TOKEN`。`clawdock-token` 会从这里读取令牌。
- `~/.openclaw/.env`（挂载到容器中）：OpenClaw 自身管理的基于环境变量的密钥，以及 `openclaw.json` 和 `agents/<agentId>/agent/auth-profiles.json`。

`clawdock-fix-token` 会将项目 `.env` 中的令牌复制到容器的 `gateway.remote.token` 和 `gateway.auth.token` 配置值中，并重启网关。

使用 `clawdock-show-config` 可以快速检查 `openclaw.json` 以及这两个 `.env` 文件；它会在打印输出中对 `.env` 值进行脱敏。

## 相关

<CardGroup cols={2}>
  <Card title="Docker" href="/install/docker" icon="docker">
    OpenClaw 的标准 Docker 安装。
  </Card>
  <Card title="Docker VM runtime" href="/install/docker-vm-runtime" icon="cube">
    由 Docker 管理的 VM 运行时，用于更强的隔离。
  </Card>
  <Card title="Updating" href="/install/updating" icon="arrow-up-right-from-square">
    更新 OpenClaw 包和受管服务。
  </Card>
</CardGroup>
