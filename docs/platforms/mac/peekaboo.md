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

OpenClaw 有三条刻意保持分离的桌面控制路径：

- **PeekabooBridge 主机**：OpenClaw.app 承载本地 PeekabooBridge 套接字。`peekaboo` CLI 是客户端，并使用 OpenClaw.app 的 macOS 权限来执行截图、点击、菜单、对话框、Dock 操作以及窗口管理。
- **Codex Computer Use**：随附的 `codex` 插件会检查并可安装 Codex 的 `computer-use` MCP 插件（`extensions/codex/src/app-server/computer-use.ts`），然后在 Codex 模式轮次中让 Codex 接管原生桌面控制工具调用。OpenClaw 不会通过 PeekabooBridge 代理这些操作。
- **直接的 `cua-driver` MCP**：OpenClaw 可以将 TryCua 的上游 `cua-driver mcp` 服务器注册为普通 MCP 服务器，为代理提供 CUA 驱动自身的 schema 以及 pid/window/element-index 工作流，而无需经过 Codex marketplace 或 PeekabooBridge 套接字。

在通过 OpenClaw.app 的具备权限感知的桥接主机提供广泛的 macOS 自动化能力时，请使用 Peekaboo。若 Codex 模式下的代理应依赖 Codex 的原生插件，请使用 Codex Computer Use。若要将 CUA 驱动以普通 MCP 服务器的形式暴露给任何由 OpenClaw 管理的运行时，请直接使用 `cua-driver mcp`。

## 启用桥接

在 macOS 应用中：**Settings -> Enable Peekaboo Bridge**。

启用后，OpenClaw 会在 `~/Library/Application Support/OpenClaw/<socket-name>` 启动一个本地 UNIX socket 服务器。若禁用，主机会停止，`peekaboo` 会回退到其他可用主机。协调器还会维护传统的 socket 符号链接（Application Support 下的 `clawdbot`、`clawdis`、`moltbot`），它们指向当前 socket，以兼容旧版 `peekaboo` 安装。

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
