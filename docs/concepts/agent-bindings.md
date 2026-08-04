---
summary: "将频道账户和对话路由到正确的 OpenClaw 代理"
title: "代理绑定"
read_when:
  - 将频道账户路由到不同的代理
  - 将一个对话发送给专用代理
  - 判断默认代理是否足够
---

当一条消息抵达某个频道时，OpenClaw 必须决定由哪个代理来回答。默认情况下，这很简单：标记为 `default: true` 的代理会接收所有内容。代理绑定会针对部分流量覆盖这一决策——每个绑定都会指定一个 `agentId`，并匹配账户、对等方、服务器、团队或 Discord 角色等频道信息，而匹配到的代理将拥有最终会话。

绑定只负责选择代理。它们不会创建频道账户，也不会授予访问权限——只有当频道已经通过其正常的配对、允许列表和账户规则接受消息后，系统才会查询绑定。

## 何时使用绑定

如果每个对话都可以共享一个工作区、一套模型策略和一个会话边界，那么你不需要使用绑定——默认代理就是正确的选择。在需要稳定划分时使用绑定，例如：

- 每个代理对应一个频道账号
- 将支持收件箱路由到支持工作区
- 将某个私信或群组路由给专业代理
- 将某个公会、团队或 Discord 角色与账号的其他部分区别路由

先配置频道账号，然后再进行绑定。指向频道从未接受过的账号的绑定不会产生任何作用。

## 将账户路由到代理

此示例保留 `main` 作为备用代理，并将名为 `support` 的 Discord 账户路由到其专属代理和工作区：

```json5
{
  agents: {
    entries: {
      main: {
        default: true,
        workspace: "~/.openclaw/workspace",
      },
      support: {
        workspace: "~/.openclaw/workspace-support",
      },
    },
  },
  bindings: [
    {
      agentId: "support",
      comment: "将 support 机器人账户路由到 support 代理",
      match: {
        channel: "discord",
        accountId: "support",
      },
    },
  ],
}
```

现在，发送到 `support` 账户的消息将解析为 `agentId: "support"`；除非有其他绑定匹配，否则所有其他 Discord 账户和其他频道仍会使用 `main`。

路由配置会在启动时读取，因此请重启 Gateway，然后验证代理列表和频道账户：

```bash
openclaw agents list --bindings
openclaw channels status --probe
```

## 匹配特定会话

当只有一条私信、一个群组或一个频道应交由专用代理处理时，添加 `match.peer`：

```json5
{
  bindings: [
    {
      agentId: "support",
      match: {
        channel: "discord",
        accountId: "default",
        peer: {
          kind: "channel",
          id: "123456789012345678",
        },
      },
    },
  ],
}
```

`peer.kind` 接受 `direct`、`group` 或 `channel`。使用频道的规范 peer ID，而不是显示名称。

## 匹配字段和优先级

每个绑定都需要 `agentId` 和 `match.channel`。可选的路由匹配字段：

- `accountId`：一个已配置的账户。省略时仅匹配该频道的默认账户；`"*"` 表示显式的频道级回退。
- `peer`：具体的或通配的直接、群组或频道对端
- `guildId` 和 `teamId`：特定于频道的群组空间约束
- `roles`：Discord 角色 ID，与 guild 约束一起评估
- `session.dmScope`：针对匹配到的直接消息的可选会话范围覆盖设置

优先级按具体程度决定：具体的会话和群组空间匹配优先于账户和频道回退。在同一层级内，配置中排在前面的绑定优先——当规则处于同一层级时，应将范围较窄的规则放在范围较宽的规则之前。

顶层 `bindings` 还接受用于持久化 ACP 会话的 `type: "acp"` 条目。这些条目要求具体的 `match.peer.id`，并遵循 ACP 会话身份契约，而不是普通的路由优先级；如果这正是你需要的功能，请参阅 [ACP 代理](/tools/acp-agents)。

## 常见错误

### 省略 accountId 以表示所有账户

省略 `accountId` 只会匹配频道的默认账户。如果你希望设置频道范围的回退规则，请明确使用 `accountId: "*"`。

### 绑定到未知代理

`agentId` 必须存在于 `agents.entries` 中，并且应恰好有一个条目标记为 `default: true`。引用缺失代理的绑定会在不提示的情况下错误路由。

### 将绑定视为访问控制

绑定会为已经获准的消息选择代理。配对、`dmPolicy`、群组策略和允许列表是独立的控制项——请分别进行配置。

## 相关内容

- [多智能体路由](/concepts/multi-agent)
- [智能体配置](/gateway/config-agents)
- [频道路由](/channels/channel-routing)
