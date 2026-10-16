---
doc-schema-version: 1
summary: "扩展稳定验证调度、仅更改日志发布 SHA 重用、覆盖政策以及 Telegram 延期和豁免"
title: "扩展稳定和仅更改日志验证"
read_when:
  - "验证延长稳定的候选者"
  - "重用仅更改日志版本 SHA 的证据"
  - "检查 npm-beta-v1 和 npm-stable-v1 覆盖策略"
---

## <a id="extended-stable-validation"></a> 扩展稳定验证

扩展稳定验证使用相同的候选者拥有的助手：确切的源候选者 C 也拥有资格 Q=C。独立信任的 P 承认并验证该请求。将这些角色和选定的发布上下文分开；在冻结之前故意向后移植缺失的资格合同 C。

```bash
VALIDATION_SHA="<exact-candidate-sha>"
PUBLISHER_SHA="<recorded-full-trusted-main-ancestor-sha>"
CONTEXT_REF="extended-stable/YYYY.M.33"
pnpm ci:full-release \
  --sha "$VALIDATION_SHA" \
  --target-ref "$CONTEXT_REF" \
  --admission-workflow-sha "$PUBLISHER_SHA" \
  --admission-workflow-ref main \
  -f validation_purpose=publish \
  -f publication_selection_json='{"route":"extended-stable","npmDistTag":"extended-stable","publishOpenclawNpm":true,"pluginPublishScope":"all-publishable","plugins":[]}' \
  -f release_profile=stable \
  -f run_release_soak=true \
  -f fail_fast=false \
  -f rerun_group=all \
  -f reuse_evidence=false \
  -f dispatch_release_evidence=false
```

独立接纳后，帮助程序在 Q=C 处创建 `release-ci/<Q-prefix>-<unique-id>` 并从该不可变的命名分支进行调度。它传递的确切候选值为 `ref` 和 `expected_sha`，发布分支位于 `target_context_ref`。 GitHub 工作流调度 `--ref` 接受分支或标签，而不是原始 SHA。发布分支提供上下文，而不是资格权限。切勿手动创建传输参考或替换移动主harness。

共享发布者需要承认的候选人拥有的证据、完整的 `rerun_group=all` 覆盖范围以及确切的成功尝试。其受保护的 `release-publish/*` 参考选择 P，而不是 Q。发布工具更新不会更改冻结的候选人或资格身份。保留的历史交叉修订请求保留其原始恢复合同；新的显式 main/protected 诊断运行不能替代 Q=C 发布证明。

产品或资格harness维修更改 C/Q 并需要新的资格。提供者、批准或运行者恢复保留原始身份和输入。不要因为目标较旧而省略所需的包、安装程序、更新、频道或实时行为。

对于合格代码 SHA 已包含最终注释的常规版本，请使用与 **Release SHA** 相同的提交。保留其成功的完整验证母体和精确准备的发布工件；仅需要分离这些角色就不需要额外的提交或验证运行。

如果注释在限定后发生更改，请将选定的版本条目及其允许的 record/index 更新提交为新版本 SHA 并为该提交运行相同的帮助程序。产品证据重用是可选的，需要 GitHub 来证明版本 SHA 源自绿色代码 SHA。完整的更改路径集必须包括 `CHANGELOG/YYYY.M.PATCH.md`，也可能仅包括 `CHANGELOG.md` 和 `CHANGELOG/records/YYYY.M.PATCH.md`。 Entry/record 允许添加或修改；只能修改根索引。重命名、删除、其他发布文件和文档源编辑不符合资格。该路径记录`split-changelog-release-v1`；历史仅根收据保留其 `changelog-only-release-v1` 合约。重用仍然限定已更改的包和图像字节。任何其他源更改都会返回完整的代码验证。发布顺序请参见 [Releasing](/reference/RELEASING)。

概念阶段映射到当前输入：

- `beta-publish`: `release_profile=beta`, `run_release_soak=false`
- `postpublish-confidence`：`validation_purpose=postpublish-confidence`，无出版物选择，精确发布的包加上 `run_release_soak=true` 或明确的焦点小组
- `stable-publish`: `release_profile=stable`

对于其匹配的发布分支或 beta 标签上的实际 beta 包，`all` 带有 `release_profile=beta` 并且没有浸泡记录 `coveragePolicy=npm-beta-v1`。它保留了 Linux、macOS 和 Windows、Node 检查、Control UI、插件、包完整性、install/update 验收、Linux/Windows/macOS 交叉 OS 包检查、 QA 奇偶校验、核心运行时-pair/restart 证明以及运行时工具覆盖范围。本机应用程序资格、产品性能和已发布包 Telegram 置信度均被推迟。 Broad live/E2E 和 QA-live 也保留在该有界门之外。

使用 `run_release_soak=true` 针对确切发布的 Beta 运行延迟置信度，或显式选择 `ci`、`performance`、`npm-telegram`、`package` 或相关 QA/live 组。被选中的孩子仍必须完成并通过现有政策；延迟检查是**未运行**，从未通过。稳定、完整、可浸泡且有针对性的验证保留了现有的置信覆盖范围。 `main` 和非 Beta 版目标不符合 `npm-beta-v1` 的条件。

对于其匹配发布分支或标签上的常规最终包，带有 `release_profile=stable` 的 `all` 记录 `coveragePolicy=npm-stable-v1` 并使用 CI 的 `npm-stable` 范围。数字更正合格，包括未更改的基础包，其基础标签解析为相同的源 SHA。此策略仅延迟 macOS、Swift/OpenClawKit、iOS/Watch、Android 和本机 i18n。仍然需要 Linux、macOS 和 Windows Node 覆盖范围、Control UI、插件、软件包和安装程序验收、QA、稳定的浸泡和阻塞产品性能。扩展稳定、无发布上下文的 `main`、`full` 和显式 `ci` 运行保留完整的 CI。证据重用需要相同的覆盖政策、准确的包版本、目标上下文和有效的输入；测试版或历史完整收据不能默默取代稳定的 npm 资格。

本土出版物拥有延期资格。对于 npm- 稳定版本，`OpenClaw Release Publish` 启动精确源完整 CI 运行，并与核心发布并行启用 Android。只有成功的本地资格和核心发布才允许单独的 Android 作业发出 v3 批准收据并分派标签拥有的 APK 发布者。该收据绑定了确切的本机 CI 运行、尝试和工具参考。发布者在撰写批准之前、在发送之前、在 APK 证明之前以及每次资产上传之前重新检查该证明。没有v3消费者的冻结标签，包括`v2026.8.2`及其同源更正，必须使用`release_profile=full`；在开始核心出版物之前，出版物仅拒绝 npm- 这些目标的证据。他们历史上的全面验证路线保留了 v2 批准合同。记录本机故障并阻止 Android 批准，而核心 npm 发布和 GitHub 发布最终确定保持独立。核心发布完成后，家长可以继续积极参与本地工作。 macOS 保留其单独的本机验证、签名、公证和升级门。稳定的npm出版物仍然拒绝证据，没有浸泡和阻碍产品性能。

macOS 应用程序签名、公证、appcast 发布和 Windows Hub 资产推广与 npm 发布并行或在发布之后运行，并且绝不延迟 npm。他们自己的工件验证和升级门仍然适用；在常规 GitHub 版本离开草案之前，仍然需要 Windows 集线器资产。

包验收通常从已解析的 `ref` 构建候选 tarball，包括随 `pnpm ci:full-release` 调度的完整 SHA 运行。 Beta 版发布后，传递 `release_package_spec=openclaw@YYYY.M.PATCH-beta.N` 以在发布检查、包验收、跨 OS、发布路径 Docker 和包 Telegram 中重复使用已发货的 npm 包。仅当包裹验收应有意证明不同的包裹时才使用 `package_acceptance_package_spec`。 Codex插件实时包通道遵循相同的状态：发布的`release_package_spec`值派生`codex_plugin_spec=npm:@openclaw/codex@<version>`； SHA/artifact 运行所选参考中的包 `extensions/codex`；操作员可以直接为 `npm:`、`npm-pack:` 或 `git:` 插件源设置 `codex_plugin_spec`。该通道授予该插件所需的显式 Codex CLI 安装批准，然后运行 ​​Codex CLI 预检和同一会话 OpenAI 代理轮流。它最后的零重试、中等思维转向发送可见的进度，省略 Codex `final`，读取随机工作区输入，写入其确切的工件，并发送显式完成。这捕获了 v2026.7.1 回归，其中普通进度发送终止了回合。

选定源 Telegram QA 和独立 npm Telegram 测试必须先通过，然后才能通过正常发布验证。选定的包验收 Telegram 也必须在每个配置文件中传递。缺少凭证、耗尽池和失败的尝试不算作成功的证明。仍然需要准确的候选人身份、凭证隔离和租约清理。

包验收 Telegram E2E 对于每个在不浸泡的情况下运行的 beta 配置文件 `all` 都会自动推迟，包括 `main` 的 beta 配置文件检查。有效的 `skip_package_telegram_e2e=true` 在输入和摘要中捕获为 **not run**。默认情况下，启用浸泡的运行和显式 `rerun_group=package` 会保持选中 Telegram。现有的 `-f skip_package_telegram_e2e=true` 输入仍然可用于显式 Beta 延迟；它被 `stable` 和 `full` 拒绝，并且不会禁用重点 `rerun_group=npm-telegram` 工作流程。

选定的测试要求与明确的遗漏是分开的。经审核的 Telegram- 仅有 `2026.8.1-owner-approved` 和 `2026.9.1-owner-approved` 例外。已审查的 Telegram 和 Matrix QA-live 例外是 `2026.9.5-owner-approved`、`2026.9.7-owner-approved`、`2026.9.8-owner-approved` 和 `2026.9.9-owner-approved`。使用 `-f telegram_waiver=<value>` 传递所选值。任何未来的异常都需要经过审查的代码更改；单独匹配的 `<target-version>-owner-approved` 字符串不是授权。该值必须命名已验证目标的实际 `package.json` 版本，密封的候选版本必须匹配，并且配置文件必须是 `stable` 或 `full`。 Beta、预发布和未列出的目标将被拒绝。包规格覆盖必须完全是 `openclaw@<target-version>`；空白规格选择密封候选。它省略了源 Telegram QA、包验收 Telegram E2E 和已发布的包 Telegram E2E；他们的证据表明 **已放弃/未运行**，从未通过。 Telegram 单元测试和所有其他选定的门保持活动状态，包括稳定浸泡和性能检查。显式 Telegram 重新运行或套件过滤器（包括选择 Telegram 的 `qa-live` 或 `qa-live-non-slack` 等聚合）与豁免冲突并被拒绝。声明和目标版本绑定不可变的执行计划、清单和重用标识；发布者将豁免纳入发布验证说明中。上述仅限测试版的套餐延期保持不变。

源 Telegram QA 使用发布检查的共享上下文检查：确切的候选 SHA 必须保留其发布分支的祖先，或者等于其发布标记。构建和执行准入都独立地重复该检查并保留候选版本、signature/merge-attribution 和实时维护者检查。推进发布分支不会选择新的候选分支或使旧的候选分支失效。
