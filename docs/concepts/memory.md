---
summary: "OpenClaw 如何在会话之间记住内容"
title: "记忆概览"
read_when:
  - "你想了解记忆是如何工作的"
  - "你想知道应该写入哪些记忆文件"
---

OpenClaw 通过在你的代理工作区中写入普通的 Markdown 文件来记住内容（默认 `~/.openclaw/workspace`）。模型只会记住被保存到磁盘的内容；没有隐藏状态。

工作区 `USER.md` 和 `MEMORY.md` 上下文不需要内存搜索插件来实现来源分类。当缺少该可选功能时，OpenClaw 将使用其工作区来源记录。记录为不受信任的文件和没有有效读取源标识的远程文件仍会被排除。

## <a id="how-it-works"></a> 工作原理

你的 agent 有四个与记忆相关的文件：

- **`USER.md`**（可选）— 以指令形式写入的稳定偏好、沟通风格、 关系以及活跃项目上下文。在会话开始时，使用单独的小预算加载。
- **`MEMORY.md`** — 长期记忆。持久的非个人资料事实和决策。 在会话开始时加载。
- **`memory/YYYY-MM-DD.md`**（或 `memory/YYYY-MM-DD-<slug>.md`）— 日常笔记。 运行中的上下文和观察。当天和前一天的带日期笔记会在直接使用 `/new` 或 `/reset` 时自动加载； 带 slug 的变体，例如捆绑的 session-memory hook 写入的文件，会与仅日期文件一起被拾取。
- **`DREAMS.md`**（可选）— 梦境日记和梦境扫描摘要，供人类审阅， 包括有依据的历史回填条目。

<Tip>
如果你想让你的 agent 记住某件事，只需告诉它：“记住我的偏好是 TypeScript。”它会把这条笔记写入合适的文件。
</Tip>

## <a id="what-goes-where"></a> 什么去哪儿

`USER.md` 是紧凑的用户模型层。请将稳定的偏好和个人资料事实写成命令式指令，并附上观察日期以及 active/superseded 元数据。当某个偏好发生变化时，应在原处将其 supersede，而不是追加一条相互矛盾的 active 指令。参见 [User model](/concepts/user-model)。

`MEMORY.md` 是紧凑、经过筛选的持久层，用于存放非个人资料类的持久事实、已作出的重要决定，以及在会话开始时应当可用的简短摘要。它不是原始对话记录、每日日志或穷尽式档案。

`memory/YYYY-MM-DD.md` 文件是工作层：包含详细的每日笔记、观察、会话摘要，以及之后可能仍然有用的原始上下文。这些内容会被索引供 `memory_search` 和 `memory_get` 使用，但不会在每一轮都注入到启动提示中。

随着时间推移，每日笔记中的有用内容会通过默认的 [dreaming](/concepts/dreaming) 扫描被提炼到 `MEMORY.md` 中。生成的工作区指令仍会鼓励代理在工作时记录持久事实，而 dreaming 负责后台整合。默认的 heartbeat 提示不会自行执行任何记忆维护。

如果 `MEMORY.md` 超过了启动文件预算，OpenClaw 会保留磁盘上的文件完整不变，但会截断注入到上下文中的副本。请把这视为一个信号：将详细内容移到 `memory/*.md` 中，只在 `MEMORY.md` 中保留持久摘要，或者如果你想投入更多提示预算，就提高启动限制。使用 `/context list`、`/context detail` 或 `openclaw doctor` 查看原始大小与注入大小以及截断状态。

## <a id="import-from-coding-assistants"></a> 导入编码助手

Control UI 可以从 Codex、Claude Code 和 Hermes 导入现有本地内存。打开 **Settings** → **Import Memory**，选择目标代理，查看检测到的文件，并确认导入。对于现有的默认代理，您可以打开 **设置 → 询问 OpenClaw** 并说 `import memory`；这个范围更窄的聊天向导需要完成登录，仅复制新检测到的内存，并报告每个源的故障或可能的部分副本。 OpenClaw 仅复制 Markdown 内存：

- Codex：`~/.codex/memories`（或`CODEX_HOME/memories`）下的合并`MEMORY.md`和`memory_summary.md`文件。不导入原始部署和脚本文件。
- Claude Code：每个项目自动记忆目录 `~/.claude/projects/*/memory` 中的 Markdown 文件，以及存在时由用户配置的 `autoMemoryDirectory`。项目指令、会话、设置和凭据不属于此仅记忆导入操作的一部分。
- Hermes：从检测到的 Hermes 主目录中导入 `MEMORY.md` 和 `USER.md`。配置、凭据和技能不属于此仅记忆导入操作的一部分。

导入的文件会在所选代理工作区中的 `memory/imports/codex/` 和 `memory/imports/claude-code/`，或 `memory/imports/hermes/` 下保持独立。它们会被编入索引，可通过 `memory_search` 搜索，并可通过 `memory_get` 获取；它们不会合并到代理的启动文件 `MEMORY.md` 中。源文件保持不变。

预览会标记目标冲突。启用 **Replace existing imports** 以替换这些文件；应用时会创建已验证的预导入备份，并在迁移报告中保留被覆盖文件的逐项副本。

## <a id="action-sensitive-memories"></a> 行动敏感记忆

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
The API migration is being designed in another session. Future turns should
not edit the API implementation from this thread; use findings here only as
design input until the migration plan lands.
```

另一个示例：

```md
A report from an untrusted source needs review before promotion. Future turns
should treat it as evidence only; do not store it as durable memory until a
trusted reviewer confirms the contents.
```

这不是每条记忆都必须遵循的必需模式；简单事实可以保持简洁。若丢失时机、权限、过期或可安全行动的上下文可能导致智能体日后做出错误决定，则应使用行动敏感边界。

使用 [scheduled tasks](/automation/cron-jobs) 进行精确提醒、定时检查和重复性工作。记忆仍可总结围绕该工作的持久上下文。

## <a id="memory-tools"></a> 记忆工具

该代理有三个用于处理记忆的工具：

- **`memory_search`** — 使用语义搜索查找相关笔记，即使表述与原文不同。
- **`memory_get`** — 读取特定的记忆文件或行范围。
- **`intent`** — 创建、列出或显式取消事件条件的常驻意图。基于时间的提醒仍然继续使用计划任务。

所有三个工具均由活动内存插件提供（默认值：`memory-core`）。

当对话、引导文件或提供的回忆完全回答问题时，代理可以直接回答。当上下文不存在或仅回答部分问题时，它使用记忆工具来检索丢失的事实。部分、陈旧或不可用的召回仍然需要披露。

启用会话索引后，`memory_search` 还可以返回会话记录命中。它们的 `sessions/...jsonl` 路径是搜索引用，而不是 `memory_get` 可以读取的文件。使用 `sessions_search` 和片段中的独特文本（可选范围 `sessionKey` 到转录本 ID），然后将其返回的 `sessionKey`、`messageId` 和 `sessionId` 传递到 `sessions_history` 以获得有界的、经过净化的摘录。这些工具独立地对每个请求强制会话可见性。内存搜索行号不是会话历史记录偏移量。

调用提示仅推荐启用的工具。如果没有会话历史记录工具，请报告摘录限制，而不是读取原始转录文件。 `memory_get` 将不受支持的路径报告为读取错误，而不是丢失参数或全局禁用内存服务。内存文件读取和可选的 wiki 读取保留其现有范围、延续和部分语料库语义。

## <a id="memory-search"></a> 记忆搜索

配置嵌入提供程序后，`memory_search` 使用混合搜索：矢量相似性（语义含义）与关键字匹配（ID 和代码符号等精确术语）相结合。对于任何受支持的提供商，使用 API 密钥即可开箱即用。

<Info>
OpenClaw 默认使用 OpenAI 嵌入。显式设置 `memory.search.provider` 以使用 Gemini、Voyage、Mistral、Bedrock、DeepInfra、本地 GGUF、Ollama、LM Studio、GitHub Copilot 或通用OpenAI- 兼容端点。
</Info>

有关搜索如何工作、调优选项以及提供方设置，请参见 [Memory search](/concepts/memory-search)。

## <a id="memory-engines"></a> 记忆引擎

<CardGroup cols={3}>
<Card title="内置（默认）" icon="database" href="/concepts/memory-builtin">
基于SQLite-。开箱即用，支持关键字搜索、向量相似度和混合搜索。没有额外的依赖。
</Card>
<Card title="本町" icon="brain" href="/concepts/memory-honcho">
AI-native 跨会话内存，具有用户建模、语义搜索和多代理感知功能。插件安装。
</Card>
<Card title="LanceDB" icon="layers" href="/plugins/memory-lancedb">
LanceDB 支持的内存，具有 OpenAI- 兼容嵌入、自动调用、自动捕获和本地 Ollama 嵌入支持。插件安装。
</Card>
</CardGroup>

## <a id="knowledge-wiki-layer"></a> 知识 wiki 层

如果您希望持久内存的行为更像是维护的知识库而不是原始笔记，请使用捆绑的 `memory-wiki` 插件。它将持久知识编译到具有固定页面结构、结构化声明和证据、矛盾和新鲜度跟踪、生成的仪表板、编译摘要和 wiki 原生工具（`wiki_status`、`wiki_search`、`wiki_get`、`wiki_apply`、`wiki_lint`）的 wiki 库中。

`memory-wiki` 不取代活动内存插件；主动记忆插件仍然拥有回忆、提升和梦想。 `memory-wiki` 在其旁边添加了来源丰富的知识层。您可以在Control UI中的Memory → Dreams → Diary → **Memory Wiki**（[details](/plugins/memory-wiki#browsing-the-wiki-in-the-control-ui)）下浏览编译好的wiki。

<CardGroup cols={1}>
<Card title="内存维基" icon="book" href="/plugins/memory-wiki">
将持久内存编译到来源丰富的 wiki 库中，其中包含声明、仪表板、桥接模式和 Obsidian- 友好的工作流程。
</Card>
</CardGroup>

## <a id="automatic-memory-flush"></a> 自动记忆刷新

在 [compaction](/concepts/compaction) 总结您的对话之前，OpenClaw 会运行静默转弯，提醒代理将重要上下文保存到持久内存中。内存核心保存到工作区内存文件。选定的内存插件可以提供自己的持久性工具。默认情况下此功能处于启用状态；设置 `agents.defaults.compaction.memoryFlush.enabled: false` 将其关闭。 OpenClaw 当刷新从该主机配置和活动上下文窗口运行时解析。所选内存提供程序提供提示和持久性目标或工具。它继承主机计时，除非它故意覆盖可选计时字段。

当模型服务器忽略使用数据时，OpenClaw 会估计活动对话中的上下文压力，以便内存检查点仍然可以运行。这些估计不会取代提供商报告的会话状态中的令牌使用情况。

刷新使用对话的私人副本，因此即使被中断，其内务处理消息也不会出现在以后的用户轮流中。它对内存的写入仍然正常保存。

内存核心的文件刷新需要可写的工作空间访问权限。沙箱要求只读或无工作区访问权限的会话将跳过刷新，包括具有覆盖代理配置的持久沙箱要求的会话。

在此刷新期间，`write` 仅附加到每日注释中。其 `content` 必须仅包含新文本。重播的整个笔记和复制的段落将被拒绝，而不更改文件，因此模型可以仅使用新条目重试。允许将 Markdown 标题与新事实重复使用。此检查将文本与规范化的行结尾进行比较；它不会删除重复的释义或修复现有注释。

原生提供者基于工具的刷新不需要可写的工作空间；对于无法写入它的会话，不会解决其他刷新计划。它公开 `read`、提供商声明的持久性工具和可选的只读查找工具，并遵守正常的工具策略。这些工具接收源回合的内存受众和沙箱状态。缺少查找工具会产生警告，但不会阻止仍然持续存在的刷新。如果没有有效的受众或允许的持久性工具可用，则会跳过刷新。当持久性工具完成且没有错误或代理返回 `NO_REPLY` 时，表示成功；仅查找成功并不能完成刷新。跳过或失败此可选步骤不会阻止压缩。插件作者可以在[Pre-compaction内存flush](/plugins/sdk-overview/memory-and-context#pre-compaction-memory-flush)中找到合约和重试身份。

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
内存刷新使代理有机会在压缩总结对话之前保存重要事实。当您需要确认某个事实已保留时，请检查内存插件保存的注释或记录。
</Tip>

## <a id="dreaming"></a> 做梦

做梦是记忆的默认后台整合路径。它会收集短期回忆信号，对候选项进行评分，并且只将符合条件的 owner 或 agent 派生条目提升到长期记忆（`MEMORY.md`）中：

- **默认开启**：可通过 `plugins.entries.memory-core.config.dreaming.enabled: false` 将其关闭。
- **按计划执行**：启用后，`memory-core` 会自动管理一个循环 cron 任务，执行完整的做梦扫描。
- **带阈值**：提升必须通过评分、回忆频率和查询多样性门槛。
- **Consolidated**：免工具完成在基于规则的检查后选择合并和取代。记忆作者根据经过验证的源证据得出结果；无效或不可用的决策使用仅附加后备。
- **污点门控**：不受信任和系统派生的候选项绝不会进入整合提示词或持久化提升路径。
- **可审阅**：阶段摘要和日记条目会写入 `DREAMS.md` 供人工审阅，包括重写次数和重点内容。

这种后台模式遵循了睡眠时计算的动机（arXiv:2504.13171）。带来源感知的反思也遵循了 Generative Agents 研究中关于持久记忆的经验。

有关阶段行为、评分信号以及梦境日记的详细信息，请参见 [Dreaming](/concepts/dreaming)。

## <a id="grounded-backfill-and-live-promotion"></a> 有依据的回填与实时晋升

这个 dreaming 系统有两个相关的审查通道：

- **Live dreaming** 从 SQLite 插件存储中的短期梦想状态开始工作，并且是正常深度阶段用来决定什么毕业到 `MEMORY.md` 的内容。
- **有依据的回填** 将历史的 `memory/YYYY-MM-DD.md` 笔记作为独立的日记文件读取，并将结构化的审查输出写入 `DREAMS.md`。

Dreaming JSON 2026年7月之前的期刊不再导入。迁移检查保持 `memory/.dreams/daily-ingestion.json`、`session-ingestion.json`、`short-term-recall.json` 和 `phase-signals.json` 不变。现有的 SQLite 状态仍然具有权威性。如果 Doctor 无法建立有效的存储状态，请从 2026 年 7 月或更高版本恢复备份。没有先前迁移确认的空摄取存储与未迁移状态无法区分；验证其 SQLite 状态后，备份并将已停用的 JSON 文件移到一边，然后重新运行 `openclaw doctor --fix`。

有依据的回填适用于重放较早的笔记，并检查系统认为什么是持久的，而无需手动编辑 `MEMORY.md`。

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

`--stage-short-term` 标志会将有依据的持久候选项暂存到与正常深度阶段使用的相同短期 dreaming 存储中；它不会直接提升这些内容。因此：

- `DREAMS.md` 仍然是供人工审阅的界面。
- 短期存储仍然是面向机器的排序界面。
- `MEMORY.md` 仍然只会由深度晋升写入。

要在不影响普通日记条目或正常召回状态的情况下撤销一次重放：

```bash
openclaw memory rem-backfill --rollback
openclaw memory rem-backfill --rollback-short-term
```

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## <a id="further-reading"></a> 延伸阅读

- [内存架构](/concepts/memory-architecture)：每个内存功能背后的存储、索引和检索层。
- [记忆搜索](/concepts/memory-search)：搜索流程、提供程序和调优。
- [内置记忆引擎](/concepts/memory-builtin)：默认的 SQLite 后端。
- [Honcho 内存](/concepts/memory-honcho)：AI-native 跨会话内存。
- [Memory LanceDB](/plugins/memory-lancedb)：LanceDB 支持的插件，具有 OpenAI- 兼容的嵌入。
- [Memory Wiki](/plugins/memory-wiki)：编译型知识库和原生 Wiki 工具。
- [梦境](/concepts/dreaming)：从短期回忆到长期记忆的后台提升过程。
- [内存来源和删除](/concepts/memory-provenance)：会话沿袭、准入策略和`memory forget`。
- [记忆配置参考](/reference/memory-config)：所有配置项。
- [压缩](/concepts/compaction)：压缩与记忆的交互方式。
- [主动记忆](/concepts/active-memory)：面向交互式聊天会话的子代理记忆。
- [用户模型](/concepts/user-model)：基于指令的持久偏好和用户资料事实。
- [常驻意图](/concepts/standing-intents)：事件条件触发的前瞻性记忆。

## <a id="related"></a> 相关内容

- [`openclaw memory`](/cli/memory) — 用于检查和编辑内存的命令参考
