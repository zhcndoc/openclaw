---
title: "斜杠命令"
sidebarTitle: "斜杠命令"
summary: "所有可用的斜杠命令、说明和内联快捷方式——配置、路由以及特定界面的行为。"
read_when:
  - 使用或配置聊天命令时
  - 调试命令路由或权限时
  - 了解技能命令的注册方式时
---

Gateway 处理以 `/` 开头并作为独立消息发送的命令。
仅限主机的 bash 命令使用 `! <cmd>`（`/bash <cmd>` 是别名）。

当会话绑定到 ACP 会话时，普通文本会路由到 ACP
运行框架。Gateway 管理命令仍然保持本地：`/acp ...` 始终会到达
OpenClaw 命令处理程序，而当该界面启用命令处理时，`/status` 和 `/unfocus` 会保持本地。

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
    - 在**仅含指令**的消息中（消息仅包含指令），指令会持久化到会话，并回复确认信息。
    - 在包含其他文本的**普通聊天**消息中，指令会作为行内提示，不会持久化会话设置。
      模型选择是例外：经过授权的行内 `/model` 或已配置的 `/<alias>` 会持久化会话选择；所有者/管理员在不带 `-s` 的情况下进行选择时，还可能请求更新已配置的默认值。
    - 指令仅适用于**授权发送者**。如果设置了 `commands.allowFrom`，则只使用该允许列表；否则，授权来自频道允许列表、配对机制以及始终启用的访问组强制机制。未经授权的发送者发送的指令会被视为普通文本。
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
  启用 `/config`（读写 `openclaw.json`）。仅限所有者。
</ParamField>

<ParamField path="commands.mcp" type="boolean" default="false">
  启用 `/mcp`（读写 `mcp.servers` 下由 OpenClaw 管理的 MCP 配置）。仅限所有者。
</ParamField>

<ParamField path="commands.plugins" type="boolean" default="false">
  启用 `/plugins`（插件发现/状态以及安装 + 启用/禁用）。写操作仅限所有者。
</ParamField>

<ParamField path="commands.debug" type="boolean" default="false">
  启用 `/debug`（仅运行时配置覆盖）。仅限所有者。
</ParamField>

<ParamField path="commands.restart" type="boolean" default="true">
  启用 `/restart` 和外部 `SIGUSR1` 重启请求。
</ParamField>

<ParamField path="commands.ownerAllowFrom" type="string[]">
  仅限所有者的命令界面的显式所有者允许列表。与 `commands.allowFrom` 和 DM 配对访问分开。
</ParamField>

<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  每个频道：要求所有者身份才能执行仅限所有者的命令。为 `true` 时，发送者必须匹配 `commands.ownerAllowFrom` 或拥有内部 `operator.admin` 范围。通配符 `allowFrom` 条目**不足以满足要求**。
</ParamField>

<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  控制所有者 ID 在系统提示词中的显示方式。
</ParamField>

<ParamField path="commands.ownerDisplaySecret" type="string">
  当 `commands.ownerDisplay: "hash"` 时使用的 HMAC secret。
</ParamField>

<ParamField path="commands.allowFrom" type="object">
  按提供方划分的命令授权允许列表。配置后，它是命令和指令的**唯一**授权来源。使用 `"*"` 作为全局默认值；特定提供方的键会覆盖它。
</ParamField>

## 命令列表

命令来自三个来源：

- **核心内置：** `src/auto-reply/commands-registry.shared.ts`
- **生成的 dock 命令：** `src/auto-reply/commands-registry.data.ts`
- **插件命令：** 插件的 `registerCommand()` 调用

可用性取决于配置标志、频道界面，以及已安装/已启用的
插件。

### 核心命令

<AccordionGroup>
  <Accordion title="会话与运行">
    | 命令 | 描述 |
    | --- | --- |
    | `/new [model]` | 归档当前会话并启动一个新的会话 |
    | `/reset [soft [message]]` | 原地重置当前会话。`soft` 会保留转录内容，丢弃复用的 CLI 后端会话 ID，并重新运行启动流程 |
    | `/name <title>` | 为当前会话命名或重命名。省略标题可查看当前名称及建议 |
    | `/compact [instructions]` | 压缩会话上下文。参见 [Compaction](/concepts/compaction) |
    | `/stop` | 中止当前运行 |
    | `/session idle <duration\|off>` | 管理线程绑定的空闲过期时间 |
    | `/session max-age <duration\|off>` | 管理线程绑定的最大存活过期时间 |
    | `/export-session [path]` | 仅 owner 可用。将当前会话导出为工作区内的 HTML。别名：`/export` |
    | `/export-trajectory [path]` | 为当前会话导出 JSONL 轨迹包。别名：`/trajectory` |

    显式的 `/export-session` 路径会替换工作区内已有文件。省略路径可生成一个避免冲突的文件名。

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
    | `/login [codex\|openai\|openai-codex]` | 从私聊或 Web UI 会话配对 Codex/OpenAI 登录。仅限 owner/管理员 |
    | `/model [name\|#\|status] [-s\|--session]` | 显示或选择模型。owner/管理员的直接选择会请求更新已配置的默认值；`-s` 仅更改当前会话 |
    | `/models [provider] [page] [limit=<n>\|all]` | 列出已配置或通过身份验证可用的提供方或模型 |
    | `/queue <mode>` | 管理活动运行的队列行为。参见 [Queue](/concepts/queue) 和 [Queue steering](/concepts/queue-steering) |
    | `/steer <message>` | 向活动运行注入指导。别名：`/tell`。参见 [Steer](/tools/steer) |

    <AccordionGroup>
      <Accordion title="verbose / trace / fast / reasoning 的安全性">
        - `/verbose` 用于调试——正常使用时请保持**关闭**。
        - `/trace` 只会显示插件拥有的跟踪/调试行；普通的 verbose 输出仍保持关闭。
        - `/fast auto|on|off` 会持久化会话覆盖；使用 Sessions UI 的 `inherit` 选项可清除它。
        - `/fast` 具有提供方特定行为：OpenAI/Codex 将其映射为 `service_tier=priority`；直接 Anthropic 请求映射为 `service_tier=auto` 或 `standard_only`。
        - `/reasoning`、`/verbose` 和 `/trace` 在群组场景中存在风险——它们可能泄露内部推理或插件诊断信息。请在群聊中保持关闭。

      </Accordion>
      <Accordion title="模型切换详情">
        **一句话说明范围：** owner/管理员直接执行 `/model <model>` 会更改会话，并请求尽力更新已配置的默认值；`-s` 仅更改当前会话。当代理继承 `agents.defaults.model` 时，更新目标是该共享的全局回退值。

        已配置的 `/<alias>` 简写接受与 `/model <alias>` 相同的末尾 `--runtime`、`-s` 和 `--session` 选项。

        | 目标 | 命令 | 效果 |
        | --- | --- | --- |
        | 请求更改已配置的默认值 | 作为 owner/管理员执行 `/model <model>` | 更改此会话，并开始尽力更新代理的有效已配置默认值。如果代理没有显式主模型，目标就是共享的 `agents.defaults.model` 回退值 |
        | 仅更改此会话 | `/model <model> -s`（或 `--session`） | 更改此会话；已配置的默认值保持不变 |
        | 再次使用已配置的默认值 | `/model default`（带或不带 `-s`） | 清除当前会话的模型选择，使其继承当前已配置的默认值；兼容的身份验证固定设置会保留，不兼容的固定设置会被清除 |

        非 owner 执行的 `/model <model>` 选择同样只对当前会话有效，因为其无法写入已配置的默认值。不可变配置保持不变，异步写入失败会被记录，但不会回退会话选择。明确的用户模型/配置文件固定设置会跨越 `/new`、`/reset`、会话轮换、压缩和冷却窗口而保留；自动配置文件固定设置可能会轮换或清除。使用 `/model default -s` 重置会清除会话模型选择，保留兼容的身份验证固定设置，并清除不兼容的固定设置。它不会恢复先前由 owner/管理员选择替换的已配置默认值。

        - 如果代理处于空闲状态，下一次运行会立即使用它。
        - 如果当前有运行正在进行，切换会被标记为待处理，并在下一个干净的重试点应用。

      </Accordion>
    </AccordionGroup>

  </Accordion>

  <Accordion title="发现与状态">
    | 命令 | 描述 |
    | --- | --- |
    | `/help` | 显示简短帮助摘要 |
    | `/commands` | 显示生成的命令目录 |
    | `/tools [compact\|verbose]` | 显示当前代理此刻可用的工具 |
    | `/status` | 显示执行/运行时状态、Gateway 和系统运行时间、插件健康状况，以及提供方用量/配额 |
    | `/status plugins` | 显示详细的插件健康状况：加载错误、隔离、频道插件失败、依赖问题、兼容性提示。需要 `commands.plugins: true` |
    | `/goal [status\|start\|edit\|pause\|resume\|complete\|block\|clear] ...` | 管理当前会话的持久化 [goal](/tools/goal) |
    | `/diagnostics [note]` | 仅 owner 可用的支持报告流程。每次都会请求 exec 批准 |
    | `/openclaw <request>` | 从 owner 私聊运行 OpenClaw 的安装与修复助手 |
    | `/tasks` | 列出当前会话中活跃/最近的后台任务 |
    | `/context [list\|detail\|map\|json]` | 解释上下文是如何组装的 |
    | `/whoami` | 显示你的发送者 ID。别名：`/id` |
    | `/usage off\|tokens\|full\|reset\|cost` | 控制每次回复的用量页脚（`reset`/`inherit`/`clear`/`default` 会清除会话覆盖以重新继承已配置的默认值），或打印本地成本摘要 |
  </Accordion>

  <Accordion title="技能、允许列表、批准">
    | 命令 | 描述 |
    | --- | --- |
    | `/skill <name> [input]` | 按名称运行一个技能 |
    | `/learn [request]` | 通过 [Skill Workshop](/tools/skill-workshop) 从当前对话或命名来源草拟一个可审阅的技能 |
    | `/loop [interval] <prompt>` | 仅 owner 可用。在此对话中重复一个提示；省略间隔可用于自定节奏检查 |
    | `/loop status` | 仅 owner 可用。列出绑定到此对话的循环 |
    | `/loop stop [name]` | 仅 owner 可用。停止匹配到的、绑定到此对话的循环 |
    | `/allowlist [list\|add\|remove] ...` | 管理允许列表条目。仅文本 |
    | `/approve <id> <decision>` | 处理 exec 或插件审批提示 |
    | `/btw <question>` | 在不更改会话上下文的情况下提出一个附带问题。别名：`/side`。参见 [BTW](/tools/btw) |
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
| `/dreaming [on\|off\|status\|help]`                     | 切换记忆梦境（owner 或 Gateway 管理员）。参见 [Dreaming](/concepts/dreaming)                                                                                                            |
| `/pair [qr\|status\|pending\|approve\|cleanup\|notify]` | 管理设备配对。参见 [Pairing](/channels/pairing)                                                                                                                                        |
| `/voice status\|list\|set <voiceId>`                    | 管理 Talk 语音配置。Discord 原生命令名：`/talkvoice`                                                                                                                                    |
| `/card ...`                                             | 发送 LINE 富卡片预设。参见 [LINE](/channels/line)                                                                                                                                        |
| `/codex <action> ...`                                   | 绑定、指引和检查 Codex 应用服务器脚手架（status、threads、resume、model、fast、permissions、compact、review、mcp、skills 等）。参见 [Codex harness](/plugins/codex-harness) |

仅 QQBot：`/bot-ping`、`/bot-version`、`/bot-help`、`/bot-upgrade`、`/bot-logs`。

### 技能命令

用户可调用的技能会以斜杠命令形式暴露：

- `/skill <name> [input]` 始终作为通用入口可用。
- 技能可以注册为直接命令（例如 OpenProse 的 `/prose`）。
- 原生技能命令注册由 `commands.nativeSkills` 和
- `channels.<provider>.commands.nativeSkills` 控制。
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

## `/loop`：循环对话工作

`/loop` 仅限所有者使用，因为它使用 cron 控制平面工具。`/loop 5m check deploy status` 会要求代理在当前对话中创建一个固定频率的 cron 作业。没有间隔时，`/loop watch for new issues` 会创建一个自适应循环，在活跃时更频繁地检查，并在安静时逐步退避到 1 小时。`/loop status` 会列出该对话的循环作业；`/loop stop [name]` 会将其移除。

## `/model`: 模型选择

直接所有者/管理员的 `/model <model>` 请求使用**默认作用域**：它会更改当前会话，并开始尽力更新已配置的默认值。添加 `-s` 使用**会话作用域**：仅更改当前会话。对于未显式指定主模型的代理，更新目标是共享的全局 `agents.defaults.model` 回退值。

```text
/model             # 显示模型选择器
/model list        # 相同
/model 3           # 从选择器中按编号选择
/model openai/gpt-5.4    # 直接所有者/管理员：会话 + 默认值更新请求
/model openai/gpt-5.4 -s # 仅当前会话；已配置的默认值不变
/model default -s        # 清除当前会话的模型选择；使用已配置的默认值
/model opus@anthropic:default -s # 为当前会话固定此配置
/model default     # 相同的重置操作；不会恢复较早配置的默认值
/model status      # 查看包含端点和 API 模式的详细信息
```

在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，其中包含提供商和模型下拉菜单，并遵循直接命令流程。所有者/管理员提交的请求会尽力更新已配置的默认值。Telegram 回调选择器中的选择仅限当前会话。该选择器遵循 `agents.defaults.modelPolicy.allow`，包括 `provider/*` 条目。如果没有显式的允许列表，模型条目和别名不会限制选择。

## `/config`：磁盘上的配置写入

<Note>
  仅限 owner。默认禁用——通过启用 `commands.config: true` 打开。
</Note>

```text
/config show
/config show channels.whatsapp.responsePrefix
/config get channels.whatsapp.responsePrefix
/config set channels.whatsapp.responsePrefix="[openclaw]"
/config unset channels.whatsapp.responsePrefix
```

写入前会进行配置校验。无效更改会被拒绝。`/config` 的更新会在重启后保留。

## `/mcp`：MCP 服务器配置

<Note>
  仅限所有者。默认禁用——通过启用 `commands.mcp: true` 打开。
</Note>

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

`/mcp` 将配置存储在 OpenClaw 配置中，而不是嵌入式代理项目设置中。  
`/mcp show` 会对含有凭据的字段、已识别的凭据标志值以及已知的密钥形参数组进行脱敏。  
当在群组中运行时，配置将私下发送给所有者；如果没有可用的私有所有者路由，命令将默认失败并要求所有者从直接聊天中重试。

## `/debug`：仅运行时覆盖

<注>
  仅限所有者。默认禁用——通过启用 `commands.debug: true` 打开。
  覆盖会立即应用到新的配置读取，但**不会**写入磁盘。
</注>

```text
/debug show
/debug set channels.whatsapp.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset channels.whatsapp.responsePrefix
/debug reset
```

## `/plugins`：插件管理

<Note>
  仅限所有者执行写入操作。默认禁用——通过启用 `commands.plugins: true` 打开。
</Note>

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
/plugins install clawhub:<package>
/plugins install npm:@openclaw/<official-package>
/plugins install npm:<package> --force
/plugins install git:<repository>@<ref> --force
```

`/plugins enable|disable` 会更新插件配置，并为新的代理回合热重载网关插件运行时。由于插件源模块已更改，`/plugins install` 会自动重启受管网关。受信任的 ClawHub 和官方目录安装不需要额外确认。任意的 npm、
git、archive、`npm-pack:` 和本地路径来源会显示来源警告，并且在你审查
来源后需要在末尾添加 `--force`。此标志表示你已确认该来源，并允许替换
现有安装；它不会绕过 `security.installPolicy` 或安装器安全检查。带有风
险警告的 ClawHub 发布版本仍然需要单独的仅 shell 使用的
`--acknowledge-clawhub-risk` 标志。市场、已链接和已固定安装也仍然仅限 shell 使用。

## `/trace`：插件跟踪输出

```text
/trace          # 显示当前跟踪状态
/trace on
/trace off
```

`/trace` 会显示会话范围内的插件跟踪/调试行，而不会进入完整 verbose 模式。它不能替代 `/debug`（运行时覆盖）或 `/verbose`（正常工具输出）。

## `/btw`：附带问题

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

在 Control UI 中，`/btw` 和 `/side` 会打开会话侧栏，并询问其只读伴随对象，而不是启动分离的 BTW 路径。上文所述的 TUI 和外部通道行为保持不变。

参见 [BTW side questions](/tools/btw) 了解完整行为。

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

## 提供者使用情况和状态

- **提供者使用量/配额**（例如，“Claude 还剩 80%”）会在启用使用情况跟踪时显示在当前模型提供者的 `/status` 中。
- `/status` 中的 **token/缓存行** 在实时会话快照较少时，可能会回退到最新的转录使用条目。
- **执行 vs 运行时：** `/status` 会报告 `Execution`，以指示实际的沙箱路径；并报告 `Runtime`，以指示当前正在运行会话的是谁：`OpenClaw Default`、`OpenAI Codex`、CLI backend 或 ACP backend。
- **每次响应的 token/成本：** 由 `/usage off|tokens|full` 控制。
- `/model status` 重点关注模型/认证/端点，而不是使用情况。

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
