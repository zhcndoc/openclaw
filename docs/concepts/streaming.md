---
summary: "流式传输 + 分块行为（区块回复、频道预览流、模式映射）"
read_when:
  - "解释频道上的流式传输或分块如何工作"
  - "更改区块流式传输或频道分块行为"
  - "调试 duplicate/early 块回复或通道预览流"
title: "流式传输与分块"
---

OpenClaw有两个独立的流层，并且有**没有真正的代币增量流**来通道消息：

- **区块流式传输（频道）：** 在助手写入时发出已完成的**区块**。这些是普通的频道消息，不是令牌增量。
- **预览流（Telegram/Discord/Slack/Matrix/Mattermost/MS Teams）：**在生成时更新临时**预览消息**（发送+ edits/appends）。

## <a id="control-ui-startup-status"></a> Control UI 启动状态

`chat.send` 确认活动运行后，网关可以在助手文本或工具活动可见之前发送键入的粗略启动状态。 Control UI 在工作指示器旁边显示此状态，包括工作区准备、环境配置、上下文准备和模型启动阶段。

第一个辅助增量或工具启动将永久替换该运行的启动状态。会话列表和侧边栏活动将保持不变，直到运行结束，包括最终回复仍在流式传输或正在传递时。单独的答案增量或尝试级别完成信号不会将会话标记为空闲。当工具等待操作员操作时，批准状态优先。工作树创建和初始云调度发生在聊天运行之前，因此它们的预运行 RPC 进度不会显示为运行启动状态；仅当活动运行重新配置回收的工作线程时，环境配置才会出现在此处。

## <a id="block-streaming-(channel-messages)"></a><a id="block-streaming-channel-messages"></a> 区块流式传输（频道消息）

区块流式传输会在助手输出可用时，以较粗粒度的块发送。

```text
Model output
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ chunker emits blocks as buffer grows
       └─ (blockStreamingBreak=message_end)
            └─ chunker flushes at message_end
                   └─ channel send (block replies)
```

- `text_delta/events`：模型流事件（对于非流式模型，可能是稀疏的）。
- `chunker`：`EmbeddedBlockChunker` 应用 min/max 边界 + 中断首选项。
- `channel send`：实际的出站消息（区块回复）。

**控制项**（除非另有说明，均位于 `agents.defaults` 下）：

| 键                                                          | 值/形状                                                          | 默认值    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- | ---------- |
| `blockStreamingDefault`                                      | `"on"` / `"off"`                                                        | `"off"`    |
| `blockStreamingBreak`                                        | `"text_end"` / `"message_end"`                                          | -          |
| `blockStreamingChunk`                                        | `{ minChars, maxChars, breakPreference? }`                              | -          |
| `blockStreamingCoalesce`                                     | `{ minChars?, maxChars?, idleMs? }`（发送前合并流式区块） | -          |
| `*.streaming.block.enabled`（频道覆盖）               | `true`／`false`，按频道（以及按账户）强制启用区块流式传输  | -          |
| `*.textChunkLimit` (e.g. `channels.whatsapp.textChunkLimit`) | 数量，硬上限                                                        | 4000       |
| `*.streaming.chunkMode`                                      | `"length"` / `"newline"`                                                | `"length"` |
| `channels.discord.maxLinesPerMessage`                        | number，软行数上限，用于拆分过高的回复以避免 UI 裁剪     | 17         |

`streaming.chunkMode: "newline"` 会按空白行（段落边界）拆分， 而不是每一行；当文本超过限制后，再回退到按长度分块。

捆绑通道将这些覆盖拼写为 `channels.<id>.streaming.{chunkMode,block.enabled,block.coalesce}`。平面 `*.chunkMode` / `*.blockStreaming` / `*.blockStreamingCoalesce` 拼写被验证拒绝。在启动网关之前，运行 `openclaw doctor --fix` 将旧配置迁移到嵌套形状中。请参阅 [Doctor 迁移指南](/gateway/doctor#detailed-behavior-and-rationale)。

**`blockStreamingBreak` 的边界语义**：

- `text_end`：一旦 chunker 发出区块就立即流式发送；每次 `text_end` 都刷新。
- `message_end`：等助手消息结束后，再刷新缓冲输出。若缓冲文本超过 `maxChars`，仍会使用 chunker，因此在结束时可以发出多个区块。

<a id="pending-text-phases" />

### <a id="text-phases-and-final-replies"></a> 文本阶段和最终回复

不声明文本阶段的提供程序（包括普通聊天完成和本机 Ollama（`api: "ollama"`、`/api/chat`））会在可见模型文本到达时进行流式传输。稍后的工具调用或推理延续不会将早期的文本重新分类为评论。推理之前的内容仍然可见，推理之后的文本继续流式传输。 ACP 和 Control UI 按顺序保留可见文本，而无需追溯重写。

对于这些提供商，关闭块流的通道在最后一次工具调用后从助理文本中选择其最终文本回复。当没有工具调用时，可见的助手文本是最终回复。此选择不会撤回实时表面或通道预览中已显示的文本。当块流打开时，持久块遵循配置的分块和刷新边界。

如果成功解决的工具批次故意结束回合，则任何不分阶段的叙述仍然是答复。 OpenClaw 不会用缺失答案错误替换该旁白或需要其他模型响应。

显式提供者阶段仍然适用：OpenAI 响应 `phase` 和 Harmony commentary/final 通道将叙述与最终答案区分开。推理可见性设置和私有标签过滤也继续适用；保留可见文本不会暴露隐藏的推理。

提供程序插件应省略 `openclawDelivery.textPhaseRequiresTerminal`。该字段以 `v2026.10.1` 形式提供，现已被忽略。其可选的 SDK 类型保持源代码兼容，直到下一个插件 SDK 主要版本；删除还需要明确的中断发布批准。它无法启用追溯阶段推断。

### <a id="media-delivery-with-block-streaming"></a> 使用区块流式传输的媒体投递

当插件使用 `before_agent_finalize` 验证内置运行时的答案时，助理回复将保持延迟，直到该决定完成。稍后的答案将取代早期工具轮次中的延迟文本，包括当最终答案为 `NO_REPLY` 时。这适用于回复块和预览更新；它不会撤回已发送的回复。评论仍然存在，媒体、推理和对早期用户输入的完整答案都被保留。每个引导的用户输入都会得到自己提供的答案，即使其待处理的工具被跳过。被取代的答案中的媒体在交付时没有旧的标题。

关闭块流后，仍然可以在消息边界发送媒体承载辅助消息，并附加其标题。预览更新不算作单独提供的字幕。

流式媒体必须使用结构化载荷字段，例如 `mediaUrl` 或 `mediaUrls`；流式文本不会被解析为附件命令。当区块流式传输较早发送媒体时，OpenClaw 会记住该轮投递。如果最终的助手载荷重复了相同的媒体 URL，最终投递会去除重复媒体，而不是再次发送附件。

完全重复的最终载荷会被抑制。如果最终载荷在已经流式发送过的媒体周围加入了不同的文本，OpenClaw 仍会发送新文本，同时保持媒体只投递一次。这可以防止 Telegram 等频道中重复出现语音笔记或文件。

## <a id="chunking-algorithm-(low%2Fhigh-bounds)"></a><a id="chunking-algorithm-low/high-bounds"></a> Chunking 算法（low/high 边界）

区块分块由 `EmbeddedBlockChunker` 实现：

- **低边界：** 缓冲区未达到 `minChars` 前不输出（除非被强制）。
- **高边界：** 优先在 `maxChars` 之前进行切分；如果被强制，则在 `maxChars` 处切分。
- **断点偏好链：** `paragraph` -> `newline` -> `sentence` -> 空白符 -> 强制断开。
- **代码围栏：** 永远不要在围栏内部切分；当在 `maxChars` 处被强制切分时，关闭并重新打开围栏，以保持 Markdown 有效。
- **Tables：** 适合 `maxChars` 的 Markdown 表保留在一个块中，即使这意味着在 `minChars` 下面打破它，因此呈现表的通道会同时看到标题和行。较大的表在行边界处拆分。

`maxChars` 会被限制为频道的 `textChunkLimit`，因此你不能超过每个频道的上限。

## <a id="coalescing-(merge-streamed-blocks)"></a><a id="coalescing-merge-streamed-blocks"></a> 合并（合并已流式区块）

当启用区块流式传输时，OpenClaw 可以在发送前**合并连续的区块片段**，在保持渐进式输出的同时减少单行刷屏。

- 合并会在刷新前等待**空闲间隔**（`idleMs`）。
- 缓冲区会受 `maxChars` 限制，并在超过时立即刷新。
- `minChars` 可防止过小的片段过早发送，直到累积到足够文本 （最终刷新始终会发送剩余文本）。
- 连接符由 `blockStreamingChunk.breakPreference` 决定：`paragraph` -> `\n\n`，`newline` -> `\n`，`sentence` -> 空格。
- 可通过 `*.streaming.block.coalesce` 进行频道覆盖（包括按账户配置）。
- Discord、Signal 和 Slack 的默认合并配置为 `{ minChars: 1500, idleMs: 1000 }` ，除非被覆盖。

## <a id="human-like-pacing-between-blocks"></a> 区块之间的人性化节奏

当启用区块流式传输时，在第一个区块之后，在区块回复之间添加一个**随机暂停**，让多气泡回复感觉更自然。

| `agents.defaults.humanDelay.mode` | 行为                |
| --------------------------------- | ----------------------- |
| `off`（默认）                   | 无暂停                |
| `natural`                         | 800-2500ms随机暂停 |
| `custom`                          | `minMs`/`maxMs`         |

可通过 `agents.entries.*.humanDelay` 为每个代理单独覆盖。仅适用于**区块回复**，不适用于最终回复或工具摘要。

## <a id="%22stream-chunks-or-everything%22"></a><a id="stream-chunks-or-everything"></a> “流式分块还是一次全部输出”

- **流式分块：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"` （边生成边输出）。非 Telegram 渠道还需要 `*.streaming.block.enabled: true`。
- **在末尾一次性输出全部内容：** `blockStreamingBreak: "message_end"`（一次刷出，内容很长时可能会分成多个块）。
- **无块流：** `blockStreamingDefault: "off"`（最终文本回复；仍然可以在消息边界发送媒体承载消息）。

分块流式输出遵循 `agents.defaults.blockStreamingDefault`，除非某个渠道或账户显式设置了 `*.streaming.block.enabled`。QQ Bot 没有 `streaming.block` 相关键，并且会进行分块回复流式输出，除非 `channels.qqbot.streaming.mode` 为 `"off"`。渠道可以流式传输实时预览（`channels.<channel>.streaming.mode`），而不发送分块回复。`blockStreaming*` 默认值位于 `agents.defaults` 下，而不是配置根目录。

对于 Discord 和 Telegram，显式配置的非 `off` 预览模式优先于继承的 `agents.defaults.blockStreamingDefault: "on"`。当阻止回复应覆盖其预览时，设置该通道的 `streaming.block.enabled: true`。对于普通的单代理回合，如果回复修改挂钩阻止 Telegram 预览，则完成的块将使用正常的挂钩交付，除非全局或针对 Telegram 显式禁用块流。配置的多代理组线程轮流不使用此强制回退；与其他没有预览的回合一样，它们保留配置的块传送策略。

## <a id="preview-streaming-modes"></a> 预览流式模式

当前密钥：`channels.<channel>.streaming`（嵌套 `{ mode, ... }`；传统顶级 boolean/string 拼写由 `openclaw doctor --fix` 重写）。

| 模式       | 行为                                                              |
| ---------- | --------------------------------------------------------------------- |
| `off`      | 禁用预览流式传输                                             |
| `partial`  | 单个预览被最新文本替换                              |
| `block`    | 按 chunked/appended 步骤预览更新                             |
| `progress` | Progress/status 生成期间预览，完成时最终答案 |

`streaming.mode: "block"` 是适用于可编辑频道（如 Discord 和 Telegram）的预览流式模式；它本身不会在这些频道中启用频道块投递。正常的块回复请使用 `streaming.block.enabled`。 Microsoft Teams 是个例外：它没有草稿预览块传输，因此 `streaming.mode: "block"` 会完全禁用原生流式传输，回复会作为普通块投递，而不是原生的 partial/progress 流式传输。Mattermost 也有所不同：在 `block` 模式下，它会在已完成文本和工具活动块之间轮换预览，因此较早的块会作为单独帖子保持可见，而不会在一个可编辑草稿中被覆盖。

### <a id="channel-mapping"></a> 频道映射

当 `streaming` 未设置时，Discord、Telegram 和 Slack 默认为 `progress`。 Mattermost 和 MS Teams 默认为 `partial`。显式配置的模式保持不变； `off` 禁用预览。

| 渠道    | `off` | `partial` | `block` | `progress`                                    |
| ---------- | ----- | --------- | ------- | --------------------------------------------- |
| Telegram   | 是   | 是       | 是     | 可编辑的进度草稿（默认）             |
| Discord    | 是   | 是       | 是     | 可编辑的进度草稿（默认）             |
| Slack      | 是   | 是       | 是     | 线程中的本机卡；安静的外螺纹 |
| Mattermost | 是   | 是       | 是     | 是                                           |
| MS Teams   | 是   | 是       | 是     | 原生进度流                        |

预览块配置（`channels.discord.streaming` 或 `channels.telegram.streaming` 下的 `streaming.preview.chunk.*`、e.g.）默认为 `minChars: 200`、`maxChars: 800`（固定到通道 `textChunkLimit`）和 `breakPreference: "paragraph"`。

Slack-仅：

- 当 `channels.slack.streaming.mode="partial"`（`nativeTransport` 默认为 `true`）时，`channels.slack.streaming.nativeTransport` 切换 Slack 本机流 API 调用（`chat.startStream`/`chat.appendStream`/`chat.stopStream`）。
- Slack 原生流式传输和 Slack 助手线程状态需要回复线程目标。顶层私信不会显示这种线程式预览，但仍可以使用 Slack 草稿预览帖和编辑。

### <a id="legacy-key-migration"></a> 旧键迁移

| 渠道  | 旧版键                                                 | 状态                                                                                                                                               |
| -------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Telegram | `streamMode`, scalar/boolean `streaming`                    | 由`openclaw doctor --fix`改写为`streaming.mode`；运行时不读取                                                                        |
| Discord  | `streamMode`，布尔值 `streaming`                           | 由`openclaw doctor --fix`改写为`streaming.mode`；运行时不读取                                                                        |
| Slack    | `streamMode`；布尔值 `streaming`；旧版 `nativeStreaming` | 由 `openclaw doctor --fix` 重写为 `streaming.mode`（以及 boolean/legacy 形式的 `streaming.nativeTransport`）；运行时不读取         |
| Matrix   | scalar/boolean `streaming`                                  | 由`openclaw doctor --fix`重写为`streaming.mode`（包括Matrix的`"quiet"`模式）；运行时不读取                                    |
| Feishu   | 布尔值 `streaming`                                         | 由`openclaw doctor --fix`改写为`streaming.mode`；运行时不读取                                                                        |
| QQ 机器人   | 布尔值 `streaming`； `streaming.c2cStreamApi`               | 由 `openclaw doctor --fix` 重写为 `streaming.mode`（以及 boolean/`c2cStreamApi` 形式的 `streaming.nativeTransport`）；运行时不读取 |

## <a id="runtime-behavior"></a> 运行时行为

### Telegram

- 跨 DM 和 group/topics 使用 `sendMessage` + `editMessageText` 预览更新；最终文本会就地编辑活动预览。 Telegram 临时 30 秒“打字”草稿 （`sendMessageDraft`） 不用于答案流。
- Short 初始预览仍然针对推送通知 UX 进行去抖处理，但会在有限的延迟后实现，因此活动运行不会在视觉上保持沉默。
- 长文本最终结果会复用预览消息的第一块，只发送其余分块。
- `block` 模式会在 `streaming.preview.chunk.maxChars` 处将预览轮换为新消息（默认 800，且受 Telegram 4096 字符编辑限制上限约束）；其他模式会将一个预览增长到 4096 字符。
- `progress` 模式将工具进度保留在可编辑状态草稿中，在答案流处于活动状态但尚无工具行可用时具体化状态标签，完成时清除草稿，并通过正常传递发送最终答案。当父代理让步给接受的子代理时，相同的草稿会不断更新，直到他们解决为止；请参见 [ 子代理产量切换 ](/concepts/subagent-yield-handoff#progress-after-yield)。
- 当 `channels.telegram.richMessages` 为 `true` 时，Plan 预览使用本机复选框；否则，他们使用可读的 HTML 检查表。检查已完成的步骤，并将活动步骤标记为“正在进行”。
- 如果在完成文本被确认之前最终编辑失败，OpenClaw 会使用常规最终投递并清理过期预览。
- 当 Telegram block streaming 被显式启用时，会跳过预览流式传输，以避免双重流式传输。
- `/reasoning stream` 可以将推理写入一个临时预览，该预览会在最终投递后被删除。
- Telegram 选中的引用回复是一个例外：当 `replyToMode` 不是 `"off"` 且存在选中的引用文本时，OpenClaw 会跳过该轮的答案预览流（最终答案必须通过原生引用回复路径），因此工具进度预览行无法渲染。没有选中引用文本的当前消息回复仍会保留预览流。详情请参见 [Telegram 频道文档](/channels/telegram)。

### Discord

- 使用发送 + 编辑预览消息。
- `block` 模式会更新块边界处的预览，同时在编辑的消息中保留答案的段落分隔符和代码围栏。
- 当 Discord block streaming 被显式启用时，会跳过预览流式传输。
- `progress` 默认情况下是安静的：标题、撰写的评论和推理、计划里程碑、批准请求以及安全的当前操作和委派任务状态。状态不需要实用新型或模型编写的序言。中间工具故障和非零命令退出被隐藏。 `streaming.progress.toolProgress: true` 添加滚动工具日志及其图标。 Telegram分享安全工作状态演示；其他频道保留现有的进度布局。
- `progress` 模式会在最终答复交付后删除状态草稿，因此繁忙的通道不会在答复上方保留任何孤立工具日志。错误决赛将草稿保留为失败回合的记录。
- 最终媒体、错误以及显式回复载荷会取消待处理的预览，而不会刷新新的草稿，然后使用常规投递。

### Slack

- 与`streaming.progress.toolProgress: false`的紧凑进步保留了最新模型的前言。对于 `commentary: true`、`label: false` 和 `maxLines: 1`，它是一条斜体的临时消息，没有推理、工具图标、命令失败、计划或文件编辑计数器。第一篇文章等待完整的前导码，因此其 Slack 通知可读；后面的序言编辑了该消息。可操作的批准请求仍然可见。最终回复为新回复，Slack确认送达后才删除预览。成功的静音转弯也会消除他们的预览；明确的消息工具帖子仍然持久。
- 在可用时，`partial` 可以使用 Slack 原生流式传输（`chat.startStream`/`append`/`stop`）。
- `block` 使用追加式草稿预览。
- 在回复线程中，`progress` 默认情况下流式传输 Slack 的本机代理卡：一条消息携带旁白、实时计划卡（编写的里程碑或一个工作摘要行，直到 `streaming.progress.toolProgress: true` 为每个工具调用一行）以及最终答案。例行进度更新以一秒的间隔合并；注意力和完成度立即刷新。该卡片仅在真正起作用的回合中出现，因此简单的问题无需回答即可。 `streaming.progress.nativeTaskCards: false` 退回到 Block Kit 会话卡。默认情况下，它显示评论和文本，包括斜体叙述和推理、可操作的批准请求以及仅在明确配置时的普通标题。成品卡将 **Open 保留在 OpenClaw** 或 **Open 工作会话** 链接（如果可用）中。 `streaming.progress.toolProgress: true` 添加工具活动、计划清单、中间错误和恢复行以及 tool/file/time 工作时总计；完成的详细卡仅保留文件差异总计。这两种模式都不会添加表情符号、粗体文本或状态标题，但转弯失败时会显示一条简单的“失败”行。卡片仅在有可显示内容时才会发布，因此仅使用工具活动的默认回合不会显示卡片；最后一个可见行消失的有效或成功的卡（例如已解决的批准）将被删除。助理的最终文字和错误回复均采用正常投递；即使没有回复，失败的回合也会将其卡标记为“失败”。
- 仅当会话实际可打开时，Card 才在 OpenClaw**中包含**Open：设置了 `gateway.publicOrigin` 并且 `gateway.controlUi.enabled` 不是 `false`。
- 如果没有回复线程，默认的 `progress` 轮流只留下最终答案，并在工作期间使用临时的 `hourglass_flowing_sand` 打字反应。配置`typingReaction`胜； `""` 禁用它。任何显式的 `streaming.progress` 设置都会选择顶级变为预览，包括 `commentary: true` 或自定义 `label`。唯一的例外是 `nativeTaskCards: true`，它只影响线程。空进度设置保持安静。该规则使用合并的根和帐户设置。这包括普通的顶级 DM；代理视图和助理视图保持其线程行为。显式 `off`、`partial` 和 `block` 模式保持不变。
- 原生预览流式传输和草稿预览流式传输会抑制该轮的区块回复，因此 Slack 回复只通过一种投递路径进行流式传输。
- A 成功转弯但没有可见回复仍会删除其草稿卡。失败的无回复回合将保留其进度卡，标记为“失败”，或者如果工作时没有出现，则发布普通的“失败”卡。

### Mattermost

- 在 `partial` 模式下，会将思考和部分回复文本流式传输到同一个草稿预览帖子中，并在最终答案可以安全发送时就地完成。
- 在 `progress` 模式下，会将思考和工具活动流式传输到同一个状态预览中，并在最终答案可以安全发送时就地完成。
- 在 `block` 模式下，会在已完成文本和工具活动帖子之间轮换；并行和连续的工具更新会共享当前的工具活动帖子。
- 如果预览帖子已被删除，或在完成时不可用，则会回退为发送一条新的最终帖子。
- Final media/error 有效负载在正常交付之前取消挂起的预览更新，而不是刷新临时预览帖子。

### Matrix

- 当最终文本可以复用预览事件时，草稿预览会就地完成。
- 仅媒体、错误以及回复目标不匹配的最终结果会在常规投递之前取消待处理的预览更新；已经可见的过期预览会被重写。

## <a id="tool-progress-preview-updates"></a> 工具进度预览更新

预览流还可以包括 **tool-progress** 更新：简短的状态行，如“搜索网络”、“读取文件”或“调用工具”，在工具运行时、在最终答复之前出现在同一预览消息中。在 Codex 应用程序服务器模式下，Codex preamble/commentary 消息使用相同的预览路径，因此简短的“我是 checking...”进度注释可以流入可编辑草稿，而不会成为最终答案的一部分。这使得多步骤工具在第一次思考预览和最终答案之间保持视觉上的活力，而不是沉默。

响应注释通过工具切换保留每个消息项的身份。稍后的工具更新不会将早期的评论作为额外的组合序言重放。

长时间运行的工具可能会在返回之前发出类型化的进度。例如，`web_fetch` 在启动时配备一个五秒计时器：如果提取仍处于挂起状态，则预览显示 `Fetching page content...`；如果提取在此之前完成或被取消，则不会发出进度线。后来的最终工具结果仍然正常传递给模型。

支持的场景：

- **Discord**、**Slack**、**Telegram** 和 **Matrix** 会在预览流式传输处于活动状态时，默认将工具进度和 Codex 前言更新流式传输到实时预览编辑中。Microsoft Teams 在个人聊天中使用其原生进度流。
- Telegram 自 `v2026.4.22` 起已启用工具进度预览更新；保持启用状态即可保留该已发布行为。
- **Mattermost** 会在 `partial` 和 `progress` 模式下将工具活动合并到一个预览帖子中，或在 `block` 模式下将其放在文本块之间的一个工具活动帖子中（见上文）。
- 工具进度编辑遵循当前的预览流式模式；当预览流式传输为 `off`，或区块流式传输已接管消息时，会跳过这些编辑。在 Telegram 中，`streaming.mode: "off"` 表示仅最终投递：通用进度提示也会被抑制，而不会作为独立状态消息投递；但审批提示、媒体载荷和错误仍会正常路由。
- `streaming.preview.toolProgress`（默认`true`）控制`partial`和`block`预览中的工具进度线； `streaming.progress.toolProgress`（默认 `false`）将 `progress` 草稿选择到滚动工具日志中。要在隐藏 command/exec 文本时保持工具进度线可见，请将 `streaming.preview.commandText` 或 `streaming.progress.commandText` 设置为 `"status"`（默认值）。将任一选项设置为 `"raw"` 以选择命令文本。此策略由使用 OpenClaw 紧凑进度渲染器的 draft/progress 通道共享，包括 Discord、Matrix、Microsoft Teams、Mattermost、Slack 会话卡和 Telegram。要完全禁用预览编辑，请将 `streaming.mode` 设置为 `off`。

## <a id="progress-draft-rendering"></a> 进度草稿渲染

[进度卡](/tools/progress-card) 替换启用计划更新的 `partial`、`block` 和 `progress` 预览中的完整计划状态。可见的台阶遵循通道的线路限制。清除卡会删除其清单和状态，同时保留其他活动；如果通道支持删除，则删除其他空草稿。 Microsoft Teams 用其进度标签替换已清除的临时预览。对于 `streaming.progress.label: false`，Teams 保留临时预览，直到下次更新或最终答复。失败或阻止的写入会保留之前的计划。活动预览保留安全失败通知。

进度模式草稿 （`streaming.progress.*`） 具有以下每通道设置：

| 键                               | 默认值       | 行为                                                       |
| --------------------------------- | ------------- | -------------------------------------------------------------- |
| `streaming.progress.maxLines`     | `8`           | 保留在草稿标签下方的最多紧凑进度行数          |
| `streaming.progress.maxLineChars` | `120`         | 每行紧凑内容在截断前允许的最多字符数（按单词感知） |
| `streaming.progress.label`        | `"auto"`      | 草稿标题；可自定义字符串，或设为 `false` 以隐藏它            |
| `streaming.progress.labels`       | 内置池 | 当 `label: "auto"` 时使用的候选标签                     |

Slack 始终将进度模式渲染为固定的会话卡片布局；这些限制仍会约束该卡片中的活动行和计划文本。

### <a id="commentary-progress-lane"></a> 评论进度通道

除了工具进度之外，紧凑进度渲染器还可以在草稿中显示另一条通道：

- **`streaming.progress.commentary`** - 渲染模型的预工具 **commentary**（简短的“I'll check... then...”旁白）与工具交错进度草案中的行。在处于进行模式的 Discord 和 Telegram 上，即使此可选通道关闭，相同的前导码也会提供状态标题；其他渠道保持现有的进度行为。参见[进度草案](/concepts/progress-drafts#status-headline)。

当详细日志记录拥有独立注释时，每个前导码都会发送一次。缓冲评论和工具摘要在答案预览之前解决；最终交付开始后到达的纯文本进度被抑制。

```json
{
  "channels": {
    "discord": {
      "streaming": { "mode": "progress", "progress": { "commentary": true } }
    }
  }
}
```

保持进度线可见，但隐藏原始 command/exec 文本：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "partial",
        "preview": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

在另一个紧凑进度通道键下使用相同的结构，例如 `channels.discord`、`channels.matrix`、`channels.msteams`、 `channels.mattermost`，或 Slack 草稿预览。对于进度草稿模式，请在 `streaming.progress` 下放置相同的策略：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "progress",
        "progress": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

## <a id="related"></a> 相关内容

- [Agent循环](/concepts/agent-loop) - 发出这些流事件的回合生命周期
- [通道出站 API](/plugins/sdk-channel-outbound) - 共享预览、持久发送和最终确定 API
- [进度草稿](/concepts/progress-drafts) - 在长时间轮次中更新的可见进行中消息
- [消息](/concepts/messages) - 消息生命周期和传递
- [重试](/concepts/retry) - 传递失败时的重试行为
- [打字指示器](/concepts/typing-indicators) - 转弯飞行时显示打字状态
- [通道](/channels) - 各通道的流式支持。
