---
summary: "openclaw channels 的 CLI 参考（账户、状态、能力、resolve、日志、登录/注销）"
read_when:
  - 你想添加或移除频道账户（Discord、Google Chat、iMessage、Matrix、Signal、Slack、Telegram、WhatsApp 等）
  - 你想检查频道状态或跟踪频道日志
title: "频道"
---

# `openclaw channels`

在 Gateway 上管理聊天频道账户及其运行时状态。

相关文档：

- 频道指南：[Channels](/channels)
- Gateway 配置：[Configuration](/gateway/configuration)

## 常用命令

```bash
openclaw channels list
openclaw channels list --all
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

`channels list` 仅显示聊天频道：默认显示已配置的账户，并按账户显示 `installed`、`configured` 和 `enabled` 状态标签（`--json` 用于机器输出）。传入 `--all` 还会显示尚未配置账户的内置频道，以及尚未下载到本地的可安装目录频道。提供方认证和模型使用情况在其他地方：`openclaw models auth list` 用于提供方认证配置文件，`openclaw status` 或 `openclaw models list` 用于查看使用量/配额。

## 状态 / 能力 / 解析 / 日志

- `channels status`: `--channel <name>`, `--probe`, `--timeout <ms>` (默认 `10000`), `--json`
- `channels capabilities`: `--channel <name>`, `--account <id>` (需要 `--channel`), `--target <dest>` (需要 `--channel`), `--timeout <ms>` (默认 `10000`，上限 `30000`), `--json`
- `channels resolve <entries...>`: `--channel <name>`, `--account <id>`, `--kind <auto|user|group>` (默认 `auto`), `--json`
- `channels logs`: `--channel <name|all>` (默认 `all`), `--lines <n>` (默认 `200`), `--json`

`channels status --probe` 是实时路径：在可达的 gateway 上，它会对每个账户运行
`probeAccount` 和可选的 `auditAccount` 检查，因此输出可能包含传输
状态以及诸如 `works`、`probe failed`、`audit ok` 或 `audit failed` 之类的探测结果。
如果 gateway 不可达，`channels status` 会退回到仅基于配置的摘要，
而不是实时探测输出。

不要使用 `openclaw sessions`、Gateway `sessions.list` 或 agent 的
`sessions_list` 工具作为频道 socket 健康状态信号。这些界面报告的是
已存储的会话行，而不是提供商运行时状态。Discord 提供商重启后，
一个已连接但安静的账户可能是健康的，但在下一次入站或出站会话事件之前，
不会出现任何 Discord 会话行。

## 添加 / 移除账户

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

<Tip>
`openclaw channels add --help` 会显示各频道专用的标志（token、private key、app token、signal-cli 路径等）。
</Tip>

`channels remove` 仅对已安装/已配置的频道插件生效。对于可安装的目录频道，请先使用 `channels add`。如果不带 `--delete`，它会询问是否禁用该账户并保留其配置；`--delete` 则会在不提示的情况下移除配置项。
对于运行时支持的频道插件，`channels remove` 还会先请求正在运行的 Gateway 在更新配置之前停止所选账户，因此禁用或删除账户不会让旧监听器一直保持活动状态直到重启。

跨频道共享的非交互式添加标志：`--account <id>`、`--name <name>`、`--token`、`--token-file`、`--bot-token`、`--app-token`、`--secret`、`--secret-file`、`--password`、`--cli-path`、`--url`、`--base-url`、`--http-url`、`--auth-dir` 和 `--use-env`（基于环境变量的认证，仅默认账户，在支持时可用）。频道特定标志包括：

| Channel     | Flags                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| Google Chat | `--webhook-path`、`--webhook-url`、`--audience-type`、`--audience`                                   |
| iMessage    | `--cli-path`、`--db-path`、`--service`、`--region`                                                   |
| Matrix      | `--homeserver`、`--user-id`、`--access-token`、`--password`、`--device-name`、`--initial-sync-limit` |
| Nostr       | `--private-key`、`--relay-urls`                                                                      |
| Signal      | `--signal-number`、`--cli-path`、`--http-url`、`--http-host`、`--http-port`                          |
| Tlon        | `--ship`、`--url`、`--code`、`--group-channels`、`--dm-allowlist`、`--auto-discover-channels`        |
| WhatsApp    | `--auth-dir`                                                                                         |

如果频道插件需要在基于标志的添加命令期间安装，OpenClaw 会使用该频道的默认安装来源，而不会打开交互式插件安装提示。

当你在不带标志的情况下运行 `openclaw channels add` 时，交互式向导可能会提示：

- 所选频道的账户 ID
- 这些账户的可选显示名称
- `现在将这些频道账户路由给 agents 吗？`

如果你确认立即绑定，向导会询问哪个 agent 应拥有每个已配置的频道账户，并写入账户范围的路由绑定。

你也可以稍后使用 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 管理相同的路由规则（参见 [agents](/cli/agents)）。

当你向仍在使用单账户顶层设置的频道添加非默认账户时，OpenClaw 会先把这些顶层值提升到该频道的账户映射中，然后再写入新账户。提升时，如果该频道恰好已有一个命名账户，或者 `defaultAccount` 指向其中一个，就会重用现有的命名账户；否则，这些值会落到 `channels.<channel>.accounts.default`。

路由行为保持一致：

- 现有的仅频道绑定（没有 `accountId`）仍然会匹配默认账户。
- 在非交互模式下，`channels add` 不会自动创建或重写绑定。
- 交互式设置可以选择性地添加账户范围的绑定。

如果你的配置已经处于混合状态（存在命名账户，同时顶层单账户值仍然设置着），请运行 `openclaw doctor --fix`，将账户范围的值移动到为该频道选定的已提升账户中。

## 登录和登出（交互式）

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

- `channels login` 支持 `--account <id>` 和 `--verbose`；`channels logout` 支持 `--account <id>`。
- 当只有一个已配置的 channel 支持该操作时，`channels login` 和 `logout` 可以推断出 channel；如果有多个，请传入 `--channel`。
- `channels logout` 在可达时优先使用实时 Gateway 路径，因此登出会在清除 channel 认证状态之前停止任何活动的监听器。如果本地 Gateway 不可达，则回退到本地认证清理；在 `gateway.mode: "remote"` 下，Gateway 错误会直接使命令失败。
- 登录成功后，CLI 会请求可达的本地 Gateway 启动该账户；在 remote 模式下，它会在本地保存认证信息，并提示远程运行时未重启。
- 请在 gateway 主机上的终端中运行 `channels login`。Agent `exec` 会阻止此交互式登录流程；如果可用，应在聊天中使用 channel 原生的 agent 登录工具，例如 `whatsapp_login`。

## 故障排查

- 运行 `openclaw status --deep` 进行广泛探测。
- 使用 `openclaw doctor` 获取引导式修复。
- 当网关不可达时，`openclaw channels status` 会回退到仅基于配置的摘要。如果通过 SecretRef 配置了受支持的渠道凭据，但在当前命令路径中不可用，它会将该账户报告为已配置并附带降级说明，而不是显示为未配置。

## 能力探测

获取提供商能力提示（在可用时包含 intents/scopes）以及静态功能支持：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

说明：

- `--channel` 是可选的；省略它可列出所有频道（包括由插件提供的频道）。
- `--account` 仅在与 `--channel` 一起使用时有效。
- `--target` 接受 `channel:<id>` 或原始的数字频道 ID，并且仅适用于 Discord。对于 Discord 语音频道，权限检查会标记缺少的 `ViewChannel`、`Connect`、`Speak`、`SendMessages` 和 `ReadMessageHistory`。
- 探测是特定于提供商的：Discord 机器人身份 + intents 以及可选的频道权限；Slack 机器人 + 用户 scopes；Telegram 机器人标志 + webhook；Signal 守护进程版本；Microsoft Teams 应用令牌 + Graph 角色/scopes（在已知情况下会做注释）。没有探测的频道会报告 `Probe: unavailable`。

## 将名称解析为 ID

使用提供商目录将频道/用户名称解析为 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

说明：

- 使用 `--kind user|group|auto` 强制指定目标类型。
- 当多个条目共享同名时，解析会优先选择活动匹配项。
- `channels resolve` 是只读的。如果所选账户通过 SecretRef 配置但该凭据在当前命令路径中不可用，命令会返回带说明的降级未解析结果，而不是中止整个运行。
- `channels resolve` 不会安装频道插件。对于可安装目录中的频道，请先使用 `channels add --channel <name>` 再解析名称。

## 相关内容

- [CLI 参考](/cli)
- [频道概览](/channels)
