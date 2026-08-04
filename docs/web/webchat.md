---
summary: "通过 Gateway WebSocket 使用原生和控制 UI WebChat"
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
- `chat.history` 为稳定性设置了边界：Gateway 可能会截断较长的文本字段、省略较重的元数据，并将过大的条目替换为 `[chat.history omitted: message too large]`。API 客户端可以发送每个请求专用的 `maxChars`，以覆盖单次调用的默认限制。
- 当可见的助手消息在 `chat.history` 中被截断时，**显示更多**会通过 `chat.message.get` 内联获取完整的显示规范化条目，而不会增加默认历史记录载荷。**显示更少**会恢复截断后的预览，并在下一次展开时复用已获取的内容。`chat.message.get` 使用与 `chat.history` 相同的转录分支和显示规则，但通过 `messageId` 定位单个条目；当完整内容无法再返回时，会返回明确的不可用原因。
- `chat.history` 会遵循仅追加会话文件的活动转录分支，因此已放弃的重写分支和已被替代的提示副本不会在 WebChat 中呈现。
- 压缩条目会呈现为“已压缩的历史记录”分隔线，说明已压缩的转录会作为检查点保留，并提供打开会话检查点的操作（在权限允许时可进行分支或恢复）。
- Control UI 会记住 `chat.history` 返回的后端 Gateway `sessionId`，并在后续的 `chat.send` 调用中携带它，因此除非用户开始新会话或重置会话，否则重新连接和刷新页面都会继续使用同一个已存储的对话。
- 前台发送还会将渲染历史记录中所显示分支的叶节点作为 `expectedLeafEntryId` 一并发送；如果另一个客户端先切换了分支，Control UI 会暂停该消息供用户审核并刷新转录，而不是将其发布到新分支。重新连接和恢复待发送箱的重放会在协调当前历史记录后有意省略此前提条件。
- `chat.send` 接受幂等键（Control UI 使用运行 ID）；Gateway 会对重复使用同一键的请求进行去重，因此同一会话/消息/附件的重试或重复进行中的提交不会创建第二次运行。
- 回复特定消息（右键 → 回复）时，会将目标消息的转录 ID 作为 `replyToId` 发送到 `chat.send`。Gateway 会从会话历史记录中解析该消息，并填充与 Discord 回复所使用的相同、与频道无关的回复上下文元数据：代理会看到 `has_reply_context`，以及包含发送者标签和正文的不受信任“当前用户消息的回复目标”区块。（根据现有的面向直接 WebChat 会话的字节稳定提示策略，Webchat 提示会继续抑制诸如 `reply_to_id` 之类易变的对话 ID。）没有持久化转录 ID 的回复目标（例如待发送消息）会退回为消息正文中的内联引用。
- 工作区启动文件和待处理的 `BOOTSTRAP.md` 指令会通过代理系统提示中的 `# 项目上下文` 部分提供，而不会复制到 WebChat 用户消息中。如果引导内容被截断，系统提示会改为包含一条简短的“引导上下文提示”；详细计数和配置开关会保留在诊断界面中。
- `chat.history` 的显示规范化会剥离：仅运行时使用的 OpenClaw 上下文、入站信封包装、诸如 `[[reply_to_current]]`、`[[reply_to:<id>]]` 和 `[[audio_as_voice]]` 之类的内联投递指令标签、纯文本工具调用 XML 载荷（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`，包括被截断的区块），以及泄漏的 ASCII/全角模型控制令牌。整个可见文本仅为静默令牌 `NO_REPLY`（不区分大小写）的助手条目会被省略。
- 带有推理标记的回复载荷（`isReasoning: true`）会从 WebChat 助手内容、转录重放文本和音频内容区块中排除，因此仅包含思考内容的载荷不会作为可见助手消息或可播放音频呈现。
- `chat.inject` 会直接向转录追加助手备注，并将其广播到 UI（不会运行代理）。
- 中止的运行可能会让部分助手输出继续显示在 UI 中。当存在缓冲输出时，Gateway 会将该部分文本持久化到转录历史中，并为该条目标记中止元数据。

### 转写与投递模型

WebChat 有两条独立的数据路径：

- SQLite 转写行是持久化的模型/运行时转写。对于正常的 agent 运行，嵌入式 OpenClaw 运行时会通过 session accessor 持久化模型可见的 `user`、`assistant` 和 `toolResult` 消息。WebChat 不会将任意投递内容、状态内容或辅助文本写入该转写。
- Gateway `ReplyPayload` 事件是实时投递投影：针对 WebChat/频道显示、块流式传输、指令标签、媒体嵌入、TTS/音频标志以及 UI 回退行为进行归一化。它们本身并不是规范化的会话日志。
- 需要通过 `tools.message` 显示回复的 harness 仍然使用 WebChat 作为当前运行的内部源回复汇。来自该活动 WebChat 运行的无目标 `message.send` 会投影到同一聊天中并镜像到会话转写；WebChat 不会变成可复用的出站通道，也永远不会继承 `lastChannel`。
- 只有当 Gateway 拥有一个正常嵌入式 agent 回合之外的已显示消息时，WebChat 才会注入助手转写条目：`chat.inject`、非 agent 命令回复、中止的部分输出，以及 WebChat 管理的媒体转写补充。
- 如果运行期间实时助手文本出现了，但在历史记录重新加载后消失，请按以下顺序检查：SQLite 转写是否包含该助手文本，`chat.history` 显示投影是否将其剥离，然后再看 Control UI 的乐观尾部合并是否用持久化快照替换了本地投递状态。

正常的 agent 运行最终答案应该是持久化的，因为嵌入式运行时会写入助手 `message_end`。任何将已投递的最终载荷回镜到转写中的回退逻辑，都必须先避免重复写入嵌入式运行时已经写过的助手回合。

## Control UI 代理工具面板

- Control UI 的 `/agents` 工具面板有一个“当前可用”视图，由 `tools.effective(sessionKey=...)` 支持：这是一个由服务器生成的、只读的当前会话工具库存投影，包含核心、插件、频道自有，以及已发现的 MCP 服务器工具。
- 另有一个用于编辑配置的视图（由 `tools.catalog` 支持），涵盖配置档案、按代理的覆盖，以及目录语义。
- 运行时可用性以会话为作用域。在同一个代理上切换会话可能会改变“当前可用”列表。如果已配置的 MCP 服务器自上次发现以来尚未连接或发生变化，面板会显示提示，而不会在读取路径中静默启动 MCP 传输层。
- 配置编辑器并不意味着运行时可用；实际生效的访问仍遵循策略优先级（`allow`/`deny`、按代理以及提供方/频道覆盖）。

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
- `gateway.auth.allowTailscale`：在启用时，浏览器控制界面聊天标签页可以使用 Tailscale
  Serve 身份标头。
- `gateway.auth.mode: "trusted-proxy"`：用于位于具备身份感知能力的**非回环**代理源之后的浏览器客户端的反向代理认证（参见 [可信代理认证](/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`：远程网关目标。
- `session.*`：会话存储和主键默认值。

## 相关内容

- [控制 UI](/web/control-ui)
- [仪表盘](/web/dashboard)
