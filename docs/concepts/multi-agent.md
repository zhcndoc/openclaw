---
summary: "多代理路由：隔离的代理、通道账户和绑定"
title: "多代理路由"
sidebarTitle: "多代理路由"
read_when: "你希望在一个网关进程中运行多个隔离的代理（工作区 + 认证）。"
status: active
---

在一个正在运行的 Gateway 中运行多个 _隔离的_ 代理——每个代理都有自己的工作区、状态目录（`agentDir`）和会话历史——以及多个通道账户（例如两个 WhatsApp）。入站消息会通过绑定路由到正确的代理。

这里的 **agent** 指的是完整的按角色范围：工作区文件、认证配置文件、模型注册表和会话存储。`agentDir` 是磁盘上的状态目录，用于保存这个按代理划分的配置，路径为 `~/.openclaw/agents/<agentId>/`。**binding** 会将一个通道账户（例如一个 Slack 工作区或一个 WhatsApp 号码）映射到这些代理中的某一个。

## 什么是“一个 agent”？

一个 **agent** 是一个完整范围的“脑”，它拥有自己的：

- **工作区**（文件、AGENTS.md/SOUL.md/USER.md、本地笔记、角色规则）。
- **状态目录**（`agentDir`），用于存放认证配置文件、模型注册表和按代理划分的配置。
- **会话存储**（聊天历史 + 路由状态），位于 `~/.openclaw/agents/<agentId>/sessions` 下。

认证配置文件是 **按 agent 分隔** 的。每个 agent 都从自己的位置读取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

<Note>
这里的 `sessions_history` 同样是更安全的跨会话回忆路径：它返回的是受限、已清理的视图，而不是原始转录内容的完整导出。助手回忆会在重定向/截断前去除 thinking 标签、`<relevant-memories>` 支架、纯文本工具调用 XML 负载（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截断的工具调用块）、降级的工具调用支架、泄露的 ASCII/全角模型控制标记，以及格式错误的 MiniMax 工具调用 XML。
</Note>

<Warning>
绝不要在多个 agent 之间复用 `agentDir`（这会导致认证/会话冲突）。当本地没有配置文件时，agents 可以读取默认/主 agent 的认证配置文件，但 OpenClaw 不会把 OAuth 刷新令牌克隆到次级 agent 存储中。如果你想要一个独立的 OAuth 账户，请从该 agent 中登录；如果你手动复制凭据，请只复制可移植的静态 `api_key` 或 `token` 配置文件。
</Warning>

技能会从每个 agent 的工作区以及共享根目录（例如 `~/.openclaw/skills`）加载，然后在配置了有效 agent 技能白名单时，按其进行过滤。使用 `agents.defaults.skills` 作为共享基础，使用 `agents.list[].skills` 进行每个 agent 的替换。参见 [Skills: per-agent vs shared](/tools/skills#per-agent-vs-shared-skills) 和 [Skills: agent skill allowlists](/tools/skills#agent-skill-allowlists)。

Gateway 可以托管 **一个 agent**（默认）或 **多个 agent** 并排运行。

<Note>
**工作区说明：** 每个 agent 的工作区都是**默认 cwd**，而不是硬性沙箱。相对路径会在工作区内解析，但只要未启用沙箱，绝对路径仍可访问其他主机位置。参见 [Sandboxing](/gateway/sandboxing)。
</Note>

## 路径（快速映射）

- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 状态目录：`~/.openclaw`（或 `OPENCLAW_STATE_DIR`）
- 工作区：`~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- Agent 目录：`~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 会话：`~/.openclaw/agents/<agentId>/sessions`

### 单 agent 模式（默认）

如果你什么都不做，OpenClaw 会运行一个单独的 agent：

- `agentId` 默认是 **`main`**。
- 会话键为 `agent:main:<mainKey>`。
- 工作区默认是 `~/.openclaw/workspace`（或者在设置了 `OPENCLAW_PROFILE` 时为 `~/.openclaw/workspace-<profile>`）。
- 状态默认是 `~/.openclaw/agents/main/agent`。

## Agent 助手

使用 agent 向导添加一个新的隔离 agent：

```bash
openclaw agents add work
```

然后添加 `bindings`（或者让向导来做）以路由入站消息。

使用以下命令验证：

```bash
openclaw agents list --bindings
```

## 快速开始

<Steps>
  <Step title="创建每个 agent 工作区">
    使用向导或手动创建工作区：

    ```bash
    openclaw agents add coding
    openclaw agents add social
    ```

    每个 agent 都会获得自己的工作区，其中包含 `SOUL.md`、`AGENTS.md` 和可选的 `USER.md`，以及位于 `~/.openclaw/agents/<agentId>` 下的专用 `agentDir` 和会话存储。

  </Step>
  <Step title="创建通道账户">
    在你偏好的通道上为每个 agent 创建一个账户：

    - Discord：每个 agent 一个 bot，启用 Message Content Intent，复制每个 token。
    - Telegram：通过 BotFather 为每个 agent 创建一个 bot，复制每个 token。
    - WhatsApp：为每个账户关联一个电话号码。

    ```bash
    openclaw channels login --channel whatsapp --account work
    ```

    参见通道指南：[Discord](/channels/discord)、[Telegram](/channels/telegram)、[WhatsApp](/channels/whatsapp)。

  </Step>
  <Step title="添加 agents、账户和 bindings">
    在 `agents.list` 下添加 agents，在 `channels.<channel>.accounts` 下添加通道账户，并使用 `bindings` 将它们连接起来（示例见下文）。
  </Step>
  <Step title="重启并验证">
    ```bash
    openclaw gateway restart
    openclaw agents list --bindings
    openclaw channels status --probe
    ```
  </Step>
</Steps>

## 多个 agents = 多个人，多个角色

使用 **多个 agents** 时，每个 `agentId` 都会成为一个**完全隔离的角色**：

- **不同的电话号码/账户**（按通道 `accountId` 区分）。
- **不同的角色**（每个 agent 的工作区文件，如 `AGENTS.md` 和 `SOUL.md`）。
- **独立的认证 + 会话**（除非显式启用，否则不会交叉通信）。

这使得**多个人**可以共享一台 Gateway 服务器，同时保持他们各自的 AI“脑袋”和数据隔离。

## 跨 agent 的 QMD 内存搜索

如果一个 agent 应该搜索另一个 agent 的 QMD 会话转录，请在 `agents.list[].memorySearch.qmd.extraCollections` 下添加额外集合。仅当每个 agent 都应继承相同的共享转录集合时，才使用 `agents.defaults.memorySearch.qmd.extraCollections`。

```json5
{
  agents: {
    defaults: {
      workspace: "~/workspaces/main",
      memorySearch: {
        qmd: {
          extraCollections: [{ path: "~/agents/family/sessions", name: "family-sessions" }],
        },
      },
    },
    list: [
      {
        id: "main",
        workspace: "~/workspaces/main",
        memorySearch: {
          qmd: {
            extraCollections: [{ path: "notes" }], // 在工作区内解析 -> 集合名为 "notes-main"
          },
        },
      },
      { id: "family", workspace: "~/workspaces/family" },
    ],
  },
  memory: {
    backend: "qmd",
    qmd: { includeDefaultMemory: false },
  },
}
```

额外集合的路径可以在多个 agent 之间共享，但当路径位于 agent 工作区之外时，集合名称仍会保持显式指定。工作区内的路径仍然是按 agent 作用域的，因此每个 agent 都保留自己的转录搜索集合。

## 一个 WhatsApp 号码，多个人（DM 拆分）

你可以在保持**同一个 WhatsApp 账户**的情况下，将**不同的 WhatsApp 私聊**路由到不同的 agent。按发送者的 E.164 号码（例如 `+15551234567`）并结合 `peer.kind: "direct"` 进行匹配。回复仍然会从同一个 WhatsApp 号码发出（不会有按 agent 区分的发送者身份）。

<Note>
直接聊天会折叠到 agent 的**主会话键**，因此真正的隔离需要**每个人一个 agent**。
</Note>

示例：

```json5
{
  agents: {
    list: [
      { id: "alex", workspace: "~/.openclaw/workspace-alex" },
      { id: "mia", workspace: "~/.openclaw/workspace-mia" },
    ],
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
  ],
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"],
    },
  },
}
```

注意：

- DM 访问控制是 **按 WhatsApp 账户全局生效** 的（配对/白名单），不是按 agent 生效。
- 对于共享群组，将群组绑定到一个 agent，或者使用 [Broadcast groups](/channels/broadcast-groups)。

## 路由规则（消息如何选择 agent）

bindings 是 **确定性的**，并且 **最具体的匹配优先**：

<Steps>
  <Step title="peer match">
    精确的 DM/群组/通道 id。
  </Step>
  <Step title="parentPeer match">
    线程继承。
  </Step>
  <Step title="guildId + roles">
    Discord 角色路由。
  </Step>
  <Step title="guildId">
    Discord。
  </Step>
  <Step title="teamId">
    Slack。
  </Step>
  <Step title="accountId match for a channel">
    按账户回退。
  </Step>
  <Step title="Channel-level match">
    `accountId: "*"`.
  </Step>
  <Step title="Default agent">
    回退到 `agents.list[].default`，否则使用列表中的第一项，默认：`main`。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="优先级规则与 AND 语义">
    - 如果多个 binding 在同一层级匹配，则按配置顺序中的第一个获胜。
    - 如果一个 binding 设置了多个匹配字段（例如 `peer` + `guildId`），则所有指定字段都必须满足（`AND` 语义）。

  </Accordion>
  <Accordion title="账户作用域细节">
    - 省略 `accountId` 的 binding 只匹配默认账户。
    - 使用 `accountId: "*"` 可作为覆盖所有账户的通道级回退。
    - 如果之后你为同一个 agent 添加了相同的 binding，并显式指定账户 id，OpenClaw 会将已有的仅通道 binding 升级为按账户作用域，而不会重复创建。

  </Accordion>
</AccordionGroup>

## 多个账户 / 电话号码

支持 **多个账户** 的通道（例如 WhatsApp）使用 `accountId` 来标识每次登录。每个 `accountId` 都可以路由到不同的 agent，因此一台服务器可以托管多个电话号码而不会混淆会话。

如果你希望在省略 `accountId` 时有一个通道级默认账户，请设置 `channels.<channel>.defaultAccount`（可选）。如果未设置，OpenClaw 会回退到 `default`（若存在），否则回退到第一个已配置的账户 id（按排序）。

支持这种模式的常见通道包括：

- `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`
- `irc`, `line`, `googlechat`, `mattermost`, `matrix`, `nextcloud-talk`
- `zalo`, `zalouser`, `nostr`, `feishu`

## 概念

- `agentId`：一个“脑”（工作区、按 agent 的认证、按 agent 的会话存储）。
- `accountId`：一个频道账号实例（例如 WhatsApp 账号 `"personal"` 与 `"biz"`）。
- `binding`：通过 `(channel, accountId, peer)` 将入站消息路由到某个 `agentId`，并可选地包含 guild/team id。
- 直接聊天会折叠为 `agent:<agentId>:<mainKey>`（按 agent 的“主键”；`session.mainKey`）。

## 平台示例

<AccordionGroup>
  <Accordion title="Discord bots per agent">
    每个 Discord bot 账号映射到唯一的 `accountId`。将每个账号绑定到一个 agent，并为每个 bot 保持 allowlist。

    ```json5
    {
      agents: {
        list: [
          { id: "main", workspace: "~/.openclaw/workspace-main" },
          { id: "coding", workspace: "~/.openclaw/workspace-coding" },
        ],
      },
      bindings: [
        { agentId: "main", match: { channel: "discord", accountId: "default" } },
        { agentId: "coding", match: { channel: "discord", accountId: "coding" } },
      ],
      channels: {
        discord: {
          groupPolicy: "allowlist",
          accounts: {
            default: {
              token: "DISCORD_BOT_TOKEN_MAIN",
              guilds: {
                "123456789012345678": {
                  channels: {
                    "222222222222222222": { allow: true, requireMention: false },
                  },
                },
              },
            },
            coding: {
              token: "DISCORD_BOT_TOKEN_CODING",
              guilds: {
                "123456789012345678": {
                  channels: {
                    "333333333333333333": { allow: true, requireMention: false },
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

    - 将每个 bot 邀请到 guild，并启用 Message Content Intent。
    - 令牌存放在 `channels.discord.accounts.<id>.token` 中（默认账号可以使用 `DISCORD_BOT_TOKEN`）。

  </Accordion>
  <Accordion title="Telegram bots per agent">
    ```json5
    {
      agents: {
        list: [
          { id: "main", workspace: "~/.openclaw/workspace-main" },
          { id: "alerts", workspace: "~/.openclaw/workspace-alerts" },
        ],
      },
      bindings: [
        { agentId: "main", match: { channel: "telegram", accountId: "default" } },
        { agentId: "alerts", match: { channel: "telegram", accountId: "alerts" } },
      ],
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
    - 令牌存放在 `channels.telegram.accounts.<id>.botToken` 中（默认账号可以使用 `TELEGRAM_BOT_TOKEN`）。

  </Accordion>
  <Accordion title="WhatsApp numbers per agent">
    在启动网关之前先链接每个账号：

    ```bash
    openclaw channels login --channel whatsapp --account personal
    openclaw channels login --channel whatsapp --account biz
    ```

    `~/.openclaw/openclaw.json`（JSON5）：

    ```js
    {
      agents: {
        list: [
          {
            id: "home",
            default: true,
            name: "Home",
            workspace: "~/.openclaw/workspace-home",
            agentDir: "~/.openclaw/agents/home/agent",
          },
          {
            id: "work",
            name: "Work",
            workspace: "~/.openclaw/workspace-work",
            agentDir: "~/.openclaw/agents/work/agent",
          },
        ],
      },

      // 确定性路由：第一个匹配项生效（最具体的规则优先）。
      bindings: [
        { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
        { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },

        // 可选的按 peer 覆盖（示例：将某个特定群组发送给 work agent）。
        {
          agentId: "work",
          match: {
            channel: "whatsapp",
            accountId: "personal",
            peer: { kind: "group", id: "1203630...@g.us" },
          },
        },
      ],

      // 默认关闭：agent-to-agent 消息必须显式启用 + allowlist。
      tools: {
        agentToAgent: {
          enabled: false,
          allow: ["home", "work"],
        },
      },

      channels: {
        whatsapp: {
          accounts: {
            personal: {
              // 可选覆盖。默认：~/.openclaw/credentials/whatsapp/personal
              // authDir: "~/.openclaw/credentials/whatsapp/personal",
            },
            biz: {
              // 可选覆盖。默认：~/.openclaw/credentials/whatsapp/biz
              // authDir: "~/.openclaw/credentials/whatsapp/biz",
            },
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## 常见模式

<Tabs>
  <Tab title="WhatsApp daily + Telegram deep work">
    按频道拆分：将 WhatsApp 路由到一个快速的日常 agent，将 Telegram 路由到一个 Opus agent。

    ```json5
    {
      agents: {
        list: [
          {
            id: "chat",
            name: "Everyday",
            workspace: "~/.openclaw/workspace-chat",
            model: "anthropic/claude-sonnet-4-6",
          },
          {
            id: "opus",
            name: "Deep Work",
            workspace: "~/.openclaw/workspace-opus",
            model: "anthropic/claude-opus-4-6",
          },
        ],
      },
      bindings: [
        { agentId: "chat", match: { channel: "whatsapp" } },
        { agentId: "opus", match: { channel: "telegram" } },
      ],
    }
    ```

    说明：

    - 如果你为某个频道有多个账号，请在 binding 中添加 `accountId`（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
    - 若要在其余消息仍走 chat 的情况下，将某个单独 DM/群组路由到 Opus，请为该 peer 添加 `match.peer` binding；peer 匹配始终优先于按频道的规则。

  </Tab>
  <Tab title="Same channel, one peer to Opus">
    保持 WhatsApp 使用快速 agent，但将一个 DM 路由到 Opus：

    ```json5
    {
      agents: {
        list: [
          {
            id: "chat",
            name: "Everyday",
            workspace: "~/.openclaw/workspace-chat",
            model: "anthropic/claude-sonnet-4-6",
          },
          {
            id: "opus",
            name: "Deep Work",
            workspace: "~/.openclaw/workspace-opus",
            model: "anthropic/claude-opus-4-6",
          },
        ],
      },
      bindings: [
        {
          agentId: "opus",
          match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551234567" } },
        },
        { agentId: "chat", match: { channel: "whatsapp" } },
      ],
    }
    ```

    peer binding 始终优先，所以请把它们放在按频道的规则之上。

  </Tab>
  <Tab title="Family agent bound to a WhatsApp group">
    将一个专用的家庭 agent 绑定到单个 WhatsApp 群组，并启用 mention gating 与更严格的工具策略：

    ```json5
    {
      agents: {
        list: [
          {
            id: "family",
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
        ],
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

    说明：

    - 工具 allow/deny 列表是 **tools**，不是 skills。如果某个 skill 需要运行二进制文件，请确保允许 `exec`，且该二进制文件存在于 sandbox 中。
    - 若要更严格的 gating，请设置 `agents.list[].groupChat.mentionPatterns`，并为该频道保持 group allowlists 已启用。

  </Tab>
</Tabs>

## 每个 agent 的 sandbox 和工具配置

每个 agent 都可以拥有自己的 sandbox 和工具限制：

```js
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: {
          mode: "off",  // personal agent 不使用 sandbox
        },
        // 没有工具限制 - 所有工具都可用
      },
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",     // 始终处于 sandbox 中
          scope: "agent",  // 每个 agent 一个容器
          docker: {
            // 容器创建后的一次性可选设置
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read"],                    // 仅允许 read 工具
          deny: ["exec", "write", "edit", "apply_patch"],    // 拒绝其他工具
        },
      },
    ],
  },
}
```

<Note>
`setupCommand` 位于 `sandbox.docker` 下，并在容器创建时运行一次。若解析后的 scope 为 `"shared"`，则会忽略每个 agent 的 `sandbox.docker.*` 覆盖项。
</Note>

**优点：**

- **安全隔离**：限制不受信任 agent 的工具。
- **资源控制**：对特定 agent 使用 sandbox，同时让其他 agent 继续在主机上运行。
- **灵活策略**：为不同 agent 提供不同权限。

<Note>
`tools.elevated` 是 **全局的** 且基于发送者；它不能按 agent 配置。如果你需要按 agent 划分边界，请使用 `agents.list[].tools` 来拒绝 `exec`。对于群组目标，请使用 `agents.list[].groupChat.mentionPatterns`，以便 @mention 能正确映射到预期的 agent。
</Note>

查看 [多 agent 的 sandbox 和 tools](/tools/multi-agent-sandbox-tools) 以获取详细示例。

## 相关内容

- [ACP agents](/tools/acp-agents) — 运行外部编码框架
- [Channel routing](/channels/channel-routing) — 消息如何路由到代理
- [Presence](/concepts/presence) — 代理在线状态和可用性
- [Session](/concepts/session) — 会话隔离和路由
- [Sub-agents](/tools/subagents) — 启动后台代理运行
