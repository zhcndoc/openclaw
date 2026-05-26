---
summary: "斜杠命令：文本 vs 原生、配置和支持的命令"
read_when:
  - 使用或配置聊天命令时
  - 调试命令路由或权限时
title: "斜杠命令"
sidebarTitle: "斜杠命令"
---

命令由 Gateway 处理。大多数命令必须作为以 `/` 开头的**独立**消息发送。仅主机可用的 bash 聊天命令使用 `! <cmd>`（`/bash <cmd>` 为别名）。

当对话或线程绑定到 ACP 会话时，正常的后续文本会路由到该 ACP harness。Gateway 管理命令仍然保持本地：`/acp ...` 始终会到达 OpenClaw ACP 命令处理器，而 `/status` 和 `/unfocus` 在为该界面启用命令处理时始终保持本地。

有两个相关系统：

<AccordionGroup>
  <Accordion title="命令">
    独立的 `/...` 消息。
  </Accordion>
  <Accordion title="指令">
    `/think`、`/fast`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。

    - 指令会在模型看到消息之前从消息中移除。
    - 在普通聊天消息中（非仅指令消息），它们会被视为“行内提示”，并且不会持久化会话设置。
    - 在仅指令消息中（消息只包含指令），它们会持久化到会话并回复确认。
    - 指令只对**已授权发送者**生效。如果设置了 `commands.allowFrom`，它就是唯一使用的允许列表；否则授权来自频道允许列表/配对以及 `commands.useAccessGroups`。未授权发送者会看到指令被当作纯文本处理。

  </Accordion>
  <Accordion title="行内快捷方式">
    仅限被允许列表/已授权发送者：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。

    它们会立即运行，在模型看到消息之前被移除，而剩余文本会继续通过正常流程。

  </Accordion>
</AccordionGroup>

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

<ParamField path="commands.text" type="boolean" default="true">
  启用在聊天消息中解析 `/...`。在没有原生命令的平台（WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams）上，即使你将其设为 `false`，文本命令仍然可用。
</ParamField>
<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  注册原生命令。自动：在 Discord/Telegram 上启用；在 Slack 上关闭（直到你添加斜杠命令）；对于没有原生支持的提供方则忽略。可设置 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 按提供方覆盖（bool 或 `"auto"`）。在 Discord 上，`false` 会在启动期间跳过斜杠命令注册和清理；先前注册的命令可能仍然可见，直到你将它们从 Discord 应用中移除。Slack 命令由 Slack 应用管理，不会自动移除。
</ParamField>
在 Discord 上，原生命令规范可以包含 `descriptionLocalizations`，OpenClaw 会将其发布为 Discord `description_localizations` 并在一致性检查比较中包含它。
<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  在支持时以原生方式注册**技能**命令。自动：在 Discord/Telegram 上启用；在 Slack 上关闭（Slack 需要为每个技能创建一个斜杠命令）。可设置 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 按提供方覆盖（bool 或 `"auto"`）。
</ParamField>
<ParamField path="commands.bash" type="boolean" default="false">
  启用 `! <cmd>` 运行主机 shell 命令（`/bash <cmd>` 为别名；需要 `tools.elevated` 允许列表）。
</ParamField>
<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  控制 bash 在切换到后台模式之前等待多长时间（`0` 表示立即转入后台）。
</ParamField>
<ParamField path="commands.config" type="boolean" default="false">
  启用 `/config`（读取/写入 `openclaw.json`）。
</ParamField>
<ParamField path="commands.mcp" type="boolean" default="false">
  启用 `/mcp`（读取/写入 `mcp.servers` 下由 OpenClaw 管理的 MCP 配置）。
</ParamField>
<ParamField path="commands.plugins" type="boolean" default="false">
  启用 `/plugins`（插件发现/状态以及安装 + 启用/禁用控制）。
</ParamField>
<ParamField path="commands.debug" type="boolean" default="false">
  启用 `/debug`（仅运行时覆盖）。
</ParamField>
<ParamField path="commands.restart" type="boolean" default="true">
  启用 `/restart` 以及 gateway 重启工具操作。
</ParamField>
<ParamField path="commands.ownerAllowFrom" type="string[]">
  为仅 owner 的命令界面和 owner 门控的频道操作设置显式的 owner 允许列表。这是可以批准危险操作并运行诸如 `/diagnostics`、`/export-trajectory` 和 `/config` 等命令的人类操作员账号。它独立于 `commands.allowFrom` 和 DM 配对访问。
</ParamField>
<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  按频道：使仅 owner 的命令在该界面上运行时需要**owner 身份**。当为 `true` 时，发送者必须要么匹配一个已解析的 owner 候选项（例如 `commands.ownerAllowFrom` 中的一项或提供方原生 owner 元数据），要么在内部消息频道上拥有内部 `operator.admin` 范围。频道 `allowFrom` 中的通配符条目，或空/未解析的 owner 候选列表，都**不**足够——仅 owner 的命令会在该频道上失败并关闭。若你希望仅 owner 的命令只由 `ownerAllowFrom` 和标准命令允许列表进行门控，请保持关闭。
</ParamField>
<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  控制 owner id 在系统提示词中的显示方式。
</ParamField>
<ParamField path="commands.ownerDisplaySecret" type="string">
  可选设置在 `commands.ownerDisplay="hash"` 时使用的 HMAC 密钥。
</ParamField>
<ParamField path="commands.allowFrom" type="object">
  用于命令授权的按提供方允许列表。配置后，它就是命令和指令唯一的授权来源（会忽略频道允许列表/配对以及 `commands.useAccessGroups`）。使用 `"*"` 作为全局默认值；特定提供方的键会覆盖它。
</ParamField>
<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  当未设置 `commands.allowFrom` 时，对命令强制执行允许列表/策略。
</ParamField>

## 命令列表

当前事实来源：

- core 内置项来自 `src/auto-reply/commands-registry.shared.ts`
- 生成的 dock 命令来自 `src/auto-reply/commands-registry.data.ts`
- 插件命令来自插件的 `registerCommand()` 调用
- 你的 gateway 上的实际可用性仍然取决于配置标志、频道界面以及已安装/启用的插件

### Core 内置命令

<AccordionGroup>
  <Accordion title="Sessions and runs">
    - `/new [model]` 归档当前会话并开始一个新的会话；`/reset` 会就地清空当前会话。它们不是别名。
    - 控制 UI 会拦截输入的 `/new`，以创建并切换到一个新的仪表板会话，除非配置了 `session.dmScope: "main"` 且当前父会话是代理的主会话；在这种情况下，`/new` 会就地重置主会话。输入的 `/reset` 仍会执行 Gateway 的就地重置。
    - `/reset soft [message]` 保留当前转录，删除重复使用的 CLI 后端会话 id，并就地重新运行启动/系统提示词加载。
    - `/compact [instructions]` 压缩会话上下文。见 [Compaction](/concepts/compaction)。
    - `/stop` 中止当前运行。
    - `/session idle <duration|off>` 和 `/session max-age <duration|off>` 管理线程绑定过期。
    - `/export-session [path]` 将当前会话导出为 HTML。别名：`/export`。
    - `/export-trajectory [path]` 会请求 exec 批准，然后为当前会话导出 JSONL [trajectory bundle](/tools/trajectory)。当你需要某个 OpenClaw 会话的提示词、工具和转录时间线时使用它。在群聊中，批准提示和导出结果会私下发送给 owner。别名：`/trajectory`。

  </Accordion>
  <Accordion title="Model and run controls">
    - `/think <level|default>` 设置思考级别或清除会话覆盖。选项来自活动模型的提供方配置文件；常见级别有 `off`、`minimal`、`low`、`medium` 和 `high`，在支持的情况下还可使用自定义级别，如 `xhigh`、`adaptive`、`max` 或二进制 `on`。别名：`/thinking`、`/t`。
    - `/verbose on|off|full` 切换详细输出。别名：`/v`。
    - `/trace on|off` 切换当前会话的插件 trace 输出。
    - `/fast [status|on|off|default]` 显示、设置或清除快速模式。
    - `/reasoning [on|off|stream]` 切换推理可见性。别名：`/reason`。
    - `/elevated [on|off|ask|full]` 切换提升模式。别名：`/elev`。
    - `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` 显示或设置 exec 默认值。
    - `/model [name|#|status]` 显示或设置模型。
    - `/models [provider] [page] [limit=<n>|size=<n>|all]` 列出为某提供方配置/可用授权的提供方或模型；添加 `all` 可浏览该提供方的完整目录。`agents.defaults.models` 中的 `provider/*` 条目会让 `/model` 和 `/models` 仅为这些提供方显示已发现的模型。
    - `/queue <mode>` 管理活动运行队列行为（`steer`、`followup`、`collect`、`interrupt`），以及诸如 `debounce:0.5s cap:25 drop:summarize` 之类的选项；`/queue default` 或 `/queue reset` 会清除会话覆盖。运行中途的提示默认会在没有队列指令的情况下进行引导。见 [Command queue](/concepts/queue) 和 [Steering queue](/concepts/queue-steering)。
    - `/steer <message>` 为当前会话中的活动运行注入引导，独立于 `/queue` 模式。如果无法引导或会话处于空闲状态，`<message>` 会继续作为普通提示。别名：`/tell`。见 [Steer](/tools/steer)。

  </Accordion>
  <Accordion title="Discovery and status">
    - `/help` 显示简短帮助摘要。
    - `/commands` 显示生成的命令目录。
    - `/tools [compact|verbose]` 显示当前代理此刻可用的内容。
    - `/status` 显示执行/运行时状态、Gateway 和系统运行时间，以及可用时的提供方用量/配额。
    - `/diagnostics [note]` 是用于 Gateway bug 和 Codex harness 运行的仅 owner 支持报告流程。它每次都会在运行 `openclaw gateway diagnostics export --json` 之前请求显式的 exec 批准；不要用 allow-all 规则批准 diagnostics。批准后，它会发送一份可粘贴的报告，包含本地 bundle 路径、清单摘要、隐私说明和相关会话 id。在群聊中，批准提示和报告会私下发送给 owner。当活动会话使用 OpenAI Codex harness 时，同样的批准还会向 OpenAI 服务器发送相关 Codex 反馈，并且完成后的回复会列出 OpenClaw 会话 id、Codex 线程 id，以及 `codex resume <thread-id>` 命令。见 [Diagnostics Export](/gateway/diagnostics)。
    - `/crestodian <request>` 从 owner DM 中运行 Crestodian 设置和修复助手。
    - `/tasks` 列出当前会话的活动/近期后台任务。
    - `/context [list|detail|map|json]` 解释上下文是如何组装的。`map` 会发送当前会话上下文的树状图图像。
    - `/whoami` 显示你的发送者 id。别名：`/id`。
    - `/usage off|tokens|full|cost` 控制每条响应的使用量页脚或打印本地成本摘要。

  </Accordion>
  <Accordion title="Skills, allowlists, approvals">
    - `/skill <name> [input]` 按名称运行一个技能。
    - `/allowlist [list|add|remove] ...` 管理允许列表条目。仅文本。
    - `/approve <id> <decision>` 解决 exec 或插件批准提示。
    - `/btw <question>` 在不更改未来会话上下文的情况下提出一个旁支问题。别名：`/side`。见 [BTW](/tools/btw)。

  </Accordion>
  <Accordion title="Subagents and ACP">
    - `/subagents list|log|info` 检查当前会话的子代理运行。
    - `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` 管理 ACP 会话和运行时选项。
    - `/focus <target>` 将当前 Discord 线程或 Telegram 主题/对话绑定到一个会话目标。
    - `/unfocus` 移除当前绑定。
    - `/agents` 列出当前会话中绑定线程的代理。

  </Accordion>
  <Accordion title="仅 owner 写入和管理">
    - `/config show|get|set|unset` 读取或写入 `openclaw.json`。仅 owner。需要 `commands.config: true`。
    - `/mcp show|get|set|unset` 读取或写入 `mcp.servers` 下由 OpenClaw 管理的 MCP 服务器配置。仅 owner。需要 `commands.mcp: true`。
    - `/plugins list|inspect|show|get|install|enable|disable` 检查或修改插件状态。`/plugin` 是别名。写入仅限 owner。需要 `commands.plugins: true`。
    - `/debug show|set|unset|reset` 管理仅运行时配置覆盖。仅 owner。需要 `commands.debug: true`。
    - `/restart` 在启用时重启 OpenClaw。默认：启用；设置 `commands.restart: false` 可禁用它。
    - `/send on|off|inherit` 设置发送策略。仅 owner。

  </Accordion>
  <Accordion title="语音、TTS、频道控制">
    - `/tts on|off|status|chat|latest|provider|limit|summary|audio|help` 控制 TTS。见 [TTS](/tools/tts)。
    - `/activation mention|always` 设置群组激活模式。
    - `/bash <command>` 运行主机 shell 命令。仅文本。别名：`! <command>`。需要 `commands.bash: true` 加上 `tools.elevated` 允许列表。
    - `!poll [sessionId]` 检查后台 bash 作业。
    - `!stop [sessionId]` 停止后台 bash 作业。

  </Accordion>
</AccordionGroup>

### 生成的 dock 命令

Dock 命令会将当前会话的回复路由切换到另一个已链接的
频道。有关设置、
示例和故障排除，请参见 [频道 docking](/concepts/channel-docking)。

Dock 命令由具有原生命令支持的频道插件生成。当前内置集合：

- `/dock-discord`（别名：`/dock_discord`）
- `/dock-mattermost`（别名：`/dock_mattermost`）
- `/dock-slack`（别名：`/dock_slack`）
- `/dock-telegram`（别名：`/dock_telegram`）

从直接聊天中使用 dock 命令，可将当前会话的回复路由切换到另一个已链接频道。代理会保持相同的会话上下文，但该会话未来的回复会发送到所选频道对端。

Dock 命令需要 `session.identityLinks`。源发送者和目标对端必须在同一个身份组中，例如 `["telegram:123", "discord:456"]`。如果 id 为 `123` 的 Telegram 用户发送 `/dock_discord`，OpenClaw 会在活动会话上存储 `lastChannel: "discord"` 和 `lastTo: "456"`。如果发送者没有链接到 Discord 对端，命令会回复一个设置提示，而不是继续落入正常聊天。

Docking 只会改变活动会话路由。它不会创建频道账号、授予访问权限、绕过频道允许列表，也不会把对话历史移动到另一个会话。再次使用 `/dock-telegram`、`/dock-slack`、`/dock-mattermost` 或其他生成的 dock 命令即可重新切换路由。

### 内置插件命令

内置插件可以添加更多斜杠命令。当前本仓库中的内置命令：

- `/dreaming [on|off|status|help]` 切换记忆 dreaming。见 [Dreaming](/concepts/dreaming)。
- `/pair [qr|status|pending|approve|cleanup|notify]` 管理设备配对/设置流程。见 [配对](/channels/pairing)。
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` 临时启用高风险手机节点命令。
- `/voice status|list [limit]|set <voiceId|name>` 管理 Talk 语音配置。在 Discord 上，原生命令名为 `/talkvoice`。
- `/card ...` 发送 LINE 富卡片预设。见 [LINE](/channels/line)。
- `/codex status|models|threads|resume|compact|review|diagnostics|account|mcp|skills` 检查并控制内置的 Codex app-server harness。见 [Codex harness](/plugins/codex-harness)。
- 仅 QQBot 的命令：
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### 动态技能命令

用户可调用的技能也会作为斜杠命令公开：

- `/skill <name> [input]` 始终可作为通用入口点使用。
- 当技能/插件注册它们时，技能也可能作为直接命令出现，例如 `/prose`。
- 原生技能命令注册由 `commands.nativeSkills` 和 `channels.<provider>.commands.nativeSkills` 控制。
- 命令规范可以为支持本地化描述的原生表面提供 `descriptionLocalizations`，包括 Discord。

<AccordionGroup>
  <Accordion title="Argument and parser notes">
    - 命令在命令与参数之间可选地接受一个 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
    - `/new <model>` 接受模型别名、`provider/model` 或提供方名称（模糊匹配）；如果没有匹配项，则将该文本视为消息正文。
    - 如需完整的提供方用量明细，请使用 `openclaw status --usage`。
    - `/allowlist add|remove` 需要 `commands.config=true`，并遵守频道 `configWrites`。
    - 在多账号频道中，针对配置目标的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也会遵守目标账号的 `configWrites`。
    - `/usage` 控制每次响应的使用量页脚；`/usage cost` 会从 OpenClaw 会话日志中打印本地成本摘要。
    - `/restart` 默认启用；设置 `commands.restart: false` 可将其禁用。
    - `/plugins install <spec>` 接受与 `openclaw plugins install` 相同的插件规格：本地路径/归档、npm 包、`git:<repo>` 或 `clawhub:<pkg>`。托管 Gateway 会自动重启，因为插件源模块已更改。
    - `/plugins enable|disable` 会更新插件配置，并触发 Gateway 插件重新加载，以便在新的代理回合生效。

  </Accordion>
  <Accordion title="频道特定行为">
    - 仅 Discord 的原生命令：`/vc join|leave|status` 控制语音频道（不支持文本方式）。`join` 需要 guild 以及选定的语音/stage 频道。需要 `channels.discord.voice` 和原生命令。
    - Discord 线程绑定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要启用有效线程绑定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
    - ACP 命令参考和运行时行为：[ACP agents](/tools/acp-agents)。

  </Accordion>
  <Accordion title="Verbose / trace / fast / reasoning safety">
    - `/verbose` 旨在用于调试和增强可见性；在正常使用中请保持**关闭**。
    - `/trace` 比 `/verbose` 更窄：它只显示插件拥有的 trace/debug 行，并保持正常的 verbose 工具输出关闭。
    - `/fast on|off` 会持久化一个会话覆盖。使用 Sessions UI 的 `inherit` 选项可清除它并回退到配置默认值。
    - `/fast` 是提供方特定的：OpenAI/OpenAI Codex 会将其映射到原生 Responses 端点上的 `service_tier=priority`，而直接的公开 Anthropic 请求（包括发送到 `api.anthropic.com` 的 OAuth 认证流量）会映射到 `service_tier=auto` 或 `standard_only`。见 [OpenAI](/providers/openai) 和 [Anthropic](/providers/anthropic)。
    - 在相关情况下仍会显示工具失败摘要，但只有启用 `/verbose full` 时才会包含详细的失败文本。
    - `/reasoning`、`/verbose` 和 `/trace` 在群组场景中有风险：它们可能暴露你不打算公开的内部推理、工具输出或插件诊断。最好保持关闭，尤其是在群聊中。

  </Accordion>
  <Accordion title="模型切换">
    - `/model` 会立即持久化新的会话模型。
    - 如果代理处于空闲状态，下一次运行会立即使用它。
    - 如果运行已经活动，OpenClaw 会将实时切换标记为待处理，并且只会在干净的重试点重启到新模型。
    - 如果工具活动或回复输出已经开始，待处理切换可能会保持排队，直到稍后的重试机会或下一次用户轮次。
    - 在本地 TUI 中，`/crestodian [request]` 会从普通代理 TUI 返回到 Crestodian。这与消息频道救援模式是分开的，并且不会授予远程配置权限。

  </Accordion>
  <Accordion title="快速路径和行内快捷方式">
    - **快速路径：** 来自允许列表发送者的仅命令消息会被立即处理（绕过队列 + 模型）。
    - **群组提及门控：** 来自允许列表发送者的仅命令消息会绕过提及要求。
    - **行内快捷方式（仅限允许列表发送者）：** 某些命令嵌入普通消息中时也能工作，并会在模型看到剩余文本之前被移除。
      - 示例：`hey /status` 会触发状态回复，而剩余文本继续通过正常流程。
    - 当前：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
    - 未授权的仅命令消息会被静默忽略，行内 `/...` 标记则被当作纯文本处理。

  </Accordion>
  <Accordion title="技能命令和原生参数">
    - **技能命令：** `user-invocable` 技能会作为斜杠命令公开。名称会被清理为 `a-z0-9_`（最长 32 个字符）；冲突会添加数字后缀（例如 `_2`）。
      - `/skill <name> [input]` 按名称运行一个技能（当原生命令限制阻止逐个技能命令时很有用）。
      - 默认情况下，技能命令会作为普通请求转发给模型。
      - 技能可以选择声明 `command-dispatch: tool`，将命令直接路由给工具（确定性、无模型）。
      - 示例：`/prose`（OpenProse 插件）——见 [OpenProse](/prose)。
    - **原生命令参数：** Discord 对动态选项使用自动完成（当你省略必需参数时会显示按钮菜单）。Telegram 和 Slack 在命令支持选项且你省略参数时会显示按钮菜单。动态选项会根据目标会话模型解析，因此像 `/think` 等模型特定选项会遵循该会话的 `/model` 覆盖。

  </Accordion>
</AccordionGroup>

## `/tools`

`/tools` 回答的是运行时问题，而不是配置问题：**这个 agent 在当前对话中现在能使用什么**。

- 默认的 `/tools` 是紧凑版，经过优化，便于快速扫描。
- `/tools verbose` 会添加简短描述。
- 支持参数的原生命令界面提供相同的模式切换：`compact|verbose`。
- 结果是按会话作用域生效的，因此更换 agent、channel、thread、sender authorization 或 model 都可能改变输出。
- `/tools` 包含运行时实际可达的工具，包括核心工具、已连接的插件工具以及由 channel 拥有的工具。

如需编辑 profile 和 override，请使用 Control UI 的 Tools 面板或 config/catalog 界面，而不要把 `/tools` 当作静态目录。

## 使用界面（什么内容显示在哪里）

- **Provider usage/quota**（例如："Claude 80% left"）会在当前模型提供方的 `/status` 中显示，前提是启用了 usage tracking。OpenClaw 会将 provider 窗口统一规范为 `% left`；对于 MiniMax，剩余百分比字段会在显示前取反，而 `model_remains` 响应会优先使用 chat-model 条目以及带有模型标签的 plan label。
- `/status` 中的 **Token/cache 行** 在实时会话快照较稀疏时，可以回退到最新的 transcript usage 条目。现有的非零实时值仍然优先，而 transcript 回退也可以在存储的总量缺失或更小时，恢复 active runtime model 标签以及更大的、面向 prompt 的总量。
- **Execution vs runtime：** `/status` 会为有效的 sandbox 路径报告 `Execution`，并为实际运行会话的主体报告 `Runtime`：`OpenClaw Pi Default`、`OpenAI Codex`、一个 CLI backend，或一个 ACP backend。
- **每次响应的 tokens/cost** 由 `/usage off|tokens|full` 控制（附加到正常回复）。
- `/model status` 关注的是 **models/auth/endpoints**，不是 usage。

## 模型选择（`/model`）

`/model` 作为一个 directive 实现。

示例：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model opus@anthropic:default
/model status
```

说明：

- `/model` 和 `/model list` 会显示一个紧凑的、带编号的选择器（模型家族 + 可用提供方）。
- 在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，包含 provider 和 model 下拉菜单以及一个 Submit 步骤。该选择器会遵循 `agents.defaults.models`，包括 `provider/*` 条目，因此按 provider 作用域进行发现时，可以让选择器保持在 Discord 25 个选项的组件限制之下。
- `/model <#>` 会从该选择器中选择（并在可能时优先使用当前 provider）。
- `/model status` 会显示详细视图，包括已配置的 provider endpoint（`baseUrl`）和 API 模式（`api`）（如果可用）。

## 调试 override

`/debug` 允许你设置**仅运行时**的 config override（存在内存中，不写入磁盘）。仅 owner 可用。默认禁用；通过 `commands.debug: true` 启用。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

<Note>
Override 会立即应用于新的 config 读取，但不会写入 `openclaw.json`。使用 `/debug reset` 清除所有 override，并恢复到磁盘上的 config。
</Note>

## 插件 trace 输出

`/trace` 允许你切换**会话作用域的插件 trace/debug 行**，而无需开启完整的 verbose 模式。

示例：

```text
/trace
/trace on
/trace off
```

说明：

- 不带参数的 `/trace` 会显示当前会话的 trace 状态。
- `/trace on` 会为当前会话启用插件 trace 行。
- `/trace off` 会再次禁用它们。
- 插件 trace 行可以出现在 `/status` 中，也可以作为正常 assistant 回复之后的跟进诊断消息出现。
- `/trace` 不会取代 `/debug`；`/debug` 仍然管理仅运行时的 config override。
- `/trace` 不会取代 `/verbose`；正常的 verbose 工具/status 输出仍然属于 `/verbose`。

## 配置更新

`/config` 会写入你的磁盘配置（`openclaw.json`）。仅 owner 可用。默认禁用；通过 `commands.config: true` 启用。

示例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

<Note>
在写入之前会先验证 config；无效更改会被拒绝。`/config` 更新会在重启后继续保留。
</Note>

## MCP 更新

`/mcp` 会将 OpenClaw 管理的 MCP server 定义写入 `mcp.servers` 下。仅 owner 可用。默认禁用；通过 `commands.mcp: true` 启用。

示例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

<Note>
`/mcp` 将 config 存储在 OpenClaw config 中，而不是 Pi 拥有的项目设置中。运行时适配器决定哪些 transport 实际上可以执行。
</Note>

## 插件更新

`/plugins` 允许操作者检查已发现的插件，并在 config 中切换启用状态。只读流程可以使用 `/plugin` 作为别名。默认禁用；通过 `commands.plugins: true` 启用。

示例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

<Note>
- `/plugins list` 和 `/plugins show` 使用当前 workspace 以及磁盘上的 config 进行真实的插件发现。
- `/plugins install` 可从 ClawHub、npm、git、本地目录和归档文件安装。
- `/plugins enable|disable` 仅更新插件 config；不会安装或卸载插件。
- 启用和禁用会为新的 agent 回合热重载 Gateway 插件的运行时表面；安装会在插件源码模块变更后自动重启受管理的 Gateway。

</Note>

## 界面说明

<AccordionGroup>
  <Accordion title="每个界面的会话">
    - **文本命令** 在正常 chat session 中运行（DM 共享 `main`，群组有自己的 session）。
    - **原生命令** 使用隔离的 session：
      - Discord: `agent:<agentId>:discord:slash:<userId>`
      - Slack: `agent:<agentId>:slack:slash:<userId>`（前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）
      - Telegram: `telegram:slash:<userId>`（通过 `CommandTargetSessionKey` 目标指向 chat session）
    - **`/stop`** 目标是当前的 chat session，以便中止当前运行。
  </Accordion>
  <Accordion title="Slack 细节">
    `channels.slack.slashCommand` 仍然支持单个 `/openclaw` 风格的命令。如果你启用 `commands.native`，则必须为每个内置命令创建一个 Slack slash command（名称与 `/help` 相同）。Slack 的命令参数菜单会以临时的 Block Kit 按钮形式提供。

    Slack 原生命令例外：请注册 `/agentstatus`（而不是 `/status`），因为 Slack 保留了 `/status`。文本形式的 `/status` 在 Slack 消息中仍然可用。
  </Accordion>
</AccordionGroup>

## BTW 附带问题

`/btw` 是关于当前会话的一个快速**附带问题**。`/side` 是别名。

不同于普通聊天：

- 它使用当前会话作为背景上下文，
- 在 Codex harness 会话中，它会作为一个临时的 Codex side thread 运行，并使用当前的 Codex 权限和原生工具面，
- 在非 Codex 会话中，它会保持旧的直接一次性 side-call 行为，
- 它不会改变未来的会话上下文，
- 它不会写入 transcript 历史，
- 它会作为实时的 side result 返回，而不是普通的 assistant 消息。

这使得 `/btw` 在你想要临时澄清一些内容、同时主任务继续进行时非常有用。

示例：

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

完整行为和客户端 UX 细节请参见 [BTW Side Questions](/tools/btw)。

## 相关内容

- [创建技能](/tools/creating-skills)
- [技能](/tools/skills)
- [技能配置](/tools/skills-config)
