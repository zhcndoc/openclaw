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

当多个 DM 发送者与主会话共享同一会话时，审计会发出警告，并在共享收件箱场景中建议使用**安全 DM 模式**：`session.dmScope="per-channel-peer"`（多账号频道则使用 `per-account-channel-peer`）。
这适用于协作/共享收件箱加固。对于由彼此不信任/对抗性操作员共同使用的单个 Gateway，不推荐这种部署方式；应通过单独的 gateway（或单独的 OS 用户/主机）来划分信任边界。
当配置暗示可能存在共享用户入口时（例如开放 DM/群组策略、已配置的群组目标，或通配符发送者规则），它还会发出 `security.trust_model.multi_user_heuristic`，并提醒你 OpenClaw 默认采用的是个人助理信任模型。
对于有意的共享用户部署，审计建议是对所有会话进行沙箱化，将文件系统访问限制在 workspace 范围内，并且不要在该运行时中放置个人/私有身份或凭据。
当使用小模型（`<=300B`）且未进行沙箱化并启用 Web/浏览器工具时，它也会发出警告。
对于 webhook 入口，当 `hooks.token` 复用了 Gateway token、`hooks.token` 过短、`hooks.path="/"`、`hooks.defaultSessionKey` 未设置、`hooks.allowedAgentIds` 未受限制、启用了请求 `sessionKey` 覆盖、以及在未设置 `hooks.allowedSessionKeyPrefixes` 的情况下启用覆盖时，它都会发出警告。
当配置了沙箱 Docker 设置但沙箱模式关闭时，当 `gateway.nodes.denyCommands` 使用了无效的类模式/未知条目（仅支持精确的节点命令名匹配，不支持 shell 文本过滤）时，当 `gateway.nodes.allowCommands` 明确启用了危险的节点命令时，当全局 `tools.profile="minimal"` 被 agent 工具配置文件覆盖时，当开放群组在没有沙箱/workspace 保护的情况下暴露运行时/文件系统工具时，以及当已安装的插件工具在宽松工具策略下可能可达时，它也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，存在头部欺骗风险）以及 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录造成元数据泄露）。
当沙箱浏览器使用 Docker `bridge` 网络且没有 `sandbox.browser.cdpSourceRange` 时，它也会发出警告。
它还会标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*` 命名空间加入）。
当现有的沙箱浏览器 Docker 容器缺少或过期的 hash 标签（例如迁移前的容器缺少 `openclaw.browserConfigEpoch`）时，它也会发出警告，并建议执行 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件/钩子安装记录未固定版本、缺少完整性元数据，或与当前已安装的软件包版本存在漂移时，它也会发出警告。
当频道白名单依赖可变的名称/邮箱/标签而不是稳定 ID（适用于 Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 范围，视情况而定）时，它会发出警告。
当 `gateway.auth.mode="none"` 使 Gateway HTTP API 在没有共享密钥的情况下仍可访问时（`/tools/invoke` 加上任何已启用的 `/v1/*` 端点），它会发出警告。
以前缀 `dangerous`/`dangerously` 开头的设置属于明确的紧急开关式运维覆盖；启用其中一项本身并不构成安全漏洞报告。
有关完整的危险参数清单，请参见 [Security](/gateway/security) 中的“Insecure or dangerous flags summary”部分。

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
