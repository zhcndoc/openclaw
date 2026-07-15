---
summary: "Gateway 单例守护：文件锁加上 WebSocket/HTTP 绑定"
read_when:
  - 运行或调试 gateway 进程时
  - 调查单实例强制执行时
title: "Gateway 锁"
---

## 为什么

- 只有一个 gateway 进程应拥有一个状态目录；运行额外的 gateway 时，请使用隔离的 profile、状态目录、配置和端口。
- 在崩溃/SIGKILL 后存活，不会遗留陈旧的锁文件。
- 当另一个 gateway 已经占用该端口时，快速失败并给出清晰的错误。

## 三层

启动按顺序通过三步强制执行所有权：

1. **状态所有权锁** 获取一个以规范化状态目录为键的锁。包括使用 `OPENCLAW_ALLOW_MULTI_GATEWAY=1` 启动的 Gateway 在内，所有 Gateway 都会参与，因此破坏性的 SQLite 维护不会与正在运行的拥有者发生竞争。
2. **配置锁** 获取历史上的每配置锁，并记录运行时端口。多 Gateway 模式会跳过这个配置单例，但仍保留状态所有权锁。
3. **套接字绑定** 以独占的 TCP 监听器身份绑定 HTTP/WebSocket 监听端口（默认 `ws://127.0.0.1:18789`）。

每一层都可以独立失败，并抛出各自的 `GatewayLockError`。

### 状态和配置锁

- 锁的存活性来自记录的 PID、平台进程启动标识（如果可用）以及 Gateway 进程标识。在启动期间、其端口开始监听之前，经验证的拥有者仍然具有权威性。
- 一个专用的 SQLite 协调器会串行化元数据检查、过期拥有者回收以及锁替换。如果拥有该锁的进程崩溃，它的独占事务会自动释放。
- 如果锁文件缺失，或者记录的拥有者进程已不存在，启动会回收该锁并继续。
- 如果任一锁正被主动持有，启动会重试最多 5 秒（默认），然后放弃：

  ```text
  GatewayLockError("gateway already running (pid <pid>); lock timeout after <ms>ms")
  ```

### 套接字绑定

- 遇到 `EADDRINUSE` 时，启动会以 500ms 间隔重试绑定，最多 20 次（总计约 10 秒），以避开最近退出进程之后的 `TIME_WAIT` 窗口。
- 如果重试后端口仍然被占用：

  ```text
  GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")
  ```

- 其他绑定失败：

  ```text
  GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: <cause>")
  ```

关闭时，gateway 会关闭 HTTP/WebSocket 服务器，并删除其状态锁和配置锁文件。

## 运维说明

- 如果端口被另一个非网关进程占用，错误信息相同；请释放该端口或使用 `openclaw gateway --port <port>` 选择其他端口。
- `OPENCLAW_ALLOW_MULTI_GATEWAY=1` 允许多个配置/运行时实例，不允许共享可变状态。每个实例仍然需要唯一的 `OPENCLAW_STATE_DIR`。
- 在服务监督器下，遇到上述任一错误的新网关进程会先探测现有进程的 `/healthz`。如果该进程处于健康状态，新进程会让其继续接管，而不是失败。在 systemd 下，它会以代码 `78` 退出；单元中的 `RestartPreventExitStatus=78` 可阻止 `Restart=always` 在锁或 `EADDRINUSE` 冲突上循环重启。如果现有进程始终未变为健康状态，健康探测重试是有时间上限的，随后启动会以上述锁错误失败，而不是无限循环。
- macOS 应用在启动网关前会保留自己的轻量级 PID 保护；上面的文件锁和套接字绑定才是实际的运行时强制机制。

## 相关内容

- [多个网关](/gateway/multiple-gateways) - 使用不同端口运行多个实例
- [故障排查](/gateway/troubleshooting) - 诊断 `EADDRINUSE` 和端口冲突
