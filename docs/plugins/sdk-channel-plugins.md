---
summary: "为 OpenClaw 构建消息通道插件的分步指南"
title: "构建通道插件"
sidebarTitle: "通道插件"
read_when:
  - 你正在构建一个新的消息通道插件
  - 你想将 OpenClaw 连接到某个消息平台
  - 你需要理解 ChannelPlugin 适配器表面
---

本指南将带你构建一个将 OpenClaw 连接到消息平台的通道插件。到最后，你将拥有一个可工作的通道，具备 DM 安全性、配对、回复线程和外发消息功能。

<Info>
  如果你以前没有构建过任何 OpenClaw 插件，请先阅读
  [入门](/plugins/building-plugins)，了解基础包结构和 manifest 设置。
</Info>

## 通道插件如何工作

通道插件不需要自己提供发送/编辑/反应工具。OpenClaw 在核心中保留了一个共享的
`message` 工具。你的插件负责：

- **配置** - 账户解析和设置向导
- **安全性** - DM 策略和允许列表
- **配对** - DM 审批流程
- **会话语法** - 提供商特定的会话 id 如何映射到基础聊天、线程 id 和父级回退
- **外发** - 向平台发送文本、媒体和投票
- **线程** - 回复如何被线程化
- **心跳输入中** - 用于心跳投递目标的可选输入中/忙碌信号

核心负责共享消息工具、提示词接线、外层会话键形状、
通用的 `:thread:` 记账以及分发。

新的通道插件还应通过来自 `openclaw/plugin-sdk/channel-outbound` 的 `defineChannelMessageAdapter` 暴露一个 `message` 适配器。该适配器声明本机传输实际支持哪些持久化的最终发送能力，并将文本/媒体发送指向与旧版 `outbound` 适配器相同的传输函数。只有当契约测试证明本机副作用和返回的回执时，才应声明某项能力。完整的 API 契约、示例、能力矩阵、回执规则、实时预览最终化、接收 ack 策略、测试和迁移表，请参见 [Channel outbound API](/plugins/sdk-channel-outbound)。如果现有的 `outbound` 适配器已经拥有正确的发送方法和能力元数据，则应使用 `createChannelMessageAdapterFromOutbound(...)` 派生 `message` 适配器，而不是手工编写另一层桥接。适配器发送应返回 `MessageReceipt` 值。当兼容性代码仍然需要旧版 id 时，应通过 `listMessageReceiptPlatformIds(...)` 或 `resolveMessageReceiptPrimaryId(...)` 派生它们，而不是在新的生命周期代码中保留并行的 `messageIds` 字段。支持预览的通道还应声明 `message.live.capabilities`，并精确列出其拥有的实时生命周期，例如 `draftPreview`、`previewFinalization`、`progressUpdates`、`nativeStreaming` 或 `quietFinalization`。会将草稿预览就地定稿的通道还应声明 `message.live.finalizer.capabilities`，例如 `finalEdit`、`normalFallback`、`discardPending`、`previewReceipt` 和 `retainOnAmbiguousFailure`，并通过 `defineFinalizableLivePreviewAdapter(...)` 加上 `deliverWithFinalizableLivePreviewAdapter(...)` 将运行时逻辑路由过去。请用 `verifyChannelMessageLiveCapabilityAdapterProofs(...)` 和 `verifyChannelMessageLiveFinalizerProofs(...)` 测试来支撑这些能力，以防本机预览、进度、编辑、回退/保留、清理和回执行为悄然漂移。延迟平台确认的入站接收器应声明 `message.receive.defaultAckPolicy` 和 `supportedAckPolicies`，而不是把 ack 时序隐藏在 monitor 本地状态中。为每一种声明的策略都要通过 `verifyChannelMessageReceiveAckPolicyAdapterProofs(...)` 覆盖。

像 `createChannelTurnReplyPipeline`、`dispatchInboundReplyWithBase` 和 `recordInboundSessionAndDispatchReply` 这样的遗留回复帮助器仍可用于兼容性分发器。不要在新的通道代码中使用这些名称；新的插件应从 `message` 适配器、回执以及 `openclaw/plugin-sdk/channel-outbound` 上的接收/发送生命周期帮助器开始。

迁移入站授权的通道可以在运行时接收路径中使用实验性的
`openclaw/plugin-sdk/channel-ingress-runtime` 子路径。该子路径将平台查找和副作用保留在插件内，同时共享允许列表状态解析、路由/发送者/命令/事件/激活决策、脱敏诊断以及轮次准入映射。请把插件身份规范化保留在传给解析器的描述符中；不要从已解析状态或决策中序列化原始匹配值。有关 API 设计、
所有权边界和测试预期，请参见
[Channel ingress API](/plugins/sdk-channel-ingress)。

如果你的通道在入站回复之外也支持输入中指示器，请在通道插件上暴露
`heartbeat.sendTyping(...)`。核心会在心跳模型运行开始前，使用已解析的心跳投递目标调用它，并使用共享的输入中保持活动/清理生命周期。当平台需要显式停止信号时，请添加 `heartbeat.clearTyping(...)`。

如果你的通道添加了携带媒体源的消息工具参数，请通过 `describeMessageTool(...).mediaSourceParams` 暴露这些参数名。核心会将该显式列表用于沙箱路径规范化和外发媒体访问策略，因此插件无需为提供商特定的头像、附件或封面图参数在共享核心中添加特殊处理。优先返回形如
`{ "set-profile": ["avatarUrl", "avatarPath"] }` 的按动作键控映射，这样无关动作就不会继承其他动作的媒体参数。对于刻意在每个暴露动作间共享的参数，平面数组仍然可用。
必须为平台侧媒体抓取暴露临时公共 URL 的通道，可以使用 `openclaw/plugin-sdk/outbound-media` 中的 `createHostedOutboundMediaStore(...)` 并结合插件状态存储。平台路由解析和令牌校验应保留在通道插件中；共享帮助器只负责媒体加载、过期元数据、分块行和清理。

如果你的通道需要对 `message(action="send")` 进行提供商特定的形状处理，请优先使用 `actions.prepareSendPayload(...)`。将原生卡片、块、嵌入或其他持久化数据放到 `payload.channelData.<channel>` 下，并让核心通过 outbound/message 适配器执行实际发送。仅当负载无法序列化和重试时，才使用 `actions.handleAction(...)` 作为发送的兼容性回退。

如果你的平台将额外的作用域存储在会话 id 中，请使用 `messaging.resolveSessionConversation(...)` 在插件中完成这部分解析。这是将 `rawId` 映射到基础会话 id、可选线程 id、显式 `baseConversationId` 以及任何 `parentConversationCandidates` 的标准挂钩。当你返回 `parentConversationCandidates` 时，请按从最窄父级到最宽/基础会话的顺序排列。

当插件代码需要规范化类似路由的字段、比较子线程与其父路由，或从 `{ channel, to, accountId, threadId }` 构建稳定的去重键时，请使用 `openclaw/plugin-sdk/channel-route`。该帮助器会像核心一样规范化数字线程 id，因此插件应优先使用它，而不是临时的 `String(threadId)` 比较。
具有提供商特定目标语法的插件应暴露 `messaging.resolveOutboundSessionRoute(...)`，这样核心就能获得提供商原生的会话和线程标识，而无需使用解析器 shim。

打包后的插件如果在通道注册表启动之前就需要相同的解析逻辑，也可以暴露一个顶层的 `session-key-api.ts` 文件，并提供匹配的
`resolveSessionConversation(...)` 导出。只有在运行时插件注册表尚不可用时，核心才会使用这个适用于引导阶段的接口。

当插件只需要在通用/raw id 之上提供父级回退时，`messaging.resolveParentConversationCandidates(...)` 仍然可作为遗留兼容回退。如果两个钩子都存在，核心会先使用
`resolveSessionConversation(...).parentConversationCandidates`，只有在规范钩子省略它们时才回退到 `resolveParentConversationCandidates(...)`。

## 审批与通道能力

大多数通道插件不需要审批相关的专门代码。

- Core owns same-chat `/approve`, shared approval button payloads, and generic fallback delivery.
- Prefer one `approvalCapability` object on the channel plugin when the channel needs approval-specific behavior.
- `ChannelPlugin.approvals` is removed. Put approval delivery/native/render/auth facts on `approvalCapability`.
- `plugin.auth` is login/logout only; core no longer reads approval auth hooks from that object.
- `approvalCapability.authorizeActorAction` and `approvalCapability.getActionAvailabilityState` are the canonical approval-auth seam.
- Use `approvalCapability.getActionAvailabilityState` for same-chat approval auth availability.
- If your channel exposes native exec approvals, use `approvalCapability.getExecInitiatingSurfaceState` for the initiating-surface/native-client state when it differs from same-chat approval auth. Core uses that exec-specific hook to distinguish `enabled` vs `disabled`, decide whether the initiating channel supports native exec approvals, and include the channel in native-client fallback guidance. `createApproverRestrictedNativeApprovalCapability(...)` fills this in for the common case.
- Use `outbound.shouldSuppressLocalPayloadPrompt` or `outbound.beforeDeliverPayload` for channel-specific payload lifecycle behavior such as hiding duplicate local approval prompts or sending typing indicators before delivery.
- Use `approvalCapability.delivery` only for native approval routing or fallback suppression.
- Use `approvalCapability.nativeRuntime` for channel-owned native approval facts. Keep it lazy on hot channel entrypoints with `createLazyChannelApprovalNativeRuntimeAdapter(...)`, which can import your runtime module on demand while still letting core assemble the approval lifecycle.
- Use `approvalCapability.render` only when a channel truly needs custom approval payloads instead of the shared renderer.
- Use `approvalCapability.describeExecApprovalSetup` when the channel wants the disabled-path reply to explain the exact config knobs needed to enable native exec approvals. The hook receives `{ channel, channelLabel, accountId }`; named-account channels should render account-scoped paths such as `channels.<channel>.accounts.<id>.execApprovals.*` instead of top-level defaults.
- If a channel can infer stable owner-like DM identities from existing config, use `createResolvedApproverActionAuthAdapter` from `openclaw/plugin-sdk/approval-runtime` to restrict same-chat `/approve` without adding approval-specific core logic.
- If custom approval auth intentionally allows only same-chat fallback, return `markImplicitSameChatApprovalAuthorization({ authorized: true })` from `openclaw/plugin-sdk/approval-auth-runtime`; otherwise core treats the result as explicit approver authorization.
- If a channel-owned native callback resolves approvals directly, use `isImplicitSameChatApprovalAuthorization(...)` before resolving so implicit fallback still goes through the channel's normal actor authorization.
- If a channel needs native approval delivery, keep channel code focused on target normalization plus transport/presentation facts. Use `createChannelExecApprovalProfile`, `createChannelNativeOriginTargetResolver`, `createChannelApproverDmTargetResolver`, and `createApproverRestrictedNativeApprovalCapability` from `openclaw/plugin-sdk/approval-runtime`. Put the channel-specific facts behind `approvalCapability.nativeRuntime`, ideally via `createChannelApprovalNativeRuntimeAdapter(...)` or `createLazyChannelApprovalNativeRuntimeAdapter(...)`, so core can assemble the handler and own request filtering, routing, dedupe, expiry, gateway subscription, and routed-elsewhere notices. `nativeRuntime` is split into a few smaller seams:
- Use `createNativeApprovalChannelRouteGates` from `openclaw/plugin-sdk/approval-native-runtime` when a channel supports both session-origin native delivery and explicit approval forwarding targets. The helper centralizes approval config selection, `mode` handling, agent/session filters, account binding, session-target matching, and target-list matching while callers still own the channel id, default forwarding mode, account lookup, transport-enabled check, target normalization, and turn-source target resolution. Do not use it to create core-owned channel policy defaults; pass the channel's documented default mode explicitly.
- `createChannelNativeOriginTargetResolver` uses the shared channel-route matcher by default for `{ to, accountId, threadId }` targets. Pass `targetsMatch` only when a channel has provider-specific equivalence rules, such as Slack timestamp prefix matching.
- Pass `normalizeTargetForMatch` to `createChannelNativeOriginTargetResolver` when the channel needs to canonicalize provider ids before the default route matcher or a custom `targetsMatch` callback runs, while preserving the original target for delivery. Use `normalizeTarget` only when the resolved delivery target itself should be canonicalized.
- `availability` - whether the account is configured and whether a request should be handled
- `presentation` - map the shared approval view model into pending/resolved/expired native payloads or final actions
- `transport` - prepare targets plus send/update/delete native approval messages
- `interactions` - optional bind/unbind/clear-action hooks for native buttons or reactions, plus an optional `cancelDelivered` hook. Implement `cancelDelivered` when `deliverPending` registers in-process or persistent state (such as a reaction target store) so that state can be released if a handler stop cancels the delivery before `bindPending` runs or when `bindPending` returns no handle
- `observe` - optional delivery diagnostics hooks
- If the channel needs runtime-owned objects such as a client, token, Bolt app, or webhook receiver, register them through `openclaw/plugin-sdk/channel-runtime-context`. The generic runtime-context registry lets core bootstrap capability-driven handlers from channel startup state without adding approval-specific wrapper glue.
- Reach for the lower-level `createChannelApprovalHandler` or `createChannelNativeApprovalRuntime` only when the capability-driven seam is not expressive enough yet.
- Native approval channels must route both `accountId` and `approvalKind` through those helpers. `accountId` keeps multi-account approval policy scoped to the right bot account, and `approvalKind` keeps exec vs plugin approval behavior available to the channel without hardcoded branches in core.
- Core now owns approval reroute notices too. Channel plugins should not send their own "approval went to DMs / another channel" follow-up messages from `createChannelNativeApprovalRuntime`; instead, expose accurate origin + approver-DM routing through the shared approval capability helpers and let core aggregate actual deliveries before posting any notice back to the initiating chat.
- Preserve the delivered approval id kind end-to-end. Native clients should not
  guess or rewrite exec vs plugin approval routing from channel-local state.
- Different approval kinds can intentionally expose different native surfaces.
  Current bundled examples:
  - Slack keeps native approval routing available for both exec and plugin ids.
  - Matrix keeps the same native DM/channel routing and reaction UX for exec
    and plugin approvals, while still letting auth differ by approval kind.
- `createApproverRestrictedNativeApprovalAdapter` still exists as a compatibility wrapper, but new code should prefer the capability builder and expose `approvalCapability` on the plugin.

对于高频通道入口，当你只需要这一组能力中的某一部分时，优先使用更窄的运行时子路径：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

同样地，在不需要更宽泛的总入口接入面时，优先使用 `openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、
`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`。

特别是针对设置：

- `openclaw/plugin-sdk/setup-runtime` 覆盖运行时安全的设置帮助器：
  `createSetupTranslator`、导入安全的设置补丁适配器（`createPatchedAccountSetupAdapter`、
  `createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`）、lookup-note 输出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 以及委派式
  setup-proxy 构建器
- `openclaw/plugin-sdk/setup-runtime` 包含用于
  `createEnvPatchedAccountSetupAdapter` 的环境感知适配器接缝
- `openclaw/plugin-sdk/channel-setup` 覆盖可选安装的设置
  构建器，以及一些设置安全的原语：
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`，

如果你的通道支持由环境驱动的设置或认证，并且通用启动/配置流程在运行时加载之前就应该知道这些环境名，请在插件 manifest 中通过 `channelEnvVars` 声明它们。仅将通道运行时的 `envVars` 或本地常量用于面向操作员的文案。

如果你的通道可能在插件运行时启动前出现在 `status`、`channels list`、`channels status` 或 SecretRef 扫描中，请在 `package.json` 中添加 `openclaw.setupEntry`。该入口点应当能够在只读命令路径中安全导入，并返回这些摘要所需的通道元数据、设置安全配置适配器、状态适配器以及通道密钥目标元数据。不要从设置入口启动客户端、监听器或传输运行时。

主通道入口导入路径也要保持精简。发现流程可以在不激活通道的情况下评估入口和通道插件模块，以注册能力。像 `channel-plugin-api.ts` 这样的文件应导出通道插件对象，而不要导入设置向导、传输客户端、socket 监听器、子进程启动器或服务启动模块。把这些运行时部分放在从 `registerFull(...)`、运行时 setter 或惰性能力适配器加载的模块中。

`createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、
`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 和
`splitSetupEntries`

- 只有在你还需要更重的共享设置/配置帮助器，例如
  `moveSingleAccountChannelSectionToDefaultAccount(...)` 时，才使用更宽泛的
  `openclaw/plugin-sdk/setup` 接入面

如果你的通道在设置界面中只想提示“请先安装此插件”，请优先使用 `createOptionalChannelSetupSurface(...)`。生成的适配器/向导会在配置写入和最终化时关闭失败，并且它们会在校验、最终化和文档链接文案中复用相同的“需要安装”消息。

对于其他高频通道路径，在不需要更宽泛的遗留接入面时，优先使用更窄的帮助器：

- `openclaw/plugin-sdk/account-core`,
  `openclaw/plugin-sdk/account-id`,
  `openclaw/plugin-sdk/account-resolution`, and
  `openclaw/plugin-sdk/account-helpers` for multi-account config and
  default-account fallback
- `openclaw/plugin-sdk/inbound-envelope` and
  `openclaw/plugin-sdk/channel-inbound` for inbound route/envelope and
  record-and-dispatch wiring
- `openclaw/plugin-sdk/channel-targets` for target parsing helpers
- `openclaw/plugin-sdk/outbound-media` for media loading and
  `openclaw/plugin-sdk/channel-outbound` for outbound identity/send delegates
  and payload planning
- `buildThreadAwareOutboundSessionRoute(...)` from
  `openclaw/plugin-sdk/channel-core` when an outbound route should preserve an
  explicit `replyToId`/`threadId` or recover the current `:thread:` session
  after the base session key still matches. Provider plugins can override
  precedence, suffix behavior, and thread id normalization when their platform
  has native thread delivery semantics.
- `openclaw/plugin-sdk/thread-bindings-runtime` for thread-binding lifecycle
  and adapter registration
- `openclaw/plugin-sdk/agent-media-payload` only when a legacy agent/media
  payload field layout is still required
- `openclaw/plugin-sdk/telegram-command-config` for Telegram custom-command
  normalization, duplicate/conflict validation, and a fallback-stable command
  config contract

仅认证类的通道通常可以停留在默认路径：核心处理审批，插件只暴露外发/认证能力。像 Matrix、Slack、Telegram 和自定义聊天传输这类原生审批通道，应当使用共享的原生帮助器，而不是自己重新实现审批生命周期。

## 传入提及策略

将传入提及处理分成两层：

- 插件拥有的证据收集
- 共享策略评估

对提及策略决策使用 `openclaw/plugin-sdk/channel-mention-gating`。
仅当你需要更广泛的传入辅助入口时，才使用 `openclaw/plugin-sdk/channel-inbound`。

适合放在插件本地逻辑中的内容：

- 回复到机器人检测
- 引用机器人检测
- 线程参与检查
- 服务/系统消息排除
- 用于证明机器人参与所需的平台原生缓存

适合放在共享辅助中的内容：

- `requireMention`
- 显式提及结果
- 隐式提及允许列表
- 命令旁路
- 最终跳过决策

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

const mentionMatch = matchesMentionWithExplicit(text, {
  mentionRegexes,
  mentionPatterns,
});

const facts = {
  canDetectMention: true,
  wasMentioned: mentionMatch.matched,
  hasAnyMention: mentionMatch.hasExplicitMention,
  implicitMentionKinds: [
    ...implicitMentionKindWhen("reply_to_bot", isReplyToBot),
    ...implicitMentionKindWhen("quoted_bot", isQuoteOfBot),
  ],
};

const decision = resolveInboundMentionDecision({
  facts,
  policy: {
    isGroup,
    requireMention,
    allowedImplicitMentionKinds: requireExplicitMention ? [] : ["reply_to_bot", "quoted_bot"],
    allowTextCommands,
    hasControlCommand,
    commandAuthorized,
  },
});

if (decision.shouldSkip) return;
```

`api.runtime.channel.mentions` 为已经依赖运行时注入的打包频道插件暴露相同的共享提及辅助：

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

如果你只需要 `implicitMentionKindWhen` 和 `resolveInboundMentionDecision`，请从 `openclaw/plugin-sdk/channel-mention-gating` 导入，以避免加载无关的传入运行时辅助。

使用 `resolveInboundMentionDecision({ facts, policy })` 进行提及门控。

## 操作指南

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="包与清单">
    创建标准插件文件。`package.json` 中的 `channel` 字段表明这是一个频道插件。有关完整的包元数据规范，请参见
    [插件设置与配置](/plugins/sdk-setup#openclaw-channel)：

    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-chat",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "setupEntry": "./setup-entry.ts",
        "channel": {
          "id": "acme-chat",
          "label": "Acme Chat",
          "blurb": "将 OpenClaw 连接到 Acme Chat。"
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-chat",
      "kind": "channel",
      "channels": ["acme-chat"],
      "name": "Acme Chat",
      "description": "Acme Chat 频道插件",
      "configSchema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {}
      },
      "channelConfigs": {
        "acme-chat": {
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "token": { "type": "string" },
              "allowFrom": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          },
          "uiHints": {
            "token": {
              "label": "机器人令牌",
              "sensitive": true
            }
          }
        }
      }
    }
    ```
    </CodeGroup>

    `configSchema` 验证 `plugins.entries.acme-chat.config`。将其用于不属于频道账户配置的插件自有设置。`channelConfigs` 验证 `channels.acme-chat`，并且是在插件运行时加载之前，由配置 schema、设置和 UI 界面使用的冷路径来源。

  </Step>

  <Step title="构建频道插件对象">
    `ChannelPlugin` 接口有许多可选的适配器表面。先从最小配置开始——`id` 和 `setup`——然后按需添加适配器。

    创建 `src/channel.ts`：

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/channel-core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatApi } from "./client.js"; // 你的平台 API 客户端

    type ResolvedAccount = {
      accountId: string | null;
      token: string;
      allowFrom: string[];
      dmPolicy: string | undefined;
    };

    function resolveAccount(
      cfg: OpenClawConfig,
      accountId?: string | null,
    ): ResolvedAccount {
      const section = (cfg.channels as Record<string, any>)?.["acme-chat"];
      const token = section?.token;
      if (!token) throw new Error("acme-chat: 需要 token");
      return {
        accountId: accountId ?? null,
        token,
        allowFrom: section?.allowFrom ?? [],
        dmPolicy: section?.dmSecurity,
      };
    }

    export const acmeChatPlugin = createChatChannelPlugin<ResolvedAccount>({
      base: createChannelPluginBase({
        id: "acme-chat",
        setup: {
          resolveAccount,
          inspectAccount(cfg, accountId) {
            const section =
              (cfg.channels as Record<string, any>)?.["acme-chat"];
            return {
              enabled: Boolean(section?.token),
              configured: Boolean(section?.token),
              tokenStatus: section?.token ? "available" : "missing",
            };
          },
        },
      }),

      // DM 安全：谁可以给机器人发消息
      security: {
        dm: {
          channelKey: "acme-chat",
          resolvePolicy: (account) => account.dmPolicy,
          resolveAllowFrom: (account) => account.allowFrom,
          defaultPolicy: "allowlist",
        },
      },

      // 配对：新 DM 联系人的审批流程
      pairing: {
        text: {
          idLabel: "Acme Chat 用户名",
          message: "发送此代码以验证你的身份：",
          notify: async ({ target, code }) => {
            await acmeChatApi.sendDm(target, `Pairing code: ${code}`);
          },
        },
      },

      // 线程：回复如何被投递
      threading: { topLevelReplyToMode: "reply" },

      // 发出：向平台发送消息
      outbound: {
        attachedResults: {
          sendText: async (params) => {
            const result = await acmeChatApi.sendMessage(
              params.to,
              params.text,
            );
            return { messageId: result.id };
          },
        },
        base: {
          sendMedia: async (params) => {
            await acmeChatApi.sendFile(params.to, params.filePath);
          },
        },
      },
    });
    ```

    对于同时接受规范的顶层 DM 键和旧式嵌套键的频道，请使用 `plugin-sdk/channel-config-helpers` 中的辅助函数：`resolveChannelDmAccess`、`resolveChannelDmPolicy`、`resolveChannelDmAllowFrom` 和 `normalizeChannelDmPolicy` 可优先使用账户本地值，而不是继承的根值。通过 `normalizeLegacyDmAliases` 将同一个解析器用于 doctor 修复，以便运行时和迁移读取同一份契约。

    <Accordion title="createChatChannelPlugin 会为你做什么">
      你无需手动实现底层适配器接口，只需传入声明式选项，构建器会将它们组合起来：

      | 选项 | 作用 |
      | --- | --- |
      | `security.dm` | 从配置字段中作用域化解析 DM 安全策略 |
      | `pairing.text` | 基于文本的 DM 配对流程，带代码交换 |
      | `threading` | 回复模式解析器（固定、按账户作用域或自定义） |
      | `outbound.attachedResults` | 返回结果元数据（消息 ID）的发送函数 |

      如果你需要完全控制，也可以传入原始适配器对象，而不是声明式选项。

      原始发出适配器可以定义 `chunker(text, limit, ctx)` 函数。
      可选的 `ctx.formatting` 携带投递时的格式化决策，例如 `maxLinesPerMessage`；发送前应先应用它，以便共享发出投递只需解析一次回复线程和分块边界。
      当解析出了原生回复目标时，发送上下文还包括 `replyToIdSource`（`implicit` 或 `explicit`），这样负载辅助函数可以保留显式回复标签，而不会消耗隐式的一次性回复槽位。
    </Accordion>

  </Step>

  <Step title="连接入口点">
    创建 `index.ts`：

    ```typescript index.ts
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineChannelPluginEntry({
      id: "acme-chat",
      name: "Acme Chat",
      description: "Acme Chat 频道插件",
      plugin: acmeChatPlugin,
      registerCliMetadata(api) {
        api.registerCli(
          ({ program }) => {
            program
              .command("acme-chat")
              .description("Acme Chat 管理");
          },
          {
            descriptors: [
              {
                name: "acme-chat",
                description: "Acme Chat 管理",
                hasSubcommands: false,
              },
            ],
          },
        );
      },
      registerFull(api) {
        api.registerGatewayMethod(/* ... */);
      },
    });
    ```

    将频道拥有的 CLI 描述符放在 `registerCliMetadata(...)` 中，这样 OpenClaw 就能在根帮助中显示它们，而无需激活完整的频道运行时；同时正常的完整加载仍会获得相同的描述符用于真实的命令注册。将 `registerFull(...)` 保留给仅运行时工作。
    如果 `registerFull(...)` 注册 gateway RPC 方法，请使用插件特定前缀。核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）仍然保留，并且始终解析为 `operator.admin`。
    `defineChannelPluginEntry` 会自动处理注册模式分离。请参见
    [入口点](/plugins/sdk-entrypoints#definechannelpluginentry) 了解所有选项。

  </Step>

  <Step title="添加设置入口">
    创建 `setup-entry.ts`，用于在引导期间进行轻量加载：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    当频道被禁用或未配置时，OpenClaw 会加载此入口而不是完整入口。
    这样可避免在设置流程中拉取沉重的运行时代码。
    详见 [设置与配置](/plugins/sdk-setup#setup-entry)。

    将设置安全导出拆分到 sidecar 模块的打包工作区频道，如果还需要一个显式的设置期运行时 setter，可以使用 `openclaw/plugin-sdk/channel-entry-contract` 中的 `defineBundledChannelSetupEntry(...)`。

  </Step>

  <Step title="处理传入消息">
    你的插件需要接收来自平台的消息并将它们转发给 OpenClaw。典型模式是使用 webhook 验证请求，然后通过频道的传入处理器分发它：

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // 由插件管理的认证（自行验证签名）
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // 你的传入处理器将消息分发给 OpenClaw。
          // 具体接线取决于你的平台 SDK -
          // 请参见打包的 Microsoft Teams 或 Google Chat 插件包中的真实示例。
          await handleAcmeChatInbound(api, event);

          res.statusCode = 200;
          res.end("ok");
          return true;
        },
      });
    }
    ```

    <Note>
      传入消息处理是频道特定的。每个频道插件都拥有自己的传入流水线。查看打包的频道插件（例如 Microsoft Teams 或 Google Chat 插件包）以了解真实模式。
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="测试">
在 `src/channel.test.ts` 中编写就近测试：

    ```typescript src/channel.test.ts
    import { describe, it, expect } from "vitest";
    import { acmeChatPlugin } from "./channel.js";

    describe("acme-chat plugin", () => {
      it("从配置中解析账户", () => {
        const cfg = {
          channels: {
            "acme-chat": { token: "test-token", allowFrom: ["user1"] },
          },
        } as any;
        const account = acmeChatPlugin.setup!.resolveAccount(cfg, undefined);
        expect(account.token).toBe("test-token");
      });

      it("检查账户时不具现化密钥", () => {
        const cfg = {
          channels: { "acme-chat": { token: "test-token" } },
        } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(true);
        expect(result.tokenStatus).toBe("available");
      });

      it("报告缺失配置", () => {
        const cfg = { channels: {} } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(false);
      });
    });
    ```

    ```bash
    pnpm test -- <bundled-plugin-root>/acme-chat/
    ```

    关于共享测试辅助，请参见 [测试](/plugins/sdk-testing)。

</Step>
</Steps>

## 文件结构

```
<bundled-plugin-root>/acme-chat/
├── package.json              # openclaw.channel 元数据
├── openclaw.plugin.json      # 带有配置 schema 的清单
├── index.ts                  # defineChannelPluginEntry
├── setup-entry.ts            # defineSetupPluginEntry
├── api.ts                    # 公共导出（可选）
├── runtime-api.ts            # 内部运行时导出（可选）
└── src/
    ├── channel.ts            # 通过 createChatChannelPlugin 实现的 ChannelPlugin
    ├── channel.test.ts       # 测试
    ├── client.ts             # 平台 API 客户端
    └── runtime.ts            # 运行时存储（如需要）
```

## 高级主题

<CardGroup cols={2}>
  <Card title="线程选项" icon="git-branch" href="/plugins/sdk-entrypoints#registration-mode">
    固定、按账户作用域或自定义回复模式
  </Card>
  <Card title="消息工具集成" icon="puzzle" href="/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 和动作发现
  </Card>
  <Card title="目标解析" icon="crosshair" href="/plugins/architecture-internals#channel-target-resolution">
    inferTargetChatType、looksLikeId、resolveTarget
  </Card>
  <Card title="运行时辅助" icon="settings" href="/plugins/sdk-runtime">
    通过 api.runtime 提供 TTS、STT、媒体、subagent
  </Card>
  <Card title="Channel inbound API" icon="bolt" href="/plugins/sdk-channel-inbound">
    Shared inbound event lifecycle: ingest, resolve, record, dispatch, finalize
  </Card>
</CardGroup>

<Note>
某些打包辅助接缝仍然存在，用于打包插件维护和兼容性。对于新的频道插件，它们不是推荐模式；除非你正在直接维护该打包插件家族，否则应优先使用通用 SDK 表面的 channel/setup/reply/runtime 子路径。
</Note>

## 下一步

- [提供方插件](/plugins/sdk-provider-plugins) - 如果你的插件也提供模型
- [SDK 概览](/plugins/sdk-overview) - 完整的子路径导入参考
- [SDK 测试](/plugins/sdk-testing) - 测试工具和契约测试
- [插件清单](/plugins/manifest) - 完整的清单 schema

## 相关内容

- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
- [Agent harness 插件](/plugins/sdk-agent-harness)