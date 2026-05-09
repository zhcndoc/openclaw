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
```

说明：

- `dashboard` 在可能的情况下会解析已配置的 `gateway.auth.token` SecretRef。
- `dashboard` 会遵循 `gateway.tls.enabled`：启用 TLS 的网关会打印/打开
  `https://` Control UI URL，并通过 `wss://` 连接。
- 如果剪贴板/浏览器传递 token 认证的 dashboard URL 失败，
  `dashboard` 会记录一条安全的手动认证提示，包含 `OPENCLAW_GATEWAY_TOKEN`、
  `gateway.auth.token` 和 fragment key `token`，但不会打印 token
  值。
- 对于由 SecretRef 管理的 token（无论是否已解析），`dashboard` 会打印/复制/打开一个不包含 token 的 URL，以避免在终端输出、剪贴板历史或浏览器启动参数中暴露外部密钥。
- 如果 `gateway.auth.token` 在此命令路径中由 SecretRef 管理但尚未解析，命令会打印一个不包含 token 的 URL 和明确的修复指导，而不是嵌入一个无效的 token 占位符。

## 相关内容

- [CLI 参考](/cli)
- [Dashboard](/web/dashboard)
