---
summary: "参考：提供商特定的转录清理与修复规则"
read_when:
  - "你正在调试与转录形状相关的提供商请求拒绝问题"
  - "你正在更改转录清理或工具调用修复逻辑"
  - "你正在调查跨提供商的工具调用 id 不匹配问题"
title: "转录卫生"
---

OpenClaw 在运行前会对转录应用**提供商特定的修复**（构建模型上下文）。这些是用于满足严格提供商要求的**内存中**调整。运行时转录状态仍保存在 SQLite 中；提供商特定的 assistant 预填充剥离只会在构建出站负载时发生。

范围包括：

- 运行时专用提示上下文不应出现在用户可见的转录轮次中
- 工具调用 id 清理
- 工具调用输入验证
- 工具结果配对修复
- 轮次验证 / 排序
- 思考签名清理
- 推理签名清理
- 图像负载清理
- 向提供商回放前的空文本块清理
- 向提供商回放前的不完整仅推理长度轮次清理
- 用户输入来源标记（用于会话间路由提示）
- E 在实时请求和提供者重播之前删除 error/aborted-turn 空助手
- 仅语音助手将重放为其语音文本

如果你需要转录存储详情，请参见 [会话管理深度解析](/reference/session-management-compaction)。

---

工具参数、结果和对话文本不会在模型上下文或持久记录中进行秘密屏蔽。读取 `.env` 文件也会保留其文本。日志记录和诊断导出保留秘密屏蔽；下面描述的历史记录大小限制、媒体处理和提供程序重播规范化仍然适用。

之前被屏蔽的历史记录保持原样；删除的文本无法重建。如果提交的输入被屏蔽，则旧版本中断的私有完成可能会导致精确输入重试验证失败。重试仍然被拒绝，而不是将不同的秘密值视为相同的输入。检查前一次尝试的结果后启动新的请求；不要盲目重复有副作用的动作。

## <a id="delivered-command-exchanges"></a> 下发命令交换

Slash 命令及其从共享调度程序传递的回复是普通的对话消息，而不是仅运行时的提示上下文。 Discord 和 Telegram、Slack 参数菜单和 Mattermost 模型选择器上的本机命令菜单、按钮选择和确认也在交付后保留。登录设备代码、配对代码、登录 URL 和敏感 `/config set` 或 `/debug set` 值（包括嵌套对象分配）在附加交换之前经过编辑。这些行仍然可供以后的提供者请求和聊天历史记录使用，而无需重写早期的行。 `/btw` 和 `/side` 仍然是短暂的。

## <a id="delivered-automation-results"></a> 交付自动化成果

Canonical `openclaw` / `automation-result` 辅助行保留在模型历史记录中，即使它们的文本与前面的助理回复匹配且其使用率为零也是如此。历史重复过滤器仍然会删除无标记的传送镜像。

## <a id="failed-attempts-and-recovery"></a> 失败的尝试和恢复

失败的尝试将其原始内容、错误和用法保留在仅附加的记录中。恢复可以隐藏失败的流输出，而无需重写这些行。

模型投影会丢弃空的 error/aborted 转弯和失败的工具调用帧，在实时请求和冷重放之前都没有完成的结果。当失败的框架完成工具工作时，投影会保留已完成的调用及其签名思维，省略未完成的调用和部分文本，并使用可重播的停止原因。存储的故障和计费事实保持不变。这使用现有的辅助行形状并且不需要数据库迁移。

直接 Anthropic 消息仅附加重播还可以将失败和恢复的辅助帧以及连续的用户轮流分开。严格路由保留其角色合并行为。

## <a id="global-rule%3A-runtime-context-is-not-user-transcript"></a><a id="global-rule-runtime-context-is-not-user-transcript"></a> 全局规则：运行时上下文不是用户转录

Runtime/system 上下文可以添加到模型提示中进行转弯，但它不是最终用户创作的内容。 OpenClaw 为网关回复、排队跟进、ACP、CLI 和嵌入式 OpenClaw 运行保留一个单独的面向转录的提示正文。存储的可见用户轮流使用该脚本正文而不是运行时丰富的提示。

对于没有用户文本的仅运行时回合，嵌入式运行程序将其合成延续标记为隐藏的内部系统输入。它保留在模型历史记录中，因此冷重播保留原始请求前缀，但它不是人工编写的文本或可见的聊天历史记录。即使在仅运行时轮开始之前提示提交失败，下一个真实的用户输入也会正常保留。现有存储的标记不会被重写。

压缩和保存的 CLI 会话注释不包括保留的 `openclaw.runtime-context` 自定义消息类型，包括没有运营商元数据的旧条目和选择退出提供商重播的条目。提供商载体元数据控制重放权限；它不会使私有上下文符合摘要或保存的注释的条件。现有的转录本在读取时会接受此过滤，而无需重写存储的历史记录。

对于已经持久化了运行时包装器的旧会话，Gateway 历史界面会在将消息返回给 WebChat、 TUI、REST 或 SSE 客户端之前应用显示投影。

---

## <a id="where-this-runs"></a> 适用位置

嵌入式运行器选择并应用转录策略：

- 策略选择：`src/agents/transcript-policy.ts` （`resolveTranscriptPolicy`，按 `provider`、`modelApi` 和 `modelId` 键控）
- Sanitization/repair 应用：`src/agents/embedded-agent-runner/replay-history.ts` 中的 `sanitizeSessionHistory`

Legacy JSONL 验证和导入属于 `openclaw doctor --fix`；嵌入式运行器不会修复或重新打开基于文件的运行时转录。

---

## <a id="global-rule%3A-image-sanitization"></a><a id="global-rule-image-sanitization"></a> 全局规则：图像清理

图像有效负载始终经过清理，以防止提供商方因大小限制而拒绝（downscale/recompress 超大的 Base64 图像）。当图像后端可用时，重播还会检查每个保留的图像是否可以解码。损坏的图像会变成 `omitted image payload` 纸币；有效图像、周围文本和工具错误保持不变。成功的回复不会修复原始存储的图像字节，因此永远不会记住失败的检查，并且每次重播时都会忽略损坏的图像。成功的结果（按原样验证，或缩小的替换）在过程中通过内容摘要和限制进行缓存，限制为 16 MiB，因此稍后会重用它们，而不是再次解码相同的字节。这也有助于控制具有视觉功能的模型的图像驱动的标记压力：较低的最大尺寸减少了标记的使用，较高的尺寸保留了细节。

实现：

- `sanitizeSessionMessagesImages` 位于 `src/agents/embedded-agent-helpers/images.ts`
- `sanitizeContentBlocksImages` 位于 `src/agents/tool-images.ts`
- 最大图像边长可通过 `agents.defaults.imageMaxDimensionPx` 配置 （默认值：`1200`）
- 当此通道遍历重播内容时，将删除无符号的空白文本块。带有提供者重播签名的空白助手文本会逐字节保留，包括仅包含空白的消息，因此稍后的推理会保留其原始请求前缀和项目顺序。变为空的助理回合将被丢弃，除非他们拥有不透明的提供者重播状态；变为空的用户和工具结果轮流接收非空的省略内容占位符。

---

## <a id="global-rule%3A-malformed-tool-calls"></a><a id="global-rule-malformed-tool-calls"></a> 全局规则：格式错误的工具调用

如果 Assistant 工具调用块同时缺少 `input` 和 `arguments`，在构建模型上下文之前会将其丢弃。这样可以防止由于部分持久化的工具调用而导致提供方拒绝请求（例如，在速率限制失败之后）。

当其工具在当前目录中被禁用、删除或不可用时，已完成的 call/result 对仍保留历史记录。它们的名称仍然需要有效的语法；格式错误的调用、不明确的配对和合成缺失结果修复不会授予此例外。重放已完成的通话不会宣传或授权该工具进行新的通话。

实现：

- `sanitizeToolCallInputs` in `src/agents/session-transcript-repair.ts`
- 在 `sanitizeSessionHistory` 中应用 （`src/agents/embedded-agent-runner/replay-history.ts`）

---

## <a id="global-rule%3A-tool-result-pairing"></a><a id="global-rule-tool-result-pairing"></a> 全局规则：工具结果配对

实时运行程序重写了重复早期调用的提供程序 ID，从而在嵌入式运行尝试中（包括压缩之后）的响应中保持 ID 唯一。保留的旧转录本仍然使用基于出现的配对。

在重写特定于提供者的调用 ID 之前，工具结果会与每个助理轮次内发生的工具调用配对。提供者生成的 ID 可能会在以后的回合中重复，因此与重复调用相邻的结果将保留在该事件中。仅当恰好有一个未解决的事件可以拥有已移位的结果时，才会移动该结果；不明确的额外内容会被删除，缺失的事件会收到合成错误结果。

Synthetic 缺失结果告诉模型结果未知：仅重试只读操作或可以安全重复的操作，并在重复可能产生副作用的操作之前验证当前状态。响应系列传输保留其 `aborted` 占位符。这两个占位符都不能证明该工具未运行。

实现：`src/agents/session-transcript-repair.ts` 中的 `sanitizeToolUseResultPairing`

切换模型时，提供程序重放会将延迟的异步工具结果移动到其原始调用旁边，然后再删除源模型的异步元数据。调用 ID 和结果 ID 在匹配之前会被修剪，因此周围的空格不会将真实结果转变为合成缺失结果错误。该投影在 `packages/ai/src/transcript-transform.ts` 中运行，并保持存储的历史记录完好无损。

---

## <a id="global-rule%3A-incomplete-or-silent-reasoning-only-turns"></a><a id="global-rule-incomplete-or-silent-reasoning-only-turns"></a> 全局规则：不完整或静默的仅推理回合

当助理回合仅包含思考内容或被屏蔽的思考内容，并且在以下任一事件之后时，这些回合会从内存中的回放副本中省略：

- 提供方输出限制以不完整的推理状态结束该回合。
- 静默回复清理移除了该回合唯一可见的 `NO_REPLY` 文本。

静默回复清理可防止隐藏推理在严格提供方重建会话时与后续的助理工具使用回合合并。

空长度回合保持不变，具有可见文本、工具调用或未知内容块的长度回合也保持不变。带有工具调用或未知内容块的静默回复回合同样保持不变。已存储的转录不会被重写。

没有可见文本或工具调用但录制语音 （`openclawDelivery.tts.text`） 的助理轮次会将该语音重播为文本，因此稍后的轮次仍会看到答案。存储的转录本不会被重写。

实现：`normalizeAssistantReplayContent`，位于 `src/agents/embedded-agent-runner/replay-history.ts`

---

## <a id="global-rule%3A-inter-session-input-provenance"></a><a id="global-rule-inter-session-input-provenance"></a> 全局规则：会话间输入来源

当代理通过 `sessions_send` 向另一个会话发送提示（包括发送给请求者的延迟回复）时，OpenClaw 会使用 `message.provenance.kind = "inter_session"` 持久保存创建的用户轮次。

OpenClaw 还会在路由后的提示文本之前，添加同一轮的 `[Inter-session message] ... isUser=false` 标记，这样当前模型调用就能区分来自其他会话的输出和外部终端用户指令。该标记在可用时会包含来源会话、通道和工具。转录仍然使用 `role: "user"` 以兼容提供方，但可见文本和 provenance 元数据都会将该轮标记为 inter-session 数据。

在重建上下文期间，OpenClaw 会将相同标记应用于那些仅具有 provenance 元数据的旧持久化会话间 user 轮次。

---

## <a id="provider-matrix-(current-behavior)"></a><a id="provider-matrix-current-behavior"></a> 提供商矩阵（当前行为）

**OpenAI / OpenAI Codex**

- 仅图像清理。
- 对 OpenAI Responses/Codex 转录，删除孤立的推理签名（没有后续内容块的独立推理项），并在模型路由切换后删除可重放的 OpenAI 推理。
- 保留可重播的 OpenAI 响应推理项有效负载，包括加密的空摘要项，因此 manual/WebSocket 重播保持所需的 `rs_*` 状态与辅助输出项配对。
- SDK 响应重播使用存储隐私形状和固定字段顺序：摘要为空，省略明文推理内容，并且完整的密文在实时延续和记录重新加载中保持不变。提供者的空 `content: []` 推理容器在脚本重新加载时被保留，因此重新打开会话不会更改其缓存的前缀；不存在的容器将保持不存在。本机 ChatGPT 响应保留其上游 Codex 有效负载语义。
- SDK 响应流在返回完整的辅助消息之前规范新的推理签名，因此实时延续和转录存储使用相同的终端响应项的签名字节，即使 `output_item.done` 携带不同的密文。异步工具前缀在持久化之前等待终端推理解决。如果流发生错误、中止或在没有终端响应的情况下结束，则仍会在未收到终端快照时使用 `output_item.done` 推理快照传递已完成的异步调用。加密的推理字节、可执行工具参数和先前批准的历史记录保持不变。
- 成功 SDK 响应完成忽略缺失的错误字段。会话所有者在持久化之前将运行元数据附加到新的助手历史记录中，因此下一个工具步骤和脚本重新加载会保留相同的运行信封。
- Native ChatGPT Codex 响应遵循 Codex 线路奇偶校验，重播先前的响应 reasoning/message/function 有效负载，而无需先前的项目 ID，同时保留会话 `prompt_cache_key`。
- OpenAI 响应系列重播保留有效的 `call_*|fc_*` 工具调用对，但在 pi-ai 有效负载转换之前使用固定规则来规范格式错误或过长的 `call_id`/function-call 项目 ID。当助理轮次缺乏对 `rs_*` ID 的预先推理时，传输会从出站有效负载中省略其 `fc_*` 项目 ID，而不更改记录的工具调用或工具结果 ID。
- Tool 结果配对修复可以移动实际匹配的输出并合成 Codex-style `aborted` 输出以查找丢失的工具调用。
- 不进行轮次验证或重排序；不剥离思维签名。

**OpenAI-兼容聊天完成**

- H历史助手thinking/reasoning块在重播之前被剥离，因此本地和代理样式OpenAI-兼容服务器不会接收先验推理字段，例如`reasoning`或`reasoning_content`。
- 当前同轮次的工具调用续接会让助手推理块附加在工具调用上，直到工具结果已被重放。
- Custom/self-hosted 具有 `reasoning: true` 的模型条目保留重放的推理元数据。
- 由提供商拥有的例外情况可以选择不遵循此规则，当其 wire protocol 需要重放推理元数据时除外。

**Google（生成AI / Gemini CLI / 反重力）**

- 工具结果配对修复和合成工具结果。
- 工具结果配对修复和合成工具结果。
- Turn 验证（Gemini-style 转弯交替）。
- Google 轮次排序修复（如果历史以 assistant 开头，则在前面添加一个很小的 user 启动块）。
- Antigravity Claude：规范化思维签名；删除未签名的思维块。

**Anthropic / Minimax（Anthropic-兼容）**

- 前缀绑定的 Claude 模型（例如 Fable 5.1）在用户转动并就地重播后立即将运行时上下文载体保留为隐藏的自定义消息。老用户轮流的内联入站元数据也被保留。此模型范围的仅附加策略包括 Bedrock、Vertex 和 Foundry 路线。代理核心使用用户角色兼容性消息上的类型化运行时上下文元数据来标记载体。提供商适配器将消息投射到其协议支持的最强权威处； Anthropic- 系列和外部插件适配器保留标记的用户表示，而 OpenAI- 兼容适配器使用系统或开发人员权限。运营商被排除在聊天历史记录和压缩摘要之外。其他 Claude 模型和 Anthropic- 兼容模型保留临时载体，避免在没有任何内容绑定前缀时重复缓存读取费用和旧载体的上下文使用。
- 工具结果配对修复和合成工具结果。
- 转弯验证（合并连续转弯以满足严格交替）。对于消息 API 上的前缀绑定模型，仅附加重放将连续的用户和助理回合分开，保留每回合时间戳和 failed/recovered 边界； Bedrock Converse 仍然将它们融合在一起。
- 当启用 thinking 时，发送给 Anthropic Messages 有效载荷前会移除末尾的 assistant prefill 轮次，包括 Cloudflare AI Gateway 路由。
- 当会话被压缩时，预压缩助手认为签名会在提供者重放之前被剥离。在前缀绑定模型上，压缩会更改签名前缀（摘要内容替换原始内容），因此重放原始签名可能会导致 Anthropic 拒绝请求，并显示“思维块中的签名无效”。思考文本被保存为无符号块，然后按以下规则处理。
- 缺少、为空或空白的重放签名的 thinking 块会在转换为提供商格式前被剥离。如果这会使 assistant 轮次为空，OpenClaw 会保留轮次形状，并使用非空的 omitted-reasoning 文本。
- 需要剥离的旧版仅 thinking assistant 轮次会被替换为非空的 omitted-reasoning 文本，以便提供商适配器不会丢弃该重放轮次。

**Amazon Bedrock （匡威 API）**

- E 空助理流错误轮次和旧版回退占位符将从内存中重播副本中删除。这可以避免无效的空 ContentBlocks 和合成助理预填充，而无需重写存储的转录本。
- 零使用空停转弯也被丢弃；计费的静默回复和真实助理内容的错误保留了现有的重播处理。
- 会话被压缩后，和 Anthropic 上文相同，压缩前的 assistant thinking 签名会在 Converse 重放前被剥离。
- 具有缺失、为空或空白重放签名的 Claude thinking 块会在 Converse 重放前被剥离。如果这会使 assistant 轮次为空，OpenClaw 会保留轮次形状，并使用非空的 omitted-reasoning 文本。
- 需要剥离的旧版仅 thinking assistant 轮次会被替换为非空的 omitted-reasoning 文本，以便 Converse 重放保持严格的轮次形状。
- 重放会过滤 OpenClaw delivery-mirror 和 gateway 注入的 assistant 轮次。
- 图像清理适用于全局规则。

**Mistral（包括基于 model-id 的检测）**

- Tool 呼叫 ID 清理：strict9（字母数字，长度 9）。

**OpenRouter Gemini**

- 思维签名清理：剥离非 base64 的 `thought_signature` 值（保留 base64）。

**OpenRouter Anthropic**

- 当启用推理时， 尾随辅助预填充轮次将从经过验证的 OpenRouter OpenAI- 兼容 Anthropic 模型有效负载中剥离，匹配直接 Anthropic 和 Cloudflare Anthropic 重放行为。

**其他所有情况**

- 仅图像清理。

---

## <a id="historical-behavior-(pre-2026.1.22)"></a><a id="historical-behavior-pre-2026-1-22"></a> 历史行为（2026.1.22 之前）

在 2026.1.22 版本发布之前，OpenClaw 对转录内容应用了多层清理：

- 一个 **transcript-sanitize 扩展** 会在每次上下文构建时运行，并且可以：
  - 修复工具use/result配对。
  - 清理工具调用 id（包括一种保留 `_`/`-` 的非严格模式）。
- 运行器还会执行特定于提供方的清理，从而造成重复工作。
- 还有一些在提供方策略之外的额外变更，包括在持久化之前从助手文本中移除 `<final>` 标签、删除空的助手错误轮次，以及在工具调用之后截断助手内容。

这种复杂性引发了跨提供方回归问题（尤其是 `openai-responses` 的 `call_id|fc_id` 配对）。2026.1.22 的清理移除了该扩展，将逻辑集中到运行器中，并使 OpenAI 除了图像清理之外保持 **不触碰**。

## <a id="related"></a> 相关内容

- [会话管理](/concepts/session)
- [会话修剪](/concepts/session-pruning)
