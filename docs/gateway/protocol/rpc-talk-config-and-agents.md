---
summary: "用于 Talk 和 TTS、机密和配置、更新、向导和代理工作区的网关 RPC 系列"
read_when:
  - "Driving Talk、TTS 或通过网关的实时语音"
  - "读取或写入机密、配置或更新状态"
  - "调用代理和工作区帮助器方法"
title: "网关协议对话、配置和代理方法"
sidebarTitle: "对话、配置和代理"
doc-schema-version: 1
---

用于 Talk 和 TTS 的 RPC 方法系列、机密、配置、更新和向导流程以及代理和工作区帮助程序。

## <a id="talk-and-tts"></a> Talk 和 TTS

- `talk.catalog` 返回语音、流式转录和实时语音的只读 Talk 提供程序目录：标准提供程序 ID、注册表别名、标签、配置状态、可选的组级 `ready` 结果、公开的 model/voice id、标准模式、传输、大脑策略和实时 audio/capability 标志，而不返回提供程序秘密或改变全局配置。可选的 `sessionKey` 使用现有的会话可见性检查并选择该会话的代理进行转录和实时准备；未知或无法访问的会话将被拒绝。如果没有它，目录将保留配置的 Talk 代理。语音准备使用共享语音配置，匹配 `talk.speak` 和 `tts.speak`。聊天客户端传递他们当前的会话密钥；谈话设置省略它。当前网关在应用运行时提供程序选择后设置为 `ready`；在旧网关上将其不存在视为未经验证。目录读取提供最后一个成功的快照，同时后台刷新检查提供程序的准备情况。配置、插件、凭证和秘密修改触发刷新；未更改的目录会在 30 秒后按需刷新。准备情况是建议性的：会话创建会验证当前的凭据和策略。在第一个快照准备好之前，RPC返回可重试的`UNAVAILABLE`和`details.reason: "talk-catalog-warming"`和`retryAfterMs`；客户端应在有限的启动窗口内重试。 Control UI 重试最多十秒。在第一个快照上，提供程序就绪失败仅标记该提供程序未配置，从而保留健康的提供程序。第一个快照可以在刷新完成后五秒后发布；在此之前，陌生来电者会继续收到热情的回应。一旦快照存在，失败或超过五秒的刷新将保留以前的快照。无法取消的提供商挂钩将保留其单次航班时段，直到解决为止。慢速刷新日志可识别没有提供程序有效负载的已完成和等待阶段。
- `talk.config` 从网关应用的运行时和匹配的源快照返回有效的 Talk 配置负载；仅在成功重新加载配置后才会显示待处理或拒绝的文件编辑。 `includeSecrets` 需要 `operator.talk.secrets`（或 `operator.admin`）。
- `talk.session.create`（`operator.talk`）为 `realtime/gateway-relay`、`transcription/gateway-relay` 或 `stt-tts/managed-room` 创建由网关拥有的 Talk 会话。对于 `stt-tts/managed-room`，传入 `sessionKey` 的非管理员调用方还必须传入 `spawnedBy`，以获得受限的会话密钥可见性；无范围的 `sessionKey` 创建以及 `brain: "direct-tools"` 需要 `operator.admin`。
- `talk.session.appendAudio` 将 Base64 PCM 输入音频追加到由网关拥有的实时中继和转录会话。
- `talk.session.cancelOutput` 停止助理音频输出，主要用于网关中继会话中的 VAD- 门控打断。从当前音频事件的`talkEvent`发送`turnId`；结果是 `applied`、`stale` 或 `idle`。
- `talk.session.submitToolResult` 完成由网关拥有的实时中继会话发出的提供商工具调用。请求会等待提供商桥接层公开的任何异步完成信号；提交失败会使关联运行保持活动状态，并且不会发出成功的工具结果事件。当需要中间工具输出时传入 `options: { willContinue: true }`；当提供商桥接层声明支持抑制，且结果不应启动另一个响应时，传入 `options: { suppressResponse: true }`。
- `talk.session.steer` 将主动运行的语音控制发送到网关拥有的代理支持的 Talk 会话中：`{ sessionId, text, mode? }`，其中 `mode` 是 `status`、`steer`、`cancel` 或 `followup`；省略模式是根据口语文本进行分类的。它仅选择与该逻辑语音呼叫绑定的工作，而不选择共享连接和代理会话的其他呼叫。
- `talk.session.close` 关闭网关拥有的中继、转录或托管房间会话，并发出终端 Talk 事件。对于实时中继，`disposition: "detach"` 关闭传输，同时接受的代理工作继续并且其答案保留在对话中； `"abort"`（默认）取消该工作。 Control UI 和 Android 电话故障清理分离，并且 Android 电话应用程序在离开前台时也会分离；显式 Stop 中止。即使语音已被录制，分离也会保留原始座席答案，因为语音不带有每次咨询传送收据。仅当`hello-ok.features.capabilities`通告`talk-session-close-disposition`时才发送`disposition`；较旧的网关拒绝未知字段，因此没有该功能的客户端保留传统的中止关闭。对于转录，省略或错误的 `discard` 最终确定捕获的音频； `discard: true` 删除缓冲的音频并取消待定的最终确定，而不发布其记录。丢弃请求可以取代仍在完成的关闭。
- `talk.mode` sets/broadcasts WebChat/Control UI 客户端的当前通话模式状态。
- `talk.client.create` 使用 `webrtc` 或 `provider-websocket` 创建或恢复由客户端拥有的实时提供商会话，同时由网关拥有凭据、指令、工具策略和返回的 `voiceSessionId`。在一次通话期间，客户端传入 `sessionKey`，并在替换提供商传输方式时复用 `voiceSessionId`。协商 `gateway-control-v1` 的客户端会保持 WebRTC 媒体直连，但将提供商控制通道和工具生命周期移交给网关。
- `talk.client.transcript` 将一项最终的 `{ role, text }` 项目附加到正常代理会话中。当在同一 `voiceSessionId` 内重试请求时，所需的 `entryId` 可防止出现重复的转录消息。
- `talk.client.close` 在待处理的脚本写入后关闭逻辑语音会话。重复关闭请求没有额外效果。关闭可能会将仅突变的调用摘要传送到会话的最后一个非 WebChat 通道。
- `talk.client.toolCall` 允许客户端拥有的实时传输将提供商工具调用转发到网关策略。第一个支持的工具是`openclaw_agent_consult`；客户端获取 `runId`、`agentId` 和已解析的 `agentSessionKey`，并在提交特定于提供商的工具结果之前等待正常的聊天生命周期事件。使用返回的目标为`chat.abort`和`chat.history`；保留语音会话请求的原始密钥。语音绑定操作使用普通工具策略和主机验证批准，无需额外的语音授权。成绩单和模型提供的确认字段不授权操作。策略和可执行文件检查适用于最终参数，包括每个嵌套的代码模式调用。
- `talk.client.steer` 为客户端拥有的实时传输发送会话范围的主动运行语音控制。网关解析来自 `sessionKey` 的拥有的活动工作，无需语音呼叫 ID，并返回结构化的 accepted/rejected 结果，而不是默默地放弃转向。相反，提供者附加的网关控件是调用范围的。
- `talk.event` 是用于实时、转录、STT/TTS、托管房间、电话和会议适配器的单一 Talk 事件通道。
- `talk.speak` 通过活动 Talk 语音提供商合成语音。
- `tts.status` 返回 TTS 启用状态、活动提供商、回退提供商和提供商配置状态。
- `tts.providers` 返回可见的 TTS 提供商清单。
- `tts.enable` 和 `tts.disable` 切换 TTS 偏好状态。
- `tts.setProvider` 更新首选 TTS 提供商。
- `tts.convert` 执行一次性文本转语音转换。
- `tts.speak`（`operator.write`）使用已配置的通用 TTS 提供商链渲染非空的 `text`，并以内联的 `audioBase64` 形式返回一个完整音频片段，以及 `provider` 和可选的 `outputFormat`、`mimeType`、`fileExtension` 元数据。与 `tts.convert` 不同，它不会返回网关本地路径；与 `talk.speak` 不同，它不需要 Talk 提供商。超过 `tts.maxTextLength` 的文本返回 `INVALID_REQUEST`；合成失败返回 `UNAVAILABLE`。

### <a id="relay-output-cancellation"></a> 继电器输出取消

对于可中断的提供程序，`applied` 确认输出已在本地清除，而不是提供程序已完成中断的响应。如果确认时间超过一秒，麦克风输入将恢复，同时网关继续丢弃该响应的音频、助理记录和工具调用。只有其提供者边界或提供者连续性重置才释放该输出所有者。如果响应在另外 30 秒内仍未完成，则会话将失败，而不是承认过时的输出。

虽然中断的响应仍然拥有输出，但取消较新的仅输入回合会返回 `stale`，包括省略 `turnId` 时。一旦提供者开始更新的响应，它自己的回合就可以正常取消。故意的不可中断提供程序会忽略插入并在显式输出停止时结束会话。 `talk.session.close` 始终结束会话。

## <a id="secrets%2C-config%2C-update%2C-and-wizard"></a><a id="secrets-config-update-and-wizard"></a> Secrets、配置、更新和向导

- `secrets.reload` 重新解析活动的 SecretRefs 并自动发布所有者感知的运行时状态。合格的所有者故障可以通过 `warningCount` 发布为冷或陈旧降级；严格或未映射的故障拒绝重新加载并保留活动快照。
- `secrets.resolve` 解析特定 command/target 集的命令目标秘密分配。
- `secrets.store.list`（`operator.admin`）返回团队范围的元数据，并仅对 `kind: "env"` 条目返回值。`kind: "secret"` 条目使用不含值字段的独立结果结构；没有显示方法。
- `secrets.store.set` 和 `secrets.store.delete` （`operator.admin`） create/update 或软删除一个团队范围的条目。成功写入后，仅当活动源配置中的 `store` SecretRef 引用该名称时，网关才会刷新活动机密运行时。
- `config.get` 返回当前磁盘配置快照、不透明创作的 `hash` 覆盖根文件字节并捕获包含身份和内容、解析的 `configRevisionHash` 以及可选的 `appliedConfigHash` 用于活动网关运行时接受的已解析修订版。
- `config.set` 写入经过验证的配置负载。
- `config.patch` 合并部分配置更新。破坏性的数组替换要求受影响路径位于 `replacePaths` 中；数组条目下的嵌套数组使用 `[]` 路径，例如 `agents.entries.*.skills`。
- `config.apply` 验证并替换完整配置负载。
- `config.schema` 返回 Control UI 和 CLI 工具使用的实时配置架构有效负载：架构、`uiHints`、版本、生成元数据、插件 + 通道架构元数据（可加载时）。它包括来自与 UI 相同的 labels/help 文本的 `title` / `description` 元数据，包括嵌套对象、通配符、数组项，以及存在匹配字段文档时的 `anyOf` / `oneOf` / `allOf` 组合分支。
- `config.schema.lookup` 返回一个配置路径的路径范围查找有效负载：规范化路径、浅架构节点、匹配提示 + `hintPath`、可选 `reloadKind` 以及 UI/CLI 钻取的直接子摘要。 `reloadKind` 是 `restart`、`hot` 或 `none` （`src/config/schema.ts`） 之一，并镜像请求路径的网关配置重新加载规划器。查找模式节点保留面向用户的文档和常见验证字段（`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、numeric/string/array/object 边界， `additionalProperties`、`deprecated`、`readOnly`、`writeOnly`）。子摘要公开 `key`、标准化 `path`、`type`、`required`、`hasChildren`、可选 `reloadKind` 以及匹配的 `hint` / `hintPath`。
- `update.run` 承认更新并返回其耐用的 `runId`；确认并不意味着完成，具有会话的调用者可以包含 `continuationMessage`，以便启动通过重新启动继续队列恢复一个后续代理轮次。来自控制平面的受支持的包管理器和 Git-checkout 更新使用独立的 CLI 更新程序。网关在验证期间保持服务，并在其运行时文件被替换之前关闭。开始的切换返回 `ok: true` 以及 `result.reason: "managed-service-handoff-started"` 和 `handoff.status: "started"`。由同一网关进程处理的第二个并发 `update.run` 返回 `ok: false` 以及 `result.reason: "managed-service-handoff-already-running"` 和 `handoff.status: "already-running"`；不接受其继续，因此调用者可以在活动更新完成后重试。独立的 CLI 更新程序和替换网关进程位于此进程本地防护之外。不可用或失败的切换会返回 `ok: false` 和 `managed-service-handoff-unavailable` 或 `managed-service-handoff-failed`，以及需要手动 shell 更新时的 `handoff.command`。不可用意味着 OpenClaw 缺乏安全的主管边界或持久的服务标识，例如 systemd 的 `OPENCLAW_SYSTEMD_UNIT`。在开始切换期间，重启哨兵可能会简要报告`stats.reason: "restart-health-pending"`；继续等待重新启动的网关的验证。
- `update.run` 确认字段区分通知传送和更新完成：`ackDelivered` 报告传送，`ackQueued` 报告通知所有者接受，可选的 `acknowledgement` 包含通知文本。读取持久运行以确定更新结果。
- 从`update.runs.get`、`update.runs.list`持久运行JSON，并且更新状态可以包括`admission: { owner: "candidate" | "installed", protocol?, candidateVersion?, checks?, fallbackReason? }`。每张支票都有 `name`、`status`（`ok`、`warn` 或 `refuse`）以及可选的 `detail`。从现有账本 JSON 中投影 `origin.admission`； `origin.candidateAdmission` 保留有界候选人的判决、理由、警告和事实。较旧的记录省略了这些字段。有关所有权和后备行为，请参阅 [ 候选人拥有的准入 ](/cli/update#candidate-owned-admission)。
- `update.status` 刷新并返回最新的更新重启哨兵，包括可用时的重启后运行版本。
- `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 通过 WS RPC 公开载入向导。每个回答的步骤都通过推理验证使用当前 `wizard.next` 调用者的权限，包括进度回复后。设备撤销仍然拒绝探测。

## <a id="agent-and-workspace-helpers"></a> Agent 和工作区助手

- `agents.list` 返回网关可见的代理条目，包括有效的 model/runtime 元数据和可选语义 `kind`（`agent` 或 `system`）。具有记录的创建来源的条目还包括 `createdVia`（`operator`、`agent` 或 `claw`）、可空 `creatorAgentId` 和毫秒 `createdAt`；无来源的条目省略这些字段。客户端通告 `agent-kind` 握手功能以接收完整的类型名册；没有它的客户端将保留传统的选择器安全名册，而没有系统行。 Kind-aware 客户端从普通选择器中排除 `system` 行，同时将它们保留在诊断视图中。较旧的 v4 网关可能会返回没有 `kind` 的行。
- `agents.create`、`agents.update` 和 `agents.delete` 管理代理记录及工作区连接。
- `claws.monitors`（`operator.admin`，作为所有阶段的控制平面写入进行速率限制）支持[爪子去除](/cli/claws#remove-an-installed-claw)。每个请求都包含本地配置文件的 `binding: { configPath, statePath, cronStorePath }`，根据服务所有者进行检查。 `{ phase: "inspect", agentId, binding }` 最多返回两个经证实的配置拥有的监视器快照，每个快照包含 `id`、`name`、`enabled`、`agentId`、空 `ownerAgentId`、`storeKey`、`declarationKey` 和`revision`。 `{ phase: "quiesce", agentId, operationId, monitors, binding }` 在取消计划工作之前验证当前删除日志和确切同意的快照。 `{ phase: "drain", agentId, operationId, binding }` 还需要应用代理移除并监控收敛。成功静止或排水返回`{ drained: true }`；等待五秒钟后，不完全排水返回 `UNAVAILABLE`。操作 ID 必须与服务网关状态中的实时日志匹配；它不是独立的清理机构。额外的请求字段被拒绝。
- `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理为代理公开的引导工作区文件。 `agents.files.get` 和 `agents.files.set` 返回文件的内容 `hash`（磁盘上字节的 SHA-256 十六进制，与 `sessions.files.set` 使用的标记相同）。 `agents.files.set` 接受可选的 `expectedHash`（对于现有文件）或 `expectedMissing: true`（对于读取时不存在的文件）；这些先决条件不能结合起来。更改的哈希或已创建的文件拒绝写入，并出现 `INVALID_REQUEST` 错误，其 `details.type` 为 `agent_file_conflict`。当可用时，`details.currentHash` 携带当前哈希值；重新读取文件以重新设置基准。条件创建需要工作区主机的原子独占创建功能，如果该功能不可用，则在不写入的情况下失败。省略这两个前提条件将保持无条件覆盖。
- `audit.activity.list` 返回版本化的纯元数据活动分类帐； `audit.run.inspect` 发现执行 ID 或检查一个确切的执行身份上下文； `audit.list` 仍然是兼容性安全的 run/tool RPC。
- `agents.workspace.list` 和 `agents.workspace.get` （`operator.read`） 为 [Operatorscopes](/gateway/operator-scopes) 中描述的可信操作员域中的客户端公开代理工作区目录的只读、分页浏览。请求仅接受工作空间相对路径；读取仅限于实路径工作区根（拒绝符号链接和硬链接转义）、大小上限，并且仅限于 UTF-8 文本加上常见图像类型 （base64）。当文件名无效时，工作区目录列表和文件搜索报告错误 UTF-8；重试之前，请在主机上重命名该条目。响应不会公开主机工作区路径。该命名空间中没有写操作。
- `transcripts.list` （`operator.read`） 首先列出了最新的持久会议捕获。可选 `limit` 接受 1–200（默认 50）； `providerId` 过滤源。 `sessions` 结果包括选择器、provider/source 定位器、时间、活动状态、话语计数、参与者、摘要可用性、可选的 model/heuristic 出处以及上限为 280 个字符的概述预览。源定位器仅公开 `providerId`、`accountId`、`guildId`、`channelId` 和 `meetingUrl`，从不公开自由格式元数据。
- `transcripts.get` （`operator.read`） 接受 `selector` 和可选的 `includeUtterances`。它返回会话和存储的摘要，包括其保存的Markdown；请求的话语经过净化并以 2,000 条捕获限制为界限。缺少摘要会省略 `summary`，而不是生成注释。两种转录方法都跨一个受信任的网关域进行读取，例如 `agents.workspace.*`；需要单独的域来实现读者隔离。它们不会导出文件或更改捕获状态。请参阅 [ 转录 CLI](/cli/transcripts#gateway-and-control-ui-reads)。
- 对于具有可到达的网关 HTTPS 源的客户端，`artifacts.download` 接受可选的 `transport: "http"`。然后，内联转录工件返回短暂的、连接绑定的 URL 以进行原始字节下载；省略 `transport` 在现有连接上保留 base64。 WebSocket 可用性本身并不能确定 HTTP 可达性。对于一个 WebSocket 响应来说太大的内联有效负载会被 `artifact_download_unsupported` 拒绝；使用 `transport: "http"`。参见[HTTPS神器下载](/gateway/clients#download-inline-artifacts-over-https)。
- `artifacts.list`、`artifacts.get` 和 `artifacts.download` 公开了显式 `sessionKey` 或 `runId` 范围的转录衍生工件摘要和下载。运行查询保留为该运行选择的存储会话，即使当前主会话别名指向其他地方；显式会话选择器解析当前别名。两者都强制对所选会话进行当前访问，并且仅返回具有匹配来源的转录媒体；不安全或本地 URL 源返回不受支持的下载，而不是获取服务器端。在列表、获取和下载上设置 `messageRole: "assistant"` 以选择助理交付的工件（包括交付镜像），并排除上传的输入和原始工具观察结果。省略过滤器以保留所有角色发现。将其与 `runId` 结合起来进行特定的运行；单独运行 ID 无法识别生成的输出。旧的网关拒绝新的过滤器；客户必须表现出拒绝，而不是在没有拒绝的情况下重试。
- `artifacts.list` 还接受 `type: "image"`、可选 `limit`（1–4，默认 4）和用于最近图像发现的不透明 `cursor`。每页最多读取 32 条转录消息，预算为 1 MiB，最新的在前，并读取超大消息整体；即使稀疏页面没有图像，`nextCursor` 也会继续显示较旧的消息。最多 256 个 KiB 的内联图像返回 `image.url` 中的有界数据 URL 预览。引用的内联图像还会返回可下载的 `artifact_transcript_image_` id；在预览边界之上，它们仅供参考，没有 `image.url`，并且它们的字节通过 `artifacts.download` 加载。边界上方未引用的内嵌图像被省略，页面报告 `omittedOversized: true`；打开会话来查看它们。基于 URL- 的图像摘要使 `image.url` 免受结构化内容、存储的上传媒体事实或呈现的 Markdown 引用的影响。非托管 URL 映像使用 `preview_` id、`source: "session-transcript-preview"` 和不受支持的下载：这些是预览参考，而不是 `artifacts.get` 或 `artifacts.download` 的标识符。 Control UI 将现有的经过身份验证的媒体路由和会话媒体策略用于本地源，并将工件下载所有者用于托管媒体和内联转录图像。发现永远不会恢复冰冷的文字记录或重建它们的预测；打开会话以恢复不可用的预览。游标在 15 分钟后过期，属于原始连接、代理、会话和查询，并拒绝记录重置。没有 `type` 的请求保留完整的工件列表； `limit` 和 `cursor` 需要图像滤镜。
- 完整的工件列表重用转录工作器中的有界摘要元数据，而 SQLite 转录版本保持不变。会话访问发现使用元数据读取器；承认的共享和抄本读取保留了授权请求之间的历史读取器及其摘要。追加（包括纯文本追加）、重写、分支更改和重置使下次读取的结果无效；仍然对每个请求运行访问检查。列表不会统计工件文件或将其内容保留在摘要缓存中。
- `environments.list` 和 `environments.status` （`operator.read`） 在没有云工作人员配置文件的情况下仍然可用，并保留网关本地和节点环境发现。 `environments.list` 还接受来自具有 `operator.write` 的呼叫者的可选 `runtimeId`。当运行时需要节点命令时，该请求将一个网关拥有的 `requiredNodeCommand` 结果添加到每个连接的节点。其关闭状态为`invocable`、`pending-approval`、`undeclared`或`unauthorized`；它永远不会公开节点的完整待处理声明。 Node 环境包括持久的 `sessionHost` 身份，用于保持已知离线主机可见，而当前连接的清单对该历史记录具有权威性。缺少身份就意味着虚假。精确有界的 `{ total, available }` 工作槽仅适用于实时，离线时省略；工作轮次准入会消耗一个槽，而节点支持的远程执行则不会。配置的配置文件摘要公开其有界的固定顺序 `executionModes` 数组以及现有的单个 `executionMode` primary/default 显示投影。当前客户仅通过 `executionModes` 中的成员资格来选择配置文件。配置的云工作人员和早期配置文件留下的持久记录添加 `worker` 元数据以及配置的 `profileId`、`providerId`、可选 `leaseId`、`state`、`ageMs`、可选 `idleMs` 和 `attachedSessionIds`。工作线程生命周期状态为 `requested`、`provisioning`、`bootstrapping`、`ready`、`attached`、`idle`、`draining`、`destroying`、`destroyed`、 `failed` 和 `orphaned`。连接的节点还可以包括`workerBundle: { status: "installed", version }`或`workerBundle: { status: "missing" }`。此可选观察是重新连接范围的，并报告一个网关保留的捆绑包的验证；它不是发射权。公共结果永远不会公开捆绑包哈希、网关命名空间、节点文件系统路径、收据或协议功能详细信息。
- `environments.list` 和 `{ projection: "profiles" }` 仅读取配置的配置文件目录，包括提供商编写的计算机和操作系统选择。当没有通告时，它返回 `environments: []` 并省略 `profiles`。不会读取工作线程和配对设备清单，因此清单故障不会阻止配置文件发现。省略 `projection` 会保留完整库存行为。即使使用轮廓投影，包括 `runtimeId` 仍然需要 `operator.write`。
- `environments.create` （`{ profileId, idempotencyKey }`） 从配置的插件提供程序配置文件提供环境；使用相同的密钥重试重用持久操作。没有会话的直接创建不会选择执行模式，因此提供程序使用其有意的默认值； Crabbox准备了`worker-turn`。 `environments.destroy` （`{ environmentId }`） 要求拆除持久的工作环境；重复请求不会产生额外效果。两者都需要 `operator.admin`，都是控制平面写入，并返回状态响应所使用的相同环境摘要形状。
- `environments.prepare`（`{ profileId, projectPath }`、`operator.admin`）承认没有会话的项目构建并返回 `{ environmentId, preparationKey, reused }`。它是提供程序启动时门控的控制平面写入。项目必须是本地Git checkout；配置的提供者必须支持项目准备。匹配的未使用的构建或保留被重用。已知错误保留 `details.code`：`profile_not_found`、`invalid_profile` 和 `invalid_project` 映射到 `INVALID_REQUEST`； `capacity` 映射到 `UNAVAILABLE`。其他失败返回通用 `UNAVAILABLE`，而没有提供者详细信息。准备好的摘要仅公开 `preparation: { purpose: "reserve" | "build", key }`。使用 `environments.destroy` 取消。有关池策略和设置授权，请参阅 [Build ondemand](/gateway/cloud-workers/warm-images#ready-workers)。
- `worker.desktop.observe`（`{ environmentId, control? }`、`operator.admin`）启动或重用环境的桌面转发并返回`{ transport, wsPath, expiresAtMs, control, vncPassword? }`。 `wsPath` 携带网关桌面观察者 WebSocket 的一次性 60 秒令牌；重新连接需要新的观察调用。具有可观察桌面的环境在 `environments.list` 中通告 `worker.desktop: true`。仅当启用 `cloudWorkers.desktop` 实验室时，才会通告该方法。请参阅 [ 云工作人员](/gateway/cloud-workers#desktop-interactive)。
- `desktop.release`（`{ wsPath }`、`operator.admin`）放弃原始请求网关连接上来自 `desktop.observe` 或 `worker.desktop.observe` 的无人认领的结果。它返回 `{ released }` 并仅释放该票证的待处理节点流。未知、过期、已领取、其他连接票返回`released: false`；现有查看者和控制权所有权不变。客户应保留清理责任，直到 RFB 身份验证，并在演示者关闭时发布最新结果。
- `agent.identity.get` 返回代理或会话的生效助手身份。
- `agent.wait` 等待一次运行完成，并在可用时返回终止快照。
