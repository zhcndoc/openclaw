---
summary: "后台 exec 执行和进程管理"
read_when:
  - 添加或修改后台 exec 行为
  - 调试长时间运行的 exec 任务
title: "后台 exec 和 process 工具"
---

OpenClaw 通过 `exec` 工具运行 shell 命令，并将长时间运行的任务保存在内存中。`process` 工具用于管理这些后台会话。

## exec 工具

关键参数：

- `command` (required)
- `yieldMs` (default 10000): 在此延迟后自动转入后台
- `background` (bool): 立即后台运行
- `timeout` (seconds, default `tools.exec.timeoutSec`): 在此超时后终止进程；仅当你想为该次调用禁用 exec 进程超时时，才将 `timeout: 0` 设为 0
- `elevated` (bool): 如果已启用/允许提权模式，则在沙箱外运行（默认是 `gateway`，当 exec 目标是 `node` 时为 `node`）
- 需要真实 TTY？设置 `pty: true`。
- `workdir`, `env`

行为：

- 前台运行会直接返回输出。
- 当转入后台时（显式或超时），工具会返回 `status: "running"` + `sessionId` 以及一小段尾部输出。
- 后台运行和 `yieldMs` 运行都会继承 `tools.exec.timeoutSec`，除非调用中提供了显式的 `timeout`。
- 输出会保存在内存中，直到会话被轮询或清除。
- 如果 `process` 工具被禁止，`exec` 会同步运行并忽略 `yieldMs`/`background`。
- 启动的 exec 命令会收到 `OPENCLAW_SHELL=exec`，以便使用上下文感知的 shell/profile 规则。
- 对于从现在开始运行的长任务，只需启动一次，并依赖自动完成唤醒；当该功能启用且命令产生输出或失败时会触发。
- 如果自动完成唤醒不可用，或者你需要对一个干净退出但无输出的命令进行静默成功确认，请使用 `process` 来确认完成。
- 不要用 `sleep` 循环或重复轮询来模拟提醒或延迟跟进；未来任务请使用 cron。

## 子进程桥接

当在 exec/process 工具之外启动长时间运行的子进程时（例如 CLI 重启派生或 gateway 辅助进程），请附加子进程桥接辅助程序，以便在退出/出错时转发终止信号并分离监听器。这样可以避免 systemd 上的孤儿进程，并使各平台的关闭行为保持一致。

环境覆盖：

- `PI_BASH_YIELD_MS`: 默认 yield（毫秒）
- `PI_BASH_MAX_OUTPUT_CHARS`: 内存中的输出上限（字符）
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`: 待处理 stdout/stderr 每个流的上限（字符）
- `PI_BASH_JOB_TTL_MS`: 已完成会话的 TTL（毫秒，范围限制为 1 分钟–3 小时）

配置（推荐）：

- `tools.exec.backgroundMs`（默认 10000）
- `tools.exec.timeoutSec`（默认 1800）
- `tools.exec.cleanupMs`（默认 1800000）
- `tools.exec.notifyOnExit`（默认 true）：当后台 exec 退出时，入队一个系统事件 + 请求心跳。
- `tools.exec.notifyOnExitEmptySuccess`（默认 false）：当为 true 时，也为未产生输出但成功结束的后台运行入队完成事件。

## process 工具

操作：

- `list`：运行中 + 已完成的会话
- `poll`：拉取某个会话的新输出（也会报告退出状态）
- `log`：读取聚合后的输出（支持 `offset` + `limit`）
- `write`：发送 stdin（`data`，可选 `eof`）
- `send-keys`：向基于 PTY 的会话发送显式按键标记或字节
- `submit`：向基于 PTY 的会话发送 Enter / 回车
- `paste`：发送字面文本，可选使用括号化粘贴模式包裹
- `kill`：终止后台会话
- `clear`：从内存中移除一个已完成的会话
- `remove`：如果在运行则终止，否则如果已完成则清除

说明：

- 只有转入后台的会话会被列出/保存在内存中。
- 进程重启后会话会丢失（没有磁盘持久化）。
- 只有在你运行 `process poll/log` 且工具结果被记录到聊天历史中时，会话日志才会保存到聊天历史。
- `process` 按 agent 作用域隔离；它只能看到该 agent 启动的会话。
- 使用 `poll` / `log` 获取状态、日志、静默成功确认，或在自动完成唤醒不可用时进行完成确认。
- 当你需要输入或干预时，使用 `write` / `send-keys` / `submit` / `paste` / `kill`。
- `process list` 会包含一个派生的 `name`（命令动词 + 目标），便于快速浏览。
- `process log` 使用按行的 `offset`/`limit`。
- 当同时省略 `offset` 和 `limit` 时，它会返回最后 200 行，并包含分页提示。
- 当提供了 `offset` 但省略 `limit` 时，它会返回从 `offset` 到末尾的内容（不限制为 200 行）。
- 轮询用于按需获取状态，不用于等待循环调度。如果工作应当稍后发生，请改用 cron。

## 示例

运行长任务并稍后轮询：

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

发送 stdin：

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

## 相关

- [Exec 工具](/tools/exec)
- [Exec 审批](/tools/exec-approvals)
