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
- `chat.history` 为稳定性设置了上限：Gateway 可能会截断较长的文本字段、忽略较重的元数据，并用 `[chat.history omitted: message too large]` 替换超大条目。
- `chat.history` 会跟随现代仅追加会话文件中的活动转写分支，因此被放弃的重写分支和被后续内容取代的提示副本不会在 WebChat 中渲染。
- 压缩条目会作为明确的“已压缩历史”分隔线渲染。该分隔线说明压缩后的转写被保留为检查点，并链接到 Sessions 检查点控制项；在权限允许时，操作者可从该压缩视图分支或恢复。
- Control UI 会记住 `chat.history` 返回的底层 Gateway `sessionId`，并在后续 `chat.send` 调用中带上它，因此重新连接和页面刷新会继续同一个已存储的会话，除非用户启动或重置会话。
- Control UI 会在为同一会话、同一消息和同一附件生成新的 `chat.send` 运行 id 之前，合并重复的进行中提交；Gateway 仍会对复用相同幂等键的重复请求去重。
- 工作区启动文件和待处理的 `BOOTSTRAP.md` 指令会通过代理系统提示中的项目上下文提供，而不会复制到 WebChat 用户消息中。Bootstrap 截断只会添加简洁的系统提示恢复通知；详细计数和配置开关保留在诊断界面上。
- `chat.history` 也会进行显示归一化：运行时专用的 OpenClaw 上下文、
  入站信封包装、行内投递指令标签
  例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`、纯文本工具调用 XML
  负载（包括 `<tool_call>...</tool_call>`、
  `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
  `<function_calls>...</function_calls>` 以及被截断的工具调用块），以及
  泄露的 ASCII/全角模型控制令牌都会从可见文本中移除，
  而且其全部可见文本仅为精确静默
  令牌 `NO_REPLY` / `no_reply` 的 assistant 条目会被省略。
- 带有推理标记的回复负载（`isReasoning: true`）会从 WebChat 的 assistant 内容、转写回放文本和音频内容块中排除，因此仅用于思考的负载不会以可见 assistant 消息或可播放音频的形式出现。
- `chat.inject` 会将一条 assistant 备注直接追加到转写中，并广播到 UI（不触发 agent 运行）。
- 中止的运行可能会让部分 assistant 输出在 UI 中保持可见。
- 如果存在缓冲输出，Gateway 会将中止的部分 assistant 文本持久化到转写历史中，并用中止元数据标记这些条目。
- 历史始终从 gateway 获取（不进行本地文件监视）。
- 如果 gateway 不可达，WebChat 将为只读。

### 转写与投递模型

WebChat 有两条独立的数据路径：

- session JSONL 文件是持久化的模型/运行时转写。对于正常的 agent 运行，Pi 会通过其会话管理器将对模型可见的 `user`、`assistant` 和 `toolResult` 消息持久化到该文件中。WebChat 不会将任意投递、状态或辅助文本写入该转写。
- Gateway `ReplyPayload` 事件是实时投递投影。它们可以针对 WebChat/通道显示、块流式输出、指令标签、媒体嵌入、TTS/音频标志以及 UI 回退行为进行归一化。它们本身并不是权威的会话日志。
- 需要通过 `tools.message` 显示回复的 harness 仍将 WebChat 作为当前运行的内部源回复接收端。来自该活动 WebChat 运行、且不带目标的 `message.send` 会被投影到同一聊天并镜像到会话转写；WebChat 不会变成可复用的出站通道，也不会继承 `lastChannel`。
- WebChat 仅在 Gateway 负责显示了一个不属于正常 Pi assistant 轮次的消息时，才注入助手转写条目：`chat.inject`、非 agent 命令回复、中止的部分输出，以及 WebChat 管理的媒体转写补充。
- `chat.history` 读取已存储的会话转写并应用 WebChat 显示投影。如果在运行期间出现的实时助手文本在历史重新加载后消失，先检查原始 JSONL 是否包含该助手文本，然后检查 `chat.history` 投影是否将其剥离，最后检查 Control UI 的乐观尾部合并是否用持久化快照替换了本地投递状态。

正常的 agent 运行最终答案应该是持久化的，因为 Pi 会写入助手 `message_end`。任何将已投递最终载荷镜像回转写的回退逻辑，必须先避免重复写入 Pi 已经写入的助手轮次。

## Control UI agents tools 面板

- Control UI 的 `/agents` Tools 面板有两个独立视图：
  - **Available Right Now** 使用 `tools.effective(sessionKey=...)`，展示当前
    会话在运行时实际可用的工具，包括 core、plugin 和 channel-owned 工具。
  - **Tool Configuration** 使用 `tools.catalog`，并保持聚焦于 profiles、overrides 以及
    catalog 语义。
- 运行时可用性以会话为作用域。在同一 agent 上切换会话可能会改变
  **Available Right Now** 列表。
- 配置编辑器并不意味着运行时可用；实际生效的访问权限仍然遵循策略优先级
  （`allow`/`deny`，按 agent 和 provider/channel 覆盖）。

## 远程使用

- 远程模式通过 SSH/Tailscale 隧道转发 gateway WebSocket。
- 你不需要运行单独的 WebChat 服务器。

## 配置参考（WebChat）

完整配置：[Configuration](/gateway/configuration)

WebChat 选项：

- `gateway.webchat.chatHistoryMaxChars`：`chat.history` 响应中文本字段的最大字符数。当某个转写条目超过此限制时，Gateway 会截断较长的文本字段，并可能用占位符替换超大消息。客户端也可以按请求发送 `maxChars` 来为单次 `chat.history` 调用覆盖此默认值。

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
