---
summary: "`openclaw dashboard` 的 CLI 参考（安全打开 Control UI）"
read_when:
  - "您想要从网关主机打开或重新配对 Control UI"
  - "想要打印 URL 而不启动浏览器"
title: "仪表板CLI"
---

# `openclaw dashboard`

使用短暂的一次性所有者配对链接打开 Control UI。成功的切换将为签名的浏览器提供持久的管理员设备凭据，因​​此重新打开仪表板并不依赖于共享网关令牌。在同一浏览器中打开新的切换还可以修复之前受限的设备凭据。

```bash
openclaw dashboard
openclaw dashboard --no-open
openclaw dashboard --json
openclaw dashboard --yes
```

- `--no-open`: 打印 URL 但不启动浏览器。
- `--json`: 打印一个可供机器读取的连接对象，不打开浏览器、不使用剪贴板、不提示，也不启动 Gateway。
- `--yes`：start/install 网关在需要时不提示。

## <a id="gateway-service-and-state-compatibility"></a> 网关服务和状态兼容性

OpenClaw CLI 和后台网关服务是分开的。服务安装提示是指所选配置文件的后台服务；这并不意味着 CLI 丢失。仪表板需要一个正在运行的网关，它也可以在终端中运行。

如果配置的端口繁忙但无法验证其网关握手，则仪表板会报告失败的检查，并且不会启动另一个服务。运行 `openclaw gateway status --deep` 检查侦听器并修复其连接。

较新的数据库架构警告意味着此构建无法读取现有状态。使用与该状态兼容的版本。要重新开始，请将 `OPENCLAW_STATE_DIR` 指向单独的目录。安装后台服务并不能解决数据库版本不匹配的问题。请参阅 [ 数据库兼容性](/reference/database-schemas#troubleshooting)。

## <a id="machine-readable-output"></a> 机器可读输出

对需要解析后的 Control UI URL 的桌面集成和脚本，请使用 `--json`：

```bash
openclaw dashboard --json
```

响应包括向后兼容的共享身份验证 `url`，以及 `browserUrl`、`browserBootstrapExpiresAtMs`、`httpUrl`、`wsUrl`、`port` 和 `tokenIncluded`。浏览器集成应打开 `browserUrl`；需要共享网关凭证的本机 RPC 客户端可以继续使用 `url`。如果网关未准备好或无法发出浏览器切换，则该命令将返回 `{"ok":false,"error":{"type":"cli_error","message":"..."},"reason":"..."}` 并以非零值退出。仪表板特定的 `reason` 保留在共享错误包络旁边。 SecretRef 管理的共享代币永远不会包含在 `url` 中。

对于终端 HTTP 故障，不可读的修复诊断会将观察到的 HTTP 状态保留在 `reason` 中（例如，`HTTP 503`）。

注意：

- 如果可能，解析配置的 `gateway.auth.token` SecretRefs。
- `browserUrl` 在 URL 片段中携带一个一次性、有效期十分钟的引导凭据。Control UI 会立即将其移除，将其绑定到浏览器已签名的设备身份，并仅存储生成的每设备管理员凭据。其他浏览器配置文件无法继承或重放该授权。
- 配对链接包括其网关目标。如果在浏览器中选择了另一个网关，请在配对前确认目标；取消保留现有选择。当网关更新在配对完成之前重新加载仪表板时，这也适用。
- 遵循 `gateway.tls.enabled`：启用 TLS- 的网关 print/open `https://` Control UI URL 并通过 `wss://` 进行连接。
- 对于 `lan` 或通配符 `custom` 绑定，同一主机启动始终使用环回，因为通配符不是浏览器目标。明文 `tailnet` 和 `custom` 绑定也使用 `127.0.0.1`，因此浏览器具有安全上下文； TLS-启用的特定主机保留配置的地址，以便证书名称匹配。
- 在为特定接口绑定提供经过身份验证的环回 URL 之前，该命令检查已配置的接口并验证它和 `127.0.0.1` 是否属于同一网关进程。不明确的侦听器所有权会通过状态指导停止命令。
- 交互式命令仅打印干净的底座URL； clipboard/browser 启动会收到一次性 `browserUrl`，而不是共享代币。因此，SecretRef 管理的共享令牌不会泄漏到终端输出、剪贴板历史记录或浏览器启动参数中。
- 如果对于经过令牌验证的 URL，clipboard/browser 传送失败，则该命令会记录一个名为 `OPENCLAW_GATEWAY_TOKEN`、`gateway.auth.token` 和 URL 片段密钥 `token` 的安全手动身份验证提示，而不打印令牌值。
- 如果共享代币无法放入URL且clipboard/browser交付失败，则运行`openclaw dashboard --json`并在十分钟内打开其短暂的`browserUrl`。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [仪表盘](/web/dashboard)
