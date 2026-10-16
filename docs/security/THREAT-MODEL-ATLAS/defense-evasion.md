---
summary: "OpenClaw 防御规避威胁（AML.TA0007）：T-EVADE-001、T-EVADE-002"
title: "防御规避（AML.TA0007）"
read_when:
  - "检查针对 OpenClaw 部署的防御规避威胁"
  - "致力于 T-EVADE-001、T-EVADE-002 的缓解措施"
---

[MITRE ATLAS](https://atlas.mitre.org/) 框架的防御规避策略（AML.TA0007）中的威胁。每个条目都列出了 ATLAS 技术、攻击向量、受影响的组件、当前的缓解措施、残余风险和建议。

这些威胁跨越的信任边界和数据流在 [ 威胁模型索引](/security/THREAT-MODEL-ATLAS) 中定义，该索引还包含风险矩阵、建议摘要和 ATLAS 技术映射。

## <a id="t-evade-001%3A-moderation-pattern-bypass"></a><a id="t-evade-001-moderation-pattern-bypass"></a> T-EVADE-001：审核模式绕过

| 属性               | 值                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0043 - 构造对抗性数据                                                    |
| **描述**         | 攻击者构造技能内容以规避 ClawHub 的审核检查                      |
| **攻击向量**       | Unicode 同形异义字符、编码技巧、动态加载                                  |
| **受影响组件** | ClawHub moderation/scanning 管道                                                  |
| **当前缓解措施** | 静态模式规则，AST- 相邻代码扫描，LLM 代理风险审查，VirusTotal |
| **残余风险**       | 中 - 新型混淆仍可能绕过分层启发式规则                     |
| **建议**     | 随着新逃逸行为的发现，继续扩展 pattern/behavioral 语料库            |

## <a id="t-evade-002%3A-content-wrapper-escape"></a><a id="t-evade-002-content-wrapper-escape"></a> T-EVADE-002：内容包装转义

| 属性               | 值                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0043 - 构造对抗性数据                                                                            |
| **描述**         | 攻击者构造可逃逸外部内容包装上下文的内容                                     |
| **攻击向量**       | 标签操纵、上下文混淆、指令覆盖                                                     |
| **受影响组件** | 外部内容包裹                                                                                     |
| **当前缓解措施** | 随机边界 XML- 样式标记 + 安全通知，加上 homoglyph/whitespace-variant 标记欺骗检测 |
| **残余风险**       | 中 - 新型逃逸方式不断被发现                                                                   |
| **建议**     | 除输入侧包装外，还应增加输出侧验证                                                     |
