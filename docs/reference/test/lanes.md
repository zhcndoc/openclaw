---
summary: "Control UI、TUI、分机、网关和实时通道命令和灯具规则"
title: "Control UI、TUI 和 E2E 通道"
read_when:
  - "您正在运行或编写 Control UI、TUI 或扩展测试"
  - "您需要网关或实时 E2E 通道命令"
---

## <a id="control-ui%2C-tui%2C-and-extension-lanes"></a><a id="control-ui-tui-and-extension-lanes"></a> Control UI、TUI 和扩展通道

- **浏览器MCP合约：** `pnpm test:e2e:browser-mcp`安装固定的Playwright Chromium并启动配置的Chrome DevTools MCP 服务器通过 stdio，针对一次性浏览器配置文件。它涵盖本机操作、跨条件等待的引用、帧标签、导航策略检查以及通​​过 npm/pnpm 打包和离线 npm 安装保存修补的依赖项。路径过滤的 `Browser MCP contract` 工作流程运行此命令以进行 MCP 实现和依赖项更改。其 `contract-bun` 作业在固定的 Bun 分叉 （`OPENCLAW_VITEST_RUNTIME=bun`） 上运行 Chromium 合约文件，这是 macOS 和 Linux 桌面应用程序的唯一运行时。要验证候选服务器构建，请将 `OPENCLAW_BROWSER_MCP_TEST_COMMAND` 设置为其可执行启动器。启动器必须转发其参数并启用 `--experimentalVision` 进行协调操作； OpenClaw 提供端点和结构化内容标志。用该证明记录服务器 source/version。这些测试不会附加到用户的 Chrome 或需要模型凭据。
- **Control UI E2E：** `pnpm test:ui:e2e` 运行 Vitest + Playwright 通道，通常针对模拟网关 WebSocket。四个资源组保留两个执行阶段：`ui-e2e-bundled`和`ui-e2e-standalone`首先运行，总共最多有两个worker； `ui-e2e-serial` 和 `ui-e2e-serial-standalone` 则共享一名工人。两个捆绑包消费者惰性地共享一个临时 UI bundle/preview，直到调用结束。独立项目拥有自己的固定装置、源代码或定制服务器；仅选择独立套件可以避免共享捆绑包构建。每个选定的项目都会收到 Chromium 元数据，新的 E2E 文件默认为并行捆绑所有权。根配置保留完整的发现清单：`ui/src/**/*.e2e.test.ts` 加上 QA 实验室媒体转录和 OpenClaw- 委托真实网关套件。在 `ui/src/test-helpers/control-ui-e2e.ts` 中共享 mocks/controls。有些套件启动隔离的真实网关； `OPENCLAW_UI_E2E_SKIP_REAL_GATEWAY=1` 排除它们。 `pnpm test:e2e` 包括此通道，资源组没有额外的 CI 作业。仅当干净的 Linux/browser 奇偶校验是证明的一部分时才使用 Testbox/Crabbox。在链接的工作树中，`node scripts/run-vitest.mjs run --config test/vitest/vitest.ui-e2e.config.ts --configLoader runner ui/src/e2e/chat-flow.messaging.e2e.test.ts` 避免目标本地运行的 pnpm 依赖性协调。
- **Control UI 真实网关批准证明：** 针对具有模拟提供商的隔离网关检查默认和显式完全访问委派。在运行目标证明之前构建运行时：

  ```bash
  pnpm build qaRuntime
  node scripts/run-vitest.mjs run --config test/vitest/vitest.ui-e2e.config.ts \
    --configLoader runner extensions/qa-lab/src/control-ui-openclaw-delegation.real-gateway.e2e.test.ts
  ```

- **TUI PTY 测试：** `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts` 运行快速假后端 PTY 通道。 `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` 或 `pnpm tui:pty:test:watch --mode local` 运行较慢的 `tui --local` 烟雾，它仅模拟外部模型端点。 CI 在构建 `dist/` 后还设置了 `OPENCLAW_TUI_PTY_USE_BUILT_CLI=1`；仅当精确头部构建的工件已经存在时才使用该标志。断言稳定的可见文本或夹具调用，而不是原始 ANSI 快照。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有 extension/plugin 分片。重型通道插件、浏览器插件和 OpenAI 作为专用分片运行；其他插件组保持批处理。 `pnpm test extensions/<id>` 运行一个捆绑插件通道。
- **浏览器本机主机：** `node scripts/run-vitest.mjs extensions/browser/src/browser/extension-install.native-host.e2e.test.ts` 在 macOS 或 Linux 上针对具有合成安装状态的构建 dist 运行真正的本机消息启动器；它不会启动 Chrome 或网关。 Windows 跳过此 POSIX 过程证明，因为 [native 引导程序在那里使用手动配对 ](/tools/chrome-extension#requirements)。 E2E 业主在工人之前准备工件。对于已构建的候选者，请在命令前添加 `OPENCLAW_E2E_USE_PREBUILT_DIST=1` 前缀以重用它；缺失的工件无法通过测试。此案例属于 `pnpm test:e2e`，而不是浏览器源分片或非目标 `pnpm test` 单元套件。 Linux CI 在 `build-artifacts` 中显式运行它，并验证 JSON 报告，证明确切的指定测试已通过。工作流程仅跳过缺少此测试文件的冻结历史结账；该跳过是不可用的证据，而不是通行证或覆盖范围。
- 带有同级测试的源文件会优先映射到该同级测试，然后才回退到更宽泛的目录 glob。`src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的辅助文件编辑会使用本地导入图来运行导入它们的测试；当依赖路径明确时，不会对所有分片进行宽泛运行。
- Contract 目录目标扇出到其合约通道：`pnpm test src/channels/plugins/contracts` 运行四个通道合约配置，`pnpm test src/plugins/contracts` 运行插件合约配置，因为通用 `channels`/`plugins` 项目不包括 `contracts/**`。
- `auto-reply` 分为三个专用配置（`core`、`top-level`、`reply`），因此回复harness不会主导较轻的顶级 status/token/helper 测试。
- 选定的 `plugin-sdk` 和 `commands` 测试文件会通过专用的轻量流程运行，该流程仅保留 `test/setup.ts`；运行时开销较大的用例仍使用其现有流程。
- 基础 Vitest 配置默认使用 `pool: "threads"` 和 `isolate: false`，并在整个仓库的配置中启用共享的非隔离运行器。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。

### <a id="real-gateway-control-ui-fixture-lifetimes"></a> Real-Gateway Control UI 夹具寿命

使用 `ui/src/test-helpers/control-ui-browser-pairing.ts` 中的 `pairControlUiPage` 与隔离网关的 CLI 运行程序来验证每个新页面。它获取并使用新的 `dashboard --json` 浏览器切换并等待网关握手。仪表板配对链接是一次性的；不要将捕获的 URL 重复用于其他选项卡或浏览器上下文。将此操作作为 `preparePage` 传递到 `withControlUiRunInspector`，以便集合验证其自己的页面，同时保留调用者的聊天和草稿。重新加载使用浏览器的配对凭据。

使用`createControlUiE2eSuite`从`ui/src/e2e/control-ui-e2e-suite.test-support.ts`对于真正的网关浏览器装置。`suite.define(...)`拥有本机钩子。每个当地人`it`将其测试上下文传递给`suite.runScenario(context, ...)`，它拥有获取、测试主体以及在另一个案例开始之前的最终确定。通过以下方式获取和关闭浏览器上下文`suite.newBrowserContext`和`suite.closeBrowserContext`因此，较晚的收购和待完成的交易仍属于公司所有。

在 `createOpenClawTestState` 解析后立即保留测试状态，包括稍后配置写入、导入或启动失败时。保留最初的启动承诺，而不仅仅是他们的超时包装。在释放状态之前关闭所需的生产者。对于跨案例共享的生产者（如 MCP 和 auth 套件），请使用套件的 `resources.run`、`resources.close` 和 `resources.release` 回调，而不是独立的 `beforeAll`/`afterAll` 清理。资源获取遵循共享 server/browser 获取；拆卸连接案例和浏览器清理，关闭所需的生产者和服务器，并仅在这些关闭成功后释放状态。

失败或未加入的清理保留选择器和状态，阻止使用此套件所有者的后续案例，并让本机 Vitest 终止并加入隔离的分叉。不要吞下即将发生的故障或恢复未完成工作下的环境。终身所有者保留现有的挂钩、测试和操作预算。

网关关闭连接接收 WebSocket 工作和异步连接清理，包括在其生产者处使用 `trackAsyncWork` 注册的协作后台刷新。在主管传输或其他依赖项关闭之前，依赖于连接的工作端边车必须成功停止；失败会保留这些依赖关系并拒绝关闭。注册实际操作，而不仅仅是其响应或超时包装器；缓存驱逐不会结束其生命周期。 `withOpenClawTestState` 同样在释放状态之前加入注册的回调后代。 MCP 请求会观察调用者取消及其关闭工作所有者，因此关闭会在加入处理程序和处置传输之前取消挂起的请求。这些范围不会自动跟踪任意分离的工作或替换本机测试超时所有权。其他网关子系统可以保留记录的有界关闭行为，因此关闭并不能保证通用子系统或后代进程静止。

<a id="retained-mocked-control-ui-proof" />

### <a id="retained-control-ui-proof"></a> 保留Control UI证明

对于启动所有权更改，请在浏览器恢复迁移完成之前执行经过身份验证的 hello。项目和环境发现可以从hello开始；迁移完成不得重新获取这些目录或使已接受的启动无效。将变更所有者、进程重新启动和后期结果围栏分开覆盖。按密钥对重新渲染、键入和流式传输的存储读取进行计数，而无需记录凭证值。将路由有效负载字节和加载的模块闭包与计时分开进行比较； CSS 所有权变更还需要在新会话和聊天中保留屏幕截图和计算样式或几何检查。

迁移的模拟和真实网关浏览器证明使用新保留的目录。使用 `suite.artifactDir` 捕获场景，包括日志和使用情况，每次测试尝试延迟分配；独立捕获分配每次调用。 MCP 一致性和身份验证传输在浏览器可用性检查后都会分配一个套件拥有的目录，即使媒体捕获已禁用。验证传输屏幕截图等待有意义的内容和演示文稿所有者的有限入口或调整动画大小，而永久的后代活动仍在继续。启用捕获时，共享代理文件捕获帮助程序为每个模块评估分配一次，从而在模块的场景中共享该目录。 Node-only `ui/src/test-helpers/control-ui-e2e-artifacts.ts` 中的 `createControlUiE2eArtifactDir(scope, parentDir?)` 帮助程序打印实际分配的路径。明确的父母获胜；否则，它将使用修剪后的现有 `OPENCLAW_UI_E2E_ARTIFACT_DIR`，然后是存储库的 `.artifacts/control-ui-e2e` 父代。现有的特定于功能的目录控件和脚本输出参数选择父级，其下有独特的子级。显式屏幕截图文件名控件保留基本名称并打印重定位的路径。

保持捕获门独立于分配：`OPENCLAW_CAPTURE_UI_PROOF`、`OPENCLAW_UI_E2E_RECORD` 和输出存在门保留其现有含义。对于每次尝试捕获，请在场景执行期间分配或 `beforeEach`。将同一所有者传递给共享捕获助手，以便屏幕截图、报告和视频保持在一起。区分尝试中的阶段名称。在完成视频之前关闭浏览器上下文。

聊天加载性能真实网关套件在 `loading-evidence.json` 中记录历史请求、数据发布、提交的行模型和视觉静止的浏览器时间戳。滚动时窗格更新仍然可以显示旧的行模型，因此检查会在检查 50 毫秒之前验证保留行的索引是否前进，而无需转录突变、调整大小或滚动。分别记录该安静间隔的开始和确认；确认延迟不是应用程序延迟。非零 `lateChanges` 计数会使该静止样本无效。

使用没有捕获的普通运行来进行延迟比较。对于 `OPENCLAW_CAPTURE_UI_PROOF=1`，该套件还保留了屏幕截图、视频和 `history-pagination.cpuprofile`。分析和捕获会增加开销，并且 CPU 配置文件包括在分页计时器开始之前启动分析器。比较同一夹具和构建模式的重复运行；将旧版测试驱动程序墙计时与浏览器时间戳分开。

成功和失败的证据都会被保留。清理是手动的：仅删除您拥有并已完成审查的确切目录。重播之前切勿递归删除共享父级。一次性 build/media 装置和临时原始视频有自己的清理功能。新的捕获无法恢复被覆盖的证据；不要将重播描述为丢失文件的恢复。

超时诊断在现有 `OPENCLAW_UI_E2E_DIAGNOSTIC_DIR` 或默认超时目录下分配新的子目录。每个孩子都保留其原始 `failure.private.json` 报告并在本地捕获 `failure.private.png` 屏幕截图，以及列入许可名单的 `failure.public.json` 摘要。自动上传 CI 仅匹配 `failure-*/failure.public.json`；原始报告和屏幕截图保密。没有公开摘要的旧冻结目标不会产生匹配的上传，并且永远不会回退到原始捕获。

共享套件在耗尽路由并关闭拥有的浏览器上下文之前捕获本机测试超时。清理和待处理的测试主体加入相同的捕获，因此稍后的关闭页面错误不会取代原始的超时证据。

共享失败收集器为渲染器评估和屏幕截图捕获提供了五秒的预算。如果渲染器停止，它会记录不完整的诊断并返回，以便调用者可以重新抛出原始故障。浏览器响应较晚无法在预算到期后发布屏幕截图；测试操作截止日期和调用者拥有的浏览器清理保持不变。

共享套件 `withPage` 中的页面还在测试运行之前进行渲染器停顿检查。当渲染器错过读取截止时间时，公共摘要的 `rendererStall` 会按类型记录主线程繁忙时间和暂停的 JavaScript 堆栈，然后在另外三秒的预算内恢复页面。在响应读取之前结束的停顿在 `browser.longFrames` 中显示为至少一秒的帧及其脚本属性。两者都只保留包路径、位置、函数名称以及侦听器标记和事件名称；使用相同提交的捆绑构建源映射来映射位置。

私有 JSON 报告的 `ci.shardIndex` 和 `ci.vitestShardCount` 字段分别记录 `VITEST_SHARD_INDEX` 和 `VITEST_SHARD_COUNT`，如普通 CI 提供的那样。缺失值仍为`null`；手动和单独发布的 E2E 调用不会从 Vitest 的 `--shard` 参数推断此元数据。

Mantis 为安装日志、捕获尝试及其报告分配一个调用目录；构建器保留每次尝试的相对路径并拒绝覆盖现有报告。

仍保留单独的输出所有者，包括 `chat-attachment-read-lifecycle`。不要假设未迁移的所有者共享此保留保证。

### <a id="screenshots-during-chromium-recordings"></a> Chromium 录制过程中的屏幕截图

会话主机命令状态真实网关证明使用 `page.screenshot({ path })`，而不使用 `clip` 或 `fullPage: true`，保留其现有视口、记录大小、等待和动画选项。此路径已在 Linux 上通过 Playwright 1.62.1 和完整的 Chrome 进行验证，用于测试 151.0.7922.34.

其他记录所有者尚未通过此证明进行迁移或认证；有些仍然使用定位器或全页屏幕截图。这不是套件范围的捕获策略。在更改捕获模式之前，请验证每个所有者的屏幕截图内容和最终视频。使用经过验证的视口路径时，在浏览器外部裁剪任何仅包含元素的 PNG。裁剪无法从已损坏的录制中恢复丢失的内容。

在使用 Playwright、1.62.1 及其捆绑的完整 Chrome 的 macOS arm64 复制品中，用于测试 151.0.7922.34、`locator.screenshot()` 和 `page.screenshot({ clip })` 导致截屏帧较小。即使 PNG、DOM 几何和功能断言是正确的，该元素在视频原点处显示为灰色。 `fullPage: true` 不是一般的解决方法：大于视口的文档可能会生成带有灰色填充的缩小页面。未剪辑的视口捕获在相同的合成再现中保留了记录；其他浏览器版本和平台需要自己的验证。

这是上游捕获限制，而不是网关或上下文清理失败。 [Chromium 的屏幕截图处理程序](https://chromium.googlesource.com/chromium/src/+/151.0.7922.34/content/browser/devtools/protocol/page_handler.cc#1492) 临时更改共享视图大小并在捕获后恢复它；其截屏视频制作者可以观察中间表面。 [剧作家的录音机](https://github.com/microsoft/playwright/blob/v1.62.1/packages/playwright-core/src/server/videoRecorder.ts#L166) 用灰色填充尺寸过小的框架。关闭上下文会完成视频，但不会修复这些帧。不要过滤掉坏帧或更改 UI 行为来隐藏此限制。

验证每次捕获的最终视频内容，而不仅仅是其尺寸或定位器断言的成功。对于依赖项升级，使用包含偏移小元素的合成页面进行重现，比较元素、剪辑、视口和超大全页屏幕截图，并检查每个解码的帧。将真实的 host/profile 素材保存在本地；在共享之前检查公开证据中是否存在纯合成内容。正确的 PNG 仍然是有用的静态图像证明，但损坏的视频则不能作为连续流证明。

## <a id="gateway-and-e2e"></a> 网关和 E2E

- 网关测试包含在未指定目标的 `pnpm test` 完整测试套件中；使用 `pnpm test:gateway` 单独运行。
- `pnpm test:e2e`：回购协议 E2E 聚合 = `pnpm test:e2e:gateway && pnpm test:e2e:agent-plugin-gateway && pnpm test:ui:e2e`。
- `pnpm test:e2e:agent-plugin-gateway`：综合提供商和 MCP 装置练习插件安装和真正的网关。 `OPENCLAW_VITEST_RUNTIME=bun`为OpenClaw产品工艺选择Bun；固定装置服务和构建编排保留其现有的 Node 命令。
- `pnpm test:e2e:gateway`：网关端到端冒烟测试（多实例WS/HTTP/node配对）。默认为 `threads` + `isolate: false`，`vitest.e2e.config.ts` 中有一名工人；选择使用 `OPENCLAW_E2E_WORKERS=<n>` 并行（上限为 16），并使用 `OPENCLAW_E2E_VERBOSE=1` 启用详细日志。广泛运行一次准备共享运行时，然后在新进程中使用四个连续的 Vitest 分片来绑定工作内存。工人限制适用于每个流程；保留普通测试失败，同时剩余碎片完成。显式过滤器、监视模式、调用者提供的分片、覆盖范围和报告输出选项保持一次直接调用。
- `pnpm test:live`：提供商实时测试（Claude/Minimax/DeepSeek/z.ai/etc，由 `*.live.test.ts` 控制）。需要 API 键和 `LIVE=1`（或 `OPENCLAW_LIVE_TEST=1`）才能取消跳过； `OPENCLAW_LIVE_TEST_QUIET=0` 的详细输出。
