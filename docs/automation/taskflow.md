---
summary: "位于后台任务之上的任务流编排层"
read_when:
  - 你想了解任务流与后台任务之间的关系
  - 你在发布说明或文档中遇到 Task Flow 或 openclaw tasks flow
  - 你想检查或管理持久化的任务流状态
title: "任务流"
---

任务流是位于 [后台任务](/automation/tasks) 之上的编排层。任务流是多步骤工作的持久化记录，包含自身的状态、JSON 状态、修订计数器以及关联的任务记录。任务流会在网关重启后继续存在；单个任务仍然是分离工作的基本单位。

## 何时使用 Task Flow

| 场景                           | 使用方式                       |
| ------------------------------ | ------------------------------ |
| 单个后台任务                   | 普通任务                       |
| 由插件代码驱动的多步骤流水线   | Task Flow（托管）              |
| 分离的 ACP 或子代理生成        | Task Flow（镜像，自动创建）    |
| 一次性提醒                     | 自动化任务                     |

## 同步模式

### 托管模式

托管流有一个控制器：插件代码通过插件运行时 Task Flow API 创建该流，设置目标和必需的控制器 ID，然后显式驱动它。

- 每个步骤都作为该流下创建的后台任务运行；该流的 owner key 和 requester origin 会传递给子任务。
- 控制器在 `running`、`waiting` 和终态之间推进该流，并在流记录上存储任意 JSON 步骤状态。
- 每次变更都会带上该流期望的 revision。过期写入会被作为 revision 冲突拒绝，而不是覆盖较新的状态。
- 一旦请求取消，就会拒绝新的子任务；当不再有子任务处于活动状态时，该流会以 `cancelled` 结束。

示例：一个每周报告流，依次执行 (1) 收集数据，(2) 生成报告，以及 (3) 交付报告，每个步骤对应一个后台任务：

```
Flow: weekly-report
  Step 1: gather-data     → 任务已创建 → 成功
  Step 2: generate-report → 任务已创建 → 成功
  Step 3: deliver         → 任务已创建 → 运行中
```

### 镜像模式

当一个 detached ACP 或 subagent 运行开始时，OpenClaw 会自动创建一个镜像的单任务流（带有可交付结果完成的 session 范围任务）。该流记录会镜像其唯一的底层任务——状态、目标和时间——因此 detached 启动会获得一个稳定的流句柄，用于状态和重试界面，而无需控制器。镜像流在 CLI 中显示同步模式 `task_mirrored`。

## 流状态

| 状态        | 含义                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| `queued`    | 已创建，尚未开始推进                                                       |
| `running`   | Flow 正在积极推进                                                           |
| `waiting`   | 托管的 flow 因等待元数据而暂停（计时器、外部事件）                         |
| `blocked`   | 某个步骤已完成但未得到可用结果；`blockedTaskId`/摘要会说明是哪一个         |
| `succeeded` | 已成功完成                                                                 |
| `failed`    | 已带错误完成                                                               |
| `cancelled` | 已请求取消，且所有子任务都已结束                                           |
| `lost`      | Flow 丢失了其权威的后备状态                                                |

## 持久化状态和修订跟踪

流程记录与任务记录一起持久化在共享的 SQLite 状态数据库（`~/.openclaw/state/openclaw.sqlite`，`flow_runs` 表）中，因此即使网关重启，进度也能继续保留。每次写入都会提升流程的 `revision`；通过传入过期的预期修订号进行并发写入时，会发生冲突，必须重新读取。WAL 增长由 SQLite 自动检查点机制加上定期的被动检查点共同限制，并在关闭时执行 truncate 检查点。旧版安装中的遗留 `flows/registry.sqlite` 辅助数据库会被 `openclaw doctor` 导入。

## 取消行为

`openclaw tasks flow cancel` 会在流程上设置一个持久化的取消意图，取消其正在运行的子任务，并拒绝新的受管子任务。只要不再有任何子任务处于活动状态，该流程就会最终变为 `cancelled` - 可能是立即完成，或者在子任务需要更长时间稳定下来时通过维护扫描完成。该意图会被持久化，因此即使网关在所有子任务终止之前重启，已取消的流程仍会保持为已取消状态。

## CLI 命令

```bash
# 列出活动和最近的流程
openclaw tasks flow list [--status <status>] [--json]

# 显示特定流程的详细信息
openclaw tasks flow show <lookup> [--json]

# 取消正在运行的流程及其活动任务
openclaw tasks flow cancel <lookup>
```

| 命令                              | 描述                                                                 |
| --------------------------------- | -------------------------------------------------------------------- |
| `openclaw tasks flow list`        | 带有同步模式、状态、修订版、控制器、任务计数的受跟踪流程              |
| `openclaw tasks flow show <id>`   | 通过流程 ID 或所有者键检查一个流程，包括关联任务                      |
| `openclaw tasks flow cancel <id>` | 取消正在运行的流程及其活动任务                                        |

流程也包含在 `openclaw tasks audit`（陈旧或损坏的流程发现）和 `openclaw tasks maintenance`（完成卡住的取消操作，在 7 天后清理终态流程）中。

## 可靠的计划工作流模式

对于市场情报简报之类的重复工作流，请将计划、编排和可靠性检查视为独立层：

1. 使用 [自动化](/automation/cron-jobs) 进行定时。
2. 当工作流需要基于先前上下文继续运行时，使用持久化自动化会话。
3. 使用 [Lobster](/tools/lobster) 执行确定性步骤、审批关卡和恢复令牌。
4. 使用 Task Flow 跟踪跨子任务、等待、重试和网关重启的多步骤运行。

自动化任务示例（`openclaw automations`；`openclaw cron` 仍是别名）：

```bash
openclaw automations add \
  --name "Market intelligence brief" \
  --cron "0 7 * * 1-5" \
  --tz "America/New_York" \
  --session session:market-intel \
  --message "运行 market-intel Lobster 工作流。在总结之前验证来源的新鲜度。" \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

当重复工作流需要有意保留历史记录、上次运行摘要或常驻上下文时，请使用 `--session session:<id>`，而不是 `isolated`。当每次运行都应从头开始，并且所有所需状态都在工作流中显式提供时，请使用 `isolated`。

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

- 浏览器可用性和配置文件选择，例如，对于托管状态使用 `openclaw`，或者在需要已登录 Chrome 会话时使用 `user`。请参阅 [浏览器](/tools/browser)。
- 每个来源的 API 凭据和配额。
- 所需端点的网络可达性。
- 为代理启用的必需工具，例如 `lobster`、`browser` 和 `llm-task`。
- 为自动化配置故障目标，以便能够发现 preflight 失败。请参阅 [自动化](/automation/cron-jobs#delivery-and-output)。

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

## flows 与 tasks 的关系

flow 负责协调 task，而不是替代它们。单个 flow 在其生命周期内可以驱动多个后台任务。使用 `openclaw tasks` 检查单个任务记录，使用 `openclaw tasks flow` 检查编排该任务的 flow。

## 相关内容

- [后台任务](/automation/tasks) - 流程协调的分离式工作账本
- [CLI：任务](/cli/tasks) - `openclaw tasks flow` 的 CLI 命令参考
- [自动化概览](/automation) - 所有自动化机制一览
- [自动化任务](/automation/cron-jobs) - 可能向流程提供数据的计划任务
