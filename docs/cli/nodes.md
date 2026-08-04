---
summary: "openclaw 节点的 CLI 参考（状态、配对、调用、摄像头/画布/屏幕/位置/通知）"
read_when:
  - 你正在管理已配对的节点（摄像头、屏幕、画布）
  - 你需要批准请求或调用节点命令
title: "节点"
---

# `openclaw nodes`

管理已配对的节点（设备）并调用节点能力。

相关内容：[节点概览](/nodes) - [活动计算机存在](/nodes/presence) - [摄像头节点](/nodes/camera) - [图像节点](/nodes/images)

每个子命令的通用选项：`--url <url>`、`--token <token>`、`--timeout <ms>`（默认 `10000`）、`--json`。

## 状态

```bash
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
openclaw nodes list
openclaw nodes describe --node <idOrNameOrIp>
```

`status` 和 `list` 都接受 `--connected`（仅显示已连接节点）和 `--last-connected <duration>`（例如 `24h`、`7d`；仅显示在该时长内连接过的节点）。`list` 会将待处理节点和已配对节点分开显示在不同表格中，其中已配对行包含最近一次连接时长（Last Connect）；`status` 会显示一个合并表格，包含每个节点的能力、版本和最后输入详情。已连接的 macOS 节点只有在用户启用 **Active computer detection** 并授予 Accessibility 后才会报告最后输入；最新鲜的行会标记为 `active`。参见 [Active computer presence](/nodes/presence)。`describe` 会打印某个节点的能力、权限、活动状态以及生效/待处理的 invoke 命令。

## 配对

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name <displayName>
```

这些命令驱动网关拥有的 `node.pair.*` 存储，与设备配对（`openclaw devices approve`）分离；设备配对用于控制节点的 WS `connect` 握手。有关二者的关系，请参见 [节点](/nodes)。

- `remove` 撤销节点的配对角色条目。对于由设备支持的节点，此命令会撤销设备配对存储中的 `node` 角色，并断开其节点角色会话：混合角色设备会保留其条目，但仅失去 `node` 角色；仅有节点角色的设备条目会被删除。同时，它还会清除任何匹配的旧版网关拥有的节点配对记录。
- `pending` 只需要 `operator.pairing` 作用域。
- `gateway.nodes.pairing.autoApproveCidrs` 可以跳过待处理步骤，自动批准明确受信任的、首次进行 `role: node` 设备配对的请求。默认关闭；不会批准角色升级。
- `gateway.nodes.pairing.sshVerify`（默认开启）会在网关能够通过 SSH 验证节点主机上的设备密钥时，自动批准首次进行 `role: node` 的设备配对；首次能力范围会在同一步骤中批准。请参见 [节点配对](/gateway/pairing#ssh-verified-device-auto-approval-default)。
- `approve` 的作用域要求取决于待处理请求声明的命令：
  - 无命令的请求：`operator.pairing`
  - 普通节点命令：`operator.pairing` + `operator.write`
  - 管理员敏感命令（`system.run`、`system.run.prepare`、`system.which`、`browser.proxy`、`browser.proxy.upload.v1`、`fs.listDir` 和 `system.execApprovals.get/set`）：`operator.pairing` + `operator.admin`
- `remove` 的作用域：`operator.pairing` 可以移除非操作员节点条目；设备令牌调用方在混合角色设备上撤销其自身的节点角色时，还需要 `operator.admin`。

## 调用

```bash
openclaw nodes invoke --node <id> --command system.which --params '{"bins":["uname"]}'
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

- `notify` 在声明了 `system.notify` 的节点上发送本地通知，包括 macOS、iOS、Android 和直接连接的 watchOS 节点。直接向 watchOS 发送通知需要 OpenClaw 处于活动状态。需要指定 `--title` 或 `--body`。选项：`--sound <name>`、`--priority <passive|active|timeSensitive>`、`--delivery <system|overlay|auto>`（默认值为 `system`）、`--invoke-timeout <ms>`（默认值为 `15000`）。
- `push` 向 iOS 节点发送 APNs 测试推送。选项：`--title <text>`（默认值为 `OpenClaw`）、`--body <text>`、`--environment <sandbox|production>`，用于覆盖检测到的 APNs 环境。成功投递时退出码为 `0`；对于明确的 APNs 拒绝，会保留完整的文本或 JSON 诊断信息，并以非零状态退出。
- `location get` 获取节点的当前位置。选项：`--max-age <ms>`（复用缓存的位置修复结果）、`--accuracy <coarse|balanced|precise>`、`--location-timeout <ms>`（默认值为 `10000`）、`--invoke-timeout <ms>`（默认值为 `20000`）。
- `screen record` 捕获短视频片段并输出保存路径（或使用 `--json` 写入 JSON）。选项：`--screen <index>`（默认值为 `0`）、`--duration <ms|10s>`（默认值为 `10000`）、`--fps <fps>`（默认值为 `10`）、`--no-audio`、`--out <path>`、`--invoke-timeout <ms>`（默认值为 `120000`）。
- 明确指定的屏幕输出路径会在目标文件旁暂存，并且仅在完整写入后替换目标文件；写入失败时，已有文件保持不变。

Camera 和 Canvas 命令有各自的文档：[Camera 节点](/nodes/camera)、[Canvas](/platforms/mac/canvas)。Canvas 由捆绑的实验性 Canvas 插件实现；核心将 `openclaw nodes canvas` 保留为兼容性挂载点。

## 相关

- [CLI 参考](/cli)
- [节点](/nodes)
