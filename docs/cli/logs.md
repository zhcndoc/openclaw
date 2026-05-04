---
summary: "openclaw logs 的 CLI 参考（通过 RPC 轮询 Gateway 日志）"
read_when:
  - 你需要远程轮询 Gateway 日志（无需 SSH）
  - 你想要供工具使用的 JSON 日志行
title: "日志"
---

# `openclaw logs`

通过 RPC 轮询 Gateway 文件日志（在远程模式下可用）。

相关：

- 日志概览：[Logging](/logging)
- Gateway CLI：[gateway](/cli/gateway)

## 选项

- `--limit <n>`：返回的日志行最大数量（默认 `200`）
- `--max-bytes <n>`：从日志文件读取的最大字节数（默认 `250000`）
- `--follow`：跟随日志流
- `--interval <ms>`：跟随时的轮询间隔（默认 `1000`）
- `--json`：输出按行分隔的 JSON 事件
- `--plain`：不带样式格式的纯文本输出
- `--no-color`：禁用 ANSI 颜色
- `--local-time`：以本地时区渲染时间戳

## 共享的 Gateway RPC 选项

`openclaw logs` 还接受标准的 Gateway 客户端标志：

- `--url <url>`：Gateway WebSocket URL
- `--token <token>`：Gateway 令牌
- `--timeout <ms>`：超时时间，单位为 ms（默认 `30000`）
- `--expect-final`：当 Gateway 调用由 agent 提供支持时，等待最终响应

当你传入 `--url` 时，CLI 不会自动应用配置或环境凭据。如果目标 Gateway 需要认证，请显式包含 `--token`。

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

## 注意

- 使用 `--local-time` 以本地时区渲染时间戳。
- 如果隐式的本地回环 Gateway 需要配对、在连接期间关闭，或者在 `logs.tail` 回复前超时，`openclaw logs` 会自动回退到已配置的 Gateway 文件日志。显式 `--url` 目标不会使用此回退。
- 使用 `--follow` 时，临时的 gateway 断开连接（WebSocket 关闭、超时、连接中断）会触发自动重连，并采用指数退避策略（最多 8 次重试，重试间隔上限为 30 秒）。每次重试都会向 stderr 打印一条警告，而一旦轮询成功，会打印一次 `[logs] gateway reconnected` 提示。在 `--json` 模式下，重试警告和重连转换都会以 `{"type":"notice"}` 记录的形式输出到 stderr。不可恢复的错误（认证失败、配置错误）仍会立即退出。

## 相关

- [CLI reference](/cli)
- [Gateway logging](/gateway/logging)
