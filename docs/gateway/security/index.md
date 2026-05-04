---
summary: "在具有 shell 访问权限的 AI 网关上运行时的安全注意事项和威胁模型"
read_when:
  - 添加会扩大访问或自动化能力的功能时
title: "安全"
---

<Warning>
  **个人助手信任模型。** 本指南假设每个网关只有一个受信任的
  操作员边界（单用户、个人助手模型）。OpenClaw **不是** 面向多个
  对抗性用户共享同一个代理或网关的恶意多租户安全边界。如果你需要
  混合信任或对抗性用户运行方式，请拆分信任边界（单独的网关 +
  凭据，最好再配合独立的 OS 用户或主机）。
</Warning>

## 先看范围：个人助手安全模型

OpenClaw 的安全指南假设一种 **个人助手** 部署：一个受信任的操作员边界，可能有多个代理。

- 支持的安全姿态：每个网关一个用户/信任边界（最好每个边界使用一个 OS 用户/主机/VPS）。
- 不支持的安全边界：多个互不信任或对抗性用户共享一个网关/代理。
- 如果需要对抗性用户隔离，请按信任边界拆分（单独的网关 + 凭据，最好再配合独立的 OS 用户/主机）。
- 如果多个不受信任的用户可以向一个启用了工具的代理发送消息，请将他们视为在共享该代理同一份委托工具权限。

本页说明的是在 **该模型内** 的加固方法。它并不声称在一个共享网关上实现敌对多租户隔离。

## 快速检查：`openclaw security audit`

另见：[形式化验证（安全模型）](/security/formal-verification)

请定期运行此命令（尤其是在更改配置或暴露网络面之后）：

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

`security audit --fix` 的范围刻意保持很窄：它会把常见的开放组策略切换为允许列表，恢复 `logging.redactSensitive: "tools"`，收紧 state/config/include-file 的权限，并且在 Windows 上运行时会使用 Windows ACL 重置而不是 POSIX `chmod`。

它会标记常见的踩坑点（网关认证暴露、浏览器控制暴露、过宽的允许列表、文件系统权限、过于宽松的 exec 审批，以及开放通道的工具暴露）。

OpenClaw 既是产品也是实验：你正在把前沿模型行为接入真实的消息入口和真实工具。**不存在“绝对安全”的配置。** 目标是明确地决定：

- 谁可以和你的机器人对话
- 机器人被允许在哪里执行动作
- 机器人可以触碰什么

先从仍然可用的最小权限开始，然后在建立信心后逐步放宽。

### 部署与主机信任

OpenClaw 假定主机和配置边界是受信任的：

- 如果有人可以修改 Gateway 主机状态/配置（`~/.openclaw`，包括 `openclaw.json`），请将其视为受信任的操作员。
- 为多个互不信任/对抗性操作员运行一个 Gateway **不是推荐的部署方式**。
- 对于混合信任团队，请通过独立的网关来拆分信任边界（或至少使用独立的 OS 用户/主机）。
- 推荐默认：每台机器/主机（或 VPS）一个用户，该用户一个网关，并在该网关中运行一个或多个代理。
- 在单个 Gateway 实例内，经过认证的操作员访问属于受信任的控制平面角色，而不是按用户划分的租户角色。
- 会话标识符（`sessionKey`、session IDs、labels）是路由选择器，不是授权令牌。
- 如果几个人都可以向同一个启用了工具的代理发消息，那么他们每个人都可能驱动那一组相同的权限。按用户划分的 session/memory 隔离有助于隐私，但不会把共享代理变成按用户划分的主机授权。

### 共享 Slack 工作区：真实风险

如果“Slack 里的所有人都能给机器人发消息”，核心风险就是委托工具权限：

- 任何被允许的发送者都可以在代理策略范围内诱导工具调用（`exec`、浏览器、网络/文件工具）；
- 来自某个发送者的提示词/内容注入，可能导致影响共享状态、设备或输出的动作；
- 如果一个共享代理持有敏感凭据/文件，任何被允许的发送者都可能通过工具使用来驱动数据外泄。

团队工作流请使用分离的代理/网关并尽量减少工具；个人数据代理请保持私密。

### 公司共享代理：可接受的模式

当使用该代理的所有人都在同一个信任边界内（例如同一个公司团队），并且代理严格限定在业务范围内时，这是可接受的。

- 在专用机器/VM/容器上运行；
- 为该运行时使用专用 OS 用户 + 专用浏览器/配置文件/账号；
- 不要在该运行时登录个人 Apple/Google 账号，或个人密码管理器/浏览器配置文件。

如果你在同一运行时混用个人和公司身份，你就会破坏隔离并增加个人数据暴露风险。

## Gateway 和 node 的信任概念

将 Gateway 和 node 视为同一个操作员信任域，但角色不同：

- **Gateway** 是控制平面和策略面（`gateway.auth`、工具策略、路由）。
- **Node** 是与该 Gateway 配对的远程执行面（命令、设备动作、主机本地能力）。
- 经过 Gateway 认证的调用方在 Gateway 范围内是受信任的。配对完成后，node 动作属于该 node 上受信任的操作员动作。
- 操作员作用域级别和审批时检查在 [操作员作用域](/gateway/operator-scopes) 中有总结。
- 使用共享 gateway token/password 认证的直接 loopback 后端客户端，可以在不提供用户设备身份的情况下执行内部控制平面 RPC。这不是远程或浏览器配对绕过：网络客户端、node 客户端、device-token 客户端和显式设备身份仍然要经过配对和作用域升级强制检查。
- `sessionKey` 是路由/上下文选择，不是按用户认证。
- Exec 审批（允许列表 + 询问）是操作员意图的护栏，不是恶意多租户隔离。
- OpenClaw 对受信任的单操作员设置的产品默认值是：`gateway`/`node` 上的主机 exec 允许在没有审批提示的情况下运行（`security="full"`、`ask="off"`，除非你收紧它）。这个默认值是有意的 UX 设计，本身不是漏洞。
- Exec 审批绑定的是精确的请求上下文和尽力而为的本地文件操作数；它们不会在语义上建模每一种运行时/解释器加载路径。要获得强边界，请使用沙箱和主机隔离。

如果你需要对抗性用户隔离，请按 OS 用户/主机拆分信任边界并运行独立的网关。

## 信任边界矩阵

当你评估风险时，可将此作为快速模型：

| 边界或控制项                                              | 含义                                              | 常见误解                                                                     |
| --------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `gateway.auth`（token/password/trusted-proxy/device auth） | 对网关 API 的调用方进行认证                        | “要靠每一帧都做消息签名才算安全”                                               |
| `sessionKey`                                              | 用于上下文/session 选择的路由键                    | “session key 是用户认证边界”                                                 |
| 提示词/内容防护栏                                         | 降低模型滥用风险                                  | “仅靠 prompt injection 就能证明认证绕过”                                      |
| `canvas.eval` / browser evaluate                          | 启用时的有意操作员能力                            | “任何 JS eval 原语在该信任模型下都自动是漏洞”                                 |
| 本地 TUI `!` shell                                       | 明确由操作员触发的本地执行                          | “本地 shell 便捷命令就是远程注入”                                             |
| Node 配对与 node 命令                                     | 在已配对设备上的操作员级远程执行                   | “默认应把远程设备控制视为不受信任的用户访问”                                  |
| `gateway.nodes.pairing.autoApproveCidrs`                  | 面向受信网络的 node 加入策略（需显式开启）         | “默认禁用的允许列表就是自动配对漏洞”                                           |

## 按设计不属于漏洞的情况

<Accordion title="常见但超出范围的发现">

这些模式经常被报告，但除非证明了真实的边界绕过，否则通常会被关闭为无需处理：

- 仅有 prompt injection 的链路，而没有策略、认证或沙箱绕过。
- 以敌对多租户方式在一个共享主机或配置上运行的假设。
- 将正常操作员读路径访问（例如 `sessions.list` / `sessions.preview` / `chat.history`）在共享网关设置下误判为 IDOR 的报告。
- 仅限本地主机的部署发现（例如仅 loopback 网关上的 HSTS）。
- 针对本仓库中并不存在的入站路径的 Discord 入站 webhook 签名发现。
- 将 node 配对元数据当作 `system.run` 的隐藏第二层逐命令审批的报告，而实际执行边界仍然是网关的全局 node 命令策略加上 node 自身的 exec 审批。
- 将已配置的 `gateway.nodes.pairing.autoApproveCidrs` 本身视为漏洞的报告。该设置默认禁用，要求显式的 CIDR/IP 条目，只适用于首次 `role: node` 配对且没有请求 scopes 的情况，并且不会自动批准操作员/浏览器/Control UI、WebChat、角色升级、scope 升级、元数据变更、公钥变更，或同主机 loopback trusted-proxy 头路径，除非显式启用了 loopback trusted-proxy auth。
- 将 `sessionKey` 当作认证令牌而提出的“缺少按用户授权”发现。

</Accordion>

## 60 秒加固基线

先使用这个基线，然后按受信任代理逐个选择性地重新启用工具：

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
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"],
    fs: { workspaceOnly: true },
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
  channels: {
    whatsapp: { dmPolicy: "pairing", groups: { "*": { requireMention: true } } },
  },
}
```

这会让 Gateway 仅本地可用，隔离 DMs，并默认禁用控制平面/运行时工具。

## 共享收件箱快速规则

如果不止一人可以向你的机器人发送私信：

- 将 `session.dmScope: "per-channel-peer"`（多账号频道则使用 `"per-account-channel-peer"`）。
- 保持 `dmPolicy: "pairing"` 或严格的允许列表。
- 绝不要把共享私信与宽泛的工具访问权限组合在一起。
- 这会增强协作/共享收件箱的安全性，但并不是为了在用户共享主机/配置写入权限时实现恶意共租户隔离。

## 上下文可见性模型

OpenClaw 将两个概念分开：

- **触发授权**：谁可以触发代理（`dmPolicy`、`groupPolicy`、允许列表、提及门控）。
- **上下文可见性**：哪些补充上下文会被注入到模型输入中（回复正文、引用文本、线程历史、转发元数据）。

允许列表会对触发和命令授权进行门控。`contextVisibility` 设置控制补充上下文（引用回复、线程根、获取的历史）如何被过滤：

- `contextVisibility: "all"`（默认）会按接收到的原样保留补充上下文。
- `contextVisibility: "allowlist"` 会将补充上下文过滤为仅来自当前允许列表检查所允许的发送者。
- `contextVisibility: "allowlist_quote"` 的行为类似 `allowlist`，但仍会保留一条显式引用回复。

按频道或按房间/会话设置 `contextVisibility`。有关设置细节，请参见 [群聊](/channels/groups#context-visibility-and-allowlists)。

建议性的分流处理指引：

- 仅显示“模型可以看到来自未加入允许列表发送者的引用或历史文本”的主张，属于可通过 `contextVisibility` 修复的加固项，而不是认证或沙箱边界绕过本身。
- 若要构成安全影响，报告仍需要证明存在信任边界绕过（认证、策略、沙箱、批准或其他已文档化边界）。

## 审计检查内容（高层概述）

- **入站访问**（DM 策略、群组策略、允许列表）：陌生人能否触发机器人？
- **工具影响范围**（高权限工具 + 开放房间）：提示注入是否会演变为 shell/文件/网络操作？
- **执行批准偏移**（`security=full`、`autoAllowSkills`、未启用 `strictInlineEval` 的解释器允许列表）：主机执行保护措施是否仍按你的预期工作？
  - `security="full"` 是一种宽泛的姿态警告，并不等于发现了 bug。它是受信任个人助理场景所选用的默认值；只有当你的威胁模型需要批准或允许列表保护时，才应收紧它。
- **网络暴露**（Gateway 绑定/认证、Tailscale Serve/Funnel、薄弱/过短的认证令牌）。
- **浏览器控制暴露**（远程节点、中继端口、远程 CDP 端点）。
- **本地磁盘卫生**（权限、符号链接、配置包含项、“同步文件夹”路径）。
- **插件**（插件在没有显式允许列表的情况下加载）。
- **策略偏移/配置错误**（配置了沙箱 docker 但沙箱模式未开启；`gateway.nodes.denyCommands` 模式无效，因为匹配是精确命令名 בלבד（例如 `system.run`），不会检查 shell 文本；危险的 `gateway.nodes.allowCommands` 条目；全局 `tools.profile="minimal"` 被按代理配置覆盖；在宽松工具策略下可访问插件拥有的工具）。
- **运行时预期偏移**（例如假设隐式执行仍然意味着 `sandbox`，而 `tools.exec.host` 现在默认是 `auto`；或者在沙箱模式关闭时显式设置 `tools.exec.host="sandbox"`）。
- **模型卫生**（当配置的模型看起来较旧时发出警告；不是硬性阻断）。

如果你运行 `--deep`，OpenClaw 还会尽最大努力进行一次实时 Gateway 探测。

## 凭据存储映射

在审计访问或决定需要备份什么时使用：

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**: config/env or `channels.telegram.tokenFile` (regular file only; symlinks rejected)
- **Discord bot token**: config/env or SecretRef (env/file/exec providers)
- **Slack tokens**: config/env (`channels.slack.*`)
- **Pairing allowlists**:
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (default account)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (non-default accounts)
- **Model auth profiles**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Codex runtime state**: `~/.openclaw/agents/<agentId>/agent/codex-home/`
- **File-backed secrets payload (optional)**: `~/.openclaw/secrets.json`
- **Legacy OAuth import**: `~/.openclaw/credentials/oauth.json`

## 安全审计清单

当审计打印出发现项时，请将其视为以下优先级：

1. **任何“开放”且启用了工具**：先锁定 DMs/群组（pairing/允许列表），然后收紧工具策略/沙箱。
2. **公开网络暴露**（LAN 绑定、Funnel、缺少认证）：立即修复。
3. **浏览器控制的远程暴露**：将其视为操作员访问（仅限 tailnet、有意配对节点、避免公开暴露）。
4. **权限**：确保状态/配置/凭据/认证不对组或所有人可读。
5. **插件**：只加载你明确信任的内容。
6. **模型选择**：对于任何带工具的机器人，优先选择现代、抗指令注入的模型。

## 安全审计术语表

每个审计发现都通过结构化的 `checkId` 标识（例如
`gateway.bind_no_auth` 或 `tools.exec.security_full_configured`）。常见
的严重级别类别：

- `fs.*` — 文件系统权限，涉及状态、配置、凭据、认证配置文件。
- `gateway.*` — 绑定模式、认证、Tailscale、Control UI、受信任代理设置。
- `hooks.*`、`browser.*`、`sandbox.*`、`tools.exec.*` — 各表面的加固。
- `plugins.*`、`skills.*` — 插件/技能供应链和扫描发现项。
- `security.exposure.*` — 访问策略与工具影响范围交汇的横切检查。

完整目录、严重性级别、修复键和自动修复支持请参见
[安全审计检查](/gateway/security/audit-checks)。

## 通过 HTTP 访问 Control UI

Control UI 需要一个**安全上下文**（HTTPS 或 localhost）来生成设备
身份。`gateway.controlUi.allowInsecureAuth` 是一个本地兼容性开关：

- 在 localhost 上，当页面通过非安全 HTTP 加载时，它允许 Control UI 在没有设备身份的情况下进行认证。
- 它不会绕过配对检查。
- 它不会放宽远程（非 localhost）设备身份要求。

优先使用 HTTPS（Tailscale Serve）或在 `127.0.0.1` 上打开 UI。

仅限紧急破窗场景，`gateway.controlUi.dangerouslyDisableDeviceAuth`
会完全禁用设备身份检查。这是严重的安全降级；
除非你正在积极调试且可以快速回退，否则应保持关闭。

与这些危险标志分开，成功的 `gateway.auth.mode: "trusted-proxy"`
可以在没有设备身份的情况下接纳**操作员**的 Control UI 会话。这是一种
有意的认证模式行为，而不是 `allowInsecureAuth` 的快捷方式，并且它仍然
不会扩展到节点角色的 Control UI 会话。

`openclaw security audit` 会在此设置启用时发出警告。

## 不安全或危险标志摘要

当已知的不安全/危险调试开关被启用时，`openclaw security audit` 会抛出 `config.insecure_or_dangerous_flags`。生产环境中请保持这些设置为空。

<AccordionGroup>
  <Accordion title="审计当前跟踪的标志">
    - `gateway.controlUi.allowInsecureAuth=true`
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`
    - `hooks.gmail.allowUnsafeExternalContent=true`
    - `hooks.mappings[<index>].allowUnsafeExternalContent=true`
    - `tools.exec.applyPatch.workspaceOnly=false`
    - `plugins.entries.acpx.config.permissionMode=approve-all`

  </Accordion>

  <Accordion title="配置模式中所有 `dangerous*` / `dangerously*` 键">
    Control UI 和浏览器：

    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth`
    - `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`

    频道名称匹配（内置和插件频道；如适用，也可按
    `accounts.<accountId>` 配置）：

    - `channels.discord.dangerouslyAllowNameMatching`
    - `channels.slack.dangerouslyAllowNameMatching`
    - `channels.googlechat.dangerouslyAllowNameMatching`
    - `channels.msteams.dangerouslyAllowNameMatching`
    - `channels.synology-chat.dangerouslyAllowNameMatching`（插件频道）
    - `channels.synology-chat.dangerouslyAllowInheritedWebhookPath`（插件频道）
    - `channels.zalouser.dangerouslyAllowNameMatching`（插件频道）
    - `channels.irc.dangerouslyAllowNameMatching`（插件频道）
    - `channels.mattermost.dangerouslyAllowNameMatching`（插件频道）

    网络暴露：

    - `channels.telegram.network.dangerouslyAllowPrivateNetwork`（也可按账号配置）

    Sandbox Docker（默认值 + 按代理）：

    - `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`
    - `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`
    - `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin`

  </Accordion>
</AccordionGroup>

## 反向代理配置

如果你在反向代理（nginx、Caddy、Traefik 等）后运行 Gateway，请配置
`gateway.trustedProxies` 以正确处理转发客户端 IP。

当 Gateway 检测到来自**不在** `trustedProxies` 中的地址的代理头时，它将**不会**把这些连接当作本地客户端。若 gateway 认证被禁用，这些连接会被拒绝。这样可防止认证绕过：否则经由代理的连接可能看起来像是来自 localhost，并获得自动信任。

`gateway.trustedProxies` 也会影响 `gateway.auth.mode: "trusted-proxy"`，但该认证模式更严格：

- trusted-proxy 认证**默认在环回源代理上失败并关闭**
- 同主机环回反向代理可以使用 `gateway.trustedProxies` 进行本地客户端检测和转发 IP 处理
- 同主机环回反向代理只有在 `gateway.auth.trustedProxy.allowLoopback = true` 时才能满足 `gateway.auth.mode: "trusted-proxy"`；否则请使用令牌/密码认证

```yaml
gateway:
  trustedProxies:
    - "10.0.0.1" # 反向代理 IP
  # 可选。默认 false。
  # 仅当你的代理无法提供 X-Forwarded-For 时才启用。
  allowRealIpFallback: false
  auth:
    mode: password
    password: ${OPENCLAW_GATEWAY_PASSWORD}
```

当配置了 `trustedProxies` 时，Gateway 会使用 `X-Forwarded-For` 来确定客户端 IP。除非显式设置 `gateway.allowRealIpFallback: true`，否则默认忽略 `X-Real-IP`。

受信任代理头不会自动使节点设备配对获得信任。
`gateway.nodes.pairing.autoApproveCidrs` 是一个单独的、默认禁用的
操作员策略。即使启用，基于环回源的受信任代理头路径也会被排除在节点自动批准之外，因为本地调用者可以伪造这些头，包括在显式启用环回受信任代理认证时也是如此。

良好的反向代理行为（覆盖传入的转发头）：

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
```

不良的反向代理行为（附加/保留不受信任的转发头）：

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## HSTS 和源站说明

- OpenClaw 网关默认优先使用本地/回环地址。如果你在反向代理处终止 TLS，请在代理面向的 HTTPS 域名上在那里设置 HSTS。
- 如果网关本身终止 HTTPS，你可以将 `gateway.http.securityHeaders.strictTransportSecurity` 设置为从 OpenClaw 响应中发出 HSTS 头。
- 详细的部署指导见 [受信任代理认证](/gateway/trusted-proxy-auth#tls-termination-and-hsts)。
- 对于非回环的 Control UI 部署，默认需要 `gateway.controlUi.allowedOrigins`。
- `gateway.controlUi.allowedOrigins: ["*"]` 是显式的“允许所有浏览器源”的策略，不是加固后的默认值。除非在严格受控的本地测试中，否则应避免使用它。
- 即使启用了通用的回环豁免，基于浏览器源的回环认证失败仍会受到速率限制，但锁定键会按规范化后的 `Origin` 值进行作用域划分，而不是共享同一个 localhost 分组。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用 Host 头来源回退模式；应将其视为一种由操作者选择的危险策略。
- 应将 DNS rebinding 和代理的 Host 头行为视为部署加固问题；保持 `trustedProxies` 严格，并避免将网关直接暴露到公共互联网。

## 本地会话日志保存在磁盘上

OpenClaw 会将会话转录内容存储在磁盘上的 `~/.openclaw/agents/<agentId>/sessions/*.jsonl` 下。
这是维持会话连续性以及（可选）会话记忆索引所必需的，但这也意味着
**任何具有文件系统访问权限的进程/用户都可以读取这些日志**。应将磁盘访问视为信任
边界，并锁定 `~/.openclaw` 上的权限（见下方审计部分）。如果你需要
在不同 agent 之间实现更强隔离，请让它们运行在不同的 OS 用户或不同主机上。

## 节点执行（system.run）

如果已配对 macOS 节点，网关可以在该节点上调用 `system.run`。这在 Mac 上属于**远程代码执行**：

- 需要节点配对（批准 + token）。
- 网关节点配对不是逐命令的审批界面。它建立的是节点身份/信任和 token 签发。
- 网关通过 `gateway.nodes.allowCommands` / `denyCommands` 施加粗粒度的全局节点命令策略。
- 在 Mac 上通过 **Settings → Exec approvals** 控制（security + ask + allowlist）。
- 每个节点的 `system.run` 策略是该节点自己的 exec approvals 文件（`exec.approvals.node.*`），它可以比网关的全局 command-ID 策略更严格或更宽松。
- 以 `security="full"` 且 `ask="off"` 运行的节点，遵循的是默认的受信任操作者模型。除非你的部署明确要求更严格的审批或 allowlist 策略，否则应将其视为预期行为。
- 审批模式会绑定精确的请求上下文，并在可能时绑定一个具体的本地脚本/文件操作数。如果 OpenClaw 无法为解释器/运行时命令准确识别出唯一一个直接本地文件，则会拒绝基于审批的执行，而不是假装有完整的语义覆盖。
- 对于 `host=node`，基于审批的运行还会存储一个规范化的已准备好 `systemRunPlan`；之后已批准的转发会复用该存储的计划，网关验证会拒绝在审批请求创建后对命令/cwd/session 上下文所做的调用方编辑。
- 如果你不想要远程执行，请将 security 设置为 **deny** 并移除该 Mac 的节点配对。

这个区别对排查很重要：

- 一个重新连接的配对节点如果上报了不同的命令列表，只要网关全局策略和节点本地 exec approvals 仍然强制执行真实的执行边界，这本身并不构成漏洞。
- 将节点配对元数据视为第二层隐藏的逐命令审批层的报告，通常是策略/UX 混淆，而不是安全边界绕过。

## 动态技能（watcher / 远程节点）

OpenClaw 可以在会话中途刷新技能列表：

- **Skills watcher**：对 `SKILL.md` 的更改可以在下一个 agent 回合更新技能快照。
- **远程节点**：连接 macOS 节点后，macOS 专用技能可能变为可用（基于 bin 探测）。

请将技能文件夹视为**受信任代码**，并限制谁可以修改它们。

## 威胁模型

你的 AI 助手可以：

- 执行任意 shell 命令
- 读写文件
- 访问网络服务
- 向任何人发送消息（如果你给它 WhatsApp 访问权限）

给你发消息的人可以：

- 试图诱骗你的 AI 去做坏事
- 通过社工手段获取你的数据访问权
- 探测基础设施细节

## 核心概念：先做访问控制，再谈智能

这里的大多数故障都不是高明的漏洞利用——而是“有人给 bot 发了消息，然后 bot 按他要求做了”。

OpenClaw 的立场：

- **身份优先：** 决定谁可以和 bot 对话（DM 配对 / allowlist / 显式“open”）。
- **范围其次：** 决定 bot 允许在哪些地方行动（群组 allowlist + 提及门控、工具、沙箱、设备权限）。
- **模型最后：** 假设模型可能被操纵；设计时让这种操纵的影响范围有限。

## 命令授权模型

只有来自**已授权发送者**的斜杠命令和指令才会被 स्वीकार。授权来源于
频道 allowlist/配对加上 `commands.useAccessGroups`（见 [配置](/gateway/configuration)
和 [斜杠命令](/tools/slash-commands)）。如果频道 allowlist 为空或包含 `"*"`,
则该频道的命令实际上是开放的。

`/exec` 只是给已授权操作者提供的仅会话便利功能。它**不会**写入配置或
更改其他会话。

## 控制平面工具风险

两个内置工具可以进行持久性的控制平面变更：

- `gateway` 可以用 `config.schema.lookup` / `config.get` 检查配置，并可以用 `config.apply`、`config.patch` 和 `update.run` 进行持久性更改。
- `cron` 可以创建计划任务，并在原始聊天/任务结束后继续运行。

仅限所有者的 `gateway` 运行时工具仍然拒绝重写
`tools.exec.ask` 或 `tools.exec.security`；旧版 `tools.bash.*` 别名在写入前会被
规范化为同样受保护的 exec 路径。
由 agent 驱动的 `gateway config.apply` 和 `gateway config.patch` 编辑默认是
fail-closed 的：只有一小部分提示、模型和提及门控
路径是可由 agent 调整的。因此，新的敏感配置树会受到保护，
除非它们被有意加入 allowlist。

对于任何处理不受信任内容的 agent/界面，默认拒绝这些功能：

```json5
{
  tools: {
    deny: ["gateway", "cron", "sessions_spawn", "sessions_send"],
  },
}
```

`commands.restart=false` 只会阻止重启操作。它不会禁用 `gateway` 配置/更新操作。

## 插件

插件与网关**同进程**运行。请将其视为受信任代码：

- 仅从你信任的来源安装插件。
- 优先使用显式的 `plugins.allow` 允许列表。
- 启用前审查插件配置。
- 插件变更后重启 Gateway。
- 如果你安装或更新插件（`openclaw plugins install <package>`、`openclaw plugins update <id>`），请将其视为运行不受信任的代码：
  - 安装路径是当前插件安装根目录下按插件划分的目录。
  - OpenClaw 会在安装/更新前运行内置的危险代码扫描。`critical` 结果默认会阻止安装。
  - npm 和 git 插件安装仅在显式安装/更新流程中执行包管理器依赖收敛。本地路径和压缩包会被视为自包含的插件包；OpenClaw 会复制/引用它们，而不会运行 `npm install`。
  - 优先使用固定的精确版本（`@scope/pkg@1.2.3`），并在启用前检查磁盘上解压后的代码。
  - `--dangerously-force-unsafe-install` 仅用于插件安装/更新流程中内置扫描的误报“破窗”处理。它不会绕过插件 `before_install` 钩子策略阻断，也不会绕过扫描失败。
  - 由 Gateway 支持的技能依赖安装遵循相同的危险/可疑划分：内置的 `critical` 结果会阻止安装，除非调用方显式设置 `dangerouslyForceUnsafeInstall`，而可疑结果仍然只会发出警告。`openclaw skills install` 仍然是单独的 ClawHub 技能下载/安装流程。

详情： [插件](/tools/plugin)

## DM 访问模型：配对、allowlist、open、disabled

所有当前支持 DM 的频道都支持一种 DM 策略（`dmPolicy` 或 `*.dm.policy`），它会在消息被处理**之前**对传入 DM 进行门控：

- `pairing`（默认）：未知发送者会收到一个简短的配对码，bot 在其获批前会忽略他们的消息。配对码在 1 小时后过期；重复 DM 在创建新的请求之前不会重新发送配对码。默认情况下，待处理请求上限为**每个频道 3 个**。
- `allowlist`：未知发送者会被阻止（没有配对握手）。
- `open`：允许任何人 DM（公开）。**要求**频道 allowlist 包含 `"*"`（显式选择加入）。
- `disabled`：完全忽略传入 DM。

通过 CLI 批准：

```bash
openclaw pairing list <channel>
openclaw pairing approve <channel> <code>
```

详情 + 磁盘文件： [配对](/channels/pairing)

## DM 会话隔离（多用户模式）

默认情况下，OpenClaw 会将**所有 DM 路由到主会话**，这样你的助手可以在不同设备和频道之间保持连续性。如果**多人**都可以给 bot 发 DM（开放 DM 或多人 allowlist），请考虑隔离 DM 会话：

```json5
{
  session: { dmScope: "per-channel-peer" },
}
```

这可以防止跨用户上下文泄漏，同时保持群聊隔离。

这是一种消息上下文边界，不是主机管理员边界。如果用户彼此存在对抗关系并且共享同一个 Gateway 主机/配置，那么应改为在每个信任边界上单独运行 gateway。

### 安全 DM 模式（推荐）

将上面的片段视为**安全 DM 模式**：

- 默认值：`session.dmScope: "main"`（所有 DM 共享一个会话以保持连续性）。
- 本地 CLI onboarding 默认：在未设置时写入 `session.dmScope: "per-channel-peer"`（保留已有的显式值）。
- 安全 DM 模式：`session.dmScope: "per-channel-peer"`（每个频道+发送者对获得独立的 DM 上下文）。
- 跨频道同一对等方隔离：`session.dmScope: "per-peer"`（每个发送者在同类型的所有频道中只对应一个会话）。

如果你在同一频道上运行多个账号，请改用 `per-account-channel-peer`。如果同一个人在多个频道联系你，请使用 `session.identityLinks` 将这些 DM 会话合并为一个规范身份。参见 [会话管理](/concepts/session) 和 [配置](/gateway/configuration)。

## DM 和群组的允许列表

OpenClaw 有两层独立的“谁可以触发我？”机制：

- **DM 允许列表**（`allowFrom` / `channels.discord.allowFrom` / `channels.slack.allowFrom`；旧版：`channels.discord.dm.allowFrom`、`channels.slack.dm.allowFrom`）：哪些人可以在私信中与机器人对话。
  - 当 `dmPolicy="pairing"` 时，批准结果会写入账户范围的配对允许列表存储，位于 `~/.openclaw/credentials/`（默认账户为 `<channel>-allowFrom.json`，非默认账户为 `<channel>-<accountId>-allowFrom.json`），并与配置中的允许列表合并。
- **群组允许列表**（按渠道区分）：机器人将完全接受来自哪些群组/频道/guild 的消息。
  - 常见模式：
    - `channels.whatsapp.groups`、`channels.telegram.groups`、`channels.imessage.groups`：按群组设置默认值，例如 `requireMention`；设置后也会作为群组允许列表（包含 `"*"` 可保持允许全部的行为）。
    - `groupPolicy="allowlist"` + `groupAllowFrom`：限制机器人在群组会话中（WhatsApp/Telegram/Signal/iMessage/Microsoft Teams）可被谁触发。
    - `channels.discord.guilds` / `channels.slack.channels`：按表面层设置允许列表 + 提及默认值。
  - 群组检查按以下顺序运行：先检查 `groupPolicy`/群组允许列表，再检查提及/回复激活。
  - 回复机器人消息（隐式提及）**不会**绕过像 `groupAllowFrom` 这样的发送者允许列表。
  - **安全提示：**将 `dmPolicy="open"` 和 `groupPolicy="open"` 视为最后手段设置。它们应尽量少用；除非你完全信任房间中的每个成员，否则请优先使用 pairing + 允许列表。

详情：[配置](/gateway/configuration) 和 [群组](/channels/groups)

## 提示注入（它是什么，为什么重要）

提示注入是指攻击者构造一条消息，诱使模型做出不安全的事情（例如“忽略你的指令”“导出你的文件系统”“跟随这个链接并运行命令”等）。

即使系统提示很强，**提示注入也没有被彻底解决**。系统提示的防护栏只是一种软性引导；真正的硬性约束来自工具策略、执行审批、沙箱，以及渠道允许列表（而且运营者可以按设计禁用这些）。实践中有效的做法包括：

- 保持传入的私信严格受控（pairing/允许列表）。
- 在群组中优先使用提及门控；避免在公共房间中运行“始终在线”的机器人。
- 默认将链接、附件和粘贴的指令视为不可信内容。
- 在沙箱中运行敏感工具执行；将密钥排除在代理可访问的文件系统之外。
- 注意：沙箱功能是可选启用的。如果沙箱模式关闭，隐式 `host=auto` 会解析为 gateway 主机。显式 `host=sandbox` 仍会失败并关闭，因为没有可用的沙箱运行时。如果你希望这种行为在配置中显式体现，请设置 `host=gateway`。
- 将高风险工具（`exec`、`browser`、`web_fetch`、`web_search`）限制给受信任的代理或显式允许列表。
- 如果你允许列表中的解释器（`python`、`node`、`ruby`、`perl`、`php`、`lua`、`osascript`），请启用 `tools.exec.strictInlineEval`，这样内联 eval 形式仍然需要显式批准。
- Shell 审批分析还会拒绝 **未加引号的 heredoc** 中的 POSIX 参数展开形式（`$VAR`、`$?`、`$$`、`$1`、`$@`、`${…}`），因此允许列表中的 heredoc 内容无法将 shell 展开伪装成普通文本绕过允许列表审查。请将 heredoc 终止符加引号（例如 `<<'EOF'`）以切换为字面量正文语义；任何本应展开变量的未加引号 heredoc 都会被拒绝。
- **模型选择很重要：**较旧/较小/旧版模型对提示注入和工具滥用的抵抗力明显更弱。对于启用工具的代理，请使用当前可用的最强最新一代、经过指令加固的模型。

应视为不可信的红旗信号：

- “阅读这个文件/URL 并照它说的做。”
- “忽略你的系统提示或安全规则。”
- “透露你的隐藏指令或工具输出。”
- “粘贴 ~/.openclaw 或你的日志的完整内容。”

## 外部内容的特殊 token 清理

OpenClaw 会在包装后的外部内容和元数据到达模型之前，去除其中常见的自托管 LLM 聊天模板特殊 token 字面量。覆盖的标记族包括 Qwen/ChatML、Llama、Gemma、Mistral、Phi，以及 GPT-OSS 的角色/轮次 token。

原因：

- 位于自托管模型前端的 OpenAI 兼容后端，有时会保留用户文本中出现的特殊 token，而不是对其进行屏蔽。若攻击者能够写入传入的外部内容（例如获取的网页、邮件正文、文件内容工具输出），就可能注入一个伪造的 `assistant` 或 `system` 角色边界，从而逃逸包装内容的防护栏。
- 清理发生在外部内容包装层，因此它会统一作用于 fetch/read 工具和传入渠道内容，而不是按提供方分别处理。
- 出站模型响应已经有另一层清理器，会在最终渠道交付边界处去除泄漏的 `<tool_call>`、`<function_calls>`、`<system-reminder>`、`<previous_response>` 以及类似的内部运行时支架，从而避免它们出现在用户可见回复中。外部内容清理器则是入站对应机制。

这并不能替代本页中的其他加固措施——`dmPolicy`、允许列表、执行审批、沙箱以及 `contextVisibility` 仍然承担主要工作。它只是关闭了针对自托管栈的一个特定 tokenizer 层绕过手段，该栈会原样转发带特殊 token 的用户文本。

## 不安全的外部内容绕过标志

OpenClaw 包含显式的绕过标志，用于禁用外部内容安全包装：

- `hooks.mappings[].allowUnsafeExternalContent`
- `hooks.gmail.allowUnsafeExternalContent`
- Cron 负载字段 `allowUnsafeExternalContent`

指导建议：

- 在生产环境中保持这些选项未设置/为 false。
- 仅在范围极小的调试场景下临时启用。
- 如果启用，请隔离该代理（沙箱 + 最少工具 + 专用会话命名空间）。

Hooks 风险提示：

- Hook 负载属于不可信内容，即使传递来源是你控制的系统（邮件/文档/网页内容也可能携带提示注入）。
- 较弱的模型层会增加这种风险。对于由 hook 驱动的自动化，请优先使用强大的现代模型层，并将工具策略收紧（`tools.profile: "messaging"` 或更严格），并在可能时启用沙箱。

### 提示注入不需要公开私信

即使**只有你**可以给机器人发消息，提示注入仍然可能通过机器人读取的任意**不可信内容**发生（网页搜索/抓取结果、浏览器页面、邮件、文档、附件、粘贴的日志/代码）。换句话说：发送者并不是唯一的攻击面；**内容本身**也可能携带对抗性指令。

当启用工具时，典型风险是窃取上下文或触发工具调用。你可以通过以下方式降低影响范围：

- 使用只读或禁用工具的 **reader agent** 来总结不可信内容，然后把摘要交给你的主代理。
- 在不需要时关闭 `web_search` / `web_fetch` / `browser`，尤其是对启用工具的代理。
- 对于 OpenResponses 的 URL 输入（`input_file` / `input_image`），设置严格的 `gateway.http.endpoints.responses.files.urlAllowlist` 和 `gateway.http.endpoints.responses.images.urlAllowlist`，并将 `maxUrlParts` 保持较低。空允许列表会被视为未设置；如果你想完全禁用 URL 抓取，请使用 `files.allowUrl: false` / `images.allowUrl: false`。
- 对于 OpenResponses 文件输入，解码后的 `input_file` 文本仍会作为**不可信外部内容**注入。不要因为 Gateway 在本地解码了文件文本，就把它视为可信。即使这条路径省略了更长的 `SECURITY NOTICE:` 横幅，注入块仍然会携带明确的 `<<<EXTERNAL_UNTRUSTED_CONTENT ...>>>` 边界标记以及 `Source: External` 元数据。
- 当媒体理解在把文本附加到媒体提示之前，从附件文档中提取文本时，也会应用相同的基于标记的包装。
- 为任何接触不可信输入的代理启用沙箱和严格的工具允许列表。
- 将密钥放在提示之外；改为通过 gateway 主机上的环境变量/配置传递。

### 自托管 LLM 后端

像 vLLM、SGLang、TGI、LM Studio，或自定义 Hugging Face tokenizer 栈这样的 OpenAI 兼容自托管后端，在处理聊天模板特殊 token 的方式上可能与托管提供方不同。如果某个后端会把诸如 `<|im_start|>`、`<|start_header_id|>` 或 `<start_of_turn>` 这类字面字符串，按用户内容中的结构性聊天模板 token 来分词，那么不可信文本就可能在 tokenizer 层伪造角色边界。

OpenClaw 会在把包装后的外部内容发送给模型之前，去除常见模型家族的特殊 token 字面量。请保持外部内容包装启用，并在可用时优先选择能在用户提供内容中分割或转义特殊 token 的后端设置。像 OpenAI 和 Anthropic 这样的托管提供方已经在请求侧应用了自己的清理。

### 模型强度（安全提示）

不同模型层对提示注入的抵抗力**并不一致**。较小/较便宜的模型通常更容易受到工具滥用和指令劫持的影响，尤其是在对抗性提示下。

<Warning>
对于启用工具的代理，或会读取不可信内容的代理，旧版/较小模型下的提示注入风险通常过高。不要在弱模型层上运行这些工作负载。
</Warning>

建议：

- 对于任何能够运行工具或访问文件/网络的机器人，**使用最新一代、最高层级的模型**。
- 对于启用工具的代理或不可信收件箱，**不要使用旧版/较弱/较小的模型层**；提示注入风险过高。
- 如果必须使用较小模型，**降低影响范围**（只读工具、强沙箱、最小文件系统访问、严格允许列表）。
- 运行小模型时，**为所有会话启用沙箱**，并且**禁用 web_search/web_fetch/browser**，除非输入受到严格控制。
- 对于仅聊天、输入可信且不使用工具的个人助手，较小模型通常没问题。

## 组中的推理和详细输出

`/reasoning`、`/verbose` 和 `/trace` 可能会暴露内部推理、工具
输出或插件诊断信息，而这些内容并不适合公开频道。在群组环境中，应将它们仅视为**调试
用途**，除非你明确需要，否则请保持关闭。

建议：

- 在公开房间中保持 `/reasoning`、`/verbose` 和 `/trace` 关闭。
- 如果启用，也只应在受信任的私聊或严格受控的房间中进行。
- 请记住：verbose 和 trace 输出可能包含工具参数、URL、插件诊断信息以及模型所见数据。

## 配置加固示例

### 文件权限

在网关主机上保持配置和状态的私密性：

- `~/.openclaw/openclaw.json`：`600`（仅用户可读写）
- `~/.openclaw`：`700`（仅用户可访问）

`openclaw doctor` 可以提示并建议收紧这些权限。

### 网络暴露（绑定、端口、防火墙）

Gateway 在单个端口上复用 **WebSocket + HTTP**：

- 默认值：`18789`
- 配置/标志/环境变量：`gateway.port`、`--port`、`OPENCLAW_GATEWAY_PORT`

这个 HTTP 表面包含 Control UI 和 canvas 主机：

- Control UI（SPA 资源）（默认基础路径 `/`）
- Canvas 主机：`/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`（任意 HTML/JS；视为不受信任内容）

如果你在普通浏览器中加载 canvas 内容，请将其视为任何其他不受信任的网页：

- 不要把 canvas 主机暴露给不受信任的网络/用户。
- 除非你完全理解其影响，否则不要让 canvas 内容与特权 Web 表面共享同一源。

绑定模式控制 Gateway 监听的位置：

- `gateway.bind: "loopback"`（默认）：只有本地客户端可以连接。
- 非 loopback 绑定（`"lan"`、`"tailnet"`、`"custom"`）会扩大攻击面。仅在启用 gateway 认证（共享 token/密码或正确配置的受信任代理）并配合真实防火墙时使用。

经验法则：

- 优先使用 Tailscale Serve，而不是 LAN 绑定（Serve 会让 Gateway 保持在 loopback 上，由 Tailscale 负责访问控制）。
- 如果必须绑定到 LAN，请通过防火墙将端口限制到严格的源 IP 白名单；不要广泛进行端口转发。
- 切勿在 `0.0.0.0` 上以未认证方式暴露 Gateway。

### 使用 UFW 进行 Docker 端口发布

如果你在 VPS 上使用 Docker 运行 OpenClaw，请记住，已发布的容器端口
（`-p HOST:CONTAINER` 或 Compose 的 `ports:`）是通过 Docker 的转发
链路路由的，而不仅仅是主机的 `INPUT` 规则。

为了让 Docker 流量与你的防火墙策略保持一致，请在
`DOCKER-USER` 中强制执行规则（该链会在 Docker 自身的 accept 规则之前被评估）。
在许多现代发行版上，`iptables`/`ip6tables` 使用 `iptables-nft` 前端，
并且仍然会把这些规则应用到 nftables 后端。

最小白名单示例（IPv4）：

```bash
# /etc/ufw/after.rules（作为独立的 *filter 段追加）
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

IPv6 有单独的表。如果启用了 Docker IPv6，请在 `/etc/ufw/after6.rules` 中添加匹配的策略。

避免在文档片段中硬编码接口名称，如 `eth0`。接口名称
会因 VPS 镜像而异（`ens3`、`enp*` 等），不匹配可能会意外
跳过你的拒绝规则。

重载后的快速验证：

```bash
ufw reload
iptables -S DOCKER-USER
ip6tables -S DOCKER-USER
nmap -sT -p 1-65535 <public-ip> --open
```

期望暴露在外的端口应仅为你有意开放的端口（对于大多数
部署：SSH + 你的反向代理端口）。

### mDNS/Bonjour 发现

当启用捆绑的 `bonjour` 插件时，Gateway 会通过 mDNS（端口 5353 上的 `_openclaw-gw._tcp`）广播自身存在，以便本地设备发现。在完整模式下，这会包含可能暴露运行细节的 TXT 记录：

- `cliPath`：CLI 二进制的完整文件系统路径（会暴露用户名和安装位置）
- `sshPort`：在主机上声明 SSH 可用
- `displayName`、`lanHost`：主机名信息

**运行安全注意事项：** 广播基础设施细节会让局域网中的任何人更容易进行侦察。即使是像文件系统路径和 SSH 可用性这样的“无害”信息，也会帮助攻击者绘制你的环境地图。

**建议：**

1. **如果不需要 LAN 发现，请保持 Bonjour 禁用。** Bonjour 会在 macOS 主机上自动启动，其他平台则为可选；直接 Gateway URL、Tailnet、SSH 或广域 DNS-SD 可以避免本地多播。

2. **最小模式**（启用 Bonjour 时的默认值，适用于暴露的 gateway）：从 mDNS 广播中省略敏感字段：

   ```json5
   {
     discovery: {
       mdns: { mode: "minimal" },
     },
   }
   ```

3. **禁用 mDNS 模式**，如果你想保留插件启用，但抑制本地设备发现：

   ```json5
   {
     discovery: {
       mdns: { mode: "off" },
     },
   }
   ```

4. **完整模式**（可选）：在 TXT 记录中包含 `cliPath` + `sshPort`：

   ```json5
   {
     discovery: {
       mdns: { mode: "full" },
     },
   }
   ```

5. **环境变量**（替代方案）：设置 `OPENCLAW_DISABLE_BONJOUR=1`，即可在不更改配置的情况下禁用 mDNS。

当 Bonjour 以最小模式启用时，Gateway 广播的信息足以用于设备发现（`role`、`gatewayPort`、`transport`），但会省略 `cliPath` 和 `sshPort`。需要 CLI 路径信息的应用可以改为通过已认证的 WebSocket 连接获取。

### 锁定 Gateway WebSocket（本地认证）

默认情况下**必须**进行 Gateway 认证。如果未配置有效的 gateway 认证路径，
Gateway 会拒绝 WebSocket 连接（失败即关闭）。

初始化时默认会生成一个 token（即使是 loopback 也一样），因此
本地客户端必须进行身份验证。

设置一个 token，使**所有** WS 客户端都必须认证：

```json5
{
  gateway: {
    auth: { mode: "token", token: "your-token" },
  },
}
```

Doctor 可以帮你生成一个：`openclaw doctor --generate-gateway-token`。

<Note>
`gateway.remote.token` 和 `gateway.remote.password` 是客户端凭据来源。它们本身**不会**保护本地 WS 访问。只有在 `gateway.auth.*` 未设置时，本地调用路径才可以将 `gateway.remote.*` 作为回退使用。如果 `gateway.auth.token` 或 `gateway.auth.password` 通过 SecretRef 显式配置但尚未解析，则解析会失败并关闭（不会被远程回退掩盖）。
</Note>
可选：在使用 `wss://` 时，可通过 `gateway.remote.tlsFingerprint` 固定远程 TLS。
明文 `ws://` 默认仅限 loopback。对于受信任的私有网络
路径，可在客户端进程中设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`
作为紧急开关。这有意仅限进程环境变量，而不是
`openclaw.json` 配置键。
移动端配对以及 Android 手动或扫描得到的 gateway 路由更严格：
明文可用于 loopback，但 private-LAN、link-local、`.local` 以及
无点号主机名必须使用 TLS，除非你明确选择启用受信任的
私有网络明文路径。

本地设备配对：

- 为了让同主机客户端更顺畅，直接本地 loopback 连接的设备配对会自动批准。
- OpenClaw 还提供一条狭窄的后端/容器本地自连接路径，用于
  受信任的共享密钥辅助流程。
- Tailnet 和 LAN 连接，包括同主机 tailnet 绑定，被视为
  远程配对连接，仍然需要批准。
- loopback 请求上的转发头证据会使其失去 loopback 本地性资格。元数据升级的自动批准范围非常有限。两项规则详见
  [Gateway pairing](/gateway/pairing)。

认证模式：

- `gateway.auth.mode: "token"`：共享持有者令牌（推荐适用于大多数部署）。
- `gateway.auth.mode: "password"`：密码认证（建议通过环境变量设置：`OPENCLAW_GATEWAY_PASSWORD`）。
- `gateway.auth.mode: "trusted-proxy"`：信任具备身份感知能力的反向代理来认证用户，并通过请求头传递身份（见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)）。

轮换检查清单（token/密码）：

1. 生成/设置一个新密钥（`gateway.auth.token` 或 `OPENCLAW_GATEWAY_PASSWORD`）。
2. 重启 Gateway（如果由 macOS 应用托管 Gateway，则重启该应用）。
3. 更新所有远程客户端（在调用 Gateway 的机器上更新 `gateway.remote.token` / `.password`）。
4. 验证你已无法再使用旧凭据连接。

### Tailscale Serve 身份头

当 `gateway.auth.allowTailscale` 为 `true`（Serve 默认值）时，OpenClaw
会接受 Tailscale Serve 身份头（`tailscale-user-login`）用于 Control
UI/WebSocket 认证。OpenClaw 会通过本地 Tailscale 守护进程（`tailscale whois`）解析
`x-forwarded-for` 地址，并将其与该头信息匹配来验证身份。此行为仅针对命中 loopback
且包含由 Tailscale 注入的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host`
的请求触发。
对于这条异步身份检查路径，相同 `{scope, ip}` 的失败尝试会在限流器记录失败之前进行串行化。因此，同一 Serve 客户端发起的并发错误重试，可能会立即锁定第二次尝试，
而不是像两个普通不匹配那样并行竞争。
HTTP API 端点（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）
**不**使用 Tailscale 身份头认证。它们仍然遵循网关已配置的 HTTP 认证模式。

重要边界说明：

- Gateway 的 HTTP bearer 认证实际上等同于全有或全无的运维访问。
- 将能够调用 `/v1/chat/completions`、`/v1/responses` 或 `/api/channels/*` 的凭据视为该 gateway 的完整访问运维密钥。
- 在 OpenAI 兼容的 HTTP 表面上，共享密钥 bearer 认证会恢复完整的默认运维权限范围（`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`）以及 agent turn 的 owner 语义；更窄的 `x-openclaw-scopes` 值不会降低该共享密钥路径的权限。
- HTTP 上按请求的权限语义仅在请求来自具备身份的模式时适用，例如受信任的代理认证，或私有入口上的 `gateway.auth.mode="none"`。
- 在这些具备身份的模式中，若省略 `x-openclaw-scopes`，则回退到正常的默认运维权限集合；当你希望使用更窄的权限集合时，请显式发送该头。
- `/tools/invoke` 也遵循相同的共享密钥规则：token/密码 bearer 认证在这里同样被视为完整运维访问，而具备身份的模式仍会遵守声明的权限范围。
- 不要与不受信任的调用方共享这些凭据；优先针对不同信任边界使用独立的 gateway。

**信任假设：** 无 token 的 Serve 认证假定 gateway 主机是可信的。
不要把它当作对抗同主机恶意进程的保护。如果不受信任的
本地代码可能在 gateway 主机上运行，请禁用 `gateway.auth.allowTailscale`
，并要求通过 `gateway.auth.mode: "token"` 或
`"password"` 进行显式共享密钥认证。

**安全规则：** 不要从你自己的反向代理转发这些头。如果
你在 gateway 前终止 TLS 或代理请求，请禁用
`gateway.auth.allowTailscale`，并改用共享密钥认证（`gateway.auth.mode:
"token"` 或 `"password"`）或 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)。

受信任代理：

- 如果你在 Gateway 前终止 TLS，请将 `gateway.trustedProxies` 设置为你的代理 IP。
- OpenClaw 会信任这些 IP 发来的 `x-forwarded-for`（或 `x-real-ip`），用于确定本地配对检查和 HTTP 认证/本地检查的客户端 IP。
- 确保你的代理**覆盖写入** `x-forwarded-for`，并阻止对 Gateway 端口的直接访问。

参见 [Tailscale](/gateway/tailscale) 和 [Web overview](/web)。

### 通过 node host 进行浏览器控制（推荐）

如果你的 Gateway 是远程的，但浏览器运行在另一台机器上，请在浏览器所在机器上运行一个 **node host**
，并让 Gateway 代理浏览器操作（见 [Browser tool](/tools/browser)）。
将 node 配对视为管理员访问。

推荐模式：

- 让 Gateway 和 node host 位于同一个 tailnet（Tailscale）中。
- 有意进行 node 配对；如果不需要浏览器代理路由，请将其禁用。

避免：

- 通过 LAN 或公网暴露中继/控制端口。
- 用 Tailscale Funnel 暴露浏览器控制端点（公开暴露）。

### 磁盘上的密钥

假设 `~/.openclaw/`（或 `$OPENCLAW_STATE_DIR/`）下的任何内容都可能包含密钥或私人数据：

- `openclaw.json`: config may include tokens (gateway, remote gateway), provider settings, and allowlists.
- `credentials/**`: channel credentials (example: WhatsApp creds), pairing allowlists, legacy OAuth imports.
- `agents/<agentId>/agent/auth-profiles.json`: API keys, token profiles, OAuth tokens, and optional `keyRef`/`tokenRef`.
- `agents/<agentId>/agent/codex-home/**`: per-agent Codex app-server account, config, skills, plugins, native thread state, and diagnostics.
- `secrets.json` (optional): file-backed secret payload used by `file` SecretRef providers (`secrets.providers`).
- `agents/<agentId>/agent/auth.json`: legacy compatibility file. Static `api_key` entries are scrubbed when discovered.
- `agents/<agentId>/sessions/**`: session transcripts (`*.jsonl`) + routing metadata (`sessions.json`) that can contain private messages and tool output.
- bundled plugin packages: installed plugins (plus their `node_modules/`).
- `sandboxes/**`: tool sandbox workspaces; can accumulate copies of files you read/write inside the sandbox.

加固建议：

- 保持严格权限（目录 `700`，文件 `600`）。
- 在 gateway 主机上使用全盘加密。
- 如果主机是共享的，优先为 Gateway 使用专用的 OS 用户账户。

### 工作区 `.env` 文件

OpenClaw 会为 agents 和 tools 载入工作区本地的 `.env` 文件，但绝不会让这些文件无声地覆盖 gateway 运行时控制。

- 任何以 `OPENCLAW_*` 开头的键都会被不受信任的工作区 `.env` 文件阻止。
- Matrix、Mattermost、IRC 和 Synology Chat 的通道端点设置也会被工作区 `.env` 覆盖阻止，因此克隆的工作区无法通过本地端点配置重定向捆绑的连接器流量。端点环境变量键（如 `MATRIX_HOMESERVER`、`MATTERMOST_URL`、`IRC_HOST`、`SYNOLOGY_CHAT_INCOMING_URL`）必须来自 gateway 进程环境或 `env.shellEnv`，不能来自工作区加载的 `.env`。
- 该阻止是失败即关闭：未来版本中新增的运行时控制变量，不能从已提交到仓库或攻击者提供的 `.env` 中继承；该键会被忽略，gateway 保持其自身值。
- 受信任的进程/OS 环境变量（gateway 自己的 shell、launchd/systemd 单元、应用包）仍然有效——这里仅约束 `.env` 文件加载。

原因：工作区 `.env` 文件经常与 agent 代码放在一起，可能被意外提交，或由工具写入。阻止整个 `OPENCLAW_*` 前缀意味着以后新增的 `OPENCLAW_*` 标志永远不会悄悄从工作区状态继承，从而避免回归。

### 日志和转录（脱敏与保留）

即使访问控制正确，日志和转录也可能泄露敏感信息：

- Gateway 日志可能包含工具摘要、错误和 URL。
- 会话转录可能包含粘贴的密钥、文件内容、命令输出和链接。

建议：

- 保持日志和转录脱敏开启（`logging.redactSensitive: "tools"`；默认）。
- 通过 `logging.redactPatterns` 为你的环境添加自定义模式（令牌、主机名、内部 URL）。
- 共享诊断信息时，优先使用 `openclaw status --all`（可直接粘贴，已脱敏）而不是原始日志。
- 如果不需要长期保留，请清理旧的会话转录和日志文件。

详情： [Logging](/gateway/logging)

### 私聊：默认通过配对

```json5
{
  channels: { whatsapp: { dmPolicy: "pairing" } },
}
```

### 群组：处处都要求提及

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

在群聊中，仅在被明确提及时才响应。

### 分离号码（WhatsApp、Signal、Telegram）

对于基于电话号码的通道，考虑将你的 AI 运行在一个与个人号码分开的号码上：

- 个人号码：你的对话保持私密
- 机器人号码：AI 处理这些对话，并带有适当边界

### 只读模式（通过沙盒和工具）

你可以通过以下组合构建只读配置文件：

- `agents.defaults.sandbox.workspaceAccess: "ro"`（或 `"none"` 表示无工作区访问）
- 阻止 `write`、`edit`、`apply_patch`、`exec`、`process` 等的工具允许/拒绝列表

附加加固选项：

- `tools.exec.applyPatch.workspaceOnly: true`（默认）：确保即使关闭沙箱，`apply_patch` 也无法在工作区目录之外写入/删除。只有在你明确希望 `apply_patch` 影响工作区外文件时才将其设为 `false`。
- `tools.fs.workspaceOnly: true`（可选）：将 `read`/`write`/`edit`/`apply_patch` 路径以及原生提示图片自动加载路径限制在工作区目录内（如果你今天允许绝对路径，并希望增加一道统一的保护，这会很有用）。
- 保持文件系统根目录狭窄：避免将 home 目录这类宽泛路径作为 agent 工作区/沙盒工作区。宽泛根目录可能会让文件系统工具暴露敏感本地文件（例如 `~/.openclaw` 下的状态/配置）。

### 安全基线（可复制粘贴）

下面是一个“安全默认”配置，可保持 Gateway 私有、要求 DM 配对，并避免始终开启群聊机器人：

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

如果你也想让工具执行“默认更安全”，请再为任何非 owner agent 添加沙箱 + 禁用危险工具（下面“每个 agent 的访问配置文件”中有示例）。

聊天驱动的 agent turn 的内置基线：非 owner 发送者不能使用 `cron` 或 `gateway` 工具。

## 沙箱化（推荐）

专用文档：[沙箱化](/gateway/sandboxing)

两种互补的方法：

- **在 Docker 中运行完整的 Gateway**（容器边界）：[Docker](/install/docker)
- **工具沙箱**（`agents.defaults.sandbox`，主机 gateway + 沙箱隔离的工具；Docker 是默认后端）：[沙箱化](/gateway/sandboxing)

<Note>
为防止跨 agent 访问，请将 `agents.defaults.sandbox.scope` 保持为 `"agent"`（默认）或 `"session"`，以获得更严格的按会话隔离。`scope: "shared"` 会使用单个容器或工作区。
</Note>

此外，还要考虑沙箱内对 agent 工作区的访问：

- `agents.defaults.sandbox.workspaceAccess: "none"`（默认）会禁止访问 agent 工作区；工具会在 `~/.openclaw/sandboxes` 下的沙箱工作区中运行
- `agents.defaults.sandbox.workspaceAccess: "ro"` 会将 agent 工作区以只读方式挂载到 `/agent`（禁用 `write`/`edit`/`apply_patch`）
- `agents.defaults.sandbox.workspaceAccess: "rw"` 会将 agent 工作区以读写方式挂载到 `/workspace`
- 额外的 `sandbox.docker.binds` 会基于归一化和规范化后的源路径进行校验。即使利用父级符号链接技巧和规范化的 home 别名，最终解析到被阻止的根目录（例如 `/etc`、`/var/run` 或操作系统 home 下的凭证目录），也会被关闭并失败。

<Warning>
`tools.elevated` 是一个全局的基础逃逸出口，会在沙箱外运行 exec。默认的有效主机是 `gateway`，如果 exec 目标配置为 `node`，则为 `node`。请严格限制 `tools.elevated.allowFrom`，不要对陌生人启用它。你还可以通过 `agents.list[].tools.elevated` 按 agent 进一步限制 elevated。参见 [Elevated mode](/tools/elevated)。
</Warning>

### 子 agent 委派护栏

如果你允许会话工具，请将委派给子 agent 的运行视为另一个边界决策：

- 除非 agent 确实需要委派，否则拒绝 `sessions_spawn`
- 将 `agents.defaults.subagents.allowAgents` 以及任何按 agent 的 `agents.list[].subagents.allowAgents` 覆盖项限制为已知安全的目标 agents
- 对于任何必须保持在沙箱中的工作流，调用 `sessions_spawn` 时使用 `sandbox: "require"`（默认是 `inherit`）
- 当目标子运行时未进行沙箱化时，`sandbox: "require"` 会快速失败

## 浏览器控制风险

启用浏览器控制会赋予模型驱动真实浏览器的能力。
如果该浏览器配置文件中已经包含登录会话，模型就可以访问这些账户和数据。请将浏览器配置文件视为**敏感状态**：

- 优先为 agent 使用专用配置文件（默认的 `openclaw` 配置文件）。
- 避免将 agent 指向你个人日常使用的配置文件。
- 对于已沙箱化的 agents，除非你信任它们，否则保持主机端浏览器控制禁用。
- 独立的回环浏览器控制 API 只接受共享密钥认证
  （gateway token bearer auth 或 gateway password）。它不会使用
  trusted-proxy 或 Tailscale Serve 身份头。
- 将浏览器下载内容视为不可信输入；优先使用隔离的下载目录。
- 如果可能，在 agent 配置文件中禁用浏览器同步/密码管理器（可减小影响范围）。
- 对于远程 gateways，假设“浏览器控制”等同于对该配置文件能够访问的任何内容具有“操作员级访问权限”。
- 将 Gateway 和 node 主机保持在 tailnet 内；避免将浏览器控制端口暴露给 LAN 或公共互联网。
- 当你不需要浏览器代理路由时，请禁用它（`gateway.nodes.browser.mode="off"`）。
- Chrome MCP 的现有会话模式并不“更安全”；它可以像你本人一样操作该主机 Chrome 配置文件能够访问的任何内容。

### 浏览器 SSRF 策略（默认严格）

OpenClaw 的浏览器导航策略默认是严格的：除非你明确选择启用，否则私有/内部目标会继续被阻止。

- 默认：`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 未设置，因此浏览器导航会阻止私有/内部/特殊用途目标。
- 旧别名：为了兼容性，`browser.ssrfPolicy.allowPrivateNetwork` 仍然被接受。
- 选择启用模式：设置 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 以允许私有/内部/特殊用途目标。
- 在严格模式下，使用 `hostnameAllowlist`（如 `*.example.com` 这样的模式）和 `allowedHostnames`（精确主机例外，包括像 `localhost` 这样的被阻止名称）来明确例外。
- 导航会在请求前检查，并在导航后的最终 `http(s)` URL 上尽力重新检查，以减少基于重定向的跳转。

严格策略示例：

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

## 按 agent 的访问配置文件（多 agent）

在多 agent 路由下，每个 agent 都可以拥有自己的沙箱 + 工具策略：
可用它为每个 agent 分配**完全访问**、**只读**或**无访问权限**。
完整详情和优先级规则请参见 [多 Agent 沙箱与工具](/tools/multi-agent-sandbox-tools)。

常见用例：

- 个人 agent：完全访问，无沙箱
- 家庭/工作 agent：沙箱化 + 只读工具
- 公共 agent：沙箱化 + 无文件系统/ shell 工具

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

### 示例：只读工具 + 只读工作区

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

### 示例：无文件系统/ shell 访问（允许 provider 消息传递）

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
        // 会话工具可能会从转录中泄露敏感数据。默认情况下，OpenClaw 会将这些工具限制为
        // 当前会话 + 已生成的子 agent 会话，但如有需要，你可以进一步收紧。
        // 参见配置参考中的 `tools.sessions.visibility`。
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

如果你的 AI 做了坏事：

### 遏制

1. **停止它：** 停止 macOS 应用（如果它在监管 Gateway），或者终止你的 `openclaw gateway` 进程。
2. **关闭暴露面：** 将 `gateway.bind: "loopback"`（或禁用 Tailscale Funnel/Serve），直到你弄清楚发生了什么。
3. **冻结访问：** 将有风险的 DM/群组切换为 `dmPolicy: "disabled"` / 要求提及，并删除你之前使用的 `"*"` 全放行条目。

### 轮换（若秘密泄露则假定已被攻破）

1. 轮换 Gateway 认证（`gateway.auth.token` / `OPENCLAW_GATEWAY_PASSWORD`）并重启。
2. 轮换远程客户端密钥（`gateway.remote.token` / `.password`），适用于任何可以调用 Gateway 的机器。
3. 轮换 provider/API 凭证（WhatsApp 凭证、Slack/Discord token、`auth-profiles.json` 中的模型/API 密钥，以及在使用时加密的 secrets 载荷值）。

### 审计

1. 检查 Gateway 日志：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（或 `logging.file`）。
2. 审查相关转录：`~/.openclaw/agents/<agentId>/sessions/*.jsonl`。
3. 审查最近的配置变更（任何可能扩大访问范围的内容：`gateway.bind`、`gateway.auth`、DM/群组策略、`tools.elevated`、插件变更）。
4. 重新运行 `openclaw security audit --deep` 并确认关键发现已解决。

### 收集用于报告

- 时间戳、gateway 主机 OS + OpenClaw 版本
- 会话转录 + 一小段日志尾部（脱敏后）
- 攻击者发了什么 + agent 做了什么
- Gateway 是否暴露到了 loopback 之外（LAN/Tailscale Funnel/Serve）

## Secret scanning

CI 运行 pre-commit 的 `detect-private-key` 钩子扫描整个仓库。如果它
失败了，请移除或轮换已提交的密钥材料，然后在本地复现：

```bash
pre-commit run --all-files detect-private-key
```

## 报告安全问题

在 OpenClaw 中发现了漏洞？请负责任地报告：

1. 邮件：[security@openclaw.ai](mailto:security@openclaw.ai)
2. 在修复前不要公开披露
3. 我们会感谢你（除非你希望匿名）
