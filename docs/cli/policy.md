---
summary: "openclaw policy 一致性检查的 CLI 参考"
read_when:
  - 你想将 OpenClaw 设置与编写的 policy.jsonc 进行比对
  - 你希望在 doctor lint 中查看策略发现
  - 你需要用于审计证据的策略证明哈希
title: "策略"
---

# `openclaw policy`

`openclaw policy` is provided by the bundled Policy plugin. It is an enterprise
conformance layer over existing OpenClaw settings, not a second configuration
system. You author requirements in `policy.jsonc`; OpenClaw observes the active
workspace as evidence; policy reports drift through `doctor --lint`. Policy
does not enforce tool calls or rewrite runtime behavior at request time, and it
does not attest per-agent credential stores such as `auth-profiles.json`.

Policy checks configured channels, MCP servers, model providers, network SSRF
posture, ingress/channel access, Gateway exposure and node command posture,
agent workspace access, sandbox posture, data-handling posture, secret
provider/auth profile posture, and governed tool metadata (`TOOLS.md`). Use it
when a workspace needs a durable, checkable statement such as "Telegram must
not be enabled" or "governed tools must declare risk and owner metadata." If
you only need local behavior with no attestation or drift detection, plain
config is enough.

## 快速开始

```bash
openclaw plugins enable policy
```

The plugin stays enabled even when `policy.jsonc` is missing, so doctor can
report the missing artifact instead of silently skipping checks.

Author `policy.jsonc` by hand; it is not generated from current settings. Each
top-level section is a rule namespace: a check only runs when a concrete rule
is present under it (unsupported sections or keys fail as
`policy/policy-jsonc-invalid` instead of being silently ignored). Minimal
example covering every supported section:

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

Cross-cutting notes not obvious from the rule tables below:

- Omitting `gateway.bind` while denying non-loopback binds means you accept
  the runtime default; set `gateway.bind: "loopback"` for strict conformance.
- For a read-only agent, set sandbox `mode` to `all` or `non-main` on the
  applicable defaults/agent and `workspaceAccess` to `none` or `ro`. Missing or
  `off` sandbox mode does not satisfy a read-only policy.
- `agents.workspace.denyTools` accepts `exec`, `process`, `write`, `edit`,
  `apply_patch`. The config tool-deny groups `group:fs` (file mutation) and
  `group:runtime` (shell/process) satisfy the equivalent posture.
- Exec-approvals checks read the live `exec-approvals.json` artifact only when
  an `execApprovals` rule is present; a missing or invalid artifact is
  unobservable evidence, not a synthetic pass.
- Secret and auth-profile evidence records provider/source posture and
  SecretRef metadata only, never raw values. Policy does not read or attest
  per-agent credential stores such as `auth-profiles.json`.
- Data-handling evidence is config-level posture only (redaction mode,
  telemetry capture toggle, session maintenance mode, transcript-indexing
  setting). It does not inspect logs, telemetry exports, transcripts, or
  memory files, and a clean result does not prove that no personal data or
  secrets exist in them.

### Policy 规则参考

Every rule below is optional; a check runs only when the rule is present. The
observed state is existing OpenClaw config or workspace metadata.

#### Scoped overlays

Use `scopes.<scopeName>` when specific agents or channels need stricter policy
than the top-level baseline. The scope name is just a label; matching uses the
selector inside the scope. Overlays are additive: the global rule still runs,
and the scoped rule can add its own finding against the same evidence.

| Selector     | Supported sections                                                             | Use when                                          |
| ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| `agentIds`   | `tools`, `agents.workspace`, `sandbox`, `dataHandling.memory`, `execApprovals` | One or more runtime agents need stricter rules.   |
| `channelIds` | `ingress.channels`                                                             | One or more channels need stricter ingress rules. |

If an `agentIds` entry is not present in `agents.list[]`, OpenClaw evaluates
the scoped rule against inherited global/default posture for that runtime
agent id instead of skipping it.

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

The same agent can appear in multiple scopes if each scope governs a different
field, as above. A repeated scoped field for the same agent must be equally or
more restrictive; a weaker duplicate claim is rejected (allow-lists are
subsets, deny-lists are supersets, required booleans are fixed).

Container posture rules (`sandbox.containers.*`) are checked only against
evidence the matched agent's sandbox backend can expose. If a backend cannot
observe a rule you enabled for it, policy reports
`policy/sandbox-container-posture-unobservable` instead of passing; scope
container rules to the agent groups that use a backend which can expose them.

Top-level `ingress.session.requireDmScope` stays global; `session.dmScope` is
not channel-attributable evidence, so it cannot be scoped by `channelIds`.

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

| Policy field                            | Observed state                                 | Use when                                                                             |
| --------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `gateway.exposure.allowNonLoopbackBind` | `gateway.bind`                                 | Set to `false` to require loopback Gateway binding.                                  |
| `gateway.exposure.allowTailscaleFunnel` | Tailscale serve/funnel Gateway posture         | Set to `false` to deny Tailscale Funnel exposure.                                    |
| `gateway.auth.requireAuth`              | `gateway.auth.mode`                            | Set to `true` to reject disabled Gateway auth.                                       |
| `gateway.auth.requireExplicitRateLimit` | `gateway.auth.rateLimit`                       | Set to `true` to require explicit auth rate-limit config.                            |
| `gateway.controlUi.allowInsecure`       | Control UI insecure auth/device/origin toggles | Set to `false` to deny insecure Control UI exposure toggles.                         |
| `gateway.remote.allow`                  | Remote Gateway mode/config                     | Set to `false` to deny remote Gateway mode.                                          |
| `gateway.http.denyEndpoints`            | Gateway HTTP API endpoints                     | Deny endpoint ids such as `chatCompletions` or `responses`.                          |
| `gateway.http.requireUrlAllowlists`     | Gateway HTTP URL-fetch inputs                  | Set to `true` to require URL allowlists on URL-fetch inputs.                         |
| `gateway.nodes.denyCommands`            | `gateway.nodes.denyCommands`                   | Require exact node command ids such as `system.run` to be denied in OpenClaw config. |

`gateway.nodes.denyCommands` is an exact, case-sensitive deny-superset rule.
Use it when policy must prove that privileged node commands are explicitly
denied by OpenClaw config. A deployment that intentionally allows a privileged
node command should update `policy.jsonc` after review instead of relying on
`gateway.nodes.allowCommands` alone.

#### Agent workspace

| Policy field                     | Observed state                                                                        | Use when                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `agents.workspace.allowedAccess` | `agents.defaults.sandbox.workspaceAccess` and `agents.list[].sandbox.workspaceAccess` | Allow only sandbox workspace access values such as `none` or `ro`.                       |
| `agents.workspace.denyTools`     | Global and per-agent tool deny config                                                 | Require mutation tools (`exec`, `process`, `write`, `edit`, `apply_patch`) to be denied. |

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

Policy treats missing `sandbox.mode` as its implicit default `off`, so
`sandbox.requireMode` reports a fresh or unconfigured sandbox as outside an
allowlist such as `["all"]`.

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

Exec-approvals checks read the runtime `exec-approvals.json` artifact:
`~/.openclaw/exec-approvals.json` by default, or
`$OPENCLAW_STATE_DIR/exec-approvals.json` when `OPENCLAW_STATE_DIR` is set.
Posture rules under `execApprovals.defaults.*` or `execApprovals.agents.*`
require readable artifact evidence; a missing or invalid artifact reports as
unobservable evidence rather than a best-effort pass. Once readable, omitted
fields inherit runtime defaults: missing `defaults.security` is `full`, and
missing agent security inherits that default. Evidence includes `defaults`,
`agents.*`, `agents.*.allowlist[].pattern`, optional `argPattern`, effective
`autoAllowSkills` posture, and entry source — never socket path/token,
`commandText`, `lastUsedCommand`, resolved paths, or timestamps.

| Policy field                                | Observed state                                                                         | Use when                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `execApprovals.requireFile`                 | Active runtime `exec-approvals.json` path                                              | 设置为 `true` 以要求 approvals 工件存在且可解析。                                       |
| `execApprovals.defaults.allowSecurity`      | `defaults.security`，默认为 `full`                                                     | 仅允许已批准的默认 approval security mode。                                             |
| `execApprovals.agents.allowSecurity`        | `agents.*.security`，继承 defaults                                                      | 仅允许已批准的按 agent 有效 approval security mode。                                     |
| `execApprovals.agents.allowAutoAllowSkills` | `defaults.autoAllowSkills` 和 `agents.*.autoAllowSkills`，继承运行时默认值             | 设置为 `false` 以要求严格的手动 allowlist，而不是隐式的 skill CLI 批准。                |
| `execApprovals.agents.allowlist.expected`   | 聚合的 `agents.*.allowlist[]` 模式和可选 argPattern 条目                               | 要求 approvals allowlist 与已审查的模式集合匹配。                                       |

Example: require the approvals artifact, deny permissive defaults, and allow
only reviewed exec approval posture for selected agents.

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

## Run checks

Run policy-only checks during authoring:

```bash
openclaw policy check
openclaw policy check --json
openclaw policy check --severity-min error
```

`policy check` runs only the policy check set and emits evidence, findings,
and attestation hashes. The same findings also appear in
`openclaw doctor --lint` when the Policy plugin is enabled.

Compare an operator policy file against an authored baseline:

```bash
openclaw policy compare --baseline official.policy.jsonc
openclaw policy compare --baseline official.policy.jsonc --policy policy.jsonc --json
```

`policy compare` checks policy-file syntax against policy-file syntax; it does
not inspect runtime state, evidence, credentials, or secrets. It uses the same
rule metadata that governs scoped overlays: allowlists must stay equal or
narrower, denylists must stay equal or broader, required booleans must keep
their value, ordered strings may only move toward the stricter end of the
configured order, and exact lists must match. The baseline can be an
organization-authored policy; the checked policy may add stricter values or
extra rules. A top-level checked rule can satisfy a scoped baseline rule when
it is equally or more restrictive. Scope names do not need to match between
files; comparison is keyed by selector (`agentIds`/`channelIds`) and field.

Clean compare (`--json`):

```json
{
  "ok": true,
  "baselinePath": "official.policy.jsonc",
  "policyPath": "policy.jsonc",
  "rulesChecked": 3,
  "findings": []
}
```

Clean `policy check --json` output includes stable hashes an operator or
supervisor can record:

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

Set `plugins.entries.policy.config.enabled` to `false` to disable policy
checks for a workspace while leaving the plugin installed.

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

`attestation.policy.hash` identifies the authored rule artifact. `evidence`
records the observed OpenClaw state used by the checks, and
`workspace.hash` identifies that evidence payload. `findingsHash` identifies
the exact finding set. `checkedAt` records when the check ran.
`attestationHash` identifies the stable claim (policy hash, evidence hash,
findings hash, and clean/dirty state) and deliberately excludes `checkedAt`,
so the same policy state always produces the same attestation hash. Together
these four values form the audit tuple for one policy check.

If a gateway or supervisor uses policy to block, approve, or annotate a
runtime action, it should record the attestation hash from the last clean
check. `checkedAt` stays in JSON output for audit logs but is not part of the
stable hash.

Lifecycle for accepting policy state:

1. Author or review `policy.jsonc`.
2. Run `openclaw policy check --json`.
3. If clean, record `attestation.policy.hash` as `expectedHash`.
4. Record `attestation.attestationHash` as `expectedAttestationHash`.
5. Re-run `openclaw doctor --lint` in CI or release gates.

If policy rules change intentionally, update both accepted hashes from a
clean check. If only workspace settings change (policy stays the same),
typically only `expectedAttestationHash` changes.

Enabling or upgrading `agents.workspace` rules adds `agentWorkspace` evidence
to the workspace hash and attestation hash; review the new evidence and
refresh accepted attestation hashes after enabling. Enabling or upgrading
tool posture rules adds `toolPosture` evidence the same way.

`openclaw policy watch` re-runs the check and reports when current evidence no
longer matches `expectedAttestationHash`:

```bash
openclaw policy watch --json
```

Use `--once` in CI or scripts that need a single drift evaluation. Without
`--once`, it polls every two seconds by default; use `--interval-ms` to change
the interval.

## 发现项

| Check id                                                 | Finding                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `policy/policy-jsonc-missing`                            | Policy is enabled but `policy.jsonc` is missing.                                  |
| `policy/policy-jsonc-invalid`                            | Policy cannot be parsed or contains malformed rule entries.                       |
| `policy/policy-hash-mismatch`                            | Policy does not match configured `expectedHash`.                                  |
| `policy/attestation-hash-mismatch`                       | Current policy evidence no longer matches the accepted attestation.               |
| `policy/policy-conformance-invalid`                      | A baseline or checked policy file has invalid comparison syntax.                  |
| `policy/policy-conformance-missing`                      | A checked policy file is missing a rule required by the baseline policy file.     |
| `policy/policy-conformance-weaker`                       | A checked policy file has a weaker value than the baseline policy file.           |
| `policy/channels-denied-provider`                        | An enabled channel matches a channel deny rule.                                   |
| `policy/mcp-denied-server`                               | A configured MCP server is denied by policy.                                      |
| `policy/mcp-unapproved-server`                           | A configured MCP server is outside the allowlist.                                 |
| `policy/models-denied-provider`                          | A configured model provider or model ref uses a denied provider.                  |
| `policy/models-unapproved-provider`                      | A configured model provider or model ref is outside the allowlist.                |
| `policy/network-private-access-enabled`                  | A private-network SSRF escape hatch is enabled when policy denies it.             |
| `policy/ingress-dm-policy-unapproved`                    | A channel DM policy is outside the policy allowlist.                              |
| `policy/ingress-dm-scope-unapproved`                     | `session.dmScope` does not match the policy-required DM isolation scope.          |
| `policy/ingress-open-groups-denied`                      | A channel group policy is `open` while policy denies open group ingress.          |
| `policy/ingress-group-mention-required`                  | A channel or group entry disables mention gates while policy requires them.       |
| `policy/gateway-non-loopback-bind`                       | Gateway bind posture permits non-loopback exposure when policy denies it.         |
| `policy/gateway-auth-disabled`                           | Gateway authentication is disabled when policy requires auth.                     |
| `policy/gateway-rate-limit-missing`                      | Gateway auth rate-limit posture is not explicit when policy requires it.          |
| `policy/gateway-control-ui-insecure`                     | Gateway Control UI insecure exposure toggles are enabled.                         |
| `policy/gateway-tailscale-funnel`                        | Gateway Tailscale Funnel exposure is enabled when policy denies it.               |
| `policy/gateway-remote-enabled`                          | Gateway remote mode is active when policy denies it.                              |
| `policy/gateway-http-endpoint-enabled`                   | A Gateway HTTP API endpoint is enabled while denied by policy.                    |
| `policy/gateway-http-url-fetch-unrestricted`             | Gateway HTTP URL-fetch input lacks a required URL allowlist.                      |
| `policy/gateway-node-command-denied`                     | A node command denied by policy is not denied by OpenClaw config.                 |
| `policy/agents-workspace-access-denied`                  | Agent sandbox mode or workspace access is outside the policy allowlist.           |
| `policy/agents-tool-not-denied`                          | An agent or default config does not deny a tool required by policy.               |
| `policy/tools-profile-unapproved`                        | A configured global or per-agent tool profile is outside the allowlist.           |
| `policy/tools-fs-workspace-only-required`                | Filesystem tools are not configured with workspace-only path posture.             |
| `policy/tools-exec-security-unapproved`                  | Exec security mode is outside the policy allowlist.                               |
| `policy/tools-exec-ask-unapproved`                       | Exec ask mode is outside the policy allowlist.                                    |
| `policy/tools-exec-host-unapproved`                      | Exec host routing is outside the policy allowlist.                                |
| `policy/tools-elevated-enabled`                          | Elevated tool mode is enabled when policy denies it.                              |
| `policy/tools-also-allow-missing`                        | A configured `alsoAllow` list is missing an entry required by policy.             |
| `policy/tools-also-allow-unexpected`                     | A configured `alsoAllow` list includes an entry not expected by policy.           |
| `policy/tools-required-deny-missing`                     | A global or per-agent tool deny list does not include a required denied tool.     |
| `policy/sandbox-mode-unapproved`                         | Sandbox mode is outside the policy allowlist.                                     |
| `policy/sandbox-backend-unapproved`                      | Sandbox backend is outside the policy allowlist.                                  |
| `policy/sandbox-container-posture-unobservable`          | A container posture rule is enabled for a backend that cannot observe it.         |
| `policy/sandbox-container-host-network-denied`           | A container-backed sandbox or browser uses host network mode.                     |
| `policy/sandbox-container-namespace-join-denied`         | A container-backed sandbox or browser joins another container namespace.          |
| `policy/sandbox-container-mount-mode-required`           | A container-backed sandbox or browser mount is not read-only.                     |
| `policy/sandbox-container-runtime-socket-mount`          | A container-backed sandbox or browser mount exposes the container runtime socket. |
| `policy/sandbox-container-unconfined-profile`            | Container sandbox profile is unconfined when policy denies it.                    |
| `policy/sandbox-browser-cdp-source-range-missing`        | Sandbox browser CDP source range is missing when policy requires one.             |
| `policy/data-handling-redaction-disabled`                | Sensitive logging redaction is disabled when policy requires it.                  |
| `policy/data-handling-telemetry-content-capture`         | Telemetry content capture is enabled when policy denies it.                       |
| `policy/data-handling-session-retention-not-enforced`    | Session retention maintenance is not enforced when policy requires it.            |
| `policy/data-handling-session-transcript-memory-enabled` | Session transcript memory indexing is enabled when policy denies it.              |
| `policy/secrets-unmanaged-provider`                      | A config SecretRef references a provider not declared under `secrets.providers`.  |
| `policy/secrets-denied-provider-source`                  | A config secret provider or SecretRef uses a source denied by policy.             |
| `policy/secrets-insecure-provider`                       | A secret provider opts into insecure posture when policy denies it.               |
| `policy/auth-profile-invalid-metadata`                   | A config auth profile is missing valid provider or mode metadata.                 |
| `policy/auth-profile-unapproved-mode`                    | A config auth profile mode is outside the policy allowlist.                       |
| `policy/exec-approvals-missing`                          | Policy requires `exec-approvals.json`, but the artifact is missing.               |
| `policy/exec-approvals-invalid`                          | The configured exec approvals artifact cannot be parsed.                          |
| `policy/exec-approvals-default-security-unapproved`      | Exec approval defaults use a security mode outside the policy allowlist.          |
| `policy/exec-approvals-agent-security-unapproved`        | A per-agent effective exec approval security mode is outside the allowlist.       |
| `policy/exec-approvals-auto-allow-skills-enabled`        | An exec approval agent implicitly auto-allows skill CLIs when policy denies it.   |
| `policy/exec-approvals-allowlist-missing`                | The approvals allowlist is missing a pattern required by policy.                  |
| `policy/exec-approvals-allowlist-unexpected`             | The approvals allowlist includes a pattern not expected by policy.                |
| `policy/tools-missing-risk-level`                        | A governed tool declaration is missing risk metadata.                             |
| `policy/tools-unknown-risk-level`                        | A governed tool declaration uses an unknown risk value.                           |
| `policy/tools-missing-sensitivity-token`                 | A governed tool declaration is missing sensitivity metadata.                      |
| `policy/tools-missing-owner`                             | A governed tool declaration is missing owner metadata.                            |
| `policy/tools-unknown-sensitivity-token`                 | A governed tool declaration uses an unknown sensitivity value.                    |

A finding can include both `target` (the observed workspace thing that does
not conform) and `requirement` (the authored rule that made it a finding).
Both are `oc://` address strings today, but the field names describe policy
role rather than address format.

Example findings:

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
  "message": "TOOLS.md tool 'deploy' has no explicit risk classification.",
  "source": "policy",
  "path": "TOOLS.md",
  "line": 12,
  "ocPath": "oc://TOOLS.md/tools/deploy",
  "target": "oc://TOOLS.md/tools/deploy",
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
  "ocPath": "oc://openclaw.config/gateway/nodes/denyCommands",
  "target": "oc://openclaw.config/gateway/nodes/denyCommands",
  "requirement": "oc://policy.jsonc/gateway/nodes/denyCommands",
  "fixHint": "Add 'system.run' to gateway.nodes.denyCommands or update policy after review."
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

## 修复

`doctor --lint` 和 `policy check` 为只读操作。

`doctor --fix` only edits policy-managed workspace settings when
`workspaceRepairs` is explicitly enabled; otherwise checks report what they
would repair and leave settings unchanged.

In this version, repair can disable channels denied by `channels.denyRules` and
apply the automatic narrowing repairs listed below. Enable `workspaceRepairs`
only after the policy file has been reviewed, because a valid rule can change
workspace config:

- set `tools.elevated.enabled=false` when a global policy forbids elevated tools
- set insecure `gateway.controlUi.*` toggles to `false`
- set `gateway.mode=local` when policy denies remote gateway mode
- set `logging.redactSensitive=tools` when policy requires sensitive logging
  redaction
- set `diagnostics.otel.captureContent=false`, or
  `diagnostics.otel.captureContent.enabled=false` for object-form telemetry
  capture settings, when policy denies telemetry content capture

Scoped elevated-tools repairs are detect-only. Scoped data-handling repairs are
also skipped when the finding reports shared logging or telemetry config,
because changing the shared setting would affect more than the scoped policy
target.

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
