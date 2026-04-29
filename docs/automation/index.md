---
summary: "自动化机制概览：任务、cron、hooks、standing orders 和 Task Flow"
read_when:
  - 决定如何使用 OpenClaw 自动化工作
  - 在 heartbeat、cron、hooks 和 standing orders 之间做选择
  - 寻找合适的自动化入口
title: "自动化与任务"
---

OpenClaw 通过任务、计划作业、事件 hooks 和固定指令在后台运行工作。此页面将帮助你选择合适的机制，并了解它们如何协同工作。

## 快速决策指南

```mermaid
flowchart TD
    START([你需要什么？]) --> Q1{安排工作？}
    START --> Q2{跟踪分离的工作？}
    START --> Q3{编排多步骤流程？}
    START --> Q4{对生命周期事件作出反应？}
    START --> Q5{给代理持久化指令？}

    Q1 -->|是| Q1a{精确时间还是灵活时间？}
    Q1a -->|精确| CRON["计划任务（Cron）"]
    Q1a -->|灵活| HEARTBEAT[Heartbeat]

    Q2 -->|是| TASKS[后台任务]
    Q3 -->|是| FLOW[Task Flow]
    Q4 -->|是| HOOKS[Hooks]
    Q5 -->|是| SO[固定指令]
```

| 用例                                   | 推荐                   | 原因                                             |
| -------------------------------------- | ---------------------- | ------------------------------------------------ |
| 在上午 9 点准时发送日报                | 计划任务（Cron）       | 精确时间，隔离执行                               |
| 20 分钟后提醒我                        | 计划任务（Cron）       | 一次性且时间精确（`--at`）                       |
| 每周运行深度分析                       | 计划任务（Cron）       | 独立任务，可使用不同模型                        |
| 每 30 分钟检查收件箱                   | Heartbeat              | 与其他检查批量处理，且具备上下文感知            |
| 监控日历中的即将发生的事件             | Heartbeat              | 适合周期性关注                                   |
| 检查子代理或 ACP 运行状态              | 后台任务                | 任务账本会跟踪所有分离的工作                    |
| 审计运行了什么以及何时运行             | 后台任务                | `openclaw tasks list` 和 `openclaw tasks audit` |
| 多步骤研究然后总结                     | Task Flow              | 具有修订跟踪的持久化编排                        |
| 在会话重置时运行脚本                   | Hooks                  | 由事件驱动，在生命周期事件触发                  |
| 在每次工具调用时执行代码               | 插件 hooks              | 进程内 hooks 可拦截工具调用                    |
| 始终在回复前检查合规性                 | 固定指令                | 自动注入到每个会话中                             |

### 计划任务（Cron） vs Heartbeat

| 维度           | 计划任务（Cron）                 | Heartbeat                             |
| -------------- | -------------------------------- | ------------------------------------- |
| 时间           | 精确（cron 表达式、一次性）      | 近似（默认每 30 分钟）                 |
| 会话上下文     | 新鲜（隔离）或共享               | 完整的主会话上下文                    |
| 任务记录       | 始终创建                         | 从不创建                               |
| 传递方式       | 渠道、webhook 或静默             | 在主会话内联                        |
| 最适合         | 报告、提醒、后台作业             | 收件箱检查、日历、通知               |

当你需要精确时间或隔离执行时，使用计划任务（Cron）。当工作受益于完整会话上下文且近似时间足够时，使用 Heartbeat。

## 核心概念

### 计划任务（cron）

Cron 是 Gateway 内置的精确时间调度器。它会持久化作业，在正确的时间唤醒代理，并且可以将输出传递到聊天频道或 webhook 端点。支持一次性提醒、周期性表达式以及入站 webhook 触发器。

参见 [Scheduled Tasks](/automation/cron-jobs)。

### 任务

后台任务账本会跟踪所有分离的工作：ACP 运行、子代理启动、隔离的 cron 执行以及 CLI 操作。任务是记录，不是调度器。使用 `openclaw tasks list` 和 `openclaw tasks audit` 来检查它们。

参见 [Background Tasks](/automation/tasks)。

### Task Flow

Task Flow 是位于后台任务之上的流程编排基础设施。它管理具有持久性的多步骤流程，支持 managed 和 mirrored 同步模式、修订跟踪，以及用于检查的 `openclaw tasks flow list|show|cancel`。

参见 [Task Flow](/automation/taskflow)。

### 固定指令

固定指令为代理授予针对定义程序的永久操作权限。它们存在于工作区文件中（通常是 `AGENTS.md`），并会注入到每个会话中。可与 cron 结合用于基于时间的强制执行。

参见 [Standing Orders](/automation/standing-orders)。

### Hooks

内部 hooks 是由代理生命周期事件
(`/new`, `/reset`, `/stop`)、会话压缩、Gateway 启动以及消息
流触发的事件驱动脚本。它们会从目录中自动发现，并可通过
`openclaw hooks` 管理。对于进程内工具调用拦截，请使用
[Plugin hooks](/plugins/hooks)。

参见 [Hooks](/automation/hooks)。

### Heartbeat

Heartbeat 是一个周期性的主会话轮次（默认每 30 分钟）。它将多项检查（收件箱、日历、通知）批量合并到一次代理轮次中，并使用完整的会话上下文。Heartbeat 轮次不会创建任务记录，也不会延长每日/空闲会话重置的新鲜度。使用 `HEARTBEAT.md` 来放置一个小型检查清单，或者在你希望在 Heartbeat 本身内部只执行到期任务检查时使用 `tasks:` 块。空的 heartbeat 文件会以 `empty-heartbeat-file` 跳过；仅到期任务模式会以 `no-tasks-due` 跳过。当 cron 工作处于活动或排队状态时，Heartbeat 会延后，而 `heartbeat.skipWhenBusy` 也可以在子代理或嵌套通道繁忙时延后它们。

参见 [Heartbeat](/gateway/heartbeat)。

## 它们如何协同工作

- **Cron** 处理精确计划（日报、周报）和一次性提醒。所有 cron 执行都会创建任务记录。
- **Heartbeat** 以每 30 分钟一次的批量轮次处理常规监控（收件箱、日历、通知）。
- **Hooks** 通过自定义脚本响应特定事件（会话重置、压缩、消息流）。插件 hooks 覆盖工具调用。
- **固定指令** 为代理提供持久上下文和权限边界。
- **Task Flow** 在单个任务之上协调多步骤流程。
- **任务** 会自动跟踪所有分离的工作，因此你可以检查和审计它。

## 相关内容

- [Scheduled Tasks](/automation/cron-jobs) — 精确调度和一次性提醒
- [Background Tasks](/automation/tasks) — 所有分离工作的任务账本
- [Task Flow](/automation/taskflow) — 持久化多步骤流程编排
- [Hooks](/automation/hooks) — 事件驱动的生命周期脚本
- [Plugin hooks](/plugins/hooks) — 进程内工具、提示、消息和生命周期 hooks
- [Standing Orders](/automation/standing-orders) — 持久化代理指令
- [Heartbeat](/gateway/heartbeat) — 周期性的主会话轮次
- [Configuration Reference](/gateway/configuration-reference) — 所有配置键
