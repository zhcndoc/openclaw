---
summary: "网关 RPC 系列，用于设备配对、节点调用、批准、Control UI 命令和自动化"
read_when:
  - "配对设备或铸造设备令牌"
  - "调用节点或耗尽其挂起的工作"
  - "解决审批或驱动 Control UI 命令"
title: "网关协议设备、节点及审批方法"
sidebarTitle: "设备、节点和批准"
doc-schema-version: 1
---

RPC 方法系列，用于设备配对和设备令牌、节点配对和调用、批准、Control UI 命令以及自动化、技能和工具。

## <a id="device-pairing-and-device-tokens"></a> 设备配对和设备令牌

- `device.pair.list` 返回待处理和已批准的配对设备。
- `device.pair.setupCode`创建移动设置代码，默认情况下，PNG QR数据URL。它需要`operator.admin`并且在广告发现中被故意省略。当前的网关包括一个不透明的非秘密网关`setupId`、权威`expiresAtMs`， `setupCode`， 选修的`qrDataUrl`， `gatewayUrl`，非秘密的`auth`标签，`urlSource`，以及发出的`access`等级 （`full`， `limited`， or `node`）。旧协议 v4 网关省略`setupId`和`expiresAtMs`，因此单独发货的客户端必须将这些生命周期字段视为可选。这`setupId`独立于引导凭据，并且不嵌入设置代码中。
- `device.pair.setupStatus` 协调调用者已颁发的一个设置凭证 （`{ setupId }`）。它需要 `operator.admin`，在通告的发现中被省略，并且在凭证承载响应完成后返回 `{ completion }`，或者在承载退役但无法确认响应传递时返回 `{ deliveryUncertain }`。两者都使用相同的非秘密有效负载作为其相应的事件。当两个字段都不存在时，网关不保留该 `setupId` 的保留结果。
- `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理设备配对记录。
- `device.pair.rename` 分配操作员标签（`{ deviceId, label }`），该标签优先于客户端报告的显示名称，并且在设备修复或重新批准后仍然保留。
- `device.token.rotate` 在已批准的角色和调用方范围限制内轮换配对设备令牌。
- `device.token.revoke` 在已批准的角色和调用方范围限制内撤销配对设备令牌。

设置代码会嵌入短期引导凭据。客户端不得在配对流程之外记录或持久化该凭据。

仅在确切的设置切换交付其凭证后，配对范围的客户端才会收到 `device.pair.setup.completed`。其有效负载为`{ setupId, deviceId, deviceName?, access, ts }`；它从不包含引导凭证或令牌派生标识符。

如果响应在确认交付之前关闭，则网关将保持承载退役并发出 `device.pair.setup.deliveryUncertain` 而不是成功。呈现的客户端应为操作员提供检查或删除配对设备并生成新设置代码的路径。

网关在消耗承载时记录不确定的结果，然后仅在响应传递完成后将其提升至完成。对于慢速订阅者来说，操作员事件框架会尽最大努力并丢弃，而不是关闭他们的套接字。因此，显示设置代码的客户端必须在将代码显示为过期之前调用 `device.pair.setupStatus`。证书到期后，结果将被保留。

## <a id="node-pairing%2C-invoke%2C-and-pending-work"></a><a id="node-pairing-invoke-and-pending-work"></a> Node 配对、调用和待处理工作

- `node.pair.list`、`node.pair.approve`、`node.pair.reject` 和 `node.pair.remove` 处理节点能力批准。`node.pair.request` 和 `node.pair.verify` 已在 2026.7 中与独立节点配对存储一同移除；待处理请求由网关在节点连接期间创建。
- `node.list` 和 `node.describe` 返回 known/connected 节点状态。
- `node.rename` 更新配对节点标签。
- `node.invoke` 将命令转发给已连接的节点。
- `node.invoke.result` 返回调用请求的结果。仅当生命周期清理阻止执行时，在调用命令处理程序或发出进度之前，节点才可能返回 `NODE_NOT_READY`。网关在原始调用期限内重试此拒绝最多四次，并在每次调度时重新检查连接、配对和命令授权。一般 `UNAVAILABLE` 错误、断开连接、超时和进度后失败不会重试。
- `mcp.tools.call.v1` 是用于调用已配置节点本地 MCP 工具的无头节点主机命令。它通过 `node.invoke` 传输，要求节点声明该命令，并且仍受配对批准和 `gateway.nodes.commands.deny` 约束。
- `node.event` 将节点发起的事件传回网关。
- `node.pluginTools.update`是替换连接节点的代理可见plugin/MCP工具描述符的唯一发布路径； `connect`参数不带。
- `node.pending.pull` 和 `node.pending.ack` 是连接节点队列 API。
- `node.pending.enqueue` 和 `node.pending.drain` 管理 offline/disconnected 节点的持久挂起工作。

## <a id="approval-families"></a> 批准系列

- `approval.history` 返回针对执行、插件和系统代理请求（范围 `operator.approvals`）保留 30 天的最新优先终端批准。它支持光标分页以及可选的种类过滤器；待审批不是历史行。将每个游标视为不透明的服务器令牌，并返回准确的值，而无需填充、重写或添加字段。
- `approval.get` 和 `approval.resolve` 是与类型无关的持久批准方法（范围 `operator.approvals`）。 `approval.get` 返回一个已清理的挂起或保留的终端投影，具有稳定的 `urlPath`； `approval.resolve` 接受存储的批准 ID、显式 `kind` 和决策，应用第一个答案获胜的解决方案，并始终返回记录的结果。
- `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 涵盖一次性执行批准请求和待批准 lookup/replay. 它们是同一持久批准注册表上的协议边界适配器。
- `exec.approval.waitDecision` 等待一个待处理的 exec 审批，并返回最终决定（超时时返回 `null`）。
- `exec.approvals.get` 和 `exec.approvals.set` 管理网关 exec 审批策略快照。
- `exec.approvals.node.get` 和 `exec.approvals.node.set` 通过节点中继命令管理节点本地 exec 审批策略。
- `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 处理插件定义的审批流程。

当存储工作待处理时，批准查找、历史记录、等待和解决保留其原始设备和帐户权限。单独断开套接字并不会取消已接受的请求。在提交许可之前撤销该权限可以阻止判决并保留批准细节；待批准的内容仍可供另一位授权审阅者使用。已做出的判决将被记录下来并解决其等待的行动。记录决定后，解决答复不会等待尽力而为渠道或推送通知。缓慢或失败的通知不能重新批准或延迟确认其裁决。

`exec.approvals.get` 接受可选的 `expectedOwnerId`； `exec.approvals.set` 接受 `file`、可选 `baseHash` 和可选 `expectedOwnerId`。现有快照需要 `get` 返回的哈希值；过时或丢失的哈希会拒绝保存。对于不存在的快照，接受省略的哈希值，但提供的哈希值必须匹配。默认本地 CLI 始终携带其观察到的哈希值。两种方法都返回现有的编辑快照（`path`、`exists`、`hash`、`file`）加上`resolvedDefaults`；省略的套接字默认保留其现有的合并行为。

默认本地 CLI 读取和写入协商其单独的 [ 所有者功能 ](/gateway/protocol/versioning#local-state-owner-routing) 并发送 `expectedOwnerId`。读取参与是因为它可以初始化缺失状态。现有的 RPC 客户端可以省略所有者字段；显式网关和节点目标保留其当前的传输和响应合同。这不会更改执行策略、常设授权或执行授权语义。

## <a id="control-ui-commands"></a> Control UI 命令

- `ui.command` 允许 `operator.write` 调用者将键入的布局和导航命令发送到请求的 Control UI 连接，该连接必须通告 `ui-commands` 功能。
- Commands 涵盖窗格 split/close/focus、侧边栏可见性、terminal/browser 面板可见性和停靠以及会话导航。
- 网关从经过身份验证的请求或代理轮捕获的浏览器目标中派生接收者，而不是从目标会话中派生。其他连接保持其当前视图。请求者丢失或断开连接失败，并显示 `UNAVAILABLE`；没有广播后备。
- 依赖传统广播传送的独立呼叫者必须从 Control UI 连接或从那里开始的轮次启动这些操作。没有浏览器目标的独立调用不再控制连接的仪表板。

## <a id="automation%2C-skills%2C-and-tools"></a><a id="automation-skills-and-tools"></a> 自动化、技能和工具

- 自动化：`wake` 安排立即或下一次心跳唤醒文本注入；`cron.get`、`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run`、`cron.runs` 管理计划任务。
- `cron.run` 将手动运行排队并通过 `{ ok: true, enqueued: true, runId }` 进行确认。传递 `waitTimeoutMs` 以保留响应，直到运行记录其结果：确认然后还携带 `run`，为该 `runId` 返回相同的条目 `cron.runs`，或者当运行结束但其历史记录对调用者不可见时返回 `finished: true`。如果等待首先结束，则两者都不会设置并且运行将继续。代理运行时调用者会立即获得主会话作业和在其自己的会话中运行的作业的明确确认，因为这些运行仅在调用轮后开始。
- `cron.runs` 接受可选的非空 `runId` 筛选器，使客户端能够跟踪一个排队的手动运行，而无需与同一任务的其他历史条目竞争。
- 技能和工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`、`tools.invoke`。请参阅 [ 操作符辅助方法](/gateway/protocol/operator-methods#operator-helper-methods)。
