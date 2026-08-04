---
summary: "用于 `openclaw approvals` 和 `openclaw exec-policy` 的 CLI 参考"
read_when:
  - 你想从 CLI 编辑 exec 批准
  - 你需要在 gateway 或 node 主机上管理 allowlist
  - 你需要在没有聊天界面的情况下列出或解析待处理的批准
title: "审批"
---

# `openclaw approvals`

管理 **本地主机**、**gateway 主机** 或 **node 主机** 的 exec 批准。若不指定目标标志，命令会读取/写入共享 SQLite 状态中的本地 approvals 文档。使用 `--gateway` 以定位 gateway，或使用 `--node <id|name|ip>` 以定位特定 node。

别名：`openclaw exec-approvals`

相关内容：[Exec 审批](/tools/exec-approvals)、[节点](/nodes)。

## `openclaw exec-policy`

`openclaw exec-policy` 是一个**仅本地**的便捷命令，可一步将所请求的 `tools.exec.*` 配置与本地主机审批文档保持同步：

```bash
openclaw exec-policy show
openclaw exec-policy show --json

openclaw exec-policy preset yolo
openclaw exec-policy preset cautious --json

openclaw exec-policy set --host gateway --security full --ask off --ask-fallback full --json
```

预设（`yolo`、`cautious`、`deny-all`）会同时应用 `host`、`security`、`ask` 和 `askFallback`。`set` 只应用你传入的标志；每个被接受的值都会经过校验（`--host auto|sandbox|gateway|node`、`--security deny|allowlist|full`、`--ask off|on-miss|always`、`--ask-fallback deny|allowlist|full`）。

`show`、`preset` 和 `set` 接受 `--json`，并将请求的策略、主机策略和有效策略信息作为一个 JSON 对象返回。

范围：

- 同时更新本地配置文件和本地审批文档；不会将策略推送到网关或节点主机。
- `--host node` 会被拒绝：节点 exec 审批会在运行时从节点获取，因此本地 `exec-policy` 无法同步它们。请改用 `openclaw approvals set --node <id|name|ip>`。
- `exec-policy show` 会在运行时将 `host=node` 的作用域标记为由节点管理，而不是根据本地审批文档推导有效策略。

对于远程主机审批，请直接使用 `openclaw approvals set --gateway` 或 `openclaw approvals set --node <id|name|ip>`。

## 常用命令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
openclaw approvals pending
openclaw approvals resolve <id> <allow-once|allow-always|deny>
```

`get` 显示目标的有效执行策略：请求的 `tools.exec` 策略、主机 approvals 文件策略，以及合并后的有效结果。对于具有主机原生策略的节点，例如 Windows companion，会直接显示该策略，而不是应用 OpenClaw approvals 文件的策略计算。

对于基于文件的节点，合并视图需要一个由主机解析得到的策略快照。较旧的节点会将有效策略显示为不可用，而不是假定网关请求的策略也同样适用于主机。

<Note>
每个会话的 `/exec` 覆盖不会包含在内。请在相关会话中运行 `/exec`，以查看其当前默认值。
</Note>

优先级：

- 主机 approvals 文档是具有强制执行力的事实来源。
- 请求的 `tools.exec` 策略可以收窄或扩大意图，但有效结果由主机规则决定。
- `--node` 会将节点主机 approvals 文档与网关 `tools.exec` 策略结合起来（两者都会在运行时生效）。
- 如果网关配置不可用，CLI 会回退到节点 approvals 快照，并注明无法计算最终运行时策略。

## 待审批项

从 Gateway 列出待处理的 exec、插件和 OpenClaw 系统代理审批：

```bash
openclaw approvals pending
openclaw approvals pending --json
```

完整枚举以及匹配的全局 `resolve` 流程使用 `operator.admin`，因为否则审批记录会保留请求者/审查者筛选。解析还需要专用的 `operator.approvals` 范围。标准 CLI operator 授权包含这两个范围；受限的第三方客户端不应仅为了模拟此命令而请求 admin。

人类可读输出会显示审批类型、代理/会话归属、请求年龄、到期前剩余时间、缩短后的命令或摘要，以及一个 shell 中立的 `id64_<base64url>` id token。一个 `Full request text` 块总是跟在紧凑表格之后，包含每个完整 token 以及一个无损转义的请求，因此终端宽度缩短不会隐藏后缀，也不会隐藏解析所需的 token。将完整 token 复制到 `resolve` 中。其他字段中的不安全终端字符会以可见的 Unicode 转义显示。JSON 输出会在 `approvals` 下返回规范化条目，为脚本保留原始的 `id`、`summary`、`createdAtMs` 和 `expiresAtMs`；原始 id 仍可被 `resolve` 接受，除非它们使用保留的 `id64_` 显示 token 前缀。

如果提供的 `id64_` 值同时匹配某个字面原始 id 和另一个审批的解码显示 token，CLI 会将其拒绝为歧义项，而不是冒险解析错误的请求。

通过完整 id 解析一个审批：

```bash
openclaw approvals resolve <id> allow-once
openclaw approvals resolve <id> allow-always
openclaw approvals resolve <id> deny --reason "维护期间未预期"
```

CLI 读取统一的审批记录来选择其类型，检查请求的决策是否在记录允许的决策之内，然后调用统一解析器。第一次成功决策会以 `0` 退出。重复记录的相同决策也会以 `0` 退出，并报告 `already resolved (same decision)`。冲突的决策、缺失的审批、已过期的审批，或者该审批类型不支持的决策都会打印清晰的错误并以非零状态退出。

`--reason` 会在 CLI 确认中添加一条本地备注。当前 Gateway 审批记录没有自由文本的 resolution-reason 字段，因此此备注不会被持久化，也不会发送到其他审批界面。

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

主机原生 Windows 节点使用其自己的策略结构：

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  defaultAction: "deny",
  rules: [{ pattern: "hostname", action: "allow" }]
}
EOF
```

CLI 会先读取节点当前的哈希值，并在更新时一并发送，因此并发的本地编辑会被拒绝，而不会被覆盖。`rules` 是必需的，因为此操作会替换节点的完整规则列表；`defaultAction` 是可选的。报告其原生策略为已禁用的节点不能通过远程方式配置；请先在该主机上启用或配置该策略。主机原生策略不支持 `allowlist add|remove` 辅助命令。

## “绝不提示” / YOLO 示例

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

对于公开 OpenClaw approvals 文档的节点，请使用相同的正文以及 `openclaw approvals set --node <id|name|ip> --stdin`。主机原生节点需要其所有者特定的形状，如上所示。

这只会更改 **主机审批文档**。为了保持所请求的 OpenClaw 策略一致，还要设置：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.mode full
```

这里明确指定 `tools.exec.host=gateway`，因为 `host=auto` 仍然表示“可用时使用沙箱，否则使用网关”：YOLO 关注的是审批，而不是路由。当你希望即使配置了沙箱也使用主机执行时，请使用 `gateway`（或 `/exec host=gateway`）。

如果省略 `askFallback`，默认值是 `deny`。当升级一个无 UI 的主机并且希望保持绝不提示行为时，请显式设置 `askFallback: "full"`。

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

没有目标标志时，表示共享状态数据库中的本地审批行。

`allowlist add|remove` 还支持 `--agent <id>`（默认为 `"*"`，应用于所有 agent）。

`pending` 和 `resolve` 始终使用 Gateway，因为待处理请求是 Gateway 的实时状态。它们支持共享的 Gateway 连接选项 `--url`、`--token` 和 `--timeout`；`pending` 还支持 `--json`。

## 说明

- 节点主机必须声明 `system.execApprovals.get/set`（macOS 应用、无头节点主机或 Windows companion）。
- 审批按主机存储在
  `$OPENCLAW_STATE_DIR/state/openclaw.sqlite#exec_approvals_config`，或者在该变量未设置时存储在
  `~/.openclaw/state/openclaw.sqlite#exec_approvals_config`。后缀标识该单例 SQLite 行。

## 相关

- [CLI 参考](/cli)
- [执行审批](/tools/exec-approvals)
