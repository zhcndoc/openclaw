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
openclaw proxy validate [--json] [--proxy-url <url>] [--proxy-ca-file <path>] [--allowed-url <url>] [--denied-url <url>] [--apns-reachable] [--apns-authority <url>] [--timeout-ms <ms>]
openclaw proxy coverage
openclaw proxy sessions [--limit <count>]
openclaw proxy query --preset <name> [--session <id>]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

## 验证

`openclaw proxy validate` 会检查来自
`--proxy-url`、配置或 `OPENCLAW_PROXY_URL` 的实际运维管理代理 URL。运维管理的代理 URL 可以使用
`http://` 作为普通正向代理监听器，或者在 OpenClaw 必须在发送代理请求之前先与代理端点建立 TLS 时使用
`https://`。当未启用并配置代理时，它会报告一个
配置问题；在更改配置之前，可使用 `--proxy-url` 进行一次性预检。添加 `--proxy-ca-file` 以信任
HTTPS 代理端点 TLS 连接所使用的私有 CA。默认情况下，它会
验证一个公共目标能否通过代理成功访问，以及代理
无法访问临时回环 canary。自定义的拒绝目标采用 fail-closed 策略：HTTP 响应和含糊的传输失败都会判定为失败，除非
你能单独验证某个部署特定的拒绝信号。添加
`--apns-reachable` 还会通过代理打开一个 APNs HTTP/2 CONNECT 隧道，
并确认 sandbox APNs 可响应；该探测使用了故意无效的
provider token，因此 APNs 返回 `403 InvalidProviderToken` 响应可视为
可达性的成功信号。

选项：

- `--json`: 以机器可读的 JSON 格式输出。
- `--proxy-url <url>`: 使用此 `http://` 或 `https://` 代理 URL 进行验证，而不是使用配置或环境变量。
- `--proxy-ca-file <path>`: 信任此 PEM CA 文件，用于 HTTPS 代理端点的 TLS 验证。
- `--allowed-url <url>`: 添加一个预计可通过代理成功访问的目标。可重复以检查多个目标。
- `--denied-url <url>`: 添加一个预计会被代理阻止的目标。可重复以检查多个目标。
- `--apns-reachable`: 还验证是否可通过代理访问 sandbox APNs HTTP/2。
- `--apns-authority <url>`: 在 `--apns-reachable` 下用于探测的 APNs authority（默认 `https://api.sandbox.push.apple.com`；生产环境为 `https://api.push.apple.com`）。
- `--timeout-ms <ms>`: 每个请求的超时时间，单位为毫秒。

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

- `start` 默认为 `127.0.0.1`，除非设置了 `--host`。
- `run` 会先启动本地调试代理，然后运行 `--` 后面的命令。
- 调试代理的直接上游转发会打开上游 socket 用于诊断。当 OpenClaw 托管代理模式处于活动状态时，默认禁用代理请求和 CONNECT 隧道的直接转发；仅在获得批准的本地诊断场景下才设置 `OPENCLAW_DEBUG_PROXY_ALLOW_DIRECT_CONNECT_WITH_MANAGED_PROXY=1`。
- 当代理配置或目标检查失败时，`validate` 以退出码 1 结束。
- 捕获内容属于本地调试数据；完成后请使用 `openclaw proxy purge` 清理。

## 相关内容

- [CLI reference](/cli)
- [Network Proxy](/security/network-proxy)
- [Trusted proxy auth](/gateway/trusted-proxy-auth)
