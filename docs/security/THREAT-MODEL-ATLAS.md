---
summary: "将 OpenClaw 威胁模型映射到 MITRE ATLAS 框架"
title: "威胁模型（MITRE ATLAS）"
read_when:
  - "审查安全态势或威胁场景时"
  - "开发安全功能或审核响应时"
---

**版本：** 1.0-draft | **框架：** [MITRE ATLAS](https://atlas.mitre.org/)（针对 AI 系统的对抗性威胁环境）+ 数据流图

本文档记录了针对 OpenClaw AI 代理平台和 ClawHub 技能市场的对抗性威胁。这是一份由 OpenClaw 社区维护的动态文档。有关如何报告新威胁、提出攻击链或建议缓解措施，请参阅 [为威胁模型做贡献](/security/CONTRIBUTING-THREAT-MODEL)。

**ATLAS 关键资源：** [ATLAS 网站](https://atlas.mitre.org/) | [ATLAS 数据和贡献指南](https://github.com/mitre-atlas/atlas-data)

---

## <a id="1.-scope"></a><a id="1-scope"></a> 1. 范围

| 组件              | 包含 | 笔记                                            |
| ---------------------- | -------- | ------------------------------------------------ |
| OpenClaw 代理运行时 | 是      | 核心代理执行、工具调用、会话       |
| 网关                | 是      | 身份验证、路由、通道集成     |
| 渠道整合   | 是      | WhatsApp、Telegram、Discord、Signal、Slack 等 |
| ClawHub 市场    | 是      | 技能发布、审核、分发       |
| MCP 服务器            | 是      | 外部工具提供方                          |
| 用户设备           | 部分支持  | 移动应用、桌面客户端                     |

超出范围的报告和误报模式（公开互联网暴露、仅含提示注入且没有边界绕过的链路、在同一 gateway 主机上共享的互不信任操作者，以及其他情况）已在 [`SECURITY.md`](https://github.com/openclaw/openclaw/blob/main/SECURITY.md) 中列出；该文件是漏洞报告范围的当前权威来源，而不是本页面。

## <a id="2.-system-architecture"></a><a id="2-system-architecture"></a> 2. 系统架构

### <a id="2.1-trust-boundaries"></a><a id="2-1-trust-boundaries"></a> 2.1 信任边界

```text
┌─────────────────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  WhatsApp   │  │  Telegram   │  │   Discord   │  ...         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
└─────────┼────────────────┼────────────────┼──────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 1: Channel Access                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      GATEWAY                              │   │
│  │  • Device pairing (1h DM pairing / 5m node pairing TTL)   │   │
│  │  • AllowFrom / allowlist validation                       │   │
│  │  • Token / password / Tailscale auth                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 2: Session Isolation              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   AGENT SESSIONS                          │   │
│  │  • Session key = agent:channel:peer                       │   │
│  │  • Tool policies per agent                                │   │
│  │  • Transcript logging                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 3: Tool Execution                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  EXECUTION SANDBOX                        │   │
│  │  • Docker sandbox (default) or host (exec approvals)      │   │
│  │  • Node remote execution                                  │   │
│  │  • SSRF protection (DNS pinning + IP blocking)            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 4: External Content               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              FETCHED URLs / EMAILS / WEBHOOKS             │   │
│  │  • External content wrapping (random-boundary XML tags)   │   │
│  │  • Security notice injection                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 5: Supply Chain                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      CLAWHUB                              │   │
│  │  • Skill publishing (semver, SKILL.md required)           │   │
│  │  • Static pattern + AST-adjacent moderation scanning      │   │
│  │  • LLM-based agentic risk review + VirusTotal scanning    │   │
│  │  • GitHub account age verification (14 days)              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### <a id="2.2-data-flows"></a><a id="2-2-data-flows"></a> 2.2 数据流

| 流程 | 来源  | 目标 | 数据                 | 防护           |
| ---- | ------- | ----------- | -------------------- | -------------------- |
| F1   | 渠道 | 网关     | 用户消息        | TLS, AllowFrom       |
| F2   | 网关 | 代理       | 路由后的消息      | 会话隔离    |
| F3   | 代理   | 工具       | 工具调用     | 策略执行   |
| F4   | 代理   | 外部    | `web_fetch` 请求 | SSRF 阻断        |
| F5   | ClawHub | 代理       | 技能代码           | 审核，扫描 |
| F6   | 代理   | 渠道     | 响应            | 输出过滤     |

---

## <a id="3.-threat-analysis-by-atlas-tactic"></a><a id="3-threat-analysis-by-atlas-tactic"></a> 3. 基于 ATLAS 战术的威胁分析

威胁目录按 ATLAS 策略进行划分。下面的每一页都包含该策略中每个威胁的完整属性表。第 5 节中的风险矩阵和第 6 节中的建议摘要对所有内容进行索引，7.1 节中的 ATLAS 技术映射列出了哪些威胁实施了每种技术。

| ATLAS战术                                         | 威胁                                        | 页面                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| 侦察（AML.TA0002）                          | T-RECON-001, T-RECON-002                       | [侦察](/security/THREAT-MODEL-ATLAS/reconnaissance)                           |
| 初始访问（AML.TA0004）                          | T-ACCESS-001, T-ACCESS-002, T-ACCESS-003       | [初始访问](/security/THREAT-MODEL-ATLAS/initial-access)                           |
| 执行（AML.TA0005）                               | T-EXEC-001, T-EXEC-002, T-EXEC-003, T-EXEC-004 | [执行](/security/THREAT-MODEL-ATLAS/execution)                                     |
| 持久性 （AML.TA0006）                             | T-PERSIST-001, T-PERSIST-002, T-PERSIST-003    | [持久性](/security/THREAT-MODEL-ATLAS/persistence)                                 |
| 防御规避（AML.TA0007）                         | T-EVADE-001, T-EVADE-002                       | [防御规避](/security/THREAT-MODEL-ATLAS/defense-evasion)                         |
| 发现 （AML.TA0008）                               | T-DISC-001, T-DISC-002                         | [发现](/security/THREAT-MODEL-ATLAS/discovery)                                     |
| 收集和渗漏（AML.TA0009、AML.TA0010） | T-EXFIL-001, T-EXFIL-002, T-EXFIL-003          | [收集与渗漏](/security/THREAT-MODEL-ATLAS/collection-and-exfiltration) |
| 影响（AML.TA0011）                                  | T-IMPACT-001, T-IMPACT-002, T-IMPACT-003       | [影响](/security/THREAT-MODEL-ATLAS/impact)                                           |

---

## <a id="4.-clawhub-supply-chain-analysis"></a><a id="4-clawhub-supply-chain-analysis"></a> 4. ClawHub 供应链分析

### <a id="4.1-current-security-controls"></a><a id="4-1-current-security-controls"></a> 4.1 当前安全控制

| Control                        | 执行                                                                        | 效力                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| GitHub 账号年龄             | `requireGitHubAccountAge()`（至少 14 天）                                          | 中等 - 提高新攻击者的门槛                           |
| 路径清理              | `sanitizePath()`                                                                      | 高 - 防止路径穿越                                      |
| 文件类型验证           | `isTextFile()`                                                                        | 中等 - 仅扫描文本文件，但仍可被利用             |
| 大小限制                    | 50MB 总 bundle（`MAX_PUBLISH_TOTAL_BYTES`）                                         | 高 - 防止资源耗尽                                 |
| 必需的 SKILL.md              | 发布时强制要求的说明文件                                                           | 低安全价值 - 仅用于信息说明                             |
| 静态+AST-相邻扫描 | 模式引擎涵盖执行、渗透、凭证收集、混淆等 | 中-高 - 涵盖许多已知的滥用模式，仍然基于模式 |
| 基于LLM-的代理风险审查  | 安全提示驱动的发布判决                                             | 中-高 - 捕捉错过的行为静态模式                 |
| VirusTotal 扫描            | 连接到技能和包发布 publish/rescan 流，通过操作员 API 密钥进行门控    | 启用时为高 - 静态引擎检测                         |
| 审核状态              | `moderationStatus` 字段                                                              | 中等 - 可进行人工复核                                     |

### <a id="4.2-moderation-limitations"></a><a id="4-2-moderation-limitations"></a> 4.2 审核限制

ClawHub 的静态扫描会直接检查 skill 代码内容（不仅仅是 slug/metadata/frontmatter），覆盖危险的 exec 调用、动态代码执行、凭据收集、外传模式、混淆载荷等。已知缺口包括：

- 基于模式的检测仍可能被足够新颖的混淆方式绕过。
- 基于 LLM- 的审查和 VirusTotal 扫描取决于操作员端 API keys/config 的启用。
- 一旦安装后，没有运行时执行沙箱能将 skill 与代理自身的权限隔离开来。

### <a id="4.3-badges"></a><a id="4-3-badges"></a> 4.3 徽章

Skills 和 packages 会带有由审核员分配的徽章：`highlighted`、`official`、`deprecated`、`redactionApproved`（仅 skills）。社区举报（`skillReports`）和审计日志（`auditLogs`）支持审核工作流。

---

## <a id="5.-risk-matrix"></a><a id="5-risk-matrix"></a> 5. 风险矩阵

### <a id="5.1-likelihood-vs-impact"></a><a id="5-1-likelihood-vs-impact"></a> 5.1 发生可能性与影响

| 威胁 ID     | 发生可能性 | 影响   | 风险等级   | 优先级 |
| ------------- | ---------- | -------- | ------------ | -------- |
| T-EXEC-001    | 高       | 严重 | **严重** | P0       |
| T-PERSIST-001 | 高       | 严重 | **严重** | P0       |
| T-EXFIL-003   | 中     | 严重 | **严重** | P0       |
| T-IMPACT-001  | 中     | 严重 | **高**     | P1       |
| T-EXEC-002    | 高       | 高     | **高**     | P1       |
| T-EXEC-004    | 中     | 高     | **高**     | P1       |
| T-ACCESS-003  | 中     | 高     | **高**     | P1       |
| T-EXFIL-001   | 中     | 高     | **高**     | P1       |
| T-IMPACT-002  | 高       | 中   | **高**     | P1       |
| T-EVADE-001   | 高       | 中   | **中**   | P2       |
| T-ACCESS-001  | 低        | 高     | **中**   | P2       |
| T-ACCESS-002  | 低        | 高     | **中**   | P2       |
| T-PERSIST-002 | 低        | 高     | **中**   | P2       |

### <a id="5.2-critical-path-attack-chains"></a><a id="5-2-critical-path-attack-chains"></a> 5.2 关键路径攻击链

**链 1：基于技能的数据窃取**

```text
T-PERSIST-001 → T-EVADE-001 → T-EXFIL-003
(Publish malicious skill) → (Evade moderation) → (Harvest credentials)
```

**链 2：从 prompt 注入到 RCE**

```text
T-EXEC-001 → T-EXEC-004 → T-IMPACT-001
(Inject prompt) → (Bypass exec approval) → (Execute commands)
```

**链 3：通过获取内容进行间接注入**

```text
T-EXEC-002 → T-EXFIL-001 → External exfiltration
(Poison URL content) → (Agent fetches & follows instructions) → (Data sent to attacker)
```

---

## <a id="6.-recommendations-summary"></a><a id="6-recommendations-summary"></a> 6. 建议摘要

### <a id="6.1-immediate-(p0)"></a><a id="6-1-immediate-p0"></a> 6.1 立即（P0）

| ID    | 建议                              | 涉及项                  |
| ----- | ------------------------------------------- | -------------------------- |
| R-002 | 实现技能执行沙箱化        | T-PERSIST-001, T-EXFIL-003 |
| R-003 | 为敏感操作添加输出校验 | T-EXEC-001, T-EXEC-002     |

### <a id="6.2-short-term-(p1)"></a><a id="6-2-short-term-p1"></a> 6.2 短期（P1）

| ID    | 建议                                                        | 涉及项    |
| ----- | --------------------------------------------------------------------- | ------------ |
| R-004 | 实现按发送者的速率限制                                    | T-IMPACT-002 |
| R-005 | 在静态存储时添加令牌加密                                          | T-ACCESS-003 |
| R-006 | 改进执行审批 UX 并继续扩展命令规范化 | T-EXEC-004   |
| R-007 | 为 `web_fetch` 实现 URL 白名单                            | T-EXFIL-001  |

### <a id="6.3-medium-term-(p2)"></a><a id="6-3-medium-term-p2"></a> 6.3 中期（P2）

| ID    | 建议                                                                                                                                                        | 涉及项     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| R-008 | 核心实施：分级标识符身份验证原语和审计结果；剩下的工作是每个通道 `verified` 的采用和下游强度映射器 | T-ACCESS-002  |
| R-009 | 实现配置完整性验证                                                                                                                               | T-PERSIST-003 |
| R-010 | 添加更新签名和版本固定                                                                                                                                | T-PERSIST-002 |

---

## <a id="7.-appendices"></a><a id="7-appendices"></a> 7. 附录

### <a id="7.1-atlas-technique-mapping"></a><a id="7-1-atlas-technique-mapping"></a> 7.1 ATLAS 技术映射

| ATLAS ID      | 技术名称                 | OpenClaw 威胁                                                 |
| ------------- | ------------------------------ | ---------------------------------------------------------------- |
| AML.T0006     | 主动扫描                | T-RECON-001, T-RECON-002                                         |
| AML.T0009     | 收集                     | T-EXFIL-001, T-EXFIL-002, T-EXFIL-003                            |
| AML.T0010.001 | 供应链：AI 软件      | T-PERSIST-001, T-PERSIST-002                                     |
| AML.T0010.002 | 供应链：数据             | T-PERSIST-003                                                    |
| AML.T0031     | 侵蚀 AI 模型完整性       | T-IMPACT-001, T-IMPACT-002, T-IMPACT-003                         |
| AML.T0040     | AI 模型推理 API 访问  | T-ACCESS-001, T-ACCESS-002, T-ACCESS-003, T-DISC-001, T-DISC-002 |
| AML.T0043     | 构造对抗性数据         | T-EXEC-004, T-EVADE-001, T-EVADE-002                             |
| AML.T0051.000 | LLM 提示注入：直接   | T-EXEC-001, T-EXEC-003                                           |
| AML.T0051.001 | LLM 提示注入：间接 | T-EXEC-002                                                       |

### <a id="7.2-key-security-files"></a><a id="7-2-key-security-files"></a> 7.2 关键安全文件

| 路径                                | 用途                        | 风险等级   |
| ----------------------------------- | ------------------------------ | ------------ |
| `src/infra/exec-approvals.ts`       | 命令审批逻辑         | **严重** |
| `src/gateway/auth.ts`               | 网关身份验证         | **严重** |
| `src/infra/net/ssrf.ts`             | SSRF 防护                | **严重** |
| `src/security/external-content.ts`  | 提示注入缓解    | **严重** |
| `src/agents/sandbox/tool-policy.ts` | 沙箱工具allow/deny策略 | **严重** |
| `src/routing/resolve-route.ts`      | 会话隔离 / 路由    | **中**   |

### <a id="7.3-glossary"></a><a id="7-3-glossary"></a> 7.3 术语表

| 学期                 | 定义                                                |
| -------------------- | --------------------------------------------------------- |
| **ATLAS**            | MITRE 的 AI 系统对抗性威胁全景图       |
| **ClawHub**          | OpenClaw 的技能市场                              |
| **网关**          | OpenClaw 的消息路由和身份验证层       |
| **MCP**              | 模型上下文协议 - 工具提供方接口          |
| **快速注入** | 将恶意指令嵌入输入中的攻击 |
| **技能**            | OpenClaw 代理可下载的扩展                |
| **SSRF**             | 服务端请求伪造                               |

---

_这个威胁模型是一个动态文档。向 `security@openclaw.ai` 报告安全问题或查看 [Trust page](https://trust.openclaw.ai)._

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本中的每个标题都保留其锚点，因此现有链接（例如 `/security/THREAT-MODEL-ATLAS#t-exec-002-indirect-prompt-injection`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="3.1-reconnaissance-(aml.ta0002)" /><a id="3-1-reconnaissance-aml-ta0002" />[3.1 侦察 （AML.TA0002）](/security/THREAT-MODEL-ATLAS/reconnaissance)
- <a id="t-recon-001%3A-agent-endpoint-discovery" /><a id="t-recon-001-agent-endpoint-discovery" />[T-RECON-001：代理端点发现](/security/THREAT-MODEL-ATLAS/reconnaissance#t-recon-001-agent-endpoint-discovery)
- <a id="t-recon-002%3A-channel-integration-probing" /><a id="t-recon-002-channel-integration-probing" />[T-RECON-002：渠道整合发现](/security/THREAT-MODEL-ATLAS/reconnaissance#t-recon-002-channel-integration-probing)
- <a id="3.2-initial-access-(aml.ta0004)" /><a id="3-2-initial-access-aml-ta0004" />[3.2 初始访问 （AML.TA0004）](/security/THREAT-MODEL-ATLAS/initial-access)
- <a id="t-access-001%3A-pairing-code-interception" /><a id="t-access-001-pairing-code-interception" />[T-ACCESS-001：配对码拦截](/security/THREAT-MODEL-ATLAS/initial-access#t-access-001-pairing-code-interception)
- <a id="t-access-002%3A-allowfrom-spoofing" /><a id="t-access-002-allowfrom-spoofing" />[T-ACCESS-002：AllowFrom 欺骗](/security/THREAT-MODEL-ATLAS/initial-access#t-access-002-allowfrom-spoofing)
- <a id="t-access-003%3A-token-theft" /><a id="t-access-003-token-theft" />[T-ACCESS-003：代币被盗](/security/THREAT-MODEL-ATLAS/initial-access#t-access-003-token-theft)
- <a id="3.3-execution-(aml.ta0005)" /><a id="3-3-execution-aml-ta0005" />[3.3 执行 （AML.TA0005）](/security/THREAT-MODEL-ATLAS/execution)
- <a id="t-exec-001%3A-direct-prompt-injection" /><a id="t-exec-001-direct-prompt-injection" />[T-EXEC-001：直接提示注入](/security/THREAT-MODEL-ATLAS/execution#t-exec-001-direct-prompt-injection)
- <a id="t-exec-002%3A-indirect-prompt-injection" /><a id="t-exec-002-indirect-prompt-injection" />[T-EXEC-002：间接提示注入](/security/THREAT-MODEL-ATLAS/execution#t-exec-002-indirect-prompt-injection)
- <a id="t-exec-003%3A-tool-argument-injection" /><a id="t-exec-003-tool-argument-injection" />[T-EXEC-003：工具参数注入](/security/THREAT-MODEL-ATLAS/execution#t-exec-003-tool-argument-injection)
- <a id="t-exec-004%3A-exec-approval-bypass" /><a id="t-exec-004-exec-approval-bypass" />[T-EXEC-004：执行批准绕过](/security/THREAT-MODEL-ATLAS/execution#t-exec-004-exec-approval-bypass)
- <a id="3.4-persistence-(aml.ta0006)" /><a id="3-4-persistence-aml-ta0006" />[3.4 持久性 （AML.TA0006）](/security/THREAT-MODEL-ATLAS/persistence)
- <a id="t-persist-001%3A-malicious-skill-installation" /><a id="t-persist-001-malicious-skill-installation" />[T-PERSIST-001：恶意技能安装](/security/THREAT-MODEL-ATLAS/persistence#t-persist-001-malicious-skill-installation)
- <a id="t-persist-002%3A-skill-update-poisoning" /><a id="t-persist-002-skill-update-poisoning" />[T-PERSIST-002：技能更新中毒](/security/THREAT-MODEL-ATLAS/persistence#t-persist-002-skill-update-poisoning)
- <a id="t-persist-003%3A-agent-configuration-tampering" /><a id="t-persist-003-agent-configuration-tampering" />[T-PERSIST-003：代理配置篡改](/security/THREAT-MODEL-ATLAS/persistence#t-persist-003-agent-configuration-tampering)
- <a id="3.5-defense-evasion-(aml.ta0007)" /><a id="3-5-defense-evasion-aml-ta0007" />[3.5 防御规避 （AML.TA0007）](/security/THREAT-MODEL-ATLAS/defense-evasion)
- <a id="t-evade-001%3A-moderation-pattern-bypass" /><a id="t-evade-001-moderation-pattern-bypass" />[T-EVADE-001：审核模式绕过](/security/THREAT-MODEL-ATLAS/defense-evasion#t-evade-001-moderation-pattern-bypass)
- <a id="t-evade-002%3A-content-wrapper-escape" /><a id="t-evade-002-content-wrapper-escape" />[T-EVADE-002：内容包装转义](/security/THREAT-MODEL-ATLAS/defense-evasion#t-evade-002-content-wrapper-escape)
- <a id="3.6-discovery-(aml.ta0008)" /><a id="3-6-discovery-aml-ta0008" />[3.6 发现 （AML.TA0008）](/security/THREAT-MODEL-ATLAS/discovery)
- <a id="t-disc-001%3A-tool-enumeration" /><a id="t-disc-001-tool-enumeration" />[T-DISC-001：工具枚举](/security/THREAT-MODEL-ATLAS/discovery#t-disc-001-tool-enumeration)
- <a id="t-disc-002%3A-session-data-extraction" /><a id="t-disc-002-session-data-extraction" />[T-DISC-002：会话数据提取](/security/THREAT-MODEL-ATLAS/discovery#t-disc-002-session-data-extraction)
- <a id="3.7-collection-and-exfiltration-(aml.ta0009%2C-aml.ta0010)" /><a id="3-7-collection-and-exfiltration-aml-ta0009-aml-ta0010" />[3.7 收集和渗漏（AML.TA0009、AML.TA0010）](/security/THREAT-MODEL-ATLAS/collection-and-exfiltration)
- <a id="t-exfil-001%3A-data-theft-via-web_fetch" /><a id="t-exfil-001-data-theft-via-web_fetch" />[T-EXFIL-001：通过web_fetch](/security/THREAT-MODEL-ATLAS/collection-and-exfiltration#t-exfil-001-data-theft-via-web_fetch)窃取数据
- <a id="t-exfil-002%3A-unauthorized-message-sending" /><a id="t-exfil-002-unauthorized-message-sending" />[T-EXFIL-002：未经授权的消息发送](/security/THREAT-MODEL-ATLAS/collection-and-exfiltration#t-exfil-002-unauthorized-message-sending)
- <a id="t-exfil-003%3A-credential-harvesting" /><a id="t-exfil-003-credential-harvesting" />[T-EXFIL-003：凭证收集](/security/THREAT-MODEL-ATLAS/collection-and-exfiltration#t-exfil-003-credential-harvesting)
- <a id="3.8-impact-(aml.ta0011)" /><a id="3-8-impact-aml-ta0011" />[3.8 冲击 （AML.TA0011）](/security/THREAT-MODEL-ATLAS/impact)
- <a id="t-impact-001%3A-unauthorized-command-execution" /><a id="t-impact-001-unauthorized-command-execution" />[T-IMPACT-001：未经授权的命令执行](/security/THREAT-MODEL-ATLAS/impact#t-impact-001-unauthorized-command-execution)
- <a id="t-impact-002%3A-resource-exhaustion-(dos)" /><a id="t-impact-002-resource-exhaustion-dos" />[T-IMPACT-002：资源耗尽（DoS）](/security/THREAT-MODEL-ATLAS/impact#t-impact-002-resource-exhaustion-dos)
- <a id="t-impact-003%3A-reputation-damage" /><a id="t-impact-003-reputation-damage" />[T-IMPACT-003：声誉受损](/security/THREAT-MODEL-ATLAS/impact#t-impact-003-reputation-damage)

## <a id="related"></a> 相关内容

- [为威胁模型做贡献](/security/CONTRIBUTING-THREAT-MODEL)
- [事件响应](/security/incident-response)
- [网络代理](/security/network-proxy)
- [形式化验证](/security/formal-verification)
