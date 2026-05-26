---
summary: "按代理分层叠加在全局策略规则之上的 Per-agent Policy 插件覆盖层。"
read_when:
  - 你正在设计按代理划分的策略需求
  - 你需要区分工具姿态策略与工作区策略
  - 你正在为某个指定代理配置更严格的策略
title: "代理作用域策略覆盖层"
---

# 代理作用域策略覆盖层

OpenClaw 策略支持全局要求，以及针对明确运行时 agent id 的更严格要求。某些部署需要某一个 agent 使用比其他 agent 更严格的工作区和工具姿态，但部署范围内的规则不应强制每个 agent 都使用相同的姿态。

本页描述 agent 作用域的覆盖层模型。字段参考仍然是 [`openclaw policy`](/cli/policy)。

## 设计目标

- 保持全局策略作为部署基线。
- 允许一个命名 agent 在不削弱全局规则的前提下添加更严格的要求。
- 在证据可以归因到某个 agent 时，复用现有策略 section 的结构形态。
- 避免让 `agents.workspace` 变成第二套工具权限系统。
- 在全局证据尚不能映射到某个 agent 之前，保持这些仅全局检查仍然是全局的。

## 结构

对用途命名的 agent 策略作用域，使用 `scopes.<scopeName>`。每个作用域先列出它适用的运行时 `agentIds`，然后在 section 的证据可以归因到这些 agents 时，复用常规顶层策略 section 语法。最初随版本发布的作用域 section 是 `tools` 和 `agents.workspace`；sandbox 和 ingress 不包含在本次 PR 中，等这些策略 PR 落地并且其证据带有 agent 身份后，可以并入同一个容器。作用域字段清单由策略规则元数据支持，该元数据记录每个字段的严格性语义，供后续策略文件一致性校验使用。

```jsonc
{
  "tools": {
    "denyTools": ["process"],
  },
  "agents": {
    "workspace": {
      "allowedAccess": ["none", "ro"],
    },
  },
  "scopes": {
    "release-agent-lockdown": {
      "agentIds": ["release-agent"],
      "agents": {
        "workspace": {
          "allowedAccess": ["none", "ro"],
        },
      },
      "tools": {
        "profiles": { "allow": ["minimal", "messaging"] },
        "fs": { "requireWorkspaceOnly": true },
        "exec": {
          "allowSecurity": ["deny", "allowlist"],
          "requireAsk": ["always"],
          "allowHosts": ["sandbox"],
        },
        "elevated": { "allow": false },
        "alsoAllow": { "expected": ["message", "read"] },
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
    },
  },
}
```

`agents.workspace` 仍然是现有的全体 agent 工作区基线。`scopes.<scopeName>` 是一个作用域覆盖层，而不是全局策略的替代。作用域名称仅用于描述；实际匹配使用的是 `agentIds`，不是显示名。它刻意包含常规 section 名称，而不是专门为每个 agent 设计一套迷你语法。`policy.jsonc` 中出现的每个 scope 都必须有效且可执行。在本 PR 中，唯一支持的选择器是 `agentIds`，并且它只支持 `tools.*` 和 `agents.workspace.*`。

## 分层语义

策略评估是叠加式的：

1. 顶层策略适用于所有匹配的证据。
2. 现有的 `agents.workspace` 适用于默认值和其中列出的每个 agent。
3. `scopes.<scopeName>` 适用于 `agentIds` 中每个归一化运行时 id 的证据。
4. 当多个 scope block 管理不同字段时，它们可以针对同一个 agent；或者当同一字段的后续值依据策略元数据被判定为同样严格或更严格时，也可以如此。
5. 命名 agent 的覆盖层可以收紧策略，但不能让一个全局违规变得可接受。

如果全局规则和 agent 作用域规则都失败，结果应指向被违反的那条规则：

```text
oc://policy.jsonc/tools/denyTools
oc://policy.jsonc/scopes/release-agent-lockdown/tools/denyTools
oc://policy.jsonc/scopes/release-agent-lockdown/agents/workspace/allowedAccess
```

这样即使它们观察的是同一组配置字段，广泛工具姿态、命名 agent 工具姿态和工作区姿态仍然可以作为独立要求进行审计。

诸如 `tools.alsoAllow.expected` 这样的精确列表声明，会将已配置列表与期望列表进行比较，并报告缺失的期望项以及多出的意外项。这用于诸如 `alsoAllow` 这样的叠加式姿态，因为多出一项就可能把某个 agent 的权限扩展到其已审查角色之外。

## 策略与配置分层

覆盖层模型将策略的编写位置与 OpenClaw 配置的观测位置分离：

| 策略作用域                           | 观测到的配置                                       | 适用对象                           | 示例结果                                                                    |
| ------------------------------------ | -------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| 顶层 `tools.*`                      | 全局 `tools.*` 和继承的 agent 工具姿态             | 所有使用匹配姿态的 agents          | 除非全局策略允许，否则拒绝每个 agent 使用 `gateway` 作为 exec host。        |
| 顶层 `tools.*`                      | `agents.list[].tools.*` 覆盖项                     | 任何带有覆盖项的 agent             | 标记某个将 `tools.exec.host` 覆盖为未批准值的 agent。                        |
| `scopes.<scopeName>.tools.*`        | 匹配的 `agents.list[]` 条目及继承的姿态             | 仅该命名 agent                     | 允许大多数 agent 使用 `node` 作为 exec host，而某个 agent 只能使用 `sandbox`。 |
| `agents.workspace`                  | 默认值和每个已列出的 agent 工作区姿态               | 默认值和所有已列出的 agents         | 要求所有 agent 的工作区访问都只能是 `none` 或 `ro`。                         |
| `scopes.<scopeName>.agents.workspace.*` | 匹配的 `agents.list[]` 工作区姿态                | 仅该命名 agent                     | 要求某一个 agent 只读，而不要求 `main` 也必须如此。                          |

按 agent 的覆盖层是叠加式的。命名 agent 规则可以比顶层规则更严格，但不能让全局违规变得可接受。对于 allow-list 规则，当全局规则和命名 agent 覆盖层都存在时，生效的允许集合是两者的交集。

例如，如果顶层 `tools.exec.allowHosts` 允许 `["sandbox", "node"]`，而 `scopes.release-agent-lockdown.tools.exec.allowHosts` 只允许 `["sandbox"]`，那么当 `release-agent` 的生效 exec host 是 `node` 时会失败；但另一个 agent 仍然可以使用 `node` 通过。

## 工具姿态与工作区姿态

工具姿态归属于 `tools`，因为它描述的是配置可能暴露什么样的工具行为。现有的 `tools.*` 策略同时观察全局 `tools.*` 配置和按 agent 的 `agents.list[].tools.*` 覆盖项。

工作区姿态归属于 `workspace`，因为它描述的是 sandbox 模式和工作区访问。工作区 section 不应扩展成一个通用的工具策略命名空间。如果某个 agent 需要更严格的工具限制才能让它的工作区姿态有意义，就把这些限制放到同一个 agent 覆盖层下的 `scopes.<scopeName>.tools` 中。

对于受限的 release agent，预期的拆分如下：

```jsonc
{
  "scopes": {
    "release-agent-lockdown": {
      "agentIds": ["release-agent"],
      "agents": {
        "workspace": { "allowedAccess": ["none", "ro"] },
      },
      "tools": {
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
    },
  },
}
```

## Section 适用性

只有在策略证据带有 agent id，或者能够在不猜测的情况下归因到某个 agent 时，才应添加 agent 作用域的 section。

| Section     | 初始 agent 作用域状态 | 原因                                                                |
| ----------- | -------------------- | ------------------------------------------------------------------- |
| `workspace` | 包含                 | agent sandbox/workspace 证据已经具有 agent 身份。                    |
| `tools`     | 包含                 | 工具姿态证据包含全局和按 agent 的工具配置。                          |
| `sandbox`   | 后续流水线跟进       | 在 sandbox 姿态 PR 落地且证据可按作用域划分之前先不要纳入。          |
| `ingress`   | 后续流水线跟进       | 在 ingress/channel 姿态落地并带有 agent 归因之前先不要纳入。         |
| `models`    | 在可映射时包含       | 选定的模型引用可以是 agent 级别的。                                  |
| `mcp`       | 在可映射时包含       | 仅在 MCP server 证据可归因到某个 agent 时使用。                       |
| `auth`      | 推迟                 | 除非 agent 绑定是明确的，否则 auth profile 元数据只是配置目录。      |
| `channels`  | 推迟                 | 在路由范围化之前，channel provider 姿态属于部署级别。                 |
| `gateway`   | 保持全局             | gateway 暴露/auth/http 姿态属于进程级别。                            |
| `network`   | 保持全局             | 私有网络 SSRF 姿态属于运行时级别。                                   |
| `secrets`   | 先保持全局           | 除非引用项带有 agent 归因，否则 secret provider 姿态是共享的。       |

## 兼容性

实现是增量式的：

- 保留所有现有顶层策略字段的有效性；
- 保持 `agents.workspace` 语义不变；
- 在评估作用域规则之前先验证 `scopes`；
- 在其证据和策略契约实现之前，清晰地拒绝不受支持的作用域 section；
- 不要把顶层 `tools.requireMetadata` 重新解释为 agent 作用域，因为工具元数据描述的是已声明的工作区工具目录；
- 当存在任何作用域规则时，把 agent 作用域证据包含进 attestation hash。

这样可以让广泛工具姿态继续作为顶层策略契约，同时允许命名 agent 添加更严格的可观测声明，而不会削弱全局基线。
