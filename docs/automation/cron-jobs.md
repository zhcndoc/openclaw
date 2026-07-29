---
summary: "Gateway 调度器的计划任务、webhook 和 Gmail PubSub 触发器"
read_when:
  - 调度后台作业或唤醒
  - 将外部触发器（webhook、Gmail）接入 OpenClaw
  - 在计划任务中决定使用 heartbeat 还是 cron
title: "计划任务"
sidebarTitle: "计划任务"
---

Cron 是 Gateway 内置的调度器。它会持久化作业，在合适的时间唤醒 agent，并且可以将输出发送到聊天频道、webhook，或者不发送到任何地方。

## 快速开始

<Steps>
  <Step title="添加一次性提醒">
    ```bash
    openclaw cron create "2027-02-01T16:00:00Z" \
      --name "提醒" \
      --session main \
      --system-event "提醒：检查 cron 文档草稿" \
      --wake now \
      --delete-after-run
    ```
  </Step>
  <Step title="检查你的作业">
    ```bash
    openclaw cron list
    openclaw cron get <job-id>
    openclaw cron show <job-id>
    ```
  </Step>
  <Step title="查看运行历史">
    ```bash
    openclaw cron runs --id <job-id>
    ```
  </Step>
</Steps>

## Cron 的工作方式

- Cron 运行在 **Gateway 进程内部**，而不是在模型内部。必须运行 Gateway，计划任务才会触发。
- 作业定义、运行时状态和运行历史都持久化在 OpenClaw 共享的 SQLite 状态数据库中，因此重启不会丢失计划任务。
- 每次 cron 执行都会创建一条 [后台任务](/automation/tasks) 记录。
- 一次性作业（`--at`）默认在成功后自动删除；可传入 `--keep-after-run` 以保留它们。
- 每次运行的墙钟时间预算：设置了 `--timeout-seconds` 时使用该值。否则，隔离/分离的 agent-turn 作业会受 cron 自身 60 分钟看门狗限制；在此之前，底层 agent-turn 超时（`agents.defaults.timeoutSeconds`，默认 48 小时）不会生效。命令作业默认 10 分钟，脚本载荷默认 5 分钟。
- 在 Gateway 启动时，超期的隔离 agent-turn 作业会被重新调度，而不是立即回放，从而避免模型/工具初始化工作占用通道连接窗口。
- 如果你通过系统 cron 或其他外部调度器驱动 `openclaw agent`，即使 CLI 已经处理了 `SIGTERM`/`SIGINT`，也应包一层强制终止升级机制。Gateway 支持的运行会请求 Gateway 中止已接受的运行；`--local` 运行会收到同样的中止信号。对于 GNU `timeout`，优先使用 `timeout -k 60 600 openclaw agent ...`，而不是直接用 `timeout 600 ...` —— `-k` 的值是进程无法及时退出时的兜底。对于 systemd 单元，在最终杀死进程前，使用带宽限窗口（`TimeoutStopSec`）的 `SIGTERM` 停止信号。若在原始 Gateway 运行仍处于活跃状态时重复使用 `--run-id`，重复项会被报告为进行中，而不会启动第二次运行。

<AccordionGroup>
  <Accordion title="隔离运行加固">
    - 隔离运行在完成时会尽力关闭其 `cron:<jobId>` 会话所跟踪的浏览器标签页/进程，并通过与主会话和自定义会话运行相同的共享清理路径，释放为该作业创建的任何打包 MCP 运行时实例。清理失败会被忽略，因此 cron 结果仍会优先生效。
    - 具有狭窄 cron 自清理权限的隔离运行可以读取调度器状态、仅包含自身作业的自过滤列表，以及该作业的运行历史，并且只能删除自己的作业。
    - 隔离运行会防止过时的确认回复：如果第一条结果只是中间状态更新（如 `on it`、`pulling everything together` 之类的提示），且没有任何子级 subagent 仍负责最终答案，OpenClaw 会再次提示以获取真实结果，然后再交付。
    - 结构化的执行拒绝元数据（包括 node-host `UNAVAILABLE` 包装，其中嵌套错误以 `SYSTEM_RUN_DENIED` 或 `INVALID_REQUEST` 开头）会被识别，因此被阻止的命令不会被报告为成功运行，而普通的助手说明文字也不会被误认为是拒绝。
    - 运行级 agent 失败即使没有回复负载，也会计为作业错误，因此模型/提供方失败会增加错误计数并触发失败通知，而不是将作业清除为成功。
    - 当作业达到 `timeoutSeconds` 时，cron 会中止运行并给予一个短暂的清理窗口。如果仍未退出，Gateway 所拥有的清理会在 cron 记录超时之前强制清除该运行的会话所有权，这样排队中的聊天工作就不会被卡在一个过期的处理会话后面。
    - 启动/初始化停滞会获得按阶段区分的超时（例如 `cron: isolated agent setup timed out before runner start` 或 `cron: isolated agent run stalled before execution start (last phase: context-engine)`）。这些看门狗即使在外部 CLI 进程启动之前，也会覆盖嵌入式和 CLI 支持的提供方，并且会独立于较长的 `timeoutSeconds` 值进行限制，从而让冷启动/认证/上下文失败能快速暴露。

  </Accordion>
  <Accordion title="任务对账">
    Cron 任务对账首先由运行时拥有，其次才依赖持久历史：只要 cron 运行时仍将某个作业视为正在运行，活跃的 cron 任务就会保持存活，即使旧的子会话行仍然存在。等运行时不再拥有该作业，且 5 分钟宽限窗口过期后，维护检查会针对匹配的 `cron:<jobId>:<startedAt>` 运行查看已持久化的运行日志和作业状态。该处的终态结果会最终确定任务账本；否则，由 Gateway 管理的维护可以将任务标记为 `lost`。离线 CLI 审计可以根据持久化历史恢复，但其自身空的进程内活跃作业集合并不能证明一个由 Gateway 管理的运行已经消失。
  </Accordion>
</AccordionGroup>

## 计划类型

| Kind      | CLI flag           | Description                                                                                              |
| --------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `at`      | `--at`             | 一次性时间戳（ISO 8601，或类似 `20m` 的相对时间）                                                         |
| `every`   | `--every`          | 固定间隔（`10m`、`1h`、`1d`）                                                                             |
| `cron`    | `--cron`           | 5 字段或 6 字段的 cron 表达式，可选 `--tz`                                                                 |
| `on-exit` | `--on-exit`        | 当被监视的命令退出时触发一次（事件触发；在 turn teardown 后仍然有效；可选 `--on-exit-cwd`）               |
| `stream`  | `--stream-command` | 从受监督的长生命周期命令产生的批量行中触发                                                                 |

不带时区的时间戳会被视为 UTC。添加 `--tz America/New_York` 可将不带偏移的 `--at` 日期时间按该 IANA 时区解释，或按该 IANA 时区计算 cron 表达式。不带 `--tz` 的 cron 表达式使用 Gateway 主机时区。`--tz` 不能与 `--every` 或 `--on-exit` 一起使用。

每小时整点的重复表达式（分钟为 `0` 且小时字段为通配符）会自动错开最多 5 分钟，以减少负载峰值。使用 `--exact` 可强制精确时间，或使用 `--stagger 30s` 指定明确的窗口（仅适用于 cron 调度）。

### 心跳任务迁移

旧版 heartbeat scratch 支持结构化的 `tasks:` 块。升级后运行 `openclaw doctor --fix`，可将每个条目转换为普通、可编辑的主会话 cron 作业。Doctor 会保留间隔和上一次运行时间，在移除该块之前创建这些作业，并在再次运行时安全地收敛相同的声明键。

这些迁移后的作业携带公开的 `systemEvent` 负载，因此 `openclaw cron list`、`get`、`edit` 和 `remove` 以及 cron 工具都会像管理其他作业一样管理它们。它们的执行使用受保护的心跳任务唤醒机制：活跃时段、最小间隔、洪泛控制和忙碌重试仍然适用，而 cron 负责每个任务独立的节奏。在相同合并窗口内到期的作业可以共享一次心跳 turn。若计划发生在 heartbeat 活跃时段之外，则会跳过，并在作业的下一次出现时重试。

Heartbeat scratch 现在仅用于监控说明。运行时 heartbeat 不会将 `tasks:` 文本解析为调度；请使用 cron 创建新的周期性工作。

### 流来源

流调度会让操作员编写的 argv 命令在 Gateway 下持续运行，并根据其 stdout 和 stderr 输出的行来触发作业。流调度是事件驱动的，从不按时间到期，并且需要 `cron.triggers.enabled: true`，因为这个长生命周期命令与触发脚本具有相同的无人值守信任级别。禁用或移除该作业会停止进程；Gateway 关闭时会等待进程树拆除完成。快速失败会使用 cron 内置的错误退避机制重启。连续 5 次运行时间短于 60 秒会使作业进入错误状态，并使用正常的失败告警路径；手动重新启用该作业即可清除重启上限。

```bash
openclaw cron add \
  --name "Build event stream" \
  --stream-command '["node","scripts/build-events.mjs"]' \
  --stream-mode match \
  --stream-match '^(failed|recovered):' \
  --stream-batch-ms 250 \
  --session isolated \
  --message "调查这些构建事件。"
```

`mode: "line"`（默认值）接受每一行。`mode: "match"` 仅接受与编译后的 `match` 正则表达式匹配的行。一个批次会在静默 `batchMs` 后关闭（默认 250 ms，限制在 50–5000 之间）或在达到 `maxBatchBytes` 时关闭（默认 16384，限制在 1024–65536 之间）。达到字节上限时，批次会以 `[truncated]` 结尾。匹配模式始终会将完整行与其完整文本进行比对，即使超过 `maxBatchBytes` 也是如此（只有传送出去的批次会被截断）；在受限的原始输入上限处被切断的行只有前缀，因此会被视为不匹配，而不会让一个以行尾锚定的模式在截断处触发。该批次会附加到系统事件文本或 agent-turn 消息中。由于来源命令与负载命令会产生歧义的进程所有权，因此流调度不接受命令负载。

每个作业只保留一次负载触发和一个受限的待处理批次。当负载正在运行时，或内置的 30 秒触发间隔尚未过去时到达的行，会合并到该待处理批次中，而不是构建一个无限队列。一个串行化的所有者会将门控丢弃、负载错误和未运行的分发记录到 `streamDroppedBatches` 中；受限合并会增加 `streamCoalescedBatches`。失败的负载不会重试，因为它们可能不是幂等的。逻辑源身份在受监督的子进程重启之间保持稳定，但在来源被禁用、移除或替换时会轮换，因此来自已退役来源的排队批次即使在 A 到 B 再到 A 的编辑之后也无法触发。停止完成后，旧子进程的延迟回调不会再生效。V1 不包含原生 WebSocket 来源；可以用诸如 `websocat wss://example.invalid/events` 这样的 argv 命令进行桥接。

当流作业还具有 `trigger.script` 时，门控会在每个关闭的批次上运行一次。当前批次可通过深度冻结的 `trigger.streamBatch` 字符串获取，并与 `trigger.state` 并列存在。`fire: false` 会在持久化门控状态后丢弃该批次。`fire: true` 会保留现有触发消息语义，然后将该批次追加到最终负载中。流作业也可以改为使用不带条件门控的脚本负载；该脚本会通过相同的 `trigger.streamBatch` 值接收批次。将脚本负载与条件门控组合会被拒绝，因为两者都会占用持久化的 `trigger.state` 槽位。

### 动态节奏（pacing）

周期性作业可以设置 `pacing.min` 和/或 `pacing.max` 为类似 `15m` 或 `4h` 的持续时间字符串；至少需要一个边界。与 `cron add|edit` 一起使用 `--pacing-min` 和 `--pacing-max`（`--clear-pacing` 会移除两个边界）。

在 agent-turn 运行期间，一个受节奏控制的作业可以调用 `cron` 工具，并使用 `action: "next_check"` 和 `in: "30m"`。该提议仅适用于当前运行中的作业，并从成功运行完成时开始计时。OpenClaw 会静默地将其限制到已配置的边界内。

没有提议的 pacing 不会改变正常调度。失败、超时和跳过的运行会丢弃该提议，因此现有的重试和错误退避行为具有优先级。手动强制运行周期性作业属于带外操作，并会保留其待定的自然或 pacing 槽位。对于条件触发的作业，即使提议请求更早检查，内置的最小间隔仍然是下限。

### `/loop` 聊天快捷方式

在聊天中，仅所有者可用的 `/loop [interval] <prompt>` 命令会创建一个绑定到该对话的周期性 agent-turn 作业。提供一个间隔，例如 `5m`，用于固定节奏；或者省略它，让 loop 在 1 分钟到 1 小时之间通过 `next_check` 自行节奏控制。使用 `/loop status` 列出绑定到对话的 loops，使用 `/loop stop [name]` 将其移除。

### 月内日期和星期几使用 OR 逻辑

Cron 表达式由 [croner](https://github.com/Hexagon/croner) 解析。当月中的日期字段和星期字段都不是通配符时，croner 会在**任一**字段匹配时触发，而不是两者都匹配。这是标准的 Vixie cron 行为。

```bash
# 预期： “每月 15 日上午 9 点，但仅当那天是星期一时”
# 实际：   “每月 15 日上午 9 点，且每个星期一上午 9 点”
0 9 15 * 1
```

这每月大约会触发 5-6 次，而不是 0-1 次。若要同时满足两个条件，请使用 croner 的 `+` 星期字段修饰符（`0 9 15 * +1`），或者只按一个字段进行调度，并在作业的 prompt 或命令中对另一个条件进行检查。

## 事件触发器（条件监视器）

事件触发器会为 `every`、`cron` 或 `stream` 调度添加一个无头条件脚本。时间类调度会在到期时对其进行评估；流式调度会在每个已关闭的批次上对其进行评估。只有当脚本返回 `fire: true` 时，Cron 才会运行正常负载：

```json5
{
  schedule: { kind: "every", everyMs: 30000 },
  trigger: {
    // 仅当观察到的状态与上一次评估不同时时触发。
    script: "const res = await tools.call('exec', { command: 'gh pr checks 123 --json state -q \\'.[].state\\' | sort -u' }); const status = String(res?.result?.details?.aggregated ?? '').trim(); json({ fire: status !== trigger.state?.status, message: `PR 123 CI: ${trigger.state?.status ?? 'unknown'} -> ${status}`, state: { status } });",
    once: false,
  },
  payload: { kind: "agentTurn", message: "调查 CI 状态变化。" },
}
```

脚本必须返回 `{ fire, message?, state? }`。之前的 JSON 状态可通过深度冻结的 `trigger.state` 获取；流式门控还会接收到当前批次作为 `trigger.streamBatch`。返回一个新的 `state` 值以将其持久化。状态上限为 16 KB。当天触发结果包含 `message` 时，cron 会在执行前将其附加到系统事件文本或 agent-turn 消息中。`once: true` 会在首次成功触发并执行负载后禁用该任务。

`fire: false` 会持久化评估状态和计数器，然后重新调度，但不会创建运行历史。如果已触发的负载运行失败，返回的 `state` **不会** 被持久化——下一次评估仍会看到之前的状态并可能再次触发，因此脚本应编写为只读检查，并将动作保留在负载中。触发器调度内置最小间隔为 30 秒。每次评估都有 30 秒的墙钟时间预算，最多可进行 5 次工具调用。

编写 watcher 时应围绕**可操作状态**，而不仅仅是成功状态：如果某个 watcher 在检查失败或超时时就悄然停止，它看起来会是健康的，但实际上已经坏了。将观察结果与 `trigger.state` 进行比较并返回新的状态以去重；不要依赖模型或进程内存。触发时，`message` 应保持自包含，因为它会成为已触发运行的完整事件上下文。

<Warning>
启用 `cron.triggers.enabled` 允许条件触发脚本和 `script` 负载在无头模式下运行，并使用所属 agent 的**完整工具策略，包括 `exec`**。请将其视为带有该 agent 权限的无人值守代码执行；除非允许创建 cron 任务的每个 agent 都经过相应信任，否则请保持禁用。
</Warning>

从本地脚本文件创建一个监视器（`-` 表示从 stdin 读取脚本）：

```bash
openclaw cron add \
  --name "PR CI watcher" \
  --every 30s \
  --trigger-script ./watch-pr-ci.js \
  --message "Respond to the CI status change" \
  --session isolated
```

## Payloads

每个作业都恰好携带一种载荷类型，由标志位决定：

| Payload       | Flag                                           | Runs                                                       |
| ------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| 系统事件      | `--system-event <text>`                        | 入队到主会话，本身不调用模型                                     |
| 代理消息      | `--message <text>`                             | 一个由模型支持的代理轮次                                          |
| 命令          | `--command <shell>` or `--command-argv <json>` | Gateway 主机上的 shell/process，不调用模型                         |
| 脚本          | `--script <file\|->`                           | 使用所属 agent 工具的无头代码模式脚本                              |

还有一种额外的载荷类型 `heartbeat`，由系统拥有：gateway 会为每个启用 heartbeat 的 agent 汇聚一个 heartbeat 监控作业（参见 [Heartbeat](/gateway/heartbeat)）。它会出现在 `cron list --all` 中，但不能通过 CLI 或 API 创建或编辑。Heartbeat 配置会在启动、配置重载时，或通过 `openclaw doctor --fix` 写入到持久化的监控计划中。当 cron 被禁用时，监控不会触发，也不会运行任何回退 heartbeat 定时器。

### 代理轮次选项

<ParamField path="--message" type="string" required>
  提示文本（孤立/当前/自定义会话作业必填）。
</ParamField>
<ParamField path="--model" type="string">
  模型覆盖；必须解析为允许的模型，否则运行将因校验错误而失败。
</ParamField>
<ParamField path="--fallbacks" type="string">
  每个作业的回退模型列表，例如 `--fallbacks openai/gpt-5.6-sol,openrouter/meta-llama/llama-3.3-70b-instruct:free`。对于不带回退的严格运行，请传入 `--fallbacks ""`。
</ParamField>
<ParamField path="--clear-fallbacks" type="boolean">
  在 `cron edit` 中，移除每个作业的回退覆盖，使作业遵循已配置的回退优先级。不能与 `--fallbacks` 同时使用。
</ParamField>
<ParamField path="--clear-model" type="boolean">
  在 `cron edit` 中，移除每个作业的模型覆盖，使作业遵循正常的 cron 模型优先级（先存储的 cron-session 覆盖，其次 agent/default 模型）。不能与 `--model` 同时使用。
</ParamField>
<ParamField path="--thinking" type="string">
  思考级别覆盖（`off|minimal|low|medium|high|xhigh|adaptive|max|ultra`）。可用级别仍取决于所选模型和 agent 运行时。
</ParamField>
<ParamField path="--clear-thinking" type="boolean">
  在 `cron edit` 中，移除每个作业的思考覆盖。不能与 `--thinking` 同时使用。
</ParamField>
<ParamField path="--light-context" type="boolean">
  跳过工作区引导文件注入。
</ParamField>
<ParamField path="--tools" type="string">
  限制作业可使用的工具，例如 `--tools exec,read`。
</ParamField>

可运行工具的新作业始终会存储显式的工具策略。由 agent 创建的作业会被限制为该创建轮次可用的工具，且 agent 不能扩大已存储的列表。由已认证操作员在未指定 `--tools` 的情况下创建的作业会存储一个不受限制的 `*` 策略；`cron edit --clear-tools` 会恢复该显式的不受限制策略。早于显式工具策略存在的作业会保留其当前行为，直到其工具策略被显式编辑或作业被重新创建。

`--model` 会设置作业的主模型；它不会替换会话中的 `/model` 覆盖，因此已配置的回退链仍会叠加其上。无法解析或不被允许的模型会使运行以显式校验错误失败，而不会悄悄回退到默认值。如果某个作业有 `--model` 但没有显式或已配置的回退列表，OpenClaw 会传入一个空的回退覆盖，而不是悄悄把 agent 主模型追加为隐藏的重试目标。

孤立作业的模型选择优先级，从高到低：

1. 每个作业载荷的 `model`（显式配置；不允许的模型会使运行失败）
2. Gmail hook 模型覆盖（仅当运行来自 Gmail 且该覆盖被允许时）
3. 用户选择并存储的 cron-session 模型覆盖
4. agent/默认模型选择

快速模式遵循解析后的实时选择。如果所选模型配置包含 `params.fastMode`，isolated cron 会默认使用它；存储的 session `fastMode` 覆盖（然后是 agent 的 `fastModeDefault`）仍会在任一方向上优先于模型配置。自动模式使用模型的 `params.fastAutoOnSeconds` 截止值，默认是 60 秒。

如果某次运行触发了实时模型切换交接，cron 会使用切换后的提供方/模型重试，并为当前运行持久化该选择（以及任何新的认证配置）。重试次数有上限：在初始尝试之后最多再进行 2 次切换重试，之后 cron 会中止，而不是进入循环。

在孤立运行开始之前，OpenClaw 会检查配置了 `api: "ollama"` 和 `api: "openai-completions"` 且 `baseUrl` 为回环地址、私有网络或 `.local` 的提供方对应的可达本地端点。此预检会遍历作业已配置的回退链，只有在所有候选都不可达时才将运行标记为 `skipped`；`--fallbacks ""` 会让该遍历严格限定为仅主模型。某个端点宕机会将该运行记录为 `skipped` 并带有清晰的错误信息，而不是启动模型调用。该结果会按端点缓存 5 分钟（不是按作业或模型缓存），因此许多共享同一个失效本地 Ollama/vLLM/SGLang/LM Studio 服务器的到期作业，只需一次探测，而不会引发请求风暴。被跳过的预检运行不会增加执行错误退避；设置 `failureAlert.includeSkipped` 可选择接收重复的跳过告警。

### 命令载荷

命令载荷会在 Gateway 调度器内运行确定性脚本，而不会启动模型支持的轮次。它们在 Gateway 主机上执行，捕获 stdout/stderr，记录到 cron 历史中，并复用与代理轮次作业相同的 `announce`、`webhook` 和 `none` 投递模式。

<Note>
命令 cron 是运维管理员级别的 Gateway 自动化入口，而不是 agent 的 `tools.exec` 调用。创建、更新、删除或手动运行 cron 作业需要 `operator.admin`；后续计划的命令运行会在 Gateway 进程内作为该管理员编写的自动化执行。agent exec 策略（`tools.exec.mode`、审批提示、每个 agent 的工具白名单）管控的是对模型可见的 exec 工具，而不是命令 cron 载荷。
</Note>

```bash
openclaw cron create "*/15 * * * *" \
  --name "队列深度探测" \
  --command "scripts/check-queue.sh" \
  --command-cwd "/srv/app" \
  --announce \
  --channel telegram \
  --to "-1001234567890"
```

`--command <shell>` 会存储为 `argv: ["sh", "-lc", <shell>]`。使用 `--command-argv '["node","scripts/report.mjs"]'` 可进行精确的 argv 执行，而无需 shell 解析。可选的 `--command-env KEY=VALUE`（可重复）、`--command-input`、`--timeout-seconds`（默认 10 分钟）、`--no-output-timeout-seconds` 和 `--output-max-bytes` 用于控制进程环境、stdin 和输出边界。

发送的文本取自进程输出：非空 stdout 优先；如果 stdout 为空且 stderr 非空，则发送 stderr；如果两者都存在，cron 会发送一个简短的 `stdout:` / `stderr:` 块。退出码 `0` 会将运行记录为 `ok`；非零退出、信号、超时或无输出超时会记录为 `error`，并可能触发失败告警。若某个命令只打印 `NO_REPLY`，则会使用正常的 cron 静默令牌抑制机制，并且不会向聊天中回传任何内容。

### 脚本载荷

脚本载荷会以无头方式在与触发脚本相同的代码模式执行器中运行，而不会启动一次对话式代理轮次。在创建或运行它们之前，请启用 `cron.triggers.enabled`；这个危险自动化开关同时涵盖触发脚本和脚本载荷。脚本作业只支持 `main` 和 `isolated` 会话目标。

```bash
openclaw cron create "0 * * * *" \
  --name "每小时队列检查" \
  --script ./automation/check-queue.js \
  --script-timeout-seconds 300 \
  --script-tool-budget 50 \
  --session isolated \
  --announce
```

使用 `--script <file|->` 可从文件或 stdin 读取 JavaScript。超时默认是 300 秒，上限为 900；工具预算默认是 50 次调用，上限为 200。这些载荷预算与更小的触发门评估预算是分开的。

脚本可以返回一个包含以下可选字段的对象：

- `notify`: 通过作业的 `announce`、`webhook` 或 `none` 投递模式发送的文本。若省略，则不发送任何内容。对于 `main` 作业，该文本会变成一个系统事件。
- `wake`: `"now"` 会在入队 `notify`（或一个紧凑的完成事件）后立即请求一次 heartbeat；`"next-heartbeat"` 会将事件安排到下一次 heartbeat。
- `state`: JSON 状态，上限为 16 KB，且仅在成功运行后持久化。下一次运行会收到其冻结副本作为 `trigger.state`，与触发脚本一致。由于该命名空间只有一个持久化拥有者，因此脚本载荷不能与同一作业上的条件触发器组合使用。
- `nextCheck`: 例如 `"15m"` 这样的持续时间。它仅对启用了 pacing 的作业有效，并使用与代理轮次提议相同的 pacing 限制。

抛错、超时、工具预算耗尽、无效结果，以及在未启用 pacing 时出现的 `nextCheck`，都属于正常的 cron 运行错误：它们会进入运行历史、退避和失败告警处理，但不会持久化返回的状态。

## 执行样式

| 样式            | `--session` 值      | 运行位置                   | 最适合用于                     |
| --------------- | ------------------- | ------------------------ | ------------------------------- |
| 主会话         | `main`              | 专用 cron 唤醒通道        | 提醒、系统事件                  |
| 隔离会话       | `isolated`          | 专用 `cron:<jobId>`      | 报告、后台杂务                  |
| 当前会话       | `current`           | 在创建时绑定              | 上下文感知的周期性工作          |
| 自定义会话     | `session:custom-id` | 持久化的命名会话          | 基于历史记录构建的工作流        |

当创建请求携带会话上下文时，Agent-turn 作业默认使用创建它们的对话。没有会话键的调用方（包括未提供会话键的 CLI 和 API 调用方）会回退到 `isolated`。系统事件和心跳仍默认使用 `main`；命令和脚本负载仍默认使用 `isolated`。

<AccordionGroup>
  <Accordion title="主会话、隔离会话与自定义会话的区别">
    **主会话** 作业会将系统事件入队到 cron 所拥有的运行通道，并可选择唤醒 heartbeat（`--wake now` 或 `--wake next-heartbeat`）。它们可以使用目标主会话的最后一次交付上下文进行回复，但不会将常规 cron 回合追加到人工聊天通道，也不会延长目标会话的每日/空闲重置新鲜度。**隔离会话** 作业会在一个新的会话中运行专用的代理回合。**自定义会话**（`session:xxx`）会在多次运行之间持久化上下文，从而支持像每日站会这样基于先前摘要构建的工作流。

    Main-session cron events are self-contained system-event reminders. They do not automatically include the default heartbeat prompt or the heartbeat monitor scratch; say it explicitly in the cron event text if a reminder should consult that context.

  </Accordion>
  <Accordion title="隔离作业中的“新鲜会话”是什么意思">
    每次运行都会生成一个新的转录/会话 ID。OpenClaw 会保留安全偏好（thinking/fast/verbose 设置、标签、用户显式选择的模型/认证覆盖），但不会从旧的 cron 行中继承环境中的对话上下文：通道/组路由、发送或排队策略、提升权限、来源或 ACP 运行时绑定。当周期性作业需要有意沿用同一对话上下文时，请使用 `current` 或 `session:<id>`。
  </Accordion>
  <Accordion title="Unattended run contract">
    Isolated cron and hook agent turns are explicitly unattended: no one is present to clarify or approve. The final reply must be the deliverable rather than a plan, acknowledgement, or request for input. The agent returns `HEARTBEAT_OK` when nothing needs doing and states failures plainly; cron owns retry and failure-alert policy.

    For trusted scheduled jobs, the job's own instructions win when they intentionally ask for a question or plan, and the agent may remove a job that is no longer needed. External hook turns receive only the common unattended contract; they do not receive that override or self-removal guidance across the external-content boundary.

  </Accordion>
  <Accordion title="Subagent and Discord delivery">
    When isolated cron runs orchestrate subagents, delivery prefers the final descendant output over stale parent interim text. If descendants are still running, OpenClaw suppresses that partial parent update instead of announcing it.

    对于仅文本的 Discord 通知目标，OpenClaw 只发送一次规范化的最终助手文本，而不会同时回放流式/中间文本和最终答案。媒体和结构化 Discord 负载仍会单独交付，以确保附件和组件不会丢失。

  </Accordion>
</AccordionGroup>

## 交付与输出

| 模式       | 会发生什么                                                      |
| ---------- | ---------------------------------------------------------------- |
| `announce` | 如果代理没有发送，则回退将最终文本交付给目标                         |
| `webhook`  | 将完成事件载荷 POST 到一个 URL                                   |
| `none`     | 不进行运行器回退交付                                               |

使用 `--announce --channel telegram --to "-1001234567890"` 进行频道交付。对于 Telegram 论坛主题，请使用 `-1001234567890:topic:123`；OpenClaw 也接受 Telegram 所有的 `-1001234567890:123` 简写形式。直接的 RPC/config 调用者可以将 `delivery.threadId` 作为字符串或数字传入。Slack/Discord/Mattermost 目标使用显式前缀（`channel:<id>`、`user:<id>`）。Matrix 房间 ID 区分大小写；请使用准确的房间 ID，或使用 `room:!room:server` 形式。

当 announce 交付使用 `channel: "last"` 或省略 `channel` 时，诸如 `telegram:123` 这样的带提供方前缀的目标可以在 cron 回退到会话历史或单个已配置频道之前选择频道。只有加载的插件所声明的前缀才是提供方选择器。如果 `delivery.channel` 是显式指定的，则目标前缀必须指定同一提供方；`channel: "whatsapp"` 搭配 `to: "telegram:123"` 会被拒绝，而不是让 WhatsApp 将 Telegram ID 解释为电话号码。目标类型和服务前缀（`channel:<id>`、`user:<id>`、`imessage:<handle>`、`sms:<number>`）仍然是频道拥有的目标语法，而不是提供方选择器。

对于隔离作业，聊天交付是共享的：如果有可用的聊天路由，即使使用 `--no-deliver`，代理也可以使用 `message` 工具。如果代理发送到了已配置/当前目标，OpenClaw 会跳过回退 announce。否则，`announce`、`webhook` 和 `none` 只控制运行器在代理轮次结束后如何处理最终回复。

当代理从活动聊天创建一个隔离提醒时，OpenClaw 会为回退 announce 路由存储保留的实时交付目标。内部会话键可能是小写；当当前聊天上下文可用时，不会根据这些键重建提供方交付目标。

隐式 announce 交付会使用已配置的频道允许列表来验证并重定向过时目标。DM 配对存储中的批准不是回退自动化接收者；当计划作业应主动发送到某个 DM 时，请设置 `delivery.to` 或配置频道的 `allowFrom` 条目。

### 失败通知

失败通知遵循单独的目标路径：

- `cron.failureAlert` 上的目标字段（`mode`、`channel`、`to`、`accountId`）为失败通知设置全局默认值。已废弃的 `cron.failureDestination` 块会通过 `openclaw doctor --fix` 合并到其中。
- `job.delivery.failureDestination` 可按作业覆盖该设置。
- 如果两者都未设置且作业已经通过 `announce` 进行交付，则失败通知会回退到该主要 announce 目标。
- `delivery.failureDestination` 仅在 `sessionTarget="isolated"` 的作业上受支持，除非主要交付模式是 `webhook`。
- `failureAlert.includeSkipped: true` 会让作业或全局 cron 告警策略纳入重复的跳过运行告警。跳过运行会单独维护连续跳过计数，因此不会影响执行错误退避。
- `openclaw cron edit` 提供按作业的告警调优：`--failure-alert`/`--no-failure-alert`、`--failure-alert-after <n>`、`--failure-alert-channel`、`--failure-alert-to`、`--failure-alert-cooldown`、`--failure-alert-include-skipped`/`--failure-alert-exclude-skipped`、`--failure-alert-mode` 和 `--failure-alert-account-id`。

### 输出语言

Cron 作业不会根据频道、区域设置或之前的消息推断回复语言。请把语言规则写入定时消息或模板中：

```bash
openclaw cron edit <jobId> \
  --message "总结更新。请用中文回复；保留 URL、代码和产品名称不变。"
```

对于模板文件，请将语言说明保留在渲染后的提示中，并在作业运行前验证诸如 `{{language}}` 之类的占位符是否已填充。如果输出混杂多种语言，请明确说明规则，例如："叙述性文本使用中文，技术术语保留英文。"

## CLI 示例

<Tabs>
  <Tab title="一次性提醒">
    ```bash
    openclaw cron add \
      --name "日历检查" \
      --at "20m" \
      --session main \
      --system-event "下一次 heartbeat：检查日历。"
      --wake now
    ```
  </Tab>
  <Tab title="循环隔离作业">
    ```bash
    openclaw cron create "0 7 * * *" \
      "总结昨夜更新。" \
      --name "晨间简报" \
      --tz "America/Los_Angeles" \
      --session isolated \
      --announce \
      --channel slack \
      --to "channel:C1234567890"
    ```
  </Tab>
  <Tab title="模型与思考覆盖">
    ```bash
    openclaw cron add \
      --name "深度分析" \
      --cron "0 6 * * 1" \
      --tz "America/Los_Angeles" \
      --session isolated \
      --message "每周对项目进展进行深度分析。" \
      --model "opus" \
      --thinking high \
      --announce
    ```
  </Tab>
  <Tab title="Webhook 输出">
    ```bash
    openclaw cron create "0 18 * * 1-5" \
      "将今天的部署总结为 JSON。" \
      --name "部署摘要" \
      --webhook "https://example.invalid/openclaw/cron"
    ```
  </Tab>
  <Tab title="命令输出">
    ```bash
    openclaw cron create "*/15 * * * *" \
      --name "队列深度探测" \
      --command "scripts/check-queue.sh" \
      --command-cwd "/srv/app" \
      --announce \
      --channel telegram \
      --to "-1001234567890"
    ```
  </Tab>
</Tabs>

## 管理作业

```bash
# 列出已启用的作业
openclaw cron list

# 包括已禁用的作业
openclaw cron list --all

# 以 JSON 格式获取一个已存储的作业
openclaw cron get <jobId>

# 显示一个作业，包括已解析的投递路由
openclaw cron show <jobId>

# 启用/禁用而不删除
openclaw cron enable <jobId>
openclaw cron disable <jobId>

# 编辑作业
openclaw cron edit <jobId> --message "已更新的提示词" --model "opus"

# 立即强制运行作业
openclaw cron run <jobId>

# 立即强制运行作业，并等待其终态
openclaw cron run <jobId> --wait --wait-timeout 10m --poll-interval 2s

# 仅在到期时运行
openclaw cron run <jobId> --due

# 查看运行历史
openclaw cron runs --id <jobId> --limit 50

# 查看一次精确运行
openclaw cron runs --id <jobId> --run-id <runId>

# 删除作业
openclaw cron remove <jobId>

# Agent 选择（多 agent 设置）
openclaw cron create "0 6 * * *" "检查运维队列" --name "Ops sweep" --session isolated --agent ops
openclaw cron edit <jobId> --clear-agent
```

在归档一个会话时（Control UI 中，或由 operator-admin 调用者执行 `sessions.patch { archived: true }`），会禁用所有绑定到该会话且已启用的 cron 作业：其隔离的 `cron:<jobId>` 会话、一个 `session:<key>` 目标，或一个 delivery/wake `sessionKey` 通道。恢复该会话不会重新启用这些作业；请使用 `openclaw cron enable <jobId>`。在 Control UI 侧边栏中，绑定了已启用作业的会话会显示一个时钟徽标。

`openclaw cron run <jobId>` 在将手动运行入队后返回。对于关闭钩子、维护脚本或其他必须阻塞直到队列中的运行完成的自动化，请使用 `--wait`；它会轮询返回的 `runId`（默认超时时间 `10m`，轮询间隔 `2s`），并在状态为 `ok` 时以 `0` 退出，在 `error`、`skipped` 或等待超时时以非零退出。

agent `cron` 工具从 `cron(action: "list")` 返回紧凑的作业摘要（`id`、`name`、`enabled`、`nextRunAtMs`、`scheduleKind`、`lastRunStatus`）；要获取单个完整作业定义，请使用 `cron(action: "get", jobId: "...")`。直接 Gateway 调用者可以向 `cron.list` 传递 `compact: true`；省略它则会保留带有投递预览的完整响应。

`openclaw cron create` 是 `openclaw cron add` 的别名。新作业可以使用位置参数形式的计划（`"0 9 * * 1"`、`"every 1h"`、`"20m"`，或一个 ISO 时间戳），后跟一个位置参数形式的 agent 提示词。对 `cron add|create` 或 `cron edit` 使用 `--webhook <url>` 可将完成的运行负载 POST 到一个 HTTP 端点；webhook 投递不能与聊天投递标志（`--announce`、`--channel`、`--to`、`--thread-id`、`--account`）组合使用。在 `cron edit` 中，`--clear-channel`、`--clear-to`、`--clear-thread-id` 和 `--clear-account` 会分别取消设置这些路由字段（每个都不能与其对应的 set 标志同时使用）——这与 `--no-deliver` 不同，后者只会禁用运行器回退投递。

<Note>
模型覆盖说明：

- `openclaw cron add|edit --model ...` 会更改作业选定的模型。
- 如果该模型被允许，则该确切的 provider/model 会传递到隔离的 agent 运行中。
- 如果它不被允许或无法解析，cron 会以明确的验证错误使运行失败。
- API `cron.update` 负载补丁可以设置 `model: null` 来清除已存储的作业模型覆盖。
- `openclaw cron edit <job-id> --clear-model` 会通过 CLI 清除该覆盖（与 `model: null` 补丁效果相同），且不能与 `--model` 组合使用。
- 配置的回退链仍然适用，因为 cron 的 `--model` 是作业主模型，而不是会话的 `/model` 覆盖。
- `openclaw cron add|edit --fallbacks ...` 会设置负载 `fallbacks`，并替换该作业已配置的回退；`--fallbacks ""` 会禁用回退并使运行严格化。`openclaw cron edit <job-id> --clear-fallbacks` 会清除按作业级别的覆盖。
- 仅使用 `--model`，且没有显式或已配置的回退列表时，不会静默地回退到 agent 主模型作为额外的重试目标。

</Note>

## Webhooks

Gateway 可以为外部触发器暴露 HTTP webhook 端点。在配置中启用：

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
  },
}
```

### 认证

每个请求都必须通过请求头包含 hook token：

- `Authorization: Bearer <token>`（推荐）
- `x-openclaw-token: <token>`

查询字符串 token 会被拒绝。

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    为主会话入队一个系统事件：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/wake \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"text":"Received a new email","mode":"now"}'
    ```

    <ParamField path="text" type="string" required>
      事件描述。
    </ParamField>
    <ParamField path="mode" type="string" default="now">
      `now` 或 `next-heartbeat`。
    </ParamField>

  </Accordion>
  <Accordion title="POST /hooks/agent">
    运行一个隔离的代理轮次：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/agent \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"message":"Summarize the inbox","name":"Email","model":"openai/gpt-5.6-sol"}'
    ```

    字段：`message`（必填）、`name`、`agentId`、`sessionKey`（需要 `hooks.allowRequestSessionKey=true`）、`idempotencyKey`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`thinking`、`timeoutSeconds`。

  </Accordion>
  <Accordion title="Mapped hooks (POST /hooks/<name>)">
    自定义 hook 名称会通过配置中的 `hooks.mappings` 进行解析。映射可以使用模板或代码转换，将任意载荷转换为 `wake` 或 `agent` 操作。
  </Accordion>
</AccordionGroup>

<Warning>
将 hook 端点置于 loopback、tailnet 或受信任的反向代理之后。

- 使用专用的 hook token；不要重复使用 Gateway 认证 token。
- 将 `hooks.path` 保持在专用子路径下；`/` 会被拒绝。
- 设置 `hooks.allowedAgentIds` 以限制 hook 可针对的有效 agent，包括在省略 `agentId` 时的默认 agent。
- 除非你确实需要调用者选择会话，否则请保持 `hooks.allowRequestSessionKey=false`。
- 如果启用 `hooks.allowRequestSessionKey`，还要设置 `hooks.allowedSessionKeyPrefixes` 来约束允许的会话键形状。
- 默认情况下，hook 载荷会被安全边界包装。

</Warning>

## Gmail PubSub 集成

通过 Google PubSub 将 Gmail 收件箱触发器连接到 OpenClaw。

<Note>
**前置条件：** `gcloud` CLI、`gog`（gogcli）、已启用的 OpenClaw hooks、用于公共 HTTPS 端点的 Tailscale。
</Note>

### 向导设置（推荐）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

这将写入 `hooks.gmail` 配置，启用 Gmail 预设，并默认使用 Tailscale Funnel 作为推送端点（`--tailscale funnel|serve|off`）。

<Warning>
Gmail 预设的按消息会话会分离对话上下文；它不会限制目标代理的工具或工作区。若没有设置 `agentId` 的自定义映射，Gmail hooks 会作为默认代理运行。

对于不受信任的收件箱，请将 hook 路由到专用的读取代理，为该代理提供只读或无工作区访问权限，并禁用文件系统写入、shell、浏览器及其他不必要的工具。如果它需要通知主代理，则只允许所需的 agent-to-agent 交接。参见 [Prompt injection](/gateway/security#prompt-injection)、[Multi-agent sandbox and tools](/tools/multi-agent-sandbox-tools) 和 [`tools.agentToAgent`](/gateway/config-tools#toolsagenttoagent)。
</Warning>

### Gateway 自动启动

当 `hooks.enabled=true` 且设置了 `hooks.gmail.account` 时，Gateway 会在启动时运行 `gog gmail watch serve` 并自动续订 watch。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可选择退出。

### 手动一次性设置

<Steps>
  <Step title="选择 GCP 项目">
    选择拥有 `gog` 使用的 OAuth 客户端的 GCP 项目：

    ```bash
    gcloud auth login
    gcloud config set project <project-id>
    gcloud services enable gmail.googleapis.com pubsub.googleapis.com
    ```

  </Step>
  <Step title="创建 topic 并授予 Gmail 推送访问权限">
    ```bash
    gcloud pubsub topics create gog-gmail-watch
    gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
      --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
      --role=roles/pubsub.publisher
    ```
  </Step>
  <Step title="启动 watch">
    ```bash
    gog gmail watch start \
      --account openclaw@gmail.com \
      --label INBOX \
      --topic projects/<project-id>/topics/gog-gmail-watch
    ```
  </Step>
</Steps>

### Gmail 模型覆盖

```json5
{
  hooks: {
    gmail: {
      model: "openai/gpt-5.6-sol",
      thinking: "high",
    },
  },
}
```

对于不受信任的收件箱，请使用你提供商可用的最新一代、最高档模型。上面的值只是示例；该模型必须存在于你配置的目录和允许列表中。

## 配置

```json5
{
  cron: {
    enabled: true,
    store: "~/.openclaw/cron/jobs.json",
    triggers: {
      enabled: false,
    },
    webhookToken: "replace-with-dedicated-webhook-token",
    sessionRetention: "24h",
  },
}
```

`webhookToken` 会作为 `Authorization: Bearer <token>` 在 cron webhook 的 POST 请求中发送。

`cron.store` 是逻辑存储键和 doctor 迁移路径，不是一个可直接手工编辑的实时 JSON 文件。作业数据存放在 SQLite 中；请使用 CLI 或 Gateway API 进行更改。

禁用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion title="Retry behavior">
    **一次性重试**：临时错误（速率限制、过载、网络、超时、服务器错误）会使用内置重试计划。永久性错误会立即禁用该作业。

    **周期性重试**：连续执行错误会按扩展后的计划退避（30s、60s、5m、15m、60m）。在下一次成功运行后，退避计时会重置。

  </Accordion>
  <Accordion title="维护">
    `cron.sessionRetention`（默认 `24h`，`false` 可禁用）会清理隔离的运行会话条目。运行历史会为每个作业保留最新的 2000 条终态记录；丢失的记录仍保留其 24 小时的清理窗口。
  </Accordion>
  <Accordion title="旧存储迁移">
    升级后，请运行 `openclaw doctor --fix`，将旧的 `~/.openclaw/cron/jobs.json`、`jobs-state.json` 和 `runs/*.jsonl` 文件导入 SQLite，并将它们重命名为带有 `.migrated` 后缀的文件。格式异常的作业行会从运行时中跳过，并复制到 `jobs-quarantine.json` 以便后续修复或审查。
  </Accordion>
</AccordionGroup>

## 故障排除

### 命令序列

```bash
openclaw status
openclaw gateway status
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
openclaw doctor
```

<AccordionGroup>
  <Accordion title="Cron 未触发">
    - 检查 `cron.enabled` 和 `OPENCLAW_SKIP_CRON` 环境变量。
    - 确认 Gateway 正在持续运行。
    - 对于 `cron` 调度，请验证时区（`--tz`）与主机时区是否一致。
    - 运行输出中的 `reason: not-due` 表示手动运行是通过 `openclaw cron run <jobId> --due` 检查的，而该任务当时尚未到期。

  </Accordion>
  <Accordion title="Cron 已触发但未投递">
    - 传递模式 `none` 表示不期望有 runner 回退发送。只要存在聊天路由，agent 仍然可以使用 `message` 工具直接发送。
    - 缺少或无效的传递目标（`channel`/`to`）表示已跳过外发。
    - 对于 Matrix，复制的或旧版任务如果使用了小写的 `delivery.to` room ID 可能会失败，因为 Matrix room ID 区分大小写。请将任务编辑为 Matrix 中精确的 `!room:server` 或 `room:!room:server` 值。
    - Channel 认证错误（`unauthorized`、`Forbidden`）表示发送因凭据被阻止。
    - 如果隔离运行只返回静默令牌（`NO_REPLY` / `no_reply`），OpenClaw 会抑制直接外发以及回退的队列摘要路径，因此不会有任何内容回发到聊天中。
    - 如果 agent 应该自己向用户发送消息，请检查该任务是否具有可用路由（`channel: "last"` 且之前有聊天，或显式的 channel/target）。

  </Accordion>
  <Accordion title="Cron 或心跳似乎阻止了 /new-style 轮转">
    - 每日和空闲重置的新鲜度不基于 `updatedAt`；参见 [会话管理](/concepts/session#session-lifecycle)。
    - Cron 唤醒、heartbeat 运行、exec 通知以及 gateway 记账可能会更新会话行用于路由/状态，但它们不会延长 `sessionStartedAt` 或 `lastInteractionAt`。
    - 对于在这些字段存在之前创建的旧版记录，如果转录 JSONL 的会话头仍然可用，OpenClaw 可以从中恢复 `sessionStartedAt`。没有 `lastInteractionAt` 的旧版空闲记录会使用恢复出的开始时间作为其空闲基准。

  </Accordion>
  <Accordion title="时区注意事项">
    - 不带 `--tz` 的 Cron 使用 gateway 主机时区。
    - 不带时区的 `at` 调度将被视为 UTC。
    - Heartbeat 的 `activeHours` 使用已配置的时区解析。

  </Accordion>
</AccordionGroup>

## 相关内容

- [自动化](/automation) — 一览所有自动化机制
- [后台任务](/automation/tasks) — cron 执行的任务账本
- [心跳](/gateway/heartbeat) — 周期性的主会话轮次
- [时区](/concepts/timezone) — 时区配置
