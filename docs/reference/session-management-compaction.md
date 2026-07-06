---
summary: "深入解析：session store + transcript、生命周期以及（自动）压缩内部机制"
read_when:
  - 你需要调试 session id、transcript JSONL 或 sessions.json 字段
  - 你正在更改自动压缩行为，或添加“预压缩”清理工作
  - 你想实现内存刷新或静默系统轮次
title: "会话管理深度解析"
---

单个 **Gateway 进程** 端到端拥有会话状态。UI（macOS 应用、Web 控制 UI、TUI）会向 Gateway 查询会话列表和 token 数量。在远程模式下，会话文件位于远程主机上，因此检查你本地 Mac 上的文件不会反映 Gateway 正在使用的内容。

先看概述文档：[会话管理](/concepts/session)、[压缩](/concepts/compaction)、[内存概览](/concepts/memory)、[内存搜索](/concepts/memory-search)、[会话清理](/concepts/session-pruning)、[转录卫生](/reference/transcript-hygiene)，完整配置参考见 [Agent 配置](/gateway/config-agents)。

## Two-layer persistence

1. **Session store (`sessions.json`)** - key/value map `sessionKey -> SessionEntry`. Small, mutable, safe to edit or delete entries. Tracks metadata: current session id, last activity, toggles, token counters.
2. **Transcript (`<sessionId>.jsonl`)** - append-only, tree-structured (entries have `id` + `parentId`). Stores the conversation, tool calls, and compaction summaries; rebuilds model context for future turns. Compaction checkpoints are metadata over the compacted successor transcript - a new compaction does not write a second `.checkpoint.*.jsonl` copy.

Gateway history readers avoid materializing the whole transcript unless the surface needs arbitrary historical access. First-page history, embedded chat history, restart recovery, and token/usage checks use bounded tail reads. Full transcript scans go through the async transcript index, cached by file path plus `mtimeMs`/`size` and shared across concurrent readers.

## 磁盘上的位置

每个 agent，在 Gateway 主机上（通过 `src/config/sessions.ts` 解析）：

- 存储：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- 转录：`~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 话题会话：`.../<sessionId>-topic-<threadId>.jsonl`

## 存储维护和磁盘控制

`session.maintenance` 控制 `sessions.json`、转录工件和轨迹侧车文件的自动维护：

| Key                     | Default               | Notes                                                                             |
| ----------------------- | --------------------- | --------------------------------------------------------------------------------- |
| `mode`                  | `"enforce"`           | 或 `"warn"`（仅报告，不做修改）                                                    |
| `pruneAfter`            | `"30d"`               | 过期条目的年龄截止阈值                                                            |
| `maxEntries`            | `500`                 | `sessions.json` 中条目的上限                                                      |
| `resetArchiveRetention` | same as `pruneAfter`  | `*.reset.<timestamp>` 转录归档的保留期；`false` 会禁用清理                         |
| `maxDiskBytes`          | unset                 | 可选的 sessions 目录配额                                                          |
| `highWaterBytes`        | 80% of `maxDiskBytes` | 配额清理后的目标值                                                                |

Gateway 模型运行探测会话（键匹配 `agent:*:explicit:model-run-<uuid>`）有单独固定的 `24h` 保留期。此修剪是按压力触发的：只有在达到会话条目维护/容量压力时才运行，并且仅在全局过期条目清理/容量步骤之前运行。其他显式会话不使用此保留期。

磁盘配额清理的执行顺序（`mode: "enforce"`）：

1. 先移除最旧的已归档、孤立转录或孤立轨迹工件。
2. 如果仍然高于目标，则逐出最旧的会话条目及其转录/轨迹文件。
3. 重复直到使用量低于或等于 `highWaterBytes`。

`mode: "warn"` 只报告可能会被逐出的内容，不会修改存储或文件。

按需运行维护：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

维护会保留持久的外部会话指针，例如群组会话和线程范围的聊天会话，但合成的运行时条目（cron、hooks、heartbeat、ACP、sub-agents）在超过配置的年龄、数量或磁盘配额后仍可能被移除。隔离的 cron 运行使用单独的 `cron.sessionRetention` 控制，与模型运行探测保留期相互独立。

正常的 Gateway 写入会通过每个存储的会话写入器进行，该写入器在不获取运行时文件锁的情况下串行化进程内的修改。热路径补丁助手在持有该写入器槽位时借用经过验证的可变缓存，因此大型 `sessions.json` 文件不会在每次元数据更新时都被克隆或重新读取。运行时代码中应优先使用 `updateSessionStore(...)` / `updateSessionStoreEntry(...)`；直接进行整库保存仅用于兼容性和离线维护工具。当 Gateway 可达时，非 `--dry-run` 的 `openclaw sessions cleanup` 和 `openclaw agents delete` 会将存储修改委派给 Gateway，以便清理与同一写入队列合并；`--store <path>` 是针对直接文件维护的显式离线修复路径，并且始终保持本地执行（`--dry-run` 也是如此）。`maxEntries` 清理会针对生产规模的存储进行批处理，因此在下一次高水位清理将其重写之前，存储可能会短暂超过配置上限。读取在 Gateway 启动期间绝不会修剪或限制条目——只有写入或 `openclaw sessions cleanup --enforce` 才会这样做，而且后者还会立即应用上限，并在即使未配置磁盘配额的情况下也修剪旧的、未被引用的转录、检查点和轨迹工件。

OpenClaw 不再在 Gateway 写入期间创建自动的 `sessions.json.bak.*` 轮换备份。旧的 `session.maintenance.rotateBytes` 键会被忽略，而 `openclaw doctor --fix` 会将其从旧配置中移除。

转录修改会使用转录文件上的会话写锁：

| Setting                              | Default   | Env override                                     |
| ------------------------------------ | --------- | ------------------------------------------------ |
| `session.writeLock.acquireTimeoutMs` | `60000`   | `OPENCLAW_SESSION_WRITE_LOCK_ACQUIRE_TIMEOUT_MS` |
| `session.writeLock.staleMs`          | `1800000` | `OPENCLAW_SESSION_WRITE_LOCK_STALE_MS`           |
| `session.writeLock.maxHoldMs`        | `300000`  | `OPENCLAW_SESSION_WRITE_LOCK_MAX_HOLD_MS`        |

`acquireTimeoutMs` 是锁等待在放弃前暴露为繁忙会话错误的持续时间；只有当在慢机器上合法的准备、清理、压缩或转录镜像工作竞争时间更长时才应提高它。`staleMs` 是现有锁可被回收为过期锁的时间。`maxHoldMs` 是进程内看门狗的释放阈值。

## Cron 会话与运行日志

隔离的 cron 运行会创建它们自己的会话条目/转录，并具有专门的保留策略：

- `cron.sessionRetention`（默认 `"24h"`）会清理存储中较早的隔离 cron 运行会话；设为 `false` 可禁用。
- `cron.runLog.keepLines` 会按每个 cron 作业清理保留的 SQLite 运行历史行（默认 `2000`）。`cron.runLog.maxBytes` 仅为兼容旧的基于文件的运行日志而被接受。

当 cron 强制创建一个新的隔离运行会话时，它会在写入新行之前清理之前的 `cron:<jobId>` 会话条目：它会保留安全偏好（thinking/fast/verbose/reasoning 设置、标签、显示名称）以及用户显式选择的模型/认证覆盖，但会丢弃环境中的会话上下文（channel/group 路由、发送/排队策略、提权、来源、ACP 运行时绑定），这样一个新的隔离运行就不会从旧运行中继承过时的投递或运行时权限。

## 会话键（`sessionKey`）

`sessionKey` 用于标识你当前所在的会话桶（路由 + 隔离）。规范规则：[/concepts/session](/concepts/session)。

| 模式                         | 示例                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| 主/直接聊天（每个 agent）    | `agent:<agentId>:<mainKey>`（默认 `main`）                  |
| 群组                         | `agent:<agentId>:<channel>:group:<id>`                      |
| 房间/频道（Discord/Slack）   | `agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>` |
| Cron                         | `cron:<job.id>`                                             |
| Webhook                      | `hook:<uuid>`（除非被覆盖）                                  |

## 会话 id（`sessionId`）

每个 `sessionKey` 都指向一个当前的 `sessionId`（即继续会话的转录文件）。决策逻辑位于 `src/auto-reply/reply/session.ts` 中的 `initSessionState()`。

- **重置**（`/new`、`/reset`）会为该 `sessionKey` 创建一个新的 `sessionId`。
- **每日重置**（默认网关主机本地时间凌晨 4:00）会在重置边界后的下一条消息到来时创建一个新的 `sessionId`。
- **空闲过期**（`session.reset.idleMinutes`，或旧配置 `session.idleMinutes`）会在消息于空闲窗口之后到达时创建一个新的 `sessionId`。如果同时配置了每日重置和空闲过期，则以先过期者为准。
- **控制界面重连恢复**：当 Gateway 从操作员 UI 客户端收到匹配的 `sessionId` 时，会在一次重连发送中保留当前可见的会话。这是一次性的信号；普通的过期发送仍会创建新的 `sessionId`。
- **系统事件**（心跳、cron 唤醒、exec 通知、gateway 簿记）可能会修改会话行，但绝不会延长每日/空闲重置的新鲜度。重置轮转会在构建新提示词之前，丢弃上一会话排队中的系统事件通知。
- **父分支策略**：在创建线程或子代理分支时，使用 OpenClaw 的活动分支。如果该分支过大（超过固定的内部上限，目前为 100K tokens），OpenClaw 会以隔离上下文启动子进程，而不是失败或继承不可用的历史记录。大小计算是自动的，且不可配置；旧的 `session.parentForkMaxTokens` 配置会被 `openclaw doctor --fix` 移除。

## 会话存储 schema（`sessions.json`）

`src/config/sessions.ts` 中的值类型是 `SessionEntry`。关键字段（不完整）：

- `sessionId`：当前转录 id（文件名会根据它生成，除非设置了 `sessionFile`）
- `sessionStartedAt`：当前 `sessionId` 的开始时间戳；每日重置的新鲜度判断使用它。旧行可能从 JSONL 会话头中推导出它。
- `lastInteractionAt`：最后一次真实用户/频道交互的时间戳；空闲重置的新鲜度判断使用它，因此 heartbeat、cron 和 exec 事件不会让会话保持存活。没有此字段的旧行会回退到恢复出的会话开始时间。
- `updatedAt`：最后一次存储行修改的时间戳，用于列表/清理/簿记——不是每日/空闲新鲜度的权威来源。
- `archivedAt`：可选的归档时间戳。归档会话仍保留在存储中，且其转录完整保留，并会从正常的活动列表中排除。
- `pinnedAt`：可选的置顶时间戳。活动的置顶会话会排在未置顶会话之前；归档会话会清除其置顶状态。
- Codex 线程互操作：这两个字段遵循 Codex 线程管理的形状——线上传输的 `archived`/`pinned` 布尔值始终由时间戳派生，并在服务端写入，与 Codex `threads.archived_at` 语义及 camelCase 序列化保持一致。OpenClaw 的时间戳是 Unix 毫秒，而 Codex 使用 Unix 秒，因此桥接层会在 codex 插件接缝处进行转换。Codex 目前还没有置顶 API（只有 `thread/archive`/`thread/unarchive`）；置顶状态会一直保留在 OpenClaw 侧，直到出现该 API；届时匹配的形状可让绑定会话机械地往返置顶状态。
- `sessionFile`：可选的显式转录路径覆盖
- `chatType`：`direct | group | room`
- `provider`、`subject`、`room`、`space`、`displayName`：群组/频道标记元数据
- 开关：`thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`、`sendPolicy`（按会话覆盖）
- 模型选择：`providerOverride`、`modelOverride`、`authProfileOverride`
- Token 计数器（尽力而为/依赖提供方）：`inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`
- `compactionCount`：此会话键自动压缩完成的次数
- `memoryFlushAt` / `memoryFlushCompactionCount`：上一次预压缩内存刷新时的时间戳和压缩次数

存储可以安全编辑，但 Gateway 才是权威：它可能会在会话运行时重写或重新填充条目。

## 转录结构（`*.jsonl`）

转录由 `SessionManager`（`openclaw/plugin-sdk/agent-sessions`）管理。该文件为 JSONL：

- 第一行：会话头部 - `type: "session"`、`id`、`cwd`、`timestamp`、可选的 `parentSession`。
- 然后：带有 `id` + `parentId` 的条目（树状结构）。

值得注意的条目类型：

- `message`：user/assistant/toolResult 消息
- `custom_message`：由扩展注入的消息，_会_ 进入模型上下文（当 `display: true` 时在 TUI 中渲染，`display: false` 时完全隐藏）
- `custom`：不会进入模型上下文的扩展状态（用于在重新加载之间持久化扩展状态）
- `compaction`：持久化的压缩摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `branch_summary`：在导航树分支时持久化的摘要

OpenClaw 刻意不会“修复”转录；Gateway 使用 `SessionManager` 来读写它们。

## 上下文窗口 vs 已跟踪 token

两个不同的概念：

1. **模型上下文窗口**：每个模型的硬性上限（模型可见的 token）。来自模型目录，可通过配置覆盖。
2. **会话存储计数器**：写入 `sessions.json` 的滚动统计（用于 `/status` 和仪表盘）。`contextTokens` 是运行时的估算/报告值——不要将其视为严格保证。

更多限制信息：[/reference/token-use](/reference/token-use)。

## 压缩：它是什么

压缩将较早的对话概括为转录中的一个持久化 `compaction` 条目，并保留最近的消息不变。压缩之后，后续轮次会看到压缩摘要以及 `firstKeptEntryId` 之后的消息。与会话裁剪不同，压缩是**持久化**的——参见 [/concepts/session-pruning](/concepts/session-pruning)。

通过 `agents.defaults.compaction.postCompactionSections` 可选择在压缩后重新注入 AGENTS.md 的内容；当该项未设置或为 `[]` 时，OpenClaw 不会在压缩摘要之上附加 AGENTS.md 摘录。

### 块边界与工具配对

在将长转录拆分为压缩块时，OpenClaw 会将助手的工具调用与其对应的 `toolResult` 条目配对保持在一起：

- 如果按 token 占比分割时会落在工具调用和其结果之间，OpenClaw 会将边界移到助手的工具调用消息处，而不是把这对内容拆开。
- 如果末尾的工具结果块本会让该块超过目标大小，OpenClaw 会保留该待处理工具块，并保持未摘要的尾部完整。
- 被中止/出错的工具调用块不会阻止待处理分割继续。

## 自动压缩何时发生

嵌入式 OpenClaw 代理中的两个触发条件：

1. **溢出恢复**：模型返回上下文溢出错误（`request_too_large`、`context length exceeded`、`input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`input is too long for the model`、`ollama error: context length exceeded`，以及其他类似提供方的变体）——先压缩，再重试。当提供方报告了尝试的 token 数量时，OpenClaw 会将该观测到的数量传递给溢出恢复压缩；如果提供方确认发生溢出但没有暴露可解析的数量，OpenClaw 会向压缩引擎和诊断信息传递一个略微超出预算的合成数量。如果溢出恢复仍然失败，OpenClaw 会显示明确的指导并保留当前会话映射，而不是静默地轮换到新的会话 id——重试该消息、运行 `/compact`，或运行 `/new`。
2. **阈值维护**：在一次成功的回合后，当 `contextTokens > contextWindow - reserveTokens` 时，其中 `contextWindow` 是模型的上下文窗口，`reserveTokens` 是为提示以及下一次模型输出保留的余量。

另外还有两个在这两个触发条件之外运行的保护机制：

- **预检本地压缩**：设置 `agents.defaults.compaction.maxActiveTranscriptBytes`（字节数或类似 `"20mb"` 的字符串），当活动转录文件达到该大小时，会在打开下一次运行之前触发本地压缩。这是用于本地重新打开成本的文件大小保护，而不是原始归档——正常的语义压缩仍会运行，并且它要求 `truncateAfterCompaction`，这样压缩后的摘要就会成为新的后继转录。
- **回合中预检查**：设置 `agents.defaults.compaction.midTurnPrecheck.enabled: true`（默认 `false`）以添加一个工具循环保护。在追加工具结果并在下一次模型调用之前，OpenClaw 使用与回合开始时相同的预检预算逻辑来估算提示压力。如果上下文不再适配，该保护不会就地压缩——它会发出结构化的回合中预检查信号，停止当前提示提交，并让外层运行循环使用现有的恢复路径（在这已足够时截断过大的工具结果，或触发配置的压缩模式并重试）。可与 `default` 和 `safeguard` 两种压缩模式配合使用，包括由提供方支持的 safeguard 压缩。与 `maxActiveTranscriptBytes` 相互独立：字节大小保护在回合开启前运行，回合中预检查在稍后、在新增工具结果被追加之后运行。

## 压缩设置

```json5
{
  agents: {
    defaults: {
      compaction: {
        enabled: true,
        reserveTokens: 16384,
        keepRecentTokens: 20000,
      },
    },
  },
}
```

OpenClaw 还会为嵌入式运行强制执行一个安全下限：如果 `compaction.reserveTokens` 低于 `reserveTokensFloor`（默认 `20000`），OpenClaw 会将其上调；如果已经更高，则保持不变。将 `agents.defaults.compaction.reserveTokensFloor: 0` 可禁用该下限。该下限本身会自动限制为模型上下文窗口的一个安全比例，因此小上下文模型（例如 16K token 的本地模型）不会被提示预算耗尽——如果没有这个限制，默认的 20000 token 下限可能会超过整个窗口，并让每个提示都陷入溢出压缩循环。为什么要设置下限：在压缩变得不可避免之前，预留足够的余量用于多轮“维护工作”（例如下方的内存刷新）。实现位置：`src/agents/agent-settings.ts` 中的 `applyAgentCompactionSettingsFromConfig()`，由嵌入式运行器的轮次和压缩设置路径调用。

手动 `/compact` 会遵守显式设置的 `agents.defaults.compaction.keepRecentTokens`，并保留运行时的 recent-tail 截断点。如果没有显式的保留预算，手动压缩就是一个硬性检查点，重建后的上下文从新的摘要开始。

当启用 `truncateAfterCompaction` 时，OpenClaw 会在压缩后将活动转录轮换为一个压缩后的后继 JSONL。分支/恢复检查点操作会使用该压缩后的后继；引用仍在时，旧的、压缩前的检查点文件仍然可以读取。

## 可插拔压缩提供方

插件通过插件 API 上的 `registerCompactionProvider()` 注册压缩提供方。当 `agents.defaults.compaction.provider` 设置为某个已注册提供方的 id 时，保护机制扩展会将摘要生成委托给该提供方，而不是使用内置的 `summarizeInStages` 流程。

- `provider`：已注册压缩提供方插件的 id。若留空，则使用默认的 LLM 摘要生成。设置 `provider` 会强制使用 `mode: "safeguard"`。
- 提供方接收与内置路径相同的压缩指令和标识符保留策略，并且在提供方输出后，保护机制仍会保留最近轮次和拆分轮次的后缀上下文。
- 内置的 safeguard 摘要会结合新消息对先前摘要进行重新提炼，而不是逐字保留完整的前一版摘要。
- Safeguard 模式默认启用摘要质量审计；设置 `qualityGuard.enabled: false` 可跳过对格式错误输出的重试行为。
- 如果提供方失败或返回空结果，OpenClaw 会自动回退到内置的 LLM 摘要生成。调用方显式触发的 abort/timeout 信号会被重新抛出，而不会被吞掉，因此始终会尊重取消操作。

来源：`src/plugins/compaction-provider.ts`，`src/agents/agent-hooks/compaction-safeguard.ts`。

## 用户可见界面

- 任何聊天会话中的 `/status`
- `openclaw status`（CLI）
- `openclaw sessions` / `openclaw sessions --json`
- 网关日志（`pnpm gateway:watch` 或 `openclaw logs --follow`）：`embedded run auto-compaction start` + `complete`
- 详细模式：`🧹 自动压缩完成` 以及压缩次数

## 静默事务处理（`NO_REPLY`）

OpenClaw 支持用于后台任务的“静默”轮次，在这些轮次中，用户不应看到中间输出。

- 助手以精确的静默标记 `NO_REPLY` / `no_reply` 开始其输出，表示“不要向用户发送回复”。OpenClaw 会在交付层剥离/抑制这一内容。
- 精确的静默标记抑制不区分大小写：当整个有效负载只是静默标记时，`NO_REPLY` 和 `no_reply` 都算。
- 截至 `2026.1.10`，OpenClaw 还会在部分片段以 `NO_REPLY` 开头时抑制草稿/输入中流式输出，因此静默操作不会在轮次中间泄露部分输出。
- 这仅适用于真正的后台/不交付轮次——它不是普通可执行用户请求的快捷方式。

## 压缩前内存刷新

在自动压缩发生之前，OpenClaw 可以运行一个静默的代理式轮次，将持久化状态写入磁盘（例如代理工作区中的 `memory/YYYY-MM-DD.md`），从而避免压缩擦除关键上下文。它会监控会话上下文的使用情况，一旦超过低于压缩阈值的一个软阈值，就会使用精确的静默标记 `NO_REPLY` / `no_reply` 发送一条静默的“立即写入内存”指令，因此用户看不到任何内容。

配置（`agents.defaults.compaction.memoryFlush`），完整参考见 [/gateway/config-agents](/gateway/config-agents#agentsdefaultscompaction)：

| 键                          | 默认值             | 备注                                                                                                                                   |
| --------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                   | `true`             |                                                                                                                                        |
| `model`                     | 未设置             | 仅用于刷新轮次的精确 provider/model 覆盖，例如 `ollama/qwen3:8b`                                                                       |
| `softThresholdTokens`       | `4000`             | 触发刷新时距离压缩阈值的差值                                                                                                           |
| `forceFlushTranscriptBytes` | 未设置（禁用）     | 当转录文件达到该字节大小（或类似 `"2mb"` 的字符串）时强制刷新，即使 token 计数器已过时；`0` 表示禁用                                     |
| `prompt`                    | 内置               | 刷新轮次使用的用户消息                                                                                                                 |
| `systemPrompt`              | 内置               | 为刷新轮次附加的额外系统提示                                                                                                           |

备注：

- 默认的 prompt/system prompt 包含一个 `NO_REPLY` 提示，用于抑制输出。
- 当设置了 `model` 时，刷新轮次会使用该模型，而不会继承活动会话的回退链，因此本地仅限的维护任务在失败时不会静默回退到付费对话模型。
- 刷新每个压缩周期只运行一次（由 `sessions.json` 跟踪）。
- 刷新仅适用于嵌入式 OpenClaw 会话；CLI 后端和心跳轮次会跳过它。
- 当会话工作区是只读时（`workspaceAccess: "ro"` 或 `"none"`），会跳过刷新。
- 有关工作区文件布局和写入模式，请参见 [内存](/concepts/memory)。

OpenClaw 在扩展 API 中暴露了一个 `session_before_compact` 钩子，但上述刷新逻辑位于 Gateway 端（`src/auto-reply/reply/memory-flush.ts`、`src/auto-reply/reply/agent-runner-memory.ts`），而不在该钩子中。

## 故障排查清单

- **Session key wrong?** Start with [/concepts/session](/concepts/session) and confirm the `sessionKey` in `/status`.
- **Store vs transcript mismatch?** Confirm the Gateway host and the store path from `openclaw status`.
- **Compaction spam?** Check the model's context window (too small forces frequent compaction), `reserveTokens` (too high for the model window causes earlier compaction), and tool-result bloat (tune session pruning).
- **Every prompt seems to overflow on a small local model?** The `reserveTokensFloor` default (20000) auto-caps to a safe fraction of the context window, but an explicit `reserveTokens` set higher than the window itself is not capped - lower it or unset it.
- **Silent turns leaking?** Confirm the reply starts with the exact silent token `NO_REPLY` (case-insensitive) and you are on a build that includes the streaming-suppression fix (`2026.1.10`+).

## 相关内容

- [会话管理](/concepts/session)
- [会话修剪](/concepts/session-pruning)
- [上下文引擎](/concepts/context-engine)
- [代理配置参考](/gateway/config-agents)
