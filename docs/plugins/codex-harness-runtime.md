---
summary: "Codex harness 的运行时边界、钩子、工具、权限和诊断"
title: "Codex harness 运行时"
read_when:
  - 你需要 Codex harness 运行时支持契约
  - 你正在调试原生 Codex 工具、钩子、压缩或反馈上传
  - 你正在更改 OpenClaw 和 Codex harness 回合之间的插件行为
---

Codex harness 回合的运行时契约。有关设置和路由，请参见
[Codex harness](/plugins/codex-harness)。有关配置字段，请参见
[Codex harness 参考](/plugins/codex-harness-reference)。

## 概览

Codex 负责原生模型循环、原生线程恢复、原生工具续接以及原生压缩。OpenClaw 负责通道路由、会话文件、可见消息投递、OpenClaw 动态工具、审批、媒体投递，以及围绕该边界的转录镜像。

对于原生连接的应用，Codex 还负责最终的每线程应用和工具策略。OpenClaw 会缓存一个按运行时和工作区作用域划分的 `plugin/installed` 快照，读取精确配置的插件详情，仅临时允许明确获准且已验证归属的应用，并创建一个默认拒绝的原生线程。一次 `app/installed` 请求会验证实际线程 ID，而不会强制刷新清单。只有在 Codex 确认该应用已为该线程启用且可调用后，原生应用执行才会开始。

此检查会在 OpenClaw 注入历史记录、启动回合或提交线程绑定之前完成。失败的持久临时线程会被删除；临时线程则会取消订阅。当无法确认安全清理时，OpenClaw 会弃用 app-server 连接。受监管的分支也会清理其临时探测，并在清理失败时保留恢复状态。

全账户范围的应用访问权限无法覆盖明确禁用的已配置工作区插件。OpenClaw 使用其已安装快照，并仅读取该确切插件的详情来识别并拒绝其应用；它绝不会扫描无关的市场，也不会激活该插件。

提示路由遵循所选运行时，而不只是提供商字符串。原生 Codex 回合会获得 Codex app-server 开发者指令；显式的 OpenClaw 兼容路由即使使用 Codex 风格的 OpenAI 身份验证或传输，也仍会保留常规的 OpenClaw 系统提示。

OpenClaw 启动和恢复原生 Codex 线程时，会禁用 Codex 内置个性（`personality: "none"`），这样工作区个性文件和 OpenClaw 代理身份仍然保持权威。原生 Codex 仍会保留 Codex 拥有的 base/model 指令和项目文档加载。轻量级 OpenClaw 运行（例如 cron）仍会抑制项目文档加载。

OpenClaw 开发者指令涵盖 OpenClaw 运行时相关事项：源通道投递、OpenClaw 动态工具、ACP 委派、适配器上下文，以及当前代理的工作区配置文件。技能目录和通过工具路由的 `MEMORY.md` 指针会作为按回合作用域的协作开发者指令进行投影。当记忆工具不可用时，活动的 `BOOTSTRAP.md` 内容和完整的 `MEMORY.md` 会改为作为普通回合输入上下文。

当 `openclaw_direct.sessions_yield` 可用时，这些指令还会告知原生 Codex 父代理：如果子代理的结果应在后续回合到达，则结束当前回合。原生 `wait_agent` 仍用于有意进行的同回合等待，即下一步操作会立即受阻于子代理；完成轮询循环不能作为替代方案。

大多数 OpenClaw 动态工具使用可搜索的 `openclaw` 命名空间。标记为 `catalogMode: "direct-only"` 的工具使用 `openclaw_direct`，Codex 会将其直接保持为模型可见的 `DirectModelOnly`，而不是将其暴露给嵌套的 Code Mode 执行。

## 线程绑定和模型更改

当 OpenClaw 会话附加到现有的 Codex 线程时，下一轮会将当前选定的模型、审批策略、沙箱、审批审查者和服务层重新发送到 app-server。从 `openai/gpt-5.5` 切换到 `openai/gpt-5.2` 会保留线程绑定，但会要求 Codex 使用新选择的模型继续。

受监督的绑定是个例外。OpenClaw 的模型选择器会保持锁定，
并且恢复时会省略模型和提供方覆盖，因此 Codex 会恢复规范
线程中已持久化的模型和提供方。一个单独的原生 Codex 控件可以
更改该持久化的组合，而初始快照可能会产生 Codex 的常规
模型差异警告；外层的 OpenClaw 模型和回退链都不会替代其中任一项。

## 监管与安全续接

Codex 监管是同一个 `codex` 插件的一项可选能力。它通过单独的连接发现原生线程，并且只将未归档的会话投影到 Gateway 目录中。在没有明确的 `appServer` 连接设置时，该连接使用受管理的用户主目录 stdio，而普通的 harness 仍然是 agent 作用域。列表和元数据读取都是被动的：它们不会恢复线程、不会让 OpenClaw 订阅其实时事件，也不会处理其审批。

对于 Gateway 计算机上的已存储或空闲会话，**Continue as branch** 会创建一个普通的、模型锁定的 Chat，并通过源的最后一个终端持久化轮次传递有界的用户和助手历史。第一个普通 Chat 轮次会安装真实的审批处理程序，并使用一个临时的原生分支来固定快照，而不使用模型或提供方覆盖。Codex App Server 使用其当前的原生配置并返回所选的配对；如果该模型与源的最后记录模型不同，它会发出正常的警告。在同一监管连接上，OpenClaw 会在其 cwd 和运行时策略下启动规范的 `appServer` 源 Codex harness 线程，并在该初始启动时精确使用返回的模型和提供方，注入有界的可见历史，并归档临时分支。源永远不会被恢复。规范线程拥有完整的 OpenClaw harness 工具面；源中的推理、工具调用和工具结果不会被克隆进去。私有连接作用域会在待定和已提交的绑定状态之间持续存在，因此之后的每一轮都仍然保持在该连接上，并使用原生认证和提供方配置。禁用监管或绑定/连接漂移会直接失败，而不是切换到普通的 agent-home harness。

原始的 CLI、VS Code、Atlas 或 ChatGPT 源仍然有资格出现在两个目录中。规范分支是一个原生 Codex 线程，但其源类型为 `appServer`；原生客户端可能会筛选该源类型，因此无法保证它会出现在 Codex Desktop 中。

活动源不能启动新分支或被归档；现有的受监管 Chat 仍然可以打开。`notLoaded` 表示活动状态未知，而不是空闲；OpenClaw 仅在经过明确的“无其他运行者”确认以及一次新的进程本地状态读取之后，才允许对本地 `idle` 或 `notLoaded` 行进行归档。Codex 在单个 App Server 进程内序列化线程变更，但不提供跨进程的独占运行者或审批所有者租约，因此该读取无法证明没有其他进程正在使用该线程。OpenClaw 会阻止对精确目标或 Codex 分页后代查询返回的任何未归档派生后代的已知活动绑定所有者。枚举错误、循环和安全限制耗尽都会直接失败。原生归档仍可能与另一个进程中的新轮次发生竞态，因此确认会覆盖未知客户端以及状态读取与归档之间的间隙。受监管的模型锁定 Chat 在保护原生绑定期间不能被删除。

配对节点目录在初始版本中仍然仅限于元数据。当前的节点调用边界是请求/响应式的，无法承载真实 Codex harness 绑定所需的长生命周期轮次事件、审批请求或流式输出。因此，即使该行处于空闲状态，远程 **Continue** 和 **Archive** 也仍然不可用。

有关运维设置和可见的控制界面行为，请参阅 [Codex 监管](/plugins/codex-supervision)。

## 可见回复与心跳

通过 Codex harness 进行的直接/源聊天轮次，默认会自动将最终的助手回复交付给内部 WebChat 界面，这与 Pi harness 协议一致：代理正常回复，OpenClaw 会将最终文本发布到源对话中。将 `messages.visibleReplies: "message_tool"` 设置为仅在代理调用 `message(action="send")` 时才向外公开最终的助手文本。

Codex 心跳轮次默认会在可搜索的 OpenClaw 工具目录中获得 `heartbeat_respond`，以便代理记录此次唤醒应保持静默还是发出通知。心跳主动性指导会作为限定于心跳轮次的 Codex 协作模式开发者指令发送；普通聊天轮次则保持 Codex 默认模式。存在时，心跳监视器的 cron 临时内容会附加到心跳提示中。

## 钩子边界

| 层级                                 | 归属方                  | 目的                                                                |
| ------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| OpenClaw 插件钩子                    | OpenClaw               | OpenClaw 和 Codex harness 之间的产品/插件兼容性。   |
| Codex app-server 扩展中间件          | OpenClaw 内置插件 | 围绕 OpenClaw 动态工具的每回合适配器行为。            |
| Codex 原生钩子                       | Codex                  | 来自 Codex 配置的低层级 Codex 生命周期和原生工具策略。 |

OpenClaw 不使用项目级或全局的 Codex `hooks.json` 文件来路由
插件行为。对于原生工具和权限桥接，OpenClaw 会为 `PreToolUse`、`PostToolUse`、
`PermissionRequest` 和 `Stop` 注入按线程划分的 Codex 配置。

当启用 Codex app-server 审批（`approvalPolicy` 不是
`"never"`）时，默认注入的原生钩子配置会省略 `PermissionRequest`，
以便 Codex 的 app-server 审核器和 OpenClaw 的审批桥在审核后处理真实的升级请求。
将 `permission_request` 添加到
`nativeHookRelay.events` 可强制仍然走兼容性中继。其他 Codex
钩子，例如 `SessionStart` 和 `UserPromptSubmit`，仍然是 Codex 级别的控制；
在 v1 合约中，它们不会作为 OpenClaw 插件钩子暴露出来。

对于 OpenClaw 动态工具，Codex 请求调用后，OpenClaw 才会执行该工具，因此插件和中间件行为会在 harness 适配器中运行。Codex Code Mode 会将通用动态结果作为文本接收，并将嵌套的动态调用序列化；调用方必须解析类似 JSON 的结果，不能依赖 `Promise.all` 进行并发提交。对于 Codex 原生工具，Codex 持有规范的工具记录；OpenClaw 可以镜像选定的事件，但无法重写原生线程，除非 Codex 通过 app-server 或原生钩子回调暴露相应能力。

Codex app-server 的 report 模式 `PreToolUse` 事件会将插件审批延后到
对应的 app-server 审批。如果 OpenClaw 的 `before_tool_call` 钩子返回
`requireApproval`，而原生载荷设置了 `openclaw_approval_mode:
"report"`，那么原生钩子中继会记录插件审批需求，并且不返回任何原生决策。
当 Codex 之后针对同一次工具使用发送 app-server 审批
请求时，OpenClaw 会打开插件审批提示，并将决策映射回 Codex。Codex 的 `PermissionRequest` 事件是一个
独立的审批路径，在为该桥配置时，仍然可以通过 OpenClaw 审批进行路由。

Codex app-server 项目通知还为尚未被原生
`PostToolUse` 中继覆盖的原生工具完成提供异步的 `after_tool_call`
观察。这些仅用于遥测/兼容性；它们不能
阻止、延迟或修改原生工具调用。

压缩和 LLM 生命周期投影来自 Codex app-server
通知和 OpenClaw 适配器状态，而不是原生 Codex 钩子命令。
`before_compaction`、`after_compaction`、`llm_input` 和 `llm_output` 是
适配器级别的观察，不是对 Codex 内部
请求或压缩载荷的逐字节捕获。

Codex 原生的 `hook/started` 和 `hook/completed` app-server 通知会被
投影为 `codex_app_server.hook` 代理事件，用于轨迹记录和
调试。它们不会调用 OpenClaw 插件钩子。

## 实验性沙盒进程流式传输

原生沙盒执行仍需通过
`appServer.experimental.sandboxExecServer` 选择性启用。启用后，对于处于活动状态的
OpenClaw 沙盒，沙盒进程会按顺序流式传输 stdout、stderr 或 PTY
输出通知。OpenClaw 仅保留有限的近期输出缓冲区，用于轮询和重放，因此长时间运行的进程不会无限制地增大应用服务器桥接的负载。进程退出和清理仍与沙盒所拥有的进程绑定。环境注册失败时，绝不会回退到主机执行。

有关配置和仅限本地的传输限制，请参阅[沙盒化原生执行](/plugins/codex-harness-reference#sandboxed-native-execution)。

## V1 支持契约

Codex runtime v1 中支持：

| Surface                                       | Support                                                                          | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通过 Codex 运行 OpenAI 模型循环               | 支持                                                                        | Codex app-server 负责 OpenAI 轮次、原生线程恢复和原生工具继续执行。                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| OpenClaw 通道路由和交付         | 支持                                                                        | Telegram、Discord、Slack、WhatsApp、iMessage 以及其他通道都位于模型运行时之外。                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| OpenClaw 动态工具                        | 支持                                                                        | Codex 请求 OpenClaw 执行这些工具，因此 OpenClaw 仍处于执行路径中。                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 提示词和上下文插件                    | 支持                                                                        | OpenClaw 将 OpenClaw 特定的提示词/上下文投射到 Codex 轮次中，同时让 Codex 所有的基础提示词、模型提示词和配置的项目文档提示词保留在原生 Codex 通道中。对于原生线程，OpenClaw 会禁用 Codex 内置的个性设定，因此 agent 工作区的个性文件保持权威。原生 Codex 开发者指令只接受明确限定在 `codex_app_server` 范围内的命令指导；旧版全局命令提示仍用于非 Codex 提示词界面。 |
| 上下文引擎生命周期                      | 支持                                                                        | Assemble、ingest 和回合后维护会围绕 Codex 轮次运行。上下文引擎不会替代原生 Codex 压缩。                                                                                                                                                                                                                                                                                                                                                        |
| 动态工具钩子                            | 支持                                                                        | `before_tool_call`、`after_tool_call` 和工具结果中间件会围绕 OpenClaw 所有的动态工具运行。                                                                                                                                                                                                                                                                                                                                                                          |
| 生命周期钩子                               | 作为适配器观测受到支持                                                | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 会以准确反映 Codex 模式的载荷触发。                                                                                                                                                                                                                                                                                                                                                           |
| 最终答案修订门                    | 通过原生钩子中继受到支持                                              | Codex 的 `Stop` 会中继到 `before_agent_finalize`；`revise` 会在最终确定之前请求 Codex 再进行一次模型处理。                                                                                                                                                                                                                                                                                                                                                                |
| 原生 shell、patch 和 MCP 的阻止或观测 | 通过原生钩子中继受到支持                                              | Codex 的 `PreToolUse` 和 `PostToolUse` 会针对已提交的原生工具界面进行中继，包括固定 Codex app-server 上的 MCP 载荷。支持阻止；不支持重写参数。                                                                                                                                                                                                                                                                                       |
| 原生权限策略                      | 通过 Codex app-server 审批和兼容性原生钩子中继受到支持 | Codex app-server 的审批请求会在 Codex 审查后通过 OpenClaw 路由。对于原生审批模式，`PermissionRequest` 原生钩子中继是选择性启用的，因为 Codex 会在守护程序审查之前触发它。                                                                                                                                                                                                                                                                          |
| App-server 轨迹捕获                 | 支持                                                                        | OpenClaw 会记录发送到 app-server 的请求以及收到的 app-server 通知。                                                                                                                                                                                                                                                                                                                                                                                    |

Codex runtime v1 中不支持：

| Surface                                             | V1 boundary                                                                                                                                     | Future path                                                                               |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 原生工具参数变更                       | Codex 原生预工具钩子可以阻止，但 OpenClaw 不会重写 Codex 原生工具参数。                                               | 需要 Codex 钩子/模式支持来替换工具输入。                            |
| 可编辑的 Codex 原生转录历史            | Codex 负责规范化的原生线程历史。OpenClaw 负责镜像并可以投射未来上下文，但不应修改不受支持的内部结构。 | 如果需要原生线程手术，请添加显式的 Codex app-server API。                    |
| 用于 Codex 原生工具记录的 `tool_result_persist` | 该钩子转换的是 OpenClaw 所有的转录写入，而不是 Codex 原生工具记录。                                                           | 可以镜像转换后的记录，但规范化重写需要 Codex 支持。              |
| 丰富的原生压缩元数据                     | OpenClaw 可以请求原生压缩，但不会收到稳定的保留/丢弃列表、令牌增量、完成摘要或摘要载荷。   | 需要更丰富的 Codex 压缩事件。                                                     |
| 压缩干预                             | OpenClaw 不允许插件或上下文引擎否决、重写或替换原生 Codex 压缩。                                             | 如果插件需要否决或重写原生压缩，请添加 Codex 预/后压缩钩子。 |
| 按字节精确的模型 API 请求捕获             | OpenClaw 可以捕获 app-server 请求和通知，但 Codex 核心会在内部构建最终的 OpenAI API 请求。                      | 需要一个 Codex 模型请求跟踪事件或调试 API。                                   |

## 原生权限和 MCP 询问

对于 `PermissionRequest`，OpenClaw 仅在策略决定时返回明确的允许或拒绝
决策。没有决策的结果并不等同于允许：Codex 会将其视为没有挂钩决策，并继续
走其自身的守护程序或用户
批准路径。

Codex app-server 的批准模式默认省略此原生挂钩。除非
`permission_request` 被显式包含在
`nativeHookRelay.events` 中，或者兼容运行时安装了它，否则都适用。

当操作员在 Codex 原生权限请求中选择 `allow-always` 时，OpenClaw 会在一个有界的会话窗口内记住该精确的 provider/session/tool 输入/cwd
指纹。被记住的决策有意只支持完全匹配：命令、参数、工具载荷或
cwd 的任何变更都会产生新的批准。

当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具批准询问会通过 OpenClaw 的插件批准
流程处理。Codex 的 `request_user_input` 会为发起请求的会话注册一个与提供程序无关的网关问题。Control UI 会渲染网关问题卡片，并且在频道支持的情况下，单个非机密选项会使用类型化的频道按钮。按钮点击、Control UI 答案以及下一条排队的纯文本回复，都会在 OpenClaw 返回 app-server 答案之前解析同一网关记录。Codex 的自动解析和尝试中止会限制等待时间并取消该记录。机密问题完全保留在带有警告的文本回复路径中。其他 MCP 询问请求将安全失败。

关于承载这些提示的一般插件批准流程，请参见
[插件权限请求](/plugins/plugin-permission-requests)。

## 队列引导

活动运行的队列引导映射到 Codex app-server 的 `turn/steer`。在默认的 `messages.queue.mode: "steer"` 下，OpenClaw 会在配置的静默窗口内批处理 steer 模式的聊天消息，并按到达顺序将它们作为一个 `turn/steer` 请求发送。

Codex review 和手动压缩 turn 可以拒绝同轮 steering。在这种情况下，OpenClaw 会等待当前运行完成后再开始提示词。消息需要默认排队而不是 steering 时，请使用 `/queue followup` 或 `/queue collect`。参见 [Steering queue](/concepts/queue-steering)。

## Codex 反馈上传

当在原生 Codex 运行环境中某个会话的 `/diagnostics [note]` 获得批准时，OpenClaw 还会为相关的 Codex 线程调用 Codex app-server 的 `feedback/upload`，包括每个列出的线程的日志，以及在可用时生成的 Codex 子线程。

上传会通过 Codex 的正常反馈路径发送到 OpenAI 服务器。如果该 app-server 中禁用了 Codex 反馈，命令会返回 app-server 错误。完成的 diagnostics 回复会列出这些被发送的线程的频道、OpenClaw 会话 ID、Codex 线程 ID，以及本地的 `codex resume <thread-id>` 命令。

如果你拒绝或忽略该批准，OpenClaw 不会打印这些 Codex ID，也不会发送 Codex 反馈。该上传不会替代本地的 Gateway diagnostics 导出。有关批准、隐私、本地捆绑包和群聊行为，请参见 [Diagnostics export](/gateway/diagnostics)。

仅当你想为当前附加的线程上传 Codex 反馈、而不需要完整的 Gateway diagnostics 捆绑包时，才使用 `/codex diagnostics [note]`。

## 压缩和转录镜像

当所选模型使用 Codex harness 时，原生线程压缩属于 Codex app-server。OpenClaw 不会为 Codex 轮次运行预检压缩，不会用 context-engine 压缩替换 Codex 压缩，也不会在无法启动原生压缩时回退到 OpenClaw 或公共 OpenAI 摘要。OpenClaw 会为通道历史、搜索、`/new`、`/reset` 以及未来的模型或 harness 切换保留一份转录镜像。

显式压缩请求，例如 `/compact` 或插件请求的手动 compact 操作，会使用 `thread/compact/start` 启动原生 Codex 压缩。OpenClaw 会保持请求和共享客户端租约处于打开状态，直到 Codex 发出匹配的 `contextCompaction` 完成项，然后将该压缩轮次报告为已完成。如果该终止轮次超过了配置的压缩超时时间，OpenClaw 会请求原生轮次中断。租约和每线程压缩栅栏会一直保持，直到 Codex 报告终止状态或确认中断 RPC。如果 Codex 未在中断宽限期内确认，OpenClaw 会在释放栅栏之前退役该连接。远程连接也会解除匹配的线程绑定，因此后续工作不会与未确认的远程轮次重叠。退役连接上的其他轮次会失败，并且可以在新的客户端上重试。客户端关闭、请求取消或失败的压缩轮次会返回操作失败。自动的上下文压力压缩是 Codex 的职责；OpenClaw 只会为手动请求的触发器启动原生压缩。

当上下文引擎请求 Codex 线程引导投影时，OpenClaw 会将工具调用名称和 id、输入形状以及已脱敏的工具结果内容投影到新的 Codex 线程中。它不会将原始工具调用参数值复制到该投影中。

该镜像包括用户提示、最终助手文本，以及当 app-server 发出时的轻量级 Codex 推理或计划记录。OpenClaw 会记录原生压缩的开始和终止状态，但它不会公开可供人阅读的压缩摘要，也不会公开一个可审计的列表，说明 Codex 在压缩后保留了哪些条目。

由于 Codex 拥有规范的原生线程，`tool_result_persist` 不会重写 Codex 原生的工具结果记录。它只在 OpenClaw 写入由 OpenClaw 拥有的会话转录工具结果时生效。

## 媒体和交付

OpenClaw 继续负责媒体交付和媒体提供商选择。图像、
视频、音乐、PDF、TTS 和媒体理解使用相应的提供商/模型
设置，例如 `agents.defaults.mediaModels.image`、
`agents.defaults.mediaModels.video`、`pdfModel` 和 `tts`。

文本、图像、视频、音乐、TTS、审批以及消息工具输出继续
通过正常的 OpenClaw 交付路径；媒体生成不需要
旧版运行时。当 Codex 发出一个带有 `savedPath` 的原生图像生成项时，OpenClaw 会通过正常的回复媒体
路径转发该确切文件，即使该 Codex 回合没有助理文本。

## 相关内容

- [Codex harness](/plugins/codex-harness)
- [Codex harness 参考](/plugins/codex-harness-reference)
- [Codex 监督](/plugins/codex-supervision)
- [原生 Codex 插件](/plugins/codex-native-plugins)
- [插件钩子](/plugins/hooks)
- [Agent harness 插件](/plugins/sdk-agent-harness)
- [诊断导出](/gateway/diagnostics)
- [轨迹导出](/tools/trajectory)
