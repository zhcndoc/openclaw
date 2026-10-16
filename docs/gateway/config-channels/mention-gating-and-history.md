---
summary: "群组提及门控、可见回复模式、DM 历史记录限制和自聊模式"
read_when:
  - "决定客服人员何时在群组或频道中回复"
  - "调试一个组 @mention，该组键入后就静默了"
  - "限制代理看到的 DM 历史记录量"
title: "配置——群组提及门控和历史记​​录"
---

群组消息如何到达客服人员：提及门控、可见回复模式、DM 历史记录限制和自聊天模式。

## <a id="group-chat-mention-gating"></a> 群聊提及门控

群组消息默认需要**提及**（元数据提及或安全正则模式）。适用于 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群聊。

可见回复是单独控制的。普通组、频道和内部 WebChat 直接请求默认为自动最终传递：最终助理文本通过旧版可见回复路径发布。当模型创作的源回复仅应在代理致电 `message(action=send)` 后发布时，选择使用 `messages.visibleReplies: "message_tool"` 或 `messages.groupChat.visibleReplies: "message_tool"`。在此模式下，未发送的最终文本保持私密。所需回合获得一次恢复重试；可选回合可以在私人决赛中保持安静，并且不会收到重试或错过答案的通知。

仅工具策略适用于助手源回复和通用工具媒体。它不会抑制运行时拥有的终端输出，例如经授权的命令响应、持久完成通知，或所属 harness 明确归类为主机拥有的提供商原生产物。主机拥有的产物通过正常的频道分发路径交付，并且仍然遵守出站 `sendPolicy` 拒绝规则。即使运行时输出被标记为主机拥有，环境中的 `room_event` 轮次仍保持静默，除非它们是明确的命令。

仅工具可见的回复需要能够可靠调用工具的 model/runtime，建议用于具有强大工具调用可靠性的模型上的共享环境房间，例如 GPT-6 Astra。一些较弱的模型可以回答最终文本，但无法理解源可见输出必须与 `message(action=send)` 一起发送。 OpenClaw 仅当回合需要回复或内部结果时才恢复非静音搁浅决赛，无论回复长度如何。不会重试心跳、房间事件、发送策略拒绝的轮次和已交付的轮次。单次重试要求模型在用户应该看到回复时发送回复，或者在不需要回复时准确回复 `NO_REPLY`。 `NO_REPLY` 重试会默默结束，恕不另行通知。恢复会抑制合成重试提示的持久性，并将其排除在收集批处理之外。如果要求投递仍然失败或者重试无法入队，则OpenClaw会下发一条系统通知：“没有返回答案，请再次询问是否还需要答案。”通知不会存储为辅助行，原始的私人最终文本也不会被标记为自动源传递。

如果消息工具在活动工具策略下不可用，OpenClaw 会回退到自动可见回复，而不是默默地抑制响应。 `openclaw doctor` 警告这种不匹配。

此规则适用于普通代理最终文本。插件拥有的会话绑定会将所属插件返回的回复作为已声明绑定线程轮次的可见响应；对于这些绑定回复，插件无需调用 `message(action=send)`。

**故障排查：群组 @mention 触发 typing 后沉默（无错误）**

症状：group/channel @mention 显示打字指示器，网关日志报告 `dispatch complete (queuedFinal=false, replies=0)`，但房间内没有消息。发给同一代理的 DM 会正常回复。

原因：group/channel 可见回复模式解析为 `"message_tool"`，因此 OpenClaw 运行回合但抑制最终助理文本，除非客服人员呼叫 `message(action=send)`。修剪为大写 `NO_REPLY` 的整个韵母可以明确地以静默方式结束外部转弯；其他未发送的最终文本在此模式下保持私密。所需的轮次会得到一次受保护的恢复重试，包括简短的回复。不会重试可选轮次、显式静默、心跳、房间事件、发送策略拒绝的轮次和已交付的轮次。正常组和通道默认为 `"automatic"`，因此仅当 `messages.groupChat.visibleReplies`（或全局 `messages.visibleReplies`）显式设置为 `"message_tool"` 时才会出现此症状。harness `defaultVisibleReplies` 在此不适用 — group/channel 解析器会忽略它；它仅影响 direct/source 聊天（Codex harness会以这种方式抑制直接聊天决赛）。

修复：选择更强大的工具调用模型，删除显式 `"message_tool"` 覆盖以回退到 `"automatic"` 默认值，或者设置 `messages.groupChat.visibleReplies: "automatic"` 以强制对每个 group/channel 请求进行可见回复。所需的搁浅决赛将获得一次重试：它可以通过 `message(action=send)` 进行投递，以 `NO_REPLY` 静默结束，或者如果投递仍然失败，则显示共享缺失答案系统通知。可选的私人决赛保持安静。文件保存后网关热重载`messages`配置；仅当在部署中禁用文件监视或配置重新加载时才重新启动网关。

**提及类型：**

- **元数据提及**：原生平台 @-mentions。在 WhatsApp 自聊模式下会被忽略。
- **文本模式**：`agents.entries.*.groupChat.mentionPatterns` 中的安全正则模式。无效模式和不安全的嵌套重复会被忽略。
- 仅当检测可行时（存在原生提及或至少一个模式），才会强制执行提及门控。

```json5
{
  messages: {
    visibleReplies: "automatic", // force old automatic final replies for direct/source chats
    groupChat: {
      historyLimit: 50,
      unmentionedInbound: "room_event", // always-on unmentioned room chatter becomes quiet context
      visibleReplies: "message_tool", // opt-in; require message(action=send) for visible room replies
    },
  },
  agents: {
    entries: {
      main: {
        groupChat: { mentionPatterns: ["@openclaw", "openclaw"] },
      },
    },
  },
}
```

`messages.groupChat.historyLimit` 设置全局默认值。频道可以通过 `channels.<channel>.historyLimit`（或每账号）覆盖。设为 `0` 可禁用。

`messages.groupChat.unmentionedInbound: "room_event"` 在支持的通道上提交未提及的始终在线 group/channel 消息作为静室上下文。提及的消息、命令和直接消息仍然是用户请求。有关完整的 Discord、Slack 和 Telegram 示例，请参阅 [ 环境房间事件 ](/channels/ambient-room-events)。

`messages.visibleReplies` 是全局源事件默认值；对于 group/channel 源事件，`messages.groupChat.visibleReplies` 会覆盖它。当 `messages.visibleReplies` 未设置时，direct/source 聊天使用选定的运行时或工具默认值，但内部 WebChat 直接轮流使用自动最终交付来实现 Pi/Codex 提示奇偶校验。将 `messages.visibleReplies: "message_tool"` 设置为有意要求 `message(action=send)` 进行可见输出。频道白名单和提及门控仍然决定是否处理事件。

### <a id="dm-history-limits"></a> DM 历史限制

```json5
{
  channels: {
    telegram: {
      dmHistoryLimit: 30,
      dms: {
        "123456789": { historyLimit: 50 },
      },
    },
  },
}
```

分辨率：每DM覆盖→提供商默认→无限制（全部保留）。在多帐户通道上，当前消息的帐户会在通道根之前检查，因此`channels.<provider>.accounts.<id>.dmHistoryLimit`覆盖`channels.<provider>.dmHistoryLimit`仅适用于该帐户。

这`dms`地图是个例外：一个定义了`accounts.<id>.dms`替换根`dms`该帐户的映射，而不是逐个合并条目。因此，仅在根目录中列出的对等点会落入该帐户的`dmHistoryLimit`，而不是根每DM价值。在帐户映射中重复您仍需要的任何根条目。

嵌入式 OpenClaw 运行时在通道范围的 DM 会话（包括 `per-account-channel-peer`）的提示准备期间将这些限制应用于最近的轮次。共享主会话仍然不受这些通道限制的限制。客户端压缩仍然总结了较早的持久历史；生成的摘要与窗口化的最近回合一起保存。这些限制不会删除存储的消息。本机运行时管理自己的转录历史记录。

提供者端压缩使用准备好的转录窗口。网关触发的压缩从当前会话记录的主要对话中解析链接的对等点；丢失或陈旧的路由事实不会选择另一个对等点的覆盖。

通道提供的最近消息上下文是一个单独的窗口。例如，Telegram 由本机用户 ID 查找 `dms` 并计算各个消息的数量，而嵌入式转录窗口则查找会话对等点并计算用户轮数。对于 `session.identityLinks`，该会话对等点是链接的 ID。当您希望两个窗口都限制为链接身份时，请配置两个密钥：

```json5
{
  session: {
    dmScope: "per-channel-peer",
    identityLinks: { alice: ["telegram:123456789"] },
  },
  channels: {
    telegram: {
      accounts: {
        work: {
          dms: {
            "123456789": { historyLimit: 2 }, // Telegram supplemental context
            alice: { historyLimit: 2 }, // Embedded session transcript
          },
        },
      },
    },
  },
}
```

这些现有窗口不是严格的整体提示上限：补充回复上下文、保存的压缩摘要以及记录窗口的批处理缓冲可以添加超出配置计数的上下文。

当帐户名称或链接的对等 ID 包含诸如 `direct` 之类的令牌时，单独的会话密钥可能会不明确。 OpenClaw 使用观察到的路由对等体来选择正确的每 DM 覆盖。当不明确的会话没有观察到的对等点或其身份链接已更改时，将应用已知的 account/channel DM 默认值，而不是另一个对等点的覆盖。明确的会话密钥保留其现有的每 DM 查找。

### <a id="self-chat-mode"></a> 自聊模式

在 `allowFrom` 中包含你自己的号码以启用 self-chat mode（忽略原生 @-mentions，只响应文本模式）：

```json5
{
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } },
    },
  },
  agents: {
    entries: {
      main: {
        groupChat: { mentionPatterns: ["reisponde", "@openclaw"] },
      },
    },
  },
}
```
