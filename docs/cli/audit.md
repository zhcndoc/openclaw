---
doc-schema-version: 1
summary: "CLI 活动记录、执行身份和决策收据参考"
read_when:
  - "你需要回答某个代理或工具是谁运行的、何时运行以及如何结束"
  - "你需要不包含内容的入站或出站消息生命周期元数据"
  - "你需要一个有界、可脱敏的活动导出"
title: "审计记录"
---

# `openclaw audit`

查询 Gateway 仅包含元数据的活动账本，发现共享运行关联的执行，或检查某个确切代理执行的不可变身份上下文。

运行和工具活动记录默认启用。执行身份在全新安装和升级中默认单独禁用。请显式启用：

```bash
openclaw config set logging.audit.executionIdentity true
openclaw gateway restart
```

身份收集要求 `logging.audit.enabled` 保持启用状态。 消息记录也默认单独禁用；将 `logging.audit.messages` 设置为 `direct` 或 `all`，并重启 Gateway 以记录消息。现有记录在过期前（30 天内）仍可查询。

直接本地命令使用与 Gateway 相同的有界写入器生命周期。 `openclaw agent exec` 默认会删除其临时状态目录，因此其审计证据会与该隔离运行的其余内容一同被有意丢弃。 当运行状态必须保留时，请使用 `agent exec --state-dir <dir>`，并通过使用同一状态目录的 Gateway 对其进行检查。

账本与对话记录是分开的：它记录身份、排序、出处、操作、状态和标准化结果代码，但从不存储内容，并且消息标识符仅显示为安装本地键控假名。 [审计历史记录](/gateway/audit)拥有完整的数据模型、隐私语义、storage/retention边界和覆盖范围限制；此页面涵盖命令界面。

```bash
openclaw audit
openclaw audit --agent main --status failed
openclaw audit --session "agent:main:main" --after 2026-07-01T00:00:00Z
openclaw audit --run 8c69f72e-8b11-4c54-98d5-1a3dd67450c3
openclaw audit --run 8c69f72e-8b11-4c54-98d5-1a3dd67450c3 --explain
openclaw audit --execution 5da4c4c3-e1c9-4c95-a17d-6e5c10fd45cf --explain
openclaw audit --execution 5da4c4c3-e1c9-4c95-a17d-6e5c10fd45cf --explain --json
openclaw audit --run 8c69f72e-8b11-4c54-98d5-1a3dd67450c3 --explain --json
openclaw audit --kind tool_action --limit 50 --json
openclaw audit --kind message --direction outbound --channel telegram --json
```

## <a id="filters"></a> 过滤器

- `--agent <id>`：精确的 agent id
- `--session <key>`：精确的 session key
- `--run <id>`：精确的 run id；除非同时设置了 `--explain`，否则筛选 activity
- `--execution <id>`：精确的 execution id；需要使用 `--explain`
- `--kind <kind>`：`agent_run`、`tool_action` 或 `message`
- `--status <status>`：`started`、`succeeded`、`failed`、`cancelled`、 `timed_out`、`blocked` 或 `unknown`
- `--direction <direction>`：消息方向，`inbound` 或 `outbound`
- `--channel <channel>`：精确的消息 channel
- `--after <timestamp>` / `--before <timestamp>`：包含边界的 ISO 时间戳或 Unix 毫秒时间戳
- `--limit <count>`：activity 页面大小，范围为 1 到 500（默认为 `100`）；decision 页面大小范围为 1 到 100；使用 `--explain` 时，模糊 execution 候选页面大小范围为 1 到 50（默认为 `50`）
- `--cursor <sequence>`：继续获取 activity、decision 或模糊 execution 候选页面
- `--explain`：检查不可变的 execution identity 和 run-admission reasoning； 需要且只能指定 `--run` 或 `--execution` 其中之一，并且仅接受 `--limit`、 `--cursor` 和 `--json`
- `--json`：以 JSON 格式输出分页结果

CLI 会查询带版本的 activity RPC，因此一个命令就能显示完整的已配置 ledger。文本输出会显示时间、kind、direction、channel、status、 agent、run 和 action。缺失的 message provenance 会显示为 `-`；OpenClaw 不会虚构 agent 或 run ids。Tool actions 也会显示工具名称。JSON 输出在存在下一页时包含 `nextCursor`。将该值传给 `--cursor`，即可在分页过程中继续而不会重新排序新到达的记录。

这些导出即使没有消息正文和原始消息标识字段，仍然属于敏感的运维元数据。Agent、session 和 run ids、时间信息、 channels、结果以及稳定的 HMAC 引用都可能关联活动。请像对待其他操作员记录一样，使用相同的访问控制和保留实践来保护它们。

Gateway 会有意向其操作员域中拥有 `operator.read` 权限的每个客户端公开保留的 execution identity 诊断信息。该范围是受信任的只读边界，而不是面向恶意多租户的隔离机制。当操作员之间不应共享审计身份数据时，请使用独立的 Gateway 信任域。

## <a id="discover-and-explain-executions"></a> 发现并解释执行

每个获准的外部回合都会获得一个不透明的 `executionId`。`contextId` 标识其不可变的证据记录；现有的 `runId` 仍可能是共享的会话、路由或恢复关联标识。使用 `--run <id> --explain` 来发现保留的执行，而不是查询尽力而为的活动列表。一个匹配项会直接解析。多个匹配项会返回 `ambiguous`，列出最多 50 个候选项，并要求你明确选择其中一个：

```bash
openclaw audit --execution <execution-id> --explain
```

OpenClaw 绝不会静默选择第一个或最新的执行。精确文本视图会呈现以下部分：

1. **身份**：信任域、调用方、入口、代理主体、代理定义、运行时实例、所代表的主体以及发起方
2. **权限**：适用的授权和保证证据
3. **谱系**：父上下文，或明确的缺失、未知或不支持状态
4. **Decisions**：有界运行准入和权威操作决策收据，包括终端操作员批准和精确绑定的 cron 生命周期行。根据现有保留政策，独立审计事件和决策事实仍然可用； task/flow 生命周期联接已停用。
5. **缺失证据**和**后续步骤**

每个字段包括`present`、`absent`、`unknown`或`unsupported`； CLI 不会从会话密钥、设备 ID、显示名称或共享凭据推断用户。直接本地运行显示权威的 `local-cli` 入口、缺席的调用者和 `unattributed` 覆盖范围。它的录取收据上写着 `not-applicable`，因为没有证明身份识别政策或拨款评估。

当 `cron_run_receipts` 的 Cron 生命周期行的键控生命周期元数据携带精确的检查上下文和执行 ID 时，它们将显示为所有者本机、仅限归属的收据。它们包含状态和有界记录引用，而不是提示、任务目标、挂钩有效负载、路径或原始错误。他们的决定是 `not-applicable`，因为生命周期归因并不能证明授权。任务和流检查连接已停用，但它们现有的存储布局保持不变。新的迁移不会删除或复制独立的审计事件或决策事实。

将每个决策光标视为不透明：数字和 `a:`、`m:` 和 `g:` 值保持兼容。 Cron 页面可能会返回 `c:`。格式良好的历史 `t:` 或 `f:` 游标报告 `decision cursor is no longer retained; restart inspection without --cursor`。它不会为保留的源添加别名，也不会默默地启动另一个页面。

对于网关运行，解析的经过身份验证的配置文件可以使调用者成为 `present` 并覆盖 `attribution-only`。配对设备和共享凭证不会建立一个人：如果没有持久的配置文件，调用者就会缺席，或者当经过身份验证的用户证据承诺无法解析的配置文件时，会出现 `unknown`。会话创建保留实时解析的持久配置文件 ID，因此配置文件链接不会孤立所有权，而运行检查会消耗不可变的连接时间审核事实。普通会话来源不存储显示标签。显式启用审计存储后，可选的有界、秘密编辑标签只能保留在执行身份中。

允许的通道运行还可以显示化名的个人调用者。受信任的主动注册本机插件生成远程参与者事实；核心验证其确切记录、注册表纪元、范围和一次性切换。生成的 `boundary-verified` 保证描述了进程内边界，而不是对远程服务的独立核心查询。身份永远不会来自对话、房间、路线、帐户、线程、消息、传输、会话密钥或显示名称。仅当所有排队的输入都包含同一参与者的有效证据时，收集的运行才会显示该人；混合或缺失的证据表明调用者未知。仅当参与者影响每个贡献访问决策时，才会强制执行其 `channel/admission` 收据；否则仅归属。

对于通道入口，`unknown` 表示支持的集成无法提供有效的主机绑定证据；它绝不意味着允许。 `unsupported` 保留用于没有权威入口集成的命名路径。插件提供的发送方或结构复制的解析器结果无法升级任一状态。

终端批准显示显示 `allowed` 或 `denied`、其稳定原因代码、执行状态、已验证的生产者类别、策略和授权计数、使用的上下文字段以及补救措施。过期和取消的批准将被拒绝具有不同原因代码的不操作。仅当批准所有者记录该最终状态时，`no-route` 才是强制拒绝。腐败批准是 `unknown`。文本视图将经过验证的运营商批准生产者标记为保留 30 天的权威所有者本机 SQLite 记录。文本和 JSON 都不会公开原始源所有者、记录引用、策略引用或授予引用。 `enforced` 需要批准的不可变所有者本地绑定来准确匹配所选上下文、执行和运行。缺失、格式错误或不匹配的绑定报告 `operator_approval_execution_link_missing`、`operator_approval_execution_link_malformed` 或 `operator_approval_execution_link_mismatch`，覆盖范围未知且无资助参考文献。检查器永远不会根据 `runId`、会话元数据、时间戳或保留的执行次数重建该绑定。

出站消息接收区分持久生命周期，而不将传输进度视为授权：

- `message_queued`：共享交付队列接受托管。
- `message_platform_started`：通道适配器开始平台发送。
- `message_delivered`：适配器返回收件人可见的传递标识。
- `message_delivery_failed_<stage>` 或 `message_delivery_unknown_<stage>`：交付未取得成功；后缀标识重试之前的 `queue`、`platform_send` 或 `unknown` 阶段。
- `message_suppressed_<reason>`：所属钩子或有效负载规范化器故意不生成可见消息。

这些所有者本机记录始终为 `attribution-only`。队列和平台启动进度来自懒惰的 `outbound_message_progress` 同伴；最终结果保留在 `audit_events` 中。当承认的回合提供了一个时，两者仅保留主机验证的 context/execution/run 绑定。检查要求精确绑定，并且绝不将仅运行交付证据分配给来自 `runId` 的执行。绑定是诊断来源，而不是身份证明或授权交付的证明。仅当目标验证、消息策略和主动转向功能拒绝的确切元组被记录并且门改变结果时，才会出现 `enforced`。没有持久交付记录的可移植操作和早期抑制使用通用决策事实所有者，而不是复制交付状态。

插件、节点和工作人员收据使用相同的覆盖词汇表：

- A注册插件`before_tool_call`钩子allow/block，节点配对或能力决策，以及确切的工人credential/build/owner-epoch准入是`enforced`门。
- A 成功的节点结果或完成的插件拥有的运行是 `attribution-only`；成功永远不会将早期的门升级为授权证明。
- 在没有提供的节点回调的情况下返回的插件节点策略是 `unknown`，但缺少 `node.action_callback`。
- 完全在 ACP 或其他外部本机运行时内执行且没有 OpenClaw 预操作回调的操作会在承认的提示提交后生成 ACP-owner `unsupported` 收据，但缺少 `native.action_callback`。它没有声称有副作用。为适配器添加权威的native-action回调，以提供更有力的证据；成绩单或任务文本无法修复这一证据缺口。

这些通用收据不保留插件 ID、节点 ID、工作环境或会话 ID、凭证或构建哈希、令牌、命令、参数或原始错误文本。所有者本机批准、配对、放置和工作人员操作行不重复。

JSON 输出是网关的仅安全结果，无需有损重新格式化。精确结果包含一个有界 V1 上下文（最多 16 个 KiB）、最多 100 个 `decisionDisplays`、覆盖率和缺失证据代码以及可选的 `nextDecisionCursor`。相反，不明确的运行结果最多包含 50 个执行候选者和一个可选的 `nextExecutionCursor`。敏感域、运行时、调用者、保证、入口源和授权引用是安装本地 HMAC 投影。配置的代理 ID 和确切的运行 ID 保持可见，上下文和执行 ID 也是如此，因此重定向的输出仍然是私有操作员数据。

较旧的网关会生成带有 `gateway_upgrade_required` 的显式 `unsupported` 结果以及升级并重新运行下一步。 CLI 永远不会从旧审计行中重建身份。当前网关区分未知运行、不可用的预功能、禁用或失败的上下文写入、过期的上下文和损坏的上下文，而不声称缺少尽力而为的活动证明没有执行。当新承认的运行的有界身份信封在审计写入器队列中等待时，它也可能暂时不可用；运行或正常进程关闭后重试检查。准入从不等待编写器准备就绪、模式或 HMAC-key 初始化、SQLite 或持久性。

一旦上下文超过 30 天，CLI 就不会返回任何字段或链接的决策。当有界清理挂起时，结果是 `unsupported`，下一步是到期并重新运行。清理后，如果没有单独保留的活动，则可能会变成 `unknown`；这种缺席并不能证明挤兑事件没有发生。启动和每小时维护每个周期最多修剪 1,024 个身份上​​下文，并在禁用收集时继续。队列饱和、存储故障、清理失败、关闭超时或进程突然终止可能会丢失尽力而为的证据，但永远不会阻止或中止代理运行。当写入器生命周期允许时，正常网关和直接本地 CLI 关闭会刷新已接受的工作。

## <a id="recorded-events"></a> 记录的事件

网关收集八项操作的可信生命周期流：

- `agent.run.started`
- `agent.run.finished`
- `tool.action.started`
- `tool.action.finished`
- `message.inbound.processed`
- `message.outbound.queued`
- `message.outbound.platform-started`
- `message.outbound.finished`

活动分类帐返回运行、工具、入站消息和终端出站记录。非终结出站操作使用单独的进度所有者，并由 `--run ... --explain` 投影为决策接收；它们不会放置在与发布的读取器兼容的活动分类帐中。每个返回的活动记录都有一个稳定的事件 ID、单调递增的账本序列、生命周期时间戳、参与者、操作、状态、`schemaVersion: 1` 标记、源序列和 `redaction: "metadata_only"`。 Agent/session/run 出处和特定于事件的字段仅在可信来源提供时才会出现。消息记录有意省略 `sessionKey` 和 `sessionId`，因此 `--session` 仅过滤运行和工具记录。

终止态的 run 和 tool 记录通过已闭合状态和错误代码来区分成功、失败、取消、 超时和策略阻止。`unknown` 是一种显式的非成功结果，用于上游运行时未暴露权威终止结果的情况。工具调用 id 仅作为稳定指纹导出。工具名称必须匹配紧凑的、面向模型的名称契约；其他值将变为 `unknown`。

消息记录添加方向、通道、对话类型、结果和可选的传递类型、故障阶段、持续时间、结果计数、标准化原因代码和键入的 account/conversation/message/target 假名。当前的入站边界涵盖到达核心调度的已接受消息，包括核心副本和终端处理结果。出站边界将重放安全的 `queued` 和 `platform_started` 进度记录写入其惰性同伴，加上每个原始逻辑回复负载一个终端活动行，从而达到共享持久交付。分块和适配器扇出在终端 `resultCount` 中聚合。在确认、死信或协调使结果已知后，终端是 `sent`、`suppressed`、`failed` 或 `unknown`。绕过这些共享边界的插件本地和直接发送路径尚未涵盖；缺少一行并不证明不存在消息。

审计分类帐不会替换会话记录、Cron 运行历史记录或日志。它为操作员问题提供了一个小型交叉运行索引，而无需将对话内容复制到另一个存储中。

对于 inbound 行，`durationMs` 衡量核心分发，`resultCount` 统计已最终确定的排队 tool、block 和 reply 负载。对于 outbound 行， `durationMs` 包括直到其终止状态的投递所有权（因此也包括排队等待时间），而 `resultCount` 统计已识别的物理平台发送次数。`deliveryKind` 在存在时，描述的是钩子处理后、渲染后的有效负载；被抑制和崩溃歧义的行会省略它。

## <a id="gateway-rpc"></a> 网关 RPC

`audit.activity.list` 需要 `operator.read` 并接受相同的过滤器。它返回名为 V1 的活动事件联合，包括运行、工具、入站消息和终端出站消息记录。

```bash
openclaw gateway call audit.activity.list --params '{"channel":"telegram","limit":50}'
```

结果为 `{ "events": AuditActivityEventV1[], "nextCursor"?: string }`。 结果按最新优先排序，并且每次请求限制为 500 条记录。

`audit.run.inspect` 同样需要 `operator.read`：

```bash
openclaw gateway call audit.run.inspect \
  --params '{"runId":"8c69f72e-8b11-4c54-98d5-1a3dd67450c3","decisionLimit":50}'

openclaw gateway call audit.run.inspect \
  --params '{"executionId":"5da4c4c3-e1c9-4c95-a17d-6e5c10fd45cf","decisionLimit":50}'
```

其结果是 `{ "schemaVersion": 1, "run": ..., "identity": ..., "decisionDisplays": ..., "coverage": ..., "nextDecisionCursor"?: ..., "nextExecutionCursor"?: ... }`。所需的 `decisionDisplays` 数组是唯一的收据呈现字段。原始所有者收据和 `decisions` 密钥永远不会跨越网关边界。关闭的请求恰好接受 `executionId` 或 `runId` 之一。 `decisionLimit` 为 1–100，`decisionCursor` 为可选。运行发现还接受 1–50 的 `executionLimit` 和可选的 `executionCursor`。具有多个保留执行的运行返回类型化的 `ambiguous` 身份状态并且没有身份上下文；在调用者选择执行 ID 之前，其所需的 `decisionDisplays` 数组为空。对于一个选定的上下文，收据分页从准入开始，然后读取所有者本地终端批准，合并出站进度和终端记录，然后读取通用事实和 cron 生命周期所有者。完整的顺序是准入、批准、消息、通用，然后是 cron。合并顺序在重新启动后保持不变。当游标的确切所有者行已过期时，游标将被拒绝。批准和消息选择器使用从同一所有者查询快照创建的不透明 `approval-decision:` 和 `message-decision:` 命名空间；原始收据、解决方案和事件标识符永远不会成为选择器。批准和交付检验决不写通用重复项。通用事实写入和投影还需要完整的上下文、执行和运行元组以匹配不可变的执行上下文。

活动分类账仍然尽力而为。相比之下，返回的批准收据来自权威的第一个答案获胜批准行，返回的通用收据来自附加的不可变决策事实表。所有三个表面均使用 30 天保留期，但活动分类账中的缺席不能证明未发生批准或操作。通用事实传递也是尽力而为的，直到其有界队列写入持久化该行；所有者本机批准持久性不使用该队列。

对于较旧的 run/tool 客户端，已发货的 `audit.list` RPC 保持不变。当 `audit.activity.list` 在较旧的网关上不可用时，仅当该旧方法支持每个请求的过滤器时，CLI 才会重试 `audit.list`。 `--kind message`、`--direction` 和 `--channel` 在较旧的网关上失败并显示升级消息，而不是被静默丢弃。

## <a id="related"></a> 相关内容

- [审计历史](/gateway/audit)
- [网关协议](/gateway/protocol/ledgers#audit-ledger-rpc)
- [会话](/cli/sessions)
- [定时任务](/automation/cron-jobs)
