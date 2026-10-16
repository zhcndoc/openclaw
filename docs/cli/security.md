---
summary: "`openclaw security` 的 CLI 参考（审核和修复常见安全枪）"
read_when:
  - "您想要对 config/state 运行快速安全审核"
  - "你想应用安全的“修复”建议（权限、收紧默认值）"
title: "安全 CLI"
---

# `openclaw security`

安全工具：审计以及可选的安全修复。相关：[安全](/gateway/security)。

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --auth password --password <password>
openclaw security audit --fix
openclaw security audit --json
```

## <a id="audit-modes"></a> 审计模式

普通 `security audit` 保留在冷 config/filesystem/read-only 路径上：它不会发现插件运行时安全收集器，因此例行审核不会加载每个已安装的插件运行时。 `--deep` 添加了尽力而为的实时网关检查和插件拥有的安全审核收集器（显式内部调用者在已经具有适当的运行时范围时也可以选择加入这些收集器）。

如果 Gateway 密码认证仅在启动时提供，请使用 `--auth password --password <password>` 传入相同的值，这样审计就可以将其与 `hooks.token` 进行检查。

## <a id="what-it-checks"></a> 它检查什么

### <a id="dm%2Ftrust-model"></a><a id="dm/trust-model"></a> DM/trust 模型

- 当多个 DM 发件人共享主会话时发出警告，并建议对共享收件箱使用安全 DM 模式：`session.dmScope="per-channel-peer"`（或用于多帐户通道的 `per-account-channel-peer`）。这是cooperative/shared-inbox强化，而不是对相互不信任的操作员进行隔离；为此，使用单独的网关（或单独的 OS users/hosts）分割信任边界。
- 当全局 `session.groupScope="main"` 或绑定覆盖将 group/channel 房间合并到主会话中时，E 会释放 `security.trust_model.group_scope_main`。每个匹配房间的每个成员都共享该上下文，因此将其保留给受信任的房间（请参阅 [Groups](/channels/groups#session-keys)）。
- 当配置建议可能的共享用户入口（例如开放 DM/group 策略、配置的组目标或通配符发件人规则）时，E 会释放 `security.trust_model.multi_user_heuristic` — OpenClaw 的默认信任模型是个人助理（一名操作员），而不是敌对的多租户隔离。对于有意的共享用户设置：对所有会话进行沙箱处理，使文件系统访问保持在工作区范围内，并使 personal/private 身份或凭据远离该运行时。
- Emits `security.trust_model.cross_agent_session_access_default` 用于跨代理会话范围，无配置缩小。
  - 条件：两个或多个代理将 `tools.sessions.visibility` 解析为 `all`，并启用代理到代理访问，并使用省略或空的 `tools.agentToAgent.allow` 列表，前提是至少一个代理在未钳制的上下文中保留会话工具（未沙盒会话或 `agents.defaults.sandbox.sessionToolsVisibility: "all"`）。如果每个代理都被限制或没有会话工具，则不会发出任何发现。
  - Severity：`info`，用于普通多代理设置，当代理处于沙盒中、具有代理级别工具限制或共享用户入口信号表明不同的信任级别时，升级到 `warn`。
  - Fix：详细列出每个代理的范围和允许的会话工具。缩小 [ 会话可见性或座席到座席访问 ](/gateway/config-tools#tools-agenttoagent) 用于角色分离。
- 在没有沙箱且启用了 web/browser 工具的情况下使用小模型（`<=300B` 参数）时发出警告。

### Webhook/hooks

启动时会记录一条非致命的安全警告，并且审计会标记 `hooks.token` 复用了当前活跃的 Gateway 共享密钥认证值（`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN`，`gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`）。同时还会在以下情况下发出警告：

- `hooks.token` 很短
- `hooks.path="/"`
- `hooks.defaultSessionKey` 未设置
- `hooks.allowedAgentIds` 不受限制
- 启用了请求 `sessionKey` 覆盖
- 覆盖已启用但未配置 `hooks.allowedSessionKeyPrefixes`

运行 `openclaw doctor --fix` 以轮换已持久化且被复用的 `hooks.token`，然后更新外部 hook 发送方以使用新令牌。

### Sandbox/tools

- 当配置了沙箱 Docker 设置但沙箱模式关闭时发出警告。
- 当 `gateway.nodes.commands.deny` 使用无效的模式 like/unknown 条目时发出警告（仅匹配精确的节点命令名称，而不是 shell 文本过滤）。
- 当 `gateway.nodes.commands.allow` 明确启用危险的 node 命令时发出警告。
- 当全局 `tools.profile="minimal"` 被代理工具配置覆盖时发出警告。
- 当 write/edit 工具被禁用但 `exec` 在没有约束沙箱文件系统边界的情况下仍然可用时发出警告。
- 当公开的 DM 或群组在没有 sandbox/workspace 防护的情况下暴露 runtime/filesystem 工具时发出警告。
- 当已安装的插件工具可能在宽松的工具策略下可达时发出警告。

### <a id="sandbox-browser"></a> 沙盒浏览器

- 当沙箱浏览器使用 Docker `bridge` 网络但没有 `sandbox.browser.cdpSourceRange` 时发出警告。
- 标记危险的沙箱 Docker 网络模式，包括 `host` 和 `container:*` 命名空间加入。
- 当现有沙箱浏览器 Docker 容器具有 missing/stale 哈希标签（例如预迁移容器缺少 `openclaw.browserConfigEpoch`）时发出警告并建议使用 `openclaw sandbox recreate --browser --all`。

### Network/discovery

- 标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，存在请求头伪造风险）。
- 标记 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录泄露元数据）。
- 当 `gateway.auth.mode="none"` 使网关 HTTP API 在没有共享密钥的情况下可访问时发出警告（`/tools/invoke` 加上任何已启用的 `/v1/*` 端点）。

### Plugins/channels

- 当基于 npm- 的 plugin/hook 安装记录取消固定、丢失完整性元数据或偏离当前安装的软件包版本时发出警告。
- 当通道白名单依赖可变 names/emails/tags 而不是稳定 ID 时发出警告（Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 范围（如果适用））。

源扫描会跳过超出其每个文件字节限制的文件，包括在读取时增长的文件。如果文件在读取过程中发生更改，审核会报告扫描失败；编辑完成后重新运行。

### <a id="dangerous-flags"></a> 危险标志

以 `dangerous`/`dangerously` 为前缀的设置是显式的打破玻璃操作符覆盖。启用它本身并不是一份安全漏洞报告。审计将其报告为 `config.insecure_or_dangerous_flags` checkId。有关完整的危险参数清单，请参阅 [Security](/gateway/security) 中的“不安全或危险标志摘要”。

## <a id="secretref-behavior"></a> SecretRef 行为

`security audit` 以只读模式解析受支持的 SecretRefs 的目标路径。如果 SecretRef 在当前命令路径中不可用，审核将继续并报告 `secretDiagnostics` 而不是崩溃。 `--token` 和 `--password` 仅覆盖该命令调用的深度检查身份验证；它们不会重写配置或 SecretRef 映射。

## <a id="suppressions"></a> 抑制

使用 `security.audit.suppressions` 接受故意的站立调查结果。每个抑制都与精确的 `checkId` 匹配，并且可以使用不区分大小写的 `titleIncludes` and/or `detailIncludes` 子字符串来缩小范围：

```json
{
  "security": {
    "audit": {
      "suppressions": [
        {
          "checkId": "plugins.tools_reachable_permissive_policy",
          "detailIncludes": "Enabled extension plugins: gbrain",
          "reason": "trusted local operator plugin"
        }
      ]
    }
  }
}
```

抑制的结果将从活动的 `summary` 和 `findings` 列表中删除。 JSON 输出将它们保留在 `suppressedFindings` 之下以进行可审计。配置抑制后，活动输出还会保留不可抑制的 `security.audit.suppressions.active` 信息发现，以便读者可以知道审计已被过滤。每个发现都会发出一个危险配置标志，因此接受一个危险标志不会隐藏共享相同 `config.insecure_or_dangerous_flags` checkId 的其他已启用标志。

更改抑制的代理运行 shell 命令遵循普通的 exec 批准策略。命令文本检查不是配置写入保护边界。

## <a id="json-output"></a> JSON 输出

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

使用 `--fix --json` 时，输出同时包含修复操作和最终报告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

如果修复意外失败，该命令会在运行审核之前以状态 1 退出。对于 `--json`，它会发出标准 [CLI JSON 故障包络线 ](/cli#json-failures)。单独运行`openclaw security audit`来检查当前状态。

## <a id="what---fix-changes"></a><a id="what-fix-changes"></a> `--fix` 会更改什么

适用安全、固定的维修：

- 将常见的 `groupPolicy="open"` 改为 `groupPolicy="allowlist"`（包括受支持渠道中的账户变体）
- 当 WhatsApp 组策略翻转到 `allowlist` 时，当该列表存在且配置尚未定义 `allowFrom` 时，从存储的 `allowFrom` 文件中种子 `groupAllowFrom`
- 加强对 state/config 和常见敏感文件（`credentials/*.json`、旧版 `auth-profiles.json`、`openclaw-agent.sqlite` 和旧版会话工件）的权限
- 也会收紧 `openclaw.json` 中引用的 config include 文件的权限
- 在 POSIX 主机上使用 `chmod`，在 Windows 上使用 `icacls` 重置

`--fix` **不会**：

- 旋转tokens/passwords/API按键
- 禁用工具（`gateway`、`cron`、`exec` 等）
- 变更网关 bind/auth/network 曝光选择
- 删除或重写plugins/skills

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [安全审计](/gateway/security)
