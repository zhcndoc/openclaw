---
summary: "每个受支持的 `policy.jsonc` 规则、它观察到的 OpenClaw 状态以及何时使用它"
read_when:
  - "您需要特定策略规则背后的观察到的状态"
  - "您希望对指定代理或渠道制定更严格的政策"
  - "您正在通道、网关、沙箱、机密或工具规则之间进行选择"
title: "政策规则参考"
sidebarTitle: "规则参考"
---

每个受支持的规则命名空间，逐个字段。 [`openclaw policy`](/cli/policy) 参考的一部分。

## <a id="policy-rule-reference"></a> 政策规则参考

下面的每条规则都是可选的；只有当规则存在时才会运行检查。已观察到的状态是现有的 OpenClaw 配置或工作区元数据。

### <a id="channels"></a> 频道

| 策略字段                         | 观察到的状态                          | 适用场景                                                     |
| ------------------------------------ | --------------------------------------- | ------------------------------------------------------------ |
| `channels.denyRules[].when.provider` | `channels.*` provider 和启用状态 | 拒绝来自例如 `telegram` 之类 provider 的已配置 channels。 |
| `channels.denyRules[].reason`        | 发现消息和修复提示上下文 | 解释为什么该 provider 被拒绝。                          |

### <a id="mcp-servers"></a> MCP 服务器

| 策略字段        | 观察到的状态      | 适用场景                                                   |
| ------------------- | ------------------- | ---------------------------------------------------------- |
| `mcp.servers.allow` | `mcp.servers.*` ID | 要求每个已配置的 MCP server 都在允许列表中。 |
| `mcp.servers.deny`  | `mcp.servers.*` ID | 拒绝特定的已配置 MCP server ids。                   |

### <a id="model-providers"></a> 模型提供方

| 策略字段             | 观察到的状态                                   | 适用场景                                                                        |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `models.providers.allow` | `models.providers.*` ids 和已选模型引用 | 要求已配置 provider 和已选模型引用使用已批准的 provider。 |
| `models.providers.deny`  | `models.providers.*` ids 和已选模型引用 | 按 provider id 拒绝已配置 provider 和已选模型引用。               |

### <a id="network"></a> 网络

| 策略字段                   | 观察到的状态                      | 适用场景                                                           |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------ |
| `network.privateNetwork.allow` | 私有网络 SSRF 逃逸通道 | 设置为 `false` 以要求私有网络访问保持禁用。 |

### <a id="message-routing"></a> 消息路由

| 策略字段                        | 观察到的状态                                      | 适用场景                                                               |
| ----------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `routing.requireBindings`           | 通道路由绑定，不包括 ACP 绑定      | 要求至少存在一个消息路由绑定。                          |
| `routing.requireConfiguredChannels` | 绑定通道 id 和已配置的 `channels.*` id | 检测已失效或拼写错误的绑定通道 id。                        |
| `routing.probes[].route`            | OpenClaw 的公共路由解析器                  | 描述一个代表性的入站路由，而不发送消息。     |
| `routing.probes[].expect.agentId`   | 已解析的代理 id                                   | 要求路由到达经过审查的代理。                         |
| `routing.probes[].expect.matchedBy` | 解析器匹配类型                                 | 要求使用经过审查的绑定特异性，例如 peer、account、channel 或其他类型。 |

检查 id 必须是唯一的。路由支持`channel`，可选`accountId`、`peer`、`parentPeer`、`guildId`、`teamId`、`memberRoleIds`。对等类型为 `direct`、`group` 和 `channel`。 `matchedBy` 可以包含一种或多种运行时匹配类型，包括 `binding.peer`、`binding.account`、`binding.channel` 或 `default`。

路由检查仅用于一致性验证。它们不会改变启动、消息投递、绑定优先级或回退行为。发现项需要操作员审查，因为自动更改绑定可能会重定向私信。

### <a id="ingress-and-channel-access"></a> Ingress和通道接入

| 策略字段                              | 观察到的状态                                                 | 适用场景                                                           |
| ----------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| `ingress.session.requireDmScope`          | `session.dmScope`                                              | 要求经过审查的 direct-message 隔离范围。                 |
| `ingress.channels.allowDmPolicies`        | `channels.*.dmPolicy` 和旧版通道 DM policy 字段      | 仅允许经过审查的 direct-message 通道策略。               |
| `ingress.channels.denyOpenGroups`         | 通道、账户和群组入口策略                     | 拒绝已配置 channels 和 accounts 的开放群组入口。      |
| `ingress.channels.requireMentionInGroups` | 通道、账户、群组、guild 和嵌套的提及门控配置 | 当群组入口处于开放状态或需要提及门控时，要求启用提及门控。 |

### <a id="gateway"></a> 网关

| 策略字段                            | 观察到的状态                                | 适用场景                                                                             |
| --------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| `gateway.exposure.allowNonLoopbackBind` | `gateway.bind`                                | 设置为 `false` 以要求网关绑定到回环地址。                                  |
| `gateway.exposure.allowTailscaleFunnel` | Tailscale serve/funnel 网关姿态        | 设置为 `false` 以拒绝 Tailscale Funnel 暴露。                                    |
| `gateway.auth.requireAuth`              | `gateway.auth.mode`                           | 设置为 `true` 以拒绝禁用网关身份验证的配置。                                       |
| `gateway.auth.requireExplicitRateLimit` | `gateway.auth.rateLimit`                      | 设置为 `true` 以要求显式配置身份验证速率限制。                            |
| `gateway.controlUi.allowInsecure`       | 设备身份不变量和来源回退 | 设置为 `false` 以要求设备身份，并拒绝 Host 标头来源回退。      |
| `gateway.remote.allow`                  | 远程网关 mode/config                    | 设置为 `false` 以拒绝远程网关模式。                                          |
| `gateway.http.denyEndpoints`            | 网关 HTTP API 端点                    | 拒绝 `chatCompletions` 或 `responses` 等端点 id。                          |
| `gateway.http.requireUrlAllowlists`     | 网关 HTTP URL- 获取输入                 | 设置为 `true` 以要求 URL-fetch 输入上有 URL 允许列表。                         |
| `gateway.nodes.denyCommands`            | `gateway.nodes.commands.deny`                 | 要求在 OpenClaw 配置中明确拒绝 `system.run` 等精确的节点命令 id。 |

`gateway.nodes.denyCommands` 是一个精确、区分大小写的策略拒绝超集规则。 当 policy 必须证明特权节点命令已被 OpenClaw 配置明确拒绝时，请使用它。 对于故意允许某个特权节点命令的部署，应在审查后更新 `policy.jsonc`，而不是仅依赖 `gateway.nodes.commands.allow`。

### <a id="agent-workspace"></a> 代理工作区

| 策略字段                     | 观察到的状态                                                                           | 适用场景                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `agents.workspace.allowedAccess` | `agents.defaults.sandbox.workspaceAccess` 和 `agents.entries.*.sandbox.workspaceAccess` | 仅允许 `none` 或 `ro` 等 sandbox 工作区访问值。                       |
| `agents.workspace.denyTools`     | 全局及按代理设置的工具拒绝配置                                                    | 要求拒绝变更工具（`exec`、`process`、`write`、`edit`、`apply_patch`）。 |

### <a id="sandbox-posture"></a> 沙盒姿势

| 策略字段                                          | 观察到的状态                                          | 适用场景                                                           |
| ----------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| `sandbox.requireMode`                                 | `agents.defaults.sandbox.mode` 和按代理设置的 mode       | 仅允许 `all` 或 `non-main` 等经过审查的 sandbox 模式。     |
| `sandbox.allowBackends`                               | `agents.defaults.sandbox.backend` 和按代理设置的 backend | 仅允许 `docker` 或 `podman` 等经过审查的 sandbox 后端。 |
| `sandbox.containers.denyHostNetwork`                  | 容器支持的 sandbox/browser 网络模式           | 拒绝主机网络模式。                                            |
| `sandbox.containers.denyContainerNamespaceJoin`       | 容器支持的 sandbox/browser 网络模式           | 拒绝加入另一个容器网络命名空间。                  |
| `sandbox.containers.requireReadOnlyMounts`            | 容器支持的sandbox/browser挂载模式             | 要求安装是只读的。                                    |
| `sandbox.containers.denyContainerRuntimeSocketMounts` | 容器支持的 sandbox/browser 安装目标          | 拒绝容器运行时套接字安装。                              |
| `sandbox.containers.denyUnconfinedProfiles`           | 容器安全配置文件姿态                      | 拒绝不受限的容器安全配置文件。                       |
| `sandbox.browser.requireCdpSourceRange`               | Sandbox 浏览器 CDP 源范围                        | 要求浏览器 CDP 暴露声明源范围。            |

策略将缺失的 `sandbox.mode` 视为其隐含默认值 `off`，因此 `sandbox.requireMode` 会将新建或未配置的 sandbox 视为不在诸如 `["all"]` 之类的允许列表中。

### <a id="data-handling"></a> 数据处理

| 策略字段                                        | 观察到的状态                                                                                                   | 适用场景                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `dataHandling.sensitiveLogging.requireRedaction`    | 运行时不变量 `oc://openclaw.invariant/logging/redaction`                                                    | 设置为 `true` 以记录该要求；OpenClaw 始终满足该要求。 |
| `dataHandling.telemetry.denyContentCapture`         | `diagnostics.otel.captureContent`                                                                                | 设置为 `true` 以拒绝遥测内容捕获。                     |
| `dataHandling.retention.requireSessionMaintenance`  | `session.maintenance.mode`                                                                                       | 设置为 `true` 以要求有效的会话维护模式为 `enforce`。 |
| `dataHandling.memory.denySessionTranscriptIndexing` | `memory.search.experimental.sessionMemory`、`memory.search.rememberAcrossConversations` 和按代理设置的覆盖项 | 设置为 `true` 以拒绝将会话转录编入内存索引。       |

### <a id="secrets"></a> 秘密

| 策略字段                      | 观察到的状态                                           | 适用场景                                                                |
| --------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `secrets.requireManagedProviders` | 已配置的 SecretRefs 和 `secrets.providers.*` 声明 | 设置为 `true` 以要求 SecretRefs 指向已声明的 provider。     |
| `secrets.denySources`             | secret provider 来源和 SecretRef 来源            | 拒绝诸如 `exec`、`file` 或其他已配置来源名称。 |
| `secrets.allowInsecureProviders`  | 不安全 secret-provider 姿态标志                   | 设置为 `false` 以拒绝选择进入不安全姿态的 provider。      |

### <a id="exec-approvals"></a> Exec 批准

Exec-approvals 检查默认读取 `~/.openclaw/state/openclaw.sqlite` 中的运行时 `exec_approvals_config` 单例行，或者当设置 `OPENCLAW_STATE_DIR` 时读取 `$OPENCLAW_STATE_DIR/state` 下的同一数据库。调查结果使用稳定的 `oc://exec-approvals.json/...` URI 方案，该方案解决存储在该行中的权威 JSON 文档内的路径。 `execApprovals.defaults.*` 或 `execApprovals.agents.*` 下的姿势规则需要可读的工件证据；丢失或无效的工件报告为不可观察的证据，而不是尽力通过。一旦可读，省略的字段将继承运行时默认值：缺少 `defaults.security` 是 `full`，缺少代理安全性将继承该默认值。证据包括`defaults`、`agents.*`、`agents.*.allowlist[].pattern`、可选的`argPattern`、有效的`autoAllowSkills`姿势和条目源——从不套接字path/token、`commandText`、`lastUsedCommand`、解析路径或时间戳。

| 策略字段                                | 观察到的状态                                                                         | 适用场景                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `execApprovals.requireFile`                 | 活跃运行时的 `exec_approvals_config` 行                                             | 设置为 `true` 以要求 approvals 文档存在且可解析。                     |
| `execApprovals.defaults.allowSecurity`      | `defaults.security`，默认为 `full`                                              | 仅允许经过批准的默认审批安全模式。                                    |
| `execApprovals.agents.allowSecurity`        | `agents.*.security`，继承 defaults                                               | 仅允许经过批准的按代理设置的有效审批安全模式。                        |
| `execApprovals.agents.allowAutoAllowSkills` | `defaults.autoAllowSkills` 和 `agents.*.autoAllowSkills`，继承运行时默认值 | 设置为 `false` 以要求严格的手动允许列表，不隐式批准 skill CLI。 |
| `execApprovals.agents.allowlist.expected`   | 汇总的 `agents.*.allowlist[]` pattern 和可选的 argPattern 条目               | 要求 approvals 允许列表与经过审查的模式集合匹配。                      |

示例：要求 approvals 工件、拒绝宽松默认值，并仅允许为选定代理审查过的 exec approval 姿态。

```jsonc
{
  "execApprovals": {
    "requireFile": true,
    "defaults": {
      // Security modes: "deny", "allowlist", or "full".
      // This default permits only the locked-down deny posture.
      "allowSecurity": ["deny"],
    },
  },
  "scopes": {
    "restricted-shell": {
      "agentIds": ["family-agent", "groups-agent"],
      "execApprovals": {
        "agents": {
          // Selected agents may use reviewed allowlist posture, but not "full".
          "allowSecurity": ["allowlist"],
          // false means skill CLIs must appear in the reviewed allowlist instead of
          // being implicitly approved by autoAllowSkills.
          "allowAutoAllowSkills": false,
          "allowlist": {
            "expected": [
              // Simple entry: exact reviewed executable pattern with no argPattern.
              "travel-hub",
              // Constrained entry: pattern plus reviewed argument regex.
              { "pattern": "calendar-cli", "argPattern": "^sync\\b" },
              "/bin/date",
            ],
          },
        },
      },
    },
  },
}
```

### <a id="auth-profiles"></a> Auth 配置文件

| 策略字段                    | 观察到的状态                               | 适用场景                                                                                   |
| ------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `auth.profiles.requireMetadata` | `auth.profiles.*` provider 和 mode 元数据 | 要求配置 auth profile 上存在诸如 `provider` 和 `mode` 之类的元数据键。               |
| `auth.profiles.allowModes`      | `auth.profiles.*.mode`                       | 仅允许受支持的 auth profile 模式，例如 `api_key`、`aws-sdk`、`oauth` 或 `token`。 |

### <a id="tool-metadata"></a> 工具元数据

| 策略字段            | 观察到的状态                         | 适用场景                                                                                   |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `tools.requireMetadata` | 受管控的 `AGENTS.md` 工具声明 | 要求受管控工具声明 `risk`、`sensitivity` 或 `owner` 等元数据键。 |

### <a id="tool-posture"></a> 工具姿态

| 策略字段                    | 观察到的状态                                              | 适用场景                                                                                                 |
| ------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `tools.profiles.allow`          | `tools.profile` 和 `agents.entries.*.tools.profile`        | 仅允许 `minimal`、`messaging` 或 `coding` 等工具配置文件 id。                                 |
| `tools.fs.requireWorkspaceOnly` | `tools.fs.workspaceOnly` 和按代理设置的 `tools.fs` 覆盖项 | 设置为 `true` 以要求仅限工作区的文件系统工具姿态。                                         |
| `tools.exec.allowSecurity`      | `tools.exec.security` 和按代理设置的 exec security           | 仅允许 `deny` 或 `allowlist` 等 exec 安全模式。                                            |
| `tools.exec.requireAsk`         | `tools.exec.ask` 和按代理设置的 exec ask 模式                | 要求 `always` 等审批姿态。                                                               |
| `tools.exec.allowHosts`         | `tools.exec.host` 和按代理设置的 exec 主机路由           | 仅允许 `sandbox` 等 exec 主机路由模式。                                                    |
| `tools.elevated.allow`          | `tools.elevated.enabled` 和按代理设置的 elevated 姿态     | 设置为 `false` 以要求保持禁用提升的工具模式。                                           |
| `tools.alsoAllow.expected`      | `tools.alsoAllow` 和按代理设置的 `tools.alsoAllow`           | 要求精确的 `alsoAllow` 条目，并报告缺失或意外的附加工具授权。                 |
| `tools.denyTools`               | `tools.deny` 和 `agents.entries.*.tools.deny`              | 要求配置的工具拒绝列表包含 `group:runtime` 和 `group:fs` 等工具 id 或工具组。 |

工具要求使用相同的组成员身份、别名和 `*` 匹配作为核心工具策略。例如，`group:fs`包含`ls`，`group:runtime`包含`secrets`，`cron`解析为`automations`，图像理解工具为`view_image`。所需的拒绝列表必须涵盖所需组中的每个工具；空列表不包含任何内容，并且否认 `write` 并不否认 `apply_patch`。
