---
summary: "Codex harness 的运行时边界、钩子、工具、权限和诊断"
title: "Codex harness 运行时"
read_when:
  - 你需要 Codex harness 运行时支持契约
  - 你正在调试原生 Codex 工具、钩子、压缩或反馈上传
  - 你正在更改 PI 和 Codex harness 回合之间的插件行为
---

本文档说明 Codex harness 回合的运行时契约。关于设置和
路由，请先阅读 [Codex harness](/plugins/codex-harness)。关于配置字段，
请参阅 [Codex harness reference](/plugins/codex-harness-reference)。

## 概览

Codex 模式并不是 PI，只是在底层换了一个不同的模型调用。Codex 拥有更多
原生模型循环的控制权，而 OpenClaw 围绕这一边界调整其插件、工具、会话和
诊断相关接口。

OpenClaw 仍然负责通道路由、会话文件、可见消息投递、
OpenClaw 动态工具、审批、媒体投递以及转录镜像。
Codex 负责规范化的原生线程、原生模型循环、原生工具
续接以及原生压缩。

提示路由遵循所选运行时，而不只是提供方字符串。原生 Codex 回合会接收 Codex app-server 开发者指令，而显式的 PI 兼容路由即使使用 Codex 风格的 OpenAI 认证或传输，也会保留正常的 OpenClaw/PI 系统提示。

原生 Codex 会根据当前激活的 Codex 线程配置保留 Codex 所拥有的基础/模型指令和项目文档行为。OpenClaw 启动和恢复原生 Codex 线程时，会禁用 Codex 内置个性，因此工作区个性文件和 OpenClaw 代理身份仍然保持权威。轻量级 OpenClaw 运行仍然保留其现有的项目文档抑制。OpenClaw 开发者指令覆盖 OpenClaw 运行时相关事项，例如源通道投递、OpenClaw 动态工具、ACP 委派、适配器上下文，以及当前激活的代理工作区配置文件。OpenClaw 技能目录以及 `MEMORY.md` 和当前激活的 `BOOTSTRAP.md` 内容，会作为转回输入参考上下文投射给原生 Codex。

## 线程绑定和模型变更

当 OpenClaw 会话附加到一个现有的 Codex 线程时，下一轮会再次将当前选定的 OpenAI 模型、审批策略、沙箱和服务
等级发送给 app-server。从 `openai/gpt-5.5` 切换到
`openai/gpt-5.2` 会保留线程绑定，但会要求 Codex 使用
新选择的模型继续。

## 可见回复和心跳

当直接/源聊天回合通过 Codex harness 运行时，可见回复默认使用消息工具：最终助手文本保持私密，除非
代理调用 `message(action="send")`。这与 GPT 模型很契合，因为它们可以决定源通道输出是否有用。设置
`messages.visibleReplies: "automatic"` 可恢复旧模式，即最终
助手文本会自动发布。

Codex 心跳回合默认也会在可搜索的 OpenClaw
工具目录中获得 `heartbeat_respond`，因此代理可以记录唤醒应保持安静还是通知，而无需把该控制流编码进最终文本中。

心跳特定的主动性指导会在心跳回合本身作为 Codex 协作模式开发者指令发送。普通聊天回合会恢复 Codex 默认模式，而不是在其常规运行时提示中携带心跳哲学。当存在非空的 `HEARTBEAT.md` 时，心跳协作模式指令会指向该文件，而不是将其内容内联。

## 钩子边界

Codex harness 有三层钩子：

| 层级                                  | 所有者                   | 目的                                                             |
| ------------------------------------- | ------------------------ | ---------------------------------------------------------------- |
| OpenClaw 插件钩子                    | OpenClaw                 | 在 PI 和 Codex harness 之间保持产品/插件兼容性。                |
| Codex app-server 扩展中间件          | OpenClaw bundled plugins | 围绕 OpenClaw 动态工具的逐回合适配器行为。                        |
| Codex 原生钩子                       | Codex                    | 来自 Codex 配置的底层 Codex 生命周期和原生工具策略。             |

OpenClaw 不使用项目级或全局的 Codex `hooks.json` 文件来路由
OpenClaw 插件行为。对于受支持的原生工具和权限桥接，
OpenClaw 会按线程注入 Codex 配置，用于 `PreToolUse`、`PostToolUse`、
`PermissionRequest` 和 `Stop`。

当启用 Codex app-server 审批时，也就是 `approvalPolicy` 不是
`"never"` 时，默认注入的原生钩子配置会省略 `PermissionRequest`，以便
Codex 的 app-server 审查者和 OpenClaw 的审批桥接在审查后处理真实
升级。运维人员可以在需要兼容性转发时，显式将 `permission_request` 添加到
`nativeHookRelay.events` 中。

其他 Codex 钩子，如 `SessionStart` 和 `UserPromptSubmit`，仍然是
Codex 级别的控制。它们在 v1 契约中不会作为 OpenClaw 插件钩子暴露。

对于 OpenClaw 动态工具，OpenClaw 会在 Codex 请求调用后执行该工具，因此 OpenClaw 会触发其在
harness 适配器中负责的插件和中间件行为。对于 Codex 原生工具，Codex 负责规范化的工具记录。
OpenClaw 可以镜像部分事件，但除非 Codex 通过 app-server 或原生钩子
回调暴露该操作，否则它不能重写原生 Codex
线程。

Codex app-server 项目通知还会为未被
原生 `PostToolUse` 转发覆盖的原生工具完成提供异步 `after_tool_call`
观察。这些观察仅用于遥测和插件兼容性；它们不能阻塞、延迟或修改
原生工具调用。

压缩和 LLM 生命周期投影来自 Codex app-server
通知和 OpenClaw 适配器状态，而不是来自原生 Codex 钩子命令。OpenClaw 的
`before_compaction`、`after_compaction`、`llm_input` 和
`llm_output` 事件是适配器级观察，而不是对 Codex 内部请求或压缩载荷的逐字节捕获。

Codex 原生 `hook/started` 和 `hook/completed` app-server 通知会被
投影为 `codex_app_server.hook` 代理事件，用于轨迹记录和调试。
它们不会触发 OpenClaw 插件钩子。

## v1 支持契约

Codex runtime v1 中支持：

| Surface                                       | Support                                                                          | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI model loop through Codex               | 支持                                                                        | Codex app-server 负责 OpenAI 回合、原生线程恢复和原生工具续接。                                                                                                                                                                                                                                                                                                                                                                                          |
| OpenClaw channel routing and delivery         | 支持                                                                        | Telegram、Discord、Slack、WhatsApp、iMessage 和其他通道都位于模型运行时之外。                                                                                                                                                                                                                                                                                                                                                                                    |
| OpenClaw dynamic tools                        | 支持                                                                        | Codex 会请求 OpenClaw 执行这些工具，因此 OpenClaw 仍处于执行路径中。                                                                                                                                                                                                                                                                                                                                                                                                |
| Prompt and context plugins                    | 支持                                                                        | OpenClaw 将 OpenClaw 特定的提示/上下文投射到 Codex 回合中，同时将由 Codex 所有的基础、模型和已配置的项目文档提示保留在原生 Codex 通道中。OpenClaw 会为原生线程禁用 Codex 的内置个性，使代理工作区个性文件保持权威。原生 Codex 开发者指令只接受明确限定为 `codex_app_server` 的命令指导；旧的全局命令提示仍保留给非 Codex 提示面。 |
| Context engine lifecycle                      | 支持                                                                        | 组装、摄取以及回合后的维护都在 Codex 回合周围运行。上下文引擎不会替代原生 Codex 压缩。                                                                                                                                                                                                                                                                                                                                                        |
| Dynamic tool hooks                            | 支持                                                                        | `before_tool_call`、`after_tool_call` 和工具结果中间件围绕 OpenClaw 所有的动态工具运行。                                                                                                                                                                                                                                                                                                                                                                          |
| Lifecycle hooks                               | 作为适配器观察支持                                                | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 会使用真实的 Codex 模式载荷触发。                                                                                                                                                                                                                                                                                                                                                           |
| Final-answer revision gate                    | 通过原生钩子转发支持                                              | Codex `Stop` 会转发到 `before_agent_finalize`；`revise` 会在最终化前要求 Codex 再进行一次模型推理。                                                                                                                                                                                                                                                                                                                                                                |
| Native shell, patch, and MCP block or observe | 通过原生钩子转发支持                                              | 对于已提交的原生工具面，包括 Codex app-server `0.125.0` 或更新版本上的 MCP 载荷，Codex `PreToolUse` 和 `PostToolUse` 会被转发。支持阻止；不支持参数重写。                                                                                                                                                                                                                                                                               |
| Native permission policy                      | 通过 Codex app-server 审批和兼容性原生钩子转发支持 | Codex app-server 审批请求会在 Codex 审查后经由 OpenClaw 路由。`PermissionRequest` 原生钩子转发对原生审批模式是可选的，因为 Codex 会在守护者审查之前发出它。                                                                                                                                                                                                                                                                          |
| App-server trajectory capture                 | 支持                                                                        | OpenClaw 会记录其发送给 app-server 的请求以及它收到的 app-server 通知。                                                                                                                                                                                                                                                                                                                                                                                    |

Codex runtime v1 中不支持：

| Surface                                             | V1 boundary                                                                                                                                     | Future path                                                                               |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Native tool argument mutation                       | Codex 原生预工具钩子可以阻止，但 OpenClaw 不会重写 Codex 原生工具参数。                                               | 需要 Codex 钩子/模式支持来替换工具输入。                            |
| Editable Codex-native transcript history            | Codex 负责规范化的原生线程历史。OpenClaw 负责镜像并可以投射未来上下文，但不应修改不受支持的内部结构。 | 如果需要原生线程手术，请添加显式的 Codex app-server API。                    |
| `tool_result_persist` for Codex-native tool records | 该钩子转换的是 OpenClaw 所有的转录写入，而不是 Codex 原生工具记录。                                                           | 可以镜像转换后的记录，但规范化重写需要 Codex 支持。              |
| Rich native compaction metadata                     | OpenClaw 可以请求原生压缩，但不会收到稳定的保留/丢弃列表、令牌增量、完成摘要或摘要载荷。   | 需要更丰富的 Codex 压缩事件。                                                     |
| Compaction intervention                             | OpenClaw 不允许插件或上下文引擎否决、重写或替换原生 Codex 压缩。                                             | 如果插件需要否决或重写原生压缩，请添加 Codex 预/后压缩钩子。 |
| Byte-for-byte model API request capture             | OpenClaw 可以捕获 app-server 请求和通知，但 Codex 核心会在内部构建最终的 OpenAI API 请求。                      | 需要一个 Codex 模型请求跟踪事件或调试 API。                                   |

## 原生权限和 MCP 询问

对于 `PermissionRequest`，OpenClaw 仅在策略作出决定时返回明确的允许或拒绝决策。无决策结果不等于允许。Codex 将其视为没有 hook 决策，并继续走其自身的 guardian 或用户批准路径。

Codex app-server 的批准模式默认省略此原生 hook。当 `permission_request` 被显式包含在 `nativeHookRelay.events` 中，或者兼容性运行时安装了它时，此行为同样适用。

当操作员为 Codex 原生权限请求选择 `allow-always` 时，OpenClaw 会记住该精确的 provider/session/tool input/cwd 指纹，保留在一个有边界的会话窗口内。被记住的决策是刻意的精确匹配：命令、参数、工具负载或 cwd 任一发生变化，都会触发新的批准。

当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具批准询问会通过 OpenClaw 的插件批准流程进行路由。Codex `request_user_input` 提示会发送回发起聊天，并且下一条排队的后续消息会回答该原生服务器请求，而不是被当作额外上下文来引导。其他 MCP 询问请求会失败并关闭。

关于承载这些提示的一般插件批准流程，请参见
[插件权限请求](/plugins/plugin-permission-requests)。

## 队列引导

活动运行的队列引导映射到 Codex app-server 的 `turn/steer`。在默认的 `messages.queue.mode: "steer"` 下，OpenClaw 会在配置的静默窗口内批处理 steer 模式的聊天消息，并按到达顺序将它们作为一个 `turn/steer` 请求发送。

Codex 审阅和手动压缩回合可以拒绝同回合引导。在这种情况下，OpenClaw 会等待当前运行完成后再启动提示。当消息默认应排队而不是引导时，请使用 `/queue followup` 或 `/queue collect`。参见 [引导队列](/concepts/queue-steering)。

## Codex 反馈上传

当在使用原生 Codex harness 的会话中批准 `/diagnostics [note]` 时，OpenClaw 也会为相关的 Codex 线程调用 Codex app-server 的 `feedback/upload`。该上传会请求 app-server 在可用时为每个列出的线程以及生成的 Codex 子线程包含日志。

上传会通过 Codex 的常规反馈路径发送到 OpenAI 服务器。如果该 app-server 中禁用了 Codex feedback，则命令会返回 app-server 错误。完成的 diagnostics 回复会列出通道、OpenClaw 会话 id、Codex 线程 id，以及已发送线程的本地 `codex resume <thread-id>` 命令。

如果你拒绝或忽略该批准，OpenClaw 不会打印这些 Codex id，也不会发送 Codex feedback。该上传不会替代本地 Gateway diagnostics 导出。有关批准、隐私、本地 bundle 和群聊行为，请参见 [Diagnostics export](/gateway/diagnostics)。

仅当你特别想要为当前附加线程进行 Codex feedback 上传，而不需要完整的 Gateway diagnostics bundle 时，才使用 `/codex diagnostics [note]`。

## 压缩和转录镜像

当所选模型使用 Codex harness 时，原生线程压缩属于 Codex app-server。OpenClaw 不会为 Codex 回合运行预检压缩，不会用 context-engine 压缩替代 Codex 压缩，也不会在无法启动原生 Codex 压缩时回退到 OpenClaw 或公开的 OpenAI 摘要。OpenClaw 会保留一份转录镜像，用于通道历史、搜索、`/new`、`/reset` 以及未来的模型或 harness 切换。

显式压缩请求，例如 `/compact` 或插件请求的手动压缩操作，会使用 `thread/compact/start` 启动原生 Codex 压缩。OpenClaw 在启动该原生操作后就会返回。它不会等待完成，不会施加单独的 OpenClaw 超时，不会重启共享的 Codex app-server，也不会将该操作记录为由 OpenClaw 完成的压缩。

当某个上下文引擎请求 Codex 线程引导投影时，OpenClaw 会将工具调用的名称和 id、输入形状，以及经过脱敏的工具结果内容投影到新的 Codex 线程中。它不会把原始的工具调用参数值复制到该投影里。

转录镜像包括用户提示、最终助手文本，以及 app-server 发出时的轻量级 Codex 推理或计划记录。当前，OpenClaw 仅在请求压缩时记录显式的原生压缩启动信号。它不会暴露人类可读的压缩摘要，也不会提供一份可审计的清单来说明 Codex 在压缩后保留了哪些条目。

由于 Codex 拥有规范的原生线程，`tool_result_persist` 目前不会重写 Codex 原生的工具结果记录。它仅在 OpenClaw 正在写入 OpenClaw 自有会话转录工具结果时生效。

## 媒体和交付

OpenClaw 继续负责媒体交付和媒体提供方选择。图像、视频、音乐、PDF、TTS 和媒体理解会使用匹配的提供方/模型设置，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

文本、图像、视频、音乐、TTS、批准以及消息工具输出都会继续通过正常的 OpenClaw 交付路径。媒体生成不需要 PI。当 Codex 发出带有 `savedPath` 的原生图像生成项时，OpenClaw 会通过正常的回复媒体路径转发该精确文件，即使 Codex 回合没有助手文本也是如此。

## 相关内容

- [Codex harness](/plugins/codex-harness)
- [Codex harness 参考](/plugins/codex-harness-reference)
- [原生 Codex 插件](/plugins/codex-native-plugins)
- [插件 hooks](/plugins/hooks)
- [Agent harness 插件](/plugins/sdk-agent-harness)
- [Diagnostics export](/gateway/diagnostics)
- [Trajectory export](/tools/trajectory)
