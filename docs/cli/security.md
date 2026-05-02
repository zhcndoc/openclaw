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

普通的 `security audit` 会保持在冷配置/文件系统/只读路径上。默认情况下，它不会发现插件运行时安全收集器，因此常规审计不会加载每个已安装插件的运行时。使用 `--deep` 可包含尽力而为的实时 Gateway 探测以及插件拥有的安全审计收集器；明确的内部调用者在已经具有适当运行时作用域时，也可以选择启用这些插件拥有的收集器。

当多个 DM 发送者共享主会话时，审计会发出警告，并建议使用**安全 DM 模式**：对于共享收件箱，使用 `session.dmScope="per-channel-peer"`（多账号频道则使用 `per-account-channel-peer`）。
这是用于协作/共享收件箱加固的。单个由彼此不可信/对抗性操作员共同使用的 Gateway 不是推荐的设置；应通过独立 Gateway（或独立的操作系统用户/主机）划分信任边界。
当配置表明可能存在共享用户入口时（例如开放的 DM/群组策略、已配置的群组目标或通配符发送者规则），它还会输出 `security.trust_model.multi_user_heuristic`，并提醒你 OpenClaw 默认是个人助理信任模型。
对于有意的共享用户部署，审计建议是：隔离所有会话，使文件系统访问限定在工作区范围内，并将个人/私有身份或凭据排除在该运行时之外。
当使用小模型（`<=300B`）且未进行沙箱隔离并启用了网页/浏览器工具时，它也会发出警告。
对于 webhook 入口，当 `hooks.token` 复用了 Gateway token、`hooks.token` 过短、`hooks.path="/"`、`hooks.defaultSessionKey` 未设置、`hooks.allowedAgentIds` 不受限制、启用请求 `sessionKey` 覆盖、以及在未设置 `hooks.allowedSessionKeyPrefixes` 时启用覆盖，它都会发出警告。
当已配置沙箱 Docker 设置但沙箱模式关闭时、当 `gateway.nodes.denyCommands` 使用了无效的类似模式/未知条目（仅支持精确的节点命令名匹配，不支持 shell 文本过滤）、当 `gateway.nodes.allowCommands` 明确启用了危险的节点命令、当全局 `tools.profile="minimal"` 被代理工具配置文件覆盖、当开放群组在没有沙箱/工作区保护的情况下暴露运行时/文件系统工具、以及当已安装的插件工具在宽松工具策略下可能可达时，它也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，会有头部欺骗风险）以及 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录导致元数据泄露）。
当沙箱浏览器使用 Docker `bridge` 网络但未设置 `sandbox.browser.cdpSourceRange` 时，它也会发出警告。
它还会标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*` 命名空间加入）。
当现有沙箱浏览器 Docker 容器缺少/过期的哈希标签时（例如迁移前的容器缺少 `openclaw.browserConfigEpoch`），它也会发出警告，并建议运行 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件/钩子安装记录未固定、缺少完整性元数据，或与当前已安装包版本发生漂移时，它也会发出警告。
当频道允许名单依赖可变的名称/邮箱/标签而不是稳定 ID 时，它会发出警告（Discord、Slack、Google Chat、Microsoft Teams、Mattermost，以及适用范围内的 IRC 作用域）。
当 `gateway.auth.mode="none"` 使 Gateway HTTP API 在没有共享密钥的情况下仍可访问时，它会发出警告（`/tools/invoke` 以及任何已启用的 `/v1/*` 端点）。
以前缀 `dangerous`/`dangerously` 开头的设置属于明确的紧急开关式操作员覆盖；仅启用其中一项，本身并不构成安全漏洞报告。
关于完整的危险参数清单，请参阅 [Security](/gateway/security) 中的“ Insecure or dangerous flags summary ”部分。

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

- [CLI reference](/cli)
- [Security audit](/gateway/security)
