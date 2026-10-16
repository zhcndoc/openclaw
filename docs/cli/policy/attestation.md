---
summary: "策略证据、证明哈希元组和 `policy watch` 漂移检测"
read_when:
  - "你需要用于审计证据的策略证明哈希"
  - "您想要接受干净的策略状态并检测以后的漂移"
  - "您正在将策略连接到 CI 或释放门"
title: "接受并观察政策状态"
sidebarTitle: "鉴证"
---

记录干净的检查作为持久的审计证据，并检测偏差。 [`openclaw policy`](/cli/policy) 参考的一部分。

## <a id="accept-policy-state"></a> 接受策略状态

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
        "ref": "openai/gpt-6-astra",
        "provider": "openai",
        "model": "gpt-6-astra",
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

`attestation.policy.hash` 标识所编写的规则工件。 `evidence` 记录检查所使用的观察到的 OpenClaw 状态，并且 `workspace.hash` 标识该证据有效负载。 `findingsHash` 标识了确切的结果集。 `checkedAt` 记录检查运行的时间。 `attestationHash` 识别稳定声明（策略哈希、证据哈希、结果哈希和 clean/dirty 状态）并故意排除 `checkedAt`，因此相同的策略状态始终生成相同的证明哈希。 Together 这四个值构成一项策略检查的审核元组。

如果网关或监督器使用策略来阻止、批准或标注运行时操作， 它应记录最近一次干净检查中的 attestation hash。`checkedAt` 会保留在 JSON 输出中用于审计日志，但不属于稳定哈希的一部分。

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
openclaw policy watch --agent ops --json
```

在 CI 或需要单次漂移评估的脚本中使用 `--once`。没有`--once`，默认每两秒轮询一次；使用 `--interval-ms` 更改间隔。大于 2,147,000,000 毫秒的间隔上限为该值，以避免定时器溢出。
