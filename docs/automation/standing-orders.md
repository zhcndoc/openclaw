---
summary: "为自主代理程序定义永久操作权限"
read_when:
  - "设置无需按任务逐次提示的自主代理工作流"
  - "定义代理可以独立执行什么，以及哪些需要人工批准"
  - "设计具有清晰边界和升级规则的多程序代理"
title: "常设指令"
---

常设指令赋予你的代理针对已定义程序的**永久操作权限**。你无需为每项任务都单独提示代理，而是通过定义具有清晰范围、触发条件和升级规则的程序，让代理在这些边界内自主执行：“周报由你负责。每周五汇总并发送，只有在发现异常时才上报。”

## <a id="why-standing-orders"></a> 为什么需要常设指令

**没有常设指令：** 你需要为每项任务都去提示代理，日常工作会被遗忘或延迟，而你会成为瓶颈。

**有常设指令：** 代理会在定义好的边界内自主执行，日常工作按计划进行，而你只在例外情况和审批时介入。

## <a id="how-they-work"></a> 它们如何工作

常设指令定义在你的 [代理工作区](/concepts/agent-workspace) 文件中。推荐直接将它们写入 `AGENTS.md`（它会在每次会话中自动注入），这样代理始终能在上下文中获取它们。对于更大的配置，你也可以把它们放到诸如 `standing-orders.md` 之类的专用文件中，并在 `AGENTS.md` 中引用它。

对于临时 CI 或脚本入口点，请使用 [`openclaw agent exec`](/cli/agent#agent-exec)。它会跳过工作区引导文件的创建，但默认情况下仍会注入现有文件（例如 `AGENTS.md`），包括它们包含的任何常规订单。要在嵌入式运行时中省略自动工作区上下文注入，请设置 [`agents.defaults.contextInjection: "never"`](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.contextinjection)，除非每个代理都覆盖。

每个程序指定：

1. **范围** - 代理被授权做什么
2. **触发条件** - 何时执行（按计划、事件或条件）
3. **审批门槛** - 在采取行动前需要哪些人工签字确认
4. **升级规则** - 何时停止并寻求帮助

代理在每个会话中通过工作区引导文件加载这些指令（有关自动注入文件的完整列表，请参阅 [Agent Workspace](/concepts/agent-workspace)）并针对它们执行，结合 [automations](/automation/cron-jobs) 进行基于时间的强制执行。

<Tip>
将常设指令放在 `AGENTS.md` 中，以确保每次会话都会加载它们。工作区引导会自动注入 `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、`BOOTSTRAP.md` 和 `MEMORY.md`——但不会注入子目录中的任意文件。
</Tip>

## <a id="anatomy-of-a-standing-order"></a> 常设指令的结构

```markdown
## Program: Weekly Status Report

**Authority:** Compile data, generate report, deliver to stakeholders
**Trigger:** Every Friday at 4 PM (enforced via automation job)
**Approval gate:** None for standard reports. Flag anomalies for human review.
**Escalation:** If data source is unavailable or metrics look unusual (>2σ from norm)

### Execution steps

1. Pull metrics from configured sources
2. Compare to prior week and targets
3. Generate report in Reports/weekly/YYYY-MM-DD.md
4. Deliver summary via configured channel
5. Log completion to Agent/Logs/

### What NOT to do

- Do not send reports to external parties
- Do not modify source data
- Do not skip delivery if metrics look bad - report accurately
```

## <a id="standing-orders-plus-automations"></a> 常设指令与自动化

常设指令定义代理**获授权执行的操作**。[自动化](/automation/cron-jobs)定义**执行时间**。二者协同工作：

```text
Standing Order: "You own the daily inbox triage"
    ↓
Automation (8 AM daily): "Execute inbox triage per standing orders"
    ↓
Agent: Reads standing orders → executes steps → reports results
```

自动化任务提示应引用常设指令，而不是重复其中的内容（`openclaw automations`；`openclaw cron` 仍是别名）：

```bash
openclaw automations add \
  --name daily-inbox-triage \
  --cron "0 8 * * 1-5" \
  --tz America/New_York \
  --timeout-seconds 300 \
  --announce \
  --channel imessage \
  --to "+1XXXXXXXXXX" \
  --message "Execute daily inbox triage per standing orders. Check mail for new alerts. Parse, categorize, and persist each item. Report summary to owner. Escalate unknowns."
```

## <a id="examples"></a> 示例

### <a id="example-1%3A-content-and-social-media-(weekly-cycle)"></a><a id="example-1-content-and-social-media-weekly-cycle"></a> 示例 1：内容和社交媒体（每周周期）

```markdown
## Program: Content & Social Media

**Authority:** Draft content, schedule posts, compile engagement reports
**Approval gate:** All posts require owner review for first 30 days, then standing approval
**Trigger:** Weekly cycle (Monday review → mid-week drafts → Friday brief)

### Weekly cycle

- **Monday:** Review platform metrics and audience engagement
- **Tuesday-Thursday:** Draft social posts, create blog content
- **Friday:** Compile weekly marketing brief → deliver to owner

### Content rules

- Voice must match the brand (see SOUL.md or brand voice guide)
- Never identify as AI in public-facing content
- Include metrics when available
- Focus on value to audience, not self-promotion
```

### <a id="example-2%3A-finance-operations-(event-triggered)"></a><a id="example-2-finance-operations-event-triggered"></a> 示例 2：财务运营（事件触发）

```markdown
## Program: Financial Processing

**Authority:** Process transaction data, generate reports, send summaries
**Approval gate:** None for analysis. Recommendations require owner approval.
**Trigger:** New data file detected OR scheduled monthly cycle

### When new data arrives

1. Detect new file in designated input directory
2. Parse and categorize all transactions
3. Compare against budget targets
4. Flag: unusual items, threshold breaches, new recurring charges
5. Generate report in designated output directory
6. Deliver summary to owner via configured channel

### Escalation rules

- Single item > $500: immediate alert
- Category > budget by 20%: flag in report
- Unrecognizable transaction: ask owner for categorization
- Failed processing after 2 retries: report failure, do not guess
```

### <a id="example-3%3A-monitoring-and-alerts-(continuous)"></a><a id="example-3-monitoring-and-alerts-continuous"></a> 示例 3：监控与告警（持续运行）

```markdown
## Program: System Monitoring

**Authority:** Check system health, restart services, send alerts
**Approval gate:** Restart services automatically. Escalate if restart fails twice.
**Trigger:** Every heartbeat cycle

### Checks

- Service health endpoints responding
- Disk space above threshold
- Pending tasks not stale (>24 hours)
- Delivery channels operational

### Response matrix

| Condition        | Action                   | Escalate?                |
| ---------------- | ------------------------ | ------------------------ |
| Service down     | Restart automatically    | Only if restart fails 2x |
| Disk space < 10% | Alert owner              | Yes                      |
| Stale task > 24h | Remind owner             | No                       |
| Channel offline  | Log and retry next cycle | If offline > 2 hours     |
```

## <a id="execute-verify-report-pattern"></a> 执行-验证-报告模式

当与严格的执行纪律结合时，常设指令效果最佳。常设指令中的每个任务都应遵循这个循环：

1. **执行** - 做实际工作（不要只是确认指令）
2. **验证** - 确认结果正确（文件存在、消息已送达、数据已解析）
3. **报告** - 告诉所有者做了什么以及验证了什么

```markdown
### Execution rules

- Every task follows Execute-Verify-Report. No exceptions.
- "I'll do that" is not execution. Do it, then report.
- "Done" without verification is not acceptable. Prove it.
- If execution fails: retry once with adjusted approach.
- If still fails: report failure with diagnosis. Never silently fail.
- Never retry indefinitely - 3 attempts max, then escalate.
```

这种模式可以防止代理最常见的失败方式：只确认任务，却没有真正完成。

## <a id="multi-program-architecture"></a> 多程序架构

对于管理多个关注点的代理，应将常设指令组织为边界清晰的独立程序：

```markdown
## Program 1: [Domain A] (Weekly)

...

## Program 2: [Domain B] (Monthly + On-Demand)

...

## Program 3: [Domain C] (As-Needed)

...

## Escalation Rules (All Programs)

- [Common escalation criteria]
- [Approval gates that apply across programs]
```

每个程序都应该有：

- 自己的**触发频率**（每周、每月、事件驱动、持续运行）
- 自己的**审批门槛**（有些程序比其他程序需要更多监督）
- 清晰的**边界**（代理应知道一个程序在哪里结束、另一个从哪里开始）

## <a id="best-practices"></a> 最佳实践

### Do

- 从有限的权限开始，随着信任建立逐步扩大权限
- 为高风险操作定义明确的审批关卡
- 包括“NOT 做什么”部分 - 边界与权限一样重要
- 与自动化结合，以可靠地执行基于时间的任务
- 每周检查代理日志，确认常规指令是否得到遵循
- 随着需求变化更新常规指令——它们是不断演变的文档

### <a id="avoid"></a> 应避免这样做

- 在第一天就授予广泛权限（“做你认为最好的事”）
- 跳过升级规则——每个程序都需要包含“何时停止并询问”的条款
- 假设代理会记住口头指令——将所有内容写入文件
- 在单个程序中混合多个关注点——不同领域使用不同的程序
- 忘记通过自动化来强制执行——没有触发器的常规指令最终只会变成建议

## <a id="related"></a> 相关内容

- [自动化](/automation)：一览所有自动化机制。
- [自动化任务](/automation/cron-jobs)：用于执行常规指令的计划安排。
- [钩子](/automation/hooks)：由事件驱动的代理生命周期脚本。
- [Webhooks](/automation/cron-jobs#webhooks)：入站 HTTP 事件触发器。
- [代理工作区](/concepts/agent-workspace)：常规指令所在的位置，其中包括自动注入的引导文件完整列表（`AGENTS.md`、`SOUL.md` 等）。
- [Goal](/tools/goal) — 持久的每会话目标和 `/goal` 控件
