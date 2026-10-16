---
title: "斜杠命令"
sidebarTitle: "斜杠命令"
summary: "所有可用的斜杠命令、说明和内联快捷方式——配置、路由以及特定界面的行为。"
read_when:
  - "使用或配置聊天命令时"
  - "调试命令路由或权限时"
  - "了解技能命令的注册方式时"
---

Gateway 处理以 `/` 开头并作为独立消息发送的命令。 仅限主机的 bash 命令使用 `! <cmd>`（`/bash <cmd>` 是别名）。

当对话绑定到 ACP 会话时，普通文本将路由到 ACP harness。网关管理命令保持本地：`/acp ...` 始终到达 OpenClaw 命令处理程序，并且只要为表面启用命令处理，`/status` 和 `/session` 就保持本地。

## <a id="three-command-types"></a> 三种命令类型

<CardGroup cols={3}>
  <Card title="命令" icon="terminal">
    由 Gateway 处理的独立 `/...` 消息。必须作为消息中的唯一内容发送。
  </Card>
  <Card title="指令" icon="sliders">
    `/think`、`/fast`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue` - 在模型处理消息之前解释。大多数会话设置在单独发送时会保留。命令和传递的确认保留在对话历史记录中。 `/exec` 安全和批准选项仅适用于其消息。
  </Card>
  <Card title="内联快捷键" icon="bolt">
    `/help`、`/commands`、`/status`、`/whoami` —— 会立即运行，并在模型看到剩余文本之前被剥离。仅限授权发送者。
  </Card>
</CardGroup>

<AccordionGroup>
  <Accordion id="directive-behavior-details" title="指令行为细节">
    - 在模型处理任务文本之前，Inline 指令已从任务文本中删除。删除后，剩余文本的间距和行结尾将保持不变，包括代码缩进。仅删除已识别的指令、其参数和相邻分隔符（或单独位于一行时其自身的行结尾）。没有识别指令的文本不会改变。添加的提示上下文不会扫描文本命令或被剥离为指令。
    - 在 **directive-only** 消息（该消息仅是指令）中，它们保留到会话并回复确认。文字命令及其传递的确认都保留为 user/assistant 消息，以供以后轮流使用。 `/exec security=... ask=...` 是例外：这些选项仅适用于当前消息，并且永远不会更改以后的轮次。将它们包含在任务中。将 [ 会话权限模式 ](/gateway/permission-modes) 用于会话范围策略。 `/exec host=... node=...` 仍然坚持放置。
    - 在 **正常聊天** 带有其他文本的消息中，它们充当内联提示并执行 **not** 保留会话设置。模型选择是例外：授权的内联 `/model` 或配置的 `/<alias>` 保留会话选择。 Owner/admin `-a` 和 `-g` 示波器还请求更新所选默认值。
    - 指令仅适用于**授权发件人**。如果设置了 `commands.allowFrom`，则它是唯一使用的允许列表。否则，授权来自通道允许列表、配对和始终在线的访问组实施。未经授权的发件人会看到被视为纯文本的指令。
  </Accordion>
</AccordionGroup>

通过共享调度程序传递的命令回复是每个通道上对话的一​​部分。 Discord 和 Telegram、Slack 参数菜单以及 Mattermost 模型选择器上的本机命令菜单和按钮选择在交付后也会保留。这些交换出现在会话历史记录和后来的模型上下文中。登录代码、配对代码、登录 URL 和敏感 `/config set` 或 `/debug set` 值在记录副本中经过编辑；传递的指令和命令执行不变。 `/new` 和 `/reset` 在新会话中记录其命令和确认，而不更改旧的记录。 `/stop` 记录该命令及其中止通知。 `/btw` 和 `/side` 仍然是短暂的；普通消息编辑和删除不会重写记录历史记录。

<a id="config" />

## <a id="configuration"></a> 配置

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
    restart: true, // enables /restart and /update
    ownerAllowFrom: ["discord:user:123456789012345678"],
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
  },
}
```

<ParamField path="commands.text" type="boolean" default="true">
  启用在聊天消息中解析 `/...`。在没有原生命令的界面（WhatsApp、WebChat、Signal、iMessage、Google Chat、Microsoft Teams）上，即使设为 `false`，文本命令也可正常工作。
</ParamField>

<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  注册本机命令。自动：Discord/Telegram. 为开，Slack 为关。对于没有本机支持的提供者将被忽略。使用 `channels.<provider>.commands.native` 覆盖每个通道。在 Discord 上，`false` 跳过斜杠命令注册。以前注册的命令可能会保持可见，直到被删除。
</ParamField>

<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  支持时本地注册技能命令。自动：Discord/Telegram. 为开，Slack 为关。用 `channels.<provider>.commands.nativeSkills` 覆盖。
</ParamField>

<ParamField path="commands.bash" type="boolean" default="false">
  启用 `! <cmd>` 运行主机 shell 命令（`/bash <cmd>` 别名）。需要 `tools.elevated` 允许列表。
</ParamField>

<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  bash 在切换到后台模式前等待的时间（`0` 会立即转入后台）。
</ParamField>

<ParamField path="commands.config" type="boolean" default="false">
  启用 `/config` （reads/writes `openclaw.json`）。仅限业主。
</ParamField>

<ParamField path="commands.mcp" type="boolean" default="false">
  启用 `/mcp`（`mcp.servers` 下的 reads/writes OpenClaw- 托管 MCP 配置）。仅限业主。
</ParamField>

<ParamField path="commands.plugins" type="boolean" default="false">
  启用 `/plugins`（插件 discovery/status 加上安装 + enable/disable）。仅供所有者写入。
</ParamField>

<ParamField path="commands.debug" type="boolean" default="false">
  启用 `/debug`（仅运行时配置覆盖）。仅限所有者。
</ParamField>

<ParamField path="commands.restart" type="boolean" default="true">
  启用 `/restart`、`/update` 和外部 `SIGUSR2` 重启请求。
</ParamField>

<ParamField path="commands.ownerAllowFrom" type="string[]">
  仅限所有者的命令界面的显式所有者允许列表。与 `commands.allowFrom` 和 DM 配对访问分开。 CLI 配对批准记录第一拥有者。 Control UI 配对具有显式所有者复选框。当使用仅限所有者的命令（例如 `/restart` 或 `/update`）时，授权的非所有者会收到发送者 ID 的确切配置命令的拒绝。使用通道的直接用户目标，例如 `discord:user:123456789012345678` 或 `telegram:123456789`。当通道需要区分用户和共享对话时，Doctor 会保留 `user:`。这使得同一所有者可用于命令授权和心跳传送。如果较旧的更新删除了此类，请运行 `openclaw doctor --fix`。 Doctor 仅从匹配的配置备份历史记录中恢复它；否则，在您确认用户 ID 后，它会报告确切的所有者条目以进行更正。
</ParamField>

通道插件可以通过其 `enforceOwnerForCommands` 策略强制执行仅限所有者的命令访问。这是插件行为，而不是 `openclaw.json` 设置。通配符命令白名单不会绕过它。

<ParamField path="commands.allowFrom" type="object">
  用于命令授权的每个提供商的白名单。配置后，它是命令和指令的 **only** 授权源。使用 `"*"` 作为全局默认值。特定于提供商的密钥会覆盖它。 Discord 发件人条目接受裸用户 ID 或 `user:<id>` 和 `discord:<id>` 别名。
</ParamField>

当未配置 `commands.allowFrom` 时，命令授权遵循通道的白名单和配对状态。通道允许列表引用的访问组条目会自动解析。没有命令级访问组切换。

对于具有已验证登录身份的网关用户，两个命令白名单都可以与用户的配置文件 ID 匹配。仅用于归属的共享所有者配置文件不会授予此访问权限。内部合成呼叫者无法借用人类的个人资料。非 UI 网关客户端还保留应用程序 ID 匹配，例如 `cli`；运营商 UI 客户端未收到应用程序 ID 匹配项。现有的操作员范围和命令启用仍然适用。

会话命令 `/new` 和 `/reset`（包括 `/reset soft`）对于不强制执行仅所有者命令的通道上的通道授权发送者仍然可用，即使这些发送者不在 `commands.ownerAllowFrom` 中也是如此。适用的 `commands.allowFrom` 策略仍然具有权威性：被拒绝的发件人或明确为空的列表不能回退到通道准入。重置访问权限不会授予其他命令或仅限所有者的权限。具有显式作用域的内部网关调用方仍需要 `operator.admin` 进行重置。当请求和回复都停留在 WebChat 时，拒绝的 `/new` 和 `/reset` 命令显示权限拒绝。被拒绝的命令不会执行请求的重置或运行其后续文本。正常的 idle/daily 展期仍然适用。请您的网关管理员重置会话，或在不使用命令的情况下发送消息。

独立的 `/new` 和 `/reset` 确认不会启动模型转动或查找模型派生的思维和推理默认值。后续文本仍然贯穿已配置的模型和推理设置。

## <a id="command-list"></a> 命令列表

命令来自三个来源：

- **核心内置：** `src/auto-reply/commands-registry.shared.ts`
- **插件命令：** 插件的 `registerCommand()` 调用
- **技能命令：已安装技能导出的**命令，组装在`src/auto-reply/commands-registry-list.ts`中

可用性取决于配置标志、通道表面、installed/enabled 插件和安装的技能。

### <a id="core-commands"></a> 核心命令

<AccordionGroup>
  <Accordion id="sessions-and-runs" title="会话和运行">
    | 命令 | 描述 |
    | --- | --- |
    | `/new [model]` | 归档当前会话并启动一个新的会话 |
    | `/reset [soft [message]]` | 将当前会话重置到位。 `soft` 保留记录，删除重用的 CLI 后端会话 ID，然后重新运行启动 |
    | `/name <title>` | 为当前会话命名或重命名。省略标题可查看当前名称及建议 |
    | `/compact [instructions]` | 压缩会话上下文。参见 [Compaction](/concepts/compaction) |
    | `/stop` | 中止当前运行 |
    | `/session idle <duration\|off>` | 管理线程绑定的空闲过期时间 |
    | `/session max-age <duration\|off>` | 管理线程绑定的最大存活过期时间 |
    | `/export-session [path]` | 仅 owner 可用。将当前会话导出为工作区内的 HTML。别名：`/export` |
    | `/export-trajectory [path]` | 为当前会话导出 JSONL 轨迹包。别名：`/trajectory` |

    `/session idle`和`/session max-age`等待通道绑定更新后确认成功。失败的更新不会产生成功的回复。

    显式的 `/export-session` 路径会替换工作区内已有文件。省略路径可生成一个避免冲突的文件名。

    HTML 导出保留列表项中的内联 Markdown 格式，包括粗体文本、链接和内联代码。

    HTML 对话卡忽略标记为隐藏的消息。侧边栏的 **All** 过滤器包含这些带有 **[隐藏]** 标签的记录，用于调试。消息计数描述了原始存档。 HTML 文件及其 JSONL 下载仍然包含隐藏记录。隐藏消息不会编辑导出。

    <Note>
      Control UI 拦截键入的 `/new` 以创建并切换到新的仪表板会话，除非配置了 `session.dmScope: "main"` 并且当前父级是代理的主会话，在这种情况下，`/new` 会重置主会话。输入 `/reset` 仍会运行网关的就地重置。当您想要清除固定的会话模型选择时，请使用 `/model default`。
    </Note>

  </Accordion>

  <Accordion id="model-and-run-controls" title="模型和运行控制">
    | 命令 | 描述 |
    | --- | --- |
    | `/think <level\|default>` | 设置思考级别或清除会话覆盖。别名：`/thinking`、`/t` |
    | `/verbose on\|off\|full` | 切换详细输出。别名：`/v` |
    | `/trace on\|off` | 切换当前会话的插件跟踪输出 |
    | `/fast [status\|auto\|on\|off\|ultrafast\|default]` | 显示、设置或清除快速模式 |
    | `/reasoning [on\|off\|stream]` | 切换推理可见性。别名：`/reason` |
    | `/elevated [on\|off\|ask\|full]` | 切换提升模式。别名：`/elev` |
    | `/exec host=<auto\|sandbox\|gateway\|node> security=<deny\|allowlist\|full> ask=<off\|on-miss\|always> node=<id>` | 显示已解析的执行默认值；保留 host/node 放置，仅将 security/ask 应用于此消息。参见[会话权限模式](/gateway/permission-modes) |
    | `/login [provider]` | 显示登录提供商，然后在有多个连接方法可用时选择一种连接方法。仅限 Owner/admin |
    | `/login refresh` | 刷新保存的登录状态，无需再次登录。仅限 Owner/admin |
    | `/login access <provider>` | 重新打开提供商的模型访问选择，无需再次登录。仅限 Owner/admin |
    | `/model [name\|default\|list\|status] [-s\|--session\|-a\|--agent\|-g\|--global]` | 显示或选择模型。 `-s` 仅更改此会话； owner/admin `-a` 和 `-g` 还更新配置的默认值 |
    | `/models [provider] [page] [limit=<n>\|all]` | 列出 configured/auth-available 供应商或模型 |
    | `/queue <mode>` | 管理活动运行的队列行为。参见 [Queue](/concepts/queue) 和 [Queue steering](/concepts/queue-steering) |
    | `/steer <message>` | 向活动运行注入指导。别名：`/tell`。参见 [Steer](/tools/steer) |

    <AccordionGroup>
      <Accordion id="verbose-trace-fast-reasoning-safety" title="详细/跟踪/快速/推理安全">
        - `/verbose` 用于调试——正常使用时请保持**关闭**。
        - `/trace` 仅显示插件拥有的 trace/debug 行。正常的冗长闲聊将停止。
        - `/fast auto|on|off|ultrafast` 保留会话覆盖。使用 `/fast default` 或会话 UI `inherit` 选项将其清除。
        - `/fast` 是特定于提供商的：普通快速从 OpenAI/Codex. 上的优先级启动，Codex 仅针对显式 `"ultrafast"` 选择和经过身份验证的应用程序服务器目录（为选定的本机模型进行广告）请求 Ultrafast。快速、自动和未指定的选择永远不会自动升级。设置 `appServer.enableUltrafast: false` 以禁用超快：显式 `/fast ultrafast` 然后发送普通快速 （`priority`），而不进行超快目录检查。保存偏好并不能保证提供者履行义务。标准和非活动自动保持关闭状态。直接 Anthropic 快速请求映射到 `service_tier=auto` 或 `standard_only`。
        - `/reasoning`、`/verbose` 和 `/trace` 在群组场景中存在风险——它们可能泄露内部推理或插件诊断信息。请在群聊中保持关闭。

      </Accordion>
      <Accordion id="model-switching-details" title="模型切换详情">
        - 更喜欢在创建会话时选择模型。在已建立的会话中更改它是一项高级操作，因为模型上下文限制、prompt/tool 行为和提示缓存行为可能有所不同。请参阅 [ 选择会话模型 ](/concepts/models#choose-a-model-for-a-session)。

        **一行中的范围：** `-s` 仅更改此会话，`-a` 还更新代理默认值，`-g` 还更新共享全局默认值。如果没有标志，则设置时适用 `agents.defaults.modelSelectionScope`。省略仅改变本次会话。

        配置的 `/<alias>` 简写可识别来自 `agents.defaults.models` 和当前代理的 `agents.entries.<id>.models` 的别名。它们接受与 `/model <alias>` 相同的尾随范围和 `--runtime` 选项；其他代理的别名不适用。

        | 目标 | 命令 | 作用 |
        | --- | --- | --- |
        | 仅更改此会话 | `/model <model> -s`（或 `--session`） | 更改此会话。配置的默认值保持不变 |
        | 更新代理默认值 | `/model <model> -a` (or `--agent`) | 更改此会话并请求更新所选代理 |
        | 更新全局默认值 | `/model <model> -g` (or `--global`) | 更改此会话并请求 `agents.defaults.model` 的更新 |
        | 再次使用已配置的默认值 | `/model default -s` | 清除本次会话的模型选择而不写入默认值；兼容的验证引脚保留，不兼容的引脚清除 |

        在未设置 `modelSelectionScope` 的情况下，`/model <model>` 仅更改当前会话，包括 owners/admins.。如果没有 owner/admin 权限，裸命令将保持仅会话状态，并且显式 `-a` 和 `-g` 请求将被拒绝。选择有效的配置默认值会清除会话模型引脚，但 agent/global 作用域仍请求配置默认值写入。不可变配置保持不变。异步写入错误不会恢复会话选择。

        - 如果代理处于空闲状态，下一次运行会立即使用它。
        - 如果当前有运行正在进行，切换会被标记为待处理，并在下一个干净的重试点应用。

      </Accordion>
    </AccordionGroup>

  </Accordion>

  <Accordion id="discovery-and-status" title="发现和状态">
    | 命令 | 描述 |
    | --- | --- |
    | `/help` | 显示简短帮助摘要 |
    | `/commands` | 显示生成的命令目录 |
    | `/tools [compact\|verbose]` | 显示当前代理此刻可用的工具 |
    | `/status` | 显示 execution/runtime 状态、网关和系统正常运行时间、插件运行状况以及提供商 usage/quota |
    | `/status plugins` | 在单独的有界部分中显示详细的插件运行状况：加载错误、隔离、通道插件故障、依赖性问题、兼容性通知和信息诊断。需要 `commands.plugins: true` |
    | `/goal [status\|start\|edit\|pause\|resume\|complete\|block\|clear] ...` | 管理当前会话的持久化 [goal](/tools/goal) |
    | `/dashboard [request]` | 使用 Control UI 仪表板工作流程创建或更新当前会话的仪表板 |
    | `/diagnostics [note]` | 仅 owner 可用的支持报告流程。每次都会请求 exec 批准 |
    | `/openclaw <request>` | 从所有者 DM 运行 OpenClaw 设置和修复助手 |
    | `/context [list\|detail\|map\|json]` | 解释上下文是如何组装的 |
    | `/whoami` | 显示您的发件人 ID。别名： `/id` |
    | `/usage off\|tokens\|full\|reset\|cost` | Control 每个响应使用情况页脚（`reset`/`inherit`/`clear`/`default` 清除会话覆盖以重新继承配置的默认值）或打印本地成本摘要 |
  </Accordion>

`/dashboard` 被保留为内置命令。如果现有用户技能名为 `dashboard`，技能发现会将其生成的斜线别名公开为 `/dashboard_2`。 `$dashboard` 和 `/skill dashboard` 继续直接选择该用户技能。

  <Accordion id="skills-allowlists-approvals" title="技能、许可名单、批准">
    | 命令 | 描述 |
    | --- | --- |
    | `/skill <name> [input]` | 按名称运行一个技能 |
    | `/learn [request]` | 通过 [Skill Workshop](/tools/skill-workshop) 从当前对话或命名来源草拟一个可审阅的技能 |
    | `/learn undo <id>` | 仅限业主。还原后台审核所做的每一项技能更改，如通知的 **Undo** 按钮所做的那样 |
    | `/loop [interval] <prompt>` | 仅 owner 可用。在此对话中重复一个提示；省略间隔可用于自定节奏检查 |
    | `/loop status` | 仅 owner 可用。列出绑定到此对话的循环 |
    | `/loop stop [name]` | 仅 owner 可用。停止匹配到的、绑定到此对话的循环 |
    | `/allowlist [list\|add\|remove] ...` | 管理允许列表条目。仅文本 |
    | `/approve <id> <decision>` | 解决 exec、插件或 OpenClaw 更改批准提示 |
    | `/btw <question>` | 在不更改会话上下文的情况下提出一个附带问题。别名：`/side`。参见 [BTW](/tools/btw) |
  </Accordion>

  <Accordion id="subagents-and-acp" title="子代理和 ACP">
    | 命令 | 描述 |
    | --- | --- |
    | `/subagents list\|log\|info` | 检查当前会话的子代理运行情况 |
    | `/acp spawn\|cancel\|steer\|close\|sessions\|status\|set-mode\|set\|cwd\|permissions\|timeout\|model\|reset-options\|doctor\|install\|help` | 管理 ACP 会话和运行时选项。运行时控制需要外部 owner 或内部 Gateway 管理员身份 |
    | `/session unbind` | 分离当前对话而不关闭其代理会话 |
    | `/agents` | 列出当前会话的线程绑定代理 |
  </Accordion>

  <Accordion id="owner-only-writes-and-admin" title="仅限所有者写入和管理">
    | 命令 | 需要 | 描述 |
    | --- | --- | --- |
    | `/config show\|get\|set\|unset` | `commands.config: true` | 读写 `openclaw.json`。仅限 owner |
    | `/mcp show\|get\|set\|unset` | `commands.mcp: true` | 读取或写入 OpenClaw- 托管 MCP 服务器配置。仅限业主 |
    | `/plugins list\|inspect\|show\|get\|install\|enable\|disable` | `commands.plugins: true` | 检查或修改插件状态。写操作仅限 owner。别名：`/plugin` |
    | `/debug show\|set\|unset\|reset` | `commands.debug: true` | 仅运行时配置覆盖。仅限 owner |
    | `/restart` | `commands.restart: true`（默认） | 重启 OpenClaw |
    | `/update` | `commands.restart: true`（默认），所有者 | 使用其配置的更新通道更新OpenClaw；使用默认工具配置文件并在同一聊天中发送完成或失败通知 |
    | `/send on\|off\|inherit` | 所有者 | 设置发送策略 |

    自然语言更新请求使用 `gateway` 工具的 `update.run` 操作。 `/update` 提供相同的更新操作，无需功能模型或访问该工具。两者都使用网关更新处理程序，Control UI 也使用该处理程序。仅聊天访问权限并不授予更新权限。请参阅 [ 从聊天 ](/install/updating#from-chat) 更新。

  </Accordion>

  <Accordion id="voice-tts-channel-control" title="语音、TTS、通道控制">
    | 命令 | 描述 |
    | --- | --- |
    | `/tts on\|off\|status\|chat\|latest\|provider\|limit\|summary\|audio\|help` | Control TTS。参见 [TTS](/tools/tts) |
    | `/activation mention\|always` | 设置群组激活模式 |
    | `/bash <command>` | 运行主机 shell 命令。别名：`! <command>`。需要 `commands.bash: true` |
    | `!poll [sessionId]` | 检查后台 bash 作业；仅在发送终端答复后才确认其待完成通知。失败或被抑制的回复保留通知 |
    | `!stop [sessionId]` | 停止一个后台 bash 作业 |
  </Accordion>
</AccordionGroup>

### <a id="bundled-plugin-commands"></a> 内置插件命令

| 命令                                                                             | 描述                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dreaming [on\|off\|status\|help]`                                                 | 切换 memory dreaming（owner 或 Gateway 管理员）。参见 [Dreaming](/concepts/dreaming)                                                                                                            |
| `/pair [qr\|status\|pending\|approve\|cleanup\|notify]`                             | 管理设备配对。参见 [Pairing](/channels/pairing)                                                                                                                                        |
| [`/voice`](/nodes/talk#choose-a-talk-voice-from-chat) `status\|list\|set <voiceId>` | 管理 Talk 语音配置。Discord 原生命令名称：`/talkvoice`                                                                                                                                    |
| `/codex <action> ...`                                                               | 绑定、引导和检查 Codex app-server harness（状态、线程、恢复、模型、快速模式、权限、压缩、审查、mcp、技能等）。参见 [Codex harness](/plugins/codex-harness) |

LINE-only：`/card ...`（丰富的卡片预设，参见[LINE](/channels/line)）

仅 QQBot：`/bot-ping`、`/bot-version`、`/bot-help`、`/bot-upgrade`、`/bot-logs`。

### <a id="skill-commands"></a> 技能命令

用户可调用的技能会以斜杠命令形式暴露：

- `/skill <name> [input]` 始终作为通用入口可用。
- 技能可以使用其声明的技能名称注册为直接命令。
- 本机技能命令注册由`commands.nativeSkills`和`channels.<provider>.commands.nativeSkills`控制。
- Names 被清理为 `a-z0-9_`（最多 32 个字符）。碰撞有数字后缀。

<AccordionGroup>
  <Accordion id="skill-command-dispatch" title="技能指挥调度">
    默认情况下，技能命令会作为普通请求路由到模型。

    技能可以声明`command-dispatch: tool`直接路由到工具（固定规则，无模型参与）。

  </Accordion>
  <Accordion id="native-command-arguments" title="本机命令参数">
    当省略必需参数时，Discord 会使用自动补全来处理动态选项和按钮菜单。Telegram 和 Slack 会为具有选项的命令显示按钮菜单。动态选项会针对目标会话模型进行解析，因此像 `/think` 等特定于模型的选项级别会遵循会话的 `/model` 覆盖。
  </Accordion>
</AccordionGroup>

## <a id="%2Ftools%3A-what-the-agent-can-use-now"></a><a id="/tools-what-the-agent-can-use-now"></a> `/tools`：代理现在可以使用什么

`/tools` 回答的是一个运行时问题：**这个代理在当前会话里现在能用什么** —— 不是静态配置目录。

```text
/tools         # compact view
/tools verbose # with short descriptions
```

结果按会话范围生效。更换代理、通道、线程、发送者授权或模型都可能改变输出。要编辑 profile 和 override，请使用 Control UI 的 Tools 面板或配置界面。

## <a id="%2Floop%3A-recurring-conversation-work"></a><a id="/loop-recurring-conversation-work"></a> `/loop`：循环对话工作

`/loop` 仅供所有者使用，因为它使用 cron 控制平面工具。 `/loop 5m check deploy status` 要求代理在当前对话中创建固定节奏的 cron 作业。如果没有间隔，`/loop watch for new issues` 会创建一个自定进度的循环，在活动时更频繁地检查，在安静时减少到 1 小时。 `/loop status` 列出对话的循环作业。 `/loop stop [name]` 删除它们。

## <a id="%2Fmodel%3A-model-selection"></a><a id="/model-model-selection"></a> `/model`：模型选择

使用 `-s` 仅更改当前会话，使用 `-a` 也更新代理默认值，或使用 `-g` 也更新共享全局默认值。长格式为 `--session`、`--agent` 和 `--global`。显式范围覆盖 `agents.defaults.modelSelectionScope`。

如果没有标志或可选设置，`/model <model>` 仅更改当前会话，包括 owners/admins. 仅当您希望不合格的选择更新默认值时，才将 `agents.defaults.modelSelectionScope` 设置为 `"agent"` 或 `"global"`。该设置不授予写入配置默认值的权限。参见[选型范围](/gateway/config-agents/models#agentsdefaultsmodelselectionscope)。

在文本命令中，通过 `provider/model` 或配置的别名选择模型。不支持 `/model 3` 等数字选择。

```text
/model             # show current model and usage guidance
/model list        # browse providers (same as /models)
/models openai     # list models from a provider
/model openai/gpt-5.4    # configured scope, or session-only when unset
/model openai/gpt-5.4 -s # explicit session scope
/model openai/gpt-5.4 -a # session + agent default update request
/model openai/gpt-5.4 -g # session + global default update request
/model default -s        # clear this session's model selection; use configured default
/model opus@anthropic:default -s # pin this profile for the current session
/model "openai/gpt-5.4"@"openai:owner+work@example.com" -s # quote account names with special characters
/model default     # use configured default, following the selected scope
/model status      # detailed view with endpoint and API mode
```

在 Discord 上，裸机 `/model` 和 `/models` 命令打开交互式选择器。从下拉列表中选择提供商和模型，然后选择 **Submit**。 Discord 遵循直接命令行为，包括 `modelSelectionScope`。 Telegram 模型浏览使用回调按钮。选择始终仅限于会话。选择器尊重 `agents.defaults.modelPolicy.allow`，包括 `provider/*` 条目。如果没有明确的允许列表，模型条目和别名不会限制选择。

`-a` 仅更新当前代理配置的主要代理，即使它之前继承了全局默认值。 `-g` 更新共享后备，而不是每个代理的显式主要。其他会话 pin 保持不变，但取消固定的会话和继承更改后的默认值的 cron 作业可以在下次运行时使用它。选择有效的配置默认值会清除会话模型引脚，但 agent/global 作用域仍请求配置默认值写入。使用 `/model default -s` 继承配置的默认值，无需写入。如果没有 owner/admin 权限，裸命令将保持仅会话状态，并且显式 `-a` 或 `-g` 请求将被拒绝。

## <a id="%2Fconfig%3A-on-disk-config-writes"></a><a id="/config-on-disk-config-writes"></a> `/config`：磁盘上的配置写入

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

## <a id="%2Fmcp%3A-mcp-server-config"></a><a id="/mcp-mcp-server-config"></a> `/mcp`：MCP 服务器配置

<Note>
  仅限所有者。默认禁用——通过启用 `commands.mcp: true` 打开。
</Note>

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

`/mcp` 将配置存储在 OpenClaw 配置中，而不是嵌入式代理项目设置。 `/mcp show` 编辑凭证承载字段、已识别的凭证标志值和已知的秘密形状参数。当从组运行时，配置将私下路由到所有者。组通知区分已确认、待处理和抑制的传递。未经确认的发送将保持待处理状态，无需尝试其他私人收件人。如果没有可用的私人所有者路由，该命令会要求所有者从直接聊天中重试。

## <a id="%2Fdebug%3A-runtime-only-overrides"></a><a id="/debug-runtime-only-overrides"></a> `/debug`：仅运行时覆盖

<Note>
  仅限所有者。默认禁用——通过启用 `commands.debug: true` 打开。 覆盖会立即应用到新的配置读取，但**不会**写入磁盘。
</Note>

```text
/debug show
/debug set channels.whatsapp.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset channels.whatsapp.responsePrefix
/debug reset
```

## <a id="%2Fplugins%3A-plugin-management"></a><a id="/plugins-plugin-management"></a> `/plugins`：插件管理

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

`/plugins enable|disable` 和 `/plugins install` 通过正在运行的网关的插件生命周期进行应用，并报告运行时应用结果，而无需重新启动网关。新代理将使用更新的插件运行时。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

受信任的 ClawHub 和官方目录安装不需要来源确认。任意 npm、git、archive、`npm-pack:` 和本地路径源会显示出处警告，并在您查看源后需要尾随 `--force`。该标志确认来源并允许替换现有安装。它不会绕过 `security.installPolicy` 或安装程序安全检查。 ClawHub 审核结果以信息形式打印。被阻止的版本仍然不可安装。市场、链接和固定安装仍然仅限 shell。

`/plugins inspect <child>`（也称为 `show` 或 `get`）和 `/plugins inspect all` 包含多条目插件的共享包安装元数据。当包所有权丢失或不明确时，检查将返回 `install: null`，并保留其运行时功能报告。它在返回回复之前释放其检查注册资源，而正在运行的网关的活动注册仍然可用。清理失败会作为命令失败传播。

当 `/plugins install` 或 `/plugins enable` 需要功能同意时，它会返回插件声明的功能和准确的重试命令。查看该回复，然后使用 `--accept-capabilities` 重新运行：

```text
/plugins install clawhub:<package> --accept-capabilities
/plugins enable <plugin-id> --accept-capabilities
```

OpenClaw 官方目录中的捆绑插件和经过验证的插件无需获得功能许可。第三方能力同意与 `--force` 提供的源确认是分开的。

## <a id="%2Ftrace%3A-plugin-trace-output"></a><a id="/trace-plugin-trace-output"></a> `/trace`：插件跟踪输出

```text
/trace          # show current trace state
/trace on
/trace off
```

`/trace` 揭示了会话范围的插件 trace/debug 行，没有完整的详细模式。它不会替换 `/debug`（运行时覆盖）或 `/verbose`（正常工具输出）。

## <a id="%2Fbtw%3A-side-questions"></a><a id="/btw-side-questions"></a> `/btw`：附带问题

`/btw` 是一个关于当前会话上下文的快速顺便提问。别名：`/side`。

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

不同于普通消息：

- 使用当前会话作为背景上下文。
- 在 Codex harness 会话中，会作为一个临时的 Codex side thread 运行。
- **不**更改未来的会话上下文。
- 不会写入 transcript 历史。

在 Control UI、`/btw` 和 `/side` 中打开侧聊，而不是启动分离的 BTW 路径。上述 TUI 和外部通道行为保持不变。

参见 [BTW side questions](/tools/btw) 了解完整行为。

## <a id="surface-notes"></a> 界面说明

<AccordionGroup>
  <Accordion id="session-scoping-per-surface" title="每个表面的会话范围">
    - **文本命令：**在正常聊天会话中运行（DM共享`main`，群组有自己的会话）。
    - **原生 Discord 命令：** `agent:<agentId>:discord:slash:<userId>`
    - **原生 Slack 命令：** `agent:<agentId>:slack:slash:<userId>`（前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）
    - **原生Telegram命令：**像文本命令一样在聊天会话中运行。
    - **`/login`** 需要私人聊天或 Control UI 会话。它显示提供商按钮而无需开始登录。 API 按键和本地设置使用 Control UI 切换。 `/login codex` 仍然选择 OpenAI 设备配对。重试消息命名确切的连接命令。
    - **`/login openrouter`** 通过网关的托管 HTTPS 地址发送浏览器登录操作。在浏览器中批准访问，然后返回聊天以获取保存的结果。有关地址要求，请参阅 [OpenRouter](/providers/openrouter#getting-started)。使用 `/login cancel` 取消待处理的登录。
    - 登录后，模型限制可提示**显示所有提供商模型**或**保留当前限制**。无论哪种方式，凭据都会保存，并且该问题不会阻止另一次登录。过期的问题或更改的限制会打开一个新的选择，而无需再次登录。 `/login cancel` 可以取消待处理的问题，而无需删除已保存的凭据。
    - Chat 登录将保存的凭据直接应用于正在运行的网关。如果无法确认登录状态，请使用`/login refresh`，然后使用`/models`；您无需重复验证。
    - **`/stop`** 以活动聊天会话为目标，中止所选运行并停止其普通网关或沙箱命令，包括已生成进程句柄的命令。当 Stop 准备取消时，稍后的模型运行、命令和排队输入保持不变。它等待命令清理，如果无法确认清理则报告错误。以`background: true`启动的服务继续运行；使用进程句柄分别停止它们。

  </Accordion>
  <Accordion id="slack-specifics" title="Slack 规格">
    `channels.slack.slashCommand` 支持单个 `/openclaw`-style 命令。使用 `commands.native: true`，为每个内置命令创建一个 Slack 斜线命令。注册 `/agentstatus`（不是 `/status`），因为 Slack 保留 `/status`。文本 `/status` 在 Slack 消息中仍然有效。
  </Accordion>
  <Accordion id="fast-path-and-inline-shortcuts" title="快速路径和内联快捷方式">
    - 来自允许列表发送者的仅命令消息会被立即处理（绕过队列 + 模型）。
    - 内联快捷方式（`/help`、`/commands`、`/status`、`/whoami`）也可以嵌入普通消息中使用，并会在模型看到剩余文本之前被移除。
    - 在Control UI中，每个非技能斜线命令都可以在草稿中间选择。该命令单独运行，仅删除命令调用，并且周围的草稿保持未发送。
    - 在 Control UI （WebChat） 中，从斜杠补全中选择技能会将现有 `$skill-name` 引用插入到消息中（例如，`Please use $weather to check Sydney`）。
    - Inline 命令调度遵循与单独发送该命令相同的连接、权限和确认检查。输入类似斜杠的散文而不选择或提交完成内容不会执行它。
    - 在外部通道上，未经授权的纯文本命令消息将被静默忽略。内联 `/...` 标记被视为纯文本。当通道允许的发送方无法使用该命令时，本机 `/compact` 返回授权拒绝。仅当请求和回复停留在 WebChat 中时，重置拒绝才会显示权限回复。

  </Accordion>
  <Accordion id="argument-notes" title="论证笔记">
    - 命令接受在命令与参数之间可选的 `:`（`/think: high`、`/send: on`）。
    - `/new <model>` 接受模型别名 `provider/model` 或提供程序名称（模糊匹配）。如果不匹配，则该文本将被视为消息正文。
    - `/allowlist add|remove` 需要 `commands.config: true`，并遵守通道的 `configWrites`。

  </Accordion>
</AccordionGroup>

## <a id="provider-usage-and-status"></a> 提供者使用情况和状态

- 当启用使用情况跟踪时，**Provider usage/quota**（e.g.，“Claude 剩余 80%”）显示在当前模型提供程序的 `/status` 中。
- 当实时会话快照稀疏时，`/status` 中的 **Token/cache 行** 可以回退到最新的脚本使用条目。
- **执行 vs 运行时：** `/status` 会报告 `Execution`，以指示实际的沙箱路径；并报告 `Runtime`，以指示当前正在运行会话的是谁：`OpenClaw Default`、`OpenAI Codex`、CLI backend 或 ACP backend。
- **每个响应 tokens/cost：** 由 `/usage off|tokens|full` 控制。
- `/model status` 是关于 models/auth/endpoints，而不是用法。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="技能" href="/tools/skills" icon="puzzle-piece">
    技能 slash 命令如何注册和受限。
  </Card>
  <Card title="创建技能" href="/tools/creating-skills" icon="hammer">
    构建一个会注册自己的 slash 命令的 skill。
  </Card>
  <Card title="BTW" href="/tools/btw" icon="comments">
    在不改变会话上下文的情况下提出顺便问题。
  </Card>
  <Card title="引导" href="/tools/steer" icon="compass">
    使用 `/steer` 在运行中引导代理。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="sliders">
    更改斜杠命令解析和门控方式的设置。
  </Card>
  <Card title="OpenProse 迁移" href="/prose" icon="pen-nib">
    删除的 `/prose` 命令去了哪里。
  </Card>
</CardGroup>
