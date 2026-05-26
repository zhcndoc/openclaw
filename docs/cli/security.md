---
summary: "openclaw security 的 CLI 参考（审计并修复常见安全隐患）"
read_when:
  - 你想对配置/状态进行快速安全审计
  - 你想应用安全的“修复”建议（权限、收紧默认值）
title: "安全"
---

# `openclaw security`

安全工具（审计 + 可选修复）。

相关：

- 安全指南：[安全](/gateway/security)

## 审计

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

普通的 `security audit` 会保持在冷配置/文件系统/只读路径上。默认情况下，它不会发现插件运行时安全收集器，因此常规审计不会加载每个已安装插件的运行时。使用 `--deep` 可包含尽力而为的实时 Gateway 探测以及插件拥有的安全审计收集器；明确的内部调用者在已经具有适当运行时作用域时，也可以选择启用这些插件拥有的收集器。

当多个 DM 发送者共享主会话时，审计会发出警告，并建议使用 **安全 DM 模式**：对于共享收件箱，设置 `session.dmScope="per-channel-peer"`（或在多账号频道中设置 `per-account-channel-peer`）。
这是为了加固协作/共享收件箱。单个由彼此不信任/对抗性操作员共享的 Gateway 不是推荐的设置；应通过单独的 gateway（或单独的 OS 用户/主机）来分隔信任边界。
当配置暗示可能存在共享用户入口时，它还会发出 `security.trust_model.multi_user_heuristic` 提示（例如开放的 DM/群组策略、已配置的群组目标，或通配符发送者规则），并提醒你 OpenClaw 默认是个人助手信任模型。
对于有意的共享用户设置，审计建议将所有会话置于沙箱中，保持文件系统访问以工作区为作用域，并且不要在该运行时中保留个人/私密身份或凭据。
当使用小模型（`<=300B`）且未进行沙箱隔离并启用网页/浏览器工具时，它也会发出警告。
对于 webhook 入口，当出现以下情况时会发出警告：

- `hooks.token` 复用了一个正在使用中的 Gateway 共享密钥认证值（`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`）
- `hooks.token` 过短
- `hooks.path="/"` 
- `hooks.defaultSessionKey` 未设置
- `hooks.allowedAgentIds` 不受限制
- 允许请求中的 `sessionKey` 覆盖
- 覆盖功能已启用，但未设置 `hooks.allowedSessionKeyPrefixes`

如果 Gateway 密码认证只在启动时提供，请将同样的值传给 `openclaw security audit --auth password --password <password>`，这样审计就可以将其与 `hooks.token` 进行检查。
密码模式复用对兼容性而言属于审计发现；应轮换其中一个密钥，而不是指望 Gateway 启动时拒绝该配置。

当已配置沙箱 Docker 设置但沙箱模式关闭时，当 `gateway.nodes.denyCommands` 使用了无效的模式样式/未知条目时（仅支持精确的节点命令名匹配，不支持 shell 文本过滤），当 `gateway.nodes.allowCommands` 明确启用了危险的节点命令时，当全局 `tools.profile="minimal"` 被代理工具配置覆盖时，当写入/编辑工具被禁用但 `exec` 仍可用且没有约束性的沙箱文件系统边界时，当开放组在缺少沙箱/工作区保护的情况下暴露运行时/文件系统工具时，以及当已安装的插件工具在宽松工具策略下可能可达时，它也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置不当，存在头部伪造风险）以及 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录泄露元数据）。
当沙箱浏览器使用 Docker `bridge` 网络且未设置 `sandbox.browser.cdpSourceRange` 时，它也会发出警告。
它还会标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*` 命名空间加入）。
当现有沙箱浏览器 Docker 容器缺少或已过期的哈希标签时（例如迁移前的容器缺少 `openclaw.browserConfigEpoch`）它也会发出警告，并建议运行 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件/钩子安装记录未固定、缺少完整性元数据，或与当前已安装的包版本发生漂移时，它也会发出警告。
当频道白名单依赖可变的名称/电子邮件/标签而不是稳定的 ID 时，它会发出警告（Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 范围，如适用）。
当 `gateway.auth.mode="none"` 使 Gateway HTTP API 在没有共享密钥的情况下仍可访问时（`/tools/invoke` 以及任何启用的 `/v1/*` 端点），它会发出警告。
以前缀 `dangerous`/`dangerously` 开头的设置属于明确的“破窗”操作员覆盖；仅启用其中之一本身并不构成安全漏洞报告。
关于完整的危险参数清单，请参见 [Security](/gateway/security) 中的 “Insecure or dangerous flags summary” 部分。

有意保留的现有发现可以通过 `security.audit.suppressions` 接受。
每个 suppression 都会匹配一个精确的 `checkId`，并可通过
`titleIncludes` 和/或 `detailIncludes` 的不区分大小写子字符串进行缩小：

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

被抑制的发现会从活动的 `summary` 和 `findings` 列表中移除。
JSON 输出会将它们保留在 `suppressedFindings` 中，以便审计。
当配置了 suppressions 时，活动输出还会保留一个不可抑制的
`security.audit.suppressions.active` 信息类发现，以便读者知道审计
结果经过了过滤。危险配置标志会按“每个发现一个标志”方式输出，因此
接受一个危险标志不会隐藏共享同一个
`config.insecure_or_dangerous_flags` checkId 的其他已启用标志。
由于 suppressions 可能隐藏长期存在的风险，通过
agent 运行的 shell 命令添加或移除它们需要 exec 批准，除非 exec 已经在
`security="full"` 且 `ask="off"` 的可信本地自动化环境中运行。

SecretRef 行为：

- `security audit` 会针对其目标路径，以只读模式解析受支持的 SecretRef。
- 如果在当前命令路径中某个 SecretRef 不可用，审计会继续并报告 `secretDiagnostics`（而不是崩溃）。
- `--token` 和 `--password` 只会覆盖该命令调用的深度探测认证；它们不会重写配置或 SecretRef 映射。

## JSON 输出

在 CI/策略检查中使用 `--json`：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

如果同时使用 `--fix` 和 `--json`，输出会同时包含修复操作和最终报告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 会更改什么

`--fix` 会应用安全、确定性的修复措施：

- 将常见的 `groupPolicy="open"` 切换为 `groupPolicy="allowlist"`（包括受支持频道中的账号变体）
- 当 WhatsApp 群组策略切换为 `allowlist` 时，如果该列表存在且配置尚未定义 `allowFrom`，则会从已存储的 `allowFrom` 文件中填充 `groupAllowFrom`
- 将 `logging.redactSensitive` 从 `"off"` 设置为 `"tools"`
- 收紧状态/配置及常见敏感文件的权限
  (`credentials/*.json`、`auth-profiles.json`、`sessions.json`、会话
  `*.jsonl`)
- 同时收紧从 `openclaw.json` 引用的配置 include 文件
- 在 POSIX 主机上使用 `chmod`，在 Windows 上使用 `icacls` 重置

`--fix` **不会**：

- 轮换 token/password/API keys
- 禁用工具（`gateway`、`cron`、`exec` 等）
- 更改 gateway 的绑定/认证/网络暴露选项
- 删除或重写插件/技能

## 相关

- [CLI 参考](/cli)
- [安全审计](/gateway/security)
