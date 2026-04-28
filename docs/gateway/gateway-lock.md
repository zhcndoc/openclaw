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

- 网关首先会在状态锁目录下获取一个按配置划分的锁文件，并探测已配置端口上是否存在已有监听器。
- 如果记录的锁所有者已不存在、端口空闲，或者锁已过期，启动过程会重新获取该锁并继续。
- 然后，网关使用独占的 TCP 监听器绑定 HTTP/WebSocket 监听器（默认 `ws://127.0.0.1:18789`）。
- 如果绑定失败并返回 `EADDRINUSE`，启动将抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 关闭时，网关会关闭 HTTP/WebSocket 服务器并移除锁文件。

## 错误表现

- 若端口被另一个进程占用，启动将抛出 `GatewayLockError("另一个网关实例已监听 ws://127.0.0.1:<port>")`。
- 其他绑定失败则表现为 `GatewayLockError("绑定网关套接字 ws://127.0.0.1:<port> 失败: …")`。

## 操作说明

- 如果端口被_另一个_进程占用，错误相同；请释放该端口，或使用 `openclaw gateway --port <port>` 选择其他端口。
- 在服务守护进程下，如果新的网关进程检测到现有且健康的 `/healthz` 响应器，它会成功退出，并让该进程继续负责控制。如果现有进程始终无法变为健康，重试次数是有限的，启动最终会以清晰的锁错误失败，而不是无限循环。
- macOS 应用在启动网关之前仍然会维护自己的轻量级 PID 保护；运行时锁由锁文件加上 HTTP/WebSocket 绑定来强制执行。

## 相关

- [多个网关](/gateway/multiple-gateways) — 使用唯一端口运行多个实例
- [故障排除](/gateway/troubleshooting) — 诊断 `EADDRINUSE` 和端口冲突
