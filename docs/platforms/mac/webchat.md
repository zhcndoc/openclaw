---
summary: "mac 应用如何嵌入 gateway WebChat 以及如何调试它"
read_when:
  - 调试 mac WebChat 视图或回环端口
title: "WebChat（macOS）"
---

macOS 菜单栏应用将 WebChat UI 作为原生 SwiftUI 视图嵌入。它连接到 Gateway，并默认针对所选代理使用**主会话**（其他会话可通过会话切换器切换）。

- **本地模式**：直接连接到本地 Gateway WebSocket。
- **远程模式**：通过 SSH 转发 Gateway 控制端口，并使用该隧道作为数据平面。

## 启动与调试

- 手动：Lobster 菜单 → "打开聊天"。
- 自动打开以进行测试：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- 日志：`./scripts/clawlog.sh`（子系统 `ai.openclaw`，类别 `WebChatSwiftUI`）。

## 它是如何连接的

- 数据平面：Gateway WS 方法 `chat.history`、`chat.send`、`chat.abort`,
  `chat.inject` 以及事件 `chat`、`agent`、`presence`、`tick`、`health`。
- `chat.history` 返回按显示规范化的 transcript 行：内联指令
  标签会从可见文本中移除，纯文本工具调用 XML 负载
  （包括 `<tool_call>...</tool_call>`,
  `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`,
  `<function_calls>...</function_calls>`，以及被截断的工具调用块）和
  泄露的 ASCII/全角模型控制 token 会被移除，纯
  静默 token 的助手行（例如完全匹配 `NO_REPLY` / `no_reply`）会被
  省略，过大的行则可能被替换为占位符。
- 会话：默认使用主会话（`main`，或者在全局范围时为 `global`）。UI 可以在会话之间切换。
- 初始引导使用专用会话，以保持首次运行设置相互独立。

## 安全面

- 远程模式只通过 SSH 转发 Gateway WebSocket 控制端口。

## 已知限制

- 该 UI 针对聊天会话进行了优化（不是完整的浏览器沙箱）。

## 相关内容

- [WebChat](/web/webchat)
- [macOS 应用](/platforms/macos)
