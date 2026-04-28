---
summary: "`openclaw cron` 的 CLI 参考（调度和运行后台作业）"
read_when:
  - 你想要计划任务和唤醒
  - 你正在调试 cron 执行和日志
title: "Cron"
---

# `openclaw cron`

管理网关调度器的 cron 作业。

<Tip>
运行 `openclaw cron --help` 查看完整命令范围。有关概念性指南，请参见 [Cron 作业](/automation/cron-jobs)。
</Tip>

## 会话

`--session` 接受 `main`、`isolated`、`current` 或 `session:<id>`。

<AccordionGroup>
  <Accordion title="会话键">
    - `main` 绑定到代理的主会话。
    - `isolated` 为每次运行创建一个新的转录和会话 id。
    - `current` 绑定到创建时的活动会话。
    - `session:<id>` 固定到显式的持久会话键。
  </Accordion>
  <Accordion title="孤立会话语义">
    孤立运行会重置环境对话上下文。通道和分组路由、发送/队列策略、提升、来源以及 ACP 运行时绑定都会为新的运行重置。安全偏好以及用户明确选择的模型或认证覆盖可以在运行之间保留。
  </Accordion>
</AccordionGroup>

## 发送

`openclaw cron list` 和 `openclaw cron show <job-id>` 会预览解析后的发送路径。对于 `channel: "last"`，预览会显示该路径是从主会话还是当前会话解析而来，或者是否会失败关闭。

<Note>
孤立的 `cron add` 作业默认使用 `--announce` 发送。使用 `--no-deliver` 可保持输出在内部。`--deliver` 仍作为 `--announce` 的弃用别名保留。
</Note>

### 发送所有权

孤立 cron 聊天发送由代理和运行器共同承担：

- 当可用聊天路由时，代理可以使用 `message` 工具直接发送。
- `announce` 仅在代理未直接发送到解析后的目标时，才作为最终回复的回退发送。
- `webhook` 会将完成后的负载发送到某个 URL。
- `none` 会禁用运行器回退发送。

`--announce` 是最终回复的运行器回退发送。`--no-deliver` 会禁用该回退，但不会在存在聊天路由时移除代理的 `message` 工具。

从活动聊天创建的提醒会保留实时聊天发送目标，以便进行回退 announce 发送。内部会话键可能是小写；不要把它们当作区分大小写的提供方 ID 的真实来源，例如 Matrix 房间 ID。

### 失败发送

失败通知按以下顺序解析：

1. 作业上的 `delivery.failureDestination`。
2. 全局 `cron.failureDestination`。
3. 作业的主 announce 目标（当未设置明确的失败目标时）。

<Note>
主会话作业只有在主发送模式为 `webhook` 时才能使用 `delivery.failureDestination`。孤立作业在所有模式下都接受它。
</Note>

注意：孤立 cron 运行会将运行级代理失败视为作业错误，即使
未生成任何回复负载也是如此，因此模型/提供方失败仍会增加错误
计数并触发失败通知。

## 调度

### 一次性作业

`--at <datetime>` 会调度一次性运行。若未提供时区，省略偏移量的 datetime 将被视为 UTC；如果同时传入 `--tz <iana>`，则会按给定时区解释该墙上时间。

<Note>
一次性作业在成功后默认删除。使用 `--keep-after-run` 可保留它们。
</Note>

### 重复作业

重复作业在连续错误后使用指数重试退避：30 秒、1 分钟、5 分钟、15 分钟、60 分钟。下一次成功运行后，计划会恢复正常。

跳过的运行会单独记录，不计入执行错误。它们不会影响重试退避，但 `openclaw cron edit <job-id> --failure-alert-include-skipped` 可以让失败提醒包含重复跳过运行的通知。

注意：cron 作业定义保存在 `jobs.json` 中，而待处理的运行时状态保存在 `jobs-state.json` 中。如果 `jobs.json` 被外部编辑，Gateway 会重新加载已更改的计划并清除过时的待处理插槽；仅格式化性质的重写不会清除待处理插槽。

### 手动运行

`openclaw cron run` 会在手动运行排队后立即返回。成功响应包含 `{ ok: true, enqueued: true, runId }`。使用 `openclaw cron runs --id <job-id>` 跟踪最终结果。

<Note>
`openclaw cron run <job-id>` 默认强制运行。使用 `--due` 可保留旧的“仅在到期时运行”行为。
</Note>

## 模型

`cron add|edit --model <ref>` 会为作业选择一个允许的模型。

<Warning>
如果模型不被允许，cron 会发出警告并回退到作业的代理或默认模型选择。
</Warning>

Cron 的 `--model` 是作业主项，而不是聊天会话的 `/model` 覆盖。这意味着：

- 当所选作业模型失败时，仍会应用已配置的模型回退。
- 当存在时，按作业负载提供的 `fallbacks` 会替换已配置的回退列表。
- 空的按作业回退列表（作业负载/API 中的 `fallbacks: []`）会使 cron 运行变为严格模式。
- 当作业有 `--model` 但未配置回退列表时，OpenClaw 会显式传入空回退覆盖，因此不会将代理主项作为隐藏重试目标附加。

### 孤立 cron 的模型优先级

孤立 cron 会按以下顺序解析活动模型：

1. Gmail-hook 覆盖。
2. 按作业的 `--model`。
3. 存储的 cron 会话模型覆盖（当用户选择了一个时）。
4. 代理或默认模型选择。

### 快速模式

孤立 cron 快速模式遵循已解析的实时模型选择。模型配置 `params.fastMode` 默认适用，但存储的会话 `fastMode` 覆盖仍然优先于配置。

### 实时模型切换重试

如果孤立运行抛出 `LiveSessionModelSwitchError`，cron 会在重试之前为活动运行持久化切换后的提供方和模型（以及存在时切换后的认证配置覆盖）。外层重试循环在初始尝试后最多进行两次切换重试，然后会中止，而不是无限循环。

## 运行输出和拒绝

### 过时确认抑制

孤立 cron 会抑制过时的仅确认回复。如果第一个结果只是一个中间状态更新，并且没有任何子代理后代运行负责最终答案，那么 cron 会在发送前重新提示一次以获取真实结果。

### 静默令牌抑制

如果孤立 cron 运行只返回静默令牌（`NO_REPLY` 或 `no_reply`），cron 会同时抑制直接外发和回退排队摘要路径，因此不会向聊天发回任何内容。

### 结构化拒绝

孤立 cron 运行会优先使用嵌入运行中的结构化执行拒绝元数据，然后再回退到最终输出中的已知拒绝标记，例如 `SYSTEM_RUN_DENIED`、`INVALID_REQUEST` 以及审批绑定拒绝短语。

`cron list` 和运行历史会显示拒绝原因，而不是把被阻止的命令报告为 `ok`。

## 保留

保留和清理由配置控制：

- `cron.sessionRetention`（默认 `24h`）会清理已完成的孤立运行会话。
- `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 会清理 `~/.openclaw/cron/runs/<jobId>.jsonl`。

## 迁移旧作业

<Note>
如果你有来自当前发送和存储格式之前的 cron 作业，请运行 `openclaw doctor --fix`。Doctor 会规范化旧的 cron 字段（`jobId`、`schedule.cron`、顶层发送字段包括旧的 `threadId`、负载 `provider` 发送别名），并在配置了 `cron.webhook` 时，将简单的 `notify: true` webhook 回退作业迁移为显式的 webhook 发送。
</Note>

在不更改消息内容的情况下更新发送设置：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

禁用孤立作业的发送功能：

```bash
openclaw cron edit <job-id> --no-deliver
```

为孤立作业启用轻量级引导上下文：

```bash
openclaw cron edit <job-id> --light-context
```

向指定频道宣布：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

创建带轻量级引导上下文的孤立作业：

```bash
openclaw cron add \
  --name "轻量级晨间简报" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "请总结昨夜的更新。" \
  --light-context \
  --no-deliver
```

`--light-context` 仅适用于孤立代理轮次作业。对于 cron 运行，轻量级模式保持引导上下文为空，而不是注入完整的工作区引导集。

## 常用管理命令

手动运行和检查：

```bash
openclaw cron list
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

`cron runs` 条目包含发送诊断信息，包括预期的 cron 目标、解析后的目标、message-tool 发送、回退使用情况以及已发送状态。

代理和会话重定向：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

交付调整：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## 相关内容

- [CLI 参考](/cli)
- [计划任务](/automation/cron-jobs)
