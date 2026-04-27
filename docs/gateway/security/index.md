---
summary: "运行带有 shell 访问权限的 AI 网关的安全注意事项和威胁模型"
read_when:
  - 添加扩大访问权限或自动化功能时
title: "安全"
---

<Warning>
  **个人助理信任模型。** 本指南假设每个网关只有一个受信任的
  操作员边界（单用户、个人助理模型）。OpenClaw **不是** 面向多个
  对抗性用户共享一个代理或网关的恶意多租户安全边界。如果你需要混合信任或
  对抗用户操作，请拆分信任边界（独立网关 + 凭据，理想情况下使用独立的操作系统用户或主机）。
</Warning>

## 先看范围：个人助理安全模型

OpenClaw 的安全指导假设为**个人助理**部署：一个受信任的操作员边界，可能包含多个代理。

- 支持的安全姿态：每个网关一个用户/信任边界（优选每个边界使用单独的操作系统用户/主机/VPS）。
- 不支持的安全边界：多个相互不信任或对抗用户共用一个网关/代理。
- 如果需要对抗用户隔离，请按信任边界分割（独立网关 + 凭据，且理想情况下分离操作系统用户/主机）。
- 技术上可在一台机器上运行多个网关，但这不是多用户隔离的推荐基线。
- 推荐默认：每台机器/主机（或 VPS）运行一个用户，每个用户运行一个网关，网关内可有一个或多个代理。
- 多用户使用 OpenClaw 时，建议为每用户各自配置一个 VPS/主机。

## 快速检查：`openclaw security audit`

另见：[形式化验证（安全模型）](/security/formal-verification)

请定期执行（尤其是在更改配置或暴露网络面后）：

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

`security audit --fix` 保持有意狭窄：它将常见的开放组策略翻转为允许列表，恢复 `logging.redactSensitive: "tools"`，收紧状态/配置/包含文件权限，并在 Windows 上运行时使用 Windows ACL 重置而不是 POSIX `chmod`。

它标记常见陷阱（网关认证暴露、浏览器控制暴露、提升的允许列表、文件系统权限、宽松的执行审批和开放渠道工具暴露）。

OpenClaw 既是产品也是实验：你将前沿模型行为接入真实消息界面和真实工具。**不存在"完美安全"的设置。**目标是明确控制：

- 谁能与你的机器人对话
- 机器人在哪些范围可以行动
- 机器人能够访问什么

从最小可用权限开始，随着信心增加逐步放宽。

### 部署和主机信任

OpenClaw 假设主机和配置边界是受信任的：

- 如果有人可以修改网关主机状态/配置（`~/.openclaw`，包括 `openclaw.json`），将其视为受信任的操作员。
- 为多个相互不信任/对抗的操作员运行一个网关 **不是推荐的设置**。
- 对于混合信任团队，请使用独立网关（或至少分离操作系统用户/主机）分割信任边界。
- 推荐默认：每台机器/主机（或 VPS）一个用户，该用户一个网关，该网关内一个或多个代理。
- 在一个网关实例内，认证的操作员访问是受信任的控制平面角色，而非每用户租户角色。
- 会话标识符（`sessionKey`，会话 ID，标签）是路由选择器，而非授权令牌。
- 如果几个人可以给同一个启用工具的代理发消息，他们每个人都可以操控该权限集。每用户会话/内存隔离有助于隐私，但不会将共享代理转换为每用户主机授权。

### 共享 Slack 工作区：真实风险

若"Slack 中所有人均可给机器人发消息"，核心风险是委托工具权限：

- 任何允许的发送者都能根据代理策略触发工具调用（`exec`、浏览器、网络/文件工具）；
- 一人发起的提示/内容注入可导致影响共享状态、设备或输出的操作；
- 若共有代理含敏感凭据/文件，任一允许发信人均可通过工具使用触发泄露。

团队工作流请使用分离的代理/网关和最小化工具；个人数据代理须保持私密。

### 公司共享代理：可接受模式

当使用代理的所有人均处于同一信任边界（如公司团队），且代理仅限业务范围时，可接受此模式。

- 运行在专用机器/虚拟机/容器；
- 使用专用操作系统用户 + 专用浏览器/配置文件/账号；
- 不要在该运行时登录个人 Apple/Google 账户或个人密码管理器/浏览器配置。

混合个人和公司身份会破坏隔离，提升个人数据暴露风险。

## 网关和节点信任概念

将网关和节点视为一个操作员信任域，不同角色分工：

- **网关**是控制平面和策略表面（`gateway.auth`，工具策略，路由）。
- **节点**是配对到该网关的远程执行表面（命令、设备操作、主机本地能力）。
- 经过网关认证的调用者在网关范围内是受信任的。配对后，节点操作是该节点上的受信任操作员操作。
- `sessionKey` 是路由/上下文选择，而非每用户认证。
- 执行审批（允许列表 + 询问）是操作员意图的护栏，而非敌对多租户隔离。
- OpenClaw 针对受信任单操作员设置的产品默认值是允许在 `gateway`/`node` 上进行主机执行而无需审批提示（`security="full"`, `ask="off"` 除非你收紧它）。该默认值是有意为之的用户体验，本身不是漏洞。
- 执行审批绑定精确的请求上下文和尽力的直接本地文件操作数；它们不在语义上建模每个运行时/解释器加载器路径。使用沙箱化和主机隔离来实现强边界。

需要恶意用户隔离时，请按操作系统用户/主机分割信任边界，运行独立网关。

## 信任边界矩阵

风险排查时可参考此快速模型：

| 边界或控制                                              | 含义                                              | 常见误读                                                                    |
| --------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `gateway.auth` (token/password/trusted-proxy/device auth) | 认证调用者访问网关 API             | "需要每帧每条消息签名才安全"                    |
| `sessionKey`                                              | 上下文/会话选择的路由键         | "会话键是用户认证边界"                                         |
| 提示/内容护栏                                 | 降低模型滥用风险                           | "仅提示注入证明认证绕过"                                   |
| `canvas.eval` / browser evaluate                          | 启用时为有意操作员能力      | "此信任模型中任何 JS eval 原语自动视为漏洞"           |
| Local TUI `!` shell                                       | 明确操作员触发的本地执行       | "本地 shell 便利命令是远程注入"                         |
| 节点配对和节点命令                            | 配对设备上的操作员级远程执行 | "默认应将远程设备控制视为不可信用户访问"           |

## 设计上非漏洞

<Accordion title="常见的、超出范围的发现">

这些模式经常被报告，通常会被关闭为无需处理，除非证明了真实的边界绕过：

- 仅凭提示注入的链路，没有策略、认证或沙箱绕过。
- 依赖假设在一个共享主机或配置上进行敌对多租户操作的主张。
- 将正常操作员读取路径访问（例如 `sessions.list` / `sessions.preview` / `chat.history`）在共享网关设置中归类为 IDOR 的主张。
- 仅限 localhost 的部署发现（例如仅绑定回环地址的网关上的 HSTS）。
- 对仓库中不存在的入站路径，报告 Discord 入站 webhook 签名问题。
- 将节点配对元数据视为 `system.run` 的隐藏第二层逐命令审批，而真实执行边界仍然只是网关的全局节点命令策略加上节点自身的执行审批。
- 将 `sessionKey` 视为认证令牌的“缺少每用户授权”类发现。

</Accordion>

## 60 秒加固基线

先使用此基线，再对受信代理按需开启工具：

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    auth: { mode: "token", token: "replace-with-long-random-token" },
  },
  session: {
    dmScope: "per-channel-peer",
  },
  tools: {
    profile: "messaging",
    deny: [
      "group:automation",
      "group:runtime",
      "group:fs",
      "sessions_spawn",
      "sessions_send",
    ],
    fs: { workspaceOnly: true },
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

此举使网关仅限本地、隔离私信，并默认禁用控制平面/运行时工具。

## 共享收件箱快速规则

若多人可私信你的机器人：

- 设置 `session.dmScope: "per-channel-peer"`（或多账号渠道的 `"per-account-channel-peer"`）。
- 保持 `dmPolicy: "pairing"` 或严格的允许列表。
- 绝不要将共享私信与广泛的工具访问结合。
- 这可加强协作/共享收件箱的安全，但在用户共享主机/配置写入访问权时，并非设计为敌对共租户隔离。

## 上下文可见性模型

OpenClaw 分离了两个概念：

- **触发授权**：谁可以触发代理（`dmPolicy`, `groupPolicy`, 允许列表，提及门槛）。
- **上下文可见性**：什么补充上下文被注入到模型输入中（回复正文、引用文本、线程历史、转发元数据）。

允许列表控制触发器和命令授权。`contextVisibility` 设置控制如何过滤补充上下文（引用回复、线程根、获取的历史）：

- `contextVisibility: "all"`（默认）保留接收到的补充上下文。
- `contextVisibility: "allowlist"` 将补充上下文过滤为活动允许列表检查允许的发送者。
- `contextVisibility: "allowlist_quote"` 行为类似 `allowlist`，但仍保留一个明确的引用回复。

按渠道或每房间/对话设置 `contextVisibility`。详见 [群聊](/channels/groups#context-visibility-and-allowlists) 获取设置详情。

公告分类指导：

- 仅显示“模型可以看到来自非允许列表发送者的引用或历史文本”的声明是可通过 `contextVisibility` 解决的加固发现，本身不是认证或沙箱边界绕过。
- 要具有安全影响，报告仍需证明信任边界绕过（认证、策略、沙箱、审批或另一个记录的边界）。

## 审计检查内容（高层）

- **入站访问**（DM 策略、群组策略、允许列表）：陌生人能否触发机器人？
- **工具爆炸半径**（提升权限工具 + 开放房间）：提示注入能否转化为 shell/文件/网络操作？
- **执行审批漂移**（`security=full`、`autoAllowSkills`、未启用 `strictInlineEval` 的解释器允许列表）：主机执行护栏是否仍按预期工作？
  - `security="full"` 是一个宽泛的姿态警告，而不是漏洞证明。它是受信任个人助理设置下的默认选择；只有在你的威胁模型需要审批或允许列表护栏时才收紧它。
- **网络暴露**（网关绑定/认证、Tailscale Serve/Funnel、弱/短认证令牌）。
- **浏览器控制暴露**（远程节点、中继端口、远程 CDP 端点）。
- **本地磁盘卫生**（权限、符号链接、配置包含文件、“同步文件夹”路径）。
- **插件**（插件在没有显式允许列表的情况下加载）。
- **策略漂移/配置错误**（已配置沙箱 docker 设置但沙箱模式关闭；`gateway.nodes.denyCommands` 匹配模式无效，因为匹配仅限精确命令名（例如 `system.run`），不会检查 shell 文本；危险的 `gateway.nodes.allowCommands` 条目；全局 `tools.profile="minimal"` 被每代理配置覆盖；在宽松工具策略下可访问插件拥有的工具）。
- **运行时预期漂移**（例如假设隐式执行仍意味着 `sandbox`，但 `tools.exec.host` 现在默认为 `auto`，或在沙箱模式关闭时显式设置 `tools.exec.host="sandbox"`）。
- **模型卫生**（当配置模型看起来是旧版时发出警告；不是硬性阻止）。

若运行 `--deep`，OpenClaw 还会尝试尽力实时网关探测。

## 凭据存储映射

审计访问或决定备份内容时使用：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram 机器人令牌**：配置/环境变量或 `channels.telegram.tokenFile`（仅限常规文件；拒绝符号链接）
- **Discord 机器人令牌**：配置/环境变量或 SecretRef（环境/文件/执行提供者）
- **Slack 令牌**：配置/环境变量（`channels.slack.*`）
- **配对允许列表**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账号）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认账号）
- **模型认证配置文件**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **文件支持的秘密载荷（可选）**：`~/.openclaw/secrets.json`
- **遗留 OAuth 导入**：`~/.openclaw/credentials/oauth.json`

## 安全审计清单

审计报告问题时，优先处理顺序：

1. **任何“开放”且启用工具**：先锁定私信/群组（配对/允许列表），再收紧工具策略/沙箱。
2. **公共网络暴露**（LAN 绑定、Funnel、缺少认证）：立即修复。
3. **浏览器控制远程暴露**：将其视为操作员访问（仅 tailnet，谨慎配对节点，避免公开暴露）。
4. **权限**：确保状态/配置/凭据/认证不可被组/全局读取。
5. **插件**：仅加载你明确信任的内容。
6. **模型选择**：对于任何带工具的机器人，优先使用现代、具备指令加固的模型。

## 安全审计术语表

每条审计发现都通过结构化 `checkId` 标识（例如 `gateway.bind_no_auth` 或 `tools.exec.security_full_configured`）。常见的高严重性类别：

- `fs.*` — 状态、配置、凭据、认证配置文件的文件系统权限。
- `gateway.*` — 绑定模式、认证、Tailscale、控制 UI、受信任代理设置。
- `hooks.*`, `browser.*`, `sandbox.*`, `tools.exec.*` — 各表面的加固。
- `plugins.*`, `skills.*` — 插件/技能供应链和扫描结果。
- `security.exposure.*` — 访问策略与工具爆炸半径交汇的横切检查。

查看完整目录、严重级别、修复键和自动修复支持，请访问
[安全审计检查](/gateway/security/audit-checks)。

## 通过 HTTP 控制 UI

控制 UI 需要一个**安全上下文**（HTTPS 或 localhost）来生成设备身份。`gateway.controlUi.allowInsecureAuth` 是一个本地兼容性开关：

- 在 localhost 上，如果页面通过非安全 HTTP 加载，它允许控制 UI 在没有设备身份的情况下认证。
- 它不绕过配对检查。
- 它不放宽远程（非 localhost）设备身份要求。

优先使用 HTTPS（Tailscale Serve）或在 `127.0.0.1` 上打开 UI。

仅在紧急情况下，`gateway.controlUi.dangerouslyDisableDeviceAuth` 可完全禁用设备身份检查。这是严重的安全降级；除非你正在主动调试且能快速恢复，否则请勿开启。

与这些危险标志分开，成功的 `gateway.auth.mode: "trusted-proxy"` 可以在没有设备身份的情况下接纳 **操作员** 控制 UI 会话。这是一种有意的认证模式行为，而不是 `allowInsecureAuth` 的捷径，并且它仍然不扩展到节点角色控制 UI 会话。

当启用此设置时，`openclaw security audit` 会发出警告。

## 不安全或危险选项汇总

`openclaw security audit` 在启用已知不安全/危险的调试开关时会报告 `config.insecure_or_dangerous_flags`。生产环境中请保持这些选项未设置。

<AccordionGroup>
  <Accordion title="当前审计跟踪的标志">
    - `gateway.controlUi.allowInsecureAuth=true`
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`
    - `hooks.gmail.allowUnsafeExternalContent=true`
    - `hooks.mappings[<index>].allowUnsafeExternalContent=true`
    - `tools.exec.applyPatch.workspaceOnly=false`
    - `plugins.entries.acpx.config.permissionMode=approve-all`
  </Accordion>

  <Accordion title="配置模式中所有 `dangerous*` / `dangerously*` 键">
    控制 UI 和浏览器：

    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth`
    - `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`

    通道名称匹配（内置和插件通道；在适用情况下，`accounts.<accountId>` 下也可用）：

    - `channels.discord.dangerouslyAllowNameMatching`
    - `channels.slack.dangerouslyAllowNameMatching`
    - `channels.googlechat.dangerouslyAllowNameMatching`
    - `channels.msteams.dangerouslyAllowNameMatching`
    - `channels.synology-chat.dangerouslyAllowNameMatching`（插件通道）
    - `channels.synology-chat.dangerouslyAllowInheritedWebhookPath`（插件通道）
    - `channels.zalouser.dangerouslyAllowNameMatching`（插件通道）
    - `channels.irc.dangerouslyAllowNameMatching`（插件通道）
    - `channels.mattermost.dangerouslyAllowNameMatching`（插件通道）

    网络暴露：

    - `channels.telegram.network.dangerouslyAllowPrivateNetwork`（也可按账户设置）

    沙箱 Docker（默认值 + 每代理）：

    - `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`
    - `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`
    - `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin`

  </Accordion>
</AccordionGroup>

## 反向代理配置

如果您在反向代理（nginx、Caddy、Traefik 等）后面运行网关，请配置 `gateway.trustedProxies` 以正确处理转发的客户端 IP。

网关检测到来自非 `trustedProxies` 地址的代理头时，**不会**将连接视为本地客户端。若禁用网关认证，此类连接将被拒绝。此举防止身份验证绕过，避免代理连接被误判为本地主机并自动信任。

`gateway.trustedProxies` 也用于 `gateway.auth.mode: "trusted-proxy"`，但该认证模式更严格：

- trusted-proxy 认证 **在环回源代理上默认拒绝**
- 同一主机的环回反向代理仍然可以使用 `gateway.trustedProxies` 进行本地客户端检测和转发 IP 处理
- 对于同一主机的环回反向代理，请使用令牌/密码认证，而不是 `gateway.auth.mode: "trusted-proxy"`

```yaml
gateway:
  trustedProxies:
    - "10.0.0.1" # 反向代理 IP
  # 可选。默认 false。
  # 仅当您的代理无法提供 X-Forwarded-For 时启用。
  allowRealIpFallback: false
  auth:
    mode: password
    password: ${OPENCLAW_GATEWAY_PASSWORD}
```

配置 `trustedProxies` 后，网关使用 `X-Forwarded-For` 确定客户端 IP。默认忽略 `X-Real-IP`，除非显式设置 `gateway.allowRealIpFallback: true`。

良好反向代理行为（覆盖传入转发头）：

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
```

不良代理行为（附加/保留不可信转发头）：

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## HSTS 与来源说明

- OpenClaw 网关首选本地/环回。如果您在反向代理处终止 TLS，请在那里的代理面向的 HTTPS 域上设置 HSTS。
- 如果网关本身终止 HTTPS，您可以设置 `gateway.http.securityHeaders.strictTransportSecurity` 以从 OpenClaw 响应发出 HSTS 头。
- 详细的部署指南见 [可信代理认证](/gateway/trusted-proxy-auth#tls-termination-and-hsts)。
- 对于非环回控制 UI 部署，默认需要 `gateway.controlUi.allowedOrigins`。
- `gateway.controlUi.allowedOrigins: ["*"]` 是显式的允许所有浏览器来源策略，不是安全加固的默认值。避免在严格控制的本地测试之外使用它。
- 即使启用了常规环回豁免，环回上的浏览器来源认证失败仍然受速率限制，但锁定键的范围是每个标准化的 `Origin` 值，而不是一个共享的 localhost 桶。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用 Host 头来源回退模式；将其视为操作员选择的危险策略。
- 将 DNS 重绑定和代理主机头行为视为部署加固关注点；保持 `trustedProxies` 紧密，避免将网关直接暴露于公共互联网。

## 本地会话日志存储

OpenClaw 会话转录存储于磁盘，位置为 `~/.openclaw/agents/<agentId>/sessions/*.jsonl`。

该机制支持会话连续性及（可选）会话记忆索引，但**任何拥有文件系统访问权限的进程/用户都可读取这些日志**。将磁盘访问视为信任边界，必须锁紧 `~/.openclaw` 的权限（详见审计章节）。若需更强隔离，请为代理部署独立操作系统用户或主机。

## 节点执行（system.run）

- 需要节点配对（批准 + 令牌）。
- 网关节点配对不是每命令批准表面。它建立节点身份/信任和令牌颁发。
- 网关通过 `gateway.nodes.allowCommands` / `denyCommands` 应用粗略的全局节点命令策略。
- 在 Mac 上通过 **设置 → 执行批准** 控制（安全 + 询问 + 白名单）。
- 每节点 `system.run` 策略是节点自己的执行批准文件（`exec.approvals.node.*`），它可以比网关的全局命令 ID 策略更严格或更宽松。
- 以 `security="full"` 和 `ask="off"` 运行的节点遵循默认的可信操作员模型。除非您的部署明确要求更严格的批准或白名单立场，否则将其视为预期行为。
- 批准模式绑定确切的请求上下文，并且在可能时绑定一个具体的本地脚本/文件操作数。如果 OpenClaw 无法为解释器/运行时命令识别恰好一个直接的本地文件，批准支持的执行将被拒绝，而不是承诺完整的语义覆盖。
- 对于 `host=node`，批准支持的运行还存储规范的准备好的 `systemRunPlan`；后来批准的转发重用该存储的计划，并且网关验证拒绝在批准请求创建后对命令/cwd/会话上下文的调用者编辑。
- 如果您不想要远程执行，将安全设置为 **deny** 并移除该 Mac 的节点配对。

这种区别对于分类很重要：

- 如果网关全局策略和节点的本地执行批准仍然强制执行实际的执行边界，重新连接的配对节点宣传不同的命令列表本身并不是漏洞。
- 将节点配对元数据视为第二个隐藏每命令批准层的报告通常是策略/用户体验混淆，而不是安全边界绕过。

## 动态技能（守护/远程节点）

## 动态技能（守护/远程节点）

OpenClaw 可在会话中途刷新技能列表：

- **技能守护**：`SKILL.md` 的更改会在下一轮代理转变时更新技能快照。
- **远程节点**：连接 macOS 节点使 macOS 独有技能生效（基于二进制检测）。

## 威胁模型

## 威胁模型

你的 AI 助手可：

- 执行任意 shell 命令
- 读写文件
- 访问网络服务
- 向任何人发送消息（若赋予 WhatsApp 访问）

向你发消息的人可：

- 试图诱使 AI 做不良操作
- 进行社工以获取数据访问
- 探查基础设施细节

## 核心概念：智能前的访问控制

多数失败非复杂漏洞 —— 是"有人发消息，机器人照做"。

OpenClaw 立场：

- **身份优先：** 决定谁能跟机器人对话（DM 配对/白名单/公开）。
- **范围其次：** 决定机器人可行动范围（群组白名单 + 提及触发、工具、沙箱、设备权限）。
- **模型最后：** 假设模型会被操控，设计时限制操控的影响范围。

## 命令授权模型

斜杠命令与指令仅针对**授权发送者**生效。授权依据频道白名单/配对及 `commands.useAccessGroups`（参见 [配置](/gateway/configuration) 与 [斜杠命令](/tools/slash-commands)）。若渠道白名单为空或包含 `"*"`，该频道的命令即开放。

`/exec` 仅是授权操作员的会话便捷命令，不写配置，也不改动其他会话。

## 控制平面工具风险

- `gateway` 可以使用 `config.schema.lookup` / `config.get` 检查配置，并可以使用 `config.apply`、`config.patch` 和 `update.run` 进行持久更改。
- `cron` 可以创建在原始聊天/任务结束后继续运行的计划作业。

The owner-only `gateway` runtime tool still refuses to rewrite
`tools.exec.ask` or `tools.exec.security`; legacy `tools.bash.*` aliases are
normalized to the same protected exec paths before the write.
Agent-driven `gateway config.apply` and `gateway config.patch` edits are
fail-closed by default: only a narrow set of prompt, model, and mention-gating
paths are agent-tunable. New sensitive config trees are therefore protected
unless they are deliberately added to the allowlist.

对于任何处理不受信任内容的代理/表面，默认拒绝这些：

```json5
{
  tools: {
    // 禁止网关配置变更、定时任务创建及会话管理操作
    deny: ["gateway", "cron", "sessions_spawn", "sessions_send"],
  },
}
```

`commands.restart=false` 仅禁止重启动作，不禁用 `gateway` 配置/更新操作。

## 插件

插件与网关**进程内运行**。视为可信代码：

- 仅从您信任的来源安装插件。
- 首选显式的 `plugins.allow` 白名单。
- 启用前审查插件配置。
- 插件更改后重启网关。
- 如果您安装或更新插件（`openclaw plugins install <package>`、`openclaw plugins update <id>`），将其视为运行不受信任的代码：
  - 安装路径是活动插件安装根目录下的每插件目录。
  - OpenClaw 在安装/更新前运行内置的危险代码扫描。`critical` 发现默认阻止。
  - OpenClaw 使用该目录中的 `npm pack`，然后运行 `npm install --omit=dev`（npm 生命周期脚本可以在安装期间执行代码）。
  - 首选固定的确切版本（`@scope/pkg@1.2.3`），并在启用前检查磁盘上解压的代码。
  - `--dangerously-force-unsafe-install` 仅用于插件安装/更新流程中内置扫描误报的紧急突破。它不绕过插件 `before_install` 钩子策略块，也不绕过扫描失败。
  - 网关支持的技能依赖安装遵循相同的危险/可疑拆分：除非调用者显式设置 `dangerouslyForceUnsafeInstall`，否则内置 `critical` 发现会阻止，而可疑发现仍然仅警告。`openclaw skills install` 仍然是单独的 ClawHub 技能下载/安装流程。

详见：[插件](/tools/plugin)

## DM 访问模型：配对、白名单、公开、禁用

所有支持 DM 的当前渠道都支持 DM 策略（`dmPolicy` 或 `*.dm.policy`），在消息处理前限定入站 DM：

- `pairing`（默认）：未知发送者收到短配对码，机器人忽略其消息直到批准。码 1 小时后过期；重复 DM 仅在有新请求时重新发送。默认每频道挂起请求最多 **3 个**。
- `allowlist`：阻止未知发送者（无配对握手）。
- `open`：允许任何人 DM（公开）。**需**频道白名单含 `"*"`（明确选择公开）。
- `disabled`：完全忽略入站 DM。

CLI 批准流程：

```bash
# 列出待处理的配对请求
openclaw pairing list <channel>
# 批准特定配对码
openclaw pairing approve <channel> <code>
```

详情及磁盘文件见：[配对](/channels/pairing)

## DM 会话隔离（多用户模式）

默认，OpenClaw 将**所有 DM 路由至主会话**，确保助手在设备及频道间连续性。若**多人**可 DM 机器人（公开 DM 或多用户白名单），建议隔离 DM 会话：

```json5
{
  // 为每个 DM 发送者创建独立会话
  session: { dmScope: "per-channel-peer" },
}
```

防止跨用户上下文泄露，群聊也将被隔离。

此为消息上下文边界，非主机管理员边界。用户相互敌意且共享同一网关主机/配置时，请为每信任边界运行独立网关。

### 安全 DM 模式（推荐）

视上例为**安全 DM 模式**：

- 默认：`session.dmScope: "main"`（所有 DM 共享一个会话以保持连续性）。
- 本地 CLI 引导默认：未设置时写入 `session.dmScope: "per-channel-peer"`（保留现有的显式值）。
- 安全 DM 模式：`session.dmScope: "per-channel-peer"`（每个频道 + 发送者对获得隔离的 DM 上下文）。
- 跨频道对等隔离：`session.dmScope: "per-peer"`（每个发送者在同一类型的所有频道中获得一个会话）。

同频道多账户使用时，选用 `per-account-channel-peer`。同一人跨多频道通讯时，用 `session.identityLinks` 合并为统一身份。详见 [会话管理](/concepts/session) 与 [配置](/gateway/configuration)。

## DM 和群组白名单

OpenClaw 有两层"谁能触发我？"控制：

- **DM 白名单**（`allowFrom` / `channels.discord.allowFrom` / `channels.slack.allowFrom`；旧版：`channels.discord.dm.allowFrom`、`channels.slack.dm.allowFrom`）：谁可在私聊中对话机器人。
  - `dmPolicy="pairing"` 时，审批写入账户范围配对白名单存储（`~/.openclaw/credentials/` 下，默认账户为 `<channel>-allowFrom.json`，非默认账户为 `<channel>-<accountId>-allowFrom.json`），与配置白名单合并。
- **群组白名单**（频道特定）：机器人来自哪些群组/频道/公会消息被接受。
  - 常用模式：
    - `channels.whatsapp.groups`、`channels.telegram.groups`、`channels.imessage.groups`：每群组默认如 `requireMention`，设置时也做群组白名单（包含 `"*"` 保留允许所有）。
    - `groupPolicy="allowlist"` + `groupAllowFrom`：限制群组内哪些人可触发机器人（支持 WhatsApp/Telegram/Signal/iMessage/Microsoft Teams）。
    - `channels.discord.guilds` / `channels.slack.channels`：渠道特定白名单及提及默认。
  - 群组检查顺序：先群组策略/白名单，再提及/回复激活。
  - 回复机器人消息（隐式提及）**不会**绕过发送者白名单如 `groupAllowFrom`。
  - **安全提示：** `dmPolicy="open"` 与 `groupPolicy="open"` 视为最后手段配置，建议少用；若非全面信任群成员，请优先配对 + 白名单。

详见：[配置](/gateway/configuration) 与 [群组](/channels/groups)

## 提示注入（定义及重要性）

提示注入指攻击者故意构造消息，操控模型做不安全操作（如"忽略指令"、"导出文件系统"、"执行链接命令"等）。

即使有强系统提示，**提示注入仍未解决**。系统提示仅为软约束；硬约束依赖工具策略、执行批准、沙箱与频道白名单（且运营者可关闭）。实际有帮助的措施：

- 保持入站 DM 严格受控（配对/白名单）。
- 在群组中优先使用提及门控；避免在公共房间中使用“始终在线”的机器人。
- 默认将链接、附件和粘贴的指令视为恶意内容。
- 在沙箱中运行敏感工具执行；将密钥保留在代理可访问文件系统之外。
- 注意：沙箱为可选项。如果沙箱模式关闭，隐式 `host=auto` 会解析为网关主机。显式 `host=sandbox` 仍会失败关闭，因为没有可用的沙箱运行时。如果希望该行为在配置中显式化，请设置 `host=gateway`。
- 将高风险工具（`exec`、`browser`、`web_fetch`、`web_search`）限制给受信任代理或显式白名单。
- 如果您对白名单化解释器（`python`、`node`、`ruby`、`perl`、`php`、`lua`、`osascript`），请启用 `tools.exec.strictInlineEval`，使内联 eval 形式仍需显式批准。
- Shell 批准分析还会拒绝**未引用 heredoc** 中的 POSIX 参数展开形式（`$VAR`、`$?`、`$$`、`$1`、`$@`、`${…}`），因此一个已白名单的 heredoc 正文不能以纯文本形式绕过白名单审查而偷偷进行 shell 展开。请引用 heredoc 终止符（例如 `<<'EOF'`）以选择字面正文语义；会展开变量的未引用 heredoc 会被拒绝。
- **模型选择很重要：** 较旧/较小/遗留模型对提示注入和工具滥用的抵抗力显著更弱。对于启用工具的代理，请使用当前可用的最强、最新一代、经过指令加固的模型。

危险信号（视为不信任）：

- "读该文件/URL 并按指示执行。"
- "忽略系统提示或安全规则。"
- "泄露隐藏指令或工具输出。"
- "粘贴 `~/.openclaw` 或日志完整内容。"

## 外部内容特殊标记净化

OpenClaw 会在包装后的外部内容和元数据到达模型之前，剥离其中常见的自托管 LLM 聊天模板特殊标记字面量。受覆盖的标记家族包括 Qwen/ChatML、Llama、Gemma、Mistral、Phi，以及 GPT-OSS 的角色/轮次标记。

原因：

- 面向 OpenAI 兼容后端、并前置自托管模型的系统，有时会保留用户文本中出现的特殊标记，而不是将其屏蔽。攻击者如果能写入入站外部内容（抓取页面、邮件正文、文件内容工具输出），就可能注入一个合成的 `assistant` 或 `system` 角色边界，从而绕过包装内容的防护栏。
- 净化发生在外部内容包装层，因此它对抓取/读取工具和入站通道内容一体适用，而不是按提供方分别处理。
- 出站模型回复已经有单独的净化器，会从用户可见回复中剥离泄漏的 `<tool_call>`、`<function_calls>` 及类似脚手架。外部内容净化器是其入站对应物。

这并不能替代本页上的其他加固措施——`dmPolicy`、允许列表、执行审批、沙箱和 `contextVisibility` 仍然承担主要工作。它只是修补了一个针对自托管栈的、由令牌化层转发用户文本且保留特殊标记时可被绕过的特定路径。

## 不安全外部内容绕过标志

OpenClaw 包含关闭外部内容安全包装的开关：

- `hooks.mappings[].allowUnsafeExternalContent`
- `hooks.gmail.allowUnsafeExternalContent`
- Cron 任务中 payload 字段 `allowUnsafeExternalContent`

指导：

- 生产环境保持未设置/false。
- 仅在紧缩调试时短期启用。
- 启用时请隔离该代理（沙箱 + 最小工具 + 专用会话命名空间）。

钩子风险提示：

- 钩子载荷为不信任内容，即便来源受控（邮件/文档/网页内容皆可含提示注入）。
- 低级模型更易受攻击。钩子驱动自动化推荐使用强大现代模型层，结合紧缩工具策略（`tools.profile: "messaging"` 或更严格） + 沙箱。

### 提示注入不依赖公开 DM

即便**仅你**可发消息，提示注入仍可通过任何**不信任内容**触发（网页搜索/抓取结果、浏览器页面、邮件、文档、附件、粘贴日志/代码）。攻击面不限于发信者，**内容自身**可能携带对抗指令。

启用工具时，典型风险为上下文外泄或触发工具调用。缩小影响范围：

- 使用只读或禁用工具的 **读取代理** 总结不信任内容，然后将摘要传递给主代理。
- 除非必要，否则对启用工具的代理保持 `web_search` / `web_fetch` / `browser` 关闭。
- 对于 OpenResponses URL 输入（`input_file` / `input_image`），设置严格的 `gateway.http.endpoints.responses.files.urlAllowlist` 和 `gateway.http.endpoints.responses.images.urlAllowlist`，并保持 `maxUrlParts` 较低。空白名单视为未设置；如果想完全禁用 URL 获取，请使用 `files.allowUrl: false` / `images.allowUrl: false`。
- 对于 OpenResponses 文件输入，解码后的 `input_file` 文本仍作为 **不信任外部内容** 注入。不要仅仅因为网关在本地解码了就认为文件文本是可信的。注入块仍带有明确的 `<<<EXTERNAL_UNTRUSTED_CONTENT ...>>>` 边界标记加上 `Source: External` 元数据，即使此路径省略了较长的 `SECURITY NOTICE:` 横幅。
- 当媒体理解从附加文档中提取文本并将其附加到媒体提示之前，也会应用相同的基于标记的包装。
- 为任何接触不信任输入的代理启用沙箱和严格的工具白名单。
- 将秘密保留在提示之外；改为通过网关主机上的 env/config 传递。

### 自托管 LLM 后端

OpenAI 兼容的自托管后端，如 vLLM、SGLang、TGI、LM Studio，或自定义的 Hugging Face tokenizer 栈，在处理聊天模板特殊标记时可能与托管提供方不同。如果后端将诸如 `<|im_start|>`、`<|start_header_id|>` 或 `<start_of_turn>` 这样的字面字符串，在用户内容中当作结构性聊天模板标记进行分词，那么不可信文本就可能试图在 tokenizer 层伪造角色边界。

OpenClaw 会在将包装后的外部内容发送给模型之前，剥离常见模型家族的特殊标记字面量。请保持外部内容包装启用，并在可用时优先使用会对用户提供内容中的特殊标记进行拆分或转义的后端设置。OpenAI 和 Anthropic 等托管提供方已经在请求侧应用了自己的净化处理。

### 模型强度（安全提示）

提示注入防护的效果会随模型等级而不均衡。小型/廉价模型尤其容易受到工具误用和指令劫持的影响，特别是在面对对抗性提示时。

<Warning>
对于启用工具或处理不可信内容的代理，旧版/小型模型往往提示注入风险过高。不要在弱模型层级运行这些工作负载。
</Warning>

建议：

- 任何可以运行工具或访问文件/网络的机器人，均选用最新代、最高层级模型。
- 不使用旧/弱/小型模型用于启用工具代理或不可信收件箱；注入风险过大。
- 必用小模型时，**缩小影响范围**（只读工具、强沙箱、最小文件系统访问、严格白名单）。
- 运行小模型时，**所有会话启用沙箱**并禁用 web_search/web_fetch/browser，除非输入严格控制。
- 对于仅信任输入且无工具的个人助理，使用小模型通常可接受。

## 组中的推理和详细输出

`/reasoning`、`/verbose` 和 `/trace` 可能会暴露内部推理、工具输出或插件诊断信息，这些信息本不应出现在公共频道中。在群组设置中，将它们视为 **仅调试** 使用，除非明确需要，否则请保持关闭。

建议：

- 在公共房间中保持 `/reasoning`、`/verbose` 和 `/trace` 禁用。
- 如果启用它们，请仅在受信任的 DM 或严格控制的房间中进行。
- 记住：详细和跟踪输出可能包括工具参数、URL、插件诊断和模型看到的数据。

## 配置加固示例

### 文件权限

保持网关主机上的配置和状态私密：

- `~/.openclaw/openclaw.json`：权限 600（用户读写）
- `~/.openclaw` 文件夹权限 700（仅用户）

`openclaw doctor` 可提示并协助加固。

### 网络暴露（绑定、端口、防火墙）

网关在单端口复用**WebSocket + HTTP**：

- 默认：18789
- 配置/标志/环境变量：`gateway.port`，`--port`，`OPENCLAW_GATEWAY_PORT`

HTTP 面向控制界面及 canvas：

- 控制 UI（SPA 资源）默认基路径 `/`
- Canvas 主机路径：`/__openclaw__/canvas/` & `/__openclaw__/a2ui/`（任意 HTML/JS，应视为不信任内容）

使用浏览器打开 canvas 内容须谨慎：

- 不暴露 canvas 主机给不信任网络/用户。
- 切勿使 canvas 内容与特权网页共享同一源，除非充分理解影响。

绑定模式控制网关监听范围：

- `gateway.bind: "loopback"` (默认): 仅本地客户端可连接。
- 非环回绑定（`"lan"`, `"tailnet"`, `"custom"`）会扩大攻击面。仅在配合网关认证（共享令牌/密码或正确配置的非环回可信代理）和真实防火墙时使用。

经验法则：

- 优先使用 Tailscale Serve 替代 LAN 绑定（Serve 保持网关环回，Tailscale 管理访问）。
- 必须 LAN 绑定时，防火墙限制端口访问至精确源 IP 白名单；勿广泛端口转发。
- 绝不在 `0.0.0.0` 上无认证公开网关。

### 使用 UFW 发布 Docker 端口

在 VPS 上使用 Docker 时，容器端口映射（`-p HOST:CONTAINER` 或 `ports:`）通过 Docker 转发链而非仅 Host 的 INPUT 规则。

为令防火墙策略在 Docker 与主机间一致，应在 `DOCKER-USER` 链设置规则（此链在 Docker 自身接受规则前生效）。现代发行版使用 `iptables-nft`，规则同应用于 nftables 后端。

IPv4 最简白名单示例：

```bash
# /etc/ufw/after.rules（添加独立的 *filter 部分）
*filter
:DOCKER-USER - [0:0]
-A DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
-A DOCKER-USER -s 127.0.0.0/8 -j RETURN
-A DOCKER-USER -s 10.0.0.0/8 -j RETURN
-A DOCKER-USER -s 172.16.0.0/12 -j RETURN
-A DOCKER-USER -s 192.168.0.0/16 -j RETURN
-A DOCKER-USER -s 100.64.0.0/10 -j RETURN
-A DOCKER-USER -p tcp --dport 80 -j RETURN
-A DOCKER-USER -p tcp --dport 443 -j RETURN
-A DOCKER-USER -m conntrack --ctstate NEW -j DROP
-A DOCKER-USER -j RETURN
COMMIT
```

IPv6 有单独规则，Docker IPv6 启用时相应编辑 `/etc/ufw/after6.rules`。

# 避免示例中写死接口名（如 `eth0`），因各 VPS 镜像接口名不同（如 `ens3`、`enp*`），免漏掉拒绝规则。

重载后简单验证：

```bash
ufw reload
iptables -S DOCKER-USER
ip6tables -S DOCKER-USER
nmap -sT -p 1-65535 <公网 IP> --open
```

# 外网应仅开放预期端口（常见 SSH + 反向代理端口）。

### mDNS/Bonjour 发现

### 0.4.2) mDNS/Bonjour 发现（信息泄露）

网关通过 mDNS（`_openclaw-gw._tcp`，端口 5353）广播本机设备发现。全模式会公开 TXT 记录中的运行信息：

- `cliPath`：CLI 二进制完整路径（泄漏用户名和安装位置）
- `sshPort`：SSH 可用端口
- `displayName`、`lanHost`：主机名信息

**运营安全考虑：** 广播基础设施详情加剧本地网络侦察。即使是“无害”的路径和 SSH 可用信息，都方便攻击者绘制环境拓扑。

**建议：**

1. **最小模式**（默认，推荐对外网关）：mDNS 广播不含敏感字段：

   ```json5
   {
     discovery: {
       mdns: { mode: "minimal" },
     },
   }
   ```

2. **完全关闭**（无需求时）：

   ```json5
   {
     discovery: {
       mdns: { mode: "off" },
     },
   }
   ```

3. **全模式**（自愿）：包含 `cliPath` + `sshPort`：

   ```json5
   {
     discovery: {
       mdns: { mode: "full" },
     },
   }
   ```

4. **环境变量方式**（替代配置）：设置 `OPENCLAW_DISABLE_BONJOUR=1` 禁用 mDNS。

最小模式下仍广播用于设备发现所需信息（`role`、`gatewayPort`、`transport`），需要 CLI 路径时可通过认证 WebSocket 获取。

### 锁定网关 WebSocket（本地认证）

默认**需要**网关认证。如果未配置有效的网关认证路径，网关将拒绝 WebSocket 连接（失败关闭）。

引导流程默认生成令牌（即使针对回环地址），因此本地客户端必须完成身份验证。

设置令牌，确保**所有** WebSocket 客户端需认证：

```json5
{
  gateway: {
    auth: { mode: "token", token: "your-token" },
  },
}
```

医生命令可生成令牌：`openclaw doctor --generate-gateway-token`。

Note: `gateway.remote.token` / `.password` are client credential sources. They
do **not** protect local WS access by themselves.
Local call paths can use `gateway.remote.*` as fallback only when `gateway.auth.*`
is unset.
If `gateway.auth.token` / `gateway.auth.password` is explicitly configured via
SecretRef and unresolved, resolution fails closed (no remote fallback masking).
Optional: pin remote TLS with `gateway.remote.tlsFingerprint` when using `wss://`.
Plaintext `ws://` is loopback-only by default. For trusted private-network
paths, set `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` on the client process as
break-glass. This is intentionally process environment only, not an
`openclaw.json` config key.
Mobile pairing and Android manual or scanned gateway routes are stricter:
cleartext is accepted for loopback, but private-LAN, link-local, `.local`, and
dotless hostnames must use TLS unless you explicitly opt into the trusted
private-network cleartext path.

本地设备配对：

- Device pairing is auto-approved for direct local loopback connects to keep
  same-host clients smooth.
- OpenClaw also has a narrow backend/container-local self-connect path for
  trusted shared-secret helper flows.
- Tailnet and LAN connects, including same-host tailnet binds, are treated as
  remote for pairing and still need approval.
- Forwarded-header evidence on a loopback request disqualifies loopback
  locality. Metadata-upgrade auto-approval is scoped narrowly. See
  [Gateway pairing](/gateway/pairing) for both rules.

认证模式：

- `gateway.auth.mode: "token"`：共享承载令牌（大多数情况推荐）。
- `gateway.auth.mode: "password"`：口令认证（推荐通过环境变量 `OPENCLAW_GATEWAY_PASSWORD` 设定）。
- `gateway.auth.mode: "trusted-proxy"`：信任身份感知反向代理进行认证，代理通过头传递身份（参考 [可信代理认证](/gateway/trusted-proxy-auth)）。

令牌/密码轮换核查：

1. 生成/设置新密钥（`gateway.auth.token` 或 `OPENCLAW_GATEWAY_PASSWORD`）。
2. 重启网关（或由 macOS app 守护时重启应用）。
3. 更新所有远程客户端（`gateway.remote.token` / `.password`）。
4. 验证旧凭据已不可用。

### Tailscale Serve 身份头

当 `gateway.auth.allowTailscale` 为 `true`（Serve 默认）时，OpenClaw 接受 Tailscale Serve 身份头（`tailscale-user-login`）用于控制 UI/WebSocket 认证。OpenClaw 通过本地 Tailscale 守护进程（`tailscale whois`）解析 `x-forwarded-for` 地址并与头匹配来验证身份。这仅针对命中环回并包含由 Tailscale 注入的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 的请求触发。
对于此异步身份检查路径，同一 `{scope, ip}` 的失败尝试在限制器记录失败之前会序列化。来自一个 Serve 客户端的并发错误重试因此可以立即锁定第二次尝试，而不是作为两个普通不匹配竞争通过。
HTTP API 端点（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）**不**使用 Tailscale 身份头认证。它们仍遵循网关配置的 HTTP 认证模式。

重要边界：

- 网关 HTTP bearer 认证实际上是全有或全无的操作员访问。
- 将能够调用 `/v1/chat/completions`、`/v1/responses` 或 `/api/channels/*` 的凭据视为该网关的完全访问操作员秘密。
- 在 OpenAI 兼容的 HTTP 表面上，共享密钥 bearer 认证恢复完整的默认操作员范围（`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`）和代理轮次的拥有者语义；较窄的 `x-openclaw-scopes` 值不会减少该共享密钥路径。
- HTTP 上的每请求范围语义仅当请求来自承载身份的模式（如可信代理认证或私有入口上的 `gateway.auth.mode="none"`）时才适用。
- 在这些承载身份的模式中，省略 `x-openclaw-scopes` 会回退到正常的操作员默认范围集；当你想要较窄的范围集时，请显式发送该头。
- `/tools/invoke` 遵循相同的共享密钥规则：令牌/密码 bearer 认证在那里也被视为完全操作员访问，而承载身份的模式仍尊重声明的范围。
- 不要与不可信的调用者共享这些凭据；每个信任边界优先使用单独的网关。

**信任假设：** 无令牌 Serve 认证假设网关主机是可信的。不要将其视为针对敌对同主机进程的保护。如果不可信的本地代码可能在网关主机上运行，请禁用 `gateway.auth.allowTailscale` 并要求使用 `gateway.auth.mode: "token"` 或 `"password"` 进行显式共享密钥认证。

**安全规则：** 不要从你自己的反向代理转发这些头。如果你在网关前面终止 TLS 或代理，请禁用 `gateway.auth.allowTailscale` 并使用共享密钥认证（`gateway.auth.mode: "token"` 或 `"password"`）或 [可信代理认证](/gateway/trusted-proxy-auth) 代替。

可信代理：

- 若代理终止 TLS，配置 `gateway.trustedProxies` 为代理 IP。
- OpenClaw 仅从可信代理 IP 信任 `x-forwarded-for`（及 `x-real-ip`）辨识客户端 IP，用于本地配对校验及认证。
- 确保代理覆盖 `x-forwarded-for` 并阻断直连网关端口。

详情参见 [Tailscale](/gateway/tailscale) 和 [Web 概览](/web)。

### 通过节点主机进行浏览器控制（推荐）

网关若远程，浏览器在别处运行，建议在浏览器主机运行**节点主机**，让网关代理浏览器操作（见 [浏览器工具](/tools/browser)）。

视节点配对如管理员访问。

推荐做法：

- 让网关和节点主机处于同一 tailnet。
- 故意配对节点；不需要时禁用浏览器代理路由。

应避免：

### 磁盘上的秘密

假设 `~/.openclaw/`（或 `$OPENCLAW_STATE_DIR/`）内所有内容均含敏感或私人数据：

- `openclaw.json`: 配置可能包含令牌（网关、远程网关）、提供者设置和允许列表。
- `credentials/**`: 渠道凭证（例如：WhatsApp 凭证）、配对允许列表、遗留 OAuth 导入。
- `agents/<agentId>/agent/auth-profiles.json`: API 密钥、令牌配置文件、OAuth 令牌，以及可选的 `keyRef`/`tokenRef`。
- `secrets.json`（可选）：由 `file` SecretRef 提供者（`secrets.providers`）使用的基于文件的秘密负载。
- `agents/<agentId>/agent/auth.json`: 遗留兼容性文件。发现静态 `api_key` 条目时会被清除。
- `agents/<agentId>/sessions/**`: 会话转录（`*.jsonl`）+ 路由元数据（`sessions.json`），可能包含私人消息和工具输出。
- 捆绑插件包：已安装的插件（及其 `node_modules/`）。
- `sandboxes/**`: 工具沙箱工作区；可能积累你在沙箱内读/写的文件副本。

加固建议：

- 维持紧权限（目录 700，文件 600）。
- 使用全磁盘加密。
- 若主机多人共享，优先为网关使用专用操作系统用户。

### 工作区 `.env` 文件

OpenClaw 会为代理和工具加载工作区本地的 `.env` 文件，但绝不会让这些文件静默覆盖网关运行时控制。

- 任何以 `OPENCLAW_*` 开头的键都会被不受信任的工作区 `.env` 文件阻止。
- Matrix、Mattermost、IRC 和 Synology Chat 的渠道端点设置也会被工作区 `.env` 覆盖阻止，因此克隆的工作区不能通过本地端点配置重定向捆绑连接器流量。端点环境变量键（例如 `MATRIX_HOMESERVER`、`MATTERMOST_URL`、`IRC_HOST`、`SYNOLOGY_CHAT_INCOMING_URL`）必须来自网关进程环境或 `env.shellEnv`，不能来自工作区加载的 `.env`。
- 该阻止是失败关闭的：未来版本中新添加的运行时控制变量不能从已提交或攻击者提供的 `.env` 中继承；该键会被忽略，网关保留其自身的值。
- 受信任的进程/操作系统环境变量（网关自身的 shell、launchd/systemd 单元、app bundle）仍然适用——这仅限制 `.env` 文件加载。

原因：工作区 `.env` 文件经常与代理代码放在一起、会被误提交，或被工具写入。屏蔽整个 `OPENCLAW_*` 前缀意味着，之后新增任何 `OPENCLAW_*` 标志，也绝不可能因为工作区状态而静默继承，从而退化安全性。

### 日志与转录（脱敏与保留）

日志与转录可能泄露敏感信息，即使访问控制正确：

- 网关日志含工具摘要、错误与 URL。
- 会话转录含粘贴密钥、文件内容、命令输出和链接。

建议：

- 保持日志和转录脱敏开启（`logging.redactSensitive: "tools"`；默认）。
- 通过 `logging.redactPatterns` 为你的环境添加自定义模式（令牌、主机名、内部 URL）。
- 分享诊断信息时，优先使用 `openclaw status --all`（可直接粘贴，已脱敏秘密）而不是原始日志。
- 如果不需要长期保留，请清理旧会话转录和日志文件。

详见：[日志](/gateway/logging)

### DM：默认通过配对

```json5
{
  channels: { whatsapp: { dmPolicy: "pairing" } },
}
```

### 群组：始终要求提及

```json
{
  "channels": {
    "whatsapp": {
      "groups": {
        "*": { "requireMention": true }
      }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "groupChat": { "mentionPatterns": ["@openclaw", "@mybot"] }
      }
    ]
  }
}
```

群组聊天仅在显式提及时响应。

### 分离号码（WhatsApp、Signal、Telegram）

对于基于电话号码的渠道，考虑将你的 AI 运行在与个人号码分离的电话号码上：

- 个人号：保留私人对话
- 机器人号：AI 处理业务，有适当边界

### 只读模式（通过沙箱和工具）

你可以通过组合以下方式构建只读配置文件：

- `agents.defaults.sandbox.workspaceAccess: "ro"`（或 `"none"` 禁止工作区访问）
- 阻止 `write`、`edit`、`apply_patch`、`exec`、`process` 等工具的允许/拒绝列表。

其他加固选项：

- 默认 `tools.exec.applyPatch.workspaceOnly: true`：确保 `apply_patch` 不写工作区外文件，即便不启沙箱。如需覆盖设为 `false`。
- 可选启用 `tools.fs.workspaceOnly: true`：限制文件路径和图片自动加载至工作区（适合允许绝对路径时做单一防线）。
- 限制文件系统根路径范围，避免工作区路径过广（如家目录），防止敏感文件暴露给工具。

### 安全基线（可复制粘贴）

保持网关私密，启用 DM 配对，禁用群组“常开”机器人：

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    port: 18789,
    auth: { mode: "token", token: "your-long-random-token" },
  },
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

需更安全工具执行可加沙箱并拒绝危险工具（见“按代理访问配置”示例）。

默认聊天驱动代理轮转时，非拥有者无法使用 `cron` 或 `gateway` 工具。

## 沙箱（推荐）

专门文档：[沙箱](/gateway/sandboxing)

两种互补方式：

- **在 Docker 中运行完整 Gateway**（容器边界）：[Docker](/install/docker)
- **工具沙箱**（`agents.defaults.sandbox`，主机 gateway + 沙箱隔离工具；Docker 是默认后端）：[沙箱](/gateway/sandboxing)

注意：避免代理间权限泄漏，`agents.defaults.sandbox.scope` 保持 `"agent"`（默认）或 `"session"`（更严格的会话隔离）。`scope: "shared"` 使用单容器/工作区。

还可配置代理对工作区访问控制：

- `agents.defaults.sandbox.workspaceAccess: "none"`（默认）禁止访问代理工作区；工具在 `~/.openclaw/sandboxes` 下的沙箱工作区中运行
- `agents.defaults.sandbox.workspaceAccess: "ro"` 将代理工作区以只读方式挂载到 `/agent`（禁用 `write`/`edit`/`apply_patch`）
- `agents.defaults.sandbox.workspaceAccess: "rw"` 将代理工作区以读写方式挂载到 `/workspace`
- 额外的 `sandbox.docker.binds` 会针对标准化和规范化的源路径进行验证。如果父级符号链接技巧和规范化的主目录别名解析到被阻止的根目录（如 `/etc`、`/var/run` 或操作系统主目录下的凭据目录），仍然会失败并关闭。

**重要：**`tools.elevated` 是全局基线逃生通道，用于在沙箱外运行 exec。默认有效主机为 `gateway`，当 exec 目标配置为 `node` 时为 `node`。保持 `tools.elevated.allowFrom` 严格，不要为陌生人启用它。你可以通过 `agents.list[].tools.elevated` 进一步限制每个代理的提升权限。参见 [提升模式](/tools/elevated)。

### 子代理委托防护

允许会话工具时，视子代理调用为额外边界选择：

- 除非代理确实需要委托，否则拒绝 `sessions_spawn`。
- 将 `agents.defaults.subagents.allowAgents` 和任何每个代理的 `agents.list[].subagents.allowAgents` 覆盖限制为已知安全的目标代理。
- 对于任何必须保持沙箱化的工作流，使用 `sandbox: "require"` 调用 `sessions_spawn`（默认为 `inherit`）。
- 当目标子运行时未沙箱化时，`sandbox: "require"` 会快速失败。

## 浏览器控制风险

启用浏览器控制后，模型能驱动真实浏览器。浏览器用户配置文件若含登录信息，模型可访问账户及数据。请将浏览器配置视为**敏感状态**：

- 优先为代理使用专用配置文件（默认的 `openclaw` 配置文件）。
- 避免将代理指向你的个人日常使用的配置文件。
- 除非你信任沙箱代理，否则保持主机浏览器控制禁用。
- 独立的环回浏览器控制 API 仅认可共享密钥认证（网关令牌 bearer 认证或网关密码）。它不使用 trusted-proxy 或 Tailscale Serve 身份头。
- 将浏览器下载视为不可信输入；优先使用隔离的下载目录。
- 如果可能，在代理配置文件中禁用浏览器同步/密码管理器（减少爆炸半径）。
- 对于远程网关，假设“浏览器控制”等同于对该配置文件可访问内容的“操作员访问”。
- 保持 Gateway 和节点主机仅限 tailnet；避免将浏览器控制端口暴露给局域网或公共互联网。
- 不需要时禁用浏览器代理路由（`gateway.nodes.browser.mode="off"`）。
- Chrome MCP 现有会话模式**不**“更安全”；它可以作为你在该主机 Chrome 配置文件可访问的任何地方行事。

### 浏览器 SSRF 策略（默认严格）

OpenClaw 的浏览器导航策略默认严格：除非你明确选择加入，否则私有/内部目标保持阻止。

- 默认：`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 未设置，因此浏览器导航保持阻止私有/内部/特殊用途目标。
- 遗留别名：`browser.ssrfPolicy.allowPrivateNetwork` 仍被接受以保持兼容性。
- 选择加入模式：设置 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 以允许私有/内部/特殊用途目标。
- 在严格模式下，使用 `hostnameAllowlist`（如 `*.example.com` 的模式）和 `allowedHostnames`（确切的主机例外，包括被阻止的名称如 `localhost`）进行明确例外。
- 导航在请求前进行检查，并在导航后的最终 `http(s)` URL 上进行尽力重新检查，以减少基于重定向的透视攻击。

示例严格配置：

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"],
    },
  },
}
```

## 按代理访问配置（多代理）

多代理路由环境下，每个代理可有独立沙箱和工具策略，可赋予**完全访问**、**只读**或**无访问**。详见 [多代理沙箱与工具](/tools/multi-agent-sandbox-tools) 及优先级规则。

常用场景：

- 个人代理：完全访问，关闭沙箱
- 家庭/工作代理：沙箱 + 只读工具
- 公众代理：沙箱 + 禁用文件系统/shell 工具

### 示例：完全访问（无沙箱）

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

### 示例：只读工具 + 工作区只读

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "ro",
        },
        tools: {
          allow: ["read"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

### 示例：无文件系统/shell 访问（允许提供者消息）

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "none",
        },
        // 会话工具可能泄露私密信息。默认限制为当前会话及子代理会话，可进一步限制。
        // 见配置参考中 `tools.sessions.visibility`。
        tools: {
          sessions: { visibility: "tree" }, // self | tree | agent | all
          allow: [
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
            "whatsapp",
            "telegram",
            "slack",
            "discord",
          ],
          deny: [
            "read",
            "write",
            "edit",
            "apply_patch",
            "exec",
            "process",
            "browser",
            "canvas",
            "nodes",
            "cron",
            "gateway",
            "image",
          ],
        },
      },
    ],
  },
}
```

## 事件响应

AI 出状况时：

### 遏制

1. **停止其运行：** 停止 macOS 应用（若其守护网关）或终止 `openclaw gateway` 进程。
2. **关闭暴露：** 设置 `gateway.bind: "loopback"`（或禁用 Tailscale Funnel/Serve），直至排查。
3. **冻结访问：** 危险的 DM/群组改为 `dmPolicy: "disabled"` / 要求提及，移除 `"*"` 等开放白名单。

### 轮换（若秘密泄漏，视为已失陷）

1. 轮换网关认证（`gateway.auth.token` / `OPENCLAW_GATEWAY_PASSWORD`）并重启。
2. 轮换任何能调用网关的远程客户端密钥（`gateway.remote.token` / `.password`）。
3. 轮换提供者/API 凭据（WhatsApp 凭据、Slack/Discord 令牌、`auth-profiles.json` 中的模型/API 密钥、加密秘密载荷等）。

### 审计

1. 检查网关日志：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（或 `logging.file`）。
2. 审阅相关转录：`~/.openclaw/agents/<agentId>/sessions/*.jsonl`。
3. 审核近期配置变更（可能扩大访问的：`gateway.bind`、`gateway.auth`、DM/群策略、`tools.elevated`、插件变更）。
4. 重新运行 `openclaw security audit --deep` 确认未留关键漏洞。

### 收集报告材料

- 时间戳、网关主机 OS + OpenClaw 版本
- 相关会话转录 + 简短日志片段（脱敏后）
- 攻击者消息及代理动作
- 网关是否暴露非环回接口（LAN/Tailscale Funnel/Serve）

## 使用 detect-secrets 进行密钥扫描

CI 在 `secrets` 任务中运行 `detect-secrets` pre-commit 钩子。

推送到 `main` 分支时总是会进行全文件扫描。拉取请求在有基础提交时会使用变更文件的快速路径，否则会回退到全文件扫描。如果扫描失败，说明有新的候选项尚未加入基线。

### CI 失败时

1. 本地复现：

   ```bash
   pre-commit run --all-files detect-secrets
   ```

2. 了解这些工具：
   - 在 pre-commit 中，`detect-secrets` 会使用仓库的基线和排除项运行 `detect-secrets-hook`。
   - `detect-secrets audit` 会打开一个交互式审查界面，用于将每个基线项标记为真实或误报。
3. 对于真正的秘密：轮换/删除它们，然后重新运行扫描以更新基线。
4. 对于误报：运行交互式审核并将它们标记为误报：

   ```bash
   detect-secrets audit .secrets.baseline
   ```

5. 若需新增排除规则，编辑 `.detect-secrets.cfg` 并配合 `--exclude-files` / `--exclude-lines` 重新生成基线（配置文件仅参考，detect-secrets 不自动读取）。

更新后的 `.secrets.baseline` 推送至仓库。

## 报告安全问题

发现 OpenClaw 漏洞？请负责任报告：

1. 邮件：[security@openclaw.ai](mailto:security@openclaw.ai)
2. 修复前勿公开发布
3. 我们会致谢你（除非你选择匿名）
