---
summary: "`openclaw directory` 的命令行参考（自我、联系人、群组）"
read_when:
  - 你想查询频道的联系人/群组/自我 ID
  - 你正在开发频道目录适配器
title: "目录"
---

# `openclaw directory`

支持目录查找的频道的目录查询（联系人/用户，群组，以及"我"）。

## 通用选项

- `--channel <name>`：频道 ID 或别名（当配置多个频道时必需；仅配置一个时自动选择）
- `--account <id>`：账户 ID（默认：频道默认账户）
- `--json`：输出 JSON 格式

## 说明

- `directory` 用于帮助你查找可以粘贴到其他命令中的 ID（尤其是 `openclaw message send --target ...`）。
- 许多频道的结果是基于配置的（允许列表 / 配置的群组），而非实时的提供者目录。
- 默认输出为用制表符分隔的 `id`（有时还有 `name`）；用于脚本时请使用 `--json`。

## 在 `message send` 中使用查询结果

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## ID 格式（按频道分类）

- WhatsApp：`+15551234567`（私聊），`1234567890-1234567890@g.us`（群组）
- Telegram：`@username` 或数字聊天 ID；群组为数字 ID
- Slack：`user:U…` 和 `channel:C…`
- Discord：`user:<id>` 和 `channel:<id>`
- Matrix（插件）：`user:@user:server`、`room:!roomId:server` 或 `#alias:server`
- Microsoft Teams（插件）：`user:<id>` 和 `conversation:<id>`
- Zalo（插件）：用户 ID（Bot API）
- Zalo Personal / `zalouser`（插件）：来自 `zca` 的线程 ID（私聊/群聊）（"我"、"好友列表"、"群组列表"）

## Self（"我"）

```bash
openclaw directory self --channel zalouser
```

## 联系人（用户）

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
