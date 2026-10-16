---
summary: "多代理路由：代理边界、通道账户和绑定"
title: "多智能体路由"
sidebarTitle: "多智能体路由"
read_when: "当你希望在一个 Gateway 进程中让多个代理拥有各自独立的工作区、认证和会话时。"
status: active
---

在一个网关进程中运行多个_isolated_代理，每个代理都有自己的工作区、状态目录 （`agentDir`） 和 SQLite- 支持的会话历史记录，以及多个通道帐户（e.g. 两个 WhatsApp 编号）。入站消息通过 **bindings** 路由到正确的代理。

**代理**是完整的按人格划分的作用域：工作区文件、认证配置文件、模型注册表和会话存储。**绑定**将一个通道账户（如一个 Slack 工作区、一个 WhatsApp 号码等）映射到这些代理中的某一个。

有关账户和对话示例的专门设置指南，请参阅[代理绑定](/concepts/agent-bindings)。

## <a id="what-is-one-agent"></a> 什么是一个 agent

每个 agent 都有自己的：

- **工作区**：文件、`AGENTS.md`/`SOUL.md`/`USER.md`、本地笔记、角色规则。
- **状态目录** (`agentDir`)：认证配置文件、模型注册表、每个 agent 的配置。
- **会话存储**：`<agentDir>/openclaw-agent.sqlite`中的聊天记录和路由状态。

身份验证配置文件是针对每个代理的，从 `<agentDir>/openclaw-agent.sqlite` 读取。使用默认布局，解析为：

```text
~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite
```

<Note>
`sessions_history` 提供有界跨会话调用，无需秘密屏蔽保留的文本。它剥离思维块签名、工具结果有效负载详细信息、`<relevant-memories>` 标记、工具调用 XML 标签（`<tool_call>`、`<function_call>` 及其 plural/downgraded 形式）和 MiniMax 工具调用 XML，然后按字节大小截断和限制输出。
</Note>

<Warning>
切勿跨代理重复使用 `agentDir` — 它会导致 auth/session 状态冲突。当辅助代理的本地 OAuth 凭证过期或刷新失败时，OpenClaw 会读取同一配置文件 ID 的身份验证继承所有者的凭证，并采用最新的令牌，而不将刷新令牌复制到辅助代理的存储中。如果您想要一个完全独立的 OAuth 帐户，请从该代理登录。如果您手动复制凭据，则仅复制可移植静态 `api_key` 或 `token` 配置文件 — 默认情况下，OAuth 刷新材料不可移植（`copyToAgents` 可以显式选择配置文件）。
</Warning>

技能会从每个 agent 的工作区以及诸如 `~/.openclaw/skills` 之类的共享根目录加载，然后再根据实际生效的 agent 技能允许列表进行过滤。共享基线请使用 `agents.defaults.skills`，而按 agent 的替换请使用 `agents.entries.*.skills`（显式条目会替换默认值，不会进行合并）。另请参见 [技能：按 agent 划分与共享](/tools/skills#per-agent-vs-shared-skills) 和 [技能：agent 允许列表](/tools/skills#agent-allowlists)。

插件拥有的存储遵循该插件自身的配置；添加第二个 agent 不会自动把所有全局插件存储拆分开。例如，当不同角色不能共享已编译的 wiki 知识时，请配置 [按 agent 划分的 Memory Wiki 保管库](/concepts/multi-agent#per-agent-memory-wiki-vaults)。

<Note>
**工作区说明：** 每个 agent 的工作区都是**默认 cwd**，而不是硬性沙箱。相对路径会在工作区内解析，但只要未启用沙箱，绝对路径仍可访问其他主机位置。参见 [沙箱](/gateway/sandboxing)。
</Note>

## <a id="paths"></a> 路径

| 什么                             | 默认值                                                                                | 覆盖项                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 配置                           | `~/.openclaw/openclaw.json`                                                            | `OPENCLAW_CONFIG_PATH`                                                                      |
| 状态目录                        | `~/.openclaw`                                                                          | `OPENCLAW_STATE_DIR`                                                                        |
| 默认代理的工作区        | `<stateDir>/workspace`（`~/.openclaw-<profile>/workspace` 用于命名配置文件）         | `agents.entries.*.workspace`，然后 `agents.defaults.workspace`，或 `OPENCLAW_WORKSPACE_DIR` |
| 其他 agent 的工作区          | `<stateDir>/workspace-<agentId>`（或在设置时为 `<agents.defaults.workspace>/<agentId>`） | `agents.entries.*.workspace`                                                                |
| agent 目录                        | `~/.openclaw/agents/<agentId>/agent`                                                   | `agents.entries.*.agentDir`                                                                 |
| 会话和转录         | `<agentDir>/openclaw-agent.sqlite`                                                     | `agents.entries.*.agentDir`                                                                 |
| Legacy/archive 会话工件 | `~/.openclaw/agents/<agentId>/sessions`                                                | —                                                                                           |

### <a id="single-agent-mode-(default)"></a><a id="single-agent-mode-default"></a> 单 agent 模式（默认）

如果你不进行任何配置，OpenClaw 会运行一个 agent：

- `agentId` 默认值为 `main`。
- 主会话密钥是 `agent:main:main`。
- Workspace 默认为 `<stateDir>/workspace`（默认安装为 `~/.openclaw/workspace`，命名配置文件为 `~/.openclaw-<profile>/workspace`）。
- 状态默认是 `~/.openclaw/agents/main/agent`。

## <a id="agent-helper"></a> 代理助手

添加一个新的隔离代理：

```bash
openclaw agents add work
```

标志：`--role <role>`、`--workspace <dir>`、`--model <id>`、`--agent-dir <dir>`、`--bind <channel[:accountId]>`（可重复）、`--non-interactive`（需要 `--workspace`，除非提供了角色）。

添加 `bindings` 以路由传入消息（向导会为你提供此操作），然后验证：

```bash
openclaw agents list --bindings
```

在Control UI中，`/agents`处的**Agents**显示花名册、当前工作状态和最近的聊天预览，其中**打开聊天**打开每个代理的主会话。使用**管理代理**配置`/settings/agents`的名册。

**设置 → 代理** 在网关发布新目录时更新模型选择。刷新选择会保留您选择的模型、后备和身份草稿。如果读取失败，编辑器会显示错误并保留之前的选择，直到稍后更新成功。模型和后备编辑保持其正常的自动保存行为。

### <a id="agent-provenance"></a> 代理出处

OpenClaw 记录每个已配置代理的创建方式： `operator` 用于 CLI、登录和网关请求； `agent` 当系统代理请求时；和 `claw` 当 Claw 安装添加它时。代理创建的条目还保留请求代理 ID。配置的代理可以要求 OpenClaw 通过其 `openclaw` 工具创建另一个代理。系统代理将键入的操作归档，向操作员显示请求的代理 ID，并仅在操作员批准后创建代理。使用以下命令检查当前的创建层次结构：

```bash
openclaw agents list --tree
```

已删除的创作者仍保留历史来源。如果创建者不再位于配置的名册中，则其子级将出现在树的根部。

## <a id="team-preset"></a> 团队预设

创建一个具有书面角色合同和定向授权的小团队：

```bash
openclaw agents team create --non-interactive
openclaw agent --agent coordinator --message "Research the options and draft a recommendation."
```

该预设创建了一名参谋长 （`coordinator`）、研究员、作家和审稿人，每个人都有自己的工作空间和完整的身份。参谋长仍然是人类的联络点：它发现匹配的专家，分配有限的工作，检查他们的工件，并报告一致的结果。专家将文物和证据返回给协调员，而无需进一步授权。它们的操作程序位于 `AGENTS.md` 中，因此它们也适用于不加载 `SOUL.md` 或 `IDENTITY.md` 的生成会话。

捆绑的角色是 [Claw 来源 ](/cli/claws)，共享可移植的 `CLAW.md` 身份格式、`SOUL.md` 主体和声明的工作区文件。 `agents add --role <role>` 加载这些源之一。启用 Claws 表面后，来自源检出的等效源路径为 `openclaw claws add docs/reference/templates/roles/<role>`；遵循 [Claw 预览和同意流程](/cli/claws#inspect-and-preview)。

您还可以从 Control UI 创建参谋长或整个团队：在侧边栏或特工主页中选择 **新特工**，然后在托管人聊天中选择角色或小团队推荐。创建使用相同的角色模板并等待您的批准。

相关的每个代理委托片段是：

```json5 validate=false
{
  agents: {
    entries: {
      coordinator: {
        subagents: {
          allowAgents: ["researcher", "writer", "reviewer"],
          delegationMode: "prefer",
        },
      },
      researcher: { subagents: { allowAgents: [] } },
      writer: { subagents: { allowAgents: [] } },
      reviewer: { subagents: { allowAgents: [] } },
    },
  },
}
```

`"prefer"` 指导协调员委派合适的工作；它是及时的指导，而不是调度程序。 `allowAgents` 控制显式生成目标。该预设使 `agents.defaults.subagents` 和 `tools.*` 保持不变，因此现有工具可用性和访问策略仍然适用。角色指令在外部发送、发布、购买、删除或生产更改之前需要人工批准。这些委派设置仍然是配置中的团队接线。一旦单独的爪形轮廓支持落地，爪子的角色将承载它们。

协调员是一个明确的目标。仅当所有者未设置时，团队创建才会将 `agents.defaults.systemAgent.agentId` 设置为协调员；现有所有者被保留并报告。在显式队列中，这还指定支持默认代理选择的操作的默认值。显式目标和 [ 路由绑定 ](/concepts/agent-bindings) 优先。

使用 `--prefix <p>` 命名所有团队 ID，使用 `--coordinator <id>` 重命名协调器，使用 `--workspace-root <dir>` 选择单独工作区的父目录。在创建之前会检查所有 id 是否存在冲突。请参阅 [`agents team create`](/cli/agents#agents-team-create) 了解标志和示例，或在 [onboarding](/start/wizard#choose-one-agent-or-a-team) 期间使用团队选择。

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="create-each-agent-workspace" title="创建每个代理工作区">
    ```bash
    openclaw agents add coding
    openclaw agents add social
    ```

    每个代理都有自己的工作区，包括 `SOUL.md`、`AGENTS.md` 和可选的 `USER.md`，以及专用的 `agentDir` 和会话存储。默认情况下，这些代理文件位于 `~/.openclaw/agents/<agentId>` 下。

  </Step>
  <Step id="create-channel-accounts" title="创建频道帐户">
    在你偏好的通道上为每个智能体创建一个账户：

    - Discord：每个智能体一个 bot，启用 Message Content Intent，复制每个 token。
    - Telegram：通过 BotFather 为每个智能体创建一个 bot，复制每个 token。
    - WhatsApp：为每个账户关联一个电话号码。

    ```bash
    openclaw channels login --channel whatsapp --account work
    ```

    参见通道指南：[Discord](/channels/discord)、[Telegram](/channels/telegram)、[WhatsApp](/channels/whatsapp)。

  </Step>
  <Step id="add-agents%2C-accounts%2C-and-bindings" title="添加代理、帐户和绑定">
    在 `agents.entries` 下添加智能体，在 `channels.<channel>.accounts` 下添加通道账户，并使用 `bindings` 将它们连接起来（示例见下文）。
  </Step>
  <Step id="restart-and-verify" title="重启并验证">
    ```bash
    openclaw gateway restart
    openclaw agents list --bindings
    openclaw channels status --probe
    ```
  </Step>
</Steps>

## <a id="multiple-agents%2C-multiple-personas"></a><a id="multiple-agents-multiple-personas"></a> 多个代理，多个角色

每个配置的 `agentId` 都是核心代理状态的独立角色边界：

- 每个频道使用不同的账户（通过 `accountId` 区分）。
- 不同的个性（通过代理的 `AGENTS.md`/`SOUL.md` 区分）。
- 独立的身份验证和会话，默认情况下启用跨代理会话访问并受 `tools.agentToAgent` 管理。使用 `tools.sessions.visibility` 缩小会话可见性，使用 `tools.agentToAgent.allow` 限制代理对，或设置 `tools.agentToAgent.enabled: false` 以阻止普通的跨代理访问。请求者拥有的本机子代理和 ACP 子会话在 `tree` 或 `all` 可见性下保持可达；使用单独的网关进行严格隔离。

这使得多个人可以共享一个 Gateway，同时保持彼此独立的核心代理状态。

## <a id="per-agent-memory-wiki-vaults"></a> 每个代理的 Memory Wiki 保管库

Memory Wiki 默认使用一个全局保管库。为了将支持代理的编译知识与营销代理的知识分开，请将 `plugins.entries.memory-wiki.config.vault.scope` 设置为 `agent`：

```json5
{
  plugins: {
    entries: {
      "memory-wiki": {
        enabled: true,
        config: {
          vault: {
            scope: "agent",
            path: "~/.openclaw/wiki",
          },
        },
      },
    },
  },
}
```

配置的路径是父目录。 OpenClaw 附加标准化代理 ID，生成 `~/.openclaw/wiki/support` 和 `~/.openclaw/wiki/marketing` 等路径。配置多个代理时，代理范围的 CLI 和网关操作需要显式代理。有关网桥过滤、迁移和信任边界的详细信息，请参阅 [Memory Wiki per-agentVaults](/plugins/memory-wiki#per-agent-vaults)。

## <a id="cross-agent-memory-search"></a> 跨代理记忆搜索

QMD 跨代理搜索路径与 QMD 后端的其余部分一起在 v2026.8.1 中被删除。内置内存不会搜索另一个代理的转录语料库；每个代理仅搜索其自己配置的内存和合格的同一代理会话源。当多个代理应索引相同的参考资料时，将有意共享的 Markdown 放入显式共享的 `memory.search.extraPaths` 目录中。有关完整升级路径，请参阅 [ 从 QMD](/concepts/memory-builtin#migrating-from-qmd) 迁移。

## <a id="one-whatsapp-number%2C-multiple-people-(dm-split)"></a><a id="one-whatsapp-number-multiple-people-dm-split"></a> 一个 WhatsApp 号码，多个人（DM 拆分）

通过将发件人 E.164 （`+15551234567`） 与 `peer.kind: "direct"` 匹配，将不同的 WhatsApp DM 路由到 **one** WhatsApp 帐户上的不同代理。回复仍然来自相同的 WhatsApp 号码 - 没有每个代理的发件人身份。

<Note>
直接聊天默认会折叠到代理的主会话键，因此要实现真正隔离，每个人都需要一个代理。
</Note>

```json5
{
  agents: {
    ownership: "explicit",
    defaults: {
      authInheritance: { agentId: "alex" },
      heartbeat: { agentId: "alex" },
      systemAgent: { agentId: "alex" },
    },
    entries: {
      alex: { workspace: "~/.openclaw/workspace-alex" },
      mia: { workspace: "~/.openclaw/workspace-mia" },
    },
  },
  bindings: [
    {
      agentId: "alex",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230001" } },
    },
    {
      agentId: "mia",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230002" } },
    },
    { agentId: "alex", match: { channel: "whatsapp", accountId: "*" } },
  ],
  talk: { agentId: "alex" },
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"],
    },
  },
}
```

DM 访问控制 （pairing/allowlist） 对于每个 WhatsApp 帐户是全局的，而不是每个代理。对于共享组，将该组绑定到一个座席或使用 [ 广播组](/channels/broadcast-groups)。

## <a id="routing-rules"></a> 路由规则

绑定遵循固定顺序，最具体的匹配获胜。请参阅 [ 频道路由 ](/channels/channel-routing#routing-rules-how-an-agent-is-chosen) 了解完整层顺序（精确对等、父对等、对等通配符、行会+角色、行会、团队、账户、频道、后备所有者）。这里有一些值得一提的规则：

- 如果同一层级中有多个绑定匹配，则配置顺序中的第一个生效。
- 如果配置了多个代理且没有显式所有者，则不会将与任何绑定匹配的消息提供给任意第一个列出的代理。配置的 `agents.defaults.systemAgent.agentId`、保留的旧所有者或调用者提供的所有者仍会捕获未绑定的流量；仅当没有绑定匹配且不存在此类后备所有者时，消息才会保持未发送状态。保留入站消息以供重试的通道（例如 Telegram）可以在绑定为该帐户提供所有者后稍后传送该消息，但不保证传送。可重试的消息一旦达到尝试限制和最短期限（默认为 24​​ 小时），就会成为死信，并且像 Telegram 这样的通道可以在启动时拒绝无主帐户，因此重新绑定仅在消息仍在排队且帐户正在运行时才传送消息。
- 如果某个绑定设置了多个匹配字段（例如 `peer` + `guildId`），则所有指定字段都必须匹配（`AND` 语义）。
- 省略 `accountId` 的 A 绑定仅匹配默认帐户，而不是每个帐户。使用 `accountId: "*"` 进行通道范围的回退，或使用 `accountId: "<name>"` 进行一个账户。使用显式帐户 ID 再次添加相同的绑定会升级现有的仅通道绑定，而不是重复它。

对于现有的多代理配置，`openclaw doctor --fix` 将传统环境默认路由具体化为通道范围的绑定，并在需要时加上显式心跳、托管人、Talk 和身份验证继承所有者。它还从单代理配置中删除了已停用的默认标记；独家代理仍然隐式解决。运行时准入需要当前名册格式，因此在启动带有旧标记的直接替换二进制文件之前运行 Doctor。正常的更新流程运行候选Doctor。

对于直接在主配置文件中定义的没有旧版 `default: true` 标记的多代理名册，Doctor 为键控 `agents.entries` 和较旧的 `agents.list` 名册（包括 `--fix --non-interactive`）添加了 `agents.ownership: "explicit"`。现有的绑定和每个表面的所有者保持不变。最后已知的良好恢复在验证和恢复直接创作的无标记名册之前应用相同的所有权标记。 Doctor从不提倡将更窄的对话绑定到帐户范围的所有权。它不会从其他帐户或渠道借用所有权，不会在冲突的所有者之间进行选择，也不会分配其他无主表面。

在旧版 `agents.list` 迁移期间，未绑定帐户将其历史第一代理后备保留为显式帐户绑定，包括当较窄的对话路由指定其他代理时。医生将装订记录与所有权印章一起记录。更新通道迁移和手动Doctor都需要原始名册；如果不可用，Doctor 会报告原因并保持绑定不变。所有者仍未解决的帐户会报告所需的绑定并保持锁定状态，而不会尝试自动重新启动；其他帐户和网关继续提供服务。

在迁移没有默认标记的旧版 `agents.list` 名册时，Doctor 还会将第一个代理的继承工作区固定到 `agents.entries.<id>.workspace`。其定制说明和历史 `memory/` 注释保留在其原始目录中。显式工作空间保持权威。如果早期升级已留下两个已编辑的工作区，请选择预期的每个代理工作区并从备份中协调其内容； Doctor 不合并目录。

## <a id="multiple-accounts-%2F-phone-numbers"></a><a id="multiple-accounts-/-phone-numbers"></a> 多个账户 / 电话号码

支持多账户的通道（e.g. WhatsApp）使用`accountId`来识别每次登录。每个 `accountId` 都会路由到自己的代理，因此一台服务器可以托管多个电话号码，而无需混合会话。

设置 `channels.<channel>.defaultAccount` 可在省略 `accountId` 时选择要使用的账户。如果未设置，OpenClaw 会先回退到 `default`（如果存在），否则会使用第一个已配置的账户 id（按排序顺序）。

支持多账户的通道：`discord`、`feishu`、`googlechat`、`imessage`、`irc`、`line`、`mattermost`、`matrix`、`msteams`、 `nextcloud-talk`、`nostr`、`signal`、`slack`、`telegram`、`whatsapp`、`zalo`、`zalouser`。

## <a id="concepts"></a> 概念

- `agentId`：一个“脑袋”（工作区、每个 agent 的认证、每个 agent 的会话存储）。
- `accountId`：一个通道账户实例（e.g. WhatsApp 账户 `personal` 与 `biz`）。
- `binding`：通过 `(channel, accountId, peer)` 和可选的 guild/team id 将入站消息路由到 `agentId`。
- 默认情况下，直接聊天折叠为 `agent:<agentId>:main`（每个代理 [ 主会话 ](/concepts/main-session)）。

## <a id="platform-examples"></a> 平台示例

这些示例明确选择渠道和服务所有者。通道绑定路由消息； `systemAgent`、`heartbeat` 和 `talk.agentId` 选择自己的所有者。当前任所有者不是 `main` 时，`authInheritance.agentId` 独立于通道路由保留共享凭证源。

<AccordionGroup>
  <Accordion id="discord-bots-per-agent" title="每个代理的 Discord 机器人">
    每个 Discord bot 账号映射到唯一的 `accountId`。将每个账号绑定到一个 agent，并为每个 bot 保持 allowlist。

    ```json5
    {
      agents: {
        ownership: "explicit",
        defaults: {
          heartbeat: { agentId: "main" },
          systemAgent: { agentId: "main" },
        },
        entries: {
          main: { workspace: "~/.openclaw/workspace-main" },
          coding: { workspace: "~/.openclaw/workspace-coding" },
        },
      },
      bindings: [
        { agentId: "main", match: { channel: "discord", accountId: "default" } },
        { agentId: "coding", match: { channel: "discord", accountId: "coding" } },
        { agentId: "main", match: { channel: "discord", accountId: "*" } },
      ],
      talk: { agentId: "main" },
      channels: {
        discord: {
          groupPolicy: "allowlist",
          accounts: {
            default: {
              token: "DISCORD_BOT_TOKEN_MAIN",
              guilds: {
                "123456789012345678": {
                  channels: {
                    "222222222222222222": { enabled: true, requireMention: false },
                  },
                },
              },
            },
            coding: {
              token: "DISCORD_BOT_TOKEN_CODING",
              guilds: {
                "123456789012345678": {
                  channels: {
                    "333333333333333333": { enabled: true, requireMention: false },
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

    - 将每个 bot 邀请到 guild，并启用消息内容 Intent。
    - 令牌存放在 `channels.discord.accounts.<id>.token` 中（默认账号可以使用 `DISCORD_BOT_TOKEN`）。

  </Accordion>
  <Accordion id="telegram-bots-per-agent" title="每个代理的 Telegram 机器人">
    ```json5
    {
      agents: {
        ownership: "explicit",
        defaults: {
          heartbeat: { agentId: "main" },
          systemAgent: { agentId: "main" },
        },
        entries: {
          main: { workspace: "~/.openclaw/workspace-main" },
          alerts: { workspace: "~/.openclaw/workspace-alerts" },
        },
      },
      bindings: [
        { agentId: "main", match: { channel: "telegram", accountId: "default" } },
        { agentId: "alerts", match: { channel: "telegram", accountId: "alerts" } },
        { agentId: "main", match: { channel: "telegram", accountId: "*" } },
      ],
      talk: { agentId: "main" },
      channels: {
        telegram: {
          accounts: {
            default: {
              botToken: "123456:ABC...",
              dmPolicy: "pairing",
            },
            alerts: {
              botToken: "987654:XYZ...",
              dmPolicy: "allowlist",
              allowFrom: ["tg:123456789"],
            },
          },
        },
      },
    }
    ```

    - 使用 BotFather 为每个 agent 创建一个 bot，并复制每个 token。
    - Token 存放在 `channels.telegram.accounts.<id>.botToken` 中（默认账号可以使用 `TELEGRAM_BOT_TOKEN`）。
    - 对于同一个 Telegram 群组中的多个 bot，邀请每个 bot，并提及应该响应的那个。
    - 为每个群组 bot 关闭 BotFather Privacy Mode（`/setprivacy` -> Disable），然后移除并重新添加该 bot，以便 Telegram 应用该设置。
    - 使用 `channels.telegram.groups` 允许群组，或者仅在受信任的群组部署中使用 `groupPolicy: "open"`。
    - 将发送者用户ID放入`groupAllowFrom`中。组和超组 ID 属于 `channels.telegram.groups`，而不是 `groupAllowFrom`。
    - 按 `accountId` 进行绑定，以便每个 bot 路由到自己的 agent。

  </Accordion>
  <Accordion id="whatsapp-numbers-per-agent" title="WhatsApp 每个代理的号码">
    在启动网关之前先链接每个账号：

    ```bash
    openclaw channels login --channel whatsapp --account personal
    openclaw channels login --channel whatsapp --account biz
    ```

    `~/.openclaw/openclaw.json` (JSON5):

    ```json5
    {
      agents: {
        ownership: "explicit",
        defaults: {
          authInheritance: { agentId: "home" },
          heartbeat: { agentId: "home" },
          systemAgent: { agentId: "home" },
        },
        entries: {
          home: {
            name: "Home",
            workspace: "~/.openclaw/workspace-home",
            agentDir: "~/.openclaw/agents/home/agent",
          },
          work: {
            name: "Work",
            workspace: "~/.openclaw/workspace-work",
            agentDir: "~/.openclaw/agents/work/agent",
          },
        },
      },

      // Fixed routing order: first match wins (most-specific first).
      bindings: [
        { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
        { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },

        // Optional per-peer override (example: send a specific group to work agent).
        {
          agentId: "work",
          match: {
            channel: "whatsapp",
            accountId: "personal",
            peer: { kind: "group", id: "1203630...@g.us" },
          },
        },
        { agentId: "home", match: { channel: "whatsapp", accountId: "*" } },
      ],
      talk: { agentId: "home" },

      // On by default. Omitted/empty `allow` permits every agent pair;
      // list requester and target ids to restrict access, or set enabled: false to turn it off.
      tools: {
        agentToAgent: {
          allow: ["home", "work"],
        },
      },

      channels: {
        whatsapp: {
          accounts: {
            personal: {
              // Optional override. Default: ~/.openclaw/credentials/whatsapp/personal
              // authDir: "~/.openclaw/credentials/whatsapp/personal",
            },
            biz: {
              // Optional override. Default: ~/.openclaw/credentials/whatsapp/biz
              // authDir: "~/.openclaw/credentials/whatsapp/biz",
            },
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## <a id="common-patterns"></a> 常见模式

<Tabs>
  <Tab id="whatsapp-daily-%2B-telegram-deep-work" title="WhatsApp日常+Telegram深度工作">
    按频道拆分：将 WhatsApp 路由到一个快速的日常 agent，将 Telegram 路由到一个 Opus agent。

    ```json5
    {
      agents: {
        ownership: "explicit",
        defaults: {
          authInheritance: { agentId: "chat" },
          heartbeat: { agentId: "chat" },
          systemAgent: { agentId: "chat" },
        },
        entries: {
          chat: {
            name: "Everyday",
            workspace: "~/.openclaw/workspace-chat",
            model: "anthropic/claude-sonnet-4-6",
          },
          opus: {
            name: "Deep Work",
            workspace: "~/.openclaw/workspace-opus",
            model: "anthropic/claude-opus-4-6",
          },
        },
      },
      bindings: [
        { agentId: "chat", match: { channel: "whatsapp", accountId: "*" } },
        { agentId: "opus", match: { channel: "telegram", accountId: "*" } },
      ],
      talk: { agentId: "chat" },
    }
    ```

    这些示例使用 `accountId: "*"`，因此如果您稍后添加帐户，绑定仍然有效。要将单个 DM/group 路由到 Opus，同时保持其余部分继续聊天，请为该对等点添加 `match.peer` 绑定 - 对等匹配始终胜过通道范围规则。

  </Tab>
  <Tab id="same-channel%2C-one-peer-to-opus" title="同一通道，一位对等到 Opus">
    保持 WhatsApp 使用快速 agent，但将一个 DM 路由到 Opus：

    ```json5
    {
      agents: {
        ownership: "explicit",
        defaults: {
          authInheritance: { agentId: "chat" },
          heartbeat: { agentId: "chat" },
          systemAgent: { agentId: "chat" },
        },
        entries: {
          chat: {
            name: "Everyday",
            workspace: "~/.openclaw/workspace-chat",
            model: "anthropic/claude-sonnet-4-6",
          },
          opus: {
            name: "Deep Work",
            workspace: "~/.openclaw/workspace-opus",
            model: "anthropic/claude-opus-4-6",
          },
        },
      },
      bindings: [
        {
          agentId: "opus",
          match: { channel: "whatsapp", accountId: "*", peer: { kind: "direct", id: "+15551234567" } },
        },
        { agentId: "chat", match: { channel: "whatsapp", accountId: "*" } },
      ],
      talk: { agentId: "chat" },
    }
    ```

    peer 绑定始终优先，所以请把它们放在按频道的规则之上。

  </Tab>
  <Tab id="family-agent-bound-to-a-whatsapp-group" title="家庭代理绑定WhatsApp群组">
    将一个专用的家庭 agent 绑定到单个 WhatsApp 群组，并启用 mention gating 与更严格的工具策略：

    ```json5
    {
      agents: {
        entries: {
          family: {
            name: "Family",
            workspace: "~/.openclaw/workspace-family",
            identity: { name: "Family Bot" },
            groupChat: {
              mentionPatterns: ["@family", "@familybot", "@Family Bot"],
            },
            sandbox: {
              mode: "all",
              scope: "agent",
            },
            tools: {
              allow: [
                "exec",
                "read",
                "sessions_list",
                "sessions_history",
                "sessions_send",
                "sessions_spawn",
                "session_status",
              ],
              deny: ["write", "edit", "apply_patch", "browser", "canvas", "nodes", "cron"],
            },
          },
        },
      },
      bindings: [
        {
          agentId: "family",
          match: {
            channel: "whatsapp",
            peer: { kind: "group", id: "120363999999999999@g.us" },
          },
        },
      ],
    }
    ```

    工具allow/deny列出的是**tools**，而不是技能。如果技能需要运行二进制文件，请检查是否允许 `exec` 以及沙箱中存在该二进制文件。要进行更严格的控制，请设置 `agents.entries.*.groupChat.mentionPatterns` 并保持为通道启用组允许列表。

  </Tab>
</Tabs>

## <a id="per-agent-sandbox-and-tool-configuration"></a> 每个 agent 的沙箱和工具配置

每个 agent 都可以拥有自己的沙箱和工具限制：

```json5
{
  agents: {
    ownership: "explicit",
    defaults: {
      authInheritance: { agentId: "personal" },
      heartbeat: { agentId: "personal" },
      systemAgent: { agentId: "personal" },
    },
    entries: {
      personal: {
        workspace: "~/.openclaw/workspace-personal",
        sandbox: {
          mode: "off", // No sandbox for personal agent
        },
        // No tool restrictions - all tools available
      },
      family: {
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all", // Always sandboxed
          scope: "agent", // One container per agent
          docker: {
            // Optional one-time setup after container creation
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read"], // Only read tool
          deny: ["exec", "write", "edit", "apply_patch"], // Deny others
        },
      },
    },
  },
  talk: { agentId: "personal" },
}
```

<Note>
`setupCommand` 位于 `sandbox.docker` 下，并在容器创建时运行一次。当解析范围为 `"shared"` 时，将忽略每个代理的 `sandbox.docker.*` 覆盖。
</Note>

这带来以下优势：

- **安全隔离**：限制不受信任 agent 的工具。
- **资源控制**：对特定 agent 使用沙箱，同时让其他 agent 继续在主机上运行。
- **灵活策略**：为不同 agent 提供不同权限。

<Note>
`tools.elevated` 具有全局门 （`tools.elevated.enabled`/`allowFrom`） 和每代理门 （`agents.entries.*.tools.elevated.enabled`/`allowFrom`）。每个代理的门只能进一步限制全局的门——两者都必须允许提升命令的发送者运行。对于组定位，请使用 `agents.entries.*.groupChat.mentionPatterns`，以便 @mentions 清晰地映射到预期代理。
</Note>

查看 [多 agent 的沙箱和工具](/tools/multi-agent-sandbox-tools) 以获取详细示例。

## <a id="related"></a> 相关内容

- [ACP 代理](/tools/acp-agents) — 运行外部编码框架
- [通道路由](/channels/channel-routing) — 消息如何路由到代理
- [并行专业通道](/concepts/parallel-specialist-lanes) — 将一项工作分配给角色范围的代理
- [在线状态](/concepts/presence) — 代理在线状态和可用性
- [会话](/concepts/session) — 会话隔离和路由
- [子代理](/tools/subagents) — 启动后台代理运行。
- [`openclaw agents`](/cli/agents) — 从 CLI 创建和检查代理
