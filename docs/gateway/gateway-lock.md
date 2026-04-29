---
summary: "使用 WebSocket 监听绑定的 Gateway 单例守卫"
read_when:
  - 运行或调试 gateway 进程时
  - 调查单实例强制执行时
title: "Gateway 锁"
---

## 为什么

- 确保在同一主机上每个基础端口只运行一个 gateway 实例；额外的 gateway 必须使用隔离的配置文件和唯一端口。
- 在崩溃/SIGKILL 后仍能存活，不留下陈旧的锁文件。
- 当控制端口已被占用时，快速失败并给出清晰的错误。

## 机制

- gateway 首先在状态锁目录下获取每个配置对应的锁文件，并探测已配置端口是否存在现有监听器。
- 如果记录的锁所有者已消失、端口空闲，或者锁已过期，则启动会重新获取锁并继续。
- 然后 gateway 使用独占 TCP 监听器绑定 HTTP/WebSocket 监听器（默认 `ws://127.0.0.1:18789`）。
- 如果绑定失败并返回 `EADDRINUSE`，启动将抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 关闭时，gateway 会关闭 HTTP/WebSocket 服务器并移除锁文件。

## 错误表面

- 如果另一个进程占用了该端口，启动会抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他绑定失败会表现为 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## 运维说明

- 如果端口被 _另一个_ 进程占用，错误相同；请释放该端口，或使用 `openclaw gateway --port <port>` 选择另一个端口。
- 在服务监管程序下，如果新的 gateway 进程看到已有健康的 `/healthz` 响应者，它会成功退出，并让该进程继续控制。如果现有进程始终未变为健康状态，重试次数是有限的，启动会以清晰的锁错误失败，而不是无限循环。
- macOS 应用在启动 gateway 之前仍会维护自己的轻量级 PID 守卫；运行时锁由锁文件加上 HTTP/WebSocket 绑定来强制执行。

## 相关内容

- [多个 Gateways](/gateway/multiple-gateways) — 使用唯一端口运行多个实例
- [故障排除](/gateway/troubleshooting) — 诊断 `EADDRINUSE` 和端口冲突
