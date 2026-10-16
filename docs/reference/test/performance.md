---
doc-schema-version: 1
summary: "导入分析、CPU 和堆分析、分片计时和基准脚本"
title: "测试性能和基准"
read_when:
  - "您正在分析一个缓慢的测试运行"
  - "您需要启动、网关或模型延迟基准"
---

## <a id="test-performance-tooling"></a> 测试性能工具

- `pnpm test:perf:imports`：启用 Vitest 导入持续时间 + 导入细分报告，同时仍对显式 file/directory 目标使用范围通道路由。 `pnpm test:perf:imports:changed` 对自 `origin/main` 以来更改的文件进行相同的分析。
- `pnpm test:perf:changed:bench -- --ref <git-ref>`：将路由后的 changed 模式路径与同一已提交 git diff 的原生 root-project 运行进行基准测试；`pnpm test:perf:changed:bench -- --worktree` 则在不先提交的情况下，对当前工作区变更集进行基准测试。
- `pnpm test:perf:profile:main` 为 Vitest 主线程编写 CPU 配置文件； `pnpm test:perf:profile:runner` 为每个单元工作人员写入 CPU + 堆配置文件。两者都打印其输出目录（默认情况下是临时目录）。使用 `-- --output-dir <dir>` 或 `OPENCLAW_VITEST_PROFILE_DIR` 将配置文件保留在选定位置。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：串行运行每个全套 Vitest 叶配置，并写入分组持续时间数据以及每个配置的 JSON/log 工件。全套报告默认情况下会隔离文件，因此保留的模块图和早期文件中的 GC 暂停不会计入后续断言；仅当有意分析共享工作者积累时才通过 `-- --no-isolate`。 `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json` 比较以性能为中心的更改后的分组报告。
- Full、extension 和 include-pattern 分片运行会更新 `.artifacts/vitest-shard-timings.json` 中的本地计时数据；后续的 whole-config 运行会使用这些计时数据来平衡慢分片和快分片。Include-pattern CI 分片会将分片名称附加到计时键中，这样在不替换 whole-config 计时数据的情况下，过滤后的分片计时仍然可见。将 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 设置为忽略本地计时工件。
- `pnpm ci:timings:refit`：使用其成功作业从最多五个已完成的计划主 CI 运行中重新生成已提交的 `config/ci-test-timings.json`；添加 `--dry-run` 以预览更改的条目表。该文件拥有每个文件 UI E2E 和每个配置文件紧凑组权重，与 gitignored `.artifacts/vitest-shard-timings.json` 整体配置定时缓存不同。独立的 CI 分片仅使用提交的权重，从不使用缓存。每日刷新和采样规则参见[CI时序改装](/ci/capacity#measured-shard-weights)。

运行器分析保留了选定的 `forks` 或 `threads` 池、隔离、环境和扩展 Vitest 的 `TestRunner` 的自定义运行器。捕获在 Vitest Worker 导入之前在 Node 预加载中启动，跨越分配给该 Worker 的所有文件，并在确认拆卸之前在等待的 Worker 清理中完成两个配置文件。它不依赖于退出时间配置文件刷新。根全局设置可配置每个选定的项目，而无需替换其报告器或设置。主要捕获跨越 Vitest/Vite 启动到运行完成和关闭。清理之前的进程终止、运行器构建之前的引导失败以及拆卸超时仍然可以阻止输出。 Browser/VM 池、没有 `onCleanupWorkerContext` 的自定义运行器以及其他本机 `--cpu-prof`/`--heap-prof` 标志将被拒绝进行运行器分析。

在探查器分隔符之后转发 Vitest 选项。转发的选项在加载配置之前使用 Vitest 的本机 CLI 验证。仅配置设置（例如 `runner` 和 `globalSetup`）属于 Vitest 配置文件，而不是 CLI 标志。例如：

```bash
pnpm test:perf:profile:runner -- --output-dir .artifacts/profiles -- --config test/vitest/vitest.unit.config.ts --pool threads
```

`pnpm test:extensions:memory` 配置文件从 `dist/extensions`（包括嵌套的 `dist` 输出）和包本地 `extensions/<id>/dist` 输出构建插件索引条目； TypeScript 源条目被排除。当两个版本都存在时，根工件优先。使用 `--extension <id>` 选择已构建的插件可重用其输出，而无需构建不相关的插件；如果 `pnpm build` 未提供其输出，请首先构建插件包。

本机导入还需要插件声明的依赖项和可解析的 `openclaw` 主机包。探查器不会安装或链接依赖项：缺失的依赖项在 JSON 报告中仍然会导致导入失败，并导致非零退出。

该报告标记此 **cold-import** 筛选，而不是插件激活、网关启动或工作负载覆盖范围。每个新子进程通过其退出挂钩以微秒为单位报告进程 user/system CPU，并在 MiB（现有的 `maxRssMb` 字段）中报告进程峰值 RSS。 CPU 和峰值 RSS 来自与输入子 PID 绑定的一项观察；继承的后代输出无法取代它。 CPU 总数与用户加系统计数器一致。增量减去相同的空子基线，保留负值，并且不得跨插件求和。组合进口案例衡量的是共享进口的单独流程。显式进程退出并不能证明插件生命周期清理或内存保留。

在运行之前和之后观察源 commit/tree 和跟踪的清洁度、构建元数据和选定的条目哈希值。子 Node/V8/ABI/platform/architecture 识别测量的运行时间。这些快照不证明传递依赖闭包或证明构建元数据描述了每个生成的字节。没有自己出处的本地包构建仍然是不合格的。架构 2 保留了现有的 `repoRoot` 和绝对 `results[].file` 字段以供保存的报告阅读器使用，并添加了 `results[].relativeFile` 以进行便携式筛选。条目来源路径是与存储库相关的。原始报告仍然包含本地路径和捕获的诊断信息；使用放映消费者的公共投影或在共享之前对其进行编辑。

`qualification.qualified` 只允许完整的冷导入快照，并具有匹配的 source/build 声明、稳定的选定输入、资源计数器、每次等待导入后的子记录完成以及经过验证的过程 - group/output 和临时主目录清理。丢失的身份或清理证明在 `qualification.gaps` 中保持明确；即使观察指令成功退出，筛查消费者也必须拒绝不合格报告。 Windows 目前在没有后代组证明的情况下验证了 child/output 闭包，因此这些观察结果仍然不合格。导入失败（包括序列完成前退出零）、丢失 RSS、超时和清理失败会产生非零命令结果。

### <a id="kitchen-sink-gateway-resource-comparison"></a> 厨房水槽网关资源对比

现有的厨房水槽 RPC 步行可以将禁用插件的新网关与仅激活厨房水槽 `conformance` 的新网关进行比较：

```bash
OPENCLAW_KITCHEN_SINK_NPM_SPEC=npm-pack:/fixtures/kitchen-sink.tgz \
  pnpm test:plugins:kitchen-sink-rpc -- --resource-profile /out/resources.json
```

此模式需要 Linux Node 和 `process.threadCpuUsage`、当前包根目录中的内置 OpenClaw 条目、具有完整源代码提交的 `dist/build-info.json` 以及本地 npm-pack 夹具。它不下载浮动夹具。正常的 RPC 行走，包括其 Bun 命令，没有改变。

仅在准备好的无秘密容器或远程运行器中运行。例如，将冻结的构建主机、其依赖项和固定的固定装置烘焙到经过审查的映像中，然后在明确的限制和禁用网络的情况下执行：

```bash
docker run --rm --network none --memory 4g --cpus 2 --pids-limit 512 \
  -v "$PWD/proof-output:/out" -w /app \
  -e OPENCLAW_KITCHEN_SINK_NPM_SPEC=npm-pack:/fixtures/kitchen-sink.tgz \
  <prepared-image> \
  node --import ./scripts/tsx.mjs scripts/e2e/kitchen-sink-rpc-walk.mts \
  --resource-profile /out/resources.json
```

准备映像中的任何托管 npm 安装先决条件；离线安装失败会被阻止，而不是复制凭据或启用网络访问的权限。该harness提供了一个最小的子环境，但本身并不强制容器隔离。将图像摘要和运行程序限制与报告一起保留。

每个案例记录从初始化的测量预加载到 HTTP 准备就绪的启动、一次未测量的运行状况预热、250 毫秒的空闲窗口、20 个已完成的 `health` RPC 和 250 毫秒的工作后窗口。一致性案例还测量一个断言的 `session-create`，然后测量 20 个具有唯一幂等性密钥的断言 `kitchen_sink_text` 调用，然后是另一个观察窗口。 `plugin-tool` 聚合保留所有 20 个呼叫。其嵌套的 `breakdown` 将 `plugin-tool-first`（最初的第一个调用）与 `plugin-tool-warm`（其余 19 个）分开；没有呼叫被丢弃或添加为热身。两个子项共享相同的原始中点快照，并且聚合使用原始的外部快照。不要对聚合及其子项求和。总计包括中点采样开销；这些是已启动主机中的整个网关成本，而不是孤立的模式构建、冷加载或插件分配成本。会话创建和插件工具都没有空主机减法。

设置和软件包安装不在测量阶段之内。失败的测量呼叫不会重试。缺失或无效的边界样本使观察失败，但未更改已完成的调用计数；在热呼叫之前，不可用的中点会停止工作。稍后的失败会保留成功的首次呼叫收据。

在这些匹配阶段之后，一致性案例使用 `kitchen.resources` 来验证一千万次 CPU 迭代和固定校验和，保存 16 MiB 缓冲区，并启动引用的 10 ms 计时器。通过有界状态检查来观察计时器进度。每个校准操作都会计算一个断言的控制步骤，包括其检查；它不是 RPC 吞吐量计数。灯具必须包含厨房水槽提交 `051db418820c2f0a73f8d349c88eb002b3c2d6e2` 或更高版本的校准控件。较旧的装置会明显失效，而不是跳过校准。

harness重置控件，声明空所有者状态，然后在 `plugins.setEnabled` 禁用灯具之前重新获取缓冲区和计时器。它需要应用的运行时收据、无重新启动或清理警告、非活动目录以及来自同一网关 PID 的 before/after 样本。这在正常网关关闭之前提供了进程中的停用观察。即使进程组消失，强制终止或非零网关退出也会导致报告失败。

该报告保留原始相边界快照、completed/failed 操作计数、来源哈希值和签名的一致性减空增量。 CPU 计数器涵盖网关进程和主线程，不包括单独的子进程。 RSS 是进程范围的；其他内存字段描述了主要隔离。 ArrayBuffers 重叠外部存储器。边界样本不是峰值，并且不会出现强制 GC。活动资​​源直方图计算保持事件循环活动的类型，而不是插件所有权或所有活动对象。该报告将 CPU、保持内存和定时器信号标记为已观察到或不确定；不相关的收集或主机计时器可能会掩盖它们。重置证明所有者状态释放，而不是立即 RSS 回收。固定的工作后窗口不是插件流失收据。主机关机单独检查；处理后出口采样和有保证的回收仍然不受支持。这些观察结果既不构成泄漏，也不构成预算违规。在得出绩效结论之前，通过活动负责人重复比较配对；不要将各个插件的成本相加。

### <a id="plugin-coverage-inventory"></a> 插件覆盖率清单

在分析活动之前导出源插件清单：

```bash
pnpm --silent plugins:inventory:json > plugin-inventory.json
pnpm --silent plugins:inventory:json --commit <full-commit-sha> > plugin-inventory.json
```

该命令读取已提交的 Git 对象，默认为 `HEAD`，并且需要 Git 2.45 或更高版本。它无需安装依赖项或完整的工作树即可工作。本地编辑不会影响导出。缺少对象使命令失败；它不会获取它们或加载插件代码。

版本化的 JSON 包括提交和树、插件 ID、相对路径、包元数据、分发类和声明的表面。它共享文档清单的收集器和分发规则，但排除仅限文档的外部种子。 `sha256` 使用共享稳定的 JSON 序列化器（对象键已排序，保留数组顺序）对没有该字段的有效负载进行哈希处理。此清单中的声明并不是已执行工作量的证据。将分析结果加入到此清单时，将导入、注册、工作负载和清理覆盖范围分开。

### <a id="reusing-the-resource-host"></a> 复用资源主机

源检查活动工具可以从 `scripts/e2e/kitchen-sink-rpc-walk.mts` 导入 `resolveResourceGatewayRuntime` 和 `runResourceGatewayCase`。厨房水槽使用相同的主机生命周期。每个进程从一个冻结的、构建的 OpenClaw 包根运行；这是一个测试接口，不是已发布的插件 SDK API。

准备回调接收隔离的配置路径、环回端口、测试令牌和验证提供的 SHA-256 的本地存档安装程序。仅启用那里选定的插件。工作负载回调接收经过身份验证的 CLI-mode RPC 调用、资源快照和计数的 `measure(name, count, run)` 阶段。在工作负载中断言活动插件库存和操作结果；仅凭注册或成功的运输响应并不能建立覆盖范围。将 `{ splitFirst: true }` 作为第四个 `measure` 参数传递，以保留具有共享边界样本和未更改操作索引的嵌套 first/warm 细分。

主机记录启动、保留失败阶段并在检查服务停止日志之前加入网关关闭。失败的工作负载、非零退出、尝试强制清理或关闭错误会保留临时状态并使案例失败。该活动拥有有限的回调截止日期、模拟服务清理、运行者隔离、重复和报告发布。将模拟服务测量与网关观察分开，并保留主机、存档和利用哈希值。在外部超时时，运行程序必须终止并加入整个容器或 cgroup：网关有自己的进程组，因此单独终止活动进程并不能清除它。

### <a id="zod-schema-compilation"></a> Zod模式编译

仅在测量重复验证路径后才编译单独的模式。使用固定的 Zod 包的 `z.compile(schema)` API 并将编译后的架构保留在其现有所有者处。 `zod/compile` 副作用导入启用进程范围的挂钩，不适合选择性优化。

嵌套工具活动验证在第一次匹配读取或创建时编译其架构，并在网关轮次中重用它。普通的转录行会绕过该编译。配置、记录条目和浏览器中继模式保留其现有的解析器，因为它们测量的调用者成本并不能证明编译的合理性。

将编译和第一个操作与热操作分开进行测量。通过实际调用者比较有效、无效和混合输入，包括它执行的任何 JSON 解码、复制或上下文构造。对于丢弃解析输出的谓词，将普通的 `safeParse(...).success`、`z.validate(schema, input)` 以及验证与已编译的模式进行比较；避免错误分配有助于独立于编译。

保持与 strict-CSP Control UI 共享的架构未编译：即使设置了 `jitless`，显式编译也会尝试生成代码。跨调用重用稳定模式是一项单独的优化，不需要编译器。

保持细化和转换回调的纯粹性：无效的编译解析可以回退到运行时解析器并执行这些回调两次。默认编译为不支持的模式保留运行时回退；异步解析和编码保留其现有的运行时行为。

## <a id="benchmarks"></a> 基准测试

<Accordion id="session-history-scripts-bench-session-history-ts" title="会话历史记录 （scripts/bench-session-history.ts）">

使用合成对话测量 SQLite 历史页​​面和网关的有界历史读取器，包括稀疏标记、密集标记和重置：

```bash
pnpm test:sessions:history:bench --samples 30 --output history.json
pnpm test:sessions:history:bench --profile sparse,trailing,reset --operation recent --analyze --samples 15 --output history-analyzed.json
```

第二个命令包括 5,000 个尾随压缩标记，并在读取之前刷新 SQLite 规划器统计信息。更改查询时比较两个统计状态。 `--operation` 选择 `recent`、`page` 或 `gateway-tail`；省略它可以衡量所有三个。

每个读者都运行在一个新的过程中。报告单独导入、首次读取（包括数据库打开）、暖p50/p95墙和CPU时间。 OS 缓存未刷新。 SQL 计划、语句计数、传递到 JavaScript 的行和 JSON 解析计数来自单独的检测读取。堆增量是未收集的观察值，而不是总分配。之后固定装置被拆除。

</Accordion>

<Accordion id="model-latency-scripts-bench-model-ts" title="模型延迟 （scripts/bench-model.ts）">

```bash
pnpm tsx scripts/bench-model.ts --runs 10
```

可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`。默认提示词："仅回复一个词：ok。不加标点或额外文本。"

</Accordion>

<Accordion id="cli-startup-scripts-bench-cli-startup-ts" title="CLI启动（scripts/bench-cli-startup.ts）">

```bash
pnpm test:startup:bench
pnpm test:startup:bench:smoke
pnpm test:startup:bench:save
pnpm test:startup:bench:update
pnpm test:startup:bench:check
pnpm tsx scripts/bench-cli-startup.ts --runs 12
pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --case gatewayStatus --runs 3
pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all
pnpm tsx scripts/bench-cli-startup.ts --runtime-rss --case status --runs 3
```

预设：

- `startup`: `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real`: `health`, `status`, `status --json`, `sessions`, `sessions --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all`：两个预设合并

输出包括 `sampleCount`、avg、p50、p95、min/max、exit-code/signal 分布以及每个命令的 RSS。 `maxRssMb` 字段使用 MiB。默认情况下，RSS 使用 stderr 上收到的最后一个预加载标记，保留历史夹具的属性。重生发射器可以提供最后一个标记。默认报告省略 `memoryMetric` 和示例 `memory`；不需要运行时身份或临时观察文件。对于静默命令，退出标记可以算作第一个输出。

传递 `--runtime-rss` 以选择运行时进程归因。 `primary.memoryMetric`标识`cli-runtime-max-rss-v1`，每个样本的`memory`以字节为单位记录PID、父PID、角色和高水位RSS。运行时是唯一匹配的CLI调用链中的终端进程；发射器和辅助观测未添加到其中。这不是同时进程树内存。

当预加载的 `exit` 侦听器运行时，会观察到高水位 RSS。稍后应用程序退出处理程序中的分配不在此观察范围内；这不是 OS 的全生命周期测量。

对于 `--runtime-rss`，预加载将观察结果记录在临时文件中，与 stdout/stderr 和首次输出计时分开。运行时身份不依赖于命令输出；无声条目有 `firstOutputMs: null`。仅在此选择加入模式下，缺少或不明确的运行时身份会使示例失败。两种模式都是仪表化启动，与无预载、无重生 `scripts/check-cli-startup-memory.mjs` 诊断分开。 `--cpu-prof-dir` / `--heap-prof-dir` 每次运行写入 V8 配置文件。

保存的报告比较使用报告元数据，而不是 `--runtime-rss`。比较、强制夹具预算和源摘要内存趋势拒绝混合 legacy/runtime 指标，而不是默默地比较不同的流程。历史赛程无法重新标记；任何替代基线都需要单独验证和批准。

保存的输出：`pnpm test:startup:bench:smoke` 会写入 `.artifacts/cli-startup-bench-smoke.json`；`pnpm test:startup:bench:save` 会写入 `.artifacts/cli-startup-bench-all.json`（`runs=5 warmup=1`）。纳入仓库的 fixture：`test/fixtures/cli-startup-bench.json`，可通过 `pnpm test:startup:bench:update` 刷新，并由 `pnpm test:startup:bench:check` 比较。

</Accordion>

<Accordion id="gateway-startup-scripts-bench-gateway-startup-ts" title="网关启动（scripts/bench-gateway-startup.ts）">

网关启动、重新启动和代理并发基准测试装置使用临时主目录和状态目录、环回绑定和 `discovery.mdns.mode: "off"`，因此合成网关不会在 LAN（包括 macOS）上做广告。

默认使用构建后的 CLI 入口 `dist/entry.js`；请先运行 `pnpm build`。传入 `--entry scripts/run-node.mjs` 可改为测量源码运行器，并请将这些结果与构建后入口的基线分开保存。

启动、重新启动和并发接受 `--gateway-runtime <executable>` 以仅选择网关可执行文件，将基准控制器和模拟提供程序保留在启动脚本的运行时上。默认值是相同的可执行文件。使用绝对路径来选择特定的暂存运行时。 JSON 报告将此选择记录为 `gatewayRuntime`；它不是测量的子版本或二进制哈希。失败的活动摘要诊断会忽略此调用者提供的路径，如入口路径；该模式不是性能证明。现有重启报告的 `node` 字段描述了控制器。

在 Linux 上，所有三个都接受 `--gateway-cpus 0,1,2,3`，仅通过 `taskset` 应用于网关。比较运行时间时单独固定控制器：

```bash
taskset --cpu-list 4-31 node --import ./scripts/tsx.mjs scripts/bench-gateway-startup.ts --case default --gateway-runtime /path/to/bun --gateway-cpus 0,1,2,3 --runs 1 --warmup 0 --output .artifacts/gateway-startup-bun.json
```

安装包 `--installed-cohort` 模式拒绝两个选择器；它的输入拥有经过证明的运行时。探查器选项仍然特定于运行时，并且需要选定的运行时支持其分析 API。

```bash
pnpm test:startup:gateway -- --runs 5 --warmup 1
pnpm test:startup:gateway -- --case skipChannels --case fiftyPlugins --runs 5
node --import tsx scripts/bench-gateway-startup.ts --case default --runs 5 --output .artifacts/gateway-startup.json
node --import tsx scripts/bench-gateway-startup.ts --case incidentCombined --runs 5 --warmup 1 --timeout-ms 60000 --output .artifacts/gateway-startup-incident.json
```

案例 ID：`default`、`skipChannels`（跳过通道启动）、`oneInternalHook`、`allInternalHooks`、`fiftyPlugins`（50 个清单插件）、`fiftyStartupLazyPlugins`（50 个延迟启动清单插件）、`incidentDatabase`、 `incidentNullMetadata`、`incidentWorkspace`、`incidentPackagedPlugins` 和 `incidentCombined`。

事件案例是选择加入的，因为每个样本都会构建一个隔离的、不敏感的负载固定装置：当前的全局和代理数据库、带有空闲列表碎片的 100,000 个保留审计行、包含 80,000 个文件（约 800 MB）的 8 个代理工作区以及打包的插件清单。仅在具有足够可用磁盘空间的干净机器上运行组合案例；每次采样后，fixture 目录都会被删除。当 `/healthz` p95 达到 30 秒或 `/readyz` p95 达到 60 秒时，`incidentCombined` 失败。

输出包括首次进程输出、`/healthz`、`/readyz`、HTTP 监听日志时间、Gateway 就绪日志时间、CPU 时间、CPU 核心占比、最大 RSS、堆、启动跟踪指标、事件循环延迟，以及插件查找表细节指标。脚本会在子 Gateway 环境中设置 `OPENCLAW_GATEWAY_STARTUP_TRACE=1`。

`/healthz` 是活跃度（HTTP 服务器可以应答）。 `/readyz` 已做好可用准备（启动插件边车、通道和关键的准备后附加工作已解决）。启动挂钩异步调度，不属于就绪保证的一部分。就绪日志时间是网关的内部时间戳，对于进程端归因很有用，但不能替代外部 `/readyz` 检查。

比较更改时使用 JSON 输出或 `--output`。仅在导入、编译或 CPU- 绑定工作（阶段计时无法单独解释）的跟踪输出点之后使用 `--cpu-prof-dir`。

准备就绪后，网关利用空闲轮流准备通用 Control UI 处理程序模块并配置本地代理技能发现。每个项目都会屈服于公认的前台工作，并且关闭会加入已经开始的准备工作。这项工作不执行聊天请求、创建连接状态或获取实时提供商目录。上下文窗口缓存准备共享此顺序，并且在调度后不早于五秒开始。将立即的第一个请求与空闲间隔后的请求进行比较；仅准备就绪并不能保证每个可选缓存都是热的。

</Accordion>

<a id="workspace-computation" />

<Accordion id="workspace-computation-scripts-bench-workspace-computation-ts" title="工作空间计算（scripts/bench-workspace-computation.ts）">

工作区库存检查、原始清单解析和比较以及批量文件散列使用网关和节点上的有界计算池。解码后的清单与键入的条目同步进行比较，无需另一个清单副本。当主线程处理请求时，独立工作区可以继续进行。主机拥有会话权限、工作区突变、Git 子进程和持久接受；取消加入清理前的未完成工作。

Node 捕获重用此池及其编译的清单程序，而不是在每次验证时启动一个进程。每个捕获都有一个私有工作区、哈希备忘录和限制；节点主机拥有 Git 库存命令。有关接受和恢复订购的信息，请参阅 [ 会话生命周期](/gateway/cloud-workers/session-lifecycle#accept-a-completed-turn)。

将工作区清单、清单捕获和结果准备与具有其自己安装的依赖项的冻结源签出进行比较：

```bash
node --import ./scripts/tsx.mjs scripts/bench-workspace-computation.ts \
  --baseline /path/to/baseline-checkout \
  --scenarios inventory,manifest,delta,unchanged \
  --sizes 1000,32000,100000 --concurrency 1,4 \
  --runs 3 --warmup 1 --output .artifacts/workspace-computation.json
```

使用 `--changed-files 2000 --scenarios delta --sizes 32000` 包含更大的更改后的有效负载，并使用 `--file-bytes` 更改捕获期间散列的内容。默认工作负载较小：1,000 个条目和一个并发操作。

该基准测试检查相同的库存字节、清单引用和更改的有效负载。单独的进程通过外部检查测量首次调用和热吞吐量、CPU、事件循环延迟、内存和 HTTP 延迟。工作线程任务诊断区分排队、输入准备、传输和执行。 HTTP 检查测量计算所属进程的响应能力；配对节点线路测试提供完整的网关调度和协调证明。

</Accordion>

<Accordion id="gateway-concurrency-scripts-bench-gateway-concurrency-ts" title="网关并发数（scripts/bench-gateway-concurrency.ts）">

对于已连接的客户端和固定持续时间的闭环请求，请参阅 [Control UI 协议 load](/help/testing/control-ui-load)。该模式具有单独的客户端计数、协调的驱动程序进程、回复关联和 Linux 资源记帐。

在一个隔离网关上并行会话中运行合成流代理。添加工具调用、会话历史记录、观察者和控制平面检查，以重现繁忙网关的分配压力。首先使用 `pnpm build` 进行构建。默认的模拟提供者不需要密钥。在这个孤立的基准测试中，梦想被禁用；普通索引、回顾和数据库空闲保留保持其正常设置。

如果样本失败，`--output` 和 `--json` 会保留已完成的测量运行、已完成的 `warmupRuns` 和 `failedAttempt` 及其阶段、基于 1 的索引、可用观测值以及工作负载、诊断或清理错误。失败的尝试和热身不会进入汇总摘要。空或不存在部分测量意味着不可用，而不是零。该命令仍以状态 1 退出；实时和活动摘要诊断故障 sidecar 仍然可用。

```bash
pnpm test:gateway:concurrency -- --concurrency 16 --tool-events --workspace-fanout --session-count 100 --history-messages 20 --history-clients 4 --subscribers 4 --visible-observer --control-plane --heap-prof-dir .artifacts/gateway-heap --output .artifacts/gateway-concurrency.json
pnpm test:gateway:concurrency -- --concurrency 64 --turns-per-session 8 --tool-events --timeout-ms 600000 --heap-prof-dir .artifacts/gateway-sustained-heap --output .artifacts/gateway-sustained.json
```

将 `--provider openai` 与环境中提供的 `OPENAI_API_KEY` 一起使用以实现真正的 OpenAI 转弯：

```bash
pnpm test:gateway:concurrency -- --provider openai --runs 1 --warmup 0 \
  --agent-warmup-turns 0 --agent-count 32 --concurrency 32 --turns-per-session 3 \
  --session-count 1000 --history-messages 20 --history-message-chars 1024 \
  --probe-rounds 64 --cadence-ms 100 --session-updates 100 \
  --session-update-clients 2 --history-clients 2 --history-burst 2 \
  --subscribers 4 --control-plane --timeout-ms 120000 \
  --load-cpu-prof-dir .artifacts/gateway-live-cpu \
  --output .artifacts/gateway-live.json
```

实时模式使用固定的 OpenAI 模型，拒绝工具，并将输出限制为 128 个令牌。它允许一次运行，无需预热，最多 96 次，并检查流式答复、终端收据、历史记录和关闭后持续的答复。它不报告综合提供者请求计数。 CPU 剖面是仪器观测；将它们与未分析的延迟测量分开。 [ 手动工作流程](/ci/scheduled-workflows#gateway-concurrency-benchmark) 使用存储库管理的凭据运行此工作负载。

`--concurrency` 控制并行会话； `--turns-per-session` 控制每个会话中的串行轮数（默认 1，最大 100）。第二个示例在 64 个会话中完成了 512 次回合。每个会话在上一轮完成后立即开始下一轮，并保留其对话历史记录和工作空间；回合之间没有障碍。新鲜连接检查在每个会话开始第一轮后运行一次。 `--tool-events` 需要匹配成功的 `exec` 结果以及每轮预期的可见最终答复，包括后续行动。丢失或重复的工具证据使运行失败。加载超时界限轮流检查；启动、设置和检查预热有单独的预算。 Health/control 采样上限为 2,048 个样本，而堆采样将持续到整个工作负载完成。

该夹具为实用模型提供了自己的结构化模拟响应，保留了代理模型的自动工具循环。 `turnEvidence.observerModelDigestTurns` 使用已发布的模型派生观察者摘要来计算轮次。短期运行可以合法地报告零；观察者正确性证明需要正计数。

`mockRequests` 保留六个模拟服务器计数器检查点及其父单调请求边界。入口增量包括 `startupAndWarmup`（就绪、连接、可见性和检查预热）、`setup`、`agentWarmup`（可选代理打开同一网关）、`loadBracket` 和 `postLoad`（通过网关关闭）。当 `--agent-warmup-turns` 为零（默认）时，`agentWarmup` 括号仍然存在；测量负载中不包括预热轮次。这些增量区分响应、聊天完成、嵌入和其他路由，包括拒绝的请求正文；健康状况和模型目录读取被排除。这些 HTTP 括号不是准确的 CPU 捕获窗口或因果归因。 `selections` 通过最终检查点分别计数 model/global 受控响应和自动 tool/text 分支，未完成响应。辅助模型请求仍然包括在内；这两个总数都不是代理轮次的计数。丢失、回归或替换的服务器检查点会失败，而不是变为零。报告保留计数器，而不是原始提示或请求正文。模拟请求日志位于单独的遥测目录中，因此其写入不会在测量期间提供网关的配置和技能祖先观察者。

`--agent-count N` 在 1-128 个配置的代理之间循环分配相同的会话库存。默认为1个代理，不能超过`--session-count`和`--concurrency`中的较大者。增加它不会增加会话或轮次。多代理运行使用 `main`、`bench-agent-2` 以及具有单独工作区的后续 ID。 `--workspace-fanout` 仍为每个会话分配不同的工作区。 `main` 上保留单独的浏览器点击目标。

例如，`--agent-count 32 --session-count 1000 --concurrency 32 --turns-per-session 3` 播种 1,000 个会话并完成 96 个回合，每个代理 3 个回合。在加载窗口及其 CPU/allocation 分析之前，多代理运行需要每个代理通过 `models.list` 当前发布的配置模型，然后通过范围 `sessions.list` 读取的所有页面验证其完整的种子清单和报告的每个代理 SQLite 路径。这会检查网关报告的存储路由；它不独立检查数据库文件。 `agentCoverage.beforeLoad` 保留模型响应和每个会话页面。 `activeTurnAgentIds` 和 `completedTurns` 将处理轮次的座席与配置名册区分开来：具有 16 个并行会话的 128 个配置座席并不意味着 128 个座席处理轮次。多代理历史记录检查行保留 `sessionKey`，它将成功的请求映射到独立验证的商店库存。这些额外的设置读取不会在默认的单代理情况下运行。

使用 `--probe-rounds N` 进行具有同等检查工作的分配比较。它会针对每个配置的历史记录客户端精确尝试 N 次采样器轮次和 N 次历史突发，无论哪个先完成。每个采样器轮次请求 `/readyz`、Control UI 和 `sessions.list`； `--control-plane` 增加 `cron.list` 和 `cron.status` 各一个。启用 `--subscribers` 会在每轮增加一次订阅尝试，并在每次成功订阅后取消订阅。历史尝试总数为 `N × historyClients × historyBurst`，每次运行上限为 2048。慢速客户端收到与快速客户端相同的历史预算。失败的检查仍然记录失败；计数描述的是尝试，而不是成功。省略该标志会保留自适应检查，直到智能体转向和突变结束。

固定检查可以在特工轮流之前或之后完成。每个配置的工作负载在最终内存和分配捕获之前加入；耗尽的负载截止时间会使运行失败，而不是报告部分固定工作负载已完成。输出在`probeWorkload`中记录模式和请求的计数；实际采样器和历史计数保留在 `summary.sampleCount` 和 `summary.historySampleCount` 中。峰值 RSS 在采样器轮次加上最终内存观察期间进行采样。如果这些轮次提前结束，则可能会错过稍后的瞬态 RSS 峰值；这不是整个代理工作负载的连续峰值 RSS 覆盖范围。相同的请求计数并不等于它们与代理轮次或网关的时间相关后台工作的重叠。

每次运行的 `cpuUsage` 记录用户、系统以及网关进程及其主线程的总 CPU 毫秒。在设置和分析器激活之后，通过完成所有配置工作，在最终内存检查、配置文件导出和拆卸之前，两个私有 IPC 快照绑定了负载。它们的子端单调时间戳定义`wallMs`； CPU 当线程并行运行时，时间可能会超过壁时间。普通运行不会连接检查器或启动分析器。

进程计数器包括 Workers 和本机线程，包括加载期间退出的 Workers，但不包括单独的子进程、模拟提供程序和浏览器。主线程CPU是进程CPU的一部分；不要添加它们。它们的差异估计在其他线程上工作，顺序读取计数器造成的偏差很小。摘要报告 `gatewayProcessCpuMs`、`gatewayProcessCpuMsPerTurn`、`gatewayMainThreadCpuMs` 和 `gatewayProcessCpuCoreRatio`。 CPU 每轮包括配置的并发检查和突变。比较固定工作负载和相同的分析设置；将工作转移给 Workers 可以提高响应能力，而无需减少流程 CPU。现有的 `cpuCoreRatio` 摘要保留采样的就绪窗口数据。

要测量加载期间 Control UI 侧栏中现有会话的点击情况，请构建 UI 并安装 Playwright Chromium，然后启用浏览器检查：

```bash
pnpm ui:build
pnpm --dir ui exec playwright install chromium
pnpm test:gateway:concurrency -- --session-count 1000 --concurrency 16 --turns-per-session 2 --browser-session-clicks 3 --browser-history-messages 80 --timeout-ms 240000 --no-diagnostics-timeline --output .artifacts/gateway-session-clicks.json
```

`--browser-session-clicks` 默认为 0，最多接受 20 次首次访问，然后再访问最近的窗格。检查种子在库存后会分离空闲点击目标。 `--browser-history-messages` 默认为每个目标 80 个（最多 500 个），独立于 `--history-messages`，因此大型库存不需要每个会话都有历史记录。 `--history-message-chars` 还调整浏览器目标的合成 Markdown 的大小。浏览器使用`dist/control-ui`中内置的资源； `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 可以选择已安装的 Chromium 可执行文件。

`browser.inventory` 记录请求的加载和点击目标计数以及加载前权威的未存档和保留的会话计数，包括点击目标。保留的计数包括存档的会话；正常的库存维护可以减少播种期间未归档的数量。

每次运行的`browser.clicks`记录从实际浏览器单击事件到目标窗格的可见历史记录、启用的编辑器以及成功的脚本加载和绘制机会之间的时间（`readyMs`）。这些时间不包括Playwright可操作性等待。RPC `windowStartMs`偏移量在该等待之前开始；`latencyMs`测量观察到的request/response往返。请求记录包括套接字标识、方法、会话密钥、成功、错误和响应字节。一个`inherited`请求在点击窗口之前开始并且具有否定性`windowStartMs`；它的延迟包括之前的等待。当稍后的窗口观察响应时，已完成的点击记录保持不变。支票包含消息subscribe/unsubscribe请求公开订阅恢复等待。`connections`记录观察到的套接字、hello 和外部事件序列间隙；负偏移包括最近的设置事件。关闭事件报告观察到入站静默，但未推断关闭原因。`paneStates`记录对所选窗格的加载、准备情况、连接纪元和渲染历史错误的更改。显示的历史故障保留可见-history/composer计时但点击失败而不是计数为就绪。浏览器`longTasks`包含每个观察到的长任务与点击就绪间隔重叠的毫秒数，与网关的时间间隔分开Node CPU、事件循环和内存样本。预载`/new`初始会话时间位于点击摘要之外。分别比较首次访问和缓存的重新访问，并检查`activeLoadAtStart`， `activeLoadAtFinish`， 和`samplesOutsideActiveLoad`在将延迟归因于并发工作之前。记录的点击失败导致基准测试在写入报告后失败退出。

`--heap-prof-dir`Gateway 的 main 中的样本分配V8隔离、启动后启动、会话播种和检查预热。采样在加载和最终内存检查之后、配置文件序列化和拆卸之前结束。它使用一个32 KiB采样间隔，包括次要和主要收集的对象GC， so `sampledAllocatedBytes`估计总分配而不是保留的堆。每次运行都会记录其`.heapprofile`路径和二十个最大的分配堆栈`scope: "main-isolate"`；打开原始文件Chrome DevTools内存面板。工人分离株具有单独的概况，如下所述。本机分配不在这些范围内V8配置文件。

摘要包括每次运行和每个完成回合的采样分配字节。每轮数据还包括并发检查和会话突变；比较多次运行中相同的工作负载设置和 Node 版本。初始轮次和后续轮次在会话之间重叠，因此分配配置文件涵盖了它们的组合工作负载，而不是分配单独的冷分配和热分配。比较匹配的一转和持续运行以研究重用。抽样是统计性的，会增加开销。使用未分析的运行进行延迟比较。现有的 heap/RSS 测量是在导出配置文件之前进行的。 `--cpu-prof-dir` 仍可单独使用并包含启动功能；记录的 `loadWindow` 标识该 CPU 配置文件中的测量间隔。

对于并发工作期间的 CPU 归属（包括 Windows），请添加 `--load-cpu-prof-dir .artifacts/gateway-load-cpu`。这会在设置后并通过最终内存检查以 1 ms 采样间隔捕获网关的主 V8 隔离。专用基准 IPC 通道会在进程拆卸之前停止分析器并写入 `.cpuprofile`，而不依赖于信号驱动的配置文件刷新。每次运行的`loadCpuProfile`用`scope: "main-isolate"`记录其路径、持续时间和样本计数；打开 Chrome DevTools 中的原始配置文件。分析运行会增加开销，因此请将它们与延迟比较分开。 `--cpu-prof-dir` 保留其包含启动的本机分析行为。 `--load-cpu-prof-dir` 和 `--heap-prof-dir` 需要单独运行，因此导出一个配置文件不会污染其他捕获。

两个负载配置文件标志还捕获通过现有专用检查器连接观察到的工作人员隔离。主要配置文件摘要链接 `workersManifestPath`，即主配置文件旁边的 `.workers.json` 清单。它的行区分本地 `threadId` 和 `inspectorWorkerId` 并链接每个工人的配置文件。 `completed: true`表示配置文件已写入；检查行级错误是否缺少身份、退休工人或其他不完整的捕获。成功的分析命令并不意味着每个 Worker 都生成了可用的配置文件。工作人员在出生时不会暂停，因此分析可能会错过他们最早的工作。这些文件排除单独的子进程。

Worker 清单的示例在网关进程中使用 `performance.now`，并在异步 Worker 读取之前获取时间戳。 100 毫秒的节奏是标称的；重叠的读取被合并。 CPU 计数器是累积微秒：对同一线程标识进行差异观察，而不是对样本求和。这些增量涵盖了每个工作人员的观察间隔，并且可能会在第一次成功采样之前或最后一次成功采样之后错过工作。样本的`memory.rss`涵盖了该流程；其他 `memory` 字段描述主要隔离，而每个 Worker 的 `heap` 包含其自己的 V8 堆统计信息。

捕获窗口不同：在最终内存检查之前加载 CPU 计数器结束；主要 V8 配置文件包括该检查；工作人员配置文件和样本也会在其停止之前通过主配置文件序列化进行扩展。使用原始 CPU 配置文件的时间戳和清单观察进行归因，并将这些窗口与 `cpuUsage` 分开。主线程 CPU 加上观察到的 Worker CPU 并不考虑每个本机线程或未观察到的 Worker 间隔。分析和定期工人检查会增加开销；比较同等仪器运行。

两种负载阶段配置文件模式还将 `diagnostics` 和 `diagnosticsPath` 附加到运行报告中。私有基准预加载仅在捕获期间订阅，并聚合主隔离的编辑、会话编写器、会话列表和工作任务完成记录，包括低于慢速日志阈值的快速工作。它最多记录 256 组的计数、总计和最大值； `droppedEvents` 和 `collectionErrors` 报告收集不完整。这些聚合中不会保留每次呼叫记录历史记录、会话或代理 ID、路径、消息文本、正则表达式模式或异常文本。工作人员工件基本名称标识任务组。

编辑将同步线程 CPU 与经过的时间和输入 UTF-16 字符计数分开报告。这些是包容性测量：嵌套的编辑操作重叠，因此不要添加它们的时间。会话写入器计时将队列等待、写入器持有的运行时间和完成延迟分开。列表记录将 `sessions.list` 与初始 `sessions.subscribe` 快照区分开来，并单独的投影所有者、正在进行的追随者和已完成的缓存命中。工作任务记录单独的队列、准备、运行和传输测量。经过的时间间隔可以在并发工作中重叠，并且不测量 CPU。

该捕获还聚合主隔离 GC 暂停条目。分配配置文件识别分配地点，包括收集的对象；他们不确定哪些对象仍然可访问或证明存在泄漏。原始配置文件包含函数名称和源位置，需要在共享之前进行检查。

这些诊断通道在普通网关中没有收集器。该基准测试使用隔离的合成状态、私有进程 IPC，并且没有检查器侦听器。它不会附加或修改现有的运营商网关。

</Accordion>

<Accordion id="gateway-restart-scripts-bench-gateway-restart-ts" title="网关重启（scripts/bench-gateway-restart.ts）">

仅 macOS 和 Linux（使用 SIGUSR2 进行进程内重新启动；在 Windows 上立即失败）。与上面的网关启动相同的内置条目默认值和 `--entry scripts/run-node.mjs` 覆盖。

```bash
pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5
pnpm test:restart:gateway -- --case default --runs 3 --restarts 3 --warmup 1
```

案例 ID：`skipChannels`、`skipChannelsAcpxProbe`（ACPX 启动检查）、`skipChannelsNoAcpxProbe`（检查关闭）、`default`、`fiftyPlugins`。

输出包括下一次 `/healthz`、下一次 `/readyz`、停机时间、重启就绪时间、CPU、RSS、替换进程的启动跟踪指标，以及关于信号处理、活动工作项清理、关闭阶段、下一次启动、就绪时间和内存快照的重启跟踪指标。脚本会设置 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 和 `OPENCLAW_GATEWAY_RESTART_TRACE=1`。

当变更涉及重启信号、关闭处理器、重启后的启动、sidecar 关闭、服务切换，或重启后的就绪性时，请使用此基准。先从 `skipChannels` 开始，以将 Gateway 机制与通道启动隔离开；只有在这个窄场景解释清楚重启路径之后，才使用 `default` 或插件密集型案例。跟踪指标只是归因线索，不是最终裁决——判断重启变更时，应综合多次样本、匹配的 owner span、`/healthz`/`/readyz` 行为，以及用户可见的重启契约。

</Accordion>
