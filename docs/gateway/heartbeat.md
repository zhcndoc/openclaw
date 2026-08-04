---
summary: "心跳轮询消息和通知规则"
read_when:
  - 调整心跳频率或消息传递
  - 在心跳和自动化之间决定如何执行定时工作
title: "心跳"
sidebarTitle: "心跳"
---

<Note>
**心跳还是自动化？** 有关何时使用哪一种，请参阅 [自动化](/automation)。
</Note>

心跳会在主会话中运行**定期的代理回合**，这样模型就能在不刷屏的情况下，提出任何需要关注的内容。

心跳是一个定期的主会话回合——它**不会**创建[后台任务](/automation/tasks)记录。任务记录用于分离式工作（ACP 运行、子代理、隔离的自动化任务）。

在底层，心跳频率由 Automations 调度器负责：网关会为每个启用心跳的代理维护一个由系统拥有的自动化任务（在 `openclaw cron list --all` 中显示为 `Heartbeat (agent-id)`）。心跳配置仍然是期望状态的输入，而持久化的监控计划负责实际的计时，以及运行器后续的冷却时间。网关会在启动时和配置重新加载时写入配置变更；`openclaw doctor --fix` 可以在下一次网关启动前，将缺失或过时的监控记录具体化。请编辑 `agents.*.heartbeat`，不要编辑自动化任务。

定时心跳需要自动化功能。当 `cron.enabled` 为 `false` 或 `OPENCLAW_SKIP_CRON=1` 时，网关会记录启动警告，并且不会运行定时心跳；手动唤醒和事件驱动的心跳唤醒仍然可用。不存在单独的心跳备用计时器。

故障排查：[自动化](/automation/cron-jobs#troubleshooting)

## 快速开始（新手）

<Steps>
  <Step title="选择一个频率">
    保持启用 heartbeats（默认是 `30m`，如果配置了 Anthropic OAuth/token auth，则为 `1h`，包括 Claude CLI 复用），或者设置你自己的频率。
  </Step>
  <Step title="添加监控暂存内容（可选）">
    使用 `openclaw cron scratch <jobId> --set "..."` 在 heartbeat 监控器的暂存区中存储一个简短的检查清单。
  </Step>
  <Step title="决定 heartbeat 消息发送到哪里">
    `target: "none"` 是默认值；设置 `target: "last"` 可路由到最后一个联系人。
  </Step>
  <Step title="可选调优">
    - 如果 heartbeat 运行只需要监控器暂存内容，请使用轻量级引导上下文。
    - 启用隔离会话，避免每次 heartbeat 都发送完整的对话历史。
    - 将 heartbeat 限制在活跃时间段内（本地时间）。

  </Step>
</Steps>

示例配置：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // 明确发送到最后一个联系人（默认为 "none"）
        directPolicy: "allow", // 默认：允许直接/私信目标；设置为 "block" 可禁止
        lightContext: true, // 可选：heartbeat 运行时跳过工作区引导文件
        isolatedSession: true, // 可选：每次运行使用全新会话（无对话历史）
        // activeHours: { start: "08:00", end: "24:00" },
      },
    },
  },
}
```

## 默认值

- 间隔：`30m`。应用 Anthropic 提供商默认值后，当解析出的身份验证模式为 OAuth/token（包括复用 Claude CLI）时，会将其提升为 `1h`，但仅当未设置 `heartbeat.every` 时生效。设置 `agents.defaults.heartbeat.every` 或按代理设置 `agents.entries.*.heartbeat.every`；使用 `0m` 可禁用。
- 提示词正文（可通过 `agents.defaults.heartbeat.prompt` 配置）：`Follow the heartbeat monitor scratch context when provided. Recurring tasks are automations; create or change their schedules with the automations tool, not heartbeat scratch. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 超时：未设置超时的心跳轮次会在设置了 `agents.defaults.timeoutSeconds` 时使用该值。否则，将使用心跳间隔，但上限为 600 秒。若需要更长的心跳任务，请设置 `agents.defaults.heartbeat.timeoutSeconds` 或按代理设置 `agents.entries.*.heartbeat.timeoutSeconds`。
- 心跳提示词会**原样**作为用户消息发送。当为默认代理启用心跳间隔时，系统提示词会自动包含“心跳”部分；该指导没有单独的心跳开关。
- 使用 `0m` 禁用心跳后，监控自动化任务仍会保留，但会被禁用；其暂存内容也会保留，以便重新启用该间隔时使用。
- 当自动化功能完全禁用时，即使心跳间隔仍处于启用状态，计划心跳也不会运行。
- 活动时段（`heartbeat.activeHours`）会根据配置的时区进行检查。在时间窗口之外，心跳会被跳过，直到下一个处于时间窗口内的时刻。
- 当主队列或自动化任务正在运行或排队、同一代理的任何回复或嵌入式运行正在进行，或解析出的目标会话存在正在运行或排队的任务时，计划心跳会延后。立即唤醒和手动唤醒会绕过对同一代理活动运行的广泛检查，但仍会遵守主队列、自动化任务和目标会话繁忙检查。同级代理之间不会相互暂停。

## heartbeat 提示的用途

默认提示有意保持简洁：在提供 heartbeat 监控临时上下文时遵循该上下文，将重复性工作保留在自动化任务中，并在没有需要关注的事项时回复
`HEARTBEAT_OK`。它明确告知代理**不要**根据过往聊天推断或重复旧任务，因此默认安装会保持安静，而不会重新整理过时的对话上下文。

主动 heartbeat 行为需要选择启用：

- **重复性检查**：为收件箱查看、日历扫描或排队的后续事项创建 [自动化任务](/automation/cron-jobs)。每个任务都会按自身的计划执行其配置的有效载荷；默认 heartbeat 不会从过往聊天中推断重复性工作。
- **人工问候**：如果你希望偶尔收到一条轻量的“有什么需要我帮忙的吗？”消息，请创建一个计划任务，并限制其计划，避免在你配置的本地时区的夜间发送提醒（参见
  [时区](/concepts/timezone)）。

Heartbeat 可以响应已完成的 [后台任务](/automation/tasks)，但 heartbeat 运行本身不会创建任务记录。

如果你希望 heartbeat 执行某项非常具体的操作（例如“检查 Gmail PubSub 统计信息”或“验证网关运行状况”），请将 `agents.defaults.heartbeat.prompt`（或 `agents.entries.*.heartbeat.prompt`）设置为自定义正文（按原样发送）。

## 响应约定

- 如果无需关注，请回复 **`HEARTBEAT_OK`**。
- 心跳运行也可以调用 `heartbeat_respond`，并设置 `notify: false` 以不显示更新，或设置 `notify: true` 并提供 `notificationText` 以发送提醒。如果存在结构化工具响应，则优先使用该响应，而不是文本备用方案。
- 带有意义的 `heartbeat_respond` 结果在设置 `notify: false` 时会保持静默，但会作为有界的内部上下文留存，供该会话中的下一轮用户消息使用。`no_change` 确认和可见通知不会以这种方式存储。
- 在心跳运行期间，当 `HEARTBEAT_OK` 出现在回复的**开头或结尾**时，OpenClaw 会将其视为确认；如果剩余内容不超过 300 个字符，则会移除该标记并丢弃回复。此抑制额度是固定的，无法针对每次心跳单独配置。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，则不会对其进行特殊处理。
- 对于提醒，**不要**包含 `HEARTBEAT_OK`；只返回提醒文本。
- 投递时会选择最后一个具备出站能力且非推理的有效负载。单独的推理或思考负载会保留在内部；仅包含推理的结果不会产生提醒。
- 在心跳轮次期间，工具错误警告仍会启用。

在心跳之外，消息开头/结尾多余的 `HEARTBEAT_OK` 会被去除并记录；只有 `HEARTBEAT_OK` 的消息会被丢弃。

## 配置

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 默认：30m（0m 会禁用）
        model: "anthropic/claude-opus-4-6",
        lightContext: false, // 默认：false；true 会在 heartbeat 运行时跳过工作区引导文件
        isolatedSession: false, // 默认：false；true 会在全新会话中运行每个 heartbeat（无对话历史）
        target: "last", // 默认：none | 选项：last | none | <channel id>（核心或插件，例如 "imessage"）
        to: "+15551234567", // 可选的特定 channel 覆盖
        accountId: "ops-bot", // 可选的多账户 channel id
        prompt: "Follow the heartbeat monitor scratch context when provided. Recurring tasks are automations; create or change their schedules with the automations tool, not heartbeat scratch. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
      },
    },
  },
}
```

### 作用域和优先级

- `agents.defaults.heartbeat` 设置全局 heartbeat 行为。
- `agents.entries.*.heartbeat` 在此基础上合并；如果任一 agent 具有 `heartbeat` 块，则**只有这些 agent**会运行 heartbeats。
- `channels.defaults.heartbeatVisibility` 设置所有 channel 的可见性默认值。
- `channels.<channel>.heartbeatVisibility` 覆盖 channel 默认值。
- `channels.<channel>.accounts.<id>.heartbeatVisibility`（多账户 channel）覆盖每个 channel 的设置。

### 按 agent 的 heartbeats

如果任一 `agents.entries.*` 条目包含 `heartbeat` 块，则**只有这些 agent**会运行 heartbeats。每个 agent 的块会在 `agents.defaults.heartbeat` 基础上合并（因此你可以只设置一次共享默认值，然后按 agent 覆盖）。

示例：两个 agent，只有第二个 agent 运行 heartbeats。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // 明确发送给最后一个联系人（默认是 "none"）
      },
    },
    entries: {
      main: { default: true },
      ops: {
        heartbeat: {
          every: "1h",
          target: "whatsapp",
          to: "+15551234567",
          timeoutSeconds: 45,
          prompt: "Follow the heartbeat monitor scratch context when provided. Recurring tasks are automations; create or change their schedules with the automations tool, not heartbeat scratch. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        },
      },
    },
  },
}
```

### 活跃时段示例

将 heartbeats 限制在特定时区的工作时间内：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // 明确发送给最后一个联系人（默认是 "none"）
        activeHours: {
          start: "09:00",
          end: "22:00",
          timezone: "America/New_York", // 可选；如果设置了你的 userTimezone，则使用它，否则使用主机时区
        },
      },
    },
  },
}
```

在此窗口之外（美东时间上午 9 点之前或晚上 10 点之后），heartbeats 会被跳过。窗口内的下一个计划 tick 将正常运行。

### 24/7 设置

如果你希望 heartbeats 全天运行，请使用以下模式之一：

- 完全省略 `activeHours`（没有时间窗口限制；这是默认行为）。
- 设置全天窗口：`activeHours: { start: "00:00", end: "24:00" }`。

<Warning>
不要将相同的 `start` 和 `end` 时间设为一致（例如 `08:00` 到 `08:00`）。这会被视为零宽度窗口，因此 heartbeats 总是会被跳过。
</Warning>

### 多账户示例

在 Telegram 这类多账户 channels 上，使用 `accountId` 目标指定某个特定账户：

```json5
{
  agents: {
    entries: {
      ops: {
        default: true,
        heartbeat: {
          every: "1h",
          target: "telegram",
          to: "12345678:topic:42", // 可选：路由到特定 topic/thread
          accountId: "ops-bot",
        },
      },
    },
  },
  channels: {
    telegram: {
      accounts: {
        "ops-bot": { botToken: "YOUR_TELEGRAM_BOT_TOKEN" },
      },
    },
  },
}
```

### 字段说明

<ParamField path="every" type="string">
  Heartbeat 间隔（持续时间字符串；默认单位 = 分钟）。
</ParamField>
<ParamField path="model" type="string">
  heartbeat 运行的可选模型覆盖（`provider/model`）。
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  当为 true 时，heartbeat 运行会使用轻量级引导上下文，并跳过工作区引导文件。无论何种情况，监控 scratch 都会由 heartbeat runner 注入。
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  当为 true 时，每次 heartbeat 都会在没有此前对话历史的全新会话中运行。使用与 `sessionTarget: "isolated"` 的自动化作业相同的隔离模式。可大幅降低每次 heartbeat 的 token 成本。与 `lightContext: true` 结合使用可实现最大节省。传递路由仍使用主会话上下文。
</ParamField>
<ParamField path="session" type="string">
  heartbeat 运行的可选会话键。

- `main`（默认）：agent 主会话。
- 显式会话键（从 `openclaw sessions --json` 或 [sessions CLI](/cli/sessions) 复制）。
- 会话键格式：参见 [Sessions](/concepts/session) 和 [Groups](/channels/groups)。

</ParamField>
<ParamField path="target" type="string">
- `last`：发送到最后使用的外部 channel。
- 显式 channel：任何已配置的 channel 或插件 id，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
- `none`（默认）：运行 heartbeat，但**不进行**外部发送。

</ParamField>
<ParamField path="directPolicy" type='"allow" | "block"' default="allow">
  控制直接/DM 传递行为。`allow`：允许直接/DM heartbeat 发送。`block`：抑制直接/DM 发送（`reason=dm-blocked`）。

</ParamField>
<ParamField path="to" type="string">
  可选的接收者覆盖（按 channel 的 id，例如 WhatsApp 的 E.164 或 Telegram 的 chat id）。对于 Telegram topics/threads，使用 `<chatId>:topic:<messageThreadId>`。

</ParamField>
<ParamField path="accountId" type="string">
  多账户 channels 的可选 account id。当 `target: "last"` 时，如果解析得到的最后一个 channel 支持账户，则该 account id 会应用于该 channel；否则会被忽略。如果 account id 与解析得到的 channel 的已配置账户不匹配，则会跳过发送。

</ParamField>
<ParamField path="prompt" type="string">
  覆盖默认提示正文（不进行合并）。

</ParamField>
<ParamField path="timeoutSeconds" type="number" default="global timeout or min(every, 600)">
  在 heartbeat agent 回合被中止之前允许的最长秒数。若未设置，则使用 `agents.defaults.timeoutSeconds`（若已设置），否则使用 heartbeat 节奏上限 600 秒。

</ParamField>
<ParamField path="activeHours" type="object">
  将 heartbeat 运行限制在一个时间窗口内。对象包含 `start`（HH:MM，含；日开始请用 `00:00`）、`end`（HH:MM，不含；允许使用 `24:00` 表示日结束）以及可选的 `timezone`。

- 省略或 `"user"`：如果设置了 `agents.defaults.userTimezone`，则使用它；否则回退到主机系统时区。
- `"local"`：始终使用主机系统时区。
- 任意 IANA 标识符（例如 `America/New_York`）：直接使用；如果无效，则回退到上面的 `"user"` 行为。
- 对于活跃窗口，`start` 和 `end` 不能相等；相等值会被视为零宽度（始终处于窗口之外）。
- 在活跃窗口之外，heartbeats 会被跳过，直到下一个落在窗口内的 tick。

</ParamField>

<Note>
Heartbeat 配置是严格的：只接受上面列出的字段。确认消息抑制、推理可见性、系统提示指导、繁忙时延迟以及工具错误警告行为，都是固定的运行时策略，而不是 heartbeat 配置字段。
</Note>

## 投递行为

<AccordionGroup>
  <Accordion title="会话和目标路由">
    - 默认情况下，心跳在代理的主会话（`agent:<id>:<mainKey>`）中运行；当 `session.scope = "global"` 时，则在 `global` 中运行。将 `session` 设置为特定的频道会话（Discord/WhatsApp 等）可覆盖此行为。
    - `session` 只影响运行上下文；投递由 `target` 和 `to` 控制。
    - 若要投递到特定频道/接收者，请设置 `target` + `to`。当 `target: "last"` 时，投递会使用该会话的上一个外部频道。
    - 默认情况下，心跳投递允许直接目标/私信目标。设置 `directPolicy: "block"` 可禁止向直接目标发送消息，同时仍运行心跳轮次。
    - 当主队列或自动化任务繁忙、同一代理的任何回复或嵌入式运行处于活动状态，或解析出的目标会话存在活动中或排队中的任务时，计划心跳会被跳过并稍后重试。立即唤醒和手动唤醒仅绕过广泛的同一代理活动运行预检查。
    - 如果 `target` 未解析出任何外部目的地，运行仍会执行，但不会发送外发消息。

  </Accordion>
  <Accordion title="可见性和跳过行为">
    - 如果 `showOk`、`showAlerts` 和 `useIndicator` 全部禁用，则会直接跳过运行，原因是 `reason=alerts-disabled`。
    - 如果只禁用了告警投递，OpenClaw 仍可运行心跳、更新到期任务时间戳、恢复会话空闲时间戳，并抑制外发告警载荷。
    - 如果解析出的心跳目标支持输入中状态，OpenClaw 会在心跳运行期间显示输入中状态。这使用与心跳要发送聊天输出相同的目标，并且可通过 `typingMode: "never"` 禁用。

  </Accordion>
  <Accordion title="会话生命周期和审计">
    - 仅包含心跳的回复**不会**保持会话存活。心跳元数据可能会更新会话行，但空闲过期使用的是最后一次真实用户/频道消息的 `lastInteractionAt`，而每日过期使用 `sessionStartedAt`。
    - 控制界面和 WebChat 历史会隐藏心跳提示和仅 OK 确认。底层会话转录仍可能包含这些轮次以用于审计/回放。
    - 分离的[后台任务](/automation/tasks)可以在主会话需要快速注意到某事时排队一个系统事件并唤醒心跳。该唤醒不会使心跳变成后台任务。

  </Accordion>
</AccordionGroup>

## 可见性控制

默认情况下，在投递告警内容时会抑制 `HEARTBEAT_OK` 确认。你可以按频道或按账户进行调整：

```yaml
channels:
  defaults:
    heartbeatVisibility:
      showOk: false # 隐藏 HEARTBEAT_OK（默认）
      showAlerts: true # 显示告警消息（默认）
      useIndicator: true # 发出指示器事件（默认）
  telegram:
    heartbeatVisibility:
      showOk: true # 在 Telegram 上显示 OK 确认
  whatsapp:
    accounts:
      work:
        heartbeatVisibility:
          showAlerts: false # 抑制此账户的告警投递
```

优先级：按账户 → 按频道 → 频道默认值 → 内置默认值。

### 每个标志的作用

- `showOk`：当模型返回仅 OK 回复时，发送 `HEARTBEAT_OK` 确认。
- `showAlerts`：当模型返回非 OK 回复时，发送告警内容。
- `useIndicator`：为 UI 状态界面发出指示器事件。

如果这三个都为 false，OpenClaw 会完全跳过心跳运行（不会调用模型）。

### 按频道 vs 按账户示例

```yaml
channels:
  defaults:
    heartbeatVisibility:
      showOk: false
      showAlerts: true
      useIndicator: true
  slack:
    heartbeatVisibility:
      showOk: true # 所有 Slack 账户
    accounts:
      ops:
        heartbeatVisibility:
          showAlerts: false # 仅抑制 ops 账户的告警
  telegram:
    heartbeatVisibility:
      showOk: true
```

### 常见模式

| 目标                                     | 配置                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 默认行为（静默 OK，启用告警）            | _(无需配置)_                                                                                     |
| 完全静默（无消息、无指示器）             | `channels.defaults.heartbeatVisibility: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）                       | `channels.defaults.heartbeatVisibility: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个频道中显示 OK                    | `channels.telegram.heartbeatVisibility: { showOk: true }`                                          |

## 监控暂存内容（可选）

每个心跳监控自动化任务都拥有一个存储在共享状态数据库中的私有暂存文档。可以把它看作你的“心跳检查清单”：简短、稳定，并且每 30 分钟查看一次是安全的。暂存内容存在时，会被附加到心跳提示词中。

使用自动化 CLI 管理它（任务 ID 来自 `openclaw cron list --all`）：

```bash
openclaw cron scratch <jobId>                 # 打印当前暂存内容
openclaw cron scratch <jobId> --set "..."     # 用精确文本替换暂存内容
openclaw cron scratch <jobId> --file notes.md # 从文件替换暂存内容（- 表示从标准输入读取）
openclaw cron scratch <jobId> --unset         # 移除暂存内容
```

写入操作受比较并交换保护：传入 `--expected-revision <n>`，如果存在并发编辑则会失败，而不是覆盖内容。暂存内容上限为 256 KiB，并且永远不会出现在 `cron list`/`cron runs` 的输出中。

代理也可以更新自己的暂存内容：在一次心跳轮次中，`heartbeat_respond` 接受可选的 `scratch` 字符串，该字符串会完全替换监控器之后心跳所使用的暂存内容。

<Note>
**从 HEARTBEAT.md 或仅配置的频率迁移？** 运行 `openclaw doctor --fix`。Doctor 首先根据 `agents.*.heartbeat` 创建或更新系统拥有的监控器记录，然后将每个代理工作区中的 `HEARTBEAT.md` 导入监控器的暂存内容，将所有有效的旧版 `tasks:` 条目转换为自动化任务，把原文件归档到状态目录（`backups/heartbeat-migration/`）下，并删除该文件。运行时的心跳指令仅来自数据库暂存内容；运行时不会读取 `HEARTBEAT.md`。
</Note>

如果暂存内容存在，但实际上为空（仅包含空行、Markdown/HTML 注释、类似 `# Heading` 的 Markdown 标题、围栏标记或空的清单占位项），OpenClaw 会跳过此次心跳运行，以节省 API 调用。该跳过操作会以 `reason=empty-heartbeat-file` 报告。如果不存在暂存内容，心跳仍会运行，并由模型决定执行什么操作。

保持它足够小（简短清单或提醒），以避免提示词膨胀。

示例暂存内容：

```md
# 心跳检查清单

- 快速扫一眼：收件箱里有什么紧急事项吗？
- 如果是白天，而且没有其他待办，就做一次轻量级签到。
- 如果某个任务被阻塞，记下_缺少什么_，下次问 Peter。
```

### 使用自动化任务安排定期检查

心跳暂存内容是提示词上下文，而不是调度器。将每项定期检查创建为一个[自动化任务](/automation/cron-jobs)，使其拥有独立的执行频率、启用/禁用状态和运行历史。当检查应使用正常对话上下文时，自动化任务仍然可以将目标设为主会话。

较旧的暂存内容可能包含结构化的 `tasks:` 块。升级后运行一次 `openclaw doctor --fix`：Doctor 会将每个有效条目转换为一个独立调度的自动化任务，保留其间隔和之前的上次运行时间，并移除已废弃的块，同时保留周围的暂存说明文字。运行时的心跳轮次不会将 `tasks:` 文本解析为调度计划。

Doctor 创建的心跳任务会保留心跳的活跃时段、冷却时间、防洪和忙碌保护机制。同时到期的任务可以合并到一次心跳轮次中。在活跃时段之外到期的任务会被跳过，并在下一次计划的发生时间再次尝试。

### 代理可以更新自己的暂存内容吗？

可以。在一次心跳轮次中，代理可以向 `heartbeat_respond` 传入 `scratch` 值，以完全替换监控器之后心跳所使用的说明文字。你也可以在普通聊天中要求它运行 `openclaw cron scratch <jobId> --set ...`，或者使用相同的命令自行编辑暂存内容。请使用自动化任务管理定期计划，而不要将调度语法写入暂存内容。

<Warning>
不要将机密信息（API 密钥、电话号码、私有令牌）放入监控器暂存内容中——它会成为提示词上下文的一部分。
</Warning>

## 手动唤醒（按需）

使用 `openclaw system event` 来排队一个系统事件，并可选择立即触发一次心跳：

```bash
openclaw system event --text "检查紧急跟进事项" --mode now
```

| Flag                         | Description                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `--text <text>`              | 系统事件文本（必填）。                                                                    |
| `--mode <mode>`              | `now` 立即运行一次心跳；`next-heartbeat`（默认）等待下一个计划时刻。 |
| `--session-key <sessionKey>` | 为该事件指定特定会话；默认使用代理的主会话。                   |
| `--json`                     | 输出 JSON。                                                                                     |

如果未提供 `--session-key`，且多个代理都配置了 `heartbeat`，那么 `--mode now` 会立即运行这些代理各自的心跳。

同一 CLI 组中的相关心跳控制命令：

```bash
openclaw system heartbeat last     # 显示最后一次心跳事件
openclaw system heartbeat enable   # 启用心跳
openclaw system heartbeat disable  # 禁用心跳
```

## 成本意识

心跳会运行完整的代理轮次。间隔越短，消耗的 token 越多。为了降低成本：

- 使用 `isolatedSession: true`，避免发送完整的对话历史记录（每次运行约从 10 万个 token 降至 2,000–5,000 个 token）。
- 使用 `lightContext: true`，跳过心跳运行所需的工作区引导文件。
- 设置更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持监控临时记录简洁。
- 如果只想更新内部状态，请使用 `target: "none"`。

## 心跳后的上下文溢出

心跳会在运行完成后保留共享会话的现有运行时模型，因此，如果某个心跳将会话切换到了一个更小的本地模型（例如一个具有 32k 窗口的 Ollama 模型），那么该模型可能会保留在原处，供下一次主会话轮次继续使用。如果下一轮随后报告上下文溢出，并且会话的最后运行时模型与配置的 `heartbeat.model` 一致，OpenClaw 的恢复消息就会指出心跳模型泄漏很可能是原因，并建议采取修复措施。

为避免这种情况：使用 `isolatedSession: true` 在一个新的会话中运行心跳（可选地再结合 `lightContext: true` 以获得最小提示），或者选择一个上下文窗口足够大的心跳模型，以适配共享会话。

## 相关内容

- [自动化](/automation) - 所有自动化机制一览
- [后台任务](/automation/tasks) - 如何跟踪分离的工作
- [时区](/concepts/timezone) - 时区如何影响心跳调度
- [故障排查](/automation/cron-jobs#troubleshooting) - 调试自动化问题。
