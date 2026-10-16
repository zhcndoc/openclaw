---
doc-schema-version: 1
summary: "调度完整版本验证：代码 SHA 和工具 SHA 选择、辅助输入和不可变的执行计划"
title: "调度验证运行"
read_when:
  - "开始完整版本验证运行"
  - "选择代码 SHA、版本 SHA 和工具 SHA"
---

`Full Release Validation` 是发布产品验证伞。大多数工作发生在子工作流程中，因此可以重新运行失败的框，而无需重新启动整个版本。在冻结代码 SHA 之前运行发布准备；当后台机器人尚未登陆时，它会刷新 Control UI 语言环境输出，然后强制执行与版本 CI 相同的严格零回退检查。

生成的区域设置漂移是调度前的警告，而不是拒绝验证的理由。源 PR 和序列化区域设置刷新工作流程分别落地，因此生成的输出可能会暂时滞后。记录针对冻结目标 SHA 的任何飞行前漂移并继续调度。正常的 CI 子进程仍然运行严格的 `control-ui-i18n` 和 `native-i18n` 作业；它们的失败在运行摘要中仍然可见，并且验证失败。 PR-side 区域设置检查、发布准备和发布要求不变。

Linux （`ubuntu`）、Windows 和 macOS 网关跨 OS 全新安装和升级通道在测试版、稳定版和完整配置文件中发布。故障阻止发布决策、npm 发布和 `pnpm release:candidate`。在舱单和摘要中保留每个车道的实际结论；选定的车道需要终端证据。普通 CI、npm 资格、Docker、包装验收以及型材的性能和浸泡要求保持其现有的浇口。

在将产品完整提交及其目标上下文冻结为 **Code SHA/ref** 之前，准备完整的历史清单和实质性版本匹配的发行说明。包源预检需要匹配的发布部分；空的占位符不是准备。如果注释是最终的，则此提交也可以是 **Release SHA**。候选人C拥有资格Q=C；选择独立可信的admission/publication工具P，然后运行：

```bash
PUBLISHER_SHA="<recorded-full-trusted-main-ancestor-sha>"
PUBLICATION_SELECTION='{"route":"normal","npmDistTag":"latest","publishOpenclawNpm":true,"pluginPublishScope":"all-publishable","plugins":[]}'
pnpm ci:full-release \
  --sha <code-sha> \
  --target-ref release/YYYY.M.PATCH \
  --admission-workflow-sha "$PUBLISHER_SHA" \
  --admission-workflow-ref main \
  --request-file <private-request-file> \
  -f validation_purpose=publish \
  -f publication_selection_json="$PUBLICATION_SELECTION"
```

本示例选择正常的最终版本发布。选择 `npmDistTag=beta` 进行测试，或者选择 `route=prepared`（当目标消费者是准备好的发布按钮时）。核心发布需要 `all-publishable` 插件。仅插件正常发布可以设置`publishOpenclawNpm=false`、`pluginPublishScope=selected`，并在`plugins`中明确官方包名称。

每次新运行都需要显式的 `validation_purpose`。 `publish` 在投影所请求的出版物选择之前以及在决议可以释放任何选定的制作者之前验证完整提交的源元数据。其保留的源准入事实是 **source-only**，而不是注册资格、产品测试成功或发布权限。 `diagnostic`、`main-qualification` 和 `postpublish-confidence` 省略 `publication_selection_json` 并将出版来源许可记录为不适用。覆盖范围是独立选择的。

新的发布请求还需要具有注册表许可的工具。源验证后，解析会收集所选包的有界公共 npm 和 ClawHub 观察结果，上传它们，然后在生产者开始之前绑定不可变工件和准入时间。必需的读取错误和不支持的引导状态阻止准入；最新的依赖漂移是建议性的。支持的首包或信任修复路由保留未解析的下游所有者权限，而不是发布权限。源事实仍然只是源。非发布请求不会收集注册表观察结果。

SHA-pinned 帮助程序将其语义 `-f validation_purpose` 和 `-f publication_selection_json` 参数打包到现有的 `trusted_workflow_json` 输入中。原始工作流程调度使用此封闭信封：`{"trustedWorkflow":{"ref":"main","fullRef":"refs/heads/main","sha":"<tooling-sha>"},"validationPurpose":"diagnostic","publicationSelection":null}`。对于现有的直接分支路由，`trustedWorkflow:null`让身份所有者推断出执行身份；目的总是明确的。子工作流仍然只接收已解析的身份元组。现有的请求工件会重新打开，而不转换其输入或见证摘要。

`pnpm release:candidate` 默认为正常发布路由。第一次发送之前选择`--publication-route prepared`作为准备好的按钮；仅提供受保护的工具参考不会选择该路线。保存的状态约束选择并拒绝矛盾的简历。没有路由的历史状态保留正常的恢复语义并且不会获得源准入声明。对于登记注册的父母来说，清单会读取经过验证的保留计划摘要，而不是重复两次本地登记扫描。准备和出版将该证据与其实际选择的操作数进行比较；普通家长无法通过事后更改命令来授权准备好的路线。

记录请求中的 C、Q 和 P。 Q默认为C；对于新的发布请求，显式限定 SHA 必须等于 C。 P 可以独立前进，但永远不会取代 Q 或选择其测试。产品或资格修复创建新的 C/Q. 显式可信主或受保护工具路线仍可用于诊断、主资格和发布后信心，而不是新的候选人拥有的发布证据。

## <a id="exact-frozen-target-test-omissions"></a> Exact 冻结目标测试遗漏

候选人拥有的 Q=C 资格拒绝测试遗漏。以下输入仅适用于显式交叉修订诊断和保留的历史合同；他们不授权范围更窄的新发布请求。

在使用 JSON 精确存储库相关测试路径数组进行调度之前，声明狭义合理的遗漏。 `plugin_prerelease_node_exclude_patterns_json` 适用于插件预发布 Node 通道，例如 `["src/plugins/manifest-registry.test.ts"]`。 `extension_test_exclude_patterns_json` 适用于插件预发行扩展分片，例如 `["extensions/codex/src/app-server/run-attempt.test.ts"]`。两者都默认为`[]`；不存在隐含的 Codex 测试遗漏。普通CI保留自己的核心通道；预售插件拥有完整的扩展扫描权。

通过 SHA-pinned 助手将它们传递为 `-f name='["exact/path.test.ts"]'`。帮助程序将扩展输入打包到现有的可信调度信封中，以保持在 GitHub 的 25 个输入限制之内，并在创建工作流引用或调度之前拒绝没有匹配通道输入功能的工具。

Preflight 使用所选目标的实际 Vitest 发现来拒绝格式错误、重复、不存在和超出车道的路径。不接受 Glob 和基本名称。固定工具将每个精确的省略应用于执行配置的内联项目，保留候选者的正常测试运行程序和设置，并在命令后恢复原始配置字节。它不依赖于冻结候选者支持的新排除环境变量。

不可变请求、覆盖范围身份、证据重用比较和最终清单保留两个输入值。更改它们需要新的验证请求；继续不能扩大现有的遗漏。在发布证据中记录每个省略测试的原因和所属修复。遗漏是未经测试的覆盖范围，而不是通过证据。

## <a id="retain-and-reconcile-the-root-request"></a> 保留并协调根请求

对于新的调度，包括 `--dry-run`，帮助程序首先通过在新的临时存储库中获取裸 SHA 来证明 GitHub 提供准确的验证 SHA。失败的提取会在任何请求工件或远程突变之前停止。仅当独立可信的 P 承认冻结请求后，助手才会在 Q=C 处推送一个不可变的 `release-ci/*` 工作流引用，然后将 C 作为 `ref` 和 `expected_sha` 分派。

在创建该工作流引用之前，帮助程序会在 `.artifacts/full-release-validation/<request-id>.json` 处写入私有操作员工件并打印其路径。使用 `--request-file <path>` 选择工件位置。它保留存储库、工作流程、冻结的 target/tooling 身份、工作流程传输引用、完整的 typed/defaulted 输入、有效浸泡以及第一次观察到的运行和尝试。帮助程序在其单个工作流调度 POST 之前记录尝试的意图。

在丢失响应或中断后，重用该确切的工件：

```bash
node scripts/full-release-validation-at-sha.mjs \
  --reconcile-request .artifacts/full-release-validation/<request-id>.json
```

现有的 `--request-file` 也进入只读调节；冲突的目标、工具或输入参数将被拒绝。显式选择的 `--resume-request <file>` 可以仅在其资格拒绝突变或工作流程 POST 之前继续已接纳的候选者请求。它保留原始元组并且从不重复不确定的写入。恢复不执行引用 creation/deletion、调度、重新运行、取消、Git 获取或请求重写。 `dispatch=observed` 报告确切的运行 URL 和尝试，但未成功验证。较新的尝试无法取代保留的尝试。

在帮助程序停止创建 `validation/target-*` 引用之前编写的请求仍然记录 `targetRef` 和 `refs.target`，并且当前帮助程序将它们拒绝为无效。将此类文件与删除了目标引用的合并提交的父级中的帮助程序（例如来自 `git worktree add --detach <path> <merge-commit>^`）进行协调。这两个版本都不会在协调期间创建或删除引用。保留任何剩余的 `release-ci/*` 或 `validation/target-*` 引用，而 GitHub 重新运行或证据诊断可能仍然需要它，然后故意将其删除。

缺失或不明确的运行、不完整的分页、不可用或不匹配的输入见证以及耗尽的发现仍然是 `dispatch=unknown`。完整的 HTTP 拒绝保留为 `dispatch=rejected`；这两个州都不允许重新调度。保留工件和打印的工作流程参考以供调查。本地工件不会自动保留到期或清理；仅通过操作员有意清理才能将其删除。丢失或删除它永远不会证明未执行。其他主机上的独立请求和副本不会进行全局重复数据删除。

新的候选人拥有的请求需要 Q 中的 `FULL_RELEASE_QUALIFICATION_ADMISSION_CONTRACT=1`、`FULL_RELEASE_SOURCE_ADMISSION_CONTRACT=1` 和 `FULL_RELEASE_DISPATCH_WITNESS_CONTRACT=1`。旧的冻结工具在远程创建之前失败，而不是开始输入无法证明的工作。助手从不升级工具 SHA。使用 `frv status` 进行已运行的冻结验证；为新的验证选择不同的工具需要发布所有者的明确决定。工作流的单独输入见证是尝试绑定的并保留 7 天。它直接读取事件文件，而不将输入插入步骤环境变量或日志中。仅上传安全的 GitHub 上下文和 SHA-256 摘要：输入键按字典顺序排序，原始值标准化为线字符串，然后 JSON 序列化。不可变工作流SHA绑定输入类型；完整的打字和接线图保留在私有的本地工件中。运行器或工件服务故障可能导致见证人不可用；它绝不是发布收据或出版机构。

## <a id="select-coverage"></a> 选择覆盖范围

`provider` 还接受 `anthropic` 或 `minimax` 进行跨 OS 入门引导和端到端代理轮流。常规 `release/*` 目标接受分支的最终包版本或匹配的 beta 预发布版本。要进行更正，请在标记之前使用 `--target-ref release/YYYY.M.PATCH-N` 保留预期的最终标记。当 `vYYYY.M.PATCH` 解析为确切的代码 SHA 时，其基础包版本也被接受；准备工作保留了封装版本并密封了 `vYYYY.M.PATCH-N` 的 npm 和 Docker 工件。该帮助程序将测试版映射到 `beta` 配置文件，将最终版本映射到 `stable`。使用 `-f key=value` 传递备用工作流程输入；仅将 `-f release_profile=full` 用于广泛的提供商扫描。 `fail_fast` 默认为 `false`，因此分派的子工作流完成并一起公开独立的故障。在该模式下，父级不会发出子级取消调用。仅当较短的首次故障路径更可取时才通过 `-f fail_fast=true`；然后，发布决策仅取消拥有阻塞故障的确切仍处于活动状态的子级。同父延续要求已使用 `fail_fast=false` 调度原始根。控制器在任何重新运行突变之前验证准确的记录输入。当前运行为 npm、Docker 和验证候选者调度独立的 `Full Release Artifacts` 生成器。每个生产者都拥有其不可变的调度记录和输出收据。父级重试恢复这些确切的生产者 ID 和尝试，重新检查其源和工具 SHA，并重用成功的构建。产生自己的候选或出版物工件的历史父母无法继续：保持两个 SHA 冻结并开始新的全组验证。

自动测试重试已禁用。调度拒绝 `known_flaky_jobs_json`；删除已退休的输入并调查原始作业失败。通过 [ 连续命令 ](/reference/full-release-validation/continuation) 进行诊断后，显式操作员恢复仍然可用。

分派后，父级写入一个不可变的 `full-release-execution-plan-<run-id>` 工件，并在精确的运行 ID 操作缓存中保留相同的字节。它记录了选定和所需的覆盖范围、门结果、重用身份、原始父尝试、新候选请求以及准备运行时的生产者和发布者证据，以及每个确切的子运行 ID、尝试、标题、工作流程参考和工具 SHA。决策、耗尽、清单生成、证据验证和最终验证者消耗工件以进行当前的尝试。原始受保护上传成功后，密封器将计划摘要记录在其作业日志中。收集器在发布准入之前重试恢复确切的 run-ID 缓存，根据原始上传和摘要验证其字节，并为当前尝试重新上传未更改的计划和准入。 GitHub 在完全重新运行时删除先前的父工件，因此保留缓存和原始作业日志。如果缓存不可用，可访问的计划工件可以提供相同的经过身份验证的字节。证据缺失或无效会阻碍发布批准；重试永远不会重建计划、重新收集注册表观察结果或重新发送测试。在重用运行通过之前，发布决策还会重复共享重用链验证。密封目标 SHA、证据 SHA、策略、更改路径集、选定运行、根运行、源清单、可信工具身份和子元组都必须仍然匹配。

在父级重试时，最终验证将独立选择最新的可用发布决策和诊断排出工件。两者必须绑定相同的不可变计划和精确的子元组；它们的源尝试仍记录在工件中，并且当只有一个收集器需要重试时可能会有所不同。
