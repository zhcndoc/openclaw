---
summary: "通过网关 WebSocket 本机和 Control UI WebChat 使用"
read_when:
  - "调试或配置 WebChat 访问"
  - "了解人类提及传递和重试行为"
title: "WebChat"
---

状态：macOS/iOS 的 SwiftUI 聊天 UI 直接连接到 Gateway WebSocket。不使用内嵌浏览器，也不使用本地静态服务器。

## <a id="what-it-is"></a> 它是什么

- A 用于网关的本机聊天 UI。
- 使用与其他渠道相同的会话和路由规则。
- 回复始终返回到 WebChat。
- 历史记录始终从网关获取（不进行本地文件监听）。如果网关无法访问，WebChat 将为只读。

## <a id="quick-start"></a> 快速开始

1. 启动网关。
2. 打开 WebChat UI（macOS/iOS 应用）或 Control UI 的聊天选项卡。
3. 配置有效的网关身份验证路径（默认情况下共享秘密，即使在环回时也是如此）。请参阅 [Auth 基础知识（本地与远程）](/web/dashboard#auth-basics-local-vs-remote)。

## <a id="how-it-works"></a> 工作原理

- UI 连接到 Gateway WebSocket，并使用 `chat.history`、`chat.send`、`chat.inject` 和 `chat.message.get` RPC 方法。
- Control UI 通过 `chat.startup` 打开一个小型近期历史页面的聊天。短聊天链接在同一请求中解析其会话。短引用启动还会在读取历史记录之前订阅与授权会话事件的连接，因此不会错过在聊天窗格安装之前到达的更新。向上滚动以加载较旧的消息。恢复的主页窗格会等待所选聊天完成加载，而显式打开主页会立即加载它。
- `chat.history` 的稳定性受到限制：网关可能会截断长文本字段，省略大量元数据，并用 `[chat.history omitted: message too large]` 替换过大的条目。历史页面会跳过隐藏的和仅限工具的记录条目，同时从现有索引记录填充请求的可见消息窗口。字节满窗口可以在请求的消息计数之前完成，并通过分页提供较旧的内容。 API 客户端可以发送每个请求 `maxChars` 来覆盖一次调用的默认限制。
- Paginated `chat.history` 和 `chat.startup` 请求接受 `maxBytes` 页面目标，默认为 512 KiB，消息及其活动的硬上限为 6 MiB。 Control UI 在 256 个 KiB 内请求最多 80 条消息作为初始尾部，然后在 1 MiB 内请求最多 1,000 条旧消息，并跟随 `nextOffset` 继续。从超出页面预算的一个记录行投影的消息和不可分割的组使用可获取的引用，而不是超出预算。锚定 `messageId` 读取保留相同的默认页面预算。绑定 Claude CLI 转录本使用相同的页面预算和向后滚动分页，包括仅存在于本机转录本中的消息。
- 如果历史记录在页面读取期间发生变化，则网关会从当前历史记录中返回一致的页面。 `windowReset: true` 响应包含替换尾部；客户端替换其加载的历史记录并继续其 `deltaCursor` 和分页字段。过时的增量游标返回 `{ kind: "reset" }`，提示新的尾部请求。在返回可重试的重建错误之前，读取竞速投影重建会短暂等待。
- 当 `chat.history` 中可见的辅助消息被截断时，Control UI 自动通过 `chat.message.get` 获取完整的显示标准化条目。该提取不会增加默认历史记录有效负载。加载时预览仍然可见。恢复的内容会内联替换它。 `chat.message.get` 使用与 `chat.history` 相同的转录分支和显示规则。与 `chat.history` 不同，它的目标是 `messageId` 的一项条目。当无法再返回完整内容时，它会返回诚实的不可用原因。
- `chat.history` 会遵循仅追加会话文件的活动转录分支，因此已放弃的重写分支和已被替代的提示副本不会在 WebChat 中呈现。
- Compaction 条目呈现为历史分隔符，显示令牌测量可用时的上下文缩减。普通对话历史记录和 Fork 仍然可用；压缩不会创建单独的检查点浏览或恢复表面。
- Control UI 会记住 `chat.history` 返回的支持网关 `sessionId`。它在后续 `chat.send` 调用中包含该 ID。因此，重新连接和页面刷新会继续相同的存储对话，除非用户启动或重置会话。
- 重新启动恢复的 WebChat 回合保留其当前对话作为消息工具的回复目标，包括 CLI/RPC 操作员客户端通过 `sessions.send` 或 `chat.send` 启动的回合。没有明确目标的进度发送继续出现在该会话中。对于没有外部传递上下文的内部恢复，外部通道会话密钥不会授权发送到该通道。
- Foreground 发送还包括渲染历史记录中显示的分支的叶子，如 `expectedLeafEntryId`。如果另一个客户端首先切换分支，Control UI 会保留消息以供审阅并刷新记录，而不是将其发布到新分支。在协调当前历史记录后，重新连接和恢复发件箱重播有意忽略此前提条件。
- 当您更改聊天设置并立即发送时，Control UI 会显示 **Apply chat settings**，直到更改及其会话刷新完成。稍后的后台会话刷新不会延长此等待时间。打开窗格而不更改设置不会造成设置等待。
- `chat.send` 采用防止重复请求的密钥（Control UI 使用运行 ID）。网关会删除重复使用相同密钥的重复请求。当会话、消息、附件和提及选择匹配时，重试或重复的正在进行的提交不会创建第二次运行。拒绝将该密钥与不同的提及选择重复使用。
- 即使在不同的运行 ID 下开始执行，Queued 消息也会保留其原始发送标识。客户端通过该发送身份将本地待处理消息与其保存的记录条目进行协调，因此完成和历史记录重新加载会显示一份副本。
- 在重新连接期间，传送不确定的尝试消息将保留在记录中，状态为 **Waiting for reconnect**。尚未尝试的消息保留在编写器队列中。网关已排队等待稍后轮次的消息也会显示在编辑器上方，直到被消耗或取消，而不会出现重复的文字记录气泡或另一次发送。他们的删除操作会取消网关上确切的排队消息。一旦确认删除，该提示及其附件就会从队列和对话中消失，包括在重新连接或重新加载之后。停止、超时和发送失败的取消会使其恢复消息保持可见。重新排序仅适用于仍属于浏览器的消息。 **Discard** 对不确定的本地消息仅删除其浏览器副本；它不会取消网关已收到的消息。
- 回复特定消息（右键单击 → 回复）会在 `chat.send` 上发送目标的脚本 ID 作为 `replyToId`。对于具有可见文本的源，网关会从会话历史记录中解析该消息。它与 Discord 回复使用相同的通道无关回复上下文元数据。代理会看到 `has_reply_context` 以及不受信任的“当前用户消息的回复目标”块以及发件人标签和正文。根据直接网络聊天会话的现有字节稳定提示策略，网络聊天提示会抑制易变的对话 ID，例如 `reply_to_id`。没有持久记录 ID 的回复目标（例如待处理的发送）将回退到消息正文中的内联引用。
- H历史页面包括有界的引用回复预览，因此显示引用不会单独获取每个原始内容。 `chat.message.get` 读取选定的索引行，仅在需要隐藏旧公告对时才使用前行上下文。显式的完整消息读取会在同一会话生命周期内的重新连接期间进行缓存；重置或更换会使它们失效。
- 仅附件消息保留其回复操作。预览使用文件名或图像标签，`replyToId` 仍指向原始条目。回复不会将源文件附加到新邮件中。
- 工作区启动文件和挂起的 `BOOTSTRAP.md` 指令通过代理系统提示符的 `# Project Context` 部分提供，而不是复制到 WebChat 用户消息中。如果引导程序内容被截断，系统提示符会收到一个简短的“引导程序上下文通知”。详细的计数和配置旋钮保留在诊断表面上。
- `chat.history` 上的 Gateway 显示标准化会去除仅运行时的 OpenClaw 上下文、入站信封包装器、内联传递指令标签（例如 `[[reply_to_current]]`、`[[reply_to:<id>]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 有效负载（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`，包括截断的块），以及泄露的ASCII/full-width模型控制代币。删除模型控制标记会保留标点符号和 Markdown 格式，保持相邻单词分离，并保持代码示例完整。存储的助手可见性首先尊重显示、相位和最终源事实，然后省略修剪为大写 `NO_REPLY` 的原始助手文本；小写和换行形式仍然可见。用户文本永远不会被归类为静音。客户端呈现准备好的历史记录和实时输出，而无需解释沉默标记。
- 当无法读取或准备回复附件时，WebChat 会保留所有可交付的附件。它会显示一则简短的故障警告，但不会暴露本地文件系统路径。
- 在 Control UI 聊天和新会话编辑器中，超大静态 PNG 上传在发送之前会在浏览器工作线程中调整大小，从而使图像解码和编码远离编辑器的主线程。这适用于拖放、文件选择器和图像粘贴。已在网关广告限制内的图像保持不变；调整大小的图像保持其纵横比和 PNG 透明度。浏览器调整大小仅限于 25 兆像素的源数据。动画 PNG 不会被展平，其他文件类型保留其大小限制。如果图像无法解码或调整大小，则其附件将显示读取失败，而不是发送过大的字节。
- Control UI 附件失败在编辑器旁边仍然可见，直到被删除，包括在读取之前被拒绝的文件。上传照片和管理图像预览的上限为 512 KiB；打开或下载图像以加载原始图像。失败的同源 HTTPS 预览永远不会回退到通过 WebSocket 传输完整图像。通过显式的原始图像操作，动画或不受支持的预览格式仍然可用，而不是默默地扁平化。
- 在 Control UI 中，助理图像和附件按消息顺序显示在其周围段落之间。 Before/after 标签位于相应图像旁边。
- 在准备文件时，当前 WebChat 回复拥有的附件指令将隐藏在实时转录事件中。用户提示、隔离示例以及回复附件管道之外的引用保持不变。
- WebChat 从助理内容、转录重播文本和音频内容块中排除带有推理标记的回复负载 （`isReasoning: true`）。因此，仅思考的有效负载不会以可见的辅助消息或可播放的音频的形式出现。
- `chat.inject` 将助理注释直接附加到记录中并将其广播到 UI（无代理运行）。当会话密钥共享转录本时，例如 cron 基本密钥及其独立的运行密钥，注释将附加在转录本所有者的下方。 Control UI 通过转录标识来协调每个注释，因此相同的注释保持独立，并且在历史记录重新加载后不会成为运行活动或重复。
- 中止的运行可能会让部分助手输出继续显示在 UI 中。当存在缓冲输出时，Gateway 会将该部分文本持久化到转录历史中，并为该条目标记中止元数据。

### <a id="transcript-and-delivery-model"></a> 转写与投递模型

录取和成绩单保存是分开的。当批准的输入在持久的待输入保管中等待时（包括在工作区准备期间），可以到达 `chat.send`、`sessions.send` 或初始 `sessions.create` 确认。确认后，在确认运行的取消和错误处理以及工作区和回复启动的情况下，运行技能库选择和创作准备。准备失败显示为运行错误。网关在确认之前保留现有的回复准入票证，因此稍后的发送不能超过仍在等待准备的消息。可选的 `messageSeq` 仅来自已提交的成绩单收据。客户端不得根据历史长度来预测它或将 `status: "started"` 视为持久性。聊天准入会重新检查当前提交的会话访问，与侧边栏刷新无关。持久输入保管仍然检查写入边界的权限。 Control UI 将其临时源替换为接受的保管，然后替换为保存的转录本行。接受的输入保留在保存的对话历史记录下方，直到它们被提交到记录中。在此切换期间，其渲染器在同一图像元素中保留加载的本地预览，同时保存媒体元数据和图像字节加载。权威文本、媒体替换和删除仍然获胜。不可用或访问被拒绝的媒体显示了明显的原因。一旦托管、消费记录或提交的用户消息收据退出本地源，重播的终端事件就无法将其恢复，即使其行在以后的历史记录页面中不存在。提交身份与执行运行保持分离，因此两个故意相同的发送仍然是两个输入。

WebChat 有两条独立的数据路径：

- SQLite 转录本行是持久的 model/runtime 转录本。对于正常代理运行，嵌入式 OpenClaw 运行时通过会话访问器保留模型可见的 `user`、`assistant` 和 `toolResult` 消息。 WebChat 不会将任意传递、状态或帮助文本写入该记录中。
- Gateway `ReplyPayload` 事件是实时交付投影：针对 WebChat/channel 显示、块流、指令标签、媒体嵌入、TTS/audio 标志和 UI 回退行为进行标准化。它们本身并不是保存的会话日志。
- 需要通过 `tools.message` 进行可见回复的harness仍使用 WebChat 作为当前运行的内部源回复接收器。来自活动 WebChat 运行的无目标 `message.send` 被投影到同一聊天中并镜像到会话记录中。 WebChat 不会成为可重用的出站通道，并且永远不会继承 `lastChannel`。
- 仅当网关在正常嵌入式代理轮次之外拥有显示的消息时，WebChat 才会注入辅助转录条目。这些情况是 `chat.inject`、非代理命令回复、中止的部分输出和 WebChat- 托管媒体转录补充。
- 如果实时助手文本在跑步过程中出现，但在历史记录重新加载后消失，请按顺序检查三件事。首先，SQLite 记录中是否包含辅助文本。二、`chat.history`显示投影是否剥落。第三，Control UI 乐观尾部合并是否用持久快照替换了本地交付状态。

正常的 agent 运行最终答案应该是持久化的，因为嵌入式运行时会写入助手 `message_end`。任何将已投递的最终载荷回镜到转写中的回退逻辑，都必须先避免重复写入嵌入式运行时已经写过的助手回合。

## <a id="speech"></a> 演讲

什么时候`tts`已配置，助理消息提供**大声朗读**。音频由网关使用配置的合成TTS提供商、语音和端点。**停止阅读**取消浏览器播放。长回复按顺序按块播放`tts.maxTextLength`。开始另一个朗读或讲话操作会停止之前的播放。该控件不使用浏览器语音合成。前者`messages.tts`配置迁移到`tts`由医生。

按住麦克风按钮进行听写。显式音频模型`tools.media.models`使用与上传的语音笔记相同的转录所有者，包括本地OpenAI-兼容的`/v1/audio/transcriptions`端点和本地CLI模型。捕获结束时转录音频；基于文件的提供程序不会生成部分字幕。显式 Talk 转录提供者，匹配`agents.defaults.voiceModel`，或语音呼叫流配置保留流路径。当没有配置的文件提供程序或CLI命令可以运行。环回和专用网络端点使用现有的提供商选择加入：`models.providers.<id>.request.allowPrivateNetwork: true`。

Set `talk.realtime.mode: "stt-tts"` for split browser Talk： the Gateway transcribes each utterance， the current chat session's agent answers it， and the browser plays the Gateway's generated speech.这使用配置的代理模型，包括本地模型。 Output uses `talk.provider` when set， otherwise `tts`.浏览器在生成和播放答案时暂停捕获。停止结束捕获和回放并取消该呼叫的活动聊天运行。对话失败（包括两分钟的应答超时）会结束捕获和回放，但会留下已接受的聊天运行以在对话中完成。超时消息告诉您在聊天中寻找答案。离开聊天或退出 Talk 也会使已接受的工作继续运行。 Split Talk 需要配置转录和语音输出。现有对话中的听写使用该对话的代理凭据；该目录仍然是已配置的 Talk 代理的咨询视图。

如果没有这些设置，现有的实时 Talk 和转录提供商选择将保持不变。浏览器麦克风捕获需要安全上下文（HTTPS 或本地主机）和麦克风权限。

## <a id="human-mention-delivery"></a> 人工提货

Control UI将每个[选定的人](/concepts/multi-user#mentioning-people)绑定到提交的消息文本。 `chat.send`、`sessions.create` 上的初始消息和 `sessions.send` 接受可选的 `mentions` 数组 `{ profileId, start, end }` 注释。最多有十个注释。 `start` 是包容性的，`end` 是排除性的，以 UTF-16 代码单位测量。网关在接受输入之前验证其文本范围和收件人。纯 `@name` 文本和代理输出不会创建人工提及。复制或引用文本不会复制其收件人选择。

仅当原始人工消息新提交到文字记录后，该提及才符合收件箱条目和可选浏览器推送的资格。一个早期的`status: "started"`确认、分阶段的初始消息或持久的待输入保管都不是提交。因此，排队的或远程放置的第一条消息在仍在等待记录时不会发出通知。后来的代理失败并不会撤消其人工消息已提交的提及。

传输重试保留准确的提交文本， mention annotations， and original send identity， even when execution gets a different run id.重播提交的输入不会创建另一个提及或恢复已驳回的条目。有意的新发送具有新的标识，并且可以再次通知，即使其文本相同。转录本加载、隐藏延续和附件丰富并不是新的人类发送。

支持的 RPC 需要 `operator.read` 并使用经过身份验证的配置文件，而不是调用者选择的收件箱所有者：

| 方法或事件     | 契约                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users.mentionable` | 使用 `{ sessionKey, agentId?, query? }` 进行搜索，或在创建会话之前使用 `{ agentId, visibility?, query? }`。返回有界 `{ users, truncated }` 结果，其中包含配置文件 ID、显示名称、可选头像 URL 和在线状态。 |
| `mentions.list`     | 使用 `{}` 调用以获取当前的 `{ gatewayInstanceId, revision, items }` 快照。                                                                                                                                                    |
| `mentions.dismiss`  | 传递包含最多 100 个不同可见条目 ID 的 `{ ids }`。解除后返回相同的快照形状。                                                                                                                           |
| `mentions.changed`  | 定向 `{ gatewayInstanceId, revision }` 失效。再次获取`mentions.list`。修订描述了该连接的授权视图，而不是全局网关活动。                                                                   |

交付是尽力而为。收件箱和重播簿记在网关重新启动后仍可在其保留限制内保存。容量限制仍然可以跳过警报。重新启动或重新连接不会重新发送旧的浏览器通知或恢复已关闭的条目。通知失败不会重试或撤消已发布的聊天消息。浏览器推送不提供一次性传送。请参阅 [ 收件箱保留 ](/concepts/multi-user#temporary-mentions-inbox) 和 [ 通知首选项 ](/web/notifications#receive-human-mention-alerts)。

忽略未知或已忽略的条目是无害的，并且会返回当前收件箱快照。如果收件箱请求返回`UNAVAILABLE`错误，则Control UI以增加的延迟进行重试，并遵守网关的最小重试延迟。普通的连接更新和提及事件不会绕过该退避。

后台收件箱刷新失败一分钟后重试，延迟加倍，最多十五分钟，直到刷新成功。会话和配置文件更新尊重待处理的后台重试；显式收件箱读取仍可以立即重试。这`gateway/mentions`警告记录失败阶段、来源、错误类别和代码、原因、经过的时间和下次重试延迟。

## <a id="control-ui-agents-tools-panel"></a> Control UI 代理工具面板

- Control UI `/agents` 工具面板具有由 `tools.effective(sessionKey=...)` 支持的“工具预览”。它使用会话的已保存设置预览核心、插件、频道拥有的和已发现的 MCP 服务器工具。它不报告活动运行的确切工具。
- 另有一个用于编辑配置的视图（由 `tools.catalog` 支持），涵盖配置档案、按代理的覆盖，以及目录语义。
- 预览是会话范围的。在同一代理上切换会话可以更改它，重置会话会刷新它。未保存的配置编辑不会反映在预览中，并且保存或运行时更改可能需要一段时间才会显示。当运行开始时，特定于运行的工具就可以使用；预览中缺少的工具不一定被禁用。运行仍应用其当前策略、凭据和执行检查。
- 当自上次发现以来配置的 MCP 服务器尚未连接或更改时，面板会显示一条通知。它不会从读取路径静默启动 MCP 传输。加载和预览失败并不意味着会话的工具为零。
- 配置编辑器并不意味着运行时可用性。有效访问仍然遵循策略优先级（`allow`/`deny`、每个代理和 provider/channel 覆盖）。

## <a id="remote-use"></a> 远程使用

- 远程模式通过 SSH/Tailscale. 为网关 WebSocket 建立隧道
- 你不需要运行单独的 WebChat 服务器。

## <a id="configuration-reference-(webchat)"></a><a id="configuration-reference-webchat"></a> 配置参考（WebChat）

完整配置：[配置](/gateway/configuration)

WebChat没有持久化的配置部分。网关使用内置`chat.history`显示限制。API客户可以根据请求发送`maxChars`为单个调用覆盖它。可以扩展工具输出的客户`chat.message.get`也可以发送`toolResultMaxChars`请求更短的工具结果文本预览，而不减少用户或助理文本。完全的JSON符合现有显示限制的对象和数组保留该限制，因为客户端将它们用于源卡和嵌入视图。此可选限制适用于`chat.history`和`chat.startup`，包括历史页面和增量追赶；省略它以保留默认行为。在每个页面请求上重复此操作。遗产`channels.webchat`和`gateway.webchat`配置已退役。跑步`openclaw doctor --fix`将其删除。

相关全局选项：

- `gateway.port`, `gateway.bind`: WebSocket host/port.
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`： 共享密钥 WebSocket 认证。
- `gateway.auth.allowTailscale`： 浏览器Control UI聊天选项卡可以使用Tailscale启用后提供身份标头。
- `gateway.auth.mode: "trusted-proxy"`：身份识别背后的浏览器客户端的反向代理身份验证**非环回**代理源（参见[可信代理Auth](/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`：远程网关目标。
- `session.*`：会话路由和存储。

## <a id="related"></a> 相关内容

- [控制 UI](/web/control-ui)
- [仪表盘](/web/dashboard)
