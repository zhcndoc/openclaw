---
summary: "哪个类型化公共 SDK 子路径替换每个旧导入，包括删除的通道外观"
read_when:
  - "您正在用集中的子路径替换广泛的 SDK 桶导入"
  - "您需要删除通道外观到通道出站映射"
title: "导入路径参考"
sidebarTitle: "导入路径"
---

如何选择最窄的记录子路径，以及已删除通道立面的每次导出映射。 [Plugin SDK 迁移](/plugins/sdk-migration) 指南的一部分。

## <a id="import-path-reference"></a> 导入路径参考

使用从 [SDK 概述 ](/plugins/sdk-overview) 链接的主题 SDK 指南，并首选最窄的记录类型公共子路径。在 `package.json` 中，这些子路径同时具有 `types` 和 `default` 导出目标。

`scripts/lib/plugin-sdk-entrypoints.json` 中的编译器清单还包含私有本地条目。它们的分类保留在 `scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中。生产专用条目可能具有 JavaScript-only 用于捆绑或单独发布的官方插件的 `default` 导出，但它们的声明不包含在包中。运行时导出或源文件不是类型化的第三方 SDK 合约。

此页面上的映射是迁移子集，而不是完整的 SDK 表面。在替换导入之前检查公共子路径及其实际命名的导出。

保留的捆绑插件帮助程序接口（包括 `plugin-sdk/discord` 和 `plugin-sdk/telegram-account` 兼容性外观）已从公共 SDK 导出映射中退役。所有者特定的助手位于拥有的插件包内；共享主机行为通过通用 SDK 合约（例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和注入的插件 API）移动。

请使用与任务匹配的最窄导入路径。如果找不到某个导出项，请检查 `src/plugin-sdk/` 中的源代码，或询问维护者应由哪个通用契约负责。

### <a id="removed-command-and-channel-facades"></a> 删除了命令和通道外观

`command-auth`、`discord` 和 `telegram-account` 子路径已于 2026 年 10 月 2 日停用，并获得 SDK-owner 的明确批准。使用这些替换：

| 去除表面                                                                         | 替代方案                                                                                                                                             |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `command-auth` 发送方授权帮助程序和运行时参数类型                 | `resolveChannelMessageIngress` 来自 `channel-ingress-runtime`；使调用者适应入口合约，而不是重新创建旧的白名单策略。 |
| `command-auth` 本机命令解析、规范、授权和会话目标帮助程序 | 来自 `command-auth-native` 的匹配命名导出。                                                                                                  |
| `command-auth` 帮助建设者                                                            | `buildCommandsMessage`、`buildCommandsMessagePaginated` 和 `buildHelpMessage` 来自 `command-status`。                                                  |
| `command-auth` 模型提供者数据助手                                              | 来自 `models-provider-runtime` 的匹配命名导出。                                                                                              |
| `command-auth` 访问组助手                                                     | 将发件人授权委托给`channel-ingress-runtime`； `access-groups` 是本地私有的，不是第三方替代品。                      |
| `command-auth` 直接-DM 访问助手                                                 | 来自 `channel-inbound` 的匹配命名导出。                                                                                                      |
| `discord` 通用通道类型和帮助程序                                             | 来自 `channel-contract`、`channel-core`、`channel-plugin-common`、`channel-status` 或 `config-contracts` 的匹配命名导出。                   |
| `discord` 通道拥有的帮助程序和类型                                               | 存储库消费者使用Discord插件的`api.ts` / `runtime-api.ts`；外部插件使用通用通道合约和注入的运行时。     |
| `telegram-account` 账户解析及类型                                         | 存储库消费者使用Telegram插件的`api.ts`；外部插件使用通用通道合约并注入运行时助手。                   |

在更改导入之前检查每个命名导出。旧的发送者授权类型和 Discord 外观的许可 component/thread-binding 类型已被删除；拥有的 API 有自己的合约。一些遗留导出没有类型公共替换，并且需要调用者更改。不要将它们替换为私有本地主机导出或其他插件的私有 `src/*` 文件。导入这些外观的较旧发布的软件包必须先升级，然后才能将它们加载到包含此删除的主机上； SDK-所有者批准不是外部迁移的证据。

<a id="retained-channel-facade-mappings" />

### <a id="removed-channel-facade-mappings"></a> 删除了通道立面映射

拆除的通道立面不可与 `channel-outbound` 互换。分别迁移每个函数和类型。

对于 `openclaw/plugin-sdk/channel-reply-pipeline`，使用 `openclaw/plugin-sdk/channel-outbound` 的这些导出：

| 旧版导出                                                                   | 现代出口                                  |
| ------------------------------------------------------------------------------- | ---------------------------------------------- |
| `createChannelReplyPipeline`                                                    | `createChannelMessageReplyPipeline`            |
| `resolveChannelSourceReplyDeliveryMode`                                         | `resolveChannelMessageSourceReplyDeliveryMode` |
| `createReplyPrefixContext`, `createReplyPrefixOptions`, `createTypingCallbacks` | 相同的名字                                     |

这些功能保留了以前外观的实现。它们的命名类型也从 `channel-outbound` 开始不变：`ChannelReplyPipeline`、`CreateTypingCallbacksParams`、`ReplyPrefixContext`、`ReplyPrefixContextBundle`、`ReplyPrefixOptions`、`SourceReplyDeliveryMode` 和 `TypingCallbacks`。

从 `openclaw/plugin-sdk/channel-lifecycle` 开始，这些功能不变地移至 `channel-outbound`：`createAccountStatusSink`、`createChannelRunQueue`、`keepHttpServerTaskAlive`、`runPassiveAccountLifecycle`、`waitUntilAbort`、`createDraftStreamLoop`、`createFinalizableDraftLifecycle`、 `createFinalizableDraftStreamControls`、`createFinalizableDraftStreamControlsForState`、`clearFinalizableDraftMessage`、`takeMessageIdAfterStop`、`createRunStateMachine` 和 `createArmableStallWatchdog`。

命名类型 `ChannelRunQueue`、`ChannelRunQueueParams`、`ChannelRunQueueTaskContext`、`DraftStreamLoop`、`FinalizableDraftStreamState`、`ArmableStallWatchdog` 和 `StallWatchdogTimeoutMeta` 也不变地移至 `channel-outbound`。

将 `deliverFinalizableDraftPreview` 替换为 `defineFinalizableLivePreviewAdapter` 和 `deliverWithFinalizableLivePreviewAdapter`。将预览回调移至 `adapter` 并使用 `kind` 和可选的 `liveState` 处理对象结果，而不是旧字符串结果。适配器可返回`preview-retained`；删除的包装器将该类型映射到 `normal-skipped`。

旧的 `DraftPreviewFinalizerDraft` 和 `DraftPreviewFinalizerResult` 名称已被删除。使类型使用适应重点实时预览合同并考虑结果形状的变化。

对于 `openclaw/plugin-sdk/channel-message`，将出站导出移至 `channel-outbound`，但将其三个调度别名迁移至 `openclaw/plugin-sdk/channel-inbound`：

| 旧版导出                      | 现代入境出口               |
| ---------------------------------- | ----------------------------------- |
| `hasFinalChannelTurnDispatch`      | `hasFinalInboundReplyDispatch`      |
| `hasVisibleChannelTurnDispatch`    | `hasVisibleInboundReplyDispatch`    |
| `resolveChannelTurnDispatchCounts` | `resolveInboundReplyDispatchCounts` |

这些别名共享它们的实现和签名。出站合同参见[通道出站API](/plugins/sdk-channel-outbound)。
