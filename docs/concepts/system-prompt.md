---
summary: "OpenClaw 系统提示包含内容及其如何组装"
read_when:
  - 编辑系统提示文本、工具列表或时间/心跳部分时
  - 更改工作区引导或技能注入行为时
title: "系统提示"
---

# 系统提示

OpenClaw 为每次代理运行构建自定义的系统提示。该提示由 **OpenClaw 拥有**，不使用 pi-coding-agent 默认的提示。

提示由 OpenClaw 组装并注入到每次代理运行中。

## 结构

提示设计得简洁，使用固定的部分：

- **工具**：当前工具列表 + 简短描述。
- **安全性**：简短的护栏提示，避免追求权力行为或绕过监督。
- **技能**（如有）：告知模型如何按需加载技能指令。
- **OpenClaw 自我更新**：如何运行 `config.apply` 和 `update.run`。
- **工作区**：工作目录（`agents.defaults.workspace`）。
- **文档**：指向 OpenClaw 本地文档路径（仓库或 npm 包）及何时阅读。
- **工作区文件（注入）**：指示已包含引导文件。
- **沙盒**（启用时）：指示沙盒运行时、沙盒路径及是否可使用提升权限执行。
- **当前日期和时间**：用户本地时间、时区及时间格式。
- **回复标签**：支持的服务提供商的可选回复标签语法。
- **心跳**：心跳提示和确认（ack）行为。
- **运行时**：主机、操作系统、节点、模型、仓库根路径（检测到时）、思考水平（一行）。
- **推理**：当前可见级别 + /reasoning 切换提示。

系统提示中的安全护栏是建议性质的。它们指导模型行为，但不执行策略。要实现严格执行，应使用工具策略、执行批准、沙盒和通道允许列表；运营者可按设计禁用这些功能。

## 提示模式

OpenClaw 可为子代理渲染较小的系统提示。运行时为每次运行设置一个 `promptMode`（非面向用户的配置）：

- `full`（默认）：包含上述所有部分。
- `minimal`：用于子代理；省略 **技能**、**记忆回忆**、**OpenClaw 自我更新**、**模型别名**、**用户身份**、**回复标签**、**消息**、**静默回复** 和 **心跳**。仍保留工具、**安全性**、工作区、沙盒、已知时的当前日期和时间、运行时及注入的上下文。
- `none`：仅返回基本身份行。

当 `promptMode=minimal` 时，额外注入的提示标记为 **子代理上下文**，而非 **群聊上下文**。

## 工作区引导注入

引导文件会被裁剪并附加在 **项目上下文** 下，让模型无需显式读取即可感知身份和配置上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅在新建工作区时）
- `MEMORY.md` 和/或 `memory.md`（工作区内存在时；两者之一或两者均可注入）

所有这些文件均 **注入上下文窗口**，即占用代币。请保持简洁——尤其是 `MEMORY.md`，它可能随着时间增长，导致意外较高的上下文使用和更频繁的压缩。

> **注意：** `memory/*.md` 日常文件**不会**自动注入。它们通过 `memory_search` 和 `memory_get` 工具按需访问，只有模型显式读取时才占用上下文窗口。

大型文件会被截断并标记。每个文件的最大大小由 `agents.defaults.bootstrapMaxChars` 控制（默认：20000）。所有文件总注入大小上限由 `agents.defaults.bootstrapTotalMaxChars` 控制（默认：150000）。缺失的文件会注入简短的缺失标记。发生截断时，OpenClaw 可在项目上下文中注入警告块；通过 `agents.defaults.bootstrapPromptTruncationWarning`（`off`、`once`、`always`；默认：`once`）进行控制。

子代理会话仅注入 `AGENTS.md` 和 `TOOLS.md`（过滤掉其他引导文件以保持子代理上下文精简）。

内部钩子可通过 `agent:bootstrap` 拦截此步骤，从而修改或替换注入的引导文件（例如用替代角色的 `SOUL.md` 进行替换）。

要检查每个注入文件的贡献量（原始 vs 注入、截断情况及工具模式开销），可使用 `/context list` 或 `/context detail`。详见 [Context](/concepts/context)。

## 时间处理

系统提示在已知用户时区时包含专门的 **当前日期和时间** 部分。为保证提示缓存的稳定性，现在仅包含 **时区**（无动态时钟或时间格式）。

当代理需要当前时间时，请使用 `session_status`；状态卡包含时间戳行。

配置参数包括：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

详见 [日期和时间](/date-time) 了解完整行为细节。

## 技能

当存在可用技能时，OpenClaw 注入紧凑的 **可用技能列表**（`formatSkillsForPrompt`），包括每个技能的 **文件路径**。提示指示模型使用 `read` 以加载列出位置（工作区、托管或捆绑）的 SKILL.md 文件。若无可用技能，则省略技能部分。

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

## 文档

如可用，系统提示包含 **文档** 部分，指向本地 OpenClaw 文档目录（仓库中 `docs/` 或捆绑的 npm 包文档），并标注公共镜像、源代码仓库、社区 Discord 及 ClawHub（[https://clawhub.com](https://clawhub.com)）以便技能发现。提示指示模型优先查阅本地文档以了解 OpenClaw 行为、命令、配置或架构，且尽可能自行执行 `openclaw status`（仅在缺少访问权限时询问用户）。
