---
summary: "`openclaw dashboard` 的 CLI 参考（安全打开控制界面）
read_when:
  - 想要从 Gateway 主机打开或重新配对控制界面
  - 想要打印 URL 而不启动浏览器
title: "仪表板"
---

# `openclaw dashboard`

使用短期有效的一次性浏览器配对链接打开控制界面。成功完成交接后，
该浏览器会拥有自己的持久设备凭据，因此重新打开仪表板不依赖
共享的 Gateway 令牌。

```bash
openclaw dashboard
openclaw dashboard --no-open
openclaw dashboard --json
openclaw dashboard --yes
```

- `--no-open`: 打印 URL 但不启动浏览器。
- `--json`: 打印一个可供机器读取的连接对象，不打开浏览器、不使用剪贴板、不提示，也不启动 Gateway。
- `--yes`: 在需要时无需提示即可启动/安装 Gateway。

## 机器可读输出

对需要解析后的 Control UI URL 的桌面集成和脚本，请使用 `--json`：

```bash
openclaw dashboard --json
```

响应包含向后兼容的共享身份验证 `url`，以及 `browserUrl`、
`browserBootstrapExpiresAtMs`、`httpUrl`、`wsUrl`、`port` 和 `tokenIncluded`。浏览器集成
应打开 `browserUrl`；需要共享 Gateway 凭据的原生 RPC 客户端可以继续使用
`url`。如果 Gateway 尚未就绪或无法签发浏览器交接地址，命令将返回
`{"ok":false,"reason":"..."}` 并以非零状态退出。由 SecretRef 管理的共享令牌绝不会包含在
`url` 中。

注意：

- 尽可能解析配置的 `gateway.auth.token` SecretRef。
- `browserUrl` 在 URL 片段中携带一次性、有效期十分钟的引导信息。Control UI 会立即移除
  该信息，将其绑定到浏览器已签名的设备身份，并仅存储最终生成的
  每设备凭据。
- 遵循 `gateway.tls.enabled`：启用 TLS 的 Gateway 会打印/打开 `https://` Control UI URL，并通过 `wss://` 连接。
- 对于 `lan` 或通配符 `custom` 绑定，同主机启动始终使用回环地址，因为通配符不是浏览器目标地址。纯文本的 `tailnet` 和 `custom` 绑定同样使用 `127.0.0.1`，以便浏览器拥有安全上下文；启用 TLS 的特定主机则保留配置的地址，以确保其与证书名称匹配。
- 在为特定接口绑定交付经过身份验证的回环 URL 之前，命令会探测配置的接口，并验证该接口与 `127.0.0.1` 由同一 Gateway 进程拥有。监听器所有权不明确时将安全失败，并提供状态指导。
- 交互式命令只打印干净的基础 URL；剪贴板/浏览器启动会接收
  一次性 `browserUrl`，绝不会接收共享令牌。因此，由 SecretRef 管理的共享令牌不会泄露到
  终端输出、剪贴板历史记录或浏览器启动参数中。
- 如果针对使用令牌身份验证的 URL 的剪贴板/浏览器交付失败，命令会记录一条安全的手动身份验证提示，其中指出 `OPENCLAW_GATEWAY_TOKEN`、`gateway.auth.token` 和 URL 片段键 `token`，但不会打印令牌值。
- 如果共享令牌无法放入 URL 且剪贴板/浏览器交付失败，请运行
  `openclaw dashboard --json`，并在十分钟内打开其中短时有效的 `browserUrl`。

## 相关内容

- [CLI 参考](/cli)
- [仪表板](/web/dashboard)
