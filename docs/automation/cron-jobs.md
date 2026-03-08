---
summary: "网关调度器的 Cron 作业 + 唤醒"
read_when:
  - 调度后台作业或唤醒事件
  - 配置应与心跳一起或并行运行的自动化流程
  - 在心跳与 cron 之间选择调度任务时
title: "Cron 作业"
---

# Cron 作业（网关调度器）

> **Cron 与心跳的区别？** 请参见 [Cron vs Heartbeat](/automation/cron-vs-heartbeat) 以获取何时使用的指导。

Cron 是网关内置的调度器。它会持久化作业，准时唤醒代理，并且可以选择将输出发送回聊天。

如果你想要实现“每天早上运行”或“20 分钟后唤醒代理”，cron 是实现的机制。

故障排查：[/automation/troubleshooting](/automation/troubleshooting)

## TL;DR

- Cron 运行在 **网关内部**（而非模型内部）。
- 作业持久化于 `~/.openclaw/cron/`，重启不会丢失计划。
- 提供两种执行方式：
  - **主会话**：排入系统事件队列，然后在下一次心跳执行。
  - **隔离执行**：在 `cron:<jobId>` 中运行专门的代理回合，默认或无公告方式发送结果。
- 唤醒是首要功能：作业可以请求“立即唤醒”或“下一次心跳”。
- Webhook 发布按作业独立配置，使用 `delivery.mode = "webhook"` + `delivery.to = "<url>"`。
- 保留对配置了 `cron.webhook` 且存储了 `notify: true` 作业的旧版兼容，建议迁移到 webhook 交付模式。

## 快速开始（可操作示例）

创建一个一次性提醒，确认其存在，并立即运行：

```bash
openclaw cron add \
  --name "Reminder" \
  --at "2026-02-01T16:00:00Z" \
  --session main \
  --system-event "Reminder: check the cron docs draft" \
  --wake now \
  --delete-after-run

openclaw cron list
openclaw cron run <job-id>
openclaw cron runs --id <job-id>
```

调度一个带有交付的周期性隔离作业：

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

## 工具调用等效（网关 cron 工具）

有关规范的 JSON 结构和示例，请参见 [工具调用的 JSON 架构](/automation/cron-jobs#json-schema-for-tool-calls)。

## Cron 作业存储位置

Cron 作业默认持久化于网关主机的 `~/.openclaw/cron/jobs.json`。
网关启动时加载此文件至内存，变更时写回文件，因此仅在网关停止时手动编辑文件才安全。
更推荐使用 `openclaw cron add/edit` 或 cron 工具调用 API 进行操作。

## 面向初学者的概述

将 cron 作业理解为：**何时运行** + **做什么** 。

1. **选择调度时间**
   - 一次性提醒 → `schedule.kind = "at"` （CLI 为 `--at`）
   - 重复作业 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果 ISO 时间戳未包含时区，则默认视为 **UTC**。

2. **选择运行位置**
   - `sessionTarget: "main"` → 在下次心跳期间于主会话上下文执行。
   - `sessionTarget: "isolated"` → 在专用的 `cron:<jobId>` 会话中运行代理回合。

3. **选择运行负载**
   - 主会话 → `payload.kind = "systemEvent"`
   - 隔离会话 → `payload.kind = "agentTurn"`

可选：一次性作业（`schedule.kind = "at"`）默认成功后删除。设置 `deleteAfterRun: false` 可保留（成功后自动禁用）。

## 概念

### 作业

Cron 作业是一个存储记录，包含：

- 一个 **调度计划**（何时执行），
- 一个 **负载**（做什么），
- 可选的 **交付模式**（`announce`、`webhook` 或 `none`）。
- 可选的 **代理绑定**（`agentId`）：在指定代理下运行作业；若缺失或未知，网关回退为默认代理。

作业由稳定的 `jobId` 标识（CLI/网关 API 使用）。
代理工具调用中，`jobId` 为规范字段；为兼容接受旧字段 `id`。
一次性作业默认成功后自删除；设置 `deleteAfterRun: false` 可保留。

### 调度计划

Cron 支持三种调度方式：

- `at`：一次性时间点，使用 `schedule.at` （ISO 8601 格式）。
- `every`：固定间隔（毫秒）。
- `cron`：5 字段 cron 表达式（或带秒的 6 字段）及可选 IANA 时区。

Cron 表达式使用 `croner` 解析。若未指定时区，则使用网关主机本地时区。

为减少大量网关在整点负载峰值，OpenClaw 在重复整点表达式（如 `0 * * * *`、`0 */2 * * *`）上应用了最多 5 分钟的确定性错峰窗口。
固定小时表达式如 `0 7 * * *` 保持精确。

对任意 cron 计划，可设置显式错峰窗口 `schedule.staggerMs` （`0` 表示精确时间）。
CLI 快捷方式：

- `--stagger 30s`（或 `1m`、`5m`）设置显式错峰窗口。
- `--exact` 强制 `staggerMs = 0`。

### 主会话与隔离执行

#### 主会话作业（系统事件）

主会话作业将系统事件排队，且可唤醒心跳执行。
必须使用 `payload.kind = "systemEvent"`。

- `wakeMode: "now"`（默认）：事件触发立即心跳执行。
- `wakeMode: "next-heartbeat"`：事件等待下次预定的心跳。

当你需要正常的心跳提示和主会话上下文时，这种方式最合适。
详见 [Heartbeat](/gateway/heartbeat)。

#### 隔离作业（专用 cron 会话）

隔离作业在 `cron:<jobId>` 会话中运行专用代理回合。

主要特点：

- 提示文本带前缀 `[cron:<jobId> <job name>]` 便于追踪。
- 每次运行使用全新会话 ID（不会继承先前对话）。
- 默认行为：若无 `delivery` 配置，隔离作业会公告摘要（即 `delivery.mode = "announce"`）。
- `delivery.mode` 决定交付行为：
  - `announce`：将摘要发送至目标频道，并同时向主会话发布简要摘要。
  - `webhook`：若完成事件包含摘要，则 POST 负载到 `delivery.to` 指定的 URL。
  - `none`：仅内部运行，无交付，无主会话摘要。
- `wakeMode` 控制主会话摘要发布时间：
  - `now`：立即触发心跳。
  - `next-heartbeat`：等待下次心跳执行。

隔离作业适用于噪声大、频繁执行或“后台杂务”，避免干扰主聊天记录。

### 负载结构（运行内容）

支持两种负载类型：

- `systemEvent`：仅主会话，路由到心跳提示。
- `agentTurn`：仅隔离会话，运行专用代理回合。

`agentTurn` 常用字段：

- `message`：必需，文本提示。
- `model` / `thinking`：可选覆盖（见下文）。
- `timeoutSeconds`：可选超时覆盖。
- `lightContext`：轻量级引导模式，适用于不需要工作空间引导文件注入的作业。

交付配置：

- `delivery.mode`：`none`｜`announce`｜`webhook`。
- `delivery.channel`：`last` 或具体频道。
- `delivery.to`：频道特定目标（公告）或 webhook URL（webhook 模式）。
- `delivery.bestEffort`：公告失败时避免导致作业失败。

公告交付抑制本次执行的消息工具发送；使用 `delivery.channel` / `delivery.to` 指定的聊天发送。
当 `delivery.mode = "none"` 时，不向主会话发布摘要。

隔离作业若未指定 `delivery`，OpenClaw 默认为 `announce`。

#### 公告交付流程

当 `delivery.mode = "announce"` 时，cron 通过出站频道适配器直接发送。
不会启动主代理制作或转发消息。

具体行为：

- 内容：使用隔离执行的出站负载（文本/媒体），带正常分块及频道格式化。
- 心跳专用响应（`HEARTBEAT_OK` 无实际内容）不交付。
- 若隔离执行已用消息工具向同目标发送消息，则跳过交付避免重复。
- 缺失或无效交付目标时作业失败，除非 `delivery.bestEffort = true`。
- 仅 `delivery.mode = "announce"` 会向主会话发布简短摘要。
- 主会话摘要受 `wakeMode` 控制：`now` 触发立即心跳，`next-heartbeat` 等待下次心跳。

#### Webhook 交付流程

当 `delivery.mode = "webhook"` 时，完成事件包含摘要时，cron 将该事件负载 POST 至 `delivery.to`。

具体行为：

- 端点必须是有效的 HTTP(S) URL。
- webhook 模式不尝试频道交付。
- webhook 模式不发布主会话摘要。
- 如设置了 `cron.webhookToken`，则授权头为 `Authorization: Bearer <cron.webhookToken>`。
- 旧版兼容：存储的通知作业带 `notify: true` 仍会推送到 `cron.webhook`（若配置），伴随警告，建议迁移至 `delivery.mode = "webhook"`。

### 模型及思考级别覆盖

隔离作业 (`agentTurn`) 可覆盖模型及思考级别：

- `model`：提供商/模型字符串（例如 `anthropic/claude-sonnet-4-20250514`）或别名（如 `opus`）
- `thinking`：思考级别（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`；仅 GPT-5.2 + Codex 模型支持）

注意：你也可以设置主会话作业的 `model`，但这会更改共享的主会话模型。我们建议仅对隔离作业使用模型覆盖，避免意外上下文切换。

覆盖优先级：

1. 作业负载覆盖（最高）
2. 钩子专属默认（例如 `hooks.gmail.model`）
3. 代理配置默认

### 轻量级引导上下文

隔离作业 (`agentTurn`) 可以设置 `lightContext: true` 以使用轻量级引导上下文。

- 适用于不需要工作空间引导文件注入的定时杂务。
- 实际上，嵌入式运行时以 `bootstrapContextMode: "lightweight"` 运行，故意保持 cron 引导上下文为空。
- CLI 等效：`openclaw cron add --light-context ...` 和 `openclaw cron edit --light-context`。

### 交付（频道 + 目标）

隔离作业可通过顶层 `delivery` 配置将输出发送至频道：

- `delivery.mode`：`announce`（频道交付）、`webhook`（HTTP POST）或 `none`
- `delivery.channel`：`whatsapp` / `telegram` / `discord` / `slack` / `mattermost`（插件）/ `signal` / `imessage` / `last`
- `delivery.to`：频道特定接收目标

`announce` 交付仅对隔离作业有效 (`sessionTarget: "isolated"`)。
`webhook` 交付对主会话和隔离作业均有效。

若未指定 `delivery.channel` 或 `delivery.to`，cron 会回退使用主会话的“最后路由”（代理最后回复的目标）。

目标格式提示：

- Slack/Discord/Mattermost（插件）目标需使用明确前缀（如 `channel:<id>`、`user:<id>`）以避免歧义。
- Telegram 主题应使用 `:topic:` 形式（见下文）。

#### Telegram 交付目标（主题/论坛线程）

Telegram 支持通过 `message_thread_id` 发送论坛主题。Cron 交付时，可将主题/线程编码入 `to` 字段：

- `-1001234567890`（仅聊天 ID）
- `-1001234567890:topic:123`（首选：明确主题标记）
- `-1001234567890:123`（简写：数字后缀）

也接受带前缀的目标，如 `telegram:...` / `telegram:group:...`：

- `telegram:group:-1001234567890:topic:123`

## 工具调用的 JSON 架构

当直接调用网关 `cron.*` 工具时使用这些结构（代理工具调用或 RPC）。
CLI 标志接受诸如 `20m` 的人类可读时长，工具调用应使用 ISO 8601 字符串（用于 `schedule.at`）和毫秒数（用于 `schedule.everyMs`）。

### cron.add 参数示例

一次性主会话作业（系统事件）：

```json
{
  "name": "Reminder",
  "schedule": { "kind": "at", "at": "2026-02-01T16:00:00Z" },
  "sessionTarget": "main",
  "wakeMode": "now",
  "payload": { "kind": "systemEvent", "text": "Reminder text" },
  "deleteAfterRun": true
}
```

周期性隔离作业（带交付）：

```json
{
  "name": "Morning brief",
  "schedule": { "kind": "cron", "expr": "0 7 * * *", "tz": "America/Los_Angeles" },
  "sessionTarget": "isolated",
  "wakeMode": "next-heartbeat",
  "payload": {
    "kind": "agentTurn",
    "message": "Summarize overnight updates.",
    "lightContext": true
  },
  "delivery": {
    "mode": "announce",
    "channel": "slack",
    "to": "channel:C1234567890",
    "bestEffort": true
  }
}
```

说明：

- `schedule.kind`：`at`（带 `at`）、`every`（带 `everyMs`）、或 `cron`（带 `expr` 和可选 `tz`）。
- `schedule.at` 接受 ISO 8601 格式（时区可选，不指定时视为 UTC）。
- `everyMs` 为毫秒。
- `sessionTarget` 必须是 `"main"` 或 `"isolated"`，且与 `payload.kind` 匹配。
- 可选字段：`agentId`、`description`、`enabled`、`deleteAfterRun`（`at` 默认 true）、`delivery`。
- `wakeMode` 省略时默认 `"now"`。

### cron.update 参数示例

```json
{
  "jobId": "job-123",
  "patch": {
    "enabled": false,
    "schedule": { "kind": "every", "everyMs": 3600000 }
  }
}
```

说明：

- `jobId` 为规范字段，兼容接受 `id`。
- 使用 `agentId: null` 清除代理绑定。

### cron.run 和 cron.remove 参数示例

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 存储与历史

- 作业存储：`~/.openclaw/cron/jobs.json`（网关管理的 JSON 文件）
- 运行历史：`~/.openclaw/cron/runs/<jobId>.jsonl`（JSONL 文件，自动按大小和行数修剪）
- 隔离 cron 运行会话存储于 `sessions.json`，由 `cron.sessionRetention` 配置修剪（默认 `24h`，设置为 `false` 禁用）
- 覆盖存储路径：配置项 `cron.store`

## 重试策略

当作业失败时，OpenClaw 将错误分为**临时错误**（可重试）和**永久错误**（立即禁用）。

### 临时错误（重试）

- 速率限制（429、请求过多、资源耗尽）
- 提供商过载（例如 Anthropic `529 overloaded_error`，过载回退摘要）
- 网络错误（超时、ECONNRESET、fetch 失败、套接字错误）
- 服务器错误（5xx）
- Cloudflare 相关错误

### 永久错误（不重试）

- 认证失败（无效 API 密钥、未授权）
- 配置或校验错误
- 其他非临时错误

### 默认行为（无配置时）

**一次性作业（`schedule.kind: "at"`）：**

- 临时错误：最多重试 3 次，使用指数退避（30 秒 → 1 分钟 → 5 分钟）。
- 永久错误：立即禁用作业。
- 成功或跳过：禁用作业（如果 `deleteAfterRun: true` 则删除）。

**周期性作业（`cron` / `every`）：**

- 任何错误：应用指数退避 （30 秒 → 1 分钟 → 5 分钟 → 15 分钟 → 60 分钟）后再执行下次计划。
- 作业保持启用状态；下次成功执行后重置退避计数。

通过配置 `cron.retry` 可以覆盖默认策略（详见 [配置](/automation/cron-jobs#configuration)）。

## 配置示例

```json5
{
  cron: {
    enabled: true, // 默认 true
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1, // 默认 1
    // 可选：覆盖一次性作业重试策略
    retry: {
      maxAttempts: 3,
      backoffMs: [60000, 120000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "server_error"],
    },
    webhook: "https://example.invalid/legacy", // 已弃用，用于旧有配置了 notify:true 的作业
    webhookToken: "replace-with-dedicated-webhook-token", // webhook 模式的可选 Bearer 令牌
    sessionRetention: "24h", // 时长字符串或 false
    runLog: {
      maxBytes: "2mb", // 默认 2_000_000 字节
      keepLines: 2000, // 默认 2000 行
    },
  },
}
```

运行日志修剪行为：

- `cron.runLog.maxBytes`：日志文件最大尺寸限制
- `cron.runLog.keepLines`：修剪时保留最新行数
- 均适用于 `cron/runs/<jobId>.jsonl` 文件

Webhook 行为：

- 推荐：按作业设置 `delivery.mode: "webhook"` 且 `delivery.to: "https://..."`。
- Webhook URL 必须是有效的 `http://` 或 `https://`。
- POST 负载为 cron 完成事件 JSON。
- 若配置 `cron.webhookToken`，则授权头为 `Authorization: Bearer <cron.webhookToken>`。
- 未配置 `cron.webhookToken` 时不发送授权头。
- 旧版兼容：配置 `cron.webhook` 时，带 `notify: true` 的存储老作业仍使用该 Webhook。

禁用 cron：

- 配置中设置 `cron.enabled: false`
- 环境变量 `OPENCLAW_SKIP_CRON=1`

## 维护

Cron 提供两条内置维护路径：隔离运行会话保留与运行日志修剪。

### 默认配置

- `cron.sessionRetention`：`24h`（设为 false 禁用隔离会话修剪）
- `cron.runLog.maxBytes`：`2_000_000` 字节
- `cron.runLog.keepLines`：`2000`

### 工作原理

- 隔离运行会创建会话条目（`...:cron:<jobId>:run:<uuid>`）及交互记录文件。
- 清理进程移除超过 `cron.sessionRetention` 的过期运行会话条目。
- 对于已移除且不再被会话存储引用的运行条目，OpenClaw 将归档交互记录，并在相同保留周期内清理旧归档。
- 每次追加运行日志后，若文件超出 `runLog.maxBytes`，修剪为最新 `runLog.keepLines` 行。

### 高频调度性能提醒

高频率的 cron 配置可能生成大量运行会话和日志，导致较大 IO 负担，维护虽已内置，但松散限制仍会带来不必要的资源消耗。

注意事项：

- 长时间 `cron.sessionRetention` 配合大量隔离运行
- 高 `cron.runLog.keepLines` 与大 `runLog.maxBytes` 组合
- 许多高频繁噪声作业写入同一运行日志

建议：

- 将 `cron.sessionRetention` 设为符合调试/审计最低需求的最短值
- 通过中等大小的 `runLog.maxBytes` 和 `runLog.keepLines` 限制日志大小
- 将噪声大的后台任务转为隔离模式且配置合理交付规则，避免频繁聊天干扰
- 定期使用 `openclaw cron runs` 审核增长情况，并适时调整保留策略

### 自定义示例

保留运行会话一周并扩大运行日志容量：

```json5
{
  cron: {
    sessionRetention: "7d",
    runLog: {
      maxBytes: "10mb",
      keepLines: 5000,
    },
  },
}
```

禁用隔离运行会话修剪但保留日志修剪：

```json5
{
  cron: {
    sessionRetention: false,
    runLog: {
      maxBytes: "5mb",
      keepLines: 3000,
    },
  },
}
```

针对高负载使用调优（示例）：

```json5
{
  cron: {
    sessionRetention: "12h",
    runLog: {
      maxBytes: "3mb",
      keepLines: 1500,
    },
  },
}
```

## CLI 快速入门

一次性提醒（UTC ISO，成功后自动删除）：

```bash
openclaw cron add \
  --name "Send reminder" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "Reminder: submit expense report." \
  --wake now \
  --delete-after-run
```

一次性提醒（主会话，立即唤醒）：

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

周期性隔离作业（公告至 WhatsApp）：

```bash
openclaw cron add \
  --name "Morning status" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize inbox + calendar for today." \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

周期性作业，显式 30 秒错峰：

```bash
openclaw cron add \
  --name "Minute watcher" \
  --cron "0 * * * * *" \
  --tz "UTC" \
  --stagger 30s \
  --session isolated \
  --message "Run minute watcher checks." \
  --announce
```

周期性隔离作业（发送至 Telegram 主题）：

```bash
openclaw cron add \
  --name "Nightly summary (topic)" \
  --cron "0 22 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize today; send to the nightly topic." \
  --announce \
  --channel telegram \
  --to "-1001234567890:topic:123"
```

隔离作业，模型和思考级别覆盖：

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis of project progress." \
  --model "opus" \
  --thinking high \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

代理选择（多代理环境）：

```bash
# 将作业绑定给代理 "ops"（若该代理缺失则回退默认）
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops

# 切换或清除已有作业代理
openclaw cron edit <jobId> --agent ops
openclaw cron edit <jobId> --clear-agent
```

手动运行（默认强制，使用 `--due` 可仅在到期时运行）：

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

编辑现有作业（补丁字段）：

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

强制现有作业精确按计划执行（无错峰）：

```bash
openclaw cron edit <jobId> --exact
```

运行历史查看：

```bash
openclaw cron runs --id <jobId> --limit 50
```

立即触发系统事件（不创建作业）：

```bash
openclaw system event --mode now --text "Next heartbeat: check battery."
```

## 网关 API 接口

- `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`
- `cron.run`（强制或到期），`cron.runs`
  若需立即触发无作业的系统事件，使用 [`openclaw system event`](/cli/system)。

## 故障排查

### “什么都不运行”

- 检查 cron 是否启用：`cron.enabled` 配置和环境变量 `OPENCLAW_SKIP_CRON`。
- 确认网关持续运行（cron 是网关进程内运行）。
- 对 `cron` 计划，确认时区（`--tz`）与主机时区是否匹配。

### 周期性作业失败后持续延迟

- OpenClaw 对周期性作业连续错误应用指数退避重试：
  30 秒、1 分钟、5 分钟、15 分钟、60 分钟。
- 在下次成功运行后重置退避。
- 一次性（`at`）作业对临时错误（速率限制、网络、服务器错误）最多重试 3 次，永久错误立即禁用。详见 [重试策略](/automation/cron-jobs#retry-policy)。

### Telegram 发送到错误位置

- 论坛主题推荐使用明确格式：`-100…:topic:<id>`。
- 日志或存储的“最后路由”中带 `telegram:...` 前缀是正常的；
  cron 交付支持该格式且能正确解析主题 ID。

### 子代理公告交付重试

- 子代理执行完成后，网关会向请求者会话公告结果。
- 如果公告流程返回 `false`（例如请求者会话繁忙），网关会最多重试 3 次，并通过 `announceRetryCount` 跟踪。
- 超过结束时间 5 分钟的公告强制过期，防止陈旧条目无限循环。
- 若日志中见到重复公告交付，检查子代理注册表中的高重试计数条目。
