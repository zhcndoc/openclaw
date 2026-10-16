---
summary: "心跳轮询消息和通知规则"
read_when:
  - "调整心跳频率或消息传递"
  - "在计划工作的心跳和自动化之间做出选择"
title: "心跳"
sidebarTitle: "心跳"
---

<Note>
**Heartbeat 是一种自动化。** 请参阅 [Automation](/automation) 以获取有关选择系统拥有的监视器或独立计划作业的指南。
</Note>

Heartbeat 是一个系统拥有的自动化，它在主会话中运行 **定期代理 Turn**，因此模型可以显示任何需要注意的内容，而不会向您发送垃圾邮件。

心跳是预定的主会话轮次。 ACP 运行、子代理和隔离的自动化作业使用自己的执行所有者。

在底层，心跳节奏由自动化调度程序拥有：网关为每个启用心跳的代理维护一个系统拥有的自动化作业（在 `openclaw cron list --all` 中显示为 `Heartbeat (agent-id)`）。心跳配置仍然是所需的状态输入，而持久的监视器时间表拥有实际的滴答声和跑步者稍后的冷却时间。网关在启动时和配置重新加载时写入配置更改。 `openclaw doctor --fix` 可以在下一次网关启动之前具体化丢失或陈旧的监视器行。编辑 `agents.*.heartbeat`，而不是自动化作业。如果在接受配置更改后保存监视器行失败，网关将保留接受的配置并报告需要恢复。监视器重试使用当前接受的配置。被拒绝的更改永远不会成为重试目标。

预定的心跳需要自动化。当`cron.enabled`为`false`或`OPENCLAW_SKIP_CRON=1`时，网关会记录启动警告并且不运行计划的心跳。手动和事件驱动的心跳唤醒仍然可用。没有单独的心跳回退计时器。

设置 `heartbeat.every: "0m"` 仅禁用循环节奏。有针对性的事件驱动唤醒仍然可以运行一个代理轮次，例如后台执行完成。它不会创建或重新启用重复计划。要保持后台执行没有自动完成轮次或其模型调用，请设置 `tools.exec.notifyOnExit: false`；检查 `agents.entries.<id>.tools.exec.notifyOnExit` 的每个代理覆盖。使用 `process poll` 收集结果。请参阅 [ 后台执行通知](/gateway/background-process#disable-automatic-completion-turns)。工具策略和沙箱控制代理是否可以执行命令。

当禁用循环节奏时，心跳拥有的事件唤醒保留相同的每个代理速率限制。这些限制是事件轮次之间的最短时间为 30 秒，并且在 60 秒内启动五次后进行洪水防护。当其防护期满时，推迟的工作将恢复。配置重新加载会保留此记帐，而无需在重复或广播心跳中注册代理。

转录标记将 `[OpenClaw heartbeat poll]` 与执行完成、cron 唤醒或会话事件区分开来。计划轮询使用配置的心跳会话，默认情况下这是代理的主会话。目标完成事件返回到拥有该工作的会话。事件标记保留其来源，而不将内部指令复制到聊天历史记录中。无声确认对保持隐藏。

对于 WebChat-only 对话，执行完成可以直接回复其原始对话，而无需外部消息传递目标。如果在准备完成时重置或替换该对话，则旧对话无法发布到新对话中。显式的 `target: "none"` 仍然抑制传递。

故障排查：[自动化](/automation/cron-jobs#troubleshooting)。

## <a id="quick-start-(beginner)"></a><a id="quick-start-beginner"></a> Quick start（初学者）

<Steps>
  <Step id="pick-a-cadence" title="选择节奏">
    保持启用 heartbeats（默认是 `30m`，如果配置了 Anthropic OAuth/token auth，则为 `1h`，包括 Claude CLI 复用），或者设置你自己的频率。
  </Step>
  <Step id="add-monitor-scratch-optional" title="添加显示器划痕（可选）">
    使用 `openclaw cron scratch <jobId> --set "..."` 在 heartbeat 监控器的暂存区中存储一个简短的检查清单。
  </Step>
  <Step id="decide-where-heartbeat-messages-should-go" title="决定心跳消息应该发送到哪里">
    默认情况下，心跳警报会发送至操作员的直接消息。将 `commands.ownerAllowFrom` 设置为数组，例如 `["telegram:123456789"]`，或使用具体通道 `allowFrom`。仅通配符允许列表无法识别所有者。
  </Step>
  <Step id="optional-tuning" title="可选调整">
    - 如果 heartbeat 运行只需要监控器暂存内容，请使用轻量级引导上下文。
    - 启用隔离会话，避免每次 heartbeat 都发送完整的对话历史。
    - 将 heartbeat 限制在活跃时间段内（本地时间）。

  </Step>
</Steps>

示例配置：

```json5
{
  commands: {
    ownerAllowFrom: ["telegram:123456789"],
  },
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "owner", // default: operator DM from ownerAllowFrom or channel allowFrom
        directPolicy: "allow", // default: allow direct/DM targets; set "block" to suppress
        lightContext: true, // optional: skip workspace bootstrap files for heartbeat runs
        isolatedSession: true, // optional: fresh session each run (no conversation history)
        // activeHours: { start: "08:00", end: "24:00" },
      },
    },
  },
}
```

对于已配置的 Telegram 机器人，请使用 JSON 数组设置所有者，即使只有一个条目也是如此。将 `123456789` 替换为您的 Telegram 用户 ID 并包含您想要保留的任何现有所有者：

```bash
openclaw config set commands.ownerAllowFrom '["telegram:123456789"]'
```

要明确选择收件人，请分别设置频道和收件人：

```bash
openclaw config set agents.defaults.heartbeat.to '"123456789"'
openclaw config set agents.defaults.heartbeat.target telegram
```

保留数字聊天 ID 周围的内部双引号，以便将 `to` 存储为字符串。 `heartbeat.target` 接受 `owner`、`last`、`none` 或通道 ID，例如 `telegram`； `telegram:123456789`属于`commands.ownerAllowFrom`，而不是`target`。

## <a id="defaults"></a> 默认值

- 间隔：`30m`。当解析的身份验证模式为 OAuth/token（包括 Claude CLI 重用）时，应用 Anthropic 提供程序默认值会将其更改为 `1h`，但仅限于未设置 `heartbeat.every` 时。设置 `agents.defaults.heartbeat.every` 或每个代理 `agents.entries.*.heartbeat.every`。使用 `0m` 禁用重复节奏。
- 交货目标：`owner`。 OpenClaw 使用第一个具体的 `commands.ownerAllowFrom` 条目，然后通道 `allowFrom`，并且从不将此路由发送到组。如果没有可解析的所有者 DM，则环境轮询会跳过 `reason=no-route`。设置 `target: "last"` 以跟踪最近的对话（包括组），或设置 `target: "none"` 以仅内部运行。
- 提示体（可通过`agents.defaults.heartbeat.prompt`配置）：`Follow the heartbeat monitor scratch context when provided. Recurring tasks are automations; create or change their schedules with the automations tool, not heartbeat scratch. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply NO_REPLY.`
- Timeout：未设置的心跳轮流在设置时使用`agents.defaults.timeoutSeconds`。否则，他们使用上限为 600 秒的心跳节奏。设置 `agents.defaults.heartbeat.timeoutSeconds` 或每个代理 `agents.entries.*.heartbeat.timeoutSeconds` 以获得更长的心跳工作时间。开启后台命令完成后恢复工作或处理后台任务审查、阻塞任务事件和恢复的重新启动工作使用普通代理超时（默认为 48 小时）；心跳节奏和超时设置不会缩短这些持续时间。该事件必须包含在回合中；孤立的监控器不会继承其基本会话中待处理的工作预算。
- 将心跳提示 **verbatim** 作为预定的用户消息发送。心跳运行使用与普通代理轮流相同的系统提示符。没有心跳特定的系统提示部分。
- 当使用 `0m` 禁用重复检测信号时，自动化作业将保留但被禁用。 Doctor 在创建或更新此作业时报告禁用的监视器，而不是将其保留的间隔显示为活动节奏。当您重新启用节奏时，会保留其显示器划痕。有针对性的事件驱动唤醒仍然可用。
- 完全禁用自动化后，即使心跳间隔仍处于启用状态，计划心跳也不会运行。
- 活跃时段（`heartbeat.activeHours`）会根据配置的时区进行检查。在时间窗口之外，心跳会被跳过，直到下一个位于时间窗口内的时间点。
- 当已解析的交付通道报告其未准备好时，没有计划任务或排队事件的环境心跳轮询将跳过模型轮询。它的准备重试从一分钟开始，并加倍至心跳间隔；保持关闭状态的频道不会引发这些民意调查的模型调用。一旦通道准备就绪，下一次重试就会正常运行。所需的任务和事件轮流仍执行其提示并仅检查交付准备情况。网关每次记录进入退避和结算一次，而不是记录每次重试。没有通道目标的心跳保持不变。
- 当主队列繁忙、自动化工作针对同一代理或会话、同一代理的任何回复或嵌入运行处于活动状态或者已解析的目标会话具有活动或排队工作时，计划的心跳会延迟。尚未开始准备的无事件普通监视器轮询将被记录为已跳过，并等待其下一个持续的节奏滴答，而不是在繁忙的工作后保持正在运行的自动化打开。唤醒携带排队事件或计划任务，以及执行后已接纳或保留的工作，仍重试。立即和手动唤醒绕过了广泛的同一代理主动运行检查，但仍然尊重主要、自动化和目标会话繁忙防护。仅归因于同级代理的自动化工作不会暂停心跳。没有记录目标的传统或未绑定的自动化工作仍然是整个流程的繁忙信号。
- A 主机后台命令完成使用普通会话执行并仅等待其自己的会话。 Heartbeat 拥有的节点完成保留其现有的繁忙和交付恢复防护。

## <a id="what-the-heartbeat-prompt-is-for"></a> heartbeat 提示的用途

显式的纯语音回复会通过心跳选择和语音合成保留其口头文本，即使可见回复为空也是如此。它们遵循与其他心跳警报相同的交付目标和可见性设置。

默认提示有意缩小：在提供时遵循心跳监视器暂存上下文，在自动化作业中保持重复工作，并在没有任何需要注意的情况下回复 `NO_REPLY`。它明确告诉代理 **not** 从之前的聊天中推断或重复旧任务，因此默认安装保持安静，而不是重复陈旧的对话上下文。

主动 heartbeat 行为需要选择启用：

- **定期检查**：创建[自动化](/automation/cron-jobs)以进行收件箱审查、日历扫描或排队跟进。每个作业都按照自己的时间表执行其配置的有效负载。默认心跳不会从之前的聊天中推断出重复的工作。
- **人工问候**：如果你希望偶尔收到一条轻量的“有什么需要我帮忙的吗？”消息，请创建一个计划任务，并限制其计划，避免在你配置的本地时区的夜间发送提醒（参见 [时区](/concepts/timezone)）。

Heartbeat 仍然处理节点完成事件。主机执行、CLI 看门狗、ACP 父中继、立即 HTTP 挂钩、重新启动延续和会话状态通知使用普通会话执行。携带捕获的传递路线的完成返回到该帐户、对话和线程；显示器配置的 `target`、`to` 或 `accountId` 无法重定向它。故意 `target: "none"`、直接消息限制、通知选择退出和禁用心跳控制仍然适用。会改变捕获路由的插件规范化被拒绝。普通计划的心跳保留其配置的目标。

Heartbeat 拥有的具有不同传递路线的节点完成轮流运行，包括不同的帐户或主题。相同的完成文本不会抑制不同的完成发生。

如果心跳拥有的完成无法进入交付，则其原始路由事件仍可用于现有的有界唤醒重试。一旦持久交付队列拥有一次尝试，该队列就拥有传输重试；不相关的唤醒不得重新生成其结果。没有确认交付保管的未解决的尝试将被保留在模型重播中。使用 `process poll` 收集执行结果，并在手动重新发送不明确的传递之前验证消息是否到达。这不会改变节点协议协商或旧通知行为。

如果您希望心跳执行非常具体的操作（e.g.“检查 Gmail PubSub 统计信息”或“验证网关运行状况”），请将 `agents.defaults.heartbeat.prompt`（或 `agents.entries.*.heartbeat.prompt`）设置为自定义正文（逐字发送）。

## <a id="immediate-session-events"></a> 即时会话事件

主机后台命令、CLI 看门狗完成、ACP 父级通知、立即 HTTP 挂钩唤醒、重新启动继续和会话状态通知进入普通回复队列。他们保留原始会话的历史记录和捕获的传递路线，等待其现有工作，并使用其当前权限。心跳节奏、活动时间、模型和可见性设置不控制这些事件。原始运行的自动交付选择退出仍然有效。

同一观察者和捕获的传递路线的会话状态通知最多收集 20 秒，并进入一个协调轮次。该回合保留每个通知的权限限制，并且仅在被采纳时才确认观看的会话。如果一份通知在采用前被消耗，则剩余的原始通知将保留其自己的调节工作。

每个事件都有一个执行所有者。定期的心跳轮询和传入用户轮流不能消耗普通队列中等待的事件。验收确认业主保留了该活动；它并不证明执行或交付已完成。重置或删除目标会话会取消保留的事件，而不是将其移动到替换会话中。 `NO_REPLY` 结果保持不变。

被拒绝的事件保留会话准入原因。持久重新启动交付会重试临时拒绝（例如会话初始化），但会解决永久拒绝（例如存档会话或耗尽重新启动恢复）的问题，因为在不重复相同准入尝试的情况下失败了。

## <a id="response-contract"></a> 响应约定

- 如果没有什么需要注意的，回复**`NO_REPLY`**。
- 仅令牌大写片段（例如 `NO_R`）也被视为安静回复。启用 `showOk` 后，它会生成通常的 `HEARTBEAT_OK` 确认，而不是传送片段。
- 心跳运行也可以调用 `heartbeat_respond`，并设置 `notify: false` 以不显示更新，或设置 `notify: true` 并提供 `notificationText` 以发送提醒。如果存在结构化工具响应，则优先使用该响应，而不是文本备用方案。
- 有意义的 `heartbeat_respond` 结果与 `notify: false` 保持沉默，但会被记住作为该会话中下一个用户轮流的有界内部上下文。生成的 `notify: true` 警报（其传送被阻止或未确认）也会被记录，包括其警报文本和传送原因。这是会话的最新结果，而不是警报历史记录或精确传递重播队列。 `no_change` 确认和确认的可见通知不以这种方式存储。
- 现有的自定义提示可能仍会返回旧版 `HEARTBEAT_OK` 确认。 OpenClaw 在回复的 **start 或 end** 处接受它，并在其剩余内容最多为 300 个字符时丢弃回复。镇压预算是固定的。
- A遗留`HEARTBEAT_OK`在**中**的回复中不做特殊处理。
- 对于警报，仅返回警报文本。不要包含无声的致谢。
- Delivery 选择最后一个支持出站的非推理负载。单独的推理或思考有效负载仍然是内部的。仅推理结果不会产生警报。
- 在心跳轮次期间，工具错误警告仍会启用。
- `openclaw system heartbeat last --json` 将已确认的消息工具发送给心跳接收者报告为 `sent`，而不发送另一个确认。
- 如果心跳开始后台工作而不发送更新，则其状态事件报告`skipped`，原因为`background-work`。检查任务是否完成。这并不是一个完全明确的承认。

在心跳之外，消息 start/end 处的杂散 `HEARTBEAT_OK` 被剥离并记录。仅 `HEARTBEAT_OK` 的消息被丢弃。

## <a id="config"></a> 配置

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // default: 30m (0m disables)
        model: "anthropic/claude-opus-4-6",
        lightContext: false, // default: false; true skips workspace bootstrap files for heartbeat runs
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        target: "owner", // default | options: last | none | <channel id>
        accountId: "ops-bot", // optional multi-account channel id
        prompt: "Follow the heartbeat monitor scratch context when provided. Recurring tasks are automations; create or change their schedules with the automations tool, not heartbeat scratch. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply NO_REPLY.",
      },
    },
  },
}
```

### <a id="scope-and-precedence"></a> 作用域和优先级

- `agents.defaults.heartbeat` 设置全局 heartbeat 行为。
- `agents.entries.*.heartbeat` 合并在顶部。如果任何代理具有 `heartbeat` 块，则 **仅这些代理** 运行心跳。
- Ambient所有权通过`agents.defaults.heartbeat.agentId`、`agents.defaults.systemAgent.agentId`解决，然后是独家代理。当没有应用每个代理或默认心跳块并且该链使多代理名册失去所有者时，心跳保持禁用状态并发出验证和网关警告。
- `channels.defaults.heartbeatVisibility` 设置所有 channel 的可见性默认值。
- `channels.<channel>.heartbeatVisibility` 覆盖 channel 默认值。
- `channels.<channel>.accounts.<id>.heartbeatVisibility`（多账户 channel）覆盖每个 channel 的设置。

### <a id="per-agent-heartbeats"></a> 按 agent 的 heartbeats

如果任一 `agents.entries.*` 条目包含 `heartbeat` 块，则**只有这些 agent**会运行 heartbeats。每个 agent 的块会在 `agents.defaults.heartbeat` 基础上合并（因此你可以只设置一次共享默认值，然后按 agent 覆盖）。

示例：两个 agent，只有第二个 agent 运行 heartbeats。

```json5
{
  agents: {
    ownership: "explicit",
    defaults: {
      systemAgent: { agentId: "main" },
      heartbeat: {
        every: "30m",
        target: "owner", // default: operator DM
      },
    },
    entries: {
      main: { workspace: "~/.openclaw/workspace" },
      ops: {
        heartbeat: {
          every: "1h",
          target: "whatsapp",
          to: "+15551234567",
          timeoutSeconds: 45,
          prompt: "Follow the heartbeat monitor scratch context when provided. Recurring tasks are automations; create or change their schedules with the automations tool, not heartbeat scratch. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply NO_REPLY.",
        },
      },
    },
  },
  talk: { agentId: "main" },
}
```

### <a id="active-hours-example"></a> 活跃时段示例

将 heartbeats 限制在特定时区的工作时间内：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "owner", // default: operator DM
        activeHours: {
          start: "09:00",
          end: "22:00",
          timezone: "America/New_York", // optional; uses your userTimezone if set, otherwise host tz
        },
      },
    },
  },
}
```

在此窗口之外（东部时间上午 9 点之前或晚上 10 点之后），心跳会被跳过。窗口内的下一个预定刻度将正常运行。

### <a id="24%2F7-setup"></a><a id="24/7-setup"></a> 24/7 设置

如果你希望 heartbeats 全天运行，请使用以下模式之一：

- 完全忽略 `activeHours`（没有时间窗口限制，这是默认行为）。
- 设置全天窗口：`activeHours: { start: "00:00", end: "24:00" }`。

<Warning>
不要将相同的 `start` 和 `end` 时间设为一致（例如 `08:00` 到 `08:00`）。这会被视为零宽度窗口，因此 heartbeats 总是会被跳过。
</Warning>

### <a id="multi-account-example"></a> 多账户示例

在 Telegram 这类多账户 channels 上，使用 `accountId` 目标指定某个特定账户：

```json5
{
  agents: {
    entries: {
      ops: {
        heartbeat: {
          every: "1h",
          target: "telegram",
          to: "12345678:topic:42", // optional: route to a specific topic/thread
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

### <a id="field-notes"></a> 字段说明

<ParamField path="every" type="string">
  心跳间隔（持续时间字符串，默认单位分钟）。
</ParamField>
<ParamField path="model" type="string">
  heartbeat 运行的可选模型覆盖（`provider/model`）。
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  如果为 true，则心跳运行将使用轻量级引导上下文并跳过工作区引导文件。无论哪种方式，监视器划痕都是由心跳运行器注入的。对话自己的后台命令完成保留了对话的完整上下文。
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  当为 true 时，每个心跳都会在一个新会话中运行，没有先前的对话历史记录。使用与 `sessionTarget: "isolated"` 自动化作业相同的隔离模式。显着降低每个心跳的令牌成本。与 `lightContext: true` 结合使用可实现最大程度的节省。传递路由和对话上下文仍然遵循所选对话，包括其频道、帐户和主题。如果该对话稍后移动，则后台命令的完成将保留其原始事件路线。它不借用新房间的描述或激活策略。会话自身的后台命令完成不是孤立的；请参阅 [Session 和目标路由](#delivery-behavior)。
</ParamField>
<ParamField path="session" type="string">
  heartbeat 运行的可选会话键。

- `main`（默认）：agent 主会话。
- 显式会话键（从 `openclaw sessions --json` 或 [sessions CLI](/cli/sessions) 复制）。
- 会话键格式：参见 [Sessions](/concepts/session) 和 [Groups](/channels/groups)。

</ParamField>
<ParamField path="target" type="string">
- `owner`（default）：发送到 `commands.ownerAllowFrom` 中第一个可解析的 operator DM，然后发送到 channel `allowFrom`。此路由不会解析到群组或 channel。
- `last`：明确遵循上次使用的外部会话，包括群组和 channel。
- 显式 channel：任何已配置的 channel 或 plugin id，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
- `none`：仅针对内部状态运行心跳。 **请勿对外交付**。

对于显式 Telegram 收件人，请使用 `target: "telegram"` 和 `to: "123456789"`。 `target` 字段不接受组合的通道和接收者值，例如 `"telegram:123456789"`。

</ParamField>
<ParamField path="directPolicy" type='"allow" | "block"' default="allow">
  控制 direct/DM 传送行为。 `allow`：允许direct/DM心跳传递。 `block`：抑制direct/DM交付（`reason=dm-blocked`）。

</ParamField>
<ParamField path="to" type="string">
  显式渠道目标的收件人（例如，WhatsApp 的 E.164 或 Telegram 聊天 ID）。 `owner` 和未设置的目标忽略 `to`。对于 Telegram topics/threads，请使用 `<chatId>:topic:<messageThreadId>`。

</ParamField>
<ParamField path="accountId" type="string">
  多帐户渠道的可选帐户 ID。当`target: "last"`时，如果支持帐户，则帐户ID适用于解析的最后一个通道。否则它会被忽略。如果帐户 ID 与已解析频道的配置帐户不匹配，则将跳过传送。

</ParamField>
<ParamField path="prompt" type="string">
  覆盖默认提示正文（不进行合并）。

</ParamField>
<ParamField path="timeoutSeconds" type="number" default="global timeout or min(every, 600)">
  心跳代理在中止之前允许的最大秒数。如果未设置，则在设置时使用 `agents.defaults.timeoutSeconds`，否则心跳节奏上限为 600 秒。 Exec-completion、后台任务和恢复的重新启动继续使用普通代理超时，包括用于无超时的显式 `agents.defaults.timeoutSeconds` 值 `0`。

</ParamField>
<ParamField path="activeHours" type="object">
  将心跳运行限制在时间窗口内。带有 `start`（HH：MM，包括在内，`00:00` 为当天开始）、`end`（HH：MM 除外，`24:00` 允许为日终），以及可选的 `timezone`。

- 省略或 `"user"`：如果设置了 `agents.defaults.userTimezone`，则使用它；否则回退到主机系统时区。
- `"local"`：始终使用主机系统时区。
- 任何IANA标识符（e.g. `America/New_York`）：直接使用。如果无效，则回退到上面的 `"user"` 行为。
- 对于活动窗口，`start` 和 `end` 不得相等。相等的值被视为零宽度（始终在窗口之外）。
- 在活跃窗口之外，heartbeats 会被跳过，直到下一个落在窗口内的 tick。

</ParamField>

<Note>
Heartbeat 配置是严格的：只接受上面列出的字段。确认消息抑制、推理可见性、系统提示指导、繁忙时延迟以及工具错误警告行为，都是固定的运行时策略，而不是 heartbeat 配置字段。
</Note>

## <a id="delivery-behavior"></a> 投递行为

<AccordionGroup>
  <Accordion id="session-and-target-routing" title="会话和目标路由">
    - 默认情况下，Heartbeats 在代理的主会话中运行 （`agent:<id>:main`），或者在 `session.scope = "global"` 时运行 `global`。设置 `session` 以覆盖特定通道会话 （Discord/WhatsApp/etc.）。
    - `session` 仅影响运行上下文。交付由 `target` 和 `to` 控制，会话拥有的事件除外（见下文）。
    - A 心跳拥有的节点完成，其捕获的路由仍然是其会话自己的对话（例如代理启动命令的 Telegram 主题）继续该对话。它在该会话中以其完整上下文运行，忽略 `isolatedSession` 和 `lightContext`，并且回复将转到该会话，无论 `target`、`to`、`directPolicy` 和通道 `heartbeatVisibility` 是什么。在该完成回合期间启动的命令属于同一对话。这些完成不会等待下一个心跳间隔，但事件轮转仍至少间隔 30 秒且每分钟最多 5 次。当结果不值得报告时，模型仍然保持沉默。 OpenClaw 自己的该轮通知，例如运行失败通知、工具失败警告、状态行或截断标签，仍然遵循心跳的 `target`、`isolatedSession` 和 `showAlerts` 设置，因此 `target: "none"` 或`showAlerts: false` 让他们远离聊天，同时模型的答案仍在传递。这些设置继续管理定期轮询和心跳拥有的工作。没有此类路线的完成，例如来自具有 `delivery: "none"` 的自动化，仍遵循 `target`/`to`. 要关闭完成轮次，请设置 `tools.exec.notifyOnExit: false`。
    - A 心跳唤醒（其待处理事件是内部会话（Control UI/WebChat 或另一个运营商拥有的会话，没有外部路由）中所有会话拥有的节点完成）将回复发布到该会话的记录中，而不是 `target`/`to` 通道中。 `target: "none"`依然压制。如果会话写入失败，事件将保持排队等待稍后唤醒，并且不会回退到通道。还包含其他事件的批次照常使用 `target`/`to`。
    - 默认的`owner`目标选择显式配置的所有者身份。仅当会话的最后一个路由是与该所有者的直接聊天时，它才会重用确切的 account/thread。
    - 携带频道和收件人的唤醒会在发现所有者之前使用指定的来源。由于这是明确指定的，事件目的地可以是群组，而不是推断得出。
    - 要传送到特定的channel/recipient，请设置通道`target`加`to`。 `target: "last"` 是对最后一次外部对话（包括群组）的明确选择。
    - 默认情况下，Heartbeat 交付允许 direct/DM 目标。设置 `directPolicy: "block"` 以抑制直接目标发送，同时仍在运行心跳轮。
    - 当主队列繁忙、自动化工作针对同一代理或会话（或没有记录的目标）、同一代理的任何回复或嵌入式运行处于活动状态或者已解析的目标会话具有活动或排队工作时，会跳过计划的心跳。尚未开始准备的无事件普通监视器轮询等待下一个持续的节奏滴答声。排队的事件、计划的任务以及执行后已接受或保留的工作将保留重试。立即和手动唤醒仅绕过广泛的同一代理主动运行预检查。
    - 如果 `owner` 没有具体的、支持 DM- 的所有者或配置的通道，则在代理运行之前，轮询将作为 `reason=no-route` 被跳过。当会话没有外部路由时，显式 `last` 也会跳过。
    - 由隐式 `owner` 默认设置投递的第一条告警会说明定期检查以及如何选择 `target: "none"`。后续告警会省略该行。

  </Accordion>
  <Accordion id="visibility-and-skip-behavior" title="可见性和跳过行为">
    - 如果在模型回复之前心跳转向失败，则每当 OpenClaw 本身拒绝运行时，失败通知都会指出原因。一个例子是会话运行时在另一个运行程序中仍然忙碌。原始提供程序或运行时错误保留在详细的故障详细信息设置（`/verbose on` 或 `/verbose full`）之后，就像在正常聊天中一样。
    - 如果 `showOk`、`showAlerts` 和 `useIndicator` 全部禁用，则会直接跳过运行，原因是 `reason=alerts-disabled`。
    - 如果只禁用了告警投递，OpenClaw 仍可运行心跳、更新到期任务时间戳、恢复会话空闲时间戳，并抑制外发告警载荷。
    - 如果通道在转弯过程中变得不可用，并且最终准备情况检查阻止了警报，则 OpenClaw 会记录未送达，而不消耗其节奏槽。一分钟宽限期后，环境轮询会重试；随后的不可用通道尝试在不调用模型的情况下检查准备情况，并将延迟加倍至心跳间隔。所需的任务和排队事件轮流继续执行其提示并保留一分钟传送重试。一旦准备就绪允许环境重试，它就会运行新的回合，而不是重放之前的警报。一旦发送进入持久传递队列，该队列就拥有传输重试权。
    - 如果解析出的心跳目标支持输入中状态，OpenClaw 会在心跳运行期间显示输入中状态。这使用与心跳要发送聊天输出相同的目标，并且可通过 `typingMode: "never"` 禁用。

  </Accordion>
  <Accordion id="session-lifecycle-and-audit" title="会话生命周期和审核">
    - 仅心跳回复即可**不是**保持会话存活。心跳元数据可能会更新会话行，但空闲到期会使用`lastInteractionAt`从最后一个真实的user/channel消息和每日到期使用`sessionStartedAt`。
    - Control UI和WebChat历史隐藏心跳提示和OK-仅确认。基础会话记录仍可以包含 audit/replay. 的这些轮次
    - Host 后台执行通过普通会话执行恢复。拥有心跳的节点通知和延迟挂钩继续使用心跳队列。

  </Accordion>
</AccordionGroup>

## <a id="visibility-controls"></a> 可见性控制

默认情况下，在传送警报内容时会抑制安静的心跳确认。您可以按频道或帐户调整此设置：

```json5
{
  channels: {
    defaults: {
      heartbeatVisibility: {
        showOk: false, // Hide HEARTBEAT_OK (default)
        showAlerts: true, // Show alert messages (default)
        useIndicator: true, // Emit indicator events (default)
      },
    },
    telegram: {
      heartbeatVisibility: {
        showOk: true, // Show OK acknowledgments on Telegram
      },
    },
    whatsapp: {
      accounts: {
        work: {
          heartbeatVisibility: {
            showAlerts: false, // Suppress alert delivery for this account
          },
        },
      },
    },
  },
}
```

优先级：按账户 → 按频道 → 频道默认值 → 内置默认值。

### <a id="what-each-flag-does"></a> 每个标志的作用

- `showOk`：当模型返回 OK-only 回复时发送 `HEARTBEAT_OK` 确认。
- `showAlerts`：当模型返回非 OK 回复时，发送告警内容。
- `useIndicator`：为 UI 状态界面发出指示器事件。

如果 **所有三个** 均为 false，则 OpenClaw 完全跳过心跳运行（无模型调用）。

### <a id="per-channel-vs-per-account-examples"></a> 按频道 vs 按账户示例

```json5
{
  channels: {
    defaults: {
      heartbeatVisibility: {
        showOk: false,
        showAlerts: true,
        useIndicator: true,
      },
    },
    slack: {
      heartbeatVisibility: {
        showOk: true, // all Slack accounts
      },
      accounts: {
        ops: {
          heartbeatVisibility: {
            showAlerts: false, // suppress alerts for the ops account only
          },
        },
      },
    },
    telegram: {
      heartbeatVisibility: {
        showOk: true,
      },
    },
  },
}
```

### <a id="common-patterns"></a> 常见模式

| 目标                                     | 配置                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 默认行为（静默确定，警报打开） | _（无需配置）_                                                                               |
| 完全静默（无消息、无指示器） | `channels.defaults.heartbeatVisibility: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）             | `channels.defaults.heartbeatVisibility: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个通道中可以                  | `channels.telegram.heartbeatVisibility: { showOk: true }`                                          |

## <a id="monitor-scratch-(optional)"></a><a id="monitor-scratch-optional"></a> 监控暂存内容（可选）

每个心跳自动化作业都拥有存储在共享状态数据库中的私有监视器暂存。将其视为您的“心跳检查清单”：小、稳定且安全，每 30 分钟考虑一次。当scratch存在时，其内容会追加到心跳提示中。

使用自动化 CLI 进行管理（作业 ID 来自 `openclaw cron list --all`）：

```bash
openclaw cron scratch <jobId>                 # print the current scratch
openclaw cron scratch <jobId> --set "..."     # replace it with exact text
openclaw cron scratch <jobId> --file notes.md # replace it from a file (- for stdin)
openclaw cron scratch <jobId> --unset         # remove it
```

写入操作受比较并交换保护：传入 `--expected-revision <n>`，如果存在并发编辑则会失败，而不是覆盖内容。暂存内容上限为 256 KiB，并且永远不会出现在 `cron list`/`cron runs` 的输出中。

代理也可以更新自己的暂存内容：在一次心跳轮次中，`heartbeat_respond` 接受可选的 `scratch` 字符串，该字符串会完全替换监控器之后心跳所使用的暂存内容。

<Note>
**从 HEARTBEAT.md 或仅配置节奏迁移？** 运行 `openclaw doctor --fix`。 Doctor 首先从 `agents.*.heartbeat` 创建或更新系统拥有的监视器行。然后，它将每个代理的工作区 `HEARTBEAT.md` 导入到监视器暂存区中。它将任何有效的旧 `tasks:` 条目转换为自动化作业。它将原始文件存档在状态目录 （`backups/heartbeat-migration/`） 下并删除该文件。运行时心跳指令仅来自数据库头。运行时永远不会读取 `HEARTBEAT.md`。

如果工作区和状态目录位于不同的文件系统上，Doctor 会将原始文件保留在其先前位置旁边的私有 `HEARTBEAT.md.doctor-archived.*` 目录中。状态目录备份仍然是不可变的快照。稍后通过已打开的文件描述符进行的写入在工作区存档中仍可恢复。
</Note>

当暂存存在但实际上为空时，OpenClaw 会跳过心跳运行以保存 API 调用。实际上为空意味着只有空行、Markdown 或 HTML 注释、Markdown 标题（如 `# Heading`）、栅栏标记或空清单存根。该跳过报告为 `reason=empty-heartbeat-file`。没有到期任务的计划间隔监视器会在推迟到繁忙的执行队列之前解决此跳过问题。如果不存在划痕，心跳仍然运行，模型决定做什么。

保持它足够小（简短清单或提醒），以避免提示词膨胀。

示例暂存内容：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it's daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### <a id="schedule-recurring-checks-with-automations"></a> 使用自动化任务安排定期检查

监视器暂存是提示上下文，而不是调度程序。将每个定期检查创建为 [ 自动化作业 ](/automation/cron-jobs)，以便它具有自己的节奏、enable/disable 状态和运行历史记录。当检查应使用正常对话上下文时，自动化作业仍然可以针对主会话。

较旧的暂存可能包含结构化 `tasks:` 块。升级后运行 `openclaw doctor --fix` 一次：Doctor 将每个有效条目转换为独立计划的自动化作业。它保留每个条目的间隔和之前的最后运行时间。它删除了退休的块并保留了周围的草稿散文。运行时心跳轮次不会将 `tasks:` 文本解析为计划。

Doctor 创建的心跳任务会保留心跳的活跃时段、冷却时间、防洪和忙碌保护机制。同时到期的任务可以合并到一次心跳轮次中。在活跃时段之外到期的任务会被跳过，并在下一次计划的发生时间再次尝试。

### <a id="can-the-agent-update-its-scratch%3F"></a><a id="can-the-agent-update-its-scratch"></a> 代理可以更新自己的暂存内容吗？

是的。在心跳轮换期间，代理可以将 `scratch` 值传递给 `heartbeat_respond`，以完全替换未来心跳的监视器暂存。您还可以在正常聊天中要求它运行 `openclaw cron scratch <jobId> --set ...`，或者使用相同的命令自行编辑草稿。通过自动化管理重复计划，而不是从头开始编写计划程序语法。

<Warning>
不要将机密信息（API 密钥、电话号码、私有令牌）放入监控器暂存内容中——它会成为提示词上下文的一部分。
</Warning>

## <a id="manual-wake-(on-demand)"></a><a id="manual-wake-on-demand"></a> 手动唤醒（按需）

使用 `openclaw system event` 来排队一个系统事件，并可选择立即触发一次心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

| 标志                         | 描述                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `--text <text>`              | 系统事件文本（必填）。                                                                    |
| `--mode <mode>`              | `now` 立即运行一次心跳；`next-heartbeat`（默认）等待下一个计划时刻。 |
| `--session-key <sessionKey>` | 为该事件指定特定会话；默认使用代理的主会话。                   |
| `--json`                     | 输出 JSON。                                                                                     |

如果未提供 `--session-key`，且多个代理都配置了 `heartbeat`，那么 `--mode now` 会立即运行这些代理各自的心跳。

即使另一个代理成功或被悄悄跳过，广播完成也会报告代理失败。繁忙重试和受保护的延迟保留其现有的重试行为。

同一 CLI 组中的相关心跳控制命令：

```bash
openclaw system heartbeat last     # show the last heartbeat event
openclaw system heartbeat enable   # enable heartbeats
openclaw system heartbeat disable  # disable heartbeats
```

## <a id="cost-awareness"></a> 成本意识

心跳会运行完整的代理轮次。间隔越短，消耗的 token 越多。为了降低成本：

- 使用 `isolatedSession: true`，避免发送完整的对话历史（每次运行约从 100K 个 token 降至约 2-5K 个 token）。
- 使用 `lightContext: true`，跳过心跳运行的工作区引导文件。
- 设置更便宜的`model`（e.g. `ollama/llama3.2:1b`）。
- 保持监控暂存区较小。
- 如果只想更新内部状态，请明确设置 `target: "none"`。

## <a id="context-overflow-after-heartbeat"></a> 心跳后的上下文溢出

运行完成后，检测信号会保留共享会话的现有运行时模型。因此，将会话切换到较小的本地模型的心跳可以将该模型保留在适当的位置以供下一个主会话轮流使用。具有 32k 窗口的 Ollama 模型就是一个例子。下一轮可能会报告上下文溢出。如果会话的最后一个运行时模型也与配置的 `heartbeat.model` 匹配，则 OpenClaw 的恢复消息会指出心跳模型流失是可能的原因。该消息还建议修复。

为了避免这种情况，请使用 `isolatedSession: true` 在新会话中运行心跳。您可以将其与 `lightContext: true` 结合使用以获得最小的提示。否则，请选择具有足够大的上下文窗口以容纳共享会话的心跳模型。

## <a id="related"></a> 相关内容

- [自动化](/automation) - 所有自动化机制一览
- [时区](/concepts/timezone) - 时区如何影响心跳调度
- [故障排查](/automation/cron-jobs#troubleshooting) - 调试自动化问题。
