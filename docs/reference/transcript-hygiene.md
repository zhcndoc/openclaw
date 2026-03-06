---
summary: "参考：特定提供商的转录清理和修复规则"
read_when:
  - 你正在调试与转录格式相关的提供商请求拒绝问题
  - 你正在修改转录清理或工具调用修复逻辑
  - 你正在调查跨提供商的工具调用 ID 不匹配问题
title: "转录清理"
---

# 转录清理（提供商修复）

本文档描述了在运行前（构建模型上下文时）对转录内容应用的**特定提供商修复**。这些调整是**内存中**进行的，用以满足严格的提供商要求。这些清理步骤**不会**重写磁盘上存储的 JSONL 转录文件；不过，在会话加载前可能会通过独立的会话文件修复流程丢弃无效行，从而重写格式错误的 JSONL 文件。如果进行了修复，源文件将与会话文件一起备份。

涵盖范围包括：

- 工具调用 ID 清理
- 工具调用输入验证
- 工具结果配对修复
- 回合验证/排序
- 思维签名清理
- 图像载荷清理
- 用户输入来源标记（针对跨会话路由的提示）

如果需要转录存储详情，请参阅：

- [/reference/session-management-compaction](/reference/session-management-compaction)

---

## 执行位置

所有转录清理操作均集中在嵌入式运行器中：

- 策略选择：`src/agents/transcript-policy.ts`
- 清理/修复应用：`src/agents/pi-embedded-runner/google.ts` 中的 `sanitizeSessionHistory`

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

- `src/agents/session-transcript-repair.ts` 中的 `sanitizeToolCallInputs`
- 在 `src/agents/pi-embedded-runner/google.ts` 的 `sanitizeSessionHistory` 中应用

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
- 对 OpenAI Responses/Codex 转录，丢弃孤立的推理签名（即没有后续内容块的独立推理项）。
- 不进行工具调用 ID 清理。
- 不修复工具结果配对。
- 不验证或重排序回合。
- 不生成合成工具结果。
- 不剥离思维签名。

**Google（生成式 AI / Gemini CLI / Antigravity）**

- 工具调用 ID 清理：严格要求字母数字字符。
- 工具结果配对修复及合成工具结果生成。
- 回合验证（Gemini 风格的回合交替）。
- Google 回合排序修正（若历史以助手开头则前置一个微小用户引导）。
- Antigravity Claude：规范化思考签名；丢弃无签名思考块。

**Anthropic / Minimax（兼容 Anthropic）**

- 工具结果配对修复及合成工具结果生成。
- 回合验证（合并连续用户回合以满足严格轮替）。

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

这种复杂性导致跨提供商的回归问题（特别是 `openai-responses` 中 `call_id|fc_id` 配对）。2026.1.22 的整理移除了扩展，统一逻辑于运行器中，并使 OpenAI 除了图像清理外不做额外处理。
