---
summary: "`openclaw channels` 的命令行参考（账户、状态、登录/登出、日志）"
read_when:
  - 你想添加/移除渠道账户（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage/Matrix）
  - 你想检查渠道状态或查看渠道日志
title: "渠道"
---

# `openclaw channels`

管理网关上的聊天渠道账户及其运行时状态。

相关文档：

- Channel guides: [Channels](/channels)
- Gateway configuration: [Configuration]

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

- `channels status`: `--probe`, `--timeout <ms>`, `--json`
- `channels capabilities`: `--channel <name>`, `--account <id>`（仅与 `--channel` 一起使用），`--target <dest>`, `--timeout <ms>`, `--json`
- `channels resolve`: `<entries...>`, `--channel <name>`, `--account <id>`, `--kind <auto|user|group>`, `--json`
- `channels logs`: `--channel <name|all>`, `--lines <n>`, `--json`

`channels status --probe` 是实时路径：在可访问的网关上，它会运行每个账户的 `probeAccount` 和可选的 `auditAccount` 检查，因此输出可以包括传输状态以及探测结果，如 `works`、`probe failed`、`audit ok` 或 `audit failed`。如果网关无法访问，`channels status` 将回退到仅配置摘要，而不是实时探测输出。

## 添加 / 移除账户

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

<Tip>
`openclaw channels add --help` 会显示每个渠道的标志（token、private key、app token、signal-cli 路径等）。
</Tip>

常见的非交互式添加方式包括：

- bot-token 渠道：`--token`, `--bot-token`, `--app-token`, `--token-file`
- Signal/iMessage 传输字段：`--signal-number`, `--cli-path`, `--http-url`, `--http-host`, `--http-port`, `--db-path`, `--service`, `--region`
- Google Chat 字段：`--webhook-path`, `--webhook-url`, `--audience-type`, `--audience`
- Matrix 字段：`--homeserver`, `--user-id`, `--access-token`, `--password`, `--device-name`, `--initial-sync-limit`
- Nostr 字段：`--private-key`, `--relay-urls`
- Tlon 字段：`--ship`, `--url`, `--code`, `--group-channels`, `--dm-allowlist`, `--auto-discover-channels`
- `--use-env` 用于支持默认账户的环境变量认证

如果在基于标志的添加命令期间需要安装渠道插件，OpenClaw 会使用该渠道的默认安装源，而不会打开交互式插件安装提示。

当你在不带标志的情况下运行 `openclaw channels add` 时，交互式向导可能会提示：

- 每个选定渠道的账户 ID
- 这些账户的可选显示名称
- `是否现在绑定已配置的渠道账户到代理？`

如果你确认立即绑定，向导会询问每个配置账户应归属哪个代理，并写入账户级别的路由绑定。

你也可以之后使用 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 管理相同的路由规则（参见 [代理](/cli/agents)）。

当您向仍在使用单账户顶层设置的渠道添加非默认账户时，OpenClaw 会在写入新账户之前将账户范围的顶层值提升到渠道的账户映射中。大多数渠道将这些值放在 `channels.<channel>.accounts.default` 中，但捆绑渠道可以保留现有的匹配提升账户。Matrix 是当前的示例：如果已存在一个命名账户，或者 `defaultAccount` 指向现有的命名账户，提升操作会保留该账户，而不是创建新的 `accounts.default`。

路由行为保持一致：

- 现有的仅渠道绑定（无 `accountId`）继续匹配默认账户。
- 非交互模式下，`channels add` 不会自动创建或重写绑定。
- 交互式设置可选择添加账户范围的绑定。

如果您的配置已经处于混合状态（存在命名账户且仍设置了顶层单账户值），运行 `openclaw doctor --fix` 将账户范围的值移动到为该渠道选择的提升账户中。大多数渠道提升到 `accounts.default`；Matrix 可以保留现有的命名/默认目标。

## 登录和登出（交互式）

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

- `channels login` 支持 `--verbose`。
- 当仅配置了一个支持的登录目标时，`channels login` 和 `logout` 可以推断渠道。

## 故障排除

- 运行 `openclaw status --deep` 进行广泛探测。
- 使用 `openclaw doctor` 进行引导式修复。
- `openclaw channels list` 打印 `Claude: HTTP 403 ... user:profile` → 使用快照需要 `user:profile` 权限范围。使用 `--no-usage`，或提供 claude.ai 会话密钥（`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`），或通过 Claude CLI 重新认证。
- 当网关无法访问时，`openclaw channels status` 会回退到仅配置摘要。如果支持的渠道凭证是通过 SecretRef 配置的，但在当前命令路径中不可用，它会将该账户报告为已配置但带有降级说明，而不是显示为未配置。

## 能力探测

获取提供者能力提示（意图/范围，如有）及静态功能支持：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

说明：

- `--channel` 是可选的；省略它以列出每个渠道（包括扩展）。
- `--account` 仅与 `--channel` 一起有效。
- `--target` 接受 `channel:<id>` 或原始数字渠道 ID，仅适用于 Discord。
- 探测是提供者特定的：Discord 意图 + 可选渠道权限；Slack 机器人 + 用户范围；Telegram 机器人标志 + webhook；Signal 守护进程版本；Microsoft Teams 应用令牌 + Graph 角色/范围（已知处注明）。没有探测的渠道报告 `Probe: unavailable`。

## 名称解析为 ID

使用提供者目录将渠道/用户名称解析为 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

说明：

- 使用 `--kind user|group|auto` 强制目标类型。
- 当多个条目共享同名时，解析优先选择活动匹配项。
- `channels resolve` 是只读的。如果所选账户通过 SecretRef 配置但该凭证在当前命令路径中不可用，命令会返回带有说明的降级未解析结果，而不是中止整个运行。

## 相关内容

- [CLI 参考](/cli)
- [渠道概览](/channels)
