---
summary: "openclaw tui 的 CLI 参考（由 Gateway 支持或本地嵌入式终端 UI）"
read_when:
  - 你想要一个用于 Gateway 的终端 UI（适合远程使用）
  - 你想从脚本中传入 url/token/session
  - 你想在没有 Gateway 的情况下以本地嵌入式模式运行 TUI
  - 你想使用 openclaw chat 或 openclaw tui --local
title: "TUI"
---

# `openclaw tui`

打开连接到 Gateway 的终端 UI，或以本地嵌入式模式运行。

相关：

- TUI 指南：[TUI](/web/tui)

注意：

- `chat` 和 `terminal` 是 `openclaw tui --local` 的别名。
- `--local` 不能与 `--url`、`--token` 或 `--password` 组合使用。
- 当可能时，`tui` 会解析为 token/password 认证配置的 Gateway auth SecretRefs（`env`/`file`/`exec` 提供器）。
- 当从已配置的 agent 工作区目录内部启动时，TUI 会自动为会话 key 默认选择该 agent（除非 `--session` 明确指定为 `agent:<id>:...`）。
- 本地模式直接使用嵌入式 agent 运行时。大多数本地工具可用，但仅 Gateway 可用的功能不可用。
- 本地模式会在 TUI 命令界面中增加 `/auth [provider]`。
- 插件审批门禁在本地模式下仍然适用。需要审批的工具会在终端中提示你做出决策；不会因为没有 Gateway 参与而悄悄自动批准任何内容。

## 示例

```bash
openclaw chat
openclaw tui --local
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
openclaw chat --message "Compare my config to the docs and tell me what to fix"
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```

## 配置修复循环

当当前配置已经通过验证，并且你希望嵌入式 agent 检查它、将其与文档对比，并帮助你在同一个终端中修复它时，请使用本地模式：

如果 `openclaw config validate` 已经失败，请先使用 `openclaw configure` 或 `openclaw doctor --fix`。`openclaw chat` 不会绕过无效配置保护。

```bash
openclaw chat
```

然后在 TUI 中：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

使用 `openclaw config set` 或 `openclaw configure` 应用有针对性的修复，然后重新运行 `openclaw config validate`。参见 [TUI](/web/tui) 和 [Config](/cli/config)。

## 相关

- [CLI reference](/cli)
- [TUI](/web/tui)
