---
summary: "ClickClack 机器人令牌频道设置和目标语法"
read_when:
  - 连接 OpenClaw 到 ClickClack 工作区
  - 测试 ClickClack bot 身份
title: "ClickClack"
---

ClickClack 通过一等公民的 ClickClack bot token 将 OpenClaw 连接到一个自托管的 ClickClack 工作区。

当你希望 OpenClaw agent 以 ClickClack bot 用户的身份出现时，请使用此功能。ClickClack 支持独立的服务 bot 和用户所有的 bot；用户所有的 bot 会保留 `owner_user_id`，并且只接收你授予的 token 作用域。

## 快速设置

在 ClickClack 中，打开 **Workspace settings → Integrations → OpenClaw**，使用 **Setup code (recommended)** 创建一个机器人，并复制生成的命令：

```bash
openclaw channels add clickclack --code 'https://clickclack.example.com/#XXXX-XXXX-XXXX'
```

对于前端和 API 源不同，或者 API 挂载在某个路径下的情况，ClickClack 会改为输出一个精确的声明端点：

```bash
openclaw channels add clickclack --code 'https://api.example.com/services/clickclack/api/bot-setup-codes/claim#XXXX-XXXX-XXXX'
```

设置代码只能使用一次，并会在 10 分钟后过期。OpenClaw 会认领它，接收新生成的机器人令牌和工作区设置，保存该账号，验证连接，并报告正在运行的网关是否已接收它。对于带版本的精确端点，OpenClaw 会验证并保存 ClickClack 返回的规范 API 基础地址，包括任何路径前缀。设置代码本身不会存储在 OpenClaw 配置中。

设置代码认领在公共服务器上使用 HTTPS。对于本地安装，如果地址是回环地址，例如 `localhost` 和 `127.0.0.1`，也支持明文 HTTP。

如果 OpenClaw 已经在运行，ClickClack 会自动连接，不需要第二条命令。否则，请使用以下命令启动：

```bash
openclaw gateway
```

你也可以将代码与服务器 URL 分开传入：

```bash
openclaw channels add clickclack --code XXXX-XXXX-XXXX --base-url https://clickclack.example.com
```

如需引导式设置，请运行：

```bash
openclaw onboard
```

选择 ClickClack，然后在提示时输入服务器 URL、机器人令牌和工作区。引导式设置会在保存后检查服务器、令牌和工作区；即使检查失败，也不会丢弃配置。

### 其他方式：手动令牌

在配置非 OpenClaw 客户端时，或当你明确需要自行管理令牌时，在 ClickClack 中选择 **Manual token**：

```bash
openclaw channels add clickclack --base-url https://clickclack.example.com --token ccb_... --workspace default
```

`workspace` 接受工作区 id（`wsp_...`）、slug 或显示名称。
`--code` 不能与 `--token`、`--token-file` 或 `--use-env` 组合使用。

### 其他方式：基于环境变量的令牌

默认账号可以读取 `CLICKCLACK_BOT_TOKEN`，而不是将令牌存储在配置中：

```bash
export CLICKCLACK_BOT_TOKEN="ccb_..."
openclaw channels add clickclack --base-url https://clickclack.example.com --workspace default --use-env
openclaw gateway
```

命名账号必须使用已配置的令牌或令牌文件；共享环境变量刻意仅限于默认账号。

### JSON5 参考

等效的配置结构如下：

```json5
{
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://clickclack.example.com",
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      defaultTo: "channel:general",
    },
  },
}
```

只有当 `baseUrl`、令牌来源和 `workspace` 都已设置时，账号才算已配置。令牌来源可以是 `token`、`tokenFile`，或者默认账号的 `CLICKCLACK_BOT_TOKEN`。`workspace` 接受工作区 id（`wsp_...`）、slug 或名称；网关会在启动时将其解析为 id。

### 账号配置键

| 键                       | 默认值              | 说明                                                                                                                  |
| ------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`                | 无（必填）          | 用于面向浏览器的链接的公共 ClickClack URL。                                                                            |
| `apiBaseUrl`             | `baseUrl`           | 可选的服务器到服务器端点，用于 REST 和实时 WebSocket 流量。                                                            |
| `token`                  | 无                  | 机器人令牌，可以是普通字符串或机密引用（`source: "env" \| "file" \| "exec"`）。                                        |
| `tokenFile`              | 无                  | 机器人令牌文件的路径；优先级高于 `token`。                                                                             |
| `workspace`              | 无（必填）          | 工作区 id、slug 或名称。                                                                                                |
| `replyMode`              | `"agent"`           | `"agent"` 运行完整的智能体处理流程；`"model"` 发送简短的直接模型补全。                                                 |
| `defaultTo`              | `"channel:general"` | 当出站路径未提供目标时使用的目标。                                                                                     |
| `allowFrom`              | `["*"]`             | 入站私信和频道消息的用户 id 允许列表。                                                                                  |
| `botUserId`              | 自动检测            | 启动时根据机器人令牌身份解析。                                                                                         |
| `agentId`                | 路由默认值          | 将此账号的入站消息固定到一个智能体。                                                                                    |
| `toolsAllow`             | 无                  | 此账号智能体回复所允许使用的工具列表。                                                                                  |
| `model`、`systemPrompt`  | 无                  | 用于 `replyMode: "model"` 补全。                                                                                        |
| `commandMenu`            | `true`              | 将原生命令发布到 ClickClack 编辑器的自动补全中。                                                                       |
| `reconnectMs`             | `1500`              | 实时连接重连延迟（100 至 60000）。                                                                                      |
| `discussions`             | 已禁用              | 按会话管理的频道设置；请参阅[会话讨论](#session-discussions)。                                                         |
| `requireMention`          | `false`             | 要求直接提及后才分派群组消息。请参阅[群组提及门控](#group-mention-gating)。                                             |
| `mentionPatterns`         | `[]`                | 此账号在群组频道中的提及模式。请参阅[群组提及门控](#group-mention-gating)。                                            |
| `groups`                  | `{}`                | 按 ClickClack 频道 ID 设置的频道级群组策略覆盖项。请参阅[群组提及门控](#group-mention-gating)。                        |

### 保持一个受 auth 保护的公共主机名

当 ClickClack 和 OpenClaw 网关运行在同一主机上，但公共的 ClickClack 主机名受某个认证网关保护时，例如 Cloudflare Access，请使用 `apiBaseUrl`：

```json5
{
  channels: {
    clickclack: {
      baseUrl: "https://clack.openclaw.ai",
      apiBaseUrl: "http://127.0.0.1:8484",
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
    },
  },
}
```

公共主机名可以继续完全对浏览器用户启用 auth gate。OpenClaw 会对 REST 请求、设置验证以及实时 WebSocket 使用回环端点，而讨论中的 `embedUrl` 和 `openUrl` 链接仍然使用公共的 `baseUrl`。如果省略 `apiBaseUrl`，所有流量都会使用 `baseUrl`，从而保留现有行为。

如果 `plugins.allow` 是一个非空的限制性列表，那么在 channel 设置中显式选择 ClickClack，或运行 `openclaw plugins enable clickclack`，都会将 `clickclack` 追加到该列表中。Onboarding 安装使用相同的显式选择行为。这些路径不会覆盖 `plugins.deny` 或全局的 `plugins.enabled: false` 设置。直接执行 `openclaw plugins install @openclaw/clickclack` 会遵循正常的插件安装策略，并且也会将 ClickClack 记录到现有的 allowlist 中。

## 多个机器人

每个账户都会建立各自的 ClickClack 实时连接，并使用相应的机器人令牌。

```json5
{
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://clickclack.example.com",
      defaultAccount: "service",
      accounts: {
        service: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_SERVICE_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "channel:general",
          agentId: "service-bot",
        },
        support: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_SUPPORT_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "dm:usr_...",
          agentId: "support-bot",
        },
      },
    },
  },
}
```

## 会话讨论

在一个 ClickClack 账户上启用讨论，为每个 OpenClaw 会话提供一个专用的 ClickClack 频道。账户令牌必须包含
`channels:write`（`bot:admin` 捆绑包已包含它）；普通的 `bot:write`
设置令牌无法创建或同步频道。

```json5
{
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://clickclack.example.com",
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      discussions: {
        enabled: true,
        workspace: "default",
        controlUrlBase: "https://team.openclaw.ai",
        section: "Sessions",
      },
    },
  },
}
```

`discussions.workspace` 接受与账户级别 `workspace` 相同的工作区 id、slug 或显示名称，并默认为该值。`section` 控制 ClickClack 侧边栏分区，默认为 `Sessions`。设置 `controlUrlBase` 时，受管理频道会回链到规范的
[Control UI 会话路径](/web/urls#session-and-dashboard-urls)。

仅在一个 ClickClack 账户上启用讨论。gateway provider 没有账户选择器，因此如果启用了多个讨论账户，会被拒绝，而不是按配置顺序选择其中一个。

打开讨论会创建一个公开的 ClickClack 频道，并标记为外部管理。插件会同步会话标签、分类和归档状态。恢复会话会恢复其频道；清除会话分类会将频道移回配置的默认分区。删除一个
OpenClaw 会话时，会归档 ClickClack 频道而不是删除它，因此其历史仍可访问。插件在使用讨论 RPC 时以及在存在任何绑定时大约每分钟进行一次绑定协调。

受管频道中的入站消息会在与附加主会话相同的 agent id 下使用一个确定性的侧会话。侧 agent 会被告知要观察哪个主会话，并且可以使用 `sessions_history` 和 `session_status`
（`changesSince` 对增量检查很有用）。只有当讨论中的人要求它转达或引导主会话时，它才会使用 `sessions_send`。
绑定、受管所有权引用以及侧会话对等身份都包含具体的 OpenClaw 会话 id，以及固定的 ClickClack 服务器和频道。重置可复用会话 key 或重新指向账户会撤销本地旧频道；如果旧凭据仍可用，则会将其归档，并且不能复用其侧边转录。通过已归档、已重置、已禁用或已重新指向的绑定到达的消息会被丢弃，而不会回退到账户的普通频道路由。已释放的绑定会留下持久的已撤销频道标记，因此延迟的实时事件仍会以 fail-closed 方式处理。远程所有权按 ClickClack 服务器和频道 id 进行键控，因此重命名本地账户不会把受管频道变成普通频道。

将 `tools.sessions.visibility` 保持在更安全的默认值 `tree`。插件仅在每个侧会话与其附加主会话之间安装一个主机作用域的授权，并加上一个阻止会话发现和跨会话目标的工具策略钩子。它只允许 `sessions_history`、`session_status` 和 `sessions_send` 作用于附加主会话，并防止 status 调用更改该会话的模型。这些工具仍必须存在于 agent 的有效工具允许列表中。系统提示只是指导；主机授权和钩子才是授权边界。

ClickClack 服务器必须在频道创建和更新时支持受管频道字段（`external_managed`、`external_ref`、`external_url` 和 `sidebar_section`），并在频道响应中返回它们。OpenClaw 会在持久化绑定前验证该契约。如果创建响应丢失，下一次打开会通过服务器强制的 `external_ref` 接管该频道，而不是再创建一个。在该结果尚未协调完成之前，挂起的预留会将原本未绑定的事件隔离到目标工作区中。粗粒度协调器会在同一会话仍然存活时接管该频道，或在重置后将其归档；如果没有创建远程频道，它会清除该预留。
该引用包含一个持久的、每个 OpenClaw 安装唯一的命名空间，以及会话 key、具体会话 id、ClickClack 目标和持久绑定代际的哈希。不同 gateway 不能接管彼此的频道，重置的会话不能继承旧的频道历史，账户或工作区往返也不能重新接管之前的频道。绑定还会固定到配置的 ClickClack 服务器 URL，并且在账户被重新指向时失效。更改或移除 `controlUrlBase` 会在下一次协调过程中更新或清除受管频道链接。更改 `discussions.workspace` 时，会先归档并释放旧绑定，然后才能在新的工作区中打开频道，前提是旧工作区凭据仍在配置中。如果令牌已替换为无法访问旧工作区的工作区作用域凭据，OpenClaw 会将旧频道记录为已撤销，并在不尝试替换令牌的情况下释放绑定；请从 ClickClack 中归档那个残留频道。

附加的主会话还会收到一个仅拉取的 `discussion` 工具。它将最新消息和最近的线程回复以每条消息一个已转义、带归属的记录形式读取出来，并且没有写入或生命周期副作用。频道根和线程查找有固定的请求预算；结果会明确警告：这种安全边界可能会遗漏一个更早的活动线程。

## 回复模式

- `replyMode: "agent"`（默认）通过正常的代理管道分发传入消息，包括会话记录和工具策略。
- `replyMode: "model"` 跳过代理管道，直接使用插件运行时的 `llm.complete` 进行机器人回复，可选地由 `model` 和 `systemPrompt` 进行塑形。所选提供方和模型拥有补全预算。

模型模式会针对已解析的机器人代理 ID 运行补全，这需要显式的
`plugins.entries.clickclack.llm.allowAgentIdOverride: true` 信任位：

```json5
{
  plugins: {
    entries: {
      clickclack: {
        llm: {
          allowAgentIdOverride: true,
        },
      },
    },
  },
}
```

如果你只使用默认的 `agent` 回复模式，就保持该信任位关闭；在那里并不需要它。

## 命令菜单

在网关启动时，每个已配置的账户都会将 OpenClaw 的原生命令发布到 ClickClack。它们会以机器人的 handle 作为标签显示在 composer 自动补全中。每次启动时，已发布的集合都会整体替换，包括在原生命令目录为空时清除过期的菜单。

命令菜单同步默认启用。要选择退出，请在账户上设置 `commandMenu: false`：

```json5
{
  channels: {
    clickclack: {
      enabled: true,
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      commandMenu: false,
    },
  },
}
```

该 token 需要 `commands:write`。当前 ClickClack 的 `bot:write` 和 `bot:admin` 套件包含该权限范围，也可以单独授予。创建于命令菜单引入之前的 token 可能需要添加该权限范围，或更换为新的 token。

同步尽力而为，并且每次网关启动时仅运行一次。缺少权限范围或网络失败会记录警告；较旧、没有该端点的 ClickClack 服务器会以调试级别记录。以上任何失败都不会阻止实时启动。在代理离线时，菜单仍然可用；当机器人离开 workspace 时，菜单会被移除。

此版本仅发布原生命令规范。别名以及 skill、plugin 或 custom-command 目录不会添加到菜单中。如果某个名称也注册为 HTTP 斜杠命令，ClickClack 会优先分发该注册；其他菜单命令则继续通过正常消息传递进行。

使用 `agent` 模式获取跨服务关联证据。对于其规范 `msg_<ulid>` 形式中的权威 ClickClack 消息 id，该通道会推导出确定性的 OpenClaw 运行 id `clickclack:<message-id>`。随后每次模型调用都会在诊断中显示为 `clickclack:<message-id>:model:<n>`；当该轮使用 ClawRouter 时，同一个 model-call id 会作为 `X-Request-ID` 发送。`model` 模式会绕过正常的 agent run/session 诊断，因此不适用于此证据路径。

当实时事件包含已验证的 `payload.correlation_id` 时，该通道会在权威消息获取和
生成的 ClickClack 回复请求上将其作为 `X-Correlation-ID` 传递。值使用 ClickClack 的安全
128 字符集（`A-Z`、`a-z`、`0-9`、`.`、`_`、`:` 和 `-`）；无效值
会被省略。这些关联只包含标识符，绝不包含消息正文、
提示词、补全内容、凭据或工具输出。

## 持久化媒体传输

包含媒体的代理回复使用所需的持久化传输。OpenClaw 会在第一次 ClickClack 写入之前，为每个部分分配稳定的消息和上传随机数，因此重试时会复用相同的上传和消息，而不是消耗存储配额或发布重复内容。如果重启后上传已存在，OpenClaw 不会重新读取原始本地路径或远程媒体 URL。

此恢复契约要求 ClickClack 服务器支持：

- `GET /api/uploads/by-nonce`，并在找到和未找到结果时都返回
  `X-ClickClack-Upload-Nonce: supported`。
- `GET /api/messages/by-nonce`，并在找到和未找到结果时都返回
  `X-ClickClack-Message-Nonce: supported`。
- 对同一 owner 作用域的随机数和上传，消息创建与附件关联具有幂等性。

旧版服务器的通用 404 不被视为该发送不存在的证明。OpenClaw 会让传输保持未解决状态，而不是冒着重复发送的风险；在启用会产生媒体的代理回复之前，请先更新 ClickClack。

## Agent 活动行

默认情况下，当一个 agent 回合运行时，ClickClack 频道不会显示任何内容；只有最终回复会出现。将账户上的 `agentActivity` 设为 `true`，即可在回合进行中发布持久化的 `agent_commentary` 和 `agent_tool` 消息行：

```json5
{
  channels: {
    clickclack: {
      enabled: true,
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      agentActivity: true,
    },
  },
}
```

要求和行为：

- **默认关闭。** 现有配置和旧版 ClickClack 服务器不会受到影响。
- **需要 `agent_activity:write` 令牌范围。** 该范围独立于 `bot:write`，且不会从中继承；在启用该选项之前，请使用 `--scopes bot:write,agent_activity:write` 创建机器人令牌（或向现有令牌授予该范围）。
- **尽力降级。** 如果令牌缺少 `agent_activity:write`，或者服务器拒绝活动写入，会记录失败，但最终回复仍会正常送达；不会出现活动行。
- 行按每个回合（`turn_id`）分组，并进行合并，使一个逻辑步骤对应一行；工具行使用与 Discord/Slack/Telegram 相同的进度格式（工具名称加命令详情）。
- **归属元数据。** 由 agent 撰写的帖子（活动行和最终回复）会携带 `author_model` 和 `author_thinking` 字段，这些字段根据该回合实际使用的模型解析而来（包括回退后的情况）。未定义这些列的服务器会忽略未知的 JSON 字段；会持久化这些字段的服务器则可以按消息回答“这一行是谁用什么模型、在什么思考级别说的”。

## 群组提及门控

默认情况下，ClickClack 中的每条群组消息都会分发给同一工作区内所有已启用的 ClickClack 账户。此行为与旧版本兼容。为账户添加 `requireMention: true` 后，必须先直接提及该账户，代理管道才会运行。

实际生效的策略按以下顺序解析：

1. `groups` 中的精确频道条目（以 ClickClack 频道 ID 为键）。
2. `groups` 中的通配符 `"*"` 条目。
3. 账户级别的 `requireMention` / `mentionPatterns`。
4. 向后兼容的默认值（`{ requireMention: false, mentionPatterns: [] }`）。

私信永远不会受 `requireMention` 限制。收到私信时，会完全跳过提及检查。

### 提及检测

在以下情况下会检测到 ClickClack 提及：

- 消息正文匹配 `mentionPatterns` 中的任意模式（每个模式都是正则表达式）。
- 消息中包含机器人在 ClickClack 中的 `@handle`。网关会在启动时从已认证的机器人身份中读取该 handle。

普通显示名称（例如 `Blackbird`）**不会**被视为提及，除非将其明确配置为模式。

### 配置示例

```json5
{
  channels: {
    clickclack: {
      enabled: true,
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      requireMention: true,
      mentionPatterns: ["\\bBlackbird\\b"],
      groups: {
        "*": { requireMention: true },
        chn_command_and_control: { requireMention: false },
      },
    },
  },
}
```

同一工作区中的多个账户会分别评估同一条消息。`requireMention: true` 的账户会拒绝未提及的消息，而 `requireMention: false` 的账户仍可能处理该消息。

### 迁移警告

ClickClack 频道 ID（例如 `chn_...`）不会自动对应为 Discord 频道 ID。配置按频道规则时，必须使用实际的 ClickClack 频道标识符。除非 ClickClack 服务器明确将其存储为 `external_ref`，且适配器具有文档说明的转换层，否则不要复用 Discord ID。

仅添加 `requireMention: true` 而不同时限制 `allowFrom`，不会悄然改变群组消息现有的发送者允许列表行为；提及门控是在现有发送者策略之上增加的额外限制。

## 目标

- `channel:<name-or-id>` 发送到工作区频道。裸目标默认使用 `channel:`。
- `dm:<user_id>` 创建或重用与该用户的直接对话。
- `thread:<message_id>` 在该消息所在的线程中回复。

显式的出站目标也可以带有 `clickclack:` 或 `cc:` 提供商前缀。

出站媒体使用 ClickClack 的上传 API，然后将持久化上传附加到创建的频道消息、线程回复或 DM。本地文件和受支持的远程媒体 URL 遵循 OpenClaw 的常规媒体访问策略，单个文件上限为 64 MiB。持久化排队发送为每个上传和消息部分使用单独的所有者作用域 nonce，然后使用相同对象重试附件关联。有关服务器契约和恢复行为，请参阅 [持久化媒体传递](#durable-media-delivery)。

示例：

```bash
openclaw message send --channel clickclack --target channel:general --message "hello"
openclaw message send --channel clickclack --target dm:usr_123 --message "hello"
openclaw message send --channel clickclack --target thread:msg_123 --message "following up"
```

## 权限

ClickClack token 作用域由 ClickClack API 强制执行。

- `bot:read`：读取 workspace/channel/message/thread/DM/realtime/profile 数据。
- `bot:write`：包括 `bot:read`，以及 channel 消息、thread 回复、DM、上传和命令菜单发布。
- `bot:admin`：包括 `bot:write`，以及 channel 创建。
- `commands:write`：发布 bot 的命令菜单。已包含在当前的 `bot:write` 和 `bot:admin` 权限包中，也可单独授予。
- `agent_activity:write`：持久化 agent activity 行（`agent_commentary` / `agent_tool`）。不会被 `bot:write` 或 `bot:admin` 继承；仅在设置 `agentActivity: true` 时需要。

OpenClaw 仅需当前的 `bot:write` 即可用于正常的 agent 聊天和命令菜单同步。启用 [agent activity 行](#agent-activity-rows) 时，添加 `agent_activity:write`。

## 故障排查

- `ClickClack is not configured for account "<id>"`: 为该账户设置 `baseUrl`、`token`（例如通过 `CLICKCLACK_BOT_TOKEN`）和 `workspace`。
- `ClickClack workspace not found: <value>`：将 `workspace` 设置为 ClickClack 返回的工作区 id、slug 或名称。
- 没有传入回复：确认该 token 具有实时读取权限，并注意该 bot 会忽略自己的消息以及其他 bot 的消息。
- 频道发送失败：验证该 bot 是否是该工作区的成员，并且具有 `bot:write`。
- 没有命令菜单：确认 `commandMenu` 不是 `false`，ClickClack 服务器支持 `PUT /api/bots/self/commands`，并且该 token 具有 `commands:write`。
