---
title: "Slash Commands"
sidebarTitle: "Slash Commands"
summary: "All available slash commands, instructions, and inline shortcuts—configuration, routing, and interface-specific behavior."
read_when:
  - when using or configuring chat commands
  - when debugging command routing or permissions
  - when understanding how skill commands are registered
---

Gateway handles commands that begin with `/` and are sent as standalone messages.
Host-only bash commands use `! <cmd>` (`/bash <cmd>` is an alias).

When a session is bound to an ACP session, normal text is routed to the ACP
harness. Gateway management commands remain local: `/acp ...` always reaches the
OpenClaw command handler, while `/status` and `/unfocus` stay local when command handling is enabled in that interface.

## 三种命令类型

<CardGroup cols={3}>
  <Card title="命令" icon="terminal">
    由 Gateway 处理的独立 `/...` 消息。必须作为消息中的唯一内容发送。
  </Card>
  <Card title="指令" icon="sliders">
    `/think`、`/fast`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、
    `/exec`、`/model`、`/queue` —— 在模型看到消息之前会从消息中剥离。
    单独发送时会持久化会话设置；与其他文本一起发送时则作为行内提示。
  </Card>
  <Card title="行内快捷方式" icon="bolt">
    `/help`、`/commands`、`/status`、`/whoami` —— 会立即运行，并在模型看到剩余文本之前被剥离。仅限授权发送者。
  </Card>
</CardGroup>

<AccordionGroup>
  <Accordion title="指令行为详情">
    - 指令会在模型看到消息之前从消息中剥离。
    - 在**仅指令**消息中（消息只包含指令），它们会持久化到会话并返回确认信息。
    - 在包含其他文本的**普通聊天**消息中，它们作为行内提示，不会持久化会话设置。
    - 指令只适用于**授权发送者**。如果设置了 `commands.allowFrom`，则它是唯一使用的允许列表；否则授权来自频道允许列表/配对以及 `commands.useAccessGroups`。未授权发送者看到的指令会被当作纯文本处理。
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
  启用在聊天消息中解析 `/...`。在没有原生命令的界面（WhatsApp、WebChat、Signal、iMessage、Google Chat、Microsoft Teams）上，即使设为 `false`，文本命令也可正常工作。
</ParamField>

<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  注册原生命令。自动：Discord/Telegram 开启；Slack 关闭；对于不支持原生命令的提供方则忽略。可通过 `channels.<provider>.commands.native` 按频道覆盖。在 Discord 上，`false` 会跳过斜杠命令注册；之前已注册的命令可能仍会可见，直到被移除。
</ParamField>

<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  在支持时以原生方式注册技能命令。自动：Discord/Telegram 开启；Slack 关闭。可通过 `channels.<provider>.commands.nativeSkills` 覆盖。
</ParamField>

<ParamField path="commands.bash" type="boolean" default="false">
  启用 `! <cmd>` 运行主机 shell 命令（`/bash <cmd>` 别名）。需要 `tools.elevated` 允许列表。
</ParamField>

<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  bash 在切换到后台模式前等待的时间（`0` 会立即转入后台）。
</ParamField>

<ParamField path="commands.config" type="boolean" default="false">
  启用 `/config`（读写 `openclaw.json`）。仅限 owner。
</ParamField>

<ParamField path="commands.mcp" type="boolean" default="false">
  启用 `/mcp`（读写 `mcp.servers` 下由 OpenClaw 管理的 MCP 配置）。仅限 owner。
</ParamField>

<ParamField path="commands.plugins" type="boolean" default="false">
  启用 `/plugins`（插件发现/状态以及安装 + 启用/禁用）。写操作仅限 owner。
</ParamField>

<ParamField path="commands.debug" type="boolean" default="false">
  启用 `/debug`（仅运行时配置覆盖）。仅限 owner。
</ParamField>

<ParamField path="commands.restart" type="boolean" default="true">
  启用 `/restart` 和 gateway 重启工具操作。
</ParamField>

<ParamField path="commands.ownerAllowFrom" type="string[]">
  owner-only 命令界面的显式 owner 允许列表。与 `commands.allowFrom` 和 DM 配对访问分开。
</ParamField>

<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  每个频道：要求 owner 身份才能执行 owner-only 命令。为 `true` 时，发送者必须匹配 `commands.ownerAllowFrom` 或拥有内部 `operator.admin` 范围。通配符 `allowFrom` 条目**不足以满足要求**。
</ParamField>

<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  控制 owner id 在系统提示词中的显示方式。
</ParamField>

<ParamField path="commands.ownerDisplaySecret" type="string">
  当 `commands.ownerDisplay: "hash"` 时使用的 HMAC secret。
</ParamField>

<ParamField path="commands.allowFrom" type="object">
  按提供方划分的命令授权允许列表。配置后，它是命令和指令的**唯一**授权来源。使用 `"*"` 作为全局默认值；特定提供方的键会覆盖它。
</ParamField>

<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  当未设置 `commands.allowFrom` 时，对命令强制执行允许列表/策略。
</ParamField>

## 命令列表

Commands 来自三个来源：

- **核心内置：** `src/auto-reply/commands-registry.shared.ts`
- **生成的 dock 命令：** `src/auto-reply/commands-registry.data.ts`
- **插件命令：** 插件的 `registerCommand()` 调用

可用性取决于配置标志、频道表面，以及已安装/已启用的
插件。

### 核心命令

<AccordionGroup>
  <Accordion title="会话与运行">
    | 命令 | 描述 |
    | --- | --- |
    | `/new [model]` | 将当前会话归档并开始一个新会话 |
    | `/reset [soft [message]]` | 原地重置当前会话。`soft` 会保留转录内容，丢弃复用的 CLI 后端会话 id，并重新运行启动流程 |
    | `/name <title>` | 为当前会话命名或重命名。省略标题可查看当前名称和建议 |
    | `/compact [instructions]` | 压缩会话上下文。参见 [压缩](/concepts/compaction) |
    | `/stop` | 中止当前运行 |
    | `/session idle <duration\|off>` | 管理线程绑定的空闲过期时间 |
    | `/session max-age <duration\|off>` | 管理线程绑定的最大存活过期时间 |
    | `/export-session [path]` | 将当前会话导出为 HTML。别名：`/export` |
    | `/export-trajectory [path]` | 为当前会话导出 JSONL 轨迹包。别名：`/trajectory` |

    <Note>
      控制界面会拦截输入的 `/new`，以创建并切换到新的
      仪表盘会话，除非配置了 `session.dmScope: "main"`，
      且当前父级是代理的主会话——在这种情况下，`/new`
      会原地重置主会话。输入的 `/reset` 仍会运行 Gateway 的
      原地重置。当你想清除固定的会话模型选择时，请使用 `/model default`。
    </Note>

  </Accordion>

  <Accordion title="模型与运行控制">
    | 命令 | 描述 |
    | --- | --- |
    | `/think <level\|default>` | 设置思考级别或清除会话覆盖。别名：`/thinking`、`/t` |
    | `/verbose on\|off\|full` | 切换详细输出。别名：`/v` |
    | `/trace on\|off` | 切换当前会话的插件跟踪输出 |
    | `/fast [status\|auto\|on\|off\|default]` | 显示、设置或清除快速模式 |
    | `/reasoning [on\|off\|stream]` | 切换推理可见性。别名：`/reason` |
    | `/elevated [on\|off\|ask\|full]` | 切换提升模式。别名：`/elev` |
    | `/exec host=<auto\|sandbox\|gateway\|node> security=<deny\|allowlist\|full> ask=<off\|on-miss\|always> node=<id>` | 显示或设置 exec 默认值 |
    | `/login [codex\|openai\|openai-codex]` | 从私聊或 Web UI 会话中配对 Codex/OpenAI 登录。仅限 owner/admin |
    | `/model [name\|#\|status]` | 显示或设置模型 |
    | `/models [provider] [page] [limit=<n>\|all]` | 列出已配置/认证可用的提供方或模型 |
    | `/queue <mode>` | 管理活动运行队列行为。参见 [Queue](/concepts/queue) 和 [Queue steering](/concepts/queue-steering) |
    | `/steer <message>` | 将指引注入到活动运行中。别名：`/tell`。参见 [Steer](/tools/steer) |

    <AccordionGroup>
      <Accordion title="verbose / trace / fast / reasoning 安全性">
        - `/verbose` 用于调试——正常使用时请保持**关闭**。
        - `/trace` 只会显示插件拥有的跟踪/调试行；普通的 verbose 输出仍保持关闭。
        - `/fast auto|on|off` 会持久化会话覆盖；使用 Sessions UI 的 `inherit` 选项可清除它。
        - `/fast` 具有提供方特定行为：OpenAI/Codex 将其映射为 `service_tier=priority`；直接 Anthropic 请求映射为 `service_tier=auto` 或 `standard_only`。
        - `/reasoning`、`/verbose` 和 `/trace` 在群组场景中存在风险——它们可能泄露内部推理或插件诊断信息。请在群聊中保持关闭。

      </Accordion>
      <Accordion title="模型切换详情">
        - `/model` 会立即将新模型持久化到会话中。
        - 如果代理处于空闲状态，下一次运行会立即使用它。
        - 如果运行正在进行，切换会被标记为待处理，并在下一次干净的重试点应用。

      </Accordion>
    </AccordionGroup>

  </Accordion>

  <Accordion title="发现与状态">
    | 命令 | 描述 |
    | --- | --- |
    | `/help` | 显示简短帮助摘要 |
    | `/commands` | 显示生成的命令目录 |
    | `/tools [compact\|verbose]` | 显示当前代理此刻可用的工具 |
    | `/status` | 显示执行/运行时状态、Gateway 和系统运行时间、插件健康状态，以及提供方使用量/配额 |
    | `/status plugins` | 显示详细的插件健康信息：加载错误、隔离、频道插件失败、依赖问题、兼容性提示。需要 `commands.plugins: true` |
    | `/goal [status\|start\|edit\|pause\|resume\|complete\|block\|clear] ...` | 管理当前会话的持久化 [goal](/tools/goal) |
    | `/diagnostics [note]` | 仅 owner 可用的支持报告流程。每次都会请求 exec 批准 |
    | `/crestodian <request>` | 从 owner DM 中运行 Crestodian 设置和修复助手 |
    | `/tasks` | 列出当前会话活跃/最近的后台任务 |
    | `/context [list\|detail\|map\|json]` | 解释上下文如何组装 |
    | `/whoami` | 显示你的发送者 id。别名：`/id` |
    | `/usage off\|tokens\|full\|reset\|cost` | 控制每次回复的 usage 页脚（`reset`/`inherit`/`clear`/`default` 会清除会话覆盖以重新继承已配置的默认值），或打印本地成本摘要 |
  </Accordion>

  <Accordion title="技能、允许列表、批准">
    | 命令 | 描述 |
    | --- | --- |
    | `/skill <name> [input]` | 以名称运行某个技能 |
    | `/learn [request]` | 通过 [Skill Workshop](/tools/skill-workshop) 根据当前对话或命名来源草拟一个可审阅的技能 |
    | `/allowlist [list\|add\|remove] ...` | 管理允许列表条目。仅文本 |
    | `/approve <id> <decision>` | 处理 exec 或插件批准提示 |
    | `/btw <question>` | 在不更改会话上下文的情况下提出旁支问题。别名：`/side`。参见 [BTW](/tools/btw) |
  </Accordion>

  <Accordion title="子代理与 ACP">
    | 命令 | 描述 |
    | --- | --- |
    | `/subagents list\|log\|info` | 检查当前会话的子代理运行情况 |
    | `/acp spawn\|cancel\|steer\|close\|sessions\|status\|set-mode\|set\|cwd\|permissions\|timeout\|model\|reset-options\|doctor\|install\|help` | 管理 ACP 会话和运行时选项。运行时控制需要外部 owner 或内部 Gateway 管理员身份 |
    | `/focus <target>` | 将当前 Discord 线程或 Telegram 主题绑定到一个会话目标 |
    | `/unfocus` | 移除当前线程绑定 |
    | `/agents` | 列出当前会话的线程绑定代理 |
  </Accordion>

  <Accordion title="仅 owner 可写和管理员">
    | 命令 | 需要 | 描述 |
    | --- | --- | --- |
    | `/config show\|get\|set\|unset` | `commands.config: true` | 读写 `openclaw.json`。仅限 owner |
    | `/mcp show\|get\|set\|unset` | `commands.mcp: true` | 读写由 OpenClaw 管理的 MCP 服务器配置。仅限 owner |
    | `/plugins list\|inspect\|show\|get\|install\|enable\|disable` | `commands.plugins: true` | 检查或修改插件状态。写操作仅限 owner。别名：`/plugin` |
    | `/debug show\|set\|unset\|reset` | `commands.debug: true` | 仅运行时配置覆盖。仅限 owner |
    | `/restart` | `commands.restart: true`（默认） | 重启 OpenClaw |
    | `/send on\|off\|inherit` | owner | 设置发送策略 |
  </Accordion>

  <Accordion title="语音、TTS、频道控制">
    | 命令 | 描述 |
    | --- | --- |
    | `/tts on\|off\|status\|chat\|latest\|provider\|limit\|summary\|audio\|help` | 控制 TTS。参见 [TTS](/tools/tts) |
    | `/activation mention\|always` | 设置群组激活模式 |
    | `/bash <command>` | 运行主机 shell 命令。别名：`! <command>`。需要 `commands.bash: true` |
    | `!poll [sessionId]` | 检查一个后台 bash 作业 |
    | `!stop [sessionId]` | 停止一个后台 bash 作业 |
  </Accordion>
</AccordionGroup>

### Dock 命令

Dock 命令会将当前会话的回复路由切换到另一个关联频道。
参见 [Channel docking](/concepts/channel-docking) 了解配置和故障排查。

由支持原生命令的频道插件生成：

- `/dock-discord`（别名：`/dock_discord`）
- `/dock-mattermost`（别名：`/dock_mattermost`）
- `/dock-slack`（别名：`/dock_slack`）
- `/dock-telegram`（别名：`/dock_telegram`）

Dock 命令需要 `session.identityLinks`。源发送者和目标对端
必须属于同一个身份组。

### 内置插件命令

| 命令                                                 | 描述                                                                                                                                                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dreaming [on\|off\|status\|help]`                     | 切换记忆做梦（owner 或 Gateway 管理员）。参见 [Dreaming](/concepts/dreaming)                                                                                                            |
| `/pair [qr\|status\|pending\|approve\|cleanup\|notify]` | 管理设备配对。参见 [Pairing](/channels/pairing)                                                                                                                                        |
| `/phone status\|arm ...\|disarm`                        | 临时武装高风险节点命令（camera/screen/computer/writes）。参见 [Computer use](/nodes/computer-use)                                                                               |
| `/voice status\|list\|set <voiceId>`                    | 管理 Talk 语音配置。Discord 原生命令名：`/talkvoice`                                                                                                                                    |
| `/card ...`                                             | 发送 LINE 富卡片预设。参见 [LINE](/channels/line)                                                                                                                                        |
| `/codex <action> ...`                                   | 绑定、指引并检查 Codex 应用服务器支架（status、threads、resume、model、fast、permissions、compact、review、mcp、skills 等）。参见 [Codex harness](/plugins/codex-harness) |

仅 QQBot：`/bot-ping`、`/bot-version`、`/bot-help`、`/bot-upgrade`、`/bot-logs`

### 技能命令

用户可调用的技能会以斜杠命令形式暴露：

- `/skill <name> [input]` 始终作为通用入口可用。
- 技能可以注册为直接命令（例如 OpenProse 的 `/prose`）。
- 原生技能命令注册由 `commands.nativeSkills` 和
  `channels.<provider>.commands.nativeSkills` 控制。
- 名称会被规范化为 `a-z0-9_`（最多 32 个字符）；冲突会追加数字后缀。

<AccordionGroup>
  <Accordion title="技能命令分发">
    默认情况下，技能命令会作为普通请求路由到模型。

    技能可以声明 `command-dispatch: tool`，从而直接路由到某个工具
    （确定性执行，不涉及模型）。示例：`/prose`（OpenProse 插件）
    —— 参见 [OpenProse](/prose)。

  </Accordion>
  <Accordion title="原生命令参数">
    当省略必需参数时，Discord 会使用自动补全来处理动态选项和按钮菜单。Telegram 和 Slack 会为具有选项的命令显示按钮菜单。动态选项会针对目标会话模型进行解析，因此像 `/think` 等特定于模型的选项级别会遵循会话的 `/model` 覆盖。
  </Accordion>
</AccordionGroup>

## `/tools`：代理现在可以使用什么

`/tools` 回答的是一个运行时问题：**这个代理在当前会话里现在能用什么** —— 不是静态配置目录。

```text
/tools         # 紧凑视图
/tools verbose # 带简短说明
```

结果按会话范围生效。更换代理、通道、线程、发送者授权或模型都可能改变输出。要编辑 profile 和 override，请使用 Control UI 的 Tools 面板或配置界面。

## `/model`: 模型选择

```text
/model             # 显示模型选择器
/model list        # 同上
/model 3           # 从选择器中按编号选择
/model openai/gpt-5.4
/model opus@anthropic:default
/model default     # 清除会话模型选择
/model status      # 带端点和 API 模式的详细视图
```

在 Discord 中，`/model` 和 `/models` 会打开一个交互式选择器，包含 provider 和 model 下拉框。该选择器会遵循 `agents.defaults.models`，包括 `provider/*` 条目。

## `/config`：磁盘上的配置写入

<Note>
  仅限 owner。默认禁用——通过启用 `commands.config: true` 打开。
</Note>

```text
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

写入前会进行配置校验。无效更改会被拒绝。`/config` 的更新会在重启后保留。

## `/mcp`: MCP 服务器配置

<Note>
  仅限 owner。默认禁用——通过启用 `commands.mcp: true` 打开。
</Note>

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

`/mcp` 将配置存储在 OpenClaw 配置中，而不是嵌入式代理项目设置中。
`/mcp show` 会对含有凭据的字段、已识别的凭据标志值以及已知的密钥形参数组进行脱敏。  
当在群组中运行时，配置会私下发送给 owner；如果没有可用的私有 owner 路由，命令将默认失败并要求 owner 从直接聊天中重试。

## `/debug`：仅运行时覆盖

<Note>
  仅限 owner。默认禁用——通过启用 `commands.debug: true` 打开。
  覆盖会立即应用到新的配置读取，但**不会**写入磁盘。
</Note>

```text
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

## `/plugins`：插件管理

<Note>
  仅限 owner 执行写入操作。默认禁用——通过启用 `commands.plugins: true` 打开。
</Note>

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
/plugins install ./path/to/plugin
```

`/plugins enable|disable` 会更新插件配置，并为新的代理轮次热重载 Gateway 插件运行时。`/plugins install` 会自动重启受管控的 Gateways，因为插件源码模块发生了变化。

## `/trace`：插件跟踪输出

```text
/trace          # 显示当前跟踪状态
/trace on
/trace off
```

`/trace` 会显示会话范围内的插件跟踪/调试行，而不会进入完整 verbose 模式。它不能替代 `/debug`（运行时覆盖）或 `/verbose`（正常工具输出）。

## `/btw`: 附带问题

`/btw` 是一个关于当前会话上下文的快速顺便提问。别名：`/side`。

```text
/btw 我们现在在做什么？
/side 在主流程继续运行时，什么发生了变化？
```

不同于普通消息：

- 使用当前会话作为背景上下文。
- 在 Codex harness 会话中，会作为一个临时的 Codex side thread 运行。
- 不会更改未来的会话上下文。
- 不会写入 transcript 历史。

查看 [BTW side questions](/tools/btw) 了解完整行为。

## 界面说明

<AccordionGroup>
  <Accordion title="按界面划分的会话范围">
    - **文本命令：** 在普通聊天会话中运行（DM 共享 `main`，群组拥有各自的会话）。
    - **原生 Discord 命令：** `agent:<agentId>:discord:slash:<userId>`
    - **原生 Slack 命令：** `agent:<agentId>:slack:slash:<userId>`（前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）
    - **原生 Telegram 命令：** `telegram:slash:<userId>`（通过 `CommandTargetSessionKey` 作用于聊天会话）
    - **`/login codex`** 仅通过私聊或 Web UI 响应路径发送设备配对码。Telegram 群组/话题调用会改为提示所有者私聊机器人。
    - **`/stop`** 会作用于当前活动聊天会话，以中止当前运行。

  </Accordion>
  <Accordion title="Slack 细节">
    `channels.slack.slashCommand` 支持单个 `/openclaw` 风格命令。
    在 `commands.native: true` 时，为每个内置命令创建一个 Slack slash 命令。
    注册 `/agentstatus`（而不是 `/status`），因为 Slack 保留了 `/status`。
    文本形式的 `/status` 仍可在 Slack 消息中正常使用。
  </Accordion>
  <Accordion title="快速路径与内联快捷方式">
    - 来自允许列表发送者的仅命令消息会被立即处理（绕过队列 + 模型）。
    - 内联快捷方式（`/help`、`/commands`、`/status`、`/whoami`）也可以嵌入普通消息中使用，并会在模型看到剩余文本之前被移除。
    - 未授权的仅命令消息会被静默忽略；内联 `/...` 标记会被当作普通文本处理。

  </Accordion>
  <Accordion title="参数说明">
    - 命令接受在命令与参数之间可选的 `:`（`/think: high`、`/send: on`）。
    - `/new <model>` 接受模型别名、`provider/model`，或 provider 名称（模糊匹配）；如果没有匹配，文本会被当作消息正文。
    - `/allowlist add|remove` 需要 `commands.config: true`，并遵守通道的 `configWrites`。

  </Accordion>
</AccordionGroup>

## 提供方使用情况和状态

- **Provider 使用量/配额**（例如“Claude 还剩 80%”）会在启用使用量追踪时，显示在当前模型 provider 的 `/status` 中。
- `/status` 中的 **token/cache 行** 在实时会话快照较少时，可能回退到最新的 transcript 使用条目。
- **执行 vs 运行时：** `/status` 会报告 `Execution` 表示有效的 sandbox 路径，以及 `Runtime` 表示当前是谁在运行会话：`OpenClaw Default`、`OpenAI Codex`、CLI backend 或 ACP backend。
- **每次响应的 token/成本：** 由 `/usage off|tokens|full` 控制。
- `/model status` 关注的是模型/认证/端点，而不是使用量。

## 相关内容

<CardGroup cols={2}>
  <Card title="技能" href="/tools/skills" icon="puzzle-piece">
    技能 slash 命令如何注册和受限。
  </Card>
  <Card title="创建技能" href="/tools/creating-skills" icon="hammer">
    构建一个会注册自己的 slash 命令的 skill。
  </Card>
  <Card title="顺便问问" href="/tools/btw" icon="comments">
    在不改变会话上下文的情况下提出顺便问题。
  </Card>
  <Card title="引导" href="/tools/steer" icon="compass">
    使用 `/steer` 在运行中引导代理。
  </Card>
</CardGroup>
