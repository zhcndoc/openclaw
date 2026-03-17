---
summary: "聊天的会话管理规则、关键字及持久化"
read_when:
  - 修改会话处理或存储时
title: "会话管理"
---

# 会话管理

OpenClaw 将 **每个代理的一个单聊会话** 视为主要会话。单聊会折叠为 `agent:<agentId>:<mainKey>`（默认是 `main`），而群聊/频道聊天则拥有各自的键名。`session.mainKey` 会被遵循。

使用 `session.dmScope` 控制 **私信** 如何分组：

- `main`（默认）：所有私信共享主会话，确保连续性。
- `per-peer`：按发送者 ID 隔离，不同渠道独立。
- `per-channel-peer`：按频道 + 发送者隔离（推荐用于多用户收件箱）。
- `per-account-channel-peer`：按账号 + 频道 + 发送者隔离（推荐用于多账号收件箱）。
  使用 `session.identityLinks` 映射带有提供方前缀的对端 ID 到规范身份，这样相同的人在使用 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 时可以跨频道共享私信会话。

## 安全私信模式（推荐用于多用户场景）

> **安全警告：** 如果你的代理可以接收来自 **多个用户** 的私信，强烈建议启用安全私信模式。否则，所有用户共享相同的对话上下文，可能导致私人信息在用户间泄露。

**默认设置下的问题示例：**

- Alice（`<SENDER_A>`）给代理发送了一个私密话题信息（例如，医疗预约）
- Bob（`<SENDER_B>`）给代理发送消息：“我们之前在谈什么？”
- 因为两条私信共享同一会话，模型可能会用 Alice 的上下文来回答 Bob。

**解决方法：** 设置 `dmScope`，按用户隔离会话：

```json5
// ~/.openclaw/openclaw.json
{
  session: {
    // 安全私信模式：按频道 + 发送者隔离私信上下文。
    dmScope: "per-channel-peer",
  },
}
```

**何时启用：**

- 你允许多个发送者配对批准
- 你使用包含多个条目的私信允许列表
- 你设置了 `dmPolicy: "open"`
- 多个电话号码或账号可向代理发送消息

注意：

- 默认是 `dmScope: "main"` 以保证连续性（所有私信共享主会话），适用于单用户场景。
- 本地 CLI 上线时，未设置时默认写入 `session.dmScope: "per-channel-peer"`，（已有显式配置会保留）。
- 同频道多账号收件箱建议使用 `per-account-channel-peer`。
- 同一人跨多个频道联系时，使用 `session.identityLinks` 将其私信会话合并为一个规范身份。
- 你可以用 `openclaw security audit` 验证私信设置（详见 [安全](/cli/security)）。

## Gateway 是唯一数据源

所有会话状态由 **网关（“master” OpenClaw）** 负责。UI 客户端（macOS 应用、网页聊天等）必须向网关查询会话列表和令牌统计，不能直接读取本地文件。

- 在**远程模式**下，你关心的会话存储位于远程网关主机而非本机。
- UI 显示的令牌数来自网关存储字段（`inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`），客户端不会解析 JSONL 转录文件来“修正”统计。

## 状态存储位置

- 在**网关主机**：
  - 存储文件为：`~/.openclaw/agents/<agentId>/sessions/sessions.json`（每个代理单独存储）。
- 转录文件位于：`~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`（Telegram 主题会话用 `.../<SessionId>-topic-<threadId>.jsonl` 的格式）。
- 存储是一个映射表：`sessionKey -> { sessionId, updatedAt, ... }`，删除条目是安全的，缺少时会根据需要重建。
- 群组条目可能包含 `displayName`、`channel`、`subject`、`room`、`space` 用于 UI 显示标签。
- 会话条目包含 `origin` 元数据（标签和路由提示），便于 UI 解释会话来源。
- OpenClaw **不会** 读取传统的 Pi/Tau 会话文件夹。

## 维护机制

OpenClaw 会执行会话存储维护，确保 `sessions.json` 和转录文件随时间保持合理大小。

### 默认值

- `session.maintenance.mode`: `warn`
- `session.maintenance.pruneAfter`: `30d`
- `session.maintenance.maxEntries`: `500`
- `session.maintenance.rotateBytes`: `10mb`
- `session.maintenance.resetArchiveRetention`: 默认为 `pruneAfter`（30 天）
- `session.maintenance.maxDiskBytes`: 未设置（禁用）
- `session.maintenance.highWaterBytes`: 如果启用磁盘配额，默认为 `maxDiskBytes` 的 80%

### 运作方式

维护在写入会话存储时运行，你也可以用 `openclaw sessions cleanup` 手动触发。

- `mode: "warn"`：报告将被清理的项，但不修改条目或转录。
- `mode: "enforce"`：按顺序执行清理：
  1. 剪除比 `pruneAfter` 更旧的条目
  2. 限制条目数至 `maxEntries`（先删最旧的）
  3. 归档已移除条目且不再引用的转录文件
  4. 根据保留策略清理旧的 `*.deleted.<timestamp>` 和 `*.reset.<timestamp>` 归档
  5. 当 `sessions.json` 超过 `rotateBytes` 时轮转
  6. 如果设置了 `maxDiskBytes`，朝 `highWaterBytes` 软限制清理（先删除最旧文件，再删除最旧会话）

### 大型存储性能注意

高流量场景中，存储规模常很大。维护是在写入时执行，存储越大写入延迟可能越高。

主要增加成本因素：

- `session.maintenance.maxEntries` 设得过高
- 过长的 `pruneAfter` 保留了太多陈旧条目
- `~/.openclaw/agents/<agentId>/sessions/` 中积累大量转录和归档文件
- 启用磁盘配额（`maxDiskBytes`）却未合理设定剪枝或条目数限制

建议措施：

- 生产环境使用 `mode: "enforce"` 保证增长自动受控
- 同时配置时间和条目数限制（`pruneAfter` 和 `maxEntries`）
- 对大规模部署，设定 `maxDiskBytes` 和 `highWaterBytes` 以硬限制上限
- 保持 `highWaterBytes` 明显低于 `maxDiskBytes`（默认约 80%）
- 配置调整后，用 `openclaw sessions cleanup --dry-run --json` 预览效果
- 对于频繁活跃会话，手动清理时使用 `--active-key`

### 自定义示例

采用保守的 enforce 策略：

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "45d",
      maxEntries: 800,
      rotateBytes: "20mb",
      resetArchiveRetention: "14d",
    },
  },
}
```

为 sessions 目录启用硬盘配额：

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      maxDiskBytes: "1gb",
      highWaterBytes: "800mb",
    },
  },
}
```

针对较大部署调整（示例）：

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "14d",
      maxEntries: 2000,
      rotateBytes: "25mb",
      maxDiskBytes: "2gb",
      highWaterBytes: "1.6gb",
    },
  },
}
```

通过 CLI 预览或强制维护：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

## 会话剪枝

OpenClaw 默认会在调用 LLM 之前，从内存上下文中修剪 **旧的工具结果**。
这不会重写 JSONL 历史。详见 [/concepts/session-pruning](/concepts/session-pruning)。

## 预压缩内存刷新

当会话接近自动压缩时，OpenClaw 可运行**静默内存刷新**回合，提醒模型将持久笔记写入磁盘。此功能仅在工作区可写时启用。详见 [内存](/concepts/memory) 和 [压缩](/concepts/compaction)。

## 传输 → 会话键映射

- Direct chats follow `session.dmScope` (default `main`).
  - `main`: `agent:<agentId>:<mainKey>` (continuity across devices/channels).
    - Multiple phone numbers and channels can map to the same agent main key; they act as transports into one conversation.
  - `per-peer`: `agent:<agentId>:direct:<peerId>`.
  - `per-channel-peer`: `agent:<agentId>:<channel>:direct:<peerId>`.
  - `per-account-channel-peer`: `agent:<agentId>:<channel>:<accountId>:direct:<peerId>` (accountId defaults to `default`).
  - If `session.identityLinks` matches a provider-prefixed peer id (for example `telegram:123`), the canonical key replaces `<peerId>` so the same person shares a session across channels.
- Group chats isolate state: `agent:<agentId>:<channel>:group:<id>` (rooms/channels use `agent:<agentId>:<channel>:channel:<id>`).
  - Telegram forum topics append `:topic:<threadId>` to the group id for isolation.
  - Legacy `group:<id>` keys are still recognized for migration.
- Inbound contexts may still use `group:<id>`; the channel is inferred from `Provider` and normalized to the canonical `agent:<agentId>:<channel>:group:<id>` form.
- Other sources:
  - Cron jobs: `cron:<job.id>` (isolated) or custom `session:<custom-id>` (persistent)
  - Webhooks: `hook:<uuid>` (unless explicitly set by the hook)
  - Node runs: `node-<nodeId>`

## 生命周期

- 重置策略：会话复用直到过期，过期在下一条入站消息时评估。
- 每日重置：默认本地时间 **每天凌晨 4 点**（网关主机时间）。如果会话最后更新早于最近一次每日重置时间，则视为过时。
- 空闲重置（可选）：`idleMinutes` 添加滑动空闲窗。当同时配置每日和空闲重置，**以先到期者为准**，强制新建会话。
- 兼容旧空闲模式：仅设置 `session.idleMinutes` 而无 `session.reset`/`resetByType` 配置时，保持仅空闲超时模式。
- 各类型重置覆盖（可选）：`resetByType` 覆盖 `direct`、`group` 和 `thread` （Slack/Discord 线程，Telegram 主题，Matrix 线程由连接器提供）三种会话的重置策略。
- 频道重置覆盖（可选）：`resetByChannel` 针对频道覆盖重置策略（适用于该频道的所有会话类型，优先于 `reset`/`resetByType`）。
- 重置触发词：精确匹配 `/new` 或 `/reset`（以及 `resetTriggers` 中的额外命令）可开启新会话 ID 且余下消息继续处理。`/new <model>` 可指定模型别名、`provider/model` 或提供商名称（模糊匹配）作新会话模型。如果只发 `/new` 或 `/reset`，OpenClaw 会发送简短“你好”确认重置。
- 手动重置：删除指定键或移除 JSONL 转录文件，下一条消息会重建它们。
- 隔离定时任务每次运行均新建会话 ID（不复用空闲会话）。

## 发送策略（可选）

可阻止特定会话类型的消息发送，无需列出具体 ID。

```json5
{
  session: {
    sendPolicy: {
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } },
        { action: "deny", match: { keyPrefix: "cron:" } },
        // Matches raw session keys (with `agent:<id>:` prefix).
        { action: "deny", match: { rawKeyPrefix: "agent:main:discord:" } },
      ],
      default: "allow",
    },
  },
}
```

运行时覆盖（仅限所有者）：

- `/send on` → 允许该会话发送
- `/send off` → 禁止该会话发送
- `/send inherit` → 清除覆盖，使用配置规则

请单独发送这些命令以保证生效。

## 配置示例（可选重命名）

```json5
// ~/.openclaw/openclaw.json
{
  session: {
    scope: "per-sender", // 保持群聊键独立
    dmScope: "main", // 私信连续性（共享收件箱请设置为 per-channel-peer 或 per-account-channel-peer）
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      // 默认：mode=daily，atHour=4（网关主机本地时间）。
      // 同时设置 idleMinutes 时，以先过期的为准。
      mode: "daily",
      atHour: 4,
      idleMinutes: 120,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 10080 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    mainKey: "main",
  },
}
```

## 查看状态

- `openclaw status` — 显示存储路径及近期会话。
- `openclaw sessions --json` — 导出所有条目（可用 `--active <分钟数>` 过滤）。
- `openclaw gateway call sessions.list --params '{}'` — 从运行中的网关获取会话（远程访问需 `--url` / `--token`）。
- 在聊天中单独发送 `/status` 查看代理是否在线，会话上下文使用情况，当前思考/快速/详细模式切换及 WhatsApp Web 凭证刷新时间（便于判断是否需重新关联）。
- 发送 `/context list` 或 `/context detail` 查看系统提示和注入的工作区文件内容（及最大上下文贡献者）。
- 发送 `/stop`（或单独中止指令，如 `stop`、`stop action`、`stop run`、`stop openclaw`）以中止当前运行，清除该会话的待办后续消息，并停止所有由该会话派生的子代理运行（回复中会显示停止计数）。
- 发送 `/compact`（可附加指令）作为独立消息，汇总老旧上下文并释放窗口空间。详情见 [/concepts/compaction](/concepts/compaction)。
- 可直接打开 JSONL 转录文件回顾完整对话回合。

## 小贴士

- 保持主键专用于一对一聊天，群聊保留独立键。
- 自动清理时推荐删除单个键而非整份存储，以保留其他上下文。

## 会话来源元数据

每条会话记录以 `origin` 字段（尽量准确）记录来源：

- `label`：人工标签（从对话标签 + 群主题/频道解析）
- `provider`：标准化频道 ID（包含扩展）
- `from` / `to`：入站信封中的原始路由 ID
- `accountId`：提供商账号 ID（多账号时）
- `threadId`：支持时的线程/主题 ID

来源字段适用于私信、频道及群组。如果连接器仅更新派送路由（例如为保持私信主会话新鲜），应仍提供入站上下文，保证会话能保留解释元数据。扩展机制可通过在入站上下文中提供 `ConversationLabel`、`GroupSubject`、`GroupChannel`、`GroupSpace` 和 `SenderName` 并调用 `recordSessionMetaFromInbound`（或将相同上下文传递给 `updateLastRoute`）实现。
