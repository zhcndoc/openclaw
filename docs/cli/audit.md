---
summary: "CLI 参考：仅元数据的运行、工具和消息生命周期审计记录"
read_when:
  - 你需要回答某个代理或工具是谁运行的、何时运行以及如何结束
  - 你需要不包含内容的入站或出站消息生命周期元数据
  - 你需要一个有界、可脱敏的活动导出
title: "审计记录"
---

# `openclaw audit`

查询 Gateway 的仅元数据审计账本，获取代理运行、工具操作以及可选的消息生命周期记录。

该账本默认对运行和工具事件开启。设置
[`logging.audit.enabled: false`](/gateway/configuration-reference#audit) 并
重启 Gateway，以停止所有新的事件记录。消息记录
默认单独禁用；将 `logging.audit.messages` 设置为 `direct` 或
`all` 并重启 Gateway 以记录它们。现有记录在过期前仍可查询（30 天）。

该账本与会话记录不同：它记录身份、顺序、来源、操作、状态以及规范化的结果代码，但从不存储内容，而消息标识符仅以安装本地的带密钥伪名出现。[审计历史](/gateway/audit)负责完整的数据模型、隐私语义、存储/保留边界和覆盖范围限制；本页介绍命令界面。

```bash
openclaw audit
openclaw audit --agent main --status failed
openclaw audit --session "agent:main:main" --after 2026-07-01T00:00:00Z
openclaw audit --run 8c69f72e-8b11-4c54-98d5-1a3dd67450c3
openclaw audit --kind tool_action --limit 50 --json
openclaw audit --kind message --direction outbound --channel telegram --json
```

## 过滤器

- `--agent <id>`：精确的 agent id
- `--session <key>`：精确的 session key
- `--run <id>`：精确的 run id
- `--kind <kind>`：`agent_run`、`tool_action` 或 `message`
- `--status <status>`：`started`、`succeeded`、`failed`、`cancelled`、
  `timed_out`、`blocked` 或 `unknown`
- `--direction <direction>`：消息方向，`inbound` 或 `outbound`
- `--channel <channel>`：精确的消息 channel
- `--after <timestamp>` / `--before <timestamp>`：包含边界的 ISO 时间戳或
  Unix 毫秒
- `--limit <count>`：每页大小，范围 1 到 500；默认 `100`
- `--cursor <sequence>`：继续之前按最新优先排序的查询
- `--json`：将受限页打印为 JSON

CLI 会查询带版本的 activity RPC，因此一个命令就能显示完整的
已配置 ledger。文本输出会显示时间、kind、direction、channel、status、
agent、run 和 action。缺失的 message provenance 会显示为 `-`；OpenClaw
不会虚构 agent 或 run ids。Tool actions 也会显示工具名称。JSON
输出在存在下一页时包含 `nextCursor`。将该值传给
`--cursor`，即可在分页过程中继续而不会重新排序新到达的记录。

这些导出即使没有消息正文和原始消息标识字段，仍然属于敏感的运维元数据。Agent、session 和 run ids、时间信息、
channels、结果以及稳定的 HMAC 引用都可能关联活动。请像对待其他操作员记录一样，使用相同的访问控制和保留实践来保护它们。

## 记录的事件

Gateway 将受信任的生命周期流投影为六种动作：

- `agent.run.started`
- `agent.run.finished`
- `tool.action.started`
- `tool.action.finished`
- `message.inbound.processed`
- `message.outbound.finished`

每条返回记录都具有稳定的 event id、单调递增的 ledger
sequence、生命周期时间戳、actor、action、status、
`schemaVersion: 1` 标记、source sequence 以及 `redaction: "metadata_only"`。
仅当受信任来源提供时，才会包含 Agent/session/run 来源信息和事件特定字段。消息记录会有意省略
`sessionKey` 和 `sessionId`，因此 `--session` 只会筛选 run 和 tool 记录。

终止态的 run 和 tool 记录通过已闭合状态和错误代码来区分成功、失败、取消、
超时和策略阻止。`unknown` 是一种显式的非成功结果，用于上游运行时未暴露权威终止结果的情况。Tool 调用 id 仅作为稳定指纹导出。Tool 名称必须匹配紧凑的、面向模型的名称
契约；其他值将变为 `unknown`。

消息记录会补充方向、通道、会话类型、结果，以及可选的投递类型、失败阶段、持续时间、结果数量、标准化原因代码和带键的 account/conversation/message/target 伪名。当前的 inbound 边界涵盖到达核心分发的已接受消息，
包括核心重复处理和终止处理结果。outbound 边界会为每个到达共享持久投递的原始逻辑回复负载写入一条终止行；
分块和适配器扇出会在 `resultCount` 中聚合。排队重试或含糊不清的发送，仅在确认、死信或对账使结果终止后才会记录。绕过这些共享边界的插件本地和直接发送路径尚未覆盖；没有记录并不证明不存在消息。

审计账本并不取代 transcripts、task history、cron run history
或 logs。它提供了一个小型的跨运行索引，便于运维人员提问，而不会把会话内容复制到另一个存储中。

对于 inbound 行，`durationMs` 衡量核心分发，`resultCount` 统计已最终确定的排队 tool、block 和 reply 负载。对于 outbound 行，
`durationMs` 包括直到其终止状态的投递所有权（因此也包括排队等待时间），而 `resultCount` 统计已识别的物理平台发送次数。`deliveryKind` 在存在时，描述的是 hook 后、render 后的有效负载；被抑制和 crash-ambiguous 的行会省略它。

## 网关 RPC

`audit.activity.list` 需要 `operator.read`，并接受相同的筛选条件。它
返回命名的 V1 活动事件联合类型，包括 run、tool、inbound-message
和 outbound-message 记录。

```bash
openclaw gateway call audit.activity.list --params '{"channel":"telegram","limit":50}'
```

结果为 `{ "events": AuditActivityEventV1[], "nextCursor"?: string }`。
结果按最新优先排序，并且每次请求限制为 500 条记录。

随附的 `audit.list` RPC 对于旧版 run/tool 客户端保持不变。当
`audit.activity.list` 在旧版 Gateway 上不可用时，CLI 仅在所有请求的筛选条件都被该旧方法支持的情况下才会重试
`audit.list`。`--kind message`、`--direction` 和 `--channel` 在旧版 Gateway 上会返回升级提示，
而不是被静默丢弃。

## 相关

- [审计历史](/gateway/audit)
- [网关协议](/gateway/protocol#audit-ledger-rpc)
- [会话](/cli/sessions)
- [任务](/cli/tasks)
- [定时任务](/automation/cron-jobs)
