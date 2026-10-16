---
summary: "`openclaw proxy` 的 CLI 参考，包括运维管理的代理验证和本地调试代理捕获检查器"
read_when:
  - "你需要在部署前验证运维管理的代理路由"
  - "你需要在本地捕获 OpenClaw 传输流量进行调试"
  - "你想检查调试代理会话、blob 或内置查询预设"
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

## <a id="validate"></a> 验证

按优先顺序从 `--proxy-url`、配置 （`proxy.proxyUrl`） 或 `OPENCLAW_PROXY_URL` 检查有效的操作员管理代理 URL。如果没有启用和配置代理，则报告配置问题。通过 `--proxy-url` 进行一次性预检，无需修改配置。

托管代理 URL 使用 `http://` 作为普通转发代理侦听器，或者在 OpenClaw 必须在发送代理请求之前向代理端点本身打开 TLS 时使用 `https://`。使用 `--proxy-ca-file` 信任该 TLS 连接的专用 CA。

默认情况下，它会运行：

- one **allowed** 检查 `https://example.com/`（override/add 与 `--allowed-url`，可重复）
- 一次针对临时回环 canary 的 **拒绝** 检查（可用 `--denied-url` 覆盖，可重复）

自定义 `--denied-url` 目标需要经过验证的拒绝信号：HTTP 响应和不明确的传输失败都算作失败，除非您可以独立验证特定于部署的拒绝信号。内置环回金丝雀是传输错误被视为阻塞证据的唯一目标。

添加 `--apns-reachable` 以同时通过代理打开 APNs HTTP/2 CONNECT 隧道并确认沙箱 APNs 响应。该检查故意发送无效的提供商令牌，因此 APNs `403 InvalidProviderToken` 响应被视为成功的可达性信号（而不是失败）。

### <a id="options"></a> 选项

| 标志                     | 作用                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `--json`                 | 输出机器可读的 JSON                                                                                        |
| `--proxy-url <url>`      | 验证此 `http://`/`https://` 代理 URL，而不是使用配置或环境变量                                              |
| `--proxy-ca-file <path>` | 信任此 PEM CA 文件以进行 HTTPS 代理端点的 TLS 验证                                             |
| `--allowed-url <url>`    | 期望通过代理成功访问的目标（可重复）                                                     |
| `--denied-url <url>`     | 期望被代理阻止的目标（可重复）                                                       |
| `--apns-reachable`       | 另外验证 sandbox APNs 是否可通过代理进行 HTTP/2 访问                                                     |
| `--apns-authority <url>` | APNs权限检查（默认`https://api.sandbox.push.apple.com`；量产为`https://api.push.apple.com`） |
| `--timeout-ms <ms>`      | 每个请求的超时时间                                                                                                |

当代理配置或目标检查失败时，以退出码 1 退出。

有关部署指南和拒绝语义，请参阅 [Network Proxy](/security/network-proxy)。

## <a id="debug-proxy"></a> 调试代理

`start` 启动本地捕获代理并打印其 URL、CA 证书路径，并捕获 DB 路径。使用 Ctrl+C 停止它。默认绑定 `127.0.0.1` 除非设置了 `--host`。

`run` 启动本地调试代理，然后在其自己的捕获会话下运行应用了代理环境的 `<cmd...>`（在 `--` 之后）。 OpenClaw 子级通过其调试端点 URL 中的临时会话绑定捕获令牌将检测到的 HTTPS 和 WebSocket 有效负载转发到父级。正常的 HTTP 代理变量和存储的捕获 URL 保持无凭据。父级仍然是唯一的持久性客户端；孩子没有打开捕获数据库。专用捕获端点无法读取或清除捕获并通过代理关闭。对于改变其他 OpenClaw 状态的子命令，请首先运行网关，以便这些命令可以路由其写入。离线捕获保留独占父级所有权，直到子级退出。

捕获持久性使用异步工作操作。当本地网关拥有状态目录时，CLI 将代理侦听器和子命令保留在本地，并通过该网关路由捕获读取和写入。当网关停止时，CLI 通过捕获清理拥有独占的离线所有权。失败或不确定的网关请求永远不会在本地重播。没有捕获路由的旧网关需要更新或在离线捕获之前有序停止。在有序关闭时，`start` 和 `run` 等待承认的捕获写入和会话清理。即使原始 HTTP 响应已传递给其调用方，捕获失败在清理期间仍可报告。

使用 [proxy 捕获 SDK](/plugins/sdk-subpaths#asynchronous-proxy-capture) 的集成必须等待捕获完成并释放其异步存储租约。直接数据库维护关闭会使捕获许可失效，并且不能替代清理；同步终结器无法耗尽异步捕获工作。

调试代理的直接上游转发打开上游套接字以进行诊断。当 OpenClaw 托管代理模式处于活动状态时，默认情况下禁用代理请求和 CONNECT 隧道的直接转发。仅针对经批准的本地诊断设置 `OPENCLAW_DEBUG_PROXY_ALLOW_DIRECT_CONNECT_WITH_MANAGED_PROXY=1`。

`coverage` 打印一个 JSON 报告（`summary` + 每个传输的 `entries`），显示哪些传输被捕获、仅代理、或未覆盖。

`sessions` 列出最近的抓取会话（`--limit`，默认 20）。

`query --preset <name>` 对已捕获的流量运行一个内置查询，可选择限定到 `--session <id>`。预设：

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

`coverage`、`sessions` 和 `query` 默认已经返回 JSON。它们也接受 `--json`，作为显式的机器输出选项，以便脚本保持一致。 在该模式下，`coverage` 保留其报告对象，而 `sessions` 和 `query` 分别将其行包装在 `sessions` 和 `rows` 下。

`blob --id <blobId>` 打印已捕获负载 blob 的原始内容。

`purge` 删除所有捕获的流量元数据和 blob。捕获是本地调试数据。完成后清除它们。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [网络 Proxy](/security/network-proxy)
- [可信代理授权](/gateway/trusted-proxy-auth)
