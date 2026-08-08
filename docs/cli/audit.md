---
summary: "CLI 参考：仅元数据的运行、工具和消息生命周期审计记录"
read_when:
  - 你需要回答某个代理或工具是谁运行的、何时运行以及如何结束
  - 你需要不包含内容的入站或出站消息生命周期元数据
  - 你需要一个有界、可脱敏的活动导出
title: "审计记录"
---

# `openclaw audit`

查询 Gateway 仅包含元数据的活动账本，发现共享运行关联的执行，或检查某个确切代理执行的不可变身份上下文。

运行和工具活动记录默认启用。执行身份在全新安装和升级中默认单独禁用。请显式启用：

```bash
openclaw config set logging.audit.executionIdentity true
openclaw gateway restart
```

身份收集要求 `logging.audit.enabled` 保持启用状态。
消息记录也默认单独禁用；将 `logging.audit.messages` 设置为 `direct` 或 `all`，并重启 Gateway 以记录消息。现有记录在过期前（30 天内）仍可查询。

直接本地命令使用与 Gateway 相同的有界写入器生命周期。
`openclaw agent exec` 默认会删除其临时状态目录，因此其审计证据会与该隔离运行的其余内容一同被有意丢弃。
当运行状态必须保留时，请使用 `agent exec --state-dir <dir>`，并通过使用同一状态目录的 Gateway 对其进行检查。

该账本与会话记录不同：它记录身份、顺序、来源、操作、状态以及规范化的结果代码，但从不存储内容，而消息标识符仅以安装本地的带密钥伪名出现。[审计历史](/gateway/audit)负责完整的数据模型、隐私语义、存储/保留边界和覆盖范围限制；本页介绍命令界面。

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

## 过滤器

- `--agent <id>`：精确的 agent id
- `--session <key>`：精确的 session key
- `--run <id>`：精确的 run id；除非同时设置了 `--explain`，否则筛选 activity
- `--execution <id>`：精确的 execution id；需要使用 `--explain`
- `--kind <kind>`：`agent_run`、`tool_action` 或 `message`
- `--status <status>`：`started`、`succeeded`、`failed`、`cancelled`、
  `timed_out`、`blocked` 或 `unknown`
- `--direction <direction>`：消息方向，`inbound` 或 `outbound`
- `--channel <channel>`：精确的消息 channel
- `--after <timestamp>` / `--before <timestamp>`：包含边界的 ISO 时间戳或
  Unix 毫秒时间戳
- `--limit <count>`：activity 页面大小，范围为 1 到 500（默认为 `100`）；decision
  页面大小范围为 1 到 100；使用 `--explain` 时，模糊 execution 候选页面大小范围为 1
  到 50（默认为 `50`）
- `--cursor <sequence>`：继续获取 activity、decision 或模糊
  execution 候选页面
- `--explain`：检查不可变的 execution identity 和 run-admission reasoning；
  需要且只能指定 `--run` 或 `--execution` 其中之一，并且仅接受 `--limit`、
  `--cursor` 和 `--json`
- `--json`：以 JSON 格式输出分页结果

CLI 会查询带版本的 activity RPC，因此一个命令就能显示完整的
已配置 ledger。文本输出会显示时间、kind、direction、channel、status、
agent、run 和 action。缺失的 message provenance 会显示为 `-`；OpenClaw
不会虚构 agent 或 run ids。Tool actions 也会显示工具名称。JSON
输出在存在下一页时包含 `nextCursor`。将该值传给
`--cursor`，即可在分页过程中继续而不会重新排序新到达的记录。

这些导出即使没有消息正文和原始消息标识字段，仍然属于敏感的运维元数据。Agent、session 和 run ids、时间信息、
channels、结果以及稳定的 HMAC 引用都可能关联活动。请像对待其他操作员记录一样，使用相同的访问控制和保留实践来保护它们。

Gateway 会有意向其操作员域中拥有 `operator.read` 权限的每个客户端公开保留的 execution identity 诊断信息。该范围是受信任的只读边界，而不是面向恶意多租户的隔离机制。当操作员之间不应共享审计身份数据时，请使用独立的 Gateway 信任域。

## 发现并解释执行

每个获准的外部回合都会获得一个不透明的 `executionId`。`contextId`
标识其不可变的证据记录；现有的 `runId` 仍可能是共享的会话、路由或恢复关联标识。使用 `--run <id>
--explain` 来发现保留的执行，而不是查询尽力而为的活动列表。一个匹配项会直接解析。多个匹配项会返回
`ambiguous`，列出最多 50 个候选项，并要求你明确选择其中一个：

```bash
openclaw audit --execution <execution-id> --explain
```

OpenClaw 绝不会静默选择第一个或最新的执行。精确文本视图会呈现以下部分：

1. **身份**：信任域、调用方、入口、代理主体、代理定义、运行时实例、所代表的主体以及发起方。
2. **权限**：适用的授权和保证证据。
3. **溯源**：父级上下文，或明确的缺失、未知或不支持状态。
4. **决策**：有界的运行准入回执页。
5. **缺失证据**和**后续步骤**。

每个字段都包含 `present`、`absent`、`unknown` 或 `unsupported`；CLI 不会根据会话密钥、设备 ID、显示名称或共享凭据推断用户。直接本地运行当前会显示权威的
`local-cli` 入口、缺失的调用方，以及
`unattributed` 覆盖范围。其准入回执显示为
`not-applicable`，因为没有证明存在基于身份的策略或授权评估。

JSON 输出是 Gateway 结果，未经过有损重新格式化。精确结果包含一个有界的 V1 上下文（最大 16 KiB）、最多 100 个决策回执、覆盖范围和缺失证据代码，以及可选的
`nextDecisionCursor`。不明确的运行结果则包含最多 50 个执行候选项，以及可选的
`nextExecutionCursor`。敏感的域、运行时、调用方、保证、入口来源和授权引用均为安装本地的 HMAC 投影。已配置的代理 ID 和确切的运行 ID 仍然可见，上下文 ID 和执行 ID 也同样可见，因此重定向的输出仍属于私有操作员数据。

较旧的 Gateway 会产生带有
`gateway_upgrade_required` 的明确 `unsupported` 结果，并给出升级后重新运行的后续步骤。CLI 绝不会从旧版审计行重建身份。当前的 Gateway 会区分未知运行、功能尚不可用、已禁用或上下文写入失败、上下文已过期，以及上下文损坏等情况；不会声称缺失的尽力而为活动证明执行从未发生。新近获准的运行也可能暂时不可用，因为其有界身份信封正在等待进入审计写入器队列；请在运行结束后或正常进程关闭后重试检查。准入过程绝不会等待写入器就绪、架构或 HMAC 密钥初始化、SQLite 或持久化完成。

一旦上下文超过 30 天，CLI 不会从其中返回任何字段或准入决策。在有界清理待处理期间，结果为
`unsupported`，并给出过期后重新运行的后续步骤。清理完成后，如果没有其他单独保留的活动记录，它可能变为
`unknown`；这种缺失并不能证明运行未曾发生。启动时和每小时的维护任务每个周期最多清理 1,024 个身份上下文，即使收集功能被禁用也会继续执行。队列饱和、工作线程或存储故障、清理失败，或进程突然终止，都可能丢失尽力而为的证据，但绝不会阻塞或中止代理运行。正常的 Gateway 和直接本地 CLI 关闭会在其写入器生命周期允许的情况下刷新已接受的工作。

## 记录的事件

网关将受信任的生命周期流投影为六种动作：

- `agent.run.started`
- `agent.run.finished`
- `tool.action.started`
- `tool.action.finished`
- `message.inbound.processed`
- `message.outbound.finished`

每条返回记录都具有稳定的事件 id、单调递增的账本
sequence、生命周期时间戳、actor、action、status、
`schemaVersion: 1` 标记、源 sequence 以及 `redaction: "metadata_only"`。
仅当受信任来源提供时，才会包含 Agent/session/run 来源信息和事件特定字段。消息记录会有意省略
`sessionKey` 和 `sessionId`，因此 `--session` 只会筛选 run 和 tool 记录。

终止态的 run 和 tool 记录通过已闭合状态和错误代码来区分成功、失败、取消、
超时和策略阻止。`unknown` 是一种显式的非成功结果，用于上游运行时未暴露权威终止结果的情况。工具调用 id 仅作为稳定指纹导出。工具名称必须匹配紧凑的、面向模型的名称
契约；其他值将变为 `unknown`。

消息记录会补充方向、通道、会话类型、结果，以及可选的投递类型、失败阶段、持续时间、结果数量、标准化原因代码和带键的 account/conversation/message/target 伪名。当前的 inbound 边界涵盖到达核心分发的已接受消息，
包括核心重复处理和终止处理结果。outbound 边界会为每个到达共享持久投递的原始逻辑回复负载写入一条终止行；
分块和适配器扇出会在 `resultCount` 中聚合。排队重试或含糊不清的发送，仅在确认、死信或对账使结果终止后才会记录。绕过这些共享边界的插件本地和直接发送路径尚未覆盖；没有记录并不证明不存在消息。

审计账本并不取代 transcripts、task history、cron run history
或 logs。它提供了一个小型的跨运行索引，便于运维人员提问，而不会把会话内容复制到另一个存储中。

对于 inbound 行，`durationMs` 衡量核心分发，`resultCount` 统计已最终确定的排队 tool、block 和 reply 负载。对于 outbound 行，
`durationMs` 包括直到其终止状态的投递所有权（因此也包括排队等待时间），而 `resultCount` 统计已识别的物理平台发送次数。`deliveryKind` 在存在时，描述的是钩子处理后、渲染后的有效负载；被抑制和崩溃歧义的行会省略它。

## 网关 RPC

`audit.activity.list` 需要 `operator.read`，并接受相同的筛选条件。它
返回命名的 V1 活动事件联合类型，包括 run、tool、inbound-message
和 outbound-message 记录。

```bash
openclaw gateway call audit.activity.list --params '{"channel":"telegram","limit":50}'
```

结果为 `{ "events": AuditActivityEventV1[], "nextCursor"?: string }`。
结果按最新优先排序，并且每次请求限制为 500 条记录。

`audit.run.inspect` 同样需要 `operator.read`：

```bash
openclaw gateway call audit.run.inspect \
  --params '{"runId":"8c69f72e-8b11-4c54-98d5-1a3dd67450c3","decisionLimit":50}'

openclaw gateway call audit.run.inspect \
  --params '{"executionId":"5da4c4c3-e1c9-4c95-a17d-6e5c10fd45cf","decisionLimit":50}'
```

其结果为 `{ "schemaVersion": 1, "run": ..., "identity": ..., "decisions":
..., "coverage": ..., "nextDecisionCursor"?: ..., "nextExecutionCursor"?: ... }`。
该请求必须且只能接受 `executionId` 或 `runId` 中的一个。
`decisionLimit` 的取值范围为 1–100，`decisionCursor` 为可选项。运行发现还
接受取值范围为 1–50 的 `executionLimit`，以及可选的
`executionCursor`。包含多个保留执行记录的运行会返回类型化的
`ambiguous` 身份状态；在调用方选择执行 ID 之前，不会返回身份上下文或决策。

为兼容旧版运行/工具客户端，已发布的 `audit.list` RPC 保持不变。当
较旧的 Gateway 不支持 `audit.activity.list` 时，CLI 仅在所请求的每个筛选条件
都受该旧方法支持的情况下重试 `audit.list`。在较旧的 Gateway 上，`--kind message`、
`--direction` 和 `--channel` 会提示升级，而不会被静默丢弃。

## 相关

- [审计历史](/gateway/audit)
- [网关协议](/gateway/protocol#audit-ledger-rpc)
- [会话](/cli/sessions)
- [任务](/cli/tasks)
- [定时任务](/automation/cron-jobs)
