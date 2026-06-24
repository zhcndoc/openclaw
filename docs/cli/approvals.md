---
summary: "用于 `openclaw approvals` 和 `openclaw exec-policy` 的 CLI 参考"
read_when:
  - 你想从 CLI 编辑执行审批
  - 你需要在 gateway 或 node 主机上管理允许列表
title: "审批"
---

# `openclaw approvals`

管理 **本地主机**、**gateway 主机** 或 **node 主机** 的执行审批。
默认情况下，命令会针对磁盘上的本地审批文件。使用 `--gateway` 以针对 gateway，或使用 `--node` 以针对特定 node。

别名：`openclaw exec-approvals`

相关内容：

- 执行审批： [Exec approvals](/tools/exec-approvals)
- 节点： [Nodes](/nodes)

## `openclaw exec-policy`

`openclaw exec-policy` 是一个本地便捷命令，用于一步完成 requested
`tools.exec.*` 配置与本地主机审批文件的一致性维护。

当你想要以下操作时使用它：

- 检查本地请求的 policy、主机审批文件以及最终合并结果
- 应用本地预设，例如 YOLO 或 deny-all
- 同步本地 `tools.exec.*` 与本地主机审批文件

示例：

```bash
openclaw exec-policy show
openclaw exec-policy show --json

openclaw exec-policy preset yolo
openclaw exec-policy preset cautious --json

openclaw exec-policy set --host gateway --security full --ask off --ask-fallback full
```

输出模式：

- 不带 `--json`：打印可读性更强的表格视图
- `--json`：打印机器可读的结构化输出

当前范围：

- `exec-policy` 仅限本地
- 它会同时更新本地配置文件和本地审批文件
- 它不会将 policy 推送到 gateway 主机或 node 主机
- 此命令会拒绝 `--host node`，因为 node 执行审批会在运行时从 node 获取，必须通过面向 node 的审批命令来管理
- `openclaw exec-policy show` 会在运行时将 `host=node` 范围标记为由 node 管理，而不是从本地审批文件推导有效 policy

如果你需要直接编辑远程主机审批，请继续使用 `openclaw approvals set --gateway`
或 `openclaw approvals set --node <id|name|ip>`。

## 常用命令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

`openclaw approvals get` 现在会显示本地、gateway 和 node 目标的有效执行 policy：

- requested `tools.exec` policy
- 主机审批文件 policy
- 应用优先级规则后的有效结果

优先级是有意这样设计的：

- 主机审批文件是可执行的事实来源
- requested `tools.exec` policy 可以收紧或放宽意图，但最终有效结果仍由主机规则推导
- `--node` 会将 node 主机审批文件与 gateway 的 `tools.exec` policy 组合起来，因为二者在运行时都会生效
- 如果 gateway 配置不可用，CLI 会回退到 node 审批快照，并注明无法计算最终运行时 policy

## 从文件替换审批

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --stdin <<'EOF'
{ version: 1, defaults: { security: "full", ask: "off", askFallback: "full" } }
EOF
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

`set` 接受 JSON5，而不仅仅是严格 JSON。请使用 `--file` 或 `--stdin` 其中之一，不要同时使用。

## “永不提示” / YOLO 示例

对于一个在执行审批上绝不应停止的主机，将主机审批默认值设为 `full` + `off`：

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

node 变体：

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

这只会更改 **主机审批文件**。为了保持 requested OpenClaw policy 一致，也要设置：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
```

为什么在这个示例中使用 `tools.exec.host=gateway`：

- `host=auto` 仍然表示“在可用时使用 sandbox，否则使用 gateway”。
- YOLO 关注的是审批，而不是路由。
- 如果你希望即使配置了 sandbox 也使用主机 exec，请使用 `gateway` 或 `/exec host=gateway` 明确指定主机选择。

省略的 `askFallback` 默认值为 `deny`。在升级一个应保持永不提示行为的无 UI 主机时，请显式设置 `askFallback: "full"`。

本地快捷方式：

```bash
openclaw exec-policy preset yolo
```

这个本地快捷方式会同时更新本地 requested `tools.exec.*` 配置和本地审批默认值。其意图上等同于上面的手动两步设置，但仅适用于本机。

## 允许列表辅助命令

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## 常用选项

`get`、`set` 和 `allowlist add|remove` 都支持：

- `--node <id|name|ip>`
- `--gateway`
- 共享的 node RPC 选项：`--url`、`--token`、`--timeout`、`--json`

目标说明：

- 不带目标标志表示磁盘上的本地审批文件
- `--gateway` 针对 gateway 主机审批文件
- `--node` 在解析 id、名称、IP 或 id 前缀后，针对某个 node 主机

`allowlist add|remove` 还支持：

- `--agent <id>`（默认为 `*`）

## 说明

- `--node` 使用与 `openclaw nodes` 相同的解析器（id、名称、IP 或 id 前缀）。
- `--agent` 默认为 `"*"`，这会应用于所有 agent。
- node 主机必须声明 `system.execApprovals.get/set`（macOS 应用或无头 node 主机）。
- 审批文件按主机存储在 OpenClaw 状态目录中
  (`$OPENCLAW_STATE_DIR/exec-approvals.json`，或者
  在变量未设置时为 `~/.openclaw/exec-approvals.json`)。

## 相关

- [CLI reference](/cli)
- [Exec approvals](/tools/exec-approvals)
