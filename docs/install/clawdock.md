---
summary: "ClawDock 用于基于 Docker 的 OpenClaw 安装的 shell 助手"
read_when:
  - 您经常使用 Docker 运行 OpenClaw 并希望使用更简短的日常命令
  - 您想要一个用于仪表板、日志、令牌设置和配对流程的助手层
title: "ClawDock"
---

ClawDock 是一个用于基于 Docker 的 OpenClaw 安装的 shell 助手层。

它为您提供简短的命令，如 `clawdock-start`、`clawdock-dashboard` 和 `clawdock-fix-token`，而不是较长的 `docker compose ...` 调用。

如果您尚未设置 Docker，请从 [Docker](/install/docker) 开始。

## 安装

使用标准助手路径：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果您之前从 `scripts/shell-helpers/clawdock-helpers.sh` 安装了 ClawDock，请从新的 `scripts/clawdock/clawdock-helpers.sh` 路径重新安装。旧的 raw GitHub 路径已被移除。

## 您将获得什么

### 基本操作

| 命令            | 描述            |
| ------------------ | ---------------------- |
| `clawdock-start`   | 启动网关      |
| `clawdock-stop`    | 停止网关       |
| `clawdock-restart` | 重启网关    |
| `clawdock-status`  | 检查容器状态 |
| `clawdock-logs`    | 跟踪网关日志    |

### 容器访问

| 命令                   | 描述                                   |
| ------------------------- | --------------------------------------------- |
| `clawdock-shell`          | 在网关容器内打开 shell     |
| `clawdock-cli <command>`  | 在 Docker 中运行 OpenClaw CLI 命令           |
| `clawdock-exec <command>` | 在容器中执行任意命令 |

### Web UI 和配对

| 命令                 | 描述                  |
| ----------------------- | ---------------------------- |
| `clawdock-dashboard`    | 打开控制 UI URL      |
| `clawdock-devices`      | 列出待处理的设备配对 |
| `clawdock-approve <id>` | 批准配对请求    |

### 设置和维护

| 命令              | 描述                                      |
| -------------------- | ------------------------------------------------ |
| `clawdock-fix-token` | 在容器内配置网关令牌 |
| `clawdock-update`    | 拉取、重建并重启                       |
| `clawdock-rebuild`   | 仅重建 Docker 镜像                    |
| `clawdock-clean`     | 移除容器和卷                    |

### 实用工具

| 命令                | 描述                             |
| ---------------------- | --------------------------------------- |
| `clawdock-health`      | 运行网关健康检查              |
| `clawdock-token`       | 打印网关令牌                 |
| `clawdock-cd`          | 跳转到 OpenClaw 项目目录  |
| `clawdock-config`      | 打开 `~/.openclaw`                      |
| `clawdock-show-config` | 打印配置文件的脱敏值 |
| `clawdock-workspace`   | 打开工作区目录            |

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

ClawDock 使用与 [Docker](/install/docker) 中描述的相同的 Docker 配置拆分：

- `<project>/.env` 用于 Docker 特定值，例如镜像名称、端口和网关令牌
- `~/.openclaw/.env` 用于基于环境变量的提供商密钥和机器人令牌
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 用于存储的提供商 OAuth/API 密钥认证
- `~/.openclaw/openclaw.json` 用于行为配置

当您想快速查看 `.env` 文件和 `openclaw.json` 时，请使用 `clawdock-show-config`。它会在打印输出中对 `.env` 值进行脱敏处理。

## 相关页面

- [Docker](/install/docker)
- [Docker VM 运行时](/install/docker-vm-runtime)
- [更新](/install/updating)
