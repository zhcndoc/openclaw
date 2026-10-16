---
summary: "用于 `openclaw approvals` 和 `openclaw exec-policy` 的 CLI 参考"
read_when:
  - "你想从 CLI 编辑 exec 批准"
  - "你需要在 gateway 或 node 主机上管理 allowlist"
  - "你需要在没有聊天界面的情况下列出或解析待处理的批准"
  - "代理无法运行命令，您需要区分工具访问和批准"
title: "批准"
---

# `openclaw approvals`

管理 **本地主机**、**网关主机** 或 **节点主机** 的执行批准。如果没有目标标志，`get`、`set` 和白名单编辑会选择处于共享 SQLite 状态的本地审批文档。如果网关拥有该状态目录，则 CLI 使用其经过身份验证的批准 RPC；否则通过运营拥有独家线下所有权。 `get` 参与是因为它可以初始化缺失状态。使用 `--gateway` 显式定位已配置的网关，或使用 `--node <id|name|ip>` 定位特定节点；这些目标合同没有变化。

默认本地路由需要操作的 [ 所有者能力 ](/gateway/protocol/versioning#local-state-owner-routing) 和 `operator.admin`。缺少凭据、较旧的网关或不确定的答复永远不会回退到直接本地写入。在脱机重试之前，通过其服务所有者更新或停止所有者。不确定保存后，请在重试之前检查 `openclaw approvals get --json`。保存保留其快照哈希比较和设置检查；过时的哈希需要重新加载并重新应用编辑。路由仅更改突变传输，而不更改任何策略或拨款授权执行的内容。

别名：`openclaw exec-approvals`

相关内容：[Exec 审批](/tools/exec-approvals)、[节点](/nodes)。

## <a id="common-commands"></a> 常用命令

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

## <a id="pending-approvals"></a> 待审批项

从 Gateway 列出待处理的 exec、插件和 OpenClaw 系统代理审批：

```bash
openclaw approvals pending
openclaw approvals pending --json
```

完整枚举和匹配的运营商范围 `resolve` 流使用 `operator.admin`，因为批准记录否则会保留 requester/reviewer 过滤。决议还要求使用专用的 `operator.approvals` 示波器。标准 CLI 运营商补助金包括这两个范围；受限制的第三方客户端不应仅仅请求管理员模拟此命令。

人工输出显示批准类型、agent/session 属性、请求期限、到期时间、缩短的命令或摘要以及 shell 中立的 `id64_<base64url>` id 令牌。 `Full request text` 块始终遵循带有每个完整令牌和无损转义请求的紧凑表，因此终端宽度缩短无法隐藏后缀或解析所需的令牌。将完整令牌复制到 `resolve` 中。其他字段中的不安全终端字符显示为可见的 Unicode 转义符。 JSON 输出返回 `approvals` 下的标准化条目，保留脚本的原始原始 `id`、`summary`、`createdAtMs` 和 `expiresAtMs`；原始 ID 仍然被 `resolve` 接受，除非它们使用保留的 `id64_` 显示令牌前缀。

如果提供的 `id64_` 值同时匹配某个字面原始 id 和另一个审批的解码显示 token，CLI 会将其拒绝为歧义项，而不是冒险解析错误的请求。

通过完整 id 解析一个审批：

```bash
openclaw approvals resolve <id> allow-once
openclaw approvals resolve <id> allow-always
openclaw approvals resolve <id> deny --reason "Not expected during maintenance"
```

对于 exec 请求，`allow-always` 表示 **始终允许此处**：生成的授权与命令的确切参数和当前工作目录相关联。来自另一个目录的相同命令需要单独的批准。

对于自动化 （cron） 运行提出的批准，`allow-always` 会铸造范围内的常设拨款，而不是 JSON 允许列表条目（请参阅 [ 自动化的常设拨款](/tools/exec-approvals#standing-grants-for-automations)）。默认情况下，赠款一直有效，直至被撤销； `--expires-in-days <n>` 冻结显式生命周期，而不是配置的 `tools.exec.grantExpiryDays` 默认值：

```bash
openclaw approvals resolve <id> allow-always --expires-in-days 30
```

## <a id="standing-grants"></a> 常设补助金

由始终允许自动化批准创建的常设授权会从同一命令组列出和撤销：

```bash
openclaw approvals grants list
openclaw approvals grants list --json
openclaw approvals grants revoke <grant-id>
```

该列表显示了拥有的自动化、确切的命令、使用计数以及每个授权的状态（直到撤销、N 天后到期、过期或撤销）。重复撤销不会产生额外效果。它在下一个事件的生成边界处生效——该事件会再次提示。编辑或删除自动化会使其授权失效，无需显式撤销。

CLI 读取统一的审批记录来选择其类型，检查请求的决策是否在记录允许的决策之内，然后调用统一解析器。第一次成功决策会以 `0` 退出。重复记录的相同决策也会以 `0` 退出，并报告 `already resolved (same decision)`。冲突的决策、缺失的审批、已过期的审批，或者该审批类型不支持的决策都会打印清晰的错误并以非零状态退出。

`--reason` 会在 CLI 确认中添加一条本地备注。当前 Gateway 审批记录没有自由文本的 resolution-reason 字段，因此此备注不会被持久化，也不会发送到其他审批界面。

## <a id="replace-approvals-from-a-file"></a> 从文件替换审批

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

## <a id="%22never-prompt%22-%2F-yolo-example"></a><a id="never-prompt-/-yolo-example"></a> “绝不提示” / YOLO 示例

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

## <a id="allowlist-helpers"></a> 白名单助手

```bash
openclaw approvals allowlist add "~/path/to/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/path/to/**/bin/rg"
```

添加现有模式或删除缺失模式无需写入即可成功。对于 `--json`，这些命令返回未更改的、经过编辑的批准快照。

## <a id="common-options"></a> 常用选项

`get`、`set` 和 `allowlist add|remove` 都支持：

- `--node <id|name|ip>`（解析 id、名称、IP 或 id 前缀；与 `openclaw nodes` 使用相同的解析器）
- `--gateway`
- 共享的 node RPC 选项：`--url`、`--token`、`--timeout`、`--json`

没有目标标志时，表示共享状态数据库中的本地审批行。

`allowlist add|remove` 还支持 `--agent <id>`（默认为 `"*"`，应用于所有 agent）。

`pending` 和 `resolve` 始终使用 Gateway，因为待处理请求是 Gateway 的实时状态。它们支持共享的 Gateway 连接选项 `--url`、`--token` 和 `--timeout`；`pending` 还支持 `--json`。

## `openclaw exec-policy`

`openclaw exec-policy show` 解释座席的终端工具策略并单独显示命令批准。检查永远不会改变权限。 `preset` 和 `set` 将请求的 `tools.exec.*` 配置与本地主机批准文档同步。

```bash
openclaw exec-policy show
openclaw exec-policy show --agent main
openclaw exec-policy show --session agent:main:main
openclaw exec-policy show --agent main --verbose
openclaw exec-policy show --agent main --json

openclaw exec-policy preset yolo
openclaw exec-policy preset cautious --json

openclaw exec-policy set --host gateway --security full --ask off --ask-fallback full --json
```

### <a id="inspect-terminal-access"></a> 检查终端接入情况

没有`--session`，`show` 离线工作。它报告本地工具配置文件和策略中的明确排除。本地允许的工具执行访问是**unverified**；模型、通道、沙箱、会话和运行时限制仍可能影响可用性。

该报告首先介绍代理和终端访问状态，然后是配置文件继承、`exec` 和 `process` 的发现、本地命令批准以及下一步。代理配置文件会覆盖全局配置文件。例如，`agents.entries.main.tools.profile: "messaging"` 排除终端工具，即使 `tools.profile` 是 `"full"`。命令批准设置不授予工具访问权限。有意限制的配置文件是有效的配置。

- `--agent <id>` 选择代理进行考察。如果没有 `--session`，则必须在本地配置代理。对于单个配置的代理，选择是自动的。对于多个代理，非目标报告会要求您在检查工具可用性之前选择代理或代理限定的会话密钥。在没有配置代理的情况下，它解释了如何添加代理。这两种情况仍然显示了所有本地指挥批准范围的紧凑摘要。
- `--session <key>` 通过网关从其保存的设置中获取 **existing** 会话的只读工具预览。使用完整的会话密钥；对于 `global` 等共享密钥，网关解析其代理；当网关需要显式选择时，传递 `--agent`。该代理不必存在于 CLI 计算机的配置中。冲突的代理和会话目标将被拒绝。
- `--verbose` 添加了所有范围的政策来源和完整的 requested/host/effective 批准表。
- `--json` 保留所有批准字段和范围。对于选定的代理，它会添加 `toolAccess`，将 `local` 结果与可选的 `live` 结果分开。如果 CLI 计算机上未配置代理，则省略 `local`。如果失败的会话检查无法解析代理，则也会省略 `agentId`。非目标多代理或空名册报告会添加 `toolAccessSelectionRequired`、`agentIds` 和 `hint`；它没有提出任何工具可用性声明。

会话预览支持共享网关连接选项（`--url`、`--port`、`--token`、`--password`、`--timeout`）。如果无法检查网关或会话，报告会显示 **UNVERIFIED** 并保留任何可用的本地结果。缺少本地工具策略将被标记为不可用、绝不允许。无法进行的检查并不能证明工具被允许或拒绝。

成功提取会报告 **PREVIEW**，除非检查的策略建立了排除。不保证包含的工具一定会执行，并且预览中缺少的工具不一定会被禁用。预览可能会被缓存；保存的更改可能需要一段时间才能显示，并且活动运行可以使用不同的权限、凭据、发现或策略。验证运行中的执行情况；命令批准仍然适用。

JSON 保留线路名称 `live`、`checked: "live-session"` 和工具状态 `available`/`unavailable`. 这些描述了获取的会话预览。 `live.status: "verified"` 表示预览已成功检索，而不是执行已验证。 `excluded` 标识已检查的策略排除； `unavailable` 单独不成立。 CLI 将旧网关的显式 `deniedBySession` 标志转换为带有 `session` 原因的 `excluded`。

命令批准仍标记为 **local**，包括在会话检查期间。它们没有描述远程主机批准或每个会话 `/exec` 覆盖。对于这些主机策略使用 `openclaw approvals get --gateway` 或 `--node <id|name|ip>`，并在会话中使用 `/exec` 作为其当前默认值。

当向 `alsoAllow` 添加终端工具将解决检查的限制时，报告会建议确切的配置路径和工具名称。将它们附加到现有条目中；保留指挥部批准要求。当另一个策略仍然阻止访问时，请在启用工具之前查看报告的排除项。仅预览中缺少的工具不会提示 `alsoAllow` 配方。更改使用现有的配置命令或代理的工具面板和保存控件。检查更新的预览并验证运行中的执行情况。

### <a id="synchronize-local-command-approvals"></a> 同步本地命令批准

预设（`yolo`、`cautious`、`deny-all`）会同时应用 `host`、`security`、`ask` 和 `askFallback`。`set` 只应用你传入的标志；每个被接受的值都会经过校验（`--host auto|sandbox|gateway|node`、`--security deny|allowlist|full`、`--ask off|on-miss|always`、`--ask-fallback deny|allowlist|full`）。

这些命令保留其本地 config/policy 同步所有者。 `openclaw approvals` 的自动所有者路由不适用于 `exec-policy`。

`show`、`preset` 和 `set` 接受 `--json` 并将请求的、主机的和有效的命令批准事实作为一个 JSON 对象返回。 `preset` 和 `set` 不会更改刀具配置文件或刀具 allow/deny 规则。

范围：

- 同时更新本地配置文件和本地审批文档；不会将策略推送到网关或节点主机。
- `--host node` 会被拒绝：节点 exec 审批会在运行时从节点获取，因此本地 `exec-policy` 无法同步它们。请改用 `openclaw approvals set --node <id|name|ip>`。
- `exec-policy show` 会在运行时将 `host=node` 的作用域标记为由节点管理，而不是根据本地审批文档推导有效策略。

对于远程主机审批，请直接使用 `openclaw approvals set --gateway` 或 `openclaw approvals set --node <id|name|ip>`。

## <a id="notes"></a> 说明

- 节点主机必须声明 `system.execApprovals.get/set`（macOS 应用、无头节点主机或 Windows companion）。
- 生成的赠款成为目录绑定`2026.8.1`。升级后从`2026.7.1`或者更早，运行`openclaw doctor --fix`如果更新尚未执行此操作。 Doctor 仅删除不活跃的生成补助金；手动允许名单规则保持不变。重新运行受影响的工作流程以在预期目录中批准它们。
- 审批按主机存储在 `$OPENCLAW_STATE_DIR/state/openclaw.sqlite#exec_approvals_config`，或者在该变量未设置时存储在 `~/.openclaw/state/openclaw.sqlite#exec_approvals_config`。后缀标识该单例 SQLite 行。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [执行批准](/tools/exec-approvals)
