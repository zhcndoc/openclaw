---
summary: "深入解析：session store + transcript、生命周期以及（自动）压缩内部机制"
read_when:
  - 你需要调试 session id、transcript JSONL，或 sessions.json 字段
  - 你正在修改自动压缩行为，或添加“预压缩”清理工作
  - 你想实现内存刷新或静默系统回合
title: "会话管理深入解析"
---

OpenClaw 在以下这些方面端到端管理会话：

- **会话路由**（传入消息如何映射到 `sessionKey`）
- **会话存储**（`sessions.json`）以及它记录的内容
- **转录持久化**（`*.jsonl`）及其结构
- **转录清理**（运行前针对特定 provider 的修复）
- **上下文限制**（context window 与已跟踪 token）
- **压缩**（手动和自动压缩）以及在哪里挂接预压缩工作
- **静默清理**（不应产生用户可见输出的内存写入）

如果你想先看更高层的概览，可以从这里开始：

- [Session management](/concepts/session)
- [Compaction](/concepts/compaction)
- [Memory overview](/concepts/memory)
- [Memory search](/concepts/memory-search)
- [Session pruning](/concepts/session-pruning)
- [Transcript hygiene](/reference/transcript-hygiene)

---

## 事实来源：Gateway

OpenClaw 围绕一个拥有会话状态的单一 **Gateway 进程** 设计。

- UI（macOS 应用、网页 Control UI、TUI）应向 Gateway 查询会话列表和 token 计数。
- 在远程模式下，会话文件位于远程主机上；“检查你本地的 Mac 文件”并不能反映 Gateway 实际使用的内容。

---

## 两层持久化

OpenClaw 通过两层来持久化会话：

1. **会话存储（`sessions.json`）**
   - 键值映射：`sessionKey -> SessionEntry`
   - 体积小、可变、可安全编辑（或删除条目）
   - 跟踪会话元数据（当前 session id、最后活动时间、开关、token 计数等）

2. **转录（`<sessionId>.jsonl`）**
   - 仅追加的转录，具有树状结构（条目包含 `id` + `parentId`）
   - 存储实际对话 + 工具调用 + 压缩摘要
   - 用于重建后续回合的模型上下文
   - 当活动转录超过检查点大小上限后，会跳过大型预压缩调试检查点，从而避免生成第二份巨大的
     `.checkpoint.*.jsonl` 副本。

---

## 磁盘上的位置

在 Gateway 主机上，每个 agent 对应：

- 存储：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- 转录：`~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 话题会话：`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 通过 `src/config/sessions.ts` 解析这些路径。

---

## 存储维护与磁盘控制

会话持久化带有自动维护控制（`session.maintenance`），用于 `sessions.json`、转录工件以及 trajectory sidecars：

- `mode`：`warn`（默认）或 `enforce`
- `pruneAfter`：陈旧条目的年龄截止阈值（默认 `30d`）
- `maxEntries`：`sessions.json` 的条目上限（默认 `500`）
- `resetArchiveRetention`：`*.reset.<timestamp>` 转录归档的保留期（默认：与 `pruneAfter` 相同；`false` 禁用清理）
- `maxDiskBytes`：可选的 sessions 目录预算
- `highWaterBytes`：清理后的可选目标值（默认是 `maxDiskBytes` 的 `80%`）

正常的 Gateway 写入会为生产规模的上限批量执行 `maxEntries` 清理，因此在下一次高水位清理把它写回去之前，存储可能会短暂超过配置上限。`openclaw sessions cleanup --enforce` 仍会立即应用配置的上限。

OpenClaw 不再在 Gateway 写入期间创建自动的 `sessions.json.bak.*` 轮转备份。旧的 `session.maintenance.rotateBytes` 键会被忽略，且 `openclaw doctor --fix` 会将其从旧配置中移除。

磁盘预算清理（`mode: "enforce"`）的执行顺序：

1. 先移除最旧的归档、孤立转录或孤立 trajectory 工件。
2. 如果仍高于目标值，则逐出最旧的会话条目及其转录/trajectory 文件。
3. 持续进行，直到使用量低于或等于 `highWaterBytes`。

在 `mode: "warn"` 下，OpenClaw 会报告潜在的逐出，但不会修改存储/文件。

按需运行维护：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Cron 会话与运行日志

隔离的 cron 运行也会创建会话条目/转录，并且它们有专门的保留控制：

- `cron.sessionRetention`（默认 `24h`）会从会话存储中清理旧的隔离 cron 运行会话（`false` 可禁用）。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 会清理 `~/.openclaw/cron/runs/<jobId>.jsonl` 文件（默认：`2_000_000` 字节和 `2000` 行）。

当 cron 强制创建一个新的隔离运行会话时，它会在写入新行之前清理之前的
`cron:<jobId>` 会话条目。它会保留安全的偏好设置，例如思考/快速/详细设置、标签，以及用户明确选择的模型/认证覆盖项。它会丢弃环境中的对话上下文，例如频道/群组路由、发送或排队策略、提权、来源以及 ACP
运行时绑定，这样一个新的隔离运行就不会从更早的运行中继承过时的传递或运行时权限。

---

## Session keys（`sessionKey`）

`sessionKey` 用来标识你处于 _哪一个对话桶_ 中（路由 + 隔离）。

常见模式：

- 主/直接聊天（每个 agent 一个）：`agent:<agentId>:<mainKey>`（默认 `main`）
- 群组：`agent:<agentId>:<channel>:group:<id>`
- 房间/频道（Discord/Slack）：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非被覆盖）

规范规则记录在 [/concepts/session](/concepts/session)。

---

## Session ids（`sessionId`）

每个 `sessionKey` 都指向一个当前 `sessionId`（继续对话的转录文件）。

经验法则：

- **重置**（`/new`、`/reset`）会为该 `sessionKey` 创建一个新的 `sessionId`。
- **每日重置**（默认 gateway 主机本地时间凌晨 4:00）会在重置边界后的下一条消息创建一个新的 `sessionId`。
- **空闲过期**（`session.reset.idleMinutes` 或旧版 `session.idleMinutes`）会在空闲窗口之后收到消息时创建一个新的 `sessionId`。当 daily 与 idle 都配置时，哪个先过期就以哪个为准。
- **系统事件**（heartbeat、cron 唤醒、exec 通知、gateway 记账）可能会修改会话行，但不会延长 daily/idle 重置的新鲜度。重置切换会在生成新的 prompt 之前，丢弃上一会话的排队系统事件通知。
- **线程父分叉保护**（`session.parentForkMaxTokens`，默认 `100000`）会在父会话已经过大时跳过父转录分叉；新线程会从头开始。设为 `0` 可禁用。

实现细节：该决策发生在 `src/auto-reply/reply/session.ts` 中的 `initSessionState()`。

---

## Session store schema（`sessions.json`）

存储的值类型是 `src/config/sessions.ts` 中的 `SessionEntry`。

关键字段（非完整）：

- `sessionId`：当前转录 id（除非设置了 `sessionFile`，否则文件名由此派生）
- `sessionStartedAt`：当前 `sessionId` 的开始时间戳；daily reset
  新鲜度使用它。旧行可能从 JSONL 会话头部中推导出它。
- `lastInteractionAt`：最后一次真实用户/频道交互时间戳；idle reset
  新鲜度使用它，因此 heartbeat、cron 和 exec 事件不会让会话
  保持活跃。没有此字段的旧行会回退到恢复出的会话开始时间
  来判断 idle 新鲜度。
- `updatedAt`：最后一次存储行修改时间戳，用于列表、清理和
  记账。它不是 daily/idle reset 新鲜度的权威依据。
- `sessionFile`：可选的显式转录路径覆盖
- `chatType`：`direct | group | room`（帮助 UI 和发送策略）
- `provider`、`subject`、`room`、`space`、`displayName`：用于群组/频道标记的元数据
- 开关：
  - `thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`
  - `sendPolicy`（每会话覆盖）
- 模型选择：
  - `providerOverride`、`modelOverride`、`authProfileOverride`
- token 计数器（尽力而为 / 依赖 provider）：
  - `inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`
- `compactionCount`：该 sessionKey 的自动压缩完成了多少次
- `memoryFlushAt`：上一次预压缩内存刷新时间戳
- `memoryFlushCompactionCount`：上一次刷新运行时的压缩计数

存储可安全编辑，但 Gateway 才是权威：它可能会在会话运行时重写或重新填充条目。

---

## Transcript structure（`*.jsonl`）

转录由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

文件采用 JSONL 格式：

- 第一行：会话头部（`type: "session"`，包含 `id`、`cwd`、`timestamp`、可选的 `parentSession`）
- 然后：带有 `id` + `parentId` 的会话条目（树状）

值得注意的条目类型：

- `message`：用户/assistant/toolResult 消息
- `custom_message`：扩展注入的消息，这些消息 _会_ 进入模型上下文（可以在 UI 中隐藏）
- `custom`：扩展状态，这些内容 _不会_ 进入模型上下文
- `compaction`：持久化的压缩摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `branch_summary`：在导航树分支时持久化的摘要

OpenClaw 有意不会对转录进行“修复”；Gateway 使用 `SessionManager` 读写它们。

---

## 上下文窗口 vs 已跟踪 token

有两个不同的概念很重要：

1. **模型上下文窗口**：每个模型的硬上限（对模型可见的 token）
2. **会话存储计数器**：写入 `sessions.json` 的滚动统计（用于 /status 和仪表盘）

如果你在调优限制：

- 上下文窗口来自模型目录（也可以通过配置覆盖）。
- 存储中的 `contextTokens` 是运行时估算/报告值；不要把它当成严格保证。

更多内容见 [/token-use](/reference/token-use)。

---

## Compaction：它是什么

压缩会把较早的对话总结为转录中的一个持久化 `compaction` 条目，并保留最近的消息不变。

压缩后，后续回合会看到：

- 压缩摘要
- `firstKeptEntryId` 之后的消息

压缩是**持久化**的（不同于 session pruning）。见 [/concepts/session-pruning](/concepts/session-pruning)。

## 压缩块边界与工具配对

当 OpenClaw 将一段较长的转录拆分为压缩块时，它会保持
assistant 工具调用与其匹配的 `toolResult` 条目成对。

- 如果按 token 占比分割的位置落在工具调用和其结果之间，OpenClaw
  会将边界移到 assistant 的工具调用消息处，而不是把这对内容分开。
- 如果尾随的工具结果块本会把分块推过目标大小，OpenClaw 会保留该
 待处理的工具块，并保持未总结的尾部完整。
- 被中止/出错的工具调用块不会使待处理分割继续保持开启。

---

## 自动压缩何时发生（Pi 运行时）

在嵌入式 Pi agent 中，自动压缩在两种情况下触发：

1. **溢出恢复**：模型返回上下文溢出错误
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, `ollama error: context length
exceeded`，以及类似的 provider 形态变体) → 压缩 → 重试。
2. **阈值维护**：在一次成功的轮次后，当：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的上下文窗口
- `reserveTokens` 是为提示 + 下一次模型输出预留的余量

这些是 Pi 运行时语义（OpenClaw 消费这些事件，但由 Pi 决定何时压缩）。

当设置了 `agents.defaults.compaction.maxActiveTranscriptBytes`，并且活跃转录文件达到该大小时，OpenClaw 也可以在打开下一次运行之前触发一次预检的本地压缩。这是用于本地重开成本的文件大小保护，不是原始归档：OpenClaw 仍然执行正常的语义压缩，并且它要求 `truncateAfterCompaction`，这样压缩后的摘要才能成为新的后继转录。

---

## 压缩设置（`reserveTokens`、`keepRecentTokens`）

Pi 的压缩设置位于 Pi 设置中：

```json5
{
  compaction: {
    enabled: true,
    reserveTokens: 16384,
    keepRecentTokens: 20000,
  },
}
```

OpenClaw 也会为嵌入式运行强制一个安全下限：

- 如果 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 会将其提高。
- 默认下限为 `20000` 个 token。
- 设置 `agents.defaults.compaction.reserveTokensFloor: 0` 可禁用该下限。
- 如果它已经更高，OpenClaw 会保持不变。
- 手动 `/compact` 会遵循显式的 `agents.defaults.compaction.keepRecentTokens`
  并保留 Pi 的最近尾部切点。若没有显式的 keep 预算，
  手动压缩仍然是一个硬检查点，重建后的上下文从新的摘要开始。
- 将 `agents.defaults.compaction.maxActiveTranscriptBytes` 设置为一个字节值或
  字符串，例如 `"20mb"`，可在活跃转录变大时于轮次开始前执行本地压缩。
  仅当同时启用 `truncateAfterCompaction` 时，此保护才会生效。保持未设置或设为 `0` 可禁用。
- 当启用 `agents.defaults.compaction.truncateAfterCompaction` 时，
  OpenClaw 会在压缩后将活跃转录轮转为一个压缩后的后继 JSONL。
  旧的完整转录会保留归档，并通过压缩检查点链接，而不是原地重写。

原因：在压缩变得不可避免之前，留出足够的余量用于多轮“事务性维护”（例如内存写入）。

实现：`src/agents/pi-settings.ts` 中的 `ensurePiCompactionReserveTokens()`
（由 `src/agents/pi-embedded-runner.ts` 调用）。

---

## 可插拔压缩提供方

插件可以通过插件 API 上的 `registerCompactionProvider()` 注册一个压缩提供方。当 `agents.defaults.compaction.provider` 设置为一个已注册的提供方 id 时，safeguard 扩展会将摘要工作委派给该提供方，而不是内置的 `summarizeInStages` 管道。

- `provider`：已注册压缩提供方插件的 id。若保留未设置，则使用默认的 LLM 摘要。
- 设置 `provider` 会强制 `mode: "safeguard"`。
- 提供方接收与内置路径相同的压缩指令和标识保留策略。
- safeguard 在提供方输出后仍会保留最近轮次和分割轮次的后缀上下文。
- 内置的 safeguard 摘要会用新消息重新提炼先前摘要，
  而不是逐字保留完整的前一个摘要。
- safeguard 模式默认启用摘要质量审计；设置
  `qualityGuard.enabled: false` 可跳过对格式不良输出的重试行为。
- 如果提供方失败或返回空结果，OpenClaw 会自动回退到内置的 LLM 摘要。
- 中止/超时信号会被重新抛出（不会被吞掉），以尊重调用方取消。

来源：`src/plugins/compaction-provider.ts`、`src/agents/pi-hooks/compaction-safeguard.ts`。

---

## 用户可见的表面

你可以通过以下方式观察压缩和会话状态：

- `/status`（在任意聊天会话中）
- `openclaw status`（CLI）
- `openclaw sessions` / `sessions --json`
- 详细模式：`🧹 Auto-compaction complete` + 压缩次数

---

## 静默事务处理（`NO_REPLY`）

OpenClaw 支持用于后台任务的“静默”轮次，在这些任务中用户不应看到中间输出。

约定：

- assistant 以精确的静默 token `NO_REPLY` /
  `no_reply` 开始其输出，以表示“不要向用户发送回复”。
- OpenClaw 会在交付层中剥离/抑制这一内容。
- 精确静默 token 的抑制不区分大小写，因此当整个负载只是静默 token 时，`NO_REPLY` 和
  `no_reply` 都算。
- 这仅用于真正的后台/不交付轮次；它不是普通可执行用户请求的快捷方式。

截至 `2026.1.10`，OpenClaw 还会抑制 **草稿/打字流式输出**，当
一个部分块以 `NO_REPLY` 开头时，因此静默操作不会在轮次中途泄露部分
输出。

---

## 预压缩“内存刷新”（已实现）

目标：在自动压缩发生之前，运行一个静默的 agentic 轮次，将持久状态写入磁盘（例如 agent workspace 中的 `memory/YYYY-MM-DD.md`），以便压缩不会擦除关键上下文。

OpenClaw 使用 **预阈值刷新** 方法：

1. 监控会话上下文使用量。
2. 当它超过一个“软阈值”（低于 Pi 的压缩阈值）时，向 agent 运行一个静默的
   “立即写入内存”指令。
3. 使用精确的静默 token `NO_REPLY` / `no_reply`，这样用户什么也看不到。

配置（`agents.defaults.compaction.memoryFlush`）：

- `enabled`（默认：`true`）
- `model`（可选的精确 provider/model 覆盖，用于刷新轮次，例如 `ollama/qwen3:8b`）
- `softThresholdTokens`（默认：`4000`）
- `prompt`（刷新轮次的用户消息）
- `systemPrompt`（为刷新轮次附加的额外系统提示）

备注：

- 默认的 prompt/system prompt 包含一个 `NO_REPLY` 提示以抑制交付。
- 当设置了 `model` 时，刷新轮次会使用该模型，而不会继承
  活跃会话的回退链，因此本地事务处理不会悄然回退到付费对话模型。
- 刷新在每个压缩周期内仅运行一次（在 `sessions.json` 中跟踪）。
- 刷新仅对嵌入式 Pi 会话运行（CLI 后端会跳过它）。
- 当会话 workspace 为只读（`workspaceAccess: "ro"` 或 `"none"`）时会跳过刷新。
- 有关 workspace 文件布局和写入模式，请参见 [内存](/concepts/memory)。

Pi 还在扩展 API 中提供了 `session_before_compact` 钩子，但 OpenClaw 的
刷新逻辑目前位于 Gateway 侧。

---

## 故障排查清单

- 会话 key 错了？先从 [/concepts/session](/concepts/session) 开始，并确认 `/status` 中的 `sessionKey`。
- 存储与转录不匹配？确认 `openclaw status` 中的 Gateway 主机和存储路径。
- 压缩过于频繁？检查：
  - 模型上下文窗口（太小）
  - 压缩设置（`reserveTokens` 对模型窗口来说过高可能导致更早压缩）
  - 工具结果膨胀：启用/调优会话剪枝
- 静默轮次泄露了内容？确认回复以 `NO_REPLY` 开头（不区分大小写的精确 token），并且你使用的是包含流式抑制修复的构建版本。

## 相关内容

- [会话管理](/concepts/session)
- [会话剪枝](/concepts/session-pruning)
- [上下文引擎](/concepts/context-engine)
