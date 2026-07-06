---
summary: "请求用户批准插件工具调用和插件拥有的权限提示"
title: "插件权限请求"
sidebarTitle: "权限请求"
read_when:
  - 你需要某个插件 hook 或工具在副作用执行前先询问
  - 你需要配置插件批准提示发送到哪里
  - 你正在在可选工具、exec 批准和插件批准之间做选择
---

插件权限请求允许插件代码暂停一次工具调用或插件拥有的
操作，直到用户批准或拒绝它们。它们使用 Gateway 的
`plugin.approval.*` 流程，以及处理聊天批准按钮和
`/approve` 命令的相同批准 UI 表面。

将插件权限请求用于插件/应用权限。它们不能替代
宿主 exec 批准、可选工具允许列表，或 Codex 的原生权限
审查。

## 选择合适的闸门

选择与你需要的决策点相匹配的闸门：

| 闸门                             | 适用场景                                                               | 它控制什么                                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 可选工具                         | 在用户主动选择之前，工具不应对模型可见。                               | 通过 `tools.allow` 控制工具暴露。                                                                             |
| 插件权限请求                     | 某个插件 hook 或插件拥有的操作必须在单次动作运行前询问。               | 通过 `plugin.approval.*` 进行运行时批准。                                                                     |
| Exec 批准                        | 宿主命令或类 shell 工具需要操作员批准。                                 | 宿主 exec 策略和持久化 exec 允许列表。                                                                         |
| Codex 原生权限请求               | Codex 在原生 shell、文件、MCP 或应用服务器操作前询问。                 | Codex app-server 或原生 hook 的批准处理；当 OpenClaw 拥有该提示时，会路由到插件批准。                         |
| MCP 批准引发请求                 | Codex MCP 服务器请求某个工具调用的批准。                               | 通过 OpenClaw 插件批准桥接的 MCP 批准响应。                                                                   |

可选工具是发现阶段的闸门。插件权限请求是按调用次数的闸门。若某个敏感工具在模型看到它之前就必须明确选择加入，并且在动作运行前还必须批准，则两者都使用。

## 在工具调用前请求批准

大多数插件编写的提示都应该从 `before_tool_call` hook 开始。该 hook
在模型选择工具之后、OpenClaw 执行它之前运行：

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
          title: "部署服务",
          description: `将服务部署到 ${environment}。`,
          severity: environment === "production" ? "critical" : "warning",
          allowedDecisions:
            environment === "production"
              ? ["allow-once", "deny"]
              : ["allow-once", "allow-always", "deny"],
          timeoutMs: 120_000,
          timeoutBehavior: "deny",
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

- 保持 `title` 简短且以动作为中心；Gateway 将其上限设为 80 个字符。
- 保持 `description` 具体且有边界；Gateway 将其上限设为 256
  个字符。
- 包含动作、目标和风险。不要包含不应出现在聊天审批界面中的密钥、令牌或
  私有载荷。
- 当省略 `severity` 时，默认值为 `"warning"`。仅对错误决定可能导致生产环境损坏
  或数据丢失的操作使用 `"critical"`。
- 当省略 `allowedDecisions` 时，默认值为 `["allow-once", "allow-always", "deny"]`。
  对于持久信任对该动作不安全的情况，请传入 `["allow-once", "deny"]`。
- `timeoutMs` 的默认值为 120000（2 分钟），并且无论请求值是多少，都会被限制
  为 600000（10 分钟）。

## 决策行为

OpenClaw 会创建一个带有 `plugin:` ID 的待批准项，将其发送到
可用的批准界面，并等待决策。

| 决策              | 结果                                                                      |
| ----------------- | ------------------------------------------------------------------------- |
| `allow-once`      | 当前调用继续执行。                                                         |
| `allow-always`    | 当前调用继续执行，并将该决策传递给插件。                                   |
| `deny`            | 该调用被阻止，并返回拒绝的工具结果。                                       |
| 超时              | 除非 `timeoutBehavior` 为 `"allow"`，否则该调用将被阻止。                  |
| 取消              | 当运行被中止时，该调用将被阻止。                                           |
| 没有批准路由      | 由于没有连接的批准界面能够处理它，该调用被阻止。                            |

`allow-always` 只有在请求的插件或运行时实现了
该持久化时才是持久化的。对于普通的 `before_tool_call.requireApproval` hook，
OpenClaw 会将 `allow-once` 和 `allow-always` 视为当前调用的批准决策，
并将解析后的值传递给 `onResolution`。如果你的插件提供 `allow-always`，
请明确记录并实现它未来会信任哪些调用。

如果该 hook 还返回了 `params`，OpenClaw 只会在批准成功后应用这些参数更改。
较低优先级的 hook 仍然可以在较高优先级的 hook 请求批准后进行阻止。

`allowedDecisions` 会限制展示给用户的按钮和命令。对于请求未提供的任何决策，
Gateway 都会拒绝解析尝试。

## 路由批准提示

批准提示可以在本地 UI 界面中解析，也可以在支持批准处理的聊天渠道中解析。
要将插件批准提示转发到显式聊天目标，请配置 `approvals.plugin`：

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

`approvals.plugin` 与 `approvals.exec` 相互独立。启用 exec 批准
转发不会路由插件批准提示，启用插件批准转发也不会改变宿主 exec 策略。

当提示包含手动批准文本时，请使用其中一个提供的决策进行解析：

```text
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

请参阅 [高级 exec 批准](/tools/exec-approvals-advanced#plugin-approval-forwarding)
了解完整转发模型、同一聊天中的批准行为、原生渠道
投递以及渠道特定的批准者规则。

## Codex 原生权限

Codex 原生权限提示也可以通过插件批准流转，但它们与
插件编写的 hooks 拥有不同的所有权。

- Codex app-server 批准请求会在 Codex 审查后通过 OpenClaw 路由。
- 原生 hook `permission_request` 转发可在启用该转发时通过
  `plugin.approval.request` 发起询问。
- 当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，
  MCP 工具批准引发请求会通过插件批准路由。

有关 Codex 特定行为和回退规则，请参阅
[Codex harness 运行时](/plugins/codex-harness-runtime#native-permissions-and-mcp-elicitations)。

## 故障排查

**工具提示插件批准不可用。** 没有批准 UI 或已配置的
批准路由接受该请求。连接一个支持批准的客户端，使用支持同一聊天
`/approve` 的渠道，或配置 `approvals.plugin`。

**`allow-always` 出现了，但下一次调用又再次提示。** 通用插件
批准流程不会自动为任意 hooks 持久化信任。请在你的插件中于
`onResolution("allow-always")` 后持久化插件拥有的信任，或者
只提供 `allow-once` 和 `deny`。

**`/approve` 拒绝该决策。** 该请求限制了
`allowedDecisions`。请使用提示中打印出的决策之一。

**Discord、Matrix、Slack 或 Telegram 的提示路由与 exec
批准不同。** 插件批准和 exec 批准使用的是不同的配置，且可能采用不同的授权检查。请验证
`approvals.plugin` 以及该频道对插件批准的支持，而不要只检查 `approvals.exec`。

## 相关内容

- [插件钩子](/plugins/hooks#tool-call-policy)
- [构建插件](/plugins/building-plugins#registering-tools)
- [高级执行审批](/tools/exec-approvals-advanced#plugin-approval-forwarding)
- [网关协议](/gateway/protocol)
- [Codex harness 运行时](/plugins/codex-harness-runtime#native-permissions-and-mcp-elicitations)
