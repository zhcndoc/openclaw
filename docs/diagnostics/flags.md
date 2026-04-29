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
    "flags": ["telegram.http", "gateway.*"]
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

或者在复现时持续跟踪：

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

对于远程网关，你也可以使用 `openclaw logs --follow`（参见 [/cli/logs](/cli/logs)）。

## 注意事项

- 如果 `logging.level` 设置得高于 `warn`，这些日志可能会被抑制。默认的 `info` 就可以。
- 保持标志启用是安全的；它们只会影响特定子系统的日志量。
- 使用 [/logging](/logging) 更改日志目标、级别和脱敏设置。

## 相关内容

- [网关诊断](/gateway/diagnostics)
- [网关故障排查](/gateway/troubleshooting)
