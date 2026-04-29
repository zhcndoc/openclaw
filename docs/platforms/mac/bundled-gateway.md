---
summary: "macOS 上的网关运行时（外部 launchd 服务）"
read_when:
  - 打包 OpenClaw.app
  - 调试 macOS 网关 launchd 服务
  - 为 macOS 安装网关 CLI
title: "macOS 上的网关"
---

OpenClaw.app 不再捆绑 Node/Bun 或 Gateway 运行时。macOS 应用
期望使用一个**外部**安装的 `openclaw` CLI，不会将 Gateway 作为
子进程启动，并且会管理一个按用户区分的 launchd 服务，以保持 Gateway
持续运行（如果已有本地 Gateway 在运行，则会连接到现有实例）。

## 安装 CLI（本地模式必需）

Mac 上默认的运行时是 Node 24。当前 `22.14+` 的 Node 22 LTS 仍可用于兼容性。然后全局安装 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 应用的 **安装 CLI** 按钮会执行与应用内部相同的全局安装流程：它优先使用 npm，其次是 pnpm，最后是 bun（如果 bun 是唯一检测到的包管理器）。Node 仍然是推荐的 Gateway 运行时。

## launchd（将 Gateway 作为 LaunchAgent）

标签：

- `ai.openclaw.gateway`（或 `ai.openclaw.<profile>`；旧的 `com.openclaw.*` 可能仍然存在）

Plist 位置（按用户）：

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  （或 `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`）

管理器：

- macOS 应用在本地模式下负责 LaunchAgent 的安装/更新。
- CLI 也可以安装它：`openclaw gateway install`。

行为：

- “OpenClaw Active” 会启用/禁用 LaunchAgent。
- 退出应用**不会**停止 gateway（launchd 会让它继续运行）。
- 如果配置端口上已经有一个 Gateway 在运行，应用会连接到它
  而不是启动一个新的实例。

日志：

- launchd 标准输出/错误：`/tmp/openclaw/openclaw-gateway.log`

## 版本兼容性

macOS 应用会将 gateway 版本与自身版本进行检查。如果它们
不兼容，请更新全局 CLI 以匹配应用版本。

## 冒烟检查

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

- [macOS 应用](/platforms/macos)
- [Gateway 运行手册](/gateway)
