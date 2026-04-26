---
summary: "斜杠命令：文本命令与原生命令，配置及支持的命令"
read_when:
  - 使用或配置聊天命令时
  - 调试命令路由或权限时
title: "斜杠命令"
---

命令由 Gateway 处理。大多数命令必须作为以 `/` 开头的**独立**消息发送。
仅主机 bash 聊天命令使用 `! <cmd>`（`/bash <cmd>` 作为别名）。

相关的系统有两个：

- **命令**：独立 `/...` 消息。
- **指令**：`/think`, `/fast`, `/verbose`, `/trace`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue`。
  - 指令在模型看到消息之前会从消息中剥离。
  - 在正常聊天消息中（非仅指令），它们被视为“内联提示”，**不**持久化会话设置。
  - 在仅指令消息中（消息仅包含指令），它们会持久化到会话并回复确认。
  - 指令仅适用于**授权发送者**。如果设置了 `commands.allowFrom`，它是唯一使用的白名单；否则授权来自频道白名单/配对加上 `commands.useAccessGroups`。
    未授权的发送者看到指令被视为纯文本。

还有一些**内联快捷命令**（仅限白名单/授权发送者）：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。  
它们会立即运行，在模型看到消息前被剥离，剩余文本继续正常处理流程。

## 配置

```json5
{
  commands: {
    native: "auto",
    nativeSkills: "auto",
    text: true,
    bash: false,
    bashForegroundMs: 2000,
    config: false,
    mcp: false,
    plugins: false,
    debug: false,
    restart: true,
    ownerAllowFrom: ["discord:123456789012345678"],
    ownerDisplay: "raw",
    ownerDisplaySecret: "${OWNER_ID_HASH_SECRET}",
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

- `commands.text`（默认 `true`）启用在聊天消息中解析 `/...`。
  - 在没有原生命令的界面上（WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams），即使将其设为 `false`，文本命令仍然可用。
- `commands.native`（默认 `"auto"`）注册原生命令。
  - 自动：Discord/Telegram 开启；Slack 关闭（直到你添加斜杠命令）；对不支持原生能力的提供方忽略。
  - 可设置 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以按提供方覆盖（布尔值或 `"auto"`）。
  - `false` 会在启动时清除 Discord/Telegram 上之前注册的命令。Slack 命令由 Slack 应用管理，不会自动移除。
- `commands.nativeSkills`（默认 `"auto"`）在支持时以原生方式注册**技能**命令。
  - 自动：Discord/Telegram 开启；Slack 关闭（Slack 需要为每个技能创建一个斜杠命令）。
  - 可设置 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以按提供方覆盖（布尔值或 `"auto"`）。
- `commands.bash`（默认 `false`）启用 `! <cmd>` 运行主机 shell 命令（`/bash <cmd>` 是别名；需要 `tools.elevated` 白名单）。
- `commands.bashForegroundMs`（默认 `2000`）控制 bash 在切换到后台模式前等待多久（`0` 表示立即后台运行）。
- `commands.config`（默认 `false`）启用 `/config`（读取/写入 `openclaw.json`）。
- `commands.mcp`（默认 `false`）启用 `/mcp`（读取/写入 `mcp.servers` 下由 OpenClaw 管理的 MCP 配置）。
- `commands.plugins`（默认 `false`）启用 `/plugins`（插件发现/状态以及安装 + 启用/禁用控制）。
- `commands.debug`（默认 `false`）启用 `/debug`（仅运行时覆盖）。
- `commands.restart`（默认 `true`）启用 `/restart` 以及网关重启工具操作。
- `commands.ownerAllowFrom`（可选）为仅限 owner 的命令/工具界面设置显式的 owner 白名单。这与 `commands.allowFrom` 不同。
- 按频道的 `channels.<channel>.commands.enforceOwnerForCommands`（可选，默认 `false`）使仅限 owner 的命令在该界面上运行时必须使用**owner 身份**。当为 `true` 时，发送者必须要么匹配已解析的 owner 候选（例如 `commands.ownerAllowFrom` 中的一项或提供方原生 owner 元数据），要么在内部消息频道上持有内部 `operator.admin` 作用域。频道 `allowFrom` 中的通配符条目，或空/未解析的 owner 候选列表，**都不**足够——仅限 owner 的命令在该频道上会失败并关闭。若你希望仅限 owner 的命令只由 `ownerAllowFrom` 和标准命令白名单门禁控制，请不要开启此项。
- `commands.ownerDisplay` 控制 owner id 在系统提示中的显示方式：`raw` 或 `hash`。
- `commands.ownerDisplaySecret` 可选地设置当 `commands.ownerDisplay="hash"` 时使用的 HMAC 密钥。
- `commands.allowFrom`（可选）为命令授权设置按提供方划分的白名单。配置后，它是命令和指令的**唯一**授权来源（频道白名单/配对及 `commands.useAccessGroups` 会被忽略）。使用 `"*"` 作为全局默认值；提供方专属键会覆盖它。
- `commands.useAccessGroups`（默认 `true`）在未设置 `commands.allowFrom` 时，对命令强制执行白名单/策略。

## 命令列表

当前事实来源：

- 核心内置来自 `src/auto-reply/commands-registry.shared.ts`
- 生成的 Dock 命令来自 `src/auto-reply/commands-registry.data.ts`
- 插件命令来自插件 `registerCommand()` 调用
- 网关上的实际可用性仍取决于配置标志、频道界面和已安装/已启用的插件

### 核心内置命令

当前可用的内置命令：

- `/new [model]` 启动一个新会话；`/reset` 是重置别名。
- `/reset soft [message]` 保留当前转录，丢弃复用的 CLI 后端会话 id，并在原地重新运行启动/系统提示加载。
- `/compact [instructions]` 压缩会话上下文。参见 [/concepts/compaction](/concepts/compaction)。
- `/stop` 中止当前运行。
- `/session idle <duration|off>` 和 `/session max-age <duration|off>` 管理线程绑定过期。
- `/think <level>` 设置思考级别。选项来自当前模型的提供方配置文件；常见级别有 `off`、`minimal`、`low`、`medium` 和 `high`，自定义级别如 `xhigh`、`adaptive`、`max` 或二值 `on` 仅在支持时可用。别名：`/thinking`、`/t`。
- `/verbose on|off|full` 切换详细输出。别名：`/v`。
- `/trace on|off` 切换当前会话的插件追踪输出。
- `/fast [status|on|off]` 显示或设置快速模式。
- `/reasoning [on|off|stream]` 切换推理可见性。别名：`/reason`。
- `/elevated [on|off|ask|full]` 切换提升模式。别名：`/elev`。
- `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` 显示或设置 exec 默认值。
- `/model [name|#|status]` 显示或设置模型。
- `/models [provider] [page] [limit=<n>|size=<n>|all]` 列出提供方或某提供方的模型。
- `/queue <mode>` 管理队列行为（`steer`、`interrupt`、`followup`、`collect`、`steer-backlog`），以及诸如 `debounce:2s cap:25 drop:summarize` 之类的选项。
- `/help` 显示简短帮助摘要。
- `/commands` 显示生成的命令目录。
- `/tools [compact|verbose]` 显示当前代理此刻可用的工具。
- `/status` 显示执行/运行时状态，包括 `Execution`/`Runtime` 标签以及可用时的提供方使用量/配额。
- `/tasks` 列出当前会话中活跃/最近的后台任务。
- `/context [list|detail|json]` 解释上下文如何组装。
- `/export-session [path]` 将当前会话导出为 HTML。别名：`/export`。
- `/export-trajectory [path]` 将当前会话导出为 JSONL [轨迹包](/tools/trajectory)。别名：`/trajectory`。
- `/whoami` 显示你的发送者 id。别名：`/id`。
- `/skill <name> [input]` 运行指定名称的技能。
- `/allowlist [list|add|remove] ...` 管理白名单条目。仅文本。
- `/approve <id> <decision>` 解决 exec 审批提示。
- `/btw <question>` 在不更改未来会话上下文的情况下提出一个附带问题。参见 [/tools/btw](/tools/btw)。
- `/subagents list|kill|log|info|send|steer|spawn` 管理当前会话的子代理运行。
- `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` 管理 ACP 会话和运行时选项。
- `/focus <target>` 将当前 Discord 线程或 Telegram 主题/对话绑定到会话目标。
- `/unfocus` 移除当前绑定。
- `/agents` 列出当前会话的线程绑定代理。
- `/kill <id|#|all>` 中止一个或所有正在运行的子代理。
- `/steer <id|#> <message>` 向正在运行的子代理发送 steering。别名：`/tell`。
- `/config show|get|set|unset` 读取或写入 `openclaw.json`。仅限 owner。需要 `commands.config: true`。
- `/mcp show|get|set|unset` 读取或写入 `mcp.servers` 下由 OpenClaw 管理的 MCP 服务器配置。仅限 owner。需要 `commands.mcp: true`。
- `/plugins list|inspect|show|get|install|enable|disable` 检查或修改插件状态。`/plugin` 是别名。写操作仅限 owner。需要 `commands.plugins: true`。
- `/debug show|set|unset|reset` 管理仅运行时配置覆盖。仅限 owner。需要 `commands.debug: true`。
- `/usage off|tokens|full|cost` 控制每次响应的使用量页脚或打印本地成本摘要。
- `/tts on|off|status|provider|limit|summary|audio|help` 控制 TTS。参见 [/tools/tts](/tools/tts)。
- `/restart` 在启用时重启 OpenClaw。默认：已启用；设置 `commands.restart: false` 以禁用它。
- `/activation mention|always` 设置群组激活模式。
- `/send on|off|inherit` 设置发送策略。仅限 owner。
- `/bash <command>` 运行主机 shell 命令。仅文本。别名：`! <command>`。需要 `commands.bash: true` 以及 `tools.elevated` 白名单。
- `!poll [sessionId]` 检查后台 bash 作业。
- `!stop [sessionId]` 停止后台 bash 作业。

### 生成的 Dock 命令

Dock 命令由支持原生命令的频道插件生成。当前捆绑集合：

- `/dock-discord`（别名：`/dock_discord`）
- `/dock-mattermost`（别名：`/dock_mattermost`）
- `/dock-slack`（别名：`/dock_slack`）
- `/dock-telegram`（别名：`/dock_telegram`）

### 捆绑插件命令

捆绑插件可以添加更多斜杠命令。当前仓库中的捆绑命令：

- `/dreaming [on|off|status|help]` 切换记忆梦境。参见 [Dreaming](/concepts/dreaming)。
- `/pair [qr|status|pending|approve|cleanup|notify]` 管理设备配对/设置流程。参见 [Pairing](/channels/pairing)。
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` 暂时武装高风险手机节点命令。
- `/voice status|list [limit]|set <voiceId|name>` 管理 Talk 语音配置。在 Discord 上，原生命令名称是 `/talkvoice`。
- `/card ...` 发送 LINE 富卡片预设。参见 [LINE](/channels/line)。
- `/codex status|models|threads|resume|compact|review|account|mcp|skills` 检查和控制捆绑的 Codex 应用服务器框架。参见 [Codex Harness](/plugins/codex-harness)。
- 仅限 QQBot 的命令：
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### 动态技能命令

用户可调用的技能也作为斜杠命令暴露：

- `/skill <name> [input]` 始终作为通用入口工作。
- 当技能/插件注册它们时，技能也可能作为直接命令出现，如 `/prose`。
- 原生技能命令注册由 `commands.nativeSkills` 和 `channels.<provider>.commands.nativeSkills` 控制。

备注：

- 命令接受命令和参数之间可选的 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 接受模型别名、`provider/model` 或提供商名称（模糊匹配）；如果没有匹配，文本被视为消息正文。
- 对于完整的提供商使用情况细分，使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 并遵守频道 `configWrites`。
- 在多账户频道中，针对配置的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也遵守目标账户的 `configWrites`。
- `/usage` 控制每响应用量页脚；`/usage cost` 从 OpenClaw 会话日志打印本地成本摘要。
- `/restart` 默认启用；设置 `commands.restart: false` 以禁用它。
- `/plugins install <spec>` 接受与 `openclaw plugins install` 相同的插件规格：本地路径/归档、npm 包或 `clawhub:<pkg>`。
- `/plugins enable|disable` 更新插件配置并可能提示重启。
- 仅限 Discord 的原生命令：`/vc join|leave|status` 控制语音频道（需要 `channels.discord.voice` 和原生命令；不可作为文本使用）。
- Discord 线程绑定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要启用有效的线程绑定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 命令参考和运行时行为：[ACP Agents](/tools/acp-agents)。
- `/verbose` 用于调试和额外可见性；在正常使用时保持**关闭**。
- `/trace` 比 `/verbose` 更窄：它仅揭示插件拥有的追踪/调试行，并保持正常详细工具闲聊关闭。
- `/reasoning`、`/verbose` 和 `/trace` 在群组设置中有风险：它们可能会泄露你不想暴露的内部推理、工具输出或插件诊断。建议保持关闭，尤其是在群聊中。
- `/model` 立即持久化新会话模型。
- 如果代理空闲，下次运行立即使用它。
- 如果运行已经活跃，OpenClaw 将实时切换标记为待处理，并仅在干净的重试点重启到新模型。
- 如果工具活动或回复输出已经开始，待处理切换可以保持排队直到后来的重试机会或下一个用户轮次。
- **快速路径：** 来自白名单发送者的仅命令消息立即处理（绕过队列 + 模型）。
- **群组提及门禁：** 来自白名单发送者的仅命令消息绕过提及要求。
- **内联快捷方式（仅限白名单发送者）：** 某些命令嵌入在正常消息中时也有效，并在模型看到剩余文本之前被剥离。
  - 示例：`hey /status` 触发状态回复，剩余文本继续通过正常流程。
- 当前：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未授权的仅命令消息被静默忽略，内联 `/...` 标记被视为纯文本。
- **技能命令：** `user-invocable` 技能作为斜杠命令暴露。名称被清理为 `a-z0-9_`（最多 32 个字符）；冲突获得数字后缀（例如 `_2`）。
  - `/skill <name> [input]` 按名称运行技能（当原生命令限制阻止每个技能命令时有用）。
  - 默认情况下，技能命令作为正常请求转发给模型。
  - 技能可以选择声明 `command-dispatch: tool` 以将命令直接路由到工具（确定性，无模型）。
  - 示例：`/prose`（OpenProse 插件）— 参见 [OpenProse](/prose)。
- **原生命令参数：** Discord 使用自动补全用于动态选项（当你省略必需参数时还有按钮菜单）。Telegram 和 Slack 在命令支持选项且你省略参数时显示按钮菜单。

## `/tools`

`/tools` 回答的是一个运行时问题，而不是配置问题：**这个代理在当前对话中现在能用什么**。

- 默认的 `/tools` 是简洁模式，适合快速浏览。
- `/tools verbose` 会添加简短说明。
- 支持参数的原生命令界面提供与 `compact|verbose` 相同的模式切换。
- 结果以会话为作用域，因此更换代理、频道、线程、发送者授权或模型都可能改变输出。
- `/tools` 包括运行时实际可达的工具，包括核心工具、已连接的插件工具以及频道拥有的工具。

对于配置文件和覆盖编辑，请使用 Control UI 的 Tools 面板或配置/目录界面，而不要把 `/tools` 当作静态目录。

## 使用情况展示位置（显示在哪里）

- **Provider usage/quota**（示例：“Claude 还剩 80%”）会在启用用量跟踪时，显示在当前模型提供商的 `/status` 中。OpenClaw 会将提供商窗口归一化为“剩余百分比”；对于 MiniMax，在显示前会将仅剩余百分比字段取反，而 `model_remains` 响应会优先采用聊天模型条目以及带模型标记的计划标签。
- **Token/cache lines** 在 `/status` 中，如果实时会话快照信息较少，可回退到最新的转写用量条目。现有的非零实时值仍然优先，转写回退也可以恢复活动运行时模型标签，以及在存储总量缺失或更小时提供更大的、以提示词为导向的总量。
- **Execution vs runtime:** `/status` 报告 `Execution` 表示有效的沙箱路径，报告 `Runtime` 表示当前实际运行会话的主体：`OpenClaw Pi Default`、`OpenAI Codex`、CLI 后端或 ACP 后端。
- **每次响应的 token/费用** 由 `/usage off|tokens|full` 控制（附加到普通回复后）。
- `/model status` 关心的是**模型/认证/端点**，而不是用量。

## 模型选择（`/model`）

`/model` 实现为指令。

示例：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model opus@anthropic:default
/model status
```

备注：

- `/model` 与 `/model list` 显示紧凑的编号选择器（模型族 + 可用供应商）。
- 在 Discord 上，`/model` 和 `/models` 会打开包含供应商和模型下拉列表及提交步骤的交互式选择器。
- `/model <#>` 从选择器中选定（尽可能优先当前供应商）。
- `/model status` 显示详细视图，包括配置的供应商端点（`baseUrl`）和 API 模式（`api`）（如有）。

## 调试覆盖

`/debug` 允许你设置**仅运行时**的配置覆盖（仅在内存中，不写入磁盘）。仅限所有者。默认禁用；需启用 `commands.debug: true`。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

备注：

- 覆盖会立即应用于新的配置读取，但**不会**写入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆盖，恢复磁盘配置。

## 插件追踪输出

`/trace` 允许你切换 **会话范围内的插件追踪/调试行**，而无需开启完整详细模式。

示例：

```text
/trace
/trace on
/trace off
```

备注：

- 不带参数的 `/trace` 显示当前会话的追踪状态。
- `/trace on` 为当前会话启用插件追踪行。
- `/trace off` 再次禁用它们。
- 插件追踪行可以出现在 `/status` 中，也可以作为正常助手回复后的后续诊断消息。
- `/trace` 不替代 `/debug`；`/debug` 仍然管理仅运行时的配置覆盖。
- `/trace` 不替代 `/verbose`；正常的详细工具/状态输出仍属于 `/verbose`。

## 配置更新

`/config` 写入你的磁盘配置（`openclaw.json`）。仅限所有者。默认禁用；启用需 `commands.config: true`。

示例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

备注：

- 写入前执行配置验证，无效修改将被拒绝。
- `/config` 更改会在重启后持久生效。

## MCP 更新

`/mcp` 会将 OpenClaw 管理的 MCP 服务器定义写入 `mcp.servers`。仅限所有者。默认禁用；启用需 `commands.mcp: true`。

示例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

备注：

- `/mcp` 将配置存储在 OpenClaw 配置中，而不是 Pi 拥有的项目设置中。
- 运行时适配器决定哪些传输方式实际上可执行。

## 插件更新

`/plugins` 允许操作员检查已发现的插件，并在配置中切换启用状态。只读流程可以使用 `/plugin` 作为别名。默认禁用；需启用 `commands.plugins: true`。

示例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

备注：

- `/plugins list` 和 `/plugins show` 使用针对当前工作区以及磁盘配置的真实插件发现。
- `/plugins enable|disable` 仅更新插件配置；不会安装或卸载插件。
- 启用/禁用更改后，重启网关以应用它们。

## 表面说明

- **文本命令** 在普通聊天会话中运行（私聊共用 `main`，群组拥有各自的会话）。
- **原生命令** 使用隔离的会话：
  - Discord：`agent:<agentId>:discord:slash:<userId>`
  - Slack：`agent:<agentId>:slack:slash:<userId>`（可通过 `channels.slack.slashCommand.sessionPrefix` 配置前缀）
  - Telegram：`telegram:slash:<userId>`（通过 `CommandTargetSessionKey` 定向到聊天会话）
- **`/stop`** 作用于活动的聊天会话以中断当前执行。
- **Slack：** 仍支持 `channels.slack.slashCommand` 用于单一的 `/openclaw` 式命令。如果启用 `commands.native`，必须为每个内置命令创建一个 Slack 斜杠命令（同 `/help` 命令名）。Slack 的命令参数菜单通过临时 Block Kit 按钮实现。
  - Slack 原生命令例外：注册 `/agentstatus`（非 `/status`），因为 Slack 保留了 `/status`。文本命令 `/status` 在 Slack 消息中仍然有效。

## BTW 辅助问题

`/btw` 是针对当前会话的快速**辅助提问**。

与普通聊天不同：

- 它使用当前会话作为背景上下文，
- 它作为独立的**无工具**单次调用运行，
- 不会改变未来会话上下文，
- 不会写入对话历史，
- 会作为实时辅助结果传递而非普通助手消息。

这使得 `/btw` 在你需要临时澄清而主任务继续时非常有用。

示例：

```text
/btw what are we doing right now?
```

有关完整行为和客户端 UX 细节，请参阅 [BTW Side Questions](/tools/btw)。

## 相关内容

- [Skills](/tools/skills)
- [Skills config](/tools/skills-config)
- [Creating skills](/tools/creating-skills)
