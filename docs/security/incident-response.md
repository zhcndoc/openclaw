---
summary: "OpenClaw 如何分诊、响应并跟进安全事件"
title: "事件响应"
read_when:
  - "响应安全报告或疑似安全事件"
  - "准备协调披露或已修补的安全发布"
  - "审查事件后的跟进要求"
---

## <a id="1.-detection-and-triage"></a><a id="1-detection-and-triage"></a> 1. 检测与分诊

安全信号来自：

- GitHub 安全公告（GHSA）和私有漏洞报告。
- 公开 GitHub issues/discussions（当报告不敏感时）。
- 自动化信号：Dependabot、CodeQL、npm 安全公告、密钥扫描。

初始分诊：

1. 确认受影响的组件、版本和信任边界影响。
2. 使用 `SECURITY.md` 的范围和范围外规则，将分类为与 hardening/no-action 相比的安全问题。
3. 事件负责人作出相应响应。

## <a id="2.-severity"></a><a id="2-severity"></a> 2. 严重性

| 严重性 | 定义                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 严重 | Package/release/repository 妥协、主动利用或未经身份验证的信任边界旁路，具有高影响力的控制或数据暴露。                                       |
| 高     | 经过验证的信任边界绕过需要有限的先决条件（例如，经过身份验证但未经授权的高影响力操作），或暴露 OpenClaw- 拥有的敏感凭证。 |
| 中   | 包/发布/仓库被攻破、正在进行的利用，或未经身份验证的信任边界绕过，且具有高影响的控制或数据暴露。                                                                      |
| 低      | 深度防御发现、小范围拒绝服务或没有经过证实的信任边界旁路的 hardening/parity 漏洞。                                                  |

## <a id="3.-response"></a><a id="3-response"></a> 3. 响应

1. 向报告者确认已收到（涉及敏感信息时私下确认）。
2. 在受支持的版本和最新的 `main` 上复现问题，然后实现并验证补丁，同时提供回归覆盖。
3. Critical/high：尽快准备修补版本。
4. Medium/low：正常发布流程中的补丁和文档缓解指南。

## <a id="4.-communication-and-disclosure"></a><a id="4-communication-and-disclosure"></a> 4. 通信与披露

通过受影响存储库中的 GitHub 安全公告进行沟通，发布修复版本的 notes/changelog 条目，并直接报告者跟进状态和解决方案。

Critical/high 事件得到协调披露，并在适当的时候发布 CVE。低风险强化结果可能会记录在发行说明或公告中，而无需 CVE，具体取决于影响和用户暴露程度。

## <a id="5.-recovery-and-follow-up"></a><a id="5-recovery-and-follow-up"></a> 5. 恢复与跟进

在发布修复后：

1. 在 CI 和发布构件中验证修复措施。
2. 进行一次简短的事后复盘：时间线、根本原因、检测缺口、预防计划。
3. 添加后续 hardening/tests/docs 任务并跟踪它们的完成情况。

## <a id="related"></a> 相关内容

- [安全策略](https://github.com/openclaw/openclaw/blob/main/SECURITY.md) — 报告范围和信任模型。
- [威胁模型](/security/THREAT-MODEL-ATLAS)
- [贡献于威胁模型](/security/CONTRIBUTING-THREAT-MODEL) — 如何向实时威胁模型添加威胁；不是报告实时漏洞的路径。
- [形式验证](/security/formal-verification) — 机器检查的授权、会话隔离和工具门控模型。
- [操作员事件响应](/gateway/security/operator-incident-response) — 在您自己的网关遭受可疑危害后遏制、轮换、审核和收集证据。
