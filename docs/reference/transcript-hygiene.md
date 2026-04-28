---
summary: "参考：特定提供商的转录清理和修复规则"
read_when:
  - 你在调试与转录形状相关的提供商请求拒绝问题
  - 你正在更改转录清理或工具调用修复逻辑
  - 你在调查跨提供商的工具调用 id 不匹配问题
title: "转录卫生"
---

OpenClaw 在一次运行（构建模型上下文）之前会对转录应用**特定于提供商的修复**。其中大多数是用于满足严格提供商要求的**内存中**调整。单独的会话文件修复步骤也可能在会话加载前重写存储的 JSONL，方式要么是删除格式错误的 JSONL 行，要么是修复在语法上有效但已知会在回放时被某个提供商拒绝的持久化回合。发生修复时，原始文件会与会话文件一起备份。

涵盖范围包括：

- 仅运行时的提示上下文不出现在用户可见的转录轮次中
- 工具调用 id 清理
- 工具调用输入验证
- 工具结果配对修复
- 回合验证 / 排序
- 思维签名清理
- 图像载荷清理
- 用户输入来源标记（用于跨会话路由的提示）

如果需要转录存储详情，请参阅：

- [/reference/session-management-compaction](/reference/session-management-compaction)

---

## 全局规则：运行时上下文不是用户转录

运行时/系统上下文可以添加到某一轮的模型提示中，但它不是最终用户编写的内容。OpenClaw 为 Gateway 回复、排队的后续操作、ACP、CLI 以及嵌入式 Pi 运行维护了单独的、面向转录的提示正文。已存储的可见用户轮次使用该转录正文，而不是带有运行时增强的提示。

对于已经持久化了运行时包装器的旧会话，Gateway 历史展示在向 WebChat、TUI、REST 或 SSE 客户端返回消息之前会先应用显示投影。

---

## 运行位置

所有转录清理操作均集中在嵌入式运行器中：

- 策略选择：`src/agents/transcript-policy.ts`
- 清理/修复应用：`src/agents/pi-embedded-runner/replay-history.ts` 中的 `sanitizeSessionHistory`

该策略根据 `provider`、`modelApi` 和 `modelId` 决定应用哪些规则。

与转录清理分开的是，在加载前会修复会话文件（如有必要）：

- `src/agents/session-file-repair.ts` 中的 `repairSessionFileIfNeeded`
- 由 `run/attempt.ts` 和 `compact.ts`（嵌入式运行器）调用

---

## 全局规则：图像清理

图像载荷始终进行清理，以防止因大小限制被提供商拒绝（对超大 base64 图像进行降采样/重新压缩）。

这也有助于控制具备视觉能力模型的图像驱动令牌压力。较低的最大尺寸通常减少令牌使用；较高尺寸保留细节。

实现：

- `src/agents/pi-embedded-helpers/images.ts` 中的 `sanitizeSessionMessagesImages`
- `src/agents/tool-images.ts` 中的 `sanitizeContentBlocksImages`
- 最大图像边长通过 `agents.defaults.imageMaxDimensionPx` 可配置（默认值：`1200`）

---

## 全局规则：格式错误的工具调用

缺失 `input` 和 `arguments` 的助手工具调用块在构建模型上下文前会被丢弃。此举防止提供商因部分保存的工具调用（例如速率限制失败后）而拒绝。

实现：

- `sanitizeToolCallInputs` in `src/agents/session-transcript-repair.ts`
- Applied in `sanitizeSessionHistory` in `src/agents/pi-embedded-runner/replay-history.ts`

---

## 全局规则：跨会话输入来源

当代理通过 `sessions_send` 将提示发送到另一个会话（包括代理间回复/通知步骤）时，OpenClaw 会将创建的用户对话持久化，并附加以下元数据：

- `message.provenance.kind = "inter_session"`

此元数据在追加转录时写入，且不改变角色（为保证兼容性，角色仍为 `role: "user"`）。转录读取者可据此避免将路由的内部提示当做最终用户编写的指令。

在上下文重建时，OpenClaw 还会在内存中为这些用户对话前置一个简短的 `[Inter-session message]` 标记，以便模型区分它们与外部最终用户指令。

---

## 提供商矩阵（当前行为）

**OpenAI / OpenAI Codex**

- 仅图像清理。
- 对于 OpenAI Responses/Codex 转录，丢弃孤立的思维签名（没有后续内容块的独立思维项），并在模型路由切换后丢弃可回放的 OpenAI 思维内容。
- 保留可回放的 OpenAI Responses 思维项载荷，包括加密的空摘要项，以便手动/WebSocket 回放能够将所需的 `rs_*` 状态与助手输出项正确配对。
- 不进行工具调用 id 清理。
- 工具结果配对修复可能会移动真实匹配的输出，并为缺失的工具调用合成 Codex 风格的 `aborted` 输出。
- 不进行回合验证或重排序。
- 缺失的 OpenAI Responses 系列工具输出会被合成为 `aborted`，以匹配 Codex 回放规范化。
- 不剥离思维签名。

**兼容 OpenAI 的 Gemma 4**

- 历史助手思考/推理块在回放前会被剥离，因此本地兼容 OpenAI 的 Gemma 4 服务器不会接收到上一轮的推理内容。
- 当前同轮的工具调用续接会让助手推理块继续附着在工具调用上，直到工具结果被回放为止。

**Google（Generative AI / Gemini CLI / Antigravity）**

- 工具调用 ID 清理：严格要求字母数字字符。
- 工具结果配对修复及合成工具结果生成。
- 回合验证（Gemini 风格的回合交替）。
- Google 回合排序修正（若历史以助手开头则前置一个微小用户引导）。
- Antigravity Claude：规范化思考签名；丢弃无签名思考块。

**Anthropic / Minimax（兼容 Anthropic）**

- 工具结果配对修复和合成工具结果。
- 回合验证（合并连续用户回合以满足严格交替）。
- 当启用思考时，发送到 Anthropic Messages 的负载中会剥离尾随的助手预填回合，包括 Cloudflare AI Gateway 路由。
- 在提供商转换之前，会剥离缺失、空白或留空回放签名的思考块。如果这会使某个助手回合为空，OpenClaw 会保留回合形状，并使用非空的 omitted-reasoning 文本。
- 必须被剥离的旧版仅思考助手回合会被替换为非空的 omitted-reasoning 文本，这样提供商适配器就不会丢弃回放回合。

**Mistral（包括基于模型 ID 的检测）**

- 工具调用 ID 清理：严格9字符字母数字。

**OpenRouter Gemini**

- 思维签名清理：剥离非 base64 的 `thought_signature` 值（保留 base64）。

**其他提供商**

- 仅图像清理。

---

## 历史行为（2026.1.22 之前）

在2026.1.22版本发布之前，OpenClaw 对转录内容应用了多层清理：

- 一个**转录清理扩展**在每次构建上下文时运行，能够：
  - 修复工具调用与结果的配对。
  - 清理工具调用 ID（包括一种非严格模式，允许保留 `_` 和 `-`）。
- 运行器也执行了特定提供商的清理，与扩展有重复工作。
- 提供商策略外还有额外变更，包括：
  - 持久化前从助手文本中剥离 `<final>` 标签。
  - 丢弃空的助手错误回合。
  - 工具调用后剪裁助手内容。

这种复杂性导致了跨提供商回归问题（尤其是 `openai-responses`
`call_id|fc_id` 配对）。2026.1.22 的清理移除了该扩展，将逻辑集中到运行器中，并使 OpenAI 除了图像清理之外完全**不做额外处理**。

## 相关内容

- [会话管理](/concepts/session)
- [会话剪裁](/concepts/session-pruning)
