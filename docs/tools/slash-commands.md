---
summary: "斜杠命令：文本命令与原生命令，配置及支持的命令"
read_when:
  - 使用或配置聊天命令时
  - 调试命令路由或权限时
title: "斜杠命令"
---

# 斜杠命令

命令由网关（Gateway）处理。大多数命令必须作为以 `/` 开头的**独立**消息发送。  
仅限主机的 bash 聊天命令使用 `! <cmd>`（也可用 `/bash <cmd>` 作为别名）。

相关的系统有两个：

- **命令**：独立的 `/...` 消息。
- **指令（Directives）**：包括 `/think`、`/fast`、`/verbose`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - 指令在模型看到消息之前会被剥离。
  - 在普通聊天消息中（非指令唯一消息），它们被视为“内联提示”，**不会**持久化会话设置。
  - 在指令唯一消息（消息仅包含指令）中，它们会持久化到会话并回复确认。
  - 指令只对**授权发送者**生效。如果设置了 `commands.allowFrom`，它是唯一的白名单来源；否则授权来自频道白名单/配对以及 `commands.useAccessGroups`。未授权发送者看到指令会被当作纯文本处理。

还有一些**内联快捷命令**（仅限白名单/授权发送者）： `/help`、`/commands`、`/status`、`/whoami`（`/id`）。  
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
    restart: false,
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

- `commands.text`（默认 `true`）启用在聊天消息中解析 `/...`。
  - 在没有原生命令的平台上（WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams），即使将其设为 `false`，文本命令仍然可用。
- `commands.native`（默认 `"auto"`）注册原生命令。
  - 自动：Discord/Telegram 开启；Slack 关闭（直到你添加斜杠命令）；对于不支持原生命令的提供商则忽略。
  - 可设置 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native`，按提供商覆盖（布尔值或 `"auto"`）。
  - `false` 会在启动时清除 Discord/Telegram 上之前注册的命令。Slack 命令由 Slack 应用管理，不会被自动移除。
- `commands.nativeSkills`（默认 `"auto"`）在支持时以原生方式注册**技能**命令。
  - 自动：Discord/Telegram 开启；Slack 关闭（Slack 需要为每个技能创建一个斜杠命令）。
  - 可设置 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills`，按提供商覆盖（布尔值或 `"auto"`）。
- `commands.bash`（默认 `false`）启用 `! <cmd>` 来运行主机 shell 命令（`/bash <cmd>` 是别名；需要 `tools.elevated` 白名单）。
- `commands.bashForegroundMs`（默认 `2000`）控制 bash 在切换到后台模式前等待多长时间（`0` 表示立即转入后台）。
- `commands.config`（默认 `false`）启用 `/config`（读写 `openclaw.json`）。
- `commands.mcp`（默认 `false`）启用 `/mcp`（读写 OpenClaw 管理的 `mcp.servers` 下的 MCP 配置）。
- `commands.plugins`（默认 `false`）启用 `/plugins`（插件发现/状态，以及安装 + 启用/禁用控制）。
- `commands.debug`（默认 `false`）启用 `/debug`（仅运行时覆盖）。
- `commands.allowFrom`（可选）为命令授权设置按提供商划分的白名单。配置后，它是命令和指令的
  唯一授权来源（频道白名单/配对以及 `commands.useAccessGroups`
  会被忽略）。使用 `"*"` 作为全局默认值；按提供商的键会覆盖它。
- `commands.useAccessGroups`（默认 `true`）在未设置 `commands.allowFrom` 时，对命令强制执行白名单/策略。

## 命令列表

文本 + 原生（开启时）：

- `/help`
- `/commands`
- `/tools [compact|verbose]`（显示当前代理此刻可用的工具；`verbose` 会附加说明）
- `/skill <name> [input]`（按名称运行一个技能）
- `/status`（显示当前状态；在可用时包含当前模型提供商的使用情况/配额）
- `/allowlist`（列出/添加/移除白名单条目）
- `/approve <id> allow-once|allow-always|deny`（处理 exec 审批提示）
- `/context [list|detail|json]`（解释“上下文”；`detail` 会显示每个文件 + 每个工具 + 每个技能 + 系统提示词大小）
- `/btw <question>`（就当前会话提一个临时的旁支问题，而不改变未来的会话上下文；参见 [/tools/btw](/tools/btw)）
- `/export-session [path]`（别名：`/export`）（将当前会话导出为包含完整系统提示词的 HTML）
- `/whoami`（显示你的发送者 ID；别名：`/id`）
- `/session idle <duration|off>`（管理聚焦线程绑定的不活跃自动失焦）
- `/session max-age <duration|off>`（管理聚焦线程绑定的硬性最大时长自动失焦）
- `/subagents list|kill|log|info|send|steer|spawn`（检查、控制或为当前会话生成子代理运行）
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions`（检查并控制 ACP 运行时会话）
- `/agents`（列出此会话中与线程绑定的代理）
- `/focus <target>`（Discord：将此线程，或一个新线程，绑定到某个会话/子代理目标）
- `/unfocus`（Discord：移除当前线程绑定）
- `/kill <id|#|all>`（立即中止此会话中一个或所有正在运行的子代理；不会发送确认消息）
- `/steer <id|#> <message>`（立即引导一个正在运行的子代理：可在运行中引导；否则中止当前工作并使用引导消息重启）
- `/tell <id|#> <message>`（`/steer` 的别名）
- `/config show|get|set|unset`（将配置持久化到磁盘，仅所有者可用；需要 `commands.config: true`）
- `/mcp show|get|set|unset`（管理 OpenClaw MCP 服务器配置，仅所有者可用；需要 `commands.mcp: true`）
- `/plugins list|show|get|install|enable|disable`（检查发现的插件、安装新插件，并切换启用状态；写操作仅所有者可用；需要 `commands.plugins: true`）
  - `/plugin` 是 `/plugins` 的别名。
  - `/plugin install <spec>` 接受与 `openclaw plugins install` 相同的插件规格：本地路径/压缩包、npm 包，或 `clawhub:<pkg>`。
  - 启用/禁用写操作仍会回复重启提示。在受监控的前台网关上，OpenClaw 可能会在写入后立即自动执行该重启。
- `/debug show|set|unset|reset`（运行时覆盖，仅所有者可用；需要 `commands.debug: true`）
- `/usage off|tokens|full|cost`（每次响应的使用信息页脚或本地成本摘要）
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio`（控制 TTS；参见 [/tools/tts](/tools/tts)）
  - Discord：原生命令是 `/voice`（Discord 保留了 `/tts`）；文本 `/tts` 仍然可用。
- `/stop`
- `/restart`
- `/dock-telegram`（别名：`/dock_telegram`）（切换回复到 Telegram）
- `/dock-discord`（别名：`/dock_discord`）（切换回复到 Discord）
- `/dock-slack`（别名：`/dock_slack`）（切换回复到 Slack）
- `/activation mention|always`（仅限群组）
- `/send on|off|inherit`（仅限所有者）
- `/reset` 或 `/new [model]`（可选模型提示；其余作为消息体转发）
- `/think <off|minimal|low|medium|high|xhigh>`（模型/供应商动态选择；别名：`/thinking`、`/t`）
- `/fast status|on|off`（无参数时显示当前快速模式状态）
- `/verbose on|full|off`（别名：`/v`）
- `/reasoning on|off|stream`（别名：`/reason`；开启时发送带前缀 `Reasoning:` 的独立消息；`stream` = 仅 Telegram 草稿）
- `/elevated on|off|ask|full`（别名：`/elev`；`full` 跳过 exec 审批）
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`（发送 `/exec` 查看当前配置）
- `/model <name>`（别名：`/models`；或使用 `agents.defaults.models.*.alias` 中的别名）
- `/queue <mode>`（含 `debounce:2s cap:25 drop:summarize` 等选项，发送 `/queue` 查看当前设置）
- `/bash <command>`（仅主机；别名 `! <command>`；需 `commands.bash: true` + `tools.elevated` 白名单）

仅文本命令：

- `/compact [instructions]`（参见 [/concepts/compaction](/concepts/compaction)）
- `! <command>`（仅限主机；一次一个；使用 `!poll` + `!stop` 管理长运行作业）
- `!poll`（检查输出/状态；接受可选的 `sessionId`；`/bash poll` 也有效）
- `!stop`（停止正在运行的 bash 作业；接受可选的 `sessionId`；`/bash stop` 也有效）

备注：

- 命令支持可选的 `:` 作为命令与参数之间的分隔（例如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 支持模型别名、`provider/model` 格式或模糊匹配提供商名称；无匹配时，文本作为消息体处理。
- 详情的供应商使用情况请使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要启用 `commands.config=true` 且受频道 `configWrites` 控制。
- 多账户频道中，针对 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 同样遵守目标账户的 `configWrites` 权限。
- `/usage` 控制每次回复的使用信息页脚；`/usage cost` 打印来自 OpenClaw 会话日志的本地成本摘要。
- `/restart` 默认启用；设置 `commands.restart: false` 可禁用。
- Discord 专有原生命令：`/vc join|leave|status` 控制语音频道（需要启用 `channels.discord.voice` 和原生命令；文本命令不可用）。
- Discord 线程绑定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要启用有效的线程绑定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 命令参考及运行时行为见：[ACP 代理](/tools/acp-agents)。
- `/verbose` 用于调试和额外可视化，正常使用建议**关闭**。
- `/fast on|off` 支持会话覆盖。使用会话 UI 的 `inherit` 选项可清除覆盖并回退到配置默认。
- 工具失败摘要仍在相关时显示，详细失败文本仅在 `/verbose` 为 `on` 或 `full` 时包含。
- `/reasoning`（及 `/verbose`）在群组环境中风险较高：可能泄露未预期的内部推理或工具输出。建议保持关闭，特别是在群聊中。
- **快速路径：** 来自白名单发送者的纯命令消息会立即处理（绕过队列和模型）。
- **群组提及门控：** 来自白名单发送者的纯命令消息绕过提及要求。
- **内联快捷命令（仅限白名单）：** 某些命令可嵌入普通消息，在模型看到剩余文本前被剥除。
  - 示例：`hey /status` 会触发状态回复，剩余文本继续正常处理。
- 当前支持：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未授权的纯命令消息会被静默忽略，内联 `/...` 标记被视为纯文本。
- **技能命令：** 用户可调用技能以斜杠命令形式暴露。名称只允许 `a-z0-9_`（最长 32 字符）；名称冲突时加数字后缀（如 `_2`）。
  - `/skill <name> [input]` 通过名称运行技能（有助于原生命令受限时调用具体技能）。
  - 默认情况下，技能命令作为普通请求转发给模型。
  - 技能可声明 `command-dispatch: tool` 以直接路由到工具（确定性，无需模型）。
  - 示例：`/prose`（OpenProse 插件）—详见 [OpenProse](/prose)。
- **原生命令参数：** Discord 使用动态选项自动补全（缺失必需参数时显示按钮菜单）。Telegram 和 Slack 在支持选项且缺少参数时显示按钮菜单。

## `/tools`

`/tools` 回答的是一个运行时问题，而不是配置问题：**这个代理在当前对话中现在能用什么**。

- 默认的 `/tools` 是简洁模式，适合快速浏览。
- `/tools verbose` 会添加简短说明。
- 支持参数的原生命令界面提供与 `compact|verbose` 相同的模式切换。
- 结果以会话为作用域，因此更换代理、频道、线程、发送者授权或模型都可能改变输出。
- `/tools` 包括运行时实际可达的工具，包括核心工具、已连接的插件工具以及频道拥有的工具。

对于配置文件和覆盖编辑，请使用 Control UI 的 Tools 面板或配置/目录界面，而不要把 `/tools` 当作静态目录。

## 使用情况展示位置（显示在哪里）

- **供应商使用情况/配额**（例如：“Claude 剩余 80%”）会显示在当前模型供应商启用使用跟踪时的 `/status` 中。
- **每次响应的令牌/成本** 受 `/usage off|tokens|full` 控制（附加于正常回复）。
- `/model status` 显示的是**模型/认证/端点**，非使用情况。

## 模型选择（`/model`）

`/model` 实现为指令。

示例：

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model opus@anthropic:default
/model status
```

备注：

- `/model` 与 `/model list` 显示紧凑的编号选择器（模型族 + 可用供应商）。
- Discord 上，`/model` 和 `/models` 会打开包含供应商和模型下拉列表及提交步骤的交互式选择器。
- `/model <#>` 从选择器中选定（尽可能优先当前供应商）。
- `/model status` 显示详细视图，包括配置的供应商端点（`baseUrl`）和 API 模式（`api`）（如有）。

## 调试覆盖

`/debug` 允许你设置**仅运行时**的配置覆盖（内存中，不写磁盘）。仅限所有者。默认禁用；需启用 `commands.debug: true`。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

备注：

- 覆盖立即应用于新的配置读取，但**不写入** `openclaw.json`。
- 使用 `/debug reset` 清除所有覆盖，恢复磁盘配置。

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

详见 [BTW 辅助问题](/tools/btw) 中的完整行为和客户端交互细节。
