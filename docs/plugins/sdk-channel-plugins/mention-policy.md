---
summary: "将入站提及处理分为插件拥有的证据收集和共享策略评估"
read_when:
  - "您的频道决定群组消息何时唤醒客服人员"
  - "您需要回复机器人或引用机器人隐式提及处理"
title: "频道提及政策"
sidebarTitle: "提及政策"
---

决定入站消息何时算作提及，而无需重新实施共享策略。 [构建频道插件](/plugins/sdk-channel-plugins)指南的一部分。

## <a id="inbound-mention-policy"></a> 传入提及策略

将传入提及处理分成两层：

- 插件拥有的证据收集
- 共享策略评估

使用 `openclaw/plugin-sdk/channel-mention-gating` 进行提及策略决策。 仅在需要更广泛的传入辅助工具集合时，使用 `openclaw/plugin-sdk/channel-inbound`。

适合放在插件本地逻辑中的内容：

- 回复到机器人检测
- 引用机器人检测
- 线程参与检查
- bot 拥有的线程检测和通道特定的配置继承
- service/system-message 排除项
- 用于证明机器人参与所需的平台原生缓存

适合放在共享辅助中的内容：

- `requireMention`
- 显式提及结果
- 隐式提及允许列表
- 命令旁路
- 最终跳过决策

对于合格的组线程条目，使用 `openclaw/plugin-sdk/channel-inbound` 中的 `resolveGroupThreadMentionFacts({ cfg, channel, peerId, text, sessionKey, acpBinding })` 计算一次显式参与者提及事实，包括直接对话。传递解析的会话密钥以及配置的 ACP 绑定是否拥有该路由。对于独占 ACP 路由或没有适用的合格条目时，它返回 `undefined`，否则返回已解析的组和 `mentionedAgentIds`。如果路由在准备后发生变化，请使用 `isGroupThreadRouteExclusive({ sessionKey, acpBinding })` 丢弃 ACP- 拥有的目标的参与者事实，并仅使用最终路由的普通提及和命令事实重新评估准入。将非空参与者匹配与普通门之前路由代理的本地提及事实合并，并将相同的选择事实带入调度。单代理门不得删除未路由参与者的提及。参与者选择需要 `@`- 风格匹配；仅凭名字或表情符号并不能选择代理。保持发送者授权和命令策略不变。

设置可选的 `replyOptions.groupThreadReplyFormatter(text, participant)` 以将适配器的参与者标签应用于源对话消息工具回复。参与者包含`agentId`和`name`；重用用于参与者传递元数据的普通回复的相同传输格式化程序。

对于插件拥有的发送，请在传递条目处从同一 SDK 读取 `getGroupThreadDeliverySession()`。如果存在，请将其 `agentId` 和 `sessionKey` 用于媒体根、内部挂钩和转录镜像，包括未标记的单代理组。保持运输帐户所有权不变。共享持久交付选择活跃的参与者上下文并在核心中运行身份。

推荐流程：

1. 计算本地提及事实。
2. 将这些事实传入 `resolveInboundMentionDecision({ facts, policy })`。
3. 在你的传入门控中使用 `decision.effectiveWasMentioned`、`decision.shouldBypassMention` 和 `decision.shouldSkip`。

```typescript
import {
  implicitMentionKindWhen,
  matchesMentionWithExplicit,
  resolveInboundMentionDecision,
} from "openclaw/plugin-sdk/channel-inbound";
import { resolveChannelImplicitMentions } from "openclaw/plugin-sdk/channel-ingress-runtime";

const wasMentioned = matchesMentionWithExplicit({
  text,
  mentionRegexes,
  explicit: {
    hasAnyMention,
    isExplicitlyMentioned,
    canResolveExplicit,
  },
});

const facts = {
  canDetectMention: true,
  wasMentioned,
  hasAnyMention,
  implicitMentionKinds: [
    ...implicitMentionKindWhen("reply_to_bot", isReplyToBot),
    ...implicitMentionKindWhen("quoted_bot", isQuoteOfBot),
  ],
};

const implicitMentions = resolveChannelImplicitMentions({
  cfg,
  channel: channelId,
  accountId,
});

const decision = resolveInboundMentionDecision({
  facts,
  policy: {
    isGroup,
    requireMention,
    implicitMentions,
    allowTextCommands,
    hasControlCommand,
    commandAuthorized,
  },
});

if (decision.shouldSkip) return;
```

`matchesMentionWithExplicit(...)` 返回一个布尔值。`hasAnyMention`、 `isExplicitlyMentioned` 和 `canResolveExplicit` 来自频道自身的原生提及元数据（消息实体、回复到机器人标志等）；当你的平台无法检测它们时， 请提供 `false`/`undefined` 值。

`api.runtime.channel.mentions` 为已经依赖运行时注入的打包频道插件暴露了相同的共享提及辅助工具： `buildMentionRegexes`、`matchesMentionPatterns`、`matchesMentionWithExplicit`、 `implicitMentionKindWhen`、`resolveInboundMentionDecision`。

如果你只需要 `implicitMentionKindWhen` 和 `resolveInboundMentionDecision`， 请从 `openclaw/plugin-sdk/channel-mention-gating` 导入，以避免加载无关的传入运行时辅助工具。

## <a id="bot-owned-threads"></a> Bot 拥有的线程

具有本机线程所有权的通道可以公开 `requireMentionInBotThreads`。省略的值会保留频道现有的提及行为。 `false` 允许在已配置的机器人启动的线程中不提及消息。 `true` 需要在那里提及，包括当普通 `requireMention` 设置为 `false` 时；回复或引用机器人以及之前的机器人参与不满足该要求。显式提及、本机提及证据和授权命令绕过保留其正常行为。

该插件拥有当前机器人启动线程并在从 `openclaw/plugin-sdk/channel-mention-gating` 调用 `resolveBotThreadMentionPolicy` 之前解析最具体的配置值的证据。机器人的参与本身并不是所有权。对于未知所有权、外部线程和普通通道消息，请传递 `isBotOwnedThread: false` 以保留现有行为。

在收集提及证据之后和共同决定之前应用助手：

```typescript
const threadPolicy = resolveBotThreadMentionPolicy({
  isBotOwnedThread,
  requireMentionInBotThreads,
  requireMention,
  implicitMentionKinds: facts.implicitMentionKinds,
});

const decision = resolveInboundMentionDecision({
  facts: { ...facts, implicitMentionKinds: threadPolicy.implicitMentionKinds },
  policy: { ...policy, requireMention: threadPolicy.requireMention },
});
```

此覆盖仅更改提及入场。保留现有的发件人白名单、通道访问策略和命令授权。没有可靠的本地所有权证据的渠道不应从缓存的参与中推断所有权或暴露他们无法强制执行的覆盖。

在将轮流交给共享调度之前，重新检查可变准入规则。进入后，保留轮次的捕获策略以进行回复，而不是使用提及或发件人门来取消传递。帐户、运行和传输活跃性仍然是其现有所有者的独立责任。
