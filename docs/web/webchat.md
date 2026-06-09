---
summary: "Loopback WebChat 静态主机和 Gateway WS 的聊天 UI 用法"
read_when:
  - 调试或配置 WebChat 访问
title: "WebChat"
---

状态：macOS/iOS SwiftUI 聊天 UI 直接与 Gateway WebSocket 通信。

## 它是什么

- 一个用于 gateway 的原生聊天 UI（不嵌入浏览器，也不使用本地静态服务器）。
- 使用与其他通道相同的会话和路由规则。
- 确定性路由：回复始终回到 WebChat。

## 快速开始

1. 启动 gateway。
2. 打开 WebChat UI（macOS/iOS 应用）或 Control UI 的聊天标签页。
3. 确保已配置有效的 gateway 认证路径（默认使用共享密钥，
   即使在 loopback 上也是如此）。

## 工作原理（行为）

- UI 连接到 Gateway WebSocket，并使用 `chat.history`、`chat.send` 和 `chat.inject`。
- `chat.history` 的长度会受限以保证稳定性：Gateway 可能会截断较长文本字段、省略较重的元数据，并将超大条目替换为 `[chat.history omitted: message too large]`。
- 当可见的助手消息在 `chat.history` 中被截断时，Control UI 可以打开侧边阅读器，并按需通过 `chat.message.get` 获取完整的显示规范化条目，而不会增加默认历史负载。
- `chat.history` 会遵循现代仅追加会话文件的活动转写分支，因此被放弃的重写分支和被替代的提示副本不会在 WebChat 中渲染。
- 压缩条目会渲染为一个明确的已压缩历史分隔符。该分隔符说明压缩后的转写作为检查点保留，并链接到 Sessions 检查点控制；在权限允许时，操作者可以从该压缩视图分支或恢复。
- Control UI 会记住 `chat.history` 返回的底层 Gateway `sessionId`，并在后续 `chat.send` 调用中带上它，因此重新连接和刷新页面会继续同一段已存储的对话，除非用户开始或重置会话。
- Control UI 会在生成新的 `chat.send` run id 之前，合并同一会话、同一消息和同一附件的重复进行中提交；Gateway 仍会对重复使用相同幂等键的请求去重。
- 工作区启动文件和待处理的 `BOOTSTRAP.md` 指令通过代理系统提示的 Project Context 提供，而不是复制到 WebChat 用户消息中。Bootstrap 截断只会添加一条简洁的系统提示恢复通知；详细计数和配置开关仍保留在诊断界面。
- `chat.history` 也会进行显示规范化：运行时专用的 OpenClaw 上下文、
  入站信封包装、内联投递指令标签
  如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`、纯文本工具调用 XML
  载荷（包括 `<tool_call>...</tool_call>`、
  `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
  `<function_calls>...</function_calls>` 以及被截断的工具调用块），以及
  泄漏的 ASCII/全角模型控制 token 都会从可见文本中移除，
  而且如果助手条目的全部可见文本只是完全相同的静默
  token `NO_REPLY` / `no_reply`，则会被省略。
- 带有推理标记的回复载荷（`isReasoning: true`）会被排除在 WebChat 助手内容、转写回放文本和音频内容块之外，因此仅包含思考内容的载荷不会作为可见助手消息或可播放音频显示。
- `chat.inject` 会直接向转写追加一条助手注释并将其广播到 UI（不启动 agent 运行）。
- 已中止的运行可以让部分助手输出继续在 UI 中可见。
- 当存在缓冲输出时，Gateway 会将中止的部分助手文本持久化到转写历史中，并为这些条目标记中止元数据。
- 历史始终从 gateway 获取（不会本地监听文件）。
- 如果 gateway 不可达，WebChat 只能只读。

### 转写与投递模型

WebChat 有两条独立的数据路径：

- 会话 JSONL 文件是持久化的模型/运行转写。对于正常的 agent 运行，嵌入式 OpenClaw 运行时会通过其会话管理器持久化模型可见的 `user`、`assistant` 和 `toolResult` 消息。WebChat 不会把任意投递、状态或辅助文本写入该转写。
- Gateway `ReplyPayload` 事件是实时投递投影。它们可以针对 WebChat/通道显示进行规范化、阻断流式输出、处理指令标签、媒体嵌入、TTS/音频标志以及 UI 回退行为。它们本身不是规范的会话日志。
- 需要通过 `tools.message` 获得可见回复的 harness 仍将 WebChat 作为当前运行的内部源回复接收端。来自该活动 WebChat 运行的无目标 `message.send` 会投影到同一聊天并镜像到会话转写；WebChat 不会变成可复用的外发通道，也永远不会继承 `lastChannel`。
- 当 Gateway 在正常的嵌入式 agent 回合之外拥有一个已显示消息时，WebChat 只会注入助手转写条目：`chat.inject`、非 agent 命令回复、中止的部分输出，以及由 WebChat 管理的媒体转写补充。
- `chat.history` 会读取已存储的会话转写并应用 WebChat 显示投影。如果运行期间出现实时助手文本，但在历史重新加载后消失，先检查原始 JSONL 是否包含该助手文本，然后检查 `chat.history` 投影是否将其剥离，最后检查 Control UI 的乐观尾部合并是否用持久化快照替换了本地投递状态。
- `chat.message.get` 使用与 `chat.history` 相同的转写分支和显示投影规则，包括活动 agent 范围控制，但会按 `messageId` 定位单个转写条目，并在完整内容不再可返回时给出真实的不可用原因。

正常的 agent 运行最终答案应该是持久化的，因为嵌入式运行时会写入助手 `message_end`。任何将已投递的最终载荷回镜到转写中的回退逻辑，都必须先避免重复写入嵌入式运行时已经写过的助手回合。

## Control UI agents 工具面板

- Control UI 的 `/agents` Tools 面板有两个独立视图：
  - **Available Right Now** 使用 `tools.effective(sessionKey=...)`，显示当前会话库存的服务器派生只读投影，包括 core、plugin、channel-owned 以及已经发现的 MCP server 工具。
  - **Tool Configuration** 使用 `tools.catalog`，重点关注 profile、override 和 catalog 语义。
- 运行时可用性是按会话范围生效的。在同一个 agent 上切换会话可能会改变 **Available Right Now** 列表。如果已配置的 MCP server 尚未连接，或自上次发现后发生了变更，该面板会显示提示，而不是从读路径里静默启动 MCP transport。
- 配置编辑器并不意味着运行时可用；有效访问仍遵循策略优先级（`allow`/`deny`，以及按 agent 和 provider/channel 的覆盖）。

## 远程使用

- 远程模式通过 SSH/Tailscale 隧道转发 gateway WebSocket。
- 你不需要运行单独的 WebChat 服务器。

## 配置参考（WebChat）

完整配置：[Configuration](/gateway/configuration)

WebChat 没有持久化的配置段。Gateway 使用内置的 `chat.history` 显示上限；API 客户端可以针对单次 `chat.history` 调用发送按请求生效的 `maxChars` 以覆盖它。旧的 `channels.webchat` 和 `gateway.webchat` 配置已废弃；运行 `openclaw doctor --fix` 可将其移除。

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

- [Control UI](/web/control-ui)
- [Dashboard](/web/dashboard)
