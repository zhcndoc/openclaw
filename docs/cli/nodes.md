---
summary: "openclaw nodes 的 CLI 参考（状态、配对、调用、摄像头/画布/屏幕）"
read_when:
  - 你正在管理已配对的节点（摄像头、屏幕、画布）
  - 你需要批准请求或调用节点命令
title: "节点"
---

# `openclaw nodes`

管理已配对的节点（设备）并调用节点能力。

相关内容：

- 节点概览：[节点](/nodes)
- 摄像头：[摄像头节点](/nodes/camera)
- 图像：[图像节点](/nodes/images)

常用选项：

- `--url`, `--token`, `--timeout`, `--json`

## 常用命令

```bash
openclaw nodes list
openclaw nodes list --connected
openclaw nodes list --last-connected 24h
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name <displayName>
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` 会输出待处理/已配对的表格。已配对的行会包含最近一次连接的时长（Last Connect）。
使用 `--connected` 仅显示当前已连接的节点。使用 `--last-connected <duration>` 可
筛选在某个时长内连接过的节点（例如 `24h`、`7d`）。
使用 `nodes remove --node <id|name|ip>` 可删除过时的、由网关持有的节点配对记录。

批准说明：

- `openclaw nodes pending` 只需要配对范围。
- `gateway.nodes.pairing.autoApproveCidrs` 可以跳过待处理步骤，但仅适用于
  明确受信任、首次 `role: node` 的设备配对。它默认关闭，
  且不会批准升级。
- `openclaw nodes approve <requestId>` 会继承来自
  待处理请求的额外范围要求：
  - 无命令请求：仅配对
  - 非 exec 节点命令：配对 + 写入
  - `system.run` / `system.run.prepare` / `system.which`：配对 + 管理员

## 调用

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
```

调用标志：

- `--params <json>`：JSON 对象字符串（默认 `{}`）。
- `--invoke-timeout <ms>`：节点调用超时时间（默认 `15000`）。
- `--idempotency-key <key>`：可选的幂等键。
- `system.run` 和 `system.run.prepare` 在这里被阻止；请使用带 `host=node` 的 `exec` 工具执行 shell。

在节点上执行 shell 时，请使用带 `host=node` 的 `exec` 工具，而不是 `openclaw nodes run`。
`nodes` CLI 现在以能力为中心：通过 `nodes invoke` 进行直接 RPC，再加上配对、摄像头、
屏幕、位置、画布和通知。

## 相关

- [CLI 参考](/cli)
- [节点](/nodes)
