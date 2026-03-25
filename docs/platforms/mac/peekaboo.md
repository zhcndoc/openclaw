---
summary: "PeekabooBridge 在 macOS UI 自动化中的集成"
read_when:
  - 在 OpenClaw.app 中托管 PeekabooBridge
  - 通过 Swift Package Manager 集成 Peekaboo
  - 修改 PeekabooBridge 协议/路径
title: "Peekaboo 桥接"
---

# Peekaboo 桥接（macOS UI 自动化）

OpenClaw 可以作为本地、权限感知的 UI 自动化代理托管 **PeekabooBridge**。这让 `peekaboo` 命令行工具可以驱动 UI 自动化，同时复用 macOS 应用的 TCC 权限。

## What this is (and is not)

- **主机**：OpenClaw.app 可作为 PeekabooBridge 的托管主机。
- **客户端**：使用 `peekaboo` CLI（无独立的 `openclaw ui ...` 界面）。
- **UI**：视觉覆盖保持在 Peekaboo.app 内；OpenClaw 是轻量级代理主机。

## 启用桥接

在 macOS 应用中：

- 设置 → **启用 Peekaboo Bridge**

启用后，OpenClaw 会启动本地 UNIX 套接字服务器。禁用时，主机将停止，`peekaboo` 会回退到其他可用主机。

## 客户端发现顺序

Peekaboo 客户端通常按以下顺序尝试主机：

1. Peekaboo.app（完整用户体验）
2. Claude.app（如果已安装）
3. OpenClaw.app（轻量级代理）

使用 `peekaboo bridge status --verbose` 查看当前活跃的主机及正在使用的套接字路径。你可以通过以下方式覆盖：

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## 安全与权限

- 桥接会验证 **调用者的代码签名**；会强制执行 TeamID 白名单（Peekaboo 主机 TeamID + OpenClaw 应用 TeamID）。
- 请求会在约 10 秒后超时。
- 如果缺少必要权限，桥接会返回清晰的错误信息，而不会启动系统设置。

## 快照行为（自动化）

快照存储在内存中，会在短时间后自动失效。
如果需要更长的保留时间，请从客户端重新捕获。

## 故障排查

- 如果 `peekaboo` 报告“bridge client is not authorized”，请确保客户端正确签名，或仅在 **调试** 模式下使用 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 运行主机。
- 如果找不到主机，请打开一个主机应用（Peekaboo.app 或 OpenClaw.app），并确认已授予权限。
