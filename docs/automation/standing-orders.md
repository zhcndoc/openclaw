---
summary: "为自主代理程序定义永久操作权限"
read_when:
  - 设置无需按任务逐次提示的自主代理工作流
  - 定义代理可以独立执行什么，以及哪些需要人工批准
  - 设计具有清晰边界和升级规则的多程序代理
title: "常设指令"
---

常设指令赋予你的代理对已定义程序的**永久操作权限**。你无需每次都给出单独的任务指令，而是定义具有清晰范围、触发条件和升级规则的程序——代理会在这些边界内自主执行。

这就像你每周五都对助理说“发送周报”与授予常设权限之间的区别：“周报由你负责。每周五整理并发送；只有在看起来不对时才上报。”

## 为什么需要常设指令

**没有常设指令时：**

- 你必须为每个任务提示代理
- 代理会在请求之间闲置
- 日常工作会被遗忘或延迟
- 你会成为瓶颈

**有了常设指令时：**

- 代理会在定义好的边界内自主执行
- 日常工作会按计划自动发生，无需提示
- 只有在例外和需要审批时你才会介入
- 代理会把空闲时间高效利用起来

## 它们如何工作

常设指令定义在你的 [代理工作区](/concepts/agent-workspace) 文件中。推荐直接将它们写入 `AGENTS.md`（它会在每次会话中自动注入），这样代理始终能在上下文中获取它们。对于更大的配置，你也可以把它们放到诸如 `standing-orders.md` 之类的专用文件中，并在 `AGENTS.md` 中引用它。

每个程序都指定：

1. **范围** - 代理被授权做什么
2. **触发条件** - 何时执行（按计划、事件或条件）
3. **审批门槛** - 在采取行动前需要哪些人工签字确认
4. **升级规则** - 何时停止并寻求帮助

代理会通过工作区引导文件在每次会话中加载这些指令（完整的自动注入文件列表见 [Agent Workspace](/concepts/agent-workspace)），并结合 [cron 任务](/automation/cron-jobs) 按时间执行进行操作。

<Tip>
将常设指令放在 `AGENTS.md` 中，以确保它们在每个会话中都能被加载。工作区引导会自动注入 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md`——但不会注入子目录中的任意文件。
</Tip>

## 常设指令的结构

```markdown
## Program: Weekly Status Report

**Authority:** 汇总数据、生成报告、交付给利益相关者
**Trigger:** 每周五下午 4 点（通过 cron 任务强制执行）
**Approval gate:** 标准报告无需审批。将异常标记供人工审查。
**Escalation:** 如果数据源不可用或指标看起来异常（偏离常态 >2σ）

### Execution steps

1. 从已配置的数据源拉取指标
2. 与上一周及目标进行比较
3. 在 Reports/weekly/YYYY-MM-DD.md 中生成报告
4. 通过已配置渠道发送摘要
5. 将完成情况记录到 Agent/Logs/

### What NOT to do

- Do not send reports to external parties
- Do not modify source data
- Do not skip delivery if metrics look bad - report accurately
```

## 常设指令 + cron 任务

常设指令定义代理被授权做的**什么**。[Cron 任务](/automation/cron-jobs) 定义它**何时**发生。二者协同工作：

```
常设指令：“周记得做每日收件箱分诊”
    ↓
Cron 任务（每天上午 8 点）：“根据常设指令执行收件箱分诊”
    ↓
代理：读取常设指令 → 执行步骤 → 报告结果
```

cron 任务的提示应引用常设指令，而不是重复其内容：

```bash
openclaw cron add \
  --name daily-inbox-triage \
  --cron "0 8 * * 1-5" \
  --tz America/New_York \
  --timeout-seconds 300 \
  --announce \
  --channel imessage \
  --to "+1XXXXXXXXXX" \
  --message "根据常设指令执行每日收件箱分诊。检查邮件中的新警报。解析、分类并持久化每一项。向负责人报告摘要。升级未知项。"
```

## 示例

### 示例 1：内容和社交媒体（每周周期）

```markdown
## Program: Content & Social Media

**Authority:** 起草内容、安排发布、汇总互动报告
**Approval gate:** 前 30 天所有帖子都需要负责人审阅，之后为常设批准
**Trigger:** 每周周期（周一审查 → 周中起草 → 周五简报）

### Weekly cycle

- **Monday:** 审查平台指标和受众互动
- **Tuesday-Thursday:** 起草社交媒体帖子，创建博客内容
- **Friday:** 汇总每周营销简报 → 交付给所有者

### Content rules

- 语气必须与品牌一致（见 SOUL.md 或品牌语气指南）
- 在面向公众的内容中绝不自称为 AI
- 在可用时包含指标
- 聚焦对受众的价值，而不是自我宣传
```

### 示例 2：财务运营（事件触发）

```markdown
## Program: Financial Processing

**Authority:** 处理交易数据、生成报告、发送摘要
**Approval gate:** 分析无需审批。建议需要负责人批准。
**Trigger:** 检测到新的数据文件 OR 按月定期执行

### When new data arrives

1. 在指定输入目录中检测新文件
2. 解析并分类所有交易
3. 与预算目标进行比较
4. 标记：异常项目、超阈值、全新的经常性费用
5. 在指定输出目录中生成报告
6. 通过已配置渠道向负责人发送摘要

### Escalation rules

- 单笔 > $500：立即提醒
- 某类别超预算 20%：在报告中标记
- 无法识别的交易：向负责人询问分类
- 重试 2 次后仍处理失败：报告失败，不要猜测
```

### 示例 3：监控与告警（持续运行）

```markdown
## Program: System Monitoring

**Authority:** 检查系统健康状况、重启服务、发送告警
**Approval gate:** 自动重启服务。如重启两次都失败，则升级处理。
**Trigger:** 每个心跳周期

### Checks

- 服务健康端点响应正常
- 磁盘空间高于阈值
- 待处理任务不是陈旧的（>24 小时）
- 交付渠道可用

### Response matrix

| Condition        | Action                   | Escalate?                |
| ---------------- | ------------------------ | ------------------------ |
| Service down     | 自动重启                  | 仅当重启失败 2 次时       |
| Disk space < 10% | 提醒负责人                | 是                       |
| Stale task > 24h | 提醒负责人                | 否                       |
| Channel offline  | 记录并在下一个周期重试    | 若离线 > 2 小时则升级     |
```

## 执行-验证-报告模式

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

## 多程序架构

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

## 最佳实践

### 应当这样做

- 从狭窄的权限开始，并随着信任建立逐步扩大
- 为高风险操作定义明确的审批门槛
- 包含“不要做什么”部分——边界和权限同样重要
- 结合 cron 任务实现可靠的基于时间的执行
- 每周审查代理日志，验证常设指令是否被遵循
- 随着需求变化更新常设指令——它们是活文档

### 应避免这样做

- 一开始就授予过宽的权限（“你觉得怎么做最好就怎么做”）
- 跳过升级规则——每个程序都需要“何时停止并询问”的条款
- 假设代理会记住口头指令——把所有内容都写进文件
- 在单个程序中混合不同关注点——不同领域应分开程序
- 忘记用 cron 任务强制执行——没有触发条件的常设指令会变成建议

## 相关内容

- [自动化和任务](/automation)：一览所有自动化机制。
- [Cron 任务](/automation/cron-jobs)：为常设指令提供调度执行。
- [Hooks](/automation/hooks)：代理生命周期事件的事件驱动脚本。
- [Webhooks](/automation/cron-jobs#webhooks)：入站 HTTP 事件触发器。
- [代理工作区](/concepts/agent-workspace)：常设指令存放的位置，包括自动注入的引导文件完整列表（`AGENTS.md`、`SOUL.md` 等）。
