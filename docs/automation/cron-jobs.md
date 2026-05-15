---
summary: "Gateway 调度器的计划任务、webhook 和 Gmail PubSub 触发器"
read_when:
  - 调度后台作业或唤醒
  - 将外部触发器（webhook、Gmail）接入 OpenClaw
  - 在计划任务中决定使用 heartbeat 还是 cron
title: "计划任务"
sidebarTitle: "计划任务"
---

Cron 是 Gateway 内置的调度器。它会持久化作业，在正确的时间唤醒 agent，并且可以将输出返回到聊天频道或 webhook 端点。

## 快速开始

<Steps>
  <Step title="添加一次性提醒">
    ```bash
    openclaw cron add \
      --name "Reminder" \
      --at "2026-02-01T16:00:00Z" \
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

- Cron runs **inside the Gateway** process (not inside the model).
- Job definitions persist at `~/.openclaw/cron/jobs.json` so restarts do not lose schedules.
- Runtime execution state persists next to it in `~/.openclaw/cron/jobs-state.json`. If you track cron definitions in git, track `jobs.json` and gitignore `jobs-state.json`.
- After the split, older OpenClaw versions can read `jobs.json` but may treat jobs as fresh because runtime fields now live in `jobs-state.json`.
- When `jobs.json` is edited while the Gateway is running or stopped, OpenClaw compares the changed schedule fields with pending runtime slot metadata and clears stale `nextRunAtMs` values. Pure formatting or key-order-only rewrites preserve the pending slot.
- All cron executions create [background task](/automation/tasks) records.
- On Gateway startup, overdue isolated agent-turn jobs are rescheduled out of the channel-connect window instead of replaying immediately, so Discord/Telegram startup and native-command setup stay responsive after restarts.
- One-shot jobs (`--at`) auto-delete after success by default.
- Isolated cron runs best-effort close tracked browser tabs/processes for their `cron:<jobId>` session when the run completes, so detached browser automation does not leave orphaned processes behind.
- Isolated cron runs that receive the narrow cron self-cleanup grant can still read scheduler status, a self-filtered list of their current job, and that job's run history, so status/heartbeat checks can inspect their own schedule without gaining broader cron mutation access.
- Isolated cron runs also guard against stale acknowledgement replies. If the first result is just an interim status update (`on it`, `pulling everything together`, and similar hints) and no descendant subagent run is still responsible for the final answer, OpenClaw re-prompts once for the actual result before delivery.
- Isolated cron runs prefer structured execution-denial metadata from the embedded run, then fall back to known final summary/output markers such as `SYSTEM_RUN_DENIED` and `INVALID_REQUEST`, so a blocked command is not reported as a green run.
- Isolated cron runs also treat run-level agent failures as job errors even when no reply payload is produced, so model/provider failures increment error counters and trigger failure notifications instead of clearing the job as successful.
- When an isolated agent-turn job reaches `timeoutSeconds`, cron aborts the underlying agent run and gives it a short cleanup window. If the run does not drain, Gateway-owned cleanup force-clears that run's session ownership before cron records the timeout, so queued chat work is not left behind a stale processing session.
- If an isolated agent-turn stalls before the runner starts or before the first model call, cron records a phase-specific timeout such as `setup timed out before runner start` or `stalled before first model call (last phase: context-engine)`. These watchdogs cover embedded providers and CLI-backed providers before their external CLI process is actually started, and are capped independently from long `timeoutSeconds` values so cold-start/auth/context failures surface quickly instead of waiting for the full job budget.

<a id="maintenance"></a>

<Note>
Cron 的任务协调首先由运行时拥有，其次才由持久历史支持：只要 cron 运行时仍然将该作业视为正在运行，活动的 cron 任务就会保持存活，即使旧的子会话行仍然存在。一旦运行时不再拥有该作业并且 5 分钟宽限期已过，维护检查会针对匹配的 `cron:<jobId>:<startedAt>` 运行去查看持久化运行日志和作业状态。如果这些持久化历史显示了终态结果，任务账本就会据此完成；否则，由 Gateway 拥有的维护可以将任务标记为 `lost`。离线 CLI 审计可以从持久历史中恢复，但它不会把自己进程内空的活动作业集合视为 Gateway 拥有的 cron 运行已消失的证明。
</Note>

## 计划类型

| 类型    | CLI 标志  | 描述                                                |
| ------- | --------- | --------------------------------------------------- |
| `at`    | `--at`    | 一次性时间戳（ISO 8601 或相对时间，如 `20m`）       |
| `every` | `--every` | 固定间隔                                           |
| `cron`  | `--cron`  | 5 字段或 6 字段 cron 表达式，可选 `--tz`            |

不带时区的时间戳会被视为 UTC。添加 `--tz America/New_York` 可按本地墙钟时间调度。

每小时整点的重复表达式会自动错峰，最多延迟 5 分钟，以减少负载峰值。使用 `--exact` 强制精确时间，或使用 `--stagger 30s` 指定明确的窗口。

### 月中的日期和星期采用 OR 逻辑

Cron 表达式由 [croner](https://github.com/Hexagon/croner) 解析。当“月中的日期”和“星期”字段都不是通配符时，croner 在**任一**字段匹配时就会认为匹配——而不是两个都匹配。这是标准的 Vixie cron 行为。

```
# 期望："15 日上午 9 点，且仅当那天是星期一"
# 实际：  "每个 15 日上午 9 点，以及每个星期一上午 9 点"
0 9 15 * 1
```

这会导致每月触发约 5–6 次，而不是每月 0–1 次。OpenClaw 在这里使用 Croner 默认的 OR 行为。若要同时满足两个条件，请使用 Croner 的 `+` 星期修饰符（`0 9 15 * +1`），或者只在一个字段上调度，并在作业的提示或命令中对另一个条件进行守卫。

## 执行样式

| 样式            | `--session` 值      | 运行位置                 | 最适合                         |
| --------------- | ------------------- | ------------------------ | ------------------------------ |
| 主会话          | `main`              | 下一个 heartbeat turn    | 提醒、系统事件                |
| 独立            | `isolated`          | 专用 `cron:<jobId>`      | 报告、后台杂务                |
| 当前会话        | `current`           | 创建时绑定               | 具备上下文感知的重复工作      |
| 自定义会话      | `session:custom-id` | 持久命名会话             | 基于历史构建的工作流          |

<AccordionGroup>
  <Accordion title="主会话 vs 独立 vs 自定义">
    **主会话** 作业会入队一个系统事件，并可选地唤醒 heartbeat（`--wake now` 或 `--wake next-heartbeat`）。这些系统事件不会延长目标会话的每日/空闲重置新鲜度。**独立** 作业会以新的会话运行一个专用 agent turn。**自定义会话**（`session:xxx`）会在多次运行之间保留上下文，从而支持诸如每日站会这类基于之前总结继续推进的工作流。
  </Accordion>
  <Accordion title="“新鲜会话”对独立作业意味着什么">
    对于独立作业，“新鲜会话”意味着每次运行都会有一个新的 transcript/session id。OpenClaw 可能会沿用一些安全偏好，例如 thinking/fast/verbose 设置、标签，以及用户明确选择的模型/认证覆盖项，但它不会继承来自旧 cron 行的环境对话上下文：频道/群组路由、发送或排队策略、提升权限、来源或 ACP 运行时绑定。当重复作业应有意基于同一对话上下文构建时，请使用 `current` 或 `session:<id>`。
  </Accordion>
  <Accordion title="运行时清理">
    对于独立作业，运行时收尾现在包括对该 cron 会话尽最大努力进行浏览器清理。清理失败会被忽略，因此实际的 cron 结果仍然优先。

    独立 cron 运行还会通过共享的运行时清理路径，处置为作业创建的任何捆绑 MCP 运行时实例。这与主会话和自定义会话的 MCP 客户端收尾方式一致，因此独立 cron 作业不会在多次运行之间泄漏 stdio 子进程或长期存在的 MCP 连接。

  </Accordion>
  <Accordion title="子 agent 和 Discord 交付">
    当独立 cron 运行协调子 agent 时，交付也会优先使用最终的后代输出，而不是过时的父级中间文本。如果后代仍在运行，OpenClaw 会抑制那条部分父级更新，而不是把它宣布出去。

    对于仅文本的 Discord announce 目标，OpenClaw 只发送一次规范的最终助手文本，而不会同时重放流式/中间文本载荷和最终答案。媒体和结构化 Discord 载荷仍会作为单独载荷交付，因此附件和组件不会被丢弃。

  </Accordion>
</AccordionGroup>

### 独立作业的载荷选项

<ParamField path="--message" type="string" required>
  提示文本（独立模式必需）。
</ParamField>
<ParamField path="--model" type="string">
  模型覆盖；为该作业使用所选的允许模型。
</ParamField>
<ParamField path="--thinking" type="string">
  thinking 级别覆盖。
</ParamField>
<ParamField path="--light-context" type="boolean">
  跳过 workspace bootstrap 文件注入。
</ParamField>
<ParamField path="--tools" type="string">
  限制作业可使用的工具，例如 `--tools exec,read`。
</ParamField>

`--model` 会使用所选的允许模型作为该作业的主模型。它与聊天会话中的 `/model` 覆盖不同：当作业主模型失败时，配置的后备链仍然适用。如果请求的模型不被允许或无法解析，cron 会以明确的验证错误失败该运行，而不是静默回退到作业的 agent/default 模型选择。

Cron 作业还可以携带载荷级别的 `fallbacks`。存在时，该列表会替换该作业的配置后备链。若希望只尝试所选模型的严格 cron 运行，请在作业载荷/API 中使用 `fallbacks: []`。如果作业有 `--model` 但既没有载荷后备也没有配置后备，OpenClaw 会传递一个显式的空后备覆盖，以便不会把 agent 主模型附加为隐藏的额外重试目标。

独立作业的模型选择优先级为：

1. Gmail hook 模型覆盖（当运行来自 Gmail 且该覆盖被允许时）
2. 每个作业的载荷 `model`
3. 用户选择的已存储 cron 会话模型覆盖
4. Agent/default 模型选择

fast 模式也遵循解析后的实时选择。如果所选模型配置具有 `params.fastMode`，独立 cron 会默认使用它。已存储的会话 `fastMode` 覆盖仍然会在任一方向上压过配置。

如果独立运行遇到实时模型切换交接，cron 会使用切换后的提供方/模型重试，并在重试前为当前运行持久化该实时选择。当切换还携带新的认证配置文件时，cron 也会为当前运行持久化该认证配置文件覆盖。重试次数有限：在初始尝试加 2 次切换重试之后，cron 会中止，而不是无限循环。

在独立 cron 运行进入 agent runner 之前，OpenClaw 会检查已配置的 `api: "ollama"` 和 `api: "openai-completions"` 提供方的可达本地提供方端点，其中 `baseUrl` 为 loopback、私有网络或 `.local`。如果该端点不可用，运行会被记录为 `skipped`，并带有清晰的提供方/模型错误，而不是启动一次模型调用。端点结果会缓存 5 分钟，因此许多使用同一个已失效本地 Ollama、vLLM、SGLang 或 LM Studio 服务器的到期作业会共享一次小型探测，而不是制造请求风暴。被跳过的 provider-preflight 运行不会增加执行错误退避；当你希望重复收到跳过通知时，请启用 `failureAlert.includeSkipped`。

## 交付与输出

| 模式       | 会发生什么                                                      |
| ---------- | ---------------------------------------------------------------- |
| `announce` | 如果代理没有发送，则回退将最终文本交付给目标                         |
| `webhook`  | 将完成事件载荷 POST 到一个 URL                                   |
| `none`     | 不进行运行器回退交付                                               |

对频道交付使用 `--announce --channel telegram --to "-1001234567890"`。对于 Telegram 论坛主题，请使用 `-1001234567890:topic:123`；直接 RPC/config 调用者也可以将 `delivery.threadId` 作为字符串或数字传入。Slack/Discord/Mattermost 目标应使用显式前缀（`channel:<id>`、`user:<id>`）。Matrix 房间 ID 区分大小写；请使用精确的房间 ID，或使用来自 Matrix 的 `room:!room:server` 形式。

当 announce 交付使用 `channel: "last"` 或省略 `channel` 时，带有提供方前缀的目标（例如 `telegram:123`）可以在 cron 回退到会话历史或单个已配置频道之前选择频道。只有已加载插件声明的前缀才是提供方选择器。如果 `delivery.channel` 是显式指定的，则目标前缀必须命名同一提供方；例如，`channel: "whatsapp"` 配合 `to: "telegram:123"` 会被拒绝，而不会让 WhatsApp 将 Telegram ID 解释为电话号码。`channel:<id>`、`user:<id>`、`imessage:<handle>` 和 `sms:<number>` 等目标种类和服务前缀仍然是频道拥有的目标语法，而不是提供方选择器。

对于独立作业，聊天交付是共享的。如果聊天路由可用，即使作业使用 `--no-deliver`，代理也可以使用 `message` 工具。如果代理发送到了已配置/当前目标，OpenClaw 会跳过回退 announce。否则，`announce`、`webhook` 和 `none` 只控制运行器在代理轮次结束后如何处理最终回复。

当代理从活动聊天创建一个隔离提醒时，OpenClaw 会为回退 announce 路由存储保留的实时交付目标。内部会话键可能是小写；当当前聊天上下文可用时，不会根据这些键重建提供方交付目标。

隐式 announce 交付会使用已配置的频道允许列表来验证并重定向过时目标。DM 配对存储中的批准不是回退自动化接收者；当计划作业应主动发送到某个 DM 时，请设置 `delivery.to` 或配置频道的 `allowFrom` 条目。

失败通知遵循单独的目标路径：

- `cron.failureDestination` 设置失败通知的全局默认值。
- `job.delivery.failureDestination` 可按作业覆盖该设置。
- 如果两者都未设置，且作业已经通过 `announce` 交付，那么失败通知现在会回退到该主 announce 目标。
- `delivery.failureDestination` 仅在 `sessionTarget="isolated"` 的作业上受支持，除非主要交付模式是 `webhook`。
- `failureAlert.includeSkipped: true` 可让作业或全局 cron 告警策略纳入重复的跳过运行告警。跳过运行会保留单独的连续跳过计数，因此不会影响执行错误退避。

## CLI 示例

<Tabs>
  <Tab title="一次性提醒">
    ```bash
    openclaw cron add \
      --name "Calendar check" \
      --at "20m" \
      --session main \
      --system-event "下一次 heartbeat：检查日历。"
      --wake now
    ```
  </Tab>
  <Tab title="循环隔离作业">
    ```bash
    openclaw cron add \
      --name "Morning brief" \
      --cron "0 7 * * *" \
      --tz "America/Los_Angeles" \
      --session isolated \
      --message "总结夜间更新。" \
      --announce \
      --channel slack \
      --to "channel:C1234567890"
    ```
  </Tab>
  <Tab title="模型与思考覆盖">
    ```bash
    openclaw cron add \
      --name "Deep analysis" \
      --cron "0 6 * * 1" \
      --tz "America/Los_Angeles" \
      --session isolated \
      --message "每周对项目进展进行深度分析。" \
      --model "opus" \
      --thinking high \
      --announce
    ```
  </Tab>
</Tabs>

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
      -d '{"text":"收到新邮件","mode":"now"}'
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
      -d '{"message":"总结收件箱","name":"Email","model":"openai/gpt-5.4"}'
    ```

    字段：`message`（必填）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`fallbacks`、`thinking`、`timeoutSeconds`。

  </Accordion>
  <Accordion title="映射 hook（POST /hooks/<name>）">
    自定义 hook 名称通过配置中的 `hooks.mappings` 解析。映射可以使用模板或代码转换，将任意载荷转换为 `wake` 或 `agent` 动作。
  </Accordion>
</AccordionGroup>

<Warning>
将 hook 端点置于 loopback、tailnet 或受信任的反向代理之后。

- 使用专用的 hook token；不要复用 gateway 认证 token。
- 将 `hooks.path` 保持在专用子路径下；`/` 会被拒绝。
- 设置 `hooks.allowedAgentIds` 以限制显式 `agentId` 路由。
- 保持 `hooks.allowRequestSessionKey=false`，除非你需要调用者选择会话。
- 如果启用了 `hooks.allowRequestSessionKey`，还要设置 `hooks.allowedSessionKeyPrefixes` 以约束允许的会话键形状。
- Hook 载荷默认会被安全边界包裹。

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

这会写入 `hooks.gmail` 配置，启用 Gmail 预设，并使用 Tailscale Funnel 作为推送端点。

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
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

## 管理作业

```bash
# 列出所有作业
openclaw cron list

# 以 JSON 形式获取一个已存储的作业
openclaw cron get <jobId>

# 显示一个作业，包括解析后的传递路由
openclaw cron show <jobId>

# 编辑一个作业
openclaw cron edit <jobId> --message "Updated prompt" --model "opus"

# 立即强制运行一个作业
openclaw cron run <jobId>

# 仅在到期时运行
openclaw cron run <jobId> --due

# 查看运行历史
openclaw cron runs --id <jobId> --limit 50

# 删除一个作业
openclaw cron remove <jobId>

# 代理选择（多代理设置）
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops
openclaw cron edit <jobId> --clear-agent
```

<Note>
模型覆盖说明：

- `openclaw cron add|edit --model ...` 会更改作业选择的模型。
- 如果该模型被允许，那么确切的提供方/模型会进入隔离代理运行。
- 如果它不被允许或无法解析，cron 会以明确的验证错误使运行失败。
- 已配置的回退链仍然适用，因为 cron 的 `--model` 是作业主模型，而不是会话 `/model` 覆盖。
- 载荷 `fallbacks` 会替换该作业已配置的回退；`fallbacks: []` 会禁用回退并使运行严格执行。
- 如果没有显式或已配置的回退列表，普通 `--model` 不会作为静默的额外重试目标回落到代理主模型。

</Note>

## 配置

```json5
{
  cron: {
    enabled: true,
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1,
    retry: {
      maxAttempts: 3,
      backoffMs: [60000, 120000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "server_error"],
    },
    webhookToken: "replace-with-dedicated-webhook-token",
    sessionRetention: "24h",
    runLog: { maxBytes: "2mb", keepLines: 2000 },
  },
}
```

`maxConcurrentRuns` 同时限制计划中的 cron 派发和隔离代理轮次执行。隔离 cron 代理轮次在内部使用队列专用的 `cron-nested` 执行通道，因此提高该值可让彼此独立的 cron LLM 运行并行推进，而不只是启动它们各自外层的 cron 包装器。共享的非 cron `nested` 通道不会因该设置而扩展。

运行时状态侧车文件由 `cron.store` 派生：像 `~/clawd/cron/jobs.json` 这样的 `.json` 存储会使用 `~/clawd/cron/jobs-state.json`，而不带 `.json` 后缀的存储路径会追加 `-state.json`。

如果你手动编辑 `jobs.json`，请不要将 `jobs-state.json` 纳入源代码管理。OpenClaw 使用该侧车文件保存待处理槽位、活动标记、上次运行元数据，以及调度器判断外部编辑的作业何时需要新的 `nextRunAtMs` 的调度身份信息。

禁用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion title="重试行为">
    **一次性重试**：瞬态错误（速率限制、过载、网络、服务器错误）最多重试 3 次，采用指数退避。永久错误会立即禁用。

    **循环重试**：重试之间采用指数退避（30 秒到 60 分钟）。退避会在下一次成功运行后重置。

  </Accordion>
  <Accordion title="维护">
    `cron.sessionRetention`（默认 `24h`）会清理隔离运行会话条目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 会自动清理运行日志文件。
  </Accordion>
</AccordionGroup>

## 故障排除

### 命令阶梯

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
    - 确认 Gateway 持续运行。
    - 对于 `cron` 调度，验证时区（`--tz`）与主机时区是否一致。
    - 运行输出中的 `reason: not-due` 表示已使用 `openclaw cron run <jobId> --due` 检查手动运行，但该任务当时还未到执行时间。

  </Accordion>
  <Accordion title="Cron 已触发但未发送">
    - 传递模式 `none` 表示不期望有 runner 回退发送。只要存在聊天路由，agent 仍可使用 `message` 工具直接发送。
    - 缺少/无效的传递目标（`channel`/`to`）表示已跳过外发。
    - 对于 Matrix，复制的或旧版任务如果 `delivery.to` 房间 ID 使用了小写，可能会失败，因为 Matrix 房间 ID 区分大小写。请将任务编辑为 Matrix 中精确的 `!room:server` 或 `room:!room:server` 值。
    - 渠道认证错误（`unauthorized`、`Forbidden`）表示传递被凭据阻止。
    - 如果隔离运行只返回静默令牌（`NO_REPLY` / `no_reply`），OpenClaw 会抑制直接外发，也会抑制回退的排队摘要路径，因此不会向聊天中发布任何内容。
    - 如果应由 agent 自行向用户发送消息，请检查该任务是否具有可用路由（`channel: "last"` 且存在先前聊天，或显式的 channel/target）。

  </Accordion>
  <Accordion title="Cron 或心跳似乎阻止了 /new-style rollover">
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

- [Automation](/automation) — 一览所有自动化机制
- [Background Tasks](/automation/tasks) — cron 执行的任务账本
- [Heartbeat](/gateway/heartbeat) — 周期性的主会话轮次
- [Timezone](/concepts/timezone) — 时区配置
