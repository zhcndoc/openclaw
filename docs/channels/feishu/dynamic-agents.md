---
summary: "Feishu 的每用户代理隔离，为每个 DM 用户提供自己的工作区和代理"
read_when:
  - "运行公共 Feishu 机器人，其中每个用户都需要一个私人助理"
  - "配置 `dynamicAgentCreation` 或 `session.dmScope`"
title: "Feishu 动态代理"
sidebarTitle: "动态代理"
---

每用户代理隔离：为每个 Feishu DM 发送者提供自己的工作区、引导文件和对话历史记录。

## <a id="per-user-agent-isolation-(dynamic-agent-creation)"></a><a id="per-user-agent-isolation-dynamic-agent-creation"></a> 按用户隔离智能体（动态智能体创建）

启用 `dynamicAgentCreation` 为每个 DM 用户自动创建 **隔离代理实例**。每个用户都有自己的：

- 独立工作区目录
- 单独的 `USER.md` / `SOUL.md` / `MEMORY.md`
- 私有对话历史
- 隔离的技能和状态

对于希望每个用户都拥有自己私有 AI 助手体验的公共机器人来说，这一点至关重要。

<Note>
动态绑定包括规范化的 Feishu `accountId`，因此默认帐户和命名帐户会将每个发件人路由到正确的动态代理。

如果某个命名账户在旧版本中创建了一个未限定范围的动态智能体，该旧智能体仍会计入 `maxAgents`。在删除它之前，请确认默认账户不会使用它，或者临时提高 `maxAgents`；OpenClaw 无法安全地推断哪个账户拥有这种歧义的旧状态。
</Note>

### <a id="quick-setup"></a> 快速设置

```json5
{
  channels: {
    feishu: {
      dmPolicy: "open",
      allowFrom: ["*"],
      dynamicAgentCreation: {
        enabled: true,
        workspaceTemplate: "~/.openclaw/workspace-{agentId}",
        agentDirTemplate: "~/.openclaw/agents/{agentId}/agent",
      },
    },
  },
  session: {
    // Critical: makes each user's DM their "main session"
    // Automatically loads USER.md / SOUL.md / MEMORY.md
    // For stronger isolation, use "per-channel-peer" instead
    dmScope: "main",
  },
}
```

### <a id="how-it-works"></a> 工作原理

当新用户发送第一个 DM 时：

1. 该频道会生成一个唯一的 `agentId`：默认账户为 `feishu-{user_open_id}`，命名账户则为带有账户前缀的受限身份摘要
2. 在 `workspaceTemplate` 路径下创建新的工作区
3. 注册该智能体并为此用户创建绑定
4. 工作区帮助程序在首次访问时创建丢失的引导文件（`AGENTS.md`、`SOUL.md`、`USER.md` 等）
5. 将该用户未来的所有消息路由到其专属智能体

### <a id="configuration-options"></a> 配置选项

| 设置                                                  | 描述                                | 默认值                              |
| -------------------------------------------------------- | ------------------------------------------ | ------------------------------------ |
| `channels.feishu.dynamicAgentCreation.enabled`           | 启用自动每用户代理创建   | `false`                              |
| `channels.feishu.dynamicAgentCreation.workspaceTemplate` | 动态代理工作区的路径模板 | `~/.openclaw/workspace-{agentId}`    |
| `channels.feishu.dynamicAgentCreation.agentDirTemplate`  | 代理目录名称模板              | `~/.openclaw/agents/{agentId}/agent` |
| `channels.feishu.dynamicAgentCreation.maxAgents`         | 创建的动态代理的最大数量 | 无限                            |

模板变量：

- `{agentId}` - 生成的代理 ID（e.g.、`feishu-ou_xxxxxx` 或 `feishu-support-<identity_digest>`）
- `{userId}` - 发送方的Feishu open_id（e.g.，`ou_xxxxxx`）

### <a id="session-scope"></a> 会话范围

`session.dmScope` 控制私信如何映射到智能体会话。这是一个**全局设置**，会影响所有频道。

| 值                        | 行为                                                            | 最适合                                                           |
| ---------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `"main"`                     | 每个用户的 DM 映射到其代理的主会话                   | 您希望自动加载 `USER.md` / `SOUL.md` 的单用户机器人 |
| `"per-peer"`                 | 每个对端获得一个独立会话（与频道无关）           | 仅按发送者身份进行隔离                            |
| `"per-channel-peer"`         | 每个（频道 + 用户）组合获得一个独立会话           | 需要更强隔离的公共多用户机器人                  |
| `"per-account-channel-peer"` | 每个（账户 + 频道 + 用户）组合获得一个独立会话 | 需要账户级会话隔离的多账户机器人         |

**权衡**：使用 `"main"` 可以启用引导文件的自动加载（`USER.md`、`SOUL.md`、`MEMORY.md`），但这意味着所有频道的所有私信都会共享相同的会话键模式。对于更看重隔离而不是引导自动加载的公共多用户机器人，建议使用 `"per-channel-peer"` 并手动管理引导文件。

<Note>
当命名为 Feishu 的帐户应为同一发件人保留单独的会话时，请使用 `"per-account-channel-peer"`。动态绑定保留帐户范围。
</Note>

### <a id="typical-multi-user-deployment"></a> 典型多用户部署

```json5
{
  channels: {
    feishu: {
      appId: "cli_xxx",
      appSecret: "xxx",
      dmPolicy: "open",
      allowFrom: ["*"],
      groupPolicy: "open",
      requireMention: true,
      dynamicAgentCreation: {
        enabled: true,
        workspaceTemplate: "~/.openclaw/workspace-{agentId}",
        agentDirTemplate: "~/.openclaw/agents/{agentId}/agent",
      },
    },
  },
  session: {
    // Choose dmScope based on your isolation needs:
    // "main" for bootstrap auto-loading, "per-channel-peer" for stronger isolation
    dmScope: "main",
  },
  bindings: [], // Empty - dynamic agents auto-bind
}
```

### <a id="verification"></a> 验证

检查网关日志，确认动态创建是否正常工作：

```text
feishu: creating dynamic agent "feishu-ou_xxxxxx" for user ou_xxxxxx
  workspace: /home/user/.openclaw/workspace-feishu-ou_xxxxxx
  agentDir: /home/user/.openclaw/agents/feishu-ou_xxxxxx/agent
```

列出所有已创建的工作区：

```bash
ls -la ~/.openclaw/workspace-*
```

### <a id="notes"></a> 说明

- **工作区隔离**：每个用户都会获得自己的工作区目录和智能体实例。在正常消息交互流程中，用户无法看到彼此的对话历史或文件。
- **安全边界**：这是一种消息上下文隔离机制，不是恶意共租户的安全边界。智能体进程和宿主环境是共享的。
- **必须保持配置写入开启**：动态智能体创建会将智能体和绑定写入配置；当 `channels.feishu.configWrites` 为 `false` 时会跳过（默认：开启）。
- **`bindings` 应为空**：动态智能体会自动注册自己的绑定
- **升级路径**：现有的手动绑定可以与动态智能体并存
- **`session.dmScope` 是全局的**：这会影响所有通道，而不仅仅是 Feishu
