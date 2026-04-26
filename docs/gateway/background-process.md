---
summary: "后台 exec 执行和进程管理"
read_when:
  - 添加或修改后台 exec 行为
  - 调试长时间运行的 exec 任务
title: "后台 exec 和进程工具"
---

# 后台 Exec + 进程工具

OpenClaw 通过 `exec` 工具运行 shell 命令，并将长时间运行的任务保留在内存中。`process` 工具管理这些后台会话。

## exec 工具

关键参数：

- `command`（必填）
- `yieldMs`（默认 10000）：延迟此时间后自动转入后台
- `background`（布尔值）：立即转入后台
- `timeout`（秒，默认 1800）：超时后终止进程
- `elevated`（布尔值）：如果启用/允许提升模式，则在沙箱外运行（默认为 `gateway`，当 exec 目标为 `node` 时为 `node`）
- 需要真实的 TTY？设置 `pty: true`。
- `workdir`, `env`

行为：

- 前台运行直接返回输出。
- 当转入后台时（显式或超时），工具返回 `status: "running"` + `sessionId` 以及简短的尾部输出。
- 输出保留在内存中，直到会话被轮询或清除。
- 如果 `process` 工具被禁止，`exec` 将同步运行并忽略 `yieldMs`/`background`。
- 生成的 exec 命令会接收 `OPENCLAW_SHELL=exec` 以用于上下文感知的 shell/profile 规则。
- 对于现在开始运行的长时间任务，启动一次即可，当启用自动完成唤醒且命令发出输出或失败时依赖该机制。
- 如果自动完成唤醒不可用，或者你需要确认一个无输出且正常退出的命令是否成功，请使用 `process` 来确认完成。
- 不要使用 `sleep` 循环或重复轮询来模拟提醒或延迟跟进；对于未来的工作请使用 cron。

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

- `list`：运行中 + 已完成的会话
- `poll`：获取会话的新输出（也报告退出状态）
- `log`：读取聚合输出（支持 `offset` + `limit`）
- `write`：发送 stdin（`data`，可选 `eof`）
- `send-keys`：向基于 PTY 的会话发送明确的键令牌或字节
- `submit`：向基于 PTY 的会话发送 Enter / 回车
- `paste`：发送字面文本，可选包裹在括号粘贴模式中
- `kill`：终止后台会话
- `clear`：从内存中移除已完成的会话
- `remove`：如果运行中则终止，否则如果已完成则清除

备注：

- 只有转入后台的会话才会被列出/持久化在内存中。
- 进程重启时会话丢失（无磁盘持久化）。
- 会话日志仅在你运行 `process poll/log` 且工具结果被记录时才会保存到聊天历史中。
- `process` 按代理作用域；它只能看到由该代理启动的会话。
- 当自动完成唤醒不可用时，使用 `poll` / `log` 获取状态、日志、静默成功确认或完成确认。
- 当你需要输入或干预时使用 `write` / `send-keys` / `submit` / `paste` / `kill`。
- `process list` 包含一个派生的 `name`（命令动词 + 目标）以便快速扫描。
- `process log` 使用基于行的 `offset`/`limit`。
- 当 `offset` 和 `limit` 都省略时，它返回最后 200 行并包含分页提示。
- 当提供了 `offset` 但省略 `limit` 时，它返回从 `offset` 到结尾的内容（不限制为 200）。
- 轮询用于按需状态查询，而非等待循环调度。如果工作应该稍后发生，请使用 cron。

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

发送 PTY 按键：

```json
{ "tool": "process", "action": "send-keys", "sessionId": "<id>", "keys": ["C-c"] }
```

提交当前行：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

粘贴字面文本：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## 相关链接

- [Exec 工具](/tools/exec)
- [Exec 审批](/tools/exec-approvals)
