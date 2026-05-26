---
summary: "位于后台任务之上的 Task Flow 编排层"
read_when:
  - 你想了解 Task Flow 与后台任务之间的关系
  - 你在发布说明或文档中遇到 Task Flow 或 openclaw tasks flow
  - 你想检查或管理持久化的 flow 状态
title: "Task flow"
---

Task Flow 是位于 [background tasks](/automation/tasks) 之上的流编排基础层。它管理具有自身状态、修订跟踪和同步语义的持久化多步骤流程，而单个任务仍然是分离工作的基本单位。

## 何时使用 Task Flow

当工作跨越多个顺序步骤或分支步骤，并且你需要在 gateway 重启之间持续跟踪进度时，请使用 Task Flow。对于单个后台操作，普通的 [task](/automation/tasks) 就足够了。

| 场景                                  | 使用                 |
| ------------------------------------- | -------------------- |
| 单个后台作业                          | 普通 task           |
| 多步骤流水线（A 然后 B 然后 C）        | Task Flow（managed） |
| 观察外部创建的任务                    | Task Flow（mirrored） |
| 一次性提醒                            | Cron job             |

## 可靠的计划工作流模式

对于市场情报简报之类的重复工作流，请将计划、编排和可靠性检查视为独立层：

1. 使用 [Scheduled Tasks](/automation/cron-jobs) 进行定时。
2. 当工作流需要基于之前的上下文继续时，使用持久化的 cron session。
3. 使用 [Lobster](/tools/lobster) 处理确定性步骤、审批门和恢复令牌。
4. 使用 Task Flow 跟踪跨子任务、等待、重试和 gateway 重启的多步骤运行。

示例 cron 形态：

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

当重复工作流需要有意保留历史、上次运行摘要或常驻上下文时，使用 `session:<id>` 而不是 `isolated`。当每次运行都应从新开始，并且所有所需状态都在工作流中显式提供时，使用 `isolated`。

在工作流内部，将可靠性检查放在 LLM 总结步骤之前：

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

推荐的 preflight 检查：

- 浏览器可用性和配置文件选择，例如使用 `openclaw` 进行托管状态，或在需要已登录 Chrome 会话时使用 `user`。参见 [Browser](/tools/browser)。
- 每个数据源的 API 凭证和配额。
- 所需端点的网络可达性。
- 为代理启用的必需工具，例如 `lobster`、`browser` 和 `llm-task`。
- 为 cron 配置失败目标，以便 preflight 失败可见。参见 [Scheduled Tasks](/automation/cron-jobs#delivery-and-output)。

每个收集项建议的数据来源字段：

```json
{
  "sourceUrl": "https://example.com/report",
  "retrievedAt": "2026-04-24T12:00:00Z",
  "asOf": "2026-04-24",
  "title": "示例报告",
  "content": "..."
}
```

在总结之前，让工作流拒绝或标记过期项。LLM 步骤应只接收结构化 JSON，并且应被要求在输出中保留 `sourceUrl`、`retrievedAt` 和 `asOf`。当你需要在工作流中使用一个经过 schema 验证的模型步骤时，请使用 [LLM Task](/tools/llm-task)。

用于可复用的团队或社区工作流时，请将 CLI、`.lobster` 文件以及任何设置说明打包为 skill 或 plugin，并通过 [ClawHub](/clawhub) 发布。除非插件 API 缺少所需的通用能力，否则应将工作流特定的护栏保留在该包中。

## 同步模式

### Managed 模式

Task Flow 端到端拥有生命周期。它将任务创建为流步骤，驱动它们完成，并自动推进流状态。

示例：一个每周报告流，依次（1）收集数据，（2）生成报告，以及（3）交付报告。Task Flow 创建每一步作为后台任务，等待完成，然后进入下一步。

```
Flow: weekly-report
  Step 1: gather-data     → task created → succeeded
  Step 2: generate-report → task created → succeeded
  Step 3: deliver         → task created → running
```

### Mirrored 模式

Task Flow 观察外部创建的任务，并在不负责任务创建的情况下保持流状态同步。当任务来源于 cron jobs、CLI 命令或其他来源，而你希望将它们的进度统一视图为一个 flow 时，这非常有用。

示例：三个独立的 cron jobs，共同构成一个“早间运维”例程。一个 mirrored flow 跟踪它们的整体进度，而不控制它们何时或如何运行。

## 持久化状态与修订跟踪

每个 flow 都会持久化自己的状态并跟踪修订，因此进度可在 gateway 重启后继续保留。修订跟踪可在多个来源尝试并发推进同一 flow 时实现冲突检测。
flow registry 使用带有受限 write-ahead-log 维护的 SQLite，包括
周期性检查点和关闭检查点，因此长期运行的 gateway 不会保留
无限增长的 `registry.sqlite-wal` sidecar 文件。

## 取消行为

`openclaw tasks flow cancel` 会在 flow 上设置一个粘性的取消意图。flow 内的活动任务将被取消，并且不会启动新步骤。取消意图会在重启后持续存在，因此即使 gateway 在所有子任务终止之前重启，已取消的 flow 仍会保持取消状态。

## CLI 命令

```bash
# 列出活动和最近的 flows
openclaw tasks flow list

# 显示特定 flow 的详细信息
openclaw tasks flow show <lookup>

# 取消正在运行的 flow 及其活动任务
openclaw tasks flow cancel <lookup>
```

| 命令                              | 描述                                         |
| --------------------------------- | -------------------------------------------- |
| `openclaw tasks flow list`        | 显示已跟踪的 flows 及其状态和同步模式         |
| `openclaw tasks flow show <id>`   | 通过 flow id 或 lookup key 检查某个 flow      |
| `openclaw tasks flow cancel <id>` | 取消正在运行的 flow 及其活动任务              |

## flow 与 task 的关系

flow 负责协调 task，而不是替代它们。单个 flow 在其生命周期内可以驱动多个后台任务。使用 `openclaw tasks` 检查单个任务记录，使用 `openclaw tasks flow` 检查编排该任务的 flow。

## 相关内容

- [Background Tasks](/automation/tasks) — flows 协调的分离工作账本
- [CLI: tasks](/cli/tasks) — `openclaw tasks flow` 的 CLI 命令参考
- [Automation Overview](/automation) — 一览所有自动化机制
- [Cron Jobs](/automation/cron-jobs) — 可能输入到 flows 中的定时作业
