---
summary: "`openclaw proxy` 的 CLI 参考，包括运维管理的代理验证和本地调试代理捕获检查器"
read_when:
  - 你需要在部署前验证运维管理的代理路由
  - 你需要在本地捕获 OpenClaw 传输流量进行调试
  - 你想检查调试代理会话、blob 或内置查询预设
title: "代理"
---

# `openclaw proxy`

验证运维管理的代理路由，或运行本地显式调试代理并检查捕获的流量。

使用 `validate` 在启用 OpenClaw 代理路由之前，对运维管理的正向代理进行预检。其他命令是用于传输层调查的调试工具：它们可以启动本地代理，运行启用捕获的子命令，列出捕获会话，查询常见流量模式，读取捕获的 blob，并清除本地捕获数据。

## 命令

```bash
openclaw proxy start [--host <host>] [--port <port>]
openclaw proxy run [--host <host>] [--port <port>] -- <cmd...>
openclaw proxy validate [--json] [--proxy-url <url>] [--allowed-url <url>] [--denied-url <url>] [--timeout-ms <ms>]
openclaw proxy coverage
openclaw proxy sessions [--limit <count>]
openclaw proxy query --preset <name> [--session <id>]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

## 验证

`openclaw proxy validate` 会检查来自 `--proxy-url`、配置或 `OPENCLAW_PROXY_URL` 的实际运维管理代理 URL。当未启用并配置代理时，它会报告配置问题；在更改配置之前，可使用 `--proxy-url` 进行一次性的预检。默认情况下，它会验证一个公共目标是否能通过代理成功访问，以及代理是否无法访问一个临时的回环 canary。自定义的拒绝目标采用失败关闭策略：HTTP 响应和含糊的传输失败都会判定为失败，除非你能单独验证部署特定的拒绝信号。

选项：

- `--json`：输出机器可读的 JSON。
- `--proxy-url <url>`：验证此代理 URL，而不是使用配置或环境变量。
- `--allowed-url <url>`：添加一个预期可通过代理成功访问的目标。可重复使用以检查多个目标。
- `--denied-url <url>`：添加一个预期会被代理阻止的目标。可重复使用以检查多个目标。
- `--timeout-ms <ms>`：每个请求的超时时间，单位为毫秒。

有关部署指导和拒绝语义，请参见 [Network Proxy](/security/network-proxy)。

## 查询预设

`openclaw proxy query --preset <name>` 接受：

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

## 注意事项

- 除非设置了 `--host`，否则 `start` 默认使用 `127.0.0.1`。
- `run` 会先启动本地调试代理，然后在 `--` 之后运行命令。
- 当代理配置或目标检查失败时，`validate` 以退出码 1 退出。
- 捕获内容是本地调试数据；完成后请使用 `openclaw proxy purge`。

## 相关内容

- [CLI reference](/cli)
- [Network Proxy](/security/network-proxy)
- [Trusted proxy auth](/gateway/trusted-proxy-auth)
