---
summary: "深入解析：session store + transcript、生命周期以及（自动）压缩内部机制"
read_when:
  - 你需要调试 session id、transcript JSONL 或 sessions.json 字段
  - 你正在更改自动压缩行为，或添加“预压缩”清理工作
  - 你想实现内存刷新或静默系统轮次
title: "会话管理深度解析"
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

- UIs（macOS app、web Control UI、TUI）应向 Gateway 查询会话列表和 token 计数。
- 在远程模式下，会话文件位于远程主机上；“检查你本地的 Mac 文件”并不会反映 Gateway 正在使用的内容。

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

Gateway 历史读取器应避免在表面明确需要任意历史访问时才物化整个转录。第一页历史、嵌入式聊天历史、重启恢复以及 token/usage 检查都会使用有界尾部读取。完整转录扫描通过异步转录索引进行，该索引按文件路径以及 `mtimeMs`/`size` 缓存，并在并发读取器之间共享。

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

正常的 Gateway 写入会通过一个按存储区划分的 session writer 进行，该 writer 会串行化进程内的变更，而不需要运行时文件锁。处于热路径的补丁辅助函数会在持有该 writer 槽位时借用已验证的可变缓存，因此大型 `sessions.json` 文件不会在每次元数据更新时都被克隆或重新读取。运行时代码应优先使用 `updateSessionStore(...)` 或 `updateSessionStoreEntry(...)`；直接整库保存仅用于兼容性和离线维护工具。当 Gateway 可达时，非 dry-run 的 `openclaw sessions cleanup` 和 `openclaw agents delete` 会把存储修改委托给 Gateway，这样清理就会加入同一个 writer 队列；`--store <path>` 是直接文件维护的显式离线路径。`maxEntries` 清理在生产级规模上仍然是批处理的，因此在下一次高水位清理将其重写回去之前，存储可能会短暂超过配置上限。Gateway 启动期间，session store 读取不会修剪或限制条目；如需清理，请使用写入操作或 `openclaw sessions cleanup --enforce`。`openclaw sessions cleanup --enforce` 仍会立即应用配置的上限，并在未配置磁盘预算时清理旧的、未被引用的转录、检查点和 trajectory 工件。

维护会保留持久的外部对话指针，例如群组会话和线程范围的聊天会话，但当 cron、hook、heartbeat、ACP 和 sub-agent 的合成运行时条目超过配置的年龄、数量或磁盘预算时，仍然可以将它们移除。

OpenClaw 不再在 Gateway 写入期间创建自动的 `sessions.json.bak.*` 轮转备份。旧的 `session.maintenance.rotateBytes` 键会被忽略，且 `openclaw doctor --fix` 会将其从旧配置中移除。

转录变更在转录文件上使用 session 写锁。获取锁会等待最多
`session.writeLock.acquireTimeoutMs`，之后才会抛出忙碌会话错误；默认值是 `60000`
毫秒。只有在慢机器上合法的预处理、清理、压缩或转录镜像工作持续竞争更久时才提高这个值。陈旧锁检测和最大持有时长警告仍然是独立策略。

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

`sessionKey` 用于标识 _你处于哪个会话桶_（路由 + 隔离）。

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

- **Reset**（`/new`、`/reset`）会为该 `sessionKey` 创建一个新的 `sessionId`。
- **Daily reset**（默认在 Gateway 主机本地时间凌晨 4:00）会在重置边界之后的下一条消息时创建一个新的 `sessionId`。
- **Idle expiry**（`session.reset.idleMinutes` 或旧版 `session.idleMinutes`）会在消息在空闲窗口之后到达时创建一个新的 `sessionId`。当 daily 和 idle 同时配置时，以先过期的那个为准。
- **System events**（heartbeat、cron 唤醒、exec 通知、gateway 记账）可能会修改 session 行，但不会延长 daily/idle 重置的新鲜度。重置滚动会在构建新的提示词之前丢弃前一个会话的排队系统事件通知。
- **Parent fork policy** 在创建 thread 或 subagent fork 时会使用 PI 的 active branch。如果该分支过大，OpenClaw 会以隔离上下文启动子进程，而不是失败或继承不可用的历史。大小策略是自动的；旧的 `session.parentForkMaxTokens` 配置已被 `openclaw doctor --fix` 移除。

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

转录由 `@earendil-works/pi-coding-agent` 的 `SessionManager` 管理。

文件采用 JSONL 格式：

- 第一行：会话头部（`type: "session"`，包含 `id`、`cwd`、`timestamp`、可选的 `parentSession`）
- 然后：带有 `id` + `parentId` 的会话条目（树状）

值得注意的条目类型：

- `message`：用户/assistant/toolResult 消息
- `custom_message`：扩展注入的消息，这些消息 _会_ 进入模型上下文（可以在 UI 中隐藏）
- `custom`：扩展状态，这些内容 _不会_ 进入模型上下文
- `compaction`：持久化的压缩摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `branch_summary`：在导航树分支时持久化的摘要

OpenClaw 有意不会“修正”转录；Gateway 使用 `SessionManager` 读写它们。

---

## 上下文窗口 vs 已跟踪 token

有两个不同的概念很重要：

1. **模型上下文窗口**：每个模型的硬上限（对模型可见的 token）
2. **会话存储计数器**：写入 `sessions.json` 的滚动统计（用于 /status 和仪表盘）

如果你在调优限制：

- 上下文窗口来自模型目录（也可以通过配置覆盖）。
- 存储中的 `contextTokens` 是运行时估算/报告值；不要把它当作严格保证。

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
- `reserveTokens` 是为提示词 + 下一次模型输出预留的头部空间

这些是 Pi 运行时语义（OpenClaw 消费这些事件，但由 Pi 决定何时压缩）。

当设置了 `agents.defaults.compaction.maxActiveTranscriptBytes`，并且活跃转录文件达到该大小时，OpenClaw 也可以在打开下一次运行之前触发一次预检的本地压缩。这是用于本地重开成本的文件大小保护，不是原始归档：OpenClaw 仍然执行正常的语义压缩，并且它要求 `truncateAfterCompaction`，这样压缩后的摘要才能成为新的后继转录。

对于嵌入式 Pi 运行，`agents.defaults.compaction.midTurnPrecheck.enabled: true`
会添加一个可选的工具循环保护。在追加工具结果之后、下一次模型调用之前，
OpenClaw 会使用与回合开始时相同的预检预算逻辑来估算提示压力。如果上下文不再适配，
该保护不会在 Pi 的 `transformContext` 钩子内进行压缩。它会发出结构化的
中途预检信号，停止当前提示提交，并让外层运行循环使用现有的恢复路径：
在这样做足够时截断过大的工具结果，或者触发配置的压缩模式并重试。该
选项默认禁用，并且适用于 `default` 和 `safeguard` 两种压缩模式，
包括基于 provider 的 safeguard 压缩。这与 `maxActiveTranscriptBytes`
无关：字节大小保护在一轮开始前运行，而中途预检则在嵌入式 Pi 工具
循环中、在新增工具结果已被追加之后稍后运行。

---

## 压缩设置（`reserveTokens`、`keepRecentTokens`）

Pi 的压缩设置位于 Pi 配置中：

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

- 如果 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 会将其提升。
- 默认下限是 `20000` token。
- 设置 `agents.defaults.compaction.reserveTokensFloor: 0` 可禁用该下限。
- 如果已经更高，OpenClaw 会保持不变。
- 手动 `/compact` 会遵循显式的 `agents.defaults.compaction.keepRecentTokens`
  并保留 Pi 的最近尾部切点。如果没有显式的保留预算，
  手动压缩仍然是一个硬检查点，而重建上下文会从新的摘要开始。
- 设置 `agents.defaults.compaction.midTurnPrecheck.enabled: true` 可在
  新的工具结果追加后、下一次模型调用前运行可选的工具循环预检。
  这只是一个触发器；摘要生成仍然使用已配置的压缩路径。它与
  `maxActiveTranscriptBytes` 无关，后者是一个在轮次开始时生效的活动转录字节大小保护。
- 将 `agents.defaults.compaction.maxActiveTranscriptBytes` 设置为字节值或
  像 `"20mb"` 这样的字符串，可在轮次开始前、当活动转录变大时运行本地压缩。
  该保护仅在同时启用 `truncateAfterCompaction` 时生效。保持未设置或设为 `0`
  可禁用。
- 当启用 `agents.defaults.compaction.truncateAfterCompaction` 时，
  OpenClaw 会在压缩后将活动转录轮转为一个压缩后的后继 JSONL。
  旧的完整转录会保留为归档，并通过压缩检查点链接，而不是就地重写。

原因：在压缩不可避免之前，为多轮“清理工作”（例如内存写入）留出足够的余量。

实现：`src/agents/pi-settings.ts` 中的 `ensurePiCompactionReserveTokens()`
（由 `src/agents/pi-embedded-runner.ts` 调用）。

---

## 可插拔压缩提供方

插件可以通过插件 API 上的 `registerCompactionProvider()` 注册一个压缩提供方。当 `agents.defaults.compaction.provider` 设置为一个已注册的提供方 id 时，safeguard 扩展会将摘要工作委派给该提供方，而不是内置的 `summarizeInStages` 管道。

- `provider`：已注册压缩提供方插件的 id。若保留未设置，则使用默认的 LLM 摘要。
- 设置 `provider` 会强制 `mode: "safeguard"`。
- 提供方接收与内置路径相同的压缩指令和标识保留策略。
- safeguard 在提供方输出后仍然会保留最近轮次和分割轮次的后缀上下文。
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
- Gateway logs (`pnpm gateway:watch` or `openclaw logs --follow`): `embedded run auto-compaction start` + `complete`
- Verbose mode: `🧹 Auto-compaction complete` + compaction count

---

## 静默事务处理（`NO_REPLY`）

OpenClaw 支持用于后台任务的“静默”轮次，在这些轮次中，用户不应看到中间输出。

约定：

- 助手以精确的静默令牌 `NO_REPLY` /
  `no_reply` 开头输出，以表示“不要向用户发送回复”。
- OpenClaw 会在交付层中移除/抑制这一内容。
- 精确静默令牌的抑制是大小写不敏感的，因此 `NO_REPLY` 和
  `no_reply` 在整个载荷仅为静默令牌时都算有效。
- 这仅适用于真正的后台/不交付轮次；它不是普通可操作用户请求的快捷方式。

截至 `2026.1.10`，当部分块以 `NO_REPLY` 开头时，OpenClaw 也会抑制 **草稿/输入流式输出**，因此静默操作不会在轮次中途泄露部分输出。

---

## 预压缩“内存刷新”（已实现）

目标：在自动压缩发生之前，运行一个静默的 agent 轮次，将持久状态写入磁盘（例如 agent 工作区中的 `memory/YYYY-MM-DD.md`），以便压缩不会抹除关键上下文。

OpenClaw 使用 **预阈值刷新** 方法：

1. 监控会话上下文使用量。
2. 当它超过一个“软阈值”（低于 Pi 的压缩阈值）时，向 agent 运行一个静默的
   “立即写入内存”指令。
3. 使用精确的静默令牌 `NO_REPLY` / `no_reply`，这样用户什么也看不到。

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

Pi 还在扩展 API 中暴露了 `session_before_compact` 钩子，但 OpenClaw 的刷新逻辑目前位于 Gateway 端。

---

## 故障排查清单

- Session key 不对？先查看 [/concepts/session](/concepts/session)，并在 `/status` 中确认 `sessionKey`。
- 存储与转录不匹配？请确认 Gateway 主机以及 `openclaw status` 中的存储路径。
- 压缩过于频繁？检查：
  - 模型上下文窗口（太小）
  - 压缩设置（`reserveTokens` 对模型窗口来说可能过高导致更早触发压缩）
  - 工具结果膨胀：启用/调整会话剪枝
- 静默轮次泄露？确认回复以 `NO_REPLY` 开头（大小写不敏感的精确令牌），并且你使用的是包含流式抑制修复的构建版本。

## 相关内容

- [会话管理](/concepts/session)
- [会话剪枝](/concepts/session-pruning)
- [上下文引擎](/concepts/context-engine)
