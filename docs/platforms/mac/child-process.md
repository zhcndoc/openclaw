---
summary: "macOS 上的 Gateway 生命周期（launchd）"
read_when:
  - 将 mac 应用与 gateway 生命周期集成
title: "macOS 上的 Gateway 生命周期"
---

macOS 应用默认**通过 launchd 管理 Gateway**，而不会将 Gateway 作为子进程启动。它会先尝试连接到在配置端口上已经运行的 Gateway；如果找不到可达实例，则会通过外部 `openclaw` CLI 启用 launchd 服务（不使用嵌入式运行时）。这样可以确保在登录时可靠自动启动，并在崩溃时自动重启。

子进程模式（由应用直接启动 Gateway）**目前未使用**。如果你需要与 UI 更紧密地耦合，请在终端中手动运行 Gateway。

## 默认行为（launchd）

- 应用会安装一个按用户的 LaunchAgent，标签为 `ai.openclaw.gateway`
  （如果使用 `--profile`/`OPENCLAW_PROFILE`，则为 `ai.openclaw.<profile>`；也支持旧的 `com.openclaw.*`）。
- 当启用本地模式时，应用会确保 LaunchAgent 已加载，并在需要时启动 Gateway。
- 日志会写入 launchd 的 gateway 日志路径（可在调试设置中查看）。

常用命令：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

运行命名配置文件时，请将标签替换为 `ai.openclaw.<profile>`。

## 未签名的开发构建

`scripts/restart-mac.sh --no-sign` 适用于在没有签名密钥时进行快速本地构建。为了防止 launchd 指向一个未签名的 relay 二进制文件，它会：

- 写入 `~/.openclaw/disable-launchagent`。

如果该标记存在，已签名运行的 `scripts/restart-mac.sh` 会清除这个覆盖设置。要手动重置：

```bash
rm ~/.openclaw/disable-launchagent
```

## 仅附加模式

要强制 macOS 应用**永远不安装或管理 launchd**，请使用 `--attach-only`（或 `--no-launchd`）启动它。这会设置 `~/.openclaw/disable-launchagent`，因此应用只会连接到已在运行的 Gateway。你也可以在调试设置中切换相同行为。

## 远程模式

远程模式永远不会启动本地 Gateway。应用会使用 SSH 隧道连接到远程主机，并通过该隧道建立连接。

## 我们为何偏好 launchd

- 登录时自动启动。
- 内置的重启/KeepAlive 语义。
- 可预测的日志和监督机制。

如果将来再次需要真正的子进程模式，则应将其记录为一个单独的、明确的仅供开发使用的模式。

## 相关内容

- [macOS 应用](/platforms/macos)
- [Gateway 运行手册](/gateway)
