---
summary: "心跳轮询消息和通知规则"
read_when:
  - 调整心跳频率或消息
  - 在心跳和定时任务（cron）之间选择
title: "心跳"
---

# 心跳（Gateway）

> **心跳 vs 定时任务？** 请参阅 [Cron vs Heartbeat](/automation/cron-vs-heartbeat) 了解何时使用哪种。

心跳在主会话中运行**周期性的代理回合**，使模型能
提示任何需要关注的事项，同时避免信息泛滥。

故障排查：[/automation/troubleshooting](/automation/troubleshooting)

## 快速开始（初学者）

1. 保持心跳启用（默认是 `30m`，Anthropic OAuth/setup-token 则默认 `1h`），或者设置你自己的频率。
2. 在代理工作区创建一个小型的 `HEARTBEAT.md` 清单（可选但推荐）。
3. 决定心跳消息的发送目标（默认是 `target: "none"`；设置为 `target: "last"` 可发送给最后的联系人）。
4. 可选：启用心跳推理交付以增加透明度。
5. 可选：如果心跳仅需 `HEARTBEAT.md`，可使用轻量级引导上下文。
6. 可选：限制心跳仅在活跃时间（本地时间）运行。

示例配置：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // 明确推送到最后联络人（默认是 "none"）
        directPolicy: "allow", // 默认：允许直接私信；设置为 "block" 可以禁止
        lightContext: true, // 可选：仅注入工作区引导文件中的 HEARTBEAT.md
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // 可选：也发送单独的 `Reasoning:` 消息
      },
    },
  },
}
```

## 默认配置

- 间隔：`30m`（检测到 Anthropic OAuth/setup-token 认证模式时为 `1h`）。可设置 `agents.defaults.heartbeat.every` 或每个代理的 `agents.list[].heartbeat.every`；使用 `0m` 禁用。
- 提示内容（通过 `agents.defaults.heartbeat.prompt` 配置）：
  `如果存在 HEARTBEAT.md（工作区上下文），请阅读并严格遵循。不要推测或重复之前聊天中的旧任务。如果没有需要关注的事项，回复 HEARTBEAT_OK。`
- 心跳提示作为用户消息**逐字**发送。系统提示包含“Heartbeat”部分，运行时内部会标记。
- 活跃时间（`heartbeat.activeHours`）在配置的时区检查。窗口外跳过心跳，直到下一个窗口内的时刻。

## 心跳提示的用途

默认提示设计得很宽泛：

- **后台任务**：“考虑未完成任务”促使代理复查待办事项（收件箱、日历、提醒、排队工作），并提示任何紧急事项。
- **人工检查**：“白天时偶尔检查你的人工”促使代理偶尔发送轻量的“有什么需要吗？”消息，但通过你的本地时区配置避免夜间骚扰（详见 [/concepts/timezone](/concepts/timezone)）。

如果你想让心跳做非常具体的事情（例如“检查 Gmail PubSub 统计”或“验证网关健康状况”），请设置 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）为自定义消息体（逐字发送）。

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
        includeReasoning: false, // 默认：false（可选启用时会单独发送 Reasoning: 消息）
        lightContext: false, // 默认：false；true 仅保持工作区引导文件中的 HEARTBEAT.md
        target: "last", // 默认：none；选项：last | none | <频道 id>（核心或插件，如 "bluebubbles"）
        to: "+15551234567", // 可选频道特定覆盖
        accountId: "ops-bot", // 可选多账户频道 id
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
        target: "last", // 明确推送到最后联系人（默认是 "none"）
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
        target: "last", // 明确推送至最后联系人（默认为 "none"）
        activeHours: {
          start: "09:00",
          end: "22:00",
          timezone: "America/New_York", // 可选；使用你的 userTimezone（若已设置），否则使用宿主时区
        },
      },
    },
  },
}
```

窗口外（美国东部时间早于上午9点或晚于晚上10点）跳过心跳，窗口内下一时刻会正常运行。

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

- `every`：心跳间隔（持续时间字符串；默认单位：分钟）。
- `model`：心跳运行时的模型覆盖（`provider/model` 格式）。
- `includeReasoning`：启用时，当有推理消息时，也会发送单独的 `Reasoning:` 消息（格式同 `/reasoning on`）。
- `lightContext`：为 `true` 时，心跳运行只使用轻量引导上下文，保留工作区引导文件中的 `HEARTBEAT.md`。
- `session`：心跳运行时使用的会话密钥。
  - `main`（默认）：代理主会话。
  - 显式会话键（从 `openclaw sessions --json` 或 [sessions CLI](/cli/sessions) 复制）。
  - 会话键格式详见 [会话](/concepts/session) 和 [群组](/channels/groups)。
- `target`：
  - `last`：发送至最后使用的外部频道。
  - 明确频道：`whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`；
  - `none`（默认）：运行心跳但**不向外部发送消息**。
- `directPolicy`：控制是否允许直接/私信发送：
  - `allow`（默认）：允许直接/私信发送心跳消息。
  - `block`：禁止直接私信发送 (`reason=dm-blocked`)。
- `to`：可选收件人覆盖（频道特定 ID，例如 WhatsApp 的 E.164 格式，或 Telegram 的聊天 ID）。Telegram 主题/线程格式为 `<chatId>:topic:<messageThreadId>`。
- `accountId`：多账户频道的账号 ID。若 `target: "last"`，账户 ID 适用于解析出的最后一个频道（若支持账户），否则忽略；若账户 ID 不匹配配置账户，则跳过发送。
- `prompt`：覆盖默认提示内容（不做合并）。
- `ackMaxChars`：`HEARTBEAT_OK` 后允许的最大字符数。
- `suppressToolErrorWarnings`：为 `true` 时，心跳运行期间抑制工具错误警告负载。
- `activeHours`：限制心跳仅在指定时间窗口运行。对象含 `start`（HH:MM，含起始时分，`00:00` 表示当天开始）、`end`（HH:MM，排除结束时分，`24:00` 允许表示当天结束）和可选的 `timezone`。
  - 省略或 `"user"`：使用 `agents.defaults.userTimezone`（若设置），否则使用宿主系统时区。
  - `"local"`：始终使用宿主系统时区。
  - 任何 IANA 标识符（例如 `America/New_York`）：直接使用；若无效，则退回上述 `"user"` 行为。
  - `start` 和 `end` 不得相同，否则视作零窗口（总是窗口外）。
  - 窗口外心跳跳过，直到下一窗口内时刻。

## 交付行为

- 心跳默认在代理主会话运行（`agent:<id>:<mainKey>`），当 `session.scope = "global"` 时为 `global`。通过 `session` 可以切换到特定频道会话（Discord/WhatsApp 等）。
- `session` 只影响运行上下文；消息发送受 `target` 和 `to` 控制。
- 发送至特定频道/收件人需设置 `target` 和 `to`。在使用 `target: "last"` 时，发送到该会话最后一个外部渠道。
- 默认为心跳发送允许直接/私信目标。设置 `directPolicy: "block"` 可抑制直接私信发送，但仍运行心跳回合。
- 如果主队列繁忙，心跳会跳过并稍后重试。
- 如果 `target` 无法解析到外部发送目标，仍运行回合但不发送外部消息。
- 仅心跳回复**不会**延长会话活跃时间；最后的 `updatedAt` 时间恢复，空闲超时正常生效。

## 可见性控制

默认情况下，`HEARTBEAT_OK` 确认会被隐藏，警报内容会被显示。你可以针对频道或账户调整：

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

如果 `HEARTBEAT.md` 存在但内容基本为空（只有空白行或 markdown 标题如 `# Heading`），OpenClaw 会跳过心跳回合以节约 API 调用。
如果文件不存在，心跳依旧运行，由模型决定如何处理。

保持文件简短（简短清单或提醒）以避免提示过长。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- 快速检查：收件箱有什么紧急事项吗？
- 如果是白天，且无待办，发送一个轻量检查。
- 如果任务被阻塞，写下_缺少什么_，下次询问 Peter。
```

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

心跳运行完整代理回合。更短间隔会消耗更多 tokens。
保持 `HEARTBEAT.md` 体积小，如果只想做内部状态更新可考虑使用更便宜的 `model` 或 `target: "none"`。
