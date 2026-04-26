---
summary: "`openclaw logs` 的命令行参考（通过 RPC 查看 Gateway 日志尾部）"
read_when:
  - 你需要远程查看 Gateway 日志尾部（无需 SSH）
  - 你希望为工具链获取 JSON 日志行
title: "日志"
---

# `openclaw logs`

通过 RPC 查看 Gateway 文件日志尾部（适用于远程模式）。

相关内容：

- 日志概览：[日志](/logging)
- Gateway 命令行：[gateway](/cli/gateway)

## 选项

- `--limit <n>`：返回的最大日志行数（默认 `200`）
- `--max-bytes <n>`：从日志文件读取的最大字节数（默认 `250000`）
- `--follow`：跟随日志流
- `--interval <ms>`：跟随时的轮询间隔（默认 `1000`）
- `--json`：输出行分隔的 JSON 事件
- `--plain`：纯文本输出，无样式格式
- `--no-color`：禁用 ANSI 颜色
- `--local-time`：以本地时区渲染时间戳

## 共享 Gateway RPC 选项

`openclaw logs` 也接受标准的 Gateway 客户端标志：

- `--url <url>`：Gateway WebSocket URL
- `--token <token>`：Gateway 令牌
- `--timeout <ms>`：超时时间（毫秒）（默认 `30000`）
- `--expect-final`：当 Gateway 调用由 agent 支持时，等待最终响应

当传递 `--url` 时，CLI 不会自动应用配置或环境凭据。如果目标 Gateway 需要认证，请显式包含 `--token`。

## 示例

```bash
openclaw logs
openclaw logs --follow
openclaw logs --follow --interval 2000
openclaw logs --limit 500 --max-bytes 500000
openclaw logs --json
openclaw logs --plain
openclaw logs --no-color
openclaw logs --limit 500
openclaw logs --local-time
openclaw logs --follow --local-time
openclaw logs --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

## 注意事项

- 使用 `--local-time` 以本地时区渲染时间戳。
- 如果本地回环 Gateway 请求配对，`openclaw logs` 会自动回退到已配置的本地日志文件。显式的 `--url` 目标不会使用此回退机制。

## 相关内容

- [CLI 参考](/cli)
- [Gateway 日志记录](/gateway/logging)
