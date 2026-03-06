---
summary: "macOS 上的 Gateway 生命周期（launchd）"
read_when:
  - 集成 mac 应用与 Gateway 生命周期
title: "Gateway 生命周期"
---

# macOS 上的 Gateway 生命周期

macOS 应用**默认通过 launchd 管理 Gateway**，不会将 Gateway 作为子进程启动。应用首先尝试连接已经在配置端口上运行的 Gateway；如果无法连接，则通过外部的 `openclaw` 命令行工具（无嵌入式运行时）启用 launchd 服务。这为你提供了登录时自动启动和崩溃时自动重启的可靠保障。

子进程模式（Gateway 由应用直接启动）**目前不使用**。如果需要与 UI 紧密耦合，请手动在终端中运行 Gateway。

## 默认行为（launchd）

- 应用安装一个每用户的 LaunchAgent，标签为 `ai.openclaw.gateway`  
  （使用 `--profile` 或 `OPENCLAW_PROFILE` 时为 `ai.openclaw.<profile>`；支持旧版 `com.openclaw.*`）。
- 启用本地模式时，应用确保 LaunchAgent 已加载，并在需要时启动 Gateway。
- 日志写入到 launchd Gateway 日志路径（可在调试设置中查看）。

常用命令：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

运行命名配置文件时，将标签替换为 `ai.openclaw.<profile>`。

## 未签名的开发版

`scripts/restart-mac.sh --no-sign` 用于在没有签名密钥时快速本地构建。为了防止 launchd 指向未签名的 relay 二进制文件，它会：

- 写入 `~/.openclaw/disable-launchagent` 文件。

签署版本的 `scripts/restart-mac.sh` 如果发现标志文件会清除此覆盖。要手动重置：

```bash
rm ~/.openclaw/disable-launchagent
```

## 仅附加模式

要强制 macOS 应用**永不安装或管理 launchd**，请使用 `--attach-only`（或 `--no-launchd`）启动。这会设置 `~/.openclaw/disable-launchagent`，应用仅附加到已运行的 Gateway。此行为也可以在调试设置中切换。

## 远程模式

远程模式绝不启动本地 Gateway。应用通过 SSH 隧道连接到远程主机，并通过该隧道进行连接。

## 我们为何偏好 launchd

- 登录时自动启动。
- 内建的重启及 KeepAlive 机制。
- 可预测的日志和管理。

如果将来真正需要子进程模式，应作为独立且明确的仅开发模式进行文档说明。
