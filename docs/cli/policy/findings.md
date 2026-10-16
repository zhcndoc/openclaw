---
summary: "每个策略检查 ID、`doctor --fix` 将修复和不会修复的内容以及命令退出代码"
read_when:
  - "您想要查找 `policy/...` 结果的含义"
  - "您想知道哪些结果 `doctor --fix` 可以自动修复"
  - "您正在根据策略命令退出代码编写脚本"
title: "政策发现、修复和退出代码"
sidebarTitle: "调查结果及修复"
---

解释策略发现、修复它以及退出代码。 [`openclaw policy`](/cli/policy) 参考的一部分。

## <a id="findings"></a> 发现项

| 检查身份证                                                 | 寻找                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `policy/policy-jsonc-missing`                            | 策略已启用，但缺少 `policy.jsonc`。                                  |
| `policy/policy-jsonc-invalid`                            | 策略无法解析，或包含格式错误的规则条目。                       |
| `policy/policy-hash-mismatch`                            | 策略与配置的 `expectedHash` 不匹配。                                  |
| `policy/attestation-hash-mismatch`                       | 当前策略证据不再与已接受的证明相匹配。               |
| `policy/policy-conformance-invalid`                      | 基线策略文件或被检查的策略文件包含无效的比较语法。                  |
| `policy/policy-conformance-missing`                      | 被检查的策略文件缺少基线策略文件所要求的规则。     |
| `policy/policy-conformance-weaker`                       | 被检查的策略文件的值比基线策略文件更弱。           |
| `policy/channels-denied-provider`                        | 已启用的频道匹配到了一条频道拒绝规则。                                   |
| `policy/mcp-denied-server`                               | 配置的 MCP 服务器被策略拒绝。                                      |
| `policy/mcp-unapproved-server`                           | 配置的 MCP 服务器不在允许列表中。                                 |
| `policy/models-denied-provider`                          | 配置的模型提供方或模型引用使用了被拒绝的提供方。                  |
| `policy/models-unapproved-provider`                      | 配置的模型提供方或模型引用不在允许列表中。                |
| `policy/network-private-access-enabled`                  | 当策略拒绝时，启用了私有网络 SSRF 逃逸开关。             |
| `policy/routing-bindings-required`                       | 策略要求频道路由绑定，但未进行配置。                  |
| `policy/routing-binding-channel-unconfigured`            | 路由绑定所命名的频道不存在于 `channels.*` 中。                         |
| `policy/routing-agent-mismatch`                          | 已编写的路由解析到了不同的 agent。                                  |
| `policy/routing-match-kind-mismatch`                     | 已编写的路由匹配到了意外的绑定特异性级别。                   |
| `policy/ingress-dm-policy-unapproved`                    | 频道 DM 策略不在策略允许列表中。                              |
| `policy/ingress-dm-scope-unapproved`                     | `session.dmScope` 与策略要求的 DM 隔离范围不匹配。          |
| `policy/ingress-open-groups-denied`                      | 频道组策略为 `open`，而策略拒绝开放组入口。          |
| `policy/ingress-group-mention-required`                  | 频道或组条目禁用了提及门控，而策略要求启用。       |
| `policy/gateway-non-loopback-bind`                       | 当策略拒绝时，网关绑定姿态允许非回环暴露。         |
| `policy/gateway-auth-disabled`                           | 当策略要求认证时，网关认证被禁用。                     |
| `policy/gateway-rate-limit-missing`                      | 当策略要求时，网关认证限流姿态未明确配置。          |
| `policy/gateway-control-ui-insecure`                     | 网关 Control UI 不安全暴露切换已启用。                         |
| `policy/gateway-tailscale-funnel`                        | 当策略拒绝时，网关 Tailscale Funnel 暴露已启用。               |
| `policy/gateway-remote-enabled`                          | 当策略拒绝时，网关远程模式处于活动状态。                              |
| `policy/gateway-http-endpoint-enabled`                   | 在策略拒绝时，网关 HTTP API 端点已启用。                    |
| `policy/gateway-http-url-fetch-unrestricted`             | 网关 HTTP URL-fetch 输入缺少必需的 URL 白名单。                      |
| `policy/gateway-node-command-denied`                     | 被策略拒绝的网关节点命令未被 OpenClaw 配置拒绝。                 |
| `policy/agents-workspace-access-denied`                  | agent 沙箱模式或工作区访问超出了策略允许列表。           |
| `policy/agents-tool-not-denied`                          | agent 或默认配置未拒绝策略要求拒绝的某个工具。               |
| `policy/tools-profile-unapproved`                        | 配置的全局或按 agent 工具配置文件不在允许列表中。           |
| `policy/tools-fs-workspace-only-required`                | 文件系统工具未配置为仅限工作区路径姿态。             |
| `policy/tools-exec-security-unapproved`                  | exec 安全模式不在策略允许列表中。                               |
| `policy/tools-exec-ask-unapproved`                       | exec ask 模式不在策略允许列表中。                                    |
| `policy/tools-exec-host-unapproved`                      | exec 主机路由不在策略允许列表中。                                |
| `policy/tools-elevated-enabled`                          | 当策略拒绝时，已启用提升权限工具模式。                              |
| `policy/tools-also-allow-missing`                        | 配置的 `alsoAllow` 列表缺少策略要求的条目。             |
| `policy/tools-also-allow-unexpected`                     | 配置的 `alsoAllow` 列表包含策略未预期的条目。           |
| `policy/tools-required-deny-missing`                     | 全局或按 agent 的工具拒绝列表未包含所需的被拒绝工具。     |
| `policy/sandbox-mode-unapproved`                         | 沙箱模式不在策略允许列表中。                                     |
| `policy/sandbox-backend-unapproved`                      | 沙箱后端不在策略允许列表中。                                  |
| `policy/sandbox-container-posture-unobservable`          | 对某个无法观测的后端启用了容器姿态规则。         |
| `policy/sandbox-container-host-network-denied`           | 基于容器的沙箱或浏览器使用了主机网络模式。                     |
| `policy/sandbox-container-namespace-join-denied`         | 基于容器的沙箱或浏览器加入了另一个容器命名空间。          |
| `policy/sandbox-container-mount-mode-required`           | 基于容器的沙箱或浏览器挂载不是只读的。                     |
| `policy/sandbox-container-runtime-socket-mount`          | 基于容器的沙箱或浏览器挂载暴露了容器运行时 socket。 |
| `policy/sandbox-container-unconfined-profile`            | 当策略拒绝时，容器沙箱配置文件为 unconfined。                    |
| `policy/sandbox-browser-cdp-source-range-missing`        | 当策略要求时，沙箱浏览器 CDP source range 缺失。             |
| `policy/data-handling-telemetry-content-capture`         | 当策略拒绝时，遥测内容捕获已启用。                       |
| `policy/data-handling-session-retention-not-enforced`    | 当策略要求时，未强制执行会话保留维护。            |
| `policy/data-handling-session-transcript-memory-enabled` | 当策略拒绝时，会话转录记忆索引已启用。              |
| `policy/secrets-unmanaged-provider`                      | 配置的 SecretRef 引用了未在 `secrets.providers` 下声明的提供方。  |
| `policy/secrets-denied-provider-source`                  | 配置的 secret 提供方或 SecretRef 使用了被策略拒绝的来源。             |
| `policy/secrets-insecure-provider`                       | 当策略拒绝时，secret 提供方选择了不安全姿态。               |
| `policy/auth-profile-invalid-metadata`                   | 配置的 auth profile 缺少有效的提供方或模式元数据。                 |
| `policy/auth-profile-unapproved-mode`                    | 配置的 auth profile 模式不在策略允许列表中。                       |
| `policy/exec-approvals-missing`                          | 策略要求 SQLite exec approvals 文档，但其行缺失。       |
| `policy/exec-approvals-invalid`                          | 配置的 SQLite exec approvals 文档无法解析。                   |
| `policy/exec-approvals-default-security-unapproved`      | exec approval 默认值使用了不在策略允许列表中的安全模式。          |
| `policy/exec-approvals-agent-security-unapproved`        | 按 agent 生效的 exec approval 安全模式不在允许列表中。       |
| `policy/exec-approvals-auto-allow-skills-enabled`        | 当策略拒绝时，执行审批代理会隐式自动允许技能 CLI。   |
| `policy/exec-approvals-allowlist-missing`                | approvals 允许列表缺少策略要求的模式。                  |
| `policy/exec-approvals-allowlist-unexpected`             | approvals 允许列表包含策略未预期的模式。                |
| `policy/tools-missing-risk-level`                        | 受治理的工具声明缺少风险元数据。                             |
| `policy/tools-unknown-risk-level`                        | 受治理的工具声明使用了未知的风险值。                           |
| `policy/tools-missing-sensitivity-token`                 | 受治理的工具声明缺少敏感度元数据。                      |
| `policy/tools-missing-owner`                             | 受治理的工具声明缺少所有者元数据。                            |
| `policy/tools-unknown-sensitivity-token`                 | 受治理的工具声明使用了未知的敏感度值。                    |

结果可以包括 `target`（观察到的不符合的工作区事物）和 `requirement`（使其成为结果的创作规则）。两者都是 `oc://` 地址字符串，但字段名称描述的是策略角色而不是地址格式。

发现示例：

```json
{
  "checkId": "policy/channels-denied-provider",
  "severity": "error",
  "message": "Channel 'telegram' uses denied provider 'telegram'.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/channels/telegram",
  "target": "oc://openclaw.config/channels/telegram",
  "requirement": "oc://policy.jsonc/channels/denyRules/#0",
  "fixHint": "Telegram is not approved for this workspace."
}
```

```json
{
  "checkId": "policy/tools-missing-risk-level",
  "severity": "error",
  "message": "AGENTS.md tool 'deploy' has no explicit risk classification.",
  "source": "policy",
  "path": "AGENTS.md",
  "line": 12,
  "ocPath": "oc://AGENTS.md/tools/deploy",
  "target": "oc://AGENTS.md/tools/deploy",
  "requirement": "oc://policy.jsonc/tools/requireMetadata"
}
```

```json
{
  "checkId": "policy/mcp-unapproved-server",
  "severity": "error",
  "message": "MCP server 'remote' is not in the policy allowlist.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/mcp/servers/remote",
  "target": "oc://openclaw.config/mcp/servers/remote",
  "requirement": "oc://policy.jsonc/mcp/servers/allow"
}
```

```json
{
  "checkId": "policy/models-unapproved-provider",
  "severity": "error",
  "message": "Model ref 'anthropic/claude-sonnet-4.7' uses unapproved provider 'anthropic'.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/agents/defaults/model/fallbacks/#0",
  "target": "oc://openclaw.config/agents/defaults/model/fallbacks/#0",
  "requirement": "oc://policy.jsonc/models/providers/allow"
}
```

```json
{
  "checkId": "policy/network-private-access-enabled",
  "severity": "error",
  "message": "Network setting 'browser-private-network' allows private-network access.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
  "target": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
  "requirement": "oc://policy.jsonc/network/privateNetwork/allow"
}
```

```json
{
  "checkId": "policy/gateway-non-loopback-bind",
  "severity": "error",
  "message": "Gateway bind setting 'gateway-bind' permits non-loopback exposure.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/gateway/bind",
  "target": "oc://openclaw.config/gateway/bind",
  "requirement": "oc://policy.jsonc/gateway/exposure/allowNonLoopbackBind"
}
```

```json
{
  "checkId": "policy/gateway-node-command-denied",
  "severity": "error",
  "message": "Gateway node command 'system.run' is denied by policy but not denied by OpenClaw config.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/gateway/nodes/commands/deny",
  "target": "oc://openclaw.config/gateway/nodes/commands/deny",
  "requirement": "oc://policy.jsonc/gateway/nodes/denyCommands",
  "fixHint": "Add 'system.run' to gateway.nodes.commands.deny or update policy after review."
}
```

```json
{
  "checkId": "policy/agents-workspace-access-denied",
  "severity": "error",
  "message": "agents.defaults sandbox workspaceAccess 'rw' is not allowed by policy.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
  "target": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
  "requirement": "oc://policy.jsonc/agents/workspace/allowedAccess"
}
```

## <a id="repair"></a> 修复

`doctor --lint` 和 `policy check` 为只读操作。

`doctor --fix` 仅在 `workspaceRepairs` 明确启用时，才会编辑受策略管理的工作区设置；否则，检查会报告它们将会修复的内容，并保持设置不变。

修复可以禁用 `channels.denyRules` 拒绝的通道并应用下面列出的自动缩小修复。仅在审核策略文件后才启用 `workspaceRepairs`，因为有效的规则可以更改工作区配置：

- 当全局策略禁止提升权限工具时，将 `tools.elevated.enabled=false`
- 当策略要求拒绝这些工具时，将缺少的必需拒绝工具 ID 添加到 `tools.deny` 或 `agents.entries.*.tools.deny`
- 将不安全的 `gateway.controlUi.*` 开关设为 `false`
- 当策略禁止远程 gateway 模式时，将 `gateway.mode=local`
- 当策略禁止 Gateway HTTP API 端点时，将报告的 `gateway.http.endpoints.*.enabled` 路径设为 `false`
- 当策略禁止开放的组入口时，将报告的通道入口 `groupPolicy` 路径设为 `allowlist`
- 当策略要求组提及时，将报告的通道入口 `requireMention` 路径设为 `true`
- 当策略禁止遥测内容捕获时，将 `diagnostics.otel.captureContent=false`，或对于对象形式的遥测捕获设置，将 `diagnostics.otel.captureContent.enabled=false`

作用域内的提升权限工具修复仅进行检测，不会实际修复。若发现结果报告的是共享遥测配置，则作用域内的数据处理修复也会跳过，因为更改共享设置会影响超出作用域策略目标的范围。

`dataHandling.sensitiveLogging.requireRedaction`无检查无维修。敏感日志编辑在 OpenClaw 中是无条件的，因此没有任何内容可以将其报告为已禁用。关键仍然是受支持的策略规则：`openclaw policy` 验证其形状，`openclaw policy compare` 仍然要求候选策略至少与其基线一样严格，`openclaw policy check` 在 `dataHandling` 证据和证明中记录运行时不变 `oc://openclaw.invariant/logging/redaction`，作为满足要求的证据。

当发现结果报告的是继承的根级 `tools.deny` 时，会跳过作用域内的必需拒绝修复，因为将所需工具添加到根配置会影响超出作用域策略目标的范围。仅限代理本地的必需拒绝修复可以更新报告的 `agents.entries.*.tools.deny` 路径。

当发现报告继承 `channels.defaults.*` 时，会跳过范围通道入口修复，因为更改共享通道默认值会影响范围策略目标以外的范围。网关 HTTP URL-fetch 白名单发现结果仍需手动进行，因为自动修复无法选择正确的端点 URL 白名单值。

Gateway 绑定和节点命令的发现仍需人工审查。当 `policy/gateway-non-loopback-bind` 或 `policy/gateway-node-command-denied` 可以映射到某个配置路径时，`doctor --fix` 会将建议的 `gateway.bind` 或 `gateway.nodes.commands.deny` 更改作为跳过的预览指导进行报告。它不会应用该更改，并且在操作员审查并更新配置或策略之前，该发现不算已修复。

```jsonc
{
  "plugins": {
    "entries": {
      "policy": {
        "config": {
          "workspaceRepairs": true,
        },
      },
    },
  },
}
```

## <a id="exit-codes"></a> 退出代码

| 命令          | `0`                                                    | `1`                                                                 | `2`                          |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------- |
| `policy check`   | 阈值下无发现项。                          | 一项或多项发现达到了阈值。                             | 参数或运行时失败。 |
| `policy compare` | 策略文件至少与基线一样严格。 | 策略文件无效、缺失，或比基线规则更宽松。 | 参数或运行时失败。 |
| `policy watch`   | 无发现项且已接受的哈希仍为最新。              | 存在发现项或已接受的证明已过期。                    | 参数或运行时失败。 |
