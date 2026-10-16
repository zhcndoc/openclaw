---
summary: "OpenClaw 支持的信任边界、它提供和不提供的控制以及如何报告漏洞"
read_when:
  - "决定一个网关是否可以为一组用户提供服务"
  - "根据记录的信任边界对安全报告进行分类"
  - "报告 OpenClaw 中的可疑漏洞"
title: "安全信任模型"
sidebarTitle: "信任模型"
---

## <a id="scope%3A-one-trust-boundary-per-gateway"></a><a id="scope-one-trust-boundary-per-gateway"></a> Scope：每个网关一个信任边界

- 支持：每个网关一个信任边界 - 单个操作员或相互信任的团队（首选每个边界一个 OS user/host/VPS）。
- 不支持：由相互不信任或敌对用户使用的一个共享 gateway/agent。
- 对抗用户隔离需要单独的网关（最好是单独的 OS users/hosts）。
- 可以向支持工具的代理发送消息的每个人都共享该代理的委派工具权限。这对于已经互相信任的队友来说很好；这就是为什么敌对用户无法共享代理。
- Session 工具默认覆盖整个网关：`tools.sessions.visibility` 默认为 `all`，`tools.agentToAgent.enabled` 默认为 `true`，因此任何运行非沙箱的启用工具的代理都可以列出、读取、搜索和发送消息每个代理的会话，包括其他用户的记录。默认情况下，沙盒会话保持固定在它们自己的生成树上，这限制了它们作为调用者，但不会向未沙盒代理隐藏它们的转录本。这与每个网关一个信任边界匹配。对于一个网关上具有不同信任级别的角色，请将 `tools.sessions.visibility` 设置为 `agent` 或 `self`（`tree` 仍允许跨代理的请求者拥有的本机子级和 ACP 子级），限制与 `tools.agentToAgent.allow` 的配对，或设置 `tools.agentToAgent.enabled: false`。请参阅 [`tools.sessions`](/gateway/config-tools#tools-sessions) 和 [`tools.agentToAgent`](/gateway/config-tools#tools-agenttoagent)。
- 对于仅发送委派，将窄可见性与 `agents.entries.<agentId>.tools.agentToAgent.send`（目标 ID 或 `*` 模式）配对。该规则允许 `sessions_send` 和授权回合的回复，而不是历史记录、搜索、列表、状态、会话控制或其他隐藏状态监视。全局代理到代理限制和沙箱生成会话限制仍然适用。这是要求特权代理采取行动的许可，并不保证它将拒绝披露数据或执行不受信任的请求。强隔离仍然需要单独的网关。请参阅 [ 仅发送示例 ](/gateway/config-tools/sessions-and-subagents#per-agent-send-only-access)。
- 如果有人可以修改网关主机state/config（`~/.openclaw`，包括`openclaw.json`），请将他们视为可信操作者。
- 在一个网关内，经过身份验证的操作员访问是受信任的控制平面角色，而不是每用户租户角色。 [命名操作员角色](/gateway/operator-scopes#named-operator-roles)绑定了每个队友的连接可以做什么；它们是协作护栏，而不是租户隔离。
- `sessionKey`（会话 ID、标签）是路由选择器，而不是授权令牌。

在更改远程访问、DM 策略、反向代理或公开暴露之前，请运行 [Gateway 暴露操作手册](/gateway/security/exposure-runbook) 作为 flight/rollback 之前的清单。

## <a id="trust-boundary-matrix"></a> 信任边界矩阵

用于对风险报告进行初步分流的简要模型：

| 边界或控制项                                       | 含义                                                         | 常见误读                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `gateway.auth`（token/password/trusted-proxy/device 授权） | 对网关 API 的调用者进行身份验证                                 | “需要在每个帧上对每条消息进行签名才能确保安全”                    |
| `sessionKey`                                              | context/session 选择的路由键                             | “会话密钥是用户身份验证边界”                                         |
| Prompt/content护栏                                 | 降低模型滥用风险                                               | “仅提示注入就证明了身份验证绕过”                                   |
| 浏览器评估                                          | 启用时属于有意开放给操作者的能力                          | “任何 JS eval 原语在这种信任模型下都自动是漏洞”           |
| 本地 TUI `!` shell                                       | 由操作者显式触发的本地执行                           | “本地 shell 便捷命令就是远程注入”                         |
| Node 配对和节点命令                            | 在配对设备上进行操作员级远程执行                     | “默认情况下，远程设备控制应被视为不受信任的用户访问” |
| `gateway.nodes.pairing.autoApproveCidrs`                  | 可选启用的受信任网络节点接入策略                         | “默认禁用的允许列表就是自动配对漏洞”       |
| `gateway.nodes.pairing.sshVerify`                         | 通过操作者 SSH 进行密钥验证的节点接入                        | “默认开启的自动批准就是自动配对漏洞”              |
| `tools.sessions.visibility` / `tools.agentToAgent`        | 会话工具可到达一个网关内部；网关范围且默认开启 | “默认的跨代理会话访问是租户隔离绕过”             |

## <a id="not-vulnerabilities-by-design"></a> 非漏洞设计

<Accordion id="common-findings-closed-as-no-action" title="共同调查结果以不采取行动结束">

- 仅存在提示注入链、但没有策略、认证或沙箱绕过的情况。
- 基于假设单一共享主机或配置存在恶意多租户运行的主张。
- 正常运营者读路径访问（例如 `sessions.list` / `sessions.preview` / `chat.history`）在共享网关架构中被归类为 IDOR。
- 仅限 localhost 的部署发现（例如仅在回环网关上缺少 HSTS）。
- 针对本仓库中并不存在的入站路径的 Discord 入站 webhook 签名发现。
- 将 Node 配对元数据视为 `system.run` 的隐藏第二层“按命令审批”机制；实际执行边界是网关的全局节点命令策略加上节点自身的执行审批。
- `gateway.nodes.pairing.sshVerify` 被视为漏洞，因为它默认启用。它从不单独批准网络局部性或 SSH 可访问性：网关通过 SSH（BatchMode，严格主机密钥）读回设备身份，并且仅在设备密钥与待处理请求完全匹配时批准，这要求连接密钥对已存在于操作员控制的主机上的操作员帐户下。检查绑定到 private/CGNAT 源地址，共享受信任的 CIDR 资格下限（仅限新的无范围 `role: node`），并且 `sshVerify: false` 关闭该功能。
- `gateway.nodes.pairing.autoApproveCidrs` 本身被视为漏洞。默认情况下禁用它，需要显式 CIDR/IP 条目，仅适用于没有请求范围的首次 `role: node` 配对，并且从不自动批准 operator/browser/Control UI、WebChat、role/scope 升级、元数据或公钥更改或同一主机环回可信代理标头路径（即使在环回时）受信任代理身份验证已启用）。
- 将 `sessionKey` 视为认证令牌而提出的“缺少每用户授权”发现。
- 默认网关范围的会话可见性或默认的代理到代理消息传递本身被视为漏洞。审计将普通多代理默认值报告为 `info`，而不是漏洞发现，并且仅通过信任边界信号升级为 `warn`。一个网关就是一个信任边界；缩小 `tools.sessions.visibility` 或 `tools.agentToAgent` 进行角色分离，并为敌对用户运行单独的网关。

</Accordion>

## <a id="gateway-and-node-trust"></a> Gateway 与节点信任

将 Gateway 和 node 视为一个具有不同角色的运维信任域：

- **Gateway**：控制平面和策略面（`gateway.auth`、工具策略、路由）。
- **Node**：与该 Gateway 配对的远程执行面（命令、设备操作、主机本地能力）。
- 经过 Gateway 认证的调用方在 Gateway 作用域内被信任；配对完成后，node 操作会被视为该 node 上的受信任运维操作。参见 [操作员作用域](/gateway/operator-scopes)。
- 通过共享网关 token/password 进行身份验证的 Direct 环回后端客户端可以进行内部控制平面 RPC，而无需提供用户设备身份。这不是远程或浏览器配对旁路 - 网络客户端、节点客户端、设备令牌客户端和显式设备身份仍然要经过配对和范围升级强制。
- Exec 批准（白名单+询问）是操作员意图的护栏，而不是敌对的多租户隔离。它们绑定精确的请求上下文和尽力而为的直接本地文件操作数；它们不会对每个 runtime/interpreter 加载器路径进行语义建模。使用沙箱和主机隔离来实现牢固的边界。
- 受信任的单操作员默认值：允许在 `gateway`/`node` 上执行主机执行，无需批准提示（`security="full"`、`ask="off"`）。这是故意的 UX，它本身并不是一个漏洞。

对于敌意用户隔离，按 OS user/host 分割信任边界并运行单独的网关。

## <a id="threat-model"></a> 威胁模型

您的 AI 助手可以执行任意 shell 命令、read/write 文件、访问网络服务以及向任何人发送消息（如果有通道访问权限）。向它发送消息的人可以尝试诱骗它做坏事、通过社交工程访问您的数据或检查基础设施详细信息。

这里的大多数失败并不是罕见的漏洞攻击——而是“有人给机器人发了消息，机器人照他们说的做了。”OpenClaw 的立场依次是：

1. **身份优先**——先决定谁可以与机器人对话（DM 配对 / 白名单 / 明确“开放”）。
2. **范围其次**——再决定机器人可以在哪里行动（群组白名单 + 提及门控、工具、沙箱、设备权限）。
3. **模型最后** - 假设模型可以被操纵；设计使得操作只能造成有限的损坏。

## <a id="reporting-security-issues"></a> 报告安全问题

在 OpenClaw 中发现了漏洞？请负责任地报告：

1. 电子邮件：[security@openclaw.ai](mailto:security@openclaw.ai)
2. 在修复前请勿公开发布。
3. 我们会致谢您的贡献（除非您希望匿名）。
