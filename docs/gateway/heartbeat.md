---
summary: "Heartbeat 轮询消息和通知规则"
read_when:
  - 调整 heartbeat 频率或消息
  - 在 heartbeat 和 cron 之间为计划任务做决定
title: "Heartbeat"
sidebarTitle: "Heartbeat"
---

<Note>
**Heartbeat vs cron?** 参见 [Automation](/automation) 了解何时使用各自功能的指导。
</Note>

Heartbeat 会在主会话中运行**定期的 agent 回合**，这样模型就能在不刷屏的情况下，提出任何需要关注的内容。

Heartbeat 是一个安排好的主会话回合——它**不会**创建 [background task](/automation/tasks) 记录。任务记录用于分离的工作（ACP runs、subagents、隔离的 cron jobs）。

Under the hood, heartbeat cadence is owned by the cron scheduler: the gateway maintains one system-owned cron job per heartbeat-enabled agent (visible in `openclaw cron list --all` as `Heartbeat (agent-id)`). Heartbeat config remains the desired-state input, while the persisted monitor schedule owns the actual tick and the runner's later cooldown. The gateway writes config changes through at startup and on config reload; `openclaw doctor --fix` can materialize missing or stale monitor rows before the next gateway start. Edit `agents.*.heartbeat`, not the cron job.

Scheduled heartbeats require cron. When `cron.enabled` is `false` or `OPENCLAW_SKIP_CRON=1`, the gateway logs a startup warning and does not run scheduled heartbeats; manual and event-driven heartbeat wakes remain available. There is no separate heartbeat fallback timer.

Troubleshooting: [Scheduled Tasks](/automation/cron-jobs#troubleshooting)

## 快速开始（新手）

<Steps>
  <Step title="选择一个频率">
    保持启用 heartbeats（默认是 `30m`，如果配置了 Anthropic OAuth/token auth，则为 `1h`，包括 Claude CLI 复用），或者设置你自己的频率。
  </Step>
  <Step title="Add monitor scratch (optional)">
    Store a tiny checklist in the heartbeat monitor's scratch with `openclaw cron scratch <jobId> --set "..."`.
  </Step>
  <Step title="决定 heartbeat 消息发送到哪里">
    `target: "none"` 是默认值；设置 `target: "last"` 可路由到最后一个联系人。
  </Step>
  <Step title="Optional tuning">
    - Use lightweight bootstrap context if heartbeat runs only need the monitor scratch.
    - Enable isolated sessions to avoid sending full conversation history each heartbeat.
    - Restrict heartbeats to active hours (local time).

  </Step>
</Steps>

示例配置：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
        directPolicy: "allow", // default: allow direct/DM targets; set "block" to suppress
        lightContext: true, // optional: skip workspace bootstrap files for heartbeat runs
        isolatedSession: true, // optional: fresh session each run (no conversation history)
        // activeHours: { start: "08:00", end: "24:00" },
      },
    },
  },
}
```

## 默认值

- Interval: `30m`. Applying Anthropic provider defaults bumps this to `1h` when the resolved auth mode is OAuth/token (including Claude CLI reuse), but only while `heartbeat.every` is unset. Set `agents.defaults.heartbeat.every` or per-agent `agents.entries.*.heartbeat.every`; use `0m` to disable.
- Prompt body (configurable via `agents.defaults.heartbeat.prompt`): `Follow the heartbeat monitor scratch context when provided. Recurring tasks are cron jobs; create or change their schedules with cron tools or the openclaw cron CLI, not heartbeat scratch. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Timeout: unset heartbeat turns use `agents.defaults.timeoutSeconds` when set. Otherwise, they use the heartbeat cadence capped at 600 seconds. Set `agents.defaults.heartbeat.timeoutSeconds` or per-agent `agents.entries.*.heartbeat.timeoutSeconds` for longer heartbeat work.
- The heartbeat prompt is sent **verbatim** as the user message. The system prompt automatically includes a "Heartbeats" section when cadence is enabled for the default agent; that guidance has no separate heartbeat toggle.
- When heartbeats are disabled with `0m`, the monitor cron job stays but is disabled, and its scratch is retained for when you re-enable the cadence.
- When cron itself is disabled, scheduled heartbeats do not run even if heartbeat cadence remains enabled.
- Active hours (`heartbeat.activeHours`) are checked in the configured timezone. Outside the window, heartbeats are skipped until the next tick inside the window.
- Scheduled heartbeats defer while the main queue or cron work is active or queued, while any reply or embedded run for the same agent is active, and while the resolved target session has active or queued work. Immediate and manual wakes bypass the broad same-agent active-run check, but still honor the main, cron, and target-session busy guards. Sibling agents do not pause each other.

## heartbeat 提示的用途

The default prompt is intentionally narrow: follow the heartbeat monitor scratch
context when provided, keep recurring work in cron jobs, and reply
`HEARTBEAT_OK` when nothing needs attention. It explicitly tells the agent
**not** to infer or repeat old tasks from prior chats, so a default install stays
quiet instead of rehashing stale conversation context.

Proactive heartbeat behavior is opt-in:

- **Recurring checks**: create [scheduled jobs](/automation/cron-jobs) for inbox
  review, calendar sweeps, or queued follow-ups. Each job executes its configured
  payload on its own schedule; the default heartbeat does not infer recurring
  work from prior chats.
- **Human check-in**: create a scheduled job if you want an occasional
  lightweight "anything you need?" message, and constrain its schedule to avoid
  night-time pings in your configured local timezone (see
  [Timezone](/concepts/timezone)).

Heartbeat 可以响应已完成的 [后台任务](/automation/tasks)，但 heartbeat 运行本身不会创建任务记录。

If you want a heartbeat to do something very specific (e.g. "check Gmail PubSub stats" or "verify gateway health"), set `agents.defaults.heartbeat.prompt` (or `agents.entries.*.heartbeat.prompt`) to a custom body (sent verbatim).

## 响应约定

- If nothing needs attention, reply with **`HEARTBEAT_OK`**.
- Heartbeat runs may instead call `heartbeat_respond` with `notify: false` for no visible update, or `notify: true` plus `notificationText` for an alert. When present, the structured tool response takes precedence over the text fallback.
- A meaningful `heartbeat_respond` result with `notify: false` remains silent but is remembered as bounded internal context for the next user turn in that session. `no_change` acknowledgments and visible notifications are not stored this way.
- During heartbeat runs, OpenClaw treats `HEARTBEAT_OK` as an ack when it appears at the **start or end** of the reply. The token is stripped and the reply is dropped if the remaining content is at most 300 characters. This suppression budget is fixed, not configurable per heartbeat.
- If `HEARTBEAT_OK` appears in the **middle** of a reply, it is not treated specially.
- For alerts, **do not** include `HEARTBEAT_OK`; return only the alert text.
- Delivery selects the last outbound-capable non-reasoning payload. Separate reasoning or thinking payloads remain internal; a reasoning-only result produces no alert.
- Tool error warnings remain enabled during heartbeat turns.

在 heartbeats 之外，消息开头/结尾多余的 `HEARTBEAT_OK` 会被去除并记录；只有 `HEARTBEAT_OK` 的消息会被丢弃。

## 配置

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 默认：30m（0m 会禁用）
        model: "anthropic/claude-opus-4-6",
        lightContext: false, // default: false; true skips workspace bootstrap files for heartbeat runs
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        target: "last", // default: none | options: last | none | <channel id> (core or plugin, e.g. "imessage")
        to: "+15551234567", // optional channel-specific override
        accountId: "ops-bot", // optional multi-account channel id
        prompt: "Follow the heartbeat monitor scratch context when provided. Recurring tasks are cron jobs; create or change their schedules with cron tools or the openclaw cron CLI, not heartbeat scratch. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
      },
    },
  },
}
```

### 作用域和优先级

- `agents.defaults.heartbeat` sets global heartbeat behavior.
- `agents.entries.*.heartbeat` merges on top; if any agent has a `heartbeat` block, **only those agents** run heartbeats.
- `channels.defaults.heartbeatVisibility` sets visibility defaults for all channels.
- `channels.<channel>.heartbeatVisibility` overrides channel defaults.
- `channels.<channel>.accounts.<id>.heartbeatVisibility` (multi-account channels) overrides per-channel settings.

### 按 agent 的 heartbeats

If any `agents.entries.*` entry includes a `heartbeat` block, **only those agents** run heartbeats. The per-agent block merges on top of `agents.defaults.heartbeat` (so you can set shared defaults once and override per agent).

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
    list: [
      { id: "main", default: true },
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "whatsapp",
          to: "+15551234567",
          timeoutSeconds: 45,
          prompt: "Follow the heartbeat monitor scratch context when provided. Recurring tasks are cron jobs; create or change their schedules with cron tools or the openclaw cron CLI, not heartbeat scratch. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        },
      },
    ],
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
    list: [
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "telegram",
          to: "12345678:topic:42", // 可选：路由到特定 topic/thread
          accountId: "ops-bot",
        },
      },
    ],
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
  When true, heartbeat runs use lightweight bootstrap context and skip workspace bootstrap files. Monitor scratch is injected by the heartbeat runner either way.
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  为 true 时，每次 heartbeat 都会在没有之前对话历史的新会话中运行。使用与 cron `sessionTarget: "isolated"` 相同的隔离模式。可大幅降低每次 heartbeat 的 token 成本。与 `lightContext: true` 结合可获得最大节省。传递路由仍然使用主会话上下文。
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
Heartbeat configuration is strict: only the fields listed above are accepted. Acknowledgment suppression, reasoning visibility, system-prompt guidance, busy deferral, and tool-error warning behavior are fixed runtime policies rather than heartbeat configuration fields.
</Note>

## Delivery behavior

<AccordionGroup>
  <Accordion title="Session and target routing">
    - Heartbeats run in the agent's main session by default (`agent:<id>:<mainKey>`), or `global` when `session.scope = "global"`. Set `session` to override to a specific channel session (Discord/WhatsApp/etc.).
    - `session` only affects the run context; delivery is controlled by `target` and `to`.
    - To deliver to a specific channel/recipient, set `target` + `to`. With `target: "last"`, delivery uses the last external channel for that session.
    - Heartbeat deliveries allow direct/DM targets by default. Set `directPolicy: "block"` to suppress direct-target sends while still running the heartbeat turn.
    - Scheduled heartbeats are skipped and retried later when the main queue or cron work is busy, any reply or embedded run for the same agent is active, or the resolved target session has active or queued work. Immediate and manual wakes bypass only the broad same-agent active-run precheck.
    - If `target` resolves to no external destination, the run still happens but no outbound message is sent.

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
    heartbeat:
      showOk: false # 隐藏 HEARTBEAT_OK（默认）
      showAlerts: true # 显示告警消息（默认）
      useIndicator: true # 发出指示器事件（默认）
  telegram:
    heartbeat:
      showOk: true # 在 Telegram 上显示 OK 确认
  whatsapp:
    accounts:
      work:
        heartbeat:
          showAlerts: false # 对此账户抑制告警投递
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
    heartbeat:
      showOk: false
      showAlerts: true
      useIndicator: true
  slack:
    heartbeat:
      showOk: true # 所有 Slack 账户
    accounts:
      ops:
        heartbeat:
          showAlerts: false # 仅抑制 ops 账户的告警
  telegram:
    heartbeat:
      showOk: true
```

### 常见模式

| 目标 | 配置 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| 默认行为（静默 OK，告警开启） | _(无需配置)_ |
| 完全静默（无消息、无指示器） | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息） | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }` |
| 仅在一个频道中显示 OK | `channels.telegram.heartbeat: { showOk: true }` |

## Monitor scratch (optional)

Each heartbeat monitor cron job owns a private scratch document stored in the shared state database. Think of it as your "heartbeat checklist": small, stable, and safe to consider every 30 minutes. When scratch exists, its content is appended to the heartbeat prompt.

Manage it with the cron CLI (the job id comes from `openclaw cron list --all`):

```bash
openclaw cron scratch <jobId>                 # print the current scratch
openclaw cron scratch <jobId> --set "..."     # replace it with exact text
openclaw cron scratch <jobId> --file notes.md # replace it from a file (- for stdin)
openclaw cron scratch <jobId> --unset         # remove it
```

Writes are compare-and-swap guarded: pass `--expected-revision <n>` to fail instead of overwriting a concurrent edit. Scratch is capped at 256 KiB and never appears in `cron list`/`cron runs` output.

The agent can also update its own scratch: during a heartbeat turn, `heartbeat_respond` accepts an optional `scratch` string that fully replaces the monitor's scratch for future heartbeats.

<Note>
**Migrating from HEARTBEAT.md or config-only cadence?** Run `openclaw doctor --fix`. Doctor first creates or updates the system-owned monitor rows from `agents.*.heartbeat`, then imports each agent's workspace `HEARTBEAT.md` into the monitor's scratch, converts any valid legacy `tasks:` entries into cron jobs, archives the original under the state directory (`backups/heartbeat-migration/`), and removes the file. Runtime heartbeat instructions come from database scratch only; the runtime never reads `HEARTBEAT.md`.
</Note>

If scratch exists but is effectively empty (only blank lines, Markdown/HTML comments, Markdown headings like `# Heading`, fence markers, or empty checklist stubs), OpenClaw skips the heartbeat run to save API calls. That skip is reported as `reason=empty-heartbeat-file`. If no scratch exists, the heartbeat still runs and the model decides what to do.

保持它足够小（简短清单或提醒），以避免提示词膨胀。

Example scratch:

```md
# 心跳检查清单

- 快速扫一眼：收件箱里有什么紧急事项吗？
- 如果是白天，而且没有其他待办，就做一次轻量级签到。
- 如果某个任务被阻塞，记下_缺少什么_，下次问 Peter。
```

### Schedule recurring checks with cron

Heartbeat scratch is prompt context, not a scheduler. Create each recurring check as a [cron job](/automation/cron-jobs) so it has its own cadence, enable/disable state, and run history. Cron jobs can still target the main session when the check should use the normal conversation context.

Older scratch may contain a structured `tasks:` block. Run `openclaw doctor --fix` once after upgrading: Doctor converts every valid entry into an independently scheduled cron job, preserves its interval and previous last-run timing, and removes the retired block while keeping surrounding scratch prose. Runtime heartbeat turns do not parse `tasks:` text as schedules.

Doctor-created heartbeat task jobs keep heartbeat active-hours, cooldown, flood, and busy guards. Jobs due together can coalesce into one heartbeat turn. An occurrence outside active hours is skipped and tried again at its next cron occurrence.

### Can the agent update its scratch?

Yes. During a heartbeat turn, the agent can pass a `scratch` value to `heartbeat_respond` to fully replace the monitor prose for future heartbeats. You can also ask it in a normal chat to run `openclaw cron scratch <jobId> --set ...`, or edit the scratch yourself with the same command. Manage recurring schedules with cron instead of writing scheduler syntax into scratch.

<Warning>
Don't put secrets (API keys, phone numbers, private tokens) into monitor scratch - it becomes part of the prompt context.
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

## Cost awareness

心跳会运行完整的代理轮次。间隔越短，消耗的 token 越多。为了降低成本：

- Use `isolatedSession: true` to avoid sending full conversation history (~100K tokens down to ~2-5K per run).
- Use `lightContext: true` to skip workspace bootstrap files for heartbeat runs.
- Set a cheaper `model` (e.g. `ollama/llama3.2:1b`).
- Keep the monitor scratch small.
- Use `target: "none"` if you only want internal state updates.

## 心跳后的上下文溢出

心跳会在运行完成后保留共享会话的现有运行时模型，因此，如果某个心跳将会话切换到了一个更小的本地模型（例如一个具有 32k 窗口的 Ollama 模型），那么该模型可能会保留在原处，供下一次主会话轮次继续使用。如果下一轮随后报告上下文溢出，并且会话的最后运行时模型与配置的 `heartbeat.model` 一致，OpenClaw 的恢复消息就会指出心跳模型泄漏很可能是原因，并建议采取修复措施。

为避免这种情况：使用 `isolatedSession: true` 在一个新的会话中运行心跳（可选地再结合 `lightContext: true` 以获得最小提示），或者选择一个上下文窗口足够大的心跳模型，以适配共享会话。

## 相关内容

- [自动化](/automation) - 所有自动化机制一览
- [后台任务](/automation/tasks) - 如何跟踪分离的工作
- [时区](/concepts/timezone) - 时区如何影响心跳调度
- [故障排查](/automation/cron-jobs#troubleshooting) - 调试自动化问题
