---
summary: "`openclaw users` 的 CLI 参考（配置文件、电子邮件别名和重复合并）"
read_when:
  - "您需要找到耐用的网关配置文件 ID"
  - "您想要链接电子邮件别名或合并重复的个人资料"
title: "用户"
---

# `openclaw users`

通过网关 RPC API 管理持久网关配置文件。这些个人资料可以识别人员；它们与 CLI 的 `--profile` 选项分开，该选项选择隔离的 OpenClaw 配置和状态目录。

## <a id="common-options"></a> 常用选项

- `--url <url>`：网关WebSocket URL；配置时默认为 `gateway.remote.url`。
- `--token <token>`：网关令牌（如果需要）。
- `--timeout <ms>`：RPC 超时（以毫秒为单位）；默认为 `10000`。
- `--json`：将网关结果打印为 JSON。

将这些选项放在子命令后面。

## <a id="list-profiles"></a> 列出配置文件

```bash
openclaw users list
openclaw users list --json
```

需要 `operator.read`。人工输出列出了每个配置文件的 ID、显示名称和电子邮件别名。链接或合并配置文件时使用持久 ID。

## <a id="link-an-email-alias"></a> 链接电子邮件别名

```bash
openclaw users link-email person@example.com --to <profile-id>
```

需要 `operator.admin`。调用 `users.linkEmail` 将一个电子邮件别名移至目标配置文件。如果之前的配置文件丢失了最后一封电子邮件，它将合并到目标中。否则，它与其他别名仍然是一个单独的配置文件。

## <a id="merge-duplicate-profiles"></a> 合并重复的配置文件

```bash
openclaw users merge <source-profile-id> --into <target-profile-id>
openclaw users merge <source-profile-id> --into <target-profile-id> --json
```

需要 `operator.admin`。使用 `sourceProfileId` 和 `targetProfileId` 调用 `users.merge`。当两个配置文件属于同一个人并且整个源配置文件应停用时（包括当它没有电子邮件别名时），请使用此选项。

目标必须是与源不同的现有的、未合并的配置文件。共享的 **Owner** 配置文件不能在任一方向上合并。重复已完成的合并到同一目标会成功。如果源指向另一个幸存者，该命令将失败并命名该当前配置文件。

人类输出将幸存者和退休者命名为 ID。 JSON 返回 `profile`（保留的配置文件）和 `movedAliasKinds`（实际移动的别名类别）：`email`、`provider` 或 `channel`。未更改的重复会返回空列表。

幸存者保留其角色、显示名称、主要身份以及冲突的偏好和帐户选择。在现有的合并规则下，登录、频道链接和个人帐户遵循幸存者。历史保持着原来的归属；先前获得的已退休配置文件的权限不会转移。有关传输规则和个人 `USER.md` 处理，请参阅 [ 合并重复配置文件](/concepts/user-model#merging-duplicate-profiles)。
