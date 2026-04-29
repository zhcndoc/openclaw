---
summary: "CLI 参考：`openclaw cron`（调度并运行后台作业）"
read_when:
  - 你想要了解计划任务和唤醒
  - 你正在排查 cron 执行和日志
title: "Cron"
---

# `openclaw cron`

管理 Gateway 调度器的 cron 作业。

<Tip>
运行 `openclaw cron --help` 查看完整命令集合。参见 [Cron jobs](/automation/cron-jobs) 获取概念性指南。
</Tip>

## Sessions

`--session` 接受 `main`、`isolated`、`current` 或 `session:<id>`。

<AccordionGroup>
  <Accordion title="Session keys">
    - `main` 绑定到代理的主会话。
    - `isolated` 为每次运行创建一个新的转录和会话 id。
    - `current` 绑定到创建时的活动会话。
    - `session:<id>` 固定到一个显式的持久会话键。

  </Accordion>
  <Accordion title="Isolated session semantics">
    隔离运行会重置环境会话上下文。通道和组路由、发送/排队策略、提升、来源以及 ACP 运行时绑定都会为新运行重置。安全偏好，以及用户显式选择的模型或身份验证覆盖，可以跨运行保留。
  </Accordion>
</AccordionGroup>

## Delivery

`openclaw cron list` 和 `openclaw cron show <job-id>` 会预览解析后的投递路由。对于 `channel: "last"`，预览会显示路由是从主会话还是当前会话解析得到的，或者是否会失败并关闭。

<Note>
隔离的 `cron add` 作业默认使用 `--announce` 投递。使用 `--no-deliver` 可让输出保持内部。`--deliver` 仍保留为已弃用的 `--announce` 别名。
</Note>

### Delivery ownership

隔离 cron 聊天投递由代理和运行器共同负责：

- 当可用聊天路由时，代理可以使用 `message` 工具直接发送。
- `announce` 仅在代理没有直接发送到已解析目标时，才会回退投递最终回复。
- `webhook` 会将完成后的负载发布到一个 URL。
- `none` 会禁用运行器回退投递。

`--announce` 是最终回复的运行器回退投递。`--no-deliver` 会禁用该回退，但当可用聊天路由存在时，不会移除代理的 `message` 工具。

从活动聊天创建的提醒会保留实时聊天投递目标，用于回退 announce 投递。内部会话键可能是小写；不要把它们当作区分大小写的提供方 ID 的真实来源，例如 Matrix 房间 ID。

### Failure delivery

失败通知按以下顺序解析：

1. 作业上的 `delivery.failureDestination`。
2. 全局 `cron.failureDestination`。
3. 作业的主 announce 目标（当未设置显式失败目标时）。

<Note>
主会话作业仅在主投递模式为 `webhook` 时才可使用 `delivery.failureDestination`。隔离作业在所有模式下都接受它。
</Note>

注意：隔离 cron 运行会将运行级代理失败视为作业错误，即使
没有生成回复负载，因此模型/提供方失败仍会增加错误
计数并触发失败通知。

## Scheduling

### One-shot jobs

`--at <datetime>` 会调度一次性运行。没有偏移量的 datetime 会被视为 UTC，除非你同时传入 `--tz <iana>`，此时会按给定时区解释墙上时钟时间。

<Note>
一次性作业默认在成功后删除。使用 `--keep-after-run` 可保留它们。
</Note>

### Recurring jobs

循环作业在连续错误后使用指数退避重试：30 秒、1 分钟、5 分钟、15 分钟、60 分钟。下一次成功运行后，计划会恢复正常。

跳过的运行会与执行错误单独跟踪。它们不会影响重试退避，但 `openclaw cron edit <job-id> --failure-alert-include-skipped` 可以让失败告警包含重复的跳过运行通知。

对于目标为本地已配置模型提供方的隔离作业，cron 会在启动代理回合前执行一次轻量级的提供方预检。Loopback、私有网络以及 `.local` 的 `api: "ollama"` 提供方会在 `/api/tags` 上探测；像 vLLM、SGLang 和 LM Studio 这样的本地 OpenAI 兼容提供方会在 `/models` 上探测。如果端点不可达，该运行会被记录为 `skipped` 并在之后的计划中重试；匹配的失效端点会缓存 5 分钟，以避免大量作业反复轰击同一台本地服务器。

注意：cron 作业定义位于 `jobs.json`，而待处理的运行时状态位于 `jobs-state.json`。如果 `jobs.json` 被外部编辑，Gateway 会重新加载已变更的计划并清除过期的待处理槽位；仅格式化层面的重写不会清除待处理槽位。

### Manual runs

`openclaw cron run` 会在手动运行排队后立即返回。成功响应包含 `{ ok: true, enqueued: true, runId }`。使用 `openclaw cron runs --id <job-id>` 跟踪最终结果。

<Note>
`openclaw cron run <job-id>` 默认强制运行。使用 `--due` 可保留旧的“仅在到期时运行”行为。
</Note>

## Models

`cron add|edit --model <ref>` 会为作业选择一个允许的模型。

<Warning>
如果模型不被允许或无法解析，cron 会以明确的验证错误使运行失败，而不是回退到作业的代理或默认模型选择。
</Warning>

Cron `--model` 是一个 **作业主项**，不是聊天会话的 `/model` 覆盖。这意味着：

- 当所选作业模型失败时，已配置的模型回退仍然适用。
- 当存在时，按作业负载的 `fallbacks` 会替换已配置的回退列表。
- 空的按作业回退列表（作业负载/API 中的 `fallbacks: []`）会使 cron 运行保持严格。
- 当作业有 `--model` 但未配置回退列表时，OpenClaw 会传递一个显式的空回退覆盖，因此不会把代理主项作为隐藏的重试目标附加进去。

### Isolated cron model precedence

隔离 cron 按以下顺序解析活动模型：

1. Gmail-hook 覆盖。
2. 按作业的 `--model`。
3. 存储的 cron 会话模型覆盖（当用户选择了一个时）。
4. 代理或默认模型选择。

### Fast mode

隔离 cron 的快速模式遵循已解析的实时模型选择。模型配置 `params.fastMode` 默认适用，但存储的会话 `fastMode` 覆盖仍会优先于配置。

### Live model switch retries

如果隔离运行抛出 `LiveSessionModelSwitchError`，cron 会在重试之前，为活动运行持久化切换后的提供方和模型（以及存在时切换后的 auth profile 覆盖）。外层重试循环在初始尝试后最多进行两次切换重试，然后会中止而不是无限循环。

## Run output and denials

### Stale acknowledgement suppression

隔离 cron turn 会抑制过时的仅确认回复。如果第一个结果只是一个中间状态更新，并且没有后代子代理运行负责最终答案，cron 会在投递前重新提示一次以获取真实结果。

### Silent token suppression

如果隔离 cron 运行只返回静默 token（`NO_REPLY` 或 `no_reply`），cron 会同时抑制直接外发投递和回退队列摘要路径，因此不会向聊天回传任何内容。

### Structured denials

隔离 cron 运行会优先使用嵌入运行中的结构化执行拒绝元数据，然后再回退到最终输出中的已知拒绝标记，例如 `SYSTEM_RUN_DENIED`、`INVALID_REQUEST` 和审批绑定拒绝短语。

`cron list` 和运行历史会显示拒绝原因，而不是把被阻止的命令报告为 `ok`。

## Retention

保留和清理在配置中控制：

- `cron.sessionRetention`（默认 `24h`）会清理已完成的隔离运行会话。
- `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 会清理 `~/.openclaw/cron/runs/<jobId>.jsonl`。

## Migrating older jobs

<Note>
如果你有来自当前投递和存储格式之前的 cron 作业，请运行 `openclaw doctor --fix`。Doctor 会规范化旧版 cron 字段（`jobId`、`schedule.cron`、顶层投递字段，包括旧的 `threadId`、负载 `provider` 投递别名），并在配置了 `cron.webhook` 时，将简单的 `notify: true` webhook 回退作业迁移为显式的 webhook 投递。
</Note>

## Common edits

在不更改消息的情况下更新投递设置：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

为隔离作业禁用投递：

```bash
openclaw cron edit <job-id> --no-deliver
```

为隔离作业启用轻量级引导上下文：

```bash
openclaw cron edit <job-id> --light-context
```

向特定频道发公告：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

向 Telegram 论坛主题发公告：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "-1001234567890" --thread-id 42
```

创建一个带轻量级引导上下文的隔离作业：

```bash
openclaw cron add \
  --name "轻量级晨间简报" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "总结昨夜更新。" \
  --light-context \
  --no-deliver
```

`--light-context` 仅适用于隔离的代理回合作业。对于 cron 运行，轻量模式会保持引导上下文为空，而不是注入完整的工作区引导集合。

## Common admin commands

手动运行与检查：

```bash
openclaw cron list
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

`cron runs` 条目包含投递诊断信息，包括预期的 cron 目标、解析后的目标、message 工具发送、回退使用情况以及已投递状态。

代理和会话重定向：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

投递微调：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## Related

- [CLI reference](/cli)
- [定时任务](/automation/cron-jobs)
