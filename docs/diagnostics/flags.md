---
summary: "用于定向调试日志的诊断标志"
read_when:
  - 需要定向调试日志而不提高全局日志等级
  - 需要捕获特定子系统的日志以便支持
title: "诊断标志"
---

# 诊断标志

诊断标志允许你开启定向调试日志，而无需在所有地方启用详细日志。标志是选择性开启的，除非子系统检测它们，否则无效。

## 工作原理

- 标志是字符串（不区分大小写）。
- 你可以在配置中启用标志，也可以通过环境变量覆盖启用。
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
    "flags": ["telegram.http", "gateway.*"]
  }
}
```

更改标志后请重启网关。

## 环境变量覆盖（临时）

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

禁用所有标志：

```bash
OPENCLAW_DIAGNOSTICS=0
```

## 日志存放位置

标志会将日志输出到标准诊断日志文件。默认路径：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

如果设置了 `logging.file`，则使用该路径。日志为 JSONL 格式（每行一个 JSON 对象）。敏感信息屏蔽仍基于 `logging.redactSensitive` 执行。

## 提取日志

选择最新日志文件：

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

筛选 Telegram HTTP 相关诊断：

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

或在复现问题时使用 tail 实时查看：

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

对于远程网关，也可以使用 `openclaw logs --follow` （参见 [/cli/logs](/cli/logs)）。

## 注意事项

- 如果将 `logging.level` 设置高于 `warn`，这些日志可能会被屏蔽。默认的 `info` 级别是合适的。
- 标志开启后安全无虞；它们仅影响特定子系统的日志量。
- 使用 [/logging](/logging) 来修改日志存放位置、日志等级及敏感信息屏蔽。
