---
summary: "自动化中选择心跳（heartbeat）和定时任务（cron）的指导"
read_when:
  - 决定如何安排周期性任务
  - 设置后台监控或通知
  - 优化周期性检查的令牌消耗
title: "Cron 与 Heartbeat"
---

# Cron 与 Heartbeat：何时使用哪种

心跳和定时任务都允许你按计划运行任务。本指南帮助你为具体使用场景选择合适的机制。

## 快速决策指南

| 使用场景                              | 推荐选项           | 理由                                        |
| ------------------------------------ | ------------------ | ------------------------------------------- |
| 每30分钟检查收件箱                   | Heartbeat          | 与其他检查批量处理，具备上下文感知           |
| 每天上午9点准时发送报告              | Cron（隔离模式）    | 需要精确时间                                |
| 监控日历中即将到来的事件             | Heartbeat          | 适合周期性感知                              |
| 每周进行深度分析                    | Cron（隔离模式）    | 独立任务，可使用不同模型                    |
| 20分钟后提醒我                      | Cron（主会话，`--at`） | 一次性精确定时                             |
| 后台项目健康检查                    | Heartbeat          | 依托现有周期运行                            |

## Heartbeat：周期性感知

Heartbeat 在**主会话**中以固定间隔运行（默认：30分钟）。它设计用于代理检查事项并突出任何重要信息。

### 何时使用 heartbeat

- **多项周期检查**：与其设置5个单独的 cron 任务分别检查收件箱、日历、天气、通知和项目状态，不如用一个 heartbeat 批量处理。
- **上下文感知决策**：代理拥有完整的主会话上下文，能智能判断哪些紧急哪些可以延后。
- **对话连续性**：Heartbeat 运行共享同一会话，代理记得最近对话，可以自然跟进。
- **低开销监控**：一个 heartbeat 替代多个小型轮询任务。

### Heartbeat 优势

- **批量检查**：一个代理回合可同时检查收件箱、日历和通知。
- **减少 API 调用**：一个 heartbeat 比5个独立 cron 任务消耗更少。
- **上下文感知**：代理知道你最近在做什么，可合理优先级排序。
- **智能抑制**：无须提醒时，代理返回 `HEARTBEAT_OK`，不发送消息。
- **自然时序**：时间略有偏移，依据排队负载波动，多数监控场景可接受。

### Heartbeat 示例：HEARTBEAT.md 清单

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

代理每个 heartbeat 读取该清单，一次处理所有项目。

### 配置 heartbeat

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 间隔
        target: "last", // 明确告警传送目标（默认 "none"）
        activeHours: { start: "08:00", end: "22:00" }, // 可选
      },
    },
  },
}
```

完整配置见 [Heartbeat](/gateway/heartbeat)。

## Cron：精确调度

Cron 任务在精确时间点运行，可在隔离会话中执行，互不干扰主会话上下文。
定时任务自动通过一个在0-5分钟窗口的确定性偏移，错开整点重复执行。

### 何时使用 cron

- **需要准确时间**：“每周一上午9点准时发送”，而不是“差不多9点”。
- **独立任务**：不依赖会话上下文。
- **不同模型/思考层次**：需要更强模型进行深度分析。
- **一次性提醒**：使用 `--at` 实现“20分钟后提醒”。
- **频繁/嘈杂任务**：避免主会话历史被干扰。
- **外部触发**：任务应独立执行，无需代理活跃。

### Cron 优势

- **精确时间**：支持5字段或6字段（包含秒）Cron表达式及时区。
- **内建负载错峰**：重复整点任务默认错开最多5分钟。
- **每任务独立控制**：可用 `--stagger <duration>` 覆盖错峰，或 `--exact` 强制精确时间。
- **会话隔离**：在 `cron:<jobId>` 会话中运行，不污染主会话历史。
- **模型覆盖**：每个任务可指定更便宜或更强的模型。
- **传递控制**：隔离任务默认 `announce`（总结）；可根据需要选择 `none`。
- **即时通知**：announce 模式直接发送消息，无需等待 heartbeat。
- **无需代理上下文**：即使主会话空闲或已压缩，也能运行。
- **支持一次性**：`--at` 可设精确未来时间。

### Cron 示例：每日晨报

```bash
openclaw cron add \
  --name "Morning briefing" \
  --cron "0 7 * * *" \
  --tz "America/New_York" \
  --session isolated \
  --message "Generate today's briefing: weather, calendar, top emails, news summary." \
  --model opus \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

该任务精确于纽约时间7:00执行，使用 Opus 模型并直接向 WhatsApp 发送摘要。

### Cron 示例：一次性提醒

```bash
openclaw cron add \
  --name "Meeting reminder" \
  --at "20m" \
  --session main \
  --system-event "Reminder: standup meeting starts in 10 minutes." \
  --wake now \
  --delete-after-run
```

完整 CLI 参考见 [Cron jobs](/automation/cron-jobs)。

## 决策流程图

```
任务需要在精确时间执行吗？
  是 -> 使用 cron
  否 -> 继续...

任务需要与主会话隔离吗？
  是 -> 使用 cron（隔离模式）
  否 -> 继续...

该任务可与其他周期检查合并吗？
  是 -> 使用 heartbeat（添加到 HEARTBEAT.md）
  否 -> 使用 cron

这是一次性提醒吗？
  是 -> 使用 cron 并加 --at
  否 -> 继续...

需要不同模型或思考层级吗？
  是 -> 使用 cron（隔离模式），加 --model/--thinking
  否 -> 使用 heartbeat
```

## 结合使用

最高效的方案是**二者结合**：

1. **Heartbeat** 负责每30分钟内例行监控（收件箱、日历、通知）的批量处理。
2. **Cron** 负责精准定时（日报、周报）和一次性提醒。

### 示例：高效自动化配置

**HEARTBEAT.md**（每30分钟检查）：

```md
# Heartbeat checklist

- Scan inbox for urgent emails
- Check calendar for events in next 2h
- Review any pending tasks
- Light check-in if quiet for 8+ hours
```

**Cron 任务**（精准时间）：

```bash
# 每天7点晨报
openclaw cron add --name "Morning brief" --cron "0 7 * * *" --session isolated --message "..." --announce

# 每周一9点项目复审
openclaw cron add --name "Weekly review" --cron "0 9 * * 1" --session isolated --message "..." --model opus

# 一次性提醒
openclaw cron add --name "Call back" --at "2h" --session main --system-event "Call back the client" --wake now
```

## Lobster：带审批的确定性工作流

Lobster 是用于**多步工具流水线**的工作流运行时，支持确定性执行及显式审批。
当任务需多轮代理交互并带有人工检查点时适用。

### Lobster 适用场景

- **多步自动化**：需要固定的工具调用流程，而非一次性提示。
- **审批门控**：副作用执行前需暂停等待批准，之后继续。
- **可恢复运行**：暂停后无须重跑前几步，直接恢复。

### Lobster 与 heartbeat、cron 的配合

- **Heartbeat/cron** 决定运行时间（何时启动）。
- **Lobster** 定义任务执行步骤（启动后做什么）。

定时工作流用 cron 或 heartbeat 触发一个代理运行 Lobster。
临时工作流可直接调用 Lobster。

### 运行备注（源代码内说明）

- Lobster 以本地子进程形式运行（`lobster` CLI），返回 JSON 封包。
- 若工具响应 `needs_approval`，通过 `resumeToken` 和 `approve` 标志恢复运行。
- 工具为**可选插件**，推荐使用 `tools.alsoAllow: ["lobster"]` 方式启用。
- 期望 `lobster` 命令可通过环境变量 `PATH` 访问。

详见 [Lobster](/tools/lobster) 获取完整用法与示例。

## 主会话与隔离会话

heartbeat 和 cron 都能访问主会话，但方式不同：

|         | Heartbeat                       | Cron (main)              | Cron (isolated)                                 |
| ------- | ------------------------------- | ------------------------ | ----------------------------------------------- |
| Session | Main                            | Main (via system event)  | `cron:<jobId>` or custom session                |
| History | Shared                          | Shared                   | Fresh each run (isolated) / Persistent (custom) |
| Context | Full                            | Full                     | None (isolated) / Cumulative (custom)           |
| Model   | Main session model              | Main session model       | Can override                                    |
| Output  | Delivered if not `HEARTBEAT_OK` | Heartbeat prompt + event | Announce summary (default)                      |

### 何时使用主会话 cron

当希望：

- 提醒/事件显示在主会话上下文中
- 代理在下一次 heartbeat 上下文中处理
- 不需要隔离独立运行

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### 何时使用隔离 cron

当需要：

- 干净的环境，无先前上下文
- 不同模型或思考设置
- 直接向频道发布汇总
- 不污染主会话历史

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 0" \
  --session isolated \
  --message "Weekly codebase analysis..." \
  --model opus \
  --thinking high \
  --announce
```

## 成本考量

| 机制           | 成本特点                                             |
| -------------- | ----------------------------------------------------|
| Heartbeat      | 每 N 分钟一次回合；随 HEARTBEAT.md 大小扩展         |
| Cron（主会话） | 添加事件到下一次 heartbeat，非独立回合                |
| Cron（隔离）   | 每任务一次完整代理回合；可用更便宜模型               |

**建议**：

- 保持 `HEARTBEAT.md` 简洁，减少令牌开销。
- 将类似检查批量放进 heartbeat，避免多 cron 任务。
- heartbeat 用 `target: "none"` 仅做内部处理。
- 常规任务用隔离 cron 搭配便宜模型。

## 相关链接

- [Heartbeat](/gateway/heartbeat) - 完整 heartbeat 配置
- [Cron jobs](/automation/cron-jobs) - 完整 cron CLI 与 API 参考
- [System](/cli/system) - 系统事件及 heartbeat 控制
