---
summary: "Task Flow 是位于后台任务之上的流程编排层"
read_when:
  - 你想了解 Task Flow 与后台任务之间的关系
  - 你在发布说明或文档中遇到 Task Flow 或 openclaw tasks flow
  - 你想检查或管理持久化的流程状态
title: "Task flow"
---

Task Flow 是位于 [background tasks](/automation/tasks) 之上的流程编排基础层。它管理具有自身状态、修订跟踪和同步语义的持久化多步骤流程，而单个任务仍然是分离工作的基本单位。

## 何时使用 Task Flow

当工作跨越多个顺序或分支步骤，并且你需要跨网关重启的持久化进度跟踪时，请使用 Task Flow。对于单个后台操作，普通的 [task](/automation/tasks) 就足够了。

| 场景                              | 使用                  |
| ------------------------------------- | -------------------- |
| 单个后台作业                 | 普通任务           |
| 多步骤管道（A 然后 B 然后 C） | Task Flow（托管）  |
| 观察外部创建的任务      | Task Flow（镜像） |
| 一次性提醒                     | Cron 作业             |

## 可靠的定时工作流模式

对于市场情报简报之类的周期性工作流，应将调度、编排和可靠性检查视为彼此独立的层：

1. 使用 [Scheduled Tasks](/automation/cron-jobs) 处理定时。
2. 当工作流需要建立在之前上下文之上时，使用持久化的 cron 会话。
3. 使用 [Lobster](/tools/lobster) 处理确定性步骤、审批门和恢复令牌。
4. 使用 Task Flow 跟踪跨子任务、等待、重试和网关重启的多步骤运行。

cron 形状示例：

```bash
openclaw cron add \
  --name "Market intelligence brief" \
  --cron "0 7 * * 1-5" \
  --tz "America/New_York" \
  --session session:market-intel \
  --message "运行 market-intel Lobster 工作流。在总结之前验证来源的新鲜度。" \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

当周期性工作流需要有意保留历史、上一轮运行摘要或持续上下文时，使用 `session:<id>` 而不是 `isolated`。当每次运行都应从头开始，并且所有所需状态都在工作流中显式提供时，使用 `isolated`。

在工作流内部，把可靠性检查放在 LLM 总结步骤之前：

```yaml
name: market-intel-brief
steps:
  - id: preflight
    command: market-intel check --json
  - id: collect
    command: market-intel collect --json
    stdin: $preflight.json
  - id: summarize
    command: market-intel summarize --json
    stdin: $collect.json
  - id: approve
    command: market-intel deliver --preview
    stdin: $summarize.json
    approval: required
  - id: deliver
    command: market-intel deliver --execute
    stdin: $summarize.json
    condition: $approve.approved
```

推荐的预检项：

- 浏览器可用性和配置文件选择，例如在需要托管状态时使用 `openclaw`，或在需要已登录的 Chrome 会话时使用 `user`。请参见 [Browser](/tools/browser)。
- 每个来源的 API 凭据和配额。
- 所需端点的网络可达性。
- 为代理启用的必需工具，例如 `lobster`、`browser` 和 `llm-task`。
- 为 cron 配置失败目标，以便预检失败可见。请参见 [Scheduled Tasks](/automation/cron-jobs#delivery-and-output)。

每个收集项目推荐的数据溯源字段：

```json
{
  "sourceUrl": "https://example.com/report",
  "retrievedAt": "2026-04-24T12:00:00Z",
  "asOf": "2026-04-24",
  "title": "Example report",
  "content": "..."
}
```

让工作流在总结前拒绝或标记陈旧项目。LLM 步骤应只接收结构化 JSON，并且应被要求在输出中保留 `sourceUrl`、`retrievedAt` 和 `asOf`。当你需要在工作流中使用一个经过 schema 验证的模型步骤时，请使用 [LLM Task](/tools/llm-task)。

对于可复用的团队或社区工作流，将 CLI、`.lobster` 文件以及任何设置说明打包为一个技能或插件，并通过 [ClawHub](/tools/clawhub) 发布。除非插件 API 缺少所需的通用能力，否则应将工作流专用的防护措施保留在该包中。

## 同步模式

### 托管模式

Task Flow 端到端地拥有生命周期。它创建任务作为流程步骤，驱动它们完成，并自动推进流程状态。

示例：一个每周报告流程，(1) 收集数据，(2) 生成报告，(3) 交付报告。Task Flow 将每个步骤创建为后台任务，等待完成，然后移动到下一步。

```
Flow: weekly-report
  Step 1: gather-data     → task created → succeeded
  Step 2: generate-report → task created → succeeded
  Step 3: deliver         → task created → running
```

### 镜像模式

Task Flow 观察外部创建的任务并保持流程状态同步，而不拥有任务创建的所有权。当任务来源于 cron 作业、CLI 命令或其他来源，并且你希望将它们作为流程统一查看进度时，这很有用。

示例：三个独立的 cron 作业共同组成一个“早晨运维”例程。镜像流程跟踪它们的集体进度，而不控制它们何时或如何运行。

## 持久化状态和修订跟踪

每个流程持久化其自身状态并跟踪修订，以便进度在网关重启后得以保留。修订跟踪能够在多个来源尝试并发推进同一流程时启用冲突检测。

## 取消行为

`openclaw tasks flow cancel` 在流程上设置一个粘性取消意图。流程内的活动任务将被取消，且不会启动新步骤。取消意图在重启后持久存在，因此即使网关在所有子任务终止前重启，已取消的流程仍保持取消状态。

## CLI 命令

```bash
# 列出活动和最近的流程
openclaw tasks flow list

# 显示特定流程的详细信息
openclaw tasks flow show <lookup>

# 取消运行中的流程及其活动任务
openclaw tasks flow cancel <lookup>
```

| 命令                           | 描述                                   |
| --------------------------------- | --------------------------------------------- |
| `openclaw tasks flow list`        | 显示带有状态和同步模式的跟踪流程 |
| `openclaw tasks flow show <id>`   | 通过流程 id 或查找键检查一个流程     |
| `openclaw tasks flow cancel <id>` | 取消运行中的流程及其活动任务    |

## 流程与任务的关系

流程协调任务，而不是替代它们。单个流程在其生命周期内可能驱动多个后台任务。使用 `openclaw tasks` 检查单个任务记录，使用 `openclaw tasks flow` 检查编排流程。

## 相关内容

- [Background Tasks](/automation/tasks) — 流程所协调的分离工作账本
- [CLI: tasks](/cli/tasks) — `openclaw tasks flow` 的 CLI 命令参考
- [Automation Overview](/automation) — 一览所有自动化机制
- [Cron Jobs](/automation/cron-jobs) — 可能流入流程的定时作业
