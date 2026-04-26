---
summary: "`openclaw dashboard` 的命令行参考（打开控制界面）"
read_when:
  - 你想使用当前令牌打开控制界面
  - 你想在不启动浏览器的情况下打印 URL
title: "Dashboard"
---

# `openclaw dashboard`

使用当前认证打开控制界面。

```bash
openclaw dashboard
openclaw dashboard --no-open
```

备注：

- `dashboard` 在可能的情况下会解析已配置的 `gateway.auth.token` SecretRef。
- 对于由 SecretRef 管理的令牌（无论是否已解析），`dashboard` 会打印/复制/打开一个不包含令牌的 URL，以避免在终端输出、剪贴板历史或浏览器启动参数中暴露外部密钥。
- 如果 `gateway.auth.token` 由 SecretRef 管理但在此命令路径中未解析，该命令会打印一个不包含令牌的 URL，并提供明确的修复指导，而不是嵌入无效的令牌占位符。

## 相关内容

- [CLI reference](/cli)
- [Dashboard](/web/dashboard)
