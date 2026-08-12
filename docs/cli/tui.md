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

```bash
openclaw tui [target]
```

`target` 可以是 Control UI 会话 URL、简写的 `host/agent/ref`、类似 `movies-a1166b81` 的裸短引用，或字面量 `agent:...` 会话密钥。
URL 或主机目标会权威地选择对应的 Gateway；裸引用则使用已配置的或默认的 Gateway。你也可以直接将 Control UI URL 粘贴为 `openclaw <url>`，并将 TUI 选项放在其后，例如
`openclaw <url> --token <token> --deliver`。

裸 URL 形式接受 `--token`、`--password`、`--tls-fingerprint`、`--deliver`、`--thinking`、`--message`、`--timeout-ms` 和 `--history-limit`。
当你需要使用其他 TUI 选项时，请使用 `openclaw tui <url>`；`--local`、`--url` 和 `--session` 不能与会话 URL 同时使用。

相关指南：[TUI](/web/tui)

## 选项

| 标志                         | 默认值                                   | 描述                                                                                |
| ---------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `--local`                    | `false`                                  | 在本地嵌入式 agent 运行时上运行，而不是通过 Gateway。                 |
| `--url <url>`                | 配置中的 `gateway.remote.url`          | Gateway WebSocket URL。                                                             |
| `--token <token>`            | （none）                                  | 如有需要，Gateway token。                                                         |
| `--password <pass>`          | （none）                                  | 如有需要，Gateway 密码。                                                      |
| `--tls-fingerprint <sha256>` | `gateway.remote.tlsFingerprint`           | 预期的 TLS 证书指纹，用于固定的 `wss://` Gateway。                |
| `--session <key>`            | `main`（或当作用域为 global 时为 `global`） | 会话键。在 agent 工作区内，它会自动选择该 agent，除非前缀指定。 |
| `--deliver`                  | `false`                                  | 通过已配置的渠道传递 assistant 回复。                             |
| `--thinking <level>`         | （模型默认值）                           | Thinking 级别覆盖。                                                           |
| `--message <text>`           | （none）                                 | 连接后发送初始消息。                                          |
| `--timeout-ms <ms>`          | `agents.defaults.timeoutSeconds`          | agent 超时。无效值会记录警告并被忽略。                       |
| `--history-limit <n>`        | `200`                                    | 连接时要加载的历史记录条目数。                                                 |

别名：`openclaw chat` 和 `openclaw terminal` 会以
隐含的 `--local` 调用此命令。

## 说明

- `--local` 不能与 `--url`、`--token`、`--password` 或 `--tls-fingerprint` 结合使用。
- 只能传入一个 Gateway 目标。URL 目标不能与 `--url` 结合使用，任何位置目标都不能与 `--session` 或本地模式结合使用。
- URL 或主机目标不会重新使用已配置的凭据或 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。它会使用该确切 Gateway origin 的已存储设备令牌，或显式传入的 `--token` / `--password` 凭据。首次连接时，传入其中一个凭据，在该 Gateway 的 Control UI 中批准配对请求，然后重试；请参阅[设备](/cli/devices)。
- Session URL 必须保持无凭据状态。用户信息以及 `token` 和 `password` 等敏感查询参数或片段参数会被拒绝。
- 短引用会通过 Gateway 解析。如果短引用存在歧义，CLI 会打印候选名称和更长的 ID 前缀，但不会连接到任何会话。
- 在没有 URL／主机目标或显式 `--url` 的情况下，`tui` 会在可能时解析已配置的 Gateway 身份验证 SecretRefs，以用于令牌／密码身份验证（`env`／`file`／`exec`／`store` 提供程序）。
- 在没有显式 URL 或端口的情况下，`tui` 会遵循运行中 Gateway 记录的活动本地 Gateway 端口。显式 `--url`、`OPENCLAW_GATEWAY_URL`、`OPENCLAW_GATEWAY_PORT` 和远程 Gateway 配置具有更高优先级。
- 从已配置的 agent 工作区目录内部启动时，TUI 会自动为会话键默认值选择该 agent（除非显式使用 `agent:<id>:...` 形式的 `--session`）。
- 本地模式直接使用内嵌 agent 运行时。大多数本地工具都可用，但仅限 Gateway 的功能不可用。
- 本地模式要求独占拥有已配置的状态目录。当 Gateway 或其他内嵌写入程序拥有该状态时，它会拒绝启动；不使用 `--local` 以使用活动 Gateway，或先使用 `openclaw gateway stop` 停止它。
- 本地模式会将 `/auth [provider]` 添加到 TUI 命令界面。
- 插件批准门控在本地模式下仍然适用：需要批准的工具会在终端中提示进行决策，不会静默自动批准。
- 会话[目标](/tools/goal)会显示在页脚中，并可使用 `/goal` 进行管理。

## 会话目标错误

| 失败                                    | 恢复                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gateway 早于短链接解析功能                 | 从该 Gateway 的 Control UI 复制完整的会话密钥。                                                                                        |
| 会话缺失或短引用不明确                     | 对于已配置的／本地 Gateway，运行 `openclaw sessions list`；对于 URL／主机目标，在该 Gateway 的 Control UI 中选择更长或完整的密钥。 |
| Gateway 无法访问                           | 错误信息会指出所选源。对于 `*.ts.net` 主机，连接 Tailscale，并确认 Gateway 在 tailnet 上可访问。               |
| 已存储的设备令牌已撤销或轮换                | 使用 `openclaw devices rotate --device <deviceId> --role operator` 轮换令牌，然后重新连接。                                                    |
| TLS 证书固定不匹配                         | 原始 TLS 指纹错误会原样传递；请在重试前验证已配置的或显式指定的固定值。                              |

## 示例

```bash
openclaw chat
openclaw tui --local
openclaw tui
openclaw tui https://gateway.example/dashboard/main/movies-a1166b81
openclaw https://gateway.example/dashboard/main/movies-a1166b81 --token <token>
openclaw tui movies-a1166b81
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
- [Control UI URL](/web/urls)
- [设备](/cli/devices)
- [目标](/tools/goal)
