---
summary: "OpenClaw 系统提示词包含的内容以及其组装方式"
read_when:
  - 编辑系统提示文本、工具列表或时间/心跳部分
  - 更改工作区引导加载或技能注入行为
title: "系统提示词"
---

OpenClaw 为每次代理运行构建一个自定义系统提示词。该提示词归 **OpenClaw 所有**，不使用 pi-coding-agent 的默认提示词。

该提示词由 OpenClaw 组装，并注入到每次代理运行中。

提示词组装分为三层：

- `buildAgentSystemPrompt` 根据显式输入渲染提示词。它应
  保持为纯渲染器，不应直接读取全局配置。
- `resolveAgentSystemPromptConfig` 解析由配置驱动的提示词开关，例如
  所有者显示、TTS 提示、模型别名、记忆引用模式，以及特定代理的子代理
  委派模式。
- 运行时适配器（嵌入式、CLI、命令/导出预览、压缩）收集
  实时事实，例如工具、沙箱状态、通道能力、上下文文件，
  以及提供方提示词贡献，然后调用已配置的提示词外观。

这使导出/调试提示词表面与实时运行保持一致，而不会
把每个运行时特定细节都变成一个单一的庞大构建器。

提供方插件可以贡献支持缓存感知的提示词指导，而不会替换完整的 OpenClaw 所有提示词。提供方运行时可以：

- 替换一小组命名的核心部分（`interaction_style`、
  `tool_call_style`、`execution_bias`）
- 在提示词缓存边界之上注入一个**稳定前缀**
- 在提示词缓存边界之下注入一个**动态后缀**

针对特定模型家族的调优，请使用提供方所有的贡献。将旧的
`before_prompt_build` 提示词修改保留用于兼容性或真正全局的提示词
更改，而不是作为常规提供方行为。

OpenAI GPT-5 系列叠加层保持核心执行规则简洁，并增加
针对人格锚定、简洁输出、工具纪律、并行查找、交付物覆盖、验证、缺失上下文以及
终端工具卫生的模型特定指导。

## 结构

该提示词有意保持紧凑，并使用固定部分：

- **工具**：结构化工具的真实来源提醒以及运行时工具使用指导。
- **执行偏置**：简洁的跟进指导：对可执行请求立即在当前轮次中采取行动，持续进行直到完成或被阻塞，从较弱的工具结果中恢复，实时检查可变状态，并在最终确认前进行验证。
- **安全**：简短的护栏提醒，避免追求权力或绕过监督。
- **技能**（如可用）：告诉模型如何按需加载技能说明。
- **OpenClaw 控制**：告诉模型在配置/重启工作中优先使用 `gateway` 工具，并避免编造 CLI 命令。
- **OpenClaw 自更新**：说明如何使用 `config.schema.lookup` 安全检查配置，使用 `config.patch` 修补配置，使用 `config.apply` 替换完整配置，以及仅在用户明确请求时运行 `update.run`。仅限所有者的 `gateway` 工具也会拒绝重写 `tools.exec.ask` / `tools.exec.security`，包括归一化到这些受保护执行路径的旧 `tools.bash.*` 别名。
- **工作区**：工作目录（`agents.defaults.workspace`）。
- **文档**：OpenClaw 文档/源码的本地路径以及何时阅读它们。
- **工作区文件（已注入）**：指示下方包含了启动文件。
- **沙箱**（如启用）：指示沙箱化运行时、沙箱路径，以及是否可使用提升权限的执行。
- **当前日期与时间**：仅时区（缓存稳定；实时时钟来自 `session_status`）。
- **助手输出指令**：简洁的附件、语音笔记和回复标签语法。
- **心跳**：在为默认代理启用心跳时，心跳提示与确认行为。
- **运行时**：主机、操作系统、node、模型、仓库根目录（如检测到）、思考级别（一行）。
- **推理**：当前可见性级别 + `/reasoning` 切换提示。

OpenClaw 将包括 **项目上下文** 在内的大块稳定内容保留在
内部提示词缓存边界之上。像控制 UI 嵌入指导、**消息**、**语音**、**群聊上下文**、
**反应**、**心跳** 和 **运行时** 这样的易变通道/会话部分会被追加到该边界之下，
以便具有前缀缓存的本地后端可以在通道轮次之间复用稳定的工作区前缀。
工具描述同样应避免嵌入当前通道名称，因为已接受的 schema 已经携带了该运行时细节。

工具部分还包含针对长时间运行工作的运行时指导：

- 对未来的后续处理（`check back later`、提醒、周期性工作）
  使用 cron，而不是 `exec` 睡眠循环、`yieldMs` 延迟技巧或重复的 `process`
  轮询
- 仅将 `exec` / `process` 用于从现在开始并在后台继续运行的命令
- 当启用自动完成唤醒时，只启动一次命令，并在其输出或失败时依赖基于推送的唤醒路径
- 当你需要检查正在运行的命令时，使用 `process` 获取日志、状态、输入或干预
- 如果任务更大，优先使用 `sessions_spawn`；子代理完成是基于推送的，并会自动回告请求方
- 不要仅为了等待完成而循环轮询 `subagents list` / `sessions_list`

`agents.defaults.subagents.delegationMode` 可以加强此指导。默认的 `suggest` 模式保留基础提示。`prefer` 会增加一个专门的 **子代理委派** 部分，告诉主代理充当响应式协调者，并将任何比直接回复更复杂的内容通过 `sessions_spawn` 推出去。这只是提示词层面的；工具策略仍然控制 `sessions_spawn` 是否可用。

当启用实验性 `update_plan` 工具时，工具部分还会告诉
模型仅将其用于非平凡的多步骤工作，保持恰好一个
`in_progress` 步骤，并避免在每次更新后重复整份计划。

系统提示词中的安全护栏仅作建议。它们引导模型行为，但不会强制执行策略。应使用工具策略、exec 审批、沙箱和通道白名单来进行硬性约束；运营者可按设计禁用这些功能。

在带有原生审批卡片/按钮的通道上，运行时提示词现在会告诉
代理优先依赖原生审批 UI。只有当工具结果表明聊天审批不可用，或
手动审批是唯一途径时，才应包含手动 `/approve` 命令。

## 提示词模式

OpenClaw 可以为子代理渲染更小的系统提示词。运行时会为每次运行设置一个
`promptMode`（这不是面向用户的配置）：

- `full` (default): 包含上面的所有部分。
- `minimal`: 用于子代理；省略 **Memory Recall**、**OpenClaw
  Self-Update**、**Model Aliases**、**User Identity**、**Assistant Output Directives**、
  **Messaging**、**Silent Replies** 和 **Heartbeats**。当提供时，Tooling、**Safety**、
  **Skills**、Workspace、Sandbox、Current Date & Time（如已知）、Runtime，以及注入的上下文保持可用。
- `none`: 仅返回基础身份行。

当 `promptMode=minimal` 时，额外注入的提示词会标记为 **子代理
上下文**，而不是 **群聊上下文**。

对于通道自动回复运行，当直接、群组或仅消息工具上下文拥有可见回复合同时，OpenClaw 会省略通用的 **静默回复** 部分。只有旧的自动群组/通道模式才应显示 `NO_REPLY`；直接聊天和仅消息工具回复不会收到静默令牌指引。

## 提示词快照

OpenClaw 为 Codex 运行时的正常路径保留已提交的提示词快照，位于
`test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/`。它们会渲染
选定的 app-server 线程/轮次参数，以及针对 Telegram 私聊、Discord 群组和心跳轮次重建的
模型绑定提示层栈。该栈包括一个固定的 Codex `gpt-5.5` 模型提示词
样例，该样例由 Codex 的模型目录/缓存形状生成，Codex 的正常路径权限开发者文本，
OpenClaw 开发者指令，当 OpenClaw 提供它们时的轮次范围协作模式指令，
用户轮次输入，以及动态工具规范的引用。

使用
`pnpm prompt:snapshots:sync-codex-model` 刷新固定的 Codex 模型提示词样例。默认情况下，脚本会先查找 Codex 的运行时缓存
`$CODEX_HOME/models_cache.json`，然后是 `~/.codex/models_cache.json`，最后才回退到维护者 Codex 检出约定
`~/code/codex/codex-rs/models-manager/models.json`。如果这些来源都不存在，命令会在不更改已提交样例的情况下退出。传递 `--catalog <path>` 可从特定的 `models_cache.json`
或 `models.json` 文件刷新。

这些快照仍然不是逐字节的原始 OpenAI 请求捕获。在 OpenClaw 发送线程和轮次参数之后，Codex 仍然可以在 Codex 运行时内部添加运行时拥有的工作区上下文，例如 `AGENTS.md`、环境上下文、记忆、应用/插件指令，以及内置的 Default 协作模式指令。

使用 `pnpm prompt:snapshots:gen` 重新生成它们，并使用
`pnpm prompt:snapshots:check` 验证漂移。CI 会在额外的边界分片中运行漂移检查，以便提示词变更和快照更新保持附着在同一个 PR 上。

## 工作区引导注入

引导文件会被裁剪并追加到 **项目上下文** 下方，因此模型无需显式读取也能看到身份和个人资料上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅适用于全新的工作区）
- `MEMORY.md`（如存在）

这些文件中的所有内容都会在每一轮被**注入到上下文窗口中**，除非
某个特定文件的门控规则生效。默认代理在心跳被禁用时，或
`agents.defaults.heartbeat.includeSystemPromptSection` 为 false 时，正常运行会省略 `HEARTBEAT.md`。请保持注入
文件简洁，尤其是 `MEMORY.md`。`MEMORY.md` 的设计目标是保持为
经过整理的长期摘要；详细的日常笔记应放在 `memory/*.md` 中，便于 `memory_search` 和 `memory_get` 按需检索。过大的
`MEMORY.md` 文件会增加提示词使用量，并可能因为下面的引导文件限制而被部分注入。

当会话运行在原生 Codex 运行器上时，Codex 会通过其自身的项目文档发现机制加载 `AGENTS.md`。OpenClaw 仍然会解析其余引导文件并将它们作为 Codex 配置指令转发，因此 `SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md` 会保持相同的工作区上下文角色，而不会重复 `AGENTS.md`。

<Note>
`memory/*.md` 日常文件**不**属于正常引导的项目上下文。普通轮次中，它们通过 `memory_search` 和 `memory_get` 工具按需访问，因此除非模型显式读取，否则它们不会计入上下文窗口。裸 `/new` 和 `/reset` 轮次是例外：运行时可以在该第一轮之前预先附加最近的日常记忆，作为一次性的启动上下文块。
</Note>

大文件会被截断并附加标记。每个文件的最大大小由
`agents.defaults.bootstrapMaxChars` 控制（默认值：12000）。跨文件的总注入引导
内容上限由 `agents.defaults.bootstrapTotalMaxChars`
控制（默认值：60000）。缺失文件会注入一个简短的缺失文件标记。当发生截断
时，OpenClaw 可以注入一条简洁的系统提示词警告；通过
`agents.defaults.bootstrapPromptTruncationWarning`（`off`、`once`、`always`；
默认值：`always`）进行控制。详细的原始/注入计数会保留在诸如
`/context`、`/status`、doctor 和日志等诊断信息中。

对于记忆文件，截断并不意味着数据丢失：文件在磁盘上仍然完整，
但模型只会看到被缩短后的注入副本，直到它直接读取或搜索
记忆。如果 `MEMORY.md` 反复被截断，请将其提炼为一个
更短的持久摘要，并把详细历史迁移到 `memory/*.md` 中，或者
有意提高引导限制。

子代理会话仅注入 `AGENTS.md` 和 `TOOLS.md`（其他引导文件会被过滤掉，以保持子代理上下文更小）。

内部钩子可以通过 `agent:bootstrap` 拦截此步骤，以修改或替换
注入的引导文件（例如将 `SOUL.md` 替换为另一个人格）。

如果你想让代理的声音不那么通用，可以先从
[SOUL.md 人格指南](/concepts/soul)开始。

要检查每个注入文件分别贡献了多少内容（原始 vs 注入、截断，以及工具 schema 开销），可使用 `/context list` 或 `/context detail`。参见 [上下文](/concepts/context)。

## 时间处理

当已知用户时区时，系统提示词会包含专门的 **当前日期与时间** 部分。为了保持提示词缓存稳定，它现在只包含
**时区**（不包含动态时钟或时间格式）。

当代理需要当前时间时，请使用 `session_status`；状态卡会包含时间戳行。该工具还可以选择设置每个会话的模型覆盖（`model=default` 会清除它）。

通过以下项进行配置：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat`（`auto` | `12` | `24`）

有关完整行为细节，参见 [日期与时间](/date-time)。

## 技能

当存在符合条件的技能时，OpenClaw 会注入一个简洁的**可用技能列表**
（`formatSkillsForPrompt`），其中包含每个技能的**文件路径**。提示词指示模型使用 `read` 加载列出位置的 `SKILL.md`（工作区、托管或内置）。如果没有符合条件的技能，则省略技能部分。

符合条件包括技能元数据门控、运行时环境/配置检查，
以及在配置了 `agents.defaults.skills` 或 `agents.list[].skills` 时生效的代理技能允许列表。

仅当其所属插件启用时，插件捆绑的技能才符合条件。
这使工具插件能够暴露更深入的操作指南，而无需将所有这些指导直接嵌入到每个工具描述中。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

这在保持基础提示词较小的同时，仍然支持有针对性的技能使用。

技能列表预算由技能子系统拥有：

- 全局默认值：`skills.limits.maxSkillsPromptChars`
- 每个代理的覆盖：`agents.list[].skillsLimits.maxSkillsPromptChars`

通用的受限运行时摘录使用不同的表面：

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

这种拆分使技能大小与运行时读取/注入大小分开，例如 `memory_get`、实时工具结果以及压缩后 AGENTS.md 刷新。

## 文档

系统提示词包含一个 **文档** 部分。当本地文档可用时，它会指向本地 OpenClaw 文档目录（Git 检出中的 `docs/`，或随 npm 包附带的文档）。如果本地文档不可用，它会回退到 [https://docs.openclaw.ai](https://docs.openclaw.ai)。

同一部分还包含 OpenClaw 源码位置。Git 检出会暴露本地源码根目录，以便代理可以直接检查代码。包安装则包含 GitHub 源码 URL，并告知代理在文档不完整或过时时，优先在那里审查源码。提示词还注明了公开文档镜像、社区 Discord，以及用于发现技能的 ClawHub（[https://clawhub.ai](https://clawhub.ai)）。它会告诉模型在了解 OpenClaw 的行为、命令、配置或架构时，先查阅文档，并在可能的情况下自行运行 `openclaw status`（仅在无法访问时才询问用户）。对于配置部分，它会将代理指向 `gateway` 工具动作 `config.schema.lookup`，以获取精确的字段级文档和约束，然后再查看 `docs/gateway/configuration.md` 和 `docs/gateway/configuration-reference.md` 以获得更广泛的指导。

## 相关内容

- [代理运行时](/concepts/agent)
- [代理工作区](/concepts/agent-workspace)
- [上下文引擎](/concepts/context-engine)
