---
summary: "使用 `scopes.<scopeName>` 让特定代理或渠道遵守比基准更严格的策略"
read_when:
  - "某些智能体或渠道需要比顶级基线更严格的政策"
  - "您想知道哪些部分接受 `agentIds` 或 `channelIds` 选择器"
  - "范围容器姿势规则报告不可观察的证据"
title: "范围政策覆盖"
sidebarTitle: "范围覆盖"
---

让指定代理或渠道遵守比基线更严格的规则。 [`openclaw policy`](/cli/policy) 参考的一部分。

## <a id="scoped-overlays"></a> 范围叠加

当特定代理或通道需要比顶层基线更严格的策略时，请使用 `scopes.<scopeName>`。作用域名称只是一个标签；匹配使用作用域内的选择器。覆盖是叠加式的：全局规则仍会运行，而作用域规则可以基于相同证据添加自己的发现。

| 选择器     | 支持的部分                                                             | 适用场景                                          |
| ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| `agentIds`   | `tools`, `agents.workspace`, `sandbox`, `dataHandling.memory`, `execApprovals` | 一个或多个运行时代理需要更严格的规则。   |
| `channelIds` | `ingress.channels`                                                             | 一个或多个通道需要更严格的入口规则。 |

如果 `agentIds` 条目不存在于 `agents.entries.*` 中，则 OpenClaw 会根据该运行时代理 ID 的继承 global/default 状态评估范围规则，而不是跳过它。

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

后端授权使用配置的身份。 `backend: "docker"` 需要 `allowBackends: ["docker"]`，而 `backend: "podman"` 需要 `allowBackends: ["podman"]`。

顶层的 `ingress.session.requireDmScope` 保持全局生效；`session.dmScope` 不是可归属于通道的证据，因此不能通过 `channelIds` 设置作用域。

`policy.jsonc` 中出现的每个 scope 都必须有效且可执行。
