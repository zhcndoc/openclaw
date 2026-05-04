---
summary: "OpenClaw 如何管理会话"
read_when:
  - 你想了解会话路由和隔离
  - 你想为多用户设置配置 DM 作用域
  - 你正在排查每日或空闲会话重置
title: "会话管理"
---

OpenClaw 将对话组织为**会话**。每条消息都会根据其来源被路由到一个
会话中——私信、群聊、cron 任务等。

## 消息如何路由

| 来源             | 行为                     |
| ---------------- | ------------------------ |
| 直接消息         | 默认共享会话            |
| 群聊             | 每个群组独立             |
| 房间/频道        | 每个房间独立             |
| Cron 任务        | 每次运行生成新会话       |
| Webhook          | 每个 hook 独立           |

## DM 隔离

默认情况下，所有私信共享一个会话以保持连续性。这对于
单用户场景是没问题的。

<Warning>
如果有多个人可以向你的代理发送消息，请启用 DM 隔离。否则，所有
用户将共享同一个对话上下文——Alice 的私密消息会被 Bob 看到。
</Warning>

**修复方法：**

```json5
{
  session: {
    dmScope: "per-channel-peer", // 按频道 + 发送者隔离
  },
}
```

其他选项：

- `main`（默认）——所有 DMs 共享一个会话。
- `per-peer` ——按发送者隔离（跨频道）。
- `per-channel-peer` ——按频道 + 发送者隔离（推荐）。
- `per-account-channel-peer` ——按账号 + 频道 + 发送者隔离。

<Tip>
如果同一个人会从多个频道联系你，请使用
`session.identityLinks` 将其身份关联起来，这样他们就能共享同一个会话。
</Tip>

### Dock 已链接频道

Dock 命令允许用户将当前直接聊天会话的回复路由移动到
另一个已链接频道，而无需开启新会话。有关示例、配置和
故障排查，请参见
[Channel docking](/concepts/channel-docking)。

使用 `openclaw security audit` 验证你的设置。

## 会话生命周期

会话会被重复使用，直到过期：

- **每日重置**（默认）——在网关主机的本地时间凌晨 4:00 创建新会话。每日新鲜度取决于当前 `sessionId` 开始的时间，而不是后续的元数据写入。
- **空闲重置**（可选）——在一段不活动时间后创建新会话。设置
  `session.reset.idleMinutes`。空闲新鲜度基于最后一次真实
  用户/频道交互，因此 heartbeat、cron 和 exec 系统事件不会
  让会话保持存活。
- **手动重置**——在聊天中输入 `/new` 或 `/reset`。`/new <model>` 还会切换模型。

当同时配置了每日和空闲重置时，以先到期的那个为准。heartbeat、cron、exec 和其他系统事件轮次可能会写入会话元数据，但这些写入不会延长每日或空闲重置的新鲜度。当重置使会话滚动时，旧会话中排队的系统事件通知会被
丢弃，因此过时的后台更新不会被追加到新会话的第一条提示前。

当存在由提供方拥有的活动 CLI 会话时，隐式的每日默认重置不会切断这些会话。对于应按计时器过期的会话，请使用 `/reset` 或显式配置 `session.reset`。

## 状态存放在哪里

所有会话状态都由**网关**拥有。UI 客户端向网关查询
会话数据。

- **存储：** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **转录：** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

`sessions.json` 保持独立的生命周期时间戳：

- `sessionStartedAt`：当前 `sessionId` 开始的时间；每日重置使用它。
- `lastInteractionAt`：最后一次会延长空闲时长的用户/频道交互。
- `updatedAt`：存储行最后一次变更；适合用于列表和清理，但
  不作为每日/空闲重置新鲜度的权威依据。

没有 `sessionStartedAt` 的旧记录会在可用时从转录 JSONL
会话头中解析。如果更旧的记录也缺少 `lastInteractionAt`，
则空闲新鲜度会回退到该会话的开始时间，而不是后续的记账
写入时间。

## 会话维护

OpenClaw 会随着时间自动限制会话存储的规模。默认情况下，它运行在
`warn` 模式（报告将要清理的内容）。将 `session.maintenance.mode`
设置为 `"enforce"` 以自动清理：

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "30d",
      maxEntries: 500,
    },
  },
}
```

对于生产规模的 `maxEntries` 限制，Gateway 运行时写入会使用一个较小的高水位缓冲区，并按批次清理回配置的上限。会话存储读取在 Gateway 启动期间不会裁剪或限制条目。这样可以避免在每次启动或孤立的 cron 会话时都执行完整的存储清理。`openclaw sessions cleanup --enforce` 会立即应用该上限。

维护会保留持久的外部会话指针，包括群组
会话和线程范围的聊天会话，同时仍允许合成的 cron、
hook、heartbeat、ACP 和子代理条目过期。

使用 `openclaw sessions cleanup --dry-run` 进行预览。

## 检查会话

- `openclaw status` ——会话存储路径和最近活动。
- `openclaw sessions --json` ——所有会话（用 `--active <minutes>` 过滤）。
- 在聊天中输入 `/status` ——上下文使用情况、模型和开关。
- `/context list` ——系统提示中包含了什么。

## 延伸阅读

- [Session Pruning](/concepts/session-pruning) ——裁剪工具结果
- [Compaction](/concepts/compaction) ——总结长对话
- [Session Tools](/concepts/session-tool) ——用于跨会话工作的代理工具
- [Session Management Deep Dive](/reference/session-management-compaction) ——存储模式、转录、发送策略、来源元数据和高级配置
- [Multi-Agent](/concepts/multi-agent) ——跨代理的路由和会话隔离
- [Background Tasks](/automation/tasks) ——分离的工作如何创建带有会话引用的任务记录
- [Channel Routing](/channels/channel-routing) ——传入消息如何路由到会话

## 相关内容

- [Session pruning](/concepts/session-pruning)
- [Session tools](/concepts/session-tool)
- [Command queue](/concepts/queue)
