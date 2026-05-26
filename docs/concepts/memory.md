---
summary: "OpenClaw 如何在会话之间记住内容"
title: "记忆概览"
read_when:
  - 你想了解记忆是如何工作的
  - 你想知道应该写入哪些记忆文件
---

OpenClaw 通过在你的 agent 工作区中写入 **纯 Markdown 文件** 来记住内容。模型只会“记住”那些被保存到磁盘上的内容——不存在隐藏状态。

## 它是如何工作的

你的 agent 有三个与记忆相关的文件：

- **`MEMORY.md`** — 长期记忆。持久的事实、偏好和
  决策。会在每个 DM 会话开始时加载。
- **`memory/YYYY-MM-DD.md`**（或 **`memory/YYYY-MM-DD-<slug>.md`**）— 每日日记。
  运行中的上下文和观察。今天和昨天的日记会被
  自动加载，带有 slug 的变体（例如由捆绑的
  session-memory hook 在 `/new` 或 `/reset` 时写入的文件）现在也会与
  仅日期文件一起被读取。
- **`DREAMS.md`**（可选）— Dream Diary 和 dreaming sweep
  总结，供人工审阅，包括有依据的历史回填条目。

这些文件位于 agent 工作区中（默认 `~/.openclaw/workspace`）。

## 写入内容的位置

`MEMORY.md` 是紧凑、经过整理的层。把它用于持久事实、
偏好、固定决策，以及应在
主私有会话开始时可用的简短摘要。它不适合用作原始对话记录、
每日日志或详尽归档。

`memory/YYYY-MM-DD.md` 文件是工作层。把它们用于详细的每日
笔记、观察、会话摘要，以及之后可能仍然有用的
原始上下文。这些文件会被 `memory_search` 和 `memory_get` 索引，
但不会在每一轮都注入到正常的启动提示中。

随着时间推移，系统会期望 agent 将每日日记中的有用内容
提炼到 `MEMORY.md` 中，并移除过时的长期条目。
生成的工作区指令和 heartbeat 流程可以周期性地完成这件事；你不需要
为了每个被记住的细节都手动编辑 `MEMORY.md`。

如果 `MEMORY.md` 超过了启动文件预算，OpenClaw 会保留
磁盘上的原文件不变，但会截断注入模型上下文的副本。把这看作一个信号：
将详细内容移回 `memory/*.md`，在 `MEMORY.md` 中只保留
持久摘要，或者如果你明确希望花费更多提示预算，就提高启动限制。
使用 `/context list`、`/context detail` 或
`openclaw doctor` 查看原始大小与注入大小以及截断状态。

<Tip>
如果你希望你的 agent 记住某件事，只要告诉它：“记住我更喜欢 TypeScript。” 它就会把这件事写入相应的文件。
</Tip>

## 行为敏感的记忆

大多数记忆都可以作为普通的 Markdown 笔记来写。但有些记忆会影响 agent 之后应该怎么做。对于这类记忆，要记录“什么时候可以安全地执行这条笔记”，而不仅仅是事实本身。

当一条笔记涉及以下内容时，要捕捉这个行动边界：

- 审批或许可要求，
- 临时性约束，
- 交接给另一个会话、线程或人，
- 过期条件，
- 可安全执行的时机，
- 来源或所有者的权限，
- 用于避免诱人操作的指令。

一条有用的行为敏感记忆应清楚说明：

- 什么会改变未来行为，
- 它在什么时间或什么条件下适用，
- 它何时过期，或什么条件会解锁行动，
- agent 应该避免做什么，
- 如果这会影响信任或权限，谁是来源或所有者。

记忆可以保留审批上下文，但不会强制执行策略。对于硬性的操作控制，请使用 OpenClaw 审批设置、沙箱和计划任务。

示例：

```md
API 迁移正在另一个会话中设计。在迁移计划落地之前，未来的轮次不应修改本线程中的 API 实现；这里只能将发现作为设计输入使用。
```

另一个示例：

```md
一份来自不受信任来源的报告在晋升前需要审查。未来的轮次应把它仅当作证据；在可信审阅者确认内容之前，不要将其存为持久记忆。
```

对于推断出的、短期的后续事项，请使用 [承诺](/concepts/commitments)。对于精确提醒、定时检查和重复工作，请使用 [计划任务](/automation/cron-jobs)。记忆仍然可以总结这两条路径周围的持久上下文。

这并不是每条记忆都必须遵循的必需模式。简单事实可以保持简洁。只有在丢失时机、权限、过期信息或可安全执行上下文会导致 agent 以后做错事时，才使用行为敏感边界。

## 推断出的承诺

某些未来跟进事项并不是持久事实。如果你提到明天有面试，那么有用的记忆可能是“面试后跟进”，而不是“把这件事永久存到 `MEMORY.md` 里”。

[承诺](/concepts/commitments) 是针对这种情况的可选、短期跟进记忆。OpenClaw 会在一个隐藏的后台轮次中推断它们，将其限定在同一个 agent 和频道内，并通过 heartbeat 发送到期的跟进提醒。显式提醒仍然使用 [计划任务](/automation/cron-jobs)。

## 记忆工具

agent 有两个用于处理记忆的工具：

- **`memory_search`** —— 即使措辞与原文不同，也能通过语义搜索找到相关笔记。
- **`memory_get`** —— 读取指定的记忆文件或行范围。

这两个工具都由当前激活的 memory 插件提供（默认：`memory-core`）。

## Memory Wiki 配套插件

如果你希望持久记忆的行为更像一个维护良好的知识库，而不只是原始笔记，可以使用附带的 `memory-wiki` 插件。

`memory-wiki` 会将持久知识编译到一个 wiki 保管库中，具备以下特性：

- 确定性的页面结构
- 结构化的主张和证据
- 矛盾与新鲜度跟踪
- 生成式仪表盘
- 面向 agent/runtime 消费者的编译摘要
- wiki 原生工具，如 `wiki_search`、`wiki_get`、`wiki_apply` 和 `wiki_lint`

它不会取代当前激活的 memory 插件。当前激活的 memory 插件仍然负责回忆、晋升和 dreaming。`memory-wiki` 只是在旁边增加一层带有来源证明的知识层。

参见 [Memory Wiki](/plugins/memory-wiki)。

## 记忆搜索

当配置了 embedding 提供方时，`memory_search` 会使用 **混合搜索**——将向量相似度（语义含义）与关键词匹配（如 ID 和代码符号等精确术语）结合起来。只要你为任一支持的提供方配置了 API key，这项功能就会开箱即用。

<Info>
OpenClaw 会根据可用的 API key 自动检测你的 embedding 提供方。如果你配置了 OpenAI、Gemini、Voyage 或 Mistral 的 key，记忆搜索会自动启用。
</Info>

关于搜索的工作方式、调优选项以及提供方设置的详情，请参见
[记忆搜索](/concepts/memory-search)。

## 记忆后端

<CardGroup cols={3}>
<Card title="内置（默认）" icon="database" href="/concepts/memory-builtin">
基于 SQLite。开箱即用，支持关键词搜索、向量相似度和混合搜索。无需额外依赖。
</Card>
<Card title="QMD" icon="search" href="/concepts/memory-qmd">
本地优先的 sidecar，支持 reranking、query expansion，以及索引工作区之外目录的能力。
</Card>
<Card title="Honcho" icon="brain" href="/concepts/memory-honcho">
具备用户建模、语义搜索和多 agent 感知能力的 AI 原生跨会话记忆。通过插件安装。
</Card>
<Card title="LanceDB" icon="layers" href="/plugins/memory-lancedb">
内置的基于 LanceDB 的记忆，支持与 OpenAI 兼容的 embeddings、自动回忆、自动捕获，以及本地 Ollama embedding 支持。
</Card>
</CardGroup>

## 知识 wiki 层

<CardGroup cols={1}>
<Card title="Memory Wiki" icon="book" href="/plugins/memory-wiki">
将持久记忆编译为一个带有来源证明的 wiki 保管库，包含主张、仪表盘、桥接模式，以及适合 Obsidian 的工作流。
</Card>
</CardGroup>

## 自动记忆刷新

在 [压缩](/concepts/compaction) 总结你的对话之前，OpenClaw 会运行一个静默轮次，提醒 agent 将重要上下文保存到记忆文件中。此功能默认开启——你无需进行任何配置。

若要在本地模型上保留这个 housekeeping 轮次，请设置一个精确的 memory-flush model override：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "memoryFlush": {
          "model": "ollama/qwen3:8b"
        }
      }
    }
  }
}
```

该 override 仅应用于 memory-flush 轮次，不会继承 active session fallback chain。

<Tip>
记忆刷新可以防止在压缩期间丢失上下文。如果你的 agent 在对话中有重要事实尚未写入文件，它们会在总结发生之前自动保存。
</Tip>

## Dreaming

Dreaming 是一个可选的后台记忆整合过程。它会收集短期信号，给候选项打分，并且只将符合条件的条目晋升到长期记忆（`MEMORY.md`）中。

它的设计目标是让长期记忆保持高信噪比：

- **可选启用**：默认关闭。
- **定时执行**：启用后，`memory-core` 会自动管理一个用于完整 dreaming sweep 的定期 cron 作业。
- **设有阈值**：晋升必须通过分数、回忆频率和查询多样性门槛。
- **可审阅**：阶段总结和日记条目会写入 `DREAMS.md` 供人工审阅。

关于各阶段行为、评分信号以及 Dream Diary 细节，请参见
[Dreaming](/concepts/dreaming)。

## 有依据的回填与实时晋升

如今 dreaming 系统有两条密切相关的审阅通道：

- **实时 dreaming** 依赖 `memory/.dreams/` 下的短期 dreaming 存储，这也是正常 deep phase 在决定哪些内容可以晋升到 `MEMORY.md` 时所使用的内容。
- **有依据的回填** 会读取历史的 `memory/YYYY-MM-DD.md` 笔记，将其作为独立的日文件，并把结构化审阅输出写入 `DREAMS.md`。

当你想回放旧笔记，并查看系统认为哪些内容是持久的，而无需手动编辑 `MEMORY.md` 时，有依据的回填就很有用。

当你使用：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

时，有依据的持久候选项不会被直接晋升。它们会被暂存到正常 deep phase 已经使用的同一个短期 dreaming 存储中。这意味着：

- `DREAMS.md` 仍然是供人工审阅的界面。
- 短期存储仍然是面向机器的排序界面。
- `MEMORY.md` 仍然只会由 deep promotion 写入。

如果你认为这次回放没有用，可以移除这些暂存产物，而不会影响普通日记条目或正常的回忆状态：

```bash
openclaw memory rem-backfill --rollback
openclaw memory rem-backfill --rollback-short-term
```

## CLI

```bash
openclaw memory status          # 检查索引状态和提供方
openclaw memory search "query"  # 从命令行搜索
openclaw memory index --force   # 强制重建索引
```

## 延伸阅读

- [内置记忆引擎](/concepts/memory-builtin)：默认的 SQLite 后端。
- [QMD 记忆引擎](/concepts/memory-qmd)：高级本地优先 sidecar。
- [Honcho 记忆](/concepts/memory-honcho)：AI 原生跨会话记忆。
- [Memory LanceDB](/plugins/memory-lancedb)：基于 LanceDB 的插件，支持与 OpenAI 兼容的 embeddings。
- [Memory Wiki](/plugins/memory-wiki)：编译后的知识保管库和 wiki 原生工具。
- [记忆搜索](/concepts/memory-search)：搜索流水线、提供方和调优。
- [Dreaming](/concepts/dreaming)：从短期回忆到长期记忆的后台晋升。
- [记忆配置参考](/reference/memory-config)：所有配置选项。
- [压缩](/concepts/compaction)：压缩如何与记忆交互。

## 相关内容

- [Active memory](/concepts/active-memory)
- [记忆搜索](/concepts/memory-search)
- [内置记忆引擎](/concepts/memory-builtin)
- [Honcho 记忆](/concepts/memory-honcho)
- [Memory LanceDB](/plugins/memory-lancedb)
- [承诺](/concepts/commitments)
