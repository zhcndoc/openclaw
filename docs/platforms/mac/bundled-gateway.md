---
summary: "macOS 上的网关运行时（外部 launchd 服务）"
read_when:
  - 打包 OpenClaw.app
  - 调试 macOS 网关 launchd 服务
  - 为 macOS 安装网关 CLI
title: "macOS 上的网关"
---

OpenClaw.app 不再捆绑 Node/Bun 或 Gateway 运行时。macOS 应用
期望安装一个**外部**的 `openclaw` CLI，不会将 Gateway 作为子进程启动，
并会管理一个按用户分配的 launchd 服务来保持 Gateway 运行（如果已经有一个本地 Gateway 在运行，则会连接到它）。

## 安装 CLI（本地模式必需）

Mac 上默认运行时是 Node 24。为了兼容，Node 22 LTS（当前为 `22.16+`）仍然可用。然后全局安装 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 应用中的 **安装 CLI** 按钮会运行应用内部使用的同样的全局安装流程：
它会优先使用 npm，然后是 pnpm，如果检测到的唯一包管理器是 bun，则使用 bun。
Node 仍然是推荐的 Gateway 运行时。

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

- "OpenClaw Active" 会启用/禁用 LaunchAgent。
- 关闭应用**不会**停止 gateway（launchd 会保持它存活）。
- 如果已有一个 Gateway 在配置的端口上运行，应用会连接到它，
  而不是启动一个新的。

日志：

- launchd 标准输出/错误：`/tmp/openclaw/openclaw-gateway.log`

## 版本兼容性

macOS 应用会检查 Gateway 版本与自身版本是否匹配。如果它们不兼容，
请更新全局 CLI 以匹配应用版本。

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
