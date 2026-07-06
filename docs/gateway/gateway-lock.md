---
summary: "Gateway 单例守护：文件锁加上 WebSocket/HTTP 绑定"
read_when:
  - 运行或调试 gateway 进程时
  - 调查单实例强制执行时
title: "Gateway 锁"
---

## 为什么

- 在同一主机上，给定的配置 + 端口只能由一个 gateway 进程占有；运行额外的 gateway 时应使用隔离的配置文件和唯一端口。
- 即使发生崩溃/SIGKILL，也不会留下陈旧的锁文件。
- 当另一个 gateway 已经占用了该端口时，能够快速失败并给出清晰的错误信息。

## 两层

启动时按顺序通过两个相互独立的步骤强制单实例占有：

1. **文件锁** 在状态锁目录下获取每个配置对应的锁文件。在获取锁的同时，启动会探测已配置端口上是否有存活的监听，以检测陈旧的（崩溃的）锁拥有者。
2. **Socket 绑定** 将 HTTP/WebSocket 监听器（默认 `ws://127.0.0.1:18789`）绑定为独占的 TCP 监听器。

每一层都可以独立失败，并抛出各自的 `GatewayLockError`。

### 文件锁

- 如果锁文件缺失、记录的拥有者进程已不存在，或者拥有者的端口探测显示没有存活的监听，启动会重新获取该锁并继续。
- 如果锁正被持有且上述情况都不适用，启动会在放弃前重试最多 5 秒（默认）：

  ```text
  GatewayLockError("gateway already running (pid <pid>); lock timeout after <ms>ms")
  ```

### Socket 绑定

- 遇到 `EADDRINUSE` 时，启动会以 500ms 间隔重试绑定，最多 20 次（总计约 10 秒），以避开最近退出进程之后的 `TIME_WAIT` 窗口。
- 如果重试后端口仍然被占用：

  ```text
  GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")
  ```

- 其他绑定失败：

  ```text
  GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: <cause>")
  ```

关闭时，网关会关闭 HTTP/WebSocket 服务器并移除锁文件。

## 运维说明

- 如果端口被另一个非 gateway 进程占用，错误相同；请释放该端口，或使用 `openclaw gateway --port <port>` 选择其他端口。
- 在服务监督器下，遇到上述任一错误的新 gateway 进程会先对现有进程探测 `/healthz`。如果该进程是健康的，新进程会让它继续接管，而不是直接失败。在 systemd 中，它会以代码 `78` 退出；单位的 `RestartPreventExitStatus=78` 会阻止 `Restart=always` 因锁或 `EADDRINUSE` 冲突而进入循环。如果现有进程始终未变为健康，健康探测重试会有时间限制，随后启动会以上述锁错误失败，而不是无限循环。
- macOS 应用在启动 gateway 之前会先进行自身轻量级的 PID 保护；上面的文件锁和套接字绑定才是实际的运行时强制措施。

## 相关内容

- [多个网关](/gateway/multiple-gateways) - 使用不同端口运行多个实例
- [故障排查](/gateway/troubleshooting) - 诊断 `EADDRINUSE` 和端口冲突
