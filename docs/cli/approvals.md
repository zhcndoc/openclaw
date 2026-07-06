---
summary: "用于 `openclaw approvals` 和 `openclaw exec-policy` 的 CLI 参考"
read_when:
  - 你想从 CLI 编辑执行审批
  - 你需要在 gateway 或 node 主机上管理允许列表
title: "审批"
---

# `openclaw approvals`

管理 **本地主机**、**gateway 主机** 或 **node 主机** 的执行审批。未指定目标标志时，命令会读取/写入磁盘上的本地审批文件。使用 `--gateway` 可针对 gateway，或使用 `--node <id|name|ip>` 可针对特定 node。

别名：`openclaw exec-approvals`

相关内容：[Exec approvals](/tools/exec-approvals), [Nodes](/nodes)

## `openclaw exec-policy`

`openclaw exec-policy` 是一个**仅限本地**的便捷命令，可在一步中保持所请求的 `tools.exec.*` 配置与本地主机审批文件同步：

```bash
openclaw exec-policy show
openclaw exec-policy show --json

openclaw exec-policy preset yolo
openclaw exec-policy preset cautious --json

openclaw exec-policy set --host gateway --security full --ask off --ask-fallback full
```

预设（`yolo`、`cautious`、`deny-all`）会同时应用 `host`、`security`、`ask` 和 `askFallback`。`set` 只应用你传入的标志；每个被接受的值都会经过校验（`--host auto|sandbox|gateway|node`、`--security deny|allowlist|full`、`--ask off|on-miss|always`、`--ask-fallback deny|allowlist|full`）。

范围：

- 同时更新本地配置文件和本地审批文件；不会将策略推送到 gateway 或 node 主机。
- `--host node` 会被拒绝：node exec 审批会在运行时从 node 获取，因此本地 `exec-policy` 无法同步它们。请改用 `openclaw approvals set --node <id|name|ip>`。
- `exec-policy show` 会将 `host=node` 范围在运行时标记为由 node 管理，而不是从本地审批文件推导有效策略。

对于远程主机审批，请直接使用 `openclaw approvals set --gateway` 或 `openclaw approvals set --node <id|name|ip>`。

## 常用命令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

`get` 会显示目标的有效 exec 策略：请求的 `tools.exec` 策略、主机 approvals-file 策略，以及合并后的有效结果。

优先级：

- 主机 approvals 文件是具有强制效力的事实来源。
- 请求的 `tools.exec` 策略可以收窄或放宽意图，但最终有效结果由主机规则决定。
- `--node` 会将节点主机 approvals 文件与网关 `tools.exec` 策略结合起来（运行时两者都生效）。
- 如果网关配置不可用，CLI 会回退到节点 approvals 快照，并注明无法计算最终的运行时策略。

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

将某个绝不应在执行审批时停止的主机的主机审批默认值设置为 `full` + `off`：

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

Node 变体：使用 `openclaw approvals set --node <id|name|ip> --stdin`，正文相同。

这只会更改 **主机审批文件**。为了保持请求的 OpenClaw 策略一致，也要设置：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
```

这里明确指定 `tools.exec.host=gateway`，因为 `host=auto` 仍然表示“可用时使用沙箱，否则使用网关”：YOLO 关注的是审批，而不是路由。 当你希望即使配置了沙箱也使用主机执行时，请使用 `gateway`（或 `/exec host=gateway`）。

如果省略 `askFallback`，默认值是 `deny`。当升级一个无 UI 的主机并且希望保持永不提示行为时，请显式设置 `askFallback: "full"`。

同样意图的本地快捷方式，仅在本机上使用：

```bash
openclaw exec-policy preset yolo
```

## 白名单助手

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## 常用选项

`get`、`set` 和 `allowlist add|remove` 都支持：

- `--node <id|name|ip>`（解析 id、名称、IP 或 id 前缀；与 `openclaw nodes` 使用相同的解析器）
- `--gateway`
- 共享的 node RPC 选项：`--url`、`--token`、`--timeout`、`--json`

不指定目标标志时，表示磁盘上的本地审批文件。

`allowlist add|remove` 还支持 `--agent <id>`（默认为 `"*"`，应用于所有 agent）。

## 说明

- 节点主机必须声明 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。
- 审批文件按主机存储在 OpenClaw 状态目录中：`$OPENCLAW_STATE_DIR/exec-approvals.json`，如果未设置该变量，则为 `~/.openclaw/exec-approvals.json`。

## 相关

- [CLI 参考](/cli)
- [执行审批](/tools/exec-approvals)
