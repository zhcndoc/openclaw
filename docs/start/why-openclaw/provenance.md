---
summary: "内存起源类、信任门控、删除边界和审计账本记录的非声明"
title: "出处"
read_when:
  - "你需要知道 OpenClaw 记录了什么以及它故意不记录什么"
  - "您正在评估内存中毒和删除保证"
  - "您需要记录遗忘限制和审计范围"
---

默认的 OpenClaw 内存后端保留 Markdown 工件以及 SQLite 索引和元数据（[ 内存架构](/concepts/memory-architecture)）。每个索引块都带有存储在散文外部的原始类（`owner`、`agent`、`untrusted`、`system`）。因此，召回的文本无法提升其自身的信任级别，并且分类永远不会默认为 `owner`。像 Zep 的 Graphiti 这样的图形存储层也可以追踪事实的来源。 OpenClaw 添加的是一个消耗出处的门。在构建合并提示之前，[dreaming](/concepts/dreaming) 合并通行证会删除 `untrusted` 和 `system` 候选者。自动会话摄取不包括 [cron](/automation/cron-jobs)、[heartbeat](/gateway/heartbeat) 和 [subagent](/tools/subagents) 会话。这些排除不会阻止具有所需访问权限的工具直接写入文件。污点也会在回合内跟随内容。在网络来源的工具得出结果后，该轮中的每条后来的助理消息都会被标记为受污染，并将内存分类为 `untrusted`，无论是谁在说话。交叉对话回忆有一个固定的边界：组和通道既不是源也不是目标（[活动内存](/concepts/active-memory)）。

相关研究提供了背景信息，而不是对 OpenClaw 实现的验证。 [Generative Agents](https://arxiv.org/abs/2304.03442) 探索检索中的相关性、新近度和重要性。 [MMR](https://dl.acm.org/doi/10.1145/290941.291025) 平衡相关性和多样性。 [睡眠时间计算](https://arxiv.org/abs/2504.13171) 研究查询之前有用的预计算。 [LongMemEval](https://arxiv.org/html/2410.10813v2) 表明保留的细节、索引、检索和阅读策略都会影响长期回忆。 [MINJA](https://arxiv.org/abs/2503.03704) 和 [OWASP ASI06](https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/) 等内存中毒工作会激发谨慎的信任边界。出处限制的促销并不能建立对每次中毒攻击的免疫力。 [TriggerBench](https://arxiv.org/abs/2606.23459) 研究前瞻性记忆，OpenClaw 还通过明确的 [ 长期意图 ](/concepts/standing-intents) 解决了这个问题。

删除需要单独区分。 [Ghost Vectors](https://arxiv.org/abs/2606.18497) 检查软删除矢量存储的恢复。忘记的会话记录可防止通过参与的 OpenClaw 路径重新摄取。它们不会对底层存储进行物理或加密擦除。

自动会话摄取和回填跟踪的条目通过合并保留其原始会话。合并时进行起源联合，并在取代时重新键入密钥，并且模型本身从不带有出处。 [ 准入策略](/reference/memory-config) 可以使指定的会话远离梦境摄取，并且通过记录的、可逆的排除来保证会话回填。 [`openclaw memory forget`](/cli/memory) 清除归因条目、精确的日记引用、索引行、向量、嵌入缓存和重写备份。然后，它会阻止重新摄取具有持久的被遗忘会话记录的选定会话。参与者选择器选择涉及该参与者的整个会话，而不仅仅是他们的消息。直接编辑、未跟踪的记忆和释义、原始转录本、其他代理的存储、导出和外部副本都需要单独审查。承认或遗忘都不是一般擦除保证（[删除边界](/concepts/memory-provenance#what-deletion-does-not-cover)）。

被遗忘的会话记录保护特定边界：OpenClaw 的参与摄取、回填和索引路径不会从该代理存储中的那些会话 ID 恢复数据。它们不会阻止稍后的对话、直接文件写入或另一个内存插件引入相同的信息。出处和删除应根据这些记录的边界进行评估，而不是视为普遍不复活或监管合规性的证据。

[audit 账本](/gateway/audit) 存储身份、排序、操作和结果代码。它从不存储提示、正文、参数或文件名。查询强制执行带有行上限的 30 天保留截止时间，并且物理修剪是批量的。决策收据使用封闭词汇表，其中 `enforced` 标记来自实际控制操作的门的决策。单纯的成功永远不会升级为授权证明。这些文档发布了他们自己的非声明，包括“没有一行证明什么都没有”以及假名是关联而不是匿名。 [OpenTelemetry](/gateway/opentelemetry) 可以将操作诊断导出到 SIEM，但有界队列、采样、关闭和导出器故障可能会丢失数据。这两种表面都承诺无损合规性存档。

参与通道入口队列将耗尽其重试策略的事件保留在可检查、可重新提交的 [ 死信队列 ](/cli/channels) 中。这并不涵盖每个入站路径：IMAP 通过单独的挂钩路径触发调度，而无需通道死信重新提交。出站消息携带分阶段的终端状态。设计目标是每个行动的可见结果或记录的、有意的非结果。上述审计范围和损失限额仍然适用。

独立核查存在于三个层面。有一个社区 [ 威胁模型映射到 MITRE ATLAS](/security/THREAT-MODEL-ATLAS)。最危险的授权和隔离路径有 [TLA+ 模型](/security/formal-verification)。这些是设计模型，在有界状态空间中进行检查，并且它们并未确定“TypeScript 已验证”，如文档所述。还有一个公开的 [ 成熟度记分卡 ](/maturity/scorecard) 对我们的覆盖范围进行评分。
