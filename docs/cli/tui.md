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

相关指南：[TUI](/web/tui)

## 选项

| Flag                  | Default                                   | Description                                                                        |
| --------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| `--local`             | `false`                                   | 运行本地嵌入式 agent 运行时，而不是 Gateway。                                         |
| `--url <url>`         | `gateway.remote.url` from config          | Gateway WebSocket URL。                                                             |
| `--token <token>`     | (none)                                    | 如有需要，Gateway token。                                                           |
| `--password <pass>`   | (none)                                    | 如有需要，Gateway 密码。                                                           |
| `--session <key>`     | `main` (or `global` when scope is global) | 会话 key。在 agent 工作区内，它会自动选择该 agent，除非前缀已指定。                    |
| `--deliver`           | `false`                                   | 通过已配置的渠道发送 assistant 回复。                                                |
| `--thinking <level>`  | (model default)                           | 思考级别覆盖。                                                                      |
| `--message <text>`    | (none)                                    | 连接后发送初始消息。                                                                |
| `--timeout-ms <ms>`   | `agents.defaults.timeoutSeconds`          | agent 超时。无效值会记录警告并被忽略。                                               |
| `--history-limit <n>` | `200`                                     | 连接时加载的历史条目数量。                                                          |

别名：`openclaw chat` 和 `openclaw terminal` 会以
隐含的 `--local` 调用此命令。

## 说明

- `--local` 不能与 `--url`、`--token` 或 `--password` 组合使用。
- `tui` 会在可能时解析已配置的 Gateway 认证 SecretRefs，用于 token/password 认证
  （`env`/`file`/`exec` 提供程序）。
- 从已配置的 agent 工作区目录内部启动时，TUI 会自动为会话键默认选择
  该 agent（除非 `--session` 明确指定为 `agent:<id>:...`）。
- 要在页脚中显示非本地、基于 URL 的连接的 Gateway 主机名，请运行
  `openclaw config set tui.footer.showRemoteHost true`。默认关闭；对于回环地址或嵌入式本地连接，永不显示。
- 本地模式直接使用嵌入式 agent 运行时。大多数本地工具都可正常使用，
  但仅 Gateway 可用的功能不可用。
- 本地模式会向 TUI 命令界面添加 `/auth [provider]`。
- 插件审批门控在本地模式下仍然适用：需要审批的工具会在终端中提示做出决定，不会静默自动批准。
- 会话 [目标](/tools/goal) 会显示在页脚中，并可通过
  `/goal` 进行管理。

## 示例

```bash
openclaw chat
openclaw tui --local
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
openclaw chat --message "比较我的配置与文档，并告诉我需要修复什么"
# 当在 agent 工作区内运行时，会自动推断该 agent
openclaw tui --session bugfix
```

## 配置修复循环

使用本地模式，让嵌入式代理检查当前配置，将其与文档进行比较，并帮助在同一个终端中修复它。

如果 `openclaw config validate` 已经失败，请先运行 `openclaw configure` 或
`openclaw doctor --fix`；`openclaw chat` 不会绕过
无效配置保护。

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

使用 `openclaw config set` 或 `openclaw configure` 应用有针对性的修复，然后
重新运行 `openclaw config validate`。参见 [TUI](/web/tui) 和
[Config](/cli/config)。

## 相关

- [CLI 参考](/cli)
- [TUI](/web/tui)
- [目标](/tools/goal)
