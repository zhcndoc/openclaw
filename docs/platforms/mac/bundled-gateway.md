---
summary: "macOS上的网关运行时（外部launchd服务）"
read_when:
  - 打包 OpenClaw.app
  - 调试 macOS 网关的 launchd 服务
  - 为 macOS 安装网关 CLI
title: "macOS上的网关"
---

# macOS上的网关（外部 launchd）

OpenClaw.app 不再内置 Node/Bun 或网关运行时。macOS 应用程序
期望**外部**安装有 `openclaw` CLI，不会以子进程方式启动 网关，
而是管理每个用户的 launchd 服务以保持网关运行（或者如果本地已有运行的网关，
则附加到现有网关）。

## 安装 CLI（本地模式必需）

Mac 上默认运行时是 Node 24。Node 22 LTS，目前为 `22.14+`，为了兼容性仍然可用。然后全局安装 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 应用中的**安装 CLI**按钮，执行相同的 npm/pnpm 流程（不推荐使用 bun 来运行网关）。

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
