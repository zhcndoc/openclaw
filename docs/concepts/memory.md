---
summary: "OpenClaw 如何跨会话记住内容"
title: "记忆概览"
read_when:
  - 你想了解记忆如何工作
  - 你想知道要写入哪些记忆文件
---

OpenClaw 通过在你的代理工作区中写入 **纯 Markdown 文件** 来记住内容。模型只“记住”那些被保存到磁盘上的内容——不存在隐藏状态。

## 工作原理

你的代理有三个与记忆相关的文件：

- **`MEMORY.md`** -- 长期记忆。持久化的事实、偏好和决策。会在每个私信会话开始时加载。
- **`memory/YYYY-MM-DD.md`** -- 每日笔记。持续运行中的上下文与观察记录。今天和昨天的笔记会自动加载。
- **`DREAMS.md`**（可选）-- Dream Diary 与 dreaming sweep 摘要，供人工审查使用，也包含 grounded 历史回填条目。

这些文件位于代理工作区中（默认 `~/.openclaw/workspace`）。

<Tip>
如果你想让代理记住某事，只需问它：“记住我更喜欢 TypeScript。”它会将内容写入适当的文件。
</Tip>

## 内存工具

代理有两个用于处理记忆的工具：

- **`memory_search`** -- 使用语义搜索查找相关笔记，即使措辞与原文不同。
- **`memory_get`** -- 读取特定的记忆文件或行范围。

这两个工具均由活动的记忆插件提供（默认：`memory-core`）。

## Memory Wiki 配套插件

如果你希望持久记忆的行为更像一个持续维护的知识库，而不只是原始笔记，可以使用捆绑的 `memory-wiki` 插件。

`memory-wiki` 会把持久知识编译成一个 wiki 知识库，具备：

- 可预测的页面结构
- 结构化的断言与证据
- 矛盾与新鲜度跟踪
- 自动生成的仪表盘
- 面向 agent/运行时消费者的编译摘要
- `wiki_search`、`wiki_get`、`wiki_apply`、`wiki_lint` 等 wiki 原生工具

它不会替代 active memory 插件。active memory 插件仍然负责 recall、promotion 和 dreaming。`memory-wiki` 是在其旁边增加一层具备来源追踪能力的知识层。

参见 [Memory Wiki](/plugins/memory-wiki)。

## Memory search

配置了嵌入提供商后，`memory_search` 使用 **混合搜索** —— 结合向量相似度（语义含义）与关键词匹配（确切术语，如 ID 和代码符号）。一旦你拥有任何受支持提供商的 API 密钥，这即可开箱即用。

<Info>
OpenClaw 会根据可用的 API 密钥自动检测你的嵌入提供商。如果你配置了 OpenAI、Gemini、Voyage 或 Mistral 密钥，记忆搜索将自动启用。
</Info>

有关搜索工作原理、调优选项和提供商设置的详细信息，请参阅 [记忆搜索](/concepts/memory-search)。

## 记忆后端

<CardGroup cols={3}>
<Card title="内置（默认）" icon="database" href="/concepts/memory-builtin">
基于 SQLite。开箱即用，支持关键词搜索、向量相似度和混合搜索。无需额外依赖。
</Card>
<Card title="QMD" icon="search" href="/concepts/memory-qmd">
本地优先的 sidecar，具有重排序、查询扩展以及索引工作区外目录的能力。
</Card>
<Card title="Honcho" icon="brain" href="/concepts/memory-honcho">
具有用户建模、语义搜索和多代理感知功能的 AI 原生跨会话记忆。需安装插件。
</Card>
</CardGroup>

## 知识 wiki 层

<CardGroup cols={1}>
<Card title="Memory Wiki" icon="book" href="/plugins/memory-wiki">
将持久记忆编译为一个具有来源信息的 wiki 保险库，包含断言、
仪表盘、桥接模式以及适用于 Obsidian 的工作流。
</Card>
</CardGroup>

## 自动记忆刷新

在 [压缩](/concepts/compaction) 总结你的对话之前，OpenClaw 会运行一个静默回合，提醒代理将重要的上下文保存到记忆文件中。默认启用——你无需配置任何内容。

<Tip>
记忆刷新可防止压缩期间的上下文丢失。如果你的代理在对话中有尚未写入文件的重要事实，它们将在总结发生之前自动保存。
</Tip>

## Dreaming（梦境）

梦境是记忆的一种可选后台巩固过程。它收集短期信号，对候选项进行评分，并仅将合格的项目提升为长期记忆（`MEMORY.md`）。

它旨在保持长期记忆的高信号：

- **主动启用**：默认禁用。
- **计划任务**：启用时，`memory-core` 自动管理一个循环的 cron 作业以进行完整的梦境扫描。
- **阈值限制**：提升必须通过分数、回忆频率和查询多样性门槛。
- **可审查**：阶段摘要和日记条目会写入 `DREAMS.md` 供人类审查。

有关阶段行为、评分信号和 Dream Diary 细节，请参见
[Dreaming](/concepts/dreaming)。

## Grounded backfill 与实时提升

dreaming 系统现在有两条紧密相关的审查路径：

- **Live dreaming** 从 `memory/.dreams/` 下的短期 dreaming 存储中工作，这也是正常 deep phase 在决定哪些内容可以晋升进 `MEMORY.md` 时使用的来源。
- **Grounded backfill** 会把历史的 `memory/YYYY-MM-DD.md` 笔记当作独立的日文件读取，并把结构化审查输出写入 `DREAMS.md`。

当你想重放旧笔记，并在不手动编辑 `MEMORY.md` 的情况下检查系统认为什么是“值得持久保留”的内容时，grounded backfill 很有用。

当你使用：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

这些 grounded 的持久候选项不会被直接提升。它们会被暂存到 normal deep phase 已经在使用的同一个短期 dreaming 存储中。这意味着：

- `DREAMS.md` 仍然是面向人工审查的界面。
- 短期存储仍然是面向机器的排序界面。
- `MEMORY.md` 仍然只会由 deep promotion 写入。

如果你认为这次重放没有帮助，可以移除这些暂存产物，而不影响普通日记条目或正常的 recall 状态：

```bash
openclaw memory rem-backfill --rollback
openclaw memory rem-backfill --rollback-short-term
```

## CLI

```bash
openclaw memory status          # 检查索引状态和提供商
openclaw memory search "query"  # 从命令行搜索
openclaw memory index --force   # 重建索引
```

## 进一步阅读

- [Builtin Memory Engine](/concepts/memory-builtin) -- 默认 SQLite 后端
- [QMD Memory Engine](/concepts/memory-qmd) -- 高级本地优先 sidecar
- [Honcho Memory](/concepts/memory-honcho) -- AI 原生跨会话记忆
- [Memory Wiki](/plugins/memory-wiki) -- 编译后的知识库和 wiki 原生工具
- [Memory Search](/concepts/memory-search) -- 搜索流水线、提供商与
  调优
- [Dreaming](/concepts/dreaming) -- 从短期回忆
  到长期记忆的后台提升
- [Memory configuration reference](/reference/memory-config) -- 所有配置项
- [Compaction](/concepts/compaction) -- 压缩如何与记忆交互

## 相关内容

- [Active memory](/concepts/active-memory)
- [Memory search](/concepts/memory-search)
- [Builtin memory engine](/concepts/memory-builtin)
- [Honcho memory](/concepts/memory-honcho)
