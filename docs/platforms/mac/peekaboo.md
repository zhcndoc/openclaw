---
summary: "用于 macOS UI 自动化的 PeekabooBridge 集成"
read_when:
  - 在 OpenClaw.app 中托管 PeekabooBridge
  - 通过 Swift Package Manager 集成 Peekaboo
  - 更改 PeekabooBridge 协议/路径
  - 在 PeekabooBridge、Codex Computer Use 和 cua-driver MCP 之间做选择
title: "Peekaboo 桥接"
---

OpenClaw 可以将 **PeekabooBridge** 作为本地、感知权限的 UI 自动化中介来托管（`PeekabooBridgeHostCoordinator`，由 `steipete/Peekaboo` Swift 包提供支持）。这样，`peekaboo` CLI 就可以驱动 UI 自动化，同时复用 macOS 应用的 TCC 权限。

## 这是什么（以及不是什么）

- **主机**：OpenClaw.app 可以充当 PeekabooBridge 主机。
- **客户端**：`peekaboo` CLI（没有单独的 `openclaw ui ...` 界面）。
- **UI**：视觉覆盖层仍然保留在 Peekaboo.app 中；OpenClaw 只是一个轻量的中介主机。

## 与其他桌面控制路径的关系

OpenClaw 有四条刻意保持分离的桌面控制路径：

- **PeekabooBridge 主机**：OpenClaw.app 托管本地 PeekabooBridge 套接字。`peekaboo` CLI 是客户端，并使用 OpenClaw.app 的 macOS 权限来进行截图、点击、菜单、对话框、Dock 操作和窗口管理。
- **代理驱动的计算机使用（`computer.act`）**：网关代理内置的 `computer` 工具通过 `screen.snapshot` 捕获截图，并通过危险的 `computer.act` 节点命令驱动指针和键盘。macOS 节点通过其公开的嵌入式 Peekaboo 自动化服务以及窄范围的 CoreGraphics 原语，在进程内实现 `computer.act`，而不经过 PeekabooBridge 套接字或 `peekaboo` CLI。参见 [计算机使用](/nodes/computer-use)。
- **Codex Computer Use**：捆绑的 `codex` 插件会检查并可以安装 Codex 的 `computer-use` MCP 插件（`extensions/codex/src/app-server/computer-use.ts`），然后在 Codex 模式轮次中让 Codex 接管原生桌面控制工具调用。OpenClaw 不会通过 PeekabooBridge 代理这些操作。
- **直接 `cua-driver` MCP**：OpenClaw 可以将 TryCua 的上游 `cua-driver mcp` 服务器注册为普通 MCP 服务器，使代理获得 CUA 驱动自身的 schema 以及 pid/窗口/元素索引工作流，而无需通过 Codex 市场或 PeekabooBridge 套接字路由。

使用 Peekaboo，通过 OpenClaw.app 具备权限感知的桥接主机来覆盖广泛的 macOS 自动化能力。使用代理驱动的计算机使用，当网关代理应通过统一的 `computer.act` 节点命令查看并控制桌面，而该命令可由任何视觉模型驱动时。使用 Codex Computer Use，当 Codex 模式代理应依赖 Codex 的原生插件时。使用直接 `cua-driver mcp`，将 CUA 驱动暴露给任何由 OpenClaw 管理的运行时，作为普通 MCP 服务器。

## 启用桥接

在 macOS 应用中：**Settings -> Enable Peekaboo Bridge**。此开关要求 **Allow Computer Control** 处于开启状态，因为两者都会授予本地 UI 自动化权限；在关闭 Computer Control 时，该开关会被禁用，主机也不会运行。若要在没有 Computer Control 的情况下驱动 Peekaboo，请改为运行 Peekaboo 自己的 Mac 应用作为主机。

启用后（且 Computer Control 已开启），OpenClaw 会在 `~/Library/Application Support/OpenClaw/<socket-name>` 启动一个本地 UNIX socket 服务器。若被禁用，主机将停止运行，`peekaboo` 会回退到其他可用主机。协调器还会维护旧版 socket 符号链接（`clawdbot`、`clawdis`、`moltbot` 位于 Application Support 下），它们指向当前 socket，以兼容较旧的 `peekaboo` 安装。

## 客户端发现顺序

Peekaboo 客户端通常按以下顺序尝试主机：

1. Peekaboo.app（完整 UX）
2. Claude.app（如果已安装）
3. OpenClaw.app（轻量 broker）

使用 `peekaboo bridge status --verbose` 查看当前活动的主机以及正在使用的 socket 路径。可通过以下方式覆盖：

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## 安全与权限

- 该桥接会验证 **调用方代码签名**；会强制执行 TeamID 的允许列表（Peekaboo 主机 TeamID 以及正在运行的应用自身的 TeamID）。
- 对于辅助功能，优先使用已签名的 bridge/app 身份，而不是通用的 `node` 运行时。将辅助功能权限授予 `node`，会使该 Node 可执行文件启动的任何包继承 GUI 自动化访问权限；参见 [macOS 权限](/platforms/mac/permissions#accessibility-grants-for-node-and-cli-runtimes)。
- 请求在 10 秒后超时（`requestTimeoutSec: 10`）。
- 如果缺少所需权限，桥接会返回清晰的错误消息，而不是启动系统设置。

## 快照行为（自动化）

快照存储在内存中，有效期为 10 分钟，且最多保留 50 个快照（`InMemorySnapshotManager`）；清理时不会删除工件。如果需要更长的保留时间，请从客户端重新捕获。

## 故障排查

- 如果 `peekaboo` 报告“bridge client is not authorized”，请确保客户端已正确签名，或者仅在**调试**模式下使用 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 运行主机。
- 如果未找到任何主机，请打开其中一个主机应用（Peekaboo.app 或 OpenClaw.app），并确认已授予权限。

## 相关

- [macOS 应用](/platforms/macos)
- [macOS 权限](/platforms/mac/permissions)
