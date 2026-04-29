---
summary: "`openclaw pairing` 的 CLI 参考（批准/列出配对请求）"
read_when:
  - 你正在使用配对模式私信，并需要批准发送者
title: "配对"
---

# `openclaw pairing`

批准或检查 DM 配对请求（适用于支持配对的通道）。

相关：

- 配对流程：[配对](/channels/pairing)

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

选项：

- `[channel]`：位置参数通道 id
- `--channel <channel>`：显式通道 id
- `--account <accountId>`：多账号通道的账号 id
- `--json`：机器可读输出

注意：

- 如果配置了多个支持配对的通道，则必须通过位置参数或 `--channel` 提供一个通道。
- 只要通道 id 有效，也允许使用扩展通道。

## `pairing approve`

批准一个待处理的配对代码，并允许该发送者。

用法：

- `openclaw pairing approve <channel> <code>`
- `openclaw pairing approve --channel <channel> <code>`
- 当只配置了一个支持配对的通道时，使用 `openclaw pairing approve <code>`

选项：

- `--channel <channel>`：显式通道 id
- `--account <accountId>`：多账号通道的账号 id
- `--notify`：在同一通道上向请求者发送确认

所有者引导：

- 如果在批准配对代码时 `commands.ownerAllowFrom` 为空，OpenClaw 还会将已批准的发送者记录为命令所有者，使用类似 `telegram:123456789` 的按通道作用域条目。
- 这只会引导出第一个所有者。之后的配对批准不会替换或扩展 `commands.ownerAllowFrom`。
- 命令所有者是允许运行仅所有者可用命令并批准危险操作的人类操作员账号，例如 `/diagnostics`、`/export-trajectory`、`/config` 和 exec 批准。

## 注意

- 通道输入：可以位置传入（`pairing list telegram`）或使用 `--channel <channel>`。
- `pairing list` 支持多账号通道的 `--account <accountId>`。
- `pairing approve` 支持 `--account <accountId>` 和 `--notify`。
- 如果只配置了一个支持配对的通道，则允许使用 `pairing approve <code>`。
- 如果你在此引导机制存在之前就批准过发送者，请运行 `openclaw doctor`；当没有配置命令所有者时，它会发出警告，并显示用于修复的 `openclaw config set commands.ownerAllowFrom ...` 命令。

## 相关

- [CLI 参考](/cli)
- [通道配对](/channels/pairing)
