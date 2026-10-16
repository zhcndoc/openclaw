---
summary: "运行 OpenClaw 的信任模型、安全默认值和强化指南"
read_when:
  - "添加会扩大访问或自动化能力的功能时"
  - "检查 OpenClaw 安全状况或强化部署"
title: "安全"
---

OpenClaw 附带保守的默认值。在常规主机上安装网关绑定到环回；大多数聊天频道都会使用配对码回复未知的 DM 发件人，而不是处理消息；组访问被列入许可名单，通常位于提及门后面。例外情况是经过深思熟虑并记录在案的：容器映像默认为公开绑定（与身份验证配对 - 请参阅 [exposure runbook](/gateway/security/exposure-runbook)），以及一些工作区通道（例如 ClickClack）默认信任工作区成员身份 - 每个通道页面都会说明其确切的默认值。在这些默认值上运行，您的状态良好，并且一个命令会告诉您是否已经偏离：

```bash
openclaw security audit
```

下面的页面是深层内容：信任模型、审计检查的内容以及如何在暴露更多表面时进一步强化。

<Note>
  **每个网关一个信任边界。**本指南假设每个网关都有一个可信边界：单个操作员或成员相互信任的团队。群聊和[多用户](/concepts/multi-user)操作受该边界内支持的部署。OpenClaw对于共享一个代理或网关的相互敌对的用户来说，这不是一个敌对的多租户安全边界。对于混合信任或对抗性用户操作，分割信任边界：单独的网关+凭证，最好是分开的OS用户或主机。
</Note>

默认情况下，具有消息工具访问权限的代理可以跨对话和渠道提供商发送。如果您的部署需要仅限于当前提供商或对话的消息传递，请配置 [ 跨提供商消息传递限制](/gateway/security/tool-permissions#cross-provider-messaging)。

## <a id="security-pages"></a> 安全页面

了解模型：

- [安全信任模型](/gateway/security/trust-model) - 每个网关一个信任边界、边界矩阵和结果以无操作结束。
- [运行安全审核](/gateway/security/running-the-audit) - `openclaw security audit` 检查的内容以及修复结果的顺序。
- [安全审核检查](/gateway/security/audit-checks) - 每个 `checkId` 的参考目录、其严重性及其自动修复支持。
- [威胁模型](/security/THREAT-MODEL-ATLAS) - 针对OpenClaw平台和ClawHub的对抗性威胁，映射到MITRE ATLAS。

强化部署：

- [硬化基线](/gateway/security/hardened-baseline) - Copy/paste 配置，使网关保持本地、配对和工具限制。
- [访问控制和白名单](/gateway/security/access-control) - DM 策略、白名单、DM 会话隔离、上下文可见性、命令授权。
- [提示注入](/gateway/security/prompt-injection) - 不受信任的内容到达模型、模型选择以及限制它的包装。
- [工具和代理权限](/gateway/security/tool-permissions) - Control-平面工具、节点执行、插件、沙箱、每个代理配置文件。
- [浏览器控制风险](/gateway/security/browser-control) - 真正的浏览器公开什么，以及限制它的 SSRF 策略。
- [网络暴露](/gateway/security/network-exposure) - 绑定、防火墙、发现、网关身份验证、Tailscale、反向代理、危险标志。
- [秘密、存储和日志](/gateway/security/secrets-and-storage) - 磁盘上的内容、哪些文件保存凭据以及记录包含哪些内容。
- [安全文件操作](/gateway/security/secure-file-operations) - 根范围文件访问、原子写入和存档提取帮助程序。
- [依赖锁定](/gateway/security/dependency-locking) - 已发布的包如何固定并解析其依赖关系图。

暴露并操作：

- [网关暴露操作手册](/gateway/security/exposure-runbook) - 在环回之外暴露网关之前的预检和回滚检查表。
- [可信代理身份验证](/gateway/trusted-proxy-auth) - 在提供操作员身份的反向代理后面运行网关。
- [速率限制](/gateway/security/rate-limiting) - 每个网关速率限制：锁定、限制、上限和冷却。
- [操作员事件响应](/gateway/security/operator-incident-response) - 在可疑泄露后遏制、轮换、审核和收集证据。

从 CLI 运行它：

- [`openclaw security`](/cli/security) - 运行审核、读取结果并应用支持的自动修复。
- [`openclaw policy`](/cli/policy) - 检查并测试上述指南配置的工具策略。

## <a id="where-each-section-moved"></a> 各部分移动的地方

此页面用于发布的每个锚点仍然在此处解析。下面的每个条目都带有原始锚点并链接到其新家。

**[安全信任模型](/gateway/security/trust-model)**

- <a id="scope%3A-one-trust-boundary-per-gateway" /><a id="scope-one-trust-boundary-per-gateway" />[范围：每个网关一个信任边界](/gateway/security/trust-model#scope-one-trust-boundary-per-gateway)
- <a id="trust-boundary-matrix" />[信任边界矩阵](/gateway/security/trust-model#trust-boundary-matrix)
- <a id="not-vulnerabilities-by-design" />[设计并非漏洞](/gateway/security/trust-model#not-vulnerabilities-by-design)
- <a id="common-findings-closed-as-no-action" />[常见调查结果因不采取行动而关闭](/gateway/security/trust-model#common-findings-closed-as-no-action)
- <a id="gateway-and-node-trust" />[网关和节点信任](/gateway/security/trust-model#gateway-and-node-trust)
- <a id="threat-model" />[威胁模型](/gateway/security/trust-model#threat-model)
- <a id="reporting-security-issues" />[报告安全问题](/gateway/security/trust-model#reporting-security-issues)

**[运行安全审计](/gateway/security/running-the-audit)**

- <a id="openclaw-security-audit" />[`openclaw security audit`](/gateway/security/running-the-audit#openclaw-security-audit)
- <a id="what-the-audit-checks-(high-level)" /><a id="what-the-audit-checks-high-level" />[ 审核检查内容（高级别）](/gateway/security/running-the-audit#what-the-audit-checks-high-level)
- <a id="priority-order-when-triaging-findings" />[对结果进行分类时的优先顺序](/gateway/security/running-the-audit#priority-order-when-triaging-findings)

**[硬化基线](/gateway/security/hardened-baseline)**

- <a id="hardened-baseline-in-60-seconds" />[60秒内硬化基线](/gateway/security/hardened-baseline#hardened-baseline-in-60-seconds)
- <a id="requester-scoped-controls-and-prompt-context" />[请求者范围的控件和提示上下文](/gateway/security/hardened-baseline#requester-scoped-controls-and-prompt-context)
- <a id="secure-baseline-(copy%2Fpaste)" /><a id="secure-baseline-copy/paste" />[安全基线 （copy/paste）](/gateway/security/hardened-baseline#secure-baseline-copy/paste)
- <a id="separate-numbers-(whatsapp%2C-signal%2C-telegram)" /><a id="separate-numbers-whatsapp-signal-telegram" />[单独编号（WhatsApp、Signal、Telegram）](/gateway/security/hardened-baseline#separate-numbers-whatsapp-signal-telegram)

**[访问控制和允许列表](/gateway/security/access-control)**

- <a id="dm-access%3A-pairing%2C-allowlist%2C-open%2C-disabled" /><a id="dm-access-pairing-allowlist-open-disabled" />[DM 访问：配对、白名单、打开、禁用](/gateway/security/access-control#dm-access-pairing-allowlist-open-disabled)
- <a id="allowlists-(two-layers)" /><a id="allowlists-two-layers" />[允许列表（两层）](/gateway/security/access-control#allowlists-two-layers)
- <a id="dm-session-isolation-(multi-user-mode)" /><a id="dm-session-isolation-multi-user-mode" />[DM 会话隔离（多用户模式）](/gateway/security/access-control#dm-session-isolation-multi-user-mode)
- <a id="context-visibility-vs-trigger-authorization" />[上下文可见性与触发授权](/gateway/security/access-control#context-visibility-vs-trigger-authorization)
- <a id="command-authorization" />[命令授权](/gateway/security/access-control#command-authorization)

**[及时注入](/gateway/security/prompt-injection)**

- <a id="prompt-injection" />[快速注入](/gateway/security/prompt-injection#prompt-injection)
- <a id="external-content-and-untrusted-input-wrapping" />[外部内容和不受信任的输入包装](/gateway/security/prompt-injection#external-content-and-untrusted-input-wrapping)
- <a id="bypass-flags-(keep-off-in-production)" /><a id="bypass-flags-keep-off-in-production" />[旁路标志（在生产中保持关闭）](/gateway/security/prompt-injection#bypass-flags-keep-off-in-production)
- <a id="reasoning-and-verbose-output-in-groups" />[分组推理和详细输出](/gateway/security/prompt-injection#reasoning-and-verbose-output-in-groups)

**[工具和代理权限](/gateway/security/tool-permissions)**

- <a id="control-plane-tools" />[控制平面工具](/gateway/security/tool-permissions#control-plane-tools)
- <a id="node-execution-(system.run)" /><a id="node-execution-system-run" />[节点执行（`system.run`）](/gateway/security/tool-permissions#node-execution-system-run)
- <a id="dynamic-skills-(watcher-%2F-remote-nodes)" /><a id="dynamic-skills-watcher-/-remote-nodes" />[动态技能（观察者/远程节点）](/gateway/security/tool-permissions#dynamic-skills-watcher-/-remote-nodes)
- <a id="plugins" />[插件](/gateway/security/tool-permissions#plugins)
- <a id="sandboxing" />[沙箱](/gateway/security/tool-permissions#sandboxing)
- <a id="sub-agent-delegation-guardrail" />[分代理代表团护栏](/gateway/security/tool-permissions#sub-agent-delegation-guardrail)
- <a id="read-only-mode" />[只读模式](/gateway/security/tool-permissions#read-only-mode)
- <a id="per-agent-access-profiles-(multi-agent)" /><a id="per-agent-access-profiles-multi-agent" />[每代理访问配置文件（多代理）](/gateway/security/tool-permissions#per-agent-access-profiles-multi-agent)
- <a id="full-access-(no-sandbox)" /><a id="full-access-no-sandbox" />[完全访问（无沙箱）](/gateway/security/tool-permissions#full-access-no-sandbox)
- <a id="read-only-tools-%2B-read-only-workspace" /><a id="read-only-tools-+-read-only-workspace" />[只读工具 + 只读工作区](/gateway/security/tool-permissions#read-only-tools-+-read-only-workspace)
- <a id="no-filesystem%2Fshell-access-(provider-messaging-allowed)" /><a id="no-filesystem/shell-access-provider-messaging-allowed" />[无 filesystem/shell 访问权限（允许提供者消息传递）](/gateway/security/tool-permissions#no-filesystem/shell-access-provider-messaging-allowed)

**[浏览器控制风险](/gateway/security/browser-control)**

- <a id="browser-control-risks" />[浏览器控制风险](/gateway/security/browser-control#browser-control-risks)
- <a id="browser-ssrf-policy-(strict-by-default)" /><a id="browser-ssrf-policy-strict-by-default" />[浏览器SSRF策略（默认严格）](/gateway/security/browser-control#browser-ssrf-policy-strict-by-default)

**[网络曝光](/gateway/security/network-exposure)**

- <a id="network-exposure" />[网络曝光](/gateway/security/network-exposure#network-exposure)
- <a id="bind%2C-port%2C-firewall" /><a id="bind-port-firewall" />[绑定、端口、防火墙](/gateway/security/network-exposure#bind-port-firewall)
- <a id="docker-port-publishing-with-ufw" />[使用 UFW](/gateway/security/network-exposure#docker-port-publishing-with-ufw) 进行 Docker 端口发布
- <a id="mdns%2Fbonjour-discovery" /><a id="mdns/bonjour-discovery" />[mDNS/Bonjour发现](/gateway/security/network-exposure#mdns/bonjour-discovery)
- <a id="gateway-websocket-auth" />[网关 WebSocket auth](/gateway/security/network-exposure#gateway-websocket-auth)
- <a id="tailscale-serve-identity-headers" />[Tailscale 服务身份标头](/gateway/security/network-exposure#tailscale-serve-identity-headers)
- <a id="reverse-proxy-configuration" />[反向代理配置](/gateway/security/network-exposure#reverse-proxy-configuration)
- <a id="hsts-and-origin-notes" />[HSTS 和原产地注释](/gateway/security/network-exposure#hsts-and-origin-notes)
- <a id="control-ui-over-http" />[通过HTTP](/gateway/security/network-exposure#control-ui-over-http)控制UI
- <a id="insecure%2Fdangerous-flags" /><a id="insecure/dangerous-flags" />[Insecure/dangerous 标志](/gateway/security/network-exposure#insecure/dangerous-flags)
- <a id="flags-tracked-by-the-audit-today" />[今天审核跟踪的标志](/gateway/security/network-exposure#flags-tracked-by-the-audit-today)
- <a id="all-dangerous-dangerously-keys-in-the-config-schema" />[ 配置架构中的所有危险*/dangerously* 密钥](/gateway/security/network-exposure#all-dangerous-dangerously-keys-in-the-config-schema)

**[秘密、存储和日志](/gateway/security/secrets-and-storage)**

- <a id="deployment-and-host-trust" />[部署和主机信任](/gateway/security/secrets-and-storage#deployment-and-host-trust)
- <a id="secrets-on-disk" />[磁盘上的秘密](/gateway/security/secrets-and-storage#secrets-on-disk)
- <a id="credential-storage-map" />[凭证存储映射](/gateway/security/secrets-and-storage#credential-storage-map)
- <a id="file-permissions" />[文件权限](/gateway/security/secrets-and-storage#file-permissions)
- <a id="workspace-.env-files" /><a id="workspace-env-files" />[工作空间 `.env` 文件](/gateway/security/secrets-and-storage#workspace-env-files)
- <a id="logs-and-transcripts" />[日志和成绩单](/gateway/security/secrets-and-storage#logs-and-transcripts)
- <a id="secret-scanning" />[秘密扫描](/gateway/security/secrets-and-storage#secret-scanning)

**[操作员事件响应](/gateway/security/operator-incident-response)**

- <a id="incident-response" />[事件响应](/gateway/security/operator-incident-response#incident-response)
- <a id="contain" />[包含](/gateway/security/operator-incident-response#contain)
- <a id="rotate-(assume-compromise-if-secrets-leaked)" /><a id="rotate-assume-compromise-if-secrets-leaked" />[旋转（如果机密泄露，则假定妥协）](/gateway/security/operator-incident-response#rotate-assume-compromise-if-secrets-leaked)
- <a id="audit" />[审核](/gateway/security/operator-incident-response#audit)
- <a id="collect-for-a-report" />[领取报告](/gateway/security/operator-incident-response#collect-for-a-report)
