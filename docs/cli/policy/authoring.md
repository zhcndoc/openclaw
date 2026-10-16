---
summary: "启用策略插件并编写 `policy.jsonc`，并使用涵盖每个受支持部分的最小示例"
read_when:
  - "您是第一次写 `policy.jsonc`"
  - "您需要一个涵盖每个支持的策略部分的示例"
  - "您需要规则表背后的横切创作注意事项"
title: "编写策略文件"
sidebarTitle: "创作"
---

启用插件并编写策略工件。 [`openclaw policy`](/cli/policy) 参考的一部分。

## <a id="quick-start"></a> 快速开始

```bash
openclaw plugins enable policy
```

即使 `policy.jsonc` 缺失，插件也会保持启用状态，因此 doctor 可以报告缺失的工件，而不是静默跳过检查。

请手动编写 `policy.jsonc`；它不会根据当前设置自动生成。每个顶级 section 都是一个规则命名空间：只有在其中存在具体规则时，检查才会运行（不支持的 section 或键会以 `policy/policy-jsonc-invalid` 失败，而不是被静默忽略）。覆盖所有受支持 section 的最小示例如下：

```jsonc validate=false
{
  "channels": {
    "denyRules": [
      {
        "id": "no-telegram",
        "when": { "provider": "telegram" },
        "reason": "Telegram is not approved for this workspace.",
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

[ 规则表](/cli/policy/rules) 中的横切注释不明显：

- 在拒绝非环回绑定时省略 `gateway.bind` 意味着您接受运行时默认值；设置 `gateway.bind: "loopback"` 以严格遵守。
- 对于只读代理，设置沙箱`mode` to `all` or `non-main`关于适用的defaults/agent和`workspaceAccess` to `none` or `ro`。缺失或`off`沙盒模式不满足只读策略。
- `agents.workspace.denyTools` 接受 `exec`、`process`、`write`、`edit`、`apply_patch`。配置工具拒绝组 `group:fs`（文件突变）和 `group:runtime`（shell/process）满足等效姿势。
- 当存在 `execApprovals` 规则时，exec-approvals 检查只读取实时 SQLite approvals 文档；缺失或无效的工件属于不可观测证据，而不是人为构造的通过结果。
- Secret 和身份验证配置文件证据仅记录 provider/source 姿势和 SecretRef 元数据，从不记录原始值。策略不会读取或证明每个代理凭证存储，例如 `openclaw-agent.sqlite`。
- data-handling 证据是配置级别的姿态（telemetry 捕获开关、session maintenance 模式、transcript-indexing 设置）以及始终开启的日志脱敏不变量。它不会检查日志、telemetry 导出、转录内容或 memory 文件，而干净的结果也不能证明其中不存在个人数据或密钥。
- 路由检查重用OpenClaw的运行时绑定解析器。路由证据仅记录检查 ID、解析的代理、匹配类型和编辑的绑定元数据。它从不记录对等、帐户、公会、团队或角色标识符。添加路由部分有意更改策略和证明哈希值；没有路由的策略保持其现有的证据形状。
