---
summary: "openclaw dashboard 的 CLI 参考（打开控制 UI）"
read_when:
  - 你想使用当前令牌打开 Control UI
  - 你想在不启动浏览器的情况下打印 URL
title: "仪表盘"
---

# `openclaw dashboard`

使用当前身份验证打开 Control UI。

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

响应包含 `url`、`httpUrl`、`wsUrl`、`port` 和 `tokenIncluded`。如果 Gateway 尚未就绪，命令会返回 `{"ok":false,"reason":"..."}` 并以非零状态退出。由 SecretRef 管理的 token 绝不会包含在 `url` 中。

注意：

- 在可能的情况下，解析已配置的 `gateway.auth.token` SecretRef。
- 遵循 `gateway.tls.enabled`：启用 TLS 的 Gateway 会打印/打开 `https://` 的 Control UI URL，并通过 `wss://` 连接。
- 对于 `lan` 或通配符 `custom` 绑定，跨主机启动始终使用回环地址，因为通配符不是浏览器目的地。明文 `tailnet` 和 `custom` 绑定也会使用 `127.0.0.1`，以便浏览器拥有安全上下文；启用 TLS 的特定主机会保留已配置地址，以便证书名称匹配。
- 在为特定接口绑定交付带认证的回环 URL 之前，命令会探测已配置接口，并验证它与 `127.0.0.1` 是否由同一个 Gateway 进程拥有。若监听器所有权存在歧义，则会安全失败并给出状态指导。
- 对于由 SecretRef 管理的 token（已解析或未解析），打印/复制/打开的 URL 都不会包含 token，因此外部密钥不会泄漏到终端输出、剪贴板历史或浏览器启动参数中。
- 如果 `gateway.auth.token` 由 SecretRef 管理但尚未解析，命令会打印一个未带 token 的 URL 和修复指导，而不是无效的 token 占位符。
- 如果针对已 token 认证的 URL，剪贴板/浏览器交付失败，命令会记录一条安全的手动认证提示，提及 `OPENCLAW_GATEWAY_TOKEN`、`gateway.auth.token` 和 URL 片段键 `token`，但不会打印 token 值。

## 相关内容

- [CLI 参考](/cli)
- [仪表板](/web/dashboard)
