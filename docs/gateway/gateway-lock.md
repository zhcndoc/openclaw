---
summary: "使用 WebSocket 监听器绑定实现的网关单例守护"
read_when:
  - 运行或调试网关进程时
  - 调查单实例强制执行时
title: "Gateway lock"
---

## 为什么

- 确保同一主机上每个基础端口只运行一个网关实例；额外的网关必须使用隔离配置文件和唯一端口。
- 崩溃或收到 SIGKILL 时能存活，不会留下过时的锁文件。
- 当控制端口已被占用时，快速失败并显示明确错误。

## 机制

- 网关启动时立即使用独占 TCP 监听器绑定 WebSocket 监听器（默认 `ws://127.0.0.1:18789`）。
- 如果绑定失败且返回 `EADDRINUSE`，启动将抛出 `GatewayLockError("另一个网关实例已监听 ws://127.0.0.1:<port>")`。
- 操作系统会在任何进程退出时自动释放监听器，包括崩溃和 SIGKILL，无需单独的锁文件或清理步骤。
- 关闭时，网关关闭 WebSocket 服务器及底层 HTTP 服务器，及时释放端口。

## 错误表现

- 若端口被另一个进程占用，启动将抛出 `GatewayLockError("另一个网关实例已监听 ws://127.0.0.1:<port>")`。
- 其他绑定失败则表现为 `GatewayLockError("绑定网关套接字 ws://127.0.0.1:<port> 失败: …")`。

## 操作说明

- 如果端口被_另一个_进程占用，错误是一样的；释放端口或使用 `openclaw gateway --port <port>` 选择另一个端口。
- macOS 应用在启动网关之前仍维护其自己的轻量级 PID 守护；运行时锁由 WebSocket 绑定强制执行。

## 相关

- [多个网关](/gateway/multiple-gateways) — 使用唯一端口运行多个实例
- [故障排除](/gateway/troubleshooting) — 诊断 `EADDRINUSE` 和端口冲突
