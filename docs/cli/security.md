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

当多个 DM 发送者共享主会话时，审计会发出警告，并推荐启用 **安全 DM 模式**：`session.dmScope="per-channel-peer"` （或针对多账户频道使用 `per-account-channel-peer`）以实现共享收件箱的安全加固。  
这适用于合作/共享收件箱的强化。由相互不信任或敌对操作者共享的单一 Gateway 并非推荐设置；请采用分割信任边界的方案，如使用多个 Gateway（或不同的操作系统用户/主机）。  
当配置提示可能存在共享用户入口（例如开放的 DM/群组策略、配置的群组目标，或通配符发送者规则）时，审计还会发出 `security.trust_model.multi_user_heuristic` 警告，提醒您默认情况下 OpenClaw 是个人助理信任模型。  
对于有意的共享用户环境，审计建议将所有会话沙盒化，使文件系统访问仅限于工作区，并避免在该运行时运行个人/私密身份或凭据。  
当使用小模型（`<=300B`）且未进行沙盒隔离并启用网页/浏览器工具时，也会发出警告。  
对于 webhook 入口，若未设置 `hooks.defaultSessionKey`、启用请求的 `sessionKey` 覆盖，或启用覆盖但未设置 `hooks.allowedSessionKeyPrefixes`，都会发出警告。  
当配置了沙盒 Docker 设置但沙盒模式关闭时，或当 `gateway.nodes.denyCommands` 使用无效的类模式/未知条目（仅支持精确节点命令名匹配，不支持 shell 文本过滤）、`gateway.nodes.allowCommands` 明确启用危险节点命令、全局 `tools.profile="minimal"` 被代理工具配置覆盖、开放群组暴露运行时/文件系统工具且无沙盒/工作区保护、安装的扩展插件工具在宽松工具策略下可访问时，都会发出警告。  
此外，还会标记 `gateway.allowRealIpFallback=true`（若代理配置错误存在头部伪造风险）及 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录存在元数据泄漏风险）。  
当沙盒浏览器使用 Docker `bridge` 网络且未设置 `sandbox.browser.cdpSourceRange` 时，会发出警告。  
也会标记危险的沙盒 Docker 网络模式（包括 `host` 和 `container:*` 命名空间连接）。  
当现有沙盒浏览器 Docker 容器缺少或存在陈旧的哈希标签（例如迁移前的容器缺少 `openclaw.browserConfigEpoch`）时，建议运行 `openclaw sandbox recreate --browser --all`。  
当基于 npm 的插件/钩子安装记录未固定版本、缺少完整性元数据，或与当前安装包版本不一致时，也会发出警告。  
当频道允许列表依赖可变的名称/电子邮件/标签而非稳定 ID（适用于 Discord、Slack、Google Chat、MS Teams、Mattermost、IRC 作用域）时，会发出警告。  
当 `gateway.auth.mode="none"` 导致 Gateway HTTP API 在无共享密钥情况下可访问（包括 `/tools/invoke` 及任意启用的 `/v1/*` 端点）时，会发出警告。  
以 `dangerous`/`dangerously` 为前缀的设置是明确的越权操作员覆盖选项；单独启用其中之一不代表安全漏洞报告。  
完整的危险参数清单请参见 [Security](/gateway/security) 中的“不安全或危险标志总结”部分。

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
