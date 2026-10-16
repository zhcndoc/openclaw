---
summary: "CLI `openclaw pairing` 参考（approve/list 配对请求）"
read_when:
  - "你正在使用配对模式私信，并且需要批准发送者"
title: "配对 CLI"
---

# `openclaw pairing`

批准或检查支持配对的通道的 DM 配对请求（仅限聊天 DM - node/device 配对使用 [`openclaw devices`](/cli/devices)）。

相关：[配对流程](/channels/pairing)

相同的待处理请求也可以在 Control UI 中的 **Settings → Channels → DM access requests** 下查看。Control UI 支持批准、可选的请求者通知以及忽略。忽略会移除当前请求，但不会永久阻止发送者。

两个 CLI 命令都使用拥有所选本地状态目录的经过身份验证的网关，或者在没有网关拥有该目录时持有独占离线所有权。 `list` 参与是因为列表可以修剪过期或多余的请求。该路由需要 `operator.admin` 和命令的 [ 所有者能力 ](/gateway/protocol/versioning#local-state-owner-routing)。较旧的网关、缺少凭据、拒绝或不确定的答复永远不会触发直接的本地回退。更新网关或通过其服务所有者停止它并离线重试；在不确定是否批准后，请在重试之前检查待处理的请求和通道允许列表。

## <a id="commands"></a> 命令

```bash
openclaw pairing list telegram
openclaw pairing list --channel telegram --account work
openclaw pairing list telegram --json

openclaw pairing approve <code>
openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify
```

使用 `--account <accountId>` 将任一命令限制为一个通道帐户。如果省略 `--account`，`list` 将显示通道帐户中的待处理请求，而 `approve` 使用属于匹配请求的帐户。显式为空或仅包含空格的值（例如 `--account ""`）将被 `--account must not be blank` 拒绝。

## `pairing list`

列出某个通道的待处理配对请求。

| 选项                  | 描述                           |
| ----------------------- | ------------------------------------- |
| `[channel]`             | 位置通道 ID                 |
| `--channel <channel>`   | 显式通道 ID                   |
| `--account <accountId>` | 多帐户渠道的帐户 ID |
| `--json`                | 机器可读输出               |

如果配置了多个支持配对的通道，请按位置传递通道或使用 `--channel`。只要通道 ID 有效，扩展通道就可以工作。

`--json` 保留 `{ channel, requests }`，包括每个请求的 `id`、`code`、`createdAt`、`lastSeenAt` 和可选的 `meta`。

## `pairing approve`

批准一个待处理的配对代码，并允许该发送者。

用法：

- `openclaw pairing approve <channel> <code>`
- `openclaw pairing approve --channel <channel> <code>`
- 当只配置了一个支持配对的通道时，使用 `openclaw pairing approve <code>`

选项：`--channel <channel>`、`--account <accountId>`、`--notify`（在同一通道上向请求者发送确认回复）。

### <a id="owner-bootstrap"></a> 所有者引导

如果您批准配对码时 `commands.ownerAllowFrom` 为空，则 CLI 还会将批准的发送者记录为命令所有者。它写入通道范围的条目，例如 `telegram:123456789`。这只会引导第一个所有者 - 后来的配对批准永远不会取代或扩展 `commands.ownerAllowFrom`。 Control UI 将此标高显示为单独的 `operator.admin`-protected 复选框，而不是自动应用它。

CLI 仅在确认批准后才执行此配置引导程序和可选的 `--notify`。他们保留现有的本地 config/reload 和渠道通知合同；他们不会在拒绝或不确定的 RPC 结果后运行。

命令所有者是允许运行仅限所有者的命令并批准危险操作的人工操作员帐户。这些操作包括 `/diagnostics`、`/export-session`、`/export-trajectory`、`/config` 和执行批准。配对仅允许发送者与代理交谈。除了这一一次性引导之外，它本身不会授予所有者特权。

如果您在 2026.4.29 中交付第一所有者引导程序之前批准了发件人，请运行 [`openclaw doctor`](/cli/doctor)。当未配置命令所有者时，它会发出警告。它还显示了修复它的确切 `openclaw config set commands.ownerAllowFrom ...` 命令。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [通道配对](/channels/pairing)
- [`openclaw qr`](/cli/qr) — mobile/device 引导程序 QR 和设置代码，不是通道 DM 配对代码
