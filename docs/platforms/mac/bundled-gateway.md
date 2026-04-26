---
summary: "macOS上的网关运行时（外部launchd服务）"
read_when:
  - 打包 OpenClaw.app
  - 调试 macOS 网关的 launchd 服务
  - 为 macOS 安装网关 CLI
title: "macOS上的网关"
---

OpenClaw.app 不再捆绑 Node/Bun 或 Gateway 运行时。macOS 应用
期望安装一个**外部**的 `openclaw` CLI，不会将 Gateway 作为子进程启动，
并通过管理每用户的 launchd 服务来保持 Gateway 运行（如果本地已有正在运行的 Gateway，则会附加到该实例）。

## 安装 CLI（本地模式必需）

Mac 上默认运行时是 Node 24。Node 22 LTS，目前为 `22.14+`，为了兼容性仍然可用。然后全局安装 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 应用的 **Install CLI** 按钮会运行与应用内部相同的全局安装流程：
它优先使用 npm，然后是 pnpm，如果检测到的包管理器只有 bun，则使用 bun。Node 仍然是推荐的 Gateway 运行时。

## Launchd（网关作为 LaunchAgent）

标签：

- `ai.openclaw.gateway`（或 `ai.openclaw.<profile>`；旧有的 `com.openclaw.*` 可能依然保留）

Plist 位置（每用户）：

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  （或 `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`）

管理：

- macOS 应用在本地模式下负责安装/更新 LaunchAgent。
- CLI 也可以安装：`openclaw gateway install`。

行为：

- “OpenClaw Active” 开启/关闭该 LaunchAgent。
- 应用退出**不会**停止网关（launchd 会保持它运行）。
- 如果配置端口已有网关运行，应用会附加到该网关，而不是启动新的。

日志：

- launchd 标准输出/错误日志路径：`/tmp/openclaw/openclaw-gateway.log`

## 版本兼容性

macOS 应用会检查网关版本是否与自身版本兼容。如不兼容，
请更新全局 CLI 版本以匹配应用版本。

## 简单检查

```bash
openclaw --version

OPENCLAW_SKIP_CHANNELS=1 \
OPENCLAW_SKIP_CANVAS_HOST=1 \
openclaw gateway --port 18999 --bind loopback
```

然后：

```bash
openclaw gateway call health --url ws://127.0.0.1:18999 --timeout 3000
```

## 相关内容

- [macOS app](/platforms/macos)
- [Gateway runbook](/gateway)
