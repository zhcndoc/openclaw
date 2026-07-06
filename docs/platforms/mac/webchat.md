---
summary: "mac 应用如何嵌入 gateway WebChat 以及如何调试它"
read_when:
  - 调试 mac WebChat 视图或回环端口
title: "WebChat（macOS）"
---

macOS 菜单栏应用将 WebChat UI 作为原生 SwiftUI 视图嵌入。它连接到 Gateway，并默认使用所选代理的主会话（`main`，或在 `session.scope` 为 `global` 时使用 `global`），并提供一个会话切换器用于其他会话。

- **本地模式**：直接连接到本地 Gateway WebSocket。
- **远程模式**：通过 SSH 转发 Gateway 控制端口，并将该隧道用作数据平面。

## 启动与调试

- 手动：Lobster 菜单 -> “Open Chat”。
- 测试时自动打开：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --chat
  ```

  （`--webchat` 作为旧版别名也可接受。）

- 日志：`./scripts/clawlog.sh`（子系统 `ai.openclaw`，类别 `WebChatSwiftUI`）。

## 它是如何连接的

- 数据平面：Gateway WS 方法 `chat.history`、`chat.send`、`chat.abort`、`chat.inject`，以及事件 `chat`、`agent`、`presence`、`tick`、`health`。
- `chat.history` 返回经过显示规范化的转录：内联指令标签会从可见文本中移除，纯文本工具调用 XML 负载（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`，包括被截断的块）以及泄露的模型控制 token 会被移除，纯静默 token 的助手行（例如精确的 `NO_REPLY`/`no_reply`）会被省略，超大的行可能会被一个截断占位符替换。
- 会话：默认使用如上所述的主会话；UI 可以在会话之间切换。
- 引导使用一个专用会话，以保持首次运行设置的独立性。

## 安全部分

- 远程模式只通过 SSH 转发 Gateway WebSocket 控制端口。

## 已知限制

- 该 UI 针对聊天会话进行了优化，而不是完整的浏览器沙箱。

## 相关内容

- [WebChat](/web/webchat)
- [macOS 应用](/platforms/macos)
