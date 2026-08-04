---
summary: "多代理路由：代理边界、通道账户和绑定"
title: "多代理路由"
sidebarTitle: "多代理路由"
read_when: "当你希望在一个 Gateway 进程中让多个代理拥有各自独立的工作区、认证和会话时。"
status: active
---

在一个 Gateway 进程中运行多个_隔离的_代理，每个代理都有自己的工作区、状态目录（`agentDir`）和基于 SQLite 的会话历史，以及多个通道账户（例如两个 WhatsApp 号码）。传入消息通过**绑定**路由到正确的代理。

**代理**是完整的按人格划分的作用域：工作区文件、认证配置文件、模型注册表和会话存储。**绑定**将一个通道账户（如一个 Slack 工作区、一个 WhatsApp 号码等）映射到这些代理中的某一个。

有关账户和对话示例的专门设置指南，请参阅[代理绑定](/concepts/agent-bindings)。

## 什么是一个 agent

每个 agent 都有自己的：

- **工作区**：文件、`AGENTS.md`/`SOUL.md`/`USER.md`、本地笔记、角色规则。
- **状态目录** (`agentDir`)：认证配置文件、模型注册表、每个 agent 的配置。
- **会话存储**：聊天历史和路由状态，位于 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`。

认证配置文件是按 agent 分开的，读取自：

```text
~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite
```

<Note>
`sessions_history` 是更安全的跨会话回忆路径：它返回的是一个有边界、已去敏的视图，而不是原始转录的完整转储。它会去除 thinking-block 签名、工具结果载荷细节、`<relevant-memories>` 脚手架、工具调用 XML 标签（`<tool_call>`、`<function_call>` 及其复数/降级形式），以及 MiniMax 工具调用 XML，然后按字节大小对输出进行截断和上限控制。
</Note>

<Warning>
切勿在不同 agent 之间复用 `agentDir` —— 这会导致认证/会话状态冲突。当某个次级 agent 的本地 OAuth 凭据过期或刷新失败时，OpenClaw 会回读同一 profile id 的默认/主 agent 凭据，并采用最新的那个 token，而不会把 refresh token 复制到次级 agent 的存储中。如果你想要一个完全独立的 OAuth 账号，请在那个 agent 里重新登录。如果你手动复制凭据，只复制可移植的静态 `api_key` 或 `token` 配置文件即可——OAuth 刷新材料默认不可移植（`copyToAgents` 可以显式将某个 profile 纳入）。
</Warning>

技能会从每个 agent 的工作区以及诸如 `~/.openclaw/skills` 之类的共享根目录加载，然后再根据实际生效的 agent 技能允许列表进行过滤。共享基线请使用 `agents.defaults.skills`，而按 agent 的替换请使用 `agents.entries.*.skills`（显式条目会替换默认值，不会进行合并）。另请参见 [技能：按 agent 划分与共享](/tools/skills#per-agent-vs-shared-skills) 和 [技能：agent 允许列表](/tools/skills#agent-allowlists)。

插件拥有的存储遵循该插件自身的配置；添加第二个 agent 不会自动把所有全局插件存储拆分开。例如，当不同角色不能共享已编译的 wiki 知识时，请配置 [按 agent 划分的 Memory Wiki 保管库](/concepts/multi-agent#per-agent-memory-wiki-vaults)。

<Note>
**工作区说明：** 每个 agent 的工作区都是**默认 cwd**，而不是硬性沙箱。相对路径会在工作区内解析，但只要未启用沙箱，绝对路径仍可访问其他主机位置。参见 [沙箱](/gateway/sandboxing)。
</Note>

## 路径

| 什么                             | 默认值                                                                                 | 覆盖项                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 配置                           | `~/.openclaw/openclaw.json`                                                            | `OPENCLAW_CONFIG_PATH`                                                                      |
| 状态目录                        | `~/.openclaw`                                                                          | `OPENCLAW_STATE_DIR`                                                                        |
| 默认 agent 的工作区        | `~/.openclaw/workspace`（或在设置了 `OPENCLAW_PROFILE` 时为 `workspace-<profile>`）      | `agents.entries.*.workspace`，然后是 `agents.defaults.workspace`，或 `OPENCLAW_WORKSPACE_DIR` |
| 其他 agent 的工作区          | `<stateDir>/workspace-<agentId>`（或在设置时为 `<agents.defaults.workspace>/<agentId>`） | `agents.entries.*.workspace`                                                                |
| agent 目录                        | `~/.openclaw/agents/<agentId>/agent`                                                   | `agents.entries.*.agentDir`                                                                 |
| 会话和转录         | `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`                             | —                                                                                           |
| 旧版/归档会话产物 | `~/.openclaw/agents/<agentId>/sessions`                                                | —                                                                                           |

### 单 agent 模式（默认）

如果你不进行任何配置，OpenClaw 会运行一个 agent：

- `agentId` 默认值为 `main`。
- 会话键为 `agent:main:<mainKey>`（`mainKey` 的默认值为 `main`）。
- 工作区默认是 `~/.openclaw/workspace`（如果 `OPENCLAW_PROFILE` 设置为 `default` 之外的其他值，则为 `workspace-<profile>`）。
- 状态默认是 `~/.openclaw/agents/main/agent`。

## 代理助手

添加一个新的隔离代理：

```bash
openclaw agents add work
```

标志：`--workspace <dir>`、`--model <id>`、`--agent-dir <dir>`、`--bind <channel[:accountId]>`（可重复）、`--non-interactive`（需要 `--workspace`）。

添加 `bindings` 以路由传入消息（向导会为你提供此操作），然后验证：

```bash
openclaw agents list --bindings
```

## 快速开始

<Steps>
  <Step title="创建每个智能体工作区">
    ```bash
    openclaw agents add coding
    openclaw agents add social
    ```

    每个智能体都会获得自己的工作区，其中包含 `SOUL.md`、`AGENTS.md` 和可选的 `USER.md`，以及位于 `~/.openclaw/agents/<agentId>` 下的专用 `agentDir` 和会话存储。

  </Step>
  <Step title="创建通道账户">
    在你偏好的通道上为每个智能体创建一个账户：

    - Discord：每个智能体一个 bot，启用 Message Content Intent，复制每个 token。
    - Telegram：通过 BotFather 为每个智能体创建一个 bot，复制每个 token。
    - WhatsApp：为每个账户关联一个电话号码。

    ```bash
    openclaw channels login --channel whatsapp --account work
    ```

    参见通道指南：[Discord](/channels/discord)、[Telegram](/channels/telegram)、[WhatsApp](/channels/whatsapp)。

  </Step>
  <Step title="添加智能体、账户和绑定">
    在 `agents.entries` 下添加智能体，在 `channels.<channel>.accounts` 下添加通道账户，并使用 `bindings` 将它们连接起来（示例见下文）。
  </Step>
  <Step title="重启并验证">
    ```bash
    openclaw gateway restart
    openclaw agents list --bindings
    openclaw channels status --probe
    ```
  </Step>
</Steps>

## 多个代理，多个角色

每个配置的 `agentId` 都是核心代理状态的独立角色边界：

- 每个频道使用不同的账户（通过 `accountId` 区分）。
- 不同的个性（通过代理的 `AGENTS.md`/`SOUL.md` 区分）。
- 独立的身份验证和会话，只有在通过明确的功能或插件配置启用后，才允许跨代理访问。

这使得多个人可以共享一个 Gateway，同时保持彼此独立的核心代理状态。

## 每个代理的 Memory Wiki 保管库

Memory Wiki 默认使用一个全局保管库。为了将支持代理的
编译知识与营销代理的知识分开，请将
`plugins.entries.memory-wiki.config.vault.scope` 设置为 `agent`：

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

所配置的路径是父目录。OpenClaw 会附加规范化后的
代理 ID，生成诸如 `~/.openclaw/wiki/support` 和
`~/.openclaw/wiki/marketing` 这样的路径。当配置了多个代理时，
作用域为代理的 CLI 和 Gateway 操作需要显式指定代理。有关桥接
过滤、迁移以及信任边界的详细信息，请参见
[每个代理的 Memory Wiki 保管库](/plugins/memory-wiki#per-agent-vaults)。

## 跨代理的 QMD 内存搜索

要让一个代理搜索另一个代理的 QMD 会话转录，请在 `agents.entries.*.memory.search.qmd.extraCollections` 下添加额外集合。如果所有代理都应共享相同的集合，请使用 `memory.search.qmd.extraCollections`。

```json5
{
  agents: {
    defaults: {
      workspace: "~/workspaces/main",
    },
    entries: {
      main: {
        default: true,
        workspace: "~/workspaces/main",
        memory: {
          search: {
            qmd: {
              extraCollections: [{ path: "notes" }], // 在工作区内解析 -> 名为 "notes-main" 的集合
            },
          },
        },
      },
      family: { workspace: "~/workspaces/family" },
    },
  },
  memory: {
    backend: "qmd",
    search: {
      qmd: {
        extraCollections: [{ path: "~/agents/family/sessions", name: "family-sessions" }],
      },
    },
    qmd: { includeDefaultMemory: false },
  },
}
```

额外集合的路径可以在多个代理之间共享，但当路径位于代理工作区之外时，其 `name` 仍需显式指定。工作区内的路径会保持代理作用域，因此每个代理都会保留自己的转录搜索集合。

## 一个 WhatsApp 号码，多个人（DM 拆分）

通过将发送者的 E.164（`+15551234567`）与 `peer.kind: "direct"` 匹配，把不同的 WhatsApp 私信路由给同一个 WhatsApp 账户上的不同代理。回复仍然来自同一个 WhatsApp 号码——不存在按代理区分的发送者身份。

<Note>
直接聊天默认会折叠到代理的主会话键，因此要实现真正隔离，每个人都需要一个代理。
</Note>

```json5
{
  agents: {
    entries: {
      alex: { default: true, workspace: "~/.openclaw/workspace-alex" },
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
  ],
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"],
    },
  },
}
```

DM 访问控制（配对/允许列表）是按 WhatsApp 账户全局生效的，而不是按代理分别设置的。对于共享群组，请将该群组绑定到一个代理，或者使用 [广播群组](/channels/broadcast-groups)。

## 路由规则

绑定是确定性的，且最具体的规则优先。完整的层级顺序请参见 [通道路由](/channels/channel-routing#routing-rules-how-an-agent-is-chosen)（精确 peer、父级 peer、peer 通配符、guild+roles、guild、team、account、channel、默认代理）。这里有几条值得特别指出的规则：

- 如果同一层级中有多个绑定匹配，则配置顺序中的第一个生效。
- 如果某个绑定设置了多个匹配字段（例如 `peer` + `guildId`），则所有指定字段都必须匹配（`AND` 语义）。
- 省略 `accountId` 的绑定只匹配默认账户，而不是所有账户。使用 `accountId: "*"` 表示整个通道的回退规则，或使用 `accountId: "<name>"` 表示某一个账户。再次添加相同绑定并显式指定账户 ID，会将现有的仅通道绑定升级，而不是创建重复项。

对于现有的多代理配置，`openclaw doctor --fix` 会将旧的环境默认路由具体化为通道级绑定，并显式设置心跳、Custodian 和 Talk 目标。单代理配置不受影响。

## 多个账户 / 电话号码

支持多个账户的渠道（例如 WhatsApp）使用 `accountId` 来标识每个登录。每个 `accountId` 都会路由到其对应的 agent，因此一台服务器可以托管多个电话号码，而不会混淆会话。

设置 `channels.<channel>.defaultAccount` 可在省略 `accountId` 时选择要使用的账户。如果未设置，OpenClaw 会先回退到 `default`（如果存在），否则会使用第一个已配置的账户 id（按排序顺序）。

支持多个账户的渠道：`discord`、`feishu`、`googlechat`、`imessage`、`irc`、`line`、`mattermost`、`matrix`、`nextcloud-talk`、`nostr`、`signal`、`slack`、`telegram`、`whatsapp`、`zalo`、`zalouser`。

## 概念

- `agentId`：一个“脑袋”（工作区、每个 agent 的认证、每个 agent 的会话存储）。
- `accountId`：一个频道账号实例（例如 WhatsApp 账号 `personal` vs `biz`）。
- `binding`：通过 `(channel, accountId, peer)` 将传入消息路由到某个 `agentId`，并可选地包含公会/团队 ID。
- 直接聊天会折叠为 `agent:<agentId>:<mainKey>`（每个 agent 的“主会话”；见 `session.mainKey`）。

## 平台示例

<AccordionGroup>
  <Accordion title="每个 agent 一个 Discord bot">
    每个 Discord bot 账号映射到唯一的 `accountId`。将每个账号绑定到一个 agent，并为每个 bot 保持 allowlist。

    ```json5
    {
      agents: {
        entries: {
          main: { default: true, workspace: "~/.openclaw/workspace-main" },
          coding: { workspace: "~/.openclaw/workspace-coding" },
        },
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
  <Accordion title="每个 agent 一个 Telegram bot">
    ```json5
    {
      agents: {
        entries: {
          main: { default: true, workspace: "~/.openclaw/workspace-main" },
          alerts: { workspace: "~/.openclaw/workspace-alerts" },
        },
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
    - Token 存放在 `channels.telegram.accounts.<id>.botToken` 中（默认账号可以使用 `TELEGRAM_BOT_TOKEN`）。
    - 对于同一个 Telegram 群组中的多个 bot，邀请每个 bot，并提及应该响应的那个。
    - 为每个群组 bot 关闭 BotFather Privacy Mode（`/setprivacy` -> Disable），然后移除并重新添加该 bot，以便 Telegram 应用该设置。
    - 使用 `channels.telegram.groups` 允许群组，或者仅在受信任的群组部署中使用 `groupPolicy: "open"`。
    - 将发送者用户 ID 放入 `groupAllowFrom`。群组和超级群组 ID 应放在 `channels.telegram.groups` 中，而不是 `groupAllowFrom`。
    - 按 `accountId` 进行绑定，以便每个 bot 路由到自己的 agent。

  </Accordion>
  <Accordion title="每个 agent 一个 WhatsApp 号码">
    在启动网关之前先链接每个账号：

    ```bash
    openclaw channels login --channel whatsapp --account personal
    openclaw channels login --channel whatsapp --account biz
    ```

    `~/.openclaw/openclaw.json`（JSON5）：

    ```js
    {
      agents: {
        entries: {
          home: {
            default: true,
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
  <Tab title="WhatsApp 日常 + Telegram 深度工作">
    按频道拆分：将 WhatsApp 路由到一个快速的日常 agent，将 Telegram 路由到一个 Opus agent。

    ```json5
    {
      agents: {
        entries: {
          chat: {
            default: true,
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
    }
    ```

    这些示例使用 `accountId: "*"`, 因此即使你以后添加账号，绑定规则仍然有效。若要在保持其余消息走 chat 的同时，把某个单独的 DM/群组路由到 Opus，可以为该 peer 添加一个 `match.peer` 绑定——peer 匹配始终优先于按频道的规则。

  </Tab>
  <Tab title="同一频道，将一个 peer 路由到 Opus">
    保持 WhatsApp 使用快速 agent，但将一个 DM 路由到 Opus：

    ```json5
    {
      agents: {
        entries: {
          chat: {
            default: true,
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
    }
    ```

    peer 绑定始终优先，所以请把它们放在按频道的规则之上。

  </Tab>
  <Tab title="绑定到 WhatsApp 群组的家庭 agent">
    将一个专用的家庭 agent 绑定到单个 WhatsApp 群组，并启用 mention gating 与更严格的工具策略：

    ```json5
    {
      agents: {
        entries: {
          family: {
            default: true,
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

    工具允许/拒绝列表是 **tools**，不是 skills。如果某个 skill 需要运行二进制文件，请确保允许 `exec`，并且该二进制文件存在于沙箱中。若要更严格地进行 gating，请设置 `agents.entries.*.groupChat.mentionPatterns`，并为该频道保持启用群组 allowlist。
  </Tab>
</Tabs>

## 每个 agent 的沙箱和工具配置

每个 agent 都可以拥有自己的沙箱和工具限制：

```js
{
  agents: {
    entries: {
      personal: {
        default: true,
        workspace: "~/.openclaw/workspace-personal",
        sandbox: {
          mode: "off",  // personal agent 不使用沙箱
        },
        // 没有工具限制 - 所有工具都可用
      },
      family: {
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",     // 始终处于沙箱中
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
    },
  },
}
```

<Note>
`setupCommand` 位于 `sandbox.docker` 下，并在容器创建时运行一次。若解析后的 scope 为 `"shared"`，则会忽略每个 agent 的 `sandbox.docker.*` 覆盖项。
</Note>

这带来以下优势：

- **安全隔离**：限制不受信任 agent 的工具。
- **资源控制**：对特定 agent 使用沙箱，同时让其他 agent 继续在主机上运行。
- **灵活策略**：为不同 agent 提供不同权限。

<Note>
`tools.elevated` 同时具有全局门控（`tools.elevated.enabled`/`allowFrom`）和每个 agent 的门控（`agents.entries.*.tools.elevated.enabled`/`allowFrom`）。每个 agent 的门控只能进一步收紧全局设置——两者都必须允许某个发送者，提权命令才能运行。对于组目标，请使用 `agents.entries.*.groupChat.mentionPatterns`，这样 @提及 就能正确映射到目标 agent。
</Note>

查看 [多 agent 的沙箱和工具](/tools/multi-agent-sandbox-tools) 以获取详细示例。

## 相关内容

- [ACP 代理](/tools/acp-agents) — 运行外部编码框架
- [通道路由](/channels/channel-routing) — 消息如何路由到代理
- [在线状态](/concepts/presence) — 代理在线状态和可用性
- [会话](/concepts/session) — 会话隔离和路由
- [子代理](/tools/subagents) — 启动后台代理运行。
