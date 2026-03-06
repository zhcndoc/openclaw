---
summary: "后台 exec 执行和进程管理"
read_when:
  - 添加或修改后台 exec 行为时
  - 调试长时间运行的 exec 任务时
title: "后台 Exec 与进程工具"
---

# 后台 Exec + 进程工具

OpenClaw 通过 `exec` 工具运行 shell 命令，并将长时间运行的任务保留在内存中。`process` 工具管理这些后台会话。

## exec 工具

关键参数：

- `command`（必填）
- `yieldMs`（默认 10000）：该延迟后自动后台运行
- `background`（布尔）：立即后台运行
- `timeout`（秒，默认 1800）：超时后杀死进程
- `elevated`（布尔）：如果启用/允许提升模式，则在主机上运行
- 需要真实 TTY？设置 `pty: true`。
- `workdir`、`env`

行为：

- 前台运行时直接返回输出。
- 当后台运行（显式或超时）时，工具返回 `status: "running"` + `sessionId` 以及简短尾部。
- 输出保留在内存中，直到会话被轮询或清除。
- 如果禁用 `process` 工具，`exec` 同步运行并忽略 `yieldMs`/`background`。
- 派生的 exec 命令会收到 `OPENCLAW_SHELL=exec`，用于上下文感知的 shell/profile 规则。

## 子进程桥接

当在 exec/process 工具之外启动长时间运行的子进程（例如 CLI 重启或网关辅助），请附加子进程桥接辅助程序，以便转发终止信号并在退出/错误时分离监听器。这避免了 systemd 上的孤儿进程，并保持跨平台的一致关闭行为。

环境重写变量：

- `PI_BASH_YIELD_MS`：默认延迟（毫秒）
- `PI_BASH_MAX_OUTPUT_CHARS`：内存中输出上限（字符数）
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：每个流待处理 stdout/stderr 上限（字符数）
- `PI_BASH_JOB_TTL_MS`：已完成会话的 TTL（毫秒，限定在 1 分钟到 3 小时之间）

配置（推荐）：

- `tools.exec.backgroundMs`（默认 10000）
- `tools.exec.timeoutSec`（默认 1800）
- `tools.exec.cleanupMs`（默认 1800000）
- `tools.exec.notifyOnExit`（默认 true）：后台 exec 退出时入队系统事件 + 请求心跳。
- `tools.exec.notifyOnExitEmptySuccess`（默认 false）：为 true 时，对无输出的成功后台运行也入队完成事件。

## process 工具

操作：

- `list`：运行中 + 已结束的会话
- `poll`：获取会话的新输出（也报告退出状态）
- `log`：读取汇总输出（支持 `offset` + `limit`）
- `write`：发送标准输入（`data`，可选 `eof`）
- `kill`：终止后台会话
- `clear`：从内存中移除已结束的会话
- `remove`：如果在运行则杀死，否则如果已结束则清除

备注：

- 只有后台会话会被列出/保存在内存中。
- 会话在进程重启时丢失（无磁盘持久化）。
- 会话日志仅当调用 `process poll/log` 并记录工具结果时保存到聊天记录中。
- `process` 是按 agent 范围进行的；它只看到该 agent 启动的会话。
- `process list` 包含派生的 `name`（命令动词 + 目标）以便快速查看。
- `process log` 使用基于行的 `offset`/`limit`。
- 当同时省略 `offset` 和 `limit` 时，返回最后 200 行，并包含分页提示。
- 当提供 `offset` 而省略 `limit` 时，返回从 `offset` 到结尾（不限制于 200 行）。

## 示例

运行一个长任务，稍后轮询：

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

立即在后台启动：

```json
{ "tool": "exec", "command": "npm run build", "background": true }
```

发送标准输入：

```json
{ "tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n" }
```
