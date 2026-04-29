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

- `dashboard` 会在可能的情况下解析已配置的 `gateway.auth.token` SecretRef。
- `dashboard` 会遵循 `gateway.tls.enabled`：启用 TLS 的网关会打印/打开
  `https://` Control UI URL，并通过 `wss://` 连接。
- 对于由 SecretRef 管理的令牌（无论已解析或未解析），`dashboard` 会打印/复制/打开一个不包含令牌的 URL，以避免在终端输出、剪贴板历史或浏览器启动参数中暴露外部密钥。
- 如果 `gateway.auth.token` 由 SecretRef 管理，但在此命令路径中未解析，命令会打印一个不包含令牌的 URL 和明确的修复指导，而不是嵌入无效的令牌占位符。

## 相关内容

- [CLI 参考](/cli)
- [Dashboard](/web/dashboard)
