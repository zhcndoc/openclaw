---
summary: "多代理路由：隔离代理、频道账户与绑定"
title: 多代理路由
read_when: "您想在一个网关进程中运行多个隔离代理（工作区 + 认证）。"
status: active
---

# 多代理路由

目标：在一个运行中的 Gateway 中实现多个**隔离的**代理（独立工作区 + `agentDir` + 会话），以及多个频道账户（例如两个 WhatsApp）。入站消息通过绑定路由到指定代理。

## What is "one agent"?

**代理** 是一个完全独立的智能体，拥有自己的：

- **工作区**（文件、AGENTS.md/SOUL.md/USER.md、本地笔记、角色规则）。
- **状态目录**（`agentDir`），包含认证配置、模型注册表及每代理配置。
- **会话存储**（聊天历史 + 路由状态），位于 `~/.openclaw/agents/<agentId>/sessions`。

认证配置是**每代理独立**的。每个代理从自身路径读取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

主代理凭证**不会自动共享**。切勿跨代理复用 `agentDir`，否则会导致认证或会话冲突。如需共享凭证，可复制 `auth-profiles.json` 到另外代理的 `agentDir`。

技能是按代理隔离管理的，位于每个工作区的 `skills/` 文件夹，共享技能在 `~/.openclaw/skills`。详见[技能：每代理与共享](/tools/skills#per-agent-vs-shared-skills)。

Gateway 可以托管**单个代理**（默认）或**多个代理**并排运行。

**工作区注释:** 每个代理的工作区是**默认当前工作目录**，而非严格沙箱。相对路径会解析到工作区内，但绝对路径可访问主机其他位置，除非启用了沙箱。详情见[沙箱化](/gateway/sandboxing)。

## 路径（快速索引）

- 配置文件：`~/.openclaw/openclaw.json`（或环境变量 `OPENCLAW_CONFIG_PATH`）
- 状态目录：`~/.openclaw`（或环境变量 `OPENCLAW_STATE_DIR`）
- 工作区：`~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- 代理目录：`~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 会话目录：`~/.openclaw/agents/<agentId>/sessions`

### 单代理模式（默认）

如果未做特别设置，OpenClaw 运行单代理：

- `agentId` 默认为 **`main`**。
- 会话键格式为 `agent:main:<mainKey>`。
- 工作区默认是 `~/.openclaw/workspace`（若设置环境变量 `OPENCLAW_PROFILE`，则默认 `~/.openclaw/workspace-<profile>`）。
- 状态目录默认为 `~/.openclaw/agents/main/agent`。

## 代理辅助工具

使用代理向导添加新的隔离代理：

```bash
openclaw agents add work
```

然后添加 `bindings`（或让向导完成），用于路由入站消息。

可用以下命令验证配置：

```bash
openclaw agents list --bindings
```

## 快速开始

<Steps>
  <Step title="创建每个代理工作区">

使用向导或手动创建工作区：

```bash
openclaw agents add coding
openclaw agents add social
```

每个代理都有自己的工作区，包含 `SOUL.md`、`AGENTS.md` 和可选的 `USER.md`，还有专属的 `agentDir` 和位于 `~/.openclaw/agents/<agentId>` 的会话存储。

  </Step>

  <Step title="创建频道账户">

为每个代理在您喜欢的频道创建一个账户：

- Discord：每个代理一个机器人，启用消息内容权限，并复制各自令牌。
- Telegram：通过 BotFather 为每个代理创建一个机器人，复制各自令牌。
- WhatsApp：为每个账户关联不同手机号。

```bash
openclaw channels login --channel whatsapp --account work
```

请参阅频道指南：[Discord](/channels/discord)、[Telegram](/channels/telegram)、[WhatsApp](/channels/whatsapp)。

  </Step>

  <Step title="添加代理、账户和绑定">

在 `agents.list` 下添加代理，在 `channels.<channel>.accounts` 下添加频道账户，用 `bindings` 把它们连接起来（示例见下文）。

  </Step>

  <Step title="重启并验证">

```bash
openclaw gateway restart
openclaw agents list --bindings
openclaw channels status --probe
```

  </Step>
</Steps>

## 多代理 = 多人，多人格

使用**多代理**时，每个 `agentId` 代表一个**完全隔离的人格**：

- **不同的电话号码/账户**（针对每个频道的 `accountId`）。
- **不同的人格特征**（每代理工作区文件如 `AGENTS.md` 和 `SOUL.md`）。
- **独立的认证和会话**（除非明确启用，否则互不干扰）。

这使得**多人共享同一 Gateway 服务器**时，能保持 AI “大脑”与数据的隔离。

## 一个 WhatsApp 号码，多人分流（私聊拆分）

您可以在**同一 WhatsApp 账户**下，将**不同的 WhatsApp 私聊消息**路由给不同代理。通过发送者的 E.164 格式号码（如 `+15551234567`）配合 `peer.kind: "direct"` 进行匹配。回复依然来自同一 WhatsApp 号码（无每代理独立发信身份）。

重要细节：直接聊天会合并到代理的**主会话键**，因此要实现真正隔离，需要**每人一个代理**。

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

说明：

- 私聊访问控制是**全局且针对 WhatsApp 账户**（配对/允许列表），而非按代理隔离。
- 对于共享群组，将群绑定到单一代理或使用[广播群组](/channels/broadcast-groups)。

## 路由规则（消息如何选择代理）

绑定规则是**确定性的**，匹配优先级为**最具体优先**：

1. `peer` 匹配（准确的私聊/群组/频道 ID）
2. `parentPeer` 匹配（线程继承）
3. `guildId + roles` 匹配（Discord 角色路由）
4. 仅 `guildId` 匹配（Discord）
5. `teamId` 匹配（Slack）
6. 频道账户 ID (`accountId`) 匹配
7. 频道层面匹配 (`accountId: "*"`)
8. 兜底默认代理 (`agents.list[].default`，否则列表首项，默认: `main`)

同一层级有多个匹配时，按配置顺序第一个生效。若绑定中包含多个匹配字段（如同时设置 `peer` 和 `guildId`），则所有字段必须全部满足（逻辑“与”关系）。

重要账户级细节：

- 省略 `accountId` 的绑定仅匹配默认账户。
- 使用 `accountId: "*"` 可匹配频道内所有账户的频道级兜底路由。
- 若之后给同一个代理添加了显式 `accountId` 的绑定，OpenClaw 会升级已有的频道范围绑定为账户范围，而不会重复添加。

## 多账户 / 多手机号

支持**多账户**的频道（如 WhatsApp），使用 `accountId` 标识每个登录实例。不同 `accountId` 可以路由到不同代理，从而同一服务器可托管多手机号，避免会话混淆。

如需省略 `accountId` 时默认使用某账户，可配置 `channels.<channel>.defaultAccount`（可选）。未设置则默认落回 `default` 账户，若无再用排序后的首个账户 ID。

常见支持此模式的频道包括：

- `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`
- `irc`, `line`, `googlechat`, `mattermost`, `matrix`, `nextcloud-talk`
- `bluebubbles`, `zalo`, `zalouser`, `nostr`, `feishu`

## 概念

- `agentId`：一个“智能体”（工作区、每代理认证、每代理会话存储）。
- `accountId`：一个频道账户实例（例如 WhatsApp 中 `"personal"` vs `"biz"`）。
- `binding`：通过 `(channel, accountId, peer)`（及可选的公会/团队ID）将入站消息路由至某个 `agentId`。
- 私聊会话合并为 `agent:<agentId>:<mainKey>`（每代理“主会话”；对应 `session.mainKey`）。

## 平台示例

### 每代理的 Discord 机器人

每个 Discord 机器人账号对应唯一 `accountId` ，将各账户绑定给对应代理，为每个机器人设置独立允许列表。

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

说明：

- 邀请每个机器人加入公会，并启用消息内容权限。
- 令牌位于 `channels.discord.accounts.<id>.token`（默认账户可用环境变量 `DISCORD_BOT_TOKEN`）。

### 每代理的 Telegram 机器人

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

说明：

- 为每个代理使用 BotFather 创建一个机器人并复制令牌。
- 令牌位于 `channels.telegram.accounts.<id>.botToken`（默认账户可用环境变量 `TELEGRAM_BOT_TOKEN`）。

### 每代理的 WhatsApp 号码

启动 Gateway 前链接每个账户：

```bash
openclaw channels login --channel whatsapp --account personal
openclaw channels login --channel whatsapp --account biz
```

`~/.openclaw/openclaw.json` (JSON5):

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

  // 确定性路由：首个匹配生效（最具体优先）。
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },

    // 可选的按对端覆盖（例：将特定群聊路由到 work 代理）。
    {
      agentId: "work",
      match: {
        channel: "whatsapp",
        accountId: "personal",
        peer: { kind: "group", id: "1203630...@g.us" },
      },
    },
  ],

  // 默认关闭：代理间消息传递需显式启用+设置允许名单。
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
          // 可选覆盖，默认目录：~/.openclaw/credentials/whatsapp/personal
          // authDir: "~/.openclaw/credentials/whatsapp/personal",
        },
        biz: {
          // 可选覆盖，默认目录：~/.openclaw/credentials/whatsapp/biz
          // authDir: "~/.openclaw/credentials/whatsapp/biz",
        },
      },
    },
  },
}
```

## 示例：WhatsApp 日常聊天 + Telegram 深度工作

按频道分流：WhatsApp 路由到快速日常代理，Telegram 路由到 Opus 深度工作代理。

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "日常",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-6",
      },
      {
        id: "opus",
        name: "深度工作",
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

- 若某频道有多个账户，可在绑定中添加 `accountId`（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
- 若想将某个单独私聊/群聊单独路由到 Opus，保留其 `match.peer` 绑定；peer 绑定始终优先于频道级规则。

## 示例：同频道，一个私聊路由到 Opus

保持 WhatsApp 在快速代理，另一路由某个私聊到 Opus：

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "日常",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-6",
      },
      {
        id: "opus",
        name: "深度工作",
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

私聊绑定优先，因此将它放在频道级规则之前。

## 家庭代理绑定至 WhatsApp 群聊

将专属家庭代理绑定到单个 WhatsApp 群聊，设置 @提及控制和更严格的工具策略：

```json5
{
  agents: {
    list: [
      {
        id: "family",
        name: "家庭",
        workspace: "~/.openclaw/workspace-family",
        identity: { name: "家庭机器人" },
        groupChat: {
          mentionPatterns: ["@family", "@familybot", "@家庭机器人"],
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

- 工具白名单和黑名单控制的是**工具**，非技能。如果技能需要运行二进制，请确保 `exec` 工具被允许且对应二进制存在于沙箱中。
- 如需更严格门控，请设置 `agents.list[].groupChat.mentionPatterns`，并保持频道的群组允许列表开启。

## 每代理沙箱及工具配置

每个代理可以拥有自己的沙箱和工具限制：

```js
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: {
          mode: "off",  // 个人代理禁用沙箱
        },
        // 无工具限制，所有工具可用
      },
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",     // 始终启用沙箱
          scope: "agent",  // 每代理一个容器
          docker: {
            // 容器创建后可选的一次性设置命令
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read"],                    // 仅允许读取工具
          deny: ["exec", "write", "edit", "apply_patch"],    // 禁用其他工具
        },
      },
    ],
  },
}
```

说明：`setupCommand` 是 `sandbox.docker` 下的选项，容器创建时运行一次。当实际作用域为 `"shared"` 时，忽略各代理的 `sandbox.docker.*` 覆盖设置。

**优势：**

- **安全隔离**：限制不信任代理使用工具
- **资源控制**：对特定代理启用沙箱，其他代理保持宿主运行
- **灵活策略**：每代理不同权限设定

注意：`tools.elevated` 为**全局且基于发送者**，无法针对代理独立配置。如需精细边界，使用 `agents.list[].tools` 拒绝 `exec` 权限即可。针对群组目标，可用 `agents.list[].groupChat.mentionPatterns` 令 @提及精准映射至目标代理。

详见[多代理沙箱与工具](/tools/multi-agent-sandbox-tools)获取完整示例。
