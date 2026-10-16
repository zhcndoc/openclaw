---
doc-schema-version: 1
summary: "调度类型、cron 表达式、流源、节奏和条件触发器"
read_when:
  - "在 at、every、cron、on-exit 和 Stream 计划之间进行选择"
  - "编写 cron 表达式或时区感知计划"
  - "添加一个条件脚本，在作业触发时进行控制"
title: "自动化时间表"
sidebarTitle: "时间表"
---

当作业触发时：五种调度类型、cron 表达式规则、动态节奏和条件观察器。 [Automations](/automation/cron-jobs) 指南的一部分。

## <a id="schedule-types"></a> 计划类型

| 类型      | CLI 标志           | 描述                                                                                              |
| --------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `at`      | `--at`             | 一次性时间戳（ISO 8601，或类似 `20m` 的相对时间）                                                     |
| `every`   | `--every`          | 固定间隔（`10m`、`1h`、`1d`）                                                                       |
| `cron`    | `--cron`           | 5 字段或 6 字段的 cron 表达式，可选 `--tz`                                                  |
| `on-exit` | `--on-exit`        | 当被监视的命令退出时触发一次（事件触发；在 turn teardown 后仍然有效；可选 `--on-exit-cwd`） |
| `stream`  | `--stream-command` | 从受监督的长生命周期命令产生的批量行中触发                                      |

这些调度标志适用于 `openclaw automations add` 和 `openclaw automations edit <job-id>`。例如，`openclaw automations edit <job-id> --on-exit "./watch.sh" --on-exit-cwd /srv/app` 将现有作业转换为退出触发的计划。

没有时区的时间戳被视为UTC。添加`--tz America/New_York`解释无偏移`--at`日期时间，或者评估 cron 表达式，其中IANA时区。不带 Cron 表达式`--tz`使用网关主机时区。`--tz`无效于`--every` or `--on-exit`。

每小时整点的重复表达式（分钟为 `0` 且小时字段为通配符）会自动错开最多 5 分钟，以减少负载峰值。使用 `--exact` 可强制精确时间，或使用 `--stagger 30s` 指定明确的窗口（仅适用于 cron 调度）。

在Control UI中，启用**Exacttiming**以禁用交错。对于重复出现的小时前表达式，请将其关闭并清除 **Stagger window** 以恢复最长 5 分钟的默认窗口。对于其他表达式，清除已保存的窗口而不更改表达式会禁用交错，并在启用 **E 精确计时** 的情况下重新打开。带有空白窗口的新时间表在其表达式更改时会保持默认计时。

当 `on-exit` 作业的有效负载排队等待运行时，它会自行禁用。重新启用作业即可再次观看；当之前的有效负载仍在完成时，这也可以工作。如果新命令在该有效负载完成之前退出，则其退出会等待上一次运行完成，然后再禁用该作业并开始下一个有效负载。这包括超时响应后仍在运行的清理操作。禁用或更改手表会取消其挂起的退出。重新启用时，您可以更改监视的命令或工作目录。

网关拥有监视命令的进程树，包括启动失败后的清理。清理必须在其有效负载触发或替换命令开始之前完成。如果无法确认清理，网关会报告故障，保留暂停阻止程序，并拒绝在同一过程中重新装备该手表。检查并停止任何剩余的命令进程，然后重新启动网关；禁用并重新启用该作业并不能清除不确定的清理。

### <a id="heartbeat-task-migration"></a> 心跳任务迁移

Heartbeat 暂存支持 v2026.8.1. 之前的结构化 `tasks:` 块。如果您从早期版本升级，请运行 `openclaw doctor --fix` 将每个条目转换为普通的可编辑主会话自动化作业。 Doctor 保留间隔和之前的上次运行时间，在删除块之前创建作业，并在重新运行时安全地收敛相同的声明键。

这些迁移后的作业携带公开的 `systemEvent` 负载，因此 `openclaw automations list`、`get`、`edit` 和 `remove`，以及 `automations` agent 工具，都可以像管理其他作业一样管理它们（该工具仍接受旧版的 `cron` 名称作为兼容性别名）。它们的执行使用受保护的心跳任务唤醒机制：活动时段、最小间隔、洪泛控制和繁忙重试仍然适用，同时调度器负责管理每个任务独立的节奏。在同一合并窗口内到期的作业可以共享一次心跳 turn。在心跳活动时段之外到期的计划会被跳过，并在作业的下一次触发时机重试。

心跳划痕只是监控散文。运行时心跳不会将 `tasks:` 文本解析为时间表；创建新的重复工作作为自动化。

### <a id="stream-sources"></a> 流来源

流调度使操作员编写的 argv 命令在网关下运行，并从其 stdout 和 stderr 行触发作业。流计划是事件驱动的，从不超时，并且默认情况下可用。设置 `cron.triggers.enabled: false` 以将它们与条件触发脚本和脚本负载一起禁用。禁用或删除作业会停止进程；网关关闭等待进程树拆除。使用调度程序的内置错误退避功能快速失败重新启动。少于 60 秒的连续五次运行会使作业处于错误状态并使用正常的故障警报路径；手动重新启用作业以清除重新启动上限。

```bash
openclaw automations add \
  --name "Build event stream" \
  --stream-command '["node","scripts/build-events.mjs"]' \
  --stream-mode match \
  --stream-match '^(failed|recovered):' \
  --stream-batch-ms 250 \
  --session isolated \
  --message "Investigate these build events."
```

`mode: "line"`（默认值）接受每一行。`mode: "match"` 仅接受与编译后的 `match` 正则表达式匹配的行。一个批次会在静默 `batchMs` 后关闭（默认 250 ms，限制在 50–5000 之间）或在达到 `maxBatchBytes` 时关闭（默认 16384，限制在 1024–65536 之间）。达到字节上限时，批次会以 `[truncated]` 结尾。匹配模式始终会将完整行与其完整文本进行比对，即使超过 `maxBatchBytes` 也是如此（只有传送出去的批次会被截断）；在受限的原始输入上限处被切断的行只有前缀，因此会被视为不匹配，而不会让一个以行尾锚定的模式在截断处触发。该批次会附加到系统事件文本或 agent-turn 消息中。由于来源命令与负载命令会产生歧义的进程所有权，因此流调度不接受命令负载。

匹配具有有限的处理预算和队列。如果超过任一限制，源将停止并记录错误；检查匹配表达式和网关负载，然后手动重新启用作业。

每个作业仅保留一次有效负载火力和一组有界待处理批次。在有效负载运行时或在内置的 30 秒触发间隔过去之前到达的线路将合并到待处理的批次中，而不是构建无界队列。一位序列化所有者在 `streamDroppedBatches` 中记录了门掉线、有效负载错误和未运行的调度；有界合并增量 `streamCoalescedBatches`。失败的有效负载不会重试，因为重复它们可能会重复它们的效果。逻辑源标识在受监督的子进程重新启动时保持稳定，但在源被禁用、删除或替换时会轮换，因此即使在 A-to-B-to-A 编辑之后，来自已停用源的排队批次也无法触发。停止完成后，来自老子进程的延迟回调是惰性的。没有原生的WebSocket源码；使用 argv 命令（例如 `websocat wss://example.invalid/events`）桥接一个。

作业繁忙时使用网关调度程序进行批处理截止日期和重试。睡眠后，每个已过的截止日期都会运行一次。停止源会取消其挂起的截止日期并等待已启动的回调解决。

当流作业还具有 `trigger.script` 时，门控会在每个关闭的批次上运行一次。当前批次可通过深度冻结的 `trigger.streamBatch` 字符串获取，并与 `trigger.state` 并列存在。`fire: false` 会在持久化门控状态后丢弃该批次。`fire: true` 会保留现有触发消息语义，然后将该批次追加到最终负载中。流作业也可以改为使用不带条件门控的脚本负载；该脚本会通过相同的 `trigger.streamBatch` 值接收批次。将脚本负载与条件门控组合会被拒绝，因为两者都会占用持久化的 `trigger.state` 槽位。

### <a id="dynamic-cadence-(pacing)"></a><a id="dynamic-cadence-pacing"></a> 动态节奏（pacing）

重复作业可以将 `pacing.min` and/or `pacing.max` 设置为持续时间字符串，例如 `15m` 或 `4h`；至少需要一个边界。将 `--pacing-min` 和 `--pacing-max` 与 `automations add|edit` 一起使用（`--clear-pacing` 删除两个边界）。

Control UI 在复制重复作业时保留节奏范围。将节奏作业或其副本更改为 **Once** 会删除节奏；其他编辑保留现有边界。

在代理轮流运行期间，定速作业可以使用 `action: "next_check"` 和 `in: "30m"` 调用 `automations` 工具。该建议仅适用于当前正在运行的作业，并根据成功运行完成情况进行衡量。 OpenClaw 默默地将其限制在配置的边界内。未来的节奏截止日期仍然是网关重新启动后的下一次计划检查。

没有提议的 pacing 不会改变正常调度。失败、超时和跳过的运行会丢弃该提议，因此现有的重试和错误退避行为具有优先级。手动强制运行周期性作业属于带外操作，并会保留其待定的自然或 pacing 槽位。对于条件触发的作业，即使提议请求更早检查，内置的最小间隔仍然是下限。

### <a id="%2Floop-chat-shortcut"></a><a id="/loop-chat-shortcut"></a> `/loop` 聊天快捷方式

在聊天中，仅所有者可用的 `/loop [interval] <prompt>` 命令会创建一个绑定到该对话的周期性 agent-turn 作业。提供一个间隔，例如 `5m`，用于固定节奏；或者省略它，让 loop 在 1 分钟到 1 小时之间通过 `next_check` 自行节奏控制。使用 `/loop status` 列出绑定到对话的 loops，使用 `/loop stop [name]` 将其移除。

### <a id="day-of-month-and-day-of-week-use-or-logic"></a> 月内日期和星期几使用 OR 逻辑

Cron 表达式由 [croner](https://github.com/Hexagon/croner) 解析。当月中的日期字段和星期字段都不是通配符时，croner 会在**任一**字段匹配时触发，而不是两者都匹配。这是标准的 Vixie cron 行为。

```bash
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

这每月大约会触发 5-6 次，而不是 0-1 次。若要同时满足两个条件，请使用 croner 的 `+` 星期字段修饰符（`0 9 15 * +1`），或者只按一个字段进行调度，并在作业的 prompt 或命令中对另一个条件进行检查。

## <a id="event-triggers-(condition-watchers)"></a><a id="event-triggers-condition-watchers"></a> 事件触发器（条件监视器）

事件触发器会将无头条件脚本添加到 `every`、`cron` 或 `stream` 调度中。时间调度在到期时对其进行评估；流调度则会针对每个已关闭的批次进行评估。只有当脚本返回 `fire: true` 时，调度器才会运行正常负载：

```json5
{
  schedule: { kind: "every", everyMs: 30000 },
  trigger: {
    // Fires only when the observed status differs from the last evaluation.
    script: "const res = await exec({ command: 'gh pr checks 123 --json state -q \\'.[].state\\' | sort -u' }); const status = String(res?.aggregated ?? '').trim(); json({ fire: status !== trigger.state?.status, message: `PR 123 CI: ${trigger.state?.status ?? 'unknown'} -> ${status}`, state: { status } });",
    once: false,
  },
  payload: { kind: "agentTurn", message: "Investigate the CI status change." },
}
```

强制手动运行绕过此门：`openclaw automations run <job-id>`（默认强制）和带有 `action: "run", runMode: "force"` 的 `automations` 工具跳过 `trigger.script` 并直接执行有效负载。即使脚本返回 `fire: false`，`agentTurn` 有效负载也会唤醒模型。要测试门，请等待预定的评估或在作业到期时使用 `openclaw automations run <job-id> --due`。该工具的默认值 `runMode: "due"` 也支持该门；这两种到期模式都不会使工作提前到期。

`openclaw doctor --fix` 转换调用 `tools.call('exec', args)` 并读取 `.result.details` 信封的持久触发器脚本。 Doctor 保留自定义或不明确的脚本不变，并识别每个受影响的作业以进行手动转换；独立脚本负载不会被转换。

脚本必须返回 `{ fire, message?, state? }`。之前的 JSON 状态以深度冻结的 `trigger.state` 形式提供；流门控还会接收当前批次作为 `trigger.streamBatch`。返回新的 `state` 值即可将其持久化。状态上限为 16 KB。当触发结果包含 `message` 时，调度器会在执行前将其追加到系统事件文本或代理轮次消息中。`once: true` 会在首次成功触发负载后禁用该任务。

更改正在运行的观察程序的条件或保存的状态可以保护旧评估状态更新和 `once` 完成的编辑，包括在网关重新启动后。完成的有效负载仍保留其运行历史记录。未更改的观察者保持其通常的 `once` 行为；重命名它不会重置其条件。

`fire: false` 保留评估状态和计数器，然后重新安排而不创建运行历史记录。这些安静的评估算作重新启动追赶期间已完成的事件。如果触发的有效负载运行失败，则返回的 `state` 是 **not** 持续存在 - 下一次评估会看到之前的状态并可以再次触发，因此将脚本编写为只读检查并将操作保留在有效负载中。触发计划具有 30 秒的内置最小间隔，通过维护和网关重新启动保留。每个评估都有 30 秒的挂钟预算和最多 5 次工具调用。

脚本通过交互式代码模式使用的相同 `MCP.<server>.<tool>({ ...input })` 命名空间调用配置的 MCP 服务器工具。 MCP 是按服务器选择加入的：脚本只能访问其作业的带有服务器前缀的 `toolsAllow` （`--tools`） 名称的服务器，可以是 `wispr-flow__search_meetings` 等精确工具，也可以是 `wispr-flow__*` 等服务器范围的 glob。通配符 `*`、缺少的 `toolsAllow` 或没有服务器前缀的 glob 不会为脚本提供 `MCP` 命名空间，并且不会启动任何服务器，因为评估可以每 30 秒运行一次。来源从未提及 `MCP` 的脚本也不会启动服务器，即使 `toolsAllow` 为有效负载指定一个服务器也是如此。在指定服务器内，所属代理的工具策略仍然适用，就像在交互式运行中一样。 MCP 调用经过相同的工具调用前挂钩和批准，并返回相同的不受信任内容结果。每个评估仅针对指定服务器启动自己的运行时，并在评估结束时退出；缓慢的服务器关闭在 1 秒宽限期后在后台完成。连接和列出工具计入 30 秒预算，每个 MCP 调用计入 5 次调用限制。 `MCP` 中不存在无法启动的命名服务器；如果脚本失败，则运行错误以 `MCP server "<name>" is unavailable: <reason>` 结束。

从 MCP- 支持的检查返回 `fire: false` 会在安静的滴答声中跳过有效负载及其模型调用：

```js
const { structuredContent } = await MCP.wisprFlow.searchMeetings({
  since: trigger.state?.cursor,
});
const meetings = structuredContent?.meetings ?? [];
if (meetings.length === 0) return { fire: false };
return {
  fire: true,
  message: `${meetings.length} new meetings`,
  state: { cursor: meetings.at(-1).id },
};
```

在条件评估期间删除或禁用作业会在其负载开始之前取消该评估。在主会话有效负载将工作交给心跳后，该共享心跳将保留其自己的生命周期。

编写 watcher 时应围绕**可操作状态**，而不仅仅是成功状态：如果某个 watcher 在检查失败或超时时就悄然停止，它看起来会是健康的，但实际上已经坏了。将观察结果与 `trigger.state` 进行比较并返回新的状态以去重；不要依赖模型或进程内存。触发时，`message` 应保持自包含，因为它会成为已触发运行的完整事件上下文。

<Warning>
默认情况下，条件触发脚本和 `script` 有效负载使用所属代理的 **full 工具策略（包括 `exec`**）在无人值守的情况下运行。流调度还可以使操作员编写的命令在无人值守的情况下运行。将这些表面视为具有该代理权限的无人值守代码执行。需要硬停车的操作人员可以设置`cron.triggers.enabled: false`；删除它或将其设置为 `true` 以重新启用它们。
</Warning>

从本地脚本文件创建观察程序（`-` 从标准输入读取脚本）。 CLI 保留文件路径中的前导和尾随空格；将路径引用为一个 shell 参数：

```bash
openclaw automations add \
  --name "PR CI watcher" \
  --every 30s \
  --trigger-script ./watch-pr-ci.js \
  --message "Respond to the CI status change" \
  --session isolated
```
