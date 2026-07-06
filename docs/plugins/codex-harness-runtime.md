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

提示路由遵循所选运行时，而不只是 provider 字符串。原生 Codex 回合会获得 Codex 应用服务器开发者指令；显式的 OpenClaw 兼容路由即使使用带有 Codex 风格的 OpenAI 认证或传输方式，也会保留正常的 OpenClaw 系统提示词。

OpenClaw 启动和恢复原生 Codex 线程时，会禁用 Codex 内置个性（`personality: "none"`），这样工作区个性文件和 OpenClaw 代理身份仍然保持权威。原生 Codex 仍会保留 Codex 拥有的 base/model 指令和项目文档加载。轻量级 OpenClaw 运行（例如 cron）仍会抑制项目文档加载。

OpenClaw 开发者指令涵盖 OpenClaw 运行时相关事项：源通道投递、OpenClaw 动态工具、ACP 委派、适配器上下文，以及当前代理的工作区配置文件。技能目录和通过工具路由的 `MEMORY.md` 指针会作为按回合作用域的协作开发者指令进行投影。当记忆工具不可用时，活动的 `BOOTSTRAP.md` 内容和完整的 `MEMORY.md` 会改为作为普通回合输入上下文。

## 线程绑定和模型变更

当 OpenClaw 会话附加到现有的 Codex 线程时，下一轮会将当前选定的模型、审批策略、沙箱、审批审查者和服务层重新发送到 app-server。从 `openai/gpt-5.5` 切换到 `openai/gpt-5.2` 会保留线程绑定，但会要求 Codex 使用新选择的模型继续。

## 可见回复和心跳

通过 Codex harness 进行的直接/源聊天轮次，默认会自动将最终的助手回复交付给内部 WebChat 界面，这与 Pi harness 协议一致：代理正常回复，OpenClaw 会将最终文本发布到源对话中。将 `messages.visibleReplies: "message_tool"` 设置为仅在代理调用 `message(action="send")` 时才向外公开最终的助手文本。

Codex 心跳轮次默认会在可搜索的 OpenClaw 工具目录中包含 `heartbeat_respond`，这样代理就可以记录唤醒应保持静默还是发出通知。心跳主动性指导会作为 Codex 协作模式的开发者指令发送，并且仅作用于该心跳轮次；普通聊天轮次则保持在 Codex 默认模式中。当 `HEARTBEAT.md` 非空时，心跳指令会将 Codex 指向该文件，而不是内联其内容。

## 钩子边界

| 层级                                 | 归属方                  | 目的                                                                |
| ------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| OpenClaw 插件钩子                    | OpenClaw               | OpenClaw 和 Codex harness 之间的产品/插件兼容性。   |
| Codex app-server 扩展中间件          | OpenClaw bundled plugins | 围绕 OpenClaw 动态工具的每回合适配器行为。            |
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

对于 OpenClaw 动态工具，OpenClaw 会在 Codex 请求调用之后执行
该工具，因此插件和中间件行为会在 harness 适配器中运行。对于
Codex 原生工具，Codex 拥有规范性的工具记录；OpenClaw 可以镜像
选定事件，但除非 Codex 通过 app-server 或原生钩子回调暴露该能力，否则无法重写原生线程。

Codex app-server 的 report-mode `PreToolUse` 事件会将插件审批延后到
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

## v1 支持契约

Codex runtime v1 中支持：

| Surface                                       | Support                                                                          | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通过 Codex 的 OpenAI 模型循环               | 支持                                                                        | Codex app-server 负责 OpenAI 回合、原生线程恢复和原生工具续接。                                                                                                                                                                                                                                                                                                                                                                                                                  |
| OpenClaw 通道路由和投递         | 支持                                                                        | Telegram、Discord、Slack、WhatsApp、iMessage 和其他通道都位于模型运行时之外。                                                                                                                                                                                                                                                                                                                                                                                    |
| OpenClaw 动态工具                        | 支持                                                                        | Codex 会请求 OpenClaw 执行这些工具，因此 OpenClaw 仍处于执行路径中。                                                                                                                                                                                                                                                                                                                                                                                                |
| 提示和上下文插件                    | 支持                                                                        | OpenClaw 将 OpenClaw 特定的提示/上下文投射到 Codex 回合中，同时将由 Codex 所有的基础、模型和已配置的项目文档提示保留在原生 Codex 通道中。OpenClaw 会为原生线程禁用 Codex 的内置个性，使代理工作区个性文件保持权威。原生 Codex 开发者指令只接受明确限定为 `codex_app_server` 的命令指导；旧的全局命令提示仍保留给非 Codex 提示面。 |
| 上下文引擎生命周期                      | 支持                                                                        | 组装、摄取以及回合后的维护都在 Codex 回合周围运行。上下文引擎不会替代原生 Codex 压缩。                                                                                                                                                                                                                                                                                                                                                        |
| 动态工具钩子                            | 支持                                                                        | `before_tool_call`、`after_tool_call` 和工具结果中间件围绕 OpenClaw 所有的动态工具运行。                                                                                                                                                                                                                                                                                                                                                                          |
| 生命周期钩子                               | 作为适配器观察支持                                                | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 会使用真实的 Codex 模式载荷触发。                                                                                                                                                                                                                                                                                                                                                           |
| 最终答案修订门控                    | 通过原生钩子转发支持                                              | Codex `Stop` 会转发到 `before_agent_finalize`；`revise` 会在最终化前要求 Codex 再进行一次模型推理。                                                                                                                                                                                                                                                                                                                                                                |
| 原生 shell、patch 和 MCP 阻止或观察 | 通过原生钩子转发支持                                              | 对于已提交的原生工具面，包括 Codex app-server `0.125.0` 或更新版本上的 MCP 载荷，Codex `PreToolUse` 和 `PostToolUse` 会被转发。支持阻止；不支持参数重写。                                                                                                                                                                                                                                                                               |
| 原生权限策略                      | 通过 Codex app-server 审批和兼容性原生钩子转发支持 | Codex app-server 审批请求会在 Codex 审查后经由 OpenClaw 路由。`PermissionRequest` 原生钩子转发对原生审批模式是可选的，因为 Codex 会在守护者审查之前发出它。                                                                                                                                                                                                                                                                          |
| App-server 轨迹捕获                 | 支持                                                                        | OpenClaw 会记录其发送给 app-server 的请求以及它收到的 app-server 通知。                                                                                                                                                                                                                                                                                                                                                                                    |

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

当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具批准询问会通过 OpenClaw 的插件批准流程进行路由。Codex 的 `request_user_input` 提示会被发送回发起的聊天，而下一个排队的后续消息会回答该原生服务器请求，而不是被当作额外上下文进行引导。其他 MCP 询问请求会直接失败。

关于承载这些提示的一般插件批准流程，请参见
[插件权限请求](/plugins/plugin-permission-requests)。

## 队列引导

活动运行的队列引导映射到 Codex app-server 的 `turn/steer`。在默认的 `messages.queue.mode: "steer"` 下，OpenClaw 会在配置的静默窗口内批处理 steer 模式的聊天消息，并按到达顺序将它们作为一个 `turn/steer` 请求发送。

Codex review 和手动压缩 turn 可以拒绝同轮 steering。在这种情况下，OpenClaw 会等待当前运行完成后再开始提示词。消息需要默认排队而不是 steering 时，请使用 `/queue followup` 或 `/queue collect`。参见 [Steering queue](/concepts/queue-steering)。

## Codex 反馈上传

当在原生 Codex 运行环境中某个会话的 `/diagnostics [note]` 获得批准时，OpenClaw 还会为相关的 Codex 线程调用 Codex app-server 的 `feedback/upload`，包括每个列出的线程的日志，以及在可用时生成的 Codex 子线程。

上传会通过 Codex 的正常反馈路径发送到 OpenAI 服务器。如果该 app-server 中禁用了 Codex 反馈，命令会返回 app-server 错误。完成的 diagnostics 回复会列出这些被发送的线程的频道、OpenClaw 会话 id、Codex 线程 id，以及本地的 `codex resume <thread-id>` 命令。

如果你拒绝或忽略该批准，OpenClaw 不会打印这些 Codex id，也不会发送 Codex 反馈。该上传不会替代本地的 Gateway diagnostics 导出。有关批准、隐私、本地捆绑包和群聊行为，请参见 [Diagnostics export](/gateway/diagnostics)。

仅当你想为当前附加的线程上传 Codex 反馈、而不需要完整的 Gateway diagnostics 捆绑包时，才使用 `/codex diagnostics [note]`。

## 压缩和转录镜像

当所选模型使用 Codex harness 时，原生线程压缩属于 Codex app-server。OpenClaw 不会为 Codex 轮次运行预检压缩，不会用 context-engine 压缩替换 Codex 压缩，也不会在无法启动原生压缩时回退到 OpenClaw 或公共 OpenAI 摘要。OpenClaw 会为通道历史、搜索、`/new`、`/reset` 以及未来的模型或 harness 切换保留一份转录镜像。

显式压缩请求，例如 `/compact` 或插件请求的手动 compact 操作，会使用 `thread/compact/start` 启动原生 Codex 压缩。OpenClaw 会保持请求和共享客户端租约处于打开状态，直到 Codex 发出匹配的 `contextCompaction` 完成项，然后将该压缩轮次报告为已完成。如果该终止轮次超过了配置的压缩超时时间，OpenClaw 会请求原生轮次中断。租约和每线程压缩栅栏会一直保持，直到 Codex 报告终止状态或确认中断 RPC。如果 Codex 未在中断宽限期内确认，OpenClaw 会在释放栅栏之前退役该连接。远程连接也会解除匹配的线程绑定，因此后续工作不会与未确认的远程轮次重叠。退役连接上的其他轮次会失败，并且可以在新的客户端上重试。客户端关闭、请求取消或失败的压缩轮次会返回操作失败。自动的上下文压力压缩是 Codex 的职责；OpenClaw 只会为手动请求的触发器启动原生压缩。

当上下文引擎请求 Codex 线程引导投影时，OpenClaw 会将工具调用名称和 id、输入形状以及已脱敏的工具结果内容投影到新的 Codex 线程中。它不会将原始工具调用参数值复制到该投影中。

该镜像包括用户提示、最终助手文本，以及当 app-server 发出时的轻量级 Codex 推理或计划记录。OpenClaw 会记录原生压缩的开始和终止状态，但它不会公开可供人阅读的压缩摘要，也不会公开一个可审计的列表，说明 Codex 在压缩后保留了哪些条目。

由于 Codex 拥有规范的原生线程，`tool_result_persist` 不会重写 Codex 原生的工具结果记录。它只在 OpenClaw 写入由 OpenClaw 拥有的会话转录工具结果时生效。

## 媒体和交付

OpenClaw 继续负责媒体交付和媒体提供方选择。图像、
视频、音乐、PDF、TTS 和媒体理解使用匹配的提供方/模型
设置，例如 `agents.defaults.imageGenerationModel`、
`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

文本、图像、视频、音乐、TTS、审批以及消息工具输出继续
通过正常的 OpenClaw 交付路径；媒体生成不需要
旧版运行时。当 Codex 发出一个带有 `savedPath` 的原生图像生成项时，OpenClaw 会通过正常的回复媒体
路径转发该确切文件，即使该 Codex 回合没有助理文本。

## 相关内容

- [Codex harness](/plugins/codex-harness)
- [Codex harness 参考](/plugins/codex-harness-reference)
- [原生 Codex 插件](/plugins/codex-native-plugins)
- [插件 hooks](/plugins/hooks)
- [Agent harness 插件](/plugins/sdk-agent-harness)
- [诊断导出](/gateway/diagnostics)
- [轨迹导出](/tools/trajectory)
