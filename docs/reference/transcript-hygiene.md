---
summary: "参考：提供商特定的转录清理与修复规则"
read_when:
  - 你正在调试与转录形状相关的提供商请求拒绝问题
  - 你正在更改转录清理或工具调用修复逻辑
  - 你正在调查跨提供商的工具调用 id 不匹配问题
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
- Bedrock Converse 回放中空 assistant 错误轮次修复

如果你需要转录存储详情，请参见
[会话管理深度解析](/reference/session-management-compaction)。

---

## 全局规则：运行时上下文不是用户转录

运行时/系统上下文可以添加到某一轮的模型提示中，但它不是最终用户编写的内容。OpenClaw 为 Gateway 回复、排队的后续问题、ACP、CLI 以及嵌入式 OpenClaw 运行保留了单独的、面向转录的提示正文。已存储的可见用户轮次会使用该转录正文，而不是运行时增强后的提示。

对于已经持久化了运行时包装器的旧会话，Gateway 历史界面会在将消息返回给 WebChat、
TUI、REST 或 SSE 客户端之前应用显示投影。

## 适用位置

所有转录清理都集中在嵌入式运行器中：

- 策略选择：`src/agents/transcript-policy.ts`
  （`resolveTranscriptPolicy`，按 `provider`、`modelApi` 和 `modelId` 键控）
- 清理/修复应用：`sanitizeSessionHistory` 在
  `src/agents/embedded-agent-runner/replay-history.ts` 中

Legacy JSONL 验证和导入属于 `openclaw doctor --fix`；嵌入式运行器不会修复或重新打开基于文件的运行时转录。

---

## 全局规则：图像清理

图像载荷始终会被清理，以防止因尺寸限制导致提供方拒绝（会对超大的 base64 图像进行缩小/重新压缩）。这也有助于控制具备视觉能力的模型所面临的图像驱动 token 压力：更小的最大尺寸会减少 token 使用量，更大的尺寸则会保留更多细节。

实现：

- `sanitizeSessionMessagesImages` 位于
  `src/agents/embedded-agent-helpers/images.ts`
- `sanitizeContentBlocksImages` 位于 `src/agents/tool-images.ts`
- 最大图像边长可通过 `agents.defaults.imageMaxDimensionPx` 配置
  （默认值：`1200`）
- 此过程遍历回放内容时会移除空白文本块。
  变为空的 assistant 轮次会被丢弃，除非它们拥有不透明的提供商回放状态；变为空的 user 和 tool-result 轮次会收到非空的省略内容占位符。

## 全局规则：格式错误的工具调用

如果 Assistant 工具调用块同时缺少 `input` 和 `arguments`，在构建模型上下文之前会将其丢弃。这样可以防止由于部分持久化的工具调用而导致提供方拒绝请求（例如，在速率限制失败之后）。

实现：

- `src/agents/session-transcript-repair.ts` 中的 `sanitizeToolCallInputs`
- 在 `sanitizeSessionHistory` 中应用
  （`src/agents/embedded-agent-runner/replay-history.ts`）

---

## 全局规则：工具结果配对

工具结果会在每个助手轮次中与工具调用出现位置进行配对，然后再重写提供方特定的调用 ID。提供方生成的 ID 可能会在后续轮次中重复，因此与重复调用相邻的结果会保留在该次出现处。只有在恰好有一个未解决的出现位置可以拥有它时，才会移动被挪位的结果；歧义性的多余结果会被丢弃，缺失的出现位置会收到合成的错误结果。

实现：`sanitizeToolUseResultPairing` 位于

`src/agents/session-transcript-repair.ts`

## 全局规则：不完整或静默的仅推理回合

当助理回合仅包含思考内容或被屏蔽的思考内容，并且在以下任一事件之后时，这些回合会从内存中的回放副本中省略：

- 提供方输出限制以不完整的推理状态结束该回合。
- 静默回复清理移除了该回合唯一可见的 `NO_REPLY` 文本。

静默回复清理可防止隐藏推理在严格提供方重建会话时与后续的助理工具使用回合合并。

空长度回合保持不变，具有可见文本、工具调用或未知内容块的长度回合也保持不变。带有工具调用或未知内容块的静默回复回合同样保持不变。已存储的转录不会被重写。

实现：`normalizeAssistantReplayContent`，位于
`src/agents/embedded-agent-runner/replay-history.ts`

## 全局规则：会话间输入来源

当一个 agent 通过 `sessions_send` 向另一个会话发送提示时  
（包括 agent-to-agent 的回复/announce 步骤），OpenClaw 会持久化  
创建的 user 轮次，并将 `message.provenance.kind = "inter_session"`。

OpenClaw 还会在路由后的提示文本之前，添加同一轮的 `[Inter-session message] ... isUser=false`  
标记，这样当前模型调用就能  
区分来自其他会话的输出和外部终端用户指令。该  
标记在可用时会包含来源会话、通道和工具。转录仍然使用 `role: "user"` 以兼容提供方，但  
可见文本和 provenance 元数据都会将该轮标记为 inter-session  
数据。

在重建上下文期间，OpenClaw 会将相同标记应用于那些仅具有 provenance 元数据的旧持久化  
会话间 user 轮次。

## 提供商矩阵（当前行为）

**OpenAI / OpenAI Codex**

- 仅进行图像清理。
- 对 OpenAI Responses/Codex 转录，删除孤立的推理签名（没有后续内容块的独立推理项），并在模型路由切换后删除可重放的 OpenAI 推理。
- 保留可重放的 OpenAI Responses 推理项有效载荷，包括加密的空摘要项，以便手动/WebSocket 重放时，所需的 `rs_*` 状态能与助手输出项保持配对。
- 原生 ChatGPT Codex Responses 通过重放先前的 Responses 推理/消息/函数有效载荷来遵循 Codex wire parity，不使用先前项 ID，同时保留会话 `prompt_cache_key`。
- OpenAI Responses 系列重放会保留规范化的 `call_*|fc_*` 同模型推理对，但在 pi-ai 有效载荷转换前，会确定性地规范化格式错误或过长的 `call_id`/函数调用项 ID。
- 工具结果配对修复可能会移动真实的匹配输出，并为缺失的工具调用合成 Codex 风格的 `aborted` 输出。
- 不进行轮次验证或重排序；不剥离思维签名。

**OpenAI 兼容的 Chat Completions**

- 历史上的助手思考/推理块在重放前会被剥离，因此本地和代理风格的 OpenAI 兼容服务器不会收到上一轮推理字段，例如 `reasoning` 或 `reasoning_content`。
- 当前同轮次的工具调用续接会让助手推理块附加在工具调用上，直到工具结果已被重放。
- 自定义/自托管模型条目若带有 `reasoning: true`，会保留重放的推理元数据。
- 由提供商拥有的例外情况可以选择不遵循此规则，当其 wire protocol 需要重放推理元数据时除外。

**Google（Generative AI / Gemini CLI / Antigravity）**

- 工具调用 ID 清理：严格字母数字。
- 工具结果配对修复和合成工具结果。
- 轮次验证（Gemini 风格的轮次交替）。
- Google 轮次排序修复（如果历史以 assistant 开头，则在前面添加一个很小的 user 启动块）。
- Antigravity Claude：规范化思维签名；删除未签名的思维块。

**Anthropic / Minimax（兼容 Anthropic）**

- 工具结果配对修复和合成工具结果。
- 轮次验证（合并连续的 user 轮次以满足严格交替）。
- 当启用 thinking 时，发送给 Anthropic Messages 有效载荷前会移除末尾的 assistant prefill 轮次，包括 Cloudflare AI Gateway 路由。
- 会话被压缩后，在提供商重放前会移除压缩前的 assistant thinking 签名。thinking 签名在生成时与对话前缀进行加密绑定；压缩后前缀会改变（摘要内容替代原始内容），因此重放原始签名会导致 Anthropic 拒绝请求并报错 “Invalid signature in thinking block”。thinking 文本会作为未签名块保留，然后由下方规则处理。
- 缺少、为空或空白的重放签名的 thinking 块会在转换为提供商格式前被剥离。如果这会使 assistant 轮次为空，OpenClaw 会保留轮次形状，并使用非空的 omitted-reasoning 文本。
- 需要剥离的旧版仅 thinking assistant 轮次会被替换为非空的 omitted-reasoning 文本，以便提供商适配器不会丢弃该重放轮次。

**Amazon Bedrock（Converse API）**

- 空的 assistant 流错误轮次会在重放前修复为非空的回退文本块。Bedrock Converse 会拒绝 `content: []` 的 assistant 消息，因此持久化的、`stopReason: "error"` 且内容为空的 assistant 轮次也会在加载前修复到磁盘上。
- 仅包含空白文本块的 assistant 流错误轮次会从内存中的重放副本中删除，而不是重放无效的空白块。
- 会话被压缩后，和 Anthropic 上文相同，压缩前的 assistant thinking 签名会在 Converse 重放前被剥离。
- 具有缺失、为空或空白重放签名的 Claude thinking 块会在 Converse 重放前被剥离。如果这会使 assistant 轮次为空，OpenClaw 会保留轮次形状，并使用非空的 omitted-reasoning 文本。
- 需要剥离的旧版仅 thinking assistant 轮次会被替换为非空的 omitted-reasoning 文本，以便 Converse 重放保持严格的轮次形状。
- 重放会过滤 OpenClaw delivery-mirror 和 gateway 注入的 assistant 轮次。
- 图像清理适用于全局规则。

**Mistral（包括基于 model-id 的检测）**

- 工具调用 ID 清理：strict9（字母数字，长度 9）。

**OpenRouter Gemini**

- 思维签名清理：剥离非 base64 的 `thought_signature` 值（保留 base64）。

**OpenRouter Anthropic**

- 当启用 reasoning 时，已验证的 OpenRouter OpenAI 兼容 Anthropic 模型有效载荷中的末尾 assistant prefill 轮次会被剥离，这与直接 Anthropic 和 Cloudflare Anthropic 的重放行为一致。

**其他所有情况**

- 仅图像清理。

---

## 历史行为（2026.1.22 之前）

在 2026.1.22 版本发布之前，OpenClaw 对转录内容应用了多层清理：

- 一个 **transcript-sanitize 扩展** 会在每次上下文构建时运行，并且可以：
  - 修复工具使用/结果配对。
  - 清理工具调用 id（包括一种保留 `_`/`-` 的非严格模式）。
- 运行器还会执行特定于提供方的清理，从而造成重复工作。
- 还有一些在提供方策略之外的额外变更，包括在持久化之前从助手文本中移除 `<final>` 标签、删除空的助手错误轮次，以及在工具调用之后截断助手内容。

这种复杂性引发了跨提供方回归问题（尤其是 `openai-responses` 的 `call_id|fc_id` 配对）。2026.1.22 的清理移除了该扩展，将逻辑集中到运行器中，并使 OpenAI 除了图像清理之外保持 **不触碰**。

## 相关内容

- [会话管理](/concepts/session)
- [会话裁剪](/concepts/session-pruning)。
