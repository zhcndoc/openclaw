---
summary: "macOS 上的 Gateway 生命周期（launchd）"
read_when:
  - 将 mac 应用与 gateway 生命周期集成
title: "macOS 上的 Gateway 生命周期"
---

macOS 应用默认通过 **launchd** 管理 Gateway，不会将 Gateway 作为子进程启动。它首先尝试连接到配置端口上已在运行的 Gateway；如果无法连接，则通过外部 `openclaw` CLI 启用 launchd 服务（不包含嵌入式运行时）。这可确保在登录时可靠自动启动，并在崩溃后自动重启。

子进程模式（由应用直接启动 Gateway）**目前未使用**。如果你需要与 UI 更紧密地耦合，请在终端中手动运行 Gateway。

## 默认行为（launchd）

- 该应用会安装一个按用户的 LaunchAgent，标签为 `ai.openclaw.gateway`（或者在使用 `--profile`/`OPENCLAW_PROFILE` 时为 `ai.openclaw.<profile>`）。
- 当启用本地模式时，应用会确保 LaunchAgent 已加载，并在需要时启动 Gateway。
- 日志会写入 launchd gateway 日志路径（可在调试设置中查看）。

常用命令：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

运行命名配置文件时，请将标签替换为 `ai.openclaw.<profile>`。

## 未签名的开发构建

`scripts/restart-mac.sh --no-sign` 用于不带签名密钥的快速本地构建。为了防止 launchd 指向未签名的中继二进制文件，它会写入
`~/.openclaw/disable-launchagent`。

如果该标记存在，已签名运行的 `scripts/restart-mac.sh` 会清除这个覆盖设置。要手动重置：

```bash
rm ~/.openclaw/disable-launchagent
```

## 仅附加模式

要强制 macOS 应用永不安装或管理 launchd，请使用
`--attach-only`（或 `--no-launchd`）启动它。这将设置
`~/.openclaw/disable-launchagent`，因此应用只会附加到已在运行的
Gateway。也可以在调试设置中切换相同的行为。

## Remote Mode

Remote mode never starts the local Gateway. The application will use an SSH tunnel to connect to the remote host and establish a connection through that tunnel.

## 我们为何偏好 launchd

- 登录时自动启动。
- 内置的重启/KeepAlive 语义。
- 可预测的日志和监督机制。

如果将来真的再次需要真正的子进程模式，它应被记录为一个单独的、明确的仅开发模式。

## 相关内容

- [macOS 应用](/platforms/macos)
- [Gateway 运行手册](/gateway)
