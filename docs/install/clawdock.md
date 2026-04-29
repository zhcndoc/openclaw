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

使用标准辅助路径：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果你之前是从 `scripts/shell-helpers/clawdock-helpers.sh` 安装的 ClawDock，请改为从新的 `scripts/clawdock/clawdock-helpers.sh` 路径重新安装。旧的 GitHub raw 路径已被移除。

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

| 命令              | 说明                                      |
| -------------------- | ------------------------------------------------ |
| `clawdock-fix-token` | 在容器内配置网关令牌 |
| `clawdock-update`    | 拉取、重建并重启                       |
| `clawdock-rebuild`   | 仅重建 Docker 镜像                    |
| `clawdock-clean`     | 移除容器和卷                    |

### 实用工具

| 命令                | 说明                             |
| ---------------------- | --------------------------------------- |
| `clawdock-health`      | 运行网关健康检查              |
| `clawdock-token`       | 打印网关令牌                 |
| `clawdock-cd`          | 跳转到 OpenClaw 项目目录  |
| `clawdock-config`      | 打开 `~/.openclaw`                      |
| `clawdock-show-config` | 打印已隐藏敏感值的配置文件 |
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

ClawDock 使用与 [Docker](/install/docker) 中描述的相同 Docker 配置拆分：

- `<project>/.env` 用于 Docker 特定值，例如镜像名称、端口和网关令牌
- `~/.openclaw/.env` 用于基于环境变量的提供者密钥和机器人令牌
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 用于存储的提供者 OAuth/API 密钥认证
- `~/.openclaw/openclaw.json` 用于行为配置

当你想快速查看 `.env` 文件和 `openclaw.json` 时，使用 `clawdock-show-config`。它会在打印输出中隐藏 `.env` 值。

## 相关页面

- [Docker](/install/docker)
- [Docker VM Runtime](/install/docker-vm-runtime)
- [更新](/install/updating)
