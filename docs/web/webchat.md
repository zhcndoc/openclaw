---
summary: "Loopback WebChat 静态主机和 Gateway WS 的聊天 UI 用法"
read_when:
  - 调试或配置 WebChat 访问
title: "WebChat"
---

状态：macOS/iOS 的 SwiftUI 聊天 UI 直接连接到 Gateway WebSocket。不使用内嵌浏览器，也不使用本地静态服务器。

## 它是什么

- 网关的原生聊天界面。
- 使用与其他渠道相同的会话和路由规则。
- 确定性路由：回复总是返回到 WebChat。
- 历史记录始终从网关获取（不进行本地文件监听）。如果网关无法访问，WebChat 将为只读。

## 快速开始

1. 启动网关。
2. 打开 WebChat UI（macOS/iOS 应用）或 Control UI 的聊天选项卡。
3. 确保已配置有效的网关认证路径（默认使用共享密钥，即使在回环地址上也是如此）。

## 工作原理

- UI 连接到 Gateway WebSocket，并使用 `chat.history`、`chat.send`、`chat.inject` 和 `chat.message.get` RPC 方法。
- `chat.history` 为稳定性做了限制：Gateway 可能会截断较长的文本字段、省略较重的元数据，并将超大条目替换为 `[chat.history omitted: message too large]`。API 客户端可按请求传入 `maxChars`，在单次调用中覆盖默认限制。
- 当 `chat.history` 中某条可见的助手消息被截断时，Control UI 可以打开侧边阅读器，并通过 `chat.message.get` 按需获取完整的、按显示规范归一化后的条目，而不会增加默认历史负载。`chat.message.get` 使用与 `chat.history` 相同的转写分支和显示规则，但按 `messageId` 定位单条记录，并在完整内容已无法返回时给出真实的不可用原因。
- `chat.history` 会遵循仅追加会话文件的当前活动转写分支，因此被放弃的重写分支和已被取代的提示副本不会在 WebChat 中渲染。
- 压缩条目会渲染为一个“Compacted history”分隔条，说明压缩后的转写已作为检查点保留，并提供打开会话检查点的操作（在权限允许时可进行分支或恢复）。
- Control UI 会记住 `chat.history` 返回的底层 Gateway `sessionId`，并在后续 `chat.send` 调用中带上它，因此重新连接和刷新页面会继续同一个已保存的对话，除非用户开始新会话或重置会话。
- 前台发送还会把渲染后的历史记录中显示分支的叶节点作为 `expectedLeafEntryId` 一并发送；如果另一个客户端先切换了分支，Control UI 会将消息暂存待审查，并刷新转写，而不是将其发布到新分支。重新连接和恢复出的 outbox 回放在与当前历史协调后，会有意省略这个前置条件。
- `chat.send` 接受一个幂等键（Control UI 使用 run id）；Gateway 会对复用相同键的重复请求去重，因此同一会话/消息/附件的重试或重复进行中的提交不会创建第二次运行。
- 回复特定消息（右键 → 回复）时，会将目标消息的转写 id 作为 `replyToId` 发送到 `chat.send`。Gateway 会从会话历史中解析该消息，并填充 Discord 回复所使用的同样的、与通道无关的回复上下文元数据：agent 会看到 `has_reply_context`，以及带有发送者标签和正文的、不受信任的“Reply target of current user message”区块。（webchat 提示会保留既有的字节稳定提示策略，将诸如 `reply_to_id` 之类的易变会话 id 抑制不显示，适用于直接 webchat 会话。）没有持久化转写 id 的回复目标（例如待发送项）会回退为消息正文中的内联引用。
- 工作区启动文件和待处理的 `BOOTSTRAP.md` 指令通过 agent 系统提示的 `# Project Context` 部分提供，不会复制到 WebChat 用户消息中。如果 bootstrap 内容被截断，系统提示会改为提供一条简短的“Bootstrap Context Notice”；详细计数和配置开关则保留在诊断界面上。
- `chat.history` 上的显示归一化会剥离：仅运行时的 OpenClaw 上下文、入站信封包装、内联投递指令标签（如 `[[reply_to_current]]`、`[[reply_to:<id>]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 载荷（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`，包括被截断的块），以及泄漏的 ASCII/全角模型控制 token。整条可见文本仅为静默 token `NO_REPLY`（不区分大小写）的助手条目会被省略。
- 带有推理标记的回复载荷（`isReasoning: true`）会从 WebChat 助手内容、转写回放文本和音频内容块中排除，因此仅用于思考的载荷不会以可见助手消息或可播放音频的形式出现。
- `chat.inject` 会直接向转写追加一条助手注释，并广播到 UI（不触发 agent 运行）。
- 被中止的运行可能会让部分助手输出在 UI 中保持可见。若存在已缓冲的输出，Gateway 会将这段部分文本持久化到转写历史中，并用中止元数据标记该条目。

### 转写与投递模型

WebChat 有两条独立的数据路径：

- SQLite 转写行是持久化的模型/运行时转写。对于正常的 agent 运行，嵌入式 OpenClaw 运行时会通过 session accessor 持久化模型可见的 `user`、`assistant` 和 `toolResult` 消息。WebChat 不会将任意投递内容、状态内容或辅助文本写入该转写。
- Gateway `ReplyPayload` 事件是实时投递投影：针对 WebChat/频道显示、块流式传输、指令标签、媒体嵌入、TTS/音频标志以及 UI 回退行为进行归一化。它们本身并不是规范化的会话日志。
- 需要通过 `tools.message` 显示回复的 harness 仍然使用 WebChat 作为当前运行的内部源回复汇。来自该活动 WebChat 运行的无目标 `message.send` 会投影到同一聊天中并镜像到会话转写；WebChat 不会变成可复用的出站通道，也永远不会继承 `lastChannel`。
- 只有当 Gateway 拥有一个正常嵌入式 agent 回合之外的已显示消息时，WebChat 才会注入助手转写条目：`chat.inject`、非 agent 命令回复、中止的部分输出，以及 WebChat 管理的媒体转写补充。
- 如果运行期间实时助手文本出现了，但在历史记录重新加载后消失，请按以下顺序检查：SQLite 转写是否包含该助手文本，`chat.history` 显示投影是否将其剥离，然后再看 Control UI 的乐观尾部合并是否用持久化快照替换了本地投递状态。

正常的 agent 运行最终答案应该是持久化的，因为嵌入式运行时会写入助手 `message_end`。任何将已投递的最终载荷回镜到转写中的回退逻辑，都必须先避免重复写入嵌入式运行时已经写过的助手回合。

## Control UI agents 工具面板

- Control UI 的 `/agents` 工具面板有一个“当前可用”视图，由 `tools.effective(sessionKey=...)` 支持：这是一个由服务器生成的、只读的当前会话工具库存投影，包含核心、插件、channel-owned，以及已发现的 MCP 服务器工具。
- 另有一个用于编辑配置的视图（由 `tools.catalog` 支持），涵盖 profiles、按 agent 的覆盖，以及 catalog 语义。
- 运行时可用性以会话为作用域。在同一个 agent 上切换会话可能会改变“当前可用”列表。如果已配置的 MCP 服务器自上次发现以来尚未连接或发生变化，面板会显示提示，而不会在读取路径中静默启动 MCP transports。
- 配置编辑器并不意味着运行时可用；实际生效的访问仍遵循策略优先级（`allow`/`deny`、按 agent 以及 provider/channel 覆盖）。

## 远程使用

- 远程模式通过 SSH/Tailscale 隧道转发 gateway WebSocket。
- 你不需要运行单独的 WebChat 服务器。

## 配置参考（WebChat）

完整配置：[配置](/gateway/configuration)

WebChat 没有持久化的配置部分。Gateway 使用内置的 `chat.history` 显示限制；API 客户端可以为单次调用发送 `maxChars` 来覆盖它。旧版的 `channels.webchat` 和 `gateway.webchat` 配置已弃用；运行 `openclaw doctor --fix` 将其移除。

相关全局选项：

- `gateway.port`, `gateway.bind`：WebSocket 主机/端口。
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`：
  共享密钥 WebSocket 认证。
- `gateway.auth.allowTailscale`：在启用时，浏览器 Control UI 聊天标签页可以使用 Tailscale
  Serve 身份头。
- `gateway.auth.mode: "trusted-proxy"`：用于位于具备身份感知的 **non-loopback** 代理源之后的浏览器客户端的反向代理认证（参见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`：远程 gateway 目标。
- `session.*`：会话存储和主键默认值。

## 相关内容

- [控制 UI](/web/control-ui)
- [仪表盘](/web/dashboard)
