---
doc-schema-version: 1
summary: "完整发布验证伞阶段矩阵、证据重用、工件生成器和决策状态"
title: "顶级舞台"
read_when:
  - "读取伞级矩阵"
  - "调试发布决策或诊断耗尽状态"
---

## <a id="top-level-stages"></a> 顶层阶段

对于 `rerun_group=all`，首先运行 `Check for reusable validation evidence` 作业。它寻找具有相同发布配置文件、覆盖策略、有效浸泡设置和验证输入的最新先前绿色完整验证。精确目标重新运行使用 `exact-target-full-validation-v1`。其完整增量包括所选 `CHANGELOG/YYYY.M.PATCH.md` 且仅该条目、其匹配的 `CHANGELOG/records/YYYY.M.PATCH.md` 和根 `CHANGELOG.md` 的后代使用 `split-changelog-release-v1`。 Entry/record 允许添加或修改以及索引修改；重命名、删除、其他版本和文档源编辑均被拒绝。历史仅根收据保留 `changelog-only-release-v1`。在任一变更日志策略下，都会跳过每个产品通道，验证者独立地重新检查 GitHub 提交比较、不可变的父工件、子运行和调度日志。任何其他目标更改都需要新的代码 SHA 验证。通过 `reuse_evidence=false` 强制进行新的全程运行。证据重用仅从 `main` 或标准 SHA- 固定 `release-ci/*` 引用运行，其工作流程提交保留在受信任的 `main` 沿袭上；其他工作流程裁判会重新运行选定的通道。

重用搜索在加载其子运行、作业日志和执行计划之前检查每个绑定父清单的资格。不兼容的配置文件、输入、目标和非根运行会被提前拒绝。合格的候选者在重新使用之前仍需经过完整的出处和尝试验证。验证者同时读取独立的子项（最多七个），保留每次尝试的作业数据以进行策略检查，并在报告成功或失败之前等待所有读取。每个子项中的尝试和分页仍然是连续的。目标解析和重用检查仅包括其工具和发布元数据；两者都不需要完整的源代码树。

即使其源父级失败、被取消或仍处于活动状态，子级调度也可以重复使用单个绿色子级的密封收据。它最多扫描 100 个最近的调度运行，检查最多 40 个目标收据库存，并在两分钟内完全验证每个角色最多 5 个匹配的收据。其他目标和其他工具的运行不会消耗五次验证预算。目标、角色、非空调度 inputs/defaults 和候选描述符字节必须匹配；空字符串输入等于缺失输入，因为 GitHub 从 `github.event.inputs` 中省略了它们。子级的工具 SHA 必须等于当前父级的工具 SHA 并且仍然是主要祖先。工装块调度缺失或不同；不存在惰性路径异常。调度日志解释每个评估的拒绝，识别重复使用的子项，并总结跳过的运行和新的调度。计划密封、收集器和最终验证重复工具和收货检查。

全面验证启动独立的 npm 和 Docker 生产者通过 `full-release-artifacts.yml` 运行。只读 `openclaw-npm-preflight.yml` 一起启动源、SDK、依赖项和包准备。当单个 root/core 构建和包完成时，包内容和生命周期检查开始。早期的 `openclaw-npm-package-descriptor-<run-id>-<attempt>` 工件还可以在资格继续进行的同时解锁候选人准备工作。最终资格将加入每一个成功的精确源证明并密封相同的 tarball 字节。对于发布 `npm-shrinkwrap.json` 的遗留候选者，在发出包描述符之前，准备工作会根据收缩包装的根声明和已安装的包条目检查打包的根清单。 Tarball 资格验证会重复该检查。即使 npm 成功退出，缺少所需的运行时依赖项也会导致验证失败，准备好的依赖项会掩盖本地使用者中的遗漏，或者重新打包的 Docker 映像可以工作。修复候选人的收缩包装并产生新的神器证据；资格永远不会修复冻结的包字节。 SDK 消费者安装保留其较小的依赖关系上下文。最终清单将其不可变描述符记录在 `publicationArtifacts.npmPreflight` 中。常规最终版本包括当前 npm、`beta` 和 `latest` 前代产品的单独 SDK 兼容性报告，共享目标快照。出版商无需重建即可选择其频道的报告和确认。 Beta 预发布版和扩展稳定版目标保留其所需的频道。

当发布选择官方 npm 插件时，完整版本验证还会针对确切的版本 SHA 以仅工件模式调度 `plugin-npm-release.yml`。该所有者打包每个选定的插件，验证并读回生​​成的 tarball，并将聚合描述符密封在 `publicationArtifacts.pluginNpm` 中。发布决策在通过之前需要该描述符。准备好的出版物采用那些确切的工件 ID、摘要、生产者运行和尝试；在完整版本验证后，它不会重新打包插件 npm 候选者。因此，纯源文件和装置无法触发工件检查，除非 npm 实际上将它们包含在交付的 tarball 中。

对于直接调度的 `OpenClaw NPM Release` 仅预检运行，如果在源检查和包准备成功后资格验证失败，则重新运行失败的资格验证作业。它会重用先前尝试中确切成功的生产者作业和包字节，即使该尝试失败或被取消。失败或未完成的生产者工作仍然不符合资格。最终的 npm 出版物仍然要求当前生产者运行成功完成，并且每个保留的校样作业仍然是有效的成功作业。 FRV-owned独立生产商支持相同的目标复苏；家长采用经过验证的收据，无需重建成功的包裹工作。

`docker-release-prepare.yml` 构建两种本机架构，保留 OCI 索引及其 SBOM/provenance，并在批准之前运行图像烟雾检查。 OCI 导出对新图层使用 gzip 级别 1，并重用缓存图层，无需强制重新压缩，保留烟雾和促销使用的图像格式。

默认图像和浏览器图像共​​享构建器的本地缓存。准备工作不会传输远程构建缓存：新的出处时间戳使应用程序层无效，并且测量的传输成本比重用运行时设置保存的成本更高。新的跑步者重建了该设置，包括可变的 Debian 和 npm 更新；密封的 OCI 工件仍然是可重复使用的发布输入。作业结束时，托管的 VM 会回收其本地构建器，因此构建器卷删除不会延迟工件上传后的密封。最终清单记录为`publicationArtifacts.docker`。准备没有发布机密或注册表写入权限。批准后，`Docker Release` 验证 source/tag、生产者、工件哈希和图像摘要，然后将这些字节提升到 GHCR 和 Docker 集线器。发布锁涵盖注册表写入和选择器升级。没有准备图像的历史证据在升级之前使用相同的准备工作流程。

如果 Docker 准备成功，但在同一工作流运行中发布失败，请重新运行失败的发布作业。新的发布者尝试验证原始成功的准备工作并密封工件，而无需重建。单独的发布者运行仍然需要原始生产者尝试积极或成功；它不能通过此重试路径采用失败的生产者尝试。

新的面向包的验证将准备好的 root/core 捆绑包传递给调用 `Full Release Candidate` 的独立候选生产者。它的注册表包含确切的未发布的核心依赖项和选定的插件。安装程序在解析根包之前启动该注册表，包括 npm、pnpm、Bun 和跨 OS 通道。已发布的基线版本仍然可以通过上游注册表获取。插件预发布和 OpenClaw 发布检查每个立即分派一个独立阶段，而其候选阶段等待获取。两个候选阶段在使用前都会验证相同的包 SHA、工件 ID、服务摘要、生产者运行尝试和 Docker 存档摘要。独立于包的裸 Docker 层使用内容寻址的 GHCR 缓存；候选特定图像仍然是不可变的 GitHub 工件。使用显式发布的包规范进行集中运行，而是保留现有的包路径。

准备工作还会发出标准化请求的摘要和 7 天的 `full-release-candidate-v2-<request-sha256>` 证据工件。其有界清单绑定了确切的目标和工具 SHA、发布和浸泡策略、有效的幸存者基线和场景、准备计划摘要、排序的插件包集、生产者和发布者 workflow/job/run 身份以及包、注册表和映像工件身份和到期时间戳。执行计划封存了该证据。在准备候选之前，只有在重新验证确切的工作流程运行、发布者作业身份、存档摘要、清单、生产者尝试和作业以及每个包、注册表和映像工件的实时元数据之后，保护伞才可以针对相同的规范化请求和精确准备的 npm tarball 摘要重复使用具有至少 14 小时剩余生命周期的最新工件。事实证明缺席会产生新的候选人。有界查找的不确定性和选择后的失败会阻塞，因此运行无法默默地切换候选者。即使源 SHA 未更改，不同的准备 tarball 也需要新的候选项。只有包合格后，全面验证才能成功，Docker 准备工作也成功；仅通过产品发布决定并不授权发布。

每个版本类型都会在两种本机架构上验证强制 Docker 映像准备中的 `runtime-assets` Docker 目标。

| 阶段                   | 细节                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目标解析       | **Job：** `Resolve target ref`<br />**Child 工作流程：** none<br />**证明：** 解析发布分支、标签或完整提交SHA 并记录选定的 inputs.<br />**Rerun：** 如果失败，则重新运行伞。                                                                                                                                                                                                                                                                                                                                                                                                       |
| 出版物准备 | **作业：** `Prepare release npm artifacts`、`Qualify release npm artifacts`、`Prepare plugin npm artifacts`和`Prepare release Docker artifacts`<br />**子工作流程：**独立核心npm、插件npm和Docker生产者运行<br />**证明：**在发布之前限定了确切的root/core和选定的插件npm tarball以及两种本机Docker架构。父级重试恢复原始生产者记录和 receipts.<br />**Rerun：** 在其原始生产者运行中重试失败的 npm 资格作业，保留成功的准备工作，并让父级收集经过验证的收据。 |
| 共享候选人        | **工作：** `Acquire full release candidate`<br />**子工作流程：** `Full Release Artifacts`来电`Full Release Candidate`，它会重用一个值得信赖的候选者，或者在一个被证明未命中的情况下准备一个<br />**证明：**验证准确的npmtarball、注册表、功能映像和producer/publisher绑定。原料加工后开始准备npm字节已准备好，在资格之前finishes.<br />**重新运行：**重新运行受影响的包、插件预发布、交叉OS， or live/E2E组使用相同的候选人。                                                                                                      |
| Vitest和正常CI    | **作业：** `Run normal full CI`<br />**子工作流程：** `CI`<br />**证明：** 针对目标的选定 CI 图形参考号`npm-beta-v1`和`npm-stable-v1`保留Linux/macOS/Windows Node、插件和通道合同、Node兼容性、检查、内置工件烟雾、文档、Python技能和Control UI；它们推迟了 macOS、Swift/OpenClawKit、iOS、Android 和本机 i18n。其他承保保单使用完整的 CI.<br />**Rerun：** `rerun_group=ci`。                                                                                                                                                           |
| 插件预发布       | **作业：** `Run plugin prerelease independent validation` 和 `Run plugin prerelease candidate validation`<br />**子工作流程：** `Plugin Prerelease`<br />**证明：** 独立的静态和代理覆盖可以在获取之前启动，而候选相关的 Docker 通道会消耗密封包和插件注册表 identities.<br />**Rerun：** `rerun_group=plugin-prerelease`。                                                                                                                                                                                                                       |
| 发布检查          | **作业：** `Run release checks independent validation`和`Run release checks candidate validation`<br />**子工作流程：** `OpenClaw Release Checks`<br />**证明：**独立安装， QA 和实时报道可以在采集之前开始，而包、跨 OS 和候选相关 Docker 通道会消耗密封的候选。稳定且完整的轮廓保留详尽的 live/E2E 和释放路径 coverage.<br />**重新运行：** 对失效表面进行分类并选择一个混凝土释放检查组。                                                                                                   |
| 封装 Telegram        | **作业：** `Run package Telegram E2E`<br />**子工作流程：** `NPM Telegram Beta E2E`<br />**证明：** 一个重点发布的包 Telegram当设置 `release_package_spec` 或 `npm_telegram_package_spec` 时，为 E2E。 `npm-beta-v1` 推迟这个孩子；显式 `npm-telegram` 并浸泡保留它。当 selected.<br />**Rerun：** `rerun_group=npm-telegram` 与 `release_package_spec` 或 `npm_telegram_package_spec` 时，包验收拥有未发布候选人的 Telegram 证明。                                                                                                                                 |
| 产品性能     | **作业：** `Run product performance evidence`<br />**子工作流程：** `OpenClaw Performance`<br />**证明：** 发布配置文件性能（`profile=release`， `repeat=3`、`publish_reports=false`）针对目标 SHA。为`all`（除`npm-beta-v1`外）选择，或显式`performance`；每个配置文件中选定的回归块。选定的孩子仍然完成并证明他们的报告发布者是 skipped.<br />**Rerun：** `rerun_group=performance`。                                                                                                                                                     |
| 发布决定        | **Job：** `Release Decision`<br />**Child 工作流程：** none<br />**证明：** 轮询确切记录的子运行 ID 和尝试，强制执行发布策略，并发布一个尝试约束的决策工件。决定性故障变为 `blocked_diagnostics_running`，而无关的子诊断 continue.<br />**Rerun：** 仅修复或重新运行阻塞表面。                                                                                                                                                                                                                                                |
| 诊断引流        | **作业：** `Diagnostic Drain`<br />**子工作流程：** 无<br />**证明：** 与 `fail_fast=false`，遵循每个选定的精确值子级到终端而不取消，并写入计时、失败作业、运行尝试和工具-SHA 证据。收集器取消改为写入立即 `cancelled_with_children` 切换，其中包含活动子 identities.<br />**Rerun：** 仅针对 `orchestration_error` 恢复收集；产品故障并不会使排水失效。                                                                                                                                 |
| 执行计划          | **作业：** `Seal release execution plan`<br />**子工作流程：** 无<br />**证明：** 保留原始父尝试、确切的子身份和头衔（必需）覆盖范围、门、重用身份和新的候选者请求，以及稳定的运行绑定工件中的精确生产者和发布者绑定。尝试两次收集器恢复恢复此工件，而不是 redispatching.<br />**Rerun：** 仅恢复现有计划；缺少计划就是编排错误。                                                                                                                               |
| 雨伞验证器       | **Job：** `Verify full validation`<br />**Child 工作流程：** none<br />**证明：** 下载不可变的执行计划以及精确的尝试绑定发布决策和诊断 Drain 工件，验证其共同摘要和父元组，并仅接受严格的绿色决策加上终端 drain.<br />**Rerun：** 恢复现有收集器或仅重新运行失败的产品表面；验证者绝不会重新分类或重新分配孩子。                                                                                                                                                 |

七个子调度作业仅拥有调度和精确身份捕获。他们发出子运行 ID、运行尝试和 URL，然后完成。发布决策拥有阻塞答案； Diagnostic Drain拥有完整的终端证据。不可变的执行计划在收集器尝试中拥有子身份。决策状态是 `qualifying`、`blocked_diagnostics_running`、`passed`、`blocked_complete`、`orchestration_error` 或 `cancelled_with_children` 之一。持续出现的 GitHub API 故障是编排错误。工作流程路径、显示标题、参考、工具 SHA 或运行 ID 发生更改的子项是明显的出处不匹配。仅通过 [ 中的复合尝试规则接受单调较新的尝试继续失败的验证](/reference/full-release-validation/continuation)。

`blocked_diagnostics_running` 对于立即诊断是安全的，但在诊断排空结束之前不能重试。 `orchestration_error` 授权收集器针对相同的子身份进行恢复，从不测试重新分派。 `blocked_complete`表示诊断完成；它没有声称排水管仍在运行。

选择后，保护伞会以仅工件模式调度产品性能。 `OpenClaw Performance` 仅允许针对计划运行或显式设置 `publish_reports=true` 的手动调度发布报告。仅工件防护必须成功完成，证明发布者作业被跳过。所选表演子记录的证据 `controls.performanceReportPublication=artifact-only`；每当选择子项时，验证器和重用选择器都需要匹配的标准化性能子项证明。 `npm-beta-v1` 将表现记录为延期，而不是派遣其结果仍需要最终证据的孩子。

验证者上传发布清单为`full-release-validation-<run-id>-<run-attempt>`。证据工具会在下载确切的工件 ID 之前验证其工件 ID、摘要、生产者运行和尝试。它对下载的 ZIP 进行限制，根据 REST `sha256:` 摘要验证其字节，并流式传输唯一允许的有界清单条目，而无需提取存档。为较早的发布消费者保留稳定名称别名。验证者始终更喜欢尝试限定的工件，并仅接受尝试 1 清单 v2 生产者的稳定名称。它会拒绝以后的尝试和清单 v3 的稳定名称，因此一旦生产者发出清单 v3，别名就会停止应用。

并发性由验证 SHA、工具 SHA、重新运行组、发布配置文件和有效浸泡覆盖率决定，并且不会取消较旧的运行。发布检查子项还将配置文件和有效浸泡分开，通过两个工作流程级别保持独立的准入。 Stable/full 将浸泡规范化为启用，因此显式启用它不会接受重复的请求。当状态收集器可以完成其取消切换时，父级取消或超时会使已收养的经过身份检查的子级继续运行并记录 `cancelled_with_children`。当某个子项不再有用时，显式取消该子项。当 SHA-pinned 助手已经拥有父进程时，不要运行第二个前台观察程序；仅在助手返回后或单独派遣父进程时才使用 `release-ci-summary --watch`。
