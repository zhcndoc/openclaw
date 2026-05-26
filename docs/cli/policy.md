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

Policy 目前管理已配置的 channels、MCP servers、模型提供方、网络 SSRF 姿态、Gateway 暴露姿态、agent 工作区姿态、OpenClaw 配置 secret provider/auth profile 姿态，以及受治理的工具声明。例如，IT 或工作区运维人员可以记录 Telegram 不是被批准的 channel provider，限制 MCP servers 和模型引用只能使用已批准条目，要求私有网络 fetch/browser 访问保持禁用，要求 Gateway 绑定/auth/HTTP 暴露保持在审查过的范围内，要求 agent 工作区访问和工具拒绝保持在审查过的姿态，要求 OpenClaw 配置 SecretRefs 使用受管 provider，要求配置 auth profile 携带 provider/mode 元数据，要求受治理工具携带风险和敏感性元数据，然后使用 `doctor --lint` 作为共享一致性门禁。

当某个工作区需要一条持久声明，例如“这些 channels 不能启用”或“受治理工具必须声明批准元数据”，并且需要一种可重复的方式证明 OpenClaw 仍符合该声明时，请使用 policy。仅当你只需要本地行为，而不需要 policy 发现结果或证明输出时，单独使用常规配置和工作区文档即可。

## 快速开始

首次使用前先启用捆绑的 Policy 插件：

```bash
openclaw plugins enable policy
```

启用 policy 后，doctor 可以在不激活任意插件的情况下加载 policy 健康检查。即使 `policy.jsonc` 缺失，该插件仍保持启用状态，因此 doctor 可以报告缺失的工件。

Policy 是手工编写的，而不是从用户当前设置生成的。一个涵盖 channels、MCP servers、模型提供方、网络姿态、Gateway 暴露、agent 工作区姿态、OpenClaw 配置 secret provider/auth profile 姿态以及工具元数据的最小 policy 如下所示：

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

这些规则才是权威。类别块只是一个命名空间；只有在存在具体规则时才会运行检查。OpenClaw 读取当前 `channels.*` 设置、`mcp.servers.*`、`models.providers.*`、选定的 agent 模型引用、网络 SSRF 设置、Gateway 绑定/auth/Control UI/Tailscale/remote/HTTP 姿态、OpenClaw 配置 agent sandbox 工作区访问和工具拒绝姿态、配置 secret provider 和 SecretRef 来源证明、配置 auth profile 元数据、已配置的全局/按 agent 工具姿态，以及 `TOOLS.md` 声明作为证据，然后报告不符合规范的观察状态。如果 policy 禁止非 loopback 的 Gateway 绑定，只有当你愿意审查运行时默认值时才省略 `gateway.bind`；要实现严格的配置一致性，请将 `gateway.bind=loopback`。对于只读 agent 姿态，请在适用的默认值或 agent 上配置 sandbox 模式，并将 `workspaceAccess` 设置为 `none` 或 `ro`；省略或 `off` 的 sandbox 模式不满足只读/禁止写入的 policy。`agents.workspace.denyTools` 支持 `exec`、`process`、`write`、`edit` 和 `apply_patch`；OpenClaw 配置 `group:fs` 覆盖文件修改工具，`group:runtime` 覆盖 shell/process 工具。工具姿态 policy 会观察 `tools.profile`、`tools.allow`、`tools.alsoAllow`、`tools.deny`、`tools.fs.workspaceOnly`、`tools.exec.security`、`tools.exec.ask`、`tools.exec.host`、`tools.elevated.enabled`，以及相同的按 agent `agents.list[].tools.*` 覆盖项。它不会读取运行时/操作员批准状态，例如 exec-approvals.json，也不会在运行时强制执行工具调用。Secret 证据只记录 provider/source 姿态和 SecretRef 元数据，绝不会包含原始 secret 值。Policy 不会读取或证明按 agent 的凭据存储，例如 `auth-profiles.json`；这些存储仍由现有的 auth 和凭据流程负责。

### Policy 规则参考

下面每个 policy 字段都是可选的。只有当 `policy.jsonc` 中存在匹配规则时，检查才会运行。观察到的状态是现有的 OpenClaw 配置或工作区元数据；policy 会报告偏差，但不会重写运行时行为，除非明确提供并启用了修复路径。

按 agent 的 policy 覆盖会将宽泛的 `tools.*` 和 `agents.workspace` 姿态保持为全局，然后允许命名作用域块在 `scopes.<scopeName>` 下为显式 `agentIds` 添加更严格的常规 policy 部分。最初的作用域部分是 `tools` 和 `agents.workspace`；一旦其证据可归属于某个 agent，sandbox 和 ingress 也可以使用同一个容器。作用域字段携带严格性元数据，例如允许列表子集、拒绝列表超集、必需布尔值和精确列表语义，以便未来的 policy 文件一致性可以重用相同的规则清单，而不是猜测。覆盖是叠加式的：全局声明仍会运行，而作用域声明可以针对同一观察到的配置发出自己的发现。请参见 [Agent-scoped policy overlays](/plan/policy-agent-scoped-overlays)。`policy.jsonc` 中存在的每个 scope 都必须有效且可执行。当前 scopes 需要 `agentIds`，并且该选择器只支持 `tools.*` 和 `agents.workspace.*`。如果某个 `agentIds` 条目不存在于 `agents.list[]` 中，则对该运行时 agent id，会以继承的全局/默认姿态来评估作用域规则，而不是跳过它。

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

#### Secrets

| Policy 字段                      | 观察到的状态                                           | 适用场景                                                                |
| --------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `secrets.requireManagedProviders` | 配置的 SecretRefs 和 `secrets.providers.*` 声明         | 设置为 `true` 以要求 SecretRefs 指向已声明的 provider。                 |
| `secrets.denySources`             | secret provider 来源和 SecretRef 来源                    | 拒绝诸如 `exec`、`file` 或其他已配置来源名称。                           |
| `secrets.allowInsecureProviders`  | 不安全 secret-provider 姿态标志                         | 设置为 `false` 以拒绝选择进入不安全姿态的 provider。                    |

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

干净的 JSON 输出示例包含可由操作员或主管记录的稳定哈希：

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
`["risk", "sensitivity", "owner"]`。

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

| 检查 id                                     | 发现说明                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| `policy/policy-jsonc-missing`                | 已启用策略，但缺少 `policy.jsonc`。                                               |
| `policy/policy-jsonc-invalid`                | 无法解析策略，或包含格式错误的规则条目。                                          |
| `policy/policy-hash-mismatch`                | 策略与配置的 `expectedHash` 不匹配。                                              |
| `policy/attestation-hash-mismatch`           | 当前策略证据不再匹配已接受的 attestation。                                        |
| `policy/channels-denied-provider`            | 某个已启用通道匹配了通道拒绝规则。                                                |
| `policy/mcp-denied-server`                   | 配置的 MCP 服务器被策略拒绝。                                                     |
| `policy/mcp-unapproved-server`               | 配置的 MCP 服务器不在允许列表中。                                                 |
| `policy/models-denied-provider`              | 配置的模型提供方或模型引用使用了被拒绝的提供方。                                  |
| `policy/models-unapproved-provider`          | 配置的模型提供方或模型引用不在允许列表中。                                        |
| `policy/network-private-access-enabled`      | 在策略禁止的情况下，启用了私有网络 SSRF 逃逸开关。                                |
| `policy/gateway-non-loopback-bind`           | 在策略禁止的情况下，网关绑定姿态允许非 loopback 暴露。                            |
| `policy/gateway-auth-disabled`               | 在策略要求认证时，网关认证被禁用。                                                |
| `policy/gateway-rate-limit-missing`          | 在策略要求时，网关认证速率限制姿态没有显式配置。                                  |
| `policy/gateway-control-ui-insecure`         | 网关 Control UI 的不安全暴露开关已启用。                                          |
| `policy/gateway-tailscale-funnel`            | 在策略禁止的情况下，网关 Tailscale Funnel 暴露已启用。                            |
| `policy/gateway-remote-enabled`              | 在策略禁止的情况下，网关远程模式处于激活状态。                                    |
| `policy/gateway-http-endpoint-enabled`       | 网关 HTTP API 端点已启用，而策略禁止它。                                           |
| `policy/gateway-http-url-fetch-unrestricted` | 网关 HTTP URL-fetch 输入缺少所需的 URL 允许列表。                                  |
| `policy/agents-workspace-access-denied`      | 代理沙箱模式或工作区访问超出了策略允许列表。                                       |
| `policy/agents-tool-not-denied`              | 某个代理或默认配置未拒绝策略要求拒绝的工具。                                       |
| `policy/tools-profile-unapproved`            | 配置的全局或按代理工具配置文件不在允许列表中。                                     |
| `policy/tools-fs-workspace-only-required`    | 文件系统工具未配置为仅工作区路径姿态。                                             |
| `policy/tools-exec-security-unapproved`      | exec 安全模式超出了策略允许列表。                                                 |
| `policy/tools-exec-ask-unapproved`           | exec ask 模式超出了策略允许列表。                                                 |
| `policy/tools-exec-host-unapproved`          | exec 主机路由超出了策略允许列表。                                                 |
| `policy/tools-elevated-enabled`              | 在策略禁止的情况下，提升权限工具模式已启用。                                      |
| `policy/tools-also-allow-missing`            | 配置的 `alsoAllow` 列表缺少策略要求的条目。                                       |
| `policy/tools-also-allow-unexpected`         | 配置的 `alsoAllow` 列表包含策略未预期的条目。                                     |
| `policy/tools-required-deny-missing`         | 全局或按代理工具拒绝列表未包含所需的被拒绝工具。                                   |
| `policy/secrets-unmanaged-provider`          | 某个配置 SecretRef 引用了未在 `secrets.providers` 下声明的提供方。                 |
| `policy/secrets-denied-provider-source`      | 配置的 secret 提供方或 SecretRef 使用了策略拒绝的来源。                           |
| `policy/secrets-insecure-provider`           | 在策略禁止的情况下，secret 提供方选择了不安全姿态。                               |
| `policy/auth-profile-invalid-metadata`       | 配置的认证配置文件缺少有效的提供方或模式元数据。                                   |
| `policy/auth-profile-unapproved-mode`        | 配置的认证配置文件模式超出了策略允许列表。                                        |
| `policy/tools-missing-risk-level`            | 受治理的工具声明缺少风险元数据。                                                  |
| `policy/tools-unknown-risk-level`            | 受治理的工具声明使用了未知的风险值。                                              |
| `policy/tools-missing-sensitivity-token`     | 受治理的工具声明缺少敏感性元数据。                                                |
| `policy/tools-missing-owner`                 | 受治理的工具声明缺少 owner 元数据。                                               |
| `policy/tools-unknown-sensitivity-token`     | 受治理的工具声明使用了未知的敏感性值。                                            |

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

| 命令           | `0`                          | `1`                              | `2`                    |
| -------------- | ---------------------------- | -------------------------------- | ---------------------- |
| `policy check` | 未达到阈值的发现。           | 一个或多个发现达到阈值。         | 参数错误或运行时失败。  |
| `policy watch` | 无发现且已接受的哈希是最新的。 | 存在发现，或已接受的证明已过期。 | 参数错误或运行时失败。  |

## 相关

- [Doctor lint 模式](/cli/doctor#lint-mode)
- [Path CLI](/cli/path)
