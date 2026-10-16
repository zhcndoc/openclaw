---
summary: "CLI `openclaw tui` 参考（网关支持或本地嵌入式终端 UI）"
read_when:
  - "你想要一个用于 Gateway 的终端 UI（适合远程使用）"
  - "你想从脚本中传入 url/token/session"
  - "你想在没有 Gateway 的情况下以本地嵌入式模式运行 TUI"
  - "你想使用 openclaw chat 或 openclaw tui --local"
title: "张开爪图伊"
---

# `openclaw tui`

打开连接到 Gateway 的终端 UI，或以本地嵌入式模式运行。

```bash
openclaw tui [target]
```

`target` 可以是 Control UI 会话 URL、紧凑的 `host/agent/ref`、裸短引用（例如 `movies-a1166b81`）或文字 `agent:...` 会话密钥。 URL 或主机目标权威地选择该网关；裸引用使用配置的或默认的网关。您还可以将 Control UI URL 直接粘贴为 `openclaw <url>`，并在其之前或之后放置 TUI 选项，例如 `openclaw <url> --token <token> --deliver`。

裸 URL 形式接受 `--token`、`--password`、`--tls-fingerprint`、`--deliver`、`--thinking`、`--message`、`--timeout-ms` 和 `--history-limit`。 URL-valued 消息可以在任一位置工作，包括 `openclaw --message https://example.com/article <url>`。当您需要另一个 TUI 选项时，请使用 `openclaw tui <url>`； `--local`、`--url` 和 `--session` 与会话 URL 冲突。

相关指南：[TUI](/web/tui)

## <a id="options"></a> 选项

| 标志                         | 默认值                                   | 描述                                                                        |
| ---------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| `--local`                    | `false`                                   | 在本地嵌入式 agent 运行时上运行，而不是通过 Gateway。                 |
| `--url <url>`                | 配置中的 `gateway.remote.url`          | 网关 WebSocket URL。                                                             |
| `--token <token>`            | （无）                                    | 网关令牌（如果需要）。                                                         |
| `--password <pass>`          | （无）                                    | 网关密码（如果需要）。                                                      |
| `--tls-fingerprint <sha256>` | `gateway.remote.tlsFingerprint`           | 固定 `wss://` 网关的预期 TLS 证书指纹。                |
| `--session <key>`            | `main`（或当作用域为 global 时为 `global`） | 会话键。在 agent 工作区内，它会自动选择该 agent，除非前缀指定。 |
| `--deliver`                  | `false`                                   | 通过已配置的渠道传递 assistant 回复。                             |
| `--thinking <level>`         | （模型默认值）                           | Thinking 级别覆盖。                                                           |
| `--message <text>`           | （无）                                    | 连接后发送初始消息。                                          |
| `--timeout-ms <ms>`          | `agents.defaults.timeoutSeconds`          | agent 超时。无效值会记录警告并被忽略。                       |
| `--history-limit <n>`        | `200`                                     | 连接时要加载的历史记录条目数。                                                 |

别名：`openclaw chat` 和 `openclaw terminal` 会以隐含的 `--local` 调用此命令。

## <a id="notes"></a> 说明

- `--local` 不能与 `--url`、`--token`、`--password` 或 `--tls-fingerprint` 结合使用。
- 只能传入一个 Gateway 目标。URL 目标不能与 `--url` 结合使用，任何位置目标都不能与 `--session` 或本地模式结合使用。
- A URL 或主机目标绝不会重复使用已配置的凭据或 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。它使用存储的设备令牌来获取确切的网关源，或显式的 `--token`/`--password` 凭据。第一次联系时，传递其中一个凭据一次，批准该网关的 Control UI 中的配对请求，然后重试；请参阅 [Devices](/cli/devices)。
- Session URL 必须保持无凭据。用户信息和敏感查询或片段参数（例如 `token` 和 `password`）将被拒绝。
- 短引用会通过 Gateway 解析。如果短引用存在歧义，CLI 会打印候选名称和更长的 ID 前缀，但不会连接到任何会话。
- 在没有 URL/host 目标或显式 `--url` 的情况下，`tui` 会尽可能解析配置的网关身份验证 SecretRefs 以获得 token/password 身份验证（`env`/`file`/`exec`/`store` 提供程序）。
- 当配置的远程网关位于身份感知代理后面时，`tui` 解析 `gateway.remote.edgeAuth` SecretInputs 并仅将这些标头发送到该配置​​的网关范围。 URL 或其他来源的主机目标永远不会继承它们。
- 在没有显式 URL 或端口的情况下，`tui` 会遵循运行中 Gateway 记录的活动本地 Gateway 端口。显式 `--url`、`OPENCLAW_GATEWAY_URL`、`OPENCLAW_GATEWAY_PORT` 和远程 Gateway 配置具有更高优先级。
- 由于没有明确的目标，也没有运行本地网关，`tui` 在连接之前停止并指向 `openclaw chat`，而不是请求令牌。本地网关以自动生成的令牌对 CLI 启动。节点主机没有本地网关：其配对具有节点角色，因此操作员与其网关的聊天使用 `openclaw tui <Gateway URL>` 与 `--token` 或 `--password` 一次，再加上一次性配对批准。
- 从配置的代理工作区目录内部启动，TUI 自动选择该代理作为会话密钥默认值（除非 `--session` 明确为 `agent:<id>:...`）。
- 本地模式直接使用嵌入式代理运行时。大多数本地工具都可以使用，但仅网关功能不可用。
- 本地模式要求独占拥有已配置的状态目录。当 Gateway 或其他内嵌写入程序拥有该状态时，它会拒绝启动；不使用 `--local` 以使用活动 Gateway，或先使用 `openclaw gateway stop` 停止它。
- 本地模式会将 `/auth [provider]` 添加到 TUI 命令界面。
- 插件批准门控在本地模式下仍然适用：需要批准的工具会在终端中提示进行决策，不会静默自动批准。
- [`ask_user` 问题](/web/tui#questions) 在两种模式下均显示为交互式提示。 Esc 折叠提示而不回答； `/question` 重新打开它。
- Gateway 模式接受带有只读允许主机列表的屏蔽输入中的 [`secrets`](/tools/secrets) 请求。本地模式无法满足存储绑定的请求；将 `openclaw secrets store` 或 Control UI 与正在运行的网关结合使用。
- 会话[目标](/tools/goal)会显示在页脚中，并可使用 `/goal` 进行管理。

## <a id="session-target-errors"></a> 会话目标错误

| 失败                                    | 恢复                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gateway 早于短链接解析功能 | 从该 Gateway 的 Control UI 复制完整的会话密钥。                                                                                        |
| 会话缺失或短引用不明确     | 对于configured/local网关，运行`openclaw sessions list`；对于 URL/host 目标，请在该网关的 Control UI 中选择更长或完整的密钥。 |
| Gateway 无法访问                        | 错误信息会指出所选源。对于 `*.ts.net` 主机，连接 Tailscale，并确认 Gateway 在 tailnet 上可访问。               |
| 身份感知代理拒绝升级  | 为已配置的远程网关配置`gateway.remote.edgeAuth`；该错误包括相关的远程访问文档链接。                  |
| 已存储的设备令牌已撤销或轮换     | 使用 `openclaw devices rotate --device <deviceId> --role operator` 轮换令牌，然后重新连接。                                                    |
| TLS 证书固定不匹配               | 原始 TLS 指纹错误会原样传递；请在重试前验证已配置的或显式指定的固定值。                              |

## <a id="examples"></a> 示例

```bash
openclaw chat
openclaw tui --local
openclaw tui
openclaw tui https://gateway.example/dashboard/main/movies-a1166b81
openclaw https://gateway.example/dashboard/main/movies-a1166b81 --token <token>
openclaw tui movies-a1166b81
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
openclaw chat --message "Compare my config to the docs and tell me what to fix"
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```

## <a id="config-repair-loop"></a> 配置修复循环

使用本地模式，让嵌入式代理检查当前配置，将其与文档进行比较，并帮助在同一个终端中修复它。

如果 `openclaw config validate` 已经失败，请先运行 `openclaw configure` 或 `openclaw doctor --fix`；`openclaw chat` 不会绕过无效配置保护。

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

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [TUI](/web/tui)
- [控制 UI URL](/web/urls)
- [设备](/cli/devices)
- [目标](/tools/goal)
- [`openclaw attach`](/cli/attach) — 使用临时会话范围网关 MCP 授权启动 Claude Code
- [`openclaw resume`](/cli/resume) — 将此 TUI 附加到现有网关会话
