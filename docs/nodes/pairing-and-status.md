---
summary: "将节点与网关配对、读取其状态并按正确的顺序升级队列"
read_when:
  - "将 iOS/watchOS/Android 节点配对到网关"
  - "读取节点状态、主机统计信息或批准范围"
  - "跨协议窗口升级网关及其节点"
title: "Node 配对和状态"
sidebarTitle: "配对和状态"
---

## <a id="pairing-%2B-status"></a><a id="pairing-+-status"></a> 配对 + 状态

节点使用 **设备配对**。节点在连接期间提供签名的设备身份；网关为 `role: node` 创建设备配对请求。设备批准允许连接；声明的命令界面需要单独批准。直接的 Apple Watch 设置使用管理员创建的、短期的仅节点设置代码来批准其固定的低风险命令界面；后期扩能仍需正常审批。

对于手动批准，请在网关上运行以下命令：

```bash
openclaw devices list
openclaw devices approve <deviceRequestId>
```

在设备审批待决期间，无头节点主机会不断重新连接，指数退避时间上限为 30 秒。批准后，下一次重新连接将创建单独的命令界面请求。返回网关：

```bash
openclaw nodes pending
openclaw nodes approve <nodeRequestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

如果较旧的客户端已报告重新连接已暂停，请使用 `openclaw node restart` 重新启动已安装的节点，或停止并重新运行其前台 `openclaw node run` 命令一次。对于暂停手动配对的应用程序节点，请重新启动节点模式或应用程序。

这两个请求 ID 不同。使用 `openclaw devices reject <deviceRequestId>` 拒绝设备准入而不是批准它。初始未经批准的表面没有有效命令。在扩展期间，先前批准的命令仅在节点仍然声明它们并且网关策略允许它们时才有效。

SSH- 经过验证和管理员创建的引导程序注册可以自动批准第一个表面。仅可信网络设备批准并不能；检查`nodes pending`并单独批准表面。后续的命令、能力或权限扩展仍然需要批准。表面批准不会绕过 [Gateway 命令策略 ](/nodes/command-policy) 或 [ 本地执行批准](/tools/exec-approvals)。

待处理的设备配对请求将在设备上次重试后 5 分钟后过期 - 不断重新连接的设备会保持其一个待处理请求（和 `requestId`）处于活动状态，而不是每隔几分钟生成一个新提示；请参阅 [ 节点配对 ](/gateway/pairing) 了解完整的 request/approve 生命周期。如果节点使用更改后的身份验证详细信息（role/scopes/public 密钥）重试，则先前的待处理请求将被取代，并创建新的 `requestId` — 客户端会收到被取代请求的 `device.pair.resolved` 事件，您应该在批准之前重新运行 `openclaw devices list`。

待处理的命令面请求不会仅仅随着时间的推移而过期；他们遵循 [ 能力审批生命周期 ](/gateway/pairing#how-capability-approval-works)。

- `nodes status` 会在节点的设备配对角色包含 `node` 时将其标记为 **paired**。
- A 连接的本机 Mac 报告与 OpenClaw 交互的合并活动，无需额外权限。可选的 **设置 -> 权限 -> 全系统存在检测** 还包括其他应用程序中的物理输入，并且需要可访问性。网关将最新的合格 Mac 标记为 `active`，为代理提供稳定的节点 ID 提示，并在延迟回退之前将节点连接警报路由到那里。有关设置、隐私、计时和故障排除的信息，请参阅 [ 活动计算机状态 ](/nodes/presence)。
- 设备配对记录是持久化的已批准角色契约。令牌轮换始终发生在该契约之内；它不能将已配对节点升级为配对批准未曾授予的角色。
- `node.pair.*`（CLI：`openclaw nodes pending/approve/reject/remove/rename`）管理节点在其配对设备记录上批准的 command/capability 表面。设备配对同时拥有传输认证和持久的节点表面；没有单独的节点配对存储。
- `openclaw nodes remove --node <id|name|ip>` 撤销设备在配对设备存储中的 `node` 角色，并断开该设备的节点角色会话：混合角色设备保留其行，仅丢失 `node` 角色，而仅节点设备行将被删除。 `operator.pairing`可能会删除其他设备上的非运营商节点行；设备令牌调用方在混合角色设备上撤销其自己的节点角色还需要 `operator.admin`。
- 批准范围遵循待处理请求中声明的命令：
  - 无命令请求：`operator.pairing`
  - 非 exec 节点命令：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which`: `operator.pairing` + `operator.admin`

无头节点主机报告 macOS 和 Linux 上的硬件模型。

连接的 CLI 节点主机和 macOS 应用程序每 60 秒报告一次 CPU 计数、平均负载、内存和主卷磁盘容量（从连接开始）。网关将最新快照公开为 `node.list` 和 `node.describe` 中的 `hostStats`。收到后，它将快照保存在配对节点记录上，因此离线节点会继续显示原始 `updatedAtMs` 的最新已知统计信息。连接的节点使用实时会话统计数据。 `openclaw nodes status` 和 `openclaw nodes describe` 显示紧凑的统计摘要，其中包含离线节点的最后已知年龄。 Windows 省略负载平均值，并且省略不可用的磁盘容量。有关电汇合约，请参阅 [Node 主机 stats](/gateway/protocol/presence#node-host-stats)。

## <a id="version-skew-and-upgrade-order"></a> 版本偏移与升级顺序

Gateway WebSocket 在 N-1 协议窗口内接受已认证的节点客户端。 因此，当前的 v4 Gateway 在连接声明 `role: "node"` 和 `client.mode: "node"` 时会接受 v3 节点。Operator 和 UI 会话必须仍然使用当前协议。

对于分阶段的集群升级，请先升级 Gateway，然后再升级每个节点。 N-1 节点在升级期间仍然可见且可管理；Gateway 会记录 `legacy node protocol accepted` 并给出升级建议。配对、 设备认证、命令允许列表和 exec 审批仍然适用。 由插件拥有的能力和命令会保持隐藏，直到该节点升级到当前协议。早于 N-1 的节点需要先进行带外升级，然后才能重新连接。

直接的 watchOS HTTPS 传输要求使用当前协议版本；在启用直连模式之前， 请先随 Gateway 一起更新手表应用。
