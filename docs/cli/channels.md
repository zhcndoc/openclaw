---
summary: "CLI 参考：`openclaw channels`（账户、状态、登录/登出、日志）"
read_when:
  - 你想添加/移除频道账户（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage/Matrix）
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
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## 状态 / 能力 / 解析 / 日志

- `channels status`：`--probe`、`--timeout <ms>`、`--json`
- `channels capabilities`：`--channel <name>`、`--account <id>`（仅可与 `--channel` 一起使用）、`--target <dest>`、`--timeout <ms>`、`--json`
- `channels resolve`：`<entries...>`、`--channel <name>`、`--account <id>`、`--kind <auto|user|group>`、`--json`
- `channels logs`：`--channel <name|all>`、`--lines <n>`、`--json`

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

`channels remove` 仅对已安装/已配置的频道插件生效。对于可安装目录中的频道，请先使用 `channels add`。
对于基于运行时的频道插件，`channels remove` 还会先要求正在运行的 Gateway 停止所选账户，然后再更新配置，因此禁用或删除账户不会让旧监听器在重启前继续保持活动状态。

常见的非交互式添加入口包括：

- bot-token 频道：`--token`、`--bot-token`、`--app-token`、`--token-file`
- Signal/iMessage 传输字段：`--signal-number`、`--cli-path`、`--http-url`、`--http-host`、`--http-port`、`--db-path`、`--service`、`--region`
- Google Chat 字段：`--webhook-path`、`--webhook-url`、`--audience-type`、`--audience`
- Matrix 字段：`--homeserver`、`--user-id`、`--access-token`、`--password`、`--device-name`、`--initial-sync-limit`
- Nostr 字段：`--private-key`、`--relay-urls`
- Tlon 字段：`--ship`、`--url`、`--code`、`--group-channels`、`--dm-allowlist`、`--auto-discover-channels`
- `--use-env` 用于支持基于环境变量的默认账户认证

如果频道插件需要在基于标志的添加命令期间安装，OpenClaw 会使用该频道的默认安装来源，而不会打开交互式插件安装提示。

当你在不带标志的情况下运行 `openclaw channels add` 时，交互式向导可能会提示：

- 所选频道下每个账户的账户 ID
- 这些账户的可选显示名称
- `Bind configured channel accounts to agents now?`

如果你确认立即绑定，向导会询问哪个 agent 应拥有每个已配置的频道账户，并写入账户范围的路由绑定。

你也可以稍后使用 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 管理相同的路由规则（参见 [agents](/cli/agents)）。

当你向仍在使用单账户顶层设置的频道添加非默认账户时，OpenClaw 会在写入新账户之前，将账户范围的顶层值提升到该频道的账户映射中。大多数频道会把这些值放入 `channels.<channel>.accounts.default`，但打包频道可以保留现有的、匹配的已提升账户。Matrix 是当前示例：如果已经存在一个命名账户，或者 `defaultAccount` 指向一个现有的命名账户，则提升会保留该账户，而不是创建新的 `accounts.default`。

路由行为保持一致：

- 现有的仅频道绑定（没有 `accountId`）仍然会匹配默认账户。
- 在非交互模式下，`channels add` 不会自动创建或重写绑定。
- 交互式设置可以选择性地添加账户范围的绑定。

如果你的配置已经处于混合状态（存在命名账户，同时顶层单账户值仍然保留），请运行 `openclaw doctor --fix`，把账户范围的值移动到该频道所选的已提升账户中。大多数频道会提升到 `accounts.default`；Matrix 则可以保留现有的命名/默认目标。

## 登录和登出（交互式）

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

- `channels login` 支持 `--verbose`。
- 当只配置了一个受支持的登录目标时，`channels login` 和 `logout` 可以推断频道。
- `channels logout` 在可达时优先使用实时 Gateway 路径，因此登出会在清除频道认证状态之前停止任何活动监听器。如果本地 Gateway 不可达，它会回退到本地认证清理。
- 请在 gateway 主机上的终端中运行 `channels login`。Agent `exec` 会阻止这种交互式登录流程；如果可用，应在聊天中使用频道原生的 agent 登录工具，例如 `whatsapp_login`。

## 故障排查

- 运行 `openclaw status --deep` 进行广泛探测。
- 使用 `openclaw doctor` 获取引导式修复。
- `openclaw channels list` 输出 `Claude: HTTP 403 ... user:profile` → 使用统计快照需要 `user:profile` 作用域。请使用 `--no-usage`，或者提供 claude.ai 会话密钥（`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`），或者通过 Claude CLI 重新认证。
- 当 gateway 不可达时，`openclaw channels status` 会退回到仅基于配置的摘要。如果某个受支持的频道凭据通过 SecretRef 配置但在当前命令路径中不可用，它会将该账户报告为已配置并附带降级说明，而不是将其显示为未配置。

## 能力探测

获取提供商能力提示（在可用时包含 intents/scopes）以及静态功能支持：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

说明：

- `--channel` 是可选的；省略它可列出所有频道（包括扩展）。
- `--account` 仅在与 `--channel` 一起使用时有效。
- `--target` 接受 `channel:<id>` 或原始数字频道 ID，并且仅适用于 Discord。
- 探测是提供商特定的：Discord intents + 可选频道权限；Slack bot + user scopes；Telegram bot 标志 + webhook；Signal daemon 版本；Microsoft Teams app token + Graph roles/scopes（在已知情况下会标注）。没有探测的频道会报告 `Probe: unavailable`。

## 将名称解析为 ID

使用提供商目录将频道/用户名称解析为 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

说明：

- 使用 `--kind user|group|auto` 强制指定目标类型。
- 解析在多个条目共享同名时会优先选择活动匹配项。
- `channels resolve` 是只读的。如果所选账户通过 SecretRef 配置但该凭据在当前命令路径中不可用，命令会返回带说明的降级未解析结果，而不是中止整个运行。
- `channels resolve` 不会安装频道插件。对于可安装目录中的频道，请先使用 `channels add --channel <name>` 再解析名称。

## 相关内容

- [CLI 参考](/cli)
- [频道概览](/channels)
