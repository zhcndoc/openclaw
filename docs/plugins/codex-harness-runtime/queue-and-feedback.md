---
summary: "Codex 转弯和 Codex 反馈上传路径上的主动运行队列转向"
read_when:
  - "您正在将消息引导至活动的 Codex 运行"
  - "您正在本机 Codex 会话上运行 /diagnostics"
title: "Codex 队列引导和反馈上传"
sidebarTitle: "队列引导和反馈"
---

将消息发送到正在运行的 Codex 轮次，并上传带有诊断信息的 Codex 线程日志。 [Codex harness运行时 ](/plugins/codex-harness-runtime) 指南的一部分； [ 每个部分移动的位置](/plugins/codex-harness-runtime#where-each-section-moved) 列出每个部分。

## <a id="queue-steering"></a> 队列引导

活动运行的队列引导映射到 Codex app-server 的 `turn/steer`。在默认的 `messages.queue.mode: "steer"` 下，OpenClaw 会在配置的静默窗口内批处理 steer 模式的聊天消息，并按到达顺序将它们作为一个 `turn/steer` 请求发送。

内嵌图像和存储的附件保持其原始图像顺序。存储的图像使用与新一轮相同的水合作用、大小限制和文件系统限制。如果无法准备附件或转向被拒绝，则完整的消息将保留在队列中等待后续转向。准备和 `turn/steer` 确认并不确认成绩单承诺。发送到 Codex 且未确认抄本提交的消息不会自动重播。

当 Codex 确认抄本提交时，OpenClaw 会在引导用户消息之前保存已完成的可见辅助项目，包括工具或睡眠切换之前的项目。每个项目都保留自己的身份，因此以后的引导不会重复它。该历史前缀与该回合的最终答案选择是分开的。提交确认输入已进入历史记录；它并不能证明后续模型请求已读取它。

Codex 回顾和手动压实转弯可以拒绝同转弯转向。在这种情况下，OpenClaw 会等待活动运行完成，然后再启动提示。常规转弯内的自动压实可保持转向可用； Codex 缓冲下一个模型边界的输入。

当消息默认应排队而不是转向时，请使用 `/queue followup` 或 `/queue collect`。参见[转向队列](/concepts/queue-steering)。

## <a id="configuration-and-policy-warnings"></a> 配置和策略警告

关于未知 `ultrafast_mode` 功能要求的 Codex 警告在每个 OpenClaw 聊天会话中出现一次，包括在一个响应中爆发单独的本机通知。稍后轮流、重试和替换本机线程或应用程序服务器连接会重用聊天的收据。不同的文本、细节或诊断位置仍然会首先注意到。其他操作和政策警告以及卫报事件即使在措辞重复时也保持正常传递​​。

在聊天的现有插件拥有的会话状态中，收据包含哈希值，而不是私人策略名称或警告文本。它们在网关重启后仍能幸存。新聊天或实际重置会收到第一个警告，包括保留会话 ID 但轮换其生命周期修订版本的重置。隐身状态遵循聊天的现有进程生命周期契约；它不会复制到持久存储中。重置、删除或禁用插件时现有插件状态清理会清除收据。

只有成功的投影才会被承认。失败或被忽略的投影可以重试。存储故障或投影和接收持久性之间的崩溃可能会允许重复而不是隐藏看不见的警告。每个聊天最多保留此诊断的 256 个不同变体，而不会驱逐已确认的收据；其他变体仍然可见，但不会记住重复数据删除。

这改变了重复传递，而不是 Codex 功能支持或企业策略实施。托管应用程序服务器 Doctor 检查验证所选的二进制文件和版本；通过的结果并不证明 Codex 识别账户策略中的每个功能。

## <a id="diagnostic-log-warnings"></a> 诊断日志警告

如果 Codex 报告保存其诊断日志的进程范围故障，OpenClaw 会在 [Gateway 日志 ](/gateway/logging) 中以警告级别记录该通知。它会在收到时记录每个本机通知，而不是在共享该应用程序服务器的每个对话中重复它。新的应用程序服务器可以报告新的故障。

此路由不会修复本机日志记录故障或上传诊断。仅警告并不意味着对话状态丢失。其他特定于任务、配置和无法识别的警告仍然会到达聊天室。网关日志可见性遵循配置的日志记录级别和可用接收器。与其他网关诊断一样，报告是尽最大努力：日志记录故障永远不会中断本机连接，并且这些仅限操作员的通知不会回退到聊天。

## <a id="codex-feedback-upload"></a> Codex 反馈上传

当在原生 Codex 运行环境中某个会话的 `/diagnostics [note]` 获得批准时，OpenClaw 还会为相关的 Codex 线程调用 Codex app-server 的 `feedback/upload`，包括每个列出的线程的日志，以及在可用时生成的 Codex 子线程。

上传通过 Codex 的正常反馈路径到达 OpenAI 服务器。如果在该应用程序服务器中禁用 Codex 反馈，则该命令将返回应用程序服务器错误。完成的诊断回复列出了已发送线程的通道、OpenClaw 会话 ID、Codex 线程 ID 和本地 `codex resume <thread-id>` 命令。

如果您拒绝或忽略批准，OpenClaw 不会打印这些 Codex id，也不会发送 Codex 反馈。上传不会替换本地网关诊断导出。请参阅 [Diagnostics 导出 ](/gateway/diagnostics) 了解批准、隐私、本地捆绑和群聊行为。

仅当你想为当前附加的线程上传 Codex 反馈、而不需要完整的 Gateway diagnostics 捆绑包时，才使用 `/codex diagnostics [note]`。
