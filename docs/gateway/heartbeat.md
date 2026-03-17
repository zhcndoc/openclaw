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

1. 保持心跳启用（默认是 `30m`，Anthropic OAuth/setup-token 则为 `1h`）或设置自己的频率。
2. 在代理工作区创建一个小的 `HEARTBEAT.md` 检查表（可选，但推荐）。
3. 决定心跳消息应发送到哪里（默认是 `target: "none"`；设置 `target: "last"` 可发送到最后联系人）。
4. 可选：启用心跳推理交付以提高透明度。
5. 可选：如果心跳仅需使用 `HEARTBEAT.md`，则使用轻量启动上下文。
6. 可选：启用隔离会话，避免每次心跳发送完整对话历史。
7. 可选：限制心跳仅在活跃时间内运行（本地时间）。

示例配置：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // 明确推送到最后联系人（默认是 "none"）
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

- 间隔：`30m`（检测到 Anthropic OAuth/setup-token 认证模式时为 `1h`）。可设置 `agents.defaults.heartbeat.every` 或各代理的 `agents.list[].heartbeat.every`；使用 `0m` 禁用。
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
        includeReasoning: false, // 默认：false（可用时发送独立的 Reasoning: 消息）
        lightContext: false, // 默认：false；true 时只保留来自工作区启动文件的 HEARTBEAT.md
        isolatedSession: false, // 默认：false；true 时每次心跳使用独立会话（无对话历史）
        target: "last", // 默认：none；可选：last | none | <频道 id>（核心或插件，例如 "bluebubbles"）
        to: "+15551234567", // 可选频道特定重写
        accountId: "ops-bot", // 可选多账户频道ID
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
          timezone: "America/New_York", // 可选；使用你设置的 userTimezone，若未设置则用宿主时区
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

- `every`: 心跳间隔（时长字符串；默认单位分钟）。
- `model`: 可选模型覆盖，用于心跳运行（`provider/model`）。
- `includeReasoning`: 启用时，当可用时也发送独立的 `Reasoning:` 消息（格式同 `/reasoning on`）。
- `lightContext`: 为真时，心跳运行使用轻量启动上下文，只保留工作区启动文件中的 `HEARTBEAT.md`。
- `isolatedSession`: 为真时，每次心跳运行新会话，无前置对话历史。采用与定时任务相同的隔离模式 `sessionTarget: "isolated"`。大幅减少单次心跳 token 消耗。与 `lightContext: true` 结合使用可最大化节省。交付路由仍使用主会话上下文。
- `session`: 心跳运行的可选会话键。
  - `main`（默认）：代理主会话。
  - 显式会话键（从 `openclaw sessions --json` 或 [sessions CLI](/cli/sessions) 复制）。
  - 会话键格式详见 [Sessions](/concepts/session) 和 [Groups](/channels/groups)。
- `target`：
  - `last`：发送到最后使用的外部频道。
  - 明确频道：`whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`。
  - `none`（默认）：运行心跳但**不外部发送**。
- `directPolicy`: 控制直接/私信发信行为：
  - `allow`（默认）：允许直接/私信心跳消息。
  - `block`：禁止直接/私信发送（`reason=dm-blocked`）。
- `to`: 可选接收者重写（频道特定 ID，如 WhatsApp 的 E.164 格式或 Telegram 聊天 ID）。Telegram 主题/线程格式 `<chatId>:topic:<messageThreadId>`。
- `accountId`: 多账户频道的可选账户 ID。`target: "last"` 时，账户 ID 作用于解析出的最近频道（如果支持账户）；否则忽略。账户 ID 不匹配时跳过发送。
- `prompt`: 覆盖默认提示正文（不合并）。
- `ackMaxChars`: `HEARTBEAT_OK` 后允许的最大字符数。
- `suppressToolErrorWarnings`: 为真时，抑制心跳运行中工具错误警告负载。
- `activeHours`: 限制心跳仅在时间窗口内运行。对象包括 `start`（HH:MM，含；使用 `00:00` 表示日初）、`end`（HH:MM，开；允许 `24:00` 表示日终），及可选 `timezone`。
  - 省略或 `"user"`：使用 `agents.defaults.userTimezone`（若有），否则使用宿主系统时区。
  - `"local"`：始终使用宿主系统时区。
  - 任意 IANA 标识符（如 `America/New_York`）：直接使用；无效时回退到 `"user"` 行为。
  - `start` 和 `end` 不可同值，否则被视为零宽度（总不在窗口内）。
  - 窗口外心跳跳过，直到下一个窗口内时刻。

## 交付行为

- 心跳默认在代理主会话运行（`agent:<id>:<mainKey>`），`session.scope = "global"` 时为 `global`。通过 `session` 可切换到特定频道会话（Discord/WhatsApp 等）。
- `session` 只影响运行上下文；消息发送受 `target` 和 `to` 控制。
- 发送到特定频道/收件人需要设置 `target` 和 `to`。使用 `target: "last"` 时，发送到该会话最后使用的外部频道。
- 默认允许直接/私信目标发送心跳。设置 `directPolicy: "block"` 可阻止直接私信发送，但仍运行心跳回合。
- 若主队列繁忙，心跳回合跳过并稍后重试。
- 若 `target` 无法解析到外部发送目标，仍执行心跳回合但不发送外部消息。
- 仅心跳回复**不延长**会话活跃时间；最后的 `updatedAt` 时间还原，空闲超时正常生效。

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

如果 `HEARTBEAT.md` 存在但内容基本为空（只有空白行或 markdown 标题如 `# Heading`），OpenClaw 会跳过心跳回合以节约 API 调用。
如果文件不存在，心跳依旧运行，由模型决定如何处理。

保持文件简短（简短清单或提醒）以避免提示过长。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- Quick check: Any urgent items in the inbox?
- If daytime and no pending tasks, send a light check.
- If a task is blocked, note _what’s missing_ and ask Peter next time.
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

Heartbeats run full agent turns. Shorter intervals burn more tokens. To reduce cost:

- Use `isolatedSession: true` to avoid sending full conversation history (~100K tokens down to ~2-5K per run).
- Use `lightContext: true` to limit bootstrap files to just `HEARTBEAT.md`.
- Set a cheaper `model` (e.g. `ollama/llama3.2:1b`).
- Keep `HEARTBEAT.md` small.
- Use `target: "none"` if you only want internal state updates.
