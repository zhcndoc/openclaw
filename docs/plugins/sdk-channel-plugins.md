---
summary: "为 OpenClaw 构建消息通道插件的分步指南"
title: "构建通道插件"
sidebarTitle: "通道插件"
read_when:
  - "你正在构建一个新的消息通道插件"
  - "你想将 OpenClaw 连接到某个消息平台"
  - "你需要理解 ChannelPlugin 适配器表面"
---

本指南构建了一个将 OpenClaw 连接到消息传递平台的通道插件：DM 安全性、配对、回复线程和出站消息传递。

<Info>
  OpenClaw 插件新手？首先阅读 [Getting Started](/plugins/building-plugins) 了解包结构和清单设置。
</Info>

## <a id="what-your-plugin-owns"></a> 你的插件负责什么

频道插件不实现 send/edit/react 工具；核心提供一个共享的 `message` 工具。你的插件负责：

- **配置** - 账号解析和设置向导
- **安全** - DM 策略和允许名单
- **配对** - DM 批准流程
- **会话语法** - 提供方特定的会话 id 如何映射到基础聊天、线程 id 和父级回退
- **出站** - 向平台发送文本、媒体和投票
- **线程化** - 回复如何进行线程化
- **心跳打字** - 用于心跳传送目标的可选typing/busy信号
- **格式化合同** - 可选`agentPrompt.inboundFormattingHints`，根据交付帐户解析。尽管其名称如此，核心会将其提供给可见文本到达通道的每个 OpenClaw 代理轮次：回复、心跳、cron 公告、子代理公告，并且 cron 运行时无需使用 `message` 工具发送的回复路由（例如 `delivery.mode: "none"`）。此类运行使用消息工具的默认通道：其当前通道或唯一配置的通道。发送到另一个通道的 `message` 工具不会获取该通道的规则，并且外部 ACP 代理不会收到它。将所有格式规则保留在这一钩子中。
- **消息指导** - `agentPrompt.messageToolHints` 提供帐户范围的指令。当通道有内嵌按钮引导时，设置`agentPrompt.customInlineButtonHint: true`；然后 core 会省略其通用回调示例和功能配置提示。当帐户禁用按钮时，不返回按钮指令。该标志默认为 `false`。

核心拥有共享消息工具、提示连线、外部会话密钥形状、通用`:thread:`簿记和调度。对于配置的代理组线程，核心还拥有参与者选择、后续轮次和轮次预算。让这些策略远离通道适配器。

核心还负责模型选择器的产品操作。渲染 `ModelPickerAction` 的频道会声明其 `ModelPickerCapabilityProfile`，然后将类型化操作编码到传输私有的、经过身份验证的回调信封中。在到达该编码边界之前，应始终区分批准、命令、URL、Web 应用、问题、回调和模型选择器操作；绝不要从原始回调字符串推断选择器意图。参与者和源消息检查仍由频道负责。

## <a id="opted-in-public-child-sessions"></a> 选择加入公共儿童会话

入口解析器接受可选的主机调用意图 `childSessionPublication: { audience: "public", assertCurrent }`。仅在明确的操作员选择加入和提供者本地证明整个提供的上下文是公共的之后才提供它。未知的受众元数据必须拒绝发布。 `assertCurrent` 同步复查账户策略和实时入口所有者；切勿从消息文本、存储的永久链接或模型参数派生此字段。普通的仅决策解析器不授予权限。

对于可变源策略，意图还可以提供 `prepare: async () => assertCurrent`。主机在运行准入时调用它一次，并保留返回的同步防护以用于子发布。如果准备好的提示的路由、访问层或公共上下文证明不再有效，则通道必须通过有界重试重新获取当前授权和路由，并返回 `null`。这会放弃回合，而无需尝试其他模型或发布通用模型失败回复。而是抛出操作失败；这些会停止模型回退，但会产生可重试的访问验证错误。准备工作不能延续已准许的运行；使用时间检查和撤销仍然是强制性的。

精确的主机解析器到上下文的切换将意图绑定到一次承认的运行。只有其新的直接孤立可见的孩子才能在发布前的创作承诺中获得公共资助。 Private/draft、隐身、现有、分叉、重定向和后代会话不符合条件。无法序列化意图以供将来的转弯或传输回退。这不会授予 creator/admin 权限或更改团队协作权限。 `onVisibleWorkSessions`的消费者可以使用`publicRead: true`作为创建收据；标准化的 URL 本身并不能证明匿名访问。

主机在第一个回合开始之前等待 `onVisibleWorkSessions(sessions, creation)` 获取新的可见子级，因此通道可以在提示组装之前保留会话范围的原始上下文。即使没有公共网关源或 Control UI 被禁用，可选的第二个参数也提供 `creation.createdSessionKey`；在这种情况下，`sessions` 为空。现有的单参数消费者仍然只收到可用的 URL 描述符。当父进程稳定下来时，回调可能会再次收到相同的子进程； make 通过子会话密钥写入幂等。仅报告该回合的直系子代。当初始化必须在子进程运行之前完成时，返回一个 Promise。

## <a id="walkthrough"></a> 演练

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step id="package-and-manifest" title="包装和清单">
    创建标准插件文件。 `openclaw.plugin.json` 中的 `channels` 字段（不是 `kind` 字段）将清单标记为拥有通道。有关完整的包元数据表面，请参阅 [Plugin 设置和 Config](/plugins/sdk-setup#openclaw-channel)：

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
          "blurb": "Connect OpenClaw to Acme Chat."
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-chat",
      "channels": ["acme-chat"],
      "name": "Acme Chat",
      "description": "Acme Chat channel plugin",
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

    `configSchema` 用于验证 `plugins.entries.acme-chat.config`。把它用于不属于频道账户配置的、由插件拥有的设置。 `channelConfigs.acme-chat.schema` 用于验证 `channels.acme-chat`，并且在插件运行时加载之前，作为由配置 schema、设置和 UI 界面使用的冷路径来源。完整的顶层字段参考请参见 [插件清单](/plugins/manifest)。

  </Step>

  <Step id="build-the-channel-plugin-object" title="构建通道插件对象">
    `ChannelPlugin` 接口有许多可选的适配器表面。从最小值开始 - `id`、`config` 和 `setup` - 并根据需要添加适配器。 `createChatChannelPlugin` 默认省略直接消息的能力；当通道支持更多时声明`capabilities.chatTypes`。当通道支持反应时设置 `capabilities.reactions`。通道每条消息只能有一个机器人反应，设置为 `capabilities.reactionSlots` 至 `"single"`； `"multiple"`或省略表示独立的表情符号。当 Control UI 反应从单槽通道中移除时，镜像会恢复最新剩余的表情符号，或者在没有剩余表情符号时清除槽。

    `config.inspectAccount` 是同步的，并返回只读诊断的元数据，包括已禁用或已配置但不可用的帐户。返回 `enabled`、`configured` 和适用的凭证状态字段，无需秘密解析。其结果不是已解析的帐户：支票和帐户状态构建器等操作挂钩会收到 `config.resolveAccountAsync` 或 `config.resolveAccount` 结果。诊断仅公开检查结果中的状态安全字段。包括运行时使用的相同帐户启用和配置决策，包括重复帐户抑制。如果省略 `configured`，诊断将使用记录的网关值（如果可用）；否则，他们会报告配置状态不可用。普通 `channels.status` 读取将此元数据与生命周期记录的帐户状态结合起来。通过 `setStatus` 发布不断变化的健康状况和提供者详细信息；帐户快照和通道摘要挂钩仅针对此 RPC 进行显式实时检查而运行。所有直播挂钩都共享每个频道的截止日期。他们还应该遵守提供的超时，因为 RPC 超时无法取消已经运行的插件操作。秘密兑换之前的选择也直接读取此元数据。目录自动选择需要`configured: true`；当配置状态未知时，呼叫者仍然可以显式选择通道。

    操作帐户读取可以是异步的。当帐户解析读取持久凭证时定义 `config.resolveAccountAsync(cfg, accountId)`，并为匹配的操作配置状态检查定义 `config.hasConfiguredStateAsync({ cfg, env })`。使用 `config.describeAccountAsync(account, cfg)` 表示国家支持的账户摘要，使用 `config.resolveAllowFromAsync({ cfg, accountId })` 表示存储的允许列表，使用 `security.resolveDmPolicyAsync({ cfg, accountId, account })` 表示存储的 DM 策略。这些可选回调返回与其同步对应项相同结果的 Promise。只要异步钩子存在，核心就会等待它；拒绝或空结果都不会重试同步挂钩。为较旧的主机和外部消费者保留同步签名，并通过包装通道的任何适配器转发异步挂钩。

    为每个操作准备当前凭据，并在等待准备后重新验证实时权限，避免出现任何副作用。帐户对象和注册表生成不是凭证缓存。只读 `inspectAccount` 和仅配置引导激活保持独立；单独保留的凭据并不能启用通道。

    `gateway.loginWithQrStart` 接收可选的 `assertCredentialPersistenceCurrent()` 回调。使用 QR 登录保留它，并在凭证写入之前立即调用它，包括 RPC 返回后的延迟写入。当网关的帐户配置或插件生命周期发生更改时，它会抛出。与插件自己的主动登录防护组合起来；请勿更换该防护装置或将 QR 的使用寿命与启动 RPC 相关联。省略的帐户 ID 保留插件特定的单帐户配置文件选择；当配置多个帐户时，网关拒绝遗漏。

    创建 `src/channel.ts`：

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/channel-core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatApi } from "./client.js"; // your platform API client

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
        // Account resolution/inspection belongs on `config`, not `setup`.
        // `setup` covers onboarding writes (applyAccountConfig, validateInput).
        config: {
          listAccountIds: () => ["default"],
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
        setup: {
          applyAccountConfig: ({ cfg, input }) => ({
            ...cfg,
            channels: {
              ...cfg.channels,
              "acme-chat": { ...(cfg.channels as any)?.["acme-chat"], ...input },
            },
          }),
        },
      }),

      // DM security: who can message the bot
      security: {
        dm: {
          channelKey: "acme-chat",
          resolvePolicy: (account) => account.dmPolicy,
          resolveAllowFrom: (account) => account.allowFrom,
          defaultPolicy: "allowlist",
        },
      },

      // Pairing: approval flow for new DM contacts
      pairing: {
        text: {
          idLabel: "Acme Chat username",
          message: "Send this code to verify your identity:",
          notify: async ({ target, code }) => {
            await acmeChatApi.sendDm(target, `Pairing code: ${code}`);
          },
        },
      },

      // Threading: how replies are delivered
      threading: { topLevelReplyToMode: "reply" },

      // Outbound: send messages to the platform
      outbound: {
        attachedResults: {
          channel: "acme-chat",
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

    对于同时接受当前顶级 DM 密钥和旧嵌套密钥的通道，请使用 `plugin-sdk/channel-config-helpers` 中的帮助程序：`resolveChannelDmAccess`、`resolveChannelDmPolicy`、`resolveChannelDmAllowFrom` 和 `normalizeChannelDmPolicy` 将帐户本地值保留在继承的根值之前。通过 `normalizeLegacyDmAliases` 将相同的解析器与医生修复配对，以便运行时和迁移读取相同的合约。

    对于特定于通道的秘密激活，`openclaw/plugin-sdk/channel-secret-basic-runtime` 中的 `createChannelSecretContract` 结合了 `channelKey`、`account`/`channel` 注册表规范和 `collect` 回调。回调接收`config`、`defaults`、`context`、`channelKey`、`channel`以及解析后的账户`surface`；仅当通道记录存在时才运行。将激活规则保留在回调中。

    配置支持的注销处理程序可以使用 `openclaw/plugin-sdk/channel-config-helpers` 中的 `clearAccountFieldsFromConfigSection`。通过 `cfg`、`sectionKey`、`accountId` 和插件拥有的 `fields` 进行删除。它返回 `{ nextConfig, changed, cleared }` 而不写入配置或解析凭据。仅当至少一个值为真时，才会针对确切的 `default` 帐户一起清除根字段。嵌套字段使用 `clearAccountEntryFields` 语义：空帐户 ID 选择 `accounts.default`，并且删除空或空白字符串而不报告 `cleared`，除非设置了 `markClearedOnFieldPresence: true`。未更改的配置保留其对象标识；清理修剪只修剪它改变的分支。在插件中保留文件引用选择、持久性、环境报告和其他注销副作用。

    如果通道故意应用比全局配置更严格的 DM 会话路由，请通过 `security.dmRouting` 公开该行为，以便 Doctor 和安全审核将相同的会话所有者解析为运行时。可选的 `resolveDmScope` 回调在核心路由解析之前运行；其上下文包括 `cfg`、`accountId`、已解析的 `account` 以及有限白名单条目的 `principalId`。 `resolveDmRoute` 接收这些字段以及已解析的核心 `route`；它可能会返回 `{ sessionKey }` 表示共享最终存储桶，返回 `{ kind: "isolated" }` 表示未知对等点，或返回 `{ kind: "core" }` 来保留核心 `dmScope` 命名空间分析。对于 wildcard/open 策略，`principalId` 不存在，未定义的结果将报告为未验证。诊断从未发明过同行 ID。保持回调纯净且导入安全，因为只读诊断在没有通道运行时的情况下运行。

    特定于通道的安全诊断可以使用 `security.collectWarnings`。旧字符串结果具有警告严重性。当生产者必须声明信息或严重严重性时，返回结构化 `SecurityAuditFinding` 形状（`checkId`、`severity`、`title`、`detail` 和可选的 `remediation`）； Doctor 和主要安全审计也使用了相同的发现。仅将 `collectAuditFindings` 用于应出现在完整安全审核中但不出现在 Doctor 中的诊断。

    <Accordion id="what-createchatchannelplugin-does-for-you" title="createChatChannelPlugin 能为您做什么">
      无需手动实现底层适配器接口，只需传入声明式选项，构建器就会为你组合这些适配器：

      | 选项 | 作用 |
      | --- | --- |
      | `security.dm` | 来自配置字段的作用域 DM 安全解析器 |
      | `pairing.text` | 基于文本的 DM 配对流程，带代码交换 |
      | `threading` | 回复目标模式解析器（固定、账户作用域或自定义） |
      | `outbound.attachedResults` | 返回结果元数据（消息 ID）的发送函数；需要同级 `channel` id，以便核心可以标记返回的交付结果 |

      如果你需要完全控制，也可以传入原始适配器对象，而不是声明式选项。

      原始出站适配器可以定义 `chunker(text, limit, ctx)` 函数。可选的`ctx.formatting`携带交付时间格式化决策，例如`maxLinesPerMessage`；在发送之前应用它，以便通过共享出站传递一次性解析回复线程和块边界。当解析本机回复目标时，发送上下文还包括 `replyToIdSource`（`implicit` 或 `explicit`），因此负载助手可以保留显式回复标签，而无需消耗隐式一次性回复槽。可选的 `sessionKey` 标识产生发送的主机解析会话，包括核心路由和持久发送。它是源会话，而不是从传递目标或其策略推断的会话。它无法识别当前回合是来自用户还是内部事件。

      对于有效负载规划，`openclaw/plugin-sdk/channel-outbound` 导出 `createOutboundPayloadPlan(payloads, context)` 以获取原始回复文本，包括旧版 reply/audio 标签、`MEDIA:` 指令和可选的 Markdown- 图像提取。仅在生产者将这些控件解析为显式负载字段后才使用 `createStructuredOutboundPayloadPlan(payloads)`。结构化规划器不会将剩余文本重新解释为交付指令或静音令牌。下游自动回复静默策略仍然适用，并且频道保留其选择的呈现转换，包括 Markdown- 图像提取。两个操作均使用 `projectOutboundPayloadPlanForDelivery(plan)` 进行交付预测。

      `final` 的投递可以在答复前附上补充通知。决定是否完成任务时，使用 `openclaw/plugin-sdk/reply-payload` 中的 `isReplyPayloadTerminalContent(payload)`。它排除推理、评论和补充状态或 TTS 有效负载，同时保留终端错误和主机标记的命令结果。它对回复通道进行分类；它不检查内容、可发送性或权限。

      来自同一子路径的 `isHostNoticePayload(payload)` 可识别主机错误、状态通知和仅元数据主机诊断。代理到代理通道可以在 `messaging.transformReplyPayload` 中排除这些，同时仍然通过 `replyOptions.onAgentRunTerminalOutcome` 及其本机任务状态保留运行故障。当该回调作为排队的后续操作运行时，该回调将保持与原始请求的绑定；收集到的轮流通知每个源的终端观察者。人性化的频道应继续提供有用的主持人通知。

      `replyOptions.onFollowupQueueDisposition` 报告原始源的终端队列上限拒绝（`queue-cap` 或 `queue-cap-new`）和逐出（`queue-cap-old`）。这些消息不会运行，因此通道应最终确定其状态，而无需等待 `onAgentRunTerminalOutcome`。为摘要保留的溢出仍然悬而未决；从上限报告 `queue-cap-old` 中剔除的来源。

      `queuedDeliveryCorrelations` 条目通过收集批处理与其源保持绑定。其可选的 `shouldSuppressReply(payload)` 在原始路由发送之前应用，这会绕过立即回复调度程序。收集批次中的所有源策略必须同意抑制它；因此，明确的请求可以与被动消息一起保留反馈。 `onReplyDelivered` 仅在确认源发送后运行，因此重复数据删除不得将失败或待传输的发送记录为已发送。在交付和演示清理完成后，其 `begin()` 清理与 `visibleReplySent`、`failed` 和 `completed` 进行可选结算。 `completed` 识别成功执行，包括故意沉默；取消不算是从先前的故障中恢复。 `transportPending: true` 表示交付仍归传输所有，无需稍后回调此源；明确活动 UI 而不声明成功或失败，除非 `visibleReplySent` 或 `failed` 已经证明了结果。省略的结算意味着尝试被推迟，对源重试进行排队，或使用单独的源拥有的交付结果（例如网关答复批次）。将结算用于依赖交割的完成 UI；代理的成功执行回调可以在发送任何回复之前到达。

      克隆主机提供的回复时，使用 `openclaw/plugin-sdk/reply-payload` 中的 `copyReplyPayloadMetadata(source, clone)` 来保留其非序列化运行时元数据。持久的成绩单传送事实无法取代该元数据。来自同一子路径的 `hasReplyPayloadFinalDeliveryCapture(payload)` 标识共享调度程序将记录其确认传送的回复。通道适配器必须跳过它们自己的这些回复的转录镜像，包括回退发送，同时仍然正常报告传送结果。

      共享通道轮次生命周期拥有待定的最终交付许可。它在平台 I/O 之前记录直接发送托管，或将托管转移到持久交付队列。它的回复调度程序会跳过中间排队的声明；终端结算和重放抑制仍然属于交付生命周期。

      从早期源文本恢复有效负载时，应用 `openclaw/plugin-sdk/channel-outbound` 中的 `preserveReplyPayloadMediaSelection(current, recovered)`。这保留了由传递修改器更改的媒体和附件选择，同时允许文本和回复意图独立恢复。未更改的空介质不会阻止转录本恢复。对于未更改的媒体，该操作更喜欢当前准备的参考而不是其记录的源别名，并保留不同的恢复媒体。它保留候选人的其他运行时元数据。在标准化回复上恢复或投影字段后，以 `openclaw/plugin-sdk/channel-outbound` 中的 `createStructuredOutboundPayloadPlan` 结束。这会保留文字文本和主机记录的一次性目标策略。在过滤媒体之前，使用 `openclaw/plugin-sdk/channel-outbound` 中的 `collectReplyMediaEntries(payload, projectedMediaUrls?)` 保留每个 URL 的附件元数据。将这些条目过滤在一起，以便位置名称和引用的记录保留在其媒体中。条目还可以携带`sourceUrls`以供主持人上演参考。记录传送的媒体时，仅请求传输确认接受的 URL 条目；已删除或未发送媒体的源别名不是传送证据。

      带有 `ReplyPayload.textMode: "delta"` 的块携带不相交的文本块。预览适配器将其附加到当前答案通道中；省略的`textMode`表示替换快照。切勿从匹配的前缀中推断出这一点。 Finals总是替换的，耐用的sends/transcripts使用有效负载自己的`text`，而不是累积预览。文本重写传递修饰符清除了增量模式，因此其替换仍然具有权威性。将块附加到现有预览时，使用 `stripReplyPayloadResponsePrefix(payload, text)` 仅删除规范化记录的响应前缀；保留第一个块和独立持久发送的修饰文本。

      流式传输可以通过可选的`onPreparedBlockReply(plan, context)`、调度器`sendPreparedReply(kind, plan)`和适配器`deliverPrepared(plan, info)`操作承载一个`OutboundPayloadPlan`。修改器根据更改的有效负载字段重建该计划，而无需重新解释文字文本。通道转弯适配器可以通过`deliverPreparedWithProviderMessageSending`转发相同的计划，持久入库交付使用`deliverStructuredInboundReplyWithMessageSendContext({ ...context, plan })`。从当前网关发布中准备好的或过滤的代理注册表不是重新加载后继者：普通的最终回复使用该网关的实时通道注册表，并且不需要切换回调。两个持久入站帮助程序都接受可选的同步 `prepareRuntimeHandoff(cfg)` 回调，以在不相关的插件重新加载后进行最终回复。通道必须拒绝已更改的已接纳发件人，并返回一个配置，该配置固定该交付的所有部分的已验证凭据。核心需要为每次后续切换提供准确的保留通道注册和未更改的通道、共享默认值和拥有插件设置。没有此回调的通道将使用后继者未更改的配置进行交付；当发送者凭证可以更改外部配置（环境、令牌文件、SecretRef 值）时添加回调。回调不得保留凭据或更改不相关的设置。现有的原始回调仍然受支持。较旧的适配器通过其原始回调接收有效负载；它必须采用准备好的操作，以避免在其自己的规范化代码中重新解析文字文本。
    </Accordion>

    ### <a id="group-tool-policy-adapters"></a> 群组工具策略适配器

    实现了 `group.resolveToolPolicy` 并支持 `toolsBySender` 的频道必须将完整的 `ChannelGroupContext` 转发给其共享策略解析器。尤其要注意：通过在匹配的群组和通配符作用域跳过发送者特定的覆盖项，遵守 `senderPolicyMode: "never"`，同时仍应用基础的 `tools` 策略。

    OpenClaw 仅会为受信任的非入口执行设置此模式，此类执行的发送者权限已记录在服务器拥有的信封中，例如明确设置了上限的计划运行。插件不得从传入元数据推导此模式，不得将其持久化为频道状态，也不得将其暴露为配置项。添加一个适配器测试，证明该模式会跳过通配符 `toolsBySender` 条目，同时不会丢弃匹配的基础 `tools` 限制。

    ### <a id="native-plugin-command-ownership"></a> 原生插件命令所有权

    发布提供者本机命令目录的通道插件应使用 `openclaw/plugin-sdk/plugin-command-runtime`。在规划目录时创建一个运行时，将其候选对象与内置条目和技能条目合并，并将获胜的候选对象保留在已注册的处理程序闭包中。插件注册表替换会耗尽并重新启动加载的通道帐户，以便它们的处理程序、命令目录和路由使用新一代。手动停止的帐户保持停止状态。普通通道配置更改仍然只会重新启动受影响的通道或帐户。自 2026.9.2 以来，`retainNativeCatalog(provider)` 已被弃用，并将在下一个重大 SDK 版本中删除；它为针对 2026.9.1 编写的调用者保留，并且现有调用仅断言捕获的注册表生成仍处于活动状态。仅对该获胜者调用 `prepareDispatch(rawArgs)`，并使用 `dispatch.execute(context)` 执行返回的调度。为保留的内置和技能获胜者进行明确的 `{ kind: "non-plugin" }` 决策。这使得广告命令及其可执行插件注册保持在同一注册表生成上。

    候选者仅公开不可变的 display/auth/progress 元数据以及不透明的进程本地调度。它们不公开处理程序、插件根或注册表行。调度不能跨运行时工厂或通道，并且注册表替换会使新的执行返回不可用的结果，而不是根据替换注册表重新匹配命令文本。在退休之前已经承认的命令可能会在其捕获的一代上结束。不要对候选人或派遣进行序列化；仅将其显示字段投影到提供者 API 有效负载中。

  </Step>

  <Step id="wire-the-entry-point" title="连接入口点">
    创建 `index.ts`：

    ```typescript index.ts
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineChannelPluginEntry({
      id: "acme-chat",
      name: "Acme Chat",
      description: "Acme Chat channel plugin",
      plugin: acmeChatPlugin,
      registerCliMetadata(api) {
        api.registerCli(
          ({ program }) => {
            program
              .command("acme-chat")
              .description("Acme Chat management");
          },
          {
            descriptors: [
              {
                name: "acme-chat",
                description: "Acme Chat management",
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

    将通道拥有的 CLI 描述符放入 `registerCliMetadata(...)` 中，以便 OpenClaw 可以在根帮助中显示它们，而无需激活完整通道运行时，而正常的完整加载仍会拾取相同的描述符以进行实际命令注册。保留 `registerFull(...)` 仅用于运行时工作。 `defineChannelPluginEntry` 自动处理注册模式分割。如果 `registerFull(...)` 注册网关 RPC 方法，请使用特定于插件的前缀。核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保持保留并始终解析为 `operator.admin`。有关所有选项，请参阅 [Entry Points](/plugins/sdk-entrypoints#definechannelpluginentry)。

  </Step>

  <Step id="add-a-setup-entry" title="添加设置条目">
    创建 `setup-entry.ts`，用于在引导期间进行轻量加载：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    当通道被禁用或未配置时，OpenClaw 加载此内容而不是完整条目。它避免了在设置流程期间引入大量运行时代码。有关详细信息，请参阅 [Setup 和 Config](/plugins/sdk-setup#setup-entry)。

    将设置安全导出拆分为 sidecar 模块的捆绑工作区通道在还需要显式设置时运行时设置器时可以使用 `openclaw/plugin-sdk/channel-entry-contract` 中的 `defineBundledChannelSetupEntry(...)`。

  </Step>

  <Step id="handle-inbound-messages" title="处理入站消息">
    你的插件需要接收来自平台的消息并将它们转发给 OpenClaw。典型模式是使用 webhook 验证请求，然后通过频道的传入处理器分发它：

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // plugin-managed auth (verify signatures yourself)
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // Your inbound handler dispatches the message to OpenClaw.
          // The exact wiring depends on your platform SDK -
          // see a real example in the bundled Microsoft Teams or Google Chat plugin package.
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

    直接消息适配器可以使用 `openclaw/plugin-sdk/channel-inbound` 中的 `dispatchInboundDirectDm`。其可选的同步 `assertAuthority: () => void` 回调通过异步准备携带频道所有者的实时发送者和生命周期检查。在让步之前捕获所选帐户、对等身份和策略；回调必须检查它们当前的权限，而不仅仅是比较已保存的令牌。在当前主机上，它在会话记录之前、元数据事务和提交准入时以及代理分派之前运行。抛出拒绝挂起的效果。回调是临时权限；切勿将其序列化或替换为 `inboundAccessAuthorized: true`。

    相同的回调可用于通道转弯计划和准备好的转弯。直接会话录音调用者可以通过`assertAuthority`；元数据所有者以 `assertCommitAllowed` 的形式接收它，并使用其现有的写入者许可。元数据故障保留其现有的尽力报告，而后续的调度检查仍然拒绝撤销权限。较旧的主机可能会忽略这些附加字段：它们的存在不是能力协商。主机准备后和元数据提交时的检查需要实现此合约的主机。插件还必须检查它们直接发起的效果的实时权限，例如通知和提供商请求。

    向 `auth: "gateway"` 注册的路由使用网关的凭据检查。在处理程序公开受保护的数据、执行突变或启动其他副作用之前，完成读取和验证其主体并等待排队的工作，然后从 `openclaw/plugin-sdk/plugin-runtime` 调用 `await getPluginRuntimeGatewayRequestScope()?.revalidate?.()`。请求范围的功能通过网关身份验证所有者重新检查已承认的设备凭证或签名的 Control UI cookie 及其原始范围。 Cookie 检查包括过期时间、当前身份验证生成以及当前配置文件角色上限。有效的角色策略更改会使正在进行的 cookie 请求无效，因此先前准备的数据不会在过时的权限下泄露。如果授权过期、被撤销、轮换或缩小范围，它会写入标准 HTTP 401 错误并抛出异常。让拒绝阻止处理程序；错误处理程序不得替换已结束的响应。该功能随着 HTTP 响应而过期，并且对于其他身份验证路径不存在。

    该检查授权即将开始的工作。它不会取消已经正在进行的外部操作。在以后的独立突变之前再次重新验证，例如在中继 I/O. 后保存已发布或导入的配置文件

  </Step>

<a id="step-6-test"></a>
<Step id="test" title="测试">
在 `src/channel.test.ts` 中编写就近测试：

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
        const account = acmeChatPlugin.config.resolveAccount(cfg, undefined);
        expect(account.token).toBe("test-token");
      });

      it("inspects account without materializing secrets", () => {
        const cfg = {
          channels: { "acme-chat": { token: "test-token" } },
        } as any;
        const result = acmeChatPlugin.config.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(true);
        expect(result.tokenStatus).toBe("available");
      });

      it("reports missing config", () => {
        const cfg = { channels: {} } as any;
        const result = acmeChatPlugin.config.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(false);
      });
    });
    ```

    ```bash
    pnpm test <bundled-plugin-root>/acme-chat/
    ```

    关于共享测试辅助，请参见 [测试](/plugins/sdk-testing)。

</Step>
</Steps>

## <a id="file-structure"></a> 文件结构

```text
<bundled-plugin-root>/acme-chat/
├── package.json              # openclaw.channel metadata
├── openclaw.plugin.json      # Manifest with config schema
├── index.ts                  # defineChannelPluginEntry
├── setup-entry.ts            # defineSetupPluginEntry
├── api.ts                    # Public exports (optional)
├── runtime-api.ts            # Internal runtime exports (optional)
└── src/
    ├── channel.ts            # ChannelPlugin via createChatChannelPlugin
    ├── channel.test.ts       # Tests
    ├── client.ts             # Platform API client
    └── runtime.ts            # Runtime store (if needed)
```

## <a id="delegated-context-reads"></a> 委托上下文读取

捆绑操作可以证明提供者本地交付别名和与 `actions.messageActionTargetAliases[action].matchesCurrentConversationAsync` 的当前对话之间的等效性。回调接收 `{ args, accountId, toolContext }` 并返回 `Promise<boolean>`。主机仅在检查当前提供者、帐户和任何其他请求的目标后才等待它。外部注册不能使用此回调来绕过精确当前匹配。成功的异步匹配不会取代实时调用者或注册机构；主机在发货前重新检查。

异步别名证明需要加载所选的捆绑注册。活性检查使用其捕获的所有者权限和加载的注册表；在注册终止后，他们永远不会发现或加载捆绑的后备。正常的捆绑运行时注册可以满足此要求。保留的同步路径保留其现有的兼容性行为。

当两者都存在时，异步回调优先于 `matchesCurrentConversation`。错误的结果或被拒绝的承诺永远不会回退到遗留回调。对于存储支持的匹配，同步回调已被弃用，但旧插件和主机仍受支持，并且没有计划删除版本。严格保留其返回类型 `boolean`：较旧的主机将返回的承诺视为真实的，而不是等待它。异步同伴之前的主机会忽略新字段并仅使用同步回调。因此，仅异步别名无法证明这些主机上的等效性；精确的标准化目标匹配仍然有效。

经过验证的官方安装的插件可以将支持的对话、元数据和附件读取委托给提供商拥有的访问检查。通道源请求需要服务器拥有的当前提供者、帐户和对话上下文。经过身份验证的仪表板用户还可以在没有本机通道上下文的情况下使用提供商拥有的检查，包括隐身会话和重新连接后的新消息。普通运输损失不会取消已允许的转弯。该权限仅属于该回合；后台工作和计划​​作业保持各自的授权。正常聊天、会话参与和工具权限以及提供商帐户、目标、操作和请求者策略仍然有效。

帐户创建的计划读取使用实时作业的记录创建者帐户和来源。外部创建者来源限制对该提供者的读取；丢失或未知来源无法授权读取。省略 `accountId` 将选择记录的创建者帐户，包括在提供者的默认帐户更改之后。提供者目标和行动政策仍然有效。重授权和执行规则参见[预定工具策略](/automation/cron-jobs/payloads#agent-turn-options)。

适配器列出了支持 `actions.readAuthorityActions` 中的生命周期栅栏的操作。其 `actions.providerOwnedReadGates` 声明单独标识了提供商拥有其许可的操作。主持人还将该操作归类为合格；稍后添加的主机不会选择现有适配器加入其中。只有经过主办方验证的官方注册才有资格。 Discord 支持 `read`、`search`、`reactions`、`list-pins`、`thread-list`、`channel-info`、`permissions`、`member-info`、 `role-info`、`emoji-list`、`channel-list`、`voice-status` 和 `event-list`。 Feishu 支持 `read`、`reactions`、`list-pins`、`member-info`、`channel-info`、`channel-list` 和配置的 `sticker-search`。 Matrix 支持 `read`、`reactions`、`list-pins`、`emoji-list`、`member-info` 和 `channel-info`。 Mattermost 支持 `read`。 Slack 支持 `read`、`reactions`、`list-pins`、`member-info`、`emoji-list` 和 `download-file`。较旧的外部适配器和未经验证的插件保留精确当前对话限制。这些声明仅适用于列出的读取操作。

委派的 Slack 成员信息仅限于同一帐户的当前请求者，并且表情符号发现使用受信任的工作区。两种元数据操作都不需要通道目标。

Microsoft Teams支持[Teams访问下的`read`、`search`、`reactions`、`list-pins`、`member-info`、`channel-info`和`channel-list`规则](/channels/msteams/access-control)。

Discord 的 `permissions` 操作检查机器人对允许通道的权限。公会范围的元数据读取要求所选帐户的当前配置允许所请求的公会，并具有不受限制或通配符通道访问权限。少数例外是活动的 `thread-list` 命名父级 `channelId`：必须允许父级，并且其元数据必须在公会范围的获取之前确认所请求的公会。结果仅包括那些返回线程的父记录和成员记录下允许的线程。没有父级的活跃列表仍然需要公会范围的频道访问；存档列表保留其通道范围的路径。只有直接操作员才能收到 `channel-list` 的过滤结果放宽；委派的 `channel-list` 呼叫者仍然需要公会范围内的通道访问权限。

对于选择加入的适配器，传输合同是强制性的：

- 在提交每个请求时从 `openclaw/plugin-sdk/fetch-runtime` 捕获 `captureChannelReadAuthority()`，然后将其传递到共享队列。
- 通过等待和重试保留确切的回调；在任何异步 DNS 或调度程序准备之后，在每个提供程序请求（包括目标查找请求）之前立即调用它。
- 回调缺失意味着此调用没有额外的读取权限栅栏。抛出的错误会停止请求；不要使用新的回调重试。

在将请求传递到共享队列之前，捆绑传输还会从 `openclaw/plugin-sdk/fetch-runtime` 捕获 `captureEffectAuthority()`。使用其 `run` 方法在排队的延续中恢复捕获的范围。异步准备后，调用 `effect.initiate(() => provider.send(...))` 并在该回调内运行现有的同步断言。当提供者发出调用时、在其响应之前，所有者释放该间隔。每次重试或单独提交的块都会再次调用 `initiate` 以准备新的使用。完全准备好的同步批处理（例如 Twitch 的 SDK 调用或 IRC 的原始行）在第一次切换之前获取一次使用，并提交该回调内的所有部分。切勿预先获取多个持有的使用：所有者的 FIFO 等待先前的使用释放。 SDK切换后的库工作属于已启动的操作。当没有发送任何内容时，保留准备拒绝不变。一旦部分被接受，以后的拒绝、传输失败和交付观察者失败必须在部分交付错误中保留所有已接受的收据，包括当调用者省略其进度回调时。等待启动的批次稳定后再报告其结果。仅在输入 SDK 或传输调用后应用特定于提供商的故障标准化。

启动边界是对提供程序 SDK、CLI 运行程序或本机传输的调用。 OpenClaw 在该调用之前完成其异步准备，并且在等待提供者响应时不保持间隔。切换后，提供程序库仍然可以在内部进行排队、身份验证、加密、连接或重试；这些窗口是启动操作的一部分。应用程序重试和单独提交的块各自获得新的用途。

| 捆绑运输                                                             | 启动切换                                                                 | 交接后工作                                                |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| A2A、Google Chat、Nextcloud Talk、Tlon 和其他共享受保护的 HTTP 呼叫者 | DNS/proxy 准备后获取                                                  | 获取实施和网络                               |
| 巴斯和 Nostr                                                                | 继电器 `publish` 或 `send`                                                          | 中继连接承诺，WebSocket 缓冲，和网络 I/O    |
| ClickClack、Zalo、Zalo 个人                                               | 调度准备后的每个获取回调                                     | 获取实施和网络                               |
| Discord                                                                       | REST 调度程序等待后获取                                                   | 获取实施和网络                               |
| Feishu                                                                        | 代理和分派准备后的 HTTP 客户端方法                            | Axios 转换、拦截器、重定向和网络         |
| iMessage 本地 CLI                                                            | CLI 跑步者在 media/target 准备后呼叫                                     | 生成代理、CLI 执行、桥接和消息传递        |
| iMessage RPC                                                                  | 写入所选进程的标准输入                                              | 管道缓冲、local/SSH CLI、桥接和消息传递      |
| IRC                                                                           | 预先计算的原始 PRIVMSG 批次；显式出站 JOIN                              | 套接字缓冲和网络                                   |
| LINE                                                                          | 每条消息授权后获取                                             | Undici 和网络                                             |
| Matrix                                                                        | DNS、加密、调度准备后获取；每个重定向重新获取        | 获取实施和网络                               |
| Mattermost 和 SMS                                                            | 共享受保护的提取，或注入的提取回调                               | 获取实施和网络                               |
| Microsoft Teams                                                               | Teams 普通中间件调用SDK的下一个请求操作                     | SDK token/config 准备、拦截器、axios和联网 |
| QA 频道和 Synology 聊天                                                  | Node HTTP 请求和正文提交                                              | 套接字连接、缓冲和网络                      |
| 礁                                                                          | 每个继电器取                                                                   | 获取实施和网络                               |
| Signal HTTP/container                                                         | Node HTTP request/body 提交或 REST 获取                                    | HTTP 传输和信号-cli 处理                          |
| Signal Unix 套接字                                                            | 连接后套接字写入                                                      | 套接字缓冲和 signal-cli 处理                        |
| Slack                                                                         | SDK 队列等待后获取回调                                               | 获取实施和网络                               |
| Telegram                                                                      | 每个 Undici 调度员提交的资料；注入获取回调                         | Undici 或注入实现                                 |
| Twitch                                                                        | 预先计算的同步 `ChatClient.say` 调用批次                            | 双速率限制队列、IRC 客户端和网络              |
| WhatsApp                                                                      | FIFO之后的百利甜酒`sendMessage`，或`sendPresenceUpdate`；两者都重新检查套接字 | Baileys media/session 准备、加密和联网     |

Matrix 的客户端拥有的加密维护使用其客户端生命周期，而不是保留已完成的消息调用。它的消息获取仍然获取它们自己当前的用途。独立所有者可以使用 `withEffectAuthority` 恢复明确捕获的范围；不存在的作用域不提供消息权限。

主机将回调绑定到所选注册及其活动生命周期。本地消息工具和网关代理请求保留原始运行和转向权限。选择加入的捆绑读取使用相同的生命周期围栏，同时保留现有的提供商拥有的准入规则。捆绑的工件或遗漏的范围注册不能提供该权限；委托执行需要活动的注册实例。在调用者或插件权限被撤销后，主机拒绝陈旧的操作结果和错误。完成的操作也会关闭其捕获的回调。栅栏阻止后续请求；它无法撤消已发送给提供商的请求。没有配置开关或插件提供的信任字段可以创建此权限。

Slack 附件下载通过 URL 刷新、二进制传输、媒体存储发布、图像处理和最终主机完成保留原始读取权限。仅当读取成功时才会保留现有媒体工件。如果完成被拒绝，清理仅删除该操作创建的文件；先前存在的文件、替换文件和共享文件将被保留。源中止信号也到达调用者提供的二进制传输。

## <a id="scheduled-channel-administration"></a> 预定频道管理

`ChannelMessageActionAdapter` 通过 `openclaw/plugin-sdk/channel-contract` 公开可选的 `writeAuthorityActions?: readonly ChannelMessageActionName[]` 声明。它标识其传输保留主机实时请求权限的写入操作。通过 `describeMessageTool` 宣传操作或声明读取支持并不建立该合同。

主机单独选择符合条件的操作，并需要有效的捆绑或加载程序验证的官方注册。捆绑的工件后备或插件自己的信任声明无法提供注册权限。 Discord 声明 `writeAuthorityActions: ["channel-edit", "delete", "edit", "pin", "unpin"]`。其他操作名称不会从此声明获得预定访问权限。

预定的 `channel-edit`，包括其现有的通道和线程编辑变体，接受受信任的操作员作业权限或帐户作业的经过身份验证的本机请求者。该声明不能将帐户模式作业提升为操作员权限，也不能取代经过身份验证的请求者身份和当前发送者权限检查。

对于本机帐户编辑，主机会提供经过验证的 `requesterAccountId` 和 `requesterSenderId` 以及 `senderIsOwner: false`。当前没有可放入 `toolContext` 中的入站对话。适配器使用这些主机提供的事实来进行正常的当前请求者权限检查；模型参数和切换回调的存在无法提供请求者身份。主机将保存的本机请求者与早期的完整工具表面读取源分开。发现可以使用这两个事实来呈现配置的操作，但本机请求者不会建立读取访问权限。没有可用的本地事实的作业在调用提供者之前会收到重新授权指导。

预定的 `edit`、`delete`、`pin` 和 `unpin` 支持可信操作员作业和帐户作业。帐户作业必须使用其记录的创建者帐户和已知的创建者来源；外部来源还将其绑定到记录的提供者。其交付目标不提供授权。这些操作还需要适配器的现有 `providerOwnedReadGates` 声明并保留其目标检查。账户作业使用委托目标策略；可信作业使用操作员目标策略。作业的当前执行策略和 `toolsAllow`、帐户限制、启用的操作和提供程序权限仍然适用。

当每个新的计划消息调用被允许时，主机评估当前的工具策略，包括全局、代理、配置文件和选定的模型提供者策略。配置更改控制下一次调用；它们不会追溯更改已许可操作的配置。撤销或缩小作业本身、取消其运行或结束调用者或插件权限仍然会阻止稍后的提供程序请求并在该操作中重试。

主机在目录请求之前承认频道名称解析，并通过写入保留选定的注册。它的准备读取范围在写入开始之前关闭，因此读取完成检查不能丢弃已接受的突变结果。

选择加入的适配器必须遵守现有的 `ChannelMessageActionContext.assertDirectAdapterHandoff` 回调：

- 通过异步准备、权限和目标查找、速率限制队列和重试保留主机提供的准确回调。
- 在等待准备之后和每个实际提供者请求之前同步调用它，包括查找请求和每次重试尝试。
- 如果抛出，则停止该请求。不要抑制拒绝、替换回调或将被拒绝的操作放入可重放恢复中。
- 让提交的请求得到解决并保留其结果，包括在等待响应期间授权到期时确认的突变。过期的权限会阻止以后的请求；它不能导致已接受的突变被重播。

此可选字段使旧适配器保持源兼容。省略或空的声明会使新启用的计划操作被拒绝。现有的捆绑提供商拥有的交互路径保留其准入规则。要支持新的已安装插件路径，请升级 OpenClaw 和插件，实现上面的请求和重试检查，仅声明涵盖的操作，并加载更新的注册。现有的直接操作员和互动操作保留其准入规则。升级插件不会向现有作业授予额外权限。

## <a id="advanced-topics"></a> 高级主题

<CardGroup cols={2}>
  <Card title="螺纹选项" icon="git-branch" href="/plugins/sdk-channel-plugins#what-createchatchannelplugin-does-for-you">
    `threading.topLevelReplyToMode`：固定、帐户范围或自定义回复模式
  </Card>
  <Card title="消息工具集成" icon="puzzle" href="/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 和动作发现
  </Card>
  <Card title="目标解析" icon="crosshair" href="/plugins/architecture-internals#channel-target-resolution">
    inferTargetChatType、looksLikeId、reservedLiterals、resolveTarget
  </Card>
  <Card title="运行时辅助工具" icon="settings" href="/plugins/sdk-runtime">
    TTS、STT、媒体、子代理（通过 api.runtime）
  </Card>
  <Card title="频道入站 API" icon="bolt" href="/plugins/sdk-channel-inbound">
    共享入站事件生命周期：ingest、resolve、record、dispatch、finalize
  </Card>
</CardGroup>

<Note>
一些捆绑的帮助器接口仍然存在，用于捆绑插件的维护和兼容性。它们不是新频道插件的推荐模式；更喜欢来自公共 SDK 表面的通用 channel/setup/reply/runtime 子路径，除非您直接维护该捆绑插件系列。
</Note>

## <a id="next-steps"></a> 下一步

- [Provider Plugins](/plugins/sdk-provider-plugins) - 如果您的插件还提供模型
- [SDK Overview](/plugins/sdk-overview) - 完整的子路径导入参考
- [SDK Testing](/plugins/sdk-testing) - 测试实用程序和合同测试
- [Plugin Manifest](/plugins/manifest) - 完整清单模式

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本的每个部分现在都位于此页面或下面的七个子页面之一上。单页版本中的锚点仍然在这里解析。

### <a id="channel-message-adapter"></a> 通道消息适配器

[频道消息适配器](/plugins/sdk-channel-plugins/message-adapter) — `message` 适配器表面：实时和终结器功能、进度可见性、评论传送和本机 TTS 语音传送。

- <a id="message-adapter"></a>[消息适配器](/plugins/sdk-channel-plugins/message-adapter#message-adapter)
- <a id="progress-visibility-acceptance"></a>[进度可见性验收](/plugins/sdk-channel-plugins/message-adapter#progress-visibility-acceptance)
- <a id="quiet-progress-presentation"></a>[安静的进度演示](/plugins/sdk-channel-plugins/message-adapter#quiet-progress-presentation)
- <a id="quiet-acknowledgement-and-coalesced-progress"></a>[安静的确认和合并进度](/plugins/sdk-channel-plugins/message-adapter#quiet-acknowledgement-and-coalesced-progress)
- <a id="commentary-delivery-ownership"></a>[评论交付所有权](/plugins/sdk-channel-plugins/message-adapter#commentary-delivery-ownership)
- <a id="tts-voice-delivery"></a>[TTS 语音发送](/plugins/sdk-channel-plugins/message-adapter#tts-voice-delivery)

### <a id="durable-channel-ingress"></a> 耐用通道入口

[持久通道入口](/plugins/sdk-channel-plugins/durable-ingress) - 入口解析器、持久队列和重播重复数据删除、传输保留类、至少一次副作用以及重新加载和重新启动合约。

- <a id="inbound-ingress-(experimental)"></a><a id="inbound-ingress-experimental"></a>[入站入口（实验）](/plugins/sdk-channel-plugins/durable-ingress#inbound-ingress-experimental)
- <a id="durable-ingress-and-replay-dedupe"></a>[持久入口和重放重复数据删除](/plugins/sdk-channel-plugins/durable-ingress#durable-ingress-and-replay-dedupe)
- <a id="transport-classes-and-retention"></a>[传输类别和保留](/plugins/sdk-channel-plugins/durable-ingress#transport-classes-and-retention)
- <a id="at-least-once-side-effects"></a>[至少一次副作用](/plugins/sdk-channel-plugins/durable-ingress#at-least-once-side-effects)
- <a id="dynamic-policy-publication"></a>[政策动态发布](/plugins/sdk-channel-plugins/durable-ingress#dynamic-policy-publication)
- <a id="account-scoped-restart-contract"></a>[账户范围重启合约](/plugins/sdk-channel-plugins/durable-ingress#account-scoped-restart-contract)

### <a id="channel-status-and-media"></a> 频道状态和媒体

[通道状态和媒体](/plugins/sdk-channel-plugins/status-and-media) - 通道运行时状态信号以及媒体限制、托管媒体存储、入站媒体事实和本机负载整形。

- <a id="runtime-lifecycle-status"></a>[运行时生命周期状态](/plugins/sdk-channel-plugins/status-and-media#runtime-lifecycle-status)
- <a id="typing-indicators"></a>[打字指示器](/plugins/sdk-channel-plugins/status-and-media#typing-indicators)
- <a id="media-source-params"></a>[媒体源参数](/plugins/sdk-channel-plugins/status-and-media#media-source-params)
- <a id="native-payload-shaping"></a>[本机有效负载整形](/plugins/sdk-channel-plugins/status-and-media#native-payload-shaping)

### <a id="channel-sessions-and-bindings"></a> 频道会话和绑定

[频道会话和绑定](/plugins/sdk-channel-plugins/sessions-and-bindings) — 会话对话语法、对话路由所有权和帐户范围的对话绑定支持。

- <a id="session-conversation-grammar"></a>[会话会话语法](/plugins/sdk-channel-plugins/sessions-and-bindings#session-conversation-grammar)
- <a id="conversation-route-ownership"></a>[会话路由所有权](/plugins/sdk-channel-plugins/sessions-and-bindings#conversation-route-ownership)
- <a id="account-scoped-conversation-binding-support"></a>[帐户范围的对话绑定支持](/plugins/sdk-channel-plugins/sessions-and-bindings#account-scoped-conversation-binding-support)

### <a id="channel-approvals"></a> 渠道批准

[渠道批准](/plugins/sdk-channel-plugins/approvals) — 批准功能、批准身份验证、有效负载生命周期和设置指南、本机批准交付以及更窄的批准运行时子路径。

- <a id="approvals-and-channel-capabilities"></a>[批准和渠道能力](/plugins/sdk-channel-plugins/approvals#approvals-and-channel-capabilities)
- <a id="approval-auth"></a>[批准授权](/plugins/sdk-channel-plugins/approvals#approval-auth)
- <a id="payload-lifecycle-and-setup-guidance"></a>[有效负载生命周期和设置指南](/plugins/sdk-channel-plugins/approvals#payload-lifecycle-and-setup-guidance)
- <a id="native-approval-delivery"></a>[原生批准交付](/plugins/sdk-channel-plugins/approvals#native-approval-delivery)
- <a id="narrower-approval-runtime-subpaths"></a>[较窄的审批运行时子路径](/plugins/sdk-channel-plugins/approvals#narrower-approval-runtime-subpaths)

### <a id="channel-setup-and-config"></a> 通道设置和配置

[通道设置和配置](/plugins/sdk-channel-plugins/setup-and-config) — 设置子路径、帐户模式和继承，以及用于配置、入站、目标和线程的其他窄通道子路径。

- <a id="setup-subpaths"></a>[设置子路径](/plugins/sdk-channel-plugins/setup-and-config#setup-subpaths)
- <a id="account-schemas-and-inheritance"></a>[帐户架构和继承](/plugins/sdk-channel-plugins/setup-and-config#account-schemas-and-inheritance)
- <a id="other-narrow-channel-subpaths"></a>[其他窄通道子路径](/plugins/sdk-channel-plugins/setup-and-config#other-narrow-channel-subpaths)

### <a id="channel-mention-policy"></a> 频道提及政策

[频道提及策略](/plugins/sdk-channel-plugins/mention-policy) - 插件拥有的提及证据收集加上共享入站提及策略评估。

- <a id="inbound-mention-policy"></a>[入站提及政策](/plugins/sdk-channel-plugins/mention-policy#inbound-mention-policy)

## <a id="related"></a> 相关内容

- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
- [Agent harness 插件](/plugins/sdk-agent-harness)
