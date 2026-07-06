---
summary: "用于定向调试日志的诊断标志"
read_when:
  - 你需要定向调试日志，而不提高全局日志级别
  - 你需要捕获特定子系统的日志以用于支持
title: "诊断标志"
---

诊断标志会为某个子系统开启额外日志，而不会全局提高 `logging.level`。
除非某个子系统检查该标志，否则它不会产生任何效果。

## 工作原理

- 标志是大小写不敏感的字符串，来源于配置中的 `diagnostics.flags`，再加上 `OPENCLAW_DIAGNOSTICS` 环境变量覆盖项，经过去重并转换为小写。
- `name.*` 匹配 `name` 本身以及 `name.` 下的任何内容（例如，`telegram.*` 匹配 `telegram.http`）。
- `*` 或 `all` 会启用所有标志。
- 在配置中更改 `diagnostics.flags` 后，请重启网关；它不会热重载。

## 已知标志

| 标志              | 启用内容                                                  |
| ----------------- | --------------------------------------------------------- |
| `telegram.http`    | Telegram Bot API HTTP 错误日志记录                       |
| `brave.http`       | Brave Search 请求/响应/缓存日志记录                      |
| `profiler`         | 回复阶段性能分析器和 Codex 应用服务器性能分析器（两者） |
| `reply.profiler`   | 仅回复阶段性能分析器                                      |
| `codex.profiler`   | 仅 Codex 应用服务器性能分析器                            |
| `timeline`         | 结构化 JSONL 时间线工件（见下文）                         |

## Enable via configuration

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

Multiple flags:

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "brave.http", "gateway.*"]
  }
}
```

## 环境覆盖（一次性）

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,brave.http
```

值按逗号或空格分隔。特殊值：

| 值                            | 作用                                   |
| ----------------------------- | -------------------------------------- |
| `0`, `false`, `off`, `none`   | 禁用所有标志，也会覆盖配置             |
| `1`, `true`, `all`, `*`        | 启用每个标志                           |

`OPENCLAW_DIAGNOSTICS=0` 会禁用该进程中来自环境变量和配置的标志，
这对于临时静音在配置中仍保持开启的 profiler 标志很有用，而无需编辑文件。

## 分析器标志

分析器标志用于控制轻量级计时跨度；关闭时不会带来额外开销。

为一次网关运行启用所有受分析器控制的跨度：

```bash
OPENCLAW_DIAGNOSTICS=profiler openclaw gateway run
```

仅启用 reply-dispatch 分析器跨度：

```bash
OPENCLAW_DIAGNOSTICS=reply.profiler openclaw gateway run
```

仅启用 Codex app-server 启动/工具/线程分析器跨度：

```bash
OPENCLAW_DIAGNOSTICS=codex.profiler openclaw gateway run
```

`profiler` 同时启用 reply 分析器和 Codex 分析器；如需仅启用其中一个，请使用
作用域标志名称。

也可以在配置中设置：

```json
{
  "diagnostics": {
    "flags": ["reply.profiler", "codex.profiler"]
  }
}
```

更改配置标志后，请重启网关。要禁用某个分析器标志，请将其从
`diagnostics.flags` 中移除并重启，或者在启动进程时使用
`OPENCLAW_DIAGNOSTICS=0` 来覆盖该次运行的所有诊断标志。

## 时间线产物

`timeline` 标志（别名：`diagnostics.timeline`）会将结构化的启动
和运行时计时事件写入为 JSONL，供外部 QA 运行器使用：

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

输出路径始终来自 `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH`，即使
该标志本身是在配置中设置的；路径没有对应的配置键。
当 `timeline` 仅通过配置启用时，最早的配置加载跨度会缺失，
因为 OpenClaw 还未读取配置；随后启动阶段的跨度会正常捕获。

`OPENCLAW_DIAGNOSTICS=1`、`=all` 和 `=*` 也会启用时间线，
因为它们会启用所有标志。若你只需要 JSONL 产物而不需要其他任何诊断标志，
请优先使用作用域更明确的 `timeline` 标志。

时间线中的事件循环延迟采样还需要比 `timeline` 额外再启用一个选项：
在启用时间线的基础上，再设置 `OPENCLAW_DIAGNOSTICS_EVENT_LOOP=1`
（或 `on`/`true`/`yes`）。

时间线记录使用 `openclaw.diagnostics.v1` 信封格式，并且可能包含
进程 ID、阶段名称、跨度名称、持续时间、插件 ID、依赖计数、事件循环延迟采样、
提供者操作名称、子进程退出状态以及启动错误名称/消息。请将时间线文件视为本地
诊断产物；在与他人共享到你的机器之外之前请先检查。

## 日志输出位置

标志会将日志输出到标准诊断日志文件中。默认情况下：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

如果你设置了 `logging.file`，则改用该路径。日志采用 JSONL 格式（每行一个 JSON
对象）。脱敏仍会根据 `logging.redactSensitive` 生效。
有关完整的日志路径解析、轮转和脱敏模型，请参见 [Logging](/logging)。

## 提取日志

选择最新的日志文件：

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

筛选 Telegram HTTP 诊断日志：

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

筛选 Brave Search HTTP 诊断日志：

```bash
rg "brave http" /tmp/openclaw/openclaw-*.log
```

或者在复现时持续查看：

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

对于远程网关，请改用 `openclaw logs --follow`（参见
[/cli/logs](/cli/logs)）。

## 注意事项

- 如果 `logging.level` 设置得高于 `warn`，则由 flag 控制的日志可能会被抑制。默认的 `info` 就可以。
- `brave.http` 会记录 Brave Search 请求 URL/查询参数、响应状态/耗时，以及缓存命中/未命中/写入事件。它不会记录 API 密钥（作为请求头发送）或响应正文，但搜索查询可能具有敏感性。
- 标志可以安全地保持启用；它们只会影响特定子系统的日志量。
- 使用 [/logging](/logging) 更改日志目标、级别和脱敏设置。

## 相关内容

- [网关诊断](/gateway/diagnostics)
- [网关故障排查](/gateway/troubleshooting)
