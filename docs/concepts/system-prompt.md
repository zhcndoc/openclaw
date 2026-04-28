---
summary: "OpenClaw 系统提示包含内容及其如何组装"
read_when:
  - 编辑系统提示文本、工具列表或时间/心跳部分
  - 更改工作区引导或技能注入行为
title: "系统提示"
---

OpenClaw 为每次代理运行构建一个自定义系统提示。该提示由 **OpenClaw 拥有**，并且不使用 pi-coding-agent 的默认提示。

提示由 OpenClaw 组装并注入到每次代理运行中。

Provider 插件可以提供缓存感知的提示指导，而无需替换完整的 OpenClaw 拥有提示。Provider 运行时可以：

- 替换少量命名的核心部分（`interaction_style`, `tool_call_style`, `execution_bias`）
- 在提示缓存边界之上注入一个 **稳定前缀**
- 在提示缓存边界之下注入一个 **动态后缀**

使用 Provider 拥有的贡献进行模型系列特定的调优。保留遗留的 `before_prompt_build` 提示修改以保持兼容性或进行真正的全局提示更改，而不是正常的 Provider 行为。

OpenAI GPT-5 系列叠加层会保持核心执行规则较小，并为人格黏附、简洁输出、工具纪律、并行查找、交付物覆盖、验证、缺失上下文以及终端工具卫生添加模型特定指导。

## Structure

提示设计得简洁，使用固定的部分：

- **工具**: 结构化工具的事实来源提醒，以及运行时工具使用指导。
- **执行偏差**: 简洁的后续执行指导：对可执行请求立即在当前轮次中行动，持续执行直到完成或受阻，从弱工具结果中恢复，实时检查可变状态，并在最终完成前进行验证。
- **安全性**: 简短的护栏提醒，避免权力寻求行为或绕过监督。
- **技能**（可用时）: 告诉模型如何按需加载技能说明。
- **OpenClaw 自我更新**: 如何使用 `config.schema.lookup` 安全检查配置、用 `config.patch` 打补丁、用 `config.apply` 替换完整配置，以及仅在用户明确请求时运行 `update.run`。仅限所有者的 `gateway` 工具也会拒绝重写 `tools.exec.ask` / `tools.exec.security`，包括规范化为这些受保护 exec 路径的旧版 `tools.bash.*` 别名。
- **工作区**: 工作目录（`agents.defaults.workspace`）。
- **文档**: OpenClaw 文档的本地路径（repo 或 npm 包）以及何时阅读它们。
- **工作区文件（已注入）**: 表示下方已包含引导文件。
- **沙盒**（启用时）: 表示沙盒运行时、沙盒路径，以及是否可用提权执行。
- **当前日期和时间**: 用户本地时间、时区和时间格式。
- **回复标签**: 受支持提供方可选的回复标签语法。
- **心跳**: 在默认代理启用心跳时，心跳提示和确认行为。
- **运行时**: 主机、操作系统、node、模型、仓库根目录（检测到时）、思考级别（一行）。
- **推理**: 当前可见性级别 + `/reasoning` 切换提示。

Tooling 部分还包括针对长期运行工作的运行时指导：

- 使用 cron 进行后续跟进（`check back later`，提醒，重复性工作），而不是 `exec` 睡眠循环、`yieldMs` 延迟技巧或重复的 `process` 轮询
- 仅对现在启动并在后台继续运行的命令使用 `exec` / `process`
- 当启用自动完成唤醒时，启动命令一次，并在其输出或失败时依赖基于推送的唤醒路径
- 当需要检查运行中的命令时，使用 `process` 获取日志、状态、输入或干预
- 如果任务较大，首选 `sessions_spawn`；子代理完成是基于推送的，并自动向请求者宣布
- 不要循环轮询 `subagents list` / `sessions_list` 仅仅为了等待完成

当实验性的 `update_plan` 工具启用时，Tooling 还告诉模型仅将其用于非平凡的多步工作，保持恰好一个 `in_progress` 步骤，并避免在每次更新后重复整个计划。

系统提示中的安全护栏是建议性的。它们指导模型行为但不执行政策。使用工具策略、执行批准、沙盒和通道允许列表进行硬执行；操作员可以根据设计禁用这些。

在具有原生批准卡片/按钮的通道上，运行时提示现在告诉代理首先依赖该原生批准 UI。仅当工具结果说明聊天批准不可用或手动批准是唯一路径时，才应包含手动 `/approve` 命令。

## 提示模式

OpenClaw 可为子代理渲染较小的系统提示。运行时为每次运行设置一个 `promptMode`（非面向用户的配置）：

- `full`（默认）：包含上述所有部分。
- `minimal`：用于子代理；省略 **技能**、**记忆回忆**、**OpenClaw 自我更新**、**模型别名**、**用户身份**、**回复标签**、**消息**、**静默回复** 和 **心跳**。仍保留工具、**安全性**、工作区、沙盒、已知时的当前日期和时间、运行时及注入的上下文。
- `none`：仅返回基本身份行。

当 `promptMode=minimal` 时，额外注入的提示标记为 **子代理上下文**，而非 **群聊上下文**。

For channel auto-reply runs, OpenClaw can omit the generic **Silent Replies**
section when the direct/group chat context already includes the resolved
conversation-specific `NO_REPLY` behavior. This avoids repeating token mechanics
in both the global system prompt and channel context.

## 工作区引导注入

引导文件会被裁剪并附加在 **项目上下文** 下，让模型无需显式读取即可感知身份和配置上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (仅在全新工作区中)
- `MEMORY.md`（当存在时）

除非应用了特定文件的门控，否则所有这些文件都会在每一轮对话中**注入到上下文窗口**中。当默认代理禁用心跳或 `agents.defaults.heartbeat.includeSystemPromptSection` 为 false 时，`HEARTBEAT.md` 在正常运行中被省略。保持注入文件简洁——尤其是 `MEMORY.md`，它可能会随时间增长，导致意外的高上下文使用和更频繁的压缩。

<Note>
`memory/*.md` daily files are **not** part of the normal bootstrap Project Context. On ordinary turns they are accessed on demand via the `memory_search` and `memory_get` tools, so they do not count against the context window unless the model explicitly reads them. Bare `/new` and `/reset` turns are the exception: the runtime can prepend recent daily memory as a one-shot startup-context block for that first turn.
</Note>

大型文件会用标记截断。每个文件的最大大小由 `agents.defaults.bootstrapMaxChars` 控制（默认：12000）。跨文件注入的总引导内容上限为 `agents.defaults.bootstrapTotalMaxChars`（默认：60000）。缺失文件会注入一个简短的缺失文件标记。当发生截断时，OpenClaw 可以在项目上下文中注入一个警告块；可通过 `agents.defaults.bootstrapPromptTruncationWarning`（`off`、`once`、`always`；默认：`once`）进行控制。

子代理会话仅注入 `AGENTS.md` 和 `TOOLS.md`（过滤掉其他引导文件以保持子代理上下文精简）。

内部钩子可通过 `agent:bootstrap` 拦截此步骤，从而修改或替换注入的引导文件（例如用替代角色的 `SOUL.md` 进行替换）。

如果你想让代理听起来不那么通用，从 [SOUL.md 个性指南](/concepts/soul) 开始。

要检查每个注入文件的贡献量（原始与注入，截断，加上工具模式开销），使用 `/context list` 或 `/context detail`。参见 [上下文](/concepts/context)。

## 时间处理

系统提示在已知用户时区时包含专门的 **当前日期和时间** 部分。为保证提示缓存的稳定性，现在仅包含 **时区**（无动态时钟或时间格式）。

当代理需要当前时间时使用 `session_status`；状态卡片包含时间戳行。同一工具可以选择性地设置每会话模型覆盖（`model=default` 清除它）。

配置参数包括：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

详见 [日期和时间](/date-time) 了解完整行为细节。

## 技能

当存在可用技能时，OpenClaw 注入紧凑的 **可用技能列表**（`formatSkillsForPrompt`），包括每个技能的 **文件路径**。提示指示模型使用 `read` 以加载列出位置（工作区、托管或捆绑）的 SKILL.md 文件。若无可用技能，则省略技能部分。

资格包括技能元数据门控、运行时环境/配置检查，以及当配置了 `agents.defaults.skills` 或 `agents.list[].skills` 时的有效代理技能允许列表。

Plugin-bundled skills are eligible only when their owning plugin is enabled.
This lets tool plugins expose deeper operating guides without embedding all of
that guidance directly in every tool description.

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

此设计保持基础提示体积小，同时支持有针对性的技能使用。

技能列表预算由 skills 子系统负责：

- 全局默认值：`skills.limits.maxSkillsPromptChars`
- 每个 agent 的覆盖项：`agents.list[].skillsLimits.maxSkillsPromptChars`

通用的有界运行时摘录使用另一套配置面：

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

这种拆分让 skills 的预算与运行时读入/注入预算彼此独立，例如 `memory_get`、实时工具结果，以及压缩后 AGENTS.md 刷新注入等都走运行时那套限制。

## 文档

当可用时，系统提示会包含一个 **文档** 部分，指向本地 OpenClaw 文档目录（仓库工作区中的 `docs/` 或捆绑的 npm 包文档），并注明公共镜像、源代码仓库、社区 Discord，以及用于技能发现的 ClawHub（[https://clawhub.ai](https://clawhub.ai)）。提示会指示模型优先查阅本地文档以了解 OpenClaw 的行为、命令、配置或架构，并在可能时自行运行 `openclaw status`（仅在无法访问时才询问用户）。

## 相关

- [代理运行时](/concepts/agent)
- [代理工作区](/concepts/agent-workspace)
- [上下文引擎](/concepts/context-engine)
