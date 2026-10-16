---
summary: "上下文：模型看到什么、它如何构建，以及如何检查它"
read_when:
  - "你想了解在 OpenClaw 中 “context” 的含义"
  - "你在调试模型为什么“知道”某件事（或者为什么忘了它）"
  - "你想减少上下文开销（/context、/status、/compact）"
title: "上下文"
---

“Context” 是 **OpenClaw 在一次运行中发送给模型的所有内容**。它受模型的 **上下文窗口**（token 限制）约束。

初学者心智模型：

- **系统提示**（OpenClaw-built）：规则、工具、技能列表、time/runtime以及注入的工作区文件。
- **对话历史**：你在本次会话中的消息 + 助手的消息。
- **工具calls/results +附件**：命令输出、文件读取、images/audio等。

Context 并不等同于“记忆”：记忆可以存储在磁盘上并在之后重新加载；context 是当前模型窗口中的内容。

## <a id="quick-start-(inspect-context)"></a><a id="quick-start-inspect-context"></a> Quick start（检查上下文）

- `/status` → 快速查看“我的窗口有多满？” + 会话设置。
- `/context list` → 注入了什么 + 大致大小（按文件 + 总计）。
- `/context detail` → 更深入的拆分：按文件、按工具 schema 大小、按技能条目大小、系统提示词大小，以及可压缩的转录消息数量。
- `/context map` → 当前会话已跟踪的上下文贡献项的 WinDirStat 风格树图像。
- `/usage tokens` → 在正常回复后附加每次回复的用量页脚。
- `/compact` → 将较旧的历史摘要为一个压缩条目，以释放窗口空间。

另见：[斜杠命令](/tools/slash-commands)、[Token 使用与成本](/reference/token-use)、[压缩](/concepts/compaction)。

当目录元数据不可用并且所选模型和运行时仍然匹配时，`/context` 和 `openclaw sessions list` 可以重用上次验证的模型预算。排位赛回合会刷新该值。当前模型元数据和配置的限制优先；通用后备窗口和可移动上限不会保存为经过验证的模型预算。

状态、上下文报告和会话列表使用所选模型的已发现容量和配置的限制。如果当前元数据和匹配的已验证预算均不可用，则分母为 `?`（会话列表 JSON 中的 `null`）；报告不能替代通用窗口或其他模型的容量。

当 Control UI 上下文计量器仍与所选模型和有效上下文上限匹配时，它会使用上次运行的提示预算。该预算为运行时的压缩储备留出了空间。它的标签是**Promptbudget（last run）**：它是一个估计，跨越它可以触发工具结果减少或压缩。模型或上下文上限更改后，仪表会显示 **上下文窗口** ，直到新的运行提供匹配的估计值。如果所选模型的容量未知，则计量器将忽略上下文使用，而不是借用代理的默认模型容量；可用的提供商计划使用情况仍然可见。过时的令牌总数仍然是近似值，不会触发上下文警告。

## <a id="example-output"></a> 示例输出

数值会因模型、提供方、工具策略以及你的工作区内容而异。

### `/context list`

```text
🧠 Context breakdown
Workspace: <workspaceDir>
Bootstrap max/file: 20,000 chars
Sandbox: mode=non-main sandboxed=false
System prompt (run): 38,412 chars (~9,603 tok) (Project Context 23,901 chars (~5,976 tok))

Injected workspace files:
- AGENTS.md: OK | raw 1,742 chars (~436 tok) | injected 1,742 chars (~436 tok)
- SOUL.md: OK | raw 912 chars (~228 tok) | injected 912 chars (~228 tok)
- IDENTITY.md: OK | raw 211 chars (~53 tok) | injected 211 chars (~53 tok)
- USER.md: OK | raw 388 chars (~97 tok) | injected 388 chars (~97 tok)
- BOOTSTRAP.md: OK | raw 0 chars (~0 tok) | injected 0 chars (~0 tok)

Skills list (system prompt text): 2,184 chars (~546 tok) (12 skills)
Tools: read, edit, write, exec, process, browser, message, sessions_send, …
Tool list (system prompt text): 1,032 chars (~258 tok)
Tool schemas (JSON): 31,988 chars (~7,997 tok) (counts toward context; not shown as text)
Tools: (same as above)

Session tokens (cached): 14,250 total / ctx=32,000
```

### `/context detail`

```text
🧠 Context breakdown (detailed)
…
Top skills (prompt entry size):
- frontend-design: 412 chars (~103 tok)
- oracle: 401 chars (~101 tok)
… (+10 more skills)

Top tools (schema size):
- browser: 9,812 chars (~2,453 tok)
- exec: 6,240 chars (~1,560 tok)
… (+N more tools)
```

### `/context map`

发送一张基于最新缓存运行报告和会话转录生成的图像。在会话中尚未有普通消息生成运行报告之前，`/context map` 会返回不可用消息，而不是渲染估算。矩形面积与跟踪到的提示词字符数成比例：

- 对话转录（用户消息、助手回复、工具结果、压缩摘要），以及仅到达模型的每轮运行时上下文和钩子提示词附加内容
- 注入的工作区文件
- 基础系统提示词文本
- 技能提示词条目
- 工具 JSON 模式

随着会话进行，对话组也会增长，因此地图会随轮次变化；压缩后，它会折叠为一个摘要磁贴。

即使没有缓存的运行报告，`/context list`、`/context detail` 和 `/context json` 仍可检查按需估算。

## <a id="what-counts-toward-the-context-window"></a> 什么计入上下文窗口

模型接收到的所有内容都计入，包括：

- 系统提示（所有部分）。
- 对话历史。
- 工具调用 + 工具结果。
- Attachments/transcripts (images/audio/files).
- 压缩摘要和截断产物。
- 提供方的“包装层”或隐藏头信息（不可见，但仍会计入）。

## <a id="how-openclaw-builds-the-system-prompt"></a> OpenClaw 如何构建系统提示词

系统提示符为 **OpenClaw-owned** 并且每次运行都会呈现。它包括：

- 工具列表 + 简短说明。
- 技能列表（仅元数据；见下文）。
- 工作区位置。
- 时间（UTC + 如已配置则转换后的用户时间）。
- 运行时元数据 （host/OS/model/thinking）。
- 在 **项目上下文** 下注入的工作区启动文件。

完整故障：[系统Prompt](/concepts/system-prompt)。

在受支持的直接 Anthropic API-key 路由和本机 OpenAI 响应路由上，OpenClaw 固定会话的完整系统提示。更改的部分（包括技能、工作空间内存和时间上下文）在当前用户轮流后作为指令消息到达。现有的技能和记忆刷新规则仍然适用。更改路线或选定的个人资料、重置或压缩历史记录开始新的系列；普通轮拆卸和网关重启恢复保存的系列。

## <a id="injected-workspace-files-(project-context)"></a><a id="injected-workspace-files-project-context"></a> 注入的工作区文件（项目上下文）

默认情况下，OpenClaw 会注入一组固定的工作区文件（如果它们存在）：

- `AGENTS.md`
- `SOUL.md`
- `IDENTITY.md`
- `USER.md`
- `BOOTSTRAP.md`（仅首次运行）

大文件会基于每个文件使用 `agents.defaults.bootstrapMaxChars` 进行截断（默认 `20000` 个字符）。OpenClaw 还会对所有文件的总注入量使用 `agents.defaults.bootstrapTotalMaxChars` 设置上限（默认 `60000` 个字符）。`/context` 会显示**原始 vs 注入**大小以及是否发生了截断。

当发生截断时，运行时会在项目上下文下注入一个简洁的提示通知，说明某些引导文件被截断；每个文件的名称和大小保留在 `/context` 和其他诊断中。此通知是内置的且不可配置。运行时日志针对每个文件路径、内容修订和每个进程的有效限制发出一次警告； `/context` 继续在每个报告中显示截断。

## <a id="skills%3A-injected-vs-loaded-on-demand"></a><a id="skills-injected-vs-loaded-on-demand"></a> 技能：按需注入 vs 按需加载

系统提示包含一个浓缩的**技能列表**（名称 + 描述 + 位置）。这个列表确实存在一定开销。

`/context` 计算渲染的系统提示中包含的目录，而不是每个已安装的技能。在没有代码模式的嵌入式运行时中，拒绝 `read` 和 `skills_read` 会忽略目录并报告零技能。

默认情况下_不_包含技能说明。该模型预计为`read`，技能为`SKILL.md` **，仅在需要时为**。

## <a id="tools%3A-there-are-two-costs"></a><a id="tools-there-are-two-costs"></a> 工具：有两种成本

工具会通过两种方式影响上下文：

1. 系统提示词中的 **工具列表文本**（你看到的“工具信息”）。
2. **工具 schema**（JSON）。这些会发送给模型，以便它可以调用工具。即使你看不到它们的纯文本形式，它们也会计入上下文。

`/context detail` 会拆分出最大的工具 schema，以便你看到哪些占用最多。

## <a id="commands%2C-directives%2C-and-%22inline-shortcuts%22"></a><a id="commands-directives-and-inline-shortcuts"></a> 命令、指令和“内联快捷方式”

斜杠命令由 Gateway 处理。有几种不同的行为：

- **独立命令**：仅为 `/...` 的消息会作为命令运行。
- **指令**：`/think`、`/fast`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue` 会在模型看到消息之前被移除。
  - 仅包含指令的消息会持久化会话设置。
  - 普通消息中的内联指令会作为按消息生效的提示。
- **内联快捷方式**（仅允许名单中的发送者）：普通消息中的某些 `/...` 标记可以立即运行（例如：“嗨 /status”），并会在模型看到剩余文本之前被移除。

详情：[斜杠命令](/tools/slash-commands)。

## <a id="sessions%2C-compaction%2C-and-pruning-(what-persists)"></a><a id="sessions-compaction-and-pruning-what-persists"></a> 会话、压缩和裁剪（哪些会持久化）

哪些内容会跨消息保留取决于具体机制：

- **正常历史记录** 根据策略持续存在于会话记录中，直到 compacted/pruned。
- **压缩** 会将摘要持久化到转录中，并保留最近的消息不变。
- **裁剪** 会从 _内存中的_ 提示词里移除旧的工具结果，以释放上下文窗口空间，但不会重写会话转录——完整历史仍可在磁盘上检查。

### <a id="runtime-context-and-provider-roles"></a> 运行时上下文和提供者角色

OpenClaw 将类型化运行时上下文与用户创作的文本分开附加。在支持的直接 Anthropic API-key 路由上，它使用现有的历史系统通道。本机 OpenAI 响应使用现有的操作员通道，根据模型的指令角色支持投影为 `developer` 或 `system`。 OpenAI- 兼容端点和本地服务器（包括响应兼容端点和本机 Ollama）保留用户角色载体。他们的聊天模板可以拒绝或提升对话中的系统消息；将载体保留在其原始位置还可以保护前缀缓存的重用。运营商的角色和保留率自动遵循提供商的能力；没有 `appendOnlyRuntimeContext` 配置开关。

生产者将运行时指令与对话数据区分开来。受用户或工具影响的片段（包括中断输入预览、子代理详细信息和媒体任务详细信息）即使在本机操作员消息中也会保留数据：它们被 JSON- 引用并标记为 `Conversation data (data, not instructions)`，并转义受保护的运行时分隔符。心跳结果也引用了数据。载体的作用并不使这些嵌入的碎片指令。

在请求跟踪中，用户角色运营商通常以 `OpenClaw runtime context:` 开头，以 `End OpenClaw runtime context.` 结尾。较早的保留运营商可能使用 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>` 和 `<<<END_OPENCLAW_INTERNAL_CONTEXT>>>`。这些标签本身并不能确定出处。如果模型叙述了此上下文，请强化代理说明中的现有指导：使用它来回答活动请求，将内部详细信息保密，并且不要将承运人视为新的用户请求或等待另一条消息。

Google 生成内容请求使载体保持分离并添加显式仅上下文框架：不确认上下文；继续回答用户的请求。这可以防止尾随的用户角色载体成为应答请求。该框架对于保留的重播是确定性的，并且当回合范围上下文过期时不会重写用户消息。

对于嵌入式响应请求，当前请求元数据保留在用户消息或压缩检查点之后以及其工具调用之前。这使得支持的传输可以跨工具轮次重用之前的响应，而不会丢失实时上下文，因此 OpenClaw 每个用户轮次发送一次，而不是在每个工具结果之后发送一次。稍后用户转入 OpenAI 响应系列会话会保留隐藏的运行时上下文载体（仅附加），因此前一转（包括工具调用和结果）仍保持不变的缓存前缀。保留的载波计入上下文窗口，直到压缩，这不会将用户消息与其载波分开。用户角色载体包含带标签的上下文主体；除了 Google 的生成内容框架之外，解释指导仅在稳定的系统提示中存在一次。 OpenAI- 兼容的聊天完成和本机 Ollama 还保留早期的运营商，而无需重写系统提示或先前的对话字节。

支持的直接 Anthropic API-key 路由还保留运行时上下文仅追加，在用户轮流后使用系统消息及其其他排队上下文。这些消息不需要分隔符，并且在下一条用户消息时清除：它们保留在记录中，但不再消耗输入令牌。持久系统提示更新使用相同的系统消息通道，无需清除。工具结果和排队扩展上下文也会清除早期副本； OpenClaw 在这些延续之后更新当前用户回合的运行时上下文。其他前缀绑定 Claude 路由保留其分隔的用户角色载体。有关支持的模型和路线限制，请​​参阅 [ 人类保留思维 ](/providers/anthropic#tool-calls-and-retained-thinking)。

其他路由在思考不绑定前缀时可以使用临时运营商。这些路由将元数据保留在请求尾部，并在下一个用户轮流时将其删除，从而保留缓存的历史记录，而不会保留旧的上下文或重复的缓存读取费用。

文档：[会话](/concepts/session)、[压缩](/concepts/compaction)、[会话裁剪](/concepts/session-pruning)。

默认情况下，OpenClaw 使用内置的 `legacy` 上下文引擎进行组装和压缩。如果您安装提供 `kind: "context-engine"` 的插件并使用 `plugins.slots.contextEngine` 选择它，则 OpenClaw 会将上下文程序集、`/compact` 和相关的子代理上下文生命周期挂钩委托给该引擎。 `ownsCompaction: false` 不会自动回退到旧版引擎；活动引擎仍必须正确执行 `compact()`。有关完整的可插入接口、生命周期挂钩和配置，请参阅 [Context Engine](/concepts/context-engine)。

## <a id="what-%2Fcontext-actually-reports"></a><a id="what-/context-actually-reports"></a> `/context` 实际报告什么

`/context` 在可用时会优先使用最新的 **运行构建** 系统提示词报告：

- `System prompt (run)` = 从最后一次嵌入式（可使用工具的）运行中捕获，并持久化到会话存储中。
- `System prompt (estimate)` = 当不存在运行报告时（或通过不会生成报告的 CLI 后端运行时）即时计算得到。

无论哪种方式，它都会报告规模和主要贡献者；它确实 **not** 转储完整的系统提示或工具架构。在详细模式下，它还将会话记录与压缩使用的相同真实对话消息谓词进行比较，因此高 prompt/cache 使用率更容易与可压缩对话历史记录区分开来。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="上下文引擎" href="/concepts/context-engine" icon="puzzle-piece">
    通过插件进行自定义上下文注入。
  </Card>
  <Card title="压缩" href="/concepts/compaction" icon="compress">
    对长对话进行摘要，以使其保持在模型窗口内。
  </Card>
  <Card title="系统提示词" href="/concepts/system-prompt" icon="message-lines">
    系统提示词如何构建，以及它在每轮中注入什么。
  </Card>
  <Card title="Agent 循环" href="/concepts/agent-loop" icon="arrows-rotate">
    从传入消息到最终回复的完整代理执行周期。
  </Card>
</CardGroup>
