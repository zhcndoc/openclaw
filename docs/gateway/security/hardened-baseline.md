---
summary: "Copy/paste 保持部署私有、配对和工具限制的网关配置"
read_when:
  - "设置新网关并需要安全的启动配置"
  - "将现有部署收紧至默认值"
title: "硬化基线"
---

## <a id="hardened-baseline-in-60-seconds"></a> 60 秒加固基线

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    auth: { mode: "token", token: "replace-with-long-random-token" },
  },
  session: {
    dmScope: "per-channel-peer",
  },
  tools: {
    profile: "messaging",
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"],
    fs: { workspaceOnly: true },
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
    sessions: { visibility: "agent" },
    agentToAgent: { enabled: false },
  },
  channels: {
    whatsapp: { dmPolicy: "pairing", groups: { "*": { requireMention: true } } },
  },
}
```

保持网关仅限本地，隔离 DM，将会话工具限制为代理自己的会话，关闭普通的跨代理访问，并默认禁用 control-plane/runtime 工具。从那里有选择地为每个受信任的代理重新启用工具。

适用于聊天驱动的代理回合的内置基线：无论配置如何，非所有者发送者都不能使用 `cron` 或 `gateway` 工具。

### <a id="requester-scoped-controls-and-prompt-context"></a> 请求者范围的控制与提示上下文

`tools.toolsBySender`、发送者所有权以及仅限所有者使用的工具清单，都是根据当前回合的发起请求者进行评估的。它们不会对该模型提示中的其他内容进行身份验证或清理，包括引用文本、之前共享房间中的历史记录、转发内容、获取的内容、附件、工具结果或其他提示输入。因此，当其他人的内容被包含在所有者触发的回合上下文中时，该内容可能会影响该回合。

将这些控制视为降低请求者直接能力的深度防御，而不是敌对的多用户隔离。使用 `contextVisibility` 过滤支持的通道提供的上下文，限制工具和沙箱代理，并使用单独的网关，并且在参与者相互对抗时最好将 OS 用户或主机分开。

## <a id="secure-baseline-(copy%2Fpaste)"></a><a id="secure-baseline-copy/paste"></a> 安全基线 （copy/paste）

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    port: 18789,
    auth: { mode: "token", token: "your-long-random-token" },
  },
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

保持网关的私密性，需要 DM 配对，并且 Gates 小组会在提及后进行回复。完全支持组 - 发送者身份被传递给代理，每个组的设置让一个房间运行与另一个房间不同的默认值 - 因此这里的目标是确定代理的注意力范围，而不是回避组。为了更安全地执行工具，请添加沙箱并拒绝任何非所有者代理的危险工具（请参阅上面的“每个代理访问配置文件”）。

### <a id="separate-numbers-(whatsapp%2C-signal%2C-telegram)"></a><a id="separate-numbers-whatsapp-signal-telegram"></a> 分开使用号码（WhatsApp、Signal、Telegram）

对于基于电话号码的渠道，建议把助手运行在一个与你个人号码不同的独立号码上，这样个人对话就能保持私密，而机器人号码则在自己的边界内处理自动化任务。
