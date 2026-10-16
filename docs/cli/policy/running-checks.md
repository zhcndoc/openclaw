---
summary: "`policy check`、`policy compare` 以及管理它们的 `plugins.entries.policy.config` 设置"
read_when:
  - "您想要在创作时运行策略检查"
  - "您想要将策略文件与编写的基线进行比较"
  - "您需要更改策略工件所在的位置或对其进行哈希锁定"
title: "运行和配置策略检查"
sidebarTitle: "运行检查"
---

在创作期间运行检查及其背后的插件设置。 [`openclaw policy`](/cli/policy) 参考的一部分。

## <a id="run-checks"></a> 运行检查

在编写期间运行仅策略检查：

```bash
openclaw policy check
openclaw policy check --agent ops
openclaw policy check --json
openclaw policy check --severity-min error
```

`policy check` 仅运行策略检查集并发出证据、发现和证明哈希值。当启用策略插件时，相同的发现也会出现在 `openclaw doctor --lint` 中。在具有显式所有权的多代理队列中，传递 `--agent <id>`，以便命令从该代理的工作区读取受管理的声明和 `policy.jsonc`。独家代理或保留的旧所有者配置仍然可以在没有该标志的情况下解析； OpenClaw 从不选择任意的第一代理。

将运算符策略文件与已编写的基线进行比较：

```bash
openclaw policy compare --baseline official.policy.jsonc
openclaw policy compare --baseline official.policy.jsonc --agent ops
openclaw policy compare --baseline official.policy.jsonc --policy policy.jsonc --json
```

`policy compare` 根据策略文件语法检查策略文件语法；它不检查运行时状态、证据、凭证或秘密。它使用管理范围覆盖的相同规则元数据：允许列表必须保持相等或更窄，拒绝列表必须保持相等或更宽，所需的布尔值必须保持其值，有序字符串只能移向配置顺序的更严格一端，并且精确列表必须匹配。基线可以是组织制定的策略；检查的策略可能会添加更严格的值或额外的规则。当顶级检查规则具有同等或更严格的限制时，它可以满足范围基线规则。文件之间的范围名称不需要匹配；比较由选择器 （`agentIds`/`channelIds`） 和字段键入。对于路由检查，每个基线检查 ID 必须保持相同的路由和预期代理。已检查的策略可能会添加检查或缩小 `matchedBy` 的范围，但删除检查、更改其路由或代理或扩大其接受的匹配类型会较弱。当检查的策略路径来自插件配置并且是相对的时，`--agent <id>` 选择用于解析它的工作区。绝对策略路径不依赖于代理工作区。

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

干净的 `policy check --json` 输出包含运算符或监督者可记录的稳定哈希：

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

## <a id="configure-policy"></a> 配置策略

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

| 设置                   | 用途                                                         |
| ------------------------- | --------------------------------------------------------------- |
| `enabled`                 | 即使 `policy.jsonc` 尚不存在，也启用策略检查。         |
| `workspaceRepairs`        | 允许 `doctor --fix` 编辑受策略管理的工作区设置。 |
| `expectedHash`            | 已批准策略制品的可选哈希锁。            |
| `expectedAttestationHash` | 上次接受的干净策略检查结果的可选哈希锁。    |
| `path`                    | 策略制品在工作区中的相对路径。             |

将 `plugins.entries.policy.config.enabled` 设置为 `false`，即可在保留插件安装的同时，为某个工作区禁用策略检查。
