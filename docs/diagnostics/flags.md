---
summary: "用于定向调试日志的诊断标志"
read_when:
  - 你需要定向调试日志，而不提高全局日志级别
  - 你需要捕获特定子系统的日志以用于支持
title: "诊断标志"
---

诊断标志可让你启用定向调试日志，而无需在所有地方开启详细日志。标志是可选启用的，除非某个子系统检查它们，否则不会产生任何影响。

## 工作原理

- 标志是字符串（不区分大小写）。
- 你可以在配置中或通过环境变量覆盖来启用标志。
- 支持通配符：
  - `telegram.*` 匹配 `telegram.http`
  - `*` 启用所有标志

## 通过配置启用

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
    "flags": ["telegram.http", "brave.http", "gateway.*"]
  }
}
```

更改标志后，请重启网关。

## 环境变量覆盖（一次性）

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

禁用所有标志：

```bash
OPENCLAW_DIAGNOSTICS=0
```

`OPENCLAW_DIAGNOSTICS=0` 是一个进程级的禁用覆盖：它会为该进程同时禁用来自环境变量和配置的标志。

## 分析器标志

分析器标志可在不提高全局日志级别的情况下启用定向计时跨度。默认情况下它们处于禁用状态。

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

从配置中启用分析器标志：

```json
{
  "diagnostics": {
    "flags": ["reply.profiler", "codex.profiler"]
  }
}
```

更改配置标志后，请重启网关。要禁用某个分析器标志，请将其从 `diagnostics.flags` 中移除并重启。若要在配置启用分析器标志时临时禁用所有诊断标志，请使用以下命令启动进程：

```bash
OPENCLAW_DIAGNOSTICS=0 openclaw gateway run
```

## 时间线产物

`timeline` 标志会为外部 QA 运行器写入结构化的启动和运行时计时事件：

```bash
OPENCLAW_DIAGNOSTICS=timeline \
OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=/tmp/openclaw-timeline.jsonl \
openclaw gateway run
```

你也可以在配置中启用它：

```json
{
  "diagnostics": {
    "flags": ["timeline"]
  }
}
```

时间线文件路径仍来自 `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH`。当 `timeline` 仅通过配置启用时，最早的配置加载跨度不会被输出，因为 OpenClaw 还没有读取配置；后续的启动跨度会使用该配置标志。

`OPENCLAW_DIAGNOSTICS=1`、`OPENCLAW_DIAGNOSTICS=all` 和
`OPENCLAW_DIAGNOSTICS=*` 也会启用时间线，因为它们会启用所有诊断标志。仅当你只想要 JSONL 计时
产物时，优先使用 `timeline`。

时间线记录使用 `openclaw.diagnostics.v1` 信封。事件可以包含
进程 ID、阶段名称、跨度名称、持续时间、插件 ID、依赖计数、
事件循环延迟采样、提供者操作名称、子进程退出状态，
以及启动错误名称/消息。请将时间线文件视为本地诊断产物；在向他人共享之前先进行审查。

## 日志输出位置

标志会将日志输出到标准诊断日志文件中。默认情况下：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

如果你设置了 `logging.file`，则改用该路径。日志采用 JSONL 格式（每行一个 JSON 对象）。脱敏仍会根据 `logging.redactSensitive` 生效。

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

对于远程网关，你也可以使用 `openclaw logs --follow`（参见 [/cli/logs](/cli/logs)）。

## 注意事项

- 如果 `logging.level` 设置得高于 `warn`，这些日志可能会被抑制。默认的 `info` 就可以。
- `brave.http` 会记录 Brave Search 请求 URL/查询参数、响应状态/耗时，以及缓存命中/未命中/写入事件。它不会记录 API 密钥或响应正文，但搜索查询可能包含敏感信息。
- 标志保持启用是安全的；它们只会影响特定子系统的日志量。
- 使用 [/logging](/logging) 来更改日志目标、级别和脱敏。

## 相关内容

- [网关诊断](/gateway/diagnostics)
- [网关故障排查](/gateway/troubleshooting)
