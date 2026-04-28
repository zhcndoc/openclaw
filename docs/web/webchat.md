---
summary: "Loopback WebChat 静态主机和 Gateway WS 用于聊天 UI"
read_when:
  - 调试或配置 WebChat 访问时
title: "WebChat"
---

状态：macOS/iOS SwiftUI 聊天 UI 直接与 Gateway WebSocket 通信。

## 它是什么

- 网关的原生聊天 UI（无嵌入浏览器且无本地静态服务器）。
- 使用与其他渠道相同的会话和路由规则。
- 确定性路由：回复总是返回到 WebChat。

## 快速开始

1. 启动网关。
2. 打开 WebChat UI（macOS/iOS 应用）或 Control UI 的聊天选项卡。
3. 确保已配置有效的网关身份验证路径（默认使用共享密钥，
   即使在 loopback 上也是如此）。

## 工作原理（行为）

- UI 连接到 Gateway WebSocket，并使用 `chat.history`、`chat.send` 和 `chat.inject`。
- `chat.history` 的长度受限以保证稳定性：Gateway 可能会截断较长的文本字段，省略较重的元数据，并将过大的条目替换为 `[chat.history omitted: message too large]`。
- `chat.history` 会跟随现代仅追加会话文件的当前转录分支，因此被放弃的重写分支和被取代的提示副本不会在 WebChat 中渲染。
- Control UI 会在为新的 `chat.send` 运行 id 生成之前，合并同一会话、消息和附件的重复进行中的提交；Gateway 仍会对重用相同幂等键的重复请求进行去重。
- `chat.history` 也会进行显示规范化：运行时专用的 OpenClaw 上下文、
  入站信封包装、内联传递指令标签
  例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`、纯文本工具调用 XML
  载荷（包括 `<tool_call>...</tool_call>`、
  `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
  `<function_calls>...</function_calls>` 以及被截断的工具调用块），以及
  泄漏的 ASCII/全角模型控制令牌都会从可见文本中剥离，
  而其全部可见文本仅为精确静默
  令牌 `NO_REPLY` / `no_reply` 的 assistant 条目会被省略。
- 带有推理标记的回复载荷（`isReasoning: true`）会从 WebChat 的 assistant 内容、转录回放文本和音频内容块中排除，因此仅用于思考的载荷不会作为可见的 assistant 消息或可播放音频显示。
- `chat.inject` 会直接向转录中附加一条 assistant 注释，并将其广播到 UI（不会触发 agent 运行）。
- 中止的运行可能会让部分 assistant 输出继续在 UI 中可见。
- 当存在缓冲输出时，Gateway 会将中止的部分 assistant 文本持久化到转录历史中，并为这些条目标记中止元数据。
- 历史始终从 gateway 获取（不进行本地文件监听）。
- 如果 gateway 不可达，WebChat 将变为只读。

## Control UI 代理工具面板

- Control UI 的 `/agents` 工具面板有两个独立视图：
  - **当前可用** 使用 `tools.effective(sessionKey=...)`，显示当前会话在运行时实际可用的工具，包括核心、插件和渠道拥有的工具。
  - **工具配置** 使用 `tools.catalog`，重点关注配置文件、覆盖以及目录语义。
- 运行时可用性按会话范围生效。在同一代理上切换会话可能会改变 **当前可用** 列表。
- 配置编辑器并不意味着运行时可用性；有效访问仍遵循策略优先级（`allow`/`deny`，按代理以及提供方/渠道覆盖）。

## 远程使用

- 远程模式通过 SSH/Tailscale 隧道传输网关 WebSocket。
- 无需运行独立的 WebChat 服务器。

## 配置参考（WebChat）

完整配置：[配置](/gateway/configuration)

WebChat 选项：

- `gateway.webchat.chatHistoryMaxChars`：`chat.history` 响应中文本字段的最大字符数。当某个会话条目超过此限制时，Gateway 会截断较长的文本字段，并可能用占位符替换超大的消息。客户端还可以发送每次请求的 `maxChars` 来覆盖单次 `chat.history` 调用的此默认值。

相关全局选项：

- `gateway.port`, `gateway.bind`：WebSocket 主机/端口。
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`：
  共享密钥 WebSocket 身份验证。
- `gateway.auth.allowTailscale`：启用后，浏览器 Control UI 聊天选项卡可以使用 Tailscale
  Serve 身份标头。
- `gateway.auth.mode: "trusted-proxy"`：用于位于身份感知的 **非 loopback** 代理源之后的浏览器客户端的反向代理身份验证（参见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`：远程网关目标。
- `session.*`：会话存储和主密钥默认值。

## 相关内容

- [Control UI](/web/control-ui)
- [Dashboard](/web/dashboard)
