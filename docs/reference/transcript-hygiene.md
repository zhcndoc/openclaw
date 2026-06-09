---
summary: "参考：提供商特定的转录清理与修复规则"
read_when:
  - 你正在调试与转录形状相关的提供商请求拒绝问题
  - 你正在更改转录清理或工具调用修复逻辑
  - 你正在调查跨提供商的工具调用 id 不匹配问题
title: "转录卫生"
---

OpenClaw 在一次运行前（构建模型上下文时）会对转录应用**特定于提供商的修复**。其中大多数是用于满足严格提供商要求的**内存中**调整。另一个会话文件修复步骤也可能会在会话加载前重写存储的 JSONL，但仅限于格式错误的行或持久化轮次中无效的持久记录。已送达的 assistant 回复会保留在磁盘上；特定于提供商的 assistant 预填充剥离只会在构建外发载荷时发生。发生修复时，原始文件会在原子替换之前写入一个临时的 `*.bak-<pid>-<ts>` 同级文件，并在替换成功后移除；只有在清理本身失败时才会保留备份（此时会将路径回报）。

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

运行时/系统上下文可以添加到某一轮的模型提示中，但它不是终端用户创作的内容。OpenClaw 会为 Gateway 回复、排队的后续请求、ACP、CLI 以及嵌入式 OpenClaw 运行保留单独的、面向转录的提示正文。已存储的可见用户轮次使用该转录正文，而不是运行时增强后的提示。

对于已经持久化了运行时包装器的旧会话，Gateway 历史界面会在将消息返回给 WebChat、
TUI、REST 或 SSE 客户端之前应用显示投影。

---

## 适用位置

所有转录清理都集中在嵌入式运行器中：

- Policy selection: `src/agents/transcript-policy.ts`
- Sanitization/repair application: `sanitizeSessionHistory` in `src/agents/embedded-agent-runner/replay-history.ts`

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

- `sanitizeSessionMessagesImages` in `src/agents/embedded-agent-helpers/images.ts`
- `sanitizeContentBlocksImages` in `src/agents/tool-images.ts`
- Max image side is configurable via `agents.defaults.imageMaxDimensionPx` (default: `1200`).
- Blank text blocks are removed while this pass walks replay content. Assistant
  turns that become empty are dropped from the replay copy; user and tool-result
  turns that become empty receive a non-empty omitted-content placeholder.

---

## 全局规则：格式错误的工具调用

缺少 `input` 和 `arguments` 的 assistant 工具调用块会在构建模型上下文之前被删除。
这可以防止因部分持久化的工具调用而导致提供商拒绝请求（例如，在速率限制失败之后）。

实现：

- `sanitizeToolCallInputs` in `src/agents/session-transcript-repair.ts`
- Applied in `sanitizeSessionHistory` in `src/agents/embedded-agent-runner/replay-history.ts`

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

- Image sanitization only.
- Drop orphaned reasoning signatures (standalone reasoning items without a following content block) for OpenAI Responses/Codex transcripts, and drop replayable OpenAI reasoning after a model route switch.
- Preserve replayable OpenAI Responses reasoning item payloads, including encrypted empty-summary items, so manual/WebSocket replay keeps required `rs_*` state paired with assistant output items.
- Native ChatGPT Codex Responses follows Codex wire parity by replaying prior Responses reasoning/message/function payloads without prior item IDs while preserving session `prompt_cache_key`.
- OpenAI Responses-family replay preserves canonical `call_*|fc_*` same-model reasoning pairs, but deterministically normalizes malformed or overlong `call_id` / function-call item ids before pi-ai payload conversion.
- Tool result pairing repair may move real matched outputs and synthesize Codex-style `aborted` outputs for missing tool calls.
- No turn validation or reordering.
- Missing OpenAI Responses-family tool outputs are synthesized as `aborted` to match Codex replay normalization.
- No thought signature stripping.

**OpenAI-compatible Chat Completions**

- Historical assistant thinking/reasoning blocks are stripped before replay so
  local and proxy-style OpenAI-compatible servers do not receive prior-turn
  reasoning fields such as `reasoning` or `reasoning_content`.
- Current same-turn tool-call continuations keep the assistant reasoning block
  attached to the tool call until the tool result has been replayed.
- Custom/self-hosted model entries with `reasoning: true` preserve replayed
  reasoning metadata.
- Provider-owned exceptions can opt out when their wire protocol requires
  replayed reasoning metadata.

**Google（Generative AI / Gemini CLI / Antigravity）**

- 工具调用 id 清理：严格字母数字。
- 工具结果配对修复和合成工具结果。
- 轮次验证（Gemini 风格的轮次交替）。
- Google 轮次排序修正（如果历史以 assistant 开头，则前置一个很小的 user 启动轮）。
- Antigravity Claude：规范化 thinking 签名；丢弃未签名的 thinking 块。

**Anthropic / Minimax（兼容 Anthropic）**

- Tool result pairing repair and synthetic tool results.
- Turn validation (merge consecutive user turns to satisfy strict alternation).
- Trailing assistant prefill turns are stripped from outgoing Anthropic Messages
  payloads when thinking is enabled, including Cloudflare AI Gateway routes.
- Pre-compaction assistant thinking signatures are stripped before provider
  replay when a session has been compacted. Thinking signatures are
  cryptographically bound to the conversation prefix at generation time; after
  compaction the prefix changes (summarized content is replaced by a compaction
  summary), so replaying the original signatures causes Anthropic to reject the
  request with "Invalid signature in thinking block". The thinking text is
  preserved as an unsigned block and is then handled by the rule below.
- Thinking blocks with missing, empty, or blank replay signatures are stripped
  before provider conversion. If that empties an assistant turn, OpenClaw keeps
  turn shape with non-empty omitted-reasoning text.
- Older thinking-only assistant turns that must be stripped are replaced with
  non-empty omitted-reasoning text so provider adapters do not drop the replay
  turn.

**Amazon Bedrock（Converse API）**

- Empty assistant stream-error turns are repaired to a non-empty fallback text block
  before replay. Bedrock Converse rejects assistant messages with `content: []`, so
  persisted assistant turns with `stopReason: "error"` and empty content are also
  repaired on disk before load.
- Assistant stream-error turns that contain only blank text blocks are dropped
  from the in-memory replay copy instead of replaying an invalid blank block.
- Pre-compaction assistant thinking signatures are stripped before Converse
  replay when a session has been compacted, for the same reason as Anthropic
  above.
- Claude thinking blocks with missing, empty, or blank replay signatures are
  stripped before Converse replay. If that empties an assistant turn, OpenClaw
  keeps turn shape with non-empty omitted-reasoning text.
- Older thinking-only assistant turns that must be stripped are replaced with
  non-empty omitted-reasoning text so the Converse replay keeps strict turn shape.
- Replay filters OpenClaw delivery-mirror and gateway-injected assistant turns.
- Image sanitization applies through the global rule.

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
