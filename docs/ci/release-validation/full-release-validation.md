---
summary: "完整发布验证伞、发布发布和 Docker 发布调度"
read_when:
  - "您正在分派或重新运行完整发布验证"
  - "您正在发布版本或 Docker 映像"
title: "完整版本验证"
sidebarTitle: "完整版本验证"
---

完整发布验证伞、发布发布和 Docker 发布调度。 [ 发布验证工作流程](/ci/release-validation) 索引的一部分。

## <a id="mobile-store-releases"></a> 移动商店发布

`iOS Store Release` （`ios-store-release.yml`） 和 `Android Store Release` （`android-store-release.yml`） 是单独的手动工作流程。选择`main`，然后单击**运行工作流程**，使用默认值；不需要释放参数。 iOS 工作流程还提供 **screenshots** 操作，无需上传即可进行捕获。每个平台都会将自己的运行排队，而不取消活动上传。

工作流程运行与干净的当前本地 `main` 结账可用的相同命令：`pnpm ios:release:upload` 和 `pnpm android:release:upload`。两者都冻结源代码提交，使用存储库版本和当前存储状态计划发布，生成平台发行说明，然后构建、签名和上传。本地设置`OPENAI_API_KEY`； Actions 读取具有该名称的存储库机密。平台设置、签名和存储凭据记录在每个应用程序的 `fastlane/SETUP.md` 中。

发布准备工作位于跟踪的源文件之外，并且不创建提交或拉取请求。成功上传记录指向`refs/openclaw/mobile-releases/`下的原始来源SHA。 Actions 将平台计划 `release-notes.json` 和可用的签名二进制文件保留 30 天。失败后，在开始另一次上传之前检查这些工件并存储状态。应用程序审核提交和 Android 生产推广仍然是手动的。

要预览笔记而不构建或上传，请使用保存的平台计划和新的输出路径：

```bash
pnpm mobile:release:notes -- generate --platform ios --plan /path/to/ios-plan.json --output /path/to/preview-notes.json
```

使用 `--platform android` 和 `android-plan.json` 来记录电话和磨损记录。该计划确定了目标 version/build、确切源 SHA 和公共基线构建。对于历史候选者，添加与该计划匹配的 `--source-sha <full-commit-sha>`；提交必须存在于本地。无需模型调用即可验证和重用现有输出。使用新的输出文件来评估不同的草稿。

Generation 使用 OpenAI 响应 API 进行结构化输出、源证据提取和单独的事实审查。它涵盖了应用程序和捆绑的共享代码，包括 Play 特定源和 Watch RTC。草稿必须符合商店的字符限制，生成或审核失败会停止上传。模型仍然可能会忽略或误解更改；在手动公开推广之前检查运行摘要中保存的注释。通过保留工件，而不是期望新的模型请求返回相同的单词，可以重现注释。

## <a id="full-release-validation"></a> 完整发布验证

`Full Release Validation`是手动释放伞。每次运行都会绑定精确的候选 C、资格 Q 和 admission/publication P 元组，并在子调度之前拒绝 `expected_sha` 不匹配。新出版物使用Q=C； P 是独立可信的，无法提供替代测试。验证 SHA 映射到用于产品验证的代码 SHA 或用于仅更改日志验证的版本 SHA；它不是第三个发布标识。 Beta 发布映射到 `release_profile=beta` 和 `run_release_soak=false`。常规稳定版本使用 `release_profile=stable`。

请参阅 [ 完整版本验证](/reference/full-release-validation)，了解阶段矩阵、确切的工作流程作业名称、配置文件差异、`npm-beta-v1` 和 `npm-stable-v1` 覆盖策略、工件和重点重新运行句柄。

`normal_ci` 子级调度具有确切目标和发布范围的 `ci.yml`，而不使用 `release_gate`。每个选定的故障都保持阻塞状态，包括 Windows Node 故障。完整的活动 （`rerun_group=all`） 保留 QA Smoke 的完整场景配置文件和 Control UI 性能，与更改的路径无关。 Docker 种子运行每个普通 manual/release 范围中的所有五个通道：`cron-mcp-cleanup`、`mcp-channels`、`mcp-code-mode-gateway`、`published-upgrade-survivor` 和 `update-channel-switch`。这包括 `npm-beta` 和 `npm-stable` 资格。幸存者使用 `legacy-operator-state` 和 `auto-auth`，因此发布的驱动程序必须更新正在运行的托管网关。每个承认的上游主管道都保留这种精确的组合。当冻结目标声明的场景目录支持 `legacy-operator-state` 时，冻结目标会保留它；历史目标保留`base`和`auto-auth`。缺失的历史目录保留了这种后备；格式错误或无效的目录会失败。 PR 将完整幸存者推迟到每小时主要和完整发布验证，而其他 Docker 种子通道和 QA Smoke 保留其所有者地图。普通手册CI构建了完整的声明完整包。完整发布验证的 Docker 种子子项在未配置发布运行程序组和现有烟雾包且不删除覆盖范围时使用 16 级 Blacksmith 运行程序。托管的中断覆盖和重试保持其恢复路线，并且加权通道准入保持串行。主要和选定的 PR（包括精确头 `release_gate` 后备）使用现有的 `ciArtifacts` 配置文件并与 `--skip-build` 共享打包程序，保留运行时、公共 SDK 声明和未更改的 tarball 完整性检查。每小时受保护的缓存预热器还保留完整的声明生成。托管手册CI将QA Smoke分为六个部分；正常的混合首次尝试使用具有相同覆盖范围的四个部分。

对于具有 [ 测试运行时选择 ](/ci/pipeline#test-runtime-selection) 的目标，`normal_ci` 保留完整的 Node 测试清单，并且还在 Bun 上运行每个承认的 Bun- 兼容选择。两个结果都是必需的；它们共享现有作业并在每个工作槽内按顺序执行。没有此功能的较旧目标仅保留 Node- 测试。这包括两个运行时上的完整 Control UI 选择，包括保留断言（当目标的运行时所有者承认时）。较旧的目标保留 UI 的 Node 通行证，并且只有 Bun 选择其运行时所有者承认。

包验收单独保留扩展的已发布升级场景：当前未发布的候选者包括本机操作员状态，并且 stable/full 配置文件强制 `reported-issues` 浸泡。其普通幸存者重启模式和单独的 `update-restart-auth` 基本场景不会取代确切的 Docker 种子组合。 `Full Release Artifacts` 和 `Full Release Candidate` 准备不可变的 package/image 输入；候选阶段发布检查会消耗它们，而不会移动或削弱该覆盖范围。

现有的冻结目标合同仍然适用：Docker 种子需要其声明的功能，而没有 Docker 层选择器的目标保留幸存者后备。 QA Smoke 需要受支持的harness，历史性能检查保留其可用性处理。集中重播选择其请求的组，经过验证的证据重用可以重用已完成的证据。其余自动所有者路径之外的回归，或五个仅发布的 Docker 种子通道中的回归，可以首先在此 manual/release 层中出现。

live/E2E selected-ref 验证器通过稀疏检出获取完整的提交和引用历史记录。祖先和发布引用检查保持不变，而历史文件内容不参与此仅元数据作业。构建和测试作业检查它们自己的完整源代码树。

`OpenClaw Release Publish` 是手动变更发布工作流程。在发布标签存在且 OpenClaw npm 预检成功后（预检在其检查中运行 `pnpm plugins:sync:check`），从冻结工具 SHA 上受保护的轻量级 `release-publish/<tooling-sha12>-<epoch>` 标签调度定期测试版和稳定版。该标签仍然选择确切的发布提交，包括 `release/YYYY.M.PATCH` 上的提交。对于当前验证运行，将 `preflight_run_id` 和 `full_release_validation_run_id` 设置为相同的成功完整版本验证运行 ID 和引脚 `full_release_validation_run_attempt`。发布者从该验证清单的密封 `publicationArtifacts.npmPreflight` 描述符中解析独立的 `Full Release Artifacts` 生产者。生产者 ID 本身不具有完整发布验证授权。

在源身份和映像准备成功（或提供准备好的工件）后，`Docker Release` 在单独的作业中请求 `docker-release` 环境批准。批准等待停留在 `docker-release-publish` 之外；只有经过批准的发布者才能输入全局 registry/alias 锁定。然后，它在写入之前重新验证不可变源、准备好的工件、证明和别名状态。 Docker 集线器凭据仍然需要调用者提供的机密。未通过准备、拒绝批准和取消的不能发布。

历史恢复可能仍会提供单独的成功 `OpenClaw NPM Release` 预检运行 ID 以及匹配的成功完整版本验证运行和尝试。使用[发布发布命令](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/regular-release.md#qualify-publication-bytes)创建工具标签；来自 `main` 的真实核心 npm、插件 npm 或 ClawHub 发布在子调度之前被拒绝。 Docker-仅恢复可能仍使用`main`。

发布者为所有可发布的插件包调度 `Plugin NPM Release`，为同一版本 SHA 调度 `Plugin ClawHub Release`，然后在插件 npm 成功后调度 `OpenClaw NPM Release`。稳定的 Windows 升级是可选的：提供精确的 `windows_node_tag` 和候选人批准的 `windows_node_installer_digests`，以在 GitHub 版本最终确定后派遣其签名的安装程序。省略两者以跳过 Windows。对于 npm-stable 证据，当标记的 `apps/android/version.json` 与稳定标签的基本版本匹配时，单独的本机限定作业将启动完整的 CI，以获取启用 Android 的确切版本 SHA。核心发布后，在单独的 Android 作业创建其现有批准收据并分派标签拥有的 APK 工作流之前，将重新验证成功的结果。这使得冻结的发布标签可用，而不允许更窄的 npm 证据来授权不合格的本机构建。本机故障仍然可见并阻止 Android 批准；核心npm和GitHub发布完成无需等待。在核心发布后，母语资格完成后，整个家长可以保持活跃状态​​。现有的完整证据和macOS的独立验证保留了其原始资格合同。不匹配的 Android 引脚会跳过本机资格和 APK 发布，并在父摘要和发布证明中记录引脚、发布序列和 Android 版本锁定 （`pnpm android:version:pin -- --from-gateway`） 补救措施。仅针对插件的修复使用 `plugin_publish_scope=selected` 和非空包列表。仅插件 `all-publishable` 运行需要与核心发布相同的不可变 npm 预检和完整发布验证证据。

```bash
PUBLISH_REF="release-publish/<tooling-sha12>-<epoch>"
FRV_RUN_ID="<successful-full-release-validation-run-id>"
FRV_RUN_ATTEMPT="<successful-full-release-validation-run-attempt>"
gh workflow run openclaw-release-publish.yml \
  --ref "$PUBLISH_REF" \
  -f tag=vYYYY.M.PATCH-beta.N \
  -f preflight_run_id="$FRV_RUN_ID" \
  -f full_release_validation_run_id="$FRV_RUN_ID" \
  -f full_release_validation_run_attempt="$FRV_RUN_ATTEMPT" \
  -f npm_dist_tag=beta
```

对于在快速变化分支上的固定 commit 证明，请使用辅助工具，而不是 `gh workflow run ... --ref main -f ref=<sha>`：

```bash
PUBLISHER_SHA="<recorded-full-trusted-main-ancestor-sha>"
VALIDATION_SHA="<full-release-candidate-sha>"
PUBLICATION_SELECTION='{"route":"normal","npmDistTag":"latest","publishOpenclawNpm":true,"pluginPublishScope":"all-publishable","plugins":[]}'
pnpm ci:full-release \
  --sha "$VALIDATION_SHA" \
  --target-ref release/YYYY.M.PATCH \
  --admission-workflow-sha "$PUBLISHER_SHA" \
  --admission-workflow-ref main \
  --request-file <private-request-file> \
  -f validation_purpose=publish \
  -f publication_selection_json="$PUBLICATION_SELECTION"
```

选择 `npmDistTag=beta` 作为测试版，而 `route=prepared` 仅适用于准备按钮的消费者。源准入验证提交的元数据；新的发布运行还在扇出之前保留单独选定的 npm 和 ClawHub 注册表许可。两者均不授予出版权。两个合约请参见 [Dispatch](/reference/full-release-validation/dispatch)。对于非发布作品，明确选择 `diagnostic`、`main-qualification` 或 `postpublish-confidence` 并省略发布选择；配置文件和过滤器仍然选择实际的覆盖范围。

GitHub 工作流调度引用必须是分支或标签，而不是原始提交 SHA。帮助程序首先证明 GitHub 通过在新的临时存储库中获取裸 SHA 来提供准确的验证 SHA，包括在试运行中。独立准入后，它在 Q=C 处推送一个不可变的 `release-ci/*` 工作流引用，并通过 `ref` 和 `expected_sha` 传递 C。重复使用的证据必须保留其原始Q和覆盖范围；每个新的子工作流程 `headSha` 必须与 Q 匹配。记录所有三个角色，并且永远不会因移动 `main` 而刷新资格。常规发布分支仅接受其最终包版本或匹配的 Beta 预发布版本。

`release_profile` 控制传递到发布检查的 live/provider 宽度。手动发布工作流程默认为`stable`；仅当您有意需要广泛的 provider/media 矩阵时才使用 `full` 。稳定且完整的发布检查始终运行详尽的 live/E2E 和 Docker 发布路径浸泡； beta 配置文件可以选择使用 `run_release_soak=true`。

`fail_fast` 默认为 `false`：总控会等待每个已触发的子工作流，并汇总报告各自的失败。只有当某个子工作流在首个任务失败后立即取消，比获取完整的失败清单更有价值时，才应设置 `fail_fast=true`。在 Release Checks 中，这也会启用 Matrix QA CLI 自带的“首个场景失败即取消”功能。

- `beta` 保留最快的 OpenAI/core 发布关键通道。
- `stable` 增加稳定版 provider/backend 集合。
- `full` 运行广泛的 provider/media 矩阵。

保护伞记录已调度的子运行 ID，`Verify full validation` 在父尝试期间检查它们。家长取消或超时让领养的孩子继续跑步；当不再需要时明确取消它。

为了恢复，为每个失败的测试决定阻止程序或碎片，然后在编辑之前对产品、harness/tooling/provenance、infrastructure/credential 和包装器失败进行分类。仅确认产品或资格harness故障更改 C/Q. 在明确的窄 `rerun_group` 验证运行之前诊断并修复拥有的缺陷；切勿自动重试失败的测试或扩大到 `all`。 Flakes 最多获得两次明确的相同 SHA 重新运行以及对 `main` 的跟踪修复；记录符合条件但仍失败的作业，而不是更改工具、重新切割或开始另一个完整版本验证。狭义证据本身并不发布授权。

`OpenClaw Release Checks` 使用受信任的工作流程引用将选定的引用解析为 `release-package-under-test` tarball，然后将该工件传递给交叉 OS 检查和包验收，以及运行浸泡覆盖时的 live/E2E 发布路径 Docker 工作流程。这可以使包字节在各个发布盒之间保持一致，并避免在多个子作业中重新打包相同的候选者。源包准备有35分钟的整个工作预算，因此冷声明生成和包库存可以在工件上传之前完成；下游作业仍然只消耗不可变的上传包。对于 Codex npm- 插件实时通道，发布检查要么传递从 `release_package_spec` 派生的匹配已发布插件规范，传递操作员提供的 `codex_plugin_spec`，要么将输入留空，以便 Docker 脚本打包所选结账的 Codex 插件。

完整发布验证并发性由验证 SHA、工具 SHA、重新运行组、发布配置文件和 `cancel-in-progress: false` 的有效浸泡覆盖率决定。发布检查在每个阶段使用相同的覆盖范围标识，因此 beta、稳定和完整请求不会排在彼此后面。 Stable/full 始终包括浸泡；显式设置其浸泡标志不会创建另一个并发组。父母取消并不会取消领养的孩子。

在上游存储库的 `hybrid` 运行程序模式中，目标解析、证据重用、候选发现、候选绑定和候选解析使用小型 Blacksmith 运行程序池。否则，这些串行作业会在测试开始之前加剧托管跑步者准入延迟。其他模式和存储库保留 GitHub-hosted 运行程序；可重复使用的harness还支持其显式的托管运行程序覆盖。长期运行的决策和诊断收集器仍然托管。
