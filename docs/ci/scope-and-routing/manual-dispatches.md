---
summary: "手动 CI 调度行为、释放门回退和 Windows 测试盒检查"
read_when:
  - "您正在手动发送 CI 或完整发布验证"
  - "您需要 Windows 测试盒检查输入"
title: "手动调度"
sidebarTitle: "手动调度"
---

手动 CI 调度行为、释放门回退和 Windows 测试盒检查。 [CI 范围和路由](/ci/scope-and-routing) 索引的一部分。

## <a id="manual-dispatches"></a> 手动派发

普通手动 CI 调度运行与普通 CI 相同的作业图，但强制打开每个非 Android 作用域通道：Linux Node 分片、捆绑插件分片、插件和通道合约分片、Node 至少 24兼容性、`check-*`、`check-additional-*`、内置工件烟雾检查、文档检查、Python 技能、Windows、macOS、完整 iOS build/test 和屏幕截图资格以及 Control UI/native 应用程序国际化。它们的逻辑运行配置文件始终为 `github`，与 `runs-on` 选择的物理回退无关。 Node 24 最低兼容性仅在完整版本验证和手动调度中运行；推拉请求 CI 跳过它。相反，精确头部 `release_gate` 后备会保留拉取请求的 macOS、iOS 烟雾和生成的本机区域设置范围，而不选择 iOS 屏幕截图或本机测试。自动源 PR 和发布门可验证本机提取清单和 Android/Apple 本地化安全性，而无需在同一 PR 中翻译或平台生成的输出。序列化的本机应用程序区域设置刷新工作流程在一个隔离的 PR 中重建这些工件，并在所需检查通过后启用精确头部自动合并。本机奇偶校验仍然阻止生成的工件 PR、生成的范围发布门、普通手册 CI、全范围发布验证和发布准备。当区域设置刷新赶上时，CI 将经过验证的过时本机翻译 ID、Android 生成的行和 Apple 目录行报告为警告；活动密钥覆盖率、正确性和所有其他奇偶校验检查仍然处于阻塞状态。请参阅 [ 本地检查 ](/ci/local-proof) 以了解确切的边界。 Control UI 区域设置奇偶校验仍然建议自动运行 PR 和 `main`，并阻止 manual/release CI。独立手册 CI 调度仅与 `include_android=true` 一起运行 Android（`release_gate` 输入也强制 Android）；全范围发布验证通过传递 `include_android=true` 来启用 Android，而无需设置 `release_gate`； npm 资格范围推迟于 Android。插件预发布静态检查、完整 `agentic-plugins` 扫描、完整扩展批量扫描和插件预发布 Docker 通道不包括在 CI 中。仅当 `Full Release Validation` 在启用发布验证门的情况下调度单独的 `Plugin Prerelease` 工作流程时，Docker 预发布套件才会运行。

PR 基线棘轮从签出的合成合并树中导出其比较状态，并根据事件头验证其头父级。 max-lines 条目在断言安全检查之前使用相同的分叉点引用链接环境变量预算，因此生产源增长不能首先在 `main` 上出现。手动运行使用唯一的并发组，因此候选发布完整套件不会被另一次推送或在同一引用上运行的 PR 取消。可选的 `target_ref` 输入允许受信任的调用者在使用所选调度参考中的工作流文件时针对分支、标记或完整提交 SHA 运行该图；棘轮基线与目标的合并基础与针对该运行解析的默认分支头进行比较。 `release_gate` 输入是容量停滞的 PR CI 的精确 SHA 维护者回退：它要求 `target_ref` 是与分派分支头匹配的完整提交 SHA 和 `pull_request_number` 来识别开放PR，其合并树已验证。发布门合并树 lint 使用与托管 PR CI 相同的 5 个核心条带以及 1 个扩展条带，因此没有一个托管运行器拥有完整的类型感知 lint 工作负载。

普通上游手册CI还保留了QA Smoke的完整配置文件和Control UI性能，无需所有者路径过滤。当目标声明 `docker-seed-e2e-contract-v1` 时，它会选择 `published-upgrade-survivor`，保留每个承认的上游主运行所使用的确切 `legacy-operator-state` 以及 `auto-auth` 证明。每个普通人工调度通过`resolveDockerSeedLanes`添加`cron-mcp-cleanup`、`mcp-channels`、`mcp-code-mode-gateway`、`update-channel-switch`，其中包括`npm-beta`和`npm-stable`资质。没有层选择器的较旧目标保留幸存者。普通手册CI构建了完整的包。仅主要的 `ciArtifacts` 准备也适用于公认的主要形状资格调度，它再现主要工作以进行计时比较。拉取请求和精确头 `release_gate` 后备忽略 Docker 种子和 QA 烟雾。完整发布验证通过其正常的 CI 子项到达这些通道，而无需设置 `release_gate`；冻结目标保留其现有的能力检查。

```bash
gh workflow run ci.yml --ref release/YYYY.M.PATCH
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
VALIDATION_SHA="<full-commit-sha>"
gh workflow run full-release-validation.yml --ref main \
  -f trusted_workflow_json='{"trustedWorkflow":null,"validationPurpose":"diagnostic","publicationSelection":null}' \
  -f ref="$VALIDATION_SHA" \
  -f expected_sha="$VALIDATION_SHA"
```

网关扩展稳定共享发布需要来自 Q=C 处独立承认的 `release-ci/*` 工具的完整候选者拥有的完整版本验证，针对冻结的 `extended-stable/YYYY.M.33` 尖端。上面的原始诊断示例和直接 `main` 生产者不满足该出版合同。当前舱单还提供合格的 npm 预检工件。共享的 `OpenClaw Release Publish` 父级从冻结的可信主工具 SHA 处受保护的轻量级 `release-publish/<sha12>-<epoch>` 标签进行调度，并使用 `npm_dist_tag=extended-stable` 发布官方 npm 插件和核心，附加证据，发布 Docker，并最终确定非最新版本GitHub 发布。仅`extended-stable*`容器别名提前； ClawHub、本机应用程序、网站、常规 npm `latest` 和私有 dist 标签表面不包括在内。核心恢复恢复在恢复证据和最终确定之前验证现有的注册表字节；仅 Docker- 恢复使 GitHub 最终确定保持不变。有关命令和恢复，请参阅 [ 每月网关扩展稳定版出版物 ](https://github.com/openclaw/openclaw/blob/main/.agents/skills/release-openclaw-maintainer/references/extended-stable-publish.md)。

<a id="windows-testbox-probe" />

### <a id="windows-testbox-check"></a> Windows 测试箱检查

手动 `windows-testbox-probe.yml` 工作流程在选定的 `runner_label` 上保持 Windows/WSL 检查和无头 Windows CI。当未提供已安装的包绑定时，`run_windows_ci` 输入（默认 `false`）请求无头 CI 和 GitHub- 托管的 `windows-2025` 上的单独本机计划任务证明作业。两项工作都依赖于另一项工作，因此它们的结果保持独立可见；所请求的证明失败都会导致工作流程失败。

设置 `skip_defender_exclusions=true` 以使 Windows Defender 策略在整个工作流程中保持不变，包括本机和已安装的计划任务校对作业。这仅跳过工作区和 Node 进程排除；证明选择、隔离检查、本机生命周期测试、清理和证据上传保持不变。默认值为 `false`，保留 Windows、CI 的现有尽力排除和精确重播。

对于这两个证明，将 `target_ref` 设置为精确的 40 个字符提交 SHA。这两个作业都会检查该目标，并且本机证明会在运行生命周期测试之前验证检查是否相等。本机预检在设置之前运行，并且需要交互式 Windows 会话。非交互式跑步者未能通过资格认证，而不是默默地跳过证明。选择 `windows-2025` 并不建立本机资格：未更改的生命周期断言和清理必须传递给实际的运行程序。失败后清理和诊断上传仍会运行，并且仅在清理和上传成功后才会删除保留的证据。

#### <a id="installed-scheduled-task-upgrades"></a> 已安装计划任务升级

将 `run_windows_ci=true` 设置为来自成功的包验收运行的一个 `installed_startup_package` 绑定、`runner_label=windows-2025` 和 `keepalive_minutes=0`。发送已审核的工作流程修订版，并使用其确切的 SHA 作为 `target_ref`；装订独立地固定在产品包装上。关闭其他校样模式。通过空包绑定，独立的纯源 CI 和上面的本机作业保留其行为。

现有的包解析器对候选者进行身份验证，然后将同一工作流程运行中经过验证的工件传递给本机作业。该作业保留 `contents: read` 权限。它运行新安装的候选程序以及针对该候选程序未更改的发布的 2026.9.3 和 2026.9.4 CLI 更新程序。每次升级还在其标准任务名称下保留一个单独的运行配置文件。实时状态握手必须与已验证的软件包版本匹配并构建 ID；更新后的网关必须具有新的 PID，而对等方保留其 PID 和基线身份。候选更新预览和深度医生发现检查实际注册的任务操作，包括报告为额外的禁用的自定义命名网关 CMD 任务和缺少启动器的拥有的禁用任务。新单元还检查禁用的直接可执行操作，并验证打包的更新预览是否使其不受支持的自动服务管理不可用。这证明了只读检查和保存，而不是直接操作执行或更新突变。

单元按顺序准备自己的正常 npm 安装。在一次性前缀和缓存退役或下一个单元启动之前，实际任务和后代清理以及不可变证明上传必须成功。失败的单元保留其证据并停止序列；强制命令清理无法建立传递的自然退出结果。最终的工件需要所有三个单元。

该夹具根据临时 13 GiB 全新安装和 29 GiB 已发布配对余量检查工具设置后的实际可用空间。这些是计划津贴，而不是测量的包范围或跑步者容量。它记录生命周期边界的空间和拥有的分配；观察之间的瞬态峰值仍然未知。现有的命令、测试、步骤和作业截止日期保持不变。

#### <a id="exact-windows-test-replay"></a> Exact Windows 测试回放

对于记录的 CI 故障的有序诊断，请将 `windows_ci_replay` 设置为 JSON 对象，其中包含 `nodeVersion`、`packageManager`、`vitestVersion`、`maxWorkers`、`files` 和`projects`。使用精确的 Node 24 补丁并检查完整的 pnpm 完整性引脚和 Vitest 版本。 `maxWorkers` 是从 1 到 4 的整数。 `files` 是 `src/`、`test/`、`extensions/` 或 `packages/` 下跟踪的文字、跟踪测试路径的原始有序数组； `projects` 是 `test/vitest/vitest.<name>.config.ts` 路径的原始有序数组。不接受 Glob、shell 文本、任意 CLI 参数和环境覆盖。

将 `target_ref` 设置为确切的源 SHA，选择原始 `runner_label`，设置 `keepalive_minutes=0`，并关闭所有其他校样模式。这仅运行现有的 `scripts/test-projects.mts` 入口点和 `--fileParallelism`、一次一个项目进程、请求的工作线程数以及原始 Windows CI 堆和扩展分片设置。普通CI工人政策不变。运行时准备和进程生命周期由冻结源的调度程序负责；工作流程不会将当前测试工具复制到其中。

在同一已审核的工作流程修订中将基线和失败源作为单独的序列化工作流程调用运行。每个都有自己的运行程序结帐和冻结安装；切勿在主动结账时切换来源。记录两次运行的实际 CPU/RAM，而不是从运行标签推断容量。

`windows-ci-replay-<runId>-<attempt>` 工件保留输入、源和工作流身份、依赖项哈希、本机 runtime/resources、精确 argv、组合输出、流程状态、观察到的项目顺序和保留的命名空间诊断。如果没有完整的预期项目序列，成功的测试命令将无法通过资格认证。较早的故障保留其部分序列并保持失败状态。不添加重播重试或 pass/fail 豁免。

没有持久的 Testbox 租约、SSH 设置或保持活动。现有的测试所有者处理普通生命周期；炬力拥有 job/runner 最终拆解。当后代结算未经验证时，冻结的 Windows 运行者可以保留临时命名空间。不要在运行期间删除它们或从零过程状态推断结算。保留该诊断结果，检查最终的流道清理情况，并与测试结果分开报告任何缺失的拆卸证据。

#### <a id="installed-repair-worker-compatibility-and-cleanup"></a> 已安装的维修人员兼容性和清理

将 `installed_repair_worker=true` 设置为一个 `installed_startup_package` 绑定、`runner_label=windows-2025` 和 `keepalive_minutes=0`。将 `target_ref` 固定到与分派工作流程相同的已审核提交。关闭其他校样模式。现有的包所有者安装并验证确切的候选工件；本地入场门需要一个新的托管运行器，无需凭证、操作员安装、Tailnet 附件或托管身份。

该检查验证并安装 npm 版本 2026.9.4 和 2026.9.5，然后针对已安装的候选工作程序调用其未更改的已发布修复控制器。 2026.9.4版本委托其验证阶段； 2026.9.5 还委托验证。每个都必须接收延迟的不可用结果，而无需提供者请求、验证调用或对合成状态的更改。这证明了控制器兼容性，而不是完整的安装更新程序升级。

单独的单元使用候选者的打包执行器和账本所有者来承认针对环回模型固定装置的真正委托工作并拒绝错误的接收器。真正的工具会启动后续进程。正常和强制工人退出都必须在父执行者解决之前将其删除，同时外部观察者及其 Windows 作业启动器保持活动状态。父级或外部清理不能满足该断言。最初的 90 秒工人、60 秒轮转、120 秒细胞和 2 秒灭绝期限保持不变。

`windows-installed-startup-<runId>-<attempt>` 工件保留 `repair-results.json`、失败或已完成的单元、本机作业观察、PID/start 身份、精确的 package/controller/runtime/tooling 哈希值、综合提供程序计数、状态效果和最终清理。检查在单元发生故障后停止，并且永远不会用成功的跑步者拆卸来代替工人资格。

#### <a id="installed-gateway-startup-measurements"></a> 已安装网关启动测量

相同的工作流程可以测量所选 Windows 运行器上的一个不可变的 npm 包。将 `target_ref` 设置为完整工具提交，将 `run_windows_ci=false`、`keepalive_minutes=0` 和 `startup_node_version` 设置为精确的 Node 版本（默认 `26.9.0`）。将 WSL 和 Defender 输入保留为默认值。可选的 `installed_startup_package` 输入是 JSON 对象，其中包含 `runId`、`runAttempt`、`workflowSha`、`artifactId`、`artifactDigest`、`packageSha256` 和 `sourceSha`。使用成功的包验收运行中的不可变 `package-under-test-<runId>-<runAttempt>` 工件。该工作流程验证其生产者和工件元数据，通过包候选所有者对其进行解析，并使用正常的 npm 生命周期脚本进行安装和重建。

在基准测试的生命周期装置通过 Windows 后，安装的 `openclaw.mjs` 以新的合成状态运行一次，然后以相同的状态运行八次。每个样本都会记录 HTTP 准备情况、第一状态和运行状况 RPC 响应，并确认正常关闭。外部托管的 Windows 作业包含控制器和所有后代；最终的成功需要在强制作业清理之前彻底关闭网关并观察后代定居。测量期间不会运行同步进程采样器或启动分析器。

`windows-installed-startup-<runId>-<runAttempt>` 工件保留所有九个示例槽、错误、package/runtime/helper 哈希、源和工具提交、运行器硬件、原始安装的 npm 锁定文件和清理证据。即使取消阻止了最终样本检查点，流式传输的 `cohort.log` 也会保留活动的 PID、相位、子输出和已完成的 check/RPC 观测值。 Synthetic 数据库和编译缓存保留在运行程序的临时目录中。失败或中断的队列没有既定的总结。 “新鲜”意味着新的状态，而不是冷的文件系统；专用运行程序结果建立了新的基准，并且不会建立相对于不同桌面的加速。运行状况 RPC 成功与记录的插件可用性和降级诊断无关。

要进行匹配比较，请将 `installed_startup_package` 作为 `{"baseline": <package-binding>, "candidate": <package-binding>}` 传递。两个绑定都使用上面相同的字段。该工作流程会在测量之前解析并通常在一个运行器上安装这两个软件包。它们的完整 npm 锁定记录必须匹配，独立验证的 OpenClaw tarball 引用和完整性除外。任何依赖性漂移都会在网关启动之前停止比较；两把原始锁仍然是证据。这些包必须具有相同的版本和依赖关系图。

每个包都有自己的不可变安装和合成 state/cache 目录。该队列计划 18 个槽位：新基准，然后是新候选，然后是八个重新启动对，交替 baseline/candidate 和 candidate/baseline 顺序。重启后，两个臂都会保留自己的状态。没有废弃的预热或替换样品。失败会停止队列，保留剩余的未运行槽，并使比较摘要无效。每个样本的截止日期保持不变；两个臂的外部生命周期预算从 30 分钟到 60 分钟不等。

在所有样本和后代稳定下来后，比较报告每个手臂的既定准备情况和绝对第一个 status/health 完成情况，以及配对候选者减去基线差异。负差异对候选人有利。新鲜样品保持分离。交替顺序减少了时间顺序偏差；它不会使文件系统变冷或在其他机器上建立性能。

对于 CPU 归属，将 `installed_startup_cpu_diagnostic=true` 设置为一包绑定。这种单独的模式运行一个未配置的新鲜 Prime，然后运行一个使用相同合成状态的已建立启动的本机 CPU 配置文件。两次发射仍需要准备就绪，首先是 status/health 请求、确认关闭和后代结算。它不产生时序摘要或配对比较。该工件保留原始 `.cpuprofile` 文件、主要 process/thread 身份、预加载时钟观察、启动跟踪指标、配置哈希和备份存在事实。预载的单调和性能时钟观测仍然可用于网关进程内的校准。控制器、网关和本机配置文件时间戳具有单独标识的时钟域；它们的对齐方式尚未建立。不要比较这些域的绝对值，也不要假设配置文件的最后采样时间戳包括预加载的退出观察。控制台和流跟踪输出共享诊断观察器，包括在 Bun 下。分析和跟踪观察会增加开销； main-isolate 样本不考虑未配置的子进程或 Worker CPU。普通计时队列仍未被检测。
