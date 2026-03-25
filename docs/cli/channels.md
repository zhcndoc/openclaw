---
summary: "`openclaw channels` 的命令行参考（账户、状态、登录/登出、日志）"
read_when:
  - 你想添加/移除渠道账户（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage）
  - 你想检查渠道状态或查看渠道日志
title: "channels"
---

# `openclaw channels`

管理网关上的聊天渠道账户及其运行时状态。

相关文档：

- 渠道指南：[Channels](/channels/index)
- 网关配置：[Configuration](/gateway/configuration)

## 常用命令

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## 添加 / 移除账户

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

Tip: `openclaw channels add --help` 显示每个渠道的标志（token、私钥、应用令牌、signal-cli 路径等）。

当你运行 `openclaw channels add` 且不带参数时，交互式向导会提示：

- 每个选定渠道的账户 ID
- 这些账户的可选显示名称
- `是否现在绑定已配置的渠道账户到代理？`

如果你确认立即绑定，向导会询问每个配置账户应归属哪个代理，并写入账户级别的路由绑定。

你也可以之后使用 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 管理相同的路由规则（参见 [agents](/cli/agents)）。

当你给仍在使用单账户顶层设置（尚无 `channels.<channel>.accounts` 条目）的渠道添加非默认账户时，OpenClaw 会将账户范围的单账户顶层值移入 `channels.<channel>.accounts.default`，然后写入新账户。这样能在迁移到多账户结构的同时保持原有账户行为。

路由行为保持一致：

- 现有的仅渠道绑定（无 `accountId`）继续匹配默认账户。
- 非交互模式下，`channels add` 不会自动创建或重写绑定。
- 交互式设置可选择添加账户范围的绑定。

如果你的配置已经处于混合状态（存在命名账户，缺少 `default`，且顶层单账户值仍被设置），请执行 `openclaw doctor --fix` 将账户范围的值移动到 `accounts.default`。

## 登录 / 登出（交互式）

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

## 故障排查

- 运行 `openclaw status --deep` 进行全面探测。
- 使用 `openclaw doctor` 进行引导修复。
- `openclaw channels list` 出现 `Claude: HTTP 403 ... user:profile` → 使用快照需要 `user:profile` 权限。可使用 `--no-usage`，或提供 claude.ai 会话密钥（`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`），或通过 Claude Code CLI 重新认证。
- 当网关不可访问时，`openclaw channels status` 会回退到仅配置的汇总。如果通过 SecretRef 配置了支持的渠道凭证但当前命令路径无法访问，该账户会被报告为已配置但状态降级，而非显示为未配置。

## 能力探测

获取提供者能力提示（意图/范围，如有）及静态功能支持：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

说明：

- `--channel` 是可选的；省略它以列出所有渠道（包括扩展）。
- `--target` 接受 `channel:<id>` 或原始数字渠道 ID，且仅适用于 Discord。
- 探测是提供者特定的：Discord 意图 + 可选渠道权限；Slack 机器人 + 用户范围；Telegram 机器人标志 + Webhook；Signal 守护进程版本；Microsoft Teams 应用令牌 + Graph 角色/范围（已知部分带注释）。无探测的渠道报告 `Probe: unavailable`。

## 名称解析为 ID

使用提供者目录将渠道/用户名称解析为 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

说明：

- 使用 `--kind user|group|auto` 强制目标类型。
- 如果多个条目同名，会优先解析活动匹配项。
- `channels resolve` 是只读操作。如果选中的账户通过 SecretRef 配置，但当前命令路径无法访问该凭证，命令会返回带注释的降级未解析结果，而非中断整个执行。
