---
summary: "本地命令等效项、仅限收缩棘轮和 Crabbox 远程证明"
title: "本地检查和测试箱"
read_when:
  - "您想在自己的机器上重现 CI 通道"
  - "您正在为拉取请求生成 Testbox 或 Crabbox 证明"
---

## <a id="local-equivalents"></a> 本地等价命令

严格管理的命令在释放临时资源之前加入其进程组并捕获输出。领导者可以在未引用的助手完成对标准输入 EOF 的响应之前退出，因此正常的 POSIX 退出保留现有清理预算的一半用于自然组排水，一半用于强制清理。要求强制清理命令仍然失败；实时或不可检查的组以及保持打开状态的输出永远不会被视为成功完成。仅僵尸群体已经被终止，即使它们的新父母还没有收割它们。自然排水期间取消立即转发其信号；其宽限期不迟于原始中点结束，保留恢复津贴和总清理期限。

完整的通道和网关方法测试项目在开始测试过程之前准备其本机工作工件。因此，冷编译不会消耗测试输出看门狗的截止时间。集中选择保留了懒惰的准备；看门狗和编译器清理规则保持不变。

lint 包装器拥有当前 CI 的 Go 资源限制。它将它们应用于可用 CPU 少于 8 个或内存少于 24 GiB 的主机，而不将 lint 默认值应用于声明准备。显式 Go 设置仍然继承。冻结修订保留工作流程限制，因为它们的包装器可以早于该策略。

有界核心和八目录插件 lint 分片可以使用两个 lint 线程、四个 Go CPU、`GOGC=100` 以及 Linux CI 上的 8-GiB 软 Go 堆目标。批次所有者必须允许一个子进程使用至少 4 个 CPU 和 15 GiB 经验证的容量；每个子进程还需要 14 GiB 的可用内存用于核心或 10 GiB 用于插件。孩子验证其参数是否与承认的分片相匹配。更大的插件块、无限制的命令、并行子项和未知内存保持了现有的限制。显式线程和 Go 设置保持继承。更大的堆目标减少了重复的垃圾收集，而无需更改 lint 规则、目标文件或声明准备。

运行时拓扑 CI 作业还提供 `GOGC=30` 和 `GOMEMLIMIT=3GiB` 默认为 `pnpm check:architecture`，保留调用者覆盖。导入周期检查和其余体系结构检查都继承这些设置。内存目标是软的：Node 24.21.0 上的四 CPU、15.42-GiB 测试盒比较测量了 14.24 GiB 的峰值 checker/compiler 进程组 RSS，没有默认值和11.31 GiB 与他们同在；掉期使用峰值从 4.74 GiB 降至零。两个托管运行程序在本机 Madge 检查期间关闭，但它们的日志未建立内核 OOM。这些测量结果支持降低内存压力，而不是硬性 3-GiB RSS 上限或这些关闭的已确认原因。

在内存少于 24 GiB 的串行主机上，完整 lint 以五个不相交的批次运行核心目标，并以较小的块运行插件。这些运行保留相同的类型感知规则和 TypeScript 配置，同时限制检查器缓存。至少 4 个 CPU 上的自动 Linux CI 和 15 个经过验证的内存容量 GiB 使用 16 个目录插件块来分摊类型图启动。容量包括物理 RAM 和祖先 cgroup 限制。较小或未知的容量、本地运行、Windows、显式插件条带和显式串行选择保留八个目录块。显式的分核和并行执行选择保持不变。

Oxlint 的类型感知后端分别发现 `src/tsconfig.json` 和 `ui/tsconfig.json`。两者都继承根编译器选项，包括共享环境声明，并遵循导入的依赖项。每个现有的 lint 目标和规则仍然运行，包括源 CommonJS 测试预加载。 CLI `--tsconfig` 选项控制导入分辨率；它不会取代这些发现项目。

当前的 CI 核心测试行将其配对条带合并到一个新编译器进程队列中，具有相同的两个子限制。每个独立图都以增量项目模式运行：解决方案构建模式可能会错过添加的根，其时间戳早于恢复的构建信息。冻结的目标保留其原始的条纹调用。每个图表的运行时间显示在作业日志中。

CI 类型作业在不恢复编译器状态的情况下启动。更新旧的构建信息可能需要声明签名计算和依赖项失效，而新的检查可以避免这些。与一小时前的状态进行相同检查的六图比较花费了 295.27 秒与 157.81 秒冷；两次运行都检查了每个图表。因此，CI 不会发布或恢复 `.artifacts/tsgo-cache`，包括在更改图队列中。本地命令保留增量状态，以便在同一结帐中进行重复检查。编译器选择、图形成员资格、并发性和冻结目标命令保持不变。

Oxlint 为 JavaScript 保持启用 `eslint/no-redeclare`。对于`.ts`、`.tsx`、`.mts`和`.cts`，`tsgo`拥有声明有效性，包括故意具有相同公共名称的type/value对。 `eslint/no-var` 对所有源格式保持启用状态；编译器不会拒绝每个 `var` 重新声明。

`eslint/no-eval` 默认拒绝直接和间接评估。只有 `extensions/qa-lab/src/web-runtime.ts` 允许间接求值，因为 QA 场景脚本需要 Playwright 的表达式求值不保留的页面全局声明语义。直接评估仍然是一个错误。执行发出的浏览器脚本的测试使用隔离的 `node:vm` 上下文，而不是进程全局评估。

```bash
pnpm changed:lanes                            # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed                            # optional smart local check: changed formatting/typecheck/lint/guards by boundary lane
pnpm check                                    # optional broad local check: prod tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed                              # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1 node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts
pnpm test                                     # vitest tests
pnpm test:changed                             # cheap smart changed Vitest targets
pnpm test:ui                                  # Control UI unit/browser suite
pnpm ui:i18n:check                            # generated Control UI locale parity (release gate)
pnpm native:i18n:baseline                     # update source-owned native extraction inventory
pnpm native:i18n:verify                       # source inventory + Android/Apple localization safety
pnpm native:i18n:check                        # strict local translated/platform-generated parity
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs                               # docs format + lint + broken links
pnpm build                                    # build dist when CI artifact/smoke checks matter
pnpm ios:build                                # generate and build the iOS app project
pnpm ci:timings                               # summarize the latest origin/main push CI run
pnpm ci:timings:recent                        # compare recent successful main CI runs
pnpm ci:timings:trend                         # 72h main baseline; latest 12h versus prior 12h
node scripts/ci-run-timings.mjs <run-id>      # summarize wall time, queue time, and slowest jobs
node scripts/ci-run-timings.mjs --latest-main # ignore issue/comment noise and choose origin/main push CI
node scripts/ci-run-timings.mjs --recent 10   # compare recent successful main CI runs
node scripts/ci-run-timings.mjs --trend-hours 72 --compare-hours 12 --detail-runs 100 --output .artifacts/ci-timings/trend.json
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
pnpm test:startup:memory
pnpm test:extensions:memory -- --json .artifacts/openclaw-performance/source/mock-provider/extension-memory.json
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

本机语言环境检查在本地仍然严格。对于 `CI=true` 或 `CI=1`，本机检查会警告过时的翻译 ID、Android 生成的行以及等待序列化区域设置刷新的 Apple 目录行。 Android 警告需要标准的、未引用的、非插值的过时行，这些行的删除会使其他每个字节保持不变。 Apple 警告要求活动清单中缺少标准普通发电机行；删除这些行必须保留准确生成的目录，包括元数据。过时的行仍然需要 Xcode 的有效字典和字符串单元结构，但不需要活动区域设置或 translated/nonempty 副本。不受支持的元数据和变体形状保留严格的奇偶校验检查。缺少活动翻译或资源、活动占位符漂移、无效工件语法以及其他生成的输出差异仍然会受到阻碍。生成器同步以及独立的 Android 和 Apple 检查保留其严格行为。

### <a id="opt-in-compiler-evidence"></a> 选择加入编译器证据

保留 `pnpm check:timed`（或 `check:changed --timed`）用于阶段计时，保留 `pnpm tsgo:profile <graph> --deep` 用于有意的多通道 graph/pprof 分析。要获取已运行的编译器调用的证据，请设置 `OPENCLAW_TSGO_METRICS_DIR=.artifacts/tsgo-metrics`。每个 `run-tsgo` 调用都会在普通本​​地开发人员机器上写入一个单独的 JSON 工件；指标和 `OPENCLAW_TSGO_PPROF_DIR` 都不需要 `OPENCLAW_LOCAL_CHECK_MODE=throttled`、CI 或特定于服务器的设置。未设置或空白指标意味着正常路径上没有指标导入、检查、文件或其他输出。这也适用于通过定时检查包装器到达的测试分片和编译器阶段。它不会添加编译器调用或更改编译器参数、限制、截止日期、信号或清理策略。指标写入失败会发出警告，但不会替换编译器结果。

工件记录有效命令和 exit/error/signal、受管理的挂机时间（包括清理、排除证据 I/O 和工件所有权许可）、修订、跟踪脏状态、安装的本机 compiler/Node 版本、锁定文件摘要、OS 和有效 Go 限制。出处未知：`null`；跟踪脏状态不考虑未跟踪的输入。命令和路径可以包含私有本地信息：在共享工件之前检查和清理工件。

在 Linux 上，选择加入采样每 100 毫秒读取编译器进程的 `/proc` CPU 计数器（所有线程）和 RSS 高水位线。 CPU 和峰值 RSS 明确是 **采样下限**，而不是精确的进程结束总数或进程树内存。他们可能会错过最后一场比赛；非常短的运行或受限的过程可能没有可用的样本。缺失的统计数据是 `null`，有原因，从未用零填充。 macOS和Windows报告不支持的资源采样；墙上时间和出处仍然可用。没有包装器进程会更改信号所有权。

显式 `--tsBuildInfoFile` 提供了 before/after SHA-256 证据。它的存在不是缓存命中：`hit` 仍为 `unknown`，而 OS 页面缓存为 `uncontrolled`。更改后的可读 JSON 构建元数据提供总文件数、根文件数和非 root/transitive 文件数，包括 library/declaration 输入。未更改、不存在、过大（超过 32 MiB）或不受支持的元数据会使计数不可用，而不是将过时的图表归因于此次运行。不会推断隐式缓存路径和解决方案构建缓存。不会启动 `--listFiles`、`--showConfig` 或诊断通行证来填补缺失字段。当您有意需要这些额外通道时，请使用现有的 `tsgo:profile` 工具。

为了进行有界比较，请对三个缺席构建 info/reuse 对使用相同的冻结安装、源版本、资源限制、计算机和项目：

```bash
mkdir -p .artifacts
benchmark_dir=$(mktemp -d .artifacts/tsgo-benchmark.XXXXXX)
for repeat in 1 2 3; do
  pair="$benchmark_dir/$repeat"
  mkdir -p "$pair"
  OPENCLAW_TSGO_METRICS_DIR="$pair/cold" node scripts/run-tsgo.mjs \
    -p tsconfig.ui.json --incremental --tsBuildInfoFile "$pair/cache.tsbuildinfo" || break
  OPENCLAW_TSGO_METRICS_DIR="$pair/warm" node scripts/run-tsgo.mjs \
    -p tsconfig.ui.json --incremental --tsBuildInfoFile "$pair/cache.tsbuildinfo" || break
done
```

尊重主机围绕该命令树的现有构建锁和资源策略；不要同时运行这些对。在解释计时之前停止并调查任何非零编译器退出。这里的“冷”仅意味着该对的构建信息文件不存在；它并不意味着冷 OS/dependency 缓存。 “温暖”意味着尝试使用相同的输入进行重用，而不是经过验证的缓存命中。比较中位数和范围，报告所有退出和缺失字段，并在结果旁边保留 before/after 修订和 lockfile/toolchain 摘要。不要删除共享缓存、删除 OS 缓存或放宽资源上限以进行有利的比较。该配方仅创建一个新的基准目录，并保持正常缓存不变。

对于 CPU/heap 调查，请重复使用 `OPENCLAW_TSGO_PPROF_DIR`，并为每个测量的调用使用不同的目录，或使用 `tsgo:profile --deep`。分析会改变测量开销：为比较双方启用它或将其保留在时序对之外。证据记录有效`--pprofDir`；它不会管理或删除这些配置文件。这些测量结果是开发人员证据，而不是 CI pass/fail 阈值。

网关监视回归检查仅在准备就绪和稳定期后才启动其空闲 CPU 窗口。启动和提前退出失败仍然无法通过检查。来自其他有效窗口的 CPU 样本丢失导致测量失败；整体运行 CPU 单独报告，并且从不与空闲阈值进行比较。

在获取运行后快照或删除其私有 HOME 之前，该检查会加入定时监视进程及其输出。如果无法确认清理，则检查失败，保留HOME以供检查；输出目录中的`watch.home.txt`记录了其路径。

本机源门涵盖目录拥有的 macOS、iOS 和共享 Apple 源根。 Linux-可运行源提取需要显式类型化本地化格式（例如，`Int` 为 `String(format: String(localized: "Expires in %lld minutes"), minutes)`），而不是任意 Swift 插值。两个平台都支持受约束的变形计数资源。对用户、系统或已本地化的数据使用明确的逐字文本。

对于分阶段检查，`pnpm check:changed --staged` 将该索引与 `HEAD` 进行比较。使用 `pnpm check:changed --staged --base <commit>` 将索引与显式提交进行比较，包括在挂起合并期间。路径选择、封装分类和分级棘轮使用相同的底座。如果没有 `--staged`，则默认比较基数仍为 `origin/main`。

委派的分阶段检查将选定的路径和比较基础传送给远程检查器。 Crabbox 同步工作树文件，而不是本地 Git 索引，因此远程结果描述的是这些物化文件，而不是暂存快照的精确副本。在使用该路线之前，请保持预期的校样文件一致。

## <a id="workflow-lint-tools"></a> Workflow lint 工具

`pnpm check:workflows` 需要根据 `scripts/check-workflows.mts` 和 `.pre-commit-config.yaml` 中固定的修订版本构建 actionlint。已发布和未知的版本有意在每个平台上使用固定后备。安装 Go 以使包装器获取该修订版，或使用固定的预提交挂钩。

zizmor 检查还需要预提交、具有 venv 支持的 Python `pre_commit` 模块或 Python 3.10+，以便包装器可以安装其固定的预提交运行时。匹配安装的 actionlint 不会消除此要求。

对于离线使用，请缓存预提交运行时及其 zizmor 挂钩，以及缓存的匹配安装的 actionlint 或固定的 actionlint 挂钩。安装预提交后，在线时启动两个钩子环境：

```bash
pre-commit run actionlint --all-files
pre-commit run zizmor --all-files
```

## <a id="surface-ratchets"></a> 表面棘轮

大小、长度、计数和测量的性能限制是本地错误和 GitHub 操作中的警告。 `scripts/lib/check-limits.mts` 使用 GitHub 的 `GITHUB_ACTIONS=true` 信号拥有此决策。 `CI=1` 本身并不能软化检查：本地测试运行者和委托的本地检查也可以设置它。每个 CI 违规都会在零列和作业摘要条目处发出与文件关联的 GitHub 警告。 Docker 证明包装器携带信号并将其摘要转发给跑步者。

Oxlint 保留配置的行上限和排除：普通 TypeScript 计数为 700 行，JavaScript 模块计数为 800 行，测试为 1,000 行，并具有现有的显式覆盖。独立的本地 lint 报告错误。在 `check:changed` 中，lint 会针对选定的已更改文件报告 `max-lines` 错误，并针对更广泛的 lint 通道中包含的未更改文件报告警告。广泛扫描仍然会在运行的任何地方报告语义错误。空或过大的更改范围、对 lint 配置或依赖项的更改以及具有继承限制的配置会保持严格的本地执行。 CI 使用临时配置，仅将启用的大小规则严重性更改为警告。 SwiftLint 同样将本机长度、嵌套、复杂性和计数限制报告为 CI 警告；语义 lint 错误仍然处于阻塞状态。

`pnpm check`、`pnpm check:changed` 和 `pnpm check:line-cap-ratchet --base <commit>` 拒绝新的超额文件和本地继承超额债务的增长。 PR `checks-fast-baseline-ratchets` 作业将此增长报告为警告。重命名与旧路径进行比较；未更改或缩小的上限文件会通过棘轮。测量使用 oxlint 的实际上限和 comment/blank-line 排除，并仅在临时测量副本中中和抑制指令。首先测量当前文件；仅对于仍然超出其上限的文件才需要历史源和重命名检测，从而避免部分克隆中未使用的 blob 下载。主推CI不运行PR成长对比；普通 lint 仍会报告所有未抑制的超额文件。

最大行抑制库存和环境变量计数预算使用相同的严重性策略。删除抑制后，从 `config/max-lines-baseline.txt` 中删除其过时条目，或运行 `pnpm check:max-lines-ratchet --prune`。保持库存缩减；警告状态并不授权新的抑制或更高的上限。环境预算计算生产 `src/`、`packages/` 和 `extensions/` 源中不同的 `OPENCLAW_*` 名称，不包括测试和 QA 实验室。当清理减少该计数时更新 `config/env-var-count-budget.txt`。

该策略还涵盖数字捆绑、声明、包、启动内存、CPU、计时和测试根预算。测量值和阈值保持不变。当文件或工件超过上限时，提取相关模块或调查增加的成本。不要仅仅为了消除警告而削减覆盖范围、禁用规则或提高阈值。

正确性检查保持阻塞，包括类型、语义 lint、全面 lint 禁用、断言安全、测试超时竞争棘轮、丢失或畸形的证据、失败的命令、禁止的急切导入和一次性所有权。公共 SDK 库存和生成的配置模式基线仍然是合同守卫。跑步者矩阵上限可保护共享的跑步者注册容量并保持阻塞。明确的基准资格判定保留其要求的验收标准。

`test/scripts/ci-workflow-guards.test.ts` 中的工作流程文件大小保护也保持阻塞状态。 GitHub 在没有作业的运行中拒绝任何超过 512,000 字节 （500 KiB） 的工作流文件，因此每个 PR 和主 CI 运行都会停止，而不会进行失败检查。防护在 480,000 字节时失败，而 CI 仍然可以报告它。在提高限制之前缩小文件；例如，通过 YAML 锚点和别名共享字节相同的运行器表达式、步骤和脚本。

## <a id="local-check-gates-and-changed-routing"></a> 本地检查门和变更路由

### <a id="assertion-inventory-reports"></a> 断言库存报告

`pnpm check:assertion-safety --report <commit-or-ref>` 将一致排序的 JSON 库存写入标准输出，而不更改断言基线。 ref 选择提交的源和基线，包括稀疏检出忽略的文件。普通的棘轮检查仍然检查工作树或暂存内容；它们的 `--base` 选项选择比较祖先，而不是源字节。

该报告记录源 Git 对象 ID、执行收集器和策略文件的 SHA-256 哈希值以及已安装的解析器和 Node 版本。它列出了零计数文件、排除的 declaration/test-support 文件、缺少基线路径、语法诊断以及每个已解析断言的当前策略豁免。职位使用基于 1 的 lines/columns 和半开源文本跨度。

未使用的津贴意味着基线超出了观察到的保单数量。它是会计证据，而不是修复证明：添加 SAFETY 标记可以在保留断言的同时减少计数。豁免描述了现有警卫的决定；他们不验证所声明的不变量。断言指纹对精确的断言文本进行哈希处理，因此重复的哈希值是不明确的，并且空格更改可以更改哈希值。该报告不匹配修订版本之间的站点或对语义上的断言进行分类。

零退出意味着库存覆盖已经完成，而不是棘轮已经过去或债务得到修复。解析失败或捕获的收集错误会产生不完整的覆盖和非零退出；未知计数和未使用配额保留为 `null`。当其他文件失败时，成功的文件记录仍然可用。被杀死的进程不会产生任何报告；缺少或截断的输出是不完整的证据。在比较单独的运行之前，验证报告的源、工具和依赖项输入。

### <a id="config-baseline-count-ratchet"></a> 配置基线计数棘轮

`pnpm config:docs:check` 会拒绝未记录在案的配置面增长，以及损坏或过时的计数快照。当经过审查的产品变更有意添加了 schema 路径时，请运行 `pnpm config:docs:gen`，检查 core/channel/plugin 的计数差异和生成的 SHA-256 文件，并将包含 schema、help、labels、migration 和 tests 的有意基线提升一并提交。不要通过手工编辑 counts 文件来绕过 ratchet。

配置作者还必须为 Settings 中的新叶子节点分配层级。在叶子节点上添加 `advanced: false` 或 `advanced: true`，或者将该 key 放在其某个祖先节点之下，并让所有后代继承该祖先的层级。 未分类的根节点会因复制粘贴占位符而导致 schema quality 测试失败；没有祖先路径默认视为 advanced。 经过整理的 common-leaf 快照会让有意的层级变更在 review 中清晰可见。

本地变更 lane 逻辑位于 `scripts/changed-lanes.mjs`，并由 `scripts/check-changed.mjs` 执行。该本地检查门对架构边界的限制比宽泛的 CI 平台范围更严格：

- 核心生产变更运行核心生产和核心测试类型检查，以及核心 lint/guards；
- 仅核心测试变更只运行核心测试类型检查，以及核心 lint；
- root TypeScript 测试和支持文件在 `test/tsconfig/tsconfig.test.root.json` 内运行根测试类型检查以及目标类型感知 lint；可发现的 `test/tsconfig.json` 继承了该纯源程序。包括`.ts`、`.tsx`、`.d.mts`、`.d.cts`，不是普通的`.mts`/`.cts`；固定装置和内置工件 Docker 客户留​​在目标根 lint 之外；
- 扩展生产变更运行扩展生产和扩展测试类型检查，以及扩展 lint；
- 仅扩展测试变更只运行扩展测试类型检查，以及扩展 lint；
- 捆绑的 channel manifest、包元数据、配置 schema、UI 提示和生成器所有者还会运行捆绑 channel 配置元数据漂移检查；
- config schema/help、捆绑的插件元数据、源模式条目的相对导入依赖项、generator/selector 所有者以及跟踪的配置基线更改运行 `pnpm config:docs:check`，包括与普通文档混合的基线文件；所有通道和发布元数据计划都包含一次；
- 公共 Plugin SDK 或 plugin-contract 变更会扩展到扩展类型检查，因为扩展依赖这些核心契约（Vitest 扩展全面扫描仍作为显式测试工作执行）；
- 发布仅元数据版本碰撞运行有针对性的version/config/root-dependency检查；
- 未知 root/config 更改对所有检查通道均安全。

JavaScript 和 TypeScript 在 `src/`、`extensions/`、`ui/`、`packages/`、`scripts/` 和 `test/` 下的更改也运行现有的完全未使用的导出审核。仅导入编辑和删除的源或测试文件可能会孤立未更改文件中的导出。

模式依赖项选择重用本地相对导入图，包括重新导出和仍由幸存源引用的已删除叶路径。共享 SDK 通道 UI-hint 和秘密输入模式所有者，加上工作区敏感 URL 提示所有者，是跨别名边界的显式根。还可以选择对其 SDK 外观的编辑，而无需遍历不相关的外观运行时依赖性。这不是通用别名或计算导入解析。

本地更改测试路由位于 `scripts/test-projects.test-support.mts` 中，并且故意比 `check:changed` 便宜：直接测试编辑自行运行，源代码编辑更喜欢显式映射，然后是兄弟测试和导入图依赖项。共享组房间传递配置是显式映射之一：对组可见回复配置、源回复传递模式或通过核心回复测试的消息工具系统提示路由的更改加上 Discord 和 Slack 传递回归，因此共享默认更改在第一次 PR 推送之前失败。共享的 Markdown 渲染感知分块器及其 IR 和 `packages/markdown-core` 中的渲染模块以相同的方式映射到 Google Chat、Signal、Slack、SMS、Telegram 和WhatsApp 格式、发送和交付套件：通道通过插件 SDK `text-chunking` 外观到达分块器，比随后的导入路径更深。 PR CI 将这些作为其进口消费者之外的明确所有者接收。仅当更改范围足够广泛以至于便宜的映射集不是值得信赖的代理时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## <a id="testbox-validation"></a> Testbox 验证

遵循规范的 [ 证明策略 ](https://github.com/openclaw/openclaw/blob/main/.agents/skills/openclaw-testing/SKILL.md#proof-policy)。对于其远程异常，`.crabbox.yaml` 默认为 `blacksmith-testbox`。该工作流程水合凭证：不受信任的 contributor/fork 代码需要无秘密分叉 CI 或经过消毒的直接 AWS，而不是本地执行或 Testbox。包装器使用捆绑的 Crabbox 插件的二进制管理器。所有提供商和云工作人员配置文件都需要 Crabbox 0.77.0 或更高版本。这包括任务拥有的 Testbox SSH 拆卸，从而防止持久的 SSH 主设备保持空闲 Testbox 处于活动状态。丢失或较旧的二进制文件在提供程序发现或租赁工作之前使用经过验证的托管 0.77.0 版本。原始二进制文件保持不变。提供商准备情况和代理身份验证仍然决定哪个配置的后端可以运行证明。检查工作流程通过深度 1 的检查来补充其固定的调度提交；更改后的门稍后会重建精确的合并基础并同步最终树。通过 `ci-check-testbox.yml` 例行发送支票租赁请求 `blacksmith-16vcpu-ubuntu-2404`，总 GitHub 作业截止时间为 60 分钟，包括水合作用。显式 `ci-check-high-memory-testbox.yml` 工作流程请求 `blacksmith-32vcpu-ubuntu-2404` 并为占用大量内存的全套门保留 240 分钟。仅出于合理的记忆需求而选择它，而不仅仅是为了更多时间；请参阅 [Testbox 流道尺寸 ](/reference/test/remote-proof#testbox-runner-sizing)。本机容量检查测量了 32 级上的 8 个 CPU 和 30.95 GiB 内存，而 16 级上的 15.42 GiB 进行了比较。这为独立的运行时验证提供了空间，而无需增加作业或工人的数量。工作负载仍然允许来自观察资源的工作；跑步者标签并不是产能保证。 PR 水合检查保留在 `ubuntu-24.04` 上。

外部 GitHub 截止时间可以终止活动的 SSH 命令。两种配置文件都有单独的 15 分钟空闲限制；活动 SSH 防止空闲到期，而不是外部作业截止日期。个别测试的截止日期也仍然有单独的限制。标准工作流程接受长达 240 分钟的显式 `timeout_minutes` 输入，但托管 Crabbox 0.77.0 不会转发任意工作流程输入（包括 `timeout_minutes`），并且 `--ttl` 不会扩展 Testbox 作业。在其总工作预算内规划例行证明，而不是将 TTL 或更大的运行程序视为截止日期覆盖。清理 AWS 运行集合 `CRABBOX_ENV_ALLOW=CI`，传递 `--no-hydrate`，并使用新的临时远程 `HOME`；这可以防止存储库 `OPENCLAW_*` 白名单和现有身份验证配置文件到达不受信任的代码。他们使用专门针对不受信任来源的新热租约，而不是受信任或之前已水合的租约。从干净的可信 `main` 签出启动已安装的可信 Crabbox 二进制文件，并仅使用 `--fresh-pr` 获取远程 PR；切勿在本地执行不受信任的结账包装或配置。取消设置 `CRABBOX_AWS_INSTANCE_PROFILE` 并停止，除非解析的 `aws.instanceProfile` 为空。在任何 install/test 之前，使用受信任的绝对路径工具来要求 IMDSv2 令牌，证明 IAM 凭证端点返回 404，并将远程 `git rev-parse HEAD` 与经过全面审查的 PR 头 SHA 进行比较。将租约绑定到 SHA 和 stop/rewarm 上的头部变更。从干净的 `main` 与 `--fresh-pr` 一起上传可信的 `scripts/crabbox-untrusted-bootstrap.sh`；它安装固定的 Node/pnpm，验证 SHA 和包管理器引脚，隔离 `HOME`，安装依赖项，然后执行请求的测试。当映像提供 `/opt/crabbox/toolchain-archives` 时，引导程序会将匹配的 Node、pnpm 包装器和 pnpm 本机存档复制到私有临时存储中，并根据可信脚本中的摘要验证复制的字节。它仍然在每次调用时提取新的 Node 和 Corepack 安装；现有的可执行文件、相邻校验和和完成标记不是信任锚。丢失或无效的缓存存档使用经过身份验证的下载路径。候选人无法推进包管理器密码；在推进工具链时更新可信引导程序及其摘要锚点。

受信任的 Linux 水合使用共享的 Node 兼容性选择器，并且可以从相同的经过身份验证的 pnpm 档案中播种工作专用 Corepack 主目录。共享安装操作还在其温暖的存储中携带经过身份验证的 pnpm 存档，因此托管和 Blacksmith 作业可以在依赖项安装之前引导，而无需再次下载 pnpm。这些存档不会替换冻结锁定文件依赖项安装。

通过 `install-bun: "true"`，`setup-node-env` 还可以在 Linux glibc x64 上重复使用来自 `/opt/crabbox/toolchain-archives` 的原始固定 Bun 1.4.3 ZIP。它在提取新的作业私有 `bun` 和 `bunx` 之前验证私有副本，然后在 Node PATH 条目之后发布其目录。默认为基线存档；优化的 x64 存档需要每个可见来宾 CPU 的 AVX 和 AVX2 证据。缺失 CPU 证据使用基线。缺少匹配的存档或不受支持的平台会保留固定的 npm 安装路径。当前损坏或格式错误的存档无法安装，而不是回退到现有的 Bun。 `install-bun: "false"` 跳过两条路径；它不会删除跑步者已经提供的 Bun。这种重用不包括 ARM、musl 或不受信任的引导程序。

取消设置所有 `CRABBOX_TAILSCALE*` 覆盖、强制 `--network public --tailscale=false`、清除退出 node/LAN 标志，并要求 `crabbox inspect` 在上传任何脚本之前报告没有 Tailscale 状态的公共网络。根据上述证明策略，仅选择其所需环境或明确的运营商请求的自有容量。

对于明确授权的管理员专用PR着陆后备，设置`OPENCLAW_PR_GATES_REMOTE=crabbox-aws`前`scripts/pr prepare-gates`。该模式不会取代默认的托管聚合门。推送确切的准备头后，包装器同步分派受保护的主发布者。受信任的工作流程校验和安装 Crabboxv0.77.0，通过以下方式解析其服务主体`/v1/whoami`，然后运行清理经纪AWS和`umask 022`，标准的不可信引导程序，`pnpm build`， `pnpm check`，和一个PR-拒绝不完整选择的派生测试计划。现有的更改测试所有者独立评估每个可执行文件的更改路径，并且必须将每个路径解析为具体的匹配测试文件；拒绝广泛的回退、跳过的路径、配置目标、删除的可执行路径和部分计划。明确的文档和`AGENTS.md`/`CLAUDE.md`指令表面可以产生零测试计划。确切的PR根据SHA， 头SHA、引导哈希和稳定计划摘要绑定到准备好的命令中。发行商通过 Crabbox 传输启动器`--script-stdin`。简短的经纪人论点束缚了头部SHA以及引导程序、准备好的命令和启动器哈希值。这AWS租赁使用90- 分钟空闲超时和240-分钟TTL。这`pr-crabbox-gate-publisher.yml`工作流程接受开放草稿，因为证明在准备推送期间运行，然后重新读取实时相同存储库PR以及使用 repo-native 的确切活动组织管理成员资格对象GitHub应用程序令牌`Members(read)`（存储库范围的工作流令牌不被视为组织权限），验证其新创建的经过身份验证的代理在同一服务令牌下运行，订购完整事件，独立重建准备好的命令和启动器上传哈希，并发布不同的`openclaw/crabbox-gate`只为准确证明base/head/plan绑定。出版商还证明PRbase 是其不可变的 protected-main 工作流程的合并基础SHA并添加该工作流程SHA到严格检查总结。远程运行前后，证明候选人活着`main`与该工作流程相同或源自该工作流程SHA，然后重新读取 ref 并要求候选人保持不变。长距离远程跑期间允许后代晋级；比较和重读窗口内的移动会停止发布。保留的代理日志在非空时进行验证，但是可选的，因为 Crabbox 可以在成功运行后报告零保留日志字节。出版商接受`released` or `cleanup`仅在验证工作负载身份、结果和有序事件之后才作为历史运行阶段。它单独运行阻塞`crabbox stop --provider aws --id <exact-lease> --wait`来自同一个临时 Crabbox 家，需要在发布前进行确认清理。等待清理永远不会通过大门；不确定的停止会保留该恢复位置并报告确切的租约和下一个命令。只有在发布者和精确头检查成功后，本地包装器才会派生`.local/gates.env` provider/run/lease/URL从可信摘要中恢复元数据；这些字段不是出版机构。

后备永远不会替换或重新发布 `openclaw/ci-gate`。仅当 GitHub 对准备好的 SHA 操作成功完成 Crabbox 检查时，本机合并验证仍然拒绝草稿 PR 并允许服务器规则集绕过，其绑定工作流 SHA 是稳定的最终实时受保护主快照的祖先，经过身份验证的参与者仍然是活动组织管理员，并且唯一未满足的所需检查是正常的CI 门具有已识别的托管运行程序基础设施故障，由 GitHub- 拥有的作业元数据表示，没有执行的工作流程步骤，也没有分配的 `runner_name`。作业日志永远不是权威，因为 PR 代码控制其文本。缺失或不匹配的检查、取消、所需操作或过时的结论、指定的运行程序、任何失败或执行的工作流程步骤、未知的运行程序后端、待处理的上下文以及其他所需的检查失败仍然处于阻塞状态。仅工作流程 `startup_failure` 或带有 `failure`/`timed_out` 的未获取的零步托管作业符合资格。本机流程在管理挤压请求之前立即重复完整的旁路验证，并将准备好的磁头固定在 `--match-head-commit` 上。 GitHub 没有公开预期的基 OID 合并先决条件，因此最终的主读取最小化但不能自动消除基移动竞争。着陆证明必须将挤压父级与最终主快照进行比较，而不是较旧的工作流程 SHA。 Crabbox 合并路径将此比较存储在 `.local/merge-crabbox-parent-audit.json` 中，将其包含在完成注释中，并报告已完成合并后的任何干预主要移动，而不声明原子预防。

仅当异常命令准备好时才获取；重用任务拥有的租约，在每次运行时同步，并在切换之前停止。

Crabbox 支持的 Blacksmith 运行热、声明、同步、运行、报告和清理一次性测试箱。原生铁匠拥有同步； Crabbox 的直接 SSH 同步控制和批量删除健全性检查不会在此委托路径上运行。

如果同步阶段停留超过五分钟且在 sync 之后没有输出，Crabbox 也会终止本地 Blacksmith CLI 调用。设置 `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 可以禁用该保护，或者在本地差异异常巨大时使用更大的毫秒值。

首次运行前，请在仓库根目录检查该封装器：

```bash
node scripts/crabbox-wrapper.mjs run --help | sed -n '1,120p'
```

存储库包装器在运行之前验证所选的 Crabbox 二进制文件和提供程序。在 Codex 工作树或 linked/sparse 签出中，避免使用本地 `pnpm crabbox:run` 脚本，因为 pnpm 可能会在 Crabbox 启动之前协调依赖关系；直接调用节点包装器：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

支持的同级或 `PATH` 二进制文件可以直接运行。包装器会自动用插件管理的二进制文件替换过时的选择；重建同级结帐不再是证明的先决条件。

`.crabbox.yaml` 中的 `blacksmith:` 块固定组织、工作流程和作业默认值。包装器在同步选定的本地源时强制执行工作流引用 `main`，因此下面的显式标志是可选的。显式的干净机器更改门奇偶校验：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "corepack pnpm check:changed"
```

当干净机器行为是证明的一部分时，重新运行重点测试：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "corepack pnpm test <path-or-filter>"
```

明确要求的干净机器上的全套套件：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "corepack pnpm test"
```

阅读最终的 JSON 摘要。有用的字段为 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。对于委托 Blacksmith Testbox 运行，Crabbox 包装器退出代码和 JSON 摘要是命令结果。链接的GitHub Actions运行拥有Hydration和Keepalive；当 SSH 命令返回后从外部停止测试盒时，它可以完成为 `cancelled`。将其视为 cleanup/status 工件，除非包装器 `exitCode` 非零或命令输出显示测试失败。由 Blacksmith 支持的一次性 Crabbox 运行应该会自动停止 Testbox；如果运行中断或清理不清楚，请检查活动框并仅停止您创建的框：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

对于一个任务中的多个命令，在第一个命令上分配并重用其报告的 `leaseId`。使用唯一的任务标签。最后一个命令后停止租约：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --keep --label <unique-task-name> -- corepack pnpm test <first-file>
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --id <tbx_id> --label <unique-task-name> -- corepack pnpm test <next-file>
node scripts/crabbox-wrapper.mjs stop --provider blacksmith-testbox <tbx_id>
```

包装器在 `.crabbox/testbox-leases` 下记录分配来源。重用需要相同的物理检验、HEAD、合并基础、依赖项输入、准备输入、调用者会话和标签。停止旧的或未记录的租约并通过包装器进行分配。 `OPENCLAW_TESTBOX_ALLOW_STALE` 不再绕过这些检查。 Codex 和 Claude Code 会话自动提供会话标识。 GitHub 操作标识包括工作流尝试和作业。这些身份标识会话，而不是单个请求。当一个会话处理多项任务时，请使用不同的标签。人类外壳需要保留租约的标签。会话拥有的 `warmup --timing-json` 还记录分配来源。 Native Crabbox 在拥有的租约上序列化命令。不要在任务之间共享租约。

包装器发出 `testbox-admission` 和 `testbox-completion` JSON 记录。它们识别调用者类型、散列 session/task 和结帐、HEAD、命令摘要、请求的超时、租用 ID 和调用持续时间。会话 ID、检出路径和命令内容不会复制到这些记录中。通过租用 ID 将它们加入本机计时输出以查找运行的操作。这些是本地诊断，而不是 Blacksmith 仪表板标签或计费寿命测量。委托提供者不强制执行 `--ttl`。工作流程作业超时和测试箱空闲超时仍然是有效的生命周期限制。

重用租约，而不是陈旧的来源。 Blacksmith Testbox 拥有同步功能，包括重复使用的 `--id` 运行。不要传递 `--no-sync`：包装器在租约处理或委托之前拒绝它。指纹缓存命中并不是不同步的保证。

同步成功并不能证明源身份。在精确候选证明之前验证具体化的 Git 树。将 QA 证据保留在同步结帐之外，并在下次运行之前下载它。不要绕过安全排除、接受不匹配的树或默默地切换提供商。

不受信任的 contributor/fork 代码必须为每个命令使用 `CRABBOX_ENV_ALLOW=CI`、`--provider aws --no-hydrate` 和新的临时远程 `HOME`；在测试之前，在清理后的命令中安装依赖项。仅重用专用于同一不受信任来源的新热租约；从来不是值得信赖的或之前水合的租赁。切勿在本地执行不受信任的签出包装器或配置：从干净的受信任 `main` 启动已安装的受信任 Crabbox 二进制文件，并在每次运行时传递 `--fresh-pr`。保持 `CRABBOX_AWS_INSTANCE_PROFILE` 未设置，拒绝非空解析实例配置文件，需要可信远程 IMDS 无角色证明，并在 install/test. 之前验证已审查的头 SHA 将租约绑定到该 SHA；更换头部后停止并重新加热。如果不存在远程PR，则使用无秘密分叉CI。切勿为不受信任的来源选择 `hydrate-github` 或凭证混合的 Blacksmith 工作流程。

如果 Crabbox 这一层出了问题但 Blacksmith 本身可用，则仅将直接 Blacksmith 用于诊断，例如 `list`、`status` 和清理。在把直接 Blacksmith 运行视为维护者证明之前，先修复 Crabbox 路径。

对于 admission/queue 处理，请遵循上述规范证明政策。对于明确选择的 AWS 容量，请使用 [direct-provider 命令](https://github.com/openclaw/openclaw/blob/main/.agents/skills/crabbox/references/operations.md#direct-aws)。

在 AWS 压力下，避免使用 `class=beast`，除非任务确实需要 48xlarge 级 CPU。 `beast` 请求从 192 个 vCPU 开始，是使用区域 EC2 现货或按需标准配额的最简单方法。回购拥有的`.crabbox.yaml`默认为`class: standard`，按需市场和`capacity.hints: true`，因此经纪AWS租赁打印选定的region/market，配额压力，现货回落和高压类警告。使用 `fast` 进行较重的广泛检查，仅在 standard/fast 不够之后才使用 `large`，而 `beast` 仅用于特殊的 CPU- 绑定通道，例如全套件或全插件 Docker 矩阵、显式 release/blocker 验证，或高核心性能分析。请勿将 `beast` 用于 `pnpm check:changed`、集中测试、纯文档工作、普通 lint/typecheck、小型 E2E 重现或 Blacksmith 中断分类。使用 `--market on-demand` 进行容量诊断，这样现货市场的波动就不会混入信号中。

`.crabbox.yaml` 拥有提供程序、同步和 GitHub 操作水合默认值。 Crabbox 同步从不传输 `.git`，因此水合操作签出保留其自己的远程 Git 元数据，而不是同步维护者本地远程和对象存储，并且存储库配置还排除了永远不应该传输的本地 runtime/build 工件（例如 `.artifacts` 和测试报告）。 `.github/workflows/crabbox-hydrate.yml` 拥有签出、Node/pnpm 设置、`origin/main` 获取以及自有云 `crabbox run --id <cbx_id>` 命令的非秘密环境切换。

直接租赁需要 Crabbox 0.77.0 或更新版本。 TTL 从创建开始计数，包括水合作用；空闲超时对不活动进行计数。截止日期较早者获胜。默认值为每次 30 分钟，最长为 4 小时，除非所有者或组织允许更长的时间。有效的政策可能会限制请求和实时租赁；检查租约并阅读政策通知。 Azure `prewarm` 和 `changed` 作业明确请求总计 4 小时和 90 分钟空闲时间。水化工作流程的 keepalive 使其 Actions 作业保持打开状态；它不会续订 Crabbox 租约。 `keep` 和 `stop: never` 不会防止过期。

普通的心跳、设置、同步和桌面活动不会延长总生命周期。 `run` 仅可在命令执行时进行扩展，具体取决于提供商的支持、预算和政策。创建固定的提供者在分配时需要足够的 TTL。 `directLeases: deny` 需要配置协调器路由。请勿更换提供商以避免该政策。 `crabbox list --retained` 将未确认清理的保留终端资源添加到默认实时列表中；使用精确的 ID 检查和等待停止来证明清理情况。

Linux Hydration 保留物理工作区 `node_modules` 目录和 pnpm 的默认 `.pnpm` 虚拟存储。仅包内容存储使用持久 `/var/cache/crabbox/pnpm/store` 卷；它的后备位置位于工作区依赖项旁边的 `.cache/openclaw-pnpm-store` 处。普通的 POSIX 同步会保留这些被忽略的目录，因此冻结的重新安装和以后的构建命令使用相同的拥有的安装。在标记租赁准备就绪之前，水合会检查工具装载机。重新补充较旧的租约时，工作流在安装物理工作区依赖项之前仅停用其以前到 `/var/tmp/openclaw-pnpm/node_modules` 或 `${XDG_CACHE_HOME:-$RUNNER_TEMP/cache}/openclaw/pnpm/install/node_modules` 的根链接，包括其运行程序缓存已被清除的链接。它保留外部包缓存和不相关的依赖链接。

Linux Hydration 还使用 CI 的命令安装 Control UI E2E 浏览器先决条件：Playwright Chromium 和 FFmpeg，以及 WebKit 及其系统依赖项。它从拥有的工作空间祖先和 `.artifacts` 中删除 group/other 写入，稍后运行命令继承 `umask go-w`，同时保留更严格的掩码。 AWS 和 Hetzner 租赁上的完整 UI E2E 无需手动运行跑步者维修。

本机 Windows 守护进程 Hydration 保留其外部依赖项连接，因为发布的 Crabbox 本机 Windows 删除同步替换了工作区内容。仅使用保留生成的依赖项目录的 Crabbox 同步版本将该路由移动到物理工作区依赖项。

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [发布渠道](/install/development-channels)
