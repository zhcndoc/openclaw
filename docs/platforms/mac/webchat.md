---
summary: "mac 应用如何嵌入网关 WebChat 及如何调试"
read_when:
  - 调试 mac WebChat 视图或回环端口
title: "WebChat（macOS）"
---

macOS 菜单栏应用将 WebChat UI 作为原生 SwiftUI 视图嵌入。它连接到 Gateway，并且默认使用所选 agent 的**主会话**（其他会话可通过会话切换器切换）。

- **本地模式**：直接连接本地网关 WebSocket。
- **远程模式**：通过 SSH 转发网关控制端口，并使用该通道作为数据平面。

## 启动与调试

- 手动：Lobster 菜单 → “打开聊天”。
- 自动打开用于测试：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- 日志：`./scripts/clawlog.sh`（子系统 `ai.openclaw`，类别 `WebChatSwiftUI`）。

## 工作原理

- 数据平面：Gateway WS 方法 `chat.history`、`chat.send`、`chat.abort`、
  `chat.inject` 以及事件 `chat`、`agent`、`presence`、`tick`、`health`。
- `chat.history` 返回经过显示规范化的转录行：会从可见文本中移除行内指令
  标签，移除纯文本工具调用 XML 负载（包括 `<tool_call>...</tool_call>`、
  `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
  `<function_calls>...</function_calls>`，以及截断的工具调用块）和泄漏的 ASCII/全角模型控制 token；纯
  静默 token 的 assistant 行（如完全匹配的 `NO_REPLY` / `no_reply`）会被
  省略，超大的行可能会被占位符替换。
- 会话：默认使用主会话（`main`，如果作用域为 global，则为 `global`）。
  UI 可以在不同会话之间切换。
- 首次引导会使用专用会话，以保持首次运行设置的独立性。

## 安全面

- 远程模式仅通过 SSH 转发网关 WebSocket 控制端口。

## 已知限制

- UI 针对聊天会话进行了优化（不是完整的浏览器沙箱）。

## 相关内容

- [WebChat](/web/webchat)
- [macOS app](/platforms/macos)
