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
除非当前的 OpenClaw 上下文引擎声明自己负责压缩，否则 Codex 负责规范化的原生线程、
原生模型循环、原生工具续接以及原生压缩。

## 线程绑定和模型变更

当 OpenClaw 会话附加到一个现有的 Codex 线程时，下一轮会再次将当前选定的 OpenAI 模型、审批策略、沙箱和服务
等级发送给 app-server。从 `openai/gpt-5.5` 切换到
`openai/gpt-5.2` 会保留线程绑定，但会要求 Codex 使用
新选择的模型继续。

## 可见回复和心跳

当某个来源聊天回合通过 Codex harness 运行时，如果部署没有明确配置
`messages.visibleReplies`，可见回复默认使用 OpenClaw 的 `message` 工具。
代理仍然可以私下完成其 Codex 回合；只有当它调用
`message(action="send")` 时，才会发布到通道。设置 `messages.visibleReplies: "automatic"` 以保持直接聊天的最终回复走
传统的自动投递路径。

Codex 心跳回合默认也会在可搜索的 OpenClaw
工具目录中获得 `heartbeat_respond`，因此代理可以记录唤醒应保持安静还是通知，而无需把该控制流编码进最终文本中。

心跳相关的主动性指导会在心跳回合本身作为 Codex 协作模式的
开发者指令发送。普通聊天回合会恢复为 Codex Default 模式，而不是在其正常
运行时提示中携带心跳理念。

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

| 表面                                         | 支持情况                                                                        | 原因                                                                                                                                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通过 Codex 的 OpenAI 模型循环               | 支持                                                                            | Codex app-server 负责 OpenAI 回合、原生线程恢复和原生工具续接。                                                                                                                                            |
| OpenClaw 通道路由和投递                      | 支持                                                                            | Telegram、Discord、Slack、WhatsApp、iMessage 和其他通道都保持在模型运行时之外。                                                                                                                           |
| OpenClaw 动态工具                           | 支持                                                                            | Codex 会请求 OpenClaw 执行这些工具，因此 OpenClaw 仍处于执行路径中。                                                                                                                                       |
| 提示词和上下文插件                          | 支持                                                                            | OpenClaw 在启动或恢复线程之前构建提示词覆盖层，并将上下文投影到 Codex 回合中。                                                                                                                             |
| 上下文引擎生命周期                          | 支持                                                                            | 针对 Codex 回合会运行组装、摄取、回合后维护以及上下文引擎压缩协调。                                                                                                                                         |
| 动态工具钩子                                | 支持                                                                            | `before_tool_call`、`after_tool_call` 和工具结果中间件围绕 OpenClaw 拥有的动态工具运行。                                                                                                                   |
| 生命周期钩子                                | 作为适配器观察而支持                                                            | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 会以真实的 Codex 模式载荷触发。                                                                                           |
| 最终答案修订门槛                            | 通过原生钩子转发支持                                                            | Codex `Stop` 会转发到 `before_agent_finalize`；`revise` 会在最终定稿前请求 Codex 再进行一次模型推演。                                                                                                         |
| 原生 shell、patch 和 MCP 阻止或观察          | 通过原生钩子转发支持                                                            | Codex `PreToolUse` 和 `PostToolUse` 会针对已提交的原生工具表面进行转发，包括 Codex app-server `0.125.0` 或更新版本上的 MCP 载荷。支持阻止；不支持参数重写。                                              |
| 原生权限策略                                | 通过 Codex app-server 审批和兼容性原生钩子转发支持                               | Codex app-server 审批请求在 Codex 审查后通过 OpenClaw 路由。`PermissionRequest` 原生钩子转发对原生审批模式是可选加入的，因为 Codex 会在守护者审查之前发出它。                                          |
| app-server 轨迹捕获                         | 支持                                                                            | OpenClaw 会记录其发送给 app-server 的请求以及收到的 app-server 通知。                                                                                                                                         |

Codex runtime v1 中不支持：

| 表面                                               | v1 边界                                                                                                                        | 未来路径                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 原生工具参数变更                                   | Codex 原生预工具钩子可以阻止，但 OpenClaw 不会重写 Codex 原生工具参数。                                                       | 需要 Codex 钩子/模式支持替换工具输入。                                                 |
| 可编辑的 Codex 原生转录历史                         | Codex 拥有规范化的原生线程历史。OpenClaw 拥有镜像并可以投影未来上下文，但不应修改不受支持的内部结构。                         | 如果需要对原生线程进行改写，则添加显式的 Codex app-server API。                       |
| `tool_result_persist` 适用于 Codex 原生工具记录     | 该钩子转换的是 OpenClaw 拥有的转录写入，而不是 Codex 原生工具记录。                                                            | 可以镜像转换后的记录，但规范性重写需要 Codex 支持。                                     |
| 丰富的原生压缩元数据                               | OpenClaw 可以观察压缩开始和完成，但不会收到稳定的保留/丢弃列表、token 差值或摘要载荷。                                          | 需要更丰富的 Codex 压缩事件。                                                           |
| 压缩干预                                           | 当前 OpenClaw 在 Codex 模式下的压缩钩子仅为通知级别。                                                                           | 如果插件需要否决或重写原生压缩，则添加 Codex 预/后压缩钩子。                           |
| 按字节捕获模型 API 请求                             | OpenClaw 可以捕获 app-server 请求和通知，但 Codex 核心会在内部构建最终的 OpenAI API 请求。                                      | 需要 Codex 模型请求跟踪事件或调试 API。                                                |

## 原生权限和 MCP 询问

对于 `PermissionRequest`，OpenClaw 仅在策略作出决定时返回明确的允许或拒绝决策。无决策结果不等于允许。Codex 将其视为没有 hook 决策，并继续走其自身的 guardian 或用户批准路径。

Codex app-server 的批准模式默认省略此原生 hook。当 `permission_request` 被显式包含在 `nativeHookRelay.events` 中，或者兼容性运行时安装了它时，此行为同样适用。

当操作员为 Codex 原生权限请求选择 `allow-always` 时，OpenClaw 会记住该精确的 provider/session/tool input/cwd 指纹，保留在一个有边界的会话窗口内。被记住的决策是刻意的精确匹配：命令、参数、工具负载或 cwd 任一发生变化，都会触发新的批准。

当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具批准询问会通过 OpenClaw 的插件批准流程进行路由。Codex `request_user_input` 提示会发送回发起聊天，并且下一条排队的后续消息会回答该原生服务器请求，而不是被当作额外上下文来引导。其他 MCP 询问请求会失败并关闭。

## 队列引导

活动运行的队列引导映射到 Codex app-server 的 `turn/steer`。在默认的 `messages.queue.mode: "steer"` 下，OpenClaw 会在配置的静默窗口内批处理 steer 模式的聊天消息，并按到达顺序将它们作为一个 `turn/steer` 请求发送。

Codex 审阅和手动压缩回合可以拒绝同回合引导。在这种情况下，OpenClaw 会等待当前运行完成后再启动提示。当消息默认应排队而不是引导时，请使用 `/queue followup` 或 `/queue collect`。参见 [Steering queue](/concepts/queue-steering)。

## Codex 反馈上传

当在使用原生 Codex harness 的会话中批准 `/diagnostics [note]` 时，OpenClaw 也会为相关的 Codex 线程调用 Codex app-server 的 `feedback/upload`。该上传会请求 app-server 在可用时为每个列出的线程以及生成的 Codex 子线程包含日志。

上传会通过 Codex 的常规反馈路径发送到 OpenAI 服务器。如果该 app-server 中禁用了 Codex feedback，则命令会返回 app-server 错误。完成的 diagnostics 回复会列出通道、OpenClaw 会话 id、Codex 线程 id，以及已发送线程的本地 `codex resume <thread-id>` 命令。

如果你拒绝或忽略该批准，OpenClaw 不会打印这些 Codex id，也不会发送 Codex feedback。该上传不会替代本地 Gateway diagnostics 导出。有关批准、隐私、本地 bundle 和群聊行为，请参见 [Diagnostics export](/gateway/diagnostics)。

仅当你特别想要为当前附加线程进行 Codex feedback 上传，而不需要完整的 Gateway diagnostics bundle 时，才使用 `/codex diagnostics [note]`。

## 压缩和转录镜像

当所选模型使用 Codex harness 时，原生线程压缩会委托给 Codex app-server，除非某个活动上下文引擎声明 `ownsCompaction: true`。拥有压缩职责的上下文引擎会先执行压缩，并促使 OpenClaw 放弃旧的 Codex 后端线程，以便下一轮能够从引擎管理的上下文中重新恢复一个新的线程。OpenClaw 会保留一份转录镜像，用于频道历史、搜索、`/new`、`/reset`，以及未来的模型或 harness 切换。

当某个上下文引擎请求 Codex 线程引导投影时，OpenClaw 会将工具调用的名称和 id、输入形状，以及经过脱敏的工具结果内容投影到新的 Codex 线程中。它不会把原始的工具调用参数值复制到该投影里。

该镜像包含用户提示、最终助手文本，以及当 app-server 发出时的轻量级 Codex 推理或计划记录。如今，OpenClaw 仅记录原生压缩的开始和完成信号。它尚未暴露可供人阅读的压缩摘要，也未暴露一份可审计的列表来说明 Codex 在压缩后保留了哪些条目。

由于 Codex 拥有规范的原生线程，`tool_result_persist` 目前不会重写 Codex 原生的工具结果记录。它仅在 OpenClaw 正在写入 OpenClaw 自有会话转录工具结果时生效。

## 媒体和交付

OpenClaw 继续负责媒体交付和媒体提供方选择。图像、视频、音乐、PDF、TTS 和媒体理解会使用匹配的提供方/模型设置，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

文本、图像、视频、音乐、TTS、批准以及消息工具输出都会继续通过正常的 OpenClaw 交付路径。媒体生成不需要 PI。当 Codex 发出带有 `savedPath` 的原生图像生成项时，OpenClaw 会通过正常的回复媒体路径转发该精确文件，即使 Codex 回合没有助手文本也是如此。

## 相关内容

- [Codex harness](/plugins/codex-harness)
- [Codex harness reference](/plugins/codex-harness-reference)
- [Native Codex plugins](/plugins/codex-native-plugins)
- [Plugin hooks](/plugins/hooks)
- [Agent harness plugins](/plugins/sdk-agent-harness)
- [Diagnostics export](/gateway/diagnostics)
- [Trajectory export](/tools/trajectory)
