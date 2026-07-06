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
openclaw dashboard --yes
```

- `--no-open`: 打印 URL，但不启动浏览器。
- `--yes`: 在需要时无需提示即可启动/安装 Gateway。

说明：

- 在可能的情况下，解析已配置的 `gateway.auth.token` SecretRef。
- 遵循 `gateway.tls.enabled`：启用 TLS 的 gateway 会打印/打开 `https://` Control UI URL，并通过 `wss://` 连接。
- 对于由 SecretRef 管理的令牌（已解析或未解析），打印/复制/打开的 URL 绝不会包含令牌，因此外部密钥不会泄露到终端输出、剪贴板历史或浏览器启动参数中。
- 如果 `gateway.auth.token` 由 SecretRef 管理但尚未解析，命令会打印一个不含令牌的 URL 和修复指导，而不是无效的令牌占位符。
- 如果为基于令牌身份验证的 URL 进行剪贴板/浏览器传递失败，命令会记录一条安全的手动认证提示，提及 `OPENCLAW_GATEWAY_TOKEN`、`gateway.auth.token` 以及 URL 片段键 `token`，但不会打印令牌值。

## 相关内容

- [CLI 参考](/cli)
- [仪表板](/web/dashboard)
