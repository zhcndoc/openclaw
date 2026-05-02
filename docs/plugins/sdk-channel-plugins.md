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

- **配置** — 账号解析和设置向导
- **安全性** — DM 策略和允许列表
- **配对** — DM 审批流程
- **会话语法** — 提供商特定的会话 id 如何映射到基础聊天、线程 id 和父级回退
- **外发** — 向平台发送文本、媒体和投票
- **线程化** — 回复如何被归入线程
- **心跳输入提示** — 为心跳交付目标提供可选的输入中/忙碌信号

核心负责共享消息工具、提示词接线、外层会话键形状、
通用的 `:thread:` 记账以及分发。

如果你的通道在传入回复之外也支持输入提示指示，请在通道插件上暴露
`heartbeat.sendTyping(...)`。核心会在心跳模型运行开始前，用已解析的心跳交付目标调用它，并使用共享的输入提示保活/清理生命周期。如果平台需要显式停止信号，请添加 `heartbeat.clearTyping(...)`。

如果你的通道为消息工具参数添加了承载媒体来源的字段，请通过
`describeMessageTool(...).mediaSourceParams` 暴露这些参数名。核心会使用这份显式列表做沙箱路径归一化和外发媒体访问策略，因此插件不需要在共享核心中为提供商特定的头像、附件或封面图参数编写特殊分支。
优先返回一个按动作键控的映射，例如
`{ "set-profile": ["avatarUrl", "avatarPath"] }`，这样无关动作就不会继承另一个动作的媒体参数。对于那些被刻意在所有暴露动作之间共享的参数，扁平数组仍然可用。

如果你的平台把额外作用域存储在会话 id 中，请把这部分解析留在插件内，通过 `messaging.resolveSessionConversation(...)` 处理。这是将 `rawId` 映射到基础会话 id、可选线程 id、显式 `baseConversationId` 以及任何 `parentConversationCandidates` 的规范钩子。
当你返回 `parentConversationCandidates` 时，请按从最具体的父级到最宽泛/基础会话的顺序排列。

当插件代码需要规范化类似路由的字段、比较子线程与其父路由，或者从 `{ channel, to, accountId, threadId }` 构建稳定的去重键时，请使用 `openclaw/plugin-sdk/channel-route`。该帮助器会像核心一样规范化数值线程 id，因此插件应优先使用它，而不是临时性的 `String(threadId)` 比较。
具有提供商特定目标语法的插件可以把自己的解析器注入到
`resolveChannelRouteTargetWithParser(...)` 中，同时仍然获得与核心相同的路由目标形状和线程回退语义。

打包后的插件如果在通道注册表启动之前就需要相同的解析逻辑，也可以暴露一个顶层的 `session-key-api.ts` 文件，并提供匹配的
`resolveSessionConversation(...)` 导出。只有在运行时插件注册表尚不可用时，核心才会使用这个适用于引导阶段的接口。

当插件只需要在通用/raw id 之上提供父级回退时，`messaging.resolveParentConversationCandidates(...)` 仍然可作为遗留兼容回退。如果两个钩子都存在，核心会先使用
`resolveSessionConversation(...).parentConversationCandidates`，只有在规范钩子省略它们时才回退到 `resolveParentConversationCandidates(...)`。

## 审批与通道能力

大多数通道插件不需要审批相关的专门代码。

- 核心负责同聊天 `/approve`、共享审批按钮负载，以及通用的回退交付。
- 当通道需要审批特定行为时，优先在通道插件上使用一个 `approvalCapability` 对象。
- `ChannelPlugin.approvals` 已移除。请把审批交付/原生/渲染/认证事实放到 `approvalCapability` 上。
- `plugin.auth` 仅用于登录/登出；核心不再从该对象读取审批认证钩子。
- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是规范的审批认证接入点。
- 对于同聊天审批认证可用性，请使用 `approvalCapability.getActionAvailabilityState`。
- 如果你的通道暴露原生执行审批，请在它与同聊天审批认证不同的时候，使用 `approvalCapability.getExecInitiatingSurfaceState` 获取发起表面/原生客户端状态。核心会使用这个 exec 专用钩子区分 `enabled` 与 `disabled`，判断发起通道是否支持原生 exec 审批，并把该通道包含在原生客户端回退指引中。`createApproverRestrictedNativeApprovalCapability(...)` 为常见情况填充了这一点。
- 对于诸如隐藏重复的本地审批提示或在交付前发送输入提示指示之类的通道特定负载生命周期行为，请使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload`。
- 仅在原生审批路由或回退抑制时使用 `approvalCapability.delivery`。
- 对于通道拥有的原生审批事实，请使用 `approvalCapability.nativeRuntime`。在高频通道入口处用 `createLazyChannelApprovalNativeRuntimeAdapter(...)` 保持其惰性加载，它可以按需导入你的运行时模块，同时仍然让核心组装审批生命周期。
- 只有当通道真正需要自定义审批负载，而不是共享渲染器时，才使用 `approvalCapability.render`。
- 当通道希望禁用路径的回复解释启用原生 exec 审批所需的确切配置开关时，请使用 `approvalCapability.describeExecApprovalSetup`。该钩子接收 `{ channel, channelLabel, accountId }`；具名账号通道应当渲染账号作用域路径，例如 `channels.<channel>.accounts.<id>.execApprovals.*`，而不是顶层默认值。
- 如果通道可以从现有配置中推断出稳定的类所有者 DM 身份，请使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createResolvedApproverActionAuthAdapter`，在不增加审批特定核心逻辑的情况下限制同聊天 `/approve`。
- 如果通道需要原生审批交付，请让通道代码专注于目标规范化和传输/展示事实。请使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver` 和 `createApproverRestrictedNativeApprovalCapability`。将通道特定事实放在 `approvalCapability.nativeRuntime` 后面，最好通过 `createChannelApprovalNativeRuntimeAdapter(...)` 或 `createLazyChannelApprovalNativeRuntimeAdapter(...)`，这样核心就可以组装处理器并负责请求过滤、路由、去重、过期、网关订阅以及路由到其他位置的通知。`nativeRuntime` 被拆分为几个更小的接入面：
- `createChannelNativeOriginTargetResolver` 默认使用共享的 channel-route 匹配器来处理 `{ to, accountId, threadId }` 目标。只有当通道存在提供商特定等价规则时才传入 `targetsMatch`，例如 Slack 时间戳前缀匹配。
- 当通道需要在默认路由匹配器或自定义 `targetsMatch` 回调运行之前，将提供商 id 规范化，同时保留原始目标用于交付时，请向 `createChannelNativeOriginTargetResolver` 传入 `normalizeTargetForMatch`。只有当解析后的交付目标本身也应被规范化时，才使用 `normalizeTarget`。
- `availability` — 账号是否已配置，以及请求是否应被处理
- `presentation` — 将共享审批视图模型映射为待处理/已解决/已过期的原生负载或最终动作
- `transport` — 准备目标并发送/更新/删除原生审批消息
- `interactions` — 原生按钮或表情反应的可选绑定/解绑/清理动作钩子
- `observe` — 可选的交付诊断钩子
- 如果通道需要运行时拥有的对象，例如客户端、令牌、Bolt 应用或 webhook 接收器，请通过 `openclaw/plugin-sdk/channel-runtime-context` 注册它们。通用的 runtime-context 注册表允许核心在不增加审批专用包装胶水的情况下，从通道启动状态引导基于能力的处理器。
- 只有在能力驱动的接入面还不够表达时，才使用更底层的 `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生审批通道必须通过这些帮助器同时路由 `accountId` 和 `approvalKind`。`accountId` 将多账号审批策略限定在正确的机器人账号范围内，而 `approvalKind` 则让 exec 与 plugin 的审批行为无需在核心中硬编码分支即可供通道使用。
- 核心现在也负责审批重路由通知。通道插件不应再从 `createChannelNativeApprovalRuntime` 发送自己的“审批已转到 DM / 另一个通道”的后续消息；相反，应通过共享审批能力帮助器暴露准确的来源 + 审批者 DM 路由，并让核心在向发起聊天发布任何通知前聚合实际交付结果。
- 端到端保留交付的审批 id 类型。原生客户端不应根据通道本地状态去猜测或重写 exec 与 plugin 审批路由。
- 不同的审批类型可以有意暴露不同的原生界面。当前打包示例：
  - Slack 为 exec 和 plugin id 都保持原生审批路由可用。
  - Matrix 为 exec 和 plugin 审批保持相同的原生 DM/通道路由和表情反应 UX，同时仍允许认证因审批类型而异。
- `createApproverRestrictedNativeApprovalAdapter` 仍然作为兼容包装器存在，但新代码应优先使用能力构建器，并在插件上暴露 `approvalCapability`。

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

同样地，当你不需要更宽泛的总入口表面时，优先使用 `openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/setup-adapter-runtime`、
`openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、
`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`。

特别是针对设置：

- `openclaw/plugin-sdk/setup-runtime` 覆盖运行时安全的设置帮助器：
  导入安全的设置补丁适配器（`createPatchedAccountSetupAdapter`、
  `createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`）、查找说明输出、
  `promptResolvedAllowFrom`、`splitSetupEntries`，以及委托式
  setup-proxy 构建器
- `openclaw/plugin-sdk/setup-adapter-runtime` 是用于 `createEnvPatchedAccountSetupAdapter` 的更窄的、感知环境的适配器接入面
- `openclaw/plugin-sdk/channel-setup` 覆盖可选安装的设置
  构建器以及一些设置安全的原语：
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、

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

- `openclaw/plugin-sdk/account-core`、
  `openclaw/plugin-sdk/account-id`、
  `openclaw/plugin-sdk/account-resolution` 和
  `openclaw/plugin-sdk/account-helpers`，用于多账号配置和默认账号回退
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/inbound-reply-dispatch`，用于入站路由/信封以及记录并分发接线
- `openclaw/plugin-sdk/messaging-targets`，用于目标解析/匹配
- `openclaw/plugin-sdk/outbound-media` 和
  `openclaw/plugin-sdk/outbound-runtime`，用于媒体加载以及外发身份/发送委托和负载规划
- 来自
  `openclaw/plugin-sdk/channel-core` 的 `buildThreadAwareOutboundSessionRoute(...)`，当外发路由应保留显式的 `replyToId`/`threadId`，或者在基础会话键仍然匹配后恢复当前 `:thread:` 会话时使用。若平台具有原生线程交付语义，提供商插件可以覆盖优先级、后缀行为和线程 id 规范化。
- `openclaw/plugin-sdk/thread-bindings-runtime`，用于线程绑定生命周期和适配器注册
- `openclaw/plugin-sdk/agent-media-payload`，仅当仍然需要遗留的 agent/media 负载字段布局时使用
- `openclaw/plugin-sdk/telegram-command-config`，用于 Telegram 自定义命令规范化、重复/冲突校验以及稳定回退的命令配置契约

仅认证类的通道通常可以停留在默认路径：核心处理审批，插件只暴露外发/认证能力。像 Matrix、Slack、Telegram 和自定义聊天传输这类原生审批通道，应当使用共享的原生帮助器，而不是自己重新实现审批生命周期。

## 传入提及策略

将传入提及处理分成两层：

- 插件拥有的证据收集
- 共享策略评估

对提及策略决策使用 `openclaw/plugin-sdk/channel-mention-gating`。
仅当你需要更广泛的传入
辅助入口时，才使用 `openclaw/plugin-sdk/channel-inbound`。

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

`api.runtime.channel.mentions` 为已经依赖运行时注入的
打包频道插件暴露相同的共享提及辅助：

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

如果你只需要 `implicitMentionKindWhen` 和
`resolveInboundMentionDecision`，请从
`openclaw/plugin-sdk/channel-mention-gating` 导入，以避免加载无关的传入
运行时辅助。

较旧的 `resolveMentionGating*` 辅助仍然保留在
`openclaw/plugin-sdk/channel-inbound` 上，仅作为兼容性导出。新代码
应使用 `resolveInboundMentionDecision({ facts, policy })`。

## 操作指南

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="包与清单">
    创建标准插件文件。`package.json` 中的 `channel` 字段
    表明这是一个频道插件。关于完整的包元数据表面，请参见
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

    `configSchema` 验证 `plugins.entries.acme-chat.config`。将其用于
    不属于频道账户配置的插件自有设置。`channelConfigs`
    验证 `channels.acme-chat`，并且是在插件运行时加载之前，由配置
    schema、设置和 UI 界面使用的冷路径来源。

  </Step>

  <Step title="构建频道插件对象">
    `ChannelPlugin` 接口有许多可选的适配器表面。先从最小集合开始——`id` 和 `setup`——然后按需添加适配器。

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
      可选的 `ctx.formatting` 携带投递时的格式化决策，例如 `maxLinesPerMessage`；发送前应先应用它，以便共享发出投递只解析一次回复线程和分块边界。
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

    将频道拥有的 CLI 描述符放在 `registerCliMetadata(...)` 中，这样 OpenClaw
    就能在根帮助中显示它们，而无需激活完整的频道运行时，
    同时正常的完整加载仍会获得相同的描述符用于真实的命令注册。将 `registerFull(...)`
    保留给仅运行时工作。
    如果 `registerFull(...)` 注册 gateway RPC 方法，请使用
    插件特定前缀。核心管理命名空间（`config.*`、
    `exec.approvals.*`、`wizard.*`、`update.*`）仍然保留，并且始终
    解析为 `operator.admin`。
    `defineChannelPluginEntry` 会自动处理注册模式分离。请参见
    [入口点](/plugins/sdk-entrypoints#definechannelpluginentry) 了解所有
    选项。

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

    将设置安全导出拆分到 sidecar 模块的打包工作区频道，如果还需要一个
    显式的设置期运行时 setter，可以使用
    `openclaw/plugin-sdk/channel-entry-contract` 中的
    `defineBundledChannelSetupEntry(...)`。

  </Step>

  <Step title="处理传入消息">
    你的插件需要接收来自平台的消息并将它们转发给
    OpenClaw。典型模式是使用 webhook 验证请求，然后通过频道的传入处理器分发它：

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // 由插件管理的认证（自行验证签名）
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // 你的传入处理器将消息分发给 OpenClaw。
          // 具体接线取决于你的平台 SDK —
          // 请在打包的 Microsoft Teams 或 Google Chat 插件包中查看真实示例。
          await handleAcmeChatInbound(api, event);

          res.statusCode = 200;
          res.end("ok");
          return true;
        },
      });
    }
    ```

    <Note>
      传入消息处理是频道特定的。每个频道插件都拥有
      自己的传入流水线。查看打包的频道插件
      （例如 Microsoft Teams 或 Google Chat 插件包）以了解真实模式。
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
  <Card title="Channel turn kernel" icon="bolt" href="/plugins/sdk-channel-turn">
    Shared inbound turn lifecycle: ingest, resolve, record, dispatch, finalize
  </Card>
</CardGroup>

<Note>
某些打包辅助接缝仍然存在，用于打包插件维护和
兼容性。对于新的频道插件，它们不是推荐模式；
除非你正在直接维护该打包插件家族，否则应优先使用通用 SDK
表面的 channel/setup/reply/runtime 子路径。
</Note>

## 下一步

- [提供者插件](/plugins/sdk-provider-plugins) — 如果你的插件也提供模型
- [SDK 概览](/plugins/sdk-overview) — 完整的子路径导入参考
- [SDK 测试](/plugins/sdk-testing) — 测试工具和契约测试
- [插件清单](/plugins/manifest) — 完整清单 schema

## 相关内容

- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
- [Agent harness 插件](/plugins/sdk-agent-harness)