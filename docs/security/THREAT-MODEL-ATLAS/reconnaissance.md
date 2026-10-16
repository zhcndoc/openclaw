---
summary: "OpenClaw 侦察威胁 （AML.TA0002）：T-RECON-001、T-RECON-002"
title: "侦察（AML.TA0002）"
read_when:
  - "审查针对 OpenClaw 部署的侦察威胁"
  - "致力于 T-RECON-001、T-RECON-002 的缓解措施"
---

[MITRE ATLAS](https://atlas.mitre.org/) 框架的侦察战术 （AML.TA0002） 中的威胁。每个条目都列出了 ATLAS 技术、攻击向量、受影响的组件、当前的缓解措施、残余风险和建议。

这些威胁跨越的信任边界和数据流在 [ 威胁模型索引](/security/THREAT-MODEL-ATLAS) 中定义，该索引还包含风险矩阵、建议摘要和 ATLAS 技术映射。

## <a id="t-recon-001%3A-agent-endpoint-discovery"></a><a id="t-recon-001-agent-endpoint-discovery"></a> T-RECON-001：代理端点发现

| 属性               | 值                                                                |
| ----------------------- | -------------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0006 - 主动扫描                                          |
| **描述**         | 攻击者扫描暴露的 OpenClaw 网关端点                |
| **攻击向量**       | 网络扫描、Shodan 查询、DNS 枚举                    |
| **受影响组件** | 网关、暴露的 API 端点                                       |
| **当前缓解措施** | Tailscale 认证选项，默认绑定到回环地址                   |
| **残余风险**       | 中 - 公共网关可被发现                                |
| **建议**     | 记录安全部署方式，在发现端点上添加速率限制 |

<a id="t-recon-002-channel-integration-probing" />

## <a id="t-recon-002%3A-channel-integration-discovery"></a><a id="t-recon-002-channel-integration-discovery"></a> T-RECON-002：渠道集成发现

| 属性               | 值                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| **ATLAS ID**            | AML.T0006 - 主动扫描                                        |
| **描述**         | 攻击者检查消息通道以识别 AI- 托管帐户 |
| **攻击向量**       | 发送测试消息、观察响应模式                 |
| **受影响组件** | 所有通道集成                                           |
| **当前缓解措施** | 无特定措施                                                      |
| **残余风险**       | 低 - 仅靠发现本身价值有限                           |
| **建议**     | 考虑对响应时间进行随机化                             |
