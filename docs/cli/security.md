---
summary: "openclaw security 的 CLI 参考（审计并修复常见安全隐患）"
read_when:
  - 你想对配置/状态进行快速安全审计
  - 你想应用安全的“修复”建议（权限、收紧默认值）
title: "安全"
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

## 审计模式

普通的 `security audit` 保持在冷配置/文件系统/只读路径上：它不会发现插件运行时安全收集器，因此例行审计不会加载每个已安装的插件运行时。`--deep` 会添加尽力而为的实时 Gateway 探测以及由插件拥有的安全审计收集器（显式内部调用者在已经具有合适的运行时范围时也可以选择启用这些收集器）。

如果 Gateway 密码认证仅在启动时提供，请使用 `--auth password --password <password>` 传入相同的值，这样审计就可以将其与 `hooks.token` 进行检查。

## 它检查什么

**DM/信任模型**

- 当多个 DM 发送者共享主会话时发出警告，并建议使用安全 DM 模式：`session.dmScope="per-channel-peer"`（对于多账户频道则使用 `per-account-channel-peer`），用于共享收件箱。这是协作/共享收件箱加固，不是用于相互不信任操作员的隔离；对此应使用独立网关（或独立的操作系统用户/主机）来分离信任边界。
- 当配置暗示可能存在共享用户入口时（例如开放 DM/群组策略、已配置的群组目标或通配发送者规则），会发出 `security.trust_model.multi_user_heuristic` 警告——OpenClaw 的默认信任模型是个人助理（单一操作员），而不是敌对的多租户隔离。对于有意的共享用户部署：将所有会话置于沙箱中，将文件系统访问限制在工作区范围内，并让个人/私密身份或凭据远离该运行时。
- 当使用小模型（参数 `<=300B`）且未进行沙箱隔离并启用 Web/浏览器工具时发出警告。

**Webhook/hooks**

启动时会记录一条非致命的安全警告，并且审计会标记 `hooks.token` 复用了当前活跃的 Gateway 共享密钥认证值（`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN`，`gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`）。同时还会在以下情况下发出警告：

- `hooks.token` 很短
- `hooks.path="/"` 
- `hooks.defaultSessionKey` 未设置
- `hooks.allowedAgentIds` 不受限制
- 启用了请求 `sessionKey` 覆盖
- 覆盖已启用但未配置 `hooks.allowedSessionKeyPrefixes`

运行 `openclaw doctor --fix` 以轮换已持久化且被复用的 `hooks.token`，然后更新外部 hook 发送方以使用新令牌。

**沙箱/工具**

- 当配置了沙箱 Docker 设置但沙箱模式关闭时发出警告。
- 当 `gateway.nodes.commands.deny` 使用了无效的类模式/未知条目时发出警告（匹配仅限于精确的 node 命令名，而不是 shell 文本过滤）。
- 当 `gateway.nodes.commands.allow` 明确启用危险的 node 命令时发出警告。
- 当全局 `tools.profile="minimal"` 被代理工具配置覆盖时发出警告。
- 当写入/编辑工具被禁用，但在没有约束性的沙箱文件系统边界时 `exec` 仍可用时发出警告。
- 当开放 DM 或群组在没有沙箱/工作区保护的情况下暴露运行时/文件系统工具时发出警告。
- 当已安装的插件工具可能在宽松的工具策略下可达时发出警告。

**沙箱浏览器**

- 当沙箱浏览器使用 Docker `bridge` 网络但没有 `sandbox.browser.cdpSourceRange` 时发出警告。
- 标记危险的沙箱 Docker 网络模式，包括 `host` 和 `container:*` 命名空间加入。
- 当现有的沙箱浏览器 Docker 容器缺少或具有过期的哈希标签时发出警告（例如迁移前的容器缺少 `openclaw.browserConfigEpoch`），并建议运行 `openclaw sandbox recreate --browser --all`。

**网络/发现**

- 标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，存在请求头伪造风险）。
- 标记 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录泄露元数据）。
- 当 `gateway.auth.mode="none"` 使 Gateway HTTP API 在没有共享密钥的情况下仍可访问时发出警告（`/tools/invoke` 以及任何已启用的 `/v1/*` 端点）。

**插件/频道**

- 当基于 npm 的插件/hook 安装记录未固定、缺少完整性元数据，或与当前已安装的软件包版本存在漂移时发出警告。
- 当频道允许列表依赖可变的名称/电子邮件/标签而不是稳定 ID 时发出警告（Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 范围在适用时）。

以 `dangerous`/`dangerously` 为前缀的设置是明确的“破窗”式操作员覆盖；仅启用其中一项本身并不构成安全漏洞报告。关于完整的危险参数清单，请参见 [Security](/gateway/security) 中的“Insecure or dangerous flags summary”。

## SecretRef 行为

`security audit` 会在其目标路径中以只读模式解析受支持的 SecretRef。如果在当前命令路径中某个 SecretRef 不可用，审计会继续进行，并报告 `secretDiagnostics`，而不是崩溃。`--token` 和 `--password` 仅会覆盖该次命令调用的 deep-probe 认证；它们不会重写配置或 SecretRef 映射。

## Suppressions

Use `security.audit.suppressions` to accept findings you intend to keep. Each suppression matches a precise `checkId`, and can be further narrowed with case-insensitive `titleIncludes` and/or `detailIncludes` substrings:

```json
{
  "security": {
    "audit": {
      "suppressions": [
        {
          "checkId": "plugins.tools_reachable_permissive_policy",
          "detailIncludes": "Enabled extension plugin: gbrain",
          "reason": "Trusted local operator plugin"
        }
      ]
    }
  }
}
```

Suppressed findings are removed from the active `summary` and `findings` lists. JSON output keeps them under `suppressedFindings` for auditing. When suppressions are configured, the active output also retains an unsuppressible informational finding `security.audit.suppressions.active` so readers know the audit was filtered. Dangerous configuration flags are emitted per finding, so accepting one dangerous flag will not hide other enabled flags that share the same `config.insecure_or_dangerous_flags` `checkId`.

Because suppressions can hide long-lived risks, adding or removing them via shell commands run through the agent requires exec approval, unless exec is already running in a trusted local automation scenario with `security="full"` and `ask="off"`.

## JSON 输出

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

使用 `--fix --json` 时，输出同时包含修复操作和最终报告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 会更改什么

应用安全、确定性的修复：

- 将常见的 `groupPolicy="open"` 改为 `groupPolicy="allowlist"`（包括受支持渠道中的账户变体）
- 当 WhatsApp 组策略切换为 `allowlist` 时，如果该列表存在且配置尚未定义 `allowFrom`，则从已存储的 `allowFrom` 文件中为 `groupAllowFrom` 设定初始值
- 收紧 state/config 以及常见敏感文件（`credentials/*.json`、`auth-profiles.json`、`openclaw-agent.sqlite` 和旧版会话工件）的权限
- 也会收紧 `openclaw.json` 中引用的 config include 文件的权限
- 在 POSIX 主机上使用 `chmod`，在 Windows 上使用 `icacls` 重置

`--fix` **不会**：

- 轮换 token/password/API keys
- 禁用工具（`gateway`、`cron`、`exec` 等）
- 更改 gateway 的绑定/认证/网络暴露选项
- 删除或重写插件/技能

## 相关

- [CLI 参考](/cli)
- [安全审计](/gateway/security)
