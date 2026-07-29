---
summary: "OpenClaw 如何在会话之间记住内容"
title: "记忆概览"
read_when:
  - 你想了解记忆是如何工作的
  - 你想知道应该写入哪些记忆文件
---

OpenClaw 通过在你的代理工作区中写入普通的 Markdown 文件来记住内容（默认 `~/.openclaw/workspace`）。模型只会记住被保存到磁盘的内容；没有隐藏状态。

## 它是如何工作的

Your agent has four memory-related files:

- **`USER.md`**（可选）— 以指令形式写入的稳定偏好、沟通风格、
  关系以及活跃项目上下文。在会话开始时，使用单独的小预算加载。
- **`MEMORY.md`** — 长期记忆。持久的非个人资料事实和决策。
  在会话开始时加载。
- **`memory/YYYY-MM-DD.md`**（或 `memory/YYYY-MM-DD-<slug>.md`）— 日常笔记。
  运行中的上下文和观察。当天和前一天的带日期笔记会在裸 `/new` 或 `/reset` 时自动加载；
  带 slug 的变体，例如捆绑的 session-memory hook 写入的文件，会与仅日期文件一起被拾取。
- **`DREAMS.md`**（可选）— 梦境日记和梦境扫描摘要，供人类审阅，
  包括有依据的历史回填条目。

<Tip>
如果你想让你的 agent 记住某件事，只需告诉它：“记住我
偏好 TypeScript。”它会把这条笔记写入合适的文件。
</Tip>

## 放在哪里

`USER.md` 是紧凑的用户模型层。请将稳定的偏好和个人资料事实写成命令式指令，并附上观察日期以及 active/superseded 元数据。当某个偏好发生变化时，应在原处将其 supersede，而不是追加一条相互矛盾的 active 指令。参见 [User model](/concepts/user-model)。

`MEMORY.md` 是紧凑、经过筛选的持久层，用于存放非个人资料类的持久事实、已作出的重要决定，以及在会话开始时应当可用的简短摘要。它不是原始对话记录、每日日志或穷尽式档案。

`memory/YYYY-MM-DD.md` 文件是工作层：包含详细的每日笔记、观察、会话摘要，以及之后可能仍然有用的原始上下文。这些内容会被索引供 `memory_search` 和 `memory_get` 使用，但不会在每一轮都注入到启动提示中。

随着时间推移，每日笔记中的有用内容会通过默认的 [dreaming](/concepts/dreaming) 扫描被提炼到 `MEMORY.md` 中。生成的工作区指令仍会鼓励代理在工作时记录持久事实，而 dreaming 负责后台整合。默认的 heartbeat 提示不会自行执行任何记忆维护。

如果 `MEMORY.md` 超过了启动文件预算，OpenClaw 会保留磁盘上的文件完整不变，但会截断注入到上下文中的副本。请把这视为一个信号：将详细内容移到 `memory/*.md` 中，只在 `MEMORY.md` 中保留持久摘要，或者如果你想投入更多提示预算，就提高启动限制。使用 `/context list`、`/context detail` 或 `openclaw doctor` 查看原始大小与注入大小以及截断状态。

## 导入编码助手

Control UI 可以从 Codex 和 Claude Code 导入现有的本地记忆。  
打开 **Settings** → **Import Memory**，选择目标代理，查看检测到的文件，并确认导入。OpenClaw 只复制 Markdown 记忆：

- Codex：位于 `~/.codex/memories`（或 `CODEX_HOME/memories`）下的汇总 `MEMORY.md` 和 `memory_summary.md` 文件。不导入原始 rollout 和 transcript 文件。
- Claude Code：来自 `~/.claude/projects/*/memory` 下每个项目自动记忆目录中的 Markdown 文件，以及（如果存在）用户配置的 `autoMemoryDirectory`。项目说明、会话、设置和凭据不属于此仅记忆操作。

导入的文件会在所选代理工作区中分别保存在 `memory/imports/codex/` 和 `memory/imports/claude-code/` 下。它们会被索引用于 `memory_search`，并可通过 `memory_get` 访问；它们不会合并到代理的启动 `MEMORY.md` 中。源文件保持不变。

预览会标记目标冲突。启用 **Replace existing imports** 以替换这些文件；应用时会创建已验证的预导入备份，并在迁移报告中保留被覆盖文件的逐项副本。

## 行动敏感记忆

大多数记忆都是普通的 Markdown 笔记。有些会影响智能体以后应该做什么；对于这些，应该记录何时可以安全地根据该笔记采取行动，而不仅仅是事实本身。

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

记忆可以保留审批上下文，但它不强制执行策略。请使用 OpenClaw 审批设置、沙箱和计划任务来实现硬性的操作控制。

示例：

```md
API 迁移正在另一个会话中设计。在迁移方案落地之前，未来的轮次不应修改此线程中的 API 实现；这里只能将发现内容用作设计输入。
```

另一个示例：

```md
来自不受信任来源的报告在晋升前需要审查。在可信审查者确认内容之前，未来的轮次应将其仅视为证据；不要将其存储为持久记忆。
```

这不是每条记忆都必须遵循的必需模式；简单事实可以保持简洁。若丢失时机、权限、过期或可安全行动的上下文可能导致智能体日后做出错误决定，则应使用行动敏感边界。

使用 [scheduled tasks](/automation/cron-jobs) 进行精确提醒、定时检查和重复性工作。记忆仍可总结围绕该工作的持久上下文。

## 已退役的推断承诺

有些未来的后续事项并不是持久的事实。如果某个未来事件应该触发
一个动作，请使用 [持续意图](/concepts/standing-intents)。如果某个时钟时间
应该触发它，请使用 [计划任务](/automation/cron-jobs)。

推断承诺实验已退役。OpenClaw 不再提取或
交付这些后续事项。请使用 [计划任务](/automation/cron-jobs) 来处理
未来动作；旧的 `openclaw commitments` 命令仍可用于
查看或忽略现有已存储的记录。

## 记忆工具

该代理有三个用于处理记忆的工具：

- **`memory_search`** — 使用语义搜索查找相关笔记，即使
  表述与原文不同。
- **`memory_get`** — 读取特定的记忆文件或行范围。
- **`intent`** — 创建、列出或显式取消事件条件的
  常驻意图。基于时间的提醒仍然继续使用计划任务。

这两个工具都由当前激活的记忆插件提供（默认：`memory-core`）。

## 记忆搜索

当配置了嵌入提供方时，`memory_search` 会使用混合搜索：
向量相似度（语义含义）结合关键词匹配（诸如 ID 和代码符号等精确
术语）。对于任何受支持的提供方，这都可以通过 API 密钥开箱即用。

<Info>
OpenClaw 默认使用 OpenAI embeddings。显式设置
`memory.search.provider` 以使用 Gemini、Voyage、
Mistral、Bedrock、DeepInfra、本地 GGUF、Ollama、LM Studio、GitHub Copilot，或
通用的 OpenAI 兼容端点。
</Info>

有关搜索如何工作、调优
选项以及提供方设置，请参见 [Memory search](/concepts/memory-search)。

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
基于 LanceDB 的记忆，支持与 OpenAI 兼容的 embeddings、自动回忆、
自动捕获，以及本地 Ollama embedding 支持。通过插件安装。
</Card>
</CardGroup>

## 知识 wiki 层

如果你希望持久记忆表现得更像一个经过维护的知识库，而不是原始笔记，请使用捆绑的 `memory-wiki` 插件。它会将持久知识编译到一个 wiki 保管库中，具有确定性的页面结构、结构化的主张与证据、冲突与新鲜度跟踪、生成的仪表盘、编译后的摘要，以及 wiki 原生工具（`wiki_status`、`wiki_search`、`wiki_get`、`wiki_apply`、`wiki_lint`）。

`memory-wiki` 并不会取代活跃记忆插件；活跃记忆插件仍然负责回忆、提升和做梦。`memory-wiki` 只是在其旁边增加了一层带有来源证明的知识层。

<CardGroup cols={1}>
<Card title="Memory Wiki" icon="book" href="/plugins/memory-wiki">
将持久记忆编译为一个带有来源证明的 wiki 保管库，包含主张、仪表盘、桥接模式，以及适合 Obsidian 的工作流。
</Card>
</CardGroup>

## 自动记忆刷新

在 [compaction](/concepts/compaction) 对你的对话进行总结之前，OpenClaw 会运行一个静默轮次，提醒代理将重要上下文保存到记忆文件中。此功能默认开启；设置
`agents.defaults.compaction.memoryFlush.enabled: false` 可将其关闭。

要让本地模型执行该维护轮次，请设置一个仅适用于记忆刷新轮次的精确覆盖（它不会继承当前会话的模型回退链）：

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

<Tip>
记忆刷新可在 compaction 期间防止上下文丢失。如果你的代理在对话中有尚未写入文件的重要事实，它们会在总结发生之前自动保存。
</Tip>

## 梦境整理

做梦是记忆的默认后台整合路径。它会收集短期回忆信号，对候选项进行评分，并且只将符合条件的
owner 或 agent 派生条目提升到长期记忆（`MEMORY.md`）中：

- **默认开启**：可通过
  `plugins.entries.memory-core.config.dreaming.enabled: false` 将其关闭。
- **按计划执行**：启用后，`memory-core` 会自动管理一个循环 cron
  任务，执行完整的做梦扫描。
- **带阈值**：提升必须通过评分、回忆频率和
  查询多样性门槛。
- **已整合**：在确定性门槛之后，受限的子代理重写会合并重复项并
  覆盖过时条目。无效或不可用的重写将使用仅追加的回退方式。
- **污点门控**：不受信任和系统派生的候选项绝不会进入
  整合提示词或持久化提升路径。
- **可审阅**：阶段摘要和日记条目会写入
  `DREAMS.md` 供人工审阅，包括重写次数和重点内容。

这种后台模式遵循了睡眠时计算的动机（arXiv:2504.13171）。带来源感知的反思也遵循了 Generative Agents 研究中关于持久记忆的经验。

有关阶段行为、评分信号以及
梦境日记的详细信息，请参见 [Dreaming](/concepts/dreaming)。

## 有依据的回填与实时晋升

这个 dreaming system 有两个相关的 review lane：

- **实时 dreaming** 从 `memory/.dreams/` 下的短期 dreaming store 读取内容，这也是正常 deep phase 用来决定哪些内容会晋升到 `MEMORY.md` 的机制。
- **有依据的回填** 将历史的 `memory/YYYY-MM-DD.md` 笔记作为独立的日记文件读取，并将结构化的 review 输出写入 `DREAMS.md`。

有依据的回填适用于重放较早的笔记，并检查系统认为什么是持久的，而无需手动编辑 `MEMORY.md`。

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

`--stage-short-term` 标志会将有依据的持久候选项暂存到与正常 deep phase 已使用的相同短期 dreaming store 中；它不会直接提升这些内容。因此：

- `DREAMS.md` 仍然是供人工审阅的界面。
- 短期 store 仍然是面向机器的排序界面。
- `MEMORY.md` 仍然只会由 deep promotion 写入。

要在不影响普通日记条目或正常 recall 状态的情况下撤销一次重放：

```bash
openclaw memory rem-backfill --rollback
openclaw memory rem-backfill --rollback-short-term
```

## 命令行界面

```bash
openclaw memory status          # 检查索引状态和提供方
openclaw memory search "query"  # 从命令行搜索
openclaw memory index --force   # 强制重建索引
```

## 延伸阅读

- [Memory search](/concepts/memory-search): 搜索管线、提供方和调优。
- [Builtin memory engine](/concepts/memory-builtin): 默认 SQLite 后端。
- [QMD memory engine](/concepts/memory-qmd): 高级本地优先 sidecar。
- [Honcho memory](/concepts/memory-honcho): AI 原生跨会话记忆。
- [Memory LanceDB](/plugins/memory-lancedb): 基于 LanceDB 的插件，支持与 OpenAI 兼容的嵌入。
- [Memory Wiki](/plugins/memory-wiki): 编译式知识库和 wiki 原生工具。
- [Dreaming](/concepts/dreaming): 将信息从短期回忆后台提升到长期记忆。
- [Memory configuration reference](/reference/memory-config): 所有配置项。
- [Compaction](/concepts/compaction): 压缩如何与记忆交互。
- [Active memory](/concepts/active-memory): 用于交互式聊天会话的子代理记忆。
- [User model](/concepts/user-model): 基于指令的持久偏好和资料事实。
- [Standing intents](/concepts/standing-intents): 事件条件化的前瞻性记忆。
