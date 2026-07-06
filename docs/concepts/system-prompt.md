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

- **工具链**：结构化工具的唯一事实来源提醒，以及运行时工具使用指导。当启用实验性的 `update_plan` 工具（`tools.experimental.planTool`）时，它自己的工具说明会补充：仅用于非平凡的多步骤工作，最多保持一个步骤处于 `in_progress` 状态，并且简单的一步工作要跳过它。
- **执行偏向**：对可执行请求按顺序立即处理，持续执行直到完成或受阻，从较弱的工具结果中恢复，实时检查可变状态，并在最终确认前进行验证。
- **安全性**：针对寻求权力行为或绕过监督的简短防护提醒。
- **技能**（如可用）：告诉模型如何按需加载技能说明。
- **OpenClaw 控制**：配置/重启相关工作优先使用 `gateway` 工具；不要臆造 CLI 命令。
- **OpenClaw 自更新**：使用 `config.schema.lookup` 安全检查配置，使用 `config.patch` 打补丁，使用 `config.apply` 替换完整配置，并且仅在用户明确请求时运行 `update.run`。面向代理的 `gateway` 工具拒绝重写 `tools.exec.ask` / `tools.exec.security`，包括归一化到这些受保护路径的旧版 `tools.bash.*` 别名。
- **工作区**：工作目录（`agents.defaults.workspace`）。
- **文档**：本地文档/源码路径，以及何时读取它们。
- **工作区文件（注入）**：说明启动文件包含在下方。
- **沙箱**（如启用）：沙箱运行时、沙箱路径、提升执行可用性。
- **当前日期与时间**：仅时区信息（可缓存稳定；实时钟表来自 `session_status`）。
- **助手输出指令**：紧凑附件、语音备注和回复标签语法。
- **心跳**：当默认代理启用心跳时，心跳提示和确认应答行为。
- **运行时**：主机、操作系统、node、模型、仓库根目录（如检测到）、思考级别（一行）。
- **推理**：当前可见级别以及 `/reasoning` 切换提示。

大型稳定内容（包括 **项目上下文**）保留在内部提示缓存边界之上。每轮变化的部分（控制 UI 嵌入指南、**消息**、**语音**、**群聊上下文**、**反应**、**心跳**、**运行时**）会附加在该边界之下，因此本地后端可以通过前缀缓存，在各个通道轮次之间复用稳定的工作区前缀。工具说明应避免嵌入当前通道名称，因为已接受的 schema 已经携带了该运行时细节。

工具链还包含长期任务指导：

- 对于未来的后续跟进（`稍后再检查`、提醒、周期性工作），使用 cron，而不是 `exec` 睡眠循环、`yieldMs` 延迟技巧或重复的 `process` 轮询
- 仅对“现在开始并在后台继续”的命令使用 `exec` / `process`
- 当启用自动完成唤醒时，只启动一次命令并依赖推送式唤醒路径
- 使用 `process` 处理运行中命令的日志、状态、输入或干预
- 对于较大的任务，优先使用 `sessions_spawn`；子代理完成是推送式的，并会自动回告给请求者
- 不要为了等待完成而循环轮询 `subagents list` / `sessions_list`

`agents.defaults.subagents.delegationMode`（默认 `"suggest"`）可以加强这一点。`"prefer"` 会增加一个专门的 **子代理委派** 部分，告诉主代理充当响应式协调者，并将任何比直接回复更复杂的事情通过 `sessions_spawn` 发出。这里仅涉及提示词；工具策略仍然控制 `sessions_spawn` 是否可用。

系统提示词中的安全防护条款只是建议性的，而非强制执行。应使用工具策略、exec 审批、沙箱和通道白名单来进行硬性约束；运营者可以按设计禁用提示词防护条款。

在带有原生审批卡片/按钮的通道中，提示词会要求代理优先依赖该 UI，并且仅当工具结果表明聊天审批不可用或手动审批是唯一途径时，才在聊天中包含手动的 `/approve` 命令。

## 提示词模式

OpenClaw 会为子代理渲染更小的系统提示词。运行时会为每次运行设置一个 `promptMode`（不是面向用户的配置）：

- `full`（默认）：包含上面的所有部分。
- `minimal`：用于子代理；省略记忆提示部分（打包为 **Memory Recall**）、**OpenClaw Self-Update**、**Model Aliases**、**User Identity**、**Assistant Output Directives**、**Messaging**、**Silent Replies** 和 **Heartbeats**。工具、**Safety**、**Skills**（如有提供）、Workspace、Sandbox、已知时的当前日期和时间、Runtime，以及注入的上下文仍然可用。
- `none`：仅返回基础身份行。

在 `promptMode=minimal` 下，额外注入的提示词会标记为 **Subagent Context**，而不是 **Group Chat Context**。

对于 channel 自动回复运行，当直接、群组或仅消息工具上下文已经拥有可见回复契约时，OpenClaw 会省略通用的 **Silent Replies** 部分。只有传统的自动群组/channel 模式会显示 `NO_REPLY`；直接聊天和仅消息工具回复会跳过静默标记指引。

## 提示词快照

OpenClaw 会为 Codex 运行时的 happy path 保留已提交的提示词快照，路径位于 `test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/`。它们会渲染选定的 app-server 线程/轮次参数，以及为 Telegram 直聊、Discord 群聊和 heartbeat 轮次重建出的模型绑定提示层栈：一个固定的 Codex `gpt-5.5` 模型提示词夹具、Codex happy-path 权限开发者文本、OpenClaw 开发者指令、当 OpenClaw 提供时的轮次作用域协作模式指令、用户轮次输入，以及对动态工具规范的引用。

使用 `pnpm prompt:snapshots:sync-codex-model` 刷新固定的 Codex 模型提示词夹具。默认情况下，它会依次查找 `$CODEX_HOME/models_cache.json`、`~/.codex/models_cache.json`，然后是维护者检出约定 `~/code/codex/codex-rs/models-manager/models.json`；如果这些都不存在，它会直接退出而不修改已提交的夹具。传入 `--catalog <path>` 可从特定的 `models_cache.json` 或 `models.json` 文件刷新。

这些快照并不是逐字节的原始 OpenAI 请求捕获。在 OpenClaw 发送线程和轮次参数之后，Codex 还可以添加运行时拥有的工作区上下文（`AGENTS.md`、环境上下文、记忆、app/plugin 指令、内置的 Default 协作模式指令）。

使用 `pnpm prompt:snapshots:gen` 重新生成；使用 `pnpm prompt:snapshots:check` 验证漂移。CI 会将漂移检查与额外边界分片一并运行，因此提示词变更和快照更新会在同一个 PR 中落地。

## 工作区引导注入

启动文件会从活动工作区中解析，并根据其生命周期路由到对应的提示层：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅适用于全新的工作区）
- `MEMORY.md`（如存在）

在原生 Codex harness 中，OpenClaw 会避免在每个用户轮次中重复注入稳定的工作区文件。Codex 通过其自身的项目文档发现机制加载 `AGENTS.md`。`TOOLS.md` 会作为继承的 Codex 开发者指令转发。`SOUL.md`、`IDENTITY.md` 和 `USER.md` 会作为按轮次范围协作的开发者指令转发，因此原生 Codex 子代理不会继承它们。`HEARTBEAT.md` 的内容不会被直接注入；当该文件存在且非空时，心跳轮次会得到一条协作模式提示，指向该文件。`MEMORY.md` 的内容也不会被粘贴到每个原生 Codex 轮次中：当工作区可用记忆工具时，Codex 轮次会得到一条简短的工作区记忆提示，引导模型使用 `memory_search` 或 `memory_get`。如果工具被禁用、记忆搜索不可用，或者活动工作区与代理记忆工作区不同，则 `MEMORY.md` 会回退到正常的有界轮次上下文路径。`BOOTSTRAP.md` 保持正常的轮次上下文角色。

在非 Codex harness 上，启动文件会根据其现有门控组合进 OpenClaw 提示中。默认代理禁用心跳，或者 `agents.defaults.heartbeat.includeSystemPromptSection` 为 false 时，正常运行下会省略 `HEARTBEAT.md`。请保持注入文件简洁，尤其是非 Codex 的 `MEMORY.md`：它应当保持为经过整理的长期摘要，详细的每日笔记则保存在 `memory/*.md` 中，并可通过 `memory_search` / `memory_get` 按需检索。过大的非 Codex `MEMORY.md` 文件会增加提示用量，并可能在下面的启动文件限制下被部分注入。

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

子代理会话只注入 `AGENTS.md` 和 `TOOLS.md`（其他启动文件会被过滤掉，以保持子代理上下文更小）。

内部钩子可以通过 `agent:bootstrap` 事件拦截此步骤，以修改或替换注入的启动文件（例如用替代人格替换 `SOUL.md`）。

为了让语气不那么泛泛，请从 [SOUL.md Personality Guide](/concepts/soul) 开始。

要查看每个注入文件的贡献大小（原始值 vs 注入值、截断、工具架构开销），请使用 `/context list` 或 `/context detail`。参见 [Context](/concepts/context)。

## 时间处理

仅当已知用户时区时，**当前日期和时间**部分才会显示，并且仅包含 **时区**（不包含动态时钟或时间格式），以保持提示缓存稳定。

当代理需要当前时间时，请使用 `session_status`；其状态卡片包含一行时间戳。同一个工具还可以选择性地设置每个会话的模型覆盖（`model=default` 会清除它）。

通过以下项进行配置：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat`（`auto` | `12` | `24`）

有关完整行为详情，请参阅 [时区](/concepts/timezone) 和 [日期与时间](/date-time)。

## 技能

当存在符合条件的技能时，OpenClaw 会注入一个精简的 `<available_skills>` 列表（`formatSkillsForPrompt`），其中包含每个技能的 **文件路径** 以及一个基于内容生成的 `<version>sha256:...</version>` 标记。提示会指示模型使用 `read` 加载列出位置处的 `SKILL.md`（工作区、受管理或内置），并在某个技能的 `<version>` 与上一轮不同时时重新读取该技能。如果没有符合条件的技能，则会省略 Skills 部分。

Native Codex 回合会将此列表作为按回合作用域的协作开发者指令接收，而不是作为每轮用户输入；不过轻量级 cron 回合会保留精确的计划提示。其他执行器则保持正常的提示部分。

该位置可以指向嵌套技能，例如 `skills/personal/foo/SKILL.md`。嵌套仅用于组织；提示使用的是来自 `SKILL.md` frontmatter 的扁平技能名称。

符合条件包括技能元数据门控、运行时环境/配置检查，以及在配置了 `agents.defaults.skills` 或 `agents.list[].skills` 时的有效代理技能允许列表。只有当插件的所有者插件启用时，插件捆绑的技能才符合条件，这使得工具插件能够暴露更深层的操作指南，而无需将所有这些指导都嵌入到每个工具说明中。

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

| 范围     | 技能提示预算                              | 运行时摘录预算                    |
| -------- | ----------------------------------------- | --------------------------------- |
| 全局     | `skills.limits.maxSkillsPromptChars`      | `agents.defaults.contextLimits.*` |
| 每代理   | `agents.list[].skillsLimits.maxSkillsPromptChars` | `agents.list[].contextLimits.*`   |

运行时摘录预算涵盖 `memory_get`、实时工具结果以及压缩后 `AGENTS.md` 的刷新。

## 文档

**文档** 部分在可用时指向本地文档（Git 检出中的 `docs/` 或随包附带的 npm 包文档），否则回退到 [https://docs.openclaw.ai](https://docs.openclaw.ai)。它还列出了 OpenClaw 的源代码位置：Git 检出会暴露本地源根目录，包安装则会提供 GitHub 源代码 URL，并附带说明：当文档不完整或过时时，应在那里查看源代码。

在模型理解 OpenClaw 的工作方式之前，提示会将文档视为 OpenClaw 自我认知的权威来源（内存/每日笔记、会话、工具、Gateway、配置、命令、项目上下文），并告知模型将 `AGENTS.md`、项目上下文、工作区/配置文件/内存笔记以及 `memory_search` 视为指令上下文或用户记忆，而不是 OpenClaw 的设计/实现知识。如果文档保持沉默或已经过时，模型应明确说明并检查源代码。它还要求模型在可能的情况下自行运行 `openclaw status`，只有在缺乏访问权限时才询问用户。

就配置而言，它会引导代理先使用 `gateway` 工具动作 `config.schema.lookup` 获取精确的字段级文档和约束，然后再查看 `docs/gateway/configuration.md` 和 `docs/gateway/configuration-reference.md` 以获得更全面的指导。

## 相关内容

- [代理运行时](/concepts/agent)
- [代理工作区](/concepts/agent-workspace)
- [上下文引擎](/concepts/context-engine)
