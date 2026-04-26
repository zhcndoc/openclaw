---
summary: "`openclaw security` 的 CLI 参考（审计并修复常见安全误区）"
read_when:
  - 你想对配置/状态进行快速安全审计
  - 你想应用安全的“修复”建议（权限、加固默认值）
title: "Security"
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

如果多个 DM 发送者共享主会话，审计会发出警告，并建议共享收件箱使用 **安全 DM 模式**：`session.dmScope="per-channel-peer"`（多账户频道则使用 `per-account-channel-peer`）。
这适用于协作/共享收件箱的加固。对于由彼此不信任/对抗性操作员共享的单个 Gateway，不建议这样部署；应通过分离的 gateway（或分离的操作系统用户/主机）来划分信任边界。
当配置显示可能存在共享用户入口时，系统还会发出 `security.trust_model.multi_user_heuristic`，例如开放的 DM/群组策略、已配置的群组目标，或通配符发送者规则，并提醒你 OpenClaw 默认采用的是个人助理信任模型。
对于有意的共享用户部署，审计建议将所有会话置于沙箱中，保持文件系统访问仅限工作区范围，并且不要在该运行时中保留个人/私有身份或凭据。
当使用小模型（`<=300B`）且未进行沙箱化并启用了 web/browser 工具时，也会发出警告。
对于 webhook 入口，当 `hooks.token` 复用了 Gateway token、`hooks.token` 过短、`hooks.path="/"`、未设置 `hooks.defaultSessionKey`、`hooks.allowedAgentIds` 不受限制、启用了请求 `sessionKey` 覆盖、以及在未设置 `hooks.allowedSessionKeyPrefixes` 时启用了覆盖，都会发出警告。
当已配置沙箱 Docker 设置但沙箱模式关闭时、当 `gateway.nodes.denyCommands` 使用无效的模式样式/未知条目时（仅支持精确的节点命令名匹配，不支持 shell 文本过滤）、当 `gateway.nodes.allowCommands` 明确启用危险的节点命令时、当全局 `tools.profile="minimal"` 被 agent 工具配置覆盖时、当开放群组在缺少沙箱/工作区保护的情况下暴露运行时/文件系统工具时，以及当已安装的插件工具可能在宽松工具策略下可达时，也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，存在头部欺骗风险）以及 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录泄露元数据）。
当沙箱浏览器在未设置 `sandbox.browser.cdpSourceRange` 的情况下使用 Docker `bridge` 网络时，也会发出警告。
它还会标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*` 命名空间加入）。
当现有的沙箱浏览器 Docker 容器缺少/过期的哈希标签时（例如迁移前的容器缺少 `openclaw.browserConfigEpoch`），也会发出警告，并建议运行 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件/钩子安装记录未固定版本、缺少完整性元数据，或与当前已安装的软件包版本出现漂移时，也会发出警告。
当频道允许列表依赖可变的名称/邮箱/标签，而不是稳定 ID 时（适用于 Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 范围，如适用），也会发出警告。
当 `gateway.auth.mode="none"` 使 Gateway HTTP API 在没有共享密钥的情况下仍可访问时（`/tools/invoke` 以及任何已启用的 `/v1/*` 端点），也会发出警告。
以 `dangerous`/`dangerously` 为前缀的设置属于显式的“破窗”操作员覆盖；仅启用其中一项，本身并不构成安全漏洞报告。
完整的危险参数清单请参见 [Security](/gateway/security) 中的 “Insecure or dangerous flags summary” 部分。

SecretRef 行为：

- `security audit` 会对其目标路径中的支持 SecretRef 进行只读解析。
- 如果当前命令路径中 SecretRef 不可用，审计将继续并报告 `secretDiagnostics`（而不是崩溃）。
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

- 将常见的 `groupPolicy="open"` 改为 `groupPolicy="allowlist"`（包括支持的频道中的账户变体）
- 当 WhatsApp 群组策略切换为 `allowlist` 时，如果该列表存在且配置尚未定义 `allowFrom`，则从已存储的 `allowFrom` 文件中填充 `groupAllowFrom`
- 将 `logging.redactSensitive` 从 `"off"` 调整为 `"tools"`
- 收紧状态/配置以及常见敏感文件的权限
  (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, 会话
  `*.jsonl`)
- 还会收紧 `openclaw.json` 中引用的配置 include 文件权限
- 在 POSIX 主机上使用 `chmod`，在 Windows 上使用 `icacls` 重置

`--fix` **不会**：

- 轮换 tokens/passwords/API keys
- 禁用工具（`gateway`、`cron`、`exec` 等）
- 更改 gateway 的绑定/认证/网络暴露选项
- 删除或重写 plugins/skills

## 相关内容

- [CLI reference](/cli)
- [Security audit](/gateway/security)
