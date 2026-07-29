---
summary: "CLI 参考：`openclaw cron`（调度并运行后台作业）"
read_when:
  - 你想要了解计划任务和唤醒
  - 你正在排查 cron 执行和日志
title: "Cron"
---

# `openclaw cron`

管理 Gateway 调度器的 cron 作业。

<Tip>
运行 `openclaw cron --help` 查看完整命令集合。参见 [Cron jobs](/automation/cron-jobs) 获取概念性指南。
</Tip>

<Note>
所有 cron 变更操作（`add`/`create`、`update`/`edit`、`remove`、`run`）都需要 `operator.admin`。Command-payload runs 会直接在 Gateway 进程中执行，而不是作为 agent 的 `tools.exec` 工具调用；`tools.exec.*` 和 exec 审批仍然约束模型可见的 exec 工具。
</Note>

## 快速创建作业

`openclaw cron create` 是 `openclaw cron add` 的别名。对于新作业，请先提供调度，再提供提示：

```bash
openclaw cron create "0 7 * * *" \
  "总结夜间更新。" \
  --name "Morning brief" \
  --agent ops
```

当作业需要向 webhook POST 完成后的负载，而不是投递到聊天目标时，请使用 `--webhook <url>`：

```bash
openclaw cron create "0 18 * * 1-5" \
  "将今天的部署总结为 JSON。" \
  --name "Deploy digest" \
  --webhook "https://example.invalid/openclaw/cron"
```

对于在 OpenClaw cron 内部运行、且不启动隔离的 agent/model 运行的确定性 shell 风格作业，请使用 `--command`：

```bash
openclaw cron create "*/15 * * * *" \
  --name "Queue depth probe" \
  --command "scripts/check-queue.sh" \
  --command-cwd "/srv/app" \
  --announce \
  --channel telegram \
  --to "-1001234567890"
```

`--command <shell>` 会存储为 `argv: ["sh", "-lc", <shell>]`。若要精确执行 argv，请使用 `--command-argv '["node","scripts/report.mjs"]'`。命令型作业会捕获 stdout/stderr，记录正常的 cron 历史，并通过与隔离作业相同的 `announce`、`webhook` 或 `none` 投递模式路由输出。若命令只打印 `NO_REPLY`，则会被抑制。

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

`openclaw cron list` 和 `openclaw cron show <job-id>` 会预览解析后的投递路由。对于 `channel: "last"`，预览会显示路由是从主会话还是当前会话解析得到的，或者是否会失败并关闭。

带有前缀的提供方目标可以消除未解析公告频道的歧义。例如，`to: "telegram:123"` 会在省略 `delivery.channel` 或将其设为 `last` 时选择 Telegram。只有已加载插件声明的前缀才是提供方选择器。如果 `delivery.channel` 是显式指定的，则前缀必须与该频道匹配；`channel: "whatsapp"` 配合 `to: "telegram:123"` 会被拒绝。诸如 `imessage:` 和 `sms:` 之类的服务前缀仍属于频道拥有的目标语法。

<Note>
隔离的 `cron add` 作业默认使用 `--announce` 投递。使用 `--no-deliver` 可让输出保持内部。`--deliver` 仍保留为已弃用的 `--announce` 别名。
</Note>

### 投递所有权

隔离 cron 聊天投递由代理和运行器共同负责：

- 当可用聊天路由时，代理可以使用 `message` 工具直接发送。
- `announce` 仅在代理没有直接发送到已解析目标时，才会回退投递最终回复。
- `webhook` 会将完成后的负载发布到一个 URL。
- `none` 会禁用运行器回退投递。

使用 `cron add|create --webhook <url>` 或 `cron edit <job-id> --webhook <url>` 来设置 webhook 投递。不要将 `--webhook` 与聊天投递标志一起使用，例如 `--announce`、`--no-deliver`、`--channel`、`--to`、`--thread-id` 或 `--account`。

`cron edit <job-id>` 可以使用 `--clear-channel`、`--clear-to`、`--clear-thread-id` 和 `--clear-account` 取消单个投递路由字段（每个选项若与其对应的 set 标志一起使用都会被拒绝）。不同于 `--no-deliver` 仅禁用运行器回退投递，这些选项会移除已存储字段，使作业再次从默认值解析该路由部分。

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

隔离 cron 运行会将运行级代理失败视为作业错误，即使没有生成回复负载，因此模型/提供方失败仍然会增加错误计数并触发失败通知。

命令型 cron 作业不会启动隔离的代理轮次。退出码为 0 会记录为 `ok`；非 0 退出、信号、超时或无输出超时会记录为 `error`，并且可以触发相同的失败通知路径。

如果隔离运行在首次模型请求之前超时，`openclaw cron show` 和 `openclaw cron runs` 会包含一个特定阶段的错误，例如 `setup timed out before runner start`，或者包含最后已知启动阶段名称的卡住消息（例如 `context-engine`）。对于基于 CLI 的提供方，在外部 CLI 轮次开始之前，模型前看门狗会一直保持激活，因此会话查找、钩子、认证、提示词以及 CLI 设置方面的卡顿都会作为模型前 cron 失败报告。

## 调度

### 一次性作业

`--at <datetime>` 会调度一次性运行。没有偏移量的 datetime 会被视为 UTC，除非你同时传入 `--tz <iana>`，此时会按给定时区解释墙上时钟时间。

<Note>
一次性作业默认在成功后删除。使用 `--keep-after-run` 可保留它们。
</Note>

### 循环作业

循环作业在连续错误后使用指数退避重试：30 秒、1 分钟、5 分钟、15 分钟、60 分钟。下一次成功运行后，计划会恢复正常。

跳过的运行会与执行错误单独跟踪。它们不会影响重试退避，但 `openclaw cron edit <job-id> --failure-alert-include-skipped` 可以让失败告警包含重复的跳过运行通知。

对于针对本地已配置模型提供方的隔离作业（环回地址、私有网络或 `.local` 上的 base URL），cron 会在启动代理轮次前执行一个轻量级的提供方预检：`api: "ollama"` 提供方会在 `/api/tags` 上探测；其他本地 OpenAI 兼容提供方（`api: "openai-completions"`，例如 vLLM、SGLang、LM Studio）会在 `/models` 上探测。如果端点不可达，该次运行会被记录为 `skipped`，并在之后的计划中重试；可达性结果会按端点缓存 5 分钟，因此针对同一本地服务器的多个作业不会因重复探测而造成负担。

Cron 作业、待处理的运行时状态和运行历史存放在共享的 SQLite 状态数据库中。旧版 `jobs.json`、`<name>-state.json` 和 `runs/*.jsonl` 文件会被导入一次，并重命名为带有 `.migrated` 后缀的文件。导入完成后，请使用 `openclaw cron add|edit|remove` 来编辑计划，而不是直接编辑 JSON 文件。

### 手动运行

`openclaw cron run <job-id>` 默认会强制运行，并在手动运行排队后立即返回。成功响应包括 `{ ok: true, enqueued: true, runId }`。使用返回的 `runId` 来检查后续结果：

```bash
openclaw cron run <job-id>
openclaw cron runs --id <job-id> --run-id <run-id>
```

当脚本需要阻塞，直到该精确排队运行记录到终态时，添加 `--wait`：

```bash
openclaw cron run <job-id> --wait --wait-timeout 10m --poll-interval 2s
```

使用 `--wait` 时，CLI 仍然会先调用 `cron.run`，然后轮询 `cron.runs` 以获取返回的 `runId`。只有当运行以 `ok` 状态结束时，命令才会以 `0` 退出。当运行以 `error` 或 `skipped` 结束、Gateway 响应未包含 `runId`，或 `--wait-timeout` 超时（默认 `10m`，默认每 `2s` 轮询一次）时，命令会以非零状态退出。`--poll-interval` 必须大于零。

<Note>
当你希望手动命令仅在作业当前到期时才运行，请使用 `--due`。如果 `--due --wait` 没有排队运行，命令会返回正常的非运行响应，而不是继续轮询。
</Note>

## 模型

`cron add|edit --model <ref>` 选择该作业允许的模型。`cron add|edit --fallbacks <list>` 设置每个作业的回退模型，例如 `--fallbacks openrouter/gpt-4.1-mini,openai/gpt-5`；传入 `--fallbacks ""` 可进行严格运行，不使用任何回退。`cron edit <job-id> --clear-fallbacks` 会移除每作业的回退覆盖。`cron edit <job-id> --clear-model` 会移除每作业的模型覆盖，使该作业遵循正常的 cron 模型选择优先级（如果存在已存储的 cron 会话覆盖，则优先使用，否则使用代理/默认模型）；它不能与 `--model` 同时使用。`cron add|edit --thinking <level>` 设置每作业的 thinking 覆盖；`cron edit <job-id> --clear-thinking` 会将其移除，使作业遵循正常的 cron thinking 优先级，并且它不能与 `--thinking` 同时使用。

<Warning>
如果模型不被允许或无法解析，cron 会以明确的验证错误使运行失败，而不是回退到作业的代理或默认模型选择。
</Warning>

Cron `--model` 是一个 **作业主项**，不是聊天会话的 `/model` 覆盖。这意味着：

- 配置的模型回退仍会在所选作业模型失败时生效。
- 每作业负载的 `fallbacks` 会在存在时替换配置的回退列表。
- 空的每作业回退列表（`--fallbacks ""` 或作业负载/API 中的 `fallbacks: []`）会使 cron 运行变为严格模式。
- 当作业有 `--model` 但未配置回退列表时，OpenClaw 会传入显式的空回退覆盖，因此不会把代理主模型附加为隐藏的重试目标。
- 本地提供方预检会在将 cron 运行标记为 `skipped` 之前依次检查已配置的回退。

`openclaw doctor` 会报告那些已经设置了 `payload.model` 的作业，包括提供方命名空间计数以及与 `agents.defaults.model` 的不匹配情况。当认证、提供方或计费行为在实时聊天和计划任务之间看起来不同时，请使用该检查。

### 隔离 cron 的模型优先级

隔离 cron 按以下顺序解析活动模型：

1. Gmail-hook 覆盖。
2. 作业级 `--model`。
3. 存储的 cron 会话模型覆盖（当用户选择了一个时）。
4. 代理或默认模型选择。

### 快速模式

隔离 cron 快速模式遵循解析后的实时模型选择。模型配置 `params.fastMode` 默认生效，但已存储的会话 `fastMode` 覆盖仍优先于配置。当解析出的模式为 `auto` 时，截止点使用所选模型的 `params.fastAutoOnSeconds` 值，默认 60 秒。

### 实时模型切换重试

如果隔离运行抛出 `LiveSessionModelSwitchError`，cron 会在重试之前，为活动运行持久化切换后的提供方和模型（以及存在时切换后的 auth profile 覆盖）。外层重试循环在初始尝试后最多进行两次切换重试，然后会中止而不是无限循环。

## 运行输出和拒绝

### 过时确认抑制

隔离 cron 回合会抑制过时的仅确认回复。如果第一个结果只是一个中间状态更新，并且没有后代子代理运行负责最终答案，cron 会在投递前重新提示一次以获取真实结果。

### 静默 token 抑制

如果隔离 cron 运行只返回静默 token（`NO_REPLY` 或 `no_reply`），cron 会同时抑制直接外发投递和回退队列摘要路径，因此不会向聊天回传任何内容。

### 结构化拒绝

隔离 cron 运行使用来自嵌入式运行的结构化执行拒绝元数据（标记为 `SYSTEM_RUN_DENIED` 或 `INVALID_REQUEST` 的致命 exec-tool 错误）作为权威拒绝信号。它们也会接受 node-host 的 `UNAVAILABLE` 包装，其中包含带有这些代码之一的嵌套结构化错误。

除非嵌入式运行也提供了结构化拒绝元数据，否则 cron 不会将最终输出散文或看起来像审批拒绝的短语归类为拒绝，因此普通的助手文本不会被视为被阻止的命令。

`cron list` 和运行历史会显示拒绝原因，而不是把被阻止的命令报告为 `ok`。

## 保留

保留行为：

- `cron.sessionRetention`（默认 `24h`，或设置为 `false` 以禁用）会清理已完成的隔离运行会话。
- 运行历史会为每个 cron 作业保留最新的 2000 行终端输出。丢失的行将保留标准的 24 小时丢失任务清理窗口。

## 迁移旧作业

<Note>
如果你在当前投递和存储格式之前有 cron 作业，请运行 `openclaw doctor --fix`。Doctor 会规范化旧版 cron 字段（`jobId`、`schedule.cron`、顶层投递字段，包括旧版 `threadId`、payload `provider` 投递别名），并在移除该配置键之前，将 `notify: true` 的 webhook 回退作业从已弃用的原始 `cron.webhook` 值迁移为显式的 webhook 投递。已经向聊天公告的作业会保留该投递，并获得一个完成 webhook 目标。对于没有旧版 webhook 的作业，如果没有可迁移目标，则会移除无效的顶层 `notify` 标记（现有投递保持不变），因此 `doctor --fix` 不会再反复提醒这些作业。
</Note>

## 常见编辑

在不更改消息的情况下更新投递设置：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

为隔离作业禁用投递：

```bash
openclaw cron edit <job-id> --no-deliver
```

为隔离作业启用轻量级引导上下文：

```bash
openclaw cron edit <job-id> --light-context
```

向特定频道发公告：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

向 Telegram 论坛主题发公告：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "-1001234567890" --thread-id 42
```

创建一个带轻量级引导上下文的隔离作业：

```bash
openclaw cron create "0 7 * * *" \
  "总结夜间更新。" \
  --name "Lightweight morning brief" \
  --session isolated \
  --light-context \
  --no-deliver
```

`--light-context` 仅适用于隔离的代理回合式作业。对于 cron 运行，轻量模式会保持引导上下文为空，而不是注入完整的工作区引导集合。

创建一个带精确 argv、cwd、env、stdin 和输出限制的命令作业：

```bash
openclaw cron create "*/30 * * * *" \
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
openclaw cron list
openclaw cron list --agent ops
openclaw cron get <job-id>
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron run <job-id> --wait --wait-timeout 10m
openclaw cron run <job-id> --wait --wait-timeout 10m --poll-interval 2s
openclaw cron runs --id <job-id> --limit 50
openclaw cron runs --id <job-id> --run-id <run-id>
```

`openclaw cron list` 默认显示已启用的作业。传入 `--all` 可包含已禁用的作业，或传入 `--agent <id>` 仅显示其有效规范化 agent id 匹配的作业；没有存储 agent id 的作业会被视为使用已配置的默认 agent。

`openclaw cron get <job-id>` 直接返回存储的作业 JSON。想要带投递路由预览的人类可读视图时，请使用 `cron show <job-id>`。

`cron list --json` 和 `cron show <job-id> --json` 会在每个作业中包含一个顶层 `status` 字段，该字段由 `enabled`、`state.runningAtMs` 和 `state.lastRunStatus` 计算得出。取值：`disabled`、`running`、`ok`、`error`、`skipped` 或 `idle`。JSON 状态保持规范且不加修饰，因此外部工具可以读取作业状态而无需重新推导；人类可读输出可能会为重复的 `error` 状态附加失败次数。

`cron runs` 条目包含投递诊断信息，涵盖预期的 cron 目标、解析后的目标、message 工具发送、回退使用情况以及已投递状态。

每个作业的私有临时存储（心跳检查清单和类似的监控上下文）：

```bash
openclaw cron scratch <job-id>                  # 打印当前临时存储内容
openclaw cron scratch <job-id> --json           # 临时存储加修订元数据
openclaw cron scratch <job-id> --set "text"     # 用精确文本替换临时存储
openclaw cron scratch <job-id> --file notes.md  # 从文件替换临时存储（- 表示 stdin）
openclaw cron scratch <job-id> --unset          # 删除临时存储行
```

Scratch 存储在共享状态数据库中，上限为 256 KiB，且绝不会包含在 `cron list`/`cron get`/`cron runs` 输出中。写入操作受 compare-and-swap 保护，并以命令开始时读取到的修订版本为准；如需固定到显式修订版本，请改用 `--expected-revision <n>`。有关心跳监控如何使用 scratch，请参见 [Heartbeat](/gateway/heartbeat#monitor-scratch-optional)。

代理和会话重定向：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

当省略 `--agent` 且作业为 agent-turn 类型时，`openclaw cron add` 会发出警告，并回退到默认代理（`main`）。在创建时传入 `--agent <id>` 可固定特定代理。

投递调整：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --webhook "https://example.invalid/openclaw/cron"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## 相关

- [CLI 参考](/cli)
- [定时任务](/automation/cron-jobs)
