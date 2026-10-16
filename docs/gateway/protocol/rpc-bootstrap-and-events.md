---
summary: "会话列表引导程序、常见事件系列以及节点帮助程序和执行生命周期合约"
read_when:
  - "在一次订阅调用中引导会话列表"
  - "Subscribing to a gateway event family"
  - "实现节点帮助器方法或 exec 生命周期处理"
title: "网关协议会话引导和事件"
sidebarTitle: "引导程序和事件"
doc-schema-version: 1
---

客户端如何在一次调用中引导会话列表、公共网关事件系列以及节点帮助程序和执行生命周期合约。

## <a id="session-list-bootstrap"></a> 会话列表引导程序

使用非空 `sessions.list` 参数对象（例如 `{ limit: 60, ownerFirst: true }`）调用 `sessions.subscribe`，以在一个请求中订阅并加载初始名单。成功的 WebSocket 响应具有有效负载 `{ subscribed: true, list }`，其中 `list` 是正常的 `SessionsListResult`。使用 `{}` 进行调用会保留仅确认响应 `{ subscribed: true }` 并且不会读取快照。列表参数选择快照；它们不会过滤连接的会话事件订阅。

列表视图可以传递 `rowMode: "compact"` 以省略重复的仅详细元数据：`contextWindows`、`contextWindowDefault`、`thinkingLevels`、`thinkingOptions`、`thinkingDefault`、`toolOverrides`、`providerReview`、 `nativeRuntimeConsent`、`contextBudgetStatus`、`agentRuntime` 和 `pluginExtensions`。返回的每一行都带有`rowMode: "compact"`；这些遗漏意味着未要求提供详细信息，并且不得清除先前承认的详细信息字段。使用 `sessions.describe` 或完整的 `chat.history.sessionInfo` 了解详细信息。省略 `rowMode` 将保留完整的行合同。标题、预览和活动回顾丰富内容仍然由其现有的包含标志控制。

侧边栏请求 `rowMode: "sidebar"` 保留导航、身份、未读、运行、放置和成员身份事实，同时省略执行设置和使用。重复显示对象在响应的 `sharedFacts` 数组中发送一次。行的可选 `sharedFacts` 包含该响应本地数组的索引；在将其与缓存状态协调之前，将这些部分对象合并到行中。该行自己的字段优先。侧边栏投影之外的字段是未请求的，而不是删除收据，就像紧凑行一样。其他客户端可以继续请求紧凑或完整的行，而无需解码共享事实。

侧边栏回复包括不透明的 `rowsRevision`。当授权行未更改时，客户端可以在同一查询上将其作为 `ifRowsRevision` 发送，以接收 `rowsUnchanged: true` 和空 `sessions` 数组。计数、默认值和构面仍然描述当前的完整窗口。

也接受行增量的客户端发送 `ifRowsRevision: "delta:<revision>"`。当该查询的前一个行向量仍保留时，`sessions` 仅包含更改或插入的行，而 `rowsDelta` 包含 `baseRevision` 和 `order`。展开响应本地共享事实，将缓存的基行与这些更改的行连接起来，然后通过 `order` 中的整数索引选择完整的窗口。删除省略的基行；跨代理重复的原始密钥仍然不同。 `count` 仍然计算整个窗口，包括所有者优先的行。在应用增量之前需要匹配的基础修订版。修订未命中、退役视图和没有有用增量的读取会返回正常的全行数组。当前的授权和选择始终先于该比较。网关只为每个有界查询视图保留一个先验向量，并与演示文稿所有者一起清除它。

此模式是可选的：裸修订令牌永远不会接收增量，较旧的网关将前缀令牌视为未命中并返回完整行。

Control UI 列表请求使用有界诊断 `source`：`sidebar`、`dashboard`、`activity`、`sessions-page`、`chat-pane`、`agent-roster`、`command-palette` 或`skill-workshop`。源不会改变选择或访问。列表和事件行包括 `hasBoard`（准备好的仪表板成员身份事实），因此仪表板库可以应用行更新，而无需再次枚举其页面。展开会话页面上的紧凑行可通过 `sessions.describe` 读取其完整详细信息。行还包含 `childOwnerSessionKeys`，这是网关的 `spawnedBy` 过滤器使用的当前保留所有者。这些收据包括运行时控制器和导航所有权，通过同一所有者过期，并让子窗口应用事件，而无需在浏览器中重新实现保留规则。

网关在投影列表之前注册订阅。客户端在发出请求之前必须侦听 `sessions.changed`：事件可以在构建快照时到达。将这些事件与响应进行协调，并在需要时发出尾随 `sessions.list` 刷新，包括当事件仅使缓存列表无效时。重新连接需要新的订阅和快照。

网关将持久会话元数据保留在内存中，并在正常启动完成之前完成其初始行具体化。一旦网关准备好，重新连接的客户端就可以读取初始名册。提交的所有者更改会增量刷新受影响的行；响应消耗当前行事实，没有过时窗口。键控描述、解决方案和聊天启动会准备其请求的行，而无需等待批量刷新。新接纳或替换的存储加载其元数据一次，并且当其存储离开当前拓扑时行消失。每个响应都会应用当前查看者的可见性和当前活动时间。等效的查看器共享不可变的行表示和编码的行字节，直到他们的投影事实发生变化； `snapshotAt` 保留行的采样时间。在重用之前会检查运行时权限、权限更改和时钟到期事实。相同身份、共享策略和查询的 WebSocket 视图还共享当前行发布中的选择和构面。依赖于实时运行、时钟窗口、子保留或搜索的查询会为每次读取再次选择。每次读取都会呈现当前行；未更改的行共享其数组和组装的 JSON 字节。进程内调用者保留自己的选择和行包装器以进行授权丰富。

常驻行使用存储的标题和用法。可选的消息预览和终端后备模型元数据通过有界只读后台记录读取进行填充；他们可能会缺席早期响应。前台请求优先。这些读取不会恢复冷存档、解析超大消息、调用模型或更改存储的元数据或会话活动顺序。丢失的历史标题和旧版 ACP 密钥只能由 `openclaw doctor --fix` 修复。在正常使用记录器记录之前，丢失的使用情况将一直不存在。

两种方法都接受 `activeOnly: true` 在分页之前选择当前正在运行或排队的会话。活动来自实时运行时所有者，而不是存储的状态标志。当选项被省略或为 false 时，普通列表行为不会改变。仅活动结果包括每个可见代理拥有的 `global` 和 `unknown` 会话及其原始密钥和捕获的 `agentId`；呼叫者通过代理、密钥和 `sessionId` 一起识别行。文字 `agent:<id>:global` 和 `agent:<id>:unknown` 会话保持不同的行。仅活动的原始哨兵行省略了可选的 `childSessions` 和 `hasActiveSubagentRun` 字段；使用 `hasActiveRun` 进行直接活动。正常权限、archive/inclusion 过滤器和页面限制仍然适用。 Sessionless/internal 运行在会话索引之外。

两种方法都接受 `ownerFirst: true` 将最多 60 个匹配的查看者拥有的行（或 `limit`，当较小时）添加到正常的首页，并通过会话密钥进行重复数据删除。这仅适用于 `offset` 为零或省略时；后面的页面使用正常的分页。拥有的行必须通过与共享页面相同的可见性和列表过滤器。网关从经过身份验证的连接解析查看器；客户端提供的身份不会选择这些行。如果没有经过身份验证的查看者身份，或者当 `ownerFirst` 为 false 或省略时，列表将使用正常排序。

共享页面仍确定 `limitApplied`、`offset`、`nextOffset`、`hasMore` 和 `totalCount`。预置行可能会使 `sessions.length` 和 `count` 超出共享页大小。使用`nextOffset`通过会话密钥跨页推进和去重行；不要从显示的行数中得出下一个偏移量。

## <a id="session-message-subscriptions-and-narration"></a> Session消息订阅和旁白

`sessions.messages.subscribe` 订阅会话实时消息的一个连接。其`key`和可选的`agentId`选择会话；这与上面的广泛名册订阅是分开的。对于完整的 `chat` 和 `agent` 流，请省略 `mode`，包括前台脚本和由另一个客户端启动的运行的被动视图。重复请求会替换该观察者的订阅模式。 `sessions.messages.unsubscribe` 删除由相同可选 `subscriptionId` 标识的观察者；省略选择遗留观察者。订阅确认包括标准化的 `key` 和解析的 `agentId`。客户端为以后的 `global` 请求保留已解析的所有者，其密钥本身并不能识别代理。 SDK 为每个有线观察者发送一个稳定的不透明 `subscriptionId` 并将其包含在重新订阅和取消订阅请求中。对于一个连接和会话上的多个 ID，全流兴趣优先，直到其最后一个所有者释放；当任何所有者请求时，批准仍保持启用状态。取消订阅观察者会重置连接的文本基线；剩余的观察者在仅附加传递恢复之前收到完整的快照。省略 ID 会保留旧的单观察者行为。旧版客户端仍与更新后的网关兼容；更新的 SDK 的所有权字段需要更新的网关。

背景叙述消费者声明`mode: "narration"`。网关用 `session.narration` 快照替换其令牌级 `chat` 增量和原始 `agent` 助理事件。每个快照包含`sessionKey`，可选`agentId`，`runId`和`text`：当前可见助手尾部最多16,384个字符。在尾部有界之前，隐藏的推理和内部上下文被删除。空的 `text` 撤回了之前的叙述。消费者可以从该文本中得出紧凑的一行，而无需重建令牌增量。

第一个文本更新可以立即到达。后续快照最多每连接每个会话每两秒到达一次，使用最新文本，而不会推迟待定的截止日期。终端聊天事件刷新终端事件之前的最后一个快照，包括最终文本更正或撤回；最后一次冲洗不受两秒间隔的限制。较新的工具活动或运行更改会丢弃挂起的较旧文本，因此延迟快照无法替换较新的工具行或将侧边栏切换回较旧的运行。生命周期、状态、工具、最终、中止和错误事件保留其现有交付。原始思维流和正在进行的序言或候选答案文本被省略；项目完成和答案选择仍然到达。审批事件仍需要`includeApprovals: true`和正常审批权限。取消订阅、模式更改、连接停用或运行停用时，排队的旁白将被丢弃，并且交付会重新检查当前访问。

网关客户端 SDK 在本地所有者之间共享匹配的会话地址。网关还结合了独立识别的观察者，这些观察者解析为相同的订阅密钥。如果任何业主要求全流，则交付保持全流；只有在最后一个完整所有者释放它之后，它才会返回叙述。共享前台订阅的旁白使用者还必须接受完整的流事件。 Control UI 在获取历史记录之前等待前台准入，因此快照涵盖启用完整流之前发出的活动。

捆绑的 Control UI 声明侧边栏兴趣的叙述意图。它的版本锁定到其网关并在升级时重新加载。共享 Apple 聊天客户端使用默认的完整模式进行前台会话； Android 和 TUI 保留了广泛的事件交付功能。现有的 SDK 呼叫者和省略 `mode` 的旧客户端保留完整的流。因此，免于构建许可的自定义 UI 根、开发 UI 和跨源 UI 可以保留完整的流叙述，直到更新。这是一个附加协议 v4 合约，没有功能协商或协议版本更改。

## <a id="common-event-families"></a> 常见事件族

- `socket.drain`：会话列表和匹配消息订阅者的会话重置（`reset`或`new`）或删除（`delete`）通知。有效负载包括 `sessionKey`、`reason`、`ts` 以及 `agentId` 和 `sessionId`（如果可用）。它遵循与其他会话事件相同的会话访问检查；具有 `session-scoped-events` 的客户端仅在其订阅的会话中收到它。这是尽力而为的缓存失效，而不是任务完成、WebSocket 传输消耗或持久交付收据。重新连接后协调状态。

- `chat`：UI 聊天更新，例如 `chat.inject` 和其他仅转录聊天事件。 `state: "delta"`负载携带`deltaText`中的附加。交付给运行接收者的第一个文本框架还包括完整的 `message` 快照，包括接收者在运行中附加或重新连接的时间。稍后附加帧省略 `message`。提供的快照是权威的，并且已经包含`deltaText`；不要将增量追加两次。无前缀替换设置 `replace=true` 并使用 `deltaText` 作为整个替换文本，包括一个空字符串以将其清除。需要新基线的替换以及画布或介质更改包括完整的快照。客户端在普通文本附加中保留非文本消息块。最终事件、中止事件和错误事件保留其现有的完整消息和有意消息省略语义。待处理的追加按顺序连接；工具和终端边界在结算前刷新待处理文本。失败的运行 （`state: "error"`） 可能包括 `errorDetail` 以及粗略的 `errorKind` 和人类可读的 `errorMessage`。该封闭对象有七个可选字段：`provider`、`model`、`failoverReason`、`providerRuntimeFailureKind`、`providerErrorType`、`httpStatus` 和 `providerErrorMessagePreview`。字符串的上限为 300 个字符； `httpStatus` 是一个从 100 到 599 的整数。详细信息来自失败尝试的经过清理的提供程序观察，而不是来自重新解析面向用户的消息。预览经过凭据编辑，并且可能比协议上限短。 `errorDetail` 中绝不会包含原始主体、原始预览和诊断哈希值。在没有提供者观察的情况下运行省略它；成功和取消的事件不包含它。这是一个附加协议 v4 字段。
- `agent`：助理文本事件使用 `data.delta` 进行追加。可选的 `data.text` 是该辅助项目的权威快照，并且已包含增量。第一个传递的文本事件、replacement/item 边界和媒体更新在需要时保留快照。荣耀 `data.replace`，包括空替换，并将辅助项目文本与显示投影的 `chat` 流分开。订阅一个用于显示的文本投影；将两个流消耗到一个累加器中会重复输出。进程内代理观察者保留其累积文本合同。仅从 `chat` 呈现辅助文本的客户端可以在其连接 `caps` 中宣传 `chat-only-assistant-text`。然后，网关会从该连接中省略带有 `stream: "assistant"` 的文本承载 `agent` 事件，包括前台和后台旁白订阅。其他代理流（工具、项目、使用情况、运行状态、生命周期、计划和批准）、无文本的助理事件以及 `chat` 流保持不变。过滤后的帧不消耗连接序列号。没有能力的客户保留这两个预测；与累积聊天文本分开显示当前项目代理文本的本机客户端不应对其进行广告。
- `session.message`、`session.operation`、`session.tool`：已订阅会话的聊天记录、进行中的会话操作以及事件流更新。
- `session.narration`：用​​于具有叙述意图的订阅的有界助理文本快照，如上所述的节奏和设置。
- `session.approval`：针对明确选择加入的精确会话订阅者，提供经过清理的待处理和终止审批事实。子审批使用持久化的祖先受众；事件不会修改聊天记录或唤醒代理。
- `session.observer`：安全实时会话标题和状态摘要。模型编写的序言可以立即更新标题；实用新型评估稍后会在可用时取代它。 Web、iOS 和 Android 使用相同的运行范围摘要。实用新型答复可以将 JSON 摘要包装在一个普通或 `json` Markdown 围栏中；周围的散文和无效的摘要字段将被拒绝。如果重复的无效回复使观察者无法运行，则警告会包含最后拒绝的回复的经过编辑的、空格折叠的前缀，上限为 160 个字符。可选的`sessionId`和不透明的`lifecycleRevision`标识会话生命周期； `lifecycleRevision` 在第一次复位之前可以不存在。在该生命周期内，修订会随着运行而增加，但可以在重置后重新启动。 `/clear` 保留 `sessionId` 并更改 `lifecycleRevision`。仅当摘要的确切 `runId` 出现在 `activeRunIds` 中时，客户端才会显示其标题或检查器链接。
- `sessions.changed`：会话索引或元数据已更改。键控更改在 `session` 中携带针对该连接呈现的受影响行。 `sessions.changed` 和 `session.message` 中的嵌套行使用与 `sessions.list` 相同的完整准备的元数据、查看者权限和时钟，并启用了标题、最后一条消息和活动摘要丰富功能。这会添加目录支持的字段（例如思考选项），并用事件行中的标准模型 ID 替换旧模型别名。 Control UI 将这些行本地应用于现有名册成员，因此它们的值与列表匹配。显式模型、帐户或运行时选择也可以使用 `catalogChanged: true` 标记事件。完整行可以包括 `sessionModelRevision`，它会随着保存的模型、帐户、运行时和生命周期输入而变化，与标题和活动无关。可见的 Control UI 窗格保留匹配的模型目录并立即刷新更改的选择。缺少修订和明确的 `catalogChanged` 提示仍然会使目录无效。会话事件保留代理的命令列表； `chat.metadata.changed` 使命令无效，除非 `commandsChanged: false`。仅使用和仅模型发布使命令可用，无需其他元数据 RPC。顶级生命周期和容量字段仍然是事件收据，包括显式清算值。当嵌套行省略可选字段时，尊重其顶级清除逻辑删除；嵌套值存在时优先。当查询的成员资格和分页窗口保持有效时，在本地合并现有名册成员的快照。 Control UI 重用生命周期和普通 `patch`、`participants`、`placement`、`send`、`steer`、`agent.run.started`、`agent.input.settled`、`run-capacity` 和`chat.title` 保留行的快照，其身份、存档、PIN、所有者和父事实未发生变化且新近度不降低。键控 `sessions.changed` 和 `session.message` 出版物还携带 `ancestorSessions`，即受影响的导航、控制、请求者和群祖先的完整行数组，并且可能携带 `ancestorSessionRefs` 表示已在该连接上传递的未更改的祖先演示。参考文献永远不会出现在 `ancestorSessions` 内。该投影将现有的父引用向上移动到根，删除重复的物理行标识，并停止循环。每个祖先都传递与 `sessions.list` 相同的每个观看者可见性过滤器和呈现；不可见的中间体不会阻止在其上方传递可见的祖先。这两个数组总共最多包含 64 个祖先。如果无法解析祖先或遍历超出该范围，则这两个字段都将被忽略，以便客户端保留权威刷新行为。 `ancestorSessions` 的存在证明了两个阵列的完整可见祖先覆盖；仅当 `ancestorSessionRefs` 也不存在或为空时，空数组才证明没有可见的祖先。这些是附加协议 v4 字段；它们不会更改订阅范围或列表成员资格，并且不需要能力协商。完整的祖先行带有不透明的 `ancestorRevision`；每个参考包含 `key`、`revision` 和 `snapshotAt`，其中 `sessionId` 和 `agentId` 出现在整行上。在添加修订标签之前，网关会比较所显示的具体连接特定行，仅排除 `snapshotAt`。参考证明 `revision` 标识的演示文稿保持不变。仅当客户端仍然持有具有匹配身份的确切承认的表示时，客户端才会保留引用的行，然后在不更改其他事实的情况下提前其时钟。仅在确认其事实与完整呈现的行匹配后，Control UI 才会将修订版绑定到不可变的承认行。列表替换或本地行更改会丢失该证明，即使其采样时钟恰好匹配。缺少行、生成或修订不匹配以及不确定的演示文稿所有权需要现有的权威刷新路径。网关绑定此每个连接记录，并在首次交付、成功列表读取、重新连接、重新订阅、reset/delete、更改表示或可见性、驱逐或不确定交付后发送完整行。退订、断开连接清除记录；会话删除会使记住的祖先无效。仅重述 （`reason: "activity-summary"`） 事件保留其祖先有效负载，但这些事件中的完整行会废弃相应的参考记录：共享名册可能会跳过重述准入。下一个普通事件再次提供完整的行；客户端已经持有的未更改的引用仍然可以重复使用。较旧的 Web 客户端会忽略附加引用字段。由于 `ancestorSessions` 仅包含完整行，因此它们无法将引用应用为部分行并擦除保留的字段。缺少祖先快照会导致其现有的权威 `sessions.list` 刷新。捆绑同源 Control UI 构建准入可防止版本偏差；自定义根、开发 UI 和跨源客户端可以使用这个正确但速度较慢的路径。本机 Apple 和 Android 客户端、TUI 和 SDK 不会协调祖先行并保留其现有行为。客户应用子级并将完整的祖先行放在一起，尊重每行的身份和时钟。在完整快照中，省略的可选行事实会清除以前保存的值，包括子链接、群摘要和后代运行标志。非空旧版顶级行字段不会填充完整的、查看者筛选的行中的遗漏。明确的清零收据和单独的生命周期收据仍然有效。现有的可选 title/preview 丰富和思考元数据保存规则仍然适用。 Control UI 合并了针对丢失行或快照、broad/keyless 更改、`catalogChanged`、无法从行事实建立成员资格的过滤器、不完整的祖先快照和不确定边界（包括提升到共享页面的所有者优先行）的权威刷新。与名册读取重叠的事件保留尾随刷新，因此其响应不会丢失更新。具有读取错误的保留列表也会在下一个相关事件时刷新。配置文件身份、运行程序可用性和加载的 cron 绑定可能会产生广泛的失效。仅活动摘要出版物更新选择加入的活动消费者；共享会话和代理名册不会重新获取那些仅重述的更改。保留行更新保留未过滤和仪表板过滤的窗口，无需重新获取；标题和预览丰富标志不会更改成员资格。健康的行流量在至少 60 秒后保留一次回退读取。仪表板分页属于共享名册窗口，它可以跨行更新保持加载的页面，并合并同一查询的同时读取。子窗口使用网关的所有权收据和完整的父子列表。可以跳过经过认证的排除祖先行；引用需要连接的共享来源所有者承认的当前行。当承认的新旧行事实证明贡献不变时，侧边栏所有者计数方面也会保留其总计。运行状态、所有权、共享、存档或不确定的过滤器更改仍然需要权威计数读取。准备好的行发布在突发期间在有界切片之间产生。同一会话生成的待处理活动摘要更新共享最新快照；生命周期、容量、记录、删除和清算收据仍然不同。每次产量后，发布都会重新检查行准备情况。接受的重述通知比触发它们的压缩或调度程序工作更长久。排队的会话更改通知在提交更改的请求完成或取消后仍然存在，因此连接的客户端仍然会收到该行。在关闭客户并处理其投影之前，关闭会停止新的通知并加入已承认的出版物。授权的隐身描述和事件使用来自瞬态进程本地状态的相同行表示。隐身行仍然从会话名册中排除，排队事件不能跨越重置或数据库替换。 Tool/progress 事件在行刷新时继续传递；在准备好之前，它们的可选行元数据可以不存在。在带键的 `sessions.changed` 和 `session.message` 快照上仍保证完整名册行。活动运行字段使用与 `sessions.list` 相同的聚合和完全精确语义； `activeRunIds: null` 将缓存的精确身份清除为不可用，遗漏会使缓存保持不变，并用数组替换它。来自 `sessions.delete` 的删除通知和隐身重置携带已删除一代的 `sessionId`，而没有当前行快照。客户不得删除具有不同 ID 的替代品。仅键删除事件或无行全局通知使保存的会话列表无效；它不会将当前一代标识为已删除。
- `presence`：系统在线状态快照更新。
- `tick`：周期性 keepalive/liveness 事件。
- `health`：网关健康状态快照更新。
- `heartbeat`：心跳事件流更新。
- `cron`：cron run/job 更改事件。
- `shutdown`：网关关闭通知。
- `node.pair.requested`／`node.pair.resolved`：节点配对生命周期。
- `node.invoke.request`：节点调用请求广播。
- `device.pair.requested` / `device.pair.resolved`：配对设备审批生命周期。
- `device.pair.setup.completed`：精确的设置代码切换完成，范围为`operator.pairing`。
- `device.pair.setup.deliveryUncertain`：重放安全设置代码退役，其凭证响应传送无法确认，范围为 `operator.pairing`。
- `voicewake.changed`：唤醒词触发配置已更改。
- `plugins.changed`：插件运行时发布已完成。负载为`{ generation }`；刷新 `plugins.list` 以协调安装状态和运行时状态。
- `config.changed`：配置写入已持久化（负载携带配置路径、新快照哈希和时间戳——从不携带配置内容）。按操作员读取范围限定；客户端通过 `config.get` 刷新。
- `skills.changed`：网关使其技能快照失效后，连接、技能目录、配置或资格发生更改。负载的`reason`为`watch`、`watch-unavailable`、`manual`、`remote-node`、`config-change`或`workshop`。被动磁盘更改在后台发现传递后发布（大约每分钟一次）；刷新后立即发布明确的技能更改。操作员读取范围；客户端通过`skills.status`刷新。
- `exec.approval.requested`／`exec.approval.resolved`：exec 审批生命周期。
- `plugin.approval.requested`／`plugin.approval.resolved`：plugin 审批生命周期。

## <a id="node-helper-methods"></a> Node 帮助方法

节点可以调用 `skills.bins`，以获取当前技能可执行文件列表，用于自动允许检查。

## <a id="node-exec-lifecycle-events"></a> Node 执行生命周期事件

节点通过节点角色 `node.event` RPC 和 `event: "exec.started"`、`"exec.finished"` 或 `"exec.denied"` 报告 `system.run` 生命周期。这些不是运营商 `exec.approval.*` 广播，也不使用已退役的 TCP 桥。

RPC 接受 `payloadJSON` 中的 JSON 字符串或 `payload` 中的对象。当两者都提供时，字符串 `payloadJSON` 优先。例如：

```json
{
  "event": "exec.finished",
  "payload": {
    "sessionKey": "agent:main:main",
    "runId": "<exec-run-id>",
    "host": "node",
    "exitCode": 0,
    "timedOut": false,
    "success": true,
    "output": "done"
  }
}
```

目前的无头节点包括`sessionKey`、`runId`和`host: "node"`。附加字段有：

| 字段                  | 含义                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `command`              | 原始或格式化的命令文本。                               |
| `exitCode`, `timedOut` | 处理完成代码和超时标志。                    |
| `success`              | 生产者结果标志，而不是通知门控谓词。 |
| `output`               | 有界组合的标准输出、标准错误和错误文本。             |
| `reason`               | 拒绝原因为 `exec.denied`。                             |
| `suppressNotifyOnExit` | 抑制此调用的系统通知。              |

回显`system.run`转发的相关字段； ID 和有效负载的 `host` 字段均不授予权限。网关匹配经过身份验证的节点和连接，运行 ID 以及调用绑定时的会话密钥。不匹配的事件返回 `handled: false` 和 `reason: "unmatched_exec_event"`，并且不产生系统通知。狭窄的遗留 macOS-client 路径可能仅将丢失或不匹配的运行 ID 与该 connection/session 上的一次明确调用相匹配；新客户必须发送发出的运行ID。

`exec.started`保留授权记录； `exec.finished` 和 `exec.denied` 在通知过滤之前消耗它。 `tools.exec.notifyOnExit: false` 或 `suppressNotifyOnExit: true` 抑制通知。被拒绝的事件永远不会将系统事件或唤醒代理工作排入队列。完成事件仅通知超时、非零或未知退出代码或非空压缩输出；成功退出 0 且没有输出保持安静。运行 ID 的已完成通知将通过解析的会话进行重复数据删除并运行 ID。仅在系统事件排队后才请求心跳唤醒。

Node 事件交付是尽力而为的，而不是持久的完成分类账。
