---
doc-schema-version: 1
summary: "要保留哪些完整发布验证证据、阻止通道结果以及支持工作流程文件"
title: "保留证据"
read_when:
  - "验证通过后记录发布证据"
---

## <a id="evidence-to-keep"></a> 需保留的证据

保留 `Full Release Validation` 摘要作为发布级索引。它链接子运行 ID 并包含最慢作业表。将故障分类为产品、harness/tooling/provenance、infrastructure/credential 或包装。只有确认的产品故障才会更改代码 SHA。使用一种诊断，需要时进行一种修复，然后进行一次狭窄的重试，然后重新评估；不自动重新运行 `all`。狭义证据本身并不发布授权。

为每个失败的测试决定阻断剂或薄片。每个选定的失败都会阻止发布。

Beta、稳定版和全面验证需要 Linux、Windows 和 macOS 网关跨 OS 安装和升级通道。清单记录了他们的实际结论，失败会阻止发布决定。保留诊断工件；切勿将失败、遗漏或延迟的车道报告为已通过。

对于常规版本，请记录代码 SHA 和版本 SHA，即使它们是相同的提交。在这种情况下，请保留成功的完整验证父级及其为这两个角色准备的确切发布工件。对于使用证据重用的后续仅更改日志版本 SHA，还记录重用策略、完整的更改路径集、绿色代码 SHA 父运行和版本 SHA 父运行。对于扩展稳定版，记录发布分支、确切版本 SHA、接受的生产者身份、父运行 ID 和尝试、工作流程引用、每个子运行以及任何冻结目标兼容性修复或故意遗漏。

有用的工件：

- 尝试一号 `full-release-execution-plan-<parent-run-id>` 和当前的 `full-release-validation-<parent-run-id>-<attempt>` 清单保留源事实和注册表准入，包括观察、精确选择、不可变的上传身份和准入时间新鲜度。重用保留不同的原始记录和当前记录，而无需重新标记。身份验证需要原始成功的准入和受保护的上传，而不是整体成功的 sealer 作业：中断的 sealer 仍然可以编写并上传完整的计划。后来的尝试从未取代最初的工件。
- `release-package-under-test`，来自 `OpenClaw Release Checks`
- `.artifacts/docker-tests/` 下的 Docker 发布路径工件
- Package Acceptance 的 `package-under-test` 和 Docker 验收工件
- Cross-OS 每个 OS 和套件的发布检查工件
- QA parity、runtime parity，以及选定的 Matrix、Buzz、Telegram、Discord、 WhatsApp 或 Slack 工件

读者验证保留的证据；它们不会刷新注册表观察结果，也不会在当前时钟之前使其过期。注册管理机构准入并不是发布授权，也不是注册管理机构状态不变的承诺。最终作者保留自己的信任、批准、内容和回读检查。已知的封闭证据在扇出之前已进行预算，但后来 job/attempt 的增长仍然可能超过未更改的最终工件限制并导致密封失败；证据不会被截断以适应。

## <a id="workflow-files"></a> 工作流文件

- `.github/workflows/full-release-validation.yml`
- `.github/workflows/full-release-candidate.yml`
- `.github/workflows/openclaw-release-checks.yml`
- `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml`
- `.github/workflows/plugin-prerelease.yml`
- `.github/workflows/install-smoke.yml`
- `.github/workflows/install-smoke-reusable.yml`
- `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- `.github/workflows/package-acceptance.yml`
- `.github/workflows/openclaw-performance.yml`
- `.github/workflows/npm-telegram-beta-e2e.yml`
