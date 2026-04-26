---
summary: "`openclaw approvals` 和 `openclaw exec-policy` 的 CLI 参考"
read_when:
  - 你想从 CLI 编辑 exec approvals
  - 你需要在网关或节点主机上管理 allowlists
title: "Approvals"
---

# `openclaw approvals`

管理**本地主机**、**网关主机**或**节点主机**的 exec approvals。
默认情况下，命令操作的是磁盘上的本地 approvals 文件。使用 `--gateway` 以操作网关，或使用 `--node` 以操作特定节点。

别名：`openclaw exec-approvals`

相关：

- Exec approvals：[Exec approvals](/tools/exec-approvals)
- 节点：[Nodes](/nodes)

## `openclaw exec-policy`

`openclaw exec-policy` 是一个本地便捷命令，用于一步到位保持请求的 `tools.exec.*` 配置与本地主机 approvals 文件一致。

适用于以下场景：

- 检查本地请求的策略、主机 approvals 文件和有效合并结果
- 应用本地预设，例如 YOLO 或 deny-all
- 同步本地 `tools.exec.*` 和本地 `~/.openclaw/exec-approvals.json`

示例：

```bash
openclaw exec-policy show
openclaw exec-policy show --json

openclaw exec-policy preset yolo
openclaw exec-policy preset cautious --json

openclaw exec-policy set --host gateway --security full --ask off --ask-fallback full
```

输出模式：

- 无 `--json`：打印人类可读的表格视图
- `--json`：打印机器可读的结构化输出

当前范围：

- `exec-policy` 仅限**本地**
- 它同时更新本地配置文件和本地 approvals 文件
- 它**不会**将策略推送到网关主机或节点主机
- 此命令拒绝 `--host node`，因为节点 exec approvals 是在运行时从节点获取的，必须改为通过针对节点的 approvals 命令进行管理
- `openclaw exec-policy show` 将 `host=node` 范围标记为运行时由节点管理，而不是从本地 approvals 文件推导有效策略

如果你需要直接编辑远程主机 approvals，请继续使用 `openclaw approvals set --gateway` 或 `openclaw approvals set --node <id|name|ip>`。

## 常用命令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

`openclaw approvals get` 现在显示本地、网关和节点目标的有效 exec 策略：

- 请求的 `tools.exec` 策略
- 主机 approvals 文件策略
- 应用优先级规则后的有效结果

优先级是有意设计的：

- 主机 approvals 文件是可执行的真实来源
- 请求的 `tools.exec` 策略可以缩小或扩大意图，但有效结果仍源自主机规则
- `--node` 将节点主机 approvals 文件与网关 `tools.exec` 策略结合，因为两者在运行时都适用
- 如果网关配置不可用，CLI 将回退到节点 approvals 快照，并注明无法计算最终运行时策略

## 从文件替换 approvals

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --stdin <<'EOF'
{ version: 1, defaults: { security: "full", ask: "off" } }
EOF
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

`set` 接受 JSON5，不仅是严格 JSON。使用 `--file` 或 `--stdin`，不要同时使用。

## "从不提示" / YOLO 示例

对于不应在 exec approvals 上停止的主机，将主机 approvals 默认值设置为 `full` + `off`：

```bash
openclaw approvals set --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

节点变体：

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

这仅更改 **主机 approvals 文件**。为了保持请求的 OpenClaw 策略一致，还需设置：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
```

为何在此示例中使用 `tools.exec.host=gateway`：

- `host=auto` 仍然意味着“可用时使用沙盒，否则使用网关”。
- YOLO 是关于 approvals 的，而不是路由。
- 即使配置了沙盒，如果你想要主机执行，请使用 `gateway` 或 `/exec host=gateway` 明确指定主机选择。

这与当前的主机默认 YOLO 行为匹配。如果你想要 approvals，请收紧设置。

本地快捷方式：

```bash
openclaw exec-policy preset yolo
```

该本地快捷方式同时更新请求的本地 `tools.exec.*` 配置和本地 approvals 默认值。其意图等同于上述手动两步设置，但仅适用于本地机器。

## 允许列表助手

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## 常用选项

`get`、`set` 和 `allowlist add|remove` 均支持：

- `--node <id|name|ip>`
- `--gateway`
- 共享节点 RPC 选项：`--url`、`--token`、`--timeout`、`--json`

目标指定说明：

- 无目标标志意味着磁盘上的本地 approvals 文件
- `--gateway` 针对网关主机 approvals 文件
- `--node` 在解析 id、name、IP 或 id 前缀后针对一个节点主机

`allowlist add|remove` 还支持：

- `--agent <id>`（默认为 `*`）

## 注意事项

- `--node` 使用与 `openclaw nodes` 相同的解析器（id、name、ip 或 id 前缀）。
- `--agent` 默认为 `"*"`，表示应用于所有 agent。
- 节点主机必须公开 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。
- approvals 文件按主机存储在 `~/.openclaw/exec-approvals.json`。

## 相关

- [CLI reference](/cli)
- [Exec approvals](/tools/exec-approvals)
