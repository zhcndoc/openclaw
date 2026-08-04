---
summary: "后台 exec 执行和进程管理"
read_when:
  - 添加或修改后台 exec 行为
  - 调试长时间运行的 exec 任务
title: "后台 exec 和 process 工具"
---

OpenClaw 通过 `exec` 工具运行 shell 命令，并将长时间运行的任务保存在内存中。`process` 工具用于管理这些后台会话。

## exec 工具

参数：

| 参数         | 描述                                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `command`    | 必填。要运行的 Shell 命令。                                                                                                                           |
| `workdir`    | 工作目录；省略则使用默认当前工作目录。                                                                                                                 |
| `env`        | 为命令设置的额外环境变量。                                                                                                                             |
| `yieldMs`    | 转入后台前等待的毫秒数（默认 10000）。                                                                                                                 |
| `background` | 立即在后台运行。                                                                                                                                       |
| `timeout`    | 超时时间，单位为秒（默认为 `tools.exec.timeoutSeconds`）；超时后终止进程。将 `timeout: 0` 设置为禁用本次 exec 调用的进程超时。                          |
| `pty`        | 在可用时使用伪终端（需要 TTY 的 CLI、编程代理）。                                                                                                      |
| `elevated`   | 如果启用/允许提升模式，则在沙箱外运行（默认使用 `gateway`；当 exec 目标为 `node` 时使用 `node`）。                                                       |
| `host`       | Exec 目标：`auto`、`sandbox`、`gateway` 或 `node`。                                                                                                   |
| `node`       | 与 `host: "node"` 配合使用的节点 ID/名称。                                                                                                             |

行为：

- 前台运行会直接返回输出。
- 在后台运行时（显式指定或因 `yieldMs` 超时），工具会返回 `status: "running"`、`sessionId` 和一小段输出尾部。
- 后台运行和 `yieldMs` 运行会继承 `tools.exec.timeoutSeconds`，除非调用时显式传入 `timeout`。
- 输出会一直保存在内存中，直到会话被轮询或清除。
- 已完成的会话会在配置的 TTL 到期后失效。注册表最多保留 50 个已完成会话和总计 2,000,000 个输出字符，优先淘汰最早的记录。最新完成的会话即使超过聚合上限，也会保留其完整输出。
- 如果不允许使用 `process` 工具，`exec` 将同步运行，并忽略 `yieldMs`/`background`。
- 派生的 exec 命令会接收 `OPENCLAW_SHELL=exec`，用于上下文感知的 shell/配置文件规则。
- 对于立即启动的长时间运行任务：启动一次，并在命令产生输出或失败时（启用后）依赖自动完成唤醒。
- 如果自动完成唤醒不可用，或者需要确认一个无输出且正常退出的命令是否成功，请使用 `process` 进行轮询。
- 不要使用 `sleep` 循环或重复轮询来模拟提醒或延迟后续操作——未来任务请使用 cron。

### 环境变量覆盖

| 变量                                      | 作用                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `OPENCLAW_BASH_YIELD_MS`                 | 转入后台前的默认等待时间（毫秒）。默认 10000，限制在 10-120000。                                     |
| `OPENCLAW_BASH_MAX_OUTPUT_CHARS`         | 内存中的输出上限（字符数）。                                                                     |
| `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS` | 每个流待处理 stdout/stderr 的上限（字符数）。                                                      |
| `OPENCLAW_BASH_JOB_TTL_MS`               | 已完成会话的 TTL（毫秒），范围限定为 1 分钟-3 小时。                                               |
| `OPENCLAW_PROCESS_INPUT_WAIT_IDLE_MS`    | 可写后台会话在被标记为“可能在等待输入”之前的无输出空闲阈值。默认 15000。                                |

### 配置（优先于环境变量覆盖）

| Key                                   | Default | Effect                                                                          |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| `tools.exec.backgroundMs`             | 10000   | 与 `OPENCLAW_BASH_YIELD_MS` 相同。                                               |
| `tools.exec.timeoutSeconds`           | 1800    | 每次调用的默认超时时间。                                                         |
| `tools.exec.cleanupMs`                | 1800000 | 与 `OPENCLAW_BASH_JOB_TTL_MS` 相同。                                             |
| `tools.exec.notifyOnExit`             | true    | 后台 exec 退出时，将系统事件加入队列，并请求发送心跳。                             |
| `tools.exec.notifyOnExitEmptySuccess` | false   | 对于无输出且成功完成的后台运行，同样加入完成事件。                               |

## 子进程桥接

在 exec/process 工具之外启动长时间运行的子进程（CLI 重启、网关辅助进程）时，请附加子进程桥接辅助程序，以便终止信号能够转发，并在退出/出错时分离监听器。这样可以避免在 systemd 上产生孤儿进程，并保持跨平台的关闭行为一致。

## process 工具

操作：

| 操作        | 作用                                                                         |
| ----------- | ---------------------------------------------------------------------------- |
| `list`      | 运行中 + 已完成的会话。                                                       |
| `poll`      | 提取某个会话的新输出（也会报告退出状态）。                                     |
| `log`       | 读取汇总输出和输入恢复提示。支持 `offset` + `limit`。                          |
| `write`     | 发送 stdin（`data`，可选 `eof`）。                                            |
| `send-keys` | 向基于 PTY 的会话发送显式按键标记或字节。                                       |
| `submit`    | 向基于 PTY 的会话发送 Enter/回车。                                              |
| `paste`     | 发送字面文本，可选择包裹在 bracketed paste 模式中。                             |
| `kill`      | 终止后台会话。                                                                 |
| `clear`     | 从内存中移除已完成的会话。                                                     |
| `remove`    | 如果正在运行则终止，否则如果已完成则清除。                                     |

说明：

- 只有后台会话会被列出/持久化——仅存在于内存中，不会写入磁盘。进程重启后会话将丢失。
- 重置或删除会话只会清除已完成的后台进程；其他会话、显式共享作用域以及正在运行的进程不受影响。
- 活跃的后台会话会阻止协作式主机挂起和安全网关重启，直到进程所有者确认其确实已退出。
- `process remove` 可以在请求终止后立即隐藏正在运行的会话；在确认退出之前，挂起和重启仍会被阻止。
- 只有在运行 `process poll`/`log` 且工具结果被记录后，会话日志才会保存到聊天历史中。
- `process` 按代理划分作用域；它只能看到由该代理启动的会话。
- 当自动完成唤醒不可用时，使用 `poll`/`log` 获取状态、日志或完成确认。
- 恢复交互式 CLI 前使用 `log`，这样可以同时查看当前记录、stdin 状态和输入等待提示。
- 需要输入或干预时，使用 `write`/`send-keys`/`submit`/`paste`/`kill`。
- `process list` 会包含一个派生的 `name`（命令动词 + 目标），以便快速扫描。
- 只有当会话仍有可写入的 stdin，且空闲时间超过输入等待阈值（默认为 15000 毫秒，`OPENCLAW_PROCESS_INPUT_WAIT_IDLE_MS`）时，`process list`、`poll` 和 `log` 才会报告 `waitingForInput`。
- `process log` 使用基于行的 `offset`/`limit`。两者都未提供时，会返回最后 200 行并附带分页提示。设置 `offset` 而未设置 `limit` 时，会从 `offset` 返回到末尾（不会限制为 200 行）。
- `poll` 的 `timeout` 最多等待指定的毫秒数后返回；超过 30000 的值会被限制为 30000。
- 轮询用于按需获取状态，而不是用于循环等待调度。如果工作应稍后执行，请使用 cron。

## 示例

运行一个长任务并稍后轮询：

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

在发送输入前检查一个交互式会话：

```json
{ "tool": "process", "action": "log", "sessionId": "<id>" }
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
