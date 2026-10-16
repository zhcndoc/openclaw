---
summary: "用于定向调试日志的诊断标志"
read_when:
  - "你需要定向调试日志，而不提高全局日志级别"
  - "你需要捕获特定子系统的日志以用于支持"
title: "诊断标志"
---

诊断标志会为某个子系统开启额外日志，而不会全局提高 `logging.level`。 除非某个子系统检查该标志，否则它不会产生任何效果。

## <a id="how-it-works"></a> 工作原理

- 标志是大小写不敏感的字符串，来源于配置中的 `diagnostics.flags`，再加上 `OPENCLAW_DIAGNOSTICS` 环境变量覆盖项，经过去重并转换为小写。
- `name.*` 匹配 `name` 本身以及 `name.` 下的任何内容（例如，`telegram.*` 匹配 `telegram.http`）。
- `*` 或 `all` 会启用所有标志。
- 在配置中更改 `diagnostics.flags` 后，请重启网关；它不会热重载。

## <a id="known-flags"></a> 已知标志

| 标志                   | 启用内容                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `telegram.http`        | Telegram Bot API HTTP 错误日志记录                           |
| `brave.http`           | Brave Search request/response/cache 记录                   |
| `profiler`             | 回复阶段分析器和 Codex 应用服务器分析器（两者）     |
| `reply.profiler`       | 仅回复阶段分析器                                     |
| `codex.profiler`       | 仅 Codex 应用服务器分析器                                |
| `health`               | 网关运行状况 check/account/binding 调试详细信息            |
| `ingress.timing`       | 会话加载、模型选择和模型目录计时      |
| `plugin.load-profile`  | 同步插件模块加载计时                        |
| `sqlite.worker-timing` | SQLite 写入器请求传输时间戳（仅限环境） |
| `timeline`             | 结构化 JSONL 时间线工件（见下文）                |

## <a id="enable-via-config"></a> 通过配置启用

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

多个标志：

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "brave.http", "health"]
  }
}
```

## <a id="env-override-(one-off)"></a><a id="env-override-one-off"></a> 环境覆盖（一次性）

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,brave.http
```

值按逗号或空格分隔。特殊值：

| 值                       | 作用                                   |
| --------------------------- | ---------------------------------------- |
| `0`, `false`, `off`, `none` | 禁用所有标志，也会覆盖配置 |
| `1`, `true`, `all`, `*`     | 启用每个标志                        |

`OPENCLAW_DIAGNOSTICS=0` 会禁用该进程中来自环境变量和配置的标志， 这对于临时静音在配置中仍保持开启的 profiler 标志很有用，而无需编辑文件。

## <a id="profiler-flags"></a> 分析器标志

慢速回复准备和 Codex 启动以默认日志级别记录，没有分析器标志：耗时至少 5 秒的阶段或跟踪的总耗时至少 10 秒的阶段会发出警告。快速路径保持安静。 Profiler 标志将计时阈值降低至每阶段 500 毫秒，总计 1 秒，并启用更多详细信息。

为一次网关运行启用所有受分析器控制的跨度：

```bash
OPENCLAW_DIAGNOSTICS=profiler openclaw gateway run
```

仅启用 reply-dispatch 分析器跨度：

```bash
OPENCLAW_DIAGNOSTICS=reply.profiler openclaw gateway run
```

仅启用 Codex 应用程序服务器 startup/tool/thread 分析器范围：

```bash
OPENCLAW_DIAGNOSTICS=codex.profiler openclaw gateway run
```

`profiler` 同时启用 reply 分析器和 Codex 分析器；如需仅启用其中一个，请使用作用域标志名称。

也可以在配置中设置：

```json
{
  "diagnostics": {
    "flags": ["reply.profiler", "codex.profiler"]
  }
}
```

更改配置标志后，请重启网关。要禁用某个分析器标志，请将其从 `diagnostics.flags` 中移除并重启，或者在启动进程时使用 `OPENCLAW_DIAGNOSTICS=0` 来覆盖该次运行的所有诊断标志。

## <a id="timeline-artifacts"></a> 时间线产物

`timeline` 标志（别名：`diagnostics.timeline`）会将结构化的启动和运行时计时事件写入为 JSONL，供外部 QA 运行器使用：

```bash
OPENCLAW_DIAGNOSTICS=timeline \
OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=/tmp/openclaw-timeline.jsonl \
openclaw gateway run
```

或者在配置中启用它：

```json
{
  "diagnostics": {
    "flags": ["timeline"]
  }
}
```

输出路径始终来自 `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH`，即使在配置中设置了标志本身；该路径没有配置键。请参阅 [ 环境变量](/help/environment)，了解 OpenClaw 从何处读取 `OPENCLAW_DIAGNOSTICS`、`OPENCLAW_DIAGNOSTICS_TIMELINE_PATH` 和 `OPENCLAW_DIAGNOSTICS_EVENT_LOOP` 以及按什么优先顺序。当仅从配置启用 `timeline` 时，最早的配置加载跨度会丢失，因为 OpenClaw 尚未读取配置；随后的启动跨度将正常捕获。

网关客户端命令从源配置读取时间线标志，而无需打开共享状态数据库。当网关离线时，这也适用。

`OPENCLAW_DIAGNOSTICS=1`、`=all` 和 `=*` 也会启用时间线， 因为它们会启用所有标志。若你只需要 JSONL 产物而不需要其他任何诊断标志， 请优先使用作用域更明确的 `timeline` 标志。

时间线中的事件循环延迟采样还需要比 `timeline` 额外再启用一个选项： 在启用时间线的基础上，再设置 `OPENCLAW_DIAGNOSTICS_EVENT_LOOP=1` （或 `on`/`true`/`yes`）。

时间线记录使用 `openclaw.diagnostics.v1` 信封，可以包括进程 ID、阶段名称、跨度名称、持续时间、插件 ID、依赖项计数、事件循环延迟样本、提供程序操作名称、子进程退出状态和启动错误 names/messages. 将时间线文件视为本地诊断工件；在您的计算机之外共享它们之前先进行审查。

嵌入式模型请求添加 `provider.request.started` 标记和一个终端 `provider.request` 记录，通过运行和 call/span id 进行关联。在流式传输时，`provider.request.activity` 使用现有的流进度报告器最多每 30 秒标记一次观察到的样本块。终端记录将请求开始保存在 `timestamp` 中，并报告 `terminalAtMs`、最后观察到的提供者 callback/chunk 时间（`lastProviderActivityAtMs`，观察时）以及有界的 `terminalReason`。活动包括簿记块；它不证明可见的输出，并且延迟的结果结算不会刷新已经观察到的终端块。未知原因或缺少活动并不是提供程序、超时或 CPU 故障的证据。

`model.recovery.decision` 标记报告现有尝试所有者接受或拒绝的恢复分支以及重放安全和先前的工具结算布尔值。 `model.retry.decision` 标记解释了重试所有者的预算、延迟和等待结果。这些标记不添加提示、工具参数、原始错误文本、模型路由或会话标识。它们不会更改重试或超时策略，并且仅通过现有的选择加入时间表发出。

时间线将具有相同目标的批量相邻事件写入有界的 64 KiB 缓冲区，在下一个事件循环轮次、满负荷或正常进程退出时刷新。事件时间戳反映了发射时间。写入仍尽力而为；强制杀死可能会丢失待处理的输出。外部harness应在进程退出后读取最终工件，并且不得在进程运行时截断它。

## <a id="where-logs-go"></a> 日志输出位置

标志会将日志输出到标准诊断日志文件中。默认情况下：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

命名的配置文件会使用 `/tmp/openclaw/openclaw-<profile>-YYYY-MM-DD.log`；例如，`--dev` 会使用 `openclaw-dev-YYYY-MM-DD.log`。

如果你设置了 `logging.file`，则改用该路径。日志采用 JSONL 格式（每行一个 JSON 对象）。脱敏仍然适用；它始终启用。 有关完整的日志路径解析、轮转和脱敏模型，请参见 [Logging](/logging)。

## <a id="extract-logs"></a> 提取日志

读取当前活动配置文件的最新日志文件：

```bash
openclaw logs --plain
# Named profile example:
openclaw --profile work logs --plain
```

筛选 Telegram HTTP 诊断日志：

```bash
openclaw logs --plain --limit 5000 | rg "telegram http error"
```

筛选 Brave Search HTTP 诊断日志：

```bash
openclaw logs --plain --limit 5000 | rg "brave http"
```

或者在复现时持续查看：

```bash
openclaw logs --follow --plain | rg "telegram http error"
```

对于远程网关，请改用 `openclaw logs --follow`（参见 [/cli/logs](/cli/logs)）。

## <a id="notes"></a> 说明

- 如果 `logging.level` 设置为 `error`、`fatal` 或 `silent`，则可能会抑制标志门控日志。默认 `info` 就可以了。
- `brave.http` 记录 Brave Search 请求 URLs/query 参数、响应 status/timing 并缓存 hit/miss/write 事件。它不记录 API 密钥（作为请求标头发送）或响应正文，但搜索查询可能很敏感。
- 标志可以安全地保持启用；它们只会影响特定子系统的日志量。
- 使用 [/logging](/logging) 更改日志目标、级别和脱敏设置。

## <a id="sqlite-worker-timing"></a> SQLite工人计时

当内部诊断订阅者对这些事件（包括 Prometheus 插件）感兴趣时，SQLite 编写器会将单调毫秒时间戳附加到已完成的 `worker.request` 事件。订阅者可以分离队列、代理调度、`postMessage`、工作准备、后端执行、结果序列化和回复传送。后端执行包括所有者代码和SQL；它不是本机 SQL 定时器。在呼叫者恢复之前，`replyReceived` 标记经纪人已收到。单独测量呼叫者延迟。

框架请求保留第一次接收和后端执行时间戳直到最终回复。 `inputReady` 标志着在后端准备之前完成了命令重构。失败的请求会忽略它们从未到达的阶段。时间戳不包含 SQL 文本、绑定或结果负载。

`OPENCLAW_DIAGNOSTICS=sqlite.worker-timing` 仍然强制时序捕获并在进程启动时进行采样。如果没有该标志或感兴趣的订阅者，请求就不会携带计时数据。

## <a id="related"></a> 相关内容

- [网关诊断](/gateway/diagnostics)
- [网关故障排查](/gateway/troubleshooting)
