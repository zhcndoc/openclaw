---
summary: "`openclaw pairing` 的 CLI 参考（批准/列出配对请求）"
read_when:
  - 你正在使用配对模式私信，并且需要批准发送者
title: "配对"
---

# `openclaw pairing`

批准或查看支持配对的频道的 DM 配对请求（仅聊天 DM - 节点/设备配对使用 `openclaw devices`）。

相关：[配对流程](/channels/pairing)

相同的待处理请求也可以在 Control UI 中的 **Settings →
Channels → DM access requests** 下查看。Control UI 支持批准、可选的请求者通知以及忽略。忽略会移除当前请求，但不会永久阻止发送者。

## 命令

```bash
openclaw pairing list telegram
openclaw pairing list --channel telegram --account work
openclaw pairing list telegram --json

openclaw pairing approve <code>
openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify
```

## `pairing list`

列出某个通道的待处理配对请求。

| 选项                  | 描述                           |
| ----------------------- | ------------------------------------- |
| `[channel]`             | 位置参数通道 ID                 |
| `--channel <channel>`   | 显式通道 ID                   |
| `--account <accountId>` | 多账户通道的账户 ID |
| `--json`                | 机器可读输出               |

如果配置了多个支持配对的通道，请通过位置参数或 `--channel` 传入一个通道。扩展通道只要通道 ID 有效即可使用。

## `pairing approve`

批准一个待处理的配对代码，并允许该发送者。

用法：

- `openclaw pairing approve <channel> <code>`
- `openclaw pairing approve --channel <channel> <code>`
- 当只配置了一个支持配对的通道时，使用 `openclaw pairing approve <code>`

选项：`--channel <channel>`、`--account <accountId>`、`--notify`（在同一通道上向请求者发送确认回复）。

### 所有者引导

如果你在批准配对代码时 `commands.ownerAllowFrom` 为空，CLI 也会将已批准的发送者记录为命令所有者，使用类似 `telegram:123456789` 的按通道作用域条目。这只会引导第一个所有者——后续的配对批准不会替换或扩展 `commands.ownerAllowFrom`。Control UI 将此权限提升显示为一个单独的、受 `operator.admin` 保护的复选框，而不是自动应用它。

该命令所有者是允许运行仅所有者可用命令并批准危险操作的人类操作员账户，例如 `/diagnostics`、`/export-session`、`/export-trajectory`、`/config` 和 exec 批准。配对只允许发送者与代理通信；它本身不会授予除这次一次性引导之外的所有者权限。

如果你在此引导机制存在之前就批准过某个发送者，请运行 `openclaw doctor`；当未配置命令所有者时，它会发出警告，并显示用于修复的准确 `openclaw config set commands.ownerAllowFrom ...` 命令。

## 相关

- [CLI 参考](/cli)
- [通道配对](/channels/pairing)
