---
summary: "OpenClaw 持久性威胁 （AML.TA0006）：T-PERSIST-001、T-PERSIST-002、T-PERSIST-003"
title: "持久性 （AML.TA0006）"
read_when:
  - "检查针对 OpenClaw 部署的持久性威胁"
  - "致力于 T-PERSIST-001、T-PERSIST-002、T-PERSIST-003 的缓解措施"
---

[MITRE ATLAS](https://atlas.mitre.org/) 框架的持久性策略 （AML.TA0006） 中的威胁。每个条目都列出了 ATLAS 技术、攻击向量、受影响的组件、当前的缓解措施、残余风险和建议。

这些威胁跨越的信任边界和数据流在 [ 威胁模型索引](/security/THREAT-MODEL-ATLAS) 中定义，该索引还包含风险矩阵、建议摘要和 ATLAS 技术映射。

## <a id="t-persist-001%3A-malicious-skill-installation"></a><a id="t-persist-001-malicious-skill-installation"></a> T-PERSIST-001：恶意技能安装

| 属性               | 值                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0010.001 - 供应链 compromise：AI 软件                                                                      |
| **描述**         | 攻击者向 ClawHub 发布恶意技能                                                                           |
| **攻击向量**       | 创建账户，发布包含隐藏恶意代码的技能                                                                  |
| **受影响组件** | ClawHub、技能加载、代理执行                                                                                   |
| **当前缓解措施** | GitHub账户年龄验证，静态pattern/AST-adjacent扫描，LLM-基于代理风险审查，VirusTotal扫描 |
| **残余风险**       | 高 - 虽然存在检测层，但技能仍以代理权限运行且没有执行沙箱                      |
| **建议**     | 技能执行沙箱化、扩大社区审查                                                                     |

## <a id="t-persist-002%3A-skill-update-poisoning"></a><a id="t-persist-002-skill-update-poisoning"></a> T-PERSIST-002：技能更新中毒

| 属性               | 值                                                                   |
| ----------------------- | ----------------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0010.001 - 供应链 compromise：AI 软件                    |
| **描述**         | 攻击者入侵一个热门技能并推送恶意更新      |
| **攻击向量**       | 账户被攻陷、对技能所有者进行社会工程学                   |
| **受影响组件** | ClawHub 版本控制、自动更新流程                                   |
| **当前缓解措施** | 版本指纹识别，moderation/scanning 在新版本上重新运行      |
| **残余风险**       | 高 - 自动更新可能在审查完成前拉取到恶意版本 |
| **建议**     | 更新签名、回滚能力、版本固定                    |

## <a id="t-persist-003%3A-agent-configuration-tampering"></a><a id="t-persist-003-agent-configuration-tampering"></a> T-PERSIST-003：代理配置篡改

| 属性               | 值                                                           |
| ----------------------- | --------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0010.002 - 供应链 compromise：数据                   |
| **描述**         | 攻击者修改代理配置以维持访问         |
| **攻击向量**       | 配置文件修改、设置注入                    |
| **受影响组件** | Agent 配置、工具策略                                     |
| **当前缓解措施** | 文件权限                                                |
| **残余风险**       | 中 - 需要本地访问                                  |
| **建议**     | 配置完整性验证、配置更改审计日志 |
