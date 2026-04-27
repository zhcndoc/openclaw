---
summary: "深入解析：会话存储 + 记录、生命周期与（自动）压缩内部机制"
read_when:
  - 你需要调试 session ids、transcript JSONL 或 sessions.json 字段
  - 你正在更改自动压缩行为，或添加“压缩前”清理工作
  - 你想实现内存刷新或静默系统回合
title: "会话管理深度解析"
---

# 会话管理与压缩（深度解析）

本文档介绍 OpenClaw 如何端到端地管理会话：

- **会话路由**（入站消息如何映射到 `sessionKey`）
- **会话存储**（`sessions.json`）及其所跟踪内容
- **记录持久化**（`*.jsonl`）及其结构
- **记录清理**（执行前的提供者特定修正）
- **上下文限制**（上下文窗口 vs 跟踪的令牌）
- **压缩**（手动 + 自动压缩）以及钩挂预压缩工作的位置
- **静默维护**（例如内存写入但不产生用户可见输出）

如果你想先了解更高层次的概念，可以先阅读：

- [/concepts/session](/concepts/session)
- [/concepts/compaction](/concepts/compaction)
- [/concepts/memory](/concepts/memory)
- [/concepts/memory-search](/concepts/memory-search)
- [/concepts/session-pruning](/concepts/session-pruning)
- [/reference/transcript-hygiene](/reference/transcript-hygiene)

---

## 真实数据源：Gateway

OpenClaw 设计围绕单一的**Gateway 进程**，该进程拥有会话状态。

- UI（macOS 应用、Web 控制 UI、TUI）应该向 Gateway 查询会话列表和令牌计数。
- 在远程模式下，会话文件位于远程主机；“检查本地 Mac 文件”不会反映 Gateway 实际使用的内容。

---

## 两个持久层

OpenClaw 在两个层面持久化会话：

1. **会话存储（`sessions.json`）**
   - 键值映射：`sessionKey -> SessionEntry`
   - 小型、可变、可以安全地编辑（或删除条目）
   - 跟踪会话元数据（当前会话 ID、最后活动时间、开关、令牌计数等）

2. **记录（`<sessionId>.jsonl`）**
   - 追加式记录具有树形结构（条目具有 `id` + `parentId`）
   - 存储实际对话 + 工具调用 + 压缩摘要
   - 用来重建未来回合的模型上下文

---

## 磁盘位置

每个代理，位于 Gateway 主机上：

- 存储路径：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- 记录路径：`~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 主题会话：`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 通过 `src/config/sessions.ts` 解析这些路径。

---

## 存储维护与磁盘控制

会话持久层有自动维护控制（`session.maintenance`），用于 `sessions.json` 和记录文件：

- `mode`：`warn`（默认）或 `enforce`
- `pruneAfter`：旧条目的时间截止（默认 `30d`）
- `maxEntries`：`sessions.json` 中条目最大数量（默认 `500`）
- `rotateBytes`：当文件超大时旋转 `sessions.json`（默认 `10mb`）
- `resetArchiveRetention`：`*.reset.<timestamp>` 记录归档的保留时间（默认与 `pruneAfter` 相同；`false` 禁用清理）
- `maxDiskBytes`：会话目录的磁盘预算（可选）
- `highWaterBytes`：清理后的目标大小（默认为 `maxDiskBytes` 的 80%）

磁盘预算清理的强制流程（`mode: "enforce"`）：

1. 优先删除最老的归档或孤立记录文件。
2. 若仍超出目标，逐步淘汰最老的会话条目及其记录文件。
3. 直到使用量降至 `highWaterBytes` 或以下。

在 `mode: "warn"` 下，OpenClaw 仅报告潜在淘汰，不会修改存储或文件。

可按需运行维护任务：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## 定时任务会话与运行日志

隔离的定时任务也会创建会话条目和记录，并有专门的保留控制：

- `cron.sessionRetention`（默认 24 小时）用于清理旧的隔离定时任务会话（`false` 禁用）。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 用于清理 `~/.openclaw/cron/runs/<jobId>.jsonl` 文件（默认分别为 2,000,000 字节和 2000 行）。

---

## 会话键（`sessionKey`）

`sessionKey` 标识你所在的_会话桶_（负责路由与隔离）。

常见模式：

- 主/直接聊天（每代理）：`agent:<agentId>:<mainKey>`（默认 `main`）
- 群组：`agent:<agentId>:<channel>:group:<id>`
- 房间/频道（Discord/Slack）：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- 定时任务：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非覆盖）

权威规则记录在 [/concepts/session](/concepts/session)。

---

## 会话 ID（`sessionId`）

每个 `sessionKey` 指向一个当前的 `sessionId`（对应继续对话的记录文件）。

经验规则：

- **重置**（通过 `/new`、`/reset`）会为该 `sessionKey` 创建新的 `sessionId`。
- **每日重置**（默认网关主机本地时间凌晨 4 点）会在当天区间下一条消息时创建新的 `sessionId`。
- **闲置过期**（`session.reset.idleMinutes` 或旧版 `session.idleMinutes`）当消息在闲置窗口后到来，创建新的 `sessionId`。若同时配置每日和闲置，先到者生效。
- **父线程分叉保护**（`session.parentForkMaxTokens`，默认 `100000`）当父会话过大时，跳过父记录分叉，线程从头开始。设为 `0` 禁用。

实现细节：决策逻辑在 `src/auto-reply/reply/session.ts` 的 `initSessionState()` 中。

---

## 会话存储模式（`sessions.json`）

存储的值类型为 `SessionEntry`，定义于 `src/config/sessions.ts`。

主要字段（非详尽）：

- `sessionId`：当前记录 ID（文件名默认源自该字段，除非设置了 `sessionFile`）
- `updatedAt`：最后活动时间戳
- `sessionFile`：可选的记录路径显式覆盖
- `chatType`：`direct | group | room`（帮助 UI 和发送策略）
- `provider`、`subject`、`room`、`space`、`displayName`：群组/频道元数据标签
- 开关：
  - `thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`
  - `sendPolicy`（每会话覆盖）
- 模型选择：
  - `providerOverride`、`modelOverride`、`authProfileOverride`
- 令牌计数（尽力而为/依赖提供者）：
  - `inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`
- `compactionCount`：该会话键自动压缩次数
- `memoryFlushAt`：上次预压缩内存刷新的时间戳
- `memoryFlushCompactionCount`：上次刷新执行时的压缩计数

存储文件可安全编辑，但 Gateway 是权威，可能在会话运行时重写或重构条目。

---

## 记录结构（`*.jsonl`）

记录由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

文件为 JSONL 格式：

- 第一行为会话头（`type: "session"`，包含 `id`、`cwd`、`timestamp`、可选 `parentSession`）
- 随后为带 `id` 与 `parentId` 的会话条目树

主要条目类型：

- `message`：用户/助手/工具结果消息
- `custom_message`：扩展注入的消息，进入模型上下文（可隐藏于 UI）
- `custom`：扩展状态，不进入模型上下文
- `compaction`：持久化的压缩摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `branch_summary`：导航分支时的持久化摘要

OpenClaw 有意不“修正”记录；Gateway 利用 `SessionManager` 读取/写入。

---

## 上下文窗口 vs 跟踪令牌数

涉及两个不同概念：

1. **模型上下文窗口**：模型的硬性令牌上限（模型可见令牌数）
2. **会话存储计数**：运行时统计写入 `sessions.json` 中（用于 /status 和仪表盘）

调优限制时：

- 上下文窗口从模型目录获得（可通过配置覆盖）。
- 存储中的 `contextTokens` 仅为运行时估算/报告值，不应被视作严格保证。

详情见 [/token-use](/reference/token-use)。

---

## 压缩：定义

压缩将较旧对话摘要化为持久化的 `compaction` 条目，保留近期消息完整。

压缩后，后续回合看到：

- 压缩摘要
- `firstKeptEntryId` 之后的消息

压缩是**持久化**的（不同于会话修剪）。详见 [/concepts/session-pruning](/concepts/session-pruning)。

## 压缩块边界与工具配对

当 OpenClaw 将长记录分割为压缩块时，它会保持助手工具调用与其匹配的 `toolResult` 条目配对。

- 如果令牌共享分割落在工具调用及其结果之间，OpenClaw
  会将边界移至助手工具调用消息，而不是分离这对条目。
- 如果尾随的工具结果块会导致块超出目标大小，
  OpenClaw 会保留该待处理工具块并保持未摘要的尾部完整。
- 中止/错误的工具调用块不会维持待处理的分割状态。

---

## 自动压缩触发时机（Pi 运行时）

嵌入式 Pi 代理中，自动压缩触发有两种情况：

1. **溢出恢复**：模型返回上下文溢出错误
   （`request_too_large`、`context length exceeded`、`input exceeds the maximum
number of tokens`、`input token count exceeds the maximum number of input
tokens`、`input is too long for the model`、`ollama error: context length
exceeded` 以及类似的提供者特定变体）→ 压缩 → 重试。
2. **阈值维护**：成功回合后，当：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型上下文窗口大小
- `reserveTokens` 为给提示和下一模型输出预留的头寸

这些是 Pi 运行时语义（OpenClaw 消费事件，Pi 决定何时压缩）。

OpenClaw 还可以在打开下一次运行之前触发一次预检本地压缩，
当 `agents.defaults.compaction.maxActiveTranscriptBytes` 被设置且
活动记录文件达到该大小时会发生。这是针对本地重开成本的文件大小保护，
不是原始归档：OpenClaw 仍会执行正常的语义压缩，并且它需要
`truncateAfterCompaction`，这样压缩摘要才能成为新的后继记录。

---

## 压缩设置（`reserveTokens`，`keepRecentTokens`）

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

OpenClaw 还为嵌入式运行强制执行安全下限：

- 如果 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 会将其提升。
- 默认下限为 `20000` 令牌。
- 设置 `agents.defaults.compaction.reserveTokensFloor: 0` 可禁用该下限。
- 如果它已经更高，OpenClaw 不会更改。
- 手动 `/compact` 会遵守显式的 `agents.defaults.compaction.keepRecentTokens`
  并保留 Pi 的最近尾部截断点。若没有显式保留预算，
  手动压缩仍然是一个硬检查点，重建上下文将从
  新摘要开始。
- 将 `agents.defaults.compaction.maxActiveTranscriptBytes` 设置为字节值或
  字符串（例如 `"20mb"`），可在回合开始前当活动记录变大时运行本地压缩。
  只有同时启用 `truncateAfterCompaction` 时，该保护才生效。留空或设为 `0`
  可禁用。
- 当启用 `agents.defaults.compaction.truncateAfterCompaction` 时，OpenClaw 会在压缩后
  将活动记录轮转为压缩后的后继 JSONL。旧的完整记录会保留为归档，并从
  压缩检查点链接，而不是就地重写。

目的：留足多轮“维护”头寸（例如内存写入），避免压缩变得不可避免。

实现函数：`ensurePiCompactionReserveTokens()` 在 `src/agents/pi-settings.ts`
（调用于 `src/agents/pi-embedded-runner.ts`）。

---

## 可插拔压缩提供者

插件可以通过插件 API 中的 `registerCompactionProvider()` 注册压缩提供者。当 `agents.defaults.compaction.provider` 设置为已注册的提供者 ID 时，保护扩展会将摘要任务委托给该提供者，而不是使用内置的 `summarizeInStages` 管道。

- `provider`：已注册压缩提供者插件的 ID。留空以使用默认 LLM 摘要。
- 设置 `provider` 会强制 `mode: "safeguard"`。
- 提供者接收与内置路径相同的压缩指令和标识符保留策略。
- 保护机制仍会在提供者输出后保留近期回合和分割回合的后缀上下文。
- 如果提供者失败或返回空结果，OpenClaw 会自动回退到内置 LLM 摘要。
- 中止/超时信号会被重新抛出（不会吞掉），以尊重调用者的取消操作。

来源：`src/plugins/compaction-provider.ts`, `src/agents/pi-hooks/compaction-safeguard.ts`.

---

## 用户可见界面

可通过以下方式查看压缩与会话状态：

- `/status`（任意聊天会话内）
- `openclaw status`（CLI）
- `openclaw sessions` / `sessions --json`
- 详细模式下显示：`🧹 自动压缩完成` 及压缩次数

---

## 静默维护（`NO_REPLY`）

OpenClaw 支持后台任务的“静默”回合，用户不应看到中间输出。

约定：

- 助手以其输出开头的确切静默令牌 `NO_REPLY` /
  `no_reply` 开始，表示“不向用户交付回复”。
- OpenClaw 在交付层剥离/抑制此内容。
- 确切静默令牌抑制不区分大小写，因此当整个负载仅为静默令牌时，`NO_REPLY` 和
  `no_reply` 都算数。
- 这仅用于真正的后台/无交付回合；它不是普通可操作用户请求的捷径。

自 `2026.1.10` 起，当部分块以 `NO_REPLY` 开头时，OpenClaw 还会抑制 **草稿/打字流式传输**，因此静默操作不会在回合中泄露部分输出。

---

## 预压缩“内存刷新”（已实现）

目标：在自动压缩触发前，运行一次静默代理回合，将持久化状态写入磁盘（例如代理工作区的 `memory/YYYY-MM-DD.md`），防止压缩擦除关键上下文。

OpenClaw 采用**预阈值刷新**方法：

1. 监控会话上下文使用情况。
2. 当它越过“软阈值”（低于 Pi 的压缩阈值）时，向代理运行静默的“立即写入内存”指令。
3. 使用确切静默令牌 `NO_REPLY` / `no_reply`，以便用户看不到任何内容。

配置（`agents.defaults.compaction.memoryFlush`）：

- `enabled`（默认 `true`）
- `softThresholdTokens`（默认 `4000`）
- `prompt`（刷新回合的用户消息）
- `systemPrompt`（刷新回合额外附加的系统提示）

说明：

- 默认提示/系统提示包含 `NO_REPLY` 提示以抑制交付。
- 刷新每个压缩周期运行一次（在 `sessions.json` 中跟踪）。
- 刷新仅针对嵌入式 Pi 会话运行（CLI 后端跳过它）。
- 当会话工作区为只读时跳过刷新（`workspaceAccess: "ro"` 或 `"none"`）。
- 参见 [内存](/concepts/memory) 了解工作区文件布局和写入模式。

Pi 扩展 API 中也暴露了 `session_before_compact` 钩子，但 OpenClaw 的刷新逻辑目前驻留在 Gateway 侧。

---

## 故障排查清单

- 会话键错误？先阅读 [/concepts/session](/concepts/session) 并确认 `/status` 中的 `sessionKey`。
- 存储与记录不一致？确认 Gateway 主机以及 `openclaw status` 输出中的存储路径。
- 压缩刷屏？检查：
  - 模型上下文窗口（太小）
  - 压缩设置（`reserveTokens` 对模型窗口来说过高会导致更早压缩）
  - 工具结果膨胀：启用/调整会话修剪
- 静默回合泄漏？确认回复以 `NO_REPLY` 开头（不区分大小写的确切令牌），并且你使用的构建版本包含流式抑制修复。

## 相关内容

- [会话管理](/concepts/session)
- [会话修剪](/concepts/session-pruning)
- [上下文引擎](/concepts/context-engine)
