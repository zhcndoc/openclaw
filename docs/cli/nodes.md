---
summary: "`openclaw nodes` 的 CLI 参考（状态、配对、调用、camera/screen/location/notify 和 macOS 小部件面板）"
read_when:
  - "您正在管理配对的节点（摄像机、屏幕或 macOS 小部件面板）"
  - "你需要批准请求或调用节点命令"
title: "节点 CLI"
---

# `openclaw nodes`

管理已配对的节点（设备）并调用节点能力。

相关内容：[节点概览](/nodes) - [活动计算机存在](/nodes/presence) - [摄像头节点](/nodes/camera) - [图像节点](/nodes/images)

每个子命令的常用选项：`--url <url>`、`--token <token>`、`--timeout <ms>`（默认值因命令而异）、`--json`。

对于 `--location-timeout`、`--max-age` 和 `--quality` 等数字选项，省略该标志以使用其默认值。显式的空值或仅包含空格的值无效，并且在节点查找或网关请求之前失败。

对于 `camera clip` 和 `screen record`，`--duration` 接受毫秒或单位后缀，例如 `500ms`、`10s` 和 `1m`。解析的值必须四舍五入为以毫秒为单位的安全正整数 （1–9007199254740991）。零、负、格式错误和四舍五入到零的亚毫秒值在节点查找或捕获之前失败。省略该标志将保留默认值：相机剪辑为 3000 毫秒，屏幕录制为 10000 毫秒。节点可以施加自己的捕获限制。

## <a id="status"></a> 状态

```bash
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
openclaw nodes list
openclaw nodes describe --node <idOrNameOrIp>
```

`status`和`list`都接受`--connected`（仅连接的节点）和`--last-connected <duration>`（例如`24h`或`7d`，仅匹配在持续时间内连接的节点）。两者都使用网关记录的上次连接时间，包括最近的重新连接和具有已知连接历史记录的断开节点。 `list` 在单独的表中显示待处理节点和配对节点。成对的行包含最近的连接年龄（上次连接）。 `status` 显示一个合并表，其中包含每个节点的功能、版本和最后输入的详细信息。连接的 macOS 节点报告与 OpenClaw 交互的活动，无需额外权限。可选的 **系统范围的存在检测** 还报告其他应用程序中的身体活动，并且需要可访问性。最新的行标记为 `active`。请参阅 [ 活动计算机状态 ](/nodes/presence)。 `describe` 打印一个节点的功能、权限、活动和 effective/pending 调用命令。

当主机统计信息可用时，`status` 包含详细信息片段，例如 `load 3.2/24 · mem 151/192 GB · disk 1.2 TB free`。 `describe` 在其 `Stats` 行中显示相同的摘要。负载是 1 分钟平均值，后跟 CPU 计数，内存是 used/total，字节值使用带有 GB/TB 标签的二进制缩放。忽略不可用的负载或磁盘读数。离线节点显示保存的快照，其年龄（例如 `(last known 27d ago)`）是根据快照的原始时间戳测量的。请参阅 [ 节点主机统计信息 ](/gateway/protocol/presence#node-host-stats)。

`--node` 接受精确的 ID、IP 地址、显示名称或至少 6 个字符的 ID 前缀。精确的 ID 和 IP 匹配优先于名称和前缀。在最强匹配中，连接的节点优先。如果客户端共享一个名称，请使用确切的 ID 来消除歧义。客户端类型不选择目标。

## <a id="pairing"></a> 配对

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name <displayName>
```

这些命令管理节点在其配对设备记录上批准的 command/capability 表面。设备配对 （`openclaw devices approve`） 门控节点的 WebSocket `connect` 握手。

对于手动注册，首先批准设备请求，然后重新启动或重新运行 `PAIRING_REQUIRED` 上暂停的节点。它的重新连接创建了 `nodes pending` 显示的单独请求。批准该节点请求，其 ID 与设备请求 ID 不同。有关完整序列，请参阅 [ 节点配对和状态](/nodes/pairing-and-status#pairing-+-status)。

- `remove` 撤销设备的 `node` 角色并清除其已批准和待处理的 command/capability 表面。它会断开设备的节点角色会话。混合角色设备保留其记录和其他角色。仅节点设备记录被删除。
- 即使工作清理报告错误：已撤销的节点连接仍然关闭，Removal 仍然有效。
- `pending` 只需要 `operator.pairing` 作用域。
- `gateway.nodes.pairing.autoApproveCidrs` 可以批准明确信任的首次 `role: node` 设备配对。它默认处于关闭状态，并且不批准角色升级或单独的命令界面。该请求仍然出现在 `nodes pending` 中。
- `gateway.nodes.pairing.sshVerify` 默认打开。当网关可以通过 SSH 向节点主机验证设备密钥时，它会自动批准首次 `role: node` 设备配对。第一个能力表面在同一步骤中获得批准。请参阅 [ 节点配对 ](/gateway/pairing#ssh-verified-device-auto-approval-default)。
- `approve` 的作用域要求取决于待处理请求声明的命令：
  - 无命令请求：`operator.pairing`
  - 普通节点命令：`operator.pairing` + `operator.write`
  - 管理员敏感命令（`system.run`、`system.run.prepare`、`system.which`、`browser.proxy`、`browser.proxy.upload.v1`、`fs.listDir` 和 `system.execApprovals.get/set`）：`operator.pairing` + `operator.admin`
- 这些要求对通过 `node.invoke` 中继的节点命令进行分类。顶级网关 `fs.listDir` RPC 需要 `operator.write` 进行工作区包含的主机浏览，并在 `nodeId` 存在时需要 `operator.admin`。
- `remove` 范围：`operator.pairing` 可以删除非操作符节点行。设备令牌调用者在混合角色设备上撤销自己的节点角色还需要 `operator.admin`。

## <a id="invoke"></a> 调用

```bash
openclaw nodes invoke --node <id> --command system.which --params '{"bins":["uname"]}'
```

标志：

- `--command <command>`（必填）：e.g. `device.info`。
- `--params <json>`：JSON 对象字符串（默认 `{}`）。
- `--invoke-timeout <ms>`：节点调用超时为正整数（默认 `15000`）。
- `--timeout <ms>`：网关传输超时（默认 `30000`）。对于正调用超时，有效传输超时为 `max(timeout, invokeTimeout + 10000)`，允许传输宽限超出节点的调用截止时间。
- `--idempotency-key <key>`：可选的非空请求密钥，可防止重复运行。显式空值在节点查找或网关请求之前失败。提供的键保留其确切字节，包括空格；省略该标志会生成一个密钥。

调用超时涵盖网关检查、节点唤醒、就绪重试和节点响应。时钟调整不会重置或延长此经过时间预算。

`system.run` 和 `system.run.prepare` 在此被屏蔽。请使用 `exec` 工具和 `host=node` 来执行 shell。 `system.which` 允许通过 `invoke`。 `fs.listDir` 仅返回子目录（新会话文件夹选择器合约）；将 `exec` 工具与 `host=node` 结合使用来列出文件或完整目录内容。

## <a id="notify%2C-push%2C-location%2C-screen"></a><a id="notify-push-location-screen"></a> 通知、推送、位置、屏幕

```bash
openclaw nodes notify --node <id> --title "Build" --body "Done" --priority timeSensitive
openclaw nodes push --node <id> --title "OpenClaw" --environment sandbox
openclaw nodes location get --node <id> --accuracy precise
openclaw nodes screen record --node <id> --duration 10s --fps 10 --out ./clip.mp4
```

- `notify` 在声明了 `system.notify` 的节点上发送本地通知，包括 macOS、iOS、Android 和直接连接的 watchOS 节点。直接向 watchOS 发送通知需要 OpenClaw 处于活动状态。需要指定 `--title` 或 `--body`。选项：`--sound <name>`、`--priority <passive|active|timeSensitive>`、`--delivery <system|overlay|auto>`（默认值为 `system`）、`--invoke-timeout <ms>`（默认值为 `15000`）。
- `push` 向 iOS 节点发送 APNs 测试推送。选项：`--title <text>`（默认 `OpenClaw`）、`--body <text>`、`--environment <sandbox|production>` 用于覆盖检测到的 APNs 环境。已接受的交货退出 `0`。输入的 APNs 拒绝保留完整文本或 JSON 诊断并以非零值退出。
- `location get` 获取节点的当前位置。选项：`--max-age <ms>`（复用缓存的位置修复结果）、`--accuracy <coarse|balanced|precise>`、`--location-timeout <ms>`（默认值为 `10000`）、`--invoke-timeout <ms>`（默认值为 `20000`）。
- `screen record` 捕获短视频片段并输出保存路径（或使用 `--json` 写入 JSON）。选项：`--screen <index>`（默认值为 `0`）、`--duration <ms|10s>`（默认值为 `10000`）、`--fps <fps>`（默认值为 `10`）、`--no-audio`、`--out <path>`、`--invoke-timeout <ms>`（默认值为 `120000`）。
- 显式屏幕输出路径位于目标旁边。他们仅在完整写入后才替换它。写入失败会使现有文件保持不变。

相机和 macOS 小部件面板命令有自己的文档：[相机节点](/nodes/camera)、[小部件面板](/platforms/mac/canvas)。捆绑的实验性 Canvas 插件将 `openclaw nodes canvas` 注册到现存的 `present`、`hide` 和 `navigate` 子命令。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [节点](/nodes)
