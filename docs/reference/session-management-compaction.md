---
summary: "深入解析：session store + transcript、生命周期以及（自动）压缩内部机制"
read_when:
  - You need to debug session ids, transcript events, or session row fields
  - You are changing auto-compaction behavior or adding "pre-compaction" housekeeping
  - You want to implement memory flushes or silent system turns
title: "会话管理深度解析"
---

单个 **Gateway 进程** 端到端拥有会话状态。UI（macOS 应用、Web 控制 UI、TUI）会向 Gateway 查询会话列表和 token 数量。在远程模式下，会话文件位于远程主机上，因此检查你本地 Mac 上的文件不会反映 Gateway 正在使用的内容。

先看概述文档：[会话管理](/concepts/session)、[压缩](/concepts/compaction)、[内存概览](/concepts/memory)、[内存搜索](/concepts/memory-search)、[会话清理](/concepts/session-pruning)、[转录卫生](/reference/transcript-hygiene)，完整配置参考见 [Agent 配置](/gateway/config-agents)。

## 双层持久化

1. **会话行（每个代理一个 SQLite）** - 键/值映射 `sessionKey -> SessionEntry`。由 Gateway 拥有的可变运行时状态。跟踪元数据：当前会话 ID、最后活动时间、开关、令牌计数器。
2. **转录事件（每个代理一个 SQLite）** - 仅追加、树状结构（条目具有 `id` + `parentId`）。存储对话、工具调用和压缩摘要；为未来轮次重建模型上下文。压缩检查点是压缩后继转录之上的元数据 - 新的压缩不会写入第二份 `.checkpoint.*.jsonl` 副本。

较旧的安装可能仍在代理的 `sessions/` 目录下保留 `sessions.json` 文件。将这些文件视为旧版会话行迁移输入，或明确的离线维护目标。Gateway 启动和 `openclaw doctor --fix` 会自动将热的旧版行和转录历史导入到每个代理的 SQLite 存储中。需要明确的检查或验证证据时，请运行 `openclaw doctor --session-sqlite inspect --session-sqlite-all-agents`，然后遵循 [Doctor 迁移序列](/cli/doctor#session-sqlite-migration)。如果在旧版转录工件已归档后迁移失败，请使用该序列中的 Doctor 恢复模式。恢复会使用迁移清单，仅恢复受影响的已归档支持工件，在需要时准备已清理的 GitHub issue 报告，并且不会再次让活动运行时读取 JSONL 文件。

Gateway 历史读取器会避免在表面层需要任意历史访问时才将整个转录物具体化。首页历史、嵌入式聊天历史、重启恢复以及令牌/使用量检查都使用来自 SQLite 的受限尾部读取。完整转录扫描通过异步转录索引进行，并在并发读取器之间共享。

## 磁盘上的位置

每个 agent，在 Gateway 主机上（通过 `src/config/sessions.ts` 解析）：

- 运行时会话行存储：`~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`
- 运行时转录行：`~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`
- 旧版/归档转录工件：`~/.openclaw/agents/<agentId>/sessions/`
- 旧版行迁移输入：`~/.openclaw/agents/<agentId>/sessions/sessions.json`

## 存储维护和磁盘控制

`session.maintenance` 控制 SQLite 会话行、SQLite 转录行、归档制品以及轨迹侧车文件的自动维护：

| Key                     | Default               | Notes                                                                                       |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| `mode`                  | `"enforce"`           | 或 `"warn"`（仅报告，不做修改）                                                      |
| `pruneAfter`            | `"30d"`               | 过期条目的年龄截止时间                                                                      |
| `maxEntries`            | `500`                 | 会话条目上限                                                                      |
| `resetArchiveRetention` | 保留（无年龄截止）  | `*.reset.*`/`*.deleted.*` 转录归档的年龄截止；设置持续时间则启用删除 |
| `maxDiskBytes`          | `2gb`                 | 每个 agent 的会话磁盘预算；`false` 禁用                                            |
| `highWaterBytes`        | `maxDiskBytes` 的 80% | 预算清理后的目标值                                                                 |

归档转录默认会保留，并在运行时支持时使用 zstd 压缩（`*.jsonl.<reason>.<timestamp>.zst`），因此删除或重置会话时绝不会悄悄丢弃对话历史。磁盘预算会优先逐出最旧的归档，然后才会触及活动会话。

`maxDiskBytes` 的 SQLite 在线强制执行会按每个会话测量会话行 JSON 与转录事件 JSON 的字节数；传统的离线维护强制执行则会按所选会话目录中的文件进行测量。

Gateway 模型运行探测会话（键匹配 `agent:*:explicit:model-run-<uuid>`）有单独固定的 `24h` 保留期。此修剪是按压力触发的：只有在达到会话条目维护/容量压力时才运行，并且仅在全局过期条目清理/容量步骤之前运行。其他显式会话不使用此保留期。

磁盘配额清理的执行顺序（`mode: "enforce"`）：

1. 首先移除最旧的归档转录制品、孤立的旧制品或孤立的轨迹制品。
2. 如果仍高于目标值，则逐出最旧的会话条目及其转录行或轨迹制品。
3. 重复直到使用量低于或等于 `highWaterBytes`。

`mode: "warn"` 只报告可能会被逐出的内容，不会修改存储或文件。

按需运行维护：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

维护会保留持久的外部会话指针，例如群组会话和线程范围的聊天会话，但合成的运行时条目（cron、hooks、heartbeat、ACP、sub-agents）在超过配置的年龄、数量或磁盘配额后仍可能被移除。隔离的 cron 运行使用单独的 `cron.sessionRetention` 控制，与模型运行探测保留期相互独立。

正常的 Gateway 写入会通过 session accessor 进行，它会通过运行时 writer 路径串行化每个 agent 的 SQLite 修改。运行时代码应优先使用 `src/config/sessions/session-accessor.ts` 中的 accessor 辅助函数；传统的 `sessions.json` 辅助函数是迁移和离线维护工具。当 Gateway 可达时，非 dry-run 的 `openclaw sessions cleanup` 和 `openclaw agents delete` 会将存储修改委托给 Gateway，使清理加入同一个 writer 队列；`--store <path>` 是针对所选传统存储的显式离线修复路径，并且始终保持本地执行（`--dry-run` 也是如此）。`maxEntries` 清理针对生产规模存储采用批处理，因此在下一次高水位清理将其重写降低之前，存储可能会短暂超过配置上限。读取在 Gateway 启动期间绝不会修剪或限制条目——只有写入或 `openclaw sessions cleanup --enforce` 会这样做，而后者还会立即应用上限，并修剪旧的、未被引用的传统转录、检查点和轨迹制品，即使没有配置磁盘预算也会如此。

OpenClaw 不再在 Gateway 写入期间自动创建 `sessions.json.bak.*` 轮转备份。当前 schema 会拒绝旧的 `session.maintenance.rotateBytes` 键，而 `openclaw doctor --fix` 会将其从旧配置中移除。

转录修改会针对 SQLite 转录目标使用会话写入队列：

| Setting                              | Default   | Env override                                     |
| ------------------------------------ | --------- | ------------------------------------------------ |
| `session.writeLock.acquireTimeoutMs` | `60000`   | `OPENCLAW_SESSION_WRITE_LOCK_ACQUIRE_TIMEOUT_MS` |
| `session.writeLock.staleMs`          | `1800000` | `OPENCLAW_SESSION_WRITE_LOCK_STALE_MS`           |
| `session.writeLock.maxHoldMs`        | `300000`   | `OPENCLAW_SESSION_WRITE_LOCK_MAX_HOLD_MS`        |

`acquireTimeoutMs` 是在放弃前，锁等待被视为繁忙会话错误的持续时间；只有当在慢机器上合法的准备、清理、压缩或转录镜像工作竞争时间更长时才应提高它。`staleMs` 是现有锁可被回收为过期锁的时间。`maxHoldMs` 是进程内看门狗的释放阈值。

### 在 SQLite 切换后降级

在运行较旧的基于文件的 OpenClaw 版本之前，先恢复已归档的旧转录制品：

```bash
openclaw doctor --session-sqlite restore --session-sqlite-all-agents
```

迁移会保留旧的 `sessions.json` 文件以便支持和回滚，但导入到 SQLite 中的热转录 JSONL 文件会被重命名到 `session-sqlite-import-archive/`。较旧的基于文件的运行时会遵循 `sessions.json` 中的 `sessionFile` 路径，因此在启动前需要恢复这些制品。恢复会使用迁移清单，只移动那些已记录且其原始路径缺失的归档制品，并保留 SQLite 数据库以便后续恢复。

在 SQLite 切换之后创建的会话仅存在于 SQLite 中，不会出现在较旧的基于文件的运行时中。如果在降级后再次升级，请重新运行 Doctor 的检查和验证流程，以便 OpenClaw 在导入前验证已恢复的旧制品。

## Cron 会话和运行日志

隔离的 cron 运行会创建它们自己的会话条目/转录，并具有专门的保留策略：

- `cron.sessionRetention` (default `"24h"`) 会从存储中清除较旧的隔离 cron 运行会话；`false` 可禁用。
- 运行历史会为每个 cron 作业保留最新的 2000 个终端行。丢失的行仍保留其 24 小时的清理窗口。

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

每个 `sessionKey` 都指向一个当前的 `sessionId`（即继续对话的 SQLite 转录身份）。决策逻辑位于 `src/auto-reply/reply/session.ts` 中的 `initSessionState()`。

- **重置**（`/new`、`/reset`）会为该 `sessionKey` 创建一个新的 `sessionId`。
- **每日重置**（默认在网关主机的本地时间凌晨 4:00）会在重置边界之后的下一条消息到来时创建一个新的 `sessionId`。
- **空闲过期**（`session.reset.idleMinutes`，或旧配置 `session.idleMinutes`）会在消息于空闲窗口之后到达时创建一个新的 `sessionId`。如果同时配置了每日和空闲重置，则以先过期者为准。
- **控制 UI 重连恢复** 在网关从操作者 UI 客户端收到匹配的 `sessionId` 时，会为一次重连发送保留当前可见会话。这是一次性的信号；普通的过期发送仍会创建新的 `sessionId`。
- **系统事件**（心跳、cron 唤醒、exec 通知、网关簿记）可能会修改会话行，但绝不会延长每日/空闲重置的新鲜度。重置滚转会在构建新的提示词之前，丢弃前一个会话的已排队系统事件通知。
- **父分叉策略** 在创建线程或子代理分叉时使用 OpenClaw 的活动分支。如果该分支过大（超过固定的内部上限，目前为 100K tokens），OpenClaw 会以隔离上下文启动子节点，而不是失败或继承不可用的历史记录。大小判断是自动的，且不可配置；旧的 `session.parentForkMaxTokens` 配置会被 `openclaw doctor --fix` 移除。
- **操作者分叉**：`sessions.create { parentSessionKey, fork: true }` 会创建一个新会话，其转录内容从父会话的当前状态分支出来（与子代理派生使用相同的分叉机制，包括上面的大小上限）。当父会话有活动运行时，该分叉会被拒绝；除非显式传入模型选择，否则会继承父会话的模型选择，并将子会话标记为 `forkedFromParent`，同时使用新的 token 计数器。

## 会话存储模式

运行时存储会将 `SessionEntry` 值保存在每个代理各自的 SQLite 中。值类型为 `src/config/sessions.ts` 中的 `SessionEntry`。关键字段（不穷举）：

- `sessionId`：当前会话记录 ID，用于定位 SQLite 会话行
- `sessionStartedAt`：当前 `sessionId` 的开始时间戳；每日重置的新鲜度判断会使用它。旧版行可能会从 JSONL 会话头中推导它。
- `lastInteractionAt`：最近一次真实用户/通道交互的时间戳；空闲重置的新鲜度判断会使用它，因此心跳、cron 和 exec 事件不会让会话保持存活。没有该字段的旧版行会回退到恢复出的会话开始时间。
- `updatedAt`：最近一次存储行变更的时间戳，用于列表/清理/记账——不是每日/空闲新鲜度的权威来源。
- `archivedAt`：可选的归档时间戳。已归档会话仍会保留在存储中，且其会话记录保持完整，并会从正常的活动列表中排除。
- `pinnedAt`：可选的置顶时间戳。处于活动状态且已置顶的会话会排在未置顶会话之前；归档会话会清除其置顶状态。
- Codex 线程互操作：这两个字段都遵循 Codex 线程管理形态——线上传输中的 `archived`/`pinned` 布尔值始终由时间戳派生，并由服务器端打标，符合 Codex `threads.archived_at` 语义和 camelCase 序列化。OpenClaw 的时间戳是 Unix 毫秒，而 Codex 使用 Unix 秒，因此桥接会在 `codex` 插件边界处进行转换。Codex 目前还没有置顶 API（只有 `thread/archive`/`thread/unarchive`）；在其出现之前，置顶状态仍保留在 OpenClaw 侧，此时匹配的形态使绑定会话能够机械地往返保留置顶状态。
- Codex 监管列表只包含未归档的原生线程。Gateway 本地的 `idle` 或 `notLoaded` 活动未知线程，只有在操作者明确确认没有其他 Codex 进程拥有它之后，才能通过原生 `thread/archive` 归档；插件会先进行一次新的进程本地状态读取，然后该线程才会从目录中消失。该读取无法证明其他 App Server 进程没有在使用该线程。OpenClaw 会拒绝归档活动行和错误行，而在节点桥能够拥有完整的流式线程生命周期之前，成对节点归档不可用。在原生 Codex 客户端中取消归档会使该线程再次具备出现在列表中的资格。
- `lastReadAt` / `markedUnreadAt`：由 `sessions.patch { unread }` 在服务器端打标的已读状态时间戳——`unread: false` 记录一次已读（设置 `lastReadAt`，清除 `markedUnreadAt`）；`unread: true` 会将会话标记为未读，直到下一次已读。会话行会暴露一个派生的 `unread` 布尔值：要么显式标记为未读，要么在最新活动之前已读。从未被标记为已读的会话保持 `unread: false`，因此现有安装在升级后不会突然全部亮起。
- `lastActivityAt`：最后一次完成的代理运行的时间戳，该运行被计为值得标记未读的活动（用户、通道和 cron 运行）。心跳和内部事件轮次，以及元数据补丁，都不会更新它；`updatedAt` 不是活动信号。
- `sessionFile`：为迁移/归档兼容性保留的旧版标记；运行时使用 SQLite 标识
- `chatType`：`direct | group | room`
- `provider`、`subject`、`room`、`space`、`displayName`：群组/频道标记元数据
- 开关：`thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`、`sendPolicy`（按会话覆盖）
- 模型选择：`providerOverride`、`modelOverride`、`authProfileOverride`
- 令牌计数器（尽力而为/依赖提供方）：`inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`
- `compactionCount`：此会话键自动压缩完成的次数
- `memoryFlushAt` / `memoryFlushCompactionCount`：上一次预压缩记忆刷新时的时间戳和压缩次数

Gateway 是权威来源：它可以在会话运行时重写或重新补全条目。对于旧版文件后端安装，请使用
`openclaw doctor --session-sqlite import --session-sqlite-all-agents` 进行迁移，而不是
编辑 `sessions.json` 并期望运行时继续读取该文件。

## 转录事件结构

转录由 OpenClaw 会话访问器管理，并通过基于身份的辅助工具暴露给运行时代码。事件流是仅追加的：

- 第一条：会话头 - `type: "session"`、`id`、`cwd`、`timestamp`、可选的 `parentSession`。
- 然后：带有 `id` + `parentId` 的条目（树结构）。

值得注意的条目类型：

- `message`：user/assistant/toolResult 消息
- `custom_message`：由扩展注入的消息，_会_ 进入模型上下文（当 `display: true` 时在 TUI 中渲染，`display: false` 时完全隐藏）
- `custom`：不会进入模型上下文的扩展状态（用于在重新加载之间持久化扩展状态）
- `compaction`：持久化的压缩摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `branch_summary`：在导航树分支时持久化的摘要

OpenClaw 刻意不会“修复”转录；Gateway 使用 `SessionManager` 来读写它们。

## 上下文窗口 vs 已跟踪 token

两个不同的概念：

1. **模型上下文窗口**：每个模型的硬性上限（模型可见的 token）。来自模型目录，并且可以通过配置覆盖。
2. **会话存储计数器**：写入会话行中的滚动统计（用于 `/status` 和仪表盘）。`contextTokens` 是一个运行时估算/报告值——不要将其视为严格保证。

更多限制信息：[/reference/token-use](/reference/token-use)。

## 压缩：它是什么

压缩将较早的对话概括为转录中的一个持久化 `compaction` 条目，并保留最近的消息不变。压缩之后，后续轮次会看到压缩摘要以及 `firstKeptEntryId` 之后的消息。与会话裁剪不同，压缩是**持久化**的——参见 [/概念/会话裁剪](/concepts/session-pruning)。

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

- **预检本地压缩**：设置 `agents.defaults.compaction.maxActiveTranscriptBytes`（字节数或类似 `"20mb"` 的字符串），当活动转录达到该大小时，会在打开下一次运行之前触发本地压缩。这是针对本地重开成本的大小保护，而不是原始归档——正常的语义压缩仍会运行，并且它要求 `truncateAfterCompaction`，以便压缩后的摘要成为新的后继转录。
- **回合中预检**：设置 `agents.defaults.compaction.midTurnPrecheck.enabled: true`（默认 `false`）以添加一个工具循环保护。在追加工具结果后、下一次模型调用之前，OpenClaw 会使用与回合开始时相同的预检预算逻辑来估算提示词压力。如果上下文已不再适配，该保护不会在原位压缩——它会抛出一个结构化的回合中预检信号，停止当前提示提交，并让外层运行循环使用现有的恢复路径（在这已足够时截断过大的工具结果，或者触发已配置的压缩模式并重试）。它适用于 `default` 和 `safeguard` 两种压缩模式，包括由提供方支持的 safeguard 压缩。它独立于 `maxActiveTranscriptBytes`：字节大小保护在回合开始前运行，回合中预检在之后、追加新的工具结果后运行。

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

OpenClaw 还会对嵌入式运行强制执行一个安全下限：如果 `compaction.reserveTokens` 低于 `reserveTokensFloor`（默认 `20000`），OpenClaw 会将其提高。将 `agents.defaults.compaction.reserveTokensFloor: 0` 设为 0 可禁用该下限。当已知当前模型的上下文窗口时，下限和最终生效的保留值都会被封顶，因此保留区不会耗尽整个提示预算。这可以防止小上下文模型（例如 16K token 的本地模型）从第一个 token 开始就进入压缩；如果未知上下文窗口，则配置的和当前的保留预算都不会被封顶。为什么要设下限：在压缩变得不可避免之前，预留足够的余量用于多轮“维护工作”（例如下面的内存刷新）。实现：`src/agents/agent-settings.ts` 中的 `applyAgentCompactionSettingsFromConfig()`，由嵌入式运行的 turn 和压缩设置路径调用。

手动 `/compact` 会遵守显式设置的 `agents.defaults.compaction.keepRecentTokens`，并保留运行时的 recent-tail 截断点。如果没有显式的保留预算，手动压缩就是一个硬性检查点，重建后的上下文从新的摘要开始。

当启用 `truncateAfterCompaction` 时，OpenClaw 会在压缩后将活动会话轨迹轮换为一个压缩后的后继版本。分支/恢复检查点操作会使用该压缩后的后继版本；仍被引用的旧版压缩前检查点文件仍可读取。

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

## Silent Transaction Handling（`NO_REPLY`）

OpenClaw supports “silent” turns for background tasks, in which users should not see intermediate output.

- The assistant begins its output with the exact silent marker `NO_REPLY` / `no_reply`, indicating “do not send a reply to the user.” OpenClaw strips/suppresses this content at the delivery layer.
- Exact silent-marker suppression is case-insensitive: when the entire payload is just the silent marker, both `NO_REPLY` and `no_reply` count.
- As of `2026.1.10`, OpenClaw also suppresses streaming output from drafts/input when some fragments begin with `NO_REPLY`, so silent operations will not leak partial output in the middle of a turn.
- This applies only to true background/non-delivery turns—it is not a shortcut for ordinary executable user requests.

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

- 默认的 prompt/system prompt 包含一个 `NO_REPLY` 提示，用于抑制消息发送。
- 当设置了 `model` 时，刷新轮次会使用该模型，并且不会继承当前会话的回退链，因此本地仅用于维护的任务在失败时不会静默回退到付费对话模型。
- 刷新每个压缩周期只运行一次（由会话行跟踪）。
- 刷新仅针对嵌入式 OpenClaw 会话运行；CLI 后端和 heartbeat 轮次会跳过它。
- 当会话工作区是只读时（`workspaceAccess: "ro"` 或 `"none"`）会跳过刷新。
- 有关工作区文件布局和写入模式，请参见 [Memory](/concepts/memory)。

OpenClaw 在扩展 API 中暴露了一个 `session_before_compact` 钩子，但上述刷新逻辑位于 Gateway 端（`src/auto-reply/reply/memory-flush.ts`、`src/auto-reply/reply/agent-runner-memory.ts`），而不在该钩子中。

## 故障排查清单

- **Session key 错误？** 从 [/concepts/session](/concepts/session) 开始，并在 `/status` 中确认 `sessionKey`。
- **Store 与 transcript 不一致？** 使用 `openclaw status` 确认 Gateway 主机和 store 路径。
- **压缩日志刷屏？** 检查模型的上下文窗口（太小会强制频繁压缩）、`reserveTokens`（对模型窗口来说过高会导致更早压缩）以及工具结果膨胀（调整 session pruning）。
- **在较小的本地模型上，每个 prompt 似乎都会溢出？** 确认 provider 报告了正确的模型上下文窗口。只有在已知该窗口时，OpenClaw 才能限制有效的 reserve。
- **静默轮次泄漏？** 确认回复以精确的静默 token `NO_REPLY` 开头（不区分大小写），并且你使用的版本包含流式抑制修复（`2026.1.10`+）。

## 相关内容

- [会话管理](/concepts/session)
- [会话修剪](/concepts/session-pruning)
- [上下文引擎](/concepts/context-engine)
- [代理配置参考](/gateway/config-agents)
