---
summary: "`openclaw automations` 的 CLI 参考（安排和运行后台作业）"
read_when:
  - 需要安排作业和唤醒任务
  - 正在调试自动化执行和日志
title: "自动化（cron）"
---

# `openclaw automations`

管理 Gateway 调度器的自动化作业。`openclaw automations` 是主要命令；`openclaw cron` 仍然是其别名，下面的每个子命令都可以使用任一命令形式。

<Tip>
运行 `openclaw automations --help` 查看完整的命令列表。有关概念指南，请参阅[自动化](/automation/cron-jobs)。
</Tip>

<Note>
所有自动化变更操作（`add`/`create`、`update`/`edit`、`remove`、`run`）都需要 `operator.admin`。命令负载运行会直接在 Gateway 进程中执行，而不是作为智能体的 `tools.exec` 工具调用；`tools.exec.*` 和 exec 审批仍然控制模型可见的 exec 工具。
</Note>

## 快速创建作业

`openclaw automations create` 是 `openclaw automations add` 的别名。对于新作业，请先填写调度计划，再填写提示词：

```bash
openclaw automations create "0 7 * * *" \
  "Summarize overnight updates." \
  --name "Morning brief" \
  --agent ops
```

当作业需要向 webhook POST 完成后的负载，而不是投递到聊天目标时，请使用 `--webhook <url>`：

```bash
openclaw automations create "0 18 * * 1-5" \
  "Summarize today's deploys as JSON." \
  --name "Deploy digest" \
  --webhook "https://example.invalid/openclaw/cron"
```

对于在 OpenClaw 调度器中运行、无需启动隔离的智能体/模型运行的确定性 Shell 风格作业，请使用 `--command`：

```bash
openclaw automations create "*/15 * * * *" \
  --name "Queue depth probe" \
  --command "scripts/check-queue.sh" \
  --command-cwd "/srv/app" \
  --announce \
  --channel telegram \
  --to "-1001234567890"
```

`--command <shell>` 会存储为 `argv: ["sh", "-lc", <shell>]`。如需精确的 argv 执行，请使用 `--command-argv '["node","scripts/report.mjs"]'`。命令作业会捕获 stdout/stderr，记录常规运行历史，并通过与隔离作业相同的 `announce`、`webhook` 或 `none` 投递模式路由输出。仅打印 `NO_REPLY` 的命令会被抑制。

## 会话

`--session` 接受 `main`、`isolated`、`current` 或 `session:<id>`。

Agent-turn 作业在可用会话上下文时，默认使用创建它们的对话。若没有会话键，包括普通 CLI 调用和省略该参数的 API 调用，目标都会回退为 `isolated`。

<AccordionGroup>
  <Accordion title="会话键">
    - `main` 绑定到代理的主会话。
    - `isolated` 为每次运行创建一个新的转录和会话 id。
    - `current` 绑定到创建时的活动会话。
    - `session:<id>` 固定到一个显式的持久会话键。

  </Accordion>
  <Accordion title="隔离会话语义">
    隔离运行会重置环境会话上下文。通道和组路由、发送/排队策略、提升、来源以及 ACP 运行时绑定都会为新运行重置。安全偏好，以及用户显式选择的模型或身份验证覆盖，可以跨运行保留。
  </Accordion>
</AccordionGroup>

## 投递

`openclaw automations list` 和 `openclaw automations show <job-id>` 会预览解析后的投递路由。对于 `channel: "last"`，预览会显示该路由是从主会话还是当前会话解析得到，或者将安全失败。

带有前缀的提供方目标可以消除未解析公告频道的歧义。例如，`to: "telegram:123"` 会在省略 `delivery.channel` 或将其设为 `last` 时选择 Telegram。只有已加载插件声明的前缀才是提供方选择器。如果 `delivery.channel` 是显式指定的，则前缀必须与该频道匹配；`channel: "whatsapp"` 配合 `to: "telegram:123"` 会被拒绝。诸如 `imessage:` 和 `sms:` 之类的服务前缀仍属于频道拥有的目标语法。

<Note>
隔离的 `automations add` 作业默认使用 `--announce` 投递。使用 `--no-deliver` 可将输出保留在内部。`--deliver` 仍作为已弃用的 `--announce` 别名保留。
</Note>

### 投递所有权

隔离的自动化聊天投递由代理和运行器共同负责：

- 当可用聊天路由时，代理可以使用 `message` 工具直接发送。
- `announce` 仅在代理没有直接发送到已解析目标时，才会回退投递最终回复。
- `webhook` 会将完成后的负载发布到一个 URL。
- `none` 会禁用运行器回退投递。

使用 `automations add|create --webhook <url>` 或 `automations edit <job-id> --webhook <url>` 来设置 webhook 投递。不要将 `--webhook` 与 `--announce`、`--no-deliver`、`--channel`、`--to`、`--thread-id` 或 `--account` 等聊天投递标志结合使用。

`automations edit <job-id>` 可以使用 `--clear-channel`、`--clear-to`、`--clear-thread-id` 和 `--clear-account` 清除单独的投递路由字段（每个选项在与对应的设置选项结合使用时都会被拒绝）。与只禁用运行器回退投递的 `--no-deliver` 不同，这些选项会移除已存储的字段，使作业再次从默认值解析该部分路由。

`--announce` 是最终回复的运行器回退投递。`--no-deliver` 会禁用该回退，但当聊天路由可用时，不会移除代理的 `message` 工具。

从活动聊天创建的提醒会保留实时聊天投递目标，用于回退 announce 投递。内部会话键可能是小写；不要把它们当作区分大小写的提供方 ID 的真实来源，例如 Matrix 房间 ID。

### 失败投递

失败通知按以下顺序解析：

1. 作业上的 `delivery.failureDestination`。
2. `cron.failureAlert` 上的全局目标字段（`mode`、`channel`、`to`、`accountId`）。已退役的 `cron.failureDestination` 块会由 `openclaw doctor --fix` 合并到这些字段中。
3. 作业的主 announce 目标（当以上两者都无法解析为具体目标时）。

<Note>
主会话作业仅在主投递模式为 `webhook` 时才可使用 `delivery.failureDestination`。隔离作业在所有模式下都接受它。
</Note>

聊天失败通知会包含运行开始时间，时间采用代理配置的用户时区。Webhook 消息文本保持稳定，并通过 `runAtMs` 暴露该时间点。

隔离的自动化运行会将运行级代理失败视为作业错误，即使没有生成回复负载也是如此，因此模型/提供方失败仍会增加错误计数器并触发失败通知。

命令作业不会启动隔离的代理回合。退出代码为零时记录为 `ok`；非零退出、信号中断、超时或无输出超时则记录为 `error`，并可能触发相同的失败通知路径。

如果隔离运行在首次模型请求之前超时，`openclaw automations show` 和 `openclaw automations runs` 会包含特定于阶段的错误，例如 `setup timed out before runner start`，或包含最后已知启动阶段名称的停滞消息（例如 `context-engine`）。对于基于 CLI 的提供方，模型请求前的监视器会一直保持活动状态，直到外部 CLI 回合启动，因此会话查找、钩子、身份验证、提示词和 CLI 设置过程中的停滞都会被报告为模型请求前的自动化失败。

## 调度

### 一次性作业

`--at <datetime>` 会调度一次性运行。没有偏移量的 datetime 会被视为 UTC，除非你同时传入 `--tz <iana>`，此时会按给定时区解释墙上时钟时间。

<Note>
一次性作业默认在成功后删除。使用 `--keep-after-run` 可保留它们。
</Note>

### 循环作业

循环作业在连续错误后使用指数退避重试：30 秒、1 分钟、5 分钟、15 分钟、60 分钟。下一次成功运行后，计划会恢复正常。

跳过的运行会与执行错误分开跟踪。它们不会影响重试退避，但可以使用 `openclaw automations edit <job-id> --failure-alert-include-skipped`，将失败提醒设置为包含重复的跳过运行通知。

对于目标为本地已配置模型提供商的隔离作业（基 URL 位于回环地址、私有网络或 `.local`），调度器会在启动代理回合前执行轻量级的提供商预检：`api: "ollama"` 提供商会探测 `/api/tags`；其他本地 OpenAI 兼容提供商（`api: "openai-completions"`，例如 vLLM、SGLang、LM Studio）会探测 `/models`。如果端点无法访问，则此次运行会记录为 `skipped`，并在后续计划中重试；可达性结果会按端点缓存 5 分钟，因此针对同一本地服务器的多个作业不会通过重复探测对其造成过多请求。

自动化作业、待处理的运行时状态和运行历史都存储在共享的 SQLite 状态数据库中。旧版的 `jobs.json`、`<name>-state.json` 和 `runs/*.jsonl` 文件会被导入一次，并重命名为带有 `.migrated` 后缀的文件。导入后，请使用 `openclaw automations add|edit|remove` 编辑计划，而不要编辑 JSON 文件。

### 手动运行

`openclaw automations run <job-id>` 默认会强制运行，并在手动运行进入队列后立即返回。成功响应包含 `{ ok: true, enqueued: true, runId }`。使用返回的 `runId` 检查之后的结果：

```bash
openclaw automations run <job-id>
openclaw automations runs --id <job-id> --run-id <run-id>
```

当脚本需要阻塞，直到该精确排队运行记录到终态时，添加 `--wait`：

```bash
openclaw automations run <job-id> --wait --wait-timeout 10m --poll-interval 2s
```

使用 `--wait` 时，CLI 仍然会先调用 `cron.run`，然后轮询 `cron.runs` 以获取返回的 `runId`。只有当运行以 `ok` 状态结束时，命令才会以 `0` 退出。当运行以 `error` 或 `skipped` 结束、Gateway 响应未包含 `runId`，或 `--wait-timeout` 超时（默认 `10m`，默认每 `2s` 轮询一次）时，命令会以非零状态退出。`--poll-interval` 必须大于零。

<Note>
当你希望手动命令仅在作业当前到期时才运行，请使用 `--due`。如果 `--due --wait` 没有排队运行，命令会返回正常的非运行响应，而不是继续轮询。
</Note>

## 模型

`automations add|edit --model <ref>` 为作业选择一个允许使用的模型。`automations add|edit --fallbacks <list>` 设置每个作业的备用模型，例如 `--fallbacks openrouter/gpt-4.1-mini,openai/gpt-5`；传入 `--fallbacks ""` 可执行不使用备用模型的严格运行。`automations edit <job-id> --clear-fallbacks` 移除每个作业的备用模型覆盖。`automations edit <job-id> --clear-model` 移除每个作业的模型覆盖，使作业遵循正常的自动化模型选择优先级（如果存在，则使用已存储的自动化会话覆盖，否则使用代理/默认模型）；此选项不能与 `--model` 组合使用。`automations add|edit --thinking <level>` 设置每个作业的思考级别覆盖；`automations edit <job-id> --clear-thinking` 移除该覆盖，使作业遵循正常的自动化思考级别优先级；此选项不能与 `--thinking` 组合使用。

<Warning>
如果模型不被允许使用或无法解析，调度器会使本次运行失败，并给出明确的验证错误，而不是回退到作业的代理或默认模型选择。
</Warning>

自动化的 `--model` 是**作业主模型**，而不是聊天会话的 `/model` 覆盖。这意味着：

- 当所选作业模型失败时，已配置的模型备用列表仍会生效。
- 存在每个作业的 payload `fallbacks` 时，它会替换已配置的备用模型列表。
- 空的每个作业备用模型列表（`--fallbacks ""` 或作业 payload/API 中的 `fallbacks: []`）会使本次运行进入严格模式。
- 当作业设置了 `--model` 但未配置备用模型列表时，OpenClaw 会传入一个明确的空备用模型覆盖，因此不会将代理主模型作为隐藏的重试目标追加进去。
- 本地提供方的预检会遍历已配置的备用模型，然后再将运行标记为 `skipped`。

`openclaw doctor` 会报告那些已经设置了 `payload.model` 的作业，包括提供方命名空间计数以及与 `agents.defaults.model` 的不匹配情况。当认证、提供方或计费行为在实时聊天和计划任务之间看起来不同时，请使用该检查。

### 隔离自动化模型优先级

隔离的自动化运行按以下顺序解析活动模型：

1. Gmail 钩子覆盖。
2. 每个作业的 `--model`。
3. 已存储的自动化会话模型覆盖（用户选择了模型时）。
4. 代理或默认模型选择。

### 快速模式

隔离自动化快速模式遵循解析后的实时模型选择。它依次解析已存储会话的 `fastMode`、每个代理的 `agents.entries.*.fastModeDefault`、全局的 `agents.defaults.fastModeDefault`，然后解析所选模型的 `params.fastMode`。当解析后的模式为 `auto` 时，截止时间使用所选模型的 `params.fastAutoOnSeconds` 值，默认为 60 秒。

### 实时模型切换重试

如果隔离运行抛出 `LiveSessionModelSwitchError`，调度器会在重试前，为当前运行持久化切换后的提供方和模型（以及存在时的切换后认证配置文件覆盖）。初始尝试之后，外层重试循环最多进行两次切换重试，随后中止，而不是无限循环。

## 运行输出和拒绝

### 过时确认抑制

隔离自动化会抑制过时的仅确认回复。如果第一个结果只是临时状态更新，并且没有任何后代子代理运行负责最终答案，调度器会再次提示以获取实际结果，然后再进行传递。

### 静默 token 抑制

如果隔离自动化运行只返回静默 token（`NO_REPLY` 或 `no_reply`），调度器会同时抑制直接出站传递和后备排队摘要路径，因此不会向聊天中发布任何内容。

### 结构化拒绝

隔离自动化运行会使用嵌入式运行中的结构化执行拒绝元数据（编码为 `SYSTEM_RUN_DENIED` 或 `INVALID_REQUEST` 的致命执行工具错误）作为权威拒绝信号。对于节点主机在嵌套结构化错误外包裹的 `UNAVAILABLE`，且该错误包含上述代码之一的情况，它们同样会予以认可。

除非嵌入式运行同时提供结构化拒绝元数据，否则调度器不会将最终输出中的文字或看似批准的拒绝短语归类为拒绝，因此普通的助手文本不会被视为遭到阻止的命令。

`automations list` 和运行历史会显示拒绝原因，而不是将被阻止的命令报告为 `ok`

## 保留

保留行为：

- `cron.sessionRetention`（默认值为 `24h`，或设为 `false` 以禁用；例如 `"0h"` 这样的零时长同样会禁用）会清理已完成的隔离运行会话。
- 运行历史记录会为每个任务保留最新的 2000 条终止状态记录。丢失的记录仍遵循标准的 24 小时丢失任务清理窗口。

## 迁移旧作业

<Note>
如果您有在当前投递和存储格式之前创建的自动化作业，请运行 `openclaw doctor --fix`。Doctor 会规范化旧版作业字段（`jobId`、`schedule.cron`、顶层投递字段，包括旧版 `threadId`、负载中的 `provider` 投递别名），并将使用已弃用的原始 `cron.webhook` 值作为 webhook 回退方式的 `notify: true` 作业迁移为显式 webhook 投递，然后移除该配置键。已经向聊天发送通知的作业会保留该投递方式，并获得一个完成 webhook 目标。如果不存在旧版 webhook，对于没有迁移目标的作业，会移除无实际作用的顶层 `notify` 标记（现有投递方式保持不变），因此 `doctor --fix` 不会再持续对这些作业发出警告。
</Note>

## 常见编辑

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

## 常见管理员命令

手动运行与检查：

```bash
openclaw automations list
openclaw automations list --agent ops
openclaw automations get <job-id>
openclaw automations get <job-id> --json
openclaw automations show <job-id>
openclaw automations run <job-id>
openclaw automations run <job-id> --due
openclaw automations run <job-id> --wait --wait-timeout 10m
openclaw automations run <job-id> --wait --wait-timeout 10m --poll-interval 2s
openclaw automations runs --id <job-id> --limit 50
openclaw automations runs --id <job-id> --limit 50 --json
openclaw automations runs --id <job-id> --run-id <run-id>
```

`openclaw automations list` 默认显示已启用的作业。传入 `--all` 可包含已禁用的作业，或传入 `--agent <id>` 仅显示有效规范化代理 id 匹配的作业；未存储代理 id 的作业将被视为使用已配置的默认代理。

`openclaw automations get <job-id>` 直接返回存储的作业 JSON。`get` 和 `runs` 接受 `--json` 作为明确的机器输出参数。需要包含投递路由预览的人类可读视图时，请使用 `automations show <job-id>`。

`automations list --json` 和 `automations show <job-id> --json` 会在每个作业中包含顶层的 `status` 字段，该字段根据 `enabled`、`state.runningAtMs` 和 `state.lastRunStatus` 计算得出。取值包括：`disabled`、`running`、`ok`、`error`、`skipped` 或 `idle`。JSON 状态保持规范且不添加装饰，以便外部工具无需重新推导即可读取作业状态；人类可读输出可能会为重复出现的 `error` 状态附加失败次数。

`automations runs` 条目包含投递诊断信息，包括预期的自动化目标、解析后的目标、消息工具发送情况、回退机制的使用情况以及投递状态。

每个作业的私有临时存储（心跳检查清单和类似的监控上下文）：

```bash
openclaw automations scratch <job-id>                  # 打印当前临时存储内容
openclaw automations scratch <job-id> --json           # 临时存储内容及修订元数据
openclaw automations scratch <job-id> --set "text"     # 使用精确文本替换临时存储内容
openclaw automations scratch <job-id> --file notes.md  # 从文件替换临时存储内容（- 表示标准输入）
openclaw automations scratch <job-id> --unset          # 移除临时存储记录
```

临时存储保存在共享状态数据库中，大小上限为 256 KiB，并且永远不会包含在 `automations list`/`automations get`/`automations runs` 的输出中。写入操作会根据命令开始时读取的修订版本进行比较并交换保护；也可以传入 `--expected-revision <n>` 来固定指定的修订版本。有关心跳监控如何使用临时存储的信息，请参阅[心跳](/gateway/heartbeat#monitor-scratch-optional)。

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

## 相关

- [CLI 参考](/cli)
- [自动化](/automation/cron-jobs)
