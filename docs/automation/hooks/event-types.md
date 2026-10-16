---
summary: "每个内部事件键、其触发和等待行为以及每个生产者提供的上下文"
read_when:
  - "您正在选择处理程序应订阅哪个事件键"
  - "您需要特定事件的触​​发和等待行为"
  - "您需要生产者向您的处理程序提供上下文字段"
title: "挂钩事件类型和上下文"
---

每个内部事件键、其触发和等待行为以及每个生产者提供的上下文。 [Hooks](/automation/hooks) 指南的一部分。

## <a id="event-types"></a> 事件类型

订阅下面的确切密钥或裸系列（`command`、`session`、`agent`、`gateway`、`message`）。家庭订阅接收该家庭中的所有操作。不要将同一个处理程序同时订阅到 `command` 和 `command:new`，除非您希望为新命令调用它两次。 `session:compact` 不是家族或通配符；订阅两个精确的压缩键。

| 事件                    | 触发和等待行为                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `command:new`            | 授权的新会话命令处理，或发出新命令挂钩的网关会话操作；等待着。            |
| `command:reset`          | 授权重置命令处理或网关会话重置；等待着。                                                      |
| `command:stop`           | 中止请求后停止命令处理；等待，没有钩子回复交付。                                      |
| `session:auto-reset`     | 由于 daily/idle 政策，现有会话被替换；独立于后继轮次进行调度。                       |
| `session:compact:before` | 压实作业前；等待着。                                                                                          |
| `session:compact:after`  | 压实成功后；等待着。                                                                                     |
| `session:patch`          | 应用了授权的网关补丁，或者支持的模型选择路径持续发生变化；异步通知。 |
| `agent:bootstrap`        | 上下文注入之前工作空间引导解析；等待着。                                                         |
| `gateway:startup`        | 安排在钩子加载和sidecar/channel启动工作之后；不延迟初始网关绑定。                       |
| `gateway:shutdown`       | channel/plugin 拆解之前开始关机；有界等待。                                                            |
| `gateway:pre-restart`    | 关机具有有限的预期重启延迟；有界等待。                                                               |
| `message:received`       | 使用会话密钥接受入站调度；异步观察。                                                   |
| `message:transcribed`    | 预代理预处理具有非空音频转录文本和会话密钥；异步观察。                   |
| `message:preprocessed`   | Media/link 预处理已完成或已跳过，带有会话密钥；异步观察。                          |
| `message:sent`           | 交付所有者使用会话密钥报告发送结果；异步观察。检查 `context.success`。          |

对 `gateway:shutdown` 和 `gateway:pre-restart` 挂钩的初始等待是有限的，因此可以继续进行独立拆卸。超时不会取消处理程序。在关闭共享状态之前，Gateway加入实际的hook完成；因此，永远不会解决的处理程序可能会阻止进程内关闭完成。

并非每个传入传输更新或尝试的低级发送都会产生内部消息事件。 Suppressed/duplicate 入站调度和没有会话密钥的路径可以省略它们。这些是观察点，而不是完整的传输审核或阻止消息处理的方法。快速本机命令路径可以跳过预处理事件。 `preprocessed` 表示该阶段已通过，而不是每个附件或链接都已成功理解。同样，压缩可以在其之前的事件之后跳过或失败，并且重试可以再次在之前发出。

诸如 `command:nwe` 之类的未知订阅仍会注册，但加载程序会发出警告并 `hooks info` 会报告它们。核心不会发射它们。自定义键仅在自定义代码显式发出时才会触发；在元数据中声明它不会创建触发器。

`command:stop` 观察取消命令处理。它不是一个自然的代理最终确定门。对于该合约，请参阅 [Plugin hooks](/plugins/hooks) 中的 `before_agent_finalize`。

### <a id="event-context-highlights"></a> 事件上下文要点

下面的字段描述了生产者有效负载。标记为可选的值可能不存在；不要假设一个事件中的字段存在于另一事件中。

**`command:new` 和 `command:reset`：** `agentId`、`sessionEntry`、`previousSessionEntry`、`commandSource`、`senderId`、聊天命令路径上的 `workspaceDir`、`storePath` 和 `cfg`。条目和路由元数据取决于调用者。网关复位使用`commandSource: "gateway:sessions.reset"`；网关代理重置使用`gateway:agent`，会话创建可以使用`webchat`。网关调用者省略 `senderId`。仅当使用 `emitCommandHooks` 为现有父级请求时，会话创建才会发出新命令挂钩。对于被替换的会话，首选 `previousSessionEntry`：聊天和网关路径在重置时的不同点发出，因此这不是通用的预重置或成功重置收据。 `sessionFile` 值可以是转录标识符而不是可读文件路径；不要假设它在磁盘上是 JSONL。

**`command:stop`：** 可选 `sessionEntry`、`sessionId`、`commandSource` 和 `senderId`。它不携带完整的 new/reset 上下文。

**`session:auto-reset`：** `cfg`、`agentId`、`workspaceDir`、`storePath`、`sessionEntry` 标识结束的 `sessionId` 和可选`sessionFile`、`reason`（`daily` 或 `idle`）以及可选的 `transcriptArchived`、`nextSessionId` 和 `nextSessionKey`。

**`agent:bootstrap`：** `workspaceDir`、可变 `bootstrapFiles` 和可选 `cfg`、`sessionKey`、`sessionId`、`agentId`。每个引导记录都有 `name`、`path`、`missing` 和可选的 `content`。处理程序可以替换或扩展阵列，但最终路径重复数据删除、session/privacy 过滤和上下文预算仍然适用。

**`session:patch`：**克隆后操作`sessionEntry`、请求形状的`patch`和`cfg`。该补丁包含 target/expectation 字段和提交的设置，而不是计算的更改字段差异。即使提交的值已经存在，成功的网关补丁也会发出。还发出支持的模型选择路径，包括 `/model`、模型选择器以及通过 `session_status` 进行的模型更改；只读状态查询则不然。这不是每个会话存储写入的通知。

**压实：**两相包括`sessionId`、`missingSessionKey`、`messageCount`和可选的`tokenCount`。之前还包括`messageCountOriginal`和可选的`tokenCountOriginal`。之后包括 `compactedCount` 和可选的 `summaryLength`、`tokensBefore`、`tokensAfter` 和 `firstKeptEntryId`。不要将不可用的令牌计数推断为零。

**`gateway:startup`：** `cfg`、`deps` 和 `workspaceDir`。 **关机和预重启：** `reason` 和 `restartExpectedMs`（当关机时预计不会重启时为空）。关机等待默认为5秒；预重启添加了单独的 10 秒预算。这些限制了调用者的等待，而不是处理程序的工作：超时不会取消承诺。通道尚未被拆除，但排队的代理工作和消息传递都不能保证在关闭之前完成。类型为 `session_end` 的排水行为属于 [Plugin hooks](/plugins/hooks)。

#### <a id="message-context"></a> 消息上下文

`message:received` 包含 `from`、`content`、`channelId` 以及可选的 `timestamp`、`accountId`、`conversationId`、`messageId`、`media`、 `originalMedia`、`mediaStagingPending` 和 `metadata`。内容更喜欢非空白命令正文，然后是原始正文，然后是通用正文。不选择`BodyForAgent`；后备主体是表面定义的，而不是由映射器剥夺所有丰富内容。

收到的`metadata`可以包含`to`、`provider`、`surface`、`threadId`、`senderId`、`senderName`、`senderUsername`、`senderE164`、 `guildId`、`channelName` 和 `topicName`。旧附件别名为 `mediaPath`、`mediaUrl`、`mediaType`、`mediaPaths`、`mediaUrls` 和 `mediaTypes`；远程分段元数据还可以包括 `mediaRemoteHost`、`mediaStagingPending` 以及相应的 `originalMediaPath`、`originalMediaUrl`、`originalMediaType`、`originalMediaPaths`、`originalMediaUrls` 和 `originalMediaTypes`。更喜欢结构化媒体阵列。

`message:transcribed`和`message:preprocessed`包含`channelId`、`cfg`和可选的`from`、`to`、`body`、`bodyForAgent`、`timestamp`、 `conversationId`、`messageId`、`senderId`、`senderName`、`senderUsername`、`provider`、`surface` 和结构化媒体字段。转录添加所需的 `transcript` 文本；预处理添加了可选的 `transcript`、`isGroup` 和 `groupId`。 `bodyForAgent`为本剂制备的富集体。 `mediaPath` 和 `mediaType` 仍然是已弃用的第一个附件别名。这些上下文不承诺 `accountId` 或接收事件的 `metadata` 对象。

每个结构化媒体事实可以包含 `path`、`url`、`contentType`、`kind`、`transcribed`、`messageId` 和 `workspaceDir`。事实保留源顺序。当`mediaStagingPending`为真时，`media`被保留，`originalMedia`描述原始附件；不要将远程路径视为本地文件。

`message:sent` 包含 `to`、`content`、`success`、`channelId`，以及可选的 `error`、`accountId`、`conversationId`、`messageId`、 `isGroup` 和 `groupId`。 `success: false` 报告发出结果的路径失败；事件的缺席并不能证明成功或失败。出站交付可以针对每个逻辑负载而不是每个文本块报告一个结果，并且部分失败可能包括针对已发送部分的消息 ID。持久的出站队列结算可以推迟观察；它不会使钩子耐用。不要盲目地在失败时重新发送：您可以复制已发送的部分。发送结果并不能证明收件人已阅读消息。
