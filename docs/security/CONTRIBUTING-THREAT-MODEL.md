---
title: "Contributing to the Threat Model"
summary: "How to contribute to the OpenClaw threat model"
read_when:
  - You want to contribute security findings or threat scenarios
  - Reviewing or updating the threat model
---

# Contributing to the OpenClaw Threat Model

感谢您帮助提升 OpenClaw 的安全性。该威胁模型是一个不断完善的文档，我们欢迎任何人的贡献 —— 您无需成为安全专家。

## 贡献方式

### 添加威胁

发现了我们尚未覆盖的攻击向量或风险？请在 [openclaw/trust](https://github.com/openclaw/trust/issues) 提交 Issue，并用您自己的话描述它。您不需要了解任何框架或填写所有字段 —— 只需描述该场景即可。

**建议包含的信息（非必需）：**

- 攻击场景及其利用方式
- 影响到 OpenClaw 的哪些部分（CLI、网关、频道、ClawHub、MCP 服务器等）
- 您认为风险的严重程度（低 / 中 / 高 / 危急）
- 相关研究、CVE 或现实案例的链接

我们会在评审时负责 ATLAS 映射、威胁 ID 和风险评估。如果您愿意包含这些细节也很好，但并非必须。

> **此项用于补充威胁模型，而非报告实时漏洞。** 如果您发现了可利用的漏洞，请参见我们的 [Trust 页面](https://trust.openclaw.ai) 获取负责任披露的指南。

### 建议缓解措施

有解决现有威胁的想法？请提出 Issue 或 PR 并引用相关威胁。有效的缓解措施应具体且可执行 —— 比如“在网关处设定每个发送者每分钟最多10条消息的速率限制” 优于 “实施速率限制”。

### 提出攻击链

攻击链展示了多个威胁如何组合成一个真实的攻击场景。如果您发现危险的组合，描述攻击步骤以及攻击者如何将它们串联起来。对攻击实际展开过程的简短叙述比正式模板更有价值。

### 修正或完善现有内容

拼写错误、说明不清、信息过时、更好的示例 —— 欢迎提交 PR，无需 Issue。

## 我们使用的标准

### MITRE ATLAS

此威胁模型基于 [MITRE ATLAS](https://atlas.mitre.org/)（针对 AI 系统的对抗威胁景观）框架，专门设计用于应对如提示注入、工具滥用和代理利用等 AI/ML 威胁。您不需要了解 ATLAS 即可贡献 —— 我们会在评审时完成映射。

### 威胁 ID

每条威胁有一个 ID，如 `T-EXEC-003`。类别如下：

| 代码     | 类别                           |
| -------- | ------------------------------ |
| RECON    | 侦察 - 信息收集               |
| ACCESS   | 初始访问 - 获得入口           |
| EXEC     | 执行 - 运行恶意操作           |
| PERSIST  | 持续存在 - 维持访问           |
| EVADE    | 防御规避 - 避免检测           |
| DISC     | 发现 - 了解环境               |
| EXFIL    | 渗漏 - 窃取数据               |
| IMPACT   | 影响 - 损害或中断             |

ID 由维护者在评审时分配，您无需选择。

### 风险级别

| 等级         | 含义                                                               |
| ------------ | ------------------------------------------------------------------ |
| **危急**     | 完全系统妥协，或高概率结合危急影响                                 |
| **高**       | 可能造成重大损害，或中概率结合危急影响                             |
| **中**       | 中等风险，或低概率结合高影响                                       |
| **低**       | 不太可能且影响有限                                                 |

如果您不确定风险级别，只需描述影响，我们会进行评估。

## 评审流程

1. **初筛** – 新提交会在48小时内进行审查
2. **评估** – 验证可行性，分配 ATLAS 映射和威胁 ID，确认风险等级
3. **文档整理** – 确认格式完整
4. **合并** – 添加进威胁模型及可视化图表

## 资源链接

- [ATLAS 官网](https://atlas.mitre.org/)
- [ATLAS 技术列表](https://atlas.mitre.org/techniques/)
- [ATLAS 案例研究](https://atlas.mitre.org/studies/)
- [OpenClaw 威胁模型](/security/THREAT-MODEL-ATLAS)

## 联系方式

- **安全漏洞报告：** 请参见我们的 [Trust 页面](https://trust.openclaw.ai) 了解报告流程
- **威胁模型相关问题：** 在 [openclaw/trust](https://github.com/openclaw/trust/issues) 提交 Issue
- **一般讨论：** Discord #security 频道

## 致谢

威胁模型的贡献者会被列入模型致谢、发布说明，以及 OpenClaw 安全部分名人堂（针对重大贡献）。
