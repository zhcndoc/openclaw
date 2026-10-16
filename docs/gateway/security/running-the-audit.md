---
summary: "`openclaw security audit` 检查的内容以及修复其发现的命令"
read_when:
  - "您更改了配置并想知道是否偏离了安全默认值"
  - "您即将公开网络表面"
  - "您有审核结果并需要分类令"
title: "运行安全审核"
sidebarTitle: "运行审核"
---

## `openclaw security audit`

在任何配置更改后或在暴露网络入口之前运行此命令：

```bash
openclaw security audit
openclaw security audit --deep    # attempts a live Gateway check
openclaw security audit --fix     # apply safe remediations
openclaw security audit --json
```

`--fix`故意缩小范围：它将开放的团体政策翻转为允许名单，收紧state/config/include-file权限（`600`文件，`700`目录），等等Windows用途ACL重置而不是POSIX `chmod`。

### <a id="what-the-audit-checks-(high-level)"></a><a id="what-the-audit-checks-high-level"></a> 审计会检查什么（高层概览）

- **入站访问** - DM/group 策略、白名单：陌生人可以触发机器人吗？
- **跨代理会话访问** - 两个或多个具有默认网关范围会话可见性和不受限制的代理对代理访问的代理：`info` 用于一个操作员角色，`warn` 当沙箱、代理级工具限制或共享用户入口建议不同的信任级别时。在默认的生成树限制下完全沙箱化的名册不会产生任何发现；将 `agents.defaults.sandbox.sessionToolsVisibility` 设置为 `"all"` 将禁用该豁免。
- **潜在的工具损坏** - 高架工具+开放房间：快速注入可以成为shell/file/network行动吗？
- **Exec 文件系统漂移** - 变异文件系统工具被拒绝，而 `exec`/`process` 在没有沙箱限制的情况下保持可用。
- **Exec 批准漂移** - `security="full"`、`autoAllowSkills`、不含 `strictInlineEval` 的口译员许可名单。 `security="full"` 本身就是一个广泛的姿势警告，而不是错误的证据 - 它是受信任的操作员设置的默认选择；仅当您的威胁模型需要批准或列入白名单时才收紧它。
- **网络暴露** - 网关bind/auth、Tailscale Serve/Funnel、weak/short 身份验证令牌和密码。
- **浏览器控制暴露** —— 远程节点、中继端口、远程 CDP 端点。
- **本地磁盘卫生** —— 权限、符号链接、配置包含、同步文件夹路径。
- **插件** —— 未通过显式允许列表加载。
- **策略漂移** - 沙箱 Docker 设置已配置，但沙箱模式关闭； `gateway.nodes.commands.deny` 条目看起来有效，但仅匹配精确的命令 ID（例如 `system.run`），而不是有效负载内的 shell 文本；危险的 `gateway.nodes.commands.allow` 条目；每个代理覆盖全局 `tools.profile="minimal"`；在宽松的政策下可以访问插件拥有的工具。
- **运行时预期偏移** —— 误以为隐式 exec 仍表示 `sandbox`，但此时 `tools.exec.host` 已默认为 `auto`；或者在沙箱模式关闭时设置 `tools.exec.host="sandbox"`。

每个结果都有一个结构化的 `checkId`（例如 `gateway.bind_no_auth`、`tools.exec.security_full_configured`）。前缀：`fs.*`（权限）、`gateway.*` （bind/auth/Tailscale/Control UI/trusted-proxy）、`hooks.*`/`browser.*`/`sandbox.*`/`tools.exec.*`（每表面硬化）、`plugins.*`/`skills.*`（供应链）、`security.exposure.*`（访问策略 x 潜在工具损坏）、`security.trust_model.*` （共享上下文和跨代理默认值）。具有严重性和自动修复支持的完整目录：[安全审核检查](/gateway/security/audit-checks)。另请参见 [ 正式 Verification](/security/formal-verification)。

### <a id="priority-order-when-triaging-findings"></a> 排查发现时的优先级顺序

1. 任何“打开”+启用工具：首先锁定 DMs/groups （pairing/allowlists），然后拧紧工具 policy/sandboxing.
2. 公网网络暴露（LAN 绑定、Funnel、缺少认证）：立即修复。
3. 浏览器控制的远程暴露：按操作员访问来对待（仅限 tailnet，谨慎配对节点，不要公开暴露）。
4. 权限：state/config/credentials/auth 不得为 group/world-readable.
5. 插件：只加载你明确信任的内容。
