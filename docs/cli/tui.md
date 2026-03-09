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
- 在从已配置的 agent 工作区目录内启动时，TUI 自动选择该 agent 作为会话密钥默认（除非显式使用 `--session` 指定为 `agent:<id>:...`）。

## 示例

```bash
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
# 当在 agent 工作区内运行时，会自动推断该 agent
openclaw tui --session bugfix
```
