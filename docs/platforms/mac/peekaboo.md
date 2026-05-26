---
summary: "用于 macOS UI 自动化的 PeekabooBridge 集成"
read_when:
  - 在 OpenClaw.app 中托管 PeekabooBridge
  - 通过 Swift Package Manager 集成 Peekaboo
  - 更改 PeekabooBridge 协议/路径
  - 在 PeekabooBridge、Codex Computer Use 和 cua-driver MCP 之间做选择
title: "Peekaboo 桥接"
---

OpenClaw 可以将 **PeekabooBridge** 作为本地、感知权限的 UI 自动化
broker 托管。这使得 `peekaboo` CLI 能够驱动 UI 自动化，同时复用
macOS 应用的 TCC 权限。

## 这是什么（以及不是什么）

- **主机**：OpenClaw.app 可以充当 PeekabooBridge 主机。
- **客户端**：使用 `peekaboo` CLI（没有单独的 `openclaw ui ...` 界面）。
- **UI**：可视化覆盖层保留在 Peekaboo.app 中；OpenClaw 只是一个轻量 broker 主机。

## 与 Computer Use 的关系

OpenClaw 有三条桌面控制路径，并且它们被刻意保持分离：

- **PeekabooBridge 主机**：OpenClaw.app 可以托管本地 PeekabooBridge socket。
  `peekaboo` CLI 仍然是客户端，并使用 OpenClaw.app 的 macOS
  权限来执行 Peekaboo 自动化原语，例如截图、点击、
  菜单、对话框、Dock 操作以及窗口管理。
- **Codex Computer Use**：捆绑的 `codex` 插件会准备 Codex app-server，
  验证 Codex 的 `computer-use` MCP server 是否可用，然后让
  Codex 在 Codex 模式轮次中负责原生桌面控制工具调用。OpenClaw
  不会通过 PeekabooBridge 代理这些操作。
- **直接 `cua-driver` MCP**：OpenClaw 可以将 TryCua 的上游
  `cua-driver mcp` server 作为普通 MCP server 注册。这样代理就能获得 CUA
  驱动自身的 schema 以及 pid/window/element-index 工作流，而无需通过
  Codex marketplace 或 PeekabooBridge socket 路由。

当你希望使用广泛的 macOS 自动化能力以及 OpenClaw.app 的
权限感知桥接主机时，请使用 Peekaboo。当 Codex 模式代理
应当依赖 Codex 原生 computer-use 插件时，请使用 Codex Computer Use。当你希望将 CUA 驱动作为普通
MCP server 暴露给任何由 OpenClaw 管理的运行时，请使用直接的 `cua-driver mcp`。

## 启用桥接

在 macOS 应用中：

- Settings → **启用 Peekaboo Bridge**

启用后，OpenClaw 会启动一个本地 UNIX socket server。若禁用，则主机
会停止，`peekaboo` 将回退到其他可用主机。

## 客户端发现顺序

Peekaboo 客户端通常按以下顺序尝试主机：

1. Peekaboo.app（完整 UX）
2. Claude.app（如果已安装）
3. OpenClaw.app（轻量 broker）

使用 `peekaboo bridge status --verbose` 查看当前活动主机以及正在使用的
socket path。你也可以通过以下方式覆盖：

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## 安全与权限

- 该桥接会验证 **调用方代码签名**；会强制执行 TeamID 白名单（Peekaboo 主机 TeamID + OpenClaw app TeamID）。
- 对于 Accessibility，请优先使用已签名的桥接/app 身份，而不是通用的 `node` 运行时。向 `node` 授予 Accessibility 会让由该 Node 可执行文件启动的任何包继承 GUI 自动化访问权限；请参阅
  [macOS permissions](/platforms/mac/permissions#accessibility-grants-for-node-and-cli-runtimes)。
- 请求将在约 10 秒后超时。
- 如果缺少所需权限，桥接会返回清晰的错误信息，而不是启动系统设置。

## 快照行为（自动化）

快照存储在内存中，并会在短时间后自动过期。
如果你需要更长的保留时间，请从客户端重新捕获。

## 故障排查

- 如果 `peekaboo` 报告 "bridge client is not authorized"，请确保客户端已
  正确签名，或仅在 **debug** 模式下使用 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`
  启动主机。
- 如果未找到主机，请打开其中一个主机应用（Peekaboo.app 或 OpenClaw.app）
  并确认已授予权限。

## 相关

- [macOS app](/platforms/macos)
- [macOS permissions](/platforms/mac/permissions)
