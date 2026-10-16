---
summary: "请求用户批准插件工具调用和插件拥有的权限提示"
title: "插件权限请求"
sidebarTitle: "权限请求"
read_when:
  - "你需要某个插件 hook 或工具在副作用执行前先询问"
  - "你需要配置插件批准提示发送到哪里"
  - "你正在在可选工具、exec 批准和插件批准之间做选择"
---

插件权限请求允许插件代码暂停一次工具调用或插件拥有的操作，直到用户批准或拒绝它们。它们使用 Gateway 的 `plugin.approval.*` 流程，以及处理聊天批准按钮和 `/approve` 命令的相同批准 UI 表面。

使用 plugin/app 权限的插件权限请求。它们不会取代主机执行批准、可选工具白名单或 Codex 的本机权限审查。

## <a id="choose-the-right-gate"></a> 选择合适的闸门

选择与你需要的决策点相匹配的闸门：

| 闸门                             | 适用场景                                                              | 它控制什么                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 可选工具                   | 在用户主动选择之前，工具不应对模型可见。        | 通过 `tools.allow` 控制工具暴露。                                                                              |
| 插件权限请求       | 某个插件 hook 或插件拥有的操作必须在单次动作运行前询问。 | 通过 `plugin.approval.*` 进行运行时批准。                                                                     |
| 执行批准                   | 宿主命令或类 shell 工具需要操作员批准。               | 宿主 exec 策略和持久化 exec 允许列表。                                                                     |
| Codex 原生权限请求 | Codex 在原生 shell、文件、MCP 或应用服务器操作前询问。        | Codex app-server 或原生 hook 的批准处理；当 OpenClaw 拥有该提示时，会路由到插件批准。 |
| MCP 批准引出        | Codex MCP 服务器请求批准工具调用。                    | MCP 批准响应通过 OpenClaw 插件批准桥接。                                                 |

可选工具是发现阶段的闸门。插件权限请求是按调用次数的闸门。若某个敏感工具在模型看到它之前就必须明确选择加入，并且在动作运行前还必须批准，则两者都使用。

## <a id="request-approval-before-a-tool-call"></a> 在工具调用前请求批准

大多数插件编写的提示都应该从 `before_tool_call` hook 开始。该 hook 在模型选择工具之后、OpenClaw 执行它之前运行：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "deploy-policy",
  name: "Deploy Policy",
  register(api) {
    api.on("before_tool_call", async (event) => {
      if (event.toolName !== "deploy_service") {
        return;
      }

      const environment =
        typeof event.params.environment === "string" ? event.params.environment : "unknown";

      return {
        requireApproval: {
          title: "Deploy service",
          description: `Deploy service to ${environment}.`,
          severity: environment === "production" ? "critical" : "warning",
          allowedDecisions:
            environment === "production"
              ? ["allow-once", "deny"]
              : ["allow-once", "allow-always", "deny"],
          timeoutMs: 120_000,
          onResolution(decision) {
            console.log(`deploy approval resolved: ${decision}`);
          },
        },
      };
    });
  },
});
```

为将要批准该动作的人编写提示文本：

- 保持 `title` 简短且以行动为中心。网关的上限为 80 个字符。
- 保持 `description` 具体且有界。网关的上限为 512 个字符。
- 包含动作、目标和风险。不要包含不应出现在聊天审批界面中的密钥、令牌或私有载荷。
- 当省略 `severity` 时，默认为 `"warning"`。仅对那些错误决策可能导致生产损害或数据丢失的动作使用 `"critical"`。
- 当省略 `allowedDecisions` 时，默认为 `["allow-once", "allow-always", "deny"]`。 对于持久信任对该动作不安全的情况，传入 `["allow-once", "deny"]`。
- `timeoutMs` 默认为 120000（2 分钟），并且无论请求的值是多少，都会被限制为 600000（10 分钟）。

## <a id="declare-approval-scope"></a> 申报批准范围

当您的插件知道操作的后果时，设置 `requireApproval.scope`。范围是可输入的、可选的且仅显示：它可以帮助审阅者理解操作，但绝不会授予权限或更改批准决定。声明批准的插件提供了这些事实。通道永远不会从命令、标题或消息文本推断范围。

对于发送给三个外部收件人的电子邮件，请包括目标、收件人总数、可选预览和受众：

```typescript
requireApproval: {
  title: "Send customer update",
  scope: {
    kind: "message-send",
    target: "email",
    recipientCount: 3,
    recipients: ["alice@example.com", "bob@example.com"],
    audience: "external",
  },
}
```

对于付款，请以字符串形式提供准确的小数金额、货币以及收款人或支付系统：

```typescript
requireApproval: {
  title: "Pay invoice",
  scope: {
    kind: "payment",
    amount: "49.99",
    currency: "EUR",
    target: "Stripe",
  },
}
```

对于外部帖子，确定其目标并声明其可见性：

```typescript
requireApproval: {
  title: "Publish announcement",
  scope: {
    kind: "external-post",
    target: "github",
    visibility: "public",
  },
}
```

消息受众可以是 `internal` 或 `external`。外部帖子可见性可以是 `public` 或 `restricted`。收件人预览最多包含五个身份。所有字符串在显示前都会经过清理和限制：目标和收件人身份限制为 128 个字符，付款金额限制为 40 个字符，货币限制为 12 种。如果过滤超出限制，OpenClaw 将忽略范围，同时保留正常的批准提示。

## <a id="decision-behavior"></a> 决策行为

OpenClaw 会创建一个带有 `plugin:` ID 的待批准项，将其发送到可用的批准界面，并等待决策。

| 决策          | 结果                                                                    |
| ----------------- | ------------------------------------------------------------------------- |
| `allow-once`      | 当前调用继续。                                               |
| `allow-always`    | 当前调用继续，并将该决策传递给插件。      |
| `deny`            | 该调用被阻止，并返回拒绝的工具结果。                            |
| 超时           | 该调用被阻止。                                                      |
| 取消      | 当运行被中止时，该调用被阻止。                              |
| 无批准路由 | 该调用被阻止，因为没有已连接的批准界面能够解析它。 |

只有请求允许的确切 `allow-once` 和 `allow-always` 决策才允许执行。未知、格式错误、不匹配、缺失和超时的决策会阻止执行。

只有当请求插件或运行时实现了该持久化时，`allow-always` 才会真正持久化。对于普通的 `before_tool_call.requireApproval` hooks，OpenClaw 会将 `allow-once` 和 `allow-always` 视为当前调用的批准决策，并将解析后的值传递给 `onResolution`。如果你的插件提供 `allow-always`，请明确记录并实现它对未来哪些调用可信。

如果 hook 还返回 `params`，OpenClaw 会在请求批准时保存基础参数及其覆盖值，然后仅在批准成功后应用这些覆盖值。优先级较低的 hook 仍然可以阻止调用，但无法重写待批准项所涵盖的参数。

`allowedDecisions` 会限制展示给用户的按钮和命令。对于请求未提供的任何决策， Gateway 都会拒绝解析尝试。

## <a id="route-approval-prompts"></a> 路由批准提示

批准提示可以在本地 UI 界面中解析，也可以在支持批准处理的聊天渠道中解析。 要将插件批准提示转发到显式聊天目标，请配置 `approvals.plugin`：

```json5
{
  approvals: {
    plugin: {
      enabled: true,
      mode: "targets",
      agentFilter: ["main"],
      targets: [{ channel: "slack", to: "U12345678" }],
    },
  },
}
```

`approvals.plugin` 与 `approvals.exec` 相互独立。启用 exec 批准转发不会路由插件批准提示，启用插件批准转发也不会改变宿主 exec 策略。

对于 Slack 决策，`approvals.plugin.slack` 可以限制审阅者，而无需更改机器人的消息访问列表。默认 `approvers` 列表适用于所有插件批准。对于一个选定的本机工具插件，`plugins` 条目会覆盖它。工具条目会覆盖该插件的一个确切工具的列表：

```json5
{
  approvals: {
    plugin: {
      slack: {
        approvers: ["team:T12345678:user:U12345678"],
        plugins: {
          "catalog-tools": {
            approvers: ["team:T12345678:user:U23456789"],
            tools: {
              "create%20issue": {
                approvers: ["team:T12345678:user:U34567890"],
              },
            },
          },
        },
      },
    },
  },
}
```

对于原生 OpenClaw 工具，请使用工具注册的插件 ID 和 `encodeURIComponent(rawToolName)` 的工具密钥。仅适用精确匹配的列表：工具，然后插件，然后默认。 Slack 审阅者接受所选 Slack 帐户内的原始 `U…`/`W…` 用户 ID，或工作区限定 ID，如上所示。决策绑定到机器人经过身份验证的工作空间；来自不同工作区的合格审阅者不会收到批准 DM。显式空列表否认该级别的 Slack 决策。如果省略默认 `approvers` 字段，则具有已知选定所有者且没有匹配覆盖的请求将保留现有 Slack 帐户 `allowFrom` 或 `defaultTo` 授权。当插件覆盖存在时，缺失的选定所有者会拒绝 Slack 决策。这些列表授权 Slack 卡按钮和 `/approve`，而经过身份验证的网关批准客户端仍然使用自己的范围。即使没有普通机器人 DM 访问权限，卡片按钮也适用于列出的审阅者；输入 `/approve` 仍然需要该访问权限。即使审阅者无法读取源 DM 或私人频道，工具卡也可以显示插件提供的请求标题和描述；选择具有可见性的审稿人。工具覆盖需要精确选择的工具匹配；当该身份不可用时，请求无法继承更广泛的审阅者列表。有效的非空审阅者列表可以实现该请求的本机 Slack 交付，独立于本机执行批准和插件转发。仅当策略或挂钩请求批准该工具时，本机工具列表才适用；设置审阅者本身并不提示批准。当选择 Slack 审阅者列表时，Slack 仅通过本机审阅者 DM 发送卡片。即使目标指定审阅者，通用 `approvals.plugin.targets` Slack 转发也无法强制执行该收件人列表。如果本机 Slack 处理程序不可用，通用转发将不会发送卡片；连接机器人或具有批准功能的网关客户端并重试。

在发送新请求时会检查审阅者列表，在接受批准决定时会再次检查。更改列表不会收回现有卡片或取消已排队等待传递的消息。前审阅者可能仍会看到此类卡，但在失去访问权限后无法批准它。过期或取消请求的卡不能授权操作。

当提示包含手动批准文本时，请使用其中一个提供的决策进行解析：

```text
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

请参阅 [高级 exec 批准](/tools/exec-approvals-advanced#plugin-approval-forwarding) 了解完整转发模型、同一聊天中的批准行为、原生渠道投递以及渠道特定的批准者规则。

## <a id="codex-native-permissions"></a> Codex 原生权限

Codex 原生权限提示也可以通过插件批准流转，但它们与插件编写的 hooks 拥有不同的所有权。

- Codex 应用程序服务器审批请求在 Codex 审核后通过 OpenClaw 路由。
- 原生 hook `permission_request` 转发可在启用该转发时通过 `plugin.approval.request` 发起询问。
- 当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，MCP 工具审批会通过插件审批引发路由。

有关 Codex- 特定行为和回退规则，请参阅 [Codex 工具运行时 ](/plugins/codex-harness-runtime#native-permissions-and-mcp-elicitations)。

## <a id="troubleshooting"></a> 故障排查

**工具提示插件批准不可用。** 没有批准 UI 或已配置的批准路由接受该请求。连接一个支持批准的客户端，使用支持同一聊天 `/approve` 的渠道，或配置 `approvals.plugin`。

**`allow-always` 出现了，但下一次调用又再次提示。** 通用插件批准流程不会自动为任意 hooks 持久化信任。请在你的插件中于 `onResolution("allow-always")` 后持久化插件拥有的信任，或者只提供 `allow-once` 和 `deny`。

**`/approve` 拒绝该决策。** 该请求限制了 `allowedDecisions`。请使用提示中打印出的决策之一。

**Discord、Matrix、Slack 或 Telegram 的提示路由与 exec 批准不同。** 插件批准和 exec 批准使用的是不同的配置，且可能采用不同的授权检查。请验证 `approvals.plugin` 以及该频道对插件批准的支持，而不要只检查 `approvals.exec`。

## <a id="related"></a> 相关内容

- [插件挂钩](/plugins/hooks/tool-policy#tool-call-policy)
- [构建插件](/plugins/building-plugins#registering-tools)
- [高级执行审批](/tools/exec-approvals-advanced#plugin-approval-forwarding)
- [网关协议](/gateway/protocol)
- [Codex harness 运行时](/plugins/codex-harness-runtime#native-permissions-and-mcp-elicitations)。
