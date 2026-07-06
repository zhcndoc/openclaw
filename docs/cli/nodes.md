---
summary: "openclaw nodes 的 CLI 参考（状态、配对、调用、摄像头/画布/屏幕/位置/通知）"
read_when:
  - 你正在管理已配对的节点（摄像头、屏幕、画布）
  - 你需要批准请求或调用节点命令
title: "节点"
---

# `openclaw nodes`

管理已配对的节点（设备）并调用节点能力。

相关：[节点概览](/nodes) - [摄像头节点](/nodes/camera) - [图像节点](/nodes/images)

每个子命令的通用选项：`--url <url>`、`--token <token>`、`--timeout <ms>`（默认 `10000`）、`--json`。

## 状态

```bash
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
openclaw nodes list
openclaw nodes describe --node <idOrNameOrIp>
```

`status` 和 `list` 都接受 `--connected`（仅显示已连接节点）和 `--last-connected <duration>`（例如 `24h`、`7d`；仅显示在该时长内连接过的节点）。`list` 会将待定和已配对节点分别显示在不同的表格中，其中已配对行包含最近一次连接时长（Last Connect）；`status` 会显示一个合并后的表格，其中包含每个节点的能力和版本详情。`describe` 会打印单个节点的能力、权限，以及生效/待处理的 invoke 命令。

## 配对

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name <displayName>
```

这些命令驱动网关拥有的 `node.pair.*` 存储，与设备配对（`openclaw devices approve`）分离；设备配对用于控制节点的 WS `connect` 握手。有关二者的关系，请参见 [Nodes](/nodes)。

- `remove` 会撤销节点的已配对角色条目。对于有设备绑定的节点，这会撤销设备配对存储中的 `node` 角色，并断开其 node 角色会话：混合角色设备会保留其记录行，只失去 `node` 角色；仅节点设备的记录行会被删除。它还会清除任何匹配的旧版网关拥有的节点配对记录。
- `pending` 只需要 `operator.pairing` 范围。
- `gateway.nodes.pairing.autoApproveCidrs` 可以跳过明确受信任、首次 `role: node` 设备配对的待处理步骤。默认关闭；不会批准角色升级。
- `approve` 的范围要求遵循待处理请求声明的命令：
  - 无命令请求：`operator.pairing`
  - 非执行类节点命令：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which`：`operator.pairing` + `operator.admin`
- `remove` 范围：`operator.pairing` 可以移除非 operator 的节点记录；设备令牌调用方在混合角色设备上撤销自己的 node 角色时，另外还需要 `operator.admin`。

## 调用

```bash
openclaw nodes invoke --node <id> --command system.which --params '{"name":"uname"}'
```

标志：

- `--command <command>`（必需）：例如 `canvas.eval`。
- `--params <json>`：JSON 对象字符串（默认 `{}`）。
- `--invoke-timeout <ms>`：节点调用超时时间（默认 `15000`）。
- `--idempotency-key <key>`：可选的幂等键。

`system.run` 和 `system.run.prepare` 在此处被阻止；请改用带有 `host=node` 的 `exec` 工具来执行 shell 命令。`system.which` 允许通过 `invoke` 调用。

## 通知、推送、位置、屏幕

```bash
openclaw nodes notify --node <id> --title "Build" --body "Done" --priority timeSensitive
openclaw nodes push --node <id> --title "OpenClaw" --environment sandbox
openclaw nodes location get --node <id> --accuracy precise
openclaw nodes screen record --node <id> --duration 10s --fps 10 --out ./clip.mp4
```

- `notify` 会在节点上发送本地通知（仅限 macOS）。需要 `--title` 或 `--body`。选项：`--sound <name>`、`--priority <passive|active|timeSensitive>`、`--delivery <system|overlay|auto>`（默认 `system`）、`--invoke-timeout <ms>`（默认 `15000`）。
- `push` 会向 iOS 节点发送一条 APNs 测试推送。选项：`--title <text>`（默认 `OpenClaw`）、`--body <text>`、`--environment <sandbox|production>` 用于覆盖检测到的 APNs 环境。
- `location get` 获取节点当前的位置。选项：`--max-age <ms>`（复用缓存的定位结果）、`--accuracy <coarse|balanced|precise>`、`--location-timeout <ms>`（默认 `10000`）、`--invoke-timeout <ms>`（默认 `20000`）。
- `screen record` 捕获一段短视频并打印保存路径（或使用 `--json` 输出 JSON）。选项：`--screen <index>`（默认 `0`）、`--duration <ms|10s>`（默认 `10000`）、`--fps <fps>`（默认 `10`）、`--no-audio`、`--out <path>`、`--invoke-timeout <ms>`（默认 `120000`）。

Camera 和 Canvas 命令有各自的文档：[Camera 节点](/nodes/camera)、[Canvas](/platforms/mac/canvas)。Canvas 由捆绑的实验性 Canvas 插件实现；核心将 `openclaw nodes canvas` 保留为兼容性挂载点。

## 相关

- [CLI 参考](/cli)
- [节点](/nodes)
