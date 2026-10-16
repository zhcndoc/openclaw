---
summary: "`openclaw automations` 的 CLI 参考（安排和运行后台作业）"
read_when:
  - "需要安排作业和唤醒任务"
  - "正在调试自动化执行和日志"
title: "自动化（cron）"
---

# `openclaw automations`

管理网关调度程序的自动化作业。该命令注册为 `openclaw cron`，并使用 `openclaw automations` 作为别名。下面的每个子命令都适用于任一拼写。

<Tip>
运行 `openclaw automations --help` 查看完整的命令列表。有关概念指南，请参阅[自动化](/automation/cron-jobs)。
</Tip>

<Note>
所有自动化突变（`add`/`create`、`edit`、`remove`、`run`）都需要 `operator.admin`。 Command-payload运行时直接在Gateway进程中执行，而不是作为代理`tools.exec`工具调用。 `tools.exec.*` 和执行批准仍然管理模型可见的执行工具。
</Note>

每个自动化子命令都接受共享网关连接选项。使用 `--port <port>` 作为非默认本地端口上的网关，或使用 `--url <url>` 作为显式 WebSocket URL。不要将它们结合起来。 `--port`、`--url` 和 `--token` 等连接选项可能出现在子命令之前或之后。

自动化命令需要正在运行的网关。通过令牌、密码或 `none` 身份验证，对配置的本地环回网关的调用不会打开共享状态数据库以进行设备身份验证。远程和显式 URL 目标保留其设备身份验证和配对要求。

## <a id="create-jobs-quickly"></a> 快速创建作业

`openclaw automations create` 是 `openclaw automations add` 的别名。对于新作业，请先填写调度计划，再填写提示词：

```bash
openclaw automations create "0 7 * * *" \
  "Summarize overnight updates." \
  --name "Morning brief" \
  --agent ops
```

对于代理或命令作业，`--timeout-seconds` 接受非负整秒。在 `add`/`create` 或 `edit` 上设置 `--timeout-seconds 0` 以禁用调度程序的挂钟上限。在创建时省略标志会保留默认超时；在编辑时省略它会使存储的超时保持不变。 Agent/provider 超时、启动看门狗和命令运行程序限制仍然适用。系统事件作业拒绝 `--timeout-seconds`；脚本作业改为使用 `--script-timeout-seconds`。

当作业需要向 webhook POST 完成后的负载，而不是投递到聊天目标时，请使用 `--webhook <url>`：

```bash
openclaw automations create "0 18 * * 1-5" \
  "Summarize today's deploys as JSON." \
  --name "Deploy digest" \
  --webhook "https://example.invalid/openclaw/cron"
```

使用 `--command` 进行基于脚本的 shell 式作业，这些作业在 OpenClaw 调度程序内运行，而无需启动隔离的 agent/model 运行：

```bash
openclaw automations create "*/15 * * * *" \
  --name "Queue depth check" \
  --command "scripts/check-queue.sh" \
  --command-cwd "/srv/app" \
  --announce \
  --channel telegram \
  --to "-1001234567890"
```

`--command <shell>` 会存储为 `argv: ["sh", "-lc", <shell>]`。如需精确的 argv 执行，请使用 `--command-argv '["node","scripts/report.mjs"]'`。命令作业会捕获 stdout/stderr，记录常规运行历史，并通过与隔离作业相同的 `announce`、`webhook` 或 `none` 投递模式路由输出。仅打印 `NO_REPLY` 的命令会被抑制。

当列表和详细视图应显示与自动化的稳定名称不同的人类可读标签时，请使用 `--display-name <name>`。使用 `automations add|edit --display-name` 设置或更新该标签。使用 `automations edit <job-id> --clear-display-name` 删除标签并恢复列表和详细视图中的稳定名称。设置和清除选项不能组合。

## <a id="schedule-types"></a> 计划类型

对于位置间隔计划，请使用 `every <duration>`，例如 `"every 10m"`。不支持`"every day at 9am sharp"`等自然语言时间表；请改用 `"0 9 * * *"`。 CLI 使用提供的表达式和有效语法示例拒绝无效的 cron 表达式。

作为位置创建语法的替代方法，`automations add|create` 接受这些调度标志之一。 `automations edit` 使用相同的标志来替换作业的计划：

- `--at <when>` 从 ISO 时间戳或持续时间（例如 `20m`）安排一次运行。无偏移时间戳使用 UTC，除非提供了 `--tz <iana>`。
- `--every <duration>` 设置重复间隔，例如 `10m`、`1h` 或 `1d`。
- `--cron <expression>` 设置五个或六个字段的 cron 计划。使用 `--tz <iana>` 作为评估时区，使用 `--exact` 禁用交错，或使用 `--stagger <duration>` 设置交错窗口。
- `--on-exit <shell>` 启动监视命令并在退出时触发作业一次。 `--on-exit-cwd <path>` 设置该命令的工作目录并需要 `--on-exit`。
- `--stream-command <json>` 采用非空 JSON 非空字符串数组作为受监督的长期命令的参数，并从其批处理输出中触发作业。 `--stream-cwd <path>` 设置源的工作目录。 `--stream-mode line|match` 选择每一行或仅选择匹配的行。匹配模式需要`--stream-match <regex>`，在线模式下无效。 `--stream-batch-ms <n>` 设置安静窗口延迟（以毫秒为单位），`--stream-max-batch-bytes <n>` 设置每批的最大 UTF-8 字节。

`--tz` 适用于 cron 计划和无偏移 `--at` 时间戳，而 `--exact` 和 `--stagger` 仅适用于 cron 计划。这三个标志对于退出或流调度都无效。有关流生命周期、批处理限制和触发器详细信息，请参阅 [ 自动化计划](/automation/cron-jobs/schedules#schedule-types)。

创建时，省略 `--command-cwd`、`--on-exit-cwd` 或 `--stream-cwd` 以使用默认工作目录。显式为空或仅包含空格的路径是错误的。编辑流作业时，`--stream-cwd ""` 仍会清除其配置的工作目录。

## <a id="sessions"></a> 会话

`--session` 接受 `main`、`isolated`、`current` 或 `session:<id>`。

Agent-turn 作业在可用会话上下文时，默认使用创建它们的对话。若没有会话键，包括普通 CLI 调用和省略该参数的 API 调用，目标都会回退为 `isolated`。

从对话创建的隔离代理轮流作业也会捕获该对话的生成以进行交付。使用 `announce` 并且没有显式或记住的外部路由，其最终结果将提交到该对话中，同时运行保持隔离。没有创建会话的普通 CLI 作业仍然需要可解析的通道路由、webhook 传递或 `--no-deliver`。

<AccordionGroup>
  <Accordion id="session-keys" title="会话密钥">
    - `main` 绑定到代理的主会话。
    - `isolated` 为每次运行创建一个新的转录和会话 id。
    - `current` 绑定到创建时的活动会话。
    - `session:<id>` 固定到一个显式的持久会话键。

  </Accordion>
  <Accordion id="isolated-session-semantics" title="隔离会话语义">
    隔离运行会重置环境对话上下文。为新运行重置通道和组路由、send/queue 策略、海拔、原点和 ACP 运行时绑定。安全首选项和明确的用户选择模型或身份验证覆盖可以跨运行进行。
  </Accordion>
</AccordionGroup>

当操作员删除具有活动运行的自动化时，OpenClaw 请求取消该运行。承认的自动化可以删除自己的作业，而无需取消活动运行。如果无法确认调用者是作业的确切实时运行，则自删除会失败，而不会删除作业或取消活动运行。当请求取消时，JSON 删除响应包括 `activeRunCancellationRequested: true`。对于隔离的自动化，可重用会话清理然后等待活动运行停止并报告 `sessionCleanup: "pending"`，同时清理被推迟。运行历史记录被保留。

如果会话清理失败，则会记录该错误。没有活动运行的删除也会将清理错误返回给调用者。使用 `openclaw sessions list --json` 查找剩余会话，然后使用 `openclaw sessions delete <key> --yes` 在网关或工作线程恢复后重试清理。

## <a id="delivery"></a> 投递

`openclaw automations add`、`openclaw automations list` 和 `openclaw automations show <job-id>` 预览已解析的传送路线。对于 `channel: "last"`，预览显示对话提交、已解析的通道路由或传送被阻止的原因。

如果无法读取现有会话元数据存储或其架构尚未准备好，预览将保留请求的目标并报告其不可用的原因，而不会阻止作业创建或列出。不存在的数据库没有会话路由历史记录，并使用正常的传递回退。

提供者前缀的目标可以消除未解析的公告通道的歧义。例如，当省略 `delivery.channel` 或 `last` 时，`to: "telegram:123"` 选择 Telegram。只有加载的插件公布的前缀才是提供者选择器。如果 `delivery.channel` 是显式的，则前缀必须与该通道匹配。 `channel: "whatsapp"` 和 `to: "telegram:123"` 被拒绝。 `imessage:` 和 `sms:` 等服务前缀仍然是通道拥有的目标语法。

<Note>
孤立的 `automations add` 作业默认为 `--announce` 交付。使用 `--no-deliver` 将输出保持在内部。 `--deliver` 仍然是 `--announce` 的已弃用别名，它在 2026.2.3. 中取代了它
</Note>

### <a id="delivery-ownership"></a> 投递所有权

隔离的自动化聊天投递由代理和运行器共同负责：

- 当可用聊天路由时，代理可以使用 `message` 工具直接发送。
- `announce` 发送最终结果，除非已验证的匹配发送已这样做，然后将确认的发送添加到目标聊天的记录中。
- `webhook` 会将完成后的负载发布到一个 URL。
- `none` 禁用自动对话结果和外部通知。

代理、命令和脚本结果属于接收它们的聊天或主题。显式不同的目标获取结果而不是创建会话，包括 CLI 和没有创建会话的旧作业。如果没有外部路由，则创建会话接收它； WebChat 在实时和重新加载后显示相同的消息。重试不会重复结果。重置显式配置的外部目标不会停止传递：结果进入其当前会话。如果创建的对话被删除或重置，则隐式座席轮流公告和无路由 WebChat 结果将失败；重新创建作业或设置明确的外部交付坐标。命令和脚本公告保留已解析的路由，而无需像以前一样进行源生成检查。已确认的外部发送仍保持已传递状态，如果对话写入失败，则会发出警告。请参见 [ 自动化交付 ](/automation/cron-jobs/delivery)。

使用 `automations add|create --webhook <url>` 或 `automations edit <job-id> --webhook <url>` 来设置 webhook 投递。不要将 `--webhook` 与 `--announce`、`--no-deliver`、`--channel`、`--to`、`--thread-id` 或 `--account` 等聊天投递标志结合使用。

`automations edit <job-id>` 可以使用 `--clear-channel`、`--clear-to`、`--clear-thread-id` 和 `--clear-account` 取消设置各个传递路由字段（每个字段在与其匹配的设置标志组合时都会被拒绝）。与禁用自动结果和通知的 `--no-deliver` 不同，这些会删除存储的字段，以便作业再次从默认值解析其路由的该部分。

`--announce` 启用对话结果和通知流。当聊天路由可用时，`--no-deliver` 会禁用该自动流，但不会删除代理的 `message` 工具。

从活动聊天创建的提醒会保留实时聊天传送目标以进行通知传送。内部会话密钥可以是小写的。请勿将它们用作区分大小写的提供商 ID（例如 Matrix 房间 ID）的真实来源。

### <a id="failure-delivery"></a> 失败投递

失败通知按以下顺序解析：

1. 作业的 `failureAlert` 对象中的 Route 字段。
2. `delivery.failureDestination` 正在作业，分层覆盖 `cron.failureAlert` 上的全局目标字段（`mode`、`channel`、`to`、`accountId`）。 `cron.failureDestination` 块在 2026.8.1 中退役，并由 `openclaw doctor --fix` 合并到其中。
3. 作业的主 announce 目标（当以上两者都无法解析为具体目标时）。

具有这些路由之一的作业在连续 2 次失败和 1 小时冷却后默认会发出执行失败警报。每个作业或全局 `failureAlert` 对象显式 activates/tunes 策略，即使没有现有路由。 `failureAlert: false` 禁用作业的执行和所需交付失败警报，但不禁用自动禁用安全通知。全局 `enabled: false` 禁用继承，除非作业有自己的 `failureAlert` 对象。 `delivery.bestEffort: true` 抑制 inherited/default 执行警报，但不是显式的每作业策略。终端一次性故障绕过 `after`：符合条件的自有作业在其所有者对话中收到修复轮次，其他作业使用已启用的故障警报路由，而没有该路由的作业会收到自动禁用安全通知。运营商取消和因网关重启而退出的运行保持安静。

网关重新启动后，具有相同原因的重复故障仍会归为一个事件。原因或目标发生变化可以在冷却后通知。成功完成，事件悄然清除；复苏留在了自动化的历史中。跳过运行和未知的交付结果不算作恢复。如果脚本安装程序在插件重新加载后无法刷新工具，则警报会解释在脚本运行之前自动恢复失败。

<Note>
当主要传送模式为 `webhook` 时，主会话作业只能使用 `delivery.failureDestination`。孤立的作业以所有模式接受它。
</Note>

聊天失败通知会包含运行开始时间，时间采用代理配置的用户时区。Webhook 消息文本保持稳定，并通过 `runAtMs` 暴露该时间点。

隔离的自动化运行将运行级别代理故障视为作业错误，即使没有生成回复负载也是如此。模型和提供程序故障仍然会增加错误计数器并触发故障通知。

命令作业不会启动孤立的代理轮次。零退出代码记录 `ok`。非零退出、有信号、超时或无输出超时记录`error`，并且可以触发相同的故障通知路径。

所需的完成交付是单独的：`status: "ok"` 和 `completionStatus: "failed"` 不会增加执行次数或退避。交付失败警报使用已解决的备用故障目标，无需 `after` 阈值，并将重复的故障分组为一个事件。更改失败的警报遵循共享 job/global `failureAlert.cooldownMs`（默认 1 小时），包括执行警报后的第一次传送失败。警报绝不会重试刚刚失败的主路由。

当代理轮转成功时，未解决的公告目标（例如，未配置的通道）是仅传递失败。它的报告仍然存在于运行历史中；在再次运行作业之前配置目标。

如果隔离运行在第一个模型请求之前超时，则 `openclaw automations show` 和 `openclaw automations runs` 会包含特定于阶段的错误。示例包括 `setup timed out before runner start`，或命名最后已知启动阶段的停顿消息，例如 `context-engine`。对于 CLI- 支持的提供商，预模型看门狗保持活动状态，直到外部 CLI 轮开始。因此，会话查找、挂钩、身份验证、提示和 CLI 设置停顿被报告为模型前自动化故障。

## <a id="scheduling"></a> 调度

### <a id="one-shot-jobs"></a> 一次性作业

`--at <datetime>` 会调度一次性运行。没有偏移量的 datetime 会被视为 UTC，除非你同时传入 `--tz <iana>`，此时会按给定时区解释墙上时钟时间。

保存作业之前会拒绝无效的 `--tz` 值；使用 IANA 时区，例如 `America/New_York`。夏令时转换期间无效的时间戳和不存在的本地时间将单独报告为 `--at` 错误。

<Note>
一次性作业仅在 `completionStatus: "succeeded"` 之后删除。必需的交付失败或未知的完成会使作业处于禁用状态，并且无法下次运行，因此重新启动不会重播有效负载副作用。故意沉默并通过显式 `delivery.bestEffort: true` 成功执行，正常完成并删除。使用 `--keep-after-run` 也可以保留成功的工作。
</Note>

`at` 作业在发生永久错误或用尽重试后记录终端执行失败。由其观察程序触发的 `on-exit` 作业在任何执行错误（包括瞬态错误）时都会终止，因为重试将重新运行所监视的命令。这些故障记录为 `state.autoDisabled`，并由 `openclaw doctor` 报告。手动强制运行暂停的 `on-exit` 作业可保留其暂停状态，而不记录自动禁用。

### <a id="recurring-jobs"></a> 循环作业

配置的间隔和交错窗口在人类可读的输出中保留毫秒精度：`--every 90s` 显示为 `every 1m 30s`，`--stagger 1001ms` 显示为 `stagger 1s 1ms`。当列表列被截断时，在整个持续时间内使用 `automations show <job-id>`。相对的下次运行和上次运行标签保持四舍五入。

重复作业在连续错误后使用指数重试退避：30s、1m、5m、15m、60m。下次成功运行后，计划将恢复正常。

对于提供商网络故障、请求超时、过载、速率限制和服务器错误（不是作业自己的执行超时），调度程序首先在 30 秒、1 分钟和 5 分钟后重新运行作业（或者在下一次计划运行时更早），并保留故障警报和所有者修复请求，直到这些重新运行也失败。

跳过的运行会与执行错误分开跟踪。它们不会影响重试退避，但可以使用 `openclaw automations edit <job-id> --failure-alert-include-skipped`，将失败提醒设置为包含重复的跳过运行通知。

本地配置的模型提供程序在环回、专用网络或 `.local` 上有一个基础 URL。对于以此类提供程序为目标的隔离作业，调度程序会在启动代理轮流之前运行轻量级提供程序预检。调度程序检查 `/api/tags` 处的 `api: "ollama"` 提供程序。它检查 `/models` 处的其他本地 OpenAI- 兼容提供程序（`api: "openai-completions"`，例如 vLLM、SGLang 和 LM Studio）。如果端点无法访问，调度程序会将运行记录为 `skipped`，并在稍后的计划中重试。它将每个端点的可达性结果缓存 5 分钟，因此针对同一本地服务器的许多作业不会发送重复的检查。

自动化作业、挂起的运行时状态和运行历史记录位于共享的 SQLite 状态数据库中。它在 2026.6.1 中替换的文件存储已停用。如果仍有 `jobs.json`、`<name>-state.json` 或 `runs/*.jsonl` 文件，请先安装 OpenClaw `2026.9.7` 并运行 `openclaw doctor --fix`，然后再升级到最新版本。 Current Doctor 保留这些文件并报告中间升级要求。受支持的 `jobs-quarantine.json` sidecar 仍会以 `.migrated` 后缀导入和存档。使用 `openclaw automations add|edit|remove` 编辑计划，而不是编辑 JSON 文件。

### <a id="manual-runs"></a> 手动运行

手动运行已禁用的作业不会启用其计划或创建自动重试。使用 `openclaw automations enable <job-id>` 恢复计划的运行。

`openclaw automations run <job-id>` 默认情况下强制运行，并在网关持久保留运行并将其接受到其执行通道后返回。成功响应包括 `{ ok: true, enqueued: true, runId }`；该作业可能仍在等待槽位。如果在队列接受之前准入或调用者检查失败，则请求将失败，且不会报告排队运行。如果网关在调度之前退出，则启动会在状态数据库中记录该确切请求的中断接收。此类预调度中断不会出现在已执行的运行历史记录中。使用返回的 `runId` 检查执行的运行结果：

```bash
openclaw automations run <job-id>
openclaw automations runs <job-id> --run-id <run-id>
```

强制运行会跳过作业的 `trigger.script` 条件门并直接执行有效负载。因此，即使门返回 `fire: false`，`agentTurn` 有效负载也会唤醒模型。当用 `action: "run", runMode: "force"` 调用时，`automations` 工具也会跳过门；默认`runMode`是`"due"`。

当脚本需要阻塞，直到该精确排队运行记录到终态时，添加 `--wait`：

```bash
openclaw automations run <job-id> --wait --wait-timeout 10m --poll-interval 2s
```

对于 `--wait`，CLI 首先调用 `cron.run`，然后轮询持久 `cron.runs` 行以获取返回的 `runId`。它不会重新读取可变的作业交付设置。 JSON 将有效负载执行报告为 `status`，将整个运行完成报告为 `completionStatus`。该命令仅针对 `completionStatus: "succeeded"` 退出 `0`。 `failed`、`unknown`、执行错误或跳过、缺失 `runId` 以及超时退出非零（默认 `10m`，默认情况下轮询每个 `2s`）。 `--poll-interval` 必须大于零。完整的 JSON 输出（包括运行摘要）会在命令退出之前刷新，因此可以通过管道传输到 JSON 读取器。

<Note>
当作业当前到期时，使用 `--due` 测试条件门，或等待其计划的评估。与强制运行不同，`--due` 尊重 `trigger.script`；它不会让工作提前到期。如果 `--due --wait` 未将运行排队，该命令将返回正常的非运行响应而不是轮询。门跳过的排队运行以非零值 `--wait` 退出。
</Note>

## <a id="models"></a> 模型

`automations add|edit --model <ref>` 为作业选择允许的模型。 `automations add|edit --fallbacks <list>` 设置每个作业的后备模型，例如 `--fallbacks openrouter/gpt-4.1-mini,openai/gpt-5`。通过 `--fallbacks ""` 进行严格运行，没有后退。 `automations edit <job-id> --clear-fallbacks` 删除了每个作业的回退覆盖。 `automations edit <job-id> --clear-model` 删除了每个作业模型覆盖。然后，作业遵循正常的自动化模型选择优先级：存储的自动化会话覆盖（如果存在），否则为代理或默认模型。您不能将其与 `--model` 结合使用。 `automations add|edit --thinking <level>` 设置每个作业的思维覆盖。 `automations edit <job-id> --clear-thinking` 将其删除，因此该作业遵循正常的自动化思维优先顺序。您不能将其与 `--thinking` 结合使用。

<Warning>
如果模型不允许或无法解析，调度程序将导致运行失败并显示显式验证错误。它不会回退到作业的代理或默认模型选择。
</Warning>

自动化的 `--model` 是**作业主模型**，而不是聊天会话的 `/model` 覆盖。这意味着：

- 当所选作业模型失败时，已配置的模型备用列表仍会生效。
- 存在每个作业的 payload `fallbacks` 时，它会替换已配置的备用模型列表。
- 空的每个作业备用模型列表（`--fallbacks ""` 或作业 payload/API 中的 `fallbacks: []`）会使本次运行进入严格模式。
- 当作业具有 `--model` 但未配置回退列表时，OpenClaw 会传递显式空回退覆盖。因此，主要代理不会作为隐藏重试目标附加。
- 本地提供方的预检会遍历已配置的备用模型，然后再将运行标记为 `skipped`。

当每个本地提供商均无法访问时，`automations runs` 和 `automations show` 保留跳过状态和预检原因。启动提供程序或更正其配置的端点。重复预检跳过使用现有的故障警报路径和阈值，无需 `failureAlert.includeSkipped`，同时明确的警报选择退出仍然适用。重复性作业保持启用状态，并在再次检查可达性后恢复稍后计划的运行；端点结果最多缓存五分钟。

`openclaw doctor` 会报告那些已经设置了 `payload.model` 的作业，包括提供方命名空间计数以及与 `agents.defaults.model` 的不匹配情况。当认证、提供方或计费行为在实时聊天和计划任务之间看起来不同时，请使用该检查。

### <a id="isolated-automation-model-precedence"></a> 隔离自动化模型优先级

隔离的自动化运行按以下顺序解析活动模型：

1. Gmail 钩子覆盖。
2. 每个作业的 `--model`。
3. 已存储的自动化会话模型覆盖（用户选择了模型时）。
4. 代理或默认模型选择。

### <a id="fast-mode"></a> 快速模式

隔离自动化快速模式遵循解析后的实时模型选择。它依次解析已存储会话的 `fastMode`、每个代理的 `agents.entries.*.fastModeDefault`、全局的 `agents.defaults.fastModeDefault`，然后解析所选模型的 `params.fastMode`。当解析后的模式为 `auto` 时，截止时间使用所选模型的 `params.fastAutoOnSeconds` 值，默认为 60 秒。

### <a id="live-model-switch-retries"></a> 实时模型切换重试

如果隔离运行抛出 `LiveSessionModelSwitchError`，调度程序会在重试之前保留活动运行的切换提供程序和模型。当存在时，它还会保留切换后的身份验证配置文件覆盖。外部重试循环仅限于在初始尝试后进行两次切换重试，然后中止而不是永远循环。

## <a id="run-output-and-denials"></a> 运行输出和拒绝

### <a id="stale-acknowledgement-suppression"></a> 过时确认抑制

孤立的自动化转向需要最终的可交付成果，而不是临时状态更新。记录的待处理后代工作保留最终答案的所有权；调度程序不会从确认语句中推断已完成或待处理的工作。

### <a id="silent-token-suppression"></a> 静默 token 抑制

对于纯文本隔离自动化公告，只有完整的最终文本（其整个文本修剪为大写 `NO_REPLY`）会抑制直接出站传送和后备排队摘要路径。终端生产商记录该决定；交付不会重新解析回复。

例如，这个最终回复不发送聊天消息：

```text
NO_REPLY
```

字面意义上的领先 `NO_REPLY\n` 会剥离该一条控制线，并保持其余部分不变。小写 `no_reply`、`NO_REPLY.`、引用或 JSON 形式以及报告后的尾随 `NO_REPLY` 是可见文本。对于媒体负载，可以删除静默模型文本，同时仍交付工具拥有的媒体。

人类可读的 `automations list` 和 `automations show` 将成功的故意压制标记为 `ok (suppressed)`，而不是交付警告。 `automations show` 包括带有记录原因的 `last delivery suppression`（`empty`、`silent`、`heartbeat` 或 `channel_transform`）。 JSON 保留 `deliveryStatus: "not-delivered"` 和单独的 `deliverySuppressionReason`。无故意原因的正版交付失败在执行成功时仍显示 `ok (not delivered)`。

成功执行且未确认的交付结果显示 `delivery unknown`，包括在接收响应标头之前超时的 Webhook 请求。该标签适用于要求交付和尽力交付；它不会声称交付失败。 JSON 执行状态保持为 `ok`。

### <a id="structured-denials"></a> 结构化拒绝

隔离自动化运行会使用嵌入式运行中的结构化执行拒绝元数据（编码为 `SYSTEM_RUN_DENIED` 或 `INVALID_REQUEST` 的致命执行工具错误）作为权威拒绝信号。对于节点主机在嵌套结构化错误外包裹的 `UNAVAILABLE`，且该错误包含上述代码之一的情况，它们同样会予以认可。

仅当嵌入式运行还提供结构化拒绝元数据时，调度程序才会将最终输出的散文或看似批准的拒绝短语分类为拒绝。因此，普通的助手文本不会被视为被阻止的命令。

`automations list` 和运行历史会显示拒绝原因，而不是将被阻止的命令报告为 `ok`

## <a id="retention"></a> 保留

保留行为：

- `cron.sessionRetention` 修剪已完成的隔离运行会话。默认值为 `24h`。设置 `false` 或零持续时间（例如 `"0h"`）以禁用它。
- 终端运行历史记录保留7天，`lost`行保留24小时。额外的上限仅保留每个作业和历史类别的最新 2000 行。

## <a id="migrating-older-jobs"></a> 迁移旧作业

<Note>
如果您有当前交付和存储格式之前的自动化作业，请运行 `openclaw doctor --fix`。 Doctor 规范了旧作业字段：`jobId`、`schedule.cron`、顶级传递字段（包括旧 `threadId` 和有效负载 `provider` 传递别名）。它还将 `notify: true` Webhook 后备作业从废弃的原始 `cron.webhook` 值迁移到显式 Webhook 交付。之后它会删除该配置密钥。已向聊天公告的作业将保留该交付并获取完成 Webhook 目标。如果没有旧版 Webhook，Doctor 会删除没有迁移目标的作业的惰性顶级 `notify` 标记。现有交付保持不变。 `doctor --fix` 因此停止重新警告它们。
</Note>

## <a id="common-edits"></a> 常见编辑

在不更改消息的情况下更新投递设置：

```bash
openclaw automations edit <job-id> --announce --channel telegram --to "123456789"
```

为隔离作业禁用投递：

```bash
openclaw automations edit <job-id> --no-deliver
```

为隔离作业启用轻量级引导上下文：

```bash
openclaw automations edit <job-id> --light-context
```

向特定频道发公告：

```bash
openclaw automations edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

向 Telegram 论坛主题发公告：

```bash
openclaw automations edit <job-id> --announce --channel telegram --to "-1001234567890" --thread-id 42
```

创建一个带轻量级引导上下文的隔离作业：

```bash
openclaw automations create "0 7 * * *" \
  "Summarize overnight updates." \
  --name "Lightweight morning brief" \
  --session isolated \
  --light-context \
  --no-deliver
```

`--light-context` 仅适用于隔离的代理轮次作业。对于自动化运行，轻量级模式会使引导上下文保持为空，而不是注入完整的工作区引导集合。

创建一个带精确 argv、cwd、env、stdin 和输出限制的命令作业：

```bash
openclaw automations create "*/30 * * * *" \
  --name "Position export" \
  --command-argv '["node","scripts/export-position.mjs"]' \
  --command-cwd "/srv/app" \
  --command-env "NODE_ENV=production" \
  --command-input '{"mode":"summary"}' \
  --timeout-seconds 120 \
  --no-output-timeout-seconds 30 \
  --output-max-bytes 65536 \
  --webhook "https://example.invalid/openclaw/cron"
```

## <a id="common-admin-commands"></a> 常见管理员命令

手动运行与检查：

```bash
openclaw automations list
openclaw automations list --agent ops
openclaw automations list --all --agent ops --query backup --json
openclaw automations get <job-id>
openclaw automations get <job-id> --json
openclaw automations show <job-id>
openclaw automations run <job-id>
openclaw automations run <job-id> --due
openclaw automations run <job-id> --wait --wait-timeout 10m
openclaw automations run <job-id> --wait --wait-timeout 10m --poll-interval 2s
openclaw automations runs <job-id> --limit 50
openclaw automations runs <job-id> --limit 50 --json
openclaw automations runs <job-id> --run-id <run-id>
openclaw automations runs <job-id> --status error --query timeout
openclaw automations runs <job-id> --delivery-status not-delivered
openclaw automations runs <job-id> --sort asc --offset 200 --limit 50
```

`automations runs` 是首选拼写。 `cron runs` 和叶本地 `--id <job-id>` 形式仍然受支持的兼容性别名。

网关在寻呼之前应用运行历史过滤器。将 `--status` 与 `all`、`ok`、`error` 或 `skipped` 一起使用；将 `--delivery-status` 与 `delivered`、`not-delivered`、`unknown` 或 `not-requested` 结合使用。 `--query <text>` 搜索运行摘要和错误。 `--sort asc|desc` 选择最旧在前或最新在先的顺序，并且 `--offset <n>` 使用上一个命令返回的页面元数据在结果集中前进。

`openclaw automations list` 默认显示跨代理启用的作业，包括无法解析所有者的作业。传递 `--all` 以包含禁用的作业，或传递 `--agent <id>` 以按有效标准化代理 ID 进行过滤。所有权由作业声明的代理、其代理范围的会话密钥以及配置的系统代理所有者解析。未解决的作业与代理过滤器不匹配。 `cron list` 别名具有相同的行为。

使用 `--query <text>` 搜索作业 ID、名称、描述、声明的代理 ID 和显示名称。匹配不区分大小写，并在寻呼之前使用网关现有的库存过滤器； CLI 使用相同的查询读取每个有界匹配页面。它与 `--all`、`--agent` 以及文本或 `--json` 输出相结合。省略标志或仅传递空格会保留现有列表。这会搜索作业元数据，而不是消息或脚本有效负载；使用 `automations runs <job-id> --query <text>` 来搜索运行摘要和错误。

人类可读的代理 ID 列显示有效所有者。 JSON 列表行保留声明的 `agentId` 并包括 `effectiveAgentId`，当所有权未解析时为 `null`。

在其代理不再是系统默认值后，仍可以重命名、禁用或重新安排现有的主会话作业。创建主会话作业或显式设置其代理、会话目标或有效负载类型会重新验证当前主会话规则。

未解决的所有者不会停止调度程序：该作业将被跳过，并在 `state.lastError` 中进行解释，而其他作业将继续。运行 `openclaw doctor --fix` 来修复未解析的多代理旧所有权，设置 `agents.defaults.systemAgent.agentId` 或使用 `openclaw cron edit <job-id> --agent <id>` 来修复作业。运行时所遵循的独家代理名册和旧版默认标记已经解析了所有者，并且不需要所有者迁移。解释仍停留在工作上。由于没有代理运行启动，因此不会创建代理运行历史记录条目。

`--json` 始终请求 JSON 输出。产品已经是机器可读结果的命令默认发出 JSON 结果：`add`/`create`、`status`、`enable`、`disable`、`rm`/`remove`/`delete`、`run`、`edit`、 `get` 和 `runs`。它们接受 `--json` 作为显式机器输出拼写。 `openclaw automations get <job-id>` 直接返回存储的作业JSON。当您想要具有送货路线预览的人类可读视图时，请使用 `automations show <job-id>`。

`list` 和 `show` 默认使用人类可读的输出，并使用 `--json` 切换到 JSON。 `scratch` 默认读取原始草稿内容。使用 `--json`，它可以打印草稿加修订元数据。默认情况下，Scratch 写入返回的修订结果为 JSON，并接受 `--json` 作为显式机器输出拼写。

`automations show` 还接受精确的作业名称，不区分大小写进行匹配。作业 ID 优先。当多个作业与名称匹配时（包括禁用的作业），该命令会报告歧义并包括匹配作业的完整 ID、名称、计划摘要、启用状态和状态。使用预期作业 ID 而不是名称重试相同的命令。

对于 `--json`，故障包络包括 `error.matches` 中的这些摘要。事件计划显示为 `on-exit` 或 `stream`，不带命令文本。

`automations list --json` 和 `automations show <job-id> --json` 在每个作业上都包含一个顶级 `status` 字段，该字段是根据 `enabled`、`state.runningAtMs` 和 `state.lastRunStatus` 计算得出的。值：`disabled`、`running`、`ok`、`error`、`skipped` 或 `idle`。 JSON 状态使用上面的普通值而不进行修饰，因此外部工具可以读取作业状态而无需重新导出它。人工输出可能会用失败计数来装饰重复的 `error` 状态。

`automations runs` 条目包含投递诊断信息，包括预期的自动化目标、解析后的目标、消息工具发送情况、回退机制的使用情况以及投递状态。

每个作业的私有临时存储（心跳检查清单和类似的监控上下文）：

```bash
openclaw automations scratch <job-id>                  # print current scratch content
openclaw automations scratch <job-id> --json           # scratch plus revision metadata
openclaw automations scratch <job-id> --set "text"     # replace scratch with exact text
openclaw automations scratch <job-id> --file notes.md  # replace scratch from a file (- for stdin)
openclaw automations scratch <job-id> --unset          # remove the scratch row
```

Scratch 存储在共享状态数据库中，上限为 256 KiB，并且从不包含在 `automations list`/`automations get`/`automations runs` 输出中。写入受到比较和交换保护，以防止命令启动时读取的修订版本。通过 `--expected-revision <n>` 来固定显式修订版。请参阅 [HHeartbeat](/gateway/heartbeat#monitor-scratch-optional) 了解心跳监视器如何使用暂存。

代理和会话重定向：

```bash
openclaw automations edit <job-id> --agent ops
openclaw automations edit <job-id> --clear-agent
openclaw automations edit <job-id> --session current
openclaw automations edit <job-id> --session "session:daily-brief"
```

`openclaw automations add` 会在代理轮次作业省略 `--agent` 时发出警告，并回退到默认代理（`main`）。创建时传入 `--agent <id>` 可固定使用特定代理。

投递调整：

```bash
openclaw automations edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw automations edit <job-id> --webhook "https://example.invalid/openclaw/cron"
openclaw automations edit <job-id> --best-effort-deliver
openclaw automations edit <job-id> --no-best-effort-deliver
openclaw automations edit <job-id> --no-deliver
```

### <a id="history-across-automations"></a> H自动化历史

使用 `openclaw automations runs --all` 跨可见自动化查询现有网关历史记录，而无需查找每个作业 ID。过滤器和分页适用于组合历史记录：

```bash
openclaw automations runs --all --status error --limit 20
openclaw automations runs --all --sort asc --offset 20 --limit 20
```

请勿将 `--all` 与位置作业 ID 或 `--id` 结合使用。省略 `--all` 会保留现有的每个作业查询。网关权限和可见性规则保持不变。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [自动化](/automation/cron-jobs)
