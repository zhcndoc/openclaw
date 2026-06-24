---
summary: "openclaw policy 一致性检查的 CLI 参考"
read_when:
  - 你想将 OpenClaw 设置与编写的 policy.jsonc 进行比对
  - 你希望在 doctor lint 中查看策略发现
  - 你需要用于审计证据的策略证明哈希
title: "策略"
---

# `openclaw policy`

`openclaw policy` 由捆绑的 Policy 插件提供。Policy 是对现有 OpenClaw 设置之上的企业级一致性层。它不会添加第二套配置系统。`policy.jsonc` 定义编写的要求，OpenClaw 将当前工作区作为证据进行观察，而 policy 健康检查会通过 `doctor --lint` 报告偏差。最终的一致性信号是一次干净的 `doctor --lint` 运行；policy 通过向该共享 lint 表面提供发现结果来贡献，而不是创建单独的健康门禁。

当前，Policy 管理已配置的 channels、MCP servers、模型提供方、网络 SSRF 姿态、入口/channel 访问姿态、Gateway 暴露姿态、agent 工作区姿态、数据处理姿态、OpenClaw 配置 secret provider/auth profile 姿态，以及受治理的 tool 声明。例如，IT 或工作区操作员可以记录 Telegram 不是被批准的 channel provider，限制 MCP servers 和 model refs 仅使用批准条目，要求私有网络 fetch/browser 访问保持禁用，要求 direct-message 会话隔离和 channel ingress 姿态保持在已审查范围内，要求 Gateway 绑定/auth/HTTP 暴露保持在已审查范围内，要求 agent 工作区访问和 tool 拒绝保持在已审查姿态，要求 OpenClaw config SecretRefs 使用受管 provider，要求 config auth profiles 携带 provider/mode 元数据，要求受治理工具携带 risk 和 sensitivity 元数据，要求敏感日志脱敏，禁止遥测内容捕获，要求会话保留维护，禁止会话 transcript 内存索引，然后使用 `doctor --lint` 作为共享的一致性门禁。

当某个工作区需要一条持久声明，例如“这些 channels 不能启用”或“受治理工具必须声明批准元数据”，并且需要一种可重复的方式证明 OpenClaw 仍符合该声明时，请使用 policy。仅当你只需要本地行为，而不需要 policy 发现结果或证明输出时，单独使用常规配置和工作区文档即可。

## 快速开始

首次使用前先启用捆绑的 Policy 插件：

```bash
openclaw plugins enable policy
```

启用 policy 后，doctor 可以在不激活任意插件的情况下加载 policy 健康检查。即使 `policy.jsonc` 缺失，该插件仍保持启用状态，因此 doctor 可以报告缺失的工件。

Policy 是编写出来的，而不是根据用户当前设置生成的。channels、MCP servers、model providers、network posture、ingress/channel access、Gateway exposure、agent workspace posture、configured sandbox runtime posture、OpenClaw data-handling posture、config secret provider/auth profile posture、exec approval file posture 以及 tool metadata 的最小 policy 如下所示：

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

规则是权威。类别块只是命名空间；只有在存在具体规则时才会运行检查。OpenClaw 会将当前 `channels.*` 设置、`mcp.servers.*`、`models.providers.*`、所选 agent 模型引用、网络 SSRF 设置、direct-message 会话范围、channel DM policy、channel group policy、channel/group mention gate、Gateway bind/auth/Control UI/Tailscale/remote/HTTP 姿态、OpenClaw config agent sandbox workspace access 和 tool deny 姿态、data-handling config 姿态、config secret provider 和 SecretRef 来源、config auth profile 元数据、已配置的全局/按 agent tool 姿态，以及 `TOOLS.md` 声明作为证据进行读取，然后报告不符合的观察状态。如果 policy 拒绝非 loopback 的 Gateway 绑定，那么只有在你愿意审查运行时默认值时才省略 `gateway.bind`；为了严格符合配置，请将 `gateway.bind=loopback`。对于只读 agent 姿态，请在适用的默认值或 agent 上配置 sandbox mode，并将 `workspaceAccess` 设为 `none` 或 `ro`；省略或 `off` 的 sandbox mode 不满足只读/不可写 policy。`agents.workspace.denyTools` 支持 `exec`、`process`、`write`、`edit` 和 `apply_patch`；OpenClaw config `group:fs` 覆盖文件修改工具，而 `group:runtime` 覆盖 shell/process 工具。Tool 姿态 policy 会观察 `tools.profile`、`tools.allow`、`tools.alsoAllow`、`tools.deny`、`tools.fs.workspaceOnly`、`tools.exec.security`、`tools.exec.ask`、`tools.exec.host`、`tools.elevated.enabled`，以及相同的按 agent `agents.list[].tools.*` 覆盖项。Exec approval policy 仅在存在 `execApprovals` 规则时读取名为 `exec-approvals.json` 的产品工件；证据会记录 defaults、per-agent 姿态和 allowlist 模式，但不会记录 socket token 或最近使用的命令文本。Policy 不会在运行时强制执行 tool 调用。Secret 证据只记录 provider/source 姿态和 SecretRef 元数据，绝不会记录原始 secret 值。Policy 不会读取或证明每个 agent 的凭据存储（如 `auth-profiles.json`）；这些存储仍由现有的 auth 和 credential 流程负责。
Data-handling 证据仅为 config 级姿态：它检查已配置的 redaction 模式、telemetry content-capture 开关、session maintenance 模式，以及 session-transcript memory indexing 设置。它不会检查原始日志、telemetry 导出、transcript 内容、memory 文件，也不会证明不存在个人数据或 secrets。

### Policy 规则参考

下面每个 policy 字段都是可选的。只有当 `policy.jsonc` 中存在对应规则时，才会运行检查。观察到的状态是现有的 OpenClaw 配置或工作区元数据；policy 会报告偏移，但不会重写运行时行为，除非存在并启用了显式的修复路径。
Policy 文件是严格的：不支持的部分或规则键会被报告为 `policy/policy-jsonc-invalid`，而不是被忽略。

Policy overlays 会保持宽泛的顶层规则为全局规则，然后允许命名作用域块为显式 selector 添加更严格的常规 policy 部分。scope 名称只是描述性分组；匹配使用 scope 内的 selector 值。overlay 是累加式的：全局声明仍然运行，而 scoped 声明可以针对相同观察配置发出自己的发现。

#### Scoped overlays

当一组 agents 或 channels 需要比顶层基线更严格的 policy 时，请使用 `scopes.<scopeName>`。Agent 作用域部分使用 `agentIds`，它支持 `tools.*`、`agents.workspace.*`、`sandbox.*`、`dataHandling.memory.*` 和 `execApprovals.*`。Channel 作用域的 ingress 使用 `channelIds`，它支持 `ingress.channels.*`。不支持的部分会被拒绝，而不是被忽略。如果某个 `agentIds` 条目不在 `agents.list[]` 中，OpenClaw 会针对该运行时 agent id 的继承全局/默认姿态来评估 scoped 规则。

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

同一个 agent 可以出现在多个 scope 中，只要每个 scope 管辖不同字段，如上所示。同一 agent 的重复 scoped 字段必须根据 policy 元数据保持相同或更严格；更弱的重复声明会被拒绝。严格性元数据将 allow-list 视为子集，将 deny-list 视为超集，将 required 布尔值视为固定要求。

Container 姿态 policy 只根据 OpenClaw 能为匹配 agent 观察到的证据进行评估。如果一个启用的 `sandbox.containers.*` 规则应用于其 sandbox backend 无法暴露该字段的 agent，policy 会报告 `policy/sandbox-container-posture-unobservable`，而不是将该声明视为通过。请为使用不同 sandbox backend 的 agent 组使用单独的 `agentIds` scope，并为那些无法观察这些字段的组保留未设置或 false 的不支持 container 规则。

顶层的 `ingress.session.requireDmScope` 仍然是全局的，因为 `session.dmScope` 不是可归因于 channel 的证据。

| Selector     | Supported sections                                                                 | Use when                                          |
| ------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| `agentIds`   | `tools`, `agents.workspace`, `sandbox`, `dataHandling.memory`, and `execApprovals` | One or more runtime agents need stricter rules.   |
| `channelIds` | `ingress.channels`                                                                 | One or more channels need stricter ingress rules. |

`policy.jsonc` 中出现的每个 scope 都必须有效且可执行。

#### Channels

| Policy 字段                           | 观察到的状态                         | 适用场景                                                   |
| ------------------------------------ | ----------------------------------- | ---------------------------------------------------------- |
| `channels.denyRules[].when.provider` | `channels.*` provider 和启用状态     | 拒绝来自例如 `telegram` 之类 provider 的已配置 channels。 |
| `channels.denyRules[].reason`        | 发现消息和修复提示上下文             | 解释为什么该 provider 被拒绝。                            |

#### MCP servers

| Policy 字段        | 观察到的状态      | 适用场景                                                   |
| ------------------- | ------------------- | ---------------------------------------------------------- |
| `mcp.servers.allow` | `mcp.servers.*` ids | 要求每个已配置的 MCP server 都在允许列表中。               |
| `mcp.servers.deny`  | `mcp.servers.*` ids | 拒绝特定的已配置 MCP server ids。                          |

#### Model providers

| Policy 字段             | 观察到的状态                                   | 适用场景                                                                    |
| ------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------- |
| `models.providers.allow` | `models.providers.*` ids 和已选模型引用          | 要求已配置 provider 和已选模型引用使用已批准的 provider。                  |
| `models.providers.deny`  | `models.providers.*` ids 和已选模型引用          | 按 provider id 拒绝已配置 provider 和已选模型引用。                        |

#### Network

| Policy 字段                   | 观察到的状态                      | 适用场景                                                           |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------ |
| `network.privateNetwork.allow` | 私有网络 SSRF 逃逸通道              | 设置为 `false` 以要求私有网络访问保持禁用。                       |

#### Ingress and channel access

| Policy 字段                              | 观察到的状态                                                 | Use when                                                           |
| ----------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| `ingress.session.requireDmScope`          | `session.dmScope`                                              | 要求经过审查的 direct-message 隔离范围。                           |
| `ingress.channels.allowDmPolicies`        | `channels.*.dmPolicy` and legacy channel DM policy fields      | 仅允许经过审查的 direct-message channel policy。                  |
| `ingress.channels.denyOpenGroups`         | Channel, account, and group ingress policy                     | 拒绝已配置 channels 和 accounts 的开放 group ingress。             |
| `ingress.channels.requireMentionInGroups` | Channel, account, group, guild, and nested mention gate config | 当 group ingress 处于开放或需要 mention gate 时，要求 mention gate。 |

#### Gateway

| Policy 字段                            | 观察到的状态                                 | 适用场景                                                     |
| --------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| `gateway.exposure.allowNonLoopbackBind` | `gateway.bind`                                 | 设置为 `false` 以要求 Gateway 仅绑定 loopback。              |
| `gateway.exposure.allowTailscaleFunnel` | Tailscale serve/funnel Gateway 姿态          | 设置为 `false` 以拒绝 Tailscale Funnel 暴露。                |
| `gateway.auth.requireAuth`              | `gateway.auth.mode`                            | 设置为 `true` 以拒绝已禁用的 Gateway auth。                 |
| `gateway.auth.requireExplicitRateLimit` | `gateway.auth.rateLimit`                       | 设置为 `true` 以要求显式的 auth 限流配置。                   |
| `gateway.controlUi.allowInsecure`       | Control UI 不安全 auth/device/origin 切换项   | 设置为 `false` 以拒绝不安全的 Control UI 暴露切换项。        |
| `gateway.remote.allow`                  | Remote Gateway 模式/配置                      | 设置为 `false` 以拒绝 remote Gateway 模式。                  |
| `gateway.http.denyEndpoints`            | Gateway HTTP API endpoints                     | 拒绝诸如 `chatCompletions` 或 `responses` 之类的 endpoint ids。 |
| `gateway.http.requireUrlAllowlists`     | Gateway HTTP URL-fetch 输入                    | 设置为 `true` 以要求 URL-fetch 输入使用 URL 允许列表。      |

#### Agent workspace

| Policy 字段                     | 观察到的状态                                                                        | 适用场景                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `agents.workspace.allowedAccess` | `agents.defaults.sandbox.workspaceAccess` 和 `agents.list[].sandbox.workspaceAccess` | 仅允许诸如 `none` 或 `ro` 之类的 sandbox 工作区访问值。                                                            |
| `agents.workspace.denyTools`     | 全局和按 agent 的工具拒绝配置                                                          | 要求将 `exec`、`process`、`write`、`edit` 或 `apply_patch` 之类的工作区/运行时变更工具设为拒绝。                   |

#### Sandbox posture

| Policy 字段                                          | 观察到的状态                                          | Use when                                                       |
| ----------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| `sandbox.requireMode`                                 | `agents.defaults.sandbox.mode` and per-agent mode       | 仅允许经过审查的 sandbox mode，例如 `all` 或 `non-main`。      |
| `sandbox.allowBackends`                               | `agents.defaults.sandbox.backend` and per-agent backend | 仅允许经过审查的 sandbox backend，例如 `docker`。              |
| `sandbox.containers.denyHostNetwork`                  | Container-backed sandbox/browser network mode           | 拒绝 host network mode。                                        |
| `sandbox.containers.denyContainerNamespaceJoin`       | Container-backed sandbox/browser network mode           | 拒绝加入另一个 container network namespace。                    |
| `sandbox.containers.requireReadOnlyMounts`            | Container-backed sandbox/browser mount mode             | 要求挂载为只读。                                                |
| `sandbox.containers.denyContainerRuntimeSocketMounts` | Container-backed sandbox/browser mount targets          | 拒绝 container runtime socket 挂载。                            |
| `sandbox.containers.denyUnconfinedProfiles`           | Container security profile posture                      | 拒绝 unconfined container security profile。                    |
| `sandbox.browser.requireCdpSourceRange`               | Sandbox browser CDP source range                        | 要求 browser CDP 暴露声明 source range。                        |

Policy 将缺失的 `sandbox.mode` 视为隐式默认值 `off`，因此 `sandbox.requireMode` 会将新建或未配置的 sandbox 视为不在诸如 `["all"]` 之类的允许列表内。

#### Data Handling

| Policy 字段                                        | 观察到的状态                                                                       | Use when                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `dataHandling.sensitiveLogging.requireRedaction`    | `logging.redactSensitive`                                                            | 设置为 `true` 以拒绝 `logging.redactSensitive: "off"`。                |
| `dataHandling.telemetry.denyContentCapture`         | `diagnostics.otel.captureContent`                                                    | 设置为 `true` 以拒绝 telemetry 内容捕获。                               |
| `dataHandling.retention.requireSessionMaintenance`  | `session.maintenance.mode`                                                           | 设置为 `true` 以要求有效的 session maintenance mode 为 `enforce`。    |
| `dataHandling.memory.denySessionTranscriptIndexing` | `memory.qmd.sessions.enabled` and `agents.*.memorySearch.experimental.sessionMemory` | 设置为 `true` 以拒绝将 session transcript 索引到 memory。            |

#### Secrets

| Policy 字段                      | 观察到的状态                                           | 适用场景                                                                |
| --------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `secrets.requireManagedProviders` | 配置的 SecretRefs 和 `secrets.providers.*` 声明         | 设置为 `true` 以要求 SecretRefs 指向已声明的 provider。                 |
| `secrets.denySources`             | secret provider 来源和 SecretRef 来源                    | 拒绝诸如 `exec`、`file` 或其他已配置来源名称。                           |
| `secrets.allowInsecureProviders`  | 不安全 secret-provider 姿态标志                         | 设置为 `false` 以拒绝选择进入不安全姿态的 provider。                    |

#### Exec approvals

Exec approvals policy 观察当前运行时的 `exec-approvals.json` 工件。默认情况下，该工件位于 `~/.openclaw/exec-approvals.json`；当设置了 `OPENCLAW_STATE_DIR` 时，Policy 会读取 `$OPENCLAW_STATE_DIR/exec-approvals.json`。诸如 `execApprovals.defaults.*` 或 `execApprovals.agents.*` 之类的实际姿态规则需要可读的工件证据；缺失或无效的工件会被报告为不可观察证据，而不是使用合成的运行时默认值进行尽力通过。一旦工件可读，省略的 approval 字段会继承运行时默认值：缺失的 `defaults.security` 默认为 `full`，缺失的 agent security 继承该默认值。证据包括 `defaults`、`agents.*` 和 `agents.*.allowlist[].pattern` 及可选的 `argPattern`、有效的 `autoAllowSkills` 姿态以及入口来源。它不包括 socket 路径/token、`commandText`、`lastUsedCommand`、解析后的路径或时间戳。

| Policy field                                | Observed state                                                                         | Use when                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `execApprovals.requireFile`                 | Active runtime `exec-approvals.json` path                                              | 设置为 `true` 以要求 approvals 工件存在且可解析。                                       |
| `execApprovals.defaults.allowSecurity`      | `defaults.security`，默认为 `full`                                                     | 仅允许已批准的默认 approval security mode。                                             |
| `execApprovals.agents.allowSecurity`        | `agents.*.security`，继承 defaults                                                      | 仅允许已批准的按 agent 有效 approval security mode。                                     |
| `execApprovals.agents.allowAutoAllowSkills` | `defaults.autoAllowSkills` 和 `agents.*.autoAllowSkills`，继承运行时默认值             | 设置为 `false` 以要求严格的手动 allowlist，而不是隐式的 skill CLI 批准。                |
| `execApprovals.agents.allowlist.expected`   | 聚合的 `agents.*.allowlist[]` 模式和可选 argPattern 条目                               | 要求 approvals allowlist 与已审查的模式集合匹配。                                       |

例如，要求 approvals 工件、拒绝宽松默认值，并且仅允许选定 agent 使用经过审查的 exec approval 姿态：

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

#### Auth profiles

| Policy 字段                    | 观察到的状态                               | 适用场景                                                                                   |
| ------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `auth.profiles.requireMetadata` | `auth.profiles.*` provider 和 mode 元数据    | 要求配置 auth profile 上存在诸如 `provider` 和 `mode` 之类的元数据键。                    |
| `auth.profiles.allowModes`      | `auth.profiles.*.mode`                       | 仅允许受支持的 auth profile 模式，例如 `api_key`、`aws-sdk`、`oauth` 或 `token`。        |

#### Tool metadata

| Policy 字段            | 观察到的状态                   | 适用场景                                                                                   |
| ----------------------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| `tools.requireMetadata` | 受治理的 `TOOLS.md` 声明         | 要求受治理工具声明诸如 `risk`、`sensitivity` 或 `owner` 之类的元数据键。                   |

#### Tool posture

| Policy 字段                    | 观察到的状态                                              | 适用场景                                                                                                 |
| ------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `tools.profiles.allow`          | `tools.profile` 和 `agents.list[].tools.profile`           | 仅允许诸如 `minimal`、`messaging` 或 `coding` 之类的工具 profile ids。                                 |
| `tools.fs.requireWorkspaceOnly` | `tools.fs.workspaceOnly` 和按 agent 的 `tools.fs` 覆盖项   | 设置为 `true` 以要求仅限工作区的文件系统工具姿态。                                                     |
| `tools.exec.allowSecurity`      | `tools.exec.security` 和按 agent 的 exec 安全性            | 仅允许诸如 `deny` 或 `allowlist` 之类的 exec 安全模式。                                               |
| `tools.exec.requireAsk`         | `tools.exec.ask` 和按 agent 的 exec ask 模式              | 要求诸如 `always` 之类的批准姿态。                                                                      |
| `tools.exec.allowHosts`         | `tools.exec.host` 和按 agent 的 exec host 路由            | 仅允许诸如 `sandbox` 之类的 exec host 路由模式。                                                       |
| `tools.elevated.allow`          | `tools.elevated.enabled` 和按 agent 的 elevated 姿态      | 设置为 `false` 以要求 elevated 工具模式保持禁用。                                                     |
| `tools.alsoAllow.expected`      | `tools.alsoAllow` 和按 agent 的 `tools.alsoAllow`         | 要求精确的 `alsoAllow` 条目，并报告缺失或意外的附加工具授权。                                         |
| `tools.denyTools`               | `tools.deny` 和 `agents.list[].tools.deny`                 | 要求已配置的工具拒绝列表包含诸如 `group:runtime` 和 `group:fs` 之类的工具 ids 或分组。              |

在编写阶段运行仅 policy 的检查：

```bash
openclaw policy check
openclaw policy check --json
openclaw policy check --severity-min error
```

`policy check` 只运行 policy 检查集，并输出证据、发现和证明哈希。当启用了 Policy 插件时，相同的发现也会出现在 `openclaw doctor --lint` 中。

比较 operator policy 文件与已编写的 baseline policy 文件：

```bash
openclaw policy compare --baseline official.policy.jsonc
openclaw policy compare --baseline official.policy.jsonc --policy policy.jsonc --json
```

`policy compare` 比较的是 policy 文件语法与 policy 文件语法。它不会检查 OpenClaw 运行时状态、证据、凭据或 secrets。该命令使用与 scoped overlays 相同的 policy 规则元数据：allowlist 必须保持相同或更窄，denylist 必须保持相同或更宽，required 布尔值必须保持其要求值，排序字符串只能朝配置顺序中更严格的一端移动，精确列表必须匹配。

基线文件可以是组织编写的 policy。被检查的 policy 可以使用更严格的值或添加额外的 policy 规则。顶层的被检查规则也可以满足 scoped baseline 规则，只要它同样或更严格，因为顶层 policy 适用于更广范围。scope 名称不需要匹配；scoped 比较按 selector 值（例如 `agentIds` 或 `channelIds`）以及被检查的 policy 字段进行。

清洁的 compare JSON 输出示例只报告 policy 文件比较状态：

```json
{
  "ok": true,
  "baselinePath": "official.policy.jsonc",
  "policyPath": "policy.jsonc",
  "rulesChecked": 3,
  "findings": []
}
```

清洁的 `policy check --json` 输出示例包含可由操作员或主管记录的稳定哈希：

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

将 `plugins.entries.policy.config.enabled` 设置为 `false` 可在保留插件已安装的情况下，
为某个工作区禁用策略检查。

工具元数据要求在 `policy.jsonc` 中通过 `tools.requireMetadata` 编写，例如
`["风险", "敏感度", "所有者"]`。

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
        "ref": "openai/gpt-5.5",
        "provider": "openai",
        "model": "gpt-5.5",
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
        "source": "oc://TOOLS.md/tools/deploy",
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

策略哈希用于标识已编写的规则制品。evidence 块记录了策略检查所使用的、观察到的 OpenClaw 状态。`workspace.hash` 值标识了该检查范围对应的证据负载。findings 哈希标识检查返回的精确发现集合。`checkedAt` 记录了评估运行的时间。attestation 哈希标识稳定声明：策略哈希、证据哈希、发现哈希，以及结果是否干净。它刻意不包含 `checkedAt`，因此相同的策略状态在重复检查时会产生相同的 attestation。它们共同构成了该策略检查的审计元组。

如果后续网关或监督器使用策略来阻止、批准或标注某个运行时动作，它应记录上一次干净策略检查中的 attestation 哈希。`checkedAt` 会保留在 JSON 输出中用于审计日志，但不属于稳定的 attestation 哈希。

接受策略状态时请使用以下生命周期：

1. 编写或审查 `policy.jsonc`。
2. 运行 `openclaw policy check --json`。
3. 如果结果干净，将 `attestation.policy.hash` 记录为 `expectedHash`。
4. 将 `attestation.attestationHash` 记录为 `expectedAttestationHash`。
5. 在 CI 或发布门禁中重新运行 `openclaw doctor --lint`。

如果策略规则有意更改，请从一次干净检查中更新两个已接受哈希。如果工作区设置有意更改但策略保持不变，通常只会变更 `expectedAttestationHash`。

启用或升级 `agents.workspace` 规则会把 `agentWorkspace` 证据添加到工作区哈希和 attestation 哈希中。运维人员应审查新的证据，并在启用这些规则后刷新已接受的 attestation 哈希。以同样方式，启用或升级工具姿态规则会添加 `toolPosture` 证据。

`openclaw policy watch` 会重复执行相同检查，并在当前证据不再匹配 `expectedAttestationHash` 时报告：

```bash
openclaw policy watch --json
```

在 CI 或只需要一次漂移评估的脚本中使用 `--once`。如果不使用 `--once`，该命令默认每两秒轮询一次；可使用 `--interval-ms` 选择不同的间隔。

## 发现项

当前策略会验证：

| Check id                                                 | Finding                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `policy/policy-jsonc-missing`                            | 策略已启用，但 `policy.jsonc` 缺失。                                              |
| `policy/policy-jsonc-invalid`                            | 策略无法解析或包含格式错误的规则条目。                                            |
| `policy/policy-hash-mismatch`                            | 策略与配置的 `expectedHash` 不匹配。                                              |
| `policy/attestation-hash-mismatch`                       | 当前策略证据不再与已接受的 attestation 匹配。                                     |
| `policy/policy-conformance-invalid`                      | 基线或被检查的策略文件包含无效的比较语法。                                        |
| `policy/policy-conformance-missing`                      | 被检查的策略文件缺少基线策略文件所要求的规则。                                    |
| `policy/policy-conformance-weaker`                       | 被检查的策略文件的值比基线策略文件更弱。                                          |
| `policy/channels-denied-provider`                        | 启用的 channel 匹配到一个 channel 拒绝规则。                                      |
| `policy/mcp-denied-server`                               | 配置的 MCP 服务器被策略拒绝。                                                     |
| `policy/mcp-unapproved-server`                           | 配置的 MCP 服务器不在允许列表中。                                                 |
| `policy/models-denied-provider`                          | 配置的模型提供方或模型引用使用了被拒绝的提供方。                                  |
| `policy/models-unapproved-provider`                      | 配置的模型提供方或模型引用不在允许列表中。                                        |
| `policy/network-private-access-enabled`                  | 在策略禁止时，启用了私有网络 SSRF 逃逸开关。                                      |
| `policy/ingress-dm-policy-unapproved`                    | channel DM 策略不在策略允许列表中。                                               |
| `policy/ingress-dm-scope-unapproved`                     | `session.dmScope` 与策略要求的 DM 隔离范围不匹配。                                 |
| `policy/ingress-open-groups-denied`                      | channel group 策略为 `open`，但策略禁止开放组入口。                               |
| `policy/ingress-group-mention-required`                  | channel 或 group 条目在策略要求 mention gate 时将其禁用。                        |
| `policy/gateway-non-loopback-bind`                       | 当策略禁止时，Gateway 绑定姿态允许非 loopback 暴露。                              |
| `policy/gateway-auth-disabled`                           | 当策略要求认证时，Gateway 认证被禁用。                                            |
| `policy/gateway-rate-limit-missing`                      | 当策略要求时，Gateway 认证限流姿态未显式配置。                                    |
| `policy/gateway-control-ui-insecure`                     | Gateway Control UI 不安全暴露开关已启用。                                         |
| `policy/gateway-tailscale-funnel`                        | 当策略禁止时，Gateway Tailscale Funnel 暴露已启用。                               |
| `policy/gateway-remote-enabled`                          | 当策略禁止时，Gateway 远程模式处于活动状态。                                      |
| `policy/gateway-http-endpoint-enabled`                   | Gateway HTTP API 端点已启用，但被策略禁止。                                       |
| `policy/gateway-http-url-fetch-unrestricted`             | Gateway HTTP URL-fetch 输入缺少必需的 URL 允许列表。                               |
| `policy/agents-workspace-access-denied`                  | 代理沙箱模式或工作区访问超出策略允许列表。                                         |
| `policy/agents-tool-not-denied`                          | 代理或默认配置未拒绝策略要求拒绝的工具。                                           |
| `policy/tools-profile-unapproved`                        | 配置的全局或按代理工具配置文件不在允许列表中。                                     |
| `policy/tools-fs-workspace-only-required`                | 文件系统工具未配置为仅工作区路径姿态。                                             |
| `policy/tools-exec-security-unapproved`                  | Exec 安全模式不在策略允许列表中。                                                 |
| `policy/tools-exec-ask-unapproved`                       | Exec ask 模式不在策略允许列表中。                                                 |
| `policy/tools-exec-host-unapproved`                      | Exec host 路由不在策略允许列表中。                                                 |
| `policy/tools-elevated-enabled`                          | 当策略禁止时，已启用提升权限的工具模式。                                           |
| `policy/tools-also-allow-missing`                        | 配置的 `alsoAllow` 列表缺少策略要求的条目。                                        |
| `policy/tools-also-allow-unexpected`                     | 配置的 `alsoAllow` 列表包含策略未预期的条目。                                      |
| `policy/tools-required-deny-missing`                     | 全局或按代理工具拒绝列表不包含策略要求拒绝的工具。                                 |
| `policy/sandbox-mode-unapproved`                         | 沙箱模式不在策略允许列表中。                                                      |
| `policy/sandbox-backend-unapproved`                      | 沙箱后端不在策略允许列表中。                                                      |
| `policy/sandbox-container-posture-unobservable`          | 为无法观测它的后端启用了容器姿态规则。                                            |
| `policy/sandbox-container-host-network-denied`           | 基于容器的沙箱或浏览器使用主机网络模式。                                          |
| `policy/sandbox-container-namespace-join-denied`         | 基于容器的沙箱或浏览器加入了另一个容器命名空间。                                  |
| `policy/sandbox-container-mount-mode-required`           | 基于容器的沙箱或浏览器挂载不是只读的。                                            |
| `policy/sandbox-container-runtime-socket-mount`          | 基于容器的沙箱或浏览器挂载暴露了容器运行时 socket。                               |
| `policy/sandbox-container-unconfined-profile`            | 当策略禁止时，容器沙箱配置文件为 unconfined。                                     |
| `policy/sandbox-browser-cdp-source-range-missing`        | 当策略要求时，沙箱浏览器 CDP 源范围缺失。                                         |
| `policy/data-handling-redaction-disabled`                | 当策略要求时，敏感日志脱敏被禁用。                                                |
| `policy/data-handling-telemetry-content-capture`         | 当策略禁止时，遥测内容捕获已启用。                                                |
| `policy/data-handling-session-retention-not-enforced`    | 当策略要求时，会话保留维护未被强制执行。                                          |
| `policy/data-handling-session-transcript-memory-enabled` | 当策略禁止时，会话转录记忆索引已启用。                                            |
| `policy/secrets-unmanaged-provider`                      | 配置的 SecretRef 引用了一个未在 `secrets.providers` 下声明的提供方。             |
| `policy/secrets-denied-provider-source`                  | 配置的 secret 提供方或 SecretRef 使用了被策略拒绝的来源。                        |
| `policy/secrets-insecure-provider`                       | 当策略禁止时，secret 提供方选择了不安全姿态。                                     |
| `policy/auth-profile-invalid-metadata`                   | 配置的 auth profile 缺少有效的 provider 或 mode 元数据。                          |
| `policy/auth-profile-unapproved-mode`                    | 配置的 auth profile 模式不在策略允许列表中。                                      |
| `policy/exec-approvals-missing`                          | 策略要求 `exec-approvals.json`，但制品缺失。                                      |
| `policy/exec-approvals-invalid`                          | 配置的 exec approvals 制品无法解析。                                              |
| `policy/exec-approvals-default-security-unapproved`      | Exec approval 默认值使用了不在策略允许列表中的安全模式。                          |
| `policy/exec-approvals-agent-security-unapproved`        | 按代理生效的 exec approval 安全模式不在允许列表中。                               |
| `policy/exec-approvals-auto-allow-skills-enabled`        | 当策略禁止时，exec approval 代理会隐式自动允许 skill CLI。                         |
| `policy/exec-approvals-allowlist-missing`                | approvals 允许列表缺少策略要求的模式。                                           |
| `policy/exec-approvals-allowlist-unexpected`             | approvals 允许列表包含策略未预期的模式。                                         |
| `policy/tools-missing-risk-level`                        | 受治理的工具声明缺少风险元数据。                                                  |
| `policy/tools-unknown-risk-level`                        | 受治理的工具声明使用了未知的风险值。                                              |
| `policy/tools-missing-sensitivity-token`                 | 受治理的工具声明缺少敏感度元数据。                                                |
| `policy/tools-missing-owner`                             | 受治理的工具声明缺少所有者元数据。                                                |
| `policy/tools-unknown-sensitivity-token`                 | 受治理的工具声明使用了未知的敏感度值。                                            |

策略发现项可以同时包含 `target` 和 `requirement`。`target` 是观察到的、未符合要求的工作区对象。`requirement` 是使其成为发现项的已编写策略规则。当前这两个值都是地址，通常是 `oc://` 路径，但字段名描述的是它们在策略中的角色，而不是地址格式。

示例 JSON 发现：

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

示例工具发现：

```json
{
  "checkId": "policy/tools-missing-risk-level",
  "severity": "error",
  "message": "TOOLS.md tool 'deploy' has no explicit risk classification.",
  "source": "policy",
  "path": "TOOLS.md",
  "line": 12,
  "ocPath": "oc://TOOLS.md/tools/deploy",
  "target": "oc://TOOLS.md/tools/deploy",
  "requirement": "oc://policy.jsonc/tools/requireMetadata"
}
```

示例 MCP 发现：

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

示例模型提供方发现：

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

示例网络发现：

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

示例 Gateway 暴露发现：

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

示例代理工作区发现：

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

## 修复

`doctor --lint` 和 `policy check` 为只读操作。

只有在显式启用 `workspaceRepairs` 时，`doctor --fix` 才会编辑由策略管理的工作区设置。若未进行该显式同意，策略检查会报告它们将要修复的内容，并保持设置不变。

在此版本中，修复操作可能会禁用在 OpenClaw 配置中已启用、但被 `channels.denyRules` 拒绝的通道。请仅在审核策略文件之后再启用 `workspaceRepairs`，因为有效的拒绝规则可能会关闭某个已配置的通道：

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

| Command          | `0`                                                    | `1`                                                                 | `2`                          |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------- |
| `policy check`   | 阈值下无发现项。                                       | 一项或多项发现达到了阈值。                                           | 参数或运行时失败。           |
| `policy compare` | 策略文件至少与基线一样严格。                           | 策略文件无效、缺失，或比基线规则更宽松。                             | 参数或运行时失败。           |
| `policy watch`   | 无发现项且已接受的哈希仍为最新。                       | 存在发现项或已接受的证明已过期。                                     | 参数或运行时失败。           |

## 相关

- [Doctor lint 模式](/cli/doctor#lint-mode)
- [Path CLI](/cli/path)
