---
summary: "持久化消息收发生命周期的状态：已发布内容、相较于最初设计的变更，以及仍然开放的问题"
read_when:
  - 重构通道发送或接收行为
  - 更改通道入站、回复分发、出站队列、预览流或插件 SDK 消息 API
  - 设计一个需要持久化发送、回执、预览、编辑或重试的新通道插件
title: "消息生命周期重构"
---

<Note>
本页最初是作为一份前瞻性设计提案而创建的。该设计的核心内容现已发布于 `src/channels/message/*` 以及公开的 `openclaw/plugin-sdk/channel-outbound` / `channel-inbound` 子路径中。关于当前 API，请使用 [Channel outbound API](/plugins/sdk-channel-outbound) 和 [Channel inbound API](/plugins/sdk-channel-inbound)。本页记录哪些内容已经发布、实现与最初草案有哪些偏离，以及哪些问题仍然开放。
</Note>

## 为什么进行了这次重构

通道栈由多个局部修复逐步发展而来：针对不同成熟度级别分别使用入站辅助函数（简单适配器使用 `runtime.channel.inbound.run`，功能丰富的适配器使用 `runtime.channel.inbound.runPreparedReply`）、诸如 `dispatchInboundReplyWithBase` 之类的旧版回复分发辅助函数、特定通道的预览流式传输，以及在现有回复负载路径上附加的最终投递持久性。这种结构导致公开概念过多，也导致投递语义可能发生偏差的位置过多。

促使这次重设计的可靠性缺口：

```text
Telegram 轮询更新被 ack
  -> assistant 最终文本已存在
  -> 进程在 sendMessage 成功前重启
  -> 最终响应丢失
```

目标不变量：一旦核心逻辑决定某个可见的外发消息应该存在，就必须在调用平台接口之前把发送意图持久化；并且在成功后提交平台回执。这样默认就能提供至少一次的恢复能力。只有当某个适配器证明了原生幂等性，或者在重放前将一次“发送后未知结果”的尝试与平台状态进行对账时，才会存在精确一次的行为。

## 已交付内容

内部域位于 `src/channels/message/*`：

| 文件                   | 负责                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `types.ts`             | 适配器、发送上下文、回执和持久化意图类型契约                                                  |
| `send.ts`              | `withDurableMessageSendContext` / `sendDurableMessageBatch` —— 持久化发送上下文                             |
| `receive.ts`           | `createMessageReceiveContext` —— 入站 ack 策略状态机                                                   |
| `live.ts`              | 实时预览状态，以及就地完成或回退逻辑                                                        |
| `state.ts`             | `classifyDurableSendRecoveryState` —— 中断后的恢复分类                                    |
| `receipt.ts`           | 将平台发送结果规范化为 `MessageReceipt`                                                             |
| `capabilities.ts`      | 从载荷推导所需的持久化最终能力                                                         |
| `contracts.ts`         | 对声明的适配器能力进行契约证明验证                                                      |
| `adapter.ts`           | `defineChannelMessageAdapter`                                                                                      |
| `outbound-bridge.ts`   | `createChannelMessageAdapterFromOutbound` —— 包装旧版 `sendText`/`sendMedia`/`sendPayload`/`sendPoll` 函数 |
| `ingress-queue.ts`     | `createChannelIngressQueue` —— 持久化入站事件队列                                                          |
| `durable-receive.ts`   | `createDurableInboundReceiveJournal` —— 用于入站去重的 accept/pending/complete/release 日志                  |
| `../turn/lifecycle.ts` | 规范化组装并路由频道回合分发（位于 `src/channels/turn/`）                               |
| `reply-pipeline.ts`    | `createChannelReplyPipeline`、回复前缀和输入状态回调辅助函数                                             |

公共接口：`openclaw/plugin-sdk/channel-outbound`（发送／回执／持久化／预览／回复管道
辅助函数）和 `openclaw/plugin-sdk/channel-inbound`（入站上下文、`runChannelInboundEvent`、
`dispatchChannelInboundReply`）。适配器示例、当前类型名称和迁移说明请参见这些页面——它们才是 API
形状的事实来源，而不是下面这些草图。

### 发送上下文

`withDurableMessageSendContext` 为频道代码提供围绕一条出站
消息的 `render`、`previewUpdate`、
`send`、`edit`、`delete`、`commit` 和 `fail` 步骤。`sendDurableMessageBatch` 是常见情况的包装器：先渲染，再发送，
然后在 `sent`／`suppressed` 时提交，或在出错时失败。

`sendDurableMessageBatch` 返回一个带区分的结果：

| 状态           | 含义                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| `sent`           | 至少有一条可见的平台消息已送达                              |
| `suppressed`     | 不应将任何平台消息视为缺失（hook-cancelled、dry-run 等） |
| `partial_failed` | 在后续载荷或副作用失败之前，至少有一条消息已送达      |
| `failed`         | 未生成任何平台回执                                                 |

持久性模式有 `required`、`best_effort` 或 `disabled`
（见 `src/channels/message/types.ts` 中的 `MessageDurabilityPolicy`）。`required`
在无法写入持久化意图时会关闭式失败；`best_effort` 在持久化不可用时
会退回到直接发送；`disabled` 保持重构前的直接发送行为。兼容性辅助函数默认
为 `disabled`，不会因为某个频道有通用的出站适配器就推断出 `required`。

仍然危险的边界是：平台调用成功后、回执提交前。如果进程在此处死亡，
核心无法知道平台消息是否存在，除非适配器声明了 `reconcileUnknownSend`。
该钩子会将中断的发送归类为 `sent`、`not_sent` 或
`unresolved`；只有 `not_sent` 允许重放。没有协调能力的频道会回退到
`unknown_after_send` 状态（`src/channels/message/state.ts`、
`src/infra/outbound/delivery-queue-recovery.ts`），并且只有在可见重复消息
对于该频道来说是可接受且已文档化的权衡时，才可能选择至少一次重放。

### 接收上下文

`createMessageReceiveContext` 通过幂等的 `ack()` 和显式的 `nack(error)` 跟踪每个入站事件的 ack/nack 状态。ack 策略
（`ChannelMessageReceiveAckPolicy`）如下：

| 策略                 | 何时确认                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `after_receive_record` | 核心已持久化足够的入站元数据，以对重投递进行去重／路由                           |
| `after_agent_dispatch` | 代理运行已被分发                                                             |
| `after_durable_send`   | 本轮的持久化出站发送已提交                                             |
| `manual`               | 调用方显式控制 ack 时机（未声明策略的适配器默认如此） |

Telegram 轮询使用它来持久化安全完成的更新水位
（`extensions/telegram/src/bot-update-tracker.ts` 中的 `safeCompletedUpdateId`）：
grammY 仍会在每个更新进入中间件链时观察到它，但
OpenClaw 只会将持久化的重启水位推进到那些已完成分发的更新之后，因此失败或仍
待处理的更新会在重启后重新播放。Telegram 上游的 `getUpdates` 偏移量仍由 grammY 管理；
尚未构建一个完全持久化的轮询源来控制平台级别、超出该水位的重投递（见开放问题）。

### 预览态

`src/channels/message/live.ts` 将预览／编辑／完成建模为一个生命周期：
`createLiveMessageState`、`markLiveMessagePreviewUpdated`、
`markLiveMessageFinalized`、`markLiveMessageCancelled`，以及
`deliverFinalizableLivePreviewAdapter`（从草稿构建最终编辑、应用它，
并在无法编辑或编辑失败时回退到普通发送）。
`LiveMessageState.phase` 为 `idle | previewing | finalizing | finalized |
cancelled`；`canFinalizeInPlace` 用于控制预览能否通过编辑而不是重新发送来变为最终消息。

### 持久化回执

`MessageReceipt`（`src/channels/message/types.ts`）将一次逻辑发送中的一个或多个
平台消息 id 规范化为 `platformMessageIds`，并为每个部分提供 `parts`
（kind、index、thread id、reply-to id）。保留主 id 以用于线程和后续编辑。
这使得多部分投递（文本加媒体、分块文本、卡片回退）在重启后仍可重放和去重。

### 公共 SDK 收缩

此次重构吸收或弃用了：`reply-runtime`、`reply-dispatch-runtime`、
`reply-reference`、`reply-chunking`、作为公共
API 暴露的 `reply-payload` 辅助函数、`inbound-reply-dispatch`、
`channel-reply-pipeline`，以及旧出站门面的绝大多数公共用法。`src/plugin-sdk/channel-message.ts` 现在是一个
`@deprecated` 的重导出汇总入口，指向 `channel-outbound` /
`channel-inbound`；`channel.turn` 运行时别名已被移除，旧的
`/plugins/sdk-channel-turn` 文档页会重定向到
[Channel inbound API](/plugins/sdk-channel-inbound)。新的插件代码应
直接面向 `channel-outbound` 和 `channel-inbound`。

## 实现与原始设计的偏差

下面的设计草图从未按字面描述的方式发布。保留此记录是为了
历史准确性；不要把这些类型名当作当前 API。

- **没有 `MessageOrigin` / `shouldDropOpenClawEcho`。** 原始方案要求在
  网关失败消息上添加 `source: "openclaw"` 的来源标签，并提供一个共享
  谓词，用于在 `allowBots` 授权之前，丢弃共享房间中带标签的机器人
  生成回显。该类型和谓词在代码库中都不存在。`allowBots` 本身确实是一个
  按频道配置的真实键（Slack、Discord、Google Chat 等都支持），但用于保护
  它的来源标记机制从未实现。启用机器人房间中的网关失败回显抑制仍然是
  一个未解决的缺口，而不是已交付的保证。
- **没有统一的 `core.messages.receive/send/live/state` 命名空间。** 已发布
  的函数直接位于 `src/channels/message/*` 中
  （`withDurableMessageSendContext`、`createMessageReceiveContext`、
  `createLiveMessageState`、`classifyDurableSendRecoveryState`），而不是
  通过 `core.messages.*` 门面暴露。
- **没有通用的 `ChannelMessage` / `MessageTarget` / `MessageRelation`
  归一化消息类型。** Core 仍然通过发送适配器传递具体的回复载荷
  （`ReplyPayload`）和频道特定上下文，而不是使用一种平台中立的消息形状，
  并带有 `kind: "reply" | "followup" | "broadcast" | "system"` 关系。
- **Ack 策略名称与草图不同。** 已发布的为：
  `after_receive_record | after_agent_dispatch | after_durable_send | manual`。
  原始草图使用的是 `immediate | after-record | after-durable-send |
manual`，并带有一个 webhook 超时原因字段；该结构并未实现。
- **`DurableFinalDeliveryRequirementMap` 能力键取代了草图中的
  `MessageCapabilities` 对象。** 能力是扁平的布尔标志（`text`、`media`、
  `poll`、`payload`、`silent`、`replyTo`、`thread`、`nativeQuote`、
  `messageSendingHooks`、`batch`、`reconcileUnknownSend`、
  `afterSendSuccess`、`afterCommit`），通过
  `verifyDurableFinalCapabilityProofs` 进行验证，而不是类似
  `text.chunking` / `attachments.voice` 的嵌套结构。

## 具体的迁移风险（仍然相关）

这些特定于通道的副作用早于此次重构就已存在，且必须在新的发送路径中继续正常工作。它们并非假设：目前每一项都已实现，并且是关键依赖。

- **iMessage** (`extensions/imessage/src/monitor/echo-cache.ts`,
  `persisted-echo-cache.ts`): 监视器在成功发送后会将已发送消息记录到回声
  缓存中。持久化的最终发送仍必须填充该缓存，否则 OpenClaw 可能会把自己
  的回复重新作为入站用户消息重新摄取。
- **Tlon** (`extensions/tlon/src/monitor/index.ts`): 在群组回复后会附加可选的模型
  签名，并记录参与过的线程。持久化交付不能绕过这些效果。
- **Discord 和其他预构建分发器** 已经负责直接交付和预览行为。只有当某个通道
  的预构建分发器明确通过发送上下文路由最终消息时，该通道才算端到端持久化；
  不要仅凭通用适配器就假定已覆盖。
- **Telegram 静默回退交付** 在分块/回退投影之后必须交付整个投影后的有效载荷
  数组，而不只是第一个有效载荷。
- **LINE、Zalo、Nostr** 以及类似的辅助路径可能包含回复令牌处理、媒体代理、已
  发送消息缓存，或仅回调目标。在这些语义被发送适配器表示出来并由测试覆盖之前，
  它们都应继续由通道自身负责交付。
- **直接 DM 辅助工具** 可能带有一个回复回调，而这才是唯一正确的传输目标。
  通用出站逻辑不得仅根据原始平台字段去猜测目标并跳过该回调。

## 失败分类

适配器将传输失败分类为 `DeliveryFailureKind` 风格的封闭
类别（瞬时、速率限制、认证、权限、未找到、无效
载荷、冲突、已取消、未知）。核心策略：

- 重试瞬时失败和速率限制失败。
- 除非存在渲染回退，否则不要重试无效载荷失败。
- 在配置变更之前，不要重试认证或权限失败。
- 在未找到时，当通道声明该操作安全时，让实时完成
  从编辑回退到新的发送。
- 在冲突时，使用回执／幂等状态来判断该消息是否
  已经存在。
- 平台调用之后但在回执提交之前发生的任何错误都可能意味着调用已成功，
  但会变为 `unknown_after_send`，除非适配器证明平台
  操作并未发生。

## 待解决的问题

- Telegram 是否最终应该用一个完全持久化的轮询源来替代 grammY（`1.43.0`）的轮询
  runner，该轮询源不仅控制 OpenClaw 持久化的重启水位线
  （`safeCompletedUpdateId`），还控制平台级别的重投递。
- 预览状态是否应该与最终发送
  意图保存在同一条记录中，还是放在一个兄弟级的 live-state 存储中。
- 在共享的 bot-enabled 房间中，网关失败的回声抑制是否需要
  最初计划的 origin-tagging 机制、更简单的按通道协议，或者是否超出范围。
- 哪些通道原生支持用于跨 bot 回声抑制的 origin/metadata，
  以及哪些通道需要一个持久化的 outbound registry。

## 相关

- [消息](/concepts/messages)
- [流式传输和分块](/concepts/streaming)
- [进度草稿](/concepts/progress-drafts)
- [重试策略](/concepts/retry)
- [频道出站 API](/plugins/sdk-channel-outbound)
- [频道入站 API](/plugins/sdk-channel-inbound)
