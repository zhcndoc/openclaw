---
summary: "`openclaw pairing` 的命令行参考（审批/列出配对请求）"
read_when:
  - 你正在使用配对模式私信并需要审批发送者
title: "配对"
---

# `openclaw pairing`

审批或查看私信配对请求（适用于支持配对的频道）。

相关内容：

- 配对流程：[配对](/channels/pairing)

## 命令

```bash
openclaw pairing list telegram
openclaw pairing list --channel telegram --account work
openclaw pairing list telegram --json

openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify
```

## 说明

- 频道输入：可以作为位置参数传入（`pairing list telegram`），也可以使用 `--channel <频道>`。
- `pairing list` 支持 `--account <账户ID>`，适用于多账户频道。
- `pairing approve` 支持 `--account <账户ID>` 和 `--notify`。
- 如果只配置了一个支持配对的频道，则允许使用 `pairing approve <code>`。
