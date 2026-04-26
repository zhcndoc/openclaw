---
summary: "构建 OpenClaw 消息渠道插件的分步指南"
title: "构建渠道插件"
sidebarTitle: "渠道插件"
read_when:
  - 您正在构建新的消息渠道插件
  - 您想将 OpenClaw 连接到消息平台
  - 您需要了解 ChannelPlugin 适配器表面
---

本指南将带您构建一个将 OpenClaw 连接到消息平台的渠道插件。在结束时，您将拥有一个可用的渠道，并具备 DM 安全、配对、回复线程以及出站消息功能。

<Info>
  如果您之前没有构建过任何 OpenClaw 插件，请先阅读 [入门指南](/plugins/building-plugins) 以了解基本的包结构和清单设置。
</Info>

## 渠道插件如何工作

渠道插件不需要自己的发送/编辑/反应工具。OpenClaw 在核心中保留一个共享的 `message` 工具。您的插件拥有：

- **Config** — 账户解析和设置向导
- **Security** — DM 策略和允许列表
- **Pairing** — DM 审批流程
- **Session grammar** — 提供方特定的会话 ID 如何映射到基础聊天、线程 ID 和父级回退
- **Outbound** — 向平台发送文本、媒体和投票
- **Threading** — 回复如何被分线程
- **Heartbeat typing** — 用于心跳交付目标的可选输入中/忙碌信号

核心拥有共享的 message 工具、prompt 连线、外部 session-key 结构、通用 `:thread:` 记录以及调度。

如果您的渠道支持在入站回复之外显示输入状态指示器，请在渠道插件上暴露 `heartbeat.sendTyping(...)`。核心会在心跳模型运行开始之前，将其与解析后的心跳交付目标一起调用，并使用共享的输入状态保持/清理生命周期。当平台需要显式停止信号时，请添加 `heartbeat.clearTyping(...)`。

如果您的渠道会添加携带媒体来源的消息工具参数，请通过 `describeMessageTool(...).mediaSourceParams` 暴露这些参数名。核心会使用该显式列表进行沙箱路径规范化和出站媒体访问策略，因此插件不需要为提供方特定的头像、附件或封面图参数添加共享核心的特殊处理。
建议返回一个按动作键控的映射，例如
`{ "set-profile": ["avatarUrl", "avatarPath"] }`，这样无关动作就不会继承另一个动作的媒体参数。对于有意在每个暴露动作中共享的参数，平面数组仍然有效。

如果您的平台在会话 ID 中存储额外范围信息，请在插件中通过 `messaging.resolveSessionConversation(...)` 进行解析。这是将 `rawId` 映射到基础会话 ID、可选线程 ID、显式 `baseConversationId` 以及任何 `parentConversationCandidates` 的标准钩子。
当您返回 `parentConversationCandidates` 时，请按从最窄父级到最宽泛/基础会话的顺序排列。

需要在渠道注册表启动之前进行相同解析的捆绑插件也可以公开顶级的 `session-key-api.ts` 文件，并带有匹配的 `resolveSessionConversation(...)` 导出。核心仅在运行时插件注册表尚不可用时使用该引导安全接口。

`messaging.resolveParentConversationCandidates(...)` 仍然可用，作为遗留兼容性回退，当插件只需要在通用/原始 ID 之上添加父级回退时。如果两个钩子都存在，核心首先使用 `resolveSessionConversation(...).parentConversationCandidates`，仅当标准钩子省略它们时才回退到 `resolveParentConversationCandidates(...)`。

## 审批和渠道能力

大多数渠道插件不需要特定于审批的代码。

- 核心拥有同聊 `/approve`、共享审批按钮负载和通用回退交付。
- 当渠道需要特定于审批的行为时，建议在渠道插件上使用一个 `approvalCapability` 对象。
- `ChannelPlugin.approvals` 已移除。将审批交付/原生/渲染/认证事实放在 `approvalCapability` 上。
- `plugin.auth` 仅用于登录/注销；核心不再从该对象读取审批认证钩子。
- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是标准的审批认证接口。
- 使用 `approvalCapability.getActionAvailabilityState` 获取同聊审批认证可用性。
- 如果您的渠道暴露原生执行审批，当发起表面/原生客户端状态与同聊审批认证不同时，使用 `approvalCapability.getExecInitiatingSurfaceState` 获取该状态。核心使用该执行特定钩子来区分 `enabled` 与 `disabled`，决定发起渠道是否支持原生执行审批，并将渠道包含在原生客户端回退指导中。`createApproverRestrictedNativeApprovalCapability(...)` 为常见情况填充此项。
- 使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload` 处理渠道特定的负载生命周期行为，例如隐藏重复的本地审批提示或在交付前发送输入指示器。
- 仅将 `approvalCapability.delivery` 用于原生审批路由或回退抑制。
- 使用 `approvalCapability.nativeRuntime` 处理渠道拥有的原生审批事实。在热门渠道入口点上使用 `createLazyChannelApprovalNativeRuntimeAdapter(...)` 保持其延迟加载，这样可以按需导入您的运行时模块，同时仍让核心组装审批生命周期。
- 仅当渠道真正需要自定义审批负载而不是共享渲染器时，才使用 `approvalCapability.render`。
- 当渠道希望禁用路径回复解释启用原生执行审批所需的确切配置选项时，使用 `approvalCapability.describeExecApprovalSetup`。该钩子接收 `{ channel, channelLabel, accountId }`；命名账户渠道应渲染账户作用域路径（如 `channels.<channel>.accounts.<id>.execApprovals.*`），而不是顶层默认值。
- 如果渠道可以从现有配置中推断稳定的所有者类似 DM 身份，使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createResolvedApproverActionAuthAdapter` 来限制同聊 `/approve`，而无需添加特定于审批的核心逻辑。
- 如果渠道需要原生审批交付，保持渠道代码专注于目标标准化以及传输/展示事实。使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver` 和 `createApproverRestrictedNativeApprovalCapability`。将渠道特定事实放在 `approvalCapability.nativeRuntime` 后面，理想情况下通过 `createChannelApprovalNativeRuntimeAdapter(...)` 或 `createLazyChannelApprovalNativeRuntimeAdapter(...)`，以便核心可以组装处理程序并拥有请求过滤、路由、去重、过期、网关订阅以及路由至他处的通知。`nativeRuntime` 分为几个较小的接口：
  - `availability` — 账户是否已配置以及是否应处理请求
  - `presentation` — 将共享审批视图模型映射为待处理/已解决/过期的原生负载或最终操作
  - `transport` — 准备目标以及发送/更新/删除原生审批消息
  - `interactions` — 原生按钮或反应的可选绑定/解绑/清除操作钩子
  - `observe` — 可选的交付诊断钩子
- 如果渠道需要运行时拥有的对象（如客户端、令牌、Bolt 应用或 Webhook 接收器），通过 `openclaw/plugin-sdk/channel-runtime-context` 注册它们。通用运行时上下文注册表让核心能够从渠道启动状态引导基于能力的处理程序，而无需添加特定于审批的包装胶水代码。
- 仅当基于能力的接口还不够表达时，才使用较低级别的 `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生审批渠道必须通过那些帮助程序路由 `accountId` 和 `approvalKind`。`accountId` 保持多账户审批策略限定在正确的机器人账户，`approvalKind` 保持执行与插件审批行为对渠道可用，而无需核心中的硬编码分支。
- 核心现在也拥有审批重路由通知。渠道插件不应从 `createChannelNativeApprovalRuntime` 发送自己的“审批已转到 DM/另一个渠道”后续消息；相反，通过共享审批能力帮助程序暴露准确的来源 + 审批者 DM 路由，让核心在将任何通知发布回发起聊天之前聚合实际交付。
- 端到端保留已交付的审批 ID 种类。原生客户端不应从渠道本地状态猜测或重写执行与插件审批路由。
- 不同的审批种类可以有意暴露不同的原生表面。
  当前捆绑示例：
  - Slack 保持原生审批路由对执行和插件 ID 均可用。
  - Matrix 对执行和插件审批保持相同的原生 DM/渠道路由和反应用户体验，同时仍让认证因审批种类而异。
- `createApproverRestrictedNativeApprovalAdapter` 仍作为兼容性包装器存在，但新代码应首选能力构建器并在插件上暴露 `approvalCapability`。

对于热门渠道入口点，当您只需要该系列的一部分时，建议使用更窄的运行时子路径：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

同样，当您不需要更广泛的伞状表面时，建议使用 `openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/setup-adapter-runtime`、
`openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、
`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`。

专门针对设置：

- `openclaw/plugin-sdk/setup-runtime` 涵盖运行时安全的设置帮助程序：
  导入安全的设置补丁适配器（`createPatchedAccountSetupAdapter`、
  `createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`）、查找笔记输出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 和委托
  设置代理构建器
- `openclaw/plugin-sdk/setup-adapter-runtime` 是 `createEnvPatchedAccountSetupAdapter` 的窄环境感知适配器
  接口
- `openclaw/plugin-sdk/channel-setup` 涵盖可选安装设置
  构建器以及一些设置安全原语：
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、

如果您的渠道支持由环境驱动的设置或认证，并且通用启动/配置流程需要在运行时加载之前知道这些环境变量名，请在插件清单中通过 `channelEnvVars` 声明它们。仅为面向操作员的文案保留渠道运行时 `envVars` 或本地常量。

如果您的渠道可以在插件运行时启动之前出现在 `status`、`channels list`、`channels status` 或 SecretRef 扫描中，请在 `package.json` 中添加 `openclaw.setupEntry`。该入口点应当能够安全地在只读命令路径中导入，并应返回这些摘要所需的渠道元数据、设置安全配置适配器、状态适配器以及渠道秘密目标元数据。不要从设置入口启动客户端、监听器或传输运行时。

`createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、
`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 和
`splitSetupEntries`

- 仅当您还需要更重的共享设置/配置帮助程序（例如
  `moveSingleAccountChannelSectionToDefaultAccount(...)`）时，才使用更广泛的 `openclaw/plugin-sdk/setup` 接口

如果您的渠道只想在设置表面中宣传“先安装此插件”，建议使用 `createOptionalChannelSetupSurface(...)`。生成的
适配器/向导在配置写入和最终确定时失败关闭，并且它们重用
相同的安装所需消息跨验证、最终确定和文档链接
文案。

对于其他热门渠道路径，建议使用窄帮助程序而不是更广泛的旧版
表面：

- `openclaw/plugin-sdk/account-core`,
  `openclaw/plugin-sdk/account-id`,
  `openclaw/plugin-sdk/account-resolution`, 和
  `openclaw/plugin-sdk/account-helpers` 用于多账户配置和
  默认账户回退
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/inbound-reply-dispatch` 用于入站路由/信封和
  记录与分发接线
- `openclaw/plugin-sdk/messaging-targets` 用于目标解析/匹配
- `openclaw/plugin-sdk/outbound-media` 和
  `openclaw/plugin-sdk/outbound-runtime` 用于媒体加载以及出站
  身份/发送委托和负载规划
- 来自
  `openclaw/plugin-sdk/channel-core` 的 `buildThreadAwareOutboundSessionRoute(...)`，当出站路由应保留显式 `replyToId`/`threadId` 或在基础会话键仍然匹配后恢复当前 `:thread:` 会话时。提供方插件可以在其平台具有原生线程交付语义时覆盖优先级、后缀行为和线程 ID 规范化。
- `openclaw/plugin-sdk/thread-bindings-runtime` 用于线程绑定生命周期
  和适配器注册
- `openclaw/plugin-sdk/agent-media-payload` 仅当仍然需要旧式 agent/media
  负载字段布局时
- `openclaw/plugin-sdk/telegram-command-config` 用于 Telegram 自定义命令
  规范化、重复/冲突验证以及稳定回退的命令配置契约

仅身份验证的渠道通常可以在默认路径停止：核心处理审批，插件只需暴露出站/身份验证能力。像 Matrix、Slack、Telegram 和自定义聊天传输这样的原生审批渠道应该使用共享的原生帮助程序，而不是自己滚动审批生命周期。

## 入站提及策略

将入站提及处理分为两层：

- 插件所有的证据收集
- 共享策略评估

对提及策略决策使用 `openclaw/plugin-sdk/channel-mention-gating`。
仅当您需要更广泛的入站帮助程序总入口时，才使用 `openclaw/plugin-sdk/channel-inbound`。

适合插件本地逻辑：

- 回复机器人检测
- 引用机器人检测
- 线程参与检查
- 服务/系统消息排除
- 证明机器人参与所需的平台原生缓存

适合共享助手：

- `requireMention`
- 显式提及结果
- 隐式提及允许列表
- 命令绕过
- 最终跳过决策

推荐流程：

1. 计算本地提及事实。
2. 将这些事实传入 `resolveInboundMentionDecision({ facts, policy })`。
3. 在您的入站网关中使用 `decision.effectiveWasMentioned`、`decision.shouldBypassMention` 和 `decision.shouldSkip`。

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
    allowedImplicitMentionKinds: requireExplicitMention
      ? []
      : ["reply_to_bot", "quoted_bot"],
    allowTextCommands,
    hasControlCommand,
    commandAuthorized,
  },
});

if (decision.shouldSkip) return;
```

`api.runtime.channel.mentions` 为已依赖运行时注入的捆绑渠道插件提供相同的共享提及助手：

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

如果您只需要 `implicitMentionKindWhen` 和
`resolveInboundMentionDecision`，请从
`openclaw/plugin-sdk/channel-mention-gating` 导入，以避免加载无关的入站
运行时帮助程序。

较旧的 `resolveMentionGating*` 帮助程序仍作为兼容性导出保留在
`openclaw/plugin-sdk/channel-inbound` 上。新代码应使用 `resolveInboundMentionDecision({ facts, policy })`。

## 演练

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="打包和清单">
    创建标准的插件文件。`package.json` 中的 `channel` 字段使其成为渠道插件。有关完整的包元数据表面，请参阅 [插件设置和配置](/plugins/sdk-setup#openclaw-channel)：

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
      "description": "Acme Chat 渠道插件",
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
              "label": "Bot token",
              "sensitive": true
            }
          }
        }
      }
    }
    ```
    </CodeGroup>

    `configSchema` 用于验证 `plugins.entries.acme-chat.config`。将其用于
    不属于渠道账户配置的插件自有设置。`channelConfigs`
    用于验证 `channels.acme-chat`，并且是在插件运行时加载之前，由配置
    schema、设置和 UI 表面使用的冷路径来源。

  </Step>

  <Step title="构建渠道插件对象">
    `ChannelPlugin` 接口有许多可选的适配器表面。从最小值开始 — `id` 和 `setup` — 并按需添加适配器。

    创建 `src/channel.ts`：

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/channel-core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatApi } from "./client.js"; // 您的平台 API 客户端

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
      if (!token) throw new Error("acme-chat: token is required");
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
          message: "发送此代码以验证您的身份：",
          notify: async ({ target, code }) => {
            await acmeChatApi.sendDm(target, `Pairing code: ${code}`);
          },
        },
      },

      // 线程：回复如何交付
      threading: { topLevelReplyToMode: "reply" },

      // 出站：向平台发送消息
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

    <Accordion title="createChatChannelPlugin 为您做什么">
      您无需手动实现低级适配器接口，而是传递声明式选项，构建器会将它们组合：

      | 选项 | 它连接什么 |
      | --- | --- |
      | `security.dm` | 来自配置字段的范围化 DM 安全解析器 |
      | `pairing.text` | 基于文本的 DM 配对流程，带有代码交换 |
      | `threading` | 回复模式解析器（固定、账户范围或自定义） |
      | `outbound.attachedResults` | 返回结果元数据（消息 ID）的发送函数 |

      如果您需要完全控制，也可以传递原始适配器对象，而不是声明式选项。

      原始出站适配器可以定义 `chunker(text, limit, ctx)` 函数。
      可选的 `ctx.formatting` 携带交付时的格式化决策，
      例如 `maxLinesPerMessage`；请在发送前应用它，以便回复线程
      和分块边界由共享出站交付一次性解析。发送上下文还包括
      `replyToIdSource`（`implicit` 或 `explicit`），当本机回复目标已解析时，
      因此有效负载帮助程序可以保留显式回复标签，而不会消耗隐式的一次性回复槽位。
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
      description: "Acme Chat 渠道插件",
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

    将渠道拥有的 CLI 描述符放在 `registerCliMetadata(...)` 中，以便 OpenClaw
    可以在根帮助中显示它们而无需激活完整的渠道运行时，
    而正常的完整加载仍然拾取相同的描述符进行真正的命令
    注册。将 `registerFull(...)` 保留用于仅运行时工作。
    如果 `registerFull(...)` 注册网关 RPC 方法，请使用
    特定于插件的前缀。核心管理命名空间（`config.*`、
    `exec.approvals.*`、`wizard.*`、`update.*`）保持保留并始终
    解析为 `operator.admin`。
    `defineChannelPluginEntry` 自动处理注册模式拆分。请参阅
    [入口点](/plugins/sdk-entrypoints#definechannelpluginentry) 了解所有
    选项。

  </Step>

  <Step title="添加设置入口">
    创建 `setup-entry.ts` 用于引导期间的轻量级加载：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    当渠道被禁用或未配置时，OpenClaw 加载此文件而不是完整入口。它避免了在设置流程中拉取沉重的运行时代码。请参阅 [设置和配置](/plugins/sdk-setup#setup-entry) 了解详细信息。

    捆绑的工作区渠道如果将 setup-safe 导出拆分到旁车
    模块中，并且还需要一个显式的设置时运行时设置器，
    则可以使用 `openclaw/plugin-sdk/channel-entry-contract` 中的
    `defineBundledChannelSetupEntry(...)`。

  </Step>

  <Step title="处理入站消息">
    您的插件需要接收来自平台的消息并将其转发给 OpenClaw。典型模式是一个验证请求并通过渠道的入站处理器进行调度的 webhook：

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // 插件管理的 auth（自行验证签名）
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // 您的入站处理器将消息调度到 OpenClaw。
          // 确切的连线取决于您的平台 SDK —
          // 请参阅捆绑的 Microsoft Teams 或 Google Chat 插件包中的真实示例。
          await handleAcmeChatInbound(api, event);

          res.statusCode = 200;
          res.end("ok");
          return true;
        },
      });
    }
    ```

    <Note>
      入站消息处理是特定于渠道的。每个渠道插件拥有自己的入站管道。查看捆绑的渠道插件（例如 Microsoft Teams 或 Google Chat 插件包）以了解真实模式。
    </Note>

  </Step>
<a id="step-6-test"></a>
<Step title="测试">
在 `src/channel.test.ts` 中编写共存测试：

    ```typescript src/channel.test.ts
    import { describe, it, expect } from "vitest";
    import { acmeChatPlugin } from "./channel.js";

    describe("acme-chat plugin", () => {
      it("resolves account from config", () => {
        const cfg = {
          channels: {
            "acme-chat": { token: "test-token", allowFrom: ["user1"] },
          },
        } as any;
        const account = acmeChatPlugin.setup!.resolveAccount(cfg, undefined);
        expect(account.token).toBe("test-token");
      });

      it("inspects account without materializing secrets", () => {
        const cfg = {
          channels: { "acme-chat": { token: "test-token" } },
        } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(true);
        expect(result.tokenStatus).toBe("available");
      });

      it("reports missing config", () => {
        const cfg = { channels: {} } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(false);
      });
    });
    ```

    ```bash
    pnpm test -- <bundled-plugin-root>/acme-chat/
    ```

    对于共享测试帮助程序，请参阅 [测试](/plugins/sdk-testing)。

  </Step>
</Steps>

## 文件结构

```
<bundled-plugin-root>/acme-chat/
├── package.json              # openclaw.channel 元数据
├── openclaw.plugin.json      # 带有配置 schema 的清单
├── index.ts                  # defineChannelPluginEntry 入口
├── setup-entry.ts            # defineSetupPluginEntry 入口
├── api.ts                    # 公共导出（可选）
├── runtime-api.ts            # 内部运行时导出（可选）
└── src/
    ├── channel.ts            # 通过 createChatChannelPlugin 创建的 ChannelPlugin
    ├── channel.test.ts       # 测试
    ├── client.ts             # 平台 API 客户端
    └── runtime.ts            # 运行时存储（如果需要）
```

## 高级主题

<CardGroup cols={2}>
  <Card title="线程选项" icon="git-branch" href="/plugins/sdk-entrypoints#registration-mode">
    固定、账户范围或自定义回复模式
  </Card>
  <Card title="消息工具集成" icon="puzzle" href="/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 和 action 发现
  </Card>
  <Card title="Target resolution" icon="crosshair" href="/plugins/architecture-internals#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="运行时帮助程序" icon="settings" href="/plugins/sdk-runtime">
    通过 api.runtime 使用 TTS, STT, media, subagent
  </Card>
</CardGroup>

<Note>
一些捆绑的帮助程序接口仍然存在，用于捆绑插件维护和
兼容性。它们不是新渠道插件的推荐模式；
除非您直接维护该捆绑插件系列，否则建议使用通用
渠道/设置/回复/运行时子路径来自通用 SDK
表面。
</Note>

## 后续步骤

- [Provider Plugins](/plugins/sdk-provider-plugins) — if your plugin also provides models
- [SDK Overview](/plugins/sdk-overview) — full subpath import reference
- [SDK Testing](/plugins/sdk-testing) — test utilities and contract tests
- [Plugin Manifest](/plugins/manifest) — full manifest schema

## Related

- [Plugin SDK setup](/plugins/sdk-setup)
- [Building plugins](/plugins/building-plugins)
- [Agent harness plugins](/plugins/sdk-agent-harness)