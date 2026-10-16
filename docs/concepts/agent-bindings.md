---
summary: "将频道账户和对话路由到正确的 OpenClaw 代理"
title: "代理绑定"
doc-schema-version: 1
read_when:
  - "将频道账户路由到不同的代理"
  - "将一个对话发送给专用代理"
  - "决定一个代理是否足够"
---

当消息到达通道时，OpenClaw 必须决定由哪个代理应答它。代理绑定会为您的一部分流量做出选择 - 每个绑定都会命名一个 `agentId` 并匹配通道事实，例如帐户、对等、行会、团队或 Discord 角色，并且匹配的代理拥有生成的会话。

绑定只负责选择代理。它们不会创建频道账户，也不会授予访问权限——只有当频道已经通过其正常的配对、允许列表和账户规则接受消息后，系统才会查询绑定。

## <a id="when-to-use-a-binding"></a> 何时使用绑定

通过一个配置的代理，每个对话都可以共享一个工作区、一个模型策略和一个会话边界，而无需绑定。当您想要稳定的拆分时，请使用绑定，例如：

- 每个代理对应一个频道账号
- 将支持收件箱路由到支持工作区
- 将某个私信或群组路由给专业代理
- 将某个公会、团队或 Discord 角色与账号的其他部分区别路由

先配置频道账号，然后再进行绑定。指向频道从未接受过的账号的绑定不会产生任何作用。

## <a id="route-an-account-to-an-agent"></a> 将账户路由到代理

此示例使用显式多代理所有权，将名为 `support` 的 Discord 帐户路由到其自己的代理和工作区，并将其他 Discord 帐户发送到 `main`：

```json5
{
  agents: {
    ownership: "explicit",
    entries: {
      main: {
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
      comment: "Route the support bot account to the support agent",
      match: {
        channel: "discord",
        accountId: "support",
      },
    },
    {
      agentId: "main",
      match: {
        channel: "discord",
        accountId: "*",
      },
    },
  ],
}
```

`support` 帐户上的消息现在解析为 `agentId: "support"`。全通道绑定将其他Discord账户路由到`main`；为需要路由的其他通道添加绑定。

当没有绑定匹配时，路由可以使用调用者提供的所有者、配置的或保留的默认所有者或唯一配置的代理。如果多代理设置中没有可用的绑定，路由会报告 `AGENT_SELECTION_REQUIRED` 并要求您添加绑定。

较旧的配置可能仍包含一个 `default: true` 标记。 [Doctor 迁移](/gateway/doctor/config-migrations) 将该所有权携带到显式绑定和服务目标中，同时保留现有的显式选择。该标记不能与 `agents.ownership: "explicit"` 组合。

有效的绑定更改在默认的 `hybrid` [ 重载模式 ](/gateway/configuration/hot-reload) 下自动应用。如果 `gateway.reload.mode` 为 `off`，请重新启动网关以应用它们。然后验证名册和频道帐户：

```bash
openclaw agents list --bindings
openclaw channels status --probe
```

## <a id="match-a-specific-conversation"></a> 匹配特定会话

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

`peer.kind` 接受 `direct`、`group` 或 `channel`。使用通道的稳定对等点 ID，而不是显示名称。

## <a id="match-fields-and-precedence"></a> 匹配字段和优先级

每个绑定都需要 `agentId` 和 `match.channel`。其他字段控制匹配和会话范围：

- `accountId`：一个已配置的账户。省略时仅匹配该频道的默认账户；`"*"` 表示显式的频道级回退。
- `peer`：具体的或通配的直接、群组或频道对端
- `guildId` 和 `teamId`：特定于频道的群组空间约束
- `roles`：Discord 角色 ID，与行会约束一起评估
- `session.dmScope`：针对匹配到的直接消息的可选会话范围覆盖设置
- `session.groupScope`：匹配组和通道的可选 `main` 或 `per-group` 覆盖

优先级按具体程度决定：具体的会话和群组空间匹配优先于账户和频道回退。在同一层级内，配置中排在前面的绑定优先——当规则处于同一层级时，应将范围较窄的规则放在范围较宽的规则之前。

顶层 `bindings` 还接受用于持久化 ACP 会话的 `type: "acp"` 条目。这些条目要求具体的 `match.peer.id`，并遵循 ACP 会话身份契约，而不是普通的路由优先级；如果这正是你需要的功能，请参阅 [ACP 代理](/tools/acp-agents)。

## <a id="common-mistakes"></a> 常见错误

### <a id="omitting-accountid-to-mean-every-account"></a> 省略 accountId 以表示所有账户

省略 `accountId` 只会匹配频道的默认账户。如果你希望设置频道范围的回退规则，请明确使用 `accountId: "*"`。

### <a id="binding-to-an-unknown-agent"></a> 绑定到未知代理

从 `agents.entries` 中选择 `agentId`。不要依赖丢失的目标回落到另一个代理。如果路由报告绑定的 `AGENT_SELECTION_REQUIRED`，请将其 `agentId` 更新为预期配置的代理。

### <a id="treating-bindings-as-access-control"></a> 将绑定视为访问控制

绑定会为已经获准的消息选择代理。配对、`dmPolicy`、群组策略和允许列表是独立的控制项——请分别进行配置。

## <a id="related"></a> 相关内容

- [多代理路由](/concepts/multi-agent)
- [智能体配置](/gateway/config-agents)
- [频道路由](/channels/channel-routing)
