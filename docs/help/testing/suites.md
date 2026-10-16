---
summary: "单元、e2e 和 live 套件，运行哪一个，以及离线回归检查"
title: "测试套件和命令"
read_when:
  - "您需要选择一个测试套件或命令"
  - "您想知道每个套件涵盖什么"
---

## <a id="quick-start"></a> 快速开始

使用规范的 [proof 策略 ](https://github.com/openclaw/openclaw/blob/main/.agents/skills/openclaw-testing/SKILL.md#proof-policy) 选择证明。使用以下命令来选择您需要的套件：

- 重点测试：`pnpm test <file> --maxWorkers=1`
- 失败的PR CI测试：`pnpm test:ci-failed <pr>`；使用 `--run` 执行选择
- 手表循环：`pnpm test:watch`
- 全套：`pnpm test`；较高工人上限：`pnpm test:max`
- 信息覆盖范围：`pnpm test:coverage`
- E2E: `pnpm test:e2e`
- Docker QA 站点：`pnpm qa:lab:up`
- Linux VM QA: `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

QA 站点需要 Docker 和源（npm tarball 省略了 QA Lab）； VM 运行器需要多次通过。请参阅 [QA 跑步者 ](/help/testing/qa-runners)。

PR CI 拥有广泛的证明。 CI失败后，运行`pnpm test:ci-failed <pr>`并读取existing/new/unknown之前的分类。修复新的故障并调查未知的故障，然后使用 `pnpm test:ci-failed <pr> --run` 直到所选测试在本地通过并推送一次。不要运行完整的本地套件或使用 `gh run rerun` 追逐绿色。预先存在的故障遵循 [ 故障表着陆规则 ](https://github.com/openclaw/openclaw/blob/main/.agents/skills/openclaw-pr-maintainer/references/landing.md#red-main-and-inherited-failures)。有关目标、分类和命令选项，请参阅 [ 失败的 CI 测试选择 ](/reference/scripts/pr-tooling#rerun-failed-ci-tests)。

当文件超出 `.oxlintrc.json` 中的每个范围限制时，Oxlint 的 `max-lines` 规则会发出警告；这些警告在 lint 日志中仍然可见，并且不会失败 CI。本地`pnpm check:changed`拒绝超限变更文件，并单独检查新的违规和增长；广泛的皮棉发现未触及的超量是警告。 PR CI 也将数字棘轮违规报告为警告。抑制基线棘轮在局部仍然严格。请参阅 [ 表面棘轮 ](/ci/local-proof#surface-ratchets) 进行比较底座和仅收缩维护。

## <a id="runner-exit-status"></a> Runner退出状态

`pnpm test`、`scripts/test-projects.mts` 和 `scripts/run-vitest.mjs` 区分 Vitest 故障和运行器基础设施故障：

- `0`：命令成功完成。
- `1`：Vitest 失败，或拒绝请求的测试或参数。
- `2`：加载器启动、运行器准备、子级完成、工作器处置或报告发布失败。除 `1` 之外的现有本机故障代码保持不变。

跑步者在返回之前完成了工人处置并要求发布报告。较晚的基础设施故障优先于较早的测试故障。在并行完成中，除 `0`、`1` 或保留基础设施 `2` 之外第一个观察到的本机状态获胜，无论 `2` 何时到达。基础设施成果阻止新分片的准入；已经承认的分片仍然会加入。普通断言失败会保留选择的延续策略。转发的信号在清理后保留其信号结果。

对于预期故障证明，需要退出 `1` 及其报告中的预期断言。等待外部命令终止。仅凭一份报告并不能证明清理工作已成功。中断的命令或丢失的最终结果不是完整的预期故障。

## <a id="test-suites-(what-runs-where)"></a><a id="test-suites-what-runs-where"></a> 测试套件（在哪运行什么）

将套件视为“增加现实主义”（并增加 flakiness/cost）。

维护者工具系列在混合快速配置中使用 `RELEASE_ONLY_TOOLING_SHARDS` 和匹配的维护者叶：仅产品 PR 和 main 忽略它，工具所有者 PR 选择受影响的文件（为未解决的所有者提供全系列回退），并且手动 CI 和完整版本验证保留它。将测试及其进程和计时器策略保留在分配的配置中，以便新文件继承相同的所有者路由。专用产品 E2E 和现场测试仍然在此层之外。请参见 [ 节点测试通道 ](/ci/scope-and-routing/node-test-lanes)。

### <a id="postgresql-conformance"></a> PostgreSQL 一致性

`node scripts/test-database-conformance.mjs --engine postgres --connection <dsn>` 针对一次性 PostgreSQL 数据库运行工作板套件和 `src/infra/postgres-sync` 测试。运行程序通过 Node 预加载和工作环境数据传递连接来测试进程和线程，而无需 DSN 环境变量。它编辑来自子输出的连接。

`--` 之后的参数进入正常测试运行程序。从文件或目录开始替换默认目标；仅选项保留两个套件。例如，附加 `-- src/infra/postgres-sync/locks.test.ts --maxWorkers=1` 进行冒烟测试。

对于本地 Homebrew `postgresql@17` 集群，请使用具有足够可用空间的磁盘上的临时目录。该子 shell 在退出时停止并删除其集群：

```bash
(
  D=$(mktemp -d /Volumes/External/openclaw-pg.XXXXXX)
  PG=$(brew --prefix postgresql@17)/bin
  trap '"$PG/pg_ctl" -D "$D/data" -m immediate stop; rm -rf "$D"' EXIT
  "$PG/initdb" -A trust -U postgres -D "$D/data"
  "$PG/pg_ctl" -D "$D/data" -l "$D/server.log" \
    -o "-p 55436 -k $D -h ''" -w start
  node scripts/test-database-conformance.mjs --engine postgres \
    --connection "postgresql://postgres@localhost:55436/postgres?host=$D"
)
```

或者，在 Docker-enabled 测试盒上，使用信任身份验证和仅环回端口启动 `postgres:17`，对 `postgresql://postgres@127.0.0.1:5432/postgres` 运行相同的命令，然后删除容器。

端口命令集成场景在不同的文件中共享其固定装置，以便现有的 Vitest 工作人员可以重叠独立的恢复和托管案例。它们保留真正的一次性命令工作人员、隔离状态和 PostgreSQL 命名空间；没有启动额外的作业或服务。

CI 的 **PostgreSQL 一致性** 作业使用新的 `postgres:17` 服务。它在计划的主 CI 和 PR 上运行，涉及 `src/infra/database-engine/**`、`src/infra/postgres-sync/**`、`src/infra/sql-connection.ts`、`src/infra/sql-query-compiler.ts`、`src/infra/kysely-sync*.ts`、`src/infra/sqlite-transaction.ts`、`extensions/workboard/**`、`src/config/zod-schema.database.ts` 或`scripts/test-database-conformance*.mjs`。未知PR路径保守选择；没有跑步者的旧目标会忽略它。 `openclaw/ci-gate` 需要选定的作业。

### <a id="unit-%2F-integration-(default)"></a><a id="unit-/-integration-default"></a> 单元 / 集成（默认）

- 命令：`pnpm test`
- Config：非目标本地运行将 `vitest.full-*.config.ts` 分片集扩展为有界的每个项目调用以进行并行调度； CI 保留聚合分片策略
- 文件：`src/**/*.test.ts`、`packages/**/*.test.ts`和`test/**/*.test.ts`下的core/unit库存； UI 单元测试在专用 UI 叶项目中运行
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具链、解析、配置）
  - 针对已知错误的可重复回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实密钥
  - 应当快速且稳定
  - Resolver 和公共表面加载器测试必须通过生成的小型插件固定装置（而不是真正的捆绑插件源 API）来证明广泛的 `api.js` 和 `runtime-api.js` 后备行为。真正的插件 API 加载属于插件拥有的 contract/integration 套件。
  - Native 插件解析器套件在 Node 和 Bun 上的 `plugins-native-loader` 中运行，无需共享源加载器覆盖。全局 Bun `--tsconfig-override` 可以将被拒绝的夹具别名解析为签出源，并绕过套件正在测试的所有权边界。 Bun 的本机工作人员还禁用自动包安装，因此缺少的夹具依赖项仍然丢失。

本地依赖策略：

- 默认测试安装会跳过可选的原生 Discord opus 构建。Discord 语音使用捆绑的 `libopus-wasm`，并且 `@discordjs/opus` 在 `allowBuilds` 中保持禁用，因此本地测试和 Testbox 通道不会编译原生 addon。
- 比较 `libopus-wasm` 基准存储库中的本机操作性能，而不是在默认 OpenClaw install/test 循环中。默认`allowBuilds`中不要将`@discordjs/opus`设置为`true`；这使得不相关的 install/test 循环编译本机代码。

<AccordionGroup>
  <Accordion id="projects-shards-and-scoped-lanes" title="项目、分片和范围通道">

    - Untargeted 本地 `pnpm test` 将 12 个聚合分片配置扩展到其叶项目中，然后将大型库存拆分为有界调用。调用次数随着测试库存的增加而增长；它不是十二个过程。单独的进程生命周期绑定保留的模块图，并让自动回复和插件工作与其他套件共享调度程序。 CI 保留现有的聚合策略，包括代理和扩展分片的 Testbox 扩展。
    - 扩展的本地全套套件将批量普通工具测试运行到每个 Vitest 进程最多八个文件中，以分摊启动时间。共享 UI 通道还使用最多 8 个文件的批次，因此保留的 jsdom/module 生成不会减慢整个 UI 库存的速度。共享网关数据库工作进程分支被限制为每个进程 50 个文件，以避免保留其整个模块图。隔离、浏览器、计时和 Docker 通道保留其现有所有者和策略；批处理不会删除测试或放松独占网关调度。
    - 本地扩展数据库工作线程调用还使用每个进程队列中绑定的现有二十个文件作业。 Telegram 本机工作线程测试保留其单文件进程生命周期，并且其他较小的进程限制仍然有效。这可以防止单个数百个文件的队列成为串行尾部。
    - 本地分片并发性来自 CPU、负载和可用内存工作线程预算，上限为 10 个进程。普通分片每个接收一名 Vitest 工作人员。专用网关分片单独运行，并且可以在自己的进程内使用相同的并发预算，而其配置级串行阶段保持串行。 `OPENCLAW_TEST_PROJECTS_PARALLEL=<n>` 覆盖分片并发； `OPENCLAW_TEST_PROJECTS_SERIAL=1` 选择串行调度。显式 `OPENCLAW_VITEST_MAX_WORKERS` 或 `OPENCLAW_TEST_WORKERS` 值保留其工作线程策略。这些本地默认值都不会更改 CI 调度。
    - `pnpm test --watch` 仍使用原生根目录的 `vitest.config.ts` 项目图，因为多分片 watch 循环并不实用。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 首先通过作用域通道路由显式 file/directory 目标，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 避免支付全额根项目启动税。
    - 非监视包和代理目录目标（例如 `pnpm test packages/gateway-client` 或 `pnpm test src/agents/tools`）以及引用的代理 glob（例如 `pnpm test 'src/agents/failover/**/*.test.ts'`），发现常规 `*.test.ts` 文件并将每个文件路由到其所属通道。这保留了快速、隔离、利用和数据库工作人员所有权、共享排除和继承的包含限制；普通选择不选择现场测试或 E2E 测试。
    - 非监视根项目运行（例如 `node scripts/run-vitest.mjs run src/config`）在启动之前准备其所选测试所需的任何构建运行时。
    - 默认情况下，`pnpm test:changed` 将更改的 git 路径扩展为廉价的范围通道：直接测试编辑、兄弟 `*.test.ts` 文件、显式源映射和本地导入图依赖项。 Config/setup/package 编辑不会广泛运行测试，除非您明确使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm check:changed`是可选的智能本地检查，适用于狭窄的工作； PR CI 拥有宽阔的大门。它将差异分类为核心、核心测试、扩展、扩展测试、应用程序、文档、发布元数据、实时 Docker 工具和工具，然后运行匹配的类型检查、lint 和防护命令。选定的路径还通过 `pnpm test:serial` 安排有针对性的 Vitest 所有者测试；使用 `pnpm test:changed` 或显式 `pnpm test <target>` 来获取与所涉及合同匹配的附加测试证明。仅发布元数据的版本颠簸运行有针对性的 version/config/root-dependency 检查，并带有拒绝顶级版本字段之外的包更改的防护。
    - 在针对 `HEAD`、comment/whitespace-only、TypeScript 的默认 Git diff 模式中，当标记和换行边界与合并基础匹配时，编辑会跳过其类型检查通道和核心图边界检查。带有 TypeScript/JSX 指令、三斜杠注释、解析错误或路径生命周期更改的文件会保留类型检查，JavaScript 文件也是如此。 Lint、格式化、棘轮、防护和测试保持完整的更改路径范围。分阶段、显式路径和非 `HEAD` 比较保留正常的类型检查选择； `--dry-run` 报告任何跳过的路径。
    - Changed 核心测试检查在其他选定的使用者之前运行拥有已更改测试根的分片。两个组都保持其规范顺序，并且 CI 条带成员资格保持不变。仅源更改保持正常顺序。边界库存可重复用于选择和订购。
    - Live Docker ACP harness编辑运行重点检查：实时 Docker 身份验证脚本的 shell 语法和实时 Docker 调度程序空运行。仅当 diff 仅限于 `scripts["test:docker:live-*"]` 时，才包含 `package.json` 更改；依赖项、导出、版本和其他包表面编辑仍然使用更广泛的保护。
    - 来自代理、命令、插件、自动回复助手、`plugin-sdk` 和类似的纯实用程序区域的导入轻量单元测试通过 `unit-fast` 通道路由，该通道跳过 `test/setup-openclaw-runtime.ts`； stateful/runtime-heavy 文件保留在现有通道上。
    - 部分 `plugin-sdk` 和 `commands` 辅助源文件在变更模式运行中也会映射到这些轻量通道里的明确同级测试，因此辅助文件修改无需为该目录重新运行完整的重型套件。
    - `auto-reply` 为顶层核心辅助程序、顶层 `reply.*` 集成测试以及 `src/auto-reply/reply/**` 子树分别设置了专用分组。CI 还会进一步将 reply 子树拆分为 agent-runner、dispatch 和 commands/state-routing 分片，避免某个导入密集型分组独占完整的 Node 尾部耗时。
    - 常规 PR/main CI 会有意跳过捆绑插件批量扫描和仅发布使用的 `agentic-plugins` 分片。完整的发布验证会为这些插件密集型套件单独调度 `Plugin Prerelease` 子工作流，并在候选发布版本上运行。

  </Accordion>

  <Accordion id="embedded-runner-coverage" title="嵌入式流道覆盖范围">

    - 当你更改 message-tool 发现输入或 compaction 运行时上下文时，请保留两层覆盖。
    - 为纯路由和归一化边界添加聚焦的辅助回归测试。
    - 保持嵌入式运行器集成套件健康： `src/agents/embedded-agent-runner/compact.hooks.test.ts`, `src/agents/embedded-agent-runner/run.overflow-compaction.test.ts`, 和 `src/agents/embedded-agent-runner/run.overflow-compaction.loop.test.ts`。
    - 这些套件验证作用域 id 和 compaction 行为仍然通过真实的 `run.ts` / `compact.ts` 路径流动；仅辅助程序测试不足以替代这些集成路径。

  </Accordion>

  <Accordion id="vitest-pool-and-isolation-defaults" title="Vitest 池和隔离默认值">

    - Base Vitest 配置在 Windows 和 `threads` 上默认为 `forks`。 Windows 工作线程需要单独的本机句柄表：并发线程生成可以继承另一个工作线程的临时输出管道句柄，并防止该工作线程的子清理观察到 EOF。工作线程数和文件并行度保持不变。
    - SQLite 准入在每个 Vitest 工作人员的测试收集之前运行。 Bun线程继承config进程的决定； OS 分叉在本地初始化它。 Bun 在数据库池捕获其策略之前运行现有的本机关闭一致性探测； Node 保留其运行时提供的功能。
    - 共享 Vitest 配置固定使用 `isolate: false`，并在根项目、e2e 和 live 配置中使用非隔离运行器。
    - 根 UI 通道保留其 `jsdom` 设置和优化器，但也运行在共享非隔离运行器上。共享预加载注册 jsdom 适配器，而不导入其 DOM 绑定；这些在 jsdom 环境启动时初始化。
    - Provider 插件分片通过共享清理运行器重用工作线程。使用 `vi.stubGlobal` 跟踪全局替换，以便清理可以在下一个文件之前恢复它们。
    - 在每次测试尝试之前和文件清理之前，共享运行程序会等待代理数据库关闭先前安排的拆卸而不等待，因此工作线程租约释放永远不会与下一个测试重叠。与以前一样，失败的关闭仍保留在其所有者和文件端排出中。
    - Each `pnpm test` 分片继承平台池，`isolate: false` 默认来自共享 Vitest 配置，除非其所有者另有选择。
    - `scripts/run-vitest.mjs` 默认会为 Vitest 子 Node 进程添加 `--no-maglev`，以减少大型本地运行期间的 V8 编译开销。 设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 可与标准 V8 行为进行比较。
    - 当配置的无输出截止时间到期时，`scripts/run-vitest.mjs` 终止显式非监视 Vitest 运行。即使子进程以退出代码零关闭，到期也会导致运行失败而不会重试分片。设置 `OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=0` 以禁用看门狗以进行故意静默调查。
    - 默认情况下，`scripts/run-tsgo.mjs` 使 tsgo 不受限制，保留现有本地工作流的行为。将 `OPENCLAW_TSGO_TIMEOUT_MS` 设置为正毫秒值，以使楔入编译器大声失败，而不是永远阻止其调用者。到期时，整个 tsgo 进程树将被终止并且运行失败。高于 Node 定时器上限的值会在该值处饱和，而不是崩溃到 1ms 的截止时间； `0`、负数、分数或高于 `Number.MAX_SAFE_INTEGER` 的任何值都将被拒绝并导致运行失败。首先修剪周围的空白；剩余值必须使用不带前导零的纯十进制数字，因此 `1e5` 或 `007` 等值将被拒绝。取消设置变量以禁用看门狗。取消编译器分片批量连接每个编译器，包括在需要时强制终止，然后释放签出工件所有权，以便下一个构建或检查可以继续进行。

  </Accordion>

  <Accordion id="fast-local-iteration" title="快速局部迭代">

    - `pnpm changed:lanes` 会显示 diff 会触发哪些架构通道。
    - 预提交挂钩格式化并重新暂存文件。配置私有规则后，它还会在格式化之前和之后扫描暂存的内容。请参阅 [ 本地提交挂钩设置 ](https://github.com/openclaw/openclaw/blob/main/CONTRIBUTING.md#local-commit-hook)。它不运行 lint、类型检查或测试。
    - 当可选的智能本地检查有助于选择重点校样时，请使用 `pnpm check:changed`。 PR CI 在发布后进行广泛检查。
    - `pnpm test:changed` 默认会通过成本较低的作用域通道进行路由。仅当代理判断 harness、配置、package 或契约修改确实需要更广泛的 Vitest 覆盖时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行为，只是使用更高的 worker 上限。
    - 本地工作线程自动缩放有意保守，并在主机平均负载已经很高时退出，因此默认情况下多个并发 Vitest 运行造成的损害较小。具有至少 8 个可用 CPU 的 CI 主机可以使用 6 个工作线程（24 至低于 28 GiB）和 8 个工作线程（28-128 GiB）。即使对于两个繁重的测试过程，测得的内存余量也保留了 RAM 的 25%。交互式本地尺寸不变；显式工作线程覆盖、负载回退、进程内存限制、可用内存压力限制以及 16 个工作线程上限仍然适用。请参阅 [CI 工人尺寸 ](/ci/capacity#vitest-worker-sizing) 了解测量值和工作流程限制。
    - 基本 Vitest 配置将 projects/config 文件标记为 `forceRerunTriggers`，因此当测试接线更改时，更改模式重新运行保持正确。
    - 在受支持的主机上，配置会保持启用 `OPENCLAW_VITEST_FS_MODULE_CACHE`；设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` 可为直接性能分析指定一个明确的缓存位置。
    - 具有隔离 HOME 的 Bun 测试进程在运行期间将其转译器缓存保留在结帐的 `.cache/bun-transpiler` 目录中。设置 `BUN_RUNTIME_TRANSPILER_CACHE_PATH` 以使用其他位置，或设置 `0` 以禁用它。显式值（包括空值）将被保留。
    - Local Node 运行还重用来自 `.artifacts/vitest-worker-cache` 的已编译运行时工作线程输出。运行程序保留一个独占的本地结账输出槽，并将经过验证的工件传输到该槽中。在其借用者和资源加入后，它将完成的工件传输回缓存并删除调用目录。占用的或不确定的世代永远不会自动回收。内容、编译器、配置或分辨率更改使种子无效；仅时间戳触摸不会。每次调用都会刷新构建来源和资源收据，并且 source/output 验证在借出之前和完成之后仍然运行。当至少 8 GiB 内存可用时，启用冷缓存的准备工作与独立工作程序和终结器构建重叠；较小的主机保持顺序编译。 CI 会保持最新编译，除非其工作流程在恢复受保护的缓存后启用 `OPENCLAW_VITEST_WORKER_CACHE=1`。只有受保护的温暖者才会发布共享的世代；普通的 CI 作业仍然是远程缓存读取器。重用需要相同的绝对检出和保留的输出路径、Node 版本、编译器选项和经过验证的输入。不兼容或缺失的代可以正常编译。 Bun 和自定义 Node 加载程序运行保持最新编译。此缓存不与另一个签出共享 Vitest 的可写文件系统模块缓存。

  </Accordion>

  <Accordion id="perf-debugging" title="性能调试">

    - `pnpm test:perf:imports` 启用 Vitest 导入耗时报告以及导入细分输出。
    - `pnpm test:perf:imports:changed` 将相同的性能分析视图限定到自 `origin/main` 以来发生变更的文件。
    - 分片计时数据写入 `.artifacts/vitest-shard-timings.json`。 完整配置运行会使用配置路径作为键；包含模式的 CI 分片会追加分片名称，以便分别跟踪经过筛选的分片。
    - 当一项热测试仍将大部分时间花在启动导入上时，请将大量依赖项保留在狭窄的本地 `*.runtime.ts` 模块后面，并直接模拟该模块，而不是深度导入运行时帮助程序，只是为了通过 `vi.mock(...)` 传递它们。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 会将路由后的 `test:changed` 与该已提交 diff 对应的原生根项目路径进行比较，并输出墙钟时间以及 macOS 最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 会通过 `scripts/test-projects.mts` 和根 Vitest 配置，将变更文件列表路由到当前有未提交修改的工作树并进行基准测试。
    - `pnpm test:perf:profile:main` 会为 Vitest/Vite 启动和转换开销写入主线程 CPU 性能分析文件。
    - `pnpm test:perf:profile:runner` 为禁用文件并行性的单元套件写入运行器 CPU+堆配置文件。配置文件跨越每个工作人员的文件，并在拆卸确认之前完成，包括失败的运行。两个命令都打印它们的输出目录；有关输出选择、捕获边界和支持的运行器，请参阅 [ 测试性能工具](/reference/test/performance#test-performance-tooling)。

  </Accordion>
</AccordionGroup>

### <a id="stability-(gateway)"></a><a id="stability-gateway"></a> 稳定性（网关）

- 命令：`pnpm test:stability:gateway`
- 配置：`test/vitest/vitest.gateway.config.ts`、`test/vitest/vitest.logging.config.ts` 和 `test/vitest/vitest.infra.config.ts`，每个配置均强制使用一个 worker
- 范围：
  - 启动一个默认启用诊断功能的真实回环网关
  - 通过诊断事件路径驱动合成网关消息、内存和大负载的反复变化
  - 通过网关 WS RPC 查询 `diagnostics.stability`
  - 覆盖诊断稳定性捆绑包持久化辅助函数
  - 断言记录器保持有界、合成 RSS 样本低于压力预算，并且每个会话的队列深度最终降回零
- 预期：
  - CI-安全无钥匙
  - 用于稳定性回归跟进的专用测试通道，不能替代完整的网关测试套件

### <a id="e2e-(repo-aggregate)"></a><a id="e2e-repo-aggregate"></a> E2E（仓库聚合）

- 命令：`pnpm test:e2e`
- 范围：
  - 运行网关冒烟 E2E 通道
  - 运行模拟的 Control UI 浏览器 E2E 通道
- 预期：
  - CI-安全无钥匙
  - 需要安装 Playwright Chromium。

### <a id="e2e-(gateway-smoke)"></a><a id="e2e-gateway-smoke"></a> E2E（网关冒烟测试）

节点工作进程组在所有者更改 PR 和每小时主 CI 上运行。其明确的库存、选择和容量策略记录在 [Node 测试通道](/ci/scope-and-routing/node-test-lanes) 中。

- 命令：`pnpm test:e2e:gateway`
- 配置：`test/vitest/vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts` 以及 `extensions/` 下的捆绑插件 E2E 测试
- 运行时默认值：
  - 使用 Vitest `threads` 和 `isolate: false`，与仓库的其他部分一致。
  - 默认情况下使用一名工作人员以避免共享网关状态的并发更改。
  - 默认以静默模式运行，以减少控制台 I/O 开销。
- 有用的覆盖：
  - `OPENCLAW_E2E_WORKERS=<n>`：选择启用并行 worker（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1`：重新启用详细的控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 表面、节点配对以及更重型的网络功能
- 预期：
  - 在 CI 中运行（管线启用时）
  - 不需要真实密钥
  - 比单元测试涉及更多活动部件（可能更慢）

### <a id="e2e-(control-ui-mocked-browser)"></a><a id="e2e-control-ui-mocked-browser"></a> E2E（Control UI 模拟浏览器）

- 命令：`pnpm test:ui:e2e`
- 配置：`test/vitest/vitest.ui-e2e.config.ts`
- 文件：`ui/src/**/*.e2e.test.ts` 和 QA 实验室媒体记录真实网关套件
- 范围：
  - 在两个执行阶段使用四个资源组：`ui-e2e-bundled`和`ui-e2e-standalone`共享并行阶段（总共最多两个worker）； `ui-e2e-serial` 和 `ui-e2e-serial-standalone` 共享后期的单工作阶段
  - 两个捆绑消耗项目每次调用都会延迟获取一个临时 UI bundle/preview；独立项目拥有自己的固定装置、源代码或定制构建服务器
  - 仅选择独立套件会跳过共享捆绑包构建；新的 E2E 文件默认为捆绑所有权
  - 每个选定的项目发现Chromium并通过Playwright驱动真实页面；根配置保留完整的发现清单
  - 大多数套件用固定响应浏览器内模拟替换网关 WebSocket；一些启动隔离的真实网关
- 预期：
  - 作为`pnpm test:e2e`的一部分在CI中运行；资源组不添加 CI 作业
  - 无需提供商密钥； `OPENCLAW_UI_E2E_SKIP_REAL_GATEWAY=1` 不包括真实网关套件
  - Chromium 和 Playwright FFmpeg 必须存在； `node --import tsx scripts/ensure-playwright-chromium.mts` 安装它们，并且 `pnpm test:ui:e2e` 已经运行它
  - 工作板本机捆绑套件还需要具有系统依赖项的WebKit（`pnpm --dir ui exec playwright install --with-deps webkit`）； Crabbox Linux Hydration 安装两个浏览器必备组件

在 `OPENCLAW_BUILD_PRIVATE_QA=1 OPENCLAW_RUN_NODE_SKIP_DTS_BUILD=1 pnpm build` 在每次干净结账中完成后，专用真实网关 CI 通道使用 `test/vitest/vitest.ui-e2e-prebuilt.config.ts`。单独的工件作业保留 SDK 声明验证。规划器平衡一行中的现有串行文件和选定的独立伴随文件，另一行中的剩余审核并行文件。串行执行后，同伴共享现有的两个工作阶段，无需额外的捆绑预览。真正的 node/SSH 桌面调整大小之旅仅发布：当通过完整的 manual/release 验证或直接规格编辑选择其文件时，第一行为两个运营商运行 `node --import tsx scripts/test-desktop-resize-real.mts` 一次。引导程序仍然是必需的；在没有真实固定装置的情况下调用桌面规范并不是等效的证据。频繁的调整大小、撤销、仅查看过滤、接管和 UI 大小测试仍保留在普通 CI 中。放置会消耗 `vitest.ui-paths.mjs` 中的并行资格允许列表，而不更改 Vitest 调度。每个选定的文件都有一个 CI 所有者；桌面引导程序执行每个载体一次。完整的手册和发布选择保留了完整的库存。预构建预览借用经过验证的标准 Control UI 资源，无需重建或删除它们；默认模拟网关问候使用相同的工件身份，并且显式模拟身份覆盖仍然适用。普通的当地跑步保留了他们的私人建筑。保持源和构建输出不变，直到所有工人和孩子完成。夹具保留其私有 HOME、状态、端口、清理和现有工作人员限制。就绪失败会停止，无需重建或回退。普通本地配置保持真实网关文件串行；冻结目标和较旧的规划器保留完整的 CI 行和他们自己的 config/command. 有关资源策略和计时证据，请参阅 [CI](/ci)。

### <a id="network-isolated-local-e2e"></a> 网络隔离本地 E2E

当 Chromium 可用时，UI E2E 设置在获取网关装置或共享 UI 构建之前通过父 Node 进程的正常 `fetch` 证明环回 HTTP。代理拒绝或格式错误的响应会导致此环境预检失败并出现已清理的错误，而不是消耗网关启动预算。现有的可选缺失浏览器跳过保持不变。如果稍后网关准备就绪到期，其错误还会保留最后完成的 HTTP 故障，因此最终截止时间边缘超时不会隐藏有用的状态和错误类别证据。

网关托管的 exec 可以继承 [ 秘密出口代理](/gateway/secrets/secret-store-and-egress#secret-egress-proxy)。其简单的 HTTP 拒绝也适用于调用其自己的环回夹具的测试过程。因此，当其父网关收到来自 `/readyz` 的代理错误时，网关可以记录其已准备就绪。再次构建 UI 或增加就绪超时并不能修复传输不匹配。

对于受信任的无密钥本地测试，请在隔离的 Linux 容器中运行完整的调用。通过完整图像 ID 或摘要选择已准备好的可信图像；跑步者永远不会拉取图像或回退到主机：

```bash
node scripts/run-vitest.mjs --isolated-image "$IMAGE_ID" run \
  --config test/vitest/vitest.ui-e2e.config.ts --configLoader runner \
  ui/src/e2e/command-palette-catalog.real-gateway.e2e.test.ts
```

该适配器需要 Linux、现有的无根 Podman 安装及其本机 init 帮助程序（通常为 catatonit）、签出本地 `pnpm install --frozen-lockfile` 依赖项以及与映像兼容的本机 Node 和 pnpm 可执行文件。将与`package.json`匹配的本机pnpm可执行文件放在`PATH`上，或者通过现有的`npm_execpath`环境变量选择它； Corepack/download 填充程序不是脱机可执行文件。该映像必须已包含 `/ms-playwright` 下安装的 Playwright 软件包所需的 Chromium 修订版，包括其无头 shell 和系统库。运行程序在启动测试命令之前检查版本并启动 Chromium。此初始适配器不支持 SELinux 标记的主机：它在创建容器之前拒绝，而不是重新标记共享主机文件或禁用强制执行。使用已支持的隔离运行器而不是更改主机安全策略。

它在同一个无网络命名空间中运行 Vitest、Chromium、提供者装置和测试网关。 Podman 的 init 拥有 PID 1，因此分离的测试子项在启动器退出后就会被收获； Node 入口点仍然拥有测试调用和清理。主机代理设置保持不变；主机凭据、网关状态、Git 元数据和私有暂存不会暴露给容器。没有公开的端口或外部网络访问。缺少先决条件会导致安装指导失败，而不是安装软件包或削弱隔离。

使用普通的本地配置，而不是 CI-only 预构建的配置。适配器使用标准测试选择在容器内准备 `qaRuntime` 工件，以进行使用构建运行时的测试，包括需要时的私有 QA 工件。仅源选择无需支付运行时构建费用，并保留 8 GiB 容器内存上限。准备构建工件的运行使用有界的 16 GiB 上限来容纳编译器堆和本机构建内存； CPU，网络、文件系统和进程限制不变。对于标准 Control UI E2E 配置，它在允许测试之前保留了私有 QA `ciArtifacts` 构建；仅后端准备就绪并不意味着仪表板资产已准备就绪。主播直播网关神器入场不变。隔离源快照使用跟踪的工作树文件，包括暂存的新文件；在选择之前进行新的测试。调用过程中保持源和依赖不变，并保持依赖安装分开。初始界面支持精确跟踪的测试文​​件、跟踪的配置和控制台报告器；它不会从一次性快照中导出文件。此路线不适合实时提供者测试或必须联系自己容器之外的服务的测试。

### <a id="e2e%3A-openshell-backend-smoke"></a><a id="e2e-openshell-backend-smoke"></a> E2E：OpenShell 后端冒烟测试

- 命令：`pnpm test:e2e:openshell`
- 文件：`extensions/openshell/src/backend.e2e.test.ts`
- 范围：
  - 复用一个处于活动状态的本地 OpenShell 网关
  - 使用临时本地 Dockerfile 创建沙箱
  - 在真实 SSH 上练习远程和默认镜像 OpenShell 后端
  - 创建隔离的非默认 OpenShell 工作区和自定义工作区根
  - 验证嵌套镜像文件写入并排除主机 Git 元数据和挂钩
  - 通过沙箱 fs 桥验证远程工作空间的文件系统操作
- 预期：
  - 仅选择性启用；不属于默认的 `pnpm test:e2e` 运行范围
  - 需要本地 `openshell` CLI 以及正常工作的 Docker 守护进程
  - 需要处于活动状态的本地 OpenShell 网关及其配置源
  - 使用隔离的`HOME` / `XDG_CONFIG_HOME`，然后在删除测试工作区之前等待持久沙箱不存在
  - 报告清理失败，包括失败的库存查询；它不会重试数据库错误
- 有用的覆盖：
  - `OPENCLAW_E2E_OPENSHELL=1`：手动运行更广泛的 e2e 测试套件时启用该测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell`：指定非默认的 CLI 二进制文件或包装脚本
  - `OPENCLAW_E2E_OPENSHELL_CONFIG_HOME=/path/to/config`：将已注册的网关配置暴露给隔离测试
  - `OPENCLAW_E2E_OPENSHELL_HOST_IP=172.18.0.1`，用一个显式 Docker 网关地址及其现有的 `/32` 后缀替换主机策略装置的默认范围

### <a id="live-(real-providers-%2B-real-models)"></a><a id="live-real-providers-+-real-models"></a> Live（真实提供方 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`test/vitest/vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`、`test/**/*.live.test.ts` 以及 `extensions/` 下的捆绑插件实时测试
- 默认：通过 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 运行时：默认为Node； `OPENCLAW_VITEST_RUNTIME=bun pnpm test:live` 使用与 CI 测试通道相同的运行时选择器，为 Vitest 及其工作人员选择 `PATH` 上的 Bun 可执行文件。实时包装器仍在 Node 上运行。
- 范围：
  - “这个 provider/model 今天真的能用真正的信用吗？”
  - 捕获提供方格式变更、工具调用差异、身份验证问题和速率限制行为
- 预期：
  - 不是 CI- 设计稳定（真实网络、真实提供商策略、配额、中断）
  - 会产生费用 / 消耗速率限制额度
  - 优先运行缩小范围的子集，而不是运行“全部”测试
- 实时运行使用已导出的 API 密钥和预置的身份验证配置文件。
- 默认情况下，实时运行仍然会隔离 `HOME` 并将 config/auth 材料复制到临时测试家庭中，因此单元装置无法改变您真实的 `~/.openclaw`。
- 仅当你确实需要实时测试使用真实主目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 默认为更安静的模式：它保留 `[live] ...` 进度输出并使网关引导程序 logs/Bonjour 静音。如果您想要恢复完整的启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（特定于提供商）：使用 comma/semicolon 格式或 `*_API_KEY_1`、`*_API_KEY_2` 设置 `*_API_KEYS`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、 `GEMINI_API_KEYS`） 或通过 `OPENCLAW_LIVE_*_KEY` 进行每次直播覆盖；测试重试速率限制响应。
- Progress/heartbeat 输出：
  - 实时测试套件会将进度行输出到 stderr，因此即使 Vitest 控制台捕获处于安静状态，长时间运行的提供方调用也能显示为正在进行。
  - `test/vitest/vitest.live.config.ts` 禁用 Vitest 控制台拦截，因此 provider/gateway 进度线在实时运行期间立即流式传输。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型的心跳间隔。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整 gateway/check 心跳。

### <a id="prompt-cache-regression-coverage"></a> 提示-缓存回归覆盖率

完整版本验证在其默认稳定配置文件和完整配置文件中运行现有的 `live-cache` 套件。当选择 repo/live 覆盖范围时，Beta 版会运行它，包括浸泡或集中实时重播。要单独选择它，请使用 `rerun_group=live-e2e` 和 `live_suite_filter=live-cache`。其`provider`和`mode`输入选择交叉OS入门引导覆盖范围；他们不会更改此缓存套件中的提供程序。

该套件首先针对存储的提供者基线运行 `pnpm test:live:cache`，然后运行共享传输提示前缀工具和重点实时代理场景：

```sh
node --import ./scripts/tsx.mjs scripts/e2e/anthropic-cache-live.mts
OPENCLAW_LIVE_CACHE_TEST=1 OPENCLAW_LIVE_ANTHROPIC_CACHE_MODEL=claude-sonnet-5 \
  pnpm test:live src/agents/embedded-agent-runner.cache.live.test.ts --testNamePattern 'release prompt-prefix gate'
```

运输harness采用Node。存储的基线和代理场景遵循咨询 Bun 运行中选定的测试运行时。

该harness需要 `ANTHROPIC_API_KEY` 和 `OPENAI_API_KEY`。当 `OPENROUTER_API_KEY` 存在时，它还会检查 OpenRouter；缺少可选凭证会忽略该路由。 CI 版本通过其现有的现场测试秘密提供了这些。 `--provider anthropic`、`--provider openai` 或 `--provider openrouter` 选择单个提供商进行诊断。 `--mock` 使用本地合成 HTTP/SSE 响应并仅证明请求构造，而不证明提供者缓存命中。

每条传输路线都会发出四个请求：一个初始的长对话、两个工具结果延续以及一个新的用户轮流。它检查序列化前缀稳定性、提供者缓存身份和缓存令牌使用情况，同时将瞬态运行时上下文移至可缓存历史记录之外。失败通过摘要识别第一个不同的段；输出不包含提示内容。使用记录包括输入、输出、缓存读取和写入以及请求间隙，因此提供程序可用性和缓存未命中仍然可以与更改的输入区分开来。

实时代理场景设计为通过 Anthropic 消息和 OpenAI 响应各运行四轮。 Anthropic场景需要历史系统消息模型；发布CI选择`claude-sonnet-5`。该装置激活根插件注册表，练习真实的 prepend/append 提示挂钩，并更新技能、时间上下文和运行时指令。在第四轮之前，它会清除内存中的提示投影，因此运行者必须从持久会话中对其进行补充，并关闭提供程序传输。 Anthropic 也会在其他转弯之前关闭传输。 OpenAI 保留它并每轮调用合成工具两次，使用相同的会话缓存密钥执行存储响应延续。其 2,048 个部分的起始前缀和大型工具结果可进行长时间对话。这些断言要求每个热请求重用至少 80% 的前面提示的令牌，保留有效前缀和缓存标识，并报告没有跟踪的缓存输入更改。 OpenAI的有效前缀包含继承的响应输出；它的比较忽略了 JSON 对象键顺序、辅助消息和函数调用上的可选提供程序项 IDs/status 以及仅响应的日志概率字段。呼叫 ID 和工具输出信封保持准确，并且传出请求正文保持不变。每个请求都会报告输入令牌、缓存令牌、缓存比率和请求间隙。这涵盖了通过嵌入式代理管道保留的 HTTP 延续和冷传输重播；它不会重新启动网关进程。

请求连续运行，不会故意延迟或重试；这些场景要求间隔时间低于 30 秒。三项检查中的每一项在三十分钟的工作中都有八分钟的外部截止日期。传输装置的起始输入接近 8,000–10,000 个令牌，每个请求的输出上限为 512 个令牌。其两条 Anthropic 路由加上 OpenAI 发出 12 个请求；可选OpenRouter增加了四个。对于运输场景，使用大约 $0.50 的规划估算。代理场景发出 16 个请求：12 个 OpenAI 工具循环请求和 4 个 Anthropic 请求。其较大的 OpenAI 前缀成本高于运输夹具；在预算或记录运行时使用报告的令牌计数和当前模型价格。实际计费取决于模型选择和缓存重用。这些是固定装置描述，而不是支出上限。存储的基线检查有其自身的成本。

传输检查使用合成会话；实时代理场景添加了持续的提示投影补水。单独的 `pnpm test:docker:live-anthropic-cache` 通道检查 stable/full Docker `core` 块中已安装候选包的 Anthropic 构建器。有关该包边界，请参阅 [Docker 缓存证明](/reference/test/docker#anthropic-runtime-context-cache-regression)。

### <a id="advisory-bun-release-checks"></a> 咨询 Bun 发布检查

维护人员可以使用 `test_runtime=bun` 在 `main` 上调度 `openclaw-live-and-e2e-checks-reusable.yml`。手动输入提供`node`和`bun`；可重用的调用者接受与字符串相同的值。 Node 保留默认值，包括现有的发布检查和完整发布验证调用者。可重用的 Bun 调用者必须使用与被调用工作流相同的存储库和修订版，以便 pin 来自该确切的工作流源。直接调度自动满足此要求。

对于正常稳定版本repo/live选择：

```sh
target_sha="$(gh api repos/openclaw/openclaw/commits/main --jq .sha)"
gh workflow run openclaw-live-and-e2e-checks-reusable.yml --ref main \
  -f ref="$target_sha" -f test_runtime=bun -f release_test_profile=stable \
  -f include_repo_e2e=true -f include_live_suites=true \
  -f include_release_path_suites=false -f include_openwebui=false \
  -f gateway_repo_e2e_use_github_hosted_runners=false \
  -f allow_unreleased_changelog=true
```

Bun 作业被标记为建议性的，并通常在单独的运行中报告故障。它们不会替换 Node 发布证据或添加 PR 作业。可信准入检查包括 `scripts/lib/openclaw-bun.json` 及其来自工作流程修订版的临时帮助程序。现有的 `setup-test-bun` 操作会安装该引脚一次，并通过工件 ID 与测试作业共享其可执行文件。仅测试步骤选择Bun；依赖项安装、构建准备、打包和工作流工具保留其当前的工具链。

选择器涵盖本机实时分片、实时缓存检查、网关分片、代理插件网关、完整的 UI E2E 套件（包括真实网关文件）和 OpenShell Vitest 主机。当 `full` 配置文件选择时，本机媒体分片支持相同的选择器。单独所需的 PR CI 真实网关作业仍受其现有运行时策略的约束，并且不属于此发布通道。

Docker live/model、打包产品、升级和 OpenWebUI 通道保留 Node：它们的映像和启动器拥有容器运行时，因此主机 Vitest 选择器不会切换它们。外部提供商 CLI 和 OpenShell 服务也保留自己的运行时。这些通道在选择时仍会运行，但不符合 Bun 的要求。使用包含运行时感知的实时启动器和 E2E 启动器的当前目标；较旧的冻结发布目标可能不支持此咨询选择器。

## <a id="which-suite-should-i-run%3F"></a><a id="which-suite-should-i-run"></a> 我应该运行哪个测试套件？

遵循[防伪政策](https://github.com/openclaw/openclaw/blob/main/.agents/skills/openclaw-testing/SKILL.md#proof-policy)。首先瞄准被触摸的主人。网关网络，WebSocket，配对合约有E2E通道； provider/tool-calling 诊断可能需要缩小实时车道。上述套件描述确定了其范围和先决条件。

## <a id="live-(network-touching)-tests"></a><a id="live-network-touching-tests"></a> Live（涉及网络）的测试

对于实时模型矩阵、CLI 后端冒烟测试、ACP 冒烟测试、Codex 应用服务器测试工具，以及所有媒体提供商的实时测试（Deepgram、BytePlus、ComfyUI、 图像、音乐、视频、媒体测试工具），还包括实时运行的凭据处理

- 请参阅[测试实时测试套件](/help/testing-live)。有关专门的更新和插件验证清单，请参阅[测试更新和插件](/help/testing-updates-plugins)。

## <a id="docs-sanity"></a> 文档检查

文档编辑后运行文档检查：`pnpm check:docs`。当您还需要页内标题检查时，运行共享发布解析器的锚点审核：`pnpm docs:check-links:anchors`。当可靠的源线路不可用时，诊断显示 `unknown`。

## <a id="offline-regression-(ci-safe)"></a><a id="offline-regression-ci-safe"></a> 离线回归（CI-safe）

这些是没有真实提供方的“真实流水线”回归：

- Gateway 代理准入（具有模拟 OpenAI 提供程序的真实网关）：`src/gateway/gateway.test.ts`（情况：“通过 ws 接受网关代理请求并返回运行 id”；检查接受情况、运行 ID 和中止响应）。
- Gateway 向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制执行身份验证）：`src/gateway/gateway.test.ts`（案例：“通过 ws 运行向导并写入身份验证令牌配置”）
- Prompt/KV-cache 请求前缀：`src/agents/embedded-agent-runner.prompt-cache.test.ts` 驱动承认的代理转而反对捕获 Anthropic 消息、Claude 历史系统消息、OpenAI 聊天完成和 OpenAI 响应的模拟提供者。
- 用户重放和尝试失败持久性：`src/agents/embedded-agent-runner/run/attempt-prompt-submit.projections.test.ts`、`src/agents/session-tool-result-guard.transcript-events.test.ts`和`src/agents/sessions/agent-session-responses-eof.test.ts`在其所属边界练习记录的用户内容、仅附加错误和retry/reopen前缀。
- Gateway 聊天、完成和重新启动前缀：`src/gateway/gateway.prompt-cache.test.ts` 使用经过身份验证的 `chat.send`、真实的 `sessions_spawn` 子项及其完成、进程内网关服务器 stop/start 以及同一会话中的另一个 `chat.send`。它将父会话的请求和非空缓存键与子会话的请求分开进行比较。

提示缓存装置驱动真正的嵌入式代理管道、转录存储和提供程序序列化器运行十次。它激活根插件注册表并直接在禁用工具搜索的情况下公布其工具。它还在提供者序列化之前比较保留的用户信封摘要，包括运行时载体，涵盖时间戳、幂等性密钥和连线序列化程序省略的元数据。五个工具结果分别被截断为约 16,000 个字符；它们加在一起超过了 65,536 个字符的总预算。预期的不变量是已发送的结果字节在该压力下保持冻结，而不是删除受保护的批次。真实的 prepend/append 挂钩和仅模型替换提示练习成绩单投影。指令刷新在 OpenAI 响应和 Claude 的历史系统消息路由上运行；旧的聊天完成和 Anthropic 消息路由保留其初始指令。

该场景在前两个回合发送图像，使真实的 MCP 会话过期，并在其重新连接被阻止时捕获一个回合，引导第六个回合，并在第七个回合之前重新打开持久运行器状态。第八回合组装并重播合成类型的子代理完成事件；它不会产生子代理或证明公告传递或授权。源自通道的历史限制在第九回合跨越。响应路线还练习了部分辅助错误，然后是新的转弯。捕获包括系统、工具、历史记录和缓存标识。前缀比较仅允许在第九回合删除准确的历史前缀；先前发送的图像块保持不变。在修剪边界处，旧版聊天完成将相同的运行时事实从退休的第一用户重新定位到保留的第一用户。旧消息可以刷新其识别的瞬态运行时上下文，包括日期事实和公告。该装置比较通过最后一个缓存断点的所有历史记录，并拒绝任何包含瞬态运行时上下文的断点，包括在转向期间。其他三条路线比较了其完整保留的历史。每个其他保留的字节必须保持相同。失败会识别第一个不同的段和 JSON 字段以及摘要和长度，但不打印内容。

响应装置保留其传输并对提供者存储的响应上下文进行建模。它验证第一个工具延续发送了五个新工具输出、引用已完成的响应并保留其缓存密钥。前缀比较包括该响应继承的输入和输出，因此较小的延续主体无法隐藏更改的对话前缀。隐式输出省略提供程序项 ID 和函数调用状态以匹配完整重播；呼叫 ID、内容和原始传入请求正文保持准确。

承认代理矩阵重新打开会话数据库并清除内存中的提示状态，而无需启动网关套接字服务器。网关伴侣在完成和最终聊天轮之间关闭并启动其真实服务器，保留相同的状态和配置并重新连接经过身份验证的客户端。这涵盖了一个测试过程中的 RPC、内部调度和服务器重启边界；它不会重新启动 OS 进程。网关同伴使用实际的子生命周期和私有父完成，而承认代理矩阵提供合成类型的完成事件。两场比赛均未发布外部公告。这些断言定义了离线回归合约；模拟令牌的使用并不是提供程序缓存重用的证据，这需要成功的实时运行。
