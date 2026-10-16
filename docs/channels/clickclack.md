---
summary: "ClickClack 机器人令牌频道设置和目标语法"
read_when:
  - "连接 OpenClaw 到 ClickClack 工作区"
  - "测试 ClickClack bot 身份"
title: "ClickClack"
---

ClickClack 通过一等公民的 ClickClack bot token 将 OpenClaw 连接到一个自托管的 ClickClack 工作区。

当你希望 OpenClaw agent 以 ClickClack bot 用户的身份出现时，请使用此功能。ClickClack 支持独立的服务 bot 和用户所有的 bot；用户所有的 bot 会保留 `owner_user_id`，并且只接收你授予的 token 作用域。

## <a id="quick-setup"></a> 快速设置

在 ClickClack 中，打开 **工作区设置 → 集成 → OpenClaw**，使用 **设置代码（推荐）** 创建一个机器人，并复制生成的命令：

```bash
openclaw channels add clickclack --code 'https://clickclack.example.com/#XXXX-XXXX-XXXX'
```

对于前端和 API 源不同，或者 API 挂载在某个路径下的情况，ClickClack 会改为输出一个精确的声明端点：

```bash
openclaw channels add clickclack --code 'https://api.example.com/services/clickclack/api/bot-setup-codes/claim#XXXX-XXXX-XXXX'
```

设置代码是一次性的，并在 10 分钟后过期。 OpenClaw 声明它，接收新创建的机器人令牌和工作区设置，保存帐户，验证连接，并报告正在运行的网关是否拾取它。对于版本化的精确端点，OpenClaw 验证并保存 ClickClack 返回的 API 基础，包括任何路径前缀。设置代码本身不存储在 OpenClaw 配置中。

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

### <a id="alternative%3A-manual-token"></a><a id="alternative-manual-token"></a> 其他方式：手动令牌

在配置非 OpenClaw 客户端时，或当你明确需要自行管理令牌时，在 ClickClack 中选择 **手动令牌**：

```bash
openclaw channels add clickclack --base-url https://clickclack.example.com --token ccb_... --workspace default
```

`workspace` 接受工作区 id（`wsp_...`）、slug 或显示名称。 `--code` 不能与 `--token`、`--token-file` 或 `--use-env` 组合使用。

### <a id="alternative%3A-env-based-token"></a><a id="alternative-env-based-token"></a> 其他方式：基于环境变量的令牌

默认账号可以读取 `CLICKCLACK_BOT_TOKEN`，而不是将令牌存储在配置中：

```bash
export CLICKCLACK_BOT_TOKEN="ccb_..."
openclaw channels add clickclack --base-url https://clickclack.example.com --workspace default --use-env
openclaw gateway
```

命名账号必须使用已配置的令牌或令牌文件；共享环境变量刻意仅限于默认账号。

## <a id="configuration"></a> 配置

### <a id="json5-reference"></a> JSON5 参考

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

### <a id="account-config-keys"></a> 账号配置键

| 键                          | 默认值             | 笔记                                                                                                                 |
| ---------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`                    | 无（必需）     | 用于面向浏览器的链接的公共 ClickClack URL。                                                                  |
| `apiBaseUrl`                 | `baseUrl`           | 可选的服务器到服务器端点，用于 REST 和实时 WebSocket 流量。                                           |
| `token`                      | 无                | 以纯字符串或机密引用形式提供的机器人令牌（`source: "env" \| "file" \| "exec" \| "store"`）。                           |
| `tokenFile`                  | 无                | 机器人令牌文件的路径；优先于 `token`。                                                              |
| `workspace`                  | 无（必需）     | 工作区 id、slug 或名称。                                                                                          |
| `replyMode`                  | `"agent"`           | `"agent"` 运行完整的代理流水线；`"model"` 发送简短的直接模型补全。                               |
| `defaultTo`                  | `"channel:general"` | 当出站路径未提供目标时使用的目标。                                                                    |
| `allowFrom`                  | `["*"]`             | 入站私信和频道消息的用户 id 允许列表。                                                               |
| `allowBots`                  | `false`             | 接受由其他 ClickClack 机器人发送的消息：对所有允许的机器人消息使用 `true`，或仅在群组中使用 `"mentions"`。 |
| `botLoopProtection`          | 内置默认值   | 应用于已接受机器人消息的滑动窗口机器人对循环保护。                                                  |
| `botUserId`                  | 自动检测       | 启动时根据机器人令牌身份解析。                                                                      |
| `agentId`                    | 路由默认值       | 将此账号的入站消息固定到一个代理。                                                                     |
| `toolsAllow`                 | 无                | 此账号代理回复的工具允许列表。                                                                   |
| `model`, `systemPrompt`      | 无                | 用于 `replyMode: "model"` 补全。                                                                             |
| `commandMenu`                | `true`              | 将原生命令发布到 ClickClack 编辑器的自动补全中。                                                          |
| `reconnectMs`                | `1500`              | 实时连接重连延迟（100 至 60000）。                                                                              |
| `discussions`                | 已禁用            | 按会话管理的频道设置；请参阅[会话讨论](#session-discussions)。                                |
| `requireMention`             | `false`             | 要求直接提及后才分派群组消息。请参阅[群组提及门控](#group-mention-gating)。        |
| `requireMentionInBotThreads` | 未设置               | 覆盖此帐户机器人启动的线程中的提及门控。请参阅 [Bot 创建的线程](#bot-created-threads)。    |
| `mentionPatterns`            | `[]`                | 此账号在群组频道中的提及模式。请参阅[群组提及门控](#group-mention-gating)。               |
| `groups`                     | `{}`                | 每通道组策略覆盖由 ClickClack 通道 ID 设置的密钥。请参阅 [ 组提及门控 ](#group-mention-gating)。 |

### <a id="keep-an-auth-gated-public-hostname"></a> 保持一个受身份验证保护的公共主机名

当 ClickClack 和 OpenClaw 网关运行在同一主机上，但公共的 ClickClack 主机名受某个身份验证网关保护时，例如 Cloudflare Access，请使用 `apiBaseUrl`：

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

公共主机名可以继续完全对浏览器用户启用身份验证门控。OpenClaw 会对 REST 请求、设置验证以及实时 WebSocket 使用回环端点，而讨论中的 `embedUrl` 和 `openUrl` 链接仍然使用公共的 `baseUrl`。如果省略 `apiBaseUrl`，所有流量都会使用 `baseUrl`，从而保留现有行为。

### <a id="plugin-allowlist-behavior"></a> 插件白名单行为

如果 `plugins.allow` 是一个非空的限制性列表，那么在频道设置中显式选择 ClickClack，或运行 `openclaw plugins enable clickclack`，都会将 `clickclack` 追加到该列表中。引导式设置安装使用相同的显式选择行为。这些路径不会覆盖 `plugins.deny` 或全局的 `plugins.enabled: false` 设置。直接执行 `openclaw plugins install @openclaw/clickclack` 会遵循正常的插件安装策略，并且也会将 ClickClack 记录到现有的允许列表中。

## <a id="multiple-bots"></a> 多个机器人

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

## <a id="session-discussions"></a> 会话讨论

在一个 ClickClack 账户上启用讨论，为每个 OpenClaw 会话提供一个专用的 ClickClack 频道。账户令牌必须包含 `channels:write`（`bot:admin` 捆绑包已包含它）；普通的 `bot:write` 设置令牌无法创建或同步频道。

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

`discussions.workspace` 接受与帐户级别 `workspace` 相同的工作区 ID、slug 或显示名称，并默认为该值。 `section` 控制 ClickClack 侧边栏部分，默认为 `Sessions`。设置 `controlUrlBase` 时，受管通道链接回 [Control UI 会话路径 ](/web/urls#session-and-dashboard-urls)。

仅在一个 ClickClack 账户上启用讨论。gateway provider 没有账户选择器，因此如果启用了多个讨论账户，会被拒绝，而不是按配置顺序选择其中一个。

打开讨论会创建一个标记为外部管理的公共 ClickClack 频道。该插件使会话标签和类别保持同步，但通道生命周期保持独立。清除会话类别会将通道移回到配置的默认部分。存档、重置或删除 OpenClaw 会话永远不会存档或替换 ClickClack 通道。 ClickClack拥有独立的通道存档和恢复功能。当使用讨论 RPC 时，该插件会协调绑定，并且在存在任何绑定时大约每分钟一次。

托管通道中的入站消息使用侧会话，该侧会话具有与附加主会话相同的代理 ID 下的稳定密钥。侧代理被告知要观察哪个主会话，并且可以使用 `sessions_history` 和 `session_status`（`changesSince` 对于增量检查很有用）。仅当讨论中的人员要求它中继或引导主要会话时，它才使用 `sessions_send`。绑定将耐用的房间标识与其可更换的会话附件分开。侧面会话对等身份和范围授权包括确切的具体 OpenClaw 会话 ID，因此重置可重用会话密钥会轮换附件，并且无法重用旧的侧面记录。 ClickClack 通道 ID、URL、历史记录和所有权参考保持不变。通过非活动、禁用或重定向附件到达的邮件将被丢弃，而不是退回到帐户的正常通道路由。已发布的绑定会留下持久的撤销通道标记，因此延迟的实时事件仍会被拒绝。远程所有权由 ClickClack 服务器和频道 ID 指定，因此重命名本地帐户无法将托管频道变成普通频道。

对于较窄的会话访问，请显式将 `tools.sessions.visibility` 设置为 `tree`，而不是默认的 `all`。该插件仅在每个侧会话及其附加的主会话之间安装主机范围的授权，以及阻止会话发现和跨会话目标的工具策略挂钩。它仅允许 `sessions_history`、`session_status` 和 `sessions_send` 用于附加的主会话，并防止状态调用更改该会话的模型。这些工具必须仍然存在于代理的有​​效工具白名单中。系统提示为引导；主机 grant 和 hook 是授权边界。

ClickClack 服务器必须支持通道创建和更新时的托管通道字段（`external_managed`、`external_ref`、`external_url` 和 `sidebar_section`），并在通道响应中返回它们。 OpenClaw 在保留绑定之前验证该合约。如果创建响应丢失，则下一次打开将采用服务器强制执行的 `external_ref` 通道，而不是创建另一个通道。在该结果得到协调之前，挂起的预留会隔离目标工作区中原本未绑定的事件。当逻辑会话处于活动状态时，包括在其具体会话ID改变之后，粗协调器采用该通道；当没有创建远程通道时，它会清除预留。该引用包含持久的每个 OpenClaw- 安装命名空间以及会话密钥的哈希值、ClickClack 目标和持久绑定生成。单独的网关不能采用彼此的通道，而具体会话重置则保持相同的通道。帐户或工作区往返不能重新采用以前的通道。绑定也会固定到配置的 ClickClack 服务器 URL，并且如果帐户被重定向，则绑定会失效。更改或删除 `controlUrlBase` 会在下一次调节过程中更新或清除托管通道链接。更改 `discussions.workspace` 会释放旧附件，然后才能在新工作区中打开通道。它从不存档旧房间。如果令牌被替换为无法访问旧工作区的工作区范围凭证，OpenClaw 会将旧通道记录为已撤销并释放绑定，而无需尝试替换令牌。

附加的主会话还会收到一个仅拉取的 `discussion` 工具。它将最新消息和最近的线程回复以每条消息一个已转义、带归属的记录形式读取出来，并且没有写入或生命周期副作用。频道根和线程查找有固定的请求预算；结果会明确警告：这种安全边界可能会遗漏一个更早的活动线程。

## <a id="reply-modes"></a> 回复模式

- `replyMode: "agent"`（默认）通过正常的代理管道分发传入消息，包括会话记录和工具策略。
- `replyMode: "model"` 跳过代理管道，直接使用插件运行时的 `llm.complete` 进行机器人回复，可选地由 `model` 和 `systemPrompt` 进行塑形。所选提供方和模型拥有补全预算。

两种模式都在渠道或帐户级别遵循 `responsePrefix`。帐户值获胜，包括 `""` 以禁用继承的前缀。使用 `"auto"` 作为路由代理的身份名称，或使用 `"[{model}]"` 作为所选模型。显式 `message` 工具和 CLI 文本发送遵循 [ 共享前缀行为 ](/concepts/messages#prefixes-threading-and-replies)，包括省略未解析的模型相关前缀。

模型模式针对已解析的机器人代理 ID 运行补全，这需要显式 `plugins.entries.clickclack.llm.allowAgentIdOverride: true` 信任位：

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

## <a id="command-menu"></a> 命令菜单

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

使用`agent`模式进行跨服务关联证据。对于所需 `msg_<ulid>` 格式的权威 ClickClack 消息 ID，通道会派生匹配的 OpenClaw 运行 ID `clickclack:<message-id>`。每个模型调用在诊断中都可见为 `clickclack:<message-id>:model:<n>`；当该回合使用 ClawRouter 时，相同的模型调用 ID 将作为 `X-Request-ID` 发送。 `model` 模式绕过正常代理 run/session 诊断，因此不适合此证据路径。

当实时事件包含已验证的 `payload.correlation_id` 时，该通道会在权威消息获取和生成的 ClickClack 回复请求上将其作为 `X-Correlation-ID` 传递。值使用 ClickClack 的安全 128 字符集（`A-Z`、`a-z`、`0-9`、`.`、`_`、`:` 和 `-`）；无效值会被省略。这些关联只包含标识符，绝不包含消息正文、 提示词、补全内容、凭据或工具输出。

## <a id="durable-media-delivery"></a> 持久化媒体传输

包含媒体的代理回复使用所需的持久化传输。OpenClaw 会在第一次 ClickClack 写入之前，为每个部分分配稳定的消息和上传随机数，因此重试时会复用相同的上传和消息，而不是消耗存储配额或发布重复内容。如果重启后上传已存在，OpenClaw 不会重新读取原始本地路径或远程媒体 URL。

此恢复契约要求 ClickClack 服务器支持：

- `GET /api/uploads/by-nonce`，并在找到和未找到结果时都返回 `X-ClickClack-Upload-Nonce: supported`。
- `GET /api/messages/by-nonce`，并在找到和未找到结果时都返回 `X-ClickClack-Message-Nonce: supported`。
- 使用相同所有者范围的随机数重试并上传时不会创建重复项的消息创建和附件关联。

旧版服务器的通用 404 不被视为该发送不存在的证明。OpenClaw 会让传输保持未解决状态，而不是冒着重复发送的风险；在启用会产生媒体的代理回复之前，请先更新 ClickClack。

## <a id="native-progress-and-agent-activity-rows"></a> 原生进度和代理活动行

本机进度是每个帐户选择加入的。设置 `nativeProgress: true` 以在代理轮流运行时显示瞬时 `<agent name> is responding` 状态和进度线。代理名称来自配置的帐户名称、ClickClack 机器人句柄或代理 ID。这些使用短暂的 `agent.progress` 事件，并在回合结束时清除；只有最后的答复才是持久的。单独设置 `agentActivity: true` 以在回合进行时发布持久的 `agent_commentary` 和 `agent_tool` 消息行：

```json5
{
  channels: {
    clickclack: {
      enabled: true,
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      nativeProgress: true,
      agentActivity: true,
    },
  },
}
```

要求和行为：

- **原生进度默认关闭。** 仅对支持临时实时端点的 ClickClack 部署设置 `nativeProgress: true`。
- **持久化活动默认单独关闭。** 设置 `agentActivity: true` 可持久化活动行；这不会自动启用原生进度。
- **原生进度采用尽力而为策略。** 进度发布使用临时实时端点和有界请求超时。失败或停滞的进度请求会被记录，并且不会阻塞最终文本的传递。
- **Durable 活动需要 `agent_activity:write` 代币范围。** 该范围与 `bot:write` 分开，不由其继承；在启用 `agentActivity` 之前，使用 `--scopes bot:write,agent_activity:write` 创建机器人令牌。
- **尽力而为的降级处理。** 如果令牌缺少 `agent_activity:write`，或服务器拒绝活动写入，失败会被记录，最终回复仍会正常传递；不会出现活动行。
- 行会按回合（`turn_id`）分组，并进行合并，使一个逻辑步骤对应一行；工具行使用与 Discord/Slack/Telegram 相同的进度格式（工具名称加命令详情）。
- **归属元数据。** 代理发布的内容（活动行和最终回复）会携带 `author_model` 和 `author_thinking` 字段，这些字段根据该回合实际使用的模型解析得出（包括发生回退之后）。未定义这些列的服务器会忽略未知的 JSON 字段；持久化这些字段的服务器则可以针对每条消息回答“这行内容由哪个模型、以哪个思考级别生成”。

## <a id="group-mention-gating"></a> 群组提及门控

默认情况下，ClickClack 中的每条群组消息都会分发给同一工作区内所有已启用的 ClickClack 账户。此行为与旧版本兼容。为账户添加 `requireMention: true` 后，必须先直接提及该账户，代理管道才会运行。

每个组策略字段按以下顺序解析：

1. `groups` 中的精确频道条目（以 ClickClack 频道 ID 为键）。
2. `groups` 中的通配符 `"*"` 条目。
3. 账户级值，省略时继承顶级ClickClack值。
4. 向后兼容的默认值（`{ requireMention: false, mentionPatterns: [] }`）。

DM 永远不会被 `requireMention` 门控。当 DM 到达时，提及门将被完全跳过。

### <a id="bot-created-threads"></a> Bot 创建的线程

设置 `requireMentionInBotThreads: false` 让人们回复而不在其启动的线程中提及机器人，同时保留 `requireMention: true` 用于其他频道消息。您可以在账户级别或在精确通道或通配符 `groups` 条目中设置此选项，使用与上述相同的优先级。

OpenClaw 仅当验证本机线程的根消息是由同一工作区和通道中的接收帐户的机器人编写时才应用此覆盖。由其他人启动的线程或其根无法验证的线程将保持普通的 `requireMention` 行为。参与线程并不会使机器人成为其创建者。

即使 `requireMention` 是 `false`，设置 `requireMentionInBotThreads: true` 也需要在这些线程中提及。省略该选项将保留现有的提及策略。 DM、发件人访问规则和 `allowBots` 限制不变； `allowBots: "mentions"` 仍需要另一个机器人提及。

### <a id="mention-detection"></a> 提及检测

在以下情况下会检测到 ClickClack 提及：

- 消息正文匹配 `mentionPatterns` 中的任意模式（每个模式都是正则表达式）。
- 消息中包含机器人在 ClickClack 中的 `@handle`。网关会在启动时从已认证的机器人身份中读取该 handle。

普通显示名称 （e.g. `Blackbird`） 是 **，而不是**，除非它们被显式配置为模式，否则被视为提及。

### <a id="bot-to-bot-messages"></a> 机器人对机器人消息

ClickClack 默认忽略由机器人发送的消息。要选择加入，请在账户上设置 `allowBots: true`。设置 `allowBots: "mentions"` 后，仅当群组频道中的机器人消息提及此机器人时，才会接收这些消息；私信仍然无需提及即可处理。机器人消息仍会经过 `allowFrom`，但机器人作者必须通过 ID 明确列出；通配符 `allowFrom: ["*"]` 默认不会授权由机器人发送的消息。通配符仍可用于人类用户的消息。 机器人自己发送的消息始终会被忽略。

已接受的机器人消息还会经过 OpenClaw 共享的机器人配对循环防护机制。 可在账户上使用 `botLoopProtection`，或使用 `channels.defaults.botLoopProtection`，来调整其时间窗口、预算、冷却时间或启用状态。群组级别的 `allowBots` 和 `botLoopProtection` 值，与其他群组策略一样，遵循精确频道、通配符、账户级别的优先级顺序。顶层频道消息共享一个频道预算，而不同 ClickClack 线程中的回复则使用相互独立的线程根预算。

ClickClack 的 `agent_commentary` 和 `agent_tool` 活动行永远不会触发 OpenClaw 入站轮次，即使其作者机器人已被明确允许。

较旧的 ClickClack 响应可能省略 `author.kind`。这些消息会有意继续使用旧版的 `allowFrom` 路径：`allowFrom: ["*"]` 可以接收它们，而机器人专属的 `allowBots` 和机器人配对循环防护检查不会生效，因为服务器没有对作者进行分类。 因此，机器人专属限制要求 ClickClack 服务器响应中包含作者分类信息。

### <a id="configuration-example"></a> 配置示例

```json5
{
  channels: {
    clickclack: {
      enabled: true,
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      requireMention: true,
      requireMentionInBotThreads: false,
      mentionPatterns: ["\\bBlackbird\\b"],
      allowBots: "mentions",
      allowFrom: ["usr_trusted_bot"],
      botLoopProtection: { maxEventsPerWindow: 12, windowSeconds: 60 },
      groups: {
        "*": { requireMention: true, allowBots: "mentions" },
        chn_command_and_control: { requireMention: false },
      },
    },
  },
}
```

同一工作区中的多个帐户使用每个帐户的已解析提及策略和机器人身份独立评估同一消息。

### <a id="migration-warning"></a> 迁移警告

ClickClack 通道 ID （e.g. `chn_...`） 不会自动成为 Discord 通道 ID。配置每通道规则需要实际的 ClickClack 通道标识符。不要重复使用 Discord ID，除非 ClickClack 服务器将它们显式存储为 `external_ref` 并且适配器具有记录的转换层。

仅添加 `requireMention: true` 而不同时限制 `allowFrom`，不会悄然改变群组消息现有的发送者允许列表行为；提及门控是在现有发送者策略之上增加的额外限制。

## <a id="targets"></a> 目标

- `channel:<name-or-id>` 发送到工作区频道。裸目标默认使用 `channel:`。
- `dm:<user_id>` 创建或重用与该用户的直接对话。
- `thread:<message_id>` 在该消息所在的线程中回复。

显式的出站目标也可以带有 `clickclack:` 或 `cc:` 提供商前缀。

出站媒体使用 ClickClack 的上传 API，然后将持久上传附加到创建的通道消息、线程回复或 DM。本地文件和支持的远程媒体 URL 遵循 OpenClaw 的正常媒体访问策略。设置`channels.clickclack.mediaMaxMb`来限制MiB中的每个出站附件； `accounts.<id>.mediaMaxMb` 覆盖根，然后 `agents.defaults.mediaMaxMb` 提供后备。 64 MiB 上传上限始终适用。图像可以在发送前进行优化。持久排队发送对每个上传和消息部分使用单独的所有者范围的随机数，然后重试与这些相同对象的附件关联。有关服务器合同和恢复行为，请参阅 [ 持久介质传送](#durable-media-delivery)。

示例：

```bash
openclaw message send --channel clickclack --target channel:general --message "hello"
openclaw message send --channel clickclack --target dm:usr_123 --message "hello"
openclaw message send --channel clickclack --target thread:msg_123 --message "following up"
```

## <a id="permissions"></a> 权限

ClickClack 令牌的作用域由 ClickClack API 强制执行。

- `bot:read`：读取workspace/channel/message/thread/DM/realtime/profile数据。
- `bot:write`：包括 `bot:read`，以及频道消息、线程回复、私信、上传和命令菜单发布。
- `bot:admin`：包括 `bot:write`，以及频道创建。
- `commands:write`：发布 bot 的命令菜单。已包含在当前的 `bot:write` 和 `bot:admin` 权限包中，也可单独授予。
- `agent_activity:write`：持久化 agent activity 行（`agent_commentary` / `agent_tool`）。不会被 `bot:write` 或 `bot:admin` 继承；仅在设置 `agentActivity: true` 时需要。

OpenClaw 在正常的 agent 聊天和命令菜单同步中只需要当前的 `bot:write`。启用[原生进度和 agent activity 行](#native-progress-and-agent-activity-rows)时，请添加 `agent_activity:write`。

## <a id="troubleshooting"></a> 故障排查

- `ClickClack is not configured for account "<id>"`：为该账户设置 `baseUrl`、`token`（例如通过 `CLICKCLACK_BOT_TOKEN`）和 `workspace`。
- `ClickClack workspace not found: <value>`：将 `workspace` 设置为 ClickClack 返回的工作区 id、slug 或名称。
- 没有收到入站回复：确认令牌具有实时读取权限。机器人始终会忽略自己的消息；默认情况下会拒绝其他机器人的消息，而启用 `allowBots` 后，发送方机器人的 ID 还必须在 `allowFrom` 中明确列出。
- 发送到频道失败：确认机器人是该工作区的成员，并具有 `bot:write` 权限。
- 没有命令菜单：确认 `commandMenu` 不为 `false`，ClickClack 服务器支持 `PUT /api/bots/self/commands`，并且令牌具有 `commands:write` 权限。

## <a id="related"></a> 相关内容

- [配对](/channels/pairing)
- [群组](/channels/groups)
- [Bot循环保护](/channels/bot-loop-protection)
- [访问组](/channels/access-groups)
