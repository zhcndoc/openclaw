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

- `commands.text` (default `true`) enables parsing `/...` in chat messages.
  - On surfaces without native commands (WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams), text commands still work even if you set this to `false`.
- `commands.native` (default `"auto"`) registers native commands.
  - Auto: on for Discord/Telegram; off for Slack (until you add slash commands); ignored for providers without native support.
  - Set `channels.discord.commands.native`, `channels.telegram.commands.native`, or `channels.slack.commands.native` to override per provider (bool or `"auto"`).
  - `false` clears previously registered commands on Discord/Telegram at startup. Slack commands are managed in the Slack app and are not removed automatically.
- `commands.nativeSkills` (default `"auto"`) registers **skill** commands natively when supported.
  - Auto: on for Discord/Telegram; off for Slack (Slack requires creating a slash command per skill).
  - Set `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills`, or `channels.slack.commands.nativeSkills` to override per provider (bool or `"auto"`).
- `commands.bash` (default `false`) enables `! <cmd>` to run host shell commands (`/bash <cmd>` is an alias; requires `tools.elevated` allowlists).
- `commands.bashForegroundMs` (default `2000`) controls how long bash waits before switching to background mode (`0` backgrounds immediately).
- `commands.config` (default `false`) enables `/config` (reads/writes `openclaw.json`).
- `commands.mcp` (default `false`) enables `/mcp` (reads/writes OpenClaw-managed MCP config under `mcp.servers`).
- `commands.plugins` (default `false`) enables `/plugins` (plugin discovery/status plus install + enable/disable controls).
- `commands.debug` (default `false`) enables `/debug` (runtime-only overrides).
- `commands.allowFrom` (optional) sets a per-provider allowlist for command authorization. When configured, it is the
  only authorization source for commands and directives (channel allowlists/pairing and `commands.useAccessGroups`
  are ignored). Use `"*"` for a global default; provider-specific keys override it.
- `commands.useAccessGroups` (default `true`) enforces allowlists/policies for commands when `commands.allowFrom` is not set.

## 命令列表

文本 + 原生（开启时）：

- `/help`
- `/commands`
- `/skill <name> [input]` (run a skill by name)
- `/status` (show current status; includes provider usage/quota for the current model provider when available)
- `/allowlist` (list/add/remove allowlist entries)
- `/approve <id> allow-once|allow-always|deny` (resolve exec approval prompts)
- `/context [list|detail|json]` (explain “context”; `detail` shows per-file + per-tool + per-skill + system prompt size)
- `/btw <question>` (ask an ephemeral side question about the current session without changing future session context; see [/tools/btw](/tools/btw))
- `/export-session [path]` (alias: `/export`) (export current session to HTML with full system prompt)
- `/whoami` (show your sender id; alias: `/id`)
- `/session idle <duration|off>` (manage inactivity auto-unfocus for focused thread bindings)
- `/session max-age <duration|off>` (manage hard max-age auto-unfocus for focused thread bindings)
- `/subagents list|kill|log|info|send|steer|spawn` (inspect, control, or spawn sub-agent runs for the current session)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (inspect and control ACP runtime sessions)
- `/agents` (list thread-bound agents for this session)
- `/focus <target>` (Discord: bind this thread, or a new thread, to a session/subagent target)
- `/unfocus` (Discord: remove the current thread binding)
- `/kill <id|#|all>` (immediately abort one or all running sub-agents for this session; no confirmation message)
- `/steer <id|#> <message>` (steer a running sub-agent immediately: in-run when possible, otherwise abort current work and restart on the steer message)
- `/tell <id|#> <message>` (alias for `/steer`)
- `/config show|get|set|unset` (persist config to disk, owner-only; requires `commands.config: true`)
- `/mcp show|get|set|unset` (manage OpenClaw MCP server config, owner-only; requires `commands.mcp: true`)
- `/plugins list|show|get|install|enable|disable` (inspect discovered plugins, install new ones, and toggle enablement; owner-only for writes; requires `commands.plugins: true`)
  - `/plugin` is an alias for `/plugins`.
  - `/plugin install <spec>` accepts the same plugin specs as `openclaw plugins install`: local path/archive, npm package, or `clawhub:<pkg>`.
  - Enable/disable writes still reply with a restart hint. On a watched foreground gateway, OpenClaw may perform that restart automatically right after the write.
- `/debug show|set|unset|reset` (runtime overrides, owner-only; requires `commands.debug: true`)
- `/usage off|tokens|full|cost` (per-response usage footer or local cost summary)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (control TTS; see [/tts](/tools/tts))
  - Discord: native command is `/voice` (Discord reserves `/tts`); text `/tts` still works.
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

## 使用界面（何处显示什么）

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
- 使用 `/debug reset` 清除所有覆盖，回复磁盘配置。

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

## MCP updates

`/mcp` writes OpenClaw-managed MCP server definitions under `mcp.servers`. Owner-only. Disabled by default; enable with `commands.mcp: true`.

Examples:

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

Notes:

- `/mcp` stores config in OpenClaw config, not Pi-owned project settings.
- Runtime adapters decide which transports are actually executable.

## Plugin updates

`/plugins` lets operators inspect discovered plugins and toggle enablement in config. Read-only flows can use `/plugin` as an alias. Disabled by default; enable with `commands.plugins: true`.

Examples:

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

Notes:

- `/plugins list` and `/plugins show` use real plugin discovery against the current workspace plus on-disk config.
- `/plugins enable|disable` updates plugin config only; it does not install or uninstall plugins.
- After enable/disable changes, restart the gateway to apply them.

## Surface notes

- **文本命令** 在普通聊天会话中运行（私聊共用 `main`，群组拥有各自的会话）。
- **原生命令** 使用隔离的会话：
  - Discord：`agent:<agentId>:discord:slash:<userId>`
  - Slack：`agent:<agentId>:slack:slash:<userId>`（可通过 `channels.slack.slashCommand.sessionPrefix` 配置前缀）
  - Telegram：`telegram:slash:<userId>`（通过 `CommandTargetSessionKey` 定向到聊天会话）
- **`/stop`** 作用于活动的聊天会话以中断当前执行。
- **Slack：** 仍支持 `channels.slack.slashCommand` 用于单一的 `/openclaw` 式命令。如果启用 `commands.native`，必须为每个内置命令创建一个 Slack 斜杠命令（同 `/help` 命令名）。Slack 的命令参数菜单通过临时 Block Kit 按钮实现。
  - Slack 原生例外：注册 `/agentstatus`（非 `/status`），因 Slack 保留 `/status`。文本命令 `/status` 在 Slack 消息中仍有效。

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
