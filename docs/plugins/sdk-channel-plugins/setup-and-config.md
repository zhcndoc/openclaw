---
summary: "设置子路径、帐户模式和继承，以及配置、入站、目标和线程的其他窄通道子路径"
read_when:
  - "您正在构建通道设置向导或设置条目"
  - "您需要帐户架构默认值、策略细化或配置继承"
  - "您需要窄通道子路径作为热入口点"
title: "通道设置和配置"
sidebarTitle: "设置与配置"
---

有线通道设置、帐户配置模式和狭窄的 SDK 子路径使入口点的导入成本低廉。 [构建频道插件](/plugins/sdk-channel-plugins)指南的一部分。

## <a id="setup-subpaths"></a> 设置子路径

- `openclaw/plugin-sdk/setup-runtime` 覆盖运行时安全的设置 helper： `createSetupTranslator`、可安全导入的 setup patch 适配器 (`createPatchedAccountSetupAdapter`、`createEnvPatchedAccountSetupAdapter`、 `createSetupInputPresenceValidator`)、lookup-note 输出、 `promptResolvedAllowFrom`、`splitSetupEntries`，以及委托式 setup-proxy builders。
- `openclaw/plugin-sdk/channel-setup` 覆盖可选安装的设置 builders，以及少量设置安全原语： `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、 `createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、 `createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 和 `splitSetupEntries`。
- 仅当您还需要较重的共享 setup/config 帮助程序（例如 `moveSingleAccountChannelSectionToDefaultAccount(...)`）时，才使用更广泛的 `openclaw/plugin-sdk/setup` 接口。

如果您的频道只想在设置界面中宣传“首先安装此插件”，请首选 `createOptionalChannelSetupSurface(...)`。生成的 adapter/wizard 拒绝配置写入和最终确定，并且它们在验证、最终确定和文档链接副本中重复使用相同的安装所需消息。

如果你的通道支持由环境变量驱动的设置或身份验证，请通过通道配置 schema 和设置描述符公开这些能力。将通道运行时的 `envVars` 或本地常量仅用于面向操作员的文案。

如果您的频道可以在插件运行时启动之前出现在 `status`、`channels list`、`channels status` 或 SecretRef 扫描中，请将 `openclaw.setupEntry` 添加到 `package.json` 中。该入口点应该可以安全地导入到只读命令路径中，并且应该返回这些摘要所需的通道元数据、设置安全的配置适配器、状态适配器和通道秘密目标元数据。不要从设置条目启动客户端、侦听器或传输运行时。

主通道入口导入路径也要保持精简。Discovery 可以在不激活通道的情况下评估入口和通道插件模块来注册能力。像 `channel-plugin-api.ts` 这样的文件应导出通道插件对象，而不要导入 setup wizard、传输客户端、socket 监听器、子进程启动器或服务启动模块。把这些运行时组件放到由 `registerFull(...)`、运行时 setter 或 lazy capability adapter 加载的模块中。

## <a id="account-schemas-and-inheritance"></a> Account 架构和继承

使用 `openclaw/plugin-sdk/channel-config-schema` 中的 `buildChannelAccountSchemaParts`。它的 `accountShape` 使 `dmPolicy` 和 `groupPolicy` 可选，因此省略的帐户策略会继承通道根。仅将其 `rootPolicyShape` 传播到根架构中：它默认 DM 为 `pairing`，组为 `allowlist`。不要将这些默认值应用于帐户条目或将其从根目录中删除；前者隐藏操作员设置，后者可以使组访问保持开放状态。这取代了 `buildCommonChannelAccountShape` 及其默认标志。

使用同一子路径中的 `refineChannelDmPolicy({ channelId, value, ctx })` 根据 `allowFrom` 验证根策略。传递 `accountId` 以使用根策略和白名单继承来验证一个帐户，包括显式空数组覆盖。该帮助程序发出 `open` 和 `allowlist` 策略的标准 root/account 错误路径和消息。保持帐户迭代、禁用帐户过滤和相对于通道中其他改进的排序，因为这些规则在插件之间有所不同。

通过现有的 `openclaw/plugin-sdk/account-helpers` 导出使用 `mergeAccountConfig` 或 `resolveMergedAccountConfig` 进行运行时继承。他们的共享实现位于 `src/config/channel-account-config.ts`；插件必须使用 SDK 导入。帐户字段替换根字段，包括显式空集合。 `nestedObjectKeys` 选择浅层对象合并；当此类帐户集合为空时，`inheritEmptyKeys` 将字段映射到 `"array"` 或 `"object"` 以继承根。当根包含限制性发件人条目、保留显式帐户发件人或回退到根列表时，`preserveRootAllowFrom: true` 会删除帐户通配符。这些收集和许可名单规则是所有者选择的，而不是通用渠道默认值。将凭证、传输选择和其他特定于渠道的帐户问题保留在插件中。

### <a id="stored-account-key-selection"></a> 存储帐户密钥选择

从 `openclaw/plugin-sdk/account-resolution` 导入 `resolveAccountKey`、`resolveNormalizedAccountEntry` 和 `ChannelAccountKeyPolicy`。使用选定的存储键进行写入，以便编辑保留操作员的键拼写并更新读者使用的相同条目。

对于已注册的通道回调，请使用 `resolveAccountKey(accounts, accountId, undefined, undefined, { channelId })` 从拥有的操作或网关快照中使用所选的清单策略。通过读取、设置和删除来保持元数据范围处于活动状态。不要从运行时插件的清单中导入第二个策略：另一个清单可能拥有该通道策略。

`resolveAccountKey(accounts, accountId, normalizeAccountId?, policy?, options?)` 返回存储的密钥或 `undefined`：

| 争论               | 含义                                                                                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts`             | 创作帐户图，或`undefined`。                                                                                                                                                                                                                      |
| `accountId`            | 请求的帐户 ID。通过策略，路由规范化首先运行，并且精确的规范化密钥获胜。如果没有策略，则正确请求的密钥将获胜。                                                                                                   |
| `normalizeAccountId`   | 当未提供策略时，应用于请求的 id 和存储的密钥的可选函数。对于不区分大小写的查找，请忽略两者。策略选择路由标准化。                                                                                   |
| `policy`               | 可选的 `ChannelAccountKeyPolicy` 和 `canonicalAliasesRequireOwnField`，帐户字段必须在标准化后识别的别名之前包含自己的非空字符串。现有的不区分大小写的匹配仍然符合条件。 |
| `options.channelId`    | 其所选清单提供策略的可选渠道。显式的 `policy` 优先。如果没有通道或选定的策略，规范化器和不区分大小写的行为将保持不变。                                                    |
| `options.allowMissing` | 当没有存储的密钥符合条件时，返回创建目标。保留的对象键在编写者创建不可读的帐户之前抛出。                                                                                                                    |

发货的v2026.9.4 SDK不导出`resolveAccountKey`；仅将这些选项与提供此选择器和通道上下文的主机 SDK 一起使用。这不会改变旧条目返回助手的行为。

`resolveNormalizedAccountEntry(accounts, accountId, normalizeAccountId, policy?)` 采用相同的参数，需要规范化器，并返回选定的条目而不是其键。不匹配或不合格的别名返回 `undefined`；然后可以应用正常的通道继承。

`resolveMergedAccountConfig` 采用 `channelConfig`（根默认值）、`accounts`（创作的地图）和 `accountId`，以及可选的 `normalizeAccountId`、`channelId` 和 `accountKeyPolicy`。 `channelId` 从当前操作准备的插件元数据快照或已发布的网关快照中选择规则。 `accountKeyPolicy` 对于具有明确提供的策略的调用者仍然可用。它无需 `channelId` 或 `normalizeAccountId` 即可工作，并且优先于快照规则。帐户密钥选择优先于现有字段合并和集合继承规则。

设置和配置适配器工厂接受相同的可选 `accountKeyPolicy`。注册的适配器使用准备好的通道策略。作用域设置、帐户名称、启用、删除和字段清除帮助程序也接受 `accountKeyPolicy`；它们的 `accountId` 是标准化路由 ID，而不是存储的拼写。注册的适配器在调用这些助手之前规范操作员输入。 `clearAccountEntryFields` 另外接受 `channelId` 来选择准备好的元数据，或没有 `channelId` 的显式策略。

在 [`channelAccountKeyPolicies`](/plugins/manifest/surfaces#channelaccountkeypolicies-reference) 中声明规则，以便通用通道读取器和写入器接收相同的策略。删除会在建议的剩余映射上重新运行选择器，并拒绝会激活冲突行的删除。使用 `allowMissing: true` 创建会拒绝保留的对象密钥，而不是写入读者无法选择的帐户。

## <a id="other-narrow-channel-subpaths"></a> 其他窄通道子路径

对于其他高频通道路径，在不需要更宽泛的遗留接入面时，优先使用更窄的帮助器：

- `openclaw/plugin-sdk/account-core`、`openclaw/plugin-sdk/account-id`、 `openclaw/plugin-sdk/account-resolution` 和 `openclaw/plugin-sdk/account-helpers`，用于多账户配置和默认账户回退
- `openclaw/plugin-sdk/inbound-envelope` 和 `openclaw/plugin-sdk/channel-inbound` 用于入站 route/envelope 和记录和调度接线
- `readAgentRunTerminalOutcome(dispatchResult)` 与 `openclaw/plugin-sdk/channel-inbound` 时，终端反应或状态 UI 必须区分已完成的核心代理运行和已恢复的失败运行。仅当核心运行实际启动时，它才返回 `"completed"` 或 `"failed"`，对于命令、重复数据删除、繁忙、预运行中止和自定义调度结果，它返回 `undefined`。交付计数和可见性仍然是传输事实，包括错误有效负载的成功交付；进程本地载体未序列化为 JSON。
- 当成功的出站发送必须取消活动的入站事件标记时，`createInboundEventDeliveryCorrelation(...)` 来自 `openclaw/plugin-sdk/inbound-event-delivery`；每个通道创建一个跟踪器并在通道插件中保持目标匹配
- `openclaw/plugin-sdk/channel-targets`，用于目标解析帮助器
- `openclaw/plugin-sdk/channel-outbound` 用于出站 identity/send 代表和类型化有效负载规划
- 当出站路由应保留显式 `replyToId`/`threadId` 或在基本会话密钥仍然匹配后恢复当前 `:thread:` 会话时，`buildThreadAwareOutboundSessionRoute(...)` 来自 `openclaw/plugin-sdk/channel-core`。当其平台具有本机线程传递语义时，提供程序插件可以覆盖优先级、后缀行为和线程 ID 规范化。
- `openclaw/plugin-sdk/thread-bindings-runtime`，用于线程绑定生命周期和适配器注册

`threading.resolveReplyTransport` 钩子与 `replyToIsExplicit` 分开接收有效负载的可选 `replyToCurrent` 意图。本机 API 需要线程根的通道可以解析针对已接纳线程的当前消息回复，而无需重定向任意显式 `replyToId` 目标。省略的意图保留现有的显式目标行为。

对于对原始通道的排队回复，挂钩还可以接收 `currentMessageId`，即队列所有者捕获的外部入站消息 ID。它是可选上下文，而不是显式回复目标：核心不会将其附加为 `replyToId`。通道决定是否将其用于隐式关联，同时保留显式目标、空选择退出和回复模式过滤。内部和会话间轮流不提供此外部消息事实。

仅授权通道通常可以停止在默认路径：核心处理批准，插件仅公开 outbound/auth 功能。本机审批通道（例如 Matrix、Slack、Telegram 和自定义聊天传输）应使用共享的本机帮助程序，而不是滚动自己的审批生命周期。
