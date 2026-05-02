---
summary: "心跳轮询消息和通知规则"
read_when:
  - 调整心跳频率或消息
  - 在心跳和 cron 之间为计划任务做决定
title: "心跳"
sidebarTitle: "心跳"
---

<Note>
**Heartbeat vs cron?** 参见 [Automation & Tasks](/automation) 以了解何时使用各自功能。
</Note>

Heartbeat 会在主会话中运行**定期的 agent 回合**，这样模型就能在不刷屏的情况下，提出任何需要关注的内容。

Heartbeat 是一个计划好的主会话回合——它**不会**创建 [后台任务](/automation/tasks) 记录。任务记录用于脱离的工作（ACP 运行、子 agent、隔离的 cron 作业）。

故障排查：[计划任务](/automation/cron-jobs#troubleshooting)

## 快速开始（新手）

<Steps>
  <Step title="选择频率">
    保持启用 heartbeats（默认是 `30m`，如果检测到 Anthropic OAuth/token auth，则为 `1h`，包括 Claude CLI 复用），或者设置你自己的频率。
  </Step>
  <Step title="添加 HEARTBEAT.md（可选）">
    在 agent 工作区中创建一个很小的 `HEARTBEAT.md` 检查清单或 `tasks:` 区块。
  </Step>
  <Step title="决定 heartbeat 消息发送到哪里">
    `target: "none"` 是默认值；设置 `target: "last"` 可路由到最后一个联系人。
  </Step>
  <Step title="可选调优">
    - 启用 heartbeat reasoning 传递以提高透明度。
    - 如果 heartbeat 运行只需要 `HEARTBEAT.md`，则使用轻量级 bootstrap 上下文。
    - 启用隔离会话，避免每次 heartbeat 都发送完整对话历史。
    - 将 heartbeats 限制在活跃时段内（本地时间）。

  </Step>
</Steps>

示例配置：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // 明确发送给最后一个联系人（默认是 "none"）
        directPolicy: "allow", // 默认：允许直接/DM 目标；设为 "block" 可抑制
        lightContext: true, // 可选：仅从 bootstrap 文件中注入 HEARTBEAT.md
        isolatedSession: true, // 可选：每次运行都使用新会话（无对话历史）
        skipWhenBusy: true, // 可选：在子 agent 或嵌套 lane 忙碌时也延后
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // 可选：也发送单独的 `Reasoning:` 消息
      },
    },
  },
}
```

## 默认值

- 间隔：`30m`（如果检测到 Anthropic OAuth/token auth 为身份验证模式，则为 `1h`，包括 Claude CLI 复用）。设置 `agents.defaults.heartbeat.every` 或按 agent 设置 `agents.list[].heartbeat.every`；使用 `0m` 可禁用。
- 提示正文（可通过 `agents.defaults.heartbeat.prompt` 配置）：`如果存在 HEARTBEAT.md（工作区上下文），请阅读它。严格遵循其中内容。不要从之前的聊天中推断或重复旧任务。如果没有需要关注的内容，回复 HEARTBEAT_OK。`
- heartbeat 提示会作为用户消息**逐字**发送。只有在默认 agent 启用 heartbeats 时，系统提示中才会包含 "Heartbeat" 部分，并且该运行会被内部标记。
- 当 heartbeats 使用 `0m` 禁用时，正常运行也会从 bootstrap 上下文中省略 `HEARTBEAT.md`，这样模型就不会看到仅用于 heartbeat 的说明。
- 活跃时段（`heartbeat.activeHours`）会根据所配置的时区进行检查。在窗口之外，heartbeats 会被跳过，直到下一个落在窗口内的 tick。
- 当 cron 工作处于活动或排队状态时，heartbeats 会自动延后。将 `heartbeat.skipWhenBusy: true` 设为在额外繁忙的 lanes（子 agent 或嵌套命令工作）也延后；这对本地 Ollama 和其他受限的单运行时主机很有用。

## heartbeat 提示的用途

默认提示有意设计得较为宽泛：

- **后台任务**："考虑未完成的任务" 会提示 agent 复查后续事项（收件箱、日历、提醒、排队中的工作），并提出任何紧急内容。
- **人工签到**："白天时偶尔检查一下你的 human" 会提示偶尔发送轻量级的“你需要什么吗？”消息，但会使用你配置的本地时区来避免夜间刷屏（参见 [Timezone](/concepts/timezone)）。

Heartbeat 可以响应已完成的 [后台任务](/automation/tasks)，但 heartbeat 运行本身不会创建任务记录。

如果你希望 heartbeat 执行非常具体的操作（例如“检查 Gmail PubSub 状态”或“验证网关健康状况”），请将 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）设置为自定义正文（逐字发送）。

## 响应约定

- If nothing needs attention, reply with **`HEARTBEAT_OK`**.
- Tool-capable heartbeat runs may instead call `heartbeat_respond` with `notify: false` for no visible update, or `notify: true` plus `notificationText` for an alert. When present, the structured tool response takes precedence over the text fallback.
- During heartbeat runs, OpenClaw treats `HEARTBEAT_OK` as an ack when it appears at the **start or end** of the reply. The token is stripped and the reply is dropped if the remaining content is **≤ `ackMaxChars`** (default: 300).
- If `HEARTBEAT_OK` appears in the **middle** of a reply, it is not treated specially.
- For alerts, **do not** include `HEARTBEAT_OK`; return only the alert text.

在 heartbeats 之外，消息开头/结尾多余的 `HEARTBEAT_OK` 会被去除并记录；只有 `HEARTBEAT_OK` 的消息会被丢弃。

## 配置

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 默认：30m（0m 会禁用）
        model: "anthropic/claude-opus-4-6",
        includeReasoning: false, // 默认：false（在可用时传递单独的 Reasoning: 消息）
        lightContext: false, // 默认：false；为 true 时，仅保留工作区 bootstrap 文件中的 HEARTBEAT.md
        isolatedSession: false, // 默认：false；为 true 时，每次 heartbeat 都在新会话中运行（无对话历史）
        skipWhenBusy: false, // 默认：false；为 true 时也会等待 subagent/嵌套 lanes
        target: "last", // 默认：none | 可选：last | none | <channel id>（core 或 plugin，例如 "bluebubbles"）
        to: "+15551234567", // 可选：按渠道覆盖接收者
        accountId: "ops-bot", // 可选：多账户 channel id
        prompt: "如果存在 HEARTBEAT.md（工作区上下文），请阅读它。严格遵循其中内容。不要从之前的聊天中推断或重复旧任务。如果没有需要关注的内容，回复 HEARTBEAT_OK。",
        ackMaxChars: 300, // HEARTBEAT_OK 之后允许的最大字符数
      },
    },
  },
}
```

### 作用域和优先级

- `agents.defaults.heartbeat` 设置全局 heartbeat 行为。
- `agents.list[].heartbeat` 在其上进行合并；如果任何 agent 有 `heartbeat` 区块，**只有这些 agent** 会运行 heartbeats。
- `channels.defaults.heartbeat` 设置所有 channels 的可见性默认值。
- `channels.<channel>.heartbeat` 覆盖 channel 默认值。
- `channels.<channel>.accounts.<id>.heartbeat`（多账户 channels）覆盖按 channel 的设置。

### 按 agent 的 heartbeats

如果任何 `agents.list[]` 条目包含 `heartbeat` 区块，**只有这些 agent** 会运行 heartbeats。按 agent 的区块会与 `agents.defaults.heartbeat` 进行合并（因此你可以只设置一次共享默认值，并按 agent 覆盖）。

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
          prompt: "如果存在 HEARTBEAT.md（工作区上下文），请阅读它。严格遵循其中内容。不要从之前的聊天中推断或重复旧任务。如果没有需要关注的内容，回复 HEARTBEAT_OK。",
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
<ParamField path="includeReasoning" type="boolean" default="false">
  启用后，在可用时也会传递单独的 `Reasoning:` 消息（与 `/reasoning on` 的形状相同）。
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  为 true 时，heartbeat 运行使用轻量级 bootstrap 上下文，并且只保留工作区 bootstrap 文件中的 `HEARTBEAT.md`。
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  为 true 时，每次 heartbeat 都会在没有之前对话历史的新会话中运行。使用与 cron `sessionTarget: "isolated"` 相同的隔离模式。可大幅降低每次 heartbeat 的 token 成本。与 `lightContext: true` 结合可获得最大节省。传递路由仍然使用主会话上下文。
</ParamField>
<ParamField path="skipWhenBusy" type="boolean" default="false">
  为 true 时，heartbeat 运行会在额外繁忙的 lanes 上延后：子 agent 或嵌套命令工作。cron lanes 始终会延后 heartbeats，即使没有这个标志也是如此，因此本地模型主机不会同时运行 cron 和 heartbeat 提示。
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
<ParamField path="ackMaxChars" type="number" default="300">
  传递前 `HEARTBEAT_OK` 之后允许的最大字符数。

</ParamField>
<ParamField path="suppressToolErrorWarnings" type="boolean">
  为 true 时，在 heartbeat 运行期间抑制工具错误警告负载。

</ParamField>
<ParamField path="activeHours" type="object">
  将 heartbeat 运行限制在一个时间窗口内。对象包含 `start`（HH:MM，含；日开始请用 `00:00`）、`end`（HH:MM，不含；允许使用 `24:00` 表示日结束）以及可选的 `timezone`。

- 省略或 `"user"`：如果设置了 `agents.defaults.userTimezone`，则使用它；否则回退到主机系统时区。
- `"local"`：始终使用主机系统时区。
- 任意 IANA 标识符（例如 `America/New_York`）：直接使用；如果无效，则回退到上面的 `"user"` 行为。
- 对于活跃窗口，`start` 和 `end` 不能相等；相等值会被视为零宽度（始终处于窗口之外）。
- 在活跃窗口之外，heartbeats 会被跳过，直到下一个落在窗口内的 tick。

</ParamField>

## 投递行为

<AccordionGroup>
  <Accordion title="会话和目标路由">
    - 心跳默认在代理的主会话中运行（`agent:<id>:<mainKey>`），如果 `session.scope = "global"` 则为 `global`。设置 `session` 可覆盖为特定频道会话（Discord/WhatsApp 等）。
    - `session` 只影响运行上下文；投递由 `target` 和 `to` 控制。
    - 要投递到特定频道/收件人，请设置 `target` + `to`。当 `target: "last"` 时，投递会使用该会话的最后一个外部频道。
    - 默认情况下，心跳投递允许直接/DM 目标。设置 `directPolicy: "block"` 可在仍然运行心跳轮次的同时，禁止向直接目标发送。
    - 如果主队列、目标会话泳道、cron 泳道或正在运行的 cron 作业繁忙，心跳会被跳过并稍后重试。
    - 如果 `skipWhenBusy: true`，子代理和嵌套泳道也会延后心跳运行。
    - 如果 `target` 解析后没有外部目的地，运行仍会发生，但不会发送任何外发消息。

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

## HEARTBEAT.md（可选）

如果工作区中存在 `HEARTBEAT.md` 文件，默认提示会告诉代理读取它。可以把它看作你的“心跳检查清单”：简短、稳定，适合每 30 分钟都包含一次。

在正常运行时，只有当默认代理启用了心跳指引时，才会注入 `HEARTBEAT.md`。通过 `0m` 禁用心跳节奏，或设置 `includeSystemPromptSection: false`，会使其不进入正常的启动上下文。

如果 `HEARTBEAT.md` 存在但实际上为空（只有空白行和类似 `# Heading` 的 markdown 标题），OpenClaw 会跳过心跳运行以节省 API 调用。该跳过会报告为 `reason=empty-heartbeat-file`。如果文件缺失，心跳仍会运行，由模型决定如何处理。

保持它足够小（简短清单或提醒），以避免提示词膨胀。

`HEARTBEAT.md` 示例：

```md
# 心跳检查清单

- 快速扫一眼：收件箱里有什么紧急事项吗？
- 如果是白天，而且没有其他待办，就做一次轻量级签到。
- 如果某个任务被阻塞，记下_缺少什么_，下次问 Peter。
```

### `tasks:` 块

`HEARTBEAT.md` 还支持一个小型结构化 `tasks:` 块，用于在心跳内部进行基于间隔的检查。

示例：

```md
tasks:

- name: inbox-triage
  interval: 30m
  prompt: "检查是否有紧急未读邮件，并标记任何时间敏感的内容。"
- name: calendar-scan
  interval: 2h
  prompt: "检查即将到来的会议，看看是否需要准备或跟进。"

# 其他说明

- 保持告警简短。
- 如果所有到期任务检查完后仍无需处理，回复 HEARTBEAT_OK。
```

<AccordionGroup>
  <Accordion title="行为">
    - OpenClaw 会解析 `tasks:` 块，并根据各自的 `interval` 检查每个任务。
    - 只有**到期**的任务会包含在该次心跳提示中。
    - 如果没有任务到期，心跳会被完全跳过（`reason=no-tasks-due`），以避免无谓的模型调用。
    - `HEARTBEAT.md` 中非任务内容会被保留，并在到期任务列表之后作为额外上下文追加。
    - 任务上次运行时间戳会存储在会话状态（`heartbeatTaskState`）中，因此间隔会在正常重启后继续生效。
    - 任务时间戳只有在心跳运行完成其正常回复路径后才会前进。被跳过的 `empty-heartbeat-file` / `no-tasks-due` 运行不会将任务标记为已完成。

  </Accordion>
</AccordionGroup>

当你希望一个心跳文件承载多个周期性检查，而不必在每个周期都为它们全部付费时，任务模式会很有用。

### 代理可以更新 HEARTBEAT.md 吗？

可以——如果你要求它这么做。

`HEARTBEAT.md` 只是代理工作区中的普通文件，因此你可以在正常聊天中告诉代理，例如：

- "更新 `HEARTBEAT.md`，添加每日日历检查。"
- "重写 `HEARTBEAT.md`，让它更短一些，并聚焦于收件箱跟进。"

如果你希望它主动执行，也可以在心跳提示中加入一行明确说明，例如：“如果清单已经过时，请用更好的内容更新 HEARTBEAT.md。”

<Warning>
不要把机密信息（API 密钥、电话号码、私人令牌）放进 `HEARTBEAT.md`——它会成为提示上下文的一部分。
</Warning>

## 手动唤醒（按需）

你可以通过以下方式排队一个系统事件并触发立即心跳：

```bash
openclaw system event --text "检查紧急跟进事项" --mode now
```

如果配置了多个代理的 `heartbeat`，手动唤醒会立即运行这些代理各自的心跳。

使用 `--mode next-heartbeat` 可等待下一次计划中的 tick。

## 推理投递（可选）

默认情况下，心跳只投递最终的“答案”载荷。

如果你希望透明一些，可以启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用后，心跳还会投递一条单独的消息，前缀为 `Reasoning:`（格式与 `/reasoning on` 相同）。当代理管理多个会话/codex，并且你想知道它为什么决定 ping 你时，这会很有用——但它也可能泄露比你希望更多的内部细节。群聊中建议保持关闭。

## 成本意识

心跳会运行完整的代理轮次。间隔越短，消耗的 token 越多。为了降低成本：

- 使用 `isolatedSession: true`，避免发送完整对话历史（每次运行约从 100K token 降到 2-5K）。
- 使用 `lightContext: true`，将启动文件限制为仅 `HEARTBEAT.md`。
- 设置更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 简短。
- 如果你只想要内部状态更新，请使用 `target: "none"`。

## 心跳后的上下文溢出

如果某个心跳使用了较小的本地模型，例如带有 32k 窗口的 Ollama 模型，而下一次主会话轮次报告上下文溢出，请检查前一个心跳是否让会话停留在心跳模型上。当最后一次运行时模型与配置的 `heartbeat.model` 匹配时，OpenClaw 的重置消息会指出这一点。

使用 `isolatedSession: true` 在全新会话中运行心跳，将其与 `lightContext: true` 结合可获得最小提示，或者选择一个上下文窗口足够大的心跳模型，以适配共享会话。

## 相关内容

- [自动化与任务](/automation) — 一览所有自动化机制
- [后台任务](/automation/tasks) — 如何跟踪分离式工作
- [时区](/concepts/timezone) — 时区如何影响心跳调度
- [故障排除](/automation/cron-jobs#troubleshooting) — 调试自动化问题
