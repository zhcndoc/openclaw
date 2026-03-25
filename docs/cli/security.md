---
summary: "`openclaw security` 的 CLI 参考（审计并修复常见安全误区）"
read_when:
  - 您想快速审计配置/状态的安全性
  - 您想应用安全的“修复”建议（chmod，收紧默认设置）
title: "security"
---

# `openclaw security`

安全工具（审计 + 可选修复）。

相关内容：

- 安全指南：[Security](/gateway/security)

## 审计

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

当多个 DM 发送者共享主会话时，审计会发出警告，并建议为共享收件箱启用 **安全 DM 模式**：`session.dmScope="per-channel-peer"`（对于多账户频道则为 `per-account-channel-peer`）。
这用于协同/共享收件箱的加固。由互不信任/对抗性的操作员共享的单个 Gateway 并非推荐配置；应使用独立的 Gateway（或独立的 OS 用户/主机）来分割信任边界。
当配置暗示可能存在共享用户入口时（例如开放的 DM/群组策略、已配置的群组目标或通配符发送者规则），它还会触发 `security.trust_model.multi_user_heuristic`，并提醒您 OpenClaw 默认采用个人助手信任模型。
对于故意的共享用户设置，审计指南要求对所有会话进行沙箱隔离，将文件系统访问限制在工作空间范围内，并确保个人/私密身份或凭据不会出现在该运行时中。
当小型模型（`<=300B`）在未启用沙箱且启用了 Web/浏览器工具的情况下使用时，它也会发出警告。
对于 Webhook 入口，当 `hooks.token` 复用 Gateway 令牌、当 `hooks.defaultSessionKey` 未设置、当 `hooks.allowedAgentIds` 不受限制、当请求 `sessionKey` 覆盖被启用，以及当覆盖被启用但未设置 `hooks.allowedSessionKeyPrefixes` 时，它会发出警告。
当沙箱 Docker 设置已配置但沙箱模式处于关闭状态时，当 `gateway.nodes.denyCommands` 使用了无效的模式类/未知条目（仅匹配精确的节点命令名称，而非 Shell 文本过滤）时，当 `gateway.nodes.allowCommands` 显式启用危险的节点命令时，当全局 `tools.profile="minimal"` 被 Agent 工具配置文件覆盖时，当开放群组在未设置沙箱/工作空间防护的情况下暴露运行时/文件系统工具时，以及当已安装的扩展插件工具可能在宽松的工具策略下被访问到时，它也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，存在请求头欺骗风险）和 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录的元数据泄露）。
当沙箱浏览器使用 Docker `bridge` 网络但未设置 `sandbox.browser.cdpSourceRange` 时，它也会发出警告。
它还会标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*` 命名空间加入）。
当现有的沙箱浏览器 Docker 容器缺少/过时的哈希标签时（例如缺少 `openclaw.browserConfigEpoch` 的迁移前容器），它也会发出警告，并建议运行 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件/钩子安装记录未固定、缺少完整性元数据或与当前安装的软件包版本不一致时，它也会发出警告。
当频道允许列表依赖于可变的名称/电子邮件/标签而非稳定的 ID 时（适用于 Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 的作用域），它会发出警告。
当 `gateway.auth.mode="none"` 导致 Gateway HTTP API 可以在没有共享密钥的情况下被访问时（包括 `/tools/invoke` 以及任何已启用的 `/v1/*` 端点），它会发出警告。
以 `dangerous`/`dangerously` 为前缀的设置是显式的应急操作员覆盖；单独启用其中一个并不构成本身的安全漏洞报告。
有关完整的危险参数清单，请参阅 [Security](/gateway/security) 中的"Insecure or dangerous flags summary"部分。

SecretRef 行为：

- `security audit` 对其目标路径中的支持 SecretRef 进行只读解析。
- 如果当前命令路径中 SecretRef 不可用，审计将继续并报告 `secretDiagnostics`（而非崩溃）。
- `--token` 和 `--password` 仅覆盖该命令调用的深度探测认证；不会重写配置或 SecretRef 映射。

## JSON 输出

使用 `--json` 进行 CI/策略检查：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

若结合使用 `--fix` 和 `--json`，输出将包含修复操作和最终报告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 做了哪些更改

`--fix` 应用安全且确定性的修复：

- 将常见的 `groupPolicy="open"` 翻转为 `groupPolicy="allowlist"`（包括支持频道中的账户变体）
- 将 `logging.redactSensitive` 从 `"off"` 设置为 `"tools"`
- 收紧状态/配置及常见敏感文件（`credentials/*.json`、`auth-profiles.json`、`sessions.json`、会话 `*.jsonl`）的权限

`--fix` **不会**：

- 轮换令牌/密码/API 密钥
- 禁用工具（如 `gateway`、`cron`、`exec` 等）
- 更改 Gateway 的绑定/认证/网络暴露选项
- 移除或重写插件/技能
