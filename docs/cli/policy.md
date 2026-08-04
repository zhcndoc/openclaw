---
summary: "openclaw policy 一致性检查的 CLI 参考"
read_when:
  - 你想将 OpenClaw 设置与编写的 policy.jsonc 进行比对
  - 你希望在 doctor lint 中查看策略发现
  - 你需要用于审计证据的策略证明哈希
title: "策略"
---

# `openclaw policy`

`openclaw policy` 由捆绑的 Policy 插件提供。它是现有 OpenClaw 设置之上的企业一致性层，而不是第二套配置系统。你在 `policy.jsonc` 中编写要求；OpenClaw 观察活动工作区作为证据；策略通过 `doctor --lint` 报告偏差。Policy 不会在请求时强制执行工具调用或重写运行时行为，也不会为诸如 `auth-profiles.json` 之类的每个代理凭据存储提供证明。

策略检查已配置的通道、MCP 服务器、模型提供方、网络 SSRF
防护态势、入口/通道访问、Gateway 暴露和节点命令态势、
作者消息路由探针、
代理工作区访问、沙箱态势、数据处理态势、密钥
提供方/auth profile 态势，以及受治理的工具元数据（`AGENTS.md` 中的 `## Tools` 部分）。当工作区需要一份持久、可检查的声明时使用它，例如“Telegram 不得
启用”或“受治理的工具必须声明风险和所有者元数据”。如果你
只需要没有证明或漂移检测的本地行为，普通配置就足够了。

另外，[`openclaw agent exec`](/cli/agent#agent-exec) 会为每次运行应用一个隔离的
隐式策略配置：代理沙箱关闭，Gateway 主机执行完全允许，并且文件系统工具仅限于 `--cwd`】【。

## 快速开始

```bash
openclaw plugins enable policy
```

即使 `policy.jsonc` 缺失，插件也会保持启用状态，因此 doctor 可以报告缺失的工件，而不是静默跳过检查。

请手动编写 `policy.jsonc`；它不会根据当前设置自动生成。每个顶级 section 都是一个规则命名空间：只有在其中存在具体规则时，检查才会运行（不支持的 section 或键会以 `policy/policy-jsonc-invalid` 失败，而不是被静默忽略）。覆盖所有受支持 section 的最小示例如下：

```jsonc
{
  "channels": {
    "denyRules": [
      {
        "id": "no-telegram",
        "when": { "provider": "telegram" },
        "reason": "Telegram 未被此工作区批准。",
      },
    ],
  },
  "mcp": {
    "servers": {
      "allow": ["docs"],
      "deny": ["untrusted"],
    },
  },
  "models": {
    "providers": {
      "allow": ["openai", "anthropic"],
      "deny": ["openrouter"],
    },
  },
  "network": {
    "privateNetwork": {
      "allow": false,
    },
  },
  "routing": {
    "requireBindings": true,
    "requireConfiguredChannels": true,
    "probes": [
      {
        "id": "family-dm",
        "route": {
          "channel": "imessage",
          "peer": { "kind": "direct", "id": "+15555550123" },
        },
        "expect": {
          "agentId": "family",
          "matchedBy": ["binding.peer"],
        },
      },
    ],
  },
  "ingress": {
    "session": {
      "requireDmScope": "per-channel-peer",
    },
    "channels": {
      "allowDmPolicies": ["pairing", "allowlist", "disabled"],
      "denyOpenGroups": true,
      "requireMentionInGroups": true,
    },
  },
  "gateway": {
    "exposure": {
      "allowNonLoopbackBind": false,
      "allowTailscaleFunnel": false,
    },
    "auth": {
      "requireAuth": true,
      "requireExplicitRateLimit": true,
    },
    "controlUi": {
      "allowInsecure": false,
    },
    "remote": {
      "allow": false,
    },
    "http": {
      "denyEndpoints": ["chatCompletions", "responses"],
      "requireUrlAllowlists": true,
    },
    "nodes": {
      "denyCommands": ["system.run"],
    },
  },
  "agents": {
    "workspace": {
      "allowedAccess": ["none", "ro"],
      "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
    },
  },
  "dataHandling": {
    "sensitiveLogging": {
      "requireRedaction": true,
    },
    "telemetry": {
      "denyContentCapture": true,
    },
    "retention": {
      "requireSessionMaintenance": true,
    },
    "memory": {
      "denySessionTranscriptIndexing": true,
    },
  },
  "secrets": {
    "requireManagedProviders": true,
    "denySources": ["exec"],
    "allowInsecureProviders": false,
  },
  "auth": {
    "profiles": {
      "requireMetadata": ["provider", "mode"],
      "allowModes": ["api_key", "token"],
    },
  },
  "execApprovals": {
    "requireFile": true,
    "defaults": { "allowSecurity": ["deny"] },
    "agents": {
      "allowSecurity": ["deny", "allowlist"],
      "allowAutoAllowSkills": false,
      "allowlist": { "expected": ["deploy", "status"] },
    },
  },
  "tools": {
    "requireMetadata": ["risk", "sensitivity", "owner"],
    "profiles": {
      "allow": ["messaging", "minimal"],
    },
    "fs": {
      "requireWorkspaceOnly": true,
    },
    "exec": {
      "allowSecurity": ["deny", "allowlist"],
      "requireAsk": ["always"],
      "allowHosts": ["sandbox"],
    },
    "elevated": {
      "allow": false,
    },
    "denyTools": ["group:runtime", "group:fs"],
  },
}
```

以下是规则表中不太明显的跨领域说明：

- 如果在禁止非回环绑定时省略 `gateway.bind`，则表示你接受运行时默认值；若要严格符合要求，请将 `gateway.bind` 设为 `"loopback"`。
- 对于只读代理，请在适用的默认设置/代理上将沙箱 `mode` 设为 `all` 或 `non-main`，并将 `workspaceAccess` 设为 `none` 或 `ro`。缺失或为 `off` 的沙箱模式不满足只读策略。
- `agents.workspace.denyTools` 接受 `exec`、`process`、`write`、`edit`、`apply_patch`。配置中的工具拒绝组 `group:fs`（文件修改）和 `group:runtime`（shell/进程）可满足等效的安全姿态。
- 当存在 `execApprovals` 规则时，exec-approvals 检查只读取实时 SQLite approvals 文档；缺失或无效的工件属于不可观测证据，而不是人为构造的通过结果。
- secrets 和 auth-profile 证据仅记录 provider/source 姿态以及 SecretRef 元数据，绝不记录原始值。Policy 不会读取或证明按代理分开的凭据存储，例如 `auth-profiles.json`。
- data-handling 证据是配置级别的姿态（telemetry 捕获开关、session maintenance 模式、transcript-indexing 设置）以及始终开启的日志脱敏不变量。它不会检查日志、telemetry 导出、转录内容或 memory 文件，而干净的结果也不能证明其中不存在个人数据或密钥。
- routing probes 会复用 OpenClaw 的运行时 binding resolver。Routing 证据仅记录 probe id、解析出的代理、匹配类型以及经过脱敏的 binding 元数据。它绝不会记录 peer、account、guild、team 或 role 标识符。添加 routing section 会有意改变 policy 和 attestation 哈希；不包含 routing 的 policies 会保留其现有的证据形态。

### Policy 规则参考

下面的每条规则都是可选的；只有当规则存在时才会运行检查。已观察到的状态是现有的 OpenClaw 配置或工作区元数据。

#### 作用域覆盖

当特定代理或通道需要比顶层基线更严格的策略时，请使用 `scopes.<scopeName>`。作用域名称只是一个标签；匹配使用作用域内的选择器。覆盖是叠加式的：全局规则仍会运行，而作用域规则可以基于相同证据添加自己的发现。

| 选择器       | 支持的部分                                                                     | 适用场景                                          |
| ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| `agentIds`   | `tools`、`agents.workspace`、`sandbox`、`dataHandling.memory`、`execApprovals` | 一个或多个运行时代理需要更严格的规则。            |
| `channelIds` | `ingress.channels`                                                             | 一个或多个通道需要更严格的入口规则。              |

如果 `agentIds` 条目不在 `agents.entries.*` 中出现，OpenClaw 会针对该运行时代理 id 的继承全局/默认姿态来评估该作用域规则，而不是跳过它。

```jsonc
{
  "tools": {
    "exec": {
      "allowHosts": ["sandbox", "node"],
    },
  },
  "sandbox": {
    "requireMode": ["all", "non-main"],
  },
  "scopes": {
    "release-workspace": {
      "agentIds": ["release-agent", "review-agent"],
      "agents": {
        "workspace": {
          "allowedAccess": ["none", "ro"],
        },
      },
    },
    "release-lockdown": {
      "agentIds": ["release-agent"],
      "tools": {
        "exec": {
          "allowHosts": ["sandbox"],
          "allowSecurity": ["deny", "allowlist"],
          "requireAsk": ["always"],
        },
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
      "sandbox": {
        "requireMode": ["all"],
        "allowBackends": ["docker"],
      },
      "dataHandling": {
        "memory": {
          "denySessionTranscriptIndexing": true,
        },
      },
    },
    "shell-sandbox": {
      "agentIds": ["shell-agent"],
      "sandbox": {
        "allowBackends": ["openshell"],
        "containers": {
          "requireReadOnlyMounts": false,
        },
      },
    },
    "telegram-ingress": {
      "channelIds": ["telegram"],
      "ingress": {
        "channels": {
          "allowDmPolicies": ["pairing"],
          "denyOpenGroups": true,
          "requireMentionInGroups": true,
        },
      },
    },
  },
}
```

如果每个作用域管辖的是不同字段，那么同一个代理可以出现在多个作用域中，如上所示。对于同一个代理重复出现的作用域字段必须同样或更严格；更宽松的重复声明会被拒绝（允许列表必须是子集，拒绝列表必须是超集，必需布尔值必须固定）。

容器姿态规则（`sandbox.containers.*`）仅根据匹配代理的 sandbox 后端能够暴露的证据进行检查。Docker 和 Podman 后端会暴露相同的 `sandbox.docker.*` 容器姿态设置。如果某个后端无法观察到为其启用的规则，策略会报告 `policy/sandbox-container-posture-unobservable`，而不是判定通过；应将容器规则限定在使用能够暴露这些规则的后端的代理组中。

后端授权使用已配置的身份。`backend: "docker"` 要求 `allowBackends: ["docker"]`，而 `backend: "podman"` 要求 `allowBackends: ["podman"]`。

顶层的 `ingress.session.requireDmScope` 保持全局生效；`session.dmScope` 不是可归属于通道的证据，因此不能通过 `channelIds` 设置作用域。

`policy.jsonc` 中出现的每个 scope 都必须有效且可执行。

#### 通道

| Policy 字段                           | 观察到的状态                         | 适用场景                                                   |
| ------------------------------------ | ----------------------------------- | ---------------------------------------------------------- |
| `channels.denyRules[].when.provider` | `channels.*` provider 和启用状态     | 拒绝来自例如 `telegram` 之类 provider 的已配置 channels。 |
| `channels.denyRules[].reason`        | 发现消息和修复提示上下文             | 解释为什么该 provider 被拒绝。                            |

#### MCP 服务器

| Policy 字段        | 观察到的状态      | 适用场景                                                   |
| ------------------- | ------------------- | ---------------------------------------------------------- |
| `mcp.servers.allow` | `mcp.servers.*` ids | 要求每个已配置的 MCP server 都在允许列表中。               |
| `mcp.servers.deny`  | `mcp.servers.*` ids | 拒绝特定的已配置 MCP server ids。                          |

#### 模型提供方

| Policy 字段             | 观察到的状态                                   | 适用场景                                                                    |
| ------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------- |
| `models.providers.allow` | `models.providers.*` ids 和已选模型引用          | 要求已配置 provider 和已选模型引用使用已批准的 provider。                  |
| `models.providers.deny`  | `models.providers.*` ids 和已选模型引用          | 按 provider id 拒绝已配置 provider 和已选模型引用。                        |

#### 网络

| Policy 字段                   | 观察到的状态                      | 适用场景                                                           |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------ |
| `network.privateNetwork.allow` | 私有网络 SSRF 逃逸通道              | 设置为 `false` 以要求私有网络访问保持禁用。                       |

#### 消息路由

| Policy 字段                        | 观察到的状态                                      | 适用场景                                                               |
| ----------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `routing.requireBindings`           | 通道路由绑定，不包括 ACP 绑定                      | 要求至少存在一个消息路由绑定。                                         |
| `routing.requireConfiguredChannels` | 绑定通道 id 和已配置的 `channels.*` id             | 检测已失效或拼写错误的绑定通道 id。                                    |
| `routing.probes[].route`            | OpenClaw 的公共路由解析器                          | 描述一个代表性的入站路由，而不发送消息。                               |
| `routing.probes[].expect.agentId`   | 已解析的代理 id                                    | 要求路由到达经过审查的代理。                                           |
| `routing.probes[].expect.matchedBy` | 解析器匹配类型                                    | 要求使用经过审查的绑定特异性，例如 peer、account、channel 或其他类型。 |

探测 id 必须唯一。路由支持 `channel`、可选的 `accountId`、`peer`、`parentPeer`、`guildId`、`teamId` 和 `memberRoleIds`。Peer 类型为 `direct`、`group` 和 `channel`。`matchedBy` 可以包含一个或多个运行时匹配类型，包括 `binding.peer`、`binding.account`、`binding.channel` 或 `default`。

路由检查仅用于一致性验证。它们不会改变启动、消息投递、绑定优先级或回退行为。发现项需要操作员审查，因为自动更改绑定可能会重定向私信。

#### 入口和通道访问

| Policy 字段                              | 观察到的状态                                                 | 适用场景                                                           |
| ----------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| `ingress.session.requireDmScope`          | `session.dmScope`                                              | 要求经过审查的 direct-message 隔离范围。                           |
| `ingress.channels.allowDmPolicies`        | `channels.*.dmPolicy` 和旧版通道 DM policy 字段                | 仅允许经过审查的 direct-message 通道策略。                         |
| `ingress.channels.denyOpenGroups`         | 通道、账户和群组入口策略                                        | 拒绝已配置 channels 和 accounts 的开放群组入口。                    |
| `ingress.channels.requireMentionInGroups` | 通道、账户、群组、guild 和嵌套的提及门控配置                    | 当群组入口处于开放状态或需要提及门控时，要求启用提及门控。          |

#### 网关

| Policy 字段                            | 观察到的状态                                | 适用场景                                                                             |
| --------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| `gateway.exposure.allowNonLoopbackBind` | `gateway.bind`                                | 设置为 `false` 以要求网关绑定到回环地址。                                            |
| `gateway.exposure.allowTailscaleFunnel` | Tailscale serve/funnel 网关姿态               | 设置为 `false` 以拒绝 Tailscale Funnel 暴露。                                        |
| `gateway.auth.requireAuth`              | `gateway.auth.mode`                           | 设置为 `true` 以拒绝禁用网关身份验证的配置。                                         |
| `gateway.auth.requireExplicitRateLimit` | `gateway.auth.rateLimit`                      | 设置为 `true` 以要求显式配置身份验证速率限制。                                      |
| `gateway.controlUi.allowInsecure`       | 设备身份不变量和来源回退                      | 设置为 `false` 以要求设备身份，并拒绝 Host 标头来源回退。                            |
| `gateway.remote.allow`                  | 远程网关模式/配置                             | 设置为 `false` 以拒绝远程网关模式。                                                  |
| `gateway.http.denyEndpoints`            | 网关 HTTP API 端点                             | 拒绝 `chatCompletions` 或 `responses` 等端点 id。                                    |
| `gateway.http.requireUrlAllowlists`     | 网关 HTTP URL 获取输入                        | 设置为 `true` 以要求在 URL 获取输入上配置 URL 允许列表。                             |
| `gateway.nodes.denyCommands`            | `gateway.nodes.commands.deny`                 | 要求在 OpenClaw 配置中明确拒绝 `system.run` 等精确的节点命令 id。                    |

`gateway.nodes.denyCommands` 是一个精确、区分大小写的策略拒绝超集规则。
当 policy 必须证明特权节点命令已被 OpenClaw 配置明确拒绝时，请使用它。
对于故意允许某个特权节点命令的部署，应在审查后更新 `policy.jsonc`，而不是仅依赖 `gateway.nodes.commands.allow`。

#### 代理工作区

| Policy 字段                     | 观察到的状态                                                                           | 适用场景                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `agents.workspace.allowedAccess` | `agents.defaults.sandbox.workspaceAccess` 和 `agents.entries.*.sandbox.workspaceAccess` | 仅允许 `none` 或 `ro` 等 sandbox 工作区访问值。                                         |
| `agents.workspace.denyTools`     | 全局及按代理设置的工具拒绝配置                                                            | 要求拒绝变更工具（`exec`、`process`、`write`、`edit`、`apply_patch`）。                  |

#### Sandbox 姿态

| Policy 字段                                          | 观察到的状态                                          | 适用场景                                                           |
| ----------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| `sandbox.requireMode`                                 | `agents.defaults.sandbox.mode` 和按代理设置的 mode       | 仅允许 `all` 或 `non-main` 等经过审查的 sandbox 模式。              |
| `sandbox.allowBackends`                               | `agents.defaults.sandbox.backend` 和按代理设置的 backend | 仅允许 `docker` 或 `podman` 等经过审查的 sandbox 后端。             |
| `sandbox.containers.denyHostNetwork`                  | 基于容器的 sandbox/浏览器网络模式                       | 拒绝主机网络模式。                                                  |
| `sandbox.containers.denyContainerNamespaceJoin`       | 基于容器的 sandbox/浏览器网络模式                       | 拒绝加入其他容器的网络命名空间。                                    |
| `sandbox.containers.requireReadOnlyMounts`            | 基于容器的 sandbox/浏览器挂载模式                       | 要求挂载为只读。                                                    |
| `sandbox.containers.denyContainerRuntimeSocketMounts` | 基于容器的 sandbox/浏览器挂载目标                       | 拒绝挂载容器运行时套接字。                                          |
| `sandbox.containers.denyUnconfinedProfiles`           | 容器安全配置文件姿态                                   | 拒绝不受限的容器安全配置文件。                                      |
| `sandbox.browser.requireCdpSourceRange`               | Sandbox 浏览器 CDP 源范围                              | 要求浏览器 CDP 暴露声明源范围。                                     |

策略将缺失的 `sandbox.mode` 视为其隐含默认值 `off`，因此 `sandbox.requireMode` 会将新建或未配置的 sandbox 视为不在诸如 `["all"]` 之类的允许列表中。

#### 数据处理

| Policy 字段                                        | 观察到的状态                                                                                     | 适用场景                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `dataHandling.sensitiveLogging.requireRedaction`    | 运行时不变量 `oc://openclaw.invariant/logging/redaction`                                             | 设置为 `true` 以记录该要求；OpenClaw 始终满足它。                       |
| `dataHandling.telemetry.denyContentCapture`         | `diagnostics.otel.captureContent`                                                                  | 设置为 `true` 以拒绝遥测内容捕获。                                     |
| `dataHandling.retention.requireSessionMaintenance`  | `session.maintenance.mode`                                                                         | 设置为 `true` 以要求有效的会话维护模式为 `enforce`。                   |
| `dataHandling.memory.denySessionTranscriptIndexing` | `memory.qmd.sessions.enabled`、`memory.search.experimental.sessionMemory` 和按代理设置的覆盖项 | 设置为 `true` 以拒绝将会话记录索引到内存中。                           |

#### Secrets

| Policy 字段                      | 观察到的状态                                           | 适用场景                                                                |
| --------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `secrets.requireManagedProviders` | 已配置的 SecretRefs 和 `secrets.providers.*` 声明         | 设置为 `true` 以要求 SecretRefs 指向已声明的 provider。                 |
| `secrets.denySources`             | secret provider 来源和 SecretRef 来源                    | 拒绝诸如 `exec`、`file` 或其他已配置来源名称。                           |
| `secrets.allowInsecureProviders`  | 不安全 secret-provider 姿态标志                         | 设置为 `false` 以拒绝选择进入不安全姿态的 provider。                    |

#### Exec approvals

Exec-approvals 检查默认读取运行时 `exec_approvals_config` 单例行，位置在 `~/.openclaw/state/openclaw.sqlite`；当设置了 `OPENCLAW_STATE_DIR` 时，则读取 `$OPENCLAW_STATE_DIR/state` 下的同一数据库。发现项会保留稳定的 `oc://exec-approvals.json/...` URI 方案；现在它表示该行中存储的权威 JSON 文档内的路径。
`execApprovals.defaults.*` 或 `execApprovals.agents.*` 下的姿态规则需要可读的工件证据；缺失或无效的工件会被报告为不可观察证据，而不是尽力通过。一旦可读，省略字段会继承运行时默认值：缺失的 `defaults.security` 为 `full`，缺失的代理 security 也会继承该默认值。证据包括 `defaults`、`agents.*`、`agents.*.allowlist[].pattern`、可选的 `argPattern`、有效的 `autoAllowSkills` 姿态以及条目来源——绝不包括 socket 路径/token、`commandText`、`lastUsedCommand`、解析后的路径或时间戳。

| Policy 字段                                | 观察到的状态                                                                         | 适用场景                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `execApprovals.requireFile`                 | 活跃运行时的 `exec_approvals_config` 行                                                | 设置为 `true` 以要求 approvals 文档存在且可解析。                                        |
| `execApprovals.defaults.allowSecurity`      | `defaults.security`，默认为 `full`                                                     | 仅允许经过批准的默认审批安全模式。                                                      |
| `execApprovals.agents.allowSecurity`        | `agents.*.security`，继承 defaults                                                     | 仅允许经过批准的按代理设置的有效审批安全模式。                                           |
| `execApprovals.agents.allowAutoAllowSkills` | `defaults.autoAllowSkills` 和 `agents.*.autoAllowSkills`，继承运行时默认值                | 设置为 `false` 以要求严格的手动允许列表，不隐式批准 skill CLI。                          |
| `execApprovals.agents.allowlist.expected`   | 汇总的 `agents.*.allowlist[]` pattern 和可选的 argPattern 条目                          | 要求 approvals 允许列表与经过审查的模式集合匹配。                                       |

示例：要求 approvals 工件、拒绝宽松默认值，并仅允许为选定代理审查过的 exec approval 姿态。

```jsonc
{
  "execApprovals": {
    "requireFile": true,
    "defaults": {
      // 安全模式："deny"、"allowlist" 或 "full"。
      // 此默认值只允许锁定下来的 deny 姿态。
      "allowSecurity": ["deny"],
    },
  },
  "scopes": {
    "restricted-shell": {
      "agentIds": ["family-agent", "groups-agent"],
      "execApprovals": {
        "agents": {
          // 选定代理可以使用经过审查的 allowlist 姿态，但不能使用 "full"。
          "allowSecurity": ["allowlist"],
          // false 表示 skill CLI 必须出现在经过审查的 allowlist 中，
          // 而不是由 autoAllowSkills 隐式批准。
          "allowAutoAllowSkills": false,
          "allowlist": {
            "expected": [
              // 简单条目：精确的经过审查的可执行文件模式，不带 argPattern。
              "travel-hub",
              // 受限条目：模式加上经过审查的参数正则。
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

#### 身份验证配置

| Policy 字段                    | 观察到的状态                               | 适用场景                                                                                   |
| ------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `auth.profiles.requireMetadata` | `auth.profiles.*` provider 和 mode 元数据    | 要求配置 auth profile 上存在诸如 `provider` 和 `mode` 之类的元数据键。                    |
| `auth.profiles.allowModes`      | `auth.profiles.*.mode`                       | 仅允许受支持的 auth profile 模式，例如 `api_key`、`aws-sdk`、`oauth` 或 `token`。        |

#### 工具元数据

| Policy 字段            | 观察到的状态                         | 适用场景                                                                                   |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `tools.requireMetadata` | 受管控的 `AGENTS.md` 工具声明          | 要求受管控工具声明 `risk`、`sensitivity` 或 `owner` 等元数据键。                         |

#### 工具姿态

| Policy 字段                    | 观察到的状态                                              | 适用场景                                                                                                 |
| ------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `tools.profiles.allow`          | `tools.profile` 和 `agents.entries.*.tools.profile`        | 仅允许 `minimal`、`messaging` 或 `coding` 等工具配置文件 id。                                             |
| `tools.fs.requireWorkspaceOnly` | `tools.fs.workspaceOnly` 和按代理设置的 `tools.fs` 覆盖项 | 设置为 `true` 以要求仅限工作区的文件系统工具姿态。                                                       |
| `tools.exec.allowSecurity`      | `tools.exec.security` 和按代理设置的 exec security         | 仅允许 `deny` 或 `allowlist` 等 exec 安全模式。                                                          |
| `tools.exec.requireAsk`         | `tools.exec.ask` 和按代理设置的 exec ask 模式              | 要求 `always` 等审批姿态。                                                                              |
| `tools.exec.allowHosts`         | `tools.exec.host` 和按代理设置的 exec 主机路由             | 仅允许 `sandbox` 等 exec 主机路由模式。                                                                 |
| `tools.elevated.allow`          | `tools.elevated.enabled` 和按代理设置的 elevated 姿态     | 设置为 `false` 以要求保持禁用提升的工具模式。                                                           |
| `tools.alsoAllow.expected`      | `tools.alsoAllow` 和按代理设置的 `tools.alsoAllow`         | 要求精确的 `alsoAllow` 条目，并报告缺失或意外的附加工具授权。                                            |
| `tools.denyTools`               | `tools.deny` 和 `agents.entries.*.tools.deny`              | 要求配置的工具拒绝列表包含 `group:runtime` 和 `group:fs` 等工具 id 或工具组。                           |

## 运行检查

在编写期间运行仅策略检查：

```bash
openclaw policy check
openclaw policy check --json
openclaw policy check --severity-min error
```

`policy check` 仅运行策略检查集，并输出证据、发现项，
以及证明哈希。当启用 Policy 插件时，相同的发现项也会出现在
`openclaw doctor --lint` 中。

将运算符策略文件与已编写的基线进行比较：

```bash
openclaw policy compare --baseline official.policy.jsonc
openclaw policy compare --baseline official.policy.jsonc --policy policy.jsonc --json
```

`policy compare` 会根据策略文件语法检查策略文件语法；它不会检查运行时状态、证据、凭据或机密信息。它使用与作用域覆盖相同的规则元数据：允许列表必须保持相等或更窄，拒绝列表必须保持相等或更宽，必需布尔值必须保持其值，排序字符串只能朝着配置顺序中更严格的一端移动，而精确列表必须匹配。基线可以是组织编写的策略；被检查的策略可以添加更严格的值或额外规则。当它同样或更具限制性时，顶层被检查规则可以满足作用域基线规则。作用域名称在文件之间不需要匹配；比较以选择器（`agentIds`/`channelIds`）和字段为键。对于路由探针，每个基线探针 id 必须保持相同的路由和期望代理。被检查的策略可以添加探针或收紧 `matchedBy`，但删除探针、改变其路由或代理，或放宽其可接受的匹配类型，都会更弱。

干净的比较（`--json`）：

```json
{
  "ok": true,
  "baselinePath": "official.policy.jsonc",
  "policyPath": "policy.jsonc",
  "rulesChecked": 3,
  "findings": []
}
```

干净的 `policy check --json` 输出包含运算符或
监督者可记录的稳定哈希：

```json
{
  "ok": true,
  "attestation": {
    "policy": {
      "path": "policy.jsonc",
      "hash": "sha256:..."
    },
    "workspace": {
      "scope": "policy",
      "hash": "sha256:..."
    },
    "findingsHash": "sha256:...",
    "attestationHash": "sha256:..."
  },
  "checksRun": 5,
  "checksSkipped": 0,
  "findings": []
}
```

## 配置策略

策略配置位于 `plugins.entries.policy.config`。

```jsonc
{
  "plugins": {
    "entries": {
      "policy": {
        "enabled": true,
        "config": {
          "enabled": true,
          "path": "policy.jsonc",
          "workspaceRepairs": false,
          "expectedHash": "sha256:...",
          "expectedAttestationHash": "sha256:...",
        },
      },
    },
  },
}
```

| 设置                      | 目的                                                          |
| ------------------------- | ------------------------------------------------------------- |
| `enabled`                 | 即使 `policy.jsonc` 尚不存在，也启用策略检查。                 |
| `workspaceRepairs`        | 允许 `doctor --fix` 编辑受策略管理的工作区设置。               |
| `expectedHash`            | 已批准策略制品的可选哈希锁。                                  |
| `expectedAttestationHash` | 上次接受的干净策略检查结果的可选哈希锁。                      |
| `path`                    | 策略制品在工作区中的相对路径。                                |

将 `plugins.entries.policy.config.enabled` 设置为 `false`，即可在保留插件安装的同时，为某个工作区禁用策略检查。

## 接受策略状态

示例 JSON 输出：

```json
{
  "ok": true,
  "attestation": {
    "checkedAt": "2026-05-10T20:00:00.000Z",
    "policy": {
      "path": "policy.jsonc",
      "hash": "sha256:..."
    },
    "workspace": {
      "scope": "policy",
      "hash": "sha256:..."
    },
    "findingsHash": "sha256:...",
    "attestationHash": "sha256:..."
  },
  "evidence": {
    "channels": [
      {
        "id": "telegram",
        "provider": "telegram",
        "source": "oc://openclaw.config/channels/telegram",
        "enabled": false
      }
    ],
    "mcpServers": [
      {
        "id": "docs",
        "transport": "stdio",
        "source": "oc://openclaw.config/mcp/servers/docs",
        "command": "npx"
      }
    ],
    "modelProviders": [
      {
        "id": "openai",
        "source": "oc://openclaw.config/models/providers/openai"
      }
    ],
    "modelRefs": [
      {
        "ref": "openai/gpt-5.6-sol",
        "provider": "openai",
        "model": "gpt-5.6-sol",
        "source": "oc://openclaw.config/agents/defaults/model"
      }
    ],
    "network": [
      {
        "id": "browser-private-network",
        "source": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
        "value": false
      }
    ],
    "gatewayExposure": [
      {
        "id": "gateway-bind",
        "kind": "bind",
        "source": "oc://openclaw.config/gateway/bind",
        "value": "loopback",
        "nonLoopback": false,
        "explicit": true
      }
    ],
    "agentWorkspace": [
      {
        "id": "agents-defaults-workspace-access",
        "kind": "workspaceAccess",
        "source": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
        "scope": "defaults",
        "value": "ro",
        "sandboxMode": "all",
        "sandboxModeSource": "oc://openclaw.config/agents/defaults/sandbox/mode",
        "sandboxEnabled": true,
        "explicit": true
      },
      {
        "id": "agents-defaults-tool-exec",
        "kind": "toolDeny",
        "source": "oc://openclaw.config/tools/deny",
        "scope": "defaults",
        "tool": "exec",
        "denied": true,
        "explicit": true
      }
    ],
    "secrets": [
      {
        "id": "vault",
        "kind": "provider",
        "source": "oc://openclaw.config/secrets/providers/vault",
        "providerSource": "env"
      },
      {
        "id": "oc://openclaw.config/models/providers/openai/apiKey",
        "kind": "input",
        "source": "oc://openclaw.config/models/providers/openai/apiKey",
        "provenance": "secretRef",
        "refSource": "env",
        "refProvider": "vault"
      }
    ],
    "authProfiles": [
      {
        "id": "github",
        "source": "oc://openclaw.config/auth/profiles/github",
        "validMetadata": true,
        "provider": "github",
        "mode": "token"
      }
    ],
    "tools": [
      {
        "id": "deploy",
        "source": "oc://AGENTS.md/tools/deploy",
        "line": 12,
        "risk": "critical",
        "sensitivity": "restricted",
        "capabilities": ["IRREVERSIBLE_EXTERNAL"]
      }
    ]
  },
  "checksRun": 30,
  "checksSkipped": 0,
  "findings": []
}
```

`attestation.policy.hash` 标识已编写的规则工件。`evidence`
记录检查所使用的已观测 OpenClaw 状态，而
`workspace.hash` 标识该证据负载。`findingsHash` 标识
精确的发现集合。`checkedAt` 记录检查运行时间。
`attestationHash` 标识稳定声明（策略哈希、证据哈希、
发现哈希以及干净/脏状态），并刻意排除 `checkedAt`，
因此相同的策略状态总会生成相同的 attestation hash。这四个值一起构成一次策略检查的审计元组。

如果网关或监督器使用策略来阻止、批准或标注运行时操作，
它应记录最近一次干净检查中的 attestation hash。`checkedAt`
会保留在 JSON 输出中用于审计日志，但不属于稳定哈希的一部分。

接受策略状态的生命周期：

1. 编写或审阅 `policy.jsonc`。
2. 运行 `openclaw policy check --json`。
3. 如果结果干净，记录 `attestation.policy.hash` 作为 `expectedHash`。
4. 记录 `attestation.attestationHash` 作为 `expectedAttestationHash`。
5. 在 CI 或发布门禁中重新运行 `openclaw doctor --lint`。

如果策略规则有意更改，请从一次干净检查中更新这两个已接受哈希。如果只是工作区设置变更（策略保持不变），通常只有 `expectedAttestationHash` 会变化。

启用或升级 `agents.workspace` 规则会将 `agentWorkspace` 证据添加到工作区哈希和 attestation hash 中；启用后请审查新的证据并刷新已接受的 attestation hashes。启用或升级工具姿态规则会以相同方式添加 `toolPosture` 证据。

`openclaw policy watch` 会重新运行检查，并在当前证据不再匹配 `expectedAttestationHash` 时进行报告：

```bash
openclaw policy watch --json
```

在需要单次漂移评估的 CI 或脚本中使用 `--once`。如果不使用 `--once`，默认每两秒轮询一次；可使用 `--interval-ms` 更改轮询间隔。

## 发现项

| 检查 ID                                                   | 发现内容                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `policy/policy-jsonc-missing`                            | 策略已启用，但缺少 `policy.jsonc`。                                                |
| `policy/policy-jsonc-invalid`                            | 策略无法解析，或包含格式错误的规则条目。                                           |
| `policy/policy-hash-mismatch`                            | 策略与配置的 `expectedHash` 不匹配。                                               |
| `policy/attestation-hash-mismatch`                       | 当前策略证据不再与已接受的证明相匹配。                                              |
| `policy/policy-conformance-invalid`                      | 基线策略文件或被检查的策略文件包含无效的比较语法。                                |
| `policy/policy-conformance-missing`                      | 被检查的策略文件缺少基线策略文件所要求的规则。                                      |
| `policy/policy-conformance-weaker`                       | 被检查的策略文件的值比基线策略文件更弱。                                            |
| `policy/channels-denied-provider`                        | 已启用的频道匹配到了一条频道拒绝规则。                                              |
| `policy/mcp-denied-server`                               | 配置的 MCP 服务器被策略拒绝。                                                      |
| `policy/mcp-unapproved-server`                           | 配置的 MCP 服务器不在允许列表中。                                                   |
| `policy/models-denied-provider`                          | 配置的模型提供方或模型引用使用了被拒绝的提供方。                                    |
| `policy/models-unapproved-provider`                      | 配置的模型提供方或模型引用不在允许列表中。                                          |
| `policy/network-private-access-enabled`                  | 当策略拒绝时，启用了私有网络 SSRF 逃逸开关。                                         |
| `policy/routing-bindings-required`                       | 策略要求频道路由绑定，但未进行配置。                                                |
| `policy/routing-binding-channel-unconfigured`            | 路由绑定所命名的频道不存在于 `channels.*` 中。                                      |
| `policy/routing-agent-mismatch`                          | 已编写的路由解析到了不同的 agent。                                                  |
| `policy/routing-match-kind-mismatch`                     | 已编写的路由匹配到了意外的绑定特异性级别。                                          |
| `policy/ingress-dm-policy-unapproved`                    | 频道 DM 策略不在策略允许列表中。                                                    |
| `policy/ingress-dm-scope-unapproved`                     | `session.dmScope` 与策略要求的 DM 隔离范围不匹配。                                  |
| `policy/ingress-open-groups-denied`                      | 频道组策略为 `open`，而策略拒绝开放组入口。                                          |
| `policy/ingress-group-mention-required`                  | 频道或组条目禁用了提及门控，而策略要求启用。                                        |
| `policy/gateway-non-loopback-bind`                       | 当策略拒绝时，网关绑定姿态允许非回环暴露。                                          |
| `policy/gateway-auth-disabled`                           | 当策略要求认证时，网关认证被禁用。                                                  |
| `policy/gateway-rate-limit-missing`                      | 当策略要求时，网关认证限流姿态未明确配置。                                          |
| `policy/gateway-control-ui-insecure`                     | 网关控制 UI 的不安全暴露开关已启用。                                                |
| `policy/gateway-tailscale-funnel`                        | 当策略拒绝时，网关 Tailscale Funnel 暴露已启用。                                     |
| `policy/gateway-remote-enabled`                          | 当策略拒绝时，网关远程模式处于活动状态。                                            |
| `policy/gateway-http-endpoint-enabled`                   | 在策略拒绝时，网关 HTTP API 端点已启用。                                             |
| `policy/gateway-http-url-fetch-unrestricted`             | 网关 HTTP URL 抓取输入缺少必需的 URL 允许列表。                                      |
| `policy/gateway-node-command-denied`                     | 被策略拒绝的网关节点命令未被 OpenClaw 配置拒绝。                                    |
| `policy/agents-workspace-access-denied`                  | agent 沙箱模式或工作区访问超出了策略允许列表。                                      |
| `policy/agents-tool-not-denied`                          | agent 或默认配置未拒绝策略要求拒绝的某个工具。                                      |
| `policy/tools-profile-unapproved`                        | 配置的全局或按 agent 工具配置文件不在允许列表中。                                    |
| `policy/tools-fs-workspace-only-required`                | 文件系统工具未配置为仅限工作区路径姿态。                                            |
| `policy/tools-exec-security-unapproved`                  | exec 安全模式不在策略允许列表中。                                                   |
| `policy/tools-exec-ask-unapproved`                       | exec ask 模式不在策略允许列表中。                                                   |
| `policy/tools-exec-host-unapproved`                      | exec 主机路由不在策略允许列表中。                                                   |
| `policy/tools-elevated-enabled`                          | 当策略拒绝时，已启用提升权限工具模式。                                              |
| `policy/tools-also-allow-missing`                        | 配置的 `alsoAllow` 列表缺少策略要求的条目。                                          |
| `policy/tools-also-allow-unexpected`                     | 配置的 `alsoAllow` 列表包含策略未预期的条目。                                        |
| `policy/tools-required-deny-missing`                     | 全局或按 agent 的工具拒绝列表未包含所需的被拒绝工具。                                |
| `policy/sandbox-mode-unapproved`                         | 沙箱模式不在策略允许列表中。                                                        |
| `policy/sandbox-backend-unapproved`                      | 沙箱后端不在策略允许列表中。                                                        |
| `policy/sandbox-container-posture-unobservable`          | 对某个无法观测的后端启用了容器姿态规则。                                            |
| `policy/sandbox-container-host-network-denied`           | 基于容器的沙箱或浏览器使用了主机网络模式。                                          |
| `policy/sandbox-container-namespace-join-denied`         | 基于容器的沙箱或浏览器加入了另一个容器命名空间。                                    |
| `policy/sandbox-container-mount-mode-required`           | 基于容器的沙箱或浏览器挂载不是只读的。                                              |
| `policy/sandbox-container-runtime-socket-mount`          | 基于容器的沙箱或浏览器挂载暴露了容器运行时 socket。                                  |
| `policy/sandbox-container-unconfined-profile`            | 当策略拒绝时，容器沙箱配置文件为 unconfined。                                        |
| `policy/sandbox-browser-cdp-source-range-missing`        | 当策略要求时，沙箱浏览器 CDP source range 缺失。                                      |
| `policy/data-handling-telemetry-content-capture`         | 当策略拒绝时，遥测内容捕获已启用。                                                  |
| `policy/data-handling-session-retention-not-enforced`    | 当策略要求时，未强制执行会话保留维护。                                              |
| `policy/data-handling-session-transcript-memory-enabled` | 当策略拒绝时，会话转录记忆索引已启用。                                              |
| `policy/secrets-unmanaged-provider`                      | 配置的 SecretRef 引用了未在 `secrets.providers` 下声明的提供方。                     |
| `policy/secrets-denied-provider-source`                  | 配置的 secret 提供方或 SecretRef 使用了被策略拒绝的来源。                           |
| `policy/secrets-insecure-provider`                       | 当策略拒绝时，secret 提供方选择了不安全姿态。                                       |
| `policy/auth-profile-invalid-metadata`                   | 配置的 auth profile 缺少有效的提供方或模式元数据。                                  |
| `policy/auth-profile-unapproved-mode`                    | 配置的 auth profile 模式不在策略允许列表中。                                        |
| `policy/exec-approvals-missing`                          | 策略要求 SQLite exec approvals 文档，但其行缺失。                                   |
| `policy/exec-approvals-invalid`                          | 配置的 SQLite exec approvals 文档无法解析。                                         |
| `policy/exec-approvals-default-security-unapproved`      | exec approval 默认值使用了不在策略允许列表中的安全模式。                            |
| `policy/exec-approvals-agent-security-unapproved`        | 按 agent 生效的 exec approval 安全模式不在允许列表中。                              |
| `policy/exec-approvals-auto-allow-skills-enabled`        | exec approval agent 会隐式自动允许技能 CLI，而策略拒绝这样做。                      |
| `policy/exec-approvals-allowlist-missing`                | approvals 允许列表缺少策略要求的模式。                                              |
| `policy/exec-approvals-allowlist-unexpected`             | approvals 允许列表包含策略未预期的模式。                                            |
| `policy/tools-missing-risk-level`                        | 受治理的工具声明缺少风险元数据。                                                    |
| `policy/tools-unknown-risk-level`                        | 受治理的工具声明使用了未知的风险值。                                                |
| `policy/tools-missing-sensitivity-token`                 | 受治理的工具声明缺少敏感度元数据。                                                  |
| `policy/tools-missing-owner`                             | 受治理的工具声明缺少所有者元数据。                                                  |
| `policy/tools-unknown-sensitivity-token`                 | 受治理的工具声明使用了未知的敏感度值。                                              |

一个发现项可以同时包含 `target`（被观察到的不符合要求的工作区对象）和 `requirement`（使其成为发现项的所编写规则）。
它们目前都是 `oc://` 地址字符串，但字段名描述的是策略角色，而不是地址格式。

发现示例：

```json
{
  "checkId": "policy/channels-denied-provider",
  "severity": "error",
  "message": "频道 'telegram' 使用了被拒绝的提供方 'telegram'。",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/channels/telegram",
  "target": "oc://openclaw.config/channels/telegram",
  "requirement": "oc://policy.jsonc/channels/denyRules/#0",
  "fixHint": "Telegram 未被批准用于此工作区。"
}
```

```json
{
  "checkId": "policy/tools-missing-risk-level",
  "severity": "error",
  "message": "AGENTS.md 工具 'deploy' 没有明确的风险分类。",
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
  "message": "MCP 服务器 'remote' 不在策略允许列表中。",
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
  "message": "模型引用 'anthropic/claude-sonnet-4.7' 使用了未批准的提供方 'anthropic'。",
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
  "message": "网络设置 'browser-private-network' 允许私有网络访问。",
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
  "message": "网关绑定设置 'gateway-bind' 允许非回环暴露。",
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
  "message": "网关节点命令 'system.run' 被策略拒绝，但未被 OpenClaw 配置拒绝。",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/gateway/nodes/commands/deny",
  "target": "oc://openclaw.config/gateway/nodes/commands/deny",
  "requirement": "oc://policy.jsonc/gateway/nodes/denyCommands",
  "fixHint": "将 'system.run' 添加到 gateway.nodes.commands.deny，或在审查后更新策略。"
}
```

```json
{
  "checkId": "policy/agents-workspace-access-denied",
  "severity": "error",
  "message": "agents.defaults 沙箱 workspaceAccess 'rw' 不被策略允许。",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
  "target": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
  "requirement": "oc://policy.jsonc/agents/workspace/allowedAccess"
}
```

## 修复

`doctor --lint` 和 `policy check` 为只读操作。

`doctor --fix` 仅在 `workspaceRepairs` 明确启用时，才会编辑受策略管理的工作区设置；否则，检查会报告它们将会修复的内容，并保持设置不变。

在此版本中，修复可以禁用 `channels.denyRules` 拒绝的通道，并应用下面列出的自动收窄修复。只有在策略文件已审查后才启用 `workspaceRepairs`，因为有效规则可能会更改工作区配置：

- 当全局策略禁止提升权限工具时，将 `tools.elevated.enabled=false`
- 当策略要求拒绝这些工具时，将缺失的必需拒绝工具 ID 添加到 `tools.deny` 或
  `agents.entries.*.tools.deny`
- 将不安全的 `gateway.controlUi.*` 开关设为 `false`
- 当策略禁止远程 gateway 模式时，将 `gateway.mode=local`
- 当策略禁止 Gateway HTTP API 端点时，将报告的 `gateway.http.endpoints.*.enabled` 路径设为 `false`
- 当策略禁止开放的组入口时，将报告的通道入口 `groupPolicy` 路径设为 `allowlist`
- 当策略要求组提及时，将报告的通道入口 `requireMention` 路径设为 `true`
- 当策略禁止遥测内容捕获时，将 `diagnostics.otel.captureContent=false`，或
  对于对象形式的遥测捕获设置，将 `diagnostics.otel.captureContent.enabled=false`

作用域内的提升权限工具修复仅进行检测，不会实际修复。若发现结果报告的是共享遥测配置，则作用域内的数据处理修复也会跳过，因为更改共享设置会影响超出作用域策略目标的范围。

`dataHandling.sensitiveLogging.requireRedaction` 没有检查也没有修复。敏感日志脱敏在 OpenClaw 中是无条件启用的，因此不会有任何内容报告它已被禁用。该键仍然是受支持的策略规则：`openclaw policy` 会验证其结构，`openclaw policy compare` 仍要求候选策略至少与基线一样严格，而 `openclaw policy check` 会在 `dataHandling` 证据和证明中记录运行时不变量 `oc://openclaw.invariant/logging/redaction`，作为满足该要求的证明。

当发现结果报告的是继承的根级 `tools.deny` 时，会跳过作用域内的必需拒绝修复，因为将所需工具添加到根配置会影响超出作用域策略目标的范围。仅限代理本地的必需拒绝修复可以更新报告的 `agents.entries.*.tools.deny` 路径。

若发现结果报告的是继承的 `channels.defaults.*`，则会跳过作用域内的通道入口修复，因为更改共享通道默认值会影响超出作用域策略目标的范围。Gateway HTTP URL 允许列表的发现仍需手动处理，因为自动修复无法选择正确的端点 URL 允许列表值。

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

## 退出代码

| 命令             | `0`                                                    | `1`                                                                 | `2`                          |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------- |
| `policy check`   | 阈值下无发现项。                                       | 一项或多项发现达到了阈值。                                           | 参数或运行时失败。           |
| `policy compare` | 策略文件至少与基线一样严格。                           | 策略文件无效、缺失，或比基线规则更宽松。                             | 参数或运行时失败。           |
| `policy watch`   | 无发现项且已接受的哈希仍为最新。                       | 存在发现项或已接受的证明已过期。                                     | 参数或运行时失败。           |

## 相关

- [Doctor lint 模式](/cli/doctor#lint-mode)
- [Path 命令行工具](/cli/path)
