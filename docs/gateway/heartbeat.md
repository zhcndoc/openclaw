---
summary: "心跳轮询消息和通知规则"
read_when:
  - 当调整心跳频率或消息时
  - 当在心跳和 cron 作业之间选择时
title: "心跳"
---

> **Heartbeat vs Cron?** See [自动化与任务](/automation) for guidance on when to use each.

心跳在主会话中运行**周期性的代理回合**，使模型能
提示任何需要关注的事项，同时避免信息泛滥。

心跳是计划好的主会话回合——它**不会**创建 [后台任务](/automation/tasks) 记录。
任务记录用于分离的工作（ACP 运行、子代理、隔离的定时任务）。

故障排除：[计划任务](/automation/cron-jobs#troubleshooting)

## 快速开始（初学者）

1. 保持心跳启用（默认为 `30m`，对于 Anthropic OAuth/token 认证则为 `1h`，包括 Claude CLI 复用）或设置你自己的节奏。
2. 在代理工作区创建一个小型 `HEARTBEAT.md` 清单或 `tasks:` 块（可选但推荐）。
3. 决定心跳消息应该发送到哪里（`target: "none"` 是默认值；设置 `target: "last"` 路由到最后联系人）。
4. 可选：启用心跳推理交付以增加透明度。
5. 可选：如果心跳运行只需要 `HEARTBEAT.md`，使用轻量级引导上下文。
6. 可选：启用隔离会话以避免每次心跳发送完整对话历史。
7. 可选：将心跳限制在活跃时段（本地时间）。

示例配置：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // 明确路由到最后联系人（默认是 "none"）
        directPolicy: "allow", // 默认：允许直接/私信目标；设置为 "block" 以抑制
        lightContext: true, // 可选：只注入来自启动文件的 HEARTBEAT.md
        isolatedSession: true, // 可选：每次运行都是独立会话（无对话历史）
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // 可选：也发送单独的 `Reasoning:` 消息
      },
    },
  },
}
```

## 默认配置

- 间隔：`30m` (或当检测到 Anthropic OAuth/token 认证模式时为 `1h`，包括 Claude CLI 复用)。设置 `agents.defaults.heartbeat.every` 或按代理 `agents.list[].heartbeat.every`；使用 `0m` 禁用。
- 提示正文（可通过 `agents.defaults.heartbeat.prompt` 配置）:
  `如果存在 HEARTBEAT.md（工作区上下文），请阅读并严格遵循。不要推测或重复之前聊天中的旧任务。如果没有需要关注的事项，回复 HEARTBEAT_OK。`
- 心跳提示会**逐字**作为用户消息发送。系统
  提示仅在默认代理启用心跳且运行在内部标记时，才会包含一个“心跳”部分。
- 当使用 `0m` 禁用心跳时，正常运行也会从引导上下文中省略 `HEARTBEAT.md`，
  以免模型看到仅限心跳的指令。
- 活跃小时（`heartbeat.activeHours`）在配置的时区中检查。
  在窗口外，心跳将被跳过，直到窗口内的下一个时刻。

## 心跳提示的用途

默认提示设计得很宽泛：

- **后台任务**：“考虑未完成任务”促使代理复查待办事项（收件箱、日历、提醒、排队工作），并提示任何紧急事项。
- **人工检查**：“白天时偶尔检查你的人工”促使代理偶尔发送轻量的“有什么需要吗？”消息，但通过你的本地时区配置避免夜间骚扰（详见 [/concepts/timezone](/concepts/timezone)）。

心跳可以对已完成的 [后台任务](/automation/tasks) 做出反应，但心跳运行本身不会创建任务记录。

如果你希望心跳执行非常具体的操作（例如“检查 Gmail PubSub 统计”或“验证网关健康”），请将 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）设置为自定义内容（原样发送）。

## 回复协议

- 如果没有需要关注的事项，回复 **`HEARTBEAT_OK`**。
- 心跳运行时，当 `HEARTBEAT_OK` 出现在回复的**开头或结尾**时，OpenClaw 视为确认。该标记会被剥离，如果剩余内容长度 **≤ `ackMaxChars`**（默认 300 字符），则回复丢弃。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，不会有特殊处理。
- 对于警报消息，**不要**包含 `HEARTBEAT_OK`，只返回警报文本。

心跳以外，消息开头或结尾多余的 `HEARTBEAT_OK` 会被剥除和记录；如果仅为 `HEARTBEAT_OK` 也会被忽略。

## 配置示例

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 默认：30 分钟（0m 表示禁用）
        model: "anthropic/claude-opus-4-6",
        includeReasoning: false, // 默认：false（可用时发送独立的 Reasoning: 消息）
        lightContext: false, // 默认：false；true 时只保留来自工作区启动文件的 HEARTBEAT.md
        isolatedSession: false, // 默认：false；true 时每次心跳使用独立会话（无对话历史）
        target: "last", // 默认：none；可选：last | none | <频道 id>（核心或插件，例如 "bluebubbles"）
        to: "+15551234567", // 可选频道特定重写
        accountId: "ops-bot", // 可选多账户频道 ID
        prompt: "如果存在 HEARTBEAT.md（工作区上下文），请阅读并严格遵循。不要推测或重复之前聊天中的旧任务。如果没有需要关注的事项，回复 HEARTBEAT_OK。",
        ackMaxChars: 300, // HEARTBEAT_OK 后允许的最大字符数
      },
    },
  },
}
```

### 范围和优先级

- `agents.defaults.heartbeat` 设置全局心跳行为。
- `agents.list[].heartbeat` 会做层叠合并；如果任一代理配置了 `heartbeat`，**仅这些代理**运行心跳。
- `channels.defaults.heartbeat` 设置所有频道的默认可见性。
- `channels.<channel>.heartbeat` 可覆盖频道默认。
- `channels.<channel>.accounts.<id>.heartbeat`（多账户频道）可覆盖具体账户设置。

### 代理单独心跳

如果 `agents.list[]` 中任一项包含 `heartbeat` 配置，**仅这些代理**
会运行心跳。该配置会在 `agents.defaults.heartbeat` 之上合并（方便设置共享默认然后针对代理覆盖）。

示例：有两个代理，只有第二个代理运行心跳。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // 明确路由到最后联系人（默认是 "none"）
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
          prompt: "如果存在 HEARTBEAT.md（工作区上下文），请阅读并严格遵循。不要推测或重复之前聊天中的旧任务。如果没有需要关注的事项，回复 HEARTBEAT_OK。",
        },
      },
    ],
  },
}
```

### 活跃时段示例

限制心跳仅在特定时区的办公时间运行：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // 明确路由至最后联系人（默认为 "none"）
        activeHours: {
          start: "09:00",
          end: "22:00",
          timezone: "America/New_York", // 可选；使用你设置的 userTimezone，若未设置则用宿主时区
        },
      },
    },
  },
}
```

窗口外（美国东部时间早于上午 9 点或晚于晚上 10 点）跳过心跳，窗口内下一时刻会正常运行。

### 24/7 配置

如果希望心跳全天候运行，可采用：

- 完全省略 `activeHours`（无时间窗口限制；这是默认行为）。
- 设置全时段窗口：`activeHours: { start: "00:00", end: "24:00" }`。

切勿设置相同的 `start` 和 `end`（例如从 `08:00` 到 `08:00`），这会被视为零时长窗口，导致心跳总被跳过。

### 多账户示例

在多账户频道（如 Telegram）使用 `accountId` 选择指定账号：

```json5
{
  agents: {
    list: [
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "telegram",
          to: "12345678:topic:42", // 可选：路由到特定主题/线程
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

- `every`: 心跳间隔（持续时间字符串；默认单位 = 分钟）。
- `model`: 心跳运行的可选模型覆盖（`provider/model`）。
- `includeReasoning`: 启用时，可用时也会发送独立的 `Reasoning:` 消息（格式同 `/reasoning on`）。
- `lightContext`: 为 true 时，心跳运行使用轻量级引导上下文，仅保留来自工作区引导文件的 `HEARTBEAT.md`。
- `isolatedSession`: 为 true 时，每次心跳在全新会话中运行，无先前对话历史。使用与 cron `sessionTarget: "isolated"` 相同的隔离模式。显著降低每次心跳的 token 成本。与 `lightContext: true` 结合以实现最大节省。交付路由仍使用主会话上下文。
- `session`: 心跳运行的可选会话密钥。
  - `main`（默认）：代理主会话。
  - 显式会话密钥（复制自 `openclaw sessions --json` 或 [会话 CLI](/cli/sessions)）。
  - 会话密钥格式：参见 [会话](/concepts/session) 和 [群组](/channels/groups)。
- `target`:
  - `last`: 交付到最后使用的外部频道。
  - 显式频道：任何配置的频道或插件 ID，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
  - `none`（默认）：运行心跳但**不向外交付**。
- `directPolicy`: 控制直接/私信交付行为：
  - `allow`（默认）：允许直接/私信心跳交付。
  - `block`: 抑制直接/私信交付（`reason=dm-blocked`）。
- `to`: 可选接收者覆盖（频道特定 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID）。对于 Telegram 主题/线程，使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`: 多账户频道的可选账户 ID。当 `target: "last"` 时，如果解析后的最后频道支持账户，则账户 ID 应用于该频道；否则忽略。如果账户 ID 不匹配解析后频道的配置账户，则跳过交付。
- `prompt`: 覆盖默认提示正文（不合并）。
- `ackMaxChars`: 交付前 `HEARTBEAT_OK` 后允许的最大字符数。
- `suppressToolErrorWarnings`: 为 true 时，抑制心跳运行期间的工具错误警告负载。
- `activeHours`: 限制心跳运行到时间窗口内。对象包含 `start`（HH:MM，包含；使用 `00:00` 表示日开始）、`end`（HH:MM 不包含；`24:00` 允许表示日结束）和可选 `timezone`。
  - 省略或 `"user"`：如果设置了则使用你的 `agents.defaults.userTimezone`，否则回退到宿主系统时区。
  - `"local"`：始终使用宿主系统时区。
  - 任何 IANA 标识符（例如 `America/New_York`）：直接使用；如果无效，则回退到上述 `"user"` 行为。
  - 活跃窗口的 `start` 和 `end` 不能相等；相等的值被视为零宽度（始终在窗口外）。
  - 在活跃窗口外，心跳将被跳过，直到窗口内的下一个时刻。

## 交付行为

- 心跳默认在代理的主会话中运行（`agent:<id>:<mainKey>`），
  或当 `session.scope = "global"` 时为 `global`。设置 `session` 以覆盖为
  特定频道会话（Discord/WhatsApp 等）。
- `session` 仅影响运行上下文；交付由 `target` 和 `to` 控制。
- 若要交付到特定频道/接收者，设置 `target` + `to`。使用
  `target: "last"` 时，交付使用该会话最后使用的外部频道。
- 心跳交付默认允许直接/私信目标。设置 `directPolicy: "block"` 可在仍运行心跳回合的同时抑制直接目标发送。
- 如果主队列繁忙，心跳会被跳过并稍后重试。
- 如果 `target` 解析不到任何外部目标，运行仍会执行，但不会
  发送外发消息。
- 如果 `showOk`、`showAlerts` 和 `useIndicator` 全部禁用，则运行会直接跳过，原因是 `alerts-disabled`。
- 如果仅禁用了警报交付，OpenClaw 仍可运行心跳、更新到期任务时间戳、恢复会话空闲时间戳，并抑制外发警报载荷。
- 如果解析后的心跳目标支持输入状态，OpenClaw 会在
  心跳运行期间显示正在输入。这使用与心跳将发送聊天输出相同的目标，并可通过 `typingMode: "never"` 禁用。
- 仅心跳回复**不会**保持会话存活；最后的 `updatedAt`
  会被恢复，以便空闲过期正常生效。
- 分离的 [后台任务](/automation/tasks) 可以排队一个系统事件，并在主会话应尽快注意到某事时唤醒心跳。该唤醒不会让心跳变成后台任务。

## 可见性控制

默认情况下，`HEARTBEAT_OK` 确认会被隐藏，警报内容显示。你可以针对频道或账户调整：

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false # 隐藏 HEARTBEAT_OK（默认）
      showAlerts: true # 显示警报消息（默认）
      useIndicator: true # 发出状态指示事件（默认）
  telegram:
    heartbeat:
      showOk: true # 在 Telegram 上显示确认消息
  whatsapp:
    accounts:
      work:
        heartbeat:
          showAlerts: false # 为此账户禁用警报消息显示
```

优先级：单账户设置 → 频道设置 → 频道默认 → 内置默认。

### 各标志含义

- `showOk`：模型回复仅包含 OK 时，发送 `HEARTBEAT_OK` 确认消息。
- `showAlerts`：模型回复非 OK 时，发送警报内容。
- `useIndicator`：发送状态指示事件，用于 UI 状态展示。

若**全部三个**均为 `false`，OpenClaw 将跳过心跳回合（不会调用模型）。

### 频道与账户示例

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
          showAlerts: false # 仅 ops 账户屏蔽警报
  telegram:
    heartbeat:
      showOk: true
```

### 常见配置示例

| 目标                             | 配置示例                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| 默认行为（沉默确认，显示警报）     | _(无需配置)_                                                                         |
| 完全静默（无消息，无指示器）        | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）                 | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个频道显示确认                 | `channels.telegram.heartbeat: { showOk: true }`                                      |

## HEARTBEAT.md（可选）

如果工作区存在 `HEARTBEAT.md` 文件，默认提示会让代理阅读它。可以把它当作你的“心跳清单”：简短、稳定，且适合每 30 分钟包含一次。

在正常运行时，仅当默认代理启用心跳指导时，`HEARTBEAT.md` 才会被注入引导上下文。使用 `0m` 禁用心跳节奏或设置 `includeSystemPromptSection: false` 会将其从正常引导上下文中省略。

如果 `HEARTBEAT.md` 存在但实际为空（仅空白行和 markdown 标题如 `# 标题`），OpenClaw 会跳过心跳运行以节省 API 调用。
该跳过报告为 `reason=empty-heartbeat-file`。
如果文件缺失，心跳仍会运行，由模型决定做什么。

保持文件简短（简短清单或提醒）以避免提示过长。

示例 `HEARTBEAT.md`：

```md
# 心跳清单

- 快速检查：收件箱中是否有任何紧急事项？
- 如果是白天且没有待办任务，发送轻量检查。
- 如果任务被阻塞，注意 _缺少什么_ 并在下次询问 Peter。
```

### `tasks:` 块

`HEARTBEAT.md` 还支持一个小型结构化 `tasks:` 块，用于心跳内部的基于间隔的检查。

示例：

```md
tasks:

- name: inbox-triage
  interval: 30m
  prompt: "检查是否有紧急未读邮件并标记任何时间敏感的内容。"
- name: calendar-scan
  interval: 2h
  prompt: "检查是否有需要准备或跟进的即将召开的会议。"

# 附加指令

- 保持警报简短。
- 如果所有到期任务后没有需要注意的事项，回复 HEARTBEAT_OK。
```

行为：

- OpenClaw 解析 `tasks:` 块并根据每个任务自己的 `interval` 进行检查。
- 只有**到期**的任务才会包含在该时刻的心跳提示中。
- 如果没有任务到期，心跳将被完全跳过（`reason=no-tasks-due`），以避免浪费模型调用。
- `HEARTBEAT.md` 中的非任务内容会被保留，并作为附加上下文追加到到期任务列表之后。
- 任务上次运行时间戳存储在会话状态（`heartbeatTaskState`）中，因此间隔在正常重启后依然有效。
- 任务时间戳仅在心跳运行完成其正常回复路径后才会推进。跳过的 `empty-heartbeat-file` / `no-tasks-due` 运行不会将任务标记为已完成。

当你希望一个心跳文件包含多个定期检查而不必每次都为所有检查付费时，任务模式非常有用。

### 代理可以更新 HEARTBEAT.md 吗？

可以——如果你让它这么做。

`HEARTBEAT.md` 是代理工作区中的普通文件，所以你可以在正常聊天中告诉
代理：

- “更新 `HEARTBEAT.md` 添加每日日历检查。”
- “重写 `HEARTBEAT.md` ，使其更简洁并专注于收件箱跟进。”

如果想要主动发生，你也可以在心跳提示中明确写一行：
“如果清单过时，请更新 HEARTBEAT.md，换个更好的清单。”

安全提示：请勿在 `HEARTBEAT.md` 中放置秘密（API 密钥、电话号码、私密令牌）—
它会成为提示上下文的一部分。

## 手动触发（按需）

你可以排入系统事件，立即触发心跳：

```bash
openclaw system event --text "检查紧急跟进" --mode now
```

如果多个代理配置了 `heartbeat`，手动触发会立即运行这些代理的心跳。

使用 `--mode next-heartbeat` 可等待下一个预定时刻。

## 推理交付（可选）

默认情况下，心跳只发送最终“答案”负载。

如需透明度，可启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用后，心跳还会发送以 `Reasoning:` 开头的单独消息（格式同 `/reasoning on`）。
这对于代理管理多会话/多个 Codex，想查看为何提醒你很有用，但可能泄露内部细节。
建议群聊中关闭此功能。

## 成本意识

心跳运行完整的代理回合。较短的间隔会消耗更多 令牌。为了降低成本：

- 使用 `isolatedSession: true` 避免发送完整对话历史（每次运行从 ~100K 令牌 降至 ~2-5K）。
- 使用 `lightContext: true` 将引导文件限制为仅 `HEARTBEAT.md`。
- 设置更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 小巧。
- 如果只需要内部状态更新，使用 `target: "none"`。

## 相关

- [自动化与任务](/automation) — 所有自动化机制一览
- [后台任务](/automation/tasks) — 如何跟踪分离的工作
- [时区](/concepts/timezone) — 时区如何影响心跳调度
- [故障排除](/automation/cron-jobs#troubleshooting) — 调试自动化问题
