---
summary: "openclaw nodes CLI 参考（状态、配对、调用、摄像头/画布/屏幕）"
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

`nodes list` 会打印待处理/已配对表。已配对行包含最近一次连接时长（Last Connect）。
使用 `--connected` 仅显示当前已连接的节点。使用 `--last-connected <duration>` 可
筛选在指定时长内连接过的节点（例如 `24h`、`7d`）。
使用 `nodes remove --node <id|name|ip>` 可移除节点配对。对于由设备支持的节点，这会撤销
设备在 `devices/paired.json` 中的 `node` 角色，并断开其 node-role 会话（混合角色设备会保留
其记录行，仅失去 `node` 角色；仅 node 设备会被删除）；同时也会清除任何匹配的旧版
gateway 拥有的节点配对记录。`operator.pairing` 可以移除非 operator 的节点记录；设备令牌调用方
若在混合角色设备上撤销自己的 node 角色，则还需要 `operator.admin`。

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

对于节点上的 shell 执行，请使用带 `host=node` 的 `exec` 工具，而不是 `openclaw nodes run`。
`nodes` CLI 现在以能力为中心：通过 `nodes invoke` 直接 RPC，以及配对、摄像头、
屏幕、位置、Canvas 和通知。Canvas 命令由捆绑的实验性 Canvas 插件实现；核心保留了兼容性钩子，因此它们仍然位于 `openclaw nodes canvas` 下。

## 相关

- [CLI 参考](/cli)
- [节点](/nodes)
