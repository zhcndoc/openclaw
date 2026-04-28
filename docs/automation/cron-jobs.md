---
summary: "Gateway 调度器的计划任务、Webhooks 和 Gmail PubSub 触发器"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and cron for scheduled tasks
title: "计划任务"
---

Cron 是 Gateway 内置的调度器。它会持久化任务，在正确的时间唤醒代理，并且可以将输出返回到聊天频道或 webhook 端点。

## 快速开始

```bash
# 添加一次性提醒
openclaw cron add \
  --name "Reminder" \
  --at "2026-02-01T16:00:00Z" \
  --session main \
  --system-event "Reminder: check the cron docs draft" \
  --wake now \
  --delete-after-run

# 检查你的任务
openclaw cron list
openclaw cron show <job-id>

- Cron 在 Gateway 进程内部运行（不是在模型内部）。
- 任务定义会持久化到 `~/.openclaw/cron/jobs.json`，因此重启不会丢失计划。
- 运行时执行状态会保存在同目录下的 `~/.openclaw/cron/jobs-state.json`。如果你在 git 中跟踪 cron 定义，请跟踪 `jobs.json` 并将 `jobs-state.json` 加入 gitignore。
- 在拆分之后，较旧的 OpenClaw 版本仍然可以读取 `jobs.json`，但可能会把任务视为新任务，因为运行时字段现在位于 `jobs-state.json` 中。
- 当在 Gateway 运行中或停止时编辑 `jobs.json`，OpenClaw 会将变更后的调度字段与待处理的运行时槽位元数据进行比较，并清除过期的 `nextRunAtMs` 值。仅格式化或仅键顺序变化的重写会保留待处理槽位。
- 所有 cron 执行都会创建 [后台任务](/automation/tasks) 记录。
- 一次性任务（`--at`）在成功后默认自动删除。
- 隔离的 cron 运行会在任务完成时尽最大努力关闭该 `cron:<jobId>` 会话下已跟踪的浏览器标签页/进程，因此分离的浏览器自动化不会留下孤儿进程。
- 隔离的 cron 运行也会防止过时的确认回复。如果第一个结果只是一个中间状态更新（如 `on it`、`pulling everything together` 以及类似提示），并且没有任何后代子代理运行仍然负责最终答案，OpenClaw 会在交付前重新提示一次以获取实际结果。
- 隔离的 cron 运行会优先使用嵌入式运行中结构化的执行拒绝元数据，然后回退到已知的最终摘要/输出标记，例如 `SYSTEM_RUN_DENIED` 和 `INVALID_REQUEST`，因此被阻止的命令不会被报告为成功运行。
- 即使没有生成回复载荷，隔离的 cron 运行也会将运行级代理失败视为任务错误，因此模型/提供商失败会增加错误计数并触发失败通知，而不是将任务清除为成功。

<a id="maintenance"></a>

Cron 的任务协调由运行时拥有：只要 Cron 运行时仍将该任务跟踪为运行中，活动的 Cron 任务就会保持存活，即使旧的子会话行仍然存在。一旦运行时不再拥有该任务且 5 分钟宽限期窗口过期，维护程序可以将任务标记为 `lost`。

## 调度类型

| 类型    | CLI 标志  | 描述                                             |
| ------- | --------- | ------------------------------------------------------- |
| `at`    | `--at`    | 一次性时间戳（ISO 8601 或相对时间如 `20m`）    |
| `every` | `--every` | 固定间隔                                          |
| `cron`  | `--cron`  | 5 字段或 6 字段 cron 表达式，带可选 `--tz` |

不带时区的时间戳被视为 UTC。添加 `--tz America/New_York` 以进行本地挂钟调度。

重复的整点表达式会自动错峰最多 5 分钟，以减少负载峰值。使用 `--exact` 强制精确计时，或使用 `--stagger 30s` 指定窗口。

### 月份日期和星期日期使用“或”逻辑

Cron 表达式由 [croner](https://github.com/Hexagon/croner) 解析。当月份日期和星期日期字段都不是通配符时，croner 在 **任一** 字段匹配时匹配——而不是两者都匹配。这是标准的 Vixie cron 行为。

```
# 意图："15 日上午 9 点，且仅限周一"
# 实际："每月 15 日上午 9 点，以及每周一上午 9 点"
0 9 15 * 1
```

这会导致每月触发约 5–6 次，而不是每月 0–1 次。OpenClaw 在此处使用 Croner 的默认“或”行为。若要同时满足两个条件，请使用 Croner 的 `+` 星期修饰符（`0 9 15 * +1`）或在任务的提示或命令中在一个字段上调度并守卫另一个字段。

## 执行风格

| 风格           | `--session` 值   | 运行于                  | 最适合                        |
| --------------- | ------------------- | ------------------------ | ------------------------------- |
| 主会话    | `main`              | 下一次心跳轮次      | 提醒、系统事件        |
| 隔离        | `isolated`          | 专用 `cron:<jobId>` | 报告、后台杂务      |
| 当前会话 | `current`           | 创建时绑定   | 感知上下文的重复工作    |
| 自定义会话  | `session:custom-id` | 持久化命名会话 | 基于历史构建的工作流 |

**主会话** 任务将系统事件入队并可选地唤醒心跳（`--wake now` 或 `--wake next-heartbeat`）。**隔离** 任务使用新会话运行专用的代理轮次。**自定义会话**（`session:xxx`）在运行之间持久化上下文，启用如基于先前摘要构建的每日站会等工作流。

对于隔离任务，运行时销毁现在包括对该 cron 会话的尽力浏览器清理。清理失败会被忽略，因此实际的 cron 结果仍然生效。

隔离的 cron 运行还会通过共享的运行时清理路径处理为该任务创建的任何捆绑 MCP 运行时实例。这与主会话和自定义会话 MCP 客户端的销毁方式一致，因此隔离的 cron 任务不会在运行之间泄漏 stdio 子进程或长期存在的 MCP 连接。

当隔离的 cron 运行协调子代理时，交付也会优先选择最终的后代输出，而不是过时的父级中间文本。如果后代仍在运行，OpenClaw 会抑制该部分父级更新，而不是直接发布它。

### 隔离任务的负载选项

- `--message`: 提示文本（隔离任务必需）
- `--model` / `--thinking`: 模型和思考级别覆盖
- `--light-context`: 跳过工作区引导文件注入
- `--tools exec,read`: 限制任务可以使用的工具

`--model` 使用该任务选定的允许模型。如果请求的模型不被允许，cron 会记录警告并回退到任务的代理/默认模型选择。配置的回退链仍然适用，但没有明确每任务回退列表的普通模型覆盖不再将代理主模型作为隐藏的额外重试目标附加。

`--model` 使用该任务选定的允许模型。它不同于聊天会话中的 `/model` 覆盖：当任务主模型失败时，配置的回退链仍然适用。如果请求的模型不被允许，cron 会记录警告并回退到任务的代理/默认模型选择。

Cron 任务也可以携带负载级别的 `fallbacks`。存在时，该列表会替换该任务的配置回退链。如果你希望严格的 cron 运行只尝试所选模型，请在任务负载/API 中使用 `fallbacks: []`。如果任务有 `--model` 但既没有负载回退也没有配置回退，OpenClaw 会传递一个显式的空回退覆盖，因此代理主模型不会作为隐藏的额外重试目标附加。

1. Gmail hook 模型覆盖（当运行来自 Gmail 且该覆盖被允许时）
2. 每任务负载 `model`
3. 存储的 cron 会话模型覆盖
4. 代理/默认模型选择

快速模式也遵循解析后的实时选择。如果选定的模型配置包含 `params.fastMode`，隔离 cron 默认使用该设置。存储的会话 `fastMode` 覆盖在任何方向上仍优先于配置。

如果隔离运行遇到实时模型切换交接，cron 会使用切换后的提供商/模型重试，并在重试前持久化该实时选择。当切换也携带新的认证配置文件时，cron 也会持久化该认证配置文件覆盖。重试是有界的：在初始尝试加上 2 次切换重试后，cron 会中止而不是无限循环。

## 交付与输出

| Mode       | What happens                                                        |
| ---------- | ------------------------------------------------------------------- |
| `announce` | 如果代理未发送，回退交付最终文本到目标位置 |
| `webhook`  | 将完成事件载荷 POST 到一个 URL                                  |
| `none`     | 无运行器回退交付                                                 |

使用 `--announce --channel telegram --to "-1001234567890"` 进行频道交付。对于 Telegram 论坛主题，使用 `-1001234567890:topic:123`；直接 RPC/config 调用方也可以将 `delivery.threadId` 作为字符串或数字传入。Slack/Discord/Mattermost 目标应使用显式前缀（`channel:<id>`、`user:<id>`）。Matrix 房间 ID 区分大小写；请使用准确的房间 ID 或 `room:!room:server` 形式。

对于隔离任务，聊天交付是共享的。如果存在聊天路由，即使任务使用 `--no-deliver`，代理也可以使用 `message` 工具。如果代理发送到了配置的/当前目标，OpenClaw 会跳过回退 announce。否则，`announce`、`webhook` 和 `none` 只控制运行器在代理轮次结束后如何处理最终回复。

失败通知遵循单独的目标路径：

- `cron.failureDestination` 设置失败通知的全局默认值。
- `job.delivery.failureDestination` 覆盖每任务的该设置。
- 如果均未设置且任务已经通过 `announce` 交付，失败通知现在回退到该主通知目标。
- `delivery.failureDestination` 仅在 `sessionTarget="isolated"` 任务上支持，除非主交付模式是 `webhook`。

- `cron.failureDestination` 为失败通知设置全局默认值。
- `job.delivery.failureDestination` 为每个任务覆盖该设置。
- 如果两者都未设置且任务已经通过 `announce` 交付，失败通知现在会回退到该主 announce 目标。
- `delivery.failureDestination` 仅在 `sessionTarget="isolated"` 任务上支持，除非主交付模式是 `webhook`。
- `failureAlert.includeSkipped: true` 可让任务或全局 cron 告警策略纳入重复的跳过运行告警。跳过运行会保留单独的连续跳过计数，因此不会影响执行错误退避。

一次性提醒（主会话）：

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

带交付的重复隔离任务：

```bash
openclaw cron add \
  --name "Morning brief" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize overnight updates." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

带模型和思考覆盖的隔离任务：

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis of project progress." \
  --model "opus" \
  --thinking high \
  --announce
```

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

每个请求必须通过头部包含 hook token：

- `Authorization: Bearer <token>`（推荐）
- `x-openclaw-token: <token>`

查询字符串 token 会被拒绝。

### POST /hooks/wake

为主会话入队一个系统事件：

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

- `text`（必需）：事件描述
- `mode`（可选）：`now`（默认）或 `next-heartbeat`

### POST /hooks/agent

    字段：`message`（必需）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`fallbacks`、`thinking`、`timeoutSeconds`。

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4"}'
```

### 映射 Hooks (POST /hooks/\<name\>)

自定义 hook 名称通过配置中的 `hooks.mappings` 解析。映射可以使用模板或代码转换将任意负载转换为 `wake` 或 `agent` 操作。

### 安全性

- 将 hook 端点保持在环回、tailnet 或受信任的反向代理之后。
- 使用专用的 hook token；不要复用 gateway auth token。
- 将 `hooks.path` 保持在专用的子路径上；`/` 会被拒绝。
- 设置 `hooks.allowedAgentIds` 以限制明确的 `agentId` 路由。
- 保持 `hooks.allowRequestSessionKey=false`，除非你需要调用者选择的会话。
- 如果启用 `hooks.allowRequestSessionKey`，还要设置 `hooks.allowedSessionKeyPrefixes` 以约束允许的会话密钥形状。
- Hook 负载默认包裹有安全边界。

## Gmail PubSub 集成

通过 Google PubSub 将 Gmail 收件箱触发器连接到 OpenClaw。

**先决条件**：`gcloud` CLI、`gog` (gogcli)、OpenClaw hooks 启用、用于公共 HTTPS 端点的 Tailscale。

### 向导设置（推荐）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

这会写入 `hooks.gmail` 配置，启用 Gmail 预设，并使用 Tailscale Funnel 作为推送端点。

### Gateway 自动启动

当 `hooks.enabled=true` 且设置了 `hooks.gmail.account` 时，Gateway 会在启动时启动 `gog gmail watch serve` 并自动续订监视。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以退出。

### 手动一次性设置

1. 选择拥有 `gog` 使用的 OAuth 客户端的 GCP 项目：

```bash
gcloud auth login
gcloud config set project <project-id>
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

2. 创建主题并授予 Gmail 推送权限：

```bash
gcloud pubsub topics create gog-gmail-watch
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

3. 启动监视：

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

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

## 管理任务

```bash
# 列出所有任务
openclaw cron list

# 查看一个任务，包括解析后的交付路由
openclaw cron show <jobId>

# 编辑任务
openclaw cron edit <jobId> --message "Updated prompt" --model "opus"

# 立即强制运行任务
openclaw cron run <jobId>

# 仅在到期时运行
openclaw cron run <jobId> --due

# 查看运行历史
openclaw cron runs --id <jobId> --limit 50

# 删除任务
openclaw cron remove <jobId>

# 代理选择（多代理设置）
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops
openclaw cron edit <jobId> --clear-agent
```

<Note>
模型覆盖说明：

- `openclaw cron add|edit --model ...` 会更改任务选定的模型。
- 如果该模型被允许，那么该确切的 provider/model 会进入隔离的代理运行。
- 如果不被允许，cron 会发出警告，并回退到任务的代理/默认模型选择。
- 配置的回退链仍然适用，因为 cron `--model` 是任务主项，而不是会话的 `/model` 覆盖。
- 载荷中的 `fallbacks` 会替换该任务配置的回退；`fallbacks: []` 会禁用回退并使运行严格执行。
- 仅使用 `--model`，如果没有显式或配置的回退列表，不会静默地回退到代理主模型作为额外的重试目标。
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

`maxConcurrentRuns` 会同时限制计划中的 cron 分发和隔离的代理轮次执行。隔离的 cron 代理轮次在内部使用队列专用的 `cron-nested` 执行通道，因此提高这个值可以让彼此独立的 cron LLM 运行并行推进，而不只是启动它们各自的外层 cron 包装器。共享的非 cron `nested` 通道不会因该设置而扩展。

运行时状态 sidecar 由 `cron.store` 派生：像 `~/clawd/cron/jobs.json` 这样的 `.json` 存储会使用 `~/clawd/cron/jobs-state.json`，而没有 `.json` 后缀的存储路径则会追加 `-state.json`。

如果你手动编辑 `jobs.json`，请不要将 `jobs-state.json` 纳入源代码管理。OpenClaw 使用这个 sidecar 来保存待处理槽位、活动标记、最近运行元数据，以及调度标识；该调度标识会告诉调度器某个外部编辑过的任务何时需要一个新的 `nextRunAtMs`。

禁用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

**一次性重试**：瞬时错误（速率限制、过载、网络、服务器错误）最多重试 3 次，采用指数退避。永久错误立即禁用。

**周期性重试**：重试之间采用指数退避（30 秒到 60 分钟）。下次成功运行后退避重置。

**维护**：`cron.sessionRetention`（默认 `24h`）清理隔离的运行会话条目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 自动清理运行日志文件。

## 故障排查

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

### Cron 未触发

- 检查 `cron.enabled` 和 `OPENCLAW_SKIP_CRON` 环境变量。
- 确认网关正在持续运行。
- 对于 `cron` 计划，验证时区（`--tz`）与主机时区是否一致。
- 运行输出中的 `reason: not-due` 意味着手动运行已通过 `openclaw cron run <jobId> --due` 检查，且任务尚未到期。

### Cron 已触发但无交付

- Delivery mode `none` 表示不期望有 runner fallback 发送。只要存在可用的聊天路由，agent 仍然可以使用 `message` 工具直接发送。
- 目标交付缺失/无效（`channel`/`to`）意味着已跳过外发。
- 渠道认证错误（`unauthorized`、`Forbidden`）表示交付被凭据阻止。
- 如果隔离运行只返回静默 token（`NO_REPLY` / `no_reply`），OpenClaw 会抑制直接外发，也会抑制备用的排队摘要路径，因此不会向聊天中发布任何内容。
- 如果 agent 需要自行向用户发送消息，请检查该任务是否具有可用路由（`channel: "last"` 且此前有聊天记录，或显式的 channel/target）。

### 时区陷阱

- 不带 `--tz` 的 Cron 使用网关主机时区。
- 不带时区的 `at` 计划被视为 UTC。
- 心跳 `activeHours` 使用配置的时区解析。

## 相关内容

- [自动化与任务](/automation) — 所有自动化机制一览
- [后台任务](/automation/tasks) — cron 执行的任务记录
- [心跳](/gateway/heartbeat) — 定期主会话轮换
- [时区](/concepts/timezone) — 时区配置
