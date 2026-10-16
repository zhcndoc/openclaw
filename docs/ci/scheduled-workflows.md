---
summary: "性能、QA 实验室、CodeQL、安全审查、维护作业和 ClawSweeper 转发"
title: "计划和维护工作流程"
read_when:
  - "你正在更改 ClawSweeper 派发或 GitHub 活动转发"
  - "您正在对每晚、计划或维护工作流程进行分类"
---

## <a id="pr-vs-hourly-vs-release"></a> PR 对比每小时对比发布

普通的拉取请求，包括分叉贡献，不再选择 `ci.yml` 中的这些昂贵的作业：

- 真实网关 Control UI E2E（mocked/bundled `checks-ui-e2e` 仍由所有者选择）。
- Windows Node 测试、macOS Node 测试、macOS Swift 作业和 iOS build/simulator 冒烟。
- 已发布的 npm-driver × 候选更新单元，包括更新所有者 PR。
- Dependency/dead-export 扫描 （Knip） 和完整运行时 topology/architecture 作业。运行时导入周期检查保留在现有的 PR 防护中； TypeScript 更改也选择 Madge 那里。 TypeScript 在 `src/`、`extensions/` 或 `packages/` 下的更改也在同一作业中选择 Kysely 护栏；生成的 Kysely 类型仍然延迟。参见[范围选择](/ci/scope-and-routing/selection)。
- Android 屏幕截图。

前四组保留现有的每小时主层和完整版本库存。 Android 屏幕截图已从每小时主屏幕中排除，并继续进行完整的 manual/release 验证。普通手动调度和精确头部 `release_gate` 后备行为保持不变。 SwiftLint 和 SwiftFormat 是已移动的 Apple 作业的一部分；它们不会被拆分为新的 PR 作业。其他源测试、静态正确性门、Android unit/lint 工作以及独立的本机本地化检查保留其现有的 PR 选择。

这会将频繁的 PR 关键路径移动到现有的后续层，而无需更改作业的执行内容。因此，合并后可能会出现这些作业特有的故障。 `openclaw/ci-gate` 仅需要清单选择的作业；其所需的检查身份和存储库保护保持不变。有关层表和所有者边界，请参阅 [scope 选择](/ci/scope-and-routing/selection#pr-vs-hourly-vs-release)。

## <a id="hourly-main-ci"></a> 每小时主 CI

完整的 `main` 验证层在每小时 23 分钟直接从 `ci.yml` 运行。 GitHub的预定事件选择上游主修订版；手动调度输入无法声明计划运行策略。该计划选择完整的 `main` 层，包括 Android，而不过滤到最后一次提交。 Node、本机平台、文档、QA Smoke、浏览器进程证明和已发布的更新程序幸存者都针对该修订版运行。 Node 测试使用完整的紧凑清单，包括工具和 PR-exempt 文件，位于其 77 行主层上限内。

现有的插件预发布工作流程在每小时 37 分钟分别拥有完整的扩展运行时清单。计划的运行固定计划的上游 `main` SHA 并仅选择其扩展矩阵和所需的摘要。仅在 `extensions/` 下的仅清单捆绑插件和测试使用其现有的文件分片执行路径；包支持的插件保留其现有的批处理所有者。现有的 12 个作业并发限制保持不变。一个不可取消的每小时插槽可让主动证明完成，同时 GitHub 合并待处理的提示；手动和发布运行保留独立的并发组和所有现有阶段。普通 CI 不再附加第二个部分扩展清单。检查 `CI` 和 `Plugin Prerelease` 的每小时覆盖范围；完整发布验证将现有的子项固定到其确切目标。

完整版本验证和普通手册CI默认保留`validation_tier=full`。他们还运行仅发布的 runtime/UI 测试、最低 Node 兼容性、iOS 屏幕截图、本机发布版本、Android 打包以及所有六个 Docker 种子场景。每小时 iOS 保留 `ios-build (tests)`：Swift lint、Rust 测试、语音清理、本机 Access 以及完整的重点 app/notification 生命周期清单。托管附件 UI/export 证明、手表操作模拟器套件和手表交付 UI 证明仅在全层 manual/release 验证中运行，并保留每个案例和断言。 Android 保留 phone/Wear 测试和 lint。 Docker 幸存者使用现有的主烟雾包，包括运行时、资产、公共 SDK 声明和 tarball 完整性。手动 SDK API 差异报告仅保持手动状态：计划的提示没有可比较的更改范围。

主层 iOS 构建目标为所选模拟器的本机架构并禁用编译器索引，就像 PR Smoke 已经做的那样。语音和生命周期测试禁用 Xcode 的详细诊断收集，同时保留其日志和 xcresult 包。全层 manual/release 验证保留通用模拟器构建和故障诊断。这消除了在 76-94 分钟每小时的工作中观察到的重复架构工作和诊断停顿；它不会建立新的完成界限。

计划的 CI 使用自动主 [runner 放置 ](/ci/runners)，包括配置时首次尝试的混合放置。本机运行者标签、工作人员限制和重试回退保持不变。 Control UI 和本地翻译源检查仍然是强制性的；生成的区域设置漂移是建议性的，因为合并后的翻译工作流程拥有其修复功能。普通手动运行（包括 `validation_tier=main`）保留严格的区域设置奇偶校验。

主层运行不会发出完整验证修订确认。 Docs Agent 的自动写入门需要全层收据；其明确的手动调度仍然可用。

直接检查计划的 `CI` 运行及其 `openclaw/ci-gate` 作业。每个计划的运行都是独立启动的，因此较旧的 iOS 模拟器阶段无法容纳下一个每小时的核心检查。只有计划的 `ios-build` 作业共享非取消槽：活动校样完成，而当另一个作业到达时，GitHub 会替换待处理的 iOS 作业。到达顺序不必与修改顺序匹配。在聚合所有者处，`openclaw/ci-gate` 仅针对在 `main` 上运行的预定 `openclaw/openclaw` 接受 `cancelled` 的选定 `ios-build` 结果，并发出“每小时 iOS 证明合并”通知。真正的 iOS 故障或意外跳过仍然无法通过门，取消另一个选定通道也是如此。手动取消和 PR iOS 取消保留其现有的失败策略。带有此通知的通过门将 iOS 证明委托给稍后安排的作业；它不会在取消的修订版中验证 iOS。即使聚合成功，GitHub 的工作流级结论仍然可以是 `cancelled`。 Manual/release CI 保持独立，仅安全推送无法取消计划的工作。 CI 在发布验证期间仍然可用； `OPENCLAW_RELEASE_PRIORITY_RUN` 不控制入场。

每小时 CI 拥有文档检查，包括 RunsOn 路由。独立的文档工作流程保留手动和选择加入的推送运行。

Node 运行时一致性和插件初始化支架验证每小时在第 23 分钟检查更改的输入。仅当所需作业在 24 小时内通过同一分支并且完整的输入差异未更改时，它们才会重用证明。跳过的作业不能提高比较基数。缺少证据、差异不完整或 API 错误需要重新验证。每个决定都会报告其原因。两个工作流程均保留其 PR 范围，并每天刷新依赖漂移证明。

Sandbox Common Smoke 每天 05：23 UTC 运行，并保留 PR 和手动运行。插件 NPM Release 每小时运行其非发布元数据和未发布包包预览。计划无法输入其仅手动批准或发布作业。 Vitest Cache Warm 在每小时 17 分钟运行，保留其手动和存储库调度恢复路径。暖气是独立的。不保证其在 CI 之前完成。

### <a id="restore-per-push-ci"></a> 恢复每次推送 CI

在 **设置 → 秘密和变量 → 操作 → 变量** 下，将 **存储库操作变量** `OPENCLAW_CI_ON_PUSH` 设置为 `true`。这将恢复 CI 中之前经过路径过滤的完整主推准入、独立检查、插件工件预览和缓存预热。 GitHub 字符串比较不区分大小写；使用记录的小写 `true`。未设置、空、`false` 和其他值保留仅每小时的主层 CI。删除该变量或将其设置为 `false` 以返回默认值。无论哪种方式，每小时运行都保持启用状态。不需要更改秘密、提交或保护设置。

要立即运行主层 CI，请选择 **CI → 运行工作流程 → main**，选择主验证层和 Android，或运行：

```bash
gh workflow run ci.yml --ref main -f validation_tier=main -f include_android=true
```

各个独立工作流程也可以手动运行。直接 `CI` 调度和发布验证子项保留其现有的输入和行为；当请求完整的平台覆盖时设置`include_android=true`。要测量开发分支的每小时覆盖率，请在该分支上使用 `validation_tier=main` 和 `include_android=true` 调度 `ci.yml`。主层需要工作流程和签出来共享一个修订；它不能限定冻结释放目标或替换精确头 PR 释放门。

### <a id="what-stays-on-pushes"></a> 推送中保留的内容

CodeQL保留了全部七个主推安全类别。 CI 在其现有的非文档推送范围内保留 `security-fast`（提交的私钥和更改的工作流程安全审核）。 Pull-request、push、以及预定的 CI 跳过生产依赖审核；仅发布调度运行它，作为警告。默认主推送还运行基线增长、断言安全、测试超时竞赛，并且新的协议方法元数据可防止精确推送 `before` SHA，因此计划的 CI 的主与自身比较不会丢失这些检查；工作流程健全性检查跟踪每个承认的推送的冲突标记。其工作流 lint 和安全工具仅在工作流、操作或 lint 策略输入发生更改时运行。在默认主推送上会跳过完整的 CI 聚合作业，在可运行的 PR 或完全手动运行上会跳过 **not**。 CodeQL 和 Workflow Sanity 在发布验证期间也仍然可用。 PR 所需检查名称和安全审查强制执行不变。

发布及其先决条件检查保持事件驱动：文档镜像和网站安装程序同步、运行程序映像发布、区域设置生成 PR 和 ClawSweeper 活动转发保留其现有许可。当释放输入发生变化时，稳定的主收尾运行。现有的 `pnpm release:stable` 收尾阶段等待成功发布、验证 main 并分派收尾。保存协调器状态后，使用 `pnpm release:stable YYYY.M.PATCH --from closeout` 恢复它。

如果您在主转发端口之后直接从 Actions UI 发布，请在发布发布成功后分派 closeout，并且 main 携带已发布的版本和变更日志：

```bash
gh workflow run openclaw-stable-main-closeout.yml --ref main -f tag=vYYYY.M.PATCH
```

不相关的源推送不再轮询发布完成情况。手动恢复保留其现有的证据检查。文档代理在承认其自动写入作业之前会验证完全成功的全层 CI 尝试。选择加入的完整主推符合资格；每小时的主层运行和仅安全推送则不会。如果未设置 `OPENCLAW_CI_ON_PUSH`，则自动 Docs Agent 写入将被禁用。显式非机器人文档代理调度仍然可用，并且其当前主要和每小时节奏防护仍然适用于符合条件的工作流运行调用。安全审查仍处理 PR 和手动 CI 完成。 Release/tag 和 PR-only 工作流程保留其现有触发器；此更改不添加不存在的合并队列支持，并且不更改存储库规则集。

GitHub cron 在默认分支上尽力而为，而不是一小时延迟 SLA：运行可能会在负载下延迟或下降，并且公共存储库计划可以在不活动后禁用。主层 CI 故意重新检查未更改的 SHA，而不是引入单独的最后成功分类账。可以在下一个每小时的机会重试失败，并且仍然可以进行手动调度。如果 iOS 证明花费的时间超过一个小时，则稍后的每小时运行可以在等待该时间段的同时完成其他检查。被取代的待处理 iOS 作业可以通过委派的 iOS 证明将其聚合保留为绿色，但无法获得 Docs Agent 资格。这些已完成的检查仍然会消耗运行者的时间；每次运行的工作人员限制不会将并发的每小时运行限制在一起。该槽不涵盖 manual/PR iOS 作业或旧工作流程允许的运行。这消除了工作流准入阻塞，而不是运行程序容量等待。没有声称可以节省任何成本或严格的完成间隔。

## <a id="nightly-full-release-validation"></a> Nightly 完整发布验证

`Full Release Validation Nightly` （`full-release-validation-nightly.yml`） 每 3 小时在第 7 分钟 UTC （`7 */3 * * *`） 运行一次，因此发布准备情况在提交时保持最新状态，包括 `stable` 配置文件、浸泡和阻塞性能、`reuse_evidence=true`、`rerun_group=all` 和`main-qualification` 目的。它检查调度程序的确切主 SHA 并运行 SHA- 固定帮助程序 （`pnpm ci:full-release --sha <sha> --workflow-sha <sha> --trusted-workflow-ref main`），显式保留已调度的非发布主限定路由。它使用 SHA 作为验证和工具 SHA 并从不可变的 `release-ci/<sha12>-<id>` 传输引用进行调度。一旦 `main` 移动，来自 `main` 的原始调度就会失败，因为父级拒绝从移动的工作流引用调度子级。同一 SHA 的仍处于活动状态的父级共享 SHA- 特定的完全发布验证并发组并对此调度进行排队；完成的证据会被再次验证，并通过重用采用其自己的精确目标证据。配置后，父级自动使用 `OPENCLAW_RELEASE_RUNNER_GROUP`。计划作业的运行者选择和 720 分钟预算与家长的 `release_decision` 服务员相同，与助手的 720 分钟手表相匹配。

该作业通过发布决策和证据验证来监视父级，因此其结论是验证结果。一个并发组涵盖没有取消的计划运行和手动运行：当作业仍在监视其父级时，下一个触发器会等待，并且 GitHub 仅保留最新的挂起运行，因此运行不会重叠，并且最新等待触发器的 SHA 接下来运行。子项重用是精确目标：当 `main` 自上次运行以来未移动时，`reuse_evidence=true` 让每个子项采用该运行的收据而不是再次运行，而新的 SHA 则调度新的子项。作业日志打印父运行URL；上传的`full-release-validation-nightly-request`工件保存了帮助者对`node scripts/full-release-validation-at-sha.mjs --reconcile-request <path>`的请求记录。发生故障后，助手会保留两个传输参考以供重新运行和诊断。要列出夜间家长，请在运输分支上进行过滤：

```bash
gh run list --workflow full-release-validation.yml --event workflow_dispatch \
  --json databaseId,headBranch,headSha,status,conclusion \
  --jq '.[] | select(.headBranch | startswith("release-ci/"))'
```

## <a id="openclaw-performance"></a> OpenClaw 性能

`OpenClaw Performance` 是 product/runtime 性能工作流程。它每天在 `main` 上运行，并且可以手动调度：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手动调度通常对工作流程参考进行基准测试。设置 `target_ref` 以使用当前工作流实现对发布标签或另一个分支进行基准测试。已发布的报告路径和最新指针由测试的参考键入，每个 `index.md` 记录测试的 ref/SHA、工作流程 ref/SHA、Kova 参考、配置文件、通道身份验证模式、模型、重复计数和场景过滤器。

该工作流会从固定版本中安装 OCM，并从 `openclaw/Kova` 中安装 Kova，使用固定的 `kova_ref` 输入，然后运行三条通道：

- `mock-provider`：针对本地构建运行时的 Kova 诊断场景，并修复了伪造的 OpenAI- 兼容身份验证。
- `mock-deep-profile`：针对启动、网关和代理轮流热点的 CPU/heap/trace 分析。按计划运行，或按 `deep_profile=true` 调度运行。
- `live-openai-candidate`：真正的OpenAI `openai/gpt-5.6-luna`代理转。按计划选择，或在发货时选择 `live_openai_candidate=true`。没有资格获得实时证书的候选人将被跳过。对于选定的合格通道，缺少 `OPENAI_API_KEY` 会使通道失败而不是跳过它。

在容忍部分 Kova 判决之前，报告门需要聚合 RSS 和 CPU 样本以匹配各个记录，包括重复测量。即使样本计数匹配，丢失或替换的样本也会使门保持非零。

OpenClaw-native 源代码检查在单独的 `source_performance` 作业中运行，与 `resolve_target` 之后的 Kova 通道并行：跨默认、跳过通道、内部挂钩和 50 个插件启动情况的网关启动时序和内存；捆绑插件导入 RSS、重复模拟 OpenAI `channel-chat-baseline` hello 循环、针对启动网关的 CLI 启动命令以及 SQLite 状态烟雾性能检查。当先前发布的模拟提供程序源报告可用于测试引用时，源摘要会将当前 RSS 和堆值与该基线进行比较，并将较大的 RSS 增加标记为 `watch`。发布者将这些源工件包含在 `mock-provider` 报告包中，Markdown 摘要位于 `source/index.md`，其旁边是原始 JSON。

每个通道都会上传其完整的 GitHub 工件，包括 CPU、堆、跟踪和压缩诊断包。单独的发布者作业下载并验证这些工件，然后创建一个短暂的 ClawSweeper GitHub 应用程序令牌，其范围仅限于 `openclaw/clawgrit-reports` 内容，并将其仅传递到 Git 推送步骤。它提交了 `report.json`、`report.md`、`index.md`、源代码检查工件，并将 metadata/checksums 捆绑在 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 下；完整的诊断存档保留在链接的操作工件中。发布者在尝试推送之前拒绝任何超过 50 MB 的报告文件。当前测试的引用指针是`openclaw-performance/<tested-ref>/latest-<lane>.json`。如果应用程序令牌创建或报告发布失败，计划运行和 `profile=release` 调度将失败。手动非发布调度会保留发布建议，并在身份验证或发布失败时保留 GitHub 工件。以前的源基线是从公共报告存储库中匿名获取的，因此成功的基线获取并不能证明发布者身份验证。

所有显式性能工作流程 Git 命令都使用固定的 Git 生命周期所有者，该所有者在每个作业选定的签出之前在 `RUNNER_TEMP` 中准备好。目标解析、Kova revision/install Git、源修订和基线 Git 以及本地发布者操作仍然不受限制。只有初始报告获取、每次推送和每次协调获取都有 120 秒的截止时间。所有者在读取、签出重用、工件消费者、输出或重试之前耗尽整个 Git 进程树；独占报告获取仅在消失后回收调用创建的锁。

报告准备和所有获取都是匿名的。仅在准备好新报告后才创建应用程序令牌，立即从环境中删除，并作为屏蔽的基本标头传递以单独推送命令；它永远不会进入远程 URL 或存储库配置。在创建令牌之前，已验证的现有报告会成功。只有成功的空 `ls-tree` 查找才意味着基线或报告不存在； repository/read 故障是最终故障。格式错误的基线指针 JSON 仍然是建议性的，验证清理后的普通基线获取失败也是如此。

发布仅允许五次推送。每次失败的推送（包括第五次）都会获得 2/4/6/8/10 秒的退避，然后进行一次匿名协调获取。即使在第五次模糊推送之后，获取的远程报告也证明成功；直接push成功不需要fetch。否则，尝试 1-4 将在与 `cherry-pick -X theirs` 分离的 `FETCH_HEAD` 上重播报告提交，在当前编写器赢得最新指针时保留并发唯一报告。没有第五次尝试重播。普通提取失败会发出警告并重试尝试 1-4。只有在验证清理后键入 Git 失败或超时才允许恢复；所有者设置、普查、清理失败和取消在回退、重试、重播或成功之前停止。完整发布验证继续完全禁用发布者，并仅将性能证据保留为工作流程工件。

### <a id="gateway-concurrency-benchmark"></a> Gateway并发基准测试

手动 `gateway-concurrency` 模式测量繁忙的隔离网关并将其结果保留为操作工件：

```bash
gh workflow run openclaw-performance.yml --ref main \
  -f mode=gateway-concurrency -f live_openai_candidate=true
```

一项作业构建一次选定的源，运行模拟提供程序，然后可以选择使用真实密钥运行 OpenAI。每次运行都会在 32 个代理中播种 1,000 个会话，并完成 96 个回合，同时进行会话更新、历史读取、订阅和 64 轮检查。梦想已被禁用；正常索引、回顾和数据库空闲保留策略保持不变。实时运行拒绝工具并将模型输出限制为 128 个令牌。结果包括加载阶段主线程和 Worker CPU 配置文件。两个提供商的工作负载不同，不是 before/after 速度比较。

实时执行需要默认分支工作流和测试的 SHA 等于工作流 SHA。如果缺少该条件或 `OPENAI_API_KEY`，则请求的实时运行将失败。对于仅模拟证据，请省略 `live_openai_candidate`。此模式不运行 Kova 通道、源检查作业或报告发布，并且不被每日计划选择。有关本地调用和结果解释，请参阅 [Gateway concurrency](/reference/test/performance#benchmarks)。

### <a id="vitest-paired-benchmark"></a> Vitest 配对基准测试

仅手动 `vitest-pair` 模式将两个精确提交与候选提交的工作流实现进行比较：

```bash
gh workflow run openclaw-performance.yml \
  --ref <candidate-branch> \
  -f mode=vitest-pair \
  -f baseline_ref=<40-character-baseline-sha> \
  -f target_ref=<40-character-candidate-sha>
```

两个输入都必须是小写完整 SHA，`target_ref` 必须等于 `--ref` 选择的工作流程 SHA，并且拒绝重新运行。调度新的工作流运行而不是重试。在此模式下，Kova、源检查、报告发布和仅包含工件的防护将被跳过。基准测试作业具有只读存储库权限，不接收机密，不恢复或保存操作缓存，并在禁用凭据的情况下检查帮助程序、候选者和基线。

承诺的通道清单涵盖代表性核心单元、网关、Control UI jsdom 和工作生命周期测试。两次提交必须公开相同的选定 test/config 路径和字节，并在创建定时状态之前传递正确性。正确性还要求双方报告相同的标准化测试文件、测试身份、状态和计数。以后的每次运行都必须与已建立的执行摘要相匹配。然后，harness在每侧和每道上运行一次排除的热身，七对交替的侧顺序和旋转的车道顺序的轮，加上一对带有新鲜缓存的单独标记的冷对。冻结安装是已设置的并且从不计时。

每个子进程都有固定的截止日期和进程组所有者。单独的 165 分钟harness截止时间在 180 分钟作业超时内保留 15 分钟用于清理、终端清单最终确定和工件上传。在拒绝进一步的子项启动之前，它会中止并加入活动的托管子项。每次安装、正确性、预热、测量和冷处理都会通过 `npm_execpath` 接收精确固定的 pnpm 可执行文件，并具有私有 Corepack 和 pnpm 状态；解析的可执行文件和版本记录在环境和运行记录中。

该工件包括原始日志、原始 Vitest JSON 报告、执行摘要和计数、GNU 时间 user/system CPU、墙上计时、环境和 Git 身份、source/config 哈希、每次运行记录、配对比率分析以及终端成功或失败清单。工作流程在harness失败后尝试完成并上传工件。运行者丢失或外部工作流程取消仍然会阻止这些步骤运行。可变的 pnpm 和运行时缓存保留在未上传的临时树中。阈值固定在 `scripts/vitest-pair-benchmark-lanes.json` 中。验收使用每轮七个总比率的中位数，每轮按总车道持续时间加权，失败率超过 5%。仅当其中值测量比率高于 10% 并且其中值配对增量至少为一秒时，关键通道才会失败。单个冷对仍然是诊断证据并且永远不会被接受。该报告声称，只有当每个代表性车道的中位数都达到改善比率并且其七对车道中至少有五对单独满足该比率时，才声称有所改善。否则，它会报告每个车道的证据，而没有广泛的改进声明。工件仅使用受信任的工作流程运行 ID 并以其名义进行尝试；确切的基线和候选提交仍记录在工件内。

## <a id="security-review-reconciler"></a> 安全审查协调器

每十分钟，安全审查就会协调 CI 从上一次成功的预定传递开始前五分钟到五分钟前的完成情况（六十分钟回退，十二小时上限）。无间隙地穿过瓷砖；延迟或下降的 cron 刻度只会扩大下一个窗口，直到上限。运行列表涵盖从窗口前三小时到当前时间的创建时间。 GitHub 将每个过滤查询的上限限制为 1,000 个结果，因此解析器将报告总数超出该限制的范围一分为二。每个较小的范围都会被分页，直到一个短页，并且其不同的运行计数必须覆盖其首页上报告的总数。在任何状态发布或矩阵输出之前，十个整页或少于报告的不同运行都会失败，保留锚点以进行完整重试。包含范围端点间隔一秒，运行 ID 跨页面和切片进行重复数据删除。短于 10 分钟但仍超过 1,000 次运行的范围在状态发布或矩阵输出之前失败，因此覆盖的窗口不会前进。下一次扫描将从上次成功扫描的基础上重新扫描。预定的解析器传递共享一个并发组，而不取消活动传递； GitHub 保留一个待处理的传递，该传递仍然从最后一个成功的窗口开始。每个通道最多选择 100 个 PR 头，最旧的 CI 首先完成，运行 ID 打破平局，并在达到上限时停止读取状态。如果候选人仍然存在，则 `reconcile-backlog` 作业在选定的审核完成后将无法通过工作流程。这保持了相同的锚点：审查的头具有新的状态，允许下一个计划的传递从同一窗口中选择剩余的部分。

协调器中断时间超过 12 小时后，较旧的丢失完成需要重新推送或重新运行安全审查。

CI 重播会保留其原始创建时间。窗口前三个多小时创建的运行的重新运行依赖于其自己的完成交付；如果丢失，新的推送或重新运行安全审查可以恢复它。

完全跳过的 CI 运行将被忽略。解析器按时间倒序读取状态历史记录，并仅使用创建者类型为 `Bot` 的 `github-actions[bot]` 中的最新 `openclaw/ci-gate` 状态。其他出版商将被忽略。仅当操作所属状态缺失、早于 CI 完成或待处理时，才会运行正常审核。只有在 CI 完成时或之后创建的非待处理状态才会被解决并停止重选。每个待处理状态仍然符合资格，包括预完成 CI 读取后发布的审核等待。当头部合法地等待更新的正在进行的 CI 时，平铺窗口会限制无害的额外审查。它从不检查 PR 代码，并在每次传递时使用一个托管的 `ubuntu-24.04` 解析器作业，运行列表读取加上每个新完成的头的分页状态历史记录读取，并且没有 Blacksmith 注册。请参阅 [ 安全审查检查 ](/ci/pipeline#security-review-checks)。

## <a id="qa-lab"></a> QA 实验室

QA 实验室在主智能作用域工作流之外拥有专用的 CI 流水线。智能体一致性检查被嵌套在更广泛的 QA 和发布测试框架中，而不是独立的 PR 工作流。若需要让一致性检查随更广泛的验证运行一起执行，请使用 `Full Release Validation` 并设置 `rerun_group=qa-parity`。

- `QA-Lab - All Lanes` 工作流每晚在 `main` 上运行，也支持手动触发；它会分发运行模拟一致性检查，以及实时的 Matrix、Telegram、Discord、WhatsApp 和 Slack 作业。实时作业使用 `qa-live-shared` 环境；Telegram、Discord、WhatsApp 和 Slack 使用 Convex 租约，而 Matrix 会配置一次性本地凭据。
- 手动和计划聚合运行保留默认的 `all` 并发范围。可信发布调用使用单独的 `matrix` 和 `buzz` 范围，因此这些通道可以针对一个目标 SHA 一起运行； Matrix 对相同 SHA 的调用仍会序列化，而 Buzz 调用则跨 SHA 进行序列化，因为它们共享池凭据。
- Release Matrix 目录验证在 16-vCPU Blacksmith 运行程序上运行，作业预算为 90 分钟。对超时、运行程序大小或并发性的更改需要匹配的工作流防护和精确候选发布证明。
- `QA Profile Evidence` 在八个独立作业中平衡分类类别组，将非隔离实时频道保留在一个分片上，然后要求 QA 实验室将其经过验证的证据合并到一个经证明的 `qa-evidence.json` 中。超时或丢失的分片总是会导致聚合失败； `allow_failures`仅在每个分片完成并产生有效证据时适用。直接 `Maturity scorecard` 会调度默认的 `allow_failures`，因此不完整的证据仍然可以呈现诊断文档工件。最终结果门在可选的 generated-PR 发布后运行，并在任何场景失败或仍然被阻止时运行失败；默认情况下，可重用的发布调用仍然严格。

计划、手动和发布 Matrix 检查使用固定响应模拟提供程序，因此实时传输合约与模型延迟和正常提供程序插件启动隔离。 Telegram 发布检查使用相同的固定响应模型设置。实时传输网关禁用内存搜索，因为 QA 奇偶校验单独覆盖内存行为；提供程序连接由单独的实时模型、本机提供程序和 Docker 提供程序套件涵盖。

`OpenClaw Release Checks` 还会在发布批准前运行发布关键的 QA 实验室流水线；其 QA 一致性检查门禁会将候选包和基线包作为并行流水线作业运行，然后将两个构件下载到一个小型报告作业中，以进行最终的一致性比较。

对于正常 PR，请遵循范围 CI/check 证据，而不是将奇偶校验视为必需状态。

## CodeQL

`CodeQL` 工作流程有意成为狭窄的首次安全扫描程序，而不是完整的存储库扫描。每日、手动、`main` 推送和非草稿拉取请求防护运行扫描操作工作流代码以及最高风险的 JavaScript/TypeScript 表面，其中高可信度安全查询已过滤到 high/critical `security-severity`。

拉取请求防护保持轻型：它仅针对 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages`、`scripts`、`src` 或进程拥有的捆绑插件运行时路径下的更改启动，并且它运行与计划工作流相同的高可信度安全矩阵。 Android 和 macOS CodeQL 不在 PR 默认值范围内。

### <a id="security-categories"></a> 安全类别

| 类别                                          | 表面                                                                                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | 身份验证、机密、沙箱、定时任务和网关基线                                                                                  |
| `/codeql-security-high/channel-runtime-boundary`  | 核心 channel 实现契约，以及 channel 插件运行时、网关、Plugin SDK、机密、审计触点              |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、网络保护、web-fetch，以及 Plugin SDK SSRF 策略表面                                                |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP 服务器、进程执行辅助工具、外发投递，以及 agent 工具执行闸门                                           |
| `/codeql-security-high/process-exec-boundary`     | 本地 shell、进程生成辅助工具、拥有子进程的捆绑插件运行时，以及工作流脚本胶水                             |
| `/codeql-security-high/plugin-trust-boundary`     | 插件安装、加载器、manifest、registry、包管理器安装、源代码加载，以及 Plugin SDK 包契约信任表面 |

### <a id="platform-specific-security-shards"></a> 平台特定的安全分片

- `CodeQL Android Critical Security` — 预定的 Android 安全分片。在工作流程理智接受的最小 Blacksmith Linux 运行器上手动为 CodeQL 构建 Android 应用程序。在 `/codeql-critical-security/android` 下上传。
- `CodeQL macOS Critical Security` — weekly/manual macOS 安全分片。在 GitHub-hosted Linux 上准备生成的 Mermaid 资源，然后在 GitHub-hosted Intel 运行器上手动为 CodeQL 构建 ARM64 macOS 应用程序，而无需使用索引存储或调试信息工件；从上传的 SARIF 中过滤依赖项构建结果，同时保留第一方生成的协议模型；并在 `/codeql-critical-security/macos` 下上传。其 macOS 作业有 90 分钟的上限，因为完整的跟踪构建和分析超出了之前 45 分钟的预算。保持在每日默认值之外，因为即使在干净的情况下，macOS 构建也会主导运行时。

### <a id="critical-quality-categories"></a> 关键质量类别

`CodeQL Critical Quality` 是匹配的非安全分片。它仅在 GitHub- 托管的 Linux 跑步者上的狭窄高价值表面上运行错误严重性、非安全性 JavaScript/TypeScript 质量查询，因此质量扫描不会花费 Blacksmith 跑步者注册预算。它的拉取请求防护有意小于预定配置文件：非草稿 PR 仅运行其接触表面的匹配分片，来自 13 个 PR- 可路由分片 — `agent-runtime-boundary`、`channel-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`gateway-runtime-boundary`、 `mcp-process-runtime-boundary`、`memory-runtime-boundary`、`network-runtime-boundary`、`plugin-boundary`、`plugin-sdk-package-contract`、`plugin-sdk-reply-runtime`、`provider-runtime-boundary` 和 `session-diagnostics-boundary`。 `ui-control-plane` 和 `web-media-runtime-boundary` 不参与 PR 运行。 CodeQL 配置和质量工作流程更改运行完整的 PR 分片集（网络运行时分片键脱离其自己的 CodeQL 配置文件和网络拥有的源路径）。

手动派发接受：

```text
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|network-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

窄型材是 teaching/iteration 挂钩，用于单独运行一个优质碎片。

在拉取请求中，网络运行时分片以快速差异扫描开始。敏感套接字 imports/calls 和代理策略令牌、对其 queries/config/fixtures 的编辑以及对 Codex 传输的更改在同一 PR 作业中选择完整的 CodeQL 分析。对于受监控的非测试源的缺失或无效补丁也选择全面分析；元数据获取或解析失败会停止分片选择，而不是默默地跳过它。已知的普通差异保持快速路径。完整路径在分析之前运行语义查询测试，包括配置的 `packages/net-policy/src` 目录的覆盖范围以及精确的 owner/function 限额和测试路径排除的保留。对于任何 SARIF 发现或丢失的 SARIF 输出，全面分析都会失败；敏感差异是路由信号，而不是发现。

| 类别                                                | 表面                                                                                                                                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | 身份验证、机密、沙箱、定时任务和网关安全边界代码                                                                                                  |
| `/codeql-critical-quality/config-boundary`              | 配置 schema、迁移、规范化和 IO 契约                                                                                                         |
| `/codeql-critical-quality/gateway-runtime-boundary`     | 网关协议 schema 和服务器方法契约                                                                                                              |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心 channel 和捆绑 channel 插件实现契约                                                                                                  |
| `/codeql-critical-quality/agent-runtime-boundary`       | 命令执行、model/provider 调度、自动回复调度和队列以及 ACP 控制平面运行时合约                                               |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP 服务器和工具桥接、进程监督辅助工具，以及外发投递契约                                                                        |
| `/codeql-critical-quality/memory-runtime-boundary`      | Memory host SDK、memory runtime 外观、memory Plugin SDK 别名、memory runtime 激活胶水，以及 memory doctor 命令                                    |
| `/codeql-critical-quality/network-runtime-boundary`     | 网络策略包、原始 socket 和代理捕获运行时、SSH 隧道、网关锁、JSONL socket，以及推送传输表面                                 |
| `/codeql-critical-quality/session-diagnostics-boundary` | 回复队列内部结构、会话传递队列、出站会话 binding/delivery 帮助程序、诊断 event/log 捆绑包表面和会话医生 CLI 合约 |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Plugin SDK 入站回复调度、reply payload/chunking/runtime 辅助工具、channel reply 选项、投递队列，以及 session/thread 绑定辅助工具             |
| `/codeql-critical-quality/provider-runtime-boundary`    | 模型目录规范化、提供程序身份验证和发现、提供程序运行时注册、提供程序 defaults/catalogs 和 web/search/fetch/embedding 注册表    |
| `/codeql-critical-quality/ui-control-plane`             | Control UI 启动、本地持久化、网关控制流，以及任务 control-plane 运行时契约                                                          |
| `/codeql-critical-quality/web-media-runtime-boundary`   | 核心 web fetch/search、媒体 IO、媒体理解、图像生成，以及媒体生成运行时契约                                                    |
| `/codeql-critical-quality/plugin-boundary`              | 加载器、registry、公共表面，以及 Plugin SDK 入口点契约                                                                                             |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | 已发布包侧的 Plugin SDK 源代码以及 plugin package contract 辅助工具                                                                                      |

质量与安全分离，这样质量发现可以被调度、度量、禁用或扩展，而不会掩盖安全信号。Swift、Python 和捆绑插件的 CodeQL 扩展应仅在范围狭窄的配置具备稳定运行时间和稳定信号之后，作为有范围或分片化的后续工作再加回来。

## <a id="maintenance-workflows"></a> 维护工作流

### <a id="pr-ci-sweeper"></a> PR CI 扫地机

`PR CI Sweeper` 每小时在第 7 分钟检查最近的拉取请求。它会修复丢失的 `pull_request`、CI 和 GitHub `startup_failure` 通过有界的 close/reopen 循环运行，在启动基础设施恢复时发出警告。草稿、最近更新或冲突的 PR 以及启用了自动合并的 PR 保持不变。附加排队、正在运行、失败或取消的 CI 会阻止恢复：取消并不能证明提供程序失败或测试从未执行，因此清理器永远不会自动重新执行这些工作流程。

### <a id="comment-automation"></a> 评论自动化

评论作业在获取托管运行器之前会拒绝已知的无操作。仅当使用其默认命令列表时，维护者命令反应才会跳过没有 `/` 的注释；任何非空 `MAINTAINER_COMMAND_REACTIONS` 覆盖都会保留完整匹配器，包括不带斜杠的命令。自动响应会跳过 Barnacle 已忽略的 Bot 撰写的问题评论，并针对其作者协会已豁免的问题评论。其编辑许可保留标题、正文和 PR-base 更改。 PR 上下文检查忽略了策略的已知机器人和特权作者豁免。 Labeler 保留 title/base PR 编辑并跳过使标题保持不变的问题编辑。这些决定发生在结帐和跑步者分配之前。

自动响应、贴标机、PR 上下文检查和 ClawSweeper 仅在作业准入后获取并发槽。跳过的事件不能替代有用的待处理工作。贴标机对每个 PR 和问题使用单独的组，并单独序列化手动回填； PR 上下文检查取消对同一 PR 的取代检查。 ClawSweeper 保留其针对问题和 PR 事件以及所有 label/comment 摄入的每项取消规则，仅跳过显式空的元数据编辑。每种事件类型都有自己的通道：评论按评论序列化，并且评论活动运行从不共享组。 PR 事件和评论在 PR 头上留下检查运行，其中即使在新的运行成功后，GitHub 也会将取消的运行视为未通过，因此只有同一 PR 上的较新的 PR 事件可以取代 PR 事件运行，并且没有任何内容取消审核运行。安全审查省略了 PR 仅散文编辑，同时保留 base/permission 更改、头部更改和批准撤销；其按人头评论连载仍然不会取消。

### <a id="dependency-audit"></a> 依赖性审计

`Dependency Audit` 每天 07：23 UTC 并手动调度运行生产锁定文件审核。它与 PR CI 保持独立，并且在发现结果、不可用的建议或无效数据时失败。该红色分类信号不是必需的 PR 检查，并且从不进行门合并。跟进 `main` 上的依赖项碰撞。每个依赖图作为一个请求提交；发布检查将其产品和工具图分开。

两者都发布了 CI，并且此严格审核会在作业摘要中发布结果、包计数、持续时间、时间戳和有限失败原因。完成的 npm 检查仅涵盖 npm 批量咨询，而不是每个上游咨询来源。

分类所有者是 **@steipete**，于 2026 年 9 月 3 日在 [#137960](https://github.com/openclaw/openclaw/pull/137960) 中设置。没有 `.github/CODEOWNERS` 规则涵盖 `.github/workflows/dependency-audit.yml`，因此该行是该所有权的唯一记录。调查失败的计划运行并重新运行严格的工作流程以确认恢复：

```bash
gh workflow run dependency-audit.yml --repo openclaw/openclaw --ref main
```

GitHub 将计划运行通知发送到工作流创建者或最新的 cron 编辑器，具体取决于该帐户的操作通知设置。取得所有权时保持这些通知处于启用状态；摘要提及不会发送警报。参见[GitHub的工作流通知规则](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs)。

对于本地复制，请运行 `node scripts/pre-commit/pnpm-audit-prod.mjs --audit-level=high`。添加 `--ci` 选择较短的 30 秒诊断预算，但保留退出代码：0 表示没有匹配的结果，1 表示结果或错误，2 表示覆盖不完整。此直接诊断命令和每日依赖性审核保留这些非零退出。普通pull-request、push、预定CI跳过审核。 CI 仅针对以 `full-release-validation-` 或 `release-native-android-` 开头的 `workflow_dispatch` ID 运行它；每个非零审核退出都会成为退出代码为 0 的警告。可选的 `pnpm-audit-prod` 预提交挂钩使用相同的仅警告包装器并保留审核输出。依赖项建议无法阻止 CI、本地提交或发布。单独发布的 `pnpm deps:vuln:gate` 仍然可以阻止已知的恶意软件；漏洞公告中仍然存在警告。

### <a id="docs-sync-publish-repo"></a> Docs 同步发布存储库

`Docs Sync Publish Repo` 汇编了英文，ClawHub，并在 `openclaw/docs` 中保存翻译页面。每次最终变基之后和推送之前，它都会使用 `npm ci` 安装发布者现有的 npm 锁，并检查生成的文档树。除非发布者清单或锁定发生更改，否则推送会重试重用该安装。检查器在 Node 24 上本地运行；未安装单独的检查器依赖关系图或 TypeScript 加载程序。

一次性操作验证缓存通过存储库相对路径和完整的原始内容哈希记录成功的页面检查。检查器和帮助器更改、Node/runtime 更改或 requested/installed npm 锁定更改会使重用无效。缓存数据丢失或损坏会触发全面检查；已删除的页面将从下一个成功的缓存中删除。每次都会检查 `docs.json`，包括热运行时。只有成功的主分支工作流程才能将工件保存在发布存储库之外。检查器保留其 Markdown/MDX 格式检测、有毒文本检查和组件缩进检查；它不会取代站点渲染器或跨页面链接验证。

### <a id="docs-agent"></a> 文档代理

`Docs Agent` 工作流程使现有文档与最近发生的更改保持一致。它没有纯粹的时间表。选择加入的完整主推 CI 运行可以允许自动写入；每小时主层 CI 不能。在未设置 `OPENCLAW_CI_ON_PUSH` 的情况下，使用显式非机器人文档代理调度来运行它。在允许写入作业之前，只读作业会验证上游 CI 工作流程、准确完成的运行尝试、当前主 SHA、成功聚合以及成功的修订确认步骤。该生产者步骤是 absent/skipped，用于主层运行、仅安全推送、失败的完整 CI 以及另一个目标或缩小范围的手动验证。普通的机器人推送仍然被排除在外。

只有已承认的写入作业才会占用非取消文档并发槽，因此跳过的推送无法取代待处理的合格自动或手动工作。工作流运行调用重新检查主要新鲜度并检查最多 100 次最近运行的精确尝试作业证据。排队或活动的写入作业，或最近实际运行代理的尝试，均计入一小时的节奏。取消和跳过的工作流程、拒绝验证以及跳过代理的已完成写入器门不计算在内。被承认后，代理会从源 SHA 审查先前成功写入作业（其代理步骤成功到当前 `main`）。

失败的代理尝试可能会在一小时内阻止另一次尝试，但不会推进审核基础。如果无法读取历史证据，则门在运行代理之前会失败。

### <a id="duplicate-prs-after-merge"></a> 合并后 PR 重复

`Duplicate PRs After Merge` 工作流程是用于土地后重复清理的手动维护人员工作流程。它默认为空运行，并且仅在 `apply=true` 时关闭明确列出的 PR。在变异 GitHub 之前，它会验证已着陆的 PR 是否已合并，以及每个副本是否具有共享引用的问题或重叠的更改块。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

### <a id="update-migration"></a> 更新迁移

`Update Migration` 每周日 03：17 UTC 运行扩展的已发布升级基线，并手动调度。它保留 `plugin-deps-cleanup` 和 `legacy-operator-state`，没有提供商机密。其单独的非取消计划组合并挂起的运行，并且无法取消手动验证。请参阅 [ 包验收套件配置文件 ](/ci/release-validation#suite-profiles)，了解运行时基线分辨率、每个基线分组、78-90 跑步者分钟的每周计划津贴以及成功升级要求。 [跑步者注册预算](/ci/capacity#runner-registration-budget)与PR和主要入场费分开计算每周爆发量。

## <a id="clawsweeper-activity-forwarding"></a> ClawSweeper 活动转发

`.github/workflows/clawsweeper-dispatch.yml` 是从 OpenClaw 仓库活动到 ClawSweeper 的目标端桥接。它不会检出或执行不受信任的 pull request 代码。该工作流会使用 `CLAWSWEEPER_APP_PRIVATE_KEY` 创建一个 GitHub App 令牌，然后将精简的 `repository_dispatch` 负载派发到 `openclaw/clawsweeper`。

调度 API 调用重试速率限制失败最多五次尝试，并进行二次退避。其他 API 错误立即停止，并且用尽的重试保留最终的 API 退出代码。调度呼叫者在失败时发出警告并继续，而不是报告调度成功。

该工作流包含三条通道：

- `clawsweeper_item`：用于精确的 issue 和 pull request 审查请求；
- `clawsweeper_comment`：用于 issue 评论中的显式 ClawSweeper 命令；
- `github_activity`：用于 ClawSweeper 代理可能检查的常规 GitHub 活动。

`github_activity` 流水线仅转发规范化的元数据：事件类型、动作、actor、仓库、条目编号、URL、标题、状态，以及在存在时评论或审查的简短摘录。它有意避免转发完整 webhook 正文。`openclaw/clawsweeper` 中接收的工作流是 `.github/workflows/github-activity.yml`，它会把规范化事件发布到 OpenClaw Gateway hook，供 ClawSweeper 代理使用。

主分支上的推送仍作为 `github_activity` 观察事件处理。它们不会生成托管的逐提交报告或提交 Check Runs。

常规活动属于观察，而非默认交付。ClawSweeper 代理会在其提示中收到 Discord 目标，并且仅当事件令人意外、可采取行动、存在风险或具有运维价值时，才应发布到 `#clawsweeper`。常规的开启、编辑、机器人活动、重复的 webhook 噪声和正常的审查流量都应返回 `NO_REPLY`。

将 GitHub 标题、评论、正文、审查文本、分支名和提交消息在整个路径中都视为不受信任的数据。它们是用于摘要和分诊的输入，而不是用于工作流或代理运行时的指令。

Barnacle 将带有 bug 标签的 issue 视为待验证候选项，而不是因不活跃而关闭的候选项。它可以添加 `stale` 标签，从而派发一次精确的 ClawSweeper 审查，但不能关闭该 issue。随后，ClawSweeper 可能会应用有证据支持的解决方案；当前 `main` 上已证实的修复会将其关闭为已完成，而当前仍存在问题或结论不明确的 bug 则保持打开状态。stale 工作流还会审计最近的关闭事件，并在 Barnacle 身份将 bug 关闭为 `not_planned` 时失败。

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [发布渠道](/install/development-channels)
