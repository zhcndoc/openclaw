---
summary: "CLI `openclaw directory` 的参考（自我、同行、团体）"
read_when:
  - "您想要查找频道的 contacts/groups/self id"
  - "你正在开发一个频道目录适配器"
title: "目录"
---

# `openclaw directory`

目录查找支持它们的频道：contacts/peers、组和“我”（自我）。

结果旨在粘贴到其他命令中，尤其是 `openclaw message send --target ...`。

## <a id="common-flags"></a> 常用标志

- `--channel <name>`：通道 ID 或别名。配置多个通道时需要，仅配置一个通道时自动选择。
- `--account <id>`：账户 id（默认：频道默认值）
- `--json`：输出JSON
- `--limit <n>`：peers/groups/members 列表的正整数上限

省略 `--channel` 以自动选择唯一配置的通道。在命令引导和目录设置或查找之前，在解析选项时，显式为空和仅包含空格的值会失败，并显示 `--channel must not be blank`。传递未设置的 shell 变量的脚本必须省略该标志以请求自动选择。

省略 `--account` 以选择通道默认值。在帐户设置或查找之前，显式为空和仅包含空格的帐户值会失败，并显示 `--account must not be blank`。

`--limit` 需要一个正整数。省略 `--limit` 以使用所选通道插件的默认值。显式为空和仅包含空格的值将被拒绝。

默认输出在表中呈现 ID 和名称。空列表结果命名所查询的频道和帐户。 JSON 列表输出使用空数组 （`[]`）。故障退出非零并在 JSON 模式下使用标准 `{ "ok": false, "error": { "type": "cli_error", "message": "..." } }` 包络。

## <a id="notes"></a> 说明

- 对于许多渠道，结果是由配置支持的（允许列表 / 已配置的组），而不是实时的提供方目录。
- 在实时查找之前，OpenClaw 仅为所选通道和帐户解析配置的 SecretRefs。已解析的凭据仅在运行时有效。插件安装和自动启用写入会保留创作的引用，而不会保留运行时默认值。
- WhatsApp 群组列表已上线。网关查找重用其拥有的连接。仅当没有其他进程拥有该帐户时，独立命令才会打开链接会话。否则，它会报告实时组不可用。
- 已安装的通道插件可能缺少目录支持。在这种情况下，该命令会报告不受支持的操作。它不会尝试重新安装或升级插件来添加支持。

## <a id="using-results-with-message-send"></a> 与 `message send` 结合使用结果

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## <a id="id-formats-by-channel"></a> 各渠道的 ID 格式

| 渠道                             | 目标 id 格式                                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp                            | `+15551234567` （DM）、`1234567890-1234567890@g.us`（团体）、`120363123456789@newsletter`（Channel/Newsletter，仅限出站） |
| Signal                              | 配置的别名解析为 E.164/UUID DM 目标或 `group:<id>` 组目标                                           |
| Telegram                            | `@username` 或数字聊天 id；群组使用数字 id                                                                      |
| Slack                               | `user:U…` 和 `channel:C…`                                                                                                  |
| Discord                             | `user:<id>` 和 `channel:<id>`                                                                                              |
| Matrix（插件）                     | `user:@user:server`、`room:!roomId:server` 或 `#alias:server`                                                              |
| Microsoft Teams（插件）            | `user:<id>` 和 `conversation:<id>`                                                                                         |
| Zalo（插件）                       | 用户 id（Bot API）                                                                                                           |
| Zalo 个人 / `zalouser`（插件） | 线程 ID （DM/group），来自 `zca`（`me`、`friend list`、`group list`）                                                        |

## <a id="self-(%22me%22)"></a><a id="self-me"></a> 自己（“我”）

```bash
openclaw directory self --channel zalouser
```

通道可以合法地不返回任何自身身份。这是成功的空结果（退出代码 `0`），而不是失败的查找。没有自我解析器的频道报告该频道未公开自我身份，但不建议进行帐户故障排除：

```json
{
  "status": "unavailable",
  "channel": "telegram",
  "accountId": "default",
  "reason": "self-identity-unsupported"
}
```

当通道实现自查找但不返回身份时，文本输出会命名通道和帐户，并建议检查其配置和身份验证。 JSON 调用者可以通过其原因来区分该情况：

```json
{
  "status": "unavailable",
  "channel": "msteams",
  "accountId": "default",
  "reason": "plugin-returned-no-self-identity"
}
```

## <a id="peers-(contacts%2Fusers)"></a><a id="peers-contacts/users"></a> 同行 （contacts/users）

```bash
openclaw directory peers list --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory peers list --channel zalouser --limit 50
```

## <a id="groups"></a> 群组

```bash
openclaw directory groups list --channel zalouser
openclaw directory groups list --channel zalouser --query "work"
openclaw directory groups members --channel zalouser --group-id <id>
```

`groups members` 需要非空白 `--group-id`。在插件设置或查找之前，空或仅包含空格的 ID 会失败。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
