---
summary: "macOS 上的网关运行时（外部 launchd 服务）"
read_when:
  - 打包 OpenClaw.app
  - 调试 macOS 网关 launchd 服务
  - 为 macOS 安装网关 CLI
title: "macOS 上的网关"
---

OpenClaw.app 不捆绑 Node 或 Gateway 运行时。macOS 应用
期望安装一个 **外部** 的 `openclaw` CLI，不会将 Gateway 作为
子进程启动，并且会管理一个按用户划分的 launchd 服务，以保持 Gateway
持续运行（或者连接到一个已经在运行的本地 Gateway）。

## 自动设置

在全新的 Mac 上，请在初始设置过程中选择 **This Mac**。在 Gateway 向导之前，应用会运行其已签名的捆绑安装脚本：它会在 `~/.openclaw` 下安装用户空间的 Node 运行时和匹配的 `openclaw` CLI，然后安装并启动按用户运行的 launchd 服务。此路径不需要 Terminal、Homebrew 或管理员权限。

应用只捆绑安装脚本，不包含 Node 或 Gateway 负载；设置需要互联网连接，以下载运行时和匹配的 OpenClaw 软件包。

## 手动恢复

对于手动安装，请使用 Node 26（推荐）或其他受支持的版本：
Node 22.22.3+、Node 24.15+ 或 Node 25.9+。全局安装 `openclaw`：

```bash
npm install -g openclaw@<version>
```

在自动设置失败后使用 **重试设置**。如果仍然失败，
请使用上面的命令手动安装 CLI，然后在引导流程中选择 **再次检查**。

## launchd（将 Gateway 作为 LaunchAgent）

标签：`ai.openclaw.gateway`（默认配置文件），或 `ai.openclaw.<profile>`
用于指定名称的配置文件。

Plist 位置（每用户）：`~/Library/LaunchAgents/ai.openclaw.gateway.plist`
（或 `ai.openclaw.<profile>.plist`）。

在本地模式下，macOS 应用负责默认配置文件的 LaunchAgent 安装/更新。
CLI 也可以直接安装：`openclaw gateway install`
（命名配置文件通过 `OPENCLAW_PROFILE` 环境变量选择）。

行为：

- “OpenClaw 活动” 启用/禁用 LaunchAgent。
- 退出应用不会**停止** Gateway（launchd 会保持它存活）。
- 如果配置端口上已经有一个 Gateway 在运行，应用会连接到它，
  而不是启动一个新的。

日志：

- launchd stdout: `~/Library/Logs/openclaw/gateway.log`（配置文件使用
  `gateway-<profile>.log`）
- launchd stderr: 已抑制
- 如果主机因重复的 `EADDRINUSE` 或快速重启而陷入循环，请检查是否存在重复的
  `ai.openclaw.gateway` / `ai.openclaw.node` LaunchAgents，以及
  [Gateway troubleshooting](/gateway/troubleshooting#macos-launchd-supervisor-loop-with-duplicate-gatewaynode-launchagents) 中的
  launchd-marker 变通方案。

## 版本兼容性

macOS 应用会将 Gateway 版本与自身版本进行检查。引导
在现有 CLI 缺失或
不兼容时会自动运行受管设置。使用 **重试设置** 可重复安装，或在修复外部 CLI 后使用 **再次检查**。

## macOS 上的状态目录

将 OpenClaw 状态保存在本地、不同步的磁盘上。避免使用 iCloud Drive 和其他云同步文件夹；同步延迟和文件锁可能会影响会话、凭据和 Gateway 状态。

仅在需要覆盖默认设置时，才将 `OPENCLAW_STATE_DIR` 设置为本地路径。
`openclaw doctor` 会警告常见的云同步状态路径，并建议迁回本地存储。请参阅
[环境变量](/help/environment#path-related-env-vars) 和
[Doctor](/gateway/doctor)。

## 调试应用连接性

使用源代码检出中的 macOS 调试 CLI 来执行应用所使用的相同 Gateway
WebSocket 握手和发现逻辑：

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

`connect` 接受 `--url`、`--token`、`--timeout`、`--probe` 和 `--json`
（以及客户端标识覆盖；运行 `--help` 查看完整列表）。
`discover` 接受 `--timeout`、`--json` 和 `--include-local`。需要将
发现输出与 `openclaw gateway discover --json` 进行比较时，可借此
区分 CLI 发现问题和应用端连接问题。

## 冒烟检查

```bash
openclaw --version

OPENCLAW_SKIP_CHANNELS=1 \
OPENCLAW_SKIP_CANVAS_HOST=1 \
openclaw gateway --port 18999 --bind loopback
```

然后：

```bash
openclaw gateway call health --port 18999 --timeout 3000
```

## 相关内容

- [macOS 应用](/platforms/macos)
- [Gateway 运行手册](/gateway)
