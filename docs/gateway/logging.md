---
summary: "日志输出面、文件日志、WS 日志样式和控制台格式化"
read_when:
  - "更改日志输出或格式"
  - "调试 CLI 或网关输出"
title: "网关日志"
---

<a id="logging" />

有关面向用户的概述（CLI + Control UI + 配置），请参阅 [/logging](/logging).

OpenClaw 有两个日志输出面：

- **控制台输出** - 您在终端中看到的内容。
- **文件日志** - 由网关日志记录器写入的 JSON 行。

在启动时，网关会记录解析后的默认代理模型，以及会影响新会话的模式默认值：

```text
agent model: openai/gpt-6-astra (thinking=medium, fast=on)
```

`thinking` 来自默认代理、模型参数或全局代理默认值。取消设置时，它显示 `medium`。 `fast` 来自默认代理或模型的 `fastMode` 参数。

如果插件重新加载取代启动插件加载，则模型行、加载插件摘要和通道警告将使用替换配置和插件元数据。

## <a id="file-based-logger"></a> 基于文件的日志记录器

- 默认滚动日志文件位于 `/tmp/openclaw/` 下（每天一个文件），日期由网关主机的本地时区确定。默认配置文件使用 `openclaw-YYYY-MM-DD.log`。命名配置文件使用 `openclaw-<profile>-YYYY-MM-DD.log`（例如，`openclaw-dev-YYYY-MM-DD.log`）。如果该目录不安全或不可写（所有者错误、全局可写、符号链接），则 OpenClaw 将回退到用户范围的 `os.tmpdir()/openclaw-<uid>` 路径。在 Windows 上，它始终使用 OS-tmpdir 后备。
- 活动日志文件以 `logging.maxFileBytes` 轮换（默认值：100 MB）。旋转最多保留五个编号的存档（`.1` 到 `.5`），并继续写入新的活动文件。
- 通过 `~/.openclaw/openclaw.json` 配置日志文件路径和级别：`logging.file`、`logging.level`。
- 文件格式为每行一个 JSON 对象。

启用配置热重载后，对 `logging.level`、`logging.file` 和 `logging.maxFileBytes` 的更改将应用​​于下一个日志记录，包括来自长期存在的通道记录器的记录。排队的记录完成写入其原始文件。显式记录器级别覆盖（例如 Baileys 详细程度）仍然有效。

保持本地 CLI/SDK 和网关版本一致的启动指南使用 `info`；它并不表示检测到版本不匹配。内存中身份验证存储初始化不会发出同步存储弃用警告。对已弃用的存储 API 的显式调用仍会对其替换发出警告。

子系统文件日志省略 `trace`、`debug`、`info` 和 `warn` 记录的调用站点元数据 （`_meta.path`）（包括 `raw()` 行），以避免捕获和解析每个例程消息上的堆栈。 `error` 和 `fatal` 记录保留它。除了 `info` 之外，所有级别都保留调用站点元数据，同时启用诊断并订阅内部日志记录使用者，从而保留 [OTLP 代码位置](/gateway/opentelemetry/privacy-and-trace-context)。 `info` 记录（包括 `raw()` 行）对于诊断消费者而言保持无堆栈状态；它们的严重性、消息、结构化属性和跟踪上下文仍会导出。这是在下一条记录的诊断启用和订阅之后进行的，包括现有子系统记录器。调用者提供的日志消息、结构化字段和错误堆栈保持不变。

通话、实时语音以及受管房间的代码路径会使用共享文件日志记录器，记录有限生命周期的内容，供运维调试和 OTLP 日志导出使用。转写文本、音频载荷、轮次 id、呼叫 id 和提供方 item id 都不会复制到日志记录中。

Discord 实时语音将会话生命周期转换保持在 `info`；音频块和转录增量使用 `debug`。模型获取启动和成功响应也使用 `debug`，无论持续时间如何。非 2xx 响应保留在 `info`；运输失败仍然是警告。启用后，现有的 [ 模型传输诊断标志 ](/logging#targeted-model-transport-diagnostics) 将传输详细信息提升为 `info`。

成功的秘密出口转发（包括凭证替换）使用 `debug`。拒绝仍为 `info`，证书失败仍为警告。它们的结构化字段记录代理结果，无需请求有效负载或凭据；请参阅 [ 秘密出口代理](/gateway/secrets/secret-store-and-egress#secret-egress-proxy)。代码模式和工具搜索目录准备摘要也使用 `debug`。 [Prometheus 指标](/gateway/prometheus) 独立于日志级别对出口结果、目录准备和模型调用进行计数。

每个请求 GitHub API 计时记录也使用 `debug`，包括超过 500 毫秒的提取。传输失败和速率限制错误保留其正常处理。

会话重置或删除期间插件主机清理失败每次失败都会发出一个 `plugins/cleanup` 警告，包括操作、插件、挂钩和错误。在重试之前检查报告的清理错误。成功的清理保持安静，失败的仍然尽力而为。控制台诊断使用共享秘密编辑器；纯文本控制台字段的上限为 2,048 个字符。

Control UI 日志选项卡通过网关 （`logs.tail`） 跟踪此文件。 CLI 的作用相同：

```bash
openclaw logs --follow
```

如果尾部读取发现活动文件已消失，则 Control UI 会清除其先前的记录并跟踪重新创建的文件。丢失的文件仍然返回空尾部。文件系统读取错误（包括指向目录的日志路径）仍然可见，而 Control UI 将最后成功读取的记录保留为过时数据。

### <a id="verbose-vs.-log-levels"></a><a id="verbose-vs-log-levels"></a> 详细输出 vs．日志级别

- **文件日志** 仅由 `logging.level` 控制。
- `--verbose` 只影响 **控制台详细程度**（以及 WS 日志样式）——它**不会**提升文件日志级别。
- 若要在文件日志中捕获仅详细模式下可见的信息，请将 `logging.level` 设为 `debug` 或 `trace`。
- 嵌入式运行的`continue_normal`决策日志位于`debug`。重试、配置文件旋转、模型回退和错误决策仍然是警告。
- Trace 日志还会包含所选热点路径的诊断时间摘要，例如插件工具工厂准备过程。参见 [/tools/plugin#slow-plugin-tool-setup](/tools/plugin#slow-plugin-tool-setup)。

### <a id="sqlite-session-writes"></a> SQLite 会话写入

失败的 SQLite 会话写入在其结构化文件日志记录中包含有限制的、经过编辑的 `error` 摘要，以及可用的原因和错误代码详细信息。长摘要被截断。该记录保留其写入时间和存储字段。

### <a id="sqlite-snapshot-cleanup"></a> SQLite 快照清理

临时只读 SQLite 快照的删除失败由其清理所有者在结构化文件日志中记录一次，并包含所拥有的路径、删除操作和文件系统错误代码（如果可用）。这些诊断不会写入子进程 stdout 或 stderr，因此成功的读取会保留其结果，失败的更新会保留其原始错误详细信息。现有的所需清理失败仍然是错误。

### <a id="slow-agent-database-opens"></a> 缓慢的代理数据库打开

完成的物理代理数据库打开至少需要一秒钟，会发出 `slow OpenClaw agent database open`。该记录保留总经过时间以及 `open`、`validation`、`configuration`、`schema` 和 `registration` 阶段。对于生成的完整性检查，它还包括 `integrityGateMs` 和 `integrityGateOutcome`（`healthy` 或 `failed`）。该门包括检查以及任何驾驶员等待、调度和所有权重新验证。当准入使用单独的完整性Worker时，其生命周期也包括在内。这不会隔离本机检查或 CPU 时间。

当所需索引验证完成时，`canonicalIndexMs` 报告后续同步检查以及任何修复或重新检查，并且 `repairedIndexCount` 对该操作成功修复的索引进行计数。健康的初始完整性检查仍可能需要索引定义修复。失败的初始检查可以通过成功修复来恢复。当阶段不运行时，字段不存在，包括新的空数据库的生成检查字段。这些细节涵盖了 `validation` 的部分内容，无需额外时间添加。该摘要仅在注册时发出。早期的故障和实时缓存命中不会生成摘要。详细信息不添加索引名称或数据库内容。

### <a id="slow-cron-list-pages"></a> Slow cron 列表页面

至少需要一秒钟的 cron 列表页面会通过其现有记录器发出 `cron: slow list page`，具体取决于文件日志级别。结构化记录名称为 `operation: "cron.listPage"` 并报告 `elapsedMs`、`waitToCallbackMs`、`callbackMs` 和 `completionDelayMs`，以及可用源、匹配和返回的行计数、结果和发射器 `pid`、`threadId` 和`isMainThread`。快速页面不会发出这样的记录。

这些是挂断时间，而不是 CPU 时间：等待包括调度延迟，回调时间包括等待的工作，完成延迟包括回调完成后的结算。每个源页面都是单独测量的。调用者可见性过滤在页面回调内部运行；交付预览保留在其外部。现有的跟踪上下文在存在时将被保留。发送者身份标识日志记录 process/isolate，而不是回调等待的工作的所有者。诊断不添加作业标识符、作业内容或请求参数。

### <a id="slow-cron-list-requests"></a> 慢 cron 列表请求

当 `diagnostics.enabled` 处于活动状态时，`cron.list` 处理程序至少需要一秒钟通过网关记录器发出 `cron: slow list request`。该记录使用现有请求 trace/span 并报告 `elapsedMs` 以及 `setup`、`listing`、`projection` 的固定 `phaseDurationsMs`、可选 `previews`、`response` 和`handlerExit`。不存在未进入的阶段。

`sourcePageMs` 和 `sourcePageCount` 聚合源页面调用，包括失败的调用。选择页面后，将出现 `returnedCount`。 `scopeAttemptCount` 对于直接列表为零，对于作用域列表为 1。可见性过滤、排序、修订计算和分页共享一个锁定源操作。对于范围列表，`scopeProcessingMs` 是列表时间减去源页面时间，涵盖该操作之外的工作。这些组件已包含在列表阶段，不得再次添加。

有界分支字段为 `compact`、`previewsRequested` 和 `scopeApplied`。 `previewsRequested` 描述了所选的响应模式，而不是执行是否到达该阶段。 `handlerOutcome` 是 `returned` 或 `threw`。 `responseOutcome` 是处理程序响应回调的 `none`、`ok`、`error` 或 `threw`。它的 `response` 阶段测量同步回调，并且 `handlerExit` 在处理程序自己的清理边界处结束。两者都不能证明套接字交付或客户端接收。外部 RPC 诊断保留这些单独的结果。

所有持续时间均为挂机时间，包括等待和调度，而不是 CPU 时间。快速请求和禁用诊断的请求不会发出摘要。该记录不添加作业标识符、内容、查询字符串、目标或错误文本，并且不会更改单个慢速页面警告或响应负载。

### <a id="slow-codex-catalog-pages"></a> Slow Codex 目录页

启用诊断和警告日志记录后，至少需要一秒钟的 Codex 目录页面会发出 `slow Codex catalog page producer`。其现有阶段总计区分客户端获取、请求等待和页面处理。 `diagnosticEpoch`和`operationId`识别页面观察； `listOperationId` 链接其原始逻辑列表（如果可用）。

`controlWaitersV1` 是一个 JSON-encoded 数组，连接采样页面等待物理客户端和 JSON-RPC 尝试。使用 `JSON.parse` 解码字符串以读取其元组。它保留前两个和最新两个完整的服务员摘要。 `controlWaitersOmitted` 对边界排除的摘要进行计数。每个条目都有以下位置：

| 指数 | 含义                                                       |
| ----: | ------------------------------------------------------------- |
|     0 | Control 页面内请求序号                       |
|     1 | 该控制请求中的过载尝试顺序          |
|     2 | 物理客户端实例 UUID                                 |
|     3 | JSON-RPC 请求 ID                                           |
|     4 | 服务员在那次电线尝试中的顺序                       |
|     5 | `new` 或 `joined` 尝试                                     |
|     6 | 尝试创建时间                                         |
|     7 | 第一次可能的写入时间，或任何写入尝试之前的 `null` |
|     8 | 服务员附着时间                                        |
|     9 | 服务员结算时间                                        |
|    10 | 服务员结果                                                |
|    11 | 服务员坐下后观察到的电报结果                 |
|    12 | 接线结果观察时间，或待处理时的 `null`        |

时间是四舍五入的进程本地单调毫秒，可在同一进程内进行比较。后来的服务员保留了最初的尝试和可能的写入时间。服务员结果区分 `resolved`、`native-error`、`timed-out`、`aborted`、`authority-rejected`、`local-failed` 和 `client-closed`。接线结果为 `retained-pending`、`native-ok`、`native-error`、`ingress-rejected`、`correlation-closed` 或 `not-written`。

可能的写入并不能证明本机接受。加入的等待者并不意味着发送了另一个请求，并且超时的等待者可以使线路尝试挂起。页面观察结束后，不承诺后续电汇结算。这些记录不包含查询、光标、路径、标题、身份验证数据或原始错误。现有界限仍然是 64 个活动观察、每分钟 60 个警告、28 个元数据键和 2,048 个字节。遗漏或遗漏的摘要是无法获得的证据，而不是零活动；持续时间不归因于本机 CPU 或客户收据。

## <a id="console-capture"></a> 控制台捕获

CLI 捕获 `console.log/info/warn/error/debug/trace`，将它们写入文件日志，并仍然打印到 stdout/stderr.

`console.trace()` 在每种控制台风格中保留其经过编辑的堆栈，包括强制 stderr 输出。文件捕获在 `trace` 级别记录一次，具体取决于配置的文件日志级别。

可独立调整控制台详细程度：

- `logging.consoleLevel`（默认值为 `info`）
- `logging.consoleStyle` （`pretty` | `json`）。未设置时，TTY 上的输出为 `pretty`，否则为自动 `compact` 样式。 `compact` 不再是可设置的值。 `openclaw doctor --fix` 将存储的一个映射到 `pretty`。

## <a id="redaction"></a> 脱敏

文件日志将原始记录存储在具有仅限所有者 （`0600`） 权限的网关帐户下。当日志扩大受众范围时，就会运行密文：`logs.tail`（包括 CLI 和 Control UI）、控制台输出、diagnostic/support 捆绑包以及远程或 OTLP 导出。每个输出独立编辑；直接读取文件则不然。保护原始日志文件（例如 agent/state 数据库）并在共享之前对其进行审查。

工具参数、工具结果和会话记录不是秘密屏蔽的。这包括源代码输出和 `.env` 文件的直接读取。工具有效载荷仍然受到大小限制、image/base64 处理和结构标准化。配置快照、审核输出、命令行诊断和带有凭据的 URL 保留其掩码。

- Egress 日志和诊断编辑始终启用。
- `logging.redactPatterns`：正则表达式字符串数组（替换默认字符串列表）。表单主体的内置结构保护、结构化授权标头和裸 AWS 秘密访问密钥始终适用。
  - 使用原始正则表达式字符串（自动应用 `gi`），或使用 `/pattern/flags` 自定义标志。
  - 匹配被屏蔽，保留前 6 + 最后 4 个字符（值 >= 18 个字符）。较短的值变为 `***`。
  - 默认规则涵盖常见的密钥赋值、CLI 标志、JSON 字段、Bearer 标头、PEM 块、常见供应商 token 前缀，以及支付凭证字段名称（卡号、CVC/CVV、共享支付 token、支付凭证）。

JSON 控制台输出和日志尾部保留有效的 JSON，同时屏蔽解码值和序列化记录上下文。后面的规则看到前面的面具。结构化凭证字段使用完整掩码；匹配的数字、布尔值和 null 成为 JSON 字符串 `"***"`。配置自定义模式时，日志尾部保留内置凭据模式。

诊断导出和捕获的 provider/WebSocket 控制台输出保留编辑。 `logging.redactPatterns` 在这些出口边界提供特定于部署的模式。记录 ID、大小和结果，而不是消息文本、提示、工具参数或工具结果。 WebSocket 代理事件摘要包含字符计数，而不是助理文本或工具元数据。

## <a id="gateway-websocket-logs"></a> Gateway WebSocket 日志

Gateway 以两种模式打印 WebSocket 协议日志：

- **正常模式（无`--verbose`）**：失败的RPC结果（`ok=false`）、缓慢调用（`>= 1,000ms`）和解析错误在默认日志级别仍然可见。一秒内的成功响应（包括大型会话列表）将记录在 `debug` 中。设置 `logging.level: "debug"` 将其保留在文件日志中，或设置 `logging.consoleLevel: "debug"` 以打印它们。
- **详细模式 （`--verbose`）**：打印所有 WS request/response 流量。

经过验证的 `connect` 握手还作为 `method="connect"` 参与现有网关 RPC 指标，包括处理程序持续时间、第一响应延迟、响应字节和传送失败。处理程序时间包括 hello write 之后的完成工作；首次响应时间在传输的写入回调时结束，而不是在浏览器接收时结束。这些是服务器挂起时间，包括等待的工作。因重新启动或暂停准入而拒绝的经过验证的连接会报告拒绝的调度及其响应；它没有处理程序示例，因为从未输入身份验证。

Connect 响应日志遵循相同的慢响应阈值，包括 `authMs`（通过身份验证的凭据）、`attachMs`（设备授权、身份、范围和会话附件）、`helloMs`（hello 有效负载准备）和 `sendMs`（序列化和传输写入回调）。不存在未达到的阶段。有效负载准备和写入之间的引导赎回或准入工作可能会使总响应时间超过这些字段的总和。不包含有效负载字段或凭据。失败的连接还会记录 `failurePhase` 和现有的准入 `failureCause`，因此附件之前的拒绝仍然可归因。

附加间隔还包括连接响应日志上的这些子阶段墙时间：`deviceAuthorizationMs`（配对策略、查找和令牌发行）、`nodePreparationMs`（节点准入和配对捕获）、`identityMs`（配置文件准入）、`scopeGrantMs`（scope/role 策略和身份提升审核日志）、 `operatorDeviceMs`（接受的设备凭证查找）和`sessionRegistrationMs`（剩余的客户端准备、访问绑定和传输切换）。嵌套字段 `deviceLookupMs`、`deviceTokensMs`、`profileEnsureMs` 和 `profileAuthorityMs` 隔离配对和配置文件操作，包括缓存命中和工作器 queue/lock 等待。嵌套时间与其父间隔重叠；不要将它们添加到总数中。这些是经过的时间，因此等待工作期间事件循环停止也算在内。不存在未使用或未到达的子阶段。

在启用 `diagnostics.enabled: true` 并启用警告日志记录的情况下，`sessions.list` 处理程序和 `sessions.subscribe` 快照处理程序花费至少一秒也会发出 `slow session list`。 `operation` 字段标识哪个请求生成了记录。该记录包括 process/thread 身份、请求跟踪和行计数：`selectedRowCount`、`dirtyRowCount`、`materializedRowCount` 和 `reusedRowCount`。后两者将请求期间刷新的选定行与请求开始时已驻留的选定行区分开来。脏计数描述请求开始时待处理的所有者工作。

`sessions.messages.subscribe` 请求至少需要一秒，发出 `slow session messages subscribe` 以及 `operation`、`elapsedMs` 和 `phaseDurationsMs`。计时在处理程序之前的路由器中开始，并将 `projectionReadiness`、`accessFacts`、`handlerPreparation`、`retainedReadAdmission`、`replayPreparation` 和 `observerCommit` 与响应和清理工作分开。普通订阅准备提交的访问事实，无需等待显示行刷新；隐身读取保留其精确的行准备。批准订阅在确认之前仍会准备并验证权威重播。记录不包含会话密钥或消息内容。

`materialize` 阶段测量会话行投影准备就绪的等待时间。加载目录后，动态目录续订不再阻止列表或描述：读取时使用当前目录，而其替换在后台加载，然后使用新目录刷新行。启动仍然等待第一个目录。保留相同目录内容的续订不会弄脏驻留行。

并发列表共享元数据准备和选定行具体化。选定的页面屈服于有界物化批次之间的事件循环，包括当存储的事实已被缓存时。长时间的 `materialize` 等待本身并不表示事件循环停止或每个调用者重复工作。

配置文件和运行注册表发布会刷新其派生的显示事实，而无需重新读取会话条目。工作人员环境和安置发布仅在下一次演示时刷新所选行的工作人员事实。存储的会话写入发布确切的密钥；广泛列表通知不会安排全行排出。侧边栏首选项、`talk.realtime.model` 和其他与投影无关的配置提交保留会话行。代理身份编辑刷新演示文稿上的显示事实；存储准入协调物理代并保留未更改的行。会话策略、花名册、共享和采用的模型目录更改仍会在列表响应之前刷新受影响的实时行。存档的行在被选择之前保持冷状态。

仅转录行刷新在每个驻留会话中使用一秒窗口：第一个通知会立即刷新，后续通知会折叠为尾随刷新。在刷新到期之前，这些挂起的通知不是脏行。因此，转录本的新鲜度可能会滞后一个窗口；可选预览仍然等待空闲后台回填。元数据、生命周期、目录和拓扑发布继续立即失效。转录通知不会使父级或子级无效：关系、继承的模型设置和子代理活动都有自己的元数据或注册表发布。

记录报告阶段总计、同步 selection/row 时间和 `yieldWaitMs`/`yieldCount` 以等待共享投影准备就绪。这些等待可能包括与其他呼叫者共享的合并工作。阶段总数包括其等待间隔；不要再次将详细计数器添加到这些总数中。 `handlerElapsedMs` 在参数验证之前启动，并在处理程序之前排除准入。 `response`阶段包括同步响应回调。这些是经过的持续时间，而不是 CPU 时间或客户收据证明。不包含查询文本或会话内容。

同一记录包括用于同步工作的分数毫秒电流线程 CPU 测量：`prepareThreadCpuMs`、`rowThreadCpuMs` 和 `responseThreadCpuMs`。准备工作包括居民选择、过滤以及投影准备就绪后的排序。 CPU 行包括演示和最终列表构建。两个间隔都在测量响应回调之前结束；响应 CPU 不包括网络等待。测量在发布或记录此诊断记录之前完成。不包括投影就绪等待、背景物化、干预微任务和工作线程 CPU。这些选择包括 CPU 间隔，包括同线程本机工作和垃圾收集，而不是 SQL-、仅 CPU 或完整请求 CPU 总计。

未访问的测量被省略。每个请求都保留自己的选择、表示和响应 CPU，而不继承共享的后台工作。如果 CPU 计数器读取失败，则该请求的所有 CPU 字段都会被忽略；其结果和经过的诊断被保留。现有激活和一秒警告阈值未更改，因此丢失的慢速记录不考虑较快请求消耗的 CPU。

当授权、输入许可和确认至少需要一秒时，`chat.send` 记录`slow chat send <N>ms stage=request`。阶段持续时间显示在消息文本中，包括权限、运行许可、附件、持久性和响应。单独的 `stage=startup ack=<N>ms` 记录将确认后准备工作归为工作区设置、回复初始化、技能准备和创作。 `worktree` 涵盖待创建的工作区；普通沙箱准备状态仍然包含在 `preparation` 中。 `replyInitialization` 包括路由、入场券等待、工作区引导、媒体处理和会话初始化，直到准备好的会话回调。初始会话行读取器等待包含在该间隔中，而不是单独计时。 `snapshot` 测量嵌套在 `preparation` 内的代理运行转录启动读取器准备工作。当代理运行开始时，或者在启动代理之前退出调度时，启动测量结束。接受转向而不是报告 `stage=steer`；延迟的后续报告 `stage=queued`。这些记录包括等待活动运行在其下一个边界提交输入，包括转向接收超时。它们使用相同的一秒阈值，每次发送最多发出一条确认后记录；它们不是启动延迟。开始新运行的被拒绝转向保留 `stage=startup`。这些记录不包含消息文本或会话标识符。嵌套阶段可以重叠；它们的总和不是请求持续时间。当启用诊断时，[Prometheus 导出器](/gateway/prometheus) 记录快速和慢速发送的相同固定阶段。

目录列表还通过现有的诊断事件流和 [Prometheus 导出器 ](/gateway/prometheus#catalog-list-stages) 公开固定的请求阶段观察。其中包括 initial/final 投影就绪、提供者或合并等待以及同步 planning/final-delivery 线程 CPU。与慢速日志不同，这些观察结果包括当感兴趣的可信消费者处于活动状态时低于一秒的请求。它们不会更改警告阈值、启动阶段历史记录、请求行为或诊断收集设置。

### <a id="ws-log-style"></a> WS 日志样式

`openclaw gateway` 支持按 Gateway 切换样式：

- `--ws-log auto`（默认）：普通模式优化。详细模式使用紧凑输出。
- `--ws-log compact`：详细时的紧凑输出（配对 request/response）。
- `--ws-log full`：在详细模式下输出每个帧的完整内容。
- `--compact`：`--ws-log compact` 的别名。

```bash
# optimized (only errors/slow)
openclaw gateway

# show all WS traffic (paired)
openclaw gateway --verbose --ws-log compact

# show all WS traffic (full meta)
openclaw gateway --verbose --ws-log full
```

## <a id="console-formatting-(subsystem-logging)"></a><a id="console-formatting-subsystem-logging"></a> 控制台格式化（子系统日志）

控制台格式化程序为 **TTY-aware** 并打印一致的带前缀行。子系统记录器使输出保持分组且可扫描：

- **每行都有子系统前缀** （e.g. `[gateway]`、`[canvas]`、`[tailscale]`）。
- **子系统颜色**（每个子系统的颜色保持稳定，根据名称进行哈希）以及级别颜色。
- **当输出为 TTY** 或环境看起来像丰富的终端 （`TERM`/`COLORTERM`/`TERM_PROGRAM`） 时的颜色。尊重 `NO_COLOR` 和 `FORCE_COLOR`。
- **缩短的子系统前缀**：删除前导 `gateway/`、`channels/` 或 `providers/` 段，然后最多保留最后 2 个剩余段（e.g. `channels/turn/execution` 显示为`turn/execution`）。已知的通道子系统（`telegram`、`whatsapp`、`slack` 等）始终会折叠为仅通道名称。
- **按子系统划分的子日志记录器**（自动添加前缀 + 结构化字段 `{ subsystem }`）。
- 用于 QR/UX 输出的 **`logRaw()`**（无前缀、无格式化）。
- **控制台样式**：`pretty` | `json`（`compact`在TTY之外自动应用，并且不是可设置的值）。
- **控制台日志级别**与文件日志级别分开（当`logging.level`为`debug`/`trace`时，文件保留完整详细信息）。
- **WhatsApp 消息体** 日志位于`debug`（使用`--verbose` 查看它们）。

这使得文件日志保持稳定，同时让交互式输出更易于浏览。

## <a id="related"></a> 相关内容

- [日志](/logging)
- [OpenTelemetry 导出](/gateway/opentelemetry)
- [诊断导出](/gateway/diagnostics)
- [`openclaw logs`](/cli/logs) — 尾部网关从 CLI 通过 RPC 进行日志记录
