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

```bash
openclaw proxy validate [--json] [--proxy-url <url>] [--proxy-ca-file <path>] [--allowed-url <url>] [--denied-url <url>] [--apns-reachable] [--apns-authority <url>] [--timeout-ms <ms>]
openclaw proxy start [--host <host>] [--port <port>]
openclaw proxy run [--host <host>] [--port <port>] -- <cmd...>
openclaw proxy coverage [--json]
openclaw proxy sessions [--limit <count>] [--json]
openclaw proxy query --preset <name> [--session <id>] [--json]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

`validate` 预检一个运维管理的正向代理。其余命令是用于传输层调查的调试工具：启动本地捕获代理，通过它运行子命令，列出捕获会话，查询流量模式，读取已捕获的 blob，并清除本地捕获数据。

## 验证

检查来自 `--proxy-url`、配置（`proxy.proxyUrl`）或 `OPENCLAW_PROXY_URL` 的实际生效的、由 operator 管理的代理 URL，按该优先级顺序。若未启用并配置代理，则报告配置问题；如需一次性预检且不修改配置，可传入 `--proxy-url`。

受管代理 URL 使用 `http://` 表示普通的正向代理监听；当 OpenClaw 必须先向代理端点本身发起 TLS，再发送代理请求时，则使用 `https://`。对该 TLS 连接如需信任私有 CA，请使用 `--proxy-ca-file`。

默认情况下，它会运行：

- 一次针对 `https://example.com/` 的 **允许** 检查（可用 `--allowed-url` 覆盖或追加，可重复）
- 一次针对临时回环 canary 的 **拒绝** 检查（可用 `--denied-url` 覆盖，可重复）

自定义的 `--denied-url` 目标采用 fail-closed 策略：HTTP 响应和不明确的传输失败都视为失败，除非你能独立验证某个部署特定的拒绝信号。内置的回环 canary 是唯一一个将传输错误视为阻断证据的目标。

添加 `--apns-reachable` 还会通过代理打开一个 APNs HTTP/2 CONNECT 隧道，并确认 sandbox APNs 有响应。该探测会发送一个故意无效的 provider token，因此 APNs 返回 `403 InvalidProviderToken` 也会被视为可达信号（而不是失败）。

### 选项

| 标志                     | 作用                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `--json`                 | 输出机器可读的 JSON                                                                                        |
| `--proxy-url <url>`      | 验证此 `http://`/`https://` 代理 URL，而不是使用配置或环境变量                                              |
| `--proxy-ca-file <path>` | 在验证 HTTPS 代理端点的 TLS 时信任此 PEM 格式 CA 文件                                             |
| `--allowed-url <url>`    | 期望通过代理成功访问的目标（可重复）                                                     |
| `--denied-url <url>`     | 期望被代理阻止的目标（可重复）                                                       |
| `--apns-reachable`       | 另外验证 sandbox APNs 是否可通过代理进行 HTTP/2 访问                                                     |
| `--apns-authority <url>` | 要探测的 APNs authority（默认 `https://api.sandbox.push.apple.com`；生产环境为 `https://api.push.apple.com`） |
| `--timeout-ms <ms>`      | 每个请求的超时时间                                                                                                |

当代理配置或目标检查失败时，以退出码 1 退出。

有关部署指导和拒绝语义，请参阅 [网络代理](/security/network-proxy)。

## 调试代理

`start` 启动一个本地抓取代理并打印其 URL、CA 证书路径和抓取数据库路径；使用 Ctrl+C 停止。默认绑定 `127.0.0.1`，除非设置了 `--host`。

`run` 启动一个本地调试代理，然后在应用代理环境变量后，在其自己的抓取会话下运行 `<cmd...>`（在 `--` 之后）。

调试代理的直接上游转发会打开上游套接字用于诊断。当 OpenClaw 托管代理模式处于活动状态时，默认禁用用于代理请求和 CONNECT 隧道的直接转发；仅在获批的本地诊断中设置 `OPENCLAW_DEBUG_PROXY_ALLOW_DIRECT_CONNECT_WITH_MANAGED_PROXY=1`。

`coverage` 打印一个 JSON 报告（`summary` + 每个传输的 `entries`），显示哪些传输被捕获、仅代理、或未覆盖。

`sessions` 列出最近的抓取会话（`--limit`，默认 20）。

`query --preset <name>` 对已捕获的流量运行一个内置查询，可选择限定到 `--session <id>`。预设：

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

`coverage`、`sessions` 和 `query` 默认已经返回 JSON。它们也接受 `--json`，作为显式的机器输出选项，以便脚本保持一致。
在该模式下，`coverage` 保留其报告对象，而 `sessions` 和 `query` 分别将其行包装在 `sessions` 和 `rows` 下。

`blob --id <blobId>` 打印已捕获负载 blob 的原始内容。

`purge` 删除所有已捕获的流量元数据和 blob。捕获内容属于本地调试数据；完成后请清除。

## 相关内容

- [CLI 参考](/cli)
- [网络代理](/security/network-proxy)
- [受信任代理认证](/gateway/trusted-proxy-auth)
