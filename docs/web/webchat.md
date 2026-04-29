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
- `chat.history` 为了稳定性会进行长度限制：Gateway 可能会截断较长的文本字段，省略较大的元数据，并将超大条目替换为 `[chat.history omitted: message too large]`。
- `chat.history` 会遵循现代仅追加式会话文件中的活动转写分支，因此在 WebChat 中不会渲染已放弃的重写分支和被取代的提示词副本。
- Control UI 会在为同一会话、同一消息和同一附件生成新的 `chat.send` 运行 id 之前，合并重复的进行中提交；Gateway 仍会对复用相同幂等键的重复请求进行去重。
- `chat.history` 也会进行显示归一化：运行时专用的 OpenClaw 上下文、
  入站信封包装器、内联投递指令标签
  例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`、纯文本工具调用 XML
  负载（包括 `<tool_call>...</tool_call>`、
  `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
  `<function_calls>...</function_calls>`，以及被截断的工具调用块），以及
  泄漏的 ASCII/全角模型控制令牌都会从可见文本中移除，
  并且如果 assistant 条目的整个可见文本仅是精确的静默
  令牌 `NO_REPLY` / `no_reply`，则会省略该条目。
- 带有推理标记的回复负载（`isReasoning: true`）会从 WebChat assistant 内容、转写回放文本和音频内容块中排除，因此仅用于思考的负载不会作为可见的 assistant 消息或可播放音频显示出来。
- `chat.inject` 会直接向转写中追加一条 assistant 注释，并将其广播到 UI（不触发 agent 运行）。
- 被中止的运行可以让部分 assistant 输出继续在 UI 中可见。
- 当存在缓冲输出时，Gateway 会将被中止的部分 assistant 文本持久化到转写历史中，并用中止元数据标记这些条目。
- 历史始终从 gateway 获取（不进行本地文件监听）。
- 如果 gateway 不可达，WebChat 将变为只读。

## Control UI agents 工具面板

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
  shared-secret WebSocket 认证。
- `gateway.auth.allowTailscale`：在启用时，浏览器 Control UI 聊天标签页可以使用 Tailscale
  Serve 身份头。
- `gateway.auth.mode: "trusted-proxy"`：用于位于具备身份感知的 **non-loopback** 代理源之后的浏览器客户端的反向代理认证（参见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`：远程 gateway 目标。
- `session.*`：会话存储和主键默认值。

## 相关内容

- [Control UI](/web/control-ui)
- [Dashboard](/web/dashboard)
