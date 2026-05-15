---
summary: "参考：提供商特定的转录清理与修复规则"
read_when:
  - 你正在调试与转录形状相关的提供商请求拒绝问题
  - 你正在更改转录清理或工具调用修复逻辑
  - 你正在调查跨提供商的工具调用 id 不匹配问题
title: "转录卫生"
---

OpenClaw 会在运行前对转录应用**提供商特定的修复**（构建模型上下文）。这些修复大多是**内存中**调整，用于满足严格的提供商要求。另有一个单独的会话文件修复流程，可能会在会话加载前重写已存储的 JSONL，但仅限于格式错误的行，或已持久化但并非有效持久化记录的轮次。已交付的 assistant 回复会保留在磁盘上；提供商特定的 assistant 前置填充剥离仅在构建出站负载时发生。发生修复时，原始文件会与会话文件一起备份。

范围包括：

- 仅运行时提示上下文，不进入用户可见的转录轮次
- 工具调用 id 清理
- 工具调用输入验证
- 工具结果配对修复
- 轮次验证 / 排序
- 思考签名清理
- 思维签名清理
- 图像负载清理
- 在提供商回放前清理空文本块
- 用户输入来源标记（用于会话间路由提示）
- Bedrock Converse 回放的空 assistant 错误轮次修复

如果你需要转录存储详情，请参阅：

- [会话管理深度解析](/reference/session-management-compaction)

---

## 全局规则：运行时上下文不是用户转录

运行时/系统上下文可以作为某一轮的模型提示的一部分添加到模型中，但它
不是终端用户编写的内容。OpenClaw 为 Gateway 回复、排队的后续跟进、ACP、CLI，以及嵌入式 Pi 运行保留了单独的、面向转录的提示正文。存储的可见用户轮次会使用该转录正文，而不是
运行时增强后的提示。

对于已经持久化了运行时包装器的旧会话，Gateway 历史界面会在将消息返回给 WebChat、
TUI、REST 或 SSE 客户端之前应用显示投影。

---

## 适用位置

所有转录清理都集中在嵌入式运行器中：

- 策略选择：`src/agents/transcript-policy.ts`
- 清理/修复应用：`sanitizeSessionHistory`，位于 `src/agents/pi-embedded-runner/replay-history.ts`

该策略使用 `provider`、`modelApi` 和 `modelId` 来决定应用哪些内容。

与转录清理分开，会话文件会在加载前（如有需要）进行修复：

- `repairSessionFileIfNeeded`，位于 `src/agents/session-file-repair.ts`
- 由 `run/attempt.ts` 和 `compact.ts`（嵌入式运行器）调用

---

## 全局规则：图像清理

图像负载始终会被清理，以防止因大小限制而被提供商端拒绝（对过大的 base64 图像进行缩放/重新压缩）。

这也有助于控制具备视觉能力模型的图像驱动 token 压力。
较小的最大尺寸通常会减少 token 使用；较大的尺寸则保留更多细节。

实现：

- `sanitizeSessionMessagesImages`，位于 `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages`，位于 `src/agents/tool-images.ts`
- 最大图像边长可通过 `agents.defaults.imageMaxDimensionPx` 配置（默认：`1200`）。
- 在此过程遍历回放内容时，会移除空文本块。变为空的 assistant
  轮次会从回放副本中删除；变为空的 user 和 tool-result 轮次会接收一个非空的省略内容占位符。

---

## 全局规则：格式错误的工具调用

缺少 `input` 和 `arguments` 的 assistant 工具调用块会在构建模型上下文之前被删除。
这可以防止因部分持久化的工具调用而导致提供商拒绝请求（例如，在速率限制失败之后）。

实现：

- `sanitizeToolCallInputs`，位于 `src/agents/session-transcript-repair.ts`
- 在 `src/agents/pi-embedded-runner/replay-history.ts` 中的 `sanitizeSessionHistory` 里应用

---

## 全局规则：会话间输入来源

当代理通过 `sessions_send` 将提示发送到另一个会话时（包括
agent-to-agent 的 reply/announce 步骤），OpenClaw 会将创建的 user 轮次持久化为：

- `message.provenance.kind = "inter_session"`

OpenClaw 还会在路由提示文本之前，预先添加一个同轮次的 `[Inter-session message ... isUser=false]`
标记，以便当前模型调用能够区分来自其他会话的输出与外部终端用户指令。此标记在可用时会包含来源会话、频道和工具。为了兼容提供商，转录仍然使用 `role: "user"`，但可见文本和 provenance 元数据都会将该轮次标记为会话间数据。

在重建上下文期间，OpenClaw 会将相同标记应用于那些仅具有 provenance 元数据的旧持久化
会话间 user 轮次。

---

## 提供商矩阵（当前行为）

**OpenAI / OpenAI Codex**

- 仅图像清理。
- 丢弃孤立的 reasoning 签名（没有后续内容块的独立 reasoning 项），适用于 OpenAI Responses/Codex 转录；并在模型路由切换后丢弃可回放的 OpenAI reasoning。
- 保留可回放的 OpenAI Responses reasoning 项负载，包括加密的空摘要项，以便手动/WebSocket 回放将必需的 `rs_*` 状态与 assistant 输出项正确配对。
- 原生 ChatGPT Codex Responses 通过在保留会话 `prompt_cache_key` 的同时，回放先前的 Responses reasoning/message/function 负载（不包含先前项 id），遵循 Codex 的线协议一致性。
- 不进行工具调用 id 清理。
- 工具结果配对修复可以移动真实的匹配输出，并为缺失的工具调用综合生成 Codex 风格的 `aborted` 输出。
- 不进行轮次验证或重排序。
- 缺失的 OpenAI Responses 系列工具输出会被综合为 `aborted`，以匹配 Codex 回放规范化。
- 不剥离 thought 签名。

**OpenAI-compatible Chat Completions**

- 历史 assistant 思考/reasoning 块会在回放前被剥离，因此
  本地和代理式 OpenAI-compatible 服务器不会接收到上一轮的
  reasoning 字段，例如 `reasoning` 或 `reasoning_content`。
- 当前同轮次的工具调用续接会保留 assistant reasoning 块
  附着在工具调用上，直到工具结果被回放。
- 当提供商自有异常要求回放 reasoning 元数据时，可选择退出。

**Google（Generative AI / Gemini CLI / Antigravity）**

- 工具调用 id 清理：严格字母数字。
- 工具结果配对修复和合成工具结果。
- 轮次验证（Gemini 风格的轮次交替）。
- Google 轮次排序修正（如果历史以 assistant 开头，则前置一个很小的 user 启动轮）。
- Antigravity Claude：规范化 thinking 签名；丢弃未签名的 thinking 块。

**Anthropic / Minimax（兼容 Anthropic）**

- 工具结果配对修复和合成工具结果。
- 轮次验证（合并连续 user 轮次以满足严格交替）。
- 当启用 thinking 时，输出给 Anthropic Messages 负载的 trailing assistant prefill 轮次会被剥离，
  包括 Cloudflare AI Gateway 路由。
- 在转换为提供商格式之前，会剥离缺少、为空或为空白的 replay 签名的 thinking 块。若这会使某个 assistant 轮次变空，则 OpenClaw 会保留轮次形状，并使用非空的省略 reasoning 文本。
- 需要剥离的旧 thinking-only assistant 轮次会被替换为非空的省略 reasoning 文本，以便提供商适配器不会丢弃回放轮次。

**Amazon Bedrock（Converse API）**

- 在回放前，将空的 assistant stream-error 轮次修复为非空的回退文本块。Bedrock Converse 会拒绝 `content: []` 的 assistant 消息，因此持久化的、`stopReason: "error"` 且内容为空的 assistant 轮次也会在加载前于磁盘上修复。
- 仅包含空白文本块的 assistant stream-error 轮次会从内存中的回放副本中删除，而不是回放无效的空白块。
- 具有缺失、为空或为空白 replay 签名的 Claude thinking 块会在 Converse 回放前被剥离。如果这会使 assistant 轮次变空，则 OpenClaw 会保留轮次形状，并使用非空的省略 reasoning 文本。
- 需要剥离的旧 thinking-only assistant 轮次会被替换为非空的省略 reasoning 文本，以便 Converse 回放保持严格的轮次形状。
- 回放会过滤 OpenClaw delivery-mirror 和 gateway 注入的 assistant 轮次。
- 图像清理适用全局规则。

**Mistral（包括基于 model-id 的检测）**

- 工具调用 id 清理：strict9（长度为 9 的字母数字）。

**OpenRouter Gemini**

- 思考签名清理：剥离非 base64 的 `thought_signature` 值（保留 base64）。

**OpenRouter Anthropic**

- 启用 reasoning 时，会从已验证的 OpenRouter OpenAI 兼容 Anthropic 模型负载中剥离结尾的 assistant 前置填充轮次，这与直接 Anthropic 和 Cloudflare Anthropic 的回放行为一致。

**Everything else**

- 仅图像清理。

---

## 历史行为（2026.1.22 之前）

在 2026.1.22 发布之前，OpenClaw 应用了多层转录清理：

- 一个**transcript-sanitize 扩展**在每次上下文构建时运行，并且可以：
  - 修复工具使用/结果配对。
  - 清理工具调用 id（包括一种非严格模式，可保留 `_`/`-`）。
- 运行器也执行了提供商特定清理，这导致了重复工作。
- 额外的变更发生在提供商策略之外，包括：
  - 在持久化前从 assistant 文本中剥离 `<final>` 标签。
  - 删除空的 assistant 错误轮次。
  - 在工具调用后裁剪 assistant 内容。

这种复杂性导致了跨提供商回归（尤其是 `openai-responses`
`call_id|fc_id` 配对）。2026.1.22 的清理移除了该扩展，将逻辑集中到运行器中，并使 OpenAI 在图像清理之外保持**不接触**。

## 相关内容

- [会话管理](/concepts/session)
- [会话裁剪](/concepts/session-pruning)
