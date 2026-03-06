---
summary: "`openclaw tui` 的 CLI 参考（连接到 Gateway 的终端 UI）"
read_when:
  - 你想要一个 Gateway 的终端 UI（适合远程使用）
  - 你想从脚本中传递 url/token/session
title: "tui"
---

# `openclaw tui`

打开连接到 Gateway 的终端 UI。

相关：

- TUI 指南: [TUI](/web/tui)

注意：

- `tui` 在可能的情况下解析已配置的 Gateway 认证 SecretRefs 用于 token/密码认证（`env`/`file`/`exec` 提供者）。

## 示例

```bash
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
```
