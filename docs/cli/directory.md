---
summary: "openclaw directory 目录的 CLI 参考（自己、联系人、群组）"
read_when:
  - 你想查找某个频道的联系人/群组/自己的 ID
  - 你正在开发一个频道目录适配器
title: "目录"
---

# `openclaw directory`

用于支持目录查询的频道进行目录查找：联系人/对等方、群组，以及“me”（自己）。

结果旨在粘贴到其他命令中，尤其是 `openclaw message send --target ...`。

## 常用标志

- `--channel <name>`：频道 id/别名（在配置了多个频道时必需；如果只配置了一个频道则自动选择）
- `--account <id>`：账户 id（默认：频道默认值）
- `--json`：输出 JSON

默认（非 JSON）输出为 `id`（有时还有 `name`），并以制表符分隔。

## 备注

- 对于许多渠道，结果是由配置支持的（允许列表 / 已配置的组），而不是实时的提供方目录。
- WhatsApp 群组列表是实时的。网关查找会复用其拥有的连接；独立命令仅在没有其他进程拥有该账户时打开关联会话，否则会报告实时群组不可用。
- 已安装的渠道插件可能不支持目录。在这种情况下，命令会报告该操作不受支持；它不会尝试重新安装或升级插件来添加支持。

## 与 `message send` 结合使用结果

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## 各渠道的 ID 格式

| 渠道                                | 目标 id 格式                                                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp                            | `+15551234567`（私信），`1234567890-1234567890@g.us`（群组），`120363123456789@newsletter`（频道/通讯，仅出站） |
| Signal                              | 已配置的别名会解析为 E.164/UUID 的私信目标或 `group:<id>` 群组目标                                                         |
| Telegram                            | `@username` 或数字聊天 id；群组使用数字 id                                                                                 |
| Slack                               | `user:U…` 和 `channel:C…`                                                                                                  |
| Discord                             | `user:<id>` 和 `channel:<id>`                                                                                              |
| Matrix (plugin)                     | `user:@user:server`、`room:!roomId:server` 或 `#alias:server`                                                              |
| Microsoft Teams (plugin)            | `user:<id>` 和 `conversation:<id>`                                                                                         |
| Zalo (plugin)                       | 用户 id（Bot API）                                                                                                         |
| Zalo Personal / `zalouser` (plugin) | 线程 id（私信/群组），来自 `zca`（`me`、`friend list`、`group list`）                                                        |

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
