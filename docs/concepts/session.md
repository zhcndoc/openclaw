---
summary: "OpenClaw 如何管理会话"
read_when:
  - 你想了解会话路由和隔离
  - 你想为多用户设置配置 DM 作用域
  - 你正在排查每日或空闲会话重置
title: "会话管理"
---

OpenClaw 会根据每条入站消息的来源将其路由到一个 **会话**：私信、群聊、定时任务等。所有会话状态都由 **gateway** 持有；UI 客户端会向 gateway 查询会话数据。

## 消息如何路由

| 来源             | 行为                     |
| ---------------- | ------------------------ |
| 直接消息         | 默认共享会话            |
| 群聊             | 每个群组独立             |
| 房间/频道        | 每个房间独立             |
| Cron 任务        | 每次运行生成新会话       |
| Webhook          | 每个 hook 独立           |

## DM 隔离

默认情况下，所有 DM 会共享一个会话以保持连续性，这对于单用户设置来说是可以的。

<Warning>
如果有多人可以给你的代理发送消息，请启用 DM 隔离。否则，所有用户都会共享同一个对话上下文，Alice 的私密消息就会被 Bob 看见。
</Warning>

```json5
{
  session: {
    dmScope: "per-channel-peer", // 按频道 + 发送者隔离
  },
}
```

`session.dmScope` 可选值：

| 值                         | 行为                                   |
| -------------------------- | -------------------------------------- |
| `main`（默认）             | 所有 DM 共享一个会话                  |
| `per-peer`                 | 按发送者隔离，跨频道生效               |
| `per-channel-peer`         | 按频道 + 发送者隔离（推荐）            |
| `per-account-channel-peer` | 按账号 + 频道 + 发送者隔离            |

<Tip>
如果同一个人会通过多个频道联系你，请使用 `session.identityLinks` 将他们的身份映射到一个统一的 peer id，这样他们就能共享同一个会话。
</Tip>

### 已链接频道的 Dock

Dock 命令会将当前直接聊天会话的回复路由移动到另一个已链接的频道，而不会开启新会话。有关示例、配置和故障排除，请参见
[Channel docking](/concepts/channel-docking)。

使用 `openclaw security audit` 验证你的设置。

## 会话生命周期

Sessions 会在 `session.reset` 下到期前重复使用：

- **每日重置**（默认 `mode: "daily"`）- 在网关主机上配置的本地
  小时（`session.reset.atHour`，默认 `4`，0-23）创建新会话。每日
  新鲜度基于当前 `sessionId` 的开始时间，而不是后续
  元数据写入时间。
- **空闲重置**（`mode: "idle"`）- 在 `session.reset.idleMinutes`
  的不活动后创建新会话。空闲新鲜度基于最后一次真实的用户/频道
  交互，因此 heartbeat、cron 和 exec 系统事件不会让
  会话保持存活。
- **手动重置** - 在聊天中输入 `/new` 或 `/reset`。`/new <model>` 也会
  切换模型。

当同时配置了每日和空闲重置时，以先到期的那个为准。heartbeat、cron、exec 和其他系统事件轮次可能会写入会话元数据，但这些写入不会延长每日或空闲重置的新鲜度。当重置使会话滚动时，旧会话中排队的系统事件通知会被
丢弃，因此过时的后台更新不会被追加到新会话的第一条提示前。

当存在由提供方拥有的活动 CLI 会话时，隐式的每日默认重置不会切断这些会话。对于应按计时器过期的会话，请使用 `/reset` 或显式配置 `session.reset`。

按聊天类型或频道覆盖默认设置：

```json5
{
  session: {
    reset: { mode: "daily", atHour: 4 },
    resetByType: {
      group: { mode: "idle", idleMinutes: 120 },
      thread: { mode: "daily", atHour: 6 },
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 10080 },
    },
  },
}
```

`resetByType` 支持 `direct`（旧别名 `dm`）、`group` 和 `thread`。
旧的顶层 `session.idleMinutes` 在未设置 `session.reset`/`resetByType` 块时，
仍可作为空闲模式默认值的兼容别名。

## 状态存放位置

- **运行时会话行：** `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`
- **归档的转录文件：** `~/.openclaw/agents/<agentId>/sessions/`
- **旧版行迁移来源：** `~/.openclaw/agents/<agentId>/sessions/sessions.json`

每个 agent 的 SQLite 数据库中的会话行会保留独立的生命周期
时间戳：

- `sessionStartedAt`：当前 `sessionId` 开始的时间；每日重置使用它。
- `lastInteractionAt`：最后一次会延长空闲时长的用户/频道交互。
- `updatedAt`：存储行最后一次变更；适合用于列表和清理，但
  不作为每日/空闲重置新鲜度的权威依据。

在从旧版本安装迁移时，网关启动和 `openclaw doctor
--fix` 会自动将旧版 `sessions.json` 行以及热转录 JSONL 历史导入到
SQLite 中。没有 `sessionStartedAt` 的行会在可用时从旧版转录 JSONL 会话头中解析。
如果较旧的行也缺少 `lastInteractionAt`，空闲新鲜度会回退到该会话开始时间，
而不是回退到更晚的账务写入时间。需要显式
检查或验证证据时，请使用 `openclaw doctor --session-sqlite inspect
--session-sqlite-all-agents` 以及 [Doctor 迁移
顺序](/cli/doctor#session-sqlite-migration)。

## 会话维护

OpenClaw 通过 `session.maintenance` 按时间对会话存储进行约束，默认值如下：

```json5
{
  session: {
    maintenance: {
      mode: "enforce", // "enforce" 执行清理；"warn" 仅报告
      pruneAfter: "30d",
      maxEntries: 500,
    },
  },
}
```

对于生产规模的 `maxEntries` 限制，Gateway 运行时写入会先使用一个较小的高水位缓冲区，并在批处理中清理回配置的上限。会话存储读取在 Gateway 启动期间不会修剪或限制条目，因此启动和独立的 cron 会话不会承担完整存储清理的成本。`openclaw sessions cleanup --enforce` 会立即应用该上限。

Gateway 的 model-run 探测会话默认是短生命周期。匹配 `agent:*:explicit:model-run-<uuid>` 的行使用固定的 `24h` 保留期，但清理是受压力门控的：只有在达到会话条目维护/容量压力时才移除过期的探测行，并且会在更宽泛的过期条目年龄截止和条目上限之前运行。普通的 direct、group、thread、cron、hook、heartbeat、ACP 和 sub-agent 会话不会继承这项 24h 保留期。

维护会保留持久的外部会话指针，包括群组会话和线程范围的聊天会话，同时仍允许合成的 cron、hook、heartbeat、ACP 和子代理条目过期。

如果你之前使用过 DM 隔离，随后又将 `session.dmScope` 改回 `main`，可以使用 `openclaw sessions cleanup --dry-run --fix-dm-scope` 预览按 peer-key 归类的旧 DM 行。应用同样的标志会让这些旧的 direct-DM 行退役，并将其转录保留为已删除归档。

可以使用 `openclaw sessions cleanup --dry-run` 预览任何维护运行。

## 检查会话

| 命令                      | 显示内容                                         |
| ------------------------- | ----------------------------------------------- |
| `openclaw status`         | 会话存储路径和最近活动                            |
| `openclaw sessions --json` | 所有会话（可使用 `--active <minutes>` 进行筛选） |
| 在聊天中使用 `/status`     | 上下文使用情况、模型和切换项                     |
| `/context list`            | 系统提示中包含的内容                              |

## 延伸阅读

- [会话搜索](/concepts/session-search) - 在过去的对话记录中进行全文检索
- [会话修剪](/concepts/session-pruning) - 裁剪工具结果
- [压缩](/concepts/compaction) - 对长对话进行摘要
- [会话工具](/concepts/session-tool) - 用于跨会话工作的代理工具
- [会话管理深度解析](/reference/session-management-compaction) -
  存储模式、对话记录、发送策略、来源元数据和高级配置
- [多代理](/concepts/multi-agent) - 在代理之间进行路由和会话隔离
- [后台任务](/automation/tasks) - 分离出的工作如何创建带有会话引用的任务记录
- [通道路由](/channels/channel-routing) - 入站消息如何路由到会话

## 相关内容

- [会话裁剪](/concepts/session-pruning)
- [会话工具](/concepts/session-tool)
- [命令队列](/concepts/queue)
