---
summary: "openclaw directory 目录的 CLI 参考（自己、联系人、群组）"
read_when:
  - 你想查找某个频道的联系人/群组/自己的 ID
  - 你正在开发一个频道目录适配器
title: "目录"
---

# `openclaw directory`

适用于支持目录查询的频道的目录查找（联系人/对等方、群组，以及“我”）。

## 常用标志

- `--channel <name>`：频道 ID/别名（配置了多个频道时必填；仅配置一个频道时自动使用）
- `--account <id>`：账户 ID（默认：频道默认值）
- `--json`：以 JSON 输出

## 说明

- `directory` 用于帮助你找到可以粘贴到其他命令中的 ID（尤其是 `openclaw message send --target ...`）。
- 对于许多频道，结果是基于配置的（允许列表 / 已配置的群组），而不是来自实时提供者目录。
- 已安装的频道插件仍然可能省略目录支持；在这种情况下，命令会报告不受支持的目录操作，而不是重新安装插件。
- 默认输出为由制表符分隔的 `id`（有时还有 `name`）；脚本使用请加 `--json`。

## 与 `message send` 结合使用结果

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## ID 格式（按频道）

- WhatsApp: `+15551234567` (DM), `1234567890-1234567890@g.us` (group), `120363123456789@newsletter` (Channel/Newsletter outbound target)
- Telegram: `@username` 或数字聊天 ID；群组为数字 ID
- Slack: `user:U…` 和 `channel:C…`
- Discord: `user:<id>` 和 `channel:<id>`
- Matrix (plugin): `user:@user:server`, `room:!roomId:server`, or `#alias:server`
- Microsoft Teams (plugin): `user:<id>` 和 `conversation:<id>`
- Zalo (plugin): user id（Bot API）
- Zalo Personal / `zalouser` (plugin): 来自 `zca` 的 thread id（DM/group）（`me`、`friend list`、`group list`）

## 自己（“我”）

```bash
openclaw directory self --channel zalouser
```

## 联系人（联系人/用户）

```bash
openclaw directory peers list --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory peers list --channel zalouser --limit 50
```

## 群组

```bash
openclaw directory groups list --channel zalouser
openclaw directory groups list --channel zalouser --query "work"
openclaw directory groups members --channel zalouser --group-id <id>
```

## 相关

- [CLI 参考](/cli)
