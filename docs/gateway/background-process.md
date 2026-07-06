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

| 参数         | 描述                                                                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `command`    | 必填。要运行的 Shell 命令。                                                                                                                     |
| `workdir`    | 工作目录；省略则使用默认 cwd。                                                                                                                 |
| `env`        | 命令的额外环境变量。                                                                                                                           |
| `yieldMs`    | 在后台化前等待的毫秒数（默认 10000）。                                                                                                         |
| `background` | 立即在后台运行。                                                                                                                             |
| `timeout`    | 超时时间（秒，默认 `tools.exec.timeoutSec`）；到期后终止进程。设置 `timeout: 0` 可为该次调用禁用 exec 进程超时。                                  |
| `pty`        | 在可用时以伪终端运行（需要 TTY 的 CLI、编码代理）。                                                                                             |
| `elevated`   | 如果启用了/允许提权模式，则在沙箱外运行（默认 `gateway`，或当 exec 目标为 `node` 时为 `node`）。                                               |
| `host`       | Exec 目标：`auto`、`sandbox`、`gateway` 或 `node`。                                                                                            |
| `node`       | Node ID/名称，与 `host: "node"` 一起使用。                                                                                                     |

行为：

- 前台运行会直接返回输出。
- 在后台运行时（显式指定或通过 `yieldMs` 超时），工具会返回 `status: "running"` + `sessionId` 以及一段简短的输出尾部。
- 后台运行和 `yieldMs` 运行会继承 `tools.exec.timeoutSec`，除非调用时显式传入 `timeout`。
- 输出会保留在内存中，直到会话被轮询或清除。
- 如果 `process` 工具被禁止，`exec` 会同步运行并忽略 `yieldMs`/`background`。
- 启动的 exec 命令会接收 `OPENCLAW_SHELL=exec`，用于上下文感知的 shell/profile 规则。
- 对于现在开始的长时间运行任务：只启动一次，并依赖自动完成唤醒（如果已启用），在命令产生输出或失败时触发。
- 如果自动完成唤醒不可用，或者你需要对无输出但正常退出的命令进行“成功确认”，请使用 `process` 轮询。
- 不要用 `sleep` 循环或重复轮询来模拟提醒或延迟跟进——未来任务请使用 cron。

### 环境变量覆盖

| 变量                                      | 作用                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `OPENCLAW_BASH_YIELD_MS`                 | 后台化前的默认等待时间（毫秒）。默认 10000，限制在 10-120000。                                     |
| `OPENCLAW_BASH_MAX_OUTPUT_CHARS`         | 内存中的输出上限（字符数）。                                                                     |
| `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS` | 每个流待处理 stdout/stderr 的上限（字符数）。                                                      |
| `OPENCLAW_BASH_JOB_TTL_MS`               | 已完成会话的 TTL（毫秒），范围限定为 1 分钟-3 小时。                                               |
| `OPENCLAW_PROCESS_INPUT_WAIT_IDLE_MS`    | 可写后台会话被标记为“可能在等待输入”之前的空闲输出阈值。默认 15000。                                |

### 配置（优先于环境变量覆盖）

| 键                                     | 默认值 | 作用                                                                         |
| -------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| `tools.exec.backgroundMs`             | 10000   | 与 `OPENCLAW_BASH_YIELD_MS` 相同。                                           |
| `tools.exec.timeoutSec`               | 1800    | 每次调用的默认超时时间。                                                      |
| `tools.exec.cleanupMs`                | 1800000 | 与 `OPENCLAW_BASH_JOB_TTL_MS` 相同。                                         |
| `tools.exec.notifyOnExit`             | true    | 当后台执行的 exec 退出时，排队一个系统事件 + 请求心跳。                       |
| `tools.exec.notifyOnExitEmptySuccess` | false   | 对于无输出且成功结束的后台运行，也排队完成事件。                              |

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
| `submit`     | 向基于 PTY 的会话发送 Enter/回车。                                              |
| `paste`      | 发送字面文本，可选择包裹在 bracketed paste 模式中。                             |
| `kill`       | 终止后台会话。                                                                 |
| `clear`      | 从内存中移除已完成的会话。                                                     |
| `remove`     | 如果正在运行则终止，否则如果已完成则清除。                                     |

说明：

- 只有后台运行的会话会被列出/持久化——仅保存在内存中，不在磁盘上。进程重启后会话会丢失。
- 只有当你运行 `process poll`/`log` 且工具结果被记录到聊天历史时，会话日志才会保存到聊天历史中。
- `process` 以 agent 为范围；它只能看到由该 agent 启动的会话。
- 当自动完成唤醒不可用时，使用 `poll`/`log` 获取状态、日志或完成确认。
- 在恢复交互式 CLI 之前先使用 `log`，这样当前的会话记录、stdin 状态和输入等待提示会一起可见。
- 当你需要输入或干预时，使用 `write`/`send-keys`/`submit`/`paste`/`kill`。
- `process list` 包含一个派生的 `name`（命令动词 + 目标），便于快速浏览。
- 只有当会话仍然有可写的 stdin 且空闲时间超过输入等待阈值时（默认 15000 ms，`OPENCLAW_PROCESS_INPUT_WAIT_IDLE_MS`），`process list`、`poll` 和 `log` 才会报告 `waitingForInput`。
- `process log` 使用基于行的 `offset`/`limit`。当两者都省略时，它会返回最后 200 行并附带分页提示。当设置了 `offset` 但未设置 `limit` 时，它会从 `offset` 返回到末尾（不限制为 200）。
- `poll` 的 `timeout` 会在返回前最多等待这么多毫秒；超过 30000 的值会被截断为 30000。
- Polling 用于按需获取状态，不用于循环等待调度。如果工作应该稍后执行，请使用 cron。

## 示例

Run a long task and poll later:

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

Check an interactive session before sending input:

```json
{ "tool": "process", "action": "log", "sessionId": "<id>" }
```

Start in the background immediately:

```json
{ "tool": "exec", "command": "npm run build", "background": true }
```

Send stdin:

```json
{ "tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n" }
```

Send PTY keys:

```json
{ "tool": "process", "action": "send-keys", "sessionId": "<id>", "keys": ["C-c"] }
```

Submit the current line:

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

Paste literal text:

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## 相关

- [Exec 工具](/tools/exec)
- [Exec 审批](/tools/exec-approvals)
