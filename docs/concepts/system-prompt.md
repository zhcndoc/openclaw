---
summary: "OpenClaw 系统提示词包含的内容以及其组装方式"
read_when:
  - 编辑系统提示文本、工具列表或时间/心跳部分
  - 更改工作区引导加载或技能注入行为
title: "系统提示词"
---

OpenClaw 会为每次 agent 运行构建自己的系统提示词；运行时没有默认提示词。

组装分为三层：

- `buildAgentSystemPrompt` 根据显式输入渲染提示词。它保持纯渲染器的特性，不直接读取全局配置。
- `resolveAgentSystemPromptConfig` 为特定 agent 解析基于配置的提示词参数（所有者显示名、TTS 提示、模型别名、记忆引用模式、子 agent 委派模式）。
- 运行时适配器（嵌入式、CLI、命令/导出预览、压缩）收集实时事实（工具、沙箱状态、通道能力、上下文文件、提供方提示词贡献），并调用已配置的提示词外观层。

这使得导出/调试提示词界面与实时运行保持一致，而不会把每个运行时细节都塞进一个单体构建器里。

提供方插件可以贡献具备缓存感知的指导内容，而不会替换 OpenClaw 拥有的提示词。某个提供方运行时可以：

- 替换三个命名核心部分之一：`interaction_style`、`tool_call_style`、`execution_bias`
- 在提示词缓存边界之上注入一个 **稳定前缀**
- 在提示词缓存边界之下注入一个 **动态后缀**

对于模型家族特定调优，请使用提供方拥有的贡献内容。将旧的 `before_prompt_build` 钩子保留用于兼容性或真正全局的提示词变更。

捆绑的 OpenAI/Codex GPT-5 家族覆盖层（`resolveGpt5SystemPromptContribution`）使用了这一机制：一个 `stablePrefix` 行为契约（执行策略、工具纪律、输出契约、完成契约），再加上一个可选的 `interaction_style` 覆盖，以获得更友好的语气。它适用于通过 OpenAI 或 Codex 插件路由的任何 `gpt-5*` 模型 id，由 `agents.defaults.promptOverlays.gpt5.personality`（`"friendly"`/`"on"` 或 `"off"`）控制。

## 结构

提示词很紧凑，包含固定部分：

- **工具链**：结构化工具的事实来源提醒，以及运行时工具使用指导。当启用 `update_plan` 工具（默认启用 `tools.updatePlan`）时，其自身的工具描述还会添加：仅将其用于非平凡的多步骤工作，最多保留一个步骤处于 `in_progress` 状态，并对简单的单步骤工作跳过使用。
- **执行倾向**：针对可执行请求在当前轮次采取行动，持续执行直到完成或受阻，从较弱的工具结果中恢复，实时检查可变状态，并在最终确定前进行验证。
- **承诺的工作**：承诺未来、后台、委派或持续进行的工作会产生后续跟进责任：在结束当前轮次前安排基于推送的完成或监控路径，主动返回结果或明确的阻碍，并且绝不将进展（例如 `running`）视为完成。
- **安全**：简短提醒防止追求权力或绕过监督。
- **技能**（可用时）：告诉模型如何按需加载技能说明。
- **OpenClaw 控制**：配置/重启工作优先使用 `gateway` 工具；不要臆造 CLI 命令。
- **OpenClaw 自更新**：使用 `config.schema.lookup` 安全检查配置，使用 `config.patch` 修改配置，使用 `config.apply` 替换完整配置，并且仅在用户明确请求时运行 `update.run`。面向代理的 `gateway` 工具拒绝重写 `tools.exec.mode`。
- **工作区**：工作目录（`agents.defaults.workspace`）。
- **文档**：本地文档/源码路径以及何时读取它们。
- **工作区文件（注入）**：说明引导文件已包含在下方。
- **沙箱**（启用时）：沙箱化运行时、沙箱路径、是否可用提升权限的执行。
- **时间上下文**：缓存边界下方的本地日期和时区；可用时，准确时间来自 `session_status`。
- **助手输出指令**：紧凑附件、语音消息和回复标签语法。
- **可折叠详情**（支持时）：教导模型在 `<details>` 披露内容中保留可选的深度，同时让主要回答和必需操作保持可见。
- **心跳**：启用默认代理的心跳提示和确认行为。
- **运行时**：主机、操作系统、Node、模型、仓库根目录（检测到时）、思考级别（单行）。
- **推理**：当前可见性级别以及 `/reasoning` 切换提示。

大型稳定内容（包括 **项目上下文**）保留在内部提示缓存边界之上。易变的逐轮部分（控制 UI 嵌入指导、**消息传递**、**可折叠详情**、**语音**、**群聊上下文**、**反应**、**心跳**、**运行时**）附加在该边界之下，以便支持前缀缓存的本地后端能够在频道轮次之间复用稳定的工作区前缀。工具说明应避免嵌入当前频道名称，因为已接受的 schema 本身已经携带了该运行时细节。

工具链还包含长期任务指导：

- 对于未来的后续跟进（`稍后再检查`、提醒、周期性工作），使用 cron，而不是 `exec` 睡眠循环、`yieldMs` 延迟技巧或重复的 `process` 轮询
- 仅对“现在开始并在后台继续”的命令使用 `exec` / `process`
- 当启用自动完成唤醒时，只启动一次命令并依赖推送式唤醒路径
- 使用 `process` 处理运行中命令的日志、状态、输入或干预
- 对于较大的任务，优先使用 `sessions_spawn`；子代理完成是推送式的，并会自动回告给请求者
- 不要为了等待完成而循环轮询 `subagents list` / `sessions_list`

`agents.defaults.subagents.delegationMode`（默认 `"suggest"`）可以加强这一点。`"prefer"` 会增加一个专门的 **子代理委派** 部分，告诉主代理充当响应式协调者，并将任何比直接回复更复杂的事情通过 `sessions_spawn` 发出。这里仅涉及提示词；工具策略仍然控制 `sessions_spawn` 是否可用。

在 `ultra` 思考级别下，当 `sessions_spawn` 可用时，还会添加一个 **主动的子代理编排** 部分：它告诉模型通过子代理并行化独立的调查、实现和验证工作，将简单或紧密耦合的工作保留在本地，为每个子代理设定有边界的目标，并在回复前综合结果。

系统提示中的安全护栏只是建议性的，不具有强制执行力。要进行硬性约束，请使用工具策略、`exec` 审批、沙箱和通道允许列表；运营者可以按设计禁用提示词护栏。

在带有原生审批卡片/按钮的通道中，提示词会要求代理优先依赖该 UI，并且仅当工具结果表明聊天审批不可用或手动审批是唯一途径时，才在聊天中包含手动的 `/approve` 命令。

## 提示词模式

OpenClaw 会为子代理渲染更小的系统提示词。运行时会为每次运行设置一个 `promptMode`（不是面向用户的配置）：

- `full`（默认）：所有上述部分。
- `minimal`：用于子代理；省略 memory prompt 部分（打包为 **记忆召回**）、**OpenClaw 自我更新**、**模型别名**、**用户身份**、**助手输出指令**、**消息传递**、**可折叠详情**、**静默回复** 和 **心跳**。工具、**安全**、**技能**（如提供）、工作区、沙箱、当前日期与时间（如已知）、运行时，以及注入的上下文仍然可用。
- `none`：仅返回基础身份行。

在 `promptMode=minimal` 下，额外注入的提示词会标记为 **子代理上下文**，而不是 **群聊上下文**。

对于频道自动回复运行，当直接、群组或仅消息工具上下文已经拥有可见回复契约时，OpenClaw 会省略通用的 **静默回复** 部分。只有传统的自动群组/频道模式会显示 `NO_REPLY`；直接聊天和仅消息工具回复会跳过静默标记指引。

## 提示词快照

OpenClaw 会为 Codex 运行时的顺利路径保留已提交的提示词快照，路径位于 `test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/`。它们会渲染选定的 app-server 线程/轮次参数，以及为 Telegram 直聊、Discord 群聊和 heartbeat 轮次重建出的模型绑定提示层栈：一个固定的 Codex `gpt-5.5` 模型提示词夹具、Codex 顺利路径权限开发者文本、OpenClaw 开发者指令、当 OpenClaw 提供时的轮次作用域协作模式指令、用户轮次输入，以及对动态工具规范的引用。

使用 `pnpm prompt:snapshots:sync-codex-model` 刷新固定的 Codex 模型提示词夹具。默认情况下，它会依次查找 `$CODEX_HOME/models_cache.json`、`~/.codex/models_cache.json`，然后是维护者检出约定 `~/code/codex/codex-rs/models-manager/models.json`；如果这些都不存在，它会直接退出而不修改已提交的夹具。传入 `--catalog <path>` 可从特定的 `models_cache.json` 或 `models.json` 文件刷新。

这些快照并不是逐字节的原始 OpenAI 请求捕获。在 OpenClaw 发送线程和轮次参数之后，Codex 还可以添加运行时拥有的工作区上下文（`AGENTS.md`、环境上下文、记忆、app/plugin 指令、内置的默认协作模式指令）。

使用 `pnpm prompt:snapshots:gen` 重新生成；使用 `pnpm prompt:snapshots:check` 验证漂移。CI 会将漂移检查与额外边界分片一并运行，因此提示词变更和快照更新会在同一个 PR 中落地。

## 工作区引导注入

启动文件会从活动工作区中解析，并根据其生命周期路由到对应的提示层：

- `AGENTS.md`
- `SOUL.md`
- `IDENTITY.md`
- `USER.md`
- `BOOTSTRAP.md` (仅在全新工作区中)
- `MEMORY.md`（如果存在）

在原生 Codex harness 中，OpenClaw 会避免在每个用户回合中重复稳定的工作区文件。Codex 会通过原生项目文档发现机制加载 `AGENTS.md`，包括其 `## Tools` 部分。`SOUL.md`、`IDENTITY.md` 和 `USER.md` 会作为按回合范围的协作开发者指令转发，因此原生 Codex 子代理不会继承它们。`MEMORY.md` 的内容也不会在每个原生 Codex 回合中直接粘贴：当工作区可用记忆工具时，Codex 回合会收到一条简短的工作区记忆说明，指引模型使用 `memory_search` 或 `memory_get`。如果工具被禁用、记忆搜索不可用，或者当前工作区与代理记忆工作区不同，`MEMORY.md` 就会回退到普通的有界回合上下文路径。`BOOTSTRAP.md` 仍保持正常的回合上下文角色。

Heartbeat 监控 scratch 不是启动文件。Heartbeat 运行器只会将其附加到 heartbeat 回合；普通回合不会收到它。默认代理的系统提示会在其节奏启用时自动包含 heartbeat 指导，无需单独的 heartbeat 设置来隐藏该部分。

在非 Codex harness 上，其余启动文件会按现有门控组合成 OpenClaw 提示。请保持注入文件简洁，尤其是非 Codex 的 `MEMORY.md`：它应保持为经过整理的长期摘要，详细的每日笔记则放在 `memory/*.md` 中，并可通过 `memory_search` / `memory_get` 按需检索。过大的非 Codex `MEMORY.md` 文件会增加提示占用，并可能在下方启动文件限制下被部分注入。

<Note>
`memory/*.md` 每日文件**不属于**正常的启动 Project Context。对于普通轮次，它们通过 `memory_search` / `memory_get` 按需访问，因此不会计入上下文窗口，除非模型显式读取它们。裸 `/new` 和 `/reset` 轮次是例外：运行时可以在第一个轮次中预先附加最近的每日记忆，作为一次性的启动上下文块。
</Note>

大文件会被截断，并带有标记：

| 限制                                         | 配置键                                              | 默认值   |
| -------------------------------------------- | --------------------------------------------------- | -------- |
| 每个文件最大字符数                            | `agents.defaults.bootstrapMaxChars`                | 20000    |
| 所有文件合计最大字符数                        | `agents.defaults.bootstrapTotalMaxChars`           | 60000    |
| 截断警告（`off`\|`once`\|`always`）           | `agents.defaults.bootstrapPromptTruncationWarning` | `always` |

缺失文件会注入一条简短的缺失文件标记。详细的原始/注入计数会保留在诸如 `/context`、`/status`、doctor 和日志等诊断信息中。

对于记忆文件，截断并不意味着数据丢失：文件仍会完整保留在磁盘上。在原生 Codex 中，当记忆工具可用时，`MEMORY.md` 会通过记忆工具按需读取，否则回退到有界提示。对于其他 harness，模型只会看到被缩短后的注入副本，直到它直接读取或搜索记忆。如果 `MEMORY.md` 反复被截断，应将其提炼为更短的持久摘要，把详细历史移入 `memory/*.md`，或者有意提高启动限制。

Sub-agent 会话只注入 `AGENTS.md`（其他启动文件会被过滤，以保持子代理上下文较小）。

内部钩子可以通过 `agent:bootstrap` 事件拦截此步骤，以修改或替换注入的启动文件（例如用替代人格替换 `SOUL.md`）。

为了让语气不那么泛泛，请从 [SOUL.md Personality Guide](/concepts/soul) 开始。

要查看每个注入文件的贡献大小（原始值 vs 注入值、截断、工具架构开销），请使用 `/context list` 或 `/context detail`。参见 [Context](/concepts/context)。

## 时间处理

**时间上下文**部分包含用户本地的日历日期和时区。它位于缓存边界下方，因此日期更替或时区变化不会使稳定前缀失效。

当代理需要确切的当前时间且该工具可用时，请使用 `session_status`；其状态卡片包含时间戳行。同一工具还可以选择设置每个会话的模型覆盖（`model=default` 可清除该设置）。

通过以下项进行配置：

- `agents.defaults.userTimezone`

有关完整行为详情，请参阅 [时区](/concepts/timezone) 和 [日期与时间](/date-time)。

## 技能

当存在符合条件的技能时，OpenClaw 会注入一个精简的 `<available_skills>` 列表（`formatSkillsForPrompt`），其中包含每个技能的 **文件路径** 以及一个基于内容生成的 `<version>sha256:...</version>` 标记。提示会指示模型使用 `read` 加载列出位置处的 `SKILL.md`（工作区、受管理或内置），并在某个技能的 `<version>` 与上一轮不同时时重新读取该技能。如果没有符合条件的技能，则会省略 Skills 部分。

Native Codex 回合会将此列表作为按回合作用域的协作开发者指令接收，而不是作为每轮用户输入；不过轻量级 cron 回合会保留精确的计划提示。其他执行器则保持正常的提示部分。

该位置可以指向嵌套技能，例如 `skills/personal/foo/SKILL.md`。嵌套仅用于组织；提示使用的是来自 `SKILL.md` frontmatter 的扁平技能名称。

资格包括技能元数据门控、运行时环境/配置检查，以及当配置了 `agents.defaults.skills` 或 `agents.entries.*.skills` 时的有效代理技能允许列表。插件捆绑的技能仅在其所属插件启用时才具备资格，这使得工具插件能够暴露更深入的操作指南，而无需将所有这些指导都嵌入到每个工具描述中。

```xml
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
    <version>sha256:...</version>
  </skill>
</available_skills>
```

这在保持基础提示较小的同时，仍能支持有针对性的技能使用。大小控制由技能子系统负责，独立于通用运行时读取/注入大小控制：

| 范围      | 技能提示预算                                          | 运行时摘录预算                     |
| --------- | ----------------------------------------------------- | ---------------------------------- |
| 全局      | `skills.limits.maxSkillsPromptChars`                 | `agents.defaults.contextLimits.*`  |
| 按代理    | `agents.entries.*.skillsLimits.maxSkillsPromptChars` | `agents.entries.*.contextLimits.*` |

运行时摘录预算涵盖 `memory_get`、实时工具结果以及压缩后 `AGENTS.md` 的刷新。

## 文档

**文档** 部分在可用时指向本地文档（Git 检出中的 `docs/` 或随包附带的 npm 包文档），否则回退到 [https://docs.openclaw.ai](https://docs.openclaw.ai)。它还列出了 OpenClaw 的源代码位置：Git 检出会暴露本地源根目录，包安装则会提供 GitHub 源代码 URL，并附带说明：当文档不完整或过时时，应在那里查看源代码。

在模型理解 OpenClaw 的工作方式之前，提示会将文档视为 OpenClaw 自我认知的权威来源（内存/每日笔记、会话、工具、Gateway、配置、命令、项目上下文），并告知模型将 `AGENTS.md`、项目上下文、工作区/配置文件/内存笔记以及 `memory_search` 视为指令上下文或用户记忆，而不是 OpenClaw 的设计/实现知识。如果文档保持沉默或已经过时，模型应明确说明并检查源代码。它还要求模型在可能的情况下自行运行 `openclaw status`，只有在缺乏访问权限时才询问用户。

就配置而言，它会引导代理先使用 `gateway` 工具动作 `config.schema.lookup` 获取精确的字段级文档和约束，然后再查看 `docs/gateway/configuration.md` 和 `docs/gateway/configuration-reference.md` 以获得更全面的指导。

## 相关内容

- [代理运行时](/concepts/agent)
- [代理工作区](/concepts/agent-workspace)
- [上下文引擎](/concepts/context-engine)。
