---
summary: "重点本地证明、核心测试命令和可选的完整本地运行"
title: "在本地运行测试"
read_when:
  - "您正在自己的机器上运行或修复测试"
  - "您需要集中的本地证明或明确需要的完整本地运行"
---

## <a id="routine-local-order"></a> 常规本地顺序

1. 对于已变更范围的 Vitest 证明，使用 `pnpm test:changed`。
2. 对于单个文件、目录或显式目标，使用 `pnpm test <path-or-filter>`。
3. 仅当你有意需要完整的本地 Vitest 测试套件时，才使用 `pnpm test`。

存储库包装器将普通的未经过滤的网关服务器运行模式选择进行分区，并将全套计划扩展为每个进程最多 50 个测试文件。随着库存的增长，这会限制非隔离模块图，而不会更改工作线程并发性、堆限制或单个文件边界。 Raw Vitest 和现有的单次调用选择（例如显式目标、覆盖范围、报告输出、保释和监视模式）保留其现有行为。

扩展的全套套件将基础架构和主机拥有的 SQLite 测试拆分为最多 64 个文件的批次。每个批次都将孤立的叉子工人保留在现有的全套工人预算内。重点选择和观看模式保留其通常的路线。

网关配置标记为在开始之前排除其他测试计划，并在接受后续计划之前完成。这适用于全套运行和显式 `OPENCLAW_TEST_PROJECTS_PARALLEL` 覆盖以及自动精确目标调度。普通计划保留其配置的并行性。

创建实际托管工作树的测试必须满足 [ 容量和磁盘空间要求 ](/concepts/managed-worktrees#capacity-and-disk-space)，包括可执行安装脚本的额外余量。在整个跑步过程中保持该空间可用。

项目运行程序打印单个 `--help` 或 `-h` 请求的包装器使用情况。复合请求（包括 `--help --no-help`）遵循本机 Vitest 选项语义。

现有的 UI 目录目标的范围仅限于该目录，包括与显式 E2E 测试文件组合时。测试保留其自己的共享、隔离或浏览器通道。 UI source/support-file 需要整个通道覆盖的目标（例如共享样式或设置文件）仍然使用更广泛的后备；当您想要有界运行时，请使用目录或显式测试文件。

当一次性路由运行仅针对显式测试文件路径时，每个选定的 Vitest 调用必须发现至少一个测试文件。即使通道通常允许空运行，排除每个选定的文件也会失败。要有意允许该结果，请使用 `pnpm test <test-file-path> -- --passWithNoTests`。使用 `--passWithNoTests=false` 明确要求非空发现。更广泛的选择器和源自源的选择保留其通道默认值。

通过 `scripts/run-vitest.mjs` 的显式 `--config` 运行保持其更严格的命名文件策略，并且不允许空命名文件运行。插件 `--allow-no-tests` 和 `--allow-empty-after-exclude` 控件未更改。

Codex 和其他 linked/sparse 工作树可以运行本地测试和检查。工具需要准备好依赖项；它不会创建到主要结帐的隐式链接。保持任何现有借用安装不变，而另一个任务使用它。在正常的依赖项协调之前，源安装的 `pnpm:devPreinstall` 检查会拒绝 checkout-root 模块目录及其 `.pnpm` 目录中的借用链接。它不会检查每个工作区包的依赖关系或锁定路径以防止并发替换； `--ignore-scripts` 会跳过它，并且不会彻底验证备用 pnpm 目录设置。当依赖项准备好后，使用上面的普通命令。为了避免 pnpm 的包管理器针对现有共享安装进行预检，请使用这些直接的 Node 工具：

- 有依赖已就绪时的有界聚焦证明： `node scripts/run-vitest.mjs <path-or-filter>`。
- 更改typecheck/lint/guard证明：`node scripts/check-changed.mjs`。

新源从 pnpm 存储安装克隆包文件，当文件系统无法克隆时回退到副本。因此，单独的签出保留独立的文件元数据：在其他地方安装依赖项无法通过共享硬链接更改活动编译器输入的修改历史记录。现有的硬链接安装不会被最新的 `pnpm install` 转换；使用新的任务拥有的结帐并安装以进行隔离证明。当其他任务使用某个安装时，请勿重新安装借用的依赖项或替换该安装。

对于Control UI路由测试，运行`node scripts/run-tsgo-core-test-shards.mjs ui`检查夹具类型； `node scripts/run-tsgo.mjs -p tsconfig.ui.json` 检查生产 UI 代码并排除测试。根据加载程序所需的功能键入路由装置，而不是将部分装置断言为完整的应用程序上下文。在生命周期测试中保留真正的选择功能，以便代理范围更改和订阅清理遵循应用程序行为。

对于远程环境证明，直接调用`node scripts/crabbox-wrapper.mjs`。避免在链接工作树中使用本地 `pnpm crabbox:run`，因为 pnpm 可能会在远程包装器启动之前协调依赖关系。

## <a id="core-commands"></a> 核心命令

本地测试和 `pnpm dev` 默认为固定的 OpenClaw Bun 叉。编排和构建准备仍需要 Node 24.16+ 或 Node 26.1+。较旧的 Node 绑定可以在嵌入的 NUL 字符处截断 SQLite TEXT 值。

要比较 Node 和 Bun 上的相同 Vitest 选择，请使用现有包装器：

```sh
OPENCLAW_VITEST_RUNTIME=node pnpm test <path-or-filter>
OPENCLAW_VITEST_RUNTIME=bun pnpm test <path-or-filter>
```

运行程序使用 `scripts/stage-openclaw-bun.sh` 自动暂存由 `scripts/lib/openclaw-bun.json` 固定的构建，从而验证发布校验和。它重用了 `${XDG_CACHE_HOME:-~/.cache}/openclaw/bun/<tag>/<platform>-<arch>` 处经过验证的每用户缓存。设置 `OPENCLAW_BUN_PATH` 以显式覆盖 Bun 可执行文件。运行时选择适用于实际的 Vitest 进程和工作线程，同时保留 Node 用于编排和编译器准备。在 Node 完成构建准备后，源运行器 CLI 装置也会使用选定的运行时。这不使用 Bun 的本机测试运行器。设置 `OPENCLAW_VITEST_RUNTIME=node` 以强制 Node，或设置 `bun` 以要求 Bun。如果没有显式选择，CI 保留 Node（`CI` 为非空且不是 `false`）。当 CI 选择 Bun 时，运行程序将在 PATH 上使用工作流配置的 `bun`，而不暂存本地缓存，除非 `OPENCLAW_BUN_PATH` 显式覆盖它。 Windows 和没有固定工件的平台会回退到 Node，没有可用缓存分叉的离线机器也是如此。跑步者打印一张通知并注明原因；明确选择 Node 会使其静音。如果其可执行文件不可用，则显式 Bun 选择将失败。在macOS、Bun测试运行时选择SQLite就像独立的Bun安装并拒绝Apple的系统库；参见[SQLite库选择](/install/bun-compatibility#sqlite-library-selection)。对于 Rosetta 下的 x64 Bun，使用 `scripts/build-mac-sqlite.sh universal <dir>` 构建固定库并设置 `OPENCLAW_SQLITE_LIBRARY=<dir>/lib/libsqlite3.dylib`。

对于 CI Control UI 比较，请在 Node 上运行完整选择，然后在 Bun 上运行：

```sh
OPENCLAW_NODE_TEST_CONFIGS_JSON='["ui/vitest.config.ts"]' \
OPENCLAW_NODE_TEST_VITEST_ARGS_JSON='["--maxWorkers", "3"]' \
OPENCLAW_CI_TEST_RUNTIME_POLICY=dual \
node --import tsx scripts/ci-run-node-test-shard.mts
```

两次传递都包括保留断言，它使用运行时中立的垃圾收集和 WeakRef 检查。仅在 Bun 和 `OPENCLAW_VITEST_RUNTIME=bun` 上运行完整的 UI 选择。

测试流程及其 CLI 固定装置使 Sparkplug 基线编译保持启用状态，但同步运行。这可以避免 Node 24 关闭死锁，即后台编译器等待主线程垃圾收集，而 `process.exit` 加入该编译器。共享 Node 参数策略拥有此仅测试缓解措施；生产 CLI 退出行为、断言和截止日期保持不变。

脚本可擦除性门使用 Node 的仅剥离解析器，包括在 Bun 下运行包检查时。它选择已安装的 Node 运行时并跳过 Bun 的 `node` 填充程序。需要 `node:module.registerHooks` 或 `stripTypeScriptTypes` 的维护者工具测试也会为其子工具显式选择 Node。使用 `test/helpers/node-toolchain.ts` 中的 `requireNodeTool("node")` 和 `stripNodeTypeScriptTypes`，它们共享 Node-selection 所有者，同时将 Vitest 工作线程保留在选定的测试运行时上。

隔离的本机工作线程和子进程装置使用 `test/helpers/native-module-mock.ts` 中的 `mockNativeModuleExports` 在任一运行时进行受控模块导出。模拟会一直持续到那个孩子退出为止。在注册替换之前捕获原始调用函数，因为 Bun 更新现有模块命名空间绑定。

测试工具链固定稳定的 Vitest `5.0.3`，包括其浏览器和覆盖率包。对于订购的套件，请使用 `describe(name, { concurrent: false }, callback)`。等待异步断言，将 `vi.mock`/`vi.hoisted` 保留在模块范围内，并执行您在测试中断言的模拟调用的操作。 OpenClaw 设置 `clearMocks: false`，因此设置和 `beforeAll` 调用将被保留。根据需要显式清除或重置每个断言拥有的模拟操作。跨套件的名称模式使用 `suite > test`；原生 JSON 保留其空格连接的 `fullName`，因此证据读取器匹配 `ancestorTitles` 加上 `title`。

文件系统转换缓存使用`test.fsModuleCache`和`test.fsModuleCachePath`；现有的 `OPENCLAW_VITEST_FS_MODULE_CACHE` 和 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH` 控件保留其所有权并禁用行为。缓存密钥插件使用 `defineCacheKeyGenerator`。 jsdom 通道通过 `deps.optimizer.client` 一起优化 Lit 及其导出的子路径。 CodeMirror 和 Lezer 保留在 Vite 的模块图中，因此编辑器类和解析器属性保留一个依赖项标识。配置 `NODE_COMPILE_CACHE` 后，测试启动器会为 Vitest 及其工作人员保留它。 Vitest 在 V8 和自定义覆盖提供程序的工作进程及其子进程中禁用字节码缓存；显式 `NODE_DISABLE_COMPILE_CACHE=1` 仍然禁用整个调用的缓存。内联项目继承了 Vitest 5 中的根配置，包括串联设置和包含数组。四个 UI E2E 资源项目声明为 `extends: false`，因为每个项目都提供完整的库存和设置。

维护的 JavaScript 工具包装器和根包命令使用 tsx 的 ESM 条目通过 `scripts/tsx.mjs` 加载 TypeScript。这保留了已编译的 ESM 插件的本机加载及其仅导入依赖项，包括通过 `require()` 加载时。源 TypeScript 导入和 tsconfig 路径别名仍然可用。

这些启动器保留 tsx 的进程内转换缓存和 Node 的模块缓存。它们在加载程序启动之前跳过 tsx 的共享磁盘缓存，并且子工具继承该策略。此缓存策略不会清除现有的临时目录、Node 或 Vitest 缓存或其他全局缓存。独立的 `pnpm ui:build` 以本机方式启动，并直接使用 Node 运行其构建后验证器。这些验证器不会加载 tsx 或在调用 shell 中需要 `TSX_DISABLE_CACHE`。这些启动器之外的原始外部 `tsx` 和 `node --import tsx` 调用保持不变。

Node Vitest 工作人员还为每个工作人员预加载一次 `scripts/tsx.mjs`。 Vitest 仍然拥有测试模块模拟，而本机插件 SDK 导入使用 Node 的源模块图，具有 TypeScript 语法和 `.js`-to-`.ts` 分辨率。 Bun 使用其本机 TypeScript 加载程序。这使得源主机测试不再依赖 Jiti 来评估主机 SDK 的另一个副本。

调度程序拥有的项目在 macOS 和 Linux 上运行，在专用插槽内重用文件系统转换，包括混合配置的串行运行。每个 Vitest 配置都保留单独的目录。通过预检、重试和验证 child/group 完成，槽位保持拥有状态；不确定的清理会使其退役。相同配置的串行运行无需调度程序分配、显式隔离的缓存路径、监视运行，并且 Windows 保留其现有的缓存所有权。并发调用仍然需要单独的缓存根。

Control UI 构建报告大小预算但不强制执行。构建后运行 `pnpm ui:check-performance` 以强制执行绝对预算，或运行 `pnpm ui:check-performance:base <base-commit-sha>` 以使用相同的工具链构建和比较两个版本。请参阅 [ 控制 UI 尺寸预算](/ci/pipeline#control-ui-size-budgets)。

### <a id="source-tests-and-subprocess-builds"></a> 源测试和子流程构建

非手表运行通过 `pnpm test` 或 `scripts/run-vitest.mjs` 将 Vitest 测试和运行时父级保留在 TypeScript 上。导入已声明的子流程入口点会将固定测试入口集及其工作区依赖项编译到 `.artifacts/vitest-workers/` 下的一个新调用目录中。

声明的应用程序条目作为普通 Node JavaScript 运行，无需 TypeScript 加载程序：SQLite 只读快照、数据库验证、Tailscale 路由所有权、服务中继、其 POSIX 和 Windows 锚点、内存插件的KNN 子级、会话记录存档和核对工作人员，并管理 GitHub 凭证解析。同一代还将假后端 TUI 装置的四个运行时根编译在一起：真正的 TUI、嵌入式回复生成器、回复元数据读取器和出站标准化器。共享块保留其模块和 WeakMap 身份。准备好的 TUI 夹具编译为 `.mjs` 并作为 JavaScript 运行，无需 TypeScript 加载程序。直接源灯具仍然是 `.mts`：Node 使用 `--import tsx` 启动它们，而 Bun 本地处理它们的语法。会话身份 PTY 测试加载真实的提供者策略，因此其运行时先决条件在 Vitest 工作线程启动之前准备好构建的主机 SDK。现有的包构建入口路径和 Vitest 源父级保持不变。 CLI 分叉恢复回归还将真实的 CLI 条目及其并发重新绑定的会话访问器和绑定帮助器编译在一起。两个进程使用相同的运行时图，同时保留持久写入竞争和进程退出断言。使用捆绑插件的 Doctor 处理输出测试禁用了在每次测试运行时在一个延迟创建的包固定装置中编译 CLI 的重用，从而对固定装置拥有的资产和每个场景的状态进行真正的 UI 检查。独立运行和监视运行在同一装置内使用实时源。

广播输出覆盖一起准备其消息帮助器和退出终结器，保留命令替换并在夹具清理之前加入其进程树。

独立的 Doctor 配置脚本还共享准备好的配置流、健康写入器和安装索引模块。每个案例仍然启动一个具有单独状态的新流程；独立运行和监视运行解决了原始 TypeScript 入口点。

模型目录、Codex 目录页面和会话模型上下文工作线程也使用此编译生成。模型目录工作人员仍然属于他们准备好的模型一代；上下文读取保留其串行工作池。插件 source/built 选择仍然独立于工作器编译。其他工作线程条目和任意源 CLI 装置仍然在此声明的集合之外。

代理数据库模块身份测试共享已编译的主机和 SQLite SDK 条目，同时强制对 SDK 进行单独的插件转换。它的独立运行和监视运行保留了当前源的一次性构建，因为此回归专门检查打包图。两种模式都使用相同的断言和子进程截止时间。

会话标题和子链接保留测试声明其标题阅读器、会话实用程序和列表根源在同一代。每个新的堆测量子进程都运行其 JavaScript，而不会在 TypeScript 导入上花费其执行期限。

自动分类进程装置共享这一代用于准入、故障处理、执行、进程标识和重生检查。编译在准备截止日期开始之前完成，因此孩子们加载准备好的 JavaScript。分离的帮助程序使用与已安装的包相同的密封租赁运行时。

已知的核心数据库工作人员使用者在测试过程开始之前准备调用的编译生成，包括当案例动态导入其工作人员声明时。选择使用现有的数据库工作人员清单并遵循 CLI 过滤器、排除项和包含文件。其他测试保留跨项目和分片的惰性准备。配置导入、列出测试、监视运行、自定义选择和不导入这些声明的小型测试不会急切地编译工作程序。导入声明的分片通过其现有的 Node IPC 通道请求外部运行器的单个构建；热切的消费者重复使用已完成的一代。静态导入在模块收集期间、夹具挂钩和准备截止日期之前获取它。每个需要声明的有限调用都会为这个固定的条目集付费；准备时间与子执行分开报告。运行程序启动一个短暂的本机 Node 或 Bun 编译器子级，并在将经过验证的清单返回给借用者之前加入它。编译器模块图存在于该子进程中，而不是长期存在的运行程序或 Vitest 工作程序中。没有分片可以选择不同的构建图或采用另一个调用的输出。外部运行程序保留生成，直到子进程关闭和进程组清理完成，然后在报告成功之前对其进行验证。验证使用有界异步 I/O 读取每个记录的输入和输出，从而使运行程序在大型关闭扫描期间保持响应。调用所有者在回复之前验证每个借款人的准备情况，并在所有借款人关闭后再次验证； Vitest 不会在每个分片内或在其并发池关闭期间重复这些扫描。独立的 Vitest 和监视运行保留源执行：编译、验证和工件删除需要存储库运行者的所有权。失去所有者或失败的构建会导致运行失败。在异步删除目录之前，处置会取消挂起的编译并将其与每个借用者和未完成的准备请求结合起来。 Signal 处理程序通过删除保持活动状态，即使大量代需要时间来删除也是如此。借用者完成不会等待编译，因此早期子退出可以到达该取消路径。不确定的编译器或借用者连接会保留生成并导致运行失败。异常终止也可能留下未使用的目录；后来的运行不再采用它。

每项准备工作均编译当前源代码； checkout `dist/` 既不是输入也不是后备。构建错误、缺失工件以及对记录的构建输入的更改都会导致运行失败。编译在施加资源限制之前包括本机子进程固定装置。除了始终捆绑的 OpenClaw 包之外，第三方依赖项仍然是外部的。 fs-safe 仍然是外部的，因此其本机加载程序从 fs-safe 自己的依赖范围解析可选平台包，包括嵌套的 pnpm 安装。编译后的工作人员使用相同的安装包；它们不复制本机二进制文件。 macOS、Linux 和 Windows 上的纯模式默认为 `auto`。无破坏的根移动需要本机支持； Windows 安全凭证读取需要匹配的帮助程序来进行描述符绑定的 ACL 检查。显式 `off`/`auto`/`require` 设置和编程配置保留其优先级。密封的便携式工作程序包仅使用受保护的 JavaScript 并显式禁用本机加载。

监视模式有意保留现有的实时源路径，包括 Node 子进程的 tsx 和 Bun 的本机 TypeScript 处理。它不会创建准备好的生成，因此新的子启动会读取当前源，而不是重用已编译的快照。现有的 Vitest 监视依赖性跟踪仍然确定测试何时重新运行。

测试包装器运行以简短的 `[test] passed|failed|skipped ... in ...` 摘要结束； Vitest 自己的持续时间线保留了每个分片的详细信息。

在子进程、清理和报告发布解决之后，失败的调用以 `[test] FAILED (exit N)` 行结束。直接 `run-vitest.mts` 调用使用 `[vitest]` 代替。嵌套运行程序保留其诊断和退出状态；顶层CLI拥有最后的故障线。成功的运行不会发出失败预告片。

| 命令                                           | 它的作用                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                                       | 显式 file/directory 目标通过范围内的 Vitest 通道进行路由。无目标运行是全套证明：固定分片组扩展到叶配置以进行本地并行执行，并在开始之前打印预期的分片扇出。扩展组始终扩展到每个扩展分片配置，而不是一个巨大的根项目进程。 |
| `pnpm test:changed`                               | 廉价的智能更改测试运行：来自直接测试编辑的精确目标、同级 `*.test.ts` 文件、显式源映射和本地导入图。 Broad/config/package 更改将被跳过，除非它们映射到精确的测试。                                                                                                                     |
| `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` | 显式的广泛变更测试运行；当测试 harness/config/package 编辑应回退到 Vitest 更广泛的更改测试行为时使用。                                                                                                                                                                                                              |
| `pnpm test:force`                                 | 释放已配置的 OpenClaw 网关端口（默认 `18789`），然后使用隔离的网关端口运行完整套件，这样服务器测试就不会与正在运行的实例发生冲突。                                                                                                                                                                          |
| `pnpm test:coverage`                              | 为默认单元车道（`vitest.unit.config.ts`）输出一份信息性的 V8 覆盖率报告；不强制任何覆盖率阈值。                                                                                                                                                                                                                   |
| `pnpm test:coverage:changed`                      | 仅针对自 `origin/main` 以来发生变更的文件进行单元覆盖率统计。                                                                                                                                                                                                                                                                                             |
| `pnpm changed:lanes`                              | 显示由相对于 `origin/main` 的差异触发的架构车道。                                                                                                                                                                                                                                                                            |
| `pnpm check:changed`                              | 运行本地更改的 formatting/typecheck/lint/guard 计划，包括针对选定路径的目标 Vitest 所有者测试。使用 `pnpm test:changed` 或 `pnpm test <target>` 获取与所涉及合同匹配的附加测试证明。                                                                                                                       |

当更改影响网关事件目录或常量、扫描的移动源、覆盖声明或防护、其执行帮助程序及其路由时，`pnpm check:changed` 还会运行移动协议事件覆盖防护。全车道检查也包括它。每个网关事件都必须有一个处理程序或针对每个移动客户端明确批准的非消费声明。要仅运行此防护，请使用 `pnpm check:protocol-coverage`。

对于本机应用程序更改，`pnpm check:changed` 使用平台范围来选择 lint：Android 选择 `pnpm android:lint`（Gradle ktlint 检查），而 Apple 应用程序更改保留 Swift lint。 Android-only 更改不选择 Swift lint 或其缺少工具通知。 Android framework/resource lint 和运行时测试仍然是单独的检查； Kotlin lint 不会取代它们。

执行 GNU `stat` 和 `readlink` 的远程文件系统装置仅在 Linux 上本地运行。共享的领先 `@` 文件工具场景还在每个平台上针对便携式仅限远程桥运行。本机 Python 帮助程序覆盖范围保持独立，包括 macOS；这些固定装置门不会限制 [SSH 后端的网关主机](/gateway/sandboxing#ssh-backend)。

发现真实捆绑提供程序运行时的测试在 `scripts/lib/vitest-build-prerequisites.mts` 中声明了该先决条件，包括 Telegram 贴纸模型选择。当地跑步者和 CI 在接纳工人之前准备这些工件。

<a id="local-pr-gate" />

## <a id="full-local-run-(only-when-explicitly-needed)"></a><a id="full-local-run-only-when-explicitly-needed"></a> 完全本地运行（仅在明确需要时）

PR CI 是宽门。在打开准备好的 PR 之前，对所涉及的代码运行集中测试以及有针对性的类型检查、lint 和格式检查。不要运行完整的本地套件来诊断失败的 PR CI 运行；请改用 `pnpm test:ci-failed <pr>`。

完整的本地命令仍然可用于明确需要的调查：

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

`pnpm check --base <ref>` 将线路上限、最大线路抑制和断言安全棘轮固定到 `HEAD` 和参考的合并基础上。本机 PR 门会从捕获的主快照中传递其候选者的分叉，因此即使共享的 `origin/main` 引用已过时，继承的主要更改也会保留其配额。其他检查阶段仍正常运行。

如果明确请求的完整本地运行失败，请使用 `pnpm test <path/to/test>` 隔离失败的测试并调查所有者；通过重播并不能证明修复。对于 PR CI 故障，阅读其发布的分类，修复新故障，运行 `pnpm test:ci-failed <pr> --run` 直到这些在本地通过，然后推送一次。预先存在的故障遵循 [ 故障表着陆规则 ](https://github.com/openclaw/openclaw/blob/main/.agents/skills/openclaw-pr-maintainer/references/landing.md#red-main-and-inherited-failures)。切勿为了追逐绿色而重新运行 CI。对于显式运行完整本地套件的内存受限主机：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`
