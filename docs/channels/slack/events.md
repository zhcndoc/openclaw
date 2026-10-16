---
summary: "系统事件、交互和可选的状态轮询"
read_when:
  - "确定哪些 Slack 事件成为系统事件"
  - "为 Slack 参与者启用状态唤醒"
  - "处理 Block Kit 操作或快捷方式"
title: "Slack 事件和操作"
sidebarTitle: "事件和操作"
---

哪个Slack事件OpenClaw观察，以及它对它们做什么。

## <a id="events-and-operational-behavior"></a> 事件与运行行为

- Message edits/deletes 映射到系统事件。
- 消息编辑/删除会映射为系统事件。
- Reaction add/remove 事件映射到系统事件。
- 成员join/leave、通道created/renamed和引脚add/remove事件映射到系统事件。
- 当机器人本身加入允许的频道时，它会发布基于频道名称、目的或主题以及可用的最新消息的介绍。默认情况下启用介绍，从不在直接消息中运行，并且可以使用 `channels.slack.joinIntro: false` 禁用或使用 `channels.slack.accounts.<accountId>.joinIntro` 覆盖每个帐户。请参阅 [ 群组加入介绍](/channels#group-join-introductions) 了解历史记录限制、每个房间一次的行为和不受信任的内容处理。
- 可选的存在轮询可以将观察到的人类参与者的 `away` 到 `active` 转换映射到参与者最近活动的合格 Slack 会话。默认关闭。
- 当 `configWrites` 启用时，`channel_id_changed` 可以迁移通道配置密钥。
- Channel topic/purpose 元数据被视为不受信任的上下文，可以注入到路由上下文中。
- Agent View `app_context` 实体会按照 Slack 相关性顺序进行验证，并且只作为结构化的不受信任上下文暴露；省略的上下文会清除该轮内容，而不是复用过期实体。
- 线程发起者和初始线程历史上下文种子在适用时会根据配置的发送者允许列表进行过滤。
- 用于检查、范围发现、对话分类和交付协调的专用 Web API 读取每次请求尝试有 30 秒的截止时间。暂时性故障仍然可以重试，因此完整操作可能需要更长的时间。共享 Bolt 和支持突变的客户端不会收到此默认截止日期，因为 Slack 可能会在延迟响应到达 OpenClaw 之前提交突变。
- 块操作、快捷方式和 modal 交互会发出结构化的 `Slack interaction: ...` 系统事件，并带有丰富的负载字段：
  - 块操作：所选值、标签、选择器值和 `workflow_*` 元数据
  - 全局快捷方式：回调和参与者元数据，路由到参与者的直接会话
  - 消息快捷方式：回调、参与者、频道、线程和所选消息上下文
  - modal `view_submission` 和 `view_closed` 事件，带有路由后的频道元数据和表单输入

在 Slack 应用程序配置中定义全局或消息快捷方式，并使用任何非空回调 ID。 OpenClaw 确认匹配的快捷方式有效负载，应用与其他 Slack 交互相同的 DM/channel 发送方策略，并对路由代理会话的清理事件进行排队。触发器 ID 和响应 URL 是从代理上下文中编辑的。

### <a id="presence-events"></a> 在线状态事件

Slack 不会通过 Events API 或 Socket Mode 发送在线状态变化。OpenClaw 可以改为对其消息已通过正常 Slack 访问和路由检查的人工参与者轮询 [`users.getPresence`](https://docs.slack.dev/reference/methods/users.getPresence/)。

```json5
{
  channels: {
    slack: {
      presenceEvents: {
        mode: "auto",
        prompt: "Do not send a greeting. Stay silent.",
      },
      channels: {
        C0123456789: { presenceEvents: { mode: "on" } },
        C0987654321: { presenceEvents: { mode: "off" } },
      },
    },
  },
}
```

- `off`（默认）：不启用在线状态计时器，也不调用 Slack API。
- `auto`：监控过去 24 小时内活动的 DM、MPIM 和 Slack 线程，最多有 8 个观察到的人类参与者。顶级频道会话不包括在内。
- `on`：监控相同的会话，不设参与者上限，并包含顶层频道会话。可使用按频道覆盖来强制启用或抑制某个频道。

OpenClaw 每个 Slack 帐户每分钟最多轮询 45 个唯一的工作区-用户对，在不唤醒代理的情况下播种第一个结果，并且仅在观察到的 `away` 到 `active` 转换时唤醒。每个 Slack 帐户、工作区和用户都适用 8 小时的持久冷却时间，即使该人参与多个线程也是如此。该事件仅路由到该人最近活跃的合格对话，并告诉代理在决定是否发送一条简短的问候语之前咨询 memory/wiki 和已知的时区上下文。智能体可能会保持沉默。

该事件包括 `observed_away_at_ms`、`observed_active_at_ms` 和 `observed_away_duration_ms`。持续时间是当前监视器运行中第一个采样的 `away` 状态与后来采样的 `active` 状态之间经过的时间。这不是精确的时间间隔，因为轮询之间的状态可能会发生变化，并且观察会在监视器重新启动或目标过期后重新开始。该事件记录 Slack 报告的内容，而不是该人是否在使用键盘； Slack 可以自动或手动将某人标记为离开，并且 `users.getPresence` 不会为其他用户区分这些情况。

`presenceEvents.prompt` 替换事件事实后的默认问候引导。默认情况下应用帐户级别值，`channels.<channel-id>.presenceEvents.prompt` 可以覆盖一个通道的该值。自定义值是逐字包含的，并且限制为 20,000 个字符，与默认的每个文件 `AGENTS.md` 引导程序限制相匹配。将其设置为空字符串以省略特定于事件的指导，并让工作区指令（例如 `AGENTS.md`）决定如何处理事件。始终包含存在事实。

机器人令牌需要 `users:read`，推荐的 manifest 已经包含该权限。Enterprise Grid 组织范围的安装只有在授权事件识别出相应工作区后，才会创建工作区范围的轮询客户端；在线状态、冷却期和投递目标仍按工作区分区。
