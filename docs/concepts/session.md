---
summary: "OpenClaw 如何管理对话会话"
read_when:
  - 您想了解会话路由与隔离
  - 您想为多用户设置配置 DM 作用域
title: "会话管理"
---

OpenClaw 将对话组织为 **会话**。每条消息都会根据其来源路由到一个
会话中——私信、群聊、定时任务等。

## 消息如何路由

| 来源          | 行为                  |
| --------------- | ------------------------- |
| 私信 | 默认共享会话 |
| 群聊 | 每组隔离 |
| 房间/频道 | 每房间隔离 |
| 定时任务 | 每次运行新建会话 |
| Webhook | 每个 hook 隔离 |

## 私信隔离

默认情况下，所有私信共享一个会话以保持连续性。这对于单用户设置没问题。

<Warning>
如果多人可以给你的代理发消息，请启用私信隔离。否则，所有用户共享相同的对话上下文——Alice 的私信将对 Bob 可见。
</Warning>

**解决方法：**

```json5
{
  session: {
    dmScope: "per-channel-peer", // 按频道 + 发送者隔离
  },
}
```

其他选项：

- `main`（默认）-- 所有私信共享一个会话。
- `per-peer` -- 按发送者隔离（跨频道）。
- `per-channel-peer` -- 按频道 + 发送者隔离（推荐）。
- `per-account-channel-peer` -- 按账户 + 频道 + 发送者隔离。

<Tip>
如果同一个人从多个频道联系你，使用 `session.identityLinks` 链接他们的身份，以便他们共享一个会话。
</Tip>

使用 `openclaw security audit` 验证你的设置。

## 会话生命周期

会话会被复用直到过期：

- **每日重置**（默认）-- 网关主机本地时间凌晨 4:00 新建会话。
- **空闲重置**（可选）-- 一段时间无活动后新建会话。设置 `session.reset.idleMinutes`。
- **手动重置** -- 在聊天中输入 `/new` 或 `/reset`。`/new <model>` 也会切换模型。

当同时配置了每日和空闲重置时，谁先过期就执行谁。

如果存在由提供方拥有的活跃 CLI 会话，隐式的每日默认重置不会将其切断。若这些会话应按计时器过期，请使用 `/reset` 或显式配置 `session.reset`。

## 状态存储位置

所有会话状态由 **网关** 拥有。UI 客户端向网关查询会话数据。

- **存储：** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **对话记录：** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

## 会话维护

OpenClaw 会自动限制会话存储随时间增长。默认情况下，它以 `warn` 模式运行（报告将要清理的内容）。将 `session.maintenance.mode` 设置为 `"enforce"` 以进行自动清理：

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

使用 `openclaw sessions cleanup --dry-run` 预览。

## 检查会话

- `openclaw status` -- 会话存储路径和最近活动。
- `openclaw sessions --json` -- 所有会话（使用 `--active <minutes>` 过滤）。
- 聊天中的 `/status` -- 上下文使用情况、模型和开关。
- `/context list` -- 系统提示词中的内容。

## 进一步阅读

- [Session Pruning](/concepts/session-pruning) -- 修剪工具结果
- [Compaction](/concepts/compaction) -- 总结长对话
- [Session Tools](/concepts/session-tool) -- 用于跨会话工作的代理工具
- [Session Management Deep Dive](/reference/session-management-compaction) --
  存储模式、转录、发送策略、来源元数据和高级配置
- [Multi-Agent](/concepts/multi-agent) — 跨代理的路由与会话隔离
- [Background Tasks](/automation/tasks) — 分离工作的任务如何创建带有会话引用的任务记录
- [Channel Routing](/channels/channel-routing) — 入站消息如何路由到会话

## 相关

- [Session pruning](/concepts/session-pruning)
- [Session tools](/concepts/session-tool)
- [Command queue](/concepts/queue)
